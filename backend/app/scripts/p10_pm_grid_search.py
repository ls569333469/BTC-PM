import asyncio
import sqlite3
import os
import time
import numpy as np
import talib
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "historical_klines.db")

def load_from_db(tf: str, start_ts: int, end_ts: int):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT timestamp, open, high, low, close, volume FROM klines WHERE tf=? AND timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC", (tf, start_ts, end_ts))
    raw = c.fetchall()
    conn.close()
    return {
        "ts": np.array([r[0] for r in raw], dtype=np.int64),
        "open": np.array([r[1] for r in raw], dtype=np.float64),
        "high": np.array([r[2] for r in raw], dtype=np.float64),
        "low": np.array([r[3] for r in raw], dtype=np.float64),
        "close": np.array([r[4] for r in raw], dtype=np.float64),
        "volume": np.array([r[5] for r in raw], dtype=np.float64)
    }

def synthesize_pm_1d(data_1h):
    # PM 1D Settles at 11:59:59 PM EST -> 04:00:00 UTC (ignoring DST for simple macro 300D test)
    # We aggregate 1H candles into 24H chunks that end exactly at 03:00 UTC (which closes at 04:00 UTC).
    N = len(data_1h["ts"])
    pm_1d = {"ts": [], "open": [], "high": [], "low": [], "close": [], "volume": []}
    
    current_open = 0; current_high = 0; current_low = 0; current_vol = 0
    in_chunk = False
    
    for i in range(N):
        dt = datetime.fromtimestamp(data_1h["ts"][i] / 1000, tz=timezone.utc)
        hour = dt.hour
        
        if hour == 4: # Start of a new PM Day
            in_chunk = True
            current_open = data_1h["open"][i]
            current_high = data_1h["high"][i]
            current_low = data_1h["low"][i]
            current_vol = data_1h["volume"][i]
            
        elif in_chunk:
            current_high = max(current_high, data_1h["high"][i])
            current_low = min(current_low, data_1h["low"][i])
            current_vol += data_1h["volume"][i]
            
            if hour == 3: # End of PM Day (this candle is 03:00 - 04:00 UTC)
                pm_1d["ts"].append(data_1h["ts"][i])
                pm_1d["open"].append(current_open)
                pm_1d["high"].append(current_high)
                pm_1d["low"].append(data_1h["low"][i])
                pm_1d["close"].append(data_1h["close"][i])
                pm_1d["volume"].append(current_vol)
                in_chunk = False

    return {k: np.array(v) for k, v in pm_1d.items()}

def normalize_score(val):
    if np.isnan(val) or np.isinf(val): return 0.0
    return max(-1.0, min(1.0, val / 100.0))

def compute_all_indicators(data):
    N = len(data["close"])
    if N < 100: return None
    
    close, high, low, volume = data["close"], data["high"], data["low"], data["volume"]
    
    macd, macd_signal, macd_hist = talib.MACD(close, 12, 26, 9)
    rsi = talib.RSI(close, 14)
    cci = talib.CCI(high, low, close, 14)
    adx = talib.ADX(high, low, close, 14)
    plus_di = talib.PLUS_DI(high, low, close, 14)
    minus_di = talib.MINUS_DI(high, low, close, 14)
    ultosc = talib.ULTOSC(high, low, close, 7, 14, 28)
    obv = talib.OBV(close, volume)
    upper, middle, lower = talib.BBANDS(close, timeperiod=20)
    K, D = talib.STOCH(high, low, close, 9, 3, 0, 3, 0)
    J = 3*K - 2*D
    sar = talib.SAR(high, low, 0.02, 0.2)
    mfi = talib.MFI(high, low, close, volume, 14)
    
    obv_ema = talib.EMA(obv, 14)
    
    scores = {
        "MACD": np.zeros(N), "VOL": np.zeros(N), "BBANDS": np.zeros(N),
        "KDJ": np.zeros(N), "SAR": np.zeros(N), "MFI": np.zeros(N),
        "RSI": np.zeros(N), "CCI": np.zeros(N), "ULTOSC": np.zeros(N),
        "ADX": np.zeros(N), "OBV_MOM": np.zeros(N)
    }
    
    for i in range(50, N):
        scores["MACD"][i] = normalize_score(macd_hist[i] / close[i] * 50000.0)
        
        vol_hist = np.mean(volume[i-19:i+1]); vol_rec = np.mean(volume[i-4:i+1])
        ratio = max(0.01, vol_rec/vol_hist) if vol_hist > 0 else 1.0
        scores["VOL"][i] = max(-1.0, min(1.0, np.log2(ratio) * 0.5))
        
        pos = (close[i] - lower[i]) / (upper[i] - lower[i]) if (upper[i] - lower[i]) > 0 else 0.5
        scores["BBANDS"][i] = normalize_score((0.5 - pos) * 333.3)
        
        scores["KDJ"][i] = normalize_score((50.0 - J[i]) / 50.0 * 100.0)
        scores["SAR"][i] = normalize_score((close[i] - sar[i]) / close[i] * 150.0)
        scores["MFI"][i] = normalize_score((50.0 - mfi[i]) / 50.0 * 100.0)
        
        scores["RSI"][i] = normalize_score((50.0 - rsi[i]) * 2.5)
        scores["CCI"][i] = normalize_score(cci[i] * -0.5)
        scores["ULTOSC"][i] = normalize_score((50.0 - ultosc[i]) * 3.0)
        
        di_delta = plus_di[i] - minus_di[i] if not np.isnan(plus_di[i]) else 0
        scores["ADX"][i] = normalize_score(adx[i] * 2.0 * (1 if di_delta > 0 else -1))
        
        if obv_ema[i] > 0 and obv[i] != 0:
            scores["OBV_MOM"][i] = normalize_score((obv[i] - obv_ema[i]) / abs(obv_ema[i]) * 5000.0)
            
    return scores

def run_combo(scores, weights):
    N = len(scores["MACD"])
    combo = np.zeros(N)
    for i in range(50, N):
        sum_w = 0.0; sum_s = 0.0
        for ind, w in weights.items():
            if ind == "MACD" or ind == "VOL":
                active_w = w if abs(scores[ind][i]) > 0.4 else 0.1
                sum_w += active_w
                sum_s += scores[ind][i] * active_w 
            else:
                sum_w += w
                sum_s += scores[ind][i] * w
                
        # The true un-amplified raw score sum was effectively normalized to 1.
        # Now we apply the exact 1.5x UI mathematical multiplier that we just put in scoring.py
        # To match scoring.py identically, since our test script's scores[ind][i] ranges [-1.0, 1.0]
        # its maximum sum_s is sum_w. 
        # So sum_s / sum_w represents the raw 100% normalized factor strength.
        # We multiply by 1.5 here!
        amplified_score = (sum_s / sum_w) * 1.5
        combo[i] = max(-1.0, min(1.0, amplified_score)) * 100
    return combo

def test_pm_grid():
    days = 300
    now_ts = int(time.time() * 1000)
    start_ts = now_ts - (days * 24 * 3600 * 1000)
    
    tfs = ["5m", "15m", "1h", "4h"]
    data = {}
    for tf in tfs:
        data[tf] = load_from_db(tf, start_ts, now_ts)
        
    data_1h_for_1d = load_from_db("1h", start_ts - (5*24*3600*1000), now_ts)
    data["pm_1d"] = synthesize_pm_1d(data_1h_for_1d)
    
    print("==========================================================")
    print(" FINAL P10 V2 GRID SEARCH (1.5x UI AMPLIFIED) ")
    print("==========================================================\n")
    
    combos = {
        "A_Old6": {"MACD": 1.0, "VOL": 0.8, "BBANDS": 0.6, "KDJ": 0.7, "SAR": 0.6, "MFI": 0.6},
        "B_New3": {"MACD": 1.0, "VOL": 0.8, "RSI": 0.7, "CCI": 0.6, "ULTOSC": 0.6},
        "C_Whale": {"MACD": 1.0, "ADX": 0.6, "OBV_MOM": 0.8, "RSI": 0.6}
    }
    
    # We now test higher thresholds because the score is amplified by 1.5!
    # Mathematically, the old 40 should now appear exactly as 60.
    thresholds = [50, 60, 70, 80]
    
    for tf_name in ["5m", "15m", "1h", "4h", "pm_1d"]:
        df = data[tf_name]
        N = len(df["close"])
        if N < 100: continue
        
        ind_scores = compute_all_indicators(df)
        close = df["close"]
        
        print(f"| TIMEFRAME: {tf_name.ljust(6).upper()} | N = {N} K-lines |")
        print(f"| {'Combo'.ljust(10)} | {'Thresh'.ljust(6)} | {'Win Rate'.ljust(8)} | {'Signals'.ljust(7)} |")
        print(f"|{'-'*12}|{'-'*8}|{'-'*10}|{'-'*9}|")
        
        best_combo = ""; best_wr = 0.0; best_th = 0
        
        for c_name, weights in combos.items():
            combo_scores = run_combo(ind_scores, weights)
            for th in thresholds:
                hits = 0; total = 0
                for i in range(50, N-1):
                    s = combo_scores[i]
                    if s >= th:
                        total += 1
                        if close[i+1] >= close[i]: hits += 1
                    elif s <= -th:
                        total += 1
                        if close[i+1] < close[i]: hits += 1
                
                wr = hits/total*100 if total > 0 else 0
                if total > 5 and wr > best_wr:
                    best_wr = wr; best_combo = c_name; best_th = th
                
                print(f"| {c_name.ljust(10)} | {('±'+str(th)).ljust(6)} | {f'{wr:.2f}%'.ljust(8)} | {str(total).ljust(7)} |")
        print(f"--> BEST ON {tf_name.upper()}: {best_combo} at ±{best_th} (Win Rate: {best_wr:.2f}%)\n")

if __name__ == "__main__":
    test_pm_grid()

