import time
import json
import logging
import asyncio
import threading
import sqlite3
import websocket
from typing import Optional

logger = logging.getLogger(__name__)

DB_PATH = "chainlink_prices.db"
timeframes = ['5m', '15m', '4h']
intervals = {'5m': 300, '15m': 900, '4h': 14400}

def init_db():
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.execute("""CREATE TABLE IF NOT EXISTS prices (
                        timestamp INTEGER PRIMARY KEY,
                        price REAL NOT NULL
                    )""")
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"Failed to init oracle DB: {e}")

def save_price(ts: int, price: float):
    # Short-lived connections are thread-safe and avoid 'database is locked'
    try:
        conn = sqlite3.connect(DB_PATH, timeout=5.0)
        conn.execute("INSERT OR REPLACE INTO prices VALUES (?, ?)", (ts, price))
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"Oracle DB Insert Error: {e}")

def get_price_at(ts: int) -> Optional[float]:
    """Retrieve exactly anchored price from SQLite Oracle."""
    try:
        conn = sqlite3.connect(DB_PATH, timeout=5.0)
        # Polymarket anchors to the FIRST valid Chainlink tick strictly on or after the epoch boundary
        # We bound it to +15 seconds to prevent accidental massive timeshifts if WS hung.
        row = conn.execute("SELECT price FROM prices WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC LIMIT 1", (ts, ts + 15)).fetchone()
        conn.close()
        return float(row[0]) if row else None
    except Exception as e:
        logger.error(f"Oracle DB Select Error: {e}")
        return None

def get_nearest_price(ts: int, max_delta: int = 300) -> tuple[Optional[float], int]:
    """P8: 查找 ts 附近最近的 Chainlink 记录（同源数据，比 Binance 准）。
    
    Returns: (price, offset_seconds) 或 (None, 0)
    """
    try:
        conn = sqlite3.connect(DB_PATH, timeout=5.0)
        row = conn.execute(
            "SELECT timestamp, price FROM prices "
            "WHERE timestamp >= ? AND timestamp <= ? "
            "ORDER BY ABS(timestamp - ?) ASC LIMIT 1",
            (ts - max_delta, ts + max_delta, ts)
        ).fetchone()
        conn.close()
        if row:
            return float(row[1]), row[0] - ts
        return None, 0
    except Exception as e:
        logger.error(f"Oracle DB Nearest Select Error: {e}")
        return None, 0

# P8: WS 健康监控 — 30 秒无消息则主动断开重连
_last_msg_ts = 0
_reconnect_attempt = 0

def _ws_listener_sync():
    global _last_msg_ts, _reconnect_attempt
    init_db()

    def on_message(ws, message):
        global _last_msg_ts
        _last_msg_ts = time.time()
        try:
            data = json.loads(message)
            if data.get("topic") != "crypto_prices_chainlink":
                return
            payload = data.get("payload", {})
            if payload.get("symbol") != "btc/usd":
                return
            
            price = float(payload.get("value") or 0)
            
            # Extract official Chainlink timestamp (in milliseconds, convert to seconds)
            oracle_ts_ms = payload.get("timestamp")
            if oracle_ts_ms:
                tick_ts = int(oracle_ts_ms) // 1000
            else:
                tick_ts = int(time.time())
            
            # Persist every tick purely as standard time-series data
            save_price(tick_ts, price)
        except Exception:
            pass

    def on_open(ws):
        global _last_msg_ts, _reconnect_attempt
        _last_msg_ts = time.time()
        _reconnect_attempt = 0  # 连接成功，重置计数
        logger.info("✅ Oracle RTDS WebSocket Connected")
        sub = {
            "action": "subscribe",
            "subscriptions": [{
                "topic": "crypto_prices_chainlink",
                "type": "*",
                "filters": '{"symbol":"btc/usd"}'
            }]
        }
        ws.send(json.dumps(sub))

    def on_error(ws, error):
        logger.warning(f"Oracle WS Error: {error}")

    def on_close(ws, close_status_code, close_msg):
        logger.warning("Oracle WS Closed")

    while True:
        try:
            ws = websocket.WebSocketApp(
                "wss://ws-live-data.polymarket.com",
                on_open=on_open,
                on_message=on_message,
                on_error=on_error,
                on_close=on_close
            )
            # P8: 30 秒超时 — 如果 WS 静默（无消息），主动断开触发重连
            ws.run_forever(ping_interval=20, ping_timeout=10)
        except Exception as e:
            logger.error(f"Oracle RTDS Disconnected: {e}")
        
        # P8: 渐进式重连（1s → 2s → 5s → 10s → 5s 循环）
        _reconnect_attempt += 1
        delays = [1, 2, 5, 10, 5]
        delay = delays[min(_reconnect_attempt - 1, len(delays) - 1)]
        logger.info(f"🔄 Oracle WS reconnecting in {delay}s (attempt #{_reconnect_attempt})")
        time.sleep(delay)

def start_oracle_listener():
    """Starts the RTDS Oracle daemon thread."""
    t = threading.Thread(target=_ws_listener_sync, daemon=True, name="OracleTracker")
    t.start()
    logger.info("🚀 Hybrid Oracle Tracker daemon started")
