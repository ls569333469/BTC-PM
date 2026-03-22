/**
 * Market API — auto-generated from hermod OpenAPI spec.
 * Generated at: 2026-03-20T03:37:53Z
 */

import { proxyGet, proxyPost, type ApiResponse, type MarketTopCoinItem } from './api'
import { useQuery, type UseQueryOptions } from '@tanstack/react-query'

/**
 * Get daily ETF flow history for US spot ETFs — net flow (USD), token price, and per-ticker breakdown. Sorted by date descending. `symbol`: `BTC` or `ETH`.
 * - symbol: Token symbol. Can be `BTC` or `ETH`.
 * - sort_by?: Field to sort results by (default: timestamp)
 * - order?: Sort order (default: desc)
 * - from?: Start of time range. Accepts Unix seconds or date string (YYYY-MM-DD)
 * - to?: End of time range. Accepts Unix seconds or date string (YYYY-MM-DD)
 */
export async function fetchMarketEtf(params: { symbol: 'BTC' | 'ETH'; sort_by?: 'flow_usd' | 'timestamp'; order?: 'asc' | 'desc'; from?: string; to?: string }) {
  const qs: Record<string, string> = {}
  qs['symbol'] = String(params.symbol)
  if (params?.sort_by !== undefined) qs['sort_by'] = String(params.sort_by)
  if (params?.order !== undefined) qs['order'] = String(params.order)
  if (params?.from !== undefined) qs['from'] = String(params.from)
  if (params?.to !== undefined) qs['to'] = String(params.to)
  return proxyGet<any>(`market/etf`, qs)
}

/**
 * Get Bitcoin Fear & Greed Index history — index value (0-100), classification label, and BTC price at each data point. Sorted newest-first. Use `from`/`to` to filter by date range.
 * - from?: Start of time range. Accepts Unix seconds or date string (YYYY-MM-DD)
 * - to?: End of time range. Accepts Unix seconds or date string (YYYY-MM-DD)
 */
export async function fetchMarketFearGreed(params?: { from?: string; to?: string }) {
  const qs: Record<string, string> = {}
  if (params?.from !== undefined) qs['from'] = String(params.from)
  if (params?.to !== undefined) qs['to'] = String(params.to)
  return proxyGet<any>(`market/fear-greed`, qs)
}

/**
 * Get futures market data across all tracked tokens — open interest, funding rate, long/short ratio, and 24h volume. Sort by `sort_by` (default: volume_24h).
 * - sort_by?: Field to sort results by (default: volume_24h)
 * - order?: Sort order (default: desc)
 */
export async function fetchMarketFutures(params?: { sort_by?: 'open_interest' | 'funding_rate' | 'volume_24h' | 'long_short_ratio'; order?: 'asc' | 'desc' }) {
  const qs: Record<string, string> = {}
  if (params?.sort_by !== undefined) qs['sort_by'] = String(params.sort_by)
  if (params?.order !== undefined) qs['order'] = String(params.order)
  return proxyGet<any>(`market/futures`, qs)
}

/**
 * Get OHLC-style aggregated liquidation data for a token on a specific exchange. Filter by `symbol`, `exchange`, and `interval`. Useful for charting liquidation volume over time.
 * - symbol: Token ticker symbol like `BTC` or `ETH`
 * - interval?: Candlestick interval. Can be `1m`, `3m`, `5m`, `15m`, `30m`, `1h`, `4h`, `6h`, `8h`, `12h`, `1d`, or `1w`. (default: 1h)
 * - exchange?: Exchange name. Can be `Binance`, `OKX`, `Bybit`, `Bitget`, `Hyperliquid`, `Gate`, `HTX`, `Bitmex`, `Bitfinex`, `CoinEx`, `Aster`, or `Lighter`. (default: Binance)
 * - limit?: Results per page (default: 500) @min 1 @max 4500
 * - from?: Start of time range. Accepts Unix seconds (`1704067200`) or date string (`2024-01-01`)
 * - to?: End of time range. Accepts Unix seconds (`1706745600`) or date string (`2024-02-01`)
 */
export async function fetchMarketLiquidationChart(params: { symbol: string; interval?: '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '4h' | '6h' | '8h' | '12h' | '1d' | '1w'; exchange?: 'Binance' | 'OKX' | 'Bybit' | 'Bitget' | 'Hyperliquid' | 'Gate' | 'HTX' | 'Bitmex' | 'Bitfinex' | 'CoinEx' | 'Aster' | 'Lighter'; limit?: number; from?: string; to?: string }) {
  if (params.limit !== undefined) params.limit = Math.max(1, Math.min(4500, params.limit))
  const qs: Record<string, string> = {}
  qs['symbol'] = String(params.symbol)
  if (params?.interval !== undefined) qs['interval'] = String(params.interval)
  if (params?.exchange !== undefined) qs['exchange'] = String(params.exchange)
  if (params?.limit !== undefined) qs['limit'] = String(params.limit)
  if (params?.from !== undefined) qs['from'] = String(params.from)
  if (params?.to !== undefined) qs['to'] = String(params.to)
  return proxyGet<any>(`market/liquidation/chart`, qs)
}

/**
 * Get liquidation breakdown by exchange — total, long, and short volumes in USD. Filter by `symbol` and `time_range` (`1h`, `4h`, `12h`, `24h`).
 * - symbol?: Token ticker symbol like `BTC` or `ETH` (default: BTC)
 * - time_range?: Aggregation time range. Can be `1h`, `4h`, `12h`, or `24h`. (default: 24h)
 * - sort_by?: Field to sort results by (default: liquidation_usd)
 * - order?: Sort order (default: desc)
 */
export async function fetchMarketLiquidationExchangeList(params?: { symbol?: string; time_range?: '1h' | '4h' | '12h' | '24h'; sort_by?: 'liquidation_usd' | 'long_liquidation_usd' | 'short_liquidation_usd'; order?: 'asc' | 'desc' }) {
  const qs: Record<string, string> = {}
  if (params?.symbol !== undefined) qs['symbol'] = String(params.symbol)
  if (params?.time_range !== undefined) qs['time_range'] = String(params.time_range)
  if (params?.sort_by !== undefined) qs['sort_by'] = String(params.sort_by)
  if (params?.order !== undefined) qs['order'] = String(params.order)
  return proxyGet<any>(`market/liquidation/exchange-list`, qs)
}

/**
 * Get individual large liquidation orders above a USD threshold (`min_amount`, default 10000). Filter by `exchange` and `symbol`.

For aggregate totals and long/short breakdown by exchange, use `/market/liquidation/exchange-list`. For historical liquidation charts, use `/market/liquidation/chart`.
 * - exchange?: Exchange name. Can be `Binance`, `OKX`, `Bybit`, `Bitget`, `Hyperliquid`, `Gate`, `HTX`, `Bitmex`, `Bitfinex`, `CoinEx`, `Aster`, or `Lighter`. (default: Binance)
 * - symbol?: Token ticker symbol like `BTC` or `ETH` (default: BTC)
 * - min_amount?: Minimum liquidation amount in USD (default: 10000)
 * - side?: Filter by liquidation side. Omit to return both.
 * - sort_by?: Field to sort results by (default: timestamp)
 * - order?: Sort order (default: desc)
 * - from?: Start of time range. Accepts Unix seconds (`1704067200`) or date string (`2024-01-01`)
 * - to?: End of time range. Accepts Unix seconds (`1706745600`) or date string (`2024-02-01`)
 */
export async function fetchMarketLiquidationOrder(params?: { exchange?: 'Binance' | 'OKX' | 'Bybit' | 'Bitget' | 'Hyperliquid' | 'Gate' | 'HTX' | 'Bitmex' | 'Bitfinex' | 'CoinEx' | 'Aster' | 'Lighter'; symbol?: string; min_amount?: string; side?: 'long' | 'short'; sort_by?: 'usd_value' | 'timestamp' | 'price'; order?: 'asc' | 'desc'; from?: string; to?: string }) {
  const qs: Record<string, string> = {}
  if (params?.exchange !== undefined) qs['exchange'] = String(params.exchange)
  if (params?.symbol !== undefined) qs['symbol'] = String(params.symbol)
  if (params?.min_amount !== undefined) qs['min_amount'] = String(params.min_amount)
  if (params?.side !== undefined) qs['side'] = String(params.side)
  if (params?.sort_by !== undefined) qs['sort_by'] = String(params.sort_by)
  if (params?.order !== undefined) qs['order'] = String(params.order)
  if (params?.from !== undefined) qs['from'] = String(params.from)
  if (params?.to !== undefined) qs['to'] = String(params.to)
  return proxyGet<any>(`market/liquidation/order`, qs)
}

/**
 * Get on-chain indicator time-series for BTC or ETH. Metrics: `nupl`, `sopr`, `mvrv`, `puell-multiple`, `nvm`, `nvt`, `nvt-golden-cross`, `exchange-flows` (inflow/outflow/netflow/reserve).
 * - symbol: Token ticker symbol. Can be `BTC` or `ETH`.
 * - metric: On-chain metric name. Can be `nupl`, `sopr`, `mvrv`, `puell-multiple`, `nvm`, `nvt`, `nvt-golden-cross`, or `exchange-flows/{inflow,outflow,netflow,reserve}`.
 * - granularity?: Aggregation granularity. (default: day)
 * - from?: Start of time range. Accepts Unix seconds or date string (YYYY-MM-DD). Defaults to 90 days ago when omitted. Maximum range is 365 days.
 * - to?: End of time range. Accepts Unix seconds or date string (YYYY-MM-DD). Defaults to today when omitted. Maximum range is 365 days.
 * - exchange?: Exchange filter (only applies to exchange-flow metrics). Can be `all_exchange`, `spot_exchange`, `derivative_exchange`, `binance`, `bybit`, `kraken`, or `okx`. (default: all_exchange)
 */
export async function fetchMarketOnchainIndicator(params: { symbol: 'BTC' | 'ETH'; metric: 'nupl' | 'sopr' | 'mvrv' | 'puell-multiple' | 'nvm' | 'nvt' | 'nvt-golden-cross' | 'exchange-flows/inflow' | 'exchange-flows/outflow' | 'exchange-flows/netflow' | 'exchange-flows/reserve'; granularity?: 'day'; from?: string; to?: string; exchange?: 'all_exchange' | 'spot_exchange' | 'derivative_exchange' | 'binance' | 'bybit' | 'kraken' | 'okx' }) {
  const qs: Record<string, string> = {}
  qs['symbol'] = String(params.symbol)
  qs['metric'] = String(params.metric)
  if (params?.granularity !== undefined) qs['granularity'] = String(params.granularity)
  if (params?.from !== undefined) qs['from'] = String(params.from)
  if (params?.to !== undefined) qs['to'] = String(params.to)
  if (params?.exchange !== undefined) qs['exchange'] = String(params.exchange)
  return proxyGet<any>(`market/onchain-indicator`, qs)
}

/**
 * Get options market data — open interest, volume, put/call ratio, and max pain price for a `symbol`.
 * - symbol: Token symbol. Can be `BTC`, `ETH`, `SOL`, `XRP`, `BNB`, `DOGE`, `ADA`, or `AVAX`.
 * - sort_by?: Field to sort results by (default: volume_24h)
 * - order?: Sort order (default: desc)
 */
export async function fetchMarketOptions(params: { symbol: 'BTC' | 'ETH' | 'SOL' | 'XRP' | 'BNB' | 'DOGE' | 'ADA' | 'AVAX'; sort_by?: 'open_interest' | 'volume_24h'; order?: 'asc' | 'desc' }) {
  const qs: Record<string, string> = {}
  qs['symbol'] = String(params.symbol)
  if (params?.sort_by !== undefined) qs['sort_by'] = String(params.sort_by)
  if (params?.order !== undefined) qs['order'] = String(params.order)
  return proxyGet<any>(`market/options`, qs)
}

/**
 * Get historical price data points for a token. Use `time_range` for predefined windows (`1d`, `7d`, `14d`, `30d`, `90d`, `180d`, `365d`, `max`) or `from`/`to` for a custom date range (Unix timestamp or YYYY-MM-DD). Granularity is automatic: 5-min for 1d, hourly for 7-90d, daily for 180d+.
 * - symbol: Single token ticker symbol like `BTC`, `ETH`, or `SOL` (multi-symbol not supported)
 * - time_range?: Predefined time range for historical data. Ignored when `from`/`to` are set. Can be `1d`, `7d`, `14d`, `30d`, `90d`, `180d`, `365d`, or `max`. (default: 30d)
 * - from?: Start of custom date range (Unix timestamp or YYYY-MM-DD). Must be used together with `to`. Overrides `time_range` when set.
 * - to?: End of custom date range (Unix timestamp or YYYY-MM-DD). Must be used together with `from`. Overrides `time_range` when set.
 * - currency?: Quote currency like `usd`, `eur`, or `btc` (default: usd)
 */
export async function fetchMarketPrice(params: { symbol: string; time_range?: '1d' | '7d' | '14d' | '30d' | '90d' | '180d' | '365d' | 'max'; from?: string; to?: string; currency?: string }) {
  const qs: Record<string, string> = {}
  qs['symbol'] = String(params.symbol)
  if (params?.time_range !== undefined) qs['time_range'] = String(params.time_range)
  if (params?.from !== undefined) qs['from'] = String(params.from)
  if (params?.to !== undefined) qs['to'] = String(params.to)
  if (params?.currency !== undefined) qs['currency'] = String(params.currency)
  return proxyGet<any>(`market/price`, qs)
}

/**
 * Get a technical indicator for a trading pair on a given exchange and interval. Set `from`/`to` for time-series mode, omit for latest value. Use `options` for indicator-specific tuning (e.g. `period:7`, `fast_period:8,slow_period:21,signal_period:5`, `period:10,stddev:1.5`). Indicators: `rsi`, `macd`, `ema`, `sma`, `bbands`, `stoch`, `adx`, `atr`, `cci`, `obv`, `vwap`, `dmi`, `ichimoku`, `supertrend`.
 * - indicator: Technical indicator name. Can be `rsi`, `macd`, `ema`, `sma`, `bbands`, `stoch`, `adx`, `atr`, `cci`, `obv`, `vwap`, `dmi`, `ichimoku`, or `supertrend`.
 * - symbol: Trading pair as `BTC/USDT` or bare symbol like `BTC`
 * - interval?: Candlestick interval. Can be `1m`, `5m`, `15m`, `30m`, `1h`, `2h`, `4h`, `12h`, `1d`, or `1w`. (default: 1d)
 * - exchange?: Exchange for price data. Can be `binance`, `bybit`, `coinbase`, or `kraken`. (default: binance)
 * - from?: Start of time range. When set, returns time-series instead of latest value. Accepts Unix seconds (`1704067200`) or date string (`2024-01-01`)
 * - to?: End of time range. Defaults to now when from is set. Accepts Unix seconds (`1706745600`) or date string (`2024-02-01`)
 * - options?: Indicator-specific options as comma-separated key:value pairs. Available options by indicator: `period` — lookback period for rsi (default 14), sma (default 20), ema (default 20), bbands (default 20), adx (default 14), atr (default 14), cci (default 20), dmi (default 14), stoch (default 14), supertrend (default 10). `stddev` — standard deviation for bbands (default 2). `multiplier` — multiplier for supertrend (default 3). `fast_period` — MACD fast EMA (default 12). `slow_period` — MACD slow EMA (default 26). `signal_period` — MACD signal smoothing (default 9). Examples: `period:7`, `period:200`, `fast_period:8,slow_period:21,signal_period:5`, `period:10,stddev:1.5`.
 */
export async function fetchMarketPriceIndicator(params: { indicator: 'rsi' | 'macd' | 'ema' | 'sma' | 'bbands' | 'stoch' | 'adx' | 'atr' | 'cci' | 'obv' | 'vwap' | 'dmi' | 'ichimoku' | 'supertrend'; symbol: string; interval?: '1m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '12h' | '1d' | '1w'; exchange?: 'binance' | 'bybit' | 'coinbase' | 'kraken'; from?: string; to?: string; options?: string }) {
  const qs: Record<string, string> = {}
  qs['indicator'] = String(params.indicator)
  qs['symbol'] = String(params.symbol)
  if (params?.interval !== undefined) qs['interval'] = String(params.interval)
  if (params?.exchange !== undefined) qs['exchange'] = String(params.exchange)
  if (params?.from !== undefined) qs['from'] = String(params.from)
  if (params?.to !== undefined) qs['to'] = String(params.to)
  if (params?.options !== undefined) qs['options'] = String(params.options)
  return proxyGet<any>(`market/price-indicator`, qs)
}

/**
 * List tokens ranked by metric. Available metrics: `market_cap`, `top_gainers`, `top_losers`, `volume`. Note: `top_gainers` and `top_losers` rank by 24h price change within the top 250 coins by market cap.

For circulating supply, FDV, ATH/ATL, use `/project/detail?fields=token_info`.
 * - sort_by?: Field to sort by. `market_cap` sorts by total market capitalisation, `change_24h` sorts by 24-hour price change percentage (fetches top 250 by market cap then sorts client-side), `volume_24h` sorts by 24-hour trading volume. (default: market_cap)
 * - order?: Sort order: `desc` (default, highest first) or `asc` (lowest first). (default: desc)
 * - category?: Optional token category filter. When provided, results are limited to coins in that category. Supported values: MEME, AI, AI_AGENTS, L1, L2, DEFI, GAMING, STABLECOIN, RWA, DEPIN, SOL_ECO, BASE_ECO, LST.
 * - limit?: Results per page (default: 20) @min 1 @max 100
 * - offset?: Pagination offset (default: 0) @min 0
 */
export async function fetchMarketRanking(params?: { sort_by?: 'market_cap' | 'change_24h' | 'volume_24h'; order?: 'asc' | 'desc'; category?: 'MEME' | 'AI' | 'AI_AGENTS' | 'L1' | 'L2' | 'DEFI' | 'GAMING' | 'STABLECOIN' | 'RWA' | 'DEPIN' | 'SOL_ECO' | 'BASE_ECO' | 'LST'; limit?: number; offset?: number }) {
  if (params?.limit !== undefined) params.limit = Math.max(1, Math.min(100, params?.limit))
  if (params?.offset !== undefined) params.offset = Math.max(0, params?.offset)
  const qs: Record<string, string> = {}
  if (params?.sort_by !== undefined) qs['sort_by'] = String(params.sort_by)
  if (params?.order !== undefined) qs['order'] = String(params.order)
  if (params?.category !== undefined) qs['category'] = String(params.category)
  if (params?.limit !== undefined) qs['limit'] = String(params.limit)
  if (params?.offset !== undefined) qs['offset'] = String(params.offset)
  return proxyGet<ApiResponse<MarketTopCoinItem>>(`market/ranking`, qs)
}

// ---------------------------------------------------------------------------
// Market hooks
// ---------------------------------------------------------------------------

type QueryOpts<T> = Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'>

/** Get ETF flow history — wraps `fetchMarketEtf` with React Query caching. */
export function useMarketEtf(params: Parameters<typeof fetchMarketEtf>[0], opts?: QueryOpts<any>) {
  return useQuery({ queryKey: ['market', 'etf', params], queryFn: () => fetchMarketEtf(params!), ...opts })
}

/** Get Fear & Greed Index history — wraps `fetchMarketFearGreed` with React Query caching. */
export function useMarketFearGreed(params?: Parameters<typeof fetchMarketFearGreed>[0], opts?: QueryOpts<any>) {
  return useQuery({ queryKey: ['market', 'fear', 'greed', params], queryFn: () => fetchMarketFearGreed(params), ...opts })
}

/** Get futures data — wraps `fetchMarketFutures` with React Query caching. */
export function useMarketFutures(params?: Parameters<typeof fetchMarketFutures>[0], opts?: QueryOpts<any>) {
  return useQuery({ queryKey: ['market', 'futures', params], queryFn: () => fetchMarketFutures(params), ...opts })
}

/** Get liquidation chart — wraps `fetchMarketLiquidationChart` with React Query caching. */
export function useMarketLiquidationChart(params: Parameters<typeof fetchMarketLiquidationChart>[0], opts?: QueryOpts<any>) {
  return useQuery({ queryKey: ['market', 'liquidation', 'chart', params], queryFn: () => fetchMarketLiquidationChart(params!), ...opts })
}

/** Get liquidation by exchange — wraps `fetchMarketLiquidationExchangeList` with React Query caching. */
export function useMarketLiquidationExchangeList(params?: Parameters<typeof fetchMarketLiquidationExchangeList>[0], opts?: QueryOpts<any>) {
  return useQuery({ queryKey: ['market', 'liquidation', 'exchange', 'list', params], queryFn: () => fetchMarketLiquidationExchangeList(params), ...opts })
}

/** Get large liquidation orders — wraps `fetchMarketLiquidationOrder` with React Query caching. */
export function useMarketLiquidationOrder(params?: Parameters<typeof fetchMarketLiquidationOrder>[0], opts?: QueryOpts<any>) {
  return useQuery({ queryKey: ['market', 'liquidation', 'order', params], queryFn: () => fetchMarketLiquidationOrder(params), ...opts })
}

/** Get on-chain indicator — wraps `fetchMarketOnchainIndicator` with React Query caching. */
export function useMarketOnchainIndicator(params: Parameters<typeof fetchMarketOnchainIndicator>[0], opts?: QueryOpts<any>) {
  return useQuery({ queryKey: ['market', 'onchain', 'indicator', params], queryFn: () => fetchMarketOnchainIndicator(params!), ...opts })
}

/** Get options data — wraps `fetchMarketOptions` with React Query caching. */
export function useMarketOptions(params: Parameters<typeof fetchMarketOptions>[0], opts?: QueryOpts<any>) {
  return useQuery({ queryKey: ['market', 'options', params], queryFn: () => fetchMarketOptions(params!), ...opts })
}

/** Get price history — wraps `fetchMarketPrice` with React Query caching. */
export function useMarketPrice(params: Parameters<typeof fetchMarketPrice>[0], opts?: QueryOpts<any>) {
  return useQuery({ queryKey: ['market', 'price', params], queryFn: () => fetchMarketPrice(params!), ...opts })
}

/** Get technical indicator — wraps `fetchMarketPriceIndicator` with React Query caching. */
export function useMarketPriceIndicator(params: Parameters<typeof fetchMarketPriceIndicator>[0], opts?: QueryOpts<any>) {
  return useQuery({ queryKey: ['market', 'price', 'indicator', params], queryFn: () => fetchMarketPriceIndicator(params!), ...opts })
}

/** Get token rankings — wraps `fetchMarketRanking` with React Query caching. */
export function useMarketRanking(params?: Parameters<typeof fetchMarketRanking>[0], opts?: QueryOpts<ApiResponse<MarketTopCoinItem>>) {
  return useQuery({ queryKey: ['market', 'ranking', params], queryFn: () => fetchMarketRanking(params), ...opts })
}
