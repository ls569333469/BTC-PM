/**
 * Project types — auto-generated from hermod OpenAPI spec.
 */

export interface ProjectContractAddress {
  /** Contract address on the specified chain */
  address: string
  /** Chain name like `ethereum`, `bsc`, or `solana` */
  chain: string
  /** Human-readable label for this contract like `Token` or `Staking` */
  label?: string
}

export interface ProjectFundingInvestor {
  /** Whether this investor led the round */
  is_lead: boolean
  /** Investor logo URL */
  logo?: string
  /** Investor name */
  name: string
  /** Investor type (FUND or PERSON) */
  type?: string
}

export interface ProjectMetricPoint {
  /** Unix timestamp in seconds for this data point */
  timestamp: number
  /** Metric value at this timestamp */
  value: number
}

export interface ProjectOverviewItem {
  /** Chains the project is deployed on */
  chains?: string[] | null
  /** Short description of the project */
  description?: string
  /** Exchange names where the token is listed */
  exchanges?: string[] | null
  /** Surf project UUID — pass as 'id' parameter to /project/detail, /project/events, or /project/defi/metrics for exact lookup. Prefer over 'q' (fuzzy name search). */
  id: string
  /** Project logo image URL */
  logo_url?: string
  /** Project name */
  name: string
  /** URL-friendly project slug */
  slug?: string
  /** Project category tags like `DeFi`, `NFT`, or `Layer2` */
  tags?: string[] | null
  /** TGE status: pre, upcoming, or post */
  tge_status?: string
  /** Primary token ticker symbol */
  token_symbol?: string
  /** Project official website URL */
  website?: string
  /** Number of X (Twitter) followers */
  x_followers: number
  /** X (Twitter) handle without the @ prefix */
  x_handle?: string
}

export interface ProjectSocialAccount {
  /** Number of followers on this platform */
  followers_count?: number
  /** Username or handle on the social platform */
  handle?: string
  /** Profile URL on the social platform */
  url?: string
}

export interface ProjectTeamMember {
  /** Team member profile image URL */
  image?: string
  /** Team member's full name */
  name: string
  /** Team member's role or title */
  role?: string
  /** Social profile links keyed by platform name like `twitter` or `linkedin` */
  social_links?: Record<string, string>
}

export interface ProjectTgeStatusItem {
  /** TGE status: `pre`, `upcoming`, or `post`. Omitted when unknown. */
  current_status?: string
  /** Exchange names where the token is listed */
  exchanges?: string[] | null
  /** Unix timestamp of the last TGE event */
  last_event_time?: number
}

export interface ProjectTokenInfoItem {
  /** All-time high price in USD */
  all_time_high?: number
  /** All-time low price in USD */
  all_time_low?: number
  /** Circulating token supply */
  circulating_supply?: number
  /** Fully diluted valuation in USD */
  fdv?: number
  /** 24-hour high price in USD */
  high_24h?: number
  /** Token logo image URL */
  image?: string
  /** 24-hour low price in USD */
  low_24h?: number
  /** Market capitalization in USD */
  market_cap_usd?: number
  /** Full token name */
  name: string
  /** 24-hour price change percentage */
  price_change_24h?: number
  /** 30-day price change percentage */
  price_change_30d?: number
  /** 7-day price change percentage */
  price_change_7d?: number
  /** Current price in USD */
  price_usd?: number
  /** Token ticker symbol */
  symbol: string
  /** Total token supply */
  total_supply?: number
  /** 24-hour trading volume in USD */
  volume_24h?: number
}

export interface ProjectTokenomicsItem {
  /** Number of tokens currently in public circulation */
  circulating_supply?: number
  /** Fully diluted valuation in USD */
  fdv?: number
  /** Total market capitalization in USD */
  market_cap_usd?: number
  /** Total token supply */
  total_supply?: number
}

export interface ProjectTopRankItem {
  fees?: number
  /** Project logo image URL */
  logo_url?: string
  name: string
  revenue?: number
  symbol?: string
  tvl?: number
  users?: number
  volume?: number
}

export interface ProjectContractsItem {
  /** List of deployed smart contract addresses across chains */
  contracts?: ProjectContractAddress[] | null
}

export interface ProjectFundingRound {
  /** Amount raised in USD */
  amount?: number
  /** Date when the round closed in ISO 8601 format */
  date?: string
  /** Investors participating in this round */
  investors?: ProjectFundingInvestor[] | null
  /** Funding round name like `Seed`, `Series A`, or `Private` */
  round_name: string
  /** Project valuation at round close in USD */
  valuation?: number
}

export interface ProjectSocialItem {
  /** Discord community server */
  discord?: ProjectSocialAccount
  /** GitHub organization or repository account */
  github?: ProjectSocialAccount
  /** Telegram group or channel */
  telegram?: ProjectSocialAccount
  /** X (Twitter) account for the project */
  twitter?: ProjectSocialAccount
}

export interface ProjectTeamItem {
  /** List of team members with their roles and social links */
  members?: ProjectTeamMember[] | null
}

export interface ProjectFundingItem {
  /** List of individual funding rounds */
  rounds?: ProjectFundingRound[] | null
  /** Total capital raised across all rounds in USD */
  total_raise?: number
}

export interface HumaProjectDetailBody {
  /** Deployed smart contract addresses across chains */
  contracts?: ProjectContractsItem
  /** Fundraising history (rounds, amounts, investors) */
  funding?: ProjectFundingItem
  /** Comprehensive project overview (name, description, website, tags, chains, token symbol, social handles) */
  overview?: ProjectOverviewItem
  /** Social media links and follower counts */
  social?: ProjectSocialItem
  /** Team members with roles and social links */
  team?: ProjectTeamItem
  /** TGE status and exchange listings (pre/upcoming/post) */
  tge_status?: ProjectTgeStatusItem
  /** Native token market data (price, supply, market cap, price changes) */
  token_info?: ProjectTokenInfoItem
  /** Token distribution and supply metrics */
  tokenomics?: ProjectTokenomicsItem
}
