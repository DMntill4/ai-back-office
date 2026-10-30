import React from "react";
import { NodeData } from "../../types/workflow";
import { X, Database, Shield, Target } from "lucide-react";

interface PropertiesPanelProps {
  selectedNode: NodeData;
  onClose: () => void;
  onUpdateProperties: (nodeId: string, updates: Partial<NodeData["properties"]>) => void;
  onOpenObjectives?: () => void;
}

const OBJECTIVE_OPTIONS = [
  { id: "obj-stock", badge: "Stock", title: "Reposición de stock crítico", description: "Mantener el nivel de servicio por encima del 95% en las referencias de mayor rotación." },
  { id: "obj-margin", badge: "Margen", title: "Protección de margen bruto", description: "Evitar compras que reduzcan el margen bruto por debajo del objetivo mensual." },
  { id: "obj-delivery", badge: "Entrega", title: "Cumplimiento de tiempos de entrega", description: "Priorizar proveedores con tiempos de entrega verificados y sin retrasos." },
];

const labelClass = "text-caption font-semibold text-secondary block mb-hairline";
const inputClass =
  "w-full px-compact py-hairline rounded-control bg-raised border border-border text-label text-primary focus:outline-none focus:border-brand";

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedNode,
  onClose,
  onUpdateProperties,
  onOpenObjectives,
}) => {
  const isAgent = selectedNode.type === "agent";
  const isTrigger = selectedNode.type === "trigger";
  const props = selectedNode.properties || {};

  const currentObjective =
    OBJECTIVE_OPTIONS.find((o) => o.id === props.objectiveId) || OBJECTIVE_OPTIONS[0];

  return (
    <aside className="w-80 border-l border-border bg-panel p-base flex flex-col justify-between overflow-y-auto z-10 flex-shrink-0">
      <div className="space-y-group">
        {/* Header: Title, ID badge, Close button */}
        <div className="flex items-center justify-between pb-compact border-b border-border">
          <div className="flex items-center gap-compact">
            <h3 className="text-label font-semibold text-primary">Propiedades</h3>
            <span className="text-caption font-mono px-compact py-hairline rounded-control bg-brand-surface text-brand border border-brand/40">
              ID: {selectedNode.id.slice(0, 12)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-hairline rounded-control text-secondary hover:text-primary hover:bg-raised transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* TRIGGER NODE PROPERTIES (Base de Datos) */}
        {isTrigger && (
          <div className="space-y-base">
            <div className="p-compact rounded-control bg-raised border border-border space-y-compact">
              <div className="flex items-center gap-compact text-label font-semibold text-brand">
                <Database className="w-4 h-4 text-brand" />
                <span>Conexión PostgreSQL</span>
              </div>
              <p className="text-label text-secondary">
                Conectado a la base de datos principal de Ferretería Industrial Santandereana.
              </p>
            </div>

            <div>
              <label className={labelClass}>HOST / BASE DE DATOS</label>
              <input
                type="text"
                value={props.dbHost || "localhost:5432 / ai_back_office"}
                disabled
                className={`${inputClass} font-mono text-secondary`}
              />
            </div>

            <div>
              <label className={labelClass}>TABLAS CONECTADAS</label>
              <div className="grid grid-cols-2 gap-compact text-label font-mono">
                <div className="px-compact py-hairline rounded-control bg-raised border border-border text-secondary">
                  products (154)
                </div>
                <div className="px-compact py-hairline rounded-control bg-raised border border-border text-secondary">
                  suppliers (6)
                </div>
                <div className="px-compact py-hairline rounded-control bg-raised border border-border text-secondary">
                  warehouses (3)
                </div>
                <div className="px-compact py-hairline rounded-control bg-raised border border-border text-secondary">
                  orders (28)
                </div>
              </div>
            </div>

            <div className="pt-compact">
              <button
                type="button"
                className="w-full py-hairline px-compact rounded-control bg-raised hover:bg-brand-surface border border-border text-label font-semibold text-brand transition-colors"
              >
                Recargar esquema de PostgreSQL
              </button>
            </div>
          </div>
        )}

        {/* AGENT NODE PROPERTIES */}
        {isAgent && (
          <div className="space-y-base">
            {/* NODE NAME */}
            <div>
              <label className={labelClass}>NOMBRE DEL NODO</label>
              <input
                type="text"
                value={props.nodeName || "AI Agent"}
                onChange={(e) =>
                  onUpdateProperties(selectedNode.id, { nodeName: e.target.value })
                }
                className={inputClass}
              />
            </div>

            {/* OBJETIVO OPERATIVO ASIGNADO */}
            <div>
              <div className="flex items-center justify-between mb-hairline">
                <label className="text-caption font-semibold text-brand flex items-center gap-hairline">
                  <Target className="w-3.5 h-3.5" />
                  <span>OBJETIVO OPERATIVO</span>
                </label>
                <span className="text-caption font-mono text-muted">{currentObjective.badge}</span>
              </div>

              <div className="p-compact rounded-control bg-raised border border-border space-y-compact">
                <div className="flex items-center justify-between">
                  <span className="text-label font-semibold text-primary">{currentObjective.title}</span>
                  <span className="w-2 h-2 rounded-pill bg-brand"></span>
                </div>
                <p className="text-caption text-secondary leading-relaxed">
                  {currentObjective.description}
                </p>
                <button
                  type="button"
                  onClick={onOpenObjectives}
                  className="w-full mt-hairline py-hairline px-compact rounded-control bg-raised hover:bg-brand-surface border border-border text-caption font-semibold text-brand transition-colors flex items-center justify-center gap-hairline"
                >
                  <span>Cambiar objetivo o directivas...</span>
                </button>
              </div>
            </div>

            {/* DESCRIPTION */}
            <div>
              <label className={labelClass}>DESCRIPCIÓN / DIRECTIVA</label>
              <textarea
                rows={3}
                value={props.description || ""}
                onChange={(e) =>
                  onUpdateProperties(selectedNode.id, { description: e.target.value })
                }
                className={`${inputClass} text-secondary resize-none leading-relaxed`}
              />
            </div>

            {/* CHAT MODEL */}
            <div>
              <label className={labelClass}>MODELO DE CHAT</label>
              <select
                value={props.model || "grok-4.6"}
                onChange={(e) =>
                  onUpdateProperties(selectedNode.id, { model: e.target.value })
                }
                className={inputClass}
              >
                <option value="grok-4.6">Grok-4.6 (Recomendado)</option>
                <option value="grok-beta">Grok-Beta (Baja Latencia)</option>
                <option value="gpt-4o">GPT-4o (OpenAI)</option>
                <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
              </select>
            </div>

            {/* MAX ITERATIONS & MEMORY LIMIT */}
            <div className="grid grid-cols-2 gap-compact">
              <div>
                <label className={labelClass}>Iteraciones máximas</label>
                <input
                  type="number"
                  min={1}
                  max={25}
                  value={props.maxIterations || 10}
                  onChange={(e) =>
                    onUpdateProperties(selectedNode.id, {
                      maxIterations: parseInt(e.target.value) || 10,
                    })
                  }
                  className={`${inputClass} font-mono`}
                />
              </div>
              <div>
                <label className={labelClass}>Límite de memoria</label>
                <input
                  type="text"
                  value={props.memoryLimit || "50k tokens"}
                  disabled
                  className={`${inputClass} text-muted font-mono`}
                />
              </div>
            </div>

            {/* UMBRAL DE GOBERNANZA */}
            <div className="p-compact rounded-control bg-raised border border-border space-y-hairline">
              <div className="flex items-center justify-between">
                <span className="text-caption font-semibold text-brand flex items-center gap-hairline">
                  <Shield className="w-3.5 h-3.5 text-brand" />
                  <span>Umbral de aprobación</span>
                </span>
                <span className="text-caption font-mono px-hairline py-hairline rounded-control bg-brand-surface text-brand border border-brand/40">
                  GOBERNANZA
                </span>
              </div>
              <p className="text-label font-mono font-semibold text-primary">
                $5,000,000 COP
              </p>
              <p className="text-caption text-secondary">
                Toda compra mayor es derivada automáticamente a la bandeja de decisiones para aprobación humana.
              </p>
            </div>
          </div>
        )}

        {/* ACTION NODE PROPERTIES */}
        {!isAgent && !isTrigger && (
          <div className="space-y-base">
            <div>
              <label className={labelClass}>ACCIÓN SELECCIONADA</label>
              <input
                type="text"
                value={selectedNode.label}
                disabled
                className={`${inputClass} font-semibold`}
              />
            </div>
            <div>
              <label className={labelClass}>DESCRIPCIÓN DE IMPACTO</label>
              <p className="text-label text-secondary leading-relaxed bg-raised p-compact rounded-control border border-border">
                {props.description || "Acción operativa conectada al flujo del agente."}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-base border-t border-border text-caption text-muted font-mono flex items-center justify-between">
        <span>Mint Studio v2.4</span>
        <span className="text-brand">Listo</span>
      </div>
    </aside>
  );
};
