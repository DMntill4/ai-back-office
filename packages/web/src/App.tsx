import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AppShell } from "./components/layout/AppShell";
import { LandaLandingPage } from "./components/landing/LandaLandingPage";
import { DashboardOverviewView } from "./components/views/DashboardOverviewView";
import { StockInventoryView } from "./components/views/StockInventoryView";
import { LogisticsRoutesView } from "./components/views/LogisticsRoutesView";
import { SuppliersView } from "./components/views/SuppliersView";
import { PurchaseOrdersView } from "./components/views/PurchaseOrdersView";
import { ProductsCatalogView } from "./components/views/ProductsCatalogView";
import { HitlApprovalsView } from "./components/views/HitlApprovalsView";
import { HistoryView } from "./components/views/HistoryView";
import { PoliciesRulesView } from "./components/views/PoliciesRulesView";
import { RolesPermissionsView } from "./components/views/RolesPermissionsView";
import { WorkflowCanvas } from "./components/canvas/WorkflowCanvas";
import { KnowledgeGraphView } from "./components/views/KnowledgeGraphView";
import { MemoryVaultView } from "./components/views/MemoryVaultView";
import { AnalyticsReportsView } from "./components/views/AnalyticsReportsView";
import { NotificationChannelsView } from "./components/views/NotificationChannelsView";
import { WebhooksApiView } from "./components/views/WebhooksApiView";
import { CompaniesBranchesView } from "./components/views/CompaniesBranchesView";
import { IntegrationsView } from "./components/views/IntegrationsView";
import { SettingsView } from "./components/views/SettingsView";
import { ApprovalDialog } from "./components/ui/ApprovalDialog";

import { HitlDecision } from "./types/workflow";
import { INITIAL_HITL_DECISIONS } from "./data/mockData";

export const App: React.FC = () => {
  // Pestaña inicial sincrónica con URL hash (e.g. #inventario)
  const [currentTab, setCurrentTab] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "");
      if (hash) return hash;
      if (window.location.pathname === "/landa") return "landa";
    }
    return "inicio";
  });
  const [decisions, setDecisions] = useState<HitlDecision[]>(INITIAL_HITL_DECISIONS);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState<boolean>(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("#OC-402");

  // Sync hash with currentTab (e.g. #inventario, #landa, #aprobaciones, etc.)
  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash) {
        setCurrentTab(hash);
      } else if (window.location.pathname === "/landa") {
        setCurrentTab("landa");
      }
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    if (typeof window !== "undefined") {
      window.location.hash = tab;
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

      // OPERACIONES
      case "inventario":
        return (
          <StockInventoryView
            onTriggerRebalance={(sku) => alert(`Rebalanceo sugerido para ${sku.name}`)}
            onNavigateToInbox={() => setCurrentTab("aprobaciones")}
          />
        );

      case "rutas_logistica":
        return <LogisticsRoutesView />;

      case "proveedores":
        return <SuppliersView />;

      case "compras_ordenes":
        return (
          <PurchaseOrdersView
            onOpenApprovalModal={() => setIsApprovalDialogOpen(true)}
          />
        );

      case "productos":
        return <ProductsCatalogView />;

      // GOBERNANZA
      case "aprobaciones":
        return (
          <HitlApprovalsView
            decisions={decisions}
            onApprove={handleApproveDecision}
            onReject={handleRejectDecision}
            onSimulateNew={() => {
              const newDecision: HitlDecision = {
                id: `dec_${Date.now()}`,
                orderNumber: `#OC-${Math.floor(100 + Math.random() * 900)}`,
                action: "Orden de compra consolidada",
                reason: "Punto de reorden alcanzado en ferretería Santander.",
                supplier: "Bosch Herramientas Colombia",
                leadTime: "2 días",
                amountCop: "$7.200.000 COP",
                amountFormatted: "$7.200.000 COP",
                impact: "Mantiene stock de seguridad para 14 días.",
                status: "pendiente",
                timestamp: "Hace unos momentos",
                warehouseId: "wh_buc",
                warehouseName: "Bodega Matriz Bucaramanga",
              };
              setDecisions((prev) => [newDecision, ...prev]);
            }}
          />
        );

      case "auditoria_eventos":
        return <HistoryView />;

      case "reglas_politicas":
        return <PoliciesRulesView />;

      case "roles_permisos":
        return <RolesPermissionsView />;

      // INTELIGENCIA
      case "flujo_agente":
        return (
          <WorkflowCanvas
            onOpenApprovalModal={(id) => {
              setSelectedOrderId(id);
              setIsApprovalDialogOpen(true);
            }}
          />
        );

      case "mapa_conocimiento":
        return <KnowledgeGraphView />;

      case "memoria_agente":
        return <MemoryVaultView />;

      case "analisis_reportes":
        return <AnalyticsReportsView />;

      // COMUNICACIONES
      case "canales_notificaciones":
        return <NotificationChannelsView />;

      case "webhooks_api":
        return <WebhooksApiView />;

      // CONFIGURACIÓN
      case "empresas_sucursales":
        return <CompaniesBranchesView />;

      case "integraciones":
        return <IntegrationsView />;

      case "configuracion_general":
        return <SettingsView />;

      default:
        return (
          <DashboardOverviewView
            onNavigateTo={setCurrentTab}
            onOpenApproval={() => setIsApprovalDialogOpen(true)}
          />
        );
    }
  };

  if (currentTab === "landa") {
    return (
      <LandaLandingPage
        onBackToApp={() => {
          window.location.hash = "";
          setCurrentTab("inicio");
        }}
      />
    );
  }

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
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="w-full flex-1 flex flex-col h-full min-h-0"
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>

      {/* Diálogo de Aprobación Unificado (Flowcraft Style con Motion) */}
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
