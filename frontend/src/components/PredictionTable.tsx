import type { Prediction, BettingGuide } from "../lib/chanlun";
import { ArrowUp, ArrowDown, Minus, Target, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

interface PredictionTableProps {
  predictions: Prediction[];
  currentPrice: number;
  bettingGuides?: BettingGuide[];
}

const directionConfig = {
  up: { icon: ArrowUp, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "LONG" },
  down: { icon: ArrowDown, color: "text-red-500", bg: "bg-red-500/10", label: "SHORT" },
  sideways: { icon: Minus, color: "text-[var(--fg-muted)]", bg: "bg-[var(--bg-subtle)]", label: "HOLD" },
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

// Map prediction timeframe to hours
const tfToHours: Record<string, number> = {
  "30m": 0.5, "1h": 1, "2h": 2, "4h": 4, "8h": 8, "12h": 12, "24h": 24,
};

// Find the best matching PM guide for a given prediction timeframe
function findMatchingGuide(tf: string, guides: BettingGuide[]): BettingGuide | null {
  if (!guides || guides.length === 0) return null;
  const hours = tfToHours[tf] ?? 1;
  let best: BettingGuide | null = null;
  let bestDist = Infinity;
  for (const g of guides) {
    const dist = Math.abs(g.hoursLeft - hours);
    if (dist < bestDist) {
      bestDist = dist;
      best = g;
    }
  }
  return best;
}

const pmSignalConfig: Record<string, { color: string; bg: string; icon: typeof ArrowUp }> = {
  // English keys (used in VIBE)
  "BUY YES": { color: "text-emerald-500", bg: "bg-emerald-500/10", icon: ArrowUp },
  "BUY NO": { color: "text-red-400", bg: "bg-red-500/10", icon: ArrowDown },
  "HOLD": { color: "text-amber-500", bg: "bg-amber-500/10", icon: Minus },
  // Chinese keys (returned by current backend)
  "看涨买入": { color: "text-emerald-500", bg: "bg-emerald-500/10", icon: ArrowUp },
  "看跌买入": { color: "text-red-400", bg: "bg-red-500/10", icon: ArrowDown },
  "观望": { color: "text-amber-500", bg: "bg-amber-500/10", icon: Minus },
};

const defaultPmSignal = { color: "text-amber-500", bg: "bg-amber-500/10", icon: Minus };

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
                    PM 盘口
                  </span>
                </th>
              )}
              {hasGuides && (
                <th className="text-center text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--fg-muted)] pb-2 pr-3">
                  PM 信号
                </th>
              )}
              <th className="text-right text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--fg-muted)] pb-2 pr-3">
                目标价
              </th>
              <th className="text-right text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--fg-muted)] pb-2 pr-3">
                涨跌幅
              </th>
              <th className="text-right text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--fg-muted)] pb-2 pr-3">
                胜率
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

              // For strike markets: compare target vs base price
              // For updown markets: use the guide's action directly
              let pmAction: string = guide?.action ?? "HOLD";
              let pmSub = "";

              if (guide && !isUpDown && guide.basePrice && guide.basePrice > 0) {
                // Strike market: compute delta
                const pmDeltaPct = ((pred.targetPrice - guide.basePrice) / guide.basePrice) * 100;
                if (pmDeltaPct > 0.15) pmAction = "BUY YES";
                else if (pmDeltaPct < -0.15) pmAction = "BUY NO";
                else pmAction = "HOLD";
                pmSub = `${pmDeltaPct > 0 ? "+" : ""}${pmDeltaPct.toFixed(2)}%`;
              } else if (guide && isUpDown) {
                // Up/Down market: show edge
                const edge = guide.aboveProb - (guide.marketUpProb ?? 50);
                pmSub = `${edge > 0 ? "+" : ""}${edge.toFixed(1)}% edge`;
              }

              const pmCfg = pmSignalConfig[pmAction] || defaultPmSignal;
              const PmIcon = pmCfg.icon;

              return (
                <tr
                  key={pred.timeframe}
                  className="border-b border-[var(--border-base)] last:border-b-0 transition-colors duration-150 hover:bg-[var(--bg-subtle)]"
                >
                  <td className="py-3 pr-3">
                    <span className="font-mono text-xs font-bold text-[var(--fg-base)]">
                      {pred.timeframe.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 pr-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold ${cfg.bg} ${cfg.color}`}>
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </span>
                  </td>
                  {hasGuides && (
                    <td className="py-3 pr-3 text-center">
                      {guide ? (
                        guide.marketUpProb != null && guide.marketDownProb != null ? (
                          /* Live Polymarket data: show up/down probabilities */
                          <div className="flex items-center justify-center gap-2">
                            <div className="flex items-center gap-0.5">
                              <ArrowUpCircle className="h-3 w-3 text-emerald-500" />
                              <span className="font-mono text-[11px] font-semibold text-emerald-500">
                                {guide.marketUpProb.toFixed(0)}%
                              </span>
                            </div>
                            <div className="flex items-center gap-0.5">
                              <ArrowDownCircle className="h-3 w-3 text-red-400" />
                              <span className="font-mono text-[11px] font-semibold text-red-400">
                                {guide.marketDownProb.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        ) : guide.aboveProb != null ? (
                          /* Fallback: show Chanlun-computed above probability */
                          <div className="flex items-center justify-center gap-2">
                            <div className="flex items-center gap-0.5">
                              <ArrowUpCircle className={`h-3 w-3 ${guide.aboveProb >= 50 ? "text-emerald-500" : "text-red-400"}`} />
                              <span className={`font-mono text-[11px] font-semibold ${guide.aboveProb >= 50 ? "text-emerald-500" : "text-red-400"}`}>
                                {guide.aboveProb.toFixed(0)}%
                              </span>
                            </div>
                            <div className="flex items-center gap-0.5">
                              <ArrowDownCircle className={`h-3 w-3 ${guide.aboveProb < 50 ? "text-red-400" : "text-emerald-500"}`} />
                              <span className={`font-mono text-[11px] font-semibold ${guide.aboveProb < 50 ? "text-red-400" : "text-emerald-500"}`}>
                                {(100 - guide.aboveProb).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-[var(--fg-muted)]">--</span>
                        )
                      ) : (
                        <span className="text-[10px] text-[var(--fg-muted)]">--</span>
                      )}
                    </td>
                  )}
                  {hasGuides && (
                    <td className="py-3 pr-3 text-center">
                      {guide ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${pmCfg.bg} ${pmCfg.color}`}>
                            <PmIcon className="h-3 w-3" />
                            {pmAction}
                          </span>
                          {pmSub && (
                            <span className="font-mono text-[9px] text-[var(--fg-muted)]">
                              {pmSub}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-[var(--fg-muted)]">--</span>
                      )}
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
