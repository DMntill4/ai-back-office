import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  db,
  cases,
  caseEvents,
  runAgentLoop,
  analyzePromptInjection,
  resolveNaturalLanguageIntent,
  mintOrchestrator,
  type AgentExecutionReport,
} from "@mint/core";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { sseHub } from "../events/sseHub";
import { currentSession } from "./auth";

export async function chatRoutes(fastify: FastifyInstance) {
  // 1. Directiva u Operación Asíncrona (Chat / Command Dispatcher)
  fastify.post("/api/chat", async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    const message = (body.message || "").trim();
    const companyId = body.companyId || currentSession.companyId;

    if (!message) {
      return reply.status(400).send({
        success: false,
        error: "El mensaje o directiva operativa no puede estar vacío.",
      });
    }

    // 0. Guardia anti-prompt-injection: corta el ataque antes de tocar la BD
    //    o de invocar cualquier herramienta del orquestador.
    const injection = analyzePromptInjection(message);
    if (injection.isSuspicious) {
      sseHub.broadcast({
        type: "security_blocked",
        agent: "Guardia de Seguridad [Prompt Injection]",
        action: "block_prompt_injection",
        details: `Directiva bloqueada. Patrones detectados: ${injection.detectedPatterns.join(", ")}.`,
        payload: { score: injection.score, patterns: injection.detectedPatterns },
      });
      return reply.status(422).send({
        success: false,
        blocked: true,
        error:
          "Identifiqué un intento de reescribir instrucciones o eludir controles de seguridad. Como agente operativo MINT mantengo mis políticas de gobernanza intactas. ¿En qué tarea operativa legítima te puedo colaborar?",
        security: {
          score: injection.score,
          patterns: injection.detectedPatterns,
        },
      });
    }

    // 1. Motor de intenciones en lenguaje natural: resuelve consultas
    //    deterministas (inventario, órdenes, flota, reportes, configuración,
    //    memoria) sin gastar tokens de LLM. También aplica los guardrails de
    //    comunicación externa y de prompt injection del core.
    let intentResult: Awaited<ReturnType<typeof resolveNaturalLanguageIntent>> | null = null;
    try {
      intentResult = await resolveNaturalLanguageIntent(companyId, message);
    } catch {
      intentResult = null;
    }

    if (intentResult?.handledDeterministically) {
      sseHub.broadcast({
        type: "intent_resolved",
        agent: "Motor de Intenciones NL",
        action: intentResult.intent,
        details: intentResult.response,
        resultSummary: intentResult.suggestedAction,
        payload: intentResult,
      });
      return reply.status(200).send({
        success: true,
        handledDeterministically: true,
        intent: intentResult.intent,
        response: intentResult.response,
        suggestedAction: intentResult.suggestedAction,
        data: intentResult.data ?? null,
      });
    }

    const caseId = body.caseId || `case_${randomUUID().slice(0, 8)}`;
    const caseTitle = message.length > 54 ? message.slice(0, 51) + "..." : message;

    // 1. Registrar caso en la base de datos
    try {
      await db
        .insert(cases)
        .values({
          id: caseId,
          companyId,
          title: caseTitle,
          description: message,
          status: "en_proceso",
          priority: "media",
          inputData: { channel: "operations_console", prompt: message },
        })
        .onConflictDoUpdate({
          target: cases.id,
          set: {
            description: message,
            status: "en_proceso",
            updatedAt: new Date(),
          },
        });
    } catch {
      // Continuar si la BD no está disponible
    }

    // 2. Notificar inmediatamente por SSE la creación del caso
    sseHub.broadcast({
      type: "case_created",
      caseId,
      agent: "Coordinador Multi-Agente",
      action: "iniciar_caso",
      details: message,
      payload: { caseId, title: caseTitle, message },
    });

    // 3. Responder de inmediato al cliente HTTP (sin bloquear la interfaz)
    reply.status(202).send({
      success: true,
      caseId,
      status: "en_proceso",
      title: caseTitle,
      message: "Directiva recibida y encolada. El progreso detallado se transmite en vivo vía SSE.",
    });

    // 4. Iniciar ejecución asíncrona del bucle multi-agente en background
    setImmediate(async () => {
      try {
        const report: AgentExecutionReport = await runAgentLoop(caseId, {
          onEvent: (ev) => {
            sseHub.broadcast({
              type: "agent_step",
              caseId,
              agent: ev.agent,
              action: ev.action,
              details: ev.details,
              payload: ev,
            });
          },
        });

        // Emitir evento final de caso resuelto o escalado
        sseHub.broadcast({
          type: "case_completed",
          caseId,
          agent: "Coordinador Multi-Agente",
          action: report.status === "resuelto" ? "resolver_caso" : "escalar_caso",
          details: report.summary,
          resultSummary: `${report.totalSteps} pasos ejecutados | Costo: $${report.totalCost} USD | Tokens: ${report.totalTokens}`,
          payload: report,
        });
      } catch (err: any) {
        sseHub.broadcast({
          type: "case_error",
          caseId,
          agent: "Coordinador Multi-Agente",
          action: "error",
          details: `Fallo durante el procesamiento: ${err.message}`,
          payload: { error: err.message },
        });
      }
    });
  });

  // 2. Historial de casos y directivas
  fastify.get("/api/chat/history", async (request: FastifyRequest) => {
    const query = (request.query as any) || {};
    const companyId = query.companyId || currentSession.companyId;

    try {
      const rows = await db
        .select()
        .from(cases)
        .where(eq(cases.companyId, companyId))
        .orderBy(desc(cases.createdAt))
        .limit(20);

      return {
        success: true,
        cases: rows,
      };
    } catch {
      return {
        success: true,
        cases: [],
      };
    }
  });

  // 3. Detalle y eventos inmutables de un caso puntual
  fastify.get("/api/cases/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      const [foundCase, events] = await Promise.all([
        db.select().from(cases).where(eq(cases.id, id)).limit(1),
        db.select().from(caseEvents).where(eq(caseEvents.caseId, id)).orderBy(caseEvents.createdAt),
      ]);

      if (foundCase.length === 0) {
        return reply.status(404).send({ success: false, error: "Caso no encontrado" });
      }

      return {
        success: true,
        case: foundCase[0],
        events,
      };
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 4. Orquestación explícita de un evento operativo (MintOrchestrator)
  //    Permite disparar el pipeline multi-agente completo sobre una señal
  //    concreta (quiebre de stock, retraso logístico, etc.) sin pasar por el
  //    bucle conversacional. Aplica gobernanza, permisos y deduplicación.
  fastify.post("/api/orchestrate", async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    const companyId = body.companyId || currentSession.companyId;
    const eventType = body.eventType;
    const title = body.title;

    if (!eventType || !title) {
      return reply.status(400).send({
        success: false,
        error: "Se requieren 'eventType' y 'title' para orquestar un evento operativo.",
      });
    }

    // Los datos libres del evento se tratan como no confiables.
    const injection = analyzePromptInjection(`${title} ${body.description || ""}`);
    if (injection.isSuspicious) {
      return reply.status(422).send({
        success: false,
        blocked: true,
        error: "El evento contiene patrones de manipulación y fue rechazado por el guardia de seguridad.",
        security: { score: injection.score, patterns: injection.detectedPatterns },
      });
    }

    try {
      const result = await mintOrchestrator.orchestrateEvent({
        eventId: body.eventId,
        eventType: String(eventType),
        companyId,
        productId: body.productId,
        title: String(title),
        description: body.description,
        payload: body.payload,
        autonomyLevel: body.autonomyLevel,
        force: Boolean(body.force),
        requireAiReasoning: Boolean(body.requireAiReasoning),
      });

      sseHub.broadcast({
        type: "orchestration_completed",
        caseId: result.caseId,
        agent: "MINT Orchestrator (Coordinador Central)",
        action: "orchestrate_event",
        details: result.summary,
        resultSummary: `Tokens: ${result.totalTokensConsumed} | Costo: $${result.totalCostUsd} USD`,
        payload: result,
      });

      return { success: result.success, data: result };
    } catch (err: any) {
      return reply.status(500).send({
        success: false,
        error: `Error al orquestar el evento: ${err.message}`,
      });
    }
  });
}

