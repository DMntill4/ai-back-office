import React, { useState } from "react";
import {
  Pause,
  Play,
  RotateCw,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "../ui/PageHeader";
import { SegmentedTabs, TabItem } from "../ui/SegmentedTabs";
import { MetricStrip, MetricItem } from "../ui/MetricStrip";
import { StatusIndicator, OperationalStatus } from "../ui/StatusIndicator";
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";
import { AgentParticleCloud } from "../ui/AgentParticleCloud";
import { AgentEventChip } from "../ui/AgentEventChip";

interface WorkflowCanvasProps {
  onOpenApprovalModal?: (orderId: string) => void;
  onNavigateTo?: (tabId: string) => void;
}

type NodeStage = "trigger" | "inventory" | "agent" | "governance" | "dispatch";

interface StageNodeData {
  id: NodeStage;
  stepLabel: string;
  category: string;
  name: string;
  description: string;
  status: OperationalStatus;
  statusLabel: string;
  metricSummary: string;
  durationLabel: string;
}

interface StageTraceEvent {
  time: string;
  action: string;
  reference: string;
  detail: string;
  status: OperationalStatus;
  statusText: string;
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  onOpenApprovalModal,
  onNavigateTo,
}) => {
  const [isAgentRunning, setIsAgentRunning] = useState<boolean>(true);
  const [selectedStage, setSelectedStage] = useState<NodeStage>("agent");
  const [selectedRun, setSelectedRun] = useState<string>("CICLO-8849");
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationStep, setSimulationStep] = useState<number | null>(null);
  const [inspectorTab, setInspectorTab] = useState<string>("bitacora");
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);
  const [copiedPayload, setCopiedPayload] = useState<boolean>(false);

  // Subpestañas del destino Agente según Mint-DESIGN.md
  const agentSubTabs: TabItem[] = [
    { id: "flujo_agente", label: "Flujo del agente" },
    { id: "mapa_conocimiento", label: "Mapa de conocimiento" },
    { id: "memoria_agente", label: "Memoria del agente" },
    { id: "auditoria_eventos", label: "Historial de decisiones" },
    { id: "reglas_politicas", label: "Reglas y políticas" },
    { id: "modelos", label: "Modelos de IA" },
    { id: "nodos", label: "Biblioteca de nodos" },
    { id: "objetivos", label: "Objetivos" },
  ];

  const handleSubTabChange = (tabId: string) => {
    if (onNavigateTo) {
      onNavigateTo(tabId);
    }
  };

  // Franja de métricas clave sin tarjetas (MetricStrip)
  const metricsItems: MetricItem[] = [
    {
      id: "skus_vigilados",
      value: "74 SKUs",
      context: "Referencias vigiladas en 3 sedes físicas",
      highlightBrand: true,
      auxiliary: <StatusIndicator status="ok" label="Sincronizado" />,
    },
    {
      id: "frecuencia",
      value: "30 min",
      context: "Frecuencia de barrido de inventario",
      auxiliary: (
        <span className="text-caption text-secondary">Próximo en 14 min</span>
      ),
    },
    {
      id: "respuesta",
      value: "142 ms",
      context: "Tiempo medio de deliberación del agente",
      auxiliary: <StatusIndicator status="ok" label="Alta precisión" />,
    },
    {
      id: "pendientes",
      value: "2",
      context: "Compras que requieren tu aprobación (> $5M COP)",
      auxiliary: <StatusIndicator status="pending" label="Requiere firma" />,
    },
  ];

  // 5 Etapas del Flujo Operativo en lenguaje de negocio
  const stages: StageNodeData[] = [
    {
      id: "trigger",
      stepLabel: "Etapa 01",
      category: "Captura en almacén",
      name: "Recepción de movimientos",
      description: "Sincronización de entradas, salidas y despachos en sede",
      status: "ok",
      statusLabel: "En línea",
      metricSummary: "14 mov / min",
      durationLabel: "12 ms",
    },
    {
      id: "inventory",
      stepLabel: "Etapa 02",
      category: "Análisis de existencias",
      name: "Cobertura y punto de reorden",
      description: "Cálculo de días de inventario frente a demanda de obra",
      status: "attention",
      statusLabel: "8 bajo ROP",
      metricSummary: "74 SKUs revisados",
      durationLabel: "45 ms",
    },
    {
      id: "agent",
      stepLabel: "Etapa 03",
      category: "Deliberación autónoma",
      name: "Agente Autónomo Mint",
      description: "Comparación de proveedores, precios por volumen y tiempos",
      status: isSimulating ? "progress" : isAgentRunning ? "ok" : "attention",
      statusLabel: isSimulating
        ? "Evaluando"
        : isAgentRunning
          ? "Activo"
          : "En pausa",
      metricSummary: "Ahorro 8.2%",
      durationLabel: "142 ms",
    },
    {
      id: "governance",
      stepLabel: "Etapa 04",
      category: "Gobernanza y límites",
      name: "Compras que requieren tu aprobación",
      description: "Verificación de presupuesto y retención sobre $5.000.000 COP",
      status: "pending",
      statusLabel: "2 por firmar",
      metricSummary: "PO-24A190",
      durationLabel: "Pendiente",
    },
    {
      id: "dispatch",
      stepLabel: "Etapa 05",
      category: "Ejecución y avisos",
      name: "Emisión de orden y alertas",
      description: "Envío a proveedor homologado y notificación a operadores",
      status: "ok",
      statusLabel: "Listo",
      metricSummary: "3 canales",
      durationLabel: "Inmediato",
    },
  ];

  const stageTraces: Record<NodeStage, StageTraceEvent[]> = {
    trigger: [
      {
        time: "10:24",
        action: "Actualización de inventario en Bodega Matriz Bucaramanga",
        reference: "MOV-BGA-901",
        detail: "Salida de 6 unidades de Rotomartillo Bosch SDS Plus hacia obra Anillo Vial.",
        status: "ok",
        statusText: "Registrado",
      },
      {
        time: "10:22",
        action: "Reporte de tránsito en corredor Bogotá - Bucaramanga",
        reference: "RUTA-45A",
        detail: "Vehículo de carga operando en tiempo estimado sin novedades.",
        status: "ok",
        statusText: "En ruta",
      },
      {
        time: "10:20",
        action: "Conciliación periódica de existencias físicas completada",
        reference: "3 SEDES",
        detail: "338 referencias verificadas entre Bucaramanga, Bogotá y Medellín.",
        status: "ok",
        statusText: "Verificado",
      },
    ],
    inventory: [
      {
        time: "10:24",
        action: "Existencia bajo punto de reorden detectada",
        reference: "SKU-ROT-001",
        detail: "Quedan 4 unidades disponibles en Bucaramanga (mínimo de seguridad: 15 unidades).",
        status: "attention",
        statusText: "Riesgo < 38h",
      },
      {
        time: "10:24",
        action: "Proyección de consumo semanal actualizada",
        reference: "SKU-DW-714",
        detail: "Ritmo de salida de 1.8 unidades diarias; requiere reposición de 50 unidades.",
        status: "attention",
        statusText: "Bajo ROP",
      },
      {
        time: "10:23",
        action: "Verificación de excedentes entre sucursales",
        reference: "CD-FONTIBON",
        detail: "CD Bogotá cuenta con 18 unidades de respaldo disponibles para traslado.",
        status: "ok",
        statusText: "Disponible",
      },
    ],
    agent: [
      {
        time: "10:24",
        action: "Consulta de acuerdos comerciales y precedentes de compra",
        reference: "MEM-PROV-04",
        detail: "Se priorizan proveedores con entrega garantizada en 24 a 48 horas en Santander.",
        status: "ok",
        statusText: "Aplicado",
      },
      {
        time: "10:24",
        action: "Comparación de cotizaciones por volumen consolidado",
        reference: "PO-24A190",
        detail: "Distribuciones Santander otorga 8% de descuento ($1.450.000 COP de ahorro).",
        status: "ok",
        statusText: "Óptimo",
      },
      {
        time: "10:24",
        action: "Propuesta de orden de compra estructurada",
        reference: "$7.250.000 COP",
        detail: "50x Rotomartillo Bosch SDS Plus listos para revisión de límite presupuestal.",
        status: "ok",
        statusText: "Generada",
      },
    ],
    governance: [
      {
        time: "10:24",
        action: "Retención preventiva por límite de autonomía",
        reference: "POL-COMP-01",
        detail: "El monto ($7.250.000 COP) supera el límite autónomo de $5.000.000 COP.",
        status: "pending",
        statusText: "Requiere tu firma",
      },
      {
        time: "10:24",
        action: "Verificación de margen y presupuesto mensual de obra",
        reference: "PRES-OCT-26",
        detail: "La compra consume el 5.8% del presupuesto disponible sin exceder el tope trimestral.",
        status: "ok",
        statusText: "En presupuesto",
      },
    ],
    dispatch: [
      {
        time: "10:25",
        action: "Aviso enviado a Dirección de Operaciones",
        reference: "CANAL-TELEGRAM",
        detail: "Notificación interactiva enviada con resumen ejecutivo para aprobación.",
        status: "ok",
        statusText: "Entregado",
      },
      {
        time: "09:40",
        action: "Orden autónoma enviada a Mundial de Tornillos",
        reference: "PO-2026-0142",
        detail: "Compra por $1.450.000 COP autorizada automáticamente (bajo el límite de $5M).",
        status: "ok",
        statusText: "En despacho",
      },
    ],
  };

  const stageParameters: Record<NodeStage, { label: string; value: string; note: string }[]> = {
    trigger: [
      { label: "Sedes conectadas", value: "Bucaramanga, Bogotá y Medellín", note: "Sincronización continua" },
      { label: "Ventana de conciliación", value: "Cada 30 minutos", note: "Automática" },
      { label: " Estado de conexión", value: "100% estable", note: "Sin interrupciones hoy" },
    ],
    inventory: [
      { label: "Cobertura mínima exigida", value: "15 días en obra", note: "Política de abastecimiento" },
      { label: "Alertas de punto de reorden", value: "8 referencias activas", note: "Prioridad en ferretería pesada" },
      { label: "Rebalanceo entre sedes", value: "Habilitado", note: "Prioriza traslado antes de compra" },
    ],
    agent: [
      { label: "Criterio de selección", value: "Menor costo total y entrega < 48h", note: "Ponderación equilibrada" },
      { label: "Consolidación por volumen", value: "Activa (descuento mínimo 5%)", note: "Agrupa pedidos de 3 sedes" },
      { label: "Memoria de proveedores", value: "12 proveedores homologados", note: "Calificación histórica > 95%" },
    ],
    governance: [
      { label: "Límite de compra autónoma", value: "Hasta $5.000.000 COP", note: "Aprobación automática" },
      { label: "Compras sobre el límite", value: "Requieren firma ejecutiva", note: "Bandeja de Aprobaciones" },
      { label: "Responsable asignado", value: "Fernando S. · Director de Operaciones", note: "Notificación inmediata" },
    ],
    dispatch: [
      { label: "Canales de aviso activos", value: "Aplicación de escritorio, Telegram y Correo", note: "Respuesta en 1 clic" },
      { label: "Seguimiento de entregas", value: "Confirmación de guía con proveedor", note: "Actualiza existencias al recibir" },
      { label: "Respaldo documental", value: "Orden de compra y acta de decisión", note: "Archivado en historial" },
    ],
  };

  const handleSimulateCycle = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setSimulationStep(0);
    setSelectedStage("trigger");

    const order: NodeStage[] = ["trigger", "inventory", "agent", "governance", "dispatch"];
    let idx = 0;

    const timer = setInterval(() => {
      idx += 1;
      if (idx < order.length) {
        setSimulationStep(idx);
        setSelectedStage(order[idx]);
      } else {
        clearInterval(timer);
        setIsSimulating(false);
        setSimulationStep(null);
        setSelectedStage("governance");
      }
    }, 1000);
  };

  const activeStageObj = stages.find((s) => s.id === selectedStage) || stages[2];

  const handleCopyTechnical = () => {
    const payload = JSON.stringify(
      {
        ciclo: selectedRun,
        etapa: activeStageObj.id,
        nombre: activeStageObj.name,
        estado: activeStageObj.statusLabel,
        firmaVerificacion: "9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b",
      },
      null,
      2
    );
    navigator.clipboard.writeText(payload);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-canvas text-primary font-sans p-group space-y-group">
      {/* 1. Cabecera con Subpestañas del Destino Agente */}
      <PageHeader
        title="Flujo del agente"
        description="Supervisión en vivo de la cadena de abastecimiento autónomo: vigilancia de existencias, cotización y gobernanza."
        filterControl={
          <SegmentedTabs
            tabs={agentSubTabs}
            activeTab="flujo_agente"
            onChange={handleSubTabChange}
          />
        }
        actions={
          <div className="flex flex-wrap items-center gap-compact">
            {/* Selector de Ciclo Operativo */}
            <div className="flex items-center gap-2 px-3 h-9 rounded-control bg-panel border border-border text-caption text-secondary">
              <Clock className="w-3.5 h-3.5 text-brand shrink-0" />
              <select
                value={selectedRun}
                onChange={(e) => setSelectedRun(e.target.value)}
                aria-label="Seleccionar ciclo del agente"
                className="bg-transparent text-primary font-sans text-caption focus:outline-none cursor-pointer"
              >
                <option value="CICLO-8849" className="bg-panel text-primary">
                  Ciclo #8849 · Hace 3 min (Activo)
                </option>
                <option value="CICLO-8848" className="bg-panel text-primary">
                  Ciclo #8848 · Hace 33 min (2 firmas pendientes)
                </option>
                <option value="CICLO-8847" className="bg-panel text-primary">
                  Ciclo #8847 · Hace 1 hora (Completado)
                </option>
              </select>
            </div>

            <Button
              variant="secondary"
              size="md"
              onClick={() => setIsAgentRunning(!isAgentRunning)}
              icon={
                isAgentRunning ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )
              }
            >
              {isAgentRunning ? "Pausar ciclo" : "Reanudar ciclo"}
            </Button>

            <Button
              variant="primary"
              size="md"
              onClick={handleSimulateCycle}
              disabled={isSimulating}
              icon={
                <RotateCw
                  className={`w-3.5 h-3.5 ${isSimulating ? "animate-spin" : ""}`}
                />
              }
              showArrow={true}
            >
              {isSimulating ? "Recorriendo flujo..." : "Simular ciclo"}
            </Button>
          </div>
        }
      />

      {/* 2. Franja de Métricas sin Tarjetas (MetricStrip) */}
      <MetricStrip items={metricsItems} />

      {/* 3. Escenario Principal: Presencia Protagonista del Agente + Cadena de 5 Etapas */}
      <Panel className="space-y-group">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-compact pb-compact border-b border-border">
          <div className="flex items-center gap-compact">
            <Sparkles className="w-4 h-4 text-brand shrink-0" />
            <div>
              <h2 className="text-section-title font-bold text-primary">
                Cadena operativa de abastecimiento
              </h2>
              <p className="text-caption text-secondary">
                Selecciona cualquier etapa para inspeccionar las decisiones y criterios aplicados por el agente
              </p>
            </div>
          </div>
          <StatusIndicator
            status={isSimulating ? "progress" : isAgentRunning ? "ok" : "attention"}
            label={
              isSimulating
                ? "Simulación en curso"
                : isAgentRunning
                  ? "Ciclo continuo activo"
                  : "Ciclo pausado por el operador"
            }
          />
        </div>

        {/* 5 Etapas Conectadas */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-compact items-stretch">
          {stages.map((stage, idx) => {
            const isSelected = selectedStage === stage.id;
            const isCurrentSim = simulationStep === idx;
            const isAgentNode = stage.id === "agent";

            return (
              <div
                key={stage.id}
                onClick={() => setSelectedStage(stage.id)}
                className={`p-base rounded-container border transition-colors cursor-pointer flex flex-col justify-between relative ${isSelected
                    ? "bg-raised border-brand"
                    : isCurrentSim
                      ? "bg-raised border-strong"
                      : "bg-canvas/60 border-border hover:bg-raised/50 hover:border-strong"
                  }`}
              >
                {/* Barra superior de foco si está seleccionado */}
                {isSelected && (
                  <div className="absolute top-0 left-3 right-3 h-[3px] rounded-pill bg-brand" />
                )}

                <div className="space-y-compact">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-mono text-caption text-muted whitespace-nowrap">
                      {stage.stepLabel}
                    </span>
                    <StatusIndicator
                      status={stage.status}
                      label={stage.statusLabel}
                    />
                  </div>

                  <div>
                    <span className="text-caption text-secondary font-medium block">
                      {stage.category}
                    </span>
                    <h3 className="text-group-title font-bold text-primary mt-hairline">
                      {stage.name}
                    </h3>
                    <p className="text-caption text-secondary mt-hairline leading-relaxed">
                      {stage.description}
                    </p>
                  </div>
                </div>

                {/* Gesto memorable: Nube de puntos de la Guanábana protagonista en el nodo central */}
                {isAgentNode && (
                  <div className="my-compact py-compact flex flex-col items-center justify-center rounded-control bg-panel/70 border border-border">
                    <AgentParticleCloud
                      size={132}
                      state={
                        isSimulating
                          ? "mutando"
                          : isAgentRunning
                            ? "pensando"
                            : "reposo"
                      }
                    />
                    <span className="text-caption text-muted mt-hairline">
                      Presencia activa del agente
                    </span>
                  </div>
                )}

                <div className="mt-compact pt-compact border-t border-border flex items-center justify-between text-caption text-secondary">
                  <span className="font-medium text-primary">
                    {stage.metricSummary}
                  </span>
                  <span className="font-mono text-muted tabular-nums">
                    {stage.durationLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Estado de actividad en curso en lenguaje natural */}
        <div className="p-compact rounded-control bg-raised border border-border flex flex-col md:flex-row md:items-center justify-between gap-compact">
          <div className="flex items-center gap-compact min-w-0">
            <span className="w-2.5 h-2.5 rounded-pill bg-brand shrink-0" />
            <span className="text-caption font-semibold text-primary shrink-0">
              Actividad actual:
            </span>
            <p className="text-caption text-secondary truncate">
              Evaluando reposición de Rotomartillo Bosch SDS Plus en Bodega Bucaramanga (4 unidades disponibles frente al mínimo de 15 unidades).
            </p>
          </div>
          <div className="flex items-center gap-compact shrink-0">
            <AgentEventChip
              action="Orden propuesta"
              reference="PO-24A190"
              timeAgo="Hace 3 min"
            />
          </div>
        </div>
      </Panel>

      {/* 4. Inspector de Etapa Seleccionada */}
      <Panel className="space-y-group">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-compact pb-compact border-b border-border">
          <div className="space-y-hairline">
            <div className="flex items-center gap-compact">
              <span className="font-mono text-caption text-brand font-medium">
                {activeStageObj.stepLabel}
              </span>
              <span className="text-muted">·</span>
              <span className="text-caption text-secondary">
                {activeStageObj.category}
              </span>
            </div>
            <h3 className="text-section-title font-bold text-primary">
              {activeStageObj.name}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-compact">
            <SegmentedTabs
              tabs={[
                { id: "bitacora", label: "Bitácora de la etapa" },
                { id: "parametros", label: "Criterios operativos" },
              ]}
              activeTab={inspectorTab}
              onChange={setInspectorTab}
            />

            {selectedStage === "governance" && (
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  if (onOpenApprovalModal) {
                    onOpenApprovalModal("PO-24A190");
                  } else if (onNavigateTo) {
                    onNavigateTo("aprobaciones");
                  }
                }}
                showArrow={true}
              >
                Revisar y aprobar compra
              </Button>
            )}
          </div>
        </div>

        {/* Contenido de la pestaña activa del inspector */}
        {inspectorTab === "bitacora" ? (
          <div className="divide-y divide-border">
            {stageTraces[selectedStage].map((item, index) => (
              <div
                key={index}
                className="py-compact first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-compact"
              >
                <div className="flex items-start gap-base min-w-0">
                  <span className="font-mono text-caption text-muted tabular-nums pt-0.5 shrink-0">
                    {item.time}
                  </span>
                  <div className="space-y-hairline min-w-0">
                    <div className="flex flex-wrap items-center gap-compact">
                      <span className="text-body font-semibold text-primary">
                        {item.action}
                      </span>
                      <span className="font-mono text-caption px-2 py-0.5 rounded-control bg-raised border border-border text-secondary">
                        {item.reference}
                      </span>
                    </div>
                    <p className="text-caption text-secondary leading-relaxed">
                      {item.detail}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 sm:self-center">
                  <StatusIndicator
                    status={item.status}
                    label={item.statusText}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-compact">
            {stageParameters[selectedStage].map((param, idx) => (
              <div
                key={idx}
                className="p-base rounded-control bg-raised border border-border space-y-hairline"
              >
                <span className="text-caption text-secondary block">
                  {param.label}
                </span>
                <span className="text-body font-bold text-primary block">
                  {param.value}
                </span>
                <span className="text-caption text-muted block pt-hairline">
                  {param.note}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Detalle Técnico Oculto tras "Ver detalle técnico" según Mint-DESIGN.md */}
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
            <span>Ver detalle técnico (Registro de auditoría y firma criptográfica)</span>
          </button>

          {showTechnicalDetails && (
            <div className="mt-compact p-base rounded-control bg-raised border border-border space-y-compact">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-compact text-caption text-secondary">
                  <ShieldCheck className="w-4 h-4 text-brand" />
                  <span>Trazabilidad verificada con firma HMAC-SHA256</span>
                </div>
                <Button
                  variant="secondary"
                  size="table"
                  onClick={handleCopyTechnical}
                  icon={
                    copiedPayload ? (
                      <Check className="w-3.5 h-3.5 text-state-ok" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )
                  }
                >
                  {copiedPayload ? "Registro copiado" : "Copiar registro"}
                </Button>
              </div>
              <pre className="p-compact rounded-control bg-canvas border border-border font-mono text-caption text-secondary overflow-x-auto">
                {JSON.stringify(
                  {
                    cicloOperativo: selectedRun,
                    etapaActiva: activeStageObj.id,
                    nombreEtapa: activeStageObj.name,
                    estado: activeStageObj.statusLabel,
                    latenciaMedida: activeStageObj.durationLabel,
                    firmaIntegridad:
                      "hmac_sha256_9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b",
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
};
