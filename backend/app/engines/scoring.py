"""
6-Factor Scoring System — quantitative factor analysis alongside Chanlun.

Factors:
  1. MACD背驰  (momentum/divergence)
  2. 成交量趋势 (volume)
  3. 布林带    (volatility)
  4. KDJ      (ultra-fast overbought/oversold) — 替换RSI
  5. SAR      (trend direction)              — 替换恐惧贪婪
  6. MFI      (money flow / volume-price)    — 替换资金费率
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
    direction: str     # "up", "down", "neutral"
    detail: str


def compute_all_factors(
    closes: np.ndarray,
    volumes: np.ndarray,
    highs: Optional[np.ndarray] = None,
    lows: Optional[np.ndarray] = None,
    divergence: Optional[dict] = None,
    **kwargs,
) -> list[dict]:
    """
    Compute all 6 factor scores.
    All factors are computed from K-line data (no external API needed).
    """
    factors = []

    # 1. MACD Divergence
    factors.append(score_macd_divergence(divergence))

    # 2. Volume
    factors.append(score_volume(volumes))

    # 3. Bollinger Bands
    factors.append(score_bbands(closes))

    # 4. KDJ (替换RSI)
    factors.append(score_kdj(highs, lows, closes))

    # 5. SAR (替换恐惧贪婪)
    factors.append(score_sar(highs, lows, closes))

    # 6. MFI (替换资金费率)
    factors.append(score_mfi(highs, lows, closes, volumes))

    return [asdict(f) for f in factors]


def compute_composite_score(factors: list[dict]) -> tuple[float, str]:
    """
    Weighted average of all factor scores, normalized to [-1, +1].
    Also returns the consensus direction.

    Returns:
        (score, direction) where score is [-1, +1] and direction is "up"/"down"/"neutral"
    """
    if not factors:
        return 0.0, "neutral"
    total_weight = sum(f["weight"] for f in factors)
    if total_weight == 0:
        return 0.0, "neutral"
    weighted_sum = sum(f["score"] * f["weight"] for f in factors)
    score = max(-1.0, min(1.0, weighted_sum / (total_weight * 3)))

    # Direction from composite score
    if score > 0.1:
        direction = "up"
    elif score < -0.1:
        direction = "down"
    else:
        direction = "neutral"

    return score, direction


# ── Factor 1: MACD Divergence ──

def score_macd_divergence(divergence: Optional[dict]) -> FactorScore:
    if not divergence:
        return FactorScore("macd_divergence", 0.0, 0.8, "neutral", "无背驰数据")

    if divergence.get("top_div"):
        return FactorScore("macd_divergence", -2.5, 0.8, "down", "顶背驰 — 价格新高但MACD减弱")
    elif divergence.get("bottom_div"):
        return FactorScore("macd_divergence", 2.5, 0.8, "up", "底背驰 — 价格新低但MACD增强")
    return FactorScore("macd_divergence", 0.0, 0.8, "neutral", "无背驰")


# ── Factor 2: Volume ──

def score_volume(volumes: np.ndarray) -> FactorScore:
    if volumes is None or len(volumes) < 20:
        return FactorScore("volume", 0.0, 0.5, "neutral", "成交量数据不足")

    recent_avg = float(np.mean(volumes[-5:]))
    historical_avg = float(np.mean(volumes[-20:]))

    if historical_avg == 0:
        return FactorScore("volume", 0.0, 0.5, "neutral", "无成交量数据")

    ratio = recent_avg / historical_avg

    if ratio > 2.0:
        return FactorScore("volume", 2.0, 0.5, "up", f"放量{ratio:.1f}倍 — 强势动量")
    elif ratio > 1.3:
        return FactorScore("volume", 1.0, 0.5, "up", f"温和放量{ratio:.1f}倍")
    elif ratio < 0.5:
        return FactorScore("volume", -1.0, 0.5, "down", f"缩量{ratio:.1f}倍 — 信心不足")
    return FactorScore("volume", 0.0, 0.5, "neutral", f"正常量能{ratio:.1f}倍")


# ── Factor 3: Bollinger Bands ──

def score_bbands(closes: np.ndarray) -> FactorScore:
    if not HAS_TALIB or closes is None or len(closes) < 20:
        return FactorScore("bbands", 0.0, 0.6, "neutral", "无法计算布林带")

    upper, middle, lower = talib.BBANDS(closes, timeperiod=20)

    if np.isnan(upper[-1]) or np.isnan(lower[-1]):
        return FactorScore("bbands", 0.0, 0.6, "neutral", "布林带NaN")

    price = closes[-1]
    bandwidth = (upper[-1] - lower[-1]) / middle[-1] if middle[-1] > 0 else 0
    position = (price - lower[-1]) / (upper[-1] - lower[-1]) if (upper[-1] - lower[-1]) > 0 else 0.5

    score = 0.0
    direction = "neutral"
    details = []

    if position > 0.95:
        score = -2.0
        direction = "down"
        details.append(f"触及上轨({position:.0%})")
    elif position > 0.8:
        score = -1.0
        direction = "down"
        details.append(f"接近上轨({position:.0%})")
    elif position < 0.05:
        score = 2.0
        direction = "up"
        details.append(f"触及下轨({position:.0%})")
    elif position < 0.2:
        score = 1.0
        direction = "up"
        details.append(f"接近下轨({position:.0%})")
    else:
        details.append(f"中轨附近({position:.0%})")

    if bandwidth < 0.02:
        details.append("缩口 — 即将突破")
    elif bandwidth > 0.08:
        details.append("开口 — 高波动")

    return FactorScore("bbands", score, 0.6, direction, "；".join(details))


# ── Factor 4: KDJ (替换RSI) ──

def score_kdj(highs: np.ndarray, lows: np.ndarray, closes: np.ndarray) -> FactorScore:
    """KDJ (9,3,3) — J线灵敏度是RSI的4倍，短线之王。"""
    if not HAS_TALIB or highs is None or lows is None or closes is None or len(closes) < 14:
        return FactorScore("kdj", 0.0, 0.7, "neutral", "无法计算KDJ")

    K, D = talib.STOCH(highs, lows, closes,
                       fastk_period=9, slowk_period=3, slowk_matype=0,
                       slowd_period=3, slowd_matype=0)
    J = 3 * K - 2 * D

    j_val = float(J[-1])
    k_val = float(K[-1])

    if np.isnan(j_val):
        return FactorScore("kdj", 0.0, 0.7, "neutral", "KDJ NaN")

    # J线金叉/死叉判断
    j_prev = float(J[-2]) if len(J) > 1 and not np.isnan(J[-2]) else j_val
    k_prev = float(K[-2]) if len(K) > 1 and not np.isnan(K[-2]) else k_val
    golden_cross = j_prev < k_prev and j_val > k_val  # J上穿K
    death_cross = j_prev > k_prev and j_val < k_val   # J下穿K

    if j_val > 90:
        return FactorScore("kdj", -2.5, 0.7, "down", f"J={j_val:.0f} 极度超买")
    elif j_val > 80:
        if death_cross:
            return FactorScore("kdj", -2.0, 0.7, "down", f"J={j_val:.0f} 超买+死叉 — 强卖出信号")
        return FactorScore("kdj", -1.5, 0.7, "down", f"J={j_val:.0f} 超买")
    elif j_val < 10:
        return FactorScore("kdj", 2.5, 0.7, "up", f"J={j_val:.0f} 极度超卖")
    elif j_val < 20:
        if golden_cross:
            return FactorScore("kdj", 2.0, 0.7, "up", f"J={j_val:.0f} 超卖+金叉 — 强买入信号")
        return FactorScore("kdj", 1.5, 0.7, "up", f"J={j_val:.0f} 超卖")
    else:
        if golden_cross:
            return FactorScore("kdj", 1.0, 0.7, "up", f"J={j_val:.0f} 金叉")
        elif death_cross:
            return FactorScore("kdj", -1.0, 0.7, "down", f"J={j_val:.0f} 死叉")
        return FactorScore("kdj", 0.0, 0.7, "neutral", f"J={j_val:.0f} K={k_val:.0f} 中性")


# ── Factor 5: SAR (替换恐惧贪婪) ──

def score_sar(highs: np.ndarray, lows: np.ndarray, closes: np.ndarray) -> FactorScore:
    """SAR抛物线转向 — 动态趋势线，翻转即信号。"""
    if not HAS_TALIB or highs is None or lows is None or len(closes) < 14:
        return FactorScore("sar", 0.0, 0.6, "neutral", "无法计算SAR")

    sar = talib.SAR(highs, lows, acceleration=0.02, maximum=0.2)

    if np.isnan(sar[-1]):
        return FactorScore("sar", 0.0, 0.6, "neutral", "SAR NaN")

    price = closes[-1]
    sar_val = float(sar[-1])
    gap_pct = (price - sar_val) / price * 100

    # 检测翻转
    prev_above = closes[-2] > sar[-2] if len(sar) > 1 and not np.isnan(sar[-2]) else None
    curr_above = price > sar_val
    just_flipped = prev_above is not None and prev_above != curr_above

    if curr_above:
        # 价格在SAR上方 = 上升趋势
        if just_flipped:
            return FactorScore("sar", 2.5, 0.6, "up", f"SAR刚翻多 — 趋势反转看涨 (偏离{gap_pct:+.1f}%)")
        elif gap_pct > 1.5:
            return FactorScore("sar", 2.0, 0.6, "up", f"SAR稳定看涨 (偏离{gap_pct:+.1f}%)")
        else:
            return FactorScore("sar", 1.0, 0.6, "up", f"SAR看涨但接近 (偏离{gap_pct:+.1f}%)")
    else:
        # 价格在SAR下方 = 下降趋势
        if just_flipped:
            return FactorScore("sar", -2.5, 0.6, "down", f"SAR刚翻空 — 趋势反转看跌 (偏离{gap_pct:+.1f}%)")
        elif gap_pct < -1.5:
            return FactorScore("sar", -2.0, 0.6, "down", f"SAR稳定看跌 (偏离{gap_pct:+.1f}%)")
        else:
            return FactorScore("sar", -1.0, 0.6, "down", f"SAR看跌但接近 (偏离{gap_pct:+.1f}%)")


# ── Factor 6: MFI (替换资金费率) ──

def score_mfi(highs: np.ndarray, lows: np.ndarray, closes: np.ndarray, volumes: np.ndarray) -> FactorScore:
    """MFI资金流量指数 — 综合量价的RSI，实时反映资金进出。"""
    if not HAS_TALIB or highs is None or lows is None or volumes is None or len(closes) < 14:
        return FactorScore("mfi", 0.0, 0.6, "neutral", "无法计算MFI")

    # 确保 volumes 是 float64
    vols = volumes.astype(np.float64) if volumes.dtype != np.float64 else volumes
    mfi = talib.MFI(highs, lows, closes, vols, timeperiod=14)

    mfi_val = float(mfi[-1])
    if np.isnan(mfi_val):
        return FactorScore("mfi", 0.0, 0.6, "neutral", "MFI NaN")

    # MFI趋势判断 (最近3根变化)
    mfi_prev = float(mfi[-3]) if len(mfi) > 2 and not np.isnan(mfi[-3]) else mfi_val
    trend = "上升" if mfi_val > mfi_prev + 5 else ("下降" if mfi_val < mfi_prev - 5 else "平稳")

    if mfi_val > 85:
        return FactorScore("mfi", -2.5, 0.6, "down", f"MFI={mfi_val:.0f} 资金过热 — 可能回调 ({trend})")
    elif mfi_val > 70:
        return FactorScore("mfi", -1.0, 0.6, "down", f"MFI={mfi_val:.0f} 偏多 ({trend})")
    elif mfi_val < 15:
        return FactorScore("mfi", 2.5, 0.6, "up", f"MFI={mfi_val:.0f} 资金枯竭 — 可能反弹 ({trend})")
    elif mfi_val < 30:
        return FactorScore("mfi", 1.0, 0.6, "up", f"MFI={mfi_val:.0f} 偏空 ({trend})")
    return FactorScore("mfi", 0.0, 0.6, "neutral", f"MFI={mfi_val:.0f} 均衡 ({trend})")
