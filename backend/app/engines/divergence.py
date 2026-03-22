"""
Divergence detection — MACD vs price divergence.
Python upgrade: uses TA-Lib for MACD instead of external API.
"""

import numpy as np
from typing import Optional

try:
    import talib
    HAS_TALIB = True
except ImportError:
    HAS_TALIB = False


def detect_divergence(
    bis: list[dict],
    closes: Optional[np.ndarray] = None,
    macd_hist: Optional[np.ndarray] = None,
) -> dict:
    """
    Detect top/bottom divergence between price and MACD histogram.

    Args:
        bis: Bi points from find_bi()
        closes: numpy array of close prices (for TA-Lib MACD calculation)
        macd_hist: pre-computed MACD histogram (if closes not provided)

    Returns:
        dict: {top_div: bool, bottom_div: bool, details: str}
    """
    if not bis or len(bis) < 4:
        return {"top_div": False, "bottom_div": False, "details": "Insufficient Bi points"}

    # Calculate MACD histogram from closes if available
    if closes is not None and len(closes) > 26 and HAS_TALIB:
        _, _, macd_hist = talib.MACD(closes, fastperiod=12, slowperiod=26, signalperiod=9)
    elif macd_hist is None:
        return {"top_div": False, "bottom_div": False, "details": "No MACD data"}

    tops = [b for b in bis if b["type"] == "top"]
    bottoms = [b for b in bis if b["type"] == "bottom"]

    top_div = False
    bottom_div = False
    details = []

    # Check last two tops for bearish divergence
    if len(tops) >= 2:
        t1, t2 = tops[-2], tops[-1]
        if t2["price"] > t1["price"]:
            m1 = _get_macd_at(macd_hist, t1["index"])
            m2 = _get_macd_at(macd_hist, t2["index"])
            if m1 is not None and m2 is not None and m2 < m1:
                top_div = True
                details.append("MACD top divergence detected - bearish signal")

    # Check last two bottoms for bullish divergence
    if len(bottoms) >= 2:
        b1, b2 = bottoms[-2], bottoms[-1]
        if b2["price"] < b1["price"]:
            m1 = _get_macd_at(macd_hist, b1["index"])
            m2 = _get_macd_at(macd_hist, b2["index"])
            if m1 is not None and m2 is not None and m2 > m1:
                bottom_div = True
                details.append("MACD bottom divergence detected - bullish signal")

    return {
        "top_div": top_div,
        "bottom_div": bottom_div,
        "topDiv": top_div,
        "bottomDiv": bottom_div,
        "details": "; ".join(details) if details else "No divergence",
    }


def _get_macd_at(macd_hist: np.ndarray, index: int) -> Optional[float]:
    """Get MACD histogram value at a given kline index."""
    if macd_hist is None or len(macd_hist) == 0:
        return None
    idx = min(index, len(macd_hist) - 1)
    idx = max(0, idx)
    val = macd_hist[idx]
    return float(val) if not np.isnan(val) else None
