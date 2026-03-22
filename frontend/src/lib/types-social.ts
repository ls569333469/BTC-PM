/**
 * Social types — auto-generated from hermod OpenAPI spec.
 */

export interface FollowerGeoItem {
  /** Number of followers in this location */
  follower_count: number
  /** Geographic location name like a country or region */
  location: string
  /** Percentage of total followers in this location (0-100) */
  percentage: number
}

export interface MindshareTopProjectInfo {
  /** Surf project UUID — pass as 'id' parameter to /project/detail, /project/events, or /project/defi/metrics for exact lookup */
  id: string
  /** Project name */
  name: string
  /** URL-friendly project slug */
  slug?: string
}

export interface MindshareTopTokenInfo {
  /** Surf token UUID */
  id?: string
  /** Token image URL */
  image?: string
  /** Token name */
  name: string
  /** Token ticker symbol */
  symbol?: string
}

export interface MindshareTopTwitterInfo {
  /** Profile image URL */
  avatar_url?: string
  /** X (Twitter) display name */
  display_name: string
  /** Numeric X (Twitter) user ID */
  twitter_id: string
  /** X (Twitter) handle without the @ prefix */
  x_handle: string
}

export interface SentimentData {
  /** Sentiment score from -1 (very negative) to 1 (very positive) */
  score: number | null
  /** Time range for the sentiment analysis like 7d or 30d */
  time_range: string
}

export interface SmartFollowerHistoryPoint {
  /** Number of smart followers on this date */
  count: number
  /** Date in YYYY-MM-DD format */
  date: string
}

export interface SmartFollowerItem {
  /** Profile image URL */
  avatar: string
  /** Human-readable description of the follower's role */
  description?: string
  /** Number of followers this account has */
  followers_count: number
  /** X (Twitter) handle without the @ prefix */
  handle: string
  /** Display name of the follower */
  name: string
  /** Rank position among smart followers (1 = highest) */
  rank: number
  /** Smart follower influence score */
  score: number
  /** Smart follower category tag like VC, KOL, or Developer */
  tag: string
  /** Numeric X (Twitter) user ID */
  twitter_id: string
}

export interface SocialMindsharePoint {
  /** Unix timestamp in seconds */
  timestamp: number
  /** Mindshare view count at this timestamp */
  value: number
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

export interface FollowerGeoData {
  /** Follower count breakdown by geographic location */
  locations: FollowerGeoItem[] | null
  /** Total number of followers across all locations */
  total_follower_count: number
}

export interface MindshareTopProject {
  /** Project metadata */
  project?: MindshareTopProjectInfo
  /** Rank position in the mindshare leaderboard */
  rank: number
  /** Sentiment polarity: positive or negative */
  sentiment?: string
  /** Weighted sentiment score from -1 (very negative) to 1 (very positive) */
  sentiment_score?: number
  /** Project category tags */
  tags?: string[] | null
  /** Token metadata */
  token?: MindshareTopTokenInfo
  /** Deprecated: no longer populated. */
  trending_short_reason?: string
  /** Deprecated: no longer populated. */
  trending_summary?: string
  /** X (Twitter) account metadata */
  twitter?: MindshareTopTwitterInfo
}

export interface SmartFollowersData {
  /** Total number of smart followers */
  count: number
  /** List of top smart followers sorted by influence score */
  followers: SmartFollowerItem[] | null
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

export interface SocialDetailBody {
  /** Geographic breakdown of followers */
  follower_geo?: FollowerGeoData
  /** Surf project UUID — pass as 'id' parameter to /project/detail, /project/events, or /project/defi/metrics. Omitted for direct x_id lookups. */
  project_id?: string
  /** Project name (omitted for direct x_id lookups) */
  project_name?: string
  /** Sentiment analysis data for the project */
  sentiment?: SentimentData
  /** Top smart followers for the project */
  smart_followers?: SmartFollowersData
  /** Numeric X (Twitter) account ID */
  twitter_id: string
}
