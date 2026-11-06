import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, CornerDownLeft, X, Layers, Sparkles, CheckCircle2, RotateCcw, Terminal } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { api } from "../../services/apiClient";

export interface SearchableRecord {
  id: string;
  label: string;
  hint?: string;
  group: string;
  targetTab: string;
}

/** Destinos canónicos de la aplicación Mint según Mint-DESIGN.md */
export const NAV_DESTINATIONS: SearchableRecord[] = [
  { id: "d_inicio", label: "Inicio", hint: "Centro de operaciones y lo que requiere tu atención", group: "Secciones", targetTab: "inicio" },
  { id: "d_aprobaciones", label: "Aprobaciones", hint: "Decisiones y compras que requieren tu firma", group: "Gobernanza", targetTab: "aprobaciones" },
  { id: "d_inventario", label: "Inventario", hint: "Existencias, almacenes y puntos de reorden", group: "Operaciones", targetTab: "inventario" },
  { id: "d_productos", label: "Catálogo de productos", hint: "Consulta de referencias y SKUs", group: "Operaciones", targetTab: "productos" },
  { id: "d_rutas", label: "Rutas y logística", hint: "Envíos en tránsito y seguimiento de flota", group: "Operaciones", targetTab: "rutas_logistica" },
  { id: "d_ordenes", label: "Órdenes de compra", hint: "Historial y emisión de compras a proveedores", group: "Operaciones", targetTab: "compras_ordenes" },
  { id: "d_proveedores", label: "Proveedores", hint: "Directorio comercial y desempeño logístico", group: "Operaciones", targetTab: "proveedores" },
  { id: "d_flujo", label: "Flujo del agente", hint: "Ciclos de razonamiento en vivo del agente", group: "Agente", targetTab: "flujo_agente" },
  { id: "d_mapa", label: "Mapa de conocimiento", hint: "Relaciones operativas y entidades del sistema", group: "Agente", targetTab: "mapa_conocimiento" },
  { id: "d_memoria", label: "Memoria del agente", hint: "Notas contextuales y directivas del vault", group: "Agente", targetTab: "memoria_agente" },
  { id: "d_historial", label: "Historial de decisiones", hint: "Auditoría inmutable de eventos", group: "Agente", targetTab: "auditoria_eventos" },
  { id: "d_reglas", label: "Reglas y políticas", hint: "Parámetros y umbrales de autonomía", group: "Agente", targetTab: "reglas_politicas" },
  { id: "d_modelos", label: "Modelos de IA", hint: "Costos, latencias y consumo de tokens", group: "Agente", targetTab: "modelos" },
  { id: "d_nodos", label: "Biblioteca de nodos", hint: "Capacidades operativas del orquestador", group: "Agente", targetTab: "nodos" },
  { id: "d_objetivos", label: "Objetivos autónomos", hint: "Metas estratégicas de optimización", group: "Agente", targetTab: "objetivos" },
  { id: "d_automatizacion", label: "Automatización (Command Deck)", hint: "Slash commands, diagnósticos y control del demonio", group: "Automatización", targetTab: "automatizacion" },
  { id: "d_reportes", label: "Reportes y análisis", hint: "Métricas consolidadas de inventario y compras", group: "Reportes", targetTab: "analisis_reportes" },
  { id: "d_perfil", label: "Mi perfil", hint: "Nombre, cargo e información de cuenta", group: "Ajustes", targetTab: "mi_perfil" },
  { id: "d_prefs", label: "Preferencias", hint: "Vista inicial, notificaciones y tema", group: "Ajustes", targetTab: "preferencias" },
  { id: "d_general", label: "Configuración general", hint: "Motor de IA, base de datos y autonomía", group: "Ajustes", targetTab: "configuracion_general" },
  { id: "d_empresas", label: "Empresas y sucursales", hint: "Gestión de sedes territoriales", group: "Ajustes", targetTab: "empresas_sucursales" },
  { id: "d_integraciones", label: "Integraciones", hint: "Conectores SQL, REST y ERP", group: "Ajustes", targetTab: "integraciones" },
  { id: "d_canales", label: "Canales de alerta", hint: "Telegram, Slack y despacho de alertas", group: "Ajustes", targetTab: "canales_notificaciones" },
  { id: "d_webhooks", label: "Webhooks y API", hint: "Puntos de enlace y eventos externos", group: "Ajustes", targetTab: "webhooks_api" },
  { id: "d_roles", label: "Roles y permisos", hint: "Gobernanza y control de acceso", group: "Ajustes", targetTab: "roles_permisos" },
];

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export interface CommandSearchProps {
  /** Registros dinámicos (aprobaciones pendientes, órdenes, SKUs). */
  records?: SearchableRecord[];
  onSelectTab: (tabId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Paleta de Comandos Flotante (CommandSearch).
 *
 * Se abre con Ctrl+K o desde el botón de búsqueda de la barra lateral.
 * Flota sobre la interfaz con fondo oscuro, campo con autofoco, navegación por
 * flechas y salto inmediato a cualquier sección o aprobación.
 */
export const CommandSearch: React.FC<CommandSearchProps> = ({
  records = [],
  onSelectTab,
  isOpen,
  onClose,
}) => {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentResult, setAgentResult] = useState<Awaited<ReturnType<typeof api.chat.send>> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setCursor(0);
      setAgentRunning(false);
      setAgentResult(null);
      const timer = setTimeout(() => inputRef.current?.focus(), 40);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const results = useMemo(() => {
    const all = [...records, ...NAV_DESTINATIONS];
    const q = norm(query.trim());
    if (!q) return NAV_DESTINATIONS.slice(0, 8);
    return all
      .filter((r) => norm(`${r.label} ${r.hint ?? ""} ${r.group}`).includes(q))
      .slice(0, 10);
  }, [query, records]);

  useEffect(() => {
    setCursor(0);
    setAgentResult(null);
  }, [query]);

  const choose = (r: SearchableRecord) => {
    onClose();
    onSelectTab(r.targetTab);
  };

  const runAgentQuery = async (promptText: string) => {
    const clean = promptText.replace(/^\/chat\s+/i, "").trim();
    if (!clean || agentRunning) return;
    setAgentRunning(true);
    setAgentResult(null);
    try {
      const res = await api.chat.send(clean);
      setAgentResult(res);
    } finally {
      setAgentRunning(false);
    }
  };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[cursor] && query.trim().split(/\s+/).length <= 2 && !query.trim().startsWith("/chat")) {
        choose(results[cursor]);
      } else if (query.trim().length > 0) {
        void runAgentQuery(query);
      } else if (results[cursor]) {
        choose(results[cursor]);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-black/60"
          onClick={(e) => {
            if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
              onClose();
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Paleta de comandos y búsqueda"
        >
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.97, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -6 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="w-full max-w-xl rounded-container bg-raised border border-strong shadow-dialog overflow-hidden flex flex-col"
          >
            {/* Cabecera del buscador */}
            <div className="flex items-center gap-compact px-base py-3 border-b border-border bg-panel">
              <Search className="w-4 h-4 text-brand shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKey}
                placeholder="Escribe una orden para el agente autónomo o busca una sección..."
                aria-label="Término de búsqueda o directiva operativa"
                className="w-full bg-transparent text-body text-primary placeholder:text-muted focus:outline-none"
              />
              <button
                onClick={onClose}
                className="p-1 rounded-control text-muted hover:text-primary hover:bg-raised transition-colors cursor-pointer"
                aria-label="Cerrar paleta de comandos"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Acción directa con el Agente Autónomo cuando el usuario escribe cualquier instrucción */}
            {query.trim().length > 0 && (
              <div className="p-2 border-b border-border bg-raised/60">
                <button
                  type="button"
                  disabled={agentRunning}
                  onClick={() => void runAgentQuery(query)}
                  className="w-full text-left flex items-center justify-between gap-compact px-3 py-2 rounded-control bg-panel hover:bg-raised border border-brand/30 text-caption transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {agentRunning ? (
                      <RotateCcw className="w-3.5 h-3.5 text-brand animate-spin shrink-0" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-brand shrink-0" />
                    )}
                    <div className="min-w-0 truncate">
                      <span className="font-semibold text-primary block truncate">
                        {agentRunning
                          ? "Agente autónomo razonando y ejecutando herramientas..."
                          : `Ejecutar con el Agente Autónomo: «${query.trim()}»`}
                      </span>
                      <span className="text-caption text-secondary block truncate">
                        Invoca el bucle multi-agente en vivo con acceso a las 35 herramientas y base de datos
                      </span>
                    </div>
                  </div>
                  <span className="text-caption font-mono text-brand shrink-0">Enter ↵</span>
                </button>
              </div>
            )}

            {/* Resultado en vivo del Agente Autónomo */}
            {agentResult && (
              <div className="p-base border-b border-border bg-canvas max-h-[320px] overflow-y-auto custom-scrollbar space-y-compact">
                {agentResult.evidenceChain && agentResult.evidenceChain.length > 0 && (
                  <div className="p-2 rounded-control bg-panel border border-border font-mono text-caption space-y-1">
                    <div className="text-brand font-semibold flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5" />
                      <span>
                        Evidencia verificada ({agentResult.evidenceChain.length} herramientas · {agentResult.totalTokens ?? 0} tokens)
                      </span>
                    </div>
                    {agentResult.evidenceChain.map((step, idx) => (
                      <div key={idx} className="text-secondary truncate">
                        • {step.toolName} {step.verified ? "[Verificado en BD]" : "[OK]"}
                      </div>
                    ))}
                  </div>
                )}
                <div className="text-caption text-primary whitespace-pre-line leading-relaxed">
                  {agentResult.response}
                </div>
              </div>
            )}

            {/* Lista de resultados de navegación */}
            <div className="max-h-[300px] overflow-y-auto p-1.5 custom-scrollbar" role="listbox">
              {results.length === 0 ? (
                <div className="px-base py-compact text-center text-caption text-secondary">
                  Presiona <strong className="text-primary font-mono">Enter</strong> arriba para que el Agente Autónomo procese e investigue: “{query}”.
                </div>
              ) : (
                <ul className="space-y-hairline">
                  {results.map((r, i) => {
                    const isSelected = i === cursor;
                    return (
                      <li key={r.id} role="option" aria-selected={isSelected}>
                        <button
                          type="button"
                          onMouseEnter={() => setCursor(i)}
                          onClick={() => choose(r)}
                          className={`w-full text-left flex items-center justify-between gap-compact px-3 py-2 rounded-control text-caption transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-panel text-primary border border-border"
                              : "text-secondary hover:text-primary hover:bg-panel/40"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {r.group === "Agente" ? (
                              <Sparkles className="w-3.5 h-3.5 text-brand shrink-0" />
                            ) : r.group === "Gobernanza" ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-state-pending shrink-0" />
                            ) : (
                              <Layers className="w-3.5 h-3.5 text-secondary shrink-0" />
                            )}
                            <div className="min-w-0 truncate">
                              <span className="font-medium text-primary truncate block">
                                {r.label}
                              </span>
                              {r.hint && (
                                <span className="text-caption text-muted truncate block">
                                  {r.hint}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-caption font-mono text-muted">
                              {r.group}
                            </span>
                            {isSelected && (
                              <CornerDownLeft className="w-3 h-3 text-brand" />
                            )}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Pie con indicaciones de atajos */}
            <div className="px-base py-2 border-t border-border bg-panel flex items-center justify-between text-caption text-muted">
              <span>Navega con ↑↓ y presiona Enter para abrir</span>
              <span className="font-mono text-caption text-muted">ESC para cerrar</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
