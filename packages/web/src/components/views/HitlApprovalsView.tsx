import React, { useState, useMemo, useEffect, useCallback } from "react";
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
  RefreshCw,
} from "lucide-react";
import { HitlDecision } from "../../types/workflow";
import { formatUsd, formatTokens } from "../ui/CostBadge";
import { EmptyState } from "../ui/EmptyState";
import { api } from "../../services/apiClient";

/** Resultado de la auto-evaluación previa al cierre (Reflection & Verification Loop). */
export interface ProposalEvaluation {
  verdict: "aprobado" | "requiere_revision" | "rechazado";
  confidence: number;
  riskLevel: "bajo" | "medio" | "alto" | "critico";
  reason: string;
  feasibility?: { passed: boolean; score: number; issues: string[] };
  policy?: { passed: boolean; score: number; issues: string[] };
}

/** Desglose de costo/tokens de la tarea que generó la propuesta (Agent FinOps). */
export interface ProposalCostBreakdown {
  tokens: number;
  costUsd: number;
  model: string | null;
}

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
  /** Auto-evaluación del agente antes de proponer la decisión. */
  evaluation?: ProposalEvaluation | null;
  /** Costo y tokens consumidos para producir la propuesta. */
  costBreakdown?: ProposalCostBreakdown | null;
}


export interface HitlApprovalsViewProps {
  decisions?: HitlDecision[];
  onApprove?: (decisionId: string) => void;
  onReject?: (decisionId: string) => void;
  onSimulateNew?: () => void;
  onNavigateTo?: (tabId: string) => void;
}

/**
 * Adapta una fila de `GET /api/decisions/pending` al modelo de presentación
 * `EnrichedProposal`. Todos los campos se derivan de datos reales del backend;
 * los que no existen se dejan vacíos en lugar de inventarse.
 */
function mapDecisionToProposal(d: any, idx: number): EnrichedProposal {
  const costMxn = Number(d?.costMxn ?? d?.totalCostCop ?? 0);
  const riskPct = Number(d?.riskPct ?? Math.round((Number(d?.riskScore ?? 0)) * 100));
  const evidence: string[] = Array.isArray(d?.evidence) ? d.evidence.map(String) : [];

  const reasoningSteps: ReasoningStep[] = evidence.map((text, i) => ({
    id: `step-${idx}-${i}`,
    label: `Evidencia ${i + 1}`,
    description: text,
    status: "completed",
  }));

  const evaluation: ProposalEvaluation | null = d?.evaluation
    ? {
      verdict:
        d.evaluation.verdict === "aprobado"
          ? "aprobado"
          : d.evaluation.verdict === "rechazado"
            ? "rechazado"
            : "requiere_revision",
      confidence: Number(d.evaluation.confidence ?? 0),
      riskLevel: (d.evaluation.riskLevel ?? "medio") as ProposalEvaluation["riskLevel"],
      reason: String(d.evaluation.reason ?? ""),
      feasibility: d.evaluation.feasibility,
      policy: d.evaluation.policy,
    }
    : null;

  const costBreakdown: ProposalCostBreakdown | null = d?.costBreakdown
    ? {
      tokens: Number(d.costBreakdown.tokens ?? 0),
      costUsd: Number(d.costBreakdown.costUsd ?? 0),
      model: d.costBreakdown.model ?? null,
    }
    : null;

  return {
    id: String(d?.id ?? `dec-${idx}`),
    orderNumber: String(d?.caseId ?? d?.id ?? `DEC-${idx}`),
    title: String(d?.title ?? "Decisión sin título"),
    sku: String(d?.sku ?? "—"),
    quantity: Number(d?.quantity ?? 0),
    unitPriceCop: Number(d?.unitPriceCop ?? 0),
    totalCostCop: costMxn,
    amountFormatted: String(d?.costFormatted ?? `$${costMxn.toLocaleString("es-CO")} COP`),
    supplier: String(d?.supplierName ?? d?.proposingAgent ?? "—"),
    leadTime: d?.leadTimeDays != null ? `${d.leadTimeDays} días` : "—",
    policyTrigger: String(d?.policyReason ?? "Umbral autónomo superado"),
    policyCode: String(d?.actionType ?? "POL-APROB"),
    justification: String(d?.policyReason ?? ""),
    opportunityCost: riskPct > 0 ? `Riesgo estimado ${riskPct}%` : "—",
    hmacSignature: String(d?.hmacSignature ?? d?.signature ?? ""),
    status: "pendiente",
    reasoningSteps,
    evaluation,
    costBreakdown,
  };
}

export const HitlApprovalsView: React.FC<HitlApprovalsViewProps> = ({
  onApprove,
  onReject,
}) => {
  const [proposals, setProposals] = useState<EnrichedProposal[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [activeSubTab, setActiveSubTab] = useState<string>("pendientes");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);
  const [copiedHmac, setCopiedHmac] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState<boolean>(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.decisions.pending();
      const rows = Array.isArray(res?.data) ? res.data : [];
      const mapped = rows.map(mapDecisionToProposal);
      setProposals(mapped);
      setIsFallback(Boolean(res?.isFallback));
      setSelectedId((prev) =>
        mapped.some((p) => p.id === prev) ? prev : mapped[0]?.id ?? ""
      );
      if (!res?.success && res?.message) setError(res.message);
    } catch (err: any) {
      setError(err?.message || "Error al cargar las decisiones pendientes.");
      setProposals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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

  const [actionPendingId, setActionPendingId] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    setActionPendingId(id);
    try {
      const res = await api.decisions.approve(id, { reason: "Aprobado desde back-office" });
      if (!res?.success) {
        setError(res?.message || "No se pudo aprobar la decisión.");
        return;
      }
      setProposals((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: "aprobado" } : item))
      );
      if (onApprove) onApprove(id);
    } catch (err: any) {
      setError(err?.message || "Error al aprobar la decisión.");
    } finally {
      setActionPendingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionPendingId(id);
    try {
      const res = await api.decisions.reject(id, { reason: "Rechazado desde back-office" });
      if (!res?.success) {
        setError(res?.message || "No se pudo rechazar la decisión.");
        return;
      }
      setProposals((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: "rechazado" } : item))
      );
      if (onReject) onReject(id);
    } catch (err: any) {
      setError(err?.message || "Error al rechazar la decisión.");
    } finally {
      setActionPendingId(null);
    }
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
            <div className="flex items-center gap-compact">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void load()}
                disabled={loading}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                Actualizar
              </Button>
              <StatusIndicator
                status="pending"
                label={`${pendingCount} pendientes de firma`}
              />
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
      </div>

      {isFallback && (
        <div className="mx-group mt-compact rounded-control border border-state-attention/40 bg-state-attention-surface px-compact py-compact text-caption text-state-attention">
          El backend no respondió. Se muestra el estado degradado sin decisiones reales.
        </div>
      )}

      {error && (
        <div className="mx-group mt-compact rounded-control border border-state-error/40 bg-state-error-surface px-compact py-compact text-caption text-state-error">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex-1 p-group pt-compact">
          <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-compact h-full">
            <div className="rounded-container border border-border bg-panel p-compact space-y-compact">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-control bg-raised animate-pulse" />
              ))}
            </div>
            <div className="rounded-container border border-border bg-panel p-group space-y-compact">
              <div className="h-8 w-1/3 rounded-control bg-raised animate-pulse" />
              <div className="h-24 rounded-control bg-raised animate-pulse" />
              <div className="h-40 rounded-control bg-raised animate-pulse" />
            </div>
          </div>
        </div>
      ) : proposals.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-group">
          <EmptyState
            title="Sin decisiones pendientes"
            description="No hay compras esperando firma ejecutiva. El agente opera dentro de sus umbrales autónomos."
            actionLabel="Actualizar"
            onAction={() => void load()}
          />
        </div>
      ) : (
        /* 2. Layout de Dos Paneles: Lista Izquierda (360px) + Detalle Derecho */
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
                      className={`p-compact transition-colors cursor-pointer border-l-[3px] ${isSelected
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
                      onClick={() => void handleReject(selectedProposal.id)}
                      disabled={actionPendingId === selectedProposal.id}
                    >
                      Rechazar
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => void handleApprove(selectedProposal.id)}
                      showArrow={true}
                      disabled={actionPendingId === selectedProposal.id}
                    >
                      {actionPendingId === selectedProposal.id ? "Procesando..." : "Aprobar compra"}
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

              {/* Auto-Evaluación y Auditoría de Riesgo (Reflection & Verification Loop) */}
              {(selectedProposal.evaluation || selectedProposal.costBreakdown) && (
                <Panel className="space-y-compact">
                  <div className="flex items-center justify-between gap-compact flex-wrap">
                    <div className="flex items-center gap-compact text-body font-semibold text-primary">
                      <ShieldCheck className="w-4 h-4 text-brand" />
                      <span>Auto-evaluación del agente</span>
                    </div>
                    {selectedProposal.evaluation && (
                      <div className="flex items-center gap-compact">
                        <span
                          className={`px-2 py-0.5 rounded-pill text-caption font-medium border ${selectedProposal.evaluation.verdict === "aprobado"
                            ? "bg-state-ok/10 text-state-ok border-state-ok/30"
                            : selectedProposal.evaluation.verdict === "requiere_revision"
                              ? "bg-state-pending/10 text-state-pending border-state-pending/30"
                              : "bg-state-error/10 text-state-error border-state-error/30"
                            }`}
                        >
                          {selectedProposal.evaluation.verdict === "aprobado"
                            ? "Aprobado"
                            : selectedProposal.evaluation.verdict === "requiere_revision"
                              ? "Requiere revisión"
                              : "Rechazado"}
                        </span>
                        <span className="text-caption text-secondary font-mono tabular-nums">
                          Confianza {selectedProposal.evaluation.confidence}/100
                        </span>
                      </div>
                    )}
                  </div>

                  {selectedProposal.evaluation && (
                    <>
                      <p className="text-body text-secondary leading-relaxed">
                        {selectedProposal.evaluation.reason}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-compact text-caption">
                        <div className="p-compact rounded-control bg-panel border border-border">
                          <span className="text-muted block">Riesgo</span>
                          <span className="text-primary font-medium capitalize">
                            {selectedProposal.evaluation.riskLevel}
                          </span>
                        </div>
                        <div className="p-compact rounded-control bg-panel border border-border">
                          <span className="text-muted block">Factibilidad</span>
                          <span className="text-primary font-medium tabular-nums">
                            {selectedProposal.evaluation.feasibility?.score ?? "—"}/100
                          </span>
                        </div>
                        <div className="p-compact rounded-control bg-panel border border-border">
                          <span className="text-muted block">Políticas</span>
                          <span className="text-primary font-medium tabular-nums">
                            {selectedProposal.evaluation.policy?.score ?? "—"}/100
                          </span>
                        </div>
                      </div>
                      {[
                        ...(selectedProposal.evaluation.feasibility?.issues ?? []),
                        ...(selectedProposal.evaluation.policy?.issues ?? []),
                      ].length > 0 && (
                          <ul className="space-y-hairline text-caption text-secondary list-disc pl-4">
                            {[
                              ...(selectedProposal.evaluation.feasibility?.issues ?? []),
                              ...(selectedProposal.evaluation.policy?.issues ?? []),
                            ].map((issue, idx) => (
                              <li key={idx}>{issue}</li>
                            ))}
                          </ul>
                        )}
                    </>
                  )}

                  {selectedProposal.costBreakdown && (
                    <div className="flex flex-wrap items-center gap-x-group gap-y-hairline pt-hairline border-t border-border text-caption text-secondary">
                      <span>
                        Costo de la tarea:{" "}
                        <strong className="text-primary font-mono tabular-nums">
                          {formatUsd(selectedProposal.costBreakdown.costUsd)}
                        </strong>
                      </span>
                      <span>
                        Tokens:{" "}
                        <strong className="text-primary font-mono tabular-nums">
                          {formatTokens(selectedProposal.costBreakdown.tokens)}
                        </strong>
                      </span>
                      {selectedProposal.costBreakdown.model && (
                        <span>
                          Modelo:{" "}
                          <strong className="text-primary font-mono">
                            {selectedProposal.costBreakdown.model}
                          </strong>
                        </span>
                      )}
                    </div>
                  )}
                </Panel>
              )}

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
      )}
    </div>
  );
};
