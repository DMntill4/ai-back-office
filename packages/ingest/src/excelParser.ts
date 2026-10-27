import * as fs from "node:fs";
import * as XLSX from "xlsx";
import { sanitizeCell } from "./sanitizer";

export interface ParsedExcelSheet {
  sheetName: string;
  headers: string[];
  rows: Array<Record<string, string>>;
  totalRows: number;
}

/**
 * Lista las hojas disponibles en un archivo Excel (.xlsx, .xls)
 */
export function listExcelSheets(filePath: string): string[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Archivo Excel no encontrado: "${filePath}"`);
  }
  const workbook = XLSX.readFile(filePath, { type: "file" });
  return workbook.SheetNames;
}

/**
 * Parsea una hoja de un archivo Excel a un formato tabular sanitizado
 */
export function parseExcelFile(filePath: string, sheetName?: string): ParsedExcelSheet {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Archivo Excel no encontrado: "${filePath}"`);
  }

  const workbook = XLSX.readFile(filePath, { type: "file", cellDates: true });
  const targetSheet = sheetName || workbook.SheetNames[0];

  if (!targetSheet || !workbook.Sheets[targetSheet]) {
    throw new Error(`Hoja "${targetSheet}" no encontrada en el archivo Excel.`);
  }

  const worksheet = workbook.Sheets[targetSheet];
  const rawData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: "" });

  if (rawData.length === 0) {
    return { sheetName: targetSheet, headers: [], rows: [], totalRows: 0 };
  }

  // Primera fila con contenido se considera encabezados
  const headerRow: string[] = (rawData[0] || []).map((h: any) => sanitizeCell(h));
  const headers = headerRow.filter((h: string) => h.length > 0);

  const rows: Array<Record<string, string>> = [];

  for (let i = 1; i < rawData.length; i++) {
    const rawRow = rawData[i] || [];
    // Omitir filas completamente vacías
    if (rawRow.every((val: any) => val === "" || val === null || val === undefined)) {
      continue;
    }

    const rowObj: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      const cellVal = rawRow[j] !== undefined && rawRow[j] !== null ? rawRow[j] : "";
      rowObj[headers[j]] = sanitizeCell(cellVal);
    }
    rows.push(rowObj);
  }

  return {
    sheetName: targetSheet,
    headers,
    rows,
    totalRows: rows.length,
  };
}

/**
 * Parsea todas las hojas de un archivo Excel a colecciones tabulares independientes
 */
export function parseAllExcelSheets(filePath: string): ParsedExcelSheet[] {
  const sheets = listExcelSheets(filePath);
  return sheets.map((name) => parseExcelFile(filePath, name));
}
