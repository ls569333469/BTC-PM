"""
Pydantic schemas for Chanlun analysis API responses.
Matches the exact JSON structure the frontend expects.
"""

from pydantic import BaseModel
from typing import Optional


class BiPoint(BaseModel):
    type: str          # 'top' or 'bottom'
    price: float
    index: int
    time: Optional[str] = None


class ZhongShu(BaseModel):
    high: float
    low: float
    start_index: int
    end_index: int
    start_time: Optional[str] = None
    end_time: Optional[str] = None


class Divergence(BaseModel):
    type: str          # 'top' or 'bottom'
    price: float
    macd_value: float
    index: int
    time: Optional[str] = None


class FactorScore(BaseModel):
    factor: str
    score: float       # [-3, +3]
    weight: float
    detail: str


class Prediction(BaseModel):
    timeframe: str             # '30m','1h','2h','4h','8h','12h','24h'
    direction: str             # 'up','down','sideways'
    target_price: float
    current_price: float
    win_rate: int              # 35-85
    chanlun_confidence: Optional[int] = None
    aux_win_rate: Optional[int] = None
    support: Optional[float] = None
    resistance: Optional[float] = None
    weight_class: Optional[str] = None
    factor_scores: Optional[list[FactorScore]] = None


class TrendAnalysis(BaseModel):
    trend: str                 # 'bullish','bearish','consolidating','neutral'
    strength: Optional[float] = None
    description: Optional[str] = None


class MarketIndicators(BaseModel):
    current_price: float
    rsi: Optional[float] = None
    macd: Optional[dict] = None
    bbands: Optional[dict] = None
    obv: Optional[float] = None
    atr: Optional[float] = None
    funding_rate: Optional[float] = None
    open_interest: Optional[float] = None
    fear_greed: Optional[int] = None
    fear_greed_label: Optional[str] = None


class KlinePoint(BaseModel):
    timestamp: int
    open: float
    high: float
    low: float
    close: float
    volume: float


class ChanlunAnalysisResponse(BaseModel):
    """Complete response for GET /api/chanlun/analysis"""
    bis: list[BiPoint]
    zhongshus: list[ZhongShu]
    divergences: list[Divergence]
    trend: TrendAnalysis
    predictions: list[Prediction]
    indicators: MarketIndicators
    klines: list[KlinePoint]
    analysis_time: str


class ValidationResult(BaseModel):
    timeframe: str
    direction: str
    predicted_price: float
    actual_price: float
    grade: str                 # 'EXACT','CLOSE','HIT','MISS'
    error_pct: float


class ChanlunValidationResponse(BaseModel):
    """Response for GET /api/chanlun/validate"""
    results: list[ValidationResult]
    overall_accuracy: float
