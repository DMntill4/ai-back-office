import { mintOrchestrator, OrchestrationResult } from "./orchestrator/mintOrchestrator";
import { ActionProposal, PolicyEvaluation } from "../policy/policyEngine";

export type CoordinatorResult = OrchestrationResult;

/**
 * Agente Coordinador (MINT Orchestrator):
 * Recibe eventos reales, delega con contratos a los agentes especializados (inventario, compras,
 * transporte, riesgo, notificaciones), evalúa gobernanza en el motor determinista de políticas
 * y permite deliberación con IA cuando se detectan anomalías o ambigüedades.
 */
export async function coordinateOperationalEvent(params: {
  eventId?: string;
  eventType: string;
  companyId?: string;
  productId?: string;
  trackingNumber?: string;
  title?: string;
  description?: string;
  payload?: Record<string, any>;
  autonomyLevel?: "dry-run" | "assisted" | "auto";
  /** Ignora la deduplicación (uso explícito, p. ej. simulaciones). */
  force?: boolean;
  llmClient?: any;
  requireAiReasoning?: boolean;
}): Promise<CoordinatorResult> {
  return mintOrchestrator.orchestrateEvent(params);
}
