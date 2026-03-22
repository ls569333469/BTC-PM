"""
Constants used across the application.
"""

# Timeframes for predictions
TIMEFRAMES = ["30m", "1h", "2h", "4h", "8h", "12h", "24h"]

# Timeframe duration in minutes
TIMEFRAME_MINUTES = {
    "30m": 30,
    "1h": 60,
    "2h": 120,
    "4h": 240,
    "8h": 480,
    "12h": 720,
    "24h": 1440,
}

# Weight classes for different timeframes
WEIGHT_CLASSES = {
    "30m": "1H",
    "1h": "1H",
    "2h": "4H",
    "4h": "4H",
    "8h": "1D",
    "12h": "1D",
    "24h": "1D",
}

# Accuracy grading thresholds
GRADE_EXACT_THRESHOLD = 0.001   # < 0.1% error
GRADE_CLOSE_THRESHOLD = 0.003   # < 0.3% error

# Factor scoring
FACTOR_NAMES = [
    "macd_divergence",
    "volume",
    "bbands",
    "funding_rate",
    "sentiment",
    "rsi",
]

# Win rate bounds
WIN_RATE_MIN = 35
WIN_RATE_MAX = 85
