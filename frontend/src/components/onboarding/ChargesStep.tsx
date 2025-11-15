/**
 * Étape 4 : Charges & Revenus.
 * 
 * Permet de définir les charges du foyer et les revenus additionnels.
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
  AdditionalIncome,
  HouseholdCharge,
  SimulationInput,
} from "@/types/simulation";

const chargeCategoryLabels: Record<HouseholdCharge["category"], string> = {
  housing_loan: "Prêt immobilier",
  consumer_loan: "Prêt consommation",
  pension: "Pension / Rente",
  other: "Autre charge",
};

interface ChargesStepProps {
  formData: SimulationInput;
  addHouseholdCharge: () => void;
  updateHouseholdCharge: (id: string, updates: Partial<HouseholdCharge>) => void;
  removeHouseholdCharge: (id: string) => void;
  addAdditionalIncome: (income: AdditionalIncome) => void;
  updateAdditionalIncome: (index: number, updates: Partial<AdditionalIncome>) => void;
  removeAdditionalIncome: (index: number) => void;
  updateChildCharge: (childName: string, updates: Partial<{ monthlyAmount: number; untilAge?: number }>) => void;
  addChildCharge: (childName: string, monthlyAmount: number, untilAge?: number) => void;
}

export function ChargesStep({
  formData,
  addHouseholdCharge,
  updateHouseholdCharge,
  removeHouseholdCharge,
  addAdditionalIncome,
  updateAdditionalIncome,
  removeAdditionalIncome,
  updateChildCharge,
  addChildCharge,
}: ChargesStepProps) {
  const handleAddIncome = () => {
    addAdditionalIncome({
      label: "Nouveau revenu",
      monthlyAmount: 0,
      startAge: formData.adults[0]?.currentAge ?? 40,
    });
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Charges & Revenus
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Définissez les charges récurrentes et les revenus additionnels.
      </Typography>

      <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
        Charges du foyer ({(formData.householdCharges ?? []).length})
      </Typography>
      {(formData.householdCharges ?? []).map((charge) => (
        <Box
          key={charge.id}
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
              {charge.label}
            </Typography>
            <IconButton
              size="small"
              color="error"
              onClick={() => removeHouseholdCharge(charge.id)}
              aria-label="Supprimer"
            >
              <Delete />
            </IconButton>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Label"
                value={charge.label}
                onChange={(e) => updateHouseholdCharge(charge.id, { label: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Catégorie</InputLabel>
                <Select
                  value={charge.category}
                  label="Catégorie"
                  onChange={(e) =>
                    updateHouseholdCharge(charge.id, { category: e.target.value as any })
                  }
                >
                  {Object.entries(chargeCategoryLabels).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="Montant mensuel (€)"
                type="number"
                value={charge.monthlyAmount}
                onChange={(e) =>
                  updateHouseholdCharge(charge.id, {
                    monthlyAmount: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Jusqu'à l'âge (optionnel)"
                type="number"
                value={charge.untilAge ?? ""}
                onChange={(e) =>
                  updateHouseholdCharge(charge.id, {
                    untilAge: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                helperText="Laissez vide si la charge est permanente"
              />
            </Grid>
          </Grid>
        </Box>
      ))}
      <Button startIcon={<Add />} onClick={addHouseholdCharge} variant="outlined" sx={{ mb: 4 }}>
        Ajouter une charge
      </Button>

      <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
        Revenus additionnels ({(formData.additionalIncomeStreams ?? []).length})
      </Typography>
      {(formData.additionalIncomeStreams ?? []).map((income, index) => (
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
              {income.label}
            </Typography>
            <IconButton
              size="small"
              color="error"
              onClick={() => removeAdditionalIncome(index)}
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
                value={income.label}
                onChange={(e) => updateAdditionalIncome(index, { label: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Montant mensuel (€)"
                type="number"
                value={income.monthlyAmount}
                onChange={(e) =>
                  updateAdditionalIncome(index, {
                    monthlyAmount: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Début (âge)"
                type="number"
                value={income.startAge ?? ""}
                onChange={(e) =>
                  updateAdditionalIncome(index, {
                    startAge: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
              />
            </Grid>
          </Grid>
        </Box>
      ))}
      <Button startIcon={<Add />} onClick={handleAddIncome} variant="outlined" sx={{ mb: 4 }}>
        Ajouter un revenu additionnel
      </Button>

      <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
        Charges par enfant ({(formData.childCharges ?? []).length})
      </Typography>
      {formData.children.map((child) => {
        const childCharge = formData.childCharges?.find((c) => c.childName === child.firstName);
        return (
          <Box
            key={child.firstName}
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
                {child.firstName}
              </Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Montant mensuel (€)"
                  type="number"
                  value={childCharge?.monthlyAmount ?? 0}
                  onChange={(e) => {
                    const amount = parseFloat(e.target.value) || 0;
                    if (childCharge) {
                      updateChildCharge(child.firstName, { monthlyAmount: amount });
                    } else {
                      addChildCharge(child.firstName, amount, child.departureAge);
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Jusqu'à l'âge"
                  type="number"
                  value={childCharge?.untilAge ?? child.departureAge ?? ""}
                  onChange={(e) => {
                    const untilAge = e.target.value ? parseInt(e.target.value) : undefined;
                    const currentAmount = childCharge?.monthlyAmount ?? 0;
                    if (childCharge) {
                      updateChildCharge(child.firstName, { untilAge });
                    } else {
                      addChildCharge(child.firstName, currentAmount, untilAge);
                    }
                  }}
                  helperText={`Départ prévu du foyer : ${child.departureAge} ans`}
                />
              </Grid>
            </Grid>
          </Box>
        );
      })}
    </Box>
  );
}

