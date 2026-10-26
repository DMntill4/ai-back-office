import { db } from "../db/client";
import { decisions } from "../db/schema";
import { eq, and, or, gt } from "drizzle-orm";

/** Horas durante las que no se vuelve a proponer algo que el operador rechazó. */
export const REJECTION_COOLDOWN_HOURS = 24;

/**
 * Devuelve los productos que ya tienen una propuesta pendiente de aprobación
 * o que fueron rechazados dentro de la ventana de enfriamiento.
 */
export async function getProductsWithOpenProposals(companyId: string): Promise<Set<string>> {
  const since = new Date(Date.now() - REJECTION_COOLDOWN_HOURS * 3600 * 1000);
  const rows = await db
    .select({ evidence: decisions.evidencePayload })
    .from(decisions)
    .where(
      and(
        eq(decisions.companyId, companyId),
        or(
          eq(decisions.policyDecision, "pending_approval"),
          and(eq(decisions.policyDecision, "rejected"), gt(decisions.decidedAt, since)),
        ),
      ),
    );

  const blocked = new Set<string>();
  for (const r of rows) {
    const pid = (r.evidence as any)?.productId;
    if (pid) blocked.add(String(pid));
  }
  return blocked;
}
