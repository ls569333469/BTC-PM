"""
Polymarket prices API routes — full implementation.
Matches Express: GET /api/polymarket-prices/prices
"""

from fastapi import APIRouter

from app.services.polymarket_service import PolymarketService

router = APIRouter(prefix="/api/polymarket-prices", tags=["polymarket"])

_service = PolymarketService()


@router.get("/prices")
async def get_prices():
    """Get multi-timeframe Polymarket BTC contract data."""
    try:
        result = await _service.get_prices()
        return result
    except Exception as e:
        return {"error": str(e), "timeframes": [], "events": [], "timestamp": ""}
