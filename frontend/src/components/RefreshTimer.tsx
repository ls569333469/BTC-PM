import { useState, useEffect, useRef } from "react";
import { RefreshCw } from "lucide-react";

interface RefreshTimerProps {
  intervalMs: number;
  lastUpdated: string | null;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function RefreshTimer({ intervalMs, lastUpdated, onRefresh, isRefreshing }: RefreshTimerProps) {
  const [remaining, setRemaining] = useState(intervalMs / 1000);
  const intervalRef = useRef<number | null>(null);

  const getSecondsUntilNextEpoch = () => {
    const now = new Date();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    // Calculate distance to the next 5-minute boundary (e.g. 05, 10, 15)
    // We add a tiny epsilon to handle exactly 00:00 boundary crossovers gracefully
    const nextBoundaryMinute = Math.ceil((minutes + 0.1) / 5) * 5;
    return (nextBoundaryMinute - minutes) * 60 - seconds;
  };

  useEffect(() => {
    // Initialize immediately
    setRemaining(getSecondsUntilNextEpoch());
    
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => {
      setRemaining(getSecondsUntilNextEpoch());
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const mins = Math.floor(remaining / 60);
  const secs = Math.floor(remaining % 60);
  const progress = 1 - remaining / (intervalMs / 1000);

  return (
    <div className="flex items-center gap-3">
      {lastUpdated && (
        <span className="text-[10px] text-[var(--fg-muted)] hidden md:inline">
          Updated: {new Date(lastUpdated).toLocaleTimeString()}
        </span>
      )}
      <div className="flex items-center gap-2">
        <div className="relative w-6 h-6">
          <svg className="w-6 h-6 -rotate-90" viewBox="0 0 24 24">
            <circle
              cx="12" cy="12" r="10"
              fill="none"
              stroke="var(--border-strong)"
              strokeWidth="2"
            />
            <circle
              cx="12" cy="12" r="10"
              fill="none"
              stroke="var(--brand-100)"
              strokeWidth="2"
              strokeDasharray={`${progress * 62.83} 62.83`}
              strokeLinecap="round"
            />
          </svg>
        </div>
        <span className="font-mono text-[11px] font-semibold text-[var(--fg-subtle)] tabular-nums w-10">
          {mins}:{secs.toString().padStart(2, "0")}
        </span>
      </div>
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        className="toolbar-btn"
        title="立即刷新"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
      </button>
    </div>
  );
}
