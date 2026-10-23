import { syncDataSource } from "./syncEngine";

export interface ImportOptions {
  companyId: string;
  sourceName: string;
  sourceType: "csv" | "excel" | "postgres_readonly" | "sqlite";
  uriOrPath: string;
  mappings: Record<string, string>; // targetField -> sourceHeader
  rows: Array<Record<string, string>>;
}

export interface ImportSummary {
  success: boolean;
  jobId: string;
  dataSourceId: string;
  totalRows: number;
  importedRows: number;
  failedRows: number;
  errors: Array<{ row: number; error: string; data: any }>;
  isInitialSync?: boolean;
  deletedRows?: number;
}

/**
 * Ejecuta la importación delegando en el SyncEngine resiliente.
 * Garantiza idempotencia de dataSource, sanitización y protección contra duplicados.
 */
export async function executeImport(options: ImportOptions): Promise<ImportSummary> {
  const { companyId, sourceName, sourceType, uriOrPath, mappings, rows } = options;

  // Derivar encabezados de las filas o de los valores de mapeo
  const currentHeaders =
    rows.length > 0 ? Object.keys(rows[0]) : Object.values(mappings).filter(Boolean);

  const syncRes = await syncDataSource({
    companyId,
    sourceName,
    sourceType,
    uriOrPath,
    currentHeaders,
    rows,
    explicitMappings: mappings,
  });

  return {
    success: syncRes.success,
    jobId: syncRes.jobId,
    dataSourceId: syncRes.dataSourceId,
    totalRows: syncRes.totalRows,
    importedRows: syncRes.importedRows,
    failedRows: syncRes.failedRows,
    errors: syncRes.errors,
    isInitialSync: syncRes.isInitialSync,
    deletedRows: syncRes.deletedRows,
  };
}
