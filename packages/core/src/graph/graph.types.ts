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
  | "decision";

export type MintRelationType =
  | "uses"
  | "queries"
  | "belongs_to"
  | "generates"
  | "depends_on"
  | "modifies"
  | "approved_by";

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

export interface GraphFilters {
  nodeTypes?: MintNodeType[];
  relationTypes?: MintRelationType[];
  searchQuery?: string;
  focusNodeId?: string;
  mode?: "global" | "local" | "workflow" | "execution";
  maxDepth?: number;
  companyId?: string;
}
