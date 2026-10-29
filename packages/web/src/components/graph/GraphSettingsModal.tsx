import React from "react";
import { GraphPhysicsSettings } from "../../types/graph";
import { X, RotateCcw, Sliders, Eye, Grid } from "lucide-react";

interface GraphSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GraphPhysicsSettings;
  onUpdateSettings: (newSettings: Partial<GraphPhysicsSettings>) => void;
  onResetDefaults: () => void;
}

export const GraphSettingsModal: React.FC<GraphSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetDefaults,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-[#08120e] border border-[#1d3b28] shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#162d1f] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#112419] border border-[#1e442d] flex items-center justify-center">
              <Sliders className="w-4 h-4 text-mint-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Ajustes del Grafo</h2>
              <p className="text-[11px] text-gray-400">
                Calibración de fuerzas físicas y renderizado
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#122419] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sliders de Física */}
        <div className="p-5 space-y-4 text-xs">
          {/* 1. Repulsión */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="font-semibold text-gray-300">Repulsión entre Nodos</label>
              <span className="font-mono text-mint-400 text-[11px]">{settings.repulsion}</span>
            </div>
            <input
              type="range"
              min="100"
              max="900"
              step="20"
              value={settings.repulsion}
              onChange={(e) => onUpdateSettings({ repulsion: Number(e.target.value) })}
              className="w-full accent-mint-500 bg-[#122419] h-1.5 rounded-lg cursor-pointer"
            />
            <p className="text-[10px] text-gray-500 mt-1">
              Fuerza con la que los nodos se alejan unos de otros (Coulomb).
            </p>
          </div>

          {/* 2. Longitud de Enlace (Spring length) */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="font-semibold text-gray-300">Longitud de Conexiones</label>
              <span className="font-mono text-mint-400 text-[11px]">{settings.springLength} px</span>
            </div>
            <input
              type="range"
              min="50"
              max="240"
              step="10"
              value={settings.springLength}
              onChange={(e) => onUpdateSettings({ springLength: Number(e.target.value) })}
              className="w-full accent-mint-500 bg-[#122419] h-1.5 rounded-lg cursor-pointer"
            />
            <p className="text-[10px] text-gray-500 mt-1">
              Distancia de reposo natural de las aristas conectadas (Hooke).
            </p>
          </div>

          {/* 3. Gravedad Central */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="font-semibold text-gray-300">Gravedad Central</label>
              <span className="font-mono text-mint-400 text-[11px]">
                {Math.round(settings.gravity * 1000) / 1000}
              </span>
            </div>
            <input
              type="range"
              min="0.01"
              max="0.12"
              step="0.005"
              value={settings.gravity}
              onChange={(e) => onUpdateSettings({ gravity: Number(e.target.value) })}
              className="w-full accent-mint-500 bg-[#122419] h-1.5 rounded-lg cursor-pointer"
            />
            <p className="text-[10px] text-gray-500 mt-1">
              Atracción de los nodos hacia el centro de la pantalla.
            </p>
          </div>

          {/* Toggles de Visualización */}
          <div className="pt-3 border-t border-[#162d1f] space-y-2.5">
            <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#0c1812] border border-[#183122] cursor-pointer hover:border-[#21432e] transition-colors">
              <div className="flex items-center gap-2.5">
                <Eye className="w-4 h-4 text-mint-400" />
                <div>
                  <p className="font-semibold text-gray-200">Mostrar todas las etiquetas</p>
                  <p className="text-[10px] text-gray-400">
                    Por defecto solo se muestran nodos relevantes y seleccionados
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.showAllLabels}
                onChange={(e) => onUpdateSettings({ showAllLabels: e.target.checked })}
                className="w-4 h-4 rounded accent-mint-500 bg-[#122419]"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#0c1812] border border-[#183122] cursor-pointer hover:border-[#21432e] transition-colors">
              <div className="flex items-center gap-2.5">
                <Grid className="w-4 h-4 text-mint-400" />
                <div>
                  <p className="font-semibold text-gray-200">Cuadrícula sutil de fondo</p>
                  <p className="text-[10px] text-gray-400">
                    Líneas casi imperceptibles para orientar el desplazamiento
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.showGrid}
                onChange={(e) => onUpdateSettings({ showGrid: e.target.checked })}
                className="w-4 h-4 rounded accent-mint-500 bg-[#122419]"
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#162d1f] bg-[#060c08] flex items-center justify-between">
          <button
            onClick={onResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-white hover:bg-[#122419] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Valores por defecto</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-mint-500 hover:bg-mint-400 text-black shadow-[0_0_12px_rgba(34,197,94,0.3)] transition-colors"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
