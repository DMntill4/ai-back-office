import { db } from "../db/client";
import {
  companies,
  warehouses,
  suppliers,
  supplierProducts,
  products,
  inventory,
  notificationChannels,
  users,
} from "../db/schema";
import { eq, and, sql } from "drizzle-orm";

export interface PendingQuestion {
  category: "SUPPLIERS" | "LOGISTICS" | "CHANNELS" | "CATALOG" | "COMPANY";
  severity: "CRITICAL" | "WARNING" | "INFO";
  question: string;
  suggestedAction: string;
  commandHint: string;
}

export interface CompanyDataProfile {
  company: {
    id: string;
    name: string;
    country: string | null;
    currency: string;
    city: string | null;
    taxId: string | null;
    hasGps: boolean;
  };
  metrics: {
    warehousesCount: number;
    warehousesWithGps: number;
    suppliersCount: number;
    suppliersWithGps: number;
    suppliersWithOffers: number;
    productsCount: number;
    productsWithMinStock: number;
    productsOutOfStock: number;
    activeChannelsCount: number;
    teamMembersCount: number;
  };
  healthScore: number;
  healthStatus: "OPTIMAL" | "NEEDS_ATTENTION" | "INCOMPLETE";
  pendingQuestions: PendingQuestion[];
}

export async function getCompanyDataProfile(companyId: string): Promise<CompanyDataProfile> {
  const [
    compList,
    whList,
    suppList,
    suppProdList,
    prodList,
    invList,
    chanList,
    userList,
  ] = await Promise.all([
    db.select().from(companies).where(eq(companies.id, companyId)).limit(1),
    db.select().from(warehouses).where(eq(warehouses.companyId, companyId)),
    db.select().from(suppliers).where(eq(suppliers.companyId, companyId)),
    db.select().from(supplierProducts).where(eq(supplierProducts.companyId, companyId)),
    db.select().from(products).where(eq(products.companyId, companyId)),
    db.select().from(inventory).where(eq(inventory.companyId, companyId)),
    db.select().from(notificationChannels).where(and(eq(notificationChannels.companyId, companyId), eq(notificationChannels.isActive, true))),
    db.select().from(users).where(eq(users.companyId, companyId)),
  ]);

  const comp = compList[0] || {
    id: companyId,
    name: "Empresa",
    country: null,
    currency: "USD",
    city: null,
    taxId: null,
    latitude: null,
    longitude: null,
  };

  const warehousesWithGps = whList.filter((w) => w.latitude && w.longitude).length;
  const suppliersWithGps = suppList.filter((s) => s.latitude && s.longitude).length;
  const suppliersWithOffers = new Set(suppProdList.map((sp) => sp.supplierId)).size;
  const productsWithMinStock = prodList.filter((p) => p.minStock && p.minStock > 0).length;

  const stockByProduct = new Map<string, number>();
  for (const inv of invList) {
    stockByProduct.set(inv.productId, (stockByProduct.get(inv.productId) || 0) + (inv.stock || 0));
  }
  const productsOutOfStock = prodList.filter((p) => (stockByProduct.get(p.id) || 0) <= 0).length;

  const pendingQuestions: PendingQuestion[] = [];

  // Verificación de Verdad de Datos (Truth in Data)
  if (suppList.length === 0) {
    pendingQuestions.push({
      category: "SUPPLIERS",
      severity: "CRITICAL",
      question: "No hay proveedores registrados en la base de datos.",
      suggestedAction: "El bot no inventará proveedores ni precios. Para emitir órdenes de compra reales debes conectar un catálogo de proveedores.",
      commandHint: "/db sync (carga SQL con tabla proveedores) o registra manualmente",
    });
  } else if (suppliersWithOffers === 0 && suppList.length > 0) {
    pendingQuestions.push({
      category: "SUPPLIERS",
      severity: "WARNING",
      question: "Los proveedores registrados no tienen catálogo de precios asignado (supplier_products).",
      suggestedAction: "Las compras se calcularán bajo cotización directa / RFQ.",
      commandHint: "/db sync",
    });
  }

  if (whList.length === 0) {
    pendingQuestions.push({
      category: "LOGISTICS",
      severity: "CRITICAL",
      question: "No hay bodegas o almacenes físicos registrados.",
      suggestedAction: "El coordinador no puede rastrear inventario físico ni calcular rutas de despacho.",
      commandHint: "/logistics gps",
    });
  } else if (warehousesWithGps < whList.length) {
    const missing = whList.length - warehousesWithGps;
    pendingQuestions.push({
      category: "LOGISTICS",
      severity: "WARNING",
      question: `${missing} bodega(s) no tienen coordenadas GPS resueltas.`,
      suggestedAction: "Las rutas viales OSRM y costos de flete requieren coordenadas de origen.",
      commandHint: "/logistics gps",
    });
  }

  const hasEnvChannel = !!(
    process.env.DISCORD_WEBHOOK_URL ||
    process.env.SLACK_WEBHOOK_URL ||
    (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
  );

  if (chanList.length === 0 && !hasEnvChannel) {
    pendingQuestions.push({
      category: "CHANNELS",
      severity: "WARNING",
      question: "Sin canales de notificación activos (Discord, Telegram, Slack).",
      suggestedAction: "El equipo directivo no recibirá las solicitudes de aprobación para compras mayores a umbral.",
      commandHint: "/channels add discord <url> o exporta DISCORD_WEBHOOK_URL",
    });
  }

  if (!comp.country || !comp.currency) {
    pendingQuestions.push({
      category: "COMPANY",
      severity: "INFO",
      question: "Falta especificar país o divisa de la empresa.",
      suggestedAction: "Actualmente opera en USD por defecto.",
      commandHint: "/config",
    });
  }

  // Cálculo de puntaje de salud de datos (0 a 100)
  let score = 0;
  if (prodList.length > 0) score += 25;
  if (whList.length > 0) score += 15;
  if (warehousesWithGps > 0) score += 10;
  if (suppList.length > 0) score += 20;
  if (suppliersWithOffers > 0) score += 10;
  if (chanList.length > 0 || hasEnvChannel) score += 10;
  if (comp.country && comp.currency) score += 10;

  const healthScore = Math.min(100, score);
  const healthStatus: "OPTIMAL" | "NEEDS_ATTENTION" | "INCOMPLETE" =
    healthScore >= 80 ? "OPTIMAL" : healthScore >= 50 ? "NEEDS_ATTENTION" : "INCOMPLETE";

  return {
    company: {
      id: comp.id,
      name: comp.name,
      country: comp.country,
      currency: comp.currency || "USD",
      city: comp.city,
      taxId: comp.taxId || (comp as any).rfcTaxId || null,
      hasGps: !!(comp.latitude && comp.longitude),
    },
    metrics: {
      warehousesCount: whList.length,
      warehousesWithGps,
      suppliersCount: suppList.length,
      suppliersWithGps,
      suppliersWithOffers,
      productsCount: prodList.length,
      productsWithMinStock,
      productsOutOfStock,
      activeChannelsCount: chanList.length + (hasEnvChannel ? 1 : 0),
      teamMembersCount: userList.length,
    },
    healthScore,
    healthStatus,
    pendingQuestions,
  };
}
