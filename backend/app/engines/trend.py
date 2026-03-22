"""
Trend analysis — determine current market trend from Chanlun theory.
Direct port from chanlun.js analyzeTrend() with identical logic.
"""

from typing import Optional


def analyze_trend(
    bis: list[dict],
    zhongshu: list[dict],
    current_price: float,
) -> dict:
    """
    Determine current trend based on Chanlun theory:
    - position relative to last ZhongShu
    - direction of last Bi
    - overall strength score

    Returns:
        dict: {trend, strength, relative_to_zs, nearest_zs}
    """
    if not bis or len(bis) < 2:
        return {"trend": "neutral", "strength": 50, "relative_to_zs": None, "nearest_zs": None}

    last_bi = bis[-1]

    # Check position relative to most recent ZhongShu
    relative_to_zs = "inside"
    nearest_zs: Optional[dict] = None

    if zhongshu:
        nearest_zs = zhongshu[-1]
        if current_price > nearest_zs["high"]:
            relative_to_zs = "above"
        elif current_price < nearest_zs["low"]:
            relative_to_zs = "below"

    # Trend determination
    trend = "neutral"
    strength = 50

    if last_bi["type"] == "bottom" and current_price > last_bi["price"]:
        trend = "bullish"
        strength = 65
        if relative_to_zs == "above":
            strength = 75
    elif last_bi["type"] == "top" and current_price < last_bi["price"]:
        trend = "bearish"
        strength = 35
        if relative_to_zs == "below":
            strength = 25
    elif relative_to_zs == "inside":
        trend = "consolidating"
        strength = 50

    return {
        "trend": trend,
        "strength": strength,
        "relative_to_zs": relative_to_zs,
        "nearest_zs": nearest_zs,
    }
