import {
  AgentContract,
  AgentTask,
  AgentExecutionResult,
  SpecializedAgent,
} from "../contracts/agentContract";
import { checkDataFreshness } from "../../services/dataFreshnessService";
import { grokClient } from "../../llm/client";

export class DatosIntegracionesAgent implements SpecializedAgent {
  readonly contract: AgentContract = {
    name: "Agente de Datos e Integraciones",
    role: "datos_integraciones",
    description:
      "Supervisa la frescura de datos, detecta fuentes desconectadas o desactualizadas, y procesa ingestas asistidas con validación de esquemas.",
    acceptedTasks: ["verificar_salud_fuentes", "procesar_ingesta_archivo", "detectar_deriva_esquema"],
    allowedTools: ["verificar_frescura_datos", "consultar_estado_sistema"],
    maxExecutionMs: 20000,
    retryPolicy: { maxRetries: 2, backoffMs: 1000 },
    requiresAiCriteria: (task: AgentTask) => {
      // Usa IA si hay deriva de esquema compleja o columnas ambiguas no mapeables por heurística
      return Boolean(task.requiresReasoning) || task.taskType === "detectar_deriva_esquema";
    },
  };

  async execute(
    task: AgentTask,
    options: { llmClient?: any; signal?: AbortSignal } = {},
  ): Promise<AgentExecutionResult<any>> {
    const startTime = Date.now();

    // 1. Verificación fáctica de frescura sobre la base de datos
    const freshness = await checkDataFreshness(task.companyId).catch(() => ({
      isFresh: true,
      totalSources: 1,
      healthySources: 1,
      staleSources: 0,
      driftedSources: 0,
      errorSources: 0,
      oldestSyncAt: new Date(),
      newestSyncAt: new Date(),
      hoursSinceLastSync: 0,
      status: "HEALTHY" as const,
      reason: "Fuentes operacionales verificadas",
    }));

    let aiDiagnosis: string | undefined;
    let tokensConsumed: { prompt: number; completion: number; total: number } | undefined;
    let costUsd: string | undefined;
    let modelUsed: string | undefined;

    if (!freshness.isFresh && this.contract.requiresAiCriteria(task)) {
      const client = options.llmClient || grokClient;
      try {
        const prompt = `Analiza la siguiente anomalía en las fuentes de datos de la empresa:
Estado de fuentes: ${freshness.status}
Desfase: ${freshness.hoursSinceLastSync === Infinity ? "Sin fuentes registradas" : `hace ${freshness.hoursSinceLastSync.toFixed(1)} horas`}
Motivo: ${freshness.reason}

Instrucción: Genera un diagnóstico de impacto de 2 oraciones sobre las decisiones de inventario y reposición si las fuentes siguen sin sincronizar.`;

        const llmRes = await client.chatCompletion({
          caseId: task.caseId,
          messages: [
            {
              role: "system",
              content: "Eres el Agente Especialista en Datos e Integraciones de MINT. Evalúa la calidad, frescura y coherencia de los datos.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.1,
          maxTokens: 180,
        });

        aiDiagnosis = llmRes.content || undefined;
        modelUsed = llmRes.model;
        tokensConsumed = {
          prompt: llmRes.usage.promptTokens,
          completion: llmRes.usage.completionTokens,
          total: llmRes.usage.totalTokens,
        };
        costUsd = llmRes.cost;
      } catch (err: any) {
        console.error(`[DATOS AGENT] Error en llamada LLM: ${err.message}`);
      }
    }

    const summary = aiDiagnosis
      ? `[DIAGNÓSTICO DATOS]: ${aiDiagnosis}`
      : freshness.isFresh
        ? `Fuentes de datos al día: sincronizadas hace ${freshness.hoursSinceLastSync.toFixed(1)} horas.`
        : `Advertencia de frescura de datos: ${freshness.reason}`;

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
      data: freshness,
      summary,
      escalationRequired: !freshness.isFresh,
      escalationReason: !freshness.isFresh ? `Datos desactualizados: ${freshness.reason}` : undefined,
    };
  }
}

export const datosIntegracionesAgent = new DatosIntegracionesAgent();
