/**
 * Composant pour afficher les itérations d'optimisation sous forme de graphique.
 * 
 * Affiche l'évolution du facteur d'échelle, de l'épargne mensuelle et du capital final
 * au fil des itérations de l'algorithme d'optimisation.
 */

import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { Box, Card, CardContent, Typography, useTheme } from "@mui/material";
import type { OptimizationStep } from "@/types/simulation";

interface OptimizationIterationsChartProps {
  steps: OptimizationStep[];
}

function formatCurrency(value: number, fractionDigits = 0) {
  return value.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

export function OptimizationIterationsChart({ steps }: OptimizationIterationsChartProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const chartOption = useMemo(() => {
    if (!steps || steps.length === 0) {
      return null;
    }

    // Préparer les données pour le graphique
    const iterations = steps.map((step) => step.iteration);
    const scales = steps.map((step) => step.scale);
    const monthlySavings = steps.map((step) => step.monthlySavings);
    const finalCapitals = steps.map((step) => step.finalCapital);
    const effectiveFinalCapitals = steps.map((step) => step.effectiveFinalCapital);

    // Couleurs pour le mode sombre
    const backgroundColor = isDark ? "#1e293b" : "#ffffff";
    const textColor = isDark ? "#e2e8f0" : "#0f172a";
    const axisLineColor = isDark ? "#334155" : "#e2e8f0";
    const splitLineColor = isDark ? "#334155" : "#f1f5f9";
    const tooltipBackgroundColor = isDark ? "#1e293b" : "#ffffff";
    const tooltipBorderColor = isDark ? "#475569" : "#e2e8f0";
    const tooltipTextColor = isDark ? "#e2e8f0" : "#0f172a";

    return {
      backgroundColor: backgroundColor,
      textStyle: {
        color: textColor,
      },
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "cross",
        },
        backgroundColor: tooltipBackgroundColor,
        borderColor: tooltipBorderColor,
        borderWidth: 1,
        textStyle: {
          color: tooltipTextColor,
        },
        formatter: (params: any) => {
          const index = params?.[0]?.dataIndex ?? 0;
          const step = steps[index];
          if (!step) {
            return "";
          }

          const lines = [
            `<strong>Itération ${step.iteration}</strong>`,
            `Facteur d'échelle: ${step.scale.toFixed(4)}`,
            `Épargne mensuelle: ${formatCurrency(step.monthlySavings, 0)}`,
            `Capital brut: ${formatCurrency(step.finalCapital, 0)}`,
            `Capital effectif: ${formatCurrency(step.effectiveFinalCapital, 0)}`,
            step.depletionMonths > 0
              ? `${step.depletionMonths} mois manquants`
              : "Horizon respecté",
          ];

          return lines.join("<br/>");
        },
      },
      legend: {
        data: ["Facteur d'échelle", "Épargne mensuelle", "Capital final", "Capital effectif"],
        bottom: 0,
        textStyle: {
          color: textColor,
        },
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "15%",
        top: "10%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: iterations,
        name: "Itération",
        nameLocation: "middle",
        nameGap: 30,
        nameTextStyle: {
          color: textColor,
        },
        axisLine: {
          lineStyle: {
            color: axisLineColor,
          },
        },
        axisLabel: {
          color: textColor,
        },
        splitLine: {
          show: false,
        },
      },
      yAxis: [
        {
          type: "value",
          name: "Facteur / Épargne (€)",
          position: "left",
          nameTextStyle: {
            color: textColor,
          },
          axisLine: {
            lineStyle: {
              color: axisLineColor,
            },
          },
          axisLabel: {
            color: textColor,
            formatter: (value: number) => {
              // Formatter pour le facteur d'échelle (petites valeurs) ou l'épargne (grandes valeurs)
              if (value < 10) {
                return value.toFixed(2);
              }
              return formatCurrency(value as number);
            },
          },
          splitLine: {
            lineStyle: {
              color: splitLineColor,
              type: "dashed",
            },
          },
        },
        {
          type: "value",
          name: "Capital (€)",
          position: "right",
          nameTextStyle: {
            color: textColor,
          },
          axisLine: {
            lineStyle: {
              color: axisLineColor,
            },
          },
          axisLabel: {
            color: textColor,
            formatter: (value: number) => formatCurrency(value as number),
          },
          splitLine: {
            show: false,
          },
        },
      ],
      series: [
        {
          name: "Facteur d'échelle",
          type: "line",
          smooth: true,
          showSymbol: true,
          symbol: "circle",
          symbolSize: 6,
          lineStyle: {
            width: 2,
            color: "#0ea5e9",
          },
          itemStyle: {
            color: "#0ea5e9",
          },
          data: scales,
          yAxisIndex: 0,
        },
        {
          name: "Épargne mensuelle",
          type: "line",
          smooth: true,
          showSymbol: true,
          symbol: "circle",
          symbolSize: 6,
          lineStyle: {
            width: 2,
            color: "#10b981",
            type: "dashed",
          },
          itemStyle: {
            color: "#10b981",
          },
          data: monthlySavings,
          yAxisIndex: 0,
        },
        {
          name: "Capital final",
          type: "line",
          smooth: true,
          showSymbol: true,
          symbol: "circle",
          symbolSize: 6,
          lineStyle: {
            width: 2,
            color: "#2563eb",
          },
          itemStyle: {
            color: "#2563eb",
          },
          data: finalCapitals,
          yAxisIndex: 1,
        },
        {
          name: "Capital effectif",
          type: "line",
          smooth: true,
          showSymbol: true,
          symbol: "circle",
          symbolSize: 6,
          lineStyle: {
            width: 2,
            color: "#f97316",
            type: "dashed",
          },
          itemStyle: {
            color: "#f97316",
          },
          data: effectiveFinalCapitals,
          yAxisIndex: 1,
        },
      ],
    };
  }, [steps, isDark]);

  if (!steps || steps.length === 0) {
    return null;
  }

  return (
    <Card
      sx={{
        background: isDark ? "rgba(30, 41, 59, 0.92)" : "rgba(255, 255, 255, 0.92)",
        borderRadius: "1.25rem",
        boxShadow: isDark 
          ? "0 16px 28px rgba(0, 0, 0, 0.3)" 
          : "0 16px 28px rgba(148, 163, 184, 0.15)",
        border: isDark 
          ? "1px solid rgba(51, 65, 85, 0.5)" 
          : "1px solid rgba(148, 163, 184, 0.2)",
      }}
    >
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Typography
          variant="h5"
          component="h2"
          gutterBottom
          sx={{
            fontSize: { xs: "1.5rem", md: "1.75rem" },
            fontWeight: 700,
            color: isDark ? "#f8fafc" : "#0f172a",
            mb: 0.5,
          }}
        >
          Itérations de l&apos;optimisation
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 3,
            fontSize: "0.95rem",
            lineHeight: 1.5,
            color: isDark ? "#cbd5e1" : "#475569",
          }}
        >
          Évolution du facteur d&apos;échelle, de l&apos;épargne mensuelle et du capital final au fil des itérations
          de l&apos;algorithme de recherche par dichotomie.
        </Typography>
        {chartOption ? (
          <Box
            sx={{
              width: "100%",
              height: { xs: "320px", md: "400px" },
              mt: 2,
              borderRadius: "1rem",
              overflow: "hidden",
            }}
          >
            <ReactECharts option={chartOption} style={{ width: "100%", height: "100%" }} />
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
            Aucune donnée d&apos;itération disponible.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

