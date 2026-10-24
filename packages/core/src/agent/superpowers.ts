import * as fs from "node:fs";
import * as path from "node:path";

/**
 * MINT SUPERPOWERS ENGINE (SISTEMA DE HABILIDADES Y DIRECTIVAS MARKDOWN)
 * 
 * Lee dinámicamente archivos de instrucciones Markdown (.md) desde disco (src/agent/skills/)
 * e inyecta reglas de seguridad y estrategias de dominio experto según la consulta.
 */

export interface SuperpowerDefinition {
  id: string;
  name: string;
  badge: string;
  description: string;
  markdownFile: string;
  triggers: string[];
}

export const MINT_SUPERPOWERS: Record<string, SuperpowerDefinition> = {
  FINANCIAL_MAESTRO: {
    id: "FINANCIAL_MAESTRO",
    name: "Finanzas & ROI de Inventario",
    badge: "[SKILL] Financial Maestro",
    description: "Dominio en optimización de flujo de caja, retorno de inversión y presupuestos.",
    markdownFile: "financial_maestro.md",
    triggers: ["financiero", "dinero", "presupuesto", "costo", "valuacion", "gasto", "roi", "pesos", "valioso"],
  },
  SUPPLY_CHAIN_CRISIS: {
    id: "SUPPLY_CHAIN_CRISIS",
    name: "Resiliencia & Gestión de Crisis",
    badge: "[SKILL] Supply Chain Crisis",
    description: "Dominio en desabastecimiento inminente, simulaciones y compras urgentes.",
    markdownFile: "supply_chain_crisis.md",
    triggers: ["agotado", "emergencia", "crisis", "retraso", "urgente", "sin stock", "carencia", "falta"],
  },
  PROCUREMENT_NEGOTIATOR: {
    id: "PROCUREMENT_NEGOTIATOR",
    name: "Estratega de Compras & Proveedores",
    badge: "[SKILL] Procurement Negotiator",
    description: "Dominio en matriz comparativa de proveedores y selección por costo/velocidad.",
    markdownFile: "procurement_negotiator.md",
    triggers: ["proveedor", "proveedores", "cotizar", "cotizacion", "grainger", "uline", "mouser", "elegir"],
  },
  EXECUTIVE_ANALYTICS: {
    id: "EXECUTIVE_ANALYTICS",
    name: "Analítica & Reportes Ejecutivos",
    badge: "[SKILL] Executive Analytics",
    description: "Dominio en síntesis de KPIs de negocio y reportes para dirección.",
    markdownFile: "executive_analytics.md",
    triggers: ["reporte", "resumen", "ejecutivo", "ganadores", "mas vendido", "kpi", "analisis", "estado"],
  },
};

/**
 * Carga el contenido de un archivo Markdown de habilidad desde disco
 */
function loadSkillMarkdown(filename: string): string {
  try {
    const filePath = path.join(__dirname, "skills", filename);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, "utf-8");
    }
  } catch {
    // Fallback silencioso si no se encuentra
  }
  return "";
}

/**
 * Detecta qué Superpoderes activar basándose en el query del usuario
 */
export function detectActivatedSuperpowers(userQuery: string): SuperpowerDefinition[] {
  const queryLower = userQuery.toLowerCase();
  const activated: SuperpowerDefinition[] = [];

  for (const superpower of Object.values(MINT_SUPERPOWERS)) {
    const isMatched = superpower.triggers.some((trigger) => queryLower.includes(trigger));
    if (isMatched) {
      activated.push(superpower);
    }
  }

  if (activated.length === 0) {
    activated.push(MINT_SUPERPOWERS.EXECUTIVE_ANALYTICS);
  }

  return activated;
}

/**
 * Construye el contexto completo inyectando los Markdowns de los Superpoderes activados
 * más el archivo de guardrails de seguridad (security_guardrails.md).
 */
export function buildSuperpowerContext(activatedSuperpowers: SuperpowerDefinition[]): string {
  const securityMarkdown = loadSkillMarkdown("security_guardrails.md");
  
  if (!activatedSuperpowers.length) {
    return securityMarkdown ? `\n---\n${securityMarkdown}\n---` : "";
  }

  const badges = activatedSuperpowers.map((s) => s.badge).join(" | ");
  const superpowerMarkdowns = activatedSuperpowers
    .map((s) => loadSkillMarkdown(s.markdownFile))
    .filter(Boolean)
    .join("\n\n---\n\n");

  return `
---
### [HABILIDADES] SISTEMA DE HABILIDADES OPERATIVAS ACTIVADO (${badges})

${superpowerMarkdowns}

---
### [GUARDRAILS] DIRECTIVAS Y REGLAS DE SEGURIDAD GENERALES
${securityMarkdown}
---
`;
}
