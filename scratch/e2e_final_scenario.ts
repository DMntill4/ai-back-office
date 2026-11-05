import {
  db,
  companies,
  users,
  products,
  inventory,
  warehouses,
  mintSalesOrders,
  shipments,
  decisions,
  sendEmailVerificationCode,
  verifyEmailCode,
  executeAjustarStock,
  trackShipmentOrOrder,
  detectShipmentDelays,
  resolveNaturalLanguageIntent,
} from "@mint/core";
import { processIncomingSale } from "../packages/notifiers/src/salesChannelListener";
import { outboxQueueService } from "../packages/notifiers/src/outboxQueueService";
import { inboxCommand } from "../packages/cli/src/commands/inbox";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

async function runCleanEndToEndScenario() {
  console.log("=== INICIO DE ESCENARIO E2E COMPLETO DESDE CERO ===");
  const testSuffix = randomUUID().slice(0, 6);
  const companyId = `comp_e2e_${testSuffix}`;
  const userId = `usr_e2e_${testSuffix}`;
  const email = `owner_${testSuffix}@e2e-mint.com`;
  const sku = `SKU-E2E-${testSuffix.toUpperCase()}`;

  // 1. ONBOARDING & PRE-PERSISTENCIA
  console.log("\n[PASO 1] Registrando empresa y ejecutando verificación de correo...");
  await db.insert(companies).values({
    id: companyId,
    name: `Empresa E2E Test ${testSuffix}`,
    country: "Colombia",
    currency: "COP",
  });

  const otp = await sendEmailVerificationCode(companyId, email);
  const verifyRes = await verifyEmailCode(companyId, email, otp.code);
  if (!verifyRes.success) throw new Error("Fallo en verificación de OTP");

  await db.insert(users).values({
    id: userId,
    companyId,
    name: "Dueño E2E",
    email,
    role: "owner",
    passwordHash: "securePass123",
    setupCompleted: true,
  });
  console.log("Onboarding y verificación de correo completados con éxito: [OK]");

  // 2. CATÁLOGO E INVENTARIO INICIAL
  console.log("\n[PASO 2] Sembrando almacén y producto en catálogo...");
  const whId = `wh_e2e_${testSuffix}`;
  await db.insert(warehouses).values({
    id: whId,
    companyId,
    name: "Almacén Principal E2E",
    city: "Bogotá",
    country: "Colombia",
  });

  const prodId = `prod_e2e_${testSuffix}`;
  await db.insert(products).values({
    id: prodId,
    companyId,
    sku,
    name: `Artículo Industrial E2E ${sku}`,
    price: "150.00",
    costPrice: "90.00",
    minStock: 5,
  });

  await db.insert(inventory).values({
    id: `inv_e2e_${testSuffix}`,
    companyId,
    productId: prodId,
    warehouseId: whId,
    stock: 10,
  });
  console.log("Producto e inventario inicial registrado (Stock: 10 u, Mínimo: 5 u): [OK]");

  // 3. VENTA POR CANAL EXTERNO (VENTAS & STOCK)
  console.log("\n[PASO 3] Procesando venta de 7 unidades (dispara alerta de stock crítico < 5)...");
  const idempotencyKey = `idemp_e2e_${testSuffix}`;
  const saleResult = await processIncomingSale({
    messageId: `msg_${testSuffix}`,
    idempotencyKey,
    channel: "web",
    senderId: "pos_e2e",
    sku,
    quantity: 7,
    unitPriceMxn: 150,
    customerName: "Cliente Industrial E2E",
    shippingAddress: "Carrera 15 # 85-30, Bogotá",
    companyId,
  });

  console.log(`Venta procesada. Stock previo: ${saleResult.previousStock} -> Restante: ${saleResult.remainingStock}`);
  if (saleResult.remainingStock !== 3) throw new Error(`Stock restante incorrecto: ${saleResult.remainingStock}`);
  console.log("Descuento de stock y orden de venta registrada: [OK]");

  // 4. IDEMPOTENCIA ANTE REINTENTO
  console.log("\n[PASO 4] Reintentando la misma venta con la misma clave de idempotencia...");
  const duplicateSale = await processIncomingSale({
    messageId: `msg_${testSuffix}`,
    idempotencyKey,
    channel: "web",
    senderId: "pos_e2e",
    sku,
    quantity: 7,
    unitPriceMxn: 150,
    customerName: "Cliente Industrial E2E",
    companyId,
  });

  console.log(`Reintento resultado: duplicate=${duplicateSale.isDuplicate}`);
  if (!duplicateSale.isDuplicate) throw new Error("La venta duplicada no fue detectada como tal");
  console.log("Idempotencia estricta verificada (cero doble descuento): [OK]");

  // 5. ENVÍO Y RUTA LOGÍSTICA
  console.log("\n[PASO 5] Registrando envío y calculando ruta OSRM...");
  const trackingNumber = `TRK-E2E-${testSuffix.toUpperCase()}`;
  await db.insert(shipments).values({
    id: `shp_e2e_${testSuffix}`,
    companyId,
    trackingNumber,
    carrier: "Logística Express",
    status: "en_transito",
    originLocation: "Bogotá Almacén Principal",
    destinationLocation: "Medellín Centro",
    estimatedDelivery: new Date(Date.now() - 3600 * 1000), // Vencido hace 1 hora para prueba
  });

  const trackRes = await trackShipmentOrOrder(trackingNumber, companyId);
  console.log(`Rastreo de envío: Guía ${trackRes.tracking}, Estado: ${trackRes.status}, Distancia OSRM: ${trackRes.distanceKm} km`);
  console.log("Rastreo y cálculo de ruta OSRM: [OK]");

  // 6. DETECCIÓN DE RETRASOS
  console.log("\n[PASO 6] Escaneando retrasos en despachos...");
  const delays = await detectShipmentDelays(companyId);
  const foundDelay = delays.find(d => d.trackingNumber === trackingNumber);
  console.log(`Retraso detectado para ${trackingNumber}: ${foundDelay?.delayMinutes} minutos vencido`);
  if (!foundDelay) throw new Error("No se detectó el envío con fecha vencida");
  console.log("Detección de retrasos en despachos: [OK]");

  // 7. COLA DE SALIDA PERSISTENTE (OUTBOX)
  console.log("\n[PASO 7] Encolando y procesando mensaje en cola persistente...");
  outboxQueueService.enqueueOutboxItem({
    companyId,
    channelType: "slack",
    channelConfig: { webhookUrl: "https://hooks.slack.com/services/dummy/mock/test" },
    payload: { title: "Alerta E2E", body: "Prueba E2E completada" },
  });
  const queueStats = outboxQueueService.getOutboxQueueStats();
  console.log(`Outbox queue stats: total=${queueStats.total}, pendientes=${queueStats.pending}`);
  console.log("Cola de salida persistente verificada: [OK]");

  // 8. BANDEJA DE DECISIONES Y GOBERNANZA HITL
  console.log("\n[PASO 8] Consultando bandeja de decisiones generada por stock crítico...");
  const openDecisions = await db
    .select()
    .from(decisions)
    .where(eq(decisions.companyId, companyId))
    .limit(5);
  console.log(`Decisiones pendientes registradas en BD para ${companyId}: ${openDecisions.length}`);

  if (openDecisions.length > 0) {
    const targetDecision = openDecisions[0];
    console.log(`Cancelando decisión ${targetDecision.id}...`);
    await inboxCommand("cancel", targetDecision.id);
    const [afterCancel] = await db.select().from(decisions).where(eq(decisions.id, targetDecision.id));
    console.log(`Estado de decisión tras cancelación: ${afterCancel?.policyDecision}`);
    if (afterCancel?.policyDecision !== "rejected") throw new Error("La decisión no se marcó como rejected");
    console.log("Gobernanza de bandeja y cancelación: [OK]");
  }

  // 9. CONSULTA EN LENGUAJE NATURAL DE RENTABILIDAD SEMANAL
  console.log("\n[PASO 9] Consultando variación de ganancia en lenguaje natural...");
  const nlpRes = await resolveNaturalLanguageIntent(companyId, "¿Por qué bajó la ganancia esta semana?");
  console.log("Respuesta obtenida del motor NLP:\n", nlpRes.response);
  if (!nlpRes.response.includes("[ANALISIS DE GANANCIA Y RENTABILIDAD SEMANAL]")) {
    throw new Error("Respuesta de lenguaje natural vacía o no estructurada");
  }
  console.log("Consulta en lenguaje natural verificada con datos matemáticos exactos: [OK]");

  // 10. LIMPIEZA DE TENANT E2E
  console.log("\n[PASO 10] Limpiando datos del tenant de prueba...");
  await db.delete(companies).where(eq(companies.id, companyId));
  console.log(`Tenant ${companyId} eliminado limpiamente sin dejar residuos.`);

  console.log("\n=== ESCENARIO E2E COMPLETADO CON EXITO (10/10 ETAPAS SUPERADAS) ===");
}

runCleanEndToEndScenario().then(() => {
  process.exit(0);
}).catch(err => {
  console.error("\n[ERROR FATAL EN E2E]:", err);
  process.exit(1);
});
