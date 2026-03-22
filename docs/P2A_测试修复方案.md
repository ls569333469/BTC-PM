# P2-A 测试修复与优化方案

> 基于 P2 审计结果，针对测试覆盖缺口的具体修复计划

---

## 当前测试现状

| 维度 | 状态 |
|------|------|
| 测试文件 | 2 个 (`test_engines.py` + `test_api.py`) |
| 测试用例 | 42 个，全部通过 |
| 覆盖范围 | 6 个引擎模块 ✅ / 7 个 API 端点组 ✅ / WebSocket ✅ |
| **缺口** | **3 个客户端 / 2 个服务 / 1 个 API / 15 个前端组件** |

### 覆盖率地图

```
                         ✅ 已覆盖              ❌ 未覆盖
┌─────────────────────────────────────────────────────────┐
│  engines/   bi ✅  zhongshu ✅  divergence ✅            │
│            trend ✅ prediction ✅ scoring ✅              │
├─────────────────────────────────────────────────────────┤
│  api/       health ✅  chanlun ✅  backtest ✅           │
│            polymarket ✅  ws ✅  CORS ✅                 │
│            cron ❌                                       │
├─────────────────────────────────────────────────────────┤
│  clients/   binance_client ❌                            │
│            polymarket_client ❌                           │
│            market_client ❌                               │
├─────────────────────────────────────────────────────────┤
│  services/  chanlun_service ⚠️(间接)                     │
│            polymarket_service ❌                          │
│            backtest_service ❌                            │
├─────────────────────────────────────────────────────────┤
│  frontend/  15 个组件 ❌ (无测试框架)                     │
└─────────────────────────────────────────────────────────┘
```

---

## 修复计划（3 轮）

### 第 1 轮：后端客户端 Mock 测试 `[新建 test_clients.py]`

**目标：** 3 个外部 API 客户端的错误处理路径测试（不实际请求外部 API）

#### binance_client 测试用例

| # | 测试名 | 场景 | 预期行为 |
|---|--------|------|---------|
| 1 | `test_get_klines_success` | 正常返回 K 线数据 | 解析为正确格式 |
| 2 | `test_get_klines_timeout` | httpx.TimeoutError | 抛出异常/返回空 |
| 3 | `test_get_klines_rate_limit` | HTTP 429 | 抛出 HTTPStatusError |
| 4 | `test_get_klines_geo_block` | HTTP 451 (美国封锁) | 抛出/优雅降级 |
| 5 | `test_get_klines_invalid_json` | 畸形 JSON | 抛出 JSONDecodeError |
| 6 | `test_get_ticker_price_success` | 正常 | 返回 float 价格 |
| 7 | `test_get_funding_rate_success` | 正常 | 返回费率 dict |
| 8 | `test_get_open_interest_success` | 正常 | 返回持仓量 |

#### polymarket_client 测试用例

| # | 测试名 | 场景 | 预期行为 |
|---|--------|------|---------|
| 9 | `test_fetch_events_success` | 正常返回事件列表 | 解析为事件列表 |
| 10 | `test_fetch_events_empty` | API 返回空列表 | 返回空列表 |
| 11 | `test_fetch_events_timeout` | 超时 | 抛出异常 |
| 12 | `test_fetch_events_server_error` | HTTP 500 | 抛出 HTTPStatusError |

#### market_client 测试用例

| # | 测试名 | 场景 | 预期行为 |
|---|--------|------|---------|
| 13 | `test_get_fear_greed_success` | 正常 | 返回 {value, label} |
| 14 | `test_get_fear_greed_timeout` | 超时 | 抛出异常 |
| 15 | `test_get_btc_price_coingecko_success` | 正常 | 返回 float |
| 16 | `test_get_btc_market_data_success` | 正常 | 返回完整 dict |

**技术方案：** 使用 `pytest` + `respx` (httpx mock 库) 拦截 HTTP 请求

```python
# 示例实现模式
import respx
from httpx import Response

@respx.mock
async def test_get_klines_success():
    respx.get("https://api.binance.com/api/v3/klines").mock(
        return_value=Response(200, json=[[1, "70000", "71000", ...]])
    )
    client = BinanceClient()
    klines = await client.get_klines("BTCUSDT", "1h")
    assert len(klines) > 0

@respx.mock
async def test_get_klines_timeout():
    respx.get("https://api.binance.com/api/v3/klines").mock(
        side_effect=httpx.TimeoutException("timeout")
    )
    client = BinanceClient()
    with pytest.raises(httpx.TimeoutException):
        await client.get_klines("BTCUSDT", "1h")
```

**新增依赖：** `respx`（httpx 的 mock 库），`pytest-asyncio`

---

### 第 2 轮：后端服务层测试 `[新建 test_services.py]`

**目标：** 2 个核心服务的业务逻辑测试

#### polymarket_service 测试用例

| # | 测试名 | 场景 |
|---|--------|------|
| 17 | `test_generate_fallback_guides` | 无 PM 市场时生成回退指南 |
| 18 | `test_fallback_guide_base_price` | 每个时间档 basePrice != currentPrice |
| 19 | `test_fallback_guide_offset` | 偏移值非零 |
| 20 | `test_guide_action_chinese` | 动作名为中文（看涨买入/看跌买入/观望） |
| 21 | `test_guide_timeframe_count` | 返回 4 个时间档 |
| 22 | `test_process_updown_events` | 正确解析 PM 涨跌事件 |

#### backtest_service 测试用例

| # | 测试名 | 场景 |
|---|--------|------|
| 23 | `test_validate_prediction_hit` | 预测正确时标记为 hit |
| 24 | `test_validate_prediction_miss` | 预测错误时标记为 miss |
| 25 | `test_validate_empty_predictions` | 空列表返回空结果 |
| 26 | `test_stats_calculation` | 统计计算正确 (accuracy, win_rate) |

#### cron API 测试用例

| # | 测试名 | 场景 |
|---|--------|------|
| 27 | `test_cron_trigger_endpoint` | `/api/cron/trigger` 返回 200 |
| 28 | `test_cron_scheduler_running` | 调度器启动状态检查 |

---

### 第 3 轮：修复已有测试的问题

**目标：** 提升现有测试的健壮性

| # | 问题 | 修复 |
|---|------|------|
| A | `test_api.py` 的 `test_analysis_*` 使用实际 Binance API | Mock 掉外部调用，避免网络依赖 |
| B | `test_api.py` 的 `test_prices_*` 同上 | Mock Polymarket API |
| C | `conftest.py` 缺少 async 配置 | 添加 `pytest-asyncio` marker |
| D | 无测试 CI 集成 | 添加 GitHub Actions workflow |

---

## 不在本方案范围

| 排除项 | 原因 |
|--------|------|
| 前端组件测试 | 需要先搭建 Vitest + Testing Library，工作量大，建议 P3 |
| E2E 测试 | 需要 Playwright/Cypress，建议 P3 |
| 性能测试 | 当前无性能瓶颈，按需 |
| 负载测试 | 单用户系统，不需要 |

---

## 预期成果

| 指标 | 修复前 | 修复后 |
|------|--------|--------|
| 测试用例数 | 42 | **~70** |
| 测试文件数 | 2 | **4** (`+test_clients.py`, `+test_services.py`) |
| 客户端覆盖 | 0/3 | **3/3** |
| 服务层覆盖 | 0/3 | **2/3** (chanlun_service 间接覆盖) |
| 外部依赖 mock | 0 | **全部 mock** |
| CI 集成 | 无 | **GitHub Actions** |

---

## 执行优先级

```
第 1 轮 (客户端 Mock)  ──▶  最高优先  ──▶  解决"API 故障时静默失败"
第 2 轮 (服务层测试)   ──▶  高优先    ──▶  解决"业务逻辑无验证"  
第 3 轮 (修复+CI)      ──▶  中优先    ──▶  解决"测试依赖网络"
```
