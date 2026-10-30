/**
 * Mint Agent Telemetry Event Types
 * Estandarización de eventos en tiempo real para visualización en grafos y observabilidad.
 */

export interface AgentTelemetrySource {
  id: string;
  label: string;
  group: "agent" | "subagent";
}

export interface AgentTelemetryTarget {
  id: string;
  label: string;
  group: "file" | "database" | "tool" | "node" | "cost";
  metadata?: Record<string, any>;
}

export type AgentTelemetryAction =
  | "read"
  | "write"
  | "query"
  | "execute"
  | "spawn"
  | "meter";

export type AgentTelemetryStatus = "pending" | "success" | "error";

/**
 * Desglose de consumo de una tarea (FinOps).
 * Se adjunta a los eventos de telemetría de tipo "meter".
 */
export interface AgentTelemetryCostPayload {
  taskId: string;
  tokens: number;
  costUsd: number;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  cachedTokens?: number;
}

export interface AgentTelemetryEvent {
  id: string;
  timestamp: number;
  source: AgentTelemetrySource;
  target: AgentTelemetryTarget;
  action: AgentTelemetryAction;
  status: AgentTelemetryStatus;
  bytesOrRowsAffected?: number;
  cost?: AgentTelemetryCostPayload;
}
