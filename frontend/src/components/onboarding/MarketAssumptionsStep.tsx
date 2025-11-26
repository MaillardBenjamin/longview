/**
 * Étape 6 : Hypothèses de marché.
 * 
 * Permet de personnaliser les hypothèses de rendement et de volatilité
 * des différentes classes d'actifs (optionnel, valeurs par défaut disponibles).
 */

import {
  Box,
  TextField,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Tooltip,
  IconButton,
} from "@mui/material";
import Grid from "@mui/material/GridLegacy";
import { ExpandMore, HelpOutline } from "@mui/icons-material";
import type { AssetClassKey, SimulationInput } from "@/types/simulation";

const assetClassLabels: Record<AssetClassKey, string> = {
  equities: "Actions mondiales",
  bonds: "Obligations investment grade",
  livrets: "Livrets réglementés",
  crypto: "Cryptomonnaies",
  other: "Supports diversifiés",
};

interface MarketAssumptionsStepProps {
  formData: SimulationInput;
  updateFormData: (updates: Partial<SimulationInput>) => void;
}

export function MarketAssumptionsStep({ formData, updateFormData }: MarketAssumptionsStepProps) {
  const market = formData.marketAssumptions;

  const updateAssetClass = (key: AssetClassKey, field: "expectedReturn" | "volatility", value: number) => {
    if (!market) return;
    updateFormData({
      marketAssumptions: {
        ...market,
        assetClasses: {
          ...market.assetClasses,
          [key]: {
            ...market.assetClasses[key],
            [field]: value,
          },
        },
      },
    });
  };

  const updateCorrelation = (
    asset1: AssetClassKey,
    asset2: AssetClassKey,
    value: number,
  ) => {
    if (!market) return;
    const newCorrelations: Record<AssetClassKey, Record<AssetClassKey, number>> = {
      equities: { ...market.correlations.equities },
      bonds: { ...market.correlations.bonds },
      livrets: { ...market.correlations.livrets },
      crypto: { ...market.correlations.crypto },
      other: { ...market.correlations.other },
    };
    newCorrelations[asset1][asset2] = value;
    // La corrélation est symétrique : corr(A,B) = corr(B,A)
    newCorrelations[asset2][asset1] = value;
    updateFormData({
      marketAssumptions: {
        ...market,
        correlations: newCorrelations,
      },
    });
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Hypothèses de marché
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Personnalisez les hypothèses de rendement et de volatilité (optionnel). Les valeurs par
        défaut sont basées sur des données historiques.
      </Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <Box sx={{ position: "relative" }}>
            <Tooltip
              title="Taux d'inflation annuel moyen attendu. La BCE cible 2% d'inflation. Historiquement, l'inflation en France a été d'environ 2% par an sur le long terme."
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
              label="Inflation moyenne annuelle (%)"
              type="number"
              value={market?.inflationMean ?? 2}
              onChange={(e) =>
                updateFormData({
                  marketAssumptions: {
                    ...market!,
                    inflationMean: parseFloat(e.target.value) || 0,
                  },
                })
              }
              helperText="Exemple : 2% (objectif BCE)"
              sx={{ "& .MuiInputBase-root": { paddingRight: "40px" } }}
            />
          </Box>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Box sx={{ position: "relative" }}>
            <Tooltip
              title="Variabilité de l'inflation autour de sa moyenne. Une volatilité de 1% signifie que l'inflation peut varier entre 1% et 3% environ (moyenne ± volatilité)."
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
              label="Volatilité de l'inflation (%)"
              type="number"
              value={market?.inflationVolatility ?? 1}
              onChange={(e) =>
                updateFormData({
                  marketAssumptions: {
                    ...market!,
                    inflationVolatility: parseFloat(e.target.value) || 0,
                  },
                })
              }
              helperText="Exemple : 1% (variation autour de la moyenne)"
              sx={{ "& .MuiInputBase-root": { paddingRight: "40px" } }}
            />
          </Box>
        </Grid>
      </Grid>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1" fontWeight="bold">
            Classes d'actifs
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            {(Object.keys(assetClassLabels) as AssetClassKey[]).map((key) => {
              const asset = market?.assetClasses[key];
              if (!asset) return null;
              return (
                <Grid item xs={12} key={key}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: "bold" }}>
                    {assetClassLabels[key]}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ position: "relative" }}>
                        <Tooltip
                          title={`Rendement annuel moyen attendu pour ${assetClassLabels[key]}. Basé sur des données historiques : Actions mondiales ~7%, Obligations ~3%, Livrets ~1.5%, Crypto ~15% (très volatil).`}
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
                          label="Rendement annuel attendu (%)"
                          type="number"
                          value={asset.expectedReturn}
                          onChange={(e) =>
                            updateAssetClass(key, "expectedReturn", parseFloat(e.target.value) || 0)
                          }
                          helperText={
                            key === "equities"
                              ? "Exemple : 7% (moyenne historique actions mondiales)"
                              : key === "bonds"
                                ? "Exemple : 3% (obligations investment grade)"
                                : key === "livrets"
                                  ? "Exemple : 1.5% (Livret A)"
                                  : "Valeur par défaut recommandée"
                          }
                          sx={{ "& .MuiInputBase-root": { paddingRight: "40px" } }}
                        />
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ position: "relative" }}>
                        <Tooltip
                          title={`Volatilité annuelle (écart-type) pour ${assetClassLabels[key]}. Mesure la variabilité des rendements. Plus la volatilité est élevée, plus les rendements peuvent varier d'une année sur l'autre.`}
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
                          label="Volatilité annuelle (%)"
                          type="number"
                          value={asset.volatility}
                          onChange={(e) =>
                            updateAssetClass(key, "volatility", parseFloat(e.target.value) || 0)
                          }
                          helperText={
                            key === "equities"
                              ? "Exemple : 15% (actions volatiles)"
                              : key === "bonds"
                                ? "Exemple : 6% (obligations moins volatiles)"
                                : key === "livrets"
                                  ? "Exemple : 0.5% (très stable)"
                                  : "Valeur par défaut recommandée"
                          }
                          sx={{ "& .MuiInputBase-root": { paddingRight: "40px" } }}
                        />
                      </Box>
                    </Grid>
                  </Grid>
                </Grid>
              );
            })}
          </Grid>
        </AccordionDetails>
      </Accordion>

      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1" fontWeight="bold">
            Paramètres de simulation Monte Carlo
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Configurez les paramètres de précision statistique pour les simulations Monte Carlo.
            Augmentez le nombre d&apos;itérations ou réduisez la tolérance pour améliorer la précision.
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Niveau de confiance</InputLabel>
                <Select
                  value={((market?.confidenceLevel ?? 0.9) * 100).toFixed(0)}
                  label="Niveau de confiance"
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) / 100;
                    updateFormData({
                      marketAssumptions: {
                        ...market!,
                        confidenceLevel: val,
                      },
                    });
                  }}
                >
                  <MenuItem value="90">90%</MenuItem>
                  <MenuItem value="95">95%</MenuItem>
                  <MenuItem value="99">99%</MenuItem>
                </Select>
                <FormHelperText>Niveau de confiance statistique pour les simulations</FormHelperText>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Tolérance</InputLabel>
                <Select
                  value={((market?.toleranceRatio ?? 0.01) * 100).toFixed(0)}
                  label="Tolérance"
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) / 100;
                    updateFormData({
                      marketAssumptions: {
                        ...market!,
                        toleranceRatio: val,
                      },
                    });
                  }}
                >
                  <MenuItem value="1">1%</MenuItem>
                  <MenuItem value="5">5%</MenuItem>
                  <MenuItem value="10">10%</MenuItem>
                </Select>
                <FormHelperText>Marge d'erreur relative acceptée</FormHelperText>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nombre maximum d'itérations"
                type="number"
                value={market?.maxIterations ?? 100}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 100) {
                    updateFormData({
                      marketAssumptions: {
                        ...market!,
                        maxIterations: val,
                      },
                    });
                  }
                }}
                inputProps={{ min: 100, step: 100 }}
                helperText="Nombre maximum de tirages Monte Carlo (minimum 100)"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Taille des lots"
                type="number"
                value={market?.batchSize ?? 500}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 50) {
                    updateFormData({
                      marketAssumptions: {
                        ...market!,
                        batchSize: val,
                      },
                    });
                  }
                }}
                inputProps={{ min: 50, step: 50 }}
                helperText="Nombre de tirages par lot pour vérifier la confiance (minimum 50)"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1" fontWeight="bold">
            Matrice de corrélations
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Définissez les corrélations entre les différentes classes d'actifs (entre -1 et 1).
            Une corrélation de 1 signifie une évolution parfaitement identique, -1 une évolution
            parfaitement opposée, et 0 une absence de corrélation.
          </Typography>
          <Box
            component="table"
            sx={{
              width: "100%",
              borderCollapse: "collapse",
              "& th, & td": {
                border: "1px solid",
                borderColor: "divider",
                padding: 1,
                textAlign: "center",
              },
              "& th": {
                backgroundColor: "background.default",
                fontWeight: "bold",
              },
              "& td:first-of-type": {
                backgroundColor: "background.default",
                fontWeight: "bold",
                textAlign: "left",
              },
            }}
          >
            <thead>
              <tr>
                <th></th>
                {(Object.keys(assetClassLabels) as AssetClassKey[]).map((key) => (
                  <th key={key}>{assetClassLabels[key]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(Object.keys(assetClassLabels) as AssetClassKey[]).map((asset1) => (
                <tr key={asset1}>
                  <td>{assetClassLabels[asset1]}</td>
                  {(Object.keys(assetClassLabels) as AssetClassKey[]).map((asset2) => {
                    const correlation =
                      market?.correlations?.[asset1]?.[asset2] ??
                      (asset1 === asset2 ? 1 : 0);
                    const isDiagonal = asset1 === asset2;
                    return (
                      <td key={asset2}>
                        {isDiagonal ? (
                          <Typography variant="body2" color="text.secondary">
                            1.00
                          </Typography>
                        ) : (
                          <TextField
                            size="small"
                            type="number"
                            value={correlation}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val) && val >= -1 && val <= 1) {
                                updateCorrelation(asset1, asset2, val);
                              }
                            }}
                            inputProps={{
                              min: -1,
                              max: 1,
                              step: 0.01,
                              style: { textAlign: "center", width: 80 },
                            }}
                            sx={{ width: 100 }}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </Box>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}

