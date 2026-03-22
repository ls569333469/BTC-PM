"""
Service layer tests — test business logic in services.
Tests: backtest.grade_accuracy (pure function), polymarket guide generation.
"""

import pytest
from app.services.backtest_service import grade_accuracy, TF_MINUTES


# ═════════════════════════════════════
# grade_accuracy() — pure function, no mocks needed
# ═════════════════════════════════════

class TestGradeAccuracy:
    """Test the prediction grading function."""

    def test_exact_hit_up(self):
        """Direction correct + target within 0.1% → EXACT."""
        result = grade_accuracy(
            pred_direction="up",
            pred_current_price=70000,
            pred_target_price=70500,
            actual_price=70480,  # very close to target
        )
        assert result["direction_correct"] is True
        assert result["grade"] == "EXACT"
        assert result["target_error_pct"] < 0.1

    def test_close_hit_up(self):
        """Direction correct + target within 0.3% → CLOSE."""
        result = grade_accuracy(
            pred_direction="up",
            pred_current_price=70000,
            pred_target_price=70500,
            actual_price=70350,  # ~0.21% from target
        )
        assert result["direction_correct"] is True
        assert result["grade"] == "CLOSE"

    def test_hit_up(self):
        """Direction correct + target >0.3% away → HIT."""
        result = grade_accuracy(
            pred_direction="up",
            pred_current_price=70000,
            pred_target_price=70500,
            actual_price=71000,  # correct direction but far from target
        )
        assert result["direction_correct"] is True
        assert result["grade"] == "HIT"

    def test_miss_wrong_direction(self):
        """Direction wrong → MISS regardless of target proximity."""
        result = grade_accuracy(
            pred_direction="up",
            pred_current_price=70000,
            pred_target_price=70500,
            actual_price=69000,  # went down instead
        )
        assert result["direction_correct"] is False
        assert result["grade"] == "MISS"

    def test_down_direction_correct(self):
        """Predicted down + actual went down → direction_correct."""
        result = grade_accuracy(
            pred_direction="down",
            pred_current_price=70000,
            pred_target_price=69500,
            actual_price=69600,
        )
        assert result["direction_correct"] is True
        assert result["grade"] in ("EXACT", "CLOSE", "HIT")

    def test_down_direction_wrong(self):
        """Predicted down but went up → MISS."""
        result = grade_accuracy(
            pred_direction="down",
            pred_current_price=70000,
            pred_target_price=69500,
            actual_price=71000,
        )
        assert result["direction_correct"] is False
        assert result["grade"] == "MISS"

    def test_sideways_correct(self):
        """Predicted sideways + actual change < 0.2% → direction_correct."""
        result = grade_accuracy(
            pred_direction="sideways",
            pred_current_price=70000,
            pred_target_price=70000,
            actual_price=70100,  # 0.14% change
        )
        assert result["direction_correct"] is True

    def test_sideways_wrong(self):
        """Predicted sideways but big move → MISS."""
        result = grade_accuracy(
            pred_direction="sideways",
            pred_current_price=70000,
            pred_target_price=70000,
            actual_price=71000,  # 1.43% change
        )
        assert result["direction_correct"] is False
        assert result["grade"] == "MISS"

    def test_zero_price_no_crash(self):
        """Edge case: current price = 0 should not crash."""
        result = grade_accuracy(
            pred_direction="up",
            pred_current_price=0,
            pred_target_price=100,
            actual_price=50,
        )
        assert result["grade"] in ("HIT", "MISS", "CLOSE", "EXACT")
        assert result["target_error_pct"] == 0  # division guarded

    def test_target_error_pct_precision(self):
        """Target error pct should be rounded to 2 decimal places."""
        result = grade_accuracy(
            pred_direction="up",
            pred_current_price=70000,
            pred_target_price=70500,
            actual_price=70200,
        )
        assert isinstance(result["target_error_pct"], float)
        str_val = str(result["target_error_pct"])
        if "." in str_val:
            decimals = len(str_val.split(".")[1])
            assert decimals <= 2


# ═════════════════════════════════════
# TF_MINUTES mapping
# ═════════════════════════════════════

class TestTFMinutes:
    """Verify timeframe → minutes mapping is complete."""

    def test_all_7_timeframes(self):
        expected = {"30m", "1h", "2h", "4h", "8h", "12h", "24h"}
        assert set(TF_MINUTES.keys()) == expected

    def test_values_increasing(self):
        ordered = ["30m", "1h", "2h", "4h", "8h", "12h", "24h"]
        for i in range(1, len(ordered)):
            assert TF_MINUTES[ordered[i]] > TF_MINUTES[ordered[i - 1]]

    def test_specific_values(self):
        assert TF_MINUTES["30m"] == 30
        assert TF_MINUTES["1h"] == 60
        assert TF_MINUTES["4h"] == 240
        assert TF_MINUTES["24h"] == 1440


# ═════════════════════════════════════
# Polymarket Service — guide action logic
# ═════════════════════════════════════

class TestPolymarketGuideActions:
    """Test the guide action determination logic (extracted from service)."""

    @staticmethod
    def _compute_action(above_prob: float, direction: str) -> str:
        """Mirror the action logic from polymarket_service._generate_guides."""
        if above_prob >= 60 and direction == "up":
            return "看涨买入"
        elif above_prob <= 40 and direction == "down":
            return "看跌买入"
        else:
            return "观望"

    def test_bullish_signal(self):
        assert self._compute_action(65, "up") == "看涨买入"

    def test_bearish_signal(self):
        assert self._compute_action(35, "down") == "看跌买入"

    def test_neutral_signal(self):
        assert self._compute_action(50, "sideways") == "观望"

    def test_high_prob_but_wrong_direction(self):
        """High above_prob but direction is down → 观望."""
        assert self._compute_action(70, "down") == "观望"

    def test_low_prob_but_wrong_direction(self):
        """Low above_prob but direction is up → 观望."""
        assert self._compute_action(30, "up") == "观望"

    def test_borderline_60(self):
        """Exactly 60 with up → 看涨买入."""
        assert self._compute_action(60, "up") == "看涨买入"

    def test_borderline_40(self):
        """Exactly 40 with down → 看跌买入."""
        assert self._compute_action(40, "down") == "看跌买入"

    def test_borderline_59(self):
        """59 with up → 观望 (just under threshold)."""
        assert self._compute_action(59, "up") == "观望"


class TestPolymarketAboveProb:
    """Test the above_prob calculation logic (extracted from service)."""

    @staticmethod
    def _compute_above_prob(direction: str, win_rate: float,
                            predicted_delta_pct: float) -> float:
        """Mirror the above_prob logic from polymarket_service."""
        if direction == "up":
            above_prob = max(55, min(85, 50 + win_rate * 0.3 + predicted_delta_pct * 2))
        elif direction == "down":
            above_prob = max(15, min(45, 50 - win_rate * 0.3 + predicted_delta_pct * 2))
        else:
            above_prob = 50 + predicted_delta_pct * 1.5
        return round(max(10, min(90, above_prob)), 1)

    def test_bullish_high_confidence(self):
        """High win_rate + positive delta → high above_prob."""
        prob = self._compute_above_prob("up", 75, 1.5)
        assert prob >= 70

    def test_bearish_high_confidence(self):
        """High win_rate + negative delta → low above_prob."""
        prob = self._compute_above_prob("down", 75, -1.5)
        assert prob <= 30

    def test_sideways_neutral(self):
        """Sideways + zero delta → ~50."""
        prob = self._compute_above_prob("sideways", 50, 0)
        assert 45 <= prob <= 55

    def test_clamped_upper(self):
        """Should never exceed 90."""
        prob = self._compute_above_prob("up", 100, 50)
        assert prob <= 90

    def test_clamped_lower(self):
        """Should never go below 10."""
        prob = self._compute_above_prob("down", 100, -50)
        assert prob >= 10
