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


MULTIPLIERS = {"5m": 0.5, "15m": 0.75, "30m": 1, "1h": 1.5, "2h": 1.5, "4h": 1.5, "12h": 1.5, "1d": 1.5}
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
            # Rebound: Target maps exactly to the structural roof, safeguard for positive gain
            target_price = max(current_price + (base_move * 0.2), resistance - (base_move * 0.1))
    elif direction == "down":
        if raw_score <= -60:
            # Strong Breakdown: Target punches through structural floor
            target_price = support - (base_move * 0.3)
        else:
            # Retracement: Target maps exactly to the structural floor, safeguard for negative gain
            target_price = min(current_price - (base_move * 0.2), support + (base_move * 0.1))
    else:
        # Sideways: Mean reversion towards the Chanlun center of gravity
        if nearest_zs and is_center_in_range:
            target_price = nearest_zs.get("center", current_price)
        else:
            target_price = current_price + (base_move * dir_modifier * 0.3)


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
        "triggers": [],
        "confidence": "high" if win_rate >= 65 else ("medium" if win_rate >= 45 else "low"),
        "weightClass": WEIGHT_CLASSES.get(tf, "1H"),
    }

