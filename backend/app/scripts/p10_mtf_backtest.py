import asyncio
import logging
import sqlite3
import os
import time
from datetime import datetime, timezone
import httpx
import numpy as np
import talib
import math

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(message)s")
logger = logging.getLogger("P10-MTF")

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "historical_klines.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS klines
                 (tf TEXT, timestamp INTEGER, open REAL, high REAL, low REAL, close REAL, volume REAL,
                  PRIMARY KEY (tf, timestamp))''')
    conn.commit()
    return conn

async def download_klines(symbol: str, tf: str, start_ts: int, end_ts: int, conn: sqlite3.Connection):
    c = conn.cursor()
    c.execute("SELECT MIN(timestamp), MAX(timestamp) FROM klines WHERE tf=?", (tf,))
    res = c.fetchone()
    db_min, db_max = res[0], res[1] if res else (None, None)
    
    if db_min is not None and db_max is not None:
        if db_min <= start_ts and db_max >= (end_ts - 3600*1000):
            logger.info(f"[{tf}] DB Cache fully covers requested 300 days.")
            return

    logger.info(f"[{tf}] Downloading histories from Binance...")
    current_start = start_ts
    all_inserted = 0
    
    async with httpx.AsyncClient() as client:
        while current_start < end_ts:
            url = f"https://api.binance.com/api/v3/klines?symbol={symbol}&interval={tf}&startTime={current_start}&limit=1000"
            is_empty = False
            for attempt in range(3):
                try:
                    resp = await client.get(url, timeout=10.0)
                    resp.raise_for_status()
                    data = resp.json()
                    if not data:
                        is_empty = True
                        break
                        
                    records = [(tf, int(k[0]), float(k[1]), float(k[2]), float(k[3]), float(k[4]), float(k[5])) for k in data]
                    c.executemany("INSERT OR IGNORE INTO klines VALUES (?, ?, ?, ?, ?, ?, ?)", records)
                    conn.commit()
                    
                    all_inserted += len(records)
                    current_start = int(data[-1][0]) + 1
                    await asyncio.sleep(0.1) 
                    break
                except Exception as e:
                    await asyncio.sleep(2)
            else:
                break
            if is_empty:
                break

def load_from_db(tf: str, start_ts: int, end_ts: int, conn: sqlite3.Connection):
    c = conn.cursor()
    c.execute("SELECT timestamp, open, high, low, close, volume FROM klines WHERE tf=? AND timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC", (tf, start_ts, end_ts))
    raw = c.fetchall()
    return {
        "ts": np.array([r[0] for r in raw], dtype=np.int64),
        "open": np.array([r[1] for r in raw], dtype=np.float64),
        "high": np.array([r[2] for r in raw], dtype=np.float64),
        "low": np.array([r[3] for r in raw], dtype=np.float64),
        "close": np.array([r[4] for r in raw], dtype=np.float64),
        "volume": np.array([r[5] for r in raw], dtype=np.float64)
    }

def run_p10_vectorized(closes, highs, lows, vols):
    N = len(closes)
    p10_scores = np.zeros(N)
    
    upper, middle, lower = talib.BBANDS(closes, timeperiod=20)
    K, D = talib.STOCH(highs, lows, closes, 9, 3, 0, 3, 0)
    J = 3*K - 2*D
    sar = talib.SAR(highs, lows, 0.02, 0.2)
    mfi = talib.MFI(highs, lows, closes, vols, 14)
    
    for i in range(20, N):
        if np.isnan(upper[i]) or np.isnan(J[i]) or np.isnan(sar[i]) or np.isnan(mfi[i]):
            continue
            
        # 1. BBands
        bw = (upper[i] - lower[i]) / middle[i] if middle[i] > 0 else 0
        pos = (closes[i] - lower[i]) / (upper[i] - lower[i]) if (upper[i] - lower[i]) > 0 else 0.5
        bb_raw = (0.5 - pos) * 6.0
        if bw > 0.08: bb_raw *= 1.2
        elif bw < 0.02: bb_raw *= 0.5
        bb_score = max(-3.0, min(3.0, bb_raw))
        bb_w = 0.6
        
        # 2. KDJ
        kdj_raw = (50.0 - J[i]) / 50.0 * 2.5
        golden = False; death = False
        if i > 0 and not np.isnan(K[i-1]):
            golden = (J[i-1] < K[i-1]) and (J[i] > K[i])
            death = (J[i-1] > K[i-1]) and (J[i] < K[i])
        if golden: kdj_raw += 1.0
        elif death: kdj_raw -= 1.0
        kdj_score = max(-3.0, min(3.0, kdj_raw))
        kdj_w = 0.7
        
        # 3. SAR
        gap_pct = (closes[i] - sar[i]) / closes[i] * 100
        sar_raw = gap_pct * 1.5
        flipped = False
        if i > 0 and not np.isnan(sar[i-1]):
            prev_above = closes[i-1] > sar[i-1]
            curr_above = closes[i] > sar[i]
            flipped = (prev_above != curr_above)
        if flipped:
            sar_raw += 1.5 if curr_above else -1.5
        sar_score = max(-3.0, min(3.0, sar_raw))
        sar_w = 0.6
        
        # 4. MFI
        mfi_raw = (50.0 - mfi[i]) / 50.0 * 3.0
        mfi_score = max(-3.0, min(3.0, mfi_raw))
        mfi_w = 0.6
        
        # 5. Volume
        vol_hist = np.mean(vols[i-19:i+1])
        vol_rec = np.mean(vols[i-4:i+1])
        ratio = max(0.01, vol_rec/vol_hist) if vol_hist > 0 else 1.0
        vol_raw = math.log2(ratio) * 1.5
        vol_score = max(-3.0, min(3.0, vol_raw))
        vol_w_p10 = 0.1 + (abs(vol_score)/3.0)*0.7
        
        # 6. MACD (assumed dormant for pure baseline testing)
        macd_score = 0.0
        macd_w_p10 = 0.1
        
        tot_p10 = macd_w_p10 + vol_w_p10 + bb_w + kdj_w + sar_w + mfi_w
        sum_p10 = (macd_score * macd_w_p10) + (vol_score * vol_w_p10) + (bb_score * bb_w) + (kdj_score * kdj_w) + (sar_score * sar_w) + (mfi_score * mfi_w)
        p10_scores[i] = max(-1.0, min(1.0, sum_p10 / (tot_p10 * 1.5))) * 100
        
    return p10_scores

async def run_mtf_backtest():
    days = 300
    now_ts = int(time.time() * 1000)
    start_ts = now_ts - (days * 24 * 3600 * 1000)
    conn = init_db()
    
    tfs = ["5m", "15m", "1h", "4h", "1d"]
    
    print("\n=======================================================================")
    print(f" P10 DYNAMIC WEIGHTS 6-FACTOR MTF BACKTEST (300 DAYS) ")
    print("=======================================================================\n")
    
    for tf in tfs:
        await download_klines("BTCUSDT", tf, start_ts, now_ts, conn)
        data = load_from_db(tf, start_ts, now_ts, conn)
        N = len(data["close"])
        if N < 200: continue
            
        closes = data["close"]
        p10_scores = run_p10_vectorized(closes, data["high"], data["low"], data["volume"])
        
        valid_scores = p10_scores[20:]
        max_s = valid_scores.max()
        min_s = valid_scores.min()
        mean_abs = np.abs(valid_scores).mean()
        
        # Trading Sim: Enter if |score| >= 60, Hold for 6 candles
        hits = 0; misses = 0; total = 0
        total_profit = 0.0
        in_cooldown = 0
        
        for i in range(20, N-6):
            if in_cooldown > 0:
                in_cooldown -= 1
                continue
                
            score = p10_scores[i]
            if score >= 60:
                entry = closes[i]
                ext = closes[i+6]
                profit = (ext - entry) / entry * 100
                total_profit += profit
                if profit > 0: hits += 1
                else: misses += 1
                total += 1
                in_cooldown = 6
            elif score <= -60:
                entry = closes[i]
                ext = closes[i+6]
                profit = (entry - ext) / entry * 100
                total_profit += profit
                if profit > 0: hits += 1
                else: misses += 1
                total += 1
                in_cooldown = 6
                
        win_rate = (hits/total*100) if total > 0 else 0
        
        print(f"[{tf.upper()}] Timeframe (N={N} candles)")
        print(f"  ├─ Extremes: Max {max_s:+.2f} | Min {min_s:+.2f} | Mean Volatility {mean_abs:.2f}")
        print(f"  ├─ Signals Triggered (|Score| >= 60): {total}")
        print(f"  ├─ Win Rate (Hold 6 candles): {win_rate:.2f}% ({hits}W / {misses}L)")
        print(f"  └─ Net Spot Return (No Leverage): {total_profit:+.2f}%\n")

if __name__ == "__main__":
    asyncio.run(run_mtf_backtest())

