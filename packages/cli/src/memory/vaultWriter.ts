import * as fs from "node:fs";
import * as path from "node:path";
import { exec } from "node:child_process";
import {
  VaultFrontmatter,
  VaultNote,
  VaultWriteOptions,
  VaultNoteType,
} from "./vault.types";
import {
  ensureVaultStructure,
  getVaultDirectory,
  VAULT_SUBFOLDERS,
} from "./vaultConfig";
import { withVaultLock } from "./vaultLock";
import {
  resolveSafeVaultPath,
  slugifyFilename,
  maskSensitiveSecrets,
  validateNoteSize,
} from "./sanitizer";
import { getOrBuildVaultIndex, parseVaultNote } from "./vaultIndex";
import { mintSpiderEventBus } from "../graph/eventBus";

const MIN_EVIDENCES_FOR_VIGENTE = 3;

/**
 * Módulo de Escritura Atómica y Segura del Vault de MINT
 */
export async function writeVaultNote(
  companyId: string,
  frontmatterInput: Partial<VaultFrontmatter> & {
    tipo: VaultNoteType;
    id_origen: string;
    titulo: string;
  },
  bodyContent: string,
  options: VaultWriteOptions = {}
): Promise<VaultNote> {
  const vaultRoot = await ensureVaultStructure(companyId);

  return await withVaultLock(vaultRoot, async () => {
    const index = await getOrBuildVaultIndex(companyId);

    // 1. Sanitizar metadatos y secretos
    const maskedMeta = maskSensitiveSecrets(frontmatterInput);

    // 2. Determinar subcarpeta según el tipo de nota
    let subfolder = options.subfolder;
    if (!subfolder) {
      switch (frontmatterInput.tipo) {
        case "empresa":
          subfolder = VAULT_SUBFOLDERS.EMPRESA;
          break;
        case "esquema":
          subfolder = VAULT_SUBFOLDERS.ESQUEMA;
          break;
        case "entidad":
          subfolder = VAULT_SUBFOLDERS.ENTIDADES;
          break;
        case "decision":
          subfolder = VAULT_SUBFOLDERS.DECISIONES;
          break;
        case "aprendizaje":
          subfolder = VAULT_SUBFOLDERS.APRENDIZAJES;
          break;
        case "incidente":
          subfolder = VAULT_SUBFOLDERS.INCIDENTES;
          break;
        case "pregunta":
          subfolder = VAULT_SUBFOLDERS.PREGUNTAS;
          break;
        case "reporte":
          subfolder = VAULT_SUBFOLDERS.REPORTES;
          break;
        case "calidad":
          subfolder = VAULT_SUBFOLDERS.CALIDAD_DATOS;
          break;
        case "sesion":
          subfolder = VAULT_SUBFOLDERS.SESIONES;
          break;
        default:
          subfolder = VAULT_SUBFOLDERS.ENTIDADES;
      }
    }

    // 3. Deduplicación: Comprobar si ya existe una nota equivalente
    let targetRelPath = "";
    const existingEntry = index.getEntryByOriginId(frontmatterInput.id_origen);

    let previousNote: VaultNote | null = null;
    if (existingEntry) {
      targetRelPath = existingEntry.relativePath;
      const existingAbs = path.join(vaultRoot, targetRelPath);
      if (fs.existsSync(existingAbs)) {
        try {
          const rawPrev = fs.readFileSync(existingAbs, "utf8");
          previousNote = parseVaultNote(rawPrev, targetRelPath, existingAbs);
        } catch {
          previousNote = null;
        }
      }
    } else {
      const baseFilename = options.filename || `${slugifyFilename(frontmatterInput.id_origen || frontmatterInput.titulo)}.md`;
      targetRelPath = `${subfolder}/${baseFilename}`;
    }

    // Validar ruta segura
    const targetAbsPath = resolveSafeVaultPath(vaultRoot, targetRelPath);

    // 4. Reglas de Estado y Promoción de Aprendizajes
    let estado = maskedMeta.estado || (previousNote ? previousNote.frontmatter.estado : "vigente");
    let evidenciasCount = maskedMeta.evidencias_count ?? (previousNote ? (previousNote.frontmatter.evidencias_count || 1) + 1 : 1);

    if (maskedMeta.tipo === "aprendizaje") {
      if (evidenciasCount >= MIN_EVIDENCES_FOR_VIGENTE) {
        estado = "vigente";
      } else {
        estado = "hipotesis";
      }
    }

    // Modo Sombra
    if (options.isShadow) {
      estado = "sombra";
    }

    const nowIso = new Date().toISOString();
    const creada = previousNote ? previousNote.frontmatter.creada : (maskedMeta.creada || nowIso);

    // 5. Construir Frontmatter Definitivo
    const fullFrontmatter: VaultFrontmatter = {
      tipo: maskedMeta.tipo,
      empresa: companyId,
      modulo: maskedMeta.modulo || "general",
      id_origen: maskedMeta.id_origen,
      fuente: maskedMeta.fuente || "bd",
      confianza: maskedMeta.confianza || "confiable",
      creada,
      actualizada: nowIso,
      caduca: maskedMeta.caduca || null,
      estado,
      autor: options.forceUserAuthor ? "usuario" : "mint",
      titulo: maskedMeta.titulo,
      version: previousNote ? (previousNote.frontmatter.version || 1) + 1 : 1,
      evidencias_count: evidenciasCount,
      ...maskedMeta,
    };

    // 6. Ensamblar Texto Markdown con Frontmatter
    const frontmatterYaml = formatYaml(fullFrontmatter);
    const fullContent = `---\n${frontmatterYaml}\n---\n\n${bodyContent.trim()}\n`;

    // Validar tamaño máximo
    validateNoteSize(fullContent);

    // 7. ESCRITURA ATÓMICA: Escribir a archivo temporal y renombrar
    const targetDir = path.dirname(targetAbsPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const tempFile = path.join(targetDir, `.tmp_${process.pid}_${Date.now()}.tmp`);
    fs.writeFileSync(tempFile, fullContent, "utf8");
    fs.renameSync(tempFile, targetAbsPath);

    const stat = fs.statSync(targetAbsPath);
    const parsedNote = parseVaultNote(fullContent, targetRelPath, targetAbsPath);

    // 8. Actualizar índice en memoria
    index.addOrUpdateEntry({
      relativePath: targetRelPath,
      tipo: parsedNote.frontmatter.tipo,
      empresa: companyId,
      modulo: parsedNote.frontmatter.modulo,
      id_origen: parsedNote.frontmatter.id_origen,
      fuente: parsedNote.frontmatter.fuente,
      confianza: parsedNote.frontmatter.confianza,
      estado: parsedNote.frontmatter.estado,
      creada: parsedNote.frontmatter.creada,
      actualizada: parsedNote.frontmatter.actualizada,
      caduca: parsedNote.frontmatter.caduca,
      autor: parsedNote.frontmatter.autor,
      titulo: parsedNote.frontmatter.titulo || path.basename(targetRelPath, ".md"),
      tags: parsedNote.tags,
      wikilinks: parsedNote.wikilinks,
      mtime: stat.mtimeMs,
      sizeBytes: stat.size,
    });

    // 9. Emitir al Bus de Eventos (conecta la memoria con el grafo en vivo de MINT)
    if (!options.skipEventBus) {
      mintSpiderEventBus.publish({
        id: `vault_write_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        companyId,
        timestamp: Date.now(),
        type: fullFrontmatter.tipo === "decision" ? "decide" : "observa",
        sourceNodeId: "agent_mint",
        targetNodeId: fullFrontmatter.id_origen,
        module: (fullFrontmatter.modulo === "general" ? "inventario" : fullFrontmatter.modulo) as any,
        summary: `Memoria registrada en vault: [[${targetRelPath}]] (${fullFrontmatter.titulo})`,
        auditRef: fullFrontmatter.id_origen,
      });
    }

    // 10. Versionado Opcional con Git (sin bloquear si no está configurado)
    commitVaultChange(vaultRoot, targetRelPath, fullFrontmatter.titulo);

    return parsedNote;
  });
}

/**
 * Serializador de YAML Frontmatter
 */
function formatYaml(data: Record<string, any>): string {
  const lines: string[] = [];
  const primaryKeys = [
    "tipo",
    "empresa",
    "modulo",
    "id_origen",
    "fuente",
    "confianza",
    "creada",
    "actualizada",
    "caduca",
    "estado",
    "autor",
    "titulo",
  ];

  const orderedKeys = Array.from(new Set([...primaryKeys, ...Object.keys(data)]));

  for (const k of orderedKeys) {
    const v = data[k];
    if (v === undefined) continue;

    if (v === null) {
      lines.push(`${k}: null`);
    } else if (typeof v === "boolean" || typeof v === "number") {
      lines.push(`${k}: ${v}`);
    } else if (Array.isArray(v)) {
      if (v.length === 0) {
        lines.push(`${k}: []`);
      } else {
        const items = v.map((item) => `"${String(item).replace(/"/g, '\\"')}"`).join(", ");
        lines.push(`${k}: [${items}]`);
      }
    } else if (typeof v === "string") {
      // Escapar comillas dobles si las contiene
      lines.push(`${k}: "${v.replace(/"/g, '\\"')}"`);
    }
  }

  return lines.join("\n");
}

/**
 * Commit atómico local de Git si el vault está en un repositorio
 */
function commitVaultChange(vaultRoot: string, fileRelPath: string, title?: string) {
  const gitDir = path.join(vaultRoot, ".git");
  if (!fs.existsSync(gitDir)) return;

  const msg = `mint(memory): ${title || fileRelPath}`;
  const cmd = `git add "${fileRelPath}" && git commit -m "${msg}" --quiet`;
  exec(cmd, { cwd: vaultRoot }, () => {
    // Ignorar errores silenciosamente si no hay cambios o git falló
  });
}
