import { useEffect, useRef, useState } from "react";
import type { AgentGraphTraversal } from "../types/telemetry";

export interface UseAgentTelemetryOptions {
  wsUrl?: string;
}

export function useAgentTelemetry(options: UseAgentTelemetryOptions = {}) {
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected" | "reconnecting">("connecting");
  const [traversals, setTraversals] = useState<AgentGraphTraversal[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const host = typeof window === "undefined" ? "localhost" : window.location.hostname;
    const protocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
    const apiPort = typeof window !== "undefined" && window.location.port === "3000" ? "3001" : window.location.port || "3001";
    const wsUrl = options.wsUrl ?? `${protocol}//${host}:${apiPort}/ws/telemetry`;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let socket: WebSocket | null = null;
    let attempt = 0;

    const connect = () => {
      if (!mountedRef.current) return;
      setStatus(attempt === 0 ? "connecting" : "reconnecting");
      try {
        socket = new WebSocket(wsUrl);
        socket.onopen = () => {
          if (!mountedRef.current) return;
          attempt = 0;
          setStatus("connected");
        };
        socket.onmessage = (message) => {
          if (!mountedRef.current) return;
          try {
            const event = JSON.parse(message.data) as Partial<AgentGraphTraversal>;
            if (
              event.type !== "agent_graph_traversal" ||
              typeof event.taskId !== "string" ||
              !Array.isArray(event.path)
            ) return;
            const traversalKey = (item: AgentGraphTraversal) =>
              `${item.taskId}:${item.agentId}:${item.targetNodeId}:${item.action}`;
            setTraversals((previous) => [
              event as AgentGraphTraversal,
              ...previous.filter((item) => traversalKey(item) !== traversalKey(event as AgentGraphTraversal)),
            ].slice(0, 3));
          } catch {
            // Ignore unrelated or malformed telemetry frames.
          }
        };
        socket.onclose = () => {
          if (!mountedRef.current) return;
          attempt += 1;
          setStatus("reconnecting");
          reconnectTimer = setTimeout(connect, Math.min(3000 * attempt, 15000));
        };
        socket.onerror = () => socket?.close();
      } catch {
        if (!mountedRef.current) return;
        setStatus("disconnected");
        reconnectTimer = setTimeout(connect, 5000);
      }
    };

    connect();
    return () => {
      mountedRef.current = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [options.wsUrl]);

  return { status, traversals };
}
