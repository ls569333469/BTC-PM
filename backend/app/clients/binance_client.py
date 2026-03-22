"""
Binance API Client — Spot + Futures public endpoints.
All endpoints are free and require no API key.
"""

import httpx
from typing import Optional
from app.config import get_settings


class BinanceClient:
    """Async client for Binance public market data."""

    def __init__(self):
        settings = get_settings()
        self.spot_base = settings.binance_base_url
        self.futures_base = settings.binance_futures_url
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=30.0)
        return self._client

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    # ── Spot API ──

    async def get_klines(
        self,
        symbol: str = "BTCUSDT",
        interval: str = "1h",
        limit: int = 168,  # 7 days of 1h candles
    ) -> list[dict]:
        """Fetch OHLCV kline data."""
        client = await self._get_client()
        resp = await client.get(
            f"{self.spot_base}/api/v3/klines",
            params={"symbol": symbol, "interval": interval, "limit": limit},
        )
        resp.raise_for_status()
        raw = resp.json()
        return [
            {
                "timestamp": k[0],
                "open": float(k[1]),
                "high": float(k[2]),
                "low": float(k[3]),
                "close": float(k[4]),
                "volume": float(k[5]),
                "close_time": k[6],
            }
            for k in raw
        ]

    async def get_ticker_price(self, symbol: str = "BTCUSDT") -> float:
        """Get current price."""
        client = await self._get_client()
        resp = await client.get(
            f"{self.spot_base}/api/v3/ticker/price",
            params={"symbol": symbol},
        )
        resp.raise_for_status()
        return float(resp.json()["price"])

    async def get_ticker_24hr(self, symbol: str = "BTCUSDT") -> dict:
        """Get 24hr ticker statistics."""
        client = await self._get_client()
        resp = await client.get(
            f"{self.spot_base}/api/v3/ticker/24hr",
            params={"symbol": symbol},
        )
        resp.raise_for_status()
        return resp.json()

    # ── Futures API ──

    async def get_funding_rate(self, symbol: str = "BTCUSDT") -> dict:
        """Get premium index (funding rate + mark price)."""
        client = await self._get_client()
        resp = await client.get(
            f"{self.futures_base}/fapi/v1/premiumIndex",
            params={"symbol": symbol},
        )
        resp.raise_for_status()
        data = resp.json()
        return {
            "funding_rate": float(data["lastFundingRate"]),
            "mark_price": float(data["markPrice"]),
            "index_price": float(data["indexPrice"]),
            "next_funding_time": data["nextFundingTime"],
        }

    async def get_open_interest(self, symbol: str = "BTCUSDT") -> float:
        """Get open interest."""
        client = await self._get_client()
        resp = await client.get(
            f"{self.futures_base}/fapi/v1/openInterest",
            params={"symbol": symbol},
        )
        resp.raise_for_status()
        return float(resp.json()["openInterest"])

    async def get_long_short_ratio(
        self, symbol: str = "BTCUSDT", period: str = "1h", limit: int = 1
    ) -> dict:
        """Get long/short account ratio."""
        client = await self._get_client()
        resp = await client.get(
            f"{self.futures_base}/futures/data/globalLongShortAccountRatio",
            params={"symbol": symbol, "period": period, "limit": limit},
        )
        resp.raise_for_status()
        data = resp.json()
        if data:
            return {
                "long_ratio": float(data[0]["longAccount"]),
                "short_ratio": float(data[0]["shortAccount"]),
                "long_short_ratio": float(data[0]["longShortRatio"]),
            }
        return {"long_ratio": 0.5, "short_ratio": 0.5, "long_short_ratio": 1.0}


# Singleton
_binance_client: Optional[BinanceClient] = None


def get_binance_client() -> BinanceClient:
    global _binance_client
    if _binance_client is None:
        _binance_client = BinanceClient()
    return _binance_client
