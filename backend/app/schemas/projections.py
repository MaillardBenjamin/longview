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


class CapitalizationInput(BaseModel):
    adults: List[AdultProfile]
    savings_phases: List[SavingsPhase] = Field(default_factory=list)
    investment_accounts: List[InvestmentAccount]
    market_assumptions: MarketAssumptions


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
    max_iterations: int = Field(default=20000, ge=100)
    batch_size: int = Field(default=500, ge=50)


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
    mean_final_capital: float
    median_final_capital: float
    percentile_10: float
    percentile_50: float
    percentile_90: float
    percentile_min: float
    percentile_max: float
    standard_deviation: float
    monthly_percentiles: List[MonteCarloPercentilePoint] = Field(default_factory=list)


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


class RetirementMonteCarloInput(BaseModel):
    adults: List[AdultProfile]
    investment_accounts: List[InvestmentAccount]
    market_assumptions: MarketAssumptions
    spending_profile: List[SpendingPhase]
    target_monthly_income: NonNegativeFloat
    state_pension_monthly_income: NonNegativeFloat
    additional_income_streams: Optional[List[AdditionalIncome]] = None
    confidence_level: float = Field(default=0.9, ge=0.5, le=0.999)
    tolerance_ratio: float = Field(default=0.05, ge=0.001, le=0.5)
    max_iterations: int = Field(default=20000, ge=100)
    batch_size: int = Field(default=500, ge=50)


class RetirementMonteCarloResult(BaseModel):
    iterations: int
    confidence_level: float
    tolerance_ratio: float
    confidence_reached: bool
    mean_final_capital: float
    median_final_capital: float
    percentile_10: float
    percentile_50: float
    percentile_90: float
    percentile_min: float
    percentile_max: float
    standard_deviation: float
    monthly_percentiles: List[RetirementMonteCarloPoint] = Field(default_factory=list)


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
    confidence_level: float = Field(default=0.9, ge=0.5, le=0.999)
    tolerance_ratio: float = Field(default=0.01, ge=0.0001, le=0.5)
    max_iterations: int = Field(default=20, ge=3, le=200)
    batch_size: int = Field(default=500, ge=50)
    target_final_capital: float = Field(default=0.0)


class RecommendedSavingsResult(BaseModel):
    scale: float
    recommended_monthly_savings: float
    minimum_capital_at_retirement: float  # Capital minimum nécessaire à la retraite
    monte_carlo_result: MonteCarloResult  # Courbes avec versements réels
    retirement_results: RetirementScenarioResults  # Courbes avec versements réels
    steps: List[OptimizationStep] = Field(default_factory=list)
    residual_error: float
    residual_error_ratio: float
