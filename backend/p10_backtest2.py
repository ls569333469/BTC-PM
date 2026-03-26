import asyncio
import numpy as np
import time

from app.clients.binance_client import BinanceClient
from app.engines.scoring import (
    score_macd_divergence,
    score_volume,
    score_bbands,
    score_kdj,
    score_sar,
    score_mfi,
    FactorScore
)

# For P10, we override the default logic manually for Vol and MACD:
import math

def p10_compute(factors):
    tot = sum(f.weight for f in factors)
    w_sum = sum(f.score * f.weight for f in factors)
    if tot == 0: return 0.0
    score = max(-1.0, min(1.0, w_sum / (tot * 1.5)))
    return score * 100

def p9_compute(factors):
    tot = sum(f.weight for f in factors)
    w_sum = sum(f.score * f.weight for f in factors)
    if tot == 0: return 0.0
    score = max(-1.0, min(1.0, w_sum / (tot * 3.0)))
    return score * 100

async def run_test():
    client = BinanceClient()
    print("Fetching 1000 candles...")
    klines = await client.get_klines("BTCUSDT", "5m", 1000)
    
    closes_full = np.array([k["close"] for k in klines], dtype=np.float64)
    highs_full = np.array([k["high"] for k in klines], dtype=np.float64)
    lows_full = np.array([k["low"] for k in klines], dtype=np.float64)
    vols_full = np.array([k["volume"] for k in klines], dtype=np.float64)
    
    p9_scores = []
    p10_scores = []
    
    print("Running backtest calculation...")
    for i in range(50, len(klines)):
        closes = closes_full[:i]
        highs = highs_full[:i]
        lows = lows_full[:i]
        vols = vols_full[:i]
        
        # P9 Factor array (Using baseline code which was restored)
        f_macd_p9 = score_macd_divergence(None) # Always 0.0, weight 0.8
        f_vol_p9 = score_volume(vols)           # Weight 0.5
        f_bb = score_bbands(closes)             # Weight 0.6
        f_kdj = score_kdj(highs, lows, closes)  # Weight 0.7
        f_sar = score_sar(highs, lows, closes)  # Weight 0.6
        f_mfi = score_mfi(highs, lows, closes, vols) # Weight 0.6
        
        p9_f = [f_macd_p9, f_vol_p9, f_bb, f_kdj, f_sar, f_mfi]
        p9_val = p9_compute(p9_f)
        p9_scores.append(p9_val)
        
        # P10 specific overrides
        f_macd_p10 = FactorScore("macd", 0.0, 0.1, "neutral", "无背驰")
        f_vol_p10 = FactorScore("vol", f_vol_p9.score, round(0.1 + (abs(f_vol_p9.score)/3.0)*0.7, 2), f_vol_p9.direction, "")
        
        p10_f = [f_macd_p10, f_vol_p10, f_bb, f_kdj, f_sar, f_mfi]
        p10_val = p10_compute(p10_f)
        p10_scores.append(p10_val)

    p9_arr = np.array(p9_scores)
    p10_arr = np.array(p10_scores)
    
    print("=== QUANTITATIVE BACKTEST RESULT (1000 K-LINES) ===")
    print(f"P9 Baseline (Old): Max=+{p9_arr.max():.2f}, Min={p9_arr.min():.2f}, Mean Abs={np.abs(p9_arr).mean():.2f}")
    print(f"P10 Proposal (New): Max=+{p10_arr.max():.2f}, Min={p10_arr.min():.2f}, Mean Abs={np.abs(p10_arr).mean():.2f}")
    
    p9_over_40 = np.sum(np.abs(p9_arr) >= 40)
    p10_over_40 = np.sum(np.abs(p10_arr) >= 40)
    p10_over_60 = np.sum(np.abs(p10_arr) >= 60)
    
    print(f"\nBreakthrough Capability (Active Signals):")
    print(f"Number of candles where Score >= 40: P9={p9_over_40}, P10={p10_over_40}")
    print(f"Number of candles where Score >= 60: P9=0 (Max was {np.abs(p9_arr).max():.1f}), P10={p10_over_60}")

asyncio.run(run_test())
