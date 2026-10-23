import React, { useRef, useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, Minus, Plus } from 'lucide-react';

export interface NumberStepperProps {
  value: number | string;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  presets?: number[];
  presetSuffix?: string;
  variant?: 'stacked' | 'split';
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

export const NumberStepper: React.FC<NumberStepperProps> = ({
  value,
  onChange,
  min = 1,
  max = 999999,
  step = 1,
  suffix,
  presets,
  presetSuffix = 'd',
  variant = 'stacked',
  className = '',
  disabled = false,
  ariaLabel = 'Control numérico',
}) => {
  const numValue = typeof value === 'number' ? value : parseInt(value, 10) || min;
  const [inputValue, setInputValue] = useState<string>(String(numValue));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(String(numValue));
  }, [numValue]);

  const clamp = (val: number): number => {
    return Math.min(Math.max(val, min), max);
  };

  const handleStep = (direction: 'up' | 'down', isShift = false) => {
    if (disabled) return;
    const delta = isShift ? step * 5 : step;
    const nextVal = clamp(direction === 'up' ? numValue + delta : numValue - delta);
    onChange(nextVal);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputValue(raw);
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) {
      onChange(clamp(parsed));
    }
  };

  const handleBlur = () => {
    const parsed = parseInt(inputValue, 10);
    if (isNaN(parsed) || parsed < min) {
      onChange(min);
      setInputValue(String(min));
    } else if (parsed > max) {
      onChange(max);
      setInputValue(String(max));
    } else {
      setInputValue(String(parsed));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleStep('up', e.shiftKey);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleStep('down', e.shiftKey);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (document.activeElement === containerRef.current?.querySelector('input')) {
      e.preventDefault();
      if (e.deltaY < 0) {
        handleStep('up', e.shiftKey);
      } else if (e.deltaY > 0) {
        handleStep('down', e.shiftKey);
      }
    }
  };

  return (
    <div className={`inline-flex flex-wrap items-center gap-2.5 ${className}`}>
      {/* ─── Contenedor Principal del Stepper ─── */}
      {variant === 'stacked' ? (
        <div
          ref={containerRef}
          onWheel={handleWheel}
          className={`group relative inline-flex items-stretch rounded-xl bg-[#090A0E] border border-white/[0.1] hover:border-white/[0.2] focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/20 transition-all shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)] ${
            disabled ? 'opacity-50 pointer-events-none' : ''
          }`}
        >
          {/* Input central numérico con tipografía JetBrains Mono */}
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            aria-label={ariaLabel}
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className="w-14 sm:w-16 px-2.5 py-1.5 bg-transparent font-mono text-sm font-semibold text-white text-center tracking-tight outline-none select-all"
          />

          {/* Botones de Flechas Verticales Stacked con Diseño Dark Premium */}
          <div className="flex flex-col border-l border-white/[0.08] bg-white/[0.02]">
            <button
              type="button"
              aria-label="Incrementar"
              tabIndex={-1}
              onClick={(e) => handleStep('up', e.shiftKey)}
              disabled={disabled || numValue >= max}
              className="flex-1 px-1.5 flex items-center justify-center text-zinc-400 hover:text-emerald-300 hover:bg-emerald-500/10 active:scale-90 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed group-hover:text-zinc-300"
            >
              <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
            <div className="w-full h-[1px] bg-white/[0.08]" />
            <button
              type="button"
              aria-label="Decrementar"
              tabIndex={-1}
              onClick={(e) => handleStep('down', e.shiftKey)}
              disabled={disabled || numValue <= min}
              className="flex-1 px-1.5 flex items-center justify-center text-zinc-400 hover:text-emerald-300 hover:bg-emerald-500/10 active:scale-90 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed group-hover:text-zinc-300"
            >
              <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      ) : (
        /* ─── Variante Split: [ - ] [ 30 ] [ + ] ─── */
        <div
          ref={containerRef}
          onWheel={handleWheel}
          className={`inline-flex items-center rounded-xl bg-[#090A0E] border border-white/[0.1] hover:border-white/[0.2] focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/20 transition-all shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)] ${
            disabled ? 'opacity-50 pointer-events-none' : ''
          }`}
        >
          <button
            type="button"
            aria-label="Decrementar"
            tabIndex={-1}
            onClick={(e) => handleStep('down', e.shiftKey)}
            disabled={disabled || numValue <= min}
            className="h-8 w-8 flex items-center justify-center text-zinc-400 hover:text-emerald-300 hover:bg-white/[0.05] active:scale-90 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed border-r border-white/[0.08]"
          >
            <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>

          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            aria-label={ariaLabel}
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className="w-14 sm:w-16 px-2 py-1.5 bg-transparent font-mono text-sm font-semibold text-white text-center tracking-tight outline-none select-all"
          />

          <button
            type="button"
            aria-label="Incrementar"
            tabIndex={-1}
            onClick={(e) => handleStep('up', e.shiftKey)}
            disabled={disabled || numValue >= max}
            className="h-8 w-8 flex items-center justify-center text-zinc-400 hover:text-emerald-300 hover:bg-white/[0.05] active:scale-90 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed border-l border-white/[0.08]"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      )}

      {/* Sufijo opcional (ej: "días", "horas", "unidades") */}
      {suffix && (
        <span className="text-xs text-zinc-400 font-medium select-none">
          {suffix}
        </span>
      )}

      {/* Presets rápidos discretos (ej: [7d] [15d] [30d] [60d]) */}
      {presets && presets.length > 0 && (
        <div className="flex items-center gap-1 ml-1">
          {presets.map((presetVal) => {
            const isSelected = numValue === presetVal;
            return (
              <button
                key={presetVal}
                type="button"
                onClick={() => onChange(presetVal)}
                disabled={disabled}
                className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border transition-all cursor-pointer active:scale-95 ${
                  isSelected
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                    : 'bg-white/[0.02] border-white/[0.06] text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05]'
                }`}
              >
                {presetVal}{presetSuffix}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
