"""
Chanlun Service — orchestrates data fetching and engine calls.
Replaces the Express route handler logic from chanlun.js lines 268-398.
"""

import asyncio
import numpy as np
from datetime import datetime, timezone
from typing import Optional

try:
    import talib
    HAS_TALIB = True
except ImportError:
    HAS_TALIB = False

from app.clients.binance_client import get_binance_client
from app.clients.market_client import get_market_client
from app.engines.chanlun_engine import analyze_with_fallback
from app.engines.scoring import compute_all_factors, compute_composite_score


import time
import logging

logger = logging.getLogger(__name__)

_CACHE = {}
_HEARTBEAT_TASK = None
_FULL_ANALYSIS_LOCK = asyncio.Lock()

def _is_dead_zone(tf: str, now: datetime) -> bool:
    """Determine if a timeframe is in its final settlement window."""
    minute = now.minute
    second = now.second
    if tf == "5m":
        return (minute % 5 == 4) and (second >= 30)
    elif tf == "15m":
        return (minute % 15 == 14)
    elif tf == "30m":
        return (minute % 30 == 29)
    elif tf == "1h":
        return (minute == 58 or minute == 59)
    elif tf in ("2h", "4h"):
        # For multi-hour, freeze the last 5 minutes of the final hour
        if tf == "2h":
            is_last_hour = (now.hour % 2 == 1)
        else: # 4h
            is_last_hour = (now.hour % 4 == 3)
        return is_last_hour and (minute >= 55)
    elif tf in ("12h", "1d"):
        # Freeze last 15 mins
        if tf == "12h":
            is_last_hour = (now.hour % 12 == 11)
        else: # 1d
            is_last_hour = (now.hour == 23)
        return is_last_hour and (minute >= 45)
    return False

class ChanlunService:
    """Orchestrates data fetching → Chanlun analysis → prediction generation."""

    def __init__(self):
        self.binance = get_binance_client()
        self.market = get_market_client()
        self._start_heartbeat()

    def _start_heartbeat(self):
        global _HEARTBEAT_TASK
        if _HEARTBEAT_TASK is None:
            _HEARTBEAT_TASK = asyncio.create_task(self._heartbeat_loop())

    async def _heartbeat_loop(self):
        """Perpetual Sync Loop: Fires exactly at 02 seconds of every minute."""
        while True:
            try:
                now = time.time()
                # Seconds remaining until the next HH:MM:02
                wait_time = 60 - (now % 60) + 2
                if wait_time > 60:
                    wait_time -= 60
                
                await asyncio.sleep(wait_time)
                # Ensure we only fetch exactly at :02, +/- network latency
                logger.info(f"🎯 [Engine Tick] 引擎周期强制触发: {datetime.now(timezone.utc).strftime('%H:%M:%S.%f')[:-3]}")
                
                await self._force_analysis_update("BTC")
            except Exception as e:
                logger.warning(f"Heartbeat tick error: {e}")
                await asyncio.sleep(5)  # Backoff on error

    async def full_analysis(self, symbol: str = "BTC") -> dict:
        """Returns the atomic cache snippet instantly, with a 65-second failsafe TTL."""
        global _CACHE, _FULL_ANALYSIS_LOCK
        cache_key = f"full_analysis_{symbol}"
        now = time.time()
        
        # Fast path lockless check (failsafe TTL: 65s)
        if cache_key in _CACHE:
            cached_data, timestamp = _CACHE[cache_key]
            if now - timestamp < 65:
                # Cache is fresh
                return cached_data
                
        # Cold start or Stale Execution
        async with _FULL_ANALYSIS_LOCK:
            if cache_key in _CACHE:
                cached_data, timestamp = _CACHE[cache_key]
                if now - timestamp < 65:
                    return cached_data
            logger.info("Failsafe/Cold-start triggered for Chanlun Engine analysis...")
            return await self._force_analysis_update(symbol)
            
    async def _force_analysis_update(self, symbol: str) -> dict:
        """Core analysis payload computation."""
        global _CACHE

        # Step 1: Parallel data fetching for 8 precise Intervals (Phase 1)
        start_time = time.time()
        
        intervals_config = [
            ("5m", 288), ("15m", 288), ("30m", 288), ("1h", 168),
            ("2h", 168), ("4h", 168), ("12h", 168), ("1d", 168)
        ]
        
        tasks = [
            self.binance.get_klines(symbol=f"{symbol}USDT", interval=iv, limit=limit)
            for iv, limit in intervals_config
        ]
        tasks.append(self.binance.get_funding_rate(symbol=f"{symbol}USDT"))
        tasks.append(self.binance.get_open_interest(symbol=f"{symbol}USDT"))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        fetch_time = time.time() - start_time
        print(f"\n[Phase 1 验收] 成功发起 8大周期K线 + 资金费率 + 持仓量 共计 10 个并发请求！")
        print(f"[Phase 1 验收] 并发 I/O 总耗时: {fetch_time:.3f} 秒\n")
        
        # Unpack results
        kline_dict = {iv[0]: res for iv, res in zip(intervals_config, results[:8])}
        funding_data = results[8]
        open_interest = results[9]

        # 从字典中提取 1h 作为向下兼容的过渡数据 (保证老代码不断崖)
        klines_raw = kline_dict.get("1h", [])
        
        # Parse results (graceful fallback on errors)
        klines = klines_raw if isinstance(klines_raw, list) else []
        funding_rate = funding_data.get("funding_rate") if isinstance(funding_data, dict) else None
        oi = open_interest if isinstance(open_interest, (int, float)) else None

        # Step 2: Extract base 1H data for backward compatible UI root charts
        if not klines or isinstance(klines, BaseException):
            return self._empty_response("No kline data available")

        closes_1h = np.array([k["close"] for k in klines], dtype=np.float64)
        current_price = float(closes_1h[-1])
        indicators_1h = self._compute_indicators(
            closes_1h, 
            np.array([k["high"] for k in klines], dtype=np.float64),
            np.array([k["low"] for k in klines], dtype=np.float64),
            np.array([k["volume"] for k in klines], dtype=np.float64)
        )
        chanlun_1h = analyze_with_fallback(klines, current_price, closes_1h)
        
        bis = chanlun_1h.get("bis", [])
        zs_list = chanlun_1h.get("zs_list", [])
        segs = chanlun_1h.get("segs", [])
        bsp_list = chanlun_1h.get("bsp_list", [])
        divergence = chanlun_1h.get("divergence", {})
        
        trend_analysis = {
            "trend": chanlun_1h["direction"],
            "strength": chanlun_1h["win_rate"],
            "relative_to_zs": "inside",
            "nearest_zs": zs_list[-1] if zs_list else None,
        }

        # Step 3: Evaluate all 8 timeframes independently
        tf_evals = {}
        for tf, _ in intervals_config:
            kl_tf = kline_dict.get(tf, [])
            if not kl_tf or len(kl_tf) < 20:
                continue
            tf_data = self._compute_single_tf_raw(tf, kl_tf, current_price)
            tf_evals[tf] = tf_data

        # Step 4: Interval Nesting (区间套应用) and API Matrix Generation
        from app.engines.prediction import generate_prediction_for_tf
        predictions = []
        nesting_map = {"15m": "5m", "30m": "15m", "1h": "30m", "2h": "1h", "4h": "1h", "12h": "4h", "1d": "4h"}

        for tf, _ in intervals_config:
            if tf not in tf_evals:
                continue
            
            data = tf_evals[tf]
            raw_score = data["composite_raw"]
            
            # Cross-timeframe resonance (区间套)
            sub_tf = nesting_map.get(tf)
            if sub_tf and sub_tf in tf_evals:
                sub_score = tf_evals[sub_tf]["composite_raw"]
                if raw_score * sub_score < 0:
                    raw_score += (sub_score * 0.3)  # 反向刹车拉扯
                else:
                    raw_score += (sub_score * 0.15) # 同向共振推背
            
            raw_score = max(-100.0, min(100.0, raw_score))
            
            # Check Dead-Zone freeze
            now_dt = datetime.now(timezone.utc)
            in_dead_zone = _is_dead_zone(tf, now_dt)
            
            # If in dead-zone, attempt to freeze signal from previous cache
            cache_key = f"full_analysis_{symbol}"
            frozen = False
            if in_dead_zone and cache_key in _CACHE:
                cached_data = _CACHE[cache_key][0]
                cached_preds = cached_data.get("predictions", [])
                for cp in cached_preds:
                    if cp["timeframe"] == tf:
                        # Restore previous engine state completely
                        raw_score = float(cp["dirStatus"].split("Raw: ")[1].strip(")")) if "Raw:" in cp["dirStatus"] else raw_score
                        direction = cp["direction"]
                        win_rate = cp["winRate"]
                        score_level = cp.get("scoreLevel", "")
                        score_desc = cp.get("scoreDesc", "")
                        frozen = True
                        break
                        
            if not frozen:
                # 降维映射: ±35 死亡横盘区过滤
                direction = "sideways"
                if raw_score > 35: direction = "up"
                elif raw_score < -35: direction = "down"
                
                win_rate = round(raw_score)  # ±100 保留符号：负=看跌 正=看涨
                win_rate = max(-100, min(100, win_rate))
                score_level, score_desc = self._score_label(win_rate)

            pred = generate_prediction_for_tf(
                tf=tf,
                current_price=current_price,
                raw_score=raw_score,
                win_rate=win_rate,
                direction=direction,
                trend_analysis=data["trend_analysis"],
                divergence=data["divergence"],
                indicators=data["indicators"],
                funding_rate=funding_rate,
                closes=data["closes"]
            )
            
            pred["factorScores"] = data["factor_scores"]
            pred["chanlunWinRate"] = round(data["chanlun_raw"])  # ±100 保留符号
            pred["chanlunDirection"] = "up" if data["chanlun_raw"] > 0 else "down"
            pred["factorWinRate"] = round(data["factor_raw"])    # ±100 保留符号
            pred["factorDirection"] = "up" if data["factor_raw"] > 0 else "down"
            pred["compositeWinRate"] = win_rate  # ±100 保留符号
            pred["compositeDirection"] = direction
            pred["scoreLevel"] = score_level
            pred["scoreDesc"] = score_desc
            pred["dirStatus"] = f"{direction} (Raw: {raw_score:.1f})"
            pred["engineUsed"] = data["engineUsed"]
            pred["isDeadZone"] = in_dead_zone
            
            # (预留) Momentum Delta 计算接口
            # Read previous target from CACHE if available for Delta
            last_direction = "sideways"
            if cache_key in _CACHE:
                c_preds = _CACHE[cache_key][0].get("predictions", [])
                for cp in c_preds:
                    if cp["timeframe"] == tf:
                        last_direction = cp["direction"]
                        break
                        
            pred["momentumDelta"] = 1 if (direction == "up" and last_direction != "up") else (-1 if (direction == "down" and last_direction != "down") else 0) 
            
            predictions.append(pred)

        # Build response
        zhongshu_for_frontend = [{"high": z["high"], "low": z["low"], "center": z["center"]} for z in zs_list[-5:]]

        response_data = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "currentPrice": current_price,
            "chanlun": {
                "bis": bis[-10:],
                "zhongshu": zhongshu_for_frontend,
                "segs": segs[-5:],
                "bsp": bsp_list[-5:],
                "trend": trend_analysis["trend"],
                "strength": trend_analysis["strength"],
                "relativeToZS": trend_analysis["relative_to_zs"],
                "divergence": divergence,
                "engine": chanlun_1h["engine"],
            },
            "indicators": {
                "rsi": indicators_1h.get("rsi"),
                "bbands": indicators_1h.get("bbands"),
                "macd": indicators_1h.get("macd"),
            },
            "market": {
                "futures": {
                    "funding_rate": funding_rate,
                    "open_interest": oi,
                    "mark_price": funding_data.get("mark_price") if isinstance(funding_data, dict) else None,
                },
            },
            "predictions": predictions,
            "priceHistory": [
                {"time": k["timestamp"], "price": k["close"]}
                for k in klines[-288:]
            ],
        }
        
        # Save to cache unconditionally since we own the lock
        _CACHE[cache_key] = (response_data, time.time())
        return response_data

    def _compute_indicators(self, closes, highs, lows, volumes) -> dict:
        """Compute all technical indicators using TA-Lib (or fallback)."""
        indicators: dict = {}

        if not HAS_TALIB or len(closes) < 26:
            return indicators

        # RSI
        rsi = talib.RSI(closes, timeperiod=14)
        if not np.isnan(rsi[-1]):
            indicators["rsi"] = round(float(rsi[-1]), 2)

        # MACD
        macd_line, signal, hist = talib.MACD(closes, fastperiod=12, slowperiod=26, signalperiod=9)
        if not np.isnan(macd_line[-1]):
            indicators["macd"] = {
                "macd": round(float(macd_line[-1]), 2),
                "signal": round(float(signal[-1]), 2),
                "histogram": round(float(hist[-1]), 2),
            }

        # Bollinger Bands
        upper, middle, lower = talib.BBANDS(closes, timeperiod=20)
        if not np.isnan(upper[-1]):
            indicators["bbands"] = {
                "upper": round(float(upper[-1]), 2),
                "middle": round(float(middle[-1]), 2),
                "lower": round(float(lower[-1]), 2),
            }

        # OBV
        obv = talib.OBV(closes, volumes)
        if not np.isnan(obv[-1]):
            indicators["obv"] = round(float(obv[-1]), 2)

        # ATR
        atr = talib.ATR(highs, lows, closes, timeperiod=14)
        if not np.isnan(atr[-1]):
            indicators["atr"] = round(float(atr[-1]), 2)

        return indicators

    def _empty_response(self, error: str) -> dict:
        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "currentPrice": 0,
            "chanlun": {"bis": [], "zhongshu": [], "trend": "neutral", "strength": 50, "relativeToZS": None, "divergence": {}},
            "indicators": {"rsi": None, "bbands": None, "macd": None},
            "market": {"futures": None, "fearGreed": None},
            "predictions": [],
            "priceHistory": [],
            "error": error,
        }

    def _score_label(self, score):
        s = abs(score)  # 只看强度，不看方向
        if s >= 80: return ("强信号", "极高概率操作机会")
        if s >= 60: return ("可操作", "动能较强，可择机操作")
        if s >= 35: return ("中性偏强", "信号一般，轻仓观望")
        return ("观望", "信号死区，保持观望")

    def _compute_single_tf_raw(self, tf: str, klines: list, current_price: float) -> dict:
        """独立的时空分数场计算器 (P4核心)。"""
        closes = np.array([k["close"] for k in klines], dtype=np.float64)
        highs = np.array([k["high"] for k in klines], dtype=np.float64)
        lows = np.array([k["low"] for k in klines], dtype=np.float64)
        volumes = np.array([k["volume"] for k in klines], dtype=np.float64)
        
        indicators = self._compute_indicators(closes, highs, lows, volumes)
        chanlun_res = analyze_with_fallback(klines, current_price, closes, timeframe=tf)
        
        factor_scores = compute_all_factors(closes, volumes, highs, lows, divergence=chanlun_res.get("divergence"))
        factor_composite, _ = compute_composite_score(factor_scores)
        
        chanlun_raw = chanlun_res.get("dir_score", 0) * 100
        factor_raw = factor_composite * 100
        
        # P4核心公式：两大连续引擎对冲合流
        composite_raw = chanlun_raw * 0.6 + factor_raw * 0.4
        
        trend_analysis = {
            "trend": chanlun_res.get("direction", "neutral"),
            "strength": chanlun_res.get("win_rate", 50),
            "nearest_zs": chanlun_res.get("zs_list")[-1] if chanlun_res.get("zs_list") else None,
        }
        
        return {
            "composite_raw": composite_raw,
            "chanlun_raw": chanlun_raw,
            "factor_raw": factor_raw,
            "trend_analysis": trend_analysis,
            "divergence": chanlun_res.get("divergence", {}),
            "indicators": indicators,
            "closes": closes,
            "factor_scores": factor_scores,
            "engineUsed": chanlun_res.get("engine", "unknown")
        }
