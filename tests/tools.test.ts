import { describe, it, expect, beforeAll } from "vitest";
import { executeConsultarStock } from "../src/tools/consultarStock";
import { executeVerOrdenesAbiertas } from "../src/tools/verOrdenesAbiertas";
import { executeCrearOrdenCompra } from "../src/tools/crearOrdenCompra";
import { db } from "../src/db/client";
import { companies, products, suppliers, supplierProducts } from "../src/db/schema";

describe("Herramientas del Agente (Tools)", () => {
  beforeAll(async () => {
    await db.insert(companies).values({ id: "comp_default", name: "Acme Industrial Corp", slug: "acme-corp" }).onConflictDoNothing();
    await db.insert(products).values({
      id: "prod_st200",
      companyId: "comp_default",
      name: "Sensor Térmico ST-200",
      category: "industrial",
      sku: "SKU-ST200",
      minStock: 10,
      origin: "real",
    }).onConflictDoNothing();
    await db.insert(suppliers).values({
      id: "prov_acme",
      companyId: "comp_default",
      name: "Acme Components",
      origin: "real",
    }).onConflictDoNothing();
    await db.insert(supplierProducts).values({
      id: "sp_st200_acme",
      companyId: "comp_default",
      supplierId: "prov_acme",
      productId: "prod_st200",
      unitPrice: "450.00",
      minOrderQuantity: 1,
      leadTimeDays: 2,
    }).onConflictDoNothing();
  });

  it("consultar_stock debe manejar productos inexistentes de forma segura", async () => {
    const result = await executeConsultarStock({
      producto_id: "prod_inexistente",
    });
    expect(result.isSuccess).toBe(false);
    expect(result.message).toContain("No se encontró el producto");
  });

  it("ver_ordenes_abiertas debe retornar lista de órdenes", async () => {
    const result = await executeVerOrdenesAbiertas({});
    expect(result.isSuccess).toBe(true);
    expect(Array.isArray(result.orders)).toBe(true);
  });

  it("crear_orden_compra debe requerir aprobación si excede el límite de dinero ($10,000 MXN)", async () => {
    // Intentar comprar 1000 unidades a proveedor que supera $10,000
    const result = await executeCrearOrdenCompra({
      case_id: "case_test_001",
      producto_id: "prod_st200",
      proveedor_id: "prov_acme",
      cantidad: 100, // 100 * 450 = $45,000 MXN (Supera $10,000 MXN)
      idempotency_key: "idem_test_supera_limite",
    });

    expect(result.isSuccess).toBe(true);
    expect(result.requiresApproval).toBe(true);
    expect(result.message).toContain("Pendiente de aprobación humana");
  });
});
