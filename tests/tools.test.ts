import { describe, it, expect } from "vitest";
import { executeConsultarStock } from "../src/tools/consultarStock";
import { executeVerOrdenesAbiertas } from "../src/tools/verOrdenesAbiertas";
import { executeCrearOrdenCompra } from "../src/tools/crearOrdenCompra";

describe("Herramientas del Agente (Tools)", () => {
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

    expect(result.isSuccess).toBe(false);
    expect(result.requiresApproval).toBe(true);
    expect(result.message).toContain("supera el límite de aprobación");
  });
});
