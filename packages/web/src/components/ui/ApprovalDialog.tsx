import React from "react";
import { Button } from "./Button";
import { StatusBadge } from "./StatusBadge";
import { X, ShieldCheck, Lock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface ApprovalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  orderNumber: string;
  amountCop: string;
  supplier: string;
  leadTime: string;
  destinationWarehouse: string;
  impactReason: string;
  onApprove: () => void;
  onReject: () => void;
  isProcessing?: boolean;
}

export const ApprovalDialog: React.FC<ApprovalDialogProps> = ({
  isOpen,
  onClose,
  title,
  orderNumber,
  amountCop,
  supplier,
  leadTime,
  destinationWarehouse,
  impactReason,
  onApprove,
  onReject,
  isProcessing = false,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
        >
          {/* Backdrop with Motion Fade */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 cursor-pointer"
          />

          {/* Dialog Card with Motion Scale & Slide */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl bg-forest-surface border border-forest-borderBright shadow-dialog overflow-hidden z-10"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-forest-border flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="w-8 h-8 rounded-control bg-state-pending-surface border border-state-pending/30 flex items-center justify-center text-state-pending">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-txt-primary">{title}</h3>
                  <p className="text-caption text-muted">
                    Supera el umbral autónomo de $5.000.000 COP
                  </p>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={onClose}
                className="p-1 rounded-full text-txt-tertiary hover:text-txt-primary hover:bg-forest-card transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Content */}
            <div className="min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
              {/* Card Resumen de la Orden */}
              <div className="p-4 rounded-xl bg-forest-card border border-forest-border space-y-2.5">
                <div className="flex flex-col gap-hairline sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-txt-secondary font-medium">Orden de compra</span>
                  <span className="font-mono text-txt-primary font-bold">{orderNumber}</span>
                </div>
                <div className="flex flex-col gap-hairline sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-txt-secondary font-medium">Monto propuesto</span>
                  <span className="font-mono text-base font-extrabold text-txt-primary tabular-nums">
                    {amountCop}
                  </span>
                </div>
                <div className="flex flex-col gap-hairline sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-txt-secondary font-medium">Proveedor</span>
                  <span className="text-txt-primary font-medium">{supplier}</span>
                </div>
                <div className="flex flex-col gap-hairline sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-txt-secondary font-medium">Tiempo de reposición</span>
                  <span className="font-mono text-txt-primary">{leadTime}</span>
                </div>
                <div className="flex flex-col gap-hairline sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-txt-secondary font-medium">Bodega destino</span>
                  <span className="text-txt-primary">{destinationWarehouse}</span>
                </div>
              </div>

              {/* Justificación y Guardrail */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-txt-secondary block">
                  Justificación del agente
                </span>
                <p className="text-xs text-txt-primary leading-relaxed p-3 rounded-xl bg-forest-card/60 border border-forest-border">
                  {impactReason}
                </p>
              </div>

              {/* Criptografía */}
              <div className="p-compact rounded-control bg-raised border border-border flex items-center gap-compact text-caption text-secondary">
                <Lock className="w-3.5 h-3.5 text-brand flex-shrink-0" />
                <span>
                  La autorización generará una firma inmutable <strong className="font-mono text-txt-primary">HMAC-SHA256</strong> asociada a la sesión de Fernando S.
                </span>
              </div>
            </div>

            {/* Footer con Botones Flowcraft */}
            <div className="px-4 sm:px-5 py-3.5 bg-forest-card/40 border-t border-forest-border flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3">
              <Button
                variant="secondary"
                size="md"
                onClick={onReject}
                disabled={isProcessing}
              >
                Rechazar propuesta
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={onApprove}
                disabled={isProcessing}
              >
                {isProcessing ? "Firmando..." : "Autorizar orden"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
