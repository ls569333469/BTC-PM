"""
Pydantic schemas for Polymarket API.
"""

from pydantic import BaseModel
from typing import Optional


class PolymarketEvent(BaseModel):
    slug: str
    title: str
    timeframe: str
    up_prob: Optional[float] = None
    down_prob: Optional[float] = None
    implied_price: Optional[float] = None
    volume: Optional[float] = None
    base_price: Optional[float] = None


class PolymarketPricesResponse(BaseModel):
    """Response for GET /api/polymarket-prices/prices"""
    timeframes: list[PolymarketEvent]
    current_btc_price: float
    timestamp: str
