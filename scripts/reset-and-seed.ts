import { db, pool } from "../src/db/client";
import { sql } from "drizzle-orm";
import {
  products,
  inventory,
  warehouses,
  suppliers,
  companies,
  users,
  businessConfig,
  notificationChannels,
} from "../packages/core/src/index";
import { extractProductsFromSqlFile, extractSuppliersFromSqlFile } from "../packages/ingest/src/projectDiscovery";
import { saveSession } from "../packages/cli/src/keychain";
import path from "node:path";
import fs from "node:fs";

async function main() {
  console.log("=== REINICIANDO BASE DE DATOS Y APLICACIÓN MINT ===");

  // 1. Limpieza total de tablas
  console.log("[1/5] Limpiando tablas en PostgreSQL (0 datos de prueba)...");
  await db.execute(sql`
    TRUNCATE TABLE 
      inventory, products, warehouses, suppliers, supplier_products, 
      sales_history, shipments, cases, case_events, llm_calls, tool_calls, 
      idempotency_keys, approvals, decisions, notification_channels,
      users, companies, business_config 
    CASCADE
  `);

  const companyId = "comp_my_logistics_co_";
  const companyName = "My Logistics Co.";
  const userEmail = "dalej@gmail.com";
  const userName = "Dale";

  // 2. Crear empresa y usuario activos
  console.log("[2/5] Creando empresa 'My Logistics Co.' y usuario 'Dale'...");
  await db.insert(companies).values({
    id: companyId,
    name: companyName,
    slug: "my-logistics-co",
  });

  await db.insert(users).values({
    id: "usr_dale",
    companyId,
    email: userEmail,
    name: userName,
    role: "owner",
    setupCompleted: true,
  });

  await db.insert(warehouses).values({
    id: `alm_central_${companyId}`,
    companyId,
    name: "Almacén Central Operativo",
    location: "Bahía Principal",
  });

  await db.insert(businessConfig).values([
    {
      companyId,
      key: "approval_limit_amount",
      value: "10000.00",
      description: "Límite de compra autónomo",
    },
    {
      companyId,
      key: "autonomy_level",
      value: "dry-run",
      description: "Nivel de autonomía supervisado con Human-in-the-Loop",
    },
  ]);

  // 3. Extraer e insertar productos y proveedores reales desde Opus Rentals
  console.log("[3/5] Extrayendo catálogo 100% real desde Opus Rentals (02_data.sql)...");
  const potentialPaths = [
    "C:/Users/dalej/OneDrive/Documents/opus-rentals/database/init/02_data.sql",
    path.resolve(process.cwd(), "../opus-rentals/database/init/02_data.sql"),
  ];

  const sqlFile = potentialPaths.find((p) => fs.existsSync(p));
  if (!sqlFile) {
    throw new Error("No se encontró el archivo 02_data.sql de Opus Rentals");
  }

  const realItems = extractProductsFromSqlFile(sqlFile);
  const realSuppliers = extractSuppliersFromSqlFile(sqlFile);

  console.log(`      -> ${realItems.length} herramientas reales extraídas.`);
  console.log(`      -> ${realSuppliers.length} proveedores homologados extraídos.`);

  // Insertar proveedores
  for (const s of realSuppliers) {
    const suppId = `supp_${s.name.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 30)}_${companyId}`;
    await db
      .insert(suppliers)
      .values({
        id: suppId,
        companyId,
        name: s.name,
        origin: "real",
      })
      .onConflictDoNothing();
  }

  // Insertar productos e inventario
  for (const item of realItems) {
    const prodId = `prod_${item.sku.toLowerCase().replace(/[^a-z0-9_]/g, "_")}`;
    await db.insert(products).values({
      id: prodId,
      companyId,
      sku: item.sku,
      name: item.name,
      category: item.category,
      minStock: item.minStock,
      origin: "real",
    });

    await db.insert(inventory).values({
      id: `inv_${companyId}_${prodId}`,
      companyId,
      productId: prodId,
      warehouseId: `alm_central_${companyId}`,
      stock: item.stock,
    });
  }

  // 4. Configurar canal de alerta inicial
  console.log("[4/5] Configurando canal de notificaciones...");
  await db.insert(notificationChannels).values({
    id: `chan_gmail_${companyId}`,
    companyId,
    type: "gmail",
    name: `Alertas Gmail (${userEmail})`,
    config: { email: userEmail, topics: ["logs", "stock", "logistics", "critical"] },
    active: true,
  });

  // 5. Guardar sesión activa en Keychain del CLI
  console.log("[5/5] Actualizando sesión local cifrada en Keychain (~/.mint/session.enc)...");
  await saveSession({
    token: `token_${Date.now()}_clean`,
    userId: "usr_dale",
    email: userEmail,
    name: userName,
    role: "owner",
    companyId,
    companyName,
    savedAt: new Date().toISOString(),
  });

  console.log("\n✔ BASE DE DATOS Y APLICACIÓN REINICIADAS CON ÉXITO.");
  console.log(`  Empresa:     ${companyName} (${companyId})`);
  console.log(`  Usuario:     ${userName} <${userEmail}>`);
  console.log(`  Catálogo:    ${realItems.length} herramientas reales cargadas.`);
  console.log(`  Proveedores: ${realSuppliers.length} proveedores registrados.`);
  console.log(`  Canales:     Gmail (${userEmail}) + Mint Desktop App.\n`);

  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Error al reiniciar base de datos:", err);
  process.exit(1);
});
