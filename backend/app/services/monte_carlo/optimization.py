"""
Module d'optimisation des plans d'épargne.

Utilise une recherche par dichotomie (bisection) pour trouver le facteur d'échelle
optimal des épargnes mensuelles permettant d'atteindre un capital cible à la fin de vie.
"""

import logging
from typing import List, NamedTuple

from app.schemas.projections import (
    InvestmentAccount,
    MonteCarloInput,
    MonteCarloResult,
    OptimizationStep,
    RecommendedSavingsResult,
    RetirementMonteCarloInput,
    RetirementScenarioResults,
    SavingsOptimizationInput,
    SavingsPhase,
)
from app.services.monte_carlo.retirement import simulate_retirement_monte_carlo
from app.services.monte_carlo.simulation import simulate_monte_carlo

logger = logging.getLogger("uvicorn.error").getChild("monte_carlo.optimization")


class EvaluationResult(NamedTuple):
    """
    Résultat de l'évaluation d'un facteur d'échelle.

    Attributes:
        scale: Facteur d'échelle appliqué aux épargnes
        total_savings: Épargne mensuelle totale après mise à l'échelle
        final_capital: Capital final brut (avant pénalités)
        effective_final_capital: Capital final effectif (après pénalités)
        error: Erreur par rapport au capital cible
        depletion_months: Nombre de mois manquants si le capital s'épuise tôt
        accumulation: Résultat de la simulation de capitalisation
        retirement: Résultats des scénarios de retraite
        sufficient: True si le scénario est suffisant (pas d'épuisement précoce)
    """

    scale: float
    total_savings: float
    final_capital: float
    effective_final_capital: float
    error: float
    depletion_months: int
    accumulation: MonteCarloResult
    retirement: RetirementScenarioResults
    sufficient: bool


def optimize_savings_plan(
    payload: SavingsOptimizationInput,
) -> RecommendedSavingsResult:
    """
    Optimise le plan d'épargne pour atteindre un capital cible à la fin de vie.

    Utilise une recherche par dichotomie pour trouver le facteur d'échelle optimal
    des épargnes mensuelles. Pour chaque facteur testé :
    1. Met à l'échelle les phases d'épargne et les contributions des comptes
    2. Exécute une simulation de capitalisation
    3. Exécute des simulations de retraite pour les scénarios pessimiste, médian et optimiste
    4. Évalue si le capital médian dure jusqu'à l'espérance de vie
    5. Applique une pénalité si le capital s'épuise avant l'espérance de vie

    Args:
        payload: Paramètres d'optimisation (profils, comptes, objectifs)

    Returns:
        Résultat de l'optimisation avec le facteur recommandé et les détails
    """
    logger.info(
        "Démarrage de l'optimisation Monte Carlo ciblant %.2f € en fin de vie.",
        payload.target_final_capital,
    )

    # Calcul de la tolérance en capital (minimum 100€ ou % du capital cible)
    tolerance_capital = max(100.0, abs(payload.target_final_capital) * payload.tolerance_ratio)
    max_iterations = max(payload.max_iterations, 5)
    steps: List[OptimizationStep] = []

    best_candidate: EvaluationResult | None = None
    best_sufficient: EvaluationResult | None = None

    def register_candidate(result: EvaluationResult) -> None:
        """
        Enregistre un candidat comme meilleur selon différents critères.

        - Meilleur candidat global : celui avec le moins de mois manquants
        - Meilleur candidat suffisant : celui avec le moins d'épargne mensuelle
        """
        nonlocal best_candidate, best_sufficient

        # Meilleur candidat global : priorité au moins de mois manquants
        if best_candidate is None or (
            result.depletion_months < best_candidate.depletion_months
            or (
                result.depletion_months == best_candidate.depletion_months
                and result.effective_final_capital > best_candidate.effective_final_capital
            )
        ):
            best_candidate = result

        # Meilleur candidat suffisant : celui avec le moins d'épargne mensuelle
        if result.sufficient and (
            best_sufficient is None or result.total_savings < best_sufficient.total_savings
        ):
            best_sufficient = result

    iteration_counter = -1

    def evaluate(scale: float) -> EvaluationResult:
        """
        Évalue un facteur d'échelle en exécutant les simulations complètes.

        Args:
            scale: Facteur d'échelle à appliquer aux épargnes

        Returns:
            Résultat de l'évaluation
        """
        nonlocal iteration_counter
        iteration_counter += 1

        # Mise à l'échelle des phases d'épargne et des comptes
        scaled_phases = scale_savings_phases(payload.savings_phases, scale)
        scaled_accounts = scale_investment_accounts(payload.investment_accounts, scale)

        # Simulation de capitalisation
        mc_input = MonteCarloInput(
            adults=payload.adults,
            savings_phases=scaled_phases,
            investment_accounts=scaled_accounts,
            market_assumptions=payload.market_assumptions,
            confidence_level=payload.confidence_level,
            tolerance_ratio=payload.tolerance_ratio,
            max_iterations=max(payload.max_iterations, 100),
            batch_size=payload.batch_size,
        )

        accumulation_result = simulate_monte_carlo(mc_input)
        retirement_results = run_retirement_scenarios(
            payload, scaled_accounts, accumulation_result
        )

        # Calcul des métriques
        final_capital = retirement_results.median.median_final_capital
        total_savings = sum(
            account.monthly_contribution or 0.0 for account in scaled_accounts
        )

        # Détection de l'épuisement précoce du capital médian
        early_penalty = 0.0
        months_remaining_penalty = 0
        median_series = retirement_results.median.monthly_percentiles or []
        if median_series:
            final_index = len(median_series) - 1
            for idx, point in enumerate(median_series[:-1]):
                if point.percentile_50 <= 0:
                    # Le capital médian s'épuise avant la fin
                    months_remaining_penalty = final_index - idx
                    penalty_base = (
                        payload.target_monthly_income
                        or payload.state_pension_monthly_income
                        or 1000.0
                    )
                    # Pénalité proportionnelle aux mois manquants
                    early_penalty = max(1.0, penalty_base) * max(1, months_remaining_penalty)
                    logger.info(
                        "Capital médian épuisé %.1f ans avant l'horizon → "
                        "application d'une pénalité de %.2f € (%d mois manquants).",
                        months_remaining_penalty / 12,
                        early_penalty,
                        months_remaining_penalty,
                    )
                    break

        # Capital effectif = capital brut - pénalité pour épuisement précoce
        effective_final_capital = final_capital - early_penalty
        error = effective_final_capital - payload.target_final_capital
        sufficient = months_remaining_penalty == 0 and error >= -tolerance_capital

        # Enregistrement de l'étape d'optimisation
        steps.append(
            OptimizationStep(
                iteration=iteration_counter,
                scale=scale,
                monthly_savings=total_savings,
                final_capital=final_capital,
                effective_final_capital=effective_final_capital,
                depletion_months=months_remaining_penalty,
            )
        )

        logger.info(
            "Étape d'optimisation %d → facteur=%.4f, capital brut=%.2f €, "
            "capital effectif=%.2f €, épargne mensuelle=%.2f €, épuisement=%d mois",
            iteration_counter,
            scale,
            final_capital,
            effective_final_capital,
            total_savings,
            months_remaining_penalty,
        )

        result = EvaluationResult(
            scale=scale,
            total_savings=total_savings,
            final_capital=final_capital,
            effective_final_capital=effective_final_capital,
            error=error,
            depletion_months=months_remaining_penalty,
            accumulation=accumulation_result,
            retirement=retirement_results,
            sufficient=sufficient,
        )
        register_candidate(result)
        return result

    # Évaluation initiale avec facteur 0 (épargnes existantes uniquement)
    low = evaluate(0.0)
    if low.sufficient:
        logger.info("Objectif atteint avec les épargnes existantes (facteur 0).")
        final_choice = low
    else:
        # Recherche d'une borne supérieure suffisante
        high_scale = 1.0
        high = evaluate(high_scale)
        attempts = 0
        # Doublement du facteur jusqu'à trouver une solution suffisante
        while not high.sufficient and attempts < 12 and high_scale < 512:
            low = high
            high_scale *= 2
            high = evaluate(high_scale)
            attempts += 1

        if not high.sufficient:
            logger.warning(
                "Impossible d'atteindre l'objectif même avec un facteur de %.2f. "
                "Retour du meilleur scénario disponible.",
                high_scale,
            )
            final_choice = best_candidate or high
        else:
            # Recherche par dichotomie entre low et high
            low_result = low
            high_result = high
            iterations_remaining = max(0, max_iterations - len(steps))

            for _ in range(iterations_remaining):
                # Arrêt si la précision est suffisante
                if high_result.scale - low_result.scale < 1e-4:
                    break

                # Test du point médian
                mid_scale = (low_result.scale + high_result.scale) / 2
                mid = evaluate(mid_scale)

                if mid.sufficient:
                    # Le point médian est suffisant, on peut réduire la borne supérieure
                    high_result = mid
                    if abs(mid.error) <= tolerance_capital:
                        break
                else:
                    # Le point médian n'est pas suffisant, on augmente la borne inférieure
                    low_result = mid

            final_choice = best_sufficient or high_result

    logger.info(
        "Optimisation terminée : facteur=%.4f, capital brut=%.2f €, "
        "capital effectif=%.2f €, épargne mensuelle=%.2f €, épuisement=%d mois",
        final_choice.scale,
        final_choice.final_capital,
        final_choice.effective_final_capital,
        final_choice.total_savings,
        final_choice.depletion_months,
    )

    return RecommendedSavingsResult(
        scale=final_choice.scale,
        recommended_monthly_savings=max(0.0, final_choice.total_savings),
        monte_carlo_result=final_choice.accumulation,
        retirement_results=final_choice.retirement,
        steps=steps,
        residual_error=final_choice.error,
        residual_error_ratio=(
            final_choice.error / max(abs(payload.target_final_capital), 1.0)
            if payload.target_final_capital != 0
            else final_choice.error
            / max(abs(final_choice.effective_final_capital), 1.0)
        ),
    )


def scale_savings_phases(phases: List[SavingsPhase], scale: float) -> List[SavingsPhase]:
    """
    Met à l'échelle les contributions mensuelles des phases d'épargne.

    Args:
        phases: Liste des phases d'épargne
        scale: Facteur d'échelle à appliquer

    Returns:
        Liste des phases avec contributions mises à l'échelle
    """
    return [
        phase.model_copy(
            update={
                "monthly_contribution": max(0.0, phase.monthly_contribution * scale),
            }
        )
        for phase in phases
    ]


def scale_investment_accounts(
    accounts: List[InvestmentAccount], scale: float
) -> List[InvestmentAccount]:
    """
    Met à l'échelle les contributions mensuelles des comptes d'investissement.

    Args:
        accounts: Liste des comptes d'investissement
        scale: Facteur d'échelle à appliquer

    Returns:
        Liste des comptes avec contributions mises à l'échelle
    """
    return [
        account.model_copy(
            update={
                "monthly_contribution": max(
                    0.0, (account.monthly_contribution or 0.0) * scale
                ),
            }
        )
        for account in accounts
    ]


def run_retirement_scenarios(
    payload: SavingsOptimizationInput,
    scaled_accounts: List[InvestmentAccount],
    accumulation_result: MonteCarloResult,
) -> RetirementScenarioResults:
    """
    Exécute les simulations de retraite pour les trois scénarios (pessimiste, médian, optimiste).

    Construit des comptes de retraite à partir des percentiles de capitalisation
    et exécute une simulation de retraite pour chaque scénario.

    Args:
        payload: Paramètres d'optimisation
        scaled_accounts: Comptes avec contributions mises à l'échelle
        accumulation_result: Résultat de la simulation de capitalisation

    Returns:
        Résultats des trois scénarios de retraite
    """
    # Construction des comptes de retraite pour chaque scénario
    pessimistic_accounts = build_retirement_accounts(
        scaled_accounts, accumulation_result.percentile_10
    )
    median_accounts = build_retirement_accounts(
        scaled_accounts, accumulation_result.percentile_50
    )
    optimistic_accounts = build_retirement_accounts(
        scaled_accounts, accumulation_result.percentile_90
    )

    # Paramètres communs pour toutes les simulations de retraite
    base_kwargs = dict(
        adults=payload.adults,
        market_assumptions=payload.market_assumptions,
        spending_profile=payload.spending_profile,
        target_monthly_income=payload.target_monthly_income,
        state_pension_monthly_income=payload.state_pension_monthly_income,
        additional_income_streams=payload.additional_income_streams,
        confidence_level=payload.confidence_level,
        tolerance_ratio=payload.tolerance_ratio,
        max_iterations=max(payload.max_iterations, 100),
        batch_size=payload.batch_size,
    )

    # Exécution des simulations pour chaque scénario
    pessimistic_result = simulate_retirement_monte_carlo(
        RetirementMonteCarloInput(investment_accounts=pessimistic_accounts, **base_kwargs)
    )
    median_result = simulate_retirement_monte_carlo(
        RetirementMonteCarloInput(investment_accounts=median_accounts, **base_kwargs)
    )
    optimistic_result = simulate_retirement_monte_carlo(
        RetirementMonteCarloInput(investment_accounts=optimistic_accounts, **base_kwargs)
    )

    return RetirementScenarioResults(
        pessimistic=pessimistic_result,
        median=median_result,
        optimistic=optimistic_result,
    )


def build_retirement_accounts(
    accounts: List[InvestmentAccount],
    total_capital: float,
) -> List[InvestmentAccount]:
    """
    Construit des comptes de retraite à partir d'un capital total.

    Répartit le capital total entre les comptes selon leurs poids relatifs
    (basés sur les contributions ou les montants actuels).

    Args:
        accounts: Liste des comptes d'investissement
        total_capital: Capital total à répartir

    Returns:
        Liste des comptes configurés pour la retraite (sans contributions mensuelles)
    """
    if total_capital <= 0:
        return [
            account.model_copy(
                update={
                    "current_amount": 0.0,
                    "monthly_contribution": 0.0,
                    "monthly_contribution_share": 0.0,
                }
            )
            for account in accounts
        ]

    weights = compute_account_weights(accounts)
    retirement_accounts: List[InvestmentAccount] = []
    for account, weight in zip(accounts, weights):
        retirement_accounts.append(
            account.model_copy(
                update={
                    "current_amount": total_capital * weight,
                    "monthly_contribution": 0.0,  # Plus de contributions en retraite
                    "monthly_contribution_share": weight * 100,
                }
            )
        )
    return retirement_accounts


def compute_account_weights(accounts: List[InvestmentAccount]) -> List[float]:
    """
    Calcule les poids relatifs des comptes pour la répartition du capital.

    Les poids sont basés sur (dans l'ordre de priorité) :
    1. Les contributions mensuelles
    2. Les parts de contribution
    3. Les montants actuels
    4. Répartition égale si aucun indicateur n'est disponible

    Args:
        accounts: Liste des comptes d'investissement

    Returns:
        Liste des poids normalisés (somme = 1.0)
    """
    if not accounts:
        return []

    raw_weights: List[float] = []
    for account in accounts:
        # Priorité 1 : contribution mensuelle
        contribution = account.monthly_contribution or 0.0
        if contribution > 0:
            raw_weights.append(contribution)
            continue
        # Priorité 2 : part de contribution
        share = account.monthly_contribution_share or 0.0
        if share > 0:
            raw_weights.append(share)
            continue
        # Priorité 3 : montant actuel
        current = account.current_amount or 0.0
        if current > 0:
            raw_weights.append(current)
            continue
        # Par défaut : poids unitaire
        raw_weights.append(1.0)

    # Normalisation des poids
    total = sum(raw_weights)
    if total <= 0:
        # Répartition égale si tous les poids sont nuls
        equal_weight = 1.0 / len(accounts)
        return [equal_weight for _ in accounts]
    return [weight / total for weight in raw_weights]

