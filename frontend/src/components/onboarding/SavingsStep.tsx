/**
 * Étape 3 : Épargne & Investissements.
 * 
 * Permet de définir les phases d'épargne et les comptes d'investissement.
 */

import {
  Autocomplete,
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
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import type {
  AdultProfile,
  InvestmentAccount,
  InvestmentAccountType,
  LivretBreakdown,
  SavingsPhase,
  SimulationInput,
} from "@/types/simulation";

const generateId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const investmentAccountTypeLabels: Record<InvestmentAccountType, string> = {
  pea: "PEA (100% actions)",
  per: "PER",
  assurance_vie: "Assurance vie",
  livret: "Livrets réglementés",
  cto: "CTO (actions)",
  crypto: "Cryptomonnaie",
  autre: "Autre support",
};

// Types de livrets réglementés disponibles en France
const livretTypes = [
  "Livret A",
  "Livret de développement durable et solidaire (LDDS)",
  "Livret d'épargne populaire (LEP)",
  "Livret jeune",
  "Plan d'épargne logement (PEL)",
  "Compte épargne logement (CEL)",
  "Livret B",
  "Livret d'épargne entreprise (LEE)",
];

interface SavingsStepProps {
  formData: SimulationInput;
  addSavingsPhase: () => void;
  updateSavingsPhase: (index: number, updates: Partial<SavingsPhase>) => void;
  removeSavingsPhase: (index: number) => void;
  addInvestmentAccount: (account: InvestmentAccount) => void;
  updateInvestmentAccount: (id: string, updates: Partial<InvestmentAccount>) => void;
  removeInvestmentAccount: (id: string) => void;
  adults: AdultProfile[];
}

export function SavingsStep({
  formData,
  addSavingsPhase,
  updateSavingsPhase,
  removeSavingsPhase,
  addInvestmentAccount,
  updateInvestmentAccount,
  removeInvestmentAccount,
  adults,
}: SavingsStepProps) {
  const [deleteSavingsPhaseIndex, setDeleteSavingsPhaseIndex] = useState<number | null>(null);
  const [deleteAccountId, setDeleteAccountId] = useState<string | null>(null);

  const handleRemoveSavingsPhase = (index: number) => {
    setDeleteSavingsPhaseIndex(index);
  };

  const handleRemoveAccount = (id: string) => {
    setDeleteAccountId(id);
  };

  const confirmRemoveSavingsPhase = () => {
    if (deleteSavingsPhaseIndex !== null) {
      removeSavingsPhase(deleteSavingsPhaseIndex);
      setDeleteSavingsPhaseIndex(null);
    }
  };

  const confirmRemoveAccount = () => {
    if (deleteAccountId) {
      removeInvestmentAccount(deleteAccountId);
      setDeleteAccountId(null);
    }
  };

  const handleAddAccount = () => {
    const newAccount: InvestmentAccount = {
      id: generateId(),
      type: "pea",
      label: "Nouveau compte",
      currentAmount: 0,
      monthlyContribution: 0,
      ownerName: "Commun",
      allocationActions: 50,
      allocationObligations: 50,
    };
    addInvestmentAccount(newAccount);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Épargne & Investissements
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Définissez vos phases d'épargne et vos comptes d'investissement.
      </Typography>

      <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
        Phases d'épargne ({formData.savingsPhases?.length ?? 0})
      </Typography>
      {(formData.savingsPhases ?? []).map((phase, index) => (
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
              onClick={() => handleRemoveSavingsPhase(index)}
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
                value={phase.label}
                onChange={(e) => updateSavingsPhase(index, { label: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="De (âge)"
                type="number"
                value={phase.fromAge}
                onChange={(e) =>
                  updateSavingsPhase(index, { fromAge: parseInt(e.target.value) || 0 })
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
                  updateSavingsPhase(index, { toAge: parseInt(e.target.value) || 0 })
                }
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ position: "relative" }}>
                <Tooltip
                  title="Montant total que vous épargnez chaque mois pendant cette phase. Peut inclure plusieurs comptes d'investissement. Cette valeur est indicative et sert à modéliser l'évolution de votre capacité d'épargne."
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
                  label="Épargne mensuelle (€)"
                  type="number"
                  value={phase.monthlyContribution}
                  onChange={(e) =>
                    updateSavingsPhase(index, { monthlyContribution: parseFloat(e.target.value) || 0 })
                  }
                  helperText="Exemple : 500 €/mois ou 1000 €/mois après la fin du crédit"
                  sx={{ "& .MuiInputBase-root": { paddingRight: "40px" } }}
                />
              </Box>
            </Grid>
          </Grid>
        </Box>
      ))}
      <Button startIcon={<Add />} onClick={addSavingsPhase} variant="outlined" sx={{ mb: 4 }}>
        Ajouter une phase d'épargne
      </Button>

      <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
        Comptes d'investissement ({formData.investmentAccounts.length})
      </Typography>
      {formData.investmentAccounts.map((account) => (
        <Box
          key={account.id}
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
              {account.label}
            </Typography>
            <IconButton
              size="small"
              color="error"
              onClick={() => handleRemoveAccount(account.id)}
              aria-label="Supprimer"
            >
              <Delete />
            </IconButton>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Type de compte</InputLabel>
                <Select
                  value={account.type}
                  label="Type de compte"
                  onChange={(e) =>
                    updateInvestmentAccount(account.id, { type: e.target.value as InvestmentAccountType })
                  }
                >
                  {Object.entries(investmentAccountTypeLabels).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Label"
                value={account.label}
                onChange={(e) => updateInvestmentAccount(account.id, { label: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ position: "relative" }}>
                <Tooltip
                  title="Montant actuellement présent sur ce compte d'investissement. C'est le capital de départ qui sera utilisé pour la simulation."
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
                  label="Capital actuel (€)"
                  type="number"
                  value={account.currentAmount}
                  onChange={(e) =>
                    updateInvestmentAccount(account.id, {
                      currentAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                  helperText="Exemple : 10 000 € sur votre PEA"
                  sx={{ "& .MuiInputBase-root": { paddingRight: "40px" } }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ position: "relative" }}>
                <Tooltip
                  title="Montant que vous versez chaque mois sur ce compte. Ces versements seront effectués jusqu'à la retraite (ou jusqu'à la fin de la phase d'épargne correspondante)."
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
                  label="Cotisation mensuelle (€)"
                  type="number"
                  value={account.monthlyContribution}
                  onChange={(e) =>
                    updateInvestmentAccount(account.id, {
                      monthlyContribution: parseFloat(e.target.value) || 0,
                    })
                  }
                  helperText="Exemple : 200 €/mois sur votre PEA"
                  sx={{ "& .MuiInputBase-root": { paddingRight: "40px" } }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Propriétaire</InputLabel>
                <Select
                  value={account.ownerName ?? "Commun"}
                  label="Propriétaire"
                  onChange={(e) =>
                    updateInvestmentAccount(account.id, { ownerName: e.target.value || undefined })
                  }
                >
                  <MenuItem value="Commun">Commun</MenuItem>
                  {adults.map((adult) => (
                    <MenuItem key={adult.firstName} value={adult.firstName}>
                      {adult.firstName}
                    </MenuItem>
                  ))}
                  {(formData.children ?? []).map((child) => (
                    <MenuItem key={child.firstName} value={child.firstName}>
                      {child.firstName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ position: "relative" }}>
                <Tooltip
                  title="Âge auquel vous avez ouvert ce compte. Important pour le calcul de l'ancienneté fiscale, notamment pour l'assurance-vie (abattements après 8 ans : 4600€ célibataire / 9200€ couple)."
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
                  label="Âge d'ouverture du compte"
                  type="number"
                  helperText="Exemple : 30 ans (si vous avez ouvert le compte à 30 ans)"
                  value={account.openingDateAge ?? ""}
                  onChange={(e) =>
                    updateInvestmentAccount(account.id, {
                      openingDateAge: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  sx={{ "& .MuiInputBase-root": { paddingRight: "40px" } }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Box sx={{ position: "relative" }}>
                <Tooltip
                  title="Montant total que vous avez versé sur ce compte depuis son ouverture (somme de tous vos versements). Utilisé pour calculer les plus-values imposables. Si non renseigné, on suppose que le capital actuel correspond aux versements totaux."
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
                  label="Coût d'acquisition initial (€)"
                  type="number"
                  helperText="Exemple : 15 000 € si vous avez versé 15 000 € au total (même si le capital actuel vaut 20 000 €)"
                  value={account.initialCostBasis ?? ""}
                  onChange={(e) =>
                    updateInvestmentAccount(account.id, {
                      initialCostBasis: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  sx={{ "& .MuiInputBase-root": { paddingRight: "40px" } }}
                />
              </Box>
            </Grid>
            {(account.type === "per" || account.type === "assurance_vie") && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Allocation actions (%)"
                    type="number"
                    value={account.allocationActions ?? 50}
                    onChange={(e) =>
                      updateInvestmentAccount(account.id, {
                        allocationActions: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Allocation obligations (%)"
                    type="number"
                    value={account.allocationObligations ?? 50}
                    onChange={(e) =>
                      updateInvestmentAccount(account.id, {
                        allocationObligations: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </Grid>
              </>
            )}
            {account.type === "livret" && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold" }}>
                  Répartition des livrets (%)
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {(account.livretBreakdown ?? []).map((breakdown, idx) => (
                    <Box
                      key={breakdown.id}
                      sx={{
                        display: "flex",
                        gap: 1,
                        alignItems: "center",
                        p: 1,
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1,
                      }}
                    >
                      <Autocomplete
                        size="small"
                        options={livretTypes}
                        value={breakdown.label}
                        onChange={(_, newValue) => {
                          const newBreakdown = [...(account.livretBreakdown ?? [])];
                          newBreakdown[idx] = { ...newBreakdown[idx], label: newValue || "" };
                          updateInvestmentAccount(account.id, { livretBreakdown: newBreakdown });
                        }}
                        freeSolo
                        renderInput={(params) => (
                          <TextField {...params} label="Type de livret" sx={{ flex: 1 }} />
                        )}
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        size="small"
                        label="%"
                        type="number"
                        value={breakdown.percentage}
                        onChange={(e) => {
                          const newBreakdown = [...(account.livretBreakdown ?? [])];
                          newBreakdown[idx] = {
                            ...newBreakdown[idx],
                            percentage: parseFloat(e.target.value) || 0,
                          };
                          updateInvestmentAccount(account.id, { livretBreakdown: newBreakdown });
                        }}
                        sx={{ width: 100 }}
                      />
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          const newBreakdown = (account.livretBreakdown ?? []).filter(
                            (_, i) => i !== idx,
                          );
                          updateInvestmentAccount(account.id, { livretBreakdown: newBreakdown });
                        }}
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  ))}
                  <Button
                    size="small"
                    startIcon={<Add />}
                    onClick={() => {
                      const newBreakdown: LivretBreakdown = {
                        id: generateId(),
                        label: "Livret A",
                        percentage: 0,
                      };
                      updateInvestmentAccount(account.id, {
                        livretBreakdown: [...(account.livretBreakdown ?? []), newBreakdown],
                      });
                    }}
                    variant="outlined"
                  >
                    Ajouter un livret
                  </Button>
                </Box>
              </Grid>
            )}
          </Grid>
        </Box>
      ))}
      <Button startIcon={<Add />} onClick={handleAddAccount} variant="outlined">
        Ajouter un compte d'investissement
      </Button>

      <ConfirmDialog
        open={deleteSavingsPhaseIndex !== null}
        title="Supprimer une phase d'épargne"
        message={`Êtes-vous sûr de vouloir supprimer la phase d'épargne ${deleteSavingsPhaseIndex !== null ? deleteSavingsPhaseIndex + 1 : ""} ? Cette action est irréversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        severity="warning"
        onConfirm={confirmRemoveSavingsPhase}
        onCancel={() => setDeleteSavingsPhaseIndex(null)}
      />

      <ConfirmDialog
        open={deleteAccountId !== null}
        title="Supprimer un compte d'investissement"
        message="Êtes-vous sûr de vouloir supprimer ce compte d'investissement ? Cette action est irréversible et toutes les données associées seront perdues."
        confirmText="Supprimer"
        cancelText="Annuler"
        severity="warning"
        onConfirm={confirmRemoveAccount}
        onCancel={() => setDeleteAccountId(null)}
      />
    </Box>
  );
}

