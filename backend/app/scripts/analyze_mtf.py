import sqlite3
import argparse
import os
from collections import defaultdict

# Setup paths
import sys
backend_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_PATH = os.path.join(backend_root, "historical_klines.db")

def print_separator():
    print("-" * 60)

def main():
    parser = argparse.ArgumentParser(description="Analyze MTF Resonance Backtest Results")
    parser.add_argument("--min-score", type=int, default=0, help="Minimum composite win rate (score) to consider")
    parser.add_argument("--score-type", type=str, default="composite", choices=["composite", "chanlun", "factor"], help="Which score dimension to filter by")
    parser.add_argument("--tf", type=str, default="all", help="Filter by specific timeframe (e.g., 15m, 1h), default: all")
    parser.add_argument("--exclude-news", action="store_true", help="Exclude periods flagged as news anomaly")
    
    args = parser.parse_args()
    
    if not os.path.exists(DB_PATH):
        print(f"Error: Database not found at {DB_PATH}. Please run run_mtf_backtest.py first.")
        return

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    score_column = "composite_win_rate"
    if args.score_type == "chanlun": score_column = "chanlun_win_rate"
    elif args.score_type == "factor": score_column = "factor_win_rate"
    
    # Base query for MTF table
    query = f"SELECT timeframe, direction_correct, accuracy_grade, error_pct, {score_column}, is_news_anomaly FROM mtf_backtest_results WHERE {score_column} >= ?"
    params = [args.min_score]
    
    if args.tf != "all":
        query += " AND timeframe = ?"
        params.append(args.tf)
        
    if args.exclude_news:
        query += " AND is_news_anomaly = 0"
        
    c.execute(query, params)
    rows = c.fetchall()
    
    if not rows:
        print(f"No results found matching Criteria: Score >= {args.min_score}")
        return
        
    total_samples = len(rows)
    hits = sum(1 for r in rows if r[1])  # direction_correct == True
    
    # Calculate Up/Down breakdown
    c.execute(f"SELECT direction, COUNT(*) FROM mtf_backtest_results WHERE {score_column} >= ? " + 
               ("AND timeframe = ? " if args.tf != "all" else "") + 
               ("AND is_news_anomaly = 0 " if args.exclude_news else "") + 
               "GROUP BY direction", params)
    dir_rows = c.fetchall()
    dir_str = " | ".join([f"{r[0].upper()}: {r[1]}" for r in dir_rows])
    
    print("\n" + "="*60)
    print(" 🌟 P7.5 GLOBAL MTF RESONANCE REPORT")
    print("="*60)
    print(f"Filter Criteria:")
    print(f" > Target Score Dimension  : {args.score_type.upper()}")
    print(f" > Min Algorithm Conviction: {args.min_score}")
    print(f" > Timeframe filter        : {args.tf.upper()}")
    print(f" > Exclude Anomaly/News    : {'Yes' if args.exclude_news else 'No'}")
    print_separator()
    
    print(f"Total Prediction Samples : {total_samples}")
    print(f"Directional Sentiment    : [ {dir_str} ]")
    print(f"OVERALL ACTUAL HIT RATE  : {(hits/total_samples*100):.2f}% ({hits}/{total_samples})")
    print_separator()
    
    # Detailed breakdown by Timeframe
    by_tf = defaultdict(lambda: {"total": 0, "hits": 0})
    for r in rows:
        tf = r[0]
        by_tf[tf]["total"] += 1
        if r[1]:
            by_tf[tf]["hits"] += 1
            
    print("Breakdown by Target Timeframe:")
    for tf, data in sorted(by_tf.items(), key=lambda x: x[1]["total"], reverse=True):
        rate = data['hits'] / data['total'] * 100
        print(f" - {tf.upper().ljust(4)}: {rate:6.2f}% ({data['hits']}/{data['total']} hits)")
        
    print_separator()
    print("End of Report\n")

if __name__ == "__main__":
    main()
