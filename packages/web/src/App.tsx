import React, { lazy, Suspense, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AppShell } from "./components/layout/AppShell";
import { ApprovalDialog } from "./components/ui/ApprovalDialog";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AgentSubNav, AGENT_TABS_WITHOUT_OWN_NAV } from "./components/layout/AgentSubNav";

import { HitlDecision } from "./types/workflow";
import { getUserSettings, useUserSettings } from "./hooks/useUserSettings";
import type { AppNotification } from "./components/layout/NotificationsPopover";
import type { SearchableRecord } from "./components/layout/CommandSearch";
import { INITIAL_HITL_DECISIONS } from "./data/mockData";

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

const TabLoadingScreen: React.FC = () => (
  <div
    className="flex flex-1 min-h-0 items-center justify-center bg-canvas"
    role="status"
    aria-live="polite"
    aria-busy="true"
  >
    <div className="flex flex-col items-center gap-3 text-center">
      <div
        className="h-8 w-8 rounded-full border-2 border-border border-t-brand animate-spin"
        aria-hidden="true"
      />
      <div>
        <p className="text-caption font-medium text-primary">Preparando vista</p>
        <p className="mt-1 text-caption text-muted">Cargando contenido…</p>
      </div>
      <div
        className="h-1 w-32 overflow-hidden rounded-full bg-raised"
        role="progressbar"
        aria-label="Carga de la vista"
      >
        <div className="h-full w-1/3 animate-pulse rounded-full bg-brand" />
      </div>
    </div>
  </div>
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
  const [isTabLoading, setIsTabLoading] = useState(false);
  const [decisions, setDecisions] = useState<HitlDecision[]>(INITIAL_HITL_DECISIONS);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState<boolean>(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("#OC-402");

  // Sincroniza el estado con el hash del navegador (botones atrás/adelante).
  // Se usa un único listener y se limpia al desmontar para no filtrar memoria.
  useEffect(() => {
    const syncFromHash = () => {
      const nextTab = readTabFromLocation();
      if (nextTab !== currentTab) {
        setIsTabLoading(true);
        setCurrentTab(nextTab);
      }
    };
    window.addEventListener("hashchange", syncFromHash);
    window.addEventListener("popstate", syncFromHash);
    return () => {
      window.removeEventListener("hashchange", syncFromHash);
      window.removeEventListener("popstate", syncFromHash);
    };
  }, [currentTab]);

  useEffect(() => {
    if (!isTabLoading) return;

    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => setIsTabLoading(false));
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [currentTab, isTabLoading]);

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
    setIsApprovalDialogOpen(false);
    if (nextTab !== currentTab) {
      setIsTabLoading(true);
      setCurrentTab(nextTab);
    }

    if (typeof window !== "undefined") {
      const nextHash = `#${nextTab}`;
      if (window.location.hash !== nextHash) {
        window.history.pushState(null, "", nextHash);
      }
    }
  };

  /** Escape global: vuelve al Dashboard desde cualquier punto de la app. */
  const handleResetToDashboard = () => {
    setIsApprovalDialogOpen(false);
    setIsTabLoading(true);
    setCurrentTab(DEFAULT_TAB);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${DEFAULT_TAB}`);
    }
  };

  const pendingApprovalsCount = decisions.filter((d) => d.status === "pendiente").length;

  // Avisos de la campana según las preferencias del usuario.
  // Aprobaciones: reales (estado de `decisions`). Stock y agente: muestra local
  // alineada con el Inicio hasta que el backend entregue el feed.
  const { preferences } = useUserSettings();
  const notifications: AppNotification[] = [
    ...(preferences.notifyApprovals
      ? decisions
          .filter((d) => d.status === "pendiente")
          .map<AppNotification>((d) => ({
            id: `approval:${d.id}`,
            kind: "approval",
            title: `Requiere tu firma: ${d.title}`,
            detail: `${d.supplierName} · ${d.totalCostCop.toLocaleString("es-CO")} COP`,
            time: d.createdAt,
            targetTab: "aprobaciones",
          }))
      : []),
    ...(preferences.notifyStock
      ? [
          {
            id: "stock:rotomartillo-rop",
            kind: "stock" as const,
            title: "Rotomartillo SDS bajo el punto de reorden",
            detail: "Quedan 2 unidades; el punto de reorden es 10.",
            time: "Hoy, 09:40",
            targetTab: "inventario",
          },
          {
            id: "stock:cuarentena",
            kind: "stock" as const,
            title: "Lote retenido en cuarentena",
            detail: "Revisa el lote antes de liberarlo al inventario.",
            time: "Hoy, 08:05",
            targetTab: "inventario",
          },
        ]
      : []),
    ...(preferences.notifyAgent
      ? [
          {
            id: "agent:ciclo-8849",
            kind: "agent" as const,
            title: "Ciclo #8849 del agente en curso",
            detail: "Vigilancia de existencias y cotización activa.",
            time: "Hace 3 min",
            targetTab: "flujo_agente",
          },
        ]
      : []),
  ];

  const searchRecords: SearchableRecord[] = decisions
    .filter((d) => d.status === "pendiente")
    .map((d) => ({
      id: `rec:${d.id}`,
      label: d.title,
      hint: `${d.sku} · ${d.supplierName}`,
      group: "Aprobaciones",
      targetTab: "aprobaciones",
    }));

  const handleApproveDecision = (decisionId: string) => {
    setDecisions((prev) =>
      prev.map((d) =>
        d.id === decisionId ? { ...d, status: "aprobado" } : d
      )
    );
  };

  const handleRejectDecision = (decisionId: string) => {
    setDecisions((prev) =>
      prev.map((d) =>
        d.id === decisionId ? { ...d, status: "rechazado" } : d
      )
    );
  };

  const renderContent = () => {
    switch (currentTab) {
      // 1. INICIO (Dashboard General)
      case "inicio":
        return (
          <DashboardOverviewView
            decisions={decisions}
            onNavigateTo={handleTabChange}
            onOpenApproval={() => setIsApprovalDialogOpen(true)}
          />
        );

      // 2. APROBACIONES
      case "aprobaciones":
        return (
          <HitlApprovalsView
            decisions={decisions}
            onApprove={handleApproveDecision}
            onReject={handleRejectDecision}
            onSimulateNew={() => {
              const newDecision: HitlDecision = {
                id: `dec_${Date.now()}`,
                caseId: `case_${Date.now()}`,
                title: "Orden de compra consolidada: Bosch Herramientas",
                productName: "Herramientas de Precisión Bosch",
                sku: "SKU-BOS-992",
                quantity: 20,
                unitPriceCop: 360000,
                totalCostCop: 7200000,
                supplierName: "Bosch Herramientas Colombia",
                supplierCity: "Bucaramanga",
                leadTimeDays: 2,
                currentStock: 5,
                ropThreshold: 25,
                riskScore: 0.15,
                redFlags: ["Excede umbral autónomo"],
                status: "pendiente",
                policyDecision: "pending_approval",
                policyReason: "Punto de reorden alcanzado en ferretería Santander.",
                createdAt: "Hace unos momentos",
              };
              setDecisions((prev) => [newDecision, ...prev]);
            }}
          />
        );

      // 3. INVENTARIO (Existencias, Rutas y Productos)
      case "inventario":
        return (
          <StockInventoryView
            onNavigateTo={handleTabChange}
            onNavigateToInbox={() => handleTabChange("aprobaciones")}
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
            onOpenApprovalModal={() => setIsApprovalDialogOpen(true)}
          />
        );

      case "proveedores":
        return <SuppliersView />;

      // 5. AGENTE (Flujo, Grafo, Memoria, Auditoría, Reglas)
      case "flujo_agente":
        return (
          <WorkflowCanvas
            onNavigateTo={handleTabChange}
            onOpenApprovalModal={(id) => {
              setSelectedOrderId(id);
              setIsApprovalDialogOpen(true);
            }}
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
            onNavigateTo={handleTabChange}
            onOpenApproval={() => setIsApprovalDialogOpen(true)}
          />
        );
    }
  };

  return (
    <AppShell
      currentTab={currentTab}
      onSelectTab={handleTabChange}
      pendingApprovalsCount={pendingApprovalsCount}
      notifications={notifications}
      searchRecords={searchRecords}
      agentStatusText="Operativo · 10:24 a. m."
      agentState="reposo"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="w-full flex-1 flex flex-col h-full min-h-0"
        >
          <ErrorBoundary viewKey={currentTab} onReset={handleResetToDashboard}>
            <Suspense fallback={<TabLoadingScreen />}>
              {isTabLoading ? (
                <TabLoadingScreen />
              ) : AGENT_TABS_WITHOUT_OWN_NAV.has(currentTab) ? (
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

      {/* Diálogo de Aprobación Unificado */}
      <ApprovalDialog
        isOpen={isApprovalDialogOpen}
        onClose={() => setIsApprovalDialogOpen(false)}
        title="Aprobación de orden de compra"
        orderNumber={selectedOrderId}
        amountCop="$6.375.000 COP"
        supplier="DeWalt Colombia (Mayorista Homologado)"
        leadTime="3 días hábiles"
        destinationWarehouse="Bodega Matriz Bucaramanga"
        impactReason="El inventario actual de Rotomartillo SDS cayó a 2 unidades (bajo el punto de reorden de 10 unidades). La demanda histórica proyecta desabasto en 48 horas. Se consolidó despacho para Santander."
        onApprove={() => {
          setIsApprovalDialogOpen(false);
          alert("Orden #OC-402 autorizada con firma HMAC y registrada en PostgreSQL.");
        }}
        onReject={() => {
          setIsApprovalDialogOpen(false);
          alert("Propuesta de compra rechazada.");
        }}
      />
    </AppShell>
  );
};
