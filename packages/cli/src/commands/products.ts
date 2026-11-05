import { db, products } from "@mint/core";
import { getSession } from "../keychain";
import { theme } from "../ui/theme";
import { drawCard, drawDivider } from "../ui/box";
import { renderTable, type ColumnDef } from "../ui/table";
import { eq, or } from "drizzle-orm";

export async function productsCommand(action?: string, arg1?: string, ...rest: string[]) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";
  const sub = (action || "list").toLowerCase().trim();

  // 1. mint products add <sku> <nombre> [precio] [costo] [categoria]
  if (sub === "add" || sub === "nuevo") {
    const sku = arg1;
    const name = rest[0];
    const price = rest[1] || "0";
    const cost = rest[2] || "0";
    const category = rest[3] || "General";

    if (!sku || !name) {
      console.log(`\n  ${theme.amberBold("[USO]")} mint products add <SKU> <NOMBRE> [PRECIO] [COSTO] [CATEGORIA]`);
      console.log(`  ${theme.dim("Ejemplo:")} mint products add SKU-100 "Taladro Percutor 1/2" 150000 95000 Herramientas\n`);
      return;
    }

    const prodId = `prod_${companyId}_${sku.toLowerCase().replace(/[^a-z0-9_]/g, "_")}`;

    await db
      .insert(products)
      .values({
        id: prodId,
        companyId,
        sku,
        name,
        category,
        price,
        costPrice: cost,
        origin: "real",
      })
      .onConflictDoUpdate({
        target: [products.id],
        set: { name, category, price, costPrice: cost },
      });

    console.log(`\n  ${theme.mintBold("[OK]")} Producto '${name}' (${sku}) guardado exitosamente.\n`);
    process.exit(0);
  }

  // 2. mint products show <sku_o_id>
  if (sub === "show" || sub === "ver") {
    const query = arg1;
    if (!query) {
      console.log(`\n  ${theme.amberBold("[USO]")} mint products show <SKU_O_ID>\n`);
      return;
    }

    const [item] = await db
      .select()
      .from(products)
      .where(or(eq(products.sku, query), eq(products.id, query)))
      .limit(1);

    if (!item) {
      console.log(`\n  ${theme.amber(`Producto '${query}' no encontrado en el catálogo.`)}\n`);
      return;
    }

    console.log("\n" + drawDivider(`FICHA DE PRODUCTO // ${item.sku}`, 76));
    console.log(
      drawCard(
        [
          `${theme.bold("NOMBRE:")}        ${item.name}`,
          `${theme.bold("SKU / CÓDIGO:")}  ${theme.mintBold(item.sku)} [${item.id}]`,
          `${theme.bold("CATEGORÍA:")}    ${item.category || "General"}`,
          `${theme.bold("PRECIO VENTA:")}  ${item.price ? `$${Number(item.price).toLocaleString()}` : theme.dim("No asignado")}`,
          `${theme.bold("COSTO COMPRA:")}  ${item.costPrice ? `$${Number(item.costPrice).toLocaleString()}` : theme.dim("No asignado")}`,
          `${theme.bold("STOCK MÍNIMO:")}  ${item.minStock ?? 5} unidades`,
          `${theme.bold("ORIGEN DATO:")}   ${item.origin || "real"}`,
        ],
        { title: "DETALLE DE PRODUCTO", borderColor: theme.mint }
      )
    );
    console.log("");
    return;
  }

  // 3. mint products import <archivo>
  if (sub === "import" || sub === "importar") {
    const filePath = arg1;
    if (!filePath) {
      console.log(`\n  ${theme.amberBold("[USO]")} mint products import <RUTA_ARCHIVO>\n`);
      return;
    }
    const { importUniversalDataFile } = await import("@mint/core");
    console.log(`\n  Importando productos desde '${filePath}'...`);
    const res = await importUniversalDataFile(companyId, filePath);
    console.log(`  ${theme.mintBold("[OK] Importación finalizada:")} ${res.importedProducts} productos cargados.\n`);
    process.exit(0);
  }

  // 4. mint products list (por defecto)
  const allProds = await db
    .select()
    .from(products)
    .where(eq(products.companyId, companyId))
    .limit(100);

  console.log("\n" + drawDivider("CATÁLOGO DE PRODUCTOS", 84));
  if (allProds.length === 0) {
    console.log(`\n  ${theme.dim("○ No hay productos registrados en el catálogo.")}`);
    console.log(`  ${theme.dim("Puedes registrar uno con:")} ${theme.mintBold("mint products add <SKU> <NOMBRE> [PRECIO]")}`);
    console.log(`  ${theme.dim("O importar un archivo con:")} ${theme.mintBold("mint products import <ruta.csv/.xlsx>")}\n`);
    process.exit(0);
  }

  const cols: ColumnDef[] = [
    { header: "SKU", key: "sku", width: 16 },
    { header: "NOMBRE", key: "name", width: 30 },
    { header: "CATEGORÍA", key: "category", width: 16 },
    {
      header: "PRECIO",
      key: "price",
      width: 14,
      align: "right",
      format: (v) => (v ? `$${Number(v).toLocaleString()}` : theme.dim("-")),
    },
    {
      header: "MÍN",
      key: "minStock",
      width: 8,
      align: "right",
      format: (v) => String(v ?? 5),
    },
  ];

  console.log(renderTable(cols, allProds));
  console.log(`\n  ${theme.dim(`Total: ${allProds.length} productos mostrados.`)}\n`);
  process.exit(0);
}
