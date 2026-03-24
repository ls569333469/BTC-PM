import time
import json
import websocket
import threading
import sqlite3

DB_PATH = "chainlink_btc_prices_test.db"
timeframes = ['5m', '15m', '4h']
intervals = {'5m': 300, '15m': 900, '4h': 14400}

def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""CREATE TABLE IF NOT EXISTS prices (
                    timestamp INTEGER PRIMARY KEY,
                    price REAL NOT NULL
                )""")
    conn.commit()
    return conn

def save_price(ts: int, price: float):
    conn = sqlite3.connect(DB_PATH)
    conn.execute("INSERT OR REPLACE INTO prices VALUES (?, ?)", (ts, price))
    conn.commit()

def get_price_at(ts: int):
    conn = sqlite3.connect(DB_PATH)
    row = conn.execute("SELECT price FROM prices WHERE timestamp = ?", (ts,)).fetchone()
    return row[0] if row else None

def ws_listener():
    def on_message(ws, message):
        try:
            data = json.loads(message)
            if data.get("topic") != "crypto_prices_chainlink":
                return
            payload = data.get("payload", {})
            if payload.get("symbol") != "btc/usd":
                return
            
            price = float(payload.get("value") or 0)
            now = int(time.time())
            
            save_price(now, price)
            
            for tf in timeframes:
                sec = intervals[tf]
                start_ts = (now // sec) * sec
                if abs(now - start_ts) <= 3:
                    save_price(start_ts, price)
                    print(f"🎯 【{tf}】Price to Beat 已冻结 -> ${price:,.2f} @ {start_ts}")
        except Exception as e:
            print(f"Error: {e}")

    def on_open(ws):
        print("✅ RTDS WebSocket 已连接")
        sub = {
            "action": "subscribe",
            "subscriptions": [{
                "topic": "crypto_prices_chainlink",
                "type": "*",
                "filters": '{"symbol":"btc/usd"}'
            }]
        }
        ws.send(json.dumps(sub))

    while True:
        try:
            # We don't use proxy for the websocket since it might get blocked by TUN?
            # Actually, we SHOULD let TUN handle it, just connect directly.
            ws = websocket.WebSocketApp("wss://ws-live-data.polymarket.com",
                                        on_open=on_open,
                                        on_message=on_message)
            ws.run_forever(ping_interval=20, ping_timeout=10)
        except Exception as e:
            print(f"⚠️ WebSocket 断开: {e}")
            break

init_db()
print("Starting Thread...")
t = threading.Thread(target=ws_listener, daemon=True)
t.start()

# Let it run for 40 seconds to see if it catches the 09:20 boundary
for i in range(40):
    time.sleep(1)

print("Check latest 10 seconds in DB:")
conn = sqlite3.connect(DB_PATH)
rows = conn.execute("SELECT * FROM prices ORDER BY timestamp DESC LIMIT 5").fetchall()
for r in rows:
    print(f"DB: TS {r[0]} => {r[1]}")
