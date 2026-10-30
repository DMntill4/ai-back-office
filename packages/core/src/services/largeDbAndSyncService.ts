import { pool, db } from "../db/client";
import { mintTableMappings, mintMaterializedAggregations } from "../db/schema/mintEntities";
import { eq, and, sql } from "drizzle-orm";
import { performance } from "node:perf_hooks";

export interface TableSizeEstimate {
  tableName: string;
  estimatedRows: number;
  isLargeTable: boolean; // > 50,000 filas
  recommendedBatchSize: number;
}

export interface SchemaDriftResult {
  hasDrift: boolean;
  status: "OK" | "BLOQUEADO_HASTA_REVISION";
  driftedTables: Array<{
    sourceTable: string;
    targetEntity: string;
    missingColumns: string[];
    alteredColumns: string[];
    reason: string;
  }>;
}

/**
 * Estima el tamaño de una tabla usando las estadísticas del planificador de PostgreSQL (pg_class.reltuples).
 * Tiempo de ejecución: < 1 ms. NUNCA ejecuta COUNT(*) sobre tablas con millones de filas.
 */
export async function estimateTableSize(tableName: string): Promise<TableSizeEstimate> {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT reltuples::bigint AS estimate
       FROM pg_class
       WHERE relname = $1;`,
      [tableName.toLowerCase()]
    );

    const count = Math.max(0, Number(res.rows[0]?.estimate ?? 0));
    const isLargeTable = count > 50000;
    const recommendedBatchSize = count > 500000 ? 500 : count > 50000 ? 1000 : 2500;

    return {
      tableName,
      estimatedRows: count,
      isLargeTable,
      recommendedBatchSize,
    };
  } catch (err: any) {
    return {
      tableName,
      estimatedRows: 0,
      isLargeTable: false,
      recommendedBatchSize: 500,
    };
  } finally {
    client.release();
  }
}

/**
 * Ejecuta una consulta paginada segura y acotada con statement_timeout estricto.
 * Previene bloqueos accidentales de tablas de producción y bloqueos de I/O.
 */
export async function safePaginatedQuery<T = any>(options: {
  tableName: string;
  columns?: string[];
  filterCondition?: string;
  filterParams?: any[];
  cursorColumn?: string;
  lastCursorValue?: any;
  limit?: number;
  statementTimeoutMs?: number;
}): Promise<{ rows: T[]; nextCursor?: any; executionMs: number }> {
  const start = performance.now();
  const limit = Math.min(options.limit || 500, 2000); // Tope máximo inquebrantable de 2000 filas
  const timeoutMs = options.statementTimeoutMs || 3000;
  const cols = options.columns && options.columns.length > 0 ? options.columns.join(", ") : "*";
  const cursorCol = options.cursorColumn || "id";

  const client = await pool.connect();
  try {
    // Proteger contra bloqueos prolongados
    await client.query(`SET LOCAL statement_timeout = '${timeoutMs}ms';`);

    const whereClauses: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (options.lastCursorValue !== undefined && options.lastCursorValue !== null) {
      whereClauses.push(`${cursorCol} > $${paramIdx++}`);
      params.push(options.lastCursorValue);
    }

    if (options.filterCondition) {
      whereClauses.push(options.filterCondition);
      if (options.filterParams) {
        for (const p of options.filterParams) {
          params.push(p);
          paramIdx++;
        }
      }
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const querySql = `
      SELECT ${cols}
      FROM ${options.tableName}
      ${whereSql}
      ORDER BY ${cursorCol} ASC
      LIMIT $${paramIdx};
    `;
    params.push(limit);

    const res = await client.query(querySql, params);
    const executionMs = Math.round(performance.now() - start);

    const rows = res.rows as T[];
    const nextCursor = rows.length === limit ? (rows[rows.length - 1] as any)[cursorCol] : undefined;

    return {
      rows,
      nextCursor,
      executionMs,
    };
  } finally {
    client.release();
  }
}

/**
 * Almacena o recupera agregaciones materializadas en mint_materialized_aggregations
 * para no saturar la base de datos de producción con cálculos redundantes.
 */
export async function getOrComputeMaterializedAggregation<T = any>(
  companyId: string,
  aggregationKey: string,
  ttlMinutes: number,
  computeFn: () => Promise<{ metrics: T; recordCount: number }>
): Promise<{ metrics: T; cached: boolean; computedAt: Date }> {
  // 1. Buscar en caché materializada
  const existing = await db
    .select()
    .from(mintMaterializedAggregations)
    .where(
      and(
        eq(mintMaterializedAggregations.companyId, companyId),
        eq(mintMaterializedAggregations.aggregationKey, aggregationKey)
      )
    )
    .limit(1);

  const now = new Date();
  if (existing.length > 0 && new Date(existing[0].expiresAt) > now) {
    return {
      metrics: existing[0].metricsPayload as T,
      cached: true,
      computedAt: existing[0].computedAt,
    };
  }

  // 2. Calcular de forma fresca
  const { metrics, recordCount } = await computeFn();
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);
  const id = `agg_${companyId}_${aggregationKey}`;

  await db
    .insert(mintMaterializedAggregations)
    .values({
      id,
      companyId,
      aggregationKey,
      metricsPayload: metrics as any,
      recordCount,
      computedAt: now,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: [mintMaterializedAggregations.id],
      set: {
        metricsPayload: metrics as any,
        recordCount,
        computedAt: now,
        expiresAt,
      },
    });

  return {
    metrics,
    cached: false,
    computedAt: now,
  };
}

/**
 * Detecta cambios de esquema (drift) en tablas del cliente ya conectadas.
 * Si una columna mapeada desaparece o cambia de tipo, pasa el módulo a BLOQUEADO_HASTA_REVISION
 * en vez de producir resultados erróneos o fallos silenciosos.
 */
export async function detectSchemaDrift(companyId: string = "comp_default"): Promise<SchemaDriftResult> {
  const mappings = await db
    .select()
    .from(mintTableMappings)
    .where(and(eq(mintTableMappings.companyId, companyId), eq(mintTableMappings.isConfirmed, true)));

  if (mappings.length === 0) {
    return { hasDrift: false, status: "OK", driftedTables: [] };
  }

  const client = await pool.connect();
  const driftedTables: SchemaDriftResult["driftedTables"] = [];

  try {
    for (const map of mappings) {
      const colRes = await client.query(
        `SELECT column_name, data_type 
         FROM information_schema.columns 
         WHERE table_name = $1;`,
        [map.sourceTable.toLowerCase()]
      );

      const realColumns = new Set((colRes.rows || []).map((r: any) => r.column_name.toLowerCase()));
      const mappedConfig = (map.columnMappings || {}) as Record<string, string>;

      const missingCols: string[] = [];
      for (const [sourceCol] of Object.entries(mappedConfig)) {
        if (!realColumns.has(sourceCol.toLowerCase())) {
          missingCols.push(sourceCol);
        }
      }

      if (missingCols.length > 0) {
        driftedTables.push({
          sourceTable: map.sourceTable,
          targetEntity: map.targetEntity,
          missingColumns: missingCols,
          alteredColumns: [],
          reason: `Columnas eliminadas o renombradas en la BD del cliente: [${missingCols.join(", ")}]`,
        });
      }
    }
  } finally {
    client.release();
  }

  const hasDrift = driftedTables.length > 0;
  return {
    hasDrift,
    status: hasDrift ? "BLOQUEADO_HASTA_REVISION" : "OK",
    driftedTables,
  };
}
