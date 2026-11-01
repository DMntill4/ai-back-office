import React, { useState } from "react";
import { GitBranch, ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "../ui/Button";

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
  onNavigateTo,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>("node-1");
  const [appliedActions, setAppliedActions] = useState<Record<string, boolean>>({});

  const scope = args.scope || args.escenario || "all";

  // Nodos de auditoría contextual según el comando y alcance
  const findings: FindingNode[] = [
    {
      id: "node-1",
      label: "Discrepancia en stock físico vs ERP",
      severity: "critical",
      sku: "PROD-1004",
      detail: "Se detectaron 0 unidades físicas en Bodega Principal mientras el ERP registra 14 unidades reservadas.",
      recommendation: "Generar orden de compra de reposición urgente al proveedor primario y congelar pedidos salientes.",
    },
    {
      id: "node-2",
      label: "Punto de reorden alcanzado por consumo acelerado",
      severity: "attention",
      sku: "PROD-2031",
      detail: "La tasa de consumo aumentó un 42% en los últimos 7 días. El stock actual cubrirá solo 48 horas operativas.",
      recommendation: "Ajustar dinámicamente el ROP (Reorder Point) de 10 a 18 unidades con aprobación automática.",
    },
    {
      id: "node-3",
      label: "Ruta logística Cundinamarca con riesgo climático",
      severity: "attention",
      sku: "LOG-089",
      detail: "Alerta vial en corredor Bogotá-Villavicencio. Retraso estimado de 36 horas en entregas programadas.",
      recommendation: "Redireccionar despachos consolidados a través de la ruta alterna Boyacá sin sobrecosto de flete.",
    },
  ];

  const activeNode = findings.find((f) => f.id === selectedNodeId) || findings[0];

  const handleApplyAction = (nodeId: string) => {
    setAppliedActions((prev) => ({ ...prev, [nodeId]: true }));
  };

  return (
    <div className="space-y-base">
      {/* Encabezado del árbol de decisiones */}
      <div className="flex flex-wrap items-center justify-between gap-compact pb-compact border-b border-border">
        <div className="flex items-center gap-compact">
          <div className="w-8 h-8 rounded-control bg-raised flex items-center justify-center text-brand">
            <GitBranch className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-body font-semibold text-primary">
              Árbol de Decisión Autónoma · Alcance: <span className="font-mono text-brand font-medium">{scope}</span>
            </h4>
            <p className="text-caption text-secondary">
              3 ramas de análisis evaluadas por el agente supervisor con reglas de minimización de quiebre.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-state-attention/10 text-state-attention text-caption font-medium border border-state-attention/20">
            <AlertTriangle className="w-3.5 h-3.5" /> 1 Crítico · 2 En Observación
          </span>
        </div>
      </div>

      {/* Grid: Ramas de decisión a la izquierda, detalle interactivo a la derecha */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-base items-start">
        {/* Lista de ramas */}
        <div className="md:col-span-5 space-y-compact">
          <div className="text-caption font-medium text-muted uppercase tracking-wider px-1">
            Ramas analizadas
          </div>
          {findings.map((finding) => {
            const isSelected = finding.id === selectedNodeId;
            const isDone = appliedActions[finding.id];

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
                    <span className={isSelected ? "text-primary font-semibold" : "text-secondary"}>
                      {finding.sku || "General"}
                    </span>
                  </div>
                  {isDone ? (
                    <span className="text-state-ok flex items-center gap-0.5 text-caption font-mono">
                      <CheckCircle2 className="w-3 h-3" /> Resuelto
                    </span>
                  ) : (
                    <span className="text-muted text-caption font-mono">Revisar</span>
                  )}
                </div>
                <p className="text-secondary line-clamp-2 leading-relaxed">
                  {finding.label}
                </p>
              </button>
            );
          })}
        </div>

        {/* Panel de detalle y recomendación autónoma */}
        <div className="md:col-span-7 p-base rounded-card-sm bg-raised border border-border space-y-base">
          <div className="flex items-start justify-between gap-compact">
            <div>
              <span className="text-caption font-mono text-brand font-medium">
                Rama: {activeNode.id} · {activeNode.sku}
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
              {activeNode.severity === "critical" ? "Nivel Crítico" : "Observación"}
            </span>
          </div>

          <div className="space-y-compact text-caption">
            <div>
              <span className="font-medium text-secondary block mb-0.5">Diagnóstico del Agente:</span>
              <p className="text-primary bg-panel p-compact rounded-control border border-border leading-relaxed">
                {activeNode.detail}
              </p>
            </div>

            <div>
              <span className="font-medium text-secondary block mb-0.5">Resolución recomendada:</span>
              <div className="p-compact rounded-control bg-brand/5 border border-brand/20 text-primary flex items-start gap-compact">
                <ArrowRight className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                <p className="leading-relaxed">{activeNode.recommendation}</p>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex flex-wrap items-center justify-between gap-compact pt-compact border-t border-border">
            {appliedActions[activeNode.id] ? (
              <span className="inline-flex items-center gap-1.5 text-caption text-state-ok font-medium">
                <CheckCircle2 className="w-4 h-4" /> Acción programada en cola de ejecución.
              </span>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleApplyAction(activeNode.id)}
              >
                Ejecutar corrección autónoma
              </Button>
            )}

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
      </div>
    </div>
  );
};
