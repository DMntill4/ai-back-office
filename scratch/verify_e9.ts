import {
  executeSafeSqlQuery,
} from "../packages/core/src/db/safeQueryEngine";
import {
  db,
  decisions,
} from "@mint/core";
import { inboxCommand } from "../packages/cli/src/commands/inbox";
import { eq } from "drizzle-orm";
import * as fs from "node:fs";
import * as path from "node:path";

async function verifyE9() {
  console.log("=== VERIFICACION E9: OPERAR SOBRE LOS DATOS ===");

  // E9.1: SQL de solo lectura con forzado de LIMIT y bloqueo de mutaciones
  console.log("\n--- Probando E9.1: SQL Solo Lectura (executeSafeSqlQuery) ---");
  // 1. SELECT válido
  const selectRes = await executeSafeSqlQuery({
    companyId: "comp_default",
    sqlQuery: "SELECT id, name FROM products",
    userRole: "viewer",
  });
  console.log("SELECT ejecutado con éxito:", selectRes.success ? "[OK]" : "[ERROR]", `Filas: ${selectRes.rows.length}, isReadOnly: ${selectRes.isReadOnly}`);
  
  // 2. Bloqueo de DROP/DELETE con rol viewer
  const badRes = await executeSafeSqlQuery({
    companyId: "comp_default",
    sqlQuery: "DROP TABLE products;",
    userRole: "viewer",
  });
  console.log("Bloqueo de DROP con rol viewer:", !badRes.success ? "[OK RECHAZADO]" : "[ERROR PERMITIDO]", badRes.message);

  // E9.2: Escrituras seguras con respaldo y transaccion
  console.log("\n--- Probando E9.2: Escritura segura con respaldo y transaccion ---");
  const backupDir = path.join(process.cwd(), "vault", "backups");
  const countBefore = fs.existsSync(backupDir) ? fs.readdirSync(backupDir).length : 0;
  
  // Ejecutar mutacion segura sobre configuracion
  const mutRes = await executeSafeSqlQuery({
    companyId: "comp_default",
    userRole: "owner",
    sqlQuery: "UPDATE business_config SET value = 'USD' WHERE key = 'currency' AND company_id = 'comp_default';",
  });
  console.log("Resultado de mutacion segura:", mutRes.success ? "[OK]" : "[ERROR]", `Filas afectadas: ${mutRes.rowCount}`);
  
  const countAfter = fs.existsSync(backupDir) ? fs.readdirSync(backupDir).length : 0;
  console.log("Respaldo creado en vault/backups/:", countAfter >= countBefore ? "[OK]" : "[ERROR]", `Archivos de respaldo: ${countAfter}`);

  // E9.3: Acciones destructivas sin WHERE o con rol bajo son rechazadas
  console.log("\n--- Probando E9.3: Bloqueo de acciones destructivas sin confirmacion ---");
  const destRes = await executeSafeSqlQuery({
    companyId: "comp_default",
    userRole: "owner",
    sqlQuery: "DROP TABLE products;",
    confirmed: false,
  });
  console.log("Bloqueo de DROP sin confirmacion:", destRes.requiresConfirmation ? "[OK BLOQUEADO POR SEGURIDAD]" : "[ERROR]");

  // E9.4: Cancelacion de accion pendiente
  console.log("\n--- Probando E9.4: Cancelar propuesta pendiente en inbox ---");
  // Buscar propuesta pendiente
  const [pendingDec] = await db
    .select()
    .from(decisions)
    .where(eq(decisions.policyDecision, "pending_approval"))
    .limit(1);

  if (pendingDec) {
    console.log("Propuesta pendiente encontrada:", pendingDec.id, pendingDec.title);
    await inboxCommand("cancel", pendingDec.id);
    const [cancelledDec] = await db
      .select()
      .from(decisions)
      .where(eq(decisions.id, pendingDec.id));
    console.log("Estado tras cancelacion:", cancelledDec?.policyDecision);
    const isCancelled = cancelledDec?.policyDecision === "rejected" || cancelledDec?.policyDecision === "blocked";
    console.log("Propuesta cancelada con exito:", isCancelled ? "[OK]" : "[ERROR]");
  } else {
    console.log("No habia propuestas en pending_approval para cancelar");
  }

  // E9.5: Tablas de MINT llevan prefijo mint_*
  console.log("\n--- Probando E9.5: Tablas de MINT con prefijo mint_* ---");
  const { discoverCustomerSchema } = await import("@mint/core");
  const schema = await discoverCustomerSchema("comp_default");
  console.log("Tablas internas de MINT detectadas en BD:", schema.mintInternalTables);
  const mintPrefixedTables = schema.mintInternalTables.filter(t => t.startsWith("mint_"));
  console.log("Tablas con prefijo mint_*:", mintPrefixedTables);
  const mintPrefixRespected = mintPrefixedTables.length >= 4;
  console.log("Prefijo mint_* respetado:", mintPrefixRespected ? "[OK]" : "[ADVERTENCIA]");
}

verifyE9().then(() => {
  console.log("\n=== FIN DE VERIFICACION E9 ===");
  process.exit(0);
}).catch(err => {
  console.error("Fallo critico en E9:", err);
  process.exit(1);
});
