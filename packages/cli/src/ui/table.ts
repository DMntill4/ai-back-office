import { theme } from "./theme";

export interface ColumnDef {
  header: string;
  key: string;
  width?: number;
  align?: "left" | "right" | "center";
  format?: (val: any) => string;
}

export function renderTable(columns: ColumnDef[], rows: Record<string, any>[]): string {
  if (rows.length === 0) {
    return theme.dim("   (No hay registros para mostrar)");
  }

  // Calculate column widths
  const computedWidths = columns.map((col) => {
    if (col.width) return col.width;
    const headerLen = theme.stripAnsi(col.header).length;
    let maxCell = headerLen;
    for (const r of rows) {
      const rawVal = col.format ? col.format(r[col.key]) : String(r[col.key] ?? "");
      const cellLen = theme.stripAnsi(rawVal).length;
      if (cellLen > maxCell) maxCell = cellLen;
    }
    return Math.min(Math.max(maxCell + 2, 8), 40);
  });

  const padCell = (text: string, width: number, align: "left" | "right" | "center" = "left") => {
    const stripped = theme.stripAnsi(text);
    const diff = Math.max(0, width - stripped.length);
    if (align === "right") {
      return " ".repeat(diff) + text;
    }
    if (align === "center") {
      const left = Math.floor(diff / 2);
      const right = diff - left;
      return " ".repeat(left) + text + " ".repeat(right);
    }
    return text + " ".repeat(diff);
  };

  // Top header line
  const topBorder =
    theme.dim("┌─") +
    computedWidths.map((w) => "─".repeat(w)).join(theme.dim("─┬─")) +
    theme.dim("─┐");

  // Header row
  const headerRow =
    theme.dim("│ ") +
    columns
      .map((col, idx) => padCell(theme.bold(col.header), computedWidths[idx], col.align))
      .join(theme.dim(" │ ")) +
    theme.dim(" │");

  // Header divider
  const headerDivider =
    theme.dim("├─") +
    computedWidths.map((w) => "─".repeat(w)).join(theme.dim("─┼─")) +
    theme.dim("─┤");

  // Rows
  const rowLines: string[] = [];
  for (let rIdx = 0; rIdx < rows.length; rIdx++) {
    const row = rows[rIdx];
    const cells = columns.map((col, idx) => {
      const rawVal = col.format ? col.format(row[col.key]) : String(row[col.key] ?? "");
      return padCell(rawVal, computedWidths[idx], col.align);
    });
    rowLines.push(theme.dim("│ ") + cells.join(theme.dim(" │ ")) + theme.dim(" │"));
  }

  // Bottom border
  const bottomBorder =
    theme.dim("└─") +
    computedWidths.map((w) => "─".repeat(w)).join(theme.dim("─┴─")) +
    theme.dim("─┘");

  return [topBorder, headerRow, headerDivider, ...rowLines, bottomBorder].join("\n");
}
