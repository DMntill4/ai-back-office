import React from "react";
import { SegmentedTabs, TabItem } from "../ui/SegmentedTabs";

/**
 * Subpestañas del destino Agente (fuente única).
 * Antes cada vista las redefinía y solo 2 de 8 las mostraban, por eso la
 * navegación desaparecía al entrar en Memoria, Historial, Reglas, etc.
 */
export const AGENT_SUB_TABS: TabItem[] = [
  { id: "flujo_agente", label: "Flujo del agente" },
  { id: "mapa_conocimiento", label: "Mapa de conocimiento" },
  { id: "memoria_agente", label: "Memoria del agente" },
  { id: "auditoria_eventos", label: "Historial de decisiones" },
  { id: "reglas_politicas", label: "Reglas y políticas" },
  { id: "modelos", label: "Modelos de IA" },
  { id: "nodos", label: "Biblioteca de nodos" },
  { id: "objetivos", label: "Objetivos" },
];

export const AGENT_TAB_IDS = new Set(AGENT_SUB_TABS.map((t) => t.id));

/** Vistas del Agente que NO dibujan la barra en su propia cabecera. */
export const AGENT_TABS_WITHOUT_OWN_NAV = new Set([
  "memoria_agente",
  "auditoria_eventos",
  "reglas_politicas",
  "modelos",
  "nodos",
  "objetivos",
]);

interface AgentSubNavProps {
  activeTab: string;
  onNavigateTo: (tabId: string) => void;
  children: React.ReactNode;
}

/** Envuelve una vista del Agente con la barra de subpestañas persistente. */
export const AgentSubNav: React.FC<AgentSubNavProps> = ({
  activeTab,
  onNavigateTo,
  children,
}) => (
  <div className="flex-1 h-full min-h-0 flex flex-col bg-canvas">
    <div data-lenis-prevent className="shrink-0 px-group pt-group pb-compact border-b border-border overflow-x-auto">
      <SegmentedTabs
        tabs={AGENT_SUB_TABS}
        activeTab={activeTab}
        onChange={onNavigateTo}
      />
    </div>
    <div className="flex-1 min-h-0 flex flex-col">{children}</div>
  </div>
);
