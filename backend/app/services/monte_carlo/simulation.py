"""
Module de simulation Monte Carlo pour la phase de capitalisation.

Simule l'accumulation de capital jusqu'à l'âge de la retraite en utilisant
des tirages aléatoires corrélés pour modéliser l'incertitude des rendements.
"""

import logging
import statistics
from dataclasses import dataclass
from typing import List

from app.schemas.projections import (
    InvestmentAccount,
    MonteCarloInput,
    MonteCarloPercentilePoint,
    MonteCarloResult,
)
from app.services.capitalization import (
    _active_monthly_contribution,
    _distribute_contributions,
)
from app.services.monte_carlo.returns import (
    compute_account_return_from_asset_sample,
    sample_monthly_asset_returns,
)
from app.services.monte_carlo.statistics import (
    check_confidence_reached,
    compute_percentile_from_sorted,
)
from app.services.progress import update_progress

logger = logging.getLogger("uvicorn.error").getChild("monte_carlo.simulation")


@dataclass
class AccountState:
    """
    État d'un compte d'investissement à un moment donné.

    Attributes:
        account: Configuration du compte (type, allocation, etc.)
        balance: Solde actuel du compte
    """

    account: InvestmentAccount
    balance: float


def simulate_monte_carlo(payload: MonteCarloInput, task_id: str | None = None) -> MonteCarloResult:
    """
    Exécute une simulation Monte Carlo pour la phase de capitalisation.

    Effectue plusieurs tirages aléatoires pour estimer la distribution
    du capital à la retraite, en tenant compte de :
    - L'incertitude des rendements financiers
    - Les corrélations entre classes d'actifs
    - Les contributions mensuelles
    - L'inflation

    Args:
        payload: Paramètres de la simulation (profils, comptes, hypothèses de marché)

    Returns:
        Résultat de la simulation avec percentiles et séries mensuelles

    Raises:
        ValueError: Si les paramètres sont invalides
    """
    import logging
    logger = logging.getLogger("uvicorn.error").getChild("monte_carlo.simulation")
    
    primary_adult = payload.adults[0] if payload.adults else None
    current_age = primary_adult.current_age if primary_adult else None
    retirement_age = primary_adult.retirement_age if primary_adult else None
    total_years = (retirement_age - current_age) if (retirement_age and current_age) else 0
    
    logger.info(
        "=== DÉBUT SIMULATION CAPITALISATION === Âge actuel: %.1f ans | Âge retraite: %.1f ans | Durée: %.1f ans",
        current_age or 0,
        retirement_age or 0,
        total_years
    )
    
    # Validation des paramètres d'entrée
    if not payload.adults:
        raise ValueError("Au moins un profil adulte est requis pour la simulation.")

    primary_adult = payload.adults[0]
    if primary_adult.retirement_age <= primary_adult.current_age:
        raise ValueError(
            "L'âge de retraite doit être supérieur à l'âge actuel pour la simulation."
        )

    total_months = int((primary_adult.retirement_age - primary_adult.current_age) * 12)
    if total_months <= 0:
        raise ValueError("L'horizon de simulation doit être d'au moins un mois.")

    # Récupération des paramètres depuis market_assumptions ou valeurs par défaut
    market = payload.market_assumptions
    batch_size = getattr(market, "batch_size", None) or payload.batch_size
    max_iterations = getattr(market, "max_iterations", None) or payload.max_iterations
    confidence_level = getattr(market, "confidence_level", None) or payload.confidence_level
    tolerance_ratio = getattr(market, "tolerance_ratio", None) or payload.tolerance_ratio

    # Log des hypothèses de simulation
    logger.info("=== HYPOTHÈSES DE SIMULATION ===")
    
    # Hypothèses de marché
    logger.info("--- Hypothèses de marché ---")
    if market:
        logger.info("  Inflation: moyenne=%.2f%%/an, volatilité=%.2f%%/an", 
                    market.inflation_mean or 0.0, market.inflation_volatility or 0.0)
        logger.info("  Classes d'actifs:")
        for asset_key, asset_class in market.asset_classes.items():
            logger.info("    - %s: rendement=%.2f%%/an, volatilité=%.2f%%/an",
                       asset_key, asset_class.expected_return, asset_class.volatility)
        if market.correlations:
            logger.info("  Corrélations principales:")
            for asset1, corr_dict in market.correlations.items():
                for asset2, corr_value in corr_dict.items():
                    if asset1 < asset2 and abs(corr_value) > 0.1:  # Afficher seulement les corrélations significatives
                        logger.info("    %s ↔ %s: %.2f", asset1, asset2, corr_value)
    
    # Paramètres Monte Carlo
    logger.info("--- Paramètres Monte Carlo ---")
    logger.info("  Niveau de confiance: %.1f%%", confidence_level * 100)
    logger.info("  Tolérance: %.2f%%", tolerance_ratio * 100)
    logger.info("  Itérations max: %d", max_iterations)
    logger.info("  Taille des lots: %d", batch_size)
    
    # Comptes d'investissement
    logger.info("--- Comptes d'investissement (%d compte(s)) ---", len(payload.investment_accounts))
    total_initial_capital = 0.0
    for idx, account in enumerate(payload.investment_accounts):
        account_type = account.type.value if hasattr(account.type, "value") else str(account.type)
        total_initial_capital += account.current_amount
        contribution_info = ""
        if account.monthly_contribution and account.monthly_contribution > 0:
            contribution_info = f", contribution mensuelle={account.monthly_contribution:.2f} €"
        elif account.monthly_contribution_share and account.monthly_contribution_share > 0:
            contribution_info = f", part de contribution={account.monthly_contribution_share:.1f}%"
        else:
            contribution_info = ", contribution mensuelle=0 €"
        
        allocation_info = ""
        if account.allocation_actions is not None or account.allocation_obligations is not None:
            allocation_info = f", allocation: {account.allocation_actions or 0:.0f}% actions, {account.allocation_obligations or 0:.0f}% obligations"
        
        logger.info("  Compte %d: %s (%s) - Capital actuel=%.2f €%s%s",
                   idx + 1, account.label or account_type, account_type, 
                   account.current_amount, contribution_info, allocation_info)
    logger.info("  Capital initial total: %.2f €", total_initial_capital)
    
    # Phases d'épargne
    if payload.savings_phases:
        logger.info("--- Phases d'épargne (%d phase(s)) ---", len(payload.savings_phases))
        for idx, phase in enumerate(payload.savings_phases):
            logger.info("  Phase %d: %s - De %.1f à %.1f ans, épargne mensuelle=%.2f €",
                       idx + 1, phase.label, phase.from_age, phase.to_age, phase.monthly_contribution)
    else:
        logger.info("--- Phases d'épargne ---")
        logger.info("  Aucune phase d'épargne définie (utilisation des contributions par compte uniquement)")

    # Initialisation des structures de données
    results: List[float] = []  # Capital final de chaque tirage
    monthly_paths: List[List[float]] = []  # Évolution mensuelle de chaque tirage
    contribution_path: List[float] | None = None  # Chemin de référence des contributions
    reference_final_accounts: List[AccountState] | None = None  # Comptes finaux de référence (tirage médian)
    reference_total_contributions: float = 0.0  # Contributions totales de référence
    reference_initial_accounts: List[AccountState] | None = None  # Comptes initiaux de référence

    # Exécution des tirages par lots jusqu'à atteindre la confiance ou la limite
    logger.info("=== DÉBUT DES ITÉRATIONS MONTE CARLO ===")
    logger.info("Exécution de la simulation Monte Carlo (max %d itérations)...", max_iterations)
    iterations = 0
    last_logged_iteration = 0
    while iterations < max_iterations:
        batch = min(batch_size, max_iterations - iterations)
        logger.info("  [CAPITALISATION] Début du lot: %d itérations (total: %d/%d)", batch, iterations, max_iterations)
        for i in range(batch):
            final_capital, monthly_totals, monthly_contributions, final_accounts, initial_accounts, total_contributions = _simulate_single_run(
                payload, total_months, iterations == 0 and i == 0  # Logger seulement pour la première itération
            )
            results.append(final_capital)
            monthly_paths.append(monthly_totals)
            # On conserve le premier chemin de contributions comme référence
            if contribution_path is None:
                contribution_path = monthly_contributions
            # On conserve les comptes finaux et initiaux de référence (première itération)
            if reference_final_accounts is None:
                reference_final_accounts = final_accounts
                reference_initial_accounts = initial_accounts
                reference_total_contributions = total_contributions
            
            # Log toutes les 10 itérations et mettre à jour la progression
            current_iteration = iterations + i + 1
            if current_iteration % 10 == 0 or current_iteration == max_iterations:
                progress_percent = (current_iteration / max_iterations) * 100
                logger.info("  [CAPITALISATION] Progression: %d/%d itérations (%.1f%%)", current_iteration, max_iterations, progress_percent)
                
                # Mettre à jour la progression pour le frontend
                if task_id:
                    # Calculer le pourcentage global : on est dans l'étape "capitalisation" (33.3% de base)
                    # La capitalisation représente environ 17% de l'étape totale (de 33% à 50%)
                    # Donc on va de 33.3% à 50%
                    base_progress = 33.3
                    step_progress = 16.7 * (progress_percent / 100.0)  # 50% - 33.3% = 16.7%
                    global_progress = base_progress + step_progress
                    update_progress(
                        task_id,
                        current_step="capitalisation",
                        step_description=f"Simulation de capitalisation - {current_iteration}/{max_iterations} itérations (%.1f%%)" % progress_percent,
                        progress_percent=global_progress,
                        message=f"[CAPITALISATION] Progression: {current_iteration}/{max_iterations} itérations (%.1f%%)" % progress_percent,
                    )
        
        iterations = len(results)
        
        # On vérifie la confiance seulement après un lot complet
        if iterations < batch_size:
            continue
        confidence_ok, _, _ = check_confidence_reached(results, confidence_level, tolerance_ratio)
        if confidence_ok:
            logger.info("  [CAPITALISATION] Confiance atteinte après %d itérations", iterations)
            break

    # Calcul des statistiques sur les résultats
    sorted_results = sorted(results)
    mean_val = statistics.fmean(sorted_results) if sorted_results else 0.0
    stdev_val = statistics.pstdev(sorted_results) if sorted_results else 0.0

    percentile_sorted = lambda p: compute_percentile_from_sorted(sorted_results, p)

    # Calcul des percentiles mensuels pour l'affichage des trajectoires
    monthly_percentiles = _compute_monthly_percentiles(
        monthly_paths,
        primary_adult.current_age,
        contribution_path,
    )

    # Calcul final de la confiance et de la marge d'erreur
    confidence_ok, error_margin, error_margin_ratio = check_confidence_reached(
        sorted_results, confidence_level, tolerance_ratio
    )
    
    median_capital = percentile_sorted(0.5)
    logger.info(
        "=== FIN SIMULATION CAPITALISATION === Itérations: %d | Confiance atteinte: %s | Capital médian: %.2f €",
        len(sorted_results),
        "Oui" if confidence_ok else "Non",
        median_capital
    )
    
    # Résumé synthétique : Capital initial, contributions, gains, capital final
    if reference_initial_accounts and reference_final_accounts:
        initial_capital = sum(state.balance for state in reference_initial_accounts)
        final_capital_ref = sum(state.balance for state in reference_final_accounts)
        total_gains = final_capital_ref - initial_capital - reference_total_contributions
        
        logger.info("=== RÉSUMÉ SYNTHÉTIQUE ===")
        logger.info("  Capital initial: %.2f €", initial_capital)
        logger.info("  Contributions totales (%d mois × %.2f €/mois): %.2f €", 
                   total_months, reference_total_contributions / total_months if total_months > 0 else 0.0,
                   reference_total_contributions)
        logger.info("  Capital final médian: %.2f €", median_capital)
        logger.info("  Gains de placement (capital final - initial - contributions): %.2f €", total_gains)
        logger.info("  Rendement total: %.2f%%", ((final_capital_ref - initial_capital) / initial_capital * 100) if initial_capital > 0 else 0.0)
        logger.info("  Rendement des placements (gains / (initial + contributions)): %.2f%%", 
                   (total_gains / (initial_capital + reference_total_contributions) * 100) if (initial_capital + reference_total_contributions) > 0 else 0.0)
        
        # Répartition par type de compte avec détail initial/final/gains
        logger.info("=== RÉPARTITION PAR TYPE DE COMPTE ===")
        balances_by_type: dict[str, dict[str, float]] = {}
        initial_by_type: dict[str, float] = {}
        contributions_by_type: dict[str, float] = {}
        count_by_type: dict[str, int] = {}
        
        # Calcul des totaux par type
        for initial_state, final_state in zip(reference_initial_accounts, reference_final_accounts):
            account_type = (
                final_state.account.type.value
                if hasattr(final_state.account.type, "value")
                else str(final_state.account.type)
            )
            if account_type not in balances_by_type:
                balances_by_type[account_type] = {"initial": 0.0, "final": 0.0, "contributions": 0.0}
                initial_by_type[account_type] = 0.0
                contributions_by_type[account_type] = 0.0
                count_by_type[account_type] = 0
            
            monthly_contrib = final_state.account.monthly_contribution or 0.0
            total_contrib = monthly_contrib * total_months
            
            initial_by_type[account_type] += initial_state.balance
            balances_by_type[account_type]["initial"] += initial_state.balance
            balances_by_type[account_type]["final"] += final_state.balance
            balances_by_type[account_type]["contributions"] += total_contrib
            contributions_by_type[account_type] += total_contrib
            count_by_type[account_type] += 1
        
        total_final = sum(bal["final"] for bal in balances_by_type.values())
        for account_type in sorted(balances_by_type.keys()):
            bal = balances_by_type[account_type]
            initial = bal["initial"]
            final = bal["final"]
            contrib = bal["contributions"]
            gains = final - initial - contrib
            count = count_by_type[account_type]
            percentage = (final / total_final * 100) if total_final > 0 else 0.0
            
            logger.info("  %s (%d compte(s), %.1f%% du total):", account_type, count, percentage)
            logger.info("    Initial: %.2f € | Contributions: %.2f € | Gains: %.2f € | Final: %.2f €",
                       initial, contrib, gains, final)

    return MonteCarloResult(
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
    )


def _simulate_single_run(
    payload: MonteCarloInput, total_months: int, log_details: bool = False
) -> tuple[float, List[float], List[float], List[AccountState], List[AccountState], float]:
    """
    Exécute un seul tirage de simulation Monte Carlo.

    Simule l'évolution du capital mois par mois en appliquant :
    - Les contributions mensuelles
    - Les rendements aléatoires corrélés
    - La fiscalité spécifique à chaque compte

    Args:
        payload: Paramètres de la simulation
        total_months: Nombre de mois à simuler

    Returns:
        Tuple contenant :
        - Le capital final
        - La série mensuelle des totaux
        - La série mensuelle des contributions cumulées
        - Les états finaux de tous les comptes
    """
    # Initialisation des comptes avec leur solde actuel
    accounts = [
        AccountState(account=acc, balance=float(acc.current_amount))
        for acc in payload.investment_accounts
    ]
    # Sauvegarde de l'état initial pour le résumé
    initial_accounts = [
        AccountState(account=acc, balance=float(acc.current_amount))
        for acc in payload.investment_accounts
    ]
    market_assumptions = payload.market_assumptions
    asset_classes = market_assumptions.asset_classes if market_assumptions else {}

    monthly_totals: List[float] = []
    monthly_contributions: List[float] = []
    # Le capital initial compte comme contribution cumulée
    cumulative_contribution = sum(state.balance for state in accounts)
    total_contributions_added = 0.0  # Total des contributions ajoutées (sans le capital initial)

    # Simulation mois par mois
    for month_index in range(total_months):
        age = payload.adults[0].current_age + month_index / 12

        # Calcul de la contribution active selon les phases d'épargne
        active_contribution = _active_monthly_contribution(
            payload.savings_phases,
            [state.account for state in accounts],
            age,
        )
        # Répartition de la contribution entre les comptes
        contributions = _distribute_contributions(accounts, active_contribution)
        
        # Log détaillé pour le premier mois (diagnostic) - seulement si demandé
        if month_index == 0 and log_details:
            logger.info("=== DÉTAIL RÉPARTITION CONTRIBUTIONS (mois 1) ===")
            logger.info("  Contribution totale active: %.2f €", active_contribution)
            explicit_sum = sum(state.account.monthly_contribution or 0.0 for state in accounts)
            logger.info("  Somme contributions explicites: %.2f €", explicit_sum)
            phase_total = sum(getattr(phase, "monthly_contribution", 0.0) for phase in payload.savings_phases if phase.from_age <= age < phase.to_age)
            logger.info("  Phase d'épargne active: %.2f €", phase_total)
            for i, (state, contrib) in enumerate(zip(accounts, contributions)):
                account_type = state.account.type.value if hasattr(state.account.type, "value") else str(state.account.type)
                explicit = state.account.monthly_contribution or 0.0
                logger.info("  Compte %d (%s): contribution explicite=%.2f €, reçoit=%.2f €, solde avant=%.2f €",
                           i+1, account_type, explicit, contrib, state.balance)

        # Génération des rendements aléatoires corrélés pour ce mois
        base_returns = sample_monthly_asset_returns(market_assumptions)

        # Application des contributions et des rendements
        month_contribution = 0.0
        for state, contribution in zip(accounts, contributions):
            # Ajout de la contribution
            state.balance += contribution
            month_contribution += contribution

            # Calcul du rendement net (après fiscalité) pour ce compte
            monthly_return = compute_account_return_from_asset_sample(
                state.account, base_returns, asset_classes
            )
            # Application du rendement : capital * (1 + rendement)
            state.balance *= 1 + monthly_return

        # Mise à jour des totaux
        cumulative_contribution += month_contribution
        total_contributions_added += month_contribution
        monthly_totals.append(sum(state.balance for state in accounts))
        monthly_contributions.append(cumulative_contribution)

    final_capital = monthly_totals[-1] if monthly_totals else cumulative_contribution
    return final_capital, monthly_totals, monthly_contributions, accounts, initial_accounts, total_contributions_added


def _compute_monthly_percentiles(
    monthly_paths: List[List[float]],
    start_age: float,
    contributions: List[float] | None,
) -> List[MonteCarloPercentilePoint]:
    """
    Calcule les percentiles mensuels à partir de tous les tirages.

    Pour chaque mois, calcule les percentiles (5%, 10%, 50%, 90%, 95%)
    de la distribution des capitaux sur tous les tirages.

    Args:
        monthly_paths: Liste des trajectoires mensuelles (une par tirage)
        start_age: Âge de départ de la simulation
        contributions: Série des contributions cumulées (pour référence)

    Returns:
        Liste des points de percentiles mensuels
    """
    if not monthly_paths:
        return []

    months = len(monthly_paths[0])
    points: List[MonteCarloPercentilePoint] = []

    for month_idx in range(months):
        # Extraction des valeurs pour ce mois sur tous les tirages
        month_values = [
            path[month_idx] for path in monthly_paths if len(path) > month_idx
        ]
        if not month_values:
            continue

        sorted_month = sorted(month_values)
        contribution_value = (
            contributions[month_idx]
            if contributions and len(contributions) > month_idx
            else 0.0
        )

        point = MonteCarloPercentilePoint(
            month_index=month_idx + 1,
            age=start_age + month_idx / 12,
            percentile_min=compute_percentile_from_sorted(sorted_month, 0.05),
            percentile_10=compute_percentile_from_sorted(sorted_month, 0.1),
            percentile_50=compute_percentile_from_sorted(sorted_month, 0.5),
            percentile_90=compute_percentile_from_sorted(sorted_month, 0.9),
            percentile_max=compute_percentile_from_sorted(sorted_month, 0.95),
            cumulative_contribution=contribution_value,
        )
        points.append(point)

    return points

