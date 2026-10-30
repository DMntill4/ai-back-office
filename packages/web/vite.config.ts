import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Pre-bundle las dependencias pesadas antes de que el navegador las pida.
  // Sin esto, en un arranque en frío el navegador solicita
  // `node_modules/.vite/deps/react-force-graph-2d.js` antes de que el
  // optimizador lo escriba -> 404 -> el grafo de módulos se aborta y la
  // pantalla queda en blanco. Declararlas aquí elimina esa carrera.
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "lucide-react",
      "motion/react",
      "react-force-graph-2d",
    ],
  },
  // Algunas librerías compartidas asumen un entorno Node y leen
  // `process.env.*` en tiempo de módulo. En el navegador `process` no
  // existe, así que lo definimos como objeto vacío para evitar un
  // ReferenceError durante la carga inicial.
  define: {
    "process.env": {},
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
