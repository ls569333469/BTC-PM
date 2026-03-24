import { useRef, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { ChartCard } from "./ChartCard";
import { useTheme } from "next-themes";
import type { Prediction } from "../lib/chanlun";

interface WinRateChartProps {
  predictions: Prediction[];
}

export function WinRateChart({ predictions }: WinRateChartProps) {
  const chartRef = useRef<ReactECharts>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const option = useMemo(() => {
    const fgBase = isDark ? "#e7e7e7" : "#212121";
    const fgSubtle = isDark ? "#aaaaaa" : "#7a7a7a";
    const axisLineColor = isDark ? "#aaaaaa" : "#7a7a7a";
    const splitLineColor = isDark ? "rgba(255,255,255,0.12)" : "#f0f0f0";
    const tooltipBg = isDark ? "#171717" : "#fff";
    const tooltipBorder = isDark ? "rgba(255,255,255,0.12)" : "rgba(42,42,42,0.08)";

    const tfs = predictions.map((p) => p.timeframe.toUpperCase());
    const winRates = predictions.map((p) => p.compositeWinRate ?? p.winRate);
    const barColors = predictions.map((p) => {
      const wr = p.compositeWinRate ?? p.winRate;
      return wr >= 80 ? "#10B981" : wr >= 60 ? "#F59E0B" : "#EF4444";
    });

    return {
      animation: true,
      animationDuration: 300,
      animationEasing: "cubicOut" as const,
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
          const p = params[0];
          return (
            '<div style="font-weight:600;font-size:12px;color:' + fgBase + '">' + p.name + "</div>" +
            '<div style="margin-top:4px;font-size:12px;color:' + fgSubtle + '">Win Rate: <span style="color:' + fgBase + ';font-weight:600">' + p.value + "%</span></div>"
          );
        },
      },
      grid: { left: 48, right: 16, top: 8, bottom: 32 },
      xAxis: {
        type: "category" as const,
        data: tfs,
        axisLine: { show: true, lineStyle: { color: axisLineColor, width: 1 } },
        axisTick: { show: false },
        axisLabel: { color: fgSubtle, fontSize: 11, fontWeight: 600 },
      },
      yAxis: {
        type: "value" as const,
        min: 0,
        max: 100,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: fgSubtle, fontSize: 10, formatter: "{value}%" },
        splitLine: { lineStyle: { type: "dashed" as const, color: splitLineColor } },
      },
      series: [
        {
          type: "bar",
          data: winRates.map((v, i) => ({
            value: v,
            itemStyle: { color: barColors[i], borderRadius: [2, 2, 0, 0] },
          })),
          barMaxWidth: 32,
          label: {
            show: true,
            position: "top" as const,
            formatter: "{c}%",
            fontSize: 10,
            fontWeight: 600,
            color: fgSubtle,
          },
          markLine: {
            silent: true,
            symbol: "none",
            lineStyle: { type: "dashed" as const, color: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)", width: 1 },
            label: { show: false },
            data: [{ yAxis: 50 }],
          },
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
    a.download = "btc-win-rate.png";
    a.click();
  };

  const handleExportCsv = () => {
    const headers = ["Timeframe", "WinRate", "Direction", "Confidence"];
    const rows = predictions.map((p) => [p.timeframe, p.compositeWinRate ?? p.winRate, p.direction, p.confidence]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "btc-win-rate-data.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ChartCard
      title="各时间框架胜率"
      subtitle="预测置信度分布"
      onExportPng={handleExportPng}
      onExportCsv={handleExportCsv}
    >
      <ReactECharts
        ref={chartRef}
        option={option}
        style={{ height: "240px" }}
        opts={{ renderer: "canvas" }}
      />
    </ChartCard>
  );
}
