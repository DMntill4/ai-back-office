import * as path from "node:path";
import * as fs from "node:fs";
import {
  parseCsvFile,
  parseExcelFile,
  listExcelSheets,
  queryReadOnlySqlite,
  listSqliteTables,
  queryReadOnlyPostgres,
  listPostgresTables,
  proposeColumnMapping,
  syncDataSource,
  discoverLocalSources,
} from "@mint/ingest";
import { getSession } from "../keychain";
import { db, dataSources, checkDataFreshness } from "@mint/core";
import { eq, desc } from "drizzle-orm";
import { theme } from "../ui/theme";

/**
 * mint source discover [path]
 * Descubre archivos de datos disponibles en el directorio indicado o de trabajo actual
 */
export async function sourceDiscoverCommand(
  targetPath?: string,
  options: { depth?: string; json?: boolean } = {}
) {
  try {
    const basePath = targetPath ? path.resolve(process.cwd(), targetPath) : process.cwd();
    const maxDepth = options.depth ? parseInt(options.depth, 10) : 3;

    const sources = await discoverLocalSources({ basePath, maxDepth });

    if (options.json) {
      console.log(JSON.stringify(sources, null, 2));
      return;
    }

    console.log(`\n${theme.mintBold("[BUSQUEDA] DESCUBRIMIENTO DE FUENTES LOCALES")} [${basePath}]`);
    console.log(`─`.repeat(85));
    console.log(
      `NOMBRE`.padEnd(28) +
        `TIPO`.padEnd(10) +
        `TAMAÑO`.padEnd(12) +
        `DETALLES`.padEnd(35)
    );
    console.log(`─`.repeat(85));

    if (sources.length === 0) {
      console.log(theme.dim("No se encontraron archivos de datos (.csv, .xlsx, .sqlite, .db) en este directorio.\n"));
      return;
    }

    for (const s of sources) {
      const sizeStr = `${(s.sizeBytes / 1024).toFixed(1)} KB`;
      let details = "";
      if (s.sourceType === "csv") {
        details = `Encabezados: ${(s.details.headers || []).slice(0, 3).join(", ")}...`;
      } else if (s.sourceType === "excel") {
        details = `Hojas: ${(s.details.sheets || []).join(", ")}`;
      } else if (s.sourceType === "sqlite") {
        details = `Tablas: ${(s.details.tables || []).join(", ")}`;
      }

      console.log(
        s.name.slice(0, 26).padEnd(28) +
          s.sourceType.toUpperCase().padEnd(10) +
          sizeStr.padEnd(12) +
          theme.dim(details.slice(0, 35))
      );
    }
    console.log(`─`.repeat(85));
    console.log(theme.dim(`[SUGERENCIA] Para inspeccionar una fuente: mint source inspect <ruta>`));
    console.log(theme.dim(`[SUGERENCIA] Para agregar e importar:     mint source add <ruta>\n`));
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ error: err.message }));
    } else {
      console.error(theme.error(`\n[ERROR] Error al descubrir fuentes: ${err.message}\n`));
    }
    process.exit(1);
  }
}

/**
 * mint source inspect <ruta>
 * Inspecciona estructura, columnas y propone mapeo sin alterar la base de datos
 */
export async function sourceInspectCommand(
  targetPath: string,
  options: { sheet?: string; table?: string; json?: boolean } = {}
) {
  try {
    let headers: string[] = [];
    let sampleRows: Array<Record<string, any>> = [];
    let sourceType: string = "desconocido";

    const isPostgresUri = targetPath.startsWith("postgres://") || targetPath.startsWith("postgresql://");

    if (isPostgresUri) {
      sourceType = "postgres_readonly";
      if (!options.table) {
        const tables = await listPostgresTables(targetPath);
        if (options.json) {
          console.log(JSON.stringify({ sourceType, tables }));
          return;
        }
        console.log(`\n[POSTGRES] TABLAS DISPONIBLES EN POSTGRESQL EXTERNA:`);
        tables.forEach((t) => console.log(`   • ${t}`));
        console.log(`\nUsa: mint source inspect "${targetPath}" --table <nombre_tabla>\n`);
        return;
      }
      const res = await queryReadOnlyPostgres({ connectionString: targetPath, tableName: options.table, limit: 5 });
      headers = res.headers;
      sampleRows = res.rows;
    } else {
      const fullPath = path.resolve(process.cwd(), targetPath);
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Archivo no encontrado: "${fullPath}"`);
      }
      const ext = path.extname(fullPath).toLowerCase();

      if (ext === ".csv" || ext === ".tsv") {
        sourceType = "csv";
        const parsed = parseCsvFile(fullPath);
        headers = parsed.headers;
        sampleRows = parsed.rows.slice(0, 5);
      } else if (ext === ".xlsx" || ext === ".xls") {
        sourceType = "excel";
        const sheets = listExcelSheets(fullPath);
        const selectedSheet = options.sheet || sheets[0];
        const parsed = parseExcelFile(fullPath, selectedSheet);
        headers = parsed.headers;
        sampleRows = parsed.rows.slice(0, 5);
      } else if (ext === ".sqlite" || ext === ".db" || ext === ".sqlite3") {
        sourceType = "sqlite";
        const tables = listSqliteTables(fullPath);
        if (!options.table) {
          if (options.json) {
            console.log(JSON.stringify({ sourceType, tables }));
            return;
          }
          console.log(`\n[SQLITE] TABLAS DISPONIBLES EN ARCHIVO SQLITE:`);
          tables.forEach((t) => console.log(`   • ${t}`));
          console.log(`\nUsa: mint source inspect "${fullPath}" --table <nombre_tabla>\n`);
          return;
        }
        const res = queryReadOnlySqlite({ filePath: fullPath, tableName: options.table, limit: 5 });
        headers = res.headers;
        sampleRows = res.rows;
      }
    }

    const mappingProposal = proposeColumnMapping(headers);

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            source: targetPath,
            sourceType,
            headers,
            sampleRows,
            mappingProposal,
          },
          null,
          2
        )
      );
      return;
    }

    console.log(`\n${theme.mintBold("[INSPECCION] INSPECCIÓN DE FUENTE DE DATOS")} [${sourceType.toUpperCase()}]`);
    console.log(`   Ruta/URI: ${theme.bold(targetPath)}`);
    console.log(`   Encabezados detectados (${headers.length}): ${theme.dim(headers.join(", "))}`);

    console.log(`\n[AGENTE] PROPUESTA DE MAPEO AUTOMÁTICO (Confianza: ${(mappingProposal.confidence * 100).toFixed(0)}%):`);
    for (const [target, source] of Object.entries(mappingProposal.mappings)) {
      console.log(`   • ${theme.cyan(target.padEnd(12))} <- "${source}"`);
    }

    if (mappingProposal.missingRequired.length > 0) {
      console.log(theme.error(`\n[AVISO] Faltan campos requeridos: ${mappingProposal.missingRequired.join(", ")}`));
    } else {
      console.log(theme.mint(`\n[OK] Mapeo completo y válido para importar.`));
    }
    console.log("");
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ error: err.message }));
    } else {
      console.error(theme.error(`\n[ERROR] Error al inspeccionar fuente: ${err.message}\n`));
    }
    process.exit(1);
  }
}

/**
 * mint source add <ruta>
 * Registra y sincroniza una fuente de datos (CSV, Excel, SQLite, PostgreSQL)
 */
export async function sourceAddCommand(
  targetPath: string,
  options: { name?: string; sheet?: string; table?: string; force?: boolean; json?: boolean } = {}
) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  try {
    const isPostgresUri = targetPath.startsWith("postgres://") || targetPath.startsWith("postgresql://");
    let fullPath = targetPath;
    let sourceName = options.name || "";
    let sourceType: "csv" | "excel" | "sqlite" | "postgres_readonly" = "csv";
    let headers: string[] = [];
    let rows: Array<Record<string, any>> = [];

    if (isPostgresUri) {
      sourceType = "postgres_readonly";
      if (!options.table) {
        throw new Error("Para agregar una fuente PostgreSQL se debe especificar la tabla con --table <nombre>.");
      }
      sourceName = sourceName || `pg_${options.table}`;
      const res = await queryReadOnlyPostgres({ connectionString: targetPath, tableName: options.table, limit: 1000 });
      headers = res.headers;
      rows = res.rows;
    } else {
      fullPath = path.resolve(process.cwd(), targetPath);
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Archivo no encontrado: "${fullPath}"`);
      }
      const ext = path.extname(fullPath).toLowerCase();
      sourceName = sourceName || path.basename(fullPath);

      if (ext === ".csv" || ext === ".tsv") {
        sourceType = "csv";
        const parsed = parseCsvFile(fullPath);
        headers = parsed.headers;
        rows = parsed.rows;
      } else if (ext === ".xlsx" || ext === ".xls") {
        sourceType = "excel";
        const sheet = options.sheet || listExcelSheets(fullPath)[0];
        const parsed = parseExcelFile(fullPath, sheet);
        headers = parsed.headers;
        rows = parsed.rows;
      } else if (ext === ".sqlite" || ext === ".db" || ext === ".sqlite3") {
        sourceType = "sqlite";
        if (!options.table) {
          const tables = listSqliteTables(fullPath);
          if (tables.length === 0) throw new Error("La base de datos SQLite no contiene tablas.");
          options.table = tables[0];
        }
        sourceName = sourceName || `sqlite_${options.table}`;
        const res = queryReadOnlySqlite({ filePath: fullPath, tableName: options.table, limit: 1000 });
        headers = res.headers;
        rows = res.rows;
      } else {
        throw new Error(`Extensión no soportada: "${ext}". Use .csv, .xlsx, .sqlite, o URI postgres://`);
      }
    }

    if (!options.json) {
      console.log(`\n${theme.mintBold("[SYNC] SINCRONIZANDO FUENTE DE DATOS:")} ${sourceName}`);
      console.log(`   Ruta/URI: ${fullPath}`);
      console.log(`   Tipo:     ${sourceType.toUpperCase()}`);
    }

    const summary = await syncDataSource({
      companyId,
      sourceName,
      sourceType,
      uriOrPath: fullPath,
      currentHeaders: headers,
      rows,
      forceAcceptDrift: options.force,
    });

    if (options.json) {
      console.log(JSON.stringify(summary, null, 2));
      return;
    }

    if (summary.status === "DRIFTED") {
      console.log(theme.warning(`\n[AVISO] CAMBIO DE ESQUEMA DETECTADO (SCHEMA DRIFT):`));
      console.log(`   ${summary.drift?.reason}`);
      console.log(`   La fuente ha sido congelada (DRIFTED) para evitar datos inconsistentes.`);
      console.log(`   Use '--force' para aceptar el nuevo esquema propuesto si es deliberado.\n`);
      return;
    }

    console.log(`\n${theme.mint("[OK] SINCRONIZACIÓN EXITOSA:")}`);
    console.log(`   ID Fuente:        ${summary.dataSourceId}`);
    console.log(`   ID Trabajo:       ${summary.jobId}`);
    console.log(`   Filas Leídas:     ${summary.totalRows}`);
    console.log(`   Filas Importadas: ${summary.importedRows} (origin = 'real')`);
    console.log(`   Filas Omitidas:   ${summary.failedRows}`);
    if (summary.deletedRows > 0) {
      console.log(`   Filas Eliminadas: ${summary.deletedRows} (actualizadas a stock 0 en inventario)`);
    }

    if (summary.qualityWarning) {
      console.log(theme.warning(`\n[AVISO] ${summary.qualityWarning}`));
    }

    if (summary.errors.length > 0) {
      console.log(theme.dim(`\nDetalle de errores aislados (${summary.errors.length}):`));
      for (const err of summary.errors.slice(0, 3)) {
        console.log(theme.dim(`   Fila #${err.row}: ${err.error}`));
      }
    }
    console.log("");
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ success: false, error: err.message }));
    } else {
      console.error(theme.error(`\n[ERROR] Error al agregar fuente de datos: ${err.message}\n`));
    }
    process.exit(1);
  }
}

/**
 * mint source status
 * Reporte de frescura de datos y salud de las fuentes conectadas
 */
export async function sourceStatusCommand(options: { json?: boolean } = {}) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  try {
    const freshness = await checkDataFreshness(companyId);

    if (options.json) {
      console.log(JSON.stringify(freshness, null, 2));
      return;
    }

    console.log(`\n${theme.mintBold("[FRESCURA] AUDITORÍA DE FRESCURA DE DATOS")} [Empresa: ${companyId}]`);
    console.log(`─`.repeat(70));
    console.log(`   Estado General:         ${freshness.isFresh ? theme.mint("VIGENTE (AL DÍA)") : theme.error(freshness.status)}`);
    console.log(`   Fuentes Registradas:    ${freshness.totalSources}`);
    console.log(`   Fuentes Sanas:          ${freshness.healthySources}`);
    console.log(`   Fuentes Desactualizadas:${freshness.staleSources}`);
    console.log(`   Fuentes con Drift:      ${freshness.driftedSources}`);
    console.log(`   Horas desde última sync:${freshness.hoursSinceLastSync === Infinity ? "Nunca" : `${freshness.hoursSinceLastSync} horas`}`);
    console.log(`   Diagnóstico:            ${theme.dim(freshness.reason)}`);
    console.log(`─`.repeat(70));

    if (!freshness.isFresh) {
      console.log(theme.warning(`[AVISO] Guardrail activo: El agente se negará a auto-ejecutar órdenes sobre datos desactualizados.`));
    } else {
      console.log(theme.mint(`[OK] Los datos están al día. Decisiones autónomas habilitadas.`));
    }
    console.log("");
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ error: err.message }));
    } else {
      console.error(theme.error(`\n[ERROR] Error al consultar estado de fuentes: ${err.message}\n`));
    }
    process.exit(1);
  }
}

/**
 * mint source list
 * Lista fuentes de datos conectadas
 */
export async function sourceListCommand(options: { json?: boolean } = {}) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  try {
    const list = await db
      .select()
      .from(dataSources)
      .where(eq(dataSources.companyId, companyId))
      .orderBy(desc(dataSources.createdAt));

    if (options.json) {
      console.log(JSON.stringify(list, null, 2));
      return;
    }

    console.log(`\n${theme.mintBold("[SQLITE] FUENTES DE DATOS CONECTADAS")} [Empresa: ${companyId}]`);
    console.log(`─`.repeat(85));
    console.log(
      `ID`.padEnd(16) +
        `NOMBRE`.padEnd(24) +
        `TIPO`.padEnd(14) +
        `SALUD`.padEnd(12) +
        `ÚLTIMA SYNC`.padEnd(19)
    );
    console.log(`─`.repeat(85));

    if (list.length === 0) {
      console.log(theme.dim("No hay fuentes de datos registradas. Usa 'mint source discover' o 'mint source add <archivo>'.\n"));
      return;
    }

    for (const s of list) {
      const config = (s.config as Record<string, any>) || {};
      const status = config.status || (s.lastSyncedAt ? "HEALTHY" : "PENDING");
      const lastSyncStr = s.lastSyncedAt ? new Date(s.lastSyncedAt).toLocaleString("es-MX") : "Nunca";

      let statusFormatted = status;
      if (status === "HEALTHY") statusFormatted = theme.mint(status);
      else if (status === "DRIFTED") statusFormatted = theme.warning(status);
      else if (status === "ERROR") statusFormatted = theme.error(status);

      console.log(
        s.id.padEnd(16) +
          s.name.slice(0, 22).padEnd(24) +
          s.sourceType.padEnd(14) +
          statusFormatted.padEnd(21) +
          theme.dim(lastSyncStr)
      );
    }
    console.log(`─`.repeat(85) + "\n");
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ error: err.message }));
    } else {
      console.error(theme.error(`[ERROR] Error al listar fuentes: ${err.message}`));
    }
    process.exit(1);
  }
}
