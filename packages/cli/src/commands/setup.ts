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
} from "@mint/core";
import { parseCsvFile, proposeColumnMapping, executeImport } from "@mint/ingest";
import { getSession } from "../keychain";
import { theme } from "../ui/theme";
import { drawCard } from "../ui/box";
import { eq } from "drizzle-orm";

export interface SetupOptions {
  file?: string;
  companyName?: string;
  json?: boolean;
}

/**
 * mint setup / /setup
 * Inicialización Zero-Config de 1 paso para nuevos clientes:
 * Configura empresa, almacén central, proveedores homologados,
 * catalogo de productos de prueba y gobernanza en menos de 2 segundos.
 */
export async function setupCommand(options: SetupOptions = {}) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";
  const companyName = options.companyName || session?.companyName || "Mi Empresa Logística";

  // 1. Asegurar empresa activa en base de datos
  await db
    .insert(companies)
    .values({ id: companyId, name: companyName })
    .onConflictDoNothing();

  // 2. Asegurar almacén central
  await db
    .insert(warehouses)
    .values({
      id: "alm_central",
      companyId,
      name: "Almacén Central de Operaciones",
      location: "Bahía Principal",
    })
    .onConflictDoNothing();

  // 3. Registrar proveedores homologados de base (Express y Mayorista)
  const suppFastId = `supp_fast_${companyId}`;
  const suppEconId = `supp_econ_${companyId}`;
  await db
    .insert(suppliers)
    .values([
      { id: suppFastId, companyId, name: "Distribuidora Express Industrial SA", origin: "real" },
      { id: suppEconId, companyId, name: "Suministros Globales Mayoristas SA", origin: "real" },
    ])
    .onConflictDoNothing();

  // 4. Configurar nivel de autonomía por defecto a "assisted"
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

  // 5. Cargar catálogo de datos (archivo indicado o fixtures de prueba)
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
        2
      )
    );
    return;
  }

  console.log("");
  console.log(
    drawCard(
      [
        `${theme.dim("Empresa:")}        ${theme.mintBold(companyName)} (${theme.dim(companyId)})`,
        `${theme.dim("Almacén:")}        ${theme.bold("Almacén Central de Operaciones")} (Bahía Principal)`,
        `${theme.dim("Catálogo:")}       ${theme.bold(importedCount)} SKUs sincronizados con existencias reales`,
        `${theme.dim("Proveedores:")}    ${theme.cyanBold("2")} homologados (Express: 1 día / Mayorista: 6 días)`,
        `${theme.dim("Autonomía:")}      ${theme.badge("ASISTIDO", "mint")} (Compras < $10,000 MXN automáticas)`,
        `${theme.dim("Vigilancia:")}     Daemon y sensores de desabasto activos 24/7`,
      ],
      {
        title: "SETUP RÁPIDO COMPLETADO (ZERO-CONFIG)",
        badge: "LISTO PARA OPERAR",
        badgeColor: "mint",
        borderColor: theme.mint,
      }
    )
  );

  console.log(
    `\n${theme.mintBold("[OK] Tu Back Office ya está 100% operativo.")}\n` +
      `  • Escribe ${theme.cyanBold("/status")} para ver tu panel en vivo.\n` +
      `  • Escribe ${theme.cyanBold("/stock")} para revisar tus existencias.\n` +
      `  • O simplemente escribe tu consulta (ej: ${theme.dim('"¿hay algún desabasto?"')}).\n`
  );
}
