import * as fs from "node:fs";
import * as path from "node:path";

const ROOT_DIR = path.resolve(__dirname, "..");

// Mapeo determinista de reemplazo de emojis a etiquetas claras de texto
const REPLACEMENTS: Array<{ search: RegExp; replace: string }> = [
  // Severidades y Estados
  { search: /✅/g, replace: "[OK]" },
  { search: /✔/g, replace: "[OK]" },
  { search: /❌/g, replace: "[ERROR]" },
  { search: /✖/g, replace: "[ERROR]" },
  { search: /⚠️\s*/g, replace: "[AVISO] " },
  { search: /⚠️/g, replace: "[AVISO]" },
  { search: /🚨\s*/g, replace: "[CRITICO] " },
  { search: /🚨/g, replace: "[CRITICO]" },
  { search: /🔴\s*/g, replace: "[CRITICO] " },
  { search: /🔴/g, replace: "[CRITICO]" },
  { search: /🟡\s*/g, replace: "[ADVERTENCIA] " },
  { search: /🟡/g, replace: "[ADVERTENCIA]" },
  { search: /⏳\s*/g, replace: "[PENDIENTE] " },
  { search: /⏳/g, replace: "[PENDIENTE]" },
  { search: /ℹ️\s*/g, replace: "[INFO] " },
  { search: /ℹ️/g, replace: "[INFO]" },
  { search: /💡\s*/g, replace: "[SUGERENCIA] " },
  { search: /💡/g, replace: "[SUGERENCIA]" },
  { search: /🏆\s*/g, replace: "[TOP] " },
  { search: /🏆/g, replace: "[TOP]" },
  { search: /🚫\s*/g, replace: "[BLOQUEADO] " },
  { search: /🚫/g, replace: "[BLOQUEADO]" },
  { search: /🌟\s*/g, replace: "[EXITO] " },
  { search: /🌟/g, replace: "[EXITO]" },
  { search: /🎉\s*/g, replace: "[EXITO] " },
  { search: /🎉/g, replace: "[EXITO]" },
  { search: /🚀\s*/g, replace: "[INICIO] " },
  { search: /🚀/g, replace: "[INICIO]" },
  { search: /🤖\s*/g, replace: "[AGENTE] " },
  { search: /🤖/g, replace: "[AGENTE]" },
  { search: /📦\s*/g, replace: "[PAQUETE] " },
  { search: /📦/g, replace: "[PAQUETE]" },
  { search: /🛒\s*/g, replace: "[VENTA] " },
  { search: /🛒/g, replace: "[VENTA]" },
  { search: /🍃\s*/g, replace: "[MINT] " },
  { search: /🍃/g, replace: "[MINT]" },
  { search: /⚡\s*/g, replace: "[ACCION] " },
  { search: /⚡/g, replace: "[ACCION]" },
  { search: /🛡️?\s*/g, replace: "[SEGURIDAD] " },
  { search: /🛡️?/g, replace: "[SEGURIDAD]" },
  { search: /🧠\s*/g, replace: "[SISTEMA] " },
  { search: /🧠/g, replace: "[SISTEMA]" },
  { search: /🖥️?\s*/g, replace: "[APP] " },
  { search: /🛑\s*/g, replace: "[STOP] " },
  { search: /📋\s*/g, replace: "[LISTA] " },
  { search: /✨\s*/g, replace: "[OK] " },
  { search: /🩺\s*/g, replace: "[DOCTOR] " },
  { search: /🔔\s*/g, replace: "[NOTIF] " },
  { search: /📡\s*/g, replace: "[CANAL] " },
  { search: /⚪\s*/g, replace: "[O] " },
  { search: /🔍\s*/g, replace: "[BUSQUEDA] " },
  { search: /🐘\s*/g, replace: "[POSTGRES] " },
  { search: /🗄️?\s*/g, replace: "[SQLITE] " },
  { search: /🔬\s*/g, replace: "[INSPECCION] " },
  { search: /📂\s*/g, replace: "[SYNC] " },
  { search: /⏱️?\s*/g, replace: "[FRESCURA] " },
  { search: /⚠\s*/g, replace: "[AVISO] " },
  { search: /⚠/g, replace: "[AVISO]" },
  { search: /👁\s*/g, replace: "" },
  { search: /💻\s*/g, replace: "" },
  { search: /🏛️?\s*/g, replace: "" },
  { search: /\uFE0F/g, replace: "" }, // Variation selector-16
  { search: /\uFE0E/g, replace: "" }, // Variation selector-15
];

// Archivos reportados con hallazgos (excluyendo packages/app)
const FILES_TO_CLEAN = [
  "packages/cli/src/commands/app.ts",
  "packages/cli/src/commands/audit.ts",
  "packages/cli/src/commands/autonomy.ts",
  "packages/cli/src/commands/briefing.ts",
  "packages/cli/src/commands/console.ts",
  "packages/cli/src/commands/daemon.ts",
  "packages/cli/src/commands/dataHealth.ts",
  "packages/cli/src/commands/doctor.ts",
  "packages/cli/src/commands/explain.ts",
  "packages/cli/src/commands/mapping.ts",
  "packages/cli/src/commands/notify.ts",
  "packages/cli/src/commands/profile.ts",
  "packages/cli/src/commands/setup.ts",
  "packages/cli/src/commands/shadow.ts",
  "packages/cli/src/commands/source.ts",
  "packages/cli/src/commands/team.ts",
  "packages/cli/src/commands/track.ts",
  "packages/cli/src/commands/whoami.ts",
  "packages/cli/src/ui/spinner.ts",
  "packages/cli/src/ui/theme.ts",
  "packages/core/src/agent/prompts/base.md",
  "packages/core/src/agent/skills/executive_analytics.md",
  "packages/core/src/agent/skills/financial_maestro.md",
  "packages/core/src/agent/skills/procurement_negotiator.md",
  "packages/core/src/agent/skills/security_guardrails.md",
  "packages/core/src/agent/skills/supply_chain_crisis.md",
  "packages/core/src/agent/superpowers.ts",
  "packages/core/src/agent/toolsDefinition.ts",
  "packages/core/src/db/ensureDecisionsTables.ts",
  "packages/core/src/db/seed/index.ts",
  "packages/core/src/services/logisticsCoordinatorService.ts",
  "packages/core/src/tools/ajustarStock.ts",
  "packages/notifiers/src/adapters/discordAdapter.ts",
  "packages/notifiers/src/adapters/gmailAdapter.ts",
  "packages/notifiers/src/adapters/slackAdapter.ts",
  "packages/notifiers/src/adapters/telegramAdapter.ts",
  "packages/notifiers/src/salesChannelListener.ts",
  "scratch/test_corrupt_data_and_fixtures.ts",
  "scratch/test_final_acceptance.ts",
  "README.md",
];

function cleanFile(relPath: string) {
  const full = path.join(ROOT_DIR, relPath);
  if (!fs.existsSync(full)) {
    console.warn(`Archivo no encontrado: ${relPath}`);
    return;
  }

  let content = fs.readFileSync(full, "utf8");
  const original = content;

  for (const { search, replace } of REPLACEMENTS) {
    content = content.replace(search, replace);
  }

  // Ajustes de dobles corchetes si surgieron (ej: [[OK]] -> [OK])
  content = content.replace(/\[\[(OK|ERROR|AVISO|CRITICO|INFO|SEGURIDAD|ACCION|ADVERTENCIA)\]\]/g, "[$1]");
  // Limpieza de espacios redundantes creados por sustitución
  content = content.replace(/\[(OK|ERROR|AVISO|CRITICO|INFO|SEGURIDAD|ACCION|ADVERTENCIA)\]\s+\[/g, "[$1] [");

  if (content !== original) {
    fs.writeFileSync(full, content, "utf8");
    console.log(`[LIMPIADO] ${relPath}`);
  } else {
    console.log(`[SIN CAMBIOS] ${relPath}`);
  }
}

for (const f of FILES_TO_CLEAN) {
  cleanFile(f);
}

console.log("\nLimpieza completada.");
