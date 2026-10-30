import { SpecializedAgent, AgentRole } from "../contracts/agentContract";
import { inventarioAgent } from "../specialists/inventarioAgent";
import { comprasAgent } from "../specialists/comprasAgent";
import { logisticaAgent } from "../specialists/logisticaAgent";
import { notificacionesAgent } from "../specialists/notificacionesAgent";
import { datosIntegracionesAgent } from "../specialists/datosIntegracionesAgent";
import { auditoriaAgent } from "../specialists/auditoriaAgent";
import { db } from "../../db/client";
import { businessConfig } from "../../db/schema";
import { eq, and } from "drizzle-orm";

export class AgentRegistry {
  private agents = new Map<AgentRole, SpecializedAgent>();

  constructor() {
    this.register(inventarioAgent);
    this.register(comprasAgent);
    this.register(logisticaAgent);
    this.register(notificacionesAgent);
    this.register(datosIntegracionesAgent);
    this.register(auditoriaAgent);
  }

  register(agent: SpecializedAgent): void {
    this.agents.set(agent.contract.role, agent);
  }

  getAgent(role: AgentRole): SpecializedAgent | undefined {
    return this.agents.get(role);
  }

  getAllAgents(): SpecializedAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Determina dinámicamente qué agentes están activos para una empresa según su modelo de negocio real.
   */
  async getEnabledAgentsForCompany(
    companyId: string = "comp_default",
  ): Promise<Array<{ agent: SpecializedAgent; isEnabled: boolean; reason?: string }>> {
    let profile = "tienda_proveedores";
    try {
      const [cfg] = await db
        .select({ value: businessConfig.value })
        .from(businessConfig)
        .where(and(eq(businessConfig.companyId, companyId), eq(businessConfig.key, "business_profile")))
        .limit(1);
      if (cfg?.value) {
        profile = cfg.value;
      }
    } catch {
      // Usar valor por defecto
    }

    const result: Array<{ agent: SpecializedAgent; isEnabled: boolean; reason?: string }> = [];

    for (const agent of this.agents.values()) {
      const role = agent.contract.role;

      if (profile === "tienda") {
        if (role === "logistica") {
          result.push({
            agent,
            isEnabled: false,
            reason: "Empresa opera en modalidad 'Solo Tienda': sin flota vial ni múltiples bodegas.",
          });
          continue;
        }
        if (role === "compras") {
          result.push({
            agent,
            isEnabled: false,
            reason: "Modalidad 'Solo Tienda': compras externas a proveedores silenciadas para evitar órdenes fantasma.",
          });
          continue;
        }
      }

      // Por defecto para tienda_proveedores, industrial_distribuidora o general
      result.push({ agent, isEnabled: true });
    }

    return result;
  }
}

export const agentRegistry = new AgentRegistry();
