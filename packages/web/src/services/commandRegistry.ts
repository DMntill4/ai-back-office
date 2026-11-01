/**
 * Mint Command Registry — Slash Command Automation Center
 *
 * Registro extensible de automatizaciones estructuradas ejecutables
 * mediante comandos de barra ("/"). No es un chatbot ni terminal ASCII,
 * sino un orquestador tipado estilo Raycast / Linear Command Deck.
 */

export type SlashCategory = "automation" | "agents" | "inventory" | "system" | "ui";

export type RenderType =
  | "metrics-card"
  | "table"
  | "agent-tree"
  | "theme-preview"
  | "status-badge";

export interface CommandArg {
  name: string;
  type: "select" | "string" | "number";
  options?: string[];
  required?: boolean;
  default?: string;
  placeholder?: string;
}

export interface SlashCommand {
  command: string; // ej. '/theme-factory'
  category: SlashCategory;
  title: string;
  description: string;
  args?: CommandArg[];
  endpoint?: string;
  renderType: RenderType;
  iconName: string;
}

export interface CommandExecution {
  id: string;
  command: string;
  rawInput: string;
  parsedArgs: Record<string, string>;
  status: "success" | "running" | "error";
  latencyMs: number;
  timestamp: string;
  renderType: RenderType;
  resultData: any;
  errorMessage?: string;
  isPinned?: boolean;
}

export const COMMAND_REGISTRY: SlashCommand[] = [
  {
    command: "/theme-factory",
    category: "ui",
    title: "Theme Factory",
    description: "Personaliza los tokens de color, superficies y contraste de la interfaz en tiempo real.",
    args: [
      {
        name: "mode",
        type: "select",
        options: ["mint-dark", "obsidian", "high-contrast", "emerald-cyber"],
        required: true,
        default: "mint-dark",
      },
    ],
    renderType: "theme-preview",
    iconName: "Palette",
  },
  {
    command: "/audit-anomalies",
    category: "automation",
    title: "Auditoría Autónoma de Anomalías",
    description: "Escanea discrepancias en stock, órdenes bloqueadas y rutas de transporte en riesgo.",
    args: [
      {
        name: "scope",
        type: "select",
        options: ["all", "inventory", "orders", "logistics"],
        required: false,
        default: "all",
      },
    ],
    endpoint: "/api/decisions/pending",
    renderType: "agent-tree",
    iconName: "ShieldAlert",
  },
  {
    command: "/reconcile",
    category: "automation",
    title: "Conciliación de Stock y Órdenes",
    description: "Compara existencias físicas en bodegas contra órdenes emitidas y pendientes.",
    args: [
      {
        name: "scope",
        type: "select",
        options: ["all", "criticos", "agotados"],
        required: false,
        default: "all",
      },
    ],
    endpoint: "/api/inventory/rop-alerts",
    renderType: "table",
    iconName: "FileSpreadsheet",
  },
  {
    command: "/simulate",
    category: "automation",
    title: "Simulador de Escenarios de Crisis",
    description: "Proyecta el impacto de quiebres de cadena de suministro o picos de demanda.",
    args: [
      {
        name: "escenario",
        type: "select",
        options: ["quiebre_stock_72h", "pico_demanda_200pct", "retraso_vial_invias"],
        required: true,
        default: "quiebre_stock_72h",
      },
    ],
    renderType: "agent-tree",
    iconName: "Sparkles",
  },
  {
    command: "/daemon-control",
    category: "agents",
    title: "Control del Demonio Proactivo",
    description: "Supervisa o interviene los ciclos de inspección autónoma y vigilancia de inventario.",
    args: [
      {
        name: "action",
        type: "select",
        options: ["status", "pause", "resume", "trigger-now"],
        required: true,
        default: "status",
      },
    ],
    endpoint: "/api/daemon",
    renderType: "status-badge",
    iconName: "Bot",
  },
  {
    command: "/shadow-mode",
    category: "agents",
    title: "Gobernanza de Modo Sombra",
    description: "Inspecciona decisiones ejecutadas en simulación sin enviar órdenes de compra al mundo real.",
    args: [
      {
        name: "state",
        type: "select",
        options: ["status", "enable_7d", "enable_14d", "disable"],
        required: false,
        default: "status",
      },
    ],
    endpoint: "/api/shadow/status",
    renderType: "status-badge",
    iconName: "EyeOff",
  },
  {
    command: "/briefing",
    category: "agents",
    title: "Informe Ejecutivo Diario",
    description: "Genera el resumen de capital en almacén, alertas prioritarias y decisiones recomendadas.",
    args: [],
    endpoint: "/api/inventory/summary",
    renderType: "metrics-card",
    iconName: "FileText",
  },
  {
    command: "/data-health",
    category: "system",
    title: "Salud y Cuarentena de Datos",
    description: "Audita la coherencia de las tablas maestras, duplicados y registros en cuarentena.",
    args: [],
    endpoint: "/api/data-health/audit",
    renderType: "table",
    iconName: "Activity",
  },
  {
    command: "/doctor",
    category: "system",
    title: "Preflight System Diagnostic",
    description: "Comprueba latencia de base de datos, motor de embeddings, conectores y firma HMAC.",
    args: [],
    endpoint: "/api/db/status",
    renderType: "status-badge",
    iconName: "Stethoscope",
  },
  {
    command: "/goal",
    category: "automation",
    title: "Meta Operativa del Negocio",
    description: "Fija el criterio rector de los agentes (margen máximo, cero desabastos o balanceado).",
    args: [
      {
        name: "target",
        type: "select",
        options: ["cero_desabastos", "margen_maximo", "balanceado"],
        required: true,
        default: "cero_desabastos",
      },
    ],
    renderType: "metrics-card",
    iconName: "Target",
  },
];

const PINNED_STORAGE_KEY = "mint_pinned_slash_commands";

export function getPinnedCommands(): string[] {
  if (typeof localStorage === "undefined") return ["/theme-factory", "/audit-anomalies", "/daemon-control"];
  try {
    const raw = localStorage.getItem(PINNED_STORAGE_KEY);
    return raw ? JSON.parse(raw) : ["/theme-factory", "/audit-anomalies", "/daemon-control"];
  } catch {
    return ["/theme-factory", "/audit-anomalies", "/daemon-control"];
  }
}

export function togglePinCommand(commandStr: string): string[] {
  const current = getPinnedCommands();
  const next = current.includes(commandStr)
    ? current.filter((c) => c !== commandStr)
    : [...current, commandStr];
  try {
    localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignorar
  }
  return next;
}
