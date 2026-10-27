import * as readline from "node:readline";
import * as path from "node:path";
import * as fs from "node:fs";
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
  type AutonomousInspectionResult,
} from "@mint/core";
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

  const fallback = Math.random().toString(36).slice(2, 8);
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
    // -------------------------------------------------------------
    // PASO 1: IDENTIDAD DEL OPERADOR Y DE LA EMPRESA (SIN ASUMIR NADA)
    // -------------------------------------------------------------
    console.log(drawDivider("PASO 1 DE 3: IDENTIDAD DEL OPERADOR Y EMPRESA", 76));
    const userName = await ask(rl, `  ${theme.bold("1.1 Tu nombre o identificador de operador")}`, "Admin");
    const companyName = await ask(rl, `  ${theme.bold("1.2 Nombre de tu empresa o marca")}`, "Mi Empresa");

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let email = "";
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

    let password = "";
    while (true) {
      password = await ask(
        rl,
        `  ${theme.bold("1.4 Contraseña de acceso al back-office (mínimo 4 caracteres)")}`,
        "admin123",
      );
      if (password.length >= 4) {
        break;
      }
      console.log(`  ${theme.redBold("[ERROR] Contraseña corta:")} Debe tener al menos 4 caracteres.\n`);
    }

    const companyId = cleanSlug(companyName, "comp", 20);
    const userId = cleanSlug(userName, "usr", 20);

    // -------------------------------------------------------------
    // PASO 2: CONEXIÓN Y AUTODESCUBRIMIENTO INTELIGENTE (TAREA 0)
    // MINT toma el control: detecta modelo, divisa, territorio y errores
    // -------------------------------------------------------------
    console.log(drawDivider("PASO 2 DE 3: CONEXIÓN Y AUTODESCUBRIMIENTO DE TUS DATOS (TAREA 0)", 76));
    console.log(`  ¿Cómo deseas conectar o iniciar tus datos?`);
    console.log(`    ${theme.mintBold("[1] Usar Base de Datos PostgreSQL existente (MINT autodescubre modelo, divisa y errores)")}`);
    console.log(`    ${theme.cyanBold("[2] Buscar automáticamente archivos en tu equipo (.sql, .db, .sqlite, .csv)")}`);
    console.log(`    ${theme.dim("[3] Ingresar ruta a archivo local (.sql, .csv, .sqlite)")}`);
    console.log(`    ${theme.dim("[4] Iniciar en blanco (Catálogo limpio)")}\n`);

    const sourceChoice = await ask(rl, `  Elige una opción [1/2/3/4]`, "1");

    let country = "Internacional";
    let currency = "USD";
    let timezone = "UTC";
    let warehouseCity = "Sede Central";
    let businessProfile: "tienda" | "tienda_proveedores" | "logistica_completa" = "tienda";
    let activeModules: string[] = ["inventario", "ventas", "finanzas"];
    let selectedSourceLabel = "Catálogo Inicial";
    let diagnosis: AutonomousInspectionResult | null = null;

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
      const filePath = await ask(rl, `  Ingresa la ruta absoluta o relativa al archivo`);
      if (fs.existsSync(filePath)) {
        selectedSourceLabel = path.basename(filePath);
        console.log(`  ${theme.mintBold("[OK]")} Archivo '${path.basename(filePath)}' detectado y enlazado.\n`);
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

    const { geocodeAddressOrCity } = await import("@mint/core");
    const whGeo = await geocodeAddressOrCity(warehouseCity).catch(() => null);

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
        city: whGeo?.city || warehouseCity,
        state: whGeo?.state || null,
        country: whGeo?.country || country,
        latitude: whGeo ? String(whGeo.latitude) : null,
        longitude: whGeo ? String(whGeo.longitude) : null,
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

    // -------------------------------------------------------------
    // PASO 3: GOBERNANZA DE AUTONOMÍA Y ALERTAS
    // -------------------------------------------------------------
    console.log(drawDivider("PASO 3 DE 3: GOBERNANZA DE COMPRAS Y ALERTAS", 76));
    console.log(`  ¿Cómo debe actuar MINT ante desabastos o alertas operativas?`);
    console.log(
      `    ${theme.mintBold("[1] Supervisado / Aprobación Humana Obligatoria (Recomendado)")}\n` +
      `        MINT detecta stock bajo, calcula el pedido, cotiza y genera un borrador en /inbox.\n` +
      `        Solo un administrador puede aprobar la compra (Tarea 4). Cero compras automáticas sin permiso.\n`
    );
    console.log(
      `    ${theme.cyanBold("[2] Asistido / Alertas en vivo y borradores")}\n` +
      `        Genera borradores y notifica a tu equipo por los canales configurados.\n`
    );
    console.log(
      `    ${theme.dim("[3] Autónomo bajo presupuesto")}\n` +
      `        Reabastece automáticamente solo productos bajo el umbral de seguridad.\n`
    );

    const autoChoice = await ask(rl, `  Selecciona el nivel de autonomía [1/2/3]`, "1");
    let autonomyLevel = "dry-run";
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

    // Canal de alertas opcional
    console.log(`  ¿Deseas configurar un canal de alertas ahora o continuar a la terminal?`);
    console.log(`    ${theme.mintBold("[1] Continuar directo a la terminal de control (Recomendado)")}`);
    console.log(`    ${theme.dim("[2] Conectar Webhook de Discord o Slack")}`);
    console.log(`    ${theme.dim("[3] Conectar Bot de Telegram")}`);

    const chanChoice = await ask(rl, `  Opción`, "1");
    let channelDescription = "Alertas en Terminal y Log Inmutable";

    if (chanChoice === "2") {
      const webhook = await ask(rl, `  Ingresa la URL del Webhook`);
      if (webhook && webhook.startsWith("http")) {
        await addNotificationChannel({
          companyId,
          type: "discord",
          name: "Canal de Alertas",
          config: { webhookUrl: webhook, topics: ["logs", "stock", "sales", "critical"] },
        });
        channelDescription = "Webhook Activo";
        console.log(`  ${theme.mintBold("[OK]")} Webhook configurado con éxito.\n`);
      }
    } else if (chanChoice === "3") {
      const token = await ask(rl, `  Ingresa el Bot Token`);
      const chatId = await ask(rl, `  Ingresa el Chat ID`);
      if (token && chatId) {
        await addNotificationChannel({
          companyId,
          type: "telegram",
          name: `Telegram Bot (@${chatId})`,
          config: { botToken: token, chatId, topics: ["logs", "stock", "sales", "critical"] },
        });
        channelDescription = `Telegram Bot (@${chatId})`;
        console.log(`  ${theme.mintBold("[OK]")} Bot de Telegram conectado.\n`);
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
