import {
  AgentContract,
  AgentTask,
  AgentExecutionResult,
  SpecializedAgent,
} from "../contracts/agentContract";
import { analyzeInventoryForProduct, InventoryAnalysis } from "../especialistas/inventarioSpecialist";
import { grokClient } from "../../llm/client";

export class InventarioAgent implements SpecializedAgent {
  readonly contract: AgentContract = {
    name: "Agente de Inventario y Existencias",
    role: "inventario",
    description:
      "Supervisa existencias físicas, calcula tasa de consumo (burn rate), días de cobertura y detecta quiebres y anomalías.",
    acceptedTasks: ["analizar_existencias", "detectar_desabasto", "diagnostico_anomalia_stock"],
    allowedTools: ["consultar_stock", "pronosticar_demanda", "ajustar_stock"],
    maxExecutionMs: 15000,
    retryPolicy: { maxRetries: 2, backoffMs: 500 },
    requiresAiCriteria: (task: AgentTask) => {
      // Solo usa IA si hay una anomalía ambigua, quiebre con ventas atípicas o solicitud explícita de diagnóstico
      return (
        task.taskType === "diagnostico_anomalia_stock" ||
        Boolean(task.requiresReasoning) ||
        Boolean(task.payload?.isAnomaly)
      );
    },
  };

  async execute(
    task: AgentTask,
    options: { llmClient?: any; signal?: AbortSignal } = {},
  ): Promise<AgentExecutionResult<InventoryAnalysis | null>> {
    const startTime = Date.now();
    const productId = task.payload?.productId;

    if (!productId) {
      return {
        success: false,
        agentName: this.contract.name,
        agentRole: this.contract.role,
        taskType: task.taskType,
        correlationId: task.correlationId,
        usedAi: false,
        durationMs: Date.now() - startTime,
        data: null,
        summary: "No se especificó un productId en la tarea.",
        error: "PRODUCT_ID_MISSING",
      };
    }

    // 1. Análisis determinista sobre PostgreSQL (0 tokens, 100% fáctico)
    const analysis = await analyzeInventoryForProduct(productId, task.companyId);

    if (!analysis) {
      return {
        success: false,
        agentName: this.contract.name,
        agentRole: this.contract.role,
        taskType: task.taskType,
        correlationId: task.correlationId,
        usedAi: false,
        durationMs: Date.now() - startTime,
        data: null,
        summary: `Producto '${productId}' no encontrado en catálogo de la empresa.`,
      };
    }

    const needsAi = this.contract.requiresAiCriteria(task);
    let aiAssessment: string | undefined;
    let tokensConsumed: { prompt: number; completion: number; total: number } | undefined;
    let costUsd: string | undefined;
    let modelUsed: string | undefined;

    // 2. Si hay anomalía o se requiere razonamiento estratégico, invocar LLM con trazabilidad
    if (needsAi) {
      const client = options.llmClient || grokClient;
      try {
        const prompt = `Analiza la siguiente situación de inventario como especialista en gestión de existencias.
Producto: ${analysis.productName} (SKU: ${analysis.sku})
Stock Actual: ${analysis.currentStock} unidades
Stock Mínimo: ${analysis.minStock} unidades
Déficit: ${analysis.deficit} unidades
Tasa de consumo: ${analysis.burnRate !== null ? `${analysis.burnRate.toFixed(2)} u/día` : "Sin historial suficiente"}
Días de cobertura: ${analysis.daysCoverage !== null ? `${analysis.daysCoverage.toFixed(1)} días` : "Incierto"}
Explicación histórica: ${analysis.historyExplanation}
Notas de anomalía: ${task.reasoningPrompt || JSON.stringify(task.payload)}

Instrucción: Entrega un diagnóstico conciso de 2-3 oraciones evaluando la urgencia y el riesgo de quiebre. No inventes números ni proveedores.`;

        const llmRes = await client.chatCompletion({
          caseId: task.caseId,
          messages: [
            { role: "system", content: "Eres el Agente Especialista de Inventario de MINT. Responde conciso, técnico y fáctico en español." },
            { role: "user", content: prompt },
          ],
          temperature: 0.1,
          maxTokens: 250,
        });

        aiAssessment = llmRes.content || undefined;
        modelUsed = llmRes.model;
        tokensConsumed = {
          prompt: llmRes.usage.promptTokens,
          completion: llmRes.usage.completionTokens,
          total: llmRes.usage.totalTokens,
        };
        costUsd = llmRes.cost;
      } catch (err: any) {
        console.error(`[INVENTARIO AGENT] Fallo de llamada LLM: ${err.message}`);
      }
    }

    const isDeficit = analysis.currentStock <= analysis.minStock;
    const summary = aiAssessment
      ? `[ANÁLISIS IA]: ${aiAssessment}`
      : `Stock actual: ${analysis.currentStock}u / Mínimo: ${analysis.minStock}u. ${isDeficit ? `Déficit de ${analysis.deficit}u.` : "Existencias en rango óptimo."}`;

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
      data: analysis,
      summary,
      escalationRequired: isDeficit && analysis.currentStock === 0,
      escalationReason: analysis.currentStock === 0 ? "Quiebre total de existencias (0 unidades disponibles)" : undefined,
    };
  }
}

export const inventarioAgent = new InventarioAgent();
