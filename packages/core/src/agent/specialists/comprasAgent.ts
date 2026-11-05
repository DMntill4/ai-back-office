import {
  AgentContract,
  AgentTask,
  AgentExecutionResult,
  SpecializedAgent,
} from "../contracts/agentContract";
import { analyzePurchasingOptions, PurchasingProposal } from "../especialistas/comprasSpecialist";
import { grokClient } from "../../llm/client";

export class ComprasAgent implements SpecializedAgent {
  readonly contract: AgentContract = {
    name: "Agente de Compras y Proveedores",
    role: "compras",
    description:
      "Evalúa opciones de abastecimiento con proveedores reales, compara precios, MOQs y tiempos de entrega. CERO compras unilaterales y CERO pagos automáticos.",
    acceptedTasks: ["evaluar_proveedores", "preparar_orden_compra", "comparar_cotizaciones"],
    allowedTools: ["evaluar_proveedores", "crear_orden_compra"],
    maxExecutionMs: 15000,
    retryPolicy: { maxRetries: 2, backoffMs: 500 },
    requiresAiCriteria: (task: AgentTask) => {
      // Usa IA si hay más de 1 cotización y se solicita justificación comparativa o estrategia de negociación
      return Boolean(task.requiresReasoning) || Boolean(task.payload?.requiresComparativeAnalysis);
    },
  };

  async execute(
    task: AgentTask,
    options: { llmClient?: any; signal?: AbortSignal } = {},
  ): Promise<AgentExecutionResult<PurchasingProposal | null>> {
    const startTime = Date.now();
    const productId = task.payload?.productId;
    const targetQuantity = Number(task.payload?.quantity || 10);
    const isUrgent = Boolean(task.payload?.isUrgent);

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
        summary: "No se especificó un productId para evaluar compras.",
        error: "PRODUCT_ID_MISSING",
      };
    }

    // 1. Evaluación fáctica sobre base de datos (0 tokens)
    const purchasing = await analyzePurchasingOptions(
      productId,
      targetQuantity,
      task.companyId,
      isUrgent,
      "agent_compras",
      Boolean(task.payload?.force),
    );

    if (!purchasing) {
      return {
        success: false,
        agentName: this.contract.name,
        agentRole: this.contract.role,
        taskType: task.taskType,
        correlationId: task.correlationId,
        usedAi: false,
        durationMs: Date.now() - startTime,
        data: null,
        summary: `No existen proveedores registrados o cotizaciones disponibles para el producto '${productId}'. MINT no inventa proveedores; se registró la consulta en el banco de preguntas pendientes.`,
      };
    }

    const needsAi = this.contract.requiresAiCriteria(task);
    let aiJustification: string | undefined;
    let tokensConsumed: { prompt: number; completion: number; total: number } | undefined;
    let costUsd: string | undefined;
    let modelUsed: string | undefined;

    // 2. Si se requiere análisis comparativo de compensación (trade-off) entre precio vs lead time
    if (needsAi && purchasing.alternativeOptions.length > 0) {
      const client = options.llmClient || grokClient;
      try {
        const prompt = `Evalúa y compara las siguientes opciones reales de compra para reabastecimiento:
Cantidad solicitada: ${purchasing.recommendedQuantity} unidades
Opción recomendada: Proveedor ${purchasing.recommendedOption.supplierName}, Precio Unitario: $${purchasing.recommendedOption.unitPrice}, Plazo: ${purchasing.recommendedOption.leadTimeDays} días, Costo Total: $${purchasing.recommendedOption.totalCostMxn}.
Alternativas disponibles:
${purchasing.alternativeOptions
  .map(
    (opt) =>
      `- Proveedor ${opt.supplierName}: $${opt.unitPrice}/u, Plazo: ${opt.leadTimeDays} días, Total: $${opt.totalCostMxn}`,
  )
  .join("\n")}

Instrucción: Resume en 2 oraciones la justificación comercial de la recomendación considerando precio, plazo y confiabilidad. No inventes proveedores no listados.`;

        const llmRes = await client.chatCompletion({
          caseId: task.caseId,
          messages: [
            {
              role: "system",
              content:
                "Eres el Agente Especialista de Compras de MINT. Justifica decisiones de aprovisionamiento de manera objetiva y cuantitativa.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.1,
          maxTokens: 250,
        });

        aiJustification = llmRes.content || undefined;
        modelUsed = llmRes.model;
        tokensConsumed = {
          prompt: llmRes.usage.promptTokens,
          completion: llmRes.usage.completionTokens,
          total: llmRes.usage.totalTokens,
        };
        costUsd = llmRes.cost;
      } catch (err: any) {
        console.error(`[COMPRAS AGENT] Error en llamada LLM: ${err.message}`);
      }
    }

    const rec = purchasing.recommendedOption;
    const summary = aiJustification
      ? `[JUSTIFICACIÓN IA]: ${aiJustification}`
      : `Proveedor seleccionado: ${rec.supplierName}. Cantidad: ${purchasing.recommendedQuantity}u @ $${rec.unitPrice}/u (Total: $${purchasing.totalCostMxn} MXN). Plazo estimado: ${rec.leadTimeDays} días. Requiere aprobación humana.`;

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
      data: purchasing,
      summary,
      escalationRequired: true, // Toda propuesta de compra requiere aprobación humana (HITL)
      escalationReason: "Propuesta de compra formal pendiente de autorización humana",
    };
  }
}

export const comprasAgent = new ComprasAgent();
