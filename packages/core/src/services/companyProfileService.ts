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
  businessConfig,
  salesHistory,
} from "../db/schema";
import { eq, and } from "drizzle-orm";

export type CapabilityStatus =
  | "DISPONIBLE_OPERATIVO"
  | "DISPONIBLE_CON_LIMITACIONES"
  | "REQUIERE_CONFIGURACION"
  | "REQUIERE_FUENTE_DATOS"
  | "REQUIERE_INTEGRACION_EXTERNA"
  | "NO_DISPONIBLE"
  | "NO_APLICA";

export interface CapabilityDetail {
  id: string;
  name: string;
  status: CapabilityStatus;
  description: string;
  nextStep?: string;
}

export type BusinessType = "tienda_barrio" | "comercio_local" | "distribuidora" | "empresa_grande";

export interface PendingQuestion {
  category: "SUPPLIERS" | "LOGISTICS" | "CHANNELS" | "CATALOG" | "COMPANY" | "AUTONOMY";
  severity: "CRITICAL" | "WARNING" | "INFO";
  question: string;
  suggestedAction: string;
  commandHint: string;
}

export interface CompanyDataProfile {
  company: {
    id: string;
    name: string;
    businessType: BusinessType;
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
    salesHistoryCount: number;
    activeChannelsCount: number;
    teamMembersCount: number;
  };
  capabilities: CapabilityDetail[];
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
    configList,
    salesList,
  ] = await Promise.all([
    db.select().from(companies).where(eq(companies.id, companyId)).limit(1),
    db.select().from(warehouses).where(eq(warehouses.companyId, companyId)),
    db.select().from(suppliers).where(eq(suppliers.companyId, companyId)),
    db.select().from(supplierProducts).where(eq(supplierProducts.companyId, companyId)),
    db.select().from(products).where(eq(products.companyId, companyId)),
    db.select().from(inventory).where(eq(inventory.companyId, companyId)),
    db
      .select()
      .from(notificationChannels)
      .where(and(eq(notificationChannels.companyId, companyId), eq(notificationChannels.isActive, true))),
    db.select().from(users).where(eq(users.companyId, companyId)),
    db.select().from(businessConfig).where(eq(businessConfig.companyId, companyId)),
    db.select({ id: salesHistory.id }).from(salesHistory).where(eq(salesHistory.companyId, companyId)).limit(100),
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

  const configMap = new Map<string, string>();
  for (const cfg of configList) {
    configMap.set(cfg.key, cfg.value);
  }

  // 1. Deducir o descubrir el tipo de empresa (No todas las empresas funcionan igual)
  let businessType: BusinessType = "tienda_barrio";
  const explicitType = configMap.get("business_type")?.toLowerCase() as BusinessType | undefined;
  if (
    explicitType &&
    ["tienda_barrio", "comercio_local", "distribuidora", "empresa_grande"].includes(explicitType)
  ) {
    businessType = explicitType;
  } else {
    // Descubrimiento adaptativo por datos reales
    if (whList.length >= 3 || userList.length >= 5) {
      businessType = "empresa_grande";
    } else if (whList.length > 1 && suppList.length > 3) {
      businessType = "distribuidora";
    } else if (whList.length >= 1 || suppList.length > 0) {
      businessType = "comercio_local";
    } else {
      businessType = "tienda_barrio";
    }
  }

  const warehousesWithGps = whList.filter((w) => w.latitude && w.longitude).length;
  const suppliersWithGps = suppList.filter((s) => s.latitude && s.longitude).length;
  const suppliersWithOffers = new Set(suppProdList.map((sp) => sp.supplierId)).size;
  const productsWithMinStock = prodList.filter((p) => p.minStock && p.minStock > 0).length;

  const stockByProduct = new Map<string, number>();
  for (const inv of invList) {
    stockByProduct.set(inv.productId, (stockByProduct.get(inv.productId) || 0) + (inv.stock || 0));
  }
  const productsOutOfStock = prodList.filter((p) => (stockByProduct.get(p.id) || 0) <= 0).length;

  const hasEnvChannel = !!(
    process.env.DISCORD_WEBHOOK_URL ||
    process.env.SLACK_WEBHOOK_URL ||
    process.env.GENERIC_WEBHOOK_URL ||
    (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
  );

  const activeChannelsCount = chanList.length + (hasEnvChannel ? 1 : 0);

  // 2. Matriz de capacidades empresariales adaptadas
  const allowRoutineReplenish = configMap.get("allow_routine_replenishment") === "true";
  const capabilities: CapabilityDetail[] = [
    {
      id: "inventory_tracking",
      name: "Rastreo de Inventario y Movimientos",
      status: prodList.length > 0 ? "DISPONIBLE_OPERATIVO" : "REQUIERE_FUENTE_DATOS",
      description:
        prodList.length > 0
          ? `Operativo para ${prodList.length} productos y detección de variaciones de stock.`
          : "Catálogo vacío. Requiere importar archivo CSV/Excel (/source) o sincronizar BD.",
      nextStep: prodList.length > 0 ? undefined : "/source add file <archivo>",
    },
    {
      id: "routine_replenishment",
      name: "Reposición Rutinaria Local",
      status:
        businessType === "tienda_barrio" || allowRoutineReplenish
          ? "DISPONIBLE_OPERATIVO"
          : businessType === "empresa_grande"
            ? "DISPONIBLE_CON_LIMITACIONES"
            : "DISPONIBLE_CON_LIMITACIONES",
      description:
        businessType === "tienda_barrio" || allowRoutineReplenish
          ? "Autorización automática para reposiciones locales de bajo riesgo según límites configurados."
          : "Generación de solicitud interna con revisión humana (HITL) en bandeja /inbox.",
      nextStep: allowRoutineReplenish ? undefined : "/config set allow_routine_replenishment true",
    },
    {
      id: "supplier_purchasing",
      name: "Gestión de Compras con Proveedores",
      status:
        suppList.length > 0 && suppliersWithOffers > 0
          ? "DISPONIBLE_OPERATIVO"
          : suppList.length > 0
            ? "DISPONIBLE_CON_LIMITACIONES"
            : "DISPONIBLE_CON_LIMITACIONES",
      description:
        suppList.length > 0 && suppliersWithOffers > 0
          ? `Operativo con ${suppList.length} proveedor(es) y catálogo de precios registrado.`
          : suppList.length > 0
            ? "Proveedores registrados sin lista de precios: MINT genera Solicitudes de Cotización (RFQ)."
            : "Sin proveedores en catálogo: MINT adapta el flujo a Solicitudes Internas de compra local directa sin inventar proveedores.",
      nextStep: suppList.length > 0 ? undefined : "/suppliers add o sincroniza catálogo",
    },
    {
      id: "demand_forecasting",
      name: "Pronóstico de Demanda y Rotación",
      status: salesList.length > 0 ? "DISPONIBLE_OPERATIVO" : "REQUIERE_FUENTE_DATOS",
      description:
        salesList.length > 0
          ? `Basado en ${salesList.length} registros de ventas históricas.`
          : "Sin historial de ventas registrado. MINT no inventa datos de rotación sin series temporales.",
      nextStep: salesList.length > 0 ? undefined : "Importar historial de ventas para pronósticos",
    },
    {
      id: "fleet_and_routing",
      name: "Logística de Flotas y Rutas GPS",
      status:
        businessType === "tienda_barrio"
          ? "NO_APLICA"
          : warehousesWithGps > 0
            ? "DISPONIBLE_OPERATIVO"
            : "REQUIERE_FUENTE_DATOS",
      description:
        businessType === "tienda_barrio"
          ? "No aplica para tienda de barrio o comercio local sin camiones ni almacenes remotos."
          : warehousesWithGps > 0
            ? `Cálculo de rutas OSRM disponible con ${warehousesWithGps} almacén(es) georreferenciado(s).`
            : "Almacenes sin coordenadas GPS resueltas para trazado de rutas viales.",
      nextStep: businessType === "tienda_barrio" ? undefined : "/logistics gps",
    },
    {
      id: "event_notifications",
      name: "Notificaciones y Enrutamiento de Eventos",
      status: activeChannelsCount > 0 ? "DISPONIBLE_OPERATIVO" : "REQUIERE_CONFIGURACION",
      description:
        activeChannelsCount > 0
          ? `Enrutamiento activo hacia ${activeChannelsCount} canal(es) (Webhooks/Discord/Slack/Telegram).`
          : "Sin canales externos configurados. Los eventos se registran en BD pero no se despachan.",
      nextStep: activeChannelsCount > 0 ? undefined : "/channels add webhook <url>",
    },
    {
      id: "autonomous_financial_payments",
      name: "Ejecución Autónoma de Pagos Financieros",
      status: "NO_DISPONIBLE",
      description:
        "MINT genera propuestas, órdenes y solicitudes con HITL. No ejecuta pagos con tarjeta ni transferencias bancarias no supervisadas.",
    },
  ];

  // 3. Banco de preguntas pendientes adaptado al tipo de empresa
  const pendingQuestions: PendingQuestion[] = [];

  if (businessType === "empresa_grande" && suppList.length === 0) {
    pendingQuestions.push({
      category: "SUPPLIERS",
      severity: "CRITICAL",
      question: "Empresa grande sin proveedores homologados registrados.",
      suggestedAction: "La política empresarial exige proveedores certificados para compras formales.",
      commandHint: "/suppliers add o sincroniza catálogo",
    });
  } else if (suppList.length === 0) {
    pendingQuestions.push({
      category: "SUPPLIERS",
      severity: "INFO",
      question: "Sin proveedores registrados en catálogo.",
      suggestedAction:
        "MINT operará en modo Solicitud Interna para compras y reposiciones locales directas sin inventar proveedores.",
      commandHint: "Operativo para abastecimiento local directo",
    });
  } else if (suppliersWithOffers === 0 && suppList.length > 0) {
    pendingQuestions.push({
      category: "SUPPLIERS",
      severity: "WARNING",
      question: "Los proveedores registrados no tienen lista de precios en catálogo (supplier_products).",
      suggestedAction: "Las compras se gestionarán mediante Solicitud de Cotización (RFQ).",
      commandHint: "/db sync",
    });
  }

  if (businessType === "empresa_grande" && whList.length === 0) {
    pendingQuestions.push({
      category: "LOGISTICS",
      severity: "CRITICAL",
      question: "Sin bodegas o almacenes registrados para empresa multialmacén.",
      suggestedAction: "Se requiere registrar centros de distribución para cálculo de despachos y transferencias.",
      commandHint: "/logistics gps",
    });
  } else if (businessType !== "tienda_barrio" && whList.length > 0 && warehousesWithGps < whList.length) {
    const missing = whList.length - warehousesWithGps;
    pendingQuestions.push({
      category: "LOGISTICS",
      severity: "WARNING",
      question: `${missing} bodega(s) no tienen coordenadas GPS resueltas.`,
      suggestedAction: "Las rutas viales OSRM y cálculo de flete requieren coordenadas de origen.",
      commandHint: "/logistics gps",
    });
  } else if (businessType === "tienda_barrio" && whList.length === 0) {
    pendingQuestions.push({
      category: "LOGISTICS",
      severity: "INFO",
      question: "Operación en punto de venta único (tienda de barrio).",
      suggestedAction: "No se requiere infraestructura logística ni flota de camiones.",
      commandHint: "Operativo en local comercial único",
    });
  }

  if (activeChannelsCount === 0) {
    pendingQuestions.push({
      category: "CHANNELS",
      severity: "WARNING",
      question: "Sin canales de notificación activos (Webhook, Discord, Telegram, Slack).",
      suggestedAction: "Las alertas y solicitudes se guardan en BD pero no se envían externamente.",
      commandHint: "/channels add webhook <url>",
    });
  }

  if (!comp.country || !comp.currency) {
    pendingQuestions.push({
      category: "COMPANY",
      severity: "INFO",
      question: "Falta especificar país o divisa oficial de la empresa.",
      suggestedAction: `Actualmente opera en ${comp.currency || "USD"} por defecto.`,
      commandHint: "/config set currency <divisa>",
    });
  }

  // 4. Cálculo de salud de datos adaptativo
  let score = 0;
  if (prodList.length > 0) score += 30;
  if (comp.country && comp.currency) score += 15;
  if (activeChannelsCount > 0) score += 15;

  if (businessType === "tienda_barrio") {
    // En tienda de barrio no se penaliza falta de flota ni de bodegas con GPS
    score += 40; // 30 + 15 + 15 + 40 = 100%
  } else {
    if (whList.length > 0) score += 10;
    if (warehousesWithGps > 0) score += 10;
    if (suppList.length > 0) score += 10;
    if (suppliersWithOffers > 0) score += 10;
  }

  const healthScore = Math.min(100, score);
  const healthStatus: "OPTIMAL" | "NEEDS_ATTENTION" | "INCOMPLETE" =
    healthScore >= 80 ? "OPTIMAL" : healthScore >= 50 ? "NEEDS_ATTENTION" : "INCOMPLETE";

  return {
    company: {
      id: comp.id,
      name: comp.name,
      businessType,
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
      salesHistoryCount: salesList.length,
      activeChannelsCount,
      teamMembersCount: userList.length,
    },
    capabilities,
    healthScore,
    healthStatus,
    pendingQuestions,
  };
}
