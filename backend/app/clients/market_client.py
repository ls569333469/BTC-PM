"""
Market data client — CoinGecko + Alternative.me (Fear & Greed).
All endpoints are free and public.
"""

import httpx
from typing import Optional
from app.config import get_settings


class MarketClient:
    """Async client for aggregated market data."""

    def __init__(self):
        settings = get_settings()
        self.coingecko_base = settings.coingecko_base_url
        self.fear_greed_url = settings.fear_greed_url
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=30.0)
        return self._client

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def get_fear_greed(self) -> dict:
        """Get Fear & Greed Index from Alternative.me."""
        client = await self._get_client()
        resp = await client.get(f"{self.fear_greed_url}/?limit=1")
        resp.raise_for_status()
        data = resp.json()
        entry = data["data"][0]
        return {
            "value": int(entry["value"]),
            "label": entry["value_classification"],
        }

    async def get_btc_price_coingecko(self) -> float:
        """Get BTC price from CoinGecko (backup source)."""
        client = await self._get_client()
        resp = await client.get(
            f"{self.coingecko_base}/simple/price",
            params={"ids": "bitcoin", "vs_currencies": "usd"},
        )
        resp.raise_for_status()
        return resp.json()["bitcoin"]["usd"]

    async def get_btc_market_data(self) -> dict:
        """Get comprehensive BTC market data from CoinGecko."""
        client = await self._get_client()
        resp = await client.get(
            f"{self.coingecko_base}/coins/bitcoin",
            params={
                "localization": "false",
                "tickers": "false",
                "community_data": "false",
                "developer_data": "false",
            },
        )
        resp.raise_for_status()
        data = resp.json()
        market = data.get("market_data", {})
        return {
            "price": market.get("current_price", {}).get("usd", 0),
            "market_cap": market.get("market_cap", {}).get("usd", 0),
            "volume_24h": market.get("total_volume", {}).get("usd", 0),
            "price_change_24h_pct": market.get("price_change_percentage_24h", 0),
            "ath": market.get("ath", {}).get("usd", 0),
            "atl": market.get("atl", {}).get("usd", 0),
        }


# Singleton
_market_client: Optional[MarketClient] = None


def get_market_client() -> MarketClient:
    global _market_client
    if _market_client is None:
        _market_client = MarketClient()
    return _market_client
