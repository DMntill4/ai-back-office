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
  group: "file" | "database" | "tool" | "node";
  metadata?: Record<string, any>;
}

export type AgentTelemetryAction = "read" | "write" | "query" | "execute" | "spawn";

export type AgentTelemetryStatus = "pending" | "success" | "error";

export interface AgentTelemetryEvent {
  id: string;
  timestamp: number;
  source: AgentTelemetrySource;
  target: AgentTelemetryTarget;
  action: AgentTelemetryAction;
  status: AgentTelemetryStatus;
  bytesOrRowsAffected?: number;
}
