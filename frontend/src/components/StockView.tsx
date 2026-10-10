import { useState, useEffect } from 'react';
import { Package, Truck, Activity, CheckCircle2, AlertTriangle, Zap, Settings2, Download, Filter, RefreshCw, MessageSquareText } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';

interface StockViewProps {
  onChatRequest?: () => void;
}

export const StockView = ({ onChatRequest }: StockViewProps) => {
  const [approvals, setApprovals] = useState<any[]>([]);

  useEffect(() => {
    // Mock inicial de aprobaciones
    setTimeout(() => {
      setApprovals([
        {
          id: 'appr_001',
          actionType: 'crear_orden_compra',
          reason: 'La orden para 20 sensores supera el límite de autorización de $10,000 MXN',
          amount: '15450.00',
          currency: 'MXN',
          requestedAt: Date.now() - 3600000,
        },
        {
          id: 'appr_002',
          actionType: 'revision_inventario',
          reason: 'Divergencia detectada entre stock físico y registro ERP en línea B',
          amount: '0.00',
          currency: 'MXN',
          requestedAt: Date.now() - 7200000,
        }
      ]);
    }, 500);
  }, []);

  const handleApprove = async (id: string, action: 'aprobado'|'rechazado') => {
    // Mock de aprobación
    setApprovals(prev => prev.filter(a => a.id !== id));
    toast.success(`Orden ${action === 'aprobado' ? 'aprobada' : 'rechazada'} con éxito.`);
  };

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
      className="flex flex-col w-full px-6 py-8 max-w-[1400px] mx-auto gap-10 font-geist"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.header variants={itemVariants} className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-warning uppercase tracking-[0.2em] font-semibold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-warning shadow-[0_0_8px_rgba(245,158,11,0.6)]"></span>
              Logística & Almacén
            </span>
          </div>
          <h1 className="text-3xl text-text-primary tracking-tight font-medium font-outfit">
            Aprobaciones Críticas
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-6 bg-bg-glass border border-border-glass px-5 py-3 rounded-xl backdrop-blur-sm">
          <div className="flex flex-col">
            <span className="text-[10px] text-text-tertiary uppercase tracking-widest font-medium">Capacidad</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm text-text-primary font-mono">78%</span>
              <span className="text-xs text-mint-primary">Óptimo</span>
            </div>
          </div>
          <div className="w-px h-6 bg-border-glass"></div>
          <div className="flex flex-col">
            <span className="text-[10px] text-text-tertiary uppercase tracking-widest font-medium">En Tránsito</span>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-mint-primary animate-pulse"></span>
              <span className="text-sm text-text-primary font-mono">3 envíos</span>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Hero Approval Card - Unmistakable Critical Approval */}
      <motion.section variants={itemVariants} className="relative bg-[#1a1405] border border-warning/40 rounded-2xl p-6 md:p-8 overflow-hidden backdrop-blur-md shadow-[0_10px_40px_rgba(245,158,11,0.05)]">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-warning/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
        <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-warning shadow-[0_0_10px_rgba(245,158,11,1)]"></div>
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 relative z-10">
          <div className="flex flex-col gap-5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className="bg-warning/20 border border-warning/30 text-warning px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                <AlertTriangle className="w-3 h-3" />
                Acción Inmediata
              </span>
              <span className="text-[10px] text-text-secondary font-mono tracking-widest">PRIORIDAD ALFA-1</span>
            </div>
            
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl text-white tracking-tight font-medium font-outfit flex items-center gap-3">
                Lote Bobinas E-Cu 
                <span className="px-2 py-0.5 rounded bg-bg-surface border border-border-glass text-xs font-mono text-text-secondary">SKU-1104</span>
              </h2>
              <p className="text-sm text-warning/80">Agotamiento en 5 días. Propuesta calculada por Mint.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-tertiary uppercase tracking-wider font-medium">Stock / Mínimo</span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-lg text-danger font-mono font-bold">14u</span>
                  <span className="text-sm text-text-secondary font-mono">/ 20</span>
                </div>
              </div>
              
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-tertiary uppercase tracking-wider font-medium">Logística</span>
                <span className="text-sm text-white font-medium mt-0.5">Aéreo Express</span>
                <span className="text-[11px] text-text-secondary font-mono">Metales Norte (48h)</span>
              </div>
              
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-tertiary uppercase tracking-wider font-medium">Inversión</span>
                <span className="text-lg text-white font-mono font-medium mt-0.5">$890 USD</span>
                <span className="text-[11px] text-mint-primary">Tarifa fija pre-negociada</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full lg:w-auto shrink-0 self-end lg:self-center">
            <button className="px-8 py-4 rounded-xl bg-warning text-black text-sm font-bold hover:bg-warning/90 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.4)]">
              <Zap className="w-4 h-4" />
              <span>Aprobar Despacho</span>
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button className="px-4 py-2.5 rounded-lg bg-bg-glass border border-border-glass text-text-primary text-xs font-medium hover:bg-border-glass transition-all flex items-center justify-center gap-2">
                <Settings2 className="w-3.5 h-3.5" />
                Modificar
              </button>
              <button className="px-4 py-2.5 rounded-lg border border-transparent text-text-secondary text-xs hover:text-text-primary hover:bg-bg-glass transition-all text-center">
                Ignorar
              </button>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Shipments & Stock List */}
        <motion.div variants={itemVariants} className="xl:col-span-8 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-base text-text-primary font-medium tracking-tight">Otras Aprobaciones</h3>
              <span className="px-2 py-0.5 rounded bg-bg-glass border border-border-glass text-[10px] font-mono text-text-secondary">{approvals.length} activas</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-1.5 rounded-lg border border-transparent hover:bg-bg-glass text-text-secondary transition-colors" title="Filtrar">
                <Filter className="w-4 h-4" />
              </button>
              <button className="p-1.5 rounded-lg border border-transparent hover:bg-bg-glass text-text-secondary transition-colors" title="Actualizar">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {approvals.map((approval) => (
              <div key={approval.id} className="bg-bg-surface border border-border-glass hover:border-border-glass-hover p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors">
                <div className="flex items-start gap-4 w-full sm:w-auto">
                  <div className="w-10 h-10 rounded-lg bg-bg-glass border border-border-glass flex items-center justify-center shrink-0">
                    <Activity className="w-4 h-4 text-text-secondary" />
                  </div>
                  <div className="flex flex-col gap-1 w-full">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-text-primary font-medium">{approval.actionType === 'crear_orden_compra' ? 'Orden de Compra' : 'Revisión'}</span>
                      <span className="text-[9px] text-text-tertiary font-mono border border-border-glass px-1.5 py-0.5 rounded">ID-{approval.id.substring(approval.id.length - 4)}</span>
                    </div>
                    <p className="text-xs text-text-secondary">{approval.reason}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-[10px] font-mono text-text-tertiary">
                      <span>${approval.amount} {approval.currency}</span>
                      <span className="text-border-glass-hover">·</span>
                      <span>{new Date(approval.requestedAt || Date.now()).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:ml-auto w-full sm:w-auto justify-end">
                  <button onClick={() => handleApprove(approval.id, 'aprobado')} className="px-3 py-1.5 rounded-lg border border-border-glass bg-bg-glass text-text-primary hover:text-mint-primary hover:border-mint-primary/50 transition-all flex items-center gap-1.5 text-xs font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Aprobar
                  </button>
                  <button onClick={() => handleApprove(approval.id, 'rechazado')} className="px-3 py-1.5 rounded-lg border border-transparent text-text-secondary hover:text-danger hover:bg-danger/10 transition-all flex items-center gap-1.5 text-xs font-medium">
                    Declinar
                  </button>
                </div>
              </div>
            ))}
            
            {approvals.length === 0 && (
              <div className="border border-border-glass border-dashed p-8 rounded-xl flex flex-col items-center justify-center gap-2 text-center bg-bg-glass/50">
                <CheckCircle2 className="w-6 h-6 text-mint-primary/50" />
                <div className="text-sm text-text-primary font-medium">Bandeja al día</div>
                <div className="text-xs text-text-secondary">No hay operaciones pendientes de revisión manual.</div>
              </div>
            )}
          </div>

          <div className="border border-border-glass p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="w-4 h-4 text-mint-primary" />
              <div className="flex flex-col">
                <span className="text-sm text-text-primary font-medium">Pipeline Autónomo</span>
                <span className="text-[11px] text-text-secondary">18 despachos ejecutados por Mint en las últimas 24h.</span>
              </div>
            </div>
            <span className="hidden sm:inline-block px-2 py-1 rounded bg-mint-primary/10 text-mint-primary text-[10px] font-mono">
              99.4% precisión
            </span>
          </div>
        </motion.div>

        {/* Right Column: Actions & Quick Settings */}
        <motion.div variants={itemVariants} className="xl:col-span-4 flex flex-col gap-6">
          <h3 className="text-base text-text-primary font-medium tracking-tight">Acciones Rápidas</h3>
          
          <div className="flex flex-col gap-2.5">
            <button className="w-full text-left p-3.5 rounded-xl border border-border-glass bg-bg-glass hover:bg-border-glass transition-all flex items-center gap-3 group">
              <Settings2 className="w-4 h-4 text-text-secondary group-hover:text-text-primary" />
              <span className="text-sm text-text-secondary group-hover:text-text-primary font-medium transition-colors">Ajustar umbrales mínimos</span>
            </button>

            <button className="w-full text-left p-3.5 rounded-xl border border-border-glass bg-bg-glass hover:bg-border-glass transition-all flex items-center gap-3 group">
              <Truck className="w-4 h-4 text-text-secondary group-hover:text-text-primary" />
              <span className="text-sm text-text-secondary group-hover:text-text-primary font-medium transition-colors">Modificar ruta prioritaria</span>
            </button>

            <button className="w-full text-left p-3.5 rounded-xl border border-border-glass bg-bg-glass hover:bg-border-glass transition-all flex items-center gap-3 group">
              <Download className="w-4 h-4 text-text-secondary group-hover:text-text-primary" />
              <span className="text-sm text-text-secondary group-hover:text-text-primary font-medium transition-colors">Auditoría ejecutiva (PDF)</span>
            </button>

            <button onClick={onChatRequest} className="w-full mt-2 text-left p-3.5 rounded-xl bg-mint-primary/5 border border-mint-primary/20 hover:border-mint-primary/50 hover:bg-mint-primary/10 transition-all flex items-center gap-3 group">
              <MessageSquareText className="w-4 h-4 text-mint-primary" />
              <span className="text-sm text-mint-primary font-medium">Asistencia de Mint</span>
            </button>
          </div>
          
          <div className="border border-border-glass p-5 rounded-xl flex flex-col gap-4 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-text-tertiary uppercase tracking-wider font-medium">Capacidad de Bahías</span>
              <span className="text-[10px] text-mint-primary font-mono">Zona Norte</span>
            </div>
            
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-text-primary">Bahía A</span>
                  <span className="text-warning font-semibold">92%</span>
                </div>
                <div className="w-full h-1 bg-bg-glass rounded-full overflow-hidden">
                  <div className="h-full bg-warning rounded-full" style={{"width": "92%"}}></div>
                </div>
              </div>
              
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-text-primary">Bahía B</span>
                  <span className="text-mint-primary font-semibold">64%</span>
                </div>
                <div className="w-full h-1 bg-bg-glass rounded-full overflow-hidden">
                  <div className="h-full bg-mint-primary rounded-full" style={{"width": "64%"}}></div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
