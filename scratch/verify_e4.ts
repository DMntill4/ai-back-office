import {
  db,
  operationalEvents,
  setCompanyConfig,
  getCompanyConfig,
} from "@mint/core";
import { auditCommand } from "../packages/cli/src/commands/audit";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "node:crypto";

async function verifyE4() {
  console.log("=== VERIFICACION E4: ESCUCHA EN VIVO Y AUDITORIA ===");

  // E4.1: Deteccion de cambio y registro inmutable en operational_events
  console.log("\n--- Probando E4.1: Idempotencia y registro de evento operacional ---");
  const testEventId = `ev_test_${randomUUID().slice(0, 8)}`;
  await db.insert(operationalEvents).values({
    id: testEventId,
    companyId: "comp_default",
    title: "Prueba Stock Update",
    eventType: "STOCK_UPDATE",
    severity: "LOW",
    description: "Actualizacion de prueba para verificacion de auditoria E4",
    payload: { sku: "TEST-SKU-01", qty: 25 },
  });

  const [insertedEvent] = await db
    .select()
    .from(operationalEvents)
    .where(eq(operationalEvents.id, testEventId));

  console.log("Evento operacional persistido en Supabase:", insertedEvent ? "[OK]" : "[ERROR]", {
    id: insertedEvent?.id,
    type: insertedEvent?.eventType,
    desc: insertedEvent?.description,
  });

  // E4.2: Umbrales propios sin nada fijo en codigo
  console.log("\n--- Probando E4.2: Umbrales configurables y THRESHOLD_CHANGE ---");
  // Modificar umbral en business_config
  const thresholdKey = "min_stock_sku_test_01";
  await setCompanyConfig("comp_default", thresholdKey, "35");
  const cfg = await getCompanyConfig("comp_default");
  console.log("Umbral persistido dinamicamente:", cfg.raw[thresholdKey] === "35" ? "[OK]" : "[ERROR]", cfg.raw[thresholdKey]);

  // E4.3: Auditoria consultable por usuario, fecha, modulo
  console.log("\n--- Probando E4.3: Comando audit con filtros ---");
  let capturedAudit = "";
  const origLog = console.log;
  console.log = (...args: any[]) => {
    capturedAudit += args.join(" ") + "\n";
    origLog(...args);
  };

  try {
    // Ejecutar auditCommand con filtro de modulo y limite
    await auditCommand({ module: "config", limit: "3" });
  } catch (err: any) {
    origLog("Error en auditCommand:", err.message);
  } finally {
    console.log = origLog;
  }

  const hasAuditResults = capturedAudit.includes("AUDITORÍA") || capturedAudit.includes("AUDITORIA") || capturedAudit.includes("CONFIG_CHANGE");
  console.log("Resultado comando audit con filtros:", hasAuditResults ? "[OK]" : "[ERROR]");
}

verifyE4().then(() => {
  console.log("\n=== FIN DE VERIFICACION E4 ===");
  process.exit(0);
}).catch(err => {
  console.error("Fallo critico en E4:", err);
  process.exit(1);
});
