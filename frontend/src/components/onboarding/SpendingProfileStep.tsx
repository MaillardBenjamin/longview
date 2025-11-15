/**
 * Étape 5 : Profil de dépenses.
 * 
 * Permet de définir les phases de dépenses pendant la retraite.
 */

import { Box, Button, IconButton, TextField, Typography } from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { Add, Delete } from "@mui/icons-material";
import type { SimulationInput, SpendingPhase } from "@/types/simulation";

interface SpendingProfileStepProps {
  formData: SimulationInput;
  addSpendingPhase: () => void;
  updateSpendingPhase: (index: number, updates: Partial<SpendingPhase>) => void;
  removeSpendingPhase: (index: number) => void;
}

export function SpendingProfileStep({
  formData,
  addSpendingPhase,
  updateSpendingPhase,
  removeSpendingPhase,
}: SpendingProfileStepProps) {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Profil de dépenses
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Définissez comment vos dépenses évolueront pendant la retraite. Le ratio de dépenses est
        relatif à votre revenu net mensuel cible.
      </Typography>

      {(formData.spendingProfile ?? []).map((phase, index) => (
        <Box
          key={index}
          sx={{
            p: 2,
            mb: 2,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            bgcolor: "background.paper",
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              Phase {index + 1}
            </Typography>
            <IconButton
              size="small"
              color="error"
              onClick={() => removeSpendingPhase(index)}
              aria-label="Supprimer"
            >
              <Delete />
            </IconButton>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Label"
                value={phase.label}
                onChange={(e) => updateSpendingPhase(index, { label: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="De (âge)"
                type="number"
                value={phase.fromAge}
                onChange={(e) =>
                  updateSpendingPhase(index, { fromAge: parseInt(e.target.value) || 0 })
                }
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="À (âge)"
                type="number"
                value={phase.toAge}
                onChange={(e) =>
                  updateSpendingPhase(index, { toAge: parseInt(e.target.value) || 0 })
                }
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField
                fullWidth
                label="Ratio (%)"
                type="number"
                value={phase.spendingRatio * 100}
                onChange={(e) =>
                  updateSpendingPhase(index, {
                    spendingRatio: parseFloat(e.target.value) / 100 || 0,
                  })
                }
                helperText="% du revenu cible"
              />
            </Grid>
          </Grid>
        </Box>
      ))}
      <Button startIcon={<Add />} onClick={addSpendingPhase} variant="outlined">
        Ajouter une phase de dépenses
      </Button>
    </Box>
  );
}

