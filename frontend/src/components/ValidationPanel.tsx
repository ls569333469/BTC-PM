import type { Validation } from "../lib/chanlun";
import { CheckCircle2, XCircle } from "lucide-react";

interface ValidationPanelProps {
  validations: Validation[];
  currentPrice: number;
  timestamp: string;
}

function formatPrice(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ValidationPanel({ validations, currentPrice, timestamp }: ValidationPanelProps) {
  const hitCount = validations.filter((v) => v.correct).length;
  const totalCount = validations.length;
  const hitRate = totalCount > 0 ? Math.round((hitCount / totalCount) * 100) : 0;

  return (
    <div className="chart-section">
      <div className="flex items-center justify-between mb-3">
        <h3 className="section-label">Prediction Validation</h3>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-semibold tracking-[0.08em] uppercase text-[var(--fg-muted)]">
            Hit Rate
          </span>
          <span
            className={`font-mono text-sm font-bold ${hitRate >= 60 ? "text-emerald-500" : hitRate >= 40 ? "text-amber-500" : "text-red-400"}`}
          >
            {hitRate}% ({hitCount}/{totalCount})
          </span>
        </div>
      </div>
      <div className="text-[10px] text-[var(--fg-muted)] mb-3">
        Validated at: {new Date(timestamp).toLocaleString()} | Current: ${formatPrice(currentPrice)}
      </div>
      <div className="space-y-1.5">
        {validations.map((v) => (
          <div
            key={v.timeframe}
            className={`flex items-center justify-between p-2.5 rounded border transition-colors duration-150 ${
              v.correct
                ? "border-emerald-500/20 bg-emerald-500/5"
                : "border-red-500/20 bg-red-500/5"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {v.correct ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-red-400 shrink-0" />
              )}
              <span className="font-mono text-xs font-bold text-[var(--fg-base)]">
                {v.timeframe.toUpperCase()}
              </span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                v.predictedDirection === "up"
                  ? "bg-emerald-500/10 text-emerald-500"
                  : v.predictedDirection === "down"
                  ? "bg-red-500/10 text-red-500"
                  : "bg-[var(--bg-subtle)] text-[var(--fg-muted)]"
              }`}>
                {v.predictedDirection.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <div className="text-right">
                <span className="text-[var(--fg-muted)]">Predicted: </span>
                <span className="font-mono font-semibold text-[var(--fg-base)]">
                  ${formatPrice(v.predictedTarget)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[var(--fg-muted)]">Actual: </span>
                <span className={`font-mono font-semibold ${v.actualChange > 0 ? "text-emerald-500" : v.actualChange < 0 ? "text-red-400" : "text-[var(--fg-muted)]"}`}>
                  ${formatPrice(v.actualPrice)}
                </span>
              </div>
              <span className={`font-mono font-bold text-xs ${v.correct ? "text-emerald-500" : "text-red-400"}`}>
                {v.accuracy}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
