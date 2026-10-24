import { theme } from "./theme";

export interface BoxOptions {
  title?: string;
  badge?: string;
  badgeColor?: "mint" | "cyan" | "amber" | "red" | "gray" | "violet";
  borderColor?: (text: string | number) => string;
  padding?: number;
  width?: number;
}

function wrapBoxLine(str: string, width: number): string[] {
  if (theme.stripAnsi(str).length <= width) return [str];
  const words = str.split(" ");
  const res: string[] = [];
  let cur = "";
  for (const w of words) {
    const cand = cur ? `${cur} ${w}` : w;
    if (theme.stripAnsi(cand).length <= width) {
      cur = cand;
    } else {
      if (cur) res.push(cur);
      cur = w;
    }
  }
  if (cur) res.push(cur);
  return res.length > 0 ? res : [str];
}

export function drawCard(lines: string[], options: BoxOptions = {}): string {
  const border = options.borderColor || theme.gray;
  const padding = options.padding ?? 1;

  // Responsive column calculation
  const terminalCols = process.stdout.columns || 86;
  const maxAllowedWidth = Math.min(Math.max(terminalCols - 2, 60), 88);
  const maxInnerContent = Math.max(30, maxAllowedWidth - 2 - padding * 2);

  // Pre-wrap lines to prevent any overflow outside the box
  const normalizedLines: string[] = [];
  for (const raw of lines) {
    if (theme.stripAnsi(raw).length > maxInnerContent) {
      normalizedLines.push(...wrapBoxLine(raw, maxInnerContent));
    } else {
      normalizedLines.push(raw);
    }
  }

  // Compute content width
  const contentWidths = normalizedLines.map((l) => theme.stripAnsi(l).length);
  const titleLen = options.title ? theme.stripAnsi(options.title).length + 4 : 0;
  const badgeLen = options.badge ? options.badge.length + 4 : 0;
  const maxContent = Math.max(...contentWidths, titleLen + badgeLen, 40);
  const totalWidth = options.width
    ? Math.min(Math.max(options.width, maxContent + padding * 2 + 2), maxAllowedWidth)
    : Math.min(maxContent + padding * 2 + 2, maxAllowedWidth);

  const innerWidth = totalWidth - 2;

  // Top border with optional title & badge
  let topBorder = border("╭");
  let usedWidth = 0;

  if (options.title) {
    const titleStr = ` ${theme.bold(options.title)} `;
    topBorder += border("─") + titleStr;
    usedWidth += 1 + theme.stripAnsi(titleStr).length;
  }

  if (options.badge) {
    const badgeStr = ` ${theme.badge(options.badge, options.badgeColor || "mint")} `;
    const remaining = innerWidth - usedWidth - theme.stripAnsi(badgeStr).length;
    if (remaining > 1) {
      topBorder += border("─".repeat(remaining)) + badgeStr;
      usedWidth = innerWidth;
    }
  }

  const remainingTop = Math.max(0, innerWidth - usedWidth);
  topBorder += border("─".repeat(remainingTop) + "╮");

  const output: string[] = [topBorder];

  // Top padding
  for (let p = 0; p < padding; p++) {
    output.push(border("│") + " ".repeat(innerWidth) + border("│"));
  }

  // Content lines
  for (const line of normalizedLines) {
    const strippedLen = theme.stripAnsi(line).length;
    const padRight = Math.max(0, innerWidth - (strippedLen + padding * 2));
    const content = " ".repeat(padding) + line + " ".repeat(padRight + padding);
    output.push(border("│") + content + border("│"));
  }

  // Bottom padding
  for (let p = 0; p < padding; p++) {
    output.push(border("│") + " ".repeat(innerWidth) + border("│"));
  }

  // Bottom border
  output.push(border("╰" + "─".repeat(innerWidth) + "╯"));

  return output.join("\n");
}

export function drawDivider(title?: string, width?: number): string {
  const terminalCols = process.stdout.columns || 86;
  const targetWidth = width || Math.min(Math.max(terminalCols - 2, 60), 88);

  if (!title) {
    return theme.dim("─".repeat(targetWidth));
  }
  const cleanTitle = ` ${theme.bold(title)} `;
  const titleLen = theme.stripAnsi(cleanTitle).length;
  const side = Math.max(2, Math.floor((targetWidth - titleLen) / 2));
  return theme.dim("─".repeat(side)) + cleanTitle + theme.dim("─".repeat(Math.max(0, targetWidth - side - titleLen)));
}
