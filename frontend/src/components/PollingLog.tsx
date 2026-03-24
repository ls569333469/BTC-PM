import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Activity,
  AlertCircle,
} from "lucide-react";

export interface PollRecord {
  id: number;
  timestamp: string;
  price: number;
  prevPrice: number | null;
  priceDelta: number | null;
  priceDeltaPct: number | null;
  trend: string;
  strength: number;
  rsi: number | null;
  predictionsCount: number;
  bullishCount: number;
  bearishCount: number;
  sidewaysCount: number;
  validation: {
    hitCount: number;
    totalCount: number;
    hitRate: number;
  } | null;
  status: "success" | "error" | "loading";
  errorMsg?: string;
}

interface PollingLogProps {
  records: PollRecord[];
  isPolling: boolean;
}

function formatPrice(n: number) {
  if (n == null || isNaN(n)) return "--";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

const trendMap: Record<string, { label: string; icon: typeof TrendingUp; color: string }> = {
  bullish: { label: "看涨", icon: TrendingUp, color: "text-emerald-500" },
  bearish: { label: "看跌", icon: TrendingDown, color: "text-red-400" },
  consolidating: { label: "盘整", icon: Minus, color: "text-amber-500" },
  neutral: { label: "中性", icon: Minus, color: "text-[var(--fg-muted)]" },
};

export function PollingLog({ records, isPolling }: PollingLogProps) {
  const [expanded, setExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const displayRecords = showAll ? records : records.slice(0, 8);
  const latestRecord = records[0] || null;

  // Aggregate stats
  const successCount = records.filter((r) => r.status === "success").length;
  const errorCount = records.filter((r) => r.status === "error").length;
  const validatedCount = records.filter((r) => r.validation).length;
  const avgHitRate =
    validatedCount > 0
      ? Math.round(
          records.filter((r) => r.validation).reduce((sum, r) => sum + (r.validation?.hitRate || 0), 0) /
            validatedCount
        )
      : null;

  return (
    <div className="chart-section">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[var(--brand-100)]" />
          <h3 className="section-label">轮询活动日志</h3>
          {isPolling && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              轮询中
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Stats summary */}
          <div className="flex items-center gap-2 text-[10px] font-mono">
            <span className="text-[var(--fg-muted)]">
              共 <span className="font-bold text-[var(--fg-base)]">{records.length}</span> 次
            </span>
            {errorCount > 0 && (
              <span className="text-red-400">
                {errorCount} 失败
              </span>
            )}
            {avgHitRate !== null && (
              <span className={avgHitRate >= 60 ? "text-emerald-500" : avgHitRate >= 40 ? "text-amber-500" : "text-red-400"}>
                平均命中 {avgHitRate}%
              </span>
            )}
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="toolbar-btn"
            title={expanded ? "收起" : "展开"}
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Summary bar - always visible */}
      {latestRecord && (
        <div className="flex items-center gap-3 p-2.5 rounded border border-[var(--border-base)] bg-[var(--bg-subtle)] mb-3">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-[var(--fg-muted)]" />
            <span className="text-[10px] text-[var(--fg-muted)]">最近轮询</span>
          </div>
          <span className="font-mono text-[11px] font-semibold text-[var(--fg-base)]">
            {formatTime(latestRecord.timestamp)}
          </span>
          <span className="font-mono text-[11px] font-bold text-[var(--fg-base)]">
            ${formatPrice(latestRecord.price)}
          </span>
          {latestRecord.priceDelta !== null && (
            <span
              className={`font-mono text-[10px] font-bold ${
                latestRecord.priceDelta > 0 ? "text-emerald-500" : latestRecord.priceDelta < 0 ? "text-red-400" : "text-[var(--fg-muted)]"
              }`}
            >
              {latestRecord.priceDelta > 0 ? "+" : ""}
              {formatPrice(latestRecord.priceDelta)} ({latestRecord.priceDeltaPct! > 0 ? "+" : ""}
              {latestRecord.priceDeltaPct!.toFixed(3)}%)
            </span>
          )}
          {latestRecord.validation && (
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                latestRecord.validation.hitRate >= 60
                  ? "bg-emerald-500/10 text-emerald-500"
                  : latestRecord.validation.hitRate >= 40
                  ? "bg-amber-500/10 text-amber-500"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              命中 {latestRecord.validation.hitCount}/{latestRecord.validation.totalCount}
            </span>
          )}
        </div>
      )}

      {/* Timeline */}
      {expanded && (
        <div className="space-y-0">
          {displayRecords.map((record, idx) => (
            <PollRecordRow key={record.id} record={record} isFirst={idx === 0} isLast={idx === displayRecords.length - 1} />
          ))}
          {records.length === 0 && (
            <div className="py-6 text-center">
              <Clock className="h-5 w-5 text-[var(--fg-muted)] mx-auto mb-2 opacity-50" />
              <p className="text-xs text-[var(--fg-muted)]">
                等待首次轮询数据...
              </p>
              <p className="text-[10px] text-[var(--fg-muted)] mt-1">
                每15分钟自动刷新一次，或点击刷新按钮手动触发
              </p>
            </div>
          )}
          {records.length > 8 && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full py-2 text-[10px] font-semibold text-[var(--brand-100)] hover:text-[var(--brand-200)] transition-colors"
            >
              查看全部 {records.length} 条记录
            </button>
          )}
          {showAll && records.length > 8 && (
            <button
              onClick={() => setShowAll(false)}
              className="w-full py-2 text-[10px] font-semibold text-[var(--brand-100)] hover:text-[var(--brand-200)] transition-colors"
            >
              收起
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function PollRecordRow({ record, isFirst, isLast }: { record: PollRecord; isFirst: boolean; isLast: boolean }) {
  const trendCfg = trendMap[record.trend] || trendMap.neutral;
  const TrendIcon = trendCfg.icon;

  return (
    <div className={`flex gap-3 ${isFirst ? "" : ""}`}>
      {/* Timeline dot + line */}
      <div className="flex flex-col items-center w-5 shrink-0">
        <div
          className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ring-2 ring-[var(--bg-base)] ${
            record.status === "error"
              ? "bg-red-400"
              : record.status === "loading"
              ? "bg-amber-500 animate-pulse"
              : isFirst
              ? "bg-[var(--brand-100)]"
              : "bg-[var(--fg-muted)]/40"
          }`}
        />
        {!isLast && <div className="w-px flex-1 bg-[var(--border-base)] min-h-[20px]" />}
      </div>

      {/* Content */}
      <div className={`flex-1 pb-3 ${isFirst ? "" : "opacity-75"}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Timestamp */}
            <span className="font-mono text-[11px] font-semibold text-[var(--fg-base)]">
              {formatTime(record.timestamp)}
            </span>
            <span className="text-[10px] text-[var(--fg-muted)]">{formatDate(record.timestamp)}</span>

            {/* Status indicator */}
            {record.status === "error" && (
              <span className="flex items-center gap-1 text-[10px] text-red-400">
                <AlertCircle className="h-3 w-3" />
                失败
              </span>
            )}
          </div>

          {/* Price */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono text-[11px] font-bold text-[var(--fg-base)]">
              ${formatPrice(record.price)}
            </span>
            {record.priceDelta !== null && (
              <span
                className={`font-mono text-[10px] font-bold ${
                  record.priceDelta > 0 ? "text-emerald-500" : record.priceDelta < 0 ? "text-red-400" : "text-[var(--fg-muted)]"
                }`}
              >
                {record.priceDelta > 0 ? "+" : ""}
                {record.priceDeltaPct!.toFixed(3)}%
              </span>
            )}
          </div>
        </div>

        {/* Details row */}
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {/* Trend */}
          <span className={`flex items-center gap-1 text-[10px] font-semibold ${trendCfg.color}`}>
            <TrendIcon className="h-3 w-3" />
            {trendCfg.label}
            <span className="text-[var(--fg-muted)] font-normal">({record.strength}%)</span>
          </span>

          {/* RSI */}
          {record.rsi !== null && (
            <span className="text-[10px] text-[var(--fg-muted)]">
              RSI{" "}
              <span
                className={`font-mono font-semibold ${
                  record.rsi > 70 ? "text-red-400" : record.rsi < 30 ? "text-emerald-500" : "text-[var(--fg-base)]"
                }`}
              >
                {record.rsi.toFixed(1)}
              </span>
            </span>
          )}

          {/* Predictions summary */}
          <span className="text-[10px] text-[var(--fg-muted)]">
            预测:
            {record.bullishCount > 0 && (
              <span className="text-emerald-500 font-semibold ml-1">{record.bullishCount}涨</span>
            )}
            {record.bearishCount > 0 && (
              <span className="text-red-400 font-semibold ml-1">{record.bearishCount}跌</span>
            )}
            {record.sidewaysCount > 0 && (
              <span className="text-amber-500 font-semibold ml-1">{record.sidewaysCount}平</span>
            )}
          </span>

          {/* Validation result */}
          {record.validation && (
            <span className="flex items-center gap-1 text-[10px] font-semibold">
              {record.validation.hitRate >= 60 ? (
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              ) : record.validation.hitRate >= 40 ? (
                <AlertCircle className="h-3 w-3 text-amber-500" />
              ) : (
                <XCircle className="h-3 w-3 text-red-400" />
              )}
              <span
                className={
                  record.validation.hitRate >= 60
                    ? "text-emerald-500"
                    : record.validation.hitRate >= 40
                    ? "text-amber-500"
                    : "text-red-400"
                }
              >
                验证 {record.validation.hitCount}/{record.validation.totalCount} (
                {record.validation.hitRate}%)
              </span>
            </span>
          )}
        </div>

        {/* Error message */}
        {record.status === "error" && record.errorMsg && (
          <p className="text-[10px] text-red-400 mt-1 break-all">{record.errorMsg}</p>
        )}
      </div>
    </div>
  );
}
