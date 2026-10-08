import * as dotenv from "dotenv";
import { runAgentLoop } from "../src/agent/loop";
import { db, pool } from "../src/db/client";
import { cases } from "../src/db/schema";
import { eq } from "drizzle-orm";

dotenv.config();

/**
 * End-to-end execution of the agent using the real Grok LLM gateway.
 * Demonstrates real tool execution, real LLM decision-making, and case closing.
 */
async function runLiveAgentDemo() {
  console.log("==================================================");
  console.log("LIVE DEMO: END-TO-END AUTONOMOUS AGENT (GROK API)");
  console.log("==================================================");

  const caseId = `case_live_${Date.now()}`;
  const caseTitle = "Critical Stock Shortage: ST-200 Thermal Sensor";
  const caseDesc =
    "Warehouse system reports that prod_st200 has only 2 units available (safety threshold is 10). Needs automated restocking.";

  console.log(`\n1. Creating incoming case in database: [${caseId}]`);

  await db
    .insert(cases)
    .values({
      id: caseId,
      title: caseTitle,
      description: caseDesc,
      status: "recibido",
      priority: "alta",
      inputData: {
        producto_id: "prod_st200",
        stock_actual: 2,
        umbral_minimo: 10,
        solicitado_por: "sistema_almacen_monitoreo",
      },
    })
    .onConflictDoNothing();

  console.log("   Case registered with status 'recibido'.");

  console.log("\n2. Launching Agent Loop with live Grok API client...");
  console.log("   Model: grok-4.6 via gateway (https://api.reto.pltk.mx/v1)");

  const startTime = Date.now();

  try {
    const report = await runAgentLoop(caseId, {
      maxSteps: 6,
    });

    const elapsed = Date.now() - startTime;

    console.log("\n==================================================");
    console.log("EXECUTION COMPLETE");
    console.log("==================================================");
    console.log(`- Final Status: ${report.status.toUpperCase()}`);
    console.log(`- Total Steps: ${report.totalSteps}`);
    console.log(`- Total Tokens Consumed: ${report.totalTokens}`);
    console.log(`- Total Estimated Cost: $${report.totalCost} USD`);
    console.log(`- Elapsed Time: ${elapsed}ms`);
    console.log(`- Summary: ${report.summary}`);
    if (report.reason) {
      console.log(`- Reason: ${report.reason}`);
    }

    // Verify database record
    const [savedCase] = await db.select().from(cases).where(eq(cases.id, caseId));
    console.log(`\nDatabase confirmation: Case ${savedCase.id} is now '${savedCase.status}'.`);
    console.log("==================================================");
  } catch (err: any) {
    console.error("Live agent execution error:", err.message);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runLiveAgentDemo().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
