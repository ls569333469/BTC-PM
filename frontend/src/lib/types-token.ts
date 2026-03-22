/**
 * Token types — auto-generated from hermod OpenAPI spec.
 */

export interface DexTradeItem {
  /** Trade value in USD at execution time */
  amount_usd: number
  /** Unix timestamp in seconds when the trade was executed */
  block_time: number
  /** DEX project name like `uniswap`, `sushiswap`, or `curve` */
  project: string
  /** Wallet address that initiated the swap */
  taker: string
  /** Contract address of the token bought */
  token_bought_address?: string
  /** Amount of tokens bought (decimal-adjusted) */
  token_bought_amount: number
  /** Symbol of the token bought in this trade */
  token_bought_symbol: string
  /** Trading pair symbol like `WETH-USDC` */
  token_pair: string
  /** Contract address of the token sold */
  token_sold_address?: string
  /** Amount of tokens sold (decimal-adjusted) */
  token_sold_amount: number
  /** Symbol of the token sold in this trade */
  token_sold_symbol: string
  /** Transaction hash */
  tx_hash: string
  /** DEX version like `v2` or `v3` */
  version: string
}

export interface TokenHolderItem {
  /** Wallet address of the token holder */
  address: string
  /** Token balance (decimal-adjusted, human-readable) */
  balance: string
  /** Name of the associated entity like `Binance` or `Aave` */
  entity_name?: string
  /** Type of entity like `exchange`, `fund`, or `whale` */
  entity_type?: string
  /** Share of total supply held as a percentage (5.2 means 5.2%) */
  percentage?: number
}

export interface TokenTransferItem {
  /** Transfer amount (decimal-adjusted, human-readable) */
  amount: string
  /** Transfer value in USD at the time of the transaction. Not available for all transfers. */
  amount_usd?: number
  /** Block number in which this transfer was included */
  block_number: number
  /** Sender wallet address */
  from_address: string
  /** Token symbol like ETH, USDC, or WETH */
  symbol?: string
  /** Unix timestamp in seconds when the transfer occurred */
  timestamp: number
  /** Recipient wallet address */
  to_address: string
  /** Transaction hash */
  tx_hash: string
}

export interface TokenUnlockAllocationItem {
  /** Decimal-adjusted allocation amount */
  amount: number
  /** Allocation name */
  name: string
}

export interface TokenUnlockPoint {
  /** Breakdown by allocation */
  allocations?: TokenUnlockAllocationItem[] | null
  /** Unix timestamp in seconds */
  timestamp: number
  /** Cumulative total tokens unlocked up to this timestamp (decimal-adjusted) */
  unlock_amount: number
}
