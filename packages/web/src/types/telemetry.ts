/**
 * Mint Real-Time Agent Telemetry Types for Frontend
 */

export interface AgentTelemetrySource {
  id: string;
  label: string;
  group?: "agent" | "subagent" | string;
}

export interface AgentTelemetryTarget {
  id: string;
  label: string;
  group?: "file" | "database" | "tool" | "node" | "warehouse" | "supplier" | string;
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

export interface TelemetryGraphNode {
  id: string;
  label: string;
  group: "agent" | "subagent" | "file" | "database" | "tool" | "node" | "warehouse" | "supplier" | string;
  metadata?: Record<string, any>;
  lastAction?: AgentTelemetryAction;
  lastStatus?: AgentTelemetryStatus;
  lastTimestamp?: number;
  interactionCount: number;
  bytesOrRowsTotal: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  __bckgDimensions?: [number, number];
}

export interface TelemetryGraphLink {
  id: string;
  source: string | TelemetryGraphNode;
  target: string | TelemetryGraphNode;
  action: AgentTelemetryAction;
  status?: AgentTelemetryStatus;
  lastTimestamp?: number;
  interactionCount: number;
}

export interface TelemetryGraphData {
  nodes: TelemetryGraphNode[];
  links: TelemetryGraphLink[];
}
