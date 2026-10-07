import { db, pool } from "../client";
import {
  cases,
  caseEvents,
  llmCalls,
  toolCalls,
  idempotencyKeys,
  approvals,
  products,
  warehouses,
  inventory,
  suppliers,
  supplierProducts,
  businessConfig,
} from "../schema";

export async function runSeed() {
  console.log("🌱 Insertando datos de prueba del agente y del negocio...");

  // --- DATOS DEL NEGOCIO ---

  // 1. Productos
  await db
    .insert(products)
    .values([
      {
        id: "prod_st200",
        name: "Sensor Térmico ST-200",
        description: "Sensor de temperatura industrial de alta precisión",
        sku: "SKU-ST200",
        minStock: 10,
        origin: "simulado",
      },
      {
        id: "prod_v500",
        name: "Válvula Reguladora V-500",
        description: "Válvula de presión hidráulica",
        sku: "SKU-V500",
        minStock: 5,
        origin: "simulado",
      },
    ])
    .onConflictDoNothing();

  // 2. Almacenes
  await db
    .insert(warehouses)
    .values([
      {
        id: "alm_central",
        name: "Almacén Central",
        location: "Bodega Principal - Sector A",
      },
    ])
    .onConflictDoNothing();

  // 3. Inventario
  await db
    .insert(inventory)
    .values([
      {
        id: "inv_001",
        productId: "prod_st200",
        warehouseId: "alm_central",
        stock: 2, // Faltante: mínimo es 10
      },
      {
        id: "inv_002",
        productId: "prod_v500",
        warehouseId: "alm_central",
        stock: 15, // Suficiente stock
      },
    ])
    .onConflictDoNothing();

  // 4. Proveedores
  await db
    .insert(suppliers)
    .values([
      {
        id: "prov_acme",
        name: "ACME Industrial Corp",
        email: "ventas@acme.com",
        phone: "+52 55 1234 5678",
        origin: "simulado",
      },
      {
        id: "prov_tech",
        name: "TechParts SA de CV",
        email: "contacto@techparts.com",
        phone: "+52 81 8765 4321",
        origin: "simulado",
      },
    ])
    .onConflictDoNothing();

  // 5. Oferta de Proveedor
  await db
    .insert(supplierProducts)
    .values([
      {
        id: "sp_001",
        supplierId: "prov_acme",
        productId: "prod_st200",
        unitPrice: "450.00",
        minOrderQuantity: 5,
        leadTimeDays: 2,
      },
      {
        id: "sp_002",
        supplierId: "prov_tech",
        productId: "prod_st200",
        unitPrice: "420.00",
        minOrderQuantity: 10,
        leadTimeDays: 4,
      },
    ])
    .onConflictDoNothing();

  // 6. Configuración de Negocio (Límite de Aprobación de Compras)
  await db
    .insert(businessConfig)
    .values([
      {
        key: "approval_limit_amount",
        value: "10000.00",
        description:
          "Monto máximo en MXN permitido para crear órdenes de compra sin pedir aprobación humana",
      },
    ])
    .onConflictDoNothing();

  // --- DATOS DEL AGENTE ---

  const testCaseId = "case_test_001";
  await db
    .insert(cases)
    .values({
      id: testCaseId,
      title: "Faltante de stock crítico - Sensor Térmico ST-200",
      description:
        "Se detectó inventario por debajo del umbral mínimo de seguridad (2 unidades disponibles, mínimo requerido 10).",
      status: "en_proceso",
      priority: "alta",
      inputData: {
        producto_id: "prod_st200",
        almacen_id: "alm_central",
        stock_actual: 2,
        umbral_minimo: 10,
        solicitado_por: "sistema_monitor",
      },
      resultSummary: "Caso en investigación activa por el agente.",
      totalCost: "0.001250",
      totalTokens: 420,
    })
    .onConflictDoNothing();

  await db
    .insert(caseEvents)
    .values({
      id: "evt_001",
      caseId: testCaseId,
      eventType: "caso_recibido",
      payload: {
        canal: "alerta_automatica",
        mensaje: "Caso ingresado para evaluación autónoma",
      },
    })
    .onConflictDoNothing();

  await db
    .insert(llmCalls)
    .values({
      id: "llm_001",
      caseId: testCaseId,
      model: "grok-4.6",
      promptTokens: 320,
      completionTokens: 100,
      cachedTokens: 0,
      totalTokens: 420,
      latencyMs: 850,
      cost: "0.001250",
      finishReason: "tool_calls",
    })
    .onConflictDoNothing();

  await db
    .insert(toolCalls)
    .values({
      id: "tool_001",
      caseId: testCaseId,
      toolName: "consultar_stock",
      inputArgs: { producto_id: "prod_st200" },
      outputResult: { stock_disponible: 2, stock_en_transito: 0 },
      isSuccess: true,
      verified: true,
      verificationDetails: "Existencias confirmadas en bodega central",
      durationMs: 45,
      idempotencyKey: "idem_stock_prod_st200",
    })
    .onConflictDoNothing();

  await db
    .insert(idempotencyKeys)
    .values({
      key: "idem_stock_prod_st200",
      caseId: testCaseId,
      action: "consultar_stock",
      requestHash: "hash_simulado_12345",
      response: { stock_disponible: 2, stock_en_transito: 0 },
    })
    .onConflictDoNothing();

  await db
    .insert(approvals)
    .values({
      id: "appr_001",
      caseId: testCaseId,
      actionType: "crear_orden_compra",
      amount: "15450.00",
      currency: "MXN",
      reason:
        "La orden para 20 sensores supera el límite de autorización de $10,000 MXN",
      status: "pendiente",
    })
    .onConflictDoNothing();

  console.log(
    "✅ Datos de prueba insertados con éxito en las tablas de negocio y del agente.",
  );
}

if (require.main === module) {
  runSeed()
    .catch((err) => {
      console.error("❌ Error ejecutando seed:", err);
      process.exit(1);
    })
    .finally(async () => {
      await pool.end();
    });
}
