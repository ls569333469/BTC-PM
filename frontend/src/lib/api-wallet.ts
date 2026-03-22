/**
 * Wallet API — auto-generated from hermod OpenAPI spec.
 * Generated at: 2026-03-20T03:37:53Z
 */

import { proxyGet, proxyPost, type ApiResponse, type ApiObjectResponse, type WalletDetailBody, type WalletHistoryItem, type WalletLabelItem, type WalletNetWorthPoint, type WalletProtocolItem, type WalletTransferItem } from './api'
import { useQuery, type UseQueryOptions } from '@tanstack/react-query'

/**
 * Get multiple wallet sub-resources in a single request. Lookup by `address`. Use `fields` to select: `balance`, `tokens`, `labels`, `nft`. Partial failures return available fields with per-field error info. Returns 422 if `fields` is invalid.
 * - address: Wallet address (0x hex for EVM, base58 for Solana)
 * - chain?: Chain filter for `tokens`, `nft`, and `approvals`. When omitted, inferred from address format: 0x addresses query all EVM chains, base58 addresses query Solana.
 * - fields?: Comma-separated sub-resources to include. Valid: `balance`, `tokens`, `labels`, `nft`, `approvals`. The `active_chains` field is always returned. `approvals` is opt-in (not in default) as it triggers additional upstream calls. (default: balance,tokens,labels,nft)
 */
export async function fetchWalletDetail(params: { address: string; chain?: 'ethereum' | 'polygon' | 'bsc' | 'avalanche' | 'arbitrum' | 'optimism' | 'fantom' | 'base' | 'solana'; fields?: string }) {
  const qs: Record<string, string> = {}
  qs['address'] = String(params.address)
  if (params?.chain !== undefined) qs['chain'] = String(params.chain)
  if (params?.fields !== undefined) qs['fields'] = String(params.fields)
  return proxyGet<ApiObjectResponse<WalletDetailBody>>(`wallet/detail`, qs)
}

/**
 * Get full transaction history for a wallet — swaps, transfers, and contract interactions. Lookup by `address`. Filter by `chain` — supports `ethereum`, `polygon`, `bsc`, `arbitrum`, `optimism`, `avalanche`, `fantom`, `base`.
 * - address: Wallet address — must be a raw 0x-prefixed hex address, not an ENS name
 * - chain?: Chain filter. Can be `ethereum`, `polygon`, `bsc`, `avalanche`, `arbitrum`, `optimism`, `fantom`, or `base`. (default: ethereum)
 * - limit?: Results per page (default: 20) @min 1 @max 100
 * - offset?: Pagination offset (default: 0) @min 0
 * - sort_by?: Field to sort results by (default: timestamp)
 * - order?: Sort order (default: desc)
 */
export async function fetchWalletHistory(params: { address: string; chain?: 'ethereum' | 'polygon' | 'bsc' | 'avalanche' | 'arbitrum' | 'optimism' | 'fantom' | 'base'; limit?: number; offset?: number; sort_by?: 'timestamp' | 'value'; order?: 'asc' | 'desc' }) {
  if (params.limit !== undefined) params.limit = Math.max(1, Math.min(100, params.limit))
  if (params.offset !== undefined) params.offset = Math.max(0, params.offset)
  const qs: Record<string, string> = {}
  qs['address'] = String(params.address)
  if (params?.chain !== undefined) qs['chain'] = String(params.chain)
  if (params?.limit !== undefined) qs['limit'] = String(params.limit)
  if (params?.offset !== undefined) qs['offset'] = String(params.offset)
  if (params?.sort_by !== undefined) qs['sort_by'] = String(params.sort_by)
  if (params?.order !== undefined) qs['order'] = String(params.order)
  return proxyGet<ApiResponse<WalletHistoryItem>>(`wallet/history`, qs)
}

/**
 * Get entity labels for multiple wallet addresses. Pass up to 100 comma-separated addresses via the `addresses` query parameter. Returns entity name, type, and labels per address.
 * - addresses: Comma-separated wallet addresses to look up, max 100
 */
export async function fetchWalletLabelsBatch(params: { addresses: string }) {
  const qs: Record<string, string> = {}
  qs['addresses'] = String(params.addresses)
  return proxyGet<ApiResponse<WalletLabelItem>>(`wallet/labels/batch`, qs)
}

/**
 * Get a time-series of the wallet's total net worth in USD. Returns ~288 data points at 5-minute intervals covering the last 24 hours. Fixed window — no custom time range supported.
 * - address: Wallet address (0x hex, base58, or ENS name like `vitalik.eth`)
 */
export async function fetchWalletNetWorth(params: { address: string }) {
  const qs: Record<string, string> = {}
  qs['address'] = String(params.address)
  return proxyGet<ApiResponse<WalletNetWorthPoint>>(`wallet/net-worth`, qs)
}

/**
 * Get all DeFi protocol positions for a wallet — lending, staking, LP, and farming with token breakdowns and USD values. Lookup by `address`.
 * - address: Wallet address — must be a raw 0x-prefixed hex address, not an ENS name
 * - limit?: Results per page (default: 20) @min 1 @max 100
 * - offset?: Pagination offset (default: 0) @min 0
 */
export async function fetchWalletProtocols(params: { address: string; limit?: number; offset?: number }) {
  if (params.limit !== undefined) params.limit = Math.max(1, Math.min(100, params.limit))
  if (params.offset !== undefined) params.offset = Math.max(0, params.offset)
  const qs: Record<string, string> = {}
  qs['address'] = String(params.address)
  if (params?.limit !== undefined) qs['limit'] = String(params.limit)
  if (params?.offset !== undefined) qs['offset'] = String(params.offset)
  return proxyGet<ApiResponse<WalletProtocolItem>>(`wallet/protocols`, qs)
}

/**
 * Get recent token transfers **sent or received by a wallet**. Pass the **wallet address** in `address` — returns all ERC-20/SPL token transfers where this wallet is the sender or receiver. Each record includes token contract, counterparty, raw amount, and block timestamp.

Use this to audit a wallet's token flow (e.g. inflows, outflows, airdrop receipts).

Lookup: `address` (wallet, raw 0x hex or base58 — ENS not supported). Filter by `chain` — supports `ethereum`, `base`, `solana`.
Data refresh: ~24 hours · Chain: Ethereum, Base (Solana uses a different source with no delay)
 * - address: Wallet address — must be a raw address (0x-prefixed hex for EVM, base58 for Solana). ENS names like `vitalik.eth` are not supported; resolve to a 0x address first.
 * - chain?: Chain. Can be `ethereum`, `base`, or `solana`. (default: ethereum)
 * - flow?: Filter by transfer direction relative to the queried wallet. `in` for incoming, `out` for outgoing. Omit for both directions.
 * - token?: Filter by token contract address. Use `0x0000000000000000000000000000000000000000` for native token transfers. Omit for all tokens.
 * - limit?: Results per page (default: 20) @min 1 @max 100
 * - offset?: Pagination offset (default: 0) @min 0
 */
export async function fetchWalletTransfers(params: { address: string; chain?: 'ethereum' | 'base' | 'solana'; flow?: 'in' | 'out'; token?: string; limit?: number; offset?: number }) {
  if (params.limit !== undefined) params.limit = Math.max(1, Math.min(100, params.limit))
  if (params.offset !== undefined) params.offset = Math.max(0, params.offset)
  const qs: Record<string, string> = {}
  qs['address'] = String(params.address)
  if (params?.chain !== undefined) qs['chain'] = String(params.chain)
  if (params?.flow !== undefined) qs['flow'] = String(params.flow)
  if (params?.token !== undefined) qs['token'] = String(params.token)
  if (params?.limit !== undefined) qs['limit'] = String(params.limit)
  if (params?.offset !== undefined) qs['offset'] = String(params.offset)
  return proxyGet<ApiResponse<WalletTransferItem>>(`wallet/transfers`, qs)
}

// ---------------------------------------------------------------------------
// Wallet hooks
// ---------------------------------------------------------------------------

type QueryOpts<T> = Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'>

/** Get aggregated wallet detail — wraps `fetchWalletDetail` with React Query caching. */
export function useWalletDetail(params: Parameters<typeof fetchWalletDetail>[0], opts?: QueryOpts<ApiObjectResponse<WalletDetailBody>>) {
  return useQuery({ queryKey: ['wallet', 'detail', params], queryFn: () => fetchWalletDetail(params!), ...opts })
}

/** Get wallet transaction history — wraps `fetchWalletHistory` with React Query caching. */
export function useWalletHistory(params: Parameters<typeof fetchWalletHistory>[0], opts?: QueryOpts<ApiResponse<WalletHistoryItem>>) {
  return useQuery({ queryKey: ['wallet', 'history', params], queryFn: () => fetchWalletHistory(params!), ...opts })
}

/** Batch get wallet labels — wraps `fetchWalletLabelsBatch` with React Query caching. */
export function useWalletLabelsBatch(params: Parameters<typeof fetchWalletLabelsBatch>[0], opts?: QueryOpts<ApiResponse<WalletLabelItem>>) {
  return useQuery({ queryKey: ['wallet', 'labels', 'batch', params], queryFn: () => fetchWalletLabelsBatch(params!), ...opts })
}

/** Get wallet net worth history — wraps `fetchWalletNetWorth` with React Query caching. */
export function useWalletNetWorth(params: Parameters<typeof fetchWalletNetWorth>[0], opts?: QueryOpts<ApiResponse<WalletNetWorthPoint>>) {
  return useQuery({ queryKey: ['wallet', 'net', 'worth', params], queryFn: () => fetchWalletNetWorth(params!), ...opts })
}

/** Get wallet DeFi protocol positions — wraps `fetchWalletProtocols` with React Query caching. */
export function useWalletProtocols(params: Parameters<typeof fetchWalletProtocols>[0], opts?: QueryOpts<ApiResponse<WalletProtocolItem>>) {
  return useQuery({ queryKey: ['wallet', 'protocols', params], queryFn: () => fetchWalletProtocols(params!), ...opts })
}

/** Get wallet transfers — wraps `fetchWalletTransfers` with React Query caching. */
export function useWalletTransfers(params: Parameters<typeof fetchWalletTransfers>[0], opts?: QueryOpts<ApiResponse<WalletTransferItem>>) {
  return useQuery({ queryKey: ['wallet', 'transfers', params], queryFn: () => fetchWalletTransfers(params!), ...opts })
}
