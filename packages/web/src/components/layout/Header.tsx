import React, { useState } from "react";
import { ModeTab } from "../../types/workflow";
import { Search, Bell, Sparkles, ChevronDown } from "lucide-react";

interface HeaderProps {
  currentMode?: ModeTab;
  onSelectMode?: (mode: ModeTab) => void;
  isActive?: boolean;
  onToggleActive?: () => void;
  onSave?: () => void;
  isSaved?: boolean;
  onToggleTerminal?: () => void;
  isTerminalOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleTerminal,
  isTerminalOpen,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <header className="h-14 border-b border-white/[0.06] bg-[#090D0B] px-5 flex items-center justify-between z-20 select-none">
      {/* Left: Breadcrumb / System Identifier */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-white tracking-wide">
            Ferretería Industrial Santandereana
          </span>
        </div>
        <span className="text-zinc-600">/</span>
        <span className="text-xs text-zinc-400 font-medium">Bucaramanga Matriz</span>
      </div>

      {/* Center: Search input styled with #111915 rounded-xl */}
      <div className="hidden md:flex items-center max-w-md w-full mx-6">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar insumos, órdenes de compra, proveedores..."
            className="w-full bg-[#111915] border border-white/[0.06] hover:border-white/[0.12] focus:border-emerald-500/50 rounded-xl pl-9 pr-12 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none transition-all shadow-inner"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-zinc-400">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right: Circular action icons & Profile */}
      <div className="flex items-center gap-3">
        {/* Toggle Terminal / Observabilidad Button */}
        {onToggleTerminal && (
          <button
            onClick={onToggleTerminal}
            className={`w-9 h-9 rounded-full bg-[#111915] border border-white/[0.06] flex items-center justify-center transition-colors cursor-pointer ${
              isTerminalOpen ? "text-emerald-400 border-emerald-500/40" : "text-zinc-400 hover:text-white"
            }`}
            title="Consola de telemetría (Ctrl+J)"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        )}

        {/* Circular Notifications Button */}
        <button
          className="relative w-9 h-9 rounded-full bg-[#111915] border border-white/[0.06] flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
          title="Notificaciones y alertas de stock"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400" />
        </button>

        <div className="h-5 w-px bg-white/[0.06]" />

        {/* Profile Avatar & Info */}
        <div className="flex items-center gap-2.5 pl-1 cursor-pointer group">
          <div className="w-9 h-9 rounded-full bg-[#111915] border border-white/[0.06] flex items-center justify-center text-xs font-bold text-emerald-400 font-mono ring-1 ring-emerald-500/20">
            FS
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-semibold text-zinc-200 group-hover:text-white transition-colors leading-tight">
              Fernando S.
            </p>
            <p className="text-[10px] text-zinc-500 leading-none mt-0.5">
              Director de Operaciones
            </p>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
        </div>
      </div>
    </header>
  );
};
