import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  db,
  decisions,
  executeAndVerifyDecision,
  rejectDecision,
} from "@mint/core";
import {
  processRemoteApproval,
  processOutboxQueue,
  getOutboxQueueStats,
} from "@mint/notifiers";
import { eq, and, desc, ne, count } from "drizzle-orm";
import { sseHub } from "../events/sseHub";
import { currentSession } from "./auth";

export async function decisionsRoutes(fastify: FastifyInstance) {
  // 1. Bandeja de decisiones pendientes (HITL)
  fastify.get("/api/decisions/pending", async (request: FastifyRequest, reply: FastifyReply) => {
    const query = (request.query as any) || {};
    const companyId = query.companyId || currentSession.companyId;

    try {
      const where = and(
        eq(decisions.companyId, companyId),
        eq(decisions.policyDecision, "pending_approval"),
      );
      const [rows, totalRows] = await Promise.all([
        db
        .select()
        .from(decisions)
        .where(where)
        .orderBy(desc(decisions.createdAt))
        .limit(100),
        db.select({ value: count() }).from(decisions).where(where),
      ]);

      const formatted = rows.map((d) => {
        const evidence = (d.evidencePayload as any) || {};
        const risk = ((d as any).riskAnalysisPayload || (d as any).riskPayload) || {};
        const costNum = d.costMxn == null ? null : Number(d.costMxn);

        // Desglose FinOps de la tarea que originó la decisión (si está disponible)
        const costBreakdown = {
          tokens: Number(evidence.totalTokens ?? evidence.tokens ?? 0),
          costUsd: Number(evidence.totalCostUsd ?? evidence.costUsd ?? 0),
          model: evidence.modelUsed ?? evidence.model ?? null,
        };

        // Veredicto de auto-evaluación (Reflection Loop) adjunto a la evidencia
        const evaluation = evidence.evaluation ?? null;

        return {
          id: d.id,
          caseId: d.caseId,
          title: d.title,
          actionType: d.actionType,
          proposingAgent: d.proposingAgent,
          costMxn: costNum,
          costFormatted: costNum == null
            ? null
            : `$${costNum.toLocaleString("es-CO", { minimumFractionDigits: 0 })} COP`,
          riskScore: Number(d.riskScore || 0),
          riskPct: `${(Number(d.riskScore || 0) * 100).toFixed(0)}%`,
          reversible: d.reversible,
          evidence,
          risk,
          costBreakdown,
          evaluation,
          policyReason: d.policyReason,
          createdAt: d.createdAt,
        };
      });

      return {
        success: true,
        count: Number(totalRows[0]?.value ?? formatted.length),
        data: formatted,
      };
    } catch (error) {
      request.log.error({ err: error }, "Failed to query pending decisions");
      reply.code(503);
      return {
        success: false,
        count: 0,
        data: [],
        message: "No fue posible consultar las decisiones pendientes en la base de datos.",
      };
    }
  });

  // 2. Historial de decisiones (aprobadas, rechazadas, auto-ejecutadas)
  fastify.get("/api/decisions/history", async (request: FastifyRequest, reply: FastifyReply) => {
    const query = (request.query as any) || {};
    const companyId = query.companyId || currentSession.companyId;
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 30));
    const offset = Math.max(0, Number(query.offset) || 0);
    const where = query.status === "resolved"
      ? and(eq(decisions.companyId, companyId), ne(decisions.policyDecision, "pending_approval"))
      : eq(decisions.companyId, companyId);

    try {
      const [rows, totalRows] = await Promise.all([
        db
        .select()
        .from(decisions)
        .where(where)
        .orderBy(desc(decisions.createdAt))
        .limit(limit)
        .offset(offset),
        db.select({ value: count() }).from(decisions).where(where),
      ]);

      return {
        success: true,
        count: Number(totalRows[0]?.value ?? rows.length),
        data: rows,
      };
    } catch (error) {
      request.log.error({ err: error }, "Failed to query decision history");
      reply.code(503);
      return {
        success: false,
        count: 0,
        data: [],
        message: "No fue posible consultar el historial de decisiones en la base de datos.",
      };
    }
  });

  // 3. Detalle de una decisión puntual
  fastify.get("/api/decisions/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      const found = await db.select().from(decisions).where(eq(decisions.id, id)).limit(1);
      if (found.length === 0) {
        return reply.status(404).send({ success: false, error: "Decisión no encontrada" });
      }
      return { success: true, data: found[0] };
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 4. Resolver decisión (aprobar o rechazar) - Formato CLI estándar
  fastify.post("/api/decisions/:id/resolve", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const action = body.action || "approve";
    const approvedBy = body.approvedBy || currentSession.userName || "Operador Consola";
    const reason = body.reason || "Revisión y confirmación desde la Consola de Operaciones";

    if (action === "approve") {
      try {
        const result = await executeAndVerifyDecision(id, approvedBy, reason);
        if (result.success) {
          sseHub.broadcast({
            type: "decision_resolved",
            agent: "Gobernanza Criptográfica [HITL]",
            action: "approve",
            details: `Decisión ${id} APROBADA por ${approvedBy}. Orden #${result.orderId || "GENERADA"}`,
            resultSummary: `Verificado en PostgreSQL. ${result.message}`,
            payload: result,
          });
          return { ...result };
        }
        return reply.status(400).send({ ...result });
      } catch (err: any) {
        return reply.status(500).send({ success: false, error: err.message });
      }
    } else {
      try {
        const result = await rejectDecision(id, approvedBy, reason);
        sseHub.broadcast({
          type: "decision_resolved",
          agent: "Gobernanza Criptográfica [HITL]",
          action: "reject",
          details: `Decisión ${id} RECHAZADA por ${approvedBy}. Motivo: ${reason}`,
          resultSummary: "Archivada y descartada en base de datos",
          payload: result,
        });
        return { ...result };
      } catch (err: any) {
        return reply.status(500).send({ success: false, error: err.message });
      }
    }
  });

  // 4.1 Alias directo /approve
  fastify.post("/api/decisions/:id/approve", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const approvedBy = body.approvedBy || currentSession.userName || "Operador Consola";

    try {
      const result = await executeAndVerifyDecision(id, approvedBy, body.feedback);
      if (result.success) {
        sseHub.broadcast({
          type: "decision_resolved",
          agent: "Gobernanza Criptográfica [HITL]",
          action: "approve",
          details: `Decisión ${id} aprobada con firma HMAC.`,
          resultSummary: `Orden #${result.orderId || "OK"} generada y verificada`,
          payload: result,
        });
      }
      return { success: result.success, result };
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 4.2 Alias directo /reject
  fastify.post("/api/decisions/:id/reject", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const rejectedBy = body.rejectedBy || currentSession.userName || "Operador Consola";
    const reason = body.reason || "Rechazada desde la consola";

    try {
      const result = await rejectDecision(id, rejectedBy, reason);
      sseHub.broadcast({
        type: "decision_resolved",
        agent: "Gobernanza Criptográfica [HITL]",
        action: "reject",
        details: `Decisión ${id} rechazada.`,
        payload: result,
      });
      return { success: true, result };
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 5. Aprobación remota por token firmado (Telegram / Slack / Gmail)
  fastify.post("/api/decisions/remote-approval", async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    const signedToken = body.signedToken || body.token;
    const channel = body.channel || "telegram";
    const approverName = body.approverName || currentSession.userName || "Operador Remoto";

    if (!signedToken) {
      return reply.status(400).send({
        success: false,
        error: "Se requiere 'signedToken' para procesar la aprobación remota.",
      });
    }

    if (!["telegram", "slack", "gmail"].includes(channel)) {
      return reply.status(400).send({
        success: false,
        error: `Canal no soportado: '${channel}'. Usa telegram, slack o gmail.`,
      });
    }

    try {
      const result = await processRemoteApproval({
        signedToken: String(signedToken),
        approverName: String(approverName),
        channel,
      });

      sseHub.broadcast({
        type: "decision_resolved",
        agent: `Gobernanza Remota [${channel}]`,
        action: "remote_approval",
        details: `Aprobación remota procesada por ${approverName} vía ${channel}.`,
        resultSummary: result.auditMessage,
        payload: result,
      });

      return { success: result.success, data: result };
    } catch (err: any) {
      // Token reutilizado, expirado o decisión ya resuelta → conflicto idempotente.
      return reply.status(409).send({ success: false, error: err.message });
    }
  });

  // 6. Estado de la cola outbox de notificaciones
  fastify.get("/api/decisions/outbox/stats", async () => {
    try {
      return { success: true, data: getOutboxQueueStats() };
    } catch (err: any) {
      return { success: false, data: null, error: err.message };
    }
  });

  // 7. Forzar el drenaje de la cola outbox (reintentos con backoff)
  fastify.post("/api/decisions/outbox/process", async () => {
    try {
      const result = await processOutboxQueue();
      return { success: true, data: result };
    } catch (err: any) {
      return { success: false, data: null, error: err.message };
    }
  });
}
