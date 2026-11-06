import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";

let apiProcess: ChildProcess | null = null;

function ensureMintApiServerPlugin(): Plugin {
  return {
    name: "ensure-mint-api-server",
    configureServer() {
      void (async () => {
        try {
          const res = await fetch("http://127.0.0.1:3001/api/health", {
            signal: AbortSignal.timeout(1200),
          });
          if (res.ok) return;
        } catch {
          // API server no activo en 3001: lo iniciamos automáticamente
        }

        const rootDir = path.resolve(__dirname, "../..");
        const tsxBin = path.resolve(
          rootDir,
          "node_modules",
          ".bin",
          process.platform === "win32" ? "tsx.cmd" : "tsx",
        );
        const apiEntry = path.resolve(rootDir, "packages", "api", "src", "index.ts");

        console.log("[Mint Studio] Iniciando servidor Backend API autónomo en http://localhost:3001...");
        apiProcess = spawn(`"${tsxBin}" "${apiEntry}"`, [], {
          cwd: rootDir,
          stdio: "inherit",
          shell: true,
          env: { ...process.env, PORT: "3001" },
        });

        const cleanup = () => {
          if (apiProcess && !apiProcess.killed && apiProcess.pid) {
            try {
              if (process.platform === "win32") {
                spawn("taskkill", ["/pid", String(apiProcess.pid), "/f", "/t"], { stdio: "ignore" });
              } else {
                apiProcess.kill("SIGTERM");
              }
            } catch {}
          }
        };

        process.once("SIGINT", cleanup);
        process.once("SIGTERM", cleanup);
        process.once("exit", cleanup);
      })();
    },
  };
}

export default defineConfig({
  plugins: [react(), ensureMintApiServerPlugin()],
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
      "three",
      "three/examples/jsm/controls/OrbitControls.js",
    ],
  },
  // Algunas librerías compartidas asumen un entorno Node y leen
  // `process.env.*` en tiempo de módulo. En el navegador `process` no
  // existe, así que lo definimos como objeto vacío para evitar un
  // ReferenceError durante la carga inicial.
  define: {
    "process.env": {},
  },
  clearScreen: false,
  server: {
    port: 3000,
    host: true,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
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
