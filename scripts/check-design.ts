import fs from "node:fs";
import path from "node:path";

interface Violation {
  file: string;
  line: number;
  rule: string;
  match: string;
  snippet: string;
}

// Lista de archivos activos bajo la especificación DESIGN.md v2
// Se va ampliando en Paso 2 (cimientos), Paso 3 (Inicio y Aprobaciones) y Paso 4 (resto de vistas)
export const V2_ACTIVE_TARGETS = [
  // Cimientos (Paso 2)
  "packages/web/index.html",
  "packages/web/src/index.css",
  "packages/web/src/main.tsx",
  "packages/web/tailwind.config.js",
  "DESIGN.md",
];

// Reglas obligatorias de DESIGN.md v2
const RULES = [
  {
    name: "Cero Hex en className",
    description: "Prohibido usar valores hexadecimales hardcodeados dentro de className",
    test: (line: string) => {
      // Coincide con className="..." que contenga #... o template strings
      if (!/className\s*=\s*["`{]/.test(line)) return null;
      const match = line.match(/#[0-9a-fA-F]{3,8}/);
      return match ? match[0] : null;
    },
  },
  {
    name: "Cero clases emerald-*",
    description: "Prohibido usar clases emerald-*. Usar tokens semánticos (state-ok, brand-lime, etc.)",
    test: (line: string) => {
      if (!/className\s*=\s*["`{]/.test(line)) return null;
      const match = line.match(/\bemerald-(?:50|100|200|300|400|500|600|700|800|900|950)(?:\/\d+)?\b/);
      return match ? match[0] : null;
    },
  },
  {
    name: "Cero tamaños de texto < 12px",
    description: "El mínimo absoluto es 12px (text-xs / text-caption). Prohibido text-[8px] a text-[11px]",
    test: (line: string) => {
      const match = line.match(/\btext-\[(?:[0-9]|1[01])px\]\b/);
      return match ? match[0] : null;
    },
  },
  {
    name: "Cero uppercase con tracking-*",
    description: "Prohibido combinar uppercase con tracking-* en etiquetas; usar sentence case",
    test: (line: string) => {
      if (/className\s*=\s*["`{]/.test(line)) {
        if (/\buppercase\b/.test(line) && /\btracking-(?:wider|widest|tight|normal)\b/.test(line)) {
          return "uppercase con tracking-*";
        }
      }
      return null;
    },
  },
  {
    name: "Cero backdrop-blur",
    description: "Prohibido el uso de backdrop-blur; las superficies deben ser sólidas y mates",
    test: (line: string) => {
      if (!/className\s*=\s*["`{]/.test(line)) return null;
      const match = line.match(/\bbackdrop-blur(?:-[a-z0-9]+)?\b/);
      return match ? match[0] : null;
    },
  },
  {
    name: "Cero select-none global",
    description: "Prohibido select-none global en body o html para permitir la copia de datos",
    test: (line: string, file: string) => {
      if (file.endsWith("index.html") || file.endsWith("index.css") || file.endsWith("App.tsx")) {
        if (/select-none/.test(line) && (/<body/.test(line) || /<html/.test(line) || /:root/.test(line))) {
          return "select-none global en body/html";
        }
      }
      return null;
    },
  },
  {
    name: "Cero jerga técnica visible",
    description: "Prohibido mostrar DAG, CDC, P95, HITL, Temp 0.1 o Drizzle ORM en textos de interfaz",
    test: (line: string, file: string) => {
      // Ignorar archivos de configuración, markdown de especificación o este script
      if (file.endsWith("check-design.ts") || file.endsWith(".json") || file.endsWith(".config.js") || file.endsWith(".md")) return null;
      // Buscar en textos literales de JSX o strings
      const match = line.match(/\b(DAG|CDC|P95|HITL|Temp 0\.1|Drizzle ORM)\b/);
      if (match && !line.trim().startsWith("//") && !line.trim().startsWith("/*")) {
        return match[0];
      }
      return null;
    },
  },
];

function checkFile(filePath: string): Violation[] {
  const violations: Violation[] = [];
  if (!fs.existsSync(filePath)) {
    console.warn(`[WARN] Archivo no encontrado: ${filePath}`);
    return violations;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/);

  lines.forEach((line, idx) => {
    RULES.forEach((rule) => {
      const match = rule.test(line, filePath);
      if (match) {
        violations.push({
          file: filePath,
          line: idx + 1,
          rule: rule.name,
          match,
          snippet: line.trim(),
        });
      }
    });
  });

  return violations;
}

function run() {
  const args = process.argv.slice(2);
  let targets: string[] = [];
  let isAll = false;

  if (args.includes("--all")) {
    isAll = true;
    const scanDir = (dir: string): string[] => {
      let results: string[] = [];
      const list = fs.readdirSync(dir);
      list.forEach((file) => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          results = results.concat(scanDir(fullPath));
        } else if (/\.(tsx|ts|html|css)$/.test(file)) {
          results.push(fullPath.replace(/\\/g, "/"));
        }
      });
      return results;
    };
    targets = scanDir("packages/web/src");
  } else if (args.length > 0) {
    targets = args.map((a) => a.replace(/\\/g, "/"));
  } else {
    targets = V2_ACTIVE_TARGETS;
  }

  console.log(`\n======================================================`);
  console.log(`  MINT DESIGN SYSTEM V2 — VERIFICADOR AUTOMÁTICO       `);
  console.log(`======================================================\n`);
  console.log(`Modo: ${isAll ? "Auditoría Completa (--all)" : "Archivos V2 Activos"}`);
  console.log(`Examinando ${targets.length} archivo(s)...\n`);

  let totalViolations = 0;
  const fileViolationsMap = new Map<string, Violation[]>();

  targets.forEach((target) => {
    const violations = checkFile(target);
    if (violations.length > 0) {
      totalViolations += violations.length;
      fileViolationsMap.set(target, violations);
    }
  });

  if (totalViolations === 0) {
    console.log(`✓ TODOS LOS ARCHIVOS CUMPLEN DESIGN.MD V2 AL 100%!`);
    console.log(`  • Cero hex en className.`);
    console.log(`  • Cero clases emerald-*.`);
    console.log(`  • Cero textos < 12px.`);
    console.log(`  • Cero uppercase con tracking.`);
    console.log(`  • Cero backdrop-blur.`);
    console.log(`  • Cero select-none global.`);
    console.log(`  • Cero jerga técnica visible.\n`);
    process.exit(0);
  } else {
    console.error(`✕ SE ENCONTRARON ${totalViolations} VIOLACIÓN(ES) DE DISEÑO:\n`);
    fileViolationsMap.forEach((violations, file) => {
      console.error(`\n📄 ${file} (${violations.length} problemas):`);
      violations.forEach((v) => {
        console.error(`   Línea ${v.line} [${v.rule}]: "${v.match}"`);
        console.error(`   > ${v.snippet.substring(0, 100)}`);
      });
    });
    console.error(`\nEl chequeo ha fallado. Corrige las violaciones antes de continuar.\n`);
    process.exit(1);
  }
}

run();
