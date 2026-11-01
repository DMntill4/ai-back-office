import { useState, useEffect, useRef } from "react";

export type SplashPhase = "loading" | "burst" | "exiting" | "finished";

export const SPLASH_STRINGS = {
  title: "Iniciando Mint",
  subtitle: "Preparando tu centro de operaciones y conectando con el agente...",
  ready: "Mint está listo",
} as const;

export const SPLASH_TIMINGS = {
  minLoadingMs: 2200,
  burstMs: 800,
  exitMs: 400,
} as const;

export interface UseSplashPhasesOptions {
  onComplete?: () => void;
  isReady?: boolean;
}

export function useSplashPhases(options: UseSplashPhasesOptions = {}) {
  const { onComplete, isReady = true } = options;
  const [phase, setPhase] = useState<SplashPhase>("loading");
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const startTimeRef = useRef<number>(Date.now());

  // Detección de preferencia de movimiento reducido
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Máquina de estados de las fases del Splash
  useEffect(() => {
    // Si prefiere movimiento reducido, transición rápida y directa
    if (prefersReducedMotion) {
      const timer = setTimeout(() => {
        setPhase("exiting");
        setTimeout(() => {
          setPhase("finished");
          onComplete?.();
        }, SPLASH_TIMINGS.exitMs);
      }, 1200);
      return () => clearTimeout(timer);
    }

    let burstTimer: NodeJS.Timeout | null = null;
    let exitTimer: NodeJS.Timeout | null = null;
    let finishTimer: NodeJS.Timeout | null = null;

    // Verificar si se ha cumplido el tiempo mínimo de carga
    const checkMinLoadingInterval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      if (elapsed >= SPLASH_TIMINGS.minLoadingMs && isReady && phase === "loading") {
        clearInterval(checkMinLoadingInterval);
        setPhase("burst");

        burstTimer = setTimeout(() => {
          setPhase("exiting");

          exitTimer = setTimeout(() => {
            setPhase("finished");
            onComplete?.();
          }, SPLASH_TIMINGS.exitMs);
        }, SPLASH_TIMINGS.burstMs);
      }
    }, 50);

    return () => {
      clearInterval(checkMinLoadingInterval);
      if (burstTimer) clearTimeout(burstTimer);
      if (exitTimer) clearTimeout(exitTimer);
      if (finishTimer) clearTimeout(finishTimer);
    };
  }, [prefersReducedMotion, isReady, onComplete, phase]);

  return {
    phase,
    prefersReducedMotion,
  };
}

