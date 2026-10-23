/**
 * Sanitizador de entradas externas para el motor de ingesta de Mint
 * Protege contra:
 * 1. Caracteres de control, bytes nulos y secuencias de escape ANSI.
 * 2. Intentos de inyección SQL en identificadores de tabla o columnas.
 * 3. Inyecciones de prompt dirigidas a confundir a los agentes LLM.
 */

const ANSI_REGEX = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
  /disregard\s+(all\s+)?(previous|prior)\s+instructions/i,
  /you\s+are\s+now\s+a\s+/i,
  /system\s*:\s*/i,
  /<\|im_start\|>/i,
  /<\|im_end\|>/i,
  /\[INST\]/i,
  /\[\/INST\]/i,
  /<<SYS>>/i,
  /<\/s>/i,
];

/**
 * Sanitiza identificadores SQL (nombres de tabla o de columna).
 * Solo permite caracteres alfanuméricos y guiones bajos [a-zA-Z0-9_].
 * Si contiene caracteres peligrosos, lanza un error impidiendo cualquier inyección SQL.
 */
export function sanitizeSqlIdentifier(name: string): string {
  if (!name || typeof name !== "string") {
    throw new Error("Identificador SQL inválido: debe ser una cadena no vacía.");
  }

  const trimmed = name.trim();
  // Validar formato estricto: comienza con letra o _, seguido de alfanuméricos
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
    throw new Error(
      `Identificador SQL no seguro detectado: "${name}". Solo se permiten caracteres alfanuméricos y guiones bajos.`
    );
  }

  return trimmed;
}

/**
 * Sanitiza valores de celdas provenientes de fuentes externas (archivos CSV, Excel, DBs externas).
 * Normaliza codificación UTF-8, remueve BOM, caracteres nulos y neutraliza patrones de inyección a LLM.
 */
export function sanitizeCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  let str = String(value);

  // 1. Eliminar Byte Order Mark (BOM) y caracteres nulos
  str = str.replace(/^\uFEFF/, "").replace(/\0/g, "");

  // 2. Eliminar secuencias ANSI de terminal
  str = str.replace(ANSI_REGEX, "");

  // 3. Normalizar saltos de línea y espacios en blanco excesivos
  str = str.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // 4. Neutralizar patrones de inyección de prompt
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(str)) {
      str = str.replace(pattern, "[FILTERED_PROMPT_INJECTION]");
    }
  }

  return str.trim();
}

/**
 * Sanitiza un registro completo (fila) de datos externos
 */
export function sanitizeRow(row: Record<string, any>): Record<string, string> {
  const sanitized: Record<string, string> = {};
  for (const [key, val] of Object.entries(row)) {
    // Normalizar también el nombre de la clave
    const safeKey = key.replace(/^\uFEFF/, "").trim();
    sanitized[safeKey] = sanitizeCell(val);
  }
  return sanitized;
}
