/**
 * Search types — auto-generated from hermod OpenAPI spec.
 */

export interface AirdropTaskItem {
  /** Supported blockchain names */
  blockchains?: string[] | null
  /** Task close date as Unix seconds (0 if unknown) */
  close_date: number
  /** Participation cost in USD (0 = free) */
  cost: number
  /** Public participation URL */
  external_link?: string
  /** Whether task is exclusive */
  is_exclusive: boolean
  /** Task open date as Unix seconds (0 if unknown) */
  open_date: number
  /** Task status: OPEN, CLOSED, UPCOMING */
  status: string
  /** Estimated time in minutes */
  time_minutes: number
  /** Task title */
  title: string
  /** Task type: social, testnet, mainnet, staking, trading, etc. */
  type: string
}

export interface AirdropTaskSummary {
  /** Number of currently open tasks */
  open: number
  /** Total number of tasks */
  total: number
  /** Distinct task types */
  types: string[] | null
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

export interface KalshiMarketItem {
  /** Surf curated market category */
  category?: string
  /** Market close time (Unix seconds) */
  close_time?: number
  /** Market end time (Unix seconds) */
  end_time?: number
  /** Parent event ticker */
  event_ticker: string
  /** Event title */
  event_title?: string
  /** Highest price as probability (0-1) */
  high: number
  /** Previous day open interest from daily report */
  last_day_open_interest: number
  /** Last traded price as probability (0-1) */
  last_price: number
  /** Lowest price as probability (0-1) */
  low: number
  /** Unique market ticker identifier */
  market_ticker: string
  /** Daily notional volume in USD (each contract = $1) */
  notional_volume_usd: number
  /** Open interest (contracts) */
  open_interest: number
  /** Payout type */
  payout_type: string
  /** Market result if resolved */
  result?: string
  /** Market start time (Unix seconds) */
  start_time?: number
  /** Market status */
  status: string
  /** Surf curated market subcategory */
  subcategory?: string
  /** Market title */
  title: string
  /** Total trading volume (contracts) */
  total_volume: number
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

export interface PolymarketMarketSide {
  /** Token identifier for this outcome */
  id: string
  /** Outcome label */
  label: string
}

export interface ProjectEventItem {
  /** Event date in ISO 8601 format */
  date?: string
  /** Detailed event description */
  description?: string
  /** Project logo image URL */
  logo_url?: string
  /** Short event title */
  title: string
  /** Event type — one of: launch, upgrade, partnership, news, airdrop, listing, twitter */
  type: string
}

export interface TokenSearchItem {
  /** Token identifier */
  id: string
  /** Token logo image URL */
  image?: string
  /** Token name */
  name: string
  /** Token symbol */
  symbol: string
}

export interface WalletSearchAddress {
  /** Wallet address */
  address: string
  /** Chain name like ethereum, arbitrum_one */
  chain: string
}

export interface WebSearchResultItem {
  /** Relevant content snippet from the page */
  content: string
  /** Short description or meta description of the page */
  description: string
  /** Page title from the search result */
  title: string
  /** Full URL of the search result page */
  url: string
}

export interface XAuthor {
  /** Profile picture URL */
  avatar?: string
  /** X/Twitter handle without the @ prefix (e.g. 'cz_binance') */
  handle: string
  /** Display name on X/Twitter */
  name: string
  /** Numeric X/Twitter user ID as a string */
  user_id: string
}

export interface XMedia {
  /** Media type: photo, video, or animated_gif */
  type: string
  /** Direct URL to the media asset */
  url: string
}

export interface XStats {
  /** Number of likes (hearts) */
  likes: number
  /** Number of replies */
  replies: number
  /** Number of retweets/reposts */
  reposts: number
  /** Total view count */
  views: number
}

export interface XUser {
  /** Profile picture URL */
  avatar?: string
  /** Profile biography text */
  bio?: string
  /** Number of followers */
  followers_count: number
  /** Number of accounts this user follows */
  following_count: number
  /** X/Twitter handle without the @ prefix */
  handle: string
  /** Display name on X/Twitter */
  name: string
  /** Numeric X/Twitter user ID as a string */
  user_id: string
}

export interface AirdropSearchItem {
  /** Token ticker symbol */
  coin_symbol?: string
  /** X/Twitter follower count (0 if unknown) */
  followers_count: number
  /** Last status change as Unix seconds */
  last_status_update: number
  /** Project logo image URL */
  logo_url?: string
  /** Surf project UUID if linked */
  project_id?: string
  /** Project/coin name */
  project_name: string
  /** Expected reward date as Unix seconds (0 if unknown) */
  reward_date: number
  /** Reward type: airdrop, points, whitelist, nft, role, ambassador */
  reward_type?: string
  /** Airdrop lifecycle stage: `POTENTIAL` (speculated, tasks open), `CONFIRMED` (announced, tasks open), `SNAPSHOT` (eligibility snapshot taken), `VERIFICATION` (claim window open), `REWARD_AVAILABLE` (ready to claim), `DISTRIBUTED` (sent, historical) */
  status: string
  /** Aggregated task statistics */
  task_summary?: AirdropTaskSummary
  /** Full task list (only with include_tasks=true) */
  tasks?: AirdropTaskItem[] | null
  /** Total project fundraise in USD (0 if unknown) */
  total_raise: number
  /** CryptoRank social score (0 if unknown) */
  xscore: number
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

export interface KalshiEvent {
  /** Event subtitle */
  event_subtitle?: string
  /** Unique event ticker identifier */
  event_ticker: string
  /** Event title */
  event_title: string
  /** Number of markets in this event */
  market_count: number
  /** Markets within this event */
  markets: KalshiMarketItem[] | null
}

export interface PolymarketMarketItem {
  /** Surf curated market category */
  category?: string
  /** Market close time (Unix seconds) */
  close_time?: number
  /** Resolution time (Unix seconds) */
  completed_time?: number
  /** Unique condition identifier */
  condition_id: string
  /** Market description */
  description?: string
  /** Market end time (Unix seconds) */
  end_time?: number
  /** Event identifier slug */
  event_slug?: string
  /** Game start time for sports markets (Unix seconds) */
  game_start_time?: number
  /** Market image URL */
  image?: string
  /** Market identifier slug */
  market_slug: string
  /** Negative risk market identifier */
  negative_risk_id?: string
  /** Link to Polymarket page */
  polymarket_link?: string
  /** URL to resolution data source */
  resolution_source?: string
  /** First outcome */
  side_a?: PolymarketMarketSide
  /** Second outcome */
  side_b?: PolymarketMarketSide
  /** Market start time (Unix seconds) */
  start_time?: number
  /** Market status: `open` or `closed` */
  status: string
  /** Surf curated market subcategory */
  subcategory?: string
  /** Market tags */
  tags?: string[] | null
  /** Market title */
  title: string
  /** Trading volume in the past month (USD) */
  volume_1_month: number
  /** Trading volume in the past week (USD) */
  volume_1_week: number
  /** Trading volume in the past year (USD) */
  volume_1_year: number
  /** Total trading volume (USD) */
  volume_total: number
  /** Winning outcome label, if resolved */
  winning_side?: string
}

export interface ProjectSearchItem {
  /** Chains the project operates on */
  chains?: string[] | null
  /** Short description of the project */
  description?: string
  /** Surf project UUID — pass as 'id' parameter to /project/detail, /project/events, or /project/defi/metrics for exact lookup. Prefer over 'q' (fuzzy name search). */
  id: string
  /** Project logo image URL */
  logo_url?: string
  /** Project name */
  name: string
  /** Project slug for URL construction */
  slug?: string
  /** Primary token symbol like `BTC` or `ETH` */
  symbol?: string
  /** Project category tags */
  tags?: string[] | null
  /** Associated tokens */
  tokens?: TokenSearchItem[] | null
}

export interface WalletSearchItem {
  /** Wallet address (present for address-type results) */
  address?: string
  /** Known wallet addresses for this entity (present for entity-level results) */
  addresses?: WalletSearchAddress[] | null
  /** Chain name like ethereum, arbitrum_one (present for address-type results) */
  chain?: string
  /** Name of the associated entity like `Binance` or `Aave` */
  entity_name?: string
  /** Type of entity like `exchange`, `fund`, or `whale` */
  entity_type?: string
  /** Human-readable label for the wallet entity */
  label?: string
  /** Number of wallet addresses associated with this entity */
  num_addresses?: number
  /** Associated X (Twitter) handle */
  twitter?: string
}

export interface XTweet {
  /** Author of the tweet */
  author: XAuthor
  /** Unix timestamp (seconds) when the tweet was posted */
  created_at: number
  /** Attached media items (photos, videos, GIFs) */
  media?: XMedia[] | null
  /** Engagement statistics (likes, reposts, replies, views) */
  stats: XStats
  /** Full text content of the tweet */
  text: string
  /** Numeric tweet ID as a string (e.g. '1234567890123456789') */
  tweet_id: string
  /** Permanent link to the tweet on X/Twitter */
  url: string
}

export interface PolymarketEvent {
  /** Surf curated event category */
  category?: string
  /** Event description */
  description?: string
  /** Event end time (Unix seconds) */
  end_time?: number
  /** Event identifier slug */
  event_slug: string
  /** Event image URL */
  image?: string
  /** Number of markets in this event */
  market_count: number
  /** Markets within this event */
  markets: PolymarketMarketItem[] | null
  /** Resolution source URL */
  settlement_sources?: string
  /** Event start time (Unix seconds) */
  start_time?: number
  /** Event status: `open` if any market is open, `closed` if all markets are closed */
  status: string
  /** Surf curated event subcategory */
  subcategory?: string
  /** Event tags */
  tags?: string[] | null
  /** Event title */
  title: string
  /** Total event volume across all markets (USD) */
  volume_total: number
}
