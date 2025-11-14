"""
Module de simulation Monte Carlo pour la phase de retraite.

Simule la décumulation du capital pendant la retraite en tenant compte :
- Des retraits mensuels nécessaires pour compléter les revenus
- Des profils de dépenses variables selon l'âge
- Des revenus complémentaires (pension de l'État, autres revenus)
- Des retraits proportionnels sur tous les comptes
"""

import logging
import statistics
from dataclasses import dataclass
from typing import List

from app.schemas.projections import (
    AdditionalIncome,
    InvestmentAccount,
    RetirementMonteCarloInput,
    RetirementMonteCarloPoint,
    RetirementMonteCarloResult,
    SpendingPhase,
)
from app.services.monte_carlo.returns import (
    compute_account_return_from_asset_sample,
    sample_monthly_asset_returns,
)
from app.services.monte_carlo.simulation import AccountState
from app.services.monte_carlo.statistics import (
    check_confidence_reached,
    compute_percentile_from_sorted,
)

logger = logging.getLogger("uvicorn.error").getChild("monte_carlo.retirement")


def simulate_retirement_monte_carlo(
    payload: RetirementMonteCarloInput,
) -> RetirementMonteCarloResult:
    """
    Exécute une simulation Monte Carlo pour la phase de retraite.

    Simule la décumulation du capital de la retraite jusqu'à l'espérance de vie,
    en tenant compte des retraits mensuels nécessaires pour compléter les revenus.

    Args:
        payload: Paramètres de la simulation de retraite

    Returns:
        Résultat de la simulation avec percentiles et séries mensuelles

    Raises:
        ValueError: Si les paramètres sont invalides
    """
    # Validation des paramètres d'entrée
    if not payload.adults:
        raise ValueError(
            "Au moins un profil adulte est requis pour la simulation de retraite."
        )

    primary_adult = payload.adults[0]
    life_expectancy = primary_adult.life_expectancy
    retirement_age = primary_adult.retirement_age

    if life_expectancy is None or life_expectancy <= retirement_age:
        raise ValueError(
            "L'espérance de vie doit être définie et supérieure à l'âge de retraite "
            "pour la simulation de retraite."
        )

    total_months = int((life_expectancy - retirement_age) * 12)
    if total_months <= 0:
        raise ValueError("L'horizon de retraite doit être d'au moins un mois.")

    # Initialisation des structures de données
    results: List[float] = []  # Capital final de chaque tirage
    monthly_paths: List[List[float]] = []  # Évolution mensuelle de chaque tirage
    withdrawal_reference: List[tuple[float, float]] | None = (
        None  # Chemin de référence des retraits
    )

    batch_size = payload.batch_size
    max_iterations = payload.max_iterations
    confidence_level = payload.confidence_level
    tolerance_ratio = payload.tolerance_ratio

    # Exécution des tirages par lots jusqu'à atteindre la confiance ou la limite
    iterations = 0
    while iterations < max_iterations:
        batch = min(batch_size, max_iterations - iterations)
        for _ in range(batch):
            (
                final_capital,
                monthly_totals,
                monthly_withdrawals,
                cumulative_withdrawals,
            ) = _simulate_retirement_single_run(payload, total_months, retirement_age)
            results.append(final_capital)
            monthly_paths.append(monthly_totals)
            # On conserve le premier chemin de retraits comme référence
            if withdrawal_reference is None:
                withdrawal_reference = list(
                    zip(monthly_withdrawals, cumulative_withdrawals)
                )
        iterations = len(results)
        # On vérifie la confiance seulement après un lot complet
        if iterations < batch_size:
            continue
        if check_confidence_reached(results, confidence_level, tolerance_ratio):
            break

    # Calcul des statistiques sur les résultats
    sorted_results = sorted(results)
    percentile_sorted = lambda p: compute_percentile_from_sorted(sorted_results, p)
    mean_val = statistics.fmean(sorted_results) if sorted_results else 0.0
    stdev_val = statistics.pstdev(sorted_results) if sorted_results else 0.0

    # Calcul des percentiles mensuels pour l'affichage des trajectoires
    monthly_percentiles = _compute_retirement_percentiles(
        monthly_paths,
        retirement_age,
        withdrawal_reference,
    )

    return RetirementMonteCarloResult(
        iterations=len(sorted_results),
        confidence_level=confidence_level,
        tolerance_ratio=tolerance_ratio,
        confidence_reached=check_confidence_reached(
            sorted_results, confidence_level, tolerance_ratio
        ),
        mean_final_capital=mean_val,
        median_final_capital=percentile_sorted(0.5),
        percentile_10=percentile_sorted(0.1),
        percentile_50=percentile_sorted(0.5),
        percentile_90=percentile_sorted(0.9),
        percentile_min=percentile_sorted(0.05),
        percentile_max=percentile_sorted(0.95),
        standard_deviation=stdev_val,
        monthly_percentiles=monthly_percentiles,
    )


def _simulate_retirement_single_run(
    payload: RetirementMonteCarloInput,
    total_months: int,
    retirement_age: float,
) -> tuple[float, List[float], List[float], List[float]]:
    """
    Exécute un seul tirage de simulation Monte Carlo pour la retraite.

    Simule l'évolution du capital mois par mois en appliquant :
    - Les retraits mensuels nécessaires pour compléter les revenus
    - Les retraits proportionnels sur tous les comptes
    - Les rendements aléatoires corrélés
    - La fiscalité spécifique à chaque compte

    Args:
        payload: Paramètres de la simulation
        total_months: Nombre de mois à simuler
        retirement_age: Âge de départ à la retraite

    Returns:
        Tuple contenant :
        - Le capital final
        - La série mensuelle des totaux
        - La série mensuelle des retraits
        - La série mensuelle des retraits cumulés
    """
    # Initialisation des comptes avec leur solde au début de la retraite
    accounts = [
        AccountState(account=acc, balance=float(acc.current_amount))
        for acc in payload.investment_accounts
    ]
    asset_classes = (
        payload.market_assumptions.asset_classes
        if payload.market_assumptions
        else {}
    )

    monthly_totals: List[float] = []
    monthly_withdrawals: List[float] = []
    cumulative_withdrawals: List[float] = []

    cumulative_withdrawal = 0.0

    # Simulation mois par mois
    for month_index in range(total_months):
        age = retirement_age + month_index / 12

        # Calcul du revenu cible selon le profil de dépenses
        target_income = (
            payload.target_monthly_income
            * compute_spending_ratio(payload.spending_profile, age)
        )
        pension_income = payload.state_pension_monthly_income
        additional_income = compute_additional_income_amount(
            payload.additional_income_streams or [], age
        )

        # Calcul du retrait nécessaire pour compléter les revenus
        required_withdrawal = max(
            0.0, target_income - pension_income - additional_income
        )

        # Retrait effectif (limité au capital disponible)
        total_balance = sum(state.balance for state in accounts)
        actual_withdrawal = (
            min(required_withdrawal, total_balance) if total_balance > 0 else 0.0
        )

        # Retrait proportionnel sur tous les comptes
        if actual_withdrawal > 0 and total_balance > 0:
            for state in accounts:
                # Calcul de la part de chaque compte dans le total
                share = state.balance / total_balance if total_balance > 0 else 0.0
                # Retrait proportionnel
                state.balance -= actual_withdrawal * share
                # Protection contre les soldes négatifs
                if state.balance < 0:
                    state.balance = 0.0

        # Mise à jour des totaux de retraits
        cumulative_withdrawal += actual_withdrawal
        monthly_withdrawals.append(actual_withdrawal)
        cumulative_withdrawals.append(cumulative_withdrawal)

        # Génération des rendements aléatoires corrélés pour ce mois
        base_returns = sample_monthly_asset_returns(payload.market_assumptions)

        # Application des rendements sur les comptes restants
        for state in accounts:
            if state.balance <= 0:
                continue
            monthly_return = compute_account_return_from_asset_sample(
                state.account, base_returns, asset_classes
            )
            # Application du rendement : capital * (1 + rendement)
            state.balance *= 1 + monthly_return

        monthly_totals.append(sum(state.balance for state in accounts))

    final_capital = sum(state.balance for state in accounts)
    return final_capital, monthly_totals, monthly_withdrawals, cumulative_withdrawals


def _compute_retirement_percentiles(
    monthly_paths: List[List[float]],
    start_age: float,
    withdrawal_reference: List[tuple[float, float]] | None,
) -> List[RetirementMonteCarloPoint]:
    """
    Calcule les percentiles mensuels à partir de tous les tirages de retraite.

    Pour chaque mois, calcule les percentiles (5%, 10%, 50%, 90%, 95%)
    de la distribution des capitaux sur tous les tirages.

    Args:
        monthly_paths: Liste des trajectoires mensuelles (une par tirage)
        start_age: Âge de départ de la retraite
        withdrawal_reference: Série des retraits (pour référence)

    Returns:
        Liste des points de percentiles mensuels
    """
    if not monthly_paths:
        return []

    months = len(monthly_paths[0])
    points: List[RetirementMonteCarloPoint] = []

    for month_idx in range(months):
        # Extraction des valeurs pour ce mois sur tous les tirages
        month_values = [
            path[month_idx] for path in monthly_paths if len(path) > month_idx
        ]
        if not month_values:
            continue

        sorted_month = sorted(month_values)

        # Récupération des retraits de référence
        monthly_withdrawal = 0.0
        cumulative_withdrawal = 0.0
        if withdrawal_reference and len(withdrawal_reference) > month_idx:
            monthly_withdrawal, cumulative_withdrawal = withdrawal_reference[month_idx]

        points.append(
            RetirementMonteCarloPoint(
                month_index=month_idx + 1,
                age=start_age + month_idx / 12,
                monthly_withdrawal=monthly_withdrawal,
                cumulative_withdrawal=cumulative_withdrawal,
                percentile_min=compute_percentile_from_sorted(sorted_month, 0.05),
                percentile_10=compute_percentile_from_sorted(sorted_month, 0.1),
                percentile_50=compute_percentile_from_sorted(sorted_month, 0.5),
                percentile_90=compute_percentile_from_sorted(sorted_month, 0.9),
                percentile_max=compute_percentile_from_sorted(sorted_month, 0.95),
            )
        )

    return points


def compute_spending_ratio(spending_profile: List[SpendingPhase], age: float) -> float:
    """
    Calcule le ratio de dépenses pour un âge donné selon le profil.

    Args:
        spending_profile: Liste des phases de dépenses
        age: Âge pour lequel calculer le ratio

    Returns:
        Ratio de dépenses (entre 0 et 1, ou plus pour les phases intensives)
    """
    for phase in spending_profile:
        if phase.from_age <= age <= phase.to_age:
            return max(phase.spending_ratio, 0.0)
    # Par défaut, 100% des dépenses si aucune phase ne correspond
    return 1.0


def compute_additional_income_amount(
    incomes: List[AdditionalIncome], age: float
) -> float:
    """
    Calcule le montant total des revenus complémentaires actifs à un âge donné.

    Args:
        incomes: Liste des revenus complémentaires
        age: Âge pour lequel calculer les revenus

    Returns:
        Montant mensuel total des revenus complémentaires actifs
    """
    total = 0.0
    for income in incomes:
        start_age = income.start_age if income.start_age is not None else age
        if age >= start_age:
            total += income.monthly_amount
    return total

