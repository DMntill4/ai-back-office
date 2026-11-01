/**
 * Mint Command Registry — Catálogo Integral de Slash Commands
 *
 * Mapeo exhaustivo y tipado de TODOS los comandos de `packages/cli`
 * adaptados a la vista Command Deck de `packages/web`.
 *
 * Cada comando cuenta con categoría por dominio, argumentos tipados,
 * endpoint en `packages/api` y tipo de renderizado visual estructurado.
 */

export type SlashCategory = "agents" | "operations" | "data" | "system";

export type RenderType =
  | "theme-preview"
  | "status-badge"
  | "agent-tree"
  | "voucher"
  | "table"
  | "metrics-card"
  | "generic-data";

export interface CommandArg {
  name: string;
  type: "select" | "string" | "number";
  options?: string[];
  required?: boolean;
  default?: string;
  placeholder?: string;
}

export interface SlashCommand {
  command: string;
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
  // ==========================================
  // 1. AUTOMATIZACIÓN, AGENTES E INTELIGENCIA
  // ==========================================
  {
    command: "/agents",
    category: "agents",
    title: "Gestión de Agentes Especialistas",
    description: "Panel de control y orquestación de los 4 subagentes especialistas de Mint.",
    args: [
      { name: "action", type: "select", options: ["status", "list", "run-all"], default: "status" },
    ],
    endpoint: "/api/daemon",
    renderType: "status-badge",
    iconName: "Bot",
  },
  {
    command: "/autonomy",
    category: "agents",
    title: "Nivel de Autonomía Operativa",
    description: "Configura el nivel de delegación autónoma: supervisado (dry-run), asistido o autónomo pleno.",
    args: [
      { name: "level", type: "select", options: ["dry-run", "assisted", "auto"], default: "assisted" },
    ],
    endpoint: "/api/config",
    renderType: "status-badge",
    iconName: "Shield",
  },
  {
    command: "/daemon",
    category: "agents",
    title: "Control del Demonio Proactivo",
    description: "Supervisa o interviene los ciclos de inspección autónoma y vigilancia de inventario.",
    args: [
      { name: "action", type: "select", options: ["status", "pause", "resume", "trigger-now", "watch", "plan"], default: "status" },
    ],
    endpoint: "/api/daemon",
    renderType: "status-badge",
    iconName: "Activity",
  },
  {
    command: "/shadow",
    category: "agents",
    title: "Gobernanza de Modo Sombra",
    description: "Inspecciona decisiones ejecutadas en simulación sin enviar órdenes al mundo real.",
    args: [
      { name: "action", type: "select", options: ["status", "enable_7d", "enable_14d", "disable", "compare"], default: "status" },
    ],
    endpoint: "/api/shadow/status",
    renderType: "status-badge",
    iconName: "EyeOff",
  },
  {
    command: "/goal",
    category: "agents",
    title: "Meta Operativa del Negocio",
    description: "Fija el criterio rector cuantitativo de los agentes (cero desabastos, margen máximo o balanceado).",
    args: [
      { name: "target", type: "select", options: ["cero_desabastos", "margen_maximo", "balanceado"], default: "cero_desabastos" },
    ],
    endpoint: "/api/inventory/summary",
    renderType: "metrics-card",
    iconName: "Target",
  },
  {
    command: "/simulate",
    category: "agents",
    title: "Simulador de Escenarios de Crisis",
    description: "Proyecta el impacto de quiebres de stock, retrasos viales o picos inesperados de demanda.",
    args: [
      { name: "scenario", type: "select", options: ["stockout", "delay", "price-spike"], default: "stockout" },
      { name: "sku", type: "string", placeholder: "SKU opcional (ej. PROD-1004)" },
    ],
    endpoint: "/api/decisions/pending",
    renderType: "agent-tree",
    iconName: "Sparkles",
  },
  {
    command: "/explain",
    category: "agents",
    title: "Auditoría de Árbol de Pensamiento",
    description: "Explica la deliberación multi-agente, evidencia y regla de política tras una decisión.",
    args: [
      { name: "id", type: "string", placeholder: "ID de decisión (ej. dec_latest)", default: "dec_latest" },
    ],
    endpoint: "/api/decisions/pending",
    renderType: "agent-tree",
    iconName: "GitBranch",
  },
  {
    command: "/intel",
    category: "agents",
    title: "Inteligencia Predictiva de Inventario",
    description: "Análisis predictivo de demanda futura, rotación ABC y curvas de agotamiento por producto.",
    args: [
      { name: "module", type: "select", options: ["demand", "turnover", "abc"], default: "demand" },
    ],
    endpoint: "/api/inventory/summary",
    renderType: "metrics-card",
    iconName: "BrainCircuit",
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
    command: "/questions",
    category: "agents",
    title: "Banco de Preguntas de Datos Faltantes",
    description: "Resuelve dudas operativas retenidas por los agentes para asegurar la verdad de los datos.",
    args: [
      { name: "action", type: "select", options: ["list", "pending", "resolved"], default: "list" },
    ],
    endpoint: "/api/questions",
    renderType: "agent-tree",
    iconName: "HelpCircle",
  },
  {
    command: "/chat",
    category: "agents",
    title: "Consulta al Coordinador",
    description: "Envía una solicitud analítica puntual al orquestador central con contexto de inventario.",
    args: [
      { name: "message", type: "string", placeholder: "¿Cuál es el SKU con mayor riesgo de quiebre?" },
    ],
    endpoint: "/api/chat",
    renderType: "agent-tree",
    iconName: "MessageSquare",
  },
  {
    command: "/today",
    category: "agents",
    title: "Resumen de Ejecución Diaria",
    description: "Métricas consolidadas de decisiones aprobadas, presupuesto utilizado y órdenes despachadas hoy.",
    args: [],
    endpoint: "/api/inventory/summary",
    renderType: "metrics-card",
    iconName: "Calendar",
  },
  {
    command: "/plan",
    category: "agents",
    title: "Plan Operativo Diario",
    description: "Despliega la hoja de ruta generada por el agente para reposición y consolidación logística.",
    args: [],
    endpoint: "/api/daemon",
    renderType: "agent-tree",
    iconName: "ListTodo",
  },

  // ==========================================
  // 2. OPERACIONES, INVENTARIO Y LOGÍSTICA
  // ==========================================
  {
    command: "/stock",
    category: "operations",
    title: "Consulta de Existencias Reales",
    description: "Consulta stock físico en bodegas, inventario disponible y detección de quiebres inminentes.",
    args: [
      { name: "filter", type: "select", options: ["all", "agotados", "bajo_rop"], default: "all" },
    ],
    endpoint: "/api/inventory/summary",
    renderType: "metrics-card",
    iconName: "Package",
  },
  {
    command: "/orders",
    category: "operations",
    title: "Órdenes de Compra en Producción",
    description: "Consulta órdenes emitidas en PostgreSQL con desglose financiero y estado de adjudicación.",
    args: [
      { name: "status", type: "select", options: ["todas", "abiertas", "recibidas", "canceladas"], default: "todas" },
    ],
    endpoint: "/api/orders",
    renderType: "voucher",
    iconName: "FileCheck",
  },
  {
    command: "/reconcile",
    category: "operations",
    title: "Conciliación de 3 Vías",
    description: "Concilia existencias físicas contra ventas facturadas y despachos de proveedores.",
    args: [
      { name: "scope", type: "select", options: ["all", "criticos", "agotados"], default: "all" },
    ],
    endpoint: "/api/inventory/rop-alerts",
    renderType: "voucher",
    iconName: "FileSpreadsheet",
  },
  {
    command: "/audit",
    category: "operations",
    title: "Canal Inmutable de Auditoría",
    description: "Inspecciona el libro mayor de eventos inmutables y trazabilidad de operaciones.",
    args: [
      { name: "module", type: "select", options: ["all", "stock", "ventas", "logistica", "compras"], default: "all" },
      { name: "limit", type: "select", options: ["25", "50", "100"], default: "50" },
    ],
    endpoint: "/api/events",
    renderType: "agent-tree",
    iconName: "ShieldAlert",
  },
  {
    command: "/logistics",
    category: "operations",
    title: "Torre de Control Logística",
    description: "Coordina despachos, recepción en muelles, consolidación de carga y rebalanceo entre bodegas.",
    args: [
      { name: "subcommand", type: "select", options: ["overview", "dispatch", "receive", "consolidate", "rebalance", "gps", "route"], default: "overview" },
    ],
    endpoint: "/api/logistics",
    renderType: "generic-data",
    iconName: "Truck",
  },
  {
    command: "/fleet",
    category: "operations",
    title: "Gestión de Flota y Transportadoras",
    description: "Estado de camiones asignados, capacidad volumétrica ocupada y horas de servicio del conductor.",
    args: [],
    endpoint: "/api/logistics",
    renderType: "generic-data",
    iconName: "Truck",
  },
  {
    command: "/track",
    category: "operations",
    title: "Rastreo de Envíos en Tiempo Real",
    description: "Localización GPS de guías de despacho, cálculo de retrasos por clima y estimación de llegada.",
    args: [
      { name: "query", type: "string", placeholder: "Número de guía (ej. GUIA-CO-99827361)", default: "GUIA-CO-99827361" },
    ],
    endpoint: "/api/logistics",
    renderType: "generic-data",
    iconName: "MapPin",
  },
  {
    command: "/suppliers",
    category: "operations",
    title: "Evaluación y Scoring de Proveedores",
    description: "Compara confiabilidad, tiempos de entrega (lead time) y cotizaciones de proveedores.",
    args: [
      { name: "action", type: "select", options: ["list", "ranking", "quotes"], default: "list" },
    ],
    endpoint: "/api/suppliers",
    renderType: "table",
    iconName: "Building2",
  },
  {
    command: "/customers",
    category: "operations",
    title: "Cartera y Segmentación de Clientes",
    description: "Consulta clientes prioritarios, volumen de compra y alertas de cuentas en riesgo de abandono.",
    args: [],
    endpoint: "/api/analytics",
    renderType: "table",
    iconName: "Users",
  },
  {
    command: "/inbox",
    category: "operations",
    title: "Bandeja de Decisiones HITL",
    description: "Inspecciona compras pendientes que requieren firma de aprobación antes de emitirse a proveedores.",
    args: [
      { name: "action", type: "select", options: ["list", "summary"], default: "list" },
    ],
    endpoint: "/api/decisions/pending",
    renderType: "voucher",
    iconName: "Inbox",
  },
  {
    command: "/cancel",
    category: "operations",
    title: "Cancelación de Propuesta",
    description: "Revoca una orden de compra o acción autónoma pendiente antes de su confirmación.",
    args: [
      { name: "id", type: "string", placeholder: "ID de propuesta a cancelar" },
    ],
    endpoint: "/api/decisions",
    renderType: "status-badge",
    iconName: "XCircle",
  },
  {
    command: "/reports",
    category: "operations",
    title: "Generador de Reportes Financieros",
    description: "Exporta balances de existencias, compras proyectadas y rentabilidad por sucursal.",
    args: [
      { name: "type", type: "select", options: ["briefing", "stock", "sales", "orders", "profit"], default: "briefing" },
      { name: "format", type: "select", options: ["json", "csv", "pdf"], default: "json" },
    ],
    endpoint: "/api/reports",
    renderType: "metrics-card",
    iconName: "FileSpreadsheet",
  },

  // ==========================================
  // 3. DATOS, MEMORIA Y CONECTIVIDAD
  // ==========================================
  {
    command: "/source",
    category: "data",
    title: "Gestión de Fuentes de Datos",
    description: "Conecta e inspecciona orígenes de datos externos (PostgreSQL, SQLite, SQL Server, Excel/CSV).",
    args: [
      { name: "subcommand", type: "select", options: ["list", "status", "discover", "inspect", "test"], default: "list" },
    ],
    endpoint: "/api/db/status",
    renderType: "table",
    iconName: "Database",
  },
  {
    command: "/mapping",
    category: "data",
    title: "Mapeo Seguro de Esquemas",
    description: "Inspecciona el mapeo entre las tablas originales del cliente y el catálogo maestro de Mint.",
    args: [
      { name: "action", type: "select", options: ["show", "validate", "diff"], default: "show" },
    ],
    endpoint: "/api/db/status",
    renderType: "table",
    iconName: "Layers",
  },
  {
    command: "/data-health",
    category: "data",
    title: "Salud y Calidad de Datos",
    description: "Audita consistencia referencial, duplicados, frescura de datos y compuertas de decisión.",
    args: [],
    endpoint: "/api/data-health/audit",
    renderType: "table",
    iconName: "HeartPulse",
  },
  {
    command: "/quarantine",
    category: "data",
    title: "Mesa de Cuarentena de Datos",
    description: "Aísla registros corruptos o inconsistentes para evitar que afecten las decisiones del agente.",
    args: [
      { name: "action", type: "select", options: ["list", "inspect", "clear"], default: "list" },
    ],
    endpoint: "/api/data-health/audit",
    renderType: "table",
    iconName: "ShieldAlert",
  },
  {
    command: "/database",
    category: "data",
    title: "Estado y Sincronización de BD",
    description: "Verifica el estado del pool de conexiones PostgreSQL, transacciones activas y migraciones.",
    args: [
      { name: "subcommand", type: "select", options: ["status", "sync", "pool"], default: "status" },
    ],
    endpoint: "/api/db/status",
    renderType: "table",
    iconName: "Database",
  },
  {
    command: "/memory",
    category: "data",
    title: "Bóveda de Memoria Obsidian",
    description: "Supervisa notas en Markdown, enlaces WikiLinks y memoria persistente del agente.",
    args: [
      { name: "action", type: "select", options: ["status", "rebuild", "list", "metrics"], default: "status" },
    ],
    endpoint: "/api/vault/metrics",
    renderType: "table",
    iconName: "BookOpen",
  },
  {
    command: "/graph",
    category: "data",
    title: "Inspección del Grafo de Conocimiento",
    description: "Consulta nodos, relaciones y dependencias semánticas entre productos, bodegas y proveedores.",
    args: [
      { name: "action", type: "select", options: ["stats", "nodes", "relations"], default: "stats" },
    ],
    endpoint: "/api/graph",
    renderType: "agent-tree",
    iconName: "Share2",
  },
  {
    command: "/channels",
    category: "data",
    title: "Canales de Notificación y Webhooks",
    description: "Configura canales externos de alerta en tiempo real (Telegram, Slack, Discord, Correo).",
    args: [
      { name: "action", type: "select", options: ["list", "status", "test"], default: "list" },
    ],
    endpoint: "/api/channels",
    renderType: "generic-data",
    iconName: "Radio",
  },
  {
    command: "/notify",
    category: "data",
    title: "Prueba y Envío de Alertas",
    description: "Dispara una alerta de prueba a los canales activos para verificar la entrega.",
    args: [
      { name: "channel", type: "select", options: ["telegram", "slack", "discord", "email"], default: "telegram" },
      { name: "type", type: "select", options: ["test", "urgent_stock", "po_created"], default: "test" },
    ],
    endpoint: "/api/channels",
    renderType: "status-badge",
    iconName: "Bell",
  },
  {
    command: "/backup",
    category: "data",
    title: "Copia de Seguridad de Configuración",
    description: "Exporta una instantánea segura de la configuración, bóveda de memoria y parámetros de gobernanza.",
    args: [],
    endpoint: "/api/vault/metrics",
    renderType: "status-badge",
    iconName: "Download",
  },
  {
    command: "/telegram",
    category: "data",
    title: "Bot de Interacción Telegram",
    description: "Verifica el estado del listener de Telegram para aprobaciones HITL mediante mensajes móviles.",
    args: [
      { name: "subcommand", type: "select", options: ["status", "test"], default: "status" },
    ],
    endpoint: "/api/channels",
    renderType: "status-badge",
    iconName: "Send",
  },

  // ==========================================
  // 4. SISTEMA, CONFIGURACIÓN Y UI
  // ==========================================
  {
    command: "/theme-factory",
    category: "system",
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
    command: "/doctor",
    category: "system",
    title: "Preflight System Diagnostic",
    description: "Comprueba latencia de base de datos, motor de inferencia LLM, notificaciones y firma HMAC.",
    args: [],
    endpoint: "/api/db/status",
    renderType: "table",
    iconName: "Stethoscope",
  },
  {
    command: "/selftest",
    category: "system",
    title: "Aserción y Test de Producción",
    description: "Ejecuta suite de autodiagnóstico integral con validación de paso/fallo en cada componente.",
    args: [],
    endpoint: "/api/health",
    renderType: "table",
    iconName: "CheckCircle2",
  },
  {
    command: "/config",
    category: "system",
    title: "Configuración y Gobernanza",
    description: "Audita las variables de entorno, políticas de aprobación y umbrales de compra automáticos.",
    args: [
      { name: "subcommand", type: "select", options: ["show", "audit", "rules"], default: "show" },
    ],
    endpoint: "/api/config",
    renderType: "table",
    iconName: "Settings",
  },
  {
    command: "/setup",
    category: "system",
    title: "Inicialización del Entorno",
    description: "Configuración interactiva de la empresa, sucursales y parámetros iniciales de operación.",
    args: [],
    endpoint: "/api/profile",
    renderType: "status-badge",
    iconName: "SlidersHorizontal",
  },
  {
    command: "/onboarding",
    category: "system",
    title: "Asistente de Onboarding",
    description: "Estado del proceso de bienvenida, verificación de catálogo y vinculación de bodega inicial.",
    args: [],
    endpoint: "/api/profile",
    renderType: "status-badge",
    iconName: "UserCheck",
  },
  {
    command: "/profile",
    category: "system",
    title: "Perfil de la Compañía",
    description: "Consulta información fiscal, sede principal, sucursales y moneda operativa activa.",
    args: [],
    endpoint: "/api/profile",
    renderType: "table",
    iconName: "Building",
  },
  {
    command: "/whoami",
    category: "system",
    title: "Sesión y Credenciales del Operador",
    description: "Muestra el usuario conectado, rol asignado, permisos de firma y empresa activa.",
    args: [],
    endpoint: "/api/profile",
    renderType: "table",
    iconName: "User",
  },
  {
    command: "/team",
    category: "system",
    title: "Gestión de Equipo y Roles RBAC",
    description: "Lista miembros de la organización, roles asignados y solicitudes de autorización pendientes.",
    args: [
      { name: "action", type: "select", options: ["list", "roles", "audit"], default: "list" },
    ],
    endpoint: "/api/team",
    renderType: "table",
    iconName: "Users",
  },
  {
    command: "/demo",
    category: "system",
    title: "Modo Sandbox Demostrativo",
    description: "Activa o desactiva el entorno aislado de prueba con datos simulados sin alterar producción.",
    args: [
      { name: "action", type: "select", options: ["status", "enter", "exit"], default: "status" },
    ],
    endpoint: "/api/config",
    renderType: "status-badge",
    iconName: "FlaskConical",
  },
  {
    command: "/start",
    category: "system",
    title: "Estado del Daemon y Servidor",
    description: "Verifica que el servidor Fastify y el demonio autónomo estén corriendo y saludables.",
    args: [],
    endpoint: "/api/daemon",
    renderType: "status-badge",
    iconName: "Power",
  },
  {
    command: "/login",
    category: "system",
    title: "Estado de Autenticación",
    description: "Comprueba la validez de la sesión activa y la vigencia del token de seguridad.",
    args: [],
    endpoint: "/api/profile",
    renderType: "status-badge",
    iconName: "Key",
  },
  {
    command: "/app",
    category: "system",
    title: "Entorno Web y Tauri Desktop",
    description: "Verifica las capacidades de aceleración de hardware y persistencia en el cliente.",
    args: [],
    endpoint: "/api/health",
    renderType: "status-badge",
    iconName: "Monitor",
  },
  {
    command: "/console",
    category: "system",
    title: "Consola de Control Autónomo",
    description: "Estado de la consola interactiva de orquestación y colas de tareas activas.",
    args: [],
    endpoint: "/api/daemon",
    renderType: "status-badge",
    iconName: "Terminal",
  },
  {
    command: "/dashboard",
    category: "system",
    title: "Panel de Control Unificado",
    description: "Resumen integral de estado: inventario, casos en trámite, daemon y alertas activas.",
    args: [],
    endpoint: "/api/inventory/summary",
    renderType: "metrics-card",
    iconName: "LayoutDashboard",
  },
];

const PINNED_STORAGE_KEY = "mint_pinned_slash_commands";

export function getPinnedCommands(): string[] {
  if (typeof localStorage === "undefined") {
    return ["/theme-factory", "/stock", "/daemon", "/audit", "/orders", "/doctor"];
  }
  try {
    const raw = localStorage.getItem(PINNED_STORAGE_KEY);
    return raw ? JSON.parse(raw) : ["/theme-factory", "/stock", "/daemon", "/audit", "/orders", "/doctor"];
  } catch {
    return ["/theme-factory", "/stock", "/daemon", "/audit", "/orders", "/doctor"];
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
