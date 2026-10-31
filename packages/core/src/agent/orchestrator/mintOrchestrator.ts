import { randomUUID } from "node:crypto";
import { db } from "../../db/client";
import { cases, decisions, operationalEvents, caseEvents } from "../../db/schema";
import { eq, and, asc } from "drizzle-orm";
import { AgentTask, AgentExecutionResult, SpecializedAgent } from "../contracts/agentContract";
import { agentRegistry } from "../registry/agentRegistry";
import { evaluatePolicy, ActionProposal, PolicyEvaluation } from "../../policy/policyEngine";
import { executeAndVerifyDecision } from "../../services/decisionExecutionService";
import { getProductsWithOpenProposals } from "../../events/openProposals";
import { grokClient } from "../../llm/client";
import {
  checkAgentPermission,
  auditLogPermissionViolation,
  type AgentActionType,
  type ResourceDomain,
} from "../../security/agentPermissionsMatrix";
import { telemetryPublisher } from "../../telemetry/telemetryPublisher";
import { toMintGraphNodeId } from "../../graph/graph.types";
import {
  evaluateBeforeClosing,
  type SelfEvaluationResult,
} from "../evaluation/selfEvaluator";

export interface OrchestrationResult {
  correlationId: string;
  caseId: string;
  decisionId?: string;
  success: boolean;
  policyResult?: PolicyEvaluation;
  proposal?: ActionProposal;
  agentResults: Record<string, AgentExecutionResult>;
  usedAi: boolean;
  totalTokensConsumed: number;
  totalCostUsd: string;
  summary: string;
  deduplicated?: boolean;
  /** Veredicto de la auto-evaluación previa a la propuesta (Reflection Loop) */
  evaluation?: SelfEvaluationResult;
}

export class MintOrchestrator {
  readonly name = "MINT Orchestrator (Coordinador Central)";

  /**
   * Procesa un evento operativo recibiendo la señal, descomponiendo la tarea entre los
   * agentes especializados disponibles, combinando resultados, pasando por gobernanza
   * y despachando alertas con trazabilidad unificada.
   */
  async orchestrateEvent(params: {
    eventId?: string;
    eventType: string;
    companyId?: string;
    productId?: string;
    title?: string;
    description?: string;
    payload?: Record<string, any>;
    autonomyLevel?: "dry-run" | "assisted" | "auto";
    force?: boolean;
    llmClient?: any;
    requireAiReasoning?: boolean;
  }): Promise<OrchestrationResult> {
    const companyId = params.companyId || "comp_default";
    const correlationId = `corr_${randomUUID().slice(0, 10)}`;
    const caseId = `case_${randomUUID().slice(0, 8)}`;
    const decisionId = `dec_${randomUUID().slice(0, 8)}`;
    const targetProductId = params.productId || params.payload?.productId;

    // 0. Guardia anti-duplicados: Si ya existe una propuesta abierta para el producto, no duplicar
    if (targetProductId && !params.force) {
      const blocked = await getProductsWithOpenProposals(companyId);
      if (blocked.has(String(targetProductId))) {
        if (params.eventId) {
          await db
            .update(operationalEvents)
            .set({ status: "DISMISSED" })
            .where(eq(operationalEvents.id, params.eventId))
            .catch(() => { });
        }
        return {
          correlationId,
          caseId: "",
          success: true,
          agentResults: {},
          usedAi: false,
          totalTokensConsumed: 0,
          totalCostUsd: "0.000000",
          deduplicated: true,
          summary: `Ya existe una propuesta abierta para el producto ${targetProductId}. No se creó otra duplicada.`,
        };
      }
    }

    // 1. Abrir caso en PostgreSQL para trazabilidad forense
    const caseTitle = params.title || `Evento Operativo: ${params.eventType}`;
    const caseDesc = params.description || `Orquestación multi-agente para ${params.eventType}`;

    await db.insert(cases).values({
      id: caseId,
      companyId,
      title: caseTitle,
      description: caseDesc,
      status: "en_proceso",
      priority: params.eventType.includes("CRITICAL") ? "urgente" : "alta",
      inputData: { ...params.payload, correlationId },
    }).onConflictDoNothing();

    // Registrar inicio en la línea de tiempo inmutable
    await db.insert(caseEvents).values({
      id: `evt_${randomUUID().slice(0, 8)}`,
      caseId,
      eventType: "orquestacion_iniciada",
      payload: { correlationId, eventType: params.eventType, targetProductId },
    }).catch(() => { });

    // 2. Consultar agentes habilitados para el perfil de esta empresa
    const enabledConfigs = await agentRegistry.getEnabledAgentsForCompany(companyId);
    const enabledMap = new Map(enabledConfigs.map((c) => [c.agent.contract.role, c.isEnabled]));

    const agentResults: Record<string, AgentExecutionResult> = {};
    let accumulatedTokens = 0;
    let accumulatedCost = 0;

    // 3. Paso 1: Agente de Inventario (Existencias y Detección de Quiebres)
    const invAgent = agentRegistry.getAgent("inventario");
    let invAnalysis: any = null;

    if (invAgent && enabledMap.get("inventario") && targetProductId) {
      const invTask: AgentTask = {
        taskId: `tsk_inv_${randomUUID().slice(0, 6)}`,
        correlationId,
        companyId,
        caseId,
        taskType: "analizar_existencias",
        priority: "alta",
        payload: { productId: targetProductId, isAnomaly: params.requireAiReasoning },
        requiresReasoning: params.requireAiReasoning,
        createdAt: new Date().toISOString(),
      };

      const invRes = await this.executeTaskWithPermission(
        invAgent,
        invTask,
        "analyze",
        "inventario",
        { llmClient: params.llmClient },
      );
      agentResults.inventario = invRes;
      invAnalysis = invRes.data;

      if (invRes.tokensConsumed) {
        accumulatedTokens += invRes.tokensConsumed.total;
        accumulatedCost += parseFloat(invRes.costUsd || "0");
      }
    }

    if (!invAnalysis && targetProductId) {
      return {
        correlationId,
        caseId,
        success: false,
        agentResults,
        usedAi: false,
        totalTokensConsumed: 0,
        totalCostUsd: "0.000000",
        summary: `Producto '${targetProductId}' no encontrado en catálogo de la empresa.`,
      };
    }

    // 4. Paso 2: Agente de Logística (Evaluación de Rebalanceo entre Almacenes)
    const logAgent = agentRegistry.getAgent("logistica");
    let rebalanceOption: any = null;

    if (logAgent && enabledMap.get("logistica") && targetProductId) {
      const logTask: AgentTask = {
        taskId: `tsk_log_${randomUUID().slice(0, 6)}`,
        correlationId,
        companyId,
        caseId,
        taskType: "monitorear_envios",
        priority: "media",
        payload: { productId: targetProductId },
        createdAt: new Date().toISOString(),
      };

      const logRes = await this.executeTaskWithPermission(
        logAgent,
        logTask,
        "read",
        "logistica",
        { llmClient: params.llmClient },
      );
      agentResults.logistica = logRes;
    }

    // Si opera en modo 'Solo Tienda', registrar alerta física y terminar sin compras externas
    if (!enabledMap.get("compras")) {
      await db
        .update(cases)
        .set({
          status: "resuelto",
          resultSummary: `Existencias bajas en tienda para ${invAnalysis?.productName || "producto"} (${invAnalysis?.currentStock || 0}u).`,
          resolutionReason: "Modo 'Solo Tienda': compras externas a proveedores silenciadas para evitar órdenes fantasma.",
          updatedAt: new Date(),
        })
        .where(eq(cases.id, caseId));

      return {
        correlationId,
        caseId,
        success: true,
        agentResults,
        usedAi: accumulatedTokens > 0,
        totalTokensConsumed: accumulatedTokens,
        totalCostUsd: accumulatedCost.toFixed(6),
        summary: `Alerta registrada para tienda física (${invAnalysis?.currentStock || 0}u restantes). Módulo de compras externas silenciado según directiva.`,
      };
    }

    // 5. Paso 3: Agente de Compras y Proveedores (Cotizaciones Homologadas)
    const comprasAgent = agentRegistry.getAgent("compras");
    let purchasingData: any = null;

    if (comprasAgent && enabledMap.get("compras") && targetProductId) {
      const targetQuantity = invAnalysis ? Math.max(invAnalysis.deficit, 10) : 15;
      const isUrgent = invAnalysis ? invAnalysis.currentStock === 0 : false;

      const comprasTask: AgentTask = {
        taskId: `tsk_comp_${randomUUID().slice(0, 6)}`,
        correlationId,
        companyId,
        caseId,
        taskType: "evaluar_proveedores",
        priority: isUrgent ? "urgente" : "alta",
        payload: {
          productId: targetProductId,
          quantity: targetQuantity,
          isUrgent,
          force: params.force,
          requiresComparativeAnalysis: params.requireAiReasoning,
        },
        requiresReasoning: params.requireAiReasoning,
        createdAt: new Date().toISOString(),
      };

      const comprasRes = await this.executeTaskWithPermission(
        comprasAgent,
        comprasTask,
        "read",
        "proveedores",
        { llmClient: params.llmClient },
      );
      agentResults.compras = comprasRes;
      purchasingData = comprasRes.data;

      if (comprasRes.tokensConsumed) {
        accumulatedTokens += comprasRes.tokensConsumed.total;
        accumulatedCost += parseFloat(comprasRes.costUsd || "0");
      }
    }

    if (!purchasingData) {
      return {
        correlationId,
        caseId,
        success: false,
        agentResults,
        usedAi: accumulatedTokens > 0,
        totalTokensConsumed: accumulatedTokens,
        totalCostUsd: accumulatedCost.toFixed(6),
        summary: `No existen opciones de abastecimiento para el producto '${invAnalysis?.productName || targetProductId}'. Se registró la consulta en preguntas pendientes.`,
      };
    }

    const recommendedOption = purchasingData.recommendedOption;
    const finalCostMxn = purchasingData.totalCostMxn;

    // 6. Paso 4: Agente de Auditoría y Control (Abogado del Diablo)
    const auditAgent = agentRegistry.getAgent("auditoria");
    let auditData: any = null;

    if (auditAgent && enabledMap.get("auditoria") && targetProductId) {
      const auditTask: AgentTask = {
        taskId: `tsk_aud_${randomUUID().slice(0, 6)}`,
        correlationId,
        companyId,
        caseId,
        taskType: "auditar_propuesta_riesgo",
        priority: "alta",
        payload: {
          productId: targetProductId,
          supplierId: recommendedOption.supplierId,
          proposedQuantity: purchasingData.recommendedQuantity,
          proposedUnitPrice: recommendedOption.unitPrice,
          totalCostMxn: finalCostMxn,
        },
        requiresReasoning: params.requireAiReasoning,
        createdAt: new Date().toISOString(),
      };

      const auditRes = await this.executeTaskWithPermission(
        auditAgent,
        auditTask,
        "analyze",
        "auditoria",
        { llmClient: params.llmClient },
      );
      agentResults.auditoria = auditRes;
      auditData = auditRes.data;

      if (auditRes.tokensConsumed) {
        accumulatedTokens += auditRes.tokensConsumed.total;
        accumulatedCost += parseFloat(auditRes.costUsd || "0");
      }
    }

    // 7. Síntesis y Razonamiento del Orquestador si se solicitó deliberación con IA
    let orchestratorAiNote: string | undefined;
    if (params.requireAiReasoning) {
      const client = params.llmClient || grokClient;
      try {
        const prompt = `Como MINT Orchestrator, analiza y sintetiza la deliberación de tus 4 agentes especializados:
1. Inventario: ${agentResults.inventario?.summary || "N/A"}
2. Compras: ${agentResults.compras?.summary || "N/A"}
3. Logística: ${agentResults.logistica?.summary || "N/A"}
4. Auditoría de Riesgo: ${agentResults.auditoria?.summary || "N/A"}

Decisión recomendada: Crear orden de compra de ${purchasingData.recommendedQuantity}u con proveedor ${recommendedOption.supplierName} por un total de $${finalCostMxn} MXN.
Instrucción: Emite un veredicto directivo de 2 frases combinando riesgo, urgencia y rentabilidad.`;

        const llmRes = await client.chatCompletion({
          caseId,
          messages: [
            {
              role: "system",
              content: "Eres el MINT Orchestrator central. Diriges especialistas, evitas contradicciones y tomas resoluciones equilibradas.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.1,
          maxTokens: 250,
        });

        orchestratorAiNote = llmRes.content || undefined;
        accumulatedTokens += llmRes.usage.totalTokens;
        accumulatedCost += parseFloat(llmRes.cost || "0");
      } catch (err: any) {
        console.error(`[ORCHESTRATOR] Error en deliberación LLM: ${err.message}`);
      }
    }

    // 8. Armar Propuesta Estructurada y Evaluar Gobernanza (Motor de Políticas Determinista)
    const proposal: ActionProposal = {
      id: decisionId,
      companyId,
      caseId,
      actionType: "crear_orden_compra",
      title: `Reabastecimiento: ${purchasingData.recommendedQuantity}u de ${invAnalysis.productName}`,
      proposingAgent: "compras_agent",
      costMxn: finalCostMxn,
      reversible: false,
      confidence: auditData?.isDuplicate ? 0.3 : 0.92,
      evidence: {
        correlationId,
        productId: targetProductId,
        productName: invAnalysis.productName,
        sku: invAnalysis.sku,
        currentStock: invAnalysis.currentStock,
        minStock: invAnalysis.minStock,
        deficit: invAnalysis.deficit,
        supplierId: recommendedOption.supplierId,
        supplierName: recommendedOption.supplierName,
        unitPrice: recommendedOption.unitPrice,
        orchestratorAiNote,
        delayedShipmentNotice: agentResults.logistica?.data?.hasDelayedShipment
          ? `Envío anterior con demora detectada en guía(s): ${agentResults.logistica.data.delayedTrackingNumbers?.join(", ") ||
          agentResults.logistica.data.delayedShipmentTracking ||
          ""
          }`
          : undefined,
      },
      riskAssessment: {
        riskScore: auditData?.riskScore || 0.1,
        redFlags: auditData?.redFlags || [],
        isDuplicate: Boolean(auditData?.isDuplicate),
        supplierVerified: auditData?.supplierVerified !== false,
        objections: auditData?.mitigatedObjections || [],
      },
    };

    const policyResult = evaluatePolicy(proposal, {
      autonomyLevel: (params.autonomyLevel || "assisted") as any,
    });

    // 8.1 Auto-evaluación previa a la propuesta (Reflection & Verification Loop)
    // Audita factibilidad, políticas y confianza antes de emitir la decisión.
    let evaluation: SelfEvaluationResult | undefined;
    try {
      evaluation = await evaluateBeforeClosing({
        taskId: caseId,
        proposalSummary: proposal.title,
        citedData: {
          productId: targetProductId,
          supplierId: recommendedOption.supplierId,
          proposedQuantity: purchasingData.recommendedQuantity,
          proposedUnitPrice: recommendedOption.unitPrice,
          totalCostMxn: finalCostMxn,
          companyId,
        },
        executedTools: Object.values(agentResults).map((r) => ({
          toolName: r.agentRole,
          isSuccess: r.success,
        })),
        unverifiedWrites: 0,
      });

      // Si la confianza es insuficiente, se degrada la propuesta a revisión humana
      // (nunca se auto-ejecuta una acción con baja confianza).
      if (evaluation.requiresRegeneration && policyResult.policyDecision === "auto_executed") {
        policyResult.policyDecision = "pending_approval";
        policyResult.reason = `${policyResult.reason} | Auto-evaluación: ${evaluation.reason}`;
      }

      db.insert(caseEvents)
        .values({
          id: `evt_${randomUUID()}`,
          caseId,
          eventType: "auto_evaluacion",
          payload: {
            verdict: evaluation.verdict,
            confidence: evaluation.confidence,
            riskLevel: evaluation.riskLevel,
            feasibility: evaluation.feasibility,
            policy: evaluation.policy,
            reason: evaluation.reason,
          },
        })
        .then(
          () => { },
          () => { },
        );
    } catch {
      // La auto-evaluación nunca debe romper la orquestación
    }

    // 9. Persistir Decisión Formal en PostgreSQL
    await db.insert(decisions).values({
      id: decisionId,
      companyId,
      caseId,
      actionType: proposal.actionType,
      proposingAgent: proposal.proposingAgent,
      title: proposal.title,
      costMxn: proposal.costMxn.toFixed(2),
      riskScore: proposal.riskAssessment.riskScore.toFixed(3),
      reversible: proposal.reversible,
      policyDecision: policyResult.policyDecision,
      policyReason: policyResult.reason,
      evidencePayload: proposal.evidence,
      riskPayload: proposal.riskAssessment,
      decidedAt: new Date(),
    });

    // 10. Despachar a Notificaciones si corresponde
    const notifAgent = agentRegistry.getAgent("notificaciones");
    if (notifAgent && enabledMap.get("notificaciones")) {
      const notifTask: AgentTask = {
        taskId: `tsk_notif_${randomUUID().slice(0, 6)}`,
        correlationId,
        companyId,
        caseId,
        taskType: "notificar_decision",
        priority: "alta",
        payload: {
          decisionId,
          title: proposal.title,
          message: `${proposal.title}. Costo: $${proposal.costMxn} MXN. Estado: ${policyResult.policyDecision}.`,
          severity: "HIGH",
        },
        createdAt: new Date().toISOString(),
      };

      const notifRes = await this.executeTaskWithPermission(
        notifAgent,
        notifTask,
        "notify",
        "notificaciones",
        { llmClient: params.llmClient },
      ).catch(() => null);
      if (notifRes) agentResults.notificaciones = notifRes;
    }

    // 11. Ejecución automática si la política lo autoriza
    if (policyResult.policyDecision === "auto_executed") {
      const execution = await executeAndVerifyDecision(decisionId, "SISTEMA_REGLA_POLITICA");
      if (params.eventId) {
        await db
          .update(operationalEvents)
          .set({ status: "RESOLVED", resolvedAt: new Date() })
          .where(eq(operationalEvents.id, params.eventId));
      }

      this.emitCostTelemetry(caseId, accumulatedTokens, accumulatedCost, params.llmClient);

      return {
        correlationId,
        caseId,
        decisionId,
        success: true,
        policyResult,
        proposal,
        agentResults,
        usedAi: accumulatedTokens > 0,
        totalTokensConsumed: accumulatedTokens,
        totalCostUsd: accumulatedCost.toFixed(6),
        summary: `[DECISIÓN AUTO-EJECUTADA]: ${proposal.title}. ${policyResult.reason} ${execution.message}`,
        evaluation,
      };
    }

    // 12. Escalado a Bandeja de Decisiones (HITL)
    if (params.eventId) {
      await db
        .update(operationalEvents)
        .set({ status: "PROCESSING", caseId })
        .where(eq(operationalEvents.id, params.eventId));
    }

    this.emitCostTelemetry(caseId, accumulatedTokens, accumulatedCost, params.llmClient);

    return {
      correlationId,
      caseId,
      decisionId,
      success: true,
      policyResult,
      proposal,
      agentResults,
      usedAi: accumulatedTokens > 0,
      totalTokensConsumed: accumulatedTokens,
      totalCostUsd: accumulatedCost.toFixed(6),
      summary: orchestratorAiNote
        ? `[DELIBERACIÓN IA]: ${orchestratorAiNote} -> Propuesta en /inbox aguardando aprobación humana.`
        : `[ESCALADO A /INBOX]: ${proposal.title}. ${policyResult.reason} Aguardando aprobación humana.`,
      evaluation,
    };
  }

  /**
   * Emite el evento FinOps de consumo de la tarea orquestada (best-effort).
   */
  private emitCostTelemetry(
    caseId: string,
    tokens: number,
    costUsd: number,
    llmClient?: any,
  ): void {
    try {
      telemetryPublisher.emitCost(
        { id: "mint-orchestrator", label: "MINT Orchestrator", group: "agent" },
        {
          taskId: caseId,
          tokens,
          costUsd,
          model: llmClient?.defaultModel || "grok-4.6",
        },
      );
    } catch {
      // Telemetría best-effort
    }
  }

  /**
   * Recupera y procesa eventos pendientes en la base de datos (Garantía de Recuperación y Resiliencia 24/7).
   */
  async processPendingOperationalEvents(companyId: string = "comp_default"): Promise<number> {
    const pendingEvents = await db
      .select()
      .from(operationalEvents)
      .where(and(eq(operationalEvents.companyId, companyId), eq(operationalEvents.status, "PENDING")))
      .orderBy(asc(operationalEvents.createdAt))
      .limit(10);

    let processedCount = 0;
    for (const event of pendingEvents) {
      try {
        const payload = (event.payload || {}) as Record<string, any>;
        await this.orchestrateEvent({
          eventId: event.id,
          eventType: event.eventType,
          companyId: event.companyId,
          productId: payload.productId,
          title: event.title,
          description: event.description,
          payload,
          force: Boolean(payload.force),
        });
        processedCount++;
      } catch (err: any) {
        console.error(`[ORCHESTRATOR] Error procesando evento pendiente ${event.id}: ${err.message}`);
      }
    }

    return processedCount;
  }

  /**
   * Ejecuta una subtarea sobre un agente validando previamente sus permisos en la matriz de seguridad.
   * El coordinador puede asignar tareas, pero JAMÁS ampliar o elevar los permisos del agente receptor.
   */
  async executeTaskWithPermission(
    agent: SpecializedAgent,
    task: AgentTask,
    action: AgentActionType,
    domain: ResourceDomain,
    options?: { llmClient?: any; elevationAttempt?: boolean },
  ): Promise<AgentExecutionResult> {
    // Si el coordinador o caller intenta forzar una elevación de privilegios, rechazar inmediatamente
    if (options?.elevationAttempt) {
      const reason = `INTENTO DE ELEVACIÓN DE PRIVILEGIOS RECHAZADO: El coordinador intentó conceder permisos no autorizados al agente '${agent.contract.role}'.`;
      await auditLogPermissionViolation({
        companyId: task.companyId,
        agentRole: agent.contract.role,
        action,
        domain,
        reason,
        code: "DENIED_ORCHESTRATOR_ELEVATION_ATTEMPT",
        caseId: task.caseId,
      });
      return {
        success: false,
        agentName: agent.contract.name,
        agentRole: agent.contract.role,
        taskType: task.taskType,
        correlationId: task.correlationId,
        usedAi: false,
        durationMs: 0,
        data: null,
        summary: reason,
        error: reason,
      };
    }

    // Validación estricta contra la matriz de permisos de agente
    const check = await checkAgentPermission(agent.contract.role, action, domain, {
      companyId: task.companyId,
      caseId: task.caseId,
    });

    if (!check.allowed) {
      return {
        success: false,
        agentName: agent.contract.name,
        agentRole: agent.contract.role,
        taskType: task.taskType,
        correlationId: task.correlationId,
        usedAi: false,
        durationMs: 0,
        data: null,
        summary: `ACCESO DENEGADO [Matriz de Permisos]: ${check.reason}`,
        error: check.reason,
      };
    }

    const payload = task.payload && typeof task.payload === "object"
      ? task.payload as Record<string, unknown>
      : {};
    const productId = String(payload.productId ?? payload.product_id ?? payload.sku ?? "");
    const supplierId = String(payload.supplierId ?? payload.supplier_id ?? "");
    const warehouseId = String(payload.warehouseId ?? payload.warehouse_id ?? "");
    const shipmentId = String(payload.shipmentId ?? payload.shipment_id ?? "");
    const agentId = toMintGraphNodeId("agent", agent.contract.role);
    const role = agent.contract.role;
    const targetNodeId = productId
      ? toMintGraphNodeId("sku", productId)
      : supplierId && role === "compras"
        ? toMintGraphNodeId("supp", supplierId)
        : warehouseId && (role === "inventario" || role === "logistica")
          ? toMintGraphNodeId("wh", warehouseId)
          : shipmentId && role === "logistica"
            ? toMintGraphNodeId("ship", shipmentId)
            : toMintGraphNodeId("case", task.caseId ?? task.taskId);
    const traversalAction = /inventario|stock|existencia/i.test(task.taskType)
      ? "reading_stock"
      : /logistica|envio|ruta/i.test(task.taskType)
        ? "routing_shipment"
        : /compra|proveedor|orden/i.test(task.taskType)
          ? "evaluating_supplier"
          : "executing_task";

    telemetryPublisher.publishGraphTraversal({
      taskId: task.caseId ?? task.taskId,
      agentId,
      targetNodeId,
      action: traversalAction,
      path: [agentId, targetNodeId],
      status: "active",
    });

    const result = await agent.execute(task, { llmClient: options?.llmClient });
    telemetryPublisher.publishGraphTraversal({
      taskId: task.caseId ?? task.taskId,
      agentId,
      targetNodeId,
      action: traversalAction,
      path: [agentId, targetNodeId],
      status: result.success ? "completed" : "warning",
    });
    return result;
  }
}

export const mintOrchestrator = new MintOrchestrator();
