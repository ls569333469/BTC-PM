/**
 * News types — auto-generated from hermod OpenAPI spec.
 */

export interface NewsArticleDetailItem {
  /** Full article body text */
  content: string
  /** Article ID */
  id: string
  /** Surf project UUID */
  project_id?: string
  /** Primary crypto project referenced in the article */
  project_name?: string
  /** Unix timestamp in seconds when the article was published */
  published_at: number
  /** Publisher name */
  source?: string
  /** Short summary of the article */
  summary?: string
  /** Article headline */
  title: string
  /** Direct URL to the original article */
  url?: string
}

export interface NewsArticleItem {
  /** Search highlight fragments with <em> tags around matching terms. Only present in search results. */
  highlights?: Record<string, string[] | null>
  /** Article ID. Use with the detail endpoint to fetch full content. */
  id: string
  /** Surf project UUID — pass as 'id' parameter to /project/detail, /project/events, or /project/defi/metrics for exact lookup */
  project_id?: string
  /** Primary crypto project referenced in the article */
  project_name?: string
  /** Unix timestamp in seconds when the article was published */
  published_at: number
  /** Publisher name (e.g. COINDESK, COINTELEGRAPH) */
  source?: string
  /** Short summary of the article */
  summary?: string
  /** Article headline */
  title: string
  /** Direct URL to the original article */
  url?: string
}
