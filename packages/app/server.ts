import Fastify from "fastify";
import cors from "@fastify/cors";
import path from "node:path";
import fs from "node:fs";
import {
  db,
  pool,
  products,
  inventory,
  decisions,
  companies,
  warehouses,
  suppliers,
  cases,
  shipments,
  purchaseOrders,
  runAgentLoop,
  runFullOperationalEventScan,
  executeAndVerifyDecision,
  rejectDecision,
  checkDatabaseHealth,
  getSupabaseStatus,
  analyzeDynamicCatalogHealth,
  evaluateWarehouseRebalancing,
  executeWarehouseTransfer,
  dispatchOutboundShipment,
  receiveInboundShipment,
  buildConsolidatedLoadPlans,
  updateLogisticsNodeLocation,
  resolveNodeGeoPoint,
  calculateRealRoute,
} from "@mint/core";
import {
  listNotificationChannels,
  addNotificationChannel,
  testNotificationChannel,
} from "@mint/notifiers";
import { eq, desc, and } from "drizzle-orm";
import { randomUUID } from "node:crypto";

const app = Fastify({ logger: false });

app.register(cors, { origin: true, credentials: true });

// Active session in-memory state (hydrates dynamically from DB on first request)
let activeSession = {
  companyId: "comp_default",
  companyName: "Mint Enterprise",
  userName: "Operator",
  userRole: "owner",
  initialized: false,
};

async function ensureActiveSessionHydrated() {
  if (activeSession.initialized) return;
  try {
    const allCompanies = await db.select().from(companies);
    if (allCompanies.length > 0) {
      // Preferir empresa que tenga productos cargados
      for (const comp of allCompanies) {
        const prods = await db.select().from(products).where(eq(products.companyId, comp.id)).limit(1);
        if (prods.length > 0) {
          activeSession.companyId = comp.id;
          activeSession.companyName = comp.name;
          activeSession.initialized = true;
          return;
        }
      }
      activeSession.companyId = allCompanies[0].id;
      activeSession.companyName = allCompanies[0].name;
    }
    activeSession.initialized = true;
  } catch {
    // Continuar con valores por defecto si la BD no responde aún
  }
}

// ─────────────────────────────────────────────────────────────
// 1. HEALTH & DB STATUS
// ─────────────────────────────────────────────────────────────
app.get("/health", async () => ({
  status: "ok",
  service: "mint-desktop-app",
  timestamp: new Date().toISOString(),
}));

app.get("/api/db/status", async () => {
  const health = await checkDatabaseHealth();
  const supabaseApi = getSupabaseStatus();

  return {
    success: true,
    data: {
      connected: health.connected,
      provider: health.provider,
      isSupabase: health.isSupabase,
      host: health.host,
      database: health.database,
      user: health.user,
      version: health.version,
      timestamp: health.timestamp,
      latencyMs: health.latencyMs,
      tablesCount: health.tablesCount,
      tables: health.tables,
      supabaseApi,
    },
  };
});

app.get("/api/db/tables", async () => {
  const tablesQuery = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    ORDER BY table_name ASC;
  `);

  const results: any[] = [];
  for (const row of tablesQuery.rows) {
    const countRes = await pool
      .query(`SELECT count(*)::int as cnt FROM "${row.table_name}";`)
      .catch(() => ({ rows: [{ cnt: 0 }] }));
    results.push({
      name: row.table_name,
      columnCount: 8,
      rowCount: countRes.rows[0]?.cnt || 0,
    });
  }

  return { success: true, tables: results };
});

// ─────────────────────────────────────────────────────────────
// 2. SESSION & USERS
// ─────────────────────────────────────────────────────────────
app.get("/api/session", async () => {
  await ensureActiveSessionHydrated();
  const allCompanies = await db.select().from(companies);
  return {
    success: true,
    session: activeSession,
    companies: allCompanies.length ? allCompanies : [{ id: activeSession.companyId, name: activeSession.companyName }],
  };
});

app.post("/api/session", async (req) => {
  const body = (req.body as any) || {};
  if (body.companyId) {
    activeSession.companyId = body.companyId;
    activeSession.companyName = body.companyName || body.companyId;
    activeSession.initialized = true;
  }
  return { success: true, session: activeSession };
});

// ─────────────────────────────────────────────────────────────
// 3. PRODUCTS & INVENTORY (REAL DATA + DYNAMIC ROP)
// ─────────────────────────────────────────────────────────────
app.get("/api/products", async (req) => {
  await ensureActiveSessionHydrated();
  const query = (req.query as any) || {};
  const companyId = query.companyId || activeSession.companyId;

  const [prods, invs, health] = await Promise.all([
    db.select().from(products).where(eq(products.companyId, companyId)),
    db.select().from(inventory).where(eq(inventory.companyId, companyId)),
    analyzeDynamicCatalogHealth(companyId).catch(() => []),
  ]);

  const healthMap = new Map(health.map((h) => [h.productId, h]));

  const items = prods.map((p) => {
    const itemInv = invs.filter((i) => i.productId === p.id);
    const stock = itemInv.reduce((sum, item) => sum + item.stock, 0);
    const h = healthMap.get(p.id);
    const status = stock === 0 ? "AGOTADO" : stock < p.minStock || h?.needsReorder ? "BAJO" : "ÓPTIMO";
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category || "General",
      minStock: p.minStock,
      dynamicRop: h?.dynamicRop ?? p.minStock,
      daysCoverage: h?.daysCoverage ?? 30,
      stock,
      status,
      isLowStock: stock < p.minStock,
      origin: p.origin || "real",
    };
  });

  return { success: true, data: items, products: items };
});

app.post("/api/products/adjust", async (req) => {
  await ensureActiveSessionHydrated();
  const body = (req.body as any) || {};
  const { productId, delta } = body;
  const companyId = body.companyId || activeSession.companyId;

  const existingInv = await db
    .select()
    .from(inventory)
    .where(and(eq(inventory.productId, productId), eq(inventory.companyId, companyId)))
    .limit(1);

  if (existingInv.length === 0) {
    return { success: false, error: "Registro de inventario no encontrado para este producto." };
  }

  const newStock = Math.max(0, existingInv[0].stock + Number(delta || 0));
  await db
    .update(inventory)
    .set({ stock: newStock, updatedAt: new Date() })
    .where(eq(inventory.id, existingInv[0].id));

  return { success: true, newStock };
});

app.put("/api/inventory/:id", async (req) => {
  await ensureActiveSessionHydrated();
  const { id } = req.params as { id: string };
  const body = (req.body as any) || {};
  const { stock, minStock } = body;
  const companyId = body.companyId || activeSession.companyId;

  const existingInv = await db.select().from(inventory).where(eq(inventory.productId, id)).limit(1);
  if (existingInv.length > 0) {
    await db.update(inventory).set({ stock, updatedAt: new Date() }).where(eq(inventory.id, existingInv[0].id));
  }

  if (minStock !== undefined) {
    await db.update(products).set({ minStock }).where(and(eq(products.id, id), eq(products.companyId, companyId)));
  }

  return { success: true, message: "Inventario actualizado exitosamente en PostgreSQL" };
});

// ─────────────────────────────────────────────────────────────
// 4. LOGISTICS CONTROL TOWER, GPS & SHIPMENTS
// ─────────────────────────────────────────────────────────────
app.get("/api/logistics/overview", async (req) => {
  await ensureActiveSessionHydrated();
  const query = (req.query as any) || {};
  const companyId = query.companyId || activeSession.companyId;

  const [whs, supps, ships, health, rebalancing, consolidatedLoads] = await Promise.all([
    db.select().from(warehouses).where(eq(warehouses.companyId, companyId)),
    db.select().from(suppliers).where(eq(suppliers.companyId, companyId)),
    db.select().from(shipments).where(eq(shipments.companyId, companyId)).orderBy(desc(shipments.updatedAt)),
    analyzeDynamicCatalogHealth(companyId).catch(() => []),
    evaluateWarehouseRebalancing(companyId).catch(() => []),
    buildConsolidatedLoadPlans(companyId).catch(() => []),
  ]);

  return {
    success: true,
    warehouses: whs,
    suppliers: supps,
    shipments: ships,
    ropAlerts: health.filter((h) => h.needsReorder),
    rebalancingProposals: rebalancing,
    consolidatedLoads,
  };
});

app.post("/api/logistics/dispatch", async (req) => {
  await ensureActiveSessionHydrated();
  const body = (req.body as any) || {};
  const companyId = body.companyId || activeSession.companyId;

  const res = await dispatchOutboundShipment({
    companyId,
    productQuery: body.productQuery,
    quantity: Number(body.quantity || 1),
    destinationAddressOrCity: body.destinationAddressOrCity,
    customerName: body.customerName,
    carrier: body.carrier,
  });

  return res;
});

app.post("/api/logistics/receive", async (req) => {
  await ensureActiveSessionHydrated();
  const body = (req.body as any) || {};
  const companyId = body.companyId || activeSession.companyId;

  const res = await receiveInboundShipment({
    companyId,
    trackingOrOrderId: body.trackingOrOrderId,
  });

  return res;
});

app.post("/api/logistics/rebalance", async (req) => {
  await ensureActiveSessionHydrated();
  const body = (req.body as any) || {};
  const companyId = body.companyId || activeSession.companyId;

  const res = await executeWarehouseTransfer({
    companyId,
    productId: body.productId,
    fromWarehouseId: body.fromWarehouseId,
    toWarehouseId: body.toWarehouseId,
    quantity: Number(body.quantity || 1),
  });

  return res;
});

app.post("/api/logistics/node-location", async (req) => {
  await ensureActiveSessionHydrated();
  const body = (req.body as any) || {};
  const companyId = body.companyId || activeSession.companyId;

  const res = await updateLogisticsNodeLocation({
    companyId,
    nodeType: body.nodeType === "supplier" ? "supplier" : "warehouse",
    nodeIdOrName: body.nodeIdOrName || "Central",
    addressOrCity: body.addressOrCity,
  });

  return res;
});

app.post("/api/logistics/route-calc", async (req) => {
  const body = (req.body as any) || {};
  const { origin, destination } = body;

  const [p1, p2] = await Promise.all([
    resolveNodeGeoPoint({ city: origin }),
    resolveNodeGeoPoint({ city: destination }),
  ]);

  if (!p1 || !p2) {
    return { success: false, message: "No se pudieron geocodificar ambas ubicaciones." };
  }

  const route = await calculateRealRoute(p1, p2, { currency: "MXN" });
  return {
    success: true,
    origin: p1,
    destination: p2,
    route,
  };
});

// ─────────────────────────────────────────────────────────────
// 5. DASHBOARD & KPIS
// ─────────────────────────────────────────────────────────────
app.get("/api/dashboard", async (req) => {
  await ensureActiveSessionHydrated();
  const query = (req.query as any) || {};
  const companyId = query.companyId || activeSession.companyId;

  const [prods, invs, decs, ships, channels] = await Promise.all([
    db.select().from(products).where(eq(products.companyId, companyId)),
    db.select().from(inventory).where(eq(inventory.companyId, companyId)),
    db.select().from(decisions).where(eq(decisions.companyId, companyId)),
    db.select().from(shipments).where(eq(shipments.companyId, companyId)),
    listNotificationChannels(companyId),
  ]);

  const inventoryMapped = prods.map((p) => {
    const itemInv = invs.filter((i) => i.productId === p.id);
    const stock = itemInv.reduce((sum, item) => sum + item.stock, 0);
    return { stock, minStock: p.minStock };
  });

  const outOfStock = inventoryMapped.filter((p) => p.stock === 0).length;
  const lowStock = inventoryMapped.filter((p) => p.stock > 0 && p.stock <= p.minStock).length;
  const pendingDecisions = decs.filter((d) => d.policyDecision === "pending_approval").length;
  const activeShipmentsCount = ships.filter((s) => s.status === "en_transito" || s.status === "retrasado").length;

  const totalSpend = decs
    .filter((d) => d.policyDecision === "approved" || d.policyDecision === "auto_executed")
    .reduce((sum, d) => sum + Number(d.costMxn || 0), 0);

  return {
    success: true,
    data: {
      realProductsCount: prods.length,
      lowStockCount: lowStock,
      inTransitShipments: activeShipmentsCount,
      dailyReport: {
        totalOrders: decs.length,
        automated: decs.filter((d) => d.policyDecision === "auto_executed").length,
        pendingReview: pendingDecisions,
        savings: Math.round(
          decs.reduce((sum, d) => {
            const ep = (d.evidencePayload || {}) as any;
            const sav = ep?.rebalancingAlternative?.netSavingsMxn || ep?.savingsMxn || 0;
            return sum + Number(sav || 0);
          }, 0)
        ),
        spend: totalSpend,
        currency: "MXN",
      },
    },
    metrics: {
      totalProducts: prods.length,
      outOfStock,
      lowStock,
      healthyProducts: prods.length - outOfStock - lowStock,
      pendingDecisions,
      activeShipments: activeShipmentsCount,
      activeChannels: channels.length,
      totalSpendMxn: totalSpend,
      daemonStatus: "ONLINE",
    },
    company: activeSession,
  };
});

// ─────────────────────────────────────────────────────────────
// 6. DECISIONS & APPROVALS (HITL)
// ─────────────────────────────────────────────────────────────
app.get("/api/approvals", async () => {
  await ensureActiveSessionHydrated();
  const companyId = activeSession.companyId;
  const allDecs = await db
    .select()
    .from(decisions)
    .where(eq(decisions.companyId, companyId))
    .orderBy(desc(decisions.decidedAt))
    .limit(20);

  return {
    success: true,
    data: allDecs.filter((d) => d.policyDecision === "pending_approval"),
  };
});

app.post("/api/approvals/:id", async (req) => {
  const { id } = req.params as { id: string };
  const body = (req.body as any) || {};
  const action = body.action || "aprobado";

  if (action === "aprobado") {
    const res = await executeAndVerifyDecision(id, "operator_app");
    return { success: true, approval: res };
  } else {
    const res = await rejectDecision(id, "operator_app", body.reason || "Rechazado desde Desktop App");
    return { success: true, approval: res };
  }
});

app.get("/api/decisions", async () => {
  await ensureActiveSessionHydrated();
  const companyId = activeSession.companyId;
  const allDecs = await db
    .select()
    .from(decisions)
    .where(eq(decisions.companyId, companyId))
    .orderBy(desc(decisions.decidedAt))
    .limit(30);

  return { success: true, decisions: allDecs };
});

app.post("/api/decisions/:id/approve", async (req) => {
  const { id } = req.params as { id: string };
  const res = await executeAndVerifyDecision(id, "operator_app");
  return { success: res.success, result: res, error: res.error };
});

app.post("/api/decisions/:id/reject", async (req) => {
  const { id } = req.params as { id: string };
  const body = (req.body as any) || {};
  const res = await rejectDecision(id, "operator_app", body.reason || "Rechazado desde Mint Desktop App");
  return { success: res.success, result: res };
});

// ─────────────────────────────────────────────────────────────
// 7. CASES & OPERATIONAL ORDERS
// ─────────────────────────────────────────────────────────────
app.get("/api/cases", async (req) => {
  await ensureActiveSessionHydrated();
  const query = (req.query as any) || {};
  const companyId = query.companyId || activeSession.companyId;

  const allCases = await db
    .select()
    .from(cases)
    .where(eq(cases.companyId, companyId))
    .orderBy(desc(cases.createdAt))
    .limit(25);

  const mapped = allCases.map((c) => ({
    id: c.id,
    title: c.title || "Caso Operativo",
    agent: "Mint Multi-Agente",
    priority: c.priority || "Media",
    status: c.status === "resuelto" ? "Resuelto" : "En Proceso",
    sla: "Dentro de SLA",
    totalCost: c.totalCost || "0.00",
    totalTokens: c.totalTokens || 0,
    createdAt: c.createdAt ? c.createdAt.toISOString() : new Date().toISOString(),
  }));

  return { success: true, data: mapped };
});

app.get("/api/orders", async (req) => {
  await ensureActiveSessionHydrated();
  const query = (req.query as any) || {};
  const companyId = query.companyId || activeSession.companyId;

  const orders = await db
    .select()
    .from(purchaseOrders)
    .where(eq(purchaseOrders.companyId, companyId))
    .orderBy(desc(purchaseOrders.createdAt))
    .limit(25);

  const mapped = orders.map((o) => ({
    orderId: o.id,
    sku: o.productId || "SKU-REAL",
    productName: o.productId,
    provider: o.supplierId || "Proveedor Homologado",
    amountMXN: String(o.totalAmount || "0"),
    humanApproved: true,
    status: o.status || "abierta",
    createdAt: o.createdAt ? o.createdAt.toISOString() : new Date().toISOString(),
  }));

  return { success: true, data: mapped };
});

// ─────────────────────────────────────────────────────────────
// 8. CHAT (MULTI-AGENT INTERACTIVE COORDINATOR)
// ─────────────────────────────────────────────────────────────
app.post("/api/chat", async (req) => {
  await ensureActiveSessionHydrated();
  const body = (req.body as any) || {};
  const message = body.message || "";
  const companyId = body.companyId || activeSession.companyId;
  const caseId = body.caseId || `chat_${randomUUID().slice(0, 8)}`;

  await db.insert(cases).values({
    id: caseId,
    companyId,
    title: "Coordinador Logístico App",
    description: message,
    status: "en_proceso",
    priority: "media",
  });

  const timeline: Array<{ agent: string; action: string }> = [];
  const res = await runAgentLoop(caseId, {
    onEvent: (ev) => {
      timeline.push({ agent: ev.agent, action: ev.action });
    },
  });

  return {
    success: true,
    caseId,
    response: res.summary,
    status: res.status,
    metrics: {
      totalCostUsd: parseFloat(res.totalCost),
      totalTokens: res.totalTokens,
      iterations: res.totalSteps,
    },
    multiAgentEvents: timeline,
  };
});

// ─────────────────────────────────────────────────────────────
// 9. CHANNELS & PROACTIVE ALERTS
// ─────────────────────────────────────────────────────────────
app.get("/api/channels", async () => {
  await ensureActiveSessionHydrated();
  const companyId = activeSession.companyId;
  const channels = await listNotificationChannels(companyId);
  return { success: true, channels };
});

app.post("/api/channels", async (req) => {
  await ensureActiveSessionHydrated();
  const body = (req.body as any) || {};
  const companyId = activeSession.companyId;
  const { type, name, webhookUrl, botToken, chatId, topics } = body;

  const config: Record<string, any> = {
    topics: topics || ["logs", "stock", "logistics", "critical"],
  };

  if (type === "discord" || type === "slack") {
    config.webhookUrl = webhookUrl;
  } else if (type === "telegram") {
    config.botToken = botToken;
    config.chatId = chatId;
  }

  const created = await addNotificationChannel({
    companyId,
    type,
    name,
    config,
  });

  return { success: true, channel: created };
});

app.post("/api/channels/test", async (req) => {
  const body = (req.body as any) || {};
  const { type, config, topic } = body;

  try {
    const res = await testNotificationChannel(type, {
      ...config,
      testTopic: topic || "Alerta General",
    });
    return { success: true, result: res };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

app.post("/api/scan", async () => {
  await ensureActiveSessionHydrated();
  const companyId = activeSession.companyId;
  const scanResult = await runFullOperationalEventScan(companyId);
  return { success: true, result: scanResult };
});

// ─────────────────────────────────────────────────────────────
// 10. STATIC DESKTOP APP SERVING (PACKAGES/APP/PUBLIC)
// ─────────────────────────────────────────────────────────────
const publicDir = path.resolve(__dirname, "public");

app.get("/*", async (req, reply) => {
  const reqPath = req.url.split("?")[0];
  if (reqPath.startsWith("/api/") || reqPath === "/health") {
    reply.status(404).send({ error: "Endpoint no encontrado" });
    return;
  }

  const cleanPath = reqPath === "/" ? "index.html" : reqPath.slice(1);
  const filePath = path.join(publicDir, cleanPath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap: Record<string, string> = {
      ".html": "text/html; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".webp": "image/webp",
      ".png": "image/png",
      ".svg": "image/svg+xml",
      ".json": "application/json",
      ".ico": "image/x-icon",
    };
    reply.type(mimeMap[ext] || "application/octet-stream").send(fs.readFileSync(filePath));
    return;
  }

  const indexPath = path.join(publicDir, "index.html");
  if (fs.existsSync(indexPath)) {
    reply.type("text/html; charset=utf-8").send(fs.readFileSync(indexPath, "utf-8"));
  } else {
    reply.status(404).send("UI no encontrada");
  }
});

// ─────────────────────────────────────────────────────────────
// 11. SERVER STARTUP
// ─────────────────────────────────────────────────────────────
const PORT = 4200;
export async function startAppServer() {
  try {
    await app.listen({ port: PORT, host: "127.0.0.1" });
    console.log(`[Mint Desktop Engine] Corriendo en http://localhost:${PORT}`);
  } catch {
    // Port already in use, reuse active instance
  }
}

if (require.main === module) {
  startAppServer();
}
