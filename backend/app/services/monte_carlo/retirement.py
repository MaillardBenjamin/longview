"""
Module de simulation Monte Carlo pour la phase de retraite.

Simule la décumulation du capital pendant la retraite en tenant compte :
- Des retraits mensuels nécessaires pour compléter les revenus
- Des profils de dépenses variables selon l'âge
- Des revenus complémentaires (pension de l'État, autres revenus)
- Des retraits proportionnels sur tous les comptes
"""

import logging
import math
import statistics
from dataclasses import dataclass
from typing import Dict, List

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
from app.services.taxation import (
    AccountTaxState,
    calculate_withdrawal_tax,
    initialize_account_tax_state,
    update_cost_basis_after_withdrawal,
)
from app.services.progress import update_progress

logger = logging.getLogger("uvicorn.error").getChild("monte_carlo.retirement")


def simulate_retirement_monte_carlo(
    payload: RetirementMonteCarloInput,
    task_id: str | None = None,
    verbose: bool = True,
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
    primary_adult = payload.adults[0] if payload.adults else None
    retirement_age = primary_adult.retirement_age if primary_adult else None
    life_expectancy = primary_adult.life_expectancy if primary_adult else None
    
    logger.info(
        "=== DÉBUT SIMULATION RETRAITE === Âge retraite: %.1f ans | Espérance de vie: %.1f ans | Durée: %.1f ans",
        retirement_age or 0,
        life_expectancy or 0,
        (life_expectancy - retirement_age) if (life_expectancy and retirement_age) else 0
    )
    
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

    # Récupération des paramètres Monte Carlo
    market = payload.market_assumptions
    batch_size = getattr(market, "batch_size", None) or payload.batch_size
    max_iterations = getattr(market, "max_iterations", None) or payload.max_iterations
    confidence_level = getattr(market, "confidence_level", None) or payload.confidence_level
    tolerance_ratio = getattr(market, "tolerance_ratio", None) or payload.tolerance_ratio
    
    # Log des hypothèses de simulation seulement si verbose=True
    if verbose:
        logger.info("=== HYPOTHÈSES DE SIMULATION RETRAITE ===")
        
        # Hypothèses de marché
        if market:
            logger.info("--- Hypothèses de marché ---")
            logger.info("  Inflation: moyenne=%.2f%%/an, volatilité=%.2f%%/an", 
                        market.inflation_mean or 0.0, market.inflation_volatility or 0.0)
            logger.info("  Classes d'actifs:")
            for asset_key, asset_class in market.asset_classes.items():
                logger.info("    - %s: rendement=%.2f%%/an, volatilité=%.2f%%/an",
                           asset_key, asset_class.expected_return, asset_class.volatility)
        
        # Objectifs de retraite
        logger.info("--- Objectifs de retraite ---")
        logger.info("  Revenu mensuel cible: %.2f €", payload.target_monthly_income or 0.0)
        logger.info("  Pension de l'État mensuelle: %.2f €", payload.state_pension_monthly_income or 0.0)
        if payload.additional_income_streams:
            total_additional = sum(inc.monthly_amount for inc in payload.additional_income_streams)
            logger.info("  Revenus complémentaires mensuels: %.2f € (%d source(s))", 
                       total_additional, len(payload.additional_income_streams))
        
        # Profil de dépenses
        if payload.spending_profile:
            logger.info("--- Profil de dépenses (%d phase(s)) ---", len(payload.spending_profile))
            for idx, phase in enumerate(payload.spending_profile):
                logger.info("  Phase %d: %s - De %.1f à %.1f ans, ratio=%.1f%%",
                           idx + 1, phase.label, phase.from_age, phase.to_age, phase.spending_ratio * 100)
        
        # Paramètres Monte Carlo
        logger.info("--- Paramètres Monte Carlo ---")
        logger.info("  Niveau de confiance: %.1f%%", confidence_level * 100)
        logger.info("  Tolérance: %.2f%%", tolerance_ratio * 100)
        logger.info("  Itérations max: %d", max_iterations)
        logger.info("  Taille des lots: %d", batch_size)

        # Log des comptes en entrée (une seule fois au début de la simulation)
        logger.info("=== Répartition des comptes en entrée de la phase de retraite ===")
        initial_balances_by_type: Dict[str, float] = {}
        account_count_by_type: Dict[str, int] = {}
        for idx, account in enumerate(payload.investment_accounts):
            account_type = account.type.value if hasattr(account.type, "value") else str(account.type)
            if account_type not in initial_balances_by_type:
                initial_balances_by_type[account_type] = 0.0
                account_count_by_type[account_type] = 0
            initial_balances_by_type[account_type] += account.current_amount
            account_count_by_type[account_type] += 1
            logger.info(
                "  Compte %d: %s - Solde=%.2f €",
                idx,
                account_type,
                account.current_amount
            )
        
        logger.info("=== Soldes par type de compte (agrégés) ===")
        total_initial = sum(initial_balances_by_type.values())
        for account_type, balance in sorted(initial_balances_by_type.items()):
            count = account_count_by_type[account_type]
            percentage = (balance / total_initial * 100) if total_initial > 0 else 0.0
            logger.info(
                "  - %s: %.2f € (%d compte(s), %.1f%% du total)",
                account_type,
                balance,
                count,
                percentage
            )
        logger.info("  TOTAL: %.2f €", total_initial)
    else:
        # En mode non-verbose, on calcule juste les soldes agrégés pour le résumé
        initial_balances_by_type: Dict[str, float] = {}
        account_count_by_type: Dict[str, int] = {}
        for account in payload.investment_accounts:
            account_type = account.type.value if hasattr(account.type, "value") else str(account.type)
            if account_type not in initial_balances_by_type:
                initial_balances_by_type[account_type] = 0.0
                account_count_by_type[account_type] = 0
            initial_balances_by_type[account_type] += account.current_amount
            account_count_by_type[account_type] += 1
        total_initial = sum(initial_balances_by_type.values())

    # Initialisation des structures de données
    results: List[float] = []  # Capital final de chaque tirage
    monthly_paths: List[List[float]] = []  # Évolution mensuelle de chaque tirage
    withdrawal_reference: List[tuple[float, float]] | None = (
        None  # Chemin de référence des retraits
    )
    taxes_reference: List[Dict[str, Dict[str, float]]] | None = None  # Taxes de référence
    cumulative_taxes_reference: Dict[str, Dict[str, float]] | None = None  # Taxes cumulées de référence

    # Exécution des tirages par lots jusqu'à atteindre la confiance ou la limite
    if verbose:
        logger.info("=== DÉBUT DES ITÉRATIONS MONTE CARLO ===")
        logger.info("Exécution de la simulation Monte Carlo (max %d itérations)...", max_iterations)
    iterations = 0
    last_logged_iteration = 0
    while iterations < max_iterations:
        batch = min(batch_size, max_iterations - iterations)
        if verbose:
            logger.info("  [RETRAITE] Début du lot: %d itérations (total: %d/%d)", batch, iterations, max_iterations)
        for i in range(batch):
            (
                final_capital,
                monthly_totals,
                monthly_withdrawals,
                cumulative_withdrawals,
                monthly_taxes,
                cumulative_taxes,
            ) = _simulate_retirement_single_run(payload, total_months, retirement_age)
            results.append(final_capital)
            monthly_paths.append(monthly_totals)
            # On conserve le premier chemin de retraits et taxes comme référence
            if withdrawal_reference is None:
                withdrawal_reference = list(
                    zip(monthly_withdrawals, cumulative_withdrawals)
                )
                taxes_reference = monthly_taxes
                cumulative_taxes_reference = cumulative_taxes
            
            # Log toutes les 10 itérations et mettre à jour la progression
            current_iteration = iterations + i + 1
            if current_iteration % 10 == 0 or current_iteration == max_iterations:
                progress_percent = (current_iteration / max_iterations) * 100
                # Log de progression seulement si verbose ou pour le frontend
                if verbose:
                    logger.info("  [RETRAITE] Progression: %d/%d itérations (%.1f%%)", current_iteration, max_iterations, progress_percent)
                
                # Mettre à jour la progression pour le frontend
                if task_id:
                    # Calculer le pourcentage global : on est dans l'étape "retraite" (50% de base)
                    # La retraite représente environ 13% de l'étape totale (de 50% à 63%)
                    # Donc on va de 50% à 63%
                    base_progress = 50.0
                    step_progress = 13.0 * (progress_percent / 100.0)  # 63% - 50% = 13%
                    global_progress = base_progress + step_progress
                    update_progress(
                        task_id,
                        current_step="retraite",
                        step_description=f"Simulation de retraite - {current_iteration}/{max_iterations} itérations (%.1f%%)" % progress_percent,
                        progress_percent=global_progress,
                        message=f"[RETRAITE] Progression: {current_iteration}/{max_iterations} itérations (%.1f%%)" % progress_percent,
                    )
        
        iterations = len(results)
        
        # On vérifie la confiance seulement après un lot complet
        if iterations < batch_size:
            continue
        confidence_ok, _, _ = check_confidence_reached(results, confidence_level, tolerance_ratio)
        if confidence_ok:
            if verbose:
                logger.info("  [RETRAITE] Confiance atteinte après %d itérations", iterations)
            break

    # Calcul des statistiques sur les résultats
    # Filtrage strict des valeurs aberrantes avant le calcul des percentiles
    filtered_results = [r for r in results if 0 <= r < 1e12]  # Limite stricte à 1000 milliards
    if len(filtered_results) < len(results):
        logger.warning(
            f"Filtrage de {len(results) - len(filtered_results)} valeurs aberrantes "
            f"sur {len(results)} résultats totaux."
        )
    
    sorted_results = sorted(filtered_results) if filtered_results else [0.0]
    percentile_sorted = lambda p: compute_percentile_from_sorted(sorted_results, p)
    mean_val = statistics.fmean(sorted_results) if sorted_results else 0.0
    stdev_val = statistics.pstdev(sorted_results) if sorted_results else 0.0

    # Calcul des percentiles mensuels pour l'affichage des trajectoires
    monthly_percentiles = _compute_retirement_percentiles(
        monthly_paths,
        retirement_age,
        withdrawal_reference,
        taxes_reference,
    )

    # Calcul final de la confiance et de la marge d'erreur
    confidence_ok, error_margin, error_margin_ratio = check_confidence_reached(
        sorted_results, confidence_level, tolerance_ratio
    )
    
    if verbose:
        logger.info(
            "Simulation terminée: %d itérations | Confiance atteinte: %s | Capital médian final: %.2f €",
            len(sorted_results),
            "Oui" if confidence_ok else "Non",
            percentile_sorted(0.5)
        )

    # Conversion des taxes cumulées en format TaxBreakdownByAccountType
    from app.schemas.projections import TaxBreakdownByAccountType
    
    total_taxes_by_account_type: Dict[str, TaxBreakdownByAccountType] = {}
    cumulative_total_income_tax = 0.0
    cumulative_total_social_contributions = 0.0
    
    if cumulative_taxes_reference:
        for account_type, tax_data in cumulative_taxes_reference.items():
            # Vérifier que tax_data est bien un dictionnaire
            if isinstance(tax_data, dict):
                tax_breakdown = TaxBreakdownByAccountType(
                    account_type=account_type,
                    gross_withdrawal=tax_data.get("gross_withdrawal", 0.0),
                    capital_gain=tax_data.get("capital_gain", 0.0),
                    income_tax=tax_data.get("income_tax", 0.0),
                    social_contributions=tax_data.get("social_contributions", 0.0),
                    net_withdrawal=tax_data.get("net_withdrawal", 0.0),
                )
                total_taxes_by_account_type[account_type] = tax_breakdown
                cumulative_total_income_tax += tax_data.get("income_tax", 0.0)
                cumulative_total_social_contributions += tax_data.get("social_contributions", 0.0)
            else:
                logger.error(f"ERREUR: tax_data n'est pas un dict mais {type(tax_data)}")
    
    total_taxes = cumulative_total_income_tax + cumulative_total_social_contributions
    
    # Calcul du total des retraits bruts pour vérification
    total_gross_withdrawals = sum(
        tax_breakdown.gross_withdrawal
        for tax_breakdown in total_taxes_by_account_type.values()
    )
    
    median_final_capital = percentile_sorted(0.5)
    
    # Résumé synthétique : Capital initial, retraits, gains, capital final
    initial_capital = sum(account.current_amount for account in payload.investment_accounts)
    total_net_withdrawals = sum(
        tax_breakdown.net_withdrawal
        for tax_breakdown in total_taxes_by_account_type.values()
    )
    # Calcul des gains pendant la retraite (capital final + retraits - capital initial)
    # Note: Les retraits incluent les gains générés pendant la retraite
    total_gains_during_retirement = median_final_capital + total_gross_withdrawals - initial_capital
    
    # Résumé synthétique compact
    logger.info("=== RÉSUMÉ RETRAITE === Capital initial: %.2f € | Retraits bruts: %.2f € | Retraits nets: %.2f € | Taxes: %.2f € | Gains: %.2f € | Capital final: %.2f € | Consommation: %.1f%%",
               initial_capital, total_gross_withdrawals, total_net_withdrawals, total_taxes, 
               total_gains_during_retirement, median_final_capital,
               (total_gross_withdrawals / initial_capital * 100) if initial_capital > 0 else 0.0)

    return RetirementMonteCarloResult(
        iterations=len(sorted_results),
        confidence_level=confidence_level,
        tolerance_ratio=tolerance_ratio,
        confidence_reached=confidence_ok,
        error_margin=error_margin,
        error_margin_ratio=error_margin_ratio,
        mean_final_capital=mean_val,
        median_final_capital=percentile_sorted(0.5),
        percentile_10=percentile_sorted(0.1),
        percentile_50=percentile_sorted(0.5),
        percentile_90=percentile_sorted(0.9),
        percentile_min=percentile_sorted(0.05),
        percentile_max=percentile_sorted(0.95),
        standard_deviation=stdev_val,
        monthly_percentiles=monthly_percentiles,
        total_taxes_by_account_type=total_taxes_by_account_type,
        cumulative_total_income_tax=cumulative_total_income_tax,
        cumulative_total_social_contributions=cumulative_total_social_contributions,
        cumulative_total_taxes=total_taxes,
    )


def _simulate_retirement_single_run(
    payload: RetirementMonteCarloInput,
    total_months: int,
    retirement_age: float,
) -> tuple[float, List[float], List[float], List[float], List[Dict[str, Dict[str, float]]], Dict[str, Dict[str, float]]]:
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
    
    # Initialisation des états fiscaux pour suivre le PMP
    tax_states = [
        initialize_account_tax_state(acc, retirement_age)
        for acc in payload.investment_accounts
    ]
    
    # Mise à jour des soldes des états fiscaux avec les soldes initiaux
    for tax_state, account_state in zip(tax_states, accounts):
        tax_state.account.current_amount = account_state.balance
        # Si le coût d'acquisition n'était pas défini, on utilise une estimation
        # (déjà fait dans initialize_account_tax_state, mais on vérifie)
        if tax_state.cost_basis == 0 and account_state.balance > 0:
            # Estimation : 70% du capital = PMP (30% de plus-value estimée)
            tax_state.cost_basis = account_state.balance * 0.7
    
    asset_classes = (
        payload.market_assumptions.asset_classes
        if payload.market_assumptions
        else {}
    )
    
    # Récupération des paramètres fiscaux
    tax_params = payload.tax_parameters
    tmi_retirement = tax_params.tmi_retirement_phase if tax_params else None
    is_couple = tax_params.is_couple if tax_params else False

    # Calcul des soldes initiaux par type de compte (sans logging, déjà fait au début)
    initial_balances_by_type: Dict[str, float] = {}
    account_count_by_type: Dict[str, int] = {}
    for account in payload.investment_accounts:
        account_type = account.type.value if hasattr(account.type, "value") else str(account.type)
        if account_type not in initial_balances_by_type:
            initial_balances_by_type[account_type] = 0.0
            account_count_by_type[account_type] = 0
        initial_balances_by_type[account_type] += account.current_amount
        account_count_by_type[account_type] += 1

    monthly_totals: List[float] = []
    monthly_withdrawals: List[float] = []
    cumulative_withdrawals: List[float] = []
    # Suivi des taxes par type de compte pour chaque mois
    monthly_taxes_by_account_type: List[Dict[str, Dict[str, float]]] = []

    cumulative_withdrawal = 0.0
    cumulative_taxes_by_account_type: Dict[str, Dict[str, float]] = {}

    # Simulation mois par mois
    for month_index in range(total_months):
        age = retirement_age + month_index / 12
        
        # Mise à jour de l'âge actuel dans les états fiscaux et synchronisation des soldes
        for tax_state, account_state in zip(tax_states, accounts):
            tax_state.current_age = age
            # IMPORTANT: Synchroniser le solde dans tax_state avec account_state avant chaque calcul
            tax_state.account.current_amount = account_state.balance

        # Calcul du revenu cible selon le profil de dépenses
        target_income = (
            payload.target_monthly_income
            * compute_spending_ratio(payload.spending_profile, age)
        )
        pension_income = payload.state_pension_monthly_income
        additional_income = compute_additional_income_amount(
            payload.additional_income_streams or [], age
        )

        # Calcul du retrait NET nécessaire pour compléter les revenus
        required_net_withdrawal = max(
            0.0, target_income - pension_income - additional_income
        )

        # Calcul itératif du retrait brut nécessaire pour obtenir le montant net souhaité
        # (car les taxes dépendent du montant retiré)
        total_balance = sum(state.balance for state in accounts)
        if required_net_withdrawal <= 0 or total_balance <= 0:
            actual_gross_withdrawal = 0.0
            actual_net_withdrawal = 0.0
            account_withdrawals = {}
        else:
            # Estimation initiale : on suppose un taux d'imposition moyen de 20%
            estimated_tax_rate = 0.20
            estimated_gross = required_net_withdrawal / (1 - estimated_tax_rate)
            estimated_gross = min(estimated_gross, total_balance * 0.99)  # Limite à 99% pour éviter les problèmes
            
            # Itération pour trouver le montant brut exact
            # Optimisation: réduire à 10 itérations (suffisant pour la convergence)
            max_iterations = 10
            account_withdrawals = {}  # Stockage des retraits par compte pour éviter le recalcul
            actual_gross_withdrawal = 0.0
            actual_net_withdrawal = 0.0
            convergence_iterations = 0
            
            # Pré-calculer les parts de chaque compte (ne change pas pendant l'itération)
            account_shares = []
            for account_state in accounts:
                if account_state.balance > 0 and total_balance > 0:
                    account_shares.append(account_state.balance / total_balance)
                else:
                    account_shares.append(0.0)
            
            for iteration in range(max_iterations):
                # Calcul des taxes pour ce montant brut estimé
                total_net = 0.0
                account_withdrawals = {}
                
                # Protection contre les valeurs aberrantes
                if estimated_gross <= 0 or estimated_gross > total_balance * 1.1:
                    break
                
                # Validation stricte de estimated_gross
                if estimated_gross > 1e12:  # Limite à 1000 milliards
                    logger.warning(f"estimated_gross aberrant: {estimated_gross:.2f}. Arrêt de l'itération.")
                    break
                
                if estimated_gross > 0 and total_balance > 0:
                    # Répartition proportionnelle du retrait estimé
                    for idx, (tax_state, account_state, share) in enumerate(zip(tax_states, accounts, account_shares)):
                        if account_state.balance <= 0 or share <= 0:
                            continue
                        
                        # Validation du solde avant calcul
                        if account_state.balance > 1e12:  # Limite à 1000 milliards
                            logger.warning(f"Solde aberrant pour compte {idx}: {account_state.balance:.2f}")
                            continue
                        
                        # OPTIMISATION: Éviter model_dump() en modifiant directement l'attribut
                        # On sauvegarde la valeur originale pour la restaurer après
                        original_current_amount = tax_state.account.current_amount
                        tax_state.account.current_amount = account_state.balance
                        
                        share = account_shares[idx]
                        account_withdrawal = estimated_gross * share
                        
                        # Protection : ne pas retirer plus que le solde disponible
                        account_withdrawal = min(account_withdrawal, account_state.balance)
                        
                        # Validation stricte du retrait
                        if account_withdrawal > 1e12:
                            logger.warning(f"Retrait aberrant pour compte {idx}: {account_withdrawal:.2f}")
                            tax_state.account.current_amount = original_current_amount
                            continue
                        
                        if account_withdrawal > 0:
                            # Calcul des taxes pour ce compte (on utilise directement tax_state)
                            tax_result = calculate_withdrawal_tax(
                                account_withdrawal,
                                tax_state,
                                age,
                                tmi_retirement,
                                is_couple,
                            )
                            # Validation des résultats de taxes
                            if tax_result.net_withdrawal > 0 and tax_result.net_withdrawal < account_withdrawal * 2:
                                total_net += tax_result.net_withdrawal
                                account_withdrawals[idx] = (account_withdrawal, tax_result)
                            else:
                                logger.warning(
                                    f"Résultat de taxe aberrant pour compte {idx}: "
                                    f"net={tax_result.net_withdrawal:.2f}, gross={account_withdrawal:.2f}"
                                )
                        
                        # Restaurer la valeur originale
                        tax_state.account.current_amount = original_current_amount
                
                # Vérification si on a atteint le montant net souhaité
                # OPTIMISATION: Tolérance relative plus large pour convergence plus rapide
                error = abs(total_net - required_net_withdrawal)
                relative_error = error / required_net_withdrawal if required_net_withdrawal > 0 else error
                if error < 0.1 or (total_net >= required_net_withdrawal and relative_error < 0.01):
                    actual_gross_withdrawal = estimated_gross
                    actual_net_withdrawal = total_net
                    convergence_iterations = iteration + 1
                    break
                
                # Calcul du taux d'imposition effectif pour améliorer l'estimation
                if estimated_gross > 0:
                    effective_tax_rate = 1 - (total_net / estimated_gross) if total_net > 0 else estimated_tax_rate
                    effective_tax_rate = max(0.0, min(0.5, effective_tax_rate))  # Limite entre 0% et 50%
                else:
                    effective_tax_rate = estimated_tax_rate
                
                # Ajustement pour la prochaine itération (méthode de Newton simplifiée)
                # Protection contre les cas où total_net est aberrant
                if total_net < 0 or total_net > estimated_gross * 2:
                    # Si total_net est aberrant, on arrête l'itération
                    logger.warning(
                        "Mois %d (âge %.1f): total_net aberrant (%.2f €), estimated_gross=%.2f €. Arrêt itération.",
                        month_index + 1,
                        age,
                        total_net,
                        estimated_gross
                    )
                    break
                
                if total_net < required_net_withdrawal:
                    # On n'a pas assez retiré, on augmente
                    if effective_tax_rate > 0 and effective_tax_rate < 1:
                        adjustment = (required_net_withdrawal - total_net) / (1 - effective_tax_rate)
                    else:
                        adjustment = (required_net_withdrawal - total_net) / 0.8
                    # OPTIMISATION: Limiter l'ajustement pour éviter les oscillations (max 20% du solde total pour convergence plus rapide)
                    adjustment = min(adjustment, total_balance * 0.2, estimated_gross * 0.6)
                    estimated_gross = min(estimated_gross + adjustment, total_balance * 0.99)
                else:
                    # On a trop retiré, on diminue
                    if effective_tax_rate > 0 and effective_tax_rate < 1:
                        adjustment = (total_net - required_net_withdrawal) / (1 - effective_tax_rate)
                    else:
                        adjustment = (total_net - required_net_withdrawal) / 0.8
                    # OPTIMISATION: Limiter l'ajustement pour éviter les oscillations (max 60% de l'estimation actuelle)
                    adjustment = min(adjustment, estimated_gross * 0.6, total_balance * 0.2)
                    estimated_gross = max(0.0, estimated_gross - adjustment)
                
                # Protection finale contre les valeurs aberrantes
                if estimated_gross <= 0 or estimated_gross > total_balance * 1.01:
                    logger.warning(
                        "Mois %d (âge %.1f): estimated_gross aberrant (%.2f €), total_balance=%.2f €. Arrêt itération.",
                        month_index + 1,
                        age,
                        estimated_gross,
                        total_balance
                    )
                    break
                
                # Mise à jour du taux estimé pour la prochaine itération
                estimated_tax_rate = effective_tax_rate
            else:
                # Si on n'a pas convergé après max_iterations, on utilise la dernière estimation
                convergence_iterations = max_iterations
                if estimated_gross > 0 and estimated_gross <= 1e12 and total_balance > 0:
                    total_net = 0.0
                    account_withdrawals = {}
                    # OPTIMISATION: Utiliser les parts pré-calculées et éviter model_dump()
                    for idx, (tax_state, account_state, share) in enumerate(zip(tax_states, accounts, account_shares)):
                        if account_state.balance <= 0 or account_state.balance > 1e12 or share <= 0:
                            continue
                        
                        # OPTIMISATION: Modifier directement l'attribut au lieu de créer un nouvel objet
                        original_current_amount = tax_state.account.current_amount
                        tax_state.account.current_amount = account_state.balance
                        
                        account_withdrawal = min(estimated_gross * share, account_state.balance)
                        if account_withdrawal > 0 and account_withdrawal <= 1e12:
                            tax_result = calculate_withdrawal_tax(
                                account_withdrawal,
                                tax_state,
                                age,
                                tmi_retirement,
                                is_couple,
                            )
                            if tax_result.net_withdrawal > 0 and tax_result.net_withdrawal < account_withdrawal * 2:
                                total_net += tax_result.net_withdrawal
                                account_withdrawals[idx] = (account_withdrawal, tax_result)
                        
                        # Restaurer la valeur originale
                        tax_state.account.current_amount = original_current_amount
                    
                    actual_gross_withdrawal = estimated_gross
                    actual_net_withdrawal = total_net
                    # Log si convergence difficile (plus de 5 itérations)
                    if convergence_iterations > 5:
                        logger.debug(
                            "Mois %d (âge %.1f): Convergence en %d itérations | Net requis: %.2f € | Net obtenu: %.2f € | Brut: %.2f €",
                            month_index + 1,
                            age,
                            convergence_iterations,
                            required_net_withdrawal,
                            actual_net_withdrawal,
                            actual_gross_withdrawal
                        )
                else:
                    # Si estimated_gross est aberrant, on arrête sans retrait
                    actual_gross_withdrawal = 0.0
                    actual_net_withdrawal = 0.0
                    account_withdrawals = {}
                    logger.warning(
                        "Mois %d (âge %.1f): Impossible de calculer retrait (estimated_gross aberrant)",
                        month_index + 1,
                        age
                    )

        # Suivi des taxes par type de compte pour ce mois
        month_taxes_by_account_type: Dict[str, Dict[str, float]] = {}
        total_month_income_tax = 0.0
        total_month_social_contributions = 0.0

        # Application des retraits calculés
        if actual_gross_withdrawal > 0 and total_balance > 0:
            # Vérification : calculer le total des retraits bruts depuis account_withdrawals
            total_gross_from_dict = sum(
                withdrawal for withdrawal, _ in account_withdrawals.values()
            )
            
            # Vérification de cohérence
            if abs(total_gross_from_dict - actual_gross_withdrawal) > 0.01:
                logger.warning(
                    "Mois %d (âge %.1f): Incohérence - actual_gross_withdrawal=%.2f € mais somme des retraits=%.2f €",
                    month_index + 1,
                    age,
                    actual_gross_withdrawal,
                    total_gross_from_dict
                )
            
            for idx, (tax_state, account_state) in enumerate(zip(tax_states, accounts)):
                if idx not in account_withdrawals:
                    # Log si un compte avec solde > 0 n'est pas dans les retraits
                    if account_state.balance > 0.01:
                        logger.debug(
                            "Mois %d (âge %.1f): Compte %d (%s) avec solde %.2f € non inclus dans les retraits",
                            month_index + 1,
                            age,
                            idx,
                            tax_state.account.type.value if hasattr(tax_state.account.type, "value") else str(tax_state.account.type),
                            account_state.balance
                        )
                    continue
                
                account_gross_withdrawal, tax_result = account_withdrawals[idx]
                
                # Suivi des taxes par type de compte
                account_type = tax_state.account.type.value if hasattr(tax_state.account.type, "value") else str(tax_state.account.type)
                if account_type not in month_taxes_by_account_type:
                    month_taxes_by_account_type[account_type] = {
                        "gross_withdrawal": 0.0,
                        "capital_gain": 0.0,
                        "income_tax": 0.0,
                        "social_contributions": 0.0,
                        "net_withdrawal": 0.0,
                    }
                
                month_taxes_by_account_type[account_type]["gross_withdrawal"] += account_gross_withdrawal
                month_taxes_by_account_type[account_type]["capital_gain"] += tax_result.capital_gain
                month_taxes_by_account_type[account_type]["income_tax"] += tax_result.income_tax
                month_taxes_by_account_type[account_type]["social_contributions"] += tax_result.social_contributions
                month_taxes_by_account_type[account_type]["net_withdrawal"] += tax_result.net_withdrawal
                
                total_month_income_tax += tax_result.income_tax
                total_month_social_contributions += tax_result.social_contributions
                
                # Mise à jour du solde (on retire le montant brut)
                account_state.balance -= account_gross_withdrawal
                if account_state.balance < 0:
                    account_state.balance = 0.0
                
                # Protection contre les valeurs aberrantes
                if account_state.balance > 1e12:  # Limite stricte à 1000 milliards
                    logger.warning(
                        "Mois %d (âge %.1f): Solde aberrant après retrait compte %d: %.2f €. Limitation appliquée.",
                        month_index + 1,
                        age,
                        idx,
                        account_state.balance
                    )
                    account_state.balance = 1e12
                
                # Mise à jour du PMP après retrait
                # IMPORTANT: update_cost_basis_after_withdrawal retourne un nouvel AccountTaxState
                # On doit remplacer l'élément dans la liste tax_states
                tax_states[idx] = update_cost_basis_after_withdrawal(
                    tax_state,
                    account_gross_withdrawal,
                )
                # Mise à jour du solde dans l'état fiscal (déjà fait dans update_cost_basis_after_withdrawal,
                # mais on s'assure qu'il est synchronisé avec account_state)
                tax_states[idx].account.current_amount = account_state.balance
                
                # Mise à jour des totaux cumulés par type de compte
                if account_type not in cumulative_taxes_by_account_type:
                    cumulative_taxes_by_account_type[account_type] = {
                        "gross_withdrawal": 0.0,
                        "capital_gain": 0.0,
                        "income_tax": 0.0,
                        "social_contributions": 0.0,
                        "net_withdrawal": 0.0,
                    }
                cumulative_taxes_by_account_type[account_type]["gross_withdrawal"] += account_gross_withdrawal
                cumulative_taxes_by_account_type[account_type]["capital_gain"] += tax_result.capital_gain
                cumulative_taxes_by_account_type[account_type]["income_tax"] += tax_result.income_tax
                cumulative_taxes_by_account_type[account_type]["social_contributions"] += tax_result.social_contributions
                cumulative_taxes_by_account_type[account_type]["net_withdrawal"] += tax_result.net_withdrawal

        # Calcul du total des retraits bruts pour ce mois (pour vérification)
        total_gross_withdrawal_month = sum(
            tax_data.get("gross_withdrawal", 0.0)
            for tax_data in month_taxes_by_account_type.values()
        )
        
        # Vérification de cohérence : le total brut doit correspondre à actual_gross_withdrawal
        if abs(total_gross_withdrawal_month - actual_gross_withdrawal) > 0.01:
            logger.warning(
                "Mois %d (âge %.1f): Incohérence dans les retraits bruts - Total calculé: %.2f € | actual_gross_withdrawal: %.2f €",
                month_index + 1,
                age,
                total_gross_withdrawal_month,
                actual_gross_withdrawal
            )
        
        # Mise à jour des totaux de retraits (on enregistre le montant NET)
        cumulative_withdrawal += actual_net_withdrawal
        monthly_withdrawals.append(actual_net_withdrawal)
        cumulative_withdrawals.append(cumulative_withdrawal)
        monthly_taxes_by_account_type.append(month_taxes_by_account_type)

        # Génération des rendements aléatoires corrélés pour ce mois
        base_returns = sample_monthly_asset_returns(payload.market_assumptions)

        # Application des rendements sur les comptes restants
        for tax_state, account_state in zip(tax_states, accounts):
            if account_state.balance <= 0:
                continue
            monthly_return = compute_account_return_from_asset_sample(
                account_state.account, base_returns, asset_classes
            )
            
            # Validation du rendement pour éviter les valeurs aberrantes
            # Limite les rendements à un maximum de ±30% par mois (protection stricte)
            # Cette limite doit correspondre à celle dans returns.py
            monthly_return = max(-0.3, min(0.3, monthly_return))
            
            # Validation du solde avant application du rendement
            if account_state.balance > 1e12:  # Limite stricte à 1000 milliards
                logger.warning(
                    "Mois %d (âge %.1f): Solde aberrant avant rendement compte %s: %.2f €. Limitation appliquée.",
                    month_index + 1,
                    age,
                    account_state.account.type,
                    account_state.balance
                )
                account_state.balance = 1e12
            
            # Application du rendement : capital * (1 + rendement)
            new_balance = account_state.balance * (1 + monthly_return)
            
            # Protection stricte contre les valeurs aberrantes
            if not (0 <= new_balance < 1e12):  # Limite stricte à 1000 milliards
                logger.warning(
                    "Mois %d (âge %.1f): Rendement aberrant compte %s: balance=%.2f €, rendement=%.4f, nouveau=%.2f €. Limitation appliquée.",
                    month_index + 1,
                    age,
                    account_state.account.type,
                    account_state.balance,
                    monthly_return,
                    new_balance
                )
                # Limite stricte : pas plus de 30% de gain par mois
                new_balance = min(account_state.balance * 1.3, 1e12)
            
            account_state.balance = new_balance
            # Synchroniser le solde dans tax_state après le rendement
            tax_state.account.current_amount = account_state.balance

        total_month = sum(state.balance for state in accounts)
        
        # Protection stricte contre les valeurs aberrantes dans le total mensuel
        if total_month > 1e12:  # Limite stricte à 1000 milliards
            logger.warning(
                "Mois %d (âge %.1f): Total mensuel aberrant: %.2f €. Limitation appliquée.",
                month_index + 1,
                age,
                total_month
            )
            total_month = 1e12
        
        monthly_totals.append(total_month)

    final_capital = sum(state.balance for state in accounts)
    
    # Protection finale stricte contre les valeurs aberrantes
    if final_capital > 1e12:  # Limite stricte à 1000 milliards
        logger.warning(
            "Capital final aberrant: %.2f €. Limitation appliquée.",
            final_capital
        )
        final_capital = 1e12
    if final_capital < 0:
        final_capital = 0.0
    
    # Log de synthèse final pour cette simulation (seulement en mode DEBUG pour éviter la pollution)
    # Les détails sont déjà loggés au début de la simulation
    if logger.isEnabledFor(logging.DEBUG):
        logger.debug("=== FIN DU TIRAGE MONTE CARLO ===")
        logger.debug(f"  Capital final: {final_capital:.2f} €")
        logger.debug("  Retraits cumulés par type de compte:")
        for account_type, tax_data in cumulative_taxes_by_account_type.items():
            initial_balance = initial_balances_by_type.get(account_type, 0.0)
            gross_withdrawal = tax_data.get("gross_withdrawal", 0.0)
            ratio = (gross_withdrawal / initial_balance * 100) if initial_balance > 0 else 0.0
            logger.debug(
                f"    {account_type}: {gross_withdrawal:.2f} € (capital initial: {initial_balance:.2f} €, ratio: {ratio:.1f}%)"
            )
    
    return (
        final_capital,
        monthly_totals,
        monthly_withdrawals,
        cumulative_withdrawals,
        monthly_taxes_by_account_type,
        cumulative_taxes_by_account_type,
    )


def _compute_retirement_percentiles(
    monthly_paths: List[List[float]],
    start_age: float,
    withdrawal_reference: List[tuple[float, float]] | None,
    taxes_reference: List[Dict[str, Dict[str, float]]] | None = None,
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

        # Filtrage strict des valeurs aberrantes avant le calcul des percentiles
        # On filtre les valeurs négatives, infinies, NaN, et les valeurs extrêmement grandes
        filtered_month_values = [
            v for v in month_values
            if isinstance(v, (int, float))
            and not math.isnan(v)
            and not math.isinf(v)
            and 0 <= v < 1e12
        ]
        
        # Si toutes les valeurs ont été filtrées, on utilise 0.0
        if not filtered_month_values:
            filtered_month_values = [0.0]
        
        sorted_month = sorted(filtered_month_values)

        # Récupération des retraits de référence
        monthly_withdrawal = 0.0
        cumulative_withdrawal = 0.0
        if withdrawal_reference and len(withdrawal_reference) > month_idx:
            monthly_withdrawal, cumulative_withdrawal = withdrawal_reference[month_idx]

        # Récupération des taxes de référence pour ce mois
        from app.schemas.projections import TaxBreakdownByAccountType
        
        taxes_by_account_type: List[TaxBreakdownByAccountType] = []
        total_income_tax = 0.0
        total_social_contributions = 0.0
        
        if taxes_reference and len(taxes_reference) > month_idx:
            month_taxes = taxes_reference[month_idx]
            for account_type, tax_data in month_taxes.items():
                taxes_by_account_type.append(
                    TaxBreakdownByAccountType(
                        account_type=account_type,
                        gross_withdrawal=tax_data.get("gross_withdrawal", 0.0),
                        capital_gain=tax_data.get("capital_gain", 0.0),
                        income_tax=tax_data.get("income_tax", 0.0),
                        social_contributions=tax_data.get("social_contributions", 0.0),
                        net_withdrawal=tax_data.get("net_withdrawal", 0.0),
                    )
                )
                total_income_tax += tax_data.get("income_tax", 0.0)
                total_social_contributions += tax_data.get("social_contributions", 0.0)

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
                taxes_by_account_type=taxes_by_account_type,
                total_income_tax=total_income_tax,
                total_social_contributions=total_social_contributions,
                total_taxes=total_income_tax + total_social_contributions,
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

