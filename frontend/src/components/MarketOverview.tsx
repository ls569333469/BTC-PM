import type { ChanlunAnalysis } from "../lib/chanlun";
import { ArrowUp, ArrowDown, Minus, TrendingUp, TrendingDown, Activity } from "lucide-react";

interface MarketOverviewProps {
  data: ChanlunAnalysis;
}

function formatPrice(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCompact(n: number) {
  if (!n && n !== 0) return "--";
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toFixed(2);
}

const trendConfig = {
  bullish: { icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "BULLISH" },
  bearish: { icon: TrendingDown, color: "text-red-500", bg: "bg-red-500/10", label: "BEARISH" },
  consolidating: { icon: Activity, color: "text-amber-500", bg: "bg-amber-500/10", label: "CONSOLIDATING" },
  neutral: { icon: Minus, color: "text-[var(--fg-muted)]", bg: "bg-[var(--bg-subtle)]", label: "NEUTRAL" },
} as const;

export function MarketOverview({ data }: MarketOverviewProps) {
  const { chanlun, indicators, market, currentPrice } = data;
  const trendCfg = trendConfig[chanlun.trend] || trendConfig.neutral;
  const TrendIcon = trendCfg.icon;

  // Calculate Fear & Greed label
  let fgLabel = "--";
  let fgColor = "text-[var(--fg-muted)]";
  if (market.fearGreed != null) {
    const fg = Number(market.fearGreed);
    if (fg >= 80) { fgLabel = "Extreme Greed"; fgColor = "text-red-400"; }
    else if (fg >= 60) { fgLabel = "Greed"; fgColor = "text-amber-500"; }
    else if (fg >= 40) { fgLabel = "Neutral"; fgColor = "text-[var(--fg-muted)]"; }
    else if (fg >= 20) { fgLabel = "Fear"; fgColor = "text-emerald-500"; }
    else { fgLabel = "Extreme Fear"; fgColor = "text-emerald-500"; }
  }

  const kpis = [
    {
      label: "BTC Price",
      value: `$${formatPrice(currentPrice)}`,
      sub: null,
    },
    {
      label: "Chanlun Trend",
      value: trendCfg.label,
      sub: `Strength: ${chanlun.strength}%`,
      customClass: trendCfg.color,
    },
    {
      label: "RSI (1H)",
      value: indicators.rsi != null ? indicators.rsi.toFixed(1) : "--",
      sub: indicators.rsi != null
        ? indicators.rsi > 70 ? "Overbought" : indicators.rsi < 30 ? "Oversold" : "Neutral"
        : null,
      customClass: indicators.rsi != null
        ? indicators.rsi > 70 ? "text-red-400" : indicators.rsi < 30 ? "text-emerald-500" : undefined
        : undefined,
    },
    {
      label: "Fear & Greed",
      value: market.fearGreed != null ? String(Math.round(Number(market.fearGreed))) : "--",
      sub: fgLabel,
      customClass: fgColor,
    },
    {
      label: "Funding Rate",
      value: market.futures?.funding_rate != null
        ? (Number(market.futures.funding_rate) * 100).toFixed(4) + "%"
        : "--",
      sub: market.futures?.funding_rate != null
        ? Number(market.futures.funding_rate) > 0.01 ? "Long Heavy" : Number(market.futures.funding_rate) < -0.01 ? "Short Heavy" : "Balanced"
        : null,
    },
    {
      label: "Open Interest",
      value: market.futures?.open_interest != null
        ? "$" + formatCompact(Number(market.futures.open_interest))
        : "--",
      sub: null,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className="p-4 rounded border border-[var(--border-strong)] transition-colors duration-150 hover:bg-[var(--bg-subtle)]"
        >
          <div className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--fg-muted)] mb-1.5">
            {kpi.label}
          </div>
          <div className={`font-mono text-lg font-bold leading-tight ${kpi.customClass || "text-[var(--fg-base)]"}`}>
            {kpi.value}
          </div>
          {kpi.sub && (
            <div className="text-[10px] text-[var(--fg-muted)] mt-0.5">{kpi.sub}</div>
          )}
        </div>
      ))}
    </div>
  );
}
