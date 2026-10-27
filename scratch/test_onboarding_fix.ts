import { db, companies, users } from "@mint/core";
import { sendEmailVerificationCode, verifyEmailCode } from "@mint/core";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

async function testOnboardingEmailFlow() {
  console.log("=== PRUEBA DE FLUJO DE VERIFICACION DE CORREO EN ONBOARDING ===");
  const testCompanyId = `comp_onb_${randomUUID().slice(0, 6)}`;
  const testEmail = "test_onb_user@empresa.com";

  // 1. Pre-insertar empresa
  await db.insert(companies).values({
    id: testCompanyId,
    name: "Empresa Onboarding Test",
    currency: "USD",
  }).onConflictDoNothing();

  // 2. Enviar código OTP
  const sendRes = await sendEmailVerificationCode(testCompanyId, testEmail);
  console.log("[OK] Código generado sin error de FK:", sendRes.code);

  // 3. Verificar código correcto
  const verifyRes = await verifyEmailCode(testCompanyId, testEmail, sendRes.code);
  console.log("[OK] Resultado de verificación:", verifyRes);

  if (!verifyRes.success) {
    throw new Error("La verificación del código falló");
  }

  // 4. Limpiar datos de prueba
  await db.delete(companies).where(eq(companies.id, testCompanyId));
  console.log("[OK] Limpieza de empresa de prueba completada.");
}

testOnboardingEmailFlow().then(() => {
  console.log("TEST E1.2 / F-02 SUPERADO EXITOSAMENTE.");
  process.exit(0);
}).catch(err => {
  console.error("FALLO EN TEST E1.2:", err);
  process.exit(1);
});
