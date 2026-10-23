import * as fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { sanitizeSqlIdentifier } from "./sanitizer";

export interface ReadOnlySqliteOptions {
  filePath: string;
  tableName: string;
  limit?: number;
}

/**
 * Lista las tablas disponibles en una base de datos SQLite local en modo SOLO LECTURA.
 */
export function listSqliteTables(filePath: string): string[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Base de datos SQLite no encontrada: "${filePath}"`);
  }

  const db = new DatabaseSync(filePath, { readOnly: true });
  try {
    const stmt = db.prepare(
      "SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC"
    );
    const rows = stmt.all() as Array<{ name: string }>;
    return rows.map((r) => r.name);
  } finally {
    db.close();
  }
}

/**
 * Consulta de solo lectura sobre una base de datos SQLite externa.
 * Garantiza readOnly = true y cierra la conexión inmediatamente para evitar bloqueos en el SO.
 */
export function queryReadOnlySqlite(options: ReadOnlySqliteOptions): {
  headers: string[];
  rows: Array<Record<string, any>>;
  totalReturned: number;
} {
  const { filePath, tableName, limit = 500 } = options;

  if (!fs.existsSync(filePath)) {
    throw new Error(`Base de datos SQLite no encontrada: "${filePath}"`);
  }

  // Sanitizar el nombre de la tabla para prevenir inyecciones
  const safeTable = sanitizeSqlIdentifier(tableName);

  const db = new DatabaseSync(filePath, { readOnly: true });
  try {
    const query = `SELECT * FROM "${safeTable}" LIMIT ?`;
    const stmt = db.prepare(query);
    const rawRows = stmt.all(limit) as Array<Record<string, any>>;

    const headers = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];

    // Normalizar filas a objetos limpios
    const rows = rawRows.map((row) => {
      const cleanRow: Record<string, any> = {};
      for (const [key, val] of Object.entries(row)) {
        cleanRow[key] = val !== null && val !== undefined ? String(val) : "";
      }
      return cleanRow;
    });

    return {
      headers,
      rows,
      totalReturned: rows.length,
    };
  } finally {
    db.close();
  }
}
