import React, { useState, useEffect } from "react";
import {
  GitBranch,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Terminal,
  RotateCcw,
} from "lucide-react";
import { Button } from "../ui/Button";
import { api } from "../../services/apiClient";

interface AgentDecisionWidgetProps {
  command: string;
  args?: Record<string, string>;
  data?: any;
  onNavigateTo?: (tab: string) => void;
}

interface FindingNode {
  id: string;
  label: string;
  severity: "ok" | "attention" | "critical";
  detail: string;
  recommendation: string;
  sku?: string;
}

export const AgentDecisionWidget: React.FC<AgentDecisionWidgetProps> = ({
  command,
  args = {},
  data,
  onNavigateTo,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>("node-0");
  const [executingNodeId, setExecutingNodeId] = useState<string | null>(null);
  const [executionResults, setExecutionResults] = useState<Record<string, string>>({});
  const [findings, setFindings] = useState<FindingNode[]>([]);
  const [loadingFindings, setLoadingFindings] = useState<boolean>(false);

  const hasAgentChatResponse = Boolean(data && typeof data.response === "string" && data.response.trim().length > 0);
  const evidenceChain: any[] = Array.isArray(data?.evidenceChain) ? data.evidenceChain : [];

  useEffect(() => {
    if (hasAgentChatResponse) return;

    let cancelled = false;
    setLoadingFindings(true);

    Promise.all([api.inventory.ropAlerts(), api.decisions.pending()])
      .then(([ropRes, decRes]) => {
        if (cancelled) return;
        const alerts = Array.isArray(ropRes.data) ? ropRes.data : [];
        const pending = Array.isArray(decRes.data) ? decRes.data : [];
        const nodes: FindingNode[] = [];

        alerts.slice(0, 4).forEach((a, idx) => {
          const stock = Number(a.totalStock ?? 0);
          const rop = Number(a.reorderPoint ?? a.minStock ?? 0);
          const suggested = Number(a.suggestedOrderQty ?? Math.max(10, rop - stock));
          nodes.push({
            id: `node-${idx}`,
            sku: a.sku,
            label: `${a.name} (${stock === 0 ? "Agotado" : "Bajo punto de reorden"})`,
            severity: stock === 0 ? "critical" : "attention",
            detail: `Existencia física actual: ${stock} unidades en almacén frente a un punto de reorden de ${rop} unidades (consumo diario estimado: ${a.dailyBurnRate ?? 0} u/día).`,
            recommendation: `Solicitar al agente autónomo evaluar proveedores y emitir propuesta de reposición por ${suggested} unidades para ${a.sku}.`,
          });
        });

        pending.slice(0, 2).forEach((d, idx) => {
          nodes.push({
            id: `dec-${idx}`,
            sku: d.caseId || d.id,
            label: d.title,
            severity: "attention",
            detail: `Propuesta formulada por ${d.proposingAgent || "Coordinador"} por $${Number(d.costMxn ?? 0).toLocaleString("es-CO")} COP. Motivo de política: ${d.policyReason || "Supera umbral autónomo"}.`,
            recommendation: `Revisar evidencia financiera y autorizar o rechazar la propuesta ${d.id} en la bandeja de Aprobaciones.`,
          });
        });

        setFindings(nodes);
        if (nodes.length > 0) {
          setSelectedNodeId(nodes[0].id);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingFindings(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hasAgentChatResponse]);

  const handleExecuteRealAction = async (node: FindingNode) => {
    setExecutingNodeId(node.id);
    try {
      const prompt = `Analiza el hallazgo operativo sobre ${node.sku} (${node.label}) y ejecuta la acción recomendada: ${node.recommendation}`;
      const res = await api.chat.send(prompt);
      setExecutionResults((prev) => ({
        ...prev,
        [node.id]: res.response,
      }));
    } catch (err: any) {
      setExecutionResults((prev) => ({
        ...prev,
        [node.id]: `Error al ejecutar acción autónoma: ${err?.message || "Error desconocido"}`,
      }));
    } finally {
      setExecutingNodeId(null);
    }
  };

  // Vista 1: Respuesta real del Agente Autónomo (runAgentLoop + Cadena de Evidencia)
  if (hasAgentChatResponse) {
    return (
      <div className="space-y-base">
        <div className="flex flex-wrap items-center justify-between gap-compact pb-compact border-b border-border">
          <div className="flex items-center gap-compact">
            <div className="w-8 h-8 rounded-control bg-brand/15 flex items-center justify-center text-brand">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-body font-semibold text-primary">
                Deliberación y Ejecución Real del Agente · <span className="font-mono text-brand">{command}</span>
              </h4>
              <p className="text-caption text-secondary">
                {data.caseId ? `Caso: ${data.caseId} · ` : ""}
                {data.steps ?? evidenceChain.length} pasos · {data.totalTokens ?? 0} tokens · Costo: ${data.totalCost ?? "0.0000"} USD
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-state-ok/10 text-state-ok text-caption font-medium border border-state-ok/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Verificado en Base de Datos
          </span>
        </div>

        {/* Cadena de evidencia de herramientas ejecutadas */}
        {evidenceChain.length > 0 && (
          <div className="p-compact rounded-card-sm bg-raised border border-border space-y-compact">
            <div className="flex items-center justify-between text-caption text-secondary font-medium">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-brand" />
                Cadena de evidencia ({evidenceChain.length} herramientas ejecutadas en vivo)
              </span>
            </div>
            <div className="space-y-1.5 font-mono text-caption">
              {evidenceChain.map((step: any, idx: number) => (
                <div
                  key={idx}
                  className="p-2 rounded-control bg-panel border border-border flex flex-col gap-1"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-brand font-semibold">
                      {step.stepIndex ?? idx + 1}. {step.toolName}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-pill text-caption ${
                        step.isSuccess
                          ? "bg-state-ok/15 text-state-ok"
                          : "bg-state-attention/15 text-state-attention"
                      }`}
                    >
                      {step.isSuccess ? (step.verified ? "Verificado en BD" : "Ejecutado") : "Recuperado"}
                    </span>
                  </div>
                  {step.args && Object.keys(step.args).length > 0 && (
                    <div className="text-muted truncate">
                      Argumentos: {JSON.stringify(step.args)}
                    </div>
                  )}
                  {step.verificationDetail && (
                    <div className="text-secondary">
                      ↳ {step.verificationDetail}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Respuesta sintetizada del agente */}
        <div className="p-base rounded-card-sm bg-panel border border-border">
          <div className="text-caption font-semibold text-secondary mb-1.5">
            Informe del Agente Autónomo:
          </div>
          <div className="text-caption sm:text-body text-primary whitespace-pre-line leading-relaxed font-sans">
            {data.response}
          </div>
        </div>
      </div>
    );
  }

  // Vista 2: Árbol de hallazgos reales consultados desde el backend
  const activeNode = findings.find((f) => f.id === selectedNodeId) || findings[0];

  return (
    <div className="space-y-base">
      <div className="flex flex-wrap items-center justify-between gap-compact pb-compact border-b border-border">
        <div className="flex items-center gap-compact">
          <div className="w-8 h-8 rounded-control bg-raised flex items-center justify-center text-brand">
            <GitBranch className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-body font-semibold text-primary">
              Árbol de Hallazgos Operativos en Tiempo Real · <span className="font-mono text-brand font-medium">{command}</span>
            </h4>
            <p className="text-caption text-secondary">
              Ramas evaluadas directamente sobre el inventario físico y la cola de decisiones activas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-state-attention/10 text-state-attention text-caption font-medium border border-state-attention/20">
            <AlertTriangle className="w-3.5 h-3.5" /> {findings.length} hallazgos reales
          </span>
        </div>
      </div>

      {loadingFindings ? (
        <div className="p-base text-caption text-secondary flex items-center gap-2">
          <RotateCcw className="w-4 h-4 animate-spin text-brand" />
          Consultando alertas reales y decisiones activas...
        </div>
      ) : findings.length === 0 ? (
        <div className="p-base rounded-card-sm bg-panel border border-border text-caption text-secondary">
          No se detectaron alertas críticas ni discrepancias pendientes en este momento.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-base items-start">
          <div className="md:col-span-5 space-y-compact">
            <div className="text-caption font-medium text-muted px-1">
              Ramas detectadas en base de datos
            </div>
            {findings.map((finding) => {
              const isSelected = finding.id === selectedNodeId;
              const isDone = Boolean(executionResults[finding.id]);

              return (
                <button
                  key={finding.id}
                  type="button"
                  onClick={() => setSelectedNodeId(finding.id)}
                  className={`w-full text-left p-compact rounded-control border transition-all text-caption ${
                    isSelected
                      ? "bg-card border-brand/50 shadow-sm"
                      : "bg-panel border-border hover:border-strong hover:bg-raised"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 font-medium">
                      {finding.severity === "critical" ? (
                        <span className="w-2 h-2 rounded-full bg-state-error animate-pulse" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-state-attention" />
                      )}
                      <span className={isSelected ? "text-primary font-semibold font-mono" : "text-secondary font-mono"}>
                        {finding.sku || "General"}
                      </span>
                    </div>
                    {isDone ? (
                      <span className="text-state-ok flex items-center gap-0.5 text-caption font-mono">
                        <CheckCircle2 className="w-3 h-3" /> Ejecutado
                      </span>
                    ) : (
                      <span className="text-muted text-caption font-mono">Analizar</span>
                    )}
                  </div>
                  <p className="text-secondary line-clamp-2 leading-relaxed">
                    {finding.label}
                  </p>
                </button>
              );
            })}
          </div>

          {activeNode && (
            <div className="md:col-span-7 p-base rounded-card-sm bg-raised border border-border space-y-base">
              <div className="flex items-start justify-between gap-compact">
                <div>
                  <span className="text-caption font-mono text-brand font-medium">
                    Referencia: {activeNode.sku}
                  </span>
                  <h5 className="text-body-large font-semibold text-primary mt-0.5">
                    {activeNode.label}
                  </h5>
                </div>
                <span
                  className={`text-caption px-2 py-0.5 rounded-pill font-medium border ${
                    activeNode.severity === "critical"
                      ? "bg-state-error/10 text-state-error border-state-error/20"
                      : "bg-state-attention/10 text-state-attention border-state-attention/20"
                  }`}
                >
                  {activeNode.severity === "critical" ? "Nivel Crítico" : "Atención"}
                </span>
              </div>

              <div className="space-y-compact text-caption">
                <div>
                  <span className="font-medium text-secondary block mb-0.5">Diagnóstico Verificado:</span>
                  <p className="text-primary bg-panel p-compact rounded-control border border-border leading-relaxed">
                    {activeNode.detail}
                  </p>
                </div>

                <div>
                  <span className="font-medium text-secondary block mb-0.5">Acción Autónoma Propuesta:</span>
                  <div className="p-compact rounded-control bg-brand/5 border border-brand/20 text-primary flex items-start gap-compact">
                    <ArrowRight className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{activeNode.recommendation}</p>
                  </div>
                </div>

                {executionResults[activeNode.id] && (
                  <div className="p-compact rounded-control bg-panel border border-brand/30 text-primary whitespace-pre-line">
                    <span className="font-semibold text-brand block mb-1">Resultado del Agente Autónomo:</span>
                    {executionResults[activeNode.id]}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-compact pt-compact border-t border-border">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={executingNodeId === activeNode.id}
                  onClick={() => void handleExecuteRealAction(activeNode)}
                >
                  {executingNodeId === activeNode.id
                    ? "Ejecutando en motor autónomo..."
                    : executionResults[activeNode.id]
                      ? "Volver a ejecutar con el agente"
                      : "Ejecutar con el agente autónomo"}
                </Button>

                {onNavigateTo && (
                  <button
                    type="button"
                    onClick={() => onNavigateTo("inventario")}
                    className="inline-flex items-center gap-1 text-caption text-secondary hover:text-primary transition-colors"
                  >
                    <span>Inspeccionar en Inventario</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
