import * as fs from "node:fs";
import * as path from "node:path";
import { parseCsvFile, proposeColumnMapping, executeImport } from "@mint/ingest";
import { coordinateOperationalEvent, db, products, inventory } from "@mint/core";
import { eq, and } from "drizzle-orm";

export interface FileChangeResult {
  success: boolean;
  filePath: string;
  fileName: string;
  caseId?: string;
  decisionId?: string;
  importedRows: number;
  failedRows: number;
  summary: string;
}

/**
 * Procesa un archivo nuevo o modificado detectado por el daemon:
 * 1. Parsea el archivo
 * 2. Propone mapeo asistido
 * 3. Importa los registros con origin = 'real'
 * 4. El agente Coordinador abre un caso automáticamente
 */
export async function processFileChange(
  filePath: string,
  companyId: string = "comp_default",
): Promise<FileChangeResult> {
  const fileName = path.basename(filePath);

  if (!fs.existsSync(filePath)) {
    throw new Error(`El archivo vigilado no existe: ${filePath}`);
  }

  const ext = path.extname(filePath).toLowerCase();
  if (ext !== ".csv") {
    return {
      success: false,
      filePath,
      fileName,
      importedRows: 0,
      failedRows: 0,
      summary: `Tipo de archivo ignorado: ${ext}. Solo se procesan archivos .csv automáticamente.`,
    };
  }

  // 1. Ingesta asistida
  const parsed = parseCsvFile(filePath);
  const mappingResult = proposeColumnMapping(parsed.headers);

  const importSummary = await executeImport({
    companyId,
    sourceName: `Daemon Watcher: ${fileName}`,
    sourceType: "csv",
    uriOrPath: filePath,
    mappings: mappingResult.mappings,
    rows: parsed.rows,
  });

  // 2. Buscar si algún producto importado presenta desabasto o requiere atención
  let targetProductId: string | undefined;
  for (const row of parsed.rows) {
    const rawSku = (row[mappingResult.mappings.sku] || "").trim();
    if (!rawSku) continue;
    const prodId = `prod_${rawSku.toLowerCase().replace(/[^a-z0-9_]/g, "_")}`;

    const prodRow = await db
      .select()
      .from(products)
      .where(and(eq(products.id, prodId), eq(products.companyId, companyId)))
      .limit(1);

    if (prodRow.length > 0) {
      targetProductId = prodId;
      break;
    }
  }

  // 3. El Agente Coordinador abre un caso operativo de forma autónoma
  const coordResult = await coordinateOperationalEvent({
    eventType: "DATA_SOURCE_UPDATED",
    companyId,
    productId: targetProductId,
    title: `Ingesta automática de fuente: ${fileName}`,
    description: `El daemon detectó modificaciones en ${fileName}. Se procesaron ${importSummary.importedRows} registros reales con ${importSummary.failedRows} errores aislados.`,
    payload: {
      filePath,
      fileName,
      totalRows: importSummary.totalRows,
      importedRows: importSummary.importedRows,
      failedRows: importSummary.failedRows,
    },
  });

  return {
    success: true,
    filePath,
    fileName,
    caseId: coordResult.caseId,
    decisionId: coordResult.decisionId,
    importedRows: importSummary.importedRows,
    failedRows: importSummary.failedRows,
    summary: coordResult.summary,
  };
}

/**
 * Observador de directorio en tiempo real mediante fs.watch nativo
 */
export function watchDirectory(
  dirPath: string,
  companyId: string,
  onProcessed: (res: FileChangeResult) => void,
): fs.FSWatcher {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  let debounceTimer: NodeJS.Timeout | null = null;
  const processedFiles = new Set<string>();

  const watcher = fs.watch(dirPath, (eventType, filename) => {
    if (!filename || !filename.endsWith(".csv")) return;

    if (debounceTimer) clearTimeout(debounceTimer);

    debounceTimer = setTimeout(async () => {
      const fullPath = path.join(dirPath, filename);
      if (!fs.existsSync(fullPath)) return;

      try {
        const result = await processFileChange(fullPath, companyId);
        onProcessed(result);
      } catch (err: any) {
        console.error(`[DAEMON WATCHER] Error procesando archivo ${filename}: ${err.message}`);
      }
    }, 600);
  });

  return watcher;
}
