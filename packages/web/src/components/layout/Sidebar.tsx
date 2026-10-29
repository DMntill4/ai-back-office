import React from "react";
import { TabId } from "../../types/workflow";
import {
  GitFork,
  Network,
  LayoutGrid,
  History,
  Cpu,
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
  onNewWorkflow: () => void;
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
    { id: "graph" as TabId, label: "Knowledge Graph", icon: Network },
    { id: "memory" as TabId, label: "Bóveda de Memoria", icon: FolderGit2 },
    { id: "stock" as TabId, label: "Inventario & Bodegas", icon: Boxes },
    {
      id: "inbox" as TabId,
      label: "Bandeja HITL",
      icon: Bell,
      badge: pendingApprovalsCount > 0 ? `${pendingApprovalsCount}` : undefined,
    },
    { id: "objectives" as TabId, label: "Metas & Objetivos", icon: Target },
    { id: "history" as TabId, label: "Auditoría & Trazabilidad", icon: History },
    { id: "settings" as TabId, label: "Configuración & Doctor", icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-[#1a2d22] bg-[#070c09] flex flex-col justify-between p-4 z-20 flex-shrink-0">
      {/* Top Branding & Navigation */}
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-mint-500 to-mint-700 flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.35)]">
            <Sparkles className="w-4 h-4 text-black font-black" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold tracking-tight text-white">Mint</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#13281c] text-mint-400 border border-[#1f422d]">
                STUDIO
              </span>
            </div>
            <p className="text-[11px] text-gray-400">Autonomous Back Office</p>
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
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isSelected
                    ? "bg-[#112419] text-mint-300 border border-[#214931] shadow-[0_0_15px_rgba(34,197,94,0.12)] font-semibold"
                    : "text-gray-400 hover:text-gray-200 hover:bg-[#0c1611]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isSelected ? "text-mint-400" : "text-gray-500"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.badge && (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-amber-950 text-amber-300 border border-amber-700">
                      {item.badge}
                    </span>
                  )}
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-mint-400"></span>
                  )}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile & New Workflow CTA */}
      <div className="space-y-4 pt-4 border-t border-[#16271e]">
        {/* User Card */}
        <div className="flex items-center justify-between p-2 rounded-xl hover:bg-[#0e1913] transition-colors cursor-pointer group">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-mint-700 to-emerald-500 flex items-center justify-center text-xs font-bold text-black ring-2 ring-[#1e3828]">
              AR
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-gray-200 group-hover:text-white transition-colors">
                Alex Rivera
              </p>
              <p className="text-[11px] text-gray-400">alex@mint.ai</p>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors" />
        </div>

        {/* New Workflow Button */}
        <button
          onClick={onNewWorkflow}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-mint-500 to-emerald-400 hover:from-mint-400 hover:to-emerald-300 text-black font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.25)] hover:shadow-[0_0_25px_rgba(34,197,94,0.4)] transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New workflow</span>
        </button>
      </div>
    </aside>
  );
};
