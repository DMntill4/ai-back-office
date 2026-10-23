import * as path from "node:path";
import { parseCsvFile, proposeColumnMapping, executeImport } from "@mint/ingest";
import { getSession } from "../keychain";
import { db, dataSources, importJobs } from "@mint/core";
import { eq, desc } from "drizzle-orm";

export async function sourceAddCommand(
  targetPath: string,
  options: { name?: string; json?: boolean } = {},
) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  try {
    const fullPath = path.resolve(process.cwd(), targetPath);
    const sourceName = options.name || path.basename(fullPath);

    if (!options.json) {
      console.log(`\n📂 PROCESANDO FUENTE DE DATOS: ${sourceName}`);
      console.log(`   Ruta: ${fullPath}`);
    }

    // 1. Parsear CSV
    const parsed = parseCsvFile(fullPath);

    if (parsed.headers.length === 0) {
      throw new Error("El archivo CSV no contiene encabezados válidos.");
    }

    // 2. Mapeo Asistido de Columnas
    const mappingResult = proposeColumnMapping(parsed.headers);

    if (mappingResult.missingRequired.length > 0) {
      throw new Error(
        `No se pudieron mapear las columnas obligatorias: ${mappingResult.missingRequired.join(", ")}. Encabezados detectados: ${parsed.headers.join(", ")}`,
      );
    }

    if (!options.json) {
      console.log(`\n🤖 MAPEO ASISTIDO DE COLUMNAS (Confianza: ${(mappingResult.confidence * 100).toFixed(0)}%):`);
      for (const [target, source] of Object.entries(mappingResult.mappings)) {
        console.log(`   • ${target.padEnd(12)} <- "${source}"`);
      }
      console.log(`\n⏳ Importando ${parsed.totalRows} filas a PostgreSQL con origin='real'...`);
    }

    // 3. Ejecutar Importación Transaccional con Tolerancia a Errores
    const summary = await executeImport({
      companyId,
      sourceName,
      sourceType: "csv",
      uriOrPath: fullPath,
      mappings: mappingResult.mappings,
      rows: parsed.rows,
    });

    if (options.json) {
      console.log(JSON.stringify(summary, null, 2));
      return;
    }

    console.log(`\n✅ IMPORTACIÓN COMPLETADA:`);
    console.log(`   ID Fuente:    ${summary.dataSourceId}`);
    console.log(`   ID Trabajo:   ${summary.jobId}`);
    console.log(`   Filas Totales:    ${summary.totalRows}`);
    console.log(`   Filas Importadas: ${summary.importedRows} (origin = 'real')`);
    console.log(`   Filas Omitidas:   ${summary.failedRows}`);

    if (summary.errors.length > 0) {
      console.log(`\n⚠️ FILAS CON ERRORES REPORTADAS (Sin detener el resto del archivo):`);
      for (const err of summary.errors.slice(0, 5)) {
        console.log(`   Fila #${err.row}: ${err.error}`);
      }
      if (summary.errors.length > 5) {
        console.log(`   ...y ${summary.errors.length - 5} error(es) más.`);
      }
    }
    console.log("");
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ success: false, error: err.message }));
    } else {
      console.error(`\n❌ Error al agregar fuente de datos: ${err.message}\n`);
    }
    process.exit(1);
  }
}

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

    console.log(`\n🗄️ FUENTES DE DATOS CONECTADAS [Empresa: ${companyId}]`);
    console.log(`─`.repeat(75));
    console.log(
      `ID`.padEnd(16) +
        `NOMBRE`.padEnd(26) +
        `TIPO`.padEnd(12) +
        `ESTADO`.padEnd(10) +
        `FECHA`.padEnd(10),
    );
    console.log(`─`.repeat(75));

    if (list.length === 0) {
      console.log(`No hay fuentes de datos registradas. Usa 'mint source add <archivo.csv>'.\n`);
      return;
    }

    for (const s of list) {
      const date = s.createdAt ? new Date(s.createdAt).toLocaleDateString("es-MX") : "N/A";
      console.log(
        s.id.padEnd(16) +
          s.name.slice(0, 24).padEnd(26) +
          s.sourceType.padEnd(12) +
          (s.isActive ? "ACTIVA" : "INACTIVA").padEnd(10) +
          date.padEnd(10),
      );
    }
    console.log(`─`.repeat(75) + "\n");
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ error: err.message }));
    } else {
      console.error(`❌ Error al listar fuentes: ${err.message}`);
    }
    process.exit(1);
  }
}
