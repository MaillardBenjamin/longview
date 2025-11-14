import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";

import ReactECharts from "echarts-for-react";
import { useAuth } from "@/hooks/useAuth";
import { listSimulations, simulateMonteCarlo } from "@/services/simulations";
import type {
  AdditionalIncome,
  AdultProfile,
  ChildProfile,
  ChildCharge,
  HouseholdCharge,
  InvestmentAccount,
  MarketAssumptions,
  MonteCarloResult,
  OptimizationStep,
  RetirementScenarioResults,
  Simulation,
  SimulationInput,
  SimulationResult,
  SpendingPhase,
  SavingsPhase,
} from "@/types/simulation";
import "./SimulationResultPage.css";

interface LocationState {
  simulation: Simulation | null;
  result?: SimulationResult;
  draft?: SimulationInput;
  monteCarloResult?: MonteCarloResult;
  retirementMonteCarloResult?: RetirementScenarioResults;
  recommendedSavings?: number;
  optimizationSteps?: OptimizationStep[];
  optimizationScale?: number;
  optimizationResidualError?: number;
  optimizationResidualErrorRatio?: number;
}

function formatCurrency(value: number, fractionDigits = 0) {
  return value.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

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

export function SimulationResultPage() {
  const location = useLocation();
const navigationState = (location.state as LocationState) ?? null;
const storedState = useMemo<LocationState | null>(() => {
    const raw = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("lv_last_simulation_result") : null;
    if (!raw) return null;
    try {
      return JSON.parse(raw) as LocationState;
    } catch (error) {
      console.warn("Impossible de restaurer la simulation depuis le stockage de session.", error);
      return null;
    }
  }, []);
  const locationState = navigationState ?? storedState;
  const { user } = useAuth();

  const { data: simulations } = useQuery({
    queryKey: ["simulations"],
    queryFn: listSimulations,
    enabled: Boolean(user) && !locationState?.simulation,
  });

  const simulation = locationState?.simulation ?? simulations?.[0] ?? null;
  const draft = locationState?.draft ?? null;
  const simulationRecord = simulation as unknown as Record<string, unknown> | null;
  const resultFromSimulation =
    (simulationRecord?.resultsSnapshot as SimulationResult | undefined) ??
    (simulationRecord?.results_snapshot as SimulationResult | undefined);
  const result = locationState?.result ?? resultFromSimulation ?? null;

  if (!simulation && !result && !draft) {
    return (
      <div className="results results--empty">
        <h1>Aucune simulation disponible</h1>
        <p>Commencez par renseigner vos informations pour projeter votre retraite.</p>
      </div>
    );
  }
  const getSimulationValue = <T,>(camel: string, snake: string): T | undefined => {
    if (!simulationRecord) return undefined;
    return (simulationRecord[camel] as T | undefined) ?? (simulationRecord[snake] as T | undefined);
  };

  const inputsSnapshot =
    (simulationRecord?.inputsSnapshot as Record<string, unknown> | undefined) ??
    (simulationRecord?.inputs_snapshot as Record<string, unknown> | undefined) ??
    {};

  const adults =
    draft?.adults ??
    ((inputsSnapshot?.adults as AdultProfile[] | undefined) ??
      []);

  const children =
    draft?.children ??
    ((inputsSnapshot?.children as ChildProfile[] | undefined) ??
      []);

  const spendingProfile =
    draft?.spendingProfile ??
    ((inputsSnapshot?.spending_profile as SpendingPhase[] | undefined) ??
      []);

  const householdCharges =
    draft?.householdCharges ??
    ((inputsSnapshot?.household_charges as HouseholdCharge[] | undefined) ??
      []);

  const childCharges =
    draft?.childCharges ??
    ((inputsSnapshot?.child_charges as ChildCharge[] | undefined) ??
      []);

  const investmentAccounts =
    draft?.investmentAccounts ??
    ((inputsSnapshot?.investment_accounts as InvestmentAccount[] | undefined) ??
      []);

  const savingsPhases =
    draft?.savingsPhases ??
    ((inputsSnapshot?.savings_phases as SavingsPhase[] | undefined) ??
      []);

const additionalIncomeStreams =
  draft?.additionalIncomeStreams ??
  ((inputsSnapshot?.additional_income_streams as AdditionalIncome[] | undefined) ??
    []);

const marketAssumptions =
  draft?.marketAssumptions ??
  ((inputsSnapshot?.market_assumptions as MarketAssumptions | undefined) ??
    DEFAULT_MARKET_ASSUMPTIONS);

  const householdStatus =
    draft?.householdStatus ??
    ((inputsSnapshot?.household_status as string | undefined) ?? undefined);

  const targetMonthlyIncome =
    draft?.targetMonthlyIncome ??
    getSimulationValue<number>("targetMonthlyIncome", "target_monthly_income") ??
    0;

  const statePensionMonthlyIncome =
    draft?.statePensionMonthlyIncome ??
    getSimulationValue<number>("statePensionMonthlyIncome", "state_pension_monthly_income") ??
    0;

  const monteCarloFromState = locationState?.monteCarloResult ?? null;
  const retirementMonteCarloFromState = locationState?.retirementMonteCarloResult ?? null;

  const capitalizationInput = useMemo<SimulationInput | null>(() => {
    if (monteCarloFromState) {
      return null;
    }
    if (draft) {
      return draft;
    }
    if (
      adults.length ||
      investmentAccounts.length ||
      savingsPhases.length ||
      marketAssumptions
    ) {
      return {
        name: simulation?.name ?? "Simulation",
        householdStatus: (householdStatus as SimulationInput["householdStatus"]) ?? "single",
        adults,
        children,
        spendingProfile,
        savingsPhases,
        householdCharges,
        childCharges,
        investmentAccounts,
        marketAssumptions,
        targetMonthlyIncome,
        statePensionMonthlyIncome,
        additionalIncomeStreams,
        housingLoanEndAge: getSimulationValue<number>("housingLoanEndAge", "housing_loan_end_age"),
        dependentsDepartureAge: getSimulationValue<number>(
          "dependentsDepartureAge",
          "dependents_departure_age",
        ),
      };
    }
    return null;
  }, [
    monteCarloFromState,
    retirementMonteCarloFromState,
    draft,
    adults,
    children,
    spendingProfile,
    savingsPhases,
    householdCharges,
    childCharges,
    investmentAccounts,
    marketAssumptions,
    targetMonthlyIncome,
    statePensionMonthlyIncome,
    additionalIncomeStreams,
    simulation,
    householdStatus,
  ]);

  const capitalizationInputKey = useMemo(
    () => (capitalizationInput ? JSON.stringify(capitalizationInput) : null),
    [capitalizationInput],
  );

  const {
    data: fetchedMonteCarlo,
    isLoading: monteCarloLoading,
    isError: monteCarloError,
  } = useQuery({
    queryKey: ["monte-carlo", capitalizationInputKey],
    queryFn: () => simulateMonteCarlo(capitalizationInput!),
    enabled: !monteCarloFromState && Boolean(capitalizationInput),
  });

  const monteCarloResult = monteCarloFromState ?? fetchedMonteCarlo ?? null;
  const retirementMonteCarloResult = retirementMonteCarloFromState ?? null;
  const recommendedSavings =
    locationState?.recommendedSavings ?? result?.requiredMonthlySavings ?? 0;
  const optimizationSteps = locationState?.optimizationSteps ?? [];
  const optimizationScale = locationState?.optimizationScale;
  const optimizationResidualError = locationState?.optimizationResidualError ?? null;
  const optimizationResidualErrorRatio = locationState?.optimizationResidualErrorRatio ?? null;

  useEffect(() => {
    if (!simulation && !result && !draft && !monteCarloResult && !retirementMonteCarloResult) {
      return;
    }
    const payload: LocationState = {
      simulation: simulation ?? null,
      result: result ?? undefined,
      draft: draft ?? undefined,
      monteCarloResult: monteCarloResult ?? undefined,
      retirementMonteCarloResult: retirementMonteCarloResult ?? undefined,
      recommendedSavings: recommendedSavings ?? undefined,
      optimizationSteps: optimizationSteps.length > 0 ? optimizationSteps : undefined,
      optimizationScale: optimizationScale ?? undefined,
      optimizationResidualError: optimizationResidualError ?? undefined,
      optimizationResidualErrorRatio: optimizationResidualErrorRatio ?? undefined,
    };
    try {
      sessionStorage.setItem("lv_last_simulation_result", JSON.stringify(payload));
    } catch (error) {
      console.warn("Impossible de sauvegarder la simulation dans le stockage de session.", error);
    }
  }, [simulation, result, draft, monteCarloResult, retirementMonteCarloResult]);

  const primaryAdult = adults[0];
  const primaryRetirementAge =
    primaryAdult?.retirementAge ??
    draft?.adults?.[0]?.retirementAge ??
    getSimulationValue<number>("retirementAge", "retirement_age");
  const primaryLifeExpectancy =
    primaryAdult?.lifeExpectancy ??
    draft?.adults?.[0]?.lifeExpectancy ??
    getSimulationValue<number>("lifeExpectancy", "life_expectancy");
  const headerTitle = simulationRecord?.name as string | undefined ?? draft?.name ?? "Votre projection";

  const capitalAtRetirement =
    monteCarloResult?.medianFinalCapital ?? result?.projectedCapitalAtRetirement ?? 0;

  return (
    <div className="results">
      <header>
        <h1>{headerTitle}</h1>
        <p>
          Visualisez l’équilibre entre vos capacités d’épargne, les revenus attendus et le capital nécessaire pour
          maintenir votre niveau de vie.
        </p>
      </header>

      <section className="results__grid">
        {result ? (
          <>
            <article className="results__card results__card--primary">
              <h2>Épargne minimum</h2>
              <p className="results__value">{formatCurrency(recommendedSavings)}</p>
              <p className="results__note">
                par mois jusqu’à {primaryRetirementAge ?? "—"} ans
                {typeof optimizationScale === "number"
                  ? ` · facteur ${optimizationScale.toFixed(2)}`
                  : ""}
                {typeof optimizationResidualError === "number" && (
                  <>
                    {" "}
                    · écart résiduel {formatCurrency(optimizationResidualError, 0)}
                  </>
                )}
                {typeof optimizationResidualErrorRatio === "number" && (
                  <>
                    {" "}
                    ({(optimizationResidualErrorRatio * 100).toFixed(2)} %)
                  </>
                )}
              </p>
            </article>

            <article className="results__card">
              <h3>Capital estimé à la retraite</h3>
              <p className="results__value-sm">{formatCurrency(capitalAtRetirement)}</p>
              {monteCarloResult && (
                <p className="results__note">Médiane de la simulation Monte Carlo</p>
              )}
            </article>

            <article className="results__card">
              <h3>Reste à {primaryLifeExpectancy ?? "—"} ans</h3>
              <p className="results__value-sm">{formatCurrency(result.projectedCapitalAtLifeExpectancy)}</p>
              {retirementMonteCarloResult && (
                <p className="results__note">
                  Médiane Monte Carlo: {formatCurrency(retirementMonteCarloResult.median.medianFinalCapital)}
                </p>
              )}
            </article>

            <article className="results__card">
              <h3>Probabilité de réussite</h3>
              <p className="results__value-sm">{Math.round(result.successProbability)}%</p>
            </article>
          </>
        ) : (
          <article className="results__card results__card--placeholder">
            <h2>Analyse personnalisée</h2>
            <p>Connectez-vous pour enregistrer vos projections et recevoir une analyse complète.</p>
          </article>
        )}
      </section>

      <CombinedTrajectorySection
        accumulation={monteCarloResult}
        retirement={retirementMonteCarloResult}
      />
      <MonteCarloSection
        result={monteCarloResult}
        isLoading={!monteCarloFromState && monteCarloLoading}
        hasError={monteCarloError}
      />
      <RetirementMonteCarloSection
        results={retirementMonteCarloResult}
        retirementAge={primaryRetirementAge ?? 0}
        lifeExpectancy={primaryLifeExpectancy}
        targetMonthlyIncome={targetMonthlyIncome ?? 0}
        pensionMonthlyIncome={statePensionMonthlyIncome ?? 0}
      />
      {optimizationSteps.length > 0 && (
        <section className="results__optimization">
          <h2>Itérations de l&apos;optimisation</h2>
          <ol className="results__optimization-list">
            {optimizationSteps.map((step) => (
              <li key={step.iteration}>
                <div>
                  Étape {step.iteration} · facteur {step.scale.toFixed(3)} → épargne{" "}
                  {formatCurrency(step.monthlySavings, 0)} / mois
                </div>
                <div className="results__optimization-meta">
                  Capital brut {formatCurrency(step.finalCapital, 0)} · Capital net{" "}
                  {formatCurrency(step.effectiveFinalCapital, 0)} ·{" "}
                  {step.depletionMonths > 0
                    ? `${step.depletionMonths} mois manquants`
                    : "Horizon respecté"}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

function MonteCarloSection({
  result,
  isLoading,
  hasError,
}: {
  result: MonteCarloResult | null;
  isLoading: boolean;
  hasError: boolean;
}) {
  const monthlySeries = result?.monthlyPercentiles ?? [];

  const chartOption = useMemo(() => {
    if (!monthlySeries || monthlySeries.length === 0) {
      return null;
    }

    return {
      tooltip: {
        trigger: "axis",
        formatter: (params: any) => {
          const index = params?.[0]?.dataIndex ?? 0;
          const point = monthlySeries[index];
          if (!point) {
            return "";
          }

          const lines = [
            `<strong>Mois ${point.monthIndex} (Âge ${point.age.toLocaleString("fr-FR", { maximumFractionDigits: 1 })})</strong>`,
            `Versements cumulés: ${formatCurrency(point.cumulativeContribution, 0)}`,
            `Pessimiste (10%): ${formatCurrency(point.percentile10, 0)}`,
            `Médian: ${formatCurrency(point.percentile50, 0)}`,
            `Optimiste (90%): ${formatCurrency(point.percentile90, 0)}`,
          ];

          return lines.join("<br/>");
        },
      },
      legend: {
        data: [
          "Versements cumulés",
          "Pessimiste (10%)",
          "Médian",
          "Optimiste (90%)",
        ],
        bottom: 0,
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "12%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: monthlySeries.map((point) => `M${point.monthIndex}`),
        axisLabel: {
          formatter: (_: string, index: number) => {
            if (index % 12 === 0) {
              const point = monthlySeries[index];
              if (!point) return "";
              return `Année ${point.age.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}`;
            }
            return "";
          },
        },
      },
      yAxis: {
        type: "value",
        axisLabel: {
          formatter: (value: number) => formatCurrency(value as number),
        },
      },
      series: [
        {
          name: "Versements cumulés",
          type: "line",
          smooth: true,
          showSymbol: false,
          lineStyle: {
            width: 2,
            type: "dashed",
            color: "#0ea5e9",
          },
          data: monthlySeries.map((point) => point.cumulativeContribution),
        },
        {
          name: "Pessimiste (10%)",
          type: "line",
          smooth: true,
          showSymbol: false,
          lineStyle: {
            width: 2,
            color: "#f97316",
          },
          areaStyle: {
            opacity: 0.05,
            color: "#fdba74",
          },
          data: monthlySeries.map((point) => point.percentile10),
        },
        {
          name: "Médian",
          type: "line",
          smooth: true,
          showSymbol: false,
          lineStyle: {
            width: 3,
            color: "#2563eb",
          },
          data: monthlySeries.map((point) => point.percentile50),
        },
        {
          name: "Optimiste (90%)",
          type: "line",
          smooth: true,
          showSymbol: false,
          lineStyle: {
            width: 2,
            color: "#10b981",
          },
          areaStyle: {
            opacity: 0.05,
            color: "#86efac",
          },
          data: monthlySeries.map((point) => point.percentile90),
        },
      ],
    };
  }, [monthlySeries]);

  if (isLoading) {
    return (
      <section className="results__montecarlo">
        <div className="results__capitalization-header">
          <h2>Phase de capitalisation – Simulation Monte Carlo</h2>
          <p>Exécution des tirages aléatoires…</p>
        </div>
      </section>
    );
  }

  if (hasError) {
    return (
      <section className="results__montecarlo">
        <div className="results__capitalization-header">
          <h2>Phase de capitalisation – Simulation Monte Carlo</h2>
          <p>La simulation Monte Carlo n&apos;a pas pu être réalisée.</p>
        </div>
      </section>
    );
  }

  if (!result) {
    return null;
  }

  return (
    <section className="results__montecarlo">
      <div className="results__capitalization-header">
        <h2>Phase de capitalisation – Simulation Monte Carlo</h2>
        <p>
          {result.iterations.toLocaleString("fr-FR")}&nbsp;tirages · confiance {Math.round(result.confidenceLevel * 100)}% · marge ±
          {Math.round(result.toleranceRatio * 100)}%
        </p>
      </div>
      <p className="results__detail-note">
        La courbe médiane représente le percentile 50 de la distribution finale, tandis que la carte « Moyenne des
        tirages » affiche la moyenne arithmétique. Les tirages sont exécutés par lots de 500 jusqu&apos;à atteindre la
        confiance cible (ou la limite maximale si la tolérance n&apos;est pas atteinte).
      </p>

      {chartOption ? (
        <div className="results__montecarlo-chart">
          <ReactECharts option={chartOption} style={{ width: "100%", height: "320px" }} />
        </div>
      ) : (
        <p className="results__capitalization-empty">Aucune série Monte Carlo disponible pour l&apos;instant.</p>
      )}

      <div className="results__montecarlo-grid">
        <article className="results__card">
          <h3>Capital pessimiste (10%)</h3>
          <p className="results__value-sm">{formatCurrency(result.percentile10, 0)}</p>
        </article>
        <article className="results__card">
          <h3>Capital médian</h3>
          <p className="results__value-sm">{formatCurrency(result.percentile50, 0)}</p>
        </article>
        <article className="results__card">
          <h3>Capital optimiste (90%)</h3>
          <p className="results__value-sm">{formatCurrency(result.percentile90, 0)}</p>
        </article>
        <article className="results__card">
          <h3>Moyenne des tirages</h3>
          <p className="results__value-sm">{formatCurrency(result.meanFinalCapital, 0)}</p>
          {!result.confidenceReached && (
            <span className="results__detail-note">
              Confiance cible non atteinte (élargir les tirages)
            </span>
          )}
        </article>
      </div>
    </section>
  );
}

function CombinedTrajectorySection({
  accumulation,
  retirement,
}: {
  accumulation: MonteCarloResult | null;
  retirement: RetirementScenarioResults | null;
}) {
  const combinedPoints = useMemo(() => {
    const points: Array<{
      age: number;
      label: string;
      pessimistic: number;
      median: number;
      optimistic: number;
    }> = [];

    const accumulationPoints = accumulation?.monthlyPercentiles ?? [];
    accumulationPoints.forEach((point) => {
      points.push({
        age: point.age,
        label: `Âge ${point.age.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}`,
        pessimistic: point.percentile10,
        median: point.percentile50,
        optimistic: point.percentile90,
      });
    });

    if (!retirement) {
      return points;
    }

    const pessSeries = retirement.pessimistic.monthlyPercentiles ?? [];
    const medianSeries = retirement.median.monthlyPercentiles ?? [];
    const optimSeries = retirement.optimistic.monthlyPercentiles ?? [];

    const lastAccumulation = accumulationPoints.length > 0 ? accumulationPoints[accumulationPoints.length - 1] : null;
    let lastPessimistic = lastAccumulation?.percentile10 ?? 0;
    let lastMedian = lastAccumulation?.percentile50 ?? 0;
    let lastOptimistic = lastAccumulation?.percentile90 ?? 0;

    const maxLength = Math.max(pessSeries.length, medianSeries.length, optimSeries.length);
    for (let index = 0; index < maxLength; index += 1) {
      const pessPoint = pessSeries[index];
      const medianPoint = medianSeries[index];
      const optPoint = optimSeries[index];

      const age =
        medianPoint?.age ??
        pessPoint?.age ??
        optPoint?.age ??
        (points.length > 0 ? points[points.length - 1].age + 1 / 12 : lastAccumulation?.age ?? 0);

      if (pessPoint) {
        lastPessimistic = pessPoint.percentile50;
      }
      if (medianPoint) {
        lastMedian = medianPoint.percentile50;
      }
      if (optPoint) {
        lastOptimistic = optPoint.percentile50;
      }

      points.push({
        age,
        label: `Âge ${age.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}`,
        pessimistic: lastPessimistic,
        median: lastMedian,
        optimistic: lastOptimistic,
      });
    }

    return points;
  }, [accumulation, retirement]);

  const hasData = combinedPoints.length > 0;

  const chartOption = useMemo(() => {
    if (!hasData) {
      return null;
    }

    return {
      tooltip: {
        trigger: "axis",
        formatter: (params: any) => {
          const index = params?.[0]?.dataIndex ?? 0;
          const point = combinedPoints[index];
          if (!point) {
            return "";
          }

          return [
            `<strong>${point.label}</strong>`,
            `Scénario pessimiste: ${formatCurrency(point.pessimistic, 0)}`,
            `Scénario médian: ${formatCurrency(point.median, 0)}`,
            `Scénario optimiste: ${formatCurrency(point.optimistic, 0)}`,
          ].join("<br/>");
        },
      },
      legend: {
        data: ["Pessimiste", "Médian", "Optimiste"],
        bottom: 0,
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "12%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: combinedPoints.map((point) => point.label),
      },
      yAxis: {
        type: "value",
        axisLabel: {
          formatter: (value: number) => formatCurrency(value as number),
        },
      },
      series: [
        {
          name: "Pessimiste",
          type: "line",
          smooth: true,
          showSymbol: false,
          lineStyle: {
            width: 2,
            color: "#ef4444",
          },
          areaStyle: {
            opacity: 0.05,
            color: "#fca5a5",
          },
          data: combinedPoints.map((point) => point.pessimistic),
        },
        {
          name: "Médian",
          type: "line",
          smooth: true,
          showSymbol: false,
          lineStyle: {
            width: 3,
            color: "#2563eb",
          },
          data: combinedPoints.map((point) => point.median),
        },
        {
          name: "Optimiste",
          type: "line",
          smooth: true,
          showSymbol: false,
          lineStyle: {
            width: 2,
            color: "#10b981",
          },
          areaStyle: {
            opacity: 0.05,
            color: "#86efac",
          },
          data: combinedPoints.map((point) => point.optimistic),
        },
      ],
    };
  }, [combinedPoints, hasData]);

  if (!hasData) {
    return null;
  }

  return (
    <section className="results__montecarlo">
      <div className="results__capitalization-header">
        <h2>Trajectoire globale (capitalisation + retraite)</h2>
        <p>
          Comparaison des scénarios pessimiste, médian et optimiste de capitalisation jusqu&apos;à la retraite puis de la
          phase de retraite.
        </p>
      </div>
      <div className="results__montecarlo-chart">
        <ReactECharts option={chartOption} style={{ width: "100%", height: "320px" }} />
      </div>
    </section>
  );
}

function RetirementMonteCarloSection({
  results,
  retirementAge,
  lifeExpectancy,
  targetMonthlyIncome,
  pensionMonthlyIncome,
}: {
  results: RetirementScenarioResults | null;
  retirementAge: number;
  lifeExpectancy: number | undefined;
  targetMonthlyIncome: number;
  pensionMonthlyIncome: number;
}) {
  if (!results) {
    return null;
  }

  const durationYears =
    lifeExpectancy && retirementAge ? Math.max(lifeExpectancy - retirementAge, 0) : undefined;

  const medianSeries = results.median.monthlyPercentiles ?? [];
  const cumulativeWithdrawalMedian =
    medianSeries.length > 0 ? medianSeries[medianSeries.length - 1].cumulativeWithdrawal : 0;

  const chartOption = useMemo(() => {
    if (!results) {
      return null;
    }

    const pessimisticSeries = results.pessimistic.monthlyPercentiles ?? [];
    const medianSeriesLocal = results.median.monthlyPercentiles ?? [];
    const optimisticSeries = results.optimistic.monthlyPercentiles ?? [];

    if (medianSeriesLocal.length === 0 && pessimisticSeries.length === 0 && optimisticSeries.length === 0) {
      return null;
    }

    const maxLength = Math.max(
      pessimisticSeries.length,
      medianSeriesLocal.length,
      optimisticSeries.length,
    );

    const xAxisLabels = Array.from({ length: maxLength }, (_, index) => {
      const candidate =
        medianSeriesLocal[index] ??
        pessimisticSeries[index] ??
        optimisticSeries[index];
      if (!candidate) {
        return `M${index + 1}`;
      }
      return `Âge ${candidate.age.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}`;
    });

    return {
      tooltip: {
        trigger: "axis",
        formatter: (params: any) => {
          const index = params?.[0]?.dataIndex ?? 0;
          const pess = pessimisticSeries[index];
          const med = medianSeriesLocal[index];
          const opt = optimisticSeries[index];

          const lines = [`<strong>${xAxisLabels[index] ?? `Mois ${index + 1}`}</strong>`];
          if (pess) {
            lines.push(`Scénario pessimiste (médian): ${formatCurrency(pess.percentile50, 0)}`);
          }
          if (med) {
            lines.push(`Scénario médian: ${formatCurrency(med.percentile50, 0)}`);
            lines.push(`Retraits cumulés: ${formatCurrency(med.cumulativeWithdrawal, 0)}`);
          }
          if (opt) {
            lines.push(`Scénario optimiste (médian): ${formatCurrency(opt.percentile50, 0)}`);
          }
          return lines.join("<br/>");
        },
      },
      legend: {
        data: ["Pessimiste", "Médian", "Optimiste"],
        bottom: 0,
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "12%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: xAxisLabels,
      },
      yAxis: {
        type: "value",
        axisLabel: {
          formatter: (value: number) => formatCurrency(value as number),
        },
      },
      series: [
        {
          name: "Pessimiste",
          type: "line",
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2, color: "#ef4444" },
          areaStyle: { opacity: 0.05, color: "#fca5a5" },
          data: pessimisticSeries.map((point) => point.percentile50),
        },
        {
          name: "Médian",
          type: "line",
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 3, color: "#2563eb" },
          data: medianSeriesLocal.map((point) => point.percentile50),
        },
        {
          name: "Optimiste",
          type: "line",
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2, color: "#10b981" },
          areaStyle: { opacity: 0.05, color: "#86efac" },
          data: optimisticSeries.map((point) => point.percentile50),
        },
      ],
    };
  }, [results]);

  return (
    <section className="results__montecarlo">
      <div className="results__capitalization-header">
        <h2>Phase de retraite – Simulation Monte Carlo</h2>
        <p>
          {durationYears !== undefined
            ? `Durée projetée : ${durationYears.toLocaleString("fr-FR", {
                maximumFractionDigits: 1,
              })} ans · `
            : ""}
          Revenu cible {formatCurrency(targetMonthlyIncome)} · Pension attendue {formatCurrency(pensionMonthlyIncome)}
        </p>
      </div>
      <div className="results__montecarlo-grid">
        <article className="results__card">
          <h3>Capital pessimiste (10%)</h3>
          <p className="results__value-sm">{formatCurrency(results.pessimistic.medianFinalCapital, 0)}</p>
          <p className="results__detail-note">Médiane du scénario pessimiste</p>
        </article>
        <article className="results__card">
          <h3>Capital médian</h3>
          <p className="results__value-sm">{formatCurrency(results.median.medianFinalCapital, 0)}</p>
        </article>
        <article className="results__card">
          <h3>Capital optimiste (90%)</h3>
          <p className="results__value-sm">{formatCurrency(results.optimistic.medianFinalCapital, 0)}</p>
          <p className="results__detail-note">Médiane du scénario optimiste</p>
        </article>
        <article className="results__card">
          <h3>Retraits cumulés (médian)</h3>
          <p className="results__value-sm">{formatCurrency(cumulativeWithdrawalMedian, 0)}</p>
        </article>
      </div>
      {chartOption ? (
        <div className="results__montecarlo-chart">
          <ReactECharts option={chartOption} style={{ width: "100%", height: "320px" }} />
        </div>
      ) : (
        <p className="results__capitalization-empty">Aucune donnée de simulation retraite disponible.</p>
      )}
    </section>
  );
}
export default SimulationResultPage;

