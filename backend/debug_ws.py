import asyncio, websockets, json

async def t():
    try:
        custom_headers = {
            "User-Agent": "Mozilla/5.0",
            "Origin": "https://polymarket.com"
        }
        async with websockets.connect('wss://ws-live-data.polymarket.com', additional_headers=custom_headers, ping_interval=None) as ws:
            await ws.send(json.dumps({'action': 'subscribe', 'subscriptions': [{'topic': 'crypto_prices_chainlink', 'type': '*', 'filters': '{"symbol":"btc/usd"}'}]}))
            async for m in ws:
                if m == "OK": continue
                try:
                    d = json.loads(m)
                    if d.get('topic') == 'crypto_prices_chainlink':
                        print("PAYLOAD:", json.dumps(d['payload']))
                        break
                except:
                    pass
    except Exception as e:
        print("ERROR:", e)

asyncio.run(t())
