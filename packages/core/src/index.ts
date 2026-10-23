/**
 * @mint/core
 * Paquete central del motor multi-agente autónomo y lógica de dominio.
 * CERO dependencias de frameworks HTTP (Fastify) o UI.
 */

// 1. Agente y Orquestación Multi-Agente
export * from "./agent/loop";
export * from "./agent/coordinador";
export * from "./agent/closing";
export * from "./agent/toolsDefinition";
export * from "./agent/context/contextManager";
export * from "./agent/especialistas/inventarioSpecialist";
export * from "./agent/especialistas/comprasSpecialist";
export * from "./agent/especialistas/transporteSpecialist";
export * from "./agent/especialistas/riesgoSpecialist";
export * from "./agent/harness";

// 2. Herramientas Especializadas (12 Tools)
export * from "./tools/index";

// 3. Base de Datos y Esquemas Drizzle
export * from "./db/client";
export * from "./db/schema/index";
export * from "./db/supabase";
export * from "./db/ensureDecisionsTables";

// 4. Motor de Políticas Determinista
export * from "./policy/policyEngine";

// 5. Ingestión y Escaneo de Eventos Reales
export * from "./events/eventEngine";

// 6. Servicios de Dominio
export * from "./services/inventoryService";
export * from "./services/demandService";
export * from "./services/shipmentService";
export * from "./services/authAndSetupService";
export * from "./services/decisionExecutionService";
export * from "./services/teamService";
export * from "./services/dataFreshnessService";

// 7. Cliente LLM
export * from "./llm/client";
export * from "./config/env";
