import { EventEmitter } from "node:events";
import {
  MintSpiderEvent,
  MintSpiderEventType,
  MintModuleType,
} from "./graph.types";
import { telemetryPublisher, AgentTelemetryEvent } from "@mint/core";

/**
 * Bus de Eventos Operativo de MINT CLI
 * Conecta los eventos reales del registro de auditoría con la araña del grafo.
 * Garantiza:
 * 1. Sin duplicados: cada id se procesa una sola vez.
 * 2. Cero datos inventados: todo movimiento proviene de un registro real.
 * 3. Sanitización: elimina credenciales, tokens o información sensible.
 * 4. Retención en memoria para la línea de tiempo.
 */
export class MintSpiderEventBus extends EventEmitter {
  private static instance: MintSpiderEventBus;
  private processedEventIds = new Set<string>();
  private history: MintSpiderEvent[] = [];
  private readonly maxHistorySize = 500;
  private isSubscribedToCore = false;

  private constructor() {
    super();
    this.setMaxListeners(100);
    this.initCoreBridge();
  }

  public static getInstance(): MintSpiderEventBus {
    if (!MintSpiderEventBus.instance) {
      MintSpiderEventBus.instance = new MintSpiderEventBus();
    }
    return MintSpiderEventBus.instance;
  }

  /**
   * Conecta con el publicador de telemetría de @mint/core
   */
  private initCoreBridge() {
    if (this.isSubscribedToCore) return;

    telemetryPublisher.subscribe((coreEv: AgentTelemetryEvent) => {
      this.ingestCoreEvent(coreEv);
    });

    this.isSubscribedToCore = true;
  }

  /**
   * Mapea un evento de telemetría del núcleo a un evento del grafo de la araña
   */
  public ingestCoreEvent(coreEv: AgentTelemetryEvent, companyId?: string): MintSpiderEvent | null {
    if (this.processedEventIds.has(coreEv.id)) {
      return null; // Regla: no duplicar animaciones
    }
    this.processedEventIds.add(coreEv.id);

    // Mapeo semántico de acción a estado de la araña
    let type: MintSpiderEventType = "observa";
    let moduleType: MintModuleType = "inventario";

    if (coreEv.action === "read" || coreEv.action === "query") {
      type = "observa";
    } else if (coreEv.action === "execute") {
      if (coreEv.status === "pending") {
        type = "analiza";
      } else if (coreEv.target.label.includes("orden_compra")) {
        type = "propone";
        moduleType = "aprobaciones";
      } else if (coreEv.status === "success") {
        type = "ejecuta";
      } else {
        type = "error";
      }
    } else if (coreEv.action === "write") {
      type = "ejecuta";
    } else if (coreEv.action === "spawn") {
      type = "analiza";
    }

    // Identificar módulo
    const labelLower = coreEv.target.label.toLowerCase();
    if (labelLower.includes("stock") || labelLower.includes("inventario") || labelLower.includes("product")) {
      moduleType = "inventario";
    } else if (labelLower.includes("proveedor") || labelLower.includes("supplier")) {
      moduleType = "proveedores";
    } else if (labelLower.includes("envio") || labelLower.includes("shipment") || labelLower.includes("ruta") || labelLower.includes("logistica")) {
      moduleType = "logistica";
    } else if (labelLower.includes("orden") || labelLower.includes("decision") || labelLower.includes("hitl") || labelLower.includes("compra")) {
      moduleType = "aprobaciones";
    } else if (labelLower.includes("venta") || labelLower.includes("cliente")) {
      moduleType = "ventas";
    } else if (labelLower.includes("costo") || labelLower.includes("financiero") || labelLower.includes("precio")) {
      moduleType = "finanzas";
    }

    // Sanitizar metadatos (remover contraseñas, tokens, llaves)
    const sanitizedMeta = this.sanitizeMetadata(coreEv.target.metadata);

    const spiderEvent: MintSpiderEvent = {
      id: coreEv.id,
      companyId: companyId || "comp_default",
      timestamp: coreEv.timestamp,
      type,
      sourceNodeId: coreEv.source.id,
      targetNodeId: coreEv.target.id,
      module: moduleType,
      summary: `${coreEv.source.label} ${coreEv.action} sobre ${coreEv.target.label}`,
      auditRef: coreEv.id,
      metadata: sanitizedMeta,
    };

    this.publish(spiderEvent);
    return spiderEvent;
  }

  /**
   * Publica un evento a los oyentes y guarda en el historial
   */
  public publish(event: MintSpiderEvent): void {
    if (this.processedEventIds.has(event.id) && this.history.some((h) => h.id === event.id)) {
      return;
    }
    this.processedEventIds.add(event.id);

    this.history.push(event);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    this.emit("event", event);
    this.emit(`company:${event.companyId}`, event);
  }

  /**
   * Obtiene eventos históricos para una empresa dentro de una ventana de tiempo
   */
  public getHistory(companyId: string, sinceTimestamp?: number): MintSpiderEvent[] {
    let list = this.history.filter((e) => e.companyId === companyId);
    if (sinceTimestamp) {
      list = list.filter((e) => e.timestamp >= sinceTimestamp);
    }
    return list;
  }

  /**
   * Registra eventos históricos extraídos directamente de la base de datos
   */
  public seedFromAuditRows(events: MintSpiderEvent[]) {
    for (const ev of events) {
      if (!this.processedEventIds.has(ev.id)) {
        this.processedEventIds.add(ev.id);
        this.history.push(ev);
      }
    }
  }

  /**
   * Sanitización profunda para evitar exponer secretos o XSS
   */
  private sanitizeMetadata(meta?: Record<string, any>): Record<string, any> | undefined {
    if (!meta) return undefined;
    const clean: Record<string, any> = {};
    const forbiddenKeys = ["password", "token", "secret", "apikey", "authorization", "cookie"];

    for (const [k, v] of Object.entries(meta)) {
      if (forbiddenKeys.some((bad) => k.toLowerCase().includes(bad))) {
        clean[k] = "[PROTEGIDO]";
      } else if (typeof v === "string") {
        // Escapar caracteres peligrosos
        clean[k] = v.replace(/[<>]/g, "");
      } else {
        clean[k] = v;
      }
    }
    return clean;
  }
}

export const mintSpiderEventBus = MintSpiderEventBus.getInstance();
