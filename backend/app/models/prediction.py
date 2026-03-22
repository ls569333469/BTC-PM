"""
SQLAlchemy model for prediction_records table.
Mirrors the Drizzle ORM schema from the Vibe project.
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, JSON, UniqueConstraint
)
from app.models.base import Base


class PredictionRecord(Base):
    """Stores each 15-minute BTC prediction and its backtest result."""

    __tablename__ = "prediction_records"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Prediction parameters
    prediction_time = Column(DateTime(timezone=True), nullable=False)
    timeframe = Column(String, nullable=False)           # '30m','1h','2h','4h','8h','12h','24h'
    direction = Column(String, nullable=False)            # 'up','down','sideways'
    target_price = Column(Float, nullable=False)
    current_price = Column(Float, nullable=False)
    win_rate = Column(Integer, nullable=False)            # Model confidence (35-85)
    weight_class = Column(String, nullable=True)          # '1H','4H','1D'
    factor_scores = Column(JSON, nullable=True)           # Detailed factor scores

    # Polymarket data
    pm_action = Column(String, nullable=True)             # Betting recommendation
    pm_above_prob = Column(Float, nullable=True)          # Chanlun bullish probability
    pm_base_price = Column(Float, nullable=True)          # PM base price
    pm_edge = Column(Float, nullable=True)                # Edge advantage

    # Resolution (filled after expiry)
    resolved = Column(Boolean, default=False)
    resolve_target_time = Column(DateTime(timezone=True), nullable=True)
    actual_price = Column(Float, nullable=True)
    direction_correct = Column(Boolean, nullable=True)
    accuracy_grade = Column(String, nullable=True)        # 'EXACT','CLOSE','HIT','MISS'
    target_error_pct = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("prediction_time", "timeframe", name="uq_prediction_time_tf"),
    )

    def __repr__(self):
        return f"<Prediction {self.timeframe} {self.direction} @ {self.prediction_time}>"
