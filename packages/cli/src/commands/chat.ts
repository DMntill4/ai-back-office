import { sendChatApi, getBriefingApi } from "../client";
import { getSession } from "../keychain";

export async function chatCommand(message: string, options: { json?: boolean } = {}) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  try {
    const res = await sendChatApi(message, companyId);
    if (!res.success) {
      throw new Error("El agente no pudo procesar la solicitud.");
    }

    if (options.json) {
      console.log(JSON.stringify(res, null, 2));
      return;
    }

    console.log(`\n🤖 ASISTENTE AUTÓNOMO MINT [Caso: ${res.caseId}]`);
    console.log(`─`.repeat(70));
    console.log(res.response);
    console.log(`─`.repeat(70));
    console.log(`Estado: ${res.status} | Tokens: ${res.metrics?.totalTokens ?? 0} | Costo: $${res.metrics?.totalCostUsd ?? "0.00"} USD\n`);
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ error: err.message }));
    } else {
      console.error(`❌ Error en chat: ${err.message}`);
    }
    process.exit(1);
  }
}

export async function todayCommand(options: { json?: boolean } = {}) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  try {
    const res = await getBriefingApi(companyId);
    if (!res.success) {
      throw new Error("No se pudo obtener el resumen diario");
    }

    if (options.json) {
      console.log(JSON.stringify(res.data, null, 2));
      return;
    }

    const b = res.data;
    console.log(`\n☀️ RESUMEN DIARIO OPERATIVO (DAILY BRIEFING) [${companyId}]`);
    console.log(`─`.repeat(60));
    console.log(`Decisiones procesadas automáticamente:  ${b.autoExecutedCount}`);
    console.log(`Decisiones esperando al humano:         ${b.pendingReviewCount}`);
    console.log(`Operaciones bloqueadas por riesgo:      ${b.blockedRiskCount}`);
    console.log(`Dinero gestionado bajo umbral:          $${b.totalAutonomousSpendMxn.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`);
    console.log(`Ahorro logístico estimado:              $${b.estimatedSavingsMxn.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`);
    console.log(`Estado de salud del sistema:            ${b.systemHealth}`);
    console.log(`─`.repeat(60) + "\n");
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ error: err.message }));
    } else {
      console.error(`❌ Error en briefing: ${err.message}`);
    }
    process.exit(1);
  }
}
