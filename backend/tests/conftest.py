"""
Test configuration and shared fixtures.
"""

import sys
import os
import pytest
import numpy as np

# Ensure backend app is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


# ── Mock K-line data ──

def _make_kline(high: float, low: float, close: float, volume: float = 1000, ts: int = 0) -> dict:
    return {"high": high, "low": low, "close": close, "price": close, "volume": volume, "timestamp": ts}


@pytest.fixture
def uptrend_klines():
    """Klines that form a clear uptrend (ascending highs & lows)."""
    base = 70000
    klines = []
    for i in range(30):
        noise = (i % 3 - 1) * 50  # small oscillation
        h = base + i * 30 + 80 + noise
        l = base + i * 30 - 20 + noise
        c = base + i * 30 + 40 + noise
        klines.append(_make_kline(h, l, c, volume=1000 + i * 10, ts=i * 3600000))
    return klines


@pytest.fixture
def downtrend_klines():
    """Klines that form a clear downtrend (descending highs & lows)."""
    base = 72000
    klines = []
    for i in range(30):
        noise = (i % 3 - 1) * 50
        h = base - i * 30 + 80 + noise
        l = base - i * 30 - 20 + noise
        c = base - i * 30 + 40 + noise
        klines.append(_make_kline(h, l, c, volume=1000 + i * 10, ts=i * 3600000))
    return klines


@pytest.fixture
def oscillating_klines():
    """Klines that oscillate up and down — should produce clear Bi points."""
    klines = []
    for i in range(40):
        phase = i % 10
        if phase < 5:
            # Rising
            h = 70000 + phase * 100 + 50
            l = 70000 + phase * 100 - 50
        else:
            # Falling
            h = 70500 - (phase - 5) * 100 + 50
            l = 70500 - (phase - 5) * 100 - 50
        c = (h + l) / 2
        klines.append(_make_kline(h, l, c, volume=1000, ts=i * 3600000))
    return klines


@pytest.fixture
def closes_array():
    """Numpy array of 50 close prices — sufficient for TA-Lib indicators."""
    base = 70000
    return np.array([base + i * 10 + (i % 5 - 2) * 30 for i in range(50)], dtype=float)


@pytest.fixture
def volumes_array():
    """Numpy array of 50 volume values."""
    return np.array([1000 + i * 20 for i in range(50)], dtype=float)
