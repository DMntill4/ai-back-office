import React, { lazy, Suspense, useState, useEffect, useCallback } from "react";
import { AppShell } from "./components/layout/AppShell";
import { LoadingScreen } from "./components/ui/LoadingScreen";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AgentSubNav, AGENT_TABS_WITHOUT_OWN_NAV } from "./components/layout/AgentSubNav";

import { getUserSettings, useUserSettings } from "./hooks/useUserSettings";
import { api, type PendingDecisionRecord } from "./services/apiClient";
import type { AppNotification } from "./components/layout/NotificationsPopover";
import type { SearchableRecord } from "./components/layout/CommandSearch";
import { AnimatePresence, MotionConfig, motion } from "motion/react";

const DashboardOverviewView = lazy(() =>
  import("./components/views/DashboardOverviewView").then((module) => ({
    default: module.DashboardOverviewView,
  }))
);
const StockInventoryView = lazy(() =>
  import("./components/views/StockInventoryView").then((module) => ({
    default: module.StockInventoryView,
  }))
);
const LogisticsRoutesView = lazy(() =>
  import("./components/views/LogisticsRoutesView").then((module) => ({
    default: module.LogisticsRoutesView,
  }))
);
const SuppliersView = lazy(() =>
  import("./components/views/SuppliersView").then((module) => ({
    default: module.SuppliersView,
  }))
);
const PurchaseOrdersView = lazy(() =>
  import("./components/views/PurchaseOrdersView").then((module) => ({
    default: module.PurchaseOrdersView,
  }))
);
const ProductsCatalogView = lazy(() =>
  import("./components/views/ProductsCatalogView").then((module) => ({
    default: module.ProductsCatalogView,
  }))
);
const HitlApprovalsView = lazy(() =>
  import("./components/views/HitlApprovalsView").then((module) => ({
    default: module.HitlApprovalsView,
  }))
);
const HistoryView = lazy(() =>
  import("./components/views/HistoryView").then((module) => ({
    default: module.HistoryView,
  }))
);
const PoliciesRulesView = lazy(() =>
  import("./components/views/PoliciesRulesView").then((module) => ({
    default: module.PoliciesRulesView,
  }))
);
const WorkflowCanvas = lazy(() =>
  import("./components/canvas/WorkflowCanvas").then((module) => ({
    default: module.WorkflowCanvas,
  }))
);
const KnowledgeGraphView = lazy(() =>
  import("./components/views/KnowledgeGraphView").then((module) => ({
    default: module.KnowledgeGraphView,
  }))
);
const MemoryVaultView = lazy(() =>
  import("./components/views/MemoryVaultView").then((module) => ({
    default: module.MemoryVaultView,
  }))
);
const AnalyticsReportsView = lazy(() =>
  import("./components/views/AnalyticsReportsView").then((module) => ({
    default: module.AnalyticsReportsView,
  }))
);
const SettingsView = lazy(() =>
  import("./components/views/SettingsView").then((module) => ({
    default: module.SettingsView,
  }))
);
const ComponentShowcaseView = lazy(() =>
  import("./components/views/ComponentShowcaseView").then((module) => ({
    default: module.ComponentShowcaseView,
  }))
);
const ModelsView = lazy(() =>
  import("./components/views/ModelsView").then((module) => ({
    default: module.ModelsView,
  }))
);
const NodeLibraryView = lazy(() =>
  import("./components/views/NodeLibraryView").then((module) => ({
    default: module.NodeLibraryView,
  }))
);
const ObjectivesView = lazy(() =>
  import("./components/views/ObjectivesView").then((module) => ({
    default: module.ObjectivesView,
  }))
);

/**
 * Mapa canónico de rutas → vista.
 *
 * Cualquier alias (p. ej. `agente`, `compras`, `ajustes`) se resuelve a una
 * única vista estable. Esto evita que un id desconocido o desincronizado deje
 * la interfaz en un estado ambiguo y rompa el historial de navegación.
 */
const TAB_ALIASES: Record<string, string> = {
  agente: "flujo_agente",
  compras: "compras_ordenes",
  reportes: "analisis_reportes",
  ajustes: "configuracion_general",
};

const KNOWN_TABS = new Set<string>([
  "inicio",
  "aprobaciones",
  "inventario",
  "rutas_logistica",
  "productos",
  "compras_ordenes",
  "proveedores",
  "flujo_agente",
  "mapa_conocimiento",
  "memoria_agente",
  "auditoria_eventos",
  "reglas_politicas",
  "modelos",
  "nodos",
  "objetivos",
  "analisis_reportes",
  "configuracion_general",
  "mi_perfil",
  "preferencias",
  "empresas_sucursales",
  "integraciones",
  "canales_notificaciones",
  "webhooks_api",
  "roles_permisos",
  "componentes",
]);

const DEFAULT_TAB = "inicio";

/** Normaliza cualquier entrada (hash, id de pestaña) a una ruta válida. */
const normalizeTab = (raw: string | null | undefined): string => {
  const clean = (raw ?? "").trim().replace(/^#/, "").toLowerCase();
  if (!clean) {
    const landing = getUserSettings().preferences.landingTab;
    return KNOWN_TABS.has(landing) ? landing : DEFAULT_TAB;
  }
  const resolved = TAB_ALIASES[clean] ?? clean;
  return KNOWN_TABS.has(resolved) ? resolved : DEFAULT_TAB;
};

const readTabFromLocation = (): string => {
  if (typeof window === "undefined") return DEFAULT_TAB;
  return normalizeTab(window.location.hash);
};

export const App: React.FC = () => {
  // Pestaña inicial sincrónica con URL hash (e.g. #inventario)
  const [currentTab, setCurrentTab] = useState<string>(readTabFromLocation);
  const [decisions, setDecisions] = useState<PendingDecisionRecord[]>([]);
  const [pendingDecisionCount, setPendingDecisionCount] = useState(0);
  const [decisionsError, setDecisionsError] = useState<string | null>(null);

  const refreshDecisions = useCallback(async () => {
    try {
      const response = await api.decisions.pending();
      if (response.isFallback || !response.success) {
        setDecisions([]);
        setPendingDecisionCount(0);
        setDecisionsError(response.message ?? "No fue posible consultar las aprobaciones.");
        return;
      }
      setDecisions(response.data);
      setPendingDecisionCount(response.count ?? response.data.length);
      setDecisionsError(null);
    } catch (error) {
      setDecisions([]);
      setPendingDecisionCount(0);
      setDecisionsError(error instanceof Error ? error.message : "No fue posible consultar las aprobaciones.");
    }
  }, []);

  useEffect(() => {
    void refreshDecisions();
    const timer = window.setInterval(() => void refreshDecisions(), 30_000);
    return () => window.clearInterval(timer);
  }, [refreshDecisions]);

  // Sincroniza el estado con el hash del navegador (botones atrás/adelante).
  // Se usa un único listener y se limpia al desmontar para no filtrar memoria.
  useEffect(() => {
    const syncFromHash = () => {
      setCurrentTab(readTabFromLocation());
    };
    window.addEventListener("hashchange", syncFromHash);
    window.addEventListener("popstate", syncFromHash);
    return () => {
      window.removeEventListener("hashchange", syncFromHash);
      window.removeEventListener("popstate", syncFromHash);
    };
  }, []);

  /**
   * Cambio de vista controlado.
   *
   * - Normaliza el destino (alias + fallback al Dashboard).
   * - Cierra overlays abiertos para que ninguna vista herede estado sucio.
   * - Escribe el hash con `replaceState` cuando es el mismo destino, evitando
   *   entradas duplicadas en el historial que dejaban el botón "atrás" inerte.
   */
  const handleTabChange = (tab: string) => {
    const nextTab = normalizeTab(tab);
    setCurrentTab(nextTab);

    if (typeof window !== "undefined") {
      const nextHash = `#${nextTab}`;
      if (window.location.hash !== nextHash) {
        window.history.pushState(null, "", nextHash);
      }
    }
  };

  /** Escape global: vuelve al Dashboard desde cualquier punto de la app. */
  const handleResetToDashboard = () => {
    setCurrentTab(DEFAULT_TAB);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${DEFAULT_TAB}`);
    }
  };

  const pendingApprovalsCount = pendingDecisionCount;

  // Avisos de la campana según las preferencias del usuario.
  const { preferences } = useUserSettings();
  const notifications: AppNotification[] = preferences.notifyApprovals
      ? decisions.map<AppNotification>((d) => ({
            id: `approval:${d.id}`,
            kind: "approval",
            title: `Requiere tu firma: ${d.title}`,
            detail: [
              d.proposingAgent ?? "Agente no especificado",
              d.costMxn == null ? "Costo no disponible" : `$${d.costMxn.toLocaleString("es-CO")} COP`,
            ].join(" · "),
            time: Number.isNaN(new Date(d.createdAt).getTime())
              ? "Fecha no disponible"
              : new Intl.DateTimeFormat("es-CO", {
                dateStyle: "short",
                timeStyle: "short",
              }).format(new Date(d.createdAt)),
            targetTab: "aprobaciones",
          }))
      : [];

  const searchRecords: SearchableRecord[] = decisions.map((d) => ({
      id: `rec:${d.id}`,
      label: d.title,
      hint: `${d.caseId} · ${d.proposingAgent}`,
      group: "Aprobaciones",
      targetTab: "aprobaciones",
    }));

  const renderContent = () => {
    switch (currentTab) {
      // 1. INICIO (Dashboard General)
      case "inicio":
        return (
          <DashboardOverviewView
            decisions={decisions}
            pendingDecisionCount={pendingDecisionCount}
            decisionsError={decisionsError}
            onNavigateTo={handleTabChange}
          />
        );

      // 2. APROBACIONES
      case "aprobaciones":
        return (
          <HitlApprovalsView
            onApprove={() => void refreshDecisions()}
            onReject={() => void refreshDecisions()}
          />
        );

      // 3. INVENTARIO (Existencias, Rutas y Productos)
      case "inventario":
        return (
          <StockInventoryView
            onNavigateTo={handleTabChange}
          />
        );

      case "rutas_logistica":
        return <LogisticsRoutesView onNavigateTo={handleTabChange} />;

      case "productos":
        return <ProductsCatalogView onNavigateTo={handleTabChange} />;

      // 4. COMPRAS (Órdenes y Proveedores)
      case "compras_ordenes":
        return (
          <PurchaseOrdersView
            onOpenApprovalModal={() => handleTabChange("aprobaciones")}
          />
        );

      case "proveedores":
        return <SuppliersView />;

      // 5. AGENTE (Flujo, Grafo, Memoria, Auditoría, Reglas)
      case "flujo_agente":
        return (
          <WorkflowCanvas
            onNavigateTo={handleTabChange}
            onOpenApprovalModal={() => handleTabChange("aprobaciones")}
          />
        );

      case "mapa_conocimiento":
        return <KnowledgeGraphView onNavigateTo={handleTabChange} />;

      case "memoria_agente":
        return <MemoryVaultView />;

      case "auditoria_eventos":
        return <HistoryView />;

      case "reglas_politicas":
        return <PoliciesRulesView />;

      // Modelos de IA configurados (FinOps / latencias / estado de API keys)
      case "modelos":
        return <ModelsView />;

      // Biblioteca de nodos / especialistas / herramientas del agente
      case "nodos":
        return (
          <NodeLibraryView
            onAddNode={(_type, _title) => handleTabChange("flujo_agente")}
          />
        );

      // Objetivos del orquestador (stock, margen, tiempo de entrega)
      case "objetivos":
        return <ObjectivesView />;

      // 6. REPORTES (Análisis)
      case "analisis_reportes":
        return <AnalyticsReportsView />;

      // 7. AJUSTES (contenedor maestro con 6 sub-pestañas)
      case "configuracion_general":
        return (
          <SettingsView
            initialTab="configuracion_general"
            onNavigateTo={handleTabChange}
          />
        );

      case "empresas_sucursales":
        return (
          <SettingsView
            initialTab="empresas_sucursales"
            onNavigateTo={handleTabChange}
          />
        );

      case "integraciones":
        return (
          <SettingsView initialTab="integraciones" onNavigateTo={handleTabChange} />
        );

      case "canales_notificaciones":
        return (
          <SettingsView
            initialTab="canales_notificaciones"
            onNavigateTo={handleTabChange}
          />
        );

      case "webhooks_api":
        return (
          <SettingsView initialTab="webhooks_api" onNavigateTo={handleTabChange} />
        );

      case "mi_perfil":
        return <SettingsView initialTab="mi_perfil" onNavigateTo={handleTabChange} />;

      case "preferencias":
        return <SettingsView initialTab="preferencias" onNavigateTo={handleTabChange} />;

      case "roles_permisos":
        return (
          <SettingsView initialTab="roles_permisos" onNavigateTo={handleTabChange} />
        );

      // SHOWCASE SOLO EN DESARROLLO
      case "componentes":
        return <ComponentShowcaseView />;

      // Fallback controlado: cualquier id desconocido cae en el Dashboard,
      // nunca en una pantalla en blanco.
      default:
        return (
          <DashboardOverviewView
            decisions={decisions}
            pendingDecisionCount={pendingDecisionCount}
            decisionsError={decisionsError}
            onNavigateTo={handleTabChange}
          />
        );
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <AppShell
        currentTab={currentTab}
        onSelectTab={handleTabChange}
        pendingApprovalsCount={pendingApprovalsCount}
        notifications={notifications}
        searchRecords={searchRecords}
        agentStatusText="Operativo"
        agentState="reposo"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="w-full max-w-full min-w-0 flex-1 flex flex-col h-full min-h-0"
          >
            <ErrorBoundary viewKey={currentTab} onReset={handleResetToDashboard}>
              <Suspense
                fallback={
                  <LoadingScreen
                    title="Abriendo sección"
                    subtitle="Cargando los recursos de esta vista."
                    fullScreen={false}
                  />
                }
              >
                {AGENT_TABS_WITHOUT_OWN_NAV.has(currentTab) ? (
                  <AgentSubNav activeTab={currentTab} onNavigateTo={handleTabChange}>
                    {renderContent()}
                  </AgentSubNav>
                ) : (
                  renderContent()
                )}
              </Suspense>
            </ErrorBoundary>
          </motion.div>
        </AnimatePresence>

      </AppShell>
    </MotionConfig>
  );
};
