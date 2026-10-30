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
import { eq, and, desc } from "drizzle-orm";
import { sseHub } from "../events/sseHub";
import { currentSession } from "./auth";

export async function decisionsRoutes(fastify: FastifyInstance) {
  // 1. Bandeja de decisiones pendientes (HITL)
  fastify.get("/api/decisions/pending", async (request: FastifyRequest) => {
    const query = (request.query as any) || {};
    const companyId = query.companyId || currentSession.companyId;

    try {
      const rows = await db
        .select()
        .from(decisions)
        .where(
          and(
            eq(decisions.companyId, companyId),
            eq(decisions.policyDecision, "pending_approval"),
          ),
        )
        .orderBy(desc(decisions.createdAt))
        .limit(50);

      const formatted = rows.map((d) => {
        const evidence = (d.evidencePayload as any) || {};
        const risk = ((d as any).riskAnalysisPayload || (d as any).riskPayload) || {};
        const costNum = Number(d.costMxn || 0);

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
          proposingAgent: d.proposingAgent || "Agente Coordinador Multi-Agente",
          costMxn: costNum,
          costFormatted: `$${costNum.toLocaleString("es-CO", { minimumFractionDigits: 0 })} COP`,
          riskScore: Number(d.riskScore || 0),
          riskPct: `${(Number(d.riskScore || 0) * 100).toFixed(0)}%`,
          reversible: d.reversible ?? true,
          evidence,
          risk,
          costBreakdown,
          evaluation,
          policyReason: d.policyReason || "Supera el umbral de $5,000,000 COP y requiere confirmación del operador.",
          createdAt: d.createdAt,
        };
      });

      return {
        success: true,
        count: formatted.length,
        data: formatted,
      };
    } catch {
      // Si la base de datos está desconectada, retornar un array limpio o vacío
      return {
        success: true,
        count: 0,
        data: [],
      };
    }
  });

  // 2. Historial de decisiones (aprobadas, rechazadas, auto-ejecutadas)
  fastify.get("/api/decisions/history", async (request: FastifyRequest) => {
    const query = (request.query as any) || {};
    const companyId = query.companyId || currentSession.companyId;
    const limit = Number(query.limit) || 30;

    try {
      const rows = await db
        .select()
        .from(decisions)
        .where(eq(decisions.companyId, companyId))
        .orderBy(desc(decisions.createdAt))
        .limit(limit);

      return {
        success: true,
        data: rows,
      };
    } catch {
      return {
        success: true,
        data: [],
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
