import { describe, it, expect, afterAll } from "vitest";
import { db, pool } from "../src/db/client";
import { cases, caseEvents } from "../src/db/schema";
import { eq } from "drizzle-orm";

describe("Blindaje de inmutabilidad en case_events", () => {
  const testCaseId = "case_immutability_test";
  const testEventId = "evt_immutability_test";

  it("debe permitir insertar un evento normalmente", async () => {
    // Asegurar que existe el caso padre
    await db
      .insert(cases)
      .values({
        id: testCaseId,
        title: "Caso de prueba de inmutabilidad",
        description: "Validando triggers de seguridad",
      })
      .onConflictDoNothing();

    // Insertar evento
    await db
      .insert(caseEvents)
      .values({
        id: testEventId,
        caseId: testCaseId,
        eventType: "evento_inicial",
        payload: { detalle: "seguridad garantizada" },
      })
      .onConflictDoNothing();

    const [evento] = await db
      .select()
      .from(caseEvents)
      .where(eq(caseEvents.id, testEventId));

    expect(evento).toBeDefined();
    expect(evento.eventType).toBe("evento_inicial");
  });

  it("debe RECHAZAR y lanzar excepción al intentar MODIFICAR (UPDATE) un evento", async () => {
    let fallo = false;
    try {
      await db
        .update(caseEvents)
        .set({ eventType: "evento_modificado_falsificado" })
        .where(eq(caseEvents.id, testEventId));
    } catch (err: any) {
      fallo = true;
      const errorMsg = err.cause?.message || err.message;
      expect(errorMsg).toMatch(/La tabla case_events es inmutable/);
    }
    expect(fallo).toBe(true);
  });

  it("debe RECHAZAR y lanzar excepción al intentar ELIMINAR (DELETE) un evento", async () => {
    let fallo = false;
    try {
      await db.delete(caseEvents).where(eq(caseEvents.id, testEventId));
    } catch (err: any) {
      fallo = true;
      const errorMsg = err.cause?.message || err.message;
      expect(errorMsg).toMatch(/La tabla case_events es inmutable/);
    }
    expect(fallo).toBe(true);
  });

  afterAll(async () => {
    // Cerramos el pool de conexiones al terminar la prueba
    await pool.end();
  });
});
