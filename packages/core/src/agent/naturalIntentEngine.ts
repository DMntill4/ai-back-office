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

  // 0. CONSULTAS ESPECÍFICAS DE RENTABILIDAD Y VARIACIÓN DE GANANCIA (E6.4)
  // Preguntas tipo: "¿Por qué bajó la ganancia esta semana?", "análisis de margen", "por qué cayó la utilidad"
  const isProfitQuery =
    /(ganancia|margen|utilidad|rentabilidad)/i.test(norm) &&
    /(semana|bajo|cayo|disminuyo|variacion|por que|porque|explicame|como va|resumen|datos|facturacion)/i.test(norm);

  if (isProfitQuery) {
    const analysis = await analyzeWeeklyProfitVariation(companyId);
    const topProdLines = analysis.topImpactProducts.length > 0
      ? `\n\n• Productos con mayor impacto:\n` +
        analysis.topImpactProducts
          .map(
            (p) =>
              `  - ${p.name} (${p.sku}): ${p.quantityThisWeek} u esta sem. (vs ${p.quantityLastWeek} u previa) | Cambio ganancia: $${p.profitChange.toFixed(2)} ${analysis.currency}`
          )
          .join("\n")
      : "";

    return {
      intent: "REPORTS_QUERY",
      handledDeterministically: true,
      response: `[ANALISIS DE GANANCIA Y RENTABILIDAD SEMANAL]\n${analysis.explanation}\n\n• Semana actual: ${analysis.currentWeek.ordersCount} ventas | Ingresos: $${analysis.currentWeek.revenue.toFixed(2)} ${analysis.currency} | Utilidad: $${analysis.currentWeek.profit.toFixed(2)} ${analysis.currency}\n• Semana previa: ${analysis.previousWeek.ordersCount} ventas | Ingresos: $${analysis.previousWeek.revenue.toFixed(2)} ${analysis.currency} | Utilidad: $${analysis.previousWeek.profit.toFixed(2)} ${analysis.currency}\n• Variacion neta: $${analysis.profitDelta.toFixed(2)} ${analysis.currency} (${analysis.profitDeltaPercent !== null ? analysis.profitDeltaPercent + "%" : "N/A"})${topProdLines}`,
      data: analysis,
    };
  }

  // 0.1 DETECCIÓN DE PREGUNTAS ABIERTAS O CONVERSACIONALES
  // Si el usuario hace una pregunta (¿...?, eres capaz..., como..., puedes..., que pasa si..., por que...)
  // JAMÁS interceptar con respuestas deterministas fijas. Se delega al agente de IA con su contexto de base de datos.
  const isQuestionOrConversational =
    rawInput.includes("?") ||
    rawInput.includes("¿") ||
    /^(eres capaz|puedes|como|por que|porque|que pasa|explicame|explica|dime|sera que|se puede|es posible|ayudame|cual|quien|cuando|donde|que opinas|que sugieres|notificas|envias)/i.test(norm) ||
    (norm.split(/\s+/).length > 4 && !/^(ver|mostrar|listar|consultar|dame|sacame)\b/i.test(norm));

  if (isQuestionOrConversational) {
    return {
      intent: "GENERAL_ASSISTANCE",
      handledDeterministically: false,
      response: "",
    };
  }

  // 1. FAST PATH: Saludos y cortesía (Smalltalk)
  const isGreeting =
    /^(hola|holi|buenas|buenos dias|buenas tardes|buenas noches|hey|hi|hello|que tal|saludos|que hubo)[\s,!.¡¿?-]*$/i.test(norm) ||
    /^(hola[\s,]+(buenos dias|buenas tardes|buenas noches|que tal|como estas|como te va|mint|equipo|amigo))[\s,!.¡¿?-]*$/i.test(norm) ||
    /^(buenos dias|buenas tardes|buenas noches)[\s,]+(hola|mint|a todos|equipo)[\s,!.¡¿?-]*$/i.test(norm);

  // 1.1 FAST PATH: Capacidades y ayuda interactiva (Comando explícito)
  const isCapabilitiesQuery =
    /^(que puedes hacer|que sabes hacer|capacidades|ayuda|comandos|help)$/i.test(norm);

  if (isCapabilitiesQuery) {
    const config = await getCompanyConfig(companyId);
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

    let res = `Soy ${config.botName}, director operativo y de back-office de ${config.companyName}.\n\n`;
    res += `Estado actual de tu empresa:\n`;
    res += `• Catálogo Activo: ${numProds > 0 ? `${numProds} productos registrados` : "0 productos (ingresa '/source' para vincular tu archivo CSV o base de datos)"}.\n`;
    res += `• Proveedores: ${suppsCount > 0 ? `${suppsCount} registrados en base de datos` : "Sin proveedores registrados (usa '/suppliers' para agregar proveedores)"}.\n`;
    res += `• Canales de Alerta: ${chansCount > 0 ? `${chansCount} canal(es) activo(s)` : "Solo consola (agrega Discord o Telegram con '/channels')"}.\n`;
    res += `• Gobernanza: ${config.autonomyLevel.toUpperCase()} (CERO compras unilaterales; 100% supervisado en /inbox).\n\n`;
    res += `Mis capacidades principales:\n`;
    res += `1. Monitoreo de Stock: Reviso quiebres y días de cobertura (/stock o '¿qué stock tenemos?').\n`;
    res += `2. Recomendaciones de Compra: Cotizo y formulo propuestas en /inbox sin desembolsar fondos por mi cuenta.\n`;
    res += `3. Logística y Rutas: Calculo distancias viales y fletes reales OSRM (/logistics o 'calcular ruta').\n`;
    res += `4. Memoria Viva Obsidian: Consulto notas de decisiones y auditorías (/memory o '¿qué recuerdas?').\n`;
    res += `5. Finanzas y Margen: Conciliación de ventas vs cobros y margen de ganancia (/reports o /reconcile).\n\n`;
    res += `Escribe cualquier consulta en lenguaje natural o escribe /help para ver la lista completa de comandos.`;

    return {
      intent: "GENERAL_ASSISTANCE",
      handledDeterministically: true,
      response: res,
      suggestedAction: "Ver /help o /stock",
    };
  }

  if (isGreeting) {
    const config = await getCompanyConfig(companyId);
    const timeStr = formatCompanyDate(new Date(), config.timezone, true);
    return {
      intent: "SMALLTALK",
      handledDeterministically: true,
      response: `Hola. Soy ${config.botName}, coordinador operativo de ${config.companyName}. Son las ${timeStr} (${config.timezone}). Todo el sistema está activo. ¿En qué te puedo colaborar hoy? Puedes consultarme sobre existencias, compras pendientes, flota de envíos o pedirme un reporte diario.`,
      suggestedAction: "Preguntar sobre stock, órdenes o /inbox",
    };
  }

  if (/^(gracias|muchas gracias|ok|vale|listo|entendido|perfecto|excelente)[\s!.¡¿?]*$/.test(norm)) {
    return {
      intent: "SMALLTALK",
      handledDeterministically: true,
      response: "Con gusto. Sigo monitoreando la operación en tiempo real. Cualquier novedad de inventario o transporte te la notificaré al instante.",
    };
  }

  // 2. INTENCIÓN: Consulta de Inventario / Stock / Quiebres (Comando explícito)
  const isExplicitStockCommand =
    /^(ver|mostrar|listar|consultar|dame el)?\s*(stock|inventario|existencias|quiebres|desabastos|catalogo)(\s+(general|actual|completo))?$/i.test(norm) ||
    norm === "stock" ||
    norm === "inventario" ||
    norm === "existencias" ||
    norm === "quiebres";

  if (isExplicitStockCommand) {
    const intel = await getInventoryIntelligence(companyId);
    const critical = intel.items.filter((i) => i.daysUntilStockout <= 7 || i.currentStock === 0);

    let summaryText = `Actualmente gestionamos ${intel.totalSkus} SKUs con un total de ${intel.totalStockUnits} unidades físicas en almacén (valorizado en $${intel.totalStockValuation.toLocaleString()} ${intel.currency}).`;

    if (critical.length > 0) {
      const topItems = critical.slice(0, 3).map((c) => `• ${c.name} (${c.sku}): ${c.currentStock}u disponibles (${c.daysUntilStockout === 0 ? "AGOTADO" : `quiebre en ~${c.daysUntilStockout}d`})`).join("\n");
      summaryText += `\n\nALERTA OPERATIVA: Hay ${critical.length} producto(s) en riesgo inminente de agotamiento:\n${topItems}`;
      summaryText += `\nPuedes ver las propuestas automáticas de compra generadas en /inbox o explorar /intel quiebre.`;
    } else {
      summaryText += `\n\nTodos los productos tienen niveles de cobertura saludables por encima del margen de seguridad.`;
    }

    if (intel.totalImmobilizedOverstockCapital > 0) {
      summaryText += `\nNota: Se detectó $${intel.totalImmobilizedOverstockCapital.toLocaleString()} ${intel.currency} inmovilizados en sobrestock. Revisa /intel overstock para estrategias de liberación.`;
    }

    return {
      intent: "INVENTORY_QUERY",
      handledDeterministically: true,
      response: summaryText,
      suggestedAction: critical.length > 0 ? "Revisar /inbox o /intel" : "Ver /stock",
      data: intel,
    };
  }

  // 3. INTENCIÓN: Inbox / Propuestas de Aprobación Pendientes
  if (
    norm.includes("inbox") ||
    norm.includes("propuesta") ||
    norm.includes("por aprobar") ||
    norm.includes("pendientes") ||
    norm.includes("autorizar") ||
    norm.includes("solicitudes")
  ) {
    const pending = await db
      .select()
      .from(decisions)
      .where(and(eq(decisions.companyId, companyId), eq(decisions.policyDecision, "pending_approval")))
      .orderBy(desc(decisions.createdAt));

    if (pending.length === 0) {
      return {
        intent: "INBOX_QUERY",
        handledDeterministically: true,
        response: "La bandeja de entrada (/inbox) está al día. Cero propuestas de compra pendientes de autorización humana en este momento.",
        suggestedAction: "Continuar monitoreo habitual",
      };
    }

    const preview = pending.slice(0, 3).map((p) => `• [${p.id}] ${p.title} - Monto estimado: $${parseFloat(p.costMxn?.toString() || "0").toLocaleString()}`).join("\n");
    return {
      intent: "INBOX_QUERY",
      handledDeterministically: true,
      response: `Tienes ${pending.length} propuesta(s) de reposición esperando tu revisión en /inbox:\n\n${preview}\n\nPuedes aprobar directamente con /approve <id> o ver el detalle agrupado con /inbox.`,
      suggestedAction: "Ejecutar /inbox o /approve <id>",
      data: pending,
    };
  }

  // 4. INTENCIÓN: Órdenes de Compra / Pedidos a Proveedor
  if (
    norm.includes("orden") ||
    norm.includes("ordenes") ||
    norm.includes("pedidos") ||
    norm.includes("compras") ||
    norm.includes("cuando llega") ||
    norm.includes("pedi a proveedor")
  ) {
    const { listCompanyOrders } = await import("../services/fleetAndOrdersService");
    const orders = await listCompanyOrders(companyId);
    const open = orders.filter((o: any) => o.status === "abierta");

    if (orders.length === 0) {
      return {
        intent: "ORDERS_QUERY",
        handledDeterministically: true,
        response: "No hay órdenes de compra registradas aún. Cuando apruebes una propuesta en /inbox, el sistema emitirá la orden automáticamente.",
      };
    }

    let msg = `Históricamente se han emitido ${orders.length} órdenes de compra.`;
    if (open.length > 0) {
      const openList = open.slice(0, 3).map((o: any) => `• ${o.id}: ${o.productName} (${o.quantity}u) a ${o.supplierName} - Total: $${o.totalAmount.toLocaleString()} ${o.currency}`).join("\n");
      msg += ` Actualmente hay ${open.length} orden(es) en espera de recepción en almacén:\n\n${openList}\n\nUsa /orders para la lista completa o /receive <id> cuando la mercancía llegue a bodega.`;
    } else {
      msg += " Todas las órdenes emitidas han sido recibidas satisfactoriamente en almacén.";
    }

    return {
      intent: "ORDERS_QUERY",
      handledDeterministically: true,
      response: msg,
      suggestedAction: open.length > 0 ? "Ver /orders o /receive" : "Ver /orders",
      data: orders,
    };
  }

  // 4.1 INTENCIÓN: Ganancias, Margen y Utilidad (Tarea 1.5)
  if (
    norm.includes("ganancia") ||
    norm.includes("ganancias") ||
    norm.includes("margen") ||
    norm.includes("profit") ||
    norm.includes("utilidad")
  ) {
    const { generateProfitAndMarginReportData } = await import("../services/reportService");
    const fin = await generateProfitAndMarginReportData(companyId);

    let msg = `Resumen Financiero y Ganancias:\n`;
    msg += `• Ingresos Facturados: $${fin.summary.totalRevenue.toLocaleString()} ${fin.summary.currency}\n`;
    msg += `• Ganancia Neta Estimada (30d): $${fin.summary.totalProfit.toLocaleString()} ${fin.summary.currency}\n`;
    if (fin.summary.overallMarginPercent !== null) {
      msg += `• Margen Promedio Ponderado: ${fin.summary.overallMarginPercent}%\n`;
    }
    if (fin.summary.productsWithoutCostCount > 0) {
      msg += `• Aviso: ${fin.summary.productsWithoutCostCount} producto(s) con 'costo no registrado' (margen omitido, nunca estimado).\n`;
    }
    msg += `\nPuedes ver el desglose completo por producto con /reports profit.`;

    return {
      intent: "REPORTS_QUERY",
      handledDeterministically: true,
      response: msg,
      suggestedAction: "Ver /reports profit",
      data: fin,
    };
  }

  // 5. INTENCIÓN: Flota, Envíos y Seguimiento de Transporte en Tiempo Real (Tarea 1.2)
  if (
    norm.includes("flota") ||
    norm.includes("envio") ||
    norm.includes("envios") ||
    norm.includes("transporte") ||
    norm.includes("camion") ||
    norm.includes("guia") ||
    norm.includes("rastreo") ||
    norm.includes("donde esta el paquete") ||
    norm.includes("chofer") ||
    norm.includes("conductor")
  ) {
    const { listCompanyFleet } = await import("../services/fleetAndOrdersService");
    const fleet = await listCompanyFleet(companyId);

    if (fleet.activeShipments.length === 0) {
      return {
        intent: "FLEET_QUERY",
        handledDeterministically: true,
        response: "no tengo este dato (no hay flota ni transportes registrados en la base de datos).",
        suggestedAction: "Configurar con /logistics",
      };
    }

    let msg = `Panel de Transporte: ${fleet.activeShipments.length} embarques registrados, ${fleet.totalInTransit} en tránsito y ${fleet.drivers.length} choferes asignados.`;
    if (fleet.totalDelayed > 0) {
      msg += `\n\nALERTA LOGÍSTICA: ${fleet.totalDelayed} envío(s) presentan retraso con el transportista.`;
    }
    msg += `\nPuedes rastrear una guía específica con mint track <guia> o revisar /fleet.`;

    return {
      intent: "FLEET_QUERY",
      handledDeterministically: true,
      response: msg,
      suggestedAction: "Ver /fleet",
      data: fleet,
    };
  }

  // 6. INTENCIÓN: Proveedores (Regla de la Tarea 1.4: nada asumido ni inventado)
  if (
    norm.includes("proveedor") ||
    norm.includes("proveedores") ||
    norm.includes("quien nos vende") ||
    norm.includes("suplidor")
  ) {
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
        response: "no tengo este dato. Se ha agregado al banco de preguntas pendientes (/questions).",
      };
    }

    const preview = supps.slice(0, 4).map((s: any) => `• ${s.name} (${s.city || "Sin ciudad"}): ${s.catalogCount} SKUs cotizados (Lead time prom: ${s.avgLeadTimeDays}d)`).join("\n");
    return {
      intent: "SUPPLIERS_QUERY",
      handledDeterministically: true,
      response: `Tenemos ${supps.length} proveedores registrados en el catálogo:\n\n${preview}\n\nPuedes ver el catálogo de precios de cualquiera con /suppliers <id>.`,
      suggestedAction: "Ver /suppliers",
      data: supps,
    };
  }

  // 7. INTENCIÓN: Reportes y Resumen Ejecutivo
  if (
    norm.includes("reporte") ||
    norm.includes("reportes") ||
    norm.includes("briefing") ||
    norm.includes("resumen del dia") ||
    norm.includes("como nos fue") ||
    norm.includes("resumen operativo")
  ) {
    const daily = await generateDailyOperationalReport(companyId);
    let msg = `Resumen Operativo (${daily.dateStr}):\n`;
    msg += `• Salud del Sistema: ${daily.systemHealth}\n`;
    msg += `• SKUs Monitoreados: ${daily.totalProducts} (${daily.totalStockUnits} unidades en total)\n`;
    msg += `• Déficits Críticos: ${daily.criticalDeficitsCount}\n`;
    msg += `• Propuestas en Inbox: ${daily.openProposalsCount}\n`;
    msg += `• Gasto del Día: $${daily.totalSpend.toLocaleString()} ${daily.currency}\n\n`;
    msg += `Prioridades:\n${daily.topPriorityActions.map((a, i) => `${i + 1}. ${a}`).join("\n")}`;

    return {
      intent: "REPORTS_QUERY",
      handledDeterministically: true,
      response: msg,
      suggestedAction: "Ejecutar /reports o /today",
      data: daily,
    };
  }

  // 8. INTENCIÓN: Configuración / Zona Horaria / Divisa
  if (
    norm.includes("configuracion") ||
    norm.includes("zona horaria") ||
    norm.includes("moneda") ||
    norm.includes("divisa") ||
    norm.includes("limite de compra") ||
    norm.includes("ajustes")
  ) {
    const config = await getCompanyConfig(companyId);
    return {
      intent: "CONFIG_QUERY",
      handledDeterministically: true,
      response: `Configuración de ${config.companyName} [${config.companyId}]:\n• Zona Horaria: ${config.timezone} (Hora actual: ${formatCompanyDate(new Date(), config.timezone, true)})\n• Divisa Oficial: ${config.currency}\n• Límite Aprobación HITL: ${config.approvalLimitAmount === null ? "sin definir" : `$${config.approvalLimitAmount.toLocaleString()} ${config.currency}`}\n• Nivel de Autonomía: ${config.autonomyLevel.toUpperCase()}\n• Tono del Asistente: ${config.botTone}\n\nPuedes modificar cualquier parámetro con /config set <clave> <valor>.`,
      suggestedAction: "Ver /config",
      data: config,
    };
  }

  // 8.1 INTENCIÓN: Memoria Viva y Bóveda Obsidian (Búsqueda y estado de memoria)
  if (
    norm.includes("memoria") ||
    norm.includes("obsidian") ||
    norm.includes("recuerdas") ||
    norm.includes("que notas") ||
    norm.includes("que sabes") ||
    norm.includes("que aprendiste") ||
    norm.includes("historial de decisiones") ||
    norm.includes("que compraste") ||
    norm.includes("que decidiste")
  ) {
    const { getVaultStats, searchObsidianMemory } = await import("../services/obsidianMemoryService");
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

    let msg = `Memoria Viva y Bóveda de Conocimiento (Obsidian Cloud + Supabase PostgreSQL):\n`;
    if (stats) {
      msg += `• Bóveda Obsidian: ${stats.vaultPath}\n`;
      msg += `• Notas en Vault: ${stats.totalNotas} (${stats.totalDecisiones} decisiones, ${stats.totalCuarentena} cuarentenas, ${stats.totalPreguntas} preguntas, ${stats.totalAuditorias} auditorías).\n`;
      msg += `• Sincronización Cloud: Carpeta sincronizada en tiempo real mediante OneDrive / Cloud Sync.\n`;
    }
    if (recent.length > 0) {
      msg += `\nÚltimas Decisiones Recordadas:\n`;
      msg += recent.map((d) => `• [${d.id}] ${d.title} (Estado: ${d.policyDecision}, Costo: $${d.costMxn})`).join("\n");
    }
    msg += `\nPuedes explorar notas con 'mint memory search <termino>' o sincronizar con 'mint memory sync'.`;

    return {
      intent: "MEMORY_QUERY",
      handledDeterministically: true,
      response: msg,
      suggestedAction: "Ejecutar /memory o 'mint memory search'",
      data: { stats, recent },
    };
  }

  // 9. INTENCIÓN: Simulación de escenarios
  if (norm.startsWith("simula") || norm.includes("que pasaria si") || norm.includes("que pasa si")) {
    return {
      intent: "SIMULATE_SCENARIO",
      handledDeterministically: false,
      response: "Para simular un escenario operativo en sandbox de prueba, usa el simulador multi-agente:\n• /simulate stockout (Quiebre crítico de existencias)\n• /simulate delay (Retraso de transporte de 5 días)\n• /simulate price-spike (Incremento atípico de precios de proveedor)\n• /simulate demand-surge (Pico repentino de demanda +50%)\n• /simulate supplier-outage (Paro en planta de proveedor)",
      suggestedAction: "Ejecutar /simulate <escenario>",
    };
  }

  // 10. Consulta abierta o compleja que requiere deliberación multi-agente profunda
  return {
    intent: "GENERAL_ASSISTANCE",
    handledDeterministically: false,
    response: "",
  };
}
