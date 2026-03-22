"""
WebSocket route — real-time analysis push.
Endpoint: ws://host/ws/analysis

The APScheduler auto_analysis job broadcasts new results to all
connected clients via ConnectionManager.broadcast().
"""

import asyncio
import json
import time
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["websocket"])


class ConnectionManager:
    """Manages active WebSocket connections."""

    def __init__(self):
        self._connections: list[WebSocket] = []
        self._lock = asyncio.Lock()

    async def connect(self, ws: WebSocket):
        await ws.accept()
        async with self._lock:
            self._connections.append(ws)

    async def disconnect(self, ws: WebSocket):
        async with self._lock:
            if ws in self._connections:
                self._connections.remove(ws)

    async def broadcast(self, data: dict[str, Any]):
        """Send data to all connected clients. Silently drops broken connections."""
        async with self._lock:
            stale: list[WebSocket] = []
            for ws in self._connections:
                try:
                    await ws.send_json(data)
                except Exception:
                    stale.append(ws)
            for ws in stale:
                self._connections.remove(ws)

    @property
    def active_count(self) -> int:
        return len(self._connections)


# Singleton — imported by main.py scheduler
manager = ConnectionManager()


@router.websocket("/ws/analysis")
async def ws_analysis(ws: WebSocket):
    """
    WebSocket endpoint for real-time analysis updates.

    Protocol:
      → Server sends {"type":"connected","clients":<n>} on connect
      → Server sends {"type":"analysis","data":{...},"ts":<epoch>} on each analysis
      → Server sends {"type":"ping"} every 30s as keepalive
      → Client may send {"type":"pong"} (optional)
    """
    await manager.connect(ws)
    try:
        # Send welcome message
        await ws.send_json({
            "type": "connected",
            "clients": manager.active_count,
            "ts": time.time(),
        })

        # Keep connection alive with ping/pong
        while True:
            try:
                # Wait for client messages (or timeout for ping)
                data = await asyncio.wait_for(ws.receive_text(), timeout=30.0)
                # Client can send pong or any message — we just ignore
                try:
                    msg = json.loads(data)
                    if msg.get("type") == "ping":
                        await ws.send_json({"type": "pong", "ts": time.time()})
                except (json.JSONDecodeError, TypeError):
                    pass
            except asyncio.TimeoutError:
                # No message in 30s — send keepalive ping
                try:
                    await ws.send_json({"type": "ping", "ts": time.time()})
                except Exception:
                    break
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        await manager.disconnect(ws)
