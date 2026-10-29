/**
 * Zero-dependency ANSI styling system for Mint CLI (Linux TUI / Claude Code style).
 * Tailored with smokey white, deep technical grays, and crisp emerald/mint accent (#10B981).
 */

const isColorSupported =
  !process.env.NO_COLOR &&
  (process.stdout.isTTY || process.env.FORCE_COLOR === "1" || process.env.CI !== "true");

function wrap(open: string, close: string) {
  return (text: string | number) => {
    if (!isColorSupported) return String(text);
    return `${open}${text}${close}`;
  };
}

export const theme = {
  // Smokey white & technical grays
  smoke: wrap("\x1b[38;2;248;250;252m", "\x1b[39m"),       // #F8FAFC
  smokeBold: wrap("\x1b[1m\x1b[38;2;248;250;252m", "\x1b[22m\x1b[39m"),
  slateLight: wrap("\x1b[38;2;226;232;240m", "\x1b[39m"),  // #E2E8F0
  gray: wrap("\x1b[38;2;148;163;184m", "\x1b[39m"),        // #94A3B8
  darkGray: wrap("\x1b[38;2;100;116;139m", "\x1b[39m"),    // #64748B
  charcoal: wrap("\x1b[38;2;51;65;85m", "\x1b[39m"),       // #334155
  border: wrap("\x1b[38;2;71;85;105m", "\x1b[39m"),        // #475569

  // Brand colors / Technical Accents
  mint: wrap("\x1b[38;2;16;185;129m", "\x1b[39m"), // #10B981
  mintBold: wrap("\x1b[1m\x1b[38;2;16;185;129m", "\x1b[22m\x1b[39m"),
  cyan: wrap("\x1b[38;2;6;182;212m", "\x1b[39m"), // #06B6D4
  cyanBold: wrap("\x1b[1m\x1b[38;2;6;182;212m", "\x1b[22m\x1b[39m"),
  sky: wrap("\x1b[38;2;135;206;250m", "\x1b[39m"), // #87CEFA
  skyBold: wrap("\x1b[1m\x1b[38;2;135;206;250m", "\x1b[22m\x1b[39m"),
  amber: wrap("\x1b[38;2;245;158;11m", "\x1b[39m"), // #F59E0B
  amberBold: wrap("\x1b[1m\x1b[38;2;245;158;11m", "\x1b[22m\x1b[39m"),
  red: wrap("\x1b[38;2;239;68;68m", "\x1b[39m"), // #EF4444
  redBold: wrap("\x1b[1m\x1b[38;2;239;68;68m", "\x1b[22m\x1b[39m"),
  violet: wrap("\x1b[38;2;139;92;246m", "\x1b[39m"), // #8B5CF6

  // Standard ANSI styles
  bold: wrap("\x1b[1m", "\x1b[22m"),
  dim: wrap("\x1b[2m", "\x1b[22m"),
  italic: wrap("\x1b[3m", "\x1b[23m"),
  underline: wrap("\x1b[4m", "\x1b[24m"),
  inverse: wrap("\x1b[7m", "\x1b[27m"),

  // Functional semantic helpers
  success: wrap("\x1b[38;2;16;185;129m", "\x1b[39m"),
  warning: wrap("\x1b[38;2;245;158;11m", "\x1b[39m"),
  danger: wrap("\x1b[38;2;239;68;68m", "\x1b[39m"),
  error: wrap("\x1b[38;2;239;68;68m", "\x1b[39m"),
  info: wrap("\x1b[38;2;6;182;212m", "\x1b[39m"),
  muted: wrap("\x1b[38;2;148;163;184m", "\x1b[39m"),

  // Technical Badges
  badge(text: string, type: "mint" | "cyan" | "amber" | "red" | "gray" | "violet" = "mint") {
    if (!isColorSupported) return `[${text}]`;
    switch (type) {
      case "mint":
        return `\x1b[48;2;16;185;129m\x1b[38;2;0;0;0m\x1b[1m ${text} \x1b[0m`;
      case "cyan":
        return `\x1b[48;2;6;182;212m\x1b[38;2;0;0;0m\x1b[1m ${text} \x1b[0m`;
      case "amber":
        return `\x1b[48;2;245;158;11m\x1b[38;2;0;0;0m\x1b[1m ${text} \x1b[0m`;
      case "red":
        return `\x1b[48;2;239;68;68m\x1b[38;2;255;255;255m\x1b[1m ${text} \x1b[0m`;
      case "violet":
        return `\x1b[48;2;139;92;246m\x1b[38;2;255;255;255m\x1b[1m ${text} \x1b[0m`;
      case "gray":
      default:
        return `\x1b[48;2;51;65;85m\x1b[38;2;248;250;252m\x1b[1m ${text} \x1b[0m`;
    }
  },

  // Strip ANSI helper for alignment calculation
  stripAnsi(str: string): string {
    return str.replace(/\x1b\[[0-9;]*m/g, "");
  },

  // Canal de Auditoría Autónoma Visible
  audit(phase: "OBSERVE" | "DECIDE" | "EXECUTE" | "VERIFY", detail: string): string {
    const badges: Record<string, string> = {
      OBSERVE: wrap("\x1b[1m\x1b[38;2;92;207;230m", "\x1b[22m\x1b[39m")("[OBSERVE]"),
      DECIDE: wrap("\x1b[1m\x1b[38;2;229;192;123m", "\x1b[22m\x1b[39m")("[[SISTEMA] DECIDE] "),
      EXECUTE: wrap("\x1b[1m\x1b[38;2;140;207;126m", "\x1b[22m\x1b[39m")("[[ACCION] EXECUTE]"),
      VERIFY: wrap("\x1b[1m\x1b[38;2;224;108;117m", "\x1b[22m\x1b[39m")("[[SEGURIDAD] VERIFY] "),
    };
    const time = new Date().toLocaleTimeString("es-CO", { hour12: false });
    const timeStr = wrap("\x1b[38;2;75;82;99m", "\x1b[39m")(time);
    const detailStr = wrap("\x1b[38;2;171;178;191m", "\x1b[39m")(detail);
    return `${timeStr} ${badges[phase] || `[${phase}]`} ${detailStr}`;
  },
};

export interface SystemHeaderStatus {
  dbConnected: boolean;
  companyName: string;
  daemonActive: boolean;
  autonomyLevel: string;
  pendingCount: number;
}

/**
 * Renders a Linux-style minimalist status header:
 * [DB: CONECTADA | EMPRESA: <Nombre> | DAEMON: ACTIVO | AUTONOMÍA: NIVEL X | PENDIENTES: X]
 */
export function renderSystemHeader(status: SystemHeaderStatus): string {
  const dbPart = status.dbConnected
    ? `${theme.dim("DB:")} ${theme.mintBold("CONECTADA ●")}`
    : `${theme.dim("DB:")} ${theme.redBold("DESCONECTADA ○")}`;

  const compPart = `${theme.dim("EMPRESA:")} ${theme.smokeBold(status.companyName || "No configurada")}`;

  const daemonPart = status.daemonActive
    ? `${theme.dim("DAEMON:")} ${theme.mintBold("ACTIVO ●")}`
    : `${theme.dim("DAEMON:")} ${theme.darkGray("INACTIVO ○")}`;

  const autonomyBadge =
    status.autonomyLevel === "auto"
      ? theme.mintBold("NIVEL AUTO")
      : status.autonomyLevel === "assisted"
        ? theme.amberBold("NIVEL ASISTIDO")
        : theme.smoke("NIVEL DRY-RUN");
  const autoPart = `${theme.dim("AUTONOMÍA:")} ${autonomyBadge}`;

  const pendPart =
    status.pendingCount > 0
      ? `${theme.dim("PENDIENTES:")} ${theme.amberBold(String(status.pendingCount))}`
      : `${theme.dim("PENDIENTES:")} ${theme.mint("0")}`;

  const content = ` ${dbPart}  │  ${compPart}  │  ${daemonPart}  │  ${autoPart}  │  ${pendPart} `;
  const borderLine = theme.charcoal("─".repeat(theme.stripAnsi(content).length + 2));

  return [
    theme.charcoal("┌") + borderLine.slice(1, -1) + theme.charcoal("┐"),
    `${theme.charcoal("│")}${content}${theme.charcoal("│")}`,
    theme.charcoal("└") + borderLine.slice(1, -1) + theme.charcoal("┘"),
  ].join("\n");
}
