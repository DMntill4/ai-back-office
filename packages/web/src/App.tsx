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

export const App: React.FC = () => {
  // Pestaña inicial sincrónica con URL hash (e.g. #inventario)
  const [currentTab, setCurrentTab] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "");
      if (hash) return hash;
    }
    return "inicio";
  });
  const [decisions, setDecisions] = useState<HitlDecision[]>(INITIAL_HITL_DECISIONS);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState<boolean>(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("#OC-402");

  // Sync hash with currentTab (e.g. #inventario, #aprobaciones, etc.)
  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash) {
        setCurrentTab(hash);
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
      case "compras":
      case "compras_ordenes":
        return (
          <PurchaseOrdersView
            onOpenApprovalModal={() => setIsApprovalDialogOpen(true)}
          />
        );

      case "proveedores":
        return <SuppliersView />;

      // 5. AGENTE (Flujo, Grafo, Memoria, Auditoría, Reglas)
      case "agente":
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
      case "reportes":
      case "analisis_reportes":
        return <AnalyticsReportsView />;

      // 7. AJUSTES (contenedor maestro con 6 sub-pestañas)
      case "ajustes":
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
          <ErrorBoundary viewKey={currentTab}>{renderContent()}</ErrorBoundary>
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
