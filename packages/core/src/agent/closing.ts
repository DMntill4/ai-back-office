import { db } from "../db/client";
import { cases, caseEvents } from "../db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

export interface ClosingOptions {
  caseId: string;
  status: "resuelto" | "escalado";
  summary: string;
  reason: string;
  hasUnverifiedWrites?: boolean;
}

/**
 * Aplica el dictamen final sobre un caso garantizando las reglas no negociables de CONTEXT.md
 */
export async function closeCase(options: ClosingOptions): Promise<void> {
  let finalStatus = options.status;
  let finalReason = options.reason;

  // Principio no negociable: Un caso solo se marca "resuelto" si toda escritura fue verificada
  if (finalStatus === "resuelto" && options.hasUnverifiedWrites) {
    finalStatus = "escalado";
    finalReason = `Reclasificado a ESCALADO: Se detectaron escrituras sin verificación exitosa. Motivo original: ${options.reason}`;
  }

  const now = new Date();

  // 1. Registrar evento inmutable en case_events
  try {
    await db.insert(caseEvents).values({
      id: `evt_${randomUUID()}`,
      caseId: options.caseId,
      eventType: finalStatus === "resuelto" ? "caso_resuelto" : "caso_escalado",
      payload: {
        status: finalStatus,
        resumen: options.summary,
        motivo: finalReason,
        timestamp: now.toISOString(),
      },
      createdAt: now,
    });
  } catch (err) {
    console.warn("[closeCase] Advertencia al registrar evento de cierre:", err);
  }

  // 2. Actualizar estado del caso en la tabla cases
  try {
    await db
      .update(cases)
      .set({
        status: finalStatus,
        resultSummary: options.summary,
        resolutionReason: finalReason,
        closedAt: now,
        updatedAt: now,
      })
      .where(eq(cases.id, options.caseId));
  } catch (err) {
    console.warn("[closeCase] Advertencia al actualizar tabla cases:", err);
  }
}
