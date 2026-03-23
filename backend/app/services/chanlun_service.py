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
from app.engines.prediction import generate_predictions
from app.engines.scoring import compute_all_factors, compute_composite_score


class ChanlunService:
    """Orchestrates data fetching → Chanlun analysis → prediction generation."""

    def __init__(self):
        self.binance = get_binance_client()
        self.market = get_market_client()

    async def full_analysis(self, symbol: str = "BTC") -> dict:
        """
        Complete Chanlun analysis flow:
        1. Fetch klines + funding rate + fear/greed in parallel
        2. Compute TA-Lib indicators locally
        3. Run Chanlun engine (Bi → ZhongShu → Divergence → Trend)
        4. Generate 7-timeframe predictions with dual scoring
        """

        # Step 1: Parallel data fetching
        # 注: fear_greed 和 funding_rate 已不再用于评分（scoring.py 已替换为 KDJ/SAR/MFI）
        # 但 funding_rate 和 open_interest 仍保留在 market 信息中供参考
        klines_raw, funding_data, open_interest = await asyncio.gather(
            self.binance.get_klines(symbol=f"{symbol}USDT", interval="1h", limit=168),
            self.binance.get_funding_rate(symbol=f"{symbol}USDT"),
            self.binance.get_open_interest(symbol=f"{symbol}USDT"),
            return_exceptions=True,
        )

        # Parse results (graceful fallback on errors)
        klines = klines_raw if isinstance(klines_raw, list) else []
        funding_rate = funding_data.get("funding_rate") if isinstance(funding_data, dict) else None
        oi = open_interest if isinstance(open_interest, (int, float)) else None

        if not klines:
            return self._empty_response("No kline data available")

        # Step 2: Prepare numpy arrays for TA-Lib
        closes = np.array([k["close"] for k in klines], dtype=np.float64)
        highs = np.array([k["high"] for k in klines], dtype=np.float64)
        lows = np.array([k["low"] for k in klines], dtype=np.float64)
        volumes = np.array([k["volume"] for k in klines], dtype=np.float64)
        current_price = float(closes[-1])

        # Step 3: Compute TA-Lib indicators locally (< 10ms)
        indicators = self._compute_indicators(closes, highs, lows, volumes)

        # Step 4: 缠论引擎 (chan.py 完整版 + 简版降级)
        chanlun_result = analyze_with_fallback(klines, current_price, closes)

        # 提取缠论分析结果
        bis = chanlun_result.get("bis", [])
        zs_list = chanlun_result.get("zs_list", [])
        segs = chanlun_result.get("segs", [])
        bsp_list = chanlun_result.get("bsp_list", [])
        divergence = chanlun_result.get("divergence", {})
        trend_analysis = {
            "trend": chanlun_result["direction"],
            "strength": chanlun_result["win_rate"],
            "relative_to_zs": "above" if current_price > (chanlun_result.get("resistance") or current_price) else
                              "below" if current_price < (chanlun_result.get("support") or current_price) else "inside",
            "nearest_zs": zs_list[-1] if zs_list else None,
        }
        # 映射 trend 值: up→bullish, down→bearish
        trend_map = {"up": "bullish", "down": "bearish", "sideways": "neutral"}
        trend_analysis["trend"] = trend_map.get(chanlun_result["direction"], "neutral")

        # Step 5: 6因子评分 (全部K线级别实时指标，不依赖外部API)
        factor_scores = compute_all_factors(
            closes, volumes, highs, lows,
            divergence=divergence,
        )

        # 计算6因子综合方向和评分
        factor_composite_score, factor_direction = compute_composite_score(factor_scores)
        factor_win_rate = round(abs(factor_composite_score) * 100)  # 0-100
        factor_win_rate = max(0, min(100, factor_win_rate))

        # Step 6: 生成预测 (纯缠论方向)
        predictions = generate_predictions(
            current_price=current_price,
            trend_analysis=trend_analysis,
            divergence=divergence,
            indicators=indicators,
            funding_rate=None,
            fear_greed=None,
            closes=closes,
        )

        # 方向一致性决策 (2C)
        chanlun_win_rate = chanlun_result["win_rate"]
        chanlun_direction = chanlun_result["direction"]  # "up"/"down"/"sideways"
        chanlun_has_signal = chanlun_win_rate >= 30
        factor_has_signal = factor_win_rate >= 30

        if not chanlun_has_signal:
            # 缠论没方向 → 主信号缺失 → 观望
            composite_win_rate = 0
            composite_direction = "sideways"
        elif not factor_has_signal:
            # 因子中性 → 跟缠论主信号
            composite_win_rate = chanlun_win_rate
            composite_direction = chanlun_direction
        elif chanlun_direction == factor_direction:
            # 同向 → 加权平均，信心增强
            composite_win_rate = round(chanlun_win_rate * 0.6 + factor_win_rate * 0.4)
            composite_direction = chanlun_direction
        elif chanlun_direction != "sideways" and factor_direction != "neutral" and chanlun_direction != factor_direction:
            # 反向 → 矛盾 → 观望
            composite_win_rate = 0
            composite_direction = "sideways"
        else:
            # 其他情况 → 跟缠论
            composite_win_rate = chanlun_win_rate
            composite_direction = chanlun_direction

        composite_win_rate = max(0, min(100, composite_win_rate))

        # 添加因子评分和3个独立评分
        for pred in predictions:
            pred["factorScores"] = factor_scores
            pred["chanlunWinRate"] = chanlun_win_rate
            pred["chanlunDirection"] = chanlun_direction
            pred["factorWinRate"] = factor_win_rate
            pred["factorDirection"] = factor_direction
            pred["compositeWinRate"] = composite_win_rate
            pred["compositeDirection"] = composite_direction
            pred["engineUsed"] = chanlun_result["engine"]

        # Build response
        zhongshu_for_frontend = [{"high": z["high"], "low": z["low"], "center": z["center"]} for z in zs_list[-5:]]

        return {
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
                "engine": chanlun_result["engine"],
            },
            "indicators": {
                "rsi": indicators.get("rsi"),
                "bbands": indicators.get("bbands"),
                "macd": indicators.get("macd"),
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
