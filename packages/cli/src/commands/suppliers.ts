import {
  listCompanySuppliers,
  getSupplierDetail,
  addCompanySupplier,
  hasPermission,
  type UserRole,
} from "@mint/core";
import { getSession } from "../keychain";
import { theme } from "../ui/theme";
import { drawCard, drawDivider } from "../ui/box";
import { renderTable, type ColumnDef } from "../ui/table";

export async function suppliersCommand(action?: string, arg1?: string, ...rest: string[]) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";
  const role = (session?.role || "viewer").toLowerCase() as UserRole;

  // Si opera en Solo Tienda, silenciar módulo de proveedores
  const { db, businessConfig } = await import("@mint/core");
  const { eq, and } = await import("drizzle-orm");
  const [profileCfg] = await db
    .select({ value: businessConfig.value })
    .from(businessConfig)
    .where(and(eq(businessConfig.companyId, companyId), eq(businessConfig.key, "business_profile")))
    .limit(1)
    .catch(() => []);

  if (profileCfg?.value === "tienda") {
    console.log(`\n  ${theme.amberBold("[MÓDULO SILENCIADO - SOLO TIENDA]")}`);
    console.log(`  El módulo de Proveedores y Compras está desactivado para tu modelo de negocio.`);
    console.log(`  MINT opera en modo exclusivo de tienda (catálogo, ventas y ganancias sin ruido de proveedores).`);
    console.log(`  ${theme.dim("Para habilitarlo, cambia tu perfil a 'Tienda con Proveedores' ejecutando:")} ${theme.mintBold("/config set business_profile tienda_proveedores")}\n`);
    return;
  }

  const sub = action ? action.trim() : "";

  // 1. Subcomando: Agregar proveedor (/suppliers add <nombre> [email] [tel] [ciudad])
  if (sub.toLowerCase() === "add" || sub.toLowerCase() === "nuevo") {
    if (!hasPermission(role, "configure_bot")) {
      console.log(
        `\n  ${theme.redBold("[ACCESO DENEGADO]")} Tu rol (${role.toUpperCase()}) no tiene permisos para dar de alta proveedores.\n`,
      );
      return;
    }

    const name = arg1;
    const email = rest[0];
    const phone = rest[1];
    const city = rest.slice(2).join(" ");

    if (!name) {
      console.log(
        `\n  ${theme.amberBold("[USO]")} /suppliers add <NOMBRE> [EMAIL] [TELEFONO] [CIUDAD]\n  ${theme.dim("Ejemplo:")} /suppliers add "Ferretería Industrial S.A." ventas@ferre.com +573001234567 Bogotá\n`,
      );
      return;
    }

    try {
      const created = await addCompanySupplier(companyId, {
        name,
        email,
        phone,
        city,
      });

      console.log("");
      console.log(
        drawCard(
          [
            `${theme.mintBold("[OK] Proveedor registrado exitosamente en PostgreSQL")}`,
            "",
            `  - ID asignado:  ${theme.mintBold(created.id)}`,
            `  - Nombre:       ${theme.bold(created.name)}`,
            `  - Email:        ${email || theme.dim("No especificado")}`,
            `  - Teléfono:     ${phone || theme.dim("No especificado")}`,
            `  - Ciudad:       ${city || theme.dim("No especificada")}`,
            "",
            `  ${theme.dim("Ahora puedes asociar SKUs con precios de este proveedor en supplier_products.")}`,
          ],
          {
            title: "DIRECTORIO DE PROVEEDORES",
            borderColor: theme.mint,
          },
        ),
      );
      console.log("");
    } catch (err: any) {
      console.log(`\n  ${theme.redBold("[ERROR]")} ${err.message}\n`);
    }
    return;
  }

  // 2. Subcomando: Detalle de proveedor (/suppliers <id>)
  if (sub && sub.toLowerCase() !== "list" && sub.toLowerCase() !== "all") {
    const detail = await getSupplierDetail(companyId, sub);
    if (detail) {
      console.log("\n" + drawDivider(`FICHA DE PROVEEDOR // ${detail.name.toUpperCase()}`, 86));
      console.log(
        drawCard(
          [
            `${theme.bold("INFORMACIÓN GENERAL & CONTACTO:")}`,
            `  - ID:             ${theme.mintBold(detail.id)}`,
            `  - Nombre:         ${theme.bold(detail.name)}`,
            `  - RFC / Tax ID:   ${detail.taxId || theme.dim("Sin registrar")}`,
            `  - Ubicación:      ${detail.city ? `${detail.city}, ${detail.country || ""}` : theme.dim("No registrada")} ${detail.hasGps ? theme.mint("[GPS OK]") : theme.amber("[Sin GPS]")}`,
            `  - Email:          ${detail.email || theme.dim("No registrado")}`,
            `  - Teléfono:       ${detail.phone || theme.dim("No registrado")}`,
            `  - Lead Time Prom: ${theme.cyanBold(`${detail.avgLeadTimeDays} días de entrega`)}`,
            `  - Órdenes POs:    ${detail.totalOrdersIssued} emitidas históricamente`,
          ],
          {
            title: "PERFIL DE PROVEEDOR",
            borderColor: theme.mint,
          },
        ),
      );

      console.log("\n" + theme.bold("CATÁLOGO DE PRODUCTOS Y PRECIOS COTIZADOS:"));
      if (detail.catalog.length === 0) {
        console.log(`  ${theme.dim("(Este proveedor no tiene catálogo registrado aún. Se deben cotizar SKUs)")}\n`);
      } else {
        const catCols: ColumnDef[] = [
          { header: "SKU", key: "sku", width: 14 },
          { header: "PRODUCTO", key: "productName", width: 28 },
          { header: "PRECIO UNIT.", key: "unitPrice", width: 14, align: "right", format: (v) => `$${Number(v).toFixed(2)}` },
          { header: "PEDIDO MÍN.", key: "minOrderQuantity", width: 12, align: "right", format: (v) => `${v} u` },
          { header: "TIEMPO ENTREGA", key: "leadTimeDays", width: 16, align: "right", format: (v) => `${v} días` },
        ];
        console.log(renderTable(catCols, detail.catalog));
        console.log("");
      }

      if (detail.recentOrders.length > 0) {
        console.log(theme.bold("ÓRDENES DE COMPRA RECIENTES:"));
        const orderCols: ColumnDef[] = [
          { header: "ORDEN ID", key: "id", width: 16 },
          { header: "PRODUCTO", key: "productName", width: 28 },
          { header: "CANTIDAD", key: "quantity", width: 10, align: "right", format: (v) => `${v} u` },
          { header: "TOTAL", key: "totalAmount", width: 14, align: "right", format: (v) => `$${Number(v).toFixed(2)}` },
          { header: "ESTADO", key: "status", width: 14, align: "center", format: (v) => (v === "recibida" ? theme.mint("[RECIBIDA]") : theme.amber(`[${String(v).toUpperCase()}]`)) },
        ];
        console.log(renderTable(orderCols, detail.recentOrders));
        console.log("");
      }
      return;
    }
  }

  // 3. Vista general (/suppliers)
  console.log("\n" + drawDivider("DIRECTORIO OFICIAL DE PROVEEDORES", 86));
  const supps = await listCompanySuppliers(companyId);

  if (supps.length === 0) {
    console.log(`\n  ${theme.amberBold("[AVISO]")} No hay proveedores registrados en la base de datos de la empresa.`);
    console.log(`  ${theme.dim("Agrega tu primer proveedor con:")} ${theme.mintBold('/suppliers add "Nombre" ventas@proveedor.com +573000000000 Bogota')}\n`);
    return;
  }

  const columns: ColumnDef[] = [
    { header: "ID", key: "id", width: 16 },
    { header: "PROVEEDOR", key: "name", width: 26 },
    {
      header: "UBICACIÓN",
      key: "city",
      width: 18,
      format: (v: any) => (v ? `${v}` : theme.dim("Sin ciudad")),
    },
    { header: "CONTACTO", key: "phone", width: 16, format: (v) => v || theme.dim("N/A") },
    { header: "CATÁLOGO", key: "catalogCount", width: 10, align: "right", format: (v) => `${v} SKUs` },
    { header: "LEAD TIME", key: "avgLeadTimeDays", width: 12, align: "right", format: (v) => `${v} días` },
    { header: "ÓRDENES", key: "totalOrdersIssued", width: 10, align: "right", format: (v) => `${v} POs` },
  ];

  console.log(renderTable(columns, supps));

  console.log("\n" + theme.bold("SUBCOMANDOS:"));
  console.log(`  ${theme.mintBold("/suppliers <id>")}          Ver catálogo detallado de precios y tiempos`);
  console.log(`  ${theme.mintBold("/suppliers add <nombre>")}  Dar de alta un nuevo proveedor en PostgreSQL\n`);
}
