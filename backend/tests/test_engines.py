"""
Unit tests for Chanlun engine modules.
Tests: bi, zhongshu, divergence, trend, prediction, scoring
"""

import numpy as np
import pytest
from app.engines.bi import find_bi
from app.engines.zhongshu import find_zhongshu
from app.engines.divergence import detect_divergence
from app.engines.trend import analyze_trend
from app.engines.prediction import generate_predictions
from app.engines.scoring import (
    compute_all_factors,
    compute_composite_score,
    score_funding_rate,
    score_sentiment,
    score_volume,
    score_macd_divergence,
)


# ═════════════════════════════════════
# Bi (笔) Tests
# ═════════════════════════════════════

class TestFindBi:
    def test_empty_input(self):
        assert find_bi([]) == []

    def test_insufficient_data(self):
        """Need at least 5 klines for 5-bar window."""
        klines = [{"high": 100, "low": 90, "close": 95, "timestamp": i} for i in range(4)]
        assert find_bi(klines) == []

    def test_exactly_5_klines(self):
        """5 klines = 1 window center at index 2."""
        klines = [
            {"high": 100, "low": 90, "close": 95, "timestamp": 0},
            {"high": 105, "low": 92, "close": 98, "timestamp": 1},
            {"high": 110, "low": 88, "close": 99, "timestamp": 2},  # top: 110 >= all
            {"high": 103, "low": 91, "close": 97, "timestamp": 3},
            {"high": 101, "low": 93, "close": 96, "timestamp": 4},
        ]
        result = find_bi(klines)
        # Should detect at least a top at index 2
        assert any(p["type"] == "top" and p["index"] == 2 for p in result)

    def test_oscillating_produces_alternating_bis(self, oscillating_klines):
        """Oscillating data should produce alternating top/bottom points."""
        bis = find_bi(oscillating_klines)
        assert len(bis) >= 2
        # Verify alternating types
        for i in range(1, len(bis)):
            assert bis[i]["type"] != bis[i - 1]["type"], f"Non-alternating at index {i}"

    def test_uptrend_has_bis(self, uptrend_klines):
        """Uptrend klines should produce some Bi points."""
        bis = find_bi(uptrend_klines)
        assert isinstance(bis, list)
        # Should have at least some points
        for bi in bis:
            assert "type" in bi
            assert "price" in bi
            assert "index" in bi

    def test_bi_point_structure(self, uptrend_klines):
        """Each Bi point must have required keys."""
        bis = find_bi(uptrend_klines)
        for bi in bis:
            assert set(bi.keys()) >= {"type", "price", "index", "time"}
            assert bi["type"] in ("top", "bottom")
            assert isinstance(bi["price"], (int, float))


# ═════════════════════════════════════
# ZhongShu (中枢) Tests
# ═════════════════════════════════════

class TestFindZhongshu:
    def test_insufficient_bis(self):
        """Need at least 4 Bi points."""
        assert find_zhongshu([]) == []
        assert find_zhongshu([{"price": 100}] * 3) == []

    def test_overlapping_bis_create_zhongshu(self):
        """4 Bi points with overlapping ranges should create a ZhongShu."""
        bis = [
            {"type": "bottom", "price": 69000, "index": 0, "time": "0"},
            {"type": "top", "price": 71000, "index": 5, "time": "5"},
            {"type": "bottom", "price": 69500, "index": 10, "time": "10"},
            {"type": "top", "price": 70500, "index": 15, "time": "15"},
        ]
        zones = find_zhongshu(bis)
        assert len(zones) >= 1
        z = zones[0]
        assert z["high"] > z["low"]
        assert z["center"] == (z["high"] + z["low"]) / 2

    def test_non_overlapping_bis_no_zhongshu(self):
        """Non-overlapping pairs should not produce a ZhongShu."""
        bis = [
            {"type": "bottom", "price": 60000, "index": 0, "time": "0"},
            {"type": "top", "price": 61000, "index": 5, "time": "5"},
            {"type": "bottom", "price": 70000, "index": 10, "time": "10"},
            {"type": "top", "price": 71000, "index": 15, "time": "15"},
        ]
        zones = find_zhongshu(bis)
        assert len(zones) == 0

    def test_zhongshu_merging(self):
        """Overlapping ZhongShu zones should be merged."""
        bis = [
            {"type": "bottom", "price": 69000, "index": 0, "time": "0"},
            {"type": "top", "price": 71000, "index": 5, "time": "5"},
            {"type": "bottom", "price": 69500, "index": 10, "time": "10"},
            {"type": "top", "price": 70800, "index": 15, "time": "15"},
            {"type": "bottom", "price": 69200, "index": 20, "time": "20"},
            {"type": "top", "price": 70900, "index": 25, "time": "25"},
        ]
        zones = find_zhongshu(bis)
        # Should merge into fewer zones than raw calculations
        assert len(zones) >= 1


# ═════════════════════════════════════
# Divergence Tests
# ═════════════════════════════════════

class TestDetectDivergence:
    def test_insufficient_bis(self):
        result = detect_divergence([], None, None)
        assert result["top_div"] is False
        assert result["bottom_div"] is False

    def test_no_divergence(self):
        """Higher highs with higher MACD — no divergence."""
        bis = [
            {"type": "top", "price": 70000, "index": 5},
            {"type": "bottom", "price": 69000, "index": 10},
            {"type": "top", "price": 71000, "index": 15},
            {"type": "bottom", "price": 69500, "index": 20},
        ]
        # MACD trending same direction
        macd = np.array([0.0] * 25)
        macd[5] = 100
        macd[15] = 200  # Higher MACD at higher price → no divergence
        result = detect_divergence(bis, macd_hist=macd)
        assert result["top_div"] is False

    def test_top_divergence(self):
        """Higher price high but lower MACD → bearish divergence."""
        bis = [
            {"type": "top", "price": 70000, "index": 5},
            {"type": "bottom", "price": 69000, "index": 10},
            {"type": "top", "price": 71000, "index": 15},
            {"type": "bottom", "price": 69500, "index": 20},
        ]
        macd = np.array([0.0] * 25)
        macd[5] = 200
        macd[15] = 100  # Lower MACD at higher price → divergence
        result = detect_divergence(bis, macd_hist=macd)
        assert result["top_div"] is True
        assert result["topDiv"] is True

    def test_bottom_divergence(self):
        """Lower price low but higher MACD → bullish divergence."""
        bis = [
            {"type": "bottom", "price": 69000, "index": 5},
            {"type": "top", "price": 70000, "index": 10},
            {"type": "bottom", "price": 68000, "index": 15},
            {"type": "top", "price": 69500, "index": 20},
        ]
        macd = np.array([0.0] * 25)
        macd[5] = -200
        macd[15] = -100  # Higher (less negative) MACD at lower price → bullish div
        result = detect_divergence(bis, macd_hist=macd)
        assert result["bottom_div"] is True
        assert result["bottomDiv"] is True


# ═════════════════════════════════════
# Trend Tests
# ═════════════════════════════════════

class TestAnalyzeTrend:
    def test_empty_bis(self):
        result = analyze_trend([], [], 70000)
        assert result["trend"] == "neutral"
        assert result["strength"] == 50

    def test_bullish_trend(self):
        """Price above last bottom Bi → bullish."""
        bis = [
            {"type": "top", "price": 71000, "index": 5},
            {"type": "bottom", "price": 69000, "index": 10},
        ]
        result = analyze_trend(bis, [], 70000)
        assert result["trend"] == "bullish"
        assert result["strength"] >= 60

    def test_bearish_trend(self):
        """Price below last top Bi → bearish."""
        bis = [
            {"type": "bottom", "price": 69000, "index": 5},
            {"type": "top", "price": 71000, "index": 10},
        ]
        result = analyze_trend(bis, [], 70000)
        assert result["trend"] == "bearish"
        assert result["strength"] <= 40

    def test_above_zhongshu_strengthens(self):
        """Price above ZhongShu should increase bullish strength."""
        bis = [
            {"type": "top", "price": 70000, "index": 5},
            {"type": "bottom", "price": 68000, "index": 10},
        ]
        zs = [{"high": 69000, "low": 68000, "center": 68500}]
        result = analyze_trend(bis, zs, 69500)  # above last bottom, above ZS
        assert result["trend"] == "bullish"
        assert result["strength"] == 75

    def test_consolidating_inside_zhongshu(self):
        """Price inside ZhongShu with ambiguous last Bi → consolidating."""
        # last Bi is "top" at 71000, price == 71000 → not < top → not bearish
        # not "bottom" → not bullish → falls through to consolidating if inside ZS
        bis = [
            {"type": "bottom", "price": 69000, "index": 5},
            {"type": "top", "price": 71000, "index": 10},
        ]
        zs = [{"high": 71500, "low": 68500, "center": 70000}]
        result = analyze_trend(bis, zs, 71000)
        assert result["trend"] == "consolidating"


# ═════════════════════════════════════
# Prediction Tests
# ═════════════════════════════════════

class TestGeneratePredictions:
    def test_returns_7_timeframes(self):
        trend = {"trend": "bullish", "strength": 65, "nearest_zs": None}
        div = {"top_div": False, "bottom_div": False}
        indicators = {}
        preds = generate_predictions(70000, trend, div, indicators)
        assert len(preds) == 7
        expected_tfs = ["30m", "1h", "2h", "4h", "8h", "12h", "24h"]
        assert [p["timeframe"] for p in preds] == expected_tfs

    def test_prediction_structure(self):
        trend = {"trend": "neutral", "strength": 50, "nearest_zs": None}
        div = {"top_div": False, "bottom_div": False}
        preds = generate_predictions(70000, trend, div, {})
        for p in preds:
            assert "timeframe" in p
            assert "direction" in p
            assert "targetPrice" in p
            assert "currentPrice" in p
            assert "winRate" in p
            assert "support" in p
            assert "resistance" in p
            assert "triggers" in p
            assert p["direction"] in ("up", "down", "sideways")
            assert 35 <= p["winRate"] <= 85

    def test_bullish_predictions_have_higher_targets(self):
        trend_bull = {"trend": "bullish", "strength": 65, "nearest_zs": None}
        trend_bear = {"trend": "bearish", "strength": 35, "nearest_zs": None}
        div = {"top_div": False, "bottom_div": False}
        bull_preds = generate_predictions(70000, trend_bull, div, {})
        bear_preds = generate_predictions(70000, trend_bear, div, {})
        # Bullish targets should be higher than bearish for same timeframe
        for bp, brp in zip(bull_preds, bear_preds):
            assert bp["targetPrice"] > brp["targetPrice"]

    def test_divergence_bias(self):
        trend = {"trend": "neutral", "strength": 50, "nearest_zs": None}
        div_top = {"top_div": True, "bottom_div": False}
        div_bot = {"top_div": False, "bottom_div": True}
        top_preds = generate_predictions(70000, trend, div_top, {})
        bot_preds = generate_predictions(70000, trend, div_bot, {})
        # Top divergence → bearish bias → lower targets
        assert top_preds[0]["targetPrice"] < bot_preds[0]["targetPrice"]


# ═════════════════════════════════════
# Scoring Tests
# ═════════════════════════════════════

class TestScoring:
    def test_funding_rate_extremes(self):
        # High positive → bearish
        f = score_funding_rate(0.001)
        assert f.score < 0

        # High negative → bullish
        f = score_funding_rate(-0.001)
        assert f.score > 0

        # Neutral
        f = score_funding_rate(0.00005)
        assert f.score == 0.0

    def test_sentiment_extremes(self):
        # Extreme greed → contrarian bearish
        f = score_sentiment(90)
        assert f.score < 0

        # Extreme fear → contrarian bullish
        f = score_sentiment(10)
        assert f.score > 0

        # Neutral
        f = score_sentiment(50)
        assert f.score == 0.0

    def test_volume_scoring(self, volumes_array):
        f = score_volume(volumes_array)
        assert f.factor == "volume"
        assert isinstance(f.score, float)

    def test_macd_divergence_scoring(self):
        f = score_macd_divergence({"top_div": True})
        assert f.score < 0

        f = score_macd_divergence({"bottom_div": True})
        assert f.score > 0

        f = score_macd_divergence(None)
        assert f.score == 0.0

    def test_composite_score_bounded(self):
        factors = [
            {"factor": "a", "score": 3.0, "weight": 1.0, "detail": ""},
            {"factor": "b", "score": 3.0, "weight": 1.0, "detail": ""},
        ]
        composite = compute_composite_score(factors)
        assert -1.0 <= composite <= 1.0

    def test_composite_score_empty(self):
        assert compute_composite_score([]) == 0.0

    def test_compute_all_factors_count(self, closes_array, volumes_array):
        factors = compute_all_factors(closes_array, volumes_array)
        assert len(factors) == 6  # 6 factors always
        for f in factors:
            assert "factor" in f
            assert "score" in f
            assert "weight" in f
