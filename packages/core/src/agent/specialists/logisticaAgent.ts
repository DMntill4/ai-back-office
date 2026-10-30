import {
  AgentContract,
  AgentTask,
  AgentExecutionResult,
  SpecializedAgent,
} from "../contracts/agentContract";
import { analyzeShipmentsForProduct, ShipmentAnalysis } from "../especialistas/transporteSpecialist";
import { evaluateWarehouseRebalancing } from "../../services/logisticsCoordinatorService";
import { grokClient } from "../../llm/client";

export class LogisticaAgent implements SpecializedAgent {
  readonly contract: AgentContract = {
    name: "Agente de Logística y Envíos",
    role: "logistica",
    description:
      "Vigila envíos en tránsito, detecta demoras viales, evalúa rebalanceo entre almacenes y calcula costos de fletes reales.",
    acceptedTasks: ["monitorear_envios", "calcular_rebalanceo", "calcular_ruta_flete"],
    allowedTools: ["consultar_envios", "calcular_ruta_logistica", "consolidar_cargas_y_rebalancear"],
    maxExecutionMs: 15000,
    retryPolicy: { maxRetries: 2, backoffMs: 500 },
    requiresAiCriteria: (task: AgentTask) => {
      return Boolean(task.requiresReasoning) || Boolean(task.payload?.hasDisruption);
    },
  };

  async execute(
    task: AgentTask,
    options: { llmClient?: any; signal?: AbortSignal } = {},
  ): Promise<AgentExecutionResult<any>> {
    const startTime = Date.now();
    const productId = task.payload?.productId;

    // 1. Verificar si la tarea es rebalanceo o análisis de envíos
    if (task.taskType === "calcular_rebalanceo") {
      const rebalances = await evaluateWarehouseRebalancing(task.companyId).catch(() => []);
      const matched = productId ? rebalances.filter((r) => r.productId === productId) : rebalances;

      return {
        success: true,
        agentName: this.contract.name,
        agentRole: this.contract.role,
        taskType: task.taskType,
        correlationId: task.correlationId,
        usedAi: false,
        durationMs: Date.now() - startTime,
        data: matched,
        summary:
          matched.length > 0
            ? `Se identificaron ${matched.length} oportunidades de rebalanceo cross-docking entre almacenes propios antes de comprar a proveedores externos.`
            : "No hay excedentes disponibles en otros almacenes para rebalanceo.",
      };
    }

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
        summary: "No se especificó un productId para monitoreo logístico.",
      };
    }

    // 2. Monitoreo de envíos activos sobre PostgreSQL
    const shipmentAnalysis: ShipmentAnalysis = await analyzeShipmentsForProduct(
      productId,
      task.companyId,
    );

    let aiNotes: string | undefined;
    let tokensConsumed: { prompt: number; completion: number; total: number } | undefined;
    let costUsd: string | undefined;
    let modelUsed: string | undefined;

    if (shipmentAnalysis.hasDelayedShipment && this.contract.requiresAiCriteria(task)) {
      const client = options.llmClient || grokClient;
      try {
        const prompt = `Analiza la siguiente situación de retraso en envío:
Guías demoradas: ${shipmentAnalysis.delayedTrackingNumbers.join(", ") || "N/A"}
Envíos activos: ${shipmentAnalysis.activeShipmentsCount}
Cantidad en tránsito demorada: ${shipmentAnalysis.inTransitQuantity}
Hechos operativos: ${shipmentAnalysis.compactFacts}

Instrucción: Genera un plan de acción de contingencia de 2 oraciones para el coordinador de operaciones.`;

        const llmRes = await client.chatCompletion({
          caseId: task.caseId,
          messages: [
            {
              role: "system",
              content: "Eres el Agente Especialista en Logística y Transporte de MINT. Responde conciso y enfocado a mitigar impactos viales.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.1,
          maxTokens: 200,
        });

        aiNotes = llmRes.content || undefined;
        modelUsed = llmRes.model;
        tokensConsumed = {
          prompt: llmRes.usage.promptTokens,
          completion: llmRes.usage.completionTokens,
          total: llmRes.usage.totalTokens,
        };
        costUsd = llmRes.cost;
      } catch (err: any) {
        console.error(`[LOGISTICA AGENT] Error en llamada LLM: ${err.message}`);
      }
    }

    const summary = aiNotes
      ? `[CONTINGENCIA LOGÍSTICA]: ${aiNotes}`
      : shipmentAnalysis.hasDelayedShipment
        ? `Envío demorado detectado: Guías ${shipmentAnalysis.delayedTrackingNumbers.join(", ")}. Cantidad demorada: ${shipmentAnalysis.inTransitQuantity}.`
        : `Logística normal: ${shipmentAnalysis.activeShipmentsCount} envío(s) en tránsito sin demoras reportadas.`;

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
      data: shipmentAnalysis,
      summary,
      escalationRequired: shipmentAnalysis.hasDelayedShipment,
      escalationReason: shipmentAnalysis.hasDelayedShipment
        ? `Retraso confirmado en envíos: ${shipmentAnalysis.delayedTrackingNumbers.join(", ")}`
        : undefined,
    };
  }
}

export const logisticaAgent = new LogisticaAgent();
