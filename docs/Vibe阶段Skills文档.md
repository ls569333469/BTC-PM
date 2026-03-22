# Vibe 阶段 Skills 文档

> 记录 Vibe 阶段使用的所有 Skill 及 API 接口

---

## Skills 列表



完整内置 Skill 与 API 能力文档
一、Skill 总览
#	Skill 名称	用途	当前项目是否使用
1	surf-studio	前端构建主框架（React + shadcn + 设计系统 + 暗色模式）	✅ 已使用
2	data-api	Surf 数据代理端点查找、路由策略、API 客户端扩展	✅ 已使用
3	database	PostgreSQL + Drizzle ORM（建表/CRUD/认证）	✅ 已使用
4	onchain	ClickHouse 链上 SQL 分析（DEX/交易/桥/借贷/质押/预测市场）	⬜ 可用
5	fallback-data-api	公开免费 API 备用源（DEX Screener/Deribit/DeFiLlama/Mempool/Snapshot）	⬜ 可用
二、surf-studio（前端主框架）
定位：网站构建的总调度器，编排下面的子 Skill 完成从设计到交付。

子 Skill 清单
子 Skill	目录	功能
Frontend Design	frontend-design/	美学方向、布局规则、动画系统、防AI风格泛化
Responsive Design	responsive-design/	断点适配、网格系统、触控目标、移动端组件模式
React Best Practices	react-best-practices/	React 渲染正确性、SSR 安全、Hooks 规则、API 响应防崩
Theme Factory	theme-factory/	主题切换/创建（默认 Surf Design System）
Chart Toolkit	chart-toolkit/	图表包装器（导出 PNG/CSV、放大查看），所有图表必须用
ECharts	echarts/	ECharts 扁平化风格、Tooltip 模式、坐标轴格式、颜色 token
Transaction Visualizer	transaction-visualizer/	交易追踪、资金流图、钱包间转账可视化
Component Reference	component-reference/	Surf 主题组件模式（卡片/按钮/表格/标签/徽章）
Backend Patterns	backend-patterns/	Express 路由模式（数据组合/第三方API/认证/定时任务）
Design Audit	design-audit/	设计质量审计（排版/配色/布局/交互/内容）
Webapp Testing	webapp-testing/	构建验证 npm run build + 运行时检查
Web Artifacts Builder	web-artifacts-builder/	项目脚手架与开发流程
工作流程
新建项目:
  需求理解 → 设计方案 → 数据可视化(如需) → 前端构建 → 构建验证 → 交付

更新项目:
  重新主题 / 加深色模式 / 加功能 / 改布局 / 接真实数据 / 改内容
三、data-api（数据代理）
定位：所有加密数据的统一入口，通过 ./proxy/* 路由访问，认证自动处理。

可用数据模块
模块	数据域	典型用途
market	价格、合约、期权、ETF、清算、指标、恐贪指数	行情仪表盘
exchange	单交易所实时数据（K线、盘口、资金费率、多空比）	交易所对比
project	项目详情、DeFi 协议指标（TVL/费用/收入）	项目分析页
token	持仓者、DEX 交易、转账、解锁计划	代币分析
wallet	钱包余额、转账、DeFi 仓位、净值、标签	钱包追踪
social	Twitter 数据、Mindshare、KOL 追踪、情绪	社交仪表盘
news	AI 策展的加密新闻	新闻聚合
search	跨类搜索（项目/社交/新闻/钱包/基金/预测市场）	搜索发现
fund	VC 基金详情、持仓、排名	基金追踪
prediction-market	Polymarket + Kalshi（市场/交易/价格/OI/持仓）	预测市场仪表盘
onchain	交易解码、结构化查询、ClickHouse SQL	链上分析
web	网页抓取 + Markdown 提取	外部数据源
db	每用户 PostgreSQL 数据库	持久化存储
market vs exchange 区别
场景	用哪个
BTC 价格历史、排名、情绪指数	market（跨交易所聚合）
币安的K线、盘口、资金费率	exchange（单交易所实时）
ETF 流入、链上指标、技术指标	market（独有数据）
对比多交易所资金费率	exchange（分别调用）
数据策略选择
复杂度	方式	示例
单接口只读	前端 React Query Hook	useMarketPrice({ symbol: "BTC" })
多接口组合/转换	后端路由	backend/routes/analysis.js 组合 3 个 API
代理没有的外部数据	后端路由 + 外部 API	routes/defillama.js 调 DeFiLlama
复杂链上分析	ClickHouse SQL	onchain/sql
四、database（PostgreSQL 数据库）
定位：用户持久化数据存储，每用户独立库。

何时用
用	不用
CRUD（待办/书签/笔记）	只读外部数据（行情/代币信息）
用户认证/登录	静态内容/计算器
跨会话状态	临时缓存
技术栈
组件	说明
Neon PostgreSQL	云端 serverless，dev/prod 分支隔离
Drizzle ORM	类型安全查询（db.select().from(table) 风格）
pg-proxy 驱动	通过 hermod 代理访问，沙箱和部署环境通用
关键规则
数据库代码只能放后端（backend/routes/*.js）
前端只调 REST API（/api/todos），不碰 SQL
支持密码认证（bcryptjs）和 Web3 钱包认证（SIWE）
已有表数据必须保留，永远不要 DROP TABLE
五、onchain（链上数据分析）
定位：通过 4 种模式访问原始链上数据。

4 种访问模式
模式	端点	用途
交易解码	onchain/tx	单笔交易 hash 查询（QuickNode JSON-RPC）
结构化查询	onchain/query	不写 SQL 的过滤/排序（JSON body）
SQL 分析	onchain/sql	ClickHouse 复杂聚合（GROUP BY/JOIN）
Schema 发现	onchain/schema	列出所有表和列定义
支持链
模式	支持的链
交易解码	Ethereum, Polygon, BSC, Arbitrum, Optimism, Base, Avalanche, Fantom, Linea, Cyber
结构化查询	Ethereum, Base, Solana
SQL 分析	全部（见下表）
ClickHouse 数据表
分类	表	数据量	说明
DEX 交易	ethereum_dex_trades / base_dex_trades	478M / 1.3B	DEX 成交记录
交易	ethereum_transactions / base_transactions	3.3B / 5.9B	链上交易
Traces	ethereum_traces / base_traces	15.5B / 134B	内部调用追踪
事件日志	ethereum_event_logs / base_event_logs	6.4B / 22.1B	合约事件
转账	ethereum_transfers / base_transfers	5.8B / 11.6B	代币转账
协议指标	ethereum_fees_daily / ethereum_tvl_daily	35K / 76K	协议费用/TVL（日）
借贷	ethereum_lending_borrow/supply/flashloans	3M / 6.8M / 1.7M	Aave/Compound 等
质押	ethereum_staking_deposits/flows	2.5M / 124.7M	ETH 质押
桥	ethereum_bridge_deposits/withdrawals/flows	13.2M / 8M / 21.2M	跨链桥
Hyperliquid	hyperliquid_funding_rates/market_data	3.6M / 38K	永续合约
Polymarket	polymarket_market_trades/positions/prices	778M / 99.9M / 31.3M	预测市场
Kalshi	kalshi_trades/market_report	283M / 469.6M	预测市场
SQL 规则
只允许 SELECT/WITH，只读
必须加 agent. 前缀（agent.ethereum_dex_trades）
必须过滤索引列（block_date 或 block_time）
最多返回 10,000 行，扫描上限 5B 行
超时 30 秒
六、fallback-data-api（备用公开 API）
定位：Surf 代理覆盖不到时的最后手段，全部免费无需 Key。

API 服务商	数据	何时用	限速
DEX Screener	实时 DEX 交易对、流动性池、新代币发现	Surf 只有 ETH/Base 历史，需要全链实时	300次/分
Deribit	期权盘口、Greeks、IV 曲面、DVOL	Surf 只有聚合 OI，需要逐行权价详情	20次/秒
DeFiLlama	DeFi 收益率/APY、稳定币指标、桥流量	Surf 无收益率数据	~100次/分
Mempool.space	BTC 内存池、推荐 Gas、区块数据、闪电网络	Surf 无比特币专属数据	无限制
Snapshot	DAO 提案、投票结果、参与率	Surf 无治理数据	无限制
使用规则
必须先试 Surf 代理，试完不行才用备用
先读 API 文档再写代码
先测连通性再开发
只在后端路由调用，前端不直接访问外部 API
七、当前项目实际使用情况
                    ┌─────────────────────────────────────┐
                    │          本项目已使用的能力            │
                    ├─────────────────────────────────────┤
                    │                                     │
  Skill层:          │  surf-studio ✅                     │
                    │  data-api ✅                        │
                    │  database ✅                        │
                    │                                     │
  数据服务层:        │  Surf 代理 ✅ (14个端点)            │
                    │  Chainlink 预言机 ✅ (链上BTC/USD)   │
                    │  币安 ✅ (通过Surf代理)              │
                    │  OKX ✅ (直连备用)                   │
                    │  Polymarket ✅ (通过Surf代理)        │
                    │  CoinGecko ✅ (通过Surf聚合)         │
                    │  Coinglass ✅ (通过Surf聚合)         │
                    │  Alternative.me ✅ (恐贪指数)        │
                    │  以太坊公共RPC ✅ (读取Chainlink合约)  │
                    │                                     │
  存储层:           │  PostgreSQL ✅ (回测数据)            │
                    │                                     │
                    ├─────────────────────────────────────┤
                    │          可用但未使用的能力            │
                    ├─────────────────────────────────────┤
                    │  onchain ⬜ (ClickHouse SQL)        │
                    │  fallback-data-api ⬜               │
                    │    - DEX Screener ⬜                │
                    │    - Deribit ⬜                     │
                    │    - DeFiLlama ⬜                   │
                    │    - Mempool.space ⬜               │
                    │    - Snapshot ⬜                    │
                    └─────────────────────────────────────┘