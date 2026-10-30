/**
 * @mint/core — Vault Service
 *
 * Acceso de solo lectura al Vault de Obsidian (memoria operativa en Markdown).
 * Extrae la lógica de lectura/indexado que antes vivía aislada en
 * `packages/cli/src/memory/` para que la API REST pueda exponerla.
 *
 * CERO dependencias de Fastify o UI. Solo `node:fs` / `node:path` / `node:os`.
 *
 * Contrato público:
 *  - getVaultTree(companyId?)   → árbol de categorías + listado saneado
 *  - getVaultDocument(id)       → frontmatter parseado + cuerpo limpio
 *  - getVaultMetrics(companyId?)→ salud de datos y distribución por categoría
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

export type VaultCategory = "decisions" | "quarantine" | "audit" | "questions" | "entities" | "other";

export interface VaultDocumentSummary {
    /** Identificador estable y URL-safe (ruta relativa sin extensión, con "/" → "__"). */
    id: string;
    /** Ruta relativa dentro del vault (con extensión .md). */
    relativePath: string;
    /** Título saneado (sin extensión .md). */
    title: string;
    category: VaultCategory;
    /** Carpeta original del vault (ej. "03-Decisiones"). */
    folder: string;
    estado: string;
    confianza: string;
    modulo: string;
    tipo: string;
    tags: string[];
    wikilinks: string[];
    updatedAt: string;
    sizeBytes: number;
}

export interface VaultTreeCategory {
    key: VaultCategory;
    label: string;
    count: number;
    documents: VaultDocumentSummary[];
}

export interface VaultTree {
    companyId: string;
    vaultPath: string;
    exists: boolean;
    totalDocuments: number;
    categories: VaultTreeCategory[];
    generatedAt: string;
}

export interface VaultDocument {
    id: string;
    relativePath: string;
    title: string;
    category: VaultCategory;
    folder: string;
    /** Frontmatter YAML parseado a objeto JSON. */
    metadata: Record<string, unknown>;
    /** Cuerpo Markdown sin frontmatter. */
    content: string;
    tags: string[];
    wikilinks: string[];
    updatedAt: string;
    sizeBytes: number;
}

export interface VaultMetrics {
    companyId: string;
    vaultPath: string;
    exists: boolean;
    totalDocuments: number;
    /** 0-100: proporción de notas vigentes y no caducadas. */
    dataHealthPct: number;
    pendingDocuments: number;
    contradictedDocuments: number;
    expiredDocuments: number;
    hypothesesPending: number;
    totalSizeBytes: number;
    lastUpdated: string | null;
    distribution: Record<VaultCategory, number>;
    byStatus: Record<string, number>;
    byConfidence: Record<string, number>;
    generatedAt: string;
}

// ---------------------------------------------------------------------------
// Configuración de carpetas → categorías
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<VaultCategory, string> = {
    decisions: "Decisiones",
    quarantine: "Cuarentena",
    audit: "Auditoría",
    questions: "Preguntas",
    entities: "Entidades",
    other: "Otros",
};

/**
 * Mapea el nombre de carpeta del vault (esquema numerado de Obsidian) a una
 * categoría lógica expuesta por la API.
 */
function resolveCategory(folder: string): VaultCategory {
    const f = folder.toLowerCase();
    if (f.includes("decision")) return "decisions";
    if (f.includes("cuarentena") || f.includes("incidente") || f.includes("calidad")) return "quarantine";
    if (f.includes("auditoria") || f.includes("reporte") || f.includes("sesion")) return "audit";
    if (f.includes("pregunta")) return "questions";
    if (f.includes("entidad") || f.includes("empresa") || f.includes("esquema")) return "entities";
    return "other";
}

/**
 * Raíz del vault para una empresa. Respeta `MINT_VAULT_DIR` igual que el CLI.
 */
export function getVaultRoot(companyId: string = "comp_default"): string {
    if (process.env.MINT_VAULT_DIR) {
        return path.resolve(process.env.MINT_VAULT_DIR, companyId);
    }
    return path.join(os.homedir(), ".mint", "vaults", companyId);
}

// ---------------------------------------------------------------------------
// Parsers internos (frontmatter YAML simple + wikilinks + tags)
// ---------------------------------------------------------------------------

function parseSimpleYaml(raw: string): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const idx = trimmed.indexOf(":");
        if (idx === -1) continue;
        const key = trimmed.slice(0, idx).trim();
        let value = trimmed.slice(idx + 1).trim();

        if (value === "" || value === "null" || value === "~") {
            out[key] = null;
            continue;
        }
        if (value.startsWith("[") && value.endsWith("]")) {
            out[key] = value
                .slice(1, -1)
                .split(",")
                .map((v) => v.trim().replace(/^["']|["']$/g, ""))
                .filter(Boolean);
            continue;
        }
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }
        if (value === "true") {
            out[key] = true;
            continue;
        }
        if (value === "false") {
            out[key] = false;
            continue;
        }
        if (/^-?\d+(\.\d+)?$/.test(value)) {
            out[key] = Number(value);
            continue;
        }
        out[key] = value;
    }
    return out;
}

interface ParsedNote {
    metadata: Record<string, unknown>;
    body: string;
    tags: string[];
    wikilinks: string[];
}

function parseNote(raw: string): ParsedNote {
    const fmRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
    const match = raw.match(fmRegex);
    let metadata: Record<string, unknown> = {};
    let body = raw;
    if (match) {
        metadata = parseSimpleYaml(match[1]);
        body = match[2];
    }

    const wikilinks: string[] = [];
    const linkRegex = /\[\[(.*?)\]\]/g;
    let lm: RegExpExecArray | null;
    while ((lm = linkRegex.exec(body)) !== null) {
        const target = lm[1].split("|")[0].trim();
        if (target && !wikilinks.includes(target)) wikilinks.push(target);
    }

    const tags: string[] = [];
    const tagRegex = /(?:^|\s)#([a-zA-Z0-9_\-/]+)/g;
    let tm: RegExpExecArray | null;
    while ((tm = tagRegex.exec(body)) !== null) {
        if (!tags.includes(tm[1])) tags.push(tm[1]);
    }
    const fmTags = metadata.tags;
    if (Array.isArray(fmTags)) {
        for (const t of fmTags) {
            const clean = String(t).replace(/^#/, "");
            if (clean && !tags.includes(clean)) tags.push(clean);
        }
    }

    return { metadata, body, tags, wikilinks };
}

/** Sanea el título: sin extensión .md, sin guiones bajos ni guiones como separadores. */
function sanitizeTitle(relativePath: string): string {
    const base = path.basename(relativePath).replace(/\.md$/i, "");
    return base.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

/** Convierte una ruta relativa en un id URL-safe reversible. */
function toDocumentId(relativePath: string): string {
    return relativePath.replace(/\\/g, "/").replace(/\.md$/i, "").replace(/\//g, "__");
}

function fromDocumentId(id: string): string {
    return id.replace(/__/g, "/") + ".md";
}

// ---------------------------------------------------------------------------
// Escaneo del vault
// ---------------------------------------------------------------------------

interface RawVaultFile {
    relativePath: string;
    absolutePath: string;
    folder: string;
    mtime: number;
    sizeBytes: number;
}

function walkVault(root: string): RawVaultFile[] {
    const files: RawVaultFile[] = [];
    if (!fs.existsSync(root)) return files;

    const walk = (dir: string) => {
        let entries: fs.Dirent[];
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            return;
        }
        for (const entry of entries) {
            if (entry.name.startsWith(".")) continue; // ignora .obsidian, .git
            const abs = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(abs);
            } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
                const rel = path.relative(root, abs).replace(/\\/g, "/");
                const segments = rel.split("/");
                const folder = segments.length > 1 ? segments[0] : "";
                let stat: fs.Stats | null = null;
                try {
                    stat = fs.statSync(abs);
                } catch {
                    stat = null;
                }
                files.push({
                    relativePath: rel,
                    absolutePath: abs,
                    folder,
                    mtime: stat ? stat.mtimeMs : 0,
                    sizeBytes: stat ? stat.size : 0,
                });
            }
        }
    };

    walk(root);
    return files;
}

function buildSummary(file: RawVaultFile, parsed: ParsedNote): VaultDocumentSummary {
    const meta = parsed.metadata;
    return {
        id: toDocumentId(file.relativePath),
        relativePath: file.relativePath,
        title: sanitizeTitle(file.relativePath),
        category: resolveCategory(file.folder),
        folder: file.folder || "root",
        estado: String(meta.estado ?? "vigente"),
        confianza: String(meta.confianza ?? "confiable"),
        modulo: String(meta.modulo ?? "general"),
        tipo: String(meta.tipo ?? "nota"),
        tags: parsed.tags,
        wikilinks: parsed.wikilinks,
        updatedAt: String(meta.actualizada ?? new Date(file.mtime || Date.now()).toISOString()),
        sizeBytes: file.sizeBytes,
    };
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/**
 * Árbol de documentos del vault agrupado por categoría lógica.
 */
export async function getVaultTree(companyId: string = "comp_default"): Promise<VaultTree> {
    const vaultPath = getVaultRoot(companyId);
    const exists = fs.existsSync(vaultPath);
    const files = walkVault(vaultPath);

    const buckets: Record<VaultCategory, VaultDocumentSummary[]> = {
        decisions: [],
        quarantine: [],
        audit: [],
        questions: [],
        entities: [],
        other: [],
    };

    for (const file of files) {
        try {
            const raw = fs.readFileSync(file.absolutePath, "utf8");
            const parsed = parseNote(raw);
            const summary = buildSummary(file, parsed);
            buckets[summary.category].push(summary);
        } catch {
            // Nota corrupta o ilegible: se omite del árbol.
        }
    }

    const order: VaultCategory[] = ["decisions", "quarantine", "audit", "questions", "entities", "other"];
    const categories: VaultTreeCategory[] = order.map((key) => {
        const documents = buckets[key].sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        return { key, label: CATEGORY_LABELS[key], count: documents.length, documents };
    });

    return {
        companyId,
        vaultPath,
        exists,
        totalDocuments: files.length,
        categories,
        generatedAt: new Date().toISOString(),
    };
}

/**
 * Documento individual: frontmatter parseado + cuerpo Markdown limpio.
 * Acepta el id URL-safe o la ruta relativa (con o sin .md).
 */
export async function getVaultDocument(
    id: string,
    companyId: string = "comp_default"
): Promise<VaultDocument | null> {
    const vaultPath = getVaultRoot(companyId);
    if (!fs.existsSync(vaultPath)) return null;

    const candidates = new Set<string>();
    candidates.add(id);
    candidates.add(fromDocumentId(id));
    if (!id.toLowerCase().endsWith(".md")) candidates.add(`${id}.md`);

    let target: string | null = null;
    for (const candidate of candidates) {
        const normalized = candidate.replace(/\\/g, "/").replace(/^\/+/, "");
        const abs = path.resolve(vaultPath, normalized);
        // Protección contra path traversal.
        if (!abs.startsWith(path.resolve(vaultPath))) continue;
        if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
            target = abs;
            break;
        }
    }

    if (!target) return null;

    const raw = fs.readFileSync(target, "utf8");
    const parsed = parseNote(raw);
    const rel = path.relative(vaultPath, target).replace(/\\/g, "/");
    const segments = rel.split("/");
    const folder = segments.length > 1 ? segments[0] : "";
    const stat = fs.statSync(target);

    return {
        id: toDocumentId(rel),
        relativePath: rel,
        title: sanitizeTitle(rel),
        category: resolveCategory(folder),
        folder: folder || "root",
        metadata: parsed.metadata,
        content: parsed.body.trim(),
        tags: parsed.tags,
        wikilinks: parsed.wikilinks,
        updatedAt: String(parsed.metadata.actualizada ?? new Date(stat.mtimeMs).toISOString()),
        sizeBytes: stat.size,
    };
}

/**
 * Métricas de salud del vault: distribución por categoría, estados y confianza.
 */
export async function getVaultMetrics(companyId: string = "comp_default"): Promise<VaultMetrics> {
    const vaultPath = getVaultRoot(companyId);
    const exists = fs.existsSync(vaultPath);
    const files = walkVault(vaultPath);

    const distribution: Record<VaultCategory, number> = {
        decisions: 0,
        quarantine: 0,
        audit: 0,
        questions: 0,
        entities: 0,
        other: 0,
    };
    const byStatus: Record<string, number> = {};
    const byConfidence: Record<string, number> = {};

    let totalSizeBytes = 0;
    let lastUpdatedMs = 0;
    let contradicted = 0;
    let expired = 0;
    let hypotheses = 0;
    let healthy = 0;
    const now = Date.now();

    for (const file of files) {
        totalSizeBytes += file.sizeBytes;
        if (file.mtime > lastUpdatedMs) lastUpdatedMs = file.mtime;

        try {
            const raw = fs.readFileSync(file.absolutePath, "utf8");
            const parsed = parseNote(raw);
            const summary = buildSummary(file, parsed);

            distribution[summary.category] += 1;
            byStatus[summary.estado] = (byStatus[summary.estado] ?? 0) + 1;
            byConfidence[summary.confianza] = (byConfidence[summary.confianza] ?? 0) + 1;

            const caduca = parsed.metadata.caduca;
            const isExpired = typeof caduca === "string" && caduca !== "null" && new Date(caduca).getTime() <= now;

            if (summary.estado === "contradicha") contradicted += 1;
            if (isExpired) expired += 1;
            if (summary.estado === "hipotesis") hypotheses += 1;

            if (summary.estado === "vigente" && !isExpired) healthy += 1;
        } catch {
            // Nota ilegible: cuenta como no saludable.
        }
    }

    const total = files.length;
    const dataHealthPct = total === 0 ? 100 : Math.round((healthy / total) * 100);

    return {
        companyId,
        vaultPath,
        exists,
        totalDocuments: total,
        dataHealthPct,
        pendingDocuments: hypotheses,
        contradictedDocuments: contradicted,
        expiredDocuments: expired,
        hypothesesPending: hypotheses,
        totalSizeBytes,
        lastUpdated: lastUpdatedMs > 0 ? new Date(lastUpdatedMs).toISOString() : null,
        distribution,
        byStatus,
        byConfidence,
        generatedAt: new Date().toISOString(),
    };
}
