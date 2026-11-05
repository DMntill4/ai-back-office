import * as fs from "node:fs";
import * as path from "node:path";

/**
 * REGLA DE LINT Y PREVENCIÓN CI: CERO EMOJIS EN MINT CLI
 * Falla la integración continua (exit 1) si cualquier desarrollador o proceso
 * reintroduce emojis, pictogramas o dingbats en el código o plantillas.
 */

const EMOJI_REGEX = /(?:[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{2600}-\u{2693}\u{2695}-\u{26FF}]|[\u{2700}-\u{2793}\u{2795}-\u{27BF}]|[\u{1F1E6}-\u{1F1FF}]|[\u{1F3FB}-\u{1F3FF}]|[\u{231A}\u{231B}\u{2328}\u{23CF}\u{23E9}-\u{23F3}\u{23F8}-\u{23FA}\u{24C2}\u{25AA}\u{25AB}\u{25FB}-\u{25FE}\u{2934}\u{2935}\u{2B05}-\u{2B07}\u{2B1B}\u{2B1C}\u{2B50}\u{2B55}\u{3030}\u{303D}\u{3297}\u{3299}]|[\u{FE0E}\u{FE0F}]|\u{200D})+/gu;

const ROOT_DIR = path.resolve(__dirname, "..");
const DIRS_TO_SCAN = [
  "packages/cli",
  "packages/core",
  "packages/daemon",
  "packages/ingest",
  "packages/notifiers",
  "scratch",
];

// LISTA EXPLÍCITA Y COMENTADA DE EXCEPCIONES PERMITIDAS
const EXCEPTION_ALLOWLIST = new Set<string>([
  "scratch/check_no_emojis.ts", // El propio script de verificación que contiene la expresión regular
  "scratch/scan_emojis.ts",     // Herramienta de escaneo
  "scratch/clean_all_emojis.ts",// Herramienta de sustitución
]);

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
  "scratch/emoji_scan_report.json",
];

function shouldIgnore(relPath: string): boolean {
  const norm = relPath.replace(/\\/g, "/");
  if (EXCEPTION_ALLOWLIST.has(norm)) return true;
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

function scanFile(filePath: string) {
  const rel = path.relative(ROOT_DIR, filePath).replace(/\\/g, "/");
  const ext = path.extname(filePath).toLowerCase();
  const textExts = [".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".yaml", ".yml", ".sql", ".txt", ".sh"];
  if (!textExts.includes(ext) && !path.basename(filePath).startsWith(".env")) {
    return [];
  }

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  const fileFindings: Array<{ line: number; col: number; text: string; lineStr: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match: RegExpExecArray | null;
    EMOJI_REGEX.lastIndex = 0;
    while ((match = EMOJI_REGEX.exec(line)) !== null) {
      fileFindings.push({
        line: i + 1,
        col: match.index + 1,
        text: match[0],
        lineStr: line.trim(),
      });
    }
  }

  return fileFindings.map((f) => ({ ...f, file: rel }));
}

function main() {
  const allFiles: string[] = [];
  for (const d of DIRS_TO_SCAN) {
    allFiles.push(...getAllFiles(path.join(ROOT_DIR, d)));
  }

  const rootFiles = ["README.md", "package.json"];
  for (const rf of rootFiles) {
    const full = path.join(ROOT_DIR, rf);
    if (fs.existsSync(full)) allFiles.push(full);
  }

  const violations: any[] = [];
  for (const f of allFiles) {
    const findings = scanFile(f);
    violations.push(...findings);
  }

  if (violations.length > 0) {
    console.error(`\n[ERROR DE LINT: SE DETECTARON ${violations.length} EMOJIS PROHIBIDOS EN EL CÓDIGO]`);
    for (const v of violations) {
      console.error(`  - ${v.file}:${v.line}:${v.col} -> Carácter: "${v.text}" | Línea: "${v.lineStr.slice(0, 80)}"`);
    }
    console.error("\nEl código debe utilizar etiquetas textuales claras (ej: [OK], [ERROR], [AVISO]) en vez de emojis.");
    process.exit(1);
  } else {
    console.log("[OK] CERO EMOJIS DETECTADOS: Verificación de lint aprobada con éxito.");
    process.exit(0);
  }
}

main();
