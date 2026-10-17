import React from 'react';
import { motion } from 'framer-motion';
import { MintInteractiveMascot } from './MintInteractiveMascot';
import { ArrowRight } from 'lucide-react';

interface LoginViewProps {
  onLogin: () => void;
}

export const LoginView = ({ onLogin }: LoginViewProps) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin();
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between items-center py-10 px-4 bg-[#040A06] font-sans text-[#E8FBEA] overflow-hidden selection:bg-[#0D2E16] selection:text-[#B8F5A0]">
      {/* Resplandor ambiental orgánico Synthetic Mint (como en los banners oficiales) */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
        <div className="w-[520px] h-[520px] rounded-full bg-[#34D353]/10 blur-[140px]" />
        <div className="w-[300px] h-[300px] rounded-full bg-[#0D2E16]/40 blur-[90px] absolute" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full relative z-10 my-auto">
        {/* Mascota 3D interactiva oficial con aura radiante */}
        <div className="mb-2 flex flex-col items-center">
          <MintInteractiveMascot state="idle" size={80} />
        </div>

        {/* Tarjeta Central Synthetic Mint */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="max-w-sm w-full bg-[#08120B]/90 border border-[#162D1D] rounded-3xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(52,211,83,0.12),inset_0_1px_0_rgba(184,245,160,0.08)] relative backdrop-blur-xl"
        >
          <div className="text-center mb-6">
            <h1 className="text-xl font-semibold text-[#E8FBEA] font-headline tracking-tight mb-1">
              Iniciar sesión en Mint
            </h1>
            <p className="text-xs text-[#8EB795]">
              Ecosistema autónomo de back-office empresarial
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-[11px] font-medium text-[#8EB795] mb-1.5 font-label uppercase tracking-wider">
                Correo Electrónico
              </label>
              <input
                type="email"
                required
                defaultValue="andres@mint-ai.io"
                placeholder="usuario@mint-ai.io"
                className="w-full bg-[#040A06] border border-[#162D1D] focus:border-[#34D353] focus:shadow-[0_0_15px_rgba(52,211,83,0.2)] rounded-xl px-4 py-2.5 text-xs text-[#E8FBEA] placeholder:text-[#52795F] outline-none transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-medium text-[#8EB795] font-label uppercase tracking-wider">
                  Token o Contraseña
                </label>
                <span className="text-[10px] text-[#52795F] hover:text-[#B8F5A0] transition cursor-pointer">
                  Modo corporativo
                </span>
              </div>
              <input
                type="password"
                required
                defaultValue="••••••••••••"
                placeholder="••••••••••••"
                className="w-full bg-[#040A06] border border-[#162D1D] focus:border-[#34D353] focus:shadow-[0_0_15px_rgba(52,211,83,0.2)] rounded-xl px-4 py-2.5 text-xs text-[#E8FBEA] placeholder:text-[#52795F] outline-none transition font-mono"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full bg-[#34D353] text-[#040A06] hover:bg-[#2ecc4b] rounded-full py-3 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-[0_0_24px_rgba(52,211,83,0.35)] active:scale-[0.98]"
              >
                <span>Acceder al Espacio de Trabajo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-[#14281B] flex items-center justify-between text-[10px] text-[#8EB795]">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34D353] shadow-[0_0_6px_#34D353]" />
              <span>Grok-4.6 Conectado</span>
            </span>
            <span className="font-mono text-[#52795F]">v2.4 LTS</span>
          </div>
        </motion.div>
      </div>

      <footer className="relative z-10 py-3 text-center">
        <p className="font-mono text-[10px] text-[#52795F]">
          © 2026 MINT AI • Synthetic Mint System • El modelo propone, el código gobierna
        </p>
      </footer>
    </div>
  );
};

export default LoginView;
