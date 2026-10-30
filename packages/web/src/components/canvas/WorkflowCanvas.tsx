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
      category: "CAPTURA EN ALMACÉN",
      name: "Disparadores Telemetría",
      subname: "Sincronización en vivo · WMS",
      status: "active",
      statusLabel: "Escucha activa",
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
      metrics: "142 ms respuesta · Alta precisión",
      execTime: "1.24 s",
    },
    {
      id: "governance",
      stageNum: "04",
      category: "SUPERVISIÓN EJECUTIVA",
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
      category: "DESPACHO & NOTIFICACIONES",
      name: "Despacho & Notificaciones",
      subname: "Facturación DIAN · Telegram · WMS",
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
          <div className="flex items-center gap-2 mb-2 text-xs text-zinc-400 font-sans">
            <span>Inteligencia</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-300">Cadena de Abastecimiento Autónomo</span>
            <span className="text-zinc-600">/</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
              Supervisión en Tiempo Real
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
              Flujo del Agente
            </h1>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400">
              <span className={`w-1.5 h-1.5 rounded-full ${isAgentRunning ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"}`} />
              {isAgentRunning ? "Motor en Ejecución" : "Ciclo en Pausa"}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl font-sans">
            Trazabilidad del flujo continuo de adquisiciones: sincronización de existencias físicas en tiempo real, cálculo dinámico de punto de reorden (ROP), arbitraje de proveedores y supervisión ejecutiva.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Selector de Ejecución / Run */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0A0F0C] border border-white/[0.08] text-xs">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={selectedRun}
              onChange={(e) => setSelectedRun(e.target.value)}
              className="bg-transparent text-zinc-200 border-none outline-none cursor-pointer text-xs font-sans"
            >
              <option value="RUN-8849" className="bg-[#0A0F0C] text-white">Ciclo #RUN-8849 (Hace 3m - Activo)</option>
              <option value="RUN-8848" className="bg-[#0A0F0C] text-white">Ciclo #RUN-8848 (Hace 33m - Requiere Firma)</option>
              <option value="RUN-8847" className="bg-[#0A0F0C] text-white">Ciclo #RUN-8847 (Hace 1h - Completado)</option>
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
            {isSimulating ? "Simulando evento..." : "Simular nuevo evento"}
          </Button>
        </div>
      </div>

      {/* 2. Franja de Telemetría Operativa */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-[#0A0F0C] border border-white/[0.06] backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-sans">SKUs Vigilados</span>
            <Database className="w-3.5 h-3.5 text-emerald-400/70" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-white tabular-nums font-sans">74</span>
            <span className="text-xs text-zinc-400 font-sans">SKUs</span>
          </div>
          <span className="text-xs text-zinc-500 block mt-0.5 font-sans">3 bodegas sincronizadas</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0A0F0C] border border-white/[0.06] backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-sans">Frecuencia de Barrido</span>
            <Clock className="w-3.5 h-3.5 text-emerald-400/70" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-white tabular-nums font-sans">30</span>
            <span className="text-xs text-zinc-400 font-sans">minutos</span>
          </div>
          <span className="text-xs text-emerald-400/90 font-sans block mt-0.5">Próximo en 14m 22s</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0A0F0C] border border-white/[0.06] backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-sans">Respuesta del Agente</span>
            <Zap className="w-3.5 h-3.5 text-emerald-400/70" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-emerald-400 tabular-nums font-sans">142</span>
            <span className="text-xs text-zinc-400 font-sans">ms respuesta</span>
          </div>
          <span className="text-xs text-zinc-500 block mt-0.5 font-sans">Modelo de decisión activo</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0A0F0C] border border-amber-500/20 bg-amber-500/[0.02] backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-300 font-sans">Aprobaciones Ejecutivas</span>
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-amber-400 tabular-nums font-sans">2</span>
            <span className="text-xs text-zinc-400 font-sans">órdenes</span>
          </div>
          <span className="text-xs text-zinc-400 block mt-0.5 font-sans">&gt; $5.000.000 COP</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0A0F0C] border border-white/[0.06] backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-sans">Precisión de Reorden</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/70" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-white tabular-nums font-sans">99.8%</span>
          </div>
          <span className="text-xs text-emerald-400/90 block mt-0.5 font-sans">Cero roturas imprevistas</span>
        </div>
      </div>

      {/* 3. Escenario Central: Cadena Operativa de Abastecimiento */}
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
            <span className="text-xs font-semibold text-white tracking-wide font-sans">
              Cadena Operativa de Abastecimiento · Ejecución Continua
            </span>
          </div>
          <span className="text-xs text-zinc-400 font-sans">
            Haz clic en cualquier etapa para consultar sus parámetros y traza operativa
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
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between relative ${isSelected
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
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${node.status === "warning"
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
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${activeTab === "trace"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : "text-zinc-400 hover:text-white"
                }`}
            >
              Traza Forense
            </button>
            <button
              onClick={() => setActiveTab("config")}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${activeTab === "config"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : "text-zinc-400 hover:text-white"
                }`}
            >
              Parámetros
            </button>
            <button
              onClick={() => setActiveTab("json")}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${activeTab === "json"
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
                    <span className="text-zinc-400">[10:21:01.014] Actualización en almacén: Registro de movimiento en inventario (Chimitá)</span>
                    <span className="text-emerald-400">Sincronizado · 4ms</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#050806] border border-white/[0.04] flex items-center justify-between">
                    <span className="text-zinc-400">[10:21:01.018] Telemetría satelital: Camión WFL-892 en Ruta 45A</span>
                    <span className="text-emerald-400">En ruta · 8ms</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#050806] border border-white/[0.04] flex items-center justify-between">
                    <span className="text-zinc-400">[10:21:01.026] Señal de verificación enviada al orquestador</span>
                    <span className="text-emerald-400">VERIFICACIÓN OK</span>
                  </div>
                </div>
              )}

              {selectedStage === "inventory" && (
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-[#050806] border border-white/[0.04] flex items-center justify-between">
                    <span className="text-zinc-400">[10:21:02.100] SKU-ROT-001 (Rotomartillo SDS Plus): Stock actual = 4, Punto de Reorden = 12</span>
                    <span className="text-amber-400">BAJO PUNTO DE REORDEN</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#050806] border border-white/[0.04] flex items-center justify-between">
                    <span className="text-zinc-400">[10:21:02.115] Consumo proyectado: 1.8 uds/día · Tiempo de entrega del proveedor: 3 días</span>
                    <span className="text-emerald-400">Tasa de Consumo OK</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#050806] border border-white/[0.04] flex items-center justify-between">
                    <span className="text-zinc-400">[10:21:02.145] Lote óptimo de reposición recomendado: 15 unidades</span>
                    <span className="text-emerald-400">Lote Calculado</span>
                  </div>
                </div>
              )}

              {selectedStage === "agent" && (
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-[#050806] border border-white/[0.04] flex items-center justify-between">
                    <span className="text-zinc-400">[10:21:03.200] Consulta de precedentes en boveda: Política de abastecimiento regional</span>
                    <span className="text-emerald-400">Contexto Cargado</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#050806] border border-white/[0.04] flex items-center justify-between">
                    <span className="text-zinc-400">[10:21:03.450] Cotización comparada: DeWalt ($425k COP) vs. Bosch ($440k COP)</span>
                    <span className="text-emerald-400">Mejor oferta: DeWalt (Ahorro $225.000 COP)</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#050806] border border-white/[0.04] flex items-center justify-between">
                    <span className="text-zinc-400">[10:21:04.440] Formulación de Orden de Compra: Total $6.375.000 COP</span>
                    <span className="text-emerald-400">Propuesta Generada</span>
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
                    <span className="text-amber-400 font-bold">RETENCIÓN EJECUTIVA</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#050806] border border-white/[0.04] flex items-center justify-between">
                    <span className="text-zinc-400">[10:21:04.520] Creación de solicitud de aprobación: #AP-8842 para Dirección de Operaciones</span>
                    <span className="text-emerald-400">Registrado</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#050806] border border-white/[0.04] flex items-center justify-between">
                    <span className="text-zinc-400">[10:21:04.550] Firma criptográfica HMAC-SHA256 generada y auditada</span>
                    <span className="text-emerald-400 font-mono text-[10px]">7f3a...b912</span>
                  </div>

                  {/* Botón interactivo para abrir aprobación directa */}
                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-xs text-zinc-400">Requiere firma ejecutiva para proceder al despacho al proveedor.</span>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onOpenApprovalModal && onOpenApprovalModal("#OC-402")}
                      className="shadow-sm shadow-emerald-500/30"
                    >
                      <FileCheck className="w-3.5 h-3.5 mr-1.5" />
                      Revisar y Firmar Orden #OC-402
                    </Button>
                  </div>
                </div>
              )}

              {selectedStage === "dispatch" && (
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-[#050806] border border-white/[0.04] flex items-center justify-between">
                    <span className="text-zinc-400">[10:21:05.100] Remisión digital DIAN preparada</span>
                    <span className="text-zinc-500">EN ESPERA</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#050806] border border-white/[0.04] flex items-center justify-between">
                    <span className="text-zinc-400">[10:21:05.120] Notificación telemática lista para canal móvil</span>
                    <span className="text-zinc-500">EN ESPERA</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "config" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#050806] border border-white/[0.06]">
                <span className="text-xs text-zinc-400 block mb-1">Motor de Inferencia</span>
                <span className="text-white font-medium">Modelo Cognitivo Mint (Razonamiento & Supervisión)</span>
                <span className="text-xs text-zinc-500 block mt-1">Modo: Alta consistencia y rigor</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#050806] border border-white/[0.06]">
                <span className="text-xs text-zinc-400 block mb-1">Directiva de Gobernanza</span>
                <span className="text-emerald-400 font-sans font-semibold">POL-01 (Tope $5.000.000 COP)</span>
                <span className="text-[11px] text-zinc-400 block mt-1">Cualquier orden superior requiere firma ejecutiva</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#050806] border border-white/[0.06]">
                <span className="text-xs text-zinc-400 block mb-1">Base de Datos Conectada</span>
                <span className="text-white font-sans font-medium">Base de Datos Maestra (PostgreSQL Cifrado)</span>
                <span className="text-[11px] text-zinc-400 block mt-1">Tiempo de respuesta: 2 ms · Sincronización continua</span>
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
