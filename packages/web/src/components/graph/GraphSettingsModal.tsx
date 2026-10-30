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
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-container bg-panel border border-border shadow-dialog overflow-hidden">
        {/* Header */}
        <div className="p-base border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-compact">
            <div className="w-8 h-8 rounded-control bg-raised border border-border flex items-center justify-center">
              <Sliders className="w-4 h-4 text-brand" />
            </div>
            <div>
              <h2 className="text-label font-semibold text-primary">Ajustes del Grafo</h2>
              <p className="text-caption text-secondary">
                Calibración de fuerzas físicas y renderizado
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-hairline rounded-control text-secondary hover:text-primary hover:bg-raised transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sliders de Física */}
        <div className="p-base space-y-base text-label">
          {/* 1. Repulsión */}
          <div>
            <div className="flex justify-between items-center mb-hairline">
              <label className="font-semibold text-secondary">Repulsión entre Nodos</label>
              <span className="font-mono text-brand text-caption">{settings.repulsion}</span>
            </div>
            <input
              type="range"
              min="100"
              max="900"
              step="20"
              value={settings.repulsion}
              onChange={(e) => onUpdateSettings({ repulsion: Number(e.target.value) })}
              className="w-full accent-brand bg-raised h-1.5 rounded-control cursor-pointer"
            />
            <p className="text-caption text-muted mt-hairline">
              Fuerza con la que los nodos se alejan unos de otros (Coulomb).
            </p>
          </div>

          {/* 2. Longitud de Enlace (Spring length) */}
          <div>
            <div className="flex justify-between items-center mb-hairline">
              <label className="font-semibold text-secondary">Longitud de Conexiones</label>
              <span className="font-mono text-brand text-caption">{settings.springLength} px</span>
            </div>
            <input
              type="range"
              min="50"
              max="240"
              step="10"
              value={settings.springLength}
              onChange={(e) => onUpdateSettings({ springLength: Number(e.target.value) })}
              className="w-full accent-brand bg-raised h-1.5 rounded-control cursor-pointer"
            />
            <p className="text-caption text-muted mt-hairline">
              Distancia de reposo natural de las aristas conectadas (Hooke).
            </p>
          </div>

          {/* 3. Gravedad Central */}
          <div>
            <div className="flex justify-between items-center mb-hairline">
              <label className="font-semibold text-secondary">Gravedad Central</label>
              <span className="font-mono text-brand text-caption">
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
              className="w-full accent-brand bg-raised h-1.5 rounded-control cursor-pointer"
            />
            <p className="text-caption text-muted mt-hairline">
              Atracción de los nodos hacia el centro de la pantalla.
            </p>
          </div>

          {/* Toggles de Visualización */}
          <div className="pt-compact border-t border-border space-y-compact">
            <label className="flex items-center justify-between p-compact rounded-control bg-raised border border-border cursor-pointer hover:border-border-strong transition-colors">
              <div className="flex items-center gap-compact">
                <Eye className="w-4 h-4 text-brand" />
                <div>
                  <p className="font-semibold text-primary">Mostrar todas las etiquetas</p>
                  <p className="text-caption text-secondary">
                    Por defecto solo se muestran nodos relevantes y seleccionados
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.showAllLabels}
                onChange={(e) => onUpdateSettings({ showAllLabels: e.target.checked })}
                className="w-4 h-4 rounded accent-brand bg-raised"
              />
            </label>

            <label className="flex items-center justify-between p-compact rounded-control bg-raised border border-border cursor-pointer hover:border-border-strong transition-colors">
              <div className="flex items-center gap-compact">
                <Grid className="w-4 h-4 text-brand" />
                <div>
                  <p className="font-semibold text-primary">Cuadrícula sutil de fondo</p>
                  <p className="text-caption text-secondary">
                    Líneas casi imperceptibles para orientar el desplazamiento
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.showGrid}
                onChange={(e) => onUpdateSettings({ showGrid: e.target.checked })}
                className="w-4 h-4 rounded accent-brand bg-raised"
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-base border-t border-border bg-raised flex items-center justify-between">
          <button
            onClick={onResetDefaults}
            className="flex items-center gap-hairline px-compact py-hairline rounded-control text-label font-semibold text-secondary hover:text-primary hover:bg-panel transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Valores por defecto</span>
          </button>
          <button
            onClick={onClose}
            className="px-base py-hairline rounded-control text-label font-semibold bg-brand hover:bg-brand text-canvas shadow-card transition-colors"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
