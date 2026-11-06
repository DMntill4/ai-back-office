import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { eq, and } from "drizzle-orm";
import {
  db,
  cases,
  companies,
  products,
  inventory,
  notificationChannels,
  notificationLog,
  auditIncidents,
  agentTaskCheckpoints,
  businessOperationalMemory,
  operationalEvents,
  dispatchToolCall,
  runAgentLoop,
  inspectAndRecoverDataSource,
  importBusinessDataWithRecovery,
  organizeAndAuditInventory,
  saveOperationalMemory,
  getActiveOperationalMemory,
  getTaskCheckpoints,
  verifySystemCapabilities,
  testCustomConnection,
} from "@mint/core";
import { detectProactiveStockChanges } from "@mint/daemon";

const TEST_COMPANY_ID = `comp_part3_${Date.now().toString(36)}`;
const TEMP_DIR = path.resolve(process.cwd(), "scratch", "part3_test_data");

describe("MINT Part 2 & Part 3 — Real Agent Intelligence, Dynamic Tool Execution, RBAC & Self-Recovery", () => {
  beforeAll(async () => {
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    await db
      .insert(companies)
      .values({
        id: TEST_COMPANY_ID,
        name: "Distribuidora Industrial CDMX S.A. de C.V.",
        currency: "MXN",
        country: "MX",
        city: "Ciudad de México",
      })
      .onConflictDoNothing();
  });

  afterAll(async () => {
    try {
      if (fs.existsSync(TEMP_DIR)) {
        fs.rmSync(TEMP_DIR, { recursive: true, force: true });
      }
    } catch {}
  });

  it("Scenario A — Fake database: inspects content, rejects config file, does not import it, and discovers valid alternative in directory", async () => {
    const fakeDbPath = path.join(TEMP_DIR, "fake_database.json");
    const validAltPath = path.join(TEMP_DIR, "real_inventory_catalog.csv");

    // Archivo que parece JSON pero es configuración de una aplicación, no registros de negocio
    fs.writeFileSync(
      fakeDbPath,
      JSON.stringify(
        {
          appConfig: "v2.1",
          theme: "dark",
          debugMode: true,
          compilerOptions: { target: "es2022" },
        },
        null,
        2,
      ),
      "utf-8",
    );

    // Archivo válido de inventario en el mismo directorio
    fs.writeFileSync(
      validAltPath,
      [
        "sku,nombre,categoria,stock,min_stock,precio,costo",
        "MX-VAL-101,Válvula Hidráulica 2 Pulgadas,HIDRAULICA,45,10,850.00,520.00",
        "MX-BOM-102,Bomba Centrífuga 5HP,BOMBEO,18,5,4200.00,2900.00",
        "MX-SEN-103,Sensor de Presión Industrial,ELECTRONICA,60,15,620.00,380.00",
        "MX-FIL-104,Filtro de Alta Presión,HIDRAULICA,25,8,310.00,190.00",
      ].join("\n"),
      "utf-8",
    );

    // 1. El agente ejecuta la herramienta de inspección sobre el archivo falso
    const toolRes = await dispatchToolCall(
      "inspeccionar_fuente_datos",
      { ruta_archivo: fakeDbPath },
      { companyId: TEST_COMPANY_ID, userRole: "owner", isHumanCaller: true },
    );

    expect(toolRes.result.isValidBusinessData).toBe(false);
    expect(toolRes.result.detectedEntityType).toBe("non_business_config");
    expect(toolRes.result.rejectionReason).toContain("configuración");
    expect(toolRes.result.discoveredAlternatives.length).toBeGreaterThanOrEqual(1);
    expect(toolRes.result.discoveredAlternatives[0].fileName).toBe("real_inventory_catalog.csv");

    // 2. Intentar importar el archivo falso sin fallback debe rechazarlo sin importar nada
    const rejectedImport = await importBusinessDataWithRecovery({
      filePath: fakeDbPath,
      companyId: TEST_COMPANY_ID,
      autoSwitchToAlternativeIfInvalid: false,
    });
    expect(rejectedImport.success).toBe(false);
    expect(rejectedImport.status).toBe("REJECTED_INVALID_SOURCE");
    expect(rejectedImport.importedCount).toBe(0);
  });

  it("Scenario B — Failed database connection: diagnoses root cause, activates fallback, preserves task, and never crashes", async () => {
    const diagRes = await dispatchToolCall(
      "diagnosticar_conexion_bd",
      { database_url: "postgresql://wrong_user:wrong_pass@127.0.0.1:59999/non_existent_db" },
      { companyId: TEST_COMPANY_ID, userRole: "owner", isHumanCaller: true },
    );

    expect(diagRes.result.isSuccess).toBe(false);
    expect(diagRes.result.failureCategory).toBe("SERVICE_UNREACHABLE");
    expect(diagRes.result.recoverable).toBe(true);
    expect(diagRes.result.fallbackActive).toBe(true);
    expect(diagRes.result.rootCause).toContain("rechazó la conexión");

    // Verificar que el motor principal de MINT sigue 100% operativo después del fallo
    const activeHealth = await dispatchToolCall(
      "diagnosticar_conexion_bd",
      {},
      { companyId: TEST_COMPANY_ID, userRole: "owner", isHumanCaller: true },
    );
    expect(activeHealth.result.isSuccess).toBe(true);
    expect(activeHealth.result.connected).toBe(true);
  });

  it("Scenario C & Scenario G — Interrupted import & Recovery after restart: saves checkpoint, avoids duplicate records on resume, and self-verifies DB", async () => {
    const validAltPath = path.join(TEMP_DIR, "real_inventory_catalog.csv");

    // Paso 1: Iniciar importación de 4 productos pero simular interrupción después de las primeras 2 filas
    const interruptedRes = await importBusinessDataWithRecovery({
      filePath: validAltPath,
      companyId: TEST_COMPANY_ID,
      authorizedBy: "owner",
      simulateInterruptAfterRow: 2,
    });

    expect(interruptedRes.success).toBe(false);
    expect(interruptedRes.status).toBe("INTERRUPTED");
    expect(interruptedRes.importedCount).toBe(2);
    expect(interruptedRes.checkpointId).toBeTruthy();

    // Paso 2 (Scenario G): Simular reinicio y consultar checkpoints incompletos
    const incompleteCheckpoints = await getTaskCheckpoints(TEST_COMPANY_ID, true);
    const activeChk = incompleteCheckpoints.find((c) => c.id === interruptedRes.checkpointId);
    expect(activeChk).toBeDefined();
    expect(activeChk?.status).toBe("INTERRUPTED");
    expect((activeChk?.completedSteps as string[]).length).toBe(2);
    expect((activeChk?.pendingSteps as string[]).length).toBe(2);

    // Paso 3: Reanudar la importación desde el checkpoint; debe omitir los 2 ya importados e importar solo los 2 faltantes
    const resumedRes = await importBusinessDataWithRecovery({
      filePath: validAltPath,
      companyId: TEST_COMPANY_ID,
      authorizedBy: "owner",
      checkpointId: interruptedRes.checkpointId,
    });

    expect(resumedRes.success).toBe(true);
    expect(resumedRes.status).toBe("COMPLETED");
    expect(resumedRes.skippedAlreadyImportedCount).toBe(2);
    expect(resumedRes.importedCount).toBe(2);
    expect(resumedRes.verifiedInDatabaseCount).toBe(4);
    expect(resumedRes.verificationPassed).toBe(true);

    // Verificar en la base de datos que exactamente existen los 4 productos sin duplicados
    const dbProds = await db
      .select()
      .from(products)
      .where(eq(products.companyId, TEST_COMPANY_ID));
    expect(dbProds.length).toBe(4);
  });

  it("Scenario D — Failed notification: detects invalid webhook, never claims success, and preserves pending notification in queue", async () => {
    const badChannelId = `chan_bad_${Date.now()}`;
    await db.insert(notificationChannels).values({
      id: badChannelId,
      companyId: TEST_COMPANY_ID,
      type: "discord",
      name: "Webhook Discord Inválido",
      config: { webhookUrl: "http://127.0.0.1:59998/invalid-webhook-endpoint" },
      isActive: true,
    });

    const notifRes = await dispatchToolCall(
      "enviar_notificacion_operativa",
      {
        titulo: "Alerta de Prueba con Webhook Caído",
        mensaje: "Stock crítico detectado en almacén central.",
        severidad: "critica",
      },
      { companyId: TEST_COMPANY_ID, userRole: "owner", isHumanCaller: true },
    );

    expect(notifRes.result.isSuccess).toBe(false);
    expect(notifRes.result.verified).toBe(false);
    expect(notifRes.result.preservedAsPending).toBe(true);

    // Verificar que la notificación quedó preservada como PENDING_RETRY en notification_log
    const logs = await db
      .select()
      .from(notificationLog)
      .where(
        and(
          eq(notificationLog.companyId, TEST_COMPANY_ID),
          eq(notificationLog.status, "PENDING_RETRY"),
        ),
      );
    expect(logs.length).toBeGreaterThanOrEqual(1);
  });

  it("Scenario E — Unexpected multi-step user request: organizes inventory, normalizes categories, detects orphans/duplicates, and verifies", async () => {
    // Insertar un producto adicional sin fila de almacén y con categoría en mayúsculas/espacios y sin proveedor
    await db
      .insert(products)
      .values({
        id: `prod_${TEST_COMPANY_ID}_orphan`,
        companyId: TEST_COMPANY_ID,
        name: "Bomba Centrífuga 5HP", // Nombre duplicado respecto a MX-BOM-102
        sku: "MX-BOM-DUP",
        category: "  BOMBEO  ",
        minStock: 5,
        price: "0.00",
        costPrice: "0.00",
        origin: "real",
      })
      .onConflictDoNothing();

    const orgToolRes = await dispatchToolCall(
      "organizar_y_auditar_inventario",
      { aplicar_correcciones_seguras: true },
      { companyId: TEST_COMPANY_ID, userRole: "owner", isHumanCaller: true },
    );

    expect(orgToolRes.result.isSuccess).toBe(true);
    expect(orgToolRes.result.verified).toBe(true);
    expect(orgToolRes.result.safeFixesApplied.missingWarehouseRowsCreated).toBeGreaterThanOrEqual(1);
    expect(orgToolRes.result.safeFixesApplied.categoriesNormalized).toBeGreaterThanOrEqual(1);
    expect(orgToolRes.result.issuesRequiringAttention.duplicateProductNamesCount).toBeGreaterThanOrEqual(1);
    expect(orgToolRes.result.issuesRequiringAttention.productsWithoutSupplierCount).toBeGreaterThanOrEqual(1);
    expect(orgToolRes.result.issuesRequiringAttention.productsWithMissingPricingCount).toBeGreaterThanOrEqual(1);
  });

  it("Scenario F — Unauthorized destructive/mutating request: blocks cashier from deleting records or adjusting stock and records RBAC security incident", async () => {
    // 1. Cajero intenta eliminar registros de negocio
    const deleteAttempt = await dispatchToolCall(
      "eliminar_registro",
      { tabla: "inventory" },
      { companyId: TEST_COMPANY_ID, userRole: "cashier", isHumanCaller: true },
    );

    expect(deleteAttempt.result.isSuccess).toBe(false);
    expect(deleteAttempt.result.permissionDenied).toBe(true);
    expect(deleteAttempt.result.code).toBe("DENIED_USER_ROLE_INSUFFICIENT");

    // 2. Cajero intenta alterar el stock arbitrariamente
    const stockAttempt = await dispatchToolCall(
      "ajustar_stock",
      { producto_id: "MX-VAL-101", cantidad_delta: -45, motivo: "Vaciar inventario" },
      { companyId: TEST_COMPANY_ID, userRole: "cashier", isHumanCaller: true },
    );

    expect(stockAttempt.result.isSuccess).toBe(false);
    expect(stockAttempt.result.permissionDenied).toBe(true);
    expect(stockAttempt.result.code).toBe("DENIED_USER_ROLE_INSUFFICIENT");

    // 3. Verificar que el incidente de seguridad quedó grabado en audit_incidents
    const incidents = await db
      .select()
      .from(auditIncidents)
      .where(
        and(
          eq(auditIncidents.companyId, TEST_COMPANY_ID),
          eq(auditIncidents.incidentType, "VIOLACION_RBAC"),
        ),
      );
    expect(incidents.length).toBeGreaterThanOrEqual(2);

    // 4. Verificar que el stock de MX-VAL-101 sigue intacto en 45 unidades
    const [valProd] = await db
      .select()
      .from(products)
      .where(and(eq(products.companyId, TEST_COMPANY_ID), eq(products.sku, "MX-VAL-101")))
      .limit(1);
    const [valInv] = await db
      .select()
      .from(inventory)
      .where(and(eq(inventory.companyId, TEST_COMPANY_ID), eq(inventory.productId, valProd.id)))
      .limit(1);
    expect(valInv.stock).toBe(45);
  });

  it("Scenario H — Proactive problem detection: independently detects direct DB stock drop (45 -> 0) without manual alert command", async () => {
    const [valProd] = await db
      .select()
      .from(products)
      .where(and(eq(products.companyId, TEST_COMPANY_ID), eq(products.sku, "MX-VAL-101")))
      .limit(1);

    // Modificar directamente el stock en la base de datos de 45 a 0 (simulando cambio externo sin comando manual)
    await db
      .update(inventory)
      .set({ stock: 0, updatedAt: new Date() })
      .where(and(eq(inventory.companyId, TEST_COMPANY_ID), eq(inventory.productId, valProd.id)));

    // Ejecutar el detector proactivo del daemon
    const detection = await detectProactiveStockChanges(TEST_COMPANY_ID);

    expect(detection.detectedChanges).toBeGreaterThanOrEqual(1);
    expect(detection.criticalDrops).toBeGreaterThanOrEqual(1);
    expect(detection.events[0].sku).toBe("MX-VAL-101");
    expect(detection.events[0].previousStock).toBe(45);
    expect(detection.events[0].currentStock).toBe(0);

    // Verificar que se generó el evento operativo y el incidente de caída de stock sin venta
    const opEvents = await db
      .select()
      .from(operationalEvents)
      .where(
        and(
          eq(operationalEvents.companyId, TEST_COMPANY_ID),
          eq(operationalEvents.eventType, "PROACTIVE_STOCK_ANOMALY_DETECTED"),
        ),
      );
    expect(opEvents.length).toBeGreaterThanOrEqual(1);
  });

  it("Capability Awareness & Persistent Operational Memory: remembers supplier directives and honestly reports GPS status", async () => {
    const memSaved = await dispatchToolCall(
      "guardar_memoria_operativa",
      {
        categoria: "DIRECTIVA_PROVEEDOR",
        clave_tema: "PROVEEDOR_HIDRAULICA_LEAD_TIME",
        contenido: "El proveedor de válvulas hidráulicas ahora tarda 6 días hábiles en entregar en lugar de 3.",
      },
      { companyId: TEST_COMPANY_ID, userRole: "owner", isHumanCaller: true },
    );
    expect(memSaved.result.isSuccess).toBe(true);
    expect(memSaved.result.verified).toBe(true);

    const activeMem = await getActiveOperationalMemory(TEST_COMPANY_ID);
    expect(activeMem.length).toBeGreaterThanOrEqual(1);
    expect(activeMem[0].content).toContain("6 días hábiles");

    const caps = await verifySystemCapabilities(TEST_COMPANY_ID, "cashier");
    expect(caps.database.connected).toBe(true);
    expect(caps.telemetryAndGps.liveGpsProviderConnected).toBe(false);
    expect(caps.telemetryAndGps.capabilityNote).toContain("No hay un proveedor de telemetría GPS en vivo");
    expect(caps.currentUserAuthorization.deniedTools).toContain("ajustar_stock");
  });

  it("Scenario I — Architectural Principle: Rules as boundaries, recovery as part of the task, and full evidence trajectory in runAgentLoop", async () => {
    // 1. Rules are for boundaries, not intelligence:
    // Verificar que 'consultar_esquema_y_datos_bd' bloquea sentencias destructivas pero permite consultas analíticas libres
    const blockedDrop = await dispatchToolCall(
      "consultar_esquema_y_datos_bd",
      { modo: "query", consulta_sql: "DROP TABLE products" },
      { companyId: TEST_COMPANY_ID, userRole: "owner", isHumanCaller: true },
    );
    expect(blockedDrop.result.isSuccess).toBe(false);
    expect(blockedDrop.result.blockedBySecurityPolicy).toBe(true);

    // 2. Ejecutar runAgentLoop donde el agente enfrenta un fallo en el Paso 1 (columna inexistente),
    // recibe la directiva de recuperación + esquema real, corrige su consulta en el Paso 2,
    // actualiza un registro autorizado en el Paso 3 y devuelve la cadena completa de evidencia.
    const testCaseId = `case_arch_${Date.now().toString(36)}`;
    await db
      .insert(cases)
      .values({
        id: testCaseId,
        companyId: TEST_COMPANY_ID,
        title: "Auditoría de margen y actualización de stock mínimo",
        description: "Calcula el margen de ganancia de los productos de la empresa y sube el stock mínimo de MX-VAL-101 a 20 unidades.",
        status: "en_proceso",
      })
      .onConflictDoNothing();

    const [targetProd] = await db
      .select()
      .from(products)
      .where(and(eq(products.companyId, TEST_COMPANY_ID), eq(products.sku, "MX-VAL-101")))
      .limit(1);

    let stepCounter = 0;
    const mockReasoningClient = {
      chatCompletion: async () => {
        stepCounter++;
        if (stepCounter === 1) {
          // Paso 1: El agente intenta una consulta analítica con un nombre de columna erróneo ('precio_inexistente')
          return {
            content: "Voy a consultar los precios y costos de los productos para calcular el margen.",
            toolCalls: [
              {
                id: "call_step_1",
                type: "function",
                function: {
                  name: "consultar_esquema_y_datos_bd",
                  arguments: JSON.stringify({
                    modo: "query",
                    consulta_sql: `SELECT sku, name, precio_inexistente FROM products WHERE company_id = '${TEST_COMPANY_ID}'`,
                  }),
                },
              },
            ],
            message: {
              role: "assistant",
              content: "Voy a consultar los precios y costos de los productos para calcular el margen.",
              tool_calls: [
                {
                  id: "call_step_1",
                  type: "function",
                  function: {
                    name: "consultar_esquema_y_datos_bd",
                    arguments: JSON.stringify({
                      modo: "query",
                      consulta_sql: `SELECT sku, name, precio_inexistente FROM products WHERE company_id = '${TEST_COMPANY_ID}'`,
                    }),
                  },
                },
              ],
            },
            usage: { totalTokens: 120, promptTokens: 80, completionTokens: 40 },
          };
        }
        if (stepCounter === 2) {
          // Paso 2 (Recuperación): Tras ver el esquema real devuelto en el error, corrige la consulta y ejecuta la mutación autorizada
          return {
            content: "La columna correcta en 'products' es 'price' y 'cost_price'. Procedo a consultar con el esquema real y actualizar min_stock a 20.",
            toolCalls: [
              {
                id: "call_step_2a",
                type: "function",
                function: {
                  name: "consultar_esquema_y_datos_bd",
                  arguments: JSON.stringify({
                    modo: "query",
                    consulta_sql: `SELECT sku, name, price, cost_price FROM products WHERE company_id = '${TEST_COMPANY_ID}'`,
                  }),
                },
              },
              {
                id: "call_step_2b",
                type: "function",
                function: {
                  name: "ejecutar_operacion_datos_autorizada",
                  arguments: JSON.stringify({
                    tabla_destino: "products",
                    operacion: "update",
                    registro_id: targetProd.id,
                    cambios: { minStock: 20 },
                    motivo: "Actualización de stock mínimo solicitada tras análisis de margen",
                  }),
                },
              },
            ],
            message: {
              role: "assistant",
              content: "La columna correcta en 'products' es 'price' y 'cost_price'. Procedo a consultar con el esquema real y actualizar min_stock a 20.",
              tool_calls: [
                {
                  id: "call_step_2a",
                  type: "function",
                  function: {
                    name: "consultar_esquema_y_datos_bd",
                    arguments: JSON.stringify({
                      modo: "query",
                      consulta_sql: `SELECT sku, name, price, cost_price FROM products WHERE company_id = '${TEST_COMPANY_ID}'`,
                    }),
                  },
                },
                {
                  id: "call_step_2b",
                  type: "function",
                  function: {
                    name: "ejecutar_operacion_datos_autorizada",
                    arguments: JSON.stringify({
                      tabla_destino: "products",
                      operacion: "update",
                      registro_id: targetProd.id,
                      cambios: { minStock: 20 },
                      motivo: "Actualización de stock mínimo solicitada tras análisis de margen",
                    }),
                  },
                },
              ],
            },
            usage: { totalTokens: 160, promptTokens: 100, completionTokens: 60 },
          };
        }
        return {
          content: "Se recuperó la consulta analítica usando las columnas reales ('price', 'cost_price') y se actualizó y verificó en base de datos el stock mínimo de MX-VAL-101 a 20 unidades.",
          toolCalls: [],
          message: {
            role: "assistant",
            content: "Se recuperó la consulta analítica usando las columnas reales ('price', 'cost_price') y se actualizó y verificó en base de datos el stock mínimo de MX-VAL-101 a 20 unidades.",
          },
          usage: { totalTokens: 90, promptTokens: 60, completionTokens: 30 },
        };
      },
    };

    const report = await runAgentLoop(testCaseId, {
      userRole: "owner",
      client: mockReasoningClient,
    });

    expect(report.status).toBe("resuelto");
    expect(report.evidenceChain).toBeDefined();
    expect(report.evidenceChain!.length).toBe(3);

    // El Paso 1 falló pero quedó marcado como "recovered" cuando el Paso 2 tuvo éxito
    expect(report.evidenceChain![0].outcome).toBe("recovered");
    expect(report.evidenceChain![0].whatFailed).toContain("precio_inexistente");
    expect(report.evidenceChain![0].whatItTriedNext).toContain("consultar_esquema_y_datos_bd");

    // El resumen de evidencia expone herramientas, fallos, recuperación y verificación
    expect(report.evidenceSummary).toBeDefined();
    expect(report.evidenceSummary!.toolsUsed).toContain("consultar_esquema_y_datos_bd");
    expect(report.evidenceSummary!.toolsUsed).toContain("ejecutar_operacion_datos_autorizada");
    expect(report.evidenceSummary!.whatFailed.length).toBeGreaterThanOrEqual(1);
    expect(report.evidenceSummary!.whatItTriedNext.length).toBeGreaterThanOrEqual(1);
    expect(report.evidenceSummary!.allWritesVerified).toBe(true);

    // Verificar en BD que el cambio realmente ocurrió
    const [updatedProd] = await db
      .select()
      .from(products)
      .where(eq(products.id, targetProd.id))
      .limit(1);
    expect(updatedProd.minStock).toBe(20);
  });
});
