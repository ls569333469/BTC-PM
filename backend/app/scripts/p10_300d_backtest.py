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
logger = logging.getLogger("P10-Backtest")

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
    db_min, db_max = c.fetchone()
    
    if db_min is not None and db_max is not None:
        if db_min <= start_ts and db_max >= (end_ts - 3600*1000):
            logger.info(f"[{tf}] DB Cache fully covers requested 300 days. Skipping download.")
            return

    logger.info(f"[{tf}] Downloading 300-day histories from Binance (approx 85 requests)...")
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
                        
                    records = []
                    for k in data:
                        records.append((tf, int(k[0]), float(k[1]), float(k[2]), float(k[3]), float(k[4]), float(k[5])))
                        
                    c.executemany("INSERT OR IGNORE INTO klines VALUES (?, ?, ?, ?, ?, ?, ?)", records)
                    conn.commit()
                    
                    all_inserted += len(records)
                    current_start = int(data[-1][0]) + 1
                    if all_inserted % 10000 == 0:
                        logger.info(f"[{tf}] Downloaded {all_inserted} candles... (At {datetime.fromtimestamp(current_start/1000, tz=timezone.utc).date()})")
                    await asyncio.sleep(0.1) 
                    break
                except Exception as e:
                    logger.warning(f"Download error: {e}. Retrying.")
                    await asyncio.sleep(2)
            else:
                break
            if is_empty:
                break
    logger.info(f"[{tf}] Download complete. Inserted {all_inserted} rows.")

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

async def run_300d_backtest():
    days = 300
    tf = "5m"
    now_ts = int(time.time() * 1000)
    start_ts = now_ts - (days * 24 * 3600 * 1000)
    
    conn = init_db()
    await download_klines("BTCUSDT", tf, start_ts, now_ts, conn)
    
    logger.info("Loading 300-day matrix into RAM...")
    data = load_from_db(tf, start_ts, now_ts, conn)
    N = len(data["close"])
    logger.info(f"Loaded {N} candles.")
    
    if N < 1000:
        logger.error("Not enough data.")
        return
        
    closes = data["close"]
    highs = data["high"]
    lows = data["low"]
    vols = data["volume"]
    
    logger.info("Vectorizing TA-Lib Indicators over 300 days...")
    # Generate full arrays
    upper, middle, lower = talib.BBANDS(closes, timeperiod=20)
    K, D = talib.STOCH(highs, lows, closes, 9, 3, 0, 3, 0)
    J = 3*K - 2*D
    sar = talib.SAR(highs, lows, 0.02, 0.2)
    mfi = talib.MFI(highs, lows, closes, vols, 14)
    
    logger.info("Running P10 Dynamic Weight Scoring Engine...")
    
    p9_scores = np.zeros(N)
    p10_scores = np.zeros(N)
    
    # We step through the arrays mechanically. 
    # For speed, we do a python loop over the pre-calculated arrays.
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
            j_prev = J[i-1]; k_prev = K[i-1]
            golden = j_prev < k_prev and J[i] > K[i]
            death = j_prev > k_prev and J[i] < K[i]
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
        
        # 5. Volume (needs 20 history)
        vol_hist = np.mean(vols[i-19:i+1])
        vol_rec = np.mean(vols[i-4:i+1])
        ratio = max(0.01, vol_rec/vol_hist) if vol_hist > 0 else 1.0
        vol_raw = math.log2(ratio) * 1.5
        vol_score = max(-3.0, min(3.0, vol_raw))
        vol_w_p9 = 0.5
        vol_w_p10 = 0.1 + (abs(vol_score)/3.0)*0.7
        
        # 6. MACD (assumed 0 for basic test)
        macd_score = 0.0
        macd_w_p9 = 0.8
        macd_w_p10 = 0.1
        
        # P9 Compute
        tot_p9 = macd_w_p9 + vol_w_p9 + bb_w + kdj_w + sar_w + mfi_w
        sum_p9 = (macd_score * macd_w_p9) + (vol_score * vol_w_p9) + (bb_score * bb_w) + (kdj_score * kdj_w) + (sar_score * sar_w) + (mfi_score * mfi_w)
        p9_scores[i] = max(-1.0, min(1.0, sum_p9 / (tot_p9 * 3.0))) * 100
        
        # P10 Compute
        tot_p10 = macd_w_p10 + vol_w_p10 + bb_w + kdj_w + sar_w + mfi_w
        sum_p10 = (macd_score * macd_w_p10) + (vol_score * vol_w_p10) + (bb_score * bb_w) + (kdj_score * kdj_w) + (sar_score * sar_w) + (mfi_score * mfi_w)
        p10_scores[i] = max(-1.0, min(1.0, sum_p10 / (tot_p10 * 1.5))) * 100

    # Analytics Phase
    valid_p9 = p9_scores[20:]
    valid_p10 = p10_scores[20:]
    
    print("==================================================")
    print(f" 300-DAY 6-FACTOR P10 BACKTEST (N={len(valid_p10)} 5m K-lines) ")
    print("==================================================")
    print(f"[P9 Baseline] Max: {valid_p9.max():.2f} | Min: {valid_p9.min():.2f} | Mean Abs: {np.abs(valid_p9).mean():.2f}")
    print(f"[P10 Active]  Max: {valid_p10.max():.2f} | Min: {valid_p10.min():.2f} | Mean Abs: {np.abs(valid_p10).mean():.2f}")
    
    # Win Rate Tracking for Strong Signals (abs(score) > 60)
    # We simulate a Long/Short entry when P10 crosses +/- 60, holding for 6 periods (30 mins)
    hits = 0; misses = 0; total = 0
    in_cooldown = 0
    total_profit_pct = 0.0
    
    for i in range(20, N-6):
        if in_cooldown > 0:
            in_cooldown -= 1
            continue
            
        score = p10_scores[i]
        if score >= 60:
            entry = closes[i]
            exit = closes[i+6]
            profit = (exit - entry) / entry * 100
            total_profit_pct += profit
            if profit > 0: hits += 1
            else: misses += 1
            total += 1
            in_cooldown = 6
        elif score <= -60:
            entry = closes[i]
            exit = closes[i+6]
            profit = (entry - exit) / entry * 100
            total_profit_pct += profit
            if profit > 0: hits += 1
            else: misses += 1
            total += 1
            in_cooldown = 6

    print("\n--- Trading Simulation (Enter when |P10| >= 60, Hold 30m) ---")
    print(f"Total Signals Generated: {total}")
    if total > 0:
        print(f"Win Rate: {hits/total*100:.2f}% ({hits} W / {misses} L)")
        print(f"Net Spot Return (No Leverage): {total_profit_pct:.2f}%")
        
    print("==================================================")
    
if __name__ == "__main__":
    asyncio.run(run_300d_backtest())
