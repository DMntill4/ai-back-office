import * as fs from "node:fs";
import * as path from "node:path";
import { parseCsvContent } from "./csvParser";
import { listExcelSheets } from "./excelParser";
import { listSqliteTables } from "./sqliteSource";

export interface DiscoveredSource {
  path: string;
  name: string;
  sourceType: "csv" | "excel" | "sqlite";
  sizeBytes: number;
  lastModified: Date;
  details: {
    headers?: string[];
    delimiter?: string;
    sheets?: string[];
    tables?: string[];
  };
}

export interface DiscoveryOptions {
  basePath?: string;
  maxDepth?: number;
  includeSamples?: boolean;
}

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".gemini",
  "dist",
  "build",
  ".next",
  "coverage",
  ".turbo",
]);

/**
 * Descubre archivos de datos disponibles en el directorio autorizado por el usuario.
 * Respeta límites de seguridad: no inspecciona fuera de las rutas autorizadas,
 * omite carpetas internas del sistema y no ejecuta código no confiable.
 */
export async function discoverLocalSources(options: DiscoveryOptions = {}): Promise<DiscoveredSource[]> {
  const rootPath = path.resolve(options.basePath || process.cwd());
  const maxDepth = options.maxDepth ?? 3;
  const includeSamples = options.includeSamples ?? true;

  // Verificación de seguridad de frontera: evitar escaneos de raíz del sistema
  const normalizedRoot = path.normalize(rootPath);
  if (normalizedRoot === "/" || /^[a-zA-Z]:\\?$/.test(normalizedRoot)) {
    throw new Error(
      "Por seguridad, no está permitido escanear la raíz completa del disco. Indique un directorio de proyecto o datos específico."
    );
  }

  if (!fs.existsSync(rootPath)) {
    throw new Error(`El directorio especificado no existe: "${rootPath}"`);
  }

  const results: DiscoveredSource[] = [];

  function scan(currentDir: string, currentDepth: number) {
    if (currentDepth > maxDepth) return;

    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return; // Permiso denegado u omitido
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name) && !entry.name.startsWith(".")) {
          scan(fullPath, currentDepth + 1);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        let sourceType: "csv" | "excel" | "sqlite" | null = null;

        if (ext === ".csv" || ext === ".tsv") {
          sourceType = "csv";
        } else if (ext === ".xlsx" || ext === ".xls") {
          sourceType = "excel";
        } else if (ext === ".db" || ext === ".sqlite" || ext === ".sqlite3") {
          sourceType = "sqlite";
        }

        if (!sourceType) continue;

        try {
          const stats = fs.statSync(fullPath);
          const discovered: DiscoveredSource = {
            path: fullPath,
            name: entry.name,
            sourceType,
            sizeBytes: stats.size,
            lastModified: stats.mtime,
            details: {},
          };

          if (includeSamples) {
            if (sourceType === "csv") {
              try {
                // Leer solo los primeros 4KB para extraer encabezados y delim
                const fd = fs.openSync(fullPath, "r");
                const buffer = Buffer.alloc(Math.min(4096, stats.size));
                fs.readSync(fd, buffer, 0, buffer.length, 0);
                fs.closeSync(fd);
                const sampleText = buffer.toString("utf-8");
                const parsed = parseCsvContent(sampleText);
                discovered.details.headers = parsed.headers;
                discovered.details.delimiter = parsed.delimiter;
              } catch {
                // Si falla la muestra, se deja vacío
              }
            } else if (sourceType === "excel") {
              try {
                discovered.details.sheets = listExcelSheets(fullPath);
              } catch {
                // Falla de lectura de hojas
              }
            } else if (sourceType === "sqlite") {
              try {
                discovered.details.tables = listSqliteTables(fullPath);
              } catch {
                // Falla de lectura de tablas sqlite
              }
            }
          }

          results.push(discovered);
        } catch {
          // Omitir archivo si falla stat
        }
      }
    }
  }

  scan(rootPath, 0);
  return results;
}
