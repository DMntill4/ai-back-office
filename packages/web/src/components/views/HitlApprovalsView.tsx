import React, { useState, useMemo } from "react";
import { PageHeader } from "../ui/PageHeader";
import { SegmentedTabs, TabItem } from "../ui/SegmentedTabs";
import { StatusIndicator, OperationalStatus } from "../ui/StatusIndicator";
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";
import { ReasoningStepList, ReasoningStep } from "../ui/ReasoningStepList";
import { SimulationSlider } from "../ui/SimulationSlider";
import {
  Search,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  ShieldCheck,
} from "lucide-react";
import { HitlDecision } from "../../types/workflow";

interface EnrichedProposal {
  id: string;
  orderNumber: string;
  title: string;
  sku: string;
  quantity: number;
  unitPriceCop: number;
  totalCostCop: number;
  amountFormatted: string;
  supplier: string;
  leadTime: string;
  policyTrigger: string;
  policyCode: string;
  justification: string;
  opportunityCost: string;
  hmacSignature: string;
  status: "pendiente" | "aprobado" | "rechazado";
  reasoningSteps: ReasoningStep[];
}

const INITIAL_PROPOSALS: EnrichedProposal[] = [
  {
    id: "DEC-2026-0041",
    orderNumber: "PO-24A190",
    title: "50× Sierra Circular DeWalt 7-1/4' 1800W",
    sku: "SKU-DW-714",
    quantity: 50,
    unitPriceCop: 145000,
    totalCostCop: 7250000,
    amountFormatted: "$7.250.000 COP",
    supplier: "DeWalt Colombia (Mayorista Homologado)",
    leadTime: "2 días hábiles",
    policyTrigger: "Monto total excede el umbral autónomo de $5.000.000 COP",
    policyCode: "POL-COMP-01",
    justification:
      "El punto de reorden en Bucaramanga y Bogotá se alcanzó simultáneamente tras un incremento de demanda del 28% por proyectos de infraestructura vial.",
    opportunityCost:
      "Se obtuvo un 8% de descuento por volumen consolidado, ahorrando $1.450.000 COP frente a compras fraccionadas.",
    hmacSignature:
      "9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f",
    status: "pendiente",
    reasoningSteps: [
      {
        id: "step-1",
        label: "Detección de necesidad por consumo acelerado",
        description: "Existencias cayeron a 4 unidades (cobertura < 48 horas en obra).",
        status: "completed",
        timestamp: "08:14",
      },
      {
        id: "step-2",
        label: "Comparación de proveedores homologados",
        description: "DeWalt Colombia ofreció menor tiempo de entrega y mejor tarifa.",
        status: "completed",
        timestamp: "08:18",
      },
      {
        id: "step-3",
        label: "Aplicación de política de gobernanza POL-COMP-01",
        description: "La orden supera $5.000.000 COP y se retiene para firma humana.",
        status: "in_progress",
        timestamp: "08:22",
      },
    ],
  },
  {
    id: "DEC-2026-0042",
    orderNumber: "PO-24A192",
    title: "1.200× Pernos Grado 8 Alta Resistencia 1/2' x 3'",
    sku: "SKU-PRN-083",
    quantity: 1200,
    unitPriceCop: 2800,
    totalCostCop: 3360000,
    amountFormatted: "$3.360.000 COP",
    supplier: "Mundial de Tornillos S.A.S.",
    leadTime: "3 días hábiles",
    policyTrigger: "Suministro crítico para obras del Anillo Vial Metropolitano",
    policyCode: "POL-STK-04",
    justification:
      "Despacho masivo a obra redujo existencias por debajo del umbral de seguridad en CD Bucaramanga.",
    opportunityCost:
      "Garantía de precio congelado por 60 días pactada con el proveedor habitual.",
    hmacSignature:
      "8f7e6d5c4b3a291807162534435261708f7e6d5c4b3a29180716253443526170",
    status: "pendiente",
    reasoningSteps: [
      {
        id: "step-1",
        label: "Consumo proyectado en Bodega Bucaramanga",
        description: "Entrega masiva para consorcio vial.",
        status: "completed",
        timestamp: "07:45",
      },
      {
        id: "step-2",
        label: "Cotización de lote con proveedor habitual",
        description: "Tarifa pactada de $2.800 COP por unidad.",
        status: "completed",
        timestamp: "07:50",
      },
      {
        id: "step-3",
        label: "Retención para autorización ejecutiva",
        description: "Consolidación de lote para despacho de obra.",
        status: "in_progress",
        timestamp: "07:55",
      },
    ],
  },
  {
    id: "DEC-2026-0043",
    orderNumber: "PO-24A188",
    title: "80× Disco de Corte Diamantado 4-1/2'",
    sku: "SKU-DSC-412",
    quantity: 80,
    unitPriceCop: 22000,
    totalCostCop: 1760000,
    amountFormatted: "$1.760.000 COP",
    supplier: "Bosch Herramientas Colombia",
    leadTime: "1 día hábil",
    policyTrigger: "Aprobada por el director operativo",
    policyCode: "POL-COMP-02",
    justification:
      "Reabastecimiento preventivo autorizado para Bodega Fontibón.",
    opportunityCost: "Descuento por pronto pago del 5% aplicado.",
    hmacSignature:
      "7e6d5c4b3a291807162534435261708f7e6d5c4b3a291807162534435261708f",
    status: "aprobado",
    reasoningSteps: [
      {
        id: "step-1",
        label: "Detección de rotación alta en Fontibón",
        description: "Demanda sostenida de 12 unidades por día.",
        status: "completed",
        timestamp: "Ayer, 16:30",
      },
      {
        id: "step-2",
        label: "Autorización ejecutiva emitida",
        description: "Orden firmada y transmitida al ERP.",
        status: "completed",
        timestamp: "Ayer, 16:45",
      },
    ],
  },
];

export interface HitlApprovalsViewProps {
  decisions?: HitlDecision[];
  onApprove?: (decisionId: string) => void;
  onReject?: (decisionId: string) => void;
  onSimulateNew?: () => void;
  onNavigateTo?: (tabId: string) => void;
}

export const HitlApprovalsView: React.FC<HitlApprovalsViewProps> = ({
  onApprove,
  onReject,
}) => {
  const [proposals, setProposals] = useState<EnrichedProposal[]>(INITIAL_PROPOSALS);
  const [selectedId, setSelectedId] = useState<string>("DEC-2026-0041");
  const [activeSubTab, setActiveSubTab] = useState<string>("pendientes");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);
  const [copiedHmac, setCopiedHmac] = useState<boolean>(false);

  // Subpestañas oficiales de Aprobaciones según Mint-DESIGN.md
  const pendingCount = proposals.filter((p) => p.status === "pendiente").length;
  const subTabs: TabItem[] = [
    { id: "pendientes", label: "Pendientes", badge: pendingCount },
    { id: "historial", label: "Historial de aprobaciones" },
  ];

  // Filtrado de propuestas
  const filteredProposals = useMemo(() => {
    return proposals.filter((item) => {
      const matchesTab =
        activeSubTab === "pendientes"
          ? item.status === "pendiente"
          : item.status !== "pendiente";

      const query = searchQuery.toLowerCase();
      const matchesQuery =
        !searchQuery ||
        item.orderNumber.toLowerCase().includes(query) ||
        item.title.toLowerCase().includes(query) ||
        item.supplier.toLowerCase().includes(query);

      return matchesTab && matchesQuery;
    });
  }, [proposals, activeSubTab, searchQuery]);

  const selectedProposal =
    proposals.find((p) => p.id === selectedId) ||
    filteredProposals[0] ||
    proposals[0];

  // Simulación interactiva de cantidad
  const [simulatedQuantity, setSimulatedQuantity] = useState<number>(
    selectedProposal?.quantity || 50
  );

  const handleApprove = (id: string) => {
    setProposals((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "aprobado" } : item))
    );
    if (onApprove) onApprove(id);
  };

  const handleReject = (id: string) => {
    setProposals((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "rechazado" } : item))
    );
    if (onReject) onReject(id);
  };

  const handleCopyHmac = () => {
    if (selectedProposal) {
      navigator.clipboard.writeText(selectedProposal.hmacSignature);
      setCopiedHmac(true);
      setTimeout(() => setCopiedHmac(false), 2000);
    }
  };

  const getStatusMapping = (
    status: "pendiente" | "aprobado" | "rechazado"
  ): { status: OperationalStatus; label: string } => {
    switch (status) {
      case "pendiente":
        return { status: "pending", label: "Pendiente" };
      case "aprobado":
        return { status: "ok", label: "Aprobada" };
      case "rechazado":
        return { status: "error", label: "Rechazada" };
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-canvas text-primary font-sans overflow-hidden">
      {/* 1. Header con Subpestañas */}
      <div className="p-group pb-0">
        <PageHeader
          title="Aprobaciones"
          description="Supervisión ejecutiva y firma de compras que superan el umbral autónomo."
          actions={
            <StatusIndicator
              status="pending"
              label={`${pendingCount} pendientes de firma`}
            />
          }
          filterControl={
            <SegmentedTabs
              tabs={subTabs}
              activeTab={activeSubTab}
              onChange={setActiveSubTab}
            />
          }
        />
      </div>

      {/* 2. Layout de Dos Paneles: Lista Izquierda (360px) + Detalle Derecho */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 p-group pt-compact gap-compact">
        {/* PANEL IZQUIERDO (360px según Mint-DESIGN.md) */}
        <aside className="w-full lg:w-[360px] h-full bg-panel rounded-container border border-border flex flex-col shrink-0 overflow-hidden">
          {/* Buscador de Órdenes */}
          <div className="p-compact border-b border-border">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrar por orden, SKU o proveedor..."
                className="w-full pl-8 pr-3 py-1.5 rounded-control bg-raised border border-border focus:border-brand text-caption text-primary placeholder:text-muted focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Lista Scrollable de Decisiones */}
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {filteredProposals.length === 0 ? (
              <div className="p-group text-center text-caption text-muted">
                No hay compras en esta categoría.
              </div>
            ) : (
              filteredProposals.map((item) => {
                const isSelected = item.id === selectedProposal.id;
                const statusMeta = getStatusMapping(item.status);

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedId(item.id);
                      setSimulatedQuantity(item.quantity);
                    }}
                    className={`p-compact transition-colors cursor-pointer border-l-[3px] ${
                      isSelected
                        ? "bg-raised border-l-brand"
                        : "hover:bg-raised/40 border-l-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-compact mb-hairline">
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        <span className="font-mono text-caption text-primary font-medium whitespace-nowrap">
                          {item.orderNumber}
                        </span>
                        <span className="text-muted">·</span>
                        <span className="font-mono text-caption text-muted whitespace-nowrap">
                          {item.id}
                        </span>
                      </div>
                      <StatusIndicator
                        status={statusMeta.status}
                        label={statusMeta.label}
                      />
                    </div>

                    <h4 className="text-body font-medium text-primary line-clamp-1 mt-hairline">
                      {item.title}
                    </h4>

                    <div className="flex items-center justify-between mt-compact pt-compact border-t border-border text-caption text-secondary">
                      <span className="truncate pr-compact">{item.supplier}</span>
                      <span className="font-sans font-bold text-primary tabular-nums shrink-0">
                        {item.amountFormatted}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* PANEL DERECHO: Detalle, Razonamiento, Simulación y Firma */}
        {selectedProposal ? (
          <main className="flex-1 h-full bg-panel rounded-container border border-border overflow-y-auto p-group space-y-group">
            {/* Cabecera del Detalle: Monto, Proveedor y Acciones Siempre Visibles */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-group pb-compact border-b border-border">
              <div className="space-y-hairline flex-1 min-w-0">
                <div className="flex items-center gap-compact flex-wrap text-caption text-secondary">
                  <span className="font-mono font-medium text-primary">
                    {selectedProposal.orderNumber}
                  </span>
                  <span className="text-muted">·</span>
                  <span className="font-mono text-muted">{selectedProposal.id}</span>
                  <span className="text-muted">·</span>
                  <span>Tiempo de entrega: {selectedProposal.leadTime}</span>
                </div>
                <h2 className="text-page-title font-bold text-primary tracking-tight">
                  {selectedProposal.title}
                </h2>
                <div className="flex flex-wrap items-center gap-x-group gap-y-hairline pt-hairline text-body">
                  <p className="text-secondary">
                    Proveedor:{" "}
                    <strong className="text-primary font-medium">
                      {selectedProposal.supplier}
                    </strong>
                  </p>
                  <span className="text-muted hidden sm:inline">·</span>
                  <p className="text-secondary">
                    Monto total:{" "}
                    <strong className="text-primary font-bold tabular-nums">
                      {selectedProposal.amountFormatted}
                    </strong>
                  </p>
                </div>
              </div>

              {/* Botones de Acción: Aprobar (Píldora Cálida con Flecha) y Rechazar */}
              {selectedProposal.status === "pendiente" ? (
                <div className="flex items-center gap-compact shrink-0 pt-hairline">
                  <Button
                    variant="ghost"
                    onClick={() => handleReject(selectedProposal.id)}
                  >
                    Rechazar
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => handleApprove(selectedProposal.id)}
                    showArrow={true}
                  >
                    Aprobar compra
                  </Button>
                </div>
              ) : (
                <div className="shrink-0 pt-hairline">
                  <StatusIndicator
                    status={getStatusMapping(selectedProposal.status).status}
                    label={getStatusMapping(selectedProposal.status).label}
                  />
                </div>
              )}
            </div>

            {/* Justificación del Agente Autónomo */}
            <Panel className="space-y-compact bg-raised/50">
              <div className="flex items-center gap-compact text-body font-semibold text-primary">
                <Sparkles className="w-4 h-4 text-brand" />
                <span>Justificación del agente</span>
              </div>
              <p className="text-body text-secondary leading-relaxed">
                {selectedProposal.justification}
              </p>
              <div className="p-compact rounded-control bg-panel border border-border text-caption text-secondary">
                <span className="text-brand font-medium block">
                  Costo de oportunidad evaluado:
                </span>
                <p className="mt-hairline">{selectedProposal.opportunityCost}</p>
              </div>
            </Panel>

            {/* Razonamiento Paso a Paso (ReasoningStepList) */}
            <div className="space-y-compact">
              <h3 className="text-section-title font-bold text-primary">
                Razonamiento del agente
              </h3>
              <ReasoningStepList steps={selectedProposal.reasoningSteps} />
            </div>

            {/* Deslizador de Simulación Interactivo (SimulationSlider) */}
            <div className="space-y-compact">
              <h3 className="text-section-title font-bold text-primary">
                Simulación de escenario
              </h3>
              <SimulationSlider
                label="Ajustar cantidad a ordenar"
                value={simulatedQuantity}
                min={10}
                max={150}
                step={5}
                unit="unidades"
                unitPriceCop={selectedProposal.unitPriceCop}
                dailyConsumption={1.8}
                onChange={setSimulatedQuantity}
              />
            </div>

            {/* Detalle Técnico Oculto tras 'Ver detalle técnico' */}
            <div className="pt-compact border-t border-border">
              <button
                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                className="flex items-center gap-compact text-caption font-medium text-muted hover:text-primary transition-colors cursor-pointer"
              >
                {showTechnicalDetails ? (
                  <ChevronDown className="w-3.5 h-3.5 text-muted" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-muted" />
                )}
                <span>Ver detalle técnico (Firma criptográfica y directivas)</span>
              </button>

              {showTechnicalDetails && (
                <div className="mt-compact p-compact rounded-control bg-canvas border border-border space-y-compact text-caption">
                  <div>
                    <span className="text-muted block">Directiva de Gobernanza:</span>
                    <span className="font-mono text-primary">
                      {selectedProposal.policyCode} — {selectedProposal.policyTrigger}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Firma Criptográfica HMAC-SHA256:</span>
                      <button
                        onClick={handleCopyHmac}
                        className="flex items-center gap-1 text-caption text-brand hover:underline cursor-pointer"
                      >
                        {copiedHmac ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Copiada</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
                    <code className="block mt-hairline font-mono text-secondary break-all bg-panel p-compact rounded-control border border-border">
                      {selectedProposal.hmacSignature}
                    </code>
                  </div>
                </div>
              )}
            </div>
          </main>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-panel rounded-container border border-border p-group text-secondary text-body">
            Selecciona una orden de compra para revisar su detalle.
          </div>
        )}
      </div>
    </div>
  );
};
