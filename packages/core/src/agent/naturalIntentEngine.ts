import { db } from "../db/client";
import {
  products,
  inventory,
  decisions,
  purchaseOrders,
  suppliers,
  shipments,
  companies,
} from "../db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getCompanyConfig, formatCompanyDate } from "../services/configService";
import { getInventoryIntelligence } from "../services/inventoryIntelService";
import { listCompanyFleet } from "../services/fleetAndOrdersService";
import { generateDailyOperationalReport } from "../services/reportService";

export type DetectedIntentType =
  | "SMALLTALK"
  | "INVENTORY_QUERY"
  | "INBOX_QUERY"
  | "ORDERS_QUERY"
  | "FLEET_QUERY"
  | "SUPPLIERS_QUERY"
  | "REPORTS_QUERY"
  | "CONFIG_QUERY"
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

  // 1. FAST PATH: Saludos y cortesía (Smalltalk)
  const isGreeting =
    /^(hola|holi|buenas|buenos dias|buenas tardes|buenas noches|hey|hi|hello|que tal|saludos|que hubo)[\s,!.¡¿?-]*$/i.test(norm) ||
    /^(hola[\s,]+(buenos dias|buenas tardes|buenas noches|que tal|como estas|como te va|mint|equipo|amigo))[\s,!.¡¿?-]*$/i.test(norm) ||
    /^(buenos dias|buenas tardes|buenas noches)[\s,]+(hola|mint|a todos|equipo)[\s,!.¡¿?-]*$/i.test(norm);

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

  // 2. INTENCIÓN: Consulta de Inventario / Stock / Quiebres
  if (
    norm.includes("stock") ||
    norm.includes("inventario") ||
    norm.includes("existencias") ||
    norm.includes("quiebre") ||
    norm.includes("desabasto") ||
    norm.includes("se van a agotar") ||
    norm.includes("cuanto tenemos de") ||
    norm.includes("catalogo")
  ) {
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
