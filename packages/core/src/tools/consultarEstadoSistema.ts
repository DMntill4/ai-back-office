import { db, pool } from "../db/client";
import { products, inventory, companies, users, businessConfig } from "../db/schema";
import { eq, and } from "drizzle-orm";

export interface ConsultarEstadoSistemaParams {
  empresa_id?: string;
}

export interface ConsultarEstadoSistemaResult {
  isSuccess: boolean;
  motorBaseDatos: string;
  proveedorCloud: string;
  conexionActiva: boolean;
  tablasCargadas?: string[];
  totalTablas?: number;
  empresaActiva: {
    id: string;
    nombre: string;
  };
  totalProductosRegistrados: number;
  totalUnidadesStock: number;
  catalogoMuestras: Array<{
    id: string;
    sku: string;
    nombre: string;
    categoria: string;
    stock: number;
    minimo: number;
    origen: string;
  }>;
  canalesNotificacion?: Array<{ tipo: string; nombre: string; activo: boolean }>;
  configuracionBot: {
    nombre: string;
    tono: string;
    gobernanza?: string;
    umbralAutonomo?: string;
    moneda: string;
  };
  resumenEjecutivo: string;
}

export async function executeConsultarEstadoSistema(
  params: ConsultarEstadoSistemaParams = {},
  context?: { companyId?: string }
): Promise<ConsultarEstadoSistemaResult> {
  const companyId = params.empresa_id || context?.companyId || "comp_default";

  try {
    // 1. Validar conexión real
    await pool.query("SELECT 1;");

    // 1b. Obtener tablas de PostgreSQL
    const tablesQuery = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name ASC;
    `);
    const tablenames = tablesQuery.rows.map((r: any) => r.table_name);

    // 2. Obtener datos de la empresa
    const companyRes = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
    const companyName = companyRes[0]?.name || "Empresa Registrada";

    // 3. Obtener productos y stock de la empresa
    const prods = await db
      .select()
      .from(products)
      .where(eq(products.companyId, companyId));

    const invs = await db
      .select()
      .from(inventory)
      .where(eq(inventory.companyId, companyId));

    const totalUnidades = invs.reduce((sum, item) => sum + item.stock, 0);

    const muestras = prods.slice(0, 5).map((p) => {
      const pInv = invs.find((i) => i.productId === p.id);
      return {
        id: p.id,
        sku: p.sku,
        nombre: p.name,
        categoria: p.category || "general",
        stock: pInv?.stock ?? 0,
        minimo: p.minStock,
        origen: p.origin || "real",
      };
    });

    // 4. Obtener canales de notificación configurados
    const { notificationChannels } = await import("../db/schema");
    const channels = await db
      .select()
      .from(notificationChannels)
      .where(eq(notificationChannels.companyId, companyId));

    const canalesInfo = channels.map((c) => ({
      tipo: c.type,
      nombre: c.name,
      activo: c.isActive,
    }));

    // 5. Obtener configuración del bot
    const configs = await db
      .select()
      .from(businessConfig)
      .where(eq(businessConfig.companyId, companyId));

    const botName = configs.find((c) => c.key === "bot_name")?.value || "MINT";
    const botTone = configs.find((c) => c.key === "bot_tone")?.value || "ejecutivo";
    const moneda = configs.find((c) => c.key === "currency")?.value || (companyRes[0] as any)?.currency || "USD";

    const canalesTexto = channels.length > 0
      ? `Canales de alerta conectados: ${channels.map((c) => `${c.type.toUpperCase()} ("${c.name}")`).join(", ")}.`
      : `No hay canales remotos conectados actualmente. Puedes vincular Discord o Slack con '/channels add discord <url>'.`;

    const resumen = `Estoy conectado en tiempo real a PostgreSQL en Supabase Cloud. Tienes cargadas ${tablenames.length} tablas en el esquema relacional. Para la empresa '${companyName}' (${companyId}), tienes ${prods.length} productos registrados en catálogo con un total de ${totalUnidades} unidades físicas en almacén. ${canalesTexto} Política de gobernanza: HUMAN-IN-THE-LOOP 100% (Cero compras automáticas; toda propuesta requiere tu aprobación explícita).`;

    return {
      isSuccess: true,
      motorBaseDatos: "PostgreSQL 15 (Supabase Cloud)",
      proveedorCloud: "Supabase AWS Pooler (Puerto 6543)",
      conexionActiva: true,
      tablasCargadas: tablenames,
      totalTablas: tablenames.length,
      empresaActiva: {
        id: companyId,
        nombre: companyName,
      },
      totalProductosRegistrados: prods.length,
      totalUnidadesStock: totalUnidades,
      catalogoMuestras: muestras,
      canalesNotificacion: canalesInfo,
      configuracionBot: {
        nombre: botName,
        tono: botTone,
        gobernanza: "HUMAN-IN-THE-LOOP 100% (0 compras automáticas - Aprobación requerida)",
        moneda,
      },
      resumenEjecutivo: resumen,
    };
  } catch (error: any) {
    return {
      isSuccess: false,
      motorBaseDatos: "PostgreSQL (Desconectado)",
      proveedorCloud: "Supabase",
      conexionActiva: false,
      empresaActiva: { id: companyId, nombre: "Desconocida" },
      totalProductosRegistrados: 0,
      totalUnidadesStock: 0,
      catalogoMuestras: [],
      canalesNotificacion: [],
      configuracionBot: {
        nombre: "MINT",
        tono: "ejecutivo",
        gobernanza: "HUMAN-IN-THE-LOOP 100%",
        moneda: "USD",
      },
      resumenEjecutivo: `Fallo al verificar el estado de la base de datos: ${error.message}`,
    };
  }
}
