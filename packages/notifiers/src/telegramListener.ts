import {
  db,
  companies,
  users,
  warehouses,
  businessConfig,
  notificationChannels,
  resolveNaturalLanguageIntent,
  cases,
  runAgentLoop,
  grokClient,
} from "@mint/core";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { processRemoteApproval } from "./approvalService";

export interface TelegramListenerOptions {
  botToken?: string;
  companyId?: string;
  signal?: AbortSignal;
}

interface UserConversationState {
  step: "READY" | "ASK_NAME" | "ASK_COMPANY" | "ASK_CURRENCY" | "ASK_PROFILE";
  userName?: string;
  companyName?: string;
  currency?: string;
  profile?: string;
  companyId?: string;
}

const activeStates = new Map<number | string, UserConversationState>();
const lastMessageTime = new Map<number | string, number>();
const isProcessingChat = new Set<number | string>();

function stripEmojis(text: string): string {
  return (text || "")
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "")
    .replace(/[\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, "")
    .replace(/[\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu, "")
    .trim();
}

function cleanSlug(input: string, prefix = "", maxLen = 20): string {
  const normalized = (input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, maxLen);
  const slug = normalized || Math.random().toString(36).slice(2, 8);
  return prefix ? `${prefix}_${slug}` : slug;
}

const FORBIDDEN_NAMES = new Set([
  "hola",
  "hol",
  "buenas",
  "buen dia",
  "buenos dias",
  "buenas tardes",
  "buenas noches",
  "saludos",
  "que tal",
  "quetal",
  "hello",
  "hi",
  "hey",
  "start",
  "inicio",
  "help",
  "ayuda",
  "ok",
  "oka",
  "listo",
  "si",
  "no",
  "admin",
  "test",
  "prueba",
  "operador",
  "usuario",
  "nombre",
  "none",
  "null",
  "undefined",
  "como estas",
  "como esta",
  "que hubo",
  "qhubo",
  "bienvenido",
  "bot",
  "mint",
  "tu",
  "yo",
  "nada",
  "nadie",
  "alguien",
  "algo",
  "cualquiera",
  "abc",
  "xyz",
  "asdf",
  "asd",
]);

const FORBIDDEN_COMPANIES = new Set([
  "hola",
  "hol",
  "buenas",
  "buen dia",
  "buenos dias",
  "empresa",
  "mi empresa",
  "compania",
  "negocio",
  "test",
  "prueba",
  "ok",
  "si",
  "no",
  "admin",
  "none",
  "null",
  "undefined",
  "nada",
  "nombre",
  "tienda",
  "local",
  "comercio",
  "marca",
  "abc",
  "xyz",
  "asdf",
]);

export function extractNameCandidate(raw: string): string {
  let text = stripEmojis(raw).trim();
  // Quitar saludos iniciales comunes seguidos de coma o espacio
  text = text.replace(/^(?:hola|buenas|buen dia|buenos dias|buenas tardes|buenas noches|saludos|hello|hi|hey)[\s,]+/i, "").trim();
  // Quitar frases de presentacion tipicas
  const match = text.match(/^(?:me llamo|mi nombre es|yo me llamo|yo soy|soy)\s+(.+)$/i);
  if (match && match[1]) {
    text = match[1].trim();
  }
  return text;
}

export function validateTelegramOperatorName(candidate: string): { valid: boolean; error?: string; cleanName?: string; normalized?: string } {
  const clean = extractNameCandidate(candidate);
  const normalized = clean
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  if (!clean || clean.length < 3) {
    return { valid: false, error: "El nombre debe tener al menos 3 caracteres alfabeticos.", normalized };
  }
  if (clean.length > 35) {
    return { valid: false, error: "El nombre no debe exceder 35 caracteres.", normalized };
  }
  if (FORBIDDEN_NAMES.has(normalized)) {
    return {
      valid: false,
      error: `'${clean}' es un saludo o termino generico, no un nombre de persona.`,
      normalized,
    };
  }
  if (/\d/.test(clean)) {
    return { valid: false, error: "El nombre de operador no debe incluir numeros.", normalized };
  }
  if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ ]+$/.test(clean)) {
    return { valid: false, error: "No se permiten simbolos especiales (@, #, $, <, >, etc.).", normalized };
  }
  if (!/[aeiouáéíóúü]/i.test(clean)) {
    return { valid: false, error: "El texto no parece ser un nombre de persona valido.", normalized };
  }
  return { valid: true, cleanName: clean, normalized };
}

export const validateName = validateTelegramOperatorName;

export function validateTelegramCompanyName(candidate: string): { valid: boolean; error?: string; cleanName?: string } {
  let clean = stripEmojis(candidate).trim();
  clean = clean.replace(/^(?:mi empresa es|la empresa se llama|se llama|mi negocio es|mi marca es)\s+/i, "").trim();
  const normalized = clean
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  if (!clean || clean.length < 3) {
    return { valid: false, error: "El nombre de empresa debe tener al menos 3 caracteres." };
  }
  if (clean.length > 50) {
    return { valid: false, error: "El nombre no debe exceder 50 caracteres." };
  }
  if (FORBIDDEN_COMPANIES.has(normalized)) {
    return {
      valid: false,
      error: `'${clean}' es un termino generico, no una empresa o marca valida.`,
    };
  }
  if (/[<>;{}[\]\\`~$%^*+=?|!_]/.test(clean)) {
    return { valid: false, error: "No se permiten caracteres especiales peligrosos (<, >, ;, {, }, $, etc.)." };
  }
  return { valid: true, cleanName: clean };
}

export const validateCompanyName = validateTelegramCompanyName;

/**
 * Servicio de escucha en tiempo real para el Bot de Telegram (Long-polling).
 * Incluye:
 * - Purga inicial de backlog para evitar respuestas en rafaga a mensajes historicos.
 * - Anti-spam / rate-limiting por chat (bloquea ráfagas repetidas).
 * - Cero emojis en salidas del sistema (tono profesional de back-office).
 * - Filtro de mensajes no alfanuméricos y control de longitud.
 */
export async function startTelegramListener(options: TelegramListenerOptions = {}): Promise<void> {
  let token = options.botToken || process.env.TELEGRAM_BOT_TOKEN;
  let defaultCompanyId = options.companyId || "comp_default";

  // Si no se proporcionó token explícito, buscarlo en los canales registrados en PostgreSQL
  if (!token) {
    try {
      const channels = await db
        .select()
        .from(notificationChannels)
        .where(eq(notificationChannels.type, "telegram"));
      for (const ch of channels) {
        const cfg = (ch.config as any) || {};
        if (cfg.botToken) {
          token = cfg.botToken;
          defaultCompanyId = ch.companyId || defaultCompanyId;
          break;
        }
      }
    } catch {}
  }

  if (!token) {
    throw new Error(
      "No se encontro ningun Bot Token de Telegram configurado en PostgreSQL ni en TELEGRAM_BOT_TOKEN.",
    );
  }

  // Obtener información del bot vía getMe
  let botUsername = "mint_bot";
  try {
    const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    if (meRes.ok) {
      const meData = (await meRes.json()) as any;
      if (meData.ok && meData.result?.username) {
        botUsername = meData.result.username;
      }
    }
  } catch {}

  console.log(`\n======================================================`);
  console.log(`  MINT TELEGRAM ASISTENTE AUTONOMO EN VIVO`);
  console.log(`  Bot: @${botUsername}`);
  console.log(`  Politica: Cero Emojis | Anti-Spam Rate-Limiting Activo`);
  console.log(`  (Presiona Ctrl + C en esta terminal para detener el bot)`);
  console.log(`======================================================\n`);

  let offset = 0;

  // 1. Purga inicial obligatoria de backlog histórico:
  // Si el usuario envió mensajes mientras el bot estaba apagado, los consumimos
  // de un solo golpe para no responderles en ráfaga.
  try {
    const purgeRes = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=-1`);
    if (purgeRes.ok) {
      const purgeData = (await purgeRes.json()) as any;
      if (purgeData.ok && Array.isArray(purgeData.result) && purgeData.result.length > 0) {
        offset = purgeData.result[purgeData.result.length - 1].update_id + 1;
        await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&limit=1`);
        console.log(`[TELEGRAM] Historial previo purgado (${offset} mensajes ignorados). Listo para nuevos mensajes.`);
      }
    }
  } catch {}

  async function sendTelegramMessage(chatId: number | string, text: string, replyMarkup?: any) {
    try {
      const cleanText = stripEmojis(text);
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: cleanText,
          parse_mode: "Markdown",
          ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
        }),
      });
    } catch (e: any) {
      console.error(`[TELEGRAM ERROR] No se pudo enviar mensaje a ${chatId}:`, e.message);
    }
  }

  while (!options.signal?.aborted) {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=20`,
      );
      if (!res.ok) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }

      const data = (await res.json()) as any;
      if (!data.ok || !Array.isArray(data.result)) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }

      for (const update of data.result) {
        offset = update.update_id + 1;

        // -------------------------------------------------------------
        // 1. Manejo de botones interactivos (Inline Keyboard Callbacks)
        // -------------------------------------------------------------
        if (update.callback_query) {
          const cb = update.callback_query;
          const cbData = String(cb.data || "");
          const chatId = cb.message?.chat?.id;

          try {
            await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ callback_query_id: cb.id, text: "Procesando seleccion..." }),
            });

            const state = activeStates.get(chatId) || { step: "READY" };

            // 1.1 Configuración de Divisa en Telegram
            if (cbData.startsWith("mint:set_currency:")) {
              const selectedCurrency = cbData.split(":")[2] || "USD";
              state.currency = selectedCurrency;
              state.step = "ASK_PROFILE";
              activeStates.set(chatId, state);

              const profileMarkup = {
                inline_keyboard: [
                  [
                    { text: "Solo Tienda (Catalogo y Ventas)", callback_data: "mint:set_profile:tienda" },
                  ],
                  [
                    { text: "Tienda + Proveedores (Compras Aprobadas)", callback_data: "mint:set_profile:tienda_proveedores" },
                  ],
                  [
                    { text: "Logistica Completa (Flota + Almacenes)", callback_data: "mint:set_profile:logistica_completa" },
                  ],
                ],
              };

              await sendTelegramMessage(
                chatId,
                `[3/4] Divisa registrada: *${selectedCurrency}*.\n\n` +
                  `[4/4] Modelo de negocio:\n` +
                  `Selecciona la modalidad operativa de tu negocio:`,
                profileMarkup,
              );
              continue;
            }

            // 1.2 Configuración de Perfil de Negocio en Telegram (Finalización)
            if (cbData.startsWith("mint:set_profile:")) {
              const selectedProfile = cbData.split(":")[2] as any;
              state.profile = selectedProfile;

              const compName = state.companyName || "Mi Empresa";
              const operName = state.userName || "Operador";
              const curr = state.currency || "USD";
              const companyId = cleanSlug(compName, "comp", 20);
              const userId = cleanSlug(operName, "usr", 20);
              state.companyId = companyId;

              // Persistir en PostgreSQL
              await db
                .insert(companies)
                .values({
                  id: companyId,
                  name: compName,
                  currency: curr,
                  country: "Colombia",
                })
                .onConflictDoUpdate({
                  target: [companies.id],
                  set: { name: compName, currency: curr },
                });

              await db
                .insert(users)
                .values({
                  id: userId,
                  companyId,
                  name: operName,
                  email: `${userId}@empresa.com`,
                  role: "owner",
                  setupCompleted: true,
                })
                .onConflictDoNothing();

              await db
                .insert(warehouses)
                .values({
                  id: `alm_central_${companyId}`,
                  companyId,
                  name: `Bodega Central ${compName}`,
                  location: "Sede Principal",
                })
                .onConflictDoNothing();

              await db
                .insert(businessConfig)
                .values({
                  companyId,
                  key: "business_profile",
                  value: selectedProfile,
                  currency: curr,
                  updatedAt: new Date(),
                })
                .onConflictDoUpdate({
                  target: [businessConfig.companyId, businessConfig.key],
                  set: { value: selectedProfile, updatedAt: new Date() },
                });

              await db
                .insert(notificationChannels)
                .values({
                  id: `notif_tg_${companyId}_${Date.now()}`,
                  companyId,
                  type: "telegram",
                  name: `Telegram (@${chatId})`,
                  config: { botToken: token, chatId: String(chatId) },
                  isActive: true,
                })
                .onConflictDoNothing();

              state.step = "READY";
              activeStates.set(chatId, state);

              const summaryText =
                `[OK] CONFIGURACION COMPLETADA EXITOSAMENTE\n\n` +
                `Empresa: *${compName}* (\`${companyId}\`)\n` +
                `Operador: *${operName}*\n` +
                `Divisa: *${curr}*\n` +
                `Modelo: *${selectedProfile}*\n\n` +
                `Tu back-office autonomo MINT ya esta conectado y operando.\n\n` +
                `Consultas disponibles:\n` +
                `• "/stock" o "¿Como esta el inventario?"\n` +
                `• "/inbox" o "¿Hay compras pendientes?"\n` +
                `• "Reporte operativo de hoy"`;

              await sendTelegramMessage(chatId, summaryText);
              continue;
            }

            // 1.3 Botones HITL de Aprobación de Compras (mint:approve / mint:reject)
            if (cbData.startsWith("mint:approve:") || cbData.startsWith("mint:reject:")) {
              const parts = cbData.split(":");
              const signedToken = parts.slice(2).join(":");
              const approverName = cb.from?.first_name || cb.from?.username || "Operador Telegram";
              const result = await processRemoteApproval({
                signedToken,
                approverName,
                channel: "telegram",
              });

              const replyText =
                result.action === "approved"
                  ? `[OK] Decision APROBADA por ${approverName}\n\n${result.auditMessage}`
                  : `[RECHAZADA] Decision archivada por ${approverName}\n\n${result.auditMessage}`;

              await sendTelegramMessage(chatId, replyText);
            }
          } catch (err: any) {
            await sendTelegramMessage(chatId, `[ERROR] No se pudo procesar la accion: ${err.message}`);
          }
          continue;
        }

        // -------------------------------------------------------------
        // 2. Manejo de mensajes de texto en lenguaje natural
        // -------------------------------------------------------------
        if (update.message?.text) {
          const msg = update.message;
          const chatId = msg.chat.id;
          const rawText = msg.text.trim();
          const senderName = msg.from?.first_name || "Operador";

          // 2.1 Bloqueo Anti-Spam / Rate-Limiting por usuario (mínimo 1.2 segundos entre mensajes)
          const now = Date.now();
          const lastTime = lastMessageTime.get(chatId) || 0;
          if (now - lastTime < 1200) {
            console.log(`[TELEGRAM BLOQUEO] Mensaje en rafaga ignorado de ${senderName} (${chatId})`);
            continue;
          }
          if (isProcessingChat.has(chatId)) {
            console.log(`[TELEGRAM BLOQUEO] Consulta en proceso para ${chatId}, ignorando duplicado.`);
            continue;
          }
          lastMessageTime.set(chatId, now);

          // 2.2 Filtro de contenido y sanitización:
          // Rechazar mensajes gigantes (> 500 chars)
          if (rawText.length > 500) {
            await sendTelegramMessage(chatId, `[ERROR] El mensaje es demasiado largo (maximo 500 caracteres).`);
            continue;
          }

          // Rechazar mensajes que solo son emojis o símbolos sin texto
          const textWithoutEmojis = stripEmojis(rawText);
          const hasLettersOrNumbers = /[a-zA-Z0-9]/.test(textWithoutEmojis);
          if (!hasLettersOrNumbers) {
            console.log(`[TELEGRAM FILTRADO] Mensaje sin contenido alfanumerico de ${chatId}`);
            continue;
          }

          console.log(`[TELEGRAM IN] ${senderName} (${chatId}): "${textWithoutEmojis}"`);
          isProcessingChat.add(chatId);

          try {
            let state = activeStates.get(chatId);

            const lowerText = textWithoutEmojis.toLowerCase().trim();

            // Comandos globales de reinicio del asistente (/reset, /reiniciar, /start, /configurar, /setup, etc.)
            const isResetCmd =
              lowerText === "/reset" ||
              lowerText === "/reiniciar" ||
              lowerText === "/start" ||
              lowerText === "/configurar" ||
              lowerText === "/setup" ||
              lowerText === "reiniciar" ||
              lowerText === "reset" ||
              !state;

            if (!state || isResetCmd) {
              state = { step: "ASK_NAME" };
              activeStates.set(chatId, state);

              const welcome =
                `[MINT] ASISTENTE DE CONFIGURACION INICIAL\n\n` +
                `Hola ${senderName}. Vamos a configurar tu empresa de forma ordenada directamente por este chat.\n\n` +
                `[1/4] Identidad del Operador:\n` +
                `Por favor escribe tu nombre real (ej: Andres Perez o Carlos Mendez):`;

              await sendTelegramMessage(chatId, welcome);
              continue;
            }

            // Comandos de corrección rápida si el usuario se equivocó o quiere cambiar su nombre
            const isCorrectionCmd =
              lowerText === "corregir" ||
              lowerText === "cambiar nombre" ||
              lowerText === "atras" ||
              lowerText === "volver" ||
              lowerText.startsWith("no me llamo") ||
              lowerText.startsWith("mi nombre no es");

            if (isCorrectionCmd && state.step !== "READY") {
              state.step = "ASK_NAME";
              activeStates.set(chatId, state);

              await sendTelegramMessage(
                chatId,
                `[CORRECCION] Corrijamos tu nombre de operador.\n\n` +
                  `[1/4] Identidad del Operador:\n` +
                  `Por favor escribe tu nombre real (ej: Andres Perez o Carlos Mendez):`,
              );
              continue;
            }

            // Si está en ASK_COMPANY pero el usuario mandó una frase de presentación (ej: "me llamo Carlos", "soy Andres")
            if (
              state.step === "ASK_COMPANY" &&
              (lowerText.startsWith("me llamo ") ||
                lowerText.startsWith("mi nombre es ") ||
                lowerText.startsWith("yo me llamo ") ||
                lowerText.startsWith("soy ") ||
                lowerText.startsWith("yo soy "))
            ) {
              state.step = "ASK_NAME";
            }

            // Paso 1: Nombre de operador
            if (state.step === "ASK_NAME") {
              const check = validateName(textWithoutEmojis);
              if (!check.valid || !check.cleanName) {
                // Si el mensaje es un saludo, pregunta o texto conversacional, consultar a Grok para responder amablemente y pedir su nombre
                if (
                  (check.normalized && FORBIDDEN_NAMES.has(check.normalized)) ||
                  textWithoutEmojis.includes("?") ||
                  /^(que|quien|como|por que|hola|buenas|ayuda|para que|explicame|saludos)/i.test(textWithoutEmojis)
                ) {
                  try {
                    console.log(`[GROK ONBOARDING] Consultando a Grok (xAI) para responder a: "${textWithoutEmojis}"`);
                    const grokRes = await grokClient.chatCompletion({
                      messages: [
                        {
                          role: "system",
                          content:
                            "Eres MINT, el agente autonomo inteligente de back-office empresarial para control de inventario, compras, logistica y finanzas. Estas en Telegram iniciando el proceso de configuracion con el usuario. El usuario te ha enviado un saludo o pregunta en lugar de su nombre. Responde en 1 o 2 oraciones breves, profesionales y amables en espanol, respondiendo a su mensaje, y pidele amablemente su nombre real para poder comenzar a configurar su cuenta. CERO emojis.",
                        },
                        {
                          role: "user",
                          content: textWithoutEmojis,
                        },
                      ],
                      maxTokens: 150,
                    });
                    if (grokRes.content) {
                      await sendTelegramMessage(chatId, stripEmojis(grokRes.content.trim()));
                      continue;
                    }
                  } catch (grokErr: any) {
                    console.log(`[GROK ONBOARDING ERROR]`, grokErr.message);
                  }
                }

                await sendTelegramMessage(
                  chatId,
                  `[ERROR] Nombre invalido: ${check.error}\nPor favor ingresa tu nombre (ej: Andres Perez o Carlos Mendez):`,
                );
                continue;
              }
              const resolvedName = check.cleanName;
              state.userName = resolvedName;
              state.step = "ASK_COMPANY";
              activeStates.set(chatId, state);

              await sendTelegramMessage(
                chatId,
                `Registrado: *${resolvedName}*.\n\n` +
                  `[2/4] Empresa o Marca:\n` +
                  `Ingresa el nombre de tu empresa o negocio (ej: Distribuidora El Roble):`,
              );
              continue;
            }

            // Paso 2: Nombre de empresa
            if (state.step === "ASK_COMPANY") {
              const check = validateCompanyName(textWithoutEmojis);
              if (!check.valid || !check.cleanName) {
                await sendTelegramMessage(
                  chatId,
                  `[ERROR] Nombre de empresa invalido: ${check.error}\nPor favor ingresa el nombre de tu empresa (ej: Distribuidora El Roble):`,
                );
                continue;
              }
              const resolvedCompany = check.cleanName;
              state.companyName = resolvedCompany;
              state.step = "ASK_CURRENCY";
              activeStates.set(chatId, state);

              const currencyMarkup = {
                inline_keyboard: [
                  [
                    { text: "USD (Dolares)", callback_data: "mint:set_currency:USD" },
                    { text: "COP (Pesos Col)", callback_data: "mint:set_currency:COP" },
                  ],
                  [
                    { text: "EUR (Euros)", callback_data: "mint:set_currency:EUR" },
                    { text: "MXN (Pesos Mex)", callback_data: "mint:set_currency:MXN" },
                  ],
                  [
                    { text: "Multidivisa Internacional", callback_data: "mint:set_currency:USD" },
                  ],
                ],
              };

              await sendTelegramMessage(
                chatId,
                `Empresa registrada: *${resolvedCompany}*.\n\n` +
                  `[3/4] Divisa de Consolidacion:\n` +
                  `Selecciona la divisa base para tus operaciones:`,
                currencyMarkup,
              );
              continue;
            }

            // Si el estado es READY: Consultas en lenguaje natural con MINT
            const currentCompanyId = state.companyId || defaultCompanyId;

            // Indicar al usuario en Telegram que MINT está escribiendo/pensando
            await fetch(`https://api.telegram.org/bot${token}/sendChatAction`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: chatId, action: "typing" }),
            }).catch(() => {});

            const intentRes = await resolveNaturalLanguageIntent(currentCompanyId, textWithoutEmojis);

            // 1. Si es una consulta operativa rápida determinista (ej: /stock, inventario, reportes)
            if (intentRes.handledDeterministically && intentRes.response) {
              let responseText = stripEmojis(intentRes.response);
              if (intentRes.suggestedAction) {
                responseText += `\n\n[NOTA] Accion recomendada: ${stripEmojis(intentRes.suggestedAction)}`;
              }
              console.log(`[TELEGRAM LOCAL] Intencion Determinista: ${intentRes.intent}`);
              await sendTelegramMessage(chatId, responseText);
              continue;
            }

            // 2. Si es una consulta abierta, estratégica o conversacional: ACTIVAR MOTOR COGNITIVO GROK (xAI)
            console.log(`[GROK TELEGRAM] Activando razonamiento con Grok (xAI) para: "${textWithoutEmojis}"`);
            const caseId = `chat_tg_${randomUUID().slice(0, 8)}`;

            try {
              await db.insert(cases).values({
                id: caseId,
                companyId: currentCompanyId,
                title: `Telegram: ${textWithoutEmojis.slice(0, 50)}`,
                description: textWithoutEmojis,
                status: "en_proceso",
                priority: "media",
              });

              const agentReport = await runAgentLoop(caseId, {
                maxSteps: 4,
              });

              console.log(
                `[GROK TELEGRAM OUT] Tokens: ${agentReport.totalTokens} | Costo: $${agentReport.totalCost} | Estado: ${agentReport.status}`,
              );

              let aiReply = stripEmojis(agentReport.summary || agentReport.reason || "Operación procesada con éxito.");
              await sendTelegramMessage(chatId, aiReply);
            } catch (err: any) {
              console.error(`[GROK TELEGRAM ERROR]`, err);
              // Fallback de contingencia si la conexión a Grok falla
              const fallbackMsg =
                `[MINT] Hola ${state.userName || "operador"}. Sistema activo para ${state.companyName || "tu empresa"}.\n\n` +
                `Comandos disponibles:\n` +
                `- /stock : Niveles y alertas de inventario\n` +
                `- /inbox : Aprobaciones y propuestas pendientes\n` +
                `- /reportes : Resumen operativo del dia\n` +
                `- /fleet : Estado de flota y envios en curso\n` +
                `- /configurar : Reiniciar asistente de configuracion`;
              await sendTelegramMessage(chatId, fallbackMsg);
            }
          } finally {
            isProcessingChat.delete(chatId);
          }
        }
      }
    } catch (err: any) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}
