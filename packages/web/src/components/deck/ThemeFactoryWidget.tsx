import React, { useState } from "react";
import { Check, Sparkles, Sliders } from "lucide-react";
import { THEME_PRESETS, applyTheme, getCurrentThemeId } from "../../services/themeManager";

interface ThemeFactoryWidgetProps {
  initialPreset?: string;
  onThemeChanged?: (presetId: string) => void;
}

export const ThemeFactoryWidget: React.FC<ThemeFactoryWidgetProps> = ({
  initialPreset,
  onThemeChanged,
}) => {
  const [activeId, setActiveId] = useState<string>(initialPreset || getCurrentThemeId());
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSelect = (presetId: string) => {
    setActiveId(presetId);
    applyTheme(presetId);
    setFeedback(`Tema "${THEME_PRESETS[presetId]?.name}" aplicado y guardado.`);
    onThemeChanged?.(presetId);
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="space-y-base">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-body font-semibold text-primary">Paletas de Superficie y Contraste</h4>
          <p className="text-caption text-secondary">
            Selecciona un preset para recalibrar los tokens de color de toda la aplicación en tiempo real.
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-raised border border-border text-caption text-secondary font-mono">
          <Sliders className="w-3.5 h-3.5 text-brand" />
          <span>Activo: {THEME_PRESETS[activeId]?.name.split(" ")[0]}</span>
        </div>
      </div>

      {feedback && (
        <div className="flex items-center gap-2 p-compact rounded-control bg-raised border border-brand/30 text-caption text-brand">
          <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-base">
        {Object.values(THEME_PRESETS).map((preset) => {
          const isSelected = activeId === preset.id;
          const t = preset.tokens;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelect(preset.id)}
              className={`text-left p-base rounded-card border transition-all cursor-pointer relative flex flex-col justify-between ${
                isSelected
                  ? "bg-raised border-brand shadow-card"
                  : "bg-panel border-border hover:border-strong"
              }`}
            >
              <div className="space-y-compact">
                <div className="flex items-center justify-between">
                  <span className="text-body font-semibold text-primary">{preset.name.split(" (")[0]}</span>
                  {isSelected ? (
                    <span className="w-5 h-5 rounded-pill bg-brand text-action-text flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </span>
                  ) : (
                    <span className="w-3 h-3 rounded-pill border border-border" />
                  )}
                </div>
                <p className="text-caption text-secondary line-clamp-2 leading-relaxed">
                  {preset.description}
                </p>
              </div>

              {/* Muestra de muestras cromáticas del preset */}
              <div className="mt-base pt-compact border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-4 h-4 rounded-pill border border-white/20"
                    style={{ backgroundColor: t.canvas }}
                    title="Lienzo base"
                  />
                  <span
                    className="w-4 h-4 rounded-pill border border-white/20"
                    style={{ backgroundColor: t.panel }}
                    title="Superficie de tarjeta"
                  />
                  <span
                    className="w-4 h-4 rounded-pill border border-white/20"
                    style={{ backgroundColor: t.border }}
                    title="Filete estructural"
                  />
                  <span
                    className="w-4 h-4 rounded-pill border border-white/20"
                    style={{ backgroundColor: t.brand }}
                    title="Color de acento / marca"
                  />
                </div>
                <span className="text-caption font-mono text-muted">
                  {preset.id}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

