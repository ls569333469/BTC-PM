/**
 * Prediction Market API — auto-generated from hermod OpenAPI spec.
 * Generated at: 2026-03-20T03:37:53Z
 */

import { proxyGet, proxyPost, type ApiResponse, type KalshiEvent, type KalshiMarketItem, type KalshiOIPoint, type KalshiPricePoint, type KalshiTrade, type KalshiVolumePoint, type PolymarketEvent, type PolymarketMarketItem, type PolymarketOIPoint, type PolymarketPosition, type PolymarketPricePoint, type PolymarketRankingItem, type PolymarketTrade, type PolymarketVolumePoint, type PredictionMarketCategoryMetricsItem } from './api'
import { useQuery, type UseQueryOptions } from '@tanstack/react-query'

/**
 * Get daily notional volume and open interest aggregated by category across Kalshi and Polymarket. Filter by `source` or `category`.

Data refresh: daily
 * - source?: Filter by prediction market platform: `Kalshi` or `Polymarket`
 * - category?: Filter by top-level category
 * - time_range?: Predefined time range: `7d`, `30d`, `90d`, `180d`, `1y`, or `all` (default: 30d)
 * - limit?: Results per page (default: 20) @min 1 @max 100
 * - offset?: Pagination offset (default: 0) @min 0
 */
export async function fetchPredictionMarketCategoryMetrics(params?: { source?: 'Kalshi' | 'Polymarket'; category?: 'crypto' | 'culture' | 'economics' | 'financials' | 'politics' | 'stem' | 'sports'; time_range?: '7d' | '30d' | '90d' | '180d' | '1y' | 'all'; limit?: number; offset?: number }) {
  if (params?.limit !== undefined) params.limit = Math.max(1, Math.min(100, params?.limit))
  if (params?.offset !== undefined) params.offset = Math.max(0, params?.offset)
  const qs: Record<string, string> = {}
  if (params?.source !== undefined) qs['source'] = String(params.source)
  if (params?.category !== undefined) qs['category'] = String(params.category)
  if (params?.time_range !== undefined) qs['time_range'] = String(params.time_range)
  if (params?.limit !== undefined) qs['limit'] = String(params.limit)
  if (params?.offset !== undefined) qs['offset'] = String(params.offset)
  return proxyGet<ApiResponse<PredictionMarketCategoryMetricsItem>>(`prediction-market/category-metrics`, qs)
}

/**
 * Get Kalshi events with nested markets, optionally filtered by `event_ticker`. Each event includes market count and a list of markets.

Data refresh: ~30 minutes
 * - event_ticker: Event ticker identifier
 * - limit?: Results per page (default: 20) @min 1 @max 100
 * - offset?: Pagination offset (default: 0) @min 0
 */
export async function fetchPredictionMarketKalshiEvents(params: { event_ticker: string; limit?: number; offset?: number }) {
  if (params.limit !== undefined) params.limit = Math.max(1, Math.min(100, params.limit))
  if (params.offset !== undefined) params.offset = Math.max(0, params.offset)
  const qs: Record<string, string> = {}
  qs['event_ticker'] = String(params.event_ticker)
  if (params?.limit !== undefined) qs['limit'] = String(params.limit)
  if (params?.offset !== undefined) qs['offset'] = String(params.offset)
  return proxyGet<ApiResponse<KalshiEvent>>(`prediction-market/kalshi/events`, qs)
}

/**
 * Get Kalshi markets, optionally filtered by `market_ticker`. Each market includes price, volume, and status.

Data refresh: ~30 minutes
 * - market_ticker: Market ticker identifier
 * - limit?: Results per page (default: 20) @min 1 @max 100
 * - offset?: Pagination offset (default: 0) @min 0
 */
export async function fetchPredictionMarketKalshiMarkets(params: { market_ticker: string; limit?: number; offset?: number }) {
  if (params.limit !== undefined) params.limit = Math.max(1, Math.min(100, params.limit))
  if (params.offset !== undefined) params.offset = Math.max(0, params.offset)
  const qs: Record<string, string> = {}
  qs['market_ticker'] = String(params.market_ticker)
  if (params?.limit !== undefined) qs['limit'] = String(params.limit)
  if (params?.offset !== undefined) qs['offset'] = String(params.offset)
  return proxyGet<ApiResponse<KalshiMarketItem>>(`prediction-market/kalshi/markets`, qs)
}

/**
 * Get daily open interest history for a Kalshi market filtered by `time_range`.

Data refresh: ~30 minutes
 * - ticker: Market ticker identifier
 * - time_range?: Predefined time range: `7d`, `30d`, `90d`, `180d`, `1y`, or `all` (default: 30d)
 */
export async function fetchPredictionMarketKalshiOpenInterest(params: { ticker: string; time_range?: '7d' | '30d' | '90d' | '180d' | '1y' | 'all' }) {
  const qs: Record<string, string> = {}
  qs['ticker'] = String(params.ticker)
  if (params?.time_range !== undefined) qs['time_range'] = String(params.time_range)
  return proxyGet<ApiResponse<KalshiOIPoint>>(`prediction-market/kalshi/open-interest`, qs)
}

/**
 * Get price history for a Kalshi market. Use `interval=1d` for daily OHLC from market reports (~30 min delay), or `interval=latest` for real-time price from trades.

Data refresh: ~30 minutes (daily), real-time (latest)
 * - ticker: Market ticker identifier
 * - time_range?: Predefined time range: `7d`, `30d`, `90d`, `180d`, `1y`, or `all`. Ignored when `interval=latest`. (default: 30d)
 * - interval?: Data interval: `1d` for daily OHLC from market reports, `latest` for real-time price from trades (default: 1d)
 */
export async function fetchPredictionMarketKalshiPrices(params: { ticker: string; time_range?: '7d' | '30d' | '90d' | '180d' | '1y' | 'all'; interval?: '1d' | 'latest' }) {
  const qs: Record<string, string> = {}
  qs['ticker'] = String(params.ticker)
  if (params?.time_range !== undefined) qs['time_range'] = String(params.time_range)
  if (params?.interval !== undefined) qs['interval'] = String(params.interval)
  return proxyGet<ApiResponse<KalshiPricePoint>>(`prediction-market/kalshi/prices`, qs)
}

/**
 * Get top-ranked Kalshi markets by last day's `notional_volume_usd` or `open_interest`. Filter by `status`.

Data refresh: ~30 minutes
 * - sort_by?: Field to sort results by (default: notional_volume_usd)
 * - order?: Sort order (default: desc)
 * - status?: Market status filter: `active`, `closed`, `determined`, `disputed`, `finalized`, `inactive`, or `initialized` (default: active)
 * - limit?: Results per page (default: 20) @min 1 @max 100
 * - offset?: Pagination offset (default: 0) @min 0
 */
export async function fetchPredictionMarketKalshiRanking(params?: { sort_by?: 'notional_volume_usd' | 'open_interest'; order?: 'asc' | 'desc'; status?: 'active' | 'closed' | 'determined' | 'disputed' | 'finalized' | 'inactive' | 'initialized'; limit?: number; offset?: number }) {
  if (params?.limit !== undefined) params.limit = Math.max(1, Math.min(100, params?.limit))
  if (params?.offset !== undefined) params.offset = Math.max(0, params?.offset)
  const qs: Record<string, string> = {}
  if (params?.sort_by !== undefined) qs['sort_by'] = String(params.sort_by)
  if (params?.order !== undefined) qs['order'] = String(params.order)
  if (params?.status !== undefined) qs['status'] = String(params.status)
  if (params?.limit !== undefined) qs['limit'] = String(params.limit)
  if (params?.offset !== undefined) qs['offset'] = String(params.offset)
  return proxyGet<ApiResponse<KalshiMarketItem>>(`prediction-market/kalshi/ranking`, qs)
}

/**
 * Get individual trade records for a Kalshi market. Filter by `taker_side`, `min_contracts`, and date range. Sort by `timestamp` or `num_contracts`.

Data refresh: real-time
 * - ticker: Market ticker identifier
 * - taker_side?: Filter by taker side: `yes` or `no`
 * - min_amount?: Minimum notional volume in USD (each contract = $1) @min 0
 * - from?: Start of time range. Accepts Unix seconds (`1704067200`) or date string (`2024-01-01`)
 * - to?: End of time range. Accepts Unix seconds (`1706745600`) or date string (`2024-02-01`)
 * - sort_by?: Field to sort results by (default: timestamp)
 * - order?: Sort order (default: desc)
 * - limit?: Results per page (default: 50) @min 1 @max 500
 * - offset?: Pagination offset (default: 0) @min 0
 */
export async function fetchPredictionMarketKalshiTrades(params: { ticker: string; taker_side?: 'yes' | 'no'; min_amount?: number; from?: string; to?: string; sort_by?: 'timestamp' | 'notional_volume_usd'; order?: 'asc' | 'desc'; limit?: number; offset?: number }) {
  if (params.min_amount !== undefined) params.min_amount = Math.max(0, params.min_amount)
  if (params.limit !== undefined) params.limit = Math.max(1, Math.min(500, params.limit))
  if (params.offset !== undefined) params.offset = Math.max(0, params.offset)
  const qs: Record<string, string> = {}
  qs['ticker'] = String(params.ticker)
  if (params?.taker_side !== undefined) qs['taker_side'] = String(params.taker_side)
  if (params?.min_amount !== undefined) qs['min_amount'] = String(params.min_amount)
  if (params?.from !== undefined) qs['from'] = String(params.from)
  if (params?.to !== undefined) qs['to'] = String(params.to)
  if (params?.sort_by !== undefined) qs['sort_by'] = String(params.sort_by)
  if (params?.order !== undefined) qs['order'] = String(params.order)
  if (params?.limit !== undefined) qs['limit'] = String(params.limit)
  if (params?.offset !== undefined) qs['offset'] = String(params.offset)
  return proxyGet<ApiResponse<KalshiTrade>>(`prediction-market/kalshi/trades`, qs)
}

/**
 * Get daily trading volume history for a Kalshi market filtered by `time_range`.

Data refresh: ~30 minutes
 * - ticker: Market ticker identifier
 * - time_range?: Predefined time range: `7d`, `30d`, `90d`, `180d`, `1y`, or `all` (default: 30d)
 */
export async function fetchPredictionMarketKalshiVolumes(params: { ticker: string; time_range?: '7d' | '30d' | '90d' | '180d' | '1y' | 'all' }) {
  const qs: Record<string, string> = {}
  qs['ticker'] = String(params.ticker)
  if (params?.time_range !== undefined) qs['time_range'] = String(params.time_range)
  return proxyGet<ApiResponse<KalshiVolumePoint>>(`prediction-market/kalshi/volumes`, qs)
}

/**
 * Get Polymarket events with nested markets, optionally filtered by `event_slug`. Each event includes aggregated status, volume, and a list of markets with `side_a`/`side_b` outcomes.

Data refresh: ~30 minutes
 * - event_slug: Event slug identifier
 * - limit?: Results per page (default: 20) @min 1 @max 100
 * - offset?: Pagination offset (default: 0) @min 0
 */
export async function fetchPredictionMarketPolymarketEvents(params: { event_slug: string; limit?: number; offset?: number }) {
  if (params.limit !== undefined) params.limit = Math.max(1, Math.min(100, params.limit))
  if (params.offset !== undefined) params.offset = Math.max(0, params.offset)
  const qs: Record<string, string> = {}
  qs['event_slug'] = String(params.event_slug)
  if (params?.limit !== undefined) qs['limit'] = String(params.limit)
  if (params?.offset !== undefined) qs['offset'] = String(params.offset)
  return proxyGet<ApiResponse<PolymarketEvent>>(`prediction-market/polymarket/events`, qs)
}

/**
 * Get Polymarket markets, optionally filtered by `market_slug`. Each market includes `side_a` and `side_b` outcomes. Current prices are available via `/polymarket/prices` using the `condition_id`.

Data refresh: ~30 minutes
 * - market_slug: Market slug identifier
 * - limit?: Results per page (default: 20) @min 1 @max 100
 * - offset?: Pagination offset (default: 0) @min 0
 */
export async function fetchPredictionMarketPolymarketMarkets(params: { market_slug: string; limit?: number; offset?: number }) {
  if (params.limit !== undefined) params.limit = Math.max(1, Math.min(100, params.limit))
  if (params.offset !== undefined) params.offset = Math.max(0, params.offset)
  const qs: Record<string, string> = {}
  qs['market_slug'] = String(params.market_slug)
  if (params?.limit !== undefined) qs['limit'] = String(params.limit)
  if (params?.offset !== undefined) qs['offset'] = String(params.offset)
  return proxyGet<ApiResponse<PolymarketMarketItem>>(`prediction-market/polymarket/markets`, qs)
}

/**
 * Get daily open interest history for a Polymarket market.

Data refresh: ~30 minutes
 * - condition_id: Market condition identifier
 * - time_range?: Predefined time range (default: 30d)
 */
export async function fetchPredictionMarketPolymarketOpenInterest(params: { condition_id: string; time_range?: '7d' | '30d' | '90d' | '180d' | '1y' | 'all' }) {
  const qs: Record<string, string> = {}
  qs['condition_id'] = String(params.condition_id)
  if (params?.time_range !== undefined) qs['time_range'] = String(params.time_range)
  return proxyGet<ApiResponse<PolymarketOIPoint>>(`prediction-market/polymarket/open-interest`, qs)
}

/**
 * Get wallet positions on Polymarket markets.

Data refresh: ~30 minutes
 * - address: Wallet address
 * - condition_id?: Filter by market condition ID
 * - status?: Market status filter: `active` for open markets, `closed` for resolved markets, `all` for both (default: active)
 * - day?: Snapshot date in YYYY-MM-DD format. Defaults to the latest available date
 * - limit?: Results per page (default: 20) @min 1 @max 100
 * - offset?: Pagination offset (default: 0) @min 0
 */
export async function fetchPredictionMarketPolymarketPositions(params: { address: string; condition_id?: string; status?: 'active' | 'closed' | 'all'; day?: string; limit?: number; offset?: number }) {
  if (params.limit !== undefined) params.limit = Math.max(1, Math.min(100, params.limit))
  if (params.offset !== undefined) params.offset = Math.max(0, params.offset)
  const qs: Record<string, string> = {}
  qs['address'] = String(params.address)
  if (params?.condition_id !== undefined) qs['condition_id'] = String(params.condition_id)
  if (params?.status !== undefined) qs['status'] = String(params.status)
  if (params?.day !== undefined) qs['day'] = String(params.day)
  if (params?.limit !== undefined) qs['limit'] = String(params.limit)
  if (params?.offset !== undefined) qs['offset'] = String(params.offset)
  return proxyGet<ApiResponse<PolymarketPosition>>(`prediction-market/polymarket/positions`, qs)
}

/**
 * Get aggregated price history for a Polymarket market. Use `interval=latest` for the most recent price snapshot.

Data refresh: ~30 minutes
 * - condition_id: Market condition identifier
 * - time_range?: Predefined time range. Ignored when `interval` is `latest`. (default: 30d)
 * - interval?: Aggregation interval: `1h` (hourly), `1d` (daily), or `latest` (most recent snapshot) (default: 1d)
 */
export async function fetchPredictionMarketPolymarketPrices(params: { condition_id: string; time_range?: '7d' | '30d' | '90d' | '180d' | '1y' | 'all'; interval?: '1h' | '1d' | 'latest' }) {
  const qs: Record<string, string> = {}
  qs['condition_id'] = String(params.condition_id)
  if (params?.time_range !== undefined) qs['time_range'] = String(params.time_range)
  if (params?.interval !== undefined) qs['interval'] = String(params.interval)
  return proxyGet<ApiResponse<PolymarketPricePoint>>(`prediction-market/polymarket/prices`, qs)
}

/**
 * Get top-ranked Polymarket markets by `volume_24h`, `volume_7d`, `open_interest`, or `trade_count`. Filter by `status` and `end_before`.

Data refresh: ~30 minutes
 * - sort_by?: Sort by last day's `notional_volume_usd` or `open_interest` (default: notional_volume_usd)
 * - order?: Sort order (default: desc)
 * - status?: Market status filter: `active`, `finalized`, `ended`, `initialized`, or `closed` (default: active)
 * - end_before?: Filter markets ending within this window from now: `24h`, `3d`, `7d`, `14d`, or `30d`
 * - limit?: Results per page (default: 20) @min 1 @max 50
 * - offset?: Pagination offset (default: 0) @min 0
 */
export async function fetchPredictionMarketPolymarketRanking(params?: { sort_by?: 'notional_volume_usd' | 'open_interest'; order?: 'asc' | 'desc'; status?: 'active' | 'finalized' | 'ended' | 'initialized' | 'closed'; end_before?: '24h' | '3d' | '7d' | '14d' | '30d'; limit?: number; offset?: number }) {
  if (params?.limit !== undefined) params.limit = Math.max(1, Math.min(50, params?.limit))
  if (params?.offset !== undefined) params.offset = Math.max(0, params?.offset)
  const qs: Record<string, string> = {}
  if (params?.sort_by !== undefined) qs['sort_by'] = String(params.sort_by)
  if (params?.order !== undefined) qs['order'] = String(params.order)
  if (params?.status !== undefined) qs['status'] = String(params.status)
  if (params?.end_before !== undefined) qs['end_before'] = String(params.end_before)
  if (params?.limit !== undefined) qs['limit'] = String(params.limit)
  if (params?.offset !== undefined) qs['offset'] = String(params.offset)
  return proxyGet<ApiResponse<PolymarketRankingItem>>(`prediction-market/polymarket/ranking`, qs)
}

/**
 * Get paginated trade records for a Polymarket market. Filter by `outcome_label`, `min_amount`, and date range. Sort by `newest`, `oldest`, or `largest`.

Data refresh: ~30 minutes
 * - condition_id: Market condition identifier
 * - outcome_label?: Filter by outcome label: `Yes` or `No`
 * - min_amount?: Minimum trade amount in USD @min 0
 * - from?: Start of time range. Accepts Unix seconds (`1704067200`) or date string (`2024-01-01`)
 * - to?: End of time range. Accepts Unix seconds (`1706745600`) or date string (`2024-02-01`)
 * - sort_by?: Field to sort results by (default: timestamp)
 * - order?: Sort order (default: desc)
 * - limit?: Results per page (default: 50) @min 1 @max 500
 * - offset?: Pagination offset (default: 0) @min 0
 */
export async function fetchPredictionMarketPolymarketTrades(params: { condition_id: string; outcome_label?: 'Yes' | 'No'; min_amount?: number; from?: string; to?: string; sort_by?: 'timestamp' | 'notional_volume_usd'; order?: 'asc' | 'desc'; limit?: number; offset?: number }) {
  if (params.min_amount !== undefined) params.min_amount = Math.max(0, params.min_amount)
  if (params.limit !== undefined) params.limit = Math.max(1, Math.min(500, params.limit))
  if (params.offset !== undefined) params.offset = Math.max(0, params.offset)
  const qs: Record<string, string> = {}
  qs['condition_id'] = String(params.condition_id)
  if (params?.outcome_label !== undefined) qs['outcome_label'] = String(params.outcome_label)
  if (params?.min_amount !== undefined) qs['min_amount'] = String(params.min_amount)
  if (params?.from !== undefined) qs['from'] = String(params.from)
  if (params?.to !== undefined) qs['to'] = String(params.to)
  if (params?.sort_by !== undefined) qs['sort_by'] = String(params.sort_by)
  if (params?.order !== undefined) qs['order'] = String(params.order)
  if (params?.limit !== undefined) qs['limit'] = String(params.limit)
  if (params?.offset !== undefined) qs['offset'] = String(params.offset)
  return proxyGet<ApiResponse<PolymarketTrade>>(`prediction-market/polymarket/trades`, qs)
}

/**
 * Get trading volume and trade count history for a Polymarket market.

Data refresh: ~30 minutes
 * - condition_id: Market condition identifier
 * - time_range?: Predefined time range (default: 30d)
 * - interval?: Aggregation interval: `1h` (hourly) or `1d` (daily) (default: 1d)
 */
export async function fetchPredictionMarketPolymarketVolumes(params: { condition_id: string; time_range?: '7d' | '30d' | '90d' | '180d' | '1y' | 'all'; interval?: '1h' | '1d' }) {
  const qs: Record<string, string> = {}
  qs['condition_id'] = String(params.condition_id)
  if (params?.time_range !== undefined) qs['time_range'] = String(params.time_range)
  if (params?.interval !== undefined) qs['interval'] = String(params.interval)
  return proxyGet<ApiResponse<PolymarketVolumePoint>>(`prediction-market/polymarket/volumes`, qs)
}

// ---------------------------------------------------------------------------
// Prediction Market hooks
// ---------------------------------------------------------------------------

type QueryOpts<T> = Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'>

/** Get prediction market category metrics — wraps `fetchPredictionMarketCategoryMetrics` with React Query caching. */
export function usePredictionMarketCategoryMetrics(params?: Parameters<typeof fetchPredictionMarketCategoryMetrics>[0], opts?: QueryOpts<ApiResponse<PredictionMarketCategoryMetricsItem>>) {
  return useQuery({ queryKey: ['prediction', 'market', 'category', 'metrics', params], queryFn: () => fetchPredictionMarketCategoryMetrics(params), ...opts })
}

/** Get Kalshi events — wraps `fetchPredictionMarketKalshiEvents` with React Query caching. */
export function usePredictionMarketKalshiEvents(params: Parameters<typeof fetchPredictionMarketKalshiEvents>[0], opts?: QueryOpts<ApiResponse<KalshiEvent>>) {
  return useQuery({ queryKey: ['prediction', 'market', 'kalshi', 'events', params], queryFn: () => fetchPredictionMarketKalshiEvents(params!), ...opts })
}

/** Get Kalshi markets — wraps `fetchPredictionMarketKalshiMarkets` with React Query caching. */
export function usePredictionMarketKalshiMarkets(params: Parameters<typeof fetchPredictionMarketKalshiMarkets>[0], opts?: QueryOpts<ApiResponse<KalshiMarketItem>>) {
  return useQuery({ queryKey: ['prediction', 'market', 'kalshi', 'markets', params], queryFn: () => fetchPredictionMarketKalshiMarkets(params!), ...opts })
}

/** Get Kalshi open interest history — wraps `fetchPredictionMarketKalshiOpenInterest` with React Query caching. */
export function usePredictionMarketKalshiOpenInterest(params: Parameters<typeof fetchPredictionMarketKalshiOpenInterest>[0], opts?: QueryOpts<ApiResponse<KalshiOIPoint>>) {
  return useQuery({ queryKey: ['prediction', 'market', 'kalshi', 'open', 'interest', params], queryFn: () => fetchPredictionMarketKalshiOpenInterest(params!), ...opts })
}

/** Get Kalshi price history — wraps `fetchPredictionMarketKalshiPrices` with React Query caching. */
export function usePredictionMarketKalshiPrices(params: Parameters<typeof fetchPredictionMarketKalshiPrices>[0], opts?: QueryOpts<ApiResponse<KalshiPricePoint>>) {
  return useQuery({ queryKey: ['prediction', 'market', 'kalshi', 'prices', params], queryFn: () => fetchPredictionMarketKalshiPrices(params!), ...opts })
}

/** Get top Kalshi markets — wraps `fetchPredictionMarketKalshiRanking` with React Query caching. */
export function usePredictionMarketKalshiRanking(params?: Parameters<typeof fetchPredictionMarketKalshiRanking>[0], opts?: QueryOpts<ApiResponse<KalshiMarketItem>>) {
  return useQuery({ queryKey: ['prediction', 'market', 'kalshi', 'ranking', params], queryFn: () => fetchPredictionMarketKalshiRanking(params), ...opts })
}

/** Get Kalshi trades — wraps `fetchPredictionMarketKalshiTrades` with React Query caching. */
export function usePredictionMarketKalshiTrades(params: Parameters<typeof fetchPredictionMarketKalshiTrades>[0], opts?: QueryOpts<ApiResponse<KalshiTrade>>) {
  return useQuery({ queryKey: ['prediction', 'market', 'kalshi', 'trades', params], queryFn: () => fetchPredictionMarketKalshiTrades(params!), ...opts })
}

/** Get Kalshi volume history — wraps `fetchPredictionMarketKalshiVolumes` with React Query caching. */
export function usePredictionMarketKalshiVolumes(params: Parameters<typeof fetchPredictionMarketKalshiVolumes>[0], opts?: QueryOpts<ApiResponse<KalshiVolumePoint>>) {
  return useQuery({ queryKey: ['prediction', 'market', 'kalshi', 'volumes', params], queryFn: () => fetchPredictionMarketKalshiVolumes(params!), ...opts })
}

/** Get Polymarket events — wraps `fetchPredictionMarketPolymarketEvents` with React Query caching. */
export function usePredictionMarketPolymarketEvents(params: Parameters<typeof fetchPredictionMarketPolymarketEvents>[0], opts?: QueryOpts<ApiResponse<PolymarketEvent>>) {
  return useQuery({ queryKey: ['prediction', 'market', 'polymarket', 'events', params], queryFn: () => fetchPredictionMarketPolymarketEvents(params!), ...opts })
}

/** Get Polymarket markets — wraps `fetchPredictionMarketPolymarketMarkets` with React Query caching. */
export function usePredictionMarketPolymarketMarkets(params: Parameters<typeof fetchPredictionMarketPolymarketMarkets>[0], opts?: QueryOpts<ApiResponse<PolymarketMarketItem>>) {
  return useQuery({ queryKey: ['prediction', 'market', 'polymarket', 'markets', params], queryFn: () => fetchPredictionMarketPolymarketMarkets(params!), ...opts })
}

/** Get Polymarket open interest history — wraps `fetchPredictionMarketPolymarketOpenInterest` with React Query caching. */
export function usePredictionMarketPolymarketOpenInterest(params: Parameters<typeof fetchPredictionMarketPolymarketOpenInterest>[0], opts?: QueryOpts<ApiResponse<PolymarketOIPoint>>) {
  return useQuery({ queryKey: ['prediction', 'market', 'polymarket', 'open', 'interest', params], queryFn: () => fetchPredictionMarketPolymarketOpenInterest(params!), ...opts })
}

/** Get Polymarket positions — wraps `fetchPredictionMarketPolymarketPositions` with React Query caching. */
export function usePredictionMarketPolymarketPositions(params: Parameters<typeof fetchPredictionMarketPolymarketPositions>[0], opts?: QueryOpts<ApiResponse<PolymarketPosition>>) {
  return useQuery({ queryKey: ['prediction', 'market', 'polymarket', 'positions', params], queryFn: () => fetchPredictionMarketPolymarketPositions(params!), ...opts })
}

/** Get Polymarket price history — wraps `fetchPredictionMarketPolymarketPrices` with React Query caching. */
export function usePredictionMarketPolymarketPrices(params: Parameters<typeof fetchPredictionMarketPolymarketPrices>[0], opts?: QueryOpts<ApiResponse<PolymarketPricePoint>>) {
  return useQuery({ queryKey: ['prediction', 'market', 'polymarket', 'prices', params], queryFn: () => fetchPredictionMarketPolymarketPrices(params!), ...opts })
}

/** Get top Polymarket markets — wraps `fetchPredictionMarketPolymarketRanking` with React Query caching. */
export function usePredictionMarketPolymarketRanking(params?: Parameters<typeof fetchPredictionMarketPolymarketRanking>[0], opts?: QueryOpts<ApiResponse<PolymarketRankingItem>>) {
  return useQuery({ queryKey: ['prediction', 'market', 'polymarket', 'ranking', params], queryFn: () => fetchPredictionMarketPolymarketRanking(params), ...opts })
}

/** Get Polymarket trades — wraps `fetchPredictionMarketPolymarketTrades` with React Query caching. */
export function usePredictionMarketPolymarketTrades(params: Parameters<typeof fetchPredictionMarketPolymarketTrades>[0], opts?: QueryOpts<ApiResponse<PolymarketTrade>>) {
  return useQuery({ queryKey: ['prediction', 'market', 'polymarket', 'trades', params], queryFn: () => fetchPredictionMarketPolymarketTrades(params!), ...opts })
}

/** Get Polymarket volume history — wraps `fetchPredictionMarketPolymarketVolumes` with React Query caching. */
export function usePredictionMarketPolymarketVolumes(params: Parameters<typeof fetchPredictionMarketPolymarketVolumes>[0], opts?: QueryOpts<ApiResponse<PolymarketVolumePoint>>) {
  return useQuery({ queryKey: ['prediction', 'market', 'polymarket', 'volumes', params], queryFn: () => fetchPredictionMarketPolymarketVolumes(params!), ...opts })
}
