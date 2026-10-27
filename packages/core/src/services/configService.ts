import { db } from "../db/client";
import { businessConfig, companies, products, inventory } from "../db/schema";
import { eq, and, sql, or } from "drizzle-orm";

export interface CompanyConfig {
  companyId: string;
  companyName: string;
  timezone: string;
  currency: string;
  approvalLimitAmount: number | null;
  botName: string;
  botTone: string;
  botCustomRules: string;
  autonomyLevel: "hitl" | "semiautonomo" | "autonomo";
  raw: Record<string, string>;
}

export interface ProductThresholdItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  minStock: number;
  currentStock: number;
  status: "CRITICO_BAJO_STOCK" | "STOCK_SEGURO";
}

/**
 * Zonas horarias comunes recomendadas para autocompletado y validación rápida
 */
export const COMMON_TIMEZONES = [
  "America/Bogota",
  "America/Mexico_City",
  "America/Lima",
  "America/Santiago",
  "America/Buenos_Aires",
  "America/Caracas",
  "America/Guayaquil",
  "America/Panama",
  "America/Montevideo",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/Madrid",
  "UTC",
];

/**
 * Valida si una cadena es una zona horaria IANA válida admitida por el runtime
 */
export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Formatea una fecha según la zona horaria de la empresa
 */
export function formatCompanyDate(
  date: Date | string | number = new Date(),
  timezone: string = "UTC",
  includeTime: boolean = true,
): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  const effectiveTz = isValidTimezone(timezone) ? timezone : "UTC";

  try {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: effectiveTz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    };

    if (includeTime) {
      options.hour = "2-digit";
      options.minute = "2-digit";
      options.second = "2-digit";
      options.hour12 = false;
    }

    return new Intl.DateTimeFormat("es-CO", options).format(d);
  } catch {
    return d.toISOString();
  }
}

/**
 * Obtiene la zona horaria configurada para una empresa
 */
export async function getCompanyTimezone(companyId: string = "comp_default"): Promise<string> {
  const record = await db
    .select()
    .from(businessConfig)
    .where(and(eq(businessConfig.companyId, companyId), eq(businessConfig.key, "timezone")))
    .limit(1);

  if (record.length > 0 && isValidTimezone(record[0].value)) {
    return record[0].value;
  }

  return "UTC";
}

/**
 * Recupera el conjunto completo de configuración unificada para una empresa
 */
export async function getCompanyConfig(companyId: string = "comp_default"): Promise<CompanyConfig> {
  const [configs, comp] = await Promise.all([
    db.select().from(businessConfig).where(eq(businessConfig.companyId, companyId)),
    db.select().from(companies).where(eq(companies.id, companyId)).limit(1),
  ]);

  const raw: Record<string, string> = {};
  for (const c of configs) {
    raw[c.key] = c.value;
  }

  const companyName = comp[0]?.name || companyId;
  const currency = raw["currency"] || comp[0]?.currency || "USD";
  const timezone = raw["timezone"] && isValidTimezone(raw["timezone"]) ? raw["timezone"] : "UTC";
  const parsedLimit = raw["approval_limit_amount"] ? parseFloat(raw["approval_limit_amount"]) : NaN;
  const approvalLimitAmount: number | null = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : null;
  const botName = raw["bot_name"] || "Mint Autonomous Agent";
  const botTone = raw["bot_tone"] || "ejecutivo";
  const botCustomRules = raw["bot_custom_rules"] || "";
  const autonomyLevel = (raw["autonomy_level"] as any) || "hitl";

  return {
    companyId,
    companyName,
    timezone,
    currency,
    approvalLimitAmount,
    botName,
    botTone,
    botCustomRules,
    autonomyLevel,
    raw,
  };
}

/**
 * Actualiza o inserta un parámetro de configuración en PostgreSQL
 */
export async function setCompanyConfig(
  companyId: string = "comp_default",
  key: string,
  value: string,
  currency?: string,
): Promise<{ success: boolean; message: string; updatedKey: string; updatedValue: string }> {
  const normalizedKey = key.trim().toLowerCase();
  const trimmedValue = value.trim();

  // Validación de zona horaria
  if (normalizedKey === "timezone" || normalizedKey === "tz") {
    if (!isValidTimezone(trimmedValue)) {
      throw new Error(
        `Zona horaria '${trimmedValue}' no es válida según IANA. Ejemplos válidos: ${COMMON_TIMEZONES.slice(0, 5).join(", ")}.`,
      );
    }
  }

  // Validación de límite de aprobación
  if (normalizedKey === "approval_limit_amount" || normalizedKey === "approval_limit") {
    const num = parseFloat(trimmedValue);
    if (isNaN(num) || num < 0) {
      throw new Error("El límite de aprobación debe ser un número positivo (ej: 5000 o 25000.50).");
    }
  }

  // Validación de autonomía
  if (normalizedKey === "autonomy_level") {
    const validLevels = ["hitl", "semiautonomo", "autonomo"];
    if (!validLevels.includes(trimmedValue.toLowerCase())) {
      throw new Error(`Nivel de autonomía inválido. Opciones permitidas: ${validLevels.join(", ")}`);
    }
  }

  const targetKey = normalizedKey === "tz" ? "timezone" : normalizedKey === "approval_limit" ? "approval_limit_amount" : normalizedKey;

  // Upsert en business_config
  await db
    .insert(businessConfig)
    .values({
      companyId,
      key: targetKey,
      value: trimmedValue,
      currency: currency || "USD",
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [businessConfig.companyId, businessConfig.key],
      set: {
        value: trimmedValue,
        currency: currency || "USD",
        updatedAt: new Date(),
      },
    });

  // Si la clave es divisa, sincronizar también en la tabla companies
  if (targetKey === "currency") {
    await db
      .update(companies)
      .set({ currency: trimmedValue.toUpperCase(), updatedAt: new Date() })
      .where(eq(companies.id, companyId));
  }

  return {
    success: true,
    message: `Parámetro '${targetKey}' actualizado a '${trimmedValue}' con éxito en base de datos.`,
    updatedKey: targetKey,
    updatedValue: trimmedValue,
  };
}

/**
 * Modifica el umbral de stock mínimo (min_stock) de un producto
 */
export async function updateProductMinStock(
  companyId: string = "comp_default",
  skuOrId: string,
  newMinStock: number,
): Promise<{
  success: boolean;
  message: string;
  product?: {
    id: string;
    sku: string;
    name: string;
    oldMinStock: number;
    newMinStock: number;
  };
}> {
  if (newMinStock < 0 || !Number.isInteger(newMinStock)) {
    throw new Error("El stock mínimo debe ser un número entero no negativo (>= 0).");
  }

  const cleanQuery = skuOrId.trim();

  // Buscar por SKU exacto o por ID
  const matches = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.companyId, companyId),
        or(
          sql`lower(${products.sku}) = lower(${cleanQuery})`,
          eq(products.id, cleanQuery),
        ),
      ),
    )
    .limit(1);

  if (matches.length === 0) {
    throw new Error(`No se encontró ningún producto con SKU o ID '${cleanQuery}' en tu catálogo.`);
  }

  const prod = matches[0];
  const oldMinStock = prod.minStock;

  await db
    .update(products)
    .set({ minStock: newMinStock })
    .where(and(eq(products.companyId, companyId), eq(products.id, prod.id)));

  return {
    success: true,
    message: `Umbral de stock mínimo para '${prod.name}' (${prod.sku}) actualizado de ${oldMinStock} a ${newMinStock} unidades.`,
    product: {
      id: prod.id,
      sku: prod.sku,
      name: prod.name,
      oldMinStock,
      newMinStock,
    },
  };
}

/**
 * Lista todos los productos con sus umbrales de stock y estado actual en almacén
 */
export async function listProductThresholds(companyId: string = "comp_default"): Promise<ProductThresholdItem[]> {
  const [prods, invs] = await Promise.all([
    db.select().from(products).where(eq(products.companyId, companyId)),
    db.select().from(inventory).where(eq(inventory.companyId, companyId)),
  ]);

  const stockMap = new Map<string, number>();
  for (const inv of invs) {
    stockMap.set(inv.productId, (stockMap.get(inv.productId) || 0) + inv.stock);
  }

  return prods.map((p) => {
    const curStock = stockMap.get(p.id) || 0;
    const isCritical = curStock <= p.minStock;
    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category || "general",
      minStock: p.minStock,
      currentStock: curStock,
      status: isCritical ? "CRITICO_BAJO_STOCK" : "STOCK_SEGURO",
    };
  });
}
