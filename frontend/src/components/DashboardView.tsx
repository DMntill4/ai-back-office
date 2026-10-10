import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { Activity, AlertTriangle, Box, TrendingUp, ChevronRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';

export const DashboardView = () => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    // Simulamos la respuesta del backend
    setTimeout(() => {
      setData({
        performance: [
          { name: 'TechComp', uv: 95 }, 
          { name: 'ElectroGlobal', uv: 82 }, 
          { name: 'GlobalParts', uv: 98 }, 
          { name: 'FastShip', uv: 60 }
        ],
        dailyReport: { 
          totalOrders: 156, 
          automated: 142, 
          pendingReview: 14, 
          savings: 1840, 
          spend: 4.20 
        }
      });
    }, 500);
  }, []);

  const performanceData = data?.performance || [
    { name: 'TechComp', uv: 95 }, 
    { name: 'ElectroGlobal', uv: 82 }, 
    { name: 'GlobalParts', uv: 98 }, 
    { name: 'FastShip', uv: 60 }
  ];
  
  const reportData = data?.dailyReport || { 
    totalOrders: 156, 
    automated: 142, 
    pendingReview: 14, 
    savings: 1840, 
    spend: 4.20 
  };

  // Framer Motion Variants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      className="flex flex-col w-full px-6 py-8 max-w-[1400px] mx-auto gap-12 font-geist"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.header variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-mint-primary uppercase tracking-[0.2em] font-semibold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-mint-primary animate-pulse shadow-[0_0_8px_rgba(0,255,102,0.6)]"></span>
              Panel Principal
            </span>
          </div>
          <h1 className="text-4xl text-text-primary tracking-tight font-medium font-outfit">
            Centro de Mando
          </h1>
        </div>

        <div className="flex items-center gap-8 bg-bg-glass border border-border-glass px-6 py-4 rounded-xl backdrop-blur-sm">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-text-tertiary uppercase tracking-widest font-medium">Autonomía</span>
            <span className="text-sm text-mint-primary font-mono">99.1%</span>
          </div>
          <div className="w-px h-8 bg-border-glass"></div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-text-tertiary uppercase tracking-widest font-medium">Intervención</span>
            <span className="text-sm text-warning font-mono">2 acciones</span>
          </div>
        </div>
      </motion.header>

      {/* Main Grid */}
      <motion.section variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Card 1: Decisiones Pendientes */}
        <div className="group bg-bg-surface border border-border-glass hover:border-border-glass-hover rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-0 right-0 w-64 h-64 bg-warning/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none transition-opacity opacity-50 group-hover:opacity-100"></div>

          <div className="flex flex-col gap-6 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-text-primary">
                <AlertTriangle className="w-5 h-5 text-warning" strokeWidth={1.5} />
                <span className="text-base font-medium tracking-tight">Atención</span>
              </div>
              <span className="text-[10px] text-warning bg-warning/10 border border-warning/20 px-2 py-0.5 rounded font-medium tracking-wider uppercase">
                Prioridad
              </span>
            </div>

            <div className="bg-bg-glass border border-border-glass rounded-lg p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-primary">MCU-32 (1.2k)</span>
                <span className="text-sm text-warning font-mono">$1.450</span>
              </div>
              <div className="w-full h-px bg-border-glass"></div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-primary">Sensores IR</span>
                <span className="text-sm text-warning font-mono">$480</span>
              </div>
            </div>
          </div>

          <div className="pt-6 relative z-10">
            <button className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-border-glass bg-bg-glass text-text-primary text-sm font-medium hover:bg-border-glass transition-all">
              <span>Revisar acciones</span>
              <ChevronRight className="w-4 h-4 text-text-secondary" />
            </button>
          </div>
        </div>

        {/* Card 2: Logística y Stock */}
        <div className="group bg-bg-surface border border-border-glass hover:border-border-glass-hover rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-0 right-0 w-64 h-64 bg-mint-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none transition-opacity opacity-50 group-hover:opacity-100"></div>

          <div className="flex flex-col gap-6 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-text-primary">
                <Box className="w-5 h-5 text-mint-primary" strokeWidth={1.5} />
                <span className="text-base font-medium tracking-tight">Logística</span>
              </div>
              <span className="text-[10px] text-mint-primary bg-mint-primary/10 border border-mint-primary/20 px-2 py-0.5 rounded font-medium tracking-wider uppercase">
                Estable
              </span>
            </div>

            <div className="bg-bg-glass border border-border-glass rounded-lg p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-primary">Línea Ensamble B</span>
                <span className="text-[10px] text-text-secondary border border-border-glass bg-bg-base px-1.5 py-0.5 rounded font-mono">
                  18 Nov
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-tertiary">Aprovisionamiento</span>
                  <span className="text-mint-primary font-mono">88%</span>
                </div>
                <div className="w-full bg-border-glass rounded-full h-1 overflow-hidden">
                  <div className="bg-mint-primary h-full rounded-full transition-all duration-1000 ease-out" style={{ width: "88%" }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 relative z-10">
            <button className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-border-glass bg-bg-glass text-text-primary text-sm font-medium hover:bg-border-glass transition-all">
              <span>Gestionar logística</span>
              <ChevronRight className="w-4 h-4 text-text-secondary" />
            </button>
          </div>
        </div>

        {/* Card 3: Autonomía y Finanzas */}
        <div className="group bg-bg-surface border border-border-glass hover:border-border-glass-hover rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-0 right-0 w-64 h-64 bg-mint-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none transition-opacity opacity-50 group-hover:opacity-100"></div>

          <div className="flex flex-col gap-6 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-text-primary">
                <TrendingUp className="w-5 h-5 text-mint-primary" strokeWidth={1.5} />
                <span className="text-base font-medium tracking-tight">Finanzas</span>
              </div>
              <span className="text-[10px] text-text-primary bg-bg-glass border border-border-glass px-2 py-0.5 rounded font-medium tracking-wider uppercase flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-mint-primary" />
                Al día
              </span>
            </div>

            <div className="bg-bg-glass border border-border-glass rounded-lg p-4 grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] text-text-tertiary uppercase tracking-wider font-medium">Ahorro</span>
                <span className="text-lg text-mint-primary font-mono mt-1">+${reportData.savings.toFixed(0)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-text-tertiary uppercase tracking-wider font-medium">Tareas</span>
                <span className="text-lg text-text-primary font-mono mt-1">{reportData.totalOrders}</span>
              </div>
            </div>
          </div>

          <div className="pt-6 relative z-10">
            <button className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-border-glass bg-bg-glass text-text-primary text-sm font-medium hover:bg-border-glass transition-all">
              <span>Auditoría completa</span>
              <ChevronRight className="w-4 h-4 text-text-secondary" />
            </button>
          </div>
        </div>
      </motion.section>

      {/* Chart Section */}
      <motion.div variants={itemVariants} className="bg-bg-surface border border-border-glass rounded-2xl p-6 h-[280px] flex flex-col relative overflow-hidden">
        <div className="flex items-center justify-between mb-6 relative z-10">
          <span className="text-base font-medium tracking-tight text-text-primary">Rendimiento Proveedores</span>
        </div>
        <div className="flex-1 min-h-0 relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={performanceData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8A8A93', fontSize: 12 }} width={90} />
              <RechartsTooltip
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                contentStyle={{ background: '#050505', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                formatter={(value) => [`${value}% a tiempo`, 'Rendimiento']}
              />
              <Bar dataKey="uv" radius={[0, 4, 4, 0]} barSize={12}>
                {performanceData.map((entry: any, index: number) => {
                  const val = entry.uv;
                  return <Cell key={`cell-${index}`} fill={val < 70 ? '#EF4444' : val < 90 ? '#F59E0B' : '#00FF66'} opacity={0.9} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Action / Agent Status Section */}
      <motion.section variants={itemVariants} className="bg-bg-surface border border-border-glass rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-10 h-10 rounded-xl bg-bg-glass border border-border-glass flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5 text-mint-primary animate-pulse" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-text-primary">Agente Mint</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-medium text-mint-primary bg-mint-primary/10 border border-mint-primary/20">
                <span className="w-1 h-1 rounded-full bg-mint-primary animate-ping"></span>
                Activo
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary font-mono">
              <span className="flex items-center gap-1.5">
                <span className="text-mint-primary">●</span> Escaneando ERP
              </span>
              <span className="text-border-glass-hover">/</span>
              <span>14ms</span>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Footer Meta */}
      <motion.footer variants={itemVariants} className="flex items-center justify-between text-text-tertiary font-mono text-[10px] uppercase tracking-wider pb-4">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-mint-primary/50"></span>
          <span>Sincronización SAP: hace 38s</span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3 h-3" />
          <span>Cifrado Cuántico v2</span>
        </div>
      </motion.footer>
    </motion.div>
  );
};
