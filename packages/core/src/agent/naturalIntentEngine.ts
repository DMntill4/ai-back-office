import { db } from "../db/client";
import {
  products,
  inventory,
  decisions,
  purchaseOrders,
  suppliers,
  shipments,
  companies,
  notificationChannels,
} from "../db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getCompanyConfig, formatCompanyDate } from "../services/configService";
import { getInventoryIntelligence } from "../services/inventoryIntelService";
import { listCompanyFleet } from "../services/fleetAndOrdersService";
import { generateDailyOperationalReport } from "../services/reportService";
import { analyzeWeeklyProfitVariation } from "../services/businessAnalyticsService";

export type DetectedIntentType =
  | "SMALLTALK"
  | "INVENTORY_QUERY"
  | "INBOX_QUERY"
  | "ORDERS_QUERY"
  | "FLEET_QUERY"
  | "SUPPLIERS_QUERY"
  | "REPORTS_QUERY"
  | "CONFIG_QUERY"
  | "MEMORY_QUERY"
  | "SIMULATE_SCENARIO"
  | "GENERAL_ASSISTANCE";

export interface IntentResolutionResult {
  intent: DetectedIntentType;
  handledDeterministically: boolean;
  response: string;
  suggestedAction?: string;
  data?: any;
}

/**
 * Normaliza texto para búsqueda rápida de palabras clave e intenciones
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Motor Autónomo de Intenciones en Lenguaje Natural (NL Intent Engine)
 * Permite al usuario hablar de forma fluida y natural sin memorizar comandos técnicos,
 * y sirve como cerebro local para el MODO DEGRADADO si la API remota de LLM falla.
 */
export async function resolveNaturalLanguageIntent(
  companyId: string = "comp_default",
  rawInput: string,
): Promise<IntentResolutionResult> {
  const norm = normalizeText(rawInput);
  const config = await getCompanyConfig(companyId).catch(() => null);
  const isEn = config?.botLanguage === "en";

  // 0. CONSULTAS ESPECÍFICAS DE RENTABILIDAD Y VARIACIÓN DE GANANCIA (E6.4)
  const isProfitQuery =
    /(ganancia|margen|utilidad|rentabilidad|profit|margin)/i.test(norm) &&
    /(semana|bajo|cayo|disminuyo|variacion|por que|porque|explicame|como va|resumen|datos|facturacion|week|dropped|why)/i.test(norm);

  if (isProfitQuery) {
    const analysis = await analyzeWeeklyProfitVariation(companyId);
    const topProdLines = analysis.topImpactProducts.length > 0
      ? (isEn ? `\n\n• Top impact products:\n` : `\n\n• Productos con mayor impacto:\n`) +
        analysis.topImpactProducts
          .map(
            (p) =>
              isEn
                ? `  - ${p.name} (${p.sku}): ${p.quantityThisWeek} u this wk (vs ${p.quantityLastWeek} u prev) | Profit delta: $${p.profitChange.toFixed(2)} ${analysis.currency}`
                : `  - ${p.name} (${p.sku}): ${p.quantityThisWeek} u esta sem. (vs ${p.quantityLastWeek} u previa) | Cambio ganancia: $${p.profitChange.toFixed(2)} ${analysis.currency}`
          )
          .join("\n")
      : "";

    const responseText = isEn
      ? `[WEEKLY PROFIT & MARGIN ANALYSIS]\n${analysis.explanation}\n\n• Current week: ${analysis.currentWeek.ordersCount} sales | Revenue: $${analysis.currentWeek.revenue.toFixed(2)} ${analysis.currency} | Profit: $${analysis.currentWeek.profit.toFixed(2)} ${analysis.currency}\n• Previous week: ${analysis.previousWeek.ordersCount} sales | Revenue: $${analysis.previousWeek.revenue.toFixed(2)} ${analysis.currency} | Profit: $${analysis.previousWeek.profit.toFixed(2)} ${analysis.currency}\n• Net variation: $${analysis.profitDelta.toFixed(2)} ${analysis.currency} (${analysis.profitDeltaPercent !== null ? analysis.profitDeltaPercent + "%" : "N/A"})${topProdLines}`
      : `[ANALISIS DE GANANCIA Y RENTABILIDAD SEMANAL]\n${analysis.explanation}\n\n• Semana actual: ${analysis.currentWeek.ordersCount} ventas | Ingresos: $${analysis.currentWeek.revenue.toFixed(2)} ${analysis.currency} | Utilidad: $${analysis.currentWeek.profit.toFixed(2)} ${analysis.currency}\n• Semana previa: ${analysis.previousWeek.ordersCount} ventas | Ingresos: $${analysis.previousWeek.revenue.toFixed(2)} ${analysis.currency} | Utilidad: $${analysis.previousWeek.profit.toFixed(2)} ${analysis.currency}\n• Variacion neta: $${analysis.profitDelta.toFixed(2)} ${analysis.currency} (${analysis.profitDeltaPercent !== null ? analysis.profitDeltaPercent + "%" : "N/A"})${topProdLines}`;

    return {
      intent: "REPORTS_QUERY",
      handledDeterministically: true,
      response: responseText,
      data: analysis,
    };
  }

  // 0.1 DETECCIÓN DE PREGUNTAS ABIERTAS O CONVERSACIONALES
  // Si el usuario hace una pregunta (¿...?, eres capaz..., como..., puedes..., que pasa si..., por que...)
  // JAMÁS interceptar con respuestas deterministas fijas. Se delega al agente de IA con su contexto de base de datos.
  const isQuestionOrConversational =
    rawInput.includes("?") ||
    rawInput.includes("¿") ||
    /^(eres capaz|puedes|como|por que|porque|que pasa|explicame|explica|dime|sera que|se puede|es posible|ayudame|cual|quien|cuando|donde|que opinas|que sugieres|notificas|envias|can you|how|why|what happens|explain|tell me|which|who|when|where|do you)/i.test(norm) ||
    (norm.split(/\s+/).length > 4 && !/^(ver|mostrar|listar|consultar|dame|sacame|show|list|view|get)\b/i.test(norm));

  if (isQuestionOrConversational) {
    return {
      intent: "GENERAL_ASSISTANCE",
      handledDeterministically: false,
      response: "",
    };
  }

  // 1. FAST PATH: Saludos y cortesía (Smalltalk)
  const isGreeting =
    /^(hola|holi|buenas|buenos dias|buenas tardes|buenas noches|hey|hi|hello|good morning|good afternoon|good evening|que tal|saludos|que hubo)[\s,!.¡¿?-]*$/i.test(norm) ||
    /^(hola[\s,]+(buenos dias|buenas tardes|buenas noches|que tal|como estas|como te va|mint|equipo|amigo))[\s,!.¡¿?-]*$/i.test(norm) ||
    /^(buenos dias|buenas tardes|buenas noches|hello|hi)[\s,]+(hola|mint|a todos|equipo|team|there)[\s,!.¡¿?-]*$/i.test(norm);

  // 1.1 FAST PATH: Capacidades y ayuda interactiva (Comando explícito)
  const isCapabilitiesQuery =
    /^(que puedes hacer|que sabes hacer|capacidades|ayuda|comandos|help|what can you do|capabilities)$/i.test(norm);

  if (isCapabilitiesQuery) {
    const activeCfg = config || (await getCompanyConfig(companyId));
    let numProds = 0;
    let suppsCount = 0;
    let chansCount = 0;
    try {
      const [[prodCount], supps, chans] = await Promise.all([
        db.select({ n: sql<number>`count(*)::int` }).from(products).where(eq(products.companyId, companyId)),
        db.select({ id: suppliers.id }).from(suppliers).where(eq(suppliers.companyId, companyId)),
        db.select({ id: notificationChannels.id }).from(notificationChannels).where(eq(notificationChannels.companyId, companyId)),
      ]);
      numProds = Number(prodCount?.n ?? 0);
      suppsCount = supps.length;
      chansCount = chans.length;
    } catch {}

    let res = "";
    if (isEn) {
      res += `I am ${activeCfg.botName}, operational and back-office coordinator for ${activeCfg.companyName}.\n\n`;
      res += `Current company status:\n`;
      res += `• Active Catalog: ${numProds > 0 ? `${numProds} registered products` : "0 products (use '/source' to connect your CSV or database)"}.\n`;
      res += `• Suppliers: ${suppsCount > 0 ? `${suppsCount} registered in database` : "No suppliers registered (use '/suppliers' to add suppliers)"}.\n`;
      res += `• Alert Channels: ${chansCount > 0 ? `${chansCount} active channel(s)` : "Console only (add Discord or Telegram with '/channels')"}.\n`;
      res += `• Governance: ${activeCfg.autonomyLevel.toUpperCase()} (ZERO unilateral purchases; 100% supervised in /inbox).\n\n`;
      res += `Core capabilities:\n`;
      res += `1. Stock Monitoring: Stockout checks and days of coverage (/stock or 'what stock do we have?').\n`;
      res += `2. Purchase Proposals: Supplier quotes and proposals in /inbox with payment dispatch to Finance upon approval.\n`;
      res += `3. Logistics & Routes: Real road distances and OSRM freight rates (/logistics or 'calculate route').\n`;
      res += `4. Live Obsidian Memory: Decision notes and audit logs (/memory).\n`;
      res += `5. Finance & Margin: Sales vs collections reconciliation and profit margins (/reports or /reconcile).\n\n`;
      res += `Type any question in natural language or run /help for the full command list.`;
    } else {
      res += `Soy ${activeCfg.botName}, director operativo y de back-office de ${activeCfg.companyName}.\n\n`;
      res += `Estado actual de tu empresa:\n`;
      res += `• Catálogo Activo: ${numProds > 0 ? `${numProds} productos registrados` : "0 productos (ingresa '/source' para vincular tu archivo CSV o base de datos)"}.\n`;
      res += `• Proveedores: ${suppsCount > 0 ? `${suppsCount} registrados en base de datos` : "Sin proveedores registrados (usa '/suppliers' para agregar proveedores)"}.\n`;
      res += `• Canales de Alerta: ${chansCount > 0 ? `${chansCount} canal(es) activo(s)` : "Solo consola (agrega Discord o Telegram con '/channels')"}.\n`;
      res += `• Gobernanza: ${activeCfg.autonomyLevel.toUpperCase()} (CERO compras unilaterales; 100% supervisado en /inbox).\n\n`;
      res += `Mis capacidades principales:\n`;
      res += `1. Monitoreo de Stock: Reviso quiebres y días de cobertura (/stock o '¿qué stock tenemos?').\n`;
      res += `2. Recomendaciones de Compra: Cotizo y formulo propuestas en /inbox sin desembolsar fondos por mi cuenta.\n`;
      res += `3. Logística y Rutas: Calculo distancias viales y fletes reales OSRM (/logistics o 'calcular ruta').\n`;
      res += `4. Memoria Viva Obsidian: Consulto notas de decisiones y auditorías (/memory o '¿qué recuerdas?').\n`;
      res += `5. Finanzas y Margen: Conciliación de ventas vs cobros y margen de ganancia (/reports o /reconcile).\n\n`;
      res += `Escribe cualquier consulta en lenguaje natural o escribe /help para ver la lista completa de comandos.`;
    }

    return {
      intent: "GENERAL_ASSISTANCE",
      handledDeterministically: true,
      response: res,
      suggestedAction: isEn ? "View /help or /stock" : "Ver /help o /stock",
    };
  }

  if (isGreeting) {
    const activeCfg = config || (await getCompanyConfig(companyId));
    const timeStr = formatCompanyDate(new Date(), activeCfg.timezone, true);
    return {
      intent: "SMALLTALK",
      handledDeterministically: true,
      response: isEn
        ? `Hello. I am ${activeCfg.botName}, operational coordinator for ${activeCfg.companyName}. Local time is ${timeStr} (${activeCfg.timezone}). All systems are online. How can I assist you today? You can ask about stock levels, open purchase orders, shipment tracking, or daily reports.`
        : `Hola. Soy ${activeCfg.botName}, coordinador operativo de ${activeCfg.companyName}. Son las ${timeStr} (${activeCfg.timezone}). Todo el sistema está activo. ¿En qué te puedo colaborar hoy? Puedes consultarme sobre existencias, compras pendientes, flota de envíos o pedirme un reporte diario.`,
      suggestedAction: isEn ? "Ask about stock, orders or /inbox" : "Preguntar sobre stock, órdenes o /inbox",
    };
  }

  if (/^(gracias|muchas gracias|thanks|thank you|ok|vale|listo|entendido|perfecto|excelente)[\s!.¡¿?]*$/.test(norm)) {
    return {
      intent: "SMALLTALK",
      handledDeterministically: true,
      response: isEn
        ? "You're welcome. I continue monitoring operations in real time. Any inventory or shipment alerts will be reported immediately."
        : "Con gusto. Sigo monitoreando la operación en tiempo real. Cualquier novedad de inventario o transporte te la notificaré al instante.",
    };
  }

  // 2. INTENCIÓN: Consulta de Inventario / Stock / Quiebres (Comando explícito)
  const isExplicitStockCommand =
    /^(ver|mostrar|listar|consultar|dame el|show|list|view)?\s*(stock|inventario|inventory|existencias|quiebres|desabastos|catalogo)(\s+(general|actual|completo|full|current))?$/i.test(norm) ||
    norm === "stock" ||
    norm === "inventory" ||
    norm === "inventario" ||
    norm === "existencias" ||
    norm === "quiebres";

  if (isExplicitStockCommand) {
    const intel = await getInventoryIntelligence(companyId);
    const critical = intel.items.filter((i) => i.daysUntilStockout <= 7 || i.currentStock === 0);

    let summaryText = isEn
      ? `Currently managing ${intel.totalSkus} SKUs with ${intel.totalStockUnits} physical units in warehouse (valued at $${intel.totalStockValuation.toLocaleString()} ${intel.currency}).`
      : `Actualmente gestionamos ${intel.totalSkus} SKUs con un total de ${intel.totalStockUnits} unidades físicas en almacén (valorizado en $${intel.totalStockValuation.toLocaleString()} ${intel.currency}).`;

    if (critical.length > 0) {
      const topItems = critical
        .slice(0, 3)
        .map((c) =>
          isEn
            ? `• ${c.name} (${c.sku}): ${c.currentStock}u available (${c.daysUntilStockout === 0 ? "OUT OF STOCK" : `stockout in ~${c.daysUntilStockout}d`})`
            : `• ${c.name} (${c.sku}): ${c.currentStock}u disponibles (${c.daysUntilStockout === 0 ? "AGOTADO" : `quiebre en ~${c.daysUntilStockout}d`})`,
        )
        .join("\n");
      summaryText += isEn
        ? `\n\nOPERATIONAL ALERT: ${critical.length} product(s) at imminent risk of stockout:\n${topItems}\nReview replenishment proposals in /inbox or run /intel quiebre.`
        : `\n\nALERTA OPERATIVA: Hay ${critical.length} producto(s) en riesgo inminente de agotamiento:\n${topItems}\nPuedes ver las propuestas automáticas de compra generadas en /inbox o explorar /intel quiebre.`;
    } else {
      summaryText += isEn
        ? `\n\nAll products have healthy coverage levels above their safety stock threshold.`
        : `\n\nTodos los productos tienen niveles de cobertura saludables por encima del margen de seguridad.`;
    }

    if (intel.totalImmobilizedOverstockCapital > 0) {
      summaryText += isEn
        ? `\nNote: $${intel.totalImmobilizedOverstockCapital.toLocaleString()} ${intel.currency} immobilized in overstock. Check /intel overstock.`
        : `\nNota: Se detectó $${intel.totalImmobilizedOverstockCapital.toLocaleString()} ${intel.currency} inmovilizados en sobrestock. Revisa /intel overstock para estrategias de liberación.`;
    }

    return {
      intent: "INVENTORY_QUERY",
      handledDeterministically: true,
      response: summaryText,
      suggestedAction: critical.length > 0 ? "Revisar /inbox o /intel" : "Ver /stock",
      data: intel,
    };
  }

  // 3. INTENCIÓN: Inbox / Propuestas de Aprobación Pendientes (Comando explícito)
  if (/^(ver|mostrar|listar|consultar|show|list)?\s*(inbox|bandeja|propuestas|pendientes|solicitudes)$/i.test(norm)) {
    const pending = await db
      .select()
      .from(decisions)
      .where(and(eq(decisions.companyId, companyId), eq(decisions.policyDecision, "pending_approval")))
      .orderBy(desc(decisions.createdAt));

    if (pending.length === 0) {
      return {
        intent: "INBOX_QUERY",
        handledDeterministically: true,
        response: isEn
          ? "The decision inbox (/inbox) is clear. Zero purchase proposals awaiting human approval right now."
          : "La bandeja de entrada (/inbox) está al día. Cero propuestas de compra pendientes de autorización humana en este momento.",
        suggestedAction: "Continuar monitoreo habitual",
      };
    }

    const preview = pending
      .slice(0, 3)
      .map((p) => `• [${p.id}] ${p.title} - $${parseFloat(p.costMxn?.toString() || "0").toLocaleString()}`)
      .join("\n");
    return {
      intent: "INBOX_QUERY",
      handledDeterministically: true,
      response: isEn
        ? `You have ${pending.length} replenishment proposal(s) awaiting review in /inbox:\n\n${preview}\n\nApprove with /approve <id> or view grouped details with /inbox.`
        : `Tienes ${pending.length} propuesta(s) de reposición esperando tu revisión en /inbox:\n\n${preview}\n\nPuedes aprobar directamente con /approve <id> o ver el detalle agrupado con /inbox.`,
      suggestedAction: "Ejecutar /inbox o /approve <id>",
      data: pending,
    };
  }

  // 4. INTENCIÓN: Órdenes de Compra / Pedidos a Proveedor (Comando explícito)
  if (/^(ver|mostrar|listar|consultar|show|list)?\s*(ordenes|orders|pedidos|compras)(\s+abiertas)?$/i.test(norm)) {
    const { listCompanyOrders } = await import("../services/fleetAndOrdersService");
    const orders = await listCompanyOrders(companyId);
    const open = orders.filter((o: any) => o.status === "abierta");

    if (orders.length === 0) {
      return {
        intent: "ORDERS_QUERY",
        handledDeterministically: true,
        response: isEn
          ? "No purchase orders registered yet. Once you approve a proposal in /inbox, the order will be issued automatically."
          : "No hay órdenes de compra registradas aún. Cuando apruebes una propuesta en /inbox, el sistema emitirá la orden automáticamente.",
      };
    }

    let msg = isEn
      ? `Total historical purchase orders: ${orders.length}.`
      : `Históricamente se han emitido ${orders.length} órdenes de compra.`;
    if (open.length > 0) {
      const openList = open
        .slice(0, 3)
        .map((o: any) => `• ${o.id}: ${o.productName} (${o.quantity}u) -> ${o.supplierName} - Total: $${o.totalAmount.toLocaleString()} ${o.currency}`)
        .join("\n");
      msg += isEn
        ? ` Currently ${open.length} open order(s) awaiting warehouse reception:\n\n${openList}\n\nUse /orders for full list or /receive <id> upon arrival.`
        : ` Actualmente hay ${open.length} orden(es) en espera de recepción en almacén:\n\n${openList}\n\nUsa /orders para la lista completa o /receive <id> cuando la mercancía llegue a bodega.`;
    } else {
      msg += isEn
        ? " All issued orders have been received in warehouse."
        : " Todas las órdenes emitidas han sido recibidas satisfactoriamente en almacén.";
    }

    return {
      intent: "ORDERS_QUERY",
      handledDeterministically: true,
      response: msg,
      suggestedAction: open.length > 0 ? "Ver /orders o /receive" : "Ver /orders",
      data: orders,
    };
  }

  // 4.1 INTENCIÓN: Ganancias, Margen y Utilidad (Comando corto explícito)
  if (/^(ver|mostrar|consultar|show)?\s*(ganancia|ganancias|margen|profit|utilidad)$/i.test(norm)) {
    const { generateProfitAndMarginReportData } = await import("../services/reportService");
    const fin = await generateProfitAndMarginReportData(companyId);

    let msg = isEn ? `Financial & Profit Summary:\n` : `Resumen Financiero y Ganancias:\n`;
    msg += isEn
      ? `• Billed Revenue: $${fin.summary.totalRevenue.toLocaleString()} ${fin.summary.currency}\n• Estimated Net Profit (30d): $${fin.summary.totalProfit.toLocaleString()} ${fin.summary.currency}\n`
      : `• Ingresos Facturados: $${fin.summary.totalRevenue.toLocaleString()} ${fin.summary.currency}\n• Ganancia Neta Estimada (30d): $${fin.summary.totalProfit.toLocaleString()} ${fin.summary.currency}\n`;
    if (fin.summary.overallMarginPercent !== null) {
      msg += isEn
        ? `• Weighted Average Margin: ${fin.summary.overallMarginPercent}%\n`
        : `• Margen Promedio Ponderado: ${fin.summary.overallMarginPercent}%\n`;
    }
    if (fin.summary.productsWithoutCostCount > 0) {
      msg += isEn
        ? `• Notice: ${fin.summary.productsWithoutCostCount} product(s) with 'unregistered cost' (margin omitted, never estimated).\n`
        : `• Aviso: ${fin.summary.productsWithoutCostCount} producto(s) con 'costo no registrado' (margen omitido, nunca estimado).\n`;
    }
    msg += isEn ? `\nSee full breakdown with /reports profit.` : `\nPuedes ver el desglose completo por producto con /reports profit.`;

    return {
      intent: "REPORTS_QUERY",
      handledDeterministically: true,
      response: msg,
      suggestedAction: "Ver /reports profit",
      data: fin,
    };
  }

  // 5. INTENCIÓN: Flota, Envíos y Seguimiento de Transporte (Comando corto explícito)
  if (/^(ver|mostrar|listar|consultar|show|list)?\s*(flota|fleet|envios|shipments|transporte|camiones|guias)$/i.test(norm)) {
    const { listCompanyFleet } = await import("../services/fleetAndOrdersService");
    const fleet = await listCompanyFleet(companyId);

    if (fleet.activeShipments.length === 0) {
      return {
        intent: "FLEET_QUERY",
        handledDeterministically: true,
        response: isEn
          ? "I do not have this data (no fleet or active shipments registered in the database)."
          : "no tengo este dato (no hay flota ni transportes registrados en la base de datos).",
        suggestedAction: "Configurar con /logistics",
      };
    }

    let msg = isEn
      ? `Transport Panel: ${fleet.activeShipments.length} registered shipments, ${fleet.totalInTransit} in transit, and ${fleet.drivers.length} assigned drivers.`
      : `Panel de Transporte: ${fleet.activeShipments.length} embarques registrados, ${fleet.totalInTransit} en tránsito y ${fleet.drivers.length} choferes asignados.`;
    if (fleet.totalDelayed > 0) {
      msg += isEn
        ? `\n\nLOGISTICS ALERT: ${fleet.totalDelayed} shipment(s) are currently delayed.`
        : `\n\nALERTA LOGÍSTICA: ${fleet.totalDelayed} envío(s) presentan retraso con el transportista.`;
    }
    msg += isEn
      ? `\nTrack a specific guide with mint track <guide> or view /fleet.`
      : `\nPuedes rastrear una guía específica con mint track <guia> o revisar /fleet.`;

    return {
      intent: "FLEET_QUERY",
      handledDeterministically: true,
      response: msg,
      suggestedAction: "Ver /fleet",
      data: fleet,
    };
  }

  // 6. INTENCIÓN: Proveedores (Comando corto explícito)
  if (/^(ver|mostrar|listar|consultar|show|list)?\s*(proveedor|proveedores|suppliers|suplidores)$/i.test(norm)) {
    const { listCompanySuppliers } = await import("../services/fleetAndOrdersService");
    const supps = await listCompanySuppliers(companyId);

    if (supps.length === 0) {
      const { addPendingQuestion } = await import("../services/pendingQuestionsService");
      await addPendingQuestion(
        companyId,
        "supplier_missing",
        "Consulta sobre proveedores sin registro en base de datos.",
        { rawInput },
      );
      return {
        intent: "SUPPLIERS_QUERY",
        handledDeterministically: true,
        response: isEn
          ? "I do not have this data. Added to pending questions bank (/questions)."
          : "no tengo este dato. Se ha agregado al banco de preguntas pendientes (/questions).",
      };
    }

    const preview = supps
      .slice(0, 4)
      .map((s: any) => `• ${s.name} (${s.city || "N/A"}): ${s.catalogCount} SKUs (Avg lead time: ${s.avgLeadTimeDays}d)`)
      .join("\n");
    return {
      intent: "SUPPLIERS_QUERY",
      handledDeterministically: true,
      response: isEn
        ? `We have ${supps.length} registered suppliers in the catalog:\n\n${preview}\n\nView price catalog with /suppliers <id>.`
        : `Tenemos ${supps.length} proveedores registrados en el catálogo:\n\n${preview}\n\nPuedes ver el catálogo de precios de cualquiera con /suppliers <id>.`,
      suggestedAction: "Ver /suppliers",
      data: supps,
    };
  }

  // 7. INTENCIÓN: Reportes y Resumen Ejecutivo (Comando corto explícito)
  if (/^(ver|mostrar|consultar|show)?\s*(reporte|reportes|reports|briefing|resumen del dia|resumen operativo)$/i.test(norm)) {
    const daily = await generateDailyOperationalReport(companyId);
    let msg = isEn
      ? `Operational Summary (${daily.dateStr}):\n• System Health: ${daily.systemHealth}\n• Monitored SKUs: ${daily.totalProducts} (${daily.totalStockUnits} total units)\n• Critical Deficits: ${daily.criticalDeficitsCount}\n• Open Inbox Proposals: ${daily.openProposalsCount}\n• Daily Spend: $${daily.totalSpend.toLocaleString()} ${daily.currency}\n\nPriorities:\n${daily.topPriorityActions.map((a, i) => `${i + 1}. ${a}`).join("\n")}`
      : `Resumen Operativo (${daily.dateStr}):\n• Salud del Sistema: ${daily.systemHealth}\n• SKUs Monitoreados: ${daily.totalProducts} (${daily.totalStockUnits} unidades en total)\n• Déficits Críticos: ${daily.criticalDeficitsCount}\n• Propuestas en Inbox: ${daily.openProposalsCount}\n• Gasto del Día: $${daily.totalSpend.toLocaleString()} ${daily.currency}\n\nPrioridades:\n${daily.topPriorityActions.map((a, i) => `${i + 1}. ${a}`).join("\n")}`;

    return {
      intent: "REPORTS_QUERY",
      handledDeterministically: true,
      response: msg,
      suggestedAction: "Ejecutar /reports o /today",
      data: daily,
    };
  }

  // 8. INTENCIÓN: Configuración / Zona Horaria / Divisa / Idioma (Comando corto explícito)
  if (/^(ver|mostrar|consultar|show)?\s*(configuracion|config|zona horaria|moneda|divisa|idioma|language|ajustes|settings)$/i.test(norm)) {
    const activeCfg = config || (await getCompanyConfig(companyId));
    return {
      intent: "CONFIG_QUERY",
      handledDeterministically: true,
      response: isEn
        ? `Configuration for ${activeCfg.companyName} [${activeCfg.companyId}]:\n• Bot Language: ${activeCfg.botLanguage === "en" ? "English (en)" : "Spanish (es)"}\n• Timezone: ${activeCfg.timezone} (Local time: ${formatCompanyDate(new Date(), activeCfg.timezone, true)})\n• Official Currency: ${activeCfg.currency}\n• HITL Approval Limit: ${activeCfg.approvalLimitAmount === null ? "undefined" : `$${activeCfg.approvalLimitAmount.toLocaleString()} ${activeCfg.currency}`}\n• Autonomy Level: ${activeCfg.autonomyLevel.toUpperCase()}\n• Assistant Tone: ${activeCfg.botTone}\n\nUpdate any parameter with /config set <key> <value> or /config language <es|en>.`
        : `Configuración de ${activeCfg.companyName} [${activeCfg.companyId}]:\n• Idioma del Bot: ${activeCfg.botLanguage === "en" ? "Inglés (en)" : "Español (es)"}\n• Zona Horaria: ${activeCfg.timezone} (Hora actual: ${formatCompanyDate(new Date(), activeCfg.timezone, true)})\n• Divisa Oficial: ${activeCfg.currency}\n• Límite Aprobación HITL: ${activeCfg.approvalLimitAmount === null ? "sin definir" : `$${activeCfg.approvalLimitAmount.toLocaleString()} ${activeCfg.currency}`}\n• Nivel de Autonomía: ${activeCfg.autonomyLevel.toUpperCase()}\n• Tono del Asistente: ${activeCfg.botTone}\n\nPuedes modificar cualquier parámetro con /config set <clave> <valor> o /config language <es|en>.`,
      suggestedAction: "Ver /config",
      data: activeCfg,
    };
  }

  // 8.1 INTENCIÓN: Memoria Viva y Bóveda Obsidian (Comando corto explícito)
  if (/^(ver|mostrar|consultar|show)?\s*(memoria|memory|obsidian|boveda)$/i.test(norm)) {
    const { getVaultStats } = await import("../services/obsidianMemoryService");
    const stats = await getVaultStats(companyId).catch(() => null);
    const recent = await db
      .select({
        id: decisions.id,
        title: decisions.title,
        policyDecision: decisions.policyDecision,
        costMxn: decisions.costMxn,
      })
      .from(decisions)
      .where(eq(decisions.companyId, companyId))
      .orderBy(desc(decisions.createdAt))
      .limit(3);

    let msg = isEn
      ? `Live Memory & Knowledge Vault (Obsidian Cloud + Supabase PostgreSQL):\n`
      : `Memoria Viva y Bóveda de Conocimiento (Obsidian Cloud + Supabase PostgreSQL):\n`;
    if (stats) {
      msg += `• Obsidian Vault: ${stats.vaultPath}\n`;
      msg += `• Vault Notes: ${stats.totalNotas} (${stats.totalDecisiones} decisions, ${stats.totalCuarentena} quarantines, ${stats.totalPreguntas} questions, ${stats.totalAuditorias} audits).\n`;
    }
    if (recent.length > 0) {
      msg += isEn ? `\nRecent Decisions:\n` : `\nÚltimas Decisiones Recordadas:\n`;
      msg += recent.map((d) => `• [${d.id}] ${d.title} (${d.policyDecision}, $${d.costMxn})`).join("\n");
    }
    msg += isEn
      ? `\nSearch notes with 'mint memory search <term>' or sync with 'mint memory sync'.`
      : `\nPuedes explorar notas con 'mint memory search <termino>' o sincronizar con 'mint memory sync'.`;

    return {
      intent: "MEMORY_QUERY",
      handledDeterministically: true,
      response: msg,
      suggestedAction: "Ejecutar /memory",
      data: { stats, recent },
    };
  }

  // 9. Consulta abierta, seguimiento conversacional o instrucción operativa -> Pasa al bucle ReAct (runAgentLoop)
  return {
    intent: "GENERAL_ASSISTANCE",
    handledDeterministically: false,
    response: "",
  };
}
