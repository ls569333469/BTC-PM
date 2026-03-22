"""
Bi (笔) detection — finding local tops and bottoms from kline data.
Direct port from chanlun.js findBi() with identical logic.
"""

import pandas as pd
from typing import Optional


def find_bi(klines: list[dict]) -> list[dict]:
    """
    Detect Bi (strokes) from kline data by finding alternating
    local tops and bottoms using a 5-bar window.

    Args:
        klines: list of dicts with keys: high, low, close/price, timestamp

    Returns:
        list of BiPoint dicts: {type, price, index, time}
    """
    if not klines or len(klines) < 5:
        return []

    # Step 1: find all local extrema in a 5-bar window
    points: list[dict] = []

    for i in range(2, len(klines) - 2):
        highs = [
            _get_high(klines[i - 2]),
            _get_high(klines[i - 1]),
            _get_high(klines[i]),
            _get_high(klines[i + 1]),
            _get_high(klines[i + 2]),
        ]
        lows = [
            _get_low(klines[i - 2]),
            _get_low(klines[i - 1]),
            _get_low(klines[i]),
            _get_low(klines[i + 1]),
            _get_low(klines[i + 2]),
        ]

        # Local top: center bar high >= all neighbors
        if highs[2] >= highs[0] and highs[2] >= highs[1] and highs[2] >= highs[3] and highs[2] >= highs[4]:
            points.append({
                "type": "top",
                "price": highs[2],
                "index": i,
                "time": _get_time(klines[i]),
            })

        # Local bottom: center bar low <= all neighbors
        if lows[2] <= lows[0] and lows[2] <= lows[1] and lows[2] <= lows[3] and lows[2] <= lows[4]:
            points.append({
                "type": "bottom",
                "price": lows[2],
                "index": i,
                "time": _get_time(klines[i]),
            })

    # Step 2: enforce alternating top-bottom sequence
    bis: list[dict] = []
    last_type: Optional[str] = None

    for p in points:
        if last_type == p["type"]:
            # Same type consecutive — keep the more extreme one
            last = bis[-1]
            if p["type"] == "top" and p["price"] > last["price"]:
                bis[-1] = p
            elif p["type"] == "bottom" and p["price"] < last["price"]:
                bis[-1] = p
        else:
            bis.append(p)
            last_type = p["type"]

    return bis


# ── helpers ──

def _get_high(k: dict) -> float:
    return float(k.get("high") or k.get("price") or k.get("close") or k.get("value") or 0)


def _get_low(k: dict) -> float:
    return float(k.get("low") or k.get("price") or k.get("close") or k.get("value") or 0)


def _get_time(k: dict) -> str:
    return str(k.get("timestamp") or k.get("time") or k.get("date") or "")
