/**
 * Fund types — auto-generated from hermod OpenAPI spec.
 */

export interface FundLinkItem {
  /** Link type like `web`, `twitter`, or `linkedin` */
  type: string
  /** Link URL */
  value: string
}

export interface FundMemberItem {
  /** Avatar URL */
  avatar?: string
  /** Member name */
  name: string
  /** Member roles */
  roles: string[] | null
}

export interface FundPortfolioItem {
  /** Investment date (Unix seconds) */
  invested_at?: number
  /** Whether this fund was the lead investor */
  is_lead: boolean
  /** Surf project UUID — pass as 'id' parameter to /project/detail, /project/events, or /project/defi/metrics for exact lookup. Prefer over 'q' (fuzzy name search). */
  project_id: string
  /** Project logo URL */
  project_logo?: string
  /** Project name */
  project_name: string
  /** Project slug */
  project_slug?: string
  /** Most recent funding round amount in USD */
  recent_raise?: number
  /** Total amount raised by the project in USD */
  total_raise?: number
}

export interface FundResearchItem {
  /** Research ID */
  id: string
  /** Publication date (Unix seconds) */
  published_at: number
  /** Research title */
  title: string
  /** Research URL */
  url: string
}

export interface FundXAccountItem {
  /** Display name */
  display_name?: string
  /** Follower count */
  followers_count: number
  /** X (Twitter) handle without the @ prefix */
  handle: string
  /** Numeric X (Twitter) user ID */
  id: string
  /** Profile image URL */
  profile_image?: string
}

export interface FundSearchItem {
  /** Surf fund UUID — pass as 'id' parameter to /fund/detail or /fund/portfolio for exact lookup */
  id: string
  /** Fund logo URL */
  image?: string
  /** Total number of unique invested projects (a project with multiple funding rounds counts once) */
  invested_projects_count: number
  /** Fund name */
  name: string
  /** Fund tier ranking (lower is better) */
  tier: number
  /** Top invested projects (up to 5) */
  top_projects: FundPortfolioItem[] | null
  /** Fund type */
  type?: string
}

export interface FundDetailItem {
  /** Fund description */
  description?: string
  /** Surf fund UUID — pass as 'id' parameter to /fund/detail or /fund/portfolio for exact lookup */
  id: string
  /** Fund logo URL */
  image?: string
  /** Total number of unique invested projects (a project with multiple funding rounds counts once) */
  invested_projects_count: number
  /** Fund jurisdiction */
  jurisdiction?: string
  /** Fund links (website, social, etc.) */
  links: FundLinkItem[] | null
  /** Fund team members */
  members: FundMemberItem[] | null
  /** Fund name */
  name: string
  /** Recent research publications */
  recent_researches: FundResearchItem[] | null
  /** Fund tier ranking (lower is better) */
  tier: number
  /** Fund type like `VC` or `Accelerator` */
  type?: string
  /** X (Twitter) accounts */
  x_accounts: FundXAccountItem[] | null
}
