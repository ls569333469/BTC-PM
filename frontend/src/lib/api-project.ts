/**
 * Project API — auto-generated from hermod OpenAPI spec.
 * Generated at: 2026-03-20T03:37:53Z
 */

import { proxyGet, proxyPost, type ApiResponse, type ApiObjectResponse, type HumaProjectDetailBody, type ProjectMetricPoint, type ProjectTopRankItem } from './api'
import { useQuery, type UseQueryOptions } from '@tanstack/react-query'

/**
 * Get time-series DeFi metrics for a project. Available metrics: `volume`, `fee`, `fees`, `revenue`, `tvl`, `users`. Lookup by UUID (`id`) or name (`q`). Filter by `chain` and date range (`from`/`to`). Returns 404 if the project is not found. **Note:** this endpoint only returns data for DeFi protocol projects (e.g. `aave`, `uniswap`, `lido`, `makerdao`). Use `q` with a DeFi protocol name.
 * - id?: Surf project UUID. PREFERRED — always use this when available from a previous response (e.g. project_id from /fund/portfolio or id from /search/project). Takes priority over q.
 * - q?: Fuzzy entity name search. Only use when 'id' is not available. May return unexpected results for ambiguous names.
 * - metric: Metric to query. Can be `volume`, `fees` (or `fee` alias), `revenue`, `tvl`, or `users`.
 * - from?: Start of time range. Accepts Unix seconds (`1704067200`) or date string (`2024-01-01`)
 * - to?: End of time range. Accepts Unix seconds (`1706745600`) or date string (`2024-02-01`)
 * - chain?: Filter by chain. Can be `ethereum`, `polygon`, `bsc`, `arbitrum`, `optimism`, `base`, `avalanche`, `fantom`, or `solana`.
 * - limit?: Results per page (default: 20) @min 1 @max 100
 * - offset?: Pagination offset (default: 0) @min 0
 */
export async function fetchProjectDefiMetrics(params: { id?: string; q?: string; metric: 'volume' | 'fee' | 'fees' | 'revenue' | 'tvl' | 'users'; from?: string; to?: string; chain?: 'ethereum' | 'polygon' | 'bsc' | 'arbitrum' | 'optimism' | 'base' | 'avalanche' | 'fantom' | 'solana'; limit?: number; offset?: number }) {
  if (params.limit !== undefined) params.limit = Math.max(1, Math.min(100, params.limit))
  if (params.offset !== undefined) params.offset = Math.max(0, params.offset)
  const qs: Record<string, string> = {}
  if (params?.id !== undefined) qs['id'] = String(params.id)
  if (params?.q !== undefined) qs['q'] = String(params.q)
  qs['metric'] = String(params.metric)
  if (params?.from !== undefined) qs['from'] = String(params.from)
  if (params?.to !== undefined) qs['to'] = String(params.to)
  if (params?.chain !== undefined) qs['chain'] = String(params.chain)
  if (params?.limit !== undefined) qs['limit'] = String(params.limit)
  if (params?.offset !== undefined) qs['offset'] = String(params.offset)
  return proxyGet<ApiResponse<ProjectMetricPoint>>(`project/defi/metrics`, qs)
}

/**
 * Get top DeFi projects ranked by a protocol metric. Available metrics: `tvl`, `revenue`, `fees`, `volume`, `users`.
 * - metric: Ranking metric. Can be `tvl`, `revenue`, `fees`, `volume`, or `users`.
 * - limit?: Results per page (default: 20) @min 1 @max 100
 * - offset?: Pagination offset (default: 0) @min 0
 */
export async function fetchProjectDefiRanking(params: { metric: 'tvl' | 'revenue' | 'fees' | 'volume' | 'users'; limit?: number; offset?: number }) {
  if (params.limit !== undefined) params.limit = Math.max(1, Math.min(100, params.limit))
  if (params.offset !== undefined) params.offset = Math.max(0, params.offset)
  const qs: Record<string, string> = {}
  qs['metric'] = String(params.metric)
  if (params?.limit !== undefined) qs['limit'] = String(params.limit)
  if (params?.offset !== undefined) qs['offset'] = String(params.offset)
  return proxyGet<ApiResponse<ProjectTopRankItem>>(`project/defi/ranking`, qs)
}

/**
 * Get multiple project sub-resources in a single request. Use `fields` to select: `overview`, `token_info`, `tokenomics`, `funding`, `team`, `contracts`, `social`, `tge_status`. **Accepts project names directly** via `q` (e.g. `?q=aave`) — no need to call `/search/project` first. Also accepts UUID via `id`. Returns 404 if not found.

For DeFi metrics (TVL, fees, revenue, volume, users) and per-chain breakdown, use `/project/defi/metrics`.
 * - id?: Surf project UUID. PREFERRED — always use this when available from a previous response (e.g. project_id from /fund/portfolio or id from /search/project). Takes priority over q.
 * - q?: Fuzzy entity name search. Only use when 'id' is not available. May return unexpected results for ambiguous names.
 * - fields?: Comma-separated sub-resources to include. Can be `overview`, `token_info`, `tokenomics`, `funding`, `team`, `contracts`, `social`, or `tge_status`. (default: overview,token_info,tokenomics,funding,team,contracts,social,tge_status)
 */
export async function fetchProjectDetail(params?: { id?: string; q?: string; fields?: string }) {
  const qs: Record<string, string> = {}
  if (params?.id !== undefined) qs['id'] = String(params.id)
  if (params?.q !== undefined) qs['q'] = String(params.q)
  if (params?.fields !== undefined) qs['fields'] = String(params.fields)
  return proxyGet<ApiObjectResponse<HumaProjectDetailBody>>(`project/detail`, qs)
}

// ---------------------------------------------------------------------------
// Project hooks
// ---------------------------------------------------------------------------

type QueryOpts<T> = Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'>

/** Get project DeFi metrics — wraps `fetchProjectDefiMetrics` with React Query caching. */
export function useProjectDefiMetrics(params: Parameters<typeof fetchProjectDefiMetrics>[0], opts?: QueryOpts<ApiResponse<ProjectMetricPoint>>) {
  return useQuery({ queryKey: ['project', 'defi', 'metrics', params], queryFn: () => fetchProjectDefiMetrics(params!), ...opts })
}

/** Get top projects by protocol metric — wraps `fetchProjectDefiRanking` with React Query caching. */
export function useProjectDefiRanking(params: Parameters<typeof fetchProjectDefiRanking>[0], opts?: QueryOpts<ApiResponse<ProjectTopRankItem>>) {
  return useQuery({ queryKey: ['project', 'defi', 'ranking', params], queryFn: () => fetchProjectDefiRanking(params!), ...opts })
}

/** Get aggregated project detail — wraps `fetchProjectDetail` with React Query caching. */
export function useProjectDetail(params?: Parameters<typeof fetchProjectDetail>[0], opts?: QueryOpts<ApiObjectResponse<HumaProjectDetailBody>>) {
  return useQuery({ queryKey: ['project', 'detail', params], queryFn: () => fetchProjectDetail(params), ...opts })
}
