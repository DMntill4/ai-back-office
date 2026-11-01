import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/figtree/400.css";
import "@fontsource/figtree/500.css";
import "@fontsource/figtree/600.css";
import "@fontsource/figtree/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import { App } from "./App";
import "./index.css";

// En entornos embebidos de escritorio (Tauri en Windows), el frontend se sirve
// desde `https://tauri.localhost/`. Peticiones relativas como `/api/...` se resuelven
// contra la SPA estática devolviendo index.html. Interceptamos fetch para enrutar
// cualquier petición `/api/...` directamente al backend Fastify en 127.0.0.1:3001.
if (typeof window !== "undefined") {
  const isTauriEnv =
    Boolean((window as any).__TAURI_INTERNALS__) ||
    Boolean((window as any).__TAURI__) ||
    window.location.protocol === "tauri:" ||
    window.location.hostname === "tauri.localhost" ||
    window.location.origin.includes("tauri.localhost");

  if (isTauriEnv) {
    const rawFetch = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      if (typeof input === "string") {
        if (input.startsWith("/api/")) {
          input = `http://127.0.0.1:3001${input}`;
        } else if (input === "/api") {
          input = "http://127.0.0.1:3001/api";
        }
      } else if (input instanceof URL) {
        if (input.pathname.startsWith("/api")) {
          input = new URL(`http://127.0.0.1:3001${input.pathname}${input.search}`);
        }
      }
      return rawFetch(input, init);
    };
  }
}

// Auto-recuperación de chunks dinámicos desactualizados tras nuevos despliegues
window.addEventListener("vite:preloadError", (event) => {
  console.warn("[MINT Web] Chunk desactualizado detectado, recargando...", event);
  window.location.reload();
});

const rootElement = document.getElementById("root");
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
