import React, { useRef, useEffect } from "react";

interface GuanabanaParticleCoreProps {
  size?: number; // Diámetro en px
  isWorking?: boolean;
  pulseIntensity?: "calm" | "active";
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

export const GuanabanaParticleCore: React.FC<GuanabanaParticleCoreProps> = ({
  size = 180,
  isWorking = true,
  pulseIntensity = "calm",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
    const radiusX = size * 0.36;
    const radiusY = size * 0.44;

    // Paleta de la Guanábana (Tokens semánticos de marca)
    const particleColors = [
      "rgba(163, 230, 53, 0.85)", // Lime 400
      "rgba(163, 230, 53, 0.45)", // Lime tenue
      "rgba(45, 212, 191, 0.70)", // Teal 400
      "rgba(16, 185, 129, 0.60)", // Emerald
      "rgba(242, 245, 243, 0.50)", // White mote
    ];

    // Generar partículas con morfología ovoidal asimétrica (silueta de la guanábana)
    const particleCount = 140;
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      // Distribución dentro de la elipse con cúspide ligeramente curvada
      const theta = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random());

      // Deformación anatómica suave de guanábana
      const asymmetry = 1 + 0.14 * Math.sin(theta);
      const px = centerX + r * radiusX * Math.cos(theta) * asymmetry;
      const py = centerY + r * radiusY * Math.sin(theta) * (theta > 0 ? 1.08 : 0.95);

      particles.push({
        baseX: px,
        baseY: py,
        x: px,
        y: py,
        size: Math.random() * 2.2 + 0.8,
        alpha: Math.random() * 0.6 + 0.35,
        angle: Math.random() * Math.PI * 2,
        speed: (Math.random() * 0.02 + 0.008) * (pulseIntensity === "active" ? 1.8 : 1),
        color: particleColors[Math.floor(Math.random() * particleColors.length)],
      });
    }

    let time = 0;

    const render = () => {
      time += 0.025;
      ctx.clearRect(0, 0, size, size);

      // Halo sutil de fondo en el centro de masa (sin desenfoque CSS invasivo)
      const grad = ctx.createRadialGradient(
        centerX,
        centerY,
        size * 0.05,
        centerX,
        centerY,
        size * 0.46
      );
      grad.addColorStop(0, "rgba(163, 230, 53, 0.09)");
      grad.addColorStop(0.5, "rgba(16, 185, 129, 0.04)");
      grad.addColorStop(1, "rgba(14, 21, 18, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, size * 0.46, 0, Math.PI * 2);
      ctx.fill();

      // Render de filamentos tenues que unen motes cercanos
      ctx.strokeStyle = "rgba(163, 230, 53, 0.08)";
      ctx.lineWidth = 0.7;
      for (let i = 0; i < particles.length; i += 3) {
        for (let j = i + 1; j < Math.min(i + 8, particles.length); j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < size * 0.16) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Dibujar cada partícula con deriva orgánica armónica
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.angle += p.speed;

        // Movimiento de respiración
        const breath = Math.sin(time + i * 0.1) * (isWorking ? 3.5 : 1.2);
        p.x = p.baseX + Math.cos(p.angle) * breath;
        p.y = p.baseY + Math.sin(p.angle) * breath;

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Núcleo brillante central (mote estrella)
      ctx.fillStyle = "#F2F5F3";
      ctx.beginPath();
      ctx.arc(centerX, centerY, 2.2, 0, Math.PI * 2);
      ctx.fill();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [size, isWorking, pulseIntensity]);

  return (
    <div
      className="relative flex items-center justify-center pointer-events-none select-none"
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

