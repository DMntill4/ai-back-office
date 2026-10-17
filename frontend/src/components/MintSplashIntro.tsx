import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import mintIcon from '../assets/icon.png';

interface MintSplashIntroProps {
  onComplete: () => void;
  durationMs?: number; // 4000ms según requerimiento
}

export const MintSplashIntro: React.FC<MintSplashIntroProps> = ({
  onComplete,
  durationMs = 4000,
}) => {
  // Fases:
  // 1. 'atmosphere' (0.0s - 1.0s): Fondo, orbes, líneas guía, rectángulos cristal y micro-cuadrados
  // 2. 'reveal'     (1.0s - 2.8s): Expansión eje central, isotipo izquierdo flotante y logotipo derecho
  // 3. 'exit'       (2.8s - 4.0s): Scale-up suave con blur del logo, expansión de esquinas hacia bordes y revelación del Centro de Mando
  const [phase, setPhase] = useState<'atmosphere' | 'reveal' | 'exit'>('atmosphere');

  useEffect(() => {
    // 1.0s: Revelación del Logo y Eje Central
    const tReveal = setTimeout(() => {
      setPhase('reveal');
    }, 1000);

    // 2.8s: Transición y Scale-up al Dashboard
    const tExit = setTimeout(() => {
      setPhase('exit');
    }, 2800);

    // 4.0s: Finalización completa
    const tComplete = setTimeout(() => {
      onComplete();
    }, durationMs);

    return () => {
      clearTimeout(tReveal);
      clearTimeout(tExit);
      clearTimeout(tComplete);
    };
  }, [onComplete, durationMs]);

  return (
    <AnimatePresence>
      <motion.div
        key="mint-splash-intro"
        initial={{ opacity: 1 }}
        animate={{ opacity: phase === 'exit' ? 0 : 1 }}
        transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#040B06] overflow-hidden select-none pointer-events-auto"
      >
        {/* ───────── 1. FONDO Y ATMÓSFERA (0.0s - 1.0s) ───────── */}
        {/* Orbe difuso superior izquierdo (#4ADE80/15) replicando bannerIcon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{
            opacity: phase === 'exit' ? 0 : 0.9,
            scale: phase === 'exit' ? 1.3 : 1,
          }}
          transition={{ duration: 1.6, ease: 'easeOut' }}
          className="pointer-events-none absolute -top-28 -left-28 w-[580px] h-[580px] rounded-full bg-[#4ADE80]/15 blur-3xl"
        />

        {/* Orbe difuso inferior derecho (#15803D/20) replicando bannerIcon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{
            opacity: phase === 'exit' ? 0 : 0.9,
            scale: phase === 'exit' ? 1.3 : 1,
          }}
          transition={{ duration: 1.8, ease: 'easeOut' }}
          className="pointer-events-none absolute -bottom-28 -right-28 w-[620px] h-[620px] rounded-full bg-[#15803D]/20 blur-3xl"
        />

        {/* Curvas de luz fluidas SVG replicando las ondas luminosas de bannerIcon.png */}
        <svg
          className="pointer-events-none absolute inset-0 w-full h-full opacity-40"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="mintCurveTop" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4ADE80" stopOpacity="0.3" />
              <stop offset="60%" stopColor="#22C55E" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#040B06" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="mintCurveBottom" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#040B06" stopOpacity="0" />
              <stop offset="50%" stopColor="#22C55E" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#4ADE80" stopOpacity="0.45" />
            </linearGradient>
          </defs>
          {/* Arco superior izquierdo */}
          <path
            d="M -100 200 C 150 180, 260 80, 320 -50"
            fill="none"
            stroke="url(#mintCurveTop)"
            strokeWidth="1.5"
          />
          {/* Onda fluida inferior derecha */}
          <path
            d="M 600 900 C 850 780, 1100 820, 1400 700"
            fill="none"
            stroke="url(#mintCurveBottom)"
            strokeWidth="2"
          />
        </svg>

        {/* ───────── GUÍAS MINIMALISTAS DE 1px, RECTÁNGULOS CRISTAL Y MICRO-CUADRADOS ───────── */}

        {/* 1. Esquina Superior Izquierda: Rectángulo cristal + micro-cuadrados */}
        <motion.div
          initial={{ opacity: 0, x: -25, y: -25 }}
          animate={{
            opacity: phase === 'exit' ? 0 : 1,
            x: phase === 'exit' ? -70 : 0,
            y: phase === 'exit' ? -70 : 0,
          }}
          transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
          className="absolute top-8 left-8 flex items-start gap-4"
        >
          {/* Rectángulo vertical con efecto cristal según requerimiento */}
          <div className="w-7 h-24 rounded-md border border-emerald-500/20 bg-emerald-950/10 backdrop-blur-md flex flex-col justify-between py-2 items-center shadow-[0_0_15px_rgba(74,222,128,0.06)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
            <span className="font-mono text-[8px] text-emerald-400/70 [writing-mode:vertical-rl] tracking-widest uppercase">
              MINT // 01
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/30" />
          </div>

          {/* Secuencia vertical de micro-cuadrados con pulso escalonado */}
          <div className="flex flex-col gap-2 mt-2">
            {[0, 1, 2].map((idx) => (
              <motion.div
                key={`sq-top-left-${idx}`}
                animate={{
                  opacity: [0.35, 0.95, 0.35],
                  scale: [0.95, 1.15, 0.95],
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  delay: idx * 0.22,
                  ease: 'easeInOut',
                }}
                className="w-1.5 h-1.5 rounded-[1px] bg-emerald-500/40 shadow-[0_0_4px_rgba(74,222,128,0.3)]"
              />
            ))}
          </div>
        </motion.div>

        {/* 2. Esquina Superior Derecha: Línea guía minimalista de 1px + 3 micro-cuadrados */}
        <motion.div
          initial={{ opacity: 0, x: 25, y: -25 }}
          animate={{
            opacity: phase === 'exit' ? 0 : 1,
            x: phase === 'exit' ? 70 : 0,
            y: phase === 'exit' ? -70 : 0,
          }}
          transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
          className="absolute top-8 right-8 flex flex-col items-end gap-2"
        >
          {/* Corner Bracket minimalista de 1px (border-emerald-500/30) */}
          <div className="relative w-28 h-20 border-t border-r border-emerald-500/30">
            {/* Secuencia vertical de micro-cuadrados en el borde derecho como en bannerIcon */}
            <div className="absolute top-2 -right-[3.5px] flex flex-col gap-2">
              {[0, 1, 2].map((idx) => (
                <motion.div
                  key={`sq-top-right-${idx}`}
                  animate={{
                    opacity: [0.35, 0.95, 0.35],
                    scale: [0.95, 1.15, 0.95],
                  }}
                  transition={{
                    duration: 2.0,
                    repeat: Infinity,
                    delay: idx * 0.2,
                    ease: 'easeInOut',
                  }}
                  className="w-1.5 h-1.5 rounded-[1px] bg-emerald-500/40"
                />
              ))}
            </div>

            <div className="p-2 text-right">
              <span className="font-mono text-[9px] text-emerald-400/60 uppercase tracking-widest">
                TELEMETRY // ACT
              </span>
            </div>
          </div>
        </motion.div>

        {/* 3. Esquina Inferior Izquierda: Bracket 1px + secuencia horizontal de 3 micro-cuadrados */}
        <motion.div
          initial={{ opacity: 0, x: -25, y: 25 }}
          animate={{
            opacity: phase === 'exit' ? 0 : 1,
            x: phase === 'exit' ? -70 : 0,
            y: phase === 'exit' ? 70 : 0,
          }}
          transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
          className="absolute bottom-8 left-8 flex flex-col gap-2"
        >
          <div className="relative w-24 h-16 border-b border-l border-emerald-500/30">
            {/* Secuencia horizontal de micro-cuadrados en el borde inferior */}
            <div className="absolute -bottom-[3.5px] left-3 flex gap-2">
              {[0, 1, 2].map((idx) => (
                <motion.div
                  key={`sq-bottom-left-${idx}`}
                  animate={{
                    opacity: [0.35, 0.9, 0.35],
                  }}
                  transition={{
                    duration: 2.1,
                    repeat: Infinity,
                    delay: idx * 0.25,
                    ease: 'easeInOut',
                  }}
                  className="w-1.5 h-1.5 rounded-[1px] bg-emerald-500/40"
                />
              ))}
            </div>

            <div className="p-2">
              <span className="font-mono text-[9px] text-emerald-500/50 uppercase tracking-wider">
                KERNEL // NODE_01
              </span>
            </div>
          </div>
        </motion.div>

        {/* 4. Esquina Inferior Derecha: Rectángulo cristal + secuencia de 4 micro-cuadrados */}
        <motion.div
          initial={{ opacity: 0, x: 25, y: 25 }}
          animate={{
            opacity: phase === 'exit' ? 0 : 1,
            x: phase === 'exit' ? 70 : 0,
            y: phase === 'exit' ? 70 : 0,
          }}
          transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
          className="absolute bottom-8 right-8 flex items-center gap-4"
        >
          {/* Secuencia vertical de 4 micro-cuadrados escalonados */}
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3].map((idx) => (
              <motion.div
                key={`sq-bottom-right-${idx}`}
                animate={{
                  opacity: [0.3, 0.9, 0.3],
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  delay: idx * 0.18,
                  ease: 'easeInOut',
                }}
                className="w-1.5 h-1.5 rounded-[1px] bg-emerald-500/40"
              />
            ))}
          </div>

          {/* Rectángulo cristal con efecto backdrop blur */}
          <div className="w-12 h-20 rounded-lg border border-emerald-500/20 bg-emerald-950/10 backdrop-blur-md flex flex-col justify-center items-center gap-1 shadow-[0_0_20px_rgba(74,222,128,0.08)]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-[9px] text-emerald-400/80 [writing-mode:vertical-rl] tracking-wider">
              V2.4-PROD
            </span>
          </div>
        </motion.div>

        {/* ───────── 2. REVELACIÓN DEL LOGO "MINT" (1.0s - 2.8s) ───────── */}
        <motion.div
          initial={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
          animate={
            phase === 'exit'
              ? {
                  scale: 1.22,
                  filter: 'blur(16px)',
                  opacity: 0,
                  transition: { duration: 1.05, ease: [0.22, 1, 0.36, 1] },
                }
              : {
                  scale: 1,
                  filter: 'blur(0px)',
                  opacity: 1,
                }
          }
          className="relative z-10 flex flex-col items-center justify-center"
        >
          {/* Contenedor Horizontal Central: Isotipo Izquierdo + Eje Central + Logotipo Derecho */}
          <div className="relative flex items-center justify-center gap-6 sm:gap-9">
            {/* Isotipo Izquierdo: Emerge desde la derecha de la línea con suave fade-in y flotación */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={
                phase !== 'atmosphere'
                  ? {
                      opacity: 1,
                      x: 0,
                      y: [-2, 3, -2],
                    }
                  : { opacity: 0, x: 30 }
              }
              transition={{
                opacity: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
                x: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
                y: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
              }}
              className="relative flex items-center justify-center"
            >
              <div className="relative">
                <img
                  src={mintIcon}
                  alt="Mint Icon"
                  className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-[0_4px_30px_rgba(74,222,128,0.5)]"
                />
                {/* Resplandor suave detrás del isotipo */}
                <div className="absolute inset-0 rounded-full bg-emerald-400/20 blur-2xl -z-10" />
              </div>
            </motion.div>

            {/* Eje Central: Línea vertical (w-[2px] h-28) con scaleY(0) a scaleY(1) cubic-bezier(0.22, 1, 0.36, 1) */}
            <motion.div
              initial={{ scaleY: 0, opacity: 0 }}
              animate={
                phase !== 'atmosphere'
                  ? { scaleY: 1, opacity: 1 }
                  : { scaleY: 0, opacity: 0 }
              }
              transition={{
                duration: 0.85,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{ transformOrigin: 'center' }}
              className="w-[2px] h-24 sm:h-28 rounded-full bg-gradient-to-b from-emerald-300 via-emerald-500 to-emerald-800 shadow-[0_0_18px_rgba(52,211,83,0.75)]"
            />

            {/* Logotipo Derecho: La palabra "Mint" emerge hacia la derecha con tipografía geométrica ancha */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={
                phase !== 'atmosphere'
                  ? { opacity: 1, x: 0 }
                  : { opacity: 0, x: -30 }
              }
              transition={{
                duration: 0.9,
                delay: 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="flex flex-col items-start"
            >
              <h1
                className="text-5xl sm:text-7xl font-bold tracking-wide select-none"
                style={{
                  fontFamily: 'var(--font-headline)',
                  background: 'linear-gradient(135deg, #D9F99D 0%, #4ADE80 50%, #22C55E 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 2px 24px rgba(74,222,128,0.4))',
                }}
              >
                Mint
              </h1>
            </motion.div>
          </div>

          {/* Subtítulo: Centro de Mando • Telemetría Operativa */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={
              phase !== 'atmosphere'
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: 14 }
            }
            transition={{
              duration: 0.8,
              delay: 0.35,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mt-5 flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-950/25 backdrop-blur-md shadow-[0_0_20px_rgba(74,222,128,0.08)]"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono text-emerald-300/85 tracking-widest uppercase">
              Centro de Mando • Telemetría Operativa
            </span>
          </motion.div>
        </motion.div>

        {/* ───────── BOTÓN DISCRETO "SALTAR INTRO" ───────── */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === 'exit' ? 0 : 0.45 }}
          whileHover={{ opacity: 1 }}
          onClick={onComplete}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-opacity cursor-pointer px-3.5 py-1.5 rounded-full border border-white/[0.08] bg-black/40 backdrop-blur-md"
        >
          Omitir intro →
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
};

export default MintSplashIntro;
