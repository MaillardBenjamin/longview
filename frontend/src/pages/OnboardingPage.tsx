import { useMutation } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";
import { createSimulation, optimizeSavingsPlan } from "@/services/simulations";
import type {
  AdditionalIncome,
  AdultProfile,
  AssetClassKey,
  ChildProfile,
  HouseholdCharge,
  InvestmentAccount,
  InvestmentAccountType,
  LivretBreakdown,
  MarketAssumptions,
  SimulationInput,
  SimulationResult,
  SpendingPhase,
  SavingsPhase,
} from "@/types/simulation";
import "./OnboardingPage.css";

const createAdult = (overrides: Partial<AdultProfile> = {}): AdultProfile => ({
  firstName: "Adulte",
  currentAge: 40,
  retirementAge: 64,
  lifeExpectancy: 90,
  monthlyNetIncome: 3200,
  ...overrides,
});

const createChild = (overrides: Partial<ChildProfile> = {}): ChildProfile => {
  const baseAge = overrides.age ?? 8;
  return {
    firstName: overrides.firstName ?? "Enfant",
    age: baseAge,
    departureAge: overrides.departureAge ?? baseAge + 12,
  };
};

const createSpendingPhase = (overrides: Partial<SpendingPhase> = {}): SpendingPhase => ({
  label: "Nouvelle phase",
  fromAge: 60,
  toAge: 80,
  spendingRatio: 0.85,
  ...overrides,
});

const createSavingsPhase = (overrides: Partial<SavingsPhase> = {}): SavingsPhase => ({
  label: "Phase d'épargne",
  fromAge: 30,
  toAge: 55,
  monthlyContribution: 800,
  ...overrides,
});

const generateId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const chargeCategoryLabels: Record<HouseholdCharge["category"], string> = {
  housing_loan: "Prêt immobilier",
  consumer_loan: "Prêt consommation",
  pension: "Pension / Rente",
  other: "Autre charge",
};

const investmentAccountTypeLabels: Record<InvestmentAccountType, string> = {
  pea: "PEA (100% actions)",
  per: "PER",
  assurance_vie: "Assurance vie",
  livret: "Livrets réglementés",
  cto: "CTO (actions)",
  crypto: "Cryptomonnaie",
  autre: "Autre support",
};

const DEFAULT_MARKET_ASSUMPTIONS: MarketAssumptions = {
  inflationMean: 2,
  inflationVolatility: 1,
  assetClasses: {
    equities: {
      label: "Actions mondiales",
      expectedReturn: 7,
      volatility: 15,
    },
    bonds: {
      label: "Obligations investment grade",
      expectedReturn: 3,
      volatility: 6,
    },
    livrets: {
      label: "Livrets réglementés",
      expectedReturn: 1.5,
      volatility: 0.5,
    },
    crypto: {
      label: "Cryptomonnaies",
      expectedReturn: 15,
      volatility: 80,
    },
    other: {
      label: "Supports diversifiés",
      expectedReturn: 4.5,
      volatility: 10,
    },
  },
  correlations: {
    equities: { equities: 1, bonds: 0.3, livrets: 0.05, crypto: 0.4, other: 0.6 },
    bonds: { equities: 0.3, bonds: 1, livrets: 0.2, crypto: 0.1, other: 0.4 },
    livrets: { equities: 0.05, bonds: 0.2, livrets: 1, crypto: -0.05, other: 0.1 },
    crypto: { equities: 0.4, bonds: 0.1, livrets: -0.05, crypto: 1, other: 0.5 },
    other: { equities: 0.6, bonds: 0.4, livrets: 0.1, crypto: 0.5, other: 1 },
  },
};

const cloneMarketAssumptions = (assumptions: MarketAssumptions): MarketAssumptions => ({
  inflationMean: assumptions.inflationMean,
  inflationVolatility: assumptions.inflationVolatility,
  assetClasses: Object.fromEntries(
    Object.entries(assumptions.assetClasses).map(([key, value]) => [key, { ...value }]),
  ) as MarketAssumptions["assetClasses"],
  correlations: Object.fromEntries(
    Object.entries(assumptions.correlations).map(([key, row]) => [
      key,
      { ...row },
    ]),
  ) as MarketAssumptions["correlations"],
});

const assetClassOrder: AssetClassKey[] = ["equities", "bonds", "livrets", "crypto", "other"];
const correlationPairs: [AssetClassKey, AssetClassKey][] = [
  ["equities", "bonds"],
  ["equities", "livrets"],
  ["equities", "crypto"],
  ["equities", "other"],
  ["bonds", "livrets"],
  ["bonds", "crypto"],
  ["bonds", "other"],
  ["livrets", "crypto"],
  ["livrets", "other"],
  ["crypto", "other"],
];

const createHouseholdCharge = (overrides: Partial<HouseholdCharge> = {}): HouseholdCharge => ({
  id: generateId(),
  label: "Nouvelle charge",
  category: "other",
  monthlyAmount: 0,
  untilAge: undefined,
  ...overrides,
});

const createLivretBreakdown = (label: string, percentage: number): LivretBreakdown => ({
  id: generateId(),
  label,
  percentage,
});

const buildInvestmentLabel = (
  type: InvestmentAccountType,
  ownerName?: string,
  customLabel?: string,
  existingAccounts: InvestmentAccount[] = [],
): string => {
  if (customLabel) {
    return customLabel;
  }
  const humanType = investmentAccountTypeLabels[type];
  const owner = ownerName ?? "Commun";
  const sameTypeCount =
    existingAccounts.filter((account) => account.type === type && account.ownerName === owner).length +
    1;
  if (type === "livret") {
    return sameTypeCount > 1 ? `${humanType} ${sameTypeCount}` : humanType;
  }
  return `${humanType} ${owner}${sameTypeCount > 1 ? ` (${sameTypeCount})` : ""}`;
};

const createInvestmentAccount = (
  type: InvestmentAccountType,
  overrides: Partial<InvestmentAccount> = {},
  adults: AdultProfile[] = [],
  existingAccounts: InvestmentAccount[] = [],
): InvestmentAccount => {
  const defaultOwner = overrides.ownerName ?? adults[0]?.firstName ?? "Commun";
  const proposedLabel = buildInvestmentLabel(type, defaultOwner, overrides.label, existingAccounts);
  switch (type) {
    case "pea":
      return {
        id: generateId(),
        type,
        label: proposedLabel,
        ownerName: defaultOwner,
        currentAmount: overrides.currentAmount ?? 65000,
        monthlyContribution: overrides.monthlyContribution ?? 0,
        monthlyContributionShare: overrides.monthlyContributionShare ?? 30,
        allocationActions: 100,
        ...overrides,
      };
    case "per":
      return {
        id: generateId(),
        type,
        label: proposedLabel,
        ownerName: defaultOwner,
        currentAmount: overrides.currentAmount ?? 32000,
        monthlyContribution: overrides.monthlyContribution ?? 0,
        monthlyContributionShare: overrides.monthlyContributionShare ?? 25,
        allocationActions: overrides.allocationActions ?? 60,
        allocationObligations: overrides.allocationObligations ?? 40,
        ...overrides,
      };
    case "assurance_vie":
      return {
        id: generateId(),
        type,
        label: proposedLabel,
        ownerName: defaultOwner,
        currentAmount: overrides.currentAmount ?? 22000,
        monthlyContribution: overrides.monthlyContribution ?? 0,
        monthlyContributionShare: overrides.monthlyContributionShare ?? 20,
        allocationActions: overrides.allocationActions ?? 50,
        allocationObligations: overrides.allocationObligations ?? 50,
        ...overrides,
      };
    case "livret":
      return {
        id: generateId(),
        type,
        label: proposedLabel,
        ownerName: defaultOwner,
        currentAmount: overrides.currentAmount ?? 18000,
        monthlyContribution: overrides.monthlyContribution ?? 0,
        monthlyContributionShare: overrides.monthlyContributionShare ?? 15,
        livretBreakdown:
          overrides.livretBreakdown ?? [
            createLivretBreakdown("Livret A", 60),
            createLivretBreakdown("LDDS", 40),
          ],
        ...overrides,
      };
    case "cto":
      return {
        id: generateId(),
        type,
        label: proposedLabel,
        ownerName: defaultOwner,
        currentAmount: overrides.currentAmount ?? 25000,
        monthlyContribution: overrides.monthlyContribution ?? 0,
        monthlyContributionShare: overrides.monthlyContributionShare ?? 15,
        allocationActions: 100,
        ...overrides,
      };
    case "crypto":
      return {
        id: generateId(),
        type,
        label: proposedLabel,
        ownerName: defaultOwner,
        currentAmount: overrides.currentAmount ?? 5000,
        monthlyContribution: overrides.monthlyContribution ?? 0,
        monthlyContributionShare: overrides.monthlyContributionShare ?? 10,
        expectedPerformance:
          overrides.expectedPerformance ??
          DEFAULT_MARKET_ASSUMPTIONS.assetClasses.crypto.expectedReturn,
        ...overrides,
      };
    default:
      return {
        id: generateId(),
        type: "autre",
        label: proposedLabel,
        ownerName: defaultOwner,
        currentAmount: overrides.currentAmount ?? 0,
        monthlyContribution: overrides.monthlyContribution ?? 0,
        monthlyContributionShare: overrides.monthlyContributionShare ?? 0,
        expectedPerformance:
          overrides.expectedPerformance ??
          DEFAULT_MARKET_ASSUMPTIONS.assetClasses.other.expectedReturn,
        ...overrides,
      };
  }
};

const calculateTotalSavingsContribution = (savingsPhases: SavingsPhase[]): number =>
  savingsPhases.reduce((sum, phase) => sum + phase.monthlyContribution, 0);

const calculateAverageSavingsContribution = (
  savingsPhases: SavingsPhase[] = [],
  adults: AdultProfile[] = [],
): number => {
  if (!savingsPhases.length) {
    return 0;
  }

  const primaryAdult = adults[0];

  if (!primaryAdult) {
    const total = savingsPhases.reduce((sum, phase) => sum + phase.monthlyContribution, 0);
    return total / savingsPhases.length;
  }

  const { totalMonths, totalAmount } = savingsPhases.reduce(
    (acc, phase) => {
      const phaseStart = Math.max(phase.fromAge, primaryAdult.currentAge);
      const phaseEnd = Math.min(phase.toAge, primaryAdult.retirementAge);
      const months = Math.max((phaseEnd - phaseStart) * 12, 0);
      return {
        totalMonths: acc.totalMonths + months,
        totalAmount: acc.totalAmount + phase.monthlyContribution * months,
      };
    },
    { totalMonths: 0, totalAmount: 0 },
  );

  if (totalMonths > 0) {
    return totalAmount / totalMonths;
  }

  return 0;
};

const getAccountTaxRate = (account: InvestmentAccount): number => {
  switch (account.type) {
    case "pea":
    case "per":
      return 0.172;
    case "crypto":
    case "cto":
      return 0.3;
    default:
      return 0;
  }
};

const distributeInvestmentContributions = (
  accounts: InvestmentAccount[],
  savingsPhases: SavingsPhase[],
): InvestmentAccount[] => {
  const totalContribution = calculateTotalSavingsContribution(savingsPhases);
  const explicitAmounts = accounts.map((account) => Math.max(0, account.monthlyContribution ?? 0));
  const explicitTotal = explicitAmounts.reduce((sum, value) => sum + value, 0);

  if (explicitTotal > 0) {
    return accounts.map((account, index) => {
      const amount = explicitAmounts[index];
      return {
        ...account,
        monthlyContribution: amount,
        monthlyContributionShare: explicitTotal > 0 ? (amount / explicitTotal) * 100 : 0,
      };
    });
  }

  const totalShare = accounts.reduce(
    (sum, account) => sum + Math.max(0, account.monthlyContributionShare ?? 0),
    0,
  );

  if (totalShare <= 0 || totalContribution <= 0) {
    return accounts.map((account) => ({
      ...account,
      monthlyContribution: 0,
      monthlyContributionShare: account.monthlyContributionShare ?? 0,
    }));
  }

  return accounts.map((account) => ({
    ...account,
    monthlyContribution:
      ((account.monthlyContributionShare ?? 0) / totalShare) * totalContribution,
  }));
};

const defaultAdults = [
  createAdult({
    firstName: "Claire",
    currentAge: 40,
    retirementAge: 63,
    lifeExpectancy: 92,
    monthlyNetIncome: 4200,
  }),
  createAdult({
    firstName: "Marc",
    currentAge: 42,
    retirementAge: 65,
    lifeExpectancy: 90,
    monthlyNetIncome: 3800,
  }),
];

const defaultChildren = [createChild({ firstName: "Léna", age: 12, departureAge: 23 }), createChild({ firstName: "Noé", age: 9, departureAge: 22 })];

const baseInvestmentAccounts: InvestmentAccount[] = [];
baseInvestmentAccounts.push(
  createInvestmentAccount("pea", { ownerName: defaultAdults[0]?.firstName }, defaultAdults, []),
);
baseInvestmentAccounts.push(
  createInvestmentAccount(
    "per",
    { ownerName: defaultAdults[0]?.firstName },
    defaultAdults,
    baseInvestmentAccounts,
  ),
);
baseInvestmentAccounts.push(
  createInvestmentAccount(
    "assurance_vie",
    { ownerName: defaultAdults[1]?.firstName ?? defaultAdults[0]?.firstName },
    defaultAdults,
    baseInvestmentAccounts,
  ),
);
baseInvestmentAccounts.push(
  createInvestmentAccount("livret", { ownerName: "Commun" }, defaultAdults, baseInvestmentAccounts),
);
baseInvestmentAccounts.push(
  createInvestmentAccount(
    "crypto",
    { label: "Bitcoin", ownerName: "Commun" },
    defaultAdults,
    baseInvestmentAccounts,
  ),
);

const initialFormStateBase: SimulationInput = {
  name: "Projet LongView",
  householdStatus: "couple",
  adults: defaultAdults,
  children: defaultChildren,
  spendingProfile: [
    { label: "Retraite active", fromAge: 65, toAge: 80, spendingRatio: 0.85 },
    { label: "Retraite sereine", fromAge: 81, toAge: 100, spendingRatio: 0.7 },
  ],
  savingsPhases: [
    createSavingsPhase({ label: "Aujourd'hui", fromAge: 40, toAge: 55, monthlyContribution: 900 }),
    createSavingsPhase({ label: "Dernières années actives", fromAge: 55, toAge: 63, monthlyContribution: 1200 }),
  ],
  householdCharges: [
    createHouseholdCharge({
      label: "Prêt immobilier principal",
      category: "housing_loan",
      monthlyAmount: 850,
      untilAge: 63,
    }),
    createHouseholdCharge({
      label: "Pension alimentaire",
      category: "pension",
      monthlyAmount: 320,
      untilAge: 60,
    }),
  ],
  childCharges: defaultChildren.map((child) => ({
    childName: child.firstName,
    monthlyAmount: 250,
    untilAge: child.departureAge,
  })),
  investmentAccounts: baseInvestmentAccounts,
  marketAssumptions: cloneMarketAssumptions(DEFAULT_MARKET_ASSUMPTIONS),
  targetMonthlyIncome: 3200,
  statePensionMonthlyIncome: Math.round(
    defaultAdults.reduce((sum, adult) => sum + (adult.monthlyNetIncome ?? 0), 0) * 0.5,
  ),
  housingLoanEndAge: undefined,
  dependentsDepartureAge: undefined,
  additionalIncomeStreams: [
    {
      label: "Location appartement",
      monthlyAmount: 750,
      startAge: defaultAdults[0]?.currentAge ?? 40,
    },
    {
      label: "Dividendes",
      monthlyAmount: 120,
      startAge: (defaultAdults[0]?.currentAge ?? 40) + 1,
    },
  ],
};

const initialFormState: SimulationInput = {
  ...initialFormStateBase,
  investmentAccounts: distributeInvestmentContributions(
    initialFormStateBase.investmentAccounts,
    initialFormStateBase.savingsPhases,
  ),
  marketAssumptions: cloneMarketAssumptions(initialFormStateBase.marketAssumptions),
};

const emptyResult: SimulationResult = {
  requiredMonthlySavings: 0,
  projectedCapitalAtRetirement: 0,
  projectedCapitalAtLifeExpectancy: 0,
  shortfallOrSurplus: 0,
  successProbability: 15,
};

function computeRetirementSpendingRatio(
  spendingProfile: SpendingPhase[],
  retirementAge: number,
  lifeExpectancy: number,
): number {
  if (!spendingProfile.length) {
    return 1;
  }

  const relevantPhases = spendingProfile
    .map((phase) => {
      const start = Math.max(phase.fromAge, retirementAge);
      const end = Math.min(phase.toAge, lifeExpectancy);
      const span = Math.max(end - start, 0);
      return { span, ratio: phase.spendingRatio };
    })
    .filter((phase) => phase.span > 0);

  if (!relevantPhases.length) {
    return 1;
  }

  const totalSpan = relevantPhases.reduce((total, { span }) => total + span, 0);
  const weighted = relevantPhases.reduce((total, { span, ratio }) => total + ratio * span, 0);
  return weighted / (totalSpan || 1);
}

function computeSimulationResult(input: SimulationInput): SimulationResult {
  const primaryAdult = input.adults[0];
  if (!primaryAdult) {
    return emptyResult;
  }

  const market = input.marketAssumptions ?? DEFAULT_MARKET_ASSUMPTIONS;

  const getAnnualReturn = (assetKey: AssetClassKey): number => {
    const fallback = DEFAULT_MARKET_ASSUMPTIONS.assetClasses[assetKey];
    const assumption = market.assetClasses[assetKey] ?? fallback;
    return (assumption.expectedReturn ?? fallback.expectedReturn) / 100;
  };

  const monthsToRetirement = Math.max((primaryAdult.retirementAge - primaryAdult.currentAge) * 12, 1);
  const lifeExpectancy = primaryAdult.lifeExpectancy;
  const retirementDurationMonths = Math.max((lifeExpectancy - primaryAdult.retirementAge) * 12, 1);

  const getAccountMonthlyReturn = (account: InvestmentAccount) => {
    const taxRate = getAccountTaxRate(account);
    let grossMonthlyReturn = 0;

    switch (account.type) {
      case "pea":
      case "cto":
        grossMonthlyReturn = getAnnualReturn("equities") / 12;
        break;
      case "per":
      case "assurance_vie": {
        const actions = (account.allocationActions ?? 0) / 100;
        const obligations = (account.allocationObligations ?? 0) / 100;
        const equitiesReturn = getAnnualReturn("equities");
        const bondReturn = getAnnualReturn("bonds");
        const balanced = actions * equitiesReturn + obligations * bondReturn;
        grossMonthlyReturn = balanced / 12;
        break;
      }
      case "livret": {
        if (account.livretBreakdown?.length) {
          const totalPercentage = account.livretBreakdown.reduce(
            (sum, breakdown) => sum + breakdown.percentage,
            0,
          );
          const effectiveShare = totalPercentage > 0 ? totalPercentage / 100 : 1;
          grossMonthlyReturn = (getAnnualReturn("livrets") * effectiveShare) / 12;
        } else {
          grossMonthlyReturn = getAnnualReturn("livrets") / 12;
        }
        break;
      }
      case "crypto": {
        const annualPerformance =
          (account.expectedPerformance ??
            market.assetClasses.crypto.expectedReturn ??
            DEFAULT_MARKET_ASSUMPTIONS.assetClasses.crypto.expectedReturn) / 100;
        grossMonthlyReturn = Math.pow(1 + annualPerformance, 1 / 12) - 1;
        break;
      }
      default: {
        const annualPerformance =
          (account.expectedPerformance ??
            market.assetClasses.other.expectedReturn ??
            DEFAULT_MARKET_ASSUMPTIONS.assetClasses.other.expectedReturn) / 100;
        grossMonthlyReturn = annualPerformance / 12;
        break;
      }
    }

    const netMonthlyReturn = grossMonthlyReturn * (1 - taxRate);
    return netMonthlyReturn;
  };

  const accountFutureValue = (input.investmentAccounts ?? []).reduce((total, account) => {
    const monthlyReturn = getAccountMonthlyReturn(account);
    const growthFactor = (1 + monthlyReturn) ** monthsToRetirement;
    const lumpSumFutureValue = account.currentAmount * growthFactor;

    let contributionFutureValue = 0;
    if (account.monthlyContribution && account.monthlyContribution > 0) {
      if (monthlyReturn === 0) {
        contributionFutureValue = account.monthlyContribution * monthsToRetirement;
      } else {
        contributionFutureValue =
          account.monthlyContribution * ((growthFactor - 1) / monthlyReturn);
      }
    }

    return total + lumpSumFutureValue + contributionFutureValue;
  }, 0);

  const baselineMonthlyReturn = getAnnualReturn("other") / 12;

  const plannedContributionFutureValue = (input.savingsPhases ?? []).reduce((total, phase) => {
    const phaseStartAge = Math.max(phase.fromAge, primaryAdult.currentAge);
    const phaseEndAge = Math.min(phase.toAge, primaryAdult.retirementAge);
    const months = Math.max((phaseEndAge - phaseStartAge) * 12, 0);
    if (months <= 0) {
      return total;
    }

    const monthsAfterPhase = Math.max((primaryAdult.retirementAge - phaseEndAge) * 12, 0);
    let phaseFutureValue = 0;

    if (baselineMonthlyReturn === 0) {
      phaseFutureValue = phase.monthlyContribution * months;
    } else {
      const growthDuringPhase = (1 + baselineMonthlyReturn) ** months;
      phaseFutureValue = phase.monthlyContribution * ((growthDuringPhase - 1) / baselineMonthlyReturn);
    }

    const compoundedFutureValue =
      phaseFutureValue * (1 + baselineMonthlyReturn) ** monthsAfterPhase;
    return total + compoundedFutureValue;
  }, 0);

  const additionalIncome = (input.additionalIncomeStreams ?? []).reduce((total, income) => {
    const startAge = income.startAge ?? primaryAdult.currentAge;
    return startAge <= primaryAdult.currentAge ? total + income.monthlyAmount : total;
  }, 0);

  const retirementHouseholdCharges = (input.householdCharges ?? []).reduce((total, charge) => {
    if (!charge.monthlyAmount) {
      return total;
    }
    if (charge.untilAge && charge.untilAge <= primaryAdult.retirementAge) {
      return total;
    }
    return total + charge.monthlyAmount;
  }, 0);

  const retirementChildCharges = (input.childCharges ?? []).reduce((total, charge) => {
    if (!charge.monthlyAmount) {
      return total;
    }
    const endAge = charge.untilAge ?? primaryAdult.retirementAge;
    if (endAge <= primaryAdult.retirementAge) {
      return total;
    }
    return total + charge.monthlyAmount;
  }, 0);

  const statePension = input.statePensionMonthlyIncome ?? 0;
  const spendingRatio = computeRetirementSpendingRatio(
    input.spendingProfile ?? [],
    primaryAdult.retirementAge,
    lifeExpectancy,
  );
  const targetIncome = (input.targetMonthlyIncome ?? statePension + additionalIncome) * spendingRatio;
  const monthlyShortfall = Math.max(
    targetIncome - statePension - additionalIncome + retirementHouseholdCharges + retirementChildCharges,
    0,
  );

  const totalCapitalNeeded = monthlyShortfall * retirementDurationMonths;
  const growthFactor = (1 + baselineMonthlyReturn) ** monthsToRetirement;
  const futureValueExisting = accountFutureValue + plannedContributionFutureValue;

  let requiredMonthlySavings = 0;
  if (totalCapitalNeeded > futureValueExisting) {
    const numerator = (totalCapitalNeeded - futureValueExisting) * baselineMonthlyReturn;
    const denominator = growthFactor - 1 || 1;
    requiredMonthlySavings = numerator / denominator;
  }

  const projectedCapitalAtRetirement =
    futureValueExisting +
    requiredMonthlySavings * ((growthFactor - 1) / (baselineMonthlyReturn || 1));

  const retirementReturn = 0.02 / 12;
  let capital = projectedCapitalAtRetirement;
  for (let month = 0; month < retirementDurationMonths; month += 1) {
    capital = capital * (1 + retirementReturn) - monthlyShortfall;
    if (capital <= 0) {
      capital = 0;
      break;
    }
  }
  const projectedCapitalAtLifeExpectancy = capital;

  const shortfallOrSurplus = projectedCapitalAtLifeExpectancy - 50000;
  const successProbability = Math.max(
    Math.min(
      50 + (projectedCapitalAtLifeExpectancy / Math.max(totalCapitalNeeded, 1)) * 50,
      97,
    ),
    15,
  );

  return {
    requiredMonthlySavings: Math.max(requiredMonthlySavings, 0),
    projectedCapitalAtRetirement,
    projectedCapitalAtLifeExpectancy,
    shortfallOrSurplus,
    successProbability,
  };
}

export function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cguAccepted, setCguAccepted] = useState(() => {
    const saved = sessionStorage.getItem("lv_cgu_accepted");
    return saved === "true";
  });
  const [form, setForm] = useState<SimulationInput>(() => {
    const saved = sessionStorage.getItem("lv_onboarding_form");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...initialFormState,
          ...parsed,
        };
      } catch (error) {
        console.warn("Impossible de restaurer le formulaire, utilisation des valeurs par défaut.", error);
      }
    }
    return initialFormState;
  });
  const [hasManualTargetIncome, setHasManualTargetIncome] = useState(() => {
    const saved = sessionStorage.getItem("lv_onboarding_manual_target_income");
    return saved === "true";
  });
  const [hasManualStatePension, setHasManualStatePension] = useState(() => {
    const saved = sessionStorage.getItem("lv_onboarding_manual_state_pension");
    return saved === "true";
  });
  const [additionalIncome, setAdditionalIncome] = useState<AdditionalIncome[]>(
    form.additionalIncomeStreams ?? initialFormState.additionalIncomeStreams ?? [],
  );

  const primaryAdult = form.adults[0];

  const mutation = useMutation({
    mutationFn: createSimulation,
  });
  const optimizationMutation = useMutation({
    mutationFn: optimizeSavingsPlan,
  });
  const isSubmitting = mutation.isPending || optimizationMutation.isPending;

  const simulationPreview = useMemo(
    () => computeSimulationResult({ ...form, additionalIncomeStreams: additionalIncome }),
    [form, additionalIncome],
  );

  const averagePlannedContribution = useMemo(
    () => calculateAverageSavingsContribution(form.savingsPhases, form.adults),
    [form.savingsPhases, form.adults],
  );

  const childSummaries = form.children.map((child, index) => ({
    label: child.firstName || `Enfant ${index + 1}`,
    age: child.age,
    departureAge: child.departureAge,
    monthlyCharge: form.childCharges[index]?.monthlyAmount ?? 0,
  }));

  const currentAgeReference = primaryAdult?.currentAge ?? form.adults[0]?.currentAge ?? 0;

  const incomeSummaries = additionalIncome.map((income, index) => ({
    label: income.label || `Revenu ${index + 1}`,
    monthlyAmount: income.monthlyAmount,
    startAge: income.startAge ?? currentAgeReference,
  }));

  const activeComplementaryIncome = incomeSummaries.reduce(
    (total, income) => (income.startAge <= currentAgeReference ? total + income.monthlyAmount : total),
    0,
  );

  const investmentAccountSummaries = form.investmentAccounts.map((account) => ({
    id: account.id,
    label: account.label,
    type: account.type,
    typeLabel: investmentAccountTypeLabels[account.type],
  ownerName: account.ownerName ?? "Commun",
    currentAmount: account.currentAmount,
    monthlyContribution: account.monthlyContribution,
    monthlyContributionShare: account.monthlyContributionShare,
    allocationActions: account.allocationActions,
    allocationObligations: account.allocationObligations,
    livretBreakdown: account.livretBreakdown ?? [],
    expectedPerformance: account.expectedPerformance,
  }));

  const totalInvestmentContribution = investmentAccountSummaries.reduce(
    (total, account) => total + account.monthlyContribution,
    0,
  );

  const householdChargeSummaries = form.householdCharges.map((charge) => ({
    label: charge.label,
    category: chargeCategoryLabels[charge.category],
    monthlyAmount: charge.monthlyAmount,
    untilAge: charge.untilAge,
  }));

  const totalHouseholdCharges = householdChargeSummaries.reduce(
    (total, charge) => total + charge.monthlyAmount,
    0,
  );

  const targetIncomeInputs = useMemo(() => {
    const totalAdultIncome = form.adults.reduce(
      (sum, adult) => sum + (adult.monthlyNetIncome ?? 0),
      0,
    );
    const childSupport = form.childCharges.reduce(
      (sum, charge) => sum + (charge.monthlyAmount ?? 0),
      0,
    );
    const pensionCharges = form.householdCharges.reduce(
      (sum, charge) =>
        charge.category === "pension" ? sum + (charge.monthlyAmount ?? 0) : sum,
      0,
    );
    const housingLoanCharges = form.householdCharges.reduce(
      (sum, charge) =>
        charge.category === "housing_loan" ? sum + (charge.monthlyAmount ?? 0) : sum,
      0,
    );
    const recommended =
      totalAdultIncome -
      averagePlannedContribution -
      childSupport -
      pensionCharges -
      housingLoanCharges;
    if (!Number.isFinite(recommended)) {
      return {
        totalAdultIncome,
        childSupport,
        pensionCharges,
        housingLoanCharges,
        recommended: 0,
      };
    }
    return {
      totalAdultIncome,
      childSupport,
      pensionCharges,
      housingLoanCharges,
      recommended: Math.max(Math.round(recommended), 0),
    };
  }, [form.adults, form.childCharges, form.householdCharges, averagePlannedContribution]);

  const recommendedTargetIncome = targetIncomeInputs.recommended;
  const suggestedStatePension = Math.round(targetIncomeInputs.totalAdultIncome * 0.5);

  useEffect(() => {
    if (hasManualTargetIncome) {
      return;
    }
    setForm((current) => {
      if (current.targetMonthlyIncome === recommendedTargetIncome) {
        return current;
      }
      return { ...current, targetMonthlyIncome: recommendedTargetIncome };
    });
  }, [recommendedTargetIncome, hasManualTargetIncome]);

useEffect(() => {
  if (hasManualStatePension) {
    return;
  }
  setForm((current) => {
    if (current.statePensionMonthlyIncome === suggestedStatePension) {
      return current;
    }
    return { ...current, statePensionMonthlyIncome: suggestedStatePension };
  });
}, [suggestedStatePension, hasManualStatePension]);

  const handleHouseholdStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const status = event.target.value as SimulationInput["householdStatus"];
    setForm((current) => {
      const baseAdult = current.adults[0] ?? createAdult({ firstName: "Moi" });

      if (status === "single") {
        return {
          ...current,
          householdStatus: status,
          adults: [baseAdult],
        };
      }

      const partner =
        current.adults[1] ??
        createAdult({
          firstName: "Partenaire",
          currentAge: Math.max(baseAdult.currentAge, 18) + 2,
          retirementAge: baseAdult.retirementAge + 1,
          lifeExpectancy: Math.max(baseAdult.lifeExpectancy - 1, baseAdult.retirementAge + 5),
        });

      return {
        ...current,
        householdStatus: status,
        adults: [baseAdult, partner],
      };
    });
  };

  const updateAdult = (index: number, field: keyof AdultProfile, value: string) => {
    const previousName = form.adults[index]?.firstName ?? "";

    setForm((current) => {
      const previousAdult = current.adults[index];
      const updatedAdults = current.adults.map((adult, adultIndex) =>
        adultIndex === index
          ? {
              ...adult,
              [field]: field === "firstName" ? value : Number(value),
            }
          : adult,
      );

      let updatedAccounts = current.investmentAccounts;
      if (field === "firstName" && previousAdult) {
        const newOwnerName = value || previousName;
        updatedAccounts = current.investmentAccounts.map((account) => {
          if ((account.ownerName ?? "") !== previousName) {
            return account;
          }
          const updatedAccount: InvestmentAccount = {
            ...account,
            ownerName: newOwnerName,
          };
          if (previousName && value && account.label?.includes(previousName)) {
            updatedAccount.label = account.label.replace(previousName, value);
          }
          return updatedAccount;
        });
      }

      return {
        ...current,
        adults: updatedAdults,
        investmentAccounts: updatedAccounts,
      };
    });

    if (field === "firstName") {
      setNewAccountOwner((currentValue) => {
        if (currentValue === previousName && previousName) {
          return value || "Commun";
        }
        return currentValue;
      });
    }
  };

  const updateChild = (index: number, field: keyof ChildProfile, value: string) => {
    setForm((current) => {
      const updatedChildren = current.children.map((child, childIndex) =>
        childIndex === index
          ? {
              ...child,
              [field]: field === "firstName" ? value : Number(value),
            }
          : child,
      );

      const updatedChildCharges = current.childCharges.map((charge, chargeIndex) => {
        if (chargeIndex !== index) {
          return charge;
        }

        if (field === "firstName") {
          return { ...charge, childName: value };
        }
        if (field === "departureAge") {
          return { ...charge, untilAge: Number(value) };
        }
        return charge;
      });

      return {
        ...current,
        children: updatedChildren,
        childCharges: updatedChildCharges,
      };
    });
  };

  const addChild = () => {
    setForm((current) => {
      const newChild = createChild({ firstName: `Enfant ${current.children.length + 1}`, age: 6 });
      return {
        ...current,
        children: [...current.children, newChild],
        childCharges: [
          ...current.childCharges,
          { childName: newChild.firstName, monthlyAmount: 200, untilAge: newChild.departureAge },
        ],
      };
    });
  };

  const removeChild = (index: number) => {
    setForm((current) => ({
      ...current,
      children: current.children.filter((_, childIndex) => childIndex !== index),
      childCharges: current.childCharges.filter((_, chargeIndex) => chargeIndex !== index),
    }));
  };

  const updateChildChargeAmount = (index: number, value: string) => {
    setForm((current) => ({
      ...current,
      childCharges: current.childCharges.map((charge, chargeIndex) =>
        chargeIndex === index ? { ...charge, monthlyAmount: Number(value) } : charge,
      ),
    }));
  };

  const addHouseholdCharge = () => {
    setForm((current) => ({
      ...current,
      householdCharges: [
        ...current.householdCharges,
        createHouseholdCharge({
          label: `Charge ${current.householdCharges.length + 1}`,
          category: "other",
          monthlyAmount: 0,
          untilAge: (primaryAdult?.retirementAge ?? 65) + 1,
        }),
      ],
    }));
  };

  const updateHouseholdCharge = (id: string, field: keyof HouseholdCharge, value: string) => {
    setForm((current) => ({
      ...current,
      householdCharges: current.householdCharges.map((charge) =>
        charge.id === id
          ? {
              ...charge,
              [field]:
                field === "label"
                  ? value
                  : field === "category"
                    ? (value as HouseholdCharge["category"])
                    : value === ""
                      ? undefined
                      : Number(value),
            }
          : charge,
      ),
    }));
  };

  const removeHouseholdCharge = (id: string) => {
    setForm((current) => ({
      ...current,
      householdCharges: current.householdCharges.filter((charge) => charge.id !== id),
    }));
  };

const [newAccountType, setNewAccountType] = useState<InvestmentAccountType>("autre");
const [newAccountOwner, setNewAccountOwner] = useState<string>("Commun");

  const addInvestmentAccount = (type: InvestmentAccountType = "autre") => {
    setForm((current) => {
      const ownerName = newAccountOwner === "Commun" ? undefined : newAccountOwner;
      const updatedAccounts = [
        ...current.investmentAccounts,
        createInvestmentAccount(
          type,
          { ownerName, monthlyContribution: 0, monthlyContributionShare: 0 },
          current.adults,
          current.investmentAccounts,
        ),
      ];
      return {
        ...current,
        investmentAccounts: distributeInvestmentContributions(updatedAccounts, current.savingsPhases),
      };
    });
  };

  const removeInvestmentAccount = (id: string) => {
    setForm((current) => {
      const updatedAccounts = current.investmentAccounts.filter((account) => account.id !== id);
      return {
        ...current,
        investmentAccounts: distributeInvestmentContributions(updatedAccounts, current.savingsPhases),
      };
    });
  };

  const updateInvestmentAccountField = <K extends keyof InvestmentAccount>(
    id: string,
    field: K,
    value: InvestmentAccount[K],
  ) => {
    setForm((current) => ({
      ...current,
      investmentAccounts: current.investmentAccounts.map((account) =>
        account.id === id
          ? {
              ...account,
              [field]: value,
            }
          : account,
      ),
    }));
  };

  const handleInvestmentAccountTypeChange = (id: string, type: InvestmentAccountType) => {
    setForm((current) => {
      const updatedAccounts = current.investmentAccounts.map((account) =>
        account.id === id
          ? createInvestmentAccount(
              type,
              {
                id: account.id,
                label: account.label,
                currentAmount: account.currentAmount,
                monthlyContribution: account.monthlyContribution,
                monthlyContributionShare: account.monthlyContributionShare,
                ownerName: account.ownerName,
              },
              current.adults,
              current.investmentAccounts.filter((item) => item.id !== account.id),
            )
          : account,
      );
      return {
        ...current,
        investmentAccounts: distributeInvestmentContributions(updatedAccounts, current.savingsPhases),
      };
    });
  };

  const updateInvestmentAllocation = (
    id: string,
    field:
      | "allocationActions"
      | "allocationObligations"
      | "currentAmount"
      | "expectedPerformance",
    value: number,
  ) => {
    setForm((current) => ({
      ...current,
      investmentAccounts: current.investmentAccounts.map((account) =>
        account.id === id
          ? {
              ...account,
              [field]: value,
            }
          : account,
      ),
    }));
  };

  const updateInvestmentAccountContribution = (id: string, amount: number) => {
    setForm((current) => {
      const sanitizedAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
      const updatedAccounts = current.investmentAccounts.map((account) =>
        account.id === id
          ? {
              ...account,
              monthlyContribution: sanitizedAmount,
              monthlyContributionShare:
                sanitizedAmount > 0 ? account.monthlyContributionShare : 0,
            }
          : account,
      );
      return {
        ...current,
        investmentAccounts: distributeInvestmentContributions(updatedAccounts, current.savingsPhases),
      };
    });
  };

  const updateInflationAssumption = (
    field: "inflationMean" | "inflationVolatility",
    value: string,
  ) => {
    const numeric = Number(value);
    setForm((current) => ({
      ...current,
      marketAssumptions: {
        ...current.marketAssumptions,
        [field]: Number.isNaN(numeric) ? 0 : numeric,
      },
    }));
  };

  const updateAssetClassAssumption = (
    assetKey: AssetClassKey,
    field: keyof MarketAssumptions["assetClasses"][AssetClassKey],
    value: string,
  ) => {
    setForm((current) => {
      const assetClasses = { ...current.marketAssumptions.assetClasses };
      const currentAsset = assetClasses[assetKey];
      assetClasses[assetKey] = {
        ...currentAsset,
        [field]: field === "label" ? value : Number(value),
      };
      return {
        ...current,
        marketAssumptions: {
          ...current.marketAssumptions,
          assetClasses,
        },
      };
    });
  };

  const updateCorrelation = (assetA: AssetClassKey, assetB: AssetClassKey, value: string) => {
    const numeric = Number(value);
    setForm((current) => {
      const correlations = Object.fromEntries(
        Object.entries(current.marketAssumptions.correlations).map(([key, row]) => [
          key,
          { ...row },
        ]),
      ) as MarketAssumptions["correlations"];
      correlations[assetA][assetB] = numeric;
      correlations[assetB][assetA] = numeric;
      correlations[assetA][assetA] = 1;
      correlations[assetB][assetB] = 1;
      return {
        ...current,
        marketAssumptions: {
          ...current.marketAssumptions,
          correlations,
        },
      };
    });
  };

  const addLivretBreakdownLine = (id: string) => {
    setForm((current) => ({
      ...current,
      investmentAccounts: current.investmentAccounts.map((account) =>
        account.id === id
          ? {
              ...account,
              livretBreakdown: [
                ...(account.livretBreakdown ?? []),
                createLivretBreakdown(
                  `Livret ${(account.livretBreakdown?.length ?? 0) + 1}`,
                  0,
                ),
              ],
            }
          : account,
      ),
    }));
  };

  const updateLivretBreakdown = (
    accountId: string,
    breakdownId: string,
    field: "label" | "percentage",
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      investmentAccounts: current.investmentAccounts.map((account) =>
        account.id === accountId
          ? {
              ...account,
              livretBreakdown: (account.livretBreakdown ?? []).map((breakdown) =>
                breakdown.id === breakdownId
                  ? {
                      ...breakdown,
                      [field]: field === "label" ? value : Number(value),
                    }
                  : breakdown,
              ),
            }
          : account,
      ),
    }));
  };

  const removeLivretBreakdown = (accountId: string, breakdownId: string) => {
    setForm((current) => ({
      ...current,
      investmentAccounts: current.investmentAccounts.map((account) =>
        account.id === accountId
          ? {
              ...account,
              livretBreakdown: (account.livretBreakdown ?? []).filter((breakdown) => breakdown.id !== breakdownId),
            }
          : account,
      ),
    }));
  };

  const updateSavingsPhase = (
    index: number,
    field: keyof SavingsPhase,
    value: string,
  ) => {
    setForm((current) => {
      const updatedSavingsPhases = current.savingsPhases.map((phase, phaseIndex) =>
        phaseIndex === index
          ? {
              ...phase,
              [field]: field === "label" ? value : Number(value),
            }
          : phase,
      );
      return {
        ...current,
        savingsPhases: updatedSavingsPhases,
        investmentAccounts: distributeInvestmentContributions(
          current.investmentAccounts,
          updatedSavingsPhases,
        ),
      };
    });
  };

  const addSavingsPhase = () => {
    setForm((current) => {
      const updatedSavingsPhases = [
        ...current.savingsPhases,
        createSavingsPhase({
          label: `Phase ${current.savingsPhases.length + 1}`,
          fromAge: Math.max(primaryAdult?.currentAge ?? 30, 18),
          toAge: Math.max((primaryAdult?.currentAge ?? 30) + 5, (primaryAdult?.currentAge ?? 30) + 1),
          monthlyContribution: 500,
        }),
      ];
      return {
        ...current,
        savingsPhases: updatedSavingsPhases,
        investmentAccounts: distributeInvestmentContributions(
          current.investmentAccounts,
          updatedSavingsPhases,
        ),
      };
    });
  };

  const removeSavingsPhase = (index: number) => {
    setForm((current) => {
      const updatedSavingsPhases = current.savingsPhases.filter((_, phaseIndex) => phaseIndex !== index);
      return {
        ...current,
        savingsPhases: updatedSavingsPhases,
        investmentAccounts: distributeInvestmentContributions(
          current.investmentAccounts,
          updatedSavingsPhases,
        ),
      };
    });
  };

  const updateSpendingPhase = (
    index: number,
    field: keyof SpendingPhase,
    value: string | number,
  ) => {
    setForm((current) => ({
      ...current,
      spendingProfile: current.spendingProfile.map((phase, phaseIndex) =>
        phaseIndex === index
          ? {
              ...phase,
              [field]: field === "label" ? (value as string) : Number(value),
            }
          : phase,
      ),
    }));
  };

  const addSpendingPhase = () => {
    setForm((current) => ({
      ...current,
      spendingProfile: [...current.spendingProfile, createSpendingPhase()],
    }));
  };

  const removeSpendingPhase = (index: number) => {
    setForm((current) => ({
      ...current,
      spendingProfile: current.spendingProfile.filter((_, phaseIndex) => phaseIndex !== index),
    }));
  };

  const handleNumberChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    if (name === "targetMonthlyIncome") {
      setHasManualTargetIncome(true);
    }
    if (name === "statePensionMonthlyIncome") {
      setHasManualStatePension(value !== "");
    }
    setForm((current) => ({
      ...current,
      [name]: value === "" ? undefined : Number(value),
    }));
  };

  const handleApplyRecommendedTargetIncome = () => {
    setHasManualTargetIncome(false);
    setForm((current) => {
      if (current.targetMonthlyIncome === recommendedTargetIncome) {
        return current;
      }
      return { ...current, targetMonthlyIncome: recommendedTargetIncome };
    });
  };

  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleIncomeChange = (index: number, field: keyof AdditionalIncome, value: string) => {
    const numericFields: (keyof AdditionalIncome)[] = ["monthlyAmount", "startAge"];
    setAdditionalIncome((current) =>
      current.map((income, currentIndex) => {
        if (currentIndex !== index) {
          return income;
        }
        if (numericFields.includes(field)) {
          return {
            ...income,
            [field]: value === "" ? undefined : Number(value),
          };
        }
        return {
          ...income,
          [field]: value,
        };
      }),
    );
  };

  const addIncomeStream = () => {
    setAdditionalIncome((current) => [
      ...current,
      {
        label: "Nouvelle source",
        monthlyAmount: 0,
        startAge: primaryAdult?.currentAge ?? form.adults[0]?.currentAge ?? 0,
      },
    ]);
  };

  const removeIncomeStream = (index: number) => {
    setAdditionalIncome((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // Vérification de l'acceptation des CGU
    if (!cguAccepted) {
      window.alert(
        "Vous devez accepter les Conditions Générales d'Utilisation pour lancer la simulation."
      );
      return;
    }
    
    const payload = { ...form, additionalIncomeStreams: additionalIncome };
    const quickResult = computeSimulationResult(payload);

    let optimizationResult;
    try {
      optimizationResult = await optimizationMutation.mutateAsync(payload);
    } catch (error) {
      console.error(error);
      window.alert("L'optimisation Monte Carlo n'a pas pu être réalisée. Vérifiez vos données ou réessayez.");
      return;
    }

    const {
      scale,
      recommendedMonthlySavings,
      monteCarloResult,
      retirementResults,
      steps,
      residualError,
      residualErrorRatio,
    } = optimizationResult;

    const optimizedQuickResult: SimulationResult = {
      ...quickResult,
      requiredMonthlySavings: recommendedMonthlySavings,
      projectedCapitalAtRetirement: monteCarloResult.medianFinalCapital,
      projectedCapitalAtLifeExpectancy: retirementResults.median.medianFinalCapital,
    };

    if (user) {
      mutation.mutate(payload, {
        onSuccess: (simulation) => {
          navigate("/resultats", {
            state: {
              simulation,
              monteCarloResult,
              retirementMonteCarloResult: retirementResults,
              draft: payload,
              result: optimizedQuickResult,
              recommendedSavings: recommendedMonthlySavings,
              optimizationSteps: steps,
              optimizationScale: scale,
              optimizationResidualError: residualError,
              optimizationResidualErrorRatio: residualErrorRatio,
            },
          });
        },
        onError: (error) => {
          console.error(error);
          window.alert("Impossible d'enregistrer la simulation pour le moment.");
        },
      });
    } else {
      navigate("/resultats", {
        state: {
          simulation: null,
          result: optimizedQuickResult,
          draft: payload,
          monteCarloResult,
          retirementMonteCarloResult: retirementResults,
          recommendedSavings: recommendedMonthlySavings,
          optimizationSteps: steps,
          optimizationScale: scale,
          optimizationResidualError: residualError,
          optimizationResidualErrorRatio: residualErrorRatio,
        },
      });
    }
  };

  useEffect(() => {
    sessionStorage.setItem(
      "lv_onboarding_form",
      JSON.stringify({
        ...form,
        additionalIncomeStreams: additionalIncome,
      }),
    );
  }, [form, additionalIncome]);

  useEffect(() => {
    sessionStorage.setItem("lv_onboarding_manual_target_income", JSON.stringify(hasManualTargetIncome));
  }, [hasManualTargetIncome]);

  useEffect(() => {
    sessionStorage.setItem("lv_onboarding_manual_state_pension", JSON.stringify(hasManualStatePension));
  }, [hasManualStatePension]);

  return (
    <div className="onboarding">
      <header className="onboarding__header">
        <h1>Vos paramètres personnels</h1>
        <p>
          Décrivez votre foyer et vos objectifs : LongView affine la projection en intégrant vos âges, vos proches et
          l'évolution de votre niveau de vie.
        </p>
      </header>

      <form className="onboarding__form" onSubmit={handleSubmit}>
        <section>
          <h2>Profil du foyer</h2>
          <div className="field-grid">
            <label>
              Situation familiale
              <select value={form.householdStatus} onChange={handleHouseholdStatusChange}>
                <option value="single">Je suis seul(e)</option>
                <option value="couple">En couple</option>
              </select>
            </label>
            <label>
              Nombre d&apos;enfants
              <input type="number" min={0} value={form.children.length} readOnly />
            </label>
          </div>

          <div className="onboarding__stack">
            {form.adults.map((adult, index) => (
              <div key={`adult-${index}`} className="onboarding__card">
                <div className="onboarding__card-header">
                  {adult.firstName || `Adulte ${index + 1}`}
                </div>
              <div className="field-grid field-grid--three">
                  <label>
                    Prénom
                    <input
                      value={adult.firstName}
                      onChange={(event) => updateAdult(index, "firstName", event.target.value)}
                    />
                  </label>
                  <label>
                    Âge actuel
                    <input
                      type="number"
                      min={18}
                      value={adult.currentAge}
                      onChange={(event) => updateAdult(index, "currentAge", event.target.value)}
                    />
                  </label>
                <label>
                  Revenu net mensuel (€)
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={adult.monthlyNetIncome ?? 0}
                    onChange={(event) => updateAdult(index, "monthlyNetIncome", event.target.value)}
                  />
                </label>
                </div>
              </div>
            ))}
          </div>

          <div className="onboarding__card">
            <div className="onboarding__card-header">Enfants & personnes à charge</div>
            {form.children.length === 0 ? (
              <p className="onboarding__muted">Ajoutez vos enfants pour intégrer leur départ du foyer dans la projection.</p>
            ) : (
              <div className="onboarding__stack">
                {form.children.map((child, index) => (
                  <div key={`child-${index}`} className="field-grid field-grid--two onboarding__inline">
                    <label>
                      Prénom
                      <input
                        value={child.firstName}
                        onChange={(event) => updateChild(index, "firstName", event.target.value)}
                      />
                    </label>
                    <label>
                      Âge actuel
                      <input
                        type="number"
                        min={0}
                        value={child.age}
                        onChange={(event) => updateChild(index, "age", event.target.value)}
                      />
                    </label>
                    <button type="button" className="onboarding__remove" onClick={() => removeChild(index)}>
                      Retirer
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button type="button" className="onboarding__add" onClick={addChild}>
              Ajouter un enfant
            </button>
          </div>
        </section>

        <section>
          <h2>Hypothèses de marché</h2>
          <p className="onboarding__muted">
            Ajustez les paramètres utilisés pour les simulations (rendements, volatilités, inflation, corrélations).
          </p>
          <div className="field-grid field-grid--two">
            <label>
              Inflation moyenne annuelle (%)
              <input
                type="number"
                step={0.01}
                value={form.marketAssumptions.inflationMean}
                onChange={(event) => updateInflationAssumption("inflationMean", event.target.value)}
              />
            </label>
            <label>
              Volatilité inflation (%)
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.marketAssumptions.inflationVolatility}
                onChange={(event) =>
                  updateInflationAssumption("inflationVolatility", event.target.value)
                }
              />
            </label>
          </div>
          <div className="onboarding__stack onboarding__market-grid">
            {assetClassOrder.map((assetKey) => {
              const assumption = form.marketAssumptions.assetClasses[assetKey];
              return (
                <div key={assetKey} className="field-grid field-grid--three onboarding__inline">
                  <label>
                    Libellé
                    <input
                      value={assumption.label}
                      onChange={(event) =>
                        updateAssetClassAssumption(assetKey, "label", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Rendement attendu (%)
                    <input
                      type="number"
                      step={0.01}
                      value={assumption.expectedReturn}
                      onChange={(event) =>
                        updateAssetClassAssumption(assetKey, "expectedReturn", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Volatilité annuelle (%)
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={assumption.volatility}
                      onChange={(event) =>
                        updateAssetClassAssumption(assetKey, "volatility", event.target.value)
                      }
                    />
                  </label>
                </div>
              );
            })}
          </div>
          <div className="onboarding__correlations">
            {correlationPairs.map(([assetA, assetB]) => (
              <label key={`${assetA}-${assetB}`}>
                Corrélation {form.marketAssumptions.assetClasses[assetA].label} /{" "}
                {form.marketAssumptions.assetClasses[assetB].label}
                <input
                  type="number"
                  min={-1}
                  max={1}
                  step={0.05}
                  value={
                    form.marketAssumptions.correlations[assetA]?.[assetB] ??
                    DEFAULT_MARKET_ASSUMPTIONS.correlations[assetA][assetB]
                  }
                  onChange={(event) => updateCorrelation(assetA, assetB, event.target.value)}
                />
              </label>
            ))}
          </div>
        </section>

        <section>
          <h2>Horizon de projection</h2>
          <div className="field-grid">
            <label>
              Nom de la simulation
              <input name="name" value={form.name} onChange={handleTextChange} />
            </label>
          </div>

          {form.children.length > 0 && (
            <div className="onboarding__card onboarding__card--secondary">
              <div className="onboarding__card-header">Départ du foyer des enfants</div>
              <div className="onboarding__stack">
                {form.children.map((child, index) => (
                  <div key={`child-horizon-${index}`} className="field-grid field-grid--three onboarding__inline">
                    <label>
                      {child.firstName || `Enfant ${index + 1}`}
                      <input
                        value={child.firstName}
                        onChange={(event) => updateChild(index, "firstName", event.target.value)}
                      />
                    </label>
                    <label>
                      Âge actuel
                      <input
                        type="number"
                        min={0}
                        value={child.age}
                        onChange={(event) => updateChild(index, "age", event.target.value)}
                      />
                    </label>
                    <label>
                      Départ du foyer (âge)
                      <input
                        type="number"
                        min={Math.max(child.age + 1, 16)}
                        value={child.departureAge ?? ""}
                        onChange={(event) => updateChild(index, "departureAge", event.target.value)}
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="onboarding__stack">
            {form.adults.map((adult, index) => (
              <div key={`horizon-${index}`} className="field-grid field-grid--two onboarding__horizon">
                <label>
                  {adult.firstName || `Adulte ${index + 1}`} — départ à la retraite
                  <input
                    type="number"
                    min={adult.currentAge}
                    value={adult.retirementAge}
                    onChange={(event) => updateAdult(index, "retirementAge", event.target.value)}
                  />
                </label>
                <label>
                  Espérance de vie (projection)
                  <input
                    type="number"
                    min={adult.retirementAge}
                    value={adult.lifeExpectancy}
                    onChange={(event) => updateAdult(index, "lifeExpectancy", event.target.value)}
                  />
                </label>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2>Charges mensuelles</h2>
          <p className="onboarding__muted">
            Renseignez vos charges fixes actuelles et leur échéance. Elles seront prises en compte dans l'effort
            d'épargne recommandé.
          </p>
          <div className="onboarding__stack">
            {form.householdCharges.map((charge) => (
              <div key={charge.id} className="field-grid field-grid--four onboarding__inline">
                <label>
                  Type
                  <select
                    value={charge.category}
                    onChange={(event) => updateHouseholdCharge(charge.id, "category", event.target.value)}
                  >
                    <option value="housing_loan">Prêt immobilier</option>
                    <option value="consumer_loan">Prêt consommation</option>
                    <option value="pension">Pension / Rentes</option>
                    <option value="other">Autre charge</option>
                  </select>
                </label>
                <label>
                  Libellé
                  <input
                    value={charge.label}
                    onChange={(event) => updateHouseholdCharge(charge.id, "label", event.target.value)}
                  />
                </label>
                <label>
                  Montant mensuel (€)
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={charge.monthlyAmount}
                    onChange={(event) => updateHouseholdCharge(charge.id, "monthlyAmount", event.target.value)}
                  />
                </label>
                <label>
                  Fin prévue (âge)
                  <input
                    type="number"
                    min={primaryAdult?.currentAge ?? 18}
                    value={charge.untilAge ?? ""}
                    onChange={(event) => updateHouseholdCharge(charge.id, "untilAge", event.target.value)}
                  />
                </label>
                <button type="button" className="onboarding__remove" onClick={() => removeHouseholdCharge(charge.id)}>
                  Retirer
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="onboarding__add" onClick={addHouseholdCharge}>
            Ajouter une charge
          </button>
          {form.children.length > 0 && (
            <div className="onboarding__card onboarding__card--secondary onboarding__child-charges">
              <div className="onboarding__card-header">Charges liées aux enfants</div>
              <div className="onboarding__stack">
                {form.children.map((child, index) => (
                  <div key={`child-charge-${index}`} className="field-grid field-grid--two onboarding__inline">
                    <label>
                      {child.firstName || `Enfant ${index + 1}`} — charge mensuelle (€)
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={form.childCharges[index]?.monthlyAmount ?? 0}
                        onChange={(event) => updateChildChargeAmount(index, event.target.value)}
                      />
                    </label>
                    <label>
                      Fin prévue (âge)
                      <input
                        type="number"
                        min={child.age + 1}
                        value={form.childCharges[index]?.untilAge ?? child.departureAge ?? ""}
                        onChange={(event) => updateChild(index, "departureAge", event.target.value)}
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section>
          <h2>Profil de dépense dans le temps</h2>
          <p className="onboarding__muted">
            Ajustez la part de vos dépenses de vie selon les étapes clés : la simulation modulera les besoins de cash-flow.
          </p>
          <div className="onboarding__stack">
            {form.spendingProfile.map((phase, index) => (
              <div key={`phase-${index}`} className="field-grid field-grid--four onboarding__inline">
                <label>
                  Nom de la phase
                  <input
                    value={phase.label}
                    onChange={(event) => updateSpendingPhase(index, "label", event.target.value)}
                  />
                </label>
                <label>
                  Début (âge)
                  <input
                    type="number"
                    min={0}
                    value={phase.fromAge}
                    onChange={(event) => updateSpendingPhase(index, "fromAge", event.target.value)}
                  />
                </label>
                <label>
                  Fin (âge)
                  <input
                    type="number"
                    min={phase.fromAge}
                    value={phase.toAge}
                    onChange={(event) => updateSpendingPhase(index, "toAge", event.target.value)}
                  />
                </label>
                <label>
                  Intensité des dépenses (%)
                  <input
                    type="number"
                    min={0}
                    max={150}
                    step={5}
                    value={Math.round(phase.spendingRatio * 100)}
                    onChange={(event) =>
                      updateSpendingPhase(index, "spendingRatio", (Number(event.target.value) || 0) / 100)
                    }
                  />
                </label>
                <button type="button" className="onboarding__remove" onClick={() => removeSpendingPhase(index)}>
                  Retirer
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="onboarding__add" onClick={addSpendingPhase}>
            Ajouter une phase de dépenses
          </button>
        </section>

        <section>
          <h2>Profils d'épargne durant la vie active</h2>
          <p className="onboarding__muted">
            Paramétrez vos apports déjà prévus : ils seront capitalisés et déduits de l'effort d'épargne recommandé.
          </p>
          <div className="onboarding__stack">
            {form.savingsPhases.map((phase, index) => (
              <div key={`savings-${index}`} className="field-grid field-grid--four onboarding__inline">
                <label>
                  Nom de la phase
                  <input
                    value={phase.label}
                    onChange={(event) => updateSavingsPhase(index, "label", event.target.value)}
                  />
                </label>
                <label>
                  Début (âge)
                  <input
                    type="number"
                    min={18}
                    value={phase.fromAge}
                    onChange={(event) => updateSavingsPhase(index, "fromAge", event.target.value)}
                  />
                </label>
                <label>
                  Fin (âge)
                  <input
                    type="number"
                    min={phase.fromAge}
                    value={phase.toAge}
                    onChange={(event) => updateSavingsPhase(index, "toAge", event.target.value)}
                  />
                </label>
                <label>
                  Cotisation mensuelle (€)
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={phase.monthlyContribution}
                    onChange={(event) => updateSavingsPhase(index, "monthlyContribution", event.target.value)}
                  />
                </label>
                <button type="button" className="onboarding__remove" onClick={() => removeSavingsPhase(index)}>
                  Retirer
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="onboarding__add" onClick={addSavingsPhase}>
            Ajouter une phase d'épargne
          </button>
        </section>

        <section>
          <h2>Revenus souhaités & charges</h2>
          <div className="field-grid">
            <label>
              Revenu net mensuel cible
              <input
                name="targetMonthlyIncome"
                type="number"
                min={0}
                step={0.01}
                value={form.targetMonthlyIncome ?? ""}
                onChange={handleNumberChange}
              />
            </label>
            <label>
              Pension de l&apos;État estimée
              <input
                name="statePensionMonthlyIncome"
                type="number"
                min={0}
                step={0.01}
                value={form.statePensionMonthlyIncome ?? ""}
                onChange={handleNumberChange}
              />
            </label>
          </div>
          <p className="onboarding__hint">
            Pré-calcul :{" "}
            <strong>{recommendedTargetIncome.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €</strong>
            {hasManualTargetIncome ? (
              <button
                type="button"
                className="onboarding__link"
                onClick={handleApplyRecommendedTargetIncome}
              >
                Utiliser le pré-calcul
              </button>
            ) : (
              <span>(appliqué automatiquement)</span>
            )}
          </p>
          <div className="onboarding__hint">
            Pension suggérée (50 % revenus nets) :{" "}
            <strong>{suggestedStatePension.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €</strong>
          </div>
          <div className="onboarding__hint-breakdown">
            <span>
              Revenus nets foyer :{" "}
              {targetIncomeInputs.totalAdultIncome.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €
            </span>
            <span>
              − Épargne programmée :{" "}
              {averagePlannedContribution.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €
            </span>
            <span>
              − Charges enfants :{" "}
              {targetIncomeInputs.childSupport.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €
            </span>
            <span>
              − Pensions :{" "}
              {targetIncomeInputs.pensionCharges.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €
            </span>
            <span>
              − Prêts immobiliers :{" "}
              {targetIncomeInputs.housingLoanCharges.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €
            </span>
          </div>
        </section>

        <section>
          <h2>Revenus complémentaires</h2>
          <div className="onboarding__stack">
            {additionalIncome.map((income, index) => (
              <div key={`${income.label}-${index}`} className="income-line">
                <label>
                  Libellé
                  <input
                    value={income.label}
                    onChange={(event) => handleIncomeChange(index, "label", event.target.value)}
                  />
                </label>
                <label>
                  Montant mensuel (€)
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={income.monthlyAmount}
                    onChange={(event) => handleIncomeChange(index, "monthlyAmount", event.target.value)}
                  />
                </label>
                <label>
                  Début (âge)
                  <input
                    type="number"
                    min={primaryAdult?.currentAge ?? 0}
                    value={income.startAge ?? ""}
                    onChange={(event) => handleIncomeChange(index, "startAge", event.target.value)}
                  />
                </label>
                <button type="button" onClick={() => removeIncomeStream(index)}>
                  Retirer
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="onboarding__add" onClick={addIncomeStream}>
            Ajouter un revenu complémentaire
          </button>
        </section>

        <section>
          <h2>Épargne & allocation</h2>
          <p className="onboarding__muted">
            Déclarez vos supports (montant actuel, titulaire, répartition). Indiquez vos versements mensuels, la part
            estimée en pourcentage s&apos;adaptera automatiquement selon vos phases d&apos;épargne.
          </p>
          <div className="onboarding__stack">
            {form.investmentAccounts.map((account) => (
              <div key={account.id} className="onboarding__card onboarding__investment">
                <div className="onboarding__investment-header">
                  <span>{account.label}</span>
                  <button
                    type="button"
                    className="onboarding__remove"
                    onClick={() => removeInvestmentAccount(account.id)}
                  >
                    Retirer
                  </button>
                </div>
                <div className="field-grid field-grid--five">
                  <label>
                    Type de support
                    <select
                      value={account.type}
                      onChange={(event) => handleInvestmentAccountTypeChange(account.id, event.target.value as InvestmentAccountType)}
                    >
                      {Object.entries(investmentAccountTypeLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Nom du support
                    <input
                      value={account.label}
                      onChange={(event) => updateInvestmentAccountField(account.id, "label", event.target.value)}
                    />
                  </label>
                  <label>
                    Titulaire
                    <select
                      value={account.ownerName ?? "Commun"}
                      onChange={(event) => updateInvestmentAccountField(account.id, "ownerName", event.target.value)}
                    >
                      <option value="Commun">Commun</option>
                      {form.adults.map((adult) => (
                        <option key={adult.firstName} value={adult.firstName}>
                          {adult.firstName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Montant actuel (€)
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={account.currentAmount}
                      onChange={(event) =>
                        updateInvestmentAllocation(account.id, "currentAmount", Number(event.target.value) || 0)
                      }
                    />
                  </label>
                  <label>
                    Cotisation mensuelle programmée (€)
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={account.monthlyContribution ?? 0}
                      onChange={(event) =>
                        updateInvestmentAccountContribution(account.id, Number(event.target.value) || 0)
                      }
                    />
                  </label>
                </div>
                <p className="onboarding__muted">
                  Cotisation estimée :{" "}
                  <strong>
                    {(
                      typeof account.monthlyContributionShare === "number"
                        ? account.monthlyContributionShare
                        : 0
                    ).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %
                  </strong>
                  {account.monthlyContribution
                    ? ` (${account.monthlyContribution.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €/mois)`
                    : ""}
                </p>
                {(account.type === "per" || account.type === "assurance_vie") && (
                  <div className="field-grid field-grid--two onboarding__investment-split">
                    <label>
                      Actions (%)
                      <input
                        type="number"
                        min={0}
                        max={100}
                      step={0.01}
                        value={account.allocationActions ?? 0}
                        onChange={(event) =>
                          updateInvestmentAllocation(
                            account.id,
                            "allocationActions",
                            Number(event.target.value) || 0,
                          )
                        }
                      />
                    </label>
                    <label>
                      Obligations (%)
                      <input
                        type="number"
                        min={0}
                        max={100}
                      step={0.01}
                        value={account.allocationObligations ?? 0}
                        onChange={(event) =>
                          updateInvestmentAllocation(
                            account.id,
                            "allocationObligations",
                            Number(event.target.value) || 0,
                          )
                        }
                      />
                    </label>
                  </div>
                )}
                {account.type === "livret" && (
                  <div className="onboarding__investment-livret">
                    <p>Répartition par livret (%)</p>
                    <div className="onboarding__stack">
                      {(account.livretBreakdown ?? []).map((breakdown) => (
                        <div key={breakdown.id} className="field-grid field-grid--two onboarding__inline">
                          <label>
                            Nom du livret
                            <input
                              value={breakdown.label}
                              onChange={(event) =>
                                updateLivretBreakdown(account.id, breakdown.id, "label", event.target.value)
                              }
                            />
                          </label>
                          <label>
                            Pourcentage
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={0.01}
                              value={breakdown.percentage}
                              onChange={(event) =>
                                updateLivretBreakdown(
                                  account.id,
                                  breakdown.id,
                                  "percentage",
                                  event.target.value,
                                )
                              }
                            />
                          </label>
                          <button
                            type="button"
                            className="onboarding__remove"
                            onClick={() => removeLivretBreakdown(account.id, breakdown.id)}
                          >
                            Retirer
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="onboarding__add onboarding__add--inline"
                      onClick={() => addLivretBreakdownLine(account.id)}
                    >
                      Ajouter un livret
                    </button>
                  </div>
                )}
                {account.type === "crypto" && (
                  <div className="field-grid field-grid--one">
                    <label>
                      Performance attendue (%, annuel)
                      <input
                        type="number"
                        step={0.01}
                        value={
                          account.expectedPerformance ??
                          form.marketAssumptions.assetClasses.crypto.expectedReturn
                        }
                        onChange={(event) =>
                          updateInvestmentAllocation(
                            account.id,
                            "expectedPerformance",
                            Number(event.target.value) || 0,
                          )
                        }
                      />
                    </label>
                  </div>
                )}
                {account.type === "autre" && (
                  <div className="field-grid field-grid--one">
                    <label>
                      Performance attendue (%, annuel)
                      <input
                        type="number"
                        step={0.01}
                        value={
                          account.expectedPerformance ??
                          form.marketAssumptions.assetClasses.other.expectedReturn
                        }
                        onChange={(event) =>
                          updateInvestmentAllocation(
                            account.id,
                            "expectedPerformance",
                            Number(event.target.value) || 0,
                          )
                        }
                      />
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="onboarding__add-account">
            <label>
              Type à ajouter
              <select value={newAccountType} onChange={(event) => setNewAccountType(event.target.value as InvestmentAccountType)}>
                {Object.entries(investmentAccountTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Titulaire
              <select value={newAccountOwner} onChange={(event) => setNewAccountOwner(event.target.value)}>
                <option value="Commun">Commun</option>
                {form.adults.map((adult) => (
                  <option key={adult.firstName} value={adult.firstName}>
                    {adult.firstName}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="onboarding__add"
              onClick={() => addInvestmentAccount(newAccountType)}
            >
              Ajouter un support
            </button>
          </div>
        </section>

        <aside className="onboarding__summary">
          <h3>Projection rapide</h3>
          <ul>
            <li>
              Épargne mensuelle recommandée :{" "}
              <strong>
                {simulationPreview.requiredMonthlySavings.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €
              </strong>
            </li>
            <li>
              Capital estimé à la retraite :{" "}
              <strong>
                {simulationPreview.projectedCapitalAtRetirement.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €
              </strong>
            </li>
            <li>
              Capital restant à {(primaryAdult?.lifeExpectancy ?? 0).toLocaleString("fr-FR")} ans :{" "}
              <strong>
                {simulationPreview.projectedCapitalAtLifeExpectancy.toLocaleString("fr-FR", {
                  maximumFractionDigits: 0,
                })} €
              </strong>
            </li>
            <li>
              Probabilité de réussite : <strong>{Math.round(simulationPreview.successProbability)} %</strong>
            </li>
            {form.savingsPhases.length > 0 && (
              <li>
                Épargne déjà programmée (moyenne) :{" "}
                <strong>{averagePlannedContribution.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €</strong>
              </li>
            )}
            {investmentAccountSummaries.length > 0 && (
              <li>
                Cotisations mensuelles programmées :{" "}
                <strong>
                  {totalInvestmentContribution.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €
                </strong>
              </li>
            )}
            {householdChargeSummaries.length > 0 && (
              <li>
                Charges mensuelles actuelles :{" "}
                <strong>{totalHouseholdCharges.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €</strong>
              </li>
            )}
            <li>
              Revenu cible recommandé :{" "}
              <strong>{recommendedTargetIncome.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €</strong>
              {hasManualTargetIncome ? " (valeur modifiée manuellement)" : ""}
            </li>
            <li className="onboarding__summary-detail">
              <span>↳ Revenus nets foyer :</span>
              <strong>{targetIncomeInputs.totalAdultIncome.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €</strong>
            </li>
            <li className="onboarding__summary-detail">
              <span>↳ Épargne programmée :</span>
              <strong>{averagePlannedContribution.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €</strong>
            </li>
            <li className="onboarding__summary-detail">
              <span>↳ Charges enfants :</span>
              <strong>{targetIncomeInputs.childSupport.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €</strong>
            </li>
            <li className="onboarding__summary-detail">
              <span>↳ Pensions :</span>
              <strong>{targetIncomeInputs.pensionCharges.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €</strong>
            </li>
            <li className="onboarding__summary-detail">
              <span>↳ Prêts immobiliers :</span>
              <strong>{targetIncomeInputs.housingLoanCharges.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €</strong>
            </li>
            <li>
              Inflation attendue :{" "}
              <strong>
                {form.marketAssumptions.inflationMean}% (σ {form.marketAssumptions.inflationVolatility}%)
              </strong>
            </li>
            {activeComplementaryIncome > 0 && (
              <li>
                Revenus complémentaires actifs :{" "}
                <strong>
                  {activeComplementaryIncome.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €
                </strong>
              </li>
            )}
          </ul>
          <div className="onboarding__summary-extra">
            <p>Adulte(s) considéré(s) :</p>
            <ul>
              {form.adults.map((adult, index) => (
                <li key={`summary-adult-${index}`}>
                  {adult.firstName || `Adulte ${index + 1}`} — retraite {adult.retirementAge} ans, espérance {adult.lifeExpectancy} ans
                  {typeof adult.monthlyNetIncome === "number"
                    ? ` · ${adult.monthlyNetIncome.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €/mois`
                    : ""}
                </li>
              ))}
            </ul>
            {childSummaries.length > 0 && (
              <>
                <p>Enfants & départ du foyer :</p>
                <ul>
                  {childSummaries.map((child, index) => (
                    <li key={`summary-child-${index}`}>
                      {child.label} · {child.age} ans aujourd&apos;hui, départ prévu à {child.departureAge ?? "—"} ans ·{" "}
                      {child.monthlyCharge.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €/mois
                    </li>
                  ))}
                </ul>
              </>
            )}
            {form.savingsPhases.length > 0 && (
              <>
                <p>Phases d&apos;épargne :</p>
                <ul>
                  {form.savingsPhases.map((phase, index) => (
                    <li key={`summary-savings-${index}`}>
                      {phase.label} · {phase.fromAge} - {phase.toAge} ans · {phase.monthlyContribution.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €/mois
                    </li>
                  ))}
                </ul>
              </>
            )}
            {incomeSummaries.length > 0 && (
              <>
                <p>Revenus complémentaires :</p>
                <ul>
                  {incomeSummaries.map((income, index) => (
                    <li key={`summary-income-${index}`}>
                      {income.label} · {income.monthlyAmount.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €/mois · début {income.startAge} ans
                    </li>
                  ))}
                </ul>
              </>
            )}
            {investmentAccountSummaries.length > 0 && (
              <>
                <p>Supports d&apos;épargne :</p>
                <ul>
                  {investmentAccountSummaries.map((account) => (
                    <li key={`summary-account-${account.id}`}>
                      {account.label} ({account.typeLabel}
                      {account.ownerName ? ` · ${account.ownerName}` : ""}) ·{" "}
                      {account.currentAmount.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} € ·{" "}
                      {account.monthlyContribution.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €/mois
                      {typeof account.monthlyContributionShare === "number"
                        ? ` (${account.monthlyContributionShare.toLocaleString("fr-FR", {
                            maximumFractionDigits: 1,
                          })} %)`
                        : ""}
                      {["per", "assurance_vie"].includes(account.type) &&
                        ` · ${account.allocationActions ?? 0}% actions / ${account.allocationObligations ?? 0}% obligations`}
                      {account.type === "livret" &&
                        account.livretBreakdown.length > 0 &&
                        ` · ${account.livretBreakdown
                          .map((breakdown) => `${breakdown.label}: ${breakdown.percentage}%`)
                          .join(" | ")}`}
                      {account.type === "crypto" &&
                        ` · Performance ${
                          account.expectedPerformance ??
                          form.marketAssumptions.assetClasses.crypto.expectedReturn
                        }%`}
                      {account.type === "autre" &&
                        ` · Performance ${
                          account.expectedPerformance ??
                          form.marketAssumptions.assetClasses.other.expectedReturn
                        }%`}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {householdChargeSummaries.length > 0 && (
              <>
                <p>Charges mensuelles :</p>
                <ul>
                  {householdChargeSummaries.map((charge, index) => (
                    <li key={`summary-charge-${index}`}>
                      {charge.label} ({charge.category}) · {charge.monthlyAmount.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} €/mois
                      {charge.untilAge ? ` · fin ${charge.untilAge} ans` : ""}
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p>Profil de dépense :</p>
            <ul>
              {form.spendingProfile.map((phase, index) => (
                <li key={`summary-phase-${index}`}>
                  {phase.label} · {phase.fromAge} - {phase.toAge} ans · {Math.round(phase.spendingRatio * 100)} %
                </li>
              ))}
            </ul>
            <p>Hypothèses de marché :</p>
            <ul>
              <li>
                Inflation : {form.marketAssumptions.inflationMean}% · σ {form.marketAssumptions.inflationVolatility}%
              </li>
              {assetClassOrder.map((assetKey) => {
                const assumption = form.marketAssumptions.assetClasses[assetKey];
                return (
                  <li key={`summary-market-${assetKey}`}>
                    {assumption.label} · {assumption.expectedReturn}% attendu · σ {assumption.volatility}%
                  </li>
                );
              })}
            </ul>
            <p>Corrélations :</p>
            <ul>
              {correlationPairs.map(([assetA, assetB]) => (
                <li key={`summary-corr-${assetA}-${assetB}`}>
                  {form.marketAssumptions.assetClasses[assetA].label} /{" "}
                  {form.marketAssumptions.assetClasses[assetB].label} :{" "}
                  {(
                    form.marketAssumptions.correlations[assetA]?.[assetB] ??
                    DEFAULT_MARKET_ASSUMPTIONS.correlations[assetA][assetB]
                  ).toFixed(2)}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="onboarding__actions">
          <div className="onboarding__cgu-acceptance">
            <label className="onboarding__cgu-checkbox">
              <input
                type="checkbox"
                checked={cguAccepted}
                onChange={(e) => {
                  setCguAccepted(e.target.checked);
                  sessionStorage.setItem("lv_cgu_accepted", String(e.target.checked));
                }}
                required
              />
              <span>
                J'accepte les{" "}
                <Link to="/cgu" target="_blank" className="onboarding__cgu-link">
                  Conditions Générales d'Utilisation
                </Link>
                . Je comprends que LongView est un outil de simulation et ne constitue pas un
                conseil financier. Je m'engage à vérifier les résultats et à consulter un
                professionnel qualifié avant toute décision d'investissement.
              </span>
            </label>
          </div>
          <button type="submit" disabled={isSubmitting || !cguAccepted}>
            {user ? "Enregistrer ma simulation" : "Afficher la simulation"}
          </button>
          {isSubmitting && (
            <div className="onboarding__loading" role="status" aria-live="polite">
              <span className="onboarding__spinner" aria-hidden="true" />
              <span>
                Optimisation Monte Carlo en cours…
                {optimizationMutation.isPending && " (capitalisation & retraite)"}
                {mutation.isPending && user && " (enregistrement)"}
              </span>
            </div>
          )}
          {mutation.isError && (
            <p className="onboarding__error">
              Une erreur est survenue. Vérifiez vos informations ou réessayez plus tard.
            </p>
          )}
          {optimizationMutation.isError && (
            <p className="onboarding__error">
              L&apos;optimisation Monte Carlo n&apos;a pas pu être exécutée.
            </p>
          )}
        </div>
      </form>
    </div>
  );
}

