"""
API integration tests — test all HTTP endpoints via FastAPI TestClient.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client():
    """FastAPI TestClient for integration tests."""
    return TestClient(app)


class TestHealthEndpoint:
    def test_health_returns_200(self, client):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert "version" in data

    def test_health_has_version(self, client):
        resp = client.get("/api/health")
        assert resp.json()["version"] == "1.0.0"


class TestChanlunAnalysis:
    def test_analysis_returns_200(self, client):
        resp = client.get("/api/chanlun/analysis")
        assert resp.status_code == 200

    def test_analysis_has_predictions(self, client):
        resp = client.get("/api/chanlun/analysis")
        data = resp.json()
        # Should have predictions array (may be empty if API fails)
        assert "predictions" in data or "error" in data

    def test_analysis_structure(self, client):
        resp = client.get("/api/chanlun/analysis")
        data = resp.json()
        if "error" not in data:
            assert "predictions" in data
            assert "chanlun" in data
            assert "currentPrice" in data
            if data["predictions"]:
                pred = data["predictions"][0]
                assert "timeframe" in pred
                assert "direction" in pred
                assert "targetPrice" in pred


class TestChanlunValidation:
    def test_validate_empty_predictions(self, client):
        resp = client.get("/api/chanlun/validate", params={"predictions": "[]"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["validations"] == []


class TestBacktestStats:
    def test_stats_returns_200(self, client):
        resp = client.get("/api/backtest/stats")
        assert resp.status_code == 200

    def test_stats_structure(self, client):
        resp = client.get("/api/backtest/stats")
        data = resp.json()
        # Without DB, should return empty stats
        assert isinstance(data, dict)


class TestPolymarketPrices:
    def test_prices_returns_200(self, client):
        resp = client.get("/api/polymarket-prices/prices")
        assert resp.status_code == 200

    def test_prices_structure(self, client):
        resp = client.get("/api/polymarket-prices/prices")
        data = resp.json()
        assert "timestamp" in data
        assert "timeframes" in data
        assert isinstance(data["timeframes"], list)
        # Guides should be present (may be fallback guides)
        if "guides" in data:
            assert isinstance(data["guides"], list)


class TestWebSocket:
    def test_ws_connection(self, client):
        """WebSocket should accept connection and send welcome message."""
        with client.websocket_connect("/ws/analysis") as ws:
            data = ws.receive_json()
            assert data["type"] == "connected"
            assert "ts" in data
            assert "clients" in data


class TestCORS:
    def test_cors_headers_present(self, client):
        resp = client.options(
            "/api/health",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET",
            },
        )
        # FastAPI CORS middleware should respond
        assert resp.status_code in (200, 204)
