import React from 'react';
import { motion } from 'framer-motion';

export const LoginView = ({ onLogin }: { onLogin: () => void }) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin();
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center relative py-10 px-4 selection:bg-[#2FBF4A] selection:text-black bg-[#06140A] overflow-x-hidden font-outfit text-white">
      {/* Environmental Depth Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-[radial-gradient(circle,rgba(47,191,74,0.12)_0%,transparent_60%)] blur-[80px]"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[45%] h-[45%] bg-[radial-gradient(circle,rgba(47,191,74,0.1)_0%,transparent_60%)] blur-[100px]"></div>
        <div className="absolute top-[40%] left-[50%] w-[60%] h-[60%] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(circle,rgba(184,245,160,0.05)_0%,transparent_50%)] blur-[60px]"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.20] mix-blend-overlay"></div>
      </div>

      {/* Header / Top Space */}
      <header className="w-full max-w-5xl flex justify-between items-center z-10 px-4 opacity-80">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono tracking-wider text-[#9DB5A3] uppercase">MINT AGENT OS · V4.2</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-[#9DB5A3]">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#2FBF4A] shadow-[0_0_8px_#2FBF4A]"></span>
          <span>SISTEMAS OPERATIVOS</span>
        </div>
      </header>

      {/* Central Centered Section */}
      <main className="w-full flex flex-col items-center justify-center my-auto z-10">
        
        {/* Brand Logo & Wordmark */}
        <div className="flex flex-col items-center mb-7">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center relative mb-4 group cursor-default">
            <img 
              src="/src/assets/icon.png" 
              alt="Mint Logo" 
              style={{ width: '64px', height: '64px', objectFit: 'contain', filter: 'drop-shadow(0 0 16px rgba(47, 191, 74, 0.4))' }} 
            />
          </div>
          <h1 className="flex items-center m-0">
            <span style={{
              fontSize: '3rem',
              fontWeight: 800,
              letterSpacing: '-1.5px',
              fontFamily: '"Outfit", sans-serif',
              background: 'linear-gradient(180deg, #D7F9A0 0%, #2E9B3B 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: 1
            }}>Mint</span>
          </h1>
        </div>

        {/* Refined Glass Login Card */}
        <motion.div 
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", bounce: 0, duration: 0.5 }}
          className="w-full max-w-[400px] bg-white/[0.04] backdrop-blur-2xl border border-white/[0.06] shadow-[0_16px_40px_-12px_rgba(0,0,0,0.8)] rounded-[24px] p-8 relative overflow-hidden"
        >
          
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#2FBF4A]/20 to-transparent"></div>

          <div className="text-center mb-8">
            <h2 className="text-[22px] font-medium text-white tracking-tight mb-2">Iniciar Sesión</h2>
            <p className="text-[13px] text-[#849D8B] font-light leading-relaxed">
              Mint requiere autenticación para continuar.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-[11px] font-medium text-[#849D8B] mb-2 ml-1 tracking-wider uppercase">Correo Electrónico</label>
              <div className="relative">
                <input 
                  type="email" 
                  placeholder="admin@mint.ai" 
                  defaultValue="admin@mint.ai"
                  className="w-full bg-[#050A07]/80 text-[13px] font-mono text-[#E0E8E2] placeholder-[#3A4D40] border border-[#2FBF4A]/10 rounded-[12px] px-4 py-3 focus:outline-none focus:border-[#2FBF4A]/40 focus:ring-1 focus:ring-[#2FBF4A]/20 transition-all shadow-inner"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2 ml-1 mr-1">
                <label className="block text-[11px] font-medium text-[#849D8B] tracking-wider uppercase">Contraseña</label>
                <a href="#" className="text-[11px] text-[#5E7564] hover:text-[#9DB5A3] transition-colors focus:outline-none font-medium">
                  ¿Olvidaste la clave?
                </a>
              </div>
              <div className="relative">
                <input 
                  type="password" 
                  placeholder="••••••••••••" 
                  defaultValue="admin123"
                  className="w-full bg-[#050A07]/80 text-[13px] font-mono text-[#E0E8E2] placeholder-[#3A4D40] border border-[#2FBF4A]/10 rounded-[12px] px-4 py-3 pr-10 focus:outline-none focus:border-[#2FBF4A]/40 focus:ring-1 focus:ring-[#2FBF4A]/20 transition-all shadow-inner"
                />
                <button 
                  type="button" 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3A4D40] hover:text-[#849D8B] transition-colors p-1"
                  title="Mostrar contraseña"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="pt-4 flex justify-center">
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                type="submit" 
                className="bg-[#2FBF4A]/10 text-[#2FBF4A] border border-[#2FBF4A]/20 hover:bg-[#2FBF4A]/20 hover:border-[#2FBF4A]/40 font-medium text-[13px] py-2.5 px-8 rounded-full flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(47,191,74,0.05)] hover:shadow-[0_0_20px_rgba(47,191,74,0.1)]"
              >
                <span>Acceder al Sistema</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </motion.button>
            </div>
          </form>



        </motion.div>

        <div className="mt-6 flex items-center gap-2 font-mono text-xs text-[#9DB5A3] bg-[#08120B]/60 border border-[#2FBF4A]/10 px-3.5 py-1.5 rounded-full backdrop-blur-md">
          <span className="inline-block w-2 h-2 rounded-full bg-[#2FBF4A] shadow-[0_0_8px_#2FBF4A] animate-pulse"></span>
          <span>Mint activo · 14 tareas resueltas hoy</span>
        </div>

      </main>

      <footer className="w-full text-center z-10 py-2">
        <p className="font-mono text-[11px] text-[#556B5B] tracking-tight">
          Hecho por Guanábana Labs · Acceso Seguro TLS 1.3
        </p>
      </footer>

    </div>
  );
};
