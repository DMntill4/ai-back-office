import * as dotenv from "dotenv";
import { runAgentLoop } from "../src/agent/loop";
import { db, pool } from "../src/db/client";
import { cases } from "../src/db/schema";
import { eq } from "drizzle-orm";

dotenv.config();

/**
 * Ejecución End-to-End del Agente MINT por consola (Producción simulada).
 * Demuestra: Fuzzy Search, Guardrails, y Strict Human-In-The-Loop.
 */
async function runLiveAgentDemo() {
  console.log("==================================================");
  console.log("🔥 INICIANDO AGENTE MINT (API REAL GROK) 🔥");
  console.log("==================================================");

  const caseId = `case_live_${Date.now()}`;
  const caseTitle = "Falta de stock: Válvula";
  
  // Enviamos un caso con error tipográfico a propósito para probar el Fuzzy Search y el superpoder logístico.
  const caseDesc = "El sistema de almacén reporta que nos falta stock de la 'Valvula v900'. Por favor, comprueba si es necesario pedirla.";

  console.log(`\n1. 📥 Recibiendo caso entrante: [${caseId}]`);
  console.log(`   📝 Descripción: "${caseDesc}"`);

  await db
    .insert(cases)
    .values({
      id: caseId,
      title: caseTitle,
      description: caseDesc,
      status: "recibido",
      priority: "alta",
      inputData: {
        producto_id: "Valvula v900", // Error tipográfico intencional para probar Fuzzy Search
        solicitado_por: "sistema_almacen_monitoreo",
      },
    })
    .onConflictDoNothing();

  console.log("   ✅ Caso registrado en BD con estado 'recibido'.");

  console.log("\n2. 🧠 Iniciando Bucle de Razonamiento del Agente...");
  console.log("   📡 Conectando a modelo Grok vía API Real...");

  const startTime = Date.now();

  try {
    const report = await runAgentLoop(caseId, {
      maxSteps: 6,
    });

    const elapsed = Date.now() - startTime;

    console.log("\n==================================================");
    console.log("✅ EJECUCIÓN DEL AGENTE TERMINADA");
    console.log("==================================================");
    console.log(`- 📊 Estado Final: ${report.status.toUpperCase()}`);
    console.log(`- 🔄 Pasos de Pensamiento: ${report.totalSteps}`);
    console.log(`- 🪙 Tokens Consumidos: ${report.totalTokens}`);
    console.log(`- 💸 Costo Estimado de Grok: $${report.totalCost} USD`);
    console.log(`- ⏱️ Tiempo Transcurrido: ${(elapsed/1000).toFixed(2)}s`);
    console.log(`- 📄 Resumen del Agente: ${report.summary}`);
    if (report.reason) {
      console.log(`- 🔍 Razón/Justificación: ${report.reason}`);
    }

    // Verify database record
    const [savedCase] = await db.select().from(cases).where(eq(cases.id, caseId));
    console.log(`\n💾 Confirmación en BD: El caso ${savedCase.id} ha quedado en estado '${savedCase.status}'.`);
    console.log("==================================================");
  } catch (err: any) {
    console.error("❌ Error fatal en el agente:", err.message);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runLiveAgentDemo().catch((err) => {
    console.error("❌ Error general:", err);
    process.exit(1);
  });
}
