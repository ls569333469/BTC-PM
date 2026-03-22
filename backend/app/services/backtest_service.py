"""
Backtest Service — save predictions, resolve expired ones, aggregate stats.
Port from backtest.js (303 lines) to Python with SQLAlchemy async.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy import select, update, func, and_, case, literal, cast, Date
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.prediction import PredictionRecord
from app.clients.binance_client import get_binance_client

# Timeframe → minutes
TF_MINUTES = {
    "30m": 30, "1h": 60, "2h": 120, "4h": 240,
    "8h": 480, "12h": 720, "24h": 1440,
}


def grade_accuracy(pred_direction: str, pred_current_price: float,
                   pred_target_price: float, actual_price: float) -> dict:
    """
    Grade a resolved prediction. Port of gradeAccuracy() from JS.
    """
    actual_diff = actual_price - pred_current_price
    actual_diff_pct = (actual_diff / pred_current_price * 100) if pred_current_price > 0 else 0

    direction_correct = (
        (pred_direction == "up" and actual_diff > 0) or
        (pred_direction == "down" and actual_diff < 0) or
        (pred_direction == "sideways" and abs(actual_diff_pct) < 0.2)
    )

    target_error = abs(actual_price - pred_target_price)
    target_error_pct = (target_error / pred_current_price * 100) if pred_current_price > 0 else 0

    grade = "MISS"
    if direction_correct:
        if target_error_pct < 0.1:
            grade = "EXACT"
        elif target_error_pct < 0.3:
            grade = "CLOSE"
        else:
            grade = "HIT"

    return {
        "direction_correct": direction_correct,
        "grade": grade,
        "target_error_pct": round(target_error_pct, 2),
    }


class BacktestService:
    """Handles prediction persistence and resolution."""

    def __init__(self):
        self.binance = get_binance_client()

    async def save_predictions(self, db: AsyncSession, data: dict) -> dict:
        """
        Save a batch of predictions to the database.
        Port of POST /api/backtest/save.
        """
        predictions = data.get("predictions", [])
        guides = data.get("guides", [])
        timestamp_str = data.get("timestamp")

        if not predictions:
            return {"saved": 0, "skipped": 0, "error": "predictions array required"}

        pred_time = datetime.fromisoformat(timestamp_str) if timestamp_str else datetime.now(timezone.utc)
        saved = 0
        skipped = 0

        for pred in predictions:
            tf_minutes = TF_MINUTES.get(pred.get("timeframe"))
            if not tf_minutes:
                skipped += 1
                continue

            resolve_target_time = pred_time + timedelta(minutes=tf_minutes)

            # Match guide for this timeframe
            guide = next(
                (g for g in (guides or []) if g.get("analysisTimeframe") == pred.get("timeframe")),
                None,
            )

            values = {
                "prediction_time": pred_time,
                "timeframe": pred["timeframe"],
                "direction": pred["direction"],
                "target_price": pred["targetPrice"],
                "current_price": pred.get("currentPrice", 0),
                "win_rate": pred.get("winRate", 50),
                "weight_class": pred.get("weightClass"),
                "factor_scores": pred.get("factorScores"),
                "pm_action": guide.get("action") if guide else None,
                "pm_above_prob": guide.get("aboveProb") if guide else None,
                "pm_base_price": guide.get("basePrice") if guide else None,
                "pm_edge": guide.get("edge") if guide else None,
                "resolved": False,
                "resolve_target_time": resolve_target_time,
            }

            try:
                stmt = (
                    pg_insert(PredictionRecord)
                    .values(**values)
                    .on_conflict_do_nothing(
                        constraint="uq_prediction_time_tf"
                    )
                )
                result = await db.execute(stmt)
                if result.rowcount > 0:
                    saved += 1
                else:
                    skipped += 1  # Duplicate, silently skipped
            except Exception:
                skipped += 1

        return {"saved": saved, "skipped": skipped}

    async def resolve_predictions(self, db: AsyncSession) -> dict:
        """
        Resolve all expired pending predictions using current BTC price.
        Port of POST /api/backtest/resolve.
        """
        # Get current BTC price
        try:
            current_price = await self.binance.get_ticker_price("BTCUSDT")
        except Exception as e:
            return {"error": f"Failed to fetch current price: {e}", "resolved": 0, "results": []}

        if current_price <= 0:
            return {"error": "Invalid current price", "resolved": 0, "results": []}

        # Find all unresolved predictions whose window has expired
        now = datetime.now(timezone.utc)
        stmt = (
            select(PredictionRecord)
            .where(
                and_(
                    PredictionRecord.resolved == False,
                    PredictionRecord.resolve_target_time <= now,
                )
            )
            .limit(200)
        )
        result = await db.execute(stmt)
        pending = result.scalars().all()

        resolved = 0
        results = []

        for record in pending:
            grading = grade_accuracy(
                record.direction, record.current_price,
                record.target_price, current_price,
            )

            record.resolved = True
            record.actual_price = round(current_price, 2)
            record.direction_correct = grading["direction_correct"]
            record.accuracy_grade = grading["grade"]
            record.target_error_pct = grading["target_error_pct"]

            resolved += 1
            results.append({
                "id": record.id,
                "timeframe": record.timeframe,
                "direction": record.direction,
                "grade": grading["grade"],
                "direction_correct": grading["direction_correct"],
                "target_error_pct": grading["target_error_pct"],
            })

        return {
            "resolved": resolved,
            "currentPrice": round(current_price, 2),
            "results": results,
        }

    async def get_stats(self, db: AsyncSession) -> dict:
        """
        Aggregated backtest statistics.
        Port of GET /api/backtest/stats (raw SQL → SQLAlchemy).
        """
        # Overall stats
        overall_stmt = select(
            func.count(PredictionRecord.id).label("total"),
            func.count(PredictionRecord.id).filter(PredictionRecord.resolved == True).label("resolved"),
            func.count(PredictionRecord.id).filter(PredictionRecord.resolved == False).label("pending"),
            func.count(PredictionRecord.id).filter(PredictionRecord.direction_correct == True).label("hits"),
            func.count(PredictionRecord.id).filter(PredictionRecord.accuracy_grade == "EXACT").label("exact_count"),
            func.count(PredictionRecord.id).filter(PredictionRecord.accuracy_grade == "CLOSE").label("close_count"),
            func.count(PredictionRecord.id).filter(PredictionRecord.accuracy_grade == "HIT").label("hit_count"),
            func.count(PredictionRecord.id).filter(PredictionRecord.accuracy_grade == "MISS").label("miss_count"),
            func.avg(PredictionRecord.target_error_pct).filter(PredictionRecord.resolved == True).label("avg_error_pct"),
        )
        result = await db.execute(overall_stmt)
        row = result.one()

        total = row.total or 0
        resolved_count = row.resolved or 0
        hits = row.hits or 0
        hit_rate = round((hits / resolved_count * 100), 1) if resolved_count > 0 else 0
        avg_error = round(float(row.avg_error_pct or 0), 2)

        # By timeframe
        by_tf_stmt = (
            select(
                PredictionRecord.timeframe,
                func.count(PredictionRecord.id).label("total"),
                func.count(PredictionRecord.id).filter(PredictionRecord.resolved == True).label("resolved"),
                func.count(PredictionRecord.id).filter(PredictionRecord.direction_correct == True).label("hits"),
                func.avg(PredictionRecord.target_error_pct).filter(PredictionRecord.resolved == True).label("avg_error"),
            )
            .group_by(PredictionRecord.timeframe)
        )
        tf_result = await db.execute(by_tf_stmt)
        by_timeframe = []
        for tf_row in tf_result.all():
            tf_resolved = tf_row.resolved or 0
            tf_hits = tf_row.hits or 0
            by_timeframe.append({
                "timeframe": tf_row.timeframe,
                "total": tf_row.total,
                "hit_rate": round((tf_hits / tf_resolved * 100), 1) if tf_resolved > 0 else 0,
                "avg_error": round(float(tf_row.avg_error or 0), 2),
            })

        # Sort timeframes
        tf_order = {"30m": 1, "1h": 2, "2h": 3, "4h": 4, "8h": 5, "12h": 6, "24h": 7}
        by_timeframe.sort(key=lambda x: tf_order.get(x["timeframe"], 8))

        # By direction
        by_dir_stmt = (
            select(
                PredictionRecord.direction,
                func.count(PredictionRecord.id).label("total"),
                func.count(PredictionRecord.id).filter(PredictionRecord.resolved == True).label("resolved"),
                func.count(PredictionRecord.id).filter(PredictionRecord.direction_correct == True).label("hits"),
            )
            .group_by(PredictionRecord.direction)
        )
        dir_result = await db.execute(by_dir_stmt)
        by_direction = []
        for d_row in dir_result.all():
            d_resolved = d_row.resolved or 0
            d_hits = d_row.hits or 0
            by_direction.append({
                "direction": d_row.direction,
                "total": d_row.total,
                "hit_rate": round((d_hits / d_resolved * 100), 1) if d_resolved > 0 else 0,
            })

        # Recent resolved predictions (last 20)
        recent_stmt = (
            select(PredictionRecord)
            .where(PredictionRecord.resolved == True)
            .order_by(PredictionRecord.resolve_target_time.desc())
            .limit(20)
        )
        recent_result = await db.execute(recent_stmt)
        recent = [
            {
                "prediction_time": r.prediction_time.isoformat() if r.prediction_time else "",
                "timeframe": r.timeframe,
                "direction": r.direction,
                "target_price": r.target_price,
                "actual_price": r.actual_price,
                "accuracy_grade": r.accuracy_grade,
                "target_error_pct": r.target_error_pct,
            }
            for r in recent_result.scalars().all()
        ]

        # Daily trend (last 7 days) — port of JS trendResult query
        seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
        trend_stmt = (
            select(
                cast(PredictionRecord.prediction_time, Date).label("date"),
                func.count(PredictionRecord.id).filter(PredictionRecord.resolved == True).label("sample_size"),
                func.count(PredictionRecord.id).filter(PredictionRecord.direction_correct == True).label("hits"),
            )
            .where(PredictionRecord.prediction_time >= seven_days_ago)
            .group_by(cast(PredictionRecord.prediction_time, Date))
            .order_by(cast(PredictionRecord.prediction_time, Date).desc())
        )
        trend_result = await db.execute(trend_stmt)
        trend = [
            {
                "date": str(t_row.date),
                "sample_size": t_row.sample_size or 0,
                "hits": t_row.hits or 0,
                "hit_rate": round((t_row.hits / t_row.sample_size * 100), 1) if (t_row.sample_size or 0) > 0 else 0,
            }
            for t_row in trend_result.all()
        ]

        return {
            "overall": {
                "total": total,
                "resolved": resolved_count,
                "pending": row.pending or 0,
                "hits": hits,
                "hit_rate": hit_rate,
                "exact_count": row.exact_count or 0,
                "close_count": row.close_count or 0,
                "avg_error_pct": avg_error,
            },
            "byTimeframe": {tf["timeframe"]: tf for tf in by_timeframe},
            "byDirection": {d["direction"]: d for d in by_direction},
            "trend": trend,
            "recentPredictions": recent,
        }
