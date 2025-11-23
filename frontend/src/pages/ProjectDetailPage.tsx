/**
 * Page de détail d'un projet.
 * 
 * Affiche les informations d'un projet et liste toutes ses simulations.
 */

import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Box,
  Button,
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  CircularProgress,
  Alert,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import DeleteIcon from "@mui/icons-material/Delete";
import { fetchProject } from "@/services/projects";
import { fetchSimulation, deleteSimulation } from "@/services/simulations";
import type { SimulationInput } from "@/types/simulation";

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [simulationToDelete, setSimulationToDelete] = useState<{ id: number; name: string } | null>(null);

  const { data: project, isLoading, error } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => fetchProject(Number(projectId)),
    enabled: !!projectId,
  });

  // Mutation pour supprimer une simulation
  const deleteSimulationMutation = useMutation({
    mutationFn: deleteSimulation,
    onSuccess: () => {
      // Invalider les queries pour rafraîchir les données
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setDeleteDialogOpen(false);
      setSimulationToDelete(null);
    },
  });

  const handleLoadSimulation = async (simulationId: number) => {
    try {
      // Charger la simulation complète
      const simulation = await fetchSimulation(simulationId);
      
      console.log("Simulation chargée:", simulation);
      console.log("inputsSnapshot:", simulation.inputsSnapshot);
      
      // Restaurer les données depuis inputs_snapshot
      if (simulation.inputsSnapshot) {
        const snapshotData = simulation.inputsSnapshot as any;
        
        console.log("Simulation chargée - inputsSnapshot brut:", snapshotData);
        
        // Fonction helper pour convertir snake_case en camelCase si nécessaire
        const getValue = (snakeKey: string, camelKey: string, defaultValue: any = undefined) => {
          return snapshotData[camelKey] ?? snapshotData[snakeKey] ?? defaultValue;
        };
        
        // Construire le formData en combinant les données du snapshot avec les données principales
        // Les données dans inputsSnapshot sont au format frontend (camelCase) car elles ont été
        // sauvegardées telles quelles depuis le formulaire via mapSimulationInputToApi
        const formData: SimulationInput = {
          name: simulation.name,
          // Données du snapshot (structure complète du formulaire)
          householdStatus: getValue("household_status", "householdStatus", "couple") as "single" | "couple",
          adults: getValue("adults", "adults", []),
          children: getValue("children", "children", []),
          spendingProfile: getValue("spending_profile", "spendingProfile", []),
          savingsPhases: getValue("savings_phases", "savingsPhases", []),
          householdCharges: getValue("household_charges", "householdCharges", []),
          childCharges: getValue("child_charges", "childCharges", []),
          investmentAccounts: getValue("investment_accounts", "investmentAccounts", []),
          additionalIncomeStreams: getValue("additional_income_streams", "additionalIncomeStreams", []),
          marketAssumptions: getValue("market_assumptions", "marketAssumptions", {
            inflationMean: 2,
            inflationVolatility: 1,
            assetClasses: {},
            correlations: {},
            confidenceLevel: 0.9,
            toleranceRatio: 0.01,
            maxIterations: 100,
            batchSize: 500,
          }),
          // Données principales (peuvent être dans le snapshot ou directement dans la simulation)
          targetMonthlyIncome: getValue("target_monthly_income", "targetMonthlyIncome", simulation.targetMonthlyIncome),
          statePensionMonthlyIncome: getValue("state_pension_monthly_income", "statePensionMonthlyIncome", simulation.statePensionMonthlyIncome),
          housingLoanEndAge: getValue("housing_loan_end_age", "housingLoanEndAge", simulation.housingLoanEndAge),
          dependentsDepartureAge: getValue("dependents_departure_age", "dependentsDepartureAge", simulation.dependentsDepartureAge),
        };
        
        console.log("FormData restauré:", formData);
        console.log("Nom de la simulation:", formData.name);
        console.log("Adults:", formData.adults);
        console.log("Children:", formData.children);
        console.log("SavingsPhases:", formData.savingsPhases);
        console.log("HouseholdCharges:", formData.householdCharges);
        console.log("InvestmentAccounts:", formData.investmentAccounts);
        
        // Sauvegarder dans sessionStorage pour que le formulaire les charge
        sessionStorage.setItem("lv_simulation_form_data", JSON.stringify(formData));
        sessionStorage.setItem("lv_simulation_active_step", "0");
        
        // Sauvegarder aussi l'ID du projet pour que le formulaire l'utilise
        if (simulation.projectId) {
          sessionStorage.setItem("lv_current_project_id", String(simulation.projectId));
        }
        
        // Notifier les autres composants du changement (notamment le header)
        // Utiliser un petit délai pour s'assurer que sessionStorage est bien mis à jour
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("simulationFormDataChanged", { detail: formData }));
        }, 50);
        
        // Naviguer vers la page de simulation avec un petit délai pour s'assurer que sessionStorage est mis à jour
        setTimeout(() => {
          navigate("/simulation");
        }, 100);
      } else {
        alert("Cette simulation n'a pas de données sauvegardées à charger.");
      }
    } catch (error) {
      console.error("Erreur lors du chargement de la simulation:", error);
      alert("Erreur lors du chargement de la simulation. Veuillez réessayer.");
    }
  };

  const handleDeleteSimulation = (simulationId: number, simulationName: string) => {
    setSimulationToDelete({ id: simulationId, name: simulationName });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (simulationToDelete) {
      deleteSimulationMutation.mutate(simulationToDelete.id);
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error || !project) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="error">Projet introuvable</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate("/projects")}
        sx={{ mb: 3 }}
      >
        Retour aux projets
      </Button>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {project.name}
        </Typography>
        {project.description && (
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            {project.description}
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary">
          Créé le {new Date(project.createdAt).toLocaleDateString("fr-FR")}
        </Typography>
      </Box>

      <Typography variant="h5" component="h2" sx={{ mb: 3 }}>
        Simulations ({project.simulations.length})
      </Typography>

      {project.simulations.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
              Aucune simulation dans ce projet pour le moment.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {project.simulations.map((simulation) => (
            <Grid item xs={12} sm={6} md={4} key={simulation.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" component="h3" gutterBottom>
                    {simulation.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Âge actuel: {simulation.currentAge} ans
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Âge de retraite: {simulation.retirementAge} ans
                  </Typography>
                  {simulation.resultsSnapshot && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Épargne mensuelle requise:{" "}
                      {simulation.resultsSnapshot.requiredMonthlySavings?.toFixed(2)} €
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    Créée le {new Date(simulation.createdAt).toLocaleDateString("fr-FR")}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: "space-between" }}>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<PlayArrowIcon />}
                    onClick={() => handleLoadSimulation(simulation.id)}
                  >
                    Charger
                  </Button>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteSimulation(simulation.id, simulation.name)}
                    aria-label="Supprimer"
                    color="error"
                    disabled={deleteSimulationMutation.isPending}
                  >
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog de confirmation de suppression */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Êtes-vous sûr de vouloir supprimer la simulation "{simulationToDelete?.name}" ? Cette action est irréversible.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={deleteSimulationMutation.isPending}
          >
            {deleteSimulationMutation.isPending ? "Suppression..." : "Supprimer"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}


