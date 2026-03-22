// Shared formatting utilities — used across all components.
// Centralised here to eliminate duplicate definitions.

import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";

// ── Price formatting ──────────────────────────────────────────────

/** Full 2-decimal price: "70,123.45" */
export function formatPrice(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Integer price: "70,123" */
export function formatPriceShort(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

// ── Volume / compact number ───────────────────────────────────────

/** Compact number with unit: "1.5B", "32.1M", "8.0K" */
export function formatCompact(n: number) {
  if (!n && n !== 0) return "--";
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toFixed(2);
}

/** Dollar-prefixed volume: "$1.5M", "$32K" */
export function formatVolume(n: number) {
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return "$" + (n / 1e3).toFixed(0) + "K";
  return "$" + n.toFixed(0);
}

// ── Timestamp formatting ──────────────────────────────────────────

export function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

// ── Trend configuration (shared by MarketOverview, PollingLog) ────

export const trendConfig = {
  bullish: { icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "BULLISH" },
  bearish: { icon: TrendingDown, color: "text-red-500", bg: "bg-red-500/10", label: "BEARISH" },
  consolidating: { icon: Activity, color: "text-amber-500", bg: "bg-amber-500/10", label: "CONSOLIDATING" },
  neutral: { icon: Minus, color: "text-[var(--fg-muted)]", bg: "bg-[var(--bg-subtle)]", label: "NEUTRAL" },
} as const;
