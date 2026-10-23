import { getProductsApi, getOrdersApi } from "../client";
import { getSession } from "../keychain";

export async function stockCommand(options: { json?: boolean } = {}) {
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

    console.log(`\n📦 CATÁLOGO Y EXISTENCIAS EN TIEMPO REAL [Empresa: ${companyId}]`);
    console.log(`─`.repeat(78));
    console.log(
      `SKU`.padEnd(16) +
        `PRODUCTO`.padEnd(28) +
        `STOCK`.padEnd(10) +
        `MÍNIMO`.padEnd(10) +
        `ESTADO`.padEnd(14),
    );
    console.log(`─`.repeat(78));

    for (const p of res.data) {
      const status = p.stock === 0 ? "⚠️ AGOTADO" : p.isLowStock ? "⚠️ BAJO" : "✅ ÓPTIMO";
      console.log(
        p.sku.padEnd(16) +
          p.name.slice(0, 26).padEnd(28) +
          `${p.stock}u`.padEnd(10) +
          `${p.minStock}u`.padEnd(10) +
          status.padEnd(14),
      );
    }
    console.log(`─`.repeat(78));
    console.log(`Total productos: ${res.data.length}\n`);
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ error: err.message }));
    } else {
      console.error(`❌ Error al consultar stock: ${err.message}`);
    }
    process.exit(1);
  }
}

export async function ordersCommand(options: { json?: boolean } = {}) {
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

    console.log(`\n📑 ÓRDENES DE COMPRA REGISTRADAS [Empresa: ${companyId}]`);
    console.log(`─`.repeat(78));
    console.log(
      `ORDEN ID`.padEnd(14) +
        `PROVEEDOR`.padEnd(24) +
        `MONTO MXN`.padEnd(18) +
        `ESTADO`.padEnd(12) +
        `FECHA`.padEnd(10),
    );
    console.log(`─`.repeat(78));

    for (const o of res.data) {
      const date = o.createdAt ? new Date(o.createdAt).toLocaleDateString("es-MX") : "N/A";
      console.log(
        o.orderId.padEnd(14) +
          (o.provider || "N/A").slice(0, 22).padEnd(24) +
          o.amountMXN.padEnd(18) +
          o.status.padEnd(12) +
          date.padEnd(10),
      );
    }
    console.log(`─`.repeat(78));
    console.log(`Total órdenes: ${res.data.length}\n`);
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ error: err.message }));
    } else {
      console.error(`❌ Error al consultar órdenes: ${err.message}`);
    }
    process.exit(1);
  }
}
