import React from "react";
import { Button } from "../ui/Button";
import { StatusBadge } from "../ui/StatusBadge";
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
} from "lucide-react";

interface DashboardOverviewViewProps {
  onNavigateTo: (tabId: string) => void;
  onOpenApproval: () => void;
}

export const DashboardOverviewView: React.FC<DashboardOverviewViewProps> = ({
  onNavigateTo,
  onOpenApproval,
}) => {
  return (
    <div className="p-6 max-w-7xl mx-auto w-full space-y-6 select-none font-sans">
      {/* 1. Saludo y Estado Superior */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-forest-border">
        <div>
          <span className="text-xs text-txt-secondary font-medium">Buenos días,</span>
          <h1 className="text-3xl font-extrabold tracking-tight text-txt-primary mt-0.5">
            Fernando.
          </h1>
          <p className="text-xs text-txt-secondary mt-1">
            Mint está monitoreando tus operaciones en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-forest-card border border-forest-border text-xs cursor-default"
          >
            <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
            <div className="text-left">
              <span className="text-txt-primary font-semibold">Agente operativo</span>
              <span className="block text-[10px] text-txt-tertiary">
                Última sincronización: 10:24 a. m.
              </span>
            </div>
          </motion.div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-forest-card border border-forest-border text-xs text-txt-secondary">
            <Calendar className="w-3.5 h-3.5 text-brand" />
            <span>Hoy, 29 oct 2026</span>
            <ChevronDown className="w-3 h-3 text-txt-tertiary" />
          </div>
        </div>
      </div>

      {/* 2. Cuatro Tarjetas Principales de KPI con Motion Hover */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Productos */}
        <motion.div
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.99 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          onClick={() => onNavigateTo("productos")}
          className="p-4 rounded-2xl bg-forest-card border border-forest-border hover:border-forest-borderBright transition-colors cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
              <Boxes className="w-4 h-4" />
            </div>
            <ChevronRight className="w-4 h-4 text-txt-tertiary group-hover:text-txt-primary group-hover:translate-x-0.5 transition-all" />
          </div>
          <div className="mt-4">
            <span className="text-xs text-txt-secondary">Productos</span>
            <p className="text-3xl font-extrabold font-mono tracking-tight text-txt-primary mt-0.5 tabular-nums">
              342
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-forest-border/60 flex items-center gap-1.5 text-[11px] text-[#14B8A6]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#14B8A6]" />
            <span>Inventario sincronizado</span>
          </div>
        </motion.div>

        {/* KPI 2: Stock bajo */}
        <motion.div
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.99 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          onClick={() => onNavigateTo("inventario")}
          className="p-4 rounded-2xl bg-forest-card border border-forest-border hover:border-forest-borderBright transition-colors cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center text-[#F59E0B]">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <ChevronRight className="w-4 h-4 text-txt-tertiary group-hover:text-txt-primary group-hover:translate-x-0.5 transition-all" />
          </div>
          <div className="mt-4">
            <span className="text-xs text-txt-secondary">Stock bajo</span>
            <p className="text-3xl font-extrabold font-mono tracking-tight text-txt-primary mt-0.5 tabular-nums">
              8
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-forest-border/60 flex items-center gap-1.5 text-[11px] text-[#F59E0B]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
            <span>Requiere atención (ROP)</span>
          </div>
        </motion.div>

        {/* KPI 3: Aprobaciones pendientes */}
        <motion.div
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.99 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          onClick={() => onNavigateTo("aprobaciones")}
          className="p-4 rounded-2xl bg-forest-card border border-forest-border hover:border-forest-borderBright transition-colors cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center text-[#818CF8]">
              <ClipboardList className="w-4 h-4" />
            </div>
            <ChevronRight className="w-4 h-4 text-txt-tertiary group-hover:text-txt-primary group-hover:translate-x-0.5 transition-all" />
          </div>
          <div className="mt-4">
            <span className="text-xs text-txt-secondary">Aprobaciones pendientes</span>
            <p className="text-3xl font-extrabold font-mono tracking-tight text-txt-primary mt-0.5 tabular-nums">
              2
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-forest-border/60 flex items-center gap-1.5 text-[11px] text-[#818CF8]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1]" />
            <span>Requiere tu revisión ($5M+)</span>
          </div>
        </motion.div>

        {/* KPI 4: Tareas del agente */}
        <motion.div
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.99 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          onClick={() => onNavigateTo("flujo_agente")}
          className="p-4 rounded-2xl bg-forest-card border border-forest-border hover:border-forest-borderBright transition-colors cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <ChevronRight className="w-4 h-4 text-txt-tertiary group-hover:text-txt-primary group-hover:translate-x-0.5 transition-all" />
          </div>
          <div className="mt-4">
            <span className="text-xs text-txt-secondary">Tareas del agente</span>
            <p className="text-3xl font-extrabold font-mono tracking-tight text-txt-primary mt-0.5 tabular-nums">
              48
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-forest-border/60 flex items-center justify-between text-[11px] text-txt-tertiary">
            <span>44 completadas</span>
            <span className="text-brand font-medium">4 pendientes</span>
          </div>
        </motion.div>
      </div>

      {/* 3. Acciones Pendientes + Estado del Agente */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Acciones Pendientes (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl bg-forest-surface border border-forest-border p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-brand" />
              <h2 className="text-sm font-bold text-txt-primary">Acciones pendientes</h2>
            </div>
            <button
              onClick={() => onNavigateTo("aprobaciones")}
              className="text-xs text-brand hover:underline flex items-center gap-1 font-medium cursor-pointer"
            >
              Ver todas <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {/* Acción 1 */}
            <motion.div
              whileHover={{ x: 2 }}
              onClick={onOpenApproval}
              className="p-3.5 rounded-xl bg-forest-card border border-forest-border hover:border-forest-borderBright transition-all cursor-pointer flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-forest-surface border border-forest-border flex items-center justify-center text-brand">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-txt-primary group-hover:text-brand transition-colors">
                    Solicitud de compra por aprobar
                  </p>
                  <p className="text-[11px] text-txt-secondary">
                    Proveedor: Ferretería Los Andes · 20 productos
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-bold text-txt-primary tabular-nums">
                  $2.450.000 COP
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#E11D48]/10 text-[#E11D48] border border-[#E11D48]/20 text-[10px] font-bold">
                  Alta
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-txt-tertiary" />
              </div>
            </motion.div>

            {/* Acción 2 */}
            <motion.div
              whileHover={{ x: 2 }}
              onClick={() => onNavigateTo("inventario")}
              className="p-3.5 rounded-xl bg-forest-card border border-forest-border hover:border-forest-borderBright transition-all cursor-pointer flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-forest-surface border border-forest-border flex items-center justify-center text-[#F59E0B]">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-txt-primary group-hover:text-[#F59E0B] transition-colors">
                    Stock bajo en taladro percutor
                  </p>
                  <p className="text-[11px] text-txt-secondary">
                    Solo quedan 3 unidades en bodega Bucaramanga
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded-full bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20 text-[10px] font-bold">
                  Media
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-txt-tertiary" />
              </div>
            </motion.div>

            {/* Acción 3 */}
            <motion.div
              whileHover={{ x: 2 }}
              onClick={() => onNavigateTo("proveedores")}
              className="p-3.5 rounded-xl bg-forest-card border border-forest-border hover:border-forest-borderBright transition-all cursor-pointer flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-forest-surface border border-forest-border flex items-center justify-center text-txt-secondary">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-txt-primary group-hover:text-txt-primary transition-colors">
                    Proveedor pendiente de validación
                  </p>
                  <p className="text-[11px] text-txt-secondary">
                    Distribuidora del Centro · Documentación pendiente
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded-full bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20 text-[10px] font-bold">
                  Media
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-txt-tertiary" />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Estado del Agente (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl bg-forest-surface border border-forest-border p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-brand" />
              <h2 className="text-sm font-bold text-txt-primary">Estado del agente</h2>
            </div>
            <button
              onClick={() => onNavigateTo("flujo_agente")}
              className="text-xs text-brand hover:underline flex items-center gap-1 font-medium cursor-pointer"
            >
              Ver detalles <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center justify-around py-4">
            {/* Anillo de progreso 98% Operativo con Motion */}
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-forest-card"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <motion.path
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 0.98 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="text-brand"
                  strokeDasharray="98, 100"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-xl font-extrabold font-mono text-txt-primary">
                  98%
                </span>
                <span className="block text-[10px] text-txt-secondary font-medium">
                  Operativo
                </span>
              </div>
            </div>

            {/* Desglose de tareas */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-txt-secondary">
                <span className="w-2 h-2 rounded-full bg-[#14B8A6]" />
                <span>Tareas completadas: <strong className="text-txt-primary font-mono">44</strong></span>
              </div>
              <div className="flex items-center gap-2 text-txt-secondary">
                <span className="w-2 h-2 rounded-full bg-[#6366F1]" />
                <span>Tareas en curso: <strong className="text-txt-primary font-mono">4</strong></span>
              </div>
              <div className="flex items-center gap-2 text-txt-secondary">
                <span className="w-2 h-2 rounded-full bg-[#E11D48]" />
                <span>Tareas fallidas: <strong className="text-txt-primary font-mono">0</strong></span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-forest-border flex items-center justify-between text-[11px] text-txt-tertiary">
            <span>Última actividad: Verificó stock de productos</span>
            <span>Hace 12 min</span>
          </div>
        </div>
      </div>

      {/* 4. Gráficos de Tendencias (Tercera Fila de la Referencia) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Gráfico 1: Movimiento de inventario */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.18 }}
          className="p-5 rounded-2xl bg-forest-surface border border-forest-border space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand" />
              <h3 className="text-xs font-bold text-txt-primary">Movimiento de inventario</h3>
            </div>
            <span className="text-[10px] font-medium text-txt-tertiary px-2 py-0.5 rounded-full bg-forest-card border border-forest-border">
              7 días
            </span>
          </div>

          {/* SVG Spline Chart */}
          <div className="h-36 w-full pt-2">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 300 100">
              <defs>
                <linearGradient id="gradEntradas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#14B8A6" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="gradSalidas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2BB656" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#2BB656" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <line x1="0" y1="20" x2="300" y2="20" stroke="#19261E" strokeDasharray="3 3" />
              <line x1="0" y1="50" x2="300" y2="50" stroke="#19261E" strokeDasharray="3 3" />
              <line x1="0" y1="80" x2="300" y2="80" stroke="#19261E" strokeDasharray="3 3" />

              <path
                d="M 10 70 Q 50 30 100 50 T 190 25 T 280 40 L 280 95 L 10 95 Z"
                fill="url(#gradEntradas)"
              />
              <path
                d="M 10 70 Q 50 30 100 50 T 190 25 T 280 40"
                fill="none"
                stroke="#14B8A6"
                strokeWidth="2"
              />

              <path
                d="M 10 85 Q 50 60 100 75 T 190 45 T 280 60 L 280 95 L 10 95 Z"
                fill="url(#gradSalidas)"
              />
              <path
                d="M 10 85 Q 50 60 100 75 T 190 45 T 280 60"
                fill="none"
                stroke="#2BB656"
                strokeWidth="2"
              />
            </svg>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-forest-border/60 text-[10px]">
            <span className="flex items-center gap-1.5 text-txt-secondary">
              <span className="w-2 h-2 rounded-full bg-[#14B8A6]" /> Entradas
            </span>
            <span className="flex items-center gap-1.5 text-txt-secondary">
              <span className="w-2 h-2 rounded-full bg-brand" /> Salidas
            </span>
          </div>
        </motion.div>

        {/* Gráfico 2: Compras y solicitudes */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.18 }}
          className="p-5 rounded-2xl bg-forest-surface border border-forest-border space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-brand" />
              <h3 className="text-xs font-bold text-txt-primary">Compras y solicitudes</h3>
            </div>
            <span className="text-[10px] font-medium text-txt-tertiary px-2 py-0.5 rounded-full bg-forest-card border border-forest-border">
              7 días
            </span>
          </div>

          {/* Bar Chart con Motion */}
          <div className="h-36 w-full flex items-end justify-between px-2 pt-4 gap-2">
            {[
              { day: "Lun", c: 60, s: 40 },
              { day: "Mar", c: 80, s: 50 },
              { day: "Mié", c: 45, s: 70 },
              { day: "Jue", c: 90, s: 60 },
              { day: "Vie", c: 75, s: 85 },
              { day: "Sáb", c: 30, s: 20 },
              { day: "Dom", c: 20, s: 15 },
            ].map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center gap-1 h-24">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${d.c}%` }}
                    transition={{ duration: 0.6, delay: i * 0.04 }}
                    className="w-2 rounded-t bg-brand/80 transition-all hover:bg-brand"
                  />
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${d.s}%` }}
                    transition={{ duration: 0.6, delay: i * 0.04 + 0.1 }}
                    className="w-2 rounded-t bg-[#6366F1]/80 transition-all hover:bg-[#6366F1]"
                  />
                </div>
                <span className="text-[9px] font-mono text-txt-tertiary">{d.day}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-forest-border/60 text-[10px]">
            <span className="flex items-center gap-1.5 text-txt-secondary">
              <span className="w-2 h-2 rounded-full bg-brand" /> Compras
            </span>
            <span className="flex items-center gap-1.5 text-txt-secondary">
              <span className="w-2 h-2 rounded-full bg-[#6366F1]" /> Solicitudes
            </span>
          </div>
        </motion.div>

        {/* Gráfico 3: Rendimiento del agente */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.18 }}
          className="p-5 rounded-2xl bg-forest-surface border border-forest-border space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-brand" />
              <h3 className="text-xs font-bold text-txt-primary">Rendimiento del agente</h3>
            </div>
            <span className="text-[10px] font-medium text-txt-tertiary px-2 py-0.5 rounded-full bg-forest-card border border-forest-border">
              7 días
            </span>
          </div>

          <div className="flex items-center justify-around h-36">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-forest-card"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <motion.path
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 0.92 }}
                  transition={{ duration: 1.1, ease: "easeOut" }}
                  className="text-[#14B8A6]"
                  strokeDasharray="92, 100"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-lg font-bold font-mono text-txt-primary">92%</span>
                <span className="block text-[8px] text-txt-secondary">Completadas</span>
              </div>
            </div>

            <div className="space-y-1.5 text-[11px] text-txt-secondary font-mono">
              <div className="flex items-center justify-between gap-4">
                <span className="text-txt-tertiary">Totales:</span>
                <span className="text-txt-primary font-bold">48</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[#14B8A6]">Éxito:</span>
                <span className="text-txt-primary font-bold">44</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[#6366F1]">En espera:</span>
                <span className="text-txt-primary font-bold">2</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[#E11D48]">Fallidas:</span>
                <span className="text-txt-primary font-bold">2</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-forest-border/60 text-[10px] text-txt-tertiary text-center">
            Promedio de respuesta: 1.2 segundos por evento
          </div>
        </motion.div>
      </div>

      {/* 5. Actividad Reciente, Canales de Notificación y Footer CTA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Actividad Reciente */}
        <div className="p-5 rounded-2xl bg-forest-surface border border-forest-border space-y-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand" />
              <h3 className="text-xs font-bold text-txt-primary">Actividad reciente</h3>
            </div>
            <button
              onClick={() => onNavigateTo("auditoria_eventos")}
              className="text-[11px] text-brand hover:underline font-medium cursor-pointer"
            >
              Ver todas →
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <motion.div
              whileHover={{ x: 2 }}
              className="p-2.5 rounded-xl bg-forest-card border border-forest-border/80 flex items-start gap-2.5 transition-colors"
            >
              <span className="text-[10px] font-mono text-txt-tertiary mt-0.5">10:24</span>
              <div>
                <p className="text-xs font-medium text-txt-primary">
                  El agente actualizó el inventario de taladros
                </p>
                <p className="text-[10px] text-txt-secondary">
                  Stock sincronizado · 12 productos verificados
                </p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ x: 2 }}
              className="p-2.5 rounded-xl bg-forest-card border border-forest-border/80 flex items-start gap-2.5 transition-colors"
            >
              <span className="text-[10px] font-mono text-txt-tertiary mt-0.5">09:48</span>
              <div>
                <p className="text-xs font-medium text-txt-primary">
                  Solicitud de compra creada #OC-402
                </p>
                <p className="text-[10px] text-txt-secondary">
                  Proveedor: Ferretería Los Andes · $2.450.000 COP
                </p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ x: 2 }}
              className="p-2.5 rounded-xl bg-forest-card border border-forest-border/80 flex items-start gap-2.5 transition-colors"
            >
              <span className="text-[10px] font-mono text-txt-tertiary mt-0.5">08:32</span>
              <div>
                <p className="text-xs font-medium text-txt-primary">
                  Aprobación requerida por superar umbral
                </p>
                <p className="text-[10px] text-txt-secondary">
                  Compra de material eléctrico · $5.980.000 COP
                </p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Canales de Notificación */}
        <div className="p-5 rounded-2xl bg-forest-surface border border-forest-border space-y-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-brand" />
              <h3 className="text-xs font-bold text-txt-primary">Canales de notificación</h3>
            </div>
            <StatusBadge status="ok" label="3 activos" size="sm" />
          </div>

          <div className="space-y-2 text-xs">
            <motion.div
              whileHover={{ scale: 1.01 }}
              className="p-2.5 rounded-xl bg-forest-card border border-forest-border flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-forest-surface border border-forest-border">
                  <Slack className="w-3.5 h-3.5 text-txt-secondary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-txt-primary">Slack Bot</p>
                  <p className="text-[10px] text-txt-tertiary">Alertas y aprobaciones HITL</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20 text-[10px] font-semibold">
                Activo
              </span>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.01 }}
              className="p-2.5 rounded-xl bg-forest-card border border-forest-border flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-forest-surface border border-forest-border">
                  <Mail className="w-3.5 h-3.5 text-txt-secondary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-txt-primary">Email SMTP</p>
                  <p className="text-[10px] text-txt-tertiary">Reportes diarios de gestión</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20 text-[10px] font-semibold">
                Activo
              </span>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.01 }}
              className="p-2.5 rounded-xl bg-forest-card border border-forest-border flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-forest-surface border border-forest-border">
                  <Radio className="w-3.5 h-3.5 text-txt-secondary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-txt-primary">Webhook (API)</p>
                  <p className="text-[10px] text-txt-tertiary">Integraciones externas ERP</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20 text-[10px] font-semibold">
                Activo
              </span>
            </motion.div>
          </div>
        </div>

        {/* CTA: El agente está trabajando con Flowcraft White Pill */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.18 }}
          className="p-5 rounded-2xl bg-forest-surface border border-forest-border flex flex-col justify-between relative overflow-hidden"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brand animate-pulse" />
              <h3 className="text-sm font-bold text-txt-primary">El agente está trabajando</h3>
            </div>
            <p className="text-xs text-txt-secondary leading-relaxed">
              Analizando inventario, proveedores y compras para mantener tus operaciones siempre en marcha.
            </p>
          </div>

          <div className="pt-4">
            <Button
              variant="primary"
              size="md"
              className="w-full justify-between shadow-buttonGlow"
              onClick={() => onNavigateTo("flujo_agente")}
            >
              <span>Ver flujo del agente</span>
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
