import React from "react";
import { Button } from "../ui/Button";
import { StatusBadge } from "../ui/StatusBadge";
import { KpiStrip } from "../ui/KpiStrip";
import { motion } from "motion/react";
import {
  Boxes,
  AlertTriangle,
  ClipboardList,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Clock,
  ArrowRight,
  ShoppingCart,
  UserCheck,
  Calendar,
  Slack,
  Mail,
  Radio,
  Cpu,
  BarChart3,
  Activity,
  Layers,
  ChevronDown,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";

interface DashboardOverviewViewProps {
  onNavigateTo: (tabId: string) => void;
  onOpenApproval: () => void;
}

export const DashboardOverviewView: React.FC<DashboardOverviewViewProps> = ({
  onNavigateTo,
  onOpenApproval,
}) => {
  const weeklyAnalytics = [
    { day: "Lun", val: 65, type: "solid", label: "45 ops" },
    { day: "Mar", val: 85, type: "deep", label: "72 ops" },
    { day: "Mié", val: 50, type: "hatched", label: "38 ops" },
    { day: "Jue", val: 100, type: "deep", label: "90 ops Pico", peak: true },
    { day: "Vie", val: 75, type: "hatched", label: "62 ops" },
    { day: "Sáb", val: 40, type: "solid", label: "28 ops" },
    { day: "Dom", val: 25, type: "hatched", label: "18 ops" },
  ];

  return (
    <div className="flex-1 h-full overflow-y-auto bg-canvas text-[#F9FAFB] font-sans select-none p-6 space-y-6">
      {/* 1. Saludo y Estado Superior */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2">
        <div>
          <span className="text-xs text-zinc-400 font-medium">Panel de Control Ejecutivo</span>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mt-0.5">
            Buenos días, Fernando.
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Mint está supervisando 3 bodegas, 338 SKUs y $482.5M COP en inventario físico en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-surface-1 border border-white/[0.08] text-xs cursor-default shadow-card"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <div className="text-left">
              <span className="text-white font-semibold">Agente autónomo activo</span>
              <span className="block text-[10px] text-zinc-400">
                Última verificación: 10:24 a. m.
              </span>
            </div>
          </motion.div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-1 border border-white/[0.08] text-xs text-zinc-300 shadow-card">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span>Hoy, 29 oct 2026</span>
            <ChevronDown className="w-3 h-3 text-zinc-500" />
          </div>
        </div>
      </div>

      {/* 2. Fila 1: KPI Strip de 4 Tarjetas con Hero Card Esmeralda (Donezo & CheckinOs) */}
      <KpiStrip
        metrics={[
          {
            value: "$482.5M",
            context: "Valorización de Inventario · +6.4% vs mes anterior",
            isHighlight: true,
          },
          {
            value: "342",
            context: "Productos en Catálogo · 3 almacenes sincronizados",
          },
          {
            value: "8",
            context: "Stock Bajo ROP · Requiere atención de reposición",
          },
          {
            value: "2",
            context: "Aprobaciones Pendientes · Superan umbral $5M COP",
          },
        ]}
      />

      {/* 3. Fila 2: Bento Grid Visual (3 Columnas Asimétricas inspiradas en Donezo & CheckinOs) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Columna 1 (5 cols): Velocidad y Flujo de Operaciones (Donezo Project Analytics) */}
        <div className="lg:col-span-5 rounded-2xl bg-surface-1 border border-white/[0.06] p-5 shadow-card flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Flujo de Operaciones y Movimiento
              </h2>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Despachos y reabastecimientos ejecutados por semana
              </p>
            </div>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              7 Días · Consolidado
            </span>
          </div>

          {/* Gráfico de barras gruesas redondeadas */}
          <div className="pt-6 pb-2 px-3">
            <div className="h-36 flex items-end justify-between gap-2.5 sm:gap-3.5 relative">
              {weeklyAnalytics.map((bar, idx) => {
                const barColor =
                  bar.type === "solid"
                    ? "bg-[#10B981]"
                    : bar.type === "deep"
                    ? "bg-[#047857]"
                    : "bg-hatched-emerald";

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end relative group">
                    {/* Tooltip flotante sobre barra pico */}
                    {bar.peak && (
                      <div className="absolute -top-7 px-2 py-0.5 rounded-full bg-[#14201A] border border-emerald-400/40 text-[10px] font-mono font-bold text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)] whitespace-nowrap z-20">
                        <span>90 Despachos</span>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#14201A] border-r border-b border-emerald-400/40 transform rotate-45 -mt-0.5" />
                      </div>
                    )}

                    {/* Barra gruesa redondeada */}
                    <div
                      style={{ height: `${bar.val}%` }}
                      className={`w-full max-w-[38px] rounded-2xl transition-all duration-300 group-hover:scale-y-105 origin-bottom shadow-sm ${barColor}`}
                      title={`${bar.day}: ${bar.label}`}
                    />

                    {/* Letra del día */}
                    <span className="text-xs font-mono font-medium text-zinc-400 mt-2.5">
                      {bar.day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Leyenda de colores */}
          <div className="flex flex-wrap items-center justify-between pt-3 border-t border-white/[0.04] text-[11px] text-zinc-400 font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
              <span>Despachos Físicos</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#047857]" />
              <span>Compras Confirmadas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-hatched-emerald border border-emerald-400/30" />
              <span>Proyección IA</span>
            </div>
          </div>
        </div>

        {/* Columna 2 (4 cols): Acciones Pendientes (CheckinOs Tasks Style) */}
        <div className="lg:col-span-4 rounded-2xl bg-surface-1 border border-white/[0.06] p-5 shadow-card flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white tracking-tight">Acciones pendientes</h2>
            </div>
            <button
              onClick={() => onNavigateTo("aprobaciones")}
              className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1 font-medium"
            >
              <span>Ver todas</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {/* Acción 1 */}
            <div
              onClick={onOpenApproval}
              className="p-3 rounded-xl bg-surface-well border border-white/[0.04] hover:border-white/10 transition-all cursor-pointer flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white group-hover:text-emerald-300 transition-colors truncate">
                    Orden #OC-402 · DeWalt Colombia
                  </p>
                  <p className="text-[11px] text-zinc-400 font-mono">
                    Rotomartillos SDS · $6.375.000 COP
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold font-mono">
                HITL
              </span>
            </div>

            {/* Acción 2 */}
            <div
              onClick={() => onNavigateTo("inventario")}
              className="p-3 rounded-xl bg-surface-well border border-white/[0.04] hover:border-white/10 transition-all cursor-pointer flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white group-hover:text-amber-300 transition-colors truncate">
                    Quiebre ROP en Disco Diamantado
                  </p>
                  <p className="text-[11px] text-zinc-400 font-mono">
                    8u restantes · Bucaramanga Matriz
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold font-mono">
                Quiebre
              </span>
            </div>

            {/* Acción 3 */}
            <div
              onClick={() => onNavigateTo("proveedores")}
              className="p-3 rounded-xl bg-surface-well border border-white/[0.04] hover:border-white/10 transition-all cursor-pointer flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white group-hover:text-blue-300 transition-colors truncate">
                    Homologación Siderúrgica Santander
                  </p>
                  <p className="text-[11px] text-zinc-400 font-mono">
                    RUT & Certificado Bancario verificado
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold font-mono">
                Validar
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-[11px] text-zinc-500 font-mono">
            <span>2 órdenes superan los $5.000.000 COP</span>
            <span className="text-emerald-400 font-semibold">Regla GOV-03</span>
          </div>
        </div>

        {/* Columna 3 (3 cols): Estado y Rendimiento del Agente (Donezo Project Progress Style) */}
        <div className="lg:col-span-3 rounded-2xl bg-surface-1 border border-white/[0.06] p-5 shadow-card flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white tracking-tight">Rendimiento Núcleo IA</h2>
            </div>
            <button
              onClick={() => onNavigateTo("flujo_agente")}
              className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1 font-medium"
            >
              <span>Detalles</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* Medidor en Arco Semicircular de 180° */}
          <div className="flex flex-col items-center justify-center py-1 relative">
            <svg viewBox="0 0 200 115" className="w-48 max-w-full overflow-visible">
              <defs>
                <pattern
                  id="dashHatch"
                  width="8"
                  height="8"
                  patternTransform="rotate(45)"
                  patternUnits="userSpaceOnUse"
                >
                  <line x1="0" y1="0" x2="0" y2="8" stroke="#34D399" strokeWidth="2.5" />
                </pattern>
              </defs>

              <path
                d="M 25,100 A 75,75 0 0,1 175,100"
                fill="none"
                stroke="#16221B"
                strokeWidth="16"
                strokeLinecap="round"
              />

              <path
                d="M 25,100 A 75,75 0 0,1 175,100"
                fill="none"
                stroke="#10B981"
                strokeWidth="16"
                strokeDasharray="210 236"
                strokeDashoffset="0"
                strokeLinecap="round"
              />

              <path
                d="M 25,100 A 75,75 0 0,1 175,100"
                fill="none"
                stroke="url(#dashHatch)"
                strokeWidth="16"
                strokeDasharray="26 236"
                strokeDashoffset="-210"
                strokeLinecap="round"
              />
            </svg>

            <div className="absolute top-[48px] text-center">
              <span className="text-3xl font-extrabold font-mono text-white tracking-tight">
                98%
              </span>
              <span className="block text-[11px] font-medium text-zinc-400 -mt-0.5">
                Operativo
              </span>
            </div>
          </div>

          {/* Desglose en Contenedor Well */}
          <div className="bg-surface-well rounded-xl p-3 border border-white/[0.04] space-y-1.5 text-xs font-mono text-zinc-400">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Tareas completadas:</span>
              </span>
              <strong className="text-white font-bold">44</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>En curso / HITL:</span>
              </span>
              <strong className="text-white font-bold">4</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-zinc-600" />
                <span>Tareas fallidas:</span>
              </span>
              <strong className="text-zinc-500">0</strong>
            </div>
          </div>

          <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-zinc-500">
            <span>Latencia: 1.2s</span>
            <span className="text-emerald-400">PostgreSQL persistido</span>
          </div>
        </div>
      </div>

      {/* 4. Fila 3: Canales de Notificación y Auditoría Reciente */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Auditoría Reciente */}
        <div className="p-5 rounded-2xl bg-surface-1 border border-white/[0.06] shadow-card space-y-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white">Actividad de auditoría reciente</h3>
            </div>
            <button
              onClick={() => onNavigateTo("auditoria_eventos")}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 hover:underline font-medium cursor-pointer"
            >
              Ver todas →
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-xl bg-surface-well border border-white/[0.04] flex items-start gap-2.5">
              <span className="text-[10px] font-mono text-emerald-400 mt-0.5 font-bold">10:24</span>
              <div>
                <p className="text-xs font-medium text-white">
                  Auditoría ROP finalizada: 74 SKUs escaneados
                </p>
                <p className="text-[10px] text-zinc-400">
                  8 SKUs marcados para reposición en Bucaramanga
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-surface-well border border-white/[0.04] flex items-start gap-2.5">
              <span className="text-[10px] font-mono text-amber-400 mt-0.5 font-bold">08:32</span>
              <div>
                <p className="text-xs font-medium text-white">
                  Aprobación requerida por superar umbral
                </p>
                <p className="text-[10px] text-zinc-400">
                  Compra de material eléctrico · $6.375.000 COP
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Canales de Notificación */}
        <div className="p-5 rounded-2xl bg-surface-1 border border-white/[0.06] shadow-card space-y-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white">Canales de notificación</h3>
            </div>
            <StatusBadge status="ok" label="3 activos" size="sm" />
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-xl bg-surface-well border border-white/[0.04] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-surface-1 border border-white/[0.06]">
                  <Slack className="w-3.5 h-3.5 text-zinc-300" />
                </div>
                <div>
                  <p className="text-xs font-medium text-white">Slack Bot</p>
                  <p className="text-[10px] text-zinc-400">Alertas y aprobaciones HITL</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                Activo
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-well border border-white/[0.04] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-surface-1 border border-white/[0.06]">
                  <Mail className="w-3.5 h-3.5 text-zinc-300" />
                </div>
                <div>
                  <p className="text-xs font-medium text-white">Email SMTP</p>
                  <p className="text-[10px] text-zinc-400">Reportes diarios de gestión</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                Activo
              </span>
            </div>
          </div>
        </div>

        {/* CTA: El agente está trabajando */}
        <div className="p-5 rounded-2xl bg-surface-1 border border-white/[0.06] shadow-card flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="text-sm font-bold text-white">El agente está trabajando</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Analizando existencias físicas, órdenes y reglas de gobernanza para mantener tus operaciones siempre en marcha.
            </p>
          </div>

          <div className="pt-4">
            <button
              onClick={() => onNavigateTo("flujo_agente")}
              className="w-full h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-between px-4 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.45)]"
            >
              <span>Ver flujo del agente</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
