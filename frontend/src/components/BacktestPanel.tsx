import type { BacktestStats, BacktestRecentPrediction } from "../lib/chanlun";
import { BarChart3, TrendingUp, TrendingDown, Minus, CheckCircle2, XCircle, Crosshair, CircleDot, Clock } from "lucide-react";
import { formatPrice } from "../lib/formatting";

interface BacktestPanelProps {
  stats: BacktestStats;
}

const directionLabel: Record<string, string> = {
  up: "\u770B\u6DA8",
  down: "\u770B\u8DCC",
  sideways: "\u89C2\u671B",
};

const directionIcon: Record<string, typeof TrendingUp> = {
  up: TrendingUp,
  down: TrendingDown,
  sideways: Minus,
};

const gradeConfig: Record<string, { label: string; color: string; bg: string; icon: typeof Crosshair }> = {
  EXACT: { label: "\u7CBE\u51C6", color: "text-emerald-500", bg: "bg-emerald-500/10", icon: Crosshair },
  CLOSE: { label: "\u63A5\u8FD1", color: "text-emerald-400", bg: "bg-emerald-400/10", icon: CircleDot },
  HIT: { label: "\u547D\u4E2D", color: "text-amber-500", bg: "bg-amber-500/10", icon: CheckCircle2 },
  MISS: { label: "\u504F\u79BB", color: "text-red-400", bg: "bg-red-400/10", icon: XCircle },
};

// Timeframe display order
const TF_ORDER = ["30m", "1h", "2h", "4h", "8h", "12h", "24h"];

function HitRateBar({ rate, count }: { rate: number; count: number }) {
  const barColor =
    rate >= 60 ? "bg-emerald-500" : rate >= 45 ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-2 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(rate, 100)}%` }}
        />
      </div>
      <span className="font-mono text-[11px] font-bold text-[var(--fg-base)] min-w-[36px] text-right">
        {rate.toFixed(1)}%
      </span>
      <span className="font-mono text-[10px] text-[var(--fg-muted)] min-w-[24px] text-right">
        ({count})
      </span>
    </div>
  );
}

function RecentRow({ pred }: { pred: BacktestRecentPrediction }) {
  const grade = gradeConfig[pred.accuracy_grade] || gradeConfig.MISS;
  const GradeIcon = grade.icon;
  const DirIcon = directionIcon[pred.direction] || Minus;
  const time = new Date(pred.prediction_time).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`flex items-center justify-between p-2 rounded border transition-colors duration-150 ${
        pred.direction_correct
          ? "border-emerald-500/20 bg-emerald-500/5"
          : "border-red-500/20 bg-red-500/5"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] text-[var(--fg-muted)] min-w-[32px]">
          {time}
        </span>
        <span className="font-mono text-[11px] font-bold text-[var(--fg-base)] min-w-[28px]">
          {pred.timeframe.toUpperCase()}
        </span>
        <DirIcon
          className={`h-3 w-3 ${
            pred.direction === "up"
              ? "text-emerald-500"
              : pred.direction === "down"
              ? "text-red-400"
              : "text-[var(--fg-muted)]"
          }`}
        />
      </div>
      <div className="flex items-center gap-3 text-[11px]">
        <span className="font-mono text-[var(--fg-muted)] hidden sm:inline">
          ${formatPrice(pred.current_price)}
        </span>
        <span className="text-[var(--fg-muted)] hidden sm:inline">&rarr;</span>
        <span
          className={`font-mono font-semibold ${
            pred.direction_correct ? "text-emerald-500" : "text-red-400"
          } hidden sm:inline`}
        >
          ${formatPrice(pred.actual_price)}
        </span>
        <span
          className={`font-mono font-bold text-[10px] min-w-[32px] text-center px-1.5 py-0.5 rounded ${grade.bg} ${grade.color}`}
        >
          {grade.label}
        </span>
      </div>
    </div>
  );
}

export function BacktestPanel({ stats }: BacktestPanelProps) {
  const { overall, byTimeframe, byDirection, recentPredictions } = stats;

  // Empty state
  if (overall.total === 0) {
    return (
      <div className="chart-section">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-4 w-4 text-[var(--fg-muted)]" />
          <h3 className="section-label">{"\u9884\u6D4B\u56DE\u6D4B\u7EDF\u8BA1"}</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-[var(--fg-muted)]">
          <Clock className="h-6 w-6 mb-2 opacity-50" />
          <p className="text-xs font-semibold">{"\u5C1A\u65E0\u56DE\u6D4B\u6570\u636E"}</p>
          <p className="text-[10px] mt-1">{"\u7CFB\u7EDF\u5C06\u5728\u9996\u6B21\u8F6E\u8BE2\u540E\u81EA\u52A8\u5F00\u59CB\u8BB0\u5F55"}</p>
        </div>
      </div>
    );
  }

  const hitRateColor =
    overall.hit_rate >= 60
      ? "text-emerald-500"
      : overall.hit_rate >= 45
      ? "text-amber-500"
      : "text-red-400";

  return (
    <div className="chart-section">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-[var(--fg-muted)]" />
          <h3 className="section-label">{"\u9884\u6D4B\u56DE\u6D4B\u7EDF\u8BA1"}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold tracking-[0.08em] uppercase text-[var(--fg-muted)]">
            {"\u6837\u672C"}
          </span>
          <span className="font-mono text-xs font-bold text-[var(--fg-base)]">
            {overall.resolved}/{overall.total}
          </span>
          {overall.pending > 0 && (
            <span className="font-mono text-[10px] text-[var(--fg-muted)]">
              ({overall.pending} {"\u5F85\u9A8C\u8BC1"})
            </span>
          )}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="p-3 rounded border border-[var(--border-base)] bg-[var(--bg-subtle)]">
          <p className="text-[10px] text-[var(--fg-muted)] mb-1">{"\u603B\u547D\u4E2D\u7387"}</p>
          <p className={`font-mono text-lg font-bold ${hitRateColor}`}>
            {overall.hit_rate.toFixed(1)}%
          </p>
        </div>
        <div className="p-3 rounded border border-[var(--border-base)] bg-[var(--bg-subtle)]">
          <p className="text-[10px] text-[var(--fg-muted)] mb-1">{"\u5E73\u5747\u8BEF\u5DEE"}</p>
          <p className="font-mono text-lg font-bold text-[var(--fg-base)]">
            {overall.avg_error_pct != null ? `${overall.avg_error_pct.toFixed(2)}%` : "--"}
          </p>
        </div>
        <div className="p-3 rounded border border-[var(--border-base)] bg-[var(--bg-subtle)]">
          <p className="text-[10px] text-[var(--fg-muted)] mb-1">{"\u7CBE\u51C6\u9884\u6D4B"}</p>
          <p className="font-mono text-lg font-bold text-emerald-500">
            {overall.exact_count}
          </p>
        </div>
        <div className="p-3 rounded border border-[var(--border-base)] bg-[var(--bg-subtle)]">
          <p className="text-[10px] text-[var(--fg-muted)] mb-1">{"\u63A5\u8FD1\u9884\u6D4B"}</p>
          <p className="font-mono text-lg font-bold text-emerald-400">
            {overall.close_count}
          </p>
        </div>
      </div>

      {/* By Timeframe */}
      <div className="mb-4">
        <p className="text-[10px] font-semibold tracking-[0.08em] uppercase text-[var(--fg-muted)] mb-2">
          {"\u6309\u65F6\u95F4\u6846\u67B6"}
        </p>
        <div className="space-y-1.5">
          {TF_ORDER.map((tf) => {
            const data = byTimeframe[tf];
            if (!data || data.resolved === 0) return null;
            return (
              <div key={tf} className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-bold text-[var(--fg-base)] min-w-[28px]">
                  {tf.toUpperCase()}
                </span>
                <HitRateBar rate={data.hit_rate} count={data.resolved} />
              </div>
            );
          })}
          {Object.keys(byTimeframe).length === 0 && (
            <p className="text-[10px] text-[var(--fg-muted)]">{"\u6682\u65E0\u5DF2\u9A8C\u8BC1\u6570\u636E"}</p>
          )}
        </div>
      </div>

      {/* By Direction */}
      <div className="mb-4">
        <p className="text-[10px] font-semibold tracking-[0.08em] uppercase text-[var(--fg-muted)] mb-2">
          {"\u6309\u65B9\u5411"}
        </p>
        <div className="flex flex-wrap gap-3">
          {(["up", "down", "sideways"] as const).map((dir) => {
            const data = byDirection[dir];
            if (!data || data.resolved === 0) return null;
            const DirIcon = directionIcon[dir] || Minus;
            const color =
              data.hit_rate >= 60
                ? "text-emerald-500"
                : data.hit_rate >= 45
                ? "text-amber-500"
                : "text-red-400";
            return (
              <div
                key={dir}
                className="flex items-center gap-2 p-2 rounded border border-[var(--border-base)] bg-[var(--bg-subtle)] min-w-[100px]"
              >
                <DirIcon
                  className={`h-3.5 w-3.5 ${
                    dir === "up"
                      ? "text-emerald-500"
                      : dir === "down"
                      ? "text-red-400"
                      : "text-[var(--fg-muted)]"
                  }`}
                />
                <div>
                  <p className="text-[10px] text-[var(--fg-muted)]">
                    {directionLabel[dir] || dir}
                  </p>
                  <p className={`font-mono text-sm font-bold ${color}`}>
                    {data.hit_rate.toFixed(1)}%
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Predictions */}
      {recentPredictions.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold tracking-[0.08em] uppercase text-[var(--fg-muted)] mb-2">
            {"\u6700\u8FD1\u9A8C\u8BC1"} ({recentPredictions.length})
          </p>
          <div className="space-y-1">
            {recentPredictions.slice(0, 10).map((pred) => (
              <RecentRow key={pred.id} pred={pred} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
