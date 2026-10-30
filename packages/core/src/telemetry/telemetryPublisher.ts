import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import {
  AgentTelemetryEvent,
  AgentTelemetrySource,
  AgentTelemetryTarget,
  AgentTelemetryAction,
  AgentTelemetryStatus,
  AgentTelemetryCostPayload,
} from "./telemetry.types";

/**
 * Publicador desacoplado de telemetría del agente (Event Emitter / Observer Pattern).
 * Permite interceptar operaciones en tiempo real sin acoplar el agente al transporte (WebSocket/Fastify).
 */
export class TelemetryPublisher extends EventEmitter {
  private static instance: TelemetryPublisher;
  private ringBuffer: AgentTelemetryEvent[] = [];
  private readonly maxBufferSize = 250;

  private constructor() {
    super();
    this.setMaxListeners(100);
  }

  public static getInstance(): TelemetryPublisher {
    if (!TelemetryPublisher.instance) {
      TelemetryPublisher.instance = new TelemetryPublisher();
    }
    return TelemetryPublisher.instance;
  }

  /**
   * Publica un evento de telemetría a todos los observadores registrados
   */
  public publish(event: AgentTelemetryEvent): void {
    // Almacenar en búfer circular para sincronización de clientes nuevos
    this.ringBuffer.push(event);
    if (this.ringBuffer.length > this.maxBufferSize) {
      this.ringBuffer.shift();
    }

    // Emitir a los listeners (WebSockets, SSE, logger)
    this.emit("telemetry", event);
    this.emit(`action:${event.action}`, event);
    this.emit(`target:${event.target.group}`, event);
  }

  /**
   * Helper para interceptar lectura o escritura de archivos en disco
   */
  public emitFileAccess(
    source: AgentTelemetrySource,
    filePath: string,
    action: "read" | "write",
    status: AgentTelemetryStatus = "success",
    bytesOrRowsAffected?: number,
    metadata?: Record<string, any>
  ): AgentTelemetryEvent {
    const filename = filePath.split(/[/\\]/).pop() || filePath;
    const event: AgentTelemetryEvent = {
      id: `evt_file_${randomUUID().slice(0, 8)}`,
      timestamp: Date.now(),
      source,
      target: {
        id: `file_${filename.replace(/[^a-zA-Z0-9_-]/g, "_")}`,
        label: filename,
        group: "file",
        metadata: {
          path: filePath,
          extension: filename.split(".").pop(),
          ...metadata,
        },
      },
      action,
      status,
      bytesOrRowsAffected,
    };
    this.publish(event);
    return event;
  }

  /**
   * Helper para interceptar queries o mutaciones en PostgreSQL
   */
  public emitDatabaseOperation(
    source: AgentTelemetrySource,
    tableOrQuery: string,
    action: "query" | "write",
    status: AgentTelemetryStatus = "success",
    bytesOrRowsAffected?: number,
    metadata?: Record<string, any>
  ): AgentTelemetryEvent {
    const event: AgentTelemetryEvent = {
      id: `evt_db_${randomUUID().slice(0, 8)}`,
      timestamp: Date.now(),
      source,
      target: {
        id: `db_${tableOrQuery.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, "_")}`,
        label: `PostgreSQL: ${tableOrQuery}`,
        group: "database",
        metadata: {
          engine: "PostgreSQL",
          table: tableOrQuery,
          ...metadata,
        },
      },
      action,
      status,
      bytesOrRowsAffected,
    };
    this.publish(event);
    return event;
  }

  /**
   * Helper para interceptar ejecución o retorno de herramientas (tools)
   */
  public emitToolExecution(
    source: AgentTelemetrySource,
    toolName: string,
    action: "execute",
    status: AgentTelemetryStatus = "success",
    metadata?: Record<string, any>
  ): AgentTelemetryEvent {
    const event: AgentTelemetryEvent = {
      id: `evt_tool_${randomUUID().slice(0, 8)}`,
      timestamp: Date.now(),
      source,
      target: {
        id: `tool_${toolName}`,
        label: toolName,
        group: "tool",
        metadata: {
          runtime: "TypeScript Worker",
          ...metadata,
        },
      },
      action,
      status,
    };
    this.publish(event);
    return event;
  }

  /**
   * Helper para interceptar pasos de razonamiento o subagentes
   */
  public emitAgentStep(
    source: AgentTelemetrySource,
    stepOrSubagent: string,
    action: "spawn" | "execute",
    status: AgentTelemetryStatus = "success",
    metadata?: Record<string, any>
  ): AgentTelemetryEvent {
    const isSubagent = action === "spawn";
    const event: AgentTelemetryEvent = {
      id: `evt_step_${randomUUID().slice(0, 8)}`,
      timestamp: Date.now(),
      source,
      target: {
        id: `node_${stepOrSubagent.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, "_")}`,
        label: stepOrSubagent,
        group: isSubagent ? "tool" : "node",
        metadata: {
          stepType: isSubagent ? "Subagente Autónomo" : "Paso de Razonamiento",
          ...metadata,
        },
      },
      action,
      status,
    };
    this.publish(event);
    return event;
  }

  /**
   * Helper FinOps: publica el consumo acumulado de tokens y costo USD de una tarea.
   * Payload: { taskId, tokens, costUsd, model } (+ desglose opcional).
   */
  public emitCost(
    source: AgentTelemetrySource,
    payload: AgentTelemetryCostPayload,
    status: AgentTelemetryStatus = "success",
  ): AgentTelemetryEvent {
    const event: AgentTelemetryEvent = {
      id: `evt_cost_${randomUUID().slice(0, 8)}`,
      timestamp: Date.now(),
      source,
      target: {
        id: `cost_${payload.taskId}`,
        label: `Costo tarea ${payload.taskId}`,
        group: "cost",
        metadata: {
          taskId: payload.taskId,
          tokens: payload.tokens,
          costUsd: payload.costUsd,
          model: payload.model,
          promptTokens: payload.promptTokens,
          completionTokens: payload.completionTokens,
          cachedTokens: payload.cachedTokens,
        },
      },
      action: "meter",
      status,
      bytesOrRowsAffected: payload.tokens,
      cost: payload,
    };
    this.publish(event);
    return event;
  }

  /**
   * Suscribirse a los eventos de telemetría en tiempo real
   */
  public subscribe(listener: (event: AgentTelemetryEvent) => void): () => void {
    this.on("telemetry", listener);
    return () => {
      this.off("telemetry", listener);
    };
  }

  /**
   * Obtener historial reciente del búfer circular
   */
  public getRecentEvents(limit: number = 50): AgentTelemetryEvent[] {
    return this.ringBuffer.slice(-limit);
  }

  /**
   * Limpiar búfer
   */
  public clearBuffer(): void {
    this.ringBuffer = [];
  }
}

export const telemetryPublisher = TelemetryPublisher.getInstance();
