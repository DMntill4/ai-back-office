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
      console.error(theme.redBold(`[ERROR] Error al consultar stock: ${err.message}`));
    }
    if (!options.noExit) {
      process.exit(1);
    }
  }
}

export async function ordersCommand(
  statusOrId?: string,
  options: { json?: boolean; noExit?: boolean } = {},
) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  try {
    const { listCompanyOrders, getCompanyConfig } = await import("@mint/core");
    const config = await getCompanyConfig(companyId);

    const query = statusOrId ? statusOrId.trim() : "";
    const isStatusFilter = ["open", "abierta", "abiertas", "received", "recibida", "recibidas", "cancelled", "cancelada", "all", "todas"].includes(query.toLowerCase());

    const statusFilter = isStatusFilter
      ? query.toLowerCase().startsWith("open") || query.toLowerCase().startsWith("abiert")
        ? "abierta"
        : query.toLowerCase().startsWith("recib")
          ? "recibida"
          : query.toLowerCase().startsWith("canc")
            ? "cancelada"
            : undefined
      : undefined;

    const orders = await listCompanyOrders(companyId, statusFilter);

    // Si pasaron un ID específico de orden
    if (query && !isStatusFilter) {
      const order = orders.find((o) => o.id.toLowerCase() === query.toLowerCase());
      if (order) {
        console.log("\n" + drawDivider(`FICHA DE ORDEN DE COMPRA // ${order.id}`, 84));
        const statusBadge =
          order.status === "recibida"
            ? theme.mintBold("[RECIBIDA]")
            : order.status === "abierta"
              ? theme.amberBold("[ABIERTA / EN ESPERA]")
              : theme.dim("[CANCELADA]");

        const { drawCard } = await import("../ui/box");
        console.log(
          drawCard(
            [
              `${theme.bold("ESTADO DE LA ORDEN:")} ${statusBadge}`,
              "",
              `  - ID de Orden:       ${theme.mintBold(order.id)}`,
              `  - Proveedor:         ${theme.bold(order.supplierName)} [${order.supplierId}]`,
              `  - Producto:          ${theme.cyanBold(order.productName)} (SKU: ${order.sku})`,
              `  - Cantidad:          ${order.quantity} unidades`,
              `  - Precio Unitario:   $${order.unitPrice.toLocaleString("es-CO", { minimumFractionDigits: 2 })} ${config.currency}`,
              `  - Total Facturado:   ${theme.mintBold(`$${order.totalAmount.toLocaleString("es-CO", { minimumFractionDigits: 2 })} ${config.currency}`)}`,
              `  - Fecha Emisión:     ${new Date(order.createdAt).toLocaleDateString()}`,
              `  - Guía de Transporte: ${order.trackingNumber ? theme.bold(`${order.trackingNumber} (${order.carrier || "En camino"})`) : theme.dim("Sin guía asignada aún")}`,
              "",
              `  ${theme.dim("Para registrar la recepción en almacén:")} ${theme.mintBold(`/receive ${order.id}`)}`,
            ],
            {
              title: "DETALLE DE ORDEN",
              borderColor: theme.mint,
            },
          ),
        );
        console.log("");
        return;
      }
    }

    if (options.json) {
      console.log(JSON.stringify(orders, null, 2));
      return;
    }

    console.log("\n" + drawDivider(`ÓRDENES DE COMPRA REGISTRADAS [${companyId}]`, 86));

    if (orders.length === 0) {
      console.log(`\n  ${theme.dim("- No hay ordenes de compra emitidas todavia.")}`);
      console.log(`  ${theme.dim("Cualquier propuesta generada por el agente requerira tu aprobacion en '/inbox'.")}\n`);
      return;
    }

    const rows = orders.map((o) => {
      const date = o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "N/A";
      const statusBadge =
        o.status === "recibida"
          ? theme.badge("RECIBIDA", "mint")
          : o.status === "abierta"
            ? theme.badge("ABIERTA", "amber")
            : theme.badge("CANCELADA", "gray");

      const amountFormatted = `$${o.totalAmount.toLocaleString("es-CO", { minimumFractionDigits: 2 })} ${config.currency}`;

      return {
        orderId: theme.bold(o.id),
        provider: (o.supplierName || "N/A").slice(0, 24),
        amount: theme.mintBold(amountFormatted),
        status: statusBadge,
        date,
      };
    });

    console.log(
      renderTable(
        [
          { header: "ORDEN ID", key: "orderId", width: 16 },
          { header: "PROVEEDOR", key: "provider", width: 26 },
          { header: `MONTO (${config.currency})`, key: "amount", width: 18, align: "right" },
          { header: "ESTADO", key: "status", width: 14, align: "center" },
          { header: "FECHA", key: "date", width: 12, align: "center" },
        ],
        rows,
      ),
    );

    console.log(`\n${theme.dim("Total ordenes:")} ${theme.bold(orders.length)}  ·  ${theme.dim("Ver detalle:")} ${theme.mintBold("/orders <id>")}  ·  ${theme.dim("Filtrar:")} ${theme.mintBold("/orders [open|received]")}\n`);
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ error: err.message }));
    } else {
      console.error(theme.redBold(`[ERROR] Error al consultar ordenes: ${err.message}`));
    }
    if (!options.noExit) {
      process.exit(1);
    }
  }
}
