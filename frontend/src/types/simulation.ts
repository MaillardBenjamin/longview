export interface AdditionalIncome {
  label: string;
  monthlyAmount: number;
  startAge?: number;
}

export type HouseholdStatus = "single" | "couple";

export interface AdultProfile {
  firstName: string;
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  monthlyNetIncome?: number;
}

export interface ChildProfile {
  firstName: string;
  age: number;
  departureAge?: number;
}

export interface SpendingPhase {
  label: string;
  fromAge: number;
  toAge: number;
  spendingRatio: number;
}

export interface SavingsPhase {
  label: string;
  fromAge: number;
  toAge: number;
  monthlyContribution: number;
}

export type ChargeCategory = "housing_loan" | "consumer_loan" | "pension" | "other";

export interface HouseholdCharge {
  id: string;
  label: string;
  category: ChargeCategory;
  monthlyAmount: number;
  untilAge?: number;
}

export interface ChildCharge {
  childName: string;
  monthlyAmount: number;
  untilAge?: number;
}

export type AssetClassKey = "equities" | "bonds" | "livrets" | "crypto" | "other";

export interface AssetAssumption {
  label: string;
  expectedReturn: number;
  volatility: number;
}

export type CorrelationMatrix = Record<AssetClassKey, Record<AssetClassKey, number>>;

export interface MarketAssumptions {
  inflationMean: number;
  inflationVolatility: number;
  assetClasses: Record<AssetClassKey, AssetAssumption>;
  correlations: CorrelationMatrix;
}

export type InvestmentAccountType =
  | "pea"
  | "per"
  | "assurance_vie"
  | "livret"
  | "crypto"
  | "cto"
  | "autre";

export interface LivretBreakdown {
  id: string;
  label: string;
  percentage: number;
}

export interface InvestmentAccount {
  id: string;
  type: InvestmentAccountType;
  label: string;
  currentAmount: number;
  monthlyContribution: number;
  monthlyContributionShare?: number;
  ownerName?: string;
  allocationActions?: number;
  allocationObligations?: number;
  livretBreakdown?: LivretBreakdown[];
  expectedPerformance?: number;
}

export interface CapitalizationPoint {
  monthIndex: number;
  age: number;
  contributions: number;
  gains: number;
  totalCapital: number;
}

export interface CapitalizationPreview {
  startCapital: number;
  endCapital: number;
  totalContributions: number;
  totalGains: number;
  monthlySeries: CapitalizationPoint[];
}

export interface MonteCarloPercentilePoint {
  monthIndex: number;
  age: number;
  percentileMin: number;
  percentile10: number;
  percentile50: number;
  percentile90: number;
  percentileMax: number;
  cumulativeContribution: number;
}

export interface MonteCarloResult {
  iterations: number;
  confidenceLevel: number;
  toleranceRatio: number;
  confidenceReached: boolean;
  meanFinalCapital: number;
  medianFinalCapital: number;
  percentile10: number;
  percentile50: number;
  percentile90: number;
  percentileMin: number;
  percentileMax: number;
  standardDeviation: number;
  monthlyPercentiles: MonteCarloPercentilePoint[];
}

export interface RetirementMonteCarloPoint {
  monthIndex: number;
  age: number;
  monthlyWithdrawal: number;
  cumulativeWithdrawal: number;
  percentileMin: number;
  percentile10: number;
  percentile50: number;
  percentile90: number;
  percentileMax: number;
}

export interface RetirementMonteCarloResult {
  iterations: number;
  confidenceLevel: number;
  toleranceRatio: number;
  confidenceReached: boolean;
  meanFinalCapital: number;
  medianFinalCapital: number;
  percentile10: number;
  percentile50: number;
  percentile90: number;
  percentileMin: number;
  percentileMax: number;
  standardDeviation: number;
  monthlyPercentiles: RetirementMonteCarloPoint[];
}

export interface RetirementScenarioResults {
  pessimistic: RetirementMonteCarloResult;
  median: RetirementMonteCarloResult;
  optimistic: RetirementMonteCarloResult;
}

export interface OptimizationStep {
  iteration: number;
  scale: number;
  monthlySavings: number;
  finalCapital: number;
  effectiveFinalCapital: number;
  depletionMonths: number;
}

export interface SimulationInput {
  name: string;
  householdStatus: HouseholdStatus;
  adults: AdultProfile[];
  children: ChildProfile[];
  spendingProfile: SpendingPhase[];
  savingsPhases: SavingsPhase[];
  householdCharges: HouseholdCharge[];
  childCharges: ChildCharge[];
  investmentAccounts: InvestmentAccount[];
  marketAssumptions: MarketAssumptions;
  targetMonthlyIncome?: number;
  statePensionMonthlyIncome?: number;
  housingLoanEndAge?: number;
  dependentsDepartureAge?: number;
  additionalIncomeStreams?: AdditionalIncome[];
}

export interface SimulationResult {
  requiredMonthlySavings: number;
  projectedCapitalAtRetirement: number;
  projectedCapitalAtLifeExpectancy: number;
  shortfallOrSurplus: number;
  successProbability: number;
}

export interface Simulation extends SimulationInput {
  id: number;
  userId?: number;
  currentAge: number;
  retirementAge: number;
  lifeExpectancy?: number;
  createdAt: string;
  updatedAt: string;
  inputsSnapshot?: Record<string, unknown>;
  resultsSnapshot?: SimulationResult;
}

export interface SimulationPayload {
  simulation: Simulation;
  result: SimulationResult;
}

