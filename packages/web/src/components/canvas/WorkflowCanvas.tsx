import React, { useState, useEffect } from "react";
import {
  Database,
  Layers,
  FileCheck,
  Pause,
  Play,
  RotateCw,
  ShieldAlert,
  ChevronRight,
  Info,
  CheckCircle2,
  Clock,
  Sparkles,
  Cpu,
  ArrowRight,
  Send,
  Zap,
  Terminal,
  Copy,
  ExternalLink,
  Sliders,
} from "lucide-react";
import { AgentParticleOrb } from "../ui/AgentParticleOrb";
import { AgentEventChip } from "../ui/AgentEventChip";
import { Button } from "../ui/Button";

interface WorkflowCanvasProps {
  onOpenApprovalModal?: (orderId: string) => void;
}

type NodeStage = "trigger" | "inventory" | "agent" | "governance" | "dispatch";

interface NodeData {
  id: NodeStage;
  stageNum: string;
  category: string;
  name: string;
  subname: string;
  status: "active" | "warning" | "running" | "waiting" | "ready";
  statusLabel: string;
  metrics: string;
  execTime: string;
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  onOpenApprovalModal,
}) => {
  const [isAgentRunning, setIsAgentRunning] = useState(true);
  const [selectedStage, setSelectedStage] = useState<NodeStage>("agent");
  const [selectedRun, setSelectedRun] = useState("RUN-8849");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStep, setSimulationStep] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"config" | "trace" | "json">("trace");
  const [copiedJson, setCopiedJson] = useState(false);

  const nodes: NodeData[] = [
    {
      id: "trigger",
      stageNum: "01",
      category: "INGESTA & CDC",
      name: "Disparadores Telemetría",
      subname: "PostgreSQL 16 · OSRM GPS · WMS",
      status: "active",
      statusLabel: "Escuchando CDC",
      metrics: "14 eventos / min",
      execTime: "12 ms",
    },
    {
      id: "inventory",
      stageNum: "02",
      category: "ANÁLISIS STOCK",
      name: "Evaluación ROP & Cobertura",
      subname: "Modelo dinámico vs. Lead Time",
      status: "warning",
      statusLabel: "1 Quiebre Crítico",
      metrics: "74 SKUs analizados",
      execTime: "45 ms",
    },
    {
      id: "agent",
      stageNum: "03",
      category: "MOTOR COGNITIVO",
      name: "Núcleo Autónomo Mint",
      subname: "xAI Grok-2 · RAG Memoria Activa",
      status: isSimulating ? "running" : "active",
      statusLabel: isAgentRunning ? "Ciclo en Vigilancia" : "En Pausa",
      metrics: "142 ms P95 · Temp 0.1",
      execTime: "1.24 s",
    },
    {
      id: "governance",
      stageNum: "04",
      category: "GUARDRAIL HITL",
      name: "Filtro de Políticas & Firma",
      subname: "Regla POL-01 · Límite $5.000.000",
      status: "waiting",
      statusLabel: "Retenido para Firma",
      metrics: "Orden #OC-402",
      execTime: "Pendiente",
    },
    {
      id: "dispatch",
      stageNum: "05",
      category: "ACCIÓN & DESPACHO",
      name: "Despacho & Notificaciones",
      subname: "DIAN Factura · Telegram · WMS",
      status: "ready",
      statusLabel: "En cola transaccional",
      metrics: "3 canales destino",
      execTime: "--",
    },
  ];

  const handleSimulateCycle = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setSimulationStep(0);
    setSelectedStage("trigger");

    const steps: NodeStage[] = ["trigger", "inventory", "agent", "governance", "dispatch"];

    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      if (current < steps.length) {
        setSimulationStep(current);
        setSelectedStage(steps[current]);
      } else {
        clearInterval(interval);
        setIsSimulating(false);
        setSimulationStep(null);
        setSelectedStage("governance");
      }
    }, 1200);
  };

  const handleCopyJson = () => {
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#050806] text-slate-100 p-6 space-y-6">
      {/* 1. Header con estilo Obsidian Emerald */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2 mb-2 font-mono text-[11px] text-emerald-400/80">
            <span>INTELIGENCIA</span>
            <span className="text-zinc-600">/</span>
            <span>autonomousWorkflowService.ts & pipelineDAG.ts</span>
            <span className="text-zinc-600">/</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px]">
              MOTOR COGNITIVO V2 · CICLO CONTINUO
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Flujo del agente
            </h1>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium text-emerald-400">
              <span className={`w-1.5 h-1.5 rounded-full ${isAgentRunning ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"}`} />
              {isAgentRunning ? "Daemon en Ejecución" : "Ciclo en Pausa"}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
            Trazabilidad del DAG autónomo de adquisiciones: ingesta CDC en tiempo real, auditoría de existencias físicas, cálculo dinámico de ROP, arbitraje de proveedores y guardrails de aprobación HITL.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Selector de Ejecución / Run */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0A0F0C] border border-white/[0.08] text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={selectedRun}
              onChange={(e) => setSelectedRun(e.target.value)}
              className="bg-transparent text-zinc-200 border-none outline-none cursor-pointer text-xs"
            >
              <option value="RUN-8849" className="bg-[#0A0F0C] text-white">Run #RUN-8849 (Hace 3m - Activo)</option>
              <option value="RUN-8848" className="bg-[#0A0F0C] text-white">Run #RUN-8848 (Hace 33m - HITL Retenido)</option>
              <option value="RUN-8847" className="bg-[#0A0F0C] text-white">Run #RUN-8847 (Hace 1h 3m - Completado)</option>
            </select>
          </div>

          <Button
            variant="secondary"
            size="md"
            onClick={() => setIsAgentRunning(!isAgentRunning)}
            icon={isAgentRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          >
            {isAgentRunning ? "Pausar ciclo" : "Reanudar ciclo"}
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={handleSimulateCycle}
            disabled={isSimulating}
            className="shadow-sm shadow-emerald-500/20"
          >
            <RotateCw className={`w-3.5 h-3.5 mr-1.5 ${isSimulating ? "animate-spin" : ""}`} />
            {isSimulating ? "Simulando DAG..." : "Simular nuevo evento ROP"}
          </Button>
        </div>
      </div>

      {/* 2. Franja de Telemetría Operativa (5 KPI chips Landa style) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-[#0A0F0C] border border-white/[0.06] backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">SKUs Vigilados</span>
            <Database className="w-3.5 h-3.5 text-emerald-400/70" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-white tabular-nums">74</span>
            <span className="text-xs text-zinc-400">SKUs</span>
          </div>
          <span className="text-[11px] text-zinc-500 block mt-0.5">3 bodegas (Chimitá, BOG, MED)</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0A0F0C] border border-white/[0.06] backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Cadencia Barrido</span>
            <Clock className="w-3.5 h-3.5 text-emerald-400/70" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-white tabular-nums">30</span>
            <span className="text-xs text-zinc-400">min</span>
          </div>
          <span className="text-[11px] text-emerald-400/90 font-mono block mt-0.5">Próximo en 14m 22s</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0A0F0C] border border-white/[0.06] backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Latencia Cognitiva</span>
            <Zap className="w-3.5 h-3.5 text-emerald-400/70" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">142</span>
            <span className="text-xs text-zinc-400">ms P95</span>
          </div>
          <span className="text-[11px] text-zinc-500 block mt-0.5">Inferencia xAI Grok-2</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0A0F0C] border border-amber-500/20 bg-amber-500/[0.02] backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-amber-400/90 uppercase tracking-wider">Retenciones HITL</span>
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-amber-400 tabular-nums">2</span>
            <span className="text-xs text-zinc-400">órdenes</span>
          </div>
          <span className="text-[11px] text-zinc-400 block mt-0.5">&gt; $5.000.000 COP (POL-01)</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0A0F0C] border border-white/[0.06] backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Precisión ROP</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/70" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-white tabular-nums">99.8%</span>
          </div>
          <span className="text-[11px] text-emerald-400/90 block mt-0.5">0 quiebres no alertados</span>
        </div>
      </div>

      {/* 3. Escenario Central: Canvas Interactivo del DAG de Ejecución */}
      <div className="relative rounded-2xl bg-[#0A0F0C] border border-white/[0.08] p-6 overflow-hidden">
        {/* Sutil Grid de Fondo y Halo Esmeralda */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.035]"
          style={{
            backgroundImage: `radial-gradient(#10B981 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-28 bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-white tracking-wide">
              PIPELINE DIRECTED ACYCLIC GRAPH (DAG) · EJECUCIÓN AUTÓNOMA
            </span>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">
            Haz clic en cualquier nodo para inspeccionar sus parámetros y traza forense
          </span>
        </div>

        {/* Nodos del DAG en fila horizontal */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5 relative z-10">
          {nodes.map((node, idx) => {
            const isSelected = selectedStage === node.id;
            const isCurrentSim = simulationStep === idx;

            return (
              <div
                key={node.id}
                onClick={() => setSelectedStage(node.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between relative ${
                  isSelected
                    ? "bg-[#0d1611] border-emerald-500/50 shadow-lg shadow-emerald-950/40"
                    : isCurrentSim
                    ? "bg-emerald-950/30 border-emerald-400 animate-pulse"
                    : "bg-[#070b09] border-white/[0.06] hover:border-white/[0.15] hover:bg-[#0a0f0c]"
                }`}
              >
                {/* Indicador superior de selección */}
                {isSelected && (
                  <div className="absolute -top-px left-4 right-4 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-emerald-400/90 font-medium tracking-wider">
                      ETAPA {node.stageNum}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                        node.status === "warning"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : node.status === "waiting"
                          ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      }`}
                    >
                      {node.statusLabel}
                    </span>
                  </div>

                  <h3 className="text-xs font-semibold text-white tracking-tight">
                    {node.name}
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                    {node.subname}
                  </p>
                </div>

                {/* Si es el nodo central del agente, mostrar un mini preview de la Guanábana */}
                {node.id === "agent" && (
                  <div className="my-2 py-1 flex items-center justify-center">
                    <AgentParticleOrb
                      size={90}
                      state={isSimulating ? "mutando" : isAgentRunning ? "pensando" : "reposo"}
                    />
                  </div>
                )}

                <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-zinc-400">
                  <span>{node.metrics}</span>
                  <span className="text-zinc-500">{node.execTime}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Stream de Pensamiento del Agente en Vivo (Flowcraft Thought Stream) */}
        <div className="mt-5 p-3.5 rounded-xl bg-[#050806] border border-white/[0.06] relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 font-mono text-xs">
          <div className="flex items-center gap-2.5 text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-emerald-400 text-[11px] font-medium">THOUGHT STREAM EN VIVO:</span>
            <span className="text-zinc-300 text-[11px]">
              &quot;Evaluando rotura de stock en SKU-ROT-001 (Bucaramanga): Stock actual 4 uds &lt; ROP 12 uds. Cotizando DeWalt vs. Bosch...&quot;
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-zinc-500">
            <span>Tokens: 1,482 in / 391 out</span>
            <span>·</span>
            <span>Costo inferencia: $0.0031 USD</span>
          </div>
        </div>
      </div>

      {/* 4. Panel Inferior: Inspector Forense del Nodo Seleccionado */}
      <div className="rounded-xl bg-[#0A0F0C] border border-white/[0.08] overflow-hidden">
        {/* Cabecera del Inspector con Tabs */}
        <div className="p-4 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Info className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Inspección de Etapa: {nodes.find((n) => n.id === selectedStage)?.name}
                </span>
                <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-[10px] font-mono text-zinc-400">
                  {selectedStage.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                {selectedStage === "trigger" && "Monitoreo continuo de cambios en PostgreSQL con réplica lógica y telemetría OSRM."}
                {selectedStage === "inventory" && "Comparación de existencias contra el ROP y tasa de consumo diario (burn rate)."}
                {selectedStage === "agent" && "Inferencia autónoma xAI Grok-2 con inyección de políticas Markdown desde la bóveda."}
                {selectedStage === "governance" && "Validación de reglas POL-01 a POL-06 y verificación de firmas criptográficas HMAC."}
                {selectedStage === "dispatch" && "Generación de factura electrónica XML DIAN, actualización WMS y avisos a mensajería."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-[#050806] p-1 rounded-lg border border-white/[0.06]">
            <button
              onClick={() => setActiveTab("trace")}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeTab === "trace"
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Traza Forense
            </button>
            <button
              onClick={() => setActiveTab("config")}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeTab === "config"
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Parámetros
            </button>
            <button
              onClick={() => setActiveTab("json")}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeTab === "json"
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Payload JSON
            </button>
          </div>
        </div>

        {/* Contenido del Tab */}
        <div className="p-5">
          {activeTab === "trace" && (
            <div className="space-y-3 font-mono text-xs">
              {selectedStage === "trigger" && (
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-[#050806] border border-white/[0.04] flex items-center justify-between">
                    <span className="text-zinc-400">[10:21:01.014] Evento CDC PostgreSQL: UPDATE en tabla `inventory` (Chimitá)</span>
                    <span className="text-emerald-400">OK · 4ms</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#050806] border border-white/[0.04] flex items-center justify-between">
                    <span className="text-zinc-400">[10:21:01.018] Ingesta de geoposición OSRM: Camión BGA-902 en Ruta 45A</span>
                    <span className="text-emerald-400">OK · 8ms</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#050806] border border-white/[0.04] flex items-center justify-between">
                    <span className="text-zinc-400">[10:21:01.026] Emisión de señal reactiva a DAG runner</span>
                    <span className="text-emerald-400">TRIGGER EMITTED</span>
                  </div>
                </div>
              )}

              {selectedStage === "inventory" && (
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-[#050806] border border-white/[0.04] flex items-center justify-between">
                    <span className="text-zinc-400">[10:21:02.100] SKU-ROT-001 (Rotomartillo SDS Plus): Stock = 4, ROP = 12</span>
                    <span className="text-amber-400">QUIEBRE DETECTADO</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#050806] border border-white/[0.04] flex items-center justify-between">
                    <span className="text-zinc-400">[10:21:02.115] Cálculo de consumo histórico: 1.8 uds/día · Lead time proveedor: 3 días</span>
                    <span className="text-emerald-400">Burn Rate OK</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#050806] border border-white/[0.04] flex items-center justify-between">
                    <span className="text-zinc-400">[10:21:02.145] Cantidad económica de pedido (EOQ) recomendada: 15 unidades</span>
                    <span className="text-emerald-400">EOQ Calculado</span>
                  </div>
                </div>
              )}

              {selectedStage === "agent" && (
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-[#050806] border border-white/[0.04] flex items-center justify-between">
                    <span className="text-zinc-400">[10:21:03.200] Carga de memoria RAG: `~/.mint/vaults/santander/politicas/stock-buc.md`</span>
                    <span className="text-emerald-400">12 chunks inyectados</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#050806] border border-white/[0.04] flex items-center justify-between">
                    <span className="text-zinc-400">[10:21:03.450] Arbitraje proveedores: DeWalt ($425k COP) vs. Bosch ($440k COP)</span>
                    <span className="text-emerald-400">Ganador: DeWalt (Ahorro $225k)</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#050806] border border-white/[0.04] flex items-center justify-between">
                    <span className="text-zinc-400">[10:21:04.440] Generación de propuesta de Orden de Compra: Total $6.375.000 COP</span>
                    <span className="text-emerald-400">Propuesta Creada</span>
                  </div>
                </div>
              )}

              {selectedStage === "governance" && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-amber-500/[0.05] border border-amber-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-400" />
                      <span className="text-amber-300">[10:21:04.500] Alerta Regla POL-01: El monto ($6.375.000 COP) supera el umbral autónomo de $5.000.000 COP.</span>
                    </div>
                    <span className="text-amber-400 font-bold">HITL HOLD</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#050806] border border-white/[0.04] flex items-center justify-between">
                    <span className="text-zinc-400">[10:21:04.520] Creación de caso de aprobación: #AP-8842 para Director de Compras</span>
                    <span className="text-emerald-400">Creado</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#050806] border border-white/[0.04] flex items-center justify-between">
                    <span className="text-zinc-400">[10:21:04.550] Generación de hash de integridad HMAC-SHA256 con clave secreta</span>
                    <span className="text-emerald-400 font-mono text-[10px]">7f3a...b912</span>
                  </div>

                  {/* Botón interactivo para abrir aprobación directa */}
                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-xs text-zinc-400">Requiere firma humana calificada para proceder al despacho.</span>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onOpenApprovalModal && onOpenApprovalModal("#OC-402")}
                      className="shadow-sm shadow-emerald-500/30"
                    >
                      <FileCheck className="w-3.5 h-3.5 mr-1.5" />
                      Revisar y Firmar Orden #OC-402 en Auditoría HITL
                    </Button>
                  </div>
                </div>
              )}

              {selectedStage === "dispatch" && (
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-[#050806] border border-white/[0.04] flex items-center justify-between">
                    <span className="text-zinc-400">[10:21:05.100] Plantilla XML DIAN Factura Electrónica de Compra preparada</span>
                    <span className="text-zinc-500">EN ESPERA</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#050806] border border-white/[0.04] flex items-center justify-between">
                    <span className="text-zinc-400">[10:21:05.120] Webhook outboxQueueService listo para envío a Telegram Bot</span>
                    <span className="text-zinc-500">EN ESPERA</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "config" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#050806] border border-white/[0.06]">
                <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">Motor de Inferencia</span>
                <span className="text-white font-mono font-medium">xAI Grok-2 (Vision & Reasoning)</span>
                <span className="text-[11px] text-zinc-400 block mt-1">Temperatura: 0.1 · Max Tokens: 2,048</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#050806] border border-white/[0.06]">
                <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">Directiva de Gobernanza</span>
                <span className="text-emerald-400 font-mono font-medium">POL-01 (Tope $5.000.000 COP)</span>
                <span className="text-[11px] text-zinc-400 block mt-1">Cualquier orden superior pasa a HITL</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#050806] border border-white/[0.06]">
                <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">Base de Datos Conectada</span>
                <span className="text-white font-mono font-medium">PostgreSQL 16 (Drizzle ORM)</span>
                <span className="text-[11px] text-zinc-400 block mt-1">Latencia: 2 ms · Tablas: 14 activas</span>
              </div>
            </div>
          )}

          {activeTab === "json" && (
            <div className="relative">
              <div className="absolute top-2 right-2 flex items-center gap-2">
                <button
                  onClick={handleCopyJson}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0A0F0C] border border-white/[0.08] text-[11px] text-zinc-300 hover:text-white"
                >
                  <Copy className="w-3 h-3 text-emerald-400" />
                  {copiedJson ? "Copiado!" : "Copiar JSON"}
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-[#050806] border border-white/[0.06] text-[11px] font-mono text-emerald-400/90 overflow-x-auto leading-relaxed">
{JSON.stringify(
  {
    runId: selectedRun,
    stage: selectedStage,
    timestamp: "2026-10-29T10:21:04.440Z",
    sku: "SKU-ROT-001",
    product: "Rotomartillo SDS Plus 800W",
    warehouse: "BOD-BGA-01 (Chimitá)",
    currentStock: 4,
    ropThreshold: 12,
    suggestedQuantity: 15,
    selectedSupplier: {
      id: "SUP-DEWALT-COL",
      name: "DeWalt Colombia Mayorista",
      unitPriceCop: 425000,
      totalCop: 6375000,
      leadTimeDays: 3,
    },
    governanceCheck: {
      policy: "POL-01",
      thresholdCop: 5000000,
      exceeded: true,
      action: "REQUIRE_HUMAN_SIGNATURE",
      assignedRole: "DIRECTOR_COMPRAS",
    },
    hmacSignature: "7f3a8b29c01d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f",
  },
  null,
  2
)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
