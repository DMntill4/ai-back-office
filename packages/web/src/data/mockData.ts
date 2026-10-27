import { WorkflowObjective, AgentTool, NodeData, LogStep, HitlDecision } from "../types/workflow";

export const INITIAL_HITL_DECISIONS: HitlDecision[] = [
  {
    id: "dec_7f93a1c8",
    caseId: "case_99182_a",
    title: "Reabastecimiento preventivo: 9u Martillo Demoledor SDS-Max",
    productName: "Martillo Demoledor SDS-Max 1500W",
    sku: "SKU-MAN-SM400",
    quantity: 9,
    unitPriceCop: 420000,
    totalCostCop: 3780000,
    supplierName: "Ferreterías Unidas Bogotá",
    supplierCity: "Bogotá D.C.",
    leadTimeDays: 2,
    currentStock: 3,
    ropThreshold: 12,
    riskScore: 0.12,
    redFlags: [],
    status: "pendiente",
    policyDecision: "pending_approval",
    policyReason: "Propuesta de compra formulada por $3,780,000 COP en modo asistido. Escalada a /inbox para autorización del operador.",
    hmacSignature: "hmac_sha256_9f81a7b640192e",
    createdAt: "Hoy, 10:14",
  },
  {
    id: "dec_4b82d9e1",
    caseId: "case_99170_z",
    title: "Adquisición de Lote: 50u Sierra Circular 7-1/4' 1800W",
    productName: "Sierra Circular Industrial 1800W",
    sku: "SKU-SIE-IND18",
    quantity: 50,
    unitPriceCop: 145000,
    totalCostCop: 7250000,
    supplierName: "Distribuciones Industriales de Santander",
    supplierCity: "Bucaramanga",
    leadTimeDays: 1,
    currentStock: 5,
    ropThreshold: 20,
    riskScore: 0.28,
    redFlags: ["Monto excede el umbral autónomo de $5,000,000 COP"],
    status: "pendiente",
    policyDecision: "pending_approval",
    policyReason: "El monto ($7,250,000 COP) excede el umbral de autonomía autorizado de $5,000,000 COP. Exige firma explícita del director de compras.",
    hmacSignature: "hmac_sha256_31a89c02ff1e92",
    createdAt: "Hoy, 08:30",
  },
];

export const PREDEFINED_OBJECTIVES: WorkflowObjective[] = [
  {
    id: "obj_rop_audit",
    title: "Auditoría de Quiebres y Cálculo ROP",
    badge: "INVENTARIO",
    description: "Monitoreo continuo de stock real contra burn rate histórico y detección de alertas ROP dinámicas.",
    recommendedModel: "grok-beta",
    defaultMaxIterations: 6,
    activeTools: ["tool_db_lookup", "tool_demand_forecast", "tool_anomaly_audit"],
    systemGoal: "Auditar existencias en PostgreSQL, calcular días de cobertura y emitir alertas tempranas de desabasto sin ejecutar compras.",
  },
  {
    id: "obj_supplier_quote",
    title: "Abastecimiento y Comparativa de Proveedores",
    badge: "COMPRAS",
    description: "Cotiza automáticamente con proveedores homologados y evalúa menor costo vs. tiempo de entrega.",
    recommendedModel: "grok-4.6",
    defaultMaxIterations: 8,
    activeTools: ["tool_db_lookup", "tool_supplier_quote", "tool_landed_cost", "tool_purchase_order"],
    systemGoal: "Buscar la mejor cotización para faltantes, calcular Landed Cost y formular propuesta de compra en la bandeja /inbox.",
  },
  {
    id: "obj_cross_docking",
    title: "Torre Logística y Rebalanceo Inter-Sedes",
    badge: "LOGÍSTICA",
    description: "Evalúa transferencias inter-almacén (Bucaramanga, Bogotá, Medellín) con rutas OSRM para evitar compras externas.",
    recommendedModel: "grok-beta",
    defaultMaxIterations: 10,
    activeTools: ["tool_db_lookup", "tool_landed_cost", "tool_shipments"],
    systemGoal: "Priorizar transferencias entre sedes con sobrestock antes de comprometer capital con proveedores externos.",
  },
  {
    id: "obj_hitl_guardian",
    title: "Guardián Presupuestal y Gatekeeper HITL",
    badge: "GOBERNANZA",
    description: "Inspección matemática determinista sobre órdenes de compra: bloqueo de duplicados 72h y tope de $5,000,000 COP.",
    recommendedModel: "grok-4.6",
    defaultMaxIterations: 5,
    activeTools: ["tool_db_lookup", "tool_purchase_order", "tool_anomaly_audit"],
    systemGoal: "Garantizar estricto cumplimiento del Motor de Políticas: 0 compras unilaterales por encima de $5,000,000 COP.",
  },
];

export const INITIAL_TOOLS: AgentTool[] = [
  {
    id: "tool_db_lookup",
    number: 1,
    name: "PostgreSQL Stock & Catalog Lookup",
    category: "database",
    description: "Consulta stock físico real, SKUs y umbrales mínimos en la base de datos.",
    isActive: true,
  },
  {
    id: "tool_demand_forecast",
    number: 2,
    name: "Demanda Histórica & Días Cobertura",
    category: "analytics",
    description: "Proyecta consumo diario y semanas de stock basándose en sales_history.",
    isActive: true,
  },
  {
    id: "tool_supplier_quote",
    number: 3,
    name: "Comparador de Catálogo de Proveedores",
    category: "logistics",
    description: "Compara cotizaciones de proveedores homologados en COP con lead times.",
    isActive: true,
  },
  {
    id: "tool_landed_cost",
    number: 4,
    name: "Calculadora de Flete OSRM & Landed Cost",
    category: "logistics",
    description: "Calcula distancias viales en km y costo de acarreo hacia las bodegas.",
    isActive: true,
  },
  {
    id: "tool_purchase_order",
    number: 5,
    name: "Gatekeeper de Compras (evaluatePolicy)",
    category: "governance",
    description: "Formula órdenes con idempotencia y deriva a /inbox si excede $5,000,000 COP.",
    isActive: true,
  },
  {
    id: "tool_anomaly_audit",
    number: 6,
    name: "Auditor de Anomalías y Descalces",
    category: "analytics",
    description: "Detecta inconsistencias físicas vs lógicas y sobrecostos atípicos.",
    isActive: false,
  },
];

export const INITIAL_NODES: NodeData[] = [
  {
    id: "node_trigger_db",
    type: "trigger",
    label: "Base de Datos PostgreSQL",
    sublabel: "Ferretería Industrial Santandereana",
    status: "success",
    x: 60,
    y: 190,
    width: 250,
    properties: {
      dbHost: "localhost:5432",
      dbDatabase: "ai_back_office",
      connectedTables: 15,
      lastSynced: "Hace 4 minutos",
      description: "Fuente relacional verificada con catálogo de herramientas industriales, bodegas e historial de ventas.",
    },
  },
  {
    id: "node_main_agent",
    type: "agent",
    label: "AI Agent",
    sublabel: "AI orchestration node",
    status: "running",
    x: 390,
    y: 80,
    width: 320,
    tools: INITIAL_TOOLS.slice(0, 4),
    properties: {
      nodeName: "Mint Autonomous Agent",
      description: "Agente autónomo multi-especialista encargado de auditar ROP, negociar con proveedores y supervisar la cadena de suministro.",
      model: "grok-4.6",
      maxIterations: 10,
      memoryLimit: "50k tokens",
      objectiveId: "obj_rop_audit",
      approvalThresholdCop: 5000000,
    },
  },
  {
    id: "node_action_po",
    type: "action",
    label: "Crear Orden de Compra",
    sublabel: "HITL Gatekeeper (≤ $5,000,000 COP)",
    status: "idle",
    x: 800,
    y: 40,
    width: 240,
    properties: {
      description: "Genera comprobante con firma HMAC y encola la orden con estado 'pendiente' si excede el umbral.",
    },
  },
  {
    id: "node_action_hitl",
    type: "action",
    label: "Notificar Operador (HITL)",
    sublabel: "Bandeja de Decisiones /inbox",
    status: "idle",
    x: 800,
    y: 160,
    width: 240,
    properties: {
      description: "Envía alerta en tiempo real a Discord/Telegram/Consola para autorización con 1 clic.",
    },
  },
  {
    id: "node_action_report",
    type: "action",
    label: "Generar Reporte Ejecutivo",
    sublabel: "Auditoría de Stock & Fletes",
    status: "idle",
    x: 800,
    y: 280,
    width: 240,
    properties: {
      description: "Consolida análisis financiero en COP y genera resumen de existencias.",
    },
  },
];

export const INITIAL_LOG_STEPS: LogStep[] = [
  {
    id: "step_1",
    nodeKey: "TRIGGER",
    label: "TRIGGER",
    status: "success",
    timestamp: "10:14:02",
    payload: {
      event: "DATA_SYNC_HEARTBEAT",
      source: "PostgreSQL: ai_back_office",
      recordsScanned: 154,
      criticalSkus: 2,
      stalenessHours: 0.1,
    },
  },
  {
    id: "step_2",
    nodeKey: "AI_AGENT",
    label: "AI AGENT",
    status: "success",
    timestamp: "10:14:05",
    payload: {
      agent: "Mint Coordinator",
      specialistsInvoked: ["inventario", "compras", "riesgo"],
      targetSku: "SKU-MAN-SM400",
      productName: "Martillo Demoledor SDS-Max 1500W",
      stockActual: 3,
      ropCalculado: 12,
      deficit: 9,
      recommendedSupplier: "prov_herramientas_bogota",
      cotizacionUnitCop: 420000,
      totalPropuestaCop: 3780000,
      policyEvaluation: "PENDING_APPROVAL_HITL",
    },
  },
  {
    id: "step_3",
    nodeKey: "NOTIFY_ADMIN",
    label: "NOTIFY ADMIN",
    status: "running",
    timestamp: "10:14:08",
    payload: {
      processingNode: "Notify Operator / HITL Inbox",
      decisionId: "dec_7f93a1c8",
      actionType: "crear_orden_compra",
      costoTotal: "$3,780,000 COP",
      riskScore: 0.12,
      redFlags: [],
      reason: "Propuesta de compra formulada por $3,780,000 COP. Encolada en /inbox para autorización del operador.",
      channelsDispatched: ["Discord (#alertas-operativas)", "Consola Web"],
      waitingOperatorSignature: true,
    },
  },
];

// --- SEED DATA: BÓVEDA DE MEMORIA OBSIDIAN (mint memory) ---
export const INITIAL_VAULT_NOTES: import("../types/workflow").VaultNote[] = [
  {
    id: "note_emp_001",
    filename: "00-Empresa/perfil-ferreteria-santandereana.md",
    folder: "00-Empresa",
    title: "Perfil: Ferretería Industrial Santandereana S.A.S.",
    estado: "vigente",
    confianza: 0.98,
    evidencias_count: 12,
    origen: "PostgreSQL: companies[comp_santander_01]",
    tags: ["#empresa", "#operaciones", "#colombia", "#sede_matriz"],
    wikilinks: ["[[03-Logistica/bodega-matriz-bucaramanga]]", "[[04-Politicas/guardrail-presupuestal-hitl]]"],
    content: `# Ferretería Industrial Santandereana S.A.S.

Distribuidor mayorista de suministros industriales, consumibles de corte y maquinaria pesada en Santander y el nororiente colombiano.

## Parámetros Operacionales
- **NIT:** 900.582.114-8
- **Sede Matriz:** Bucaramanga, Chimitá ([[03-Logistica/bodega-matriz-bucaramanga]])
- **Moneda Base:** COP (Pesos Colombianos)
- **Política de Autonomía:** Aprobación asistida obligatoria por encima de $5,000,000 COP ([[04-Politicas/guardrail-presupuestal-hitl]]).`,
    updatedAt: "Hoy, 11:20",
  },
  {
    id: "note_prov_002",
    filename: "01-Proveedores/ferreterias-unidas-bogota.md",
    folder: "01-Proveedores",
    title: "Proveedor: Ferreterías Unidas Bogotá",
    estado: "vigente",
    confianza: 0.94,
    evidencias_count: 8,
    origen: "PostgreSQL: suppliers[supp_ferr_bog]",
    tags: ["#proveedores", "#bogota", "#homologado", "#lead_time"],
    wikilinks: ["[[02-Productos/sku-disco-diamantado-7]]", "[[05-Decisiones/po-2026-0089]]"],
    content: `# Ferreterías Unidas Bogotá

Proveedor mayorista homologado para consumibles de corte y herramientas industriales.

## Desempeño y Términos
- **Lead Time Verificado:** 3 días hábiles Bogotá -> Bucaramanga.
- **Rating de Cumplimiento:** 4.8 / 5.0 estrellas.
- **Línea de Crédito:** 30 días neto.
- **Productos Suministrados:** [[02-Productos/sku-disco-diamantado-7]] y pulidoras Bosch.`,
    updatedAt: "Hoy, 09:15",
  },
  {
    id: "note_prod_003",
    filename: "02-Productos/sku-disco-diamantado-7.md",
    folder: "02-Productos",
    title: "SKU-COR-DISC7: Disco Diamantado 7' Corte Concreto",
    estado: "vigente",
    confianza: 0.96,
    evidencias_count: 14,
    origen: "PostgreSQL: products[prod_disc7_01]",
    tags: ["#inventario", "#quiebre_stock", "#alta_rotacion"],
    wikilinks: ["[[01-Proveedores/ferreterias-unidas-bogota]]", "[[05-Decisiones/po-2026-0089]]"],
    content: `# SKU-COR-DISC7: Disco Diamantado 7'

Consumible crítico de corte para obras civiles y construcción pesada.

## Métricas de Control
- **Stock Mínimo (ROP):** 25 unidades
- **Stock de Seguridad:** 10 unidades
- **Consumo Diario:** 2.1 unidades/día
- **Costo Unitario Homologado:** $45,000 COP
- **Alerta Activa:** Stock actual de 8 unidades se encuentra por debajo del ROP (días de cobertura: 3.8 días). Requiere reposición inmediata ([[05-Decisiones/po-2026-0089]]).`,
    updatedAt: "Hoy, 10:14",
  },
  {
    id: "note_hip_004",
    filename: "07-Hipotesis/flete-consolidado-ahorro-15pct.md",
    folder: "07-Hipotesis",
    title: "Hipótesis: Consolidación de Despachos Bogotá-Bucaramanga ahorra 15%",
    estado: "hipotesis",
    confianza: 0.65,
    evidencias_count: 2,
    origen: "Análisis Harness: Agente de Transporte OSRM",
    tags: ["#hipotesis", "#logistica", "#ahorro", "#fletes"],
    wikilinks: ["[[01-Proveedores/ferreterias-unidas-bogota]]", "[[08-Metas/meta-ahorro-15m-cop]]"],
    content: `# Hipótesis: Ahorro por Flete Consolidado

Si agrupamos las compras semanales de consumibles de corte en un solo despacho por camión consolidado los días jueves, el costo logístico por unidad se reduce en un 15.2% frente a envíos fraccionados.

## Evidencias Registradas (2 de 3 requeridas para promoción):
1. Envío #SH-8841 con despacho consolidado registró costo de $18,000 COP/kg vs $21,500 COP/kg estándar.
2. Factura de transporte OSRM Vía Pescadero del 18-Oct confirmó tarifa preferencial por volumen > 500kg.
*Falta 1 evidencia adicional para promover a 'vigente'.*`,
    updatedAt: "Ayer, 16:40",
  },
  {
    id: "note_cont_005",
    filename: "01-Proveedores/aceros-antioquia-descuento.md",
    folder: "01-Proveedores",
    title: "Discrepancia: Descuento Comercial Aceros de Antioquia",
    estado: "contradicha",
    confianza: 0.40,
    evidencias_count: 4,
    origen: "Auditoría Automática Vault vs PostgreSQL",
    tags: ["#contradicha", "#proveedores", "#discrepancia"],
    wikilinks: ["[[01-Proveedores/aceros-antioquia]]"],
    content: `# Discrepancia Detectada

La memoria en el vault afirmaba que el proveedor otorgaba un 12% de descuento por pronto pago a 15 días.

## Contradicción contra la Base de Datos:
- **Afirmación en Nota:** 12% descuento pronto pago.
- **Realidad en PostgreSQL (suppliers):** La cotización activa registra 5% a 30 días, sin cláusula de pronto pago.
- **Acción Mint:** Nota marcada como 'contradicha'. La base de datos prevalece determinísticamente.`,
    updatedAt: "Ayer, 11:22",
    hasContradiction: true,
    contradictionDetails: {
      noteValue: "Descuento comercial del 12% pronto pago",
      dbValue: "Condición contractual real en BD: 5% a 30 días",
    },
  },
  {
    id: "note_dec_006",
    filename: "05-Decisiones/po-2026-0089.md",
    folder: "05-Decisiones",
    title: "Decisión PO-2026-0089: Reabastecimiento 30u SKU-COR-DISC7",
    estado: "vigente",
    confianza: 0.99,
    evidencias_count: 6,
    origen: "PostgreSQL: decisions[dec_po_2026_0089]",
    tags: ["#decision", "#orden_compra", "#hitl_aprobada"],
    wikilinks: ["[[02-Productos/sku-disco-diamantado-7]]", "[[01-Proveedores/ferreterias-unidas-bogota]]"],
    content: `# Decisión PO-2026-0089

Orden de compra formulada por Mint para prevenir el desabasto del Disco Diamantado 7' en Bodega Matriz.

- **Monto Total:** $1,350,000 COP
- **Proveedor:** [[01-Proveedores/ferreterias-unidas-bogota]]
- **SKU:** [[02-Productos/sku-disco-diamantado-7]] (30 unidades)
- **Estado HITL:** Autorizado con firma HMAC-SHA256 por el operador.`,
    updatedAt: "Hoy, 10:18",
  },
];

// --- SEED DATA: INVENTARIO & BODEGAS (mint stock) ---
export const INITIAL_STOCK_SKUS: import("../types/workflow").StockSkuItem[] = [
  {
    id: "stk_disc7",
    sku: "SKU-COR-DISC7",
    name: "Disco Diamantado 7' Concreto",
    category: "Consumibles de Corte",
    warehouseId: "wh_bga",
    warehouseName: "Bodega Matriz Bucaramanga",
    currentStock: 8,
    minStock: 25,
    safetyStock: 10,
    dailyBurnRate: 2.1,
    coverageDays: 3.8,
    unitPriceCop: 45000,
    ropThreshold: 25,
    status: "quiebre",
  },
  {
    id: "stk_sm400",
    sku: "SKU-MAN-SM400",
    name: "Martillo Demoledor SDS-Max 1500W",
    category: "Maquinaria Pesada",
    warehouseId: "wh_bga",
    warehouseName: "Bodega Matriz Bucaramanga",
    currentStock: 3,
    minStock: 12,
    safetyStock: 5,
    dailyBurnRate: 0.8,
    coverageDays: 3.7,
    unitPriceCop: 1560000,
    ropThreshold: 12,
    status: "alerta",
  },
  {
    id: "stk_imp20",
    sku: "SKU-TAL-IMP20",
    name: "Taladro de Impacto Inalámbrico 20V",
    category: "Herramientas Eléctricas",
    warehouseId: "wh_bog",
    warehouseName: "CD Bogotá D.C.",
    currentStock: 45,
    minStock: 15,
    safetyStock: 8,
    dailyBurnRate: 1.2,
    coverageDays: 37.5,
    unitPriceCop: 420000,
    ropThreshold: 15,
    status: "optimo",
  },
  {
    id: "stk_cas300",
    sku: "SKU-SEG-CAS300",
    name: "Casco de Seguridad Industrial Tipo II",
    category: "Protección Personal (EPP)",
    warehouseId: "wh_med",
    warehouseName: "CD Medellín",
    currentStock: 60,
    minStock: 30,
    safetyStock: 15,
    dailyBurnRate: 1.5,
    coverageDays: 40.0,
    unitPriceCop: 38000,
    ropThreshold: 30,
    status: "optimo",
  },
  {
    id: "stk_sie18",
    sku: "SKU-SIE-IND18",
    name: "Sierra Circular Industrial 1800W",
    category: "Herramientas Eléctricas",
    warehouseId: "wh_bga",
    warehouseName: "Bodega Matriz Bucaramanga",
    currentStock: 5,
    minStock: 20,
    safetyStock: 8,
    dailyBurnRate: 1.4,
    coverageDays: 3.5,
    unitPriceCop: 145000,
    ropThreshold: 20,
    status: "alerta",
  },
];

// --- SEED DATA: PALANCAS DE METAS ESTRATÉGICAS (mint goal) ---
export const INITIAL_GOAL_LEVERS: import("../types/workflow").GoalLever[] = [
  {
    id: "lever_reneg",
    title: "Renegociación por Volumen con Proveedores Homologados",
    description: "Descuento escalonado del 6.8% en compras semestrales consolidadas de discos diamantados y pulidoras con Ferreterías Unidas Bogotá.",
    potentialSavingsCop: 7850000,
    leverType: "renegociacion_volumen",
    active: true,
    impactLabel: "Ahorro directo en coste unitario",
  },
  {
    id: "lever_cobertura",
    title: "Optimización de Cobertura de Stock (45d -> 30d)",
    description: "Liberación de capital de trabajo reduciendo inventario ocioso en maquinaria de baja rotación en CD Medellín y CD Bogotá.",
    potentialSavingsCop: 5200000,
    leverType: "cobertura_stock",
    active: true,
    impactLabel: "Liberación de flujo de caja",
  },
  {
    id: "lever_fletes",
    title: "Consolidación de Despachos Vía OSRM Pescadero",
    description: "Unificación de pedidos semanales en un solo camión consolidado los días jueves en el corredor Bogotá -> Bucaramanga.",
    potentialSavingsCop: 2800000,
    leverType: "consolidacion_fletes",
    active: false,
    impactLabel: "Reducción de flete por kilogramo",
  },
];

// --- SEED DATA: DIAGNÓSTICO DEL SISTEMA (mint doctor) ---
export const INITIAL_DOCTOR_CHECKS: import("../types/workflow").DoctorCheckItem[] = [
  {
    id: "chk_db",
    category: "database",
    label: "Base de Datos PostgreSQL (Drizzle ORM)",
    status: "ok",
    details: "Conexión activa a ai_back_office. 15 tablas sincronizadas, latencia de 18ms.",
    latencyMs: 18,
  },
  {
    id: "chk_llm",
    category: "llm",
    label: "Motor Cognitivo Grok-4.6 (api.reto.pltk.mx)",
    status: "ok",
    details: "Autenticado con clave RETO_KEY. Respuesta en streaming disponible.",
    latencyMs: 142,
  },
  {
    id: "chk_vault",
    category: "vault",
    label: "Integridad del Vault de Memoria Obsidian",
    status: "ok",
    details: "Directorio ~/.mint/vaults/ santander verificado. 10 carpetas base, lock liberado, 0 corrupción.",
  },
  {
    id: "chk_daemon",
    category: "daemon",
    label: "Daemon Supervisor en Segundo Plano",
    status: "ok",
    details: "Proceso vigilante activo con fs.watch. Interruptor de emergencia operativo.",
  },
  {
    id: "chk_channels",
    category: "channels",
    label: "Canales Remotos (Telegram & Slack)",
    status: "ok",
    details: "Tokens HMAC-SHA256 de un solo uso configurados para aprobación remota.",
  },
  {
    id: "chk_gov",
    category: "governance",
    label: "Guardrail Financiero HITL ($5,000,000 COP)",
    status: "ok",
    details: "Motor de políticas determinista activo. Regla de duplicidad 72h habilitada.",
  },
];
