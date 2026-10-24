import { db, businessConfig } from "@mint/core";
import { getSession } from "../keychain";
import { eq, and } from "drizzle-orm";

export async function autonomyGetCommand(options: { json?: boolean } = {}) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  try {
    const configRow = await db
      .select()
      .from(businessConfig)
      .where(and(eq(businessConfig.companyId, companyId), eq(businessConfig.key, "autonomy_level")))
      .limit(1);

    const level = configRow.length > 0 ? configRow[0].value : "dry-run";

    if (options.json) {
      console.log(JSON.stringify({ companyId, autonomyLevel: level }));
      return;
    }

    console.log(`\n[AUTONOMÍA] NIVEL DE AUTONOMÍA ACTIVO [Empresa: ${companyId}]`);
    console.log(`   Modo actual:  ${level.toUpperCase()}`);
    if (level === "dry-run") {
      console.log(`   Descripción:  Modo seguro. Las propuestas se generan con evidencia completa pero NUNCA se ejecutan solas.`);
    } else if (level === "assisted") {
      console.log(`   Descripción:  Asistido. Autoejecuta operaciones seguras bajo el umbral ($10,000 MXN) y escala el resto a HITL.`);
    } else if (level === "auto") {
      console.log(`   Descripción:  Autónomo total. Autoejecuta órdenes válidas salvo banderas rojas críticas del agente de riesgo.`);
    }
    console.log("");
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ success: false, error: err.message }));
    } else {
      console.error(`[ERROR] Error al consultar nivel de autonomía: ${err.message}`);
    }
    process.exit(1);
  }
}

export async function autonomySetCommand(
  level: string,
  options: { json?: boolean } = {},
) {
  const validLevels = ["dry-run", "assisted", "auto"];
  const normalizedLevel = level.toLowerCase().trim();

  if (!validLevels.includes(normalizedLevel)) {
    console.error(`[ERROR] Nivel inválido: "${level}". Opciones válidas: ${validLevels.join(", ")}`);
    process.exit(1);
  }

  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  try {
    await db
      .insert(businessConfig)
      .values({
        companyId,
        key: "autonomy_level",
        value: normalizedLevel,
        description: "Nivel de autonomía operativa (dry-run, assisted, auto)",
      })
      .onConflictDoUpdate({
        target: [businessConfig.companyId, businessConfig.key],
        set: {
          value: normalizedLevel,
          updatedAt: new Date(),
        },
      });

    if (options.json) {
      console.log(JSON.stringify({ success: true, companyId, autonomyLevel: normalizedLevel }));
      return;
    }

    console.log(`\n[OK] NIVEL DE AUTONOMÍA ACTUALIZADO [Empresa: ${companyId}]`);
    console.log(`   Nuevo modo: ${normalizedLevel.toUpperCase()}\n`);
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ success: false, error: err.message }));
    } else {
      console.error(`[ERROR] Error al actualizar nivel de autonomía: ${err.message}`);
    }
    process.exit(1);
  }
}
