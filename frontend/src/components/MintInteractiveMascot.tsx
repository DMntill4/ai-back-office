import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, type TargetAndTransition, type Transition } from 'framer-motion';

import defaultLogo from '../assets/mint-mascot.webp';

export type AgentState = 'idle' | 'thinking' | 'responding';

interface MintInteractiveMascotProps {
  state: AgentState;
  size?: number;
  /** Activa el rig 2D por capas (fruta / tallo / hoja) cuando existan los assets separados. */
  enableLayeredRig?: boolean;
  layers?: { fruta: string; tallo: string; hoja: string };
  src?: string;
  className?: string;
}

const MOTION: Record<AgentState, { animate: TargetAndTransition; transition: Transition }> = {
  idle: {
    animate: { y: [0, -8, 0], rotateZ: 0, scale: 1 },
    transition: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' },
  },
  thinking: {
    animate: { y: 0, rotateZ: [-7, 7, -7], scale: 1 },
    transition: { duration: 1.1, repeat: Infinity, ease: 'easeInOut' },
  },
  responding: {
    animate: { y: 0, rotateZ: 0, scale: [1, 1.09, 1] },
    transition: { duration: 0.55, repeat: Infinity, ease: 'easeInOut' },
  },
};

export const MintInteractiveMascot = ({
  state,
  size = 150,
  enableLayeredRig = false,
  layers,
  src = defaultLogo,
  className = '',
}: MintInteractiveMascotProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateY = useSpring(mx, { stiffness: 140, damping: 14, mass: 0.6 });
  const rotateX = useSpring(my, { stiffness: 140, damping: 14, mass: 0.6 });

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const nx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const ny = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    mx.set(Math.max(-1, Math.min(1, nx)) * 15);
    my.set(Math.max(-1, Math.min(1, ny)) * -15);
  };
  const onMouseLeave = () => {
    mx.set(0);
    my.set(0);
  };

  const m = MOTION[state];
  const glow =
    state === 'thinking'
      ? { animate: { scale: [0.9, 1.25, 0.9], opacity: [0.35, 0.7, 0.35] }, transition: { duration: 1.1, repeat: Infinity, ease: 'easeInOut' as const }, cls: 'bg-[#34D353]/35 shadow-[0_0_50px_rgba(52,211,83,0.5)]' }
      : { animate: { scale: 1, opacity: state === 'responding' ? 0.6 : 0.35 }, transition: { duration: 0.6 }, cls: 'bg-[#34D353]/25 shadow-[0_0_40px_rgba(52,211,83,0.35)]' };

  const imgStyle: React.CSSProperties = { width: size, height: size, objectFit: 'contain', userSelect: 'none', pointerEvents: 'none' };

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size * 1.8, height: size * 1.6, perspective: 800 }}
    >
      {/* Resplandor trasero */}
      <motion.div
        aria-hidden
        className={`absolute rounded-full blur-2xl ${glow.cls}`}
        style={{ width: size * 1.1, height: size * 1.1 }}
        animate={glow.animate}
        transition={glow.transition}
      />

      {/* Ondas concéntricas (responding) */}
      {state === 'responding' &&
        [0, 1, 2].map((i) => (
          <motion.span
            key={i}
            aria-hidden
            className="absolute rounded-full border border-[#34D353]/50 shadow-[0_0_15px_rgba(52,211,83,0.3)]"
            style={{ width: size, height: size }}
            initial={{ scale: 0.7, opacity: 0.6 }}
            animate={{ scale: 1.9, opacity: 0 }}
            transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.5, ease: 'easeOut' }}
          />
        ))}

      {/* Sombra inferior sincronizada con la flotación */}
      <motion.div
        aria-hidden
        className="absolute rounded-[50%] bg-black/70 blur-md"
        style={{ width: size * 0.6, height: 12, bottom: size * 0.08 }}
        animate={state === 'idle' ? { scaleX: [1, 0.78, 1], opacity: [0.6, 0.35, 0.6] } : { scaleX: 1, opacity: 0.5 }}
        transition={state === 'idle' ? { duration: 3.5, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.4 }}
      />

      {/* Parallax 3D al puntero */}
      <motion.div style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }} className="relative">
        <motion.div key={state} animate={m.animate} transition={m.transition}>
          {enableLayeredRig && layers ? (
            <div className="relative" style={{ width: size, height: size }}>
              <img src={layers.fruta} alt="" style={{ ...imgStyle, position: 'absolute', inset: 0 }} draggable={false} />
              <img src={layers.tallo} alt="" style={{ ...imgStyle, position: 'absolute', inset: 0 }} draggable={false} />
              <motion.img
                src={layers.hoja}
                alt=""
                draggable={false}
                style={{ ...imgStyle, position: 'absolute', inset: 0, transformOrigin: 'bottom left' }}
                animate={{ rotateZ: [0, 4, -2, 0] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
              />
            </div>
          ) : (
            <img
              src={src}
              alt="Mint, agente autónomo"
              draggable={false}
              style={{ ...imgStyle, filter: 'drop-shadow(0 14px 28px rgba(52,211,83,0.4))' }}
            />
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default MintInteractiveMascot;
