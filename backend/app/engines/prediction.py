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


MULTIPLIERS = {"5m": 0.5, "15m": 0.75, "30m": 1, "1h": 2, "2h": 3, "4h": 5, "12h": 10, "1d": 14}
TIMEFRAMES = ["5m", "15m", "30m", "1h", "2h", "4h", "12h", "1d"]
WEIGHT_CLASSES = {"5m": "1H", "15m": "1H", "30m": "1H", "1h": "1H", "2h": "4H", "4h": "4H", "12h": "1D", "1d": "1D"}


def generate_prediction_for_tf(
    tf: str,
    current_price: float,
    raw_score: float,
    win_rate: int,
    direction: str,
    trend_analysis: dict,
    divergence: dict,
    indicators: dict,
    funding_rate: Optional[float] = None,
    closes: Optional[np.ndarray] = None,
    **kwargs
) -> dict:
    nearest_zs = trend_analysis.get("nearest_zs")

    # Volatility base
    volatility_base = current_price * 0.002
    if closes is not None and len(closes) > 14 and HAS_TALIB:
        atr = talib.ATR(closes * 1.001, closes * 0.999, closes, timeperiod=14)
        last_atr = atr[-1] if not np.isnan(atr[-1]) else volatility_base
        volatility_base = float(last_atr) * 0.5

    mult = MULTIPLIERS.get(tf, 1)
    base_move = volatility_base * mult
    dir_modifier = raw_score / 100.0  # [-1.0, 1.0]

    # 1. Base Volatility Bounds (ATR Fallback)
    support = current_price - base_move
    resistance = current_price + base_move

    # 2. Strict Chanlun Hub Overrides (True Physics)
    max_pull_distance = base_move * 3

    if nearest_zs:
        zs_low = nearest_zs["low"]
        zs_high = nearest_zs["high"]
        zs_center = nearest_zs.get("center", current_price)
        
        if zs_low < current_price and (current_price - zs_low) <= max_pull_distance:
            support = zs_low
        if zs_high > current_price and (zs_high - current_price) <= max_pull_distance:
            resistance = zs_high
            
        is_center_in_range = abs(current_price - zs_center) <= max_pull_distance
    else:
        is_center_in_range = False

    # 3. Dynamic Target Routing based on Momentum
    if direction == "up":
        if raw_score >= 60:
            # Strong Breakout: Target punches through the structural resistance
            target_price = resistance + (base_move * 0.3)
        else:
            # Rebound: Target maps exactly to the structural roof
            target_price = resistance * 0.999
    elif direction == "down":
        if raw_score <= -60:
            # Strong Breakdown: Target punches through structural floor
            target_price = support - (base_move * 0.3)
        else:
            # Retracement: Target maps exactly to the structural floor
            target_price = support * 1.001
    else:
        # Sideways: Mean reversion towards the Chanlun center of gravity
        if nearest_zs and is_center_in_range:
            target_price = nearest_zs.get("center", current_price)
        else:
            target_price = current_price + (base_move * dir_modifier * 0.3)

    # Triggers
    triggers = _build_triggers(divergence, nearest_zs, current_price, indicators, funding_rate, direction)

    return {
        "timeframe": tf,
        "direction": direction,
        "targetPrice": round(target_price, 2),
        "currentPrice": round(current_price, 2),
        "priceChange": round(target_price - current_price, 2),
        "priceChangePct": round(((target_price - current_price) / current_price) * 100, 2),
        "winRate": win_rate,
        "compositeWinRate": win_rate,
        "chanlunWinRate": round(kwargs.get("chanlun_raw", 0), 1) if "chanlun_raw" in kwargs else win_rate,
        "factorWinRate": round(kwargs.get("factor_raw", 0), 1) if "factor_raw" in kwargs else 0,
        "support": round(support, 2),
        "resistance": round(resistance, 2),
        "triggers": triggers,
        "confidence": "high" if win_rate >= 65 else ("medium" if win_rate >= 45 else "low"),
        "weightClass": WEIGHT_CLASSES.get(tf, "1H"),
    }


def _build_triggers(divergence, nearest_zs, current_price, indicators, funding_rate, direction) -> list[str]:
    """Build human-readable trigger descriptions."""
    triggers = []

    if divergence.get("top_div"):
        triggers.append("MACD顶背离检测到 - 看跌信号")
    if divergence.get("bottom_div"):
        triggers.append("MACD底背离检测到 - 看涨信号")

    if nearest_zs:
        if abs(current_price - nearest_zs["high"]) / current_price < 0.005:
            triggers.append("价格触及中枢上沿 - 突破/压力区")
        if abs(current_price - nearest_zs["low"]) / current_price < 0.005:
            triggers.append("价格触及中枢下沿 - 支撑测试")

    rsi = indicators.get("rsi")
    if rsi is not None:
        if rsi > 70:
            triggers.append(f"RSI超买 (>{round(rsi)})")
        elif rsi < 30:
            triggers.append(f"RSI超卖 (<{round(rsi)})")

    if funding_rate is not None and abs(funding_rate) > 0.0001:
        if funding_rate > 0.0001:
            triggers.append("资金费率偏高 - 多头挤压风险")
        elif funding_rate < -0.0001:
            triggers.append("资金费率转负 - 空头挤压风险")

    if not triggers:
        if direction == "up":
            triggers.append("上升通道内的趋势延续")
        elif direction == "down":
            triggers.append("下降通道内的趋势延续")
        else:
            triggers.append("中枢附近的区间震荡")

    return triggers
