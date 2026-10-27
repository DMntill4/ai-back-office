import React, { useState } from "react";
import { HitlDecision } from "../../types/workflow";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Database,
  Truck,
  DollarSign,
  AlertTriangle,
  KeyRound,
  FileCheck2,
  Lock,
  GitCommit,
  Terminal,
} from "lucide-react";

interface HitlApprovalsViewProps {
  decisions: HitlDecision[];
  onApproveDecision: (decisionId: string) => void;
  onRejectDecision: (decisionId: string) => void;
}

export const HitlApprovalsView: React.FC<HitlApprovalsViewProps> = ({
  decisions,
  onApproveDecision,
  onRejectDecision,
}) => {
  const [filter, setFilter] = useState<"pendiente" | "todos">("pendiente");
  const [lastAction, setLastAction] = useState<string | null>(null);

  const filtered =
    filter === "pendiente"
      ? decisions.filter((d) => d.status === "pendiente")
      : decisions;

  const totalPendingAmount = decisions
    .filter((d) => d.status === "pendiente")
    .reduce((sum, d) => sum + d.totalCostCop, 0);

  const handleApproveWithFeedback = (id: string) => {
    onApproveDecision(id);
    setLastAction(`Decisión #${id} autorizada con firma HMAC-SHA256 en PostgreSQL.`);
    setTimeout(() => setLastAction(null), 4000);
  };

  const handleRejectWithFeedback = (id: string) => {
    onRejectDecision(id);
    setLastAction(`Decisión #${id} rechazada. Registro inmutable archivado.`);
    setTimeout(() => setLastAction(null), 4000);
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-8 bg-[#070c09] space-y-6 select-none max-w-5xl mx-auto">
      {/* Header & KPI Summary */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-950 text-amber-400 border border-amber-500/30">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Bandeja de Aprobaciones HITL
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800/60 font-bold">
              MINT INBOX
            </span>
          </div>
          <p className="text-xs text-gray-400">
            Autorización ejecutiva de compras y mutaciones en base de datos protegidas por firma HMAC-SHA256 y guardrails de política.
          </p>
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center p-1 rounded-xl bg-[#0d1611] border border-[#1b3425] text-xs font-mono">
          <button
            onClick={() => setFilter("pendiente")}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              filter === "pendiente"
                ? "bg-[#163322] text-mint-300 border border-[#234e34]"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Pendientes ({decisions.filter((d) => d.status === "pendiente").length})
          </button>
          <button
            onClick={() => setFilter("todos")}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              filter === "todos"
                ? "bg-[#163322] text-mint-300 border border-[#234e34]"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            Historial Completo ({decisions.length})
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-[#0c1410] border border-[#182c20]">
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block mb-1">
            Monto Pendiente de Firma
          </span>
          <span className="text-lg font-bold font-mono text-mint-300">
            ${totalPendingAmount.toLocaleString("es-CO")} COP
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#0c1410] border border-[#182c20]">
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block mb-1">
            Umbral de Autonomía Activo
          </span>
          <span className="text-lg font-bold font-mono text-white">
            $5,000,000 COP
          </span>
          <span className="text-[10px] font-mono text-gray-500 block mt-0.5">
            Exceso requiere aprobación humana
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#0c1410] border border-[#182c20]">
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block mb-1">
            Gobernanza Criptográfica
          </span>
          <span className="text-xs font-mono text-mint-400 font-bold flex items-center gap-1.5 mt-1">
            <Lock className="w-3.5 h-3.5" />
            <span>Firma HMAC-SHA256 Activa</span>
          </span>
          <span className="text-[10px] font-mono text-gray-500 block mt-0.5">
            Idempotencia de 1 solo uso
          </span>
        </div>
      </div>

      {/* Action Notification Toast */}
      {lastAction && (
        <div className="p-3 rounded-xl bg-[#0e2417] border border-mint-500/40 text-xs font-mono text-mint-300 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-mint-400 flex-shrink-0" />
          <span>{lastAction}</span>
        </div>
      )}

      {/* Pending Approval Cards List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-[#0a110d] border border-[#16271e] space-y-2">
            <CheckCircle2 className="w-8 h-8 text-mint-400 mx-auto" />
            <h4 className="text-sm font-bold text-gray-200">
              No hay decisiones pendientes en la bandeja
            </h4>
            <p className="text-xs text-gray-500">
              Todas las operaciones formuladas han sido autorizadas o resueltas autónomamente bajo umbral de política.
            </p>
          </div>
        ) : (
          filtered.map((dec) => {
            const isPending = dec.status === "pendiente";
            return (
              <div
                key={dec.id}
                className={`p-5 rounded-2xl border shadow-lg space-y-4 transition-all ${
                  isPending
                    ? "bg-[#0b140f] border-[#1b3425]"
                    : dec.status === "aprobado"
                    ? "bg-[#09110c] border-[#162e20] opacity-90"
                    : "bg-[#120a0a] border-[#311616] opacity-80"
                }`}
              >
                {/* Header: ID, Status, Date */}
                <div className="flex items-center justify-between pb-3 border-b border-[#15291d]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#102418] text-mint-300 font-bold border border-[#1a4029]">
                      PO #{dec.id}
                    </span>
                    <span className="text-xs font-mono text-gray-500">
                      Caso: {dec.caseId}
                    </span>
                    <span className="text-[10px] font-mono text-gray-600 hidden sm:inline">
                      CLI: <code className="text-gray-400">mint inbox approve {dec.id}</code>
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-gray-400">
                      {dec.createdAt}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        isPending
                          ? "bg-[#2c200b] text-amber-300 border border-[#483412]"
                          : dec.status === "aprobado"
                          ? "bg-[#0d2616] text-mint-300 border border-[#174627]"
                          : "bg-[#2b1010] text-red-300 border border-[#481616]"
                      }`}
                    >
                      {dec.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Body Content */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-white leading-snug">
                        {dec.title}
                      </h3>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">
                        SKU: <strong className="text-gray-200">{dec.sku}</strong> • Cantidad:{" "}
                        <strong className="text-mint-300">{dec.quantity} unidades</strong>
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="text-[10px] font-mono text-gray-400 uppercase block">
                        Costo Total Comprometido
                      </span>
                      <span className="text-base font-bold font-mono text-mint-300">
                        ${dec.totalCostCop.toLocaleString("es-CO")} COP
                      </span>
                      <span className="text-[10px] font-mono text-gray-500 block">
                        (${dec.unitPriceCop.toLocaleString("es-CO")} COP/u)
                      </span>
                    </div>
                  </div>

                  {/* Supplier & Logistics Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs font-mono bg-[#08100c] p-3 rounded-xl border border-[#14261c]">
                    <div>
                      <span className="text-gray-500 text-[10px] block">PROVEEDOR HOMOLOGADO</span>
                      <span className="text-gray-200 font-bold">{dec.supplierName}</span>
                      <span className="text-gray-500 text-[10px] block">{dec.supplierCity}</span>
                    </div>

                    <div>
                      <span className="text-gray-500 text-[10px] block">INVENTARIO & COBERTURA</span>
                      <span className="text-gray-200">
                        Stock: {dec.currentStock}u <span className="text-gray-500">→</span> Proyectado:{" "}
                        <strong className="text-mint-400">{dec.currentStock + dec.quantity}u</strong>
                      </span>
                      <span className="text-gray-500 text-[10px] block">
                        Punto Reorden (ROP): {dec.ropThreshold}u
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-500 text-[10px] block">AUDITORÍA DE RIESGO</span>
                      <span className="text-mint-400 font-bold">
                        Score: {(dec.riskScore * 100).toFixed(0)}% (Seguro)
                      </span>
                      <span className="text-gray-500 text-[10px] block">Lead Time: {dec.leadTimeDays} días</span>
                    </div>
                  </div>

                  {/* Justification & Policy Reason */}
                  <div className="p-2.5 rounded-xl bg-[#09120d] border border-[#162a1f] text-xs text-gray-300 font-mono flex items-start gap-2">
                    <span className="text-mint-400 font-bold flex-shrink-0">[POLICY ENGINE]</span>
                    <span>{dec.policyReason}</span>
                  </div>

                  {/* PRODUCTION IMPACT DIFF CARD (PostgreSQL Invariants) */}
                  <div className="p-3.5 rounded-xl bg-[#070d0a] border border-[#14261c] text-[11px] font-mono space-y-2">
                    <div className="flex items-center justify-between text-gray-400 text-[10px] font-bold uppercase tracking-wider pb-1 border-b border-[#112017]">
                      <div className="flex items-center gap-1.5 text-mint-400">
                        <Database className="w-3 h-3" />
                        <span>Ficha de Impacto en Producción (PostgreSQL Diff)</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-400">
                        <KeyRound className="w-3 h-3 text-mint-500" />
                        <span>Firma HMAC: <strong className="text-mint-400">{dec.hmacSignature}</strong></span>
                      </div>
                    </div>

                    {/* Pre vs Post Diff Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      {/* Before State */}
                      <div className="p-2.5 rounded-lg bg-[#060a08] border border-[#121f17] space-y-1">
                        <span className="text-[10px] text-gray-500 font-bold block uppercase">
                          Antes de la Firma:
                        </span>
                        <div className="text-gray-400 space-y-0.5 text-[10px]">
                          <p>• <code className="text-gray-300">purchase_orders</code>: 0 registros para #{dec.id}</p>
                          <p>• <code className="text-gray-300">inventory.stock</code>: {dec.currentStock} unidades (alerta ROP)</p>
                          <p>• <code className="text-gray-300">decisions.status</code>: "pendiente"</p>
                        </div>
                      </div>

                      {/* After State */}
                      <div className="p-2.5 rounded-lg bg-[#08150f] border border-[#193a26] space-y-1">
                        <span className="text-[10px] text-mint-400 font-bold block uppercase">
                          Después de la Firma (Mutación Atómica):
                        </span>
                        <div className="text-gray-300 space-y-0.5 text-[10px]">
                          <p>+ <code className="text-mint-300">purchase_orders</code>: 1 registro ("abierta", ${dec.totalCostCop.toLocaleString("es-CO")} COP)</p>
                          <p>+ <code className="text-mint-300">shipments</code>: guía origen {dec.supplierCity} (3 días)</p>
                          <p>+ <code className="text-mint-300">decisions.status</code>: "aprobado" (HMAC validado)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                {isPending && (
                  <div className="pt-3 border-t border-[#15291d] flex flex-wrap items-center justify-between gap-3">
                    <span className="text-[10px] font-mono text-gray-500">
                      Al autorizar, Mint despachará la orden y notificará vía webhook.
                    </span>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleRejectWithFeedback(dec.id)}
                        className="px-4 py-2 rounded-xl border border-red-900/60 hover:bg-red-950/40 text-red-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Rechazar (mint inbox reject)</span>
                      </button>

                      <button
                        onClick={() => handleApproveWithFeedback(dec.id)}
                        className="px-5 py-2 rounded-xl bg-mint-500 hover:bg-mint-400 text-black text-xs font-bold transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(34,197,94,0.3)] active:scale-95"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Aprobar & Firmar HMAC (mint inbox approve)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
