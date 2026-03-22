"""
Prediction generation — 7-timeframe price predictions.
Port from chanlun.js generatePredictions() with TA-Lib ATR upgrade.
"""

import numpy as np
from typing import Optional

try:
    import talib
    HAS_TALIB = True
except ImportError:
    HAS_TALIB = False


MULTIPLIERS = {"30m": 1, "1h": 2, "2h": 3, "4h": 5, "8h": 8, "12h": 10, "24h": 14}
TIMEFRAMES = ["30m", "1h", "2h", "4h", "8h", "12h", "24h"]
WEIGHT_CLASSES = {"30m": "1H", "1h": "1H", "2h": "4H", "4h": "4H", "8h": "1D", "12h": "1D", "24h": "1D"}


def generate_predictions(
    current_price: float,
    trend_analysis: dict,
    divergence: dict,
    indicators: dict,
    funding_rate: Optional[float] = None,
    fear_greed: Optional[int] = None,
    closes: Optional[np.ndarray] = None,
) -> list[dict]:
    """
    Generate 7-timeframe price predictions using dual-system scoring.

    Args:
        current_price: current BTC price
        trend_analysis: from analyze_trend()
        divergence: from detect_divergence()
        indicators: dict with rsi, bbands, etc.
        funding_rate: current funding rate (e.g., 0.0001)
        fear_greed: Fear & Greed index value (0-100)
        closes: numpy array of close prices for ATR calculation

    Returns:
        list of prediction dicts for each timeframe
    """
    trend = trend_analysis.get("trend", "neutral")
    nearest_zs = trend_analysis.get("nearest_zs")

    # Volatility: use ATR if available, else fallback to fixed 0.2%
    volatility_base = current_price * 0.002
    if closes is not None and len(closes) > 14 and HAS_TALIB:
        # We need high/low/close for ATR, but if only closes, approximate
        atr = talib.ATR(closes * 1.001, closes * 0.999, closes, timeperiod=14)
        last_atr = atr[-1] if not np.isnan(atr[-1]) else volatility_base
        volatility_base = float(last_atr) * 0.5  # Scale ATR to 30min equivalent

    # Bias factors (identical to JS)
    funding_bias = 0.0
    if funding_rate is not None:
        if funding_rate > 0.0001:
            funding_bias = -0.3
        elif funding_rate < -0.0001:
            funding_bias = 0.3

    sentiment_bias = 0.0
    if fear_greed is not None:
        if fear_greed > 80:
            sentiment_bias = -0.2
        elif fear_greed < 20:
            sentiment_bias = 0.2

    rsi_bias = 0.0
    rsi = indicators.get("rsi")
    if rsi is not None:
        if rsi > 70:
            rsi_bias = -0.25
        elif rsi < 30:
            rsi_bias = 0.25

    div_bias = 0.0
    if divergence.get("top_div"):
        div_bias = -0.4
    if divergence.get("bottom_div"):
        div_bias = 0.4

    predictions = []

    for tf in TIMEFRAMES:
        mult = MULTIPLIERS[tf]
        base_move = volatility_base * mult

        # Direction score: positive = bullish, negative = bearish
        dir_score = 0.0
        if trend == "bullish":
            dir_score = 0.6
        elif trend == "bearish":
            dir_score = -0.6

        dir_score += funding_bias + sentiment_bias + rsi_bias + div_bias
        dir_score = max(-1.0, min(1.0, dir_score))

        target_price = current_price + (base_move * dir_score)
        direction = "up" if dir_score > 0.1 else ("down" if dir_score < -0.1 else "sideways")

        # Win rate
        win_rate = 50 + abs(dir_score) * 30
        win_rate -= (mult - 1) * 1.5
        win_rate = round(max(35, min(85, win_rate)))

        # Support/Resistance
        support = current_price - base_move * 0.8
        resistance = current_price + base_move * 0.8
        if nearest_zs:
            if nearest_zs["low"] < current_price:
                support = max(support, nearest_zs["low"])
            if nearest_zs["high"] > current_price:
                resistance = min(resistance, nearest_zs["high"])

        # Triggers
        triggers = _build_triggers(divergence, nearest_zs, current_price, indicators, funding_bias, direction)

        predictions.append({
            "timeframe": tf,
            "direction": direction,
            "targetPrice": round(target_price, 2),
            "currentPrice": round(current_price, 2),
            "priceChange": round(target_price - current_price, 2),
            "priceChangePct": round(((target_price - current_price) / current_price) * 100, 2),
            "winRate": win_rate,
            "support": round(support, 2),
            "resistance": round(resistance, 2),
            "triggers": triggers,
            "confidence": "high" if win_rate >= 65 else ("medium" if win_rate >= 55 else "low"),
            "weightClass": WEIGHT_CLASSES[tf],
        })

    return predictions


def _build_triggers(divergence, nearest_zs, current_price, indicators, funding_bias, direction) -> list[str]:
    """Build human-readable trigger descriptions."""
    triggers = []

    if divergence.get("top_div"):
        triggers.append("MACD top divergence detected - bearish signal")
    if divergence.get("bottom_div"):
        triggers.append("MACD bottom divergence detected - bullish signal")

    if nearest_zs:
        if abs(current_price - nearest_zs["high"]) / current_price < 0.005:
            triggers.append("Price at ZhongShu upper boundary - breakout/rejection zone")
        if abs(current_price - nearest_zs["low"]) / current_price < 0.005:
            triggers.append("Price at ZhongShu lower boundary - support test")

    rsi = indicators.get("rsi")
    if rsi is not None:
        if rsi > 70:
            triggers.append(f"RSI overbought (>{round(rsi)})")
        elif rsi < 30:
            triggers.append(f"RSI oversold (<{round(rsi)})")

    if abs(funding_bias) > 0.1:
        if funding_bias < 0:
            triggers.append("High funding rate - long squeeze risk")
        else:
            triggers.append("Negative funding - short squeeze risk")

    if not triggers:
        if direction == "up":
            triggers.append("Trend continuation within ascending channel")
        elif direction == "down":
            triggers.append("Trend continuation within descending channel")
        else:
            triggers.append("Range-bound oscillation near ZhongShu center")

    return triggers
