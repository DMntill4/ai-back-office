import { useState, useEffect, useRef, useCallback } from "react";
import {
  AgentTelemetryEvent,
  TelemetryGraphData,
  TelemetryGraphNode,
  TelemetryGraphLink,
} from "../types/telemetry";

export interface UseAgentTelemetryOptions {
  wsUrl?: string;
  apiUrl?: string;
  maxRecentEvents?: number;
}

export function useAgentTelemetry(options: UseAgentTelemetryOptions = {}) {
  // Configuración de endpoints (soporta puerto 3001 para Fastify o detección automática)
  const defaultWsHost =
    typeof window !== "undefined"
      ? window.location.hostname
      : "localhost";

  const wsUrl =
    options.wsUrl ||
    (typeof window !== "undefined" && window.location.port === "3000"
      ? `ws://${defaultWsHost}:3001/ws/telemetry`
      : `ws://${defaultWsHost}:${window.location.port || "3001"}/ws/telemetry`);

  const apiUrl =
    options.apiUrl ||
    (typeof window !== "undefined" && window.location.port === "3000"
      ? `http://${defaultWsHost}:3001`
      : `http://${defaultWsHost}:${window.location.port || "3001"}`);

  const maxEvents = options.maxRecentEvents || 60;

  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected" | "reconnecting">("connecting");
  const [events, setEvents] = useState<AgentTelemetryEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<AgentTelemetryEvent | null>(null);

  // Maps en memoria para mantener referencias estables de nodos y aristas (D3 Force Graph)
  const nodesMap = useRef<Map<string, TelemetryGraphNode>>(new Map());
  const linksMap = useRef<Map<string, TelemetryGraphLink>>(new Map());
  const [graphData, setGraphData] = useState<TelemetryGraphData>({ nodes: [], links: [] });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isComponentMounted = useRef(true);

  // Procesa un evento individual y actualiza el grafo incrementalmente
  const processTelemetryEvent = useCallback((event: AgentTelemetryEvent) => {
    const nodes = nodesMap.current;
    const links = linksMap.current;

    // 1. Upsert Source Node (Agente o Subagente)
    const existingSource = nodes.get(event.source.id);
    if (existingSource) {
      existingSource.lastAction = event.action;
      existingSource.lastStatus = event.status;
      existingSource.lastTimestamp = event.timestamp;
      existingSource.interactionCount += 1;
    } else {
      nodes.set(event.source.id, {
        id: event.source.id,
        label: event.source.label,
        group: event.source.group || "agent",
        lastAction: event.action,
        lastStatus: event.status,
        lastTimestamp: event.timestamp,
        interactionCount: 1,
        bytesOrRowsTotal: 0,
      });
    }

    // 2. Upsert Target Node (File, Database, Tool, Node)
    const existingTarget = nodes.get(event.target.id);
    const affected = event.bytesOrRowsAffected || 0;
    if (existingTarget) {
      existingTarget.lastAction = event.action;
      existingTarget.lastStatus = event.status;
      existingTarget.lastTimestamp = event.timestamp;
      existingTarget.interactionCount += 1;
      existingTarget.bytesOrRowsTotal += affected;
      if (event.target.metadata) {
        existingTarget.metadata = { ...existingTarget.metadata, ...event.target.metadata };
      }
    } else {
      nodes.set(event.target.id, {
        id: event.target.id,
        label: event.target.label,
        group: event.target.group || "node",
        metadata: event.target.metadata,
        lastAction: event.action,
        lastStatus: event.status,
        lastTimestamp: event.timestamp,
        interactionCount: 1,
        bytesOrRowsTotal: affected,
      });
    }

    // 3. Upsert Link entre Source y Target
    const linkId = `${event.source.id}->${event.target.id}`;
    const existingLink = links.get(linkId);
    if (existingLink) {
      existingLink.action = event.action;
      existingLink.status = event.status;
      existingLink.lastTimestamp = event.timestamp;
      existingLink.interactionCount += 1;
    } else {
      links.set(linkId, {
        id: linkId,
        source: event.source.id,
        target: event.target.id,
        action: event.action,
        status: event.status,
        lastTimestamp: event.timestamp,
        interactionCount: 1,
      });
    }

    // Actualizar estado del grafo para react-force-graph-2d
    setGraphData({
      nodes: Array.from(nodes.values()),
      links: Array.from(links.values()),
    });

    setLastEvent(event);
    setEvents((prev) => [event, ...prev.slice(0, maxEvents - 1)]);
  }, [maxEvents]);

  // Conexión WebSocket nativa con auto-reconexión
  const connectWebSocket = useCallback(() => {
    if (!isComponentMounted.current) return;

    try {
      setStatus("connecting");
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        if (!isComponentMounted.current) return;
        setStatus("connected");
      };

      socket.onmessage = (msgEvent) => {
        if (!isComponentMounted.current) return;
        try {
          const data = JSON.parse(msgEvent.data);

          if (data.type === "connected" && Array.isArray(data.history)) {
            // Cargar historial de eventos inicial
            data.history.forEach((pastEv: AgentTelemetryEvent) => {
              processTelemetryEvent(pastEv);
            });
          } else if (data.type === "telemetry_event" && data.event) {
            processTelemetryEvent(data.event);
          }
        } catch {
          // Ignorar payloads inválidos
        }
      };

      socket.onclose = () => {
        if (!isComponentMounted.current) return;
        setStatus("reconnecting");
        // Reintento de reconexión tras 3 segundos
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };

      socket.onerror = () => {
        socket.close();
      };
    } catch {
      setStatus("disconnected");
    }
  }, [wsUrl, processTelemetryEvent]);

  useEffect(() => {
    isComponentMounted.current = true;
    connectWebSocket();

    return () => {
      isComponentMounted.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connectWebSocket]);

  // Disparar ciclo operativo en vivo mediante API Fastify
  const triggerSimulation = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/telemetry/simulate`, {
        method: "POST",
      });
      return await res.json();
    } catch (err) {
      console.error("Error al disparar simulación de telemetría:", err);
      // Fallback: Si el servidor Fastify no está en 3001, emitir localmente un ciclo completo
      const localSource = {
        id: "agent_coordinator",
        label: "Mint Autonomous Coordinator",
        group: "agent" as const,
      };

      const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

      (async () => {
        processTelemetryEvent({
          id: `evt_local_${Date.now()}_1`,
          timestamp: Date.now(),
          source: localSource,
          target: { id: "file_base_md", label: "base.md", group: "file", metadata: { path: "prompts/base.md" } },
          action: "read",
          status: "success",
          bytesOrRowsAffected: 2450,
        });
        await delay(180);

        processTelemetryEvent({
          id: `evt_local_${Date.now()}_2`,
          timestamp: Date.now(),
          source: localSource,
          target: { id: "db_products", label: "PostgreSQL: products", group: "database", metadata: { table: "products" } },
          action: "query",
          status: "success",
          bytesOrRowsAffected: 12,
        });
        await delay(200);

        processTelemetryEvent({
          id: `evt_local_${Date.now()}_3`,
          timestamp: Date.now(),
          source: localSource,
          target: { id: "tool_consultar_stock", label: "consultar_stock", group: "tool" },
          action: "execute",
          status: "pending",
        });
        await delay(150);

        processTelemetryEvent({
          id: `evt_local_${Date.now()}_4`,
          timestamp: Date.now(),
          source: localSource,
          target: { id: "db_inventory", label: "PostgreSQL: inventory", group: "database" },
          action: "query",
          status: "success",
          bytesOrRowsAffected: 1,
        });
        await delay(180);

        processTelemetryEvent({
          id: `evt_local_${Date.now()}_5`,
          timestamp: Date.now(),
          source: localSource,
          target: { id: "tool_consultar_stock", label: "consultar_stock", group: "tool" },
          action: "execute",
          status: "success",
        });
        await delay(200);

        processTelemetryEvent({
          id: `evt_local_${Date.now()}_6`,
          timestamp: Date.now(),
          source: localSource,
          target: { id: "node_compras", label: "Módulo Compras & Proveedores", group: "tool" },
          action: "spawn",
          status: "success",
        });
        await delay(200);

        processTelemetryEvent({
          id: `evt_local_${Date.now()}_7`,
          timestamp: Date.now(),
          source: localSource,
          target: { id: "tool_evaluar_proveedores", label: "evaluar_proveedores", group: "tool" },
          action: "execute",
          status: "success",
        });
        await delay(180);

        processTelemetryEvent({
          id: `evt_local_${Date.now()}_8`,
          timestamp: Date.now(),
          source: localSource,
          target: { id: "db_purchase_orders", label: "PostgreSQL: purchase_orders", group: "database" },
          action: "write",
          status: "success",
          bytesOrRowsAffected: 1,
        });
        await delay(180);

        processTelemetryEvent({
          id: `evt_local_${Date.now()}_9`,
          timestamp: Date.now(),
          source: localSource,
          target: { id: "file_audit_log", label: "audit_execution.log", group: "file" },
          action: "write",
          status: "success",
          bytesOrRowsAffected: 540,
        });
      })();
    }
  }, [apiUrl, processTelemetryEvent]);

  // Limpiar grafo
  const clearGraph = useCallback(() => {
    nodesMap.current.clear();
    linksMap.current.clear();
    setGraphData({ nodes: [], links: [] });
    setEvents([]);
    setLastEvent(null);
  }, []);

  return {
    status,
    graphData,
    events,
    lastEvent,
    triggerSimulation,
    clearGraph,
    nodesCount: graphData.nodes.length,
    linksCount: graphData.links.length,
  };
}
