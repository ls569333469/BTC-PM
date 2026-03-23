"""
价格预测对比: 简版缠论 vs chan.py vs PM基准价
"""
import sys, os, asyncio
import numpy as np

CHAN_PY_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'chan_py_src', 'chan.py-main')
sys.path.insert(0, CHAN_PY_PATH)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


async def fetch_klines():
    import httpx
    async with httpx.AsyncClient(timeout=15) as c:
        resp = await c.get("https://api.binance.com/api/v3/klines",
                           params={"symbol": "BTCUSDT", "interval": "1h", "limit": 168})
        data = resp.json()
    return [{"timestamp": k[0], "open": float(k[1]), "high": float(k[2]),
             "low": float(k[3]), "close": float(k[4]), "volume": float(k[5])} for k in data]


async def fetch_pm_base_price():
    """获取PM基准价(Chainlink)"""
    import httpx
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            resp = await c.get("http://127.0.0.1:8000/api/polymarket")
            if resp.status_code == 200:
                data = resp.json()
                guides = data.get("bettingGuide", [])
                if guides:
                    return {g["timeframe"]: g for g in guides}
    except:
        pass
    return None


def simple_predict(klines):
    """简版缠论预测"""
    from app.engines.bi import find_bi
    from app.engines.zhongshu import find_zhongshu
    from app.engines.divergence import detect_divergence
    from app.engines.trend import analyze_trend
    from app.engines.prediction import generate_predictions

    closes = np.array([k["close"] for k in klines])
    current = closes[-1]
    bis = find_bi(klines)
    zs = find_zhongshu(bis)
    div = detect_divergence(bis, closes=closes)
    trend = analyze_trend(bis, zs, current)
    preds = generate_predictions(current, trend, div,
                                  {"rsi": None}, None, None, closes)
    return {p["timeframe"]: p for p in preds}


def chanpy_predict(klines):
    """chan.py完整缠论预测"""
    from Common.CEnum import KL_TYPE, DATA_FIELD, AUTYPE
    from Common.CTime import CTime
    from KLine.KLine_Unit import CKLine_Unit
    from ChanConfig import CChanConfig
    from Chan import CChan
    from collections import defaultdict
    from datetime import datetime

    config = CChanConfig({"bi_strict": True, "trigger_step": False})
    chan = CChan.__new__(CChan)
    chan.code = "BTCUSDT"
    chan.begin_time = chan.end_time = None
    chan.autype = AUTYPE.QFQ
    chan.data_src = "custom"
    chan.lv_list = [KL_TYPE.K_60M]
    chan.conf = config
    chan.kl_misalign_cnt = 0
    chan.kl_inconsistent_detail = defaultdict(list)
    chan.g_kl_iter = defaultdict(list)
    chan.do_init()

    for i, k in enumerate(klines):
        dt = datetime.fromtimestamp(k["timestamp"] / 1000)
        t = CTime(dt.year, dt.month, dt.day, dt.hour, dt.minute, auto=False)
        klu = CKLine_Unit({DATA_FIELD.FIELD_TIME: t, DATA_FIELD.FIELD_OPEN: k["open"],
                           DATA_FIELD.FIELD_HIGH: k["high"], DATA_FIELD.FIELD_LOW: k["low"],
                           DATA_FIELD.FIELD_CLOSE: k["close"]})
        klu.set_idx(i)
        klu.kl_type = KL_TYPE.K_60M
        if i > 0 and len(chan.kl_datas[KL_TYPE.K_60M]) > 0 and len(chan.kl_datas[KL_TYPE.K_60M][-1]) > 0:
            klu.set_pre_klu(chan.kl_datas[KL_TYPE.K_60M][-1][-1])
        try:
            chan.kl_datas[KL_TYPE.K_60M].add_single_klu(klu)
        except:
            pass

    chan.kl_datas[KL_TYPE.K_60M].cal_seg_and_zs()
    kl = chan[0]

    # 提取缠论分析结果
    current = klines[-1]["close"]
    bi_list = kl.bi_list
    seg_list = kl.seg_list

    # 方向判断: 基于最后一笔方向 + 买卖点
    direction = "sideways"
    dir_score = 0.0
    if bi_list:
        last_bi = bi_list[-1]
        if last_bi.dir.name == "UP":
            direction = "up"
            dir_score = 0.5
        else:
            direction = "down"
            dir_score = -0.5

    # 线段增强
    if seg_list:
        last_seg = seg_list[-1]
        if last_seg.dir.name == "UP":
            dir_score += 0.2
        else:
            dir_score -= 0.2

    # 买卖点增强
    bsp_list = kl.bs_point_lst.getSortedBspList() if hasattr(kl, 'bs_point_lst') and kl.bs_point_lst else []
    for bsp in bsp_list[-3:]:
        bsp_type = bsp.type2str()
        if "1" in bsp_type:  # 一类买卖点最强
            if bsp.is_buy:
                dir_score += 0.4
            else:
                dir_score -= 0.4
        elif "2" in bsp_type:
            if bsp.is_buy:
                dir_score += 0.25
            else:
                dir_score -= 0.25

    dir_score = max(-1.0, min(1.0, dir_score))

    # 中枢支撑阻力
    support = resistance = None
    zs_list = []
    for seg in seg_list:
        for zs in seg.zs_lst:
            zs_list.append(zs)
    if zs_list:
        last_zs = zs_list[-1]
        support = last_zs.low
        resistance = last_zs.high

    # ATR波动率
    closes_arr = np.array([k["close"] for k in klines])
    volatility = np.std(np.diff(closes_arr) / closes_arr[:-1]) * current

    # 生成8个时间级别预测
    MULTIPLIERS = {"5m": 0.5, "30m": 1, "1h": 2, "2h": 3, "4h": 5, "8h": 8, "12h": 10, "24h": 14}
    predictions = {}
    for tf, mult in MULTIPLIERS.items():
        move = volatility * mult
        target = current + (move * dir_score)
        win_rate = 50 + abs(dir_score) * 30
        win_rate = round(max(35, min(85, win_rate)))
        predictions[tf] = {
            "timeframe": tf,
            "direction": "up" if dir_score > 0.1 else ("down" if dir_score < -0.1 else "sideways"),
            "targetPrice": round(target, 2),
            "currentPrice": round(current, 2),
            "priceChange": round(target - current, 2),
            "winRate": win_rate,
            "support": round(support, 2) if support else None,
            "resistance": round(resistance, 2) if resistance else None,
            "bsp_signals": [(bsp.type2str(), bsp.is_buy) for bsp in bsp_list[-3:]],
        }
    return predictions


async def main():
    print("=" * 70)
    print("💰 价格预测对比: 简版缠论 vs chan.py vs PM基准价")
    print("=" * 70)

    klines = await fetch_klines()
    current = klines[-1]["close"]
    print(f"\n📡 BTC当前价格: ${current:,.2f}")

    # 运行两个引擎
    print("\n⏳ 运行简版缠论...")
    simple = simple_predict(klines)

    print("⏳ 运行chan.py完整缠论...")
    full = chanpy_predict(klines)

    print("⏳ 获取PM基准价...")
    pm = await fetch_pm_base_price()

    # 对比表格
    print("\n" + "=" * 70)
    print(f"{'时间级别':^8} │ {'简版目标价':^12} │ {'chan.py目标价':^12} │ {'PM基准价':^12} │ {'偏差':^10}")
    print("─" * 8 + "─┼─" + "─" * 12 + "─┼─" + "─" * 12 + "─┼─" + "─" * 12 + "─┼─" + "─" * 10)

    for tf in ["5m", "30m", "1h", "2h", "4h", "8h", "12h", "24h"]:
        s_price = simple[tf]["targetPrice"] if tf in simple else "N/A"
        f_price = full[tf]["targetPrice"] if tf in full else "N/A"

        pm_price = "N/A"
        if pm:
            # PM时间框架名称映射
            pm_tf_map = {"5m": "5M", "1h": "1H", "4h": "4H", "24h": "24H"}
            pm_key = pm_tf_map.get(tf)
            if pm_key and pm_key in pm:
                pm_price = pm[pm_key].get("basePrice", "N/A")

        # 偏差计算
        diff = ""
        if isinstance(s_price, (int, float)) and isinstance(f_price, (int, float)):
            d = abs(f_price - s_price)
            diff = f"${d:,.0f}"

        s_str = f"${s_price:,.2f}" if isinstance(s_price, (int, float)) else str(s_price)
        f_str = f"${f_price:,.2f}" if isinstance(f_price, (int, float)) else str(f_price)
        pm_str = f"${pm_price:,.2f}" if isinstance(pm_price, (int, float)) else str(pm_price)

        print(f" {tf:^7} │ {s_str:^12} │ {f_str:^12} │ {pm_str:^12} │ {diff:^10}")

    # 方向对比
    print("\n" + "=" * 70)
    print("📊 方向判断对比")
    print("─" * 70)
    s_dir = simple["1h"]["direction"]
    f_dir = full["1h"]["direction"]
    s_wr = simple["1h"]["winRate"]
    f_wr = full["1h"]["winRate"]

    print(f"  简版:   方向={s_dir:>8}  胜率={s_wr}%")
    print(f"  chan.py: 方向={f_dir:>8}  胜率={f_wr}%")

    # 买卖点信号
    bsp = full["1h"].get("bsp_signals", [])
    if bsp:
        print(f"\n🎯 chan.py 买卖点信号:")
        for b in bsp:
            action = "买入" if b[1] else "卖出"
            print(f"    {b[0]}类 → {action}")
    else:
        print(f"\n  chan.py: 当前无买卖点信号")

    # 支撑阻力
    if full["1h"].get("support"):
        print(f"\n📐 chan.py 中枢区间:")
        print(f"    支撑: ${full['1h']['support']:,.2f}")
        print(f"    阻力: ${full['1h']['resistance']:,.2f}")

    print(f"\n✅ 测试完成!")


if __name__ == "__main__":
    asyncio.run(main())
