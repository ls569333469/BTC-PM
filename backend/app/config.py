"""
BTC Chanlun Analyzer — Environment Configuration
Uses Pydantic Settings for type-safe environment variable management.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Server
    app_name: str = "BTC Chanlun Analyzer"
    app_version: str = "1.0.0"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/chanlun"

    # External APIs — all public, no keys needed
    binance_base_url: str = "https://api.binance.com"
    binance_futures_url: str = "https://fapi.binance.com"
    fear_greed_url: str = "https://api.alternative.me/fng"
    coingecko_base_url: str = "https://api.coingecko.com/api/v3"
    polymarket_base_url: str = "https://gamma-api.polymarket.com"

    # Scheduler
    analysis_interval_minutes: int = 5

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()
