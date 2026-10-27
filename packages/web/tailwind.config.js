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
        mint: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
          950: "#052e16",
        },
        dark: {
          bg: "#060a08",
          surface: "#0c120f",
          panel: "#111a14",
          card: "#15221b",
          border: "#1c2f25",
          borderBright: "#284435",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "Roboto",
          "Oxygen",
          "Ubuntu",
          "Cantarell",
          "sans-serif",
        ],
        mono: [
          "'JetBrains Mono'",
          "'Fira Code'",
          "Consolas",
          "Menlo",
          "monospace",
        ],
      },
      boxShadow: {
        "mint-glow": "0 0 25px rgba(34, 197, 94, 0.2)",
        "mint-glow-lg": "0 0 40px rgba(34, 197, 94, 0.3)",
        "node-glow": "0 0 20px rgba(34, 197, 94, 0.25), inset 0 0 15px rgba(34, 197, 94, 0.05)",
      },
    },
  },
  plugins: [],
};
