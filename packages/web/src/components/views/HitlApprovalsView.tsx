import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { HitlDecision } from "../../types/workflow";
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Package,
  Layers,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  FileText,
  DollarSign,
  Copy,
  Check,
} from "lucide-react";

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
  explain: {
    context: string;
    opportunityCost: string;
  };
  diffImpact: {
    budgetBefore: string;
    budgetAfter: string;
    stockBefore: string;
    stockAfter: string;
    slaBefore: string;
    slaAfter: string;
  };
  hmacSignature: string;
  status: "pendiente" | "aprobado" | "rechazado";
  timeline: {
    title: string;
    time: string;
    description: string;
    completed: boolean;
  }[];
}

const DEFAULT_PROPOSALS: EnrichedProposal[] = [
  {
    id: "DEC-2026-0041",
    orderNumber: "#OC-402",
    title: "Orden de compra extraordinaria: 50u Sierra Circular 7-1/4' 1800W",
    sku: "SKU-SIE-IND18",
    quantity: 50,
    unitPriceCop: 145000,
    totalCostCop: 7250000,
    amountFormatted: "$7.250.000 COP",
    supplier: "DeWalt Colombia (Mayorista Homologado)",
    leadTime: "2 días hábiles",
    policyTrigger: "Monto total excede el umbral autónomo de $5.000.000 COP (POL-COMP-01)",
    policyCode: "POL-COMP-01",
    explain: {
      context: "El punto de reorden en Bucaramanga y Bogotá se alcanzó simultáneamente tras un incremento de demanda del 28% por proyectos de infraestructura vial.",
      opportunityCost: "Ahorro negociado de $1.450.000 COP por consolidación de lote frente a compras individuales.",
    },
    diffImpact: {
      budgetBefore: "$42.8M disponible",
      budgetAfter: "$35.5M restante",
      stockBefore: "4 unidades (Riesgo Quiebre 2d)",
      stockAfter: "54 unidades (Cobertura 28d)",
      slaBefore: "92% cumplimiento",
      slaAfter: "98% cobertura proyectada",
    },
    hmacSignature: "9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f",
    status: "pendiente",
    timeline: [
      {
        title: "Detección de Quiebre Crítico ROP",
        time: "Hoy, 08:14 a. m.",
        description: "Monitoreo continuo identificó stock por debajo del mínimo de seguridad.",
        completed: true,
      },
      {
        title: "Cotización Algorítmica & Consolidación",
        time: "Hoy, 08:20 a. m.",
        description: "Mejor oferta seleccionada con DeWalt Colombia con descuento por volumen.",
        completed: true,
      },
      {
        title: "Retención en Gobernanza HITL",
        time: "Hoy, 08:22 a. m.",
        description: "Disparador POL-COMP-01: Requiere firma digital humana para montos > $5M COP.",
        completed: true,
      },
      {
        title: "Transmisión y Despacho ERP",
        time: "Pendiente de Aprobación",
        description: "Emisión de remisión y actualización de libro contable una vez firmada.",
        completed: false,
      },
    ],
  },
  {
    id: "DEC-2026-0042",
    orderNumber: "#OC-405",
    title: "Reabastecimiento preventivo: 1.200u Pernos Grado 8 1/2' x 3'",
    sku: "SKU-PER-HEX8",
    quantity: 1200,
    unitPriceCop: 2800,
    totalCostCop: 3360000,
    amountFormatted: "$3.360.000 COP",
    supplier: "Mundial de Tornillos S.A.S.",
    leadTime: "3 días hábiles",
    policyTrigger: "Suministro crítico para obras del Anillo Vial Metropolitano",
    policyCode: "POL-STK-04",
    explain: {
      context: "Consumo acelerado en CD Bucaramanga por entrega programada a consorcio vial.",
      opportunityCost: "Garantía de precio congelado por 60 días pactada con el proveedor.",
    },
    diffImpact: {
      budgetBefore: "$35.5M disponible",
      budgetAfter: "$32.1M restante",
      stockBefore: "12 unidades (Quiebre inminente)",
      stockAfter: "1.212 unidades (Cobertura 45d)",
      slaBefore: "88% cumplimiento",
      slaAfter: "99% cobertura",
    },
    hmacSignature: "4f5e6d7c8b9a0f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a",
    status: "pendiente",
    timeline: [
      {
        title: "Alerta de Consumo Acelerado",
        time: "Hoy, 09:30 a. m.",
        description: "Salida imprevista de 400 unidades para proyecto vial.",
        completed: true,
      },
      {
        title: "Formulación de Orden de Compra",
        time: "Hoy, 09:35 a. m.",
        description: "Condiciones de pago a 45 días aplicadas exitosamente.",
        completed: true,
      },
      {
        title: "Revisión en Bandeja de Gobernanza",
        time: "Hoy, 09:40 a. m.",
        description: "Esperando confirmación de despacho.",
        completed: true,
      },
      {
        title: "Emisión de Orden a Proveedor",
        time: "Pendiente",
        description: "Envío telemático automático tras aprobación.",
        completed: false,
      },
    ],
  },
];

interface HitlApprovalsViewProps {
  decisions?: HitlDecision[];
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onSimulateNew?: () => void;
}

export const HitlApprovalsView: React.FC<HitlApprovalsViewProps> = ({
  onApprove,
  onReject,
}) => {
  const [proposals, setProposals] = useState<EnrichedProposal[]>(DEFAULT_PROPOSALS);
  const [selectedId, setSelectedId] = useState<string>("DEC-2026-0041");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const currentIdx = proposals.findIndex((p) => p.id === selectedId);
  const selectedProposal = proposals[currentIdx] || proposals[0];

  const handlePrev = () => {
    const nextIdx = (currentIdx - 1 + proposals.length) % proposals.length;
    setSelectedId(proposals[nextIdx].id);
  };

  const handleNext = () => {
    const nextIdx = (currentIdx + 1) % proposals.length;
    setSelectedId(proposals[nextIdx].id);
  };

  const handleApprove = (id: string) => {
    setProposals((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "aprobado" } : p))
    );
    if (onApprove) onApprove(id);
    showToast(`Decisión ${id} aprobada con éxito. Orden de compra emitida al ERP.`);
  };

  const handleReject = (id: string) => {
    setProposals((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "rechazado" } : p))
    );
    if (onReject) onReject(id);
    showToast(`Decisión ${id} rechazada. Se notificó al especialista para reformular.`);
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-canvas text-[#F9FAFB] font-sans select-none overflow-hidden relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            className="fixed top-6 right-8 z-50 px-4 py-3 rounded-full flex items-center gap-3 bg-[#0A160E]/95 border border-[#10B981]/40 text-[#34D399] shadow-[0_0_25px_rgba(16,185,129,0.25)] backdrop-blur-xl"
          >
            <div className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
            <span className="text-xs font-mono font-medium tracking-tight">{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-[#8E9893] hover:text-[#F9FAFB] text-xs ml-1"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* HEADER SUPERIOR EJECUTIVO                                 */}
      {/* ========================================================= */}
      <header className="px-6 py-4 bg-canvas border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-20 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase text-zinc-400">Gobernanza</span>
            <span className="text-white/20">/</span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Aprobaciones & Control Humano (HITL)
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Supervisión explícita de órdenes de compra extraordinarias y excepciones operativas
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-1 border border-white/[0.06] text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-zinc-300">
              {proposals.filter((p) => p.status === "pendiente").length} Decisiones Pendientes de Firma
            </span>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* SPLIT-SCREEN 50 / 50 (ESTILO FIKRI SHP-5567)              */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative min-h-0">
        {/* ------------------------------------------------------- */}
        {/* PANEL IZQUIERDO (50%): DOSSIER OPERATIVO & HITOS        */}
        {/* ------------------------------------------------------- */}
        <div className="w-full lg:w-1/2 h-full bg-canvas overflow-y-auto p-6 flex flex-col gap-5 border-b lg:border-b-0 lg:border-r border-white/[0.06]">
          {/* Fila 1: Selector, Badges y Acciones */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-white font-mono">
                  {selectedProposal.id}
                </span>

                {selectedProposal.status === "pendiente" ? (
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Pendiente Firma
                  </span>
                ) : selectedProposal.status === "aprobado" ? (
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Aprobado
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5" />
                    Rechazado
                  </span>
                )}

                <div className="flex items-center bg-surface-1 rounded-lg border border-white/[0.08] p-0.5">
                  <button
                    onClick={handlePrev}
                    className="p-1 hover:bg-white/[0.06] rounded text-zinc-400 hover:text-white transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] font-mono px-1.5 text-zinc-400">
                    {currentIdx + 1}/{proposals.length}
                  </span>
                  <button
                    onClick={handleNext}
                    className="p-1 hover:bg-white/[0.06] rounded text-zinc-400 hover:text-white transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-zinc-400">
                Orden Vinculada:{" "}
                <span className="text-emerald-400 font-mono font-medium">
                  {selectedProposal.orderNumber}
                </span>{" "}
                · Proveedor:{" "}
                <span className="text-zinc-300 font-medium">
                  {selectedProposal.supplier}
                </span>
              </p>
            </div>

            {/* Acciones de Firma HITL */}
            {selectedProposal.status === "pendiente" && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleReject(selectedProposal.id)}
                  className="px-3 py-2 rounded-xl bg-surface-1 hover:bg-rose-500/15 text-xs font-medium text-zinc-300 hover:text-rose-400 border border-white/[0.08] hover:border-rose-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Rechazar</span>
                </button>
                <button
                  onClick={() => handleApprove(selectedProposal.id)}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs flex items-center gap-1.5 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>✓ Aprobar Ejecución</span>
                </button>
              </div>
            )}
          </div>

          {/* Fila 2: Tarjeta con Stepper de 4 Fases y 3 Métricas */}
          <div className="bg-surface-1 rounded-2xl p-5 border border-white/[0.06] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]">
            <h3 className="text-sm font-bold text-white mb-2">
              {selectedProposal.title}
            </h3>

            {/* Stepper de 4 Fases de Gobernanza */}
            <div className="bg-surface-well rounded-xl p-4 mt-3 border border-white/[0.04]">
              <div className="relative flex items-center justify-between">
                <div className="absolute top-1/2 left-4 right-4 h-1 bg-white/[0.08] -translate-y-1/2 z-0" />
                <div className="absolute top-1/2 left-4 h-1 bg-emerald-500 -translate-y-1/2 z-0 w-2/3" />

                {[
                  { label: "Detección IA", icon: Sparkles, status: "completed" },
                  { label: "Validación Reglas", icon: ShieldCheck, status: "completed" },
                  { label: "Firma HITL", icon: UserCheck, status: "current" },
                  { label: "Ejecución ERP", icon: CheckCircle2, status: "pending" },
                ].map((step, idx) => (
                  <div key={idx} className="relative z-10 flex flex-col items-center">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center ${
                        step.status === "completed"
                          ? "bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                          : step.status === "current"
                          ? "bg-surface-1 text-amber-400 border-2 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse"
                          : "bg-surface-1 text-zinc-500 border border-white/10"
                      }`}
                    >
                      <step.icon className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] font-semibold text-zinc-300 mt-2 whitespace-nowrap">
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Fila de 3 Métricas Clave */}
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/[0.06]">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-zinc-500 block mb-1">
                  Monto a Autorizar
                </span>
                <span className="text-sm font-bold text-white font-mono">
                  {selectedProposal.amountFormatted}
                </span>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-zinc-500 block mb-1">
                  Ahorro por Consolidación
                </span>
                <span className="text-sm font-semibold text-emerald-400 font-mono">
                  +$1.450.000 COP
                </span>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-zinc-500 block mb-1">
                  Confianza Algorítmica
                </span>
                <span className="text-sm font-semibold text-white font-mono">
                  99.2%
                </span>
              </div>
            </div>
          </div>

          {/* Fila 3: Callout Banner Contextual */}
          <div className="rounded-2xl p-4 bg-amber-500/10 border border-amber-500/30 text-amber-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <span className="font-bold block mb-0.5">
                  Disparador de Gobernanza: {selectedProposal.policyCode}
                </span>
                <p className="text-zinc-300">
                  {selectedProposal.policyTrigger}
                </p>
                <p className="text-zinc-400 mt-2">
                  <strong className="text-emerald-400">Justificación del Agente:</strong>{" "}
                  {selectedProposal.explain.context}
                </p>
              </div>
            </div>
          </div>

          {/* Fila 4: Bitácora de Eventos de la Propuesta */}
          <div className="bg-surface-1 rounded-2xl p-5 border border-white/[0.06] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]">
            <h3 className="text-sm font-bold text-white tracking-tight mb-4">
              Trazabilidad de la Propuesta
            </h3>
            <div className="relative pl-6 space-y-5">
              <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-white/[0.08]" />
              {selectedProposal.timeline.map((evt, idx) => (
                <div key={idx} className="relative">
                  <div
                    className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 ${
                      evt.completed
                        ? "bg-emerald-500 border-canvas shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                        : "bg-surface-well border-zinc-600"
                    }`}
                  />
                  <div className="flex items-center justify-between">
                    <h4 className={`text-xs font-bold ${evt.completed ? "text-white" : "text-zinc-500"}`}>
                      {evt.title}
                    </h4>
                    <span className="text-[11px] font-mono text-zinc-500">{evt.time}</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">{evt.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------- */}
        {/* PANEL DERECHO (50%): INSPECTOR VISUAL DE IMPACTO        */}
        {/* ------------------------------------------------------- */}
        <div className="w-full lg:w-1/2 h-full bg-[#070C09] overflow-y-auto p-6 flex flex-col gap-5">
          {/* Tarjeta de Comparativa Antes vs Después */}
          <div className="bg-surface-1 rounded-2xl p-5 border border-white/[0.06] shadow-xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.06]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Simulación de Impacto Operativo</span>
              </h3>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Sin Riesgo de Quiebre
              </span>
            </div>

            <div className="space-y-4 text-xs">
              {/* Presupuesto */}
              <div>
                <div className="flex justify-between text-zinc-400 mb-1">
                  <span>Presupuesto Mensual</span>
                  <span className="font-mono text-white">
                    {selectedProposal.diffImpact.budgetBefore} ➔ {selectedProposal.diffImpact.budgetAfter}
                  </span>
                </div>
                <div className="w-full h-2 bg-white/[0.08] rounded-full overflow-hidden flex">
                  <div className="h-full bg-emerald-500" style={{ width: "65%" }} />
                  <div className="h-full bg-hatched-emerald" style={{ width: "15%" }} />
                </div>
              </div>

              {/* Stock de Seguridad */}
              <div>
                <div className="flex justify-between text-zinc-400 mb-1">
                  <span>Stock y Cobertura de Días</span>
                  <span className="font-mono text-white">
                    {selectedProposal.diffImpact.stockBefore} ➔ {selectedProposal.diffImpact.stockAfter}
                  </span>
                </div>
                <div className="w-full h-2 bg-white/[0.08] rounded-full overflow-hidden flex">
                  <div className="h-full bg-amber-500" style={{ width: "12%" }} />
                  <div className="h-full bg-emerald-500" style={{ width: "76%" }} />
                </div>
              </div>

              {/* SLA de Servicio */}
              <div>
                <div className="flex justify-between text-zinc-400 mb-1">
                  <span>Cumplimiento de SLA a Clientes</span>
                  <span className="font-mono text-white">
                    {selectedProposal.diffImpact.slaBefore} ➔ {selectedProposal.diffImpact.slaAfter}
                  </span>
                </div>
                <div className="w-full h-2 bg-white/[0.08] rounded-full overflow-hidden flex">
                  <div className="h-full bg-emerald-500" style={{ width: "98%" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Tarjeta de Recibo Criptográfico con Firma HMAC-SHA256 */}
          <div className="bg-surface-1 rounded-2xl p-5 border border-white/[0.06] shadow-xl">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06]">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Recibo de Auditoría Criptográfica</span>
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                HMAC-SHA256
              </span>
            </div>

            <div className="bg-surface-well rounded-xl p-4 border border-white/[0.04] space-y-3 font-mono text-xs">
              <div>
                <span className="text-[10px] uppercase text-zinc-500 block">Firma Digital del Agente</span>
                <span className="text-emerald-400 text-[11px] break-all">
                  {selectedProposal.hmacSignature}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-white/[0.04]">
                <div>
                  <span className="text-zinc-500 block">Emisor</span>
                  <span className="text-white">MINT Autonomous Core</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Estado Criptográfico</span>
                  <span className="text-emerald-400 font-bold">Verificado ✓</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
