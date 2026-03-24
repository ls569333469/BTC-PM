import type { ChanlunAnalysis } from "../lib/chanlun";
import { ArrowUp, ArrowDown, Minus, TrendingUp, TrendingDown, Activity } from "lucide-react";

interface MarketOverviewProps {
  data: ChanlunAnalysis;
}

function formatPrice(n: number) {
  if (n == null || isNaN(n)) return "--";
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
  bullish: { icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "看涨" },
  bearish: { icon: TrendingDown, color: "text-red-500", bg: "bg-red-500/10", label: "看跌" },
  consolidating: { icon: Activity, color: "text-amber-500", bg: "bg-amber-500/10", label: "盘整" },
  neutral: { icon: Minus, color: "text-[var(--fg-muted)]", bg: "bg-[var(--bg-subtle)]", label: "中性" },
} as const;

export function MarketOverview({ data }: MarketOverviewProps) {
  const { chanlun, indicators, market, currentPrice } = data;
  const trendCfg = trendConfig[chanlun.trend] || trendConfig.neutral;
  const TrendIcon = trendCfg.icon;




  const kpis = [
    {
      label: "BTC 价格",
      value: `$${formatPrice(currentPrice)}`,
      sub: null,
    },
    {
      label: "缠论趋势",
      value: trendCfg.label,
      sub: `强度: ${chanlun.strength}%`,
      customClass: trendCfg.color,
    },
    {
      label: "RSI (1H)",
      value: indicators.rsi != null ? indicators.rsi.toFixed(1) : "--",
      sub: indicators.rsi != null
        ? indicators.rsi > 70 ? "超买" : indicators.rsi < 30 ? "超卖" : "中性"
        : null,
      customClass: indicators.rsi != null
        ? indicators.rsi > 70 ? "text-red-400" : indicators.rsi < 30 ? "text-emerald-500" : undefined
        : undefined,
    },
    {
      label: "综合评分",
      value: data.predictions?.[0]?.compositeWinRate != null
        ? String(data.predictions[0].compositeWinRate)
        : "--",
      sub: data.predictions?.[0]?.scoreLevel || null,
      customClass: data.predictions?.[0]?.compositeWinRate != null
        ? data.predictions[0].compositeWinRate >= 80 ? "text-emerald-500"
          : data.predictions[0].compositeWinRate >= 60 ? "text-amber-500"
          : "text-red-400"
        : undefined,
    },
    {
      label: "资金费率",
      value: market.futures?.funding_rate != null
        ? (Number(market.futures.funding_rate) * 100).toFixed(4) + "%"
        : "--",
      sub: market.futures?.funding_rate != null
        ? Number(market.futures.funding_rate) > 0.01 ? "多头过重" : Number(market.futures.funding_rate) < -0.01 ? "空头过重" : "均衡"
        : null,
    },
    {
      label: "未平仓合约",
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
