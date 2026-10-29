import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Clock,
  Search,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ChevronRight,
  Terminal,
  Database,
  Calculator,
  Truck,
  Cpu,
  Copy,
  Check,
  Lock,
  ArrowRight,
  Filter,
  Download,
  Code2,
  GitBranch,
  Layers,
  Sparkles,
  Bot,
} from "lucide-react";
import { Button } from "../ui/Button";

interface HistoryRecord {
  id: string;
  title: string;
  status: "escalado" | "resuelto" | "bloqueado";
  statusLabel: string;
  amountCop: string;
  supplier: string;
  date: string;
  tokens: number;
  cost: string;
  model: string;
  reason: string;
  hmacDigest: string;
  thoughtTree: {
    step: string;
    agent: string;
    action: string;
    detail: string;
    latencyMs: number;
  }[];
  rawPayload: Record<string, any>;
}

const INITIAL_HISTORY_RECORDS: HistoryRecord[] = [
  {
    id: "case_99182_a",
    title: "Reabastecimiento Martillo Demoledor SDS-Max (9u)",
    status: "escalado",
    statusLabel: "Escalado a HITL",
    amountCop: "$3.780.000 COP",
    supplier: "Ferreterías Unidas Bogotá",
    date: "Hoy, 10:14",
    tokens: 2840,
    cost: "$0.0035 USD",
    model: "Grok-4.6 (api.reto.pltk.mx)",
    reason: "Propuesta formulada tras detección de caída en stock de seguridad en Bucaramanga. Requiere confirmación humana de contrato marco.",
    hmacDigest: "hmac_sha256_e4b89f81a7b640192e591bc0",
    thoughtTree: [
      {
        step: "1. Ingesta de Telemetría",
        agent: "TelemetryWatcher",
        action: "Auditoría de inventario físico en Bodega Matriz Bucaramanga.",
        detail: "Stock actual: 1 unidad. ROP configurado: 10 unidades. Consumo promedio: 0.8 un/día. Días de cobertura: 1.25 días.",
        latencyMs: 42,
      },
      {
        step: "2. Cotización y Comparación",
        agent: "SupplierMatcher",
        action: "Análisis multicriterio de 3 proveedores homologados.",
        detail: "Ferreterías Unidas ($3.780.000 COP, 2 días) seleccionada frente a DeWalt ($4.100.000 COP, 1 día) por delta costo favorable de $320.000 COP.",
        latencyMs: 185,
      },
      {
        step: "3. Enrutamiento Logístico",
        agent: "LogisticsRouter",
        action: "Cálculo de trayecto Bogotá → Bucaramanga vía OSRM Pescadero.",
        detail: "Distancia: 398 km. ETA: 8.5 horas. Flete consolidado con despacho de pernos. Ahorro de transporte: 14.8%.",
        latencyMs: 95,
      },
      {
        step: "4. Evaluación de Gobernanza",
        agent: "PolicyEngine",
        action: "Verificación de umbrales presupuestales y reglas POL-01 / POL-02.",
        detail: "Monto dentro de límite autónomo ($3.78M < $5.00M), pero proveedor no cuenta con contrato marco anual en vigor. Escalado preventivo.",
        latencyMs: 64,
      },
    ],
    rawPayload: {
      event_type: "REORDER_TRIGGER",
      target_sku: "HER-ROT-001",
      warehouse_id: "wh_buc_01",
      candidate_suppliers: ["supp_dewalt_col", "supp_ferr_bog", "supp_santander_ind"],
      optimal_supplier: "supp_ferr_bog",
      osrm_route_id: "rt_bog_buc_402",
      policy_verdict: "ESCALATE_TO_HITL",
      hmac_auth: "verified_sha256",
    },
  },
  {
    id: "case_99181_b",
    title: "Consolidación de Pernos Estructurales Grado 8 (500u)",
    status: "resuelto",
    statusLabel: "Aprobado autónomamente",
    amountCop: "$1.450.000 COP",
    supplier: "Mundial de Tornillos S.A.S.",
    date: "Ayer, 16:45",
    tokens: 1420,
    cost: "$0.0018 USD",
    model: "Grok-beta",
    reason: "Reorden autónomo procesado sin requerir intervención humana (POL-01 cumplida).",
    hmacDigest: "hmac_sha256_82f1b99a03c4118d",
    thoughtTree: [
      {
        step: "1. Detección de Umbral",
        agent: "TelemetryWatcher",
        action: "Revisión programada de bodega y proyección de quiebre.",
        detail: "Stock actual: 420 cajas. ROP: 500 cajas. Ritmo de salida acelerado por obra en Girón.",
        latencyMs: 38,
      },
      {
        step: "2. Auto-Aprobación Determinista",
        agent: "PolicyEngine",
        action: "Evaluación de política HITL y guardrails financieros.",
        detail: "$1.450.000 COP < $5.000.000 COP. Proveedor preferente con 98.1% de cumplimiento SLA y contrato anual activo.",
        latencyMs: 72,
      },
      {
        step: "3. Disparo de Orden de Compra",
        agent: "ProcurementExec",
        action: "Emisión de comprobante digital y notificación webhook.",
        detail: "Generado receipts/po_2026_0142.json con firma criptográfica HMAC y despacho confirmado.",
        latencyMs: 110,
      },
    ],
    rawPayload: {
      event_type: "AUTONOMOUS_PURCHASE",
      target_sku: "FIJ-PER-101",
      po_id: "PO-2026-0142",
      total_cop: 1450000,
      supplier_id: "supp_mundial_tor",
      compliance_status: "PASSED",
    },
  },
  {
    id: "case_99180_c",
    title: "Solicitud de Generador Diésel 5kVA (1u)",
    status: "bloqueado",
    statusLabel: "Bloqueado por política",
    amountCop: "$8.900.000 COP",
    supplier: "Energía & Motores Bucaramanga",
    date: "27 oct 2026",
    tokens: 3100,
    cost: "$0.0042 USD",
    model: "Grok-4.6 (api.reto.pltk.mx)",
    reason: "Monto excede el presupuesto trimestral asignado a la categoría de maquinaria pesada (Guardrail POL-03).",
    hmacDigest: "hmac_sha256_11a9c4b789e023",
    thoughtTree: [
      {
        step: "1. Solicitud Recibida",
        agent: "TelemetryWatcher",
        action: "Ingesta de requisición extraordinaria de obra.",
        detail: "Requerimiento de 1 generador de respaldo para planta de corte.",
        latencyMs: 35,
      },
      {
        step: "2. Regla de Guardrail Presupuestal",
        agent: "PolicyEngine",
        action: "Límite de presupuesto por familia excedido.",
        detail: "Partida presupuestal Q4 agotada en un 94.2%. Monto de $8.900.000 COP supera el cupo remanente disponible de $2.100.000 COP.",
        latencyMs: 55,
      },
      {
        step: "3. Bloqueo Inmediato",
        agent: "ComplianceGatekeeper",
        action: "Emisión de código de bloqueo BLK-9901.",
        detail: "Transacción rechazada unilateralmente. Se notificó al director financiero vía canal de alertas.",
        latencyMs: 40,
      },
    ],
    rawPayload: {
      event_type: "BLOCKED_TRANSACTION",
      error_code: "BUDGET_CAP_EXCEEDED",
      rule_id: "POL-03",
      requested_cop: 8900000,
      remaining_budget_cop: 2100000,
    },
  },
];

export const HistoryView: React.FC = () => {
  const [records] = useState<HistoryRecord[]>(INITIAL_HISTORY_RECORDS);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("case_99182_a");
  const [filter, setFilter] = useState<"todos" | "resuelto" | "escalado" | "bloqueado">("todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"thought_tree" | "raw_json">("thought_tree");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const selectedCase = useMemo(
    () => records.find((r) => r.id === selectedCaseId) || records[0],
    [records, selectedCaseId]
  );

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesFilter = filter === "todos" ? true : r.status === filter;
      const matchesSearch =
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.supplier.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [records, filter, searchQuery]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-[#050806] text-[#F9FAFB] font-sans select-none overflow-hidden">
      {/* 1. Header Bar Flowcraft */}
      <div className="flex-none px-6 py-4 border-b border-white/[0.06] bg-[#0A0F0C]/80 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#8E9893] font-medium">Gobernanza</span>
            <span className="text-white/20">/</span>
            <span className="text-[#10B981] font-semibold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Trazabilidad Inmutable & Auditoría Forense
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white mt-1 flex items-center gap-2.5">
            Auditoría de Eventos y Decisiones
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#10B981]/10 text-[#34D399] border border-[#10B981]/25">
              POSTGRESQL AUDIT LEDGER
            </span>
          </h1>
          <p className="text-xs text-[#8E9893] mt-0.5">
            Registro secuencial de decisiones tomadas por el agente, llamadas a modelos cognitivos, desglose de tokens y firmas criptográficas.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleCopy(JSON.stringify(records, null, 2), "all_records")}
            className="border-white/10 text-white hover:border-[#10B981]/40 flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5 text-[#34D399]" />
            <span className="text-xs font-semibold">
              {copiedText === "all_records" ? "¡Copiado JSON!" : "Exportar Ledger JSON"}
            </span>
            <span className="text-[10px] bg-black/30 px-1.5 py-0.2 rounded font-mono text-white/80">[E]</span>
          </Button>

          {/* Segmented Filter */}
          <div className="flex items-center p-1 rounded-xl bg-[#0E1511] border border-white/[0.06] text-xs">
            <button
              onClick={() => setFilter("todos")}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                filter === "todos"
                  ? "bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/30 shadow-sm"
                  : "text-[#8E9893] hover:text-white"
              }`}
            >
              Todos ({records.length})
            </button>
            <button
              onClick={() => setFilter("resuelto")}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                filter === "resuelto"
                  ? "bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/30 shadow-sm"
                  : "text-[#8E9893] hover:text-white"
              }`}
            >
              Autónomos ({records.filter((r) => r.status === "resuelto").length})
            </button>
            <button
              onClick={() => setFilter("escalado")}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                filter === "escalado"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm"
                  : "text-[#8E9893] hover:text-white"
              }`}
            >
              Escalados ({records.filter((r) => r.status === "escalado").length})
            </button>
            <button
              onClick={() => setFilter("bloqueado")}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                filter === "bloqueado"
                  ? "bg-red-500/20 text-red-300 border border-red-500/30 shadow-sm"
                  : "text-[#8E9893] hover:text-white"
              }`}
            >
              Bloqueados ({records.filter((r) => r.status === "bloqueado").length})
            </button>
          </div>
        </div>
      </div>

      {/* 2. Franja de KPIs de Auditoría */}
      <div className="flex-none px-6 py-3 border-b border-white/[0.06] bg-[#070B08]/90 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center text-[#34D399]">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-[#8E9893] uppercase tracking-wider font-semibold block">
              Eventos Registrados
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-extrabold font-mono text-white tabular-nums">48</span>
              <span className="text-[10px] text-[#34D399] font-mono">Últimas 24h</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center text-[#34D399]">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-[#8E9893] uppercase tracking-wider font-semibold block">
              Tasa de Autonomía
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-extrabold font-mono text-[#34D399] tabular-nums">96.4%</span>
              <span className="text-[10px] text-white/50 font-mono">0 quiebres no atendidos</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-[#8E9893] uppercase tracking-wider font-semibold block">
              Consumo de Tokens
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-extrabold font-mono text-white tabular-nums">2.140</span>
              <span className="text-[10px] text-[#8E9893] font-mono">Prom. por caso</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center text-[#34D399]">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-[#8E9893] uppercase tracking-wider font-semibold block">
              Integridad Criptográfica
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-extrabold font-mono text-[#34D399] tabular-nums">100%</span>
              <span className="text-[10px] text-white/50 font-mono">HMAC-SHA256</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Contenedor Master-Detail (40% Timeline Cronológico / 60% Árbol de Pensamiento & Forense) */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* PANEL IZQUIERDO: 40% LISTA DE EVENTOS */}
        <div className="flex-1 lg:w-[40%] flex flex-col min-h-0 border-r border-white/[0.06] bg-[#050806]">
          {/* Buscador */}
          <div className="flex-none p-3 border-b border-white/[0.06] bg-[#0A0F0C]/60">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#8E9893] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por ID de caso, producto o proveedor..."
                className="w-full bg-[#0E1511] border border-white/[0.08] hover:border-white/20 focus:border-[#10B981]/60 focus:bg-[#070B08] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-[#8E9893]/70 focus:outline-none transition-all font-mono"
              />
            </div>
          </div>

          {/* Registros Cronológicos */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5">
            {filteredRecords.map((item) => {
              const isSelected = selectedCase?.id === item.id;
              const isResolved = item.status === "resuelto";
              const isEscalated = item.status === "escalado";

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedCaseId(item.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#0A0F0C] border-[#10B981]/40 shadow-[0_0_20px_rgba(16,185,129,0.08)] ring-1 ring-[#10B981]/30"
                      : "bg-[#080D09] border-white/[0.05] hover:border-white/15 hover:bg-[#0A0F0C]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {item.id}
                        </span>
                        <span className="text-white/20">·</span>
                        <span className="text-[10px] text-[#8E9893] font-mono">
                          {item.date}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-white/95 mt-1 line-clamp-1">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-[#8E9893] mt-0.5 line-clamp-1">
                        {item.supplier}
                      </p>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1 flex-none">
                      <span className="font-mono text-xs font-extrabold text-white tabular-nums">
                        {item.amountCop}
                      </span>
                      {isResolved ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          AUTÓNOMO
                        </span>
                      ) : isEscalated ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          HITL
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-500/15 text-red-300 border border-red-500/30 flex items-center gap-1">
                          <AlertCircle className="w-2.5 h-2.5" />
                          BLOQUEADO
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-white/[0.04] flex items-center justify-between text-[10px] font-mono text-[#8E9893]">
                    <span className="flex items-center gap-1">
                      <Cpu className="w-3 h-3 text-[#10B981]" />
                      {item.tokens} tokens
                    </span>
                    <span>Costo: {item.cost}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PANEL DERECHO: 60% VISUALIZADOR FORENSE & THOUGHT TREE */}
        <div className="flex-1 lg:w-[60%] flex flex-col min-h-0 bg-[#070B08] overflow-y-auto p-6 space-y-5">
          {selectedCase ? (
            <>
              {/* Encabezado del Caso */}
              <div className="flex-none p-5 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 pointer-events-none opacity-30 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.2),transparent_70%)]" />
                <div className="flex items-start justify-between gap-4 relative z-10">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded font-mono text-[11px] font-extrabold bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/40">
                        {selectedCase.id}
                      </span>
                      <span className="text-white/20">·</span>
                      <span className="text-xs text-[#8E9893]">{selectedCase.date}</span>
                    </div>
                    <h2 className="text-base font-extrabold text-white mt-1.5 leading-snug">
                      {selectedCase.title}
                    </h2>
                    <p className="text-xs text-[#8E9893] mt-0.5">
                      Proveedor: <strong className="text-white">{selectedCase.supplier}</strong> · Modelo:{" "}
                      <strong className="text-white font-mono">{selectedCase.model}</strong>
                    </p>
                  </div>

                  <div className="text-right flex-none">
                    <span className="text-[11px] text-[#8E9893] block font-semibold uppercase">
                      Monto Involucrado
                    </span>
                    <span className="font-mono text-2xl font-black text-[#34D399] tabular-nums block mt-0.5">
                      {selectedCase.amountCop}
                    </span>
                    <span className="text-[10px] text-white/40 font-mono">
                      Costo Inferencia: {selectedCase.cost}
                    </span>
                  </div>
                </div>
              </div>

              {/* Selector de Pestañas: Árbol de Razonamiento vs Raw JSON */}
              <div className="flex-none flex items-center gap-2 border-b border-white/[0.06] pb-2">
                <button
                  onClick={() => setActiveTab("thought_tree")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                    activeTab === "thought_tree"
                      ? "bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/30"
                      : "text-[#8E9893] hover:text-white"
                  }`}
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>Árbol de Inferencia (Thought Tree)</span>
                </button>
                <button
                  onClick={() => setActiveTab("raw_json")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                    activeTab === "raw_json"
                      ? "bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/30"
                      : "text-[#8E9893] hover:text-white"
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Payload RAW & Evidencia JSON</span>
                </button>
              </div>

              {activeTab === "thought_tree" ? (
                /* ÁRBOL DE INFERENCIA SECUENCIAL */
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-[#34D399]" />
                        <span className="text-xs font-extrabold uppercase tracking-wider text-white">
                          Pasos de Decisión del Agente Autónomo
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-[#34D399] bg-[#10B981]/10 px-2 py-0.5 rounded border border-[#10B981]/25">
                        {selectedCase.thoughtTree.length} FASES COMPLETADAS
                      </span>
                    </div>

                    <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#10B981]/30">
                      {selectedCase.thoughtTree.map((step, idx) => (
                        <div key={idx} className="relative group">
                          {/* Dot indicador del nodo */}
                          <div className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full bg-[#0A0F0C] border-2 border-[#10B981] flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
                          </div>

                          <div className="p-3.5 rounded-xl bg-[#0E1511] border border-white/[0.04] hover:border-white/10 transition-colors">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-bold text-white flex items-center gap-1.5">
                                {step.step}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] text-[#34D399] bg-[#10B981]/10 px-2 py-0.2 rounded border border-[#10B981]/25">
                                  {step.agent}
                                </span>
                                <span className="font-mono text-[10px] text-white/40">
                                  {step.latencyMs}ms
                                </span>
                              </div>
                            </div>
                            <p className="text-xs text-white/90 font-medium mb-1">
                              {step.action}
                            </p>
                            <p className="text-[11px] text-[#8E9893] leading-relaxed">
                              {step.detail}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Panel Criptográfico */}
                  <div className="p-4 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] flex items-center justify-between gap-3">
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-[#34D399]" />
                        <span className="text-[10px] text-[#8E9893] uppercase font-bold">
                          Hash Digest de Auditoría (PostgreSQL)
                        </span>
                      </div>
                      <span className="font-mono text-xs text-white truncate block mt-1">
                        {selectedCase.hmacDigest}
                      </span>
                    </div>

                    <button
                      onClick={() => handleCopy(selectedCase.hmacDigest, "digest")}
                      className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white transition-colors flex-none"
                      title="Copiar Hash"
                    >
                      {copiedText === "digest" ? (
                        <Check className="w-4 h-4 text-[#10B981]" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* RAW JSON PAYLOAD */
                <div className="p-4 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-[#8E9893]">
                      Payload Registrado en PostgreSQL · ai_back_office.event_logs
                    </span>
                    <button
                      onClick={() => handleCopy(JSON.stringify(selectedCase.rawPayload, null, 2), "payload")}
                      className="flex items-center gap-1.5 text-xs text-[#34D399] hover:underline font-mono"
                    >
                      {copiedText === "payload" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedText === "payload" ? "¡Copiado!" : "Copiar JSON"}</span>
                    </button>
                  </div>
                  <pre className="p-4 rounded-xl bg-[#050806] border border-white/[0.06] text-xs font-mono text-[#34D399] overflow-x-auto leading-relaxed">
                    {JSON.stringify(selectedCase.rawPayload, null, 2)}
                  </pre>
                </div>
              )}
            </>
          ) : (
            <div className="p-12 text-center text-xs text-[#8E9893] border border-dashed border-white/10 rounded-2xl">
              Selecciona un evento del historial.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
