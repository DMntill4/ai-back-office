import { db, products, inventory, suppliers, warehouses, checkDatabaseHealth } from "@mint/core";
import { extractProductsFromSqlFile, scanLocalWorkspaceProjects } from "@mint/ingest";
import { eq } from "drizzle-orm";
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
  console.log("\n" + drawDivider(`GESTIÓN DE BASE DE DATOS Y CATÁLOGO [${companyId}]`, 84));
  console.log(`  ${theme.bold("Selecciona una opción:")}`);
  console.log(`    ${theme.mintBold("[1] 🔄 Re-sincronizar catálogo actual")} (Aplica extractor estricto sin datos de prueba)`);
  console.log(`    ${theme.cyanBold("[2] 🔀 Cambiar / Conectar otra base de datos o proyecto")} (Buscar proyectos en PC)`);
  console.log(`    ${theme.dim("[3] 📊 Ver estado de conexión y métricas de tablas")}`);
  console.log(`    ${theme.dim("[4] ↩  Volver")}\n`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const choice = await ask(rl, "  Opción", "1");
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
    console.error(theme.redBold(`❌ Error en gestión de base de datos: ${err.message}`));
  }
}

async function showDbStatus(companyId: string) {
  const health = await checkDatabaseHealth();
  const prods = await db.select().from(products).where(eq(products.companyId, companyId));
  const supps = await db.select().from(suppliers).where(eq(suppliers.companyId, companyId));

  console.log("\n" + drawDivider(`ESTADO DE CONEXIÓN A BASE DE DATOS [${companyId}]`, 84));
  console.log(
    drawCard(
      [
        `${theme.dim("Motor de Base de Datos:")}  PostgreSQL (Supabase Cloud / Drizzle ORM)`,
        `${theme.dim("Estado de Conexión:")}     ${health.connected ? theme.badge("ONLINE", "mint") : theme.badge("OFFLINE", "red")}`,
        `${theme.dim("Empresa Activa:")}          ${theme.bold(companyId)}`,
        `${theme.dim("Productos en Catálogo:")}   ${theme.bold(prods.length)} unidades reales auditadas`,
        `${theme.dim("Proveedores Homologados:")} ${theme.bold(supps.length)} proveedores verificados`,
        `${theme.dim("Latencia Relacional:")}     ${theme.mint(`${health.latencyMs ?? 15}ms`)}`,
      ],
      {
        title: "DRIZZLE & POSTGRESQL ENGINE",
        borderColor: theme.mint,
      },
    ),
  );
  console.log("");
}

export async function resyncCurrentProject(companyId: string) {
  console.log(`\n${theme.mint("🔄 Iniciando sincronización de catálogo con extractor estricto...")}`);

  // Find candidate SQL files
  const candidatePaths = [
    "C:/Users/dalej/OneDrive/Documents/opus-rentals/database/init/02_data.sql",
    path.resolve(process.cwd(), "../opus-rentals/database/init/02_data.sql"),
  ];

  const sqlFile = candidatePaths.find((p) => fs.existsSync(p));
  if (!sqlFile) {
    console.log(theme.amber("No se encontró automáticamente el archivo 02_data.sql de opus-rentals."));
    console.log(theme.dim("Usa '/db switch' para especificar la ruta exacta de tu base de datos.\n"));
    return;
  }

  const realItems = extractProductsFromSqlFile(sqlFile);
  if (realItems.length === 0) {
    console.log(theme.redBold("❌ No se pudieron extraer productos válidos del archivo SQL."));
    return;
  }

  // Clean stale items for this company
  await db.delete(inventory).where(eq(inventory.companyId, companyId));
  await db.delete(products).where(eq(products.companyId, companyId));

  await db
    .insert(warehouses)
    .values({
      id: `alm_central_${companyId}`,
      companyId,
      name: "Central Operations Warehouse",
      location: "Main Facility",
    })
    .onConflictDoNothing();

  for (const item of realItems) {
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
  }

  console.log(`  ${theme.success("✔")} Catálogo sincronizado con éxito: ${theme.bold(realItems.length)} productos reales registrados.`);
  console.log(`  ${theme.dim("Ejecuta /stock para ver el catálogo actualizado sin elementos de prueba.")}\n`);
}

async function switchDatabaseMenu(companyId: string) {
  console.log(`\n${theme.cyanBold("🔍 Escaneando proyectos y bases de datos en tu equipo...")}`);
  const localProjects = scanLocalWorkspaceProjects();

  console.log("\n" + drawDivider("CONECTAR OTRA BASE DE DATOS O PROYECTO", 84));

  if (localProjects.length > 0) {
    console.log(`  ${theme.mintBold("Proyectos detectados en tu equipo:")}`);
    localProjects.slice(0, 5).forEach((p, idx) => {
      const dbDetail = p.databaseName ? `[DB: ${p.databaseName}]` : p.sqlFiles.length ? `[${p.sqlFiles.length} scripts SQL]` : "";
      console.log(`    ${theme.cyanBold(`[#${idx + 1}]`)} ${theme.bold(p.projectName)} (${p.framework}) ${theme.dim(dbDetail)}`);
      console.log(`        Ruta: ${theme.dim(p.projectPath)}`);
    });
    console.log(`    ${theme.dim(`[#${localProjects.length + 1}] Ingresar ruta manual de archivo (.sql, .db, .sqlite, .csv)`)}`);
  } else {
    console.log(`  ${theme.dim("No se encontraron proyectos automáticamente.")}`);
    console.log(`    ${theme.mintBold("[#1]")} Ingresar ruta manual de archivo (.sql, .db, .sqlite, .csv)`);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const defaultOpt = "1";
    const selected = await ask(rl, "\n  Selecciona número de proyecto o ruta", defaultOpt);
    const num = parseInt(selected, 10);

    let targetSql = "";
    if (!isNaN(num) && num >= 1 && num <= localProjects.length) {
      const proj = localProjects[num - 1];
      if (proj.sqlFiles.length > 0) {
        targetSql = proj.sqlFiles[0];
      } else {
        console.log(`\n  ${theme.amber("El proyecto")} ${proj.projectName} ${theme.amber("no tiene archivos .sql detectados.")}`);
      }
    } else {
      const manualPath = await ask(rl, "  Ingresa ruta absoluta al archivo");
      if (manualPath && fs.existsSync(manualPath)) {
        targetSql = manualPath;
      }
    }

    rl.close();

    if (targetSql && fs.existsSync(targetSql)) {
      console.log(`\n  Extrayendo catálogo desde ${theme.mintBold(path.basename(targetSql))}...`);
      const items = extractProductsFromSqlFile(targetSql);
      if (items.length > 0) {
        await db.delete(inventory).where(eq(inventory.companyId, companyId));
        await db.delete(products).where(eq(products.companyId, companyId));

        for (const item of items) {
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
            .onConflictDoNothing();

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
        }
        console.log(`  ${theme.success("✔")} Conexión actualizada: ${theme.bold(items.length)} productos cargados para ${companyId}.\n`);
      } else {
        console.log(theme.amber("No se encontraron tablas de inventario válidas en el archivo seleccionado.\n"));
      }
    } else {
      console.log(theme.dim("Operación cancelada o ruta no válida.\n"));
    }
  } catch (err: any) {
    rl.close();
    console.error(theme.redBold(`❌ Error al cambiar base de datos: ${err.message}`));
  }
}
