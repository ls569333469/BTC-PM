import { useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useChanlunAnalysis, useBacktestStats, usePolymarketPrices } from "./lib/chanlun";
import { useWebSocket } from "./hooks/useWebSocket";

import { PredictionTable } from "./components/PredictionTable";
import { PriceChart } from "./components/PriceChart";
import { PredictionChart } from "./components/PredictionChart";
import { WinRateChart } from "./components/WinRateChart";

import { RefreshTimer } from "./components/RefreshTimer";
import { BacktestPanel } from "./components/BacktestPanel";
import { PolymarketGuide } from "./components/PolymarketGuide";
import { Skeleton } from "./components/ui/skeleton";
import ErrorBoundary from "./ErrorBoundary";

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes (Driven primarily by WS invalidation)

export default function App() {
  const queryClient = useQueryClient();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";


  const {
    data: analysis,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useChanlunAnalysis(REFRESH_INTERVAL);



  const { data: backtestStats } = useBacktestStats(REFRESH_INTERVAL);
  const { data: polymarketData } = usePolymarketPrices(REFRESH_INTERVAL);

  // WebSocket — real-time push from APScheduler
  const { connected: wsConnected } = useWebSocket();



  // Autonomous UTC Clock watcher for Polymarket Sync
  // Fully decoupled from Backend WebSockets to ensure zero dependency on APScheduler timing.
  useEffect(() => {
    let lastSecond = new Date().getSeconds();
    const interval = setInterval(() => {
      const now = new Date();
      const currentSeconds = now.getSeconds();
      const currentMinsMod = now.getMinutes() % 5;
      
      if (currentSeconds !== lastSecond) {
        lastSecond = currentSeconds;
        // Fire precisely at +2s and +15s past the 5-minute divisible boundary.
        // This flawlessly captures immediate and CDN-lagged Polymarket Gamma API slugs.
        if (currentMinsMod === 0 && (currentSeconds === 2 || currentSeconds === 15)) {
          queryClient.invalidateQueries({ queryKey: ["polymarket", "prices"] });
          console.log(`[Epoch Sync] Autonomous Polymarket reset triggered at +${currentSeconds}s`);
        }
      }
    }, 500); 
    return () => clearInterval(interval);
  }, [queryClient]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-2">
          <p className="text-sm font-semibold text-red-500">Failed to load analysis</p>
          <p className="text-xs text-[var(--fg-muted)]">{String(error)}</p>
          <button
            onClick={handleRefresh}
            className="px-3 py-1.5 text-xs font-semibold rounded bg-[var(--brand-100)] text-white transition-colors duration-150 hover:opacity-90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[var(--border-strong)] bg-[var(--bg-base-opaque)]">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot" />
              <h1 className="text-sm font-bold text-[var(--fg-base)]">
                BTC 缠论分析器
              </h1>
            </div>
            <span className="text-[10px] font-semibold tracking-[0.08em] uppercase text-[var(--fg-muted)] hidden md:inline">
              投注指南
            </span>
          </div>
          <div className="flex items-center gap-3">
            <RefreshTimer
              intervalMs={REFRESH_INTERVAL}
              lastUpdated={analysis?.timestamp ?? null}
              onRefresh={handleRefresh}
              isRefreshing={isFetching}
            />
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="toolbar-btn"
              title="Toggle theme"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 lg:px-6 py-5">
        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-20 rounded" />
              ))}
            </div>
            <Skeleton className="h-[380px] rounded" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Skeleton className="h-[300px] rounded" />
              <Skeleton className="h-[300px] rounded" />
            </div>
            <Skeleton className="h-[200px] rounded" />
          </div>
        ) : analysis ? (
          <div className="tab-enter space-y-5">


            {/* Price Chart with Chanlun overlay */}
            <ErrorBoundary>
              <PriceChart
                priceHistory={analysis.priceHistory}
                bis={analysis.chanlun.bis}
                zhongshu={analysis.chanlun.zhongshu}
                currentPrice={analysis.currentPrice}
              />
            </ErrorBoundary>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ErrorBoundary>
                <PredictionChart predictions={analysis.predictions} />
              </ErrorBoundary>
              <ErrorBoundary>
                <WinRateChart predictions={analysis.predictions} />
              </ErrorBoundary>
            </div>

            {/* Prediction Table */}
            <ErrorBoundary>
              <PredictionTable
                predictions={analysis.predictions}
                currentPrice={analysis.currentPrice}
                bettingGuides={polymarketData?.guides}
              />
            </ErrorBoundary>

            {/* Polymarket Betting Guide (detailed — replaces simple panel) */}
            {polymarketData && polymarketData.guides && polymarketData.guides.length > 0 && (
              <ErrorBoundary>
              <PolymarketGuide
                  guides={polymarketData.guides}
                  timeframes={polymarketData.timeframes}
                  timestamp={polymarketData.timestamp}
                  spotPrice={analysis.currentPrice}
                />
              </ErrorBoundary>
            )}



            {/* Backtest Statistics */}
            {backtestStats && (
              <ErrorBoundary>
                <BacktestPanel stats={backtestStats} />
              </ErrorBoundary>
            )}



            {/* Disclaimer */}
            <div className="border-t border-[var(--border-base)] pt-4 pb-6">
              <p className="text-[10px] text-[var(--fg-muted)] leading-relaxed max-w-2xl">
                Disclaimer: This analysis is based on Chanlun (Chan Theory) technical framework combined with market indicators.
                Predictions are probabilistic estimates, not financial advice. Past performance does not guarantee future results.
                Always conduct your own research before making any trading or betting decisions.
              </p>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
