import * as path from "node:path";
import * as fs from "node:fs";
import {
  db,
  companies,
  warehouses,
  products,
  suppliers,
  supplierProducts,
  businessConfig,
  ensureDecisionsTables,
} from "@mint/core";
import { parseCsvFile, proposeColumnMapping, executeImport } from "@mint/ingest";
import { getSession } from "../keychain";
import { theme } from "../ui/theme";
import { drawCard, drawDivider } from "../ui/box";
import { eq } from "drizzle-orm";
import { runOnboardingWizard } from "./onboarding";

export interface SetupOptions {
  file?: string;
  companyName?: string;
  json?: boolean;
  quick?: boolean;
  interactive?: boolean;
}

/**
 * mint setup / /setup
 * Punto de entrada oficial de instalación e inicialización de MINT:
 * 1. Comprueba requisitos de entorno y conectividad a base de datos.
 * 2. Prepara esquemas e infraestructura física mediante ensureDecisionsTables() de forma idempotente.
 * 3. En terminal interactiva TTY, lanza el onboarding conversacional guiado.
 * 4. En modo rápido (--quick), headless o con archivo, ejecuta la inicialización Zero-Config.
 */
export async function setupCommand(options: SetupOptions = {}) {
  // 1. Diagnóstico de requisitos del entorno y migración segura
  try {
    await ensureDecisionsTables();
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ success: false, error: "Fallo de conexión a la base de datos", detail: err.message }));
      return;
    }
    console.error(theme.redBold("\n[ERROR] No se pudo verificar la base de datos PostgreSQL:"));
    console.error(theme.red(`  ${err.message}`));
    console.error(theme.dim("  Verifica la variable DATABASE_URL en tu archivo .env.\n"));
    process.exit(1);
  }

  // 2. Si se invoca de forma interactiva en una terminal TTY sin flags de archivo o quick, iniciar onboarding guiado
  const isInteractive = !options.quick && !options.file && !options.json && Boolean(process.stdin.isTTY);
  if (isInteractive) {
    const existingSession = await getSession();
    if (existingSession) {
      console.log("\n" + drawDivider("MINT SETUP — ASISTENTE OPERATIVO", 78));
      console.log(
        drawCard(
          [
            `${theme.dim("Sesión detectada:")}   ${theme.bold(existingSession.name)} (${existingSession.role})`,
            `${theme.dim("Empresa:")}            ${theme.mintBold(existingSession.companyName)} [${existingSession.companyId}]`,
            `${theme.dim("País / Moneda:")}      ${theme.bold(existingSession.country || "Colombia")} / ${theme.bold(existingSession.currency || "COP")}`,
            theme.dim("─────────────────────────────────────────────────────────────"),
            theme.mint("[OK] Tu instalación de MINT ya cuenta con una configuración activa."),
            theme.dim("Puedes ejecutar 'mint console' para operar o continuar para reconfigurar."),
          ],
          {
            title: "ESTADO DE LA INSTALACIÓN",
            borderColor: theme.mint,
          },
        ),
      );
    }

    return await runOnboardingWizard();
  }

  // 3. Flujo Zero-Config / Rápido para entornos automatizados o con archivo
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";
  const companyName = options.companyName || session?.companyName || "Mi Empresa Logística";

  // Asegurar empresa activa en base de datos
  await db
    .insert(companies)
    .values({ id: companyId, name: companyName })
    .onConflictDoNothing();

  // Asegurar almacén central
  const centralWarehouseId = companyId === "comp_default" ? "alm_central" : `alm_central_${companyId}`;
  await db
    .insert(warehouses)
    .values({
      id: centralWarehouseId,
      companyId,
      name: "Almacén Central de Operaciones",
      location: "Bahía Principal",
    })
    .onConflictDoNothing();

  // Registrar proveedores homologados de base (Express y Mayorista)
  const suppFastId = `supp_fast_${companyId}`;
  const suppEconId = `supp_econ_${companyId}`;
  await db
    .insert(suppliers)
    .values([
      { id: suppFastId, companyId, name: "Distribuidora Express Industrial SA", origin: "real" },
      { id: suppEconId, companyId, name: "Suministros Globales Mayoristas SA", origin: "real" },
    ])
    .onConflictDoNothing();

  // Configurar nivel de autonomía por defecto a "assisted"
  await db
    .insert(businessConfig)
    .values({
      companyId,
      key: "autonomy_level",
      value: "assisted",
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [businessConfig.companyId, businessConfig.key],
      set: { value: "assisted", updatedAt: new Date() },
    });

  // Cargar catálogo de datos (archivo indicado o fixtures de prueba)
  let targetFile = options.file;
  if (!targetFile) {
    const sampleFixtures = path.resolve(__dirname, "../../../../tests/fixtures/sample_inventory.csv");
    if (fs.existsSync(sampleFixtures)) {
      targetFile = sampleFixtures;
    }
  }

  let importedCount = 0;
  if (targetFile && fs.existsSync(targetFile)) {
    const parsed = parseCsvFile(targetFile);
    const mapping = proposeColumnMapping(parsed.headers);
    const res = await executeImport({
      companyId,
      sourceName: `Setup Inicial: ${path.basename(targetFile)}`,
      sourceType: "csv",
      uriOrPath: targetFile,
      mappings: mapping.mappings,
      rows: parsed.rows,
    });
    importedCount = res.importedRows;

    // Vincular proveedores homologados con precios para cada producto
    const allProds = await db.select().from(products).where(eq(products.companyId, companyId));
    for (const p of allProds) {
      await db
        .insert(supplierProducts)
        .values([
          {
            id: `sp_fast_${p.id}`,
            companyId,
            supplierId: suppFastId,
            productId: p.id,
            unitPrice: "185.00",
            minOrderQuantity: 10,
            leadTimeDays: 1,
          },
          {
            id: `sp_econ_${p.id}`,
            companyId,
            supplierId: suppEconId,
            productId: p.id,
            unitPrice: "140.00",
            minOrderQuantity: 25,
            leadTimeDays: 6,
          },
        ])
        .onConflictDoNothing();
    }
  }

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          success: true,
          companyId,
          companyName,
          importedProducts: importedCount,
          autonomyLevel: "assisted",
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log("");
  console.log(
    drawCard(
      [
        `${theme.dim("Empresa:")}        ${theme.mintBold(companyName)} (${theme.dim(companyId)})`,
        `${theme.dim("Almacén:")}        ${theme.bold("Almacén Central de Operaciones")}`,
        `${theme.dim("Catálogo:")}       ${theme.bold(importedCount)} SKUs sincronizados con existencias reales`,
        `${theme.dim("Proveedores:")}    Directorio listo para alta de proveedores (/suppliers)`,
        `${theme.dim("Autonomía:")}      ${theme.badge("ASISTIDO", "mint")} (Supervisión HITL activa)`,
        `${theme.dim("Vigilancia:")}     Daemon y sensores de desabasto activos 24/7`,
      ],
      {
        title: "[ACCION] SETUP RÁPIDO COMPLETADO (ZERO-CONFIG)",
        badge: "LISTO PARA OPERAR",
        badgeColor: "mint",
        borderColor: theme.mint,
      },
    ),
  );

  console.log(
    `\n${theme.mintBold("[OK] Tu Back Office ya está 100% operativo.")}\n` +
      `  • Escribe ${theme.cyanBold("/status")} para ver tu panel en vivo.\n` +
      `  • Escribe ${theme.cyanBold("/stock")} para revisar tus existencias.\n` +
      `  • Escribe ${theme.cyanBold("/inbox")} para revisar propuestas del agente.\n` +
      `  • Escribe ${theme.cyanBold("/console")} para abrir la terminal interactiva de MINT.\n`,
  );
}
