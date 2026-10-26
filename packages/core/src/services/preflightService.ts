import { pool, db } from "../db/client";
import { companies, businessConfig, notificationChannels, decisions } from "../db/schema";
import { mintTableMappings, mintPendingQuestions, mintQuarantineRecords } from "../db/schema/mintEntities";
import { eq, and, sql } from "drizzle-orm";
import { performance } from "node:perf_hooks";

export type HealthStatus = "OK" | "DEGRADADO" | "BLOQUEADO";

export interface ComponentCheck {
  component: "database" | "schema" | "config" | "integrations" | "modules";
  status: HealthStatus;
  message: string;
  cause?: string;
  suggestedAction?: string;
  details: Record<string, any>;
}

export interface PreflightResult {
  overallStatus: HealthStatus;
  executionMs: number;
  components: {
    database: ComponentCheck;
    schema: ComponentCheck;
    config: ComponentCheck;
    integrations: ComponentCheck;
    modules: ComponentCheck;
  };
  activeModules: string[];
  degradedModules: Array<{ module: string; reason: string }>;
  blockedModules: Array<{ module: string; reason: string; fixAction: string }>;
  summarySinceLastSession: {
    pendingDecisions: number;
    quarantinedCount: number;
    unansweredQuestions: number;
  };
}

/**
 * Ejecuta el preflight de arranque de MINT de manera rápida y segura.
 * Nunca arroja excepciones no controladas ni stack traces.
 */
export async function runPreflightCheck(companyId: string = "comp_default"): Promise<PreflightResult> {
  const startTotal = performance.now();

  const components: PreflightResult["components"] = {
    database: { component: "database", status: "OK", message: "Conexión a BD activa", details: {} },
    schema: { component: "schema", status: "OK", message: "Esquema y mapeos al día", details: {} },
    config: { component: "config", status: "OK", message: "Configuración de empresa cargada", details: {} },
    integrations: { component: "integrations", status: "OK", message: "Integraciones operativas", details: {} },
    modules: { component: "modules", status: "OK", message: "Módulos activos verificados", details: {} },
  };

  const activeModules: string[] = [];
  const degradedModules: Array<{ module: string; reason: string }> = [];
  const blockedModules: Array<{ module: string; reason: string; fixAction: string }> = [];
  const summary = {
    pendingDecisions: 0,
    quarantinedCount: 0,
    unansweredQuestions: 0,
  };

  // 1. Chequeo de Base de Datos
  const dbStart = performance.now();
  let client;
  try {
    client = await pool.connect();
    const [versionRes, readOnlyRes, sizeRes] = await Promise.all([
      client.query("SELECT version() as ver;"),
      client.query("SHOW transaction_read_only;").catch(() => ({ rows: [{ transaction_read_only: "off" }] })),
      client.query("SELECT pg_size_pretty(pg_database_size(current_database())) as size;").catch(() => ({ rows: [{ size: "desconocido" }] })),
    ]);

    const latencyMs = Math.round(performance.now() - dbStart);
    const versionStr = (versionRes.rows[0]?.ver || "").split(" on ")[0];
    const isReadOnly = readOnlyRes.rows[0]?.transaction_read_only === "on";
    const dbSize = sizeRes.rows[0]?.size || "N/A";

    components.database.details = {
      version: versionStr,
      latencyMs,
      readOnly: isReadOnly,
      databaseSize: dbSize,
    };

    if (isReadOnly) {
      components.database.status = "DEGRADADO";
      components.database.message = `BD en modo Solo Lectura (${latencyMs}ms)`;
      components.database.cause = "La conexión está configurada con transaction_read_only = on o apunta a una réplica.";
      components.database.suggestedAction = "Las operaciones de escritura y mutaciones estarán deshabilitadas. Todo operará en modo auditoría.";
    } else {
      components.database.status = "OK";
      components.database.message = `PostgreSQL conectado (${latencyMs}ms, ${dbSize})`;
    }
  } catch (err: any) {
    components.database.status = "BLOQUEADO";
    components.database.message = "Fallo total de conexión a la Base de Datos";
    components.database.cause = err.message || "Error desconocido al conectar con PostgreSQL";
    components.database.suggestedAction = "Verifica que el servicio PostgreSQL esté activo y que DATABASE_URL en .env sea correcta. Ejecuta 'mint doctor'.";
    components.database.details = { error: err.message };

    // Si la BD está bloqueada, todos los módulos quedan bloqueados
    return {
      overallStatus: "BLOQUEADO",
      executionMs: Math.round(performance.now() - startTotal),
      components,
      activeModules: [],
      degradedModules: [],
      blockedModules: [{ module: "all", reason: "Base de datos inaccesible", fixAction: "Restablecer conexión con PostgreSQL" }],
      summarySinceLastSession: summary,
    };
  } finally {
    if (client) client.release();
  }

  // 2. Chequeo de Esquema y Mapeos
  try {
    const [tablesRes, mappingsRes] = await Promise.all([
      db.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name LIKE 'mint_%';
      `),
      db.select().from(mintTableMappings).where(eq(mintTableMappings.companyId, companyId)).limit(10),
    ]);

    const mintTableNames = (tablesRes.rows || []).map((r: any) => r.table_name);
    const mappingsCount = mappingsRes.length;

    components.schema.details = {
      mintTablesCount: mintTableNames.length,
      mappingsCount,
    };

    if (mintTableNames.length < 4) {
      components.schema.status = "DEGRADADO";
      components.schema.message = "Faltan tablas reservadas de MINT (mint_*)";
      components.schema.cause = "No se han ejecutado las migraciones iniciales de MINT.";
      components.schema.suggestedAction = "MINT ejecutará la creación idempotente automáticamente.";
    } else {
      components.schema.status = "OK";
      components.schema.message = `Esquema confirmado (${mintTableNames.length} tablas mint_*, ${mappingsCount} mapeos)`;
    }
  } catch (err: any) {
    components.schema.status = "DEGRADADO";
    components.schema.message = "Advertencia al validar esquemas de datos";
    components.schema.cause = err.message;
    components.schema.suggestedAction = "Ejecuta 'mint mapping' para re-escanear tablas del cliente.";
  }

  // 3. Chequeo de Configuración Empresarial
  try {
    const [compRes, configsRes] = await Promise.all([
      db.select().from(companies).where(eq(companies.id, companyId)).limit(1),
      db.select().from(businessConfig).where(eq(businessConfig.companyId, companyId)),
    ]);

    const comp = compRes[0];
    const cfgMap = new Map(configsRes.map((c) => [c.key, c.value]));

    const country = comp?.country || "sin definir";
    const currency = cfgMap.get("currency") || comp?.currency || "USD";
    const timezone = cfgMap.get("timezone") || "America/Bogota";
    const supervisor = cfgMap.get("supervisor_email") || "no configurado";

    components.config.details = {
      companyName: comp?.name || companyId,
      country,
      currency,
      timezone,
      supervisor,
    };

    if (!comp) {
      components.config.status = "DEGRADADO";
      components.config.message = "Empresa no registrada en base de datos";
      components.config.cause = `No existe registro para la empresa '${companyId}'`;
      components.config.suggestedAction = "Ejecuta '/setup' para iniciar el asistente de bienvenida.";
    } else if (country === "sin definir") {
      components.config.status = "DEGRADADO";
      components.config.message = "Configuración regional incompleta (país sin definir)";
      components.config.cause = "No se ha establecido el país para reglas fiscales y festivos.";
      components.config.suggestedAction = "Configura el país con '/setup' o '/config set country <país>'.";
    } else {
      components.config.status = "OK";
      components.config.message = `${comp.name} (${country}, ${currency}, ${timezone})`;
    }
  } catch (err: any) {
    components.config.status = "DEGRADADO";
    components.config.message = "No se pudo leer la configuración empresarial";
    components.config.cause = err.message;
  }

  // 4. Chequeo de Integraciones
  try {
    const [channelsRes] = await Promise.all([
      db.select().from(notificationChannels).where(eq(notificationChannels.companyId, companyId)),
    ]);

    const activeChannels = channelsRes.filter((c) => c.isActive);
    const hasMapsKey = Boolean(
      process.env.GOOGLE_MAPS_API_KEY ||
      process.env.TOMTOM_API_KEY ||
      process.env.MAPBOX_API_KEY ||
      process.env.HERE_API_KEY
    );

    components.integrations.details = {
      notificationChannelsActive: activeChannels.length,
      mapsProvider: hasMapsKey ? "API Externa" : "OSRM Fallback (Local/Público)",
      salesWebhooks: process.env.WEBHOOK_SECRET ? "Firma Activa" : "Sin Clave Secreta",
    };

    if (activeChannels.length === 0) {
      components.integrations.status = "DEGRADADO";
      components.integrations.message = "Sin canales externos de notificación (modo consola local)";
      components.integrations.cause = "No hay webhooks ni integraciones de Slack/WhatsApp activas.";
      components.integrations.suggestedAction = "Agrega canales con '/setup' o revisa tus variables de entorno.";
    } else {
      components.integrations.status = "OK";
      components.integrations.message = `${activeChannels.length} canales activos | Mapas: ${components.integrations.details.mapsProvider}`;
    }
  } catch (err: any) {
    components.integrations.status = "DEGRADADO";
    components.integrations.message = "Advertencia al chequear integraciones";
    components.integrations.cause = err.message;
  }

  // 5. Chequeo y Detección de Módulos Activos (Cero Asunciones)
  try {
    const [prodCount, suppCount, whCount, salesCount, pendingDecisions, quarCount, pendingQ] = await Promise.all([
      db.execute(sql`SELECT count(*)::int as c FROM products WHERE company_id = ${companyId}`).catch(() => ({ rows: [{ c: 0 }] })),
      db.execute(sql`SELECT count(*)::int as c FROM suppliers WHERE company_id = ${companyId}`).catch(() => ({ rows: [{ c: 0 }] })),
      db.execute(sql`SELECT count(*)::int as c FROM warehouses WHERE company_id = ${companyId}`).catch(() => ({ rows: [{ c: 0 }] })),
      db.execute(sql`SELECT count(*)::int as c FROM mint_sales_orders WHERE company_id = ${companyId}`).catch(() => ({ rows: [{ c: 0 }] })),
      db.execute(sql`SELECT count(*)::int as c FROM decisions WHERE company_id = ${companyId} AND policy_decision = 'pending_approval'`).catch(() => ({ rows: [{ c: 0 }] })),
      db.execute(sql`SELECT count(*)::int as c FROM mint_quarantine_records WHERE company_id = ${companyId} AND status = 'quarantined'`).catch(() => ({ rows: [{ c: 0 }] })),
      db.execute(sql`SELECT count(*)::int as c FROM mint_pending_questions WHERE company_id = ${companyId} AND status = 'pending'`).catch(() => ({ rows: [{ c: 0 }] })),
    ]);

    const prods = Number(prodCount.rows[0]?.c || 0);
    const supps = Number(suppCount.rows[0]?.c || 0);
    const whs = Number(whCount.rows[0]?.c || 0);
    const sales = Number(salesCount.rows[0]?.c || 0);

    summary.pendingDecisions = Number(pendingDecisions.rows[0]?.c || 0);
    summary.quarantinedCount = Number(quarCount.rows[0]?.c || 0);
    summary.unansweredQuestions = Number(pendingQ.rows[0]?.c || 0);

    // Activación limpia y determinista de módulos:
    if (prods > 0) {
      activeModules.push("inventario");
    } else {
      degradedModules.push({ module: "inventario", reason: "Catálogo vacío (0 productos registrados)" });
    }

    if (sales > 0 || prods > 0) {
      activeModules.push("ventas");
    } else {
      degradedModules.push({ module: "ventas", reason: "Sin registros de órdenes ni productos" });
    }

    if (supps > 0) {
      activeModules.push("compras_proveedores");
    } else {
      // Modo solo tienda: apagado sin ruido
      degradedModules.push({ module: "compras_proveedores", reason: "Modo solo tienda: sin proveedores homologados registrados" });
    }

    if (whs > 0) {
      activeModules.push("logistica_flota");
    } else {
      // Modo solo tienda: apagado sin ruido
      degradedModules.push({ module: "logistica_flota", reason: "Modo solo tienda: sin almacenes ni centros de distribución" });
    }

    activeModules.push("auditoria_seguridad");

    components.modules.details = {
      activeCount: activeModules.length,
      activeModules,
      degradedCount: degradedModules.length,
    };
    components.modules.message = `${activeModules.length} módulos activos (${activeModules.join(", ")})`;
  } catch (err: any) {
    components.modules.status = "DEGRADADO";
    components.modules.message = "Fallo al auditar módulos disponibles";
    components.modules.cause = err.message;
  }

  // Determinar estatus general
  let overallStatus: HealthStatus = "OK";
  const allComponents = Object.values(components);
  if (allComponents.some((c) => c.status === "BLOQUEADO")) {
    overallStatus = "BLOQUEADO";
  } else if (allComponents.some((c) => c.status === "DEGRADADO")) {
    overallStatus = "DEGRADADO";
  }

  const executionMs = Math.round(performance.now() - startTotal);

  return {
    overallStatus,
    executionMs,
    components,
    activeModules,
    degradedModules,
    blockedModules,
    summarySinceLastSession: summary,
  };
}
