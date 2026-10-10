import React, { useState, useEffect } from 'react';
import { Home, Activity, Settings, Bell, Check, X, Share2, BrainCircuit, ChevronRight, Terminal, Loader2, Search, User, FileText, Database, MessageSquare, TrendingUp, Grid } from 'lucide-react';
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
    
    <NavTooltip content="Resumen General"><div onClick={() => setView('dashboard')} className={`sidebar-icon ${currentView === 'dashboard' ? 'active' : ''}`}><Home size={22} /></div></NavTooltip>
    <NavTooltip content="Charla con el Agente"><div onClick={() => setView('chat')} className={`sidebar-icon ${currentView === 'chat' ? 'active' : ''}`}><MessageSquare size={22} /></div></NavTooltip>
    <NavTooltip content="Rendimiento y Logística"><div onClick={() => setView('performance')} className={`sidebar-icon ${currentView === 'performance' ? 'active' : ''}`}><TrendingUp size={22} /></div></NavTooltip>
    <NavTooltip content="Base de Datos (ORM)"><div onClick={() => setView('database')} className={`sidebar-icon ${currentView === 'database' ? 'active' : ''}`}><Database size={22} /></div></NavTooltip>
    <NavTooltip content="Actividad y Logs"><div onClick={() => setView('activity')} className={`sidebar-icon ${currentView === 'activity' ? 'active' : ''}`}><Activity size={22} /></div></NavTooltip>
    <div style={{ flex: 1 }}></div>
    <NavTooltip content="Módulos y Ajustes"><div onClick={() => setView('modules')} className={`sidebar-icon ${currentView === 'modules' ? 'active' : ''}`}><Grid size={22} /></div></NavTooltip>
  </aside>
);

const Header = ({ onOpenCmd }: { onOpenCmd: () => void }) => (
  <header style={{ padding: '1.5rem 2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
      <h1 style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
        <span style={{ 
          fontSize: '2.2rem', 
          fontWeight: 800, 
          letterSpacing: '-1.5px', 
          fontFamily: '"Outfit", sans-serif', 
          background: 'linear-gradient(180deg, #D7F9A0 0%, #2E9B3B 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: 1
        }}>Mint</span>
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
  const [messages, setMessages] = useState<{id: number, text: string, role: 'user'|'agent'}[]>([
    { id: 1, text: 'Hola, soy MINT, tu agente de logística y negocios. ¿En qué puedo ayudarte hoy?', role: 'agent' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [caseId, setCaseId] = useState('');

  const suggestions = [
    "📦 Consultar productos sin stock",
    "📈 Ver rendimiento logístico",
    "📝 Historial de órdenes recientes",
    "🔍 Auditar últimos movimientos"
  ];

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    setInput('');
    const newId = Date.now();
    
    setMessages(prev => [...prev, { id: newId, text, role: 'user' }]);
    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, caseId: caseId || undefined })
      });
      const data = await res.json();
      if (data.success) {
        setCaseId(data.caseId);
        setMessages(prev => [...prev, { id: Date.now(), text: data.response, role: 'agent' }]);
      } else {
        setMessages(prev => [...prev, { id: Date.now(), text: 'Error procesando solicitud.', role: 'agent' }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now(), text: 'Error de red con el backend.', role: 'agent' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', flex: 1, minHeight: '500px' }}>
      <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
        <img src="/src/assets/icon.png" alt="MINT Logo" style={{ width: '22px', height: '22px', objectFit: 'contain', filter: 'drop-shadow(0 0 4px rgba(0,255,102,0.6))' }} /> Asistente MINT
      </h3>
      
      <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.5rem', paddingRight: '1rem' }}>
        {messages.map((msg) => (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', maxWidth: '85%', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: msg.role === 'user' ? 'rgba(255,255,255,0.1)' : 'rgba(0,255,102,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                {msg.role === 'user' ? <User size={16} color="#fff" /> : <img src="/src/assets/icon.png" alt="MINT" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />}
              </div>
              <div style={{ padding: '1rem 1.2rem', borderRadius: '16px', background: msg.role === 'user' ? 'rgba(255,255,255,0.05)' : 'rgba(0,255,102,0.05)', border: msg.role === 'user' ? '1px solid var(--border-glass)' : '1px solid rgba(0,255,102,0.2)', color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: '1.5', borderTopRightRadius: msg.role === 'user' ? '4px' : '16px', borderTopLeftRadius: msg.role === 'agent' ? '4px' : '16px' }}>
                {msg.text}
              </div>
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', gap: '10px', alignItems: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0,255,102,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <img src="/src/assets/icon.png" alt="MINT" style={{ width: '18px', height: '18px', objectFit: 'contain', filter: 'drop-shadow(0 0 4px rgba(0,255,102,0.4))' }} />
            </div>
            <div style={{ padding: '1rem', borderRadius: '16px', background: 'rgba(0,255,102,0.05)', border: '1px solid rgba(0,255,102,0.1)', display: 'flex', gap: '8px', alignItems: 'center' }}>
               <Loader2 size={16} className="spin-animation" style={{ color: 'var(--mint-primary)' }} />
               <span style={{ fontSize: '0.9rem', color: 'var(--mint-primary)' }}>Analizando base de datos...</span>
            </div>
          </motion.div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {suggestions.map((sug, i) => (
          <button key={i} onClick={() => handleSend(sug)} className="hover-lift" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', borderRadius: '20px', padding: '8px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {sug}
          </button>
        ))}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} style={{ display: 'flex', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
        <input 
          type="text" 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          placeholder="Pregunta sobre stock, logs, rendimiento o pide que ejecute una tarea..." 
          style={{ flex: 1, background: 'transparent', border: 'none', padding: '10px', color: '#fff', outline: 'none', fontSize: '0.95rem' }} 
        />
        <button type="submit" className="mint-button primary" disabled={isLoading} style={{ padding: '0 24px', borderRadius: '8px', opacity: isLoading ? 0.5 : 1 }}>Enviar</button>
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
            </motion.div>
            </>
            )}

            {currentView === 'chat' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
                  <AgentConsole />
                </div>
              </motion.div>
            )}

            {currentView === 'performance' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
                <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  <h3 style={{ margin: '0', fontSize: '1.2rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TrendingUp size={20} color="var(--mint-primary)" /> Rendimiento y Estado Logístico
                  </h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
                    <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '12px' }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px' }}>Eficiencia de Predicción</div>
                      <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--mint-primary)' }}>94.2%</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '8px' }}>+2.4% este mes</div>
                    </div>
                    <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '12px' }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px' }}>Roturas de Stock Evitadas</div>
                      <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#fff' }}>12</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '8px' }}>En los últimos 30 días</div>
                    </div>
                    <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '12px' }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px' }}>Tiempo Medio de Abastecimiento</div>
                      <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--warning-color)' }}>4.5 Días</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '8px' }}>Proveedores internacionales</div>
                    </div>
                  </div>

                  <div style={{ width: '100%', height: '300px', marginTop: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '1rem' }}>
                    <h4 style={{ color: 'var(--text-secondary)', margin: '0 0 1rem 0' }}>Flujo de Inventario (Mes)</h4>
                    <ResponsiveContainer width="100%" height="85%">
                      <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)', fontSize: 12}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)', fontSize: 12}} />
                        <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{background: 'var(--bg-color)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff'}} />
                        <Bar dataKey="uv" radius={[4, 4, 0, 0]}>
                          {data.map((entry, index) => <Cell key={`cell-${index}`} fill={'var(--mint-primary)'} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </motion.div>
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
                      <div style={{ color: 'var(--mint-primary)', marginBottom: '8px', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span>inventory</span> <span style={{fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px'}}>231 rows</span></div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>SKU (PK), quantity, minimum, last_updated</div>
                      <div style={{ marginTop: '15px', height: '4px', background: 'rgba(0,255,102,0.2)', borderRadius: '2px' }}><div style={{ width: '40%', height: '100%', background: 'var(--mint-primary)', borderRadius: '2px' }}></div></div>
                    </div>
                    <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '12px' }}>
                      <div style={{ color: 'var(--mint-primary)', marginBottom: '8px', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span>cases</span> <span style={{fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px'}}>15 rows</span></div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>id (PK), status, agent_assigned, priority</div>
                      <div style={{ marginTop: '15px', height: '4px', background: 'rgba(0,255,102,0.2)', borderRadius: '2px' }}><div style={{ width: '10%', height: '100%', background: 'var(--mint-primary)', borderRadius: '2px' }}></div></div>
                    </div>
                    <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '12px' }}>
                      <div style={{ color: 'var(--mint-primary)', marginBottom: '8px', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span>orders</span> <span style={{fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px'}}>48 rows</span></div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>order_id (PK), amount, human_approved, created_at</div>
                      <div style={{ marginTop: '15px', height: '4px', background: 'rgba(0,255,102,0.2)', borderRadius: '2px' }}><div style={{ width: '60%', height: '100%', background: 'var(--mint-primary)', borderRadius: '2px' }}></div></div>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '2rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}><Search size={16} color="var(--mint-primary)" /> Vista Previa: <span style={{ color: 'var(--mint-primary)', fontWeight: 400 }}>inventory</span></h4>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="mint-button" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Filtrar</button>
                        <button className="mint-button" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Exportar</button>
                      </div>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.03)' }}>
                            <th style={{ padding: '12px 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem' }}>SKU</th>
                            <th style={{ padding: '12px 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem' }}>Producto</th>
                            <th style={{ padding: '12px 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem' }}>Stock</th>
                            <th style={{ padding: '12px 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem' }}>Mínimo</th>
                            <th style={{ padding: '12px 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem' }}>Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="hover-lift" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s', cursor: 'pointer', transform: 'none', boxShadow: 'none' }}>
                            <td style={{ padding: '12px 1.5rem', color: '#fff', fontSize: '0.9rem' }}>MCU-X1</td>
                            <td style={{ padding: '12px 1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Microcontrolador X1</td>
                            <td style={{ padding: '12px 1.5rem', color: '#fff', fontSize: '0.9rem' }}>180</td>
                            <td style={{ padding: '12px 1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>200</td>
                            <td style={{ padding: '12px 1.5rem' }}><span style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning-color)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>Bajo Stock</span></td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '12px 1.5rem', color: '#fff', fontSize: '0.9rem' }}>SENS-OPT</td>
                            <td style={{ padding: '12px 1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Sensor Óptico V2</td>
                            <td style={{ padding: '12px 1.5rem', color: '#fff', fontSize: '0.9rem' }}>45</td>
                            <td style={{ padding: '12px 1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>50</td>
                            <td style={{ padding: '12px 1.5rem' }}><span style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning-color)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>Bajo Stock</span></td>
                          </tr>
                          <tr>
                            <td style={{ padding: '12px 1.5rem', color: '#fff', fontSize: '0.9rem' }}>PWR-500</td>
                            <td style={{ padding: '12px 1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Fuente de Poder 500W</td>
                            <td style={{ padding: '12px 1.5rem', color: '#fff', fontSize: '0.9rem' }}>320</td>
                            <td style={{ padding: '12px 1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>100</td>
                            <td style={{ padding: '12px 1.5rem' }}><span style={{ background: 'rgba(0, 255, 102, 0.1)', color: 'var(--mint-primary)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>Óptimo</span></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {currentView === 'activity' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                 <div className="glass-panel" style={{ padding: '2rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Activity size={20} color="var(--mint-primary)" /> Actividad y Auditoría del Sistema
                  </h3>
                  <div className="custom-scrollbar" style={{ flex: 1, background: '#020403', borderRadius: '8px', padding: '1rem', border: '1px solid rgba(255,255,255,0.05)', fontFamily: 'monospace', fontSize: '0.85rem', overflowY: 'auto' }}>
                    <div style={{ color: 'var(--text-secondary)', padding: '5px 0' }}>[10:05:22] CONEXIÓN: Pool DB (Postgres) establecida exitosamente.</div>
                    <div style={{ color: 'var(--text-secondary)', padding: '5px 0' }}>[10:06:10] CRON: Ejecutando verificación de inventario (Job ID: 492).</div>
                    <div style={{ color: 'var(--warning-color)', padding: '5px 0' }}>[10:06:15] AUDIT: 2 productos encontrados bajo el nivel crítico.</div>
                    <div style={{ color: 'var(--mint-primary)', padding: '5px 0' }}>[10:06:16] MINT: Generando reportes y preparando propuestas de órdenes.</div>
                    <div style={{ color: 'var(--text-secondary)', padding: '5px 0' }}>[10:12:05] LLM: Llamada al modelo completada (Tokens: 1450).</div>
                  </div>
                </div>
              </motion.div>
            )}

            {currentView === 'modules' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                 <div className="glass-panel" style={{ padding: '2rem', flex: 1 }}>
                  <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Grid size={20} color="var(--mint-primary)" /> Módulos y Extensiones
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    <div style={{ padding: '1.5rem', background: 'rgba(0,255,102,0.05)', border: '1px solid rgba(0,255,102,0.2)', borderRadius: '12px', display: 'flex', gap: '15px' }}>
                      <div style={{ background: 'var(--mint-primary)', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#000' }}><Database size={20} /></div>
                      <div>
                        <h4 style={{ margin: '0 0 5px 0', color: '#fff' }}>Drizzle ORM Connector</h4>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Módulo activo. Gestiona la conexión y queries tipadas a la BD.</p>
                      </div>
                    </div>
                    <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '12px', display: 'flex', gap: '15px' }}>
                      <div style={{ background: 'rgba(255,255,255,0.1)', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff' }}><Share2 size={20} /></div>
                      <div>
                        <h4 style={{ margin: '0 0 5px 0', color: '#fff' }}>Integración Nodemailer</h4>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Desactivado. Permite envío de alertas al administrador.</p>
                      </div>
                    </div>
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
