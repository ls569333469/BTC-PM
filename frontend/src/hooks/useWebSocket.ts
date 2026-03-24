/**
 * useWebSocket — real-time analysis updates via WebSocket.
 *
 * Connects to ws://host/ws/analysis and updates TanStack Query cache
 * when the server pushes new analysis results (every 15 min).
 *
 * Features:
 *  - Exponential backoff reconnection (1s → 2s → 4s → ... → 30s max)
 *  - Automatic ping/pong keepalive
 *  - Instant UI update via queryClient.setQueryData
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface WSMessage {
  type: "connected" | "analysis" | "ping" | "pong";
  data?: unknown;
  ts?: number;
  clients?: number;
}

interface UseWebSocketReturn {
  connected: boolean;
  clientCount: number;
  lastUpdate: number | null;
}

export function useWebSocket(): UseWebSocketReturn {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [connected, setConnected] = useState(false);
  const [clientCount, setClientCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);

  const connect = useCallback(() => {
    // Determine WS URL from current location
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const url = `${proto}//${host}/ws/analysis`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[WS] Connected to", url);
        setConnected(true);
        retryRef.current = 0; // Reset backoff on success
      };

      ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data);

          switch (msg.type) {
            case "connected":
              setClientCount(msg.clients ?? 1);
              break;

            case "analysis":
              // Instantly update TanStack Query cache
              if (msg.data) {
                queryClient.setQueryData(["chanlun", "analysis"], msg.data);
                
                // Allow the frontend visual clock loop to handle Polymarket sync natively
                setLastUpdate(msg.ts ?? Date.now() / 1000);
                console.log("[WS] Analysis up-to-date.");
              }
              break;

            case "ping":
              // Respond with pong
              ws.send(JSON.stringify({ type: "pong" }));
              break;

            case "pong":
              // Server responded to our ping — connection alive
              break;
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        console.log("[WS] Disconnected");
        setConnected(false);
        wsRef.current = null;
        scheduleReconnect();
      };

      ws.onerror = () => {
        // onclose will fire after onerror — reconnect handled there
        ws.close();
      };
    } catch {
      scheduleReconnect();
    }
  }, [queryClient]);

  const scheduleReconnect = useCallback(() => {
    const delay = Math.min(1000 * Math.pow(2, retryRef.current), 30000);
    retryRef.current += 1;
    console.log(`[WS] Reconnecting in ${delay / 1000}s (attempt ${retryRef.current})`);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect]);

  useEffect(() => {
    connect();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // Prevent reconnect on intentional close
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { connected, clientCount, lastUpdate };
}
