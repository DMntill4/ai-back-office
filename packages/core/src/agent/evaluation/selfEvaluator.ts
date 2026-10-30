/**
 * Self-Evaluation & Verification Loop (Reflection)
 *
 * Antes de cerrar un objetivo o emitir una propuesta de decisión, el agente
 * se auto-evalúa en tres dimensiones:
 *   1. Factibilidad / Consistencia: ¿los datos citados existen realmente?
 *   2. Políticas / Guardrails: ¿cumple la matriz de permisos y los límites?
 *   3. Confianza (0-100): si < umbral, el orquestador debe regenerar el plan.
 *
 * El evaluador es determinista (0 tokens) y opcionalmente puede enriquecerse
 * con una crítica del LLM. Se apoya en `auditProposalRisk` para el análisis
 * de riesgo de propuestas de compra.
 */

import { auditProposalRisk, type RiskAuditResult } from "../especialistas/riesgoSpecialist";

export type EvaluationVerdict = "aprobado" | "requiere_revision" | "rechazado";

export interface SelfEvaluationInput {
    /** Identificador de la tarea / caso evaluado */
    taskId: string;
    /** Resumen o propuesta que el agente pretende cerrar */
    proposalSummary: string;
    /** Datos citados por el agente que deben existir en la BD real */
    citedData?: {
        productId?: string;
        supplierId?: string;
        proposedQuantity?: number;
        proposedUnitPrice?: number;
        totalCostMxn?: number;
        companyId?: string;
    };
    /** Herramientas ejecutadas durante el ciclo (para verificar consistencia) */
    executedTools?: Array<{ toolName: string; isSuccess: boolean; verified?: boolean }>;
    /** Escrituras no verificadas detectadas en el ciclo */
    unverifiedWrites?: number;
    /** Umbral mínimo de confianza para aprobar sin revisión (default 80) */
    confidenceThreshold?: number;
}

export interface SelfEvaluationResult {
    taskId: string;
    verdict: EvaluationVerdict;
    /** Puntaje de confianza 0-100 */
    confidence: number;
    /** 1. Factibilidad / Consistencia */
    feasibility: {
        passed: boolean;
        score: number;
        issues: string[];
    };
    /** 2. Políticas / Guardrails */
    policy: {
        passed: boolean;
        score: number;
        issues: string[];
    };
    /** 3. Confianza agregada */
    confidenceScore: number;
    /** Nivel de riesgo derivado (0-1) */
    riskLevel: number;
    /** Análisis de riesgo detallado si se evaluó una propuesta de compra */
    riskAudit?: RiskAuditResult;
    /** Indica si el orquestador debe regenerar/ajustar el plan antes de responder */
    requiresRegeneration: boolean;
    /** Motivo legible del veredicto */
    reason: string;
    /** Tokens consumidos por la evaluación (0 si es determinista) */
    tokensConsumed: number;
    /** Costo USD de la evaluación (0 si es determinista) */
    costUsd: number;
}

const DEFAULT_CONFIDENCE_THRESHOLD = 80;

/**
 * Ejecuta la auto-evaluación determinista de una propuesta antes de cerrarla.
 * No consume tokens: usa reglas y el auditor de riesgo existente.
 */
export async function evaluateBeforeClosing(
    input: SelfEvaluationInput,
): Promise<SelfEvaluationResult> {
    const threshold = input.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;
    const feasibilityIssues: string[] = [];
    const policyIssues: string[] = [];

    // --- 1. Factibilidad / Consistencia ---
    let feasibilityScore = 100;
    const cited = input.citedData || {};

    if (cited.productId !== undefined && !cited.productId) {
        feasibilityIssues.push("Falta el identificador de producto citado.");
        feasibilityScore -= 30;
    }
    if (cited.supplierId !== undefined && !cited.supplierId) {
        feasibilityIssues.push("Falta el identificador de proveedor citado.");
        feasibilityScore -= 25;
    }
    if (
        cited.proposedQuantity !== undefined &&
        (!Number.isFinite(cited.proposedQuantity) || cited.proposedQuantity <= 0)
    ) {
        feasibilityIssues.push("La cantidad propuesta no es un número positivo válido.");
        feasibilityScore -= 30;
    }
    if (
        cited.proposedUnitPrice !== undefined &&
        (!Number.isFinite(cited.proposedUnitPrice) || cited.proposedUnitPrice <= 0)
    ) {
        feasibilityIssues.push("El precio unitario propuesto no es válido.");
        feasibilityScore -= 25;
    }

    // Consistencia de herramientas: si hubo fallos no recuperados, baja la confianza
    const failedTools = (input.executedTools || []).filter((t) => !t.isSuccess);
    if (failedTools.length > 0) {
        feasibilityIssues.push(
            `${failedTools.length} herramienta(s) fallaron: ${failedTools
                .map((t) => t.toolName)
                .join(", ")}.`,
        );
        feasibilityScore -= Math.min(40, failedTools.length * 15);
    }

    // --- 2. Políticas / Guardrails ---
    let policyScore = 100;
    const unverified = input.unverifiedWrites ?? 0;
    if (unverified > 0) {
        policyIssues.push(
            `${unverified} escritura(s) no verificada(s) detectada(s); requiere aprobación humana.`,
        );
        policyScore -= Math.min(60, unverified * 30);
    }

    // Auditoría de riesgo de la propuesta de compra (determinista)
    let riskAudit: RiskAuditResult | undefined;
    let riskLevel = 0;
    if (
        cited.productId &&
        cited.supplierId &&
        cited.proposedQuantity !== undefined &&
        cited.proposedUnitPrice !== undefined
    ) {
        try {
            riskAudit = await auditProposalRisk({
                productId: cited.productId,
                supplierId: cited.supplierId,
                proposedQuantity: cited.proposedQuantity,
                proposedUnitPrice: cited.proposedUnitPrice,
                totalCostMxn:
                    cited.totalCostMxn ??
                    cited.proposedQuantity * cited.proposedUnitPrice,
                companyId: cited.companyId || "comp_default",
            });
            riskLevel = riskAudit.riskScore;
            if (riskAudit.redFlags.length > 0) {
                policyIssues.push(...riskAudit.redFlags);
                policyScore -= Math.min(50, riskAudit.redFlags.length * 15);
            }
            if (!riskAudit.supplierVerified) {
                policyIssues.push("Proveedor no homologado / no verificado.");
                policyScore -= 20;
            }
        } catch {
            // Si el auditor falla, no bloqueamos el cierre pero reducimos confianza
            policyIssues.push("No se pudo completar la auditoría de riesgo.");
            policyScore -= 10;
        }
    }

    feasibilityScore = Math.max(0, Math.min(100, feasibilityScore));
    policyScore = Math.max(0, Math.min(100, policyScore));

    // --- 3. Confianza agregada ---
    // Ponderación: factibilidad 50%, políticas 50%, penalizada por riesgo
    const baseConfidence = feasibilityScore * 0.5 + policyScore * 0.5;
    const riskPenalty = riskLevel * 30; // hasta 30 puntos por riesgo máximo
    const confidenceScore = Math.max(
        0,
        Math.min(100, Math.round(baseConfidence - riskPenalty)),
    );

    const feasibilityPassed = feasibilityScore >= 60;
    const policyPassed = policyScore >= 60;

    let verdict: EvaluationVerdict;
    let requiresRegeneration = false;
    let reason: string;

    if (!feasibilityPassed) {
        verdict = "rechazado";
        requiresRegeneration = true;
        reason = `Factibilidad insuficiente (${feasibilityScore}/100): ${feasibilityIssues.join(" ")}`;
    } else if (!policyPassed || confidenceScore < threshold) {
        verdict = "requiere_revision";
        requiresRegeneration = confidenceScore < threshold;
        reason =
            confidenceScore < threshold
                ? `Confianza ${confidenceScore}/100 por debajo del umbral ${threshold}. Se recomienda regenerar el plan.`
                : `Políticas con observaciones (${policyScore}/100): ${policyIssues.join(" ")}`;
    } else {
        verdict = "aprobado";
        reason = `Auto-evaluación aprobada con confianza ${confidenceScore}/100.`;
    }

    return {
        taskId: input.taskId,
        verdict,
        confidence: confidenceScore,
        feasibility: {
            passed: feasibilityPassed,
            score: feasibilityScore,
            issues: feasibilityIssues,
        },
        policy: {
            passed: policyPassed,
            score: policyScore,
            issues: policyIssues,
        },
        confidenceScore,
        riskLevel,
        riskAudit,
        requiresRegeneration,
        reason,
        tokensConsumed: 0,
        costUsd: 0,
    };
}
