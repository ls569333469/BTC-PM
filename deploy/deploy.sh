#!/bin/bash
# ── BTC Chanlun Analyzer — One-click VPS Deployment ──
# Target: RackNerd VPS (Ubuntu 24.04, 6GB RAM, 140GB SSD)
# Usage: bash deploy.sh
set -euo pipefail

APP_DIR="/var/www/chanlun"
DB_NAME="chanlun"
DB_USER="postgres"

echo "═══════════════════════════════════════════════════"
echo "  BTC Chanlun Analyzer — VPS Deployment"
echo "═══════════════════════════════════════════════════"

# ── 1. System packages ──
echo ""
echo "📦 [1/7] Installing system packages..."
apt-get update -qq
apt-get install -y -qq \
    build-essential \
    python3.14 python3.14-venv python3.14-dev \
    postgresql postgresql-contrib \
    nginx \
    curl \
    git

# ── 2. TA-Lib C library ──
echo ""
echo "📊 [2/7] Installing TA-Lib C library..."
if ! ldconfig -p | grep -q libta_lib; then
    cd /tmp
    curl -L -o ta-lib-0.6.4-src.tar.gz https://github.com/ta-lib/ta-lib/releases/download/v0.6.4/ta-lib-0.6.4-src.tar.gz
    tar xzf ta-lib-0.6.4-src.tar.gz
    cd ta-lib-0.6.4
    ./configure --prefix=/usr/local
    make -j$(nproc)
    make install
    ldconfig
    echo "✅ TA-Lib C library installed"
else
    echo "✅ TA-Lib C library already installed"
fi

# ── 3. Project setup ──
echo ""
echo "📁 [3/7] Setting up project directory..."
mkdir -p "$APP_DIR"

# Copy project files (assumes files are in current directory)
if [ -d "./backend" ]; then
    cp -r ./backend "$APP_DIR/"
    cp -r ./frontend "$APP_DIR/"
    cp ./nginx.conf "$APP_DIR/"
    cp ./chanlun.service "$APP_DIR/"
    echo "✅ Project files copied"
else
    echo "⚠️  No local files found. Make sure to run from project root."
    echo "   Or use: scp -r . root@vps-ip:/var/www/chanlun/"
fi

# ── 4. Python backend ──
echo ""
echo "🐍 [4/7] Setting up Python backend..."
cd "$APP_DIR/backend"
python3.14 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt 2>/dev/null || pip install \
    fastapi[standard] \
    uvicorn[standard] \
    sqlalchemy[asyncio] \
    asyncpg \
    alembic \
    pandas \
    numpy \
    httpx \
    apscheduler \
    pydantic-settings \
    ta-lib
echo "✅ Python dependencies installed"

# Create .env if not exists
if [ ! -f .env ]; then
    cat > .env << 'EOF'
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/chanlun
DEBUG=false
CORS_ORIGINS=["http://localhost","http://YOUR_VPS_IP"]
ANALYSIS_INTERVAL_MINUTES=15
EOF
    echo "✅ .env created (update CORS_ORIGINS with your domain)"
fi

# ── 5. PostgreSQL ──
echo ""
echo "🗄️  [5/7] Setting up PostgreSQL..."
systemctl enable postgresql
systemctl start postgresql

# Create database if not exists
sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME" || {
    sudo -u postgres createdb "$DB_NAME"
    echo "✅ Database '$DB_NAME' created"
}

# Run Alembic migrations
cd "$APP_DIR/backend"
source .venv/bin/activate
alembic upgrade head 2>/dev/null && echo "✅ Migrations applied" || echo "⚠️  Migrations skipped (run manually: alembic upgrade head)"

# ── 6. Frontend build ──
echo ""
echo "🎨 [6/7] Building frontend..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
    apt-get install -y nodejs
fi
if ! command -v pnpm &> /dev/null; then
    npm install -g pnpm
fi

cd "$APP_DIR/frontend"
pnpm install
pnpm build
echo "✅ Frontend built → $APP_DIR/frontend/dist"

# ── 7. Nginx + systemd ──
echo ""
echo "🌐 [7/7] Configuring Nginx + systemd..."

# Nginx
cp "$APP_DIR/nginx.conf" /etc/nginx/sites-available/chanlun
ln -sf /etc/nginx/sites-available/chanlun /etc/nginx/sites-enabled/chanlun
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo "✅ Nginx configured"

# systemd
cp "$APP_DIR/chanlun.service" /etc/systemd/system/chanlun.service
chown -R www-data:www-data "$APP_DIR"
systemctl daemon-reload
systemctl enable chanlun
systemctl restart chanlun
echo "✅ systemd service enabled and started"

# ── Done ──
echo ""
echo "═══════════════════════════════════════════════════"
echo "  ✅ Deployment Complete!"
echo "═══════════════════════════════════════════════════"
echo ""
echo "  🌐 Frontend:  http://$(hostname -I | awk '{print $1}')"
echo "  🔌 API:       http://$(hostname -I | awk '{print $1}')/api/health"
echo "  📡 WebSocket: ws://$(hostname -I | awk '{print $1}')/ws/analysis"
echo ""
echo "  Management commands:"
echo "    systemctl status chanlun"
echo "    journalctl -u chanlun -f"
echo "    systemctl restart chanlun"
echo ""
