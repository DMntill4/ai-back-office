import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, CornerDownLeft } from "lucide-react";

export interface SearchableRecord {
  id: string;
  label: string;
  hint?: string;
  group: string;
  targetTab: string;
}

/** Destinos de la app (misma lista que las rutas válidas de App.tsx). */
export const NAV_DESTINATIONS: SearchableRecord[] = [
  { id: "d_inicio", label: "Inicio", hint: "Resumen del día y lo que requiere tu atención", group: "Secciones", targetTab: "inicio" },
  { id: "d_aprobaciones", label: "Aprobaciones", hint: "Firmas y órdenes pendientes", group: "Secciones", targetTab: "aprobaciones" },
  { id: "d_inventario", label: "Inventario", hint: "Existencias, puntos de reorden", group: "Secciones", targetTab: "inventario" },
  { id: "d_productos", label: "Catálogo de productos", hint: "SKUs", group: "Secciones", targetTab: "productos" },
  { id: "d_rutas", label: "Rutas y logística", hint: "Envíos y despachos", group: "Secciones", targetTab: "rutas_logistica" },
  { id: "d_ordenes", label: "Órdenes de compra", hint: "Compras", group: "Secciones", targetTab: "compras_ordenes" },
  { id: "d_proveedores", label: "Proveedores", group: "Secciones", targetTab: "proveedores" },
  { id: "d_flujo", label: "Flujo del agente", hint: "Ciclos en vivo", group: "Agente", targetTab: "flujo_agente" },
  { id: "d_mapa", label: "Mapa de conocimiento", group: "Agente", targetTab: "mapa_conocimiento" },
  { id: "d_memoria", label: "Memoria del agente", group: "Agente", targetTab: "memoria_agente" },
  { id: "d_historial", label: "Historial de decisiones", hint: "Auditoría de eventos", group: "Agente", targetTab: "auditoria_eventos" },
  { id: "d_reglas", label: "Reglas y políticas", group: "Agente", targetTab: "reglas_politicas" },
  { id: "d_modelos", label: "Modelos de IA", hint: "Costos y latencias", group: "Agente", targetTab: "modelos" },
  { id: "d_nodos", label: "Biblioteca de nodos", group: "Agente", targetTab: "nodos" },
  { id: "d_objetivos", label: "Objetivos", group: "Agente", targetTab: "objetivos" },
  { id: "d_reportes", label: "Reportes y análisis", group: "Secciones", targetTab: "analisis_reportes" },
  { id: "d_perfil", label: "Mi perfil", hint: "Nombre, cargo, contacto", group: "Ajustes", targetTab: "mi_perfil" },
  { id: "d_prefs", label: "Preferencias", hint: "Vista inicial, avisos, interfaz", group: "Ajustes", targetTab: "preferencias" },
  { id: "d_general", label: "Configuración general", hint: "Motor de IA y autonomía", group: "Ajustes", targetTab: "configuracion_general" },
  { id: "d_empresas", label: "Empresas y sucursales", group: "Ajustes", targetTab: "empresas_sucursales" },
  { id: "d_integraciones", label: "Integraciones", group: "Ajustes", targetTab: "integraciones" },
  { id: "d_canales", label: "Canales de alerta", hint: "Telegram, Slack, correo", group: "Ajustes", targetTab: "canales_notificaciones" },
  { id: "d_webhooks", label: "Webhooks y API", group: "Ajustes", targetTab: "webhooks_api" },
  { id: "d_roles", label: "Roles y permisos", group: "Ajustes", targetTab: "roles_permisos" },
];

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

interface Props {
  /** Registros dinámicos (p. ej. aprobaciones pendientes). */
  records?: SearchableRecord[];
  onSelectTab: (tabId: string) => void;
}

/**
 * Buscador global. Antes el campo no hacía nada: ahora salta a cualquier
 * sección y encuentra aprobaciones por título, SKU o proveedor.
 * Atajo: Ctrl/Cmd + K.
 */
export const CommandSearch: React.FC<Props> = ({ records = [], onSelectTab }) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, []);

  const results = useMemo(() => {
    const all = [...records, ...NAV_DESTINATIONS];
    const q = norm(query.trim());
    if (!q) return NAV_DESTINATIONS.slice(0, 7);
    return all
      .filter((r) => norm(`${r.label} ${r.hint ?? ""} ${r.group}`).includes(q))
      .slice(0, 10);
  }, [query, records]);

  useEffect(() => setCursor(0), [query]);

  const choose = (r: SearchableRecord) => {
    setIsOpen(false);
    setQuery("");
    inputRef.current?.blur();
    onSelectTab(r.targetTab);
  };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter" && results[cursor]) {
      e.preventDefault();
      choose(results[cursor]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="relative w-full" ref={rootRef}>
      <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={onInputKey}
        placeholder="Ir a una sección o buscar una aprobación..."
        aria-label="Buscador global"
        className="w-full bg-panel border border-strong focus:border-brand rounded-control pl-8 pr-14 py-1.5 text-caption text-primary placeholder:text-muted focus:outline-none transition-colors"
      />
      <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-caption font-mono px-1 py-0.2 rounded-control bg-raised border border-border text-muted pointer-events-none">
        Ctrl K
      </kbd>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 rounded-container bg-raised border border-strong shadow-popover z-50 overflow-hidden">
          {results.length === 0 ? (
            <div className="px-base py-group text-center text-caption text-muted">
              Sin resultados para “{query}”.
            </div>
          ) : (
            <ul data-lenis-prevent className="max-h-[340px] overflow-y-auto custom-scrollbar py-hairline" role="listbox">
              {results.map((r, i) => (
                <li key={r.id} role="option" aria-selected={i === cursor}>
                  <button
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => choose(r)}
                    className={`w-full text-left flex items-center justify-between gap-compact px-base py-2 cursor-pointer ${
                      i === cursor ? "bg-panel" : ""
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block text-caption text-primary truncate">{r.label}</span>
                      {r.hint && (
                        <span className="block text-caption text-muted truncate">{r.hint}</span>
                      )}
                    </span>
                    <span className="flex items-center gap-1 shrink-0 text-caption font-mono text-muted">
                      {r.group}
                      {i === cursor && <CornerDownLeft className="w-3 h-3" />}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
