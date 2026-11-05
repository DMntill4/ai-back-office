import { useState, useEffect, useRef } from "react";

export type SplashPhase = "loading" | "burst" | "exiting" | "finished";

export const SPLASH_STRINGS = {
  title: "Iniciando Mint",
  subtitle: "Preparando tu centro de operaciones y conectando con el agente...",
  ready: "Mint está listo",
} as const;

export const SPLASH_TIMINGS = {
  minLoadingMs: 1000,
  burstMs: 350,
  exitMs: 250,
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
  const finishedRef = useRef(false);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setPhase("finished");
    onCompleteRef.current?.();
  };

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
      const t1 = setTimeout(() => setPhase("exiting"), 400);
      const t2 = setTimeout(() => finish(), 700);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }

    // Cronograma determinista:
    // 1. loading -> burst
    const tBurst = setTimeout(() => {
      setPhase("burst");
    }, SPLASH_TIMINGS.minLoadingMs);

    // 2. burst -> exiting
    const tExit = setTimeout(() => {
      setPhase("exiting");
    }, SPLASH_TIMINGS.minLoadingMs + SPLASH_TIMINGS.burstMs);

    // 3. exiting -> finished
    const tFinish = setTimeout(() => {
      finish();
    }, SPLASH_TIMINGS.minLoadingMs + SPLASH_TIMINGS.burstMs + SPLASH_TIMINGS.exitMs);

    // 4. Watchdog incondicional de seguridad (máximo 1.8 segundos bajo cualquier circunstancia)
    const tWatchdog = setTimeout(() => {
      finish();
    }, 1800);

    return () => {
      clearTimeout(tBurst);
      clearTimeout(tExit);
      clearTimeout(tFinish);
      clearTimeout(tWatchdog);
    };
  }, [prefersReducedMotion]);

  // Permitir clic o cualquier tecla para omitir inmediatamente
  useEffect(() => {
    const handleKeyDown = () => finish();
    window.addEventListener("keydown", handleKeyDown, { once: true });
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return {
    phase,
    prefersReducedMotion,
    dismiss: finish,
  };
}
