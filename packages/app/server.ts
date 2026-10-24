import Fastify from "fastify";
import cors from "@fastify/cors";
import path from "node:path";
import fs from "node:fs";
import {
  db,
  products,
  inventory,
  decisions,
  companies,
  users,
  runFullOperationalEventScan,
  executeAndVerifyDecision,
  rejectDecision,
} from "@mint/core";
import {
  listNotificationChannels,
  addNotificationChannel,
  testNotificationChannel,
} from "@mint/notifiers";
import { eq, desc } from "drizzle-orm";

const app = Fastify({ logger: false });

app.register(cors, { origin: true, credentials: true });

// Active session in-memory state (defaults to comp_my_logistics_co_)
let activeSession = {
  companyId: "comp_my_logistics_co_",
  companyName: "My Logistics Co.",
  userName: "Dale",
  userRole: "owner",
};

// Static file serving for the App UI
const publicDir = path.resolve(__dirname, "public");

app.get("/", async (req, reply) => {
  const indexPath = path.join(publicDir, "index.html");
  if (fs.existsSync(indexPath)) {
    reply.type("text/html").send(fs.readFileSync(indexPath, "utf-8"));
  } else {
    reply.status(404).send("App UI not found");
  }
});

app.get("/app.js", async (req, reply) => {
  const filePath = path.join(publicDir, "app.js");
  reply.type("application/javascript").send(fs.readFileSync(filePath, "utf-8"));
});

app.get("/app.css", async (req, reply) => {
  const filePath = path.join(publicDir, "app.css");
  reply.type("text/css").send(fs.readFileSync(filePath, "utf-8"));
});

// API Routes
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

app.get("/api/dashboard", async () => {
  const companyId = activeSession.companyId;
  const prods = await db.select().from(products).where(eq(products.companyId, companyId));
  const invs = await db.select().from(inventory).where(eq(inventory.companyId, companyId));
  const decs = await db.select().from(decisions).where(eq(decisions.companyId, companyId));
  const channels = await listNotificationChannels(companyId);

  const inventoryMapped = prods.map((p) => {
    const itemInv = invs.filter((i) => i.productId === p.id);
    const stock = itemInv.reduce((sum, item) => sum + item.stock, 0);
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category,
      minStock: p.minStock,
      stock,
      status: stock === 0 ? "AGOTADO" : stock < p.minStock ? "BAJO" : "ÓPTIMO",
    };
  });

  const outOfStock = inventoryMapped.filter((p) => p.stock === 0).length;
  const lowStock = inventoryMapped.filter((p) => p.status === "BAJO").length;
  const pendingDecisions = decs.filter((d) => d.policyDecision === "pending_approval").length;
  const totalSpend = decs
    .filter((d) => d.policyDecision === "auto_executed" || d.policyDecision === "approved")
    .reduce((sum, d) => sum + Number(d.costMxn || 0), 0);

  return {
    success: true,
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

app.get("/api/products", async () => {
  const companyId = activeSession.companyId;
  const prods = await db.select().from(products).where(eq(products.companyId, companyId));
  const invs = await db.select().from(inventory).where(eq(inventory.companyId, companyId));

  const items = prods.map((p) => {
    const itemInv = invs.filter((i) => i.productId === p.id);
    const stock = itemInv.reduce((sum, item) => sum + item.stock, 0);
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category,
      minStock: p.minStock,
      stock,
      status: stock === 0 ? "AGOTADO" : stock < p.minStock ? "BAJO" : "ÓPTIMO",
    };
  });

  return { success: true, products: items };
});

app.post("/api/products/adjust", async (req) => {
  const body = (req.body as any) || {};
  const { productId, delta } = body;
  const companyId = activeSession.companyId;

  if (!productId || typeof delta !== "number") {
    return { success: false, error: "Parámetros inválidos" };
  }

  const existing = await db
    .select()
    .from(inventory)
    .where(eq(inventory.productId, productId))
    .limit(1);

  if (existing.length > 0) {
    const newStock = Math.max(0, existing[0].stock + delta);
    await db
      .update(inventory)
      .set({ stock: newStock, updatedAt: new Date() })
      .where(eq(inventory.id, existing[0].id));
    return { success: true, newStock };
  }

  return { success: false, error: "Producto no encontrado en inventario" };
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
  try {
    const res = await executeAndVerifyDecision(id, "operator_app");
    return { success: true, result: res };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

app.post("/api/decisions/:id/reject", async (req) => {
  const { id } = req.params as { id: string };
  const body = (req.body as any) || {};
  try {
    const res = await rejectDecision(id, body.reason || "Rechazado desde Mint Desktop App");
    return { success: true, result: res };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

app.get("/api/channels", async () => {
  const companyId = activeSession.companyId;
  const channels = await listNotificationChannels(companyId);
  return { success: true, channels };
});

app.post("/api/channels", async (req) => {
  const body = (req.body as any) || {};
  const companyId = activeSession.companyId;

  const { type, name, webhookUrl, botToken, chatId, topics } = body;
  if (!type || !name) {
    return { success: false, error: "Tipo y nombre de canal requeridos" };
  }

  const config: Record<string, any> = {
    topics: topics || ["logs", "stock", "logistics", "critical"],
  };

  if (type === "discord" || type === "slack") {
    if (!webhookUrl) return { success: false, error: "Webhook URL requerido" };
    config.webhookUrl = webhookUrl;
  } else if (type === "telegram") {
    if (!botToken || !chatId) return { success: false, error: "Bot Token y Chat ID requeridos" };
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

const PORT = 4200;
export async function startAppServer() {
  try {
    await app.listen({ port: PORT, host: "127.0.0.1" });
    console.log(`[Mint App Server] Corriendo en http://localhost:${PORT}`);
  } catch (err) {
    // If already in use, reuse existing
  }
}

if (require.main === module) {
  startAppServer();
}
