import { theme } from "./theme";

/**
 * Marco de arranque estilo "fetch": logo a la izquierda, datos clave/valor a la derecha
 * y una barra de estado inferior, todo dentro de un recuadro de línea fina.
 */

export const MINT_LOGO = [
  "  ▄████▄     ▄████▄  ",
  " ████████   ████████ ",
  " ▀███████▄ ▄███████▀ ",
  "   ▀██████▄██████▀   ",
  "      ▀▀███████▀     ",
  "         ███         ",
  "         ███         ",
];

export interface FrameRow {
  key: string;
  value: string;
  /** Color opcional aplicado al valor (el texto se mide sin colores). */
  color?: (text: string | number) => string;
}

export interface FrameOptions {
  title: string;
  rows: FrameRow[];
  footerLeft: string;
  footerRight?: string;
  logo?: string[];
}

function visibleLength(s: string): number {
  return theme.stripAnsi(s).length;
}

function padEnd(s: string, width: number): string {
  return s + " ".repeat(Math.max(0, width - visibleLength(s)));
}

function truncatePlain(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, Math.max(0, max - 1)) + "…";
}

export function drawFrame(opts: FrameOptions): string {
  const cols = process.stdout.columns || 100;
  const width = Math.min(Math.max(cols - 2, 60), 100);
  const inner = width - 2;
  const showLogo = inner >= 70;
  const logo = opts.logo ?? MINT_LOGO;
  const logoWidth = showLogo ? Math.max(...logo.map((l) => l.length)) : 0;
  const gap = showLogo ? 4 : 0;
  const infoWidth = inner - 4 - logoWidth - gap;
  const keyWidth = Math.max(...opts.rows.map((r) => r.key.length), 6) + 2;

  const info: string[] = [];
  info.push(theme.mintBold(truncatePlain(opts.title, infoWidth)));
  info.push(theme.dim("─".repeat(Math.min(visibleLength(opts.title), infoWidth))));
  for (const row of opts.rows) {
    const label = theme.mintBold(padEnd(row.key + ":", keyWidth));
    const raw = truncatePlain(row.value, infoWidth - keyWidth);
    info.push(label + (row.color ? row.color(raw) : raw));
  }

  const bodyHeight = Math.max(info.length, showLogo ? logo.length : 0);
  const logoTop = showLogo ? Math.floor((bodyHeight - logo.length) / 2) : 0;
  const infoTop = Math.floor((bodyHeight - info.length) / 2);

  const edge = theme.mint;
  const line = (content: string) => edge("│") + "  " + padEnd(content, inner - 4) + "  " + edge("│");
  const out: string[] = [];
  out.push(edge("┌" + "─".repeat(inner) + "┐"));
  out.push(line(""));
  for (let i = 0; i < bodyHeight; i++) {
    const l = showLogo ? logo[i - logoTop] : undefined;
    const left = showLogo ? theme.mintBold(padEnd(l ?? "", logoWidth)) + " ".repeat(gap) : "";
    const right = info[i - infoTop] ?? "";
    out.push(line(left + right));
  }
  out.push(line(""));

  const right = opts.footerRight ?? "";
  const spacing = Math.max(2, inner - 4 - visibleLength(opts.footerLeft) - visibleLength(right));
  out.push(line(opts.footerLeft + " ".repeat(spacing) + right));
  out.push(edge("└" + "─".repeat(inner) + "┘"));
  return out.join("\n");
}
