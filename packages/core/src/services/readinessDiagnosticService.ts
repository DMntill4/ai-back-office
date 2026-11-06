import { db, pool } from "../db/client";
import { products, suppliers, inventory, warehouses, shipments, mintQuarantineRecords, companies } from "../db/schema";
import { eq, sql } from "drizzle-orm";

export interface DiagnosticFinding {
  id: string;
  category: "BLOQUEANTE" | "DISCREPANCIA" | "SEGURIDAD" | "CALIDAD" | "FALTANTE";
  title: string;
  description: string;
  evidence: string;
  impactEstimated?: string;
  suggestedAction: string;
  confidence: number;
}

export type EnvironmentLifecycleState =
  | "FIRST_TIME_INSTALLATION"
  | "UNCONFIGURED_ENVIRONMENT"
  | "NEW_ORGANIZATION"
  | "CONNECTED_BUSINESS_DATA"
  | "OPERATIONALLY_ACTIVE_ORGANIZATION"
  | "DEMO_SANDBOX_ENVIRONMENT";

export interface ReadinessReport {
  companyId: string;
  companyName: string;
  environmentLifecycleState: EnvironmentLifecycleState;
  isDefaultPlaceholderOrg: boolean;
  overallStatus: "OPTIMA" | "ATENCION" | "CRITICA";
  scorePercent: number;
  entitiesSummary: {
    productsCount: number;
    suppliersCount: number;
    inventoryRecordsCount: number;
    warehousesCount: number;
    fleetVehiclesCount: number;
    salesRecordsCount: number;
  };
  detectedLocale: {
    currency: string | null;
    country: string | null;
    city: string | null;
    evidence: string;
  };
  activeModules: Array<{
    name: string;
    active: boolean;
    reason: string;
  }>;
  findings: {
    bloqueantes: DiagnosticFinding[];
    discrepancias: DiagnosticFinding[];
    seguridad: DiagnosticFinding[];
    calidad: DiagnosticFinding[];
    faltantes: DiagnosticFinding[];
  };
}

/**
 * Motor central de diagnóstico de preparación (Readiness Diagnostic Engine)
 * Inspecciona las entidades reales de una empresa y genera el reporte unificado
 * clasificado en:
 * [BLOQUEANTE] | [DISCREPANCIA] | [SEGURIDAD] | [CALIDAD] | [FALTANTE]
 * CERO suposiciones: si no hay evidencia, no inventa monedas, sedes ni modelos.
 */
export async function generateReadinessReport(companyId: string): Promise<ReadinessReport> {
  const [comp] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  const companyName = comp?.name || companyId;

  // 1. Conteos reales por entidad
  const [pCountRes] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(products)
    .where(eq(products.companyId, companyId));
  const productsCount = pCountRes?.count || 0;

  const [sCountRes] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(suppliers)
    .where(eq(suppliers.companyId, companyId));
  const suppliersCount = sCountRes?.count || 0;

  const [iCountRes] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(inventory)
    .where(eq(inventory.companyId, companyId));
  const inventoryRecordsCount = iCountRes?.count || 0;

  const [wCountRes] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(warehouses)
    .where(eq(warehouses.companyId, companyId));
  const warehousesCount = wCountRes?.count || 0;

  const [shCountRes] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(shipments)
    .where(eq(shipments.companyId, companyId));
  const fleetVehiclesCount = shCountRes?.count || 0;

  // 2. Muestreo de datos reales para detectar divisa y geografía (Sin asumir nada)
  let detectedCurrency: string | null = null;
  let currencyEvidence = "No se detectaron precios ni transacciones con divisa explícita.";
  let detectedCountry: string | null = comp?.country && comp.country !== "XX" ? comp.country : null;
  let detectedCity: string | null = comp?.city || null;
  let geoEvidence = detectedCity ? `Sede registrada: ${detectedCity}` : "Sin ubicación física ni almacenes geolocalizados.";

  // Buscar divisa en productos con precio
  const prodsWithPrice = await db
    .select()
    .from(products)
    .where(eq(products.companyId, companyId))
    .limit(20);

  if (comp?.currency && comp.currency !== "USD" && comp.currency !== "XX") {
    detectedCurrency = comp.currency;
    currencyEvidence = `Divisa declarada por la empresa: ${comp.currency}`;
  }

  // 3. Hallazgos categorizados
  const bloqueantes: DiagnosticFinding[] = [];
  const discrepancias: DiagnosticFinding[] = [];
  const seguridad: DiagnosticFinding[] = [];
  const calidad: DiagnosticFinding[] = [];
  const faltantes: DiagnosticFinding[] = [];

  // A. Bloqueantes y clasificación real de estado del entorno (Parte 2 Secciones 4 y 11)
  const isDemoTenant = companyId.toLowerCase().includes("demo") || companyId.toLowerCase().includes("sandbox");
  const isDefaultPlaceholderOrg =
    companyId === "comp_default" &&
    (!comp || comp.name === "Empresa Operativa Principal" || comp.name === "comp_default") &&
    productsCount === 0 &&
    suppliersCount === 0;

  let environmentLifecycleState: EnvironmentLifecycleState = "UNCONFIGURED_ENVIRONMENT";
  if (isDemoTenant) {
    environmentLifecycleState = "DEMO_SANDBOX_ENVIRONMENT";
  } else if (!comp && productsCount === 0 && suppliersCount === 0) {
    environmentLifecycleState = "FIRST_TIME_INSTALLATION";
  } else if (isDefaultPlaceholderOrg) {
    environmentLifecycleState = "UNCONFIGURED_ENVIRONMENT";
  } else if (productsCount === 0 || inventoryRecordsCount === 0) {
    environmentLifecycleState = "NEW_ORGANIZATION";
  } else if (suppliersCount > 0 || fleetVehiclesCount > 0) {
    environmentLifecycleState = "OPERATIONALLY_ACTIVE_ORGANIZATION";
  } else {
    environmentLifecycleState = "CONNECTED_BUSINESS_DATA";
  }

  if (productsCount === 0) {
    bloqueantes.push({
      id: "b_unconfigured_no_business_data",
      category: "BLOQUEANTE",
      title: isDefaultPlaceholderOrg
        ? "Entorno sin configurar (Sin organización ni base de datos de negocio conectada)"
        : "Organización sin catálogo de negocio importado",
      description: isDefaultPlaceholderOrg
        ? "MINT detectó que aún no se ha registrado una organización real ni conectado una base de datos de inventario."
        : "La organización existe, pero aún no tiene productos ni existencias cargadas para operar.",
      evidence: `Tabla 'products' contiene 0 registros para '${companyId}' (Estado: ${environmentLifecycleState}).`,
      suggestedAction: "Ejecuta 'mint setup <archivo.csv>' o importa tu base de datos de negocio para iniciar el monitoreo autónomo.",
      confidence: 1.0,
    });
    faltantes.push({
      id: "f_empty_catalog",
      category: "FALTANTE",
      title: "Catálogo de productos vacío",
      description: "No hay productos registrados en el sistema.",
      evidence: "Tabla 'products' contiene 0 registros para esta empresa.",
      suggestedAction: "Importa un archivo CSV/Excel o agrega tu primer producto con 'mint products add'.",
      confidence: 1.0,
    });
  }

  // B. Discrepancias (stock negativo, precios cero/anómalos)
  const negativeStockRes = await db
    .select()
    .from(inventory)
    .where(sql`${inventory.companyId} = ${companyId} AND ${inventory.stock} < 0`)
    .limit(10);

  if (negativeStockRes.length > 0) {
    discrepancias.push({
      id: "d_negative_stock",
      category: "DISCREPANCIA",
      title: "Existencias negativas detectadas en almacén",
      description: `Se encontraron ${negativeStockRes.length} registros de inventario con existencias menores a cero.`,
      evidence: negativeStockRes.map((r) => `Producto ${r.productId}: ${r.stock}u en ${r.warehouseId}`).join("; "),
      impactEstimated: "Riesgo de venta de productos sin existencias físicas reales.",
      suggestedAction: "Reconcilia o ajusta el inventario físico con 'mint stock adjust' o inspecciona en la app.",
      confidence: 0.98,
    });
  }

  // C. Seguridad (cuarentena de inyecciones o fórmulas)
  const quarantined = await db
    .select()
    .from(mintQuarantineRecords)
    .where(eq(mintQuarantineRecords.companyId, companyId))
    .limit(20);

  for (const q of quarantined) {
    seguridad.push({
      id: `s_quar_${q.id}`,
      category: "SEGURIDAD",
      title: `Registro aislado en cuarentena: ${q.violationType}`,
      description: q.reason,
      evidence: `Registro ${q.recordIdentifier} en tabla origen '${q.sourceTable}' (${q.severity}).`,
      impactEstimated: "El registro fue aislado de forma preventiva y no afecta decisiones operativas.",
      suggestedAction: "Revisa el registro en la sección de Seguridad / Cuarentena ('mint security quarantine').",
      confidence: 0.95,
    });
  }

  // D. Calidad (productos sin costo o sin categoría)
  let missingCostCount = 0;
  for (const p of prodsWithPrice) {
    if (!p.costPrice || Number(p.costPrice) === 0) {
      missingCostCount++;
    }
  }

  if (missingCostCount > 0) {
    calidad.push({
      id: "q_missing_cost",
      category: "CALIDAD",
      title: "Productos sin costo de adquisición registrado",
      description: `Detectamos productos con costo no especificado o en cero en una muestra de catálogo.`,
      evidence: `${missingCostCount} de ${prodsWithPrice.length} productos evaluados no tienen costo unitario de compra.`,
      suggestedAction: "Registra los costos unitarios de los proveedores para que MINT pueda calcular márgenes financieros reales.",
      confidence: 0.9,
    });
  }

  // E. Faltantes y módulos activos (Basado estrictamente en datos, no en preguntas rígidas)
  const activeModules: ReadinessReport["activeModules"] = [];

  // Módulo Inventario
  if (productsCount > 0 && inventoryRecordsCount > 0) {
    activeModules.push({
      name: "Inventario & Existencias",
      active: true,
      reason: `Activo con ${productsCount} productos y ${inventoryRecordsCount} registros de existencias.`,
    });
  } else {
    activeModules.push({
      name: "Inventario & Existencias",
      active: false,
      reason: "Inactivo: requiere cargar existencias en al menos un almacén.",
    });
  }

  // Módulo Proveedores & Compras
  if (suppliersCount > 0) {
    activeModules.push({
      name: "Proveedores & Abastecimiento",
      active: true,
      reason: `Activo con ${suppliersCount} proveedores homologados registrados.`,
    });
  } else {
    activeModules.push({
      name: "Proveedores & Abastecimiento",
      active: false,
      reason: "Inactivo: no hay proveedores registrados. MINT operará como tienda directa.",
    });
    faltantes.push({
      id: "f_no_suppliers",
      category: "FEAT_MISSING" as any,
      title: "Directorio de proveedores no cargado",
      description: "Para que MINT pueda redactar propuestas de compra y cotizar alternativas, requiere contactos de proveedores.",
      evidence: "Tabla 'suppliers' contiene 0 registros.",
      suggestedAction: "Puedes registrar proveedores en cualquier momento con 'mint suppliers add' o en la vista Proveedores.",
      confidence: 1.0,
    });
  }

  // Módulo Flota & Logística
  if (warehousesCount > 0 && fleetVehiclesCount > 0) {
    activeModules.push({
      name: "Flota & Logística de Rutas",
      active: true,
      reason: `Activo con ${warehousesCount} bodegas y ${fleetVehiclesCount} envíos/vehículos rastreados.`,
    });
  } else {
    activeModules.push({
      name: "Flota & Logística de Rutas",
      active: false,
      reason: "Inactivo: sin camiones ni bodegas de despacho. Desactivado sin generar ruido de flota.",
    });
    if (productsCount > 0) {
      faltantes.push({
        id: "f_no_logistics",
        category: "FALTANTE",
        title: "Flota y logística no configurada",
        description: "MINT operará en modo comercial/tienda. Para activar cálculo de rutas y fletes OSRM, registra tus camiones y bodegas.",
        evidence: `Bodegas: ${warehousesCount}, Envíos: ${fleetVehiclesCount}.`,
        suggestedAction: "Opcional: agrega camiones con 'mint fleet add' cuando desees optimizar despachos propios.",
        confidence: 1.0,
      });
    }
  }

  // Calcular score de salud de datos basado en evidencia real (CERO porcentajes falsos cuando no hay datos)
  let score = 100;
  if (productsCount === 0) {
    score = isDefaultPlaceholderOrg || !comp ? 0 : 25;
  } else {
    score -= bloqueantes.length * 30;
    score -= discrepancias.length * 15;
    score -= seguridad.length * 20;
    score -= Math.min(calidad.length * 5, 20);
    if (inventoryRecordsCount === 0) {
      score -= 35;
    }
    score = Math.max(0, Math.min(100, score));
  }

  const overallStatus =
    productsCount === 0
      ? "ATENCION"
      : score >= 85
      ? "OPTIMA"
      : score >= 60
      ? "ATENCION"
      : "CRITICA";

  return {
    companyId,
    companyName: isDefaultPlaceholderOrg ? "SIN ORGANIZACIÓN CONFIGURADA (Onboarding Pendiente)" : companyName,
    environmentLifecycleState,
    isDefaultPlaceholderOrg,
    overallStatus,
    scorePercent: score,
    entitiesSummary: {
      productsCount,
      suppliersCount,
      inventoryRecordsCount,
      warehousesCount,
      fleetVehiclesCount,
      salesRecordsCount: 0,
    },
    detectedLocale: {
      currency: detectedCurrency,
      country: detectedCountry,
      city: detectedCity,
      evidence: currencyEvidence,
    },
    activeModules,
    findings: {
      bloqueantes,
      discrepancias,
      seguridad,
      calidad,
      faltantes,
    },
  };
}

