/**
 * Onchain API — auto-generated from hermod OpenAPI spec.
 * Generated at: 2026-03-20T03:37:53Z
 */

import { proxyGet, proxyPost, type ApiResponse, type OnchainSchemaTable, type OnchainTxItem, type StructuredFilter, type StructuredSort } from './api'
import { useQuery, type UseQueryOptions } from '@tanstack/react-query'

/** Execute a structured JSON query on blockchain data. No raw SQL needed — specify source, fields, filters, sort, and pagination.

All tables live in the **agent** database. Use `GET /v1/onchain/schema` to discover available tables and their columns.

- Source format: `agent.<table_name>` like `agent.ethereum_transactions` or `agent.ethereum_dex_trades`
- Max 10,000 rows (default 20), 30s timeout.
- **Always filter on block_date** — it is the partition key. Without it, queries scan billions of rows and will timeout.
- **Data refresh:** ~24 hours.

## Example

```json
{
  "source": "agent.ethereum_dex_trades",
  "fields": ["block_time", "project", "token_pair", "amount_usd", "taker"],
  "filters": [
    {"field": "block_date", "op": "gte", "value": "2025-03-01"},
    {"field": "project", "op": "eq", "value": "uniswap"},
    {"field": "amount_usd", "op": "gte", "value": 100000}
  ],
  "sort": [{"field": "amount_usd", "order": "desc"}],
  "limit": 20
}
``` */
export async function fetchOnchainQuery(params: { fields?: string[]; filters?: StructuredFilter[]; limit?: number; offset?: number; sort?: StructuredSort[]; source: string }) {
  return proxyPost<any>(`onchain/query`, params)
}

/** Get table metadata — database, table, column names, types, and comments for all available on-chain databases. */
export async function fetchOnchainSchema() {
  return proxyGet<ApiResponse<OnchainSchemaTable>>(`onchain/schema`)
}

/** Execute a raw SQL SELECT query against blockchain data.

All tables live in the **agent** database. Use `GET /v1/onchain/schema` to discover available tables and their columns before writing queries.

## Rules
- Only SELECT/WITH statements allowed (read-only).
- All table references must be database-qualified: `agent.<table_name>`.
- Max 10,000 rows (default 1,000), 30s timeout.
- **Always filter on block_date or block_number** — partition key, without it queries will timeout.
- Avoid `SELECT *` on large tables. Specify only the columns you need.
- **Data refresh:** ~24 hours.

## Example

```sql
SELECT block_time, token_pair, amount_usd, taker, tx_hash
FROM agent.ethereum_dex_trades
WHERE block_date >= today() - 7
  AND project = 'uniswap' AND amount_usd > 100000
ORDER BY amount_usd DESC LIMIT 20
``` */
export async function fetchOnchainSql(params: { max_rows?: number; sql: string }) {
  return proxyPost<any>(`onchain/sql`, params)
}

/**
 * Get transaction details by hash. All numeric fields are hex-encoded — use parseInt(hex, 16) to convert.

**Supported chains:** `ethereum`, `polygon`, `bsc`, `arbitrum`, `optimism`, `base`, `avalanche`, `fantom`, `linea`, `cyber`. Returns 404 if the transaction is not found.
 * - hash: Transaction hash (0x-prefixed hex)
 * - chain: Chain. Can be `ethereum`, `polygon`, `bsc`, `arbitrum`, `optimism`, `base`, `avalanche`, `fantom`, `linea`, or `cyber`.
 */
export async function fetchOnchainTx(params: { hash: string; chain: 'ethereum' | 'polygon' | 'bsc' | 'arbitrum' | 'optimism' | 'base' | 'avalanche' | 'fantom' | 'linea' | 'cyber' }) {
  const qs: Record<string, string> = {}
  qs['hash'] = String(params.hash)
  qs['chain'] = String(params.chain)
  return proxyGet<ApiResponse<OnchainTxItem>>(`onchain/tx`, qs)
}

// ---------------------------------------------------------------------------
// Onchain hooks
// ---------------------------------------------------------------------------

type QueryOpts<T> = Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'>

/** Get on-chain table schema — wraps `fetchOnchainSchema` with React Query caching. */
export function useOnchainSchema(opts?: QueryOpts<ApiResponse<OnchainSchemaTable>>) {
  return useQuery({ queryKey: ['onchain', 'schema'], queryFn: () => fetchOnchainSchema(), ...opts })
}

/** Get transaction by hash — wraps `fetchOnchainTx` with React Query caching. */
export function useOnchainTx(params: Parameters<typeof fetchOnchainTx>[0], opts?: QueryOpts<ApiResponse<OnchainTxItem>>) {
  return useQuery({ queryKey: ['onchain', 'tx', params], queryFn: () => fetchOnchainTx(params!), ...opts })
}
