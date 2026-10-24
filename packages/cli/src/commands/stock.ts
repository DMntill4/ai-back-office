import { getProductsApi, getOrdersApi } from "../client";
import { getSession } from "../keychain";
import { theme } from "../ui/theme";
import { renderTable } from "../ui/table";
import { drawDivider } from "../ui/box";

export async function stockCommand(options: { json?: boolean; noExit?: boolean } = {}) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  try {
    const res = await getProductsApi(companyId);
    if (!res.success) {
      throw new Error("No se pudo obtener el inventario");
    }

    if (options.json) {
      console.log(JSON.stringify(res.data, null, 2));
      return;
    }

    console.log("\n" + drawDivider(`CATÁLOGO Y EXISTENCIAS EN TIEMPO REAL [${companyId}]`, 86));

    const rows = res.data.map((p: any) => {
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

    console.log(`\n${theme.dim("Total productos:")} ${theme.bold(res.data.length)} │ ${theme.dim("Comando:")} ${theme.mintBold("mint scan")} para verificar desabastos.\n`);
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
    const res = await getOrdersApi(companyId);
    if (!res.success) {
      throw new Error("No se pudieron obtener las órdenes");
    }

    if (options.json) {
      console.log(JSON.stringify(res.data, null, 2));
      return;
    }

    console.log("\n" + drawDivider(`ÓRDENES DE COMPRA REGISTRADAS [${companyId}]`, 86));

    const rows = res.data.map((o: any) => {
      const date = o.createdAt ? new Date(o.createdAt).toLocaleDateString("es-MX") : "N/A";
      const statusBadge =
        o.status === "approved" || o.status === "completed"
          ? theme.badge(o.status.toUpperCase(), "mint")
          : o.status === "pending_approval"
            ? theme.badge("PENDIENTE", "amber")
            : theme.badge(o.status.toUpperCase(), "gray");

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

    console.log(`\n${theme.dim("Total órdenes:")} ${theme.bold(res.data.length)}\n`);
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
