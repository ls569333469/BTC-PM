import type { Prediction } from "../lib/chanlun";

interface TriggerPanelProps {
  predictions: Prediction[];
}

export function TriggerPanel({ predictions }: TriggerPanelProps) {
  // Collect unique triggers across all timeframes
  const triggerMap = new Map<string, string[]>();
  for (const pred of predictions) {
    for (const t of pred.triggers) {
      if (!triggerMap.has(t)) {
        triggerMap.set(t, []);
      }
      triggerMap.get(t)!.push(pred.timeframe);
    }
  }

  const triggers = Array.from(triggerMap.entries()).map(([text, timeframes]) => ({
    text,
    timeframes,
    isBullish: text.includes("看涨") || text.includes("空头挤压") || text.includes("测试支撑") || text.includes("底背离") || text.includes("上升通道"),
    isBearish: text.includes("看跌") || text.includes("超买") || text.includes("顶背离") || text.includes("假突破") || text.includes("多头挤压") || text.includes("下降通道"),
  }));

  return (
    <div className="chart-section">
      <h3 className="section-label mb-3">关键触发信号</h3>
      <div className="space-y-2">
        {triggers.map((trigger, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-3 rounded border border-[var(--border-base)] transition-colors duration-150 hover:bg-[var(--bg-subtle)]"
          >
            <span
              className="mt-1 shrink-0 w-2 h-2 rounded-full"
              style={{
                background: trigger.isBullish ? "#10B981" : trigger.isBearish ? "#EF4444" : "var(--fg-muted)",
              }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-[var(--fg-base)] leading-relaxed">{trigger.text}</p>
              <div className="flex gap-1.5 mt-1.5">
                {trigger.timeframes.map((tf) => (
                  <span
                    key={tf}
                    className="inline-block px-1.5 py-0.5 text-[9px] font-bold tracking-[0.06em] uppercase rounded bg-[var(--bg-subtle)] text-[var(--fg-muted)]"
                  >
                    {tf}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
        {triggers.length === 0 && (
          <p className="text-xs text-[var(--fg-muted)]">No significant triggers detected</p>
        )}
      </div>
    </div>
  );
}
