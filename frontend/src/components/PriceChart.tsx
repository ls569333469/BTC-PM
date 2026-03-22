import { useRef, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { ChartCard } from "./ChartCard";
import { useTheme } from "next-themes";
import type { BiPoint, ZhongShu } from "../lib/chanlun";

interface PriceChartProps {
  priceHistory: { time: string; price: number }[];
  bis: BiPoint[];
  zhongshu: ZhongShu[];
  currentPrice: number;
}

export function PriceChart({ priceHistory, bis, zhongshu, currentPrice }: PriceChartProps) {
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

    const times = priceHistory.map((p) => {
      const d = new Date(typeof p.time === "number" ? p.time * 1000 : p.time);
      return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    });
    const prices = priceHistory.map((p) => p.price);

    // ZhongShu zones as markArea
    const markAreaData = zhongshu.map((zs) => [
      {
        yAxis: zs.low,
        itemStyle: {
          color: isDark ? "rgba(99, 102, 241, 0.08)" : "rgba(99, 102, 241, 0.06)",
        },
      },
      { yAxis: zs.high },
    ]);

    // Bi points as markPoint
    const markPointData = bis.map((bi) => {
      const idx = Math.min(bi.index, priceHistory.length - 1);
      return {
        coord: [times[idx] || "", bi.price],
        value: bi.type === "top" ? "T" : "B",
        symbol: bi.type === "top" ? "triangle" : "pin",
        symbolSize: 8,
        symbolRotate: bi.type === "top" ? 0 : 180,
        itemStyle: {
          color: bi.type === "top" ? "#EF4444" : "#10B981",
        },
        label: { show: false },
      };
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
          const title = params[0].axisValueLabel || params[0].name || "";
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
      grid: { left: 64, right: 16, top: 16, bottom: 32 },
      xAxis: {
        type: "category" as const,
        data: times,
        axisLine: { show: true, lineStyle: { color: axisLineColor, width: 1 } },
        axisTick: { show: false },
        axisLabel: {
          color: fgSubtle,
          fontSize: 10,
          interval: Math.floor(times.length / 6),
        },
      },
      yAxis: {
        type: "value" as const,
        scale: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: fgSubtle,
          fontSize: 10,
          formatter: (v: number) => "$" + v.toLocaleString(),
        },
        splitLine: { lineStyle: { type: "dashed" as const, color: splitLineColor } },
      },
      series: [
        {
          name: "BTC Price",
          type: "line",
          data: prices,
          symbol: "none",
          smooth: false,
          lineStyle: { width: 1.5, color: "#EA75B2" },
          areaStyle: {
            color: {
              type: "linear" as const,
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: isDark ? "rgba(234, 117, 178, 0.15)" : "rgba(234, 117, 178, 0.1)" },
                { offset: 1, color: "rgba(234, 117, 178, 0)" },
              ],
            },
          },
          markArea: { silent: true, data: markAreaData },
          markPoint: { data: markPointData, animation: false },
          markLine: {
            silent: true,
            symbol: "none",
            lineStyle: { type: "dashed" as const, color: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)", width: 1 },
            label: {
              formatter: "${c}",
              fontSize: 10,
              color: fgSubtle,
            },
            data: [{ yAxis: currentPrice, label: { formatter: "$" + currentPrice.toLocaleString() } }],
          },
        },
      ],
    };
  }, [priceHistory, bis, zhongshu, currentPrice, isDark]);

  const handleExportPng = () => {
    const chart = chartRef.current?.getEchartsInstance();
    if (!chart) return;
    const url = chart.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: isDark ? "#101010" : "#fff" });
    const a = document.createElement("a");
    a.href = url;
    a.download = "btc-chanlun-price.png";
    a.click();
  };

  const handleExportCsv = () => {
    const headers = ["Time", "Price"];
    const rows = priceHistory.map((p) => [p.time, p.price]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "btc-price-data.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ChartCard
      title="BTC Price with Chanlun Overlay"
      subtitle="Bi (stroke) points + ZhongShu (pivot) zones"
      onExportPng={handleExportPng}
      onExportCsv={handleExportCsv}
    >
      <ReactECharts
        ref={chartRef}
        option={option}
        style={{ height: "340px" }}
        opts={{ renderer: "canvas" }}
      />
    </ChartCard>
  );
}
