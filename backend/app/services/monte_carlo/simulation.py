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


def simulate_monte_carlo(payload: MonteCarloInput) -> MonteCarloResult:
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

    # Initialisation des structures de données
    results: List[float] = []  # Capital final de chaque tirage
    monthly_paths: List[List[float]] = []  # Évolution mensuelle de chaque tirage
    contribution_path: List[float] | None = None  # Chemin de référence des contributions

    # Récupération des paramètres depuis market_assumptions ou valeurs par défaut
    market = payload.market_assumptions
    batch_size = getattr(market, "batch_size", None) or payload.batch_size
    max_iterations = getattr(market, "max_iterations", None) or payload.max_iterations
    confidence_level = getattr(market, "confidence_level", None) or payload.confidence_level
    tolerance_ratio = getattr(market, "tolerance_ratio", None) or payload.tolerance_ratio

    # Exécution des tirages par lots jusqu'à atteindre la confiance ou la limite
    iterations = 0
    while iterations < max_iterations:
        batch = min(batch_size, max_iterations - iterations)
        for _ in range(batch):
            final_capital, monthly_totals, monthly_contributions = _simulate_single_run(
                payload, total_months
            )
            results.append(final_capital)
            monthly_paths.append(monthly_totals)
            # On conserve le premier chemin de contributions comme référence
            if contribution_path is None:
                contribution_path = monthly_contributions
        iterations = len(results)
        # On vérifie la confiance seulement après un lot complet
        if iterations < batch_size:
            continue
        confidence_ok, _, _ = check_confidence_reached(results, confidence_level, tolerance_ratio)
        if confidence_ok:
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
    payload: MonteCarloInput, total_months: int
) -> tuple[float, List[float], List[float]]:
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
    """
    # Initialisation des comptes avec leur solde actuel
    accounts = [
        AccountState(account=acc, balance=float(acc.current_amount))
        for acc in payload.investment_accounts
    ]
    market_assumptions = payload.market_assumptions
    asset_classes = market_assumptions.asset_classes if market_assumptions else {}

    monthly_totals: List[float] = []
    monthly_contributions: List[float] = []
    # Le capital initial compte comme contribution cumulée
    cumulative_contribution = sum(state.balance for state in accounts)

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
        monthly_totals.append(sum(state.balance for state in accounts))
        monthly_contributions.append(cumulative_contribution)

    final_capital = monthly_totals[-1] if monthly_totals else cumulative_contribution
    return final_capital, monthly_totals, monthly_contributions


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

