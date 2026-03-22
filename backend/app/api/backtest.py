"""
Backtest API routes — full implementation.
Matches Express: POST /api/backtest/save, POST /api/backtest/resolve, GET /api/backtest/stats
"""

import logging
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

from app.models.base import get_db
from app.services.backtest_service import BacktestService

router = APIRouter(prefix="/api/backtest", tags=["backtest"])

_service = BacktestService()


@router.post("/save")
async def save_predictions(request: Request, db: AsyncSession = Depends(get_db)):
    """Save a batch of predictions to the database."""
    try:
        body = await request.json()
        result = await _service.save_predictions(db, body)
        return result
    except Exception as e:
        logger.exception("Failed to save predictions")
        return {"error": str(e), "saved": 0, "skipped": 0}


@router.post("/resolve")
async def resolve_predictions(db: AsyncSession = Depends(get_db)):
    """Resolve expired predictions against actual prices."""
    try:
        result = await _service.resolve_predictions(db)
        return result
    except Exception as e:
        logger.exception("Failed to resolve predictions")
        return {"error": str(e), "resolved": 0, "results": []}


@router.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db)):
    """Get aggregated backtest statistics."""
    try:
        result = await _service.get_stats(db)
        return result
    except Exception as e:
        logger.exception("Failed to get backtest stats")
        return {
            "error": str(e),
            "overall": {"total": 0, "resolved": 0, "pending": 0, "hits": 0,
                        "hit_rate": 0, "exact_count": 0, "close_count": 0, "avg_error_pct": 0},
            "byTimeframe": {},
            "byDirection": {},
            "recentPredictions": [],
        }
