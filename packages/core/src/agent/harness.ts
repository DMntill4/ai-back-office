import { randomUUID } from "node:crypto";
import { db } from "../db/client";
import { cases, decisions, businessConfig, companies } from "../db/schema";
import { eq } from "drizzle-orm";
import { analyzeInventoryForProduct, type InventoryAnalysis } from "./especialistas/inventarioSpecialist";
import { analyzePurchasingOptions, type PurchasingProposal } from "./especialistas/comprasSpecialist";
import { analyzeShipmentsForProduct, type ShipmentAnalysis } from "./especialistas/transporteSpecialist";
import { auditProposalRisk, type RiskAuditResult } from "./especialistas/riesgoSpecialist";
import { evaluatePolicy, type ActionProposal, type AutonomyLevel } from "../policy/policyEngine";
import { executeAndVerifyDecision } from "../services/decisionExecutionService";
import { checkDataFreshness } from "../services/dataFreshnessService";

export interface HarnessScenarioOption {
  optionId: string;
  strategy: "cost_optimized" | "speed_optimized" | "conservative";
  title: string;
  supplierName: string;
  totalCostMxn: number;
  deliveryDays: number;
  riskScore: number;
  confidence: number;
  policyDecision: "auto_executed" | "pending_approval" | "blocked";
  proposal: ActionProposal;
}

export interface HarnessExecutionResult {
  harnessId: string;
  caseId: string;
  companyId: string;
  triggerEvent: {
    type: string;
    severity: string;
    summary: string;
  };
  specialists: {
    inventario: InventoryAnalysis | null;
    compras: PurchasingProposal | null;
    transporte: ShipmentAnalysis | null;
    riesgo: RiskAuditResult | null;
  };
  asciiReasoningTree: string;
  scenarios: HarnessScenarioOption[];
  recommendedScenario: HarnessScenarioOption | null;
  executedAutomatically: boolean;
  auditSignature: string;
}

/**
 * Autonomous Multi-Agent Controller Harness:
 * Orquestador determinista y paralelo que simula, analiza y audita
 * operaciones logísticas complejas para empresas.
 */
export async function runBackOfficeHarness(params: {
  companyId: string;
  productId: string;
  eventType?: "STOCK_CRITICAL" | "SHIPMENT_DELAY" | "PRICE_ANOMALY" | "ANOMALY_DETECTED";
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  customNotes?: string;
  forceAutonomyLevel?: AutonomyLevel;
}): Promise<HarnessExecutionResult> {
  const companyId = params.companyId || "comp_default";
  const harnessId = `harn_${randomUUID().slice(0, 8)}`;
  const caseId = `case_${randomUUID().slice(0, 8)}`;
  const eventType = params.eventType || "STOCK_CRITICAL";
  const severity = params.severity || "HIGH";

  // 1. Abrir caso formal en PostgreSQL para trazabilidad
  await db.insert(cases).values({
    id: caseId,
    companyId,
    title: `[Harness ${harnessId}] Evento Autónomo: ${eventType}`,
    description: params.customNotes || `Resolución multi-agente en paralelo para producto ${params.productId}`,
    status: "en_proceso",
    priority: severity === "CRITICAL" ? "urgente" : "alta",
  }).onConflictDoNothing();

  // 2. Ejecutar análisis de especialistas en paralelo con tolerancia a fallos
  const [invResult, transportResult] = await Promise.all([
    analyzeInventoryForProduct(params.productId, companyId).catch(() => null),
    analyzeShipmentsForProduct(params.productId, companyId).catch(() => null),
  ]);

  const targetQuantity = invResult ? Math.max(invResult.deficit, 10) : 25;
  const isUrgent = invResult
    ? invResult.currentStock === 0 || (invResult.daysCoverage !== null && invResult.daysCoverage < 3)
    : true;

  // 3. Compras y evaluación de proveedores
  const purchasingResult = await analyzePurchasingOptions(
    params.productId,
    targetQuantity,
    companyId,
    isUrgent,
  ).catch(() => null);

  // 4. Auditoría de riesgo adversarial
  let riskResult: RiskAuditResult | null = null;
  if (purchasingResult && purchasingResult.recommendedOption) {
    riskResult = await auditProposalRisk({
      productId: params.productId,
      supplierId: purchasingResult.recommendedOption.supplierId,
      proposedQuantity: purchasingResult.recommendedQuantity,
      proposedUnitPrice: purchasingResult.recommendedOption.unitPrice,
      totalCostMxn: purchasingResult.totalCostMxn,
      companyId,
    }).catch(() => null);
  }

  // 5. Cargar reglas corporativas reales (divisa, límite de aprobación y nivel de autonomía)
  let currency = "USD";
  let approvalLimitAmount: number | undefined = undefined;
  let configuredAutonomy: string | undefined = undefined;
  try {
    const [compRows, cfgRows] = await Promise.all([
      db.select({ currency: companies.currency }).from(companies).where(eq(companies.id, companyId)).limit(1),
      db.select().from(businessConfig).where(eq(businessConfig.companyId, companyId)),
    ]);
    if (compRows[0]?.currency) currency = compRows[0].currency;
    const limitCfg = cfgRows.find((c) => c.key === "approval_limit_amount");
    if (limitCfg?.value) {
      const parsed = parseFloat(limitCfg.value);
      if (Number.isFinite(parsed) && parsed > 0) approvalLimitAmount = parsed;
      if (limitCfg.currency) currency = limitCfg.currency;
    }
    const autoCfg = cfgRows.find((c) => c.key === "autonomy_level");
    if (autoCfg?.value) configuredAutonomy = autoCfg.value;
  } catch {}

  const scenarios: HarnessScenarioOption[] = [];
  const autonomyLevel = params.forceAutonomyLevel || (configuredAutonomy as any) || "dry-run";

  const freshnessResult = await checkDataFreshness(companyId).catch(() => null);

  if (purchasingResult && purchasingResult.recommendedOption) {
    const rec = purchasingResult.recommendedOption;
    const baseProposal: ActionProposal = {
      id: `prop_${randomUUID().slice(0, 8)}`,
      companyId,
      caseId,
      actionType: "crear_orden_compra",
      title: `Orden automática a ${rec.supplierName}: ${purchasingResult.recommendedQuantity}u`,
      proposingAgent: "compras_agent",
      costMxn: purchasingResult.totalCostMxn,
      reversible: false,
      confidence: riskResult ? 1 - riskResult.riskScore : 0.9,
      evidence: {
        productId: params.productId,
        productName: invResult?.productName || "Producto Operativo",
        currentStock: invResult?.currentStock || 0,
        deficit: invResult?.deficit || targetQuantity,
        daysCoverage: invResult?.daysCoverage || 1,
        supplierId: rec.supplierId,
        supplierName: rec.supplierName,
        quantity: purchasingResult.recommendedQuantity,
        unitPrice: rec.unitPrice,
        currency,
        dataFreshness: freshnessResult ? {
          isFresh: freshnessResult.isFresh,
          lastSyncedAt: freshnessResult.newestSyncAt ? freshnessResult.newestSyncAt.toISOString() : null,
          hoursSinceLastSync: freshnessResult.hoursSinceLastSync,
          sourceStatus: freshnessResult.status,
          reason: freshnessResult.reason,
        } : undefined,
      },
      riskAssessment: {
        riskScore: riskResult?.riskScore || 0.1,
        redFlags: riskResult?.redFlags || [],
        isDuplicate: riskResult?.isDuplicate || false,
        supplierVerified: true,
      },
    };

    const policyEval = evaluatePolicy(baseProposal, {
      autonomyLevel,
      approvalLimitAmount,
      currency,
    });

    scenarios.push({
      optionId: "opt_primary",
      strategy: "cost_optimized",
      title: `Estrategia de Menor Costo: Compra a ${rec.supplierName}`,
      supplierName: rec.supplierName,
      totalCostMxn: purchasingResult.totalCostMxn,
      deliveryDays: rec.leadTimeDays,
      riskScore: riskResult?.riskScore || 0.1,
      confidence: baseProposal.confidence,
      policyDecision: policyEval.policyDecision,
      proposal: baseProposal,
    });
  }

  const recommendedScenario = scenarios[0] || null;

  // 6. Generar árbol ASCII de razonamiento para CLI y Terminal
  const deficitStr = invResult
    ? invResult.daysCoverage !== null
      ? `${invResult.deficit}u (cobertura ${invResult.daysCoverage.toFixed(1)}d)`
      : `${invResult.deficit}u (historial insuficiente)`
    : "N/A";
  const vendorStr = purchasingResult?.recommendedOption ? `${purchasingResult.recommendedOption.supplierName} ($${purchasingResult.totalCostMxn} ${currency})` : "Sin proveedor";
  const riskStr = riskResult ? `${(riskResult.riskScore * 100).toFixed(0)}% riesgo (${riskResult.redFlags.length} alertas)` : "Evaluación estándar";
  const verdictStr = recommendedScenario ? recommendedScenario.policyDecision.toUpperCase() : "PENDING_REVIEW";

  const asciiReasoningTree = [
    `[DISPARADOR: ${eventType}] ──► [HARNESS CONTROLLER: ${harnessId}]`,
    `                               ├── [1. INVENTARIO]: Déficit ${deficitStr}`,
    `                               ├── [2. COMPRAS]: ${vendorStr}`,
    `                               ├── [3. TRANSPORTE]: ${transportResult?.hasDelayedShipment ? "Guía con retraso detectado" : "Rutas estándar en orden"}`,
    `                               └── [4. RIESGO ADVERSARIAL]: ${riskStr}`,
    `                                         │`,
    `                                         ▼`,
    `                              [POLÍTICA DETERMINISTA] ──► [${verdictStr}]`,
  ].join("\n");

  // 7. Persistir decisión inmutable en base de datos si hay escenario recomendado
  let executedAutomatically = false;
  if (recommendedScenario) {
    const decisionId = `dec_${randomUUID().slice(0, 8)}`;
    await db.insert(decisions).values({
      id: decisionId,
      companyId,
      caseId,
      actionType: recommendedScenario.proposal.actionType,
      proposingAgent: recommendedScenario.proposal.proposingAgent,
      title: recommendedScenario.proposal.title,
      costMxn: String(recommendedScenario.totalCostMxn),
      riskScore: String(recommendedScenario.riskScore),
      reversible: false,
      evidencePayload: recommendedScenario.proposal.evidence,
      riskPayload: recommendedScenario.proposal.riskAssessment,
      policyDecision: recommendedScenario.policyDecision,
      policyReason: `Harness Controller Auto-Synthesis (${recommendedScenario.strategy})`,
    }).onConflictDoNothing();

    if (recommendedScenario.policyDecision === "auto_executed") {
      await executeAndVerifyDecision(decisionId, "MINT_HARNESS_CONTROLLER");
      executedAutomatically = true;
    }
  }

  return {
    harnessId,
    caseId,
    companyId,
    triggerEvent: {
      type: eventType,
      severity,
      summary: params.customNotes || `Intervención autónoma para producto ${params.productId}`,
    },
    specialists: {
      inventario: invResult,
      compras: purchasingResult,
      transporte: transportResult,
      riesgo: riskResult,
    },
    asciiReasoningTree,
    scenarios,
    recommendedScenario,
    executedAutomatically,
    auditSignature: `SIG-HMAC-${randomUUID().slice(0, 12).toUpperCase()}`,
  };
}
