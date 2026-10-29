import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { HitlDecision } from "../../types/workflow";
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Clock,
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Search,
  Check,
  Copy,
  Sparkles,
  Sliders,
  X,
  FileText,
  KeyRound,
  Bot,
  User,
  GitBranch,
  Building2,
  Layers,
  Zap,
  TrendingDown,
  TrendingUp,
  FileCode,
  Archive,
  MessageSquare,
  HelpCircle,
} from "lucide-react";
import { Button } from "../ui/Button";

interface ProposalDiff {
  budgetBefore: string;
  budgetAfter: string;
  budgetDelta: string;
  stockBefore: string;
  stockAfter: string;
  stockDelta: string;
  slaBefore: string;
  slaAfter: string;
}

interface EnrichedProposal {
  id: string;
  orderNumber: string;
  specialist: string;
  specialistType: "compras" | "riesgo" | "logistica";
  title: string;
  sku: string;
  quantity: number;
  unitPriceCop: number;
  totalCostCop: number;
  amountCop: string;
  supplier: string;
  leadTime: string;
  waitingTime: string;
  telegramSync: {
    synced: boolean;
    chatId: string;
    msgId: string;
    syncTime: string;
  };
  policyTrigger: string;
  policyCode: string;
  autonomyLevel: string;
  explain: {
    context: string;
    signals: string[];
    opportunityCost: string;
  };
  diffImpact: ProposalDiff;
  hmacSignature: string;
  status: "pendiente" | "aprobado" | "rechazado";
}

const DEFAULT_PROPOSALS: EnrichedProposal[] = [
  {
    id: "DEC-004190f7",
    orderNumber: "#OC-402",
    specialist: "Compras Specialist",
    specialistType: "compras",
    title: "Orden de compra extraordinaria: 50u Sierra Circular 7-1/4' 1800W",
    sku: "SKU-SIE-IND18",
    quantity: 50,
    unitPriceCop: 145000,
    totalCostCop: 7250000,
    amountCop: "$7.250.000 COP",
    supplier: "Distribuciones Industriales de Santander",
    leadTime: "1 día hábil",
    waitingTime: "14 min en espera",
    telegramSync: {
      synced: true,
      chatId: "@mint_ops_santander",
      msgId: "tg_msg_88192",
      syncTime: "10:18 a. m.",
    },
    policyTrigger: "Monto excede el umbral autónomo de $5.000.000 COP (POL-01)",
    policyCode: "POL-01",
    autonomyLevel: "Modo Supervisado (Nivel 2 - HITL Requerido)",
    explain: {
      context:
        "Existencias en Bodega Matriz Bucaramanga por debajo del Punto de Reorden (ROP 20 unidades). Stock físico actual: 5 unidades con ritmo de consumo acelerado en el corredor metropolitano.",
      signals: [
        "Demanda proyectada: 1.4 un./día (acelerada por 2 contratos de obra civil en Girón y Floridablanca).",
        "Cobertura remanente: 3.5 días. Quiebre de stock proyectado para el viernes a las 11:30 AM sin reposición.",
        "Proveedor preferente con rating de calidad 96.4% y garantía de entrega local en 24 horas.",
      ],
      opportunityCost:
        "Riesgo de incumplimiento con 3 constructoras clave. Penalización contractual estimada en $3.400.000 COP más pérdida de margen comercial en Q4.",
    },
    diffImpact: {
      budgetBefore: "$45.200.000 COP",
      budgetAfter: "$37.950.000 COP",
      budgetDelta: "-$7.250.000 COP",
      stockBefore: "5 un. (quiebre inminente en 84h)",
      stockAfter: "55 un. (cobertura garantizada 39 días)",
      stockDelta: "+50 un.",
      slaBefore: "91.2% (riesgo penalización)",
      slaAfter: "98.4% (objetivo contractual superado)",
    },
    hmacSignature: "hmac_sha256_31a89c02ff1e92d84c1b9a88",
    status: "pendiente",
  },
  {
    id: "DEC-004185e2",
    orderNumber: "#OC-401",
    specialist: "Riesgo Specialist",
    specialistType: "riesgo",
    title: "Reabastecimiento preventivo: 9u Martillo Demoledor SDS-Max 1500W",
    sku: "SKU-MAN-SM400",
    quantity: 9,
    unitPriceCop: 420000,
    totalCostCop: 3780000,
    amountCop: "$3.780.000 COP",
    supplier: "Ferreterías Unidas Bogotá",
    leadTime: "2 días hábiles",
    waitingTime: "42 min en espera",
    telegramSync: {
      synced: true,
      chatId: "@mint_ops_santander",
      msgId: "tg_msg_88145",
      syncTime: "09:50 a. m.",
    },
    policyTrigger: "Proveedor interdepartamental sin anexo marco anual refrendado (POL-02)",
    policyCode: "POL-02",
    autonomyLevel: "Modo Supervisado (Nivel 2 - HITL Requerido)",
    explain: {
      context:
        "Stock físico en Bodega Matriz cayó a 1 unidad crítica frente a un ROP de 10 unidades. Cobertura remanente de tan solo 1.25 días de consumo.",
      signals: [
        "Detección de quiebre emitida por TelemetryWatcher tras consumo atípico en Santander.",
        "Flete consolidado Bogotá → Bucaramanga vía OSRM Pescadero optimizado (ahorro logístico del 14.8%).",
        "Ferreterías Unidas ofrece menor costo ($3.780.000 COP vs $4.100.000 de DeWalt Colombia), pero carece de addendum contractual 2026.",
      ],
      opportunityCost:
        "Desabastecimiento de rotomartillos pesados para alquiler y venta directa, con lucro cesante proyectado de $1.850.000 COP en 72 horas.",
    },
    diffImpact: {
      budgetBefore: "$37.950.000 COP",
      budgetAfter: "$34.170.000 COP",
      budgetDelta: "-$3.780.000 COP",
      stockBefore: "1 un. (quiebre inminente en 30h)",
      stockAfter: "10 un. (cobertura restablecida 14 días)",
      stockDelta: "+9 un.",
      slaBefore: "92.0% (alerta amarilla)",
      slaAfter: "99.1% (nivel óptimo verde)",
    },
    hmacSignature: "hmac_sha256_9f81a7b640192e44b801a2f9",
    status: "pendiente",
  },
];

interface HitlApprovalsViewProps {
  decisions?: (HitlDecision | any)[];
  onApprove?: (decisionId: string) => void;
  onReject?: (decisionId: string) => void;
  onSimulateNew?: () => void;
}

export const HitlApprovalsView: React.FC<HitlApprovalsViewProps> = ({
  decisions = [],
  onApprove,
  onReject,
  onSimulateNew,
}) => {
  const [proposals, setProposals] = useState<EnrichedProposal[]>(DEFAULT_PROPOSALS);
  const [selectedId, setSelectedId] = useState<string>("DEC-004190f7");
  const [copiedHmac, setCopiedHmac] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ text: string; type: "approve" | "reject" } | null>(null);

  // Modales
  const [isModifyModalOpen, setIsModifyModalOpen] = useState<boolean>(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState<boolean>(false);

  // Estado formulario de modificación
  const [modifyQty, setModifyQty] = useState<number>(50);
  const [modifyPrice, setModifyPrice] = useState<number>(145000);

  // Estado formulario de rechazo
  const [rejectReasonCategory, setRejectReasonCategory] = useState<string>("presupuesto");
  const [rejectFeedbackNote, setRejectFeedbackNote] = useState<string>("");

  const selectedProposal = useMemo(() => {
    return proposals.find((p) => p.id === selectedId) || proposals[0];
  }, [proposals, selectedId]);

  // Sincronizar estado inicial al abrir modal de modificación
  useEffect(() => {
    if (selectedProposal) {
      setModifyQty(selectedProposal.quantity);
      setModifyPrice(selectedProposal.unitPriceCop);
    }
  }, [selectedProposal]);

  // Teclado Ergonomía [A], [M], [R]
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el usuario está escribiendo en un input o textarea
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea") return;

      if (e.key === "a" || e.key === "A") {
        e.preventDefault();
        if (selectedProposal && selectedProposal.status === "pendiente") {
          handleExecuteApprove(selectedProposal.id);
        }
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        if (selectedProposal && selectedProposal.status === "pendiente") {
          setIsModifyModalOpen(true);
        }
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        if (selectedProposal && selectedProposal.status === "pendiente") {
          setIsRejectModalOpen(true);
        }
      } else if (e.key === "Escape") {
        setIsModifyModalOpen(false);
        setIsRejectModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedProposal]);

  const handleCopyHmac = (hash: string) => {
    navigator.clipboard?.writeText(hash);
    setCopiedHmac(hash);
    setTimeout(() => setCopiedHmac(null), 2000);
  };

  const handleExecuteApprove = (id: string) => {
    setProposals((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "aprobado" } : p))
    );
    if (onApprove) onApprove(id);

    setActionNotice({
      text: `Decisión ${id} autorizada con éxito. Token de firma HMAC-SHA256 emitido a PostgreSQL y orden transmitida a ${selectedProposal?.supplier}.`,
      type: "approve",
    });
    setTimeout(() => setActionNotice(null), 5000);
  };

  const handleConfirmModify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProposal) return;

    const newTotal = modifyQty * modifyPrice;
    setProposals((prev) =>
      prev.map((p) => {
        if (p.id === selectedProposal.id) {
          return {
            ...p,
            quantity: modifyQty,
            unitPriceCop: modifyPrice,
            totalCostCop: newTotal,
            amountCop: `$${newTotal.toLocaleString("es-CO")} COP`,
            diffImpact: {
              ...p.diffImpact,
              budgetAfter: `$${(45200000 - newTotal).toLocaleString("es-CO")} COP`,
              budgetDelta: `-$${newTotal.toLocaleString("es-CO")} COP`,
              stockAfter: `${5 + modifyQty} un. (recalibrado)`,
              stockDelta: `+${modifyQty} un.`,
            },
          };
        }
        return p;
      })
    );

    setIsModifyModalOpen(false);
    setActionNotice({
      text: `Parámetros de la decisión ${selectedProposal.id} recalculados: ${modifyQty} unidades a $${modifyPrice.toLocaleString("es-CO")} COP.`,
      type: "approve",
    });
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleConfirmReject = () => {
    if (!selectedProposal) return;

    setProposals((prev) =>
      prev.map((p) => (p.id === selectedProposal.id ? { ...p, status: "rechazado" } : p))
    );
    if (onReject) onReject(selectedProposal.id);

    setIsRejectModalOpen(false);
    setActionNotice({
      text: `Propuesta ${selectedProposal.id} rechazada y archivada en Vault (~/.mint/vaults/05-Decisiones/${selectedProposal.id}.md).`,
      type: "reject",
    });
    setRejectFeedbackNote("");
    setTimeout(() => setActionNotice(null), 5000);
  };

  const pendingCount = proposals.filter((p) => p.status === "pendiente").length;

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-[#050806] text-[#F9FAFB] font-sans select-none overflow-hidden">
      {/* 1. Header Bar Flowcraft con Indicador de HITL */}
      <div className="flex-none px-6 py-3.5 border-b border-white/[0.06] bg-[#0A0F0C]/80 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#8E9893] font-medium">Gobernanza</span>
            <span className="text-white/20">/</span>
            <span className="text-[#10B981] font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Supervisión Humana en el Bucle (HITL)
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white mt-0.5 flex items-center gap-2.5">
            Bandeja de Aprobaciones de Comando
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#10B981]/10 text-[#34D399] border border-[#10B981]/25 flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              {pendingCount} PROPUESTAS EN ESPERA
            </span>
          </h1>
          <p className="text-xs text-[#8E9893] mt-0.5">
            Decisiones operacionales de compra retenidas por el <code className="text-[#34D399] font-mono">policyEngine</code> para autorización con firma inmutable.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Badge de Sincronización Remota Telegram */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0E1511] border border-white/[0.08] text-xs">
            <Send className="w-3.5 h-3.5 text-blue-400" />
            <div className="text-left">
              <span className="text-white font-semibold text-[11px] block leading-tight">
                telegram_remote_approval
              </span>
              <span className="text-[9px] font-mono text-[#8E9893] block leading-tight">
                Bot en línea · @mint_ops_santander
              </span>
            </div>
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse ml-1" />
          </div>

          {onSimulateNew && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onSimulateNew}
              className="border-white/10 text-white hover:border-[#10B981]/40 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#34D399]" />
              <span className="text-xs font-semibold">Simular Propuesta</span>
            </Button>
          )}
        </div>
      </div>

      {/* Alerta de Acción Ejecutada */}
      <AnimatePresence>
        {actionNotice && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className={`flex-none px-6 py-2 flex items-center justify-between text-xs border-b ${
              actionNotice.type === "approve"
                ? "bg-[#10B981]/15 border-[#10B981]/30 text-[#34D399]"
                : "bg-red-500/15 border-red-500/30 text-red-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {actionNotice.type === "approve" ? (
                <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
              ) : (
                <Archive className="w-4 h-4 text-red-400" />
              )}
              <span className="font-medium font-mono">{actionNotice.text}</span>
            </div>
            <button onClick={() => setActionNotice(null)} className="text-white/40 hover:text-white">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Contenedor Split-View (40% Cola de Propuestas Abiertas + 60% Mesa de Decisión) */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* ========================================================
            COLUMNA IZQUIERDA: 40% COLA DE PROPUESTAS (openProposals)
           ======================================================== */}
        <div className="flex-1 lg:w-[40%] flex flex-col min-h-0 border-r border-white/[0.06] bg-[#050806]">
          {/* Header de la Cola */}
          <div className="flex-none px-4 py-3 border-b border-white/[0.06] bg-[#0A0F0C]/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-white">
                Cola de Propuestas Abiertas
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/30">
                {proposals.length}
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#8E9893]">
              Ordenadas por criticidad
            </span>
          </div>

          {/* Lista de Tarjetas de Propuestas */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
            {proposals.map((item) => {
              const isSelected = selectedProposal.id === item.id;
              const isPending = item.status === "pendiente";

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? "bg-[#10B981]/[0.06] border-white/20 shadow-[0_0_24px_rgba(16,185,129,0.12)] border-l-2 border-l-[#10B981]"
                      : "bg-[#0A0F0C] border-white/[0.06] hover:border-white/15 hover:bg-[#0E1511]"
                  }`}
                >
                  {/* Fila 1: ID de Decisión + Agente Solicitante + Tiempo */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded font-mono text-[11px] font-extrabold bg-white/[0.06] text-white border border-white/10">
                        {item.id}
                      </span>
                      <span className="text-white/20">·</span>
                      <span className="text-[10px] font-mono font-semibold text-[#34D399] flex items-center gap-1">
                        <Bot className="w-3 h-3 text-[#10B981]" />
                        {item.specialist}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] font-mono text-amber-400">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span>{item.waitingTime}</span>
                    </div>
                  </div>

                  {/* Fila 2: Título de Acción Propuesta */}
                  <h3 className="text-xs font-bold text-white leading-snug line-clamp-2 mb-1.5">
                    {item.title}
                  </h3>

                  {/* Fila 3: Proveedor & Monto en COP */}
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-white/[0.04]">
                    <span className="text-[11px] text-[#8E9893] truncate max-w-[180px]">
                      {item.supplier}
                    </span>
                    <span className="font-mono font-extrabold text-[#34D399] tabular-nums text-sm">
                      {item.amountCop}
                    </span>
                  </div>

                  {/* Fila 4: Badge de Sincronización Telegram */}
                  <div className="mt-2.5 pt-2 border-t border-white/[0.04] flex items-center justify-between text-[10px] font-mono">
                    <span className="text-[#8E9893] flex items-center gap-1.5">
                      <Send className="w-2.5 h-2.5 text-blue-400" />
                      <span>tg_remote_approval:</span>
                      <strong className="text-blue-300">synced</strong>
                    </span>

                    {isPending ? (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        RETENIDO HITL
                      </span>
                    ) : item.status === "aprobado" ? (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30 flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" />
                        AUTORIZADO
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500/15 text-red-300 border border-red-500/30 flex items-center gap-1">
                        ARCHIVADO
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================
            COLUMNA DERECHA: 60% INSPECTOR DE EJECUCIÓN DE DECISIÓN
           ======================================================== */}
        <div className="flex-1 lg:w-[60%] flex flex-col min-h-0 bg-[#070B08]">
          {/* Zona Scrolleable de Contenido Técnico */}
          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
            {/* 1. Cabecera de Propuesta */}
            <div className="p-5 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.3),transparent_70%)]" />

              <div className="relative z-10 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md font-mono text-xs font-black bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/40">
                      {selectedProposal.id}
                    </span>
                    <span className="text-white/20">·</span>
                    <span className="text-xs font-mono font-semibold text-white">
                      {selectedProposal.orderNumber}
                    </span>
                    <span className="text-white/20">·</span>
                    <span className="text-[11px] text-[#8E9893]">
                      Bodega Matriz Bucaramanga
                    </span>
                  </div>

                  <h2 className="text-lg font-extrabold text-white mt-2 leading-snug">
                    {selectedProposal.title}
                  </h2>

                  <div className="flex flex-wrap items-center gap-3 mt-2.5 text-xs">
                    <span className="text-[#8E9893]">
                      Proveedor: <strong className="text-white">{selectedProposal.supplier}</strong>
                    </span>
                    <span className="text-white/20">·</span>
                    <span className="text-[#8E9893]">
                      Plazo: <strong className="text-white font-mono">{selectedProposal.leadTime}</strong>
                    </span>
                    <span className="text-white/20">·</span>
                    <span className="text-[#8E9893]">
                      SKU: <strong className="text-[#34D399] font-mono">{selectedProposal.sku}</strong>
                    </span>
                  </div>
                </div>

                <div className="text-right flex-none">
                  <span className="text-[10px] text-[#8E9893] uppercase font-bold tracking-wider block">
                    Monto Total de Compra
                  </span>
                  <span className="font-mono text-2xl font-black text-[#34D399] tabular-nums block mt-0.5">
                    {selectedProposal.amountCop}
                  </span>
                  <span className="text-[10px] text-white/40 font-mono">
                    {selectedProposal.quantity} un. x ${selectedProposal.unitPriceCop.toLocaleString("es-CO")} COP
                  </span>
                </div>
              </div>

              {/* Banner de Disparo de Gobernanza */}
              <div className="mt-4 pt-3.5 border-t border-white/[0.06] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-amber-300">
                  <ShieldAlert className="w-4 h-4 text-amber-400 flex-none" />
                  <span className="font-semibold">
                    Disparador de Gobernanza:{" "}
                    <span className="text-white font-normal">{selectedProposal.policyTrigger}</span>
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/25">
                  {selectedProposal.autonomyLevel}
                </span>
              </div>
            </div>

            {/* 2. Bloque "Razonamiento del Agente" (explain.ts) */}
            <div className="p-5 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-[#34D399]" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-white">
                    Razonamiento del Agente (explain.ts)
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#8E9893]">
                  Inferencia cognitiva validada
                </span>
              </div>

              {/* Contexto Operacional */}
              <div className="p-3.5 rounded-xl bg-[#0E1511] border border-white/[0.04]">
                <span className="text-[10px] text-[#8E9893] uppercase font-bold block mb-1">
                  1. Contexto Operacional
                </span>
                <p className="text-xs text-white/90 leading-relaxed font-sans">
                  {selectedProposal.explain.context}
                </p>
              </div>

              {/* Señales de Datos Evaluadas */}
              <div className="p-3.5 rounded-xl bg-[#0E1511] border border-white/[0.04]">
                <span className="text-[10px] text-[#8E9893] uppercase font-bold block mb-2">
                  2. Señales de Telemetría & Variables Evaluadas
                </span>
                <ul className="space-y-1.5 text-xs text-[#8E9893]">
                  {selectedProposal.explain.signals.map((sig, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] mt-1.5 flex-none" />
                      <span className="text-white/80">{sig}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Costo de Oportunidad */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                <div className="flex items-center gap-1.5 text-amber-300 font-bold mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>3. Costo de Oportunidad (Impacto de No Aprobar)</span>
                </div>
                <p className="text-amber-200/90 leading-relaxed font-sans">
                  {selectedProposal.explain.opportunityCost}
                </p>
              </div>
            </div>

            {/* 3. Diff de Impacto Operativo (Estilo Git Diff Limpio) */}
            <div className="p-5 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-[#34D399]" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-white">
                    Diff de Impacto Operativo (decisionExecutionService)
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#34D399] bg-[#10B981]/10 px-2 py-0.5 rounded border border-[#10B981]/25">
                  POSTGRESQL MUTATION DIFF
                </span>
              </div>

              <p className="text-xs text-[#8E9893]">
                Proyección exacta de mutaciones en el ledger de la base de datos tras ejecutar la orden:
              </p>

              {/* Ventana Estilo Git Diff */}
              <div className="rounded-xl border border-white/[0.08] overflow-hidden bg-[#050806] font-mono text-xs divide-y divide-white/[0.04]">
                {/* 1. Presupuesto */}
                <div className="p-2.5 bg-white/[0.02] flex items-center justify-between text-[11px] text-[#8E9893] font-bold">
                  <span>VARIABLE: presupuesto_disponible_q4</span>
                  <span className="text-red-400">{selectedProposal.diffImpact.budgetDelta}</span>
                </div>
                <div className="px-3 py-1.5 bg-red-950/20 text-red-300 border-l-2 border-red-500">
                  - presupuesto_disponible_q4: {selectedProposal.diffImpact.budgetBefore}
                </div>
                <div className="px-3 py-1.5 bg-emerald-950/20 text-[#34D399] border-l-2 border-[#10B981]">
                  + presupuesto_disponible_q4: {selectedProposal.diffImpact.budgetAfter} ({selectedProposal.diffImpact.budgetDelta})
                </div>

                {/* 2. Inventario */}
                <div className="p-2.5 bg-white/[0.02] flex items-center justify-between text-[11px] text-[#8E9893] font-bold">
                  <span>VARIABLE: stock_sku_{selectedProposal.sku.toLowerCase().replace(/[^a-z0-9]/g, "_")}</span>
                  <span className="text-[#34D399]">{selectedProposal.diffImpact.stockDelta}</span>
                </div>
                <div className="px-3 py-1.5 bg-red-950/20 text-red-300 border-l-2 border-red-500">
                  - stock_inventario_actual: {selectedProposal.diffImpact.stockBefore}
                </div>
                <div className="px-3 py-1.5 bg-emerald-950/20 text-[#34D399] border-l-2 border-[#10B981]">
                  + stock_inventario_actual: {selectedProposal.diffImpact.stockAfter}
                </div>

                {/* 3. SLA */}
                <div className="p-2.5 bg-white/[0.02] flex items-center justify-between text-[11px] text-[#8E9893] font-bold">
                  <span>VARIABLE: sla_cumplimiento_despachos_santander</span>
                  <span className="text-[#34D399]">OPTIMIZADO</span>
                </div>
                <div className="px-3 py-1.5 bg-red-950/20 text-red-300 border-l-2 border-red-500">
                  - sla_cumplimiento_despachos: {selectedProposal.diffImpact.slaBefore}
                </div>
                <div className="px-3 py-1.5 bg-emerald-950/20 text-[#34D399] border-l-2 border-[#10B981]">
                  + sla_cumplimiento_despachos: {selectedProposal.diffImpact.slaAfter}
                </div>
              </div>
            </div>

            {/* 4. Panel de Autenticación Criptográfica HMAC */}
            <div className="p-4 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] flex items-center justify-between gap-3">
              <div className="overflow-hidden">
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-[#34D399]" />
                  <span className="text-[10px] text-[#8E9893] uppercase font-bold">
                    Hash Inmutable de Decisión (HMAC-SHA256)
                  </span>
                </div>
                <span className="font-mono text-xs text-white truncate block mt-1">
                  {selectedProposal.hmacSignature}
                </span>
              </div>

              <button
                onClick={() => handleCopyHmac(selectedProposal.hmacSignature)}
                className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white transition-colors flex-none"
                title="Copiar Hash"
              >
                {copiedHmac === selectedProposal.hmacSignature ? (
                  <Check className="w-4 h-4 text-[#10B981]" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* ========================================================
              BARRA DE ACCIÓN INFERIOR FIJA
             ======================================================== */}
          <div className="flex-none p-4 border-t border-white/[0.08] bg-[#0A0F0C]/95 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-[#8E9893]">
              <Lock className="w-3.5 h-3.5 text-[#34D399]" />
              <span>Autorizador: <strong className="text-white">Fernando S.</strong> (Token CCO activo)</span>
            </div>

            {selectedProposal.status === "pendiente" ? (
              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                {/* Botón destructivo sutil: Rechazar */}
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setIsRejectModalOpen(true)}
                  className="border-red-500/30 text-red-300 hover:bg-red-500/10 flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4 text-red-400" />
                  <span>Rechazar y Archivar en Vault</span>
                  <span className="text-[10px] bg-black/40 px-1.5 py-0.2 rounded font-mono text-red-400">[R]</span>
                </Button>

                {/* Botón secundario: Modificar Parámetros */}
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setIsModifyModalOpen(true)}
                  className="border-white/10 text-white hover:border-white/25 flex items-center gap-1.5"
                >
                  <Sliders className="w-4 h-4 text-[#34D399]" />
                  <span>Modificar Parámetros</span>
                  <span className="text-[10px] bg-black/40 px-1.5 py-0.2 rounded font-mono text-white/70">[M]</span>
                </Button>

                {/* Botón primario: Aprobar y Ejecutar */}
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => handleExecuteApprove(selectedProposal.id)}
                  className="flex items-center gap-2 shadow-[0_0_24px_rgba(16,185,129,0.35)]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Aprobar y Ejecutar</span>
                  <span className="text-[10px] bg-black/40 px-1.5 py-0.2 rounded font-mono text-white/90">[A]</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-mono font-bold ${
                    selectedProposal.status === "aprobado"
                      ? "bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/40"
                      : "bg-red-500/20 text-red-300 border border-red-500/40"
                  }`}
                >
                  {selectedProposal.status === "aprobado"
                    ? "ESTADO: AUTORIZADO Y TRANSMITIDO"
                    : "ESTADO: RECHAZADO Y ARCHIVADO"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================
          MODAL 1: MODIFICAR PARÁMETROS [M]
         ======================================================== */}
      <AnimatePresence>
        {isModifyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg rounded-2xl bg-[#0A0F0C] border border-[#10B981]/30 p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setIsModifyModalOpen(false)}
                className="absolute top-4 right-4 text-[#8E9893] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[#10B981]/15 text-[#34D399] flex items-center justify-center">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Modificar Parámetros de Propuesta
                  </h3>
                  <p className="text-xs text-[#8E9893]">
                    Ajusta cantidades o precios unitarios antes de autorizar y firmar.
                  </p>
                </div>
              </div>

              <form onSubmit={handleConfirmModify} className="space-y-4">
                <div className="p-3 rounded-xl bg-[#0E1511] border border-white/[0.04]">
                  <span className="text-[10px] text-[#8E9893] uppercase font-bold block">PROPUESTA</span>
                  <span className="font-bold text-white text-xs block mt-0.5">
                    {selectedProposal.id} - {selectedProposal.title}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-[#8E9893] font-semibold block mb-1">
                      CANTIDAD REQUERIDA (UNIDADES)
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={modifyQty}
                      onChange={(e) => setModifyQty(Number(e.target.value))}
                      className="w-full bg-[#0E1511] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#10B981]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-[#8E9893] font-semibold block mb-1">
                      COSTO UNITARIO NEGOCIADO (COP)
                    </label>
                    <input
                      type="number"
                      required
                      min={100}
                      step={500}
                      value={modifyPrice}
                      onChange={(e) => setModifyPrice(Number(e.target.value))}
                      className="w-full bg-[#0E1511] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-[#34D399] focus:outline-none focus:border-[#10B981]"
                    />
                  </div>
                </div>

                {/* Recálculo en Vivo */}
                <div className="p-3.5 rounded-xl bg-[#070B08] border border-white/[0.08] flex items-center justify-between font-mono">
                  <div>
                    <span className="text-[10px] text-[#8E9893] uppercase block">
                      Total Recalculado
                    </span>
                    <span className="text-base font-extrabold text-[#34D399]">
                      ${(modifyQty * modifyPrice).toLocaleString("es-CO")} COP
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#8E9893] uppercase block">
                      Delta Presupuesto
                    </span>
                    <span className="text-xs font-bold text-white">
                      {modifyQty * modifyPrice > selectedProposal.totalCostCop ? "+" : ""}
                      ${(modifyQty * modifyPrice - selectedProposal.totalCostCop).toLocaleString("es-CO")} COP
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.08]">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => setIsModifyModalOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" variant="primary" size="md">
                    Guardar Cambios y Continuar
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================
          MODAL 2: RECHAZAR Y ARCHIVAR EN VAULT [R]
         ======================================================== */}
      <AnimatePresence>
        {isRejectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md rounded-2xl bg-[#0A0F0C] border border-red-500/30 p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="absolute top-4 right-4 text-[#8E9893] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-red-500/15 text-red-400 flex items-center justify-center">
                  <Archive className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Rechazar y Archivar en Vault
                  </h3>
                  <p className="text-xs text-[#8E9893]">
                    Se generará una nota de contradicción en Obsidian Vault para aprendizaje del agente.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-[#0E1511] border border-white/[0.04]">
                  <span className="text-[10px] text-[#8E9893] uppercase font-bold block">PROPUESTA</span>
                  <span className="font-bold text-white text-xs block mt-0.5">
                    {selectedProposal.id} - {selectedProposal.amountCop}
                  </span>
                </div>

                <div>
                  <label className="text-[11px] text-[#8E9893] font-semibold block mb-1">
                    CAUSA DE RECHAZO
                  </label>
                  <select
                    value={rejectReasonCategory}
                    onChange={(e) => setRejectReasonCategory(e.target.value)}
                    className="w-full bg-[#0E1511] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="presupuesto">Presupuesto restringido para el período (Q4)</option>
                    <option value="precio">Precio de proveedor no competitivo (FOB alto)</option>
                    <option value="rebalanceo">Priorizar transferencia inter-sede desde CD Bogotá</option>
                    <option value="especificacion">Especificación técnica obsoleta o en revisión</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-[#8E9893] font-semibold block mb-1">
                    RETROALIMENTACIÓN PARA EL AGENTE (FEEDBACK NOTA VAULT)
                  </label>
                  <textarea
                    rows={3}
                    value={rejectFeedbackNote}
                    onChange={(e) => setRejectFeedbackNote(e.target.value)}
                    placeholder="Ej: Negociar descuento del 6% por pago de contado o buscar alternativas de entrega consolidada..."
                    className="w-full bg-[#0E1511] border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-[#8E9893]/60 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => setIsRejectModalOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={handleConfirmReject}
                    className="border-red-500/40 text-red-300 hover:bg-red-500/20"
                  >
                    Confirmar Rechazo y Archivar
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
