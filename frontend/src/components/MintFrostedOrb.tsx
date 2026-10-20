import React from 'react';
import { motion } from 'framer-motion';

interface MintFrostedOrbProps {
  size?: number;
  className?: string;
  glow?: boolean;
}

export const MintFrostedOrb: React.FC<MintFrostedOrbProps> = ({
  size = 140,
  className = '',
  glow = true,
}) => {
  return (
    <div
      className={`relative flex items-center justify-center select-none pointer-events-none ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Halo de resplandor ambiental suave difuminado */}
      {glow && (
        <div
          className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#10B981]/25 via-[#34D353]/35 to-[#6EE7B7]/20 blur-[50px] -z-10"
          style={{ width: size * 1.5, height: size * 1.5, left: -size * 0.25, top: -size * 0.25 }}
        />
      )}

      {/* Esfera flotante con física de levitación suave (inspirada en la referencia BeeBot) */}
      <motion.div
        animate={{
          y: [-4, 6, -4],
          rotate: [0, 4, -3, 0],
          scale: [1, 1.02, 1],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="relative rounded-full backdrop-blur-xl flex items-center justify-center overflow-hidden"
        style={{
          width: size,
          height: size,
          background: `
            radial-gradient(circle at 32% 28%, rgba(255, 255, 255, 0.8) 0%, rgba(184, 245, 160, 0.7) 18%, rgba(52, 211, 83, 0.45) 42%, rgba(16, 185, 129, 0.25) 70%, rgba(5, 30, 15, 0.85) 100%)
          `,
          boxShadow: `
            inset -8px -8px 24px rgba(0, 0, 0, 0.7),
            inset 6px 6px 20px rgba(255, 255, 255, 0.45),
            inset 0 0 12px rgba(184, 245, 160, 0.6),
            0 24px 60px rgba(0, 0, 0, 0.6),
            0 10px 30px rgba(52, 211, 83, 0.2)
          `,
          border: '1px solid rgba(255, 255, 255, 0.25)',
        }}
      >
        {/* Reflejo especular superior izquierdo */}
        <div
          className="absolute top-2 left-3 rounded-full bg-gradient-to-br from-white/90 via-white/40 to-transparent blur-[1px]"
          style={{ width: size * 0.35, height: size * 0.22, transform: 'rotate(-25deg)' }}
        />

        {/* Reflejo de borde inferior derecho para dar volumen 3D */}
        <div
          className="absolute bottom-2.5 right-3.5 rounded-full bg-gradient-to-tl from-[#6EE7B7]/40 to-transparent blur-[2px]"
          style={{ width: size * 0.4, height: size * 0.25 }}
        />
      </motion.div>
    </div>
  );
};

export default MintFrostedOrb;
