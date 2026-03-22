# API Index

Read `api-{category}.ts` for full signatures and types.
GET endpoints have a React Query hook: `use` + FunctionName (e.g. `fetchMarketPrice` → `useMarketPrice`).
POST mutation endpoints (Onchain SQL, Web fetch) have fetch functions only — no hooks.

## Market — `api-market.ts`
- `fetchMarketEtf(symbol)` — Get daily ETF flow history for US spot ETFs — net flow (USD), token price, and per-ticker breakdown. Sorted by date descending. `symbol`: `BTC` or `ETH`.
- `fetchMarketFearGreed()` — Get Bitcoin Fear & Greed Index history — index value (0-100), classification label, and BTC price at each data point. Sorted newest-first. Use `from`/`to` to filter by date range.
- `fetchMarketFutures()` — Get futures market data across all tracked tokens — open interest, funding rate, long/short ratio, and 24h volume. Sort by `sort_by` (default: volume_24h).
- `fetchMarketLiquidationChart(symbol)` — Get OHLC-style aggregated liquidation data for a token on a specific exchange. Filter by `symbol`, `exchange`, and `interval`. Useful for charting liquidation volume over time.
- `fetchMarketLiquidationExchangeList()` — Get liquidation breakdown by exchange — total, long, and short volumes in USD. Filter by `symbol` and `time_range` (`1h`, `4h`, `12h`, `24h`).
- `fetchMarketLiquidationOrder()` — Get individual large liquidation orders above a USD threshold (`min_amount`, default 10000). Filter by `exchange` and `symbol`.

For aggregate totals and long/short breakdown by exchange, use `/market/liquidation/exchange-list`. For historical liquidation charts, use `/market/liquidation/chart`.
- `fetchMarketOnchainIndicator(symbol, metric)` — Get on-chain indicator time-series for BTC or ETH. Metrics: `nupl`, `sopr`, `mvrv`, `puell-multiple`, `nvm`, `nvt`, `nvt-golden-cross`, `exchange-flows` (inflow/outflow/netflow/reserve).
- `fetchMarketOptions(symbol)` — Get options market data — open interest, volume, put/call ratio, and max pain price for a `symbol`.
- `fetchMarketPrice(symbol)` — Get historical price data points for a token. Use `time_range` for predefined windows (`1d`, `7d`, `14d`, `30d`, `90d`, `180d`, `365d`, `max`) or `from`/`to` for a custom date range (Unix timestamp or YYYY-MM-DD). Granularity is automatic: 5-min for 1d, hourly for 7-90d, daily for 180d+.
- `fetchMarketPriceIndicator(indicator, symbol)` — Get a technical indicator for a trading pair on a given exchange and interval. Set `from`/`to` for time-series mode, omit for latest value. Use `options` for indicator-specific tuning (e.g. `period:7`, `fast_period:8,slow_period:21,signal_period:5`, `period:10,stddev:1.5`). Indicators: `rsi`, `macd`, `ema`, `sma`, `bbands`, `stoch`, `adx`, `atr`, `cci`, `obv`, `vwap`, `dmi`, `ichimoku`, `supertrend`.
- `fetchMarketRanking()` — List tokens ranked by metric. Available metrics: `market_cap`, `top_gainers`, `top_losers`, `volume`. Note: `top_gainers` and `top_losers` rank by 24h price change within the top 250 coins by market cap.

For circulating supply, FDV, ATH/ATL, use `/project/detail?fields=token_info`.

## Project — `api-project.ts`
- `fetchProjectDefiMetrics(metric)` — Get time-series DeFi metrics for a project. Available metrics: `volume`, `fee`, `fees`, `revenue`, `tvl`, `users`. Lookup by UUID (`id`) or name (`q`). Filter by `chain` and date range (`from`/`to`). Returns 404 if the project is not found. **Note:** this endpoint only returns data for DeFi protocol projects (e.g. `aave`, `uniswap`, `lido`, `makerdao`). Use `q` with a DeFi protocol name.
- `fetchProjectDefiRanking(metric)` — Get top DeFi projects ranked by a protocol metric. Available metrics: `tvl`, `revenue`, `fees`, `volume`, `users`.
- `fetchProjectDetail()` — Get multiple project sub-resources in a single request. Use `fields` to select: `overview`, `token_info`, `tokenomics`, `funding`, `team`, `contracts`, `social`, `tge_status`. **Accepts project names directly** via `q` (e.g. `?q=aave`) — no need to call `/search/project` first. Also accepts UUID via `id`. Returns 404 if not found.

For DeFi metrics (TVL, fees, revenue, volume, users) and per-chain breakdown, use `/project/defi/metrics`.

## Wallet — `api-wallet.ts`
- `fetchWalletDetail(address)` — Get multiple wallet sub-resources in a single request. Lookup by `address`. Use `fields` to select: `balance`, `tokens`, `labels`, `nft`. Partial failures return available fields with per-field error info. Returns 422 if `fields` is invalid.
- `fetchWalletHistory(address)` — Get full transaction history for a wallet — swaps, transfers, and contract interactions. Lookup by `address`. Filter by `chain` — supports `ethereum`, `polygon`, `bsc`, `arbitrum`, `optimism`, `avalanche`, `fantom`, `base`.
- `fetchWalletLabelsBatch(addresses)` — Get entity labels for multiple wallet addresses. Pass up to 100 comma-separated addresses via the `addresses` query parameter. Returns entity name, type, and labels per address.
- `fetchWalletNetWorth(address)` — Get a time-series of the wallet's total net worth in USD. Returns ~288 data points at 5-minute intervals covering the last 24 hours. Fixed window — no custom time range supported.
- `fetchWalletProtocols(address)` — Get all DeFi protocol positions for a wallet — lending, staking, LP, and farming with token breakdowns and USD values. Lookup by `address`.
- `fetchWalletTransfers(address)` — Get recent token transfers **sent or received by a wallet**. Pass the **wallet address** in `address` — returns all ERC-20/SPL token transfers where this wallet is the sender or receiver. Each record includes token contract, counterparty, raw amount, and block timestamp.

Use this to audit a wallet's token flow (e.g. inflows, outflows, airdrop receipts).

Lookup: `address` (wallet, raw 0x hex or base58 — ENS not supported). Filter by `chain` — supports `ethereum`, `base`, `solana`.
Data refresh: ~24 hours · Chain: Ethereum, Base (Solana uses a different source with no delay)

## Token — `api-token.ts`
- `fetchTokenDexTrades(address)` — Get recent DEX swap events for a token contract address. Covers DEXes like `uniswap`, `sushiswap`, `curve`, and `balancer` on `ethereum` and `base`. Returns trading pair, amounts, USD value, and taker address.

Data refresh: ~24 hours · Chain: Ethereum, Base
- `fetchTokenHolders(address, chain)` — Get top token holders for a contract address — wallet address, balance, and percentage. Lookup by `address` and `chain`. Supports EVM chains and Solana.
- `fetchTokenTokenomics()` — Get token unlock time-series — unlock events with amounts and allocation breakdowns. Lookup by project UUID (`id`) or token `symbol`. Filter by date range with `from`/`to`. Defaults to the current calendar month when omitted. Returns 404 if no token found.
- `fetchTokenTransfers(address, chain)` — Get recent transfer events **for a specific token** (ERC-20 contract). Pass the **token contract address** in `address` — returns every on-chain transfer of that token regardless of sender/receiver. Each record includes sender, receiver, raw amount, and block timestamp.

Use this to analyze a token's on-chain activity (e.g. large movements, distribution patterns).

Lookup: `address` (token contract) + `chain`. Sort by `asc` or `desc`.
Data refresh: ~24 hours · Chain: Ethereum, Base (Solana uses a different source with no delay)

## Social — `api-social.ts`
- `fetchSocialDetail()` — Get a **point-in-time snapshot** of social analytics: sentiment score, follower geo breakdown, and top smart followers. Use `fields` to select: `sentiment`, `follower_geo`, `smart_followers`. Lookup by X account ID (`x_id`) or project name (`q`, e.g. `uniswap`, `solana`). The `q` parameter must be a crypto project name, not a personal Twitter handle. Returns 404 if the project has no linked Twitter account.

For sentiment **trends over time**, use `/social/mindshare` instead.
- `fetchSocialMindshare(q, interval)` — Get mindshare (social view count) **time-series trend** for a project, aggregated by `interval`. Use this when the user asks about sentiment **trends**, mindshare **over time**, or social momentum changes. `interval` can be `5m`, `1h`, `1d`, or `7d`. Filter by date range with `from`/`to` (Unix seconds). Lookup by name (`q`).

For a **point-in-time snapshot** of social analytics (sentiment score, follower geo, smart followers), use `/social/detail` instead.
- `fetchSocialRanking()` — Get top crypto projects ranked by mindshare (social view count), sourced directly from Argus real-time data (refreshed every 5 minutes). Filter by `tag` to scope to a category (e.g. `dex`, `l1`, `meme`). Use `time_range` (`24h`, `48h`, `7d`, `30d`) to control the ranking window. Supports `limit`/`offset` pagination.
- `fetchSocialSmartFollowersHistory()` — Get smart follower count time-series for a project, sorted by date descending. Lookup by X account ID (`x_id`) or project name (`q`). The `q` parameter must be a project name (e.g. `uniswap`, `ethereum`), not a personal X handle — use `x_id` for individual accounts. Returns 404 if the project has no linked X account.
- `fetchSocialTweetReplies(tweet_id)` — Returns replies/comments on a specific tweet. Lookup by `tweet_id`.
- `fetchSocialTweets(ids)` — Get X (Twitter) posts by numeric post ID strings. Pass up to 100 comma-separated IDs via the `ids` query parameter.
- `fetchSocialUser(handle)` — Get an X (Twitter) user profile — display name, follower count, following count, and bio. Lookup by `handle` (without @).
- `fetchSocialUserFollowers(handle)` — Returns a list of followers for the specified handle on X (Twitter). Lookup by `handle` (without @).
- `fetchSocialUserFollowing(handle)` — Returns a list of users that the specified handle follows on X (Twitter). Lookup by `handle` (without @).
- `fetchSocialUserPosts(handle)` — Get recent X (Twitter) posts by a specific user, ordered by recency. Lookup by `handle` (without @). Use `filter=original` to exclude retweets. To load more results, check `meta.has_more`; if true, pass `meta.next_cursor` as the `cursor` query parameter in the next request.
- `fetchSocialUserReplies(handle)` — Returns recent replies by the specified handle on X (Twitter). Lookup by `handle` (without @).

## News — `api-news.ts`
- `fetchNewsDetail(id)` — Returns the full content of a single news article by its ID (returned as `id` in feed and search results).
- `fetchNewsFeed()` — Browse crypto news from major sources. Filter by `source` (enum), `project`, and time range (`from`/`to`). Sort by `recency` (default) or `trending`. Use the detail endpoint with article `id` for full content.

## Onchain — `api-onchain.ts`
- `fetchOnchainQuery(source)` — Execute a structured JSON query on blockchain data. No raw SQL needed — specify source, fields, filters, sort, and pagination.

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
```
- `fetchOnchainSchema()` — Get table metadata — database, table, column names, types, and comments for all available on-chain databases.
- `fetchOnchainSql(sql)` — Execute a raw SQL SELECT query against blockchain data.

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
```
- `fetchOnchainTx(hash, chain)` — Get transaction details by hash. All numeric fields are hex-encoded — use parseInt(hex, 16) to convert.

**Supported chains:** `ethereum`, `polygon`, `bsc`, `arbitrum`, `optimism`, `base`, `avalanche`, `fantom`, `linea`, `cyber`. Returns 404 if the transaction is not found.

## Web — `api-web.ts`
- `fetchWebFetch(url)` — Fetch a web page and convert it to clean, LLM-friendly markdown. Use `target_selector` to extract specific page sections and `remove_selector` to strip unwanted elements. Returns 400 if the URL is invalid or unreachable.

## Fund — `api-fund.ts`
- `fetchFundDetail()` — Get a fund's **profile metadata**: X accounts, team members, recent research, and invested project count. This does NOT return the list of investments — use `/fund/portfolio` for that. Lookup by UUID (`id`) or name (`q`). Returns 404 if not found.
- `fetchFundPortfolio()` — List investment rounds for a fund's portfolio, sorted by date (newest first). A project may appear multiple times if the fund participated in multiple rounds. Each entry includes project name, logo, date, raise amount, and lead investor status. Lookup by UUID (`id`) or name (`q`).
- `fetchFundRanking(metric)` — List top-ranked funds by metric. Available metrics: `tier` (lower is better), `portfolio_count` (number of invested projects).

## Search — `api-search.ts`
- `fetchSearchAirdrop()` — Search and filter airdrop opportunities by keyword, status, reward type, and task type. Returns paginated results with optional task details.
- `fetchSearchEvents()` — Search project events by keyword, optionally filtered by `type`. Valid types: `launch`, `upgrade`, `partnership`, `news`, `airdrop`, `listing`, `twitter`. Lookup by UUID (`id`) or name (`q`). Returns 404 if the project is not found.
- `fetchSearchFund(q)` — Search funds by keyword. Returns matching funds with name, tier, type, logo, and top invested projects.
- `fetchSearchKalshi(q)` — Search Kalshi events by keyword matching event title, subtitle, or market title. Returns events with nested markets.

Data refresh: ~30 minutes
- `fetchSearchNews(q)` — Search crypto news articles by keyword. Returns top 10 results ranked by relevance with highlighted matching fragments.
- `fetchSearchPolymarket(q)` — Search Polymarket events by keyword matching market question, event title, or description. Returns events with nested markets ranked by volume.

Data refresh: ~30 minutes
- `fetchSearchProject(q)` — Search crypto projects by keyword. Returns matching projects with name, description, chains, and logo.
- `fetchSearchSocial(q)` — Search X (Twitter) posts by keyword or `from:handle` syntax. Returns posts with author, content, engagement metrics, and timestamp. To load more results, check `meta.has_more`; if true, pass `meta.next_cursor` as the `cursor` query parameter in the next request.
- `fetchSearchSocialPeople(q)` — Search X (Twitter) users by keyword. Returns user profiles with handle, display name, bio, follower count, and avatar.
- `fetchSearchWallet(q)` — Search wallets by ENS name, address label, or address prefix. Returns matching wallet addresses with entity labels.
- `fetchSearchWeb(q)` — Search web pages, articles, and content by keyword. Filter by domain with `site` like `coindesk.com`. Returns titles, URLs, and content snippets.

## Prediction Market — `api-prediction-market.ts`
- `fetchPredictionMarketCategoryMetrics()` — Get daily notional volume and open interest aggregated by category across Kalshi and Polymarket. Filter by `source` or `category`.

Data refresh: daily
- `fetchPredictionMarketKalshiEvents(event_ticker)` — Get Kalshi events with nested markets, optionally filtered by `event_ticker`. Each event includes market count and a list of markets.

Data refresh: ~30 minutes
- `fetchPredictionMarketKalshiMarkets(market_ticker)` — Get Kalshi markets, optionally filtered by `market_ticker`. Each market includes price, volume, and status.

Data refresh: ~30 minutes
- `fetchPredictionMarketKalshiOpenInterest(ticker)` — Get daily open interest history for a Kalshi market filtered by `time_range`.

Data refresh: ~30 minutes
- `fetchPredictionMarketKalshiPrices(ticker)` — Get price history for a Kalshi market. Use `interval=1d` for daily OHLC from market reports (~30 min delay), or `interval=latest` for real-time price from trades.

Data refresh: ~30 minutes (daily), real-time (latest)
- `fetchPredictionMarketKalshiRanking()` — Get top-ranked Kalshi markets by last day's `notional_volume_usd` or `open_interest`. Filter by `status`.

Data refresh: ~30 minutes
- `fetchPredictionMarketKalshiTrades(ticker)` — Get individual trade records for a Kalshi market. Filter by `taker_side`, `min_contracts`, and date range. Sort by `timestamp` or `num_contracts`.

Data refresh: real-time
- `fetchPredictionMarketKalshiVolumes(ticker)` — Get daily trading volume history for a Kalshi market filtered by `time_range`.

Data refresh: ~30 minutes
- `fetchPredictionMarketPolymarketEvents(event_slug)` — Get Polymarket events with nested markets, optionally filtered by `event_slug`. Each event includes aggregated status, volume, and a list of markets with `side_a`/`side_b` outcomes.

Data refresh: ~30 minutes
- `fetchPredictionMarketPolymarketMarkets(market_slug)` — Get Polymarket markets, optionally filtered by `market_slug`. Each market includes `side_a` and `side_b` outcomes. Current prices are available via `/polymarket/prices` using the `condition_id`.

Data refresh: ~30 minutes
- `fetchPredictionMarketPolymarketOpenInterest(condition_id)` — Get daily open interest history for a Polymarket market.

Data refresh: ~30 minutes
- `fetchPredictionMarketPolymarketPositions(address)` — Get wallet positions on Polymarket markets.

Data refresh: ~30 minutes
- `fetchPredictionMarketPolymarketPrices(condition_id)` — Get aggregated price history for a Polymarket market. Use `interval=latest` for the most recent price snapshot.

Data refresh: ~30 minutes
- `fetchPredictionMarketPolymarketRanking()` — Get top-ranked Polymarket markets by `volume_24h`, `volume_7d`, `open_interest`, or `trade_count`. Filter by `status` and `end_before`.

Data refresh: ~30 minutes
- `fetchPredictionMarketPolymarketTrades(condition_id)` — Get paginated trade records for a Polymarket market. Filter by `outcome_label`, `min_amount`, and date range. Sort by `newest`, `oldest`, or `largest`.

Data refresh: ~30 minutes
- `fetchPredictionMarketPolymarketVolumes(condition_id)` — Get trading volume and trade count history for a Polymarket market.

Data refresh: ~30 minutes
