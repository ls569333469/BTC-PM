/**
 * Onchain types — auto-generated from hermod OpenAPI spec.
 */

export interface AccessListEntry {
  /** Account address (0x-prefixed) */
  address: string
  /** List of storage slot keys (0x-prefixed hex) */
  storageKeys: string[] | null
}

export interface OnchainSchemaCol {
  /** Column comment or description */
  comment?: string
  /** Column name */
  name: string
  /** Column data type like `UInt64`, `String`, or `DateTime` */
  type: string
}

export interface StructuredFilter {
  /** Column name to filter on like `block_number` or `from_address` */
  field: string
  /** Comparison operator: eq, neq, gt, gte, lt, lte, like, in, not_in. For `in`/`not_in`, value must be a JSON array */
  op: string
  /** Comparison value. Use a JSON array for `in`/`not_in` operators like `[21000000, 21000001]` */
  value: unknown
}

export interface StructuredSort {
  /** Column name to sort by like `gas`, `block_number`, or `amount_usd` */
  field: string
  /** Sort direction: asc (default) or desc */
  order?: string
}

export interface OnchainTxItem {
  /** List of addresses and storage keys. Empty array for legacy; populated for EIP-2930+ */
  accessList: AccessListEntry[] | null
  /** Versioned hashes of blob commitments. EIP-4844 only */
  blobVersionedHashes?: string[] | null
  /** Block hash, null if pending */
  blockHash: string | null
  /** Block number (hex), null if pending */
  blockNumber: string | null
  /** Chain ID (hex) */
  chainId?: string
  /** Sender address (0x-prefixed) */
  from: string
  /** Gas limit (hex) */
  gas: string
  /** Gas price in wei (hex). Present in all types; for EIP-1559 this is the effective gas price */
  gasPrice?: string
  /** Transaction hash (0x-prefixed) */
  hash: string
  /** Call data (hex) */
  input: string
  /** Max fee per blob gas in wei (hex). EIP-4844 only */
  maxFeePerBlobGas?: string
  /** Max fee per gas in wei (hex). EIP-1559/EIP-4844 only */
  maxFeePerGas?: string
  /** Max priority fee per gas in wei (hex). EIP-1559/EIP-4844 only */
  maxPriorityFeePerGas?: string
  /** Sender nonce (hex) */
  nonce: string
  /** Signature R (hex) */
  r: string
  /** Signature S (hex) */
  s: string
  /** Recipient address, null for contract creation */
  to: string | null
  /** Index in block (hex), null if pending */
  transactionIndex: string | null
  /** Transaction type: 0x0=legacy, 0x1=EIP-2930, 0x2=EIP-1559, 0x3=EIP-4844 */
  type: string
  /** Signature V (hex). Legacy: recovery ID (0x1b/0x1c); EIP-2930+: parity (0x0/0x1) */
  v: string
  /** ETH value in wei (hex) */
  value: string
  /** Signature Y parity (hex). Present in EIP-2930+ transactions */
  yParity?: string
}

export interface OnchainSchemaTable {
  /** List of columns in this table */
  columns: OnchainSchemaCol[] | null
  /** Database name (always `agent`) */
  database: string
  /** Table name */
  table: string
}
