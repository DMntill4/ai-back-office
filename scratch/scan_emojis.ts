import * as fs from "node:fs";
import * as path from "node:path";

// Regex exhaustivo para emojis según especificación Unicode v15 / UTS #51
// Excluye intencionalmente: Box Drawing (U+2500-U+257F), Blocks (U+2580-U+259F), Braille (U+2800-U+28FF),
// flechas (➔ U+2794, ← → ↑ ↓), y caracteres alfanuméricos / latinos acentuados (á, é, í, ó, ú, ñ, ¿, ¡)
const EMOJI_REGEX = /(?:[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{2600}-\u{2693}\u{2695}-\u{26FF}]|[\u{2700}-\u{2793}\u{2795}-\u{27BF}]|[\u{1F1E6}-\u{1F1FF}]|[\u{1F3FB}-\u{1F3FF}]|[\u{231A}\u{231B}\u{2328}\u{23CF}\u{23E9}-\u{23F3}\u{23F8}-\u{23FA}\u{24C2}\u{25AA}\u{25AB}\u{25FB}-\u{25FE}\u{2934}\u{2935}\u{2B05}-\u{2B07}\u{2B1B}\u{2B1C}\u{2B50}\u{2B55}\u{3030}\u{303D}\u{3297}\u{3299}]|[\u{FE0E}\u{FE0F}]|\u{200D})+/gu;

export interface EmojiFinding {
  file: string;
  line: number;
  column: number;
  matchedText: string;
  hexCodes: string[];
  lineContent: string;
}

const ROOT_DIR = path.resolve(__dirname, "..");
const DIRS_TO_SCAN = [
  "packages/cli",
  "packages/core",
  "packages/daemon",
  "packages/ingest",
  "packages/notifiers",
  "scratch",
];

const IGNORE_PATTERNS = [
  "node_modules",
  ".git",
  "packages/app", // RESTRICCIÓN ESTRICTA: NO TOCAR LA APP
  "dist",
  ".next",
  ".turbo",
  "coverage",
  "reports/*.pdf",
  "reports/*.csv",
  "scratch/scan_emojis.ts", // este script
  "scratch/clean_all_emojis.ts", // script de limpieza
  "scratch/emoji_scan_report.json", // log generado
];

function shouldIgnore(relPath: string): boolean {
  const norm = relPath.replace(/\\/g, "/");
  for (const pat of IGNORE_PATTERNS) {
    if (pat.endsWith("/*")) {
      const prefix = pat.slice(0, -2);
      if (norm.startsWith(prefix)) return true;
    } else if (norm.includes(pat) || norm.startsWith(pat)) {
      return true;
    }
  }
  return false;
}

function getAllFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const rel = path.relative(ROOT_DIR, full);
    if (shouldIgnore(rel)) continue;

    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results.push(...getAllFiles(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

function scanFile(filePath: string): EmojiFinding[] {
  const findings: EmojiFinding[] = [];
  const ext = path.extname(filePath).toLowerCase();
  // Solo archivos de texto
  const textExts = [".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".yaml", ".yml", ".sql", ".txt", ".sh", ".env"];
  if (!textExts.includes(ext) && !path.basename(filePath).startsWith(".env")) {
    return findings;
  }

  let content = "";
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch {
    return findings;
  }

  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match: RegExpExecArray | null;
    EMOJI_REGEX.lastIndex = 0;
    while ((match = EMOJI_REGEX.exec(line)) !== null) {
      const matchedText = match[0];
      const hexCodes = Array.from(matchedText).map((c) => "U+" + c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0"));
      findings.push({
        file: path.relative(ROOT_DIR, filePath).replace(/\\/g, "/"),
        line: i + 1,
        column: match.index + 1,
        matchedText,
        hexCodes,
        lineContent: line.trim(),
      });
    }
  }

  return findings;
}

async function main() {
  console.log("Iniciando escaneo exhaustivo de emojis en el repositorio MINT CLI...");
  console.log("Exclusiones: packages/app (estricto), node_modules, .git, binarios.");

  const allFiles: string[] = [];
  for (const d of DIRS_TO_SCAN) {
    allFiles.push(...getAllFiles(path.join(ROOT_DIR, d)));
  }

  // Agregar archivos raíz relevantes
  const rootFiles = ["README.md", "package.json"];
  for (const rf of rootFiles) {
    const full = path.join(ROOT_DIR, rf);
    if (fs.existsSync(full)) allFiles.push(full);
  }

  console.log(`Total de archivos de texto a escanear: ${allFiles.length}`);

  const allFindings: EmojiFinding[] = [];
  for (const f of allFiles) {
    const fFindings = scanFile(f);
    allFindings.push(...fFindings);
  }

  const reportPath = path.join(ROOT_DIR, "scratch", "emoji_scan_report.json");
  fs.writeFileSync(reportPath, JSON.stringify(allFindings, null, 2), "utf8");

  console.log(`\n================================================================================`);
  console.log(` RESULTADO DEL ESCANEO: ${allFindings.length} EMOJIS ENCONTRADOS EN ${new Set(allFindings.map((f) => f.file)).size} ARCHIVOS`);
  console.log(`================================================================================\n`);

  // Agrupar por archivo
  const byFile = new Map<string, EmojiFinding[]>();
  for (const f of allFindings) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file)!.push(f);
  }

  for (const [file, list] of byFile.entries()) {
    console.log(`\n📁 ${file} (${list.length} hallazgos):`);
    for (const item of list.slice(0, 10)) {
      console.log(`  L${item.line}:${item.column} [${item.matchedText}] (${item.hexCodes.join(" ")}) -> "${item.lineContent.slice(0, 80)}"`);
    }
    if (list.length > 10) {
      console.log(`  ... y ${list.length - 10} más.`);
    }
  }

  console.log(`\nReporte completo guardado en: scratch/emoji_scan_report.json`);
}

main().catch(console.error);
