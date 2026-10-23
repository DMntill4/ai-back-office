import * as fs from "node:fs";

export interface ParsedCsv {
  headers: string[];
  rows: Array<Record<string, string>>;
  totalRows: number;
  delimiter: string;
}

/**
 * Detecta el delimitador más probable en un encabezado CSV (coma, punto y coma, tabulador)
 */
function detectDelimiter(headerLine: string): string {
  const commas = (headerLine.match(/,/g) || []).length;
  const semicolons = (headerLine.match(/;/g) || []).length;
  const tabs = (headerLine.match(/\t/g) || []).length;

  if (semicolons > commas && semicolons > tabs) return ";";
  if (tabs > commas && tabs > semicolons) return "\t";
  return ",";
}

/**
 * Divide una línea respetando comillas
 */
function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Saltar comilla de escape
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Parsea contenido CSV a partir de un string o archivo en disco
 */
export function parseCsvContent(content: string): ParsedCsv {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [], totalRows: 0, delimiter: "," };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter).map((h) => h.replace(/^["']|["']$/g, "").trim());

  const rows: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i], delimiter).map((v) => v.replace(/^["']|["']$/g, "").trim());
    if (values.length === 0 || (values.length === 1 && values[0] === "")) continue;

    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] !== undefined ? values[j] : "";
    }
    rows.push(row);
  }

  return {
    headers,
    rows,
    totalRows: rows.length,
    delimiter,
  };
}

/**
 * Parsea un archivo CSV desde su ruta en disco
 */
export function parseCsvFile(filePath: string): ParsedCsv {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Archivo no encontrado: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, "utf-8");
  return parseCsvContent(content);
}
