import {
  setCompanyConfig,
  getCompanyConfig,
  db,
  mintShadowDecisions,
} from "@mint/core";
import { shadowCommand } from "../packages/cli/src/commands/shadow";
import { count } from "drizzle-orm";

async function verifyE11() {
  console.log("=== VERIFICACION E11: AUTONOMIA Y MODO SOMBRA ===");

  // E11.1: Niveles de autonomia y respeto estricto
  console.log("\n--- Probando E11.1: Configuracion de nivel de autonomia ---");
  // Probar nivel valido 'hitl'
  await setCompanyConfig("comp_default", "autonomy_level", "hitl");
  const cfgHitl = await getCompanyConfig("comp_default");
  console.log("Nivel HITL configurado:", cfgHitl.autonomyLevel === "hitl" ? "[OK]" : "[ERROR]");

  // Probar rechazo de nivel invalido
  let invalidLevelRejected = false;
  try {
    await setCompanyConfig("comp_default", "autonomy_level", "full_unsupervised_god_mode");
  } catch (err: any) {
    invalidLevelRejected = true;
    console.log("Rechazo de nivel de autonomia invalido:", "[OK RECHAZADO]", err.message);
  }
  console.log("Resultado E11.1:", invalidLevelRejected ? "[OK]" : "[ERROR PERMITIO INVALIDO]");

  // E11.2: Modo Sombra (shadow mode)
  console.log("\n--- Probando E11.2: Modo Sombra (mint shadow) ---");
  // 1. Activar modo sombra
  let capturedShadowOut = "";
  const origLog = console.log;
  console.log = (...args: any[]) => {
    capturedShadowOut += args.join(" ") + "\n";
    origLog(...args);
  };

  try {
    await shadowCommand("on");
    await shadowCommand("status");
  } catch (err: any) {
    origLog("Error en shadowCommand:", err.message);
  } finally {
    console.log = origLog;
  }

  const [shadowCount] = await db.select({ total: count() }).from(mintShadowDecisions);
  console.log("Total decisiones simuladas en mint_shadow_decisions:", shadowCount.total);
  const shadowActive = capturedShadowOut.includes("MODO SOMBRA") || capturedShadowOut.includes("ACTIVADO") || capturedShadowOut.includes("SHADOW");
  console.log("Resultado Modo Sombra E11.2:", shadowActive ? "[OK]" : "[ERROR]");
}

verifyE11().then(() => {
  console.log("\n=== FIN DE VERIFICACION E11 ===");
  process.exit(0);
}).catch(err => {
  console.error("Fallo critico en E11:", err);
  process.exit(1);
});
