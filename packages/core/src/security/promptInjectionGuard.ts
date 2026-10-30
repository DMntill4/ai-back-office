/**
 * Guardia Anti-Prompt Injection y Protección de Datos No Confiables (MINT Security)
 *
 * Principio:
 * 1. Detección temprana de ataques de inyección de prompt directos e indirectos.
 * 2. Delimitación estricta de datos externos (<untrusted_data>) para que el LLM
 *    los procese como datos pasivos y JAMÁS como comandos o instrucciones ejecutables.
 * 3. Redacción automática de secretos, tokens y credenciales en salidas y bitácoras.
 */

export interface PromptInjectionAnalysis {
  isSuspicious: boolean;
  score: number; // 0.0 (seguro) a 1.0 (ataque evidente)
  detectedPatterns: string[];
  explanation?: string;
}

// Patrones de inyección directa e intentos de escape de contexto
const INJECTION_PATTERNS: Array<{ name: string; weight: number; regex: RegExp }> = [
  {
    name: "DIRECT_INSTRUCTION_OVERRIDE",
    weight: 0.9,
    regex: /(ignore|ignora|disregard|olvida)\s+(all\s+)?(previous|todas\s+las|tus)\s+(instructions|instrucciones|reglas)/i,
  },
  {
    name: "ROLE_HIJACKING",
    weight: 0.85,
    regex: /(ahora\s+eres|you\s+are\s+now|act\s+as|actua\s+como)\s+(el\s+administrador|the\s+admin|root|superuser|system\s+admin|desarrollador)/i,
  },
  {
    name: "DISABLE_RESTRICTIONS",
    weight: 0.9,
    regex: /(desactiva|disable|turn\s+off)\s+(tus\s+restricciones|las\s+restricciones|security\s+mode|modo\s+de\s+seguridad|guardrails)/i,
  },
  {
    name: "DEVELOPER_IMPERSONATION",
    weight: 0.85,
    regex: /(tu\s+desarrollador|your\s+developer|el\s+creador|tu\s+programador)\s+(te\s+autoriza|authorizes\s+you|ordena|dice)/i,
  },
  {
    name: "SYSTEM_PROMPT_EXTRACTION",
    weight: 0.8,
    regex: /(imprime|muestra|revela|show|print|reveal)\s+(tus\s+instrucciones|tu\s+prompt|system\s+prompt|las\s+instrucciones\s+internas)/i,
  },
  {
    name: "SECRET_KEY_EXTRACTION",
    weight: 0.95,
    regex: /(mu[eé]strame|dame|show\s+me|print)\s+(las\s+claves|las\s+api\s+keys|los\s+tokens|las\s+contraseñas|api\s+secret)/i,
  },
  {
    name: "BYPASS_VALIDATION_COMMAND",
    weight: 0.85,
    regex: /(ejecuta\s+la\s+herramienta\s+directamente|sin\s+validar|skip\s+validation|sin\s+permisos)/i,
  },
  {
    name: "AUDIT_SUPPRESSION",
    weight: 0.9,
    regex: /(no\s+registres\s+esta\s+operaci[oó]n|do\s+not\s+log|borra\s+el\s+registro|sin\s+dejar\s+rastro)/i,
  },
  {
    name: "FALLBACK_TOOL_EXPLOIT",
    weight: 0.75,
    regex: /(busca\s+otra\s+herramienta\s+que\s+s[ií]\s+pueda|force\s+tool\s+call|fuerza\s+el\s+envio)/i,
  },
  {
    name: "SYNTHETIC_SYSTEM_DELIMITER",
    weight: 0.95,
    regex: /(<\|im_start\|>|<\|im_end\|>|\[INST\]|\[\/INST\]|<<SYS>>|<\/s>|```system)/i,
  },
];

/**
 * Analiza si un texto proveniente del usuario o de una fuente externa contiene patrones de inyección.
 */
export function analyzePromptInjection(text: string): PromptInjectionAnalysis {
  if (!text || typeof text !== "string") {
    return { isSuspicious: false, score: 0, detectedPatterns: [] };
  }

  const detected: string[] = [];
  let maxWeight = 0;

  for (const { name, weight, regex } of INJECTION_PATTERNS) {
    if (regex.test(text)) {
      detected.push(name);
      if (weight > maxWeight) maxWeight = weight;
    }
  }

  const isSuspicious = detected.length > 0 && maxWeight >= 0.75;

  return {
    isSuspicious,
    score: maxWeight,
    detectedPatterns: detected,
    explanation: isSuspicious
      ? `Patrones de manipulación o inyección de prompt identificados: ${detected.join(", ")}`
      : undefined,
  };
}

/**
 * Envuelve datos no confiables (ej. filas de Excel, descripciones de producto, notas de memoria)
 * en una cápsula delimitada, neutralizando cualquier intento de inyección o escape de delimitador.
 */
export function wrapUntrustedData(data: unknown, sourceLabel = "external_data"): string {
  const rawString = typeof data === "object" ? JSON.stringify(data) : String(data ?? "");

  // Neutralizar intentos de cerrar la etiqueta XML o inyectar delimitadores sintéticos
  const sanitized = rawString
    .replace(/<\/untrusted_data>/gi, "&lt;/untrusted_data&gt;")
    .replace(/<\|im_start\|>/g, "[SAFE_TOKEN_DELIMITER]")
    .replace(/<\|im_end\|>/g, "[SAFE_TOKEN_DELIMITER]")
    .replace(/\[INST\]/g, "[SAFE_INST]")
    .replace(/\[\/INST\]/g, "[/SAFE_INST]");

  return `<untrusted_data source="${sourceLabel}">\n${sanitized}\n</untrusted_data>`;
}

/**
 * Máscara de seguridad para proteger secretos en logs, respuestas de terminal y salidas de LLM.
 */
export function redactSensitiveSecrets(text: string): string {
  if (!text || typeof text !== "string") return text;

  let redacted = text;

  // Claves de API comunes (OpenAI sk-..., Grok xai-..., Supabase JWT)
  redacted = redacted.replace(/sk-[a-zA-Z0-9_-]{20,}/g, "[REDACTED_API_KEY]");
  redacted = redacted.replace(/xai-[a-zA-Z0-9_-]{20,}/g, "[REDACTED_XAI_KEY]");
  redacted = redacted.replace(/ey[a-zA-Z0-9_-]{30,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/g, "[REDACTED_JWT_TOKEN]");

  // URIs de bases de datos con contraseñas: postgres://user:password@host
  redacted = redacted.replace(
    /(postgres(ql)?:\/\/[a-zA-Z0-9_.-]+:)([^@/]+)(@[a-zA-Z0-9_.-]+)/gi,
    "$1[REDACTED_PASSWORD]$4"
  );

  // Tokens de Telegram bot (ej: 123456789:ABCdefGhIjk...)
  redacted = redacted.replace(/\b\d{8,10}:[a-zA-Z0-9_-]{35}\b/g, "[REDACTED_TELEGRAM_TOKEN]");

  // Webhooks de Discord (https://discord.com/api/webhooks/...)
  redacted = redacted.replace(
    /https:\/\/discord(app)?\.com\/api\/webhooks\/\d+\/[a-zA-Z0-9_-]+/gi,
    "https://discord.com/api/webhooks/[REDACTED_WEBHOOK]"
  );

  return redacted;
}
