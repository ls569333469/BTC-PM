import { useState } from "react";
import {
  TrendingUp,
  Target,
  ChevronDown,
  ChevronUp,
  Zap,
  ExternalLink,
  Clock,
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

// Micro-Accent Color Logic (Monochrome Ghost style matrix)
function getAccentColor(val: number, isPercent = false) {
  const threshold = isPercent ? 0.5 : 0;
  if (val > threshold) return "text-emerald-400";
  if (val < -threshold) return "text-rose-400";
  return "text-gray-500";
}

function getAdviceColor(advice: string) {
  if (!advice || advice.includes("无明显方向") || advice.includes("震荡") || advice.includes("观望")) return "text-gray-400";
  if (advice.includes("看涨") || advice.includes("买入 YES")) return "text-emerald-400";
  if (advice.includes("看跌") || advice.includes("买入 NO")) return "text-rose-400";
  return "text-gray-400";
}

function getStateColor(state: string) {
  if (!state || state.includes("无" + "概率优势") || state.includes("震荡") || state.includes("不明")) return "text-gray-400";
  if (state.includes("强势") || state.includes("看涨") || state.includes("共振") || state.includes("Edge") || state.includes("同向") || state.includes("多头抵抗")) return "text-emerald-400";
  if (state.includes("压力") || state.includes("看跌") || state.includes("分歧") || state.includes("撕裂") || state.includes("衰竭") || state.includes("下降分形")) return "text-rose-400";
  return "text-gray-400";
}

export function PolymarketGuide({ guides, timeframes, timestamp }: PolymarketGuideProps) {
  const [expandedTf, setExpandedTf] = useState<string | null>(null);

  if (!guides || guides.length === 0) return null;

  return (
    <div className="chart-section bg-[var(--bg-surface)] rounded border border-[var(--border-subtle)] overflow-hidden shadow-xl pb-0 border-b-0">
      <div className="flex items-center justify-between p-4 md:px-6 bg-transparent border-b border-[var(--border-base)]">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-[var(--brand-100)]" />
          <h3 className="section-label text-[var(--fg-base)] tracking-widest uppercase mb-0 pb-0 border-0">Polymarket 投注指南</h3>
        </div>
        <span className="text-[10px] text-[var(--fg-muted)] font-mono tracking-widest">
          数据更新: {new Date(timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[1020px]">
          {/* Header */}
          <div className="grid py-3.5 px-6 text-[10px] font-bold text-[var(--fg-muted)] bg-transparent border-b border-[var(--border-base)] uppercase tracking-widest gap-x-2"
               style={{ gridTemplateColumns: "80px 1.2fr 1.2fr 1fr 140px 20px 1fr 80px 80px 80px 100px 30px" }}>
            <div className="pl-1">时间周期</div>
            <div className="text-right">盘口基准</div>
            <div className="text-right">目标预测</div>
            <div className="text-right">PM套利空间</div>
            <div className="text-center">核心交易指令</div>
            <div className="text-center flex justify-center text-[var(--fg-muted)]">|</div>
            <div className="text-right text-[var(--fg-muted)]">现货锚定</div>
            <div className="text-center">综合评分</div>
            <div className="text-center">缠论</div>
            <div className="text-center">因子</div>
            <div className="text-center">趋势状态</div>
            <div />
          </div>

          <div className="flex flex-col">
              {guides.map((guide) => {
                const compositeRate = guide.compositeWinRate ?? guide.winRate ?? 0;
                const chanlunRate = guide.chanlunWinRate ?? compositeRate;
                const factorRate = guide.factorWinRate ?? 0;
                const deltaPct = guide.predictedDeltaPct ?? 0;
                const isExpanded = expandedTf === guide.timeframe;
                const adviceLabel = guide.pmActionAdvice || "— 无明显方向 (震荡观望)";

                return (
                  <div key={guide.timeframe} className="border-b border-[var(--border-base)] last:border-b-0 group">
                      <button
                        onClick={() => setExpandedTf(isExpanded ? null : guide.timeframe)}
                        className="w-full text-left bg-transparent hover:bg-[var(--bg-subtle)] transition-colors relative z-10 block"
                      >
                        <div className="grid py-4 px-6 items-center gap-x-2" style={{ gridTemplateColumns: "80px 1.2fr 1.2fr 1fr 140px 20px 1fr 80px 80px 80px 100px 30px" }}>
                          
                          {/* 时间周期 */}
                          <div className="font-mono text-[var(--fg-base)] font-semibold text-[14px] flex items-baseline relative">
                            {guide.timeframeLabel.replace('分钟', '分').replace('小时', '时')}
                            <span className="text-[var(--fg-muted)] text-[9px] ml-1 absolute -right-3 top-0.5">TICK</span>
                          </div>

                          {/* PM 盘口基准价 */}
                          <div className="text-right font-mono text-[var(--fg-muted)] text-[13px]">
                            ${guide.basePrice ? formatPrice(guide.basePrice) : "--"}
                          </div>

                          {/* 预测目标价 */}
                          <div className="text-right font-mono text-[var(--fg-muted)] text-[13px]">
                            ${formatPrice(guide.predictedPrice)}
                          </div>

                          {/* PM 盈亏比 (Micro-Accent) */}
                          <div className={`text-right font-mono text-[13px] font-bold ${getAccentColor(deltaPct, true)}`}>
                            {deltaPct > 0 ? "+" : ""}{deltaPct.toFixed(2)}%
                          </div>

                          {/* PM 建议 (Micro-Accent) */}
                          <div className={`text-center font-bold text-[12px] whitespace-nowrap tracking-wide ${getAdviceColor(adviceLabel)}`}>
                            {adviceLabel}
                          </div>
                          
                          <div className="text-center text-[var(--bg-subtle)] text-[10px]">|</div>

                          {/* 实时价格 - 纯白高亮 */}
                          <div className="text-right font-mono text-[var(--fg-base)] text-[14px] font-bold tracking-tight pr-2">
                            ${guide.currentPrice ? formatPrice(guide.currentPrice) : "--"}
                          </div>

                          {/* 综合评分 */}
                          <div className={`text-center font-mono font-bold text-[13px] ${getAccentColor(compositeRate)}`}>
                            {compositeRate > 0 ? "+" : ""}{compositeRate}
                          </div>

                          {/* 缠论 */}
                          <div className={`text-center font-mono text-[13px] font-semibold ${getAccentColor(chanlunRate)}`}>
                            {chanlunRate}
                          </div>

                          {/* 因子 */}
                          <div className={`text-center font-mono text-[13px] font-semibold ${getAccentColor(factorRate)}`}>
                            {factorRate}
                          </div>

                          {/* 状态 */}
                          <div className={`text-center text-[11px] font-medium whitespace-nowrap tracking-widest ${getStateColor(guide.spotMomentumDesc || guide.dirStatus || "")}`}>
                            {guide.spotMomentumDesc || guide.dirStatus || guide.scoreLevel || "--"}
                          </div>

                          {/* Arrow */}
                          <div className="flex justify-end pr-1 text-[var(--fg-muted)]">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </button>

                      {/* Expanded Panel - Adaptive layout without right blank space trap */}
                      {isExpanded && (
                        <div className="px-6 py-6 md:px-8 bg-black/10 border-t border-[var(--border-base)] relative z-20 shadow-inner">
                          <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[var(--border-strong)] pointer-events-none" />
                          
                          <div className="rounded border border-[#1E222A] bg-[#080808] p-5 lg:p-6 shadow-md">
                            <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-8">
                              
                              {/* 左侧：引擎判定核心 */}
                              <div className="md:border-r border-[var(--border-base)] md:pr-8">
                                <div className="flex justify-between items-center mb-4 border-b border-[var(--border-subtle)] pb-3">
                                  <h3 className="text-[var(--fg-base)] font-bold text-[13px] flex items-center gap-2 tracking-wide">
                                    <span className="text-[var(--fg-muted)] font-mono text-[10px] uppercase font-normal mr-1">[核心诊断]</span>
                                    {guide.reason || "系统正在演算..."}
                                  </h3>
                                  <div className="flex items-center gap-1.5 opacity-80 text-[10px] font-mono text-[var(--fg-muted)] bg-[var(--bg-surface)] px-2.5 py-1 rounded shadow-inner uppercase">
                                    <Clock className="w-3 h-3 text-[var(--fg-muted)]" />
                                    TTL: {guide.hoursLeft < 1 ? Math.round(guide.hoursLeft * 60) + "分钟" : guide.hoursLeft.toFixed(1) + "小时"}
                                  </div>
                                </div>
                                <p className="text-[var(--fg-muted)] text-[12px] leading-[2] font-sans tracking-wide">
                                  {guide.engineAnalysis || "暂无极化的概率偏离 Edge。"}
                                </p>
                              </div>

                              {/* 右侧：微观结构 (adjusted to column instead of aggressive blank space) */}
                              <div className="w-full">
                                <div className="text-[10px] text-[var(--fg-muted)] font-bold uppercase tracking-[0.2em] mb-4">/ 盘口微观异动</div>
                                <div className="space-y-2.5">
                                  {guide.factors && guide.factors.length > 0 ? (
                                    guide.factors.map((f: string, i: number) => {
                                      const isBullish = f.includes("多头") || f.includes("金叉") || f.includes("底背离") || f.includes("缩量企稳") || f.includes("买入");
                                      const isBearish = f.includes("空头") || f.includes("死叉") || f.includes("顶背离") || f.includes("放量大跌") || f.includes("超买") || f.includes("卖出") || f.includes("衰竭");
                                      return (
                                        <div
                                          key={`market-${i}`}
                                          className="border-0 bg-transparent px-1 py-1 text-[var(--fg-muted)] text-[11px] flex items-center gap-2 font-mono"
                                        >
                                          <span className="text-gray-500 text-[10px] font-bold">[SYS]</span> 
                                          <span className="flex-1">{f}</span>
                                          {isBullish && <span className="text-emerald-400 text-[12px] font-bold">✓</span>}
                                          {isBearish && <span className="text-rose-400 text-[12px] font-bold">✓</span>}
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <span className="text-[11px] text-[var(--fg-muted)] font-mono italic block bg-transparent border-0 p-1 rounded">
                                      [SYS] 暂无显著异动信号
                                    </span>
                                  )}
                                </div>

                                {/* Action Links */}
                                <div className="flex flex-col gap-2.5 mt-5 pt-4 border-t border-[var(--border-subtle)]">
                                  {guide.upDownLink && (
                                    <a href={guide.upDownLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[10px] font-mono text-[var(--fg-muted)] hover:text-[var(--fg-base)] transition-colors uppercase tracking-widest">
                                      <ExternalLink className="h-3.5 w-3.5" /> 直达 Up/Down 市场核验赔率
                                    </a>
                                  )}
                                  {guide.strikeEventSlug && (
                                    <a href={`https://polymarket.com/event/${guide.strikeEventSlug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[10px] font-mono text-[var(--fg-muted)] hover:text-[var(--fg-base)] transition-colors uppercase tracking-widest">
                                      <ExternalLink className="h-3.5 w-3.5" /> 直达行权阶梯部署阵地
                                    </a>
                                  )}
                                </div>
                              </div>

                            </div>
                          </div>
                        </div>
                      )}
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
