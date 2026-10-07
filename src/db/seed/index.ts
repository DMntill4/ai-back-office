import { db, pool } from "../client";
import {
  cases,
  caseEvents,
  llmCalls,
  toolCalls,
  idempotencyKeys,
  approvals,
} from "../schema";

export async function runSeed() {
  console.log("🌱 Insertando datos de prueba del agente...");

  // 1. Caso de prueba
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

  // 2. Evento inicial del caso
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

  // 3. Registro de llamada simulada a Grok
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

  // 4. Registro de llamada a herramienta
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

  // 5. Clave de idempotencia
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

  // 6. Solicitud de aprobación de ejemplo
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
    "✅ Datos de prueba insertados con éxito en todas las tablas del agente.",
  );
}

// Ejecutar directamente si se llama desde CLI
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
