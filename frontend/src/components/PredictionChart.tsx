import { useRef, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { ChartCard } from "./ChartCard";
import { useTheme } from "next-themes";
import type { Prediction } from "../lib/chanlun";

interface PredictionChartProps {
  predictions: Prediction[];
}

export function PredictionChart({ predictions }: PredictionChartProps) {
  const chartRef = useRef<ReactECharts>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const option = useMemo(() => {
    const tooltipBg = isDark ? "#171717" : "#fff";
    const tooltipBorder = isDark ? "rgba(255,255,255,0.12)" : "rgba(42,42,42,0.08)";
    const fgBase = isDark ? "#e7e7e7" : "#212121";
    const fgSubtle = isDark ? "#aaaaaa" : "#7a7a7a";
    const axisLineColor = isDark ? "#aaaaaa" : "#7a7a7a";
    const splitLineColor = isDark ? "rgba(255,255,255,0.12)" : "#f0f0f0";

    const tfs = predictions.map((p) => p.timeframe.toUpperCase());
    const targets = predictions.map((p) => p.targetPrice);
    const supports = predictions.map((p) => p.support);
    const resistances = predictions.map((p) => p.resistance);
    const currents = predictions.map((p) => p.currentPrice);

    return {
      animation: true,
      animationDuration: 300,
      animationEasing: "cubicOut" as const,
      color: ["#EA75B2", "#10B981", "#EF4444", "#6366F1"],
      tooltip: {
        trigger: "axis" as const,
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        borderWidth: 1,
        padding: [8, 12],
        textStyle: { color: fgBase, fontSize: 12 },
        transitionDuration: 0.15,
        extraCssText: "border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0," + (isDark ? "0.4" : "0.08") + ");",
        formatter: function (params: any) {
          if (!Array.isArray(params)) params = [params];
          const title = params[0].name || "";
          const header = '<div style="margin-bottom:4px"><span style="color:' + fgBase + ';font-weight:600;font-size:12px">' + title + "</span></div>";
          const rows = params
            .map(function (p: any) {
              return (
                '<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:3px">' +
                '<div style="display:flex;align-items:center;gap:6px;color:' + fgSubtle + ';font-size:12px">' +
                '<span style="display:inline-block;width:12px;height:2.5px;border-radius:1px;background:' + p.color + '"></span>' +
                "<span>" + p.seriesName + "</span></div>" +
                '<span style="color:' + fgBase + ';font-weight:600;font-size:12px">$' + Number(p.value).toLocaleString() + "</span></div>"
              );
            })
            .join("");
          return header + rows;
        },
      },
      legend: {
        type: "plain" as const,
        bottom: 0,
        icon: "roundRect",
        itemWidth: 12,
        itemHeight: 3,
        textStyle: { color: fgSubtle, fontSize: 11 },
      },
      grid: { left: 64, right: 16, top: 16, bottom: 64 },
      xAxis: {
        type: "category" as const,
        data: tfs,
        axisLine: { show: true, lineStyle: { color: axisLineColor, width: 1 } },
        axisTick: { show: false },
        axisLabel: { color: fgSubtle, fontSize: 11, fontWeight: 600 },
      },
      yAxis: {
        type: "value" as const,
        scale: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: fgSubtle, fontSize: 10, formatter: (v: number) => "$" + v.toLocaleString() },
        splitLine: { lineStyle: { type: "dashed" as const, color: splitLineColor } },
      },
      series: [
        {
          name: "Target",
          type: "line",
          data: targets,
          symbol: "circle",
          symbolSize: 6,
          lineStyle: { width: 1.5 },
        },
        {
          name: "Support",
          type: "line",
          data: supports,
          symbol: "none",
          lineStyle: { width: 1, type: "dashed" as const },
        },
        {
          name: "Resistance",
          type: "line",
          data: resistances,
          symbol: "none",
          lineStyle: { width: 1, type: "dashed" as const },
        },
        {
          name: "Current",
          type: "line",
          data: currents,
          symbol: "none",
          lineStyle: { width: 1, type: "dotted" as const },
        },
      ],
    };
  }, [predictions, isDark]);

  const handleExportPng = () => {
    const chart = chartRef.current?.getEchartsInstance();
    if (!chart) return;
    const url = chart.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: isDark ? "#101010" : "#fff" });
    const a = document.createElement("a");
    a.href = url;
    a.download = "btc-prediction-chart.png";
    a.click();
  };

  const handleExportCsv = () => {
    const headers = ["Timeframe", "Target", "Support", "Resistance", "Current"];
    const rows = predictions.map((p) => [p.timeframe, p.targetPrice, p.support, p.resistance, p.currentPrice]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "btc-predictions-data.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ChartCard
      title="Price Target Projection"
      subtitle="Target, Support, Resistance by timeframe"
      onExportPng={handleExportPng}
      onExportCsv={handleExportCsv}
    >
      <ReactECharts
        ref={chartRef}
        option={option}
        style={{ height: "300px" }}
        opts={{ renderer: "canvas" }}
      />
    </ChartCard>
  );
}
