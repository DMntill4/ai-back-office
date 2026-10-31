import {
  MintGraphData,
  MintGraphNode,
  MintGraphEdge,
  GraphFilters,
} from "./graph.types";
import { fetchRawGraphEntities } from "./graph.queries";

/**
 * Servicio del Motor de Grafos de Conocimiento Operativo de Mint.
 * Procesa, filtra y proyecta las relaciones entre componentes y entidades.
 */
export async function getKnowledgeGraph(
  filters: GraphFilters = {}
): Promise<MintGraphData> {
  const companyId = filters.companyId || "comp_default";
  const { nodes: rawNodes, edges: rawEdges } = await fetchRawGraphEntities(companyId);

  // 1. Calcular grado de conexión de cada nodo (para escalado de tamaño tipo Obsidian)
  const degreeMap = new Map<string, number>();
  for (const edge of rawEdges) {
    degreeMap.set(edge.source, (degreeMap.get(edge.source) || 0) + 1);
    degreeMap.set(edge.target, (degreeMap.get(edge.target) || 0) + 1);
  }

  let nodes: MintGraphNode[] = rawNodes.map((n) => ({
    ...n,
    degree: degreeMap.get(n.id) || 1,
  }));
  let edges: MintGraphEdge[] = [...rawEdges];

  // 2. Filtro por Modo Operativo
  const mode = filters.mode || "global";

  if (mode === "workflow") {
    // Modo Workflow: Únicamente agentes, tools, bases de datos y decisiones
    const allowedTypes = new Set(["agent", "decision", "case"]);
    nodes = nodes.filter((n) => allowedTypes.has(n.type));
    const nodeIds = new Set(nodes.map((n) => n.id));
    edges = edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
  } else if (mode === "execution") {
    // Modo Execution: Trazabilidad de decisiones generadas y herramientas usadas
    const executionTypes = new Set(["agent", "decision", "case", "sku", "supplier", "shipment"]);
    nodes = nodes.filter((n) => executionTypes.has(n.type));
    const nodeIds = new Set(nodes.map((n) => n.id));
    edges = edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
  } else if (mode === "local" && filters.focusNodeId) {
    // Modo Local: Subgrafo centrado en el nodo seleccionado (1-hop y 2-hop)
    const focusId = filters.focusNodeId;
    const neighborIds = new Set<string>([focusId]);

    // 1-hop
    for (const e of edges) {
      if (e.source === focusId) neighborIds.add(e.target);
      if (e.target === focusId) neighborIds.add(e.source);
    }

    nodes = nodes.filter((n) => neighborIds.has(n.id));
    edges = edges.filter((e) => neighborIds.has(e.source) && neighborIds.has(e.target));
  }

  // 3. Filtros por Tipos de Nodos
  if (filters.nodeTypes && filters.nodeTypes.length > 0) {
    const typeSet = new Set(filters.nodeTypes);
    nodes = nodes.filter((n) => typeSet.has(n.type));
    const nodeIds = new Set(nodes.map((n) => n.id));
    edges = edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
  }

  // 4. Filtros por Tipos de Relaciones
  if (filters.relationTypes && filters.relationTypes.length > 0) {
    const relSet = new Set(filters.relationTypes);
    edges = edges.filter((e) => relSet.has(e.relation));
  }

  // 5. Búsqueda textual
  if (filters.searchQuery && filters.searchQuery.trim().length > 0) {
    const q = filters.searchQuery.toLowerCase().trim();
    const matchedNodeIds = new Set(
      nodes
        .filter(
          (n) =>
            n.label.toLowerCase().includes(q) ||
            (n.sublabel && n.sublabel.toLowerCase().includes(q)) ||
            n.id.toLowerCase().includes(q)
        )
        .map((n) => n.id)
    );

    // Incluir también los vecinos inmediatos de los nodos coincidentes
    const visibleIds = new Set<string>(matchedNodeIds);
    for (const e of edges) {
      if (matchedNodeIds.has(e.source)) visibleIds.add(e.target);
      if (matchedNodeIds.has(e.target)) visibleIds.add(e.source);
    }

    nodes = nodes.filter((n) => visibleIds.has(n.id));
    const finalNodeIds = new Set(nodes.map((n) => n.id));
    edges = edges.filter((e) => finalNodeIds.has(e.source) && finalNodeIds.has(e.target));
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
