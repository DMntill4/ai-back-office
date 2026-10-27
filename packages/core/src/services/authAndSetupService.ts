import { db, pool } from "../db/client";
import { users, companies, businessConfig, products, inventory } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "node:crypto";

export type UserRole = "owner" | "admin" | "operator" | "driver" | "viewer" | "auditor";
export type ActionPermission =
  | "approve"
  | "dispatch"
  | "receive"
  | "manage_team"
  | "manage_channels"
  | "configure_bot"
  | "upload_sql"
  | "view";

export interface RegisterInput {
  name: string;
  email: string;
  password?: string;
  companyName: string;
  role?: UserRole;
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
  currency?: string;
}

export interface SqlUploadInput {
  companyId: string;
  userId?: string;
  sqlContent: string;
}

/**
 * Permisos por Rol en el sistema:
 */
export const ROLE_PERMISSIONS: Record<
  UserRole,
  {
    label: string;
    description: string;
    canConfigureBot: boolean;
    canUploadSql: boolean;
    canApprovePurchases: boolean;
    canDispatch: boolean;
    canReceive: boolean;
    canManageTeam: boolean;
    canManageChannels: boolean;
    canViewDashboard: boolean;
  }
> = {
  owner: {
    label: "Dueño / Propietario (Owner)",
    description: "Control absoluto: configuración del bot, equipo, canales, umbrales y aprobaciones.",
    canConfigureBot: true,
    canUploadSql: true,
    canApprovePurchases: true,
    canDispatch: true,
    canReceive: true,
    canManageTeam: true,
    canManageChannels: true,
    canViewDashboard: true,
  },
  admin: {
    label: "Administrador General",
    description: "Gestión operativa total: aprobación HITL, despachos, recepción, equipo y canales.",
    canConfigureBot: true,
    canUploadSql: true,
    canApprovePurchases: true,
    canDispatch: true,
    canReceive: true,
    canManageTeam: true,
    canManageChannels: true,
    canViewDashboard: true,
  },
  operator: {
    label: "Operador de Logística y Compras",
    description: "Despacho de pedidos, recepción de inventario y consultas operativas.",
    canConfigureBot: false,
    canUploadSql: false,
    canApprovePurchases: false,
    canDispatch: true,
    canReceive: true,
    canManageTeam: false,
    canManageChannels: false,
    canViewDashboard: true,
  },
  driver: {
    label: "Conductor / Transportista",
    description: "Recepción de mercancía en ruta y consulta de manifiestos de embarque.",
    canConfigureBot: false,
    canUploadSql: false,
    canApprovePurchases: false,
    canDispatch: false,
    canReceive: true,
    canManageTeam: false,
    canManageChannels: false,
    canViewDashboard: true,
  },
  auditor: {
    label: "Auditor / Supervisor (HITL)",
    description: "Autorización de compras críticas mayores a umbral y auditoría de eventos inmutables.",
    canConfigureBot: false,
    canUploadSql: false,
    canApprovePurchases: true,
    canDispatch: false,
    canReceive: false,
    canManageTeam: false,
    canManageChannels: false,
    canViewDashboard: true,
  },
  viewer: {
    label: "Consultor (Solo Lectura)",
    description: "Visualización de existencias, reportes generales y analítica sin permisos de escritura.",
    canConfigureBot: false,
    canUploadSql: false,
    canApprovePurchases: false,
    canDispatch: false,
    canReceive: false,
    canManageTeam: false,
    canManageChannels: false,
    canViewDashboard: true,
  },
};

export function hasPermission(role: string = "viewer", action: ActionPermission): boolean {
  const normRole = (role || "viewer").toLowerCase() as UserRole;
  const perms = ROLE_PERMISSIONS[normRole] || ROLE_PERMISSIONS.viewer;

  switch (action) {
    case "approve":
      return perms.canApprovePurchases;
    case "dispatch":
      return perms.canDispatch;
    case "receive":
      return perms.canReceive;
    case "manage_team":
      return perms.canManageTeam;
    case "manage_channels":
      return perms.canManageChannels;
    case "configure_bot":
      return perms.canConfigureBot;
    case "upload_sql":
      return perms.canUploadSql;
    case "view":
      return perms.canViewDashboard;
    default:
      return false;
  }
}

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
    const initialCurrency = (input as any).currency || "USD";
    await db
      .insert(businessConfig)
      .values([
        // approval_limit_amount NO se siembra: la empresa debe definirlo (MINT no asume un monto)
        {
          companyId: companyId,
          key: "bot_name",
          value: "Mint Autonomous Agent",
          currency: initialCurrency,
          description: "Nombre personalizado del asistente",
        },
        {
          companyId: companyId,
          key: "bot_tone",
          value: "ejecutivo",
          currency: initialCurrency,
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
        value: input.currency || "USD",
        currency: input.currency || "USD",
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

/**
 * Envía o genera un código de verificación de correo de 6 dígitos.
 */
export async function sendEmailVerificationCode(
  companyId: string,
  email: string,
): Promise<{ success: boolean; code: string; message: string; expiresAt: Date }> {
  const normEmail = email.toLowerCase().trim();
  const code = Math.floor(100000 + (parseInt(randomUUID().slice(0, 4), 16) % 900000)).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

  const payload = JSON.stringify({
    code,
    expiresAt: expiresAt.toISOString(),
    verified: false,
  });

  await db
    .insert(businessConfig)
    .values({
      companyId,
      key: `email_verification_${normEmail}`,
      value: payload,
      currency: "USD",
      description: `Código de verificación para ${normEmail}`,
    })
    .onConflictDoUpdate({
      target: [businessConfig.companyId, businessConfig.key],
      set: {
        value: payload,
        updatedAt: new Date(),
      },
    });

  return {
    success: true,
    code,
    expiresAt,
    message: `Código de verificación generado para ${normEmail}. Expira en 15 minutos.`,
  };
}

/**
 * Valida el código de verificación ingresado por el usuario.
 */
export async function verifyEmailCode(
  companyId: string,
  email: string,
  inputCode: string,
): Promise<{ success: boolean; message: string }> {
  const normEmail = email.toLowerCase().trim();
  const key = `email_verification_${normEmail}`;

  const [record] = await db
    .select()
    .from(businessConfig)
    .where(and(eq(businessConfig.companyId, companyId), eq(businessConfig.key, key)))
    .limit(1);

  if (!record || !record.value) {
    return {
      success: false,
      message: `No se encontró solicitud de verificación pendiente para '${normEmail}'.`,
    };
  }

  try {
    const data = JSON.parse(record.value);
    if (new Date() > new Date(data.expiresAt)) {
      return {
        success: false,
        message: "El código de verificación ha expirado. Solicita un nuevo código.",
      };
    }

    if (data.code !== inputCode.trim()) {
      return {
        success: false,
        message: "Código de verificación incorrecto.",
      };
    }

    data.verified = true;
    data.verifiedAt = new Date().toISOString();

    await db
      .update(businessConfig)
      .set({
        value: JSON.stringify(data),
        updatedAt: new Date(),
      })
      .where(and(eq(businessConfig.companyId, companyId), eq(businessConfig.key, key)));

    await db
      .update(users)
      .set({ setupCompleted: true })
      .where(and(eq(users.companyId, companyId), eq(users.email, normEmail)));

    return {
      success: true,
      message: `Correo '${normEmail}' verificado exitosamente. Cuenta habilitada para alertas oficiales.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Error al procesar verificación: ${err.message}`,
    };
  }
}

/**
 * Comprueba si un correo está verificado
 */
export async function isEmailVerified(companyId: string, email: string): Promise<boolean> {
  const normEmail = email.toLowerCase().trim();
  const key = `email_verification_${normEmail}`;

  const [record] = await db
    .select()
    .from(businessConfig)
    .where(and(eq(businessConfig.companyId, companyId), eq(businessConfig.key, key)))
    .limit(1);

  if (!record || !record.value) return false;

  try {
    const data = JSON.parse(record.value);
    return Boolean(data.verified);
  } catch {
    return false;
  }
}

