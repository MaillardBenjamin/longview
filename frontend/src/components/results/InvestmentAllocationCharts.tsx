/**
 * Composant pour afficher les graphiques de répartition des placements.
 * 
 * Visualisations modernes et ergonomiques :
 * - Bar chart horizontal pour les types de compte
 * - Donut chart amélioré pour les classes d'actif
 * - Treemap hiérarchique multi-niveaux pour les propriétaires
 * - Stacked bar chart pour la composition détaillée
 */

import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { Box, Card, CardContent, Typography, useTheme, Chip } from "@mui/material";
import GridLegacy from "@mui/material/GridLegacy";
import {
  Assessment,
  AccountBalance,
  TrackChanges,
  TrendingUp,
  AccountTree,
} from "@mui/icons-material";
import type { InvestmentAccount, AdultProfile } from "@/types/simulation";

interface InvestmentAllocationChartsProps {
  accounts: InvestmentAccount[];
  adults: AdultProfile[];
  medianCapitalAtRetirement: number;
}

function formatCurrency(value: number, fractionDigits = 0) {
  return value.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  pea: "PEA",
  per: "PER",
  assurance_vie: "Assurance-vie",
  livret: "Livret",
  crypto: "Crypto",
  cto: "CTO",
  autre: "Autre",
};

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  pea: "#3b82f6",
  per: "#10b981",
  assurance_vie: "#8b5cf6",
  livret: "#f59e0b",
  crypto: "#ef4444",
  cto: "#06b6d4",
  autre: "#94a3b8",
};

const ASSET_CLASS_COLORS = {
  actions: "#3b82f6",
  obligations: "#10b981",
  crypto: "#ef4444",
  autre: "#94a3b8",
};

/**
 * Calcule les montants à la retraite pour chaque compte en fonction du capital médian.
 */
function calculateRetirementAmounts(
  accounts: InvestmentAccount[],
  medianCapital: number,
): Map<string, number> {
  const amounts = new Map<string, number>();
  
  if (accounts.length === 0) {
    return amounts;
  }

  const accountWeights = new Map<string, number>();
  let totalWeight = 0;

  accounts.forEach((account) => {
    const initial = account.currentAmount || 0;
    const monthly = account.monthlyContribution || 0;
    const estimatedContributions = monthly * 240 * 1.5;
    const weight = initial + estimatedContributions;
    accountWeights.set(account.id, weight);
    totalWeight += weight;
  });

  if (totalWeight === 0) {
    const perAccount = medianCapital / accounts.length;
    accounts.forEach((account) => {
      amounts.set(account.id, perAccount);
    });
    return amounts;
  }

  accounts.forEach((account) => {
    const weight = accountWeights.get(account.id) || 0;
    const ratio = weight / totalWeight;
    const retirementAmount = medianCapital * ratio;
    amounts.set(account.id, retirementAmount);
  });

  return amounts;
}

export function InvestmentAllocationCharts({
  accounts,
  adults,
  medianCapitalAtRetirement,
}: InvestmentAllocationChartsProps) {
  const theme = useTheme();

  const retirementAmounts = useMemo(
    () => calculateRetirementAmounts(accounts, medianCapitalAtRetirement),
    [accounts, medianCapitalAtRetirement],
  );

  // 1. Bar Chart Horizontal - Répartition par type de compte (plus lisible qu'un radar)
  const accountTypeBarChart = useMemo(() => {
    const typeTotals = new Map<string, number>();
    
    accounts.forEach((account) => {
      const amount = retirementAmounts.get(account.id) || 0;
      const current = typeTotals.get(account.type) || 0;
      typeTotals.set(account.type, current + amount);
    });

    const data = Array.from(typeTotals.entries())
      .map(([type, value]) => ({
        name: ACCOUNT_TYPE_LABELS[type] || type,
        value,
        type,
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);

    if (data.length === 0) {
      return null;
    }

    const totalValue = data.reduce((sum, d) => sum + d.value, 0);

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow",
        },
        formatter: (params: any) => {
          if (!Array.isArray(params)) return "";
          const item = data[params[0].dataIndex];
          const percent = ((item.value / totalValue) * 100).toFixed(1);
          return `
            <div style="padding: 12px;">
              <strong style="font-size: 15px; color: ${ACCOUNT_TYPE_COLORS[item.type]};">
                ${item.name}
              </strong>
              <div style="margin-top: 10px;">
                <div style="margin-bottom: 6px;">
                  <strong>${formatCurrency(item.value)}</strong>
                </div>
                <div style="margin-bottom: 6px;">
                  ${percent}% du total
                </div>
                <div style="padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.2);">
                  Total portefeuille : ${formatCurrency(totalValue)}
                </div>
              </div>
            </div>
          `;
        },
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        borderColor: "rgba(148, 163, 184, 0.3)",
        borderWidth: 1,
        textStyle: {
          color: "#f8fafc",
        },
      },
      grid: {
        left: "25%",
        right: "15%",
        top: "5%",
        bottom: "5%",
        containLabel: false,
      },
      xAxis: {
        type: "value",
        axisLabel: {
          formatter: (value: number) => {
            if (value >= 1000000) {
              return `${(value / 1000000).toFixed(1)}M€`;
            }
            if (value >= 1000) {
              return `${(value / 1000).toFixed(0)}k€`;
            }
            return `${value.toFixed(0)}€`;
          },
          fontSize: 11,
          color: theme.palette.text.secondary,
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: theme.palette.divider,
            type: "dashed",
          },
        },
        axisLine: {
          show: false,
        },
      },
      yAxis: {
        type: "category",
        data: data.map((item) => item.name),
        axisLabel: {
          fontSize: 13,
          fontWeight: "bold",
          color: theme.palette.text.primary,
        },
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
      },
      series: [
        {
          type: "bar",
          data: data.map((item) => ({
            value: item.value,
            itemStyle: {
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: 1,
                y2: 0,
                colorStops: [
                  { offset: 0, color: ACCOUNT_TYPE_COLORS[item.type] },
                  { offset: 1, color: ACCOUNT_TYPE_COLORS[item.type] + "CC" },
                ],
              },
              borderRadius: [0, 8, 8, 0],
            },
          })),
          label: {
            show: true,
            position: "right",
            formatter: (params: any) => {
              const percent = ((params.value / totalValue) * 100).toFixed(1);
              return `{value|${formatCurrency(params.value)}} {percent|(${percent}%)}`;
            },
            fontSize: 12,
            fontWeight: "bold",
            color: theme.palette.text.primary,
            rich: {
              value: {
                fontSize: 13,
                fontWeight: "bold",
                color: theme.palette.text.primary,
              },
              percent: {
                fontSize: 11,
                color: theme.palette.text.secondary,
                padding: [0, 0, 0, 4],
              },
            },
          },
          barWidth: "60%",
          animationDuration: 1000,
          animationEasing: "cubicOut",
        },
      ],
    };
  }, [accounts, retirementAmounts, theme]);

  // 2. Donut Chart Amélioré - Répartition par classe d'actif
  const assetClassDonutChart = useMemo(() => {
    let totalActions = 0;
    let totalObligations = 0;
    let totalCrypto = 0;
    let totalAutre = 0;

    accounts.forEach((account) => {
      const amount = retirementAmounts.get(account.id) || 0;
      const actions = account.allocationActions || 0;
      const obligations = account.allocationObligations || 0;
      const crypto = account.allocationCrypto || 0;
      const autre = 100 - actions - obligations - crypto;

      if (account.type === "livret") {
        totalAutre += amount;
      } else {
        totalActions += (amount * actions) / 100;
        totalObligations += (amount * obligations) / 100;
        totalCrypto += (amount * crypto) / 100;
        totalAutre += (amount * autre) / 100;
      }
    });

    const data = [
      { name: "Actions", value: totalActions, color: ASSET_CLASS_COLORS.actions, iconLabel: "Actions" },
      { name: "Obligations", value: totalObligations, color: ASSET_CLASS_COLORS.obligations, iconLabel: "Obligations" },
      { name: "Crypto", value: totalCrypto, color: ASSET_CLASS_COLORS.crypto, iconLabel: "Crypto" },
      { name: "Autre / Fonds €", value: totalAutre, color: ASSET_CLASS_COLORS.autre, iconLabel: "Autre" },
    ].filter((item) => item.value > 0);

    if (data.length === 0) {
      return null;
    }

    const total = data.reduce((sum, d) => sum + d.value, 0);

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        formatter: (params: any) => {
          const item = data.find((d) => d.name === params.name);
          const value = params.value as number;
          const percent = params.percent as number;
          return `
            <div style="padding: 12px;">
              <strong style="font-size: 15px;">${params.name}</strong>
              <div style="margin-top: 10px;">
                <div style="margin-bottom: 6px;">
                  <strong>${formatCurrency(value)}</strong>
                </div>
                <div style="margin-bottom: 6px;">
                  ${percent.toFixed(1)}% de l'allocation
                </div>
                <div style="padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.2);">
                  Total allocation : ${formatCurrency(total)}
                </div>
              </div>
            </div>
          `;
        },
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        borderColor: "rgba(148, 163, 184, 0.3)",
        borderWidth: 1,
        textStyle: {
          color: "#f8fafc",
        },
      },
      legend: {
        orient: "horizontal",
        bottom: "5%",
        left: "center",
        itemWidth: 18,
        itemHeight: 18,
        itemGap: 20,
        formatter: (name: string) => {
          const item = data.find((d) => d.name === name);
          if (item) {
            const percent = ((item.value / total) * 100).toFixed(1);
            const amount = formatCurrency(item.value, 0);
            return `{name|${name}} {details|(${amount} · ${percent}%)}`;
          }
          return name;
        },
        textStyle: {
          color: theme.palette.text.primary,
          fontSize: 13,
          fontWeight: 500,
          rich: {
            name: {
              fontSize: 13,
              fontWeight: "bold",
              color: theme.palette.text.primary,
            },
            details: {
              fontSize: 11,
              color: theme.palette.text.secondary,
              padding: [0, 0, 0, 8],
            },
          },
        },
      },
      series: [
        {
          name: "Classe d'actif",
          type: "pie",
          radius: ["45%", "75%"],
          center: ["50%", "45%"],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 10,
            borderColor: "#fff",
            borderWidth: 3,
          },
          label: {
            show: true,
            position: "outside",
            formatter: (params: any) => {
              const percent = params.percent as number;
              if (percent < 3) return "";
              return `${formatPercent(percent)}`;
            },
            fontSize: 13,
            fontWeight: "bold",
            color: theme.palette.text.primary,
            distanceToLabelLine: 10,
          },
          labelLine: {
            show: true,
            length: 20,
            length2: 15,
            smooth: 0.3,
            lineStyle: {
              width: 2,
            },
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 16,
              fontWeight: "bold",
            },
            itemStyle: {
              shadowBlur: 25,
              shadowOffsetX: 0,
              shadowOffsetY: 5,
              shadowColor: "rgba(0, 0, 0, 0.4)",
            },
            scale: true,
            scaleSize: 8,
          },
          data: data.map((item) => ({
            name: item.name,
            value: item.value,
            itemStyle: {
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: 1,
                y2: 1,
                colorStops: [
                  { offset: 0, color: item.color },
                  { offset: 1, color: item.color + "CC" },
                ],
              },
            },
          })),
          animationType: "scale",
          animationEasing: "elasticOut",
          animationDuration: 1200,
        },
      ],
    };
  }, [accounts, retirementAmounts, theme]);

  // 3. Treemap Hiérarchique Multi-niveaux - Propriétaire > Type > Classe d'actif
  const hierarchicalTreemap = useMemo(() => {
    const ownerData = new Map<string, Map<string, { actions: number; obligations: number; crypto: number; autre: number; accounts: string[] }>>();
    const ownerLabels = new Map<string, string>();
    
    adults.forEach((adult) => {
      ownerLabels.set(adult.firstName, adult.firstName);
    });
    ownerLabels.set("Commun", "Commun");

    accounts.forEach((account) => {
      const owner = account.ownerName || "Commun";
      const amount = retirementAmounts.get(account.id) || 0;
      
      if (amount > 0) {
        if (!ownerData.has(owner)) {
          ownerData.set(owner, new Map());
        }
        
        const accountType = account.type;
        const typeMap = ownerData.get(owner)!;
        
        if (!typeMap.has(accountType)) {
          typeMap.set(accountType, { actions: 0, obligations: 0, crypto: 0, autre: 0, accounts: [] });
        }
        
        const typeData = typeMap.get(accountType)!;
        const actions = account.allocationActions || 0;
        const obligations = account.allocationObligations || 0;
        const crypto = account.allocationCrypto || 0;
        const autre = 100 - actions - obligations - crypto;
        
        if (account.type === "livret") {
          typeData.autre += amount;
        } else {
          typeData.actions += (amount * actions) / 100;
          typeData.obligations += (amount * obligations) / 100;
          typeData.crypto += (amount * crypto) / 100;
          typeData.autre += (amount * autre) / 100;
        }
        
        typeData.accounts.push(account.label || ACCOUNT_TYPE_LABELS[account.type] || account.type);
      }
    });

    const owners = Array.from(ownerData.keys());
    if (owners.length === 0) {
      return null;
    }

    // Construire la structure hiérarchique : Propriétaire > Type > Classe d'actif
    const treemapData = {
      name: "Portefeuille",
      value: medianCapitalAtRetirement,
      children: owners.map((owner) => {
        const typeMap = ownerData.get(owner)!;
        const ownerTotal = Array.from(typeMap.values()).reduce(
          (sum, t) => sum + t.actions + t.obligations + t.crypto + t.autre,
          0
        );
        
        return {
          name: ownerLabels.get(owner) || owner,
          value: ownerTotal,
          children: Array.from(typeMap.entries()).map(([accountType, allocation]) => {
            const typeTotal = allocation.actions + allocation.obligations + allocation.crypto + allocation.autre;
            const assetClasses = [
              { name: "Actions", value: allocation.actions, color: ASSET_CLASS_COLORS.actions },
              { name: "Obligations", value: allocation.obligations, color: ASSET_CLASS_COLORS.obligations },
              { name: "Crypto", value: allocation.crypto, color: ASSET_CLASS_COLORS.crypto },
              { name: "Autre", value: allocation.autre, color: ASSET_CLASS_COLORS.autre },
            ].filter((a) => a.value > 0);
            
            return {
              name: ACCOUNT_TYPE_LABELS[accountType] || accountType,
              value: typeTotal,
              type: accountType,
              accounts: allocation.accounts,
              children: assetClasses.map((asset) => ({
                name: asset.name,
                value: asset.value,
                color: asset.color,
              })),
            };
          }),
        };
      }),
    };

    // Calculer les valeurs min/max pour le gradient (niveau feuilles uniquement)
    const leafValues: number[] = [];
    owners.forEach((owner) => {
      const typeMap = ownerData.get(owner)!;
      Array.from(typeMap.values()).forEach((allocation) => {
        if (allocation.actions > 0) leafValues.push(allocation.actions);
        if (allocation.obligations > 0) leafValues.push(allocation.obligations);
        if (allocation.crypto > 0) leafValues.push(allocation.crypto);
        if (allocation.autre > 0) leafValues.push(allocation.autre);
      });
    });
    
    const minValue = leafValues.length > 0 ? Math.min(...leafValues) : 0;
    const maxValue = leafValues.length > 0 ? Math.max(...leafValues) : 0;

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        formatter: (params: any) => {
          const value = params.value as number;
          const percent = ((value / medianCapitalAtRetirement) * 100).toFixed(1);
          const path = params.treePathInfo?.map((p: any) => p.name).join(" › ") || params.name;
          const data = params.data as any;
          
          const borderColor = theme.palette.mode === "dark" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)";
          let accountList = "";
          if (data.accounts && data.accounts.length > 0) {
            accountList = `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid ${borderColor};">
              Comptes : ${data.accounts.join(", ")}
            </div>`;
          }
          
          return `
            <div style="padding: 12px; max-width: 300px;">
              <strong style="font-size: 14px;">${path}</strong>
              <div style="margin-top: 10px;">
                <div style="margin-bottom: 6px;">
                  <strong>${formatCurrency(value)}</strong>
                </div>
                <div>
                  ${percent}% du portefeuille
                </div>
                ${accountList}
              </div>
            </div>
          `;
        },
        backgroundColor: theme.palette.mode === "dark" ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)",
        borderColor: theme.palette.divider,
        borderWidth: 1,
        textStyle: {
          color: theme.palette.text.primary,
        },
      },
      visualMap: {
        type: "continuous",
        min: minValue,
        max: maxValue,
        dimension: 0,
        seriesIndex: 0,
        inRange: {
          color: [
            "#bfdbfe", // Bleu très clair
            "#60a5fa", // Bleu clair
            "#3b82f6", // Bleu
            "#2563eb", // Bleu foncé
            "#7c3aed", // Violet
            "#a855f7", // Violet clair
          ],
        },
        calculable: true,
        realtime: true,
        orient: "vertical",
        left: "2%",
        top: "center",
        textStyle: {
          color: theme.palette.text.secondary,
          fontSize: 11,
        },
        formatter: (value: number) => {
          if (value >= 1000000) {
            return `${(value / 1000000).toFixed(1)}M€`;
          }
          if (value >= 1000) {
            return `${(value / 1000).toFixed(0)}k€`;
          }
          return `${value.toFixed(0)}€`;
        },
        itemWidth: 18,
        itemHeight: 180,
      },
      series: [
        {
          type: "treemap",
          data: [treemapData],
          roam: false,
          nodeClick: "zoomToNode",
          breadcrumb: {
            show: true,
            height: 28,
            left: "center",
            top: "bottom",
            itemStyle: {
              color: theme.palette.background.paper,
              borderColor: theme.palette.divider,
              borderWidth: 1,
              shadowBlur: 4,
              shadowColor: "rgba(0, 0, 0, 0.15)",
              borderRadius: 6,
            },
            emphasis: {
              itemStyle: {
                color: theme.palette.primary.main,
                borderColor: theme.palette.primary.dark,
              },
            },
            textStyle: {
              fontSize: 13,
              fontWeight: "bold",
            },
          },
          label: {
            show: true,
            formatter: (params: any) => {
              const name = params.name as string;
              const value = params.value as number;
              const treePathInfo = params.treePathInfo || [];
              const level = treePathInfo.length;
              
              // Format simple sans rich text pour éviter les problèmes d'affichage
              // Niveau propriétaire (niveau 1)
              if (level === 1) {
                return `${name}\n${formatCurrency(value)}`;
              }
              
              // Niveau type de compte (niveau 2)
              if (level === 2) {
                const data = params.data as any;
                const accountCount = data.accounts?.length || 0;
                return `${name}\n${formatCurrency(value)}\n${accountCount} compte${accountCount > 1 ? "s" : ""}`;
              }
              
              // Niveau classe d'actif (niveau 3)
              if (level === 3) {
                const shortName = name.length > 10 ? name.substring(0, 10) + "…" : name;
                return `${shortName}\n${formatCurrency(value, 0)}`;
              }
              
              return name;
            },
            fontSize: 12,
            fontWeight: "bold",
            color: theme.palette.text.primary,
            overflow: "truncate",
            ellipsis: "…",
          },
          upperLabel: {
            show: true,
            height: 35,
            fontSize: 16,
            fontWeight: "bold",
            color: theme.palette.text.primary,
          },
          itemStyle: {
            borderColor: theme.palette.mode === "dark" ? theme.palette.divider : "#fff",
            borderWidth: 3,
            gapWidth: 3,
          },
          emphasis: {
            itemStyle: {
              borderColor: theme.palette.primary.main,
              borderWidth: 4,
              shadowBlur: 20,
              shadowColor: "rgba(0, 0, 0, 0.4)",
            },
            label: {
              fontSize: 14,
            },
          },
          levels: [
            {
              // Niveau racine (invisible)
              itemStyle: {
                borderWidth: 0,
                gapWidth: 0,
              },
              upperLabel: {
                show: false,
              },
              label: {
                show: false,
              },
            },
            {
              // Niveau propriétaires
              itemStyle: {
                borderColor: theme.palette.mode === "dark" ? theme.palette.divider : "#fff",
                borderWidth: 4,
                gapWidth: 8,
              },
              label: {
                show: true,
                fontSize: 16,
                fontWeight: "bold",
                color: theme.palette.mode === "dark" ? theme.palette.text.primary : "#ffffff",
                backgroundColor: theme.palette.mode === "dark" ? theme.palette.background.paper : "rgba(15, 23, 42, 0.85)",
                padding: [8, 12],
                borderRadius: 6,
                formatter: (params: any) => {
                  const name = params.name as string;
                  const value = params.value as number;
                  return `${name}\n${formatCurrency(value)}`;
                },
              },
              emphasis: {
                itemStyle: {
                  borderColor: theme.palette.primary.main,
                  borderWidth: 6,
                },
              },
            },
            {
              // Niveau types de compte
              itemStyle: {
                borderColor: theme.palette.mode === "dark" ? theme.palette.divider : "#fff",
                borderWidth: 3,
                gapWidth: 4,
              },
              label: {
                show: true,
                fontSize: 13,
                fontWeight: "bold",
                color: theme.palette.text.primary,
                backgroundColor: theme.palette.mode === "dark" ? theme.palette.background.paper : "rgba(255, 255, 255, 0.9)",
                padding: [4, 8],
                borderRadius: 4,
                formatter: (params: any) => {
                  const name = params.name as string;
                  const value = params.value as number;
                  const data = params.data as any;
                  const accountCount = data?.accounts?.length || 0;
                  return `${name}\n${formatCurrency(value)}\n${accountCount} compte${accountCount > 1 ? "s" : ""}`;
                },
              },
            },
            {
              // Niveau classes d'actif - Gradient appliqué
              itemStyle: {
                borderColor: theme.palette.mode === "dark" ? theme.palette.divider : "#fff",
                borderWidth: 2,
                gapWidth: 2,
              },
              label: {
                show: true,
                fontSize: 11,
                fontWeight: "bold",
                color: theme.palette.text.primary,
                backgroundColor: theme.palette.mode === "dark" ? theme.palette.background.paper : "rgba(255, 255, 255, 0.9)",
                padding: [2, 4],
                borderRadius: 4,
                formatter: (params: any) => {
                  const name = params.name as string;
                  const value = params.value as number;
                  const shortName = name.length > 10 ? name.substring(0, 10) + "…" : name;
                  return `${shortName}\n${formatCurrency(value, 0)}`;
                },
              },
              visualMin: minValue,
              visualMax: maxValue,
            },
          ],
        },
      ],
    };
  }, [accounts, adults, retirementAmounts, medianCapitalAtRetirement, theme]);

  // 4. Stacked Bar Chart - Composition détaillée par type de compte
  const compositionStackedChart = useMemo(() => {
    const typeTotals = new Map<string, { actions: number; obligations: number; crypto: number; autre: number }>();
    
    accounts.forEach((account) => {
      const amount = retirementAmounts.get(account.id) || 0;
      const actions = account.allocationActions || 0;
      const obligations = account.allocationObligations || 0;
      const crypto = account.allocationCrypto || 0;
      const autre = 100 - actions - obligations - crypto;
      
      if (!typeTotals.has(account.type)) {
        typeTotals.set(account.type, { actions: 0, obligations: 0, crypto: 0, autre: 0 });
      }
      
      const typeData = typeTotals.get(account.type)!;
      
      if (account.type === "livret") {
        typeData.autre += amount;
      } else {
        typeData.actions += (amount * actions) / 100;
        typeData.obligations += (amount * obligations) / 100;
        typeData.crypto += (amount * crypto) / 100;
        typeData.autre += (amount * autre) / 100;
      }
    });

    const types = Array.from(typeTotals.entries())
      .map(([type, allocation]) => ({
        type,
        name: ACCOUNT_TYPE_LABELS[type] || type,
        ...allocation,
        total: allocation.actions + allocation.obligations + allocation.crypto + allocation.autre,
      }))
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total);

    if (types.length === 0) {
      return null;
    }

    const categories = types.map((t) => t.name);
    const actionsData = types.map((t) => t.actions);
    const obligationsData = types.map((t) => t.obligations);
    const cryptoData = types.map((t) => t.crypto);
    const autreData = types.map((t) => t.autre);

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow",
        },
        formatter: (params: any) => {
          if (!Array.isArray(params)) return "";
          const typeIndex = params[0].dataIndex;
          const type = types[typeIndex];
          
          let html = `
            <div style="padding: 12px;">
              <strong style="font-size: 15px;">${type.name}</strong>
              <div style="margin-top: 10px;">
          `;
          
          params.forEach((param: any) => {
            if (param.value > 0) {
              const percent = ((param.value / type.total) * 100).toFixed(1);
              html += `
                <div style="margin-bottom: 6px;">
                  <span style="display: inline-block; width: 12px; height: 12px; background: ${param.color}; border-radius: 50%; margin-right: 6px;"></span>
                  ${param.seriesName} : <strong>${formatCurrency(param.value)}</strong> (${percent}%)
                </div>
              `;
            }
          });
          
          html += `
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.2);">
                  Total : <strong>${formatCurrency(type.total)}</strong>
                </div>
              </div>
            </div>
          `;
          
          return html;
        },
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        borderColor: "rgba(148, 163, 184, 0.3)",
        borderWidth: 1,
        textStyle: {
          color: "#f8fafc",
        },
      },
      legend: {
        data: ["Actions", "Obligations", "Crypto", "Autre / Fonds €"],
        top: "0%",
        textStyle: {
          color: theme.palette.text.primary,
          fontSize: 12,
          fontWeight: 500,
        },
        itemWidth: 16,
        itemHeight: 16,
        itemGap: 16,
        selectedMode: false,
      },
      color: [
        ASSET_CLASS_COLORS.actions,
        ASSET_CLASS_COLORS.obligations,
        ASSET_CLASS_COLORS.crypto,
        ASSET_CLASS_COLORS.autre,
      ],
      grid: {
        left: "8%",
        right: "8%",
        top: "12%",
        bottom: "15%",
        containLabel: false,
      },
      xAxis: {
        type: "category",
        data: categories,
        axisLabel: {
          rotate: 0,
          fontSize: 12,
          fontWeight: "bold",
          color: theme.palette.text.primary,
          interval: 0,
          formatter: (value: string) => {
            // Retour à la ligne si trop long
            if (value.length > 10) {
              return value.substring(0, 10) + "\n" + value.substring(10);
            }
            return value;
          },
          lineHeight: 16,
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: theme.palette.divider,
          },
        },
        axisTick: {
          show: false,
        },
      },
      yAxis: {
        type: "value",
        name: "Montant (€)",
        nameTextStyle: {
          fontSize: 12,
          color: theme.palette.text.secondary,
        },
        axisLabel: {
          formatter: (value: number) => {
            if (value >= 1000000) {
              return `${(value / 1000000).toFixed(1)}M€`;
            }
            if (value >= 1000) {
              return `${(value / 1000).toFixed(0)}k€`;
            }
            return `${value.toFixed(0)}€`;
          },
          fontSize: 11,
          color: theme.palette.text.secondary,
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: theme.palette.divider,
            type: "dashed",
          },
        },
      },
      series: [
        {
          name: "Actions",
          type: "bar",
          stack: "total",
          data: actionsData,
          itemStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: ASSET_CLASS_COLORS.actions },
                { offset: 1, color: ASSET_CLASS_COLORS.actions + "CC" },
              ],
            },
          },
        },
        {
          name: "Obligations",
          type: "bar",
          stack: "total",
          data: obligationsData,
          itemStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: ASSET_CLASS_COLORS.obligations },
                { offset: 1, color: ASSET_CLASS_COLORS.obligations + "CC" },
              ],
            },
          },
        },
        {
          name: "Crypto",
          type: "bar",
          stack: "total",
          data: cryptoData,
          itemStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: ASSET_CLASS_COLORS.crypto },
                { offset: 1, color: ASSET_CLASS_COLORS.crypto + "CC" },
              ],
            },
          },
        },
        {
          name: "Autre / Fonds €",
          type: "bar",
          stack: "total",
          data: autreData,
          itemStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: ASSET_CLASS_COLORS.autre },
                { offset: 1, color: ASSET_CLASS_COLORS.autre + "CC" },
              ],
            },
          },
        },
      ],
      animationDuration: 1000,
      animationEasing: "cubicOut",
    };
  }, [accounts, retirementAmounts, theme]);

  if (accounts.length === 0) {
    return null;
  }

  // Statistiques récapitulatives
  const stats = useMemo(() => {
    const typeCount = new Set(accounts.map((a) => a.type)).size;
    const ownerCount = new Set(accounts.map((a) => a.ownerName || "Commun")).size;
    
    let totalActions = 0;
    let totalObligations = 0;
    
    accounts.forEach((account) => {
      const amount = retirementAmounts.get(account.id) || 0;
      const actions = account.allocationActions || 0;
      const obligations = account.allocationObligations || 0;
      
      if (account.type !== "livret") {
        totalActions += (amount * actions) / 100;
        totalObligations += (amount * obligations) / 100;
      }
    });
    
    const totalAllocated = totalActions + totalObligations;
    const actionsPercent = totalAllocated > 0 ? (totalActions / totalAllocated) * 100 : 0;
    
    return {
      typeCount,
      ownerCount,
      actionsPercent,
    };
  }, [accounts, retirementAmounts]);

  return (
    <Box sx={{ mt: { xs: 3, md: 5 } }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Assessment sx={{ fontSize: { xs: "1.75rem", md: "2rem" }, color: theme.palette.primary.main }} />
            <Typography
              variant="h5"
              component="h2"
              sx={{
                fontSize: { xs: "1.5rem", md: "1.75rem" },
                fontWeight: 700,
                color: theme.palette.text.primary,
              }}
            >
              Répartition des placements à la retraite
            </Typography>
          </Box>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              fontSize: "0.95rem",
              lineHeight: 1.5,
            }}
          >
            Capital médian estimé : <strong>{formatCurrency(medianCapitalAtRetirement)}</strong>
          </Typography>
        </Box>
        
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Chip
            label={`${accounts.length} compte${accounts.length > 1 ? "s" : ""}`}
            size="small"
            sx={{ fontWeight: 600 }}
          />
          <Chip
            label={`${stats.typeCount} type${stats.typeCount > 1 ? "s" : ""}`}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
          <Chip
            label={`${stats.ownerCount} propriétaire${stats.ownerCount > 1 ? "s" : ""}`}
            size="small"
            color="secondary"
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
          <Chip
            label={`${stats.actionsPercent.toFixed(0)}% actions`}
            size="small"
            color="info"
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
        </Box>
      </Box>

      <GridLegacy container spacing={3}>
        {/* Graphique 1 : Bar Chart Horizontal - Par type de compte */}
        {accountTypeBarChart && (
          <GridLegacy item xs={12} md={6}>
            <Card
              sx={{
                background: theme.palette.background.paper,
                borderRadius: "1.5rem",
                boxShadow: theme.shadows[4],
                border: `1px solid ${theme.palette.divider}`,
                height: "100%",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: theme.shadows[8],
                },
              }}
            >
              <CardContent sx={{ p: { xs: 2.5, md: 3.5 }, height: "100%" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <AccountBalance sx={{ fontSize: "1.5rem", color: theme.palette.primary.main }} />
                  <Typography
                    variant="h6"
                    component="h3"
                    sx={{
                      fontSize: { xs: "1.15rem", md: "1.3rem" },
                      fontWeight: 700,
                      color: theme.palette.text.primary,
                    }}
                  >
                    Répartition par type de compte
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mb: 2,
                    fontSize: "0.85rem",
                  }}
                >
                  Visualisation des montants par enveloppe fiscale
                </Typography>
                <Box
                  sx={{
                    width: "100%",
                    height: { xs: "400px", md: "450px" },
                  }}
                >
                  <ReactECharts option={accountTypeBarChart} style={{ width: "100%", height: "100%" }} />
                </Box>
              </CardContent>
            </Card>
          </GridLegacy>
        )}

        {/* Graphique 2 : Donut Chart - Par classe d'actif */}
        {assetClassDonutChart && (
          <GridLegacy item xs={12} md={6}>
            <Card
              sx={{
                background: theme.palette.background.paper,
                borderRadius: "1.5rem",
                boxShadow: theme.shadows[4],
                border: `1px solid ${theme.palette.divider}`,
                height: "100%",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: theme.shadows[8],
                },
              }}
            >
              <CardContent sx={{ p: { xs: 2.5, md: 3.5 }, height: "100%" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <TrackChanges sx={{ fontSize: "1.5rem", color: theme.palette.primary.main }} />
                  <Typography
                    variant="h6"
                    component="h3"
                    sx={{
                      fontSize: { xs: "1.15rem", md: "1.3rem" },
                      fontWeight: 700,
                      color: theme.palette.text.primary,
                    }}
                  >
                    Allocation d&apos;actifs
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mb: 2,
                    fontSize: "0.85rem",
                  }}
                >
                  Répartition stratégique du capital
                </Typography>
                <Box
                  sx={{
                    width: "100%",
                    height: { xs: "400px", md: "450px" },
                  }}
                >
                  <ReactECharts option={assetClassDonutChart} style={{ width: "100%", height: "100%" }} />
                </Box>
              </CardContent>
            </Card>
          </GridLegacy>
        )}

        {/* Graphique 3 : Stacked Bar - Composition détaillée */}
        {compositionStackedChart && (
          <GridLegacy item xs={12} md={12}>
            <Card
              sx={{
                background: theme.palette.background.paper,
                borderRadius: "1.5rem",
                boxShadow: theme.shadows[4],
                border: `1px solid ${theme.palette.divider}`,
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: theme.shadows[8],
                },
              }}
            >
              <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <TrendingUp sx={{ fontSize: "1.5rem", color: theme.palette.primary.main }} />
                  <Typography
                    variant="h6"
                    component="h3"
                    sx={{
                      fontSize: { xs: "1.15rem", md: "1.3rem" },
                      fontWeight: 700,
                      color: theme.palette.text.primary,
                    }}
                  >
                    Composition détaillée par type
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mb: 2,
                    fontSize: "0.85rem",
                  }}
                >
                  Répartition des classes d&apos;actifs au sein de chaque enveloppe
                </Typography>
                <Box
                  sx={{
                    width: "100%",
                    height: { xs: "400px", md: "450px" },
                  }}
                >
                  <ReactECharts option={compositionStackedChart} style={{ width: "100%", height: "100%" }} />
                </Box>
              </CardContent>
            </Card>
          </GridLegacy>
        )}

        {/* Graphique 4 : Treemap Hiérarchique - Par propriétaire */}
        {hierarchicalTreemap && (
          <GridLegacy item xs={12}>
            <Card
              sx={{
                background: theme.palette.background.paper,
                borderRadius: "1.5rem",
                boxShadow: theme.shadows[4],
                border: `1px solid ${theme.palette.divider}`,
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: theme.shadows[8],
                },
              }}
            >
              <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <AccountTree sx={{ fontSize: "1.5rem", color: theme.palette.primary.main }} />
                  <Typography
                    variant="h6"
                    component="h3"
                    sx={{
                      fontSize: { xs: "1.15rem", md: "1.3rem" },
                      fontWeight: 700,
                      color: theme.palette.text.primary,
                    }}
                  >
                    Vue hiérarchique par propriétaire
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mb: 2,
                    fontSize: "0.85rem",
                  }}
                >
                  Exploration interactive : Propriétaire › Type de compte › Classe d&apos;actif. 
                  Cliquez pour zoomer, les couleurs reflètent les montants alloués.
                </Typography>
                <Box
                  sx={{
                    width: "100%",
                    height: { xs: "550px", md: "650px" },
                  }}
                >
                  <ReactECharts option={hierarchicalTreemap} style={{ width: "100%", height: "100%" }} />
                </Box>
              </CardContent>
            </Card>
          </GridLegacy>
        )}

      </GridLegacy>
    </Box>
  );
}
