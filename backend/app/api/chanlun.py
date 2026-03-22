"""
Chanlun analysis API routes.
Matches Express endpoints:
  GET /api/chanlun/analysis
  GET /api/chanlun/validate
"""

import json
import logging
from fastapi import APIRouter

logger = logging.getLogger(__name__)

from app.services.chanlun_service import ChanlunService
from app.clients.binance_client import get_binance_client

router = APIRouter(prefix="/api/chanlun", tags=["chanlun"])

_service = ChanlunService()


@router.get("/analysis")
async def get_analysis():
    """Full Chanlun analysis + 7-timeframe predictions."""
    try:
        result = await _service.full_analysis(symbol="BTC")
        return result
    except Exception as e:
        logger.exception("Chanlun analysis failed")
        return {"error": str(e), "predictions": [], "chanlun": {}}


@router.get("/validate")
async def validate_predictions(predictions: str = "[]"):
    """Validate previous round predictions against current price."""
    try:
        preds = json.loads(predictions)
        if not preds:
            return {"timestamp": "", "currentPrice": 0, "validations": []}

        # Fetch current price
        binance = get_binance_client()
        current_price = await binance.get_ticker_price("BTCUSDT")

        validations = []
        for pred in preds:
            pred_price = pred.get("currentPrice", 0)
            if pred_price == 0:
                continue

            diff = current_price - pred_price
            direction = pred.get("direction", "sideways")
            correct = (
                (direction == "up" and diff > 0) or
                (direction == "down" and diff < 0) or
                (direction == "sideways" and abs(diff / pred_price) < 0.002)
            )

            validations.append({
                "timeframe": pred.get("timeframe", ""),
                "predictedDirection": direction,
                "predictedTarget": pred.get("targetPrice", 0),
                "actualPrice": round(current_price, 2),
                "actualChange": round(diff, 2),
                "actualChangePct": round((diff / pred_price) * 100, 2),
                "correct": correct,
                "accuracy": "HIT" if correct else "MISS",
            })

        from datetime import datetime, timezone
        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "currentPrice": round(current_price, 2),
            "validations": validations,
        }
    except Exception as e:
        logger.exception("Prediction validation failed")
        return {"error": str(e), "validations": []}
