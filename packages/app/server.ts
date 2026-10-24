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
  users,
  cases,
  caseEvents,
  shipments,
  purchaseOrders,
  runAgentLoop,
  runFullOperationalEventScan,
  executeAndVerifyDecision,
  rejectDecision,
  checkDatabaseHealth,
  getSupabaseStatus,
  calculateDemandForecast,
  trackShipments,
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

// Active session in-memory state (defaults to Dale & My Logistics Co.)
let activeSession = {
  companyId: "comp_my_logistics_co_",
  companyName: "My Logistics Co.",
  userName: "Dale",
  userRole: "owner",
};

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
    const countRes = await pool.query(`SELECT count(*)::int as cnt FROM "${row.table_name}";`).catch(() => ({ rows: [{ cnt: 0 }] }));
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
  }
  return { success: true, session: activeSession };
});

// ─────────────────────────────────────────────────────────────
// 3. PRODUCTS & INVENTORY (REAL DATA ONLY)
// ─────────────────────────────────────────────────────────────
app.get("/api/products", async (req) => {
  const query = (req.query as any) || {};
  const companyId = query.companyId || activeSession.companyId;

  const prods = await db.select().from(products).where(eq(products.companyId, companyId));
  const invs = await db.select().from(inventory).where(eq(inventory.companyId, companyId));

  const items = prods.map((p) => {
    const itemInv = invs.filter((i) => i.productId === p.id);
    const stock = itemInv.reduce((sum, item) => sum + item.stock, 0);
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category || "Maquinaria y Herramientas",
      minStock: p.minStock,
      stock,
      isLowStock: stock < p.minStock,
      origin: p.origin || "real",
    };
  });

  return { success: true, data: items, products: items };
});

app.put("/api/inventory/:id", async (req) => {
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
// 4. DASHBOARD & KPIS
// ─────────────────────────────────────────────────────────────
app.get("/api/dashboard", async (req) => {
  const query = (req.query as any) || {};
  const companyId = query.companyId || activeSession.companyId;

  const prods = await db.select().from(products).where(eq(products.companyId, companyId));
  const invs = await db.select().from(inventory).where(eq(inventory.companyId, companyId));
  const decs = await db.select().from(decisions).where(eq(decisions.companyId, companyId));
  const channels = await listNotificationChannels(companyId);

  const inventoryMapped = prods.map((p) => {
    const itemInv = invs.filter((i) => i.productId === p.id);
    const stock = itemInv.reduce((sum, item) => sum + item.stock, 0);
    return { stock, minStock: p.minStock };
  });

  const outOfStock = inventoryMapped.filter((p) => p.stock === 0).length;
  const lowStock = inventoryMapped.filter((p) => p.stock > 0 && p.stock <= p.minStock).length;
  const pendingDecisions = decs.filter((d) => d.policyDecision === "pending_approval").length;

  const totalSpend = decs
    .filter((d) => d.policyDecision === "approved" || d.policyDecision === "auto_executed")
    .reduce((sum, d) => sum + Number(d.costMxn || 0), 0);

  return {
    success: true,
    data: {
      performance: [
        { name: "Lun", uv: 4 },
        { name: "Mar", uv: 7 },
        { name: "Mie", uv: 5 },
        { name: "Jue", uv: 8 },
        { name: "Vie", uv: 12 },
        { name: "Sab", uv: 6 },
        { name: "Dom", uv: 9 },
      ],
      realProductsCount: prods.length,
      lowStockCount: lowStock,
      inTransitShipments: 0,
      dailyReport: {
        totalOrders: decs.length,
        automated: 0,
        pendingReview: pendingDecisions,
        savings: Math.round(totalSpend * 0.12),
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
      activeChannels: channels.length,
      totalSpendMxn: totalSpend,
      daemonStatus: "ONLINE",
    },
    company: activeSession,
  };
});

// ─────────────────────────────────────────────────────────────
// 5. DECISIONS & APPROVALS (HITL)
// ─────────────────────────────────────────────────────────────
app.get("/api/approvals", async () => {
  const companyId = activeSession.companyId;
  const allDecs = await db
    .select()
    .from(decisions)
    .where(and(eq(decisions.companyId, companyId), eq(decisions.policyDecision, "pending_approval")))
    .orderBy(desc(decisions.createdAt))
    .limit(20);

  return { success: true, data: allDecs };
});

app.post("/api/approvals/:id", async (req) => {
  const { id } = req.params as { id: string };
  const body = (req.body as any) || {};
  const action = body.action || "aprobado";

  if (action === "aprobado") {
    const res = await executeAndVerifyDecision(id, "operator_app");
    return { success: true, approval: res };
  } else {
    const res = await rejectDecision(id, body.reason || "Rechazado desde Desktop App");
    return { success: true, approval: res };
  }
});

app.get("/api/decisions", async () => {
  const companyId = activeSession.companyId;
  const allDecs = await db
    .select()
    .from(decisions)
    .where(eq(decisions.companyId, companyId))
    .orderBy(desc(decisions.createdAt))
    .limit(30);

  return { success: true, decisions: allDecs };
});

app.post("/api/decisions/:id/approve", async (req) => {
  const { id } = req.params as { id: string };
  const res = await executeAndVerifyDecision(id, "operator_app");
  return { success: true, result: res };
});

app.post("/api/decisions/:id/reject", async (req) => {
  const { id } = req.params as { id: string };
  const body = (req.body as any) || {};
  const res = await rejectDecision(id, body.reason || "Rechazado desde Mint Desktop App");
  return { success: true, result: res };
});

// ─────────────────────────────────────────────────────────────
// 6. CASES & OPERATIONAL ORDERS
// ─────────────────────────────────────────────────────────────
app.get("/api/cases", async (req) => {
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
    priority: "Media",
    status: c.status === "resuelto" ? "Resuelto" : "En Proceso",
    sla: "Dentro de SLA",
    totalCost: c.totalCost || "0.00",
    totalTokens: c.totalTokens || 0,
    createdAt: c.createdAt ? c.createdAt.toISOString() : new Date().toISOString(),
  }));

  return { success: true, data: mapped };
});

app.get("/api/orders", async (req) => {
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
    sku: o.productId || "HERR-REAL",
    productName: "Herramienta Industrial",
    provider: o.supplierId || "Proveedor Homologado",
    amountMXN: String(o.totalAmount || "0"),
    humanApproved: true,
    status: "Emitida",
    createdAt: o.createdAt ? o.createdAt.toISOString() : new Date().toISOString(),
  }));

  return { success: true, data: mapped };
});

// ─────────────────────────────────────────────────────────────
// 7. CHAT (MULTI-AGENT INTERACTIVE)
// ─────────────────────────────────────────────────────────────
app.post("/api/chat", async (req) => {
  const body = (req.body as any) || {};
  const message = body.message || "";
  const companyId = body.companyId || activeSession.companyId;
  const caseId = body.caseId || `chat_${randomUUID().slice(0, 8)}`;

  await db.insert(cases).values({
    id: caseId,
    companyId,
    title: "Chat Desktop App",
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
// 8. CHANNELS & PROACTIVE ALERTS
// ─────────────────────────────────────────────────────────────
app.get("/api/channels", async () => {
  const companyId = activeSession.companyId;
  const channels = await listNotificationChannels(companyId);
  return { success: true, channels };
});

app.post("/api/channels", async (req) => {
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
  const companyId = activeSession.companyId;
  const scanResult = await runFullOperationalEventScan(companyId);
  return { success: true, result: scanResult };
});

// ─────────────────────────────────────────────────────────────
// 9. STATIC FRONTEND SPA SERVING (FRONTEND/DIST)
// ─────────────────────────────────────────────────────────────
const frontendDist = path.resolve(process.cwd(), "frontend/dist");
const publicFallback = path.resolve(__dirname, "public");

app.get("/*", async (req, reply) => {
  const reqPath = req.url.split("?")[0];
  if (reqPath.startsWith("/api/") || reqPath === "/health") {
    reply.status(404).send({ error: "Endpoint no encontrado" });
    return;
  }

  // Check frontend/dist first (Rich React 19 UI)
  const targetDir = fs.existsSync(frontendDist) ? frontendDist : publicFallback;
  const cleanPath = reqPath === "/" ? "index.html" : reqPath.slice(1);
  const filePath = path.join(targetDir, cleanPath);

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

  // SPA fallback to index.html
  const indexPath = path.join(targetDir, "index.html");
  if (fs.existsSync(indexPath)) {
    reply.type("text/html; charset=utf-8").send(fs.readFileSync(indexPath, "utf-8"));
  } else {
    reply.status(404).send("UI no encontrada");
  }
});

// ─────────────────────────────────────────────────────────────
// 10. SERVER STARTUP
// ─────────────────────────────────────────────────────────────
const PORT = 4200;
export async function startAppServer() {
  try {
    await app.listen({ port: PORT, host: "127.0.0.1" });
    console.log(`[Mint Desktop Engine] Corriendo en http://localhost:${PORT}`);
  } catch (err) {
    // Port already in use, reuse active instance
  }
}

if (require.main === module) {
  startAppServer();
}
