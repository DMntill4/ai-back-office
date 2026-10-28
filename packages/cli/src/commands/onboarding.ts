import * as readline from "node:readline";
import * as path from "node:path";
import * as fs from "node:fs";
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
  const clean = str.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (clean.length < 5) return false;

  // 1. Caracteres idénticos repetidos consecutivamente >= 4 veces (ej: aaaa, 1111)
  if (/(.)\1{3,}/.test(clean)) return true;

  // 2. Patrones comunes de teclado (keyboard walks) de al menos 4 caracteres
  const walks = [
    "qwer", "wert", "erty", "rtyu", "tyui", "yuio", "uiop",
    "asdf", "sdfg", "dfgh", "fghj", "ghjk", "hjkl",
    "zxcv", "xcvb", "cvbn", "vbnm",
    "1234", "2345", "3456", "4567", "5678", "6789", "0987", "9876",
  ];
  for (const walk of walks) {
    if (clean.includes(walk)) return true;
  }

  // 3. Dígitos intercalados entre letras (ej: u9wb, bu98wb) - típico de aporreo o hashes
  if (/[a-z]\d+[a-z]/.test(clean)) return true;

  // 4. Demasiados dígitos mezclados (más de 6 dígitos en nombres o usuarios)
  const digits = (clean.match(/[0-9]/g) || []).length;
  if (digits > 6) return true;

  // 5. Secuencia excesiva de consonantes consecutivas (>= 5)
  if (/[bcdfghjklmnpqrstvwxyz]{5,}/.test(clean)) return true;

  // 6. Cadenas con proporción absurda de vocales (< 20% en strings de más de 8 letras)
  const letters = (clean.match(/[a-z]/g) || []).length;
  const vowels = (clean.match(/[aeiou]/g) || []).length;
  if (letters > 8 && vowels / letters < 0.20) return true;

  // 7. Cadenas con sólo una vocal repetida muchas veces
  if (letters >= 10) {
    const uniqueVowels = new Set(clean.match(/[aeiou]/g) || []).size;
    if (uniqueVowels <= 1 && vowels / letters < 0.35) return true;
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
  defaultChoice = "1",
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
  defaultCountry = "Colombia",
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
  defaultValue = "ventas@proveedor.com",
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
  defaultValue = "Bogotá",
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

  console.clear();

  // Logo MINT elegante y sin emojis
  const logo = [
    "  ███╗   ███╗██╗███╗   ██╗████████╗",
    "  ████╗ ████║██║████╗  ██║╚══██╔══╝",
    "  ██╔████╔██║██║██╔██╗ ██║   ██║   ",
    "  ██║╚██╔╝██║██║██║╚██╗██║   ██║   ",
    "  ██║ ╚═╝ ██║██║██║ ╚████║   ██║   ",
    "  ╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝   ╚═╝   ",
  ];

  console.log("");
  for (const line of logo) {
    console.log(theme.mintBold(line));
  }
  console.log(
    theme.dim("  ┌─ ") +
      theme.cyanBold("MINT BACK-OFFICE AUTÓNOMO") +
      theme.dim(" // ") +
      theme.muted("CONFIGURACIÓN INICIAL DEL CLIENTE") +
      theme.dim(" ─┐\n"),
  );

  console.log(
    drawCard(
      [
        `¡Bienvenido a MINT! Tu back office autónomo para comercio, inventario y logística.`,
        `MINT vigila en segundo plano tus ventas, stock y operaciones con compras aprobadas.`,
        `Garantía de seguridad: MINT nunca sobrescribe ni altera tus bases de datos existentes.`,
        ``,
        `Completemos una configuración guiada de 3 pasos para poner a operar tu back-office.`,
      ],
      {
        title: "BIENVENIDO A MINT",
        borderColor: theme.mint,
      },
    ),
  );
  console.log("");

  try {
    const cp = loadCheckpoint();
    let startStep = 1;

    let userName = "Admin";
    let companyName = "Mi Empresa";
    let email = "admin@empresa.com";
    let emailVerified = false;
    let password = "admin123";
    let companyId = "comp_default";
    let userId = "usr_admin";
    let currency = "USD";
    let supportedCurrencies: string[] = ["USD"];
    let isMultiCurrency = false;
    let country = "Colombia";
    let timezone = "America/Bogota";
    let warehouseCity = "Sede Central";
    let businessProfile: "tienda" | "tienda_proveedores" | "logistica_completa" = "tienda";
    let activeModules: string[] = ["inventario", "ventas", "finanzas"];
    let selectedSourceLabel = "Catálogo Inicial";
    let diagnosis: AutonomousInspectionResult | null = null;
    let autonomyLevel = "dry-run";

    if (cp && cp.step >= 2 && cp.step <= 5) {
      console.log(`\n  ${theme.amberBold("[AVISO] Configuración en progreso detectada:")}`);
      console.log(`  Empresa: ${theme.bold(cp.companyName)} (${cp.companyId}) │ Paso guardado: ${cp.step} de 5`);
      const ans = await ask(rl, `  ¿Deseas retomar la configuración donde quedaste? [S/n]`, "S");
      if (ans.toLowerCase() !== "n") {
        startStep = cp.step;
        userName = cp.userName;
        companyName = cp.companyName;
        email = cp.email;
        emailVerified = cp.emailVerified;
        password = cp.password;
        companyId = cp.companyId;
        userId = cp.userId;
        currency = cp.currency;
        if (cp.supportedCurrencies) supportedCurrencies = cp.supportedCurrencies;
        if (cp.isMultiCurrency !== undefined) isMultiCurrency = cp.isMultiCurrency;
        country = cp.country;
        timezone = cp.timezone;
        warehouseCity = cp.warehouseCity;
        if (cp.businessProfile) businessProfile = cp.businessProfile;
        if (cp.activeModules) activeModules = cp.activeModules;
        if (cp.selectedSourceLabel) selectedSourceLabel = cp.selectedSourceLabel;
        if (cp.autonomyLevel) autonomyLevel = cp.autonomyLevel;
        console.log(`\n  ${theme.mintBold("[OK]")} Retomando en Paso ${startStep} de 5...\n`);
      } else {
        clearCheckpoint();
      }
    }

    if (startStep <= 1) {
      // -------------------------------------------------------------
      // PASO 1: IDENTIDAD DEL OPERADOR Y DE LA EMPRESA (SIN ASUMIR NADA)
      // -------------------------------------------------------------
      console.log(drawDivider("PASO 1 DE 5: IDENTIDAD DEL OPERADOR Y EMPRESA", 76));
      userName = await askValidOperatorName(rl, `  ${theme.bold("1.1 Tu nombre de operador (obligatorio)")}`, "");
      companyName = await askValidCompanyName(rl, `  ${theme.bold("1.2 Nombre de tu empresa o marca (obligatorio)")}`, "");

      companyId = cleanSlug(companyName, "comp", 20);
      userId = cleanSlug(userName, "usr", 20);

      // Pre-persistir empresa en PostgreSQL para satisfacer la clave foránea de business_config
      await db
        .insert(companies)
        .values({
          id: companyId,
          name: companyName,
          currency: "USD",
        })
        .onConflictDoNothing();

      // 1.3 y 1.4: Validación rigurosa de correo y verificación obligatoria (Sin aberraciones ni saltarse el paso)
      while (true) {
        while (true) {
          email = (await ask(
            rl,
            `  ${theme.bold("1.3 Correo electrónico de contacto y alertas")}`,
            "admin@empresa.com",
          )).trim().toLowerCase();

          const emailCheck = validateEmailAddress(email);
          if (emailCheck.valid) {
            break;
          }
          console.log(`  ${theme.redBold("[ERROR] Correo no aceptado:")} ${emailCheck.error}\n`);
        }

        // Verificación real de correo con código OTP
        try {
          const sendRes = await sendEmailVerificationCode(companyId, email);
          console.log(`\n  ${theme.mintBold("[OK]")} Código de verificación generado para ${email}.`);
          console.log(`  ${theme.dim(`[CÓDIGO DE VERIFICACIÓN]: ${sendRes.code} (expira en 15 minutos)`)}`);

          let verified = false;
          for (let attempt = 1; attempt <= 3; attempt++) {
            const promptMsg = attempt === 1
              ? `  ${theme.bold("1.4 Ingresa el código de 6 dígitos recibido")}`
              : `  ${theme.bold(`1.4 Ingresa el código de 6 dígitos (Intento ${attempt}/3)`)}`;
            const inputCode = (await ask(rl, promptMsg, sendRes.code)).trim();

            if (!inputCode) {
              console.log(`  ${theme.redBold("[ERROR]")} El código de verificación no puede estar vacío.`);
              continue;
            }

            if (!/^\d{6}$/.test(inputCode)) {
              console.log(`  ${theme.redBold("[ERROR] Formato de código inválido:")} El código debe contener exactamente 6 dígitos numéricos (sin letras ni caracteres especiales).\n`);
              continue;
            }

            const verifyRes = await verifyEmailCode(companyId, email, inputCode);
            if (verifyRes.success) {
              console.log(`  ${theme.mintBold("[OK]")} ${verifyRes.message}\n`);
              emailVerified = true;
              verified = true;
              break;
            } else {
              console.log(`  ${theme.redBold("[ERROR]")} ${verifyRes.message}`);
            }
          }

          if (verified) {
            break; // Correo verificado con éxito, avanzar a contraseña
          }

          console.log(`\n  ${theme.amberBold("[REINTENTO]")} No se completó la verificación del correo. Ingresa una dirección válida para continuar.\n`);
        } catch (err: any) {
          console.log(`  ${theme.redBold("[ERROR] Fallo al generar código OTP:")} ${err.message}. Ingresa un correo válido.\n`);
        }
      }

      while (true) {
        password = await ask(
          rl,
          `  ${theme.bold("1.5 Contraseña de acceso al back-office (mínimo 6 caracteres)")}`,
          "admin123",
        );
        if (password.length < 6) {
          console.log(`  ${theme.redBold("[ERROR] Contraseña corta:")} Debe tener al menos 6 caracteres.\n`);
          continue;
        }
        if (password.length > 50) {
          console.log(`  ${theme.redBold("[ERROR] Contraseña demasiado larga:")} No debe exceder 50 caracteres.\n`);
          continue;
        }
        if (/[<>;{}[\]\\`~]/.test(password)) {
          console.log(`  ${theme.redBold("[ERROR] Símbolos no permitidos:")} Por seguridad, la contraseña no debe contener caracteres especiales como <, >, ;, {, }, \`, etc.\n`);
          continue;
        }
        if (isGibberish(password) && password !== "admin123") {
          console.log(`  ${theme.redBold("[ERROR] Contraseña débil:")} No uses secuencias repetidas como 'aaaaaa' o '123456'.\n`);
          continue;
        }
        break;
      }

      const currResult = await askValidCurrency(
        rl,
        `  ${theme.bold("1.6 Divisa base de consolidación financiera (USD, COP, MXN, EUR, o 'USD, EUR, COP' si eres multinacional)")}`,
        "USD",
      );
      currency = currResult.currency;
      supportedCurrencies = currResult.supportedCurrencies;
      isMultiCurrency = currResult.isMultiCurrency;

      const locResolved = await askValidCountry(rl, `  ${theme.bold("1.7 País o territorio de operación")}`, "Colombia");
      country = locResolved.country;
      timezone = locResolved.timezone || "America/Bogota";
      warehouseCity = locResolved.suggestedCity || "Sede Central";

      // PERSISTIR INMEDIATAMENTE EMPRESA Y USUARIO (Garantiza que mint_table_mappings y products no den error de FK)
      await db
        .insert(companies)
        .values({
          id: companyId,
          name: companyName,
          country,
          currency,
        })
        .onConflictDoUpdate({
          target: [companies.id],
          set: { name: companyName, country, currency },
        });

      // Configuración de divisas para multinacionales
      await db
        .insert(businessConfig)
        .values({
          companyId,
          key: "supported_currencies",
          value: JSON.stringify(supportedCurrencies),
          currency,
          description: "Divisas operativas habilitadas para ventas y pagos",
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [businessConfig.companyId, businessConfig.key],
          set: { value: JSON.stringify(supportedCurrencies), updatedAt: new Date() },
        });

      await db
        .insert(businessConfig)
        .values({
          companyId,
          key: "multi_currency_mode",
          value: String(isMultiCurrency),
          currency,
          description: "Indicador de modalidad multidivisa para multinacionales",
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [businessConfig.companyId, businessConfig.key],
          set: { value: String(isMultiCurrency), updatedAt: new Date() },
        });

      const passwordHash = hashPassword(password);
      password = passwordHash;
      await db
        .insert(users)
        .values({
          id: userId,
          companyId,
          name: userName,
          email,
          role: "owner",
          passwordHash,
          setupCompleted: emailVerified,
        })
        .onConflictDoUpdate({
          target: [users.id],
          set: { name: userName, email, role: "owner", passwordHash, setupCompleted: emailVerified },
        });

      saveCheckpoint({
        step: 2,
        userName,
        companyName,
        email,
        emailVerified,
        password: passwordHash,
        companyId,
        userId,
        currency,
        supportedCurrencies,
        isMultiCurrency,
        country,
        timezone,
        warehouseCity,
      });

      console.log(`\n  ${theme.mintBold("[OK]")} Empresa '${theme.bold(companyName)}' (${companyId}) registrada en PostgreSQL con divisa ${theme.bold(currency)}.\n`);
    }

    if (startStep <= 2) {
      // -------------------------------------------------------------
      // PASO 2: CONEXIÓN Y AUTODESCUBRIMIENTO INTELIGENTE (TAREA 0)
      // MINT toma el control: detecta modelo, divisa, territorio y errores
      // -------------------------------------------------------------
      console.log(drawDivider("PASO 2 DE 5: CONEXIÓN Y AUTODESCUBRIMIENTO DE TUS DATOS", 76));
      console.log(`  ¿Cómo deseas conectar o iniciar tus datos?`);
      console.log(`    ${theme.mintBold("[1] Usar Base de Datos PostgreSQL existente (MINT autodescubre modelo, divisa y errores)")}`);
      console.log(`    ${theme.cyanBold("[2] Buscar automáticamente archivos en tu equipo (.sql, .db, .sqlite, .csv)")}`);
      console.log(`    ${theme.dim("[3] Ingresar ruta a archivo local (.csv, .xlsx, .json, .sql)")}`);
      console.log(`    ${theme.dim("[4] Iniciar en blanco (Catálogo limpio)")}\n`);

      const sourceChoice = await askValidChoice(rl, `  Elige una opción [1/2/3/4]`, ["1", "2", "3", "4"], "1");

      if (sourceChoice === "2") {
      const querySearch = await ask(rl, `  ¿Dónde o qué deseas buscar?`, "downloads");
      console.log(`\n  Buscando fuentes de datos para '${theme.mintBold(querySearch)}'...`);
      const found = await searchProjectDatabase(querySearch);

      if (found.length > 0) {
        console.log(`\n  ${theme.mintBold(`[OK] MINT identificó ${found.length} fuente(s) de datos:`)}\n`);
        found.slice(0, 5).forEach((proj: DiscoveredProject, idx: number) => {
          console.log(`    ${theme.cyanBold(`[#${idx + 1}]`)} ${theme.bold(proj.projectName)} (${proj.framework})`);
          console.log(`        Ubicación: ${theme.dim(proj.projectPath)}`);
        });

        const maxProj = Math.min(found.length, 5);
        const selectProjNum = await askValidInteger(rl, `  Selecciona el número a conectar (1-${maxProj}) o '0' para continuar`, "1", 0, maxProj);
        const idx = selectProjNum - 1;
        if (selectProjNum > 0 && idx >= 0 && idx < found.length) {
          const chosen = found[idx];
          selectedSourceLabel = chosen.projectName;

          for (const sqlFile of chosen.sqlFiles) {
            if (fs.existsSync(sqlFile)) {
              const fileItems = extractProductsFromSqlFile(sqlFile);
              for (const item of fileItems) {
                const productId = `prod_${companyId}_${item.sku.toLowerCase().replace(/[^a-z0-9_]/g, "_")}`;
                await db
                  .insert(products)
                  .values({
                    id: productId,
                    companyId,
                    sku: item.sku,
                    name: item.name,
                    category: item.category,
                    minStock: item.minStock,
                    origin: "real",
                  })
                  .onConflictDoNothing();

                if (Number.isFinite(item.stock) && item.stock >= 0) {
                  await db
                    .insert(inventory)
                    .values({
                      id: `inv_${companyId}_${productId}`,
                      companyId,
                      productId,
                      warehouseId: `alm_central_${companyId}`,
                      stock: item.stock,
                    })
                    .onConflictDoNothing();
                } else {
                  // Sin dato real de existencias: no se inventa, se pregunta al operador
                  await addPendingQuestion(
                    companyId,
                    "stock_missing",
                    `El producto ${item.sku} (${item.name}) no trae existencias en la fuente. Cuantas unidades hay?`,
                    { sku: item.sku, source: selectedSourceLabel },
                  ).catch(() => {});
                }
              }
            }
          }
        }
      }
    } else if (sourceChoice === "3") {
      const filePath = await ask(rl, `  Ingresa la ruta absoluta o relativa al archivo (.csv, .xlsx, .json, .sql)`);
      if (filePath && fs.existsSync(filePath)) {
        selectedSourceLabel = path.basename(filePath);
        console.log(`  ${theme.mintBold("[OK]")} Archivo '${path.basename(filePath)}' detectado. Importando datos al catálogo...\n`);
        const res = await importUniversalCatalogFile(companyId, filePath).catch(() => ({ importedProducts: 0, importedSuppliers: 0 }));
        console.log(`  ${theme.mintBold(`[OK] ${res.importedProducts} productos importados exitosamente al catálogo.`)}\n`);
      } else if (filePath) {
        console.log(`  ${theme.amberBold("[ADVERTENCIA]")} Archivo '${filePath}' no encontrado. Se continuará con catálogo limpio.\n`);
      }
    }

    if (sourceChoice !== "4") {
      console.log(`\n  ${theme.cyan("MINT Brain está analizando tu base de datos de forma autónoma...")}`);
      try {
        diagnosis = await inspectAndDiagnoseDatabaseAutonomously(companyId);

        // Guardar mapeos de esquema seguros (Tarea 0)
        for (const prop of diagnosis.tableProposals) {
          await saveConfirmedTableMapping({
            companyId,
            sourceTable: prop.sourceTable,
            targetEntity: prop.targetEntity,
            columnMappings: prop.columnMappings,
            isConfirmed: true,
            isReadOnly: true,
            writeRoles: [],
          });
        }

        console.log("");
        console.log(
          drawCard(
            [
              `${theme.bold("MODELO DEDUCIDO:")}      ${theme.mintBold(diagnosis.inferredProfile.toUpperCase())}`,
              `  ${theme.dim("Motivo:")} ${diagnosis.profileReason}`,
              "",
              `${theme.bold("DIVISA DETECTADA:")}     ${theme.bold(diagnosis.inferredLocale.currency)} (${diagnosis.inferredLocale.currencySymbol})`,
              `${theme.bold("TERRITORIO / SEDE:")}    ${theme.bold(diagnosis.inferredLocale.country)} (${diagnosis.inferredLocale.timezone})`,
              `${theme.bold("CIUDAD PRINCIPAL:")}     ${theme.bold(diagnosis.inferredLocale.suggestedCity)}`,
              `${theme.bold("TABLAS CLIENTE:")}       ${theme.bold(String(diagnosis.tableProposals.length))} detectadas (Tratadas como Solo Lectura - Tarea 0)`,
              "",
              `${theme.bold("SALUD DE DATOS:")}       ${diagnosis.dataHealthScore >= 80 ? theme.mintBold(`${diagnosis.dataHealthScore}% [ÓPTIMA]`) : theme.amberBold(`${diagnosis.dataHealthScore}% [ATENCIÓN]`)}`,
              `${theme.bold("ANOMALÍAS AISLADAS:")}   ${diagnosis.detectedErrors.length > 0 ? theme.amberBold(`${diagnosis.detectedErrors.length} registro(s) en /quarantine`) : theme.mint("0 errores")}`,
            ],
            {
              title: "DIAGNÓSTICO AUTÓNOMO DE TUS DATOS (CERO SUPOSICIONES)",
              borderColor: theme.mint,
            },
          ),
        );

        if (diagnosis.detectedErrors.length > 0) {
          console.log(`\n  ${theme.amberBold("[RECONOCIMIENTO AUTÓNOMO DE ERRORES]")}`);
          diagnosis.detectedErrors.slice(0, 3).forEach((err) => {
            console.log(`  • ${theme.amber(err.description)}`);
          });
          console.log(`  ${theme.dim("Los registros corruptos fueron aislados en /quarantine para proteger tus decisiones de compra.")}\n`);
        }

        const confirmAuto = await ask(rl, `  ¿Confirmar este perfil y configuración autónoma? [S/n]`, "S");
        if (confirmAuto.toLowerCase() !== "n") {
          businessProfile = diagnosis.inferredProfile;
          currency = diagnosis.inferredLocale.currency;
          country = diagnosis.inferredLocale.country;
          timezone = diagnosis.inferredLocale.timezone;
          warehouseCity = diagnosis.inferredLocale.suggestedCity;
        } else {
          // Ajuste manual si el cliente desea cambiar algo
          console.log(`\n  Selecciona tu modelo preferido manualmente:`);
          console.log(`    [1] Solo Tienda | [2] Tienda con Proveedores | [3] Logística Completa`);
          const manualModel = await askValidChoice(rl, `  Modelo [1/2/3]`, ["1", "2", "3"], "1");
          businessProfile = manualModel === "3" ? "logistica_completa" : manualModel === "2" ? "tienda_proveedores" : "tienda";

          const locResolvedManual = await askValidCountry(rl, `  País o Ciudad sede`, diagnosis.inferredLocale.country);
          country = locResolvedManual.country;
          currency = locResolvedManual.currency;
          timezone = locResolvedManual.timezone;
          warehouseCity = locResolvedManual.suggestedCity;
        }
      } catch (err: any) {
        console.log(`  ${theme.amber("Nota de diagnóstico:")} ${err.message}`);
      }
    } else {
      // Opción 4: Catálogo en blanco (Detección global dinámica sin hardcoding)
      console.log(`\n  ${theme.mintBold("[INICIO EN BLANCO]")}`);
      const locResolvedBlank = await askValidCountry(rl, `  ¿En qué país o ciudad opera tu negocio? (ej: Madrid, Buenos Aires, Santiago, Ciudad de México, Bogotá)`, "Colombia");
      country = locResolvedBlank.country;
      currency = locResolvedBlank.currency;
      timezone = locResolvedBlank.timezone;
      warehouseCity = locResolvedBlank.suggestedCity;

      console.log(`  ${theme.dim(`Territorio resuelto autónomamente: ${country} | Divisa ISO: ${currency} | Zona: ${timezone}`)}\n`);

      console.log(`  ¿Qué tipo de negocio deseas operar?`);
      console.log(`    [1] Solo Tienda (Catálogo, ventas y ganancias sin ruido de flota)`);
      console.log(`    [2] Tienda con Proveedores (Catálogo + compras aprobadas a suplidores)`);
      console.log(`    [3] Logística Completa (Tienda + Proveedores + Flota con GPS)`);
      const modelChoice = await askValidChoice(rl, `  Modelo [1/2/3]`, ["1", "2", "3"], "1");
      businessProfile = modelChoice === "3" ? "logistica_completa" : modelChoice === "2" ? "tienda_proveedores" : "tienda";
    }

    // Configurar módulos según perfil deducido o confirmado
    if (businessProfile === "logistica_completa") {
      activeModules = ["inventario", "ventas", "finanzas", "compras_proveedores", "flota", "logistica"];
    } else if (businessProfile === "tienda_proveedores") {
      activeModules = ["inventario", "ventas", "finanzas", "compras_proveedores"];
    } else {
      activeModules = ["inventario", "ventas", "finanzas"];
    }

    if (businessProfile === "tienda") {
      try {
        const { listPendingQuestions, dismissPendingQuestion } = await import("@mint/core");
        const existingQs = await listPendingQuestions(companyId, "pending").catch(() => []);
        for (const q of existingQs) {
          if (
            q.topic === "supplier_missing" ||
            q.topic === "logistics_missing" ||
            q.topic.includes("carrier") ||
            q.topic.includes("fleet")
          ) {
            await dismissPendingQuestion(q.id).catch(() => {});
          }
        }
      } catch {}
    }

    const initialWhGeo = await geocodeAddressOrCity(warehouseCity).catch(() => null);

    // Registrar Empresa y Almacén Central
    await db
      .insert(companies)
      .values({
        id: companyId,
        name: companyName,
        country,
        currency,
      })
      .onConflictDoUpdate({
        target: [companies.id],
        set: { name: companyName, country, currency },
      });

    await db
      .insert(businessConfig)
      .values({
        companyId,
        key: "timezone",
        value: timezone,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [businessConfig.companyId, businessConfig.key],
        set: { value: timezone, updatedAt: new Date() },
      });

    await db
      .insert(businessConfig)
      .values({
        companyId,
        key: "active_modules",
        value: JSON.stringify(activeModules),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [businessConfig.companyId, businessConfig.key],
        set: { value: JSON.stringify(activeModules), updatedAt: new Date() },
      });

    await db
      .insert(businessConfig)
      .values({
        companyId,
        key: "business_profile",
        value: businessProfile,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [businessConfig.companyId, businessConfig.key],
        set: { value: businessProfile, updatedAt: new Date() },
      });

    await db
      .insert(warehouses)
      .values({
        id: `alm_central_${companyId}`,
        companyId,
        name: `Almacén Central ${warehouseCity}`,
        location: warehouseCity,
        city: initialWhGeo?.city || warehouseCity,
        state: initialWhGeo?.state || null,
        country: initialWhGeo?.country || country,
        latitude: initialWhGeo ? String(initialWhGeo.latitude) : null,
        longitude: initialWhGeo ? String(initialWhGeo.longitude) : null,
      })
      .onConflictDoNothing();

    const step2PasswordHash = password.startsWith("scrypt:") ? password : hashPassword(password);
    await db
      .insert(users)
      .values({
        id: userId,
        companyId,
        name: userName,
        email,
        role: "owner",
        passwordHash: step2PasswordHash,
        setupCompleted: true,
      })
      .onConflictDoUpdate({
        target: [users.id],
        set: { name: userName, email, role: "owner", passwordHash: step2PasswordHash },
      });

      console.log(`\n  ${theme.mintBold("[OK]")} Empresa '${theme.bold(companyName)}' registrada con sede en ${theme.bold(warehouseCity)} (${country}, ${currency}).\n`);

      saveCheckpoint({
        step: 3,
        userName,
        companyName,
        email,
        emailVerified,
        password: step2PasswordHash,
        companyId,
        userId,
        currency,
        country,
        timezone,
        warehouseCity,
        businessProfile,
        activeModules,
        selectedSourceLabel,
      });
    }

    // -------------------------------------------------------------
    // PASO 3 DE 5: PROVEEDORES Y ABASTECIMIENTO
    // -------------------------------------------------------------
    if (startStep <= 3) {
      console.log(drawDivider("PASO 3 DE 5: PROVEEDORES Y ABASTECIMIENTO", 76));
      console.log(`  ¿Cuentas con proveedores para abastecer tus existencias?`);
      console.log(`    ${theme.mintBold("[1] Registrar mi primer proveedor ahora (Recomendado)")}`);
      console.log(`    ${theme.dim("[2] No tengo proveedores aún (Operar como tienda o registrar después)")}\n`);
      const suppChoice = await askValidChoice(rl, `  Opción [1/2]`, ["1", "2"], "1");

      let registeredSuppliersCount = 0;
      if (suppChoice === "1") {
        const suppName = await askValidString(rl, `  Nombre o razón social del proveedor`, "Proveedor Principal", "Nombre de proveedor");
        const suppContact = await askValidContact(rl, `  Correo o teléfono de contacto`, "ventas@proveedor.com");
        const suppCity = await askValidAddressOrCity(rl, `  Ciudad o sede del proveedor`, warehouseCity, "Ciudad de proveedor");
        const leadDays = await askValidInteger(rl, `  Tiempo promedio de entrega (en días)`, "3", 1, 365);
        const suppId = `prov_${companyId}_${cleanSlug(suppName, "", 12)}`;

        await db.insert(suppliers).values({
          id: suppId,
          companyId,
          name: suppName,
          email: suppContact.includes("@") ? suppContact : null,
          phone: !suppContact.includes("@") ? suppContact : null,
          city: suppCity,
          origin: "real",
        }).onConflictDoNothing();

        registeredSuppliersCount = 1;
        console.log(`  ${theme.mintBold(`[OK] Proveedor '${suppName}' registrado exitosamente en base de datos.`)}\n`);
      } else {
        console.log(`  ${theme.dim("Módulo de compras en reposo. Puedes agregar proveedores en cualquier momento con /suppliers add.")}\n`);
        await addPendingQuestion(
          companyId,
          "supplier_missing",
          "No se registraron proveedores durante el onboarding inicial. ¿Quién es el proveedor de los productos?",
          { companyId }
        ).catch(() => {});
      }

      saveCheckpoint({
        step: 4,
        userName,
        companyName,
        email,
        emailVerified,
        password,
        companyId,
        userId,
        currency,
        supportedCurrencies,
        isMultiCurrency,
        country,
        timezone,
        warehouseCity,
        businessProfile,
        activeModules,
        selectedSourceLabel,
      });
    }

    // -------------------------------------------------------------
    // PASO 4 DE 5: LOGÍSTICA, BODEGAS Y RUTAS
    // -------------------------------------------------------------
    if (startStep <= 4) {
      console.log(drawDivider("PASO 4 DE 5: LOGÍSTICA, BODEGAS Y RUTAS", 76));
      console.log(`  Configura tu bodega o punto de despacho principal para cálculo de rutas y fletes:`);
      const whName = await askValidString(rl, `  Nombre de la bodega o almacén`, `Bodega Central ${companyName}`, "Nombre de bodega");
      const whAddress = await askValidAddressOrCity(rl, `  Ciudad o dirección física de la bodega`, warehouseCity, "Dirección o ciudad de bodega");

      const whGeo = await geocodeAddressOrCity(whAddress).catch(() => null);

      await db.insert(warehouses).values({
        id: `alm_central_${companyId}`,
        companyId,
        name: whName,
        location: whAddress,
        city: whGeo?.city || whAddress,
        state: whGeo?.state || null,
        country: whGeo?.country || country,
        latitude: whGeo ? String(whGeo.latitude) : null,
        longitude: whGeo ? String(whGeo.longitude) : null,
      }).onConflictDoUpdate({
        target: [warehouses.id],
        set: { name: whName, location: whAddress, city: whGeo?.city || whAddress },
      });

      console.log(`  ${theme.mintBold(`[OK] Bodega '${whName}' registrada con coordenadas GPS: ${whGeo ? `${whGeo.latitude.toFixed(4)}, ${whGeo.longitude.toFixed(4)}` : "Ubicación confirmada"}.`)}\n`);

      saveCheckpoint({
        step: 5,
        userName,
        companyName,
        email,
        emailVerified,
        password,
        companyId,
        userId,
        currency,
        supportedCurrencies,
        isMultiCurrency,
        country,
        timezone,
        warehouseCity,
        businessProfile,
        activeModules,
        selectedSourceLabel,
      });
    }

    // -------------------------------------------------------------
    // PASO 5 DE 5: GOBERNANZA Y CANALES DE NOTIFICACIÓN
    // -------------------------------------------------------------
    if (startStep <= 5) {
      console.log(drawDivider("PASO 5 DE 5: GOBERNANZA Y CANALES DE NOTIFICACIÓN", 76));
      console.log(`  ¿Cómo debe actuar MINT ante desabastos o alertas operativas?`);
      console.log(
        `    ${theme.mintBold("[1] Supervisado / Aprobación Humana Obligatoria (Recomendado)")}\n` +
        `        MINT detecta stock bajo, calcula el pedido, cotiza y genera una recomendación en /inbox.\n` +
        `        Solo un operador o administrador puede aprobarla. Cero compras automáticas unilaterales.\n`
      );
      console.log(
        `    ${theme.cyanBold("[2] Asistido / Alertas en vivo y recomendaciones")}\n` +
        `        Genera recomendaciones y notifica a tu equipo por los canales configurados.\n`
      );
      console.log(
        `    ${theme.dim("[3] Autónomo bajo presupuesto")}\n` +
        `        Reabastece automáticamente solo productos bajo el umbral de seguridad.\n`
      );

      const autoChoice = await askValidChoice(rl, `  Selecciona el nivel de autonomía [1/2/3]`, ["1", "2", "3"], "1");
      if (autoChoice === "2") autonomyLevel = "assisted";
      if (autoChoice === "3") autonomyLevel = "auto";

      await db
        .insert(businessConfig)
        .values({
          companyId,
          key: "autonomy_level",
          value: autonomyLevel,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [businessConfig.companyId, businessConfig.key],
          set: { value: autonomyLevel, updatedAt: new Date() },
        });

      console.log(`\n  Canales de Alerta y Notificación:`);
      console.log(`    ${theme.mintBold("[1] Conectar Webhook de Discord o Slack (Recomendado)")}`);
      console.log(`    ${theme.cyanBold("[2] Conectar Bot de Telegram")}`);
      console.log(`    ${theme.dim("[3] Solo alertas en consola terminal MINT")}\n`);

      const chanChoice = await askValidChoice(rl, `  Opción [1/2/3]`, ["1", "2", "3"], "3");
      let channelDescription = "Alertas en Terminal y Log Inmutable";

      if (chanChoice === "1") {
        const webhook = await ask(rl, `  Ingresa la URL del Webhook de Discord/Slack`);
        if (webhook && webhook.startsWith("http")) {
          console.log(`  Verificando conexión en vivo con el webhook...`);
          try {
            const { testNotificationChannel } = await import("@mint/notifiers");
            const testRes = await testNotificationChannel("discord", { webhookUrl: webhook });
            if (testRes.success) {
              await addNotificationChannel({
                companyId,
                type: "discord",
                name: "Canal Discord",
                config: { webhookUrl: webhook, topics: ["logs", "stock", "sales", "critical", "finance", "payments"] },
              });
              channelDescription = "Discord Webhook (Verificado en vivo)";
              console.log(`  ${theme.mintBold("[OK] Webhook verificado con éxito y mensaje de prueba entregado.")}\n`);
            } else {
              console.log(`  ${theme.amberBold(`[ADVERTENCIA] El webhook no respondió: ${testRes.error || "error de conexión"}. Guardado en modo contingencia.`)}\n`);
            }
          } catch (err: any) {
            console.log(`  ${theme.amberBold(`[ADVERTENCIA] Error al probar webhook: ${err.message}.`)}\n`);
          }
        }
      } else if (chanChoice === "2") {
        console.log(`\n  ${theme.cyanBold("─── CONFIGURACIÓN DE TELEGRAM BOT ───")}`);
        console.log(`  Para recibir alertas y autorizaciones de compras HITL en tu celular:`);
        console.log(`  1. Habla con @BotFather en Telegram y crea un bot con /newbot para obtener tu Bot Token.`);
        const token = (await ask(rl, `  Ingresa el Bot Token de Telegram`)).trim();

        if (token) {
          let botUsername = "";
          try {
            const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
            if (meRes.ok) {
              const meData = (await meRes.json()) as any;
              if (meData.ok && meData.result?.username) {
                botUsername = meData.result.username;
                console.log(`  ${theme.mintBold(`[OK] Bot autenticado:`)} @${botUsername} (${meData.result.first_name || "Bot"})\n`);
              }
            }
          } catch {}

          console.log(`  ${theme.cyanBold("¿Dónde consigues tu Chat ID de Telegram?")}`);
          console.log(`  • ${theme.bold("Opción A (Recomendada y más rápida):")}`);
          console.log(`    En Telegram busca el bot @userinfobot (o https://t.me/userinfobot) y dale /start.`);
          console.log(`    Te responderá de inmediato con tu 'Id' numérico personal (ej: 589123456).`);
          if (botUsername) {
            console.log(`  • ${theme.bold("Opción B (Autodetección):")}`);
            console.log(`    Abre tu bot @${botUsername} en Telegram, presiona 'Iniciar' (o mándale un mensaje como 'hola'),`);
            console.log(`    y presiona Enter en blanco en esta consola para que MINT detecte tu Chat ID automáticamente.`);
          }
          console.log(`  • ${theme.bold("Para Grupos de Telegram:")}`);
          console.log(`    Añade tu bot al grupo y el Chat ID comenzará con un signo menos (ej: -100123456789).\n`);

          let chatId = (await ask(rl, `  Ingresa tu Chat ID (o presiona Enter para autodetectar)`)).trim();

          // Autodetección si quedó en blanco o escribe 'auto'
          if (!chatId || chatId.toLowerCase() === "auto") {
            console.log(`  ${theme.dim("Consultando mensajes recientes en la API de Telegram...")}`);
            try {
              const updRes = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
              if (updRes.ok) {
                const updData = (await updRes.json()) as any;
                if (updData.ok && Array.isArray(updData.result) && updData.result.length > 0) {
                  const last = updData.result[updData.result.length - 1];
                  const msg = last.message || last.channel_post || last.my_chat_member;
                  if (msg && msg.chat && msg.chat.id) {
                    chatId = String(msg.chat.id);
                    const chatLabel = msg.chat.username ? `@${msg.chat.username}` : (msg.chat.first_name || msg.chat.title || "Privado");
                    console.log(`  ${theme.mintBold(`[OK] Chat detectado automáticamente:`)} ID ${theme.bold(chatId)} (${chatLabel})\n`);
                  }
                }
              }
            } catch {}

            if (!chatId || chatId.toLowerCase() === "auto") {
              console.log(`  ${theme.amberBold("[AVISO]")} No se detectó ningún mensaje enviado a tu bot.`);
              console.log(`  Abre en Telegram el bot @userinfobot para consultar tu número de Id rápidamente.`);
              chatId = (await ask(rl, `  Ingresa tu Chat ID numérico`)).trim();
            }
          }

          if (chatId) {
            try {
              const { testNotificationChannel } = await import("@mint/notifiers");
              const testRes = await testNotificationChannel("telegram", { botToken: token, chatId });
              if (testRes.success) {
                await addNotificationChannel({
                  companyId,
                  type: "telegram",
                  name: `Telegram (@${chatId})`,
                  config: { botToken: token, chatId, topics: ["logs", "stock", "sales", "critical", "finance", "payments"] },
                });
                channelDescription = `Telegram (@${chatId}) (Verificado en vivo)`;
                console.log(`  ${theme.mintBold("[OK] Bot de Telegram verificado y mensaje entregado con éxito a tu chat.")}\n`);
              } else {
                console.log(`  ${theme.amberBold(`[ADVERTENCIA] Telegram reportó: ${testRes.error}. Guardado en modo contingencia.`)}\n`);
              }
            } catch (err: any) {
              console.log(`  ${theme.amberBold(`[ADVERTENCIA] Error al conectar Telegram: ${err.message}.`)}\n`);
            }
          }
        }
      } else {
        console.log(`  ${theme.dim("Consola terminal configurada como receptor principal de alertas.")}\n`);
      }
    }

    // -------------------------------------------------------------
    // GUARDAR SESIÓN CIFRADA Y RESUMEN FINAL
    // -------------------------------------------------------------
    const session: StoredSession = {
      token: `mint_token_${companyId}_${Date.now()}`,
      userId,
      email,
      name: userName,
      role: "owner",
      companyId,
      companyName,
      savedAt: new Date().toISOString(),
    };

    await saveSession(session);
    clearCheckpoint();

    console.log("");
    console.log(
      drawCard(
        [
          `${theme.dim("Operador:")}     ${theme.bold(userName)} (${theme.cyan("DUEÑO / OWNER")})`,
          `${theme.dim("Empresa:")}      ${theme.mintBold(companyName)} [${theme.dim(companyId)}]`,
          `${theme.dim("País / Moneda:")} ${theme.bold(country)} / ${theme.bold(currency)}`,
          `${theme.dim("Modelo:")}       ${theme.bold(businessProfile.toUpperCase())} (${activeModules.join(", ")})`,
          `${theme.dim("Fuente Datos:")} ${theme.bold(selectedSourceLabel)}`,
          `${theme.dim("Gobernanza:")}   ${theme.badge(autonomyLevel.toUpperCase(), "mint")} (Aprobación estricta)`,
          `${theme.dim("Daemon:")}       ${theme.mintBold("ONLINE")} — Vigilancia de stock y ventas en tiempo real`,
        ],
        {
          title: "CONFIGURACIÓN COMPLETADA — MINT LISTO PARA OPERAR",
          badge: "ACTIVO",
          badgeColor: "mint",
          borderColor: theme.mint,
        },
      ),
    );

    console.log(`\n${theme.mintBold("Todo configurado.")} Ingresando a la consola interactiva...\n`);
    return session;
  } finally {
    rl.close();
  }
}
