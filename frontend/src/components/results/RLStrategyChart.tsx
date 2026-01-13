/**
 * Composant pour afficher la stratégie d'épargne optimisée par RL.
 * 
 * Visualise l'évolution de l'épargne mensuelle et de l'allocation d'actifs
 * recommandées par le modèle RL au fil du temps.
 */

import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { Box, Card, CardContent, Typography, Alert } from "@mui/material";
import type { SavingsPhase } from "@/types/simulation";

interface RLStrategyChartProps {
  savingsPhases: SavingsPhase[];
  isRLStrategy?: boolean;
}

function formatCurrency(value: number, fractionDigits = 0) {
  return value.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

export function RLStrategyChart({ savingsPhases, isRLStrategy = false }: RLStrategyChartProps) {
  const chartOption = useMemo(() => {
    if (!savingsPhases || savingsPhases.length === 0) {
      return null;
    }

    // Préparer les données pour le graphique
    const ages: number[] = [];
    const monthlySavings: number[] = [];
    const labels: string[] = [];

    savingsPhases.forEach((phase, index) => {
      // Créer des points pour chaque phase
      const duration = phase.toAge - phase.fromAge;
      const pointsPerPhase = Math.max(1, Math.ceil(duration)); // Au moins 1 point par phase

      for (let i = 0; i < pointsPerPhase; i++) {
        const age = phase.fromAge + (i / (pointsPerPhase - 1 || 1)) * duration;
        ages.push(age);
        monthlySavings.push(phase.monthlyContribution);
        labels.push(
          i === 0 || i === pointsPerPhase - 1
            ? `${phase.label || `Phase ${index + 1}`} - ${age.toFixed(1)} ans`
            : ""
        );
      }
    });

    return {
      tooltip: {
        trigger: "axis",
        formatter: (params: any) => {
          const index = params?.[0]?.dataIndex ?? 0;
          const age = ages[index];
          const savings = monthlySavings[index];

          if (age === undefined || savings === undefined) {
            return "";
          }

          const lines = [
            `<strong>Âge : ${age.toFixed(1)} ans</strong>`,
            `Épargne mensuelle recommandée : ${formatCurrency(savings, 0)}`,
          ];

          return lines.join("<br/>");
        },
      },
      legend: {
        data: ["Épargne mensuelle recommandée"],
        bottom: 0,
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "12%",
        top: "10%",
        containLabel: true,
      },
      xAxis: {
        type: "value",
        name: "Âge",
        nameLocation: "middle",
        nameGap: 30,
        min: Math.min(...ages),
        max: Math.max(...ages),
      },
      yAxis: {
        type: "value",
        name: "Épargne mensuelle (€)",
        axisLabel: {
          formatter: (value: number) => formatCurrency(value as number),
        },
      },
      series: [
        {
          name: "Épargne mensuelle recommandée",
          type: "line",
          step: "start", // Graphique en escalier pour montrer les phases
          smooth: false,
          showSymbol: false,
          lineStyle: {
            width: 3,
            color: "#0ea5e9",
          },
          areaStyle: {
            opacity: 0.3,
            color: "#0ea5e9",
          },
          data: monthlySavings,
          markLine: {
            silent: true,
            symbol: "none",
            label: {
              show: true,
              position: "insideEndTop",
              formatter: (params: any) => {
                const phaseIndex = params.dataIndex;
                return savingsPhases[phaseIndex]?.label || "";
              },
            },
            lineStyle: {
              type: "dashed",
              color: "#94a3b8",
              width: 1,
            },
            data: savingsPhases.map((phase, index) => ({
              xAxis: phase.fromAge,
              name: phase.label || `Phase ${index + 1}`,
            })),
          },
        },
      ],
    };
  }, [savingsPhases]);

  if (!savingsPhases || savingsPhases.length === 0) {
    return null;
  }

  return (
    <Card
      sx={{
        background: "rgba(255, 255, 255, 0.92)",
        borderRadius: "1.25rem",
        boxShadow: "0 16px 28px rgba(148, 163, 184, 0.15)",
        border: "1px solid rgba(148, 163, 184, 0.2)",
        mt: { xs: 3, md: 4 },
      }}
    >
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="h5"
            component="h2"
            gutterBottom
            sx={{
              fontSize: { xs: "1.5rem", md: "1.75rem" },
              fontWeight: 700,
              color: "#0f172a",
              mb: 0.5,
            }}
          >
            {isRLStrategy ? "Stratégie optimisée par IA" : "Phases d'épargne"}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 2,
              fontSize: "0.95rem",
              lineHeight: 1.5,
              color: "#475569",
            }}
          >
            {isRLStrategy
              ? "Cette stratégie a été générée par l'IA et s'adapte automatiquement selon votre âge et votre situation. L'épargne recommandée peut varier dans le temps pour optimiser votre capital final tout en préservant votre qualité de vie."
              : "Évolution de l'épargne mensuelle recommandée au fil du temps."}
          </Typography>
          {isRLStrategy && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Cette stratégie adaptative peut ajuster automatiquement votre épargne et votre allocation d'actifs
              selon votre situation financière au fil des années.
            </Alert>
          )}
        </Box>
        {chartOption ? (
          <Box
            sx={{
              width: "100%",
              height: { xs: "320px", md: "400px" },
              borderRadius: "1rem",
              overflow: "hidden",
            }}
          >
            <ReactECharts option={chartOption} style={{ width: "100%", height: "100%" }} />
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
            Aucune donnée de stratégie disponible.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}





