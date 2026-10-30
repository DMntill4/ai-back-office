/**
 * Sanitizador de entradas externas para el motor de ingesta de Mint
 * Principio:
 * 1. Limpieza de codificación no destructiva (remover BOM, bytes nulos, secuencias de escape ANSI).
 * 2. Normalización de formato numérico latino (coma decimal a punto decimal).
 * 3. Identificadores SQL estrictamente validados por whitelist.
 * 4. Detección y auditoría de inyecciones de prompt SIN corromper el contenido original.
 *    (La defensa real ante el LLM es el esquema Zod estructurado y el motor de políticas determinista).
 */

const ANSI_REGEX = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

export const KNOWN_INJECTION_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: "IGNORE_INSTRUCTIONS", regex: /(ignore|ignora|disregard|olvida)\s+(all\s+)?(previous|todas\s+las|tus)\s+(instructions|instrucciones|reglas)/i },
  { name: "ROLE_OVERRIDE", regex: /(you\s+are\s+now|ahora\s+eres)\s+(a|the|el)\s+/i },
  { name: "SYSTEM_DELIMITER", regex: /(<\|im_start\|>|<\|im_end\|>|\[INST\]|\[\/INST\]|<<SYS>>|<\/s>)/i },
  { name: "EXPLICIT_SYSTEM_PROMPT", regex: /system\s*:\s*(you|act|execute)/i },
  { name: "INDIRECT_PROMPT_INJECTION", regex: /(instrucci[oó]n\s+para\s+mint|mint\s+instruction|exporta\s+(toda\s+)?la\s+base\s+de\s+datos|env[ií]ala\s+a\s+este\s+webhook)/i },
  { name: "FORMULA_INJECTION", regex: /^'?[=+\-@\t\r](cmd|hyperlink|dde|exec|powershell|calc|certutil)/i },
];

/**
 * Sanitiza rutas de archivos para prevenir ataques de Path Traversal
 */
export function sanitizeFilePath(filePath: string, allowedExtensions: string[] = [".csv", ".tsv", ".txt", ".xlsx", ".xls", ".json"]): string {
  if (!filePath || typeof filePath !== "string") {
    throw new Error("Ruta de archivo inválida.");
  }

  const clean = filePath.trim();
  // Validar extensión permitida
  const lower = clean.toLowerCase();
  const hasValidExt = allowedExtensions.some((ext) => lower.endsWith(ext));
  if (!hasValidExt) {
    throw new Error(`Extensión de archivo no permitida: "${filePath}". Formatos soportados: ${allowedExtensions.join(", ")}`);
  }

  return clean;
}

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
 * Inspecciona si un texto contiene patrones sospechosos de inyección de prompt
 * sin modificar ni corromper el contenido original.
 */
export function inspectSuspiciousPatterns(text: string): string[] {
  const detected: string[] = [];
  for (const { name, regex } of KNOWN_INJECTION_PATTERNS) {
    if (regex.test(text)) {
      detected.push(name);
    }
  }
  return detected;
}

/**
 * Sanitiza valores de celdas provenientes de fuentes externas.
 * Limpia codificaciones (BOM, ANSI, null bytes) y normaliza formato numérico latino con comas.
 * Conserva el texto legítimo intacto sin mutilarlo.
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

  // 3. Normalizar saltos de línea
  str = str.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const trimmed = str.trim();

  // 4. Normalizar números con coma decimal si corresponde (ej: "12,50" -> "12.50")
  if (/^-?\d+,\d+$/.test(trimmed)) {
    return trimmed.replace(",", ".");
  }

  // 5. Neutralizar inyección de fórmulas CSV / Excel (DDE Formula Injection)
  if (
    trimmed.startsWith("=") ||
    trimmed.startsWith("@") ||
    trimmed.startsWith("\t") ||
    trimmed.startsWith("\r") ||
    (trimmed.startsWith("+") && !/^\+\d/.test(trimmed)) ||
    (trimmed.startsWith("-") && !/^-\d/.test(trimmed))
  ) {
    return "'" + trimmed;
  }

  return trimmed;
}

export interface SanitizedRowResult {
  row: Record<string, string>;
  suspiciousWarnings: string[];
}

/**
 * Sanitiza un registro completo (fila) de datos externos,
 * reportando advertencias de cuarentena si se detectan patrones anómalos.
 */
export function sanitizeRow(row: Record<string, any>): SanitizedRowResult {
  const sanitized: Record<string, string> = {};
  const warnings: string[] = [];

  for (const [key, val] of Object.entries(row)) {
    const safeKey = key.replace(/^\uFEFF/, "").trim();
    const cleanVal = sanitizeCell(val);
    sanitized[safeKey] = cleanVal;

    const detected = inspectSuspiciousPatterns(cleanVal);
    if (detected.length > 0) {
      warnings.push(`Columna '${safeKey}' contiene patrones sospechosos: ${detected.join(", ")}`);
    }
  }

  return {
    row: sanitized,
    suspiciousWarnings: warnings,
  };
}
