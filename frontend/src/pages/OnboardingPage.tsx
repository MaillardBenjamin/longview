/**
 * Page de simulation avec formulaire multi-étapes.
 * 
 * Utilise Material-UI Stepper pour diviser le formulaire en étapes logiques
 * et améliorer l'expérience utilisateur.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Container,
  FormControl,
  FormControlLabel,
  FormHelperText,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Step,
  StepButton,
  Stepper,
  TextField,
  Typography,
} from "@mui/material";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useSimulationForm } from "@/hooks/useSimulationForm";
import { optimizeSavingsPlan, createSimulation, updateSimulation } from "@/services/simulations";
import { useAuth } from "@/hooks/useAuth";
import { fetchProjects, createProject, updateProject } from "@/services/projects";
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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const currentProjectIdRef = useRef<number | null>(null);
  const currentSimulationIdRef = useRef<number | null>(null);
  
  const [activeStep, setActiveStep] = useState(() => {
    const saved = sessionStorage.getItem("lv_simulation_active_step");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [cguAccepted, setCguAccepted] = useState(() => {
    const saved = sessionStorage.getItem("lv_cgu_accepted");
    return saved === "true";
  });
  const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);

  // Récupérer les données du formulaire AVANT les useEffect qui les utilisent
  const {
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
  } = useSimulationForm();

  // Recharger les données depuis sessionStorage au montage de la page
  // Cela permet de charger une simulation sauvegardée dans ProjectDetailPage
  useEffect(() => {
    // Attendre un peu pour s'assurer que sessionStorage est bien mis à jour
    const timer = setTimeout(() => {
      const saved = sessionStorage.getItem("lv_simulation_form_data");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          console.log("Données trouvées dans sessionStorage au montage:", parsed);
          console.log("Adults dans sessionStorage:", parsed.adults?.length);
          console.log("Children dans sessionStorage:", parsed.children?.length);
          // Recharger les données
          reloadFromStorage();
        } catch (error) {
          console.warn("Erreur lors du rechargement des données:", error);
        }
      }
    }, 200); // Petit délai pour s'assurer que sessionStorage est mis à jour
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Exécuter une seule fois au montage

  // Récupérer les projets de l'utilisateur si connecté
  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
    enabled: !!user,
    retry: false,
    onError: (error) => {
      console.error("Erreur lors de la récupération des projets:", error);
    },
  });

  // Récupérer ou créer un projet "en cours" au chargement (une seule fois)
  useEffect(() => {
    if (!user || !projects) return;

    // Récupérer l'ID de la simulation brouillon si elle existe
    const savedSimulationId = sessionStorage.getItem("lv_current_simulation_id");
    if (savedSimulationId) {
      const simulationId = parseInt(savedSimulationId, 10);
      currentSimulationIdRef.current = simulationId;
    }

    // Si on a déjà un projet en cours sauvegardé, l'utiliser
    const savedProjectId = sessionStorage.getItem("lv_current_project_id");
    if (savedProjectId) {
      const projectId = parseInt(savedProjectId, 10);
      const project = projects.find((p) => p.id === projectId);
      if (project) {
        currentProjectIdRef.current = projectId;
        setCurrentProjectId(projectId);
        return;
      }
    }

    // Utiliser le premier projet (généralement le projet par défaut créé à l'inscription)
    // ou créer un nouveau projet "en cours"
    if (projects.length > 0) {
      const defaultProject = projects[0];
      currentProjectIdRef.current = defaultProject.id;
      setCurrentProjectId(defaultProject.id);
      sessionStorage.setItem("lv_current_project_id", String(defaultProject.id));
    } else {
      // Créer un nouveau projet "en cours"
      createProject({
        name: "Projet en cours",
        description: "Projet de simulation en cours de création",
      })
        .then((project) => {
          currentProjectIdRef.current = project.id;
          setCurrentProjectId(project.id);
          sessionStorage.setItem("lv_current_project_id", String(project.id));
          queryClient.invalidateQueries({ queryKey: ["projects"] });
        })
        .catch((error) => {
          console.error("Erreur lors de la création du projet:", error);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, projects]);

  // Gérer le changement de projet
  const handleProjectChange = (newProjectId: number) => {
    currentProjectIdRef.current = newProjectId;
    setCurrentProjectId(newProjectId);
    sessionStorage.setItem("lv_current_project_id", String(newProjectId));
  };

  // Sauvegarder l'étape active dans sessionStorage
  useEffect(() => {
    sessionStorage.setItem("lv_simulation_active_step", String(activeStep));
  }, [activeStep]);

  // Sauvegarder automatiquement le projet et la simulation à chaque changement de nom ou d'étape
  useEffect(() => {
    if (!user || !currentProjectIdRef.current) return;

    const projectId = currentProjectIdRef.current;
    const timeoutId = setTimeout(async () => {
      // Ne mettre à jour que la description du projet, pas son nom
      // Le nom du projet doit rester celui défini par l'utilisateur
      updateProject(projectId, {
        description: `Simulation en cours - Étape ${activeStep + 1}/${steps.length}: ${steps[activeStep]}`,
      }).catch((error) => {
        console.error("Erreur lors de la mise à jour du projet:", error);
      });

      // Créer ou mettre à jour la simulation en brouillon
      try {
        if (currentSimulationIdRef.current) {
          // Mettre à jour la simulation existante
          console.log("Mise à jour de la simulation brouillon:", currentSimulationIdRef.current);
          await updateSimulation(currentSimulationIdRef.current, formData, projectId);
        } else {
          // Créer une nouvelle simulation brouillon
          console.log("Création d'une nouvelle simulation brouillon");
          const simulation = await createSimulation(formData, projectId);
          currentSimulationIdRef.current = simulation.id;
          sessionStorage.setItem("lv_current_simulation_id", String(simulation.id));
          console.log("Simulation brouillon créée avec ID:", simulation.id);
        }
      } catch (error) {
        console.error("Erreur lors de la sauvegarde automatique de la simulation:", error);
      }
    }, 1000); // Debounce de 1 seconde pour éviter trop de requêtes

    return () => clearTimeout(timeoutId);
  }, [formData, activeStep, user]);

  const optimizeMutation = useMutation({
    mutationFn: optimizeSavingsPlan,
    onSuccess: async (result) => {
      console.log("Résultat de l'optimisation reçu:", {
        scale: result.scale,
        recommendedMonthlySavings: result.recommendedMonthlySavings,
        hasMonteCarloResult: !!result.monteCarloResult,
        hasRetirementResults: !!result.retirementResults,
        stepsCount: result.steps.length,
      });
      
      // Si l'utilisateur est connecté, créer une simulation en base de données
      let savedSimulation = null;
      if (user) {
        try {
          // Utiliser le projet en cours s'il existe
          // Sinon, le backend créera automatiquement un projet avec le nom de la simulation
          const projectId = currentProjectIdRef.current;
          
          console.log("Création de simulation - Utilisateur connecté:", user.id);
          console.log("Données du formulaire:", {
            name: formData.name,
            adults: formData.adults?.length,
            projectId: projectId,
          });
          
          // Créer la simulation
          // Si projectId est fourni, la simulation sera associée à ce projet
          // Sinon, le backend créera automatiquement un projet avec le nom de la simulation
          console.log("Appel à createSimulation avec projectId:", projectId);
          savedSimulation = await createSimulation(formData, projectId ?? undefined);
          console.log("Simulation créée avec succès:", savedSimulation);
        } catch (error: any) {
          console.error("Erreur lors de la création de la simulation:", error);
          console.error("Détails de l'erreur:", {
            message: error?.message,
            response: error?.response?.data,
            status: error?.response?.status,
          });
          // On continue même si la création échoue
        }
      } else {
        console.log("Utilisateur non connecté - simulation non sauvegardée");
      }
      
      const state = {
        simulation: savedSimulation,
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

  const currentProject = projects?.find((p) => p.id === currentProjectId);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
            Simulation de retraite
          </Typography>
          
          {/* Sélecteur de projet si l'utilisateur est connecté */}
          {user && projects && projects.length > 0 && (
            <FormControl fullWidth sx={{ mt: 2, mb: 2, maxWidth: 400 }}>
              <Select
                value={currentProjectId || ""}
                onChange={(e) => handleProjectChange(Number(e.target.value))}
                displayEmpty
              >
                {projects.map((project) => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.name}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {currentProject
                  ? `Simulation enregistrée dans le projet "${currentProject.name}"`
                  : "Sélectionnez le projet dans lequel enregistrer cette simulation"}
              </FormHelperText>
            </FormControl>
          )}
          
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
