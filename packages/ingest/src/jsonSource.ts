import * as fs from "node:fs";
import * as path from "node:path";
import { sanitizeCell } from "./sanitizer";

export interface ParsedJsonTable {
  tableName: string;
  headers: string[];
  rows: Array<Record<string, string>>;
  totalRows: number;
}

/**
 * Parsea un archivo JSON (array de objetos o NDJSON) a formato tabular sanitizado
 */
export function parseJsonFile(filePath: string, tableName?: string): ParsedJsonTable {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Archivo JSON no encontrado: "${filePath}"`);
  }

  const rawContent = fs.readFileSync(filePath, "utf8").trim();
  let parsed: any;

  if (rawContent.startsWith("[")) {
    parsed = JSON.parse(rawContent);
  } else {
    // NDJSON (línea por línea)
    parsed = rawContent
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => JSON.parse(l));
  }

  if (!Array.isArray(parsed)) {
    if (typeof parsed === "object" && parsed !== null) {
      // Buscar primera propiedad que sea un array
      const arrayKey = Object.keys(parsed).find((k) => Array.isArray(parsed[k]));
      if (arrayKey) {
        parsed = parsed[arrayKey];
      } else {
        parsed = [parsed];
      }
    } else {
      throw new Error(`El archivo JSON no contiene un array de registros.`);
    }
  }

  if (parsed.length === 0) {
    return {
      tableName: tableName || path.basename(filePath, path.extname(filePath)),
      headers: [],
      rows: [],
      totalRows: 0,
    };
  }

  // Extraer todos los headers únicos de los objetos
  const headerSet = new Set<string>();
  for (const item of parsed) {
    if (typeof item === "object" && item !== null) {
      Object.keys(item).forEach((k) => headerSet.add(k));
    }
  }
  const headers = Array.from(headerSet);

  const rows: Array<Record<string, string>> = [];
  for (const item of parsed) {
    const row: Record<string, string> = {};
    for (const h of headers) {
      const val = item[h];
      row[h] = sanitizeCell(typeof val === "object" && val !== null ? JSON.stringify(val) : String(val ?? ""));
    }
    rows.push(row);
  }

  return {
    tableName: tableName || path.basename(filePath, path.extname(filePath)),
    headers,
    rows,
    totalRows: rows.length,
  };
}

export function parseJsonContent(rawContent: string, tableName: string = "json_data"): ParsedJsonTable {
  const trimmed = rawContent.trim();
  let parsed: any;
  if (trimmed.startsWith("[")) {
    parsed = JSON.parse(trimmed);
  } else {
    parsed = trimmed
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => JSON.parse(l));
  }
  if (!Array.isArray(parsed)) {
    parsed = [parsed];
  }

  const headerSet = new Set<string>();
  for (const item of parsed) {
    if (typeof item === "object" && item !== null) {
      Object.keys(item).forEach((k) => headerSet.add(k));
    }
  }
  const headers = Array.from(headerSet);

  const rows: Array<Record<string, string>> = [];
  for (const item of parsed) {
    const row: Record<string, string> = {};
    for (const h of headers) {
      const val = item[h];
      row[h] = sanitizeCell(typeof val === "object" && val !== null ? JSON.stringify(val) : String(val ?? ""));
    }
    rows.push(row);
  }

  return {
    tableName,
    headers,
    rows,
    totalRows: rows.length,
  };
}

export const parseJsonSource = parseJsonContent;

