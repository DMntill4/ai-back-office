import {
  MintGraphData,
  MintGraphNode,
  MintGraphEdge,
  GraphFilters,
  MintNodeType,
  MintRelationType,
} from "../types/graph";

/**
 * Grafo Operativo Base de Mint para Ferretería Industrial Santandereana S.A.S.
 * Cada nodo y arista representa entidades y relaciones reales del sistema logístico.
 */
export const RAW_MINT_NODES: MintGraphNode[] = [
  // 1. Núcleo de Datos
  {
    id: "db_postgres",
    type: "database",
    label: "PostgreSQL: ai_back_office",
    sublabel: "Base de Datos Relacional",
    status: "active",
    metadata: {
      host: "localhost:5432",
      database: "ai_back_office",
      tables: ["products", "suppliers", "warehouses", "decisions", "cases", "purchase_orders"],
      lastSynced: "Hace 2 minutos",
      engine: "PostgreSQL 16 Alpine",
    },
  },

  // 2. Agente Autónomo Coordinador
  {
    id: "agent_coordinator",
    type: "agent",
    label: "Mint Autonomous Agent",
    sublabel: "Director Operativo ReAct",
    status: "running",
    metadata: {
      role: "Orquestador de Abastecimiento & HITL",
      model: "grok-4.6 (ReAct + Reflection)",
      autonomyLimitCop: 5000000,
      activeExecutionId: "exec_rop_santander_9942",
      promptVersion: "coordinator-v3.1",
    },
  },

  // 3. Herramientas Especializadas
  {
    id: "tool_stock",
    type: "tool",
    label: "consultar_stock",
    sublabel: "Auditoría de inventario físico",
    status: "active",
    metadata: {
      category: "database",
      avgLatencyMs: 42,
      lastExecuted: "11:14:02",
      permission: "READ_ONLY",
    },
  },
  {
    id: "tool_forecast",
    type: "tool",
    label: "pronosticar_demanda",
    sublabel: "Cálculo de ROP & Burn Rate",
    status: "active",
    metadata: {
      category: "analytics",
      algorithm: "Media Móvil Ponderada 60d",
      avgLatencyMs: 85,
    },
  },
  {
    id: "tool_suppliers",
    type: "tool",
    label: "evaluar_proveedores",
    sublabel: "Comparador multicriterio COP",
    status: "active",
    metadata: {
      category: "logistics",
      criteria: ["Precio unitario", "Lead time en días", "Riesgo crediticio"],
      avgLatencyMs: 120,
    },
  },
  {
    id: "tool_logistics",
    type: "tool",
    label: "calcular_ruta_logistica",
    sublabel: "Cartografía vial OSRM & fletes",
    status: "active",
    metadata: {
      category: "logistics",
      routingEngine: "OSRM Colombia Peajes",
      avgLatencyMs: 190,
    },
  },
  {
    id: "tool_po",
    type: "tool",
    label: "crear_orden_compra",
    sublabel: "Generador de borradores PO",
    status: "active",
    metadata: {
      category: "governance",
      requiresHitlAboveCop: 5000000,
      policyCheck: "evaluatePolicy()",
    },
  },
  {
    id: "tool_audit",
    type: "tool",
    label: "auditar_anomalias",
    sublabel: "Detección de sobrecostos",
    status: "active",
    metadata: {
      category: "governance",
      riskThreshold: 0.65,
    },
  },

  // 4. Bodegas Físicas
  {
    id: "wh_bga",
    type: "warehouse",
    label: "Bodega Matriz Bucaramanga",
    sublabel: "Zona Industrial Chimitá • 1.200 m³",
    status: "active",
    metadata: {
      city: "Bucaramanga, Santander",
      address: "Km 4 Vía Palenque",
      capacityM3: 1200,
      stockUtilization: "78%",
      contact: "operaciones.bga@santandereana.com",
    },
  },
  {
    id: "wh_bog",
    type: "warehouse",
    label: "CD Bogotá D.C.",
    sublabel: "Fontibón Parque Logístico • 3.500 m³",
    status: "active",
    metadata: {
      city: "Bogotá D.C.",
      capacityM3: 3500,
      stockUtilization: "64%",
    },
  },
  {
    id: "wh_med",
    type: "warehouse",
    label: "CD Medellín",
    sublabel: "Itagüí Hub Sur • 2.200 m³",
    status: "active",
    metadata: {
      city: "Itagüí, Antioquia",
      capacityM3: 2200,
      stockUtilization: "82%",
    },
  },

  // 5. Proveedores Homologados
  {
    id: "supp_ferr_bog",
    type: "supplier",
    label: "Ferreterías Unidas Bogotá",
    sublabel: "Distribuidor Mayorista • Bogotá",
    status: "active",
    metadata: {
      nit: "900.452.118-4",
      city: "Bogotá",
      rating: 4.8,
      leadTimeDays: 3,
      reliabilityScore: 0.94,
    },
  },
  {
    id: "supp_dist_san",
    type: "supplier",
    label: "Distribuidora Industrial Santander",
    sublabel: "Suministros Locales • Bucaramanga",
    status: "active",
    metadata: {
      nit: "890.201.334-1",
      city: "Bucaramanga",
      rating: 4.9,
      leadTimeDays: 1,
      reliabilityScore: 0.98,
    },
  },
  {
    id: "supp_herram_ant",
    type: "supplier",
    label: "Herramientas y Aceros de Antioquia",
    sublabel: "Importador Directo • Medellín",
    status: "active",
    metadata: {
      nit: "800.771.092-9",
      city: "Medellín",
      rating: 4.5,
      leadTimeDays: 4,
      reliabilityScore: 0.89,
    },
  },

  // 6. SKUs de Ferretería Industrial
  {
    id: "sku_sm400",
    type: "sku",
    label: "SKU-MAN-SM400",
    sublabel: "Martillo Demoledor SDS-Max 1500W",
    status: "warning",
    metadata: {
      name: "Martillo Demoledor SDS-Max 1500W",
      currentStock: 3,
      minStock: 12,
      safetyStock: 5,
      dailyBurnRate: 0.8,
      stockoutDaysLeft: 3.7,
      unitPriceCop: 1560000,
      category: "Maquinaria Pesada",
      unit: "Unidades",
    },
  },
  {
    id: "sku_disc7",
    type: "sku",
    label: "SKU-COR-DISC7",
    sublabel: "Disco Diamantado 7' Corte Concreto",
    status: "warning",
    metadata: {
      name: "Disco Diamantado 7' Corte Concreto",
      currentStock: 8,
      minStock: 25,
      safetyStock: 10,
      dailyBurnRate: 2.1,
      stockoutDaysLeft: 3.8,
      unitPriceCop: 45000,
      category: "Consumibles de Corte",
    },
  },
  {
    id: "sku_imp20",
    type: "sku",
    label: "SKU-TAL-IMP20",
    sublabel: "Taladro de Impacto Inalámbrico 20V",
    status: "active",
    metadata: {
      name: "Taladro de Impacto Inalámbrico 20V",
      currentStock: 45,
      minStock: 15,
      safetyStock: 8,
      dailyBurnRate: 1.2,
      stockoutDaysLeft: 37.5,
      unitPriceCop: 420000,
      category: "Herramientas Eléctricas",
    },
  },
  {
    id: "sku_cas300",
    type: "sku",
    label: "SKU-SEG-CAS300",
    sublabel: "Casco de Seguridad Industrial Tipo II",
    status: "active",
    metadata: {
      name: "Casco de Seguridad Industrial Tipo II",
      currentStock: 60,
      minStock: 30,
      safetyStock: 15,
      dailyBurnRate: 1.5,
      stockoutDaysLeft: 40.0,
      unitPriceCop: 38000,
      category: "Protección Personal (EPP)",
    },
  },

  // 7. Decisiones & Órdenes de Compra
  {
    id: "dec_7f93a1c8",
    type: "decision",
    label: "Decisión: Reposición SKU-MAN-SM400",
    sublabel: "Propuesta de compra $18.720.000 COP",
    status: "warning",
    metadata: {
      caseId: "CASE-2026-0041",
      proposedQuantity: 12,
      totalCostCop: 18720000,
      selectedSupplier: "Ferreterías Unidas Bogotá",
      policyDecision: "pending_approval",
      policyReason: "Monto excede el umbral autónomo de $5.000.000 COP",
      riskScore: 0.18,
    },
  },
  {
    id: "po_0089",
    type: "purchase_order",
    label: "PO-2026-0089",
    sublabel: "Orden de Compra Borrador",
    status: "idle",
    metadata: {
      poNumber: "PO-2026-0089",
      supplierId: "supp_ferr_bog",
      totalCop: 18720000,
      leadTimeDays: 3,
      paymentTerms: "30 días factura",
    },
  },

  // 8. Evento de Aprobación Humana (HITL)
  {
    id: "hitl_alex",
    type: "execution",
    label: "Aprobación Humana: Alex Rivera",
    sublabel: "Director de Operaciones & Compras",
    status: "warning",
    metadata: {
      pendingRole: "OPERATIONS_DIRECTOR",
      actionRequired: "Aprobar o rechazar orden de compra > $5M COP",
      channel: "Mint Studio Console",
    },
  },
];

/**
 * Conexiones semánticas verificadas entre las entidades de Mint.
 */
export const RAW_MINT_EDGES: MintGraphEdge[] = [
  // Agente -> Base de Datos
  {
    id: "edge_agent_db",
    source: "agent_coordinator",
    target: "db_postgres",
    relation: "queries",
    label: "audita stock e historial",
  },

  // Agente -> Herramientas
  { id: "edge_agent_t1", source: "agent_coordinator", target: "tool_stock", relation: "uses" },
  { id: "edge_agent_t2", source: "agent_coordinator", target: "tool_forecast", relation: "uses" },
  { id: "edge_agent_t3", source: "agent_coordinator", target: "tool_suppliers", relation: "uses" },
  { id: "edge_agent_t4", source: "agent_coordinator", target: "tool_logistics", relation: "uses" },
  { id: "edge_agent_t5", source: "agent_coordinator", target: "tool_po", relation: "uses" },
  { id: "edge_agent_t6", source: "agent_coordinator", target: "tool_audit", relation: "uses" },

  // Bodegas -> Base de datos
  { id: "edge_wh_bga_db", source: "wh_bga", target: "db_postgres", relation: "belongs_to" },
  { id: "edge_wh_bog_db", source: "wh_bog", target: "db_postgres", relation: "belongs_to" },
  { id: "edge_wh_med_db", source: "wh_med", target: "db_postgres", relation: "belongs_to" },

  // SKUs -> Bodegas
  { id: "edge_sku_sm400_bga", source: "sku_sm400", target: "wh_bga", relation: "belongs_to" },
  { id: "edge_sku_disc7_bga", source: "sku_disc7", target: "wh_bga", relation: "belongs_to" },
  { id: "edge_sku_imp20_bog", source: "sku_imp20", target: "wh_bog", relation: "belongs_to" },
  { id: "edge_sku_cas300_med", source: "sku_cas300", target: "wh_med", relation: "belongs_to" },

  // Herramientas -> SKUs
  { id: "edge_tool_stock_sm400", source: "tool_stock", target: "sku_sm400", relation: "queries" },
  { id: "edge_tool_stock_disc7", source: "tool_stock", target: "sku_disc7", relation: "queries" },
  { id: "edge_tool_forecast_sm400", source: "tool_forecast", target: "sku_sm400", relation: "queries" },

  // Herramientas -> Proveedores
  { id: "edge_tool_supp_bog", source: "tool_suppliers", target: "supp_ferr_bog", relation: "queries" },
  { id: "edge_tool_supp_san", source: "tool_suppliers", target: "supp_dist_san", relation: "queries" },
  { id: "edge_tool_supp_ant", source: "tool_suppliers", target: "supp_herram_ant", relation: "queries" },

  // Cadena de Conocimiento Operativo: SKU déficit -> Agente -> Decisión -> Proveedor -> PO -> HITL
  {
    id: "edge_agent_dec_sm400",
    source: "agent_coordinator",
    target: "dec_7f93a1c8",
    relation: "generates",
    label: "genera propuesta",
  },
  {
    id: "edge_dec_sku_sm400",
    source: "dec_7f93a1c8",
    target: "sku_sm400",
    relation: "depends_on",
    label: "resuelve quiebre",
  },
  {
    id: "edge_dec_supp_bog",
    source: "dec_7f93a1c8",
    target: "supp_ferr_bog",
    relation: "depends_on",
    label: "proveedor adjudicado",
  },
  {
    id: "edge_tool_po_order",
    source: "tool_po",
    target: "po_0089",
    relation: "modifies",
    label: "redacta borrador",
  },
  {
    id: "edge_dec_po_0089",
    source: "dec_7f93a1c8",
    target: "po_0089",
    relation: "generates",
  },
  {
    id: "edge_po_hitl",
    source: "po_0089",
    target: "hitl_alex",
    relation: "approved_by",
    label: "requiere firma HITL",
  },
  {
    id: "edge_supp_po_0089",
    source: "supp_ferr_bog",
    target: "po_0089",
    relation: "belongs_to",
  },
];

/**
 * Motor de Proyección y Filtrado del Grafo (Client-side)
 * Idéntico al contrato del backend @mint/core
 */
export function filterGraphData(
  allNodes: MintGraphNode[] = RAW_MINT_NODES,
  allEdges: MintGraphEdge[] = RAW_MINT_EDGES,
  filters: GraphFilters = {}
): MintGraphData {
  // 1. Calcular degree (número de enlaces) por nodo
  const degreeMap = new Map<string, number>();
  for (const edge of allEdges) {
    degreeMap.set(edge.source, (degreeMap.get(edge.source) || 0) + 1);
    degreeMap.set(edge.target, (degreeMap.get(edge.target) || 0) + 1);
  }

  let nodes: MintGraphNode[] = allNodes.map((n) => ({
    ...n,
    degree: degreeMap.get(n.id) || 1,
  }));
  let edges: MintGraphEdge[] = [...allEdges];

  // 2. Filtro por Modo Operativo
  const mode = filters.mode || "global";

  if (mode === "workflow") {
    // Modo Workflow: Agentes, herramientas, bases de datos y decisiones
    const allowed = new Set(["agent", "tool", "database", "decision"]);
    nodes = nodes.filter((n) => allowed.has(n.type));
    const ids = new Set(nodes.map((n) => n.id));
    edges = edges.filter((e) => ids.has(e.source) && ids.has(e.target));
  } else if (mode === "execution") {
    // Modo Execution: Trazabilidad de decisiones, órdenes, aprobaciones y SKUs
    const allowed = new Set(["agent", "decision", "purchase_order", "execution", "sku", "supplier", "tool"]);
    nodes = nodes.filter((n) => allowed.has(n.type));
    const ids = new Set(nodes.map((n) => n.id));
    edges = edges.filter((e) => ids.has(e.source) && ids.has(e.target));
  } else if (mode === "local" && filters.focusNodeId) {
    // Modo Local: Subgrafo alrededor del nodo foco (1-hop y 2-hop)
    const focus = filters.focusNodeId;
    const directNeighbors = new Set<string>([focus]);

    for (const e of edges) {
      if (e.source === focus) directNeighbors.add(e.target);
      if (e.target === focus) directNeighbors.add(e.source);
    }

    nodes = nodes.filter((n) => directNeighbors.has(n.id));
    edges = edges.filter((e) => directNeighbors.has(e.source) && directNeighbors.has(e.target));
  }

  // 3. Filtro por tipos de nodo
  if (filters.nodeTypes && filters.nodeTypes.length > 0) {
    const typeSet = new Set(filters.nodeTypes);
    nodes = nodes.filter((n) => typeSet.has(n.type));
    const ids = new Set(nodes.map((n) => n.id));
    edges = edges.filter((e) => ids.has(e.source) && ids.has(e.target));
  }

  // 4. Filtro por tipos de relación
  if (filters.relationTypes && filters.relationTypes.length > 0) {
    const relSet = new Set(filters.relationTypes);
    edges = edges.filter((e) => relSet.has(e.relation));
  }

  // 5. Búsqueda textual
  if (filters.searchQuery && filters.searchQuery.trim().length > 0) {
    const q = filters.searchQuery.toLowerCase().trim();
    const matched = new Set(
      nodes
        .filter(
          (n) =>
            n.label.toLowerCase().includes(q) ||
            (n.sublabel && n.sublabel.toLowerCase().includes(q)) ||
            n.id.toLowerCase().includes(q)
        )
        .map((n) => n.id)
    );

    const visible = new Set<string>(matched);
    for (const e of edges) {
      if (matched.has(e.source)) visible.add(e.target);
      if (matched.has(e.target)) visible.add(e.source);
    }

    nodes = nodes.filter((n) => visible.has(n.id));
    const finalIds = new Set(nodes.map((n) => n.id));
    edges = edges.filter((e) => finalIds.has(e.source) && finalIds.has(e.target));
  }

  return {
    nodes,
    edges,
    metadata: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      mode,
      focusNodeId: filters.focusNodeId,
      generatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Paleta de colores temáticos Obsidian / Mint para nodos de grafo
 */
export const NODE_TYPE_COLORS: Record<MintNodeType, { stroke: string; fill: string; glow: string; text: string; bg: string }> = {
  agent: {
    stroke: "#22c55e",       // Emerald / Mint
    fill: "#14532d",
    glow: "rgba(34, 197, 94, 0.4)",
    text: "text-mint-400",
    bg: "bg-emerald-950/80 border-mint-700/60",
  },
  tool: {
    stroke: "#38bdf8",       // Sky Blue
    fill: "#0c4a6e",
    glow: "rgba(56, 189, 248, 0.35)",
    text: "text-sky-400",
    bg: "bg-sky-950/80 border-sky-700/60",
  },
  database: {
    stroke: "#c084fc",       // Purple
    fill: "#581c87",
    glow: "rgba(192, 132, 252, 0.35)",
    text: "text-purple-400",
    bg: "bg-purple-950/80 border-purple-700/60",
  },
  warehouse: {
    stroke: "#fbbf24",       // Amber
    fill: "#78350f",
    glow: "rgba(251, 191, 36, 0.35)",
    text: "text-amber-400",
    bg: "bg-amber-950/80 border-amber-700/60",
  },
  sku: {
    stroke: "#f43f5e",       // Rose / Coral
    fill: "#881337",
    glow: "rgba(244, 63, 94, 0.35)",
    text: "text-rose-400",
    bg: "bg-rose-950/80 border-rose-700/60",
  },
  supplier: {
    stroke: "#2dd4bf",       // Teal
    fill: "#134e4a",
    glow: "rgba(45, 212, 191, 0.35)",
    text: "text-teal-400",
    bg: "bg-teal-950/80 border-teal-700/60",
  },
  purchase_order: {
    stroke: "#818cf8",       // Indigo
    fill: "#312e81",
    glow: "rgba(129, 140, 248, 0.35)",
    text: "text-indigo-400",
    bg: "bg-indigo-950/80 border-indigo-700/60",
  },
  decision: {
    stroke: "#fb923c",       // Orange
    fill: "#7c2d12",
    glow: "rgba(251, 146, 60, 0.35)",
    text: "text-orange-400",
    bg: "bg-orange-950/80 border-orange-700/60",
  },
  execution: {
    stroke: "#eab308",       // Yellow
    fill: "#713f12",
    glow: "rgba(234, 179, 8, 0.35)",
    text: "text-yellow-400",
    bg: "bg-yellow-950/80 border-yellow-700/60",
  },
};

export const RELATION_LABELS: Record<MintRelationType, string> = {
  uses: "Utiliza",
  queries: "Consulta",
  belongs_to: "Pertenece a",
  generates: "Genera",
  depends_on: "Depende de",
  modifies: "Modifica",
  approved_by: "Aprobado por",
};
