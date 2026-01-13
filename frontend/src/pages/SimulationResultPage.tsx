import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import ReactECharts from "echarts-for-react";
import { SEO, createWebPageSchema } from "@/components/seo/SEO";
import { Box, Card, CardContent, Container, Typography, Button, useTheme } from "@mui/material";
import GridLegacy from "@mui/material/GridLegacy";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { ResultsSkeleton } from "@/components/shared/SkeletonLoader";
import { useAuth } from "@/hooks/useAuth";
import { listSimulations, simulateMonteCarlo } from "@/services/simulations";
import { OptimizationIterationsChart } from "@/components/results/OptimizationIterationsChart";
import { RLStrategyChart } from "@/components/results/RLStrategyChart";
import { InvestmentAllocationCharts } from "@/components/results/InvestmentAllocationCharts";
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

interface LocationState {
  simulation: Simulation | null;
  result?: SimulationResult;
  draft?: SimulationInput;
  monteCarloResult?: MonteCarloResult;
  retirementMonteCarloResult?: RetirementScenarioResults;
  optimalMonteCarloResult?: MonteCarloResult;
  optimalRetirementResults?: RetirementScenarioResults;
  recommendedSavings?: number;
  minimumCapitalAtRetirement?: number;
  optimizationSteps?: OptimizationStep[];
  optimizationScale?: number;
  optimizationResidualError?: number;
  optimizationResidualErrorRatio?: number;
  useRL?: boolean;
}

function formatCurrency(value: number, fractionDigits = 0) {
  // Gérer les cas limites (NaN, Infinity, null, undefined)
  if (!Number.isFinite(value)) {
    return "0,00 €";
  }
  
  // Formater avec séparateurs de milliers (espaces) et symbole €
  // Le format français utilise des espaces comme séparateurs de milliers
  // Exemple: 1 000 000,00 €
  return value.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
    useGrouping: true, // Force l'utilisation des séparateurs de milliers (espaces en français)
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
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
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

  // Vérifier s'il y a des données de simulation en cours dans sessionStorage
  const hasDraftData = useMemo(() => {
    if (typeof window === "undefined") return false;
    const saved = sessionStorage.getItem("lv_simulation_form_data");
    return !!saved;
  }, []);

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
  const optimalMonteCarloFromState = locationState?.optimalMonteCarloResult ?? null;
  const optimalRetirementFromState = locationState?.optimalRetirementResults ?? null;

  // Debug: vérifier les données reçues
  useEffect(() => {
    if (locationState) {
      console.log("LocationState reçu:", {
        hasDraft: !!locationState.draft,
        hasMonteCarlo: !!locationState.monteCarloResult,
        hasRetirement: !!locationState.retirementMonteCarloResult,
        hasRecommendedSavings: typeof locationState.recommendedSavings === "number",
        monteCarloKeys: locationState.monteCarloResult ? Object.keys(locationState.monteCarloResult) : [],
      });
    }
  }, [locationState]);

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

  // Afficher un skeleton loader pendant le chargement
  if (monteCarloLoading && !monteCarloFromState) {
    return (
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <ResultsSkeleton />
      </Container>
    );
  }

  const monteCarloResult = monteCarloFromState ?? fetchedMonteCarlo ?? null;
  const retirementMonteCarloResult = retirementMonteCarloFromState ?? null;
  const recommendedSavings =
    locationState?.recommendedSavings ?? result?.requiredMonthlySavings ?? 0;
  const minimumCapitalAtRetirement = locationState?.minimumCapitalAtRetirement;
  const optimizationSteps = locationState?.optimizationSteps ?? [];
  const optimizationScale = locationState?.optimizationScale;
  const useRL = locationState?.useRL ?? false;
  const optimizationResidualError = locationState?.optimizationResidualError ?? null;
  const optimizationResidualErrorRatio = locationState?.optimizationResidualErrorRatio ?? null;

  // Vérifier si on a vraiment des RÉSULTATS exploitables (pas juste des données d'entrée)
  const hasActualResults = useMemo(() => {
    // Vérifier les résultats directs (result doit avoir au moins une propriété de résultat)
    if (result) {
      if (
        (result.requiredMonthlySavings !== undefined && result.requiredMonthlySavings !== null) ||
        (result.projectedCapitalAtRetirement !== undefined && result.projectedCapitalAtRetirement !== null) ||
        (result.projectedCapitalAtLifeExpectancy !== undefined && result.projectedCapitalAtLifeExpectancy !== null) ||
        (result.successProbability !== undefined && result.successProbability !== null)
      ) {
        return true;
      }
    }
    
    // Vérifier les résultats Monte Carlo (depuis locationState ou fetched)
    // Doit avoir au moins medianFinalCapital ou monthlyPercentiles avec des données
    if (monteCarloResult) {
      if (
        (monteCarloResult.medianFinalCapital !== undefined && monteCarloResult.medianFinalCapital !== null) ||
        (monteCarloResult.monthlyPercentiles && monteCarloResult.monthlyPercentiles.length > 0)
      ) {
        return true;
      }
    }
    
    // Vérifier les résultats de retraite
    if (retirementMonteCarloResult) {
      if (
        retirementMonteCarloResult.median &&
        (
          (retirementMonteCarloResult.median.medianFinalCapital !== undefined && retirementMonteCarloResult.median.medianFinalCapital !== null) ||
          (retirementMonteCarloResult.median.monthlyPercentiles && retirementMonteCarloResult.median.monthlyPercentiles.length > 0)
        )
      ) {
        return true;
      }
    }
    
    // Vérifier recommendedSavings (doit être > 0 pour être valide)
    if (recommendedSavings !== undefined && recommendedSavings !== null && recommendedSavings > 0) {
      return true;
    }
    
    return false;
  }, [result, monteCarloResult, retirementMonteCarloResult, recommendedSavings]);

  // Si on a des résultats ou qu'on est en train de les charger, on affiche la page
  // Sinon, on affiche le message pour lancer une simulation
  const shouldShowResults = hasActualResults || (monteCarloLoading && capitalizationInput);

  if (!shouldShowResults) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Card
          sx={{
            textAlign: "center",
            py: 6,
            background: theme.palette.background.paper,
            borderRadius: "1.25rem",
            boxShadow: theme.shadows[4],
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <CardContent>
            <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 2, fontWeight: 700, color: theme.palette.text.primary }}>
              Aucun résultat de simulation disponible
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: "600px", mx: "auto" }}>
              {hasDraftData
                ? "Vous avez une simulation en cours. Lancez le calcul pour voir les résultats."
                : "Commencez par renseigner vos informations et lancez une simulation pour voir les résultats."}
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<PlayArrowIcon />}
              onClick={() => navigate("/simulation")}
              sx={{
                px: 4,
                py: 1.5,
                fontSize: "1rem",
                fontWeight: 600,
                borderRadius: "999px",
                background: "linear-gradient(135deg, #38bdf8, #0ea5e9)",
                "&:hover": {
                  background: "linear-gradient(135deg, #0ea5e9, #0284c7)",
                  transform: "translateY(-2px)",
                  boxShadow: "0 8px 24px rgba(14, 165, 233, 0.35)",
                },
              }}
            >
              {hasDraftData ? "Continuer la simulation" : "Lancer une simulation"}
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

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
      optimalMonteCarloResult: optimalMonteCarloFromState ?? undefined,
      optimalRetirementResults: optimalRetirementFromState ?? undefined,
      recommendedSavings: recommendedSavings ?? undefined,
      minimumCapitalAtRetirement: minimumCapitalAtRetirement ?? undefined,
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
  }, [simulation, result, draft, monteCarloResult, retirementMonteCarloResult, optimalMonteCarloFromState, optimalRetirementFromState, recommendedSavings, minimumCapitalAtRetirement, optimizationSteps, optimizationScale, optimizationResidualError, optimizationResidualErrorRatio]);

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

  const simulationName = simulationRecord?.name as string | undefined ?? draft?.name ?? "Votre projection";
  const pageDescription = `Résultats de votre simulation de retraite : ${simulationName}. Visualisez vos projections Monte Carlo, votre allocation d'actifs et optimisez votre stratégie d'épargne.`;
  
  const structuredData = createWebPageSchema(
    `Résultats - ${simulationName}`,
    pageDescription,
    typeof window !== "undefined" ? window.location.href : "https://longview.app/resultats",
  );

  return (
    <>
      <SEO
        title={`Résultats - ${simulationName}`}
        description={pageDescription}
        keywords="résultats simulation retraite, projections Monte Carlo, allocation actifs, optimisation épargne, analyse retraite"
        type="article"
        structuredData={structuredData}
      />
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      <Box sx={{ mb: { xs: 3, md: 5 } }}>
        <Typography
          variant="h3"
          component="h1"
          gutterBottom
          sx={{
            fontSize: { xs: "2rem", md: "2.25rem" },
            fontWeight: 700,
            color: theme.palette.text.primary,
            mb: 1,
          }}
        >
          {headerTitle}
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{
            maxWidth: "640px",
            lineHeight: 1.6,
            fontSize: { xs: "0.95rem", md: "1rem" },
          }}
        >
          Visualisez l'équilibre entre vos capacités d'épargne, les revenus attendus et le capital nécessaire pour
          maintenir votre niveau de vie.
        </Typography>
      </Box>

      <GridLegacy container spacing={{ xs: 2, md: 3 }} sx={{ mb: { xs: 3, md: 5 } }}>
        {(result || monteCarloResult || retirementMonteCarloResult) ? (
          <>
            <GridLegacy item xs={12} sm={6} md={4}>
              <Card
                sx={{
                  background: "linear-gradient(135deg, #0f172a, #1e293b)",
                  color: "#f8fafc",
                  borderRadius: "1.25rem",
                  boxShadow: "0 18px 34px rgba(148, 163, 184, 0.18)",
                  border: "1px solid rgba(148, 163, 184, 0.1)",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "0 22px 40px rgba(148, 163, 184, 0.25)",
                  },
                }}
              >
                <CardContent sx={{ p: { xs: 2, md: 2.5 }, flex: 1, display: "flex", flexDirection: "column" }}>
                  <Typography
                    variant="h6"
                    component="h2"
                    gutterBottom
                    sx={{ fontSize: { xs: "1rem", md: "1.1rem" }, fontWeight: 600 }}
                  >
                    Épargne minimum
                  </Typography>
                  <Typography
                    variant="h4"
                    component="p"
                    sx={{
                      fontWeight: 700,
                      mb: 1.5,
                      fontSize: { xs: "1.75rem", md: "2rem" },
                      flex: 1,
                    }}
                  >
                    {formatCurrency(recommendedSavings)}
                  </Typography>
                  <Box sx={{ mt: "auto" }}>
                    <Typography variant="body2" sx={{ opacity: 0.85, mb: 1, fontSize: "0.875rem" }}>
                      par mois jusqu'à {primaryRetirementAge ?? "—"} ans
                      {typeof optimizationScale === "number"
                        ? ` · facteur ${optimizationScale.toFixed(2)}`
                        : ""}
                      {typeof optimizationResidualError === "number" && optimizationResidualError !== 0 && (
                        <>
                          {" "}
                          · écart résiduel {formatCurrency(optimizationResidualError, 0)}
                        </>
                      )}
                      {typeof optimizationResidualErrorRatio === "number" && optimizationResidualErrorRatio !== 0 && (
                        <>
                          {" "}
                          ({(optimizationResidualErrorRatio * 100).toFixed(2)} %)
                        </>
                      )}
                    </Typography>
                    {typeof minimumCapitalAtRetirement === "number" && minimumCapitalAtRetirement > 0 && (
                      <Typography variant="body2" sx={{ opacity: 0.85, mt: 1.5, fontSize: "0.875rem" }}>
                        Capital minimum à la retraite : <strong>{formatCurrency(minimumCapitalAtRetirement)}</strong>
                      </Typography>
                    )}
                    {/* Hypothèses de simulation */}
                    <Box sx={{ mt: 2, pt: 1.5, borderTop: `1px solid ${theme.palette.divider}` }}>
                      <Typography variant="caption" sx={{ opacity: 0.7, fontSize: "0.75rem", fontWeight: 600, mb: 0.5, display: "block" }}>
                        Hypothèses de simulation
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.85, fontSize: "0.8rem", lineHeight: 1.6 }}>
                        {monteCarloResult?.iterations ? (
                          <>
                            {monteCarloResult.iterations.toLocaleString("fr-FR")} tirages Monte Carlo
                            {monteCarloResult.confidenceLevel !== undefined && (
                              <> · confiance {Math.round(monteCarloResult.confidenceLevel * 100)}%</>
                            )}
                            {monteCarloResult.toleranceRatio !== undefined && (
                              <> · marge ±{Math.round(monteCarloResult.toleranceRatio * 100)}%</>
                            )}
                          </>
                        ) : marketAssumptions ? (
                          <>
                            Confiance {Math.round((marketAssumptions.confidenceLevel ?? 0.9) * 100)}%
                            {marketAssumptions.toleranceRatio !== undefined && (
                              <> · marge ±{Math.round(marketAssumptions.toleranceRatio * 100)}%</>
                            )}
                            {marketAssumptions.maxIterations && (
                              <> · max {marketAssumptions.maxIterations.toLocaleString("fr-FR")} itérations</>
                            )}
                          </>
                        ) : (
                          "Confiance 90% · marge ±1%"
                        )}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </GridLegacy>

            <GridLegacy item xs={12} sm={6} md={4}>
              <Card
                sx={{
                  background: theme.palette.background.paper,
                  borderRadius: "1.25rem",
                  boxShadow: theme.shadows[4],
                  border: `1px solid ${theme.palette.divider}`,
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: theme.shadows[8],
                  },
                }}
              >
                <CardContent sx={{ p: { xs: 2, md: 2.5 }, flex: 1, display: "flex", flexDirection: "column" }}>
                  <Typography
                    variant="h6"
                    component="h3"
                    gutterBottom
                    sx={{ fontSize: { xs: "1rem", md: "1.1rem" }, fontWeight: 600, color: theme.palette.text.primary }}
                  >
                    Capital estimé à la retraite
                  </Typography>
                  <Typography
                    variant="h4"
                    component="p"
                    sx={{
                      fontWeight: 700,
                      mb: 1,
                      fontSize: { xs: "1.75rem", md: "2rem" },
                      color: theme.palette.text.primary,
                      flex: 1,
                    }}
                  >
                    {formatCurrency(capitalAtRetirement)}
                  </Typography>
                  {monteCarloResult && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.875rem", mt: "auto" }}>
                      Médiane de la simulation Monte Carlo
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </GridLegacy>

            <GridLegacy item xs={12} sm={6} md={4}>
              <Card
                sx={{
                  background: theme.palette.background.paper,
                  borderRadius: "1.25rem",
                  boxShadow: theme.shadows[4],
                  border: `1px solid ${theme.palette.divider}`,
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: theme.shadows[8],
                  },
                }}
              >
                <CardContent sx={{ p: { xs: 2, md: 2.5 }, flex: 1, display: "flex", flexDirection: "column" }}>
                  <Typography
                    variant="h6"
                    component="h3"
                    gutterBottom
                    sx={{ fontSize: { xs: "1rem", md: "1.1rem" }, fontWeight: 600, color: theme.palette.text.primary }}
                  >
                    Reste à {primaryLifeExpectancy ?? "—"} ans
                  </Typography>
                  <Typography
                    variant="h4"
                    component="p"
                    sx={{
                      fontWeight: 700,
                      mb: 1,
                      fontSize: { xs: "1.75rem", md: "2rem" },
                      color: theme.palette.text.primary,
                      flex: 1,
                    }}
                  >
                    {formatCurrency(
                      result?.projectedCapitalAtLifeExpectancy ??
                        retirementMonteCarloResult?.median.medianFinalCapital ??
                        0,
                    )}
                  </Typography>
                  {retirementMonteCarloResult && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.875rem", mt: "auto" }}>
                      Médiane Monte Carlo: {formatCurrency(retirementMonteCarloResult.median.medianFinalCapital)}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </GridLegacy>

            {result && (
              <GridLegacy item xs={12} sm={6} md={4}>
                <Card
                  sx={{
                    background: theme.palette.background.paper,
                    borderRadius: "1.25rem",
                    boxShadow: theme.shadows[4],
                    border: `1px solid ${theme.palette.divider}`,
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: theme.shadows[8],
                    },
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, md: 2.5 }, flex: 1, display: "flex", flexDirection: "column" }}>
                    <Typography
                      variant="h6"
                      component="h3"
                      gutterBottom
                      sx={{ fontSize: { xs: "1rem", md: "1.1rem" }, fontWeight: 600, color: theme.palette.text.primary }}
                    >
                      Probabilité de réussite
                    </Typography>
                    <Typography
                      variant="h4"
                      component="p"
                      sx={{
                        fontWeight: 700,
                        fontSize: { xs: "1.75rem", md: "2rem" },
                        color: theme.palette.text.primary,
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {Math.round(result.successProbability)}%
                    </Typography>
                  </CardContent>
                </Card>
              </GridLegacy>
            )}
          </>
        ) : (
          <GridLegacy item xs={12}>
            <Card
              sx={{
                textAlign: "center",
                bgcolor: "rgba(191, 219, 254, 0.4)",
                border: "1px dashed rgba(14, 165, 233, 0.5)",
                borderRadius: "1.25rem",
                boxShadow: "0 12px 28px rgba(148, 163, 184, 0.15)",
              }}
            >
              <CardContent sx={{ py: 4 }}>
                <Typography variant="h5" component="h2" gutterBottom sx={{ color: theme.palette.text.primary }}>
                  Analyse personnalisée
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Connectez-vous pour enregistrer vos projections et recevoir une analyse complète.
                </Typography>
              </CardContent>
            </Card>
          </GridLegacy>
        )}
      </GridLegacy>

      <CombinedTrajectorySection
        accumulation={monteCarloResult}
        retirement={retirementMonteCarloResult}
        optimalAccumulation={optimalMonteCarloFromState}
        optimalRetirement={optimalRetirementFromState}
        optimizationScale={optimizationScale}
        recommendedSavings={recommendedSavings}
        minimumCapitalAtRetirement={minimumCapitalAtRetirement}
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
      {investmentAccounts.length > 0 && monteCarloResult && (
        <InvestmentAllocationCharts
          accounts={investmentAccounts}
          adults={adults}
          medianCapitalAtRetirement={monteCarloResult.medianFinalCapital}
        />
      )}
      {optimizationSteps.length > 0 && (
        <Box sx={{ mt: { xs: 3, md: 5 } }}>
          <OptimizationIterationsChart steps={optimizationSteps} />
        </Box>
      )}
      {useRL && savingsPhases && savingsPhases.length > 0 && (
        <Box sx={{ mt: { xs: 3, md: 5 } }}>
          <RLStrategyChart savingsPhases={savingsPhases} isRLStrategy={true} />
        </Box>
      )}
    </Container>
    </>
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
  const theme = useTheme();
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
      <Card
        sx={{
          background: theme.palette.background.paper,
          borderRadius: "1.25rem",
          boxShadow: theme.shadows[4],
          border: `1px solid ${theme.palette.divider}`,
          mb: { xs: 3, md: 4 },
        }}
      >
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Typography variant="h5" component="h2" gutterBottom sx={{ fontSize: { xs: "1.5rem", md: "1.75rem" }, fontWeight: 700, color: theme.palette.text.primary }}>
            Phase de capitalisation – Simulation Monte Carlo
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Exécution des tirages aléatoires…
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (hasError) {
    return (
      <Card
        sx={{
          background: theme.palette.background.paper,
          borderRadius: "1.25rem",
          boxShadow: theme.shadows[4],
          border: `1px solid ${theme.palette.divider}`,
          mb: { xs: 3, md: 4 },
        }}
      >
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Typography variant="h5" component="h2" gutterBottom sx={{ fontSize: { xs: "1.5rem", md: "1.75rem" }, fontWeight: 700, color: theme.palette.text.primary }}>
            Phase de capitalisation – Simulation Monte Carlo
          </Typography>
          <Typography variant="body2" color="error">
            La simulation Monte Carlo n&apos;a pas pu être réalisée.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (!result) {
    return null;
  }

  return (
    <Card
      sx={{
        background: theme.palette.background.paper,
        borderRadius: "1.25rem",
        boxShadow: theme.shadows[4],
        border: `1px solid ${theme.palette.divider}`,
        mb: { xs: 3, md: 4 },
      }}
    >
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h5" component="h2" gutterBottom sx={{ fontSize: { xs: "1.5rem", md: "1.75rem" }, fontWeight: 700, color: theme.palette.text.primary }}>
            Phase de capitalisation – Simulation Monte Carlo
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {result.iterations?.toLocaleString("fr-FR") ?? "0"}&nbsp;tirages · confiance {Math.round((result.confidenceLevel ?? 0.9) * 100)}% · marge ±
            {Math.round((result.toleranceRatio ?? 0.01) * 100)}%
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.95rem", lineHeight: 1.6 }}>
            La courbe médiane représente le percentile 50 de la distribution finale, tandis que la carte « Moyenne des
            tirages » affiche la moyenne arithmétique. Les tirages sont exécutés par lots de 500 jusqu&apos;à atteindre la
            confiance cible (ou la limite maximale si la tolérance n&apos;est pas atteinte).
          </Typography>
        </Box>

        {chartOption ? (
          <Box
            sx={{
              width: "100%",
              height: { xs: "300px", md: "320px" },
              mb: 3,
              borderRadius: "1rem",
              overflow: "hidden",
            }}
          >
            <ReactECharts option={chartOption} style={{ width: "100%", height: "100%" }} />
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
            Aucune série Monte Carlo disponible pour l&apos;instant.
          </Typography>
        )}

        <GridLegacy container spacing={{ xs: 2, md: 2.5 }}>
          <GridLegacy item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: theme.palette.background.paper,
                borderRadius: "1rem",
                boxShadow: theme.shadows[2],
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <CardContent sx={{ p: 2 }}>
                <Typography variant="h6" component="h3" gutterBottom sx={{ fontSize: "0.95rem", fontWeight: 600, color: theme.palette.text.primary }}>
                  Capital pessimiste (10%)
                </Typography>
                <Typography variant="h6" component="p" sx={{ fontWeight: 700, fontSize: "1.5rem", color: theme.palette.text.primary }}>
                  {formatCurrency(result.percentile10, 0)}
                </Typography>
              </CardContent>
            </Card>
          </GridLegacy>
          <GridLegacy item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: theme.palette.background.paper,
                borderRadius: "1rem",
                boxShadow: theme.shadows[2],
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <CardContent sx={{ p: 2 }}>
                <Typography variant="h6" component="h3" gutterBottom sx={{ fontSize: "0.95rem", fontWeight: 600, color: theme.palette.text.primary }}>
                  Capital médian
                </Typography>
                <Typography variant="h6" component="p" sx={{ fontWeight: 700, fontSize: "1.5rem", color: theme.palette.text.primary }}>
                  {formatCurrency(result.percentile50, 0)}
                </Typography>
              </CardContent>
            </Card>
          </GridLegacy>
          <GridLegacy item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: theme.palette.background.paper,
                borderRadius: "1rem",
                boxShadow: theme.shadows[2],
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <CardContent sx={{ p: 2 }}>
                <Typography variant="h6" component="h3" gutterBottom sx={{ fontSize: "0.95rem", fontWeight: 600, color: theme.palette.text.primary }}>
                  Capital optimiste (90%)
                </Typography>
                <Typography variant="h6" component="p" sx={{ fontWeight: 700, fontSize: "1.5rem", color: theme.palette.text.primary }}>
                  {formatCurrency(result.percentile90, 0)}
                </Typography>
              </CardContent>
            </Card>
          </GridLegacy>
          <GridLegacy item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: theme.palette.background.paper,
                borderRadius: "1rem",
                boxShadow: theme.shadows[2],
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <CardContent sx={{ p: 2 }}>
                <Typography variant="h6" component="h3" gutterBottom sx={{ fontSize: "0.95rem", fontWeight: 600, color: theme.palette.text.primary }}>
                  Moyenne des tirages
                </Typography>
                <Typography variant="h6" component="p" sx={{ fontWeight: 700, fontSize: "1.5rem", color: theme.palette.text.primary }}>
                  {formatCurrency(result.meanFinalCapital, 0)}
                </Typography>
                {!result.confidenceReached && (
                  <Typography variant="caption" color="warning.main" sx={{ display: "block", mt: 0.5 }}>
                    ⚠️ La précision statistique n&apos;a pas été atteinte. Les résultats peuvent varier davantage.
                    {typeof result.errorMargin === "number" && !isNaN(result.errorMargin) && (
                      <>
                        {" "}
                        Marge d&apos;erreur : {formatCurrency(result.errorMargin, 0)}
                        {typeof result.errorMarginRatio === "number" &&
                          !isNaN(result.errorMarginRatio) &&
                          ` (${(result.errorMarginRatio * 100).toFixed(2)}%)`}
                      </>
                    )}
                    {" "}
                    Augmentez le nombre maximum d&apos;itérations pour améliorer la précision.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </GridLegacy>
        </GridLegacy>
      </CardContent>
    </Card>
  );
}

function CombinedTrajectorySection({
  accumulation,
  retirement,
  optimalAccumulation,
  optimalRetirement,
  optimizationScale,
  recommendedSavings,
  minimumCapitalAtRetirement,
}: {
  accumulation: MonteCarloResult | null;
  retirement: RetirementScenarioResults | null;
  optimalAccumulation?: MonteCarloResult | null;
  optimalRetirement?: RetirementScenarioResults | null;
  optimizationScale?: number;
  recommendedSavings?: number; // eslint-disable-line @typescript-eslint/no-unused-vars -- Réservé pour usage futur
  minimumCapitalAtRetirement?: number;
}) {
  const theme = useTheme();
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

  // Créer une série de points pour la courbe "Capital minimum à la retraite"
  // Cette courbe utilise les simulations optimales du backend qui représentent
  // la trajectoire partant du capital minimum à la retraite et se terminant à ~0€
  const minimumSavingsPoints = useMemo(() => {
    // On a besoin du capital minimum pour afficher cette courbe
    if (minimumCapitalAtRetirement === undefined || minimumCapitalAtRetirement === null) {
      return null;
    }

    const points: Array<{
      age: number;
      label: string;
      value: number;
    }> = [];

    // Phase de capitalisation : utiliser les courbes optimales si disponibles
    // Sinon, ajuster proportionnellement la courbe réelle
    if (optimalAccumulation && optimalAccumulation.monthlyPercentiles?.length > 0) {
      // Utiliser directement les courbes optimales générées par le backend
      // Ces courbes sont spécifiquement ajustées pour atteindre le capital minimum
      const optimalAccumulationPoints = optimalAccumulation.monthlyPercentiles;
      
      optimalAccumulationPoints.forEach((point) => {
        points.push({
          age: point.age,
          label: `Âge ${point.age.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}`,
          value: point.percentile50,
        });
      });
    } else if (accumulation && accumulation.monthlyPercentiles?.length > 0) {
      // Fallback : ajuster proportionnellement la courbe réelle
      const accumulationPoints = accumulation.monthlyPercentiles;
      const lastPoint = accumulationPoints[accumulationPoints.length - 1];
      const realEndCapital = lastPoint.percentile50;
      const adjustmentRatio = realEndCapital > 0 
        ? minimumCapitalAtRetirement / realEndCapital 
        : 1.0;
      
      accumulationPoints.forEach((point, index) => {
        const isLastPoint = index === accumulationPoints.length - 1;
        const adjustedValue = isLastPoint 
          ? minimumCapitalAtRetirement 
          : point.percentile50 * adjustmentRatio;
        
        points.push({
          age: point.age,
          label: `Âge ${point.age.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}`,
          value: adjustedValue,
        });
      });
    } else {
      return null;
    }

    // Phase de retraite : utiliser les courbes optimales du backend si disponibles
    // Ces courbes sont générées avec le capital minimum exact trouvé par dichotomie
    if (optimalRetirement && optimalRetirement.median?.monthlyPercentiles?.length > 0) {
      // Utiliser directement les courbes de retraite optimales
      const optimalMedianSeries = optimalRetirement.median.monthlyPercentiles;
      
      optimalMedianSeries.forEach((point) => {
        points.push({
          age: point.age,
          label: `Âge ${point.age.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}`,
          value: Math.max(0, point.percentile50),
        });
      });
    } else if (retirement && retirement.median?.monthlyPercentiles?.length > 0) {
      // Fallback : ajuster la courbe réelle proportionnellement ou linéairement
      const medianSeries = retirement.median.monthlyPercentiles;
      const realStartCapital = medianSeries[0]?.percentile50 ?? 1;
      const realEndCapital = medianSeries[medianSeries.length - 1]?.percentile50 ?? 0;
      
      // Si la courbe réelle s'épuise prématurément (capital final proche de 0 alors qu'on attendait plus)
      // ou si elle finit à 0, on ne peut pas utiliser sa "forme" car elle décroît trop vite.
      // Dans ce cas, on utilise une décroissance linéaire théorique pour le capital minimum.
      const realCurveDepleted = realEndCapital <= 100; // Considéré comme épuisé si <= 100€
      
      medianSeries.forEach((point, index) => {
        let adjustedValue;
        
        if (realCurveDepleted) {
          // Décroissance linéaire théorique de minCapital à 0 sur toute la durée
          // Car la courbe réelle n'est pas une bonne référence (elle s'épuise trop vite)
          const progress = index / Math.max(1, medianSeries.length - 1);
          adjustedValue = minimumCapitalAtRetirement * (1 - progress);
        } else {
          // La courbe réelle est valide (ne s'épuise pas), on peut utiliser sa forme
          // Calculer la progression relative dans la retraite
          const realProgress = realStartCapital > 0 
            ? (realStartCapital - point.percentile50) / realStartCapital 
            : index / Math.max(1, medianSeries.length - 1);
          
          // Appliquer la même progression relative au capital minimum
          adjustedValue = minimumCapitalAtRetirement * (1 - realProgress);
        }
        
        points.push({
          age: point.age,
          label: `Âge ${point.age.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}`,
          value: Math.max(0, adjustedValue),
        });
      });
    }

    return points;
  }, [accumulation, retirement, optimalAccumulation, optimalRetirement, minimumCapitalAtRetirement]);

  const hasData = combinedPoints.length > 0;

  // Déterminer l'index de transition entre capitalisation et retraite
  const retirementStartIndex = accumulation?.monthlyPercentiles?.length ?? 0;

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

          const phase = index < retirementStartIndex ? "Phase de capitalisation" : "Phase de retraite";
          const phaseColor = theme.palette.mode === "dark" ? "#94a3b8" : "#64748b";
          const lines = [
            `<strong>${point.label}</strong>`,
            `<em style="color: ${phaseColor};">${phase}</em>`,
            `Scénario pessimiste: ${formatCurrency(point.pessimistic, 0)}`,
            `Scénario médian: ${formatCurrency(point.median, 0)}`,
            `Scénario optimiste: ${formatCurrency(point.optimistic, 0)}`,
          ];
          
          // Ajouter la courbe "Capital minimum à la retraite" si disponible
          if (minimumSavingsPoints && minimumSavingsPoints[index]) {
            const minValue = minimumSavingsPoints[index].value;
            if (minValue !== null && minValue !== undefined) {
              lines.push(`Capital minimum à la retraite: ${formatCurrency(minValue, 0)}`);
            }
          }
          
          return lines.join("<br/>");
        },
      },
      legend: {
        data: minimumSavingsPoints
          ? ["Pessimiste", "Médian", "Optimiste", "Capital minimum à la retraite"]
          : ["Pessimiste", "Médian", "Optimiste"],
        bottom: 0,
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "12%",
        top: "8%",
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
          markLine: {
            silent: true,
            symbol: "none",
            lineStyle: {
              type: "dashed",
              color: theme.palette.mode === "dark" ? "#94a3b8" : "#64748b",
              width: 2,
            },
            label: {
              show: false,
            },
            data: retirementStartIndex > 0 ? [
              {
                xAxis: retirementStartIndex,
              },
            ] : [],
          },
          markArea: {
            silent: true,
            data: retirementStartIndex > 0 ? [
              [
                {
                  name: "Capitalisation",
                  xAxis: 0,
                  itemStyle: {
                    color: "rgba(59, 130, 246, 0.06)",
                  },
                  label: {
                    position: "insideTopLeft",
                    fontSize: 13,
                    fontWeight: "bold",
                    color: "#2563eb",
                    offset: [10, 10],
                  },
                },
                {
                  xAxis: retirementStartIndex - 1,
                },
              ],
              [
                {
                  name: "Retraite",
                  xAxis: retirementStartIndex,
                  itemStyle: {
                    color: "rgba(16, 185, 129, 0.06)",
                  },
                  label: {
                    position: "insideTopLeft",
                    fontSize: 13,
                    fontWeight: "bold",
                    color: "#10b981",
                    offset: [10, 10],
                  },
                },
                {
                  xAxis: combinedPoints.length - 1,
                },
              ],
            ] : [],
          },
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
        ...(minimumSavingsPoints
          ? [
              {
                name: "Capital minimum à la retraite",
                type: "line" as const,
                smooth: true,
                showSymbol: false,
                lineStyle: {
                  width: 3,
                  type: "dashed" as const,
                  color: "#f59e0b",
                },
                data: combinedPoints.map((_point, index) => {
                  const minPoint = minimumSavingsPoints[index];
                  return minPoint ? minPoint.value : null;
                }),
                z: 10, // Afficher au-dessus des autres courbes
              },
            ]
          : []),
      ],
    };
  }, [combinedPoints, hasData, retirementStartIndex, minimumSavingsPoints]);

  if (!hasData) {
    return null;
  }

  return (
    <Card
      sx={{
        background: theme.palette.background.paper,
        borderRadius: "1.25rem",
        boxShadow: theme.shadows[4],
        border: `1px solid ${theme.palette.divider}`,
        mb: { xs: 3, md: 4 },
      }}
    >
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h5" component="h2" gutterBottom sx={{ fontSize: { xs: "1.5rem", md: "1.75rem" }, fontWeight: 700, color: theme.palette.text.primary }}>
            Trajectoire globale (capitalisation + retraite)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.95rem", lineHeight: 1.6 }}>
            Comparaison des scénarios pessimiste, médian et optimiste de capitalisation jusqu&apos;à la retraite puis de la
            phase de retraite.
          </Typography>
        </Box>
        {chartOption ? (
          <Box
            sx={{
              width: "100%",
              height: { xs: "300px", md: "320px" },
              borderRadius: "1rem",
              overflow: "hidden",
            }}
          >
            <ReactECharts option={chartOption} style={{ width: "100%", height: "100%" }} />
          </Box>
        ) : null}
      </CardContent>
    </Card>
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
  const theme = useTheme();
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
            if (med.totalTaxes && med.totalTaxes > 0) {
              lines.push(`Impôts ce mois: ${formatCurrency(med.totalTaxes, 0)}`);
              if (med.taxesByAccountType && med.taxesByAccountType.length > 0) {
                const accountTypeLabels: Record<string, string> = {
                  pea: "PEA",
                  per: "PER",
                  assurance_vie: "Assurance-vie",
                  livret: "Livrets",
                  cto: "CTO",
                  crypto: "Crypto",
                  autre: "Autre",
                };
                med.taxesByAccountType.forEach((tax) => {
                  const label = accountTypeLabels[tax.accountType] || tax.accountType;
                  if (tax.incomeTax + tax.socialContributions > 0) {
                    lines.push(`  ${label}: ${formatCurrency(tax.incomeTax + tax.socialContributions, 0)}`);
                  }
                });
              }
            }
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
    <Card
      sx={{
        background: theme.palette.background.paper,
        borderRadius: "1.25rem",
        boxShadow: theme.shadows[4],
        border: `1px solid ${theme.palette.divider}`,
        mb: { xs: 3, md: 4 },
      }}
    >
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h5" component="h2" gutterBottom sx={{ fontSize: { xs: "1.5rem", md: "1.75rem" }, fontWeight: 700, color: theme.palette.text.primary }}>
            Phase de retraite – Simulation Monte Carlo
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.95rem", lineHeight: 1.6 }}>
            {durationYears !== undefined
              ? `Durée projetée : ${durationYears.toLocaleString("fr-FR", {
                  maximumFractionDigits: 1,
                })} ans · `
              : ""}
            Revenu cible {formatCurrency(targetMonthlyIncome)} · Pension attendue {formatCurrency(pensionMonthlyIncome)}
          </Typography>
        </Box>

        <GridLegacy container spacing={{ xs: 2, md: 2.5 }} sx={{ mb: 3 }}>
          <GridLegacy item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: theme.palette.background.paper,
                borderRadius: "1rem",
                boxShadow: theme.shadows[2],
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <CardContent sx={{ p: 2 }}>
                <Typography variant="h6" component="h3" gutterBottom sx={{ fontSize: "0.95rem", fontWeight: 600, color: theme.palette.text.primary }}>
                  Capital pessimiste (10%)
                </Typography>
                <Typography variant="h6" component="p" sx={{ fontWeight: 700, fontSize: "1.5rem", color: theme.palette.text.primary, mb: 0.5 }}>
                  {formatCurrency(results.pessimistic.medianFinalCapital, 0)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.85rem" }}>
                  Médiane du scénario pessimiste
                </Typography>
              </CardContent>
            </Card>
          </GridLegacy>
          <GridLegacy item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: theme.palette.background.paper,
                borderRadius: "1rem",
                boxShadow: theme.shadows[2],
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <CardContent sx={{ p: 2 }}>
                <Typography variant="h6" component="h3" gutterBottom sx={{ fontSize: "0.95rem", fontWeight: 600, color: theme.palette.text.primary }}>
                  Capital médian
                </Typography>
                <Typography variant="h6" component="p" sx={{ fontWeight: 700, fontSize: "1.5rem", color: theme.palette.text.primary }}>
                  {formatCurrency(results.median.medianFinalCapital, 0)}
                </Typography>
              </CardContent>
            </Card>
          </GridLegacy>
          <GridLegacy item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: theme.palette.background.paper,
                borderRadius: "1rem",
                boxShadow: theme.shadows[2],
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <CardContent sx={{ p: 2 }}>
                <Typography variant="h6" component="h3" gutterBottom sx={{ fontSize: "0.95rem", fontWeight: 600, color: theme.palette.text.primary }}>
                  Capital optimiste (90%)
                </Typography>
                <Typography variant="h6" component="p" sx={{ fontWeight: 700, fontSize: "1.5rem", color: theme.palette.text.primary, mb: 0.5 }}>
                  {formatCurrency(results.optimistic.medianFinalCapital, 0)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.85rem" }}>
                  Médiane du scénario optimiste
                </Typography>
              </CardContent>
            </Card>
          </GridLegacy>
          <GridLegacy item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: theme.palette.background.paper,
                borderRadius: "1rem",
                boxShadow: theme.shadows[2],
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <CardContent sx={{ p: 2 }}>
                <Typography variant="h6" component="h3" gutterBottom sx={{ fontSize: "0.95rem", fontWeight: 600, color: theme.palette.text.primary }}>
                  Retraits cumulés (médian)
                </Typography>
                <Typography variant="h6" component="p" sx={{ fontWeight: 700, fontSize: "1.5rem", color: theme.palette.text.primary }}>
                  {formatCurrency(cumulativeWithdrawalMedian, 0)}
                </Typography>
              </CardContent>
            </Card>
          </GridLegacy>
        </GridLegacy>

        {chartOption ? (
          <Box
            sx={{
              width: "100%",
              height: { xs: "300px", md: "320px" },
              borderRadius: "1rem",
              overflow: "hidden",
            }}
          >
            <ReactECharts option={chartOption} style={{ width: "100%", height: "100%" }} />
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
            Aucune donnée de simulation retraite disponible.
          </Typography>
        )}

        {/* Section des taxes */}
        {results.median.totalTaxesByAccountType && Object.keys(results.median.totalTaxesByAccountType).length > 0 && (
            <Box sx={{ mt: 4 }}>
            <Typography variant="h6" component="h3" gutterBottom sx={{ fontSize: { xs: "1.1rem", md: "1.25rem" }, fontWeight: 700, mb: 2, color: theme.palette.text.primary }}>
              Impôts sur les retraits par type de placement
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontSize: "0.9rem" }}>
              Répartition des impôts et prélèvements sociaux payés sur les retraits pendant toute la phase de retraite
            </Typography>
            
            <GridLegacy container spacing={2} sx={{ mb: 2 }}>
              <GridLegacy item xs={12} sm={6} md={4}>
                <Card sx={{ 
                  background: theme.palette.mode === "dark" ? "rgba(239, 68, 68, 0.15)" : "rgba(239, 68, 68, 0.05)", 
                  border: `1px solid ${theme.palette.mode === "dark" ? "rgba(239, 68, 68, 0.4)" : "rgba(239, 68, 68, 0.2)"}` 
                }}>
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.85rem", mb: 0.5 }}>
                      Impôt sur le revenu total
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.25rem", color: theme.palette.error.main }}>
                      {formatCurrency(results.median.cumulativeTotalIncomeTax ?? 0, 0)}
                    </Typography>
                  </CardContent>
                </Card>
              </GridLegacy>
              <GridLegacy item xs={12} sm={6} md={4}>
                <Card sx={{ 
                  background: theme.palette.mode === "dark" ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.05)", 
                  border: `1px solid ${theme.palette.mode === "dark" ? "rgba(59, 130, 246, 0.4)" : "rgba(59, 130, 246, 0.2)"}` 
                }}>
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.85rem", mb: 0.5 }}>
                      Prélèvements sociaux total
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.25rem", color: theme.palette.primary.main }}>
                      {formatCurrency(results.median.cumulativeTotalSocialContributions ?? 0, 0)}
                    </Typography>
                  </CardContent>
                </Card>
              </GridLegacy>
              <GridLegacy item xs={12} sm={6} md={4}>
                <Card sx={{ 
                  background: theme.palette.mode === "dark" ? "rgba(16, 185, 129, 0.15)" : "rgba(16, 185, 129, 0.05)", 
                  border: `1px solid ${theme.palette.mode === "dark" ? "rgba(16, 185, 129, 0.4)" : "rgba(16, 185, 129, 0.2)"}` 
                }}>
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.85rem", mb: 0.5 }}>
                      Total des impôts
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.25rem", color: theme.palette.success.main }}>
                      {formatCurrency(results.median.cumulativeTotalTaxes ?? 0, 0)}
                    </Typography>
                  </CardContent>
                </Card>
              </GridLegacy>
            </GridLegacy>

            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" component="h4" gutterBottom sx={{ fontWeight: 600, mb: 2, color: theme.palette.text.primary }}>
                Détail par type de placement
              </Typography>
              
              {/* Total des retraits bruts */}
              {(() => {
                const totalGrossWithdrawals = Object.values(results.median.totalTaxesByAccountType).reduce(
                  (sum, taxData) => sum + (taxData.grossWithdrawal ?? 0),
                  0
                );
                const totalNetWithdrawals = Object.values(results.median.totalTaxesByAccountType).reduce(
                  (sum, taxData) => sum + (taxData.netWithdrawal ?? 0),
                  0
                );
                const totalTaxes = Object.values(results.median.totalTaxesByAccountType).reduce(
                  (sum, taxData) => sum + (taxData.incomeTax ?? 0) + (taxData.socialContributions ?? 0),
                  0
                );
                
                return (
                  <Box sx={{ 
                    mb: 3, 
                    p: 2, 
                    background: theme.palette.mode === "dark" ? "rgba(37, 99, 235, 0.15)" : "rgba(37, 99, 235, 0.05)", 
                    borderRadius: 2, 
                    border: `1px solid ${theme.palette.mode === "dark" ? "rgba(37, 99, 235, 0.4)" : "rgba(37, 99, 235, 0.2)"}` 
                  }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, fontSize: "1rem", color: theme.palette.text.primary }}>
                      Totaux sur toute la période de retraite
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem", mb: 1.5, display: "block", fontStyle: "italic" }}>
                      Ces montants représentent la somme de tous les retraits effectués pendant toute la période de retraite, pas le capital restant.
                    </Typography>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2" color="text.secondary">
                          Retraits bruts totaux:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "1rem" }}>
                          {formatCurrency(totalGrossWithdrawals, 0)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2" color="text.secondary">
                          Impôts totaux:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: "#dc2626" }}>
                          {formatCurrency(totalTaxes, 0)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(148, 163, 184, 0.3)", pt: 1, mt: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Retraits nets totaux:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "1rem", color: "#059669" }}>
                          {formatCurrency(totalNetWithdrawals, 0)}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                );
              })()}
              
              <GridLegacy container spacing={2}>
                {Object.entries(results.median.totalTaxesByAccountType).map(([accountType, taxData]) => {
                  const accountTypeLabels: Record<string, string> = {
                    pea: "PEA",
                    per: "PER",
                    assurance_vie: "Assurance-vie",
                    livret: "Livrets réglementés",
                    cto: "CTO",
                    crypto: "Cryptomonnaies",
                    autre: "Autre",
                  };
                  const label = accountTypeLabels[accountType] || accountType;
                  
                  return (
                    <GridLegacy item xs={12} sm={6} md={4} key={accountType}>
                      <Card sx={{ background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}` }}>
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, fontSize: "0.95rem", color: theme.palette.text.primary }}>
                            {label}
                          </Typography>
                          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.8rem" }}>
                                Retraits bruts:
                              </Typography>
                              <Typography variant="caption" sx={{ fontWeight: 600, fontSize: "0.8rem" }}>
                                {formatCurrency(taxData.grossWithdrawal, 0)}
                              </Typography>
                            </Box>
                            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.8rem" }}>
                                Plus-values:
                              </Typography>
                              <Typography variant="caption" sx={{ fontWeight: 600, fontSize: "0.8rem" }}>
                                {formatCurrency(taxData.capitalGain, 0)}
                              </Typography>
                            </Box>
                            <Box sx={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(148, 163, 184, 0.2)", pt: 0.5 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.8rem" }}>
                                IR:
                              </Typography>
                              <Typography variant="caption" sx={{ fontWeight: 600, fontSize: "0.8rem", color: "#dc2626" }}>
                                {formatCurrency(taxData.incomeTax, 0)}
                              </Typography>
                            </Box>
                            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.8rem" }}>
                                PS:
                              </Typography>
                              <Typography variant="caption" sx={{ fontWeight: 600, fontSize: "0.8rem", color: "#2563eb" }}>
                                {formatCurrency(taxData.socialContributions, 0)}
                              </Typography>
                            </Box>
                            <Box sx={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(148, 163, 184, 0.3)", pt: 0.5, mt: 0.5 }}>
                              <Typography variant="caption" sx={{ fontWeight: 600, fontSize: "0.85rem" }}>
                                Total impôts:
                              </Typography>
                              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.85rem", color: "#059669" }}>
                                {formatCurrency(taxData.incomeTax + taxData.socialContributions, 0)}
                              </Typography>
                            </Box>
                            <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.8rem" }}>
                                Retraits nets:
                              </Typography>
                              <Typography variant="caption" sx={{ fontWeight: 600, fontSize: "0.8rem", color: "#059669" }}>
                                {formatCurrency(taxData.netWithdrawal, 0)}
                              </Typography>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </GridLegacy>
                  );
                })}
              </GridLegacy>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
export default SimulationResultPage;

