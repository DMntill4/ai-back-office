import React, { useState } from "react";
import { PageHeader } from "../ui/PageHeader";
import { SegmentedTabs, TabItem } from "../ui/SegmentedTabs";
import { MetricStrip, MetricItem } from "../ui/MetricStrip";
import { StatusIndicator } from "../ui/StatusIndicator";
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";
import { AgentEventChip } from "../ui/AgentEventChip";
import { AgentParticleCloud } from "../ui/AgentParticleCloud";
import { EmptyState } from "../ui/EmptyState";
import { Calendar, Sparkles, ArrowRight, RefreshCw } from "lucide-react";
import type { HitlDecision } from "../../types/workflow";

interface DashboardOverviewViewProps {
  onNavigateTo: (tabId: string) => void;
  onOpenApproval: () => void;
  /** Decisiones del agente; las pendientes se muestran como "requieren tu firma". */
  decisions?: HitlDecision[];
}

type AttentionKind = "firma" | "inventario" | "calidad";

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
  { id: "calidad", label: "Calidad" },
];

const KIND_GLYPH: Record<AttentionKind, { glyph: string; color: string }> = {
  firma: { glyph: "◆", color: "text-state-pending" },
  inventario: { glyph: "▲", color: "text-state-attention" },
  calidad: { glyph: "■", color: "text-state-error" },
};

const formatCop = (n: number) => `$${n.toLocaleString("es-CO")} COP`;

export const DashboardOverviewView: React.FC<DashboardOverviewViewProps> = ({
  onNavigateTo,
  onOpenApproval,
  decisions = [],
}) => {
  const [activeSubTab, setActiveSubTab] = useState<string>("resumen");

  // Saludo dinámico según la hora del día
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Buenos días, Fernando."
      : currentHour < 19
      ? "Buenas tardes, Fernando."
      : "Buenas noches, Fernando.";

  // Fecha actual formateada en español
  const formattedDate = new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const capitalizedDate =
    formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);


  // Cola de atención. Las firmas salen de las decisiones pendientes reales;
  // inventario y calidad son datos de muestra hasta que el backend los entregue.
  const attentionItems: AttentionItem[] = [
    ...decisions
      .filter((d) => d.status === "pendiente")
      .map<AttentionItem>((d) => ({
        id: `firma:${d.id}`,
        kind: "firma",
        urgency: d.redFlags.length > 0 ? 1 : 2,
        reference: d.sku,
        source: d.supplierName,
        status: "pending",
        statusLabel: "Requiere tu firma",
        title: d.title,
        amount: formatCop(d.totalCostCop),
        note: d.policyReason,
        rule: d.redFlags[0],
        actionLabel: "Revisar y aprobar",
        actionVariant: "primary",
        targetTab: "aprobaciones",
      })),
    {
      id: "inv:rot-001",
      kind: "inventario",
      urgency: 3,
      reference: "SKU-ROT-001",
      source: "Bodega Bucaramanga Matriz",
      status: "attention",
      statusLabel: "Bajo punto de reorden",
      title: "Existencia actual: 4 unidades (Mínimo de seguridad: 15)",
      note: "La tasa de demanda de esta semana es de 1.8 unidades diarias. Se proyecta quiebre en 2 días si no se autoriza la compra o se traslada excedente desde CD Fontibón.",
      actionLabel: "Simular rebalanceo",
      actionVariant: "secondary",
      targetTab: "inventario",
    } as AttentionItem,
    {
      id: "cal:galv-04",
      kind: "calidad",
      urgency: 4,
      reference: "LOTE-GALV-04",
      source: "Aceros del Oriente S.A.",
      status: "error",
      statusLabel: "Retenido en cuarentena",
      title: "Discrepancia técnica: Calibre 18 recibido vs. Calibre 16 ordenado",
      actionLabel: "Ver ficha técnica",
      actionVariant: "secondary",
      targetTab: "inventario",
    } as AttentionItem,
  ].sort((a, b) => a.urgency - b.urgency);

  const [kindFilter, setKindFilter] = useState<"todas" | AttentionKind>("todas");
  const firmasCount = attentionItems.filter((i) => i.kind === "firma").length;
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

  // Métricas reales sin tarjetas con el MetricStrip
  const metricsData: MetricItem[] = [
    {
      id: "capital",
      value: "$482.5M COP",
      context: "Capital activo en existencias físicas",
      highlightBrand: true,
      auxiliary: (
        <span className="text-caption font-medium text-state-ok">(+6.4% mes)</span>
      ),
    },
    {
      id: "catalogo",
      value: "338",
      context: "Referencias activas en 3 sedes",
      auxiliary: (
        <StatusIndicator status="ok" label="Catálogo activo" />
      ),
    },
    {
      id: "reorden",
      value: "8 SKUs",
      context: "Bajo punto de reorden (riesgo < 4 días)",
      auxiliary: (
        <StatusIndicator status="attention" label="Bajo ROP" />
      ),
    },
    {
      id: "aprobaciones",
      value: "2",
      context: "Compras que requieren tu aprobación",
      auxiliary: (
        <StatusIndicator status="pending" label="Requiere firma" />
      ),
    },
  ];

  // Actividad del agente en vivo
  const liveEvents = [
    {
      time: "10:24",
      action: "Auditoría de existencias finalizada",
      reference: "74 SKUs escaneados",
      timeAgo: "Hace 2 min",
    },
    {
      time: "10:18",
      action: "Orden propuesta por punto de reorden",
      reference: "PO-24A190",
      timeAgo: "Hace 8 min",
    },
    {
      time: "09:45",
      action: "Monitoreo de tráfico completado",
      reference: "Corredor Bucaramanga-Bogotá",
      timeAgo: "Hace 41 min",
    },
    {
      time: "08:30",
      action: "Conciliación de albarán de entrega",
      reference: "LOTE-GALV-04",
      timeAgo: "Hace 2 horas",
    },
  ];


  const showResumen = activeSubTab === "resumen";
  const showAtencion = activeSubTab === "atencion";
  const showActividad = activeSubTab === "actividad";

  const activityFeed = (
    <div className="space-y-compact pt-compact">
      <div className="flex items-center justify-between pb-compact border-b border-border">
        <div>
          <h3 className="text-section-title font-bold text-primary">Actividad del agente en vivo</h3>
          <p className="text-caption text-secondary mt-hairline">
            Historial cronológico de vigilancia y conciliación autónoma
          </p>
        </div>
        <StatusIndicator status="ok" label="Transmisión activa" />
      </div>
      <Panel className="p-0 divide-y divide-border overflow-hidden">
        {liveEvents.map((evt, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between px-group py-compact hover:bg-raised/30 transition-colors"
          >
            <div className="flex items-center gap-group">
              <span className="text-caption font-mono text-muted whitespace-nowrap w-12">{evt.time}</span>
              <AgentEventChip action={evt.action} reference={evt.reference} timeAgo={evt.timeAgo} />
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-muted" />
          </div>
        ))}
      </Panel>
    </div>
  );

  return (
    <div className="flex-1 h-full min-w-0 overflow-y-auto bg-canvas text-primary font-sans p-base sm:p-group lg:p-page space-y-group">
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

      {/* RESUMEN: saludo, métricas, vista previa de la cola y actividad */}
      {showResumen && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-group items-center py-compact">
            <div className="lg:col-span-8 space-y-compact">
              <h2 className="text-display font-bold text-primary tracking-tight">{greeting}</h2>
              <p className="text-body-large text-secondary leading-relaxed max-w-2xl">
                El agente completó la conciliación de existencias en{" "}
                <strong className="text-primary font-semibold">3 sedes físicas</strong>: se detectaron{" "}
                <strong className="text-state-attention font-semibold">
                  8 productos bajo el punto de reorden
                </strong>{" "}
                y hay{" "}
                <strong className="text-state-pending font-semibold">
                  {firmasCount} {firmasCount === 1 ? "compra que requiere" : "compras que requieren"} tu aprobación
                </strong>{" "}
                para asegurar el suministro de obra sin exceder los límites de crédito.
              </p>
            </div>
            <div className="lg:col-span-4 flex flex-col items-center justify-center p-compact rounded-container bg-panel/50 border border-border">
              <AgentParticleCloud size={160} state="pensando" />
              <div className="mt-compact text-center">
                <span className="text-caption font-medium text-primary block">Agente Autónomo Mint</span>
                <span className="text-caption text-muted block mt-hairline">
                  Vigilancia activa de existencias y logística
                </span>
              </div>
            </div>
          </div>

          <MetricStrip items={metricsData} />

          <div className="space-y-compact pt-compact">
            <div className="flex items-center justify-between pb-compact border-b border-border">
              <div>
                <h3 className="text-section-title font-bold text-primary">Lo que requiere tu atención</h3>
                <p className="text-caption text-secondary mt-hairline">
                  Las 3 más urgentes de {attentionItems.length}
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
              description="No hay acciones de este tipo por ahora. El agente te avisará cuando aparezca alguna."
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
  );
};
