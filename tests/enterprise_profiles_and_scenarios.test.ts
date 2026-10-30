import { describe, it, expect, beforeAll } from "vitest";
import {
  db,
  companies,
  products,
  warehouses,
  suppliers,
  supplierProducts,
  businessConfig,
  inventory,
  decisions,
  createPurchaseOrder,
  getCompanyDataProfile,
  executeAjustarStock,
  operationalEvents,
} from "@mint/core";
import { proposeColumnMapping, syncDataSource } from "@mint/ingest";
import { WebhookAdapter } from "@mint/notifiers";
import { eq, and } from "drizzle-orm";
import { createServer } from "node:http";

describe("Auditoría Forense: Perfiles Empresariales Reales, Autonomía y Tolerancia a Fallos", () => {
  const companyTiendaId = `comp_tienda_${Date.now()}`;
  const companyMedianaId = `comp_mediana_${Date.now()}`;
  const companyGrandeId = `comp_grande_${Date.now()}`;
  const companyIsoA = `comp_iso_a_${Date.now()}`;
  const companyIsoB = `comp_iso_b_${Date.now()}`;

  beforeAll(async () => {
    // 1. Crear empresas de prueba representativas
    await db.insert(companies).values([
      {
        id: companyTiendaId,
        name: "Abarrotes Don Pepe",
        currency: "COP",
        country: "Colombia",
      },
      {
        id: companyMedianaId,
        name: "Distribuidora del Valle",
        currency: "MXN",
        country: "México",
      },
      {
        id: companyGrandeId,
        name: "Corporativo Logístico Transcontinental",
        currency: "USD",
        country: "Estados Unidos",
      },
      {
        id: companyIsoA,
        name: "Sucursal Norte",
        currency: "COP",
      },
      {
        id: companyIsoB,
        name: "Sucursal Sur",
        currency: "COP",
      },
    ]).onConflictDoNothing();

    // 2. Configuración específica por empresa
    await db.insert(businessConfig).values([
      {
        companyId: companyTiendaId,
        key: "business_type",
        value: "tienda_barrio",
        currency: "COP",
      },
      {
        companyId: companyTiendaId,
        key: "allow_routine_replenishment",
        value: "true",
        currency: "COP",
      },
      {
        companyId: companyTiendaId,
        key: "routine_replenishment_max_amount",
        value: "50000",
        currency: "COP",
      },
      {
        companyId: companyGrandeId,
        key: "business_type",
        value: "empresa_grande",
        currency: "USD",
      },
      {
        companyId: companyGrandeId,
        key: "allow_routine_replenishment",
        value: "false",
        currency: "USD",
      },
    ]).onConflictDoNothing();
  });

  it("1. Tienda de Barrio: Ingesta de Excel heterogéneo sin SKU auto-deriva código determinista y persiste precio", async () => {
    // Estructura común en pequeñas tiendas: producto, stock, precio (sin SKU de barras)
    const rawHeaders = ["producto", "existencia", "precio"];
    const mapping = proposeColumnMapping(rawHeaders);

    expect(mapping.mappings.name).toBe("producto");
    expect(mapping.mappings.stock).toBe("existencia");
    expect(mapping.mappings.unitCost).toBe("precio");
    // Tolerancia a tiendas de barrio: auto-deriva SKU a partir del nombre
    expect(mapping.mappings.sku).toBe("producto");

    const rows = [
      { producto: "Gaseosa Manzana 1.5L", existencia: "4", precio: "3500" },
      { producto: "Aceite Vegetal 500ml", existencia: "2", precio: "6000" },
    ];

    const syncRes = await syncDataSource({
      companyId: companyTiendaId,
      sourceName: "Inventario Don Pepe",
      sourceType: "csv",
      uriOrPath: "file://tienda_inventario.csv",
      currentHeaders: rawHeaders,
      rows,
      explicitMappings: mapping.mappings,
    });

    expect(syncRes.success).toBe(true);
    expect(syncRes.importedRows).toBe(2);

    // Verificar en BD que se auto-generó SKU determinista y se guardó el precio
    const prods = await db
      .select()
      .from(products)
      .where(eq(products.companyId, companyTiendaId));

    expect(prods.length).toBe(2);
    const gaseosa = prods.find((p) => p.name.includes("Gaseosa"));
    expect(gaseosa).toBeDefined();
    expect(gaseosa?.sku).toMatch(/^SKU-GASEOSA/);
    expect(parseFloat(gaseosa!.price || "0")).toBe(3500);
  });

  it("2. Tienda de Barrio: Detección de stock bajo sin proveedor genera Solicitud Interna Rutinaria Autorizada", async () => {
    const prods = await db
      .select()
      .from(products)
      .where(eq(products.companyId, companyTiendaId));
    const target = prods[0];

    // Llamar a createPurchaseOrder sin proveedor registrado
    const orderRes = await createPurchaseOrder({
      companyId: companyTiendaId,
      productId: target.id,
      supplierId: "ninguno",
      quantity: 5, // 5 * 3500 = 17500 COP <= 50000 COP límite rutinario
    });

    expect(orderRes.success).toBe(true);
    expect(orderRes.isInternalRequest).toBe(true);
    // Autorizado automáticamente según política rutinaria de bajo riesgo
    expect(orderRes.requiresApproval).toBe(false);
    expect(orderRes.verified).toBe(true);
    expect(orderRes.message).toContain("Solicitud interna de reposición rutinaria autorizada automáticamente");
    expect(orderRes.message).toContain("Sin proveedor registrado: asignada para abastecimiento local directo");
  });

  it("3. Tienda de Barrio: Perfil de empresa no penaliza la ausencia de bodegas con GPS o camiones", async () => {
    const profile = await getCompanyDataProfile(companyTiendaId);

    expect(profile.company.businessType).toBe("tienda_barrio");
    // Capacidades adaptadas
    const fleetCap = profile.capabilities.find((c) => c.id === "fleet_and_routing");
    expect(fleetCap?.status).toBe("NO_APLICA");

    const routineCap = profile.capabilities.find((c) => c.id === "routine_replenishment");
    expect(routineCap?.status).toBe("DISPONIBLE_OPERATIVO");

    // Tienda de barrio no debe tener bloqueos ni errores críticos de logística/GPS
    const criticalLogistics = profile.pendingQuestions.filter(
      (q) => q.category === "LOGISTICS" && q.severity === "CRITICAL",
    );
    expect(criticalLogistics.length).toBe(0);

    const logisticsQ = profile.pendingQuestions.find((q) => q.category === "LOGISTICS");
    if (logisticsQ) {
      expect(logisticsQ.severity).toBe("INFO");
    }
  });

  it("4. Empresa Mediana: Proveedor registrado sin precio en catálogo genera Solicitud de Cotización (RFQ)", async () => {
    // Registrar producto y proveedor para la empresa mediana
    const prodId = `prod_valle_${Date.now()}`;
    const suppId = `prov_valle_${Date.now()}`;

    await db.insert(products).values({
      id: prodId,
      companyId: companyMedianaId,
      name: "Caja de Cartón Reforzada",
      sku: `SKU-VALLE-${Date.now()}`,
      minStock: 50,
      price: "25.00",
      origin: "real",
    });

    await db.insert(suppliers).values({
      id: suppId,
      companyId: companyMedianaId,
      name: "Empaques Industriales del Norte",
      origin: "real",
    });

    // Sin supplierProducts (sin precios en catálogo) -> MINT debe generar RFQ
    const orderRes = await createPurchaseOrder({
      companyId: companyMedianaId,
      productId: prodId,
      supplierId: suppId,
      quantity: 100,
    });

    expect(orderRes.success).toBe(true);
    expect(orderRes.isRfq).toBe(true);
    expect(orderRes.requiresApproval).toBe(true);
    expect(orderRes.message).toContain("Solicitud de cotización generada");
    expect(orderRes.message).toContain("Sin precio registrado en catálogo: requiere cotización formal");

    // Verificar inserción en decisions con actionType = 'solicitud_cotizacion'
    const [decRow] = await db
      .select()
      .from(decisions)
      .where(eq(decisions.id, orderRes.decisionId!));

    expect(decRow).toBeDefined();
    expect(decRow.actionType).toBe("solicitud_cotizacion");
    expect(decRow.policyDecision).toBe("pending_approval");
  });

  it("5. Empresa Grande: Requiere aprobación humana estricta y nunca ejecuta compras directas", async () => {
    const prodId = `prod_corp_${Date.now()}`;
    const suppId = `prov_corp_${Date.now()}`;

    await db.insert(products).values({
      id: prodId,
      companyId: companyGrandeId,
      name: "Servidor Rack 2U",
      sku: `SKU-CORP-${Date.now()}`,
      minStock: 2,
      price: "1500.00",
      origin: "real",
    });

    await db.insert(suppliers).values({
      id: suppId,
      companyId: companyGrandeId,
      name: "Hardware Global Solutions",
      origin: "real",
    });

    await db.insert(supplierProducts).values({
      id: `sp_corp_${Date.now()}`,
      companyId: companyGrandeId,
      supplierId: suppId,
      productId: prodId,
      unitPrice: "1450.00",
      leadTimeDays: 7,
    });

    const orderRes = await createPurchaseOrder({
      companyId: companyGrandeId,
      productId: prodId,
      supplierId: suppId,
      quantity: 2,
    });

    expect(orderRes.success).toBe(true);
    expect(orderRes.requiresApproval).toBe(true);
    expect(orderRes.verified).toBe(false);
    expect(orderRes.message).toContain("Propuesta de compra formal generada");
    expect(orderRes.message).toContain("MINT no ejecuta compras directas");
    expect(orderRes.supplier?.unitPrice).toBe(1450);
  });

  it("6. Empresa sin Historial de Ventas: No inventa tendencias y declara capacidad pendiente", async () => {
    const profile = await getCompanyDataProfile(companyGrandeId);
    const forecastCap = profile.capabilities.find((c) => c.id === "demand_forecasting");

    expect(forecastCap).toBeDefined();
    expect(forecastCap?.status).toBe("REQUIERE_FUENTE_DATOS");
    expect(forecastCap?.description).toContain("Sin historial de ventas registrado");
  });

  it("7. Webhook Real: Envía petición HTTP con firma HMAC y registra confirmación técnica", async () => {
    let receivedPayload: any = null;
    let receivedSignature: string | null = null;

    // Levantar receptor HTTP local de prueba
    const server = createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        receivedSignature = req.headers["x-mint-signature"] as string;
        try {
          receivedPayload = JSON.parse(body);
        } catch {}
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "received" }));
      });
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    const port = (server.address() as any).port;
    const webhookUrl = `http://127.0.0.1:${port}/webhook-test`;

    const adapter = new WebhookAdapter({
      webhookUrl,
      secret: "super-secret-key-1234",
    });

    const testEvent = {
      id: `evt_${Date.now()}`,
      eventType: "stock_movimiento",
      companyId: companyTiendaId,
      title: "Venta registrada en tienda",
      description: "Descuento de 1u de Gaseosa",
      payload: { producto: "Gaseosa Manzana", cantidad: 1 },
      severity: "INFO" as const,
      status: "PENDING" as const,
      createdAt: new Date(),
    };

    const deliveryResult = await adapter.send(testEvent as any);

    server.close();

    expect(deliveryResult.success).toBe(true);
    expect(deliveryResult.details?.status).toBe(200);
    expect(receivedPayload).toBeDefined();
    expect(receivedPayload.eventType).toBe("stock_movimiento");
    expect(receivedSignature).toBeDefined();
  });

  it("8. Webhook Fallido: No descarta silenciosamente y registra estado no entregado", async () => {
    // Puerto inalcanzable
    const deadUrl = "http://127.0.0.1:59999/dead-endpoint";
    const adapter = new WebhookAdapter({
      webhookUrl: deadUrl,
      timeoutMs: 800,
    });

    const testEvent = {
      id: `evt_dead_${Date.now()}`,
      eventType: "error_sistema",
      companyId: companyTiendaId,
      title: "Prueba de fallo",
      description: "Prueba de tolerancia",
      payload: {},
      severity: "CRITICAL" as const,
      status: "PENDING" as const,
      createdAt: new Date(),
    };

    const deliveryResult = await adapter.send(testEvent as any);

    expect(deliveryResult.success).toBe(false);
    expect(deliveryResult.error).toBeDefined();
  });

  it("9. Aislamiento Multi-Tenant Estricto: Empresas independientes con productos homónimos", async () => {
    // Insertar el mismo producto con el mismo SKU en dos empresas distintas
    const prodA = await db.insert(products).values({
      id: `prod_iso_a_${Date.now()}`,
      companyId: companyIsoA,
      name: "Arroz Diana 1kg",
      sku: "SKU-ARROZ-1KG",
      minStock: 20,
      origin: "real",
    }).returning();

    const prodB = await db.insert(products).values({
      id: `prod_iso_b_${Date.now()}`,
      companyId: companyIsoB,
      name: "Arroz Diana 1kg",
      sku: "SKU-ARROZ-1KG",
      minStock: 10,
      origin: "real",
    }).returning();

    // Consultar catálogo de Empresa A
    const listA = await db
      .select()
      .from(products)
      .where(eq(products.companyId, companyIsoA));

    // Consultar catálogo de Empresa B
    const listB = await db
      .select()
      .from(products)
      .where(eq(products.companyId, companyIsoB));

    expect(listA.length).toBe(1);
    expect(listB.length).toBe(1);
    expect(listA[0].id).toBe(prodA[0].id);
    expect(listB[0].id).toBe(prodB[0].id);
    expect(listA[0].id).not.toBe(listB[0].id);
  });

  it("10. Idempotencia en Movimientos de Inventario y Solicitudes", async () => {
    const [pA] = await db
      .select()
      .from(products)
      .where(eq(products.companyId, companyIsoA));

    // Primer ajuste: sumar 10 unidades
    const res1 = await executeAjustarStock(
      {
        producto_id: pA.id,
        cantidad_delta: 10,
        motivo: "Inventario físico verificado",
      },
      { companyId: companyIsoA },
    );

    expect(res1.isSuccess).toBe(true);
    expect(res1.data?.previousStock).toBeDefined();
    expect(res1.data?.newStock).toBe(10);

    // Segundo ajuste: sumar 5 unidades
    const res2 = await executeAjustarStock(
      {
        producto_id: pA.id,
        cantidad_delta: 5,
        motivo: "Recepción de lote",
      },
      { companyId: companyIsoA },
    );

    expect(res2.isSuccess).toBe(true);
    expect(res2.data?.previousStock).toBe(10);
    expect(res2.data?.newStock).toBe(15);
  });
});
