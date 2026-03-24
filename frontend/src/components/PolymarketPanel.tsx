import { useSearchPolymarket, usePredictionMarketPolymarketRanking } from "../lib/api";
import { Skeleton } from "./ui/skeleton";
import { ExternalLink } from "lucide-react";

interface PolymarketPanelProps {
  trend: "bullish" | "bearish" | "consolidating" | "neutral";
}

function formatCompact(n: number) {
  if (!n && n !== 0) return "--";
  if (Math.abs(n) >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
  if (Math.abs(n) >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
  return "$" + n.toFixed(0);
}

export function PolymarketPanel({ trend }: PolymarketPanelProps) {
  const { data: searchData, isLoading: searchLoading } = useSearchPolymarket({ q: "bitcoin BTC price" });
  const { data: rankingData, isLoading: rankLoading } = usePredictionMarketPolymarketRanking({
    sort_by: "notional_volume_usd",
    limit: 10,
  });

  const isLoading = searchLoading || rankLoading;

  // Extract relevant BTC markets from search or ranking
  const markets: Array<{
    title: string;
    volume: number;
    yesPrice?: number;
    noPrice?: number;
    slug?: string;
  }> = [];

  // Try search results first
  if (searchData) {
    const items = Array.isArray(searchData?.data) ? searchData.data : Array.isArray(searchData) ? searchData : [];
    for (const event of items) {
      const eventMarkets = event?.markets || [];
      for (const m of eventMarkets) {
        const title = typeof m.question === "string" ? m.question : typeof m.title === "string" ? m.title : typeof event.title === "string" ? event.title : "";
        if (!title) continue;
        markets.push({
          title,
          volume: Number(m.volume || m.notional_volume_usd || 0),
          yesPrice: m.side_a?.price != null ? Number(m.side_a.price) : m.yes_price != null ? Number(m.yes_price) : undefined,
          noPrice: m.side_b?.price != null ? Number(m.side_b.price) : m.no_price != null ? Number(m.no_price) : undefined,
          slug: m.slug || m.market_slug || "",
        });
      }
    }
  }

  // If no search results, try ranking
  if (markets.length === 0 && rankingData) {
    const items = Array.isArray(rankingData?.data) ? rankingData.data : Array.isArray(rankingData) ? rankingData : [];
    for (const m of items) {
      const title = typeof m.question === "string" ? m.question : typeof m.title === "string" ? m.title : "";
      const lTitle = title.toLowerCase();
      if (lTitle.includes("bitcoin") || lTitle.includes("btc") || lTitle.includes("crypto")) {
        markets.push({
          title,
          volume: Number(m.volume || m.notional_volume_usd || 0),
          yesPrice: m.side_a?.price != null ? Number(m.side_a.price) : undefined,
          noPrice: m.side_b?.price != null ? Number(m.side_b.price) : undefined,
          slug: m.slug || m.market_slug || "",
        });
      }
    }
  }

  // Betting recommendation based on Chanlun trend
  const recommendation = trend === "bullish"
    ? { action: "买入看涨", desc: "缠论趋势看涨 — 建议买入BTC看涨合约", color: "text-emerald-500", bg: "bg-emerald-500/10" }
    : trend === "bearish"
    ? { action: "买入看跌", desc: "缠论趋势看跌 — 建议买入BTC看跌合约", color: "text-red-500", bg: "bg-red-500/10" }
    : { action: "观望", desc: "市场盘整中 — 等待缠论突破信号", color: "text-amber-500", bg: "bg-amber-500/10" };

  return (
    <div className="chart-section">
      <h3 className="section-label mb-1">Polymarket 投注指南</h3>
      <p className="text-[10px] text-[var(--fg-muted)] mb-4">
        基于缠论分析的预测市场持仓建议
      </p>

      {/* Recommendation banner */}
      <div className={`flex items-center gap-3 p-3 rounded mb-4 border ${recommendation.bg} border-[var(--border-base)]`}>
        <span className={`text-sm font-bold font-mono ${recommendation.color}`}>
          {recommendation.action}
        </span>
        <span className="text-xs text-[var(--fg-subtle)]">{recommendation.desc}</span>
      </div>

      {/* Markets list */}
      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded" />
          ))}
        </div>
      ) : markets.length === 0 ? (
        <p className="text-xs text-[var(--fg-muted)] py-4 text-center">
          暂无BTC相关的Polymarket活跃市场
        </p>
      ) : (
        <div className="space-y-2">
          {markets.slice(0, 5).map((m, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded border border-[var(--border-base)] transition-colors duration-150 hover:bg-[var(--bg-subtle)]"
            >
              <div className="min-w-0 flex-1 mr-3">
                <p className="text-xs text-[var(--fg-base)] leading-relaxed truncate">
                  {m.title}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] text-[var(--fg-muted)]">
                    量: {formatCompact(m.volume)}
                  </span>
                  {m.yesPrice != null && (
                    <span className="text-[10px] font-mono text-emerald-500">
                      看涨: {(m.yesPrice * 100).toFixed(0)}c
                    </span>
                  )}
                  {m.noPrice != null && (
                    <span className="text-[10px] font-mono text-red-400">
                      看跌: {(m.noPrice * 100).toFixed(0)}c
                    </span>
                  )}
                </div>
              </div>
              {m.slug && (
                <a
                  href={`https://polymarket.com/event/${m.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 toolbar-btn"
                  title="在Polymarket查看"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
