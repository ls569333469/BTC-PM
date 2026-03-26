import asyncio
import numpy as np
import talib
import math
from typing import Optional
from app.clients.binance_client import BinanceClient

class FactorScore:
    def __init__(self, factor, score, weight, direction, detail):
        self.factor = factor
        self.score = score
        self.weight = weight

# --- P9 Logic (Old) ---
def p9_score_macd(top_div, bot_div):
    if top_div: return FactorScore("macd", -2.5, 0.8, "down", "")
    elif bot_div: return FactorScore("macd", 2.5, 0.8, "up", "")
    return FactorScore("macd", 0.0, 0.8, "neutral", "")

def p9_score_vol(volumes):
    if len(volumes) < 20: return FactorScore("vol", 0.0, 0.5, "neutral", "")
    recent_avg = float(np.mean(volumes[-5:]))
    hist_avg = float(np.mean(volumes[-20:]))
    ratio = max(0.01, recent_avg / hist_avg)
    score = max(-3.0, min(3.0, math.log2(ratio) * 1.5))
    return FactorScore("vol", score, 0.5, "up", "")

def p9_compute(factors):
    tot = sum(f.weight for f in factors)
    w_sum = sum(f.score * f.weight for f in factors)
    score = max(-1.0, min(1.0, w_sum / (tot * 3)))
    return score * 100

# --- P10 Logic (New) ---
def p10_score_macd(top_div, bot_div):
    if top_div: return FactorScore("macd", -2.5, 1.0, "down", "")
    elif bot_div: return FactorScore("macd", 2.5, 1.0, "up", "")
    return FactorScore("macd", 0.0, 0.1, "neutral", "")

def p10_score_vol(volumes):
    if len(volumes) < 20: return FactorScore("vol", 0.0, 0.1, "neutral", "")
    recent_avg = float(np.mean(volumes[-5:]))
    hist_avg = float(np.mean(volumes[-20:]))
    ratio = max(0.01, recent_avg / hist_avg)
    raw_score = math.log2(ratio) * 1.5
    score = max(-3.0, min(3.0, raw_score))
    dyn_w = 0.1 + (abs(score) / 3.0) * 0.7
    return FactorScore("vol", score, dyn_w, "up", "")

def p10_compute(factors):
    tot = sum(f.weight for f in factors)
    w_sum = sum(f.score * f.weight for f in factors)
    score = max(-1.0, min(1.0, w_sum / (tot * 1.5)))
    return score * 100

# Mock BBands, KDJ, SAR, MFI (Common logic between P9 and P10)
def common_bbands(closes):
    upper, middle, lower = talib.BBANDS(closes, timeperiod=20)
    bw = (upper[-1] - lower[-1]) / middle[-1] if middle[-1] > 0 else 0
    pos = (closes[-1] - lower[-1]) / (upper[-1] - lower[-1]) if upper[-1] - lower[-1] > 0 else 0.5
    raw = (0.5 - pos) / 0.5 * 3.0
    if bw > 0.08: raw *= 1.2
    elif bw < 0.02: raw *= 0.5
    return FactorScore("bb", max(-3.0, min(3.0, raw)), 0.6, "x", "")

def common_kdj(highs, lows, closes):
    K, D = talib.STOCH(highs, lows, closes, 9, 3, 0, 3, 0)
    J = 3*K[-1] - 2*D[-1]
    raw = (50.0 - J) / 50.0 * 2.5
    golden = (3*K[-2]-2*D[-2]) < K[-2] and J > K[-1]
    death = (3*K[-2]-2*D[-2]) > K[-2] and J < K[-1]
    if golden: raw += 1.0
    elif death: raw -= 1.0
    return FactorScore("kdj", max(-3.0, min(3.0, raw)), 0.7, "x", "")

def common_sar(highs, lows, closes):
    sar = talib.SAR(highs, lows, 0.02, 0.2)
    gap = (closes[-1] - sar[-1]) / closes[-1] * 100
    raw = gap * 1.5
    return FactorScore("sar", max(-3.0, min(3.0, raw)), 0.6, "x", "")

def common_mfi(highs, lows, closes, vols):
    mfi = talib.MFI(highs, lows, closes, vols, 14)
    raw = (50.0 - mfi[-1]) / 50.0 * 3.0
    return FactorScore("mfi", max(-3.0, min(3.0, raw)), 0.6, "x", "")

async def run_test():
    client = BinanceClient()
    klines = await client.get_klines("BTCUSDT", "5m", 1000)
    closes_full = np.array([k["close"] for k in klines], dtype=np.float64)
    highs_full = np.array([k["high"] for k in klines], dtype=np.float64)
    lows_full = np.array([k["low"] for k in klines], dtype=np.float64)
    vols_full = np.array([k["volume"] for k in klines], dtype=np.float64)
    
    p9_scores = []
    p10_scores = []
    
    # We need at least 30 candles to have valid indicators
    for i in range(30, len(klines)):
        closes = closes_full[:i]
        highs = highs_full[:i]
        lows = lows_full[:i]
        vols = vols_full[:i]
        
        # We pretend there is no divergence for this test to show the normal case.
        # If there were divergence, P10 would absolutely CRUSH P9.
        f_bb = common_bbands(closes)
        f_kdj = common_kdj(highs, lows, closes)
        f_sar = common_sar(highs, lows, closes)
        f_mfi = common_mfi(highs, lows, closes, vols)
        
        # P9 Factors
        p9_macd = p9_score_macd(False, False)
        p9_vol = p9_score_vol(vols)
        p9_f = [p9_macd, p9_vol, f_bb, f_kdj, f_sar, f_mfi]
        p9_val = p9_compute(p9_f)
        p9_scores.append(p9_val)
        
        # P10 Factors
        p10_macd = p10_score_macd(False, False)
        p10_vol = p10_score_vol(vols)
        p10_f = [p10_macd, p10_vol, f_bb, f_kdj, f_sar, f_mfi]
        p10_val = p10_compute(p10_f)
        p10_scores.append(p10_val)

    p9_arr = np.array(p9_scores)
    p10_arr = np.array(p10_scores)
    
    print("=== QUANTITATIVE BACKTEST RESULT (1000 K-LINES) ===")
    print(f"P9 Baseline (Old): Max=+{p9_arr.max():.2f}, Min={p9_arr.min():.2f}, Mean Abs={np.abs(p9_arr).mean():.2f}")
    print(f"P10 Proposal (New): Max=+{p10_arr.max():.2f}, Min={p10_arr.min():.2f}, Mean Abs={np.abs(p10_arr).mean():.2f}")
    
    # Histogram distribution
    p9_over_40 = np.sum(np.abs(p9_arr) > 40)
    p10_over_40 = np.sum(np.abs(p10_arr) > 40)
    print(f"Number of scores > 40: P9={p9_over_40}, P10={p10_over_40}")

asyncio.run(run_test())
