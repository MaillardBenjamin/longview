"""
Module de gestion de la fiscalité des produits d'épargne.

Gère le calcul des taxes sur les plus-values, les limites de versement,
et les règles fiscales spécifiques à chaque type de compte.
"""

from dataclasses import dataclass
from typing import Optional

from app.schemas.projections import InvestmentAccount, InvestmentAccountType


# Plafonds de versement par type de compte (en euros)
DEPOSIT_LIMITS = {
    InvestmentAccountType.PEA: 150_000.0,
    InvestmentAccountType.PER: None,  # Pas de plafond, mais déductibilité limitée
    InvestmentAccountType.ASSURANCE_VIE: None,  # Pas de plafond
    InvestmentAccountType.LIVRET: 22_950.0,  # Livret A
    InvestmentAccountType.CRYPTO: None,  # Pas de plafond
    InvestmentAccountType.CTO: None,  # Pas de plafond
    InvestmentAccountType.AUTRE: None,  # Variable selon le produit
}

# Taux de prélèvements sociaux (fixe)
SOCIAL_CONTRIBUTIONS_RATE = 0.172  # 17.2%

# Taux d'imposition forfaitaire (PFU)
FLAT_TAX_RATE = 0.128  # 12.8%

# Abattements assurance-vie (après 8 ans)
ASSURANCE_VIE_ABATTEMENT_SINGLE = 4_600.0  # Personne seule
ASSURANCE_VIE_ABATTEMENT_COUPLE = 9_200.0  # Couple
ASSURANCE_VIE_TAX_RATE_AFTER_8Y = 0.075  # 7.5% après abattement


@dataclass
class AccountTaxState:
    """État fiscal d'un compte pour le suivi du PMP et de l'ancienneté"""
    account: InvestmentAccount
    cost_basis: float  # Coût d'acquisition moyen (PMP) en euros
    total_contributions: float  # Total des versements effectués
    opening_age: float  # Âge d'ouverture du compte
    current_age: float  # Âge actuel dans la simulation


@dataclass
class WithdrawalTaxResult:
    """Résultat du calcul fiscal d'un retrait"""
    gross_withdrawal: float  # Montant brut retiré
    capital_gain: float  # Plus-value réalisée
    income_tax: float  # Impôt sur le revenu
    social_contributions: float  # Prélèvements sociaux
    net_withdrawal: float  # Montant net après taxes
    effective_tax_rate: float  # Taux d'imposition effectif


def get_deposit_limit(account_type: InvestmentAccountType) -> Optional[float]:
    """
    Retourne le plafond de versement pour un type de compte.

    Args:
        account_type: Type de compte

    Returns:
        Plafond en euros, ou None si pas de limite
    """
    return DEPOSIT_LIMITS.get(account_type)


def check_deposit_limit(
    account: InvestmentAccount,
    current_balance: float,
    new_contribution: float,
) -> tuple[bool, float]:
    """
    Vérifie si un versement respecte le plafond du compte.

    Args:
        account: Compte d'investissement
        current_balance: Solde actuel du compte
        new_contribution: Montant du nouveau versement

    Returns:
        Tuple (is_valid, allowed_amount) où:
        - is_valid: True si le versement est autorisé
        - allowed_amount: Montant autorisé (peut être inférieur à new_contribution)
    """
    limit = get_deposit_limit(account.type)
    if limit is None:
        return True, new_contribution

    # Pour les livrets, on vérifie le solde total (versements + intérêts)
    # Le plafond s'applique au solde total, pas seulement aux versements
    total_after = current_balance + new_contribution
    if total_after <= limit:
        return True, new_contribution

    # Le versement dépasse le plafond, on limite au montant autorisé
    allowed = max(0.0, limit - current_balance)
    return allowed > 0, allowed


def calculate_capital_gain(
    withdrawal_amount: float,
    account_state: AccountTaxState,
) -> float:
    """
    Calcule la plus-value réalisée lors d'un retrait.

    Utilise la méthode du Prix Moyen Pondéré (PMP) pour déterminer
    la part de capital et de plus-value dans le retrait.

    Args:
        withdrawal_amount: Montant brut du retrait
        account_state: État fiscal du compte

    Returns:
        Plus-value réalisée en euros
    """
    if account_state.cost_basis <= 0:
        # Si pas de coût d'acquisition, on considère que tout est plus-value
        return withdrawal_amount

    # Calcul du ratio de plus-value dans le solde actuel
    current_value = account_state.account.current_amount
    if current_value <= 0:
        return 0.0

    # Ratio de plus-value = (valeur actuelle - coût d'acquisition) / valeur actuelle
    gain_ratio = max(0.0, (current_value - account_state.cost_basis) / current_value)

    # Plus-value réalisée = retrait * ratio de plus-value
    capital_gain = withdrawal_amount * gain_ratio
    
    return capital_gain


def calculate_pea_tax(
    capital_gain: float,
    account_age_years: float,
    tmi: Optional[float] = None,
) -> tuple[float, float]:
    """
    Calcule les taxes pour un retrait de PEA.

    Règles fiscales PEA:
    - Avant 5 ans: IR 12.8% (PFU) + PS 17.2% = 30% (flat tax)
    - Après 5 ans: IR 0% + PS 17.2% = 17.2% (flat tax)
    - Retrait avant 5 ans = clôture du plan (non géré ici)

    Args:
        capital_gain: Plus-value réalisée
        account_age_years: Ancienneté du compte en années
        tmi: Taux Marginal d'Imposition (non utilisé pour PEA, toujours flat tax)

    Returns:
        Tuple (income_tax, social_contributions)
    """
    if account_age_years < 5.0:
        # Avant 5 ans: PFU 12.8% + PS 17.2%
        income_tax = capital_gain * FLAT_TAX_RATE
    else:
        # Après 5 ans: exonération IR, seulement PS
        income_tax = 0.0

    social_contributions = capital_gain * SOCIAL_CONTRIBUTIONS_RATE
    return income_tax, social_contributions


def calculate_per_tax(
    capital_gain: float,
    withdrawal_amount: float,
    account_state: AccountTaxState,
    tmi: Optional[float] = None,
) -> tuple[float, float]:
    """
    Calcule les taxes pour un retrait de PER.

    Règles fiscales PER (sortie en capital):
    - Les versements déduits sont imposés au barème progressif (TMI)
    - Les gains sont soumis au PFU 12.8% + PS 17.2%

    Note: On simplifie en considérant que les gains sont toujours au PFU.
    Pour une version complète, il faudrait distinguer les versements déduits/non déduits.

    Args:
        capital_gain: Plus-value réalisée
        withdrawal_amount: Montant total du retrait
        account_state: État fiscal du compte
        tmi: Taux Marginal d'Imposition pour les versements déduits

    Returns:
        Tuple (income_tax, social_contributions)
    """
    # Les gains sont toujours au PFU + PS
    income_tax = capital_gain * FLAT_TAX_RATE
    social_contributions = capital_gain * SOCIAL_CONTRIBUTIONS_RATE

    # Note: Pour une version complète, il faudrait aussi imposer la part
    # des versements déduits au barème progressif (TMI)
    # Ici on simplifie en ne taxant que les gains

    return income_tax, social_contributions


def calculate_assurance_vie_tax(
    capital_gain: float,
    account_age_years: float,
    is_couple: bool = False,
    tmi: Optional[float] = None,
) -> tuple[float, float]:
    """
    Calcule les taxes pour un rachat d'assurance-vie.

    Règles fiscales assurance-vie:
    - Avant 8 ans: PFU 12.8% (ou barème progressif sur option) + PS 17.2%
    - Après 8 ans: abattement 4600€ (célibataire) / 9200€ (couple) puis 7.5% + PS 17.2%

    Args:
        capital_gain: Plus-value réalisée
        account_age_years: Ancienneté du contrat en années
        is_couple: True si foyer fiscal de couple
        tmi: Taux Marginal d'Imposition (pour option barème progressif avant 8 ans)

    Returns:
        Tuple (income_tax, social_contributions)
    """
    social_contributions = capital_gain * SOCIAL_CONTRIBUTIONS_RATE

    if account_age_years < 8.0:
        # Avant 8 ans: PFU 12.8% (ou barème progressif sur option)
        # On utilise le PFU par défaut
        income_tax = capital_gain * FLAT_TAX_RATE
    else:
        # Après 8 ans: abattement puis 7.5%
        abattement = ASSURANCE_VIE_ABATTEMENT_COUPLE if is_couple else ASSURANCE_VIE_ABATTEMENT_SINGLE
        taxable_gain = max(0.0, capital_gain - abattement)
        income_tax = taxable_gain * ASSURANCE_VIE_TAX_RATE_AFTER_8Y

    return income_tax, social_contributions


def calculate_livret_tax(
    capital_gain: float,
    account_age_years: float,
) -> tuple[float, float]:
    """
    Calcule les taxes pour un retrait de livret réglementé.

    Les livrets réglementés (Livret A, LDDS, LEP) sont exonérés
    d'impôt sur le revenu et de prélèvements sociaux.

    Args:
        capital_gain: Plus-value (intérêts) réalisés
        account_age_years: Ancienneté (non utilisé)

    Returns:
        Tuple (income_tax, social_contributions) = (0, 0)
    """
    return 0.0, 0.0


def calculate_cto_tax(
    capital_gain: float,
    account_age_years: float,
    tmi: Optional[float] = None,
) -> tuple[float, float]:
    """
    Calcule les taxes pour un retrait de CTO.

    Règles fiscales CTO:
    - PFU 12.8% + PS 17.2% = 30% (flat tax)
    - Ou barème progressif sur option (non géré ici)

    Args:
        capital_gain: Plus-value réalisée
        account_age_years: Ancienneté (non utilisé)
        tmi: Taux Marginal d'Imposition (non utilisé, toujours flat tax)

    Returns:
        Tuple (income_tax, social_contributions)
    """
    income_tax = capital_gain * FLAT_TAX_RATE
    social_contributions = capital_gain * SOCIAL_CONTRIBUTIONS_RATE
    return income_tax, social_contributions


def calculate_crypto_tax(
    capital_gain: float,
    account_age_years: float,
) -> tuple[float, float]:
    """
    Calcule les taxes pour un retrait de crypto.

    Règles fiscales crypto:
    - PFU 12.8% + PS 17.2% = 30% (flat tax)
    - Ou barème progressif sur option (non géré ici)

    Args:
        capital_gain: Plus-value réalisée
        account_age_years: Ancienneté (non utilisé)

    Returns:
        Tuple (income_tax, social_contributions)
    """
    income_tax = capital_gain * FLAT_TAX_RATE
    social_contributions = capital_gain * SOCIAL_CONTRIBUTIONS_RATE
    return income_tax, social_contributions


def calculate_withdrawal_tax(
    withdrawal_amount: float,
    account_state: AccountTaxState,
    current_age: float,
    tmi: Optional[float] = None,
    is_couple: bool = False,
) -> WithdrawalTaxResult:
    """
    Calcule les taxes sur un retrait selon le type de compte.
    
    Args:
        withdrawal_amount: Montant brut du retrait
        account_state: État fiscal du compte
        current_age: Âge actuel dans la simulation
        tmi: Taux Marginal d'Imposition
        is_couple: True si foyer fiscal de couple
    
    Returns:
        Résultat du calcul fiscal
    """
    # Calcul de l'ancienneté du compte
    account_age_years = current_age - account_state.opening_age

    # Calcul de la plus-value réalisée
    capital_gain = calculate_capital_gain(withdrawal_amount, account_state)

    # Calcul des taxes selon le type de compte
    account_type = account_state.account.type

    if account_type == InvestmentAccountType.PEA:
        income_tax, social_contributions = calculate_pea_tax(
            capital_gain, account_age_years, tmi
        )
    elif account_type == InvestmentAccountType.PER:
        income_tax, social_contributions = calculate_per_tax(
            capital_gain, withdrawal_amount, account_state, tmi
        )
    elif account_type == InvestmentAccountType.ASSURANCE_VIE:
        income_tax, social_contributions = calculate_assurance_vie_tax(
            capital_gain, account_age_years, is_couple, tmi
        )
    elif account_type == InvestmentAccountType.LIVRET:
        income_tax, social_contributions = calculate_livret_tax(
            capital_gain, account_age_years
        )
    elif account_type == InvestmentAccountType.CTO:
        income_tax, social_contributions = calculate_cto_tax(
            capital_gain, account_age_years, tmi
        )
    elif account_type == InvestmentAccountType.CRYPTO:
        income_tax, social_contributions = calculate_crypto_tax(
            capital_gain, account_age_years
        )
    else:
        # Autre: pas de fiscalité spécifique, on applique le flat tax par défaut
        income_tax = capital_gain * FLAT_TAX_RATE
        social_contributions = capital_gain * SOCIAL_CONTRIBUTIONS_RATE

    total_tax = income_tax + social_contributions
    net_withdrawal = withdrawal_amount - total_tax

    # Taux d'imposition effectif
    effective_tax_rate = total_tax / withdrawal_amount if withdrawal_amount > 0 else 0.0

    return WithdrawalTaxResult(
        gross_withdrawal=withdrawal_amount,
        capital_gain=capital_gain,
        income_tax=income_tax,
        social_contributions=social_contributions,
        net_withdrawal=net_withdrawal,
        effective_tax_rate=effective_tax_rate,
    )


def update_cost_basis_after_contribution(
    account_state: AccountTaxState,
    contribution: float,
) -> AccountTaxState:
    """
    Met à jour le coût d'acquisition moyen (PMP) après un versement.

    Le PMP est calculé comme:
    PMP_nouveau = (PMP_ancien * solde_ancien + versement) / (solde_ancien + versement)

    Args:
        account_state: État fiscal actuel du compte
        contribution: Montant du nouveau versement

    Returns:
        Nouvel état fiscal avec PMP mis à jour
    """
    old_balance = account_state.account.current_amount
    old_cost_basis = account_state.cost_basis
    old_contributions = account_state.total_contributions

    new_balance = old_balance + contribution
    new_contributions = old_contributions + contribution

    if new_balance > 0:
        # Calcul du nouveau PMP
        new_cost_basis = (old_cost_basis * old_balance + contribution) / new_balance
    else:
        new_cost_basis = 0.0

    # Création d'un nouveau compte avec le solde mis à jour
    account_dict = account_state.account.model_dump()
    account_dict["current_amount"] = new_balance
    updated_account = InvestmentAccount(**account_dict)

    return AccountTaxState(
        account=updated_account,
        cost_basis=new_cost_basis,
        total_contributions=new_contributions,
        opening_age=account_state.opening_age,
        current_age=account_state.current_age,
    )


def update_cost_basis_after_withdrawal(
    account_state: AccountTaxState,
    withdrawal_amount: float,
) -> AccountTaxState:
    """
    Met à jour le coût d'acquisition moyen (PMP) après un retrait.

    Le PMP reste inchangé lors d'un retrait (méthode FIFO/PMP).
    Seul le solde diminue.

    Args:
        account_state: État fiscal actuel du compte
        withdrawal_amount: Montant du retrait

    Returns:
        Nouvel état fiscal avec solde mis à jour
    """
    old_balance = account_state.account.current_amount
    new_balance = max(0.0, old_balance - withdrawal_amount)

    # Le PMP reste inchangé
    new_cost_basis = account_state.cost_basis

    # Si le solde devient nul, le PMP aussi
    if new_balance == 0:
        new_cost_basis = 0.0

    # Création d'un nouveau compte avec le solde mis à jour
    account_dict = account_state.account.model_dump()
    account_dict["current_amount"] = new_balance
    updated_account = InvestmentAccount(**account_dict)

    return AccountTaxState(
        account=updated_account,
        cost_basis=new_cost_basis,
        total_contributions=account_state.total_contributions,
        opening_age=account_state.opening_age,
        current_age=account_state.current_age,
    )


def initialize_account_tax_state(
    account: InvestmentAccount,
    current_age: float,
) -> AccountTaxState:
    """
    Initialise l'état fiscal d'un compte.

    Args:
        account: Compte d'investissement
        current_age: Âge actuel dans la simulation

    Returns:
        État fiscal initialisé
    """
    # Si une date d'ouverture est fournie, on l'utilise
    # Sinon, on considère que le compte est ouvert à l'âge actuel
    opening_age = account.opening_date_age if account.opening_date_age is not None else current_age

    # Si un coût d'acquisition initial est fourni, on l'utilise
    # Sinon, on estime qu'il y a eu des gains (70% du solde = PMP estimé)
    # Cela permet d'avoir des taxes même si l'utilisateur n'a pas fourni le PMP
    if account.initial_cost_basis is not None and account.initial_cost_basis > 0:
        cost_basis = account.initial_cost_basis
    else:
        # Estimation : 70% du capital = PMP (30% de plus-value estimée)
        # Cette estimation permet d'avoir des taxes réalistes
        cost_basis = account.current_amount * 0.7 if account.current_amount > 0 else 0.0

    return AccountTaxState(
        account=account,
        cost_basis=cost_basis,
        total_contributions=account.current_amount,  # On considère que le solde initial = versements initiaux
        opening_age=opening_age,
        current_age=current_age,
    )

