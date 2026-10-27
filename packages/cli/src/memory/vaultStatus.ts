import * as fs from "node:fs";
import * as path from "node:path";
import {
  VaultStatusReport,
  VaultNoteType,
  VaultNoteStatus,
  VaultConfidence,
} from "./vault.types";
import { getVaultDirectory } from "./vaultConfig";
import { getOrBuildVaultIndex } from "./vaultIndex";

/**
 * Obtiene el diagnóstico y estado completo de la memoria en vault
 */
export async function getVaultStatus(companyId: string): Promise<VaultStatusReport> {
  const vaultPath = getVaultDirectory(companyId);
  const exists = fs.existsSync(vaultPath);

  const notesByType: Record<VaultNoteType, number> = {
    empresa: 0,
    esquema: 0,
    entidad: 0,
    decision: 0,
    aprendizaje: 0,
    incidente: 0,
    pregunta: 0,
    reporte: 0,
    calidad: 0,
    sesion: 0,
  };

  const notesByStatus: Record<VaultNoteStatus, number> = {
    vigente: 0,
    obsoleta: 0,
    contradicha: 0,
    hipotesis: 0,
    sombra: 0,
  };

  const notesByConfidence: Record<VaultConfidence, number> = {
    confiable: 0,
    dudoso: 0,
    no_confiable: 0,
  };

  if (!exists) {
    return {
      companyId,
      vaultPath,
      totalNotes: 0,
      notesByType,
      notesByStatus,
      notesByConfidence,
      totalSizeBytes: 0,
      lastUpdated: null,
      hypothesesPending: 0,
      contradictedNotes: 0,
      expiredNotes: 0,
      isObsidianConfigured: false,
      hasGitRepo: false,
    };
  }

  const index = await getOrBuildVaultIndex(companyId);
  const entries = index.getAllEntries();

  let totalSizeBytes = 0;
  let lastUpdatedTime = 0;
  let expiredNotes = 0;
  const now = Date.now();

  for (const e of entries) {
    totalSizeBytes += e.sizeBytes;

    if (notesByType[e.tipo] !== undefined) {
      notesByType[e.tipo]++;
    }
    if (notesByStatus[e.estado] !== undefined) {
      notesByStatus[e.estado]++;
    }
    if (notesByConfidence[e.confianza] !== undefined) {
      notesByConfidence[e.confianza]++;
    }

    if (e.caduca && new Date(e.caduca).getTime() <= now) {
      expiredNotes++;
    }

    const t = new Date(e.actualizada).getTime();
    if (t > lastUpdatedTime) {
      lastUpdatedTime = t;
    }
  }

  const isObsidianConfigured =
    fs.existsSync(path.join(vaultPath, ".obsidian", "app.json")) &&
    fs.existsSync(path.join(vaultPath, ".obsidian", "graph.json"));

  const hasGitRepo = fs.existsSync(path.join(vaultPath, ".git"));

  return {
    companyId,
    vaultPath,
    totalNotes: entries.length,
    notesByType,
    notesByStatus,
    notesByConfidence,
    totalSizeBytes,
    lastUpdated: lastUpdatedTime > 0 ? new Date(lastUpdatedTime).toISOString() : null,
    hypothesesPending: notesByStatus.hipotesis || 0,
    contradictedNotes: notesByStatus.contradicha || 0,
    expiredNotes,
    isObsidianConfigured,
    hasGitRepo,
  };
}
