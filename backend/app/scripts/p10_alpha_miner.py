import asyncio
import sqlite3
import os
import time
import numpy as np
import talib

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

def normalize_score(val):
    if np.isnan(val) or np.isinf(val): return 0.0
    return max(-100.0, min(100.0, val))

def mine_alphas(tf: str):
    days = 300
    now_ts = int(time.time() * 1000)
    start_ts = now_ts - (days * 24 * 3600 * 1000)
    data = load_from_db(tf, start_ts, now_ts)
    N = len(data["close"])
    if N < 200: return
    
    close, high, low, volume = data["close"], data["high"], data["low"], data["volume"]
    
    # Calculate 15 Indicators
    macd, macd_signal, macd_hist = talib.MACD(close, 12, 26, 9)
    rsi = talib.RSI(close, 14)
    cci = talib.CCI(high, low, close, 14)
    willr = talib.WILLR(high, low, close, 14)
    roc = talib.ROC(close, 14)
    adx = talib.ADX(high, low, close, 14)
    plus_di = talib.PLUS_DI(high, low, close, 14)
    minus_di = talib.MINUS_DI(high, low, close, 14)
    aroon = talib.AROONOSC(high, low, 14)
    cmo = talib.CMO(close, 14)
    ppo = talib.PPO(close, 12, 26)
    trix = talib.TRIX(close, 14)
    ultosc = talib.ULTOSC(high, low, close, 7, 14, 28)
    obv = talib.OBV(close, volume)
    atr = talib.ATR(high, low, close, 14)
    bop = talib.BOP(data["open"], high, low, close)
    mom = talib.MOM(close, 14)
    
    # Store indicator scores
    scores = {
        "RSI (Mean Rev)": np.zeros(N),
        "CCI (Mean Rev)": np.zeros(N),
        "WILLR (Mean Rev)": np.zeros(N),
        "CMO (Mean Rev)": np.zeros(N),
        "ULTOSC (Mean Rev)": np.zeros(N),
        
        "MACD (Trend)": np.zeros(N),
        "ROC (Trend)": np.zeros(N),
        "ADX_Cross (Trend)": np.zeros(N),
        "AROON (Trend)": np.zeros(N),
        "PPO (Trend)": np.zeros(N),
        "TRIX (Trend)": np.zeros(N),
        "MOM (Trend)": np.zeros(N),
        "BOP (Trend)": np.zeros(N),
        
        "OBV_Mom (Volume)": np.zeros(N),
        "ATR_Break (Volatil)": np.zeros(N),
    }
    
    obv_ema = talib.EMA(obv, 14)
    atr_ema = talib.EMA(atr, 14)
    
    for i in range(50, N):
        # Mean Reversion: High value = Overbought = Output Negative Score
        scores["RSI (Mean Rev)"][i] = normalize_score((50.0 - rsi[i]) * 2.5)
        scores["CCI (Mean Rev)"][i] = normalize_score(cci[i] * -0.5)
        scores["WILLR (Mean Rev)"][i] = normalize_score((willr[i] + 50.0) * -2.5)
        scores["CMO (Mean Rev)"][i] = normalize_score(cmo[i] * -1.5)
        scores["ULTOSC (Mean Rev)"][i] = normalize_score((50.0 - ultosc[i]) * 3.0)
        
        # Trend Following: High value = Bullish trend = Output Positive Score
        scores["MACD (Trend)"][i] = normalize_score(macd_hist[i] / close[i] * 50000.0)
        scores["ROC (Trend)"][i] = normalize_score(roc[i] * 20.0)
        
        adx_val = adx[i] if not np.isnan(adx[i]) else 0
        di_delta = plus_di[i] - minus_di[i] if not np.isnan(plus_di[i]) else 0
        scores["ADX_Cross (Trend)"][i] = normalize_score(adx_val * 2.0 * (1 if di_delta > 0 else -1))
        
        scores["AROON (Trend)"][i] = normalize_score(aroon[i] * 1.5)
        scores["PPO (Trend)"][i] = normalize_score(ppo[i] * 100.0)
        scores["TRIX (Trend)"][i] = normalize_score(trix[i] * 1000.0)
        scores["MOM (Trend)"][i] = normalize_score(mom[i] / close[i] * 5000.0)
        scores["BOP (Trend)"][i] = normalize_score(bop[i] * 100.0)
        
        # Volume & Volatility
        if obv_ema[i] > 0 and obv[i] != 0:
            scores["OBV_Mom (Volume)"][i] = normalize_score((obv[i] - obv_ema[i]) / abs(obv_ema[i]) * 5000.0)
        if atr_ema[i] > 0:
            scores["ATR_Break (Volatil)"][i] = normalize_score((atr[i] - atr_ema[i]) / atr_ema[i] * 200.0)

    print(f"\n=======================================================")
    print(f" 🚀 15-FACTOR ALPHA MINER TEST ON {tf.upper()} (N={N})")
    print(f"=======================================================")
    
    # Evaluate Win Rate
    # Strategy: Enter if |Score| >= 60, Hold for exactly 1 Candle (Polymarket Strict Settlement)
    results = []
    for name, arr in scores.items():
        hits = 0; total = 0
        total_profit = 0.0
        for i in range(50, N-1):
            if arr[i] >= 60:
                prof = (close[i+1] - close[i]) / close[i] * 100
                total_profit += prof
                if prof > 0: hits += 1
                total += 1
            elif arr[i] <= -60:
                prof = (close[i] - close[i+1]) / close[i] * 100
                total_profit += prof
                if prof > 0: hits += 1
                total += 1
                
        wr = hits/total*100 if total > 0 else 0
        results.append((name, wr, total_profit, total, hits))
        
    # Sort by WinRate descending
    results.sort(key=lambda x: x[1], reverse=True)
    
    print(f"| {'Indicator'.ljust(20)} | {'Win Rate'.ljust(8)} | {'Net PnL'.ljust(8)} | {'Signals'.ljust(7)} |")
    print(f"|{'-'*22}|{'-'*10}|{'-'*10}|{'-'*9}|")
    for r in results:
        wr_str = f"{r[1]:.2f}%"
        pnl_str = f"{r[2]:+.2f}%"
        print(f"| {r[0].ljust(20)} | {wr_str.ljust(8)} | {pnl_str.rjust(8)} | {str(r[3]).rjust(7)} |")

if __name__ == "__main__":
    mine_alphas("15m")
    mine_alphas("1h")
    mine_alphas("4h")
