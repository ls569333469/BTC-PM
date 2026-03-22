/**
 * Social API — auto-generated from hermod OpenAPI spec.
 * Generated at: 2026-03-20T03:37:53Z
 */

import { proxyGet, proxyPost, type ApiResponse, type ApiObjectResponse, type MindshareTopProject, type SmartFollowerHistoryPoint, type SocialDetailBody, type SocialMindsharePoint, type XTweet, type XUser } from './api'
import { useQuery, type UseQueryOptions } from '@tanstack/react-query'

/**
 * Get a **point-in-time snapshot** of social analytics: sentiment score, follower geo breakdown, and top smart followers. Use `fields` to select: `sentiment`, `follower_geo`, `smart_followers`. Lookup by X account ID (`x_id`) or project name (`q`, e.g. `uniswap`, `solana`). The `q` parameter must be a crypto project name, not a personal Twitter handle. Returns 404 if the project has no linked Twitter account.

For sentiment **trends over time**, use `/social/mindshare` instead.
 * - x_id?: Numeric X (Twitter) account ID (takes priority over `q`)
 * - q?: Entity name to resolve like `uniswap`, `ethereum`, or `aave`
 * - fields?: Comma-separated sub-resources to include. Can be `sentiment`, `follower_geo`, or `smart_followers`. (default: sentiment,follower_geo,smart_followers)
 * - time_range?: Timeframe for sentiment data. Can be `24h`, `48h`, `7d`, `30d`, `3m`, `6m`, or `1y`. (default: 7d)
 * - geo_limit?: Max geo locations to return (default: 20) @min 1 @max 100
 */
export async function fetchSocialDetail(params?: { x_id?: string; q?: string; fields?: string; time_range?: '24h' | '48h' | '7d' | '30d' | '3m' | '6m' | '1y'; geo_limit?: number }) {
  if (params?.geo_limit !== undefined) params.geo_limit = Math.max(1, Math.min(100, params?.geo_limit))
  const qs: Record<string, string> = {}
  if (params?.x_id !== undefined) qs['x_id'] = String(params.x_id)
  if (params?.q !== undefined) qs['q'] = String(params.q)
  if (params?.fields !== undefined) qs['fields'] = String(params.fields)
  if (params?.time_range !== undefined) qs['time_range'] = String(params.time_range)
  if (params?.geo_limit !== undefined) qs['geo_limit'] = String(params.geo_limit)
  return proxyGet<ApiObjectResponse<SocialDetailBody>>(`social/detail`, qs)
}

/**
 * Get mindshare (social view count) **time-series trend** for a project, aggregated by `interval`. Use this when the user asks about sentiment **trends**, mindshare **over time**, or social momentum changes. `interval` can be `5m`, `1h`, `1d`, or `7d`. Filter by date range with `from`/`to` (Unix seconds). Lookup by name (`q`).

For a **point-in-time snapshot** of social analytics (sentiment score, follower geo, smart followers), use `/social/detail` instead.
 * - q: Entity name to resolve like `uniswap`, `ethereum`, or `aave`
 * - interval: Time aggregation interval. Can be `5m`, `1h`, `1d`, or `7d`.
 * - from?: Start Unix timestamp in seconds
 * - to?: End Unix timestamp in seconds
 */
export async function fetchSocialMindshare(params: { q: string; interval: '5m' | '1h' | '1d' | '7d'; from?: number; to?: number }) {
  const qs: Record<string, string> = {}
  qs['q'] = String(params.q)
  qs['interval'] = String(params.interval)
  if (params?.from !== undefined) qs['from'] = String(params.from)
  if (params?.to !== undefined) qs['to'] = String(params.to)
  return proxyGet<ApiResponse<SocialMindsharePoint>>(`social/mindshare`, qs)
}

/**
 * Get top crypto projects ranked by mindshare (social view count), sourced directly from Argus real-time data (refreshed every 5 minutes). Filter by `tag` to scope to a category (e.g. `dex`, `l1`, `meme`). Use `time_range` (`24h`, `48h`, `7d`, `30d`) to control the ranking window. Supports `limit`/`offset` pagination.
 * - offset?: Pagination offset (default: 0) @min 0
 * - limit?: Results per page (default: 20) @min 1 @max 100
 * - tag?: Filter by project category. `l1` = Layer 1, `l2` = Layer 2/scaling, `dex` = DEX/AMM, `derivatives` = perps/options, `cex` = centralized exchange, `gamefi` = gaming, `nft` = NFT collections, `oracle` = oracle, `prediction` = prediction market, `rwa` = real-world assets, `yield` = yield/asset management, `data` = data/analytics, `devtool` = developer tooling, `compliance` = compliance/regtech, `meme` = meme/token launchpad.
 * - time_range?: Mindshare ranking timeframe window (default: 7d)
 * - sentiment?: Filter by sentiment polarity. Only projects with sufficient tweet data are classified.
 */
export async function fetchSocialRanking(params?: { offset?: number; limit?: number; tag?: 'l1' | 'l2' | 'dex' | 'derivatives' | 'cex' | 'gamefi' | 'nft' | 'oracle' | 'prediction' | 'rwa' | 'yield' | 'data' | 'devtool' | 'compliance' | 'meme' | ''; time_range?: '24h' | '48h' | '7d' | '30d'; sentiment?: 'positive' | 'negative' | '' }) {
  if (params?.offset !== undefined) params.offset = Math.max(0, params?.offset)
  if (params?.limit !== undefined) params.limit = Math.max(1, Math.min(100, params?.limit))
  const qs: Record<string, string> = {}
  if (params?.offset !== undefined) qs['offset'] = String(params.offset)
  if (params?.limit !== undefined) qs['limit'] = String(params.limit)
  if (params?.tag !== undefined) qs['tag'] = String(params.tag)
  if (params?.time_range !== undefined) qs['time_range'] = String(params.time_range)
  if (params?.sentiment !== undefined) qs['sentiment'] = String(params.sentiment)
  return proxyGet<ApiResponse<MindshareTopProject>>(`social/ranking`, qs)
}

/**
 * Get smart follower count time-series for a project, sorted by date descending. Lookup by X account ID (`x_id`) or project name (`q`). The `q` parameter must be a project name (e.g. `uniswap`, `ethereum`), not a personal X handle — use `x_id` for individual accounts. Returns 404 if the project has no linked X account.
 * - x_id?: Numeric X (Twitter) account ID (takes priority over `q`)
 * - q?: Project name to resolve (e.g. `uniswap`, `ethereum`). Must be a project with a linked X account — personal handles like `VitalikButerin` return 404. Use `x_id` for individual accounts.
 * - limit?: Max data points to return (upstream typically provides ~36 daily points) (default: 36) @min 1 @max 100
 */
export async function fetchSocialSmartFollowersHistory(params?: { x_id?: string; q?: string; limit?: number }) {
  if (params?.limit !== undefined) params.limit = Math.max(1, Math.min(100, params?.limit))
  const qs: Record<string, string> = {}
  if (params?.x_id !== undefined) qs['x_id'] = String(params.x_id)
  if (params?.q !== undefined) qs['q'] = String(params.q)
  if (params?.limit !== undefined) qs['limit'] = String(params.limit)
  return proxyGet<ApiResponse<SmartFollowerHistoryPoint>>(`social/smart-followers/history`, qs)
}

/**
 * Returns replies/comments on a specific tweet. Lookup by `tweet_id`.
 * - tweet_id: Tweet ID to get replies for
 * - limit?: Max results to return (default: 20) @min 1 @max 100
 * - cursor?: Opaque cursor token from a previous response's next_cursor field for fetching the next page
 */
export async function fetchSocialTweetReplies(params: { tweet_id: string; limit?: number; cursor?: string }) {
  if (params.limit !== undefined) params.limit = Math.max(1, Math.min(100, params.limit))
  const qs: Record<string, string> = {}
  qs['tweet_id'] = String(params.tweet_id)
  if (params?.limit !== undefined) qs['limit'] = String(params.limit)
  if (params?.cursor !== undefined) qs['cursor'] = String(params.cursor)
  return proxyGet<ApiResponse<XTweet>>(`social/tweet/replies`, qs)
}

/**
 * Get X (Twitter) posts by numeric post ID strings. Pass up to 100 comma-separated IDs via the `ids` query parameter.
 * - ids: Comma-separated numeric post ID strings, max 100
 */
export async function fetchSocialTweets(params: { ids: string }) {
  const qs: Record<string, string> = {}
  qs['ids'] = String(params.ids)
  return proxyGet<ApiResponse<XTweet>>(`social/tweets`, qs)
}

/**
 * Get an X (Twitter) user profile — display name, follower count, following count, and bio. Lookup by `handle` (without @).
 * - handle: X (Twitter) username without @ like `cz_binance` or `vitalikbuterin`
 */
export async function fetchSocialUser(params: { handle: string }) {
  const qs: Record<string, string> = {}
  qs['handle'] = String(params.handle)
  return proxyGet<ApiObjectResponse<XUser>>(`social/user`, qs)
}

/**
 * Returns a list of followers for the specified handle on X (Twitter). Lookup by `handle` (without @).
 * - handle: X (Twitter) username without @ like `vitalikbuterin` or `cz_binance`
 * - limit?: Max results to return (default: 20) @min 1 @max 100
 * - cursor?: Opaque cursor token from a previous response's next_cursor field for fetching the next page
 */
export async function fetchSocialUserFollowers(params: { handle: string; limit?: number; cursor?: string }) {
  if (params.limit !== undefined) params.limit = Math.max(1, Math.min(100, params.limit))
  const qs: Record<string, string> = {}
  qs['handle'] = String(params.handle)
  if (params?.limit !== undefined) qs['limit'] = String(params.limit)
  if (params?.cursor !== undefined) qs['cursor'] = String(params.cursor)
  return proxyGet<ApiResponse<XUser>>(`social/user/followers`, qs)
}

/**
 * Returns a list of users that the specified handle follows on X (Twitter). Lookup by `handle` (without @).
 * - handle: X (Twitter) username without @ like `vitalikbuterin` or `cz_binance`
 * - limit?: Max results to return (default: 20) @min 1 @max 100
 * - cursor?: Opaque cursor token from a previous response's next_cursor field for fetching the next page
 */
export async function fetchSocialUserFollowing(params: { handle: string; limit?: number; cursor?: string }) {
  if (params.limit !== undefined) params.limit = Math.max(1, Math.min(100, params.limit))
  const qs: Record<string, string> = {}
  qs['handle'] = String(params.handle)
  if (params?.limit !== undefined) qs['limit'] = String(params.limit)
  if (params?.cursor !== undefined) qs['cursor'] = String(params.cursor)
  return proxyGet<ApiResponse<XUser>>(`social/user/following`, qs)
}

/**
 * Get recent X (Twitter) posts by a specific user, ordered by recency. Lookup by `handle` (without @). Use `filter=original` to exclude retweets. To load more results, check `meta.has_more`; if true, pass `meta.next_cursor` as the `cursor` query parameter in the next request.
 * - handle: X (Twitter) username without @ like `vitalikbuterin` or `cz_binance`
 * - limit?: Results per page (default: 20) @min 1 @max 100
 * - cursor?: Opaque cursor token from a previous response's next_cursor field for fetching the next page
 * - filter?: Filter tweets: `all` returns everything, `original` excludes retweets (default: all)
 */
export async function fetchSocialUserPosts(params: { handle: string; limit?: number; cursor?: string; filter?: 'all' | 'original' }) {
  if (params.limit !== undefined) params.limit = Math.max(1, Math.min(100, params.limit))
  const qs: Record<string, string> = {}
  qs['handle'] = String(params.handle)
  if (params?.limit !== undefined) qs['limit'] = String(params.limit)
  if (params?.cursor !== undefined) qs['cursor'] = String(params.cursor)
  if (params?.filter !== undefined) qs['filter'] = String(params.filter)
  return proxyGet<ApiResponse<XTweet>>(`social/user/posts`, qs)
}

/**
 * Returns recent replies by the specified handle on X (Twitter). Lookup by `handle` (without @).
 * - handle: X (Twitter) username without @ like `vitalikbuterin` or `cz_binance`
 * - limit?: Max results to return (default: 20) @min 1 @max 100
 * - cursor?: Opaque cursor token from a previous response's next_cursor field for fetching the next page
 */
export async function fetchSocialUserReplies(params: { handle: string; limit?: number; cursor?: string }) {
  if (params.limit !== undefined) params.limit = Math.max(1, Math.min(100, params.limit))
  const qs: Record<string, string> = {}
  qs['handle'] = String(params.handle)
  if (params?.limit !== undefined) qs['limit'] = String(params.limit)
  if (params?.cursor !== undefined) qs['cursor'] = String(params.cursor)
  return proxyGet<ApiResponse<XTweet>>(`social/user/replies`, qs)
}

// ---------------------------------------------------------------------------
// Social hooks
// ---------------------------------------------------------------------------

type QueryOpts<T> = Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'>

/** Get aggregated social data for a project — wraps `fetchSocialDetail` with React Query caching. */
export function useSocialDetail(params?: Parameters<typeof fetchSocialDetail>[0], opts?: QueryOpts<ApiObjectResponse<SocialDetailBody>>) {
  return useQuery({ queryKey: ['social', 'detail', params], queryFn: () => fetchSocialDetail(params), ...opts })
}

/** Get project mindshare time series — wraps `fetchSocialMindshare` with React Query caching. */
export function useSocialMindshare(params: Parameters<typeof fetchSocialMindshare>[0], opts?: QueryOpts<ApiResponse<SocialMindsharePoint>>) {
  return useQuery({ queryKey: ['social', 'mindshare', params], queryFn: () => fetchSocialMindshare(params!), ...opts })
}

/** Get top projects by mindshare — wraps `fetchSocialRanking` with React Query caching. */
export function useSocialRanking(params?: Parameters<typeof fetchSocialRanking>[0], opts?: QueryOpts<ApiResponse<MindshareTopProject>>) {
  return useQuery({ queryKey: ['social', 'ranking', params], queryFn: () => fetchSocialRanking(params), ...opts })
}

/** Get smart follower count history — wraps `fetchSocialSmartFollowersHistory` with React Query caching. */
export function useSocialSmartFollowersHistory(params?: Parameters<typeof fetchSocialSmartFollowersHistory>[0], opts?: QueryOpts<ApiResponse<SmartFollowerHistoryPoint>>) {
  return useQuery({ queryKey: ['social', 'smart', 'followers', 'history', params], queryFn: () => fetchSocialSmartFollowersHistory(params), ...opts })
}

/** Get tweet replies — wraps `fetchSocialTweetReplies` with React Query caching. */
export function useSocialTweetReplies(params: Parameters<typeof fetchSocialTweetReplies>[0], opts?: QueryOpts<ApiResponse<XTweet>>) {
  return useQuery({ queryKey: ['social', 'tweet', 'replies', params], queryFn: () => fetchSocialTweetReplies(params!), ...opts })
}

/** Get posts by IDs — wraps `fetchSocialTweets` with React Query caching. */
export function useSocialTweets(params: Parameters<typeof fetchSocialTweets>[0], opts?: QueryOpts<ApiResponse<XTweet>>) {
  return useQuery({ queryKey: ['social', 'tweets', params], queryFn: () => fetchSocialTweets(params!), ...opts })
}

/** Get social user profile — wraps `fetchSocialUser` with React Query caching. */
export function useSocialUser(params: Parameters<typeof fetchSocialUser>[0], opts?: QueryOpts<ApiObjectResponse<XUser>>) {
  return useQuery({ queryKey: ['social', 'user', params], queryFn: () => fetchSocialUser(params!), ...opts })
}

/** Get user followers list — wraps `fetchSocialUserFollowers` with React Query caching. */
export function useSocialUserFollowers(params: Parameters<typeof fetchSocialUserFollowers>[0], opts?: QueryOpts<ApiResponse<XUser>>) {
  return useQuery({ queryKey: ['social', 'user', 'followers', params], queryFn: () => fetchSocialUserFollowers(params!), ...opts })
}

/** Get user following list — wraps `fetchSocialUserFollowing` with React Query caching. */
export function useSocialUserFollowing(params: Parameters<typeof fetchSocialUserFollowing>[0], opts?: QueryOpts<ApiResponse<XUser>>) {
  return useQuery({ queryKey: ['social', 'user', 'following', params], queryFn: () => fetchSocialUserFollowing(params!), ...opts })
}

/** Get user social posts — wraps `fetchSocialUserPosts` with React Query caching. */
export function useSocialUserPosts(params: Parameters<typeof fetchSocialUserPosts>[0], opts?: QueryOpts<ApiResponse<XTweet>>) {
  return useQuery({ queryKey: ['social', 'user', 'posts', params], queryFn: () => fetchSocialUserPosts(params!), ...opts })
}

/** Get user replies — wraps `fetchSocialUserReplies` with React Query caching. */
export function useSocialUserReplies(params: Parameters<typeof fetchSocialUserReplies>[0], opts?: QueryOpts<ApiResponse<XTweet>>) {
  return useQuery({ queryKey: ['social', 'user', 'replies', params], queryFn: () => fetchSocialUserReplies(params!), ...opts })
}
