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
from app.engines.bi import find_bi
from app.engines.zhongshu import find_zhongshu
from app.engines.divergence import detect_divergence
from app.engines.trend import analyze_trend
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

        # Step 1: Parallel data fetching (only 4 external API calls)
        klines_raw, funding_data, fear_greed_data, open_interest = await asyncio.gather(
            self.binance.get_klines(symbol=f"{symbol}USDT", interval="1h", limit=168),
            self.binance.get_funding_rate(symbol=f"{symbol}USDT"),
            self.market.get_fear_greed(),
            self.binance.get_open_interest(symbol=f"{symbol}USDT"),
            return_exceptions=True,
        )

        # Parse results (graceful fallback on errors)
        klines = klines_raw if isinstance(klines_raw, list) else []
        funding_rate = funding_data.get("funding_rate") if isinstance(funding_data, dict) else None
        fear_greed = fear_greed_data.get("value") if isinstance(fear_greed_data, dict) else None
        fear_greed_label = fear_greed_data.get("label", "") if isinstance(fear_greed_data, dict) else ""
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

        # Step 4: Chanlun engine
        bis = find_bi(klines)
        zhongshu = find_zhongshu(bis)
        divergence = detect_divergence(bis, closes=closes)
        trend_analysis = analyze_trend(bis, zhongshu, current_price)

        # Step 5: 6-Factor scoring (NEW)
        factor_scores = compute_all_factors(
            closes, volumes, highs, lows,
            funding_rate=funding_rate,
            fear_greed=fear_greed,
            divergence=divergence,
        )

        # Step 6: Generate predictions
        predictions = generate_predictions(
            current_price=current_price,
            trend_analysis=trend_analysis,
            divergence=divergence,
            indicators=indicators,
            funding_rate=funding_rate,
            fear_greed=fear_greed,
            closes=closes,
        )

        # Add factor scores to each prediction
        for pred in predictions:
            pred["factorScores"] = factor_scores

        # Build response (matching original Express JSON structure)
        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "currentPrice": current_price,
            "chanlun": {
                "bis": bis[-10:],
                "zhongshu": zhongshu[-5:],
                "trend": trend_analysis["trend"],
                "strength": trend_analysis["strength"],
                "relativeToZS": trend_analysis["relative_to_zs"],
                "divergence": divergence,
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
                "fearGreed": fear_greed,
                "fearGreedLabel": fear_greed_label,
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
