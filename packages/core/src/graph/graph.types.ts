/**
 * Mint Operational Knowledge Graph Types
 * Contratos de entidades y relaciones del sistema logístico autónomo.
 */

export type MintNodeType =
  | "agent"
  | "tool"
  | "database"
  | "warehouse"
  | "sku"
  | "supplier"
  | "purchase_order"
  | "execution"
  | "decision"
  | "case"
  | "shipment"
  | "document";

export type MintRelationType =
  | "uses"
  | "queries"
  | "belongs_to"
  | "generates"
  | "depends_on"
  | "modifies"
  | "approved_by"
  | "supplies"
  | "documents"
  | "almacena"
  | "suministra"
  | "monitorea"
  | "propone"
  | "afecta"
  | "documenta"
  | "depende_de"
  | "pertenece_a"
  | "utiliza"
  | "aprobado_por";

export interface MintGraphNode {
  id: string;
  type: MintNodeType;
  label: string;
  sublabel?: string;
  degree?: number;
  status?: "active" | "idle" | "running" | "warning";
  metadata?: Record<string, unknown>;
}

export interface MintGraphEdge {
  id: string;
  source: string;
  target: string;
  relation: MintRelationType;
  label?: string;
  weight?: number;
}

export interface MintGraphData {
  nodes: MintGraphNode[];
  edges: MintGraphEdge[];
  metadata?: {
    totalNodes: number;
    totalEdges: number;
    mode: "global" | "local" | "workflow" | "execution";
    focusNodeId?: string;
    generatedAt: string;
  };
}

export interface AgentGraphTraversal {
  type: "agent_graph_traversal";
  taskId: string;
  agentId: string;
  targetNodeId: string;
  action: string;
  path: string[];
  status: "active" | "warning" | "completed";
  timestamp: number;
}

export function toMintGraphNodeId(prefix: string, value: string): string {
  const normalized = value.trim().replace(/[^a-zA-Z0-9._-]/g, (char) =>
    Array.from(char)
      .map((part) => `_${part.codePointAt(0)?.toString(16) ?? "0"}_`)
      .join(""),
  );
  return `${prefix}_${normalized}`;
}

export interface GraphFilters {
  nodeTypes?: MintNodeType[];
  relationTypes?: MintRelationType[];
  searchQuery?: string;
  focusNodeId?: string;
  mode?: "global" | "local" | "workflow" | "execution";
  maxDepth?: number;
  companyId?: string;
}
