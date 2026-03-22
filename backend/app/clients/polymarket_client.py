"""
Polymarket API client — public event and price data.
No API key required.
"""

import httpx
from typing import Optional
from app.config import get_settings


class PolymarketClient:
    """Async client for Polymarket Gamma API."""

    def __init__(self):
        settings = get_settings()
        self.base_url = settings.polymarket_base_url
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=30.0)
        return self._client

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def search_events(
        self,
        query: str = "bitcoin",
        limit: int = 20,
        active: bool = True,
    ) -> list[dict]:
        """Search for Polymarket events."""
        client = await self._get_client()
        resp = await client.get(
            f"{self.base_url}/events",
            params={
                "limit": limit,
                "active": str(active).lower(),
                "title": query,
            },
        )
        resp.raise_for_status()
        return resp.json()

    async def get_event_by_slug(self, slug: str) -> Optional[dict]:
        """Get a specific event by its slug."""
        client = await self._get_client()
        resp = await client.get(
            f"{self.base_url}/events",
            params={"slug": slug},
        )
        resp.raise_for_status()
        events = resp.json()
        return events[0] if events else None

    async def get_market_prices(self, token_ids: list[str]) -> list[dict]:
        """Get current prices for market tokens."""
        client = await self._get_client()
        prices = []
        for token_id in token_ids:
            try:
                resp = await client.get(
                    f"{self.base_url}/markets/{token_id}",
                )
                if resp.status_code == 200:
                    prices.append(resp.json())
            except Exception:
                continue
        return prices


# Singleton
_polymarket_client: Optional[PolymarketClient] = None


def get_polymarket_client() -> PolymarketClient:
    global _polymarket_client
    if _polymarket_client is None:
        _polymarket_client = PolymarketClient()
    return _polymarket_client
