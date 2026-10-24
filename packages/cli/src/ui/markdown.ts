import { theme } from "./theme";

export interface MarkdownOptions {
  maxWidth?: number;
}

/**
 * Format markdown text into beautiful, responsive terminal output.
 * Converts markdown tables, headers, lists, and inline styles into ANSI-styled text.
 */
export function formatTerminalMarkdown(content: string, options: MarkdownOptions = {}): string[] {
  if (!content || !content.trim()) {
    return [""];
  }

  const terminalCols = process.stdout.columns || 86;
  const maxWidth = options.maxWidth || Math.min(Math.max(terminalCols - 8, 60), 84);

  const rawLines = content.replace(/\r\n/g, "\n").split("\n");
  const processedLines: string[] = [];

  let inTable = false;
  let tableRows: string[][] = [];

  const flushTable = () => {
    if (tableRows.length === 0) return;

    // Check if table is 2 columns (e.g. | Campo | Dato |)
    const isKeyValue = tableRows.every((r) => r.length === 2);

    if (isKeyValue) {
      // Format as elegant key-value bullet points
      for (let i = 0; i < tableRows.length; i++) {
        const [key, val] = tableRows[i];
        if (i === 0 && (key.toLowerCase() === "campo" || key.toLowerCase() === "propiedad" || key.toLowerCase() === "key")) {
          // Skip header row for key-value tables
          continue;
        }
        const formattedKey = theme.bold(applyInlineMarkdown(key.trim()));
        const formattedVal = applyInlineMarkdown(val.trim());
        processedLines.push(`  ${theme.mint("•")} ${formattedKey}: ${formattedVal}`);
      }
    } else {
      // Multi-column table: render structured rows
      const colWidths: number[] = [];
      tableRows.forEach((row) => {
        row.forEach((cell, idx) => {
          const stripped = theme.stripAnsi(cell.trim());
          colWidths[idx] = Math.max(colWidths[idx] || 0, stripped.length);
        });
      });

      tableRows.forEach((row, rowIdx) => {
        const isHeader = rowIdx === 0;
        const formattedCells = row.map((cell, idx) => {
          const trimmed = cell.trim();
          const styled = isHeader ? theme.bold(trimmed) : applyInlineMarkdown(trimmed);
          const visibleLen = theme.stripAnsi(styled).length;
          const pad = Math.max(0, (colWidths[idx] || 10) - visibleLen);
          return styled + " ".repeat(pad);
        });

        if (isHeader) {
          processedLines.push(`  ${formattedCells.join("  │  ")}`);
          const divider = colWidths.map((w) => "─".repeat(w)).join("──┼──");
          processedLines.push(`  ${theme.dim(divider)}`);
        } else {
          processedLines.push(`  ${formattedCells.join("  │  ")}`);
        }
      });
    }

    tableRows = [];
    inTable = false;
  };

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmed = line.trim();

    // 1. Table line detection (| col1 | col2 |)
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      // Check for separator row (|---|---|)
      if (/^\|[\s\-:|]+\|$/.test(trimmed)) {
        continue;
      }

      inTable = true;
      const cells = trimmed
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Empty line
    if (!trimmed) {
      processedLines.push("");
      continue;
    }

    // 2. Headers
    if (trimmed.startsWith("### ")) {
      const headerText = trimmed.slice(4).trim();
      processedLines.push(`\n  ${theme.cyanBold("▸ " + applyInlineMarkdown(headerText))}`);
      continue;
    }
    if (trimmed.startsWith("## ")) {
      const headerText = trimmed.slice(3).trim();
      processedLines.push(`\n  ${theme.mintBold("◆ " + applyInlineMarkdown(headerText))}`);
      continue;
    }
    if (trimmed.startsWith("# ")) {
      const headerText = trimmed.slice(2).trim();
      processedLines.push(`\n  ${theme.bold("■ " + applyInlineMarkdown(headerText).toUpperCase())}`);
      continue;
    }

    // 3. Bullet lists
    const bulletMatch = trimmed.match(/^[-*+]\s+(.*)/);
    if (bulletMatch) {
      const bulletContent = applyInlineMarkdown(bulletMatch[1]);
      const wrapped = wrapText(bulletContent, maxWidth - 4);
      wrapped.forEach((wLine, idx) => {
        if (idx === 0) {
          processedLines.push(`  ${theme.mint("•")} ${wLine}`);
        } else {
          processedLines.push(`    ${wLine}`);
        }
      });
      continue;
    }

    // 4. Numbered lists
    const numberMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numberMatch) {
      const num = numberMatch[1];
      const numContent = applyInlineMarkdown(numberMatch[2]);
      const wrapped = wrapText(numContent, maxWidth - 6);
      wrapped.forEach((wLine, idx) => {
        if (idx === 0) {
          processedLines.push(`  ${theme.cyan(`${num}.`)} ${wLine}`);
        } else {
          processedLines.push(`     ${wLine}`);
        }
      });
      continue;
    }

    // 5. Normal paragraphs: apply inline styles and wrap cleanly
    const styled = applyInlineMarkdown(trimmed);
    const wrapped = wrapText(styled, maxWidth);
    processedLines.push(...wrapped);
  }

  if (inTable) {
    flushTable();
  }

  // Remove trailing blank lines
  while (processedLines.length > 0 && processedLines[processedLines.length - 1].trim() === "") {
    processedLines.pop();
  }

  return processedLines;
}

/**
 * Replace inline Markdown bold, italic, code with terminal theme helpers.
 */
function applyInlineMarkdown(text: string): string {
  let result = text;

  // Bold + Code: **`code`** or `**code**`
  result = result.replace(/\*\*`([^`]+)`\*\*/g, (_, p1) => theme.mintBold(p1));

  // Bold: **text** or __text__
  result = result.replace(/\*\*([^*]+)\*\*/g, (_, p1) => theme.bold(p1));
  result = result.replace(/__([^_]+)__/g, (_, p1) => theme.bold(p1));

  // Inline code: `code`
  result = result.replace(/`([^`]+)`/g, (_, p1) => theme.mint(p1));

  // Italic: *text* or _text_
  result = result.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, (_, p1) => theme.italic(p1));

  return result;
}

/**
 * Wrap text to a specific width respecting ANSI escape codes.
 */
function wrapText(str: string, width: number): string[] {
  if (theme.stripAnsi(str).length <= width) {
    return [str];
  }

  const words = str.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (theme.stripAnsi(candidate).length <= width) {
      currentLine = candidate;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [str];
}
