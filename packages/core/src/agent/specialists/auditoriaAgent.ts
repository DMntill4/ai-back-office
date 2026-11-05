import {
  AgentContract,
  AgentTask,
  AgentExecutionResult,
  SpecializedAgent,
} from "../contracts/agentContract";
import { auditProposalRisk, RiskAuditResult } from "../especialistas/riesgoSpecialist";
import { grokClient } from "../../llm/client";

export class AuditoriaAgent implements SpecializedAgent {
  readonly contract: AgentContract = {
    name: "Agente de Auditoría y Control (Abogado del Diablo)",
    role: "auditoria",
    description:
      "Cuestiona activamente las propuestas de compra, detecta órdenes duplicadas, sobrecostos atípicos, proveedores no homologados y gobernanza financiera.",
    acceptedTasks: [
      "auditar_propuesta_riesgo",
      "verificar_evidencias_decision",
      "auditar_anomalias_financieras",
    ],
    allowedTools: ["auditar_anomalias", "analisis_financiero"],
    maxExecutionMs: 15000,
    retryPolicy: { maxRetries: 2, backoffMs: 500 },
    requiresAiCriteria: (task: AgentTask) => {
      // Usa IA si el puntaje de riesgo supera 0.40 o si se detectan objeciones/red flags graves
      return Boolean(task.requiresReasoning) || Boolean(task.payload?.hasRedFlags);
    },
  };

  async execute(
    task: AgentTask,
    options: { llmClient?: any; signal?: AbortSignal } = {},
  ): Promise<AgentExecutionResult<RiskAuditResult | null>> {
    const startTime = Date.now();
    const { productId, supplierId, proposedQuantity, proposedUnitPrice, totalCostMxn } =
      task.payload || {};

    if (!productId || !supplierId) {
      return {
        success: false,
        agentName: this.contract.name,
        agentRole: this.contract.role,
        taskType: task.taskType,
        correlationId: task.correlationId,
        usedAi: false,
        durationMs: Date.now() - startTime,
        data: null,
        summary: "Faltan parámetros requeridos (productId o supplierId) para auditoría de riesgo.",
      };
    }

    // 1. Auditoría adversarial fáctica en PostgreSQL (0 tokens)
    const auditResult = await auditProposalRisk({
      productId,
      supplierId,
      proposedQuantity: Number(proposedQuantity || 1),
      proposedUnitPrice: Number(proposedUnitPrice || 0),
      totalCostMxn: Number(totalCostMxn || 0),
      companyId: task.companyId,
    });

    const isHighRisk = auditResult.riskScore >= 0.4 || auditResult.redFlags.length > 0;
    const taskWithFlags: AgentTask = {
      ...task,
      payload: { ...task.payload, hasRedFlags: isHighRisk },
    };

    const needsAi = this.contract.requiresAiCriteria(taskWithFlags);
    let aiCritique: string | undefined;
    let tokensConsumed: { prompt: number; completion: number; total: number } | undefined;
    let costUsd: string | undefined;
    let modelUsed: string | undefined;

    // 2. Si el riesgo es elevado, invocar al Abogado del Diablo con IA para generar la objeción formal
    if (needsAi) {
      const client = options.llmClient || grokClient;
      try {
        const prompt = `Actúa como el Auditor Adversarial de Riesgo (Abogado del Diablo) de MINT.
Cuestiona rigurosamente la siguiente propuesta de operación comercial:
Puntaje de riesgo calculado: ${auditResult.riskScore.toFixed(2)} / 1.00
Banderas rojas detectadas:
${auditResult.redFlags.length > 0 ? auditResult.redFlags.map((f) => `- ${f}`).join("\n") : "Ninguna bandera roja detectada"}
Objeciones mitigadas:
${auditResult.mitigatedObjections.map((m) => `- ${m}`).join("\n")}
Costo Total Propuesto: $${totalCostMxn} MXN

Instrucción: Entrega una objeción crítica de 2-3 oraciones exponiendo el peor escenario financiero u operativo si esta propuesta es autorizada.`;

        const llmRes = await client.chatCompletion({
          caseId: task.caseId,
          messages: [
            {
              role: "system",
              content: "Eres el Auditor Adversarial de MINT. Tu labor es proteger el capital de la empresa cuestionando toda propuesta dudosa.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.1,
          maxTokens: 220,
        });

        aiCritique = llmRes.content || undefined;
        modelUsed = llmRes.model;
        tokensConsumed = {
          prompt: llmRes.usage.promptTokens,
          completion: llmRes.usage.completionTokens,
          total: llmRes.usage.totalTokens,
        };
        costUsd = llmRes.cost;
      } catch (err: any) {
        console.error(`[AUDITORIA AGENT] Error en llamada LLM: ${err.message}`);
      }
    }

    const summary = aiCritique
      ? `[OBJECIÓN ADVERSARIAL IA]: ${aiCritique}`
      : auditResult.redFlags.length > 0
        ? `Riesgo detectado (${(auditResult.riskScore * 100).toFixed(0)}%): ${auditResult.redFlags.join("; ")}`
        : `Auditoría superada (Riesgo bajo ${(auditResult.riskScore * 100).toFixed(0)}%): Sin órdenes duplicadas ni anomalías en los últimos 3 días.`;

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
      data: auditResult,
      summary,
      escalationRequired: isHighRisk,
      escalationReason: isHighRisk ? `Riesgo elevado: ${auditResult.redFlags[0] || "Puntaje de riesgo superior a 0.40"}` : undefined,
    };
  }
}

export const auditoriaAgent = new AuditoriaAgent();
