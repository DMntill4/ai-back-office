import { theme } from "./theme";

export interface BoxOptions {
  title?: string;
  badge?: string;
  badgeColor?: "mint" | "cyan" | "amber" | "red" | "gray" | "violet";
  borderColor?: (text: string | number) => string;
  padding?: number;
  width?: number;
}

export function drawCard(lines: string[], options: BoxOptions = {}): string {
  const border = options.borderColor || theme.gray;
  const padding = options.padding ?? 1;

  // Compute content width
  const contentWidths = lines.map((l) => theme.stripAnsi(l).length);
  const titleLen = options.title ? theme.stripAnsi(options.title).length + 4 : 0;
  const badgeLen = options.badge ? options.badge.length + 4 : 0;
  const maxContent = Math.max(...contentWidths, titleLen + badgeLen, 40);
  const totalWidth = options.width ? Math.max(options.width, maxContent + padding * 2) : maxContent + padding * 2 + 2;

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
  for (const line of lines) {
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

export function drawDivider(title?: string, width = 72): string {
  if (!title) {
    return theme.dim("─".repeat(width));
  }
  const cleanTitle = ` ${theme.bold(title)} `;
  const titleLen = theme.stripAnsi(cleanTitle).length;
  const side = Math.max(2, Math.floor((width - titleLen) / 2));
  return theme.dim("─".repeat(side)) + cleanTitle + theme.dim("─".repeat(width - side - titleLen));
}
