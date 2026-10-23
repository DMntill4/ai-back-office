import { db } from "../db/client";
import { dataSources } from "../db/schema/ingest";
import { eq } from "drizzle-orm";

export interface FreshnessCheckResult {
  isFresh: boolean;
  totalSources: number;
  healthySources: number;
  staleSources: number;
  driftedSources: number;
  errorSources: number;
  oldestSyncAt: Date | null;
  newestSyncAt: Date | null;
  hoursSinceLastSync: number;
  status: "HEALTHY" | "STALE" | "DRIFTED" | "ERROR" | "NO_SOURCES";
  reason: string;
}

/**
 * Consulta y audita el estado de frescura de los datos externos de una empresa.
 * Si las fuentes superan maxStalenessHours (default 24h) o están en DRIFTED/ERROR,
 * informa que los datos NO son confiables para decisiones autónomas.
 */
export async function checkDataFreshness(
  companyId: string,
  maxStalenessHours = 24
): Promise<FreshnessCheckResult> {
  const sources = await db
    .select()
    .from(dataSources)
    .where(eq(dataSources.companyId, companyId));

  if (sources.length === 0) {
    return {
      isFresh: false,
      totalSources: 0,
      healthySources: 0,
      staleSources: 0,
      driftedSources: 0,
      errorSources: 0,
      oldestSyncAt: null,
      newestSyncAt: null,
      hoursSinceLastSync: Infinity,
      status: "NO_SOURCES",
      reason: "No hay fuentes de datos externas registradas para esta empresa.",
    };
  }

  const now = Date.now();
  let healthySources = 0;
  let staleSources = 0;
  let driftedSources = 0;
  let errorSources = 0;
  let newestSync: Date | null = null;
  let oldestSync: Date | null = null;

  for (const src of sources) {
    const config = (src.config as Record<string, any>) || {};
    const srcStatus = config.status || (src.lastSyncedAt ? "HEALTHY" : "STALE");

    if (srcStatus === "DRIFTED") {
      driftedSources++;
    } else if (srcStatus === "ERROR") {
      errorSources++;
    }

    if (!src.lastSyncedAt) {
      staleSources++;
    } else {
      const syncDate = new Date(src.lastSyncedAt);
      if (!newestSync || syncDate > newestSync) newestSync = syncDate;
      if (!oldestSync || syncDate < oldestSync) oldestSync = syncDate;

      const diffHours = (now - syncDate.getTime()) / (1000 * 60 * 60);
      if (diffHours > maxStalenessHours) {
        staleSources++;
      } else if (srcStatus === "HEALTHY") {
        healthySources++;
      }
    }
  }

  const hoursSinceLastSync = newestSync
    ? Math.round(((now - newestSync.getTime()) / (1000 * 60 * 60)) * 10) / 10
    : Infinity;

  if (driftedSources > 0) {
    return {
      isFresh: false,
      totalSources: sources.length,
      healthySources,
      staleSources,
      driftedSources,
      errorSources,
      oldestSyncAt: oldestSync,
      newestSyncAt: newestSync,
      hoursSinceLastSync,
      status: "DRIFTED",
      reason: `Hay ${driftedSources} fuente(s) con cambio de esquema (DRIFTED) detectado. Sincronización pausada.`,
    };
  }

  if (errorSources > 0) {
    return {
      isFresh: false,
      totalSources: sources.length,
      healthySources,
      staleSources,
      driftedSources,
      errorSources,
      oldestSyncAt: oldestSync,
      newestSyncAt: newestSync,
      hoursSinceLastSync,
      status: "ERROR",
      reason: `Hay ${errorSources} fuente(s) con errores de sincronización.`,
    };
  }

  if (staleSources > 0 || hoursSinceLastSync > maxStalenessHours) {
    return {
      isFresh: false,
      totalSources: sources.length,
      healthySources,
      staleSources,
      driftedSources,
      errorSources,
      oldestSyncAt: oldestSync,
      newestSyncAt: newestSync,
      hoursSinceLastSync,
      status: "STALE",
      reason: `Los datos tienen ${hoursSinceLastSync} horas de antigüedad (límite: ${maxStalenessHours}h). Requieren re-sincronización.`,
    };
  }

  return {
    isFresh: true,
    totalSources: sources.length,
    healthySources,
    staleSources: 0,
    driftedSources: 0,
    errorSources: 0,
    oldestSyncAt: oldestSync,
    newestSyncAt: newestSync,
    hoursSinceLastSync,
    status: "HEALTHY",
    reason: `Todas las fuentes (${healthySources}) están al día (< ${maxStalenessHours}h).`,
  };
}
