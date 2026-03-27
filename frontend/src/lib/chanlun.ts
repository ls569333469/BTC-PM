import { useQuery } from "@tanstack/react-query";
import { API_BASE } from "./fetch";

export interface Prediction {
  timeframe: string;
  direction: "up" | "down" | "sideways";
  targetPrice: number;
  currentPrice: number;
  priceChange: number;
  priceChangePct: number;
  winRate: number;
  chanlunWinRate: number;
  factorWinRate: number;
  compositeWinRate: number;
  chanlunDirection: string;
  factorDirection: string;
  compositeDirection: string;
  scoreLevel?: string;
  scoreDesc?: string;
  support: number;
  resistance: number;
  triggers: string[];
  confidence: "high" | "medium" | "low";
  engineUsed?: string;
  isDeadZone?: boolean;
}

export interface BiPoint {
  type: "top" | "bottom";
  price: number;
  index: number;
  time: string;
}

export interface ZhongShu {
  high: number;
  low: number;
  center: number;
  startTime: string;
  endTime: string;
}

export interface ChanlunAnalysis {
  timestamp: string;
  currentPrice: number;
  chanlun: {
    bis: BiPoint[];
    zhongshu: ZhongShu[];
    trend: "bullish" | "bearish" | "consolidating" | "neutral";
    strength: number;
    relativeToZS: "above" | "below" | "inside";
    divergence: { topDiv: boolean; bottomDiv: boolean };
  };
  indicators: {
    rsi: number | null;
    bbands: { upper: number; middle: number; lower: number } | null;
    macd: { macd: number; signal: number; histogram: number } | null;
  };
  market: {
    futures: {
      funding_rate: number;
      open_interest: number;
      long_short_ratio: number;
      volume_24h: number;
    } | null;
    fearGreed?: number | null;  // deprecated: 已替换为MFI
    options?: Record<string, unknown> | null;
    liquidation?: unknown[] | null;
  };
  predictions: Prediction[];
  priceHistory: { time: string; price: number }[];
}

export interface Validation {
  timeframe: string;
  predictedDirection: string;
  predictedTarget: number;
  actualPrice: number;
  actualChange: number;
  actualChangePct: number;
  correct: boolean;
  accuracy: "HIT" | "MISS";
}

export interface ValidationResult {
  timestamp: string;
  currentPrice: number;
  validations: Validation[];
}

async function fetchChanlunAnalysis(): Promise<ChanlunAnalysis> {
  const res = await fetch(`${API_BASE}/api/chanlun/analysis`);
  if (!res.ok) throw new Error("Failed to fetch analysis");
  return res.json();
}

export function useChanlunAnalysis(refetchInterval?: number) {
  return useQuery<ChanlunAnalysis>({
    queryKey: ["chanlun", "analysis"],
    queryFn: fetchChanlunAnalysis,
    refetchInterval: refetchInterval || 5 * 60 * 1000, // 5min default
    staleTime: 10 * 1000,
  });
}

async function fetchValidation(predictions: Prediction[]): Promise<ValidationResult> {
  const predStr = encodeURIComponent(JSON.stringify(predictions));
  const res = await fetch(`${API_BASE}/api/chanlun/validate?predictions=${predStr}`);
  if (!res.ok) throw new Error("Failed to validate");
  return res.json();
}

export function useChanlunValidation(predictions: Prediction[] | undefined) {
  return useQuery<ValidationResult>({
    queryKey: ["chanlun", "validation", predictions?.map(p => p.timeframe).join(",")],
    queryFn: () => fetchValidation(predictions!),
    enabled: !!predictions && predictions.length > 0,
    refetchInterval: 15 * 60 * 1000,
    staleTime: 60 * 1000,
  });
}

// ── Backtest Stats Types & Hook ─────────────────────────────────

export interface BacktestRecentPrediction {
  id: number;
  timeframe: string;
  direction: string;
  target_price: number;
  current_price: number;
  actual_price: number;
  prediction_time: string;
  direction_correct: boolean;
  accuracy_grade: "EXACT" | "CLOSE" | "HIT" | "MISS";
  error_pct: number;
  chanlun_correct?: boolean;
  factor_correct?: boolean;
  composite_correct?: boolean;
}

export interface BacktestStats {
  overall: {
    total: number;
    resolved: number;
    pending: number;
    chanlunHitRate: number;
    factorHitRate: number;
    compositeHitRate: number;
    exact_count: number;
    close_count: number;
    avg_error_pct: number | null;
  };
  byTimeframe: Record<string, {
    total: number;
    chanlun_hit_rate: number;
    factor_hit_rate: number;
    composite_hit_rate: number;
    avg_error: number;
  }>;
  byDirection: Record<string, {
    total: number;
    chanlun_hit_rate: number;
    factor_hit_rate: number;
  }>;
  recentPredictions: BacktestRecentPrediction[];
  trend?: {
    date: string;
    sample_size: number;
    chanlun_hit_rate: number;
    factor_hit_rate: number;
    composite_hit_rate: number;
  }[];
}

async function fetchBacktestStats(): Promise<BacktestStats> {
  const res = await fetch(`${API_BASE}/api/backtest/stats`);
  if (!res.ok) throw new Error("Failed to fetch backtest stats");
  return res.json();
}

export function useBacktestStats(refetchInterval?: number) {
  return useQuery<BacktestStats>({
    queryKey: ["backtest", "stats"],
    queryFn: fetchBacktestStats,
    refetchInterval: refetchInterval || 60 * 1000,
    staleTime: 30 * 1000,
  });
}

// ── Polymarket Guide Types & Hook ───────────────────────────────

export interface PolyTimeframe {
  timeframe: string;
  endTimeLocal: string;
  volume: number;
  marketCount: number;
  upDownLink?: string;
  strikeEventSlug?: string;
}

export interface BettingGuide {
  timeframe: string;
  timeframeLabel: string;
  action: string;
  winRate: number;
  chanlunWinRate: number;
  factorWinRate: number;
  compositeWinRate: number;
  scoreLevel: string;
  scoreDesc: string;
  dirStatus: string;
  currentPrice: number;
  basePrice: number;
  predictedPrice: number;
  predictedDelta: number;
  predictedDeltaPct: number;
  aboveProb: number;
  hoursLeft: number;
  marketType: "updown" | "strike";
  marketUpProb?: number;
  marketDownProb?: number;
  reason: string;
  engineAnalysis?: string;
  factors: string[];
  endTimeLocal?: string;
  upDownLink?: string;
  strikeEventSlug?: string;
  volume?: number;
  marketCount?: number;
  ptbSource?: string;  // P8: "oracle_exact" | "pm_api" | "oracle_nearest" | "ws" | "miss"
  pmActionAdvice?: string;
  spotMomentumDesc?: string;
}

export interface PolyStrike {
  strike: number;
  yesPct: number;
  noPct: number;
  volume: number;
  polymarket_link?: string;
}

export interface PolyEvent {
  event_slug: string;
  title: string;
  timeLabel: string;
  date: string;
  impliedPrice: number | null;
  volume: number;
  marketCount: number;
  strikes: PolyStrike[];
}

export interface PolyTimeframe {
  timeframe: string;
  label: string;
}

export interface PolymarketPricesResponse {
  guides: BettingGuide[];
  timeframes: PolyTimeframe[];
  timestamp: string;
}

async function fetchPolymarketPrices(): Promise<PolymarketPricesResponse> {
  const res = await fetch(`${API_BASE}/api/polymarket-prices/prices`);
  if (!res.ok) throw new Error("Failed to fetch polymarket prices");
  return res.json();
}

export function usePolymarketPrices(refetchInterval?: number) {
  return useQuery<PolymarketPricesResponse>({
    queryKey: ["polymarket", "prices"],
    queryFn: fetchPolymarketPrices,
    refetchInterval: refetchInterval || 5 * 60 * 1000,
    staleTime: 10 * 1000,
  });
}
