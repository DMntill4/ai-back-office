import React, { useEffect, useRef } from "react";

export type AgentState = "reposo" | "leyendo" | "pensando" | "mutando";

export interface AgentParticleOrbProps {
  state?: AgentState;
  size?: number; // Size in px (e.g. 180 for hero/empty state, 40 for header pill)
  className?: string;
}

interface Particle {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  isSeedPoint: boolean;
}

export const AgentParticleOrb: React.FC<AgentParticleOrbProps> = ({
  state = "reposo",
  size = 180,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Presupuesto de partículas escalado al tamaño: los orbes pequeños
    // (píldora de cabecera, 40px) no necesitan la misma densidad que el héroe.
    const count = size <= 64 ? 34 : size <= 120 ? 64 : 88;
    const particles: Particle[] = [];
    const centerX = size / 2;
    const centerY = size / 2;
    const baseR = size * 0.38;

    for (let i = 0; i < count; i++) {
      // 70% outline, 30% interior texture
      const isInterior = i > count * 0.7;
      let angle = (i / (count * 0.7)) * Math.PI * 2;
      let r = baseR;

      if (!isInterior) {
        // Guanábana organic wavy lobes
        const wave = 1 + 0.08 * Math.sin(angle * 4) + 0.05 * Math.cos(angle * 7);
        r = baseR * wave;
      } else {
        // Random placement inside the silhouette
        angle = Math.random() * Math.PI * 2;
        r = baseR * Math.sqrt(Math.random()) * 0.78;
      }

      // Vertical oval aspect ratio (fruit shape)
      const bx = centerX + r * Math.cos(angle);
      const by = centerY + r * Math.sin(angle) * 1.15;

      const isSeed = isInterior && Math.random() > 0.55;

      particles.push({
        baseX: bx,
        baseY: by,
        x: bx + (Math.random() - 0.5) * 4,
        y: by + (Math.random() - 0.5) * 4,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: isSeed ? 2.2 : Math.random() * 1.2 + 0.8,
        alpha: isSeed ? 0.95 : Math.random() * 0.55 + 0.35,
        isSeedPoint: isSeed,
      });
    }

    let animationFrameId = 0;
    let time = 0;
    let isTabVisible = document.visibilityState === "visible";
    let isOnScreen = true;
    let isRunning = false;

    const maxDist = size * 0.12;
    const maxDistSq = maxDist * maxDist;

    const drawFrame = () => {
      ctx.clearRect(0, 0, size, size);

      time += prefersReducedMotion ? 0 : 0.02;

      // Glow halo in thinking state
      if (state === "pensando" || state === "mutando") {
        const glowGrad = ctx.createRadialGradient(
          centerX,
          centerY,
          baseR * 0.2,
          centerX,
          centerY,
          baseR * 1.3
        );
        glowGrad.addColorStop(0, "rgba(43, 182, 86, 0.18)");
        glowGrad.addColorStop(0.7, "rgba(157, 227, 66, 0.08)");
        glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = glowGrad;
        ctx.fillRect(0, 0, size, size);
      }

      // Actualiza posiciones primero (una sola pasada)
      for (const p of particles) {
        if (prefersReducedMotion) continue;

        if (state === "reposo") {
          // Calm breathing drift
          p.x = p.baseX + Math.sin(time + p.baseY * 0.05) * 2;
          p.y = p.baseY + Math.cos(time + p.baseX * 0.05) * 2;
        } else if (state === "leyendo") {
          // Skew / flow towards right data
          p.x = p.baseX + Math.sin(time * 1.5) * 4 + 3;
          p.y = p.baseY + Math.cos(time * 0.8) * 1.5;
        } else if (state === "pensando" || state === "mutando") {
          // Rotation and energetic pulse
          const angleOffset = time * 0.6;
          const dx = p.baseX - centerX;
          const dy = (p.baseY - centerY) / 1.15;
          const currR = Math.sqrt(dx * dx + dy * dy);
          const currAngle = Math.atan2(dy, dx) + angleOffset * 0.2;
          const pulse = 1 + 0.06 * Math.sin(time * 3);

          p.x = centerX + Math.cos(currAngle) * currR * pulse;
          p.y = centerY + Math.sin(currAngle) * currR * 1.15 * pulse;
        }
      }

      // Constelación: un único trazo por frame en lugar de uno por par.
      // Se compara con distancia al cuadrado para evitar sqrt innecesarias.
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = "rgba(43, 182, 86, 0.16)";
      ctx.beginPath();
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          if (dx * dx + dy * dy < maxDistSq) {
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
          }
        }
      }
      ctx.stroke();

      // Dibuja partículas
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.isSeedPoint
          ? `rgba(157, 227, 66, ${p.alpha})`
          : `rgba(43, 182, 86, ${p.alpha})`;
        ctx.fill();
      }
    };

    const loop = () => {
      if (!isTabVisible || !isOnScreen) {
        // Detiene el bucle por completo: no se agenda otro frame.
        isRunning = false;
        return;
      }
      drawFrame();
      animationFrameId = requestAnimationFrame(loop);
    };

    const start = () => {
      if (isRunning || prefersReducedMotion) return;
      if (!isTabVisible || !isOnScreen) return;
      isRunning = true;
      animationFrameId = requestAnimationFrame(loop);
    };

    const stop = () => {
      isRunning = false;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      animationFrameId = 0;
    };

    // Pausa cuando la pestaña pasa a segundo plano
    const handleVisibilityChange = () => {
      isTabVisible = document.visibilityState === "visible";
      if (isTabVisible) start();
      else stop();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Pausa cuando el orbe sale del viewport (scroll, vistas ocultas)
    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          isOnScreen = entries.some((e) => e.isIntersecting);
          if (isOnScreen) start();
          else stop();
        },
        { threshold: 0.01 }
      );
      observer.observe(canvas);
    }

    // Primer fotograma estático (también cubre prefers-reduced-motion)
    drawFrame();
    start();

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      observer?.disconnect();
    };
  }, [state, size]);

  return (
    <div
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Presencia del agente Mint en estado ${state}`}
    >
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="w-full h-full"
      />
    </div>
  );
};

