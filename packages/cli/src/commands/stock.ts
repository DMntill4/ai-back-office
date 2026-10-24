import { db, products, inventory, purchaseOrders, suppliers } from "@mint/core";
import { eq, desc } from "drizzle-orm";
import { getSession } from "../keychain";
import { theme } from "../ui/theme";
import { renderTable } from "../ui/table";
import { drawDivider } from "../ui/box";

export async function stockCommand(options: { json?: boolean; noExit?: boolean } = {}) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  try {
    const prods = await db.select().from(products).where(eq(products.companyId, companyId));
    const invs = await db.select().from(inventory).where(eq(inventory.companyId, companyId));

    const data = prods.map((p) => {
      const itemInv = invs.filter((i) => i.productId === p.id);
      const stock = itemInv.reduce((sum, item) => sum + item.stock, 0);
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        minStock: p.minStock,
        stock,
        isLowStock: stock < p.minStock,
        origin: p.origin || "real",
      };
    });

    if (options.json) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    console.log("\n" + drawDivider(`CATÁLOGO Y EXISTENCIAS EN TIEMPO REAL [${companyId}]`, 86));

    if (data.length === 0) {
      console.log(`\n  ${theme.dim("○ No hay productos registrados en el catálogo.")}`);
      console.log(`  ${theme.dim("Ejecuta 'mint scan' o 'mint setup' para sincronizar tu base de datos.")}\n`);
      return;
    }

    const rows = data.map((p) => {
      let statusBadge = theme.badge("ÓPTIMO", "mint");
      if (p.stock === 0) {
        statusBadge = theme.badge("AGOTADO", "red");
      } else if (p.isLowStock) {
        statusBadge = theme.badge("BAJO", "amber");
      }

      return {
        sku: theme.bold(p.sku),
        name: p.name.length > 30 ? p.name.slice(0, 27) + "..." : p.name,
        stock: `${p.stock}u`,
        minStock: `${p.minStock}u`,
        status: statusBadge,
      };
    });

    console.log(
      renderTable(
        [
          { header: "SKU", key: "sku", width: 16 },
          { header: "PRODUCTO", key: "name", width: 32 },
          { header: "STOCK", key: "stock", width: 10, align: "right" },
          { header: "MÍNIMO", key: "minStock", width: 10, align: "right" },
          { header: "ESTADO", key: "status", width: 14, align: "center" },
        ],
        rows,
      ),
    );

    console.log(`\n${theme.dim("Total productos:")} ${theme.bold(data.length)} │ ${theme.dim("Comando:")} ${theme.mintBold("mint scan")} para verificar desabastos.\n`);
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ error: err.message }));
    } else {
      console.error(theme.redBold(`❌ Error al consultar stock: ${err.message}`));
    }
    if (!options.noExit) {
      process.exit(1);
    }
  }
}

export async function ordersCommand(options: { json?: boolean; noExit?: boolean } = {}) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  try {
    const ordersList = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.companyId, companyId))
      .orderBy(desc(purchaseOrders.createdAt));

    const suppList = await db.select().from(suppliers).where(eq(suppliers.companyId, companyId));

    const data = ordersList.map((o) => {
      const supp = suppList.find((s) => s.id === o.supplierId);
      return {
        orderId: o.id,
        sku: o.productId,
        productName: o.productId,
        provider: supp?.name || o.supplierId || "Proveedor Oficial",
        amountMXN: `$${Number(o.totalAmount).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`,
        status: o.status,
        createdAt: o.createdAt ? o.createdAt.toISOString() : new Date().toISOString(),
      };
    });

    if (options.json) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    console.log("\n" + drawDivider(`ÓRDENES DE COMPRA REGISTRADAS [${companyId}]`, 86));

    if (data.length === 0) {
      console.log(`\n  ${theme.dim("○ No hay órdenes de compra emitidas todavía.")}`);
      console.log(`  ${theme.dim("Cualquier propuesta generada por el agente requerirá tu aprobación en '/inbox'.")}\n`);
      return;
    }

    const rows = data.map((o) => {
      const date = o.createdAt ? new Date(o.createdAt).toLocaleDateString("es-MX") : "N/A";
      const statusBadge =
        o.status === "recibida"
          ? theme.badge("RECIBIDA", "mint")
          : o.status === "abierta"
            ? theme.badge("ABIERTA", "amber")
            : theme.badge("CANCELADA", "gray");

      return {
        orderId: theme.bold(o.orderId),
        provider: (o.provider || "N/A").slice(0, 24),
        amount: theme.mintBold(o.amountMXN),
        status: statusBadge,
        date,
      };
    });

    console.log(
      renderTable(
        [
          { header: "ORDEN ID", key: "orderId", width: 16 },
          { header: "PROVEEDOR", key: "provider", width: 26 },
          { header: "MONTO MXN", key: "amount", width: 18, align: "right" },
          { header: "ESTADO", key: "status", width: 14, align: "center" },
          { header: "FECHA", key: "date", width: 12, align: "center" },
        ],
        rows,
      ),
    );

    console.log(`\n${theme.dim("Total órdenes:")} ${theme.bold(data.length)}\n`);
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ error: err.message }));
    } else {
      console.error(theme.redBold(`❌ Error al consultar órdenes: ${err.message}`));
    }
    if (!options.noExit) {
      process.exit(1);
    }
  }
}
