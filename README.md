# BTC Chanlun Analyzer

基于**缠论**的 BTC 实时分析系统，集成 Polymarket 投注指南。

## 技术栈

| 层 | 技术 |
|---|------|
| 后端 | FastAPI + SQLAlchemy + TA-Lib + APScheduler |
| 前端 | React + Vite + TanStack Query + TailwindCSS |
| 实时 | WebSocket（自动重连 + 即时推送） |
| 部署 | Nginx + systemd + PostgreSQL |

## 功能

- 🕯️ **缠论引擎** — 笔/中枢/背驰/趋势自动识别
- 📊 **多时间框架预测** — 5M/15M/1H/4H/1D 核心区间与支撑/阻力位
- 🎯 **Polymarket 投注指南** — PM 信号 + 缠论概率 + 辅助胜率
- 📈 **6 因子评分** — MACD/量能/布林/资金费率/情绪/RSI
- 🔄 **定时任务** — 15 分钟自动分析 + 5 分钟回测验证
- 📡 **WebSocket** — 实时推送分析结果到前端
- 🌐 **防屏蔽隧道** — 完美打通并兼容 TUN 局域网分流直连规则
- ⚡ **原生盘口对齐** — 深度逆向解析 PM 的 Epoch 时间戳隐藏盘口 (4H/15M)
- ✅ **42 个测试** — 引擎单元测试 + API 集成测试

## 快速开始

### 后端

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt  # 或参考 pyproject.toml
cp .env.example .env
python -m uvicorn app.main:app --port 8000
```

### 前端

```bash
cd frontend
pnpm install
pnpm dev  # http://localhost:5173
```

### 运行测试

```bash
cd backend
python -m pytest tests/ -v
```

## VPS 部署

```bash
# 一键部署（Ubuntu）
bash deploy.sh
```

详见 `deploy.sh` / `nginx.conf` / `chanlun.service`。

## 项目结构

```
├── backend/
│   ├── app/
│   │   ├── engines/       # 缠论引擎 (bi/zhongshu/divergence/trend/prediction/scoring)
│   │   ├── services/      # 业务逻辑 (chanlun/backtest/polymarket)
│   │   ├── api/           # FastAPI 路由 + WebSocket
│   │   ├── clients/       # 外部 API 客户端
│   │   └── models/        # SQLAlchemy 模型
│   └── tests/             # pytest 测试套件
├── frontend/
│   └── src/
│       ├── components/    # React 组件
│       ├── hooks/         # WebSocket hook
│       └── lib/           # API 客户端 + 类型
├── deploy.sh              # 一键 VPS 部署脚本
├── nginx.conf             # Nginx 反向代理配置
└── chanlun.service        # systemd 服务配置
```

## License

MIT
