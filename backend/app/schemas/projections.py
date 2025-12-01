from __future__ import annotations

from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, Field, NonNegativeFloat, PositiveFloat


class InvestmentAccountType(str, Enum):
    PEA = "pea"
    PER = "per"
    ASSURANCE_VIE = "assurance_vie"
    LIVRET = "livret"
    CRYPTO = "crypto"
    CTO = "cto"
    AUTRE = "autre"


class MarketAssetAssumption(BaseModel):
    expected_return: float = Field(..., description="Annual expected return in percent")
    volatility: Optional[float] = Field(default=None, description="Annual volatility in percent")


class MarketAssumptions(BaseModel):
    inflation_mean: Optional[float] = None
    inflation_volatility: Optional[float] = None
    asset_classes: Dict[str, MarketAssetAssumption]
    correlations: Dict[str, Dict[str, float]] = Field(default_factory=dict)
    # Paramètres de simulation Monte Carlo
    confidence_level: float = Field(default=0.9, ge=0.5, le=0.999, description="Niveau de confiance statistique (ex: 0.9 pour 90%)")
    tolerance_ratio: float = Field(default=0.01, ge=0.001, le=0.5, description="Ratio de tolérance pour la marge d'erreur (ex: 0.01 pour 1%)")
    max_iterations: int = Field(default=100, ge=100, description="Nombre maximum d'itérations de simulation")
    batch_size: int = Field(default=500, ge=50, description="Taille des lots de tirages pour vérifier la confiance")


class AdultProfile(BaseModel):
    first_name: str
    current_age: PositiveFloat
    retirement_age: PositiveFloat
    life_expectancy: Optional[PositiveFloat] = None


class SavingsPhase(BaseModel):
    label: str
    from_age: PositiveFloat
    to_age: PositiveFloat
    monthly_contribution: NonNegativeFloat


class SpendingPhase(BaseModel):
    label: str
    from_age: PositiveFloat
    to_age: PositiveFloat
    spending_ratio: NonNegativeFloat


class LivretBreakdown(BaseModel):
    id: Optional[str] = None
    label: str
    percentage: NonNegativeFloat


class AdditionalIncome(BaseModel):
    label: str
    monthly_amount: NonNegativeFloat
    start_age: Optional[PositiveFloat] = None


class ChargeCategory(str, Enum):
    HOUSING_LOAN = "housing_loan"
    CONSUMER_LOAN = "consumer_loan"
    PENSION = "pension"
    OTHER = "other"


class HouseholdCharge(BaseModel):
    id: str
    label: str
    category: ChargeCategory
    monthly_amount: NonNegativeFloat
    until_age: Optional[PositiveFloat] = None


class ChildCharge(BaseModel):
    child_name: str
    monthly_amount: NonNegativeFloat
    until_age: Optional[PositiveFloat] = None


class InvestmentAccount(BaseModel):
    id: Optional[str] = None
    type: InvestmentAccountType
    label: Optional[str] = None
    current_amount: NonNegativeFloat
    monthly_contribution: Optional[NonNegativeFloat] = None
    monthly_contribution_share: Optional[NonNegativeFloat] = None
    allocation_actions: Optional[NonNegativeFloat] = None
    allocation_obligations: Optional[NonNegativeFloat] = None
    livret_breakdown: Optional[List[LivretBreakdown]] = None
    expected_performance: Optional[float] = None
    # Paramètres fiscaux
    opening_date_age: Optional[PositiveFloat] = Field(
        default=None,
        description="Âge auquel le compte a été ouvert (pour calculer l'ancienneté)"
    )
    initial_cost_basis: Optional[NonNegativeFloat] = Field(
        default=None,
        description="Coût d'acquisition initial (PMP) du compte en euros"
    )


class TaxParameters(BaseModel):
    """Paramètres fiscaux pour les phases de versement et de retraite"""
    tmi_savings_phase: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=0.45,
        description="Taux Marginal d'Imposition (TMI) pendant la phase d'épargne (0.0 à 0.45)"
    )
    tmi_retirement_phase: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=0.45,
        description="Taux Marginal d'Imposition (TMI) pendant la phase de retraite (0.0 à 0.45)"
    )
    is_couple: bool = Field(
        default=False,
        description="Indique si le foyer fiscal est un couple (pour abattements assurance-vie)"
    )


class CapitalizationInput(BaseModel):
    adults: List[AdultProfile]
    savings_phases: List[SavingsPhase] = Field(default_factory=list)
    investment_accounts: List[InvestmentAccount]
    market_assumptions: MarketAssumptions
    tax_parameters: Optional[TaxParameters] = Field(
        default=None,
        description="Paramètres fiscaux pour la phase de capitalisation"
    )


class CapitalizationPoint(BaseModel):
    month_index: int
    age: float
    contributions: float
    gains: float
    total_capital: float


class CapitalizationResult(BaseModel):
    start_capital: float
    end_capital: float
    total_contributions: float
    total_gains: float
    monthly_series: List[CapitalizationPoint]


class MonteCarloInput(CapitalizationInput):
    confidence_level: float = Field(default=0.9, ge=0.5, le=0.999)
    tolerance_ratio: float = Field(default=0.05, ge=0.001, le=0.5)
    max_iterations: int = Field(default=20000, ge=10)  # Minimum réduit à 10 pour l'optimisation rapide
    batch_size: int = Field(default=500, ge=10)  # Minimum réduit à 10 pour l'optimisation rapide


class MonteCarloPercentilePoint(BaseModel):
    month_index: int
    age: float
    percentile_min: float
    percentile_10: float
    percentile_50: float
    percentile_90: float
    percentile_max: float
    cumulative_contribution: float


class MonteCarloResult(BaseModel):
    iterations: int
    confidence_level: float
    tolerance_ratio: float
    confidence_reached: bool
    error_margin: float = Field(default=0.0, description="Marge d'erreur absolue (en euros)")
    error_margin_ratio: float = Field(default=0.0, description="Ratio de marge d'erreur (en pourcentage de la moyenne)")
    mean_final_capital: float
    median_final_capital: float
    percentile_10: float
    percentile_50: float
    percentile_90: float
    percentile_min: float
    percentile_max: float
    standard_deviation: float
    monthly_percentiles: List[MonteCarloPercentilePoint] = Field(default_factory=list)


class TaxBreakdownByAccountType(BaseModel):
    """Répartition des taxes par type de compte"""
    account_type: str
    gross_withdrawal: float = 0.0
    capital_gain: float = 0.0
    income_tax: float = 0.0
    social_contributions: float = 0.0
    net_withdrawal: float = 0.0


class RetirementMonteCarloPoint(BaseModel):
    month_index: int
    age: float
    monthly_withdrawal: float
    cumulative_withdrawal: float
    percentile_10: float
    percentile_50: float
    percentile_90: float
    percentile_min: float
    percentile_max: float
    # Taxes par type de compte (pour le mois de référence)
    taxes_by_account_type: List[TaxBreakdownByAccountType] = Field(default_factory=list)
    total_income_tax: float = 0.0
    total_social_contributions: float = 0.0
    total_taxes: float = 0.0


class RetirementMonteCarloInput(BaseModel):
    adults: List[AdultProfile]
    investment_accounts: List[InvestmentAccount]
    market_assumptions: MarketAssumptions
    spending_profile: List[SpendingPhase]
    target_monthly_income: NonNegativeFloat
    state_pension_monthly_income: NonNegativeFloat
    additional_income_streams: Optional[List[AdditionalIncome]] = None
    household_charges: Optional[List[HouseholdCharge]] = Field(
        default_factory=list,
        description="Charges du foyer qui peuvent continuer pendant la retraite"
    )
    child_charges: Optional[List[ChildCharge]] = Field(
        default_factory=list,
        description="Charges liées aux enfants qui peuvent continuer pendant la retraite"
    )
    tax_parameters: Optional[TaxParameters] = Field(
        default=None,
        description="Paramètres fiscaux pour la phase de retraite"
    )
    confidence_level: float = Field(default=0.9, ge=0.5, le=0.999)
    tolerance_ratio: float = Field(default=0.05, ge=0.001, le=0.5)
    max_iterations: int = Field(default=20000, ge=100)
    batch_size: int = Field(default=500, ge=50)


class RetirementMonteCarloResult(BaseModel):
    iterations: int
    confidence_level: float
    tolerance_ratio: float
    confidence_reached: bool
    error_margin: float = Field(default=0.0, description="Marge d'erreur absolue (en euros)")
    error_margin_ratio: float = Field(default=0.0, description="Ratio de marge d'erreur (en pourcentage de la moyenne)")
    mean_final_capital: float
    median_final_capital: float
    percentile_10: float
    percentile_50: float
    percentile_90: float
    percentile_min: float
    percentile_max: float
    standard_deviation: float
    monthly_percentiles: List[RetirementMonteCarloPoint] = Field(default_factory=list)
    # Totaux des taxes sur toute la période de retraite
    total_taxes_by_account_type: Dict[str, TaxBreakdownByAccountType] = Field(default_factory=dict)
    cumulative_total_income_tax: float = 0.0
    cumulative_total_social_contributions: float = 0.0
    cumulative_total_taxes: float = 0.0


class RetirementScenarioResults(BaseModel):
    pessimistic: RetirementMonteCarloResult
    median: RetirementMonteCarloResult
    optimistic: RetirementMonteCarloResult


class OptimizationStep(BaseModel):
    iteration: int
    scale: float
    monthly_savings: float
    final_capital: float
    effective_final_capital: float
    depletion_months: int


class SavingsOptimizationInput(BaseModel):
    adults: List[AdultProfile]
    savings_phases: List[SavingsPhase]
    investment_accounts: List[InvestmentAccount]
    market_assumptions: MarketAssumptions
    spending_profile: List[SpendingPhase]
    target_monthly_income: NonNegativeFloat
    state_pension_monthly_income: NonNegativeFloat
    additional_income_streams: Optional[List[AdditionalIncome]] = None
    household_charges: Optional[List[HouseholdCharge]] = Field(
        default_factory=list,
        description="Charges du foyer qui peuvent continuer pendant la retraite"
    )
    child_charges: Optional[List[ChildCharge]] = Field(
        default_factory=list,
        description="Charges liées aux enfants qui peuvent continuer pendant la retraite"
    )
    tax_parameters: Optional[TaxParameters] = Field(
        default=None,
        description="Paramètres fiscaux pour les phases d'épargne et de retraite"
    )
    confidence_level: float = Field(default=0.9, ge=0.5, le=0.999)
    tolerance_ratio: float = Field(default=0.01, ge=0.0001, le=0.5)
    max_iterations: int = Field(default=20, ge=3, le=200)
    batch_size: int = Field(default=500, ge=50)
    target_final_capital: float = Field(default=0.0)
    capitalization_only: bool = Field(
        default=False,
        description="Si True, simule uniquement la phase de capitalisation sans la phase de retraite"
    )
    calculate_minimum_savings: bool = Field(
        default=True,
        description="Si True, calcule l'épargne minimum nécessaire via l'algorithme d'optimisation. Si False, utilise uniquement les versements réels."
    )


class RecommendedSavingsResult(BaseModel):
    scale: float
    recommended_monthly_savings: float
    minimum_capital_at_retirement: float  # Capital minimum nécessaire à la retraite
    monte_carlo_result: MonteCarloResult  # Courbes avec versements réels
    retirement_results: Optional[RetirementScenarioResults] = Field(
        default=None,
        description="Courbes avec versements réels (None si capitalization_only=True)"
    )
    optimal_monte_carlo_result: Optional[MonteCarloResult] = Field(
        default=None,
        description="Courbes avec épargne optimale (capitalisation)"
    )
    optimal_retirement_results: Optional[RetirementScenarioResults] = Field(
        default=None,
        description="Courbes avec épargne optimale (retraite)"
    )
    steps: List[OptimizationStep] = Field(default_factory=list)
    residual_error: float
    residual_error_ratio: float
