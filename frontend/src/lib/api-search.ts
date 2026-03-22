/**
 * Search API — auto-generated from hermod OpenAPI spec.
 * Generated at: 2026-03-20T03:37:53Z
 */

import { proxyGet, proxyPost, type ApiResponse, type AirdropSearchItem, type FundSearchItem, type KalshiEvent, type NewsArticleItem, type PolymarketEvent, type ProjectEventItem, type ProjectSearchItem, type WalletSearchItem, type WebSearchResultItem, type XTweet, type XUser } from './api'
import { useQuery, type UseQueryOptions } from '@tanstack/react-query'

/**
 * Search and filter airdrop opportunities by keyword, status, reward type, and task type. Returns paginated results with optional task details.
 * - q?: Search keyword for coin name
 * - phase?: Comma-separated lifecycle phases. `active` = tasks open, can participate (POTENTIAL + CONFIRMED). `claimable` = eligible, can claim (SNAPSHOT + VERIFICATION + REWARD_AVAILABLE). `completed` = done (DISTRIBUTED). Defaults to `active,claimable` to show actionable airdrops. (default: active,claimable)
 * - reward_type?: Filter by reward type
 * - task_type?: Filter activities containing tasks of this type
 * - has_open?: Only return activities with currently OPEN tasks (default: False)
 * - sort_by?: Field to sort results by (default: last_status_update)
 * - order?: Sort order (default: desc)
 * - limit?: Results per page (default: 20) @min 1 @max 100
 * - offset?: Pagination offset (default: 0) @min 0
 * - include_tasks?: Include full task list per activity (default: False)
 */
export async function fetchSearchAirdrop(params?: { q?: string; phase?: string; reward_type?: 'airdrop' | 'points' | 'whitelist' | 'nft' | 'role' | 'ambassador'; task_type?: 'social' | 'bounty-platforms' | 'testnet' | 'mainnet' | 'role' | 'form' | 'liquidity' | 'mint-nft' | 'game' | 'trading' | 'staking' | 'depin' | 'node' | 'ambassador' | 'hold' | 'check-wallet' | 'mint-domain' | 'predictions' | 'deploy'; has_open?: boolean; sort_by?: 'total_raise' | 'xscore' | 'last_status_update'; order?: 'asc' | 'desc'; limit?: number; offset?: number; include_tasks?: boolean }) {
  if (params?.limit !== undefined) params.limit = Math.max(1, Math.min(100, params?.limit))
  if (params?.offset !== undefined) params.offset = Math.max(0, params?.offset)
  const qs: Record<string, string> = {}
  if (params?.q !== undefined) qs['q'] = String(params.q)
  if (params?.phase !== undefined) qs['phase'] = String(params.phase)
  if (params?.reward_type !== undefined) qs['reward_type'] = String(params.reward_type)
  if (params?.task_type !== undefined) qs['task_type'] = String(params.task_type)
  if (params?.has_open !== undefined) qs['has_open'] = String(params.has_open)
  if (params?.sort_by !== undefined) qs['sort_by'] = String(params.sort_by)
  if (params?.order !== undefined) qs['order'] = String(params.order)
  if (params?.limit !== undefined) qs['limit'] = String(params.limit)
  if (params?.offset !== undefined) qs['offset'] = String(params.offset)
  if (params?.include_tasks !== undefined) qs['include_tasks'] = String(params.include_tasks)
  return proxyGet<ApiResponse<AirdropSearchItem>>(`search/airdrop`, qs)
}

/**
 * Search project events by keyword, optionally filtered by `type`. Valid types: `launch`, `upgrade`, `partnership`, `news`, `airdrop`, `listing`, `twitter`. Lookup by UUID (`id`) or name (`q`). Returns 404 if the project is not found.
 * - id?: Surf project UUID. PREFERRED — always use this when available from a previous response (e.g. project_id from /fund/portfolio or id from /search/project). Takes priority over q.
 * - q?: Fuzzy entity name search. Only use when 'id' is not available. May return unexpected results for ambiguous names.
 * - type?: Filter by event type. Can be `launch`, `upgrade`, `partnership`, `news`, `airdrop`, `listing`, or `twitter`.
 * - limit?: Results per page (default: 20) @min 1 @max 100
 * - offset?: Pagination offset (default: 0) @min 0
 */
export async function fetchSearchEvents(params?: { id?: string; q?: string; type?: 'launch' | 'upgrade' | 'partnership' | 'news' | 'airdrop' | 'listing' | 'twitter'; limit?: number; offset?: number }) {
  if (params?.limit !== undefined) params.limit = Math.max(1, Math.min(100, params?.limit))
  if (params?.offset !== undefined) params.offset = Math.max(0, params?.offset)
  const qs: Record<string, string> = {}
  if (params?.id !== undefined) qs['id'] = String(params.id)
  if (params?.q !== undefined) qs['q'] = String(params.q)
  if (params?.type !== undefined) qs['type'] = String(params.type)
  if (params?.limit !== undefined) qs['limit'] = String(params.limit)
  if (params?.offset !== undefined) qs['offset'] = String(params.offset)
  return proxyGet<ApiResponse<ProjectEventItem>>(`search/events`, qs)
}

/**
 * Search funds by keyword. Returns matching funds with name, tier, type, logo, and top invested projects.
 * - q: Search keyword — fund name like `a16z`, `paradigm`, or `coinbase ventures`
 * - limit?: Results per page (default: 20) @min 1 @max 100
 * - offset?: Pagination offset (default: 0) @min 0
 */
export async function fetchSearchFund(params: { q: string; limit?: number; offset?: number }) {
  if (params.limit !== undefined) params.limit = Math.max(1, Math.min(100, params.limit))
  if (params.offset !== undefined) params.offset = Math.max(0, params.offset)
  const qs: Record<string, string> = {}
  qs['q'] = String(params.q)
  if (params?.limit !== undefined) qs['limit'] = String(params.limit)
  if (params?.offset !== undefined) qs['offset'] = String(params.offset)
  return proxyGet<ApiResponse<FundSearchItem>>(`search/fund`, qs)
}

/**
 * Search Kalshi events by keyword matching event title, subtitle, or market title. Returns events with nested markets.

Data refresh: ~30 minutes
 * - q: Search keyword matching event title, subtitle, or market title
 * - status?: Market status filter: `active`, `closed`, `determined`, `disputed`, `finalized`, `inactive`, or `initialized`
 * - limit?: Results per page (default: 20) @min 1 @max 100
 * - offset?: Pagination offset (default: 0) @min 0
 */
export async function fetchSearchKalshi(params: { q: string; status?: 'active' | 'closed' | 'determined' | 'disputed' | 'finalized' | 'inactive' | 'initialized'; limit?: number; offset?: number }) {
  if (params.limit !== undefined) params.limit = Math.max(1, Math.min(100, params.limit))
  if (params.offset !== undefined) params.offset = Math.max(0, params.offset)
  const qs: Record<string, string> = {}
  qs['q'] = String(params.q)
  if (params?.status !== undefined) qs['status'] = String(params.status)
  if (params?.limit !== undefined) qs['limit'] = String(params.limit)
  if (params?.offset !== undefined) qs['offset'] = String(params.offset)
  return proxyGet<ApiResponse<KalshiEvent>>(`search/kalshi`, qs)
}

/**
 * Search crypto news articles by keyword. Returns top 10 results ranked by relevance with highlighted matching fragments.
 * - q: Search keyword or phrase
 */
export async function fetchSearchNews(params: { q: string }) {
  const qs: Record<string, string> = {}
  qs['q'] = String(params.q)
  return proxyGet<ApiResponse<NewsArticleItem>>(`search/news`, qs)
}

/**
 * Search Polymarket events by keyword matching market question, event title, or description. Returns events with nested markets ranked by volume.

Data refresh: ~30 minutes
 * - q: Search keyword matching market question, event title, or description
 * - status?: Market status filter: `active`, `finalized`, `ended`, `initialized`, or `closed` (default: active)
 * - limit?: Results per page (default: 20) @min 1 @max 100
 * - offset?: Pagination offset (default: 0) @min 0
 */
export async function fetchSearchPolymarket(params: { q: string; status?: 'active' | 'finalized' | 'ended' | 'initialized' | 'closed'; limit?: number; offset?: number }) {
  if (params.limit !== undefined) params.limit = Math.max(1, Math.min(100, params.limit))
  if (params.offset !== undefined) params.offset = Math.max(0, params.offset)
  const qs: Record<string, string> = {}
  qs['q'] = String(params.q)
  if (params?.status !== undefined) qs['status'] = String(params.status)
  if (params?.limit !== undefined) qs['limit'] = String(params.limit)
  if (params?.offset !== undefined) qs['offset'] = String(params.offset)
  return proxyGet<ApiResponse<PolymarketEvent>>(`search/polymarket`, qs)
}

/**
 * Search crypto projects by keyword. Returns matching projects with name, description, chains, and logo.
 * - q: Search keyword — project name or ticker like `uniswap`, `bitcoin`, or `ETH`
 * - limit?: Results per page (default: 20) @min 1 @max 100
 * - offset?: Pagination offset (default: 0) @min 0
 */
export async function fetchSearchProject(params: { q: string; limit?: number; offset?: number }) {
  if (params.limit !== undefined) params.limit = Math.max(1, Math.min(100, params.limit))
  if (params.offset !== undefined) params.offset = Math.max(0, params.offset)
  const qs: Record<string, string> = {}
  qs['q'] = String(params.q)
  if (params?.limit !== undefined) qs['limit'] = String(params.limit)
  if (params?.offset !== undefined) qs['offset'] = String(params.offset)
  return proxyGet<ApiResponse<ProjectSearchItem>>(`search/project`, qs)
}

/**
 * Search X (Twitter) posts by keyword or `from:handle` syntax. Returns posts with author, content, engagement metrics, and timestamp. To load more results, check `meta.has_more`; if true, pass `meta.next_cursor` as the `cursor` query parameter in the next request.
 * - q: Search keyword or `from:handle` syntax like `ethereum` or `from:cz_binance`
 * - limit?: Results per page (default: 20) @min 1 @max 100
 * - cursor?: Opaque cursor token from a previous response's next_cursor field for fetching the next page
 */
export async function fetchSearchSocial(params: { q: string; limit?: number; cursor?: string }) {
  if (params.limit !== undefined) params.limit = Math.max(1, Math.min(100, params.limit))
  const qs: Record<string, string> = {}
  qs['q'] = String(params.q)
  if (params?.limit !== undefined) qs['limit'] = String(params.limit)
  if (params?.cursor !== undefined) qs['cursor'] = String(params.cursor)
  return proxyGet<ApiResponse<XTweet>>(`search/social`, qs)
}

/**
 * Search X (Twitter) users by keyword. Returns user profiles with handle, display name, bio, follower count, and avatar.
 * - q: Search keyword or `@handle` for exact handle lookup. Use a keyword like `vitalik` for fuzzy matching across names and bios, or `@VitalikButerin` to find a specific account by handle
 * - limit?: Results per page (default: 20) @min 1 @max 100
 * - cursor?: Opaque cursor token from a previous response's next_cursor field for fetching the next page
 */
export async function fetchSearchSocialPeople(params: { q: string; limit?: number; cursor?: string }) {
  if (params.limit !== undefined) params.limit = Math.max(1, Math.min(100, params.limit))
  const qs: Record<string, string> = {}
  qs['q'] = String(params.q)
  if (params?.limit !== undefined) qs['limit'] = String(params.limit)
  if (params?.cursor !== undefined) qs['cursor'] = String(params.cursor)
  return proxyGet<ApiResponse<XUser>>(`search/social/people`, qs)
}

/**
 * Search wallets by ENS name, address label, or address prefix. Returns matching wallet addresses with entity labels.
 * - q: Search keyword like `binance`, `vitalik.eth`, or `0xd8dA...`
 * - limit?: Results per page (default: 20) @min 1 @max 100
 * - offset?: Pagination offset (default: 0) @min 0
 */
export async function fetchSearchWallet(params: { q: string; limit?: number; offset?: number }) {
  if (params.limit !== undefined) params.limit = Math.max(1, Math.min(100, params.limit))
  if (params.offset !== undefined) params.offset = Math.max(0, params.offset)
  const qs: Record<string, string> = {}
  qs['q'] = String(params.q)
  if (params?.limit !== undefined) qs['limit'] = String(params.limit)
  if (params?.offset !== undefined) qs['offset'] = String(params.offset)
  return proxyGet<ApiResponse<WalletSearchItem>>(`search/wallet`, qs)
}

/**
 * Search web pages, articles, and content by keyword. Filter by domain with `site` like `coindesk.com`. Returns titles, URLs, and content snippets.
 * - q: Search query like `bitcoin price prediction 2026`
 * - limit?: Results per page (default: 20) @min 1 @max 100
 * - offset?: Pagination offset (default: 0) @min 0
 * - site?: Comma-separated domain filter like `coindesk.com` or `cointelegraph.com`
 */
export async function fetchSearchWeb(params: { q: string; limit?: number; offset?: number; site?: string }) {
  if (params.limit !== undefined) params.limit = Math.max(1, Math.min(100, params.limit))
  if (params.offset !== undefined) params.offset = Math.max(0, params.offset)
  const qs: Record<string, string> = {}
  qs['q'] = String(params.q)
  if (params?.limit !== undefined) qs['limit'] = String(params.limit)
  if (params?.offset !== undefined) qs['offset'] = String(params.offset)
  if (params?.site !== undefined) qs['site'] = String(params.site)
  return proxyGet<ApiResponse<WebSearchResultItem>>(`search/web`, qs)
}

// ---------------------------------------------------------------------------
// Search hooks
// ---------------------------------------------------------------------------

type QueryOpts<T> = Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'>

/** Search airdrops — wraps `fetchSearchAirdrop` with React Query caching. */
export function useSearchAirdrop(params?: Parameters<typeof fetchSearchAirdrop>[0], opts?: QueryOpts<ApiResponse<AirdropSearchItem>>) {
  return useQuery({ queryKey: ['search', 'airdrop', params], queryFn: () => fetchSearchAirdrop(params), ...opts })
}

/** Search project events — wraps `fetchSearchEvents` with React Query caching. */
export function useSearchEvents(params?: Parameters<typeof fetchSearchEvents>[0], opts?: QueryOpts<ApiResponse<ProjectEventItem>>) {
  return useQuery({ queryKey: ['search', 'events', params], queryFn: () => fetchSearchEvents(params), ...opts })
}

/** Search funds — wraps `fetchSearchFund` with React Query caching. */
export function useSearchFund(params: Parameters<typeof fetchSearchFund>[0], opts?: QueryOpts<ApiResponse<FundSearchItem>>) {
  return useQuery({ queryKey: ['search', 'fund', params], queryFn: () => fetchSearchFund(params!), ...opts })
}

/** Search Kalshi events — wraps `fetchSearchKalshi` with React Query caching. */
export function useSearchKalshi(params: Parameters<typeof fetchSearchKalshi>[0], opts?: QueryOpts<ApiResponse<KalshiEvent>>) {
  return useQuery({ queryKey: ['search', 'kalshi', params], queryFn: () => fetchSearchKalshi(params!), ...opts })
}

/** Search news articles — wraps `fetchSearchNews` with React Query caching. */
export function useSearchNews(params: Parameters<typeof fetchSearchNews>[0], opts?: QueryOpts<ApiResponse<NewsArticleItem>>) {
  return useQuery({ queryKey: ['search', 'news', params], queryFn: () => fetchSearchNews(params!), ...opts })
}

/** Search Polymarket events — wraps `fetchSearchPolymarket` with React Query caching. */
export function useSearchPolymarket(params: Parameters<typeof fetchSearchPolymarket>[0], opts?: QueryOpts<ApiResponse<PolymarketEvent>>) {
  return useQuery({ queryKey: ['search', 'polymarket', params], queryFn: () => fetchSearchPolymarket(params!), ...opts })
}

/** Search projects — wraps `fetchSearchProject` with React Query caching. */
export function useSearchProject(params: Parameters<typeof fetchSearchProject>[0], opts?: QueryOpts<ApiResponse<ProjectSearchItem>>) {
  return useQuery({ queryKey: ['search', 'project', params], queryFn: () => fetchSearchProject(params!), ...opts })
}

/** Search social posts — wraps `fetchSearchSocial` with React Query caching. */
export function useSearchSocial(params: Parameters<typeof fetchSearchSocial>[0], opts?: QueryOpts<ApiResponse<XTweet>>) {
  return useQuery({ queryKey: ['search', 'social', params], queryFn: () => fetchSearchSocial(params!), ...opts })
}

/** Search social users — wraps `fetchSearchSocialPeople` with React Query caching. */
export function useSearchSocialPeople(params: Parameters<typeof fetchSearchSocialPeople>[0], opts?: QueryOpts<ApiResponse<XUser>>) {
  return useQuery({ queryKey: ['search', 'social', 'people', params], queryFn: () => fetchSearchSocialPeople(params!), ...opts })
}

/** Search wallets — wraps `fetchSearchWallet` with React Query caching. */
export function useSearchWallet(params: Parameters<typeof fetchSearchWallet>[0], opts?: QueryOpts<ApiResponse<WalletSearchItem>>) {
  return useQuery({ queryKey: ['search', 'wallet', params], queryFn: () => fetchSearchWallet(params!), ...opts })
}

/** Search the internet — wraps `fetchSearchWeb` with React Query caching. */
export function useSearchWeb(params: Parameters<typeof fetchSearchWeb>[0], opts?: QueryOpts<ApiResponse<WebSearchResultItem>>) {
  return useQuery({ queryKey: ['search', 'web', params], queryFn: () => fetchSearchWeb(params!), ...opts })
}
