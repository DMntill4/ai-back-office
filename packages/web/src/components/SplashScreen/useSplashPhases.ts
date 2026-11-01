import { useState, useEffect, useRef } from "react";

export type SplashPhase = "loading" | "burst" | "exiting" | "finished";

export const SPLASH_STRINGS = {
  title: "Iniciando Mint",
  subtitle: "Preparando tu centro de operaciones y conectando con el agente...",
  ready: "Mint está listo",
} as const;

export const SPLASH_TIMINGS = {
  minLoadingMs: 2000,
  burstMs: 700,
  exitMs: 400,
} as const;

export interface UseSplashPhasesOptions {
  onComplete?: () => void;
  isReady?: boolean;
}

export function useSplashPhases(options: UseSplashPhasesOptions = {}) {
  const { onComplete } = options;
  const [phase, setPhase] = useState<SplashPhase>("loading");
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Detección de preferencia de movimiento reducido
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Máquina de estados determinista sin condiciones de carrera
  useEffect(() => {
    if (prefersReducedMotion) {
      const t1 = setTimeout(() => setPhase("exiting"), 800);
      const t2 = setTimeout(() => {
        setPhase("finished");
        onCompleteRef.current?.();
      }, 1200);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }

    // Cronograma determinista:
    // 1. loading -> burst a los minLoadingMs
    const tBurst = setTimeout(() => {
      setPhase("burst");
    }, SPLASH_TIMINGS.minLoadingMs);

    // 2. burst -> exiting a los (minLoadingMs + burstMs)
    const tExit = setTimeout(() => {
      setPhase("exiting");
    }, SPLASH_TIMINGS.minLoadingMs + SPLASH_TIMINGS.burstMs);

    // 3. exiting -> finished a los (minLoadingMs + burstMs + exitMs)
    const tFinish = setTimeout(() => {
      setPhase("finished");
      onCompleteRef.current?.();
    }, SPLASH_TIMINGS.minLoadingMs + SPLASH_TIMINGS.burstMs + SPLASH_TIMINGS.exitMs);

    return () => {
      clearTimeout(tBurst);
      clearTimeout(tExit);
      clearTimeout(tFinish);
    };
  }, [prefersReducedMotion]);

  return {
    phase,
    prefersReducedMotion,
  };
}
