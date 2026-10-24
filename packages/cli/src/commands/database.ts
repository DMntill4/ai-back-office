import {
  db,
  companies,
  products,
  inventory,
  suppliers,
  supplierProducts,
  warehouses,
  dataSources,
  checkDatabaseHealth,
  geocodeAddressOrCity,
} from "@mint/core";
import {
  extractProductsFromSqlFile,
  extractSuppliersFromSqlFile,
  scanLocalWorkspaceProjects,
  parseCsvFile,
  proposeColumnMappingWithAI,
  syncDataSource,
} from "@mint/ingest";
import { eq, desc } from "drizzle-orm";
import { getSession } from "../keychain";
import { theme } from "../ui/theme";
import { drawDivider, drawCard } from "../ui/box";
import * as readline from "node:readline";
import * as path from "node:path";
import * as fs from "node:fs";

function ask(rl: readline.Interface, question: string, defaultValue?: string): Promise<string> {
  const promptText = defaultValue ? `${question} [${theme.mint(defaultValue)}]: ` : `${question}: `;
  return new Promise((resolve) => {
    rl.question(promptText, (answer) => {
      resolve(answer.trim() || defaultValue || "");
    });
  });
}

export async function databaseCommand(args: string[] = []) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";
  const sub = (args[0] || "menu").toLowerCase();

  if (sub === "status") {
    await showDbStatus(companyId);
    return;
  }

  if (sub === "sync" || sub === "resync") {
    await resyncCurrentProject(companyId);
    return;
  }

  if (sub === "switch") {
    await switchDatabaseMenu(companyId);
    return;
  }

  // Interactive menu
  console.log("\n" + drawDivider(`GESTION DE BASE DE DATOS Y CATALOGO [${companyId}]`, 84));
  console.log(`  ${theme.bold("Selecciona una opcion:")}`);
  console.log(`    ${theme.mintBold("[1] Re-sincronizar catalogo actual")} (Usa tu fuente activa o auto-descubrimiento IA)`);
  console.log(`    ${theme.cyanBold("[2] Cambiar / Conectar otra base de datos o archivo")} (.sql, .csv, .xlsx, .sqlite, Postgres)`);
  console.log(`    ${theme.dim("[3] Ver estado de conexion y metricas de tablas")}`);
  console.log(`    ${theme.dim("[4] Volver")}\n`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const choice = await ask(rl, "  Opcion", "1");
    if (choice === "1") {
      rl.close();
      await resyncCurrentProject(companyId);
    } else if (choice === "2") {
      rl.close();
      await switchDatabaseMenu(companyId);
    } else if (choice === "3") {
      rl.close();
      await showDbStatus(companyId);
    } else {
      rl.close();
    }
  } catch (err: any) {
    rl.close();
    console.error(theme.redBold(`[ERROR] ${err.message}`));
  }
}

async function showDbStatus(companyId: string) {
  const health = await checkDatabaseHealth();
  let prods: any[] = [];
  let supps: any[] = [];
  let sources: any[] = [];

  if (health.connected) {
    try {
      prods = await db.select().from(products).where(eq(products.companyId, companyId));
      supps = await db.select().from(suppliers).where(eq(suppliers.companyId, companyId));
      sources = await db.select().from(dataSources).where(eq(dataSources.companyId, companyId));
    } catch {}
  }

  console.log("\n" + drawDivider(`ESTADO DE CONEXIÓN A BASE DE DATOS [${companyId}]`, 84));
  console.log(
    drawCard(
      [
        `${theme.dim("Motor de Base de Datos:")}  PostgreSQL (Drizzle ORM)`,
        `${theme.dim("Estado de Conexión:")}     ${health.connected ? theme.badge("ONLINE", "mint") : theme.badge("OFFLINE", "red")}`,
        `${theme.dim("Empresa Activa:")}          ${theme.bold(companyId)}`,
        `${theme.dim("Productos en Catálogo:")}   ${theme.bold(prods.length)} registrados en base de datos`,
        `${theme.dim("Proveedores Registrados:")} ${theme.bold(supps.length)}`,
        `${theme.dim("Fuentes Sincronizadas:")}   ${sources.length > 0 ? sources.map((s) => path.basename(s.uriOrPath)).join(", ") : "Ninguna fuente externa sincronizada"}`,
        `${theme.dim("Latencia Relacional:")}     ${health.connected ? theme.mint(`${health.latencyMs ?? 15}ms`) : theme.dim("N/A")}`,
      ],
      {
        title: "DRIZZLE & POSTGRESQL ENGINE",
        borderColor: theme.mint,
      },
    ),
  );
  console.log("");
}

/**
 * Importa universalmente un archivo .sql o .csv para la empresa activa,
 * hidratando productos, inventario, proveedores, precios (supplier_products) y almacén con GPS.
 */
export async function importUniversalCatalogFile(
  companyId: string,
  filePath: string,
): Promise<{ importedProducts: number; importedSuppliers: number }> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".csv") {
    const parsed = parseCsvFile(filePath);
    const mapping = await proposeColumnMappingWithAI(parsed.headers, parsed.rows.slice(0, 3));
    const syncRes = await syncDataSource({
      companyId,
      sourceName: path.basename(filePath),
      sourceType: "csv",
      uriOrPath: filePath,
      currentHeaders: parsed.headers,
      rows: parsed.rows,
      explicitMappings: mapping.mappings,
      forceAcceptDrift: true,
    });
    return { importedProducts: syncRes.importedRows, importedSuppliers: 0 };
  }

  // Archivo SQL
  const realItems = extractProductsFromSqlFile(filePath);
  const realSuppliers = extractSuppliersFromSqlFile(filePath);

  if (realItems.length === 0) {
    return { importedProducts: 0, importedSuppliers: 0 };
  }

  // Asegurar almacén central con coordenadas GPS reales basadas en la empresa
  const [companyRow] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  const companyCity = companyRow?.city || "Bucaramanga";
  const companyCountry = companyRow?.country || "Colombia";
  const defaultGeo = await geocodeAddressOrCity(companyCity).catch(() => null);

  await db
    .insert(warehouses)
    .values({
      id: `alm_central_${companyId}`,
      companyId,
      name: "Almacén Central Operativo",
      location: `${companyCity}, ${companyCountry}`,
      city: defaultGeo?.city || companyCity,
      state: defaultGeo?.state || "Santander",
      country: defaultGeo?.country || companyCountry,
      latitude: defaultGeo ? String(defaultGeo.latitude) : "7.1193",
      longitude: defaultGeo ? String(defaultGeo.longitude) : "-73.1227",
    })
    .onConflictDoNothing();

  // Registrar proveedores extraídos (o proveedor general si el SQL no tiene tabla de proveedores)
  const supplierIds: string[] = [];
  for (const s of realSuppliers) {
    const suppSlug = s.name.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 24);
    const suppId = `supp_${suppSlug}_${companyId}`.slice(0, 55);
    const suppGeo = s.city ? await geocodeAddressOrCity(s.city).catch(() => null) : null;
    await db
      .insert(suppliers)
      .values({
        id: suppId,
        companyId,
        name: s.name,
        email: s.email || `ventas@${suppSlug}.com`,
        streetAddress: s.city || "Parque Industrial",
        city: suppGeo?.city || s.city || "Centro de Distribución",
        state: suppGeo?.state || null,
        country: suppGeo?.country || null,
        latitude: suppGeo ? String(suppGeo.latitude) : null,
        longitude: suppGeo ? String(suppGeo.longitude) : null,
        origin: "real",
      })
      .onConflictDoNothing();
    supplierIds.push(suppId);
  }

  const fallbackSupplierId = `supp_direct_${companyId}`;
  if (supplierIds.length === 0) {
    await db
      .insert(suppliers)
      .values({
        id: fallbackSupplierId,
        companyId,
        name: "Compra Directa / Licitación Abierta (RFQ)",
        email: "compras@proveedor-directo.local",
        streetAddress: "Parque Industrial de Suministros",
        city: companyCity,
        origin: "real",
      })
      .onConflictDoNothing();
    supplierIds.push(fallbackSupplierId);
  }

  for (let i = 0; i < realItems.length; i++) {
    const item = realItems[i];
    const prodId = `prod_${item.sku.toLowerCase().replace(/[^a-z0-9_]/g, "_")}`;

    await db
      .insert(products)
      .values({
        id: prodId,
        companyId,
        sku: item.sku,
        name: item.name,
        category: item.category,
        minStock: item.minStock,
        origin: "real",
      })
      .onConflictDoUpdate({
        target: [products.companyId, products.sku],
        set: { name: item.name, category: item.category, minStock: item.minStock },
      });

    await db
      .insert(inventory)
      .values({
        id: `inv_${companyId}_${prodId}`,
        companyId,
        productId: prodId,
        warehouseId: `alm_central_${companyId}`,
        stock: item.stock,
      })
      .onConflictDoUpdate({
        target: inventory.id,
        set: { stock: item.stock, updatedAt: new Date() },
      });

    // Vincular precio extraído con supplier_products para que Compras y Consolidación operen al 100%
    const assignedSupplierId = supplierIds[i % supplierIds.length];
    const spId = `sp_${prodId}_${assignedSupplierId}`.slice(0, 60);
    await db
      .insert(supplierProducts)
      .values({
        id: spId,
        companyId,
        supplierId: assignedSupplierId,
        productId: prodId,
        unitPrice: (item.price || 150).toFixed(2),
        leadTimeDays: 3,
        minOrderQuantity: Math.max(2, item.minStock),
      })
      .onConflictDoNothing();
  }

  // Registrar en dataSources para futuras re-sincronizaciones sin hardcodes
  const existingDs = await db
    .select()
    .from(dataSources)
    .where(eq(dataSources.companyId, companyId))
    .limit(1);

  if (existingDs.length === 0) {
    await db
      .insert(dataSources)
      .values({
        id: `src_${companyId.slice(0, 12)}`,
        companyId,
        name: path.basename(filePath),
        sourceType: "sqlite",
        uriOrPath: filePath,
        config: { status: "HEALTHY", syncCount: 1 },
        isActive: true,
        lastSyncedAt: new Date(),
      })
      .catch(() => {});
  } else {
    await db
      .update(dataSources)
      .set({ uriOrPath: filePath, name: path.basename(filePath), lastSyncedAt: new Date() })
      .where(eq(dataSources.id, existingDs[0].id))
      .catch(() => {});
  }

  return { importedProducts: realItems.length, importedSuppliers: realSuppliers.length };
}

export async function resyncCurrentProject(companyId: string) {
  console.log(`\n${theme.mint("Iniciando sincronizacion inteligente de catalogo...")}`);

  // 1. Buscar la fuente registrada en dataSources para esta empresa
  let targetFile = "";
  const registeredSources = await db
    .select()
    .from(dataSources)
    .where(eq(dataSources.companyId, companyId))
    .orderBy(desc(dataSources.lastSyncedAt));

  for (const src of registeredSources) {
    if (src.uriOrPath && fs.existsSync(src.uriOrPath)) {
      targetFile = src.uriOrPath;
      break;
    }
  }

  // 2. Si no hay fuente registrada en dataSources, escanear dinámicamente los proyectos del workspace
  if (!targetFile) {
    const discovered = scanLocalWorkspaceProjects();
    for (const proj of discovered) {
      const dataSql = proj.sqlFiles.find((f) => fs.existsSync(f) && extractProductsFromSqlFile(f).length > 0);
      if (dataSql) {
        targetFile = dataSql;
        break;
      }
    }
  }

  if (!targetFile) {
    console.log(theme.amber("  No se encontro una fuente previa registrada para esta empresa."));
    console.log(theme.dim("  Abriendo selector interactivo de proyectos y bases de datos...\n"));
    await switchDatabaseMenu(companyId);
    return;
  }

  console.log(`  Sincronizando desde fuente activa: ${theme.mintBold(targetFile)}...`);
  const { importedProducts, importedSuppliers } = await importUniversalCatalogFile(companyId, targetFile);

  if (importedProducts === 0) {
    console.log(theme.redBold("  [ERROR] No se pudieron extraer productos validos del archivo."));
    return;
  }

  console.log(
    `  [OK] Catalogo sincronizado: ${theme.bold(importedProducts)} productos y ${theme.bold(importedSuppliers)} proveedores vinculados.`,
  );
  console.log(`  ${theme.dim("Ejecuta /stock o /logistics para ver tu torre de control actualizada.")}\n`);
}

async function switchDatabaseMenu(companyId: string) {
  console.log(`\n${theme.cyanBold("Escaneando proyectos y bases de datos en tu equipo...")}`);
  const localProjects = scanLocalWorkspaceProjects();

  console.log("\n" + drawDivider("CONECTAR OTRA BASE DE DATOS O PROYECTO", 84));

  if (localProjects.length > 0) {
    console.log(`  ${theme.mintBold("Proyectos detectados en tu equipo:")}`);
    localProjects.slice(0, 6).forEach((p, idx) => {
      const dbDetail = p.databaseName ? `[DB: ${p.databaseName}]` : p.sqlFiles.length ? `[${p.sqlFiles.length} scripts SQL]` : "";
      console.log(`    ${theme.cyanBold(`[#${idx + 1}]`)} ${theme.bold(p.projectName)} (${p.framework}) ${theme.dim(dbDetail)}`);
      console.log(`        Ruta: ${theme.dim(p.projectPath)}`);
    });
    console.log(`    ${theme.dim(`[#${localProjects.length + 1}] Ingresar ruta manual de archivo (.sql, .csv, .db, .sqlite)`)}`);
  } else {
    console.log(`  ${theme.dim("No se encontraron proyectos automaticamente.")}`);
    console.log(`    ${theme.mintBold("[#1]")} Ingresar ruta manual de archivo (.sql, .csv, .db, .sqlite)`);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const defaultOpt = "1";
    const selected = await ask(rl, "\n  Selecciona numero de proyecto o ruta", defaultOpt);
    const num = parseInt(selected, 10);

    let targetFile = "";
    if (!isNaN(num) && num >= 1 && num <= localProjects.length) {
      const proj = localProjects[num - 1];
      const validSql = proj.sqlFiles.find((f) => extractProductsFromSqlFile(f).length > 0) || proj.sqlFiles[0];
      if (validSql) {
        targetFile = validSql;
      } else {
        console.log(`\n  ${theme.amber("El proyecto")} ${proj.projectName} ${theme.amber("no tiene archivos .sql detectados.")}`);
      }
    } else if (fs.existsSync(selected)) {
      targetFile = selected;
    } else {
      const manualPath = await ask(rl, "  Ingresa ruta absoluta al archivo (.sql, .csv)");
      if (manualPath && fs.existsSync(manualPath)) {
        targetFile = manualPath;
      }
    }

    rl.close();

    if (targetFile && fs.existsSync(targetFile)) {
      console.log(`\n  Extrayendo catalogo e hidratando precios/logistica desde ${theme.mintBold(path.basename(targetFile))}...`);
      await db.delete(inventory).where(eq(inventory.companyId, companyId));
      await db.delete(products).where(eq(products.companyId, companyId));

      const { importedProducts, importedSuppliers } = await importUniversalCatalogFile(companyId, targetFile);
      if (importedProducts > 0) {
        console.log(
          `  [OK] Conexion actualizada: ${theme.bold(importedProducts)} productos y ${theme.bold(importedSuppliers)} proveedores cargados para ${companyId}.\n`,
        );
      } else {
        console.log(theme.amber("No se encontraron tablas de inventario validas en el archivo seleccionado.\n"));
      }
    } else {
      console.log(theme.dim("Operacion cancelada o ruta no valida.\n"));
    }
  } catch (err: any) {
    rl.close();
    console.error(theme.redBold(`[ERROR] ${err.message}`));
  }
}
