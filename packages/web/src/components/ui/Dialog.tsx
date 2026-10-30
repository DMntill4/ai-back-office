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
          className="fixed inset-0 z-50 flex items-center justify-center p-base"
        >
          {/* Fondo oscuro sin desenfoque */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-canvas/80"
          />

          {/* Contenedor del Diálogo: max-w-lg (32rem), fondo raised, radio container, shadow dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-lg rounded-container bg-raised border border-border shadow-dialog p-group z-10 space-y-group"
          >
            <div className="flex items-start justify-between gap-compact">
              <div>
                <h2 className="text-section-title font-bold text-primary tracking-tight">
                  {title}
                </h2>
                {description && (
                  <p className="text-body text-secondary mt-hairline">
                    {description}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-compact rounded-control text-secondary hover:text-primary hover:bg-panel transition-colors cursor-pointer"
                title="Cerrar diálogo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {children && <div className="text-body text-primary">{children}</div>}

            {(confirmLabel || onConfirm) && (
              <div className="flex items-center justify-end gap-compact pt-compact border-t border-border">
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

