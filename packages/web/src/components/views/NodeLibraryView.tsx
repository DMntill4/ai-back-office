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
} from "lucide-react";

interface NodeLibraryViewProps {
  onAddNode: (type: string, title: string) => void;
}

export const NodeLibraryView: React.FC<NodeLibraryViewProps> = ({ onAddNode }) => {
  const categories = [
    {
      title: "Triggers & Fuentes de Datos",
      badge: "INPUTS",
      items: [
        {
          id: "trig_postgres",
          title: "PostgreSQL Database Sync",
          desc: "Monitoreo continuo de tablas de inventario, stock real y ROP dinámico.",
          icon: Database,
          type: "trigger",
        },
        {
          id: "trig_csv",
          title: "Ingesta de Archivo CSV / Excel",
          desc: "Carga masiva de catálogo o listas de precios de nuevos proveedores.",
          icon: FileSpreadsheet,
          type: "trigger",
        },
        {
          id: "trig_webhook",
          title: "Webhook de Alerta Externa",
          desc: "Disparador activado por incidencias en transporte o ventas extraordinarias.",
          icon: Zap,
          type: "trigger",
        },
      ],
    },
    {
      title: "Especialistas Multi-Agente",
      badge: "AGENTS",
      items: [
        {
          id: "agent_mint",
          title: "Coordinador General Mint [MAIN]",
          desc: "Director logístico que orquesta la toma de decisiones y el bucle ReAct.",
          icon: Bot,
          type: "agent",
        },
        {
          id: "agent_risk",
          title: "Abogado del Diablo (Riesgo)",
          desc: "Audita duplicados en 72h, solvencia de proveedores y dispersión de precios.",
          icon: Shield,
          type: "agent",
        },
        {
          id: "agent_transport",
          title: "Especialista Logístico OSRM",
          desc: "Calcula distancias viales, tiempos en carretera y costo de fletes.",
          icon: Truck,
          type: "agent",
        },
        {
          id: "agent_demand",
          title: "Pronosticador de Demanda",
          desc: "Cálculo de burn rate y semanas de cobertura sobre historial de ventas.",
          icon: TrendingUp,
          type: "agent",
        },
      ],
    },
    {
      title: "Acciones Operativas & Gatekeepers",
      badge: "ACTIONS",
      items: [
        {
          id: "act_po",
          title: "Crear Orden de Compra",
          desc: "Emisión formal con firma criptográfica HMAC y validación de idempotencia.",
          icon: CheckCircle2,
          type: "action",
        },
        {
          id: "act_hitl",
          title: "Escalar a Bandeja /inbox (HITL)",
          desc: "Encola órdenes mayores a $5,000,000 COP para autorización del operador.",
          icon: Bell,
          type: "action",
        },
        {
          id: "act_stock",
          title: "Ajuste de Stock en Almacén",
          desc: "Modificación física de existencias en Bucaramanga, Bogotá o Medellín.",
          icon: Sliders,
          type: "action",
        },
      ],
    },
  ];

  return (
    <div className="flex-1 h-full overflow-y-auto p-8 bg-[#070c09] space-y-8 select-none">
      {/* View Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-white tracking-tight">Node Library</h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#102418] text-mint-400 border border-[#1b3d27]">
            CATÁLOGO OPERATIVO
          </span>
        </div>
        <p className="text-xs text-gray-400">
          Selecciona o añade módulos al flujo de trabajo para enriquecer el comportamiento del agente autónomo.
        </p>
      </div>

      {/* Categories */}
      <div className="space-y-6">
        {categories.map((cat) => (
          <div key={cat.title} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-mint-400 uppercase tracking-wider">
                {cat.badge}
              </span>
              <span className="text-gray-600 text-xs">•</span>
              <h3 className="text-sm font-bold text-gray-200">{cat.title}</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {cat.items.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-[#0c1510] border border-[#1b3425] hover:border-mint-500/50 hover:bg-[#101e16] transition-all group flex flex-col justify-between cursor-pointer"
                    onClick={() => onAddNode(item.type, item.title)}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="p-2 rounded-xl bg-[#14291d] border border-[#1e3e2b] text-mint-400 group-hover:scale-110 transition-transform">
                          <Icon className="w-4 h-4" />
                        </div>
                        <button
                          type="button"
                          className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-[#1a3324] transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      <h4 className="text-sm font-bold text-gray-100 group-hover:text-mint-300 transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-[#16291e] flex items-center justify-between text-[11px] font-mono text-gray-500">
                      <span>Click para añadir al lienzo</span>
                      <span className="text-mint-400 font-semibold">+ Agregar</span>
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
