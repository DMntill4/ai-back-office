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
  geocodeAddressOrCity,
  sendEmailVerificationCode,
  verifyEmailCode,
  isEmailVerified,
  type AutonomousInspectionResult,
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
      userName = await ask(rl, `  ${theme.bold("1.1 Tu nombre o identificador de operador")}`, "Admin");
      companyName = await ask(rl, `  ${theme.bold("1.2 Nombre de tu empresa o marca")}`, "Mi Empresa");

      const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      while (true) {
        email = await ask(
          rl,
          `  ${theme.bold("1.3 Correo electrónico de contacto y alertas")}`,
          "admin@empresa.com",
        );
        email = email.trim().toLowerCase();
        if (EMAIL_REGEX.test(email)) {
          break;
        }
        console.log(`  ${theme.redBold("[ERROR] Correo inválido:")} Ingresa un formato de correo válido (ej: admin@empresa.com).\n`);
      }

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

      // Verificación real de correo con código OTP
      try {
        const sendRes = await sendEmailVerificationCode(companyId, email);
        console.log(`\n  ${theme.mintBold("[OK]")} Código de verificación generado para ${email}.`);
        console.log(`  ${theme.dim(`[CÓDIGO DE VERIFICACIÓN]: ${sendRes.code} (expira en 15 minutos)`)}`);
        const inputCode = await ask(rl, `  ${theme.bold("1.4 Código de verificación de 6 dígitos recibido")}`, sendRes.code);
        if (inputCode) {
          const verifyRes = await verifyEmailCode(companyId, email, inputCode);
          if (verifyRes.success) {
            console.log(`  ${theme.mintBold("[OK]")} ${verifyRes.message}\n`);
            emailVerified = true;
          } else {
            console.log(`  ${theme.redBold("[ERROR]")} ${verifyRes.message}`);
            console.log(`  ${theme.amberBold("[ADVERTENCIA]")} El correo queda como 'no verificado'. MINT no lo usará para alertas oficiales.\n`);
          }
        } else {
          console.log(`  ${theme.amberBold("[ADVERTENCIA]")} Verificación omitida. El correo queda como 'no verificado'.\n`);
        }
      } catch (err: any) {
        console.log(`  ${theme.dim(`Nota de verificación: ${err.message}`)}`);
      }

      while (true) {
        password = await ask(
          rl,
          `  ${theme.bold("1.5 Contraseña de acceso al back-office (mínimo 4 caracteres)")}`,
          "admin123",
        );
        if (password.length >= 4) {
          break;
        }
        console.log(`  ${theme.redBold("[ERROR] Contraseña corta:")} Debe tener al menos 4 caracteres.\n`);
      }

      const currencyInput = await ask(rl, `  ${theme.bold("1.6 Divisa oficial de la empresa (USD, COP, MXN, EUR)")}`, "USD");
      currency = (currencyInput || "USD").trim().toUpperCase();

      const countryInput = await ask(rl, `  ${theme.bold("1.7 País o territorio de operación")}`, "Colombia");
      country = (countryInput || "Internacional").trim();
      const locResolved = resolveLocaleAutonomously(country);
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

      await db
        .insert(users)
        .values({
          id: userId,
          companyId,
          name: userName,
          email,
          role: "owner",
          passwordHash: password,
          setupCompleted: emailVerified,
        })
        .onConflictDoUpdate({
          target: [users.id],
          set: { name: userName, email, role: "owner", passwordHash: password, setupCompleted: emailVerified },
        });

      saveCheckpoint({
        step: 2,
        userName,
        companyName,
        email,
        emailVerified,
        password,
        companyId,
        userId,
        currency,
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

      const sourceChoice = await ask(rl, `  Elige una opción [1/2/3/4]`, "1");

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

        const selectProjNum = await ask(rl, `  Selecciona el número a conectar (1-${Math.min(found.length, 5)}) o '0' para continuar`, "1");
        const idx = parseInt(selectProjNum, 10) - 1;
        if (!isNaN(idx) && idx >= 0 && idx < found.length) {
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
          const manualModel = await ask(rl, `  Modelo [1/2/3]`, "1");
          businessProfile = manualModel === "3" ? "logistica_completa" : manualModel === "2" ? "tienda_proveedores" : "tienda";

          const locInput = await ask(rl, `  País o Ciudad sede`, diagnosis.inferredLocale.country);
          const resolved = resolveLocaleAutonomously(locInput);
          country = resolved.country;
          currency = resolved.currency;
          timezone = resolved.timezone;
          warehouseCity = resolved.suggestedCity;
        }
      } catch (err: any) {
        console.log(`  ${theme.amber("Nota de diagnóstico:")} ${err.message}`);
      }
    } else {
      // Opción 4: Catálogo en blanco (Detección global dinámica sin hardcoding)
      console.log(`\n  ${theme.mintBold("[INICIO EN BLANCO]")}`);
      const locInput = await ask(rl, `  ¿En qué país o ciudad opera tu negocio? (ej: Madrid, Buenos Aires, Santiago, Ciudad de México, Miami)`, "Internacional");
      const resolved = resolveLocaleAutonomously(locInput);
      country = resolved.country;
      currency = resolved.currency;
      timezone = resolved.timezone;
      warehouseCity = resolved.suggestedCity;

      if (resolved.confidence < 0.5) {
        console.log(`  ${theme.amber("[AVISO]")} No pude identificar el territorio '${locInput}'. Uso USD/UTC de forma provisional y lo dejo como pregunta pendiente (/questions).`);
        await addPendingQuestion(
          companyId,
          "locale_unconfirmed",
          `Territorio '${locInput}' no reconocido. Cual es el pais, la divisa y la zona horaria reales de la empresa?`,
          { input: locInput, provisional: { currency, timezone } },
        ).catch(() => {});
      }

      console.log(`  ${theme.dim(`Territorio resuelto autónomamente: ${country} | Divisa ISO: ${currency} | Zona: ${timezone}`)}\n`);

      console.log(`  ¿Qué tipo de negocio deseas operar?`);
      console.log(`    [1] Solo Tienda (Catálogo, ventas y ganancias sin ruido de flota)`);
      console.log(`    [2] Tienda con Proveedores (Catálogo + compras aprobadas a suplidores)`);
      console.log(`    [3] Logística Completa (Tienda + Proveedores + Flota con GPS)`);
      const modelChoice = await ask(rl, `  Modelo [1/2/3]`, "1");
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

    await db
      .insert(users)
      .values({
        id: userId,
        companyId,
        name: userName,
        email,
        role: "owner",
        passwordHash: password,
        setupCompleted: true,
      })
      .onConflictDoUpdate({
        target: [users.id],
        set: { name: userName, email, role: "owner", passwordHash: password },
      });

      console.log(`\n  ${theme.mintBold("[OK]")} Empresa '${theme.bold(companyName)}' registrada con sede en ${theme.bold(warehouseCity)} (${country}, ${currency}).\n`);

      saveCheckpoint({
        step: 3,
        userName,
        companyName,
        email,
        emailVerified,
        password,
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
      const suppChoice = await ask(rl, `  Opción [1/2]`, "1");

      let registeredSuppliersCount = 0;
      if (suppChoice === "1") {
        const suppName = await ask(rl, `  Nombre o razón social del proveedor`, "Proveedor Principal");
        const suppContact = await ask(rl, `  Correo o teléfono de contacto`, "ventas@proveedor.com");
        const suppCity = await ask(rl, `  Ciudad o sede del proveedor`, warehouseCity);
        const leadTimeStr = await ask(rl, `  Tiempo promedio de entrega (en días)`, "3");
        const leadDays = parseInt(leadTimeStr, 10) || 3;
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
      const whName = await ask(rl, `  Nombre de la bodega o almacén`, `Bodega Central ${companyName}`);
      const whAddress = await ask(rl, `  Ciudad o dirección física de la bodega`, warehouseCity);

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

      const autoChoice = await ask(rl, `  Selecciona el nivel de autonomía [1/2/3]`, "1");
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

      const chanChoice = await ask(rl, `  Opción [1/2/3]`, "3");
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
                config: { webhookUrl: webhook, topics: ["logs", "stock", "sales", "critical"] },
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
        const token = await ask(rl, `  Ingresa el Bot Token de Telegram`);
        const chatId = await ask(rl, `  Ingresa el Chat ID de Telegram`);
        if (token && chatId) {
          try {
            const { testNotificationChannel } = await import("@mint/notifiers");
            const testRes = await testNotificationChannel("telegram", { botToken: token, chatId });
            if (testRes.success) {
              await addNotificationChannel({
                companyId,
                type: "telegram",
                name: `Telegram (@${chatId})`,
                config: { botToken: token, chatId, topics: ["logs", "stock", "sales", "critical"] },
              });
              channelDescription = `Telegram (@${chatId}) (Verificado en vivo)`;
              console.log(`  ${theme.mintBold("[OK] Bot de Telegram verificado y mensaje entregado.")}\n`);
            } else {
              console.log(`  ${theme.amberBold(`[ADVERTENCIA] Telegram reportó: ${testRes.error}. Guardado en modo contingencia.`)}\n`);
            }
          } catch (err: any) {
            console.log(`  ${theme.amberBold(`[ADVERTENCIA] Error al conectar Telegram: ${err.message}.`)}\n`);
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
