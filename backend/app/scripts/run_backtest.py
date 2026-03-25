import asyncio
import argparse
import logging
import sqlite3
import os
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path
import json

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
logger = logging.getLogger("Backtest")

DB_PATH = os.path.join(backend_root, "historical_klines.db")

TF_MINUTES = {
    "5m": 5, "15m": 15, "30m": 30,
    "1h": 60, "2h": 120, "4h": 240,
    "12h": 720, "1d": 1440
}

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS klines
                 (tf TEXT, timestamp INTEGER, open REAL, high REAL, low REAL, close REAL, volume REAL,
                  PRIMARY KEY (tf, timestamp))''')
    c.execute('''CREATE TABLE IF NOT EXISTS backtest_results
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                  run_id TEXT, prediction_time TEXT, timeframe TEXT, direction TEXT,
                  current_price REAL, target_price REAL, pm_base_price REAL,
                  actual_price REAL, direction_correct BOOLEAN, accuracy_grade TEXT, error_pct REAL,
                  composite_win_rate REAL, chanlun_win_rate REAL, factor_win_rate REAL,
                  is_news_anomaly BOOLEAN)''')
    conn.commit()
    return conn

async def download_klines(symbol: str, tf: str, start_ts: int, end_ts: int, conn: sqlite3.Connection):
    """Fetch historical K-lines circumventing 1000 limit and caching locally"""
    c = conn.cursor()
    c.execute("SELECT MIN(timestamp), MAX(timestamp) FROM klines WHERE tf=?", (tf,))
    db_min, db_max = c.fetchone()
    
    # Very rudimentary check: if we already have the range, skip downloading
    if db_min is not None and db_max is not None:
        if db_min <= start_ts and db_max >= (end_ts - 3600*1000):
            logger.info(f"[{tf}] Local cache covers requested range ({datetime.fromtimestamp(start_ts/1000)} -> {datetime.fromtimestamp(end_ts/1000)}). Skipping download.")
            return

    logger.info(f"[{tf}] Downloading missing histories from Binance...")
    
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
                    await asyncio.sleep(0.5) # rate limit protection
                    break
                except Exception as e:
                    logger.warning(f"Download error: {e}. Retrying {attempt+1}/3")
                    await asyncio.sleep(2)
            else:
                logger.error("Failed to fetch klines after 3 attempts.")
                break
            
            if is_empty:
                logger.info("Reached end of available K-line history from Binance.")
                break

    logger.info(f"[{tf}] Download pipeline complete. Total inserted: {all_inserted}")

def load_klines_from_db(tf: str, start_ts: int, end_ts: int, conn: sqlite3.Connection):
    c = conn.cursor()
    c.execute("SELECT timestamp, open, high, low, close, volume FROM klines WHERE tf=? AND timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC", (tf, start_ts, end_ts))
    raw = c.fetchall()
    return [{"timestamp": r[0], "open": r[1], "high": r[2], "low": r[3], "close": r[4], "volume": r[5]} for r in raw]

def check_anomaly(klines_window: list) -> bool:
    """Mathematical isolation of News Events through Volatility limits"""
    if len(klines_window) < 20: return False
    
    recent_k = klines_window[-1]
    # Simple volume spike detector
    vols = [k["volume"] for k in klines_window[-21:-1]]
    avg_vol = sum(vols) / len(vols) if vols else 1.0
    if recent_k["volume"] > avg_vol * 5: # 500% volume spike
        return True
        
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

async def run_scenario(days: int, tf: str):
    logger.info(f"=== Starting Historical Backtest ===")
    logger.info(f"Target: {days} Days history, Base Timeframe: {tf}")
    
    conn = init_db()
    
    now_ts = int(time.time() * 1000)
    start_ts = now_ts - (days * 24 * 3600 * 1000)
    
    # 1. Ensure Data Array is full
    await download_klines("BTCUSDT", "5m", start_ts - (14*24*3600*1000), now_ts, conn) # Download plenty of warmup buffer
    if tf != "5m":
        await download_klines("BTCUSDT", tf, start_ts - (14*24*3600*1000), now_ts, conn)
        
    master_5m = load_klines_from_db("5m", start_ts, now_ts, conn)
    target_tf_full = load_klines_from_db(tf, start_ts - (14*24*3600*1000), now_ts + (24*3600*1000), conn)

    if not master_5m:
        logger.error("No baseline stepping data found.")
        return

    run_id = datetime.now().strftime("%Y%m%d%H%M%S")
    logger.info(f"Commencing Time-Stepping Logic over {len(master_5m)} points...")

    processed_count = 0
    hit_count = 0
    chanlun_service = ChanlunService()
    
    for i in range(100, len(master_5m)): # Starts after 100 periods
        step_kline = master_5m[i]
        simulated_now_ts = step_kline["timestamp"]
        
        # We step every 1 hour purely to avoid taking 10 hours to run locally!
        # Every 12 K-lines in 5m data = 1 hour
        if tf == "1h" and i % 12 != 0: continue
        elif tf == "15m" and i % 3 != 0: continue
        elif tf == "4h" and i % 48 != 0: continue
        elif tf == "1d" and i % 288 != 0: continue
            
        valid_history = [k for k in target_tf_full if k["timestamp"] <= simulated_now_ts]
        
        if len(valid_history) < 100:
            continue
            
        current_price = step_kline["close"] # Polymarket Proxy Base Price
        
        try:
            # Replicate live production logic exactly using ChanlunService math core
            data_raw = chanlun_service._compute_single_tf_raw(tf, valid_history[-500:], current_price)
            if not data_raw or not data_raw.get("trend_analysis"): continue
            
            raw_score = data_raw["composite_raw"]
            
            # Simple downgrade mapping identical to live
            direction = "sideways"
            if raw_score > 35: direction = "up"
            elif raw_score < -35: direction = "down"
            
            win_rate = round(abs(raw_score))
            win_rate = max(0, min(100, win_rate))
            
            pred = generate_prediction_for_tf(
                tf=tf,
                current_price=current_price,
                raw_score=raw_score,
                win_rate=win_rate,
                direction=direction,
                trend_analysis=data_raw["trend_analysis"],
                divergence=data_raw["divergence"],
                indicators=data_raw["indicators"],
                funding_rate=None,
                closes=data_raw.get("closes")
            )
            
            target_price = pred["targetPrice"]
            chanlun_dir = direction
            is_anomaly = check_anomaly(master_5m[i-21:i+1])
            
            future_ts = simulated_now_ts + (TF_MINUTES[tf] * 60 * 1000)
            
            expiry_kline = next((k for k in target_tf_full if k["timestamp"] >= future_ts), None)
            
            if not expiry_kline:
                continue 
                
            actual_price = expiry_kline["close"]
            
            direction_correct, grade, err_pct = grade_prediction(target_price, chanlun_dir, current_price, actual_price)
            
            c = conn.cursor()
            c.execute('''INSERT INTO backtest_results 
                         (run_id, prediction_time, timeframe, direction, current_price, target_price, 
                          pm_base_price, actual_price, direction_correct, accuracy_grade, error_pct,
                          composite_win_rate, chanlun_win_rate, factor_win_rate, is_news_anomaly)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                      (run_id, datetime.fromtimestamp(simulated_now_ts/1000).isoformat(), tf, chanlun_dir,
                       current_price, target_price, current_price, actual_price, direction_correct, grade, err_pct,
                       win_rate, round(abs(data_raw["chanlun_raw"])), round(abs(data_raw["factor_raw"])), is_anomaly))
            conn.commit()
            
            processed_count += 1
            if direction_correct: hit_count += 1
            
            if processed_count % 10 == 0:
                logger.info(f"Simulated {processed_count} Epochs - Current Time: {datetime.fromtimestamp(simulated_now_ts/1000)} | Hit Rate: {hit_count/processed_count*100:.1f}%")
                
        except Exception as e:
            logger.error(f"Error during step {simulated_now_ts}: {e}")

    logger.info("=== Backtest Completed ===")
    logger.info(f"Total Epochs Simulated: {processed_count}")
    if processed_count > 0:
        logger.info(f"Final Offline Accuracy: {hit_count/processed_count*100:.2f}%")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="P7 Historical Backtest Engine")
    parser.add_argument("--days", type=int, default=3, help="Number of days to roll back")
    parser.add_argument("--tf", type=str, default="1h", help="Timeframe to execute predictions on")
    
    args = parser.parse_args()
    asyncio.run(run_scenario(args.days, args.tf))
