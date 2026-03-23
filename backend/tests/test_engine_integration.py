"""快速验证 chanlun_engine.py 集成"""
import sys, os, asyncio
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

async def main():
    import httpx
    # 获取K线
    async with httpx.AsyncClient(timeout=15) as c:
        resp = await c.get("https://api.binance.com/api/v3/klines",
                           params={"symbol": "BTCUSDT", "interval": "1h", "limit": 168})
        data = resp.json()
    klines = [{"timestamp": k[0], "open": float(k[1]), "high": float(k[2]),
               "low": float(k[3]), "close": float(k[4]), "volume": float(k[5])} for k in data]
    current = klines[-1]["close"]

    from app.engines.chanlun_engine import analyze_with_fallback
    result = analyze_with_fallback(klines, current)

    print(f"✅ 引擎: {result['engine']}")
    print(f"   方向: {result['direction']} (评分: {result['dir_score']:.2f})")
    print(f"   纯缠论胜率: {result['win_rate']}%")
    print(f"   笔: {result['bi_count']}  线段: {result['seg_count']}  中枢: {result['zs_count']}  买卖点: {result['bsp_count']}")
    if result['bsp_list']:
        for b in result['bsp_list']:
            print(f"   🎯 {'买入' if b['is_buy'] else '卖出'}信号: {b['type']}类 @ {b['time']}")
    if result['support']:
        print(f"   支撑: ${result['support']:,.2f}  阻力: ${result['resistance']:,.2f}")
    print(f"   当前价: ${current:,.2f}")

if __name__ == "__main__":
    asyncio.run(main())
