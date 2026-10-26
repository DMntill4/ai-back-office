/**
 * Motor de Políticas Determinista (Policy Engine)
 * SEPARACIÓN ESTRICTA: El LLM propone; el código determinista decide y permite.
 * Ningún fondo ni orden se mueve sin pasar por estas reglas matemáticas.
 */

export interface ActionProposal {
  id: string;
  companyId: string;
  caseId: string;
  actionType: "crear_orden_compra" | "reasignar_envio" | "ajustar_stock" | "cancelar_orden";
  title: string;
  proposingAgent: "compras_agent" | "inventario_agent" | "transporte_agent" | "coordinador";
  costMxn: number;
  reversible: boolean;
  confidence: number; // 0.0 a 1.0
  evidence: {
    productId?: string;
    productName?: string;
    sku?: string;
    currentStock?: number;
    deficit?: number;
    burnRate?: number;
    daysCoverage?: number;
    supplierId?: string;
    supplierName?: string;
    unitPrice?: number;
    quantity?: number;
    trackingNumber?: string;
    dataFreshness?: {
      isFresh: boolean;
      lastSyncedAt?: string | null;
      hoursSinceLastSync?: number;
      sourceStatus?: "HEALTHY" | "DRIFTED" | "ERROR" | "STALE" | "NO_SOURCES";
      reason?: string;
    };
    [key: string]: any;
  };
  riskAssessment: {
    riskScore: number; // 0.0 (seguro) a 1.0 (peligroso)
    redFlags: string[];
    isDuplicate: boolean;
    supplierVerified: boolean;
    objections?: string[];
  };
}

export type AutonomyLevel = "dry-run" | "assisted" | "auto";

export interface CompanyPolicyRules {
  approvalLimitAmount?: number; // Límite monetario autónomo configurado por la empresa
  prohibitedSuppliers?: string[];
  requireHitlOnIrreversible?: boolean;
  minConfidenceThreshold?: number; // ej: 0.80
  maxAutonomousRiskScore?: number; // ej: 0.25
  autonomyLevel?: AutonomyLevel; // dry-run | assisted | auto
  maxDataStalenessHours?: number; // Límite máximo de desfase en horas (ej: 24h)
  currency?: string; // Divisa oficial de la empresa (USD, COP, MXN, etc.)
}

export interface PolicyEvaluation {
  policyDecision: "auto_executed" | "pending_approval" | "blocked";
  reason: string;
  matchedRule: string;
  requiresHitl: boolean;
  canExecuteNow: boolean;
  costMxn: number;
  evaluatedAt: string;
}

/**
 * Evalúa una propuesta de acción de manera 100% determinista sin intervención de IA.
 */
export function evaluatePolicy(
  proposal: ActionProposal,
  rules: CompanyPolicyRules = {},
): PolicyEvaluation {
  const approvalLimit = rules.approvalLimitAmount ?? 10000;
  const minConfidence = rules.minConfidenceThreshold ?? 0.80;
  const maxRiskForAuto = rules.maxAutonomousRiskScore ?? 0.25;
  const requireHitlOnIrreversible = rules.requireHitlOnIrreversible ?? true;
  const autonomyLevel = rules.autonomyLevel ?? "assisted";
  const maxStaleness = rules.maxDataStalenessHours ?? 24;

  const evaluatedAt = new Date().toISOString();

  // 1. REGLAS DE BLOQUEO / VETO
  // 1.0 VETO POR DATOS DESACTUALIZADOS (DATA FRESHNESS GUARDRAIL)
  const freshness = proposal.evidence?.dataFreshness;
  if (
    freshness &&
    (!freshness.isFresh ||
      freshness.sourceStatus === "DRIFTED" ||
      freshness.sourceStatus === "ERROR" ||
      (freshness.hoursSinceLastSync !== undefined && freshness.hoursSinceLastSync > maxStaleness))
  ) {
    return {
      policyDecision: "pending_approval",
      reason: `NEGATIVA POR DATOS DESACTUALIZADOS: ${freshness.reason || `La fuente externa tiene ${freshness.hoursSinceLastSync} horas sin sincronizar (límite: ${maxStaleness}h) o su estado es "${freshness.sourceStatus}"`}. El agente rechaza decidir autónomamente y escala a revisión humana.`,
      matchedRule: "RULE_STALE_DATA_REFUSAL",
      requiresHitl: true,
      canExecuteNow: false,
      costMxn: proposal.costMxn,
      evaluatedAt,
    };
  }
  // 1.1 Duplicidad confirmada en ventana reciente
  if (proposal.riskAssessment.isDuplicate) {
    return {
      policyDecision: "blocked",
      reason: "BLOQUEO: Se detectó una orden de compra idéntica activa o en proceso dentro de las últimas 72 horas.",
      matchedRule: "RULE_DUPLICATE_ORDER_PREVENTION",
      requiresHitl: false,
      canExecuteNow: false,
      costMxn: proposal.costMxn,
      evaluatedAt,
    };
  }

  // 1.2 Proveedor no verificado o vetado
  if (!proposal.riskAssessment.supplierVerified && proposal.actionType === "crear_orden_compra") {
    return {
      policyDecision: "blocked",
      reason: "BLOQUEO: El proveedor propuesto no está homologado en la base de datos de la empresa.",
      matchedRule: "RULE_UNVERIFIED_SUPPLIER",
      requiresHitl: false,
      canExecuteNow: false,
      costMxn: proposal.costMxn,
      evaluatedAt,
    };
  }

  // 1.3 Score de riesgo crítico o banderas rojas severas
  if (proposal.riskAssessment.riskScore >= 0.70 || proposal.riskAssessment.redFlags.length >= 2) {
    return {
      policyDecision: "blocked",
      reason: `BLOQUEO POR RIESGO CRÍTICO (${(proposal.riskAssessment.riskScore * 100).toFixed(0)}%): ${proposal.riskAssessment.redFlags.join("; ")}`,
      matchedRule: "RULE_HIGH_RISK_REJECTION",
      requiresHitl: false,
      canExecuteNow: false,
      costMxn: proposal.costMxn,
      evaluatedAt,
    };
  }

  // 2. REGLAS DE AUTO-EJECUCIÓN (AUTONOMÍA COMPLETA)
  // Debe cumplir simultáneamente: bajo el umbral, bajo riesgo, alta confianza y proveedor conocido
  const currency = rules.currency || (proposal.evidence as any)?.currency || "USD";
  const formatMoney = (val: number) =>
    `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;

  const effectiveLimit = autonomyLevel === "auto" ? Math.max(approvalLimit, approvalLimit * 1.5) : approvalLimit;
  const isUnderThreshold = proposal.costMxn <= effectiveLimit;
  const isSafeRisk = proposal.riskAssessment.riskScore <= maxRiskForAuto;
  const isHighConfidence = proposal.confidence >= minConfidence;
  const isReversibleOrAllowed = proposal.reversible || !requireHitlOnIrreversible || autonomyLevel === "auto";
  const zeroRedFlags = proposal.riskAssessment.redFlags.length === 0;

  if (isUnderThreshold && isSafeRisk && isHighConfidence && isReversibleOrAllowed && zeroRedFlags) {
    // Si está en dry-run, simular y reportar sin ejecutar en base de datos
    if (autonomyLevel === "dry-run") {
      return {
        policyDecision: "pending_approval",
        reason: `MODO DRY-RUN ACTIVO: La propuesta califica para auto-ejecución (${formatMoney(proposal.costMxn)}), pero no se ejecutó en base de datos porque el modo activo es dry-run.`,
        matchedRule: "RULE_DRY_RUN_GUARDRAIL",
        requiresHitl: true,
        canExecuteNow: false,
        costMxn: proposal.costMxn,
        evaluatedAt,
      };
    }

    return {
      policyDecision: "auto_executed",
      reason: `AUTO-EJECUTADO: El monto (${formatMoney(proposal.costMxn)}) está bajo el umbral de autonomía (${formatMoney(effectiveLimit)}), con riesgo mínimo (${(proposal.riskAssessment.riskScore * 100).toFixed(0)}%) y confianza sólida (${(proposal.confidence * 100).toFixed(0)}%).`,
      matchedRule: "RULE_AUTONOMOUS_EXECUTION_ELIGIBLE",
      requiresHitl: false,
      canExecuteNow: true,
      costMxn: proposal.costMxn,
      evaluatedAt,
    };
  }

  // 3. REGLAS DE ESCALAMIENTO HUMANO (HUMAN-IN-THE-LOOP - BANDEJA DE DECISIONES)
  const hitlReasons: string[] = [];
  if (!isUnderThreshold) {
    hitlReasons.push(`El monto (${formatMoney(proposal.costMxn)}) excede el umbral de autonomía autorizado de ${formatMoney(approvalLimit)}`);
  }
  if (!proposal.reversible && requireHitlOnIrreversible && proposal.actionType === "crear_orden_compra") {
    hitlReasons.push("La orden de compra es una operación financiera vinculante");
  }
  if (proposal.riskAssessment.riskScore > maxRiskForAuto) {
    hitlReasons.push(`El agente de riesgo reportó advertencias (Score: ${(proposal.riskAssessment.riskScore * 100).toFixed(0)}%): ${proposal.riskAssessment.redFlags.join(", ") || "Sobrecosto o lead time atípico"}`);
  }
  if (!isHighConfidence) {
    hitlReasons.push(`Confianza del modelo (${(proposal.confidence * 100).toFixed(0)}%) inferior al umbral mínimo (${(minConfidence * 100).toFixed(0)}%)`);
  }

  return {
    policyDecision: "pending_approval",
    reason: `ESCALADO A BANDEJA DE DECISIONES: ${hitlReasons.join(". ")}.`,
    matchedRule: !isUnderThreshold ? "RULE_EXCEEDS_AUTONOMOUS_BUDGET" : "RULE_HUMAN_IN_THE_LOOP_REQUIRED",
    requiresHitl: true,
    canExecuteNow: false,
    costMxn: proposal.costMxn,
    evaluatedAt,
  };
}
