export type TabId =
  | "workflows"
  | "graph"
  | "memory"
  | "stock"
  | "inbox"
  | "objectives"
  | "history"
  | "settings";
export type ModeTab = "editor" | "executions" | "test";

export interface VaultNote {
  id: string;
  filename: string;
  folder: string;
  title: string;
  estado: "vigente" | "hipotesis" | "contradicha" | "archivada";
  confianza: number;
  evidencias_count: number;
  origen: string;
  tags: string[];
  wikilinks: string[];
  content: string;
  updatedAt: string;
  hasContradiction?: boolean;
  contradictionDetails?: {
    dbValue: string;
    noteValue: string;
  };
}

export interface StockSkuItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  warehouseId: string;
  warehouseName: string;
  currentStock: number;
  minStock: number;
  safetyStock: number;
  dailyBurnRate: number;
  coverageDays: number;
  unitPriceCop: number;
  ropThreshold: number;
  status: "optimo" | "alerta" | "quiebre" | "cuarentena";
}

export interface GoalLever {
  id: string;
  title: string;
  description: string;
  potentialSavingsCop: number;
  leverType: "renegociacion_volumen" | "cobertura_stock" | "consolidacion_fletes";
  active: boolean;
  impactLabel: string;
  name?: string;
  riskLevel?: string;
}

export interface DoctorCheckItem {
  id: string;
  category: "database" | "llm" | "vault" | "daemon" | "channels" | "governance";
  label: string;
  status: "ok" | "warning" | "error";
  details: string;
  latencyMs?: number;
}

export interface HitlDecision {
  id: string;
  caseId: string;
  title: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPriceCop: number;
  totalCostCop: number;
  supplierName: string;
  supplierCity: string;
  leadTimeDays: number;
  currentStock: number;
  ropThreshold: number;
  riskScore: number;
  redFlags: string[];
  status: "pendiente" | "aprobado" | "rechazado";
  policyDecision: "pending_approval" | "auto_executed" | "blocked";
  policyReason: string;
  hmacSignature?: string;
  createdAt: string;
}

export interface AgentTool {
  id: string;
  number: number;
  name: string;
  category: "database" | "analytics" | "logistics" | "governance";
  description: string;
  isActive: boolean;
}

export interface WorkflowObjective {
  id: string;
  title: string;
  badge: string;
  description: string;
  recommendedModel: string;
  defaultMaxIterations: number;
  activeTools: string[];
  systemGoal: string;
  name?: string;
  timeframe?: string;
  targetMetric?: string;
  leversCount?: number;
}

export interface NodeData {
  id: string;
  type: "trigger" | "agent" | "action";
  label: string;
  sublabel: string;
  status: "idle" | "running" | "success" | "warning";
  x: number;
  y: number;
  width?: number;
  height?: number;
  tools?: AgentTool[];
  properties?: {
    nodeName?: string;
    description?: string;
    model?: string;
    maxIterations?: number;
    memoryLimit?: string;
    objectiveId?: string;
    approvalThresholdCop?: number;
    dbHost?: string;
    dbDatabase?: string;
    connectedTables?: number;
    lastSynced?: string;
  };
}

export interface LogStep {
  id: string;
  nodeKey: string;
  label: string;
  status: "success" | "running" | "pending" | "failed";
  timestamp: string;
  payload: any;
  /** Tokens consumidos por este paso (Agent FinOps). */
  tokens?: number;
  /** Costo en USD de este paso (Agent FinOps). */
  costUsd?: number;
  /** Modelo LLM usado en este paso. */
  model?: string;
}

export interface CliHistoryItem {
  id: string;
  type: "command" | "output" | "error" | "system";
  text: string;
  timestamp: string;
  meta?: any;
}
