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

export interface CompanyPolicyRules {
  approvalLimitAmount?: number; // Límite monetario autónomo (ej: 10,000 MXN)
  prohibitedSuppliers?: string[];
  requireHitlOnIrreversible?: boolean;
  minConfidenceThreshold?: number; // ej: 0.80
  maxAutonomousRiskScore?: number; // ej: 0.25
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

  const evaluatedAt = new Date().toISOString();

  // 1. REGLAS DE BLOQUEO (VETO ABSOLUTO)
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
  const isUnderThreshold = proposal.costMxn <= approvalLimit;
  const isSafeRisk = proposal.riskAssessment.riskScore <= maxRiskForAuto;
  const isHighConfidence = proposal.confidence >= minConfidence;
  const isReversibleOrAllowed = proposal.reversible || !requireHitlOnIrreversible;
  const zeroRedFlags = proposal.riskAssessment.redFlags.length === 0;

  if (isUnderThreshold && isSafeRisk && isHighConfidence && isReversibleOrAllowed && zeroRedFlags) {
    return {
      policyDecision: "auto_executed",
      reason: `AUTO-EJECUTADO: El monto ($${proposal.costMxn.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN) está bajo el umbral de autonomía ($${approvalLimit.toLocaleString("es-MX")} MXN), con riesgo mínimo (${(proposal.riskAssessment.riskScore * 100).toFixed(0)}%) y confianza sólida (${(proposal.confidence * 100).toFixed(0)}%).`,
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
    hitlReasons.push(`El monto ($${proposal.costMxn.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN) excede el umbral de autonomía autorizado de $${approvalLimit.toLocaleString("es-MX")} MXN`);
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
