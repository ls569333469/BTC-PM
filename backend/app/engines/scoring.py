"""
6-Factor Scoring System — NEW enhancement for Python version.
Provides quantitative factor analysis alongside the Chanlun primary system.
"""

import numpy as np
from dataclasses import dataclass, asdict
from typing import Optional

try:
    import talib
    HAS_TALIB = True
except ImportError:
    HAS_TALIB = False


@dataclass
class FactorScore:
    factor: str
    score: float       # [-3, +3]  positive = bullish
    weight: float      # 0.0 - 1.0
    detail: str


def compute_all_factors(
    closes: np.ndarray,
    volumes: np.ndarray,
    highs: Optional[np.ndarray] = None,
    lows: Optional[np.ndarray] = None,
    funding_rate: Optional[float] = None,
    fear_greed: Optional[int] = None,
    divergence: Optional[dict] = None,
) -> list[dict]:
    """
    Compute all 6 factor scores.

    Returns:
        list of FactorScore dicts
    """
    factors = []

    # 1. MACD Divergence
    factors.append(score_macd_divergence(divergence))

    # 2. Volume
    factors.append(score_volume(volumes))

    # 3. Bollinger Bands
    factors.append(score_bbands(closes))

    # 4. Funding Rate
    factors.append(score_funding_rate(funding_rate))

    # 5. Sentiment (Fear & Greed)
    factors.append(score_sentiment(fear_greed))

    # 6. RSI
    factors.append(score_rsi(closes))

    return [asdict(f) for f in factors]


def compute_composite_score(factors: list[dict]) -> float:
    """Weighted average of all factor scores, normalized to [-1, +1]."""
    if not factors:
        return 0.0
    total_weight = sum(f["weight"] for f in factors)
    if total_weight == 0:
        return 0.0
    weighted_sum = sum(f["score"] * f["weight"] for f in factors)
    return max(-1.0, min(1.0, weighted_sum / (total_weight * 3)))


def score_macd_divergence(divergence: Optional[dict]) -> FactorScore:
    """Factor 1: MACD Divergence."""
    if not divergence:
        return FactorScore("macd_divergence", 0.0, 0.8, "No divergence data")

    if divergence.get("top_div"):
        return FactorScore("macd_divergence", -2.5, 0.8, "Bearish divergence — price high but MACD weakening")
    elif divergence.get("bottom_div"):
        return FactorScore("macd_divergence", 2.5, 0.8, "Bullish divergence — price low but MACD strengthening")
    return FactorScore("macd_divergence", 0.0, 0.8, "No divergence detected")


def score_volume(volumes: np.ndarray) -> FactorScore:
    """Factor 2: Volume trend analysis."""
    if volumes is None or len(volumes) < 20:
        return FactorScore("volume", 0.0, 0.5, "Insufficient volume data")

    recent_avg = float(np.mean(volumes[-5:]))
    historical_avg = float(np.mean(volumes[-20:]))

    if historical_avg == 0:
        return FactorScore("volume", 0.0, 0.5, "No volume data")

    ratio = recent_avg / historical_avg

    if ratio > 2.0:
        return FactorScore("volume", 2.0, 0.5, f"Volume surge {ratio:.1f}x — strong momentum")
    elif ratio > 1.3:
        return FactorScore("volume", 1.0, 0.5, f"Above-average volume {ratio:.1f}x")
    elif ratio < 0.5:
        return FactorScore("volume", -1.0, 0.5, f"Low volume {ratio:.1f}x — weak conviction")
    return FactorScore("volume", 0.0, 0.5, f"Normal volume {ratio:.1f}x")


def score_bbands(closes: np.ndarray) -> FactorScore:
    """Factor 3: Bollinger Bands position + bandwidth."""
    if not HAS_TALIB or closes is None or len(closes) < 20:
        return FactorScore("bbands", 0.0, 0.6, "Cannot compute BBands")

    upper, middle, lower = talib.BBANDS(closes, timeperiod=20)

    if np.isnan(upper[-1]) or np.isnan(lower[-1]):
        return FactorScore("bbands", 0.0, 0.6, "BBands NaN")

    price = closes[-1]
    bandwidth = (upper[-1] - lower[-1]) / middle[-1] if middle[-1] > 0 else 0
    position = (price - lower[-1]) / (upper[-1] - lower[-1]) if (upper[-1] - lower[-1]) > 0 else 0.5

    score = 0.0
    details = []

    # Position scoring
    if position > 0.95:
        score -= 2.0
        details.append(f"Price at upper band ({position:.0%})")
    elif position > 0.8:
        score -= 1.0
        details.append(f"Price near upper band ({position:.0%})")
    elif position < 0.05:
        score += 2.0
        details.append(f"Price at lower band ({position:.0%})")
    elif position < 0.2:
        score += 1.0
        details.append(f"Price near lower band ({position:.0%})")
    else:
        details.append(f"Price mid-band ({position:.0%})")

    # Bandwidth context
    if bandwidth < 0.02:
        details.append("Squeeze — breakout imminent")
    elif bandwidth > 0.08:
        details.append("Wide bands — high volatility")

    return FactorScore("bbands", score, 0.6, "; ".join(details))


def score_funding_rate(funding_rate: Optional[float]) -> FactorScore:
    """Factor 4: Funding rate (contrarian)."""
    if funding_rate is None:
        return FactorScore("funding_rate", 0.0, 0.7, "No funding rate data")

    if funding_rate > 0.0003:
        return FactorScore("funding_rate", -2.5, 0.7, f"FR={funding_rate:.4%} — Over-leveraged longs, squeeze risk")
    elif funding_rate > 0.0001:
        return FactorScore("funding_rate", -1.0, 0.7, f"FR={funding_rate:.4%} — Moderately long-biased")
    elif funding_rate < -0.0003:
        return FactorScore("funding_rate", 2.5, 0.7, f"FR={funding_rate:.4%} — Over-leveraged shorts, squeeze risk")
    elif funding_rate < -0.0001:
        return FactorScore("funding_rate", 1.0, 0.7, f"FR={funding_rate:.4%} — Moderately short-biased")
    return FactorScore("funding_rate", 0.0, 0.7, f"FR={funding_rate:.4%} — Neutral")


def score_sentiment(fear_greed: Optional[int]) -> FactorScore:
    """Factor 5: Fear & Greed Index (contrarian)."""
    if fear_greed is None:
        return FactorScore("sentiment", 0.0, 0.5, "No F&G data")

    if fear_greed >= 80:
        return FactorScore("sentiment", -2.0, 0.5, f"F&G={fear_greed} Extreme Greed — contrarian bearish")
    elif fear_greed >= 60:
        return FactorScore("sentiment", -0.5, 0.5, f"F&G={fear_greed} Greed")
    elif fear_greed <= 20:
        return FactorScore("sentiment", 2.0, 0.5, f"F&G={fear_greed} Extreme Fear — contrarian bullish")
    elif fear_greed <= 40:
        return FactorScore("sentiment", 0.5, 0.5, f"F&G={fear_greed} Fear")
    return FactorScore("sentiment", 0.0, 0.5, f"F&G={fear_greed} Neutral")


def score_rsi(closes: np.ndarray) -> FactorScore:
    """Factor 6: RSI overbought/oversold."""
    if not HAS_TALIB or closes is None or len(closes) < 14:
        return FactorScore("rsi", 0.0, 0.7, "Cannot compute RSI")

    rsi = talib.RSI(closes, timeperiod=14)
    current_rsi = float(rsi[-1])

    if np.isnan(current_rsi):
        return FactorScore("rsi", 0.0, 0.7, "RSI NaN")

    if current_rsi > 80:
        return FactorScore("rsi", -2.5, 0.7, f"RSI={current_rsi:.1f} — Extremely overbought")
    elif current_rsi > 70:
        return FactorScore("rsi", -1.5, 0.7, f"RSI={current_rsi:.1f} — Overbought")
    elif current_rsi < 20:
        return FactorScore("rsi", 2.5, 0.7, f"RSI={current_rsi:.1f} — Extremely oversold")
    elif current_rsi < 30:
        return FactorScore("rsi", 1.5, 0.7, f"RSI={current_rsi:.1f} — Oversold")
    return FactorScore("rsi", 0.0, 0.7, f"RSI={current_rsi:.1f} — Neutral")
