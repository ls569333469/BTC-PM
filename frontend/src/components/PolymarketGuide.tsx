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
  if (rate >= 80) return "text-emerald-500";
  if (rate >= 60) return "text-amber-500";
  return "text-red-400";
}

function rateBgColor(rate: number) {
  if (rate >= 80) return "bg-emerald-500";
  if (rate >= 60) return "bg-amber-500";
  return "bg-red-400";
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
        <table className="w-full min-w-[850px]">
          <thead>
            <tr className="border-b border-[var(--border-strong)]">
              <th className="text-left text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--fg-muted)] pb-2 pr-3">
                时间周期
              </th>
              <th className="text-left text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--fg-muted)] pb-2 pr-3">
                信号
              </th>
              <th className="text-right text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--fg-muted)] pb-2 pr-3">
                基准价
              </th>
              <th className="text-right text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--fg-muted)] pb-2 pr-3">
                目标价
              </th>
              <th className="text-right text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--fg-muted)] pb-2 pr-3">
                涨跌幅
              </th>
              <th className="text-center text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--fg-muted)] pb-2 pr-3">
                综合评分
              </th>
              <th className="text-center text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--fg-muted)] pb-2 pr-3">
                缠论
              </th>
              <th className="text-center text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--fg-muted)] pb-2 pr-3">
                因子
              </th>
              <th className="text-center text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--fg-muted)] pb-2 pr-3">
                方向状态
              </th>
              <th className="w-8 pb-2"></th>
            </tr>
          </thead>
          <tbody>
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
                <tr
                  key={guide.timeframe}
                  className="border-b border-[var(--border-base)] last:border-b-0 group"
                >
                  {/* Main row wrapped in a single <td colSpan> trick: we use multiple <td> for header row alignment */}
                  <td colSpan={10} className="p-0">
                    {/* Clickable row */}
                    <button
                      onClick={() => setExpandedTf(isExpanded ? null : guide.timeframe)}
                      className="w-full text-left hover:bg-[var(--bg-subtle)] transition-colors"
                    >
                      <div className="grid py-3 pr-3" style={{ gridTemplateColumns: "1fr 1fr 1.2fr 1.2fr 1fr 1.2fr 0.8fr 0.8fr 1fr 32px" }}>
                        {/* 时间周期 */}
                        <div className="flex items-center pl-1">
                          <span className="font-mono text-sm font-bold text-[var(--fg-base)]">
                            {guide.timeframeLabel}
                          </span>
                        </div>

                        {/* 信号 */}
                        <div className="flex items-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${ac.bg} ${ac.color}`}>
                            <ActionIcon className="h-3 w-3" />
                            {ac.label}
                          </span>
                        </div>

                        {/* 基准价 */}
                        <div className="flex items-center justify-end">
                          <span className="font-mono text-sm text-[var(--fg-base)]">
                            ${guide.basePrice ? formatPrice(guide.basePrice) : "--"}
                          </span>
                        </div>

                        {/* 目标价 */}
                        <div className="flex items-center justify-end">
                          <span className="font-mono text-sm font-bold text-[var(--fg-base)]">
                            ${formatPrice(guide.predictedPrice)}
                          </span>
                        </div>

                        {/* 涨跌幅 */}
                        <div className="flex items-center justify-end">
                          <span className={`font-mono text-sm font-bold ${
                            deltaPct > 0 ? "text-emerald-500" : deltaPct < 0 ? "text-red-400" : "text-[var(--fg-muted)]"
                          }`}>
                            {deltaPct > 0 ? "+" : ""}{deltaPct.toFixed(2)}%
                          </span>
                        </div>

                        {/* 综合评分 */}
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="w-10 h-1.5 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                            <div
                              className={`h-full rounded-full ${rateBgColor(compositeRate)}`}
                              style={{ width: `${compositeRate}%` }}
                            />
                          </div>
                          <span className={`font-mono text-sm font-bold ${rateColor(compositeRate)}`}>
                            {compositeRate}
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

                        {/* 方向状态 */}
                        <div className="flex items-center justify-center">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            guide.dirStatus?.includes("同向") ? "bg-emerald-500/10 text-emerald-500" :
                            guide.dirStatus?.includes("矛盾") ? "bg-red-500/10 text-red-400" :
                            "bg-[var(--bg-subtle)] text-[var(--fg-muted)]"
                          }`}>
                            {guide.dirStatus || guide.scoreLevel || "--"}
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
                            label="看涨概率"
                            value={`${guide.aboveProb}%`}
                            sub={guide.aboveProb >= 60 ? "偏多" : guide.aboveProb <= 40 ? "偏空" : "中性"}
                            subColor={guide.aboveProb >= 60 ? "text-emerald-500" : guide.aboveProb <= 40 ? "text-red-400" : undefined}
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
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
