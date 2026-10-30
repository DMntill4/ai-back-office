import React from "react";
import { TabId } from "../../types/workflow";
import {
  GitFork,
  Network,
  History,
  Settings,
  Plus,
  ChevronDown,
  Sparkles,
  Bell,
  Target,
  FolderGit2,
  Boxes,
} from "lucide-react";

interface SidebarProps {
  currentTab: TabId;
  onSelectTab: (tab: TabId) => void;
  onNewWorkflow?: () => void;
  pendingApprovalsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onNewWorkflow,
  pendingApprovalsCount = 2,
}) => {
  const navItems = [
    { id: "workflows" as TabId, label: "Lienzo Operativo", icon: GitFork },
    { id: "graph" as TabId, label: "Mapa de Conocimiento", icon: Network },
    { id: "memory" as TabId, label: "Repositorio de Memoria", icon: FolderGit2 },
    { id: "stock" as TabId, label: "Inventario & Bodegas", icon: Boxes },
    {
      id: "inbox" as TabId,
      label: "Aprobaciones Ejecutivas",
      icon: Bell,
      badge: pendingApprovalsCount > 0 ? `${pendingApprovalsCount}` : undefined,
    },
    { id: "objectives" as TabId, label: "Metas & Objetivos", icon: Target },
    { id: "history" as TabId, label: "Auditoría & Trazabilidad", icon: History },
    { id: "settings" as TabId, label: "Configuración & Diagnóstico", icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-white/[0.06] bg-[#090D0B] flex flex-col justify-between p-4 z-20 flex-shrink-0 h-screen select-none">
      {/* Top Branding & Navigation */}
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#A3E635] via-[#10B981] to-[#047857] flex items-center justify-center shadow-[0_0_20px_rgba(163,230,53,0.3)] border border-lime-300/30">
            <Sparkles className="w-4 h-4 text-[#051F14] stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold tracking-tight text-white">Mint</span>
              <span className="text-[10px] font-sans font-semibold px-1.5 py-0.5 rounded-full bg-lime-400/15 text-lime-300 border border-lime-400/30">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">Coordinador Autónomo</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isSelected = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`relative w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#111915] text-white font-semibold border border-white/[0.06] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1 before:bg-emerald-400 before:rounded-r-full"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-[#111915]/50 font-medium"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isSelected ? "text-emerald-400" : "text-zinc-500"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.badge && (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {item.badge}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile & Action CTA */}
      <div className="space-y-4 pt-4 border-t border-white/[0.06]">
        {/* User Card */}
        <div className="flex items-center justify-between p-2 rounded-xl hover:bg-[#111915] border border-transparent hover:border-white/[0.06] transition-colors cursor-pointer group">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#111915] border border-white/[0.06] flex items-center justify-center text-xs font-bold text-emerald-400 font-mono">
              FS
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-zinc-200 group-hover:text-white transition-colors">
                Fernando S.
              </p>
              <p className="text-[11px] text-zinc-400">Director de Operaciones</p>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
        </div>

        {/* New Action Button: Donezo White Tactile Pill */}
        {onNewWorkflow && (
          <button
            onClick={onNewWorkflow}
            className="w-full pl-4 pr-1.5 py-2 rounded-full bg-white hover:bg-zinc-100 text-black font-semibold text-xs flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all cursor-pointer group"
          >
            <span>Nueva Operación</span>
            <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center transition-transform group-hover:rotate-90">
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            </span>
          </button>
        )}
      </div>
    </aside>
  );
};
