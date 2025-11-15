/**
 * Page de simulation avec formulaire multi-étapes.
 * 
 * Utilise Material-UI Stepper pour diviser le formulaire en étapes logiques
 * et améliorer l'expérience utilisateur.
 */

import { useMutation } from "@tanstack/react-query";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Container,
  FormControlLabel,
  LinearProgress,
  Paper,
  Step,
  StepButton,
  Stepper,
  TextField,
  Typography,
} from "@mui/material";
import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useSimulationForm } from "@/hooks/useSimulationForm";
import { optimizeSavingsPlan } from "@/services/simulations";
import { PersonalInfoStep } from "@/components/onboarding/PersonalInfoStep";
import { RetirementGoalsStep } from "@/components/onboarding/RetirementGoalsStep";
import { SavingsStep } from "@/components/onboarding/SavingsStep";
import { ChargesStep } from "@/components/onboarding/ChargesStep";
import { SpendingProfileStep } from "@/components/onboarding/SpendingProfileStep";
import { MarketAssumptionsStep } from "@/components/onboarding/MarketAssumptionsStep";
import { SummaryStep } from "@/components/onboarding/SummaryStep";

const steps = [
  "Informations personnelles",
  "Charges & Revenus",
  "Épargne & Investissements",
  "Objectifs de retraite",
  "Profil de dépenses",
  "Hypothèses de marché",
  "Récapitulatif",
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(() => {
    const saved = sessionStorage.getItem("lv_simulation_active_step");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [cguAccepted, setCguAccepted] = useState(() => {
    const saved = sessionStorage.getItem("lv_cgu_accepted");
    return saved === "true";
  });

  // Sauvegarder l'étape active dans sessionStorage
  useEffect(() => {
    sessionStorage.setItem("lv_simulation_active_step", String(activeStep));
  }, [activeStep]);

  const {
    formData,
    updateFormData,
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
  } = useSimulationForm();

  const optimizeMutation = useMutation({
    mutationFn: optimizeSavingsPlan,
    onSuccess: (result) => {
      console.log("Résultat de l'optimisation reçu:", {
        scale: result.scale,
        recommendedMonthlySavings: result.recommendedMonthlySavings,
        hasMonteCarloResult: !!result.monteCarloResult,
        hasRetirementResults: !!result.retirementResults,
        stepsCount: result.steps.length,
      });
      
      const state = {
        simulation: null,
        draft: formData,
        recommendedSavings: result.recommendedMonthlySavings,
        minimumCapitalAtRetirement: result.minimumCapitalAtRetirement,
        optimizationScale: result.scale,
        monteCarloResult: result.monteCarloResult,
        retirementMonteCarloResult: result.retirementResults,
        optimizationSteps: result.steps,
        optimizationResidualError: result.residualError,
        optimizationResidualErrorRatio: result.residualErrorRatio,
      };
      sessionStorage.setItem("lv_last_simulation_result", JSON.stringify(state));
      navigate("/resultats", { state });
    },
    onError: (error: any) => {
      console.error("Erreur lors de l'optimisation:", error);
      console.error("Détails de l'erreur:", {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
      });
    },
  });

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!cguAccepted) {
      window.alert(
        "Vous devez accepter les Conditions Générales d'Utilisation pour lancer la simulation.",
      );
      return;
    }

    optimizeMutation.mutate(formData);
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <PersonalInfoStep
            formData={formData}
            updateFormData={updateFormData}
            updateAdult={updateAdult}
            addAdult={addAdult}
            removeAdult={removeAdult}
            updateChild={updateChild}
            addChild={addChild}
            removeChild={removeChild}
          />
        );
      case 1:
        return (
          <ChargesStep
            formData={formData}
            addHouseholdCharge={addHouseholdCharge}
            updateHouseholdCharge={updateHouseholdCharge}
            removeHouseholdCharge={removeHouseholdCharge}
            addAdditionalIncome={addAdditionalIncome}
            updateAdditionalIncome={updateAdditionalIncome}
            removeAdditionalIncome={removeAdditionalIncome}
            updateChildCharge={updateChildCharge}
            addChildCharge={addChildCharge}
          />
        );
      case 2:
        return (
          <SavingsStep
            formData={formData}
            addSavingsPhase={addSavingsPhase}
            updateSavingsPhase={updateSavingsPhase}
            removeSavingsPhase={removeSavingsPhase}
            addInvestmentAccount={addInvestmentAccount}
            updateInvestmentAccount={updateInvestmentAccount}
            removeInvestmentAccount={removeInvestmentAccount}
            adults={formData.adults}
          />
        );
      case 3:
        return (
          <RetirementGoalsStep
            formData={formData}
            updateFormData={updateFormData}
            adults={formData.adults}
          />
        );
      case 4:
        return (
          <SpendingProfileStep
            formData={formData}
            addSpendingPhase={addSpendingPhase}
            updateSpendingPhase={updateSpendingPhase}
            removeSpendingPhase={removeSpendingPhase}
          />
        );
      case 5:
        return (
          <MarketAssumptionsStep
            formData={formData}
            updateFormData={updateFormData}
          />
        );
      case 6:
        return <SummaryStep formData={formData} />;
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
            Simulation de retraite
          </Typography>
          <TextField
            fullWidth
            label="Nom de la simulation"
            value={formData.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              updateFormData({ name: e.target.value })
            }
            sx={{ mt: 2, maxWidth: 400 }}
            helperText="Donnez un nom à votre simulation pour la retrouver facilement"
          />
        </Box>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Remplissez le formulaire étape par étape pour obtenir une projection personnalisée de
          votre retraite.
        </Typography>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }} nonLinear>
          {steps.map((label, index) => (
            <Step key={label} completed={activeStep > index}>
              <StepButton onClick={() => setActiveStep(index)}>
                {label}
              </StepButton>
            </Step>
          ))}
        </Stepper>

        <Box component="form" onSubmit={handleSubmit}>
          <Card sx={{ mb: 4, minHeight: 400 }}>
            <CardContent>{renderStepContent(activeStep)}</CardContent>
          </Card>

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              variant="outlined"
              sx={{ mr: 1 }}
            >
              Précédent
            </Button>

            {activeStep < steps.length - 1 ? (
              <Button variant="contained" onClick={handleNext}>
                Suivant
              </Button>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2, width: "100%" }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={cguAccepted}
                      onChange={(e) => {
                        setCguAccepted(e.target.checked);
                        sessionStorage.setItem("lv_cgu_accepted", String(e.target.checked));
                      }}
                      required
                    />
                  }
                  label={
                    <Typography variant="body2">
                      J'accepte les{" "}
                      <Link to="/cgu" target="_blank" style={{ color: "#1976d2" }}>
                        Conditions Générales d'Utilisation
                      </Link>
                      . Je comprends que LongView est un outil de simulation et ne constitue pas
                      un conseil financier.
                    </Typography>
                  }
                />
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="large"
                  disabled={optimizeMutation.isPending || !cguAccepted}
                  sx={{ alignSelf: "flex-end" }}
                >
                  {optimizeMutation.isPending ? (
                    <>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      Calcul en cours...
                    </>
                  ) : (
                    "Lancer la simulation"
                  )}
                </Button>
              </Box>
            )}
          </Box>

          {optimizeMutation.isPending && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: "center" }}>
                Calcul de l'épargne optimale en cours... Cela peut prendre quelques instants.
              </Typography>
            </Box>
          )}

          {optimizeMutation.isError && (
            <Box sx={{ mt: 2, p: 2, bgcolor: "error.light", borderRadius: 1 }}>
              <Typography variant="body2" color="error">
                Erreur lors du calcul : {optimizeMutation.error instanceof Error
                  ? optimizeMutation.error.message
                  : "Une erreur est survenue"}
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>
    </Container>
  );
}
