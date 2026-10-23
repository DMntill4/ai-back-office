/**
 * Zero-dependency ANSI styling system for Mint CLI.
 * Tailored with Mint Green (#10B981) palette, cyan accents, and high-contrast dark theme.
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
  // Brand colors
  mint: wrap("\x1b[38;2;16;185;129m", "\x1b[39m"), // #10B981
  mintBold: wrap("\x1b[1m\x1b[38;2;16;185;129m", "\x1b[22m\x1b[39m"),
  cyan: wrap("\x1b[38;2;6;182;212m", "\x1b[39m"), // #06B6D4
  cyanBold: wrap("\x1b[1m\x1b[38;2;6;182;212m", "\x1b[22m\x1b[39m"),
  amber: wrap("\x1b[38;2;245;158;11m", "\x1b[39m"), // #F59E0B
  amberBold: wrap("\x1b[1m\x1b[38;2;245;158;11m", "\x1b[22m\x1b[39m"),
  red: wrap("\x1b[38;2;239;68;68m", "\x1b[39m"), // #EF4444
  redBold: wrap("\x1b[1m\x1b[38;2;239;68;68m", "\x1b[22m\x1b[39m"),
  violet: wrap("\x1b[38;2;139;92;246m", "\x1b[39m"), // #8B5CF6
  gray: wrap("\x1b[38;2;148;163;184m", "\x1b[39m"), // #94A3B8
  darkGray: wrap("\x1b[38;2;71;85;105m", "\x1b[39m"), // #475569

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
  info: wrap("\x1b[38;2;6;182;212m", "\x1b[39m"),
  muted: wrap("\x1b[38;2;148;163;184m", "\x1b[39m"),

  // Badges & Pills
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
        return `\x1b[48;2;71;85;105m\x1b[38;2;255;255;255m\x1b[1m ${text} \x1b[0m`;
    }
  },

  // Strip ANSI helper for alignment calculation
  stripAnsi(str: string): string {
    return str.replace(/\x1b\[[0-9;]*m/g, "");
  },
};
