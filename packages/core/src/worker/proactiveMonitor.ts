import { EventEmitter as NodeEventEmitter } from "node:events";
import { randomUUID } from "node:crypto";

export interface ProactiveAlert {
  id: string;
  type: "STOCK_CRITICO" | "PROVEEEDOR_ANOMALIA" | "CADUCIDAD_PROXIMA" | "REABASTECIMIENTO_SUGERIDO";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  message: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

/**
 * Event Emitter central del motor proactivo.
 * Permite que cualquier consumidor de eventos (Fastify, WebSockets, SSE, Canales de Notificación) se conecte
 * y escuche alertas en tiempo real para ser consumidas por el Centro de Control y Notificadores.
 */
class ProactiveMonitorEmitter extends NodeEventEmitter {}

export const alertDispatcher = new ProactiveMonitorEmitter();

// Reenvio automatico de alertas proactivas a los canales reales configurados
alertDispatcher.on("proactive_alert", async (alert: ProactiveAlert) => {
  try {
    const notifiersMod: any = await import("@mint/notifiers");
    if (typeof notifiersMod.dispatchStockLogNotification === "function") {
      const companyId = alert.metadata?.companyId || "comp_default";
      await notifiersMod.dispatchStockLogNotification({
        companyId,
        type: alert.type === "STOCK_CRITICO" ? "STOCK_CRITICAL" : "DISCREPANCY",
        title: alert.title,
        description: alert.message,
        metadata: alert.metadata,
        severity: alert.severity === "CRITICAL" ? "CRITICAL" : alert.severity === "HIGH" ? "WARNING" : "INFO",
      });
    }
  } catch {}
});

const alertsMemoryStore: ProactiveAlert[] = [];

/**
 * Ejecuta una revisión completa del inventario y genera eventos proactivos.
 */
export async function runProactiveAuditCycle(companyId: string = "comp_default"): Promise<ProactiveAlert[]> {
  const newAlerts: ProactiveAlert[] = [];

  try {
    const { executeAuditarAnomalias } = await import("../tools/auditarAnomalias");
    const { executeReporteGeneral } = await import("../tools/reportesGenerales");

    const auditRes = await executeAuditarAnomalias({ tipo_auditoria: "todo" }, { companyId });
    if (auditRes.isSuccess && Array.isArray(auditRes.anomalias)) {
      for (const item of auditRes.anomalias) {
        if (item.categoria === "SISTEMA_SALUDABLE") continue;

        const isStockAnomaly = String(item.categoria || "").startsWith("DESCALCE_STOCK");
        const alert: ProactiveAlert = {
          id: `alt_${randomUUID().slice(0, 8)}`,
          type: isStockAnomaly ? "STOCK_CRITICO" : "PROVEEEDOR_ANOMALIA",
          severity: item.gravedad === "CRÍTICA" ? "CRITICAL" : item.gravedad === "ALTA" ? "HIGH" : "MEDIUM",
          title: `Alerta Logística: ${item.entidad}`,
          message: `${item.descripcion} Accion sugerida: ${item.accionSugerida}`,
          metadata: { ...item, companyId },
          createdAt: new Date(),
        };

        newAlerts.push(alert);
      }
    }

    // Revisar caducidades próximas
    const expiryRes = await executeReporteGeneral({ tipo_reporte: "caducidad" }, { companyId });
    if (expiryRes.isSuccess && Array.isArray(expiryRes.data)) {
      for (const foodItem of expiryRes.data) {
        const food = foodItem as any;
        const alert: ProactiveAlert = {
          id: `alt_exp_${randomUUID().slice(0, 8)}`,
          type: "CADUCIDAD_PROXIMA",
          severity: food.dias_restantes <= 2 ? "CRITICAL" : "HIGH",
          title: `Alerta de Caducidad: ${food.nombre}`,
          message: `El producto caduca en ${food.dias_restantes} días. Stock afectado: ${food.stock_actual ?? food.stock ?? 0} unidades.`,
          metadata: { ...food, companyId },
          createdAt: new Date(),
        };
        newAlerts.push(alert);
      }
    }
  } catch {
    // Sin conexión a BD no se inventan alertas ficticias
  }

  // Guardar en almacén en memoria y despachar evento en el bus interno
  for (const alert of newAlerts) {
    alertsMemoryStore.unshift(alert);
    alertDispatcher.emit("proactive_alert", alert);
  }

  // Mantener máximo 50 alertas recientes
  if (alertsMemoryStore.length > 50) {
    alertsMemoryStore.length = 50;
  }

  return newAlerts;
}

/**
 * Obtiene la lista actual de alertas activas enviadas a los canales y centro de control.
 */
export function getActiveProactiveAlerts(): ProactiveAlert[] {
  return [...alertsMemoryStore];
}

/**
 * Emite una alerta proactiva inmediata cuando un ajuste de inventario o venta deja el stock bajo el umbral mínimo.
 */
export async function triggerStockAlertIfLow(
  productId: string,
  currentStock: number,
  minStock: number,
  companyId: string = "comp_default",
): Promise<ProactiveAlert | null> {
  if (currentStock >= minStock) return null;

  const alert: ProactiveAlert = {
    id: `alt_stock_${randomUUID().slice(0, 8)}`,
    type: "STOCK_CRITICO",
    severity: currentStock === 0 ? "CRITICAL" : "HIGH",
    title: `¡Desabasto Crítico en Tiempo Real! (${productId})`,
    message: `El stock se redujo a ${currentStock} unidades (mínimo de seguridad: ${minStock}). Es necesario reponer inmediatamente.`,
    metadata: {
      productId,
      currentStock,
      minStock,
      companyId,
      timestamp: new Date().toISOString(),
    },
    createdAt: new Date(),
  };

  alertsMemoryStore.unshift(alert);
  if (alertsMemoryStore.length > 50) alertsMemoryStore.length = 50;
  alertDispatcher.emit("proactive_alert", alert);
  return alert;
}
