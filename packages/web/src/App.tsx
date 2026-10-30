import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AppShell } from "./components/layout/AppShell";
import { DashboardOverviewView } from "./components/views/DashboardOverviewView";
import { StockInventoryView } from "./components/views/StockInventoryView";
import { LogisticsRoutesView } from "./components/views/LogisticsRoutesView";
import { SuppliersView } from "./components/views/SuppliersView";
import { PurchaseOrdersView } from "./components/views/PurchaseOrdersView";
import { ProductsCatalogView } from "./components/views/ProductsCatalogView";
import { HitlApprovalsView } from "./components/views/HitlApprovalsView";
import { HistoryView } from "./components/views/HistoryView";
import { PoliciesRulesView } from "./components/views/PoliciesRulesView";
import { WorkflowCanvas } from "./components/canvas/WorkflowCanvas";
import { KnowledgeGraphView } from "./components/views/KnowledgeGraphView";
import { MemoryVaultView } from "./components/views/MemoryVaultView";
import { AnalyticsReportsView } from "./components/views/AnalyticsReportsView";
import { SettingsView } from "./components/views/SettingsView";
import { ComponentShowcaseView } from "./components/views/ComponentShowcaseView";
import { ModelsView } from "./components/views/ModelsView";
import { NodeLibraryView } from "./components/views/NodeLibraryView";
import { ObjectivesView } from "./components/views/ObjectivesView";
import { ApprovalDialog } from "./components/ui/ApprovalDialog";
import { ErrorBoundary } from "./components/ErrorBoundary";

import { HitlDecision } from "./types/workflow";
import { INITIAL_HITL_DECISIONS } from "./data/mockData";

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
  if (!clean) return DEFAULT_TAB;
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
  const [decisions, setDecisions] = useState<HitlDecision[]>(INITIAL_HITL_DECISIONS);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState<boolean>(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("#OC-402");

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
    setIsApprovalDialogOpen(false);
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
    setIsApprovalDialogOpen(false);
    setCurrentTab(DEFAULT_TAB);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${DEFAULT_TAB}`);
    }
  };

  const pendingApprovalsCount = decisions.filter((d) => d.status === "pendiente").length;

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
            onNavigateTo={setCurrentTab}
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
            onNavigateToInbox={() => setCurrentTab("aprobaciones")}
          />
        );

      case "rutas_logistica":
        return <LogisticsRoutesView />;

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
        return <NodeLibraryView onAddNode={() => handleTabChange("flujo_agente")} />;

      // Objetivos del orquestador (stock, margen, tiempo de entrega)
      case "objetivos":
        return <ObjectivesView />;

      // 6. REPORTES (Análisis)
      case "analisis_reportes":
        return <AnalyticsReportsView />;

      // 7. AJUSTES (contenedor maestro con 6 sub-pestañas)
      case "configuracion_general":
        return <SettingsView initialTab="configuracion_general" />;

      case "empresas_sucursales":
        return <SettingsView initialTab="empresas_sucursales" />;

      case "integraciones":
        return <SettingsView initialTab="integraciones" />;

      case "canales_notificaciones":
        return <SettingsView initialTab="canales_notificaciones" />;

      case "webhooks_api":
        return <SettingsView initialTab="webhooks_api" />;

      case "roles_permisos":
        return <SettingsView initialTab="roles_permisos" />;

      // SHOWCASE SOLO EN DESARROLLO
      case "componentes":
        return <ComponentShowcaseView />;

      // Fallback controlado: cualquier id desconocido cae en el Dashboard,
      // nunca en una pantalla en blanco.
      default:
        return (
          <DashboardOverviewView
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
            {renderContent()}
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
