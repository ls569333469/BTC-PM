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

def _ws_listener_sync():
    init_db()

    def on_message(ws, message):
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
        logger.info("Oracle RTDS WebSocket Connected")
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
            ws.run_forever(ping_interval=20, ping_timeout=10)
        except Exception as e:
            logger.error(f"Oracle RTDS Disconnected: {e}. Reconnecting in 5s...")
            time.sleep(5)

def start_oracle_listener():
    """Starts the RTDS Oracle daemon thread."""
    t = threading.Thread(target=_ws_listener_sync, daemon=True, name="OracleTracker")
    t.start()
    logger.info("🚀 Hybrid Oracle Tracker daemon started")
