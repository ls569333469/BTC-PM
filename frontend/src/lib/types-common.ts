/**
 * Common types — auto-generated from hermod OpenAPI spec.
 */

export interface ResponseMeta {
  total?: number
  limit?: number
  offset?: number
  cached?: boolean
  credits_used?: number
}

export interface ApiResponse<T> {
  data: T[]
  meta?: ResponseMeta
  error?: { code: string; message: string }
}

export interface ApiObjectResponse<T> {
  data: T
  meta?: ResponseMeta
  error?: { code: string; message: string }
}
