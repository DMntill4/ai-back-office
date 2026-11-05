import {
  saveCheckpoint,
  loadCheckpoint,
  clearCheckpoint,
} from "../packages/cli/src/commands/onboarding";
import {
  sendEmailVerificationCode,
  verifyEmailCode,
  getCompanyConfig,
  setCompanyConfig,
  db,
  companies,
  operationalEvents,
  hasPermission,
} from "@mint/core";
import {
  saveSession,
  getSession,
  deleteSession,
  type StoredSession,
} from "../packages/cli/src/keychain";
import { eq, desc } from "drizzle-orm";
import * as fs from "node:fs";
import * as path from "node:path";

async function verifyE1() {
  console.log("=== VERIFICACION E1: CONFIGURACION Y ACCESO ===");

  // E1.1: Checkpoint onboarding
  console.log("\n--- Probando E1.1: Checkpoint onboarding ---");
  const testCheckpoint = {
    step: 3,
    companyName: "Empresa Prueba E1",
    email: "test_e1@mint.ai",
  };
  saveCheckpoint(testCheckpoint);
  const loadedCp = loadCheckpoint();
  const cpMatches = loadedCp && loadedCp.step === 3 && loadedCp.companyName === "Empresa Prueba E1";
  console.log("Checkpoint guardado y leido:", cpMatches ? "[OK]" : "[ERROR]", loadedCp);
  clearCheckpoint();
  const clearedCp = loadCheckpoint();
  const cpCleared = clearedCp === null;
  console.log("Checkpoint limpiado correctamente:", cpCleared ? "[OK]" : "[ERROR]");

  // E1.2: Verificacion OTP de correo
  console.log("\n--- Probando E1.2: OTP de Correo ---");
  const testEmail = "owner_test_e1@empresa.com";
  const otpResult = await sendEmailVerificationCode("comp_default", testEmail);
  console.log("Codigo OTP generado:", otpResult.success ? "[OK]" : "[ERROR]", "Code length:", otpResult.code?.length);
  
  // Probar codigo invalido
  const invalidVerify = await verifyEmailCode("comp_default", testEmail, "999999");
  console.log("Verificacion con codigo falso:", !invalidVerify.success ? "[OK RECHAZADO]" : "[ERROR PERMITIDO]", invalidVerify.message);
  
  // Probar codigo valido
  const validVerify = await verifyEmailCode("comp_default", testEmail, otpResult.code!);
  console.log("Verificacion con codigo correcto:", validVerify.success ? "[OK ACEPTADO]" : "[ERROR RECHAZADO]", validVerify.message);

  // E1.3: Edicion de ajustes y auditoria
  console.log("\n--- Probando E1.3: Edicion de ajustes y auditoria ---");
  const compId = "comp_default";
  await setCompanyConfig(compId, "currency", "COP");
  await setCompanyConfig(compId, "timezone", "America/Bogota");
  const updatedCfg = await getCompanyConfig(compId);
  console.log("Configuracion actualizada en DB:", updatedCfg.currency === "COP" ? "[OK]" : "[ERROR]", {
    currency: updatedCfg.currency,
    timezone: updatedCfg.timezone,
  });
  
  // Verificar evento de auditoria en operational_events
  const latestEvents = await db
    .select()
    .from(operationalEvents)
    .where(eq(operationalEvents.companyId, compId))
    .orderBy(desc(operationalEvents.createdAt))
    .limit(3);
  console.log("Eventos operacionales generados:", latestEvents.length > 0 ? "[OK]" : "[ERROR]", latestEvents.map(e => ({ type: e.eventType, desc: e.description })));

  // E1.4: Sesion, expiracion y logout
  console.log("\n--- Probando E1.4: Sesion, expiracion y logout ---");
  const mockSession: StoredSession = {
    token: "tok_test_e1",
    userId: "usr_test_e1",
    email: "user_e1@test.com",
    name: "User E1",
    role: "owner",
    companyId: "comp_default",
    companyName: "Default Corp",
    savedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
  };
  await saveSession(mockSession);
  const activeSession = await getSession();
  console.log("Sesion activa recuperada:", activeSession?.userId === "usr_test_e1" ? "[OK]" : "[ERROR]", activeSession?.name);
  
  // Probar sesion expirada
  const expiredSession: StoredSession = {
    ...mockSession,
    expiresAt: new Date(Date.now() - 5000).toISOString(), // Expirada hace 5 segundos
  };
  await saveSession(expiredSession);
  const retrievedExpired = await getSession();
  console.log("Sesion expirada rechazada (null):", retrievedExpired === null ? "[OK EXPIRADO]" : "[ERROR VIGENTE]");
  
  // Guardar sesion valida de nuevo y probar logout
  await saveSession(mockSession);
  await deleteSession();
  const sessionAfterLogout = await getSession();
  console.log("Sesion tras logout:", sessionAfterLogout === null ? "[OK NULA]" : "[ERROR SIGUE VIVA]");

  // E1.5: Aislamiento multi-empresa
  console.log("\n--- Probando E1.5: Aislamiento multi-empresa ---");
  const compAlpha = "comp_test_alpha";
  const compBeta = "comp_test_beta";
  await db.insert(companies).values([
    { id: compAlpha, name: "Alpha Corp", currency: "USD" },
    { id: compBeta, name: "Beta Ltd", currency: "EUR" },
  ]).onConflictDoNothing();
  
  await setCompanyConfig(compAlpha, "currency", "USD");
  await setCompanyConfig(compBeta, "currency", "EUR");
  const cfgAlpha = await getCompanyConfig(compAlpha);
  const cfgBeta = await getCompanyConfig(compBeta);
  const isolated = cfgAlpha.currency === "USD" && cfgBeta.currency === "EUR" && cfgAlpha.companyName !== cfgBeta.companyName;
  console.log("Aislamiento comp_alpha vs comp_beta:", isolated ? "[OK AISLADO]" : "[ERROR CONTAMINADO]", {
    alpha: { name: cfgAlpha.companyName, currency: cfgAlpha.currency },
    beta: { name: cfgBeta.companyName, currency: cfgBeta.currency },
  });

  // E1.6: RBAC y roles
  console.log("\n--- Probando E1.6: RBAC y roles ---");
  const ownerApprove = hasPermission("owner", "approve");
  const adminConfigure = hasPermission("admin", "configure_bot");
  const adminUpload = hasPermission("admin", "upload_sql");
  const operatorDeniedTeam = !hasPermission("operator", "manage_team");
  const viewerDeniedApprove = !hasPermission("viewer", "approve");
  const driverDeniedConfig = !hasPermission("driver", "configure_bot");
  const rbacOk = ownerApprove && adminConfigure && adminUpload && operatorDeniedTeam && viewerDeniedApprove && driverDeniedConfig;
  console.log("Matriz RBAC backend:", rbacOk ? "[OK PROTEGIDO]" : "[ERROR PERMISOS LAXOS]", {
    ownerApprove, adminConfigure, adminUpload, operatorDeniedTeam, viewerDeniedApprove, driverDeniedConfig
  });
}

verifyE1().then(() => {
  console.log("\n=== FIN DE VERIFICACION E1 ===");
  process.exit(0);
}).catch(err => {
  console.error("Fallo critico en E1:", err);
  process.exit(1);
});
