/**
 * Market types — auto-generated from hermod OpenAPI spec.
 */

export interface MarketTopCoinItem {
  /** All-time high price in USD */
  ath?: number
  /** All-time low price in USD */
  atl?: number
  /** Price change percentage over the last 24 hours */
  change_24h_pct: number
  /** Circulating token supply */
  circulating_supply?: number
  /** Fully diluted valuation in USD */
  fdv?: number
  /** Highest price in the last 24 hours in USD */
  high_24h: number
  /** Token logo image URL */
  image?: string
  /** Lowest price in the last 24 hours in USD */
  low_24h: number
  /** Total market capitalization in USD */
  market_cap_usd: number
  /** Maximum token supply (e.g. 21M for BTC). Not available for all tokens. */
  max_supply?: number
  /** Full token name */
  name: string
  /** Current price in USD */
  price_usd: number
  /** Rank position in the list (1 = highest) */
  rank: number
  /** Token ticker symbol like `BTC` or `ETH` */
  symbol: string
  /** Total token supply */
  total_supply?: number
  /** 24-hour trading volume in USD */
  volume_24h_usd: number
}
