import { db, products, inventory, warehouses } from "../packages/core/src/index";
import { extractProductsFromSqlFile } from "../packages/ingest/src/projectDiscovery";
import { eq } from "drizzle-orm";
import path from "node:path";
import fs from "node:fs";

async function main() {
  const companyId = process.argv[2] || "comp_my_logistics_co_";
  console.log(`[Sync] Resyncing catalog for company: ${companyId}`);

  // Find 02_data.sql or opus-rentals
  const potentialPaths = [
    "C:/Users/dalej/OneDrive/Documents/opus-rentals/database/init/02_data.sql",
    path.resolve(process.cwd(), "../opus-rentals/database/init/02_data.sql"),
  ];

  const sqlFile = potentialPaths.find((p) => fs.existsSync(p));
  if (!sqlFile) {
    console.error("SQL file 02_data.sql not found!");
    process.exit(1);
  }

  console.log(`[Sync] Found SQL source: ${sqlFile}`);
  const realItems = extractProductsFromSqlFile(sqlFile);
  console.log(`[Sync] Extracted ${realItems.length} real products.`);

  // Clean old products and inventory for this company
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
        set: { stock: item.stock },
      });
  }

  console.log(`[Sync] Successfully synced ${realItems.length} real products into PostgreSQL for ${companyId}!`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Error in sync:", err);
  process.exit(1);
});
