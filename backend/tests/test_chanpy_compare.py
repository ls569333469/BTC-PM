"""
对比测试: chan.py (完整缠论) vs 简版缠论
使用实时币安BTC/USDT数据
"""
import sys
import os
import asyncio
import json

# 添加 chan.py 路径
CHAN_PY_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'chan_py_src', 'chan.py-main')
sys.path.insert(0, CHAN_PY_PATH)

# 添加我们的后端路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


async def fetch_binance_klines():
    """从币安获取168根1小时K线"""
    import httpx
    url = "https://api.binance.com/api/v3/klines"
    params = {"symbol": "BTCUSDT", "interval": "1h", "limit": 168}
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(url, params=params)
        data = resp.json()
    klines = []
    for k in data:
        klines.append({
            "timestamp": k[0],
            "open": float(k[1]),
            "high": float(k[2]),
            "low": float(k[3]),
            "close": float(k[4]),
            "volume": float(k[5]),
        })
    return klines


def run_simple_chanlun(klines):
    """运行我们的简版缠论"""
    from app.engines.bi import find_bi
    from app.engines.zhongshu import find_zhongshu
    from app.engines.divergence import detect_divergence
    from app.engines.trend import analyze_trend
    import numpy as np

    closes = np.array([k["close"] for k in klines])
    current_price = closes[-1]

    bis = find_bi(klines)
    zhongshu = find_zhongshu(bis)
    divergence = detect_divergence(bis, closes=closes)
    trend = analyze_trend(bis, zhongshu, current_price)

    return {
        "bi_count": len(bis),
        "bis": bis[-5:],  # 最近5个笔点
        "zhongshu_count": len(zhongshu),
        "zhongshu": zhongshu[-3:],  # 最近3个中枢
        "divergence": divergence,
        "trend": trend,
        "current_price": current_price,
    }


def run_chanpy(klines):
    """运行 chan.py 完整缠论"""
    from Common.CEnum import KL_TYPE, DATA_FIELD, AUTYPE
    from Common.CTime import CTime
    from KLine.KLine_Unit import CKLine_Unit
    from ChanConfig import CChanConfig
    from Chan import CChan
    from datetime import datetime

    # 构建 CChanConfig
    config = CChanConfig({
        "bi_strict": True,
        "bi_fx_check": "strict",
        "seg_algo": "chan",
        "zs_combine": True,
        "trigger_step": False,
    })

    # 创建 CChan 对象 (使用 trigger_load 逐条送入K线)
    chan = CChan.__new__(CChan)
    chan.code = "BTCUSDT"
    chan.begin_time = None
    chan.end_time = None
    chan.autype = AUTYPE.QFQ
    chan.data_src = "custom"
    chan.lv_list = [KL_TYPE.K_60M]
    chan.conf = config
    chan.kl_misalign_cnt = 0
    from collections import defaultdict
    chan.kl_inconsistent_detail = defaultdict(list)
    chan.g_kl_iter = defaultdict(list)
    chan.do_init()

    # 逐条添加K线
    for i, k in enumerate(klines):
        ts = k["timestamp"]
        dt = datetime.fromtimestamp(ts / 1000)
        time_obj = CTime(dt.year, dt.month, dt.day, dt.hour, dt.minute, auto=False)

        klu_data = {
            DATA_FIELD.FIELD_TIME: time_obj,
            DATA_FIELD.FIELD_OPEN: k["open"],
            DATA_FIELD.FIELD_HIGH: k["high"],
            DATA_FIELD.FIELD_LOW: k["low"],
            DATA_FIELD.FIELD_CLOSE: k["close"],
        }
        klu = CKLine_Unit(klu_data)
        klu.set_idx(i)
        klu.kl_type = KL_TYPE.K_60M
        if i > 0:
            prev = chan.kl_datas[KL_TYPE.K_60M]
            if len(prev) > 0 and len(prev[-1]) > 0:
                klu.set_pre_klu(prev[-1][-1])
        try:
            chan.kl_datas[KL_TYPE.K_60M].add_single_klu(klu)
        except Exception as e:
            print(f"  [WARN] K线 {i} 添加失败: {e}")

    # 计算线段和中枢
    chan.kl_datas[KL_TYPE.K_60M].cal_seg_and_zs()

    # 提取结果
    kl_data = chan[0]
    bi_list = kl_data.bi_list
    seg_list = kl_data.seg_list
    # 中枢
    zs_list = []
    for seg in seg_list:
        for zs in seg.zs_lst:
            zs_list.append(zs)
    # 买卖点
    bsp_list = kl_data.bs_point_lst.getSortedBspList() if hasattr(kl_data, 'bs_point_lst') and kl_data.bs_point_lst else []

    return {
        "bi_count": len(bi_list),
        "bis_last5": [(str(b.get_begin_klu().time), str(b.get_end_klu().time), b.dir.name, round(b.get_begin_val(), 2), round(b.get_end_val(), 2)) for b in bi_list[-5:]] if bi_list else [],
        "seg_count": len(seg_list),
        "segs_last3": [(str(s.get_begin_klu().time), str(s.get_end_klu().time), s.dir.name) for s in seg_list[-3:]] if seg_list else [],
        "zs_count": len(zs_list),
        "bsp_count": len(bsp_list),
        "bsp_list": [(str(b.klu.time), b.type2str()) for b in bsp_list[-5:]] if bsp_list else [],
    }


async def main():
    print("=" * 60)
    print("缠论引擎对比测试: 简版 vs chan.py (完整版)")
    print("=" * 60)

    # 1. 获取数据
    print("\n📡 正在从币安获取 BTCUSDT 1小时K线 (168根)...")
    klines = await fetch_binance_klines()
    print(f"✅ 获取 {len(klines)} 根K线")
    print(f"   时间范围: {klines[0]['timestamp']} ~ {klines[-1]['timestamp']}")
    print(f"   当前价格: ${klines[-1]['close']:,.2f}")

    # 2. 运行简版
    print("\n" + "-" * 60)
    print("🔧 简版缠论 (当前项目)")
    print("-" * 60)
    try:
        simple = run_simple_chanlun(klines)
        print(f"   笔数量: {simple['bi_count']}")
        print(f"   中枢数量: {simple['zhongshu_count']}")
        print(f"   背驰: 顶背驰={simple['divergence']['top_div']}, 底背驰={simple['divergence']['bottom_div']}")
        print(f"   趋势: {simple['trend']['trend']} (强度: {simple['trend']['strength']})")
        print(f"   最近笔:")
        for b in simple['bis']:
            print(f"     {b['type']:6s} 价格={b['price']:>10.2f} index={b['index']}")
        print(f"   ❌ 无分型识别")
        print(f"   ❌ 无线段识别")
        print(f"   ❌ 无买卖点识别")
    except Exception as e:
        print(f"   ❌ 运行失败: {e}")
        import traceback
        traceback.print_exc()
        simple = None

    # 3. 运行 chan.py
    print("\n" + "-" * 60)
    print("🔧 chan.py 完整缠论")
    print("-" * 60)
    try:
        full = run_chanpy(klines)
        print(f"   笔数量: {full['bi_count']}")
        print(f"   线段数量: {full['seg_count']}")
        print(f"   中枢数量: {full['zs_count']}")
        print(f"   买卖点数量: {full['bsp_count']}")
        print(f"   最近笔:")
        for b in full['bis_last5']:
            print(f"     {b[0]} → {b[1]}  方向={b[2]}  价格={b[3]}→{b[4]}")
        if full['segs_last3']:
            print(f"   最近线段:")
            for s in full['segs_last3']:
                print(f"     {s[0]} → {s[1]}  方向={s[2]}")
        if full['bsp_list']:
            print(f"   最近买卖点:")
            for bsp in full['bsp_list']:
                print(f"     {bsp[0]}  类型={bsp[1]}")
        else:
            print(f"   暂无买卖点信号")
    except Exception as e:
        print(f"   ❌ 运行失败: {e}")
        import traceback
        traceback.print_exc()
        full = None

    # 4. 对比
    print("\n" + "=" * 60)
    print("📊 对比结果")
    print("=" * 60)
    if simple and full:
        print(f"   {'指标':<15} {'简版':>10} {'chan.py':>10}")
        print(f"   {'─'*15} {'─'*10} {'─'*10}")
        print(f"   {'笔数量':<15} {simple['bi_count']:>10} {full['bi_count']:>10}")
        print(f"   {'中枢数量':<15} {simple['zhongshu_count']:>10} {full['zs_count']:>10}")
        print(f"   {'线段数量':<15} {'N/A':>10} {full['seg_count']:>10}")
        print(f"   {'买卖点数量':<15} {'N/A':>10} {full['bsp_count']:>10}")
        print(f"\n   结论: chan.py 多出 线段({full['seg_count']}个) + 买卖点({full['bsp_count']}个)")
    print("\n测试完成!")


if __name__ == "__main__":
    asyncio.run(main())
