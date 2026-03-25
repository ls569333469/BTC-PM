import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  Zap,
  ExternalLink,
} from "lucide-react";
import type { BettingGuide, PolyTimeframe } from "../lib/chanlun";

interface PolymarketGuideProps {
  guides: BettingGuide[];
  timeframes: PolyTimeframe[];
  timestamp: string;
}

function formatPrice(n: number) {
  if (n == null || isNaN(n)) return "--";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const actionConfig: Record<string, { icon: typeof TrendingUp; color: string; bg: string; label: string }> = {
  "看涨买入": { icon: ArrowUp, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "做多" },
  "看跌买入": { icon: ArrowDown, color: "text-red-500", bg: "bg-red-500/10", label: "做空" },
  "观望": { icon: Minus, color: "text-amber-500", bg: "bg-amber-500/10", label: "观望" },
};

function rateColor(rate: number) {
  const a = Math.abs(rate);
  if (a >= 60) return rate > 0 ? "text-emerald-500" : "text-red-400";
  if (a >= 35) return rate > 0 ? "text-emerald-500" : "text-red-400";
  return "text-amber-500";
}

function rateBgColor(rate: number) {
  if (rate > 35) return "bg-emerald-500";
  if (rate < -35) return "bg-red-400";
  return "bg-amber-500";
}

function formatVolume(n: number) {
  if (n == null || isNaN(n)) return "--";
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return "$" + (n / 1e3).toFixed(0) + "K";
  return "$" + n.toFixed(0);
}

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

      <div className="overflow-x-auto -mx-6 px-6">
        <div className="grid mb-1 pb-1 border-b border-[var(--border-base)]" style={{ gridTemplateColumns: "5.4fr 5.2fr 32px" }}>
          <div className="text-center text-[11px] font-bold text-rose-400/90 border-r border-[var(--border-base)] pr-4">
            🎯 Polymarket 盘口结算预期
          </div>
          <div className="text-center text-[11px] font-bold text-amber-500/90 pl-4">
            📊 当前价格技术面追踪 (5分钟刷新)
          </div>
          <div />
        </div>

        <div className="grid pb-2 border-b border-[var(--border-strong)]" style={{ gridTemplateColumns: "0.8fr 1.2fr 1.2fr 1.2fr 1.2fr 1.2fr 1.2fr 0.8fr 0.8fr 1.2fr 32px" }}>
          <span className="text-left text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--fg-muted)] pl-1">时间周期</span>
          <span className="text-right text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--fg-muted)]">盘口基准</span>
          <span className="text-right text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--fg-muted)] pr-2">目标价</span>
          <span className="text-right text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--fg-muted)] pr-6">PM盈亏比</span>
          <span className="text-center text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--fg-muted)]">PM建议</span>
          
          <span className="text-right text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--fg-muted)] border-l border-[var(--border-subtle)] pl-4 pr-4">实时价格</span>
          <span className="text-center text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--fg-muted)]">综合评分</span>
          <span className="text-center text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--fg-muted)]">缠论</span>
          <span className="text-center text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--fg-muted)]">因子</span>
          <span className="text-center text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--fg-muted)]">状态</span>
          <span className="w-8"></span>
        </div>
        
        <div className="flex flex-col">
            {guides.map((guide) => {
              const ac = actionConfig[guide.action] || actionConfig["观望"];
              const ActionIcon = ac.icon;
              const compositeRate = guide.compositeWinRate ?? guide.winRate;
              const chanlunRate = guide.chanlunWinRate ?? compositeRate;
              const factorRate = guide.factorWinRate ?? 0;
              const deltaPct = guide.predictedDeltaPct ?? 0;
              const isExpanded = expandedTf === guide.timeframe;
              const tf = timeframes.find((t) => t.timeframe === guide.timeframe);

              return (
                <div
                  key={guide.timeframe}
                  className="border-b border-[var(--border-base)] last:border-b-0 group"
                >
                    <button
                      onClick={() => setExpandedTf(isExpanded ? null : guide.timeframe)}
                      className="w-full text-left hover:bg-[var(--bg-subtle)] transition-colors"
                    >
                      <div className="grid py-3 items-center" style={{ gridTemplateColumns: "0.8fr 1.2fr 1.2fr 1.2fr 1.2fr 1.2fr 1.2fr 0.8fr 0.8fr 1.2fr 32px" }}>
                        {/* 时间周期 */}
                        <div className="flex items-center pl-1">
                          <span className="font-mono text-sm font-bold text-[var(--fg-base)]">
                            {guide.timeframeLabel}
                          </span>
                        </div>

                        {/* PM 盘口基准价 */}
                        <div className="flex items-center justify-end">
                          <span className="font-mono text-sm text-[var(--fg-base)]">
                            ${guide.basePrice ? formatPrice(guide.basePrice) : "--"}
                          </span>
                        </div>

                        {/* 预测目标价 */}
                        <div className="flex items-center justify-end">
                          <span className="font-mono text-sm font-bold text-[var(--fg-base)]">
                            ${formatPrice(guide.predictedPrice)}
                          </span>
                        </div>

                        {/* PM 盈亏比 */}
                        <div className="flex items-center justify-end pr-6">
                          <span className={`font-mono text-sm font-bold ${
                            deltaPct > 0 ? "text-emerald-500" : deltaPct < 0 ? "text-red-400" : "text-[var(--fg-muted)]"
                          }`}>
                            {deltaPct > 0 ? "+" : ""}{deltaPct.toFixed(2)}%
                          </span>
                        </div>

                        {/* PM 建议 */}
                        <div className="flex items-center justify-center">
                          {guide.pmActionAdvice ? (
                            <span className={`inline-flex items-center gap-1 font-semibold text-[11px] ${
                              guide.pmActionAdvice.includes("胜算") || guide.pmActionAdvice.includes("优势") ? "text-emerald-500" :
                              guide.pmActionAdvice.includes("风险") || guide.pmActionAdvice.includes("劣势") ? "text-red-400" :
                              "text-amber-500"
                            }`}>
                              {guide.pmActionAdvice}
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${ac.bg} ${ac.color}`}>
                              <ActionIcon className="h-3 w-3" />
                              {ac.label}
                            </span>
                          )}
                        </div>
                        
                        {/* 实时价格 (New) */}
                        <div className="flex items-center justify-end pr-4 border-l border-[var(--border-subtle)] pl-4">
                          <span className="font-mono text-sm font-semibold text-amber-500/80">
                            ${guide.currentPrice ? formatPrice(guide.currentPrice) : "--"}
                          </span>
                        </div>

                        {/* 综合评分 */}
                        <div className="flex items-center justify-center gap-1.5 pl-2">
                          <div className="w-8 h-1.5 rounded-full bg-[var(--bg-subtle)] overflow-hidden hidden sm:block">
                            <div
                              className={`h-full rounded-full ${rateBgColor(compositeRate)}`}
                              style={{ width: `${Math.min(Math.abs(compositeRate), 100)}%` }}
                            />
                          </div>
                          <span className={`font-mono text-sm font-bold ${rateColor(compositeRate)}`}>
                            {compositeRate > 0 ? "+" : ""}{compositeRate}
                          </span>
                        </div>

                        {/* 缠论 */}
                        <div className="flex items-center justify-center">
                          <span className={`font-mono text-xs font-bold ${rateColor(chanlunRate)}`}>
                            {chanlunRate}
                          </span>
                        </div>

                        {/* 因子 */}
                        <div className="flex items-center justify-center">
                          <span className={`font-mono text-xs font-bold ${rateColor(factorRate)}`}>
                            {factorRate}
                          </span>
                        </div>

                        {/* 状态 */}
                        <div className="flex items-center justify-center">
                          <span className={`text-[10px] font-semibold px-1 py-0.5 rounded text-center leading-tight ${
                            guide.spotMomentumDesc?.includes("强势看涨") ? "bg-emerald-500/10 text-emerald-500" :
                            guide.spotMomentumDesc?.includes("压力") || guide.spotMomentumDesc?.includes("分歧") ? "bg-red-500/10 text-red-400" :
                            guide.spotMomentumDesc?.includes("震荡") || guide.spotMomentumDesc?.includes("多头抵抗") ? "bg-amber-500/10 text-amber-500" :
                            guide.dirStatus?.includes("同向") ? "bg-emerald-500/10 text-emerald-500" :
                            guide.dirStatus?.includes("矛盾") ? "bg-red-500/10 text-red-400" :
                            "bg-[var(--bg-subtle)] text-[var(--fg-muted)]"
                          }`}>
                            {guide.spotMomentumDesc || guide.dirStatus || guide.scoreLevel || "--"}
                          </span>
                        </div>

                        {/* 展开箭头 */}
                        <div className="flex items-center justify-center">
                          {isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5 text-[var(--fg-muted)]" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 text-[var(--fg-muted)]" />
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Expanded detail panel */}
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3 border-t border-[var(--border-base)] bg-[var(--bg-subtle)]/30">
                        {/* Detail grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
                          <DetailCell
                            label="评分等级"
                            value={guide.scoreLevel || "--"}
                            sub={guide.scoreDesc || ""}
                          />
                          <DetailCell
                            label="系统综合预测价差"
                            value={`${guide.predictedDelta > 0 ? "+" : ""}$${formatPrice(Math.abs(guide.predictedDelta))}`}
                            sub={`${guide.predictedDeltaPct > 0 ? "+" : ""}${guide.predictedDeltaPct.toFixed(2)}% vs 基准`}
                            subColor={guide.predictedDelta > 0 ? "text-emerald-500" : guide.predictedDelta < 0 ? "text-red-400" : undefined}
                          />
                          <DetailCell
                            label="缠论评分"
                            value={`${chanlunRate > 0 ? "+" : ""}${chanlunRate}`}
                            sub={chanlunRate > 35 ? "看涨" : chanlunRate < -35 ? "看跌" : "横盘"}
                            subColor={chanlunRate > 35 ? "text-emerald-500" : chanlunRate < -35 ? "text-red-400" : undefined}
                          />
                          <DetailCell
                            label="剩余时间"
                            value={guide.hoursLeft < 1 ? `${Math.round(guide.hoursLeft * 60)}分钟` : `${guide.hoursLeft.toFixed(1)}小时`}
                            sub={guide.endTimeLocal || ""}
                          />
                        </div>

                        {/* Reason */}
                        <div className={`text-[11px] font-semibold p-2 rounded ${ac.bg}`}>
                          <Zap className={`h-3 w-3 inline mr-1 ${ac.color}`} />
                          <span className={ac.color}>{guide.reason}</span>
                        </div>

                        {/* Factors */}
                        {guide.factors && guide.factors.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {guide.factors.map((f: string, i: number) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--bg-subtle)] text-[var(--fg-muted)] border border-[var(--border-base)]"
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Links */}
                        <div className="flex flex-wrap gap-3">
                          {guide.upDownLink && (
                            <a
                              href={guide.upDownLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] text-[var(--brand-100)] hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              查看 Up/Down 市场
                            </a>
                          )}
                          {guide.strikeEventSlug && (
                            <a
                              href={`https://polymarket.com/event/${guide.strikeEventSlug}`}
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
