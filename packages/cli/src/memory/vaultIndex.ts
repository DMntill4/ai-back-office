import * as fs from "node:fs";
import * as path from "node:path";
import {
  VaultIndexEntry,
  VaultNote,
  VaultFrontmatter,
  VaultSearchParams,
  VaultNoteType,
} from "./vault.types";
import { getVaultDirectory, VAULT_SUBFOLDERS } from "./vaultConfig";
import { maskSensitiveSecrets, validateNoteSize } from "./sanitizer";

export class VaultIndex {
  private entries = new Map<string, VaultIndexEntry>();
  private byOriginId = new Map<string, string>();
  private byModule = new Map<string, Set<string>>();
  private byType = new Map<string, Set<string>>();
  private byTag = new Map<string, Set<string>>();

  constructor(public readonly companyId: string, public readonly vaultRoot: string) {}

  public addOrUpdateEntry(entry: VaultIndexEntry) {
    this.entries.set(entry.relativePath, entry);

    if (entry.id_origen) {
      this.byOriginId.set(entry.id_origen, entry.relativePath);
    }

    // Indexar por módulo
    if (!this.byModule.has(entry.modulo)) {
      this.byModule.set(entry.modulo, new Set());
    }
    this.byModule.get(entry.modulo)!.add(entry.relativePath);

    // Indexar por tipo
    if (!this.byType.has(entry.tipo)) {
      this.byType.set(entry.tipo, new Set());
    }
    this.byType.get(entry.tipo)!.add(entry.relativePath);

    // Indexar por etiquetas
    for (const tag of entry.tags) {
      const cleanTag = tag.replace(/^#/, "").toLowerCase();
      if (!this.byTag.has(cleanTag)) {
        this.byTag.set(cleanTag, new Set());
      }
      this.byTag.get(cleanTag)!.add(entry.relativePath);
    }
  }

  public removeEntry(relativePath: string) {
    const entry = this.entries.get(relativePath);
    if (!entry) return;

    this.entries.delete(relativePath);
    if (entry.id_origen) this.byOriginId.delete(entry.id_origen);

    this.byModule.get(entry.modulo)?.delete(relativePath);
    this.byType.get(entry.tipo)?.delete(relativePath);
    for (const tag of entry.tags) {
      const cleanTag = tag.replace(/^#/, "").toLowerCase();
      this.byTag.get(cleanTag)?.delete(relativePath);
    }
  }

  public getEntryByPath(relPath: string): VaultIndexEntry | undefined {
    return this.entries.get(relPath);
  }

  public getEntryByOriginId(id_origen: string): VaultIndexEntry | undefined {
    const p = this.byOriginId.get(id_origen);
    return p ? this.entries.get(p) : undefined;
  }

  public getAllEntries(): VaultIndexEntry[] {
    return Array.from(this.entries.values());
  }

  public search(params: VaultSearchParams): VaultIndexEntry[] {
    let results = this.getAllEntries();

    if (params.tipo) {
      results = results.filter((e) => e.tipo === params.tipo);
    }
    if (params.modulo) {
      results = results.filter((e) => e.modulo === params.modulo);
    }
    if (params.estado) {
      results = results.filter((e) => e.estado === params.estado);
    }
    if (params.confianza) {
      results = results.filter((e) => e.confianza === params.confianza);
    }
    if (params.id_origen) {
      results = results.filter((e) => e.id_origen === params.id_origen);
    }
    if (params.tag) {
      const targetTag = params.tag.replace(/^#/, "").toLowerCase();
      results = results.filter((e) =>
        e.tags.some((t) => t.replace(/^#/, "").toLowerCase() === targetTag)
      );
    }

    if (params.query) {
      const q = params.query.toLowerCase();
      results = results.filter((e) =>
        e.titulo.toLowerCase().includes(q) ||
        e.relativePath.toLowerCase().includes(q) ||
        e.id_origen.toLowerCase().includes(q) ||
        e.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (params.limit && params.limit > 0) {
      results = results.slice(0, params.limit);
    }

    return results;
  }
}

/**
 * Parsea el frontmatter YAML y extrae wikilinks y tags de una nota Markdown
 */
export function parseVaultNote(content: string, relativePath: string, absPath: string): VaultNote {
  validateNoteSize(content);

  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  let fmData: Partial<VaultFrontmatter> = {};
  let body = content;

  if (match) {
    const rawYaml = match[1];
    body = match[2];
    fmData = parseSimpleYaml(rawYaml);
  }

  // Extraer wikilinks [[...]]
  const wikilinks: string[] = [];
  const wikilinkRegex = /\[\[(.*?)\]\]/g;
  let linkMatch;
  while ((linkMatch = wikilinkRegex.exec(body)) !== null) {
    const fullLink = linkMatch[1];
    const target = fullLink.split("|")[0].trim();
    if (target && !wikilinks.includes(target)) {
      wikilinks.push(target);
    }
  }

  // Extraer tags #tag
  const tags: string[] = [];
  const tagRegex = /(?:^|\s)#([a-zA-Z0-9_\-]+)/g;
  let tagMatch;
  while ((tagMatch = tagRegex.exec(body)) !== null) {
    const tagName = tagMatch[1];
    if (tagName && !tags.includes(tagName)) {
      tags.push(tagName);
    }
  }

  const stat = fs.existsSync(absPath) ? fs.statSync(absPath) : { mtimeMs: Date.now(), size: content.length };

  const frontmatter: VaultFrontmatter = {
    tipo: (fmData.tipo as any) || "entidad",
    empresa: fmData.empresa || "comp_default",
    modulo: (fmData.modulo as any) || "general",
    id_origen: fmData.id_origen || path.basename(relativePath, ".md"),
    fuente: (fmData.fuente as any) || "inferido",
    confianza: (fmData.confianza as any) || "confiable",
    creada: fmData.creada || new Date().toISOString(),
    actualizada: fmData.actualizada || new Date().toISOString(),
    caduca: fmData.caduca || null,
    estado: (fmData.estado as any) || "vigente",
    autor: (fmData.autor as any) || "mint",
    titulo: fmData.titulo || extractTitleFromBody(body) || path.basename(relativePath, ".md"),
    tags: Array.from(new Set([...(fmData.tags || []), ...tags])),
    ...fmData,
  };

  return {
    relativePath,
    absolutePath: absPath,
    frontmatter,
    content: body,
    wikilinks,
    tags: frontmatter.tags || [],
    mtime: stat.mtimeMs,
    sizeBytes: stat.size,
  };
}

/**
 * Parser de YAML ligero y seguro sin dependencias externas
 */
function parseSimpleYaml(raw: string): Record<string, any> {
  const result: Record<string, any> = {};
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    let val = trimmed.slice(colonIdx + 1).trim();

    // Descomillar
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }

    if (val === "null" || val === "~" || val === "") {
      result[key] = null;
    } else if (val === "true") {
      result[key] = true;
    } else if (val === "false") {
      result[key] = false;
    } else if (!isNaN(Number(val)) && val !== "") {
      result[key] = Number(val);
    } else if (val.startsWith("[") && val.endsWith("]")) {
      // Array simple en línea
      result[key] = val
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
        .filter(Boolean);
    } else {
      result[key] = val;
    }
  }

  return result;
}

function extractTitleFromBody(body: string): string | null {
  const m = body.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
}

/**
 * Carga o reconstruye el índice del vault en segundo plano (< 2 segundos de arranque)
 */
export async function getOrBuildVaultIndex(companyId: string): Promise<VaultIndex> {
  const vaultRoot = getVaultDirectory(companyId);
  const index = new VaultIndex(companyId, vaultRoot);

  if (!fs.existsSync(vaultRoot)) {
    return index;
  }

  const indexPath = path.join(vaultRoot, VAULT_SUBFOLDERS.INDICE, "indice.json");
  let cachedIndexData: Record<string, VaultIndexEntry> = {};

  if (fs.existsSync(indexPath)) {
    try {
      cachedIndexData = JSON.parse(fs.readFileSync(indexPath, "utf8"));
    } catch {
      cachedIndexData = {};
    }
  }

  // Escanear carpetas del vault
  const scanDir = (dir: string, baseDir: string) => {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const ent of entries) {
      if (ent.name.startsWith(".") || ent.name === VAULT_SUBFOLDERS.INDICE || ent.name === VAULT_SUBFOLDERS.PLANTILLAS) {
        continue;
      }

      const fullPath = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        scanDir(fullPath, baseDir);
      } else if (ent.isFile() && ent.name.endsWith(".md")) {
        const relPath = path.relative(baseDir, fullPath).replace(/\\/g, "/");
        const stat = fs.statSync(fullPath);

        const cached = cachedIndexData[relPath];
        if (cached && Math.abs(cached.mtime - stat.mtimeMs) < 100) {
          index.addOrUpdateEntry(cached);
        } else {
          try {
            const raw = fs.readFileSync(fullPath, "utf8");
            const note = parseVaultNote(raw, relPath, fullPath);

            // Detección de edición manual por el usuario
            const fmUpdated = new Date(note.frontmatter.actualizada).getTime();
            if (stat.mtimeMs - fmUpdated > 2000 && note.frontmatter.autor !== "usuario") {
              note.frontmatter.autor = "usuario";
              note.frontmatter.fuente = "usuario";
            }

            const entry: VaultIndexEntry = {
              relativePath: relPath,
              tipo: note.frontmatter.tipo,
              empresa: note.frontmatter.empresa,
              modulo: note.frontmatter.modulo,
              id_origen: note.frontmatter.id_origen,
              fuente: note.frontmatter.fuente,
              confianza: note.frontmatter.confianza,
              estado: note.frontmatter.estado,
              creada: note.frontmatter.creada,
              actualizada: note.frontmatter.actualizada,
              caduca: note.frontmatter.caduca,
              autor: note.frontmatter.autor,
              titulo: note.frontmatter.titulo || path.basename(relPath, ".md"),
              tags: note.tags,
              wikilinks: note.wikilinks,
              mtime: stat.mtimeMs,
              sizeBytes: stat.size,
            };

            index.addOrUpdateEntry(entry);
          } catch (err: any) {
            console.error(`[VaultIndex] Advertencia parseando '${relPath}':`, err.message);
          }
        }
      }
    }
  };

  scanDir(vaultRoot, vaultRoot);

  // Guardar índice en caché de forma diferida (sin bloquear)
  try {
    const serialized: Record<string, VaultIndexEntry> = {};
    for (const e of index.getAllEntries()) {
      serialized[e.relativePath] = e;
    }
    const indiceDir = path.join(vaultRoot, VAULT_SUBFOLDERS.INDICE);
    if (!fs.existsSync(indiceDir)) fs.mkdirSync(indiceDir, { recursive: true });
    fs.writeFileSync(indexPath, JSON.stringify(serialized, null, 2), "utf8");
  } catch {
    // Si falla el guardado en caché no rompe la ejecución
  }

  return index;
}
