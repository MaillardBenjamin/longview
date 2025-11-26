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
  Tooltip,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { Add, Delete, HelpOutline } from "@mui/icons-material";
import { useState } from "react";
import type {
  AdultProfile,
  ChildProfile,
  SimulationInput,
} from "@/types/simulation";
import { useFieldValidation, ValidationRules } from "@/hooks/useFieldValidation";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

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
  const [deleteAdultIndex, setDeleteAdultIndex] = useState<number | null>(null);
  const [deleteChildIndex, setDeleteChildIndex] = useState<number | null>(null);

  const handleRemoveAdult = (index: number) => {
    setDeleteAdultIndex(index);
  };

  const handleRemoveChild = (index: number) => {
    setDeleteChildIndex(index);
  };

  const confirmRemoveAdult = () => {
    if (deleteAdultIndex !== null) {
      removeAdult(deleteAdultIndex);
      setDeleteAdultIndex(null);
    }
  };

  const confirmRemoveChild = () => {
    if (deleteChildIndex !== null) {
      removeChild(deleteChildIndex);
      setDeleteChildIndex(null);
    }
  };

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
          onChange={(e) => {
            const newStatus = e.target.value as any;
            updateFormData({
              householdStatus: newStatus,
              taxParameters: {
                isCouple: newStatus === "couple",
                tmiSavingsPhase: formData.taxParameters?.tmiSavingsPhase ?? 0.30,
                tmiRetirementPhase: formData.taxParameters?.tmiRetirementPhase ?? 0.30,
              },
            });
          }}
        >
          <MenuItem value="single">Célibataire</MenuItem>
          <MenuItem value="couple">Couple</MenuItem>
        </Select>
      </FormControl>

      <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
        Adultes ({formData.adults.length})
      </Typography>
      {formData.adults.map((adult, index) => {
        const firstNameValidation = useFieldValidation([
          ValidationRules.required("Le prénom est requis"),
        ]);

        const currentAgeValidation = useFieldValidation([
          ValidationRules.required("L'âge actuel est requis"),
          ValidationRules.minAge(18, "L'âge doit être d'au moins 18 ans"),
        ]);

        const retirementAgeValidation = useFieldValidation([
          ValidationRules.required("L'âge de retraite est requis"),
          ValidationRules.retirementAge(adult.currentAge || 0),
        ]);

        const lifeExpectancyValidation = useFieldValidation([
          ValidationRules.required("L'espérance de vie est requise"),
          ValidationRules.lifeExpectancy(adult.retirementAge || 0),
        ]);

        const monthlyIncomeValidation = useFieldValidation([
          ValidationRules.required("Le revenu net mensuel est requis"),
          ValidationRules.positiveNumber("Le revenu doit être positif"),
        ]);

        return (
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
                  onClick={() => handleRemoveAdult(index)}
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
                  required
                  value={adult.firstName}
                  onChange={(e) => {
                    updateAdult(index, { firstName: e.target.value });
                    firstNameValidation.validate(e.target.value);
                  }}
                  onBlur={() => {
                    firstNameValidation.onBlur();
                    firstNameValidation.validate(adult.firstName);
                  }}
                  error={firstNameValidation.touched && !!firstNameValidation.error}
                  helperText={firstNameValidation.touched && firstNameValidation.error}
                />
              </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ position: "relative" }}>
                <Tooltip
                  title="Revenu net mensuel après impôts et cotisations sociales. Utilisé pour calculer vos besoins à la retraite."
                  arrow
                  placement="top"
                >
                  <IconButton
                    size="small"
                    sx={{
                      position: "absolute",
                      right: 4,
                      top: 4,
                      zIndex: 1,
                      color: "text.secondary",
                    }}
                  >
                    <HelpOutline fontSize="small" />
                  </IconButton>
                </Tooltip>
                <TextField
                  fullWidth
                  label="Revenu net mensuel (€)"
                  type="number"
                  required
                  value={adult.monthlyNetIncome ?? ""}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    updateAdult(index, { monthlyNetIncome: value });
                    monthlyIncomeValidation.validate(value);
                  }}
                  onBlur={() => {
                    monthlyIncomeValidation.onBlur();
                    monthlyIncomeValidation.validate(adult.monthlyNetIncome);
                  }}
                  error={monthlyIncomeValidation.touched && !!monthlyIncomeValidation.error}
                  helperText={
                    monthlyIncomeValidation.touched && monthlyIncomeValidation.error
                      ? monthlyIncomeValidation.error
                      : "Exemple : 2500 € pour un salaire net de 3000 €/mois"
                  }
                  sx={{ "& .MuiInputBase-root": { paddingRight: "40px" } }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Âge actuel"
                type="number"
                required
                value={adult.currentAge}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  updateAdult(index, { currentAge: value });
                  currentAgeValidation.validate(value);
                  // Réinitialiser la validation de l'âge de retraite si l'âge actuel change
                  if (adult.retirementAge && value >= adult.retirementAge) {
                    retirementAgeValidation.validate(adult.retirementAge);
                  }
                }}
                onBlur={() => {
                  currentAgeValidation.onBlur();
                  currentAgeValidation.validate(adult.currentAge);
                }}
                error={currentAgeValidation.touched && !!currentAgeValidation.error}
                helperText={currentAgeValidation.touched && currentAgeValidation.error}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ position: "relative" }}>
                <Tooltip
                  title="Âge auquel vous prévoyez de prendre votre retraite. En France, l'âge légal est généralement entre 62 et 67 ans selon votre année de naissance."
                  arrow
                  placement="top"
                >
                  <IconButton
                    size="small"
                    sx={{
                      position: "absolute",
                      right: 4,
                      top: 4,
                      zIndex: 1,
                      color: "text.secondary",
                    }}
                  >
                    <HelpOutline fontSize="small" />
                  </IconButton>
                </Tooltip>
                <TextField
                  fullWidth
                  label="Âge de départ à la retraite"
                  type="number"
                  required
                  value={adult.retirementAge}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    updateAdult(index, { retirementAge: value });
                    retirementAgeValidation.validate(value);
                    // Réinitialiser la validation de l'espérance de vie si l'âge de retraite change
                    if (adult.lifeExpectancy && value >= adult.lifeExpectancy) {
                      lifeExpectancyValidation.validate(adult.lifeExpectancy);
                    }
                  }}
                  onBlur={() => {
                    retirementAgeValidation.onBlur();
                    retirementAgeValidation.validate(adult.retirementAge);
                  }}
                  error={retirementAgeValidation.touched && !!retirementAgeValidation.error}
                  helperText={
                    retirementAgeValidation.touched && retirementAgeValidation.error
                      ? retirementAgeValidation.error
                      : "Exemple : 65 ans"
                  }
                  sx={{ "& .MuiInputBase-root": { paddingRight: "40px" } }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ position: "relative" }}>
                <Tooltip
                  title="Espérance de vie à la naissance. En France, elle est d'environ 85 ans pour les hommes et 90 ans pour les femmes. Utilisée pour calculer la durée de la phase de retraite."
                  arrow
                  placement="top"
                >
                  <IconButton
                    size="small"
                    sx={{
                      position: "absolute",
                      right: 4,
                      top: 4,
                      zIndex: 1,
                      color: "text.secondary",
                    }}
                  >
                    <HelpOutline fontSize="small" />
                  </IconButton>
                </Tooltip>
                <TextField
                  fullWidth
                  label="Espérance de vie"
                  type="number"
                  required
                  value={adult.lifeExpectancy}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    updateAdult(index, { lifeExpectancy: value });
                    lifeExpectancyValidation.validate(value);
                  }}
                  onBlur={() => {
                    lifeExpectancyValidation.onBlur();
                    lifeExpectancyValidation.validate(adult.lifeExpectancy);
                  }}
                  error={lifeExpectancyValidation.touched && !!lifeExpectancyValidation.error}
                  helperText={
                    lifeExpectancyValidation.touched && lifeExpectancyValidation.error
                      ? lifeExpectancyValidation.error
                      : "Exemple : 85 ans (hommes) ou 90 ans (femmes)"
                  }
                  sx={{ "& .MuiInputBase-root": { paddingRight: "40px" } }}
                />
              </Box>
            </Grid>
          </Grid>
        </Box>
        );
      })}
      <Button startIcon={<Add />} onClick={addAdult} variant="outlined" sx={{ mb: 4 }}>
        Ajouter un adulte
      </Button>

      <ConfirmDialog
        open={deleteAdultIndex !== null}
        title="Supprimer un adulte"
        message={`Êtes-vous sûr de vouloir supprimer l'adulte ${deleteAdultIndex !== null ? deleteAdultIndex + 1 : ""} ? Cette action est irréversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        severity="warning"
        onConfirm={confirmRemoveAdult}
        onCancel={() => setDeleteAdultIndex(null)}
      />

      <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
        Enfants ({formData.children.length})
      </Typography>
      {formData.children.map((child, index) => {
        const childNameValidation = useFieldValidation([
          ValidationRules.required("Le prénom est requis"),
        ]);

        const childAgeValidation = useFieldValidation([
          ValidationRules.required("L'âge est requis"),
          ValidationRules.minAge(0, "L'âge doit être positif"),
        ]);

        const departureAgeValidation = useFieldValidation([
          ValidationRules.required("L'âge de départ est requis"),
          ValidationRules.min(child.age || 0, "L'âge de départ doit être supérieur à l'âge actuel"),
        ]);

        return (
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
                onClick={() => handleRemoveChild(index)}
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
                  required
                  value={child.firstName}
                  onChange={(e) => {
                    updateChild(index, { firstName: e.target.value });
                    childNameValidation.validate(e.target.value);
                  }}
                  onBlur={() => {
                    childNameValidation.onBlur();
                    childNameValidation.validate(child.firstName);
                  }}
                  error={childNameValidation.touched && !!childNameValidation.error}
                  helperText={childNameValidation.touched && childNameValidation.error}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Âge actuel"
                  type="number"
                  required
                  value={child.age}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    updateChild(index, { age: value });
                    childAgeValidation.validate(value);
                    // Réinitialiser la validation de l'âge de départ si l'âge change
                    if (child.departureAge && value >= child.departureAge) {
                      departureAgeValidation.validate(child.departureAge);
                    }
                  }}
                  onBlur={() => {
                    childAgeValidation.onBlur();
                    childAgeValidation.validate(child.age);
                  }}
                  error={childAgeValidation.touched && !!childAgeValidation.error}
                  helperText={childAgeValidation.touched && childAgeValidation.error}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Box sx={{ position: "relative" }}>
                  <Tooltip
                    title="Âge auquel l'enfant quittera le foyer familial (fin des études, premier emploi, etc.). Utilisé pour calculer la fin des charges liées à l'enfant."
                    arrow
                    placement="top"
                  >
                    <IconButton
                      size="small"
                      sx={{
                        position: "absolute",
                        right: 4,
                        top: 4,
                        zIndex: 1,
                        color: "text.secondary",
                      }}
                    >
                      <HelpOutline fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <TextField
                    fullWidth
                    label="Âge de départ du foyer"
                    type="number"
                    required
                    value={child.departureAge}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      updateChild(index, { departureAge: value });
                      departureAgeValidation.validate(value);
                    }}
                    onBlur={() => {
                      departureAgeValidation.onBlur();
                      departureAgeValidation.validate(child.departureAge);
                    }}
                    error={departureAgeValidation.touched && !!departureAgeValidation.error}
                    helperText={
                      departureAgeValidation.touched && departureAgeValidation.error
                        ? departureAgeValidation.error
                        : "Exemple : 22 ans (fin des études)"
                    }
                    sx={{ "& .MuiInputBase-root": { paddingRight: "40px" } }}
                  />
                </Box>
              </Grid>
            </Grid>
          </Box>
        );
      })}
      <Button startIcon={<Add />} onClick={addChild} variant="outlined" sx={{ mb: 4 }}>
        Ajouter un enfant
      </Button>

      <ConfirmDialog
        open={deleteChildIndex !== null}
        title="Supprimer un enfant"
        message={`Êtes-vous sûr de vouloir supprimer l'enfant ${deleteChildIndex !== null ? deleteChildIndex + 1 : ""} ? Cette action est irréversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        severity="warning"
        onConfirm={confirmRemoveChild}
        onCancel={() => setDeleteChildIndex(null)}
      />

      <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
        Paramètres fiscaux
      </Typography>
      <Box
        sx={{
          p: 2,
          mb: 2,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          bgcolor: "background.paper",
        }}
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Ces informations sont utilisées pour calculer précisément les taxes sur les plus-values
          lors des retraits en phase de retraite.
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Box sx={{ position: "relative" }}>
              <Tooltip
                title="Taux Marginal d'Imposition (TMI) pendant votre phase d'épargne active. Ce taux détermine l'imposition des plus-values lors des retraits. Les tranches en France sont : 0%, 11%, 30%, 41%, 45%."
                arrow
                placement="top"
              >
                <IconButton
                  size="small"
                  sx={{
                    position: "absolute",
                    right: 4,
                    top: 4,
                    zIndex: 1,
                    color: "text.secondary",
                  }}
                >
                  <HelpOutline fontSize="small" />
                </IconButton>
              </Tooltip>
              <TextField
                fullWidth
                label="TMI phase d'épargne (%)"
                type="number"
                helperText="Exemple : 30% pour un revenu annuel entre 26 070 € et 74 545 €"
                value={formData.taxParameters?.tmiSavingsPhase !== undefined ? formData.taxParameters.tmiSavingsPhase * 100 : 30}
                onChange={(e) => {
                  const value = e.target.value ? parseFloat(e.target.value) / 100 : 0.30;
                  updateFormData({
                    taxParameters: {
                      isCouple: formData.taxParameters?.isCouple ?? formData.householdStatus === "couple",
                      tmiSavingsPhase: value,
                      tmiRetirementPhase: formData.taxParameters?.tmiRetirementPhase ?? 0.30,
                    },
                  });
                }}
                sx={{ "& .MuiInputBase-root": { paddingRight: "40px" } }}
              />
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ position: "relative" }}>
              <Tooltip
                title="Taux Marginal d'Imposition (TMI) pendant votre phase de retraite. Généralement plus faible qu'en phase active, il détermine l'imposition des retraits de vos placements."
                arrow
                placement="top"
              >
                <IconButton
                  size="small"
                  sx={{
                    position: "absolute",
                    right: 4,
                    top: 4,
                    zIndex: 1,
                    color: "text.secondary",
                  }}
                >
                  <HelpOutline fontSize="small" />
                </IconButton>
              </Tooltip>
              <TextField
                fullWidth
                label="TMI phase de retraite (%)"
                type="number"
                helperText="Exemple : 11% ou 30% selon vos revenus de retraite"
                value={formData.taxParameters?.tmiRetirementPhase !== undefined ? formData.taxParameters.tmiRetirementPhase * 100 : 30}
                onChange={(e) => {
                  const value = e.target.value ? parseFloat(e.target.value) / 100 : 0.30;
                  updateFormData({
                    taxParameters: {
                      isCouple: formData.taxParameters?.isCouple ?? formData.householdStatus === "couple",
                      tmiSavingsPhase: formData.taxParameters?.tmiSavingsPhase ?? 0.30,
                      tmiRetirementPhase: value,
                    },
                  });
                }}
                sx={{ "& .MuiInputBase-root": { paddingRight: "40px" } }}
              />
            </Box>
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Foyer fiscal</InputLabel>
              <Select
                value={formData.taxParameters?.isCouple ?? formData.householdStatus === "couple" ? "couple" : "single"}
                label="Foyer fiscal"
                onChange={(e) => {
                  const isCouple = e.target.value === "couple";
                  updateFormData({
                    taxParameters: {
                      ...formData.taxParameters,
                      isCouple,
                    },
                  });
                }}
              >
                <MenuItem value="single">Célibataire</MenuItem>
                <MenuItem value="couple">Couple</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
              Important pour les abattements assurance-vie (4600€ célibataire / 9200€ couple après 8 ans)
            </Typography>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}

