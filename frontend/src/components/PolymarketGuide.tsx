import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Target,
  Zap,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";
import type { BettingGuide, PolyTimeframe } from "../lib/chanlun";

interface PolymarketGuideProps {
  guides: BettingGuide[];
  timeframes: PolyTimeframe[];
  timestamp: string;
}

function formatPrice(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const actionStyles: Record<string, { bg: string; border: string; text: string; icon: typeof TrendingUp }> = {
  "\u770B\u6DA8\u4E70\u5165": { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-500", icon: TrendingUp },
  "\u770B\u8DCC\u4E70\u5165": { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", icon: TrendingDown },
  "\u89C2\u671B": { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-500", icon: Minus },
};

export function PolymarketGuide({ guides, timeframes, timestamp }: PolymarketGuideProps) {
  const [expandedTf, setExpandedTf] = useState<string | null>(null);

  if (!guides || guides.length === 0) return null;

  return (
    <div className="chart-section">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-[var(--brand-100)]" />
          <h3 className="section-label">Polymarket 投注指南</h3>
        </div>
        <span className="text-[10px] text-[var(--fg-muted)] font-mono">
          {new Date(timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      <div className="space-y-3">
        {guides.map((guide) => {
          const defaultStyle = { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-500", icon: Minus };
          const style = actionStyles[guide.action] || defaultStyle;
          const ActionIcon = style.icon;
          const tf = timeframes.find((t) => t.timeframe === guide.timeframe);
          const isExpanded = expandedTf === guide.timeframe;
          const hasMarketProb = guide.marketUpProb !== null && guide.marketUpProb !== undefined;

          // Price delta: current price vs Price to Beat
          const priceDelta = guide.basePrice ? guide.currentPrice - guide.basePrice : 0;
          const priceDeltaPct = guide.basePrice ? (priceDelta / guide.basePrice) * 100 : 0;

          return (
            <div
              key={guide.timeframe}
              className={`rounded border ${isExpanded ? style.border : "border-[var(--border-strong)]"} transition-all duration-150`}
            >
              {/* Card header */}
              <button
                onClick={() => setExpandedTf(isExpanded ? null : guide.timeframe)}
                className="w-full text-left p-3 hover:bg-[var(--bg-subtle)] transition-colors rounded-t"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Timeframe */}
                    <div className="flex flex-col items-center shrink-0 w-14">
                      <span className="text-[10px] font-bold tracking-wider uppercase text-[var(--fg-muted)]">
                        {guide.timeframeLabel}
                      </span>
                    </div>

                    <div className="h-8 w-px bg-[var(--border-base)]" />

                    {/* Price to Beat (primary info for all market types) */}
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-[var(--fg-muted)] font-semibold uppercase tracking-wider">
                          开盘基准价
                        </span>
                        <span className="font-mono text-sm font-bold text-[var(--fg-base)]">
                          ${guide.basePrice ? formatPrice(guide.basePrice) : "--"}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] text-[var(--fg-muted)]">当前偏移</span>
                        <span className={`font-mono text-[11px] font-bold ${
                          priceDelta > 0 ? "text-emerald-500" : priceDelta < 0 ? "text-red-400" : "text-[var(--fg-muted)]"
                        }`}>
                          {priceDelta > 0 ? "+" : ""}{formatPrice(priceDelta)}
                          <span className="text-[9px] ml-0.5">
                            ({priceDeltaPct > 0 ? "+" : ""}{priceDeltaPct.toFixed(2)}%)
                          </span>
                        </span>
                      </div>
                      {/* 缠论看涨/看跌概率 */}
                      <div className="flex flex-col">
                        <span className="text-[9px] text-[var(--fg-muted)]">
                          缠论{guide.aboveProb >= 50 ? "看涨" : "看跌"}
                        </span>
                        <span className={`font-mono text-[11px] font-bold ${
                          guide.aboveProb >= 60 ? "text-emerald-500" : guide.aboveProb <= 40 ? "text-red-400" : "text-amber-500"
                        }`}>
                          {guide.aboveProb >= 50 ? guide.aboveProb : (100 - guide.aboveProb)}%
                        </span>
                      </div>
                      {/* 辅助胜率 */}
                      <div className="flex flex-col">
                        <span className="text-[9px] text-[var(--fg-muted)]">辅助胜率</span>
                        <span className={`font-mono text-[11px] font-bold ${
                          guide.winRate >= 55 ? "text-emerald-500" : guide.winRate >= 45 ? "text-amber-500" : "text-red-400"
                        }`}>
                          {guide.winRate}%
                        </span>
                      </div>
                      {/* Market probability if available */}
                      {hasMarketProb && (
                        <div className="flex flex-col">
                          <span className="text-[9px] text-[var(--fg-muted)]">市场概率</span>
                          <div className="flex items-center gap-1.5">
                            <span className="flex items-center gap-0.5">
                              <ArrowUpCircle className="h-3 w-3 text-emerald-500" />
                              <span className="font-mono text-[11px] font-bold text-emerald-500">
                                {guide.marketUpProb?.toFixed(0)}%
                              </span>
                            </span>
                            <span className="flex items-center gap-0.5">
                              <ArrowDownCircle className="h-3 w-3 text-red-400" />
                              <span className="font-mono text-[11px] font-bold text-red-400">
                                {guide.marketDownProb?.toFixed(0)}%
                              </span>
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Action signal */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded ${style.bg}`}>
                      <ActionIcon className={`h-3.5 w-3.5 ${style.text}`} />
                      <span className={`text-xs font-bold font-mono ${style.text}`}>
                        {guide.action}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-[var(--fg-base)]">
                      {guide.winRate}%
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5 text-[var(--fg-muted)]" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-[var(--fg-muted)]" />
                    )}
                  </div>
                </div>
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-3 border-t border-[var(--border-base)]">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
                    <DetailCell
                      label="缠论预测价"
                      value={`$${formatPrice(guide.predictedPrice)}`}
                      sub={`${guide.predictedDelta > 0 ? "+" : ""}${guide.predictedDeltaPct.toFixed(2)}% vs 基准`}
                      subColor={guide.predictedDelta > 0 ? "text-emerald-500" : guide.predictedDelta < 0 ? "text-red-400" : undefined}
                    />
                    <DetailCell
                      label="缠论看涨概率"
                      value={`${guide.aboveProb}%`}
                      sub={guide.aboveProb >= 60 ? "偏多" : guide.aboveProb <= 40 ? "偏空" : "中性"}
                      subColor={guide.aboveProb >= 60 ? "text-emerald-500" : guide.aboveProb <= 40 ? "text-red-400" : undefined}
                    />
                    <DetailCell
                      label="剩余时间"
                      value={guide.hoursLeft < 1 ? `${Math.round(guide.hoursLeft * 60)}m` : `${guide.hoursLeft.toFixed(1)}h`}
                      sub={tf?.endTimeLocal || ""}
                    />
                    <DetailCell
                      label="盘口成交量"
                      value={tf ? formatVolume(tf.volume) : "--"}
                      sub={`${tf?.marketCount ?? 0} 个市场`}
                    />
                  </div>

                  {/* Reason */}
                  <div className={`text-[11px] font-semibold p-2 rounded ${style.bg}`}>
                    <Zap className={`h-3 w-3 inline mr-1 ${style.text}`} />
                    <span className={style.text}>{guide.reason}</span>
                  </div>

                  {/* Factors */}
                  <div className="flex flex-wrap gap-1.5">
                    {guide.factors.map((f, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--bg-subtle)] text-[var(--fg-muted)] border border-[var(--border-base)]"
                      >
                        {f}
                      </span>
                    ))}
                  </div>

                  {/* Links */}
                  <div className="flex flex-wrap gap-3">
                    {tf?.upDownLink && (
                      <a
                        href={tf.upDownLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-[var(--brand-100)] hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        查看 Up/Down 市场
                      </a>
                    )}
                    {tf?.strikeEventSlug && (
                      <a
                        href={`https://polymarket.com/event/${tf.strikeEventSlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-[var(--brand-100)] hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        查看行权价阶梯
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DetailCell({
  label,
  value,
  sub,
  subColor,
}: {
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
}) {
  return (
    <div className="p-2 rounded bg-[var(--bg-subtle)]">
      <div className="text-[9px] font-semibold tracking-wider uppercase text-[var(--fg-muted)] mb-0.5">
        {label}
      </div>
      <div className="font-mono text-sm font-bold text-[var(--fg-base)]">{value}</div>
      {sub && (
        <div className={`text-[10px] mt-0.5 ${subColor || "text-[var(--fg-muted)]"}`}>
          {sub}
        </div>
      )}
    </div>
  );
}

function formatVolume(n: number) {
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return "$" + (n / 1e3).toFixed(0) + "K";
  return "$" + n.toFixed(0);
}
