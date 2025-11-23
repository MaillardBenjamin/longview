/**
 * Hook personnalisé pour gérer l'état du formulaire de simulation.
 * 
 * Centralise la logique de gestion des données du formulaire multi-étapes.
 */

import { useEffect, useState, useCallback } from "react";
import type {
  AdditionalIncome,
  AdultProfile,
  ChildProfile,
  HouseholdCharge,
  InvestmentAccount,
  SavingsPhase,
  SimulationInput,
  SpendingPhase,
} from "@/types/simulation";

// Fonctions utilitaires pour créer des objets par défaut
const generateId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

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

const createSavingsPhase = (overrides: Partial<SavingsPhase> = {}): SavingsPhase => ({
  label: "Phase d'épargne",
  fromAge: 30,
  toAge: 55,
  monthlyContribution: 800,
  ...overrides,
});

const createSpendingPhase = (overrides: Partial<SpendingPhase> = {}): SpendingPhase => ({
  label: "Nouvelle phase",
  fromAge: 60,
  toAge: 80,
  spendingRatio: 0.85,
  ...overrides,
});

const createHouseholdCharge = (overrides: Partial<HouseholdCharge> = {}): HouseholdCharge => ({
  id: generateId(),
  label: "Nouvelle charge",
  category: "other",
  monthlyAmount: 0,
  untilAge: undefined,
  ...overrides,
});

// État initial par défaut
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

const defaultChildren = [
  createChild({ firstName: "Léna", age: 12, departureAge: 23 }),
  createChild({ firstName: "Noé", age: 9, departureAge: 22 }),
];

const initialFormState: SimulationInput = {
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
    createSavingsPhase({
      label: "Dernières années actives",
      fromAge: 55,
      toAge: 63,
      monthlyContribution: 1200,
    }),
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
  investmentAccounts: [],
  marketAssumptions: {
    inflationMean: 2,
    inflationVolatility: 1,
    assetClasses: {
      equities: { label: "Actions mondiales", expectedReturn: 7, volatility: 15 },
      bonds: { label: "Obligations investment grade", expectedReturn: 3, volatility: 6 },
      livrets: { label: "Livrets réglementés", expectedReturn: 1.5, volatility: 0.5 },
      crypto: { label: "Cryptomonnaies", expectedReturn: 15, volatility: 80 },
      other: { label: "Supports diversifiés", expectedReturn: 4.5, volatility: 10 },
    },
    correlations: {
      equities: { equities: 1, bonds: 0.3, livrets: 0.05, crypto: 0.4, other: 0.6 },
      bonds: { equities: 0.3, bonds: 1, livrets: 0.2, crypto: 0.1, other: 0.4 },
      livrets: { equities: 0.05, bonds: 0.2, livrets: 1, crypto: -0.05, other: 0.1 },
      crypto: { equities: 0.4, bonds: 0.1, livrets: -0.05, crypto: 1, other: 0.5 },
      other: { equities: 0.6, bonds: 0.4, livrets: 0.1, crypto: 0.5, other: 1 },
    },
    // Paramètres de simulation Monte Carlo par défaut (valeurs originales)
    confidenceLevel: 0.9, // 90% de confiance
    toleranceRatio: 0.01, // 1% de marge d'erreur (±1%)
    maxIterations: 100, // 100 tirages maximum (comme avant)
    batchSize: 500, // Lots de 500 tirages
  },
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

/**
 * Hook pour gérer l'état du formulaire de simulation.
 */
export function useSimulationForm() {
  // Restaurer l'état depuis sessionStorage au chargement
  const [formData, setFormData] = useState<SimulationInput>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("lv_simulation_form_data");
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as SimulationInput;
          console.log("Données restaurées depuis sessionStorage (initialisation):", parsed);
          return parsed;
        } catch (error) {
          console.warn("Impossible de restaurer le formulaire depuis le stockage de session.", error);
        }
      }
    }
    return initialFormState;
  });

  // Fonction pour forcer le rechargement depuis sessionStorage
  const reloadFromStorage = useCallback(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("lv_simulation_form_data");
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as SimulationInput;
          console.log("Rechargement forcé des données depuis sessionStorage:", parsed);
          console.log("Détails - Adults:", parsed.adults?.length, "Children:", parsed.children?.length);
          console.log("SavingsPhases:", parsed.savingsPhases?.length);
          console.log("HouseholdCharges:", parsed.householdCharges?.length);
          setFormData(parsed);
        } catch (error) {
          console.warn("Impossible de recharger le formulaire depuis le stockage de session.", error);
        }
      } else {
        console.warn("Aucune donnée trouvée dans sessionStorage pour rechargement");
      }
    }
  }, []);

  // Écouter les changements dans sessionStorage (pour recharger après navigation)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "lv_simulation_form_data" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as SimulationInput;
          console.log("Changement détecté dans sessionStorage, rechargement...", parsed);
          setFormData(parsed);
        } catch (error) {
          console.warn("Erreur lors du rechargement depuis storage event:", error);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Sauvegarder l'état dans sessionStorage à chaque modification
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("lv_simulation_form_data", JSON.stringify(formData));
        // Notifier les autres composants du changement
        window.dispatchEvent(new CustomEvent("simulationFormDataChanged", { detail: formData }));
      } catch (error) {
        console.warn("Impossible de sauvegarder le formulaire dans le stockage de session.", error);
      }
    }
  }, [formData]);

  const updateFormData = (updates: Partial<SimulationInput>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const updateAdult = (index: number, updates: Partial<AdultProfile>) => {
    setFormData((prev) => {
      const newAdults = [...prev.adults];
      newAdults[index] = { ...newAdults[index], ...updates };
      return { ...prev, adults: newAdults };
    });
  };

  const addAdult = () => {
    setFormData((prev) => ({
      ...prev,
      adults: [...prev.adults, createAdult()],
    }));
  };

  const removeAdult = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      adults: prev.adults.filter((_, i) => i !== index),
    }));
  };

  const updateChild = (index: number, updates: Partial<ChildProfile>) => {
    setFormData((prev) => {
      const newChildren = [...prev.children];
      newChildren[index] = { ...newChildren[index], ...updates };
      return { ...prev, children: newChildren };
    });
  };

  const addChild = () => {
    setFormData((prev) => ({
      ...prev,
      children: [...prev.children, createChild()],
    }));
  };

  const removeChild = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      children: prev.children.filter((_, i) => i !== index),
    }));
  };

  const addSavingsPhase = () => {
    setFormData((prev) => ({
      ...prev,
      savingsPhases: [...(prev.savingsPhases ?? []), createSavingsPhase()],
    }));
  };

  const updateSavingsPhase = (index: number, updates: Partial<SavingsPhase>) => {
    setFormData((prev) => {
      const newPhases = [...(prev.savingsPhases ?? [])];
      newPhases[index] = { ...newPhases[index], ...updates };
      return { ...prev, savingsPhases: newPhases };
    });
  };

  const removeSavingsPhase = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      savingsPhases: (prev.savingsPhases ?? []).filter((_, i) => i !== index),
    }));
  };

  const addSpendingPhase = () => {
    setFormData((prev) => ({
      ...prev,
      spendingProfile: [...(prev.spendingProfile ?? []), createSpendingPhase()],
    }));
  };

  const updateSpendingPhase = (index: number, updates: Partial<SpendingPhase>) => {
    setFormData((prev) => {
      const newPhases = [...(prev.spendingProfile ?? [])];
      newPhases[index] = { ...newPhases[index], ...updates };
      return { ...prev, spendingProfile: newPhases };
    });
  };

  const removeSpendingPhase = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      spendingProfile: (prev.spendingProfile ?? []).filter((_, i) => i !== index),
    }));
  };

  const addInvestmentAccount = (account: InvestmentAccount) => {
    setFormData((prev) => ({
      ...prev,
      investmentAccounts: [...prev.investmentAccounts, account],
    }));
  };

  const updateInvestmentAccount = (id: string, updates: Partial<InvestmentAccount>) => {
    setFormData((prev) => ({
      ...prev,
      investmentAccounts: prev.investmentAccounts.map((acc) =>
        acc.id === id ? { ...acc, ...updates } : acc,
      ),
    }));
  };

  const removeInvestmentAccount = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      investmentAccounts: prev.investmentAccounts.filter((acc) => acc.id !== id),
    }));
  };

  const addHouseholdCharge = () => {
    setFormData((prev) => ({
      ...prev,
      householdCharges: [...(prev.householdCharges ?? []), createHouseholdCharge()],
    }));
  };

  const updateHouseholdCharge = (id: string, updates: Partial<HouseholdCharge>) => {
    setFormData((prev) => ({
      ...prev,
      householdCharges: (prev.householdCharges ?? []).map((charge) =>
        charge.id === id ? { ...charge, ...updates } : charge,
      ),
    }));
  };

  const removeHouseholdCharge = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      householdCharges: (prev.householdCharges ?? []).filter((charge) => charge.id !== id),
    }));
  };

  const addAdditionalIncome = (income: AdditionalIncome) => {
    setFormData((prev) => ({
      ...prev,
      additionalIncomeStreams: [...(prev.additionalIncomeStreams ?? []), income],
    }));
  };

  const updateAdditionalIncome = (index: number, updates: Partial<AdditionalIncome>) => {
    setFormData((prev) => {
      const newIncomes = [...(prev.additionalIncomeStreams ?? [])];
      newIncomes[index] = { ...newIncomes[index], ...updates };
      return { ...prev, additionalIncomeStreams: newIncomes };
    });
  };

  const removeAdditionalIncome = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      additionalIncomeStreams: (prev.additionalIncomeStreams ?? []).filter((_, i) => i !== index),
    }));
  };

  const updateChildCharge = (childName: string, updates: Partial<{ monthlyAmount: number; untilAge?: number }>) => {
    setFormData((prev) => ({
      ...prev,
      childCharges: (prev.childCharges ?? []).map((charge) =>
        charge.childName === childName ? { ...charge, ...updates } : charge,
      ),
    }));
  };

  const addChildCharge = (childName: string, monthlyAmount: number, untilAge?: number) => {
    setFormData((prev) => {
      const existing = prev.childCharges?.find((c) => c.childName === childName);
      if (existing) {
        return {
          ...prev,
          childCharges: prev.childCharges?.map((c) =>
            c.childName === childName ? { ...c, monthlyAmount, untilAge } : c,
          ),
        };
      }
      return {
        ...prev,
        childCharges: [...(prev.childCharges ?? []), { childName, monthlyAmount, untilAge }],
      };
    });
  };

  return {
    formData,
    updateFormData,
    reloadFromStorage,
    updateAdult,
    addAdult,
    removeAdult,
    updateChild,
    addChild,
    removeChild,
    addSavingsPhase,
    updateSavingsPhase,
    removeSavingsPhase,
    addSpendingPhase,
    updateSpendingPhase,
    removeSpendingPhase,
    addInvestmentAccount,
    updateInvestmentAccount,
    removeInvestmentAccount,
    addHouseholdCharge,
    updateHouseholdCharge,
    removeHouseholdCharge,
    addAdditionalIncome,
    updateAdditionalIncome,
    removeAdditionalIncome,
    updateChildCharge,
    addChildCharge,
  };
}

