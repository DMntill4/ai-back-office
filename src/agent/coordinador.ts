import { randomUUID } from "node:crypto";
import { db } from "../db/client";
import { decisions, operationalEvents, cases, businessConfig } from "../db/schema";
import { eq } from "drizzle-orm";
import { analyzeInventoryForProduct } from "./especialistas/inventarioSpecialist";
import { analyzePurchasingOptions } from "./especialistas/comprasSpecialist";
import { analyzeShipmentsForProduct } from "./especialistas/transporteSpecialist";
import { auditProposalRisk } from "./especialistas/riesgoSpecialist";
import { evaluatePolicy, type ActionProposal, type PolicyEvaluation } from "../policy/policyEngine";
import { executeAndVerifyDecision } from "../services/decisionExecutionService";
import { checkDataFreshness } from "../services/dataFreshnessService";
import { evaluateWarehouseRebalancing } from "../services/logisticsCoordinatorService";

export interface CoordinatorResult {
  success: boolean;
  caseId: string;
  decisionId?: string;
  policyResult?: PolicyEvaluation;
  proposal?: ActionProposal;
  summary: string;
}

/**
 * Agente Coordinador (Orchestrator):
 * Recibe eventos reales, delega en paralelo a los especialistas, evalúa
 * primero si existe excedente en otra bodega propia (Rebalanceo Cross-Docking)
 * antes de comprar a proveedor externo, somete a auditoría adversarial,
 * pasa por el motor determinista de políticas y despacha alertas a Discord/Telegram.
 */
export async function coordinateOperationalEvent(params: {
  eventId?: string;
  eventType: string;
  companyId?: string;
  productId?: string;
  trackingNumber?: string;
  title?: string;
  description?: string;
  payload?: Record<string, any>;
  autonomyLevel?: "dry-run" | "assisted" | "auto";
}): Promise<CoordinatorResult> {
  const companyId = params.companyId || "comp_default";
  const caseId = `case_${randomUUID().slice(0, 8)}`;
  const decisionId = `dec_${randomUUID().slice(0, 8)}`;

  // 1. Registrar caso en base de datos
  const caseTitle = params.title || `Evento Operativo: ${params.eventType}`;
  const caseDesc = params.description || `Resolución multi-agente para evento ${params.eventType}`;

  try {
    await db.insert(cases).values({
      id: caseId,
      companyId,
      title: caseTitle,
      description: caseDesc,
      status: "en_proceso",
      priority: params.eventType.includes("CRITICAL") ? "urgente" : "alta",
      inputData: params.payload || {},
    });
  } catch {
    // Continuar si ya existe
  }

  // Si no pasaron productId directamente, buscarlo en el payload
  const targetProductId = params.productId || params.payload?.productId;
  if (!targetProductId) {
    return {
      success: false,
      caseId,
      summary: "El evento no especificó un producto ID válido para análisis de inventario.",
    };
  }

  // 2. Ejecutar análisis en paralelo: Inventario, Transporte y Rebalanceo Inter-Almacén
  const [invAnalysis, transportAnalysis, rebalancingProposals] = await Promise.all([
    analyzeInventoryForProduct(targetProductId, companyId),
    analyzeShipmentsForProduct(targetProductId, companyId),
    evaluateWarehouseRebalancing(companyId).catch(() => []),
  ]);

  if (!invAnalysis) {
    return {
      success: false,
      caseId,
      summary: `Producto con ID "${targetProductId}" no encontrado en catálogo de la empresa.`,
    };
  }

  const matchingRebalance = rebalancingProposals.find((r) => r.productId === targetProductId);

  // 3. Determinar necesidad de aprovisionamiento
  const isUrgent = invAnalysis.daysCoverage < 3 || transportAnalysis.hasDelayedShipment;
  const targetQuantity = Math.max(invAnalysis.deficit, 10);

  // 4. Especialista en Compras: Buscar la mejor cotización real (con fallback resiliente)
  const purchasingAnalysis = await analyzePurchasingOptions(
    targetProductId,
    targetQuantity,
    companyId,
    isUrgent,
  );

  if (!purchasingAnalysis) {
    return {
      success: false,
      caseId,
      summary: `No existen opciones de abastecimiento para el producto "${invAnalysis.productName}".`,
    };
  }

  const recommendedOption = purchasingAnalysis.recommendedOption;
  const finalCostMxn = purchasingAnalysis.totalCostMxn;

  // 5. Especialista en Riesgo (Abogado del Diablo): Auditar la propuesta
  const riskAnalysis = await auditProposalRisk({
    productId: targetProductId,
    supplierId: recommendedOption.supplierId,
    proposedQuantity: purchasingAnalysis.recommendedQuantity,
    proposedUnitPrice: recommendedOption.unitPrice,
    totalCostMxn: finalCostMxn,
    companyId,
  });

  // 6. Consultar frescura de datos antes de decidir
  const freshnessResult = await checkDataFreshness(companyId).catch(() => null);

  // 7. Armar la Propuesta de Acción Estructurada
  const proposal: ActionProposal = {
    id: decisionId,
    companyId,
    caseId,
    actionType: "crear_orden_compra",
    title: `Reabastecimiento preventivo: ${purchasingAnalysis.recommendedQuantity}u de ${invAnalysis.productName}`,
    proposingAgent: "compras_agent",
    costMxn: finalCostMxn,
    reversible: false,
    confidence: riskAnalysis.isDuplicate ? 0.3 : 0.92,
    evidence: {
      productId: targetProductId,
      productName: invAnalysis.productName,
      sku: invAnalysis.sku,
      currentStock: invAnalysis.currentStock,
      minStock: invAnalysis.minStock,
      deficit: invAnalysis.deficit,
      burnRate: invAnalysis.burnRate,
      daysCoverage: invAnalysis.daysCoverage,
      supplierId: recommendedOption.supplierId,
      supplierName: recommendedOption.supplierName,
      unitPrice: recommendedOption.unitPrice,
      leadTimeDays: recommendedOption.leadTimeDays,
      freightCostMxn: recommendedOption.freightCostMxn || 0,
      landedCostMxn: recommendedOption.landedCostMxn || finalCostMxn,
      quantity: purchasingAnalysis.recommendedQuantity,
      rebalancingAlternative: matchingRebalance
        ? {
            fromWarehouse: matchingRebalance.fromWarehouseName,
            toWarehouse: matchingRebalance.toWarehouseName,
            transferQuantity: matchingRebalance.transferQuantity,
            transferFreightMxn: matchingRebalance.transferFreightCostMxn,
            netSavingsMxn: matchingRebalance.netSavingsMxn,
          }
        : undefined,
      dataFreshness: freshnessResult
        ? {
            isFresh: freshnessResult.isFresh,
            lastSyncedAt: freshnessResult.newestSyncAt ? freshnessResult.newestSyncAt.toISOString() : null,
            hoursSinceLastSync: freshnessResult.hoursSinceLastSync,
            sourceStatus: freshnessResult.status,
            reason: freshnessResult.reason,
          }
        : undefined,
      delayedShipmentNotice: transportAnalysis.hasDelayedShipment
        ? `Envío anterior con demora detectada en guía(s): ${transportAnalysis.delayedTrackingNumbers.join(", ")}`
        : undefined,
    },
    riskAssessment: {
      riskScore: riskAnalysis.riskScore,
      redFlags: riskAnalysis.redFlags,
      isDuplicate: riskAnalysis.isDuplicate,
      supplierVerified: riskAnalysis.supplierVerified,
      objections: riskAnalysis.mitigatedObjections,
    },
  };

  // 8. Consultar configuración de la empresa (umbral monetario y nivel de autonomía)
  const configs = await db
    .select()
    .from(businessConfig)
    .where(eq(businessConfig.companyId, companyId));

  const approvalLimitRaw = configs.find((c) => c.key === "approval_limit_amount")?.value;
  const approvalLimit = approvalLimitRaw ? Number(approvalLimitRaw) : 10000;
  const autonomyLevelRaw = configs.find((c) => c.key === "autonomy_level")?.value as any;
  const autonomyLevel = params.autonomyLevel || autonomyLevelRaw || "dry-run";

  // 9. Pasar por el Motor de Políticas Determinista
  const policyResult = evaluatePolicy(proposal, {
    approvalLimitAmount: approvalLimit,
    autonomyLevel,
  });

  // 10. Persistir la decisión en la tabla decisions
  await db.insert(decisions).values({
    id: decisionId,
    companyId,
    caseId,
    actionType: proposal.actionType,
    proposingAgent: proposal.proposingAgent,
    title: proposal.title,
    costMxn: proposal.costMxn.toString(),
    riskScore: proposal.riskAssessment.riskScore.toString(),
    reversible: proposal.reversible,
    evidencePayload: proposal.evidence,
    riskPayload: proposal.riskAssessment,
    policyDecision: policyResult.policyDecision,
    policyReason: policyResult.reason,
    decidedAt: new Date(),
  });

  // 10.1 Despachar notificación proactiva a Discord / Telegram / Slack si hay canales activos
  try {
    const { dispatchDecisionNotification } = await import("@mint/notifiers");
    await dispatchDecisionNotification({
      id: decisionId,
      companyId,
      caseId,
      title: proposal.title,
      actionType: proposal.actionType,
      proposingAgent: proposal.proposingAgent,
      costMxn: proposal.costMxn,
      riskScore: proposal.riskAssessment.riskScore,
      policyDecision: policyResult.policyDecision,
      policyReason: policyResult.reason,
      evidence: proposal.evidence,
      risk: proposal.riskAssessment,
    });
  } catch {
    // Continuar silenciosamente si no hay canales activos o en entorno de test aislado
  }

  // 11. Si el motor dictamina AUTO_EXECUTED, ejecutar y verificar de inmediato
  if (policyResult.policyDecision === "auto_executed") {
    const execution = await executeAndVerifyDecision(decisionId, "SISTEMA_AUTONOMO");
    if (params.eventId) {
      await db
        .update(operationalEvents)
        .set({ status: "RESOLVED", resolvedAt: new Date() })
        .where(eq(operationalEvents.id, params.eventId));
    }

    return {
      success: true,
      caseId,
      decisionId,
      policyResult,
      proposal,
      summary: `[DECISIÓN AUTO-EJECUTADA]: ${proposal.title}. ${policyResult.reason} ${execution.message}`,
    };
  }

  // 12. Si requiere aprobación humana (HITL), queda lista en la Bandeja de Decisiones
  if (params.eventId) {
    await db
      .update(operationalEvents)
      .set({ status: "PROCESSING", caseId })
      .where(eq(operationalEvents.id, params.eventId));
  }

  return {
    success: true,
    caseId,
    decisionId,
    policyResult,
    proposal,
    summary: `[ESCALADO A BANDEJA DE DECISIONES]: ${proposal.title}. ${policyResult.reason} Aguardando aprobación humana.`,
  };
}
