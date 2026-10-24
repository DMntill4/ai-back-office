import { OpenAI } from "openai";
import {
  executeConsultarStock,
} from "../tools/consultarStock";
import { executeVerOrdenesAbiertas } from "../tools/verOrdenesAbiertas";
import { executeCrearOrdenCompra } from "../tools/crearOrdenCompra";
import { executeReporteGeneral } from "../tools/reportesGenerales";
import { executeEvaluarProveedores } from "../tools/evaluarProveedores";
import { executeAnalisisFinanciero } from "../tools/analisisFinanciero";
import { executeSimularEscenario } from "../tools/simularEscenario";
import { executeAuditarAnomalias } from "../tools/auditarAnomalias";
import { executePronosticarDemanda } from "../tools/pronosticarDemanda";
import { executeConsultarEnvios } from "../tools/consultarEnvios";
import { executeAjustarStock } from "../tools/ajustarStock";
import { executeConsultarEstadoSistema } from "../tools/consultarEstadoSistema";
import { executeVerificarFrescuraDatos } from "../tools/verificarFrescuraDatos";
import { executeCalcularRutaLogistica } from "../tools/calcularRutaLogistica";
import {
  dispatchOutboundShipment,
  receiveInboundShipment,
  buildConsolidatedLoadPlans,
  evaluateWarehouseRebalancing,
  analyzeDynamicCatalogHealth,
} from "../services/logisticsCoordinatorService";
import { updateLogisticsNodeLocation } from "../services/geocodingService";
import { db } from "../db/client";
import { decisions } from "../db/schema";

export const AGENT_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "verificar_frescura_datos",
      description:
        "Verifica si las fuentes de datos externas e inventario están al día (<24h) o si hay desactualización o cambios de esquema (drift).",
      parameters: {
        type: "object",
        properties: {
          horas_limite: {
            type: "number",
            description: "Horas máximas de desfase aceptadas (por defecto: 24).",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_stock",
      description:
        "Consulta el inventario actual de un producto específico y su stock mínimo de seguridad.",
      parameters: {
        type: "object",
        properties: {
          producto_id: {
            type: "string",
            description:
              "Identificador, SKU o nombre del producto (ej: 'prod_st200', 'SKU-MAN-SM400')",
          },
        },
        required: ["producto_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generar_reporte_general",
      description: "Genera reportes generales sobre el inventario, caducidades, renovaciones y ventas.",
      parameters: {
        type: "object",
        properties: {
          tipo_reporte: {
            type: "string",
            enum: ["mas_vendido", "sin_stock", "renovar", "caducidad"],
            description: "El tipo de reporte solicitado. mas_vendido: el producto estrella; sin_stock: agotados; renovar: stock debajo del umbral; caducidad: próximos a expirar (food).",
          },
        },
        required: ["tipo_reporte"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "evaluar_proveedores",
      description: "Evalúa y compara proveedores para un producto específico según criterios de costo, velocidad de entrega o balanceado.",
      parameters: {
        type: "object",
        properties: {
          producto_id: {
            type: "string",
            description: "ID, SKU o nombre del producto a cotizar (ej. 'prod_st200')",
          },
          criterio: {
            type: "string",
            enum: ["costo", "velocidad", "balanceado"],
            description: "Criterio de prioridad para elegir el mejor proveedor.",
          },
        },
        required: ["producto_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analisis_financiero",
      description: "Genera un análisis financiero del inventario: valuación total de stock, compras abiertas comprometidas y presupuesto de reabastecimiento proyectado.",
      parameters: {
        type: "object",
        properties: {
          incluir_proyecciones: {
            type: "boolean",
            description: "Si es true, incluye proyecciones de gasto a 30 días.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "simular_escenario",
      description: "Simula escenarios logísticos 'What-If' ante incrementos hipotéticos de demanda o retrasos de entrega de proveedores.",
      parameters: {
        type: "object",
        properties: {
          producto_id: {
            type: "string",
            description: "ID del producto a simular (ej. 'prod_st200')",
          },
          incremento_demanda_porcentaje: {
            type: "number",
            description: "Porcentaje de aumento proyectado en la demanda (ej. 50 para +50%).",
          },
          retraso_proveedor_dias: {
            type: "number",
            description: "Días adicionales de retraso proyectado en la entrega del proveedor.",
          },
        },
        required: ["producto_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "auditar_anomalias",
      description: "Audita y detecta anomalías críticas en el sistema: descalces de inventario, stock cero y sobrecostos en proveedores.",
      parameters: {
        type: "object",
        properties: {
          tipo_auditoria: {
            type: "string",
            enum: ["descalces_inventario", "precios_proveedor", "todo"],
            description: "Tipo de auditoría a ejecutar.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "ver_ordenes_abiertas",
      description:
        "Consulta las órdenes de compra activas o en tránsito para verificar si ya viene producto en camino.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "crear_orden_compra",
      description:
        "Crea una orden de compra y su guía de embarque para abastecer inventario. Requiere clave de idempotencia única. Si el total supera el umbral, se suspende para aprobación.",
      parameters: {
        type: "object",
        properties: {
          case_id: {
            type: "string",
            description: "ID del caso atendido",
          },
          producto_id: {
            type: "string",
            description: "ID o SKU del producto a comprar",
          },
          proveedor_id: {
            type: "string",
            description:
              "ID del proveedor seleccionado (ej: 'prov_acme', 'compra_directa')",
          },
          cantidad: {
            type: "number",
            description: "Cantidad de unidades a pedir",
          },
          idempotency_key: {
            type: "string",
            description:
              "Clave única para asegurar idempotencia (ej: 'idem_case123_st200_10')",
          },
        },
        required: [
          "case_id",
          "producto_id",
          "proveedor_id",
          "cantidad",
          "idempotency_key",
        ],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "resolver_caso",
      description:
        "Dictamina el caso como RESUELTO cuando las acciones requeridas fueron concluidas y verificadas exitosamente.",
      parameters: {
        type: "object",
        properties: {
          resumen_resolucion: {
            type: "string",
            description:
              "Resumen conciso de cómo se resolvió el caso y la evidencia verificada",
          },
          justificacion: {
            type: "string",
            description: "Explicación técnica de la decisión tomada",
          },
        },
        required: ["resumen_resolucion", "justificacion"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "escalar_caso",
      description:
        "Dictamina el caso como ESCALADO a un humano cuando requiere revisión ejecutiva, autorización de compra (HITL), falta información o hay inconsistencias.",
      parameters: {
        type: "object",
        properties: {
          motivo_escalamiento: {
            type: "string",
            description:
              "Razón principal por la que se escala a un supervisor humano",
          },
          expediente: {
            type: "string",
            description:
              "Resumen de lo recopilado: stock actual, cotizaciones, compras requeridas e intentos realizados",
          },
        },
        required: ["motivo_escalamiento", "expediente"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "pronosticar_demanda",
      description:
        "Calcula el pronóstico de demanda futura, tasa de consumo diario y semanas de cobertura para un producto con base en el historial de ventas.",
      parameters: {
        type: "object",
        properties: {
          producto_id: {
            type: "string",
            description: "ID del producto a pronosticar (ej: 'prod_st200')",
          },
          horizonte_dias: {
            type: "number",
            description: "Días de horizonte a proyectar (por defecto 30)",
          },
        },
        required: ["producto_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "ajustar_stock",
      description:
        "Modifica, suma o resta existencias de stock de un producto específico en la base de datos de la empresa (ej: cuando el usuario pide quitar o sumar unidades).",
      parameters: {
        type: "object",
        properties: {
          producto_id: {
            type: "string",
            description: "ID o SKU del producto (ej: 'prod_st200', 'SKU-MAN-SM400')",
          },
          cantidad_delta: {
            type: "number",
            description: "Cantidad a sumar o restar del inventario. Usa números negativos para restar (ej: -5) o positivos para agregar (ej: 10).",
          },
          motivo: {
            type: "string",
            description: "Razón del ajuste de inventario",
          },
        },
        required: ["producto_id", "cantidad_delta"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_envios",
      description:
        "Consulta el estado en tiempo real, transportista, ubicación y fecha estimada de entrega de órdenes de compra y envíos en tránsito.",
      parameters: {
        type: "object",
        properties: {
          numero_rastreo: {
            type: "string",
            description: "Número de guía o tracking (ej: 'TRK-MX-88902')",
          },
          orden_id: {
            type: "string",
            description: "ID de la orden de compra a rastrear (ej: 'po_001')",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_estado_sistema",
      description:
        "Consulta qué base de datos está conectada (PostgreSQL / Supabase), las tablas y cantidad de productos registrados en el catálogo de la empresa activa.",
      parameters: {
        type: "object",
        properties: {
          empresa_id: {
            type: "string",
            description: "ID opcional de la empresa a consultar",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_canales_notificacion",
      description:
        "Consulta los canales de comunicación y alertas configurados en PostgreSQL (Discord, Slack, Telegram, Gmail), indicando sus URLs/IDs y si están activos.",
      parameters: {
        type: "object",
        properties: {
          empresa_id: {
            type: "string",
            description: "ID opcional de la empresa a consultar",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "probar_canal_notificacion",
      description:
        "Envía un mensaje o alerta de prueba en tiempo real al webhook o bot configurado (Discord, Slack, Telegram).",
      parameters: {
        type: "object",
        properties: {
          tipo: {
            type: "string",
            enum: ["discord", "slack", "telegram", "gmail"],
            description: "Tipo de canal a probar",
          },
          canal_id: {
            type: "string",
            description: "ID del canal específico a probar (opcional)",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "enviar_notificacion_operativa",
      description:
        "Envía un reporte logístico, manifiesto de embarque o alerta real personalizada a todos los canales activos de Discord y Telegram de la empresa.",
      parameters: {
        type: "object",
        properties: {
          titulo: {
            type: "string",
            description: "Título del reporte o alerta operativa",
          },
          mensaje: {
            type: "string",
            description: "Cuerpo detallado del reporte o notificación a enviar",
          },
          severidad: {
            type: "string",
            enum: ["info", "alta", "critica"],
            description: "Nivel de prioridad de la alerta",
          },
        },
        required: ["titulo", "mensaje"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calcular_ruta_logistica",
      description:
        "Calcula la distancia vial real en kilómetros, tiempo de conducción por carretera y costo estimado de flete entre dos ciudades, direcciones, almacenes o proveedores con cartografía OSRM y geocodificación GPS automática.",
      parameters: {
        type: "object",
        properties: {
          proveedor_id: {
            type: "string",
            description: "ID, nombre o ciudad del proveedor de origen (ej. 'prov_acme', 'Bosch', 'Monterrey')",
          },
          almacen_id: {
            type: "string",
            description: "ID, nombre o ciudad del almacén de destino",
          },
          origen_direccion: {
            type: "string",
            description: "Ciudad o dirección libre de origen (ej. 'Querétaro', 'Guadalajara')",
          },
          destino_direccion: {
            type: "string",
            description: "Ciudad o dirección libre de destino (ej. 'Monterrey', 'CDMX')",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "despachar_envio_cliente",
      description:
        "Despacha un envío de salida (Outbound Shipment) hacia la dirección o ciudad de un cliente, seleccionando automáticamente la bodega más cercana con stock disponible, descontando el inventario físico y generando guía con ruta OSRM y ETA.",
      parameters: {
        type: "object",
        properties: {
          producto_id: {
            type: "string",
            description: "ID, SKU o nombre del producto a despachar",
          },
          cantidad: {
            type: "number",
            description: "Cantidad de unidades a enviar",
          },
          destino_direccion: {
            type: "string",
            description: "Ciudad o dirección de entrega del cliente (ej. 'Monterrey, NL', 'Av. Reforma 222, CDMX')",
          },
          cliente_nombre: {
            type: "string",
            description: "Nombre del cliente o sucursal receptora",
          },
          transportista: {
            type: "string",
            description: "Transportista asignado (por defecto 'Mint Logistics Express')",
          },
        },
        required: ["producto_id", "cantidad", "destino_direccion"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "recibir_mercancia_envio",
      description:
        "Registra la recepción física en almacén de un envío en tránsito (Inbound Shipment) o de una orden de compra, marcando la guía como 'entregado' y sumando automáticamente las unidades al inventario real.",
      parameters: {
        type: "object",
        properties: {
          identificador: {
            type: "string",
            description: "Número de guía (ej. 'TRK-IN-...') o ID de la orden de compra (ej. 'po_...')",
          },
        },
        required: ["identificador"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consolidar_cargas_y_rebalancear",
      description:
        "Ejecuta el motor de Torre de Control Logística: calcula Punto de Reorden Dinámico (ROP), evalúa Rebalanceo Inter-Almacenes (Cross-Docking) para ahorrar compras innecesarias y consolida múltiples SKUs por proveedor calculando el Landed Cost (Producto + Flete OSRM).",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "configurar_nodo_logistico_gps",
      description:
        "Geocodifica cualquier ciudad o dirección y actualiza las coordenadas GPS reales (latitud y longitud) de un almacén o proveedor en la base de datos.",
      parameters: {
        type: "object",
        properties: {
          tipo_nodo: {
            type: "string",
            enum: ["warehouse", "supplier"],
            description: "'warehouse' para almacén/bodega o 'supplier' para proveedor",
          },
          identificador_o_nombre: {
            type: "string",
            description: "ID o nombre del almacén o proveedor a actualizar",
          },
          ciudad_o_direccion: {
            type: "string",
            description: "Ciudad o dirección física para geocodificar sus coordenadas GPS (ej. 'Querétaro, México')",
          },
        },
        required: ["tipo_nodo", "identificador_o_nombre", "ciudad_o_direccion"],
      },
    },
  },
];

export async function dispatchToolCall(
  name: string,
  rawArgs: string,
  context?: { companyId?: string; caseId?: string },
): Promise<{
  result: any;
  isClosingAction: boolean;
  closingType?: "resuelto" | "escalado";
}> {
  let parsedArgs: any = {};
  try {
    parsedArgs = JSON.parse(rawArgs);
  } catch {
    return {
      result: {
        isSuccess: false,
        message: "Error al parsear argumentos JSON de la herramienta",
      },
      isClosingAction: false,
    };
  }

  const effectiveCompanyId = context?.companyId || "comp_default";

  switch (name) {
    case "consultar_stock":
      return {
        result: await executeConsultarStock(parsedArgs, context),
        isClosingAction: false,
      };

    case "ver_ordenes_abiertas":
      return {
        result: await executeVerOrdenesAbiertas(parsedArgs),
        isClosingAction: false,
      };

    case "crear_orden_compra":
      return {
        result: await executeCrearOrdenCompra(
          {
            ...parsedArgs,
            case_id: parsedArgs.case_id || context?.caseId || `case_${Date.now()}`,
          },
          context,
        ),
        isClosingAction: false,
      };

    case "pronosticar_demanda":
      return {
        result: await executePronosticarDemanda(parsedArgs, context),
        isClosingAction: false,
      };

    case "consultar_envios":
      return {
        result: await executeConsultarEnvios(parsedArgs, context),
        isClosingAction: false,
      };

    case "ajustar_stock":
      return {
        result: await executeAjustarStock(parsedArgs, context),
        isClosingAction: false,
      };

    case "consultar_estado_sistema":
      return {
        result: await executeConsultarEstadoSistema(parsedArgs, context),
        isClosingAction: false,
      };

    case "verificar_frescura_datos":
      return {
        result: await executeVerificarFrescuraDatos(parsedArgs, effectiveCompanyId),
        isClosingAction: false,
      };

    case "generar_reporte_general":
      return {
        result: await executeReporteGeneral(parsedArgs, context),
        isClosingAction: false,
      };

    case "evaluar_proveedores":
      return {
        result: await executeEvaluarProveedores(parsedArgs, context),
        isClosingAction: false,
      };

    case "analisis_financiero":
      return {
        result: await executeAnalisisFinanciero(parsedArgs),
        isClosingAction: false,
      };

    case "simular_escenario":
      return {
        result: await executeSimularEscenario(parsedArgs),
        isClosingAction: false,
      };

    case "auditar_anomalias":
      return {
        result: await executeAuditarAnomalias(parsedArgs),
        isClosingAction: false,
      };

    case "calcular_ruta_logistica":
      return {
        result: await executeCalcularRutaLogistica(parsedArgs, context),
        isClosingAction: false,
      };

    case "despachar_envio_cliente": {
      const dispatchRes = await dispatchOutboundShipment({
        companyId: effectiveCompanyId,
        productQuery: parsedArgs.producto_id,
        quantity: Number(parsedArgs.cantidad || 1),
        destinationAddressOrCity: parsedArgs.destino_direccion,
        customerName: parsedArgs.cliente_nombre,
        carrier: parsedArgs.transportista,
      });
      return {
        result: {
          isSuccess: dispatchRes.success,
          ...dispatchRes,
        },
        isClosingAction: false,
      };
    }

    case "recibir_mercancia_envio": {
      const recvRes = await receiveInboundShipment({
        companyId: effectiveCompanyId,
        trackingOrOrderId: parsedArgs.identificador,
      });
      return {
        result: {
          isSuccess: recvRes.success,
          ...recvRes,
        },
        isClosingAction: false,
      };
    }

    case "consolidar_cargas_y_rebalancear": {
      const [health, rebalancing, consolidatedLoads] = await Promise.all([
        analyzeDynamicCatalogHealth(effectiveCompanyId),
        evaluateWarehouseRebalancing(effectiveCompanyId),
        buildConsolidatedLoadPlans(effectiveCompanyId),
      ]);
      const criticalOrReorder = health.filter((h) => h.needsReorder);
      return {
        result: {
          isSuccess: true,
          resumenCatalogo: {
            totalSkus: health.length,
            skusBajoPuntoReordenDinamico: criticalOrReorder.length,
            alertasRop: criticalOrReorder.slice(0, 12),
          },
          oportunidadesCrossDocking: rebalancing,
          planesConsolidacionCarga: consolidatedLoads,
          mensaje: `Torre Logística ejecutada: ${criticalOrReorder.length} SKU(s) bajo ROP dinámico, ${rebalancing.length} oportunidad(es) de transferencia inter-almacén y ${consolidatedLoads.length} plan(es) de carga consolidada con Landed Cost calculado.`,
        },
        isClosingAction: false,
      };
    }

    case "configurar_nodo_logistico_gps": {
      const updRes = await updateLogisticsNodeLocation({
        companyId: effectiveCompanyId,
        nodeType: parsedArgs.tipo_nodo || "warehouse",
        nodeIdOrName: parsedArgs.identificador_o_nombre,
        addressOrCity: parsedArgs.ciudad_o_direccion,
      });
      return {
        result: {
          isSuccess: updRes.success,
          ...updRes,
        },
        isClosingAction: false,
      };
    }

    case "enviar_notificacion_operativa": {
      const { dispatchDecisionNotification, listNotificationChannels } = await import("@mint/notifiers");
      const chans = await listNotificationChannels(effectiveCompanyId);
      const activeChans = chans.filter((c) => c.isActive);
      if (activeChans.length === 0) {
        return {
          result: {
            isSuccess: false,
            mensaje:
              "No hay canales de notificacion activos (Discord/Telegram/Slack) para esta empresa. Configuralos con '/channels' o desde la Desktop App.",
          },
          isClosingAction: false,
        };
      }
      const opDecId = `op_${Date.now().toString(36)}`;
      await db
        .insert(decisions)
        .values({
          id: opDecId,
          companyId: effectiveCompanyId,
          caseId: context?.caseId || "case_operativo",
          actionType: "ajustar_stock",
          proposingAgent: "coordinador",
          title: parsedArgs.titulo || "Reporte Operativo de Torre Logistica",
          costMxn: "0",
          riskScore: parsedArgs.severidad === "critica" ? "0.85" : "0.10",
          reversible: true,
          evidencePayload: {
            reporte: parsedArgs.mensaje,
            severidad: parsedArgs.severidad || "info",
          },
          riskPayload: { riskScore: 0.1, redFlags: [] },
          policyDecision: "auto_executed",
          policyReason: parsedArgs.mensaje,
          decidedAt: new Date(),
        })
        .onConflictDoNothing();

      const results = await dispatchDecisionNotification(opDecId, effectiveCompanyId);
      const sentCount = results.filter((r) => r.success).length;
      const errors = results.filter((r) => !r.success && r.error).map((r) => r.error!);
      return {
        result: {
          isSuccess: sentCount > 0,
          canalesEnviados: sentCount,
          errores: errors,
          mensaje:
            sentCount > 0
              ? `[OK] Notificacion operativa enviada en tiempo real a ${sentCount} canal(es) activo(s) (Discord/Telegram).`
              : `[ERROR] No se pudo entregar la notificacion: ${errors.join(", ")}`,
        },
        isClosingAction: false,
      };
    }

    case "consultar_canales_notificacion": {
      const { listNotificationChannels } = await import("@mint/notifiers");
      const companyId = parsedArgs.empresa_id || effectiveCompanyId;
      const chans = await listNotificationChannels(companyId);
      return {
        result: {
          isSuccess: true,
          empresaId: companyId,
          totalCanales: chans.length,
          canales: chans.map((c) => ({
            id: c.id,
            tipo: c.type,
            nombre: c.name,
            activo: c.isActive,
            webhookUrl: (c.config as any)?.webhookUrl ? `${(c.config as any).webhookUrl.slice(0, 35)}...` : undefined,
            temas: (c.config as any)?.topics || [],
          })),
          mensaje:
            chans.length > 0
              ? `Se encontraron ${chans.length} canal(es) de alerta configurado(s): ${chans.map((c) => `${c.type.toUpperCase()} ("${c.name}")`).join(", ")}.`
              : `No tienes canales de notificación remotos configurados actualmente en PostgreSQL para esta empresa. Puedes vincular Discord o Telegram con '/channels' o desde la Desktop App.`,
        },
        isClosingAction: false,
      };
    }

    case "probar_canal_notificacion": {
      const { testNotificationChannel, listNotificationChannels } = await import("@mint/notifiers");
      const chans = await listNotificationChannels(effectiveCompanyId);
      const target = chans.find((c) => c.type === parsedArgs.tipo || c.id === parsedArgs.canal_id) || chans[0];
      if (!target) {
        return {
          result: {
            isSuccess: false,
            mensaje: "No hay ningún canal configurado en PostgreSQL para probar. Agrega uno con '/channels add discord <webhook_url>'.",
          },
          isClosingAction: false,
        };
      }
      try {
        const testRes = await testNotificationChannel(target.type as any, (target.config as any) || {});
        return {
          result: {
            isSuccess: testRes.success,
            canal: target.name,
            tipo: target.type,
            resultado: testRes,
            mensaje: testRes.success
              ? `[OK] Mensaje de prueba entregado exitosamente al canal ${target.name}.`
              : `[ERROR] Fallo al enviar mensaje: ${testRes.error || "error de conexión"}`,
          },
          isClosingAction: false,
        };
      } catch (err: any) {
        return {
          result: {
            isSuccess: false,
            canal: target.name,
            tipo: target.type,
            mensaje: `[ERROR] Error al probar canal: ${err.message}`,
          },
          isClosingAction: false,
        };
      }
    }

    case "resolver_caso":
      return {
        result: {
          isSuccess: true,
          message: "Caso cerrado como resuelto",
          details: parsedArgs,
        },
        isClosingAction: true,
        closingType: "resuelto",
      };

    case "escalar_caso":
      return {
        result: {
          isSuccess: true,
          message: "Caso derivado a escalación humana",
          details: parsedArgs,
        },
        isClosingAction: true,
        closingType: "escalado",
      };

    default:
      return {
        result: {
          isSuccess: false,
          message: `Herramienta desconocida: ${name}`,
        },
        isClosingAction: false,
      };
  }
}
