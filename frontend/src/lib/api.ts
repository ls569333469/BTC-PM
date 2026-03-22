/**
 * Crypto API client — auto-generated from hermod OpenAPI spec.
 * Generated at: 2026-03-20T03:37:53Z
 *
 * Core helpers + barrel re-exports from per-category modules.
 * Usage:
 *   import { useMarketPrice, proxyGet } from '@/lib/api'
 */

// ---------------------------------------------------------------------------
// Proxy helpers
// ---------------------------------------------------------------------------

export { API_BASE, normalizeProxyPath, fetchWithRetry, proxyGet, proxyPost } from './fetch'

// ---------------------------------------------------------------------------
// Re-exports (types + per-category modules)
// ---------------------------------------------------------------------------

export * from './types-common'
export * from './types-market'
export * from './types-project'
export * from './types-wallet'
export * from './types-token'
export * from './types-social'
export * from './types-news'
export * from './types-onchain'
export * from './types-web'
export * from './types-fund'
export * from './types-search'
export * from './types-prediction-market'

export * from './api-market'
export * from './api-project'
export * from './api-wallet'
export * from './api-token'
export * from './api-social'
export * from './api-news'
export * from './api-onchain'
export * from './api-web'
export * from './api-fund'
export * from './api-search'
export * from './api-prediction-market'
