import React, { useEffect, useRef } from "react";
import { useSplashPhases, SPLASH_STRINGS, type SplashPhase } from "./useSplashPhases";

export interface SplashScreenProps {
  onComplete?: () => void;
  isReady?: boolean;
}

interface Particle {
  angle: number;
  speed: number;
  length: number;
  width: number;
  color: string;
  dist: number;
  alpha: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete, isReady = true }) => {
  const { phase, prefersReducedMotion } = useSplashPhases({ onComplete, isReady });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Sistema de partículas lineales radiales con Canvas en fase "burst"
  useEffect(() => {
    if (phase !== "burst" || prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // Colores basados en los tokens oficiales de Mint
    // --color-brand: #2BB656, --color-brand-lime: #9DE342, --color-text-primary: #EEF2EC
    const colors = ["#2BB656", "#2BB656", "#9DE342", "#2BB656", "#9DE342", "#EEF2EC"];
    const count = 52;
    const particles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.18;
      particles.push({
        angle,
        speed: 180 + Math.random() * 220,
        length: 12 + Math.random() * 26,
        width: 1.4 + Math.random() * 1.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        dist: 4,
        alpha: 1,
      });
    }

    const startTime = performance.now();
    const duration = 750; // ms

    const render = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      ctx.clearRect(0, 0, width, height);

      // Easing cúbico hacia afuera
      const easeOut = 1 - Math.pow(1 - progress, 3);

      for (const p of particles) {
        p.dist = easeOut * p.speed;
        p.alpha = Math.max(0, 1 - Math.pow(progress, 1.4));

        const startX = centerX + Math.cos(p.angle) * p.dist;
        const startY = centerY + Math.sin(p.angle) * p.dist;
        const currentLength = p.length * (1 + easeOut * 0.5);
        const endX = centerX + Math.cos(p.angle) * (p.dist + currentLength);
        const endY = centerY + Math.sin(p.angle) * (p.dist + currentLength);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.lineWidth = p.width;
        ctx.lineCap = "round";
        ctx.stroke();
        ctx.restore();
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(render);
      }
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [phase, prefersReducedMotion]);

  if (phase === "finished") return null;

  const isExiting = phase === "exiting";
  const isBurst = phase === "burst";
  const isTextReady = isBurst || isExiting;

  return (
    <aside
      aria-label="Cargando Mint Studio"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-canvas select-none overflow-hidden transition-opacity duration-400 ease-out ${
        isExiting ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* 1. Resplandor verde difuso (Ambient Mint Glow) */}
      <div
        className="absolute w-[440px] h-[440px] rounded-pill bg-brand/10 blur-3xl pointer-events-none transition-all duration-700"
        style={{
          transform: isBurst ? "scale(1.8)" : "scale(1)",
          opacity: isBurst ? 0.35 : 0.2,
        }}
        aria-hidden="true"
      />

      {/* Sutil mancha secundaria de gradiente verde para profundidad */}
      <div
        className="absolute w-[320px] h-[320px] -top-16 -left-16 rounded-pill bg-brand/5 blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* 2. Contenedor Central: Círculo y Anillos de Progreso */}
      <div className="relative flex items-center justify-center w-52 h-52">
        {/* Canvas de Estallido Radial de Rayos (solo activo en fase burst) */}
        {!prefersReducedMotion && (
          <canvas
            ref={canvasRef}
            width={480}
            height={480}
            className={`absolute inset-0 m-auto pointer-events-none z-20 ${
              isBurst ? "opacity-100" : "opacity-0"
            }`}
          />
        )}

        {/* Anillos concéntricos: solo visibles en fase 'loading' */}
        {!prefersReducedMotion && (
          <div
            className={`absolute inset-0 flex items-center justify-center transition-all duration-300 pointer-events-none ${
              isBurst ? "scale-125 opacity-0" : "scale-100 opacity-100"
            }`}
          >
            {/* Anillo exterior estático tenue */}
            <svg className="w-44 h-44 text-border/60" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeDasharray="3 4"
                className="opacity-70"
              />
            </svg>

            {/* Arco giratorio de color acento como progreso */}
            <svg
              className="absolute w-44 h-44 text-brand animate-spin"
              style={{ animationDuration: "2.6s", animationTimingFunction: "linear" }}
              viewBox="0 0 100 100"
            >
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeDasharray="42 240"
              />
            </svg>

            {/* Segundo anillo interior muy tenue */}
            <svg className="absolute w-36 h-36 text-border/40" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="opacity-40"
              />
            </svg>
          </div>
        )}

        {/* Círculo sólido que 'respira' y aloja el logo de la guanábana */}
        <div
          className={`relative z-10 w-28 h-28 rounded-pill bg-gradient-to-b from-panel to-raised border border-border flex items-center justify-center shadow-lg transition-all ${
            prefersReducedMotion
              ? ""
              : isBurst
              ? "duration-200 ease-in scale-0 opacity-0"
              : "duration-1000 ease-in-out animate-pulse"
          }`}
          style={{
            boxShadow: isBurst
              ? "none"
              : "0 0 24px -4px rgba(43, 182, 86, 0.25), inset 0 1px 2px rgba(255, 255, 255, 0.05)",
          }}
        >
          {/* Logo oficial de la guanábana de Mint */}
          <img
            src="/assets/mint-logo.png"
            alt="MINT"
            className="w-14 h-14 object-contain drop-shadow-md select-none pointer-events-none"
            loading="eager"
            draggable={false}
          />
        </div>
      </div>

      {/* 3. Textos Informativos */}
      <div className="mt-7 flex flex-col items-center text-center px-6 max-w-sm z-10">
        <h2 className="text-section-title font-semibold text-primary font-sans tracking-tight transition-all duration-300">
          {isTextReady ? SPLASH_STRINGS.ready : SPLASH_STRINGS.title}
        </h2>
        <p className="text-caption text-secondary font-sans text-center mt-1 leading-relaxed transition-opacity duration-300">
          {isTextReady ? "Sincronización completa" : SPLASH_STRINGS.subtitle}
        </p>

        {/* Micro-indicador de estado en la parte inferior */}
        <div className="flex items-center gap-1.5 mt-3 text-caption text-muted font-mono">
          <span className="w-1.5 h-1.5 rounded-pill bg-brand animate-pulse" />
          <span>{isTextReady ? "100%" : "Conectando"}</span>
        </div>
      </div>
    </aside>
  );
};

