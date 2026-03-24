import asyncio
import json
import logging
import time
import websockets

logger = logging.getLogger(__name__)

# Dictionary to hold the Base Price for each slug
# Format: { "btc-updown-15m-1774272600": {"start_ts": 1774272600, "price": 71000.50} }
_PTB_CACHE = {}
_WS_TASK = None

def register_slug(slug: str, start_ts: int):
    """Register a slug to ensure the WebSocket daemon starts tracking its base price."""
    if slug not in _PTB_CACHE:
        _PTB_CACHE[slug] = {"start_ts": start_ts, "price": None}
        
    # Basic GC: Remove slugs older than 24 hours to prevent memory leak
    now_sec = int(time.time())
    to_delete = [s for s, info in _PTB_CACHE.items() if (now_sec - info["start_ts"]) > 86400]
    for s in to_delete:
        del _PTB_CACHE[s]

def get_base_price(slug: str) -> float | None:
    """Retrieve the locked base price. Will be None if not yet reached or completely missed."""
    return _PTB_CACHE.get(slug, {}).get("price")

async def _ws_loop():
    url = "wss://ws-live-data.polymarket.com"
    while True:
        try:
            custom_headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Origin": "https://polymarket.com"
            }
            async with websockets.connect(url, additional_headers=custom_headers, max_size=None, ping_interval=20, ping_timeout=20) as ws:
                logger.info("✅ Connected to Polymarket RTDS WebSocket (Chainlink Oracle).")
                sub = {
                    "action": "subscribe",
                    "subscriptions": [{
                        "topic": "crypto_prices_chainlink",
                        "type": "*",
                        "filters": '{"symbol":"btc/usd"}'
                    }]
                }
                await ws.send(json.dumps(sub))
                
                async for message in ws:
                    try:
                        data = json.loads(message)
                        if data.get("topic") == "crypto_prices_chainlink":
                            payload = data.get("payload", {})
                            if payload.get("symbol") == "btc/usd":
                                price = float(payload.get("value") or 0)
                                now_sec = int(time.time())
                                
                                # Process all pending slugs
                                for slug, info in _PTB_CACHE.items():
                                    start_ts = info["start_ts"]
                                    if info["price"] is None and now_sec >= start_ts:
                                        # Immediately lock the first price we see ON or AFTER start_ts
                                        # This safely handles WS reconnects missing the exact second!
                                        info["price"] = price
                                        delay = now_sec - start_ts
                                        logger.info(f"🎯 [WS Latch] {slug} Base Price locked exactly at ${price:,.2f} (Start: {start_ts}, Latency: +{delay}s)")
                    except json.JSONDecodeError:
                        continue
        except asyncio.CancelledError:
            logger.info("Polymarket WS Daemon stopped.")
            break
        except Exception as e:
            logger.warning(f"Polymarket WS disconnected, reconnecting in 5s... Error: {e}")
            await asyncio.sleep(5)

def start_ws_daemon():
    """Start the perpetual WebSocket listener. Safe to call multiple times."""
    global _WS_TASK
    if _WS_TASK is None:
        _WS_TASK = asyncio.create_task(_ws_loop())
