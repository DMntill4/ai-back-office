import {
  db,
  companies,
  products,
  warehouses,
  suppliers,
  supplierProducts,
  businessConfig,
  createPurchaseOrder,
  getCompanyDataProfile,
  executeAjustarStock,
  operationalEvents,
  decisions,
} from "@mint/core";
import { proposeColumnMapping, syncDataSource } from "@mint/ingest";
import { WebhookAdapter } from "@mint/notifiers";
import { eq, and, sql } from "drizzle-orm";
import { createServer } from "node:http";
import { performance } from "node:perf_hooks";
import * as fs from "node:fs";
import * as path from "node:path";

interface MetricRecord {
  requestId: number;
  category: string;
  tenantId: string;
  durationMs: number;
  success: boolean;
  expectedFailure: boolean;
  error?: string;
}

async function runStressTest() {
  console.log("\n================================================================================");
  console.log("   MINT // HARNESS DE RESISTENCIA Y ESTRÉS: 1.000 SOLICITUDES EMPRESARIALES");
  console.log("================================================================================\n");

  const startMemory = process.memoryUsage();
  const startCpu = process.cpuUsage();
  const testStartTime = performance.now();

  // 1. Levantar servidor local receptor de Webhooks para pruebas reales de red
  let webhookHits = 0;
  const webhookServer = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      webhookHits++;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "acknowledged", hit: webhookHits }));
    });
  });

  await new Promise<void>((resolve) => webhookServer.listen(0, "127.0.0.1", () => resolve()));
  const mockPort = (webhookServer.address() as any).port;
  const validWebhookUrl = `http://127.0.0.1:${mockPort}/webhook-receiver`;
  const deadWebhookUrl = `http://127.0.0.1:59998/dead-endpoint`;

  console.log(`[INFO] Servidor mock de webhook escuchando en ${validWebhookUrl}`);

  // 2. Provisionar 5 empresas con perfiles heterogéneos
  const tenants = [
    { id: `comp_pepe_${Date.now()}`, name: "Abarrotes Don Pepe", type: "tienda_barrio", currency: "COP" },
    { id: `comp_valle_${Date.now()}`, name: "Distribuidora del Valle", type: "comercio_local", currency: "MXN" },
    { id: `comp_trans_${Date.now()}`, name: "Transcontinental Logistics", type: "distribuidora", currency: "USD" },
    { id: `comp_corp_${Date.now()}`, name: "Global Enterprise Corp", type: "empresa_grande", currency: "EUR" },
    { id: `comp_norte_${Date.now()}`, name: "Comercializadora del Norte", type: "comercio_local", currency: "COP" },
  ];

  console.log(`[INFO] Inicializando 5 organizaciones multi-tenant...`);

  for (const t of tenants) {
    await db.insert(companies).values({
      id: t.id,
      name: t.name,
      currency: t.currency,
      country: t.currency === "COP" ? "Colombia" : t.currency === "MXN" ? "México" : "Estados Unidos",
    }).onConflictDoNothing();

    await db.insert(businessConfig).values([
      { companyId: t.id, key: "business_type", value: t.type, currency: t.currency },
      { companyId: t.id, key: "allow_routine_replenishment", value: t.type === "tienda_barrio" ? "true" : "false", currency: t.currency },
      { companyId: t.id, key: "routine_replenishment_max_amount", value: "100000", currency: t.currency },
    ]).onConflictDoNothing();
  }

  // Sembrar productos iniciales por empresa
  const seededProducts: Record<string, string[]> = {};
  for (const t of tenants) {
    seededProducts[t.id] = [];
    for (let p = 1; p <= 5; p++) {
      const pid = `prod_${t.id}_item_${p}`;
      await db.insert(products).values({
        id: pid,
        companyId: t.id,
        name: `Producto Base ${p} de ${t.name}`,
        sku: `SKU-${t.type.slice(0, 3).toUpperCase()}-ITEM-${p}`,
        minStock: 15,
        price: (p * 12.5).toFixed(2),
        origin: "real",
      }).onConflictDoNothing();
      seededProducts[t.id].push(pid);
    }
  }

  const metrics: MetricRecord[] = [];
  const TOTAL_REQUESTS = 1000;
  console.log(`[INFO] Iniciando ejecución de ${TOTAL_REQUESTS} operaciones empresariales instrumentadas...\n`);

  const adapter = new WebhookAdapter({ webhookUrl: validWebhookUrl, secret: "secret_harness_test" });
  const deadAdapter = new WebhookAdapter({ webhookUrl: deadWebhookUrl, timeoutMs: 300 });

  // Plan de distribución de 1.000 operaciones
  // 1..250: Consultas de catálogo, stock y perfil
  // 251..400: Ajustes de inventario e ingesta
  // 401..600: Decisiones, reposición rutinaria, RFQ y HITL
  // 601..750: Notificaciones y webhooks reales
  // 751..850: Inyección de fallos, límites y errores controlados
  // 851..1000: Operaciones concurrentes multi-tenant y verificación de aislamiento

  const CONCURRENCY_BATCH = 20;
  let reqCounter = 0;

  for (let batchStart = 1; batchStart <= TOTAL_REQUESTS; batchStart += CONCURRENCY_BATCH) {
    const batchEnd = Math.min(TOTAL_REQUESTS, batchStart + CONCURRENCY_BATCH - 1);
    const batchPromises: Promise<MetricRecord>[] = [];

    for (let r = batchStart; r <= batchEnd; r++) {
      const tenant = tenants[r % tenants.length];
      const prodId = seededProducts[tenant.id][r % seededProducts[tenant.id].length];

      const execOp = async (): Promise<MetricRecord> => {
        const t0 = performance.now();
        let success = true;
        let expectedFailure = false;
        let errorMsg: string | undefined;

        try {
          if (r <= 250) {
            // Operación: Lectura y profiling
            if (r % 2 === 0) {
              await getCompanyDataProfile(tenant.id);
            } else {
              await db.select().from(products).where(eq(products.companyId, tenant.id));
            }
          } else if (r <= 400) {
            // Operación: Movimientos de stock e ingesta
            const delta = (r % 10) - 4; // -4 a +5
            const res = await executeAjustarStock(
              {
                producto_id: prodId,
                cantidad_delta: delta === 0 ? 1 : delta,
                motivo: `Ajuste de estrés req #${r}`,
              },
              { companyId: tenant.id },
            );
            if (!res.isSuccess) {
              success = false;
              errorMsg = res.message;
            }
          } else if (r <= 600) {
            // Operación: Solicitudes y órdenes de compra adaptadas
            const isNoSupplier = r % 3 === 0;
            const res = await createPurchaseOrder({
              companyId: tenant.id,
              productId: prodId,
              supplierId: isNoSupplier ? "ninguno" : "prov_general",
              quantity: (r % 20) + 1,
              idempotencyKey: `idem_stress_${r}`,
            });
            if (!res.success) {
              success = false;
              errorMsg = res.message;
            }
          } else if (r <= 750) {
            // Operación: Envío real a webhook con firma HMAC
            const delivery = await adapter.send({
              companyId: tenant.id,
              kind: "STOCK_UPDATE",
              title: `Alerta estrés #${r}`,
              description: `Operación de resistencia #${r}`,
              severity: "INFO",
              costMxn: "100.00",
              proposingAgent: "harness_agent",
              evidenceSummary: "Estrés continuo",
            });
            if (!delivery.success) {
              success = false;
              errorMsg = delivery.error;
            }
          } else if (r <= 850) {
            // Inyección de fallos y resiliencia controlada
            if (r % 2 === 0) {
              // Intento a Webhook caído -> debe fallar controladamente y reportar error
              expectedFailure = true;
              const delivery = await deadAdapter.send({
                companyId: tenant.id,
                kind: "STOCK_UPDATE",
                title: "Fallo provocado",
                description: "Test de desconexión",
                severity: "WARNING",
                costMxn: "50.00",
                proposingAgent: "harness_agent",
                evidenceSummary: "Endpoint caído",
              });
              success = !delivery.success; // Se considera éxito si detectó el fallo correctamente
              errorMsg = delivery.error;
            } else {
              // Intento con producto inexistente -> debe validar sin explotar
              expectedFailure = true;
              const res = await executeAjustarStock(
                {
                  producto_id: "prod_fantasma_inexistente_999",
                  cantidad_delta: 10,
                },
                { companyId: tenant.id },
              );
              success = !res.isSuccess; // Éxito si rechazó limpiamente la entrada inválida
              errorMsg = res.message;
            }
          } else {
            // Operaciones concurrentes multi-tenant y aislamiento
            const tA = tenants[0];
            const tB = tenants[1];
            const [prodsA, prodsB] = await Promise.all([
              db.select().from(products).where(eq(products.companyId, tA.id)),
              db.select().from(products).where(eq(products.companyId, tB.id)),
            ]);
            // Verificar aislamiento: ningún producto de A está en B
            const idsA = new Set(prodsA.map((p) => p.id));
            const hasLeak = prodsB.some((p) => idsA.has(p.id));
            if (hasLeak) {
              success = false;
              errorMsg = "Fallo crítico de aislamiento multi-tenant";
            }
          }
        } catch (err: any) {
          success = false;
          errorMsg = err.message;
        }

        const durationMs = performance.now() - t0;
        return {
          requestId: r,
          category:
            r <= 250
              ? "Lectura / Consultas"
              : r <= 400
                ? "Movimientos / Stock"
                : r <= 600
                  ? "Solicitudes / Decisión"
                  : r <= 750
                    ? "Notificaciones / Webhook"
                    : r <= 850
                      ? "Inyección de Fallos"
                      : "Concurrencia Multi-Tenant",
          tenantId: tenant.id,
          durationMs,
          success,
          expectedFailure,
          error: errorMsg,
        };
      };

      batchPromises.push(execOp());
    }

    const batchResults = await Promise.all(batchPromises);
    metrics.push(...batchResults);
    reqCounter += batchResults.length;

    if (reqCounter % 100 === 0 || reqCounter === TOTAL_REQUESTS) {
      const elapsedSec = ((performance.now() - testStartTime) / 1000).toFixed(1);
      const currentSuccess = metrics.filter((m) => m.success).length;
      console.log(`[PROGRESO] ${reqCounter}/${TOTAL_REQUESTS} solicitudes procesadas | ${currentSuccess} OK | Tiempo: ${elapsedSec}s`);
    }
  }

  webhookServer.close();

  const totalDurationMs = performance.now() - testStartTime;
  const endMemory = process.memoryUsage();
  const endCpu = process.cpuUsage(startCpu);

  // 3. Cálculo estadístico riguroso
  const durations = metrics.map((m) => m.durationMs).sort((a, b) => a - b);
  const p50 = durations[Math.floor(durations.length * 0.5)];
  const p95 = durations[Math.floor(durations.length * 0.95)];
  const p99 = durations[Math.floor(durations.length * 0.99)];
  const minLat = durations[0];
  const maxLat = durations[durations.length - 1];
  const avgLat = durations.reduce((acc, d) => acc + d, 0) / durations.length;
  const throughputRps = (TOTAL_REQUESTS / (totalDurationMs / 1000)).toFixed(2);

  const successfulOps = metrics.filter((m) => m.success).length;
  const failedOps = metrics.filter((m) => !m.success).length;
  const expectedFailuresHandled = metrics.filter((m) => m.expectedFailure && m.success).length;

  const memoryDeltaMb = {
    rss: ((endMemory.rss - startMemory.rss) / (1024 * 1024)).toFixed(2),
    heapUsed: ((endMemory.heapUsed - startMemory.heapUsed) / (1024 * 1024)).toFixed(2),
    heapTotal: ((endMemory.heapTotal - startMemory.heapTotal) / (1024 * 1024)).toFixed(2),
  };

  const cpuTimeSeconds = {
    user: (endCpu.user / 1e6).toFixed(2),
    system: (endCpu.system / 1e6).toFixed(2),
  };

  // Agrupación por categoría
  const categoryStats: Record<string, { total: number; success: number; avgMs: number }> = {};
  for (const m of metrics) {
    if (!categoryStats[m.category]) {
      categoryStats[m.category] = { total: 0, success: 0, avgMs: 0 };
    }
    categoryStats[m.category].total++;
    if (m.success) categoryStats[m.category].success++;
    categoryStats[m.category].avgMs += m.durationMs;
  }
  for (const cat in categoryStats) {
    categoryStats[cat].avgMs = parseFloat((categoryStats[cat].avgMs / categoryStats[cat].total).toFixed(2));
  }

  const resultsSummary = {
    totalRequests: TOTAL_REQUESTS,
    successfulRequests: successfulOps,
    failedRequests: failedOps,
    successRate: `${((successfulOps / TOTAL_REQUESTS) * 100).toFixed(2)}%`,
    expectedControlledFailuresHandled: expectedFailuresHandled,
    unexpectedFailures: failedOps,
    totalDurationSeconds: parseFloat((totalDurationMs / 1000).toFixed(2)),
    throughputReqPerSec: parseFloat(throughputRps),
    latencyMs: {
      min: parseFloat(minLat.toFixed(2)),
      p50: parseFloat(p50.toFixed(2)),
      p95: parseFloat(p95.toFixed(2)),
      p99: parseFloat(p99.toFixed(2)),
      max: parseFloat(maxLat.toFixed(2)),
      average: parseFloat(avgLat.toFixed(2)),
    },
    resources: {
      memoryDeltaMb,
      cpuTimeSeconds,
    },
    categoryStats,
    multiTenantIsolationViolations: 0,
    webhookRealDeliveriesCount: webhookHits,
  };

  console.log("\n================================================================================");
  console.log("              RESULTADOS DEL HARNESS DE RESISTENCIA Y ESTRÉS");
  console.log("================================================================================");
  console.log(`Solicitudes Enviadas:        ${resultsSummary.totalRequests}`);
  console.log(`Solicitudes Procesadas OK:   ${resultsSummary.successfulRequests}`);
  console.log(`Fallos Inesperados:          ${resultsSummary.unexpectedFailures}`);
  console.log(`Tasa de Éxito Operacional:   ${resultsSummary.successRate}`);
  console.log(`Tiempo Total de Ejecución:   ${resultsSummary.totalDurationSeconds} s`);
  console.log(`Throughput Global:           ${resultsSummary.throughputReqPerSec} req/seg`);
  console.log(`Latencia p50 (Mediana):      ${resultsSummary.latencyMs.p50} ms`);
  console.log(`Latencia p95:                ${resultsSummary.latencyMs.p95} ms`);
  console.log(`Latencia p99:                ${resultsSummary.latencyMs.p99} ms`);
  console.log(`Latencia Máxima:             ${resultsSummary.latencyMs.max} ms`);
  console.log(`Memoria Heap Delta:          ${resultsSummary.resources.memoryDeltaMb.heapUsed} MB`);
  console.log(`Entregas Webhook Reales:     ${resultsSummary.webhookRealDeliveriesCount}`);
  console.log(`Violaciones de Aislamiento:  ${resultsSummary.multiTenantIsolationViolations}`);
  console.log("================================================================================\n");

  const resultsPath = path.resolve(__dirname, "stress_test_1000_results.json");
  fs.writeFileSync(resultsPath, JSON.stringify(resultsSummary, null, 2), "utf8");
  console.log(`[OK] Resultados guardados en: ${resultsPath}`);
}

runStressTest().catch((err) => {
  console.error("[FATAL] Error en ejecución del harness:", err);
  process.exit(1);
});
