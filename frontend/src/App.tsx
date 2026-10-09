import React, { useState, useEffect } from 'react';
import { Home, Activity, Settings, Bell, Check, X, Share2, BrainCircuit, ChevronRight, Terminal, Loader2, Search, User, FileText, Database } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { Drawer } from 'vaul';
import { Command } from 'cmdk';
import * as Tooltip from '@radix-ui/react-tooltip';
import './index.css';

const NavTooltip = ({ children, content }: { children: React.ReactNode, content: string }) => (
  <Tooltip.Provider delayDuration={200}>
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className="TooltipContent" sideOffset={15} side="right">
          {content}
          <Tooltip.Arrow className="TooltipArrow" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  </Tooltip.Provider>
);

const Sidebar = ({ currentView, setView }: { currentView: string, setView: (v: string) => void }) => (
  <aside style={{ width: '80px', borderRight: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 0', background: 'rgba(10,10,10,0.8)', zIndex: 10 }}>
    <motion.div 
      whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
      style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}
    >
      <img src="/src/assets/icon.png" alt="Mint Logo" style={{ width: '48px', height: '48px', objectFit: 'contain', filter: 'drop-shadow(0 0 10px rgba(0, 255, 102, 0.4))' }} />
    </motion.div>
    
    <NavTooltip content="Inicio"><div onClick={() => setView('dashboard')} className={`sidebar-icon ${currentView === 'dashboard' ? 'active' : ''}`}><Home size={22} /></div></NavTooltip>
    <NavTooltip content="Actividad y Logs"><div onClick={() => setView('activity')} className={`sidebar-icon ${currentView === 'activity' ? 'active' : ''}`}><Activity size={22} /></div></NavTooltip>
    <NavTooltip content="Base de Datos"><div onClick={() => setView('database')} className={`sidebar-icon ${currentView === 'database' ? 'active' : ''}`}><Database size={22} /></div></NavTooltip>
    <div style={{ flex: 1 }}></div>
    <NavTooltip content="Ajustes"><div className="sidebar-icon"><Settings size={22} /></div></NavTooltip>
  </aside>
);

const Header = ({ onOpenCmd }: { onOpenCmd: () => void }) => (
  <header style={{ padding: '1.5rem 2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
      <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '12px', letterSpacing: '-0.5px' }}>
        <img src="/src/assets/bannerIcon.png" alt="Mint Banner" style={{ height: '24px', objectFit: 'contain' }} />
      </h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        <span>Plataforma</span> <ChevronRight size={14} /> <span style={{ color: 'var(--text-primary)' }}>Cola de Trabajo</span>
      </div>
    </div>
    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
      
      <button onClick={onOpenCmd} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', padding: '8px 16px', borderRadius: '8px', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s' }} className="hover-lift">
        <Search size={14} />
        <span style={{ fontSize: '0.85rem' }}>Buscar...</span>
        <kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'monospace' }}>⌘K</kbd>
      </button>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--bg-glass)', padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--border-glass)' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--mint-primary)', boxShadow: '0 0 8px var(--mint-primary)', animation: 'pulse 2s infinite' }}></div>
        <span style={{ color: 'var(--mint-primary)', fontSize: '0.85rem', fontWeight: 500 }}>Agente Activo</span>
      </div>
      
      <div style={{ position: 'relative', cursor: 'pointer', color: 'var(--text-secondary)', marginLeft: '10px' }} className="hover-lift">
        <Bell size={20} />
        <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '8px', height: '8px', background: 'var(--danger-color)', borderRadius: '50%' }}></div>
      </div>
      
      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', marginLeft: '10px', cursor: 'pointer' }} className="hover-lift">
        <User size={18} />
      </div>
    </div>
  </header>
);

const AgentConsole = () => {
  const [logs, setLogs] = useState<{id: number, time: string, text: string, type: string}[]>([
    { id: 1, time: new Date().toLocaleTimeString(), text: 'Sistema listo. MINT a la espera. ¿En qué te ayudo?', type: 'info' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [caseId, setCaseId] = useState('');

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input;
    setInput('');
    const newId = Date.now();
    const time = new Date().toLocaleTimeString();
    
    setLogs(prev => [...prev, { id: newId, time, text: `> ${userText}`, type: 'user' }]);
    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, caseId: caseId || undefined })
      });
      const data = await res.json();
      if (data.success) {
        setCaseId(data.caseId);
        setLogs(prev => [...prev, { id: Date.now(), time: new Date().toLocaleTimeString(), text: data.response, type: 'action' }]);
      } else {
        setLogs(prev => [...prev, { id: Date.now(), time: new Date().toLocaleTimeString(), text: 'Error procesando solicitud.', type: 'error' }]);
      }
    } catch (err) {
      setLogs(prev => [...prev, { id: Date.now(), time: new Date().toLocaleTimeString(), text: 'Error de red con el backend.', type: 'error' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '2rem', display: 'flex', flexDirection: 'column', flex: 1, minHeight: '350px' }}>
      <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
        <Terminal size={16} /> Terminal Autónoma (MINT)
      </h3>
      
      <div className="custom-scrollbar" style={{ flex: 1, background: '#020403', borderRadius: '8px', padding: '1rem', overflowY: 'auto', border: '1px solid rgba(0,255,102,0.1)', fontFamily: 'monospace', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1rem' }}>
        {logs.map((log) => (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }} key={log.id} style={{ display: 'flex', gap: '10px' }}>
            <span style={{ color: 'var(--text-secondary)', opacity: 0.7, whiteSpace: 'nowrap' }}>[{log.time}]</span>
            <span style={{ color: log.type === 'error' ? 'var(--danger-color)' : log.type === 'user' ? '#fff' : log.type === 'warning' ? 'var(--warning-color)' : log.type === 'action' ? 'var(--mint-primary)' : 'var(--text-primary)' }}>
              {log.text}
            </span>
          </motion.div>
        ))}
        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '10px', color: 'var(--text-secondary)' }}>
            <Loader2 size={14} className="spin-animation" style={{ color: 'var(--mint-primary)' }} />
            <span style={{ fontStyle: 'italic' }}>MINT está procesando...</span>
          </motion.div>
        )}
      </div>

      <form onSubmit={handleSend} style={{ display: 'flex', gap: '10px' }}>
        <input 
          type="text" 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          placeholder="Escribe una instrucción al agente..." 
          style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', borderRadius: '6px', padding: '10px', color: '#fff', outline: 'none' }} 
        />
        <button type="submit" className="mint-button primary" disabled={isLoading} style={{ padding: '0 20px', borderRadius: '6px', opacity: isLoading ? 0.5 : 1 }}>Enviar</button>
      </form>
    </div>
  );
};

const data = [
  { name: 'Lun', uv: 20 }, { name: 'Mar', uv: 45 }, { name: 'Mie', uv: 30 }, { name: 'Jue', uv: 80 }, { name: 'Vie', uv: 63 }
];

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [decisions, setDecisions] = useState([
    { id: '1', title: 'Microcontrolador MCU-X1', subtitle1: 'Stock Actual', metric1: '180 uds', subtitle2: 'Orden Sugerida', metric2: '31,450 uds', cost: '$12,450.00' },
    { id: '2', title: 'Reparación de Sensores Ópticos', subtitle1: 'Presupuesto', metric1: '$40 USD', subtitle2: 'Costo Imprevisto', metric2: '$1,480 USD', cost: '$1,480.00' }
  ]);
  const [selectedDecision, setSelectedDecision] = useState<any>(null);
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCmdOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleApprove = (id: string) => {
    toast.success('Decisión aprobada. El agente ejecutará la orden.');
    setDecisions(prev => prev.filter(d => d.id !== id));
    setSelectedDecision(null);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Toaster theme="dark" position="top-center" toastOptions={{ style: { background: '#0A0A0A', border: '1px solid var(--mint-primary)', color: '#fff' } }} />
      
      {/* CmdK Palette Modal */}
      <AnimatePresence>
        {cmdOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'center', paddingTop: '10vh', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setCmdOpen(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }} onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '600px' }}>
              <Command className="cmdk-root">
                <Command.Input placeholder="Busca componentes, configuraciones o logs del agente..." autoFocus className="cmdk-input" />
                <Command.List className="cmdk-list custom-scrollbar">
                  <Command.Empty className="cmdk-empty">No se encontraron resultados.</Command.Empty>
                  <Command.Group heading="Acciones del Agente" className="cmdk-group">
                    <Command.Item className="cmdk-item" onSelect={() => { toast('Forzando actualización de inventario...'); setCmdOpen(false); }}><Activity size={16} /> Refrescar Análisis de Inventario</Command.Item>
                    <Command.Item className="cmdk-item" onSelect={() => setCmdOpen(false)}><Terminal size={16} /> Ver Logs Completos</Command.Item>
                  </Command.Group>
                  <Command.Group heading="Navegación" className="cmdk-group">
                    <Command.Item className="cmdk-item" onSelect={() => setCmdOpen(false)}><Settings size={16} /> Ajustes Generales</Command.Item>
                    <Command.Item className="cmdk-item" onSelect={() => setCmdOpen(false)}><Database size={16} /> Base de Datos (ORM)</Command.Item>
                  </Command.Group>
                </Command.List>
              </Command>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Sidebar currentView={currentView} setView={setCurrentView} />
      <Drawer.Root direction="right" open={!!selectedDecision} onOpenChange={(open) => !open && setSelectedDecision(null)}>
        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <Header onOpenCmd={() => setCmdOpen(true)} />
          
          <main style={{ flex: 1, padding: '1rem 2.5rem 2.5rem', display: 'flex', gap: '2.5rem', overflow: 'hidden' }}>
            
            {currentView === 'dashboard' && (
              <>
                <div style={{ flex: '2', maxWidth: '750px', overflowY: 'auto', paddingRight: '10px' }} className="custom-scrollbar">
              <h2 style={{ fontSize: '1.4rem', marginBottom: '2rem', fontWeight: 400, color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--warning-color)', fontWeight: 600, fontSize: '1.8rem' }}>{decisions.length}</span> decisiones te necesitan
              </h2>
              
              <AnimatePresence>
                {decisions.map((decision, index) => (
                  <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }} transition={{ type: 'spring', stiffness: 300, damping: 25, delay: index * 0.1 }} key={decision.id} className="glass-panel hover-lift" style={{ padding: '1.8rem', marginBottom: '1.5rem', border: selectedDecision?.id === decision.id ? '1px solid var(--mint-primary)' : '' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem', color: 'var(--text-primary)', fontWeight: 500 }}>{decision.title}</h3>
                      <button onClick={() => setSelectedDecision(decision)} className="mint-button" style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>Gestionar <ChevronRight size={14} /></button>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '4rem', marginBottom: '2rem' }}>
                      <div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>{decision.subtitle1}</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{decision.metric1}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>{decision.subtitle2}</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 600, color: 'var(--warning-color)' }}>{decision.metric2}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleApprove(decision.id)} className="mint-button primary" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}><Check size={18} /> Aprobar</motion.button>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="mint-button danger" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}><X size={18} /> Rechazar</motion.button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {decisions.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <img src="/src/assets/icon.png" alt="Mint Logo" style={{ width: '64px', height: '64px', objectFit: 'contain', margin: '0 auto 1.5rem', opacity: 0.6, filter: 'grayscale(50%)' }} />
                  <p>¡Todo al día! El agente no requiere tu intervención.</p>
                </motion.div>
              )}

              {/* Nuevos Módulos de Estado de Logística */}
              <div style={{ marginTop: '2rem', display: 'flex', gap: '1.5rem' }}>
                <div className="glass-panel" style={{ flex: 1, padding: '1.5rem' }}>
                  <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                    <FileText size={16} /> Últimas Órdenes Creadas
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                      <span style={{ color: '#fff', fontSize: '0.9rem' }}>ORD-2026-001</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Hace 2h</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                      <span style={{ color: '#fff', fontSize: '0.9rem' }}>ORD-2026-002</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Hace 5h</span>
                    </div>
                  </div>
                </div>

                <div className="glass-panel" style={{ flex: 1, padding: '1.5rem' }}>
                  <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                    <Activity size={16} /> Inventario Crítico
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px' }}>
                      <span style={{ color: '#fff', fontSize: '0.9rem' }}>Microcontrolador MCU-32</span>
                      <span style={{ color: 'var(--danger-color)', fontSize: '0.85rem', fontWeight: 600 }}>8 / 20</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '8px' }}>
                      <span style={{ color: '#fff', fontSize: '0.9rem' }}>Engrane Transmisión</span>
                      <span style={{ color: 'var(--warning-color)', fontSize: '0.85rem', fontWeight: 600 }}>0 / 50</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <motion.div animate={{ opacity: selectedDecision ? 0.4 : 1, scale: selectedDecision ? 0.98 : 1 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} style={{ flex: '1.2', display: 'flex', flexDirection: 'column' }}>

              <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ margin: '0 0 2rem 0', fontSize: '1.1rem', fontWeight: 500, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Lo que hizo MINT esta semana</span>
                  <Activity size={18} color="var(--mint-primary)" />
                </h3>
                
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ flex: 1, background: 'rgba(0, 255, 102, 0.05)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(0, 255, 102, 0.1)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Tickets</div>
                    <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--mint-primary)' }}>63</div>
                  </div>
                  <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', padding: '1.2rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Ahorro</div>
                    <div style={{ fontSize: '2rem', fontWeight: 600 }}>$4.2K</div>
                  </div>
                </div>

                <div style={{ width: '100%', height: '140px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)', fontSize: 12}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)', fontSize: 12}} />
                      <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{background: 'var(--bg-color)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff'}} />
                      <Bar dataKey="uv" radius={[4, 4, 0, 0]}>
                        {data.map((entry, index) => <Cell key={`cell-${index}`} fill={index === data.length - 1 ? 'var(--mint-primary)' : 'rgba(0, 255, 102, 0.3)'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
                <AgentConsole />
              </motion.div>
              </>
            )}

            {currentView === 'database' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
                <div className="glass-panel" style={{ padding: '2rem', flex: 1 }}>
                  <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Database size={20} color="var(--mint-primary)" /> Explorador de Esquemas (Base de Datos)
                  </h3>
                  <p style={{ color: 'var(--text-secondary)' }}>Aquí se visualizarán las tablas reales de inventario y agentes conectadas mediante Drizzle ORM.</p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginTop: '2rem' }}>
                    <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '12px' }}>
                      <div style={{ color: 'var(--mint-primary)', marginBottom: '8px', fontWeight: 500 }}>Tabla: inventory</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>SKU, quantity, minimum, last_updated</div>
                    </div>
                    <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '12px' }}>
                      <div style={{ color: 'var(--mint-primary)', marginBottom: '8px', fontWeight: 500 }}>Tabla: cases</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>id, status, agent_assigned, priority</div>
                    </div>
                    <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '12px' }}>
                      <div style={{ color: 'var(--mint-primary)', marginBottom: '8px', fontWeight: 500 }}>Tabla: orders</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>order_id, amount, human_approved, created_at</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {currentView === 'activity' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                 <div className="glass-panel" style={{ padding: '2rem', flex: 1 }}>
                  <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Activity size={20} color="var(--mint-primary)" /> Actividad y Logs del Agente
                  </h3>
                  <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <Terminal size={48} style={{ opacity: 0.3, marginBottom: '1rem', display: 'inline-block' }} />
                    <p>Los logs detallados de la terminal de MINT (ReAct Loop) aparecerán aquí.</p>
                  </div>
                </div>
              </motion.div>
            )}

          </main>

          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 bg-black/40" style={{ zIndex: 50, position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
            <Drawer.Content style={{ position: 'fixed', top: '0', right: '0', bottom: '0', width: '450px', zIndex: 100, display: 'flex', flexDirection: 'column', background: '#0a0a0a', borderLeft: '1px solid var(--mint-glow)', boxShadow: '-10px 0 30px rgba(0,0,0,0.8)' }}>
              <div style={{ padding: '2.5rem', flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                {selectedDecision && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                      <Drawer.Title style={{ margin: 0, fontSize: '1.4rem', fontWeight: 600, color: '#fff' }}>Confirmar Compra</Drawer.Title>
                      <button onClick={() => setSelectedDecision(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={24} /></button>
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border-glass)', marginBottom: '2rem' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Producto / Servicio</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 500, marginBottom: '1.5rem', color: '#fff' }}>{selectedDecision.title}</div>
                        <div style={{ height: '1px', background: 'var(--border-glass)', margin: '1rem 0' }}></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Justificación IA</span>
                          <span style={{ color: 'var(--mint-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}><BrainCircuit size={14} /> Alta Probabilidad Rotura</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 600, marginTop: '2rem', color: '#fff' }}>
                          <span>Total Estimado</span>
                          <span>{selectedDecision.cost}</span>
                        </div>
                      </div>
                      
                      <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <Bell color="var(--warning-color)" size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', lineHeight: '1.5' }}>
                          Esta compra excede el límite automatizado de $1,000 USD y requiere tu confirmación criptográfica para ser ejecutada.
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleApprove(selectedDecision.id)} className="mint-button primary" style={{ flex: 1, padding: '14px', fontSize: '1rem' }}>
                        Confirmar Ejecución
                      </motion.button>
                    </div>
                  </>
                )}
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </div>
      </Drawer.Root>
    </div>
  );
}

export default App;
