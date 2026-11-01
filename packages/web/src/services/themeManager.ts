/**
 * Mint Theme Manager
 * 
 * Gestiona el sistema de temas dinámicos en tiempo real sin recargar la página.
 * Modifica las variables CSS de :root y persiste la selección en localStorage.
 */

export interface ThemeTokens {
  canvas: string;
  panel: string;
  raised: string;
  card: string;
  cardRaised: string;
  border: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  brand: string;
  brandLime: string;
  ambientGradient: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  previewColor: string;
  accentColor: string;
  tokens: ThemeTokens;
}

export const THEME_PRESETS: Record<string, ThemePreset> = {
  "mint-dark": {
    id: "mint-dark",
    name: "Mint Dark (Predeterminado)",
    description: "Bosque profundo con verdes esmeralda táctiles de baja fatiga visual.",
    previewColor: "#111915",
    accentColor: "#2BB656",
    tokens: {
      canvas: "#090D0B",
      panel: "#111915",
      raised: "#0B100E",
      card: "#111915",
      cardRaised: "#16221C",
      border: "#26342C",
      borderStrong: "#3A4B41",
      textPrimary: "#EEF2EC",
      textSecondary: "#AEBCB2",
      textMuted: "#86968B",
      brand: "#2BB656",
      brandLime: "#9DE342",
      ambientGradient: "radial-gradient(ellipse 70% 50% at 0% 0%, rgba(43, 182, 86, 0.08) 0%, rgba(43, 182, 86, 0.02) 45%, transparent 75%)",
    },
  },
  "obsidian": {
    id: "obsidian",
    name: "Obsidian Deep",
    description: "Negro absoluto con reflejos grafito y acentos violeta de alta gama.",
    previewColor: "#141418",
    accentColor: "#8B5CF6",
    tokens: {
      canvas: "#0B0B0E",
      panel: "#141418",
      raised: "#1C1C22",
      card: "#141418",
      cardRaised: "#1F1F27",
      border: "#252530",
      borderStrong: "#383848",
      textPrimary: "#F3F3F7",
      textSecondary: "#A3A3B8",
      textMuted: "#72728A",
      brand: "#8B5CF6",
      brandLime: "#A78BFA",
      ambientGradient: "radial-gradient(ellipse 70% 50% at 0% 0%, rgba(139, 92, 246, 0.08) 0%, rgba(139, 92, 246, 0.02) 45%, transparent 75%)",
    },
  },
  "high-contrast": {
    id: "high-contrast",
    name: "Linear High Contrast",
    description: "Contraste riguroso para monitores industriales con acentos cian puro.",
    previewColor: "#0D0D0D",
    accentColor: "#38BDF8",
    tokens: {
      canvas: "#000000",
      panel: "#0D0D0D",
      raised: "#171717",
      card: "#0D0D0D",
      cardRaised: "#1C1C1C",
      border: "#333333",
      borderStrong: "#4F4F4F",
      textPrimary: "#FFFFFF",
      textSecondary: "#D1D5DB",
      textMuted: "#9CA3AF",
      brand: "#38BDF8",
      brandLime: "#7DD3FC",
      ambientGradient: "radial-gradient(ellipse 70% 50% at 0% 0%, rgba(56, 189, 248, 0.08) 0%, rgba(56, 189, 248, 0.02) 45%, transparent 75%)",
    },
  },
  "emerald-cyber": {
    id: "emerald-cyber",
    name: "Emerald Cyber",
    description: "Verde neón fosforescente sobre chasis de carbono industrial.",
    previewColor: "#081B10",
    accentColor: "#00F59B",
    tokens: {
      canvas: "#040D07",
      panel: "#081B10",
      raised: "#0D2617",
      card: "#081B10",
      cardRaised: "#0E301D",
      border: "#133A22",
      borderStrong: "#1B5230",
      textPrimary: "#F0FFF4",
      textSecondary: "#A3D9B5",
      textMuted: "#6BAE83",
      brand: "#00F59B",
      brandLime: "#64FFDA",
      ambientGradient: "radial-gradient(ellipse 70% 50% at 0% 0%, rgba(0, 245, 155, 0.09) 0%, rgba(0, 245, 155, 0.02) 45%, transparent 75%)",
    },
  },
};

const STORAGE_KEY = "mint_theme_preset_id";

export function applyTheme(presetId: string): ThemePreset {
  const preset = THEME_PRESETS[presetId] || THEME_PRESETS["mint-dark"];
  if (typeof document === "undefined") return preset;

  const root = document.documentElement;
  const t = preset.tokens;

  root.style.setProperty("--color-canvas", t.canvas);
  root.style.setProperty("--color-panel", t.panel);
  root.style.setProperty("--color-raised", t.raised);
  root.style.setProperty("--color-card", t.card);
  root.style.setProperty("--color-card-raised", t.cardRaised);
  root.style.setProperty("--color-border", t.border);
  root.style.setProperty("--color-border-strong", t.borderStrong);
  root.style.setProperty("--color-text-primary", t.textPrimary);
  root.style.setProperty("--color-text-secondary", t.textSecondary);
  root.style.setProperty("--color-text-muted", t.textMuted);
  root.style.setProperty("--color-brand", t.brand);
  root.style.setProperty("--color-brand-lime", t.brandLime);
  root.style.setProperty("--gradient-ambient-mint", t.ambientGradient);

  try {
    localStorage.setItem(STORAGE_KEY, preset.id);
  } catch {
    // localStorage no disponible
  }

  return preset;
}

export function getCurrentThemeId(): string {
  if (typeof localStorage === "undefined") return "mint-dark";
  return localStorage.getItem(STORAGE_KEY) || "mint-dark";
}

export function initTheme(): ThemePreset {
  const currentId = getCurrentThemeId();
  return applyTheme(currentId);
}
