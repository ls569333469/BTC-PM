# BTC Chanlun Analyzer — 项目架构导图

## 1. 系统架构总览

```mermaid
graph TB
    subgraph External["🌐 外部数据源"]
        Binance["Binance API<br/>K线 · 资金费率 · 持仓量"]
        AlterMe["Alternative.me<br/>恐惧贪婪指数"]
        Gamma["Polymarket Gamma API<br/>预测市场盘口"]
        Chainlink["Chainlink Data Stream<br/>BTC/USD 基准价 (priceToBeat)"]
    end

    subgraph Backend["⚙️ 后端 · FastAPI + Python :8000"]
        subgraph APIs["API 路由"]
            A1["/api/chanlun/analysis"]
            A2["/api/backtest/stats"]
            A3["/api/polymarket-prices/prices"]
            A4["/api/cron"]
            A5["/ws/analysis"]
        end

        subgraph Services["服务层"]
            S1["ChanlunService<br/>缠论分析编排"]
            S2["BacktestService<br/>回测统计"]
            S3["PolymarketService<br/>PM数据处理"]
        end

        subgraph Engine["缠论引擎 (本地计算)"]
            E1["bi.py 笔识别"] --> E2["zhongshu.py 中枢构建"]
            E2 --> E3["divergence.py 背驰检测"]
            E3 --> E4["trend.py 趋势分析"]
            E4 --> E5["prediction.py 7级别预测"]
            E5 --> E6["scoring.py 双因子评分"]
        end

        Sched["APScheduler<br/>⏰ 15min分析 · 5min结算"]
        DB[("PostgreSQL<br/>预测记录")]
        WSMgr["WebSocket Manager<br/>实时广播"]
    end

    subgraph Frontend["🖥️ 前端 · React + Vite :5173"]
        RQ["TanStack Query<br/>HTTP轮询缓存"]
        WSH["useWebSocket<br/>实时接收"]
        
        subgraph UI["页面组件"]
            C1["MarketOverview 市场概览"]
            C2["PriceChart K线+缠论"]
            C3["PredictionTable 预测表"]
            C4["PolymarketGuide 投注指南"]
            C5["WinRateChart 胜率图"]
            C6["BacktestPanel 回测"]
            C7["TriggerPanel 触发因素"]
        end
    end

    Binance --> S1
    AlterMe --> S1
    Gamma --> S3
    Chainlink -.->|priceToBeat| Gamma

    A1 --> S1
    A2 --> S2
    A3 --> S3
    S1 --> Engine
    S2 --> DB

    Sched -->|每15min| S1
    Sched -->|每5min| S2
    S1 -->|广播| WSMgr
    WSMgr --> A5

    A5 -->|推送| WSH
    RQ -->|轮询| APIs
    WSH -->|更新缓存| RQ
    RQ --> UI
```

---

## 2. 核心分析流程 (每15分钟自动执行)

```mermaid
flowchart TD
    A["⏰ APScheduler 触发 auto_analysis()"] --> B["📡 并行获取外部数据"]
    
    B --> B1["Binance: 168根 1H K线"]
    B --> B2["Binance: 资金费率"]
    B --> B3["Alternative.me: 恐惧贪婪"]
    B --> B4["Binance: 持仓量"]
    
    B1 & B2 & B3 & B4 --> C["📊 本地计算技术指标<br/>RSI · MACD · 布林带"]
    
    C --> D["🔧 缠论引擎流水线"]
    D --> D1["笔识别 (顶底分型过滤)"]
    D1 --> D2["中枢构建 (3笔重叠)"]
    D2 --> D3["背驰检测 (MACD面积对比)"]
    D3 --> D4["趋势判断 (bullish/bearish/consolidating)"]
    D4 --> D5["7级别价格预测<br/>30M ±0.05% ~ 24H ±0.7%"]
    D5 --> D6["双因子评分<br/>缠论因子 + 市场因子 → 综合胜率"]
    
    D6 --> E["💾 保存预测到 PostgreSQL"]
    D6 --> F{"有 WS 客户端?"}
    F -->|是| G["📡 WebSocket 广播到前端<br/>前端 TanStack Query 缓存即时更新"]
    F -->|否| H["跳过广播"]
```

---

## 3. Polymarket 数据流 (每5分钟轮询)

```mermaid
flowchart TD
    A["前端请求 GET /api/polymarket-prices/prices"] --> B["PolymarketService.get_prices()"]
    
    B --> C["获取缠论预测 (ChanlunService)"]
    B --> D["并行获取 5 个时间框架"]
    
    D --> D1["15M: btc-updown-15m-{unix_ts}"]
    D --> D2["1H: bitcoin-up-or-down-{月}-{日}-{年}-{时}{am/pm}-et"]
    D --> D3["4H: btc-updown-4h-{unix_ts}"]
    D --> D4["Daily: bitcoin-up-or-down-on-{月}-{日}-{年}"]
    D --> D5["Weekly: bitcoin-above-on-{月}-{日}"]
    
    D1 & D2 & D3 & D4 & D5 --> E["httpx → Gamma API<br/>GET /events?slug=X"]
    
    E --> F["解析返回数据"]
    F --> F1["outcomes · outcomePrices<br/>json.loads() → upProb / downProb"]
    F --> F2["eventMetadata.priceToBeat<br/>Chainlink BTC/USD 快照价"]
    
    C & F1 & F2 --> G["_generate_guides()<br/>合并缠论预测 + PM市场概率"]
    G --> G1["basePrice = priceToBeat 优先"]
    G --> G2["predictedDelta = 缠论目标 - 基准价"]
    G --> G3["action = 看涨买入 / 看跌买入 / 观望"]
    
    G1 & G2 & G3 --> H["返回 timeframes[] + guides[]"]
```

---

## 4. 前端数据获取与组件映射

```mermaid
flowchart LR
    subgraph DataSources["数据获取"]
        WS["WebSocket 推送<br/>(实时, 15min周期)"]
        P1["useChanlunAnalysis<br/>HTTP 每15min"]
        P2["usePolymarketPrices<br/>HTTP 每5min"]
        P3["useBacktestStats<br/>HTTP 每1min"]
    end

    WS -->|"type:analysis → setQueryData"| Cache["TanStack Query 缓存"]
    P1 & P2 & P3 --> Cache

    Cache --> C1["MarketOverview<br/>BTC价格 · 趋势 · RSI · 恐惧贪婪 · 费率 · 持仓"]
    Cache --> C2["PriceChart<br/>K线 + 缠论笔 + 中枢 叠加图"]
    Cache --> C3["PredictionChart + WinRateChart<br/>目标价投影 · 各TF胜率柱状图"]
    Cache --> C4["PredictionTable<br/>7级别预测 + PM盘口 + PM信号"]
    Cache --> C5["PolymarketGuide<br/>5级别投注指南 (基准价·偏移·概率)"]
    Cache --> C6["BacktestPanel<br/>回测统计 (总胜率·各TF·最近预测)"]
    Cache --> C7["TriggerPanel<br/>关键触发因素"]
```

---

## 5. 自动结算流程 (每5分钟)

```mermaid
flowchart LR
    A["⏰ auto_resolve()"] --> B["查询 DB<br/>已过期未结算预测"]
    B --> C["Binance API<br/>获取 BTC 当前价"]
    C --> D["逐条比较"]
    D --> D1["方向正确? up且涨 / down且跌"]
    D --> D2["误差 < 0.5% → EXACT"]
    D --> D3["误差 < 1.5% → CLOSE"]
    D --> D4["方向对 → HIT"]
    D --> D5["都不满足 → MISS"]
    D1 & D2 & D3 & D4 & D5 --> E["更新 DB<br/>actual_price · accuracy_grade · error_pct"]
```

---

## 6. 页面布局

```
┌─────────────────────────────────────────────────────────────┐
│  Header: BTC Chanlun Analyzer · POLYMARKET BETTING GUIDE    │
├─────────────────────────────────────────────────────────────┤
│  MarketOverview: 价格 │ 趋势 │ RSI │ 恐惧贪婪 │ 费率 │ 持仓  │
├─────────────────────────────────────────────────────────────┤
│  PriceChart: K线 + 缠论笔 + 中枢区间 覆盖                    │
├────────────────────────────┬────────────────────────────────┤
│  PredictionChart           │  WinRateChart                  │
│  目标价 · 支撑 · 阻力       │  30M~24H 各级别胜率             │
├────────────────────────────┴────────────────────────────────┤
│  PredictionTable: 多时间框架预测                              │
│  时间周期 │ 信号 │ PM盘口 │ PM信号 │ 目标价 │ 涨跌幅 │ 胜率    │
├─────────────────────────────────────────────────────────────┤
│  PolymarketGuide: Polymarket 投注指南                        │
│  开盘基准价 │ 当前偏移 │ 确定概率 │ 缠论胜率 │ 市场概率         │
├────────────────────────────┬────────────────────────────────┤
│  TriggerPanel              │  BacktestPanel                 │
│  关键触发因素               │  回测统计 (胜率/精度/趋势)       │
└────────────────────────────┴────────────────────────────────┘
```
