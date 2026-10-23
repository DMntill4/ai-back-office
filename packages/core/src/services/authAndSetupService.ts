import { db, pool } from "../db/client";
import { users, companies, businessConfig, products, inventory } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "node:crypto";

export interface RegisterInput {
  name: string;
  email: string;
  password?: string;
  companyName: string;
  role?: "owner" | "operator" | "auditor" | "viewer";
}

export interface LoginInput {
  email: string;
  password?: string;
}

export interface SetupConfigInput {
  companyId: string;
  userId?: string;
  botName: string;
  botTone: "ejecutivo" | "tecnico" | "didactico";
  botCustomRules?: string;
  approvalLimitAmount: number;
  currency: "MXN" | "USD";
}

export interface SqlUploadInput {
  companyId: string;
  userId?: string;
  sqlContent: string;
}

/**
 * Permisos por Rol en el sistema:
 */
export const ROLE_PERMISSIONS = {
  owner: {
    label: "Dueño / Propietario (Admin)",
    description: "Control absoluto: configuración del bot, carga de SQL, umbrales y aprobaciones.",
    canConfigureBot: true,
    canUploadSql: true,
    canApprovePurchases: true,
    canExecutePurchases: true,
    canViewDashboard: true,
  },
  operator: {
    label: "Operador de Compras",
    description: "Interacción con el agente ReAct, órdenes bajo umbral y consultas operativas.",
    canConfigureBot: false,
    canUploadSql: false,
    canApprovePurchases: false,
    canExecutePurchases: true,
    canViewDashboard: true,
  },
  auditor: {
    label: "Auditor / Supervisor (HITL)",
    description: "Autorización de compras críticas mayores a umbral y auditoría de eventos inmutables.",
    canConfigureBot: false,
    canUploadSql: false,
    canApprovePurchases: true,
    canExecutePurchases: false,
    canViewDashboard: true,
  },
  viewer: {
    label: "Consultor (Solo Lectura)",
    description: "Visualización de existencias, reportes generales y analítica sin permisos de compra.",
    canConfigureBot: false,
    canUploadSql: false,
    canApprovePurchases: false,
    canExecutePurchases: false,
    canViewDashboard: true,
  },
} as const;

export async function registerUser(input: RegisterInput) {
  const companySlug = input.companyName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const baseSlug = companySlug || "company";
  const uniqueSlug = `${baseSlug.slice(0, 80)}-${randomUUID().slice(0, 6)}`;
  const companyId = `comp_${randomUUID().slice(0, 8)}`;
  const userId = `usr_${randomUUID().slice(0, 8)}`;
  const role = input.role || "owner";

  try {
    // 1. Crear empresa con slug único
    await db.insert(companies).values({
      id: companyId,
      name: input.companyName,
      slug: uniqueSlug,
    });

    // 2. Crear usuario
    await db.insert(users).values({
      id: userId,
      companyId: companyId,
      email: input.email.toLowerCase().trim(),
      passwordHash: input.password || "default_hash",
      name: input.name,
      role: role,
      setupCompleted: false,
    });

    // 3. Crear configuración por defecto para la empresa
    await db
      .insert(businessConfig)
      .values([
        {
          companyId: companyId,
          key: "approval_limit_amount",
          value: "10000.00",
          currency: "MXN",
          description: "Monto máximo permitido sin requerir aprobación humana",
        },
        {
          companyId: companyId,
          key: "bot_name",
          value: "Mint Autonomous Agent",
          currency: "MXN",
          description: "Nombre personalizado del asistente",
        },
        {
          companyId: companyId,
          key: "bot_tone",
          value: "ejecutivo",
          currency: "MXN",
          description: "Tono de respuesta del asistente",
        },
      ])
      .onConflictDoNothing();

    return {
      success: true,
      user: {
        id: userId,
        name: input.name,
        email: input.email,
        role: role,
        companyId: companyId,
        companyName: input.companyName,
        setupCompleted: false,
      },
      token: `mint_jwt_${randomUUID()}`,
    };
  } catch (error) {
    // Si la DB falla o el usuario ya existe, proveer respuesta clara
    const errObj = error as any;
    const detail = errObj.cause?.message || errObj.detail || errObj.message;
    return {
      success: false,
      error: `Error al registrar usuario y empresa: ${detail}`,
    };
  }
}

export async function loginUser(input: LoginInput) {
  const email = input.email.toLowerCase().trim();

  try {
    const foundUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (foundUsers.length > 0) {
      const u = foundUsers[0];
      const foundCompany = await db
        .select()
        .from(companies)
        .where(eq(companies.id, u.companyId))
        .limit(1);

      const companyName = foundCompany[0]?.name || "Acme Industrial Corp";

      return {
        success: true,
        user: {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          companyId: u.companyId,
          companyName: companyName,
          setupCompleted: u.setupCompleted,
        },
        token: `mint_jwt_${randomUUID()}`,
      };
    }

    return {
      success: false,
      error: "Credenciales no encontradas en la base de datos. Puedes registrarte en la pestaña de Registro.",
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Error de conexión a la base de datos: ${error.message}`,
    };
  }
}

export async function saveBotSetupConfig(input: SetupConfigInput) {
  try {
    const updates = [
      {
        companyId: input.companyId,
        key: "bot_name",
        value: input.botName || "Mint Autonomous Agent",
        currency: input.currency,
        description: "Nombre del asistente asignado en setup",
      },
      {
        companyId: input.companyId,
        key: "bot_tone",
        value: input.botTone || "ejecutivo",
        currency: input.currency,
        description: "Tono de respuesta del asistente",
      },
      {
        companyId: input.companyId,
        key: "bot_custom_rules",
        value: input.botCustomRules || "Priorizar entregas rápidas y reportar ahorros.",
        currency: input.currency,
        description: "Reglas de negocio personalizadas para el modelo",
      },
      {
        companyId: input.companyId,
        key: "approval_limit_amount",
        value: input.approvalLimitAmount.toFixed(2),
        currency: input.currency,
        description: "Límite de compra autónoma antes de requerir aprobación",
      },
      {
        companyId: input.companyId,
        key: "currency",
        value: input.currency,
        currency: input.currency,
        description: "Moneda configurada por la empresa",
      },
    ];

    for (const item of updates) {
      await db
        .insert(businessConfig)
        .values(item)
        .onConflictDoUpdate({
          target: [businessConfig.companyId, businessConfig.key],
          set: {
            value: item.value,
            currency: item.currency,
            description: item.description,
            updatedAt: new Date(),
          },
        });
    }

    if (input.userId) {
      await db
        .update(users)
        .set({ setupCompleted: true, updatedAt: new Date() })
        .where(eq(users.id, input.userId));
    }

    return {
      success: true,
      message: "Configuración guardada exitosamente.",
      config: {
        companyId: input.companyId,
        botName: input.botName,
        botTone: input.botTone,
        botCustomRules: input.botCustomRules,
        approvalLimitAmount: input.approvalLimitAmount,
        currency: input.currency,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Error al guardar configuración: ${(error as Error).message}`,
    };
  }
}

export async function executeSqlUpload(input: SqlUploadInput) {
  const { companyId, sqlContent, userId } = input;

  if (!sqlContent || typeof sqlContent !== "string") {
    return { success: false, error: "Contenido SQL vacío o inválido." };
  }

  try {
    // 1. Reemplazar marcador de posición {{COMPANY_ID}} o 'comp_default' si aplica
    let processedSql = sqlContent.replace(/\{\{COMPANY_ID\}\}/g, companyId);
    if (companyId && companyId !== "comp_default") {
      // Si la consulta inserta en tablas del sistema con 'comp_default', redirigir a companyId
      processedSql = processedSql.replace(/'comp_default'/g, `'${companyId}'`);
    }

    // 2. Extraer y ejecutar sentencias SQL individuales
    const rawStatements = processedSql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    let executedCount = 0;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const stmt of rawStatements) {
        // Ignorar comentarios de una línea puros
        const cleanStmt = stmt.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n").trim();
        if (cleanStmt.length > 0) {
          await client.query(cleanStmt);
          executedCount++;
        }
      }
      await client.query("COMMIT");
    } catch (err: any) {
      await client.query("ROLLBACK");
      // Intento de ejecución directa de todo el bloque como fallback
      try {
        await pool.query(processedSql);
        executedCount = rawStatements.length;
      } catch (fallbackErr: any) {
        throw new Error(err.message || fallbackErr.message);
      }
    } finally {
      client.release();
    }

    // 3. Asegurar que los productos cargados tengan origin = 'real'
    await db
      .update(products)
      .set({ origin: "real" })
      .where(eq(products.companyId, companyId));

    // 4. Contar cuántos productos tiene ahora la empresa en la base de datos
    const allCompanyProducts = await db
      .select()
      .from(products)
      .where(eq(products.companyId, companyId));

    // 5. Marcar setup_completed = true en el usuario si userId fue provisto
    if (userId) {
      await db
        .update(users)
        .set({ setupCompleted: true, updatedAt: new Date() })
        .where(eq(users.id, userId));
    }

    return {
      success: true,
      message: "Base de datos SQL importada y sincronizada correctamente en PostgreSQL / Supabase.",
      totalStatementsExecuted: executedCount,
      realProductsInserted: allCompanyProducts.length,
      realProductsCount: allCompanyProducts.length,
      sampleProducts: allCompanyProducts.slice(0, 5).map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        origin: p.origin,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: `Error al ejecutar script SQL: ${(error as Error).message}`,
    };
  }
}

export function getTemplateSql(companyId: string = "comp_default"): string {
  return `-- ==============================================================
-- PLANTILLA SQL DE PRUEBA: CATÁLOGO EMPRESARIAL CON STOCK REAL
-- ==============================================================
-- Inserción de productos reales (origin = 'real') y su stock actual

INSERT INTO products (id, company_id, name, description, category, sku, min_stock, origin)
VALUES
  ('prod_real_01', '${companyId}', 'Servomotor Industrial SM-400', 'Servomotor brushless de precisión 400W 3000 RPM', 'automatizacion', 'SKU-REAL-SM400', 8, 'real'),
  ('prod_real_02', '${companyId}', 'Variador de Frecuencia VFD-10', 'Controlador trifásico 3HP para bombas y motores', 'electricidad', 'SKU-REAL-VFD10', 5, 'real'),
  ('prod_real_03', '${companyId}', 'Sensor Fotoeléctrico Óptico', 'Sensor de proximidad infrarrojo 10m IP67', 'sensores', 'SKU-REAL-OP10', 12, 'real'),
  ('prod_real_04', '${companyId}', 'Cilindro Neumático Doble Efecto', 'Actuador neumático ISO 15552 carrera 100mm', 'neumatica', 'SKU-REAL-CNEU', 6, 'real'),
  ('prod_real_05', '${companyId}', 'Fuente de Poder DIN 24V 10A', 'Fuente conmutada para riel DIN 240W certificada', 'electricidad', 'SKU-REAL-DIN24', 15, 'real')
ON CONFLICT (id) DO UPDATE 
SET origin = 'real', 
    min_stock = EXCLUDED.min_stock,
    name = EXCLUDED.name;

INSERT INTO inventory (id, company_id, product_id, warehouse_id, stock)
VALUES
  ('inv_real_01', '${companyId}', 'prod_real_01', 'alm_central', 22),
  ('inv_real_02', '${companyId}', 'prod_real_02', 'alm_central', 3),  -- ¡Bajo stock crítico (< 5)!
  ('inv_real_03', '${companyId}', 'prod_real_03', 'alm_central', 35),
  ('inv_real_04', '${companyId}', 'prod_real_04', 'alm_central', 18),
  ('inv_real_05', '${companyId}', 'prod_real_05', 'alm_central', 2)   -- ¡Bajo stock crítico (< 15)!
ON CONFLICT (id) DO UPDATE 
SET stock = EXCLUDED.stock;

INSERT INTO suppliers (id, company_id, name, email, phone, origin)
VALUES
  ('prov_directo_mx', '${companyId}', 'Automatización y Motores de México', 'ventas@automa.mx', '+52 55 9812 3456', 'real')
ON CONFLICT (id) DO NOTHING;

INSERT INTO supplier_products (id, company_id, supplier_id, product_id, unit_price, min_order_quantity, lead_time_days)
VALUES
  ('sp_real_01', '${companyId}', 'prov_directo_mx', 'prod_real_02', '2450.00', 2, 2),
  ('sp_real_02', '${companyId}', 'prov_directo_mx', 'prod_real_05', '890.00', 5, 1)
ON CONFLICT (id) DO NOTHING;
`;
}
