/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        canvas: "var(--color-canvas)",
        panel: "var(--color-panel)",
        raised: "var(--color-raised)",
        border: {
          DEFAULT: "var(--color-border)",
          strong: "var(--color-border-strong)",
        },
        primary: "var(--color-text-primary)",
        secondary: "var(--color-text-secondary)",
        muted: "var(--color-text-muted)",
        brand: {
          DEFAULT: "var(--color-brand)",
          lime: "var(--color-brand-lime)",
        },
        action: {
          DEFAULT: "var(--color-action)",
          hover: "var(--color-action-hover)",
          text: "var(--color-action-text)",
        },
        state: {
          ok: "var(--color-state-ok)",
          attention: "var(--color-state-attention)",
          error: "var(--color-state-error)",
          pending: "var(--color-state-pending)",
          progress: "var(--color-state-progress)",
          "ok-surface": "var(--color-state-ok-surface)",
          "attention-surface": "var(--color-state-attention-surface)",
          "error-surface": "var(--color-state-error-surface)",
          "pending-surface": "var(--color-state-pending-surface)",
          "progress-surface": "var(--color-state-progress-surface)",
        },
      },
      textColor: {
        primary: "var(--color-text-primary)",
        secondary: "var(--color-text-secondary)",
        muted: "var(--color-text-muted)",
        brand: "var(--color-brand)",
        "brand-lime": "var(--color-brand-lime)",
        "action-text": "var(--color-action-text)",
      },
      backgroundColor: {
        canvas: "var(--color-canvas)",
        panel: "var(--color-panel)",
        raised: "var(--color-raised)",
        action: "var(--color-action)",
        "action-hover": "var(--color-action-hover)",
      },
      borderColor: {
        DEFAULT: "var(--color-border)",
        border: "var(--color-border)",
        strong: "var(--color-border-strong)",
      },
      fontFamily: {
        sans: ["'Figtree'", "system-ui", "-apple-system", "'Segoe UI'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "'SF Mono'", "Consolas", "monospace"],
      },
      fontSize: {
        caption: ["0.75rem", { lineHeight: "1.4", letterSpacing: "0.01em" }],     // 12px
        label: ["0.8125rem", { lineHeight: "1.4", letterSpacing: "0.005em" }],    // 13px
        identifier: ["0.8125rem", { lineHeight: "1.5", letterSpacing: "0em" }],   // 13px
        body: ["0.875rem", { lineHeight: "1.5", letterSpacing: "0em" }],          // 14px
        "body-large": ["1rem", { lineHeight: "1.5", letterSpacing: "0em" }],      // 16px
        "group-title": ["1rem", { lineHeight: "1.4", letterSpacing: "-0.005em" }],// 16px
        "section-title": ["1.125rem", { lineHeight: "1.35", letterSpacing: "-0.01em" }], // 18px
        "page-title": ["1.5rem", { lineHeight: "1.25", letterSpacing: "-0.02em" }],      // 24px
        metric: ["2rem", { lineHeight: "1.1", letterSpacing: "-0.025em" }],              // 32px
        display: ["2.5rem", { lineHeight: "1.1", letterSpacing: "-0.03em" }],             // 40px
      },
      spacing: {
        hairline: "0.25rem", // 4px
        compact: "0.5rem",   // 8px
        element: "0.75rem",  // 12px
        base: "1rem",        // 16px
        group: "1.5rem",     // 24px
        section: "2.5rem",   // 40px
        page: "4rem",        // 64px
      },
      borderRadius: {
        control: "var(--radius-control)",     // 0.5rem = 8px
        container: "var(--radius-container)", // 0.75rem = 12px
        pill: "var(--radius-pill)",           // 9999px
      },
      boxShadow: {
        popover: "var(--shadow-popover)",
        dialog: "var(--shadow-dialog)",
        focus: "var(--shadow-focus)",
      },
    },
  },
  plugins: [],
};
