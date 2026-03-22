/**
 * Token API — auto-generated from hermod OpenAPI spec.
 * Generated at: 2026-03-20T03:37:53Z
 */

import { proxyGet, proxyPost, type ApiResponse, type DexTradeItem, type TokenHolderItem, type TokenTransferItem, type TokenUnlockPoint } from './api'
import { useQuery, type UseQueryOptions } from '@tanstack/react-query'

/**
 * Get recent DEX swap events for a token contract address. Covers DEXes like `uniswap`, `sushiswap`, `curve`, and `balancer` on `ethereum` and `base`. Returns trading pair, amounts, USD value, and taker address.

Data refresh: ~24 hours · Chain: Ethereum, Base
 * - address: Token contract address (0x-prefixed hex)
 * - chain?: Chain. Can be `ethereum` or `base`. (default: ethereum)
 * - limit?: Results per page (default: 20) @min 1 @max 100
 * - offset?: Pagination offset (default: 0) @min 0
 */
export async function fetchTokenDexTrades(params: { address: string; chain?: 'ethereum' | 'base'; limit?: number; offset?: number }) {
  if (params.limit !== undefined) params.limit = Math.max(1, Math.min(100, params.limit))
  if (params.offset !== undefined) params.offset = Math.max(0, params.offset)
  const qs: Record<string, string> = {}
  qs['address'] = String(params.address)
  if (params?.chain !== undefined) qs['chain'] = String(params.chain)
  if (params?.limit !== undefined) qs['limit'] = String(params.limit)
  if (params?.offset !== undefined) qs['offset'] = String(params.offset)
  return proxyGet<ApiResponse<DexTradeItem>>(`token/dex-trades`, qs)
}

/**
 * Get top token holders for a contract address — wallet address, balance, and percentage. Lookup by `address` and `chain`. Supports EVM chains and Solana.
 * - address: Token contract address (0x-prefixed hex or Solana base58)
 * - chain: Chain. Can be `ethereum`, `polygon`, `bsc`, `solana`, `avalanche`, `arbitrum`, `optimism`, or `base`.
 * - limit?: Results per page (default: 20) @min 1 @max 100
 * - offset?: Pagination offset (accepted for API consistency but currently ignored) (default: 0) @min 0
 */
export async function fetchTokenHolders(params: { address: string; chain: 'ethereum' | 'polygon' | 'bsc' | 'solana' | 'avalanche' | 'arbitrum' | 'optimism' | 'base'; limit?: number; offset?: number }) {
  if (params.limit !== undefined) params.limit = Math.max(1, Math.min(100, params.limit))
  if (params.offset !== undefined) params.offset = Math.max(0, params.offset)
  const qs: Record<string, string> = {}
  qs['address'] = String(params.address)
  qs['chain'] = String(params.chain)
  if (params?.limit !== undefined) qs['limit'] = String(params.limit)
  if (params?.offset !== undefined) qs['offset'] = String(params.offset)
  return proxyGet<ApiResponse<TokenHolderItem>>(`token/holders`, qs)
}

/**
 * Get token unlock time-series — unlock events with amounts and allocation breakdowns. Lookup by project UUID (`id`) or token `symbol`. Filter by date range with `from`/`to`. Defaults to the current calendar month when omitted. Returns 404 if no token found.
 * - id?: Surf project UUID. PREFERRED — always use this when available from a previous response. Takes priority over symbol.
 * - symbol?: Token symbol like `ARB`, `OP`, or `APT`
 * - from?: Start of time range. Accepts Unix seconds (`1704067200`) or date string (`2024-01-01`)
 * - to?: End of time range. Accepts Unix seconds (`1735689600`) or date string (`2025-01-01`)
 */
export async function fetchTokenTokenomics(params?: { id?: string; symbol?: string; from?: string; to?: string }) {
  const qs: Record<string, string> = {}
  if (params?.id !== undefined) qs['id'] = String(params.id)
  if (params?.symbol !== undefined) qs['symbol'] = String(params.symbol)
  if (params?.from !== undefined) qs['from'] = String(params.from)
  if (params?.to !== undefined) qs['to'] = String(params.to)
  return proxyGet<ApiResponse<TokenUnlockPoint>>(`token/tokenomics`, qs)
}

/**
 * Get recent transfer events **for a specific token** (ERC-20 contract). Pass the **token contract address** in `address` — returns every on-chain transfer of that token regardless of sender/receiver. Each record includes sender, receiver, raw amount, and block timestamp.

Use this to analyze a token's on-chain activity (e.g. large movements, distribution patterns).

Lookup: `address` (token contract) + `chain`. Sort by `asc` or `desc`.
Data refresh: ~24 hours · Chain: Ethereum, Base (Solana uses a different source with no delay)
 * - address: Token contract address (0x-prefixed hex or Solana base58)
 * - chain: Chain. Can be `ethereum`, `base`, or `solana`.
 * - from?: Start of date range. Accepts Unix seconds or YYYY-MM-DD. Defaults to 30 days ago.
 * - to?: End of date range. Accepts Unix seconds or YYYY-MM-DD. Defaults to today.
 * - limit?: Results per page (default: 20) @min 1 @max 100
 * - offset?: Pagination offset (default: 0) @min 0
 */
export async function fetchTokenTransfers(params: { address: string; chain: 'ethereum' | 'base' | 'solana'; from?: string; to?: string; limit?: number; offset?: number }) {
  if (params.limit !== undefined) params.limit = Math.max(1, Math.min(100, params.limit))
  if (params.offset !== undefined) params.offset = Math.max(0, params.offset)
  const qs: Record<string, string> = {}
  qs['address'] = String(params.address)
  qs['chain'] = String(params.chain)
  if (params?.from !== undefined) qs['from'] = String(params.from)
  if (params?.to !== undefined) qs['to'] = String(params.to)
  if (params?.limit !== undefined) qs['limit'] = String(params.limit)
  if (params?.offset !== undefined) qs['offset'] = String(params.offset)
  return proxyGet<ApiResponse<TokenTransferItem>>(`token/transfers`, qs)
}

// ---------------------------------------------------------------------------
// Token hooks
// ---------------------------------------------------------------------------

type QueryOpts<T> = Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'>

/** Get token DEX trade history — wraps `fetchTokenDexTrades` with React Query caching. */
export function useTokenDexTrades(params: Parameters<typeof fetchTokenDexTrades>[0], opts?: QueryOpts<ApiResponse<DexTradeItem>>) {
  return useQuery({ queryKey: ['token', 'dex', 'trades', params], queryFn: () => fetchTokenDexTrades(params!), ...opts })
}

/** Get token holders — wraps `fetchTokenHolders` with React Query caching. */
export function useTokenHolders(params: Parameters<typeof fetchTokenHolders>[0], opts?: QueryOpts<ApiResponse<TokenHolderItem>>) {
  return useQuery({ queryKey: ['token', 'holders', params], queryFn: () => fetchTokenHolders(params!), ...opts })
}

/** Get token unlock schedule — wraps `fetchTokenTokenomics` with React Query caching. */
export function useTokenTokenomics(params?: Parameters<typeof fetchTokenTokenomics>[0], opts?: QueryOpts<ApiResponse<TokenUnlockPoint>>) {
  return useQuery({ queryKey: ['token', 'tokenomics', params], queryFn: () => fetchTokenTokenomics(params), ...opts })
}

/** Get token transfers — wraps `fetchTokenTransfers` with React Query caching. */
export function useTokenTransfers(params: Parameters<typeof fetchTokenTransfers>[0], opts?: QueryOpts<ApiResponse<TokenTransferItem>>) {
  return useQuery({ queryKey: ['token', 'transfers', params], queryFn: () => fetchTokenTransfers(params!), ...opts })
}
