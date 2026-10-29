import React from "react";
import { ModeTab } from "../../types/workflow";
import { Share2, MoreHorizontal, Check, Play, ShieldAlert } from "lucide-react";

interface HeaderProps {
  currentMode: ModeTab;
  onSelectMode: (mode: ModeTab) => void;
  isActive: boolean;
  onToggleActive: () => void;
  onSave: () => void;
  isSaved: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentMode,
  onSelectMode,
  isActive,
  onToggleActive,
  onSave,
  isSaved,
}) => {
  return (
    <header className="h-14 border-b border-[#1c2f25] bg-[#090f0c] px-5 flex items-center justify-between z-20">
      {/* Left: Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-400 font-medium">Workflows</span>
        <span className="text-gray-600">/</span>
        <span className="text-gray-400 font-medium">AI bots</span>
        <span className="text-gray-600">/</span>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#111d16] border border-[#1e3828] text-mint-300 font-medium text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-mint-400 animate-pulse"></span>
          Mint Coordinator
        </div>
      </div>

      {/* Center: Mode Tabs */}
      <div className="flex items-center p-1 rounded-lg bg-[#0e1712] border border-[#1a3023]">
        <button
          onClick={() => onSelectMode("editor")}
          className={`px-4 py-1 rounded-md text-xs font-semibold transition-all ${
            currentMode === "editor"
              ? "bg-[#183222] text-mint-200 shadow-sm border border-[#234832]"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          Editor
        </button>
        <button
          onClick={() => onSelectMode("executions")}
          className={`px-4 py-1 rounded-md text-xs font-semibold transition-all ${
            currentMode === "executions"
              ? "bg-[#183222] text-mint-200 shadow-sm border border-[#234832]"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          Executions
        </button>
        <button
          onClick={() => onSelectMode("test")}
          className={`px-4 py-1 rounded-md text-xs font-semibold transition-all ${
            currentMode === "test"
              ? "bg-[#183222] text-mint-200 shadow-sm border border-[#234832]"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          Test
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Active Toggle */}
        <div className="flex items-center gap-2 bg-[#0d1611] px-2.5 py-1 rounded-lg border border-[#1a3023]">
          <span className="text-xs font-medium text-gray-300">Active</span>
          <button
            onClick={onToggleActive}
            type="button"
            className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out cursor-pointer ${
              isActive ? "bg-mint-500 justify-end" : "bg-gray-700 justify-start"
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-black shadow-md"></div>
          </button>
        </div>

        {/* Share Button */}
        <button
          type="button"
          className="px-3.5 py-1.5 rounded-lg border border-[#1e3828] bg-[#101b14] text-xs font-semibold text-gray-200 hover:bg-[#16271e] hover:border-mint-500/40 transition-colors flex items-center gap-1.5"
        >
          <Share2 className="w-3.5 h-3.5 text-mint-400" />
          <span>Share</span>
        </button>

        {/* Save Button */}
        <button
          onClick={onSave}
          type="button"
          className="px-4 py-1.5 rounded-lg bg-mint-500 text-black text-xs font-bold hover:bg-mint-400 transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:shadow-[0_0_20px_rgba(34,197,94,0.5)] active:scale-95"
        >
          {isSaved ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Saved</span>
            </>
          ) : (
            <span>Save</span>
          )}
        </button>

        {/* More options menu */}
        <button
          type="button"
          className="p-1.5 rounded-lg border border-[#1e3828] bg-[#101b14] text-gray-400 hover:text-gray-200 hover:bg-[#16271e] transition-colors"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
