import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { wsTelemetryHub } from "../telemetry/wsHub";
import { telemetryPublisher } from "@mint/core";

export const telemetryRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  // 1. Endpoint WebSocket Nativo para Streaming en Tiempo Real
  server.get(
    "/ws/telemetry",
    { websocket: true },
    (socket /* WebSocket.WebSocket */, req) => {
      wsTelemetryHub.registerClient(socket);
    }
  );

  // 2. Historial de Eventos Recientes
  server.get("/api/telemetry/history", async (req, reply) => {
    const events = telemetryPublisher.getRecentEvents(50);
    return reply.send({
      success: true,
      count: events.length,
      events,
    });
  });

  // 2.1 Resumen FinOps: consumo acumulado de tokens y costo USD por tarea
  server.get("/api/telemetry/costs", async (req, reply) => {
    const events = telemetryPublisher.getRecentEvents(250);
    const costEvents = events.filter((e) => e.action === "meter" && e.cost);

    const byTask = new Map<
      string,
      { taskId: string; tokens: number; costUsd: number; model: string; lastAt: number }
    >();
    let totalTokens = 0;
    let totalCostUsd = 0;

    for (const ev of costEvents) {
      const c = ev.cost!;
      totalTokens += c.tokens || 0;
      totalCostUsd += c.costUsd || 0;
      const prev = byTask.get(c.taskId);
      byTask.set(c.taskId, {
        taskId: c.taskId,
        tokens: (prev?.tokens || 0) + (c.tokens || 0),
        costUsd: (prev?.costUsd || 0) + (c.costUsd || 0),
        model: c.model || prev?.model || "unknown",
        lastAt: ev.timestamp,
      });
    }

    return reply.send({
      success: true,
      session: {
        totalTokens,
        totalCostUsd: Number(totalCostUsd.toFixed(6)),
        taskCount: byTask.size,
      },
      tasks: Array.from(byTask.values()).sort((a, b) => b.lastAt - a.lastAt),
    });
  });

  // 3. Disparador de Ciclo Operativo Real / Simulación en Vivo
  // Permite ver cómo el grafo interactivo se ilumina y genera nodos y aristas en vivo
  server.post("/api/telemetry/simulate", async (req, reply) => {
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const source = {
      id: "agent_coordinator",
      label: "Mint Autonomous Coordinator",
      group: "agent" as const,
    };

    // Secuencia asíncrona de eventos reales
    (async () => {
      // 1. Lectura de configuración y prompts en disco
      telemetryPublisher.emitFileAccess(
        source,
        "packages/core/src/agent/prompts/base.md",
        "read",
        "success",
        2450,
        { purpose: "System Prompt Base" }
      );
      await delay(200);

      // 2. Consulta de catálogo a PostgreSQL
      telemetryPublisher.emitDatabaseOperation(
        source,
        "products",
        "query",
        "success",
        12,
        { sql: 'SELECT * FROM products WHERE sku = "SKU-MAN-SM400"' }
      );
      await delay(220);

      // 3. Paso de razonamiento ReAct
      telemetryPublisher.emitAgentStep(
        source,
        "Paso 1: Diagnóstico de Inventario",
        "execute",
        "success",
        { thought: "El producto SKU-MAN-SM400 presenta riesgo crítico de quiebre." }
      );
      await delay(180);

      // 4. Invocación de herramienta consultar_stock
      telemetryPublisher.emitToolExecution(
        source,
        "consultar_stock",
        "execute",
        "pending",
        { sku: "SKU-MAN-SM400" }
      );
      await delay(150);

      // 5. Query interna de la herramienta a la tabla inventory
      telemetryPublisher.emitDatabaseOperation(
        source,
        "inventory",
        "query",
        "success",
        1,
        { bodega: "wh_bga", stockActual: 3, puntoReorden: 12 }
      );
      await delay(160);

      // 6. Resultado de la herramienta consultar_stock
      telemetryPublisher.emitToolExecution(
        source,
        "consultar_stock",
        "execute",
        "success",
        { resultSummary: "3 unidades físicas en Bodega Bucaramanga (ROP: 12) -> QUIEBRE INMINENTE" }
      );
      await delay(220);

      // 7. Subagente de Compras y Suministros
      telemetryPublisher.emitAgentStep(
        source,
        "Módulo de Proveedores [Santander/Bogotá]",
        "spawn",
        "success",
        { specialist: "comprasSpecialist" }
      );
      await delay(180);

      // 8. Invocación de evaluar_proveedores
      telemetryPublisher.emitToolExecution(
        source,
        "evaluar_proveedores",
        "execute",
        "pending",
        { sku: "SKU-MAN-SM400", cantidadDeseada: 12 }
      );
      await delay(180);

      // 9. Query a tabla de proveedores
      telemetryPublisher.emitDatabaseOperation(
        source,
        "suppliers",
        "query",
        "success",
        3,
        { comparativa: ["Ferreterías Unidas Bogotá", "Distribuidora Santander"] }
      );
      await delay(180);

      // 10. Resultado de cotización
      telemetryPublisher.emitToolExecution(
        source,
        "evaluar_proveedores",
        "execute",
        "success",
        {
          proveedorAdjudicado: "Ferreterías Unidas Bogotá",
          costoUnitarioCop: 1560000,
          leadTimeDias: 3,
        }
      );
      await delay(220);

      // 11. Creación de Orden de Compra y Gatekeeper HITL
      telemetryPublisher.emitToolExecution(
        source,
        "crear_orden_compra",
        "execute",
        "pending",
        { totalCop: 18720000, requiereAprobacion: true }
      );
      await delay(200);

      // 12. Mutación en PostgreSQL: insert en purchase_orders
      telemetryPublisher.emitDatabaseOperation(
        source,
        "purchase_orders",
        "write",
        "success",
        1,
        { orderId: "PO-2026-0089", status: "PENDIENTE_APROBACION", totalCop: 18720000 }
      );
      await delay(180);

      // 13. Escritura de registro de auditoría en disco
      telemetryPublisher.emitFileAccess(
        source,
        "packages/core/logs/audit_execution.log",
        "write",
        "success",
        840,
        { entry: "PO-2026-0089 encolada para firma criptográfica HMAC en /inbox" }
      );
      await delay(160);

      // 14. Resultado final de tool crear_orden_compra
      telemetryPublisher.emitToolExecution(
        source,
        "crear_orden_compra",
        "execute",
        "success",
        { poId: "PO-2026-0089", policyDecision: "pending_approval" }
      );
      await delay(180);

      // 15. Paso final: Notificación al comité humano
      telemetryPublisher.emitAgentStep(
        source,
        "Comité HITL: Aprobación Alex Rivera",
        "execute",
        "success",
        { actionRequired: "Aprobar orden > $5,000,000 COP" }
      );
    })();

    return reply.send({
      success: true,
      message: "Ciclo operativo autónomo iniciado en segundo plano. Observa la telemetría en vivo vía WebSocket.",
    });
  });
};
