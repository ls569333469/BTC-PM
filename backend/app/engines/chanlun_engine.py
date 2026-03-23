"""
Chan.py 完整缠论引擎封装
输入: 币安K线数据 → 输出: 笔/线段/中枢/买卖点/方向/胜率

降级方案: 如果 chan.py 计算失败，回退到简版引擎
"""

import sys
import os
import logging
import numpy as np
from typing import Optional
from collections import defaultdict
from datetime import datetime

logger = logging.getLogger(__name__)

# 添加 chanpy 路径
CHANPY_DIR = os.path.join(os.path.dirname(__file__), "chanpy")
if CHANPY_DIR not in sys.path:
    sys.path.insert(0, CHANPY_DIR)

# 标记 chan.py 是否可用
CHANPY_AVAILABLE = False
try:
    from Common.CEnum import KL_TYPE, DATA_FIELD, AUTYPE
    from Common.CTime import CTime
    from KLine.KLine_Unit import CKLine_Unit
    from ChanConfig import CChanConfig
    from Chan import CChan
    CHANPY_AVAILABLE = True
    logger.info("chan.py 引擎加载成功")
except Exception as e:
    logger.warning(f"chan.py 引擎加载失败，将使用简版降级方案: {e}")


def analyze_with_chanpy(
    klines: list[dict],
    current_price: float,
    timeframe: str = "1h",
) -> Optional[dict]:
    """
    使用 chan.py 完整缠论分析

    Args:
        klines: 币安K线数据 [{timestamp, open, high, low, close, volume}, ...]
        current_price: 当前BTC价格
        timeframe: 时间级别

    Returns:
        dict: {direction, dir_score, bis, segs, zs_list, bsp_list, trend_type, ...}
        None: 如果 chan.py 不可用
    """
    if not CHANPY_AVAILABLE:
        return None

    if not klines or len(klines) < 10:
        return None

    try:
        # 时间级别映射
        kl_type_map = {
            "5m": KL_TYPE.K_5M,
            "15m": KL_TYPE.K_15M,
            "30m": KL_TYPE.K_30M,
            "1h": KL_TYPE.K_60M,
        }
        kl_type = kl_type_map.get(timeframe, KL_TYPE.K_60M)

        # 配置
        config = CChanConfig({
            "bi_strict": True,
            "bi_fx_check": "strict",
            "seg_algo": "chan",
            "zs_combine": True,
            "trigger_step": False,
            "print_warning": False,
            "print_err_time": False,
        })

        # 创建 CChan 实例 (不走数据源，手动喂K线)
        chan = CChan.__new__(CChan)
        chan.code = "BTCUSDT"
        chan.begin_time = None
        chan.end_time = None
        chan.autype = AUTYPE.QFQ
        chan.data_src = "custom"
        chan.lv_list = [kl_type]
        chan.conf = config
        chan.kl_misalign_cnt = 0
        chan.kl_inconsistent_detail = defaultdict(list)
        chan.g_kl_iter = defaultdict(list)
        chan.do_init()

        # 逐条喂入K线
        prev_klu = None
        for i, k in enumerate(klines):
            ts = k.get("timestamp") or k.get("time", 0)
            if isinstance(ts, (int, float)) and ts > 1e12:
                ts = ts / 1000
            dt = datetime.fromtimestamp(ts) if isinstance(ts, (int, float)) else datetime.now()

            time_obj = CTime(dt.year, dt.month, dt.day, dt.hour, dt.minute, auto=False)
            klu = CKLine_Unit({
                DATA_FIELD.FIELD_TIME: time_obj,
                DATA_FIELD.FIELD_OPEN: float(k.get("open", k.get("close", 0))),
                DATA_FIELD.FIELD_HIGH: float(k.get("high", k.get("close", 0))),
                DATA_FIELD.FIELD_LOW: float(k.get("low", k.get("close", 0))),
                DATA_FIELD.FIELD_CLOSE: float(k.get("close", 0)),
            })
            klu.set_idx(i)
            klu.kl_type = kl_type
            if prev_klu is not None:
                klu.set_pre_klu(prev_klu)

            try:
                chan.kl_datas[kl_type].add_single_klu(klu)
                # 获取最后添加的 klu 的引用
                if len(chan.kl_datas[kl_type]) > 0 and len(chan.kl_datas[kl_type][-1]) > 0:
                    prev_klu = chan.kl_datas[kl_type][-1][-1]
            except Exception:
                pass

        # 计算线段和中枢
        chan.kl_datas[kl_type].cal_seg_and_zs()

        # 提取结果
        kl_data = chan[0]
        bi_list = list(kl_data.bi_list) if kl_data.bi_list else []
        seg_list = list(kl_data.seg_list) if kl_data.seg_list else []

        # 中枢
        zs_list = []
        for seg in seg_list:
            if hasattr(seg, 'zs_lst'):
                for zs in seg.zs_lst:
                    zs_list.append({
                        "high": zs.high,
                        "low": zs.low,
                        "center": (zs.high + zs.low) / 2,
                    })

        # 买卖点
        bsp_list = []
        if hasattr(kl_data, 'bs_point_lst') and kl_data.bs_point_lst:
            try:
                raw_bsp = kl_data.bs_point_lst.getSortedBspList()
                for bsp in raw_bsp:
                    bsp_list.append({
                        "type": bsp.type2str(),
                        "is_buy": bsp.is_buy,
                        "time": str(bsp.klu.time) if hasattr(bsp, 'klu') else "",
                    })
            except Exception:
                pass

        # === 方向判断 ===
        dir_score = 0.0

        # 1. 最后一笔方向
        if bi_list:
            last_bi = bi_list[-1]
            if last_bi.dir.name == "UP":
                dir_score += 0.4
            else:
                dir_score -= 0.4

        # 2. 最后一段方向
        if seg_list:
            last_seg = seg_list[-1]
            if last_seg.dir.name == "UP":
                dir_score += 0.25
            else:
                dir_score -= 0.25

        # 3. 买卖点信号 (最强)
        for bsp in bsp_list[-3:]:
            bsp_type = bsp["type"]
            if "1" in bsp_type:  # 一类买卖点
                dir_score += 0.5 if bsp["is_buy"] else -0.5
            elif "2" in bsp_type:  # 二类
                dir_score += 0.3 if bsp["is_buy"] else -0.3
            elif "3" in bsp_type:  # 三类
                dir_score += 0.2 if bsp["is_buy"] else -0.2

        # 4. 价格与中枢的位置关系
        if zs_list:
            last_zs = zs_list[-1]
            if current_price > last_zs["high"]:
                dir_score += 0.15  # 价格在中枢上方
            elif current_price < last_zs["low"]:
                dir_score -= 0.15  # 价格在中枢下方

        dir_score = max(-1.0, min(1.0, dir_score))
        direction = "up" if dir_score > 0.1 else ("down" if dir_score < -0.1 else "sideways")

        # 缠论评分 (0-100分制)
        # 0分=完全没信号, 50分=中等信号, 100分=所有指标同向(极强)
        win_rate = round(abs(dir_score) * 100)
        win_rate = max(0, min(100, win_rate))

        # 支撑阻力
        support = resistance = None
        if zs_list:
            last_zs = zs_list[-1]
            support = last_zs["low"]
            resistance = last_zs["high"]

        # 笔转换为前端格式
        bis_for_frontend = []
        for bi in bi_list:
            try:
                bis_for_frontend.append({
                    "type": "top" if bi.dir.name == "UP" else "bottom",
                    "price": bi.get_end_val(),
                    "index": bi.get_end_klu().idx if hasattr(bi.get_end_klu(), 'idx') else 0,
                    "time": str(bi.get_end_klu().time),
                })
            except Exception:
                pass

        # 线段转换
        segs_for_frontend = []
        for seg in seg_list:
            try:
                segs_for_frontend.append({
                    "direction": seg.dir.name,
                    "start_time": str(seg.get_begin_klu().time),
                    "end_time": str(seg.get_end_klu().time),
                    "start_price": seg.get_begin_val(),
                    "end_price": seg.get_end_val(),
                })
            except Exception:
                pass

        return {
            "engine": "chanpy",
            "direction": direction,
            "dir_score": dir_score,
            "win_rate": win_rate,
            "bi_count": len(bi_list),
            "seg_count": len(seg_list),
            "zs_count": len(zs_list),
            "bsp_count": len(bsp_list),
            "bis": bis_for_frontend,
            "segs": segs_for_frontend,
            "zs_list": zs_list,
            "bsp_list": bsp_list,
            "support": support,
            "resistance": resistance,
            "current_price": current_price,
        }

    except Exception as e:
        logger.error(f"chan.py 计算失败: {e}", exc_info=True)
        return None


def analyze_with_fallback(
    klines: list[dict],
    current_price: float,
    closes: Optional[np.ndarray] = None,
) -> dict:
    """
    先用 chan.py，失败则降级到简版

    Returns:
        dict: 分析结果，包含 engine 字段标识使用了哪个引擎
    """
    # 尝试 chan.py
    result = analyze_with_chanpy(klines, current_price)
    if result is not None:
        return result

    # 降级到简版
    logger.info("降级使用简版缠论引擎")
    from app.engines.bi import find_bi
    from app.engines.zhongshu import find_zhongshu
    from app.engines.divergence import detect_divergence
    from app.engines.trend import analyze_trend

    if closes is None:
        closes = np.array([k["close"] for k in klines])

    bis = find_bi(klines)
    zs = find_zhongshu(bis)
    div = detect_divergence(bis, closes=closes)
    trend = analyze_trend(bis, zs, current_price)

    # 映射为统一格式
    dir_score = 0.0
    if trend["trend"] == "bullish":
        dir_score = 0.5
    elif trend["trend"] == "bearish":
        dir_score = -0.5

    direction = "up" if dir_score > 0.1 else ("down" if dir_score < -0.1 else "sideways")
    win_rate = round(abs(dir_score) * 100)
    win_rate = max(0, min(100, win_rate))

    return {
        "engine": "simple_fallback",
        "direction": direction,
        "dir_score": dir_score,
        "win_rate": win_rate,
        "bi_count": len(bis),
        "seg_count": 0,
        "zs_count": len(zs),
        "bsp_count": 0,
        "bis": bis[-10:],
        "segs": [],
        "zs_list": [{"high": z["high"], "low": z["low"], "center": z["center"]} for z in zs],
        "bsp_list": [],
        "support": zs[-1]["low"] if zs else None,
        "resistance": zs[-1]["high"] if zs else None,
        "current_price": current_price,
        "divergence": div,
        "trend": trend,
    }
