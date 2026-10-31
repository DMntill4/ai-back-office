import React, { useMemo, useRef, useState } from "react";
import { PageHeader } from "../ui/PageHeader";
import { SegmentedTabs, TabItem } from "../ui/SegmentedTabs";
import { MetricStrip, MetricItem } from "../ui/MetricStrip";
import { StatusIndicator } from "../ui/StatusIndicator";
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";
import { EmptyState } from "../ui/EmptyState";
import { useLenisScroll } from "../../hooks/useLenisScroll";
import { Calendar, Sparkles, RefreshCw } from "lucide-react";
import type { PendingDecisionRecord } from "../../services/apiClient";
import { useInventoryData } from "../../hooks/useInventoryData";

interface DashboardOverviewViewProps {
  onNavigateTo: (tabId: string) => void;
  decisions: PendingDecisionRecord[];
  pendingDecisionCount: number;
  decisionsError: string | null;
}

type AttentionKind = "firma" | "inventario";

interface AttentionItem {
  id: string;
  kind: AttentionKind;
  /** Menor número = más urgente. */
  urgency: number;
  reference: string;
  source: string;
  status: "pending" | "attention" | "error";
  statusLabel: string;
  title: string;
  amount?: string;
  note?: string;
  rule?: string;
  actionLabel: string;
  actionVariant: "primary" | "secondary";
  targetTab: string;
}

const KIND_FILTERS: { id: "todas" | AttentionKind; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "firma", label: "Firmas" },
  { id: "inventario", label: "Inventario" },
];

const KIND_GLYPH: Record<AttentionKind, { glyph: string; color: string }> = {
  firma: { glyph: "◆", color: "text-state-pending" },
  inventario: { glyph: "▲", color: "text-state-attention" },
};

const formatCurrency = (value: number, currency = "COP") =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);

export const DashboardOverviewView: React.FC<DashboardOverviewViewProps> = ({
  onNavigateTo,
  decisions,
  pendingDecisionCount,
  decisionsError,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<string>("resumen");
  const scrollWrapperRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
  useLenisScroll(scrollWrapperRef, scrollContentRef);
  const {
    summary: inventorySummary,
    ropAlerts,
    loading: inventoryLoading,
    error: inventoryError,
    refresh: refreshInventory,
  } = useInventoryData();

  // Saludo dinámico según la hora del día
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Buenos días."
      : currentHour < 19
      ? "Buenas tardes."
      : "Buenas noches.";

  // Fecha actual formateada en español
  const formattedDate = new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const capitalizedDate =
    formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);


  const attentionItems = useMemo<AttentionItem[]>(() => [
    ...decisions.map<AttentionItem>((decision) => ({
        id: `firma:${decision.id}`,
        kind: "firma",
        urgency: 1,
        reference: decision.caseId,
        source: decision.proposingAgent ?? "Agente no especificado",
        status: "pending",
        statusLabel: "Requiere tu firma",
        title: decision.title,
        amount: decision.costMxn == null ? undefined : formatCurrency(decision.costMxn),
        note: decision.policyReason ?? undefined,
        actionLabel: "Revisar y aprobar",
        actionVariant: "primary",
        targetTab: "aprobaciones",
      })),
    ...ropAlerts.map<AttentionItem>((alert) => ({
      id: `inventario:${alert.productId}`,
      kind: "inventario",
      urgency: alert.status === "AGOTADO" ? 0 : 2,
      reference: alert.sku,
      source: alert.preferredSupplierName ?? alert.warehouseBreakdown[0]?.warehouseName ?? "Inventario",
      status: alert.status === "AGOTADO" ? "error" : "attention",
      statusLabel: alert.status === "AGOTADO" ? "Sin existencias" : "Requiere reposición",
      title: `${alert.totalStock} unidades · mínimo ${alert.minStock} · reorden ${alert.reorderPoint}`,
      note: alert.dailyBurnRate > 0
        ? `Consumo promedio registrado: ${alert.dailyBurnRate} unidades por día.`
        : undefined,
      actionLabel: "Ver existencias",
      actionVariant: "secondary",
      targetTab: "inventario",
    })),
  ].sort((a, b) => a.urgency - b.urgency), [decisions, ropAlerts]);

  const [kindFilter, setKindFilter] = useState<"todas" | AttentionKind>("todas");
  const visibleItems =
    kindFilter === "todas"
      ? attentionItems
      : attentionItems.filter((i) => i.kind === kindFilter);

  const subTabs: TabItem[] = [
    { id: "resumen", label: "Resumen del día" },
    { id: "atencion", label: "Lo que requiere tu atención", badge: attentionItems.length },
    { id: "actividad", label: "Actividad del agente" },
  ];

  const renderAttentionCard = (item: AttentionItem) => {
    const g = KIND_GLYPH[item.kind];
    return (
      <Panel key={item.id} className="space-y-compact hover:border-strong transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-compact">
          <div className="flex items-start gap-compact flex-1 min-w-0">
            <div className={`w-8 h-8 rounded-control bg-raised flex items-center justify-center flex-shrink-0 mt-hairline ${g.color}`}>
              <span className="text-body font-bold">{g.glyph}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-compact">
                <span className="font-mono text-caption font-medium text-primary whitespace-nowrap">
                  {item.reference}
                </span>
                <span className="text-muted">·</span>
                <span className="text-caption text-secondary font-medium">{item.source}</span>
                <StatusIndicator status={item.status} label={item.statusLabel} />
              </div>
              <h4 className="text-body-large font-semibold text-primary mt-hairline">
                {item.title}
              </h4>
            </div>
          </div>
          {item.amount && (
            <span className="text-section-title font-bold text-primary tabular-nums text-right flex-shrink-0">
              {item.amount}
            </span>
          )}
        </div>

        {item.note && (
          <div className="p-compact rounded-control bg-raised border border-border text-caption text-secondary space-y-hairline">
            <div className="flex items-center gap-1.5 text-primary font-medium">
              <Sparkles className="w-3.5 h-3.5 text-brand" />
              <span>Justificación del agente</span>
            </div>
            <p className="leading-relaxed">{item.note}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-compact pt-hairline">
          <span className="text-caption text-muted">{item.rule ?? ""}</span>
          <Button
            variant={item.actionVariant}
            size={item.actionVariant === "primary" ? "md" : "table"}
            showArrow={item.actionVariant === "primary"}
            onClick={() => onNavigateTo(item.targetTab)}
          >
            {item.actionLabel}
          </Button>
        </div>
      </Panel>
    );
  };

  const inventoryValuation = inventorySummary
    ? formatCurrency(inventorySummary.totalValuation, inventorySummary.currency)
    : "—";
  const atRiskCount = inventorySummary
    ? inventorySummary.skusBelowRop +
      inventorySummary.skusOutOfStock +
      inventorySummary.skusAtRisk
    : 0;

  const metricsData: MetricItem[] = [
    {
      id: "capital",
      value: inventoryValuation,
      context: inventorySummary
        ? "Valoración calculada desde inventario y costos registrados"
        : "Valoración no disponible desde el backend",
      highlightBrand: true,
    },
    {
      id: "catalogo",
      value: String(inventorySummary?.totalSkus ?? 0),
      context: "Referencias consultadas en la base de datos",
      auxiliary: inventoryLoading ? undefined : (
        <StatusIndicator status={inventoryError ? "error" : "ok"} label={inventoryError ? "Error de consulta" : "Consulta completada"} />
      ),
    },
    {
      id: "reorden",
      value: String(atRiskCount),
      context: "Referencias con alerta de reposición reportada por el backend",
      auxiliary: (
        <StatusIndicator status={atRiskCount > 0 ? "attention" : "ok"} label={atRiskCount > 0 ? "Revisar reposición" : "Sin alertas"} />
      ),
    },
    {
      id: "aprobaciones",
      value: String(pendingDecisionCount),
      context: "Compras que requieren tu aprobación",
      auxiliary: decisionsError
        ? <StatusIndicator status="error" label="No disponible" />
        : <StatusIndicator status={decisions.length > 0 ? "pending" : "ok"} label={decisions.length > 0 ? "Requiere firma" : "Sin pendientes"} />,
    },
  ];

  const showResumen = activeSubTab === "resumen";
  const showAtencion = activeSubTab === "atencion";
  const showActividad = activeSubTab === "actividad";

  const activityFeed = (
    <EmptyState
      title="Actividad no disponible"
      description="No hay un historial operativo conectado a esta vista. No se muestran eventos de ejemplo."
    />
  );

  return (
    <div
      ref={scrollWrapperRef}
      className="flex-1 h-full min-h-0 min-w-0 overflow-y-auto overscroll-contain"
    >
      <div
        ref={scrollContentRef}
        className="min-h-full bg-canvas text-primary font-sans p-base sm:p-group lg:p-page space-y-group"
      >
        <PageHeader
          title="Centro de Operaciones"
          description="Supervisión autónoma de existencias, compras y gobernanza de obra."
          actions={
            <div className="flex items-center gap-compact">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-pill bg-panel border border-border text-caption text-secondary">
                <Calendar className="w-3.5 h-3.5 text-brand" />
                <span>{capitalizedDate}</span>
              </div>
              <Button
                variant="secondary"
                size="table"
                icon={<RefreshCw className="w-3.5 h-3.5" />}
                onClick={() => onNavigateTo("agente")}
              >
                Ver flujo
              </Button>
            </div>
          }
          filterControl={
            <SegmentedTabs tabs={subTabs} activeTab={activeSubTab} onChange={setActiveSubTab} />
          }
        />

      {(decisionsError || inventoryError) && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-compact rounded-control border border-state-error/40 bg-state-error-surface px-compact py-compact text-caption text-state-error"
        >
          <span>
            No se pudieron validar todos los datos con el backend.
            {decisionsError ? ` Aprobaciones: ${decisionsError}.` : ""}
            {inventoryError ? ` Inventario: ${inventoryError}.` : ""}
          </span>
          <Button
            variant="ghost"
            size="table"
            onClick={() => void refreshInventory()}
          >
            Reintentar inventario
          </Button>
        </div>
      )}

      {/* RESUMEN: saludo, métricas, vista previa de la cola y actividad */}
      {showResumen && (
        <>
          <div className="py-compact">
            <div className="space-y-compact">
              <h2 className="text-display font-bold text-primary tracking-tight">{greeting}</h2>
              <p className="text-body-large text-secondary leading-relaxed max-w-2xl">
                La base de datos registra{" "}
                <strong className="text-primary font-semibold">{inventorySummary?.totalSkus ?? 0} referencias</strong>
                {" "}y el servicio reporta{" "}
                <strong className="text-state-attention font-semibold">
                  {atRiskCount} referencias con alertas de inventario
                </strong>{" "}
                . Además hay{" "}
                <strong className="text-state-pending font-semibold">
                  {pendingDecisionCount} {pendingDecisionCount === 1 ? "decisión pendiente" : "decisiones pendientes"}
                </strong>
                {" "}de aprobación.
              </p>
            </div>
          </div>

          <MetricStrip items={metricsData} />

          <div className="space-y-compact pt-compact">
            <div className="flex items-center justify-between pb-compact border-b border-border">
              <div>
                <h3 className="text-section-title font-bold text-primary">Lo que requiere tu atención</h3>
                <p className="text-caption text-secondary mt-hairline">
                  {Math.min(3, attentionItems.length)} de {attentionItems.length} registros consultados
                </p>
              </div>
              <Button variant="secondary" size="table" showArrow onClick={() => setActiveSubTab("atencion")}>
                Ver todo ({attentionItems.length})
              </Button>
            </div>
            <div className="space-y-compact">
              {attentionItems.slice(0, 3).map(renderAttentionCard)}
            </div>
          </div>

          {activityFeed}
        </>
      )}

      {/* ATENCIÓN: vista propia con filtros por tipo */}
      {showAtencion && (
        <div className="space-y-group">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-compact">
            <div>
              <h2 className="text-section-title font-bold text-primary">Lo que requiere tu atención</h2>
              <p className="text-caption text-secondary mt-hairline">
                {attentionItems.length} {attentionItems.length === 1 ? "acción pendiente" : "acciones pendientes"}, ordenadas por urgencia.
              </p>
            </div>
            <SegmentedTabs
              tabs={KIND_FILTERS.map((f) => ({
                id: f.id,
                label: f.label,
                badge:
                  f.id === "todas"
                    ? attentionItems.length
                    : attentionItems.filter((i) => i.kind === f.id).length,
              }))}
              activeTab={kindFilter}
              onChange={(id) => setKindFilter(id as "todas" | AttentionKind)}
            />
          </div>

          {visibleItems.length === 0 ? (
            <EmptyState
              title="Nada pendiente aquí"
              description="No hay registros del backend que coincidan con esta categoría."
              actionLabel={kindFilter === "todas" ? undefined : "Ver todas"}
              onAction={() => setKindFilter("todas")}
            />
          ) : (
            <div className="space-y-compact">{visibleItems.map(renderAttentionCard)}</div>
          )}
        </div>
      )}

      {/* ACTIVIDAD: solo el feed del agente */}
      {showActividad && activityFeed}
      </div>
    </div>
  );
};
