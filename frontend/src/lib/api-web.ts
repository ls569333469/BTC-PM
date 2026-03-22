/**
 * Web API — auto-generated from hermod OpenAPI spec.
 * Generated at: 2026-03-20T03:37:53Z
 */

import { proxyGet, proxyPost, type ApiObjectResponse, type WebFetchResultItem } from './api'
import { useQuery, type UseQueryOptions } from '@tanstack/react-query'

/**
 * Fetch a web page and convert it to clean, LLM-friendly markdown. Use `target_selector` to extract specific page sections and `remove_selector` to strip unwanted elements. Returns 400 if the URL is invalid or unreachable.
 * - url: URL to fetch and parse
 * - target_selector?: CSS selector to extract specific content
 * - remove_selector?: CSS selector to remove unwanted elements
 * - wait_for_selector?: CSS selector to wait for before extracting
 * - timeout?: Request timeout in milliseconds (default: 30000) @min 1000 @max 60000
 */
export async function fetchWebFetch(params: { url: string; target_selector?: string; remove_selector?: string; wait_for_selector?: string; timeout?: number }) {
  if (params.timeout !== undefined) params.timeout = Math.max(1000, Math.min(60000, params.timeout))
  const qs: Record<string, string> = {}
  qs['url'] = String(params.url)
  if (params?.target_selector !== undefined) qs['target_selector'] = String(params.target_selector)
  if (params?.remove_selector !== undefined) qs['remove_selector'] = String(params.remove_selector)
  if (params?.wait_for_selector !== undefined) qs['wait_for_selector'] = String(params.wait_for_selector)
  if (params?.timeout !== undefined) qs['timeout'] = String(params.timeout)
  return proxyGet<ApiObjectResponse<WebFetchResultItem>>(`web/fetch`, qs)
}

// ---------------------------------------------------------------------------
// Web hooks
// ---------------------------------------------------------------------------

type QueryOpts<T> = Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'>

/** Fetch and parse a URL — wraps `fetchWebFetch` with React Query caching. */
export function useWebFetch(params: Parameters<typeof fetchWebFetch>[0], opts?: QueryOpts<ApiObjectResponse<WebFetchResultItem>>) {
  return useQuery({ queryKey: ['web', 'fetch', params], queryFn: () => fetchWebFetch(params!), ...opts })
}
