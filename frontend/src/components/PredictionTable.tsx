import type { Prediction, BettingGuide } from "../lib/chanlun";
import { ArrowUp, ArrowDown, Minus, Target, Lock } from "lucide-react";

interface PredictionTableProps {
  predictions: Prediction[];
  currentPrice: number;
  bettingGuides?: BettingGuide[];
}

const directionConfig = {
  up: { icon: ArrowUp, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "做多" },
  down: { icon: ArrowDown, color: "text-red-500", bg: "bg-red-500/10", label: "做空" },
  sideways: { icon: Minus, color: "text-[var(--fg-muted)]", bg: "bg-[var(--bg-subtle)]", label: "观望" },
} as const;

const confidenceColor = {
  high: "text-emerald-500",
  medium: "text-amber-500",
  low: "text-red-400",
} as const;

function formatPrice(n: number) {
  if (n == null) return "--";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPriceShort(n: number) {
  if (n == null) return "--";
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

// Find the exact matching PM guide for a given prediction timeframe
function findMatchingGuide(tf: string, guides: BettingGuide[]): BettingGuide | null {
  if (!guides || guides.length === 0) return null;
  return guides.find(g => g.timeframe.toLowerCase() === tf.toLowerCase()) || null;
}



export function PredictionTable({ predictions, currentPrice, bettingGuides }: PredictionTableProps) {
  const hasGuides = bettingGuides && bettingGuides.length > 0;

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
      <div className="overflow-x-auto -mx-6 px-6">
        <table className={`w-full ${hasGuides ? "min-w-[950px]" : "min-w-[700px]"}`}>
          <thead>
            <tr className="border-b border-[var(--border-strong)]">
              <th className="text-left text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--fg-muted)] pb-2 pr-3">
                时间周期
              </th>
              <th className="text-left text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--fg-muted)] pb-2 pr-3">
                信号
              </th>
              {hasGuides && (
                <th className="text-center text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--fg-muted)] pb-2 pr-3">
                  <span className="inline-flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    基准价
                  </span>
                </th>
              )}
              <th className="text-right text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--fg-muted)] pb-2 pr-3">
                目标价
              </th>
              <th className="text-right text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--fg-muted)] pb-2 pr-3">
                涨跌幅
              </th>
              <th className="text-right text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--fg-muted)] pb-2 pr-3">
                综合评分
              </th>
              <th className="text-right text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--fg-muted)] pb-2 pr-3">
                支撑位
              </th>
              <th className="text-right text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--fg-muted)] pb-2">
                阻力位
              </th>
            </tr>
          </thead>
          <tbody>
            {predictions.map((pred) => {
              const cfg = directionConfig[pred.direction];
              const Icon = cfg.icon;
              const guide = hasGuides ? findMatchingGuide(pred.timeframe, bettingGuides!) : null;
              const isUpDown = guide?.marketType === "updown";



              return (
                <tr
                  key={pred.timeframe}
                  className="border-b border-[var(--border-base)] last:border-b-0 transition-colors duration-150 hover:bg-[var(--bg-subtle)]"
                >
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-[var(--fg-base)]">
                        {pred.timeframe.toUpperCase()}
                      </span>
                      {pred.isDeadZone && (
                        <div className="group relative flex items-center">
                          <Lock className="w-3 h-3 text-[var(--fg-muted)] opacity-70 cursor-help" />
                          <div className="absolute left-1/2 -top-7 -translate-x-1/2 px-2 py-1 bg-black/80 text-[10px] text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                            临近结算锁区 (Dead Zone)
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold ${cfg.bg} ${cfg.color}`}>
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </span>
                  </td>
                  {hasGuides && (
                    <td className="py-3 pr-3 text-center">
                      <span className="font-mono text-[11px] text-[var(--fg-muted)] font-semibold">
                        {guide && guide.basePrice ? `$${formatPrice(guide.basePrice)}` : '--'}
                      </span>
                    </td>
                  )}
                  <td className="py-3 pr-3 text-right">
                    <span className="font-mono text-xs font-semibold text-[var(--fg-base)]">
                      ${formatPrice(pred.targetPrice)}
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-right">
                    <span className={`font-mono text-xs font-semibold ${pred.priceChangePct > 0 ? "text-emerald-500" : pred.priceChangePct < 0 ? "text-red-500" : "text-[var(--fg-muted)]"}`}>
                      {pred.priceChangePct > 0 ? "+" : ""}{pred.priceChangePct}%
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <div className="w-12 h-1.5 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${pred.compositeWinRate ?? pred.winRate}%`,
                            background: (pred.compositeWinRate ?? pred.winRate) >= 80 ? "#10B981" : (pred.compositeWinRate ?? pred.winRate) >= 60 ? "#F59E0B" : "#EF4444",
                          }}
                        />
                      </div>
                      <span className={`font-mono text-[11px] font-bold ${confidenceColor[pred.confidence]}`}>
                        {pred.compositeWinRate ?? pred.winRate}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-right">
                    <span className="font-mono text-[11px] text-emerald-500">
                      ${formatPrice(pred.support)}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <span className="font-mono text-[11px] text-red-400">
                      ${formatPrice(pred.resistance)}
                    </span>
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
