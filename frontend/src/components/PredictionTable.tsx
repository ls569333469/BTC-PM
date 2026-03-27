import type { Prediction, BettingGuide } from "../lib/chanlun";
import { ArrowUp, ArrowDown, Minus, Target, Lock } from "lucide-react";

interface PredictionTableProps {
  predictions: Prediction[];
  currentPrice: number;
  bettingGuides?: BettingGuide[];
}

const directionConfig = {
  up: { icon: ArrowUp, color: "text-emerald-400", bg: "bg-emerald-400/10", label: "看涨" },
  down: { icon: ArrowDown, color: "text-rose-400", bg: "bg-rose-400/10", label: "看跌" },
  sideways: { icon: Minus, color: "text-gray-400", bg: "bg-gray-400/10", label: "观望" },
} as const;

function formatPrice(n: number) {
  if (n == null) return "--";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function scoreColor(v: number) {
  if (v > 0) return "text-emerald-400";
  if (v < 0) return "text-rose-400";
  return "text-gray-400";
}

function scoreBg(v: number) {
  if (v > 0) return "#34D399";
  if (v < 0) return "#FB7185";
  return "#9CA3AF";
}

function findMatchingGuide(tf: string, guides: BettingGuide[]): BettingGuide | null {
  if (!guides || guides.length === 0) return null;
  return guides.find(g => g.timeframe.toLowerCase() === tf.toLowerCase()) || null;
}

export function PredictionTable({ predictions, currentPrice, bettingGuides }: PredictionTableProps) {
  const hasGuides = bettingGuides && bettingGuides.length > 0;

  // Use fr units for dynamic distribution across the full width
  const cols = hasGuides
    ? "60px 80px 1.2fr 1.2fr 1fr 60px 60px 120px 1fr 1fr"
    : "60px 80px 1.2fr 1fr 60px 60px 120px 1fr 1fr";

  return (
    <div className="chart-section">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-label">多时间框架预测</h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold tracking-[0.08em] uppercase text-[var(--fg-muted)]">
            当前价格
          </span>
          <span className="font-mono text-sm font-bold text-[var(--fg-base)]">
            ${formatPrice(currentPrice)}
          </span>
        </div>
      </div>

      <div className="w-full overflow-x-auto -mx-4 px-4 md:-mx-6 md:px-6 pb-2">
        <div className="min-w-[850px]">
          {/* Header */}
          <div
            className="grid items-end pb-2 border-b border-[var(--border-strong)] gap-x-3"
            style={{ gridTemplateColumns: cols }}
          >
            <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-[var(--fg-muted)]">周期</span>
            <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-[var(--fg-muted)]">信号</span>
            {hasGuides && (
              <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-[var(--fg-muted)] text-right inline-flex items-center justify-end gap-1">
                <Target className="h-3 w-3" />现货基准价
              </span>
            )}
            <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-[var(--fg-muted)] text-right">目标价</span>
            <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-[var(--fg-muted)] text-right">现货涨跌幅</span>
            <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-[var(--fg-muted)] text-center">缠论</span>
            <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-[var(--fg-muted)] text-center">六因子</span>
            <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-[var(--fg-muted)] text-center">综合评分</span>
            <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-[var(--fg-muted)] text-right">支撑位</span>
            <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-[var(--fg-muted)] text-right">阻力位</span>
          </div>

        {/* Rows */}
        {predictions.map((pred) => {
          const cfg = directionConfig[pred.direction];
          const Icon = cfg.icon;
          const guide = hasGuides ? findMatchingGuide(pred.timeframe, bettingGuides!) : null;
          const composite = pred.compositeWinRate ?? pred.winRate;
          const chanlun = pred.chanlunWinRate ?? 0;
          const factor = pred.factorWinRate ?? 0;

          return (
            <div
              key={pred.timeframe}
              className="grid items-center py-3 gap-x-3 border-b border-[var(--border-base)] last:border-b-0 hover:bg-[var(--bg-subtle)] transition-colors"
              style={{ gridTemplateColumns: cols }}
            >
              {/* 周期 */}
              <div className="flex items-center gap-1">
                <span className="font-mono text-[13px] font-bold text-[var(--fg-base)]">
                  {pred.timeframe.toUpperCase()}
                </span>
                {pred.isDeadZone && (
                  <div className="group relative">
                    <Lock className="w-3 h-3 text-[var(--fg-muted)] opacity-70" />
                    <div className="absolute left-1/2 -top-7 -translate-x-1/2 px-2 py-1 bg-black/80 text-[10px] text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                      临近结算锁区
                    </div>
                  </div>
                )}
              </div>

              {/* 信号 */}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[12px] font-bold ${cfg.bg} ${cfg.color} w-fit`}>
                <Icon className="h-3 w-3" />
                {cfg.label}
              </span>

              {/* 基准价 — 显示引擎参考现货价，与目标价/涨跌幅/信号保持一致 */}
              {hasGuides && (
                <div className="text-right">
                  <span className="font-mono text-[13px] text-[var(--fg-muted)] font-semibold">
                    ${formatPrice(pred.currentPrice)}
                  </span>
                </div>
              )}

              {/* 目标价 */}
              <span className="font-mono text-[13px] font-semibold text-[var(--fg-base)] text-right">
                ${formatPrice(pred.targetPrice)}
              </span>

              {/* 涨跌幅 — 与引擎信号方向一致 */}
              <span className={`font-mono text-[13px] font-semibold text-right ${
                pred.priceChangePct > 0 ? "text-emerald-400" : pred.priceChangePct < 0 ? "text-rose-400" : "text-[var(--fg-muted)]"
              }`}>
                {pred.priceChangePct > 0 ? "+" : ""}{pred.priceChangePct}%
              </span>

              {/* 缠论 */}
              <span className={`font-mono text-[13px] font-bold text-center ${scoreColor(chanlun)}`}>
                {chanlun > 0 ? "+" : ""}{chanlun}
              </span>

              {/* 六因子 */}
              <span className={`font-mono text-[13px] font-bold text-center ${scoreColor(factor)}`}>
                {factor > 0 ? "+" : ""}{factor}
              </span>

              {/* 综合评分 */}
              <div className="flex items-center justify-center gap-2">
                <div className="w-12 h-1.5 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(Math.abs(composite), 100)}%`,
                      background: scoreBg(composite),
                    }}
                  />
                </div>
                <span className={`font-mono text-[13px] font-bold ${scoreColor(composite)}`}>
                  {composite > 0 ? "+" : ""}{composite}
                </span>
              </div>

              {/* 支撑位 */}
              <span className="font-mono text-[12px] text-emerald-400 text-right">
                ${formatPrice(pred.support)}
              </span>

              {/* 阻力位 */}
              <span className="font-mono text-[12px] text-rose-400 text-right">
                ${formatPrice(pred.resistance)}
              </span>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
