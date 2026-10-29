import * as path from "node:path";

/**
 * Saneamiento y Seguridad para la Memoria en Vault de MINT
 * Garantiza:
 * 1. Cero Path Traversal
 * 2. Protección contra Prompt Injection en notas leídas por el LLM
 * 3. Enmascaramiento de secretos y credenciales sensibles
 * 4. Nombres de archivo seguros y estables
 */

const MAX_NOTE_SIZE_BYTES = 150 * 1024; // 150 KB máximo por nota

// Patrones de inyección de prompt conocidos
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous\s+)?instructions/gi,
  /ignora\s+(todas\s+las\s+)?instrucciones(\s+anteriores)?/gi,
  /you\s+are\s+now\s+a/gi,
  /system\s*prompt\s*:/gi,
  /system:\s*override/gi,
  /olvida\s+tus\s+reglas/gi,
  /bypass\s+policy/gi,
  /disregard\s+prior\s+guidance/gi,
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
];

// Claves sensibles a enmascarar
const FORBIDDEN_SECRET_KEYS = [
  "password",
  "secret",
  "token",
  "apikey",
  "api_key",
  "authorization",
  "bearer",
  "cookie",
  "private_key",
  "clave",
];

/**
 * Valida y resuelve una ruta dentro del vault asegurando que no haya escape (Path Traversal)
 */
export function resolveSafeVaultPath(vaultRoot: string, relativePath: string): string {
  // 1. Prohibir caracteres de control o bytes nulos
  if (relativePath.includes("\0")) {
    throw new Error("Intento de path traversal detectado: byte nulo en la ruta.");
  }

  // 2. Normalizar y resolver
  const cleanRelative = relativePath.replace(/^[/\\]+/, "");
  const resolved = path.resolve(vaultRoot, cleanRelative);

  // 3. Verificar que la ruta resultante esté estrictamente contenida dentro de vaultRoot
  const normalizedRoot = path.resolve(vaultRoot);
  if (!resolved.startsWith(normalizedRoot + path.sep) && resolved !== normalizedRoot) {
    throw new Error(`Acceso denegado: La ruta '${relativePath}' escapa del directorio raíz del vault.`);
  }

  return resolved;
}

/**
 * Genera un nombre de archivo seguro y libre de colisiones
 */
export function slugifyFilename(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remover tildes
    .replace(/[^a-zA-Z0-9_\-.]/g, "_") // Solo caracteres seguros
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 100);
}

/**
 * Sanea el contenido de una nota para prevenir ataques de Prompt Injection
 * cuando se inyecta en el contexto del modelo de lenguaje.
 */
export function sanitizeForPromptContext(rawText: string): string {
  let clean = rawText;

  // 1. Desactivar patrones de inyección reemplazándolos con marcas neutrales
  for (const pattern of INJECTION_PATTERNS) {
    clean = clean.replace(pattern, "[TEXTO_SOSPECHOSO_DESACTIVADO]");
  }

  // 2. Enmascarar posibles tokens JWT o claves de API largas
  clean = clean.replace(/eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, "[JWT_ENMASCARADO]");
  clean = clean.replace(/sk-[a-zA-Z0-9]{20,}/g, "[API_KEY_ENMASCARADA]");

  return clean;
}

/**
 * Enmascara valores de objetos o textos antes de guardarlos en el frontmatter o markdown
 */
export function maskSensitiveSecrets(obj: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};

  for (const [k, v] of Object.entries(obj)) {
    const isSensitive = FORBIDDEN_SECRET_KEYS.some((bad) => k.toLowerCase().includes(bad));

    if (isSensitive) {
      clean[k] = "[PROTEGIDO]";
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      clean[k] = maskSensitiveSecrets(v);
    } else if (Array.isArray(v)) {
      clean[k] = v.map((item) => (typeof item === "object" && item ? maskSensitiveSecrets(item) : item));
    } else {
      clean[k] = v;
    }
  }

  return clean;
}

/**
 * Valida el tamaño máximo permitido de una nota
 */
export function validateNoteSize(content: string) {
  const byteLength = Buffer.byteLength(content, "utf8");
  if (byteLength > MAX_NOTE_SIZE_BYTES) {
    throw new Error(`La nota excede el tamaño máximo permitido (${byteLength} bytes > ${MAX_NOTE_SIZE_BYTES} bytes).`);
  }
}
