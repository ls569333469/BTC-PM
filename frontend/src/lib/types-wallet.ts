/**
 * Wallet types — auto-generated from hermod OpenAPI spec.
 */

export interface EvmTokenItem {
  /** Decimal-adjusted token balance as a string */
  balance: string
  /** Chain name like ethereum, polygon (EVM only) */
  chain?: string
  /** Whether the token is verified (EVM only) */
  is_verified: boolean
  /** Token logo image URL */
  logo_url?: string
  /** Full token name */
  name?: string
  /** Current USD price per token (EVM only) */
  price: number
  /** Token ticker symbol */
  symbol: string
  /** Token contract address (EVM only) */
  token_address: string
  /** Total USD value (balance * price) (EVM only) */
  usd_value: number
}

export interface SolBalanceItem {
  /** Wallet address */
  address: string
  /** Decimal-adjusted native SOL balance as a string (Solana only) */
  sol_balance: string
}

export interface SolTokenItem {
  /** Decimal-adjusted token balance as a string */
  balance: string
  /** Token decimal places (Solana only) */
  decimals: number
  /** Full token name */
  name?: string
  /** Token ticker symbol */
  symbol: string
  /** SPL token mint address (Solana only) */
  token_address: string
}

export interface WalletApprovalSpender {
  /** Approved token amount (use -1 for unlimited) */
  allowance: number
  /** Address of the approved spender contract */
  spender_address: string
  /** Human-readable name of the spender, absent for unrecognized contracts */
  spender_name?: string
}

export interface WalletChainItem {
  /** Canonical chain name like `ethereum` or `polygon` */
  chain: string
  /** EVM chain ID like `1` for Ethereum or `137` for Polygon */
  chain_id?: number
  /** Total USD value of assets on this chain */
  usd_value: number
}

export interface WalletDetailError {
  /** Field name that failed to load like `evm_balance`, `sol_balance`, `evm_tokens`, `sol_tokens`, `labels`, `nft`, `active_chains`, or `approvals` */
  field: string
  /** Error message describing why the field could not be loaded */
  message: string
}

export interface WalletHistoryItem {
  /** Sender wallet address */
  from_address: string
  /** Unix timestamp in seconds when the transaction was confirmed */
  timestamp: number
  /** Recipient wallet address */
  to_address: string
  /** Transaction hash */
  tx_hash: string
  /** Transaction type: `send`, `receive`, `swap`, `approve`, etc. */
  tx_type?: string
  /** Decimal-adjusted transaction value in native token as a string */
  value: string
}

export interface WalletLabelInfo {
  /** Confidence score 0.0-1.0 */
  confidence?: number
  /** Human-readable label for this address like `Binance Hot Wallet` */
  label: string
}

export interface WalletNFTItem {
  /** Canonical chain name like `ethereum` or `polygon` */
  chain?: string
  /** NFT collection name */
  collection_name?: string
  /** NFT contract address */
  contract_address: string
  /** NFT image or thumbnail URL */
  image_url?: string
  /** NFT item name or title */
  name?: string
  /** NFT token ID within the collection */
  token_id: string
  /** Latest trading price in USD */
  usd_price?: number
}

export interface WalletNetWorthPoint {
  /** Unix timestamp in seconds */
  timestamp: number
  /** Total portfolio value in USD at this point in time */
  usd_value: number
}

export interface WalletProtocolToken {
  /** Token amount held in this position */
  amount: number
  /** Canonical chain name like `ethereum` or `polygon` */
  chain: string
  /** Full token name */
  name?: string
  /** Current token price in USD */
  price: number
  /** Token ticker symbol */
  symbol: string
  /** Token contract address */
  token_address?: string
}

export interface WalletTransferItem {
  /** Transfer activity type (Solana only, e.g. ACTIVITY_SPL_TRANSFER) */
  activity_type?: string
  /** Decimal-adjusted transfer amount as a string */
  amount: string
  /** Transfer value in USD at the time of the transaction */
  amount_usd?: number
  /** Transfer direction relative to the queried wallet: `in` or `out` */
  flow?: string
  /** Sender wallet address */
  from_address: string
  /** Unix timestamp in seconds when the transfer occurred */
  timestamp: number
  /** Recipient wallet address */
  to_address: string
  /** Token contract address (EVM) or SPL mint address (Solana) */
  token_address?: string
  /** Token ticker symbol (available for EVM chains from on-chain data) */
  token_symbol?: string
  /** Transaction hash (EVM) or transaction signature (Solana) */
  tx_hash: string
}

export interface WalletApprovalItem {
  /** Current token balance */
  balance: number
  /** Canonical chain name */
  chain: string
  /** Full token name */
  name?: string
  /** List of approved spender contracts */
  spenders: WalletApprovalSpender[] | null
  /** Token ticker symbol */
  symbol: string
  /** Token contract address */
  token_address: string
}

export interface EvmBalanceItem {
  /** Wallet address */
  address: string
  /** Per-chain balance breakdown, sorted by value descending (EVM only) */
  chain_balances?: WalletChainItem[] | null
  /** Total portfolio value in USD (EVM only) */
  total_usd: number
}

export interface WalletLabelItem {
  /** Wallet address */
  address: string
  /** Name of the associated entity like `Binance` or `Aave` */
  entity_name?: string
  /** Type of entity like `exchange`, `fund`, or `whale` */
  entity_type?: string
  /** List of labels assigned to this address */
  labels: WalletLabelInfo[] | null
}

export interface WalletProtocolPosition {
  /** Total USD value of this position */
  balance_usd: number
  /** Tokens borrowed in this position */
  borrow_tokens?: WalletProtocolToken[] | null
  /** LP tokens in this position */
  lp_tokens?: WalletProtocolToken[] | null
  /** Position name or type like `Lending` or `Staking` */
  name: string
  /** Unclaimed reward tokens in this position */
  reward_tokens?: WalletProtocolToken[] | null
  /** Tokens supplied/deposited in this position */
  supply_tokens?: WalletProtocolToken[] | null
}

export interface WalletDetailBody {
  /** Chains the wallet has non-zero balances on. Always present (not controlled by fields param). For Solana addresses, returns a single entry. */
  active_chains?: WalletChainItem[] | null
  /** Token approvals (EVM-only, up to 50). Only present when `approvals` is included in the `fields` param. */
  approvals?: WalletApprovalItem[] | null
  /** Per-field errors for any fields that failed to load */
  errors?: WalletDetailError[] | null
  /** EVM wallet balance. Populated for EVM chains only. */
  evm_balance?: EvmBalanceItem
  /** EVM token holdings (up to 50). Populated for EVM chains only. */
  evm_tokens?: EvmTokenItem[] | null
  /** Address labels and entity attribution */
  labels?: WalletLabelItem
  /** NFT holdings (EVM-only, top 200 by value) */
  nft?: WalletNFTItem[] | null
  /** Solana wallet balance from Solscan. Populated for Solana chain only. */
  sol_balance?: SolBalanceItem
  /** Solana SPL token holdings from Solscan (up to 50). Populated for Solana chain only. */
  sol_tokens?: SolTokenItem[] | null
}

export interface WalletProtocolItem {
  /** Canonical chain name where the protocol operates */
  chain: string
  /** Protocol logo image URL */
  logo_url?: string
  /** Individual positions held in this protocol */
  positions: WalletProtocolPosition[] | null
  /** Human-readable protocol name */
  protocol_name: string
  /** Protocol website URL */
  site_url?: string
  /** Total USD value across all positions in this protocol */
  total_usd: number
}
