import React, { useState } from 'react';
import { Home, Activity, Settings, Bell, Check, X, Share2, BrainCircuit, ArrowRight, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import './index.css';

const Sidebar = () => (
  <aside style={{ width: '80px', borderRight: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 0', background: 'rgba(10,10,10,0.8)' }}>
    <div style={{ width: '40px', height: '40px', background: 'var(--mint-primary)', borderRadius: '12px', marginBottom: '3rem', boxShadow: '0 0 15px var(--mint-glow)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#000' }}>
      <BrainCircuit size={24} />
    </div>
    
    <div className="sidebar-icon active"><Home size={22} /></div>
    <div className="sidebar-icon"><Activity size={22} /></div>
    <div className="sidebar-icon"><Settings size={22} /></div>
  </aside>
);

const Header = () => (
  <header style={{ padding: '1.5rem 2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '12px', letterSpacing: '-0.5px' }}>
      <span style={{ color: 'var(--mint-primary)', textShadow: '0 0 10px var(--mint-glow)' }}>Mint</span> Dashboard
    </h1>
    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--bg-glass)', padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--border-glass)' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--mint-primary)', boxShadow: '0 0 8px var(--mint-primary)', animation: 'pulse 2s infinite' }}></div>
        <span style={{ color: 'var(--mint-primary)', fontSize: '0.85rem', fontWeight: 500 }}>Agente Activo</span>
      </div>
      <div style={{ position: 'relative', cursor: 'pointer', color: 'var(--text-secondary)' }}>
        <Bell size={20} />
        <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '8px', height: '8px', background: 'var(--danger-color)', borderRadius: '50%' }}></div>
      </div>
    </div>
  </header>
);

const data = [
  { name: 'Lun', uv: 20 }, { name: 'Mar', uv: 45 }, { name: 'Mie', uv: 30 }, { name: 'Jue', uv: 80 }, { name: 'Vie', uv: 63 }
];

function App() {
  const [selectedDecision, setSelectedDecision] = useState<string | null>(null);

  const mockDecisions = [
    { id: '1', title: 'Microcontrolador MCU-X1', subtitle1: 'Stock Actual', metric1: '180 uds', subtitle2: 'Orden Sugerida', metric2: '31,450 uds', cost: '$12,450.00' },
    { id: '2', title: 'Reparación de Sensores Ópticos', subtitle1: 'Presupuesto', metric1: '$40 USD', subtitle2: 'Costo Imprevisto', metric2: '$1,480 USD', cost: '$1,480.00' }
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <Header />
        
        <main style={{ flex: 1, padding: '1rem 2.5rem 2.5rem', display: 'flex', gap: '2.5rem', overflow: 'hidden' }}>
          
          {/* Main Content - Approval Queue */}
          <div style={{ flex: '2', maxWidth: '750px', overflowY: 'auto', paddingRight: '10px' }} className="custom-scrollbar">
            <h2 style={{ fontSize: '1.4rem', marginBottom: '2rem', fontWeight: 400, color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--warning-color)', fontWeight: 600, fontSize: '1.8rem' }}>2</span> decisiones te necesitan
            </h2>
            
            {mockDecisions.map(decision => (
              <div key={decision.id} className="glass-panel hover-lift" style={{ padding: '1.8rem', marginBottom: '1.5rem', border: selectedDecision === decision.id ? '1px solid var(--mint-primary)' : '' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem', color: 'var(--text-primary)', fontWeight: 500 }}>{decision.title}</h3>
                  <button onClick={() => setSelectedDecision(decision.id)} className="mint-button" style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Gestionar <ChevronRight size={14} />
                  </button>
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
                  <button className="mint-button primary" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                    <Check size={18} /> Aprobar
                  </button>
                  <button className="mint-button danger" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                    <X size={18} /> Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Right Panel - Analytics (Oculto parcialmente si el Drawer está abierto, o conviven) */}
          <div style={{ flex: '1.2', display: 'flex', flexDirection: 'column', transition: 'all 0.3s ease', opacity: selectedDecision ? 0.3 : 1, transform: selectedDecision ? 'scale(0.98)' : 'scale(1)' }}>
            <div className="glass-panel" style={{ padding: '2rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ margin: '0 0 2rem 0', fontSize: '1.1rem', fontWeight: 500, display: 'flex', justifyContent: 'space-between' }}>
                <span>Lo que hizo MINT esta semana</span>
                <Activity size={18} color="var(--mint-primary)" />
              </h3>
              
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '3rem' }}>
                <div style={{ flex: 1, background: 'rgba(0, 255, 102, 0.05)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(0, 255, 102, 0.1)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Tickets</div>
                  <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--mint-primary)' }}>63</div>
                </div>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', padding: '1.2rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Ahorro</div>
                  <div style={{ fontSize: '2rem', fontWeight: 600 }}>$4.2K</div>
                </div>
              </div>

              <div style={{ flex: 1, width: '100%', minHeight: '200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-secondary)', fontSize: 12}} />
                    <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{background: 'var(--bg-color)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: '#fff'}} />
                    <Bar dataKey="uv" radius={[4, 4, 0, 0]}>
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === data.length - 1 ? 'var(--mint-primary)' : 'rgba(0, 255, 102, 0.3)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Drawer: Detalles de Gestión */}
          <div className="glass-panel drawer" style={{ 
            position: 'absolute', top: '0', right: selectedDecision ? '0' : '-500px', 
            width: '450px', height: '100%', borderRight: 'none', borderRadius: '24px 0 0 24px',
            padding: '2.5rem', display: 'flex', flexDirection: 'column', zIndex: 100,
            background: 'rgba(10, 10, 10, 0.95)', borderLeft: '1px solid var(--mint-glow)',
            boxShadow: '-10px 0 30px rgba(0,0,0,0.8)'
          }}>
            {selectedDecision && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 600 }}>Confirmar Compra</h2>
                  <button onClick={() => setSelectedDecision(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={24} /></button>
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border-glass)', marginBottom: '2rem' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Producto / Servicio</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 500, marginBottom: '1.5rem' }}>
                      {mockDecisions.find(d => d.id === selectedDecision)?.title}
                    </div>
                    
                    <div style={{ height: '1px', background: 'var(--border-glass)', margin: '1rem 0' }}></div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Justificación IA</span>
                      <span style={{ color: 'var(--mint-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}><BrainCircuit size={14} /> Alta Probabilidad Rotura</span>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 600, marginTop: '2rem' }}>
                      <span>Total Estimado</span>
                      <span>{mockDecisions.find(d => d.id === selectedDecision)?.cost}</span>
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
                  <button className="mint-button primary" style={{ flex: 1, padding: '14px', fontSize: '1rem' }}>Confirmar Ejecución</button>
                </div>
              </>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}

export default App;
