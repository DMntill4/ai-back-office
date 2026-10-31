import React, { useEffect, useMemo, useRef, useState } from "react";
import { Bell, CheckCircle2, Boxes, Sparkles, Settings, CheckCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export type NotificationKind = "approval" | "stock" | "agent";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  detail: string;
  time: string;
  /** Destino al hacer clic en el aviso. */
  targetTab: string;
}

const KIND_ICON: Record<NotificationKind, React.ComponentType<{ className?: string }>> = {
  approval: CheckCircle2,
  stock: Boxes,
  agent: Sparkles,
};

const KIND_COLOR: Record<NotificationKind, string> = {
  approval: "text-state-pending",
  stock: "text-state-attention",
  agent: "text-brand",
};

interface Props {
  notifications: AppNotification[];
  onSelectTab: (tabId: string) => void;
}

/**
 * Campana con lista real de avisos. Antes el botón solo saltaba a Aprobaciones;
 * ahora abre un panel, cada aviso lleva a su propio destino y se puede marcar
 * como leído.
 */
export const NotificationsPopover: React.FC<Props> = ({ notifications, onSelectTab }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !readIds.has(n.id)).length,
    [notifications, readIds]
  );

  const markAllRead = () => setReadIds(new Set(notifications.map((n) => n.id)));

  const open = (n: AppNotification) => {
    setReadIds((prev) => new Set(prev).add(n.id));
    setIsOpen(false);
    onSelectTab(n.targetTab);
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className={`relative w-8 h-8 rounded-control bg-raised border flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
          isOpen ? "text-brand border-brand" : "text-secondary hover:text-primary hover:bg-panel border-border"
        }`}
        title="Notificaciones"
        aria-label={`Notificaciones${unreadCount ? `, ${unreadCount} sin leer` : ""}`}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-pill bg-brand text-caption font-bold text-action-text flex items-center justify-center px-1 ring-2 ring-panel">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 mt-2 w-[360px] max-w-[92vw] rounded-container bg-raised border border-strong shadow-popover z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-base py-compact border-b border-border">
              <span className="text-label font-semibold text-primary">Notificaciones</span>
              <button
                onClick={markAllRead}
                disabled={unreadCount === 0}
                className="flex items-center gap-1 text-caption text-secondary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Marcar todo como leído
              </button>
            </div>

            <div data-lenis-prevent className="max-h-[360px] overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="px-base py-group text-center text-caption text-muted">
                  No tienes avisos pendientes.
                </div>
              ) : (
                notifications.map((n) => {
                  const Icon = KIND_ICON[n.kind];
                  const isRead = readIds.has(n.id);
                  return (
                    <button
                      key={n.id}
                      onClick={() => open(n)}
                      className="w-full text-left flex items-start gap-compact px-base py-compact border-b border-border last:border-b-0 hover:bg-panel transition-colors cursor-pointer"
                    >
                      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${KIND_COLOR[n.kind]}`} />
                      <div className="min-w-0 flex-1">
                        <p className={`text-caption leading-snug ${isRead ? "text-secondary" : "text-primary font-medium"}`}>
                          {n.title}
                        </p>
                        <p className="text-caption text-muted mt-hairline line-clamp-2">{n.detail}</p>
                        <p className="text-caption font-mono text-muted mt-hairline">{n.time}</p>
                      </div>
                      {!isRead && <span className="w-2 h-2 mt-1.5 rounded-pill bg-brand shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between px-base py-compact border-t border-border bg-panel/60">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onSelectTab("aprobaciones");
                }}
                className="text-caption text-secondary hover:text-primary cursor-pointer"
              >
                Ver aprobaciones
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  onSelectTab("preferencias");
                }}
                className="flex items-center gap-1 text-caption text-secondary hover:text-primary cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                Ajustar avisos
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
