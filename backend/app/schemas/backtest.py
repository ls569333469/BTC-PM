"""
Pydantic schemas for Backtest API.
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PredictionSaveItem(BaseModel):
    timeframe: str
    direction: str
    target_price: float
    current_price: float
    win_rate: int
    weight_class: Optional[str] = None
    factor_scores: Optional[dict] = None
    pm_action: Optional[str] = None
    pm_above_prob: Optional[float] = None
    pm_base_price: Optional[float] = None
    pm_edge: Optional[float] = None


class BacktestSaveRequest(BaseModel):
    timestamp: str
    predictions: list[PredictionSaveItem]
    guides: Optional[list[dict]] = None


class BacktestSaveResponse(BaseModel):
    saved: int
    skipped: int


class ResolveResult(BaseModel):
    timeframe: str
    direction: str
    direction_correct: bool
    accuracy_grade: str
    target_error_pct: float


class BacktestResolveResponse(BaseModel):
    resolved: int
    results: list[ResolveResult]


class TimeframeStats(BaseModel):
    timeframe: str
    total: int
    hit_rate: float
    avg_error: float


class DirectionStats(BaseModel):
    direction: str
    total: int
    hit_rate: float


class RecentPrediction(BaseModel):
    prediction_time: str
    timeframe: str
    direction: str
    target_price: float
    actual_price: Optional[float] = None
    accuracy_grade: Optional[str] = None
    target_error_pct: Optional[float] = None


class BacktestStatsResponse(BaseModel):
    """Response for GET /api/backtest/stats"""
    total_predictions: int
    resolved_count: int
    hit_rate: float
    avg_error_pct: float
    exact_count: int
    close_count: int
    hit_count: int
    miss_count: int
    by_timeframe: list[TimeframeStats]
    by_direction: list[DirectionStats]
    recent: list[RecentPrediction]
