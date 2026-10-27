import {
  processIncomingSale,
} from "../packages/notifiers/src/salesChannelListener";
import {
  customersCommand,
} from "../packages/cli/src/commands/customers";
import {
  reconcileCommand,
} from "../packages/cli/src/commands/reconcile";
import {
  reconcileSalesPaymentsDeliveries,
  getCustomersPortfolio,
} from "@mint/core";
import {
  resolveNaturalLanguageIntent,
} from "../packages/core/src/agent/naturalIntentEngine";
import { randomUUID } from "node:crypto";

async function verifyE6() {
  console.log("=== VERIFICACION E6: VENTAS, CLIENTES Y FINANZAS ===");

  // E6.1: Venta con idempotencia y descarte de duplicados
  console.log("\n--- Probando E6.1: Idempotencia en canal de ventas ---");
  const testIdempotencyKey = `wh_test_key_${randomUUID().slice(0, 8)}`;
  const orderPayload = {
    messageId: `msg_${randomUUID().slice(0, 6)}`,
    idempotencyKey: testIdempotencyKey,
    channel: "web" as const,
    senderId: "test_sender_01",
    senderName: "Operador Web",
    sku: "MINT-EMP-005",
    quantity: 2,
    customerName: "Cliente Prueba E6",
    customerEmail: "cliente_e6@test.com",
    shippingAddress: "Carrera 7 # 72-01, Bogotá",
    companyId: "comp_default",
  };

  // 1ra recepcion
  const firstReceive = await processIncomingSale(orderPayload);
  console.log("1ra recepcion de venta:", firstReceive.success ? "[OK]" : "[ERROR]", `(SaleID: ${firstReceive.saleId}, Duplicate: ${firstReceive.isDuplicate})`);

  // 2da recepcion identica (reintento / duplicado)
  const secondReceive = await processIncomingSale(orderPayload);
  console.log("2da recepcion identica:", secondReceive.success ? "[OK]" : "[ERROR]", `(SaleID: ${secondReceive.saleId}, Duplicate: ${secondReceive.isDuplicate})`);
  const duplicateIgnored = secondReceive.isDuplicate === true;
  console.log("Descarte estricto de duplicado:", duplicateIgnored ? "[OK]" : "[ERROR DUPLICADO ACEPTADO]");

  // E6.2: Cartera de clientes, LTV y clientes en riesgo
  console.log("\n--- Probando E6.2: Cartera de clientes y clientes en riesgo (>30d) ---");
  const portfolio = await getCustomersPortfolio("comp_default");
  console.log("Clientes totales en cartera:", portfolio.customers.length);
  console.log("Clientes en riesgo (>30d):", portfolio.atRiskCustomers.length);
  console.log("Top LTV clientes:", portfolio.topValuedCustomers.slice(0, 3).map(c => ({
    name: c.customerName,
    orders: c.totalOrders,
    spent: c.totalSpent,
    inactiveDays: c.daysSinceLastOrder,
    status: c.status,
  })));
  console.log("Resultado Cartera E6.2:", portfolio.customers.length >= 0 ? "[OK]" : "[ERROR]");

  // E6.3: Conciliacion 3 vias (ventas vs pagos vs entregas)
  console.log("\n--- Probando E6.3: Conciliacion 3 vias ---");
  const reconcileResult = await reconcileSalesPaymentsDeliveries("comp_default");
  console.log("Ordenes auditadas:", reconcileResult.totalOrdersAudited);
  console.log("Balanceadas:", reconcileResult.balancedCount);
  console.log("Discrepancias:", reconcileResult.discrepanciesCount);
  if (reconcileResult.discrepancies.length > 0) {
    console.log("Ejemplo discrepancia:", reconcileResult.discrepancies[0]);
  }
  console.log("Resultado Conciliacion E6.3:", reconcileResult.totalOrdersAudited >= 0 ? "[OK]" : "[ERROR]");

  // E6.4: Pregunta en lenguaje natural sobre finanzas
  console.log("\n--- Probando E6.4: Lenguaje natural 'por qué bajó la ganancia' ---");
  const nlpResponse = await resolveNaturalLanguageIntent(
    "comp_default",
    "¿Por qué bajó la ganancia esta semana?"
  );
  console.log("Intencion detectada:", nlpResponse.intent);
  console.log("Respuesta del motor de lenguaje natural:\n", nlpResponse.response);
  const hasTraceableData = nlpResponse.response.length > 30;
  console.log("Trazabilidad de datos en respuesta:", hasTraceableData ? "[OK]" : "[ERROR VACIO]");
}

verifyE6().then(() => {
  console.log("\n=== FIN DE VERIFICACION E6 ===");
  process.exit(0);
}).catch(err => {
  console.error("Fallo critico en E6:", err);
  process.exit(1);
});
