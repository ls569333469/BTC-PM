"""
Client mock tests — test all external API clients with httpx mocking.
Uses `respx` to intercept HTTP requests — no real network calls.
"""

import pytest
import httpx
import respx
from httpx import Response

from app.clients.binance_client import BinanceClient
from app.clients.polymarket_client import PolymarketClient
from app.clients.market_client import MarketClient


# ═════════════════════════════════════
# Binance Client Tests
# ═════════════════════════════════════

class TestBinanceGetKlines:
    """Tests for BinanceClient.get_klines"""

    @pytest.mark.asyncio
    @respx.mock
    async def test_success(self):
        """Normal response — should parse kline arrays into dicts."""
        mock_klines = [
            [1700000000000, "70000", "71000", "69500", "70500", "100.5", 1700003600000],
            [1700003600000, "70500", "71500", "70000", "71000", "120.3", 1700007200000],
        ]
        respx.get("https://api.binance.com/api/v3/klines").mock(
            return_value=Response(200, json=mock_klines)
        )
        client = BinanceClient()
        result = await client.get_klines("BTCUSDT", "1h", limit=2)
        assert len(result) == 2
        assert result[0]["open"] == 70000.0
        assert result[0]["high"] == 71000.0
        assert result[0]["low"] == 69500.0
        assert result[0]["close"] == 70500.0
        assert result[0]["volume"] == 100.5
        await client.close()

    @pytest.mark.asyncio
    @respx.mock
    async def test_timeout(self):
        """Timeout should raise TimeoutException."""
        respx.get("https://api.binance.com/api/v3/klines").mock(
            side_effect=httpx.TimeoutException("Connection timed out")
        )
        client = BinanceClient()
        with pytest.raises(httpx.TimeoutException):
            await client.get_klines("BTCUSDT", "1h")
        await client.close()

    @pytest.mark.asyncio
    @respx.mock
    async def test_rate_limit_429(self):
        """HTTP 429 should raise HTTPStatusError."""
        respx.get("https://api.binance.com/api/v3/klines").mock(
            return_value=Response(429, json={"msg": "Rate limit exceeded"})
        )
        client = BinanceClient()
        with pytest.raises(httpx.HTTPStatusError) as exc_info:
            await client.get_klines("BTCUSDT", "1h")
        assert exc_info.value.response.status_code == 429
        await client.close()

    @pytest.mark.asyncio
    @respx.mock
    async def test_geo_block(self):
        """US geo-block (HTTP 451) should raise HTTPStatusError."""
        respx.get("https://api.binance.com/api/v3/klines").mock(
            return_value=Response(451, json={
                "code": 0,
                "msg": "Service unavailable from a restricted location"
            })
        )
        client = BinanceClient()
        with pytest.raises(httpx.HTTPStatusError) as exc_info:
            await client.get_klines("BTCUSDT", "1h")
        assert exc_info.value.response.status_code == 451
        await client.close()

    @pytest.mark.asyncio
    @respx.mock
    async def test_invalid_json(self):
        """Malformed response should raise error."""
        respx.get("https://api.binance.com/api/v3/klines").mock(
            return_value=Response(200, content=b"not json at all")
        )
        client = BinanceClient()
        with pytest.raises(Exception):
            await client.get_klines("BTCUSDT", "1h")
        await client.close()


class TestBinanceTickerPrice:
    @pytest.mark.asyncio
    @respx.mock
    async def test_success(self):
        respx.get("https://api.binance.com/api/v3/ticker/price").mock(
            return_value=Response(200, json={"symbol": "BTCUSDT", "price": "87654.32"})
        )
        client = BinanceClient()
        price = await client.get_ticker_price("BTCUSDT")
        assert price == 87654.32
        assert isinstance(price, float)
        await client.close()


class TestBinanceFundingRate:
    @pytest.mark.asyncio
    @respx.mock
    async def test_success(self):
        respx.get("https://fapi.binance.com/fapi/v1/premiumIndex").mock(
            return_value=Response(200, json={
                "lastFundingRate": "0.0001",
                "markPrice": "87000.50",
                "indexPrice": "87000.00",
                "nextFundingTime": 1700010000000,
            })
        )
        client = BinanceClient()
        result = await client.get_funding_rate("BTCUSDT")
        assert result["funding_rate"] == 0.0001
        assert result["mark_price"] == 87000.50
        assert "next_funding_time" in result
        await client.close()


class TestBinanceOpenInterest:
    @pytest.mark.asyncio
    @respx.mock
    async def test_success(self):
        respx.get("https://fapi.binance.com/fapi/v1/openInterest").mock(
            return_value=Response(200, json={"openInterest": "12345.67"})
        )
        client = BinanceClient()
        oi = await client.get_open_interest("BTCUSDT")
        assert oi == 12345.67
        assert isinstance(oi, float)
        await client.close()


class TestBinanceLongShortRatio:
    @pytest.mark.asyncio
    @respx.mock
    async def test_success(self):
        respx.get("https://fapi.binance.com/futures/data/globalLongShortAccountRatio").mock(
            return_value=Response(200, json=[{
                "longAccount": "0.55",
                "shortAccount": "0.45",
                "longShortRatio": "1.22",
            }])
        )
        client = BinanceClient()
        result = await client.get_long_short_ratio("BTCUSDT")
        assert result["long_ratio"] == 0.55
        assert result["short_ratio"] == 0.45
        await client.close()

    @pytest.mark.asyncio
    @respx.mock
    async def test_empty_response(self):
        """Empty array should return defaults."""
        respx.get("https://fapi.binance.com/futures/data/globalLongShortAccountRatio").mock(
            return_value=Response(200, json=[])
        )
        client = BinanceClient()
        result = await client.get_long_short_ratio("BTCUSDT")
        assert result["long_ratio"] == 0.5
        assert result["long_short_ratio"] == 1.0
        await client.close()


# ═════════════════════════════════════
# Polymarket Client Tests
# ═════════════════════════════════════

class TestPolymarketSearchEvents:
    @pytest.mark.asyncio
    @respx.mock
    async def test_success(self):
        mock_events = [
            {"id": "1", "title": "Bitcoin above $90k?", "active": True},
            {"id": "2", "title": "Bitcoin above $100k?", "active": True},
        ]
        respx.get("https://gamma-api.polymarket.com/events").mock(
            return_value=Response(200, json=mock_events)
        )
        client = PolymarketClient()
        events = await client.search_events("bitcoin")
        assert len(events) == 2
        assert events[0]["title"] == "Bitcoin above $90k?"
        await client.close()

    @pytest.mark.asyncio
    @respx.mock
    async def test_empty_results(self):
        respx.get("https://gamma-api.polymarket.com/events").mock(
            return_value=Response(200, json=[])
        )
        client = PolymarketClient()
        events = await client.search_events("nonexistent")
        assert events == []
        await client.close()

    @pytest.mark.asyncio
    @respx.mock
    async def test_timeout(self):
        respx.get("https://gamma-api.polymarket.com/events").mock(
            side_effect=httpx.TimeoutException("timeout")
        )
        client = PolymarketClient()
        with pytest.raises(httpx.TimeoutException):
            await client.search_events("bitcoin")
        await client.close()

    @pytest.mark.asyncio
    @respx.mock
    async def test_server_error(self):
        respx.get("https://gamma-api.polymarket.com/events").mock(
            return_value=Response(500, json={"error": "Internal server error"})
        )
        client = PolymarketClient()
        with pytest.raises(httpx.HTTPStatusError):
            await client.search_events("bitcoin")
        await client.close()


class TestPolymarketGetEventBySlug:
    @pytest.mark.asyncio
    @respx.mock
    async def test_found(self):
        respx.get("https://gamma-api.polymarket.com/events").mock(
            return_value=Response(200, json=[{"slug": "btc-100k", "title": "BTC 100k"}])
        )
        client = PolymarketClient()
        event = await client.get_event_by_slug("btc-100k")
        assert event["slug"] == "btc-100k"
        await client.close()

    @pytest.mark.asyncio
    @respx.mock
    async def test_not_found(self):
        respx.get("https://gamma-api.polymarket.com/events").mock(
            return_value=Response(200, json=[])
        )
        client = PolymarketClient()
        event = await client.get_event_by_slug("nonexistent")
        assert event is None
        await client.close()


class TestPolymarketGetMarketPrices:
    @pytest.mark.asyncio
    @respx.mock
    async def test_success(self):
        respx.get("https://gamma-api.polymarket.com/markets/token-123").mock(
            return_value=Response(200, json={"price": 0.65, "token_id": "token-123"})
        )
        client = PolymarketClient()
        prices = await client.get_market_prices(["token-123"])
        assert len(prices) == 1
        assert prices[0]["price"] == 0.65
        await client.close()

    @pytest.mark.asyncio
    @respx.mock
    async def test_partial_failure(self):
        """One token fails, another succeeds — should return partial results."""
        respx.get("https://gamma-api.polymarket.com/markets/good-token").mock(
            return_value=Response(200, json={"price": 0.8})
        )
        respx.get("https://gamma-api.polymarket.com/markets/bad-token").mock(
            side_effect=httpx.ConnectError("Connection refused")
        )
        client = PolymarketClient()
        prices = await client.get_market_prices(["good-token", "bad-token"])
        assert len(prices) == 1  # only successful one
        await client.close()


# ═════════════════════════════════════
# Market Client Tests (CoinGecko + Fear&Greed)
# ═════════════════════════════════════

class TestMarketClientFearGreed:
    @pytest.mark.asyncio
    @respx.mock
    async def test_success(self):
        respx.get("https://api.alternative.me/fng/?limit=1").mock(
            return_value=Response(200, json={
                "data": [{"value": "72", "value_classification": "Greed"}]
            })
        )
        client = MarketClient()
        result = await client.get_fear_greed()
        assert result["value"] == 72
        assert result["label"] == "Greed"
        await client.close()

    @pytest.mark.asyncio
    @respx.mock
    async def test_timeout(self):
        respx.get("https://api.alternative.me/fng/?limit=1").mock(
            side_effect=httpx.TimeoutException("timeout")
        )
        client = MarketClient()
        with pytest.raises(httpx.TimeoutException):
            await client.get_fear_greed()
        await client.close()


class TestMarketClientCoinGecko:
    @pytest.mark.asyncio
    @respx.mock
    async def test_get_btc_price_success(self):
        respx.get("https://api.coingecko.com/api/v3/simple/price").mock(
            return_value=Response(200, json={"bitcoin": {"usd": 87654.0}})
        )
        client = MarketClient()
        price = await client.get_btc_price_coingecko()
        assert price == 87654.0
        assert isinstance(price, float)
        await client.close()

    @pytest.mark.asyncio
    @respx.mock
    async def test_get_btc_price_rate_limit(self):
        respx.get("https://api.coingecko.com/api/v3/simple/price").mock(
            return_value=Response(429, json={"status": {"error_message": "rate limited"}})
        )
        client = MarketClient()
        with pytest.raises(httpx.HTTPStatusError) as exc_info:
            await client.get_btc_price_coingecko()
        assert exc_info.value.response.status_code == 429
        await client.close()

    @pytest.mark.asyncio
    @respx.mock
    async def test_get_btc_market_data_success(self):
        respx.get("https://api.coingecko.com/api/v3/coins/bitcoin").mock(
            return_value=Response(200, json={
                "market_data": {
                    "current_price": {"usd": 87654.0},
                    "market_cap": {"usd": 1700000000000},
                    "total_volume": {"usd": 50000000000},
                    "price_change_percentage_24h": 2.5,
                    "ath": {"usd": 109000.0},
                    "atl": {"usd": 67.81},
                }
            })
        )
        client = MarketClient()
        data = await client.get_btc_market_data()
        assert data["price"] == 87654.0
        assert data["market_cap"] == 1700000000000
        assert data["volume_24h"] == 50000000000
        assert data["price_change_24h_pct"] == 2.5
        assert data["ath"] == 109000.0
        await client.close()
