import { describe, it, expect, beforeAll } from "vitest";
import { executePronosticarDemanda } from "../src/tools/pronosticarDemanda";
import { executeConsultarEnvios } from "../src/tools/consultarEnvios";
import { executeCrearOrdenCompra } from "../src/tools/crearOrdenCompra";
import { saveBotSetupConfig, registerUser } from "../src/services/authAndSetupService";
import { calculateDemandForecast } from "../src/services/demandService";
import { trackShipments } from "../src/services/shipmentService";
import { db } from "../src/db/client";
import { companies, products, suppliers, supplierProducts, salesHistory, shipments, warehouses } from "../src/db/schema";
import { eq } from "drizzle-orm";

describe("Herramientas Nuevas: Pronóstico de Demanda, Compra Autónoma bajo Umbral y Seguimiento de Envíos", () => {
  beforeAll(async () => {
    await db.insert(companies).values({ id: "comp_default", name: "Acme Industrial Corp", slug: "acme-corp" }).onConflictDoNothing();
    await db.insert(warehouses).values({ id: "alm_central", companyId: "comp_default", name: "Almacén Central", location: "Bahía Principal" }).onConflictDoNothing();
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
    await db.insert(salesHistory).values({
      id: "sh_test_01",
      companyId: "comp_default",
      productId: "prod_st200",
      saleDate: new Date(),
      quantity: 15,
      unitPrice: "450.00",
      totalAmount: "6750.00",
    }).onConflictDoNothing();
    await db.delete(shipments).where(eq(shipments.id, "ship_test_01"));
    await db.insert(shipments).values({
      id: "ship_test_01",
      companyId: "comp_default",
      trackingNumber: "TRK-MX-88902",
      carrier: "DHL Supply Chain",
      status: "en_transito",
      estimatedDelivery: new Date(Date.now() + 86400000 * 3),
      currentLocation: "Hub Central Monterrey",
    });
  });

  it("pronosticar_demanda debe calcular tasa de consumo diario, demanda proyectada y semanas de cobertura", async () => {
    const result = await executePronosticarDemanda({
      producto_id: "prod_st200",
      horizonte_dias: 30,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.productId).toBe("prod_st200");
    expect(result.data!.horizonDays).toBe(30);
    expect(result.data!.averageDailySales).toBeGreaterThan(0);
    expect(result.data!.projectedDemandUnits).toBeGreaterThan(0);
    expect(result.data!.estimatedDaysOfCoverage).toBeDefined();
    expect(["saludable", "precaucion", "urgente_reabastecer"]).toContain(result.data!.status);
  });

  it("crear_orden_compra debe emitir orden autónoma cuando el monto total está bajo el umbral de la empresa", async () => {
    // 2 unidades a $450 MXN = $900 MXN (Menor al umbral por defecto de $10,000 MXN)
    const result = await executeCrearOrdenCompra({
      case_id: `case_auto_${Date.now()}`,
      producto_id: "prod_st200",
      proveedor_id: "prov_acme",
      cantidad: 2,
      idempotency_key: `idem_auto_purchase_${Date.now()}`,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.requiresApproval).toBe(false);
    expect(result.verified).toBe(true);
    expect(result.message).toContain("Orden de compra emitida autónomamente");
    expect(result.data).toBeDefined();
  });

  it("crear_orden_compra debe requerir aprobación humana (HITL) cuando el monto excede el umbral", async () => {
    // 30 unidades a $450 MXN = $13,500 MXN (Supera el umbral por defecto de $10,000 MXN)
    const result = await executeCrearOrdenCompra({
      case_id: `case_hitl_${Date.now()}`,
      producto_id: "prod_st200",
      proveedor_id: "prov_acme",
      cantidad: 30,
      idempotency_key: `idem_hitl_purchase_${Date.now()}`,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.requiresApproval).toBe(true);
    expect(result.verified).toBe(false);
    expect(result.message).toContain("Pendiente de aprobación humana");
  });

  it("debe respetar el umbral autónomo personalizado por empresa", async () => {
    const reg = await registerUser({
      name: "Ana Valdés",
      email: `ana_${Date.now()}@macro-tier.com`,
      companyName: "Macro Tier Corp",
      role: "owner",
    });

    const companyId = reg.user!.companyId;

    // Subir umbral a $50,000 MXN
    await saveBotSetupConfig({
      companyId,
      botName: "Mint VIP",
      botTone: "ejecutivo",
      approvalLimitAmount: 50000,
      currency: "MXN",
    });

    // Compra de 50 unidades a $450 = $22,500 MXN
    // En comp_default requeriría aprobación, pero con $50,000 se aprueba autónomamente
    const { createPurchaseOrder } = await import("../src/services/inventoryService");
    const result = await createPurchaseOrder({
      caseId: `case_vip_${Date.now()}`,
      companyId,
      productId: "prod_st200",
      supplierId: "prov_acme",
      quantity: 50,
      idempotencyKey: `idem_vip_${Date.now()}`,
    });

    expect(result.success).toBe(true);
    expect(result.requiresApproval).toBe(false);
    expect(result.verified).toBe(true);
    expect(result.message).toContain("Orden de compra emitida autónomamente");
  });

  it("consultar_envios debe rastrear órdenes y guías con transportista y fecha estimada de entrega", async () => {
    const trackingRes = await executeConsultarEnvios({
      numero_rastreo: "TRK-MX-88902",
    });

    expect(trackingRes.isSuccess).toBe(true);
    expect(trackingRes.total).toBeGreaterThan(0);
    expect(trackingRes.data![0].carrier).toBeDefined();
    expect(trackingRes.data![0].status).toBeDefined();
    expect(trackingRes.data![0].estimatedDelivery).toBeDefined();
    expect(trackingRes.data![0].currentLocation).toBeDefined();
  });
});
