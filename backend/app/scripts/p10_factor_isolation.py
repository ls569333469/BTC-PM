import asyncio
import sqlite3
import os
import time
import numpy as np
import talib
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "historical_klines.db")

def load_from_db(tf: str, start_ts: int, end_ts: int):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT timestamp, open, high, low, close, volume FROM klines WHERE tf=? AND timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC", (tf, start_ts, end_ts))
    raw = c.fetchall()
    conn.close()
    return {
        "ts": np.array([r[0] for r in raw], dtype=np.int64),
        "closes": np.array([r[4] for r in raw], dtype=np.float64),
        "highs": np.array([r[2] for r in raw], dtype=np.float64),
        "lows": np.array([r[3] for r in raw], dtype=np.float64),
        "vols": np.array([r[5] for r in raw], dtype=np.float64)
    }

def isolate_factors(tf: str):
    days = 300
    now_ts = int(time.time() * 1000)
    start_ts = now_ts - (days * 24 * 3600 * 1000)
    data = load_from_db(tf, start_ts, now_ts)
    N = len(data["closes"])
    if N < 200: return
    
    closes = data["closes"]
    highs = data["highs"]
    lows = data["lows"]
    vols = data["vols"]
    
    upper, middle, lower = talib.BBANDS(closes, timeperiod=20)
    K, D = talib.STOCH(highs, lows, closes, 9, 3, 0, 3, 0)
    J = 3*K - 2*D
    sar = talib.SAR(highs, lows, 0.02, 0.2)
    mfi = talib.MFI(highs, lows, closes, vols, 14)
    
    scores = {"BBands": np.zeros(N), "KDJ": np.zeros(N), "SAR": np.zeros(N), "MFI": np.zeros(N)}
    
    for i in range(20, N):
        if np.isnan(upper[i]) or np.isnan(J[i]) or np.isnan(sar[i]) or np.isnan(mfi[i]):
            continue
            
        # BBands (Mean Reversion)
        pos = (closes[i] - lower[i]) / (upper[i] - lower[i]) if (upper[i] - lower[i]) > 0 else 0.5
        bb_raw = (0.5 - pos) * 6.0
        scores["BBands"][i] = max(-100.0, min(100.0, bb_raw * 33.3))
        
        # KDJ (Mean Reversion)
        kdj_raw = (50.0 - J[i]) / 50.0 * 2.5
        scores["KDJ"][i] = max(-100.0, min(100.0, kdj_raw * 40.0))
        
        # SAR (Trend Following)
        gap_pct = (closes[i] - sar[i]) / closes[i] * 100
        sar_raw = gap_pct * 1.5
        scores["SAR"][i] = max(-100.0, min(100.0, sar_raw * 40.0))
        
        # MFI (Mean Reversion)
        mfi_raw = (50.0 - mfi[i]) / 50.0 * 3.0
        scores["MFI"][i] = max(-100.0, min(100.0, mfi_raw * 33.3))
        
    print(f"\n=== Individual Factor Performance on {tf.upper()} (N={N}) ===")
    print("Simulated 1-candle holding period when |score| >= 60 (Polymarket PM Settlement)")
    
    for name, arr in scores.items():
        hits = 0; total = 0
        total_profit = 0.0
        for i in range(20, N-1):
            if arr[i] >= 60:
                prof = (closes[i+1] - closes[i]) / closes[i] * 100
                total_profit += prof
                if prof > 0: hits += 1
                total += 1
            elif arr[i] <= -60:
                prof = (closes[i] - closes[i+1]) / closes[i] * 100
                total_profit += prof
                if prof > 0: hits += 1
                total += 1
                
        wr = hits/total*100 if total > 0 else 0
        print(f"[{name.ljust(6)}] WinRate: {wr:5.2f}% ({hits:4d}/{total:4d}) | PnL: {total_profit:+7.2f}%")

if __name__ == "__main__":
    isolate_factors("1h")
    isolate_factors("4h")
    isolate_factors("15m")
