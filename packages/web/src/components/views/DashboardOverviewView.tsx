import React, { useState } from "react";
import { PageHeader } from "../ui/PageHeader";
import { SegmentedTabs, TabItem } from "../ui/SegmentedTabs";
import { MetricStrip, MetricItem } from "../ui/MetricStrip";
import { StatusIndicator } from "../ui/StatusIndicator";
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";
import { AgentEventChip } from "../ui/AgentEventChip";
import { AgentParticleCloud } from "../ui/AgentParticleCloud";
import { Calendar, Sparkles, ArrowRight, ShieldCheck, RefreshCw } from "lucide-react";

interface DashboardOverviewViewProps {
  onNavigateTo: (tabId: string) => void;
  onOpenApproval: () => void;
}

export const DashboardOverviewView: React.FC<DashboardOverviewViewProps> = ({
  onNavigateTo,
  onOpenApproval,
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

  // 3 Subpestañas oficiales de Inicio según Mint-DESIGN.md
  const subTabs: TabItem[] = [
    { id: "resumen", label: "Resumen del día" },
    { id: "atencion", label: "Lo que requiere tu atención", badge: 3 },
    { id: "actividad", label: "Actividad del agente" },
  ];

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

  return (
    <div className="flex-1 h-full overflow-y-auto bg-canvas text-primary font-sans p-page space-y-group">
      {/* 1. Page Header con Subpestañas Segmentadas */}
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
          <SegmentedTabs
            tabs={subTabs}
            activeTab={activeSubTab}
            onChange={setActiveSubTab}
          />
        }
      />

      {/* 2. Hero Asimétrico: Resumen Narrativo + Nube de Guanábana */}
      {(activeSubTab === "resumen" || activeSubTab === "atencion") && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-group items-center py-compact">
          {/* Columna Izquierda: Saludo y Resumen Narrativo */}
          <div className="lg:col-span-8 space-y-compact">
            <h2 className="text-display font-bold text-primary tracking-tight">
              {greeting}
            </h2>
            <p className="text-body-large text-secondary leading-relaxed max-w-2xl">
              El agente completó la conciliación de existencias en{" "}
              <strong className="text-primary font-semibold">3 sedes físicas</strong>:{" "}
              se detectaron{" "}
              <strong className="text-state-attention font-semibold">
                8 productos bajo el punto de reorden
              </strong>{" "}
              y se retuvieron{" "}
              <strong className="text-state-pending font-semibold">
                2 compras que requieren tu aprobación
              </strong>{" "}
              para asegurar el suministro de obra sin exceder los límites de crédito.
            </p>
          </div>

          {/* Columna Derecha: Presencia del Agente (Nube en Canvas 2D) */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center p-compact rounded-container bg-panel/50 border border-border">
            <AgentParticleCloud size={160} state="pensando" />
            <div className="mt-compact text-center">
              <span className="text-caption font-medium text-primary block">
                Agente Autónomo Mint
              </span>
              <span className="text-caption text-muted block mt-hairline">
                Vigilancia activa de existencias y logística
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Franja de Métricas sin Tarjetas (MetricStrip Oficial) */}
      <MetricStrip items={metricsData} />

      {/* 4. Cola: Lo que requiere tu atención (Ordenada por Urgencia) */}
      {(activeSubTab === "resumen" || activeSubTab === "atencion") && (
        <div className="space-y-compact pt-compact">
          <div className="flex items-center justify-between pb-compact border-b border-border">
            <div>
              <h3 className="text-section-title font-bold text-primary">
                Lo que requiere tu atención
              </h3>
              <p className="text-caption text-secondary mt-hairline">
                Acciones prioritarias clasificadas por impacto operativo
              </p>
            </div>
            <StatusIndicator status="pending" label="3 acciones pendientes" />
          </div>

          <div className="space-y-compact">
            {/* Acción 1: Aprobación Ejecutiva (Máxima Prioridad) */}
            <Panel className="space-y-compact hover:border-strong transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-compact">
                <div className="flex items-start gap-compact flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-control bg-raised flex items-center justify-center flex-shrink-0 mt-hairline text-state-pending">
                    <span className="text-body font-bold">◆</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-compact">
                      <span className="font-mono text-caption font-medium text-primary whitespace-nowrap">
                        PO-24A190
                      </span>
                      <span className="text-muted">·</span>
                      <span className="text-caption text-secondary font-medium whitespace-nowrap">
                        Distribuciones Santander
                      </span>
                      <StatusIndicator status="pending" label="Requiere tu firma" />
                    </div>
                    <h4 className="text-body-large font-semibold text-primary mt-hairline">
                      50× Rotomartillo Bosch SDS Plus (Reposición Crítica)
                    </h4>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="text-section-title font-bold text-primary tabular-nums block">
                    $7.250.000 COP
                  </span>
                  <span className="text-caption text-state-ok font-medium block">
                    Ahorro negociado: $1.450.000 COP
                  </span>
                </div>
              </div>

              {/* Justificación del Agente */}
              <div className="p-compact rounded-control bg-raised border border-border text-caption text-secondary space-y-hairline">
                <div className="flex items-center gap-1.5 text-primary font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-brand" />
                  <span>Justificación del agente</span>
                </div>
                <p className="leading-relaxed">
                  Las existencias en Bodega Bucaramanga cayeron a 4 unidades con cobertura proyectada menor a 38 horas. El proveedor homologado garantiza entrega en 24h con 8% de descuento por volumen consolidado.
                </p>
              </div>

              {/* Botón de Acción Principal en Píldora Cálida */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-compact pt-hairline">
                <span className="text-caption text-muted">
                  Regla POL-COMP-01: Excede el umbral autónomo de $5.000.000 COP
                </span>
                <Button
                  variant="primary"
                  onClick={onOpenApproval}
                  showArrow={true}
                >
                  Revisar y aprobar
                </Button>
              </div>
            </Panel>

            {/* Acción 2: Quiebre de Stock en Inventario */}
            <Panel className="space-y-compact hover:border-strong transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-compact">
                <div className="flex items-start gap-compact flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-control bg-raised flex items-center justify-center flex-shrink-0 mt-hairline text-state-attention">
                    <span className="text-body font-bold">▲</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-compact">
                      <span className="font-mono text-caption font-medium text-primary whitespace-nowrap">
                        SKU-ROT-001
                      </span>
                      <span className="text-muted">·</span>
                      <span className="text-caption text-secondary font-medium whitespace-nowrap">
                        Bodega Bucaramanga Matriz
                      </span>
                      <StatusIndicator status="attention" label="Bajo punto de reorden" />
                    </div>
                    <h4 className="text-body-large font-semibold text-primary mt-hairline">
                      Existencia actual: 4 unidades (Mínimo de seguridad: 15)
                    </h4>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  size="table"
                  onClick={() => onNavigateTo("inventario")}
                >
                  Simular rebalanceo
                </Button>
              </div>

              <p className="text-body text-secondary leading-relaxed pl-base">
                La tasa de demanda de esta semana es de 1.8 unidades diarias. Se proyecta quiebre en 2 días si no se autoriza la compra o se traslada excedente desde CD Fontibón.
              </p>
            </Panel>

            {/* Acción 3: Cuarentena de Calidad */}
            <Panel className="space-y-compact hover:border-strong transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-compact">
                <div className="flex items-start gap-compact flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-control bg-raised flex items-center justify-center flex-shrink-0 mt-hairline text-state-error">
                    <span className="text-body font-bold">■</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-compact">
                      <span className="font-mono text-caption font-medium text-primary whitespace-nowrap">
                        LOTE-GALV-04
                      </span>
                      <span className="text-muted">·</span>
                      <span className="text-caption text-secondary font-medium whitespace-nowrap">
                        Aceros del Oriente S.A.
                      </span>
                      <StatusIndicator status="error" label="Retenido en cuarentena" />
                    </div>
                    <h4 className="text-body-large font-semibold text-primary mt-hairline">
                      Discrepancia técnica: Calibre 18 recibido vs. Calibre 16 ordenado
                    </h4>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  size="table"
                  onClick={() => onNavigateTo("inventario")}
                >
                  Ver ficha técnica
                </Button>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {/* 5. Actividad en Vivo del Agente (ActivityFeed Oficial con AgentEventChip) */}
      {(activeSubTab === "resumen" || activeSubTab === "actividad") && (
        <div className="space-y-compact pt-compact">
          <div className="flex items-center justify-between pb-compact border-b border-border">
            <div>
              <h3 className="text-section-title font-bold text-primary">
                Actividad del agente en vivo
              </h3>
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
                  <span className="text-caption font-mono text-muted whitespace-nowrap w-12">
                    {evt.time}
                  </span>
                  <AgentEventChip
                    action={evt.action}
                    reference={evt.reference}
                    timeAgo={evt.timeAgo}
                  />
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted" />
              </div>
            ))}
          </Panel>
        </div>
      )}
    </div>
  );
};
