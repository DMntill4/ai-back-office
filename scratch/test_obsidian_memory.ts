import fs from "node:fs";
import path from "node:path";
import {
  recordDecisionNote,
  recordQuarantineNote,
  recordPendingQuestionNote,
  appendDailyAuditLog,
  getVaultStats,
  syncVaultFromDatabase,
  searchObsidianMemory,
  getObsidianVaultPath,
} from "../packages/core/src/services/obsidianMemoryService";

async function main() {
  console.log("=================================================");
  console.log("INICIANDO PRUEBAS DE MEMORIA VIVA EN OBSIDIAN VAULT");
  console.log("=================================================\n");

  const testCompanyId = "comp_test_obsidian";
  const testVaultDir = path.resolve(process.cwd(), "vault_test_temp");
  process.env.OBSIDIAN_VAULT_PATH = testVaultDir;

  try {
    // Limpieza previa
    if (fs.existsSync(testVaultDir)) {
      fs.rmSync(testVaultDir, { recursive: true, force: true });
    }

    // 1. Probar ruta del vault
    const vaultPath = await getObsidianVaultPath(testCompanyId);
    console.log(`[PASS] 1. Ruta de Vault resuelta correctamente: ${vaultPath}`);

    // 2. Grabar Nota de Decisión
    const decFile = await recordDecisionNote({
      id: "dec_test_001",
      companyId: testCompanyId,
      caseId: "case_stock_valve",
      actionType: "crear_orden_compra",
      proposingAgent: "compras_agent",
      title: "Reabastecimiento de Válvulas Industriales ST-200",
      costMxn: 12500,
      riskScore: 0.12,
      reversible: true,
      policyDecision: "pending_approval",
      policyReason: "Requiere aprobacion humana por superar umbral",
      evidencePayload: { sku: "VALV-200", cantidad: 50 },
      riskPayload: { score: 0.12 },
      decidedAt: new Date("2026-10-27T10:00:00Z"),
    });

    if (!fs.existsSync(decFile)) {
      throw new Error(`Archivo de decisión no creado en ${decFile}`);
    }
    const decContent = fs.readFileSync(decFile, "utf8");
    if (!decContent.includes("tipo: \"decision_agente\"") || !decContent.includes("[[case_stock_valve]]")) {
      throw new Error("Formato de nota de decisión inválido (falta frontmatter o WikiLinks)");
    }
    console.log("[PASS] 2. Nota de decisión grabada con YAML frontmatter y WikiLinks");

    // 3. Grabar Nota de Cuarentena
    const quarFile = await recordQuarantineNote({
      id: "quar_test_001",
      companyId: testCompanyId,
      entityType: "products",
      sourceTable: "legacy_articulos",
      recordIdentifier: "ART-9999",
      violationType: "negative_value",
      reason: "Precio de venta negativo detectado: -45.00",
      severity: "ERROR",
      rawPayload: { id: "ART-9999", precio: -45.0 },
      createdAt: new Date("2026-10-27T10:05:00Z"),
    });

    if (!fs.existsSync(quarFile)) {
      throw new Error(`Archivo de cuarentena no creado en ${quarFile}`);
    }
    const quarContent = fs.readFileSync(quarFile, "utf8");
    if (!quarContent.includes("tipo: \"registro_cuarentena\"") || !quarContent.includes("ART-9999")) {
      throw new Error("Formato de nota de cuarentena inválido");
    }
    console.log("[PASS] 3. Nota de cuarentena aislada grabada correctamente");

    // 4. Grabar Pregunta Pendiente
    const qFile = await recordPendingQuestionNote({
      id: "q_test_001",
      companyId: testCompanyId,
      topic: "supplier_missing",
      question: "No tengo este dato: Cual es el proveedor homologado para el SKU VALV-200?",
      context: { sku: "VALV-200" },
      status: "pending",
      createdAt: new Date("2026-10-27T10:10:00Z"),
    });

    if (!fs.existsSync(qFile)) {
      throw new Error(`Archivo de pregunta no creado en ${qFile}`);
    }
    const qContent = fs.readFileSync(qFile, "utf8");
    if (!qContent.includes("tipo: \"pregunta_operador\"") || !qContent.includes("VALV-200")) {
      throw new Error("Formato de nota de pregunta pendiente inválido");
    }
    console.log("[PASS] 4. Nota de pregunta pendiente grabada con éxito");

    // 5. Responder la Pregunta y actualizar nota
    await recordPendingQuestionNote({
      id: "q_test_001",
      companyId: testCompanyId,
      topic: "supplier_missing",
      question: "No tengo este dato: Cual es el proveedor homologado para el SKU VALV-200?",
      context: { sku: "VALV-200" },
      status: "answered",
      answer: "Proveedor Válvulas del Norte S.A., contacto comercial@valvulasnorte.com",
      answeredBy: "SUPERVISOR_OPERATIVO",
      createdAt: new Date("2026-10-27T10:10:00Z"),
      answeredAt: new Date("2026-10-27T10:25:00Z"),
    });

    const qAnsweredContent = fs.readFileSync(qFile, "utf8");
    if (!qAnsweredContent.includes("estado: \"answered\"") || !qAnsweredContent.includes("SUPERVISOR_OPERATIVO")) {
      throw new Error("Actualización de respuesta en Obsidian falló");
    }
    console.log("[PASS] 5. Actualización de respuesta del operador reflejada en Obsidian");

    // 6. Verificar Diario de Auditoría (Daily Log)
    const logDateKey = "2026-10-27";
    const logPath = path.join(testVaultDir, "Auditoria", `LOG-${logDateKey}.md`);
    if (!fs.existsSync(logPath)) {
      throw new Error(`Diario de auditoría no existe en ${logPath}`);
    }
    const logContent = fs.readFileSync(logPath, "utf8");
    if (!logContent.includes("tipo: \"diario_auditoria\"") || !logContent.includes("dec_test_001")) {
      throw new Error("Contenido del diario de auditoría incompleto");
    }
    console.log("[PASS] 6. Diario diario de auditoria cronologico (Daily Log) verificado");

    // 7. Estadísticas del Vault
    const stats = await getVaultStats(testCompanyId);
    if (stats.totalDecisiones !== 1 || stats.totalCuarentena !== 1 || stats.totalPreguntas !== 1) {
      throw new Error(`Estadísticas de notas incorrectas: ${JSON.stringify(stats)}`);
    }
    console.log(`[PASS] 7. Estadísticas de Vault correctas (Total notas: ${stats.totalNotas})`);

    // 8. Búsqueda semántica / textual en Obsidian Memory
    const searchRes = await searchObsidianMemory("valvulas", testCompanyId);
    if (searchRes.length === 0) {
      throw new Error("La búsqueda en Obsidian no encontró resultados para 'valvulas'");
    }
    console.log(`[PASS] 8. Búsqueda de memoria viva en Obsidian: ${searchRes.length} notas encontradas`);

    console.log("\n=================================================");
    console.log("TODAS LAS PRUEBAS DE OBSIDIAN MEMORY SUPERADAS (8/8)");
    console.log("=================================================");
  } finally {
    // Limpieza
    delete process.env.OBSIDIAN_VAULT_PATH;
    if (fs.existsSync(testVaultDir)) {
      fs.rmSync(testVaultDir, { recursive: true, force: true });
    }
  }
}

main().catch((err) => {
  console.error("[FAIL] Error en pruebas de Obsidian Memory:", err);
  process.exit(1);
});
