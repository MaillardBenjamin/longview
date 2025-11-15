/**
 * Étape 7 : Récapitulatif.
 * 
 * Affiche un résumé de toutes les informations saisies avant validation.
 */

import { Box, Divider, Paper, Typography } from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import type { SimulationInput } from "@/types/simulation";

interface SummaryStepProps {
  formData: SimulationInput;
}

export function SummaryStep({ formData }: SummaryStepProps) {
  const primaryAdult = formData.adults[0];

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Récapitulatif
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Vérifiez vos informations avant de lancer la simulation.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Informations personnelles
            </Typography>
            <Typography variant="body2">
              <strong>Statut :</strong> {formData.householdStatus === "couple" ? "Couple" : "Célibataire"}
            </Typography>
            <Typography variant="body2">
              <strong>Adultes :</strong> {formData.adults.length}
            </Typography>
            <Typography variant="body2">
              <strong>Enfants :</strong> {formData.children.length}
            </Typography>
            {primaryAdult && (
              <>
                <Typography variant="body2">
                  <strong>Âge actuel :</strong> {primaryAdult.currentAge} ans
                </Typography>
                <Typography variant="body2">
                  <strong>Retraite à :</strong> {primaryAdult.retirementAge} ans
                </Typography>
                <Typography variant="body2">
                  <strong>Espérance de vie :</strong> {primaryAdult.lifeExpectancy} ans
                </Typography>
              </>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Objectifs de retraite
            </Typography>
            <Typography variant="body2">
              <strong>Revenu mensuel cible :</strong> {formData.targetMonthlyIncome?.toLocaleString("fr-FR")} €
            </Typography>
            <Typography variant="body2">
              <strong>Pension d'État estimée :</strong>{" "}
              {formData.statePensionMonthlyIncome?.toLocaleString("fr-FR")} €/mois
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Épargne
            </Typography>
            <Typography variant="body2">
              <strong>Phases d'épargne :</strong> {formData.savingsPhases?.length ?? 0}
            </Typography>
            <Typography variant="body2">
              <strong>Comptes d'investissement :</strong> {formData.investmentAccounts.length}
            </Typography>
            <Typography variant="body2">
              <strong>Capital total actuel :</strong>{" "}
              {formData.investmentAccounts
                .reduce((sum, acc) => sum + acc.currentAmount, 0)
                .toLocaleString("fr-FR")}{" "}
              €
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Charges & Revenus
            </Typography>
            <Typography variant="body2">
              <strong>Charges du foyer :</strong> {formData.householdCharges?.length ?? 0}
            </Typography>
            <Typography variant="body2">
              <strong>Revenus additionnels :</strong> {formData.additionalIncomeStreams?.length ?? 0}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Profil de dépenses
            </Typography>
            {formData.spendingProfile && formData.spendingProfile.length > 0 ? (
              <>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Phases de dépenses :</strong> {formData.spendingProfile.length}
                </Typography>
                <Box sx={{ mt: 2 }}>
                  {formData.spendingProfile.map((phase, index) => (
                    <Box
                      key={index}
                      sx={{
                        p: 1.5,
                        mb: 1,
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1,
                        bgcolor: "background.default",
                      }}
                    >
                      <Typography variant="body2" fontWeight="bold">
                        {phase.label}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        De {phase.fromAge} ans à {phase.toAge} ans
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Ratio de dépenses : {(phase.spendingRatio * 100).toFixed(0)}% du revenu cible
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary" fontStyle="italic">
                Aucune phase de dépenses définie
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      <Box sx={{ p: 2, bgcolor: "info.light", borderRadius: 1 }}>
        <Typography variant="body2" color="info.dark">
          <strong>💡 Astuce :</strong> Vous pouvez revenir en arrière pour modifier vos informations
          avant de lancer la simulation.
        </Typography>
      </Box>
    </Box>
  );
}

