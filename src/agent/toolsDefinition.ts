import OpenAI from "openai";
import { executeConsultarStock } from "../tools/consultarStock";
import { executeVerOrdenesAbiertas } from "../tools/verOrdenesAbiertas";
import { executeCrearOrdenCompra } from "../tools/crearOrdenCompra";
import { executeReporteGeneral } from "../tools/reportesGenerales";
import { executeEvaluarProveedores } from "../tools/evaluarProveedores";
import { executeAnalisisFinanciero } from "../tools/analisisFinanciero";
import { executeSimularEscenario } from "../tools/simularEscenario";
import { executeAuditarAnomalias } from "../tools/auditarAnomalias";
import { executePronosticarDemanda } from "../tools/pronosticarDemanda";
import { executeConsultarEnvios } from "../tools/consultarEnvios";

export const AGENT_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
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
              "Identificador del producto (ej: 'prod_st200', 'prod_v500')",
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
            description: "ID del producto a cotizar (ej. 'prod_st200')",
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
        "Crea una orden de compra para abastecer inventario. Requiere clave de idempotencia única. Si el total supera $10,000 MXN, se suspende para aprobación.",
      parameters: {
        type: "object",
        properties: {
          case_id: {
            type: "string",
            description: "ID del caso atendido",
          },
          producto_id: {
            type: "string",
            description: "ID del producto a comprar",
          },
          proveedor_id: {
            type: "string",
            description:
              "ID del proveedor seleccionado (ej: 'prov_acme', 'prov_global')",
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
        "Dictamina el caso como ESCALADO a un humano cuando supera límites de compra ($10,000 MXN), falta información o hay inconsistencias.",
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

  switch (name) {
    case "consultar_stock":
      return {
        result: await executeConsultarStock(parsedArgs),
        isClosingAction: false,
      };

    case "ver_ordenes_abiertas":
      return {
        result: await executeVerOrdenesAbiertas(parsedArgs),
        isClosingAction: false,
      };

    case "crear_orden_compra":
      return {
        result: await executeCrearOrdenCompra({
          ...parsedArgs,
          case_id: parsedArgs.case_id || context?.caseId,
        }),
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

    case "generar_reporte_general":
      return {
        result: await executeReporteGeneral(parsedArgs),
        isClosingAction: false,
      };

    case "evaluar_proveedores":
      return {
        result: await executeEvaluarProveedores(parsedArgs),
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
