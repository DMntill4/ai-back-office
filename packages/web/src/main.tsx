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
