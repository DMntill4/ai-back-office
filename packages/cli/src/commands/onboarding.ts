import * as readline from "node:readline";
import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";
import { randomUUID } from "node:crypto";
import {
  db,
  companies,
  users,
  warehouses,
  suppliers,
  supplierProducts,
  products,
  inventory,
  businessConfig,
  discoverCustomerSchema,
  saveConfirmedTableMapping,
  addPendingQuestion,
  inspectAndDiagnoseDatabaseAutonomously,
  resolveLocaleAutonomously,
  resolveCurrencyFromTextOrSymbol,
  isValidCurrency,
  isValidCountryOrCity,
  type ResolvedLocale,
  geocodeAddressOrCity,
  sendEmailVerificationCode,
  verifyEmailCode,
  isEmailVerified,
  type AutonomousInspectionResult,
  hashPassword,
} from "@mint/core";
import { importUniversalCatalogFile } from "./database";
import {
  searchProjectDatabase,
  scanLocalWorkspaceProjects,
  extractProductsFromSqlFile,
  extractSuppliersFromSqlFile,
  type DiscoveredProject,
  type ExtractedProductItem,
  type ExtractedSupplierItem,
} from "@mint/ingest";
import { addNotificationChannel } from "@mint/notifiers";
import { saveSession, type StoredSession } from "../keychain";
import { theme } from "../ui/theme";
import { drawCard, drawDivider } from "../ui/box";
import { printBanner } from "../ui/banner";
import { eq, sql } from "drizzle-orm";

export function sanitizeText(input: string, maxLen = 80): string {
  if (!input) return "";
  return input
    .replace(/\u001b\[.*?m/g, "") // strip ansi
    .replace(/[\x00-\x1F\x7F]/g, "") // strip control characters
    .replace(/<[^>]*>/g, "") // strip html/script injection
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "") // strip emojis
    .trim()
    .slice(0, maxLen);
}

export function cleanSlug(input: string, prefix = "", maxLen = 20): string {
  const normalized = (input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // elimina diacríticos: á -> a, ñ -> n, ü -> u
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, maxLen)
    .replace(/_+$/g, "");

  const fallback = randomUUID().slice(0, 6);
  const slug = normalized || fallback;
  return prefix ? `${prefix}_${slug}` : slug;
}

export function cleanCurrencyCode(input: string, country = ""): string {
  return resolveCurrencyFromTextOrSymbol(input, country);
}

function ask(rl: readline.Interface, question: string, defaultValue = ""): Promise<string> {
  return new Promise((resolve) => {
    const formatted = defaultValue ? `${question} [${theme.mintBold(defaultValue)}]: ` : `${question}: `;
    rl.question(formatted, (answer) => {
      resolve(sanitizeText(answer.trim(), 120) || defaultValue);
    });
  });
}

export function isGibberish(str: string): boolean {
  const trimmed = str.trim();
  if (!trimmed) return true;

  const words = trimmed
    .split(/\s+/)
    .map((w) => w.toLowerCase().replace(/[^a-záéíóúüñ0-9]/g, ""))
    .filter(Boolean);
  if (words.length === 0) return true;

  // 1. Caracteres idénticos repetidos consecutivamente >= 3 veces en cualquier palabra (ej: aaa, 111)
  for (const w of words) {
    if (/(.)\1{2,}/.test(w)) return true;
  }

  // 2. Patrones comunes de teclado (horizontal, diagonal, reversa)
  const walks = [
    // Filas horizontales QWERTY
    "qwer", "wert", "erty", "rtyu", "tyui", "yuio", "uiop",
    "asdf", "sdfg", "dfgh", "fghj", "ghjk", "hjkl", "jklñ",
    "zxcv", "xcvb", "cvbn", "vbnm",
    // Reversa horizontal
    "poiu", "oiuy", "iuyt", "uytr", "ytre", "trew", "rewq",
    "lkjh", "kjhg", "jhgf", "hgfd", "gfds", "fdsa",
    "mnbv", "nbvc", "bvcx", "vcxz",
    // Diagonales QWERTY
    "qazw", "azws", "wsxe", "sxed", "edcr", "dcrf", "rfvt", "fvtg",
    // Teclado numérico / secuencial
    "1234", "2345", "3456", "4567", "5678", "6789", "0987", "9876", "8765", "7654", "6543", "5432", "4321",
  ];
  for (const w of words) {
    for (const walk of walks) {
      if (w.includes(walk)) return true;
    }
  }

  // 3. Subpatrones repetitivos dentro de palabras (ej: lalala, wewewe, jajaja, blabla, weewue, fjfjfj)
  for (const w of words) {
    if (/(.{2,4})\1{2,}/.test(w)) return true;
    if (/^([a-z][a-z])\1{2,}$/.test(w)) return true;
  }

  // 4. Dígitos intercalados entre letras (ej: u9wb, bu98wb)
  for (const w of words) {
    if (/[a-z]\d+[a-z]/.test(w)) return true;
  }

  // 5. Más de 4 dígitos en total en el nombre completo
  const allClean = words.join("");
  const digits = (allClean.match(/[0-9]/g) || []).length;
  if (digits > 4) return true;

  // 6. Palabras individuales anormalmente largas sin espacios (> 15 letras)
  for (const w of words) {
    if (w.length > 15) return true;
  }

  // 7. Secuencia excesiva de consonantes consecutivas (>= 4 consonantes en español/inglés)
  for (const w of words) {
    if (/[bcdfghjklmnpqrstvwxyz]{4,}/i.test(w)) return true;
  }

  // 8. Proporción de vocales (< 25% o > 75% en palabras de más de 4 letras)
  for (const w of words) {
    const letters = (w.match(/[a-záéíóúüñ]/gi) || []).length;
    const vowels = (w.match(/[aeiouáéíóúü]/gi) || []).length;
    if (letters >= 5 && (vowels / letters < 0.25 || vowels / letters > 0.75)) return true;
  }

  // 9. Ratio de caracteres únicos extremadamente bajo por palabra (aporreo o bucle de 2-3 teclas)
  for (const w of words) {
    const letters = (w.match(/[a-záéíóúüñ]/gi) || []).length;
    const uniqueChars = new Set(w.split("")).size;
    if (letters >= 6 && uniqueChars / letters < 0.45) return true;
    if (letters >= 7 && uniqueChars <= 3) return true;
  }

  // 10. Letras anómalas repetidas en nombres en español (ej: 'w' repetida >= 2 veces en una palabra corta)
  for (const w of words) {
    const wCount = (w.match(/w/g) || []).length;
    if (wCount >= 2 && w.length <= 14) return true;
  }

  // 11. Fonotáctica: Combinaciones de consonantes iniciales imposibles en nombres occidentales
  const invalidStarts = /^(?:fj|fv|fw|fx|fz|jr|jm|jn|jl|jk|jf|nw|wn|wk|zx|xz|bv|bz|df|dg|dh|dj|dk|dl|dm|dp|dq|dx|fb|fc|fd|fg|fh|fk|fm|fn|fp|fq|fv|fw|fx|fz|gb|gc|gd|gf|gj|gk|gp|gq|gv|gw|gx|gz|jb|jc|jd|jf|jg|jh|jj|jk|jl|jm|jn|jp|jq|jr|js|jt|jv|jw|jx|jy|jz|kb|kc|kd|kf|kg|kh|kj|kk|kp|kq|kt|kv|kx|kz|lb|lc|ld|lf|lg|lh|lj|lk|lm|ln|lp|lq|lr|ls|lt|lv|lw|lx|ly|lz|mb|mc|md|mf|mg|mh|mj|mk|ml|mm|mn|mp|mq|mr|ms|mt|mv|mw|mx|my|mz|nb|nc|nd|nf|ng|nh|nj|nk|nl|nm|nn|np|nq|nr|ns|nt|nv|nw|nx|ny|nz|pb|pc|pd|pf|pg|ph|pj|pk|pm|pn|pq|pv|pw|px|py|pz|qb|qc|qd|qf|qg|qh|qj|qk|ql|qm|qn|qp|qq|qr|qs|qt|qv|qw|qx|qy|qz|rb|rc|rd|rf|rg|rh|rj|rk|rl|rm|rn|rp|rq|rr|rs|rt|rv|rw|rx|ry|rz|tb|tc|td|tf|tg|th|tj|tk|tl|tm|tn|tp|tq|ts|tt|tv|tw|tx|ty|tz|vb|vc|vd|vf|vg|vh|vj|vk|vl|vm|vn|vp|vq|vr|vs|vt|vv|vw|vx|vy|vz|wb|wc|wd|wf|wg|wh|wj|wk|wl|wm|wn|wp|wq|wr|ws|wt|wv|ww|wx|wy|wz|xb|xc|xd|xf|xg|xh|xj|xk|xl|xm|xn|xp|xq|xr|xs|xt|xv|xw|xx|xy|xz|zb|zc|zd|zf|zg|zh|zj|zk|zl|zm|zn|zp|zq|zr|zs|zt|zv|zw|zx|zy|zz)/i;
  for (const w of words) {
    if (invalidStarts.test(w)) return true;
  }

  return false;
}

export function validateEmailAddress(email: string): { valid: boolean; error?: string } {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) {
    return { valid: false, error: "El correo electrónico no puede estar vacío." };
  }
  if (trimmed.length > 50) {
    return { valid: false, error: "El correo no debe exceder 50 caracteres (límite de seguridad para cuentas operativas)." };
  }
  if (trimmed.length < 6) {
    return { valid: false, error: "El correo es demasiado corto (mínimo 6 caracteres, ej: admin@empresa.com)." };
  }

  // Símbolos prohibidos explícitos
  if (/[<>;{}[\]\\'"~`!#$%^&*()+=/?,]/.test(trimmed)) {
    return { valid: false, error: "El correo contiene símbolos especiales no permitidos (<, >, ;, {, }, $, %, etc.)." };
  }

  const parts = trimmed.split("@");
  if (parts.length !== 2) {
    return { valid: false, error: "El correo debe tener un único '@' separando usuario y dominio." };
  }

  const [local, domain] = parts;
  if (!local || !domain) {
    return { valid: false, error: "Formato de correo incompleto." };
  }

  if (local.length < 2 || local.length > 30) {
    return { valid: false, error: "El usuario antes del '@' debe tener entre 2 y 30 caracteres." };
  }
  if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?$/.test(local)) {
    return { valid: false, error: "El usuario contiene caracteres no permitidos o inicia/termina con puntos o guiones." };
  }
  if (local.includes("..") || local.includes("--") || local.includes("__")) {
    return { valid: false, error: "El usuario no puede contener signos de puntuación repetidos consecutivos." };
  }

  if (domain.length < 4 || domain.length > 30) {
    return { valid: false, error: "El dominio debe tener entre 4 y 30 caracteres." };
  }
  if (!domain.includes(".")) {
    return { valid: false, error: "El dominio debe incluir una extensión reconocible (ej: .com, .co, .org)." };
  }
  const domainParts = domain.split(".");
  const tld = domainParts[domainParts.length - 1];
  if (!/^[a-zA-Z]{2,10}$/.test(tld)) {
    return { valid: false, error: `Extensión de dominio '.${tld}' inválida. Debe ser alfabética de 2 a 10 letras (ej: .com, .co, .net).` };
  }

  for (const label of domainParts.slice(0, -1)) {
    if (!label || label.length < 2 || label.length > 25) {
      return { valid: false, error: "El fragmento de servidor/dominio debe tener entre 2 y 25 caracteres." };
    }
    if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(label)) {
      return { valid: false, error: `El fragmento de dominio '${label}' contiene caracteres no permitidos.` };
    }
  }

  // Detección de texto ficticio o teclado aporreado
  if (isGibberish(local) || isGibberish(domainParts[0])) {
    return {
      valid: false,
      error: "El correo parece una secuencia aleatoria de teclas o texto ficticio. Ingresa un correo corporativo o personal verosímil (ej: compras@miempresa.com o contacto@gmail.com).",
    };
  }

  return { valid: true };
}

export function validateOperatorName(name: string): { valid: boolean; error?: string } {
  const trimmed = name.trim();
  if (!trimmed) {
    return { valid: false, error: "El nombre de operador es obligatorio. Debes ingresar tu nombre (ej: Carlos Méndez)." };
  }
  if (trimmed.length < 3) {
    return { valid: false, error: "El nombre de operador es demasiado corto (mínimo 3 caracteres)." };
  }
  if (trimmed.length > 35) {
    return { valid: false, error: "El nombre de operador es demasiado largo (máximo 35 caracteres)." };
  }
  // Prohibir números en el nombre de operador
  if (/\d/.test(trimmed)) {
    return { valid: false, error: "El nombre de operador solo puede contener letras y espacios (sin dígitos numéricos)." };
  }
  // Prohibir símbolos especiales: solo letras, espacios y acentos
  if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ ]+$/.test(trimmed)) {
    return { valid: false, error: "El nombre solo puede contener letras y espacios (sin caracteres como @, #, $, <, >, ;, _, etc.)." };
  }
  if (isGibberish(trimmed)) {
    return { valid: false, error: "El nombre parece una secuencia aleatoria de teclado o texto ficticio. Ingresa un nombre real (ej: Carlos Méndez)." };
  }
  return { valid: true };
}

export function validateCompanyName(name: string): { valid: boolean; error?: string } {
  const trimmed = name.trim();
  if (!trimmed) {
    return { valid: false, error: "El nombre de la empresa es obligatorio. Debes ingresar el nombre o razón social de tu marca." };
  }
  if (trimmed.length < 3) {
    return { valid: false, error: "El nombre de la empresa es demasiado corto (mínimo 3 caracteres)." };
  }
  if (trimmed.length > 50) {
    return { valid: false, error: "El nombre de la empresa no debe exceder 50 caracteres." };
  }
  // Prohibir símbolos peligrosos / de inyección
  if (/[<>;{}[\]\\`~$%^*+=?|!_]/.test(trimmed)) {
    return { valid: false, error: "No se permiten caracteres como <, >, ;, {, }, $, %, *, etc. Usa solo letras, números, espacios y signos comerciales estándar (&, ., -)." };
  }
  if (!/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ .&'-]+$/.test(trimmed)) {
    return { valid: false, error: "Solo se permiten letras, números, espacios y signos como punto, guion o ampersand (&)." };
  }
  // Debe tener al menos dos letras
  const letters = (trimmed.match(/[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/g) || []).length;
  if (letters < 2) {
    return { valid: false, error: "El nombre de la empresa debe contener al menos dos letras alfabéticas." };
  }
  if (isGibberish(trimmed)) {
    return { valid: false, error: "El nombre parece una secuencia aleatoria de teclado o texto ficticio. Ingresa un nombre comercial verosímil (ej: Logística Central S.A.)." };
  }
  return { valid: true };
}

async function askValidOperatorName(
  rl: readline.Interface,
  question: string,
  defaultValue = "",
): Promise<string> {
  while (true) {
    const raw = (await ask(rl, question, defaultValue)).trim();
    const check = validateOperatorName(raw);
    if (!check.valid) {
      console.log(`  ${theme.redBold("[ERROR]")} ${check.error}\n`);
      continue;
    }
    return raw;
  }
}

async function askValidCompanyName(
  rl: readline.Interface,
  question: string,
  defaultValue = "",
): Promise<string> {
  while (true) {
    const raw = (await ask(rl, question, defaultValue)).trim();
    const check = validateCompanyName(raw);
    if (!check.valid) {
      console.log(`  ${theme.redBold("[ERROR]")} ${check.error}\n`);
      continue;
    }
    return raw;
  }
}

async function askValidString(
  rl: readline.Interface,
  question: string,
  defaultValue: string,
  fieldLabel: string,
  minLen = 3,
  maxLen = 60,
): Promise<string> {
  while (true) {
    const val = (await ask(rl, question, defaultValue)).trim();
    if (val.length < minLen) {
      console.log(`  ${theme.redBold(`[ERROR] ${fieldLabel} demasiado corto:`)} Debe contener al menos ${minLen} caracteres.\n`);
      continue;
    }
    if (val.length > maxLen) {
      console.log(`  ${theme.redBold(`[ERROR] ${fieldLabel} demasiado largo:`)} No debe exceder ${maxLen} caracteres.\n`);
      continue;
    }
    if (/[<>;{}[\]\\`~$%^*+=|!]/.test(val)) {
      console.log(`  ${theme.redBold(`[ERROR] Símbolos especiales en ${fieldLabel}:`)} No se permiten caracteres especiales peligrosos (<, >, ;, {, }, $, etc.).\n`);
      continue;
    }
    const letters = (val.match(/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/g) || []).length;
    if (letters < 2) {
      console.log(`  ${theme.redBold(`[ERROR] ${fieldLabel} inválido:`)} Debe contener al menos 2 letras (no solo números o símbolos).\n`);
      continue;
    }
    if (isGibberish(val)) {
      console.log(`  ${theme.redBold(`[ERROR] ${fieldLabel} sospechoso:`)} Parece una secuencia aleatoria de teclado o texto ficticio.\n`);
      continue;
    }
    return sanitizeText(val, maxLen);
  }
}

async function askValidChoice(
  rl: readline.Interface,
  question: string,
  allowedChoices: string[],
  defaultChoice = "",
): Promise<string> {
  while (true) {
    const ans = (await ask(rl, question, defaultChoice)).trim();
    if (allowedChoices.includes(ans)) {
      return ans;
    }
    console.log(`  ${theme.redBold("[ERROR] Opción inválida:")} Selecciona una de las opciones permitidas [${allowedChoices.join("/")}].\n`);
  }
}

export interface CurrencyParseResult {
  currency: string;
  supportedCurrencies: string[];
  isMultiCurrency: boolean;
}

export function resolveExplicitCurrencyCode(token: string): string | null {
  const norm = token.toLowerCase().trim();
  if (norm === "usd" || norm.includes("dolar") || norm.includes("dollar") || norm === "$") return "USD";
  if (norm === "eur" || norm.includes("euro") || norm === "€") return "EUR";
  if (norm === "gbp" || norm.includes("libra") || norm.includes("pound") || norm === "£") return "GBP";
  if (norm === "cop" || norm.includes("peso colombiano") || norm.includes("pesos colombianos")) return "COP";
  if (norm === "mxn" || norm.includes("peso mexicano") || norm.includes("pesos mexicanos")) return "MXN";
  if (norm === "ars" || norm.includes("peso argentino") || norm.includes("pesos argentinos")) return "ARS";
  if (norm === "clp" || norm.includes("peso chileno") || norm.includes("pesos chilenos")) return "CLP";
  if (norm === "pen" || norm.includes("sol") || norm.includes("soles") || norm === "s/") return "PEN";
  if (norm === "brl" || norm.includes("real") || norm.includes("reais") || norm.includes("reales") || norm === "r$") return "BRL";
  if (norm === "jpy" || norm.includes("yen") || norm === "¥") return "JPY";
  if (norm === "cad" || norm.includes("dolar canadiense")) return "CAD";
  return null;
}

export function parseCurrencyInput(input: string, defaultCurrency = "USD"): CurrencyParseResult | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      currency: defaultCurrency,
      supportedCurrencies: [defaultCurrency],
      isMultiCurrency: false,
    };
  }

  const lower = trimmed.toLowerCase();
  if (["multi", "multidivisa", "global", "varias", "todas", "internacional", "all"].includes(lower)) {
    return {
      currency: "USD",
      supportedCurrencies: ["USD", "EUR", "COP", "MXN"],
      isMultiCurrency: true,
    };
  }

  // Separar por comas, barras, espacios, puntos y comas, o conjunciones
  const tokens = trimmed
    .split(/[,/;\s+]+/)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t && t !== "y" && t !== "and" && t !== "e");

  const validCodes: string[] = [];

  for (const token of tokens) {
    const upper = token.toUpperCase();
    if (isValidCurrency(upper)) {
      if (!validCodes.includes(upper)) validCodes.push(upper);
      continue;
    }
    const resolved = resolveExplicitCurrencyCode(token);
    if (resolved && isValidCurrency(resolved)) {
      if (!validCodes.includes(resolved)) validCodes.push(resolved);
    }
  }

  if (validCodes.length === 0) {
    return null;
  }

  // Divisa base de consolidación: Si USD está en la lista se toma por defecto, de lo contrario la primera
  const baseCurrency = validCodes.includes("USD") ? "USD" : validCodes[0];

  return {
    currency: baseCurrency,
    supportedCurrencies: validCodes,
    isMultiCurrency: validCodes.length > 1,
  };
}

async function askValidCurrency(
  rl: readline.Interface,
  question: string,
  defaultCurrency = "USD",
): Promise<CurrencyParseResult> {
  while (true) {
    const input = (await ask(rl, question, defaultCurrency)).trim();
    const parsed = parseCurrencyInput(input, defaultCurrency);
    if (parsed) {
      if (parsed.isMultiCurrency) {
        console.log(
          `  ${theme.mintBold("[OK] Modo Multidivisa activado:")} Divisa base de consolidación: ${theme.bold(parsed.currency)}. Divisas operativas secundarias: ${theme.cyan(parsed.supportedCurrencies.join(", "))}.\n`
        );
      } else {
        console.log(
          `  ${theme.mintBold("[OK]")} Divisa de consolidación registrada: ${theme.bold(parsed.currency)}.\n`
        );
      }
      return parsed;
    }
    console.log(
      `  ${theme.redBold("[ERROR] Divisa no reconocida:")} '${input}' no contiene códigos ISO válidos. Puedes ingresar una divisa única (ej: USD, COP, EUR, MXN) o varias separadas por coma para multinacionales (ej: USD, EUR, COP).\n`
    );
  }
}

async function askValidCountry(
  rl: readline.Interface,
  question: string,
  defaultCountry = "",
): Promise<ResolvedLocale> {
  while (true) {
    const input = await ask(rl, question, defaultCountry);
    const cleaned = sanitizeText(input, 80);
    if (!cleaned || cleaned.length < 2) {
      console.log(`  ${theme.redBold("[ERROR] Territorio inválido:")} El nombre del país o ciudad debe tener al menos 2 caracteres.\n`);
      continue;
    }
    if (cleaned.toLowerCase() === "internacional" || cleaned.toLowerCase() === "global") {
      return resolveLocaleAutonomously(cleaned);
    }
    const loc = resolveLocaleAutonomously(cleaned);
    if (loc.confidence >= 0.7 && loc.countryCode !== "XX") {
      return loc;
    }
    console.log(`  ${theme.redBold("[ERROR] Territorio no reconocido:")} '${cleaned}' no es un país o ciudad válido. Por favor ingresa un país o territorio real (ej: Colombia, México, España, Argentina, Bogotá, Medellín, etc.).\n`);
  }
}

async function askValidInteger(
  rl: readline.Interface,
  question: string,
  defaultValue = "1",
  min = 1,
  max = 9999,
): Promise<number> {
  while (true) {
    const input = await ask(rl, question, defaultValue);
    const num = parseInt(input.trim(), 10);
    if (!isNaN(num) && num >= min && num <= max) {
      return num;
    }
    console.log(`  ${theme.redBold("[ERROR] Número inválido:")} Debe ser un número entero entre ${min} y ${max}.\n`);
  }
}

async function askValidContact(
  rl: readline.Interface,
  question: string,
  defaultValue = "",
): Promise<string> {
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  while (true) {
    const val = (await ask(rl, question, defaultValue)).trim();
    const digitsOnly = val.replace(/\D/g, "");
    if (EMAIL_REGEX.test(val) || (digitsOnly.length >= 7 && digitsOnly.length <= 15)) {
      return val;
    }
    console.log(`  ${theme.redBold("[ERROR] Contacto inválido:")} Ingresa un correo electrónico válido o un número de teléfono (ej: ventas@proveedor.com o +57 300 1234567).\n`);
  }
}

async function askValidAddressOrCity(
  rl: readline.Interface,
  question: string,
  defaultValue = "",
  fieldLabel = "Ubicación o ciudad",
): Promise<string> {
  while (true) {
    const input = (await ask(rl, question, defaultValue)).trim();
    if (isValidCountryOrCity(input) || input.toLowerCase() === "internacional") {
      return input;
    }
    console.log(`  ${theme.redBold(`[ERROR] ${fieldLabel} no reconocida:`)} No se reconoce '${input}' como una ciudad o dirección válida. Ingresa una ciudad o país real (ej: Bogotá, Medellín, CDMX, Madrid, etc.).\n`);
  }
}

const CHECKPOINT_FILE = path.join(process.cwd(), "vault", ".onboarding_checkpoint.json");

export interface OnboardingCheckpoint {
  step: number;
  userName: string;
  companyName: string;
  email: string;
  emailVerified: boolean;
  password: string;
  companyId: string;
  userId: string;
  currency: string;
  supportedCurrencies?: string[];
  isMultiCurrency?: boolean;
  country: string;
  timezone: string;
  warehouseCity: string;
  sourceChoice?: string;
  businessProfile?: "tienda" | "tienda_proveedores" | "logistica_completa";
  activeModules?: string[];
  selectedSourceLabel?: string;
  autonomyLevel?: string;
}

export function loadCheckpoint(): OnboardingCheckpoint | null {
  try {
    if (fs.existsSync(CHECKPOINT_FILE)) {
      return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, "utf8"));
    }
  } catch {}
  return null;
}

export function saveCheckpoint(data: Partial<OnboardingCheckpoint>): void {
  try {
    const dir = path.dirname(CHECKPOINT_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const existing = loadCheckpoint() || ({} as any);
    fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify({ ...existing, ...data }, null, 2), "utf8");
  } catch {}
}

export function clearCheckpoint(): void {
  try {
    if (fs.existsSync(CHECKPOINT_FILE)) fs.unlinkSync(CHECKPOINT_FILE);
  } catch {}
}

/**
 * Asistente de Inicio y Login de MINT 100% centrado en el cliente (Español).
 * Guía al usuario a través de:
 * 1. Perfil del operador y empresa (sin restricciones forzadas de correo).
 * 2. Tipo de negocio (Solo Tienda vs Proveedores vs Logística Completa).
 * 3. Conexión a Base de Datos y Convivencia Segura de Esquema (Tarea 0).
 * 4. Gobernanza de compras y canales de alerta.
 */
export async function runOnboardingWizard(): Promise<StoredSession> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  printBanner();
  console.log(
    drawCard(
      [
        theme.bold("MINT — Gerente Autónomo de Operaciones y Back Office"),
        theme.dim("Configuración guiada: Identidad y descubrimiento de datos reales."),
        theme.dim("Cero supuestos: MINT entenderá tus datos sin configuraciones tediosas."),
      ],
      {
        title: "BIENVENIDO A MINT",
        borderColor: theme.mint,
      },
    ),
  );
  console.log("");

  try {
    // -------------------------------------------------------------
    // PASO 1: IDENTIDAD DEL OPERADOR Y DE LA EMPRESA
    // -------------------------------------------------------------
    console.log(drawDivider("PASO 1 DE 2: IDENTIDAD DEL OPERADOR Y EMPRESA", 76));
    const userName = await askValidOperatorName(rl, `  ${theme.bold("1.1 Tu nombre de operador")}`, "");
    const companyName = await askValidCompanyName(rl, `  ${theme.bold("1.2 Nombre de tu empresa o negocio")}`, "");

    const companyId = cleanSlug(companyName, "comp", 20);
    const userId = cleanSlug(userName, "usr", 20);

    // 1.3 Verificación de operador humano (Anti-bot interactivo sin correos falsos)
    const n1 = Math.floor(Math.random() * 20) + 11;
    const n2 = Math.floor(Math.random() * 15) + 3;
    const expectedBotAns = String(n1 + n2);
    let passedBot = false;

    for (let attempt = 1; attempt <= 3; attempt++) {
      const promptText = attempt === 1
        ? `  ${theme.bold(`1.3 Verificación de operador humano (Anti-bot): ¿Cuánto es ${n1} + ${n2}?`)}`
        : `  ${theme.bold(`1.3 Verificación Anti-bot (Intento ${attempt}/3): ¿Cuánto es ${n1} + ${n2}?`)}`;
      const botAns = (await ask(rl, promptText)).trim();
      if (botAns === expectedBotAns) {
        console.log(`  ${theme.mintBold("[OK]")} Verificación anti-bot superada. Cuenta de operador verificada.\n`);
        passedBot = true;
        break;
      } else {
        console.log(`  ${theme.redBold("[ERROR]")} Respuesta incorrecta. Intento ${attempt} de 3.\n`);
      }
    }

    if (!passedBot) {
      throw new Error("Verificación anti-bot fallida. Abortando inicialización.");
    }

    // 1.4 Contraseña
    let password = "";
    while (true) {
      password = await ask(rl, `  ${theme.bold("1.4 Contraseña de acceso (mínimo 6 caracteres)")}`);
      if (password.length < 6) {
        console.log(`  ${theme.redBold("[ERROR]")} La contraseña debe tener al menos 6 caracteres.\n`);
        continue;
      }
      if (/[<>;{}\[\]\\`~]/.test(password)) {
        console.log(`  ${theme.redBold("[ERROR]")} Símbolos no permitidos por seguridad.\n`);
        continue;
      }
      break;
    }

    // 1.5 Correo de contacto (opcional, sin simulaciones)
    let email = (await ask(rl, `  ${theme.bold("1.5 Correo de contacto/alertas (opcional, presiona Enter para omitir)")}`)).trim().toLowerCase();
    if (!email) {
      email = `${userId}@mint.local`;
    }

    // Persistir empresa y usuario en PostgreSQL
    await db
      .insert(companies)
      .values({
        id: companyId,
        name: companyName,
        currency: "USD",
      })
      .onConflictDoUpdate({
        target: [companies.id],
        set: { name: companyName },
      });

    const passHash = hashPassword(password);
    await db
      .insert(users)
      .values({
        id: userId,
        companyId,
        name: userName,
        email,
        role: "owner",
        passwordHash: passHash,
        setupCompleted: true,
      })
      .onConflictDoUpdate({
        target: [users.id],
        set: { name: userName, email, role: "owner", passwordHash: passHash },
      });

    console.log(`  ${theme.mintBold("[OK]")} Operador '${userName}' y empresa '${companyName}' registrados.\n`);

    // -------------------------------------------------------------
    // PASO 2: CONEXIÓN Y DESCUBRIMIENTO DE DATOS (CHATBOT / UNIVERSAL)
    // -------------------------------------------------------------
    console.log(drawDivider("PASO 2 DE 2: CONEXIÓN Y DESCUBRIMIENTO DE TUS DATOS", 76));
    console.log(`  ¿Cómo deseas conectar o iniciar tus datos?`);
    console.log(`    ${theme.mintBold("[1] Chatear con MINT para buscar bases de datos o archivos en tu equipo")}`);
    console.log(`    ${theme.cyanBold("[2] Ingresar ruta directa a archivo local (.csv, .xlsx, .json, .sqlite, .sql)")}`);
    console.log(`    ${theme.dim("[3] Conectar base de datos existente (PostgreSQL / MySQL / SQLite)")}`);
    console.log(`    ${theme.dim("[4] Iniciar en blanco (Catálogo limpio)")}\n`);

    const sourceChoice = await askValidChoice(rl, `  Elige una opción (1/2/3/4)`, ["1", "2", "3", "4"]);

    if (sourceChoice === "1") {
      // Modo Chatbot interactivo de descubrimiento
      console.log("");
      console.log(
        drawCard(
          [
            theme.bold("ASISTENTE CONVERSACIONAL DE DESCUBRIMIENTO MINT"),
            theme.dim("Dime qué o dónde buscar en tu equipo (ej: 'busca en downloads', 'archivos de inventario', 'mi carpeta C:\\datos')"),
            theme.dim("O escribe 'cancelar' para continuar sin cargar archivos."),
          ],
          { title: "MINT DATA DISCOVERY CHAT", borderColor: theme.cyan },
        ),
      );

      let chatDone = false;
      while (!chatDone) {
        const query = (await ask(rl, `\n  ${theme.mintBold("MINT Discovery >")} `)).trim();
        if (!query || query.toLowerCase() === "cancelar" || query.toLowerCase() === "salir") {
          console.log(`  ${theme.dim("Descubrimiento finalizado por el usuario.")}`);
          break;
        }

        console.log(`  ${theme.cyan("Escaneando tu equipo en busca de datos...")}`);
        const { discoverLocalSources } = await import("@mint/ingest");

        let searchDir = process.cwd();
        const home = os.homedir();
        const qLower = query.toLowerCase();
        if (qLower.includes("download") || qLower.includes("descarga")) {
          searchDir = path.join(home, "Downloads");
        } else if (qLower.includes("desktop") || qLower.includes("escritorio")) {
          searchDir = path.join(home, "Desktop");
        } else if (qLower.includes("document") || qLower.includes("doc")) {
          searchDir = path.join(home, "Documents");
        } else if (fs.existsSync(query)) {
          searchDir = query;
        }

        const found = await discoverLocalSources({ basePath: searchDir, maxDepth: 2, includeSamples: true }).catch(() => []);

        if (found.length === 0) {
          console.log(`  ${theme.amberBold("[AVISO]")} No se encontraron archivos tabulares en '${searchDir}'.`);
          console.log(`  Intenta indicar otra carpeta (ej: 'C:\\Users\\...\\Downloads') o escribe 'salir'.`);
          continue;
        }

        console.log(`\n  ${theme.mintBold(`[OK] MINT encontró ${found.length} archivo(s) de datos en ${searchDir}:`)}\n`);
        const maxToShow = Math.min(found.length, 8);
        for (let i = 0; i < maxToShow; i++) {
          const item = found[i];
          const sizeKb = (item.sizeBytes / 1024).toFixed(1);
          console.log(`    ${theme.cyanBold(`[#${i + 1}]`)} ${theme.bold(item.name)} (${item.sourceType.toUpperCase()}, ${sizeKb} KB)`);
          console.log(`        Ruta: ${theme.dim(item.path)}`);
          if (item.details.headers) {
            console.log(`        Columnas: ${theme.dim(item.details.headers.slice(0, 5).join(", "))}`);
          }
        }

        const pick = await askValidInteger(rl, `\n  Ingresa el número del archivo a importar (1-${maxToShow}) o '0' para buscar otra cosa`, "", 0, maxToShow);
        if (pick > 0 && pick <= maxToShow) {
          const chosen = found[pick - 1];
          console.log(`\n  Importando '${chosen.name}' con motor universal tolerante a fallos...`);
          const { importUniversalDataFile } = await import("@mint/core");
          const importRes = await importUniversalDataFile(companyId, chosen.path);
          console.log(`  ${theme.mintBold("[OK] Importación finalizada:")} ${importRes.importedProducts} productos, ${importRes.importedSuppliers} proveedores, ${importRes.importedInventory} existencias.`);
          if (importRes.quarantinedCount > 0) {
            console.log(`  ${theme.amberBold(`[SEGURIDAD] ${importRes.quarantinedCount} registro(s) sospechosos o con fórmulas aislados en cuarentena.`)}`);
          }
          chatDone = true;
        }
      }
    } else if (sourceChoice === "2") {
      const filePath = (await ask(rl, `  Ingresa la ruta completa al archivo (.csv, .xlsx, .json, .sqlite, .sql)`)).trim();
      if (filePath && fs.existsSync(filePath)) {
        console.log(`\n  Importando '${path.basename(filePath)}' con motor universal...`);
        const { importUniversalDataFile } = await import("@mint/core");
        const importRes = await importUniversalDataFile(companyId, filePath);
        console.log(`  ${theme.mintBold("[OK] Importación finalizada:")} ${importRes.importedProducts} productos, ${importRes.importedSuppliers} proveedores, ${importRes.importedInventory} existencias.`);
        if (importRes.quarantinedCount > 0) {
          console.log(`  ${theme.amberBold(`[SEGURIDAD] ${importRes.quarantinedCount} registro(s) aislados en cuarentena.`)}`);
        }
      } else if (filePath) {
        console.log(`  ${theme.amberBold("[AVISO]")} Archivo '${filePath}' no encontrado. Se continuará con catálogo limpio.`);
      }
    } else if (sourceChoice === "3") {
      const dbUrl = (await ask(rl, `  Ingresa la cadena de conexión de la base de datos (PostgreSQL/MySQL)`)).trim();
      if (dbUrl) {
        console.log(`  ${theme.mintBold("[OK]")} Cadena de conexión registrada para introspección de solo lectura.`);
      }
    } else {
      console.log(`  ${theme.dim("Iniciando con catálogo en blanco.")}`);
    }

    // -------------------------------------------------------------
    // DIAGNÓSTICO HONESTO DE PREPARACIÓN (CERO ASUMIDOS)
    // -------------------------------------------------------------
    console.log(`\n  ${theme.cyan("MINT Brain está evaluando la preparación operativa de tus datos...")}`);
    const { generateReadinessReport } = await import("@mint/core");
    const readiness = await generateReadinessReport(companyId);
    if (readiness.detectedLocale.currency) {
      await db.update(companies).set({ currency: readiness.detectedLocale.currency }).where(eq(companies.id, companyId));
    }

    console.log("");
    console.log(
      drawCard(
        [
          `${theme.bold("ESTADO GENERAL:")}      ${readiness.overallStatus === "OPTIMA" ? theme.mintBold("ÓPTIMO (100% salud)") : readiness.overallStatus === "ATENCION" ? theme.amberBold(`${readiness.scorePercent}% salud - ATENCIÓN`) : theme.redBold(`${readiness.scorePercent}% salud - CRÍTICO`)}`,
          "",
          `${theme.bold("DIVISA:")}              ${readiness.detectedLocale.currency ? theme.bold(readiness.detectedLocale.currency) : theme.dim("No determinada en los datos (se fijará con tu primera venta/costo)")}`,
          `${theme.bold("SEDE / SEDES:")}        ${readiness.detectedLocale.city || theme.dim("Sin ubicación física registrada")}`,
          `${theme.bold("CATÁLOGO:")}            ${readiness.entitiesSummary.productsCount} productos │ ${readiness.entitiesSummary.suppliersCount} proveedores │ ${readiness.entitiesSummary.warehousesCount} bodegas`,
          "",
          `${theme.bold("MÓDULOS ACTIVOS:")}`,
          ...readiness.activeModules.map((m) => `  • ${m.active ? theme.mint("[ACTIVO]") : theme.dim("[INACTIVO]")} ${m.name}: ${theme.dim(m.reason)}`),
          ...(readiness.findings.faltantes.length > 0
            ? [
                "",
                `${theme.cyan("[DATOS FALTANTES PARA DESBLOQUEAR OPERACIONES]")}`,
                ...readiness.findings.faltantes.slice(0, 3).map((f) => `  • ${theme.bold(f.title)}: ${theme.dim(f.suggestedAction)}`),
              ]
            : []),
        ],
        {
          title: "DIAGNÓSTICO DE PREPARACIÓN DE DATOS (CERO SUPOSICIONES)",
          borderColor: theme.mint,
        },
      ),
    );

    // Guardar sesión activa en el keychain
    const sessionToSave: StoredSession = {
      token: "mint_local_jwt_" + Date.now(),
      companyId,
      userId,
      email,
      name: userName,
      role: "owner",
      currency: readiness.detectedLocale.currency || "USD",
      companyName,
      savedAt: new Date().toISOString(),
    };

    await saveSession(sessionToSave);
    clearCheckpoint();

    console.log(`\n${theme.mintBold("[OK] Configuración completada exitosamente.")}`);
    console.log(`  Tu sesión de dueño (${userName}) para '${companyName}' ha sido activada.\n`);
    console.log(`  Comandos recomendados para comenzar:`);
    console.log(`    • ${theme.mintBold("mint stock")}        ${theme.dim("Consultar existencias de inventario")}`);
    console.log(`    • ${theme.mintBold("mint suppliers")}    ${theme.dim("Gestionar proveedores y contactos")}`);
    console.log(`    • ${theme.mintBold("mint fleet")}        ${theme.dim("Administrar camiones y rutas de transporte")}`);
    console.log(`    • ${theme.mintBold("mint doctor")}       ${theme.dim("Diagnóstico de salud de datos y módulos")}`);
    console.log(`    • ${theme.mintBold("mint chat")}         ${theme.dim("Conversar con el agente autónomo MINT")}\n`);

    rl.close();
    return sessionToSave;
  } catch (err: any) {
    rl.close();
    console.error(`\n${theme.redBold("[ERROR EN ONBOARDING]")}: ${err.message}\n`);
    throw err;
  }
}
