import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { Button } from "./Button";

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  isDestructive?: boolean;
  isProcessing?: boolean;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel = "Cancelar",
  onConfirm,
  isDestructive = false,
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
          {/* Fondo oscuro con desenfoque coherente */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70"
          />

          {/* Contenedor del Diálogo: superficie tarjeta #111915, filete white/10, sombra profunda */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            data-lenis-prevent
            className="relative mx-auto w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-panel border border-white/10 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.75)] p-4 sm:p-6 z-10 space-y-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-[17px] font-bold text-primary tracking-tight">
                  {title}
                </h2>
                {description && (
                  <p className="text-[13px] text-zinc-400 mt-1 leading-relaxed">
                    {description}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer shrink-0"
                title="Cerrar diálogo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {children && <div className="text-[13px] text-primary">{children}</div>}

            {(confirmLabel || onConfirm) && (
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t border-white/[0.08]">
                <Button variant="ghost" onClick={onClose} disabled={isProcessing}>
                  {cancelLabel}
                </Button>
                {onConfirm && (
                  <Button
                    variant={isDestructive ? "destructive" : "primary"}
                    onClick={onConfirm}
                    disabled={isProcessing}
                  >
                    {isProcessing ? "Procesando..." : confirmLabel || title}
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
