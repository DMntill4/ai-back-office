import Fastify from "fastify";
import cors from "@fastify/cors";
import { runAgentLoop } from "./agent/loop";
import { db, pool, checkDatabaseHealth, testCustomConnection } from "./db/client";
import { getSupabaseStatus } from "./db/supabase";
import { runMigrations } from "./db/migrate";
import { runSeed } from "./db/seed";
import { randomUUID } from "node:crypto";
import { getActiveProactiveAlerts, runProactiveAuditCycle } from "./worker/proactiveMonitor";
import {
  getPendingApprovals,
  resolveApproval,
  getSupplierPerformance,
} from "./services/inventoryService";
import {
  registerUser,
  loginUser,
  saveBotSetupConfig,
  executeSqlUpload,
  getTemplateSql,
  ROLE_PERMISSIONS,
} from "./services/authAndSetupService";
import { calculateDemandForecast } from "./services/demandService";
import { trackShipments } from "./services/shipmentService";
import {
  products,
  inventory,
  purchaseOrders,
  approvals,
  cases,
  caseEvents,
  suppliers,
  shipments,
  users,
  companies,
  decisions,
  operationalEvents,
} from "./db/schema";
import { eq, desc, and } from "drizzle-orm";
import { ensureDecisionsTables } from "./db/ensureDecisionsTables";
import { runFullOperationalEventScan } from "./events/eventEngine";
import { executeAndVerifyDecision, rejectDecision } from "./services/decisionExecutionService";

const server = Fastify({ logger: true });

// Configuración CORS robusta para desarrollo y producción
server.register(cors, {
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
});

// Health check endpoint
server.get("/health", async () => {
  return { status: "ok", service: "mint-ai-back-office", timestamp: new Date().toISOString() };
});

// ─────────────────────────────────────────────────────────────
// ESTADO Y GESTIÓN DE BASE DE DATOS (DRIZZLE & SUPABASE)
// ─────────────────────────────────────────────────────────────

server.get("/api/db/status", async () => {
  const health = await checkDatabaseHealth();
  const supabaseApi = getSupabaseStatus();

  return {
    success: true,
    data: {
      ...health,
      supabaseApi,
    },
  };
});

server.get("/api/db/tables", async () => {
  try {
    const tablesRes = await pool.query(`
      SELECT 
        table_name,
        (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    const result = [];
    for (const r of tablesRes.rows) {
      let count = 0;
      try {
        const cRes = await pool.query(`SELECT COUNT(*)::int as c FROM "${r.table_name}"`);
        count = cRes.rows[0]?.c || 0;
      } catch {}
      result.push({
        name: r.table_name,
        columnCount: parseInt(r.column_count, 10),
        rowCount: count,
      });
    }

    return {
      success: true,
      tables: result,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
      tables: [],
    };
  }
});

server.get("/api/db/table/:tableName", async (request, reply) => {
  const { tableName } = request.params as { tableName: string };
  // Sanitizar nombre de tabla
  const safeName = tableName.replace(/[^a-zA-Z0-9_]/g, "");
  try {
    const res = await pool.query(`SELECT * FROM "${safeName}" LIMIT 50`);
    return reply.send({
      success: true,
      tableName: safeName,
      totalReturned: res.rows.length,
      data: res.rows,
    });
  } catch (err: any) {
    return reply.status(400).send({
      success: false,
      error: err.message,
    });
  }
});

server.post("/api/db/test-connection", async (request, reply) => {
  const body = (request.body as any) || {};
  const url = body.connectionString;
  if (!url || typeof url !== "string") {
    return reply.status(400).send({ success: false, error: "connectionString es requerido" });
  }

  const result = await testCustomConnection(url);
  return reply.send(result);
});

server.post("/api/db/migrate", async (request, reply) => {
  try {
    await runMigrations();
    return reply.send({ success: true, message: "Migraciones Drizzle aplicadas exitosamente." });
  } catch (err: any) {
    return reply.status(500).send({ success: false, error: err.message });
  }
});

server.post("/api/db/seed", async (request, reply) => {
  try {
    await runSeed();
    return reply.send({ success: true, message: "Datos logísticos e industriales sembrados exitosamente." });
  } catch (err: any) {
    return reply.status(500).send({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// ENDPOINT PRINCIPAL DE CHAT / AGENTE REACT
// ─────────────────────────────────────────────────────────────

server.post("/api/chat", async (request, reply) => {
  const body = (request.body as any) || {};
  const message = body.message;
  if (!message || typeof message !== "string") {
    return reply.status(400).send({ success: false, error: "El parámetro 'message' es obligatorio." });
  }

  const caseId = body.caseId || `chat_${randomUUID()}`;
  const companyId = body.companyId || "comp_default";

  try {
    await db
      .insert(cases)
      .values({
        id: caseId,
        companyId,
        title: "Chat Frontend (API)",
        description: message,
        status: "en_proceso",
        priority: "media",
      })
      .onConflictDoNothing();
  } catch {
    // Si no está registrado el caso, continúa la ejecución del bucle
  }

  try {
    const result = await runAgentLoop(caseId);

    return reply.send({
      success: true,
      caseId,
      response: result.summary,
      status: result.status,
      metrics: {
        totalCostUsd: result.totalCost,
        totalTokens: result.totalTokens,
        iterations: result.totalSteps,
      },
    });
  } catch (error) {
    server.log.error(error);
    return reply.status(500).send({ success: false, error: "Agent error", details: (error as Error).message });
  }
});

server.get("/api/chat/history", async (request, reply) => {
  const query = (request.query as any) || {};
  const companyId = query.companyId || "comp_default";

  try {
    const chatCases = await db
      .select()
      .from(cases)
      .where(and(eq(cases.companyId, companyId), eq(cases.title, "Chat Frontend (API)")))
      .orderBy(desc(cases.createdAt))
      .limit(20);

    const formattedHistory = chatCases.reverse().flatMap((c) => [
      {
        id: `user_${c.id}`,
        role: "user" as const,
        text: c.description,
        timestamp: c.createdAt,
      },
      {
        id: `agent_${c.id}`,
        role: "agent" as const,
        responseText: c.resultSummary || "",
        status: c.status,
        timestamp: c.updatedAt,
        metrics: {
          totalCostUsd: c.totalCost,
          totalTokens: c.totalTokens,
        },
      },
    ]);

    return reply.send({
      success: true,
      history: formattedHistory,
    });
  } catch (error) {
    return reply.status(500).send({
      success: false,
      error: "Error al recuperar historial de chat",
      details: (error as Error).message,
    });
  }
});

// ─────────────────────────────────────────────────────────────
// MOTOR PROACTIVO DE AUDITORÍA
// ─────────────────────────────────────────────────────────────

server.get("/api/v1/alerts/proactive", async () => {
  const alerts = getActiveProactiveAlerts();
  return {
    success: true,
    total: alerts.length,
    alerts,
  };
});

server.post("/api/v1/alerts/trigger-audit", async () => {
  const newAlerts = await runProactiveAuditCycle();
  return {
    success: true,
    alertasGeneradas: newAlerts.length,
    alertas: newAlerts,
  };
});

// ─────────────────────────────────────────────────────────────
// PRODUCTOS, EXISTENCIAS Y DASHBOARD REAL
// ─────────────────────────────────────────────────────────────

server.get("/api/products", async (request, reply) => {
  const query = (request.query as any) || {};
  const companyId = query.companyId || "comp_default";
  try {
    const prods = await db.select().from(products).where(eq(products.companyId, companyId));
    const invs = await db.select().from(inventory).where(eq(inventory.companyId, companyId));

    return reply.send({
      success: true,
      data: prods.map((p) => {
        const itemInv = invs.filter((i) => i.productId === p.id);
        const stock = itemInv.reduce((sum, item) => sum + item.stock, 0);
        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          category: p.category,
          minStock: p.minStock,
          stock,
          isLowStock: stock < p.minStock,
          origin: p.origin || "real",
        };
      }),
    });
  } catch (error: any) {
    return reply.status(500).send({
      success: false,
      data: [],
      error: error.message,
    });
  }
});

server.put("/api/inventory/:productId", async (request, reply) => {
  const { productId } = request.params as { productId: string };
  const body = (request.body as any) || {};
  const companyId = body.companyId || "comp_default";
  const newStock = typeof body.stock === "number" ? body.stock : parseInt(body.stock, 10);
  const minStock = typeof body.minStock === "number" ? body.minStock : undefined;

  if (isNaN(newStock) || newStock < 0) {
    return reply.status(400).send({ success: false, error: "El valor de stock debe ser un número entero mayor o igual a 0." });
  }

  try {
    // 1. Actualizar o insertar en inventory
    const existing = await db
      .select()
      .from(inventory)
      .where(and(eq(inventory.productId, productId), eq(inventory.companyId, companyId)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(inventory)
        .set({ stock: newStock })
        .where(eq(inventory.id, existing[0].id));
    } else {
      await db.insert(inventory).values({
        id: `inv_${Date.now()}`,
        companyId,
        productId,
        warehouseId: "alm_central",
        stock: newStock,
      });
    }

    // 2. Si enviaron minStock, actualizarlo en products
    if (minStock !== undefined && !isNaN(minStock)) {
      await db
        .update(products)
        .set({ minStock })
        .where(and(eq(products.id, productId), eq(products.companyId, companyId)));
    }

    // 3. Revisar si cae bajo el mínimo para disparar alerta en tiempo real
    const prod = await db
      .select()
      .from(products)
      .where(and(eq(products.id, productId), eq(products.companyId, companyId)))
      .limit(1);

    const threshold = prod.length > 0 ? prod[0].minStock : (minStock || 10);
    const { triggerStockAlertIfLow } = await import("./worker/proactiveMonitor");
    const alert = await triggerStockAlertIfLow(productId, newStock, threshold, companyId);

    return reply.send({
      success: true,
      message: `Stock actualizado a ${newStock} unidades.`,
      alertTriggered: !!alert,
      alert,
    });
  } catch (err: any) {
    return reply.status(500).send({ success: false, error: err.message });
  }
});


server.get("/api/dashboard", async (request, reply) => {
  const query = (request.query as any) || {};
  const companyId = query.companyId || "comp_default";

  try {
    const [orders, apprvs, prods, invs, shps, performance] = await Promise.all([
      db.select().from(purchaseOrders).where(eq(purchaseOrders.companyId, companyId)),
      db.select().from(approvals).where(eq(approvals.companyId, companyId)),
      db.select().from(products).where(eq(products.companyId, companyId)),
      db.select().from(inventory).where(eq(inventory.companyId, companyId)),
      db.select().from(shipments).where(eq(shipments.companyId, companyId)),
      getSupplierPerformance(companyId),
    ]);

    const totalOrders = orders.length;
    const pendingReview = apprvs.filter((a) => a.status === "pendiente").length;
    const automated = Math.max(0, totalOrders - pendingReview);
    const totalSpend = orders.reduce((sum, o) => sum + parseFloat(o.totalAmount || "0"), 0);
    const estimatedSavings = totalSpend > 0 ? totalSpend * 0.12 : 0;

    // Contar productos bajo stock mínimo
    const lowStockCount = prods.filter((p) => {
      const stock = invs.filter((i) => i.productId === p.id).reduce((s, item) => s + item.stock, 0);
      return stock < p.minStock;
    }).length;

    const inTransitShipments = shps.filter((s) => s.status === "en_transito" || s.status === "en_preparacion").length;

    return reply.send({
      success: true,
      data: {
        performance,
        realProductsCount: prods.length,
        lowStockCount,
        inTransitShipments,
        dailyReport: {
          totalOrders,
          automated,
          pendingReview,
          savings: Math.round(estimatedSavings),
          spend: parseFloat(totalSpend.toFixed(2)),
          currency: "MXN",
        },
      },
    });
  } catch (error: any) {
    return reply.status(500).send({
      success: false,
      error: error.message,
    });
  }
});

// ─────────────────────────────────────────────────────────────
// CASOS Y ÓRDENES DE COMPRA REALES (DRIZZLE DB)
// ─────────────────────────────────────────────────────────────

server.get("/api/cases", async (request, reply) => {
  const query = (request.query as any) || {};
  const companyId = query.companyId || "comp_default";

  try {
    const caseList = await db
      .select()
      .from(cases)
      .where(eq(cases.companyId, companyId))
      .orderBy(desc(cases.createdAt))
      .limit(50);

    return reply.send({
      success: true,
      data: caseList.map((c) => ({
        id: c.id,
        title: c.title,
        agent: "Procurement Autonomous Agent",
        priority: c.priority === "urgente" ? "Crítica" : c.priority === "alta" ? "Alta" : c.priority === "baja" ? "Baja" : "Media",
        status: c.status === "escalado" ? "Revisión HITL" : c.status === "resuelto" ? "Resuelto" : "En Proceso",
        sla: "SLA Operativo",
        totalCost: c.totalCost,
        totalTokens: c.totalTokens,
        createdAt: c.createdAt,
      })),
    });
  } catch (err: any) {
    return reply.status(500).send({ success: false, error: err.message, data: [] });
  }
});

server.get("/api/orders", async (request, reply) => {
  const query = (request.query as any) || {};
  const companyId = query.companyId || "comp_default";

  try {
    const orderList = await db
      .select({
        id: purchaseOrders.id,
        productId: purchaseOrders.productId,
        supplierId: purchaseOrders.supplierId,
        quantity: purchaseOrders.quantity,
        unitPrice: purchaseOrders.unitPrice,
        totalAmount: purchaseOrders.totalAmount,
        status: purchaseOrders.status,
        createdAt: purchaseOrders.createdAt,
        productName: products.name,
        sku: products.sku,
        supplierName: suppliers.name,
      })
      .from(purchaseOrders)
      .leftJoin(products, eq(purchaseOrders.productId, products.id))
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .where(eq(purchaseOrders.companyId, companyId))
      .orderBy(desc(purchaseOrders.createdAt))
      .limit(50);

    return reply.send({
      success: true,
      data: orderList.map((o) => ({
        orderId: o.id,
        sku: o.sku || o.productId,
        productName: `${o.productName || o.productId} (${o.quantity}u)`,
        provider: o.supplierName || o.supplierId,
        amountMXN: `$${parseFloat(o.totalAmount).toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`,
        humanApproved: o.status !== "abierta",
        status: o.status === "recibida" ? "Entregada" : o.status === "cancelada" ? "Cancelada" : "Emitida",
        createdAt: o.createdAt,
      })),
    });
  } catch (err: any) {
    return reply.status(500).send({ success: false, error: err.message, data: [] });
  }
});

server.get("/api/approvals", async (request, reply) => {
  const pending = await getPendingApprovals();
  return reply.send({
    success: true,
    data: pending,
  });
});

server.post("/api/approvals/:id", async (request, reply) => {
  const { id } = request.params as { id: string };
  const { action } = request.body as { action: "aprobado" | "rechazado" };
  const result = await resolveApproval(id, action);

  if (!result.success) {
    return reply.status(404).send(result);
  }

  return reply.send(result);
});

// ─────────────────────────────────────────────────────────────
// AUDITORÍA Y USUARIOS REALES (DRIZZLE ORM)
// ─────────────────────────────────────────────────────────────

server.get("/api/users", async (request, reply) => {
  const query = (request.query as any) || {};
  const companyId = query.companyId;

  try {
    const userList = companyId
      ? await db.select().from(users).where(eq(users.companyId, companyId)).limit(50)
      : await db.select().from(users).limit(50);

    const companyList = await db.select().from(companies);
    const companyMap = new Map(companyList.map((c) => [c.id, c.name]));

    return reply.send({
      success: true,
      data: userList.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        companyId: u.companyId,
        companyName: companyMap.get(u.companyId) || "Empresa Registrada",
        setupCompleted: u.setupCompleted,
        createdAt: u.createdAt,
      })),
    });
  } catch (err: any) {
    return reply.status(500).send({ success: false, error: err.message, data: [] });
  }
});

server.get("/api/team", async (request, reply) => {
  const query = (request.query as any) || {};
  const companyId = query.companyId || "comp_default";
  try {
    const { listTeamMembers } = await import("@mint/core");
    const members = await listTeamMembers(companyId);
    return reply.send({ success: true, data: members });
  } catch (err: any) {
    return reply.status(500).send({ success: false, error: err.message, data: [] });
  }
});

server.post("/api/team/invite", async (request, reply) => {
  const body = (request.body as any) || {};
  const { companyId, email, name, role } = body;
  if (!companyId || !email || !name) {
    return reply.status(400).send({ success: false, message: "companyId, email y name son requeridos" });
  }
  try {
    const { inviteTeamMember } = await import("@mint/core");
    const result = await inviteTeamMember({ companyId, email, name, role });
    if (!result.success) {
      return reply.status(400).send(result);
    }
    return reply.send(result);
  } catch (err: any) {
    return reply.status(500).send({ success: false, message: err.message });
  }
});

server.delete("/api/team/:id", async (request, reply) => {
  const { id } = request.params as { id: string };
  const query = (request.query as any) || {};
  const companyId = query.companyId || "comp_default";
  try {
    const { removeTeamMember } = await import("@mint/core");
    const result = await removeTeamMember({ companyId, userId: id });
    if (!result.success) {
      return reply.status(400).send(result);
    }
    return reply.send(result);
  } catch (err: any) {
    return reply.status(500).send({ success: false, message: err.message });
  }
});

server.post("/api/harness/run", async (request, reply) => {
  const body = (request.body as any) || {};
  const { companyId, productId, eventType, severity, customNotes, forceAutonomyLevel } = body;
  if (!companyId || !productId) {
    return reply.status(400).send({ success: false, message: "companyId y productId son requeridos" });
  }
  try {
    const { runBackOfficeHarness } = await import("@mint/core");
    const result = await runBackOfficeHarness({
      companyId,
      productId,
      eventType,
      severity,
      customNotes,
      forceAutonomyLevel,
    });
    return reply.send({ success: true, data: result });
  } catch (err: any) {
    return reply.status(500).send({ success: false, message: err.message });
  }
});

server.get("/api/audit", async (request, reply) => {
  const query = (request.query as any) || {};
  const companyId = query.companyId || "comp_default";

  try {
    const [caseList, orderList, apprvList] = await Promise.all([
      db.select().from(cases).where(eq(cases.companyId, companyId)).orderBy(desc(cases.createdAt)).limit(20),
      db.select().from(purchaseOrders).where(eq(purchaseOrders.companyId, companyId)).orderBy(desc(purchaseOrders.createdAt)).limit(20),
      db.select().from(approvals).where(eq(approvals.companyId, companyId)).orderBy(desc(approvals.requestedAt)).limit(20),
    ]);

    const events: Array<{
      id: string;
      time: string;
      category: "agent" | "order" | "db" | "security";
      title: string;
      detail: string;
      createdAt: string;
    }> = [];

    // Mapear eventos de casos
    for (const c of caseList) {
      events.push({
        id: `ev_case_${c.id}`,
        time: c.createdAt ? new Date(c.createdAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "Reciente",
        category: "agent",
        title: `Caso ${c.status === "resuelto" ? "Resuelto" : "Procesado"}: ${c.title}`,
        detail: c.resultSummary || c.description || "Resolución autónoma ejecutada por el agente Mint ReAct.",
        createdAt: c.createdAt ? c.createdAt.toISOString() : new Date().toISOString(),
      });
    }

    // Mapear aprobaciones HITL
    for (const a of apprvList) {
      events.push({
        id: `ev_appr_${a.id}`,
        time: a.requestedAt ? new Date(a.requestedAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "Reciente",
        category: "security",
        title: `Guardrail HITL: Aprobación ${a.id}`,
        detail: a.reason || `Monto superior al límite autónomo. Estado: ${a.status}.`,
        createdAt: a.requestedAt ? a.requestedAt.toISOString() : new Date().toISOString(),
      });
    }

    // Mapear órdenes de compra
    for (const o of orderList) {
      events.push({
        id: `ev_ord_${o.id}`,
        time: o.createdAt ? new Date(o.createdAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "Reciente",
        category: "order",
        title: `Orden Emitida: ${o.id}`,
        detail: `Cantidad: ${o.quantity}u • Total: $${parseFloat(o.totalAmount || "0").toLocaleString("es-MX")} MXN • Estado: ${o.status}`,
        createdAt: o.createdAt ? o.createdAt.toISOString() : new Date().toISOString(),
      });
    }

    events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return reply.send({
      success: true,
      data: events.slice(0, 50),
    });
  } catch (err: any) {
    return reply.status(500).send({ success: false, error: err.message, data: [] });
  }
});

// ─────────────────────────────────────────────────────────────
// AUTENTICACIÓN, SETUP Y CARGA SQL
// ─────────────────────────────────────────────────────────────

server.get("/api/auth/roles", async () => {
  return {
    success: true,
    roles: ROLE_PERMISSIONS,
  };
});

server.post("/api/auth/register", async (request, reply) => {
  const body = (request.body as any) || {};
  if (!body.name || !body.email || !body.companyName) {
    return reply.status(400).send({
      success: false,
      error: "Campos obligatorios faltantes: name, email, companyName.",
    });
  }

  const result = await registerUser({
    name: body.name,
    email: body.email,
    password: body.password,
    companyName: body.companyName,
    role: body.role || "owner",
  });

  if (!result.success) {
    return reply.status(400).send(result);
  }

  return reply.send(result);
});

server.post("/api/auth/login", async (request, reply) => {
  const body = (request.body as any) || {};
  if (!body.email) {
    return reply.status(400).send({
      success: false,
      error: "El correo electrónico es requerido.",
    });
  }

  const result = await loginUser({
    email: body.email,
    password: body.password,
  });

  if (!result.success) {
    return reply.status(401).send(result);
  }

  return reply.send(result);
});

server.post("/api/setup/config", async (request, reply) => {
  const body = (request.body as any) || {};
  if (!body.companyId) {
    return reply.status(400).send({
      success: false,
      error: "El parámetro companyId es requerido.",
    });
  }

  const result = await saveBotSetupConfig({
    companyId: body.companyId,
    userId: body.userId,
    botName: body.botName || "Mint Autonomous Agent",
    botTone: body.botTone || "ejecutivo",
    botCustomRules: body.botCustomRules || "",
    approvalLimitAmount: Number(body.approvalLimitAmount) || 10000,
    currency: body.currency || "MXN",
  });

  return reply.send(result);
});

server.get("/api/setup/template-sql", async (request, reply) => {
  const query = (request.query as any) || {};
  const companyId = query.companyId || "comp_default";
  const sql = getTemplateSql(companyId);
  return reply.send({
    success: true,
    sql,
  });
});

server.post("/api/setup/upload-sql", async (request, reply) => {
  const body = (request.body as any) || {};
  if (!body.companyId || !body.sqlContent) {
    return reply.status(400).send({
      success: false,
      error: "companyId y sqlContent son obligatorios.",
    });
  }

  const result = await executeSqlUpload({
    companyId: body.companyId,
    userId: body.userId,
    sqlContent: body.sqlContent,
  });

  if (!result.success) {
    return reply.status(400).send(result);
  }

  return reply.send(result);
});

// ─────────────────────────────────────────────────────────────
// PRONÓSTICO DE DEMANDA Y SEGUIMIENTO DE ENVÍOS
// ─────────────────────────────────────────────────────────────

server.get("/api/demand/forecast/:productId", async (request, reply) => {
  const { productId } = request.params as { productId: string };
  const query = (request.query as any) || {};
  const horizonDays = query.horizonDays ? parseInt(query.horizonDays) : 30;
  const companyId = query.companyId || "comp_default";

  const forecast = await calculateDemandForecast({
    productId,
    horizonDays,
    companyId,
  });

  return reply.send({
    success: true,
    data: forecast,
  });
});

server.get("/api/shipments", async (request, reply) => {
  const query = (request.query as any) || {};
  const result = await trackShipments({
    companyId: query.companyId || "comp_default",
    trackingNumber: query.trackingNumber,
    orderId: query.orderId,
  });
  return reply.send(result);
});

server.get("/api/shipments/:tracking", async (request, reply) => {
  const { tracking } = request.params as { tracking: string };
  const query = (request.query as any) || {};
  const result = await trackShipments({
    companyId: query.companyId || "comp_default",
    trackingNumber: tracking,
  });
  return reply.send(result);
});

// ─────────────────────────────────────────────────────────────
// BANDEJA DE DECISIONES Y MOTOR MULTI-AGENTE (EVENT-DRIVEN)
// ─────────────────────────────────────────────────────────────

server.get("/api/decisions/pending", async (request, reply) => {
  const query = (request.query as any) || {};
  const companyId = query.companyId || "comp_default";

  try {
    const list = await db
      .select()
      .from(decisions)
      .where(and(eq(decisions.companyId, companyId), eq(decisions.policyDecision, "pending_approval")))
      .orderBy(desc(decisions.createdAt))
      .limit(50);

    return reply.send({
      success: true,
      data: list.map((d) => ({
        id: d.id,
        caseId: d.caseId,
        title: d.title,
        actionType: d.actionType,
        proposingAgent: d.proposingAgent,
        costMxn: parseFloat(d.costMxn),
        riskScore: parseFloat(d.riskScore),
        reversible: d.reversible,
        evidence: d.evidencePayload,
        risk: d.riskPayload,
        policyReason: d.policyReason,
        createdAt: d.createdAt,
      })),
    });
  } catch (err: any) {
    return reply.status(500).send({ success: false, error: err.message, data: [] });
  }
});

server.post("/api/decisions/:id/resolve", async (request, reply) => {
  const { id } = request.params as { id: string };
  const body = (request.body as any) || {};
  const action = body.action as "approve" | "reject";
  const approvedBy = body.approvedBy || "HUMANO_ADMIN";
  const feedback = body.feedback;

  if (action === "approve") {
    const result = await executeAndVerifyDecision(id, approvedBy, feedback);
    if (!result.success) {
      return reply.status(500).send(result);
    }
    return reply.send(result);
  } else {
    const result = await rejectDecision(id, approvedBy, feedback);
    return reply.send(result);
  }
});

server.get("/api/decisions/history", async (request, reply) => {
  const query = (request.query as any) || {};
  const companyId = query.companyId || "comp_default";

  try {
    const list = await db
      .select()
      .from(decisions)
      .where(eq(decisions.companyId, companyId))
      .orderBy(desc(decisions.createdAt))
      .limit(50);

    return reply.send({
      success: true,
      data: list,
    });
  } catch (err: any) {
    return reply.status(500).send({ success: false, error: err.message, data: [] });
  }
});

server.get("/api/events/live", async (request, reply) => {
  const query = (request.query as any) || {};
  const companyId = query.companyId || "comp_default";

  try {
    const list = await db
      .select()
      .from(operationalEvents)
      .where(eq(operationalEvents.companyId, companyId))
      .orderBy(desc(operationalEvents.createdAt))
      .limit(50);

    return reply.send({
      success: true,
      data: list,
    });
  } catch (err: any) {
    return reply.status(500).send({ success: false, error: err.message, data: [] });
  }
});

server.post("/api/events/scan", async (request, reply) => {
  const body = (request.body as any) || {};
  const companyId = body.companyId || "comp_default";

  try {
    const result = await runFullOperationalEventScan(companyId);
    return reply.send({
      success: true,
      ...result,
    });
  } catch (err: any) {
    return reply.status(500).send({ success: false, error: err.message });
  }
});

server.get("/api/briefing/today", async (request, reply) => {
  const query = (request.query as any) || {};
  const companyId = query.companyId || "comp_default";

  try {
    const allDecisions = await db
      .select()
      .from(decisions)
      .where(eq(decisions.companyId, companyId));

    const autoExecuted = allDecisions.filter((d) => d.policyDecision === "auto_executed" || d.policyDecision === "approved");
    const pending = allDecisions.filter((d) => d.policyDecision === "pending_approval");
    const blocked = allDecisions.filter((d) => d.policyDecision === "blocked");

    const totalAutonomousSpend = autoExecuted.reduce((sum, d) => sum + parseFloat(d.costMxn), 0);
    const estimatedSavings = totalAutonomousSpend * 0.12;

    return reply.send({
      success: true,
      data: {
        totalDecisions: allDecisions.length,
        autoExecutedCount: autoExecuted.length,
        pendingReviewCount: pending.length,
        blockedRiskCount: blocked.length,
        totalAutonomousSpendMxn: totalAutonomousSpend,
        estimatedSavingsMxn: estimatedSavings,
        systemHealth: pending.length > 3 ? "ATENCIÓN_REQUERIDA" : "ÓPTIMO_PROACTIVO",
      },
    });
  } catch (err: any) {
    return reply.status(500).send({ success: false, error: err.message });
  }
});

const start = async () => {
  try {
    await ensureDecisionsTables().catch((e) => console.warn("Error en ensureDecisionsTables:", e.message));
    await server.listen({ port: 3001, host: "0.0.0.0" });
    console.log("🚀 Servidor HTTP MINT corriendo en http://localhost:3001");
    console.log("📡 Conexión a Base de Datos relacional activa (Drizzle ORM & Supabase ready)");
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
