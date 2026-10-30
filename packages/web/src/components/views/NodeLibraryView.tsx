import React from "react";
import {
  Database,
  Bot,
  Zap,
  CheckCircle2,
  Bell,
  FileSpreadsheet,
  Plus,
  Shield,
  Truck,
  TrendingUp,
  Sliders,
  Layers,
} from "lucide-react";

interface NodeLibraryViewProps {
  onAddNode: (type: string, title: string) => void;
}

export const NodeLibraryView: React.FC<NodeLibraryViewProps> = ({ onAddNode }) => {
  const categories = [
    {
      title: "Fuentes de Datos & Sensores",
      badge: "ENTRADAS",
      items: [
        {
          id: "trig_postgres",
          title: "Sincronización PostgreSQL",
          desc: "Monitoreo continuo de existencias físicas, stock de seguridad y punto de reorden (ROP).",
          icon: Database,
          type: "trigger",
        },
        {
          id: "trig_csv",
          title: "Ingesta de Archivo CSV / Excel",
          desc: "Carga masiva de catálogo de productos o listas de precios de nuevos proveedores.",
          icon: FileSpreadsheet,
          type: "trigger",
        },
        {
          id: "trig_webhook",
          title: "Webhook de Telemetría",
          desc: "Disparador activado por alertas viales, cierres de carretera o arribos a muelle.",
          icon: Zap,
          type: "trigger",
        },
      ],
    },
    {
      title: "Especialistas de Decisión Autónoma",
      badge: "AGENTES",
      items: [
        {
          id: "agent_mint",
          title: "Coordinador General Mint",
          desc: "Orquestador principal que balancea inventario, fletes y presupuestos.",
          icon: Bot,
          type: "agent",
        },
        {
          id: "agent_risk",
          title: "Auditor de Riesgo y Gobernanza",
          desc: "Verifica duplicados en 72h, solvencia de proveedores y límites de compra.",
          icon: Shield,
          type: "agent",
        },
        {
          id: "agent_transport",
          title: "Optimizador Logístico OSRM",
          desc: "Calcula distancias viales, tiempos de tránsito y fletes más económicos.",
          icon: Truck,
          type: "agent",
        },
        {
          id: "agent_demand",
          title: "Pronosticador de Demanda",
          desc: "Proyección de consumo de SKUs y cálculo de días de cobertura.",
          icon: TrendingUp,
          type: "agent",
        },
      ],
    },
    {
      title: "Acciones Operativas & Gatekeepers",
      badge: "ACCIONES",
      items: [
        {
          id: "act_po",
          title: "Generar Orden de Compra",
          desc: "Emisión de orden formal con firma criptográfica HMAC y conciliación de precio.",
          icon: CheckCircle2,
          type: "action",
        },
        {
          id: "act_hitl",
          title: "Retener en Bandeja HITL",
          desc: "Pausa compras superiores a $5.000.000 COP para confirmación humana.",
          icon: Bell,
          type: "action",
        },
        {
          id: "act_stock",
          title: "Rebalanceo de Inventario",
          desc: "Transferencia de mercancía entre Bucaramanga, Bogotá y Medellín.",
          icon: Sliders,
          type: "action",
        },
      ],
    },
  ];

  return (
    <div className="flex-1 h-full overflow-y-auto bg-canvas text-[#F9FAFB] font-sans select-none flex flex-col p-6 space-y-6">
      {/* Header */}
      <header className="pb-4 border-b border-white/[0.06]">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Biblioteca de Nodos Operacionales
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Selecciona o añade módulos al lienzo de trabajo para enriquecer el comportamiento autónomo
        </p>
      </header>

      {/* Categorías */}
      <div className="space-y-6">
        {categories.map((cat) => (
          <div key={cat.title} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                {cat.badge}
              </span>
              <span className="text-zinc-600 text-xs">•</span>
              <h3 className="text-sm font-bold text-white">{cat.title}</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cat.items.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    onClick={() => onAddNode(item.type, item.title)}
                    className="p-5 rounded-2xl bg-surface-1 border border-white/[0.06] hover:border-emerald-500/40 transition-all group flex flex-col justify-between cursor-pointer shadow-xl hover:shadow-[0_0_25px_rgba(16,185,129,0.15)]"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 rounded-xl bg-surface-well border border-white/[0.06] text-emerald-400 group-hover:scale-110 transition-transform">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="p-1 rounded-lg text-zinc-400 group-hover:text-white group-hover:bg-white/[0.06] transition-colors">
                          <Plus className="w-4 h-4" />
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>

                    <div className="bg-surface-well rounded-xl p-2.5 mt-4 border border-white/[0.04] flex items-center justify-between text-[11px] font-mono text-zinc-500">
                      <span>Click para añadir</span>
                      <span className="text-emerald-400 font-semibold">+ Agregar</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
