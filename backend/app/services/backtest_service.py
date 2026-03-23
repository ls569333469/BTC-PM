"""
Backtest Service — save predictions, resolve expired ones, aggregate stats.
Supports 3 independent backtest tracks: 缠论 / 6因子 / 综合操作.
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
    "5m": 5, "30m": 30, "1h": 60, "2h": 120, "4h": 240,
    "8h": 480, "12h": 720, "24h": 1440,
}


def grade_accuracy(pred_direction: str, pred_current_price: float,
                   pred_target_price: float, actual_price: float) -> dict:
    """
    Grade a resolved prediction.
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


def grade_factor_direction(factor_direction: str, actual_diff: float) -> bool:
    """因子方向是否正确: 因子说up→涨了？因子说down→跌了？"""
    if factor_direction == "neutral":
        return abs(actual_diff) < 50  # 因子说中性，实际波动很小算对
    return (
        (factor_direction == "up" and actual_diff > 0) or
        (factor_direction == "down" and actual_diff < 0)
    )


def grade_composite_action(pm_action: str, actual_diff: float) -> bool:
    """综合操作建议是否正确:
    看涨买入→涨了=对, 看跌买入→跌了=对, 观望→波动大=错/波动小=对
    """
    if pm_action == "看涨买入":
        return actual_diff > 0
    elif pm_action == "看跌买入":
        return actual_diff < 0
    elif pm_action == "观望":
        return abs(actual_diff) < 200  # 观望时波动<$200算对（避开了大波动）
    return False


class BacktestService:
    """Handles prediction persistence and resolution with 3-track backtesting."""

    def __init__(self):
        self.binance = get_binance_client()

    async def save_predictions(self, db: AsyncSession, data: dict) -> dict:
        """
        Save a batch of predictions to the database.
        Now saves 3 independent scores + directions.
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
                "win_rate": pred.get("compositeWinRate", pred.get("winRate", 50)),
                "weight_class": pred.get("weightClass"),
                "factor_scores": pred.get("factorScores"),
                # 3个独立评分
                "chanlun_win_rate": pred.get("chanlunWinRate"),
                "chanlun_direction": pred.get("chanlunDirection"),
                "factor_win_rate": pred.get("factorWinRate"),
                "factor_direction": pred.get("factorDirection"),
                "composite_win_rate": pred.get("compositeWinRate"),
                "composite_direction": pred.get("compositeDirection"),
                # PM data
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
                    skipped += 1
            except Exception:
                skipped += 1

        return {"saved": saved, "skipped": skipped}

    async def resolve_predictions(self, db: AsyncSession) -> dict:
        """
        Resolve all expired pending predictions with 3-track grading.
        """
        try:
            current_price = await self.binance.get_ticker_price("BTCUSDT")
        except Exception as e:
            return {"error": f"Failed to fetch current price: {e}", "resolved": 0, "results": []}

        if current_price <= 0:
            return {"error": "Invalid current price", "resolved": 0, "results": []}

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
            actual_diff = current_price - record.current_price

            # Track 1: 缠论判定（方向+价格精度）
            grading = grade_accuracy(
                record.direction, record.current_price,
                record.target_price, current_price,
            )

            record.resolved = True
            record.actual_price = round(current_price, 2)
            record.direction_correct = grading["direction_correct"]
            record.accuracy_grade = grading["grade"]
            record.target_error_pct = grading["target_error_pct"]

            # Track 2: 因子方向判定
            f_dir = record.factor_direction
            if f_dir:
                record.factor_direction_correct = grade_factor_direction(f_dir, actual_diff)
            else:
                record.factor_direction_correct = None

            # Track 3: 综合操作判定
            action = record.pm_action
            if action:
                record.composite_action_correct = grade_composite_action(action, actual_diff)
            else:
                record.composite_action_correct = None

            resolved += 1
            results.append({
                "id": record.id,
                "timeframe": record.timeframe,
                "direction": record.direction,
                "grade": grading["grade"],
                "direction_correct": grading["direction_correct"],
                "factor_direction_correct": record.factor_direction_correct,
                "composite_action_correct": record.composite_action_correct,
                "target_error_pct": grading["target_error_pct"],
            })

        return {
            "resolved": resolved,
            "currentPrice": round(current_price, 2),
            "results": results,
        }

    async def get_stats(self, db: AsyncSession) -> dict:
        """
        Aggregated backtest statistics with 3 independent tracks.
        """
        # Overall stats
        overall_stmt = select(
            func.count(PredictionRecord.id).label("total"),
            func.count(PredictionRecord.id).filter(PredictionRecord.resolved == True).label("resolved"),
            func.count(PredictionRecord.id).filter(PredictionRecord.resolved == False).label("pending"),
            # Track 1: 缠论
            func.count(PredictionRecord.id).filter(PredictionRecord.direction_correct == True).label("chanlun_hits"),
            # Track 2: 因子
            func.count(PredictionRecord.id).filter(PredictionRecord.factor_direction_correct == True).label("factor_hits"),
            # Track 3: 综合操作
            func.count(PredictionRecord.id).filter(PredictionRecord.composite_action_correct == True).label("composite_hits"),
            # Grades
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
        chanlun_hits = row.chanlun_hits or 0
        factor_hits = row.factor_hits or 0
        composite_hits = row.composite_hits or 0

        def rate(hits, total):
            return round((hits / total * 100), 1) if total > 0 else 0

        # By timeframe
        by_tf_stmt = (
            select(
                PredictionRecord.timeframe,
                func.count(PredictionRecord.id).label("total"),
                func.count(PredictionRecord.id).filter(PredictionRecord.resolved == True).label("resolved"),
                func.count(PredictionRecord.id).filter(PredictionRecord.direction_correct == True).label("chanlun_hits"),
                func.count(PredictionRecord.id).filter(PredictionRecord.factor_direction_correct == True).label("factor_hits"),
                func.count(PredictionRecord.id).filter(PredictionRecord.composite_action_correct == True).label("composite_hits"),
                func.avg(PredictionRecord.target_error_pct).filter(PredictionRecord.resolved == True).label("avg_error"),
            )
            .group_by(PredictionRecord.timeframe)
        )
        tf_result = await db.execute(by_tf_stmt)
        by_timeframe = []
        for tf_row in tf_result.all():
            tf_resolved = tf_row.resolved or 0
            by_timeframe.append({
                "timeframe": tf_row.timeframe,
                "total": tf_row.total,
                "chanlun_hit_rate": rate(tf_row.chanlun_hits or 0, tf_resolved),
                "factor_hit_rate": rate(tf_row.factor_hits or 0, tf_resolved),
                "composite_hit_rate": rate(tf_row.composite_hits or 0, tf_resolved),
                "avg_error": round(float(tf_row.avg_error or 0), 2),
            })

        # Sort timeframes (fix: add 5m)
        tf_order = {"5m": 0, "30m": 1, "1h": 2, "2h": 3, "4h": 4, "8h": 5, "12h": 6, "24h": 7}
        by_timeframe.sort(key=lambda x: tf_order.get(x["timeframe"], 8))

        # By direction
        by_dir_stmt = (
            select(
                PredictionRecord.direction,
                func.count(PredictionRecord.id).label("total"),
                func.count(PredictionRecord.id).filter(PredictionRecord.resolved == True).label("resolved"),
                func.count(PredictionRecord.id).filter(PredictionRecord.direction_correct == True).label("chanlun_hits"),
                func.count(PredictionRecord.id).filter(PredictionRecord.factor_direction_correct == True).label("factor_hits"),
            )
            .group_by(PredictionRecord.direction)
        )
        dir_result = await db.execute(by_dir_stmt)
        by_direction = []
        for d_row in dir_result.all():
            d_resolved = d_row.resolved or 0
            by_direction.append({
                "direction": d_row.direction,
                "total": d_row.total,
                "chanlun_hit_rate": rate(d_row.chanlun_hits or 0, d_resolved),
                "factor_hit_rate": rate(d_row.factor_hits or 0, d_resolved),
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
                "chanlun_correct": r.direction_correct,
                "factor_correct": r.factor_direction_correct,
                "composite_correct": r.composite_action_correct,
            }
            for r in recent_result.scalars().all()
        ]

        # Daily trend (last 7 days)
        seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
        trend_stmt = (
            select(
                cast(PredictionRecord.prediction_time, Date).label("date"),
                func.count(PredictionRecord.id).filter(PredictionRecord.resolved == True).label("sample_size"),
                func.count(PredictionRecord.id).filter(PredictionRecord.direction_correct == True).label("chanlun_hits"),
                func.count(PredictionRecord.id).filter(PredictionRecord.factor_direction_correct == True).label("factor_hits"),
                func.count(PredictionRecord.id).filter(PredictionRecord.composite_action_correct == True).label("composite_hits"),
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
                "chanlun_hit_rate": rate(t_row.chanlun_hits or 0, t_row.sample_size or 0),
                "factor_hit_rate": rate(t_row.factor_hits or 0, t_row.sample_size or 0),
                "composite_hit_rate": rate(t_row.composite_hits or 0, t_row.sample_size or 0),
            }
            for t_row in trend_result.all()
        ]

        return {
            "overall": {
                "total": total,
                "resolved": resolved_count,
                "pending": row.pending or 0,
                "chanlunHitRate": rate(chanlun_hits, resolved_count),
                "factorHitRate": rate(factor_hits, resolved_count),
                "compositeHitRate": rate(composite_hits, resolved_count),
                "exact_count": row.exact_count or 0,
                "close_count": row.close_count or 0,
                "avg_error_pct": round(float(row.avg_error_pct or 0), 2),
            },
            "byTimeframe": {tf["timeframe"]: tf for tf in by_timeframe},
            "byDirection": {d["direction"]: d for d in by_direction},
            "trend": trend,
            "recentPredictions": recent,
        }
