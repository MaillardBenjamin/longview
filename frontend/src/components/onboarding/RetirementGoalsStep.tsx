/**
 * Étape 2 : Objectifs de retraite.
 * 
 * Permet de définir les revenus cibles et la pension d'État estimée.
 */

import { Box, Card, CardContent, TextField, Typography } from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import type { AdultProfile, SimulationInput } from "@/types/simulation";

interface RetirementGoalsStepProps {
  formData: SimulationInput;
  updateFormData: (updates: Partial<SimulationInput>) => void;
  adults: AdultProfile[];
}

export function RetirementGoalsStep({
  formData,
  updateFormData,
  adults,
}: RetirementGoalsStepProps) {
  const primaryAdult = adults[0];
  
  // Calcul de la proposition de pension d'État basée sur :
  // - Les revenus nets mensuels des adultes
  // - Les revenus additionnels (qui continueront à la retraite)
  // - Les charges qui s'arrêteront à la retraite
  const calculateSuggestedPension = () => {
    if (!primaryAdult) return 0;
    
    // Revenus nets mensuels totaux des adultes
    const totalNetIncome = adults.reduce((sum, adult) => sum + (adult.monthlyNetIncome ?? 0), 0);
    
    // Revenus additionnels qui continueront après la retraite
    // (on suppose qu'ils continuent si pas de date de fin spécifiée)
    const additionalIncomeAtRetirement = (formData.additionalIncomeStreams ?? []).reduce(
      (sum, income) => {
        const retirementAge = primaryAdult.retirementAge;
        // Si le revenu commence avant ou à la retraite, on l'inclut
        if (!income.startAge || income.startAge <= retirementAge) {
          return sum + income.monthlyAmount;
        }
        return sum;
      },
      0,
    );
    
    // Charges du foyer qui s'arrêteront avant ou à la retraite (ne seront plus à payer)
    const householdChargesEndingBeforeRetirement = (formData.householdCharges ?? []).reduce(
      (sum, charge) => {
        const retirementAge = primaryAdult.retirementAge;
        // Si la charge se termine avant ou à la retraite, on la soustrait
        if (charge.untilAge && charge.untilAge <= retirementAge) {
          return sum + charge.monthlyAmount;
        }
        return sum;
      },
      0,
    );

    // Charges par enfant qui s'arrêteront avant ou à la retraite
    const childChargesEndingBeforeRetirement = (formData.childCharges ?? []).reduce(
      (sum, charge) => {
        const retirementAge = primaryAdult.retirementAge;
        // Si la charge se termine avant ou à la retraite, on la soustrait
        if (charge.untilAge && charge.untilAge <= retirementAge) {
          return sum + charge.monthlyAmount;
        }
        return sum;
      },
      0,
    );
    
    // Proposition basée sur 50% des revenus nets + revenus additionnels - charges qui s'arrêtent
    const basePension = totalNetIncome * 0.5;
    const totalChargesEnding = householdChargesEndingBeforeRetirement + childChargesEndingBeforeRetirement;
    const suggested = basePension + additionalIncomeAtRetirement - totalChargesEnding;
    
    return Math.round(Math.max(0, suggested));
  };
  
  const suggestedPension = calculateSuggestedPension();

  // Calcul de la proposition de revenu net cible basée sur :
  // Revenus nets actuels - Charges permanentes - Charges par enfant + Charges qui s'arrêtent avant la retraite
  const calculateSuggestedTargetIncome = () => {
    if (!primaryAdult) return 0;

    // Revenus nets mensuels totaux des adultes
    const totalNetIncome = adults.reduce((sum, adult) => sum + (adult.monthlyNetIncome ?? 0), 0);

    // Charges permanentes (qui continueront après la retraite)
    const permanentCharges = (formData.householdCharges ?? []).reduce((sum, charge) => {
      const retirementAge = primaryAdult.retirementAge;
      // Si la charge n'a pas de date de fin ou se termine après la retraite, on l'inclut
      if (!charge.untilAge || charge.untilAge > retirementAge) {
        return sum + charge.monthlyAmount;
      }
      return sum;
    }, 0);

    // Charges qui s'arrêtent avant ou à la retraite (crédits, pensions, etc.)
    const chargesEndingBeforeRetirement = (formData.householdCharges ?? []).reduce((sum, charge) => {
      const retirementAge = primaryAdult.retirementAge;
      // Si la charge se termine avant ou à la retraite, on la soustrait (car elle ne sera plus à payer)
      if (charge.untilAge && charge.untilAge <= retirementAge) {
        return sum + charge.monthlyAmount;
      }
      return sum;
    }, 0);

    // Charges par enfant (qui s'arrêteront quand les enfants partiront)
    // Filtrer pour ne garder que les charges correspondant aux enfants actuels
    const currentChildNames = new Set((formData.children ?? []).map((child) => child.firstName));
    const validChildCharges = (formData.childCharges ?? []).filter((charge) =>
      currentChildNames.has(charge.childName),
    );
    const childChargesTotal = validChildCharges.reduce(
      (sum, charge) => sum + charge.monthlyAmount,
      0,
    );

    // Versements mensuels sur les comptes d'investissement (versements réels)
    // Les phases d'épargne sont indicatives et ne sont pas additionnées
    const investmentAccountsContributions = (formData.investmentAccounts ?? []).reduce(
      (sum, account) => sum + (account.monthlyContribution ?? 0),
      0,
    );

    // Total des versements mensuels sur l'épargne (uniquement les comptes d'investissement)
    const totalSavingsContributions = investmentAccountsContributions;

    // Proposition : revenus nets - charges permanentes - charges enfants - charges qui s'arrêtent - versements épargne
    // On soustrait les charges qui s'arrêtent et les versements épargne car ils sont actuellement payés et réduisent le revenu disponible
    const suggested =
      totalNetIncome -
      permanentCharges -
      childChargesTotal -
      chargesEndingBeforeRetirement -
      totalSavingsContributions;

    return Math.round(Math.max(0, suggested));
  };

  const suggestedTargetIncome = calculateSuggestedTargetIncome();

  // Calcul détaillé pour l'affichage didactique
  const totalNetIncome = adults.reduce((sum, adult) => sum + (adult.monthlyNetIncome ?? 0), 0);
  const retirementAge = primaryAdult?.retirementAge ?? 65;
  
  const permanentCharges = (formData.householdCharges ?? []).reduce((sum, charge) => {
    if (!charge.untilAge || charge.untilAge > retirementAge) {
      return sum + charge.monthlyAmount;
    }
    return sum;
  }, 0);
  
  const chargesEndingBeforeRetirement = (formData.householdCharges ?? []).reduce((sum, charge) => {
    if (charge.untilAge && charge.untilAge <= retirementAge) {
      return sum + charge.monthlyAmount;
    }
    return sum;
  }, 0);
  
  // Filtrer les charges par enfant pour ne garder que celles correspondant aux enfants actuels
  const currentChildNames = new Set((formData.children ?? []).map((child) => child.firstName));
  const validChildCharges = (formData.childCharges ?? []).filter((charge) =>
    currentChildNames.has(charge.childName),
  );

  const childChargesTotal = validChildCharges.reduce(
    (sum, charge) => sum + charge.monthlyAmount,
    0,
  );

  // Versements mensuels sur les comptes d'investissement (versements réels)
  // Les phases d'épargne sont indicatives et ne sont pas additionnées
  const investmentAccountsContributions = (formData.investmentAccounts ?? []).reduce(
    (sum, account) => sum + (account.monthlyContribution ?? 0),
    0,
  );

  // Total des versements mensuels sur l'épargne (uniquement les comptes d'investissement)
  const totalSavingsContributions = investmentAccountsContributions;

  // Détail des phases d'épargne pour l'affichage (indicatif uniquement)
  const savingsPhasesDetails = (formData.savingsPhases ?? []).map((phase) => ({
    label: phase.label,
    amount: phase.monthlyContribution ?? 0,
  }));

  // Détail des comptes d'investissement pour l'affichage
  const investmentAccountsDetails = (formData.investmentAccounts ?? []).map((account) => ({
    label: account.label ?? `${account.type}`,
    amount: account.monthlyContribution ?? 0,
  }));

  // Détail des charges permanentes pour l'affichage
  const permanentChargesDetails = (formData.householdCharges ?? [])
    .filter((charge) => !charge.untilAge || charge.untilAge > retirementAge)
    .map((charge) => ({ label: charge.label, amount: charge.monthlyAmount }));

  // Détail des charges qui s'arrêtent avant la retraite pour l'affichage
  const chargesEndingDetails = (formData.householdCharges ?? [])
    .filter((charge) => charge.untilAge && charge.untilAge <= retirementAge)
    .map((charge) => ({ label: charge.label, amount: charge.monthlyAmount, untilAge: charge.untilAge }));

  // Détail des charges par enfant pour l'affichage (filtrées pour ne garder que les enfants actuels)
  const childChargesDetails = validChildCharges.map((charge) => ({
    label: charge.childName,
    amount: charge.monthlyAmount,
  }));

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Objectifs de retraite
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Définissez vos objectifs de revenus pour la retraite. Les propositions sont calculées à
        partir de vos revenus actuels, charges et revenus additionnels.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Revenu net mensuel cible (€)"
            type="number"
            value={formData.targetMonthlyIncome ?? suggestedTargetIncome}
            onChange={(e) =>
              updateFormData({ targetMonthlyIncome: parseFloat(e.target.value) || 0 })
            }
            helperText={`Proposition : ${suggestedTargetIncome.toLocaleString("fr-FR")} €/mois`}
          />
          
          {/* Détail didactique du calcul */}
          <Card variant="outlined" sx={{ mt: 2, bgcolor: "background.default" }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom fontWeight="bold" color="primary">
                Calcul du revenu net mensuel cible
              </Typography>
              <Box component="div" sx={{ mt: 1 }}>
                <Typography variant="body2" component="div" sx={{ mb: 1 }}>
                  <strong>1. Revenus nets mensuels actuels :</strong>
                </Typography>
                {adults.map((adult, index) => (
                  <Typography
                    key={index}
                    variant="body2"
                    component="div"
                    sx={{ ml: 2, color: "text.secondary" }}
                  >
                    • {adult.firstName} :{" "}
                    {(adult.monthlyNetIncome ?? 0).toLocaleString("fr-FR")} €/mois
                  </Typography>
                ))}
                <Typography
                  variant="body2"
                  component="div"
                  sx={{ mt: 1, fontWeight: "bold", borderTop: "1px solid", borderColor: "divider", pt: 1 }}
                >
                  Total revenus nets : {totalNetIncome.toLocaleString("fr-FR")} €/mois
                </Typography>
              </Box>

              <Box component="div" sx={{ mt: 2 }}>
                <Typography variant="body2" component="div" sx={{ mb: 1 }}>
                  <strong>2. Charges permanentes (qui continueront à la retraite) :</strong>
                </Typography>
                {permanentChargesDetails.length > 0 ? (
                  <>
                    {permanentChargesDetails.map((charge, index) => (
                      <Typography
                        key={index}
                        variant="body2"
                        component="div"
                        sx={{ ml: 2, color: "text.secondary" }}
                      >
                        • {charge.label} : {charge.amount.toLocaleString("fr-FR")} €/mois
                      </Typography>
                    ))}
                    <Typography
                      variant="body2"
                      component="div"
                      sx={{ mt: 1, fontWeight: "bold", borderTop: "1px solid", borderColor: "divider", pt: 1 }}
                    >
                      Total charges permanentes : {permanentCharges.toLocaleString("fr-FR")} €/mois
                    </Typography>
                  </>
                ) : (
                  <Typography
                    variant="body2"
                    component="div"
                    sx={{ ml: 2, color: "text.secondary", fontStyle: "italic" }}
                  >
                    Aucune charge permanente
                  </Typography>
                )}
              </Box>

              <Box component="div" sx={{ mt: 2 }}>
                <Typography variant="body2" component="div" sx={{ mb: 1 }}>
                  <strong>3. Charges par enfant :</strong>
                </Typography>
                {childChargesDetails.length > 0 ? (
                  <>
                    {childChargesDetails.map((charge, index) => (
                      <Typography
                        key={index}
                        variant="body2"
                        component="div"
                        sx={{ ml: 2, color: "text.secondary" }}
                      >
                        • {charge.label} : {charge.amount.toLocaleString("fr-FR")} €/mois
                      </Typography>
                    ))}
                    <Typography
                      variant="body2"
                      component="div"
                      sx={{ mt: 1, fontWeight: "bold", borderTop: "1px solid", borderColor: "divider", pt: 1 }}
                    >
                      Total charges enfants : {childChargesTotal.toLocaleString("fr-FR")} €/mois
                    </Typography>
                  </>
                ) : (
                  <Typography
                    variant="body2"
                    component="div"
                    sx={{ ml: 2, color: "text.secondary", fontStyle: "italic" }}
                  >
                    Aucune charge par enfant
                  </Typography>
                )}
              </Box>

              <Box component="div" sx={{ mt: 2 }}>
                <Typography variant="body2" component="div" sx={{ mb: 1 }}>
                  <strong>4. Versements mensuels sur l'épargne :</strong>
                </Typography>
                {savingsPhasesDetails.length > 0 && (
                  <>
                    <Typography variant="body2" component="div" sx={{ ml: 2, mt: 1, fontWeight: "bold" }}>
                      Phases d'épargne (indicatif) :
                    </Typography>
                    {savingsPhasesDetails.map((phase, index) => (
                      <Typography
                        key={index}
                        variant="body2"
                        component="div"
                        sx={{ ml: 4, color: "text.secondary", fontStyle: "italic" }}
                      >
                        • {phase.label} : {phase.amount.toLocaleString("fr-FR")} €/mois (indicatif)
                      </Typography>
                    ))}
                    <Typography
                      variant="caption"
                      component="div"
                      sx={{ ml: 4, mt: 0.5, color: "text.secondary", fontStyle: "italic" }}
                    >
                      Les phases d'épargne sont indicatives et ne sont pas déduites du revenu disponible.
                    </Typography>
                  </>
                )}
                {investmentAccountsDetails.length > 0 ? (
                  <>
                    <Typography variant="body2" component="div" sx={{ ml: 2, mt: 2, fontWeight: "bold" }}>
                      Comptes d'investissement (versements réels) :
                    </Typography>
                    {investmentAccountsDetails.map((account, index) => (
                      <Typography
                        key={index}
                        variant="body2"
                        component="div"
                        sx={{ ml: 4, color: "text.secondary" }}
                      >
                        • {account.label} : {account.amount.toLocaleString("fr-FR")} €/mois
                      </Typography>
                    ))}
                    <Typography
                      variant="body2"
                      component="div"
                      sx={{ mt: 1, fontWeight: "bold", borderTop: "1px solid", borderColor: "divider", pt: 1 }}
                    >
                      Total versements épargne : {totalSavingsContributions.toLocaleString("fr-FR")} €/mois
                    </Typography>
                  </>
                ) : (
                  <Typography
                    variant="body2"
                    component="div"
                    sx={{ ml: 2, color: "text.secondary", fontStyle: "italic" }}
                  >
                    Aucun versement mensuel sur les comptes d'investissement
                  </Typography>
                )}
              </Box>

              <Box component="div" sx={{ mt: 2 }}>
                <Typography variant="body2" component="div" sx={{ mb: 1 }}>
                  <strong>5. Charges qui s'arrêtent avant la retraite (crédits, pensions, etc.) :</strong>
                </Typography>
                {chargesEndingDetails.length > 0 ? (
                  <>
                    {chargesEndingDetails.map((charge, index) => (
                      <Typography
                        key={index}
                        variant="body2"
                        component="div"
                        sx={{ ml: 2, color: "text.secondary" }}
                      >
                        • {charge.label} : {charge.amount.toLocaleString("fr-FR")} €/mois (jusqu'à {charge.untilAge} ans)
                      </Typography>
                    ))}
                    <Typography
                      variant="body2"
                      component="div"
                      sx={{ mt: 1, fontWeight: "bold", borderTop: "1px solid", borderColor: "divider", pt: 1 }}
                    >
                      Total charges qui s'arrêtent : {chargesEndingBeforeRetirement.toLocaleString("fr-FR")} €/mois
                    </Typography>
                    <Typography
                      variant="caption"
                      component="div"
                      sx={{ mt: 0.5, ml: 2, color: "text.secondary", fontStyle: "italic" }}
                    >
                      Ces charges sont actuellement payées et réduisent votre revenu disponible.
                    </Typography>
                  </>
                ) : (
                  <Typography
                    variant="body2"
                    component="div"
                    sx={{ ml: 2, color: "text.secondary", fontStyle: "italic" }}
                  >
                    Aucune charge qui s'arrête avant la retraite
                  </Typography>
                )}
              </Box>

              <Box component="div" sx={{ mt: 2, pt: 2, borderTop: "2px solid", borderColor: "primary.main" }}>
                <Typography variant="body2" component="div" sx={{ mb: 1 }}>
                  <strong>6. Calcul final :</strong>
                </Typography>
                <Typography variant="body2" component="div" sx={{ ml: 2 }}>
                  Revenu net cible = Revenus nets - Charges permanentes - Charges enfants - Versements épargne - Charges qui s'arrêtent
                </Typography>
                <Typography variant="body2" component="div" sx={{ ml: 2, mt: 0.5 }}>
                  = {totalNetIncome.toLocaleString("fr-FR")} € - {permanentCharges.toLocaleString("fr-FR")} € -{" "}
                  {childChargesTotal.toLocaleString("fr-FR")} € - {totalSavingsContributions.toLocaleString("fr-FR")} € -{" "}
                  {chargesEndingBeforeRetirement.toLocaleString("fr-FR")} €
                </Typography>
                <Typography
                  variant="h6"
                  component="div"
                  sx={{ mt: 1, fontWeight: "bold", color: "primary.main" }}
                >
                  = {suggestedTargetIncome.toLocaleString("fr-FR")} €/mois
                </Typography>
                <Typography variant="caption" component="div" sx={{ mt: 1, color: "text.secondary", fontStyle: "italic" }}>
                  Cette valeur représente le revenu net mensuel nécessaire pour maintenir votre niveau de vie actuel,
                  en tenant compte des charges qui continueront après la retraite et de celles qui s'arrêteront.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Pension d'État estimée (€/mois)"
            type="number"
            value={formData.statePensionMonthlyIncome ?? suggestedPension}
            onChange={(e) =>
              updateFormData({ statePensionMonthlyIncome: parseFloat(e.target.value) || 0 })
            }
            helperText={`Proposition calculée : ${suggestedPension} €/mois (50% des revenus nets + revenus additionnels - charges du foyer qui s'arrêtent - charges enfants qui s'arrêtent)`}
          />
        </Grid>
      </Grid>
    </Box>
  );
}

