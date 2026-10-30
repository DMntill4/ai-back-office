import { db } from "../db/client";
import { businessConfig } from "../db/schema";
import { mintShadowDecisions } from "../db/schema/mintEntities";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "node:crypto";

export interface ShadowModeConfig {
  enabled: boolean;
  daysDuration: number;
  startDate: string;
  daysRemaining: number;
}

export interface ShadowComparisonReport {
  companyId: string;
  shadowModeActive: boolean;
  totalSimulatedDecisions: number;
  totalSimulatedCost: number;
  decisionsByAction: Record<string, number>;
  evaluatedCount: number;
  matchedCount: number;
  divergedCount: number;
  decisions: Array<{
    id: string;
    actionType: string;
    title: string;
    simulatedCost: number;
    predictedOutcome: any;
    actualOutcome: any;
    shadowStatus: string;
    comparisonNotes?: string;
    createdAt: string;
  }>;
}

/**
 * Consulta si el Modo Sombra está activo para la empresa y cuántos días restan.
 */
export async function getShadowModeStatus(companyId: string = "comp_default"): Promise<ShadowModeConfig> {
  const configs = await db
    .select()
    .from(businessConfig)
    .where(eq(businessConfig.companyId, companyId));

  const cfgMap = new Map(configs.map((c) => [c.key, c.value]));
  const enabled = cfgMap.get("shadow_mode_enabled") === "true";
  const daysDuration = parseInt(cfgMap.get("shadow_mode_days") || "14", 10);
  const startDateStr = cfgMap.get("shadow_mode_start_date") || new Date().toISOString();

  const startMs = new Date(startDateStr).getTime();
  const elapsedDays = Math.floor((Date.now() - startMs) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, daysDuration - elapsedDays);

  return {
    enabled: enabled && daysRemaining > 0,
    daysDuration,
    startDate: startDateStr,
    daysRemaining,
  };
}

/**
 * Activa o desactiva el Modo Sombra para un cliente nuevo o en fase de pruebas.
 */
export async function configureShadowMode(
  companyId: string = "comp_default",
  enabled: boolean,
  days: number = 14
): Promise<void> {
  const nowStr = new Date().toISOString();
  const entries = [
    { key: "shadow_mode_enabled", value: String(enabled) },
    { key: "shadow_mode_days", value: String(days) },
    { key: "shadow_mode_start_date", value: nowStr },
  ];

  for (const entry of entries) {
    await db
      .insert(businessConfig)
      .values({
        companyId,
        key: entry.key,
        value: entry.value,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [businessConfig.companyId, businessConfig.key],
        set: { value: entry.value, updatedAt: new Date() },
      });
  }
}

/**
 * Registra una simulación autónoma en la tabla mint_shadow_decisions sin ejecutarla ni notificar.
 */
export async function recordShadowDecision(params: {
  companyId: string;
  actionType: string;
  proposingAgent: string;
  title: string;
  simulatedCost?: number;
  evidencePayload?: Record<string, any>;
  predictedOutcome?: Record<string, any>;
}): Promise<string> {
  const id = `shadow_${randomUUID().slice(0, 8)}`;

  await db.insert(mintShadowDecisions).values({
    id,
    companyId: params.companyId,
    actionType: params.actionType,
    proposingAgent: params.proposingAgent,
    title: params.title,
    simulatedCost: String(params.simulatedCost || 0),
    evidencePayload: params.evidencePayload || {},
    predictedOutcome: params.predictedOutcome || {},
    shadowStatus: "simulated",
    createdAt: new Date(),
  });

  return id;
}

/**
 * Actualiza una decisión sombra con lo que ocurrió en la vida real.
 */
export async function evaluateShadowDecision(params: {
  id: string;
  actualOutcome: Record<string, any>;
  matched: boolean;
  notes?: string;
}): Promise<void> {
  await db
    .update(mintShadowDecisions)
    .set({
      actualOutcome: params.actualOutcome,
      shadowStatus: params.matched ? "matched" : "diverged",
      comparisonNotes: params.notes,
      evaluatedAt: new Date(),
    })
    .where(eq(mintShadowDecisions.id, params.id));
}

/**
 * Genera el informe comparativo entre lo que MINT simuló y la realidad de la operación.
 */
export async function getShadowComparisonReport(companyId: string = "comp_default"): Promise<ShadowComparisonReport> {
  const [status, rows] = await Promise.all([
    getShadowModeStatus(companyId),
    db
      .select()
      .from(mintShadowDecisions)
      .where(eq(mintShadowDecisions.companyId, companyId))
      .orderBy(desc(mintShadowDecisions.createdAt))
      .limit(100),
  ]);

  let totalSimulatedCost = 0;
  const decisionsByAction: Record<string, number> = {};
  let evaluatedCount = 0;
  let matchedCount = 0;
  let divergedCount = 0;

  for (const r of rows) {
    const cost = Number(r.simulatedCost || 0);
    totalSimulatedCost += cost;
    decisionsByAction[r.actionType] = (decisionsByAction[r.actionType] || 0) + 1;

    if (r.shadowStatus === "matched") {
      evaluatedCount++;
      matchedCount++;
    } else if (r.shadowStatus === "diverged") {
      evaluatedCount++;
      divergedCount++;
    }
  }

  return {
    companyId,
    shadowModeActive: status.enabled,
    totalSimulatedDecisions: rows.length,
    totalSimulatedCost,
    decisionsByAction,
    evaluatedCount,
    matchedCount,
    divergedCount,
    decisions: rows.map((r) => ({
      id: r.id,
      actionType: r.actionType,
      title: r.title,
      simulatedCost: Number(r.simulatedCost || 0),
      predictedOutcome: r.predictedOutcome,
      actualOutcome: r.actualOutcome,
      shadowStatus: r.shadowStatus,
      comparisonNotes: r.comparisonNotes || undefined,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}
