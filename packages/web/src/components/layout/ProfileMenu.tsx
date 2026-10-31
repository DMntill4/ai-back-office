import React, { useEffect, useRef, useState } from "react";
import { User, SlidersHorizontal, BellRing, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useUserSettings, getInitials } from "../../hooks/useUserSettings";

interface Props {
  companyName: string;
  onSelectTab: (tabId: string) => void;
}

/** Avatar con menú: perfil, preferencias y avisos. Antes no abría nada. */
export const ProfileMenu: React.FC<Props> = ({ companyName, onSelectTab }) => {
  const { profile } = useUserSettings();
  const [isOpen, setIsOpen] = useState(false);
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

  const go = (tab: string) => {
    setIsOpen(false);
    onSelectTab(tab);
  };

  const items = [
    { id: "mi_perfil", label: "Mi perfil", icon: User },
    { id: "preferencias", label: "Preferencias", icon: SlidersHorizontal },
    { id: "canales_notificaciones", label: "Canales de alerta", icon: BellRing },
  ];

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className="flex h-8 items-center gap-compact pl-1 pr-compact rounded-control hover:bg-raised transition-colors cursor-pointer group"
        title="Cuenta"
      >
        <div className="w-8 h-8 rounded-pill bg-panel border border-brand ring-1 ring-border flex items-center justify-center text-caption font-bold text-brand">
          {getInitials(profile.fullName)}
        </div>
        <div className="hidden flex-col gap-0.5 text-left sm:flex">
          <p className="text-caption font-semibold text-primary group-hover:text-brand transition-colors leading-tight whitespace-nowrap">
            {profile.fullName}
          </p>
          <p className="text-caption text-muted leading-none whitespace-nowrap">
            {profile.role}
          </p>
        </div>
        <ChevronDown className={`hidden sm:block w-3.5 h-3.5 text-secondary transition-transform duration-150 group-hover:text-primary ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 mt-2 w-64 rounded-container bg-raised border border-strong shadow-popover p-compact z-50"
          >
            <div className="px-2.5 py-2 border-b border-border mb-compact">
              <p className="text-label font-semibold text-primary truncate">{profile.fullName}</p>
              <p className="text-caption text-secondary truncate">{profile.role}</p>
              <p className="text-caption text-muted truncate mt-hairline">{companyName}</p>
            </div>
            {items.map((it) => {
              const Icon = it.icon;
              return (
                <button
                  key={it.id}
                  onClick={() => go(it.id)}
                  className="w-full flex items-center gap-compact px-2.5 py-2 rounded-control text-caption text-secondary hover:text-primary hover:bg-panel transition-colors cursor-pointer"
                >
                  <Icon className="w-3.5 h-3.5 text-brand" />
                  {it.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
