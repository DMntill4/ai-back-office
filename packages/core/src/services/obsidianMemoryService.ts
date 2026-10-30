import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { db } from "../db/client";
import { decisions, businessConfig } from "../db/schema";
import { mintQuarantineRecords, mintPendingQuestions } from "../db/schema/mintEntities";
import { eq, desc } from "drizzle-orm";

export interface DecisionNoteParams {
  id: string;
  companyId: string;
  caseId: string;
  actionType: string;
  proposingAgent: string;
  title: string;
  costMxn?: string | number | null;
  riskScore?: string | number | null;
  reversible?: boolean;
  policyDecision: string;
  policyReason?: string | null;
  evidencePayload?: Record<string, any>;
  riskPayload?: Record<string, any>;
  decidedAt?: Date | string;
  approvedBy?: string | null;
}

export interface QuarantineNoteParams {
  id: string;
  companyId: string;
  entityType: string;
  sourceTable: string;
  recordIdentifier?: string | null;
  violationType: string;
  reason: string;
  severity?: string;
  rawPayload?: Record<string, any>;
  createdAt?: Date | string;
}

export interface PendingQuestionNoteParams {
  id: string;
  companyId: string;
  topic: string;
  question: string;
  context?: Record<string, any>;
  status: "pending" | "answered" | "dismissed";
  answer?: string | null;
  answeredBy?: string | null;
  createdAt?: Date | string;
  answeredAt?: Date | string | null;
}

export interface DailyAuditEntryParams {
  companyId: string;
  action: string;
  details: string;
  relatedNoteLink?: string;
  timestamp?: Date;
}

export interface VaultStats {
  vaultPath: string;
  totalDecisiones: number;
  totalCuarentena: number;
  totalPreguntas: number;
  totalAuditorias: number;
  totalNotas: number;
}

/**
 * Obtiene la ruta del Vault de Obsidian configurada.
 * Prioridad:
 * 1. process.env.OBSIDIAN_VAULT_PATH
 * 2. businessConfig (clave: obsidian_vault_path)
 * 3. Fallback: <workspace>/vault o ~/.mint/vault
 */
export async function getObsidianVaultPath(companyId?: string): Promise<string> {
  if (process.env.OBSIDIAN_VAULT_PATH) {
    return path.resolve(process.env.OBSIDIAN_VAULT_PATH);
  }

  if (companyId) {
    try {
      const { and } = await import("drizzle-orm");
      const [conf] = await db
        .select()
        .from(businessConfig)
        .where(
          and(
            eq(businessConfig.companyId, companyId),
            eq(businessConfig.key, "obsidian_vault_path"),
          ),
        )
        .limit(1);

      if (conf?.value && typeof conf.value === "string") {
        return path.resolve(conf.value);
      }
    } catch {
      // Continuar con fallback
    }
  }

  // Fallback seguro: directorio 'vault' dentro del proyecto
  return path.resolve(process.cwd(), "vault");
}

/**
 * Asegura la existencia de los subdirectorios estructurados del Vault.
 */
export function ensureVaultDirectories(vaultPath: string): {
  decisionesDir: string;
  cuarentenaDir: string;
  preguntasDir: string;
  auditoriaDir: string;
} {
  const decisionesDir = path.join(vaultPath, "Decisiones");
  const cuarentenaDir = path.join(vaultPath, "Cuarentena");
  const preguntasDir = path.join(vaultPath, "Preguntas");
  const auditoriaDir = path.join(vaultPath, "Auditoria");

  for (const dir of [decisionesDir, cuarentenaDir, preguntasDir, auditoriaDir]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  return { decisionesDir, cuarentenaDir, preguntasDir, auditoriaDir };
}

function formatDateISO(d?: Date | string): string {
  if (!d) return new Date().toISOString();
  return typeof d === "string" ? d : d.toISOString();
}

function getDateKey(d?: Date | string): string {
  const iso = formatDateISO(d);
  return iso.slice(0, 10);
}

function getTimeString(d?: Date | string): string {
  const date = d ? (typeof d === "string" ? new Date(d) : d) : new Date();
  return date.toTimeString().slice(0, 8);
}

/**
 * Escribe o actualiza una nota de decisión autónoma en Obsidian con frontmatter YAML y WikiLinks.
 */
export async function recordDecisionNote(params: DecisionNoteParams): Promise<string> {
  const vaultPath = await getObsidianVaultPath(params.companyId);
  const { decisionesDir } = ensureVaultDirectories(vaultPath);

  const cleanId = params.id.startsWith("dec_") ? params.id : `dec_${params.id}`;
  const noteName = `DEC-${cleanId.replace(/^dec_/, "")}.md`;
  const filePath = path.join(decisionesDir, noteName);

  const dateIso = formatDateISO(params.decidedAt);
  const dateKey = getDateKey(params.decidedAt);
  const cost = params.costMxn !== undefined && params.costMxn !== null ? String(params.costMxn) : "0";

  const frontmatter = [
    "---",
    `id: "${params.id}"`,
    `tipo: "decision_agente"`,
    `fecha: "${dateIso}"`,
    `empresa: "${params.companyId}"`,
    `caso: "${params.caseId}"`,
    `agente: "${params.proposingAgent}"`,
    `accion: "${params.actionType}"`,
    `costo_estimado: ${cost}`,
    `riesgo_score: ${params.riskScore ?? 0}`,
    `reversible: ${Boolean(params.reversible)}`,
    `dictamen_politica: "${params.policyDecision}"`,
    `aprobado_por: "${params.approvedBy || "SISTEMA_AUTONOMO"}"`,
    "tags:",
    "  - mint",
    "  - decision",
    `  - ${params.actionType}`,
    `  - ${params.policyDecision}`,
    "---",
  ].join("\n");

  const body = [
    `# Decision: [[${params.id}]] - ${params.title}`,
    "",
    "## Resumen Operativo",
    `- **ID Decision**: \`${params.id}\``,
    `- **Caso Relacionado**: [[${params.caseId}]]`,
    `- **Agente Proponente**: \`${params.proposingAgent}\``,
    `- **Tipo de Accion**: \`${params.actionType}\``,
    `- **Costo Estimado**: $${cost}`,
    `- **Dictamen de Politica**: \`${params.policyDecision}\``,
    params.policyReason ? `- **Motivo de Politica**: ${params.policyReason}` : "",
    "",
    "## Evaluacion de Riesgo y Seguridad",
    `- **Nivel de Riesgo**: ${params.riskScore ?? 0}`,
    `- **Reversible**: ${params.reversible ? "Si (Accion de bajo impacto con rollback)" : "No (Requiere aprobacion estricta)"}`,
    "",
    "## Evidencia y Contexto",
    "```json",
    JSON.stringify(params.evidencePayload || {}, null, 2),
    "```",
    "",
    "## Enlaces Relacionados",
    `- Ver registro diario de auditoria: [[Auditoria/LOG-${dateKey}|LOG-${dateKey}]]`,
    `- Registro de caso: [[Casos/${params.caseId}|${params.caseId}]]`,
  ]
    .filter(Boolean)
    .join("\n");

  fs.writeFileSync(filePath, `${frontmatter}\n\n${body}\n`, "utf8");

  // Registrar en el Daily Log de Auditoría
  await appendDailyAuditLog({
    companyId: params.companyId,
    action: `Decision ${params.id}: ${params.title}`,
    details: `Dictamen: ${params.policyDecision}. Agente: ${params.proposingAgent}. Costo: $${cost}`,
    relatedNoteLink: `[[Decisiones/DEC-${cleanId.replace(/^dec_/, "")}|${params.id}]]`,
    timestamp: params.decidedAt ? new Date(params.decidedAt) : new Date(),
  });

  return filePath;
}

/**
 * Registra un incidente de cuarentena en Obsidian.
 */
export async function recordQuarantineNote(params: QuarantineNoteParams): Promise<string> {
  const vaultPath = await getObsidianVaultPath(params.companyId);
  const { cuarentenaDir } = ensureVaultDirectories(vaultPath);

  const cleanId = params.id.startsWith("quar_") ? params.id : `quar_${params.id}`;
  const noteName = `QUAR-${cleanId.replace(/^quar_/, "")}.md`;
  const filePath = path.join(cuarentenaDir, noteName);

  const dateIso = formatDateISO(params.createdAt);
  const dateKey = getDateKey(params.createdAt);

  const frontmatter = [
    "---",
    `id: "${params.id}"`,
    `tipo: "registro_cuarentena"`,
    `fecha: "${dateIso}"`,
    `empresa: "${params.companyId}"`,
    `entidad: "${params.entityType}"`,
    `tabla_origen: "${params.sourceTable}"`,
    `identificador_registro: "${params.recordIdentifier || "N/A"}"`,
    `tipo_violacion: "${params.violationType}"`,
    `severidad: "${params.severity || "ERROR"}"`,
    "tags:",
    "  - mint",
    "  - cuarentena",
    "  - anomalia_datos",
    `  - ${params.violationType}`,
    "---",
  ].join("\n");

  const body = [
    `# Aislamiento en Cuarentena: [[${params.id}]]`,
    "",
    "## Diagnostico de la Anomalia",
    `- **Tabla Origen**: \`${params.sourceTable}\``,
    `- **Entidad**: \`${params.entityType}\``,
    `- **Identificador del Registro**: \`${params.recordIdentifier || "N/A"}\``,
    `- **Tipo de Infraccion**: \`${params.violationType}\``,
    `- **Severidad**: \`${params.severity || "ERROR"}\``,
    `- **Motivo**: ${params.reason}`,
    "",
    "## Carga Aislada (Payload Crudo)",
    "```json",
    JSON.stringify(params.rawPayload || {}, null, 2),
    "```",
    "",
    "## Accion de Proteccion",
    "El registro fue aislado de las decisiones del agente autonomo para evitar decisiones sobre datos corrompidos.",
    "La tabla del cliente permanece intacta y no ha sido alterada.",
    "",
    "## Enlaces Relacionados",
    `- Ver registro diario de auditoria: [[Auditoria/LOG-${dateKey}|LOG-${dateKey}]]`,
  ].join("\n");

  fs.writeFileSync(filePath, `${frontmatter}\n\n${body}\n`, "utf8");

  await appendDailyAuditLog({
    companyId: params.companyId,
    action: `Registro aislado en cuarentena: ${params.recordIdentifier || params.id}`,
    details: `Tabla: ${params.sourceTable}. Infraccion: ${params.violationType}. Motivo: ${params.reason}`,
    relatedNoteLink: `[[Cuarentena/QUAR-${cleanId.replace(/^quar_/, "")}|${params.id}]]`,
    timestamp: params.createdAt ? new Date(params.createdAt) : new Date(),
  });

  return filePath;
}

/**
 * Registra o actualiza una pregunta pendiente al operador en Obsidian.
 */
export async function recordPendingQuestionNote(params: PendingQuestionNoteParams): Promise<string> {
  const vaultPath = await getObsidianVaultPath(params.companyId);
  const { preguntasDir } = ensureVaultDirectories(vaultPath);

  const cleanId = params.id.startsWith("q_") ? params.id : `q_${params.id}`;
  const noteName = `Q-${cleanId.replace(/^q_/, "")}.md`;
  const filePath = path.join(preguntasDir, noteName);

  const dateIso = formatDateISO(params.createdAt);
  const dateKey = getDateKey(params.createdAt);

  const frontmatter = [
    "---",
    `id: "${params.id}"`,
    `tipo: "pregunta_operador"`,
    `fecha: "${dateIso}"`,
    `empresa: "${params.companyId}"`,
    `tema: "${params.topic}"`,
    `estado: "${params.status}"`,
    params.answeredBy ? `respondido_por: "${params.answeredBy}"` : "",
    params.answeredAt ? `fecha_respuesta: "${formatDateISO(params.answeredAt)}"` : "",
    "tags:",
    "  - mint",
    "  - pregunta",
    "  - verdad_de_datos",
    `  - ${params.topic}`,
    `  - estado_${params.status}`,
    "---",
  ]
    .filter(Boolean)
    .join("\n");

  const answerSection =
    params.status === "answered"
      ? [
          "## Respuesta Confirmada por el Operador",
          `> ${params.answer || "Confirmado sin texto adicional"}`,
          "",
          `- **Respondido por**: \`${params.answeredBy || "OPERADOR"}\``,
          `- **Fecha de Resolucion**: \`${params.answeredAt ? formatDateISO(params.answeredAt) : "N/A"}\``,
        ].join("\n")
      : [
          "## Estado: Pendiente de Confirmacion",
          "_MINT no inventa este dato. Permanece a la espera de que el operador humano lo defina a traves de `mint questions answer <id> <respuesta>`._",
        ].join("\n");

  const body = [
    `# Pregunta al Operador: [[${params.id}]]`,
    "",
    "## Pregunta Formulada por MINT",
    `> ${params.question}`,
    "",
    `- **ID Pregunta**: \`${params.id}\``,
    `- **Tema**: \`${params.topic}\``,
    `- **Estado**: \`${params.status.toUpperCase()}\``,
    `- **Fecha de Creacion**: \`${dateIso}\``,
    "",
    answerSection,
    "",
    "## Contexto de la Deteccion",
    "```json",
    JSON.stringify(params.context || {}, null, 2),
    "```",
    "",
    "## Enlaces Relacionados",
    `- Ver registro diario de auditoria: [[Auditoria/LOG-${dateKey}|LOG-${dateKey}]]`,
  ].join("\n");

  fs.writeFileSync(filePath, `${frontmatter}\n\n${body}\n`, "utf8");

  return filePath;
}

/**
 * Agrega un registro al diario cronológico de auditoría (Daily Log) en Obsidian.
 */
export async function appendDailyAuditLog(params: DailyAuditEntryParams): Promise<string> {
  const vaultPath = await getObsidianVaultPath(params.companyId);
  const { auditoriaDir } = ensureVaultDirectories(vaultPath);

  const timestamp = params.timestamp || new Date();
  const dateKey = getDateKey(timestamp);
  const timeKey = getTimeString(timestamp);
  const filePath = path.join(auditoriaDir, `LOG-${dateKey}.md`);

  if (!fs.existsSync(filePath)) {
    const header = [
      "---",
      `tipo: "diario_auditoria"`,
      `fecha: "${dateKey}"`,
      `empresa: "${params.companyId}"`,
      "tags:",
      "  - mint",
      "  - auditoria_diaria",
      "---",
      "",
      `# Diario de Auditoria Autonoma: [[LOG-${dateKey}]]`,
      "",
      `Registro cronologico de acciones, decisiones y detecciones de MINT para el dia **${dateKey}**.`,
      "",
      "## Eventos Cronologicos",
      "",
    ].join("\n");
    fs.writeFileSync(filePath, header, "utf8");
  }

  const linkPart = params.relatedNoteLink ? ` (${params.relatedNoteLink})` : "";
  const entryLine = `- **[${timeKey}]** ${params.action}${linkPart} — _${params.details}_\n`;
  fs.appendFileSync(filePath, entryLine, "utf8");

  return filePath;
}

/**
 * Retorna las estadísticas del Vault de Obsidian.
 */
export async function getVaultStats(companyId?: string): Promise<VaultStats> {
  const vaultPath = await getObsidianVaultPath(companyId);
  const { decisionesDir, cuarentenaDir, preguntasDir, auditoriaDir } = ensureVaultDirectories(vaultPath);

  const countMd = (dir: string) =>
    fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".md")).length : 0;

  const totalDecisiones = countMd(decisionesDir);
  const totalCuarentena = countMd(cuarentenaDir);
  const totalPreguntas = countMd(preguntasDir);
  const totalAuditorias = countMd(auditoriaDir);

  return {
    vaultPath,
    totalDecisiones,
    totalCuarentena,
    totalPreguntas,
    totalAuditorias,
    totalNotas: totalDecisiones + totalCuarentena + totalPreguntas + totalAuditorias,
  };
}

/**
 * Sincroniza retroactivamente todos los registros de la base de datos hacia el Vault de Obsidian.
 */
export async function syncVaultFromDatabase(companyId: string): Promise<{
  syncedDecisions: number;
  syncedQuarantine: number;
  syncedQuestions: number;
}> {
  let syncedDecisions = 0;
  let syncedQuarantine = 0;
  let syncedQuestions = 0;

  try {
    // 1. Sincronizar Decisiones
    const dbDecisions = await db
      .select()
      .from(decisions)
      .where(eq(decisions.companyId, companyId))
      .orderBy(desc(decisions.createdAt))
      .limit(50);

    for (const d of dbDecisions) {
      await recordDecisionNote({
        id: d.id,
        companyId: d.companyId,
        caseId: d.caseId,
        actionType: d.actionType,
        proposingAgent: d.proposingAgent,
        title: d.title,
        costMxn: d.costMxn,
        riskScore: d.riskScore,
        reversible: d.reversible,
        policyDecision: d.policyDecision,
        policyReason: d.policyReason,
        evidencePayload: (d.evidencePayload as Record<string, any>) || {},
        riskPayload: (d.riskPayload as Record<string, any>) || {},
        decidedAt: d.decidedAt || d.createdAt,
        approvedBy: d.approvedBy,
      });
      syncedDecisions++;
    }
  } catch (err: any) {
    console.warn("[OBSIDIAN_SYNC] Error sincronizando decisiones:", err.message);
  }

  try {
    // 2. Sincronizar Cuarentena
    const dbQuarantine = await db
      .select()
      .from(mintQuarantineRecords)
      .where(eq(mintQuarantineRecords.companyId, companyId))
      .orderBy(desc(mintQuarantineRecords.createdAt));

    for (const q of dbQuarantine) {
      await recordQuarantineNote({
        id: q.id,
        companyId: q.companyId,
        entityType: q.entityType,
        sourceTable: q.sourceTable,
        recordIdentifier: q.recordIdentifier,
        violationType: q.violationType,
        reason: q.reason,
        severity: q.severity,
        rawPayload: (q.rawPayload as Record<string, any>) || {},
        createdAt: q.createdAt,
      });
      syncedQuarantine++;
    }
  } catch (err: any) {
    console.warn("[OBSIDIAN_SYNC] Error sincronizando cuarentena:", err.message);
  }

  try {
    // 3. Sincronizar Preguntas Pendientes
    const dbQuestions = await db
      .select()
      .from(mintPendingQuestions)
      .where(eq(mintPendingQuestions.companyId, companyId))
      .orderBy(desc(mintPendingQuestions.createdAt));

    for (const q of dbQuestions) {
      await recordPendingQuestionNote({
        id: q.id,
        companyId: q.companyId,
        topic: q.topic,
        question: q.question,
        context: (q.context as Record<string, any>) || {},
        status: q.status as any,
        answer: q.answer,
        answeredBy: q.answeredBy,
        createdAt: q.createdAt,
        answeredAt: q.answeredAt,
      });
      syncedQuestions++;
    }
  } catch (err: any) {
    console.warn("[OBSIDIAN_SYNC] Error sincronizando preguntas:", err.message);
  }

  return { syncedDecisions, syncedQuarantine, syncedQuestions };
}

/**
 * Búsqueda simple de texto en las notas del Vault de Obsidian para alimentar memoria al agente.
 */
export async function searchObsidianMemory(
  query: string,
  companyId?: string,
): Promise<Array<{ file: string; title: string; snippet: string }>> {
  const vaultPath = await getObsidianVaultPath(companyId);
  if (!fs.existsSync(vaultPath)) return [];

  const results: Array<{ file: string; title: string; snippet: string }> = [];
  const lowerQuery = query.toLowerCase();

  function scanDir(dir: string) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.name.endsWith(".md")) {
        const content = fs.readFileSync(fullPath, "utf8");
        // Aislamiento Multi-Tenant: Si se especifica companyId, ignorar notas pertenecientes a otras empresas
        if (companyId) {
          const matchCompany = content.match(/empresa:\s*["']?([^"'\r\n]+)["']?/i);
          if (matchCompany && matchCompany[1] && matchCompany[1] !== companyId) {
            continue;
          }
        }
        if (content.toLowerCase().includes(lowerQuery)) {
          const lines = content.split("\n");
          const titleLine = lines.find((l) => l.startsWith("# ")) || entry.name;
          const matchLine = lines.find((l) => l.toLowerCase().includes(lowerQuery) && !l.startsWith("# ")) || "";
          results.push({
            file: path.relative(vaultPath, fullPath).replace(/\\/g, "/"),
            title: titleLine.replace(/^#\s*/, ""),
            snippet: matchLine.trim().slice(0, 200),
          });
        }
      }
    }
  }

  scanDir(vaultPath);
  return results.slice(0, 10);
}
