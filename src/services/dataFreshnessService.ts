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
  hoursSinceOriginModified?: number;
  status: "HEALTHY" | "STALE" | "DRIFTED" | "ERROR" | "NO_SOURCES";
  reason: string;
}

/**
 * Consulta y audita el estado de frescura de los datos externos de una empresa.
 * Distingue semánticamente:
 * 1. Cuándo se sincronizó por última vez en Mint (hoursSinceLastSync).
 * 2. Cuándo se modificó realmente el archivo o dato en el origen (hoursSinceOriginModified).
 * 3. Límites configurables por fuente (ej: 24h para diario, 168h para semanal, 2h para tiempo real).
 */
export async function checkDataFreshness(
  companyId: string,
  defaultMaxStalenessHours = 24
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
  let maxOriginStalenessHours = 0;
  const stalenessReasons: string[] = [];

  for (const src of sources) {
    const config = (src.config as Record<string, any>) || {};
    const srcStatus = config.status || (src.lastSyncedAt ? "HEALTHY" : "STALE");
    const sourceThresholdHours = config.maxStalenessHours || defaultMaxStalenessHours;

    if (srcStatus === "DRIFTED") {
      driftedSources++;
      continue;
    } else if (srcStatus === "PAUSED_MASS_DELETION") {
      driftedSources++;
      stalenessReasons.push(`Fuente '${src.name}' congelada por protección contra borrado masivo anómalo.`);
      continue;
    } else if (srcStatus === "ERROR") {
      errorSources++;
      continue;
    }

    if (!src.lastSyncedAt) {
      staleSources++;
      stalenessReasons.push(`Fuente '${src.name}' nunca ha sido sincronizada.`);
    } else {
      const syncDate = new Date(src.lastSyncedAt);
      if (!newestSync || syncDate > newestSync) newestSync = syncDate;
      if (!oldestSync || syncDate < oldestSync) oldestSync = syncDate;

      const diffSyncHours = (now - syncDate.getTime()) / (1000 * 60 * 60);

      // Verificación 1: Desfase de sincronización
      if (diffSyncHours > sourceThresholdHours) {
        staleSources++;
        stalenessReasons.push(
          `Fuente '${src.name}' tiene ${Math.round(diffSyncHours)}h sin sincronizar (umbral: ${sourceThresholdHours}h).`
        );
        continue;
      }

      // Verificación 2: Desfase real del archivo o recurso de origen (originMtime)
      if (config.originMtime) {
        const originDate = new Date(config.originMtime);
        const diffOriginHours = (now - originDate.getTime()) / (1000 * 60 * 60);
        if (diffOriginHours > maxOriginStalenessHours) maxOriginStalenessHours = diffOriginHours;

        if (diffOriginHours > sourceThresholdHours) {
          staleSources++;
          stalenessReasons.push(
            `El archivo origen de '${src.name}' tiene ${Math.round(diffOriginHours)}h de antigüedad en disco (umbral: ${sourceThresholdHours}h). Aunque se sincronice con frecuencia, el dato de origen es viejo.`
          );
          continue;
        }
      }

      if (srcStatus === "HEALTHY") {
        healthySources++;
      }
    }
  }

  const hoursSinceLastSync = newestSync
    ? Math.round(((now - newestSync.getTime()) / (1000 * 60 * 60)) * 10) / 10
    : Infinity;

  const hoursSinceOriginModified = maxOriginStalenessHours > 0
    ? Math.round(maxOriginStalenessHours * 10) / 10
    : undefined;

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
      hoursSinceOriginModified,
      status: "DRIFTED",
      reason: `Hay ${driftedSources} fuente(s) con cambio de esquema (DRIFTED) o pausa preventiva por borrado masivo.`,
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
      hoursSinceOriginModified,
      status: "ERROR",
      reason: `Hay ${errorSources} fuente(s) con errores no resueltos de sincronización.`,
    };
  }

  if (staleSources > 0) {
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
      hoursSinceOriginModified,
      status: "STALE",
      reason: `Datos desactualizados: ${stalenessReasons.join("; ")}`,
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
    hoursSinceOriginModified,
    status: "HEALTHY",
    reason: `Todas las fuentes (${healthySources}) están al día con sus umbrales específicos de frescura y modificación en origen.`,
  };
}
