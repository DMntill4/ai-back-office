import React, { useRef, useEffect, useState } from "react";

export type AgentVisualState = "reposo" | "leyendo" | "pensando" | "mutando";

export interface AgentParticleCloudProps {
  size?: number;
  state?: AgentVisualState;
  forceLightMode?: boolean;
  className?: string;
}

interface Particle {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  size: number;
  alpha: number;
  angle: number;
  speed: number;
  color: string;
}

export const AgentParticleCloud: React.FC<AgentParticleCloudProps> = ({
  size = 180,
  state = "reposo",
  forceLightMode = false,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isLightMode, setIsLightMode] = useState(forceLightMode);

  // Detección de reduced-motion y visibilidad de ventana
  useEffect(() => {
    if (forceLightMode) {
      setIsLightMode(true);
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsLightMode(mediaQuery.matches || document.hidden);

    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsLightMode(e.matches || document.hidden);
    };
    const handleVisibilityChange = () => {
      setIsLightMode(mediaQuery.matches || document.hidden);
    };

    mediaQuery.addEventListener("change", handleMediaChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mediaQuery.removeEventListener("change", handleMediaChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [forceLightMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const centerX = size / 2;
    const centerY = size / 2;
    const scale = size / 200;

    // Generar partículas con la morfología orgánica de la guanábana
    const particleCount = isLightMode ? 36 : 95;
    const particles: Particle[] = [];

    const isInsideGuanabana = (px: number, py: number) => {
      const nx = (px - 100) / 44;
      const ny = (py - 110) / 58;
      const asymmetry = 1 + (py - 110) * 0.0035;
      return (nx * nx) / (asymmetry * asymmetry) + ny * ny <= 1;
    };

    let attempts = 0;
    while (particles.length < particleCount && attempts < 2000) {
      attempts++;
      const rx = 40 + Math.random() * 120;
      const ry = 40 + Math.random() * 140;

      if (isInsideGuanabana(rx, ry)) {
        const isDimple = Math.random() < 0.28;
        const color = isDimple
          ? "rgba(11, 70, 50, 0.95)" // Hoyuelo oscuro característico
          : Math.random() > 0.4
          ? "rgba(157, 227, 66, 0.85)" // Verde lima Mint
          : "rgba(43, 182, 86, 0.85)";  // Verde Mint

        particles.push({
          baseX: rx * scale,
          baseY: ry * scale,
          x: rx * scale,
          y: ry * scale,
          size: (isDimple ? 1.8 : 1.2 + Math.random() * 1.6) * scale,
          alpha: 0.5 + Math.random() * 0.5,
          angle: Math.random() * Math.PI * 2,
          speed: 0.01 + Math.random() * 0.02,
          color,
        });
      }
    }

    let t = 0;

    const render = () => {
      ctx.clearRect(0, 0, size, size);

      // Halo sutil detrás de la nube
      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        10 * scale,
        centerX,
        centerY,
        65 * scale
      );
      gradient.addColorStop(0, "rgba(43, 182, 86, 0.16)");
      gradient.addColorStop(1, "rgba(43, 182, 86, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 65 * scale, 0, Math.PI * 2);
      ctx.fill();

      // Ajustes de velocidad y radio según el estado del agente
      let stateSpeed = 0.02;
      let stateDrift = 1.2;

      if (state === "reposo") {
        stateSpeed = 0.008;
        stateDrift = 0.6;
      } else if (state === "leyendo") {
        stateSpeed = 0.025;
        stateDrift = 1.8;
      } else if (state === "pensando") {
        stateSpeed = 0.015;
        stateDrift = 1.4;
      } else if (state === "mutando") {
        stateSpeed = 0.045;
        stateDrift = 2.4;
      }

      t += isLightMode ? 0.002 : stateSpeed;

      // Dibujar filamentos tenues
      if (!isLightMode) {
        ctx.lineWidth = 0.6 * scale;
        ctx.strokeStyle = "rgba(157, 227, 66, 0.10)";
        for (let i = 0; i < particles.length; i += 3) {
          const next = particles[(i + 4) % particles.length];
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(next.x, next.y);
          ctx.stroke();
        }
      }

      // Dibujar partículas
      for (const p of particles) {
        if (!isLightMode) {
          const drift = Math.sin(t + p.angle) * stateDrift * scale;
          const driftY = Math.cos(t * 0.8 + p.angle) * stateDrift * scale;
          p.x = p.baseX + drift;
          p.y = p.baseY + driftY;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }

      if (!isLightMode) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [size, state, isLightMode]);

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="block"
      />
    </div>
  );
};

