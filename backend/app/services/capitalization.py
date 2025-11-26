"""
Module de simulation déterministe de capitalisation.

Fournit une simulation déterministe (sans aléa) de l'accumulation de capital
jusqu'à la retraite, utilisée pour les prévisualisations rapides.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, List

from app.schemas.projections import (
    CapitalizationInput,
    CapitalizationPoint,
    CapitalizationResult,
    InvestmentAccount,
)

# Rendements annuels par défaut (en pourcentage) pour chaque classe d'actif
DEFAULT_ASSET_RETURNS = {
    "equities": 7.0,  # Actions : rendement historique moyen
    "bonds": 3.0,  # Obligations : rendement modéré
    "livrets": 1.5,  # Livrets réglementés : rendement faible mais sûr
    "crypto": 15.0,  # Cryptomonnaies : rendement élevé mais très volatile
    "other": 4.5,  # Autres supports : rendement moyen
}


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


def simulate_capitalization_phase(payload: CapitalizationInput) -> CapitalizationResult:
    """
    Simule la phase de capitalisation de manière déterministe.

    Calcule l'évolution du capital mois par mois en appliquant :
    - Les contributions mensuelles selon les phases d'épargne
    - Les rendements attendus (sans aléa) selon le type de compte
    - La fiscalité spécifique à chaque compte

    Args:
        payload: Paramètres de la simulation (profils, comptes, hypothèses de marché)

    Returns:
        Résultat de la simulation avec séries mensuelles

    Raises:
        ValueError: Si les paramètres sont invalides
    """
    if not payload.adults:
        raise ValueError("Au moins un profil adulte est requis pour la simulation.")

    primary_adult = payload.adults[0]
    if primary_adult.retirement_age <= primary_adult.current_age:
        raise ValueError(
            "L'âge de retraite doit être supérieur à l'âge actuel pour la simulation."
        )

    total_months = int((primary_adult.retirement_age - primary_adult.current_age) * 12)
    accounts: List[AccountState] = [
        AccountState(account=account, balance=float(account.current_amount))
        for account in payload.investment_accounts
    ]

    start_capital = sum(acc.balance for acc in accounts)
    total_contributions = 0.0
    total_gains = 0.0
    monthly_series: List[CapitalizationPoint] = []

    for month_index in range(total_months):
        age = primary_adult.current_age + month_index / 12
        active_contribution = _active_monthly_contribution(
            payload.savings_phases,
            [state.account for state in accounts],
            age,
        )
        contributions = _distribute_contributions(accounts, active_contribution)

        month_contrib = 0.0
        month_gain = 0.0

        for state, contribution in zip(accounts, contributions):
            state.balance += contribution
            month_contrib += contribution

            monthly_return = _account_monthly_return(state.account, payload.market_assumptions.asset_classes)
            gain = state.balance * monthly_return
            state.balance += gain
            month_gain += gain

        total_contributions += month_contrib
        total_gains += month_gain

        monthly_series.append(
            CapitalizationPoint(
                month_index=month_index + 1,
                age=age,
                contributions=month_contrib,
                gains=month_gain,
                total_capital=sum(acc.balance for acc in accounts),
            )
        )

    end_capital = sum(acc.balance for acc in accounts)

    return CapitalizationResult(
        start_capital=start_capital,
        end_capital=end_capital,
        total_contributions=total_contributions,
        total_gains=total_gains,
        monthly_series=monthly_series,
    )


def _active_monthly_contribution(
    phases: Iterable,
    accounts: Iterable[InvestmentAccount],
    age: float,
) -> float:
    """
    Calcule la contribution mensuelle active pour un âge donné.

    Priorité :
    1. Contributions explicites des comptes (si présentes)
    2. Contributions des phases d'épargne actives

    Args:
        phases: Phases d'épargne définies
        accounts: Comptes d'investissement
        age: Âge pour lequel calculer la contribution

    Returns:
        Contribution mensuelle totale active
    """
    phases_list = list(phases)
    phase_total = 0.0
    has_active_phase = False
    for phase in phases_list:
        if phase.from_age <= age < phase.to_age:
            phase_total += getattr(phase, "monthly_contribution", 0.0)
            has_active_phase = True

    explicit_total = sum(
        max(getattr(account, "monthly_contribution", 0.0) or 0.0, 0.0)
        for account in accounts
    )

    # Utiliser UNIQUEMENT les contributions explicites
    # Si toutes les cotisations sont à 0, considérer la contribution totale à 0
    # Ne JAMAIS utiliser la phase d'épargne
    return explicit_total


def _distribute_contributions(
    accounts: List[AccountState], total_contribution: float
) -> List[float]:
    """
    Répartit une contribution totale entre les comptes.

    Priorité de répartition :
    1. Montants explicites des comptes (mis à l'échelle si nécessaire)
    2. Parts de contribution (en pourcentage)
    3. Répartition égale

    Vérifie également les limites de versement pour chaque compte.

    Args:
        accounts: Liste des comptes avec leur état
        total_contribution: Contribution totale à répartir

    Returns:
        Liste des contributions par compte (limitées par les plafonds)
    """
    from app.services.taxation import check_deposit_limit

    if not accounts:
        return []

    if total_contribution <= 0:
        return [0.0 for _ in accounts]

    # Priorité 1 : montants explicites
    explicit_amounts = [
        max(state.account.monthly_contribution or 0.0, 0.0) for state in accounts
    ]
    explicit_total = sum(explicit_amounts)

    if explicit_total > 0:
        # IMPORTANT: On utilise UNIQUEMENT explicit_total, jamais plus
        # Si total_contribution > explicit_total, on ignore le surplus
        # (cela garantit qu'on n'utilise que les contributions explicites)
        actual_total = min(total_contribution, explicit_total)
        
        # Mise à l'échelle pour correspondre à actual_total (jamais plus que explicit_total)
        scale = actual_total / explicit_total if explicit_total > 0 else 0.0
        proposed = [amount * scale for amount in explicit_amounts]
        
        # Log de diagnostic (premier appel seulement, via un flag module)
        import logging
        logger = logging.getLogger(__name__)
        if not hasattr(_distribute_contributions, '_logged'):
            logger.info("=== DISTRIBUTION CONTRIBUTIONS ===")
            logger.info("  total_contribution=%.2f €, explicit_total=%.2f €, scale=%.4f", 
                       total_contribution, explicit_total, scale)
            for i, (state, prop) in enumerate(zip(accounts, proposed)):
                explicit = state.account.monthly_contribution or 0.0
                account_type = state.account.type.value if hasattr(state.account.type, "value") else str(state.account.type)
                logger.info("  Compte %d (%s): explicit=%.2f €, proposed=%.2f €", 
                           i+1, account_type, explicit, prop)
            _distribute_contributions._logged = True
    else:
        # Priorité 2 : parts de contribution
        share_sum = sum(
            (state.account.monthly_contribution_share or 0.0) for state in accounts
        )
        if share_sum > 0:
            proposed = [
                total_contribution
                * ((state.account.monthly_contribution_share or 0.0) / share_sum)
                for state in accounts
            ]
        else:
            # Priorité 3 : répartition égale uniquement entre les comptes éligibles
            # On arrive ici uniquement s'il n'y a PAS de contributions explicites
            # Un compte est éligible s'il n'est pas au plafond
            # Note: on ne vérifie PAS explicit_contribution == 0 car on est déjà dans le cas
            # où il n'y a pas de contributions explicites (donc tous sont à 0)
            eligible_indices = []
            for i, state in enumerate(accounts):
                # Vérifier si le compte peut recevoir une contribution (pas au plafond)
                is_valid, _ = check_deposit_limit(state.account, state.balance, 1.0)
                if is_valid:
                    eligible_indices.append(i)
            
            if eligible_indices:
                equal = total_contribution / len(eligible_indices)
                proposed = [
                    equal if i in eligible_indices else 0.0
                    for i in range(len(accounts))
                ]
            else:
                # Aucun compte éligible, pas de répartition
                proposed = [0.0 for _ in accounts]

    # Vérification des limites de versement et ajustement si nécessaire
    final_contributions = []
    remaining = total_contribution

    for i, (state, proposed_amount) in enumerate(zip(accounts, proposed)):
        explicit_contribution = state.account.monthly_contribution or 0.0
        
        # Si le compte a une contribution explicite de 0, ne rien verser
        # (même s'il y a un surplus de phase d'épargne)
        if explicit_contribution == 0.0:
            final_contributions.append(0.0)
            continue

        if proposed_amount <= 0:
            final_contributions.append(0.0)
            continue

        # Vérification de la limite de versement
        is_valid, allowed_amount = check_deposit_limit(
            state.account, state.balance, proposed_amount
        )

        if is_valid:
            # Le versement est autorisé, on prend le montant proposé ou autorisé
            actual = min(proposed_amount, allowed_amount)
            final_contributions.append(actual)
            remaining -= actual
        else:
            # Le compte est au plafond, pas de versement
            final_contributions.append(0.0)

    # Si des versements ont été limités, on peut redistribuer le reste
    # (optionnel, pour l'instant on laisse tel quel)

    return final_contributions


def _account_monthly_return(
    account: InvestmentAccount,
    asset_classes: dict,
) -> float:
    """
    Calcule le rendement mensuel net (après fiscalité) d'un compte.

    Args:
        account: Compte d'investissement
        asset_classes: Hypothèses de rendement par classe d'actif

    Returns:
        Rendement mensuel net (décimal, ex: 0.005 pour 0.5%)
    """
    tax_rate = _account_tax_rate(account)
    gross_return = _account_gross_monthly_return(account, asset_classes)
    net_return = gross_return * (1 - tax_rate)
    return net_return


def _account_gross_monthly_return(account: InvestmentAccount, asset_classes: dict) -> float:
    """
    Calcule le rendement mensuel brut (avant fiscalité) d'un compte.

    Le rendement dépend du type de compte et de son allocation :
    - PEA/CTO : 100% actions
    - PER/Assurance-vie : mix actions/obligations selon l'allocation
    - Livret : rendement fixe
    - Crypto/Autre : rendement personnalisé ou par défaut

    Args:
        account: Compte d'investissement
        asset_classes: Hypothèses de rendement par classe d'actif

    Returns:
        Rendement mensuel brut (décimal)
    """
    if account.type in {"pea", "cto"}:
        annual = _asset_expected_return(asset_classes, "equities")
        return annual / 12

    if account.type == "per" or account.type == "assurance_vie":
        actions = (account.allocation_actions or 0.0) / 100
        obligations = (account.allocation_obligations or 0.0) / 100
        remaining = max(0.0, 1.0 - actions - obligations)
        annual_equities = _asset_expected_return(asset_classes, "equities")
        annual_bonds = _asset_expected_return(asset_classes, "bonds")
        annual_other = _asset_expected_return(asset_classes, "other")
        annual = actions * annual_equities + obligations * annual_bonds + remaining * annual_other
        return annual / 12

    if account.type == "livret":
        annual = _asset_expected_return(asset_classes, "livrets")
        return annual / 12

    if account.type == "crypto":
        if account.expected_performance is not None:
            annual = account.expected_performance / 100
        else:
            annual = _asset_expected_return(asset_classes, "crypto")
        return annual / 12

    if account.expected_performance is not None:
        annual = account.expected_performance / 100
    else:
        annual = _asset_expected_return(asset_classes, "other")
    return annual / 12


def _account_tax_rate(account: InvestmentAccount) -> float:
    """
    Retourne le taux de fiscalité applicable à un compte.

    Taux de fiscalité selon le type de compte :
    - PEA/PER : 17.2% (flat tax)
    - Crypto/CTO : 30% (flat tax)
    - Livrets : 0% (exonérés d'impôt et de prélèvements sociaux)
    - Assurance-vie : 0% (fiscalité différée, calculée lors des retraits)
    - Autres : 0% (fiscalité différée ou exonérée)

    Note: Cette fonction retourne le taux de fiscalité immédiate.
    Pour l'assurance-vie et les livrets, la fiscalité est calculée différemment
    lors des retraits (voir taxation.py).

    Args:
        account: Compte d'investissement

    Returns:
        Taux de fiscalité (décimal, ex: 0.172 pour 17.2%)
    """
    if account.type in {"pea", "per"}:
        return 0.172  # Flat tax 17.2%
    if account.type in {"crypto", "cto"}:
        return 0.30  # Flat tax 30%
    # Livrets : exonérés (0% d'impôt, 0% de PS)
    # Assurance-vie : fiscalité différée (calculée lors des retraits selon ancienneté)
    return 0.0


def _asset_expected_return(asset_classes: dict, key: str) -> float:
    """
    Retourne le rendement attendu annuel pour une classe d'actif.

    Utilise la valeur personnalisée si fournie, sinon la valeur par défaut.

    Args:
        asset_classes: Dictionnaire des hypothèses de marché
        key: Clé de la classe d'actif

    Returns:
        Rendement annuel attendu (décimal, ex: 0.07 pour 7%)
    """
    assumption = asset_classes.get(key)
    if assumption:
        return assumption.expected_return / 100
    return DEFAULT_ASSET_RETURNS[key] / 100

