/**
 * Contratos Formales de Agentes Especializados y Orquestación Multi-Agente
 *
 * Cada agente dispone de:
 * 1. Rol, nombre e identidad operacional única.
 * 2. Catálogo explícito de tareas aceptadas.
 * 3. Herramientas permitidas y límites de ejecución (timeout, reintentos).
 * 4. Criterio determinista vs IA (cuándo requiere razonamiento y cuándo lógica convencional).
 * 5. Trazabilidad con Correlation ID para observabilidad completa.
 */

export type AgentRole =
  | "orchestrator"
  | "inventario"
  | "compras"
  | "logistica"
  | "notificaciones"
  | "datos_integraciones"
  | "auditoria";

export type AgentStatus = "idle" | "working" | "waiting_human" | "disabled" | "error";

export interface AgentContract {
  name: string;
  role: AgentRole;
  description: string;
  acceptedTasks: string[];
  allowedTools: string[];
  maxExecutionMs: number;
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
  };
  /**
   * Criterio explícito para determinar si la tarea necesita razonamiento de modelo de IA
   * o si se resuelve 100% mediante lógica determinista/consultas SQL sin gastar tokens.
   */
  requiresAiCriteria: (task: AgentTask) => boolean;
}

export interface AgentTask<TPayload = any> {
  taskId: string;
  correlationId: string;
  companyId: string;
  caseId?: string;
  taskType: string;
  priority: "baja" | "media" | "alta" | "urgente";
  payload: TPayload;
  requiresReasoning?: boolean;
  reasoningPrompt?: string;
  createdAt: string;
}

export interface AgentExecutionResult<TData = any> {
  success: boolean;
  agentName: string;
  agentRole: AgentRole;
  taskType: string;
  correlationId: string;
  usedAi: boolean;
  modelUsed?: string;
  tokensConsumed?: {
    prompt: number;
    completion: number;
    total: number;
  };
  costUsd?: string;
  durationMs: number;
  data: TData;
  summary: string;
  escalationRequired?: boolean;
  escalationReason?: string;
  error?: string;
}

export interface SpecializedAgent<TPayload = any, TData = any> {
  readonly contract: AgentContract;
  execute(
    task: AgentTask<TPayload>,
    options?: {
      llmClient?: any;
      signal?: AbortSignal;
      autonomyLevel?: "dry-run" | "assisted" | "auto";
    },
  ): Promise<AgentExecutionResult<TData>>;
}
