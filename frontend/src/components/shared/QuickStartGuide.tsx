/**
 * Guide de démarrage rapide pour les nouveaux utilisateurs.
 * 
 * Affiche une modal avec les étapes essentielles pour commencer une simulation.
 */

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Card,
  CardContent,
  IconButton,
} from "@mui/material";
import { Close, CheckCircle, HelpOutline } from "@mui/icons-material";
import { useState } from "react";

interface QuickStartGuideProps {
  open: boolean;
  onClose: () => void;
  onDontShowAgain?: () => void;
}

const steps = [
  {
    label: "Informations personnelles",
    description: "Renseignez les informations de base sur votre foyer",
    content: (
      <Box>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Commencez par remplir les informations essentielles :
        </Typography>
        <Box component="ul" sx={{ pl: 2, mb: 2 }}>
          <li>
            <Typography variant="body2">
              <strong>Statut du foyer :</strong> Célibataire ou Couple
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Adultes :</strong> Prénom, âge actuel, âge de départ à la retraite, espérance de vie, revenu net mensuel
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Enfants :</strong> Prénom, âge actuel, âge de départ du foyer
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Paramètres fiscaux :</strong> Taux Marginal d'Imposition (TMI) pour les phases d'épargne et de retraite
            </Typography>
          </li>
        </Box>
        <Card variant="outlined" sx={{ bgcolor: "info.light", p: 1 }}>
          <Typography variant="caption">
            💡 <strong>Astuce :</strong> L'espérance de vie par défaut est généralement de 85 ans pour les hommes et 90 ans pour les femmes.
          </Typography>
        </Card>
      </Box>
    ),
  },
  {
    label: "Charges & Revenus",
    description: "Définissez vos charges mensuelles et revenus additionnels",
    content: (
      <Box>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Cette étape permet de modéliser votre situation financière actuelle :
        </Typography>
        <Box component="ul" sx={{ pl: 2, mb: 2 }}>
          <li>
            <Typography variant="body2">
              <strong>Charges du foyer :</strong> Crédit immobilier, loyer, charges diverses (avec date de fin si applicable)
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Charges par enfant :</strong> Frais de scolarité, activités, etc.
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Revenus additionnels :</strong> Pensions, revenus locatifs, etc.
            </Typography>
          </li>
        </Box>
        <Card variant="outlined" sx={{ bgcolor: "info.light", p: 1 }}>
          <Typography variant="caption">
            💡 <strong>Astuce :</strong> Les charges qui s'arrêtent avant la retraite (comme un crédit immobilier) seront automatiquement déduites de vos besoins à la retraite.
          </Typography>
        </Card>
      </Box>
    ),
  },
  {
    label: "Épargne & Investissements",
    description: "Configurez vos comptes d'investissement et phases d'épargne",
    content: (
      <Box>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Définissez vos supports d'investissement et votre stratégie d'épargne :
        </Typography>
        <Box component="ul" sx={{ pl: 2, mb: 2 }}>
          <li>
            <Typography variant="body2">
              <strong>Phases d'épargne :</strong> Définissez des périodes avec des montants d'épargne différents (ex: plus d'épargne après la fin du crédit)
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Comptes d'investissement :</strong> PEA, PER, Assurance-vie, Livrets, CTO, etc.
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Allocations :</strong> Pour chaque compte, définissez la répartition entre actions et obligations
            </Typography>
          </li>
        </Box>
        <Card variant="outlined" sx={{ bgcolor: "info.light", p: 1 }}>
          <Typography variant="caption">
            💡 <strong>Astuce :</strong> L'âge d'ouverture du compte est important pour le calcul de l'ancienneté fiscale (notamment pour l'assurance-vie avec abattements après 8 ans).
          </Typography>
        </Card>
      </Box>
    ),
  },
  {
    label: "Objectifs de retraite",
    description: "Définissez vos revenus cibles à la retraite",
    content: (
      <Box>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Spécifiez vos objectifs financiers pour la retraite :
        </Typography>
        <Box component="ul" sx={{ pl: 2, mb: 2 }}>
          <li>
            <Typography variant="body2">
              <strong>Revenu net mensuel cible :</strong> Le montant dont vous aurez besoin chaque mois à la retraite
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Pension d'État estimée :</strong> Votre pension de retraite attendue
            </Typography>
          </li>
        </Box>
        <Card variant="outlined" sx={{ bgcolor: "success.light", p: 1 }}>
          <Typography variant="caption">
            ✅ <strong>Astuce :</strong> Des propositions sont calculées automatiquement à partir de vos revenus et charges actuels. Vous pouvez les ajuster selon vos besoins.
          </Typography>
        </Card>
      </Box>
    ),
  },
  {
    label: "Profil de dépenses",
    description: "Modélisez l'évolution de vos besoins avec l'âge",
    content: (
      <Box>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Définissez comment vos besoins évolueront pendant la retraite :
        </Typography>
        <Box component="ul" sx={{ pl: 2, mb: 2 }}>
          <li>
            <Typography variant="body2">
              <strong>Phases de dépenses :</strong> Créez des périodes avec des ratios de dépenses différents
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Ratio de dépenses :</strong> 100% = même niveau de vie qu'actuellement, 80% = dépenses réduites de 20%
            </Typography>
          </li>
        </Box>
        <Card variant="outlined" sx={{ bgcolor: "info.light", p: 1 }}>
          <Typography variant="caption">
            💡 <strong>Exemple :</strong> De 65 à 75 ans : 100% (vie active), de 75 à 85 ans : 85% (moins de voyages), après 85 ans : 70% (besoins réduits).
          </Typography>
        </Card>
      </Box>
    ),
  },
  {
    label: "Hypothèses de marché",
    description: "Personnalisez les rendements attendus (optionnel)",
    content: (
      <Box>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Cette étape est optionnelle. Des valeurs par défaut sont proposées basées sur des données historiques :
        </Typography>
        <Box component="ul" sx={{ pl: 2, mb: 2 }}>
          <li>
            <Typography variant="body2">
              <strong>Inflation :</strong> Moyenne et volatilité (par défaut : 2% ± 1%)
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Classes d'actifs :</strong> Rendements et volatilités pour actions, obligations, livrets, etc.
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Corrélations :</strong> Relations entre les différentes classes d'actifs
            </Typography>
          </li>
          <li>
            <Typography variant="body2">
              <strong>Paramètres Monte Carlo :</strong> Niveau de confiance, tolérance, nombre d'itérations
            </Typography>
          </li>
        </Box>
        <Card variant="outlined" sx={{ bgcolor: "warning.light", p: 1 }}>
          <Typography variant="caption">
            ⚠️ <strong>Note :</strong> Les valeurs par défaut sont généralement suffisantes pour la plupart des utilisateurs. Modifiez-les uniquement si vous avez des connaissances spécifiques sur les marchés.
          </Typography>
        </Card>
      </Box>
    ),
  },
];

export function QuickStartGuide({ open, onClose, onDontShowAgain }: QuickStartGuideProps) {
  const [activeStep, setActiveStep] = useState(0);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h5" component="span" fontWeight="bold">
            Guide de démarrage rapide
          </Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Suivez ce guide étape par étape pour créer votre première simulation de retraite.
        </Typography>

        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel
                optional={
                  index === steps.length - 1 ? (
                    <Typography variant="caption">Dernière étape</Typography>
                  ) : null
                }
              >
                <Typography variant="subtitle1" fontWeight="bold">
                  {step.label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {step.description}
                </Typography>
              </StepLabel>
              <StepContent>
                {step.content}
                <Box sx={{ mb: 2, mt: 2 }}>
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    sx={{ mr: 1 }}
                    disabled={index === steps.length - 1}
                  >
                    {index === steps.length - 1 ? "Terminé" : "Suivant"}
                  </Button>
                  <Button disabled={index === 0} onClick={handleBack}>
                    Précédent
                  </Button>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>

        {activeStep === steps.length && (
          <Card sx={{ mt: 3, bgcolor: "success.light" }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <CheckCircle sx={{ mr: 1, color: "success.main" }} />
                <Typography variant="h6" fontWeight="bold">
                  Guide terminé !
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Vous êtes maintenant prêt à créer votre simulation. N'hésitez pas à utiliser les
                tooltips d'aide (icône <HelpOutline fontSize="small" />) sur les champs complexes pour obtenir plus d'informations.
              </Typography>
              <Button variant="outlined" onClick={handleReset} sx={{ mt: 1 }}>
                Revoir le guide
              </Button>
            </CardContent>
          </Card>
        )}
      </DialogContent>
      <DialogActions>
        {onDontShowAgain && (
          <Button onClick={onDontShowAgain} color="inherit">
            Ne plus afficher
          </Button>
        )}
        <Button onClick={onClose} variant="contained">
          Commencer
        </Button>
      </DialogActions>
    </Dialog>
  );
}

