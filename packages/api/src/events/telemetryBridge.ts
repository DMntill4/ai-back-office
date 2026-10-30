import {
    telemetryPublisher,
    alertDispatcher,
    type AgentTelemetryEvent,
    type ProactiveAlert,
} from "@mint/core";
import { sseHub } from "./sseHub";

/**
 * Puente de eventos en tiempo real: Core → SSE.
 *
 * Conecta el `telemetryPublisher` (EventEmitter desacoplado del core) y el
 * `alertDispatcher` del motor proactivo con el `sseHub` de Fastify, de modo que
 * cualquier cliente SSE reciba automáticamente:
 *
 *  1. Alertas proactivas (stock crítico, anomalías de proveedor, caducidades).
 *  2. Transiciones de estado de órdenes de compra.
 *  3. Cambios de autonomía del agente.
 *  4. Cualquier evento de telemetría relevante (tool execution, agent step).
 *
 * El puente es idempotente: llamar `startTelemetryBridge()` varias veces no
 * duplica suscripciones.
 */

let started = false;
const unsubscribers: Array<() => void> = [];

/** Mapea la severidad de una alerta proactiva al tipo de evento SSE. */
function alertTypeToSseType(alert: ProactiveAlert): string {
    switch (alert.type) {
        case "STOCK_CRITICO":
            return "proactive_stock_alert";
        case "PROVEEEDOR_ANOMALIA":
            return "proactive_supplier_alert";
        case "CADUCIDAD_PROXIMA":
            return "proactive_expiry_alert";
        case "REABASTECIMIENTO_SUGERIDO":
            return "proactive_reorder_alert";
        default:
            return "proactive_alert";
    }
}

/** Detecta transiciones de órdenes de compra en la telemetría. */
function isPurchaseOrderEvent(event: AgentTelemetryEvent): boolean {
    const targetId = String(event.target?.id ?? "").toLowerCase();
    const targetLabel = String(event.target?.label ?? "").toLowerCase();
    const group = String(event.target?.group ?? "").toLowerCase();
    return (
        targetId.includes("purchase_order") ||
        targetId.includes("purchaseorder") ||
        targetLabel.includes("orden de compra") ||
        targetLabel.includes("purchase order") ||
        group.includes("purchase_order")
    );
}

/** Detecta cambios de autonomía del agente. */
function isAutonomyEvent(event: AgentTelemetryEvent): boolean {
    const targetId = String(event.target?.id ?? "").toLowerCase();
    const targetLabel = String(event.target?.label ?? "").toLowerCase();
    const metadata = (event.target?.metadata ?? {}) as Record<string, any>;
    return (
        targetId.includes("autonomy") ||
        targetId.includes("autonomia") ||
        targetLabel.includes("autonomy") ||
        targetLabel.includes("autonomía") ||
        metadata.autonomyLevel !== undefined ||
        metadata.autonomy !== undefined
    );
}

function handleTelemetryEvent(event: AgentTelemetryEvent): void {
    try {
        // 1. Transiciones de órdenes de compra
        if (isPurchaseOrderEvent(event)) {
            sseHub.broadcast({
                type: "purchase_order_transition",
                agent: event.source?.label ?? "comprasSpecialist",
                action: event.action,
                details: `Transición de orden de compra: ${event.target?.label ?? event.target?.id} (${event.status}).`,
                resultSummary: `${event.action} · ${event.status}`,
                payload: event,
            });
            return;
        }

        // 2. Cambios de autonomía
        if (isAutonomyEvent(event)) {
            sseHub.broadcast({
                type: "autonomy_change",
                agent: event.source?.label ?? "coordinador",
                action: event.action,
                details: `Cambio de autonomía del agente: ${event.target?.label ?? event.target?.id}.`,
                resultSummary: `${event.action} · ${event.status}`,
                payload: event,
            });
            return;
        }

        // 3. Errores de herramientas → alerta operativa
        if (event.action === "execute" && event.status === "error") {
            sseHub.broadcast({
                type: "tool_error",
                agent: event.source?.label ?? "agent",
                action: event.action,
                details: `Fallo al ejecutar ${event.target?.label ?? event.target?.id}.`,
                resultSummary: "error",
                payload: event,
            });
        }
    } catch {
        // Un fallo en el puente nunca debe romper el flujo del agente.
    }
}

function handleProactiveAlert(alert: ProactiveAlert): void {
    try {
        sseHub.broadcast({
            type: alertTypeToSseType(alert),
            agent: "proactiveMonitor",
            action: "proactive_alert",
            details: alert.message,
            resultSummary: `${alert.severity} · ${alert.title}`,
            payload: {
                id: alert.id,
                type: alert.type,
                severity: alert.severity,
                title: alert.title,
                message: alert.message,
                metadata: alert.metadata,
                createdAt: alert.createdAt instanceof Date ? alert.createdAt.toISOString() : alert.createdAt,
            },
        });
    } catch {
        // Silencioso: el bus proactivo no debe fallar por el transporte.
    }
}

/**
 * Inicia el puente Core → SSE. Idempotente.
 */
export function startTelemetryBridge(): void {
    if (started) return;
    started = true;

    // Suscripción a telemetría del agente
    const unsubscribeTelemetry = telemetryPublisher.subscribe(handleTelemetryEvent);
    unsubscribers.push(unsubscribeTelemetry);

    // Suscripción a alertas proactivas
    const onAlert = (alert: ProactiveAlert) => handleProactiveAlert(alert);
    alertDispatcher.on("proactive_alert", onAlert);
    unsubscribers.push(() => alertDispatcher.off("proactive_alert", onAlert));
}

/**
 * Detiene el puente y libera todas las suscripciones.
 */
export function stopTelemetryBridge(): void {
    while (unsubscribers.length > 0) {
        const off = unsubscribers.pop();
        try {
            off?.();
        } catch {
            // Ignorar errores de desuscripción.
        }
    }
    started = false;
}

export function isTelemetryBridgeStarted(): boolean {
    return started;
}
