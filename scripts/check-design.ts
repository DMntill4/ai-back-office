import * as fs from "fs";
import * as path from "path";

interface Violation {
  file: string;
  line: number;
  rule: string;
  detail: string;
}

// 7 Reglas no negociables de Mint-DESIGN.md
const BANNED_TECHNICAL_WORDS = [
  "\\bDrizzle\\s+ORM\\b",
  "\\bDAG\\b",
  "\\bCDC\\b",
  "\\bP95\\b",
  "\\bHITL\\b",
  "\\bpublic\\.products\\b",
  "\\bautonomousWorkflowService\\.ts\\b",
  "\\bpipelineDAG\\.ts\\b",
  "\\bQUIEBRE_INMINENTE_84H\\b",
];

// Archivos de la Fase 0, Fase 1 y Fase 2
const PHASE_FILES = [
  "packages/web/index.html",
  "packages/web/src/index.css",
  "packages/web/tailwind.config.js",
  "packages/web/src/main.tsx",
  "packages/web/src/App.tsx",
  "packages/web/src/components/layout/AppShell.tsx",
  "packages/web/src/components/ui/Button.tsx",
  "packages/web/src/components/ui/Panel.tsx",
  "packages/web/src/components/ui/PageHeader.tsx",
  "packages/web/src/components/ui/StatusIndicator.tsx",
  "packages/web/src/components/ui/AgentEventChip.tsx",
  "packages/web/src/components/ui/MetricStrip.tsx",
  "packages/web/src/components/ui/DataTable.tsx",
  "packages/web/src/components/ui/InputField.tsx",
  "packages/web/src/components/ui/Dialog.tsx",
  "packages/web/src/components/ui/EmptyState.tsx",
  "packages/web/src/components/ui/SegmentedTabs.tsx",
  "packages/web/src/components/ui/AgentParticleCloud.tsx",
  "packages/web/src/components/ui/ReasoningStepList.tsx",
  "packages/web/src/components/ui/SimulationSlider.tsx",
  "packages/web/src/components/views/DashboardOverviewView.tsx",
  "packages/web/src/components/views/HitlApprovalsView.tsx",
  "packages/web/src/components/canvas/WorkflowCanvas.tsx",
  "packages/web/src/components/views/KnowledgeGraphView.tsx",
  "packages/web/src/components/graph/KnowledgeGraphCanvas.tsx",
];

function checkFile(filePath: string): Violation[] {
  const violations: Violation[] = [];
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/);
  const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, "/");

  // 1. select-none global en body
  if (filePath.endsWith("index.html") || filePath.endsWith("index.css")) {
    lines.forEach((line, i) => {
      if (line.includes("select-none") && (line.includes("body") || line.includes("<body"))) {
        violations.push({
          file: relPath,
          line: i + 1,
          rule: "select-none global prohibido",
          detail: "body no debe tener select-none global. Debe permitir copiar SKUs y datos.",
        });
      }
    });
  }

  // Reglas para código fuente web (.tsx, .ts, .jsx, .js)
  lines.forEach((line, i) => {
    const lineNum = i + 1;

    // 2. Hex hardcodeado en className o clases inline
    const classNameMatch = line.match(/className=["']([^"']+)["']/);
    if (classNameMatch) {
      const cls = classNameMatch[1];

      // Hex en className: #[0-9a-fA-F]{3,8} o bg-[#...]
      const hexMatch = cls.match(/#[0-9a-fA-F]{3,8}/);
      if (hexMatch) {
        violations.push({
          file: relPath,
          line: lineNum,
          rule: "Hex hardcodeado en className",
          detail: `Encontrado hex '${hexMatch[0]}' en className. Usa tokens de Mint-DESIGN.md.`,
        });
      }

      // 3. Clases emerald-*
      const emeraldMatch = cls.match(/\bemerald-[\w/-]+/);
      if (emeraldMatch) {
        violations.push({
          file: relPath,
          line: lineNum,
          rule: "Clase emerald-* prohibida",
          detail: `Encontrada clase '${emeraldMatch[0]}'. Usa tokens semánticos (brand, state-*).`,
        });
      }

      // 4. Texto menor a 12px (text-[8px], text-[9px], text-[10px], text-[11px])
      const sub12Match = cls.match(/text-\[(8|9|10|11)px\]/);
      if (sub12Match) {
        violations.push({
          file: relPath,
          line: lineNum,
          rule: "Texto < 12px prohibido",
          detail: `Encontrado '${sub12Match[0]}'. El mínimo absoluto es 12px (caption).`,
        });
      }

      // 5. uppercase junto a tracking-*
      if (cls.includes("uppercase") && /tracking-(wider|widest|tight|tighter)/.test(cls)) {
        violations.push({
          file: relPath,
          line: lineNum,
          rule: "uppercase con tracking prohibido",
          detail: "No se permiten etiquetas en mayúsculas con espaciado (uppercase tracking-*).",
        });
      }

      // 6. backdrop-blur
      if (cls.includes("backdrop-blur")) {
        violations.push({
          file: relPath,
          line: lineNum,
          rule: "backdrop-blur prohibido",
          detail: "Cero backdrop-blur. Las superficies son sólidas y descansadas.",
        });
      }
    }

    // 7. Nombres técnicos prohibidos en textos visibles
    if (!filePath.endsWith("check-design.ts") && !filePath.endsWith(".test.ts")) {
      for (const pattern of BANNED_TECHNICAL_WORDS) {
        const regex = new RegExp(pattern, "i");
        if (regex.test(line)) {
          // Si no es un comentario de código ni un import
          if (!line.trim().startsWith("//") && !line.trim().startsWith("/*") && !line.includes("import ")) {
            violations.push({
              file: relPath,
              line: lineNum,
              rule: "Jerga técnica prohibida en UI",
              detail: `Palabra o patrón '${pattern}' encontrado en UI visible. Usa lenguaje de negocio.`,
            });
            break;
          }
        }
      }
    }
  });

  return violations;
}

function getAllFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, fileList);
    } else if (/\.(tsx|ts|html|css|js)$/.test(file)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function main() {
  const isAllMode = process.argv.includes("--all");
  console.log("\n======================================================");
  console.log("  MINT DESIGN SYSTEM V2 — VERIFICADOR AUTOMÁTICO       ");
  console.log("======================================================\n");

  let targetFiles: string[] = [];

  if (isAllMode) {
    console.log("Modo: Análisis de Todo packages/web/src...");
    targetFiles = getAllFiles(path.resolve(process.cwd(), "packages/web/src"));
    targetFiles.push(path.resolve(process.cwd(), "packages/web/index.html"));
    targetFiles.push(path.resolve(process.cwd(), "packages/web/tailwind.config.js"));
  } else {
    console.log("Modo: Fase 0 y Fase 1 (Cimientos, Shell, Componentes, Inicio y Aprobaciones)");
    targetFiles = PHASE_FILES.map((f) => path.resolve(process.cwd(), f)).filter((f) =>
      fs.existsSync(f)
    );
  }

  console.log(`Examinando ${targetFiles.length} archivo(s)...\n`);

  let totalViolations = 0;
  for (const file of targetFiles) {
    const violations = checkFile(file);
    if (violations.length > 0) {
      totalViolations += violations.length;
      console.log(`❌ ${path.relative(process.cwd(), file)} (${violations.length} infracciones):`);
      for (const v of violations) {
        console.log(`   Línea ${v.line}: [${v.rule}] ${v.detail}`);
      }
      console.log("");
    }
  }

  if (totalViolations === 0) {
    console.log("✓ TODOS LOS ARCHIVOS CUMPLEN MINT-DESIGN.MD AL 100%!");
    console.log("  • Cero hex en className.");
    console.log("  • Cero clases emerald-*.");
    console.log("  • Cero textos < 12px.");
    console.log("  • Cero uppercase con tracking.");
    console.log("  • Cero backdrop-blur.");
    console.log("  • Cero select-none global.");
    console.log("  • Cero jerga técnica visible.\n");
    process.exit(0);
  } else {
    console.error(`\nFALLO: Se encontraron ${totalViolations} infracción(es) de diseño.`);
    process.exit(1);
  }
}

main();

