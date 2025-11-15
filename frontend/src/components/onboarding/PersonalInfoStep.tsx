/**
 * Étape 1 : Informations personnelles.
 * 
 * Permet de saisir les informations sur les adultes, les enfants
 * et le statut du foyer.
 */

import {
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { Add, Delete } from "@mui/icons-material";
import type {
  AdultProfile,
  ChildProfile,
  SimulationInput,
} from "@/types/simulation";

interface PersonalInfoStepProps {
  formData: SimulationInput;
  updateFormData: (updates: Partial<SimulationInput>) => void;
  updateAdult: (index: number, updates: Partial<AdultProfile>) => void;
  addAdult: () => void;
  removeAdult: (index: number) => void;
  updateChild: (index: number, updates: Partial<ChildProfile>) => void;
  addChild: () => void;
  removeChild: (index: number) => void;
}

export function PersonalInfoStep({
  formData,
  updateFormData,
  updateAdult,
  addAdult,
  removeAdult,
  updateChild,
  addChild,
  removeChild,
}: PersonalInfoStepProps) {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Informations personnelles
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Commencez par renseigner les informations sur votre foyer.
      </Typography>

      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>Statut du foyer</InputLabel>
        <Select
          value={formData.householdStatus}
          label="Statut du foyer"
          onChange={(e) => updateFormData({ householdStatus: e.target.value as any })}
        >
          <MenuItem value="single">Célibataire</MenuItem>
          <MenuItem value="couple">Couple</MenuItem>
        </Select>
      </FormControl>

      <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
        Adultes ({formData.adults.length})
      </Typography>
      {formData.adults.map((adult, index) => (
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
              Adulte {index + 1}
            </Typography>
            {formData.adults.length > 1 && (
              <IconButton
                size="small"
                color="error"
                onClick={() => removeAdult(index)}
                aria-label="Supprimer"
              >
                <Delete />
              </IconButton>
            )}
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Prénom"
                value={adult.firstName}
                onChange={(e) => updateAdult(index, { firstName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Revenu net mensuel (€)"
                type="number"
                value={adult.monthlyNetIncome ?? ""}
                onChange={(e) =>
                  updateAdult(index, { monthlyNetIncome: parseFloat(e.target.value) || 0 })
                }
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Âge actuel"
                type="number"
                value={adult.currentAge}
                onChange={(e) => updateAdult(index, { currentAge: parseInt(e.target.value) || 0 })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Âge de départ à la retraite"
                type="number"
                value={adult.retirementAge}
                onChange={(e) =>
                  updateAdult(index, { retirementAge: parseInt(e.target.value) || 0 })
                }
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Espérance de vie"
                type="number"
                value={adult.lifeExpectancy}
                onChange={(e) =>
                  updateAdult(index, { lifeExpectancy: parseInt(e.target.value) || 0 })
                }
              />
            </Grid>
          </Grid>
        </Box>
      ))}
      <Button startIcon={<Add />} onClick={addAdult} variant="outlined" sx={{ mb: 4 }}>
        Ajouter un adulte
      </Button>

      <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
        Enfants ({formData.children.length})
      </Typography>
      {formData.children.map((child, index) => (
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
              Enfant {index + 1}
            </Typography>
            <IconButton
              size="small"
              color="error"
              onClick={() => removeChild(index)}
              aria-label="Supprimer"
            >
              <Delete />
            </IconButton>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Prénom"
                value={child.firstName}
                onChange={(e) => updateChild(index, { firstName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Âge actuel"
                type="number"
                value={child.age}
                onChange={(e) => updateChild(index, { age: parseInt(e.target.value) || 0 })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Âge de départ du foyer"
                type="number"
                value={child.departureAge}
                onChange={(e) =>
                  updateChild(index, { departureAge: parseInt(e.target.value) || 0 })
                }
              />
            </Grid>
          </Grid>
        </Box>
      ))}
      <Button startIcon={<Add />} onClick={addChild} variant="outlined">
        Ajouter un enfant
      </Button>
    </Box>
  );
}

