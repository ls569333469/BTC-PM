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
    tf: str = "5m",
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
    factors.append(score_volume(volumes, closes))

    # 3. Bollinger Bands
    factors.append(score_bbands(closes))

    # 4. KDJ
    factors.append(score_kdj(highs, lows, closes))

    # 5. SAR
    factors.append(score_sar(highs, lows, closes))

    # 6. MFI
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
    
    # 核心映射升级 (P10)：
    # 本质分数仍然是 weighted_sum / (total_weight * 3) 的原始 [-1, +1] 范数。
    # 乘以 1.5 倍放大器，是为了将统计学上极难达到的极值放大，使得由于因子迟滞抵消而造成的 $\pm40$ 真实爆发点，
    # 能够有机地放大至 $\pm60$ 以完全匹配缠论 UI 的视觉强度体验框架。
    score = max(-1.0, min(1.0, (weighted_sum / (total_weight * 3)) * 1.5))

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

def score_volume(volumes: np.ndarray, closes: np.ndarray = None) -> FactorScore:
    if volumes is None or len(volumes) < 20:
        return FactorScore("volume", 0.0, 0.5, "neutral", "成交量数据不足")

    recent_avg = float(np.mean(volumes[-5:]))
    historical_avg = float(np.mean(volumes[-20:]))

    if historical_avg == 0:
        return FactorScore("volume", 0.0, 0.5, "neutral", "无成交量数据")

    # 获取价格趋势方向以赋予成交量正负极性 (放量下跌 = 恐慌 = 负分, 放量上涨 = 抢筹 = 正分)
    price_trend = 1
    if closes is not None and len(closes) >= 5:
        price_trend = 1 if closes[-1] >= closes[-5] else -1
    
    # 连续化体积函数 (以2为底的对数变化率)
    import math
    ratio = max(0.01, recent_avg / historical_avg)  # 防无限小
    raw_score = math.log2(ratio) * 1.5 * price_trend
    score = max(-3.0, min(3.0, raw_score))

    
    direction = "up" if score > 0.5 else ("down" if score < -0.5 else "neutral")
    return FactorScore("volume", round(score, 2), 0.5, direction, f"量能比 {ratio:.2f}x (对数分 {score:.2f})")


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

    # 连续化布林带函数 (0.5 为中轴，0 为下轨弱势(看跌)，1 为上轨强势(看涨))
    # 偏离度 = position - 0.5
    # 当打到下轨(0)时偏离度 -0.5 -> score = -3.0
    # 当打到上轨(1)时偏离度 +0.5 -> score = +3.0
    raw_score = (position - 0.5) / 0.5 * 3.0
    
    # 根据波动率(开口大小)进行动能放大
    if bandwidth > 0.08:
        raw_score *= 1.2  # 开口放大偏离极值
    elif bandwidth < 0.02:
        raw_score *= 0.5  # 缩口压制偏离极值
        
    score = max(-3.0, min(3.0, raw_score))
    direction = "up" if score > 1.0 else ("down" if score < -1.0 else "neutral")
    
    details = f"位置 {position:.0%} (带分 {score:.2f})"
    if bandwidth < 0.02: details += " [缩口]"
    elif bandwidth > 0.08: details += " [开口]"

    return FactorScore("bbands", round(score, 2), 0.6, direction, details)


# ── Factor 4: KDJ ──

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

    # 连续化 KDJ 动能函数 (J 均值 50)
    # J = 0 -> score -3.0 (极度弱势看跌)
    # J = 100 -> score 3.0 (极度强势看涨)
    raw_score = (j_val - 50.0) / 50.0 * 2.5
    
    # 金叉死叉动能附加
    if golden_cross:
        raw_score += 1.0
    elif death_cross:
        raw_score -= 1.0
        
    score = max(-3.0, min(3.0, raw_score))
    direction = "up" if score > 1.0 else ("down" if score < -1.0 else "neutral")
    
    status = "金叉" if golden_cross else ("死叉" if death_cross else "平稳")
    return FactorScore("kdj", round(score, 2), 0.7, direction, f"J={j_val:.0f} [{status}] (分 {score:.2f})")


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

    # 连续化 SAR 函数
    # gap_pct = (price - sar) / price * 100
    # 只要在上方 (gap_pct > 0)，就是上涨趋势。间距越大越稳。
    raw_score = gap_pct * 1.5  # 例如 2% 的偏离度 = 3.0 分满分
    
    if just_flipped:
        raw_score += 1.5 if curr_above else -1.5  # 翻转瞬间给极强的爆发分附加
        
    score = max(-3.0, min(3.0, raw_score))
    direction = "up" if score > 0.5 else ("down" if score < -0.5 else "neutral")
    
    status = "刚翻转" if just_flipped else "稳态"
    return FactorScore("sar", round(score, 2), 0.6, direction, f"SAR{status} 偏离{gap_pct:+.1f}% (分 {score:.2f})")


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

    # 连续化 MFI 动能函数 (50 为中轴)
    raw_score = (mfi_val - 50.0) / 50.0 * 3.0
    
    score = max(-3.0, min(3.0, raw_score))
    direction = "up" if score > 1.0 else ("down" if score < -1.0 else "neutral")
    
    return FactorScore("mfi", round(score, 2), 0.6, direction, f"MFI={mfi_val:.0f} [{trend}] (分 {score:.2f})")
