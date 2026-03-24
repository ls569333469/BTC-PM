import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, TrendingUp, TrendingDown } from "lucide-react";
import type { PolyEvent, PolyStrike } from "../lib/chanlun";

interface PolymarketPriceBarProps {
  events: PolyEvent[];
  currentPrice: number;
  timestamp: string;
}

function formatPrice(n: number) {
  if (n == null || isNaN(n)) return "--";
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function formatVol(n: number) {
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return "$" + (n / 1e3).toFixed(0) + "K";
  return "$" + n.toFixed(0);
}

export function PolymarketPriceBar({ events, currentPrice, timestamp }: PolymarketPriceBarProps) {
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  if (!events || events.length === 0) return null;

  return (
    <div className="chart-section">
      <div className="flex items-center justify-between mb-3">
        <h3 className="section-label">Polymarket 盘口隐含价格</h3>
        <span className="text-[10px] text-[var(--fg-muted)] font-mono">
          {new Date(timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      {/* Implied price cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-3">
        {events.map((evt) => {
          const delta = evt.impliedPrice ? evt.impliedPrice - currentPrice : null;
          const deltaPct = delta && currentPrice > 0 ? (delta / currentPrice) * 100 : null;
          const isUp = delta !== null && delta > 0;
          const isExpanded = expandedEvent === evt.event_slug;

          return (
            <button
              key={evt.event_slug}
              onClick={() => setExpandedEvent(isExpanded ? null : evt.event_slug)}
              className={`text-left p-3 rounded border transition-all duration-150 ${
                isExpanded
                  ? "border-[var(--brand-100)] bg-[var(--brand-100)]/5"
                  : "border-[var(--border-strong)] hover:bg-[var(--bg-subtle)]"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[var(--fg-muted)]">
                  {evt.timeLabel === "Today" ? "今日" :
                   evt.timeLabel === "Tomorrow" ? "明日" :
                   evt.timeLabel}
                </span>
                <span className="text-[9px] text-[var(--fg-muted)]">
                  {evt.date.split("-").slice(1).join("/")}
                </span>
              </div>
              <div className="font-mono text-base font-bold text-[var(--fg-base)] leading-tight">
                {evt.impliedPrice ? `$${formatPrice(evt.impliedPrice)}` : "--"}
              </div>
              {delta !== null && deltaPct !== null && (
                <div className={`flex items-center gap-1 mt-0.5 text-[10px] font-mono font-semibold ${
                  isUp ? "text-emerald-500" : delta < 0 ? "text-red-400" : "text-[var(--fg-muted)]"
                }`}>
                  {isUp ? <TrendingUp className="h-3 w-3" /> : delta < 0 ? <TrendingDown className="h-3 w-3" /> : null}
                  {delta > 0 ? "+" : ""}{formatPrice(delta)} ({deltaPct > 0 ? "+" : ""}{deltaPct.toFixed(2)}%)
                </div>
              )}
              <div className="flex items-center justify-between mt-1">
                <span className="text-[9px] text-[var(--fg-muted)]">
                  {formatVol(evt.volume)} | {evt.marketCount}档
                </span>
                {isExpanded ? (
                  <ChevronUp className="h-3 w-3 text-[var(--fg-muted)]" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-[var(--fg-muted)]" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Strike ladder for expanded event */}
      {expandedEvent && (
        <StrikeLadder
          event={events.find((e) => e.event_slug === expandedEvent)!}
          currentPrice={currentPrice}
        />
      )}
    </div>
  );
}

function StrikeLadder({ event, currentPrice }: { event: PolyEvent; currentPrice: number }) {
  if (!event) return null;

  return (
    <div className="border border-[var(--border-base)] rounded overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-subtle)] border-b border-[var(--border-base)]">
        <span className="text-[10px] font-semibold text-[var(--fg-base)]">
          {event.title} - 行权价阶梯
        </span>
        <span className="text-[10px] text-[var(--fg-muted)]">
          隐含价: <span className="font-mono font-bold text-[var(--fg-base)]">
            ${event.impliedPrice ? formatPrice(event.impliedPrice) : "--"}
          </span>
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_80px_80px_60px_28px] gap-1 px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] border-b border-[var(--border-base)]">
        <span>行权价</span>
        <span className="text-right">YES</span>
        <span className="text-right">NO</span>
        <span className="text-right">成交量</span>
        <span />
      </div>

      {/* Strike rows */}
      {event.strikes.map((s) => (
        <StrikeRow key={s.strike} strike={s} currentPrice={currentPrice} impliedPrice={event.impliedPrice} />
      ))}
    </div>
  );
}

function StrikeRow({
  strike,
  currentPrice,
  impliedPrice,
}: {
  strike: PolyStrike;
  currentPrice: number;
  impliedPrice: number | null;
}) {
  const isNearImplied = impliedPrice ? Math.abs(strike.strike - impliedPrice) < 2000 : false;
  const isAboveCurrent = strike.strike > currentPrice;
  const yesPctWidth = Math.max(2, Math.min(100, strike.yesPct));

  return (
    <div
      className={`grid grid-cols-[1fr_80px_80px_60px_28px] gap-1 px-3 py-1.5 items-center border-b border-[var(--border-base)] last:border-b-0 transition-colors ${
        isNearImplied
          ? "bg-[var(--brand-100)]/5"
          : "hover:bg-[var(--bg-subtle)]"
      }`}
    >
      {/* Strike price */}
      <div className="flex items-center gap-1.5">
        <span className={`font-mono text-[11px] font-bold ${
          isAboveCurrent ? "text-[var(--fg-muted)]" : "text-[var(--fg-base)]"
        }`}>
          ${formatPrice(strike.strike)}
        </span>
        {isNearImplied && (
          <span className="text-[8px] font-bold text-[var(--brand-100)] px-1 py-0 rounded bg-[var(--brand-100)]/10">
            50%
          </span>
        )}
      </div>

      {/* YES bar + pct */}
      <div className="flex items-center gap-1 justify-end">
        <div className="w-12 h-1.5 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500"
            style={{ width: `${yesPctWidth}%` }}
          />
        </div>
        <span className={`font-mono text-[10px] font-semibold w-11 text-right ${
          strike.yesPct >= 65 ? "text-emerald-500" : strike.yesPct >= 40 ? "text-amber-500" : "text-red-400"
        }`}>
          {strike.yesPct.toFixed(1)}%
        </span>
      </div>

      {/* NO pct */}
      <div className="flex items-center gap-1 justify-end">
        <div className="w-12 h-1.5 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
          <div
            className="h-full rounded-full bg-red-400"
            style={{ width: `${Math.max(2, Math.min(100, strike.noPct))}%` }}
          />
        </div>
        <span className={`font-mono text-[10px] font-semibold w-11 text-right ${
          strike.noPct >= 65 ? "text-red-400" : strike.noPct >= 40 ? "text-amber-500" : "text-emerald-500"
        }`}>
          {strike.noPct.toFixed(1)}%
        </span>
      </div>

      {/* Volume */}
      <span className="font-mono text-[9px] text-[var(--fg-muted)] text-right">
        {formatVol(strike.volume)}
      </span>

      {/* Link */}
      {strike.polymarket_link && (
        <a
          href={strike.polymarket_link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--fg-muted)] hover:text-[var(--brand-100)] transition-colors"
          title="Polymarket"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}
