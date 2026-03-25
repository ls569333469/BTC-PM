import asyncio
import argparse
import logging
import sqlite3
import os
import time
from datetime import datetime, timezone
import httpx
import numpy as np

# Update Python path to include backend root
import sys
backend_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

from app.services.chanlun_service import ChanlunService
from app.engines.prediction import generate_prediction_for_tf

logging.basicConfig(level=logging.INFO, format="%(asctime)s - [%(levelname)s] - %(message)s")
logger = logging.getLogger("MTF-Backtest")

DB_PATH = os.path.join(backend_root, "historical_klines.db")

TF_MINUTES = {
    "5m": 5, "15m": 15, "30m": 30,
    "1h": 60, "4h": 240, "1d": 1440
}

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS klines
                 (tf TEXT, timestamp INTEGER, open REAL, high REAL, low REAL, close REAL, volume REAL,
                  PRIMARY KEY (tf, timestamp))''')
    c.execute('''CREATE TABLE IF NOT EXISTS mtf_backtest_results
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                  run_id TEXT, prediction_time TEXT, timeframe TEXT, direction TEXT,
                  current_price REAL, target_price REAL, pm_base_price REAL,
                  actual_price REAL, direction_correct BOOLEAN, accuracy_grade TEXT, error_pct REAL,
                  composite_win_rate REAL, chanlun_win_rate REAL, factor_win_rate REAL,
                  is_news_anomaly BOOLEAN)''')
    conn.commit()
    return conn

async def download_klines(symbol: str, tf: str, start_ts: int, end_ts: int, conn: sqlite3.Connection):
    c = conn.cursor()
    c.execute("SELECT MIN(timestamp), MAX(timestamp) FROM klines WHERE tf=?", (tf,))
    db_min, db_max = c.fetchone()
    
    if db_min is not None and db_max is not None:
        if db_min <= start_ts and db_max >= (end_ts - 3600*1000):
            logger.info(f"[{tf}] Local cache fully covers requested range. Skipping download.")
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
                        
                    records = []
                    for k in data:
                        records.append((tf, int(k[0]), float(k[1]), float(k[2]), float(k[3]), float(k[4]), float(k[5])))
                        
                    c.executemany("INSERT OR IGNORE INTO klines VALUES (?, ?, ?, ?, ?, ?, ?)", records)
                    conn.commit()
                    
                    all_inserted += len(records)
                    current_start = int(data[-1][0]) + 1
                    logger.info(f"[{tf}] Inserted {len(records)} rows... Progress: {datetime.fromtimestamp(current_start/1000, tz=timezone.utc)}")
                    await asyncio.sleep(0.5) 
                    break
                except Exception as e:
                    logger.warning(f"Download error: {e}. Retrying {attempt+1}/3")
                    await asyncio.sleep(2)
            else:
                logger.error("Failed to fetch klines after 3 attempts.")
                break
                
            if is_empty:
                logger.info(f"[{tf}] Reached end of available K-line history.")
                break

    logger.info(f"[{tf}] Download pipeline complete. Total inserted: {all_inserted}")

def load_klines_from_db(tf: str, start_ts: int, end_ts: int, conn: sqlite3.Connection):
    c = conn.cursor()
    c.execute("SELECT timestamp, open, high, low, close, volume FROM klines WHERE tf=? AND timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC", (tf, start_ts, end_ts))
    raw = c.fetchall()
    return [{"timestamp": r[0], "open": r[1], "high": r[2], "low": r[3], "close": r[4], "volume": r[5]} for r in raw]

def check_anomaly(klines_window: list) -> bool:
    if len(klines_window) < 20: return False
    recent_k = klines_window[-1]
    vols = [k["volume"] for k in klines_window[-21:-1]]
    avg_vol = sum(vols) / len(vols) if vols else 1.0
    if recent_k["volume"] > avg_vol * 5: return True
    return False

def grade_prediction(target_price, direction, entry_price, actual_price):
    actual_diff = actual_price - entry_price
    direction_correct = (
        (direction == "up" and actual_diff > 0) or
        (direction == "down" and actual_diff < 0) or
        (direction == "sideways" and abs(actual_diff/entry_price) < 0.002)
    )
    target_error = abs(actual_price - target_price)
    target_error_pct = (target_error / entry_price * 100) if entry_price > 0 else 0

    grade = "MISS"
    if direction_correct:
        if target_error_pct < 0.1: grade = "EXACT"
        elif target_error_pct < 0.3: grade = "CLOSE"
        else: grade = "HIT"

    return direction_correct, grade, target_error_pct

async def run_scenario(days: int):
    tfs_needed = ["5m", "15m", "30m", "1h", "4h", "1d"]
    logger.info(f"=== Starting GLOBAL MTF RESONANCE Backtest ===")
    logger.info(f"Target: {days} Days history, TFs: {tfs_needed}")
    
    conn = init_db()
    
    now_ts = int(time.time() * 1000)
    start_ts = now_ts - (days * 24 * 3600 * 1000)
    
    # 1. Download all required TFs
    for tf in tfs_needed:
        # Buffer +14 days for large TFs to form indicators
        await download_klines("BTCUSDT", tf, start_ts - (60*24*3600*1000), now_ts + (24*3600*1000), conn)
        
    # 2. Load into RAM matrices
    logger.info("Loading memory matrices...")
    kline_matrices = {}
    for tf in tfs_needed:
        kline_matrices[tf] = load_klines_from_db(tf, start_ts - (30*24*3600*1000), now_ts + (24*3600*1000), conn)
        
    master_15m = [k for k in kline_matrices["15m"] if start_ts <= k["timestamp"] <= now_ts]
    
    if not master_15m:
        logger.error("No 15m stepping baseline generated.")
        return

    run_id = datetime.now().strftime("MTF_%Y%m%d%H%M%S")
    logger.info(f"Commencing Interval Nesting Logic over {len(master_15m)} 15-minute epochs...")

    processed_count = 0
    hit_count = 0
    chanlun_service = ChanlunService()
    
    nesting_map = {"15m": "5m", "30m": "15m", "1h": "30m", "4h": "1h", "1d": "4h"}
    
    # Step every 1 hour (4 * 15m ticks) to dramatically optimize 300-day computations
    for i in range(10, len(master_15m)): 
        if i % 4 != 0: continue
        step_kline = master_15m[i]
        simulated_now_ts = step_kline["timestamp"]
        current_price = step_kline["close"]
        
        # Phase A: Calculate Independent Data for ALL TFs up to this Exact Millisecond
        tf_evals = {}
        for tf in tfs_needed:
            valid_history = [k for k in kline_matrices[tf] if k["timestamp"] <= simulated_now_ts]
            if len(valid_history) < 200: continue
            
            # Pure math engine
            data_raw = chanlun_service._compute_single_tf_raw(tf, valid_history[-500:], current_price)
            if data_raw and data_raw.get("trend_analysis"):
                tf_evals[tf] = data_raw
                
        # Phase B: Interval Nesting Boosts (Cross-Timeframe Resonance)
        for tf in tfs_needed:
            if tf not in tf_evals: continue
            
            data = tf_evals[tf]
            raw_score = data["composite_raw"]
            
            sub_tf = nesting_map.get(tf)
            if sub_tf and sub_tf in tf_evals:
                sub_score = tf_evals[sub_tf]["composite_raw"]
                if raw_score * sub_score < 0:
                    raw_score += (sub_score * 0.3)  # Inverse drag
                else:
                    raw_score += (sub_score * 0.15) # Convergence thrust!
                    
            raw_score = max(-100.0, min(100.0, raw_score))
            
            direction = "sideways"
            if raw_score > 35: direction = "up"
            elif raw_score < -35: direction = "down"
            
            win_rate = round(abs(raw_score))
            win_rate = max(0, min(100, win_rate))
            
            # Predict
            pred = generate_prediction_for_tf(
                tf=tf,
                current_price=current_price,
                raw_score=raw_score,
                win_rate=win_rate,
                direction=direction,
                trend_analysis=data["trend_analysis"],
                divergence=data["divergence"],
                indicators=data["indicators"],
                funding_rate=None,
                closes=data.get("closes")
            )
            
            target_price = pred["targetPrice"]
            
            # Phase C: God-Mode Resolution check (No lookahead bias for generation, just grading)
            future_ts = simulated_now_ts + (TF_MINUTES[tf] * 60 * 1000)
            expiry_kline = next((k for k in kline_matrices[tf] if k["timestamp"] >= future_ts), None)
            
            if not expiry_kline: continue
                
            actual_price = expiry_kline["close"]
            is_anomaly = check_anomaly(master_15m[i-21:i+1])
            is_correct, grade, err_pct = grade_prediction(target_price, direction, current_price, actual_price)
            
            c = conn.cursor()
            c.execute('''INSERT INTO mtf_backtest_results 
                         (run_id, prediction_time, timeframe, direction, current_price, target_price, 
                          pm_base_price, actual_price, direction_correct, accuracy_grade, error_pct,
                          composite_win_rate, chanlun_win_rate, factor_win_rate, is_news_anomaly)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                      (run_id, datetime.fromtimestamp(simulated_now_ts/1000).isoformat(), tf, direction,
                       current_price, target_price, current_price, actual_price, is_correct, grade, err_pct,
                       win_rate, round(abs(data["chanlun_raw"])), round(abs(data["factor_raw"])), is_anomaly))
            conn.commit()
            
            processed_count += 1
            if is_correct: hit_count += 1
            
        if i % 100 == 0:
            logger.info(f"Simulated MTF Matrix at {datetime.fromtimestamp(simulated_now_ts/1000)}. Master Hits: {hit_count}/{processed_count} ({(hit_count/processed_count*100) if processed_count>0 else 0:.1f}%)")

    logger.info("=== MTF Resonance Backtest Completed ===")
    logger.info(f"Total MTF Epochs Logged: {processed_count}")
    if processed_count > 0:
        logger.info(f"Final Offline Overall Accuracy: {hit_count/processed_count*100:.2f}%")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="P7.5 MTF Historical Backtest Engine")
    parser.add_argument("--days", type=int, default=30, help="Number of days to roll back")
    
    args = parser.parse_args()
    asyncio.run(run_scenario(args.days))
