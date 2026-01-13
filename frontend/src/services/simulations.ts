/**
 * Services pour les simulations de retraite.
 * 
 * Gère les appels API pour les simulations, les projections Monte Carlo,
 * et l'optimisation de l'épargne. Inclut des fonctions de mapping entre
 * les formats frontend (camelCase) et backend (snake_case).
 */

import apiClient from "@/lib/api-client";
import type {
  CapitalizationPreview,
  LivretBreakdown,
  MonteCarloResult,
  OptimizationStep,
  RetirementMonteCarloResult,
  RetirementScenarioResults,
  Simulation,
  SimulationInput,
  TaxBreakdownByAccountType,
} from "@/types/simulation";

/**
 * Convertit les données de simulation du format frontend vers le format API backend.
 * 
 * @param simulation - Données de simulation au format frontend
 * @param projectId - ID du projet optionnel à associer à la simulation
 * @returns Données au format API backend
 */
function mapSimulationInputToApi(simulation: SimulationInput, projectId?: number) {
  const primaryAdult = simulation.adults[0];

  const currentAge = primaryAdult?.currentAge ?? 0;
  const retirementAge = primaryAdult?.retirementAge ?? (currentAge > 0 ? currentAge + 25 : 65);
  const lifeExpectancy = primaryAdult?.lifeExpectancy;
  
  console.log("mapSimulationInputToApi - Données extraites:", {
    currentAge,
    retirementAge,
    lifeExpectancy,
    projectId,
    hasAdults: !!primaryAdult,
  });
  const householdCharges = simulation.householdCharges ?? [];
  const childCharges = simulation.childCharges ?? [];
  const housingLoanCharge = householdCharges.find(
    (charge) => charge.category === "housing_loan" && charge.untilAge,
  );
  const dependentsDepartureAge = simulation.children.reduce<number | undefined>((max, child, index) => {
    const charge = childCharges[index];
    if (!child.departureAge) {
      return charge?.untilAge ?? max;
    }
    const candidate = charge?.untilAge ? Math.max(child.departureAge, charge.untilAge) : child.departureAge;
    return max === undefined ? candidate : Math.max(max, candidate);
  }, undefined);

  // Validation : current_age et retirement_age doivent être des entiers positifs
  if (currentAge <= 0) {
    throw new Error(`current_age doit être un entier positif, reçu: ${currentAge}`);
  }
  if (retirementAge <= 0) {
    throw new Error(`retirement_age doit être un entier positif, reçu: ${retirementAge}`);
  }
  
  // Convertir additional_income_streams de tableau à dictionnaire si nécessaire
  // Le backend attend un dict[str, float] ou None, pas un tableau
  let additionalIncomeStreamsDict: Record<string, number> | null = null;
  if (simulation.additionalIncomeStreams && simulation.additionalIncomeStreams.length > 0) {
    additionalIncomeStreamsDict = {};
    simulation.additionalIncomeStreams.forEach((stream) => {
      // Utiliser le label comme clé et monthlyAmount comme valeur
      additionalIncomeStreamsDict![stream.label] = stream.monthlyAmount;
    });
  }
  
  const apiData: any = {
    name: simulation.name,
    current_age: Math.round(currentAge), // S'assurer que c'est un entier
    retirement_age: Math.round(retirementAge), // S'assurer que c'est un entier
    life_expectancy: lifeExpectancy ? Math.round(lifeExpectancy) : null,
    target_monthly_income: simulation.targetMonthlyIncome,
    state_pension_monthly_income: simulation.statePensionMonthlyIncome,
    housing_loan_end_age: housingLoanCharge?.untilAge ?? simulation.housingLoanEndAge,
    dependents_departure_age: dependentsDepartureAge ?? simulation.dependentsDepartureAge,
    additional_income_streams: additionalIncomeStreamsDict,
    inputs_snapshot: {
      household_status: simulation.householdStatus,
      adults: simulation.adults,
      children: simulation.children,
      spending_profile: simulation.spendingProfile,
      savings_phases: simulation.savingsPhases,
      household_charges: householdCharges,
      child_charges: childCharges,
      investment_accounts: simulation.investmentAccounts,
      additional_income_streams: simulation.additionalIncomeStreams,
      market_assumptions: simulation.marketAssumptions,
    },
  };
  
  // Ajouter project_id si fourni
  if (projectId !== undefined) {
    apiData.project_id = projectId;
  }
  
  console.log("mapSimulationInputToApi - Données finales envoyées:", {
    name: apiData.name,
    current_age: apiData.current_age,
    retirement_age: apiData.retirement_age,
    project_id: apiData.project_id,
    has_inputs_snapshot: !!apiData.inputs_snapshot,
  });
  
  return apiData;
}

/**
 * Convertit les données des adultes vers le format API.
 */
function mapAdultsToApi(adults: SimulationInput["adults"]) {
  return adults.map((adult) => ({
    first_name: adult.firstName,
    current_age: adult.currentAge,
    retirement_age: adult.retirementAge,
    life_expectancy: adult.lifeExpectancy,
  }));
}

/**
 * Convertit les phases d'épargne vers le format API.
 */
function mapSavingsPhasesToApi(phases: SimulationInput["savingsPhases"]) {
  return phases.map((phase) => ({
    label: phase.label,
    from_age: phase.fromAge,
    to_age: phase.toAge,
    monthly_contribution: phase.monthlyContribution,
  }));
}

/**
 * Convertit le profil de dépenses vers le format API.
 */
function mapSpendingProfileToApi(phases: SimulationInput["spendingProfile"]) {
  return phases.map((phase) => ({
    label: phase.label,
    from_age: phase.fromAge,
    to_age: phase.toAge,
    spending_ratio: phase.spendingRatio,
  }));
}

/**
 * Convertit la répartition des livrets vers le format API.
 */
function mapLivretBreakdownToApi(breakdown: LivretBreakdown[] | undefined) {
  return (breakdown ?? []).map((entry) => ({
    id: entry.id,
    label: entry.label,
    percentage: entry.percentage,
  }));
}

/**
 * Convertit les comptes d'investissement vers le format API.
 */
function mapInvestmentAccountsToApi(accounts: SimulationInput["investmentAccounts"]) {
  return accounts.map((account) => ({
    id: account.id,
    type: account.type,
    label: account.label,
    current_amount: account.currentAmount,
    monthly_contribution: account.monthlyContribution,
    monthly_contribution_share: account.monthlyContributionShare,
    owner_name: account.ownerName,
    allocation_actions: account.allocationActions,
    allocation_obligations: account.allocationObligations,
    livret_breakdown: mapLivretBreakdownToApi(account.livretBreakdown),
    expected_performance: account.expectedPerformance,
    opening_date_age: account.openingDateAge,
    initial_cost_basis: account.initialCostBasis,
  }));
}

/**
 * Convertit les revenus additionnels vers le format API.
 */
function mapAdditionalIncomeStreamsToApi(streams: SimulationInput["additionalIncomeStreams"]) {
  return (streams ?? []).map((stream) => ({
    label: stream.label,
    monthly_amount: stream.monthlyAmount,
    start_age: stream.startAge,
  }));
}

/**
 * Convertit les charges du foyer vers le format API.
 */
function mapHouseholdChargesToApi(charges: SimulationInput["householdCharges"]) {
  return (charges ?? []).map((charge) => ({
    id: charge.id,
    label: charge.label,
    category: charge.category,
    monthly_amount: charge.monthlyAmount,
    until_age: charge.untilAge,
  }));
}

/**
 * Convertit les charges liées aux enfants vers le format API.
 */
function mapChildChargesToApi(charges: SimulationInput["childCharges"]) {
  return (charges ?? []).map((charge) => ({
    child_name: charge.childName,
    monthly_amount: charge.monthlyAmount,
    until_age: charge.untilAge,
  }));
}

/**
 * Convertit les hypothèses de marché vers le format API.
 */
function mapMarketAssumptionsToApi(market: SimulationInput["marketAssumptions"]) {
  const assetClasses = market?.assetClasses ?? {};
  const mappedAssets: Record<string, { expected_return: number; volatility?: number }> = {};

  Object.entries(assetClasses).forEach(([key, value]) => {
    if (value?.expectedReturn !== undefined) {
      mappedAssets[key] = { expected_return: value.expectedReturn };
      if (typeof value.volatility === "number") {
        mappedAssets[key].volatility = value.volatility;
      }
    }
  });

  const correlations: Record<string, Record<string, number>> = {};
  Object.entries(market?.correlations ?? {}).forEach(([rowKey, row]) => {
    correlations[rowKey] = { ...row };
  });

  return {
    inflation_mean: market?.inflationMean,
    inflation_volatility: market?.inflationVolatility,
    asset_classes: mappedAssets,
    correlations,
    confidence_level: market?.confidenceLevel,
    tolerance_ratio: market?.toleranceRatio,
    max_iterations: market?.maxIterations,
    batch_size: market?.batchSize,
  };
}

/**
 * Construit un résultat Monte Carlo depuis la réponse API.
 */
function buildMonteCarloResultFromApi(data: any): MonteCarloResult {
  return {
    iterations: data.iterations ?? 0,
    confidenceLevel: data.confidenceLevel ?? data.confidence_level ?? 0.9,
    toleranceRatio: data.toleranceRatio ?? data.tolerance_ratio ?? 0.01,
    confidenceReached: data.confidenceReached ?? data.confidence_reached ?? false,
    errorMargin: data.errorMargin ?? data.error_margin ?? 0,
    errorMarginRatio: data.errorMarginRatio ?? data.error_margin_ratio ?? 0,
    meanFinalCapital: data.meanFinalCapital ?? data.mean_final_capital ?? 0,
    medianFinalCapital: data.medianFinalCapital ?? data.median_final_capital ?? 0,
    percentile10: data.percentile10 ?? data.percentile_10 ?? 0,
    percentile50: data.percentile50 ?? data.percentile_50 ?? 0,
    percentile90: data.percentile90 ?? data.percentile_90 ?? 0,
    percentileMin: data.percentileMin ?? data.percentile_min ?? 0,
    percentileMax: data.percentileMax ?? data.percentile_max ?? 0,
    standardDeviation: data.standardDeviation ?? data.standard_deviation ?? 0,
    monthlyPercentiles: (data.monthlyPercentiles ?? data.monthly_percentiles ?? []).map((point: any) => ({
      monthIndex: point.monthIndex ?? point.month_index ?? 0,
      age: point.age ?? 0,
      percentileMin: point.percentileMin ?? point.percentile_min ?? 0,
      percentile10: point.percentile10 ?? point.percentile_10 ?? 0,
      percentile50: point.percentile50 ?? point.percentile_50 ?? 0,
      percentile90: point.percentile90 ?? point.percentile_90 ?? 0,
      percentileMax: point.percentileMax ?? point.percentile_max ?? 0,
      cumulativeContribution: point.cumulativeContribution ?? point.cumulative_contribution ?? 0,
    })),
  };
}

/**
 * Construit un résultat de simulation de retraite depuis la réponse API.
 */
function buildRetirementMonteCarloResultFromApi(data: any): RetirementMonteCarloResult {
  const result: RetirementMonteCarloResult = {
    iterations: data.iterations ?? 0,
    confidenceLevel: data.confidenceLevel ?? data.confidence_level ?? 0.9,
    toleranceRatio: data.toleranceRatio ?? data.tolerance_ratio ?? 0.01,
    confidenceReached: data.confidenceReached ?? data.confidence_reached ?? false,
    errorMargin: data.errorMargin ?? data.error_margin ?? 0,
    errorMarginRatio: data.errorMarginRatio ?? data.error_margin_ratio ?? 0,
    meanFinalCapital: data.meanFinalCapital ?? data.mean_final_capital ?? 0,
    medianFinalCapital: data.medianFinalCapital ?? data.median_final_capital ?? 0,
    percentile10: data.percentile10 ?? data.percentile_10 ?? 0,
    percentile50: data.percentile50 ?? data.percentile_50 ?? 0,
    percentile90: data.percentile90 ?? data.percentile_90 ?? 0,
    percentileMin: data.percentileMin ?? data.percentile_min ?? 0,
    percentileMax: data.percentileMax ?? data.percentile_max ?? 0,
    standardDeviation: data.standardDeviation ?? data.standard_deviation ?? 0,
    monthlyPercentiles: (data.monthlyPercentiles ?? data.monthly_percentiles ?? []).map((point: any) => ({
      monthIndex: point.monthIndex ?? point.month_index ?? 0,
      age: point.age ?? 0,
      monthlyWithdrawal: point.monthlyWithdrawal ?? point.monthly_withdrawal ?? 0,
      cumulativeWithdrawal: point.cumulativeWithdrawal ?? point.cumulative_withdrawal ?? 0,
      percentileMin: point.percentileMin ?? point.percentile_min ?? 0,
      percentile10: point.percentile10 ?? point.percentile_10 ?? 0,
      percentile50: point.percentile50 ?? point.percentile_50 ?? 0,
      percentile90: point.percentile90 ?? point.percentile_90 ?? 0,
      percentileMax: point.percentileMax ?? point.percentile_max ?? 0,
      taxesByAccountType: (point.taxesByAccountType ?? point.taxes_by_account_type ?? []).map((tax: any) => ({
        accountType: tax.accountType ?? tax.account_type ?? "",
        grossWithdrawal: tax.grossWithdrawal ?? tax.gross_withdrawal ?? 0,
        capitalGain: tax.capitalGain ?? tax.capital_gain ?? 0,
        incomeTax: tax.incomeTax ?? tax.income_tax ?? 0,
        socialContributions: tax.socialContributions ?? tax.social_contributions ?? 0,
        netWithdrawal: tax.netWithdrawal ?? tax.net_withdrawal ?? 0,
      })),
      totalIncomeTax: point.totalIncomeTax ?? point.total_income_tax ?? 0,
      totalSocialContributions: point.totalSocialContributions ?? point.total_social_contributions ?? 0,
      totalTaxes: point.totalTaxes ?? point.total_taxes ?? 0,
    })),
    totalTaxesByAccountType: (() => {
      const taxes = data.totalTaxesByAccountType ?? data.total_taxes_by_account_type ?? {};
      console.log("Taxes reçues du backend:", taxes);
      if (Object.keys(taxes).length === 0) {
        console.warn("Aucune taxe reçue du backend!");
      }
      // Convertir les valeurs en format frontend si nécessaire
      const converted: Record<string, TaxBreakdownByAccountType> = {};
      for (const [key, value] of Object.entries(taxes)) {
        if (value && typeof value === 'object') {
          const taxValue = value as any;
          converted[key] = {
            accountType: taxValue.accountType ?? taxValue.account_type ?? key,
            grossWithdrawal: taxValue.grossWithdrawal ?? taxValue.gross_withdrawal ?? 0,
            capitalGain: taxValue.capitalGain ?? taxValue.capital_gain ?? 0,
            incomeTax: taxValue.incomeTax ?? taxValue.income_tax ?? 0,
            socialContributions: taxValue.socialContributions ?? taxValue.social_contributions ?? 0,
            netWithdrawal: taxValue.netWithdrawal ?? taxValue.net_withdrawal ?? 0,
          };
        }
      }
      console.log("Taxes converties:", converted);
      return converted;
    })(),
    cumulativeTotalIncomeTax: data.cumulativeTotalIncomeTax ?? data.cumulative_total_income_tax ?? 0,
    cumulativeTotalSocialContributions: data.cumulativeTotalSocialContributions ?? data.cumulative_total_social_contributions ?? 0,
    cumulativeTotalTaxes: data.cumulativeTotalTaxes ?? data.cumulative_total_taxes ?? 0,
  };
  
  console.log("Résultat final buildRetirementMonteCarloResultFromApi:", {
    hasTaxes: Object.keys(result.totalTaxesByAccountType ?? {}).length > 0,
    totalIncomeTax: result.cumulativeTotalIncomeTax,
    totalSocialContributions: result.cumulativeTotalSocialContributions,
    totalTaxes: result.cumulativeTotalTaxes,
  });
  
  return result;
}

/**
 * Construit les résultats des scénarios de retraite depuis la réponse API.
 */
function buildRetirementScenarioResultsFromApi(data: any): RetirementScenarioResults {
  if (!data.pessimistic || !data.median || !data.optimistic) {
    console.error("Réponse API invalide : scénarios de retraite manquants", data);
    // Retourner des valeurs par défaut pour éviter un crash
    const defaultResult: RetirementMonteCarloResult = {
      iterations: 0,
      confidenceLevel: 0.9,
      toleranceRatio: 0.01,
      confidenceReached: false,
      errorMargin: 0,
      errorMarginRatio: 0,
      meanFinalCapital: 0,
      medianFinalCapital: 0,
      percentile10: 0,
      percentile50: 0,
      percentile90: 0,
      percentileMin: 0,
      percentileMax: 0,
      standardDeviation: 0,
      monthlyPercentiles: [],
    };
    return {
      pessimistic: data.pessimistic ? buildRetirementMonteCarloResultFromApi(data.pessimistic) : defaultResult,
      median: data.median ? buildRetirementMonteCarloResultFromApi(data.median) : defaultResult,
      optimistic: data.optimistic ? buildRetirementMonteCarloResultFromApi(data.optimistic) : defaultResult,
    };
  }
  
  return {
    pessimistic: buildRetirementMonteCarloResultFromApi(data.pessimistic),
    median: buildRetirementMonteCarloResultFromApi(data.median),
    optimistic: buildRetirementMonteCarloResultFromApi(data.optimistic),
  };
}

/**
 * Crée une nouvelle simulation sauvegardée.
 * 
 * @param simulation - Données de la simulation à créer
 * @param projectId - ID du projet optionnel à associer à la simulation
 * @returns Simulation créée avec son ID
 */
export async function createSimulation(simulation: SimulationInput, projectId?: number): Promise<Simulation> {
  const response = await apiClient.post<Simulation>("/simulations/", mapSimulationInputToApi(simulation, projectId));
  return response.data;
}

/**
 * Liste toutes les simulations de l'utilisateur authentifié.
 * 
 * @returns Liste des simulations
 */
export async function listSimulations(): Promise<Simulation[]> {
  const response = await apiClient.get<Simulation[]>("/simulations/");
  return response.data;
}

/**
 * Récupère une simulation spécifique par son ID.
 * 
 * @param simulationId - Identifiant de la simulation
 * @returns Simulation trouvée
 */
export async function fetchSimulation(simulationId: number): Promise<Simulation> {
  const response = await apiClient.get<Simulation>(`/simulations/${simulationId}`);
  return response.data;
}

/**
 * Met à jour une simulation existante.
 * 
 * @param simulationId - Identifiant de la simulation
 * @param simulation - Données de mise à jour
 * @param projectId - ID du projet optionnel
 * @returns Simulation mise à jour
 */
export async function updateSimulation(
  simulationId: number,
  simulation: SimulationInput,
  projectId?: number,
): Promise<Simulation> {
  // Pour la mise à jour, on n'envoie que les champs modifiables
  // (pas current_age et retirement_age qui sont fixes)
  const apiData = mapSimulationInputToApi(simulation, projectId);
  
  // Créer l'objet de mise à jour sans current_age et retirement_age
  const updateData: any = {
    name: apiData.name,
    target_monthly_income: apiData.target_monthly_income,
    state_pension_monthly_income: apiData.state_pension_monthly_income,
    housing_loan_end_age: apiData.housing_loan_end_age,
    dependents_departure_age: apiData.dependents_departure_age,
    additional_income_streams: apiData.additional_income_streams,
    inputs_snapshot: apiData.inputs_snapshot,
  };
  
  if (projectId !== undefined) {
    updateData.project_id = projectId;
  }
  
  console.log("Mise à jour de la simulation avec:", {
    simulationId,
    projectId,
    hasInputsSnapshot: !!updateData.inputs_snapshot,
  });
  
  const response = await apiClient.put<Simulation>(`/simulations/${simulationId}`, updateData);
  return response.data;
}

/**
 * Supprime une simulation.
 * 
 * @param simulationId - Identifiant de la simulation
 */
export async function deleteSimulation(simulationId: number): Promise<void> {
  await apiClient.delete(`/simulations/${simulationId}`);
}

/**
 * Calcule une prévisualisation déterministe de la phase de capitalisation.
 * 
 * @param payload - Paramètres de la simulation
 * @returns Résultat de la prévisualisation avec séries mensuelles
 */
export async function previewCapitalization(
  payload: SimulationInput,
): Promise<CapitalizationPreview> {
  const response = await apiClient.post("/simulations/capitalization-preview", {
    adults: mapAdultsToApi(payload.adults),
    savings_phases: mapSavingsPhasesToApi(payload.savingsPhases ?? []),
    investment_accounts: mapInvestmentAccountsToApi(payload.investmentAccounts),
    market_assumptions: mapMarketAssumptionsToApi(payload.marketAssumptions),
    tax_parameters: payload.taxParameters ? {
      tmi_savings_phase: payload.taxParameters.tmiSavingsPhase,
      tmi_retirement_phase: payload.taxParameters.tmiRetirementPhase,
      is_couple: payload.taxParameters.isCouple,
    } : undefined,
  });

  const data = response.data;
  return {
    startCapital: data.start_capital,
    endCapital: data.end_capital,
    totalContributions: data.total_contributions,
    totalGains: data.total_gains,
    monthlySeries: (data.monthly_series ?? []).map((point: any) => ({
      monthIndex: point.month_index,
      age: point.age,
      contributions: point.contributions,
      gains: point.gains,
      totalCapital: point.total_capital,
    })),
  };
}

/**
 * Calcule une simulation Monte Carlo de la phase de capitalisation.
 * 
 * @param payload - Paramètres de la simulation
 * @returns Résultat de la simulation avec percentiles mensuels
 */
export async function simulateMonteCarlo(payload: SimulationInput): Promise<MonteCarloResult> {
  const response = await apiClient.post("/simulations/monte-carlo", {
    adults: mapAdultsToApi(payload.adults),
    savings_phases: mapSavingsPhasesToApi(payload.savingsPhases ?? []),
    investment_accounts: mapInvestmentAccountsToApi(payload.investmentAccounts),
    market_assumptions: mapMarketAssumptionsToApi(payload.marketAssumptions),
    tax_parameters: payload.taxParameters ? {
      tmi_savings_phase: payload.taxParameters.tmiSavingsPhase,
      tmi_retirement_phase: payload.taxParameters.tmiRetirementPhase,
      is_couple: payload.taxParameters.isCouple,
    } : undefined,
  });

  return buildMonteCarloResultFromApi(response.data);
}

/**
 * Construit les comptes d'investissement pour la phase de retraite.
 * 
 * Répartit le capital médian de la phase de capitalisation proportionnellement
 * aux allocations des comptes d'investissement.
 * 
 * @param accounts - Comptes d'investissement originaux
 * @param medianCapital - Capital médian à la retraite
 * @returns Comptes avec capital initial réparti et contributions à zéro
 */
function buildRetirementAccounts(
  accounts: SimulationInput["investmentAccounts"],
  medianCapital: number,
) {
  if (medianCapital <= 0 || accounts.length === 0) {
    return accounts.map((account) => ({
      ...account,
      currentAmount: 0,
      monthlyContribution: 0,
      monthlyContributionShare: 0,
    }));
  }

  const weights = accounts.map((account) => {
    if (account.monthlyContribution && account.monthlyContribution > 0) {
      return account.monthlyContribution;
    }
    if (account.monthlyContributionShare && account.monthlyContributionShare > 0) {
      return account.monthlyContributionShare;
    }
    if (account.currentAmount && account.currentAmount > 0) {
      return account.currentAmount;
    }
    return 1;
  });

  const weightTotal = weights.reduce((sum, value) => sum + value, 0);

  return accounts.map((account, index) => {
    const weight = weightTotal > 0 ? weights[index] / weightTotal : 1 / accounts.length;
    const currentAmount = medianCapital * weight;
    return {
      ...account,
      currentAmount,
      monthlyContribution: 0,
      monthlyContributionShare: weight * 100,
    };
  });
}

/**
 * Calcule une simulation Monte Carlo de la phase de retraite.
 * 
 * @param simulation - Paramètres de la simulation
 * @param initialCapital - Capital initial à la retraite (médian de la phase de capitalisation)
 * @returns Résultat de la simulation avec percentiles mensuels
 */
export async function simulateRetirementMonteCarlo(
  simulation: SimulationInput,
  initialCapital: number,
): Promise<RetirementMonteCarloResult> {
  const retirementAccounts = buildRetirementAccounts(simulation.investmentAccounts, initialCapital);

  const response = await apiClient.post("/simulations/retirement-monte-carlo", {
    adults: mapAdultsToApi(simulation.adults),
    investment_accounts: mapInvestmentAccountsToApi(retirementAccounts),
    market_assumptions: mapMarketAssumptionsToApi(simulation.marketAssumptions),
    spending_profile: mapSpendingProfileToApi(simulation.spendingProfile ?? []),
    target_monthly_income: simulation.targetMonthlyIncome ?? 0,
    state_pension_monthly_income: simulation.statePensionMonthlyIncome ?? 0,
    additional_income_streams: mapAdditionalIncomeStreamsToApi(simulation.additionalIncomeStreams),
    household_charges: mapHouseholdChargesToApi(simulation.householdCharges),
    child_charges: mapChildChargesToApi(simulation.childCharges),
    tax_parameters: simulation.taxParameters ? {
      tmi_savings_phase: simulation.taxParameters.tmiSavingsPhase,
      tmi_retirement_phase: simulation.taxParameters.tmiRetirementPhase,
      is_couple: simulation.taxParameters.isCouple,
    } : undefined,
  });

  return buildRetirementMonteCarloResultFromApi(response.data);
}

/**
 * Interface pour les événements de progression.
 */
export interface ProgressEvent {
  task_id: string;
  current_step: string;
  step_description: string;
  progress_percent: number;
  total_steps: number;
  current_step_index: number;
  message: string;
  is_complete: boolean;
  error?: string | null;
}

/**
 * Callback pour les événements de progression.
 */
export type ProgressCallback = (progress: ProgressEvent) => void;

/**
 * Optimise l'épargne mensuelle nécessaire pour atteindre un capital cible à l'âge de décès.
 * 
 * Combine les phases de capitalisation et de retraite pour trouver le facteur
 * d'épargne optimal via un algorithme de recherche par bissection.
 * 
 * @param simulation - Paramètres complets de la simulation
 * @param onProgress - Callback optionnel pour recevoir les événements de progression
 * @returns Résultat de l'optimisation avec épargne recommandée, simulations optimisées et étapes
 */
export async function optimizeSavingsPlan(
  simulation: SimulationInput,
  onProgress?: ProgressCallback,
  capitalizationOnly?: boolean,
  calculateMinimumSavings?: boolean,
  useRL?: boolean,
  rlEpisodes?: number,
  usePreTrained?: boolean,
): Promise<{
  scale: number;
  recommendedMonthlySavings: number;
  minimumCapitalAtRetirement: number;
  monteCarloResult: MonteCarloResult;
  retirementResults: RetirementScenarioResults | null;
  optimalMonteCarloResult?: MonteCarloResult | null;
  optimalRetirementResults?: RetirementScenarioResults | null;
  steps: OptimizationStep[];
  residualError: number;
  residualErrorRatio: number;
}> {
  // Validation des paramètres requis
  if (!simulation.adults || simulation.adults.length === 0) {
    throw new Error("Au moins un adulte est requis pour la simulation");
  }
  
  if (!simulation.marketAssumptions) {
    throw new Error("Les hypothèses de marché sont requises");
  }

  const payload = {
    adults: mapAdultsToApi(simulation.adults),
    savings_phases: mapSavingsPhasesToApi(simulation.savingsPhases ?? []),
    investment_accounts: mapInvestmentAccountsToApi(simulation.investmentAccounts),
    market_assumptions: mapMarketAssumptionsToApi(simulation.marketAssumptions),
    spending_profile: mapSpendingProfileToApi(simulation.spendingProfile ?? []),
    target_monthly_income: simulation.targetMonthlyIncome ?? 0,
    state_pension_monthly_income: simulation.statePensionMonthlyIncome ?? 0,
    additional_income_streams: mapAdditionalIncomeStreamsToApi(simulation.additionalIncomeStreams),
    household_charges: mapHouseholdChargesToApi(simulation.householdCharges),
    child_charges: mapChildChargesToApi(simulation.childCharges),
    tax_parameters: simulation.taxParameters ? {
      tmi_savings_phase: simulation.taxParameters.tmiSavingsPhase,
      tmi_retirement_phase: simulation.taxParameters.tmiRetirementPhase,
      is_couple: simulation.taxParameters.isCouple,
    } : undefined,
    confidence_level: 0.9,
    tolerance_ratio: 0.01,
    max_iterations: 24,
    batch_size: 500,
    target_final_capital: 0,
    capitalization_only: capitalizationOnly ?? false,
    calculate_minimum_savings: calculateMinimumSavings ?? true,
  };

  // Debug: log des paramètres envoyés
  console.log("Paramètres envoyés à l'API d'optimisation:", {
    adultsCount: payload.adults.length,
    savingsPhasesCount: payload.savings_phases.length,
    investmentAccountsCount: payload.investment_accounts.length,
    spendingProfileCount: payload.spending_profile.length,
    targetMonthlyIncome: payload.target_monthly_income,
    statePensionMonthlyIncome: payload.state_pension_monthly_income,
    additionalIncomeStreamsCount: payload.additional_income_streams?.length ?? 0,
  });

  // Générer un task_id unique pour le suivi de progression
  const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Démarrer l'écoute SSE si un callback est fourni
  let abortController: AbortController | null = null;
  if (onProgress) {
    // Construire l'URL SSE avec la base URL de l'API
    const baseURL = apiClient.defaults.baseURL || "http://localhost:8000/api/v1";
    const sseUrl = `${baseURL}/simulations/progress/${taskId}`;
    
    // Utiliser fetch avec ReadableStream pour pouvoir ajouter les headers d'authentification
    abortController = new AbortController();
    const token = localStorage.getItem("lv_token");
    
    fetch(sseUrl, {
      method: "GET",
      headers: token ? {
        Authorization: `Bearer ${token}`,
      } : {},
      signal: abortController.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        
        if (!reader) {
          console.error("Impossible de lire le stream SSE");
          return;
        }
        
        let buffer = "";
        
        console.log("Connexion SSE établie pour", taskId);
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log("Stream SSE terminé");
            break;
          }
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          
          for (const line of lines) {
            if (line.trim() === "") continue; // Ignorer les lignes vides
            
            if (line.startsWith("data: ")) {
              try {
                const data = line.slice(6); // Enlever "data: "
                const progress: ProgressEvent = JSON.parse(data);
                console.log("Événement de progression reçu:", {
                  task_id: progress.task_id,
                  current_step: progress.current_step,
                  step_description: progress.step_description,
                  progress_percent: progress.progress_percent,
                  message: progress.message,
                  is_complete: progress.is_complete,
                });
                onProgress(progress);
                
                // Fermer la connexion si la tâche est terminée
                if (progress.is_complete || progress.error) {
                  console.log("Tâche terminée, fermeture de la connexion SSE");
                  abortController?.abort();
                  return;
                }
              } catch (error) {
                console.error("Erreur lors du parsing de l'événement de progression:", error, "Ligne:", line);
              }
            } else if (line.trim() !== "" && !line.startsWith(":")) {
              // Log les lignes qui ne sont pas des données SSE pour déboguer
              console.log("Ligne SSE non reconnue:", line);
            }
          }
        }
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Erreur SSE:", error);
        }
      });
  }
  
  // Construire les query parameters
  const queryParams = new URLSearchParams({
    task_id: taskId,
  });
  if (useRL) {
    queryParams.append("use_rl", "true");
    if (rlEpisodes) {
      queryParams.append("rl_episodes", rlEpisodes.toString());
    }
    if (usePreTrained) {
      queryParams.append("use_pre_trained", "true");
    }
  }
  
  // Ajouter task_id comme query parameter
  const response = await apiClient.post(
    `/simulations/recommended-savings?${queryParams.toString()}`,
    payload
  );
  
  // Fermer la connexion SSE après la réponse
  if (abortController) {
    // Attendre un peu pour laisser le temps au dernier événement d'arriver
    setTimeout(() => {
      abortController?.abort();
    }, 1000);
  }

  const data = response.data;
  
  // Gérer les deux formats : camelCase et snake_case
  const monteCarloData = data.monteCarloResult || data.monte_carlo_result;
  const retirementData = data.retirementResults || data.retirement_results;
  const optimalMonteCarloData = data.optimalMonteCarloResult || data.optimal_monte_carlo_result;
  const optimalRetirementData = data.optimalRetirementResults || data.optimal_retirement_results;
  const recommendedSavings = data.recommendedMonthlySavings ?? data.recommended_monthly_savings ?? 0;
  const minCapital = data.minimumCapitalAtRetirement ?? data.minimum_capital_at_retirement ?? 0;
  const residualErr = data.residualError ?? data.residual_error ?? 0;
  const residualErrRatio = data.residualErrorRatio ?? data.residual_error_ratio ?? 0;
  
  // Debug : afficher la structure de la réponse
  console.log("Réponse API d'optimisation reçue:", {
    hasMonteCarloResult: !!monteCarloData,
    hasRetirementResults: !!retirementData,
    hasOptimalMonteCarloResult: !!optimalMonteCarloData,
    hasOptimalRetirementResults: !!optimalRetirementData,
    scale: data.scale,
    recommendedMonthlySavings: recommendedSavings,
    keysInData: Object.keys(data),
  });
  
  // Vérifier que les données requises sont présentes
  if (!monteCarloData) {
    console.error("Réponse API invalide : monteCarloResult/monte_carlo_result manquant. Données complètes:", JSON.stringify(data, null, 2));
    throw new Error("Réponse API invalide : données Monte Carlo manquantes.");
  }
  
  // retirementData peut être null si capitalization_only est True
  if (!capitalizationOnly && !retirementData) {
    console.error("Réponse API invalide : retirementResults/retirement_results manquant. Données complètes:", JSON.stringify(data, null, 2));
    throw new Error("Réponse API invalide : données de retraite manquantes.");
  }
  
  return {
    scale: data.scale ?? 1.0,
    recommendedMonthlySavings: recommendedSavings,
    minimumCapitalAtRetirement: minCapital,
    monteCarloResult: buildMonteCarloResultFromApi(monteCarloData),
    retirementResults: retirementData ? buildRetirementScenarioResultsFromApi(retirementData) : null,
    optimalMonteCarloResult: optimalMonteCarloData ? buildMonteCarloResultFromApi(optimalMonteCarloData) : null,
    optimalRetirementResults: optimalRetirementData ? buildRetirementScenarioResultsFromApi(optimalRetirementData) : null,
    steps: (data.steps ?? []).map((step: any) => ({
      iteration: step.iteration ?? 0,
      scale: step.scale ?? 0,
      monthlySavings: step.monthly_savings ?? step.monthlySavings ?? 0,
      finalCapital: step.final_capital ?? step.finalCapital ?? 0,
      effectiveFinalCapital: step.effective_final_capital ?? step.effectiveFinalCapital ?? 0,
      depletionMonths: step.depletion_months ?? step.depletionMonths ?? 0,
    })),
    residualError: residualErr,
    residualErrorRatio: residualErrRatio,
  };
}

