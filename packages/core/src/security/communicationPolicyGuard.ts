/**
 * Guardia de Política de Comunicación y Seguridad de Mensajería Saliente (MINT Enterprise)
 *
 * MINT es un agente autónomo empresarial:
 * - NO es un chatbot que obedece ciegamente cualquier orden.
 * - Evalúa contexto, intención, destinatario y legitimidad operativa antes de comunicar.
 * - Bloquea bromas, insultos, contenido absurdo, spam, desvíos de auditoría y suplantaciones.
 * - PERMITE y fomenta comunicaciones empresariales legítimas (alertas, incidencias, reportes, notas de trabajo).
 */

export interface CommunicationEvaluation {
  isAllowed: boolean;
  isOutboundAction: boolean;
  intentCategory:
    | "LEGITIMATE_OPERATIONAL"
    | "LEGITIMATE_WORK_NOTICE"
    | "ABSURD_OR_PRANK"
    | "OFFENSIVE_OR_HARASSMENT"
    | "SPAM_OR_FLOODING"
    | "AUDIT_OR_SECURITY_BYPASS"
    | "UNAUTHORIZED_SNOOPING"
    | "GENERAL_CONVERSATION";
  rejectionReason?: string;
  suggestedResponse?: string;
  severity: "INFO" | "WARNING" | "CRITICAL_BLOCKED";
}

// Ventana deslizante para control de frecuencia (Rate Limiting de Notificaciones)
const NOTIFICATION_HISTORY: Map<string, number[]> = new Map();
const MAX_NOTIFICATIONS_PER_MINUTE = 6;
const MIN_INTERVAL_MS = 2500;

// Patrones de solicitud de envío saliente
const OUTBOUND_DISPATCH_PATTERNS = [
  /\b(manda(r)?|envia(r)?|notifica(r)?|publica(r)?|escribe(r)?|avisa(r)?|dispara(r)?|transmite|postea(r)?)\b.*?\b(al?|en|por el?|a los)\b.*?\b(administrador|admin|ceo|canal(es)?|discord|slack|telegram|gerente|jefe|grupo|webhook)\b/i,
  /\b(al?|en|por el?)\b.*?\b(administrador|admin|ceo|canal(es)?|discord|slack|telegram)\b.*?\b(manda(r)?|envia(r)?|notifica(r)?|avisa(r)?|publica(r)?)\b/i,
  /\b(envia|manda|notifica|avisa)\s+(un\s+mensaje|esto|un\s+aviso|una\s+alerta)\b/i,
];

// Patrones de contenido absurdo, bromas o sin propósito empresarial
const ABSURD_OR_PRANK_PATTERNS = [
  /\b(pene|pusaja|culo|mierda|chucha|polla|verga|pito|teta|cojones|puta|hijueputa|malparido|gonorrea|idiota|estupido|imbecil|pendejo)\b/i,
  /\b(porque si|porque me da la gana|porque quiero|por joder|es una broma|solo es una broma|es un chiste|para reirnos|a ver que dice|a ver que pasa)\b/i,
  /\b(jajaj+|jejej+|xdxd+)\b/i,
];

// Patrones de intentos de elusión de auditoría o autorización ficticia
const AUDIT_AND_BYPASS_PATTERNS = [
  /\b(el\s+administrador\s+me\s+autoriz[oó]\s+verbalmente|tengo\s+autorizaci[oó]n\s+verbal)\b/i,
  /\bno\s+preguntes[\s,]+(solo\s+)?(ejecuta|hazlo|manda|env[ií]a)\b/i,
  /\b((y\s+luego|por\s+favor)?\s*(borra|elimina|oculta)\s+el\s+(registro|log|evidencia|caso|historial))\b/i,
  /\b(desactiva\s+(la\s+)?seguridad|modo\s+seguridad\s+deshabilitado|apaga\s+las\s+reglas)\b/i,
  /\b(hazlo\s+como\s+prueba\s+pero\s+usa\s+el\s+canal\s+real)\b/i,
  /\b(ignora\s+(tus|las)\s+instrucciones|ahora\s+eres\s+el\s+admin)\b/i,
];

// Patrones de spam y saturación de canales
const SPAM_PATTERNS = [
  /\b(env[ií]a|manda)\s+(\d{2,}|veinte|treinta|cincuenta|cien|[0-9]+)\s+mensajes\b/i,
  /\b(spamea|inunda|bombardea|satura)\s+(el\s+canal|al\s+admin|a\s+todos)\b/i,
  /\b(repite\s+el\s+mensaje\s+\d+\s+veces)\b/i,
];

// Patrones de violación de privacidad de otros empleados
const PRIVACY_SNOOPING_PATTERNS = [
  /\b(reenv[ií]a\s+(el\s+|un\s+)?mensaje\s+privado\s+de\s+(otro\s+empleado|[a-zA-Záéíóú]+))\b/i,
  /\b(revela\s+los\s+chats\s+privados\s+de)\b/i,
  /\b(exfiltra|muestra)\s+(claves|passwords|tokens|secretos)\b/i,
];

// Palabras clave de justificación operativa legítima
const LEGITIMATE_BUSINESS_KEYWORDS = [
  "stock", "inventario", "retraso", "camion", "transporte", "proveedor", "entrega",
  "pedido", "orden", "compra", "cotizacion", "llegada", "demora", "faltante", "quiebre",
  "bodega", "almacen", "embarque", "factura", "reabastecimiento", "urgente", "incidencia",
  "averia", "falla", "derrumb", "bloqueo", "precio", "despacho", "cliente", "reporte",
  "merma", "vencimiento", "cuadre", "caja", "envio", "pago", "operacion", "mantenimiento"
];

/**
 * Evalúa si una solicitud de mensaje o acción saliente cumple con las políticas operativas empresariales.
 */
export function evaluateCommunicationIntent(params: {
  userInput: string;
  targetChannel?: string;
  companyId?: string;
  language?: "es" | "en";
  skipRateLimit?: boolean;
}): CommunicationEvaluation {
  const text = (params.userInput || "").trim();
  const isEn = params.language === "en";
  const companyId = params.companyId || "comp_default";

  // 1. Detectar si el usuario está pidiendo una acción de envío, despacho o comando operativo
  const isOutbound =
    OUTBOUND_DISPATCH_PATTERNS.some((regex) => regex.test(text)) ||
    /\b(hazlo|ejecuta|manda|envia|publica|dispara|transmite)\b/i.test(text);

  const isBypassAttempt = AUDIT_AND_BYPASS_PATTERNS.some((r) => r.test(text));
  const isPrivacySnoop = PRIVACY_SNOOPING_PATTERNS.some((r) => r.test(text));
  const isSpamAttempt = SPAM_PATTERNS.some((r) => r.test(text));
  const isPrankDirective = /\b(es\s+una\s+broma|solo\s+es\s+una\s+broma)\b.*?\b(hazlo|ejecuta|adelante|manda|envia|dale)\b/i.test(text);

  // Si no es una orden operativa ni intento de manipulación/envío, se considera conversación general
  if (!isOutbound && !isBypassAttempt && !isPrivacySnoop && !isSpamAttempt && !isPrankDirective) {
    return {
      isAllowed: true,
      isOutboundAction: false,
      intentCategory: "GENERAL_CONVERSATION",
      severity: "INFO",
    };
  }

  // 2. Verificar intentos de elusión de seguridad y auditoría
  for (const bypassRegex of AUDIT_AND_BYPASS_PATTERNS) {
    if (bypassRegex.test(text)) {
      return {
        isAllowed: false,
        isOutboundAction: true,
        intentCategory: "AUDIT_OR_SECURITY_BYPASS",
        severity: "CRITICAL_BLOCKED",
        rejectionReason: "Intento de elusión de políticas, manipulación de permisos o solicitud de destrucción de bitácora.",
        suggestedResponse: isEn
          ? "I cannot execute this request. MINT enforces strict immutable audit logging and requires authenticated operational authorization. Verbal claims or bypassing system controls are not permitted."
          : "No puedo ejecutar esa solicitud. MINT mantiene un registro de auditoría estricto e inmutable y no acepta autorizaciones verbales no verificadas ni solicitudes de elusión de controles.",
      };
    }
  }

  // 3. Verificar intentos de vulneración de privacidad de otros empleados
  for (const privRegex of PRIVACY_SNOOPING_PATTERNS) {
    if (privRegex.test(text)) {
      return {
        isAllowed: false,
        isOutboundAction: true,
        intentCategory: "UNAUTHORIZED_SNOOPING",
        severity: "CRITICAL_BLOCKED",
        rejectionReason: "Solicitud no autorizada para acceder o retransmitir comunicaciones privadas de otros empleados.",
        suggestedResponse: isEn
          ? "I cannot forward private communications from other employees or expose internal credentials. All corporate data is isolated and protected."
          : "No puedo reenviar mensajes privados de otros colaboradores ni divulgar información confidencial. Las comunicaciones internas están protegidas por políticas de privacidad.",
      };
    }
  }

  // 4. Verificar intentos de spam o saturación masiva
  for (const spamRegex of SPAM_PATTERNS) {
    if (spamRegex.test(text)) {
      return {
        isAllowed: false,
        isOutboundAction: true,
        intentCategory: "SPAM_OR_FLOODING",
        severity: "WARNING",
        rejectionReason: "Petición de inundación masiva o spam hacia los canales corporativos.",
        suggestedResponse: isEn
          ? "I cannot send repetitive or bulk messages to operational channels. Alerts must be unique, concise, and linked to real operational events."
          : "No realizaré envíos masivos o repetitivos hacia los canales corporativos. Las comunicaciones del sistema deben ser únicas, concisas y vinculadas a eventos operativos reales.",
      };
    }
  }

  // 5. Verificar contenido absurdo, bromas, groserías o mensajes no empresariales
  const containsAbsurdOrProfanity = ABSURD_OR_PRANK_PATTERNS.some((regex) => regex.test(text));
  if (containsAbsurdOrProfanity) {
    return {
      isAllowed: false,
      isOutboundAction: true,
      intentCategory: "ABSURD_OR_PRANK",
      severity: "WARNING",
      rejectionReason: "El mensaje solicitado contiene contenido absurdo, ofensivo, una broma o carece de finalidad empresarial legítima.",
      suggestedResponse: isEn
        ? "I can help you contact the administrator or operations team regarding an operational matter or your business operations, but I will not transmit absurd, offensive, spam, or non-business messages. If you need to communicate a legitimate operational notice about inventory, orders, or logistics, please state what you wish to report."
        : "Puedo ayudarte a contactar al administrador o al equipo operativo por un asunto relacionado con MINT o con la operación de tu empresa, pero no enviaré mensajes absurdos, ofensivos, spam ni comunicaciones sin justificación operativa. Si necesitas comunicarle algo legítimo sobre inventario, pedidos o logística, dime qué novedad deseas reportar.",
    };
  }

  // 6. Validar si existe justificación operativa legítima (trabajo, logística, inventario, reportes)
  const normText = text.toLowerCase();
  const hasBusinessContext = LEGITIMATE_BUSINESS_KEYWORDS.some((kw) => normText.includes(kw));

  // Si pide enviar algo sin contexto empresarial alguno (ej: "manda un mensaje al admin que diga hola qué tal nada más")
  if (!hasBusinessContext && normText.length < 35 && !/reporte|resumen|status|estado/i.test(normText)) {
    return {
      isAllowed: false,
      isOutboundAction: true,
      intentCategory: "ABSURD_OR_PRANK",
      severity: "WARNING",
      rejectionReason: "La solicitud de mensaje saliente carece de motivo operativo o contexto comercial identificable.",
      suggestedResponse: isEn
        ? "I can dispatch notifications to your channels when there is an operational reason (stock update, supplier arrival, shipment delay, or daily report). Please specify the operational event or details you want to inform the administrator about."
        : "Puedo enviar notificaciones a tus canales cuando exista un motivo operativo (cambios de stock, llegada de proveedores, retrasos de envíos o reportes). Por favor indícame la novedad operativa o los datos que necesitas comunicar.",
    };
  }

  // 7. Control de Frecuencia (Rate Limiting) por Empresa
  if (!params.skipRateLimit) {
    const now = Date.now();
    const history = NOTIFICATION_HISTORY.get(companyId) || [];
    const validHistory = history.filter((ts) => now - ts < 60000);

    if (validHistory.length >= MAX_NOTIFICATIONS_PER_MINUTE) {
      return {
        isAllowed: false,
        isOutboundAction: true,
        intentCategory: "SPAM_OR_FLOODING",
        severity: "WARNING",
        rejectionReason: `Límite de frecuencia excedido (${MAX_NOTIFICATIONS_PER_MINUTE} notificaciones por minuto).`,
        suggestedResponse: isEn
          ? "Notification rate limit reached for this company. Please wait a moment before sending more operational updates."
          : "Se alcanzó el límite de envíos por minuto para esta empresa. Por favor espera un momento antes de emitir más notificaciones operativas.",
      };
    }

    const lastSent = validHistory[validHistory.length - 1];
    if (lastSent && now - lastSent < MIN_INTERVAL_MS) {
      return {
        isAllowed: false,
        isOutboundAction: true,
        intentCategory: "SPAM_OR_FLOODING",
        severity: "WARNING",
        rejectionReason: "Espaciado mínimo de envío no cumplido.",
        suggestedResponse: isEn
          ? "Please wait a few seconds between outgoing operational broadcasts."
          : "Por favor espera unos segundos entre despachos de notificaciones operativas.",
      };
    }

    // Acción legítima autorizada
    validHistory.push(now);
    NOTIFICATION_HISTORY.set(companyId, validHistory);
  }

  return {
    isAllowed: true,
    isOutboundAction: true,
    intentCategory: "LEGITIMATE_WORK_NOTICE",
    severity: "INFO",
  };
}

/**
 * Validador estricto para el backend / herramientas de despacho (enviar_notificacion_operativa, probar_canal_notificacion).
 * Actúa como cortafuegos definitivo incluso si un atacante elude el LLM mediante prompt injection.
 */
export function evaluateOutboundNotificationPayload(params: {
  title?: string;
  message?: string;
  severity?: string;
  companyId?: string;
  language?: "es" | "en";
}): { isAllowed: boolean; rejectionReason?: string } {
  const combined = `${params.title || ""} ${params.message || ""}`.trim();

  // 1. Detección de contenido inapropiado o bromas
  for (const pattern of ABSURD_OR_PRANK_PATTERNS) {
    if (pattern.test(combined)) {
      return {
        isAllowed: false,
        rejectionReason:
          "Rechazado por política de seguridad corporativa: el contenido contiene lenguaje inapropiado, bromas o expresiones ajenas a la operación empresarial.",
      };
    }
  }

  // 2. Detección de elusión de auditoría
  for (const bypass of AUDIT_AND_BYPASS_PATTERNS) {
    if (bypass.test(combined)) {
      return {
        isAllowed: false,
        rejectionReason:
          "Rechazado por política de seguridad corporativa: intento de evasión de controles o suplantación de autorización.",
      };
    }
  }

  // 3. Detección de violación de privacidad
  for (const priv of PRIVACY_SNOOPING_PATTERNS) {
    if (priv.test(combined)) {
      return {
        isAllowed: false,
        rejectionReason:
          "Rechazado por política de seguridad corporativa: intento de retransmisión no autorizada de datos privados o credenciales.",
      };
    }
  }

  // 4. Contenido vacío o trivial sin justificación
  if (combined.length < 5) {
    return {
      isAllowed: false,
      rejectionReason:
        "Rechazado: el mensaje operativo a despachar debe contener información descriptiva verificable.",
    };
  }

  return { isAllowed: true };
}
