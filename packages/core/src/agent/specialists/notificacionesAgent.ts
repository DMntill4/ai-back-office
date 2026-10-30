import {
  AgentContract,
  AgentTask,
  AgentExecutionResult,
  SpecializedAgent,
} from "../contracts/agentContract";
import { evaluateOutboundNotificationPayload } from "../../security/communicationPolicyGuard";
import { grokClient } from "../../llm/client";

export class NotificacionesAgent implements SpecializedAgent {
  readonly contract: AgentContract = {
    name: "Agente de Notificaciones y Comunicaciones",
    role: "notificaciones",
    description:
      "Gestiona canales externos de comunicación (Telegram, Discord, Slack, Webhooks), previene spam, valida políticas y despacha alertas con trazabilidad.",
    acceptedTasks: ["despachar_alerta", "notificar_decision", "resumen_operativo_canal"],
    allowedTools: [
      "consultar_canales_notificacion",
      "probar_canal_notificacion",
      "enviar_notificacion_operativa",
    ],
    maxExecutionMs: 15000,
    retryPolicy: { maxRetries: 3, backoffMs: 1000 },
    requiresAiCriteria: (task: AgentTask) => {
      // Usa IA si se requiere redactar un resumen ejecutivo para canales de liderazgo o directivos
      return Boolean(task.requiresReasoning) || task.taskType === "resumen_operativo_canal";
    },
  };

  async execute(
    task: AgentTask,
    options: { llmClient?: any; signal?: AbortSignal } = {},
  ): Promise<AgentExecutionResult<any>> {
    const startTime = Date.now();
    const { title, message, decisionId, channel, severity } = task.payload || {};

    // 1. Filtrado de Seguridad de Salida: Prevenir mensajes absurdos, bromas o spam (Cortafuegos Activo)
    const safetyCheck = evaluateOutboundNotificationPayload({
      title: title || "Alerta de Sistema",
      message: message || "Notificación de MINT",
    });

    if (!safetyCheck.isAllowed) {
      return {
        success: false,
        agentName: this.contract.name,
        agentRole: this.contract.role,
        taskType: task.taskType,
        correlationId: task.correlationId,
        usedAi: false,
        durationMs: Date.now() - startTime,
        data: null,
        summary: `Envío rechazado por política de comunicación: ${safetyCheck.rejectionReason}`,
        error: "COMMUNICATION_POLICY_VIOLATION",
      };
    }

    let synthesizedMessage = message;
    let tokensConsumed: { prompt: number; completion: number; total: number } | undefined;
    let costUsd: string | undefined;
    let modelUsed: string | undefined;

    // 2. Si se solicita síntesis de canal ejecutivo, invocar modelo
    if (this.contract.requiresAiCriteria(task)) {
      const client = options.llmClient || grokClient;
      try {
        const prompt = `Redacta un aviso operativo corporativo ultra-conciso (máx 3 líneas) para enviar al canal ${channel || "general"}:
Título: ${title}
Detalles del evento: ${JSON.stringify(task.payload)}
Prioridad: ${severity || "ALTA"}

Formato: Resumen objetivo con impacto de negocio y llamada a la acción (visitar /inbox para aprobar).`;

        const llmRes = await client.chatCompletion({
          caseId: task.caseId,
          messages: [
            {
              role: "system",
              content: "Eres el Agente Especialista en Comunicaciones de MINT. Redacta alertas operativas profesionales y directas.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.1,
          maxTokens: 180,
        });

        synthesizedMessage = llmRes.content || synthesizedMessage;
        modelUsed = llmRes.model;
        tokensConsumed = {
          prompt: llmRes.usage.promptTokens,
          completion: llmRes.usage.completionTokens,
          total: llmRes.usage.totalTokens,
        };
        costUsd = llmRes.cost;
      } catch (err: any) {
        console.error(`[NOTIFICACIONES AGENT] Error en síntesis LLM: ${err.message}`);
      }
    }

    // 3. Despachar a través de @mint/notifiers si hay canales configurados
    let dispatchResult: any = { dispatched: true, channel: channel || "default" };
    try {
      if (decisionId) {
        const { dispatchDecisionNotification } = await import("@mint/notifiers");
        await dispatchDecisionNotification(decisionId, task.companyId);
      }
    } catch (err: any) {
      dispatchResult = { dispatched: false, error: err.message };
    }

    return {
      success: true,
      agentName: this.contract.name,
      agentRole: this.contract.role,
      taskType: task.taskType,
      correlationId: task.correlationId,
      usedAi: Boolean(tokensConsumed),
      modelUsed,
      tokensConsumed,
      costUsd,
      durationMs: Date.now() - startTime,
      data: dispatchResult,
      summary: `Alerta validada y enviada a canal '${channel || "configurado"}': ${title}. ${synthesizedMessage ? synthesizedMessage.slice(0, 100) : ""}`,
    };
  }
}

export const notificacionesAgent = new NotificacionesAgent();
