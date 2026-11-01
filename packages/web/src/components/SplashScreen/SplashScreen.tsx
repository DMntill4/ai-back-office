import React, { useEffect, useRef } from "react";
import { useSplashPhases, SPLASH_STRINGS } from "./useSplashPhases";

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

    // Destellos blancos, lima de marca y menta brillante para el estallido
    const colors = ["#FFFFFF", "#FFFFFF", "#9DE342", "#C8F570", "#EEF2EC", "#9DE342"];
    const count = 56;
    const particles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.16;
      particles.push({
        angle,
        speed: 200 + Math.random() * 240,
        length: 14 + Math.random() * 28,
        width: 1.6 + Math.random() * 1.4,
        color: colors[Math.floor(Math.random() * colors.length)],
        dist: 6,
        alpha: 1,
      });
    }

    const startTime = performance.now();
    const duration = 700; // ms

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
        const currentLength = p.length * (1 + easeOut * 0.6);
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
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center select-none overflow-hidden transition-opacity duration-400 ease-out ${
        isExiting ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{
        background: "radial-gradient(ellipse at 50% 45%, #32C960 0%, #2BB656 45%, #209345 75%, #167433 100%)",
      }}
    >
      {/* 1. Atmósfera luminosa: Halo y resplandor sutil detrás del centro */}
      <div
        className="absolute w-[560px] h-[560px] rounded-pill bg-white/20 blur-[100px] pointer-events-none transition-all duration-700"
        style={{
          transform: isBurst ? "scale(2.2)" : "scale(1)",
          opacity: isBurst ? 0.45 : 0.25,
        }}
        aria-hidden="true"
      />

      <div
        className="absolute w-[380px] h-[380px] rounded-pill bg-brand-lime/30 blur-[70px] pointer-events-none"
        aria-hidden="true"
      />

      {/* 2. Contenedor Central: Círculo de Marca, Guanábana y Anillos */}
      <div className="relative flex items-center justify-center w-56 h-56">
        {/* Canvas de Estallido Radial de Rayos */}
        {!prefersReducedMotion && (
          <canvas
            ref={canvasRef}
            width={520}
            height={520}
            className={`absolute inset-0 m-auto pointer-events-none z-20 ${
              isBurst ? "opacity-100" : "opacity-0"
            }`}
          />
        )}

        {/* Anillos concéntricos: visibles en fase 'loading' */}
        {!prefersReducedMotion && (
          <div
            className={`absolute inset-0 flex items-center justify-center transition-all duration-300 pointer-events-none ${
              isBurst ? "scale-130 opacity-0" : "scale-100 opacity-100"
            }`}
          >
            {/* Anillo exterior estático en blanco tenue */}
            <svg className="w-48 h-48 text-white/35" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeDasharray="3 4"
              />
            </svg>

            {/* Arco giratorio en blanco brillante con resplandor */}
            <svg
              className="absolute w-48 h-48 text-white animate-spin"
              style={{
                animationDuration: "2.4s",
                animationTimingFunction: "linear",
                filter: "drop-shadow(0 0 10px rgba(255, 255, 255, 0.8))",
              }}
              viewBox="0 0 100 100"
            >
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeDasharray="48 240"
              />
            </svg>

            {/* Segundo anillo interior fino */}
            <svg className="absolute w-40 h-40 text-white/20" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
            </svg>
          </div>
        )}

        {/* Círculo sólido central que "respira" */}
        <div
          className={`relative z-10 w-28 h-28 rounded-pill border-2 border-brand-lime/80 flex items-center justify-center shadow-2xl transition-all ${
            prefersReducedMotion
              ? ""
              : isBurst
              ? "duration-200 ease-in scale-0 opacity-0"
              : "duration-1000 ease-in-out animate-pulse"
          }`}
          style={{
            background: "radial-gradient(circle, #103A1F 0%, #0B2416 100%)",
            boxShadow: isBurst
              ? "none"
              : "0 12px 35px 0 rgba(0, 0, 0, 0.35), 0 0 30px 4px rgba(157, 227, 66, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.2)",
          }}
        >
          {/* Logo oficial de la guanábana de Mint */}
          <img
            src="/assets/mint-logo.png"
            alt="MINT"
            className="w-16 h-16 object-contain drop-shadow-md select-none pointer-events-none brightness-110"
            loading="eager"
            draggable={false}
          />
        </div>
      </div>

      {/* 3. Textos Informativos */}
      <div className="mt-7 flex flex-col items-center text-center px-6 max-w-sm z-10">
        <h2 className="text-section-title font-semibold text-white font-sans tracking-tight transition-all duration-300 drop-shadow-sm">
          {isTextReady ? SPLASH_STRINGS.ready : SPLASH_STRINGS.title}
        </h2>
        <p className="text-caption text-white/90 font-sans text-center mt-1 leading-relaxed transition-opacity duration-300 drop-shadow-sm">
          {isTextReady ? "Sincronización completa" : SPLASH_STRINGS.subtitle}
        </p>

        {/* Micro-indicador de estado en píldora con contraste óptimo */}
        <div className="flex items-center gap-1.5 mt-3 text-caption text-white font-mono font-medium bg-black/25 px-3 py-1 rounded-pill border border-white/20 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-pill bg-brand-lime animate-pulse" />
          <span>{isTextReady ? "100%" : "Conectando..."}</span>
        </div>
      </div>
    </aside>
  );
};
