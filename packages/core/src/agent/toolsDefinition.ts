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
import { executeConsultarHojaDeRuta } from "../tools/consultarHojaDeRuta";
import { executeDespacharEmbarque } from "../tools/despacharEmbarque";
import {
  dispatchOutboundShipment,
  receiveInboundShipment,
  buildConsolidatedLoadPlans,
  evaluateWarehouseRebalancing,
  analyzeDynamicCatalogHealth,
} from "../services/logisticsCoordinatorService";
import { updateLogisticsNodeLocation } from "../services/geocodingService";
import { db, testCustomConnection } from "../db/client";
import { cases, decisions, notificationLog, auditIncidents } from "../db/schema";
import {
  inspectAndRecoverDataSource,
  importBusinessDataWithRecovery,
  organizeAndAuditInventory,
  saveOperationalMemory,
  getActiveOperationalMemory,
  getOperationalMemoryWithEpistemicAudit,
  getActionProvenanceReport,
  sweepExpiredProposalsAndOverdueTasks,
  createVerifiedBusinessBackup,
  restoreVerifiedBusinessBackup,
  getTaskCheckpoints,
  verifySystemCapabilities,
  exploreWorkspaceEnvironment,
  introspectAndQueryDatabase,
  executeAuthorizedDataMutation,
} from "../services/autonomousIntelligenceService";

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
            description: "Número de guía o tracking (ej: 'TRK-FEDEX-88902' o 'TRK-IN-...')",
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
            description: "ID, nombre o ciudad del proveedor de origen (ej. 'prov_01', 'Proveedor Central')",
          },
          almacen_id: {
            type: "string",
            description: "ID, nombre o ciudad del almacén de destino",
          },
          origen_direccion: {
            type: "string",
            description: "Ciudad o dirección libre de origen (ej. 'Zona Industrial', 'Calle 26')",
          },
          destino_direccion: {
            type: "string",
            description: "Ciudad o dirección libre de destino (ej. 'Almacén Principal', 'Centro Logístico')",
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
            description: "Ciudad o dirección de entrega del cliente (ej. 'Calle 100 #15-20', 'Zona Rosa', ciudad de entrega)",
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
  {
    type: "function",
    function: {
      name: "consultar_memoria_obsidian",
      description:
        "Consulta y busca en las notas de memoria viva de Obsidian sincronizadas en la nube (Decisiones, Cuarentena, Preguntas pendientes y Auditoría diaria).",
      parameters: {
        type: "object",
        properties: {
          termino_busqueda: {
            type: "string",
            description:
              "Palabra clave o concepto a buscar en la memoria viva (ej: 'stock', 'valvula', 'decision', 'proveedor')",
          },
        },
        required: ["termino_busqueda"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_historial_decisiones",
      description:
        "Consulta el registro histórico de decisiones tomadas por MINT en la base de datos Supabase (compras, reasignaciones, cotizaciones, bloqueos y aprobaciones).",
      parameters: {
        type: "object",
        properties: {
          estado: {
            type: "string",
            enum: ["todas", "pending_approval", "approved", "rejected", "auto_executed", "blocked"],
            description: "Filtrar por estado de la decisión (por defecto 'todas')",
          },
          limite: {
            type: "number",
            description: "Cantidad máxima de decisiones a recuperar (por defecto 5)",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "inspeccionar_fuente_datos",
      description:
        "Inspecciona el contenido real de un archivo o carpeta (CSV, JSON, SQL, Excel) antes de importarlo. Verifica si contiene datos legítimos de negocio o si es un archivo de configuración/vacío/inválido, y busca alternativas válidas en el entorno si falla.",
      parameters: {
        type: "object",
        properties: {
          ruta_archivo: {
            type: "string",
            description: "Ruta del archivo o fuente de datos a inspeccionar",
          },
        },
        required: ["ruta_archivo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "importar_datos_negocio",
      description:
        "Importa datos de negocio validados con checkpoints idempotentes (evita duplicados si se interrumpe) y realiza auto-verificación real en la base de datos al finalizar.",
      parameters: {
        type: "object",
        properties: {
          ruta_archivo: {
            type: "string",
            description: "Ruta del archivo de datos a importar",
          },
          usar_alternativa_si_invalido: {
            type: "boolean",
            description: "Si el archivo primario es inválido, autoriza cambiar automáticamente a una fuente alternativa válida descubierta en la misma carpeta",
          },
        },
        required: ["ruta_archivo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "diagnosticar_conexion_bd",
      description:
        "Prueba y diagnostica una conexión de base de datos, clasifica errores reales (credenciales, puerto cerrado, base inexistente, timeout) y confirma el motor de respaldo activo sin interrumpir la operación.",
      parameters: {
        type: "object",
        properties: {
          database_url: {
            type: "string",
            description: "URI PostgreSQL a diagnosticar (opcional; si se omite verifica el estado de la base activa)",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "organizar_y_auditar_inventario",
      description:
        "Ejecuta una investigación y organización multi-paso del inventario: normaliza categorías inconsistentes, crea filas de almacén faltantes, detecta duplicados, identifica productos sin proveedor o sin precio, y auto-verifica el estado final.",
      parameters: {
        type: "object",
        properties: {
          aplicar_correcciones_seguras: {
            type: "boolean",
            description: "Si es true (por defecto), corrige automáticamente normalizaciones seguras y verifica el resultado en BD",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "guardar_memoria_operativa",
      description:
        "Guarda de forma persistente una regla, política o directiva operativa aprendida del usuario (ej. tiempos de entrega de proveedores, restricciones de compra, preferencias).",
      parameters: {
        type: "object",
        properties: {
          categoria: {
            type: "string",
            enum: [
              "DIRECTIVA_PROVEEDOR",
              "POLITICA_COMPRAS",
              "REGLA_INVENTARIO",
              "HORARIO_OPERATIVO",
              "INCIDENCIA_RECURRENTE",
              "PREFERENCIA_CLIENTE",
              "CONTEXTO_OPERATIVO",
            ],
          },
          clave_tema: {
            type: "string",
            description: "Identificador corto del tema (ej. 'PROVEEDOR_ACEROS_LEAD_TIME')",
          },
          contenido: {
            type: "string",
            description: "Descripción clara de la regla o hecho operativo a recordar",
          },
        },
        required: ["categoria", "clave_tema", "contenido"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_memoria_operativa",
      description:
        "Consulta las directivas y reglas de negocio activas guardadas en la memoria operativa persistente de la empresa.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "gestionar_checkpoint_tarea",
      description:
        "Consulta el estado de tareas multi-paso en curso o interrumpidas para reanudarlas de forma segura tras un reinicio sin repetir pasos ya completados.",
      parameters: {
        type: "object",
        properties: {
          solo_incompletas: {
            type: "boolean",
            description: "Filtrar únicamente tareas en progreso o interrumpidas",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "verificar_capacidades_sistema",
      description:
        "Verifica con exactitud qué herramientas, motores de base de datos, canales de notificación, proveedores de GPS en tiempo real y permisos de usuario están realmente disponibles.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "explorar_entorno_archivos",
      description:
        "Primitiva general de descubrimiento: explora un directorio o archivo en el entorno, clasifica qué archivos contienen datos reales de negocio vs archivos de configuración o vacíos, y devuelve las fuentes válidas disponibles.",
      parameters: {
        type: "object",
        properties: {
          ruta_directorio_o_archivo: {
            type: "string",
            description: "Ruta del directorio o archivo a explorar (opcional; por defecto explora el directorio activo)",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_esquema_y_datos_bd",
      description:
        "Primitiva general de introspección y consulta analítica: permite descubrir las tablas y columnas reales de la base de datos ('schema') o ejecutar cualquier consulta analítica SQL SELECT de solo lectura ('query') para resolver preguntas de negocio no previstas sin depender de flujos fijos.",
      parameters: {
        type: "object",
        properties: {
          modo: {
            type: "string",
            enum: ["schema", "query"],
            description: "'schema' para inspeccionar tablas y columnas reales; 'query' para ejecutar un SELECT analítico",
          },
          consulta_sql: {
            type: "string",
            description: "Sentencia SQL SELECT / WITH de solo lectura cuando modo='query'",
          },
          filtro_tabla: {
            type: "string",
            description: "Filtro opcional de nombre de tabla cuando modo='schema'",
          },
        },
        required: ["modo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "ejecutar_operacion_datos_autorizada",
      description:
        "Primitiva general de mutación controlada por fronteras RBAC: actualiza o inserta registros en tablas autorizadas (products, inventory, suppliers, warehouses) capturando evidencia antes/después y verificando el resultado en la base de datos.",
      parameters: {
        type: "object",
        properties: {
          tabla_destino: {
            type: "string",
            enum: ["products", "inventory", "suppliers", "warehouses"],
            description: "Tabla autorizada sobre la cual aplicar el cambio",
          },
          operacion: {
            type: "string",
            enum: ["update", "insert"],
            description: "Tipo de operación a ejecutar",
          },
          registro_id: {
            type: "string",
            description: "ID del registro a actualizar o insertar",
          },
          cambios: {
            type: "object",
            description: "Objeto clave-valor con las columnas y valores a aplicar",
          },
          motivo: {
            type: "string",
            description: "Justificación operativa auditada del cambio",
          },
        },
        required: ["tabla_destino", "operacion", "registro_id", "cambios", "motivo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "auditar_gobernanza_y_procedencia",
      description:
        "Audita la gobernanza operativa (Parte 2): responde las 7 preguntas de procedencia de decisiones ('provenance'), barre y cancela propuestas HITL expiradas o tareas vencidas ('sweep_expired'), o audita contradicciones epistémicas entre la memoria de IA y la base de datos ('memory_contradictions').",
      parameters: {
        type: "object",
        properties: {
          modo: {
            type: "string",
            enum: ["provenance", "sweep_expired", "memory_contradictions", "full_governance_audit"],
            description: "Tipo de auditoría de gobernanza a realizar",
          },
          decision_id: {
            type: "string",
            description: "ID opcional de la decisión a inspeccionar para trazabilidad de procedencia",
          },
        },
        required: ["modo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "gestionar_respaldo_continuidad",
      description:
        "Gestiona respaldos verificados criptográficamente con SHA-256 en disco ('create_backup') o restaura un respaldo verificado ('restore_backup', restringido a owner/admin) para garantizar continuidad de negocio.",
      parameters: {
        type: "object",
        properties: {
          operacion: {
            type: "string",
            enum: ["create_backup", "restore_backup"],
            description: "Operación de continuidad a ejecutar",
          },
          motivo: {
            type: "string",
            description: "Motivo del respaldo o restauración",
          },
          ruta_archivo_respaldo: {
            type: "string",
            description: "Ruta del archivo JSON de respaldo cuando operacion='restore_backup'",
          },
        },
        required: ["operacion"],
      },
    },
  },
];

import { checkToolAuthorization, type SecurityRole } from "../security/agentPermissionsMatrix";

export async function dispatchToolCall(
  name: string,
  rawArgs: any,
  context?: {
    companyId?: string;
    caseId?: string;
    agentRole?: SecurityRole;
    userRole?: string;
    caller?: string;
    isHumanCaller?: boolean;
    targetCompanyId?: string;
  },
): Promise<{
  result: any;
  isClosingAction: boolean;
  closingType?: "resuelto" | "escalado";
}> {
  let parsedArgs: any = {};
  try {
    parsedArgs = typeof rawArgs === "object" && rawArgs !== null ? rawArgs : JSON.parse(rawArgs || "{}");
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

  // Validación estricta en el backend: Principio de Mínimo Privilegio por Agente y RBAC por Rol de Usuario
  const callerRole: SecurityRole = context?.agentRole || (context?.isHumanCaller ? "human_user" : "orchestrator");
  const auth = await checkToolAuthorization(callerRole, name, {
    companyId: effectiveCompanyId,
    targetCompanyId: context?.targetCompanyId || parsedArgs.companyId || parsedArgs.empresa_id,
    caseId: context?.caseId,
    userRole: context?.userRole,
    toolName: name,
    isHumanCaller: context?.isHumanCaller,
  });

  if (!auth.allowed) {
    return {
      result: {
        isSuccess: false,
        verified: false,
        permissionDenied: true,
        code: auth.code,
        message: `ACCESO DENEGADO [Matriz de Permisos]: ${auth.reason}`,
      },
      isClosingAction: false,
    };
  }

  switch (name) {
    case "consultar_stock":
      return {
        result: await executeConsultarStock(parsedArgs, context),
        isClosingAction: false,
      };

    case "ver_ordenes_abiertas":
    case "ver_ordenes_compra_abiertas":
      return {
        result: await executeVerOrdenesAbiertas(parsedArgs, context),
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
    case "reportes_generales":
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
    case "analisis_financiero_inventario":
      return {
        result: await executeAnalisisFinanciero(parsedArgs, context),
        isClosingAction: false,
      };

    case "simular_escenario":
    case "simular_escenario_logistico":
      return {
        result: await executeSimularEscenario(parsedArgs, context),
        isClosingAction: false,
      };

    case "auditar_anomalias":
    case "auditar_anomalias_operativas":
      return {
        result: await executeAuditarAnomalias(parsedArgs, context),
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
          verified: Boolean(dispatchRes.success),
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
          verified: Boolean(recvRes.success),
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
          verified: true,
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
          verified: Boolean(updRes.success),
          ...updRes,
        },
        isClosingAction: false,
      };
    }

    case "enviar_notificacion_operativa": {
      const { evaluateOutboundNotificationPayload } = await import("../security/communicationPolicyGuard");
      const guardCheck = evaluateOutboundNotificationPayload({
        title: parsedArgs.titulo,
        message: parsedArgs.mensaje,
        severity: parsedArgs.severidad,
        companyId: effectiveCompanyId,
      });

      if (!guardCheck.isAllowed) {
        return {
          result: {
            isSuccess: false,
            verified: false,
            blockedBySecurityPolicy: true,
            mensaje: `[BLOQUEADO POR SEGURIDAD] ${guardCheck.rejectionReason}`,
          },
          isClosingAction: false,
        };
      }

      const { dispatchDecisionNotification, resolveActiveChannels } = await import("@mint/notifiers");
      const activeChans = await resolveActiveChannels(effectiveCompanyId);
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
      const targetCaseId = context?.caseId || "case_operativo";
      await db
        .insert(cases)
        .values({
          id: targetCaseId,
          companyId: effectiveCompanyId,
          status: "en_proceso",
          title: parsedArgs.titulo || "Notificación Operativa de Torre de Control",
          description: parsedArgs.mensaje || "Notificación operativa emitida por MINT",
        })
        .onConflictDoNothing();

      const opDecId = `op_${Date.now().toString(36)}`;
      await db
        .insert(decisions)
        .values({
          id: opDecId,
          companyId: effectiveCompanyId,
          caseId: targetCaseId,
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

      if (sentCount === 0) {
        const pendingLogId = `nlog_pend_${Date.now().toString(36)}`;
        await db
          .insert(notificationLog)
          .values({
            id: pendingLogId,
            companyId: effectiveCompanyId,
            decisionId: opDecId,
            severity: (parsedArgs.severidad || "INFO").toUpperCase(),
            status: "PENDING_RETRY",
            payload: {
              title: parsedArgs.titulo || "Reporte Operativo de Torre Logistica",
              message: parsedArgs.mensaje,
              failureErrors: errors,
              preservedAt: new Date().toISOString(),
            },
            createdAt: new Date(),
          })
          .catch(() => {});

        await db
          .insert(auditIncidents)
          .values({
            id: `inc_notif_${Date.now().toString(36)}`,
            companyId: effectiveCompanyId,
            incidentType: "FALLO_INTEGRACION_RECUPERADO",
            severity: "MEDIA",
            title: "Fallo de entrega en webhook de notificación; alerta preservada en cola pendiente",
            details: `No se pudo entregar la notificación '${parsedArgs.titulo || "Alerta"}'. Causas: ${errors.join("; ") || "Sin canales activos o webhook inválido"}. Preservada como '${pendingLogId}'.`,
            status: "EN_REVISION",
            detectedBy: "MINT_NOTIFICATION_RECOVERY",
            metadata: { decisionId: opDecId, pendingLogId, errors },
            createdAt: new Date(),
          })
          .catch(() => {});
      }

      return {
        result: {
          isSuccess: sentCount > 0,
          verified: sentCount > 0,
          canalesEnviados: sentCount,
          errores: errors,
          preservedAsPending: sentCount === 0,
          mensaje:
            sentCount > 0
              ? `[OK] Notificacion operativa entregada y verificada en ${sentCount} canal(es) activo(s).${
                  errors.length > 0 ? ` (Se recuperó usando canal alternativo tras fallo en: ${errors.join(", ")})` : ""
                }`
              : `[ENTREGA FALLIDA - PRESERVADA EN COLA] El webhook o canal configurado falló (${errors.join(", ") || "sin canal válido"}). MINT NO reporta envío exitoso; la notificación quedó preservada como pendiente de reintento en 'notification_log' y requiere revisar el webhook.`,
        },
        isClosingAction: false,
      };
    }

    case "consultar_canales_notificacion": {
      const { resolveActiveChannels } = await import("@mint/notifiers");
      const companyId = parsedArgs.empresa_id || effectiveCompanyId;
      const chans = await resolveActiveChannels(companyId);
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
            chatId: (c.config as any)?.chatId ? String((c.config as any).chatId) : undefined,
            webhookUrl: (c.config as any)?.webhookUrl ? `${(c.config as any).webhookUrl.slice(0, 35)}...` : undefined,
            temas: (c.config as any)?.topics || [],
          })),
          mensaje:
            chans.length > 0
              ? `Se encontraron ${chans.length} canal(es) de alerta configurado(s): ${chans.map((c) => `${c.type.toUpperCase()} ("${c.name}")`).join(", ")}.`
              : `No tienes canales de notificación remotos configurados actualmente en PostgreSQL ni en .env para esta empresa. Puedes vincular Discord o Telegram con '/channels' o desde la Desktop App.`,
        },
        isClosingAction: false,
      };
    }

    case "probar_canal_notificacion": {
      const { testNotificationChannel, resolveActiveChannels } = await import("@mint/notifiers");
      const chans = await resolveActiveChannels(effectiveCompanyId);
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

    case "consultar_memoria_obsidian": {
      const { searchObsidianMemory, getVaultStats } = await import("../services/obsidianMemoryService");
      const term = parsedArgs.termino_busqueda || "";
      const [matches, stats] = await Promise.all([
        searchObsidianMemory(term, effectiveCompanyId),
        getVaultStats(effectiveCompanyId).catch(() => null),
      ]);
      return {
        result: {
          isSuccess: true,
          termino: term,
          totalCoincidencias: matches.length,
          coincidencias: matches,
          bovedaObsidian: stats
            ? {
                totalNotas: stats.totalNotas,
                decisiones: stats.totalDecisiones,
                cuarentena: stats.totalCuarentena,
                preguntas: stats.totalPreguntas,
              }
            : undefined,
          mensaje:
            matches.length > 0
              ? `Se encontraron ${matches.length} notas en Obsidian para '${term}'.`
              : `No se encontraron notas en Obsidian para '${term}'.`,
        },
        isClosingAction: false,
      };
    }

    case "consultar_historial_decisiones": {
      const { desc, eq, and } = await import("drizzle-orm");
      const limit = Math.min(Math.max(Number(parsedArgs.limite) || 5, 1), 20);
      const estado = parsedArgs.estado || "todas";
      const conditions: any[] = [eq(decisions.companyId, effectiveCompanyId)];
      if (estado !== "todas") {
        conditions.push(eq(decisions.policyDecision, estado as any));
      }
      const history = await db
        .select({
          id: decisions.id,
          title: decisions.title,
          actionType: decisions.actionType,
          policyDecision: decisions.policyDecision,
          costMxn: decisions.costMxn,
          createdAt: decisions.createdAt,
          policyReason: decisions.policyReason,
        })
        .from(decisions)
        .where(and(...conditions))
        .orderBy(desc(decisions.createdAt))
        .limit(limit);

      return {
        result: {
          isSuccess: true,
          total: history.length,
          filtroEstado: estado,
          decisiones: history,
        },
        isClosingAction: false,
      };
    }

    case "inspeccionar_fuente_datos": {
      const targetPath = parsedArgs.ruta_archivo || parsedArgs.filePath || parsedArgs.path || "";
      const inspection = await inspectAndRecoverDataSource(targetPath, effectiveCompanyId);
      return {
        result: {
          isSuccess: inspection.isValidBusinessData,
          verified: true,
          ...inspection,
          message: inspection.isValidBusinessData
            ? `Archivo '${inspection.targetPath}' inspeccionado y validado como fuente de datos empresarial (${inspection.rowCountEstimate} registros detectados).`
            : `Inspección completada: '${inspection.targetPath}' NO es una base de datos de negocio válida (${inspection.rejectionReason}). No se importó nada.${
                inspection.discoveredAlternatives.length > 0
                  ? ` Se descubrieron ${inspection.discoveredAlternatives.length} fuente(s) alternativa(s) válida(s): ${inspection.discoveredAlternatives.map((a) => `${a.fileName} (${a.rowCountEstimate} filas)`).join(", ")}.`
                  : ""
              }`,
        },
        isClosingAction: false,
      };
    }

    case "importar_datos_negocio": {
      const targetPath = parsedArgs.ruta_archivo || parsedArgs.filePath || parsedArgs.path || "";
      const res = await importBusinessDataWithRecovery({
        filePath: targetPath,
        companyId: effectiveCompanyId,
        authorizedBy: context?.userRole || "AUTONOMOUS_AGENT",
        checkpointId: parsedArgs.checkpoint_id,
        simulateInterruptAfterRow: parsedArgs.simulateInterruptAfterRow,
        autoSwitchToAlternativeIfInvalid: Boolean(parsedArgs.usar_alternativa_si_invalido ?? parsedArgs.autoSwitchToAlternativeIfInvalid),
      });
      return {
        result: {
          isSuccess: res.success,
          verified: res.verificationPassed,
          ...res,
        },
        isClosingAction: false,
      };
    }

    case "diagnosticar_conexion_bd": {
      const targetUrl = parsedArgs.database_url || parsedArgs.url || "";
      if (targetUrl) {
        const diag = await testCustomConnection(targetUrl);
        return {
          result: {
            isSuccess: diag.success,
            verified: true,
            ...diag,
            message: diag.success
              ? `Conexión verificada exitosamente con la base de datos '${diag.database}' (${diag.latencyMs}ms).`
              : `Fallo al conectar a la base de datos solicitada (${diag.failureCategory}): ${diag.rootCause} ${diag.suggestedRecovery}`,
          },
          isClosingAction: false,
        };
      }
      const { checkDatabaseHealth } = await import("../db/client");
      const health = await checkDatabaseHealth();
      return {
        result: {
          isSuccess: health.connected,
          verified: health.connected,
          ...health,
          message: health.connected
            ? `Motor de base de datos activo y saludable: ${health.provider} (${health.tablesCount} tablas verificadas).`
            : `Problema detectado en base de datos: ${health.error}`,
        },
        isClosingAction: false,
      };
    }

    case "organizar_y_auditar_inventario": {
      const autoFix = parsedArgs.aplicar_correcciones_seguras !== false;
      const orgRes = await organizeAndAuditInventory(effectiveCompanyId, {
        autoFixSafeIssues: autoFix,
        authorizedBy: context?.userRole || "AUTONOMOUS_AGENT",
      });
      return {
        result: {
          isSuccess: orgRes.verificationPassed,
          verified: orgRes.verificationPassed,
          ...orgRes,
          message: `Auditoría y organización multi-paso completada sobre ${orgRes.totalProductsAudited} productos: ${orgRes.safeFixesApplied.categoriesNormalized} categorías normalizadas, ${orgRes.safeFixesApplied.missingWarehouseRowsCreated} registros de almacén inicializados, ${orgRes.issuesRequiringAttention.productsWithoutSupplierCount} productos sin proveedor detectados y ${orgRes.issuesRequiringAttention.duplicateProductNamesCount} posibles duplicados identificados.`,
        },
        isClosingAction: false,
      };
    }

    case "guardar_memoria_operativa": {
      const memRes = await saveOperationalMemory({
        companyId: effectiveCompanyId,
        category: parsedArgs.categoria || "CONTEXTO_OPERATIVO",
        subjectKey: parsedArgs.clave_tema || "REGLA_GENERAL",
        content: parsedArgs.contenido || "",
        author: context?.userRole || "ADMIN",
      });
      return {
        result: {
          isSuccess: memRes.success,
          verified: memRes.verifiedInDb,
          ...memRes,
          message: `Directiva operativa persistida y verificada en memoria del negocio [${memRes.subjectKey}]: "${memRes.content}"`,
        },
        isClosingAction: false,
      };
    }

    case "consultar_memoria_operativa": {
      const memories = await getActiveOperationalMemory(effectiveCompanyId);
      return {
        result: {
          isSuccess: true,
          verified: true,
          totalDirectivasActivas: memories.length,
          directivas: memories,
          message:
            memories.length > 0
              ? `Se recuperaron ${memories.length} directivas operativas activas de la empresa.`
              : `No hay directivas operativas personalizadas registradas aún para esta empresa.`,
        },
        isClosingAction: false,
      };
    }

    case "gestionar_checkpoint_tarea": {
      const onlyIncomplete = Boolean(parsedArgs.solo_incompletas);
      const checkpoints = await getTaskCheckpoints(effectiveCompanyId, onlyIncomplete);
      return {
        result: {
          isSuccess: true,
          verified: true,
          totalTareas: checkpoints.length,
          tareas: checkpoints,
          message:
            checkpoints.length > 0
              ? `Se encontraron ${checkpoints.length} tarea(s) registrada(s) en checkpoints operativos.`
              : `No hay tareas pendientes o interrumpidas en este momento.`,
        },
        isClosingAction: false,
      };
    }

    case "verificar_capacidades_sistema": {
      const caps = await verifySystemCapabilities(effectiveCompanyId, context?.userRole || "owner");
      return {
        result: {
          isSuccess: true,
          verified: true,
          ...caps,
          message: `Capacidades verificadas: BD=${caps.database.provider}, Canales activos=${caps.notifications.activeChannels.length}, GPS en vivo=${caps.telemetryAndGps.liveGpsProviderConnected ? "Conectado" : "No conectado"}.`,
        },
        isClosingAction: false,
      };
    }

    case "explorar_entorno_archivos": {
      const exploration = await exploreWorkspaceEnvironment(parsedArgs.ruta_directorio_o_archivo);
      return {
        result: exploration,
        isClosingAction: false,
      };
    }

    case "consultar_esquema_y_datos_bd": {
      const queryRes = await introspectAndQueryDatabase(effectiveCompanyId, {
        mode: parsedArgs.modo || (parsedArgs.consulta_sql ? "query" : "schema"),
        sqlQuery: parsedArgs.consulta_sql,
        tableFilter: parsedArgs.filtro_tabla,
      });
      return {
        result: queryRes,
        isClosingAction: false,
      };
    }

    case "ejecutar_operacion_datos_autorizada": {
      const mutRes = await executeAuthorizedDataMutation(effectiveCompanyId, {
        userRole: context?.userRole || "operator",
        authorizedBy: context?.userRole || "operator",
        targetTable: parsedArgs.tabla_destino,
        operation: parsedArgs.operacion || "update",
        recordId: String(parsedArgs.registro_id || ""),
        updates: parsedArgs.cambios || {},
        reason: String(parsedArgs.motivo || "Actualización operativa autorizada"),
      });
      return {
        result: mutRes,
        isClosingAction: false,
      };
    }

    case "auditar_gobernanza_y_procedencia": {
      const mode = parsedArgs.modo || "full_governance_audit";
      const provenance =
        mode === "provenance" || mode === "full_governance_audit"
          ? await getActionProvenanceReport(effectiveCompanyId, parsedArgs.decision_id)
          : null;
      const sweep =
        mode === "sweep_expired" || mode === "full_governance_audit"
          ? await sweepExpiredProposalsAndOverdueTasks(effectiveCompanyId)
          : null;
      const epistemic =
        mode === "memory_contradictions" || mode === "full_governance_audit"
          ? await getOperationalMemoryWithEpistemicAudit(effectiveCompanyId)
          : null;
      return {
        result: {
          isSuccess: true,
          verified: true,
          mode,
          provenance,
          sweep,
          epistemic,
          message: `Auditoría de gobernanza completada (${mode}).`,
        },
        isClosingAction: false,
      };
    }

    case "gestionar_respaldo_continuidad": {
      const op = parsedArgs.operacion || "create_backup";
      if (op === "restore_backup") {
        const restRes = await restoreVerifiedBusinessBackup({
          companyId: effectiveCompanyId,
          backupFilePath: String(parsedArgs.ruta_archivo_respaldo || ""),
          userRole: context?.userRole || "operator",
        });
        return {
          result: {
            isSuccess: restRes.success,
            ...restRes,
          },
          isClosingAction: false,
        };
      }
      const bkp = await createVerifiedBusinessBackup(
        effectiveCompanyId,
        parsedArgs.motivo || "Respaldo solicitado por agente autónomo",
      );
      return {
        result: {
          isSuccess: bkp.verifiedOnDisk,
          verified: bkp.verifiedOnDisk,
          ...bkp,
        },
        isClosingAction: false,
      };
    }

    case "eliminar_registro": {
      return {
        result: {
          isSuccess: false,
          verified: false,
          requiresHumanConfirmation: true,
          message:
            "SALVAGUARDA CONTRA OPERACIONES DESTRUCTIVAS: La eliminación masiva o borrado de registros de negocio está protegida y no puede ejecutarse sin confirmación explícita firmada por el propietario (owner). Los datos permanecen intactos.",
        },
        isClosingAction: false,
      };
    }

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
