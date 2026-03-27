# P14 · Google Cloud 东京部署方案（完整版）

## 📋 已创建的 VM 配置

| 项目 | 值 |
|---|---|
| **实例名称** | `btc-chanlun` |
| **区域** | `asia-northeast1-b`（东京） |
| **机器类型** | N2 — `n2-standard-2`（2 vCPU / 8 GB RAM） |
| **启动磁盘** | Ubuntu 24.04 LTS Minimal, 40GB 平衡永久磁盘 |
| **防火墙** | HTTP ✅ HTTPS ✅ |
| **备份** | 每日快照（19:00-20:00 亚太区） |
| **月费** | ~$78（由 Google Developer Program 赠金覆盖，余额 ~$1,478） |

---

## 🚀 部署步骤

> SSH 进入服务器后，按顺序执行以下命令。每个 Step 等上一步完成后再执行下一步。

### Step 1 — 系统基础环境（约 3 分钟）

```bash
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y build-essential python3-dev python3-pip python3-venv git nginx certbot python3-certbot-nginx curl wget
```

### Step 2 — 安装 TA-Lib C 库（约 2 分钟）

缠论引擎的核心依赖，必须从源码编译：

```bash
cd /tmp
wget http://prdownloads.sourceforge.net/ta-lib/ta-lib-0.4.0-src.tar.gz
tar -xzf ta-lib-0.4.0-src.tar.gz
cd ta-lib && ./configure --prefix=/usr CFLAGS="-g -O2 -Wno-error=format-security" && make && sudo make install
cd / && rm -rf /tmp/ta-lib /tmp/ta-lib-0.4.0-src.tar.gz
sudo ldconfig
```

### Step 3 — 安装 Node.js 20 LTS（约 1 分钟）

前端构建需要 Node.js：

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Step 4 — 克隆代码仓库

```bash
cd /opt
sudo git clone https://github.com/ls569333469/BTC-PM.git btc-pm
sudo chown -R $USER:$USER /opt/btc-pm
cd /opt/btc-pm
```

### Step 5 — 后端 Python 环境（约 2 分钟）

```bash
cd /opt/btc-pm/backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install fastapi uvicorn httpx apscheduler numpy pandas TA-Lib aiohttp websockets
```

验证 TA-Lib 安装成功：
```bash
python3 -c "import talib; print('TA-Lib OK:', talib.__version__)"
```

### Step 6 — 前端构建（约 1 分钟）

```bash
cd /opt/btc-pm/frontend
npm install
npm run build
```

验证 dist 目录生成：
```bash
ls -la /opt/btc-pm/frontend/dist/index.html
```

### Step 7 — 创建后端 Systemd 服务

后端进程崩溃后 3 秒自动重启，SSH 断开也不会停：

```bash
sudo tee /etc/systemd/system/btc-backend.service << 'EOF'
[Unit]
Description=BTC Chanlun Analyzer Backend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/btc-pm/backend
Environment="PATH=/opt/btc-pm/backend/.venv/bin:/usr/bin"
ExecStart=/opt/btc-pm/backend/.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable btc-backend
sudo systemctl start btc-backend
```

验证后端运行：
```bash
sudo systemctl status btc-backend
curl -s http://localhost:8000/api/chanlun/analysis | head -c 100
```

### Step 8 — Nginx 反向代理

```bash
sudo tee /etc/nginx/sites-available/btc-pm << 'EOF'
server {
    listen 80;
    server_name _;

    # 前端静态文件
    root /opt/btc-pm/frontend/dist;
    index index.html;

    # SPA 路由回退
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 反向代理
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket 反向代理
    location /ws/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/btc-pm /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

### Step 9 — 最终验证

```bash
# 1. 检查后端
curl -s http://localhost:8000/api/chanlun/analysis | python3 -m json.tool | head -20

# 2. 检查 Nginx
curl -s http://localhost/ | head -20

# 3. 检查出口 IP（应为日本）
curl -s https://ipinfo.io/country

# 4. 检查 Binance API 连通性
curl -s https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT

# 5. 检查 Polymarket API 连通性
curl -s "https://gamma-api.polymarket.com/events?limit=1" | head -c 100
```

全部通过后，浏览器访问 `http://服务器外部IP/` 即可看到仪表盘。

---

## 📋 日常运维

```bash
# 查看后端日志
sudo journalctl -u btc-backend -f --no-pager

# 重启后端
sudo systemctl restart btc-backend

# 更新代码到最新版
cd /opt/btc-pm && git pull origin main
cd frontend && npm run build
sudo systemctl restart btc-backend
sudo systemctl reload nginx
```

---

## ⚠️ 注意事项

1. **赠金到期**：赠金用完后实例会停止（不删除数据），升级付费即可恢复
2. **SSH 访问**：通过 Google Cloud Console 的 SSH 按钮一键连接，无需额外配置
3. **数据备份**：已配置每日快照自动备份，回测数据（SQLite .db文件）会随磁盘一起备份
4. **HTTPS**：如需域名 + HTTPS，执行 `sudo certbot --nginx -d 你的域名`
