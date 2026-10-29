import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BarChart3,
  TrendingDown,
  TrendingUp,
  Download,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Send,
  Zap,
  Filter,
  RefreshCw,
  Eye,
  Sliders,
  DollarSign,
  AlertTriangle,
  ChevronRight,
  Copy,
  Check,
  X,
  FileCode,
  Terminal,
  Activity,
  ArrowRight,
  Database,
  Building2,
  Percent,
} from "lucide-react";
import { Button } from "../ui/Button";

// Interfaces para Reportes y Analítica
export interface ReportFile {
  id: string;
  filename: string;
  title: string;
  category: "Financiero" | "Inventario ROP" | "Salud de Esquema" | "Benchmark" | "Logística OSRM";
  format: "pdf" | "csv" | "json";
  size: string;
  createdAt: string;
  hmacSha256: string;
  summary: string;
}

export interface MonthlyMetric {
  month: string;
  fullMonth: string;
  revenueCop: number; // Ingresos
  costCop: number; // Costo base
  anomalyCop: number; // Sobrecostos/picos
  marginPct: number; // % margen neto
  savingsCop: number; // Ahorro generado por IA
  poCount: number;
}

// Datos semilla de métricas mensuales (Idéntico estilo a la gráfica de Landa)
const MONTHLY_METRICS: MonthlyMetric[] = [
  { month: "Ene", fullMonth: "Enero 2026", revenueCop: 28500000, costCop: 22800000, anomalyCop: 1400000, marginPct: 20.0, savingsCop: 1400000, poCount: 18 },
  { month: "Feb", fullMonth: "Febrero 2026", revenueCop: 31200000, costCop: 24500000, anomalyCop: 900000, marginPct: 21.5, savingsCop: 1850000, poCount: 22 },
  { month: "Mar", fullMonth: "Marzo 2026", revenueCop: 34800000, costCop: 26200000, anomalyCop: 600000, marginPct: 24.7, savingsCop: 2400000, poCount: 26 },
  { month: "Abr", fullMonth: "Abril 2026", revenueCop: 32400000, costCop: 24300000, anomalyCop: 1200000, marginPct: 25.0, savingsCop: 2600000, poCount: 24 },
  { month: "May", fullMonth: "Mayo 2026", revenueCop: 36900000, costCop: 27100000, anomalyCop: 800000, marginPct: 26.5, savingsCop: 3200000, poCount: 28 },
  { month: "Jun", fullMonth: "Junio 2026", revenueCop: 38500000, costCop: 27900000, anomalyCop: 700000, marginPct: 27.5, savingsCop: 3750000, poCount: 31 },
  { month: "Jul", fullMonth: "Julio 2026", revenueCop: 40800000, costCop: 29100000, anomalyCop: 900000, marginPct: 28.7, savingsCop: 4100000, poCount: 34 },
  { month: "Ago", fullMonth: "Agosto 2026", revenueCop: 43200000, costCop: 31400000, anomalyCop: 3400000, marginPct: 27.3, savingsCop: 4500000, poCount: 39 },
  { month: "Sep", fullMonth: "Septiembre 2026", revenueCop: 41500000, costCop: 29300000, anomalyCop: 1100000, marginPct: 29.4, savingsCop: 4900000, poCount: 36 },
  { month: "Oct", fullMonth: "Octubre 2026", revenueCop: 46800000, costCop: 32100000, anomalyCop: 2600000, marginPct: 31.4, savingsCop: 5400000, poCount: 42 },
];

// Datos semilla de Quiebres vs Salud de Datos
const STOCKOUT_TREND = [
  { month: "Ene", stockouts: 28, sanitizedRecords: 120 },
  { month: "Feb", stockouts: 22, sanitizedRecords: 240 },
  { month: "Mar", stockouts: 17, sanitizedRecords: 480 },
  { month: "Abr", stockouts: 12, sanitizedRecords: 750 },
  { month: "May", stockouts: 8, sanitizedRecords: 1050 },
  { month: "Jun", stockouts: 5, sanitizedRecords: 1280 },
  { month: "Jul", stockouts: 3, sanitizedRecords: 1450 },
  { month: "Ago", stockouts: 2, sanitizedRecords: 1620 },
  { month: "Sep", stockouts: 1, sanitizedRecords: 1750 },
  { month: "Oct", stockouts: 1, sanitizedRecords: 1840 },
];

// Datos semilla de reportes descargables (/reports)
const INITIAL_REPORTS: ReportFile[] = [
  {
    id: "rep-001",
    filename: "test_ganancias_2026_q3.pdf",
    title: "Informe Ejecutivo de Ganancias, Costo Landed y Margen Neto",
    category: "Financiero",
    format: "pdf",
    size: "2.4 MB",
    createdAt: "Hoy, 08:30 a. m.",
    hmacSha256: "9f82c3d1e4a5028bf87412e690a312bc89a712f5",
    summary:
      "Desglose pormenorizado del estado de resultados consolidado en Santander. Expansión de margen al 31.4% por consolidación de rutas OSRM y negociación algorítmica.",
  },
  {
    id: "rep-002",
    filename: "inventario_rop_santander_oct26.csv",
    title: "Matriz de Puntos de Reorden (ROP) y Stock de Seguridad Holt-Winters",
    category: "Inventario ROP",
    format: "csv",
    size: "480 KB",
    createdAt: "Hoy, 07:15 a. m.",
    hmacSha256: "4e11a9b832f0124cba881765de9013ef451298aa",
    summary:
      "248 SKUs calibrados dinámicamente según variabilidad de lead time y demanda. Ajuste de stock de seguridad para 6 SKUs críticos de corte.",
  },
  {
    id: "rep-003",
    filename: "salud_datos_esquema_postgres.csv",
    title: "Auditoría de Frescura, Tipos y Mapeo Relacional de schemaDiscoveryService",
    category: "Salud de Esquema",
    format: "csv",
    size: "180 KB",
    createdAt: "Hoy, 07:00 a. m.",
    hmacSha256: "0012e87a55421c990234f9a1287cba66512f4590",
    summary:
      "18 tablas mapeadas entre PostgreSQL y Drizzle ORM. 100% de integridad relacional verificada, con 42 discrepancias resueltas en mapping.ts.",
  },
  {
    id: "rep-004",
    filename: "benchmark_agent_vs_baseline_2026.pdf",
    title: "Evaluación Comparativa: Agente Autónomo Mint vs Procesos Manuales 2025",
    category: "Benchmark",
    format: "pdf",
    size: "3.8 MB",
    createdAt: "Ayer, 06:20 p. m.",
    hmacSha256: "a78bc9012df38411e8992c34bb1045f8721c0091",
    summary:
      "Reducción del 96.2% en tiempo de ciclo de emisión de órdenes. Precisión del 94.6% en aprobaciones autónomas bajo guardrail POL-01.",
  },
  {
    id: "rep-005",
    filename: "auditoria_rutas_fletes_osrm.csv",
    title: "Telemetría de Despacho y Ahorro por Agrupación Logística",
    category: "Logística OSRM",
    format: "csv",
    size: "320 KB",
    createdAt: "Ayer, 02:00 p. m.",
    hmacSha256: "b3310488921eaf7701c45d6789b12e34fa980112",
    summary:
      "Análisis de ahorro en fletes consolidando cargas en la ruta Bogotá -> Bucaramanga vía Pescadero frente al despacho atomizado.",
  },
];

export const AnalyticsReportsView: React.FC = () => {
  const [reports, setReports] = useState<ReportFile[]>(INITIAL_REPORTS);
  const [hoveredMonth, setHoveredMonth] = useState<MonthlyMetric | null>(null);
  const [timeRange, setTimeRange] = useState<"6m" | "10m" | "all">("10m");
  const [activeMetricMode, setActiveMetricMode] = useState<"revenue" | "margin" | "savings">("revenue");
  const [previewReport, setPreviewReport] = useState<ReportFile | null>(null);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [copiedHmac, setCopiedHmac] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Formulario nuevo reporte
  const [newReportType, setNewReportType] = useState<string>("Financiero");
  const [newReportFormat, setNewReportFormat] = useState<"pdf" | "csv">("pdf");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  const handleCopyHmac = (hmac: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(hmac);
      setCopiedHmac(hmac);
      setTimeout(() => setCopiedHmac(null), 2000);
      showToast("Hash HMAC copiado al portapapeles.");
    }
  };

  const handleDownloadReport = (filename: string) => {
    showToast(`Descargando archivo /reports/${filename}...`);
  };

  const handleCreateReport = () => {
    const id = `rep-${Math.random().toString(16).substring(2, 6)}`;
    const filename = `${newReportType.toLowerCase().replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.${newReportFormat}`;
    const newRep: ReportFile = {
      id,
      filename,
      title: `Reporte ${newReportType}: Consolidado Reciente`,
      category: newReportType as any,
      format: newReportFormat,
      size: newReportFormat === "pdf" ? "1.8 MB" : "340 KB",
      createdAt: "Recién generado",
      hmacSha256: "31a89c02ff1e92004a88bc31ef78c01289a712f5",
      summary: `Generación ejecutada bajo la habilidad executive_analytics con datos sincronizados de PostgreSQL y Drizzle ORM.`,
    };

    setReports([newRep, ...reports]);
    setIsGenerateModalOpen(false);
    showToast(`Reporte ${filename} generado y almacenado en /reports.`);
  };

  // Filtrado de métricas según rango
  const displayedMetrics = useMemo(() => {
    if (timeRange === "6m") return MONTHLY_METRICS.slice(-6);
    return MONTHLY_METRICS;
  }, [timeRange]);

  // Altura máxima para escala de gráfica (50M COP)
  const maxRevenueScale = 50000000;

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-[#050806] text-[#F9FAFB] font-sans antialiased select-none overflow-y-auto">
      {/* 1. Header Bar de la Vista */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-white/[0.08] bg-[#0A0F0C]/90 backdrop-blur-md flex-none z-20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono text-[#8E9893] uppercase tracking-wider">
              Inteligencia
            </span>
            <span className="text-white/20">/</span>
            <span className="text-[11px] font-mono text-[#10B981] flex items-center gap-1">
              <Activity className="w-3 h-3" />
              executive_analytics & businessAnalyticsService.ts
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Análisis y Reportes
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#10B981]/10 text-[#34D399] border border-[#10B981]/30">
              RENTABILIDAD +14.2% · 0 QUIEBRES CRÍTICOS
            </span>
          </div>
        </div>

        {/* Acciones del Header */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            icon={<Clock className="w-3.5 h-3.5" />}
            onClick={() => setIsScheduleModalOpen(true)}
          >
            Programar Envío
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<Sparkles className="w-3.5 h-3.5" />}
            onClick={() => setIsGenerateModalOpen(true)}
          >
            Generar Reporte
          </Button>
        </div>
      </div>

      {/* Toast Flotante */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-16 right-6 z-50 px-4 py-2 rounded-xl bg-[#0A0F0C] border border-[#10B981]/50 text-[#34D399] text-xs font-mono shadow-[0_4px_24px_rgba(16,185,129,0.2)] flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#10B981]" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contenido Principal con Espaciado Generoso */}
      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* ========================================================================= */}
        {/* 1. FILA SUPERIOR: Briefing Ejecutivo IA (briefing.ts)                     */}
        {/* ========================================================================= */}
        <div className="p-6 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] relative overflow-hidden shadow-subtle space-y-5">
          {/* Radial Top Highlight */}
          <div className="absolute top-0 left-1/4 right-1/4 h-24 bg-gradient-to-b from-[#10B981]/15 to-transparent blur-2xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981]">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Briefing Ejecutivo IA · Síntesis Operativa y Financiera
                </h3>
                <span className="text-[11px] font-mono text-[#8E9893]">
                  Habilidad executive_analytics sincronizada con briefing.ts (Reto PLTK Grok-4.6)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              <span className="text-[10px] font-mono text-emerald-400 font-semibold uppercase tracking-wider">
                Consolidado Q3/Q4 2026
              </span>
            </div>
          </div>

          {/* 3 Columnas Clave del Briefing */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {/* Punto 1: Rentabilidad y Margen */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] space-y-2 relative group hover:border-[#10B981]/30 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#10B981] flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  01. Expansión de Margen (+14.2%)
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                  31.4% MARGEN
                </span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed font-sans">
                La consolidación de fletes OSRM y la renegociación algorítmica con proveedores homologados redujeron el costo landed en 8.4%, elevando el margen neto acumulado a <strong>$184.5M COP</strong>.
              </p>
              <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-[11px] font-mono text-[#8E9893]">
                <span>Ahorro Acumulado IA:</span>
                <span className="text-white font-bold tabular-nums">$24.800.000 COP</span>
              </div>
            </div>

            {/* Punto 2: Cuellos de Botella Logísticos */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] space-y-2 relative group hover:border-amber-400/30 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  02. Cuellos de Botella & Desvío DIS
                </span>
                <span className="text-[10px] font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                  114H LEAD TIME
                </span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed font-sans">
                El retraso recurrente en <em>Distribuidora Industrial Santander</em> fue contenido amortiguando el ROP dinámico Holt-Winters a 5 días de inventario, logrando <strong>0 quiebres de stock</strong> en obra.
              </p>
              <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-[11px] font-mono text-[#8E9893]">
                <span>Cumplimiento SLA Obras:</span>
                <span className="text-emerald-400 font-bold tabular-nums">99.2% Efectivo</span>
              </div>
            </div>

            {/* Punto 3: Benchmark Agente vs Baseline */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] space-y-2 relative group hover:border-[#10B981]/30 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-blue-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  03. Benchmark vs Baseline
                </span>
                <span className="text-[10px] font-mono text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">
                  94.6% AUTÓNOMO
                </span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed font-sans">
                Tiempo de emisión de órdenes reducido de 48h a <strong>1.8h</strong>. 94.6% de transacciones aprobadas bajo guardrail POL-01 sin intervención; las 2 retenciones HITL protegieron $14.5M COP.
              </p>
              <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-[11px] font-mono text-[#8E9893]">
                <span>Tiempo Medio Ciclo PO:</span>
                <span className="text-white font-bold tabular-nums">1.8 Horas (vs 48h)</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. GRID CENTRAL: Gráfico Landa Aesthetic + Salud de Datos & Quiebres      */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* GRÁFICO 1 (2 Columnas): Ganancias y Margen Operativo (Estilo Landa) */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] shadow-subtle space-y-5 relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#10B981]" />
                  Ganancias y Margen Operativo (analisisFinanciero.ts)
                </h3>
                <p className="text-xs text-[#8E9893] mt-0.5">
                  Gráfico de barras de alta densidad técnica: Ganancia Neta, Costo Base y Picos Estacionales en COP.
                </p>
              </div>

              {/* Selector de Rango y Filtros */}
              <div className="flex items-center gap-1.5 p-0.5 rounded-lg bg-black/40 border border-white/[0.08] text-xs font-mono">
                <button
                  onClick={() => setTimeRange("6m")}
                  className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                    timeRange === "6m" ? "bg-[#10B981]/20 text-[#34D399] font-semibold border border-[#10B981]/30" : "text-[#8E9893] hover:text-white"
                  }`}
                >
                  6 Meses
                </button>
                <button
                  onClick={() => setTimeRange("10m")}
                  className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                    timeRange === "10m" ? "bg-[#10B981]/20 text-[#34D399] font-semibold border border-[#10B981]/30" : "text-[#8E9893] hover:text-white"
                  }`}
                >
                  10 Meses (2026)
                </button>
              </div>
            </div>

            {/* Leyenda de la Gráfica */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-[#8E9893] px-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-t from-emerald-600 to-[#34D399]" />
                  <span className="text-white">Ganancia Operativa Neta</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#374151]" />
                  <span>Costo Base Adquisición</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#F59E0B]" />
                  <span className="text-amber-400">Pico / Contingencia Vía</span>
                </div>
              </div>

              {hoveredMonth && (
                <div className="px-2.5 py-1 rounded-md bg-black/80 border border-[#10B981]/40 text-[11px] text-[#34D399] font-mono animate-in fade-in">
                  {hoveredMonth.fullMonth}: <span className="text-white font-bold">${(hoveredMonth.revenueCop / 1000000).toFixed(1)}M COP</span> · Margen: <span className="font-bold">{hoveredMonth.marginPct}%</span>
                </div>
              )}
            </div>

            {/* Lienzo del Gráfico de Barras con Hairline Grid */}
            <div className="relative h-64 w-full pt-4 pb-2 px-3 flex flex-col justify-between">
              {/* Líneas de Guía Horizontales de Fondo */}
              <div className="absolute inset-x-3 inset-y-6 flex flex-col justify-between pointer-events-none">
                {[50, 40, 30, 20, 10, 0].map((v) => (
                  <div key={v} className="w-full flex items-center gap-3">
                    <span className="w-9 text-[10px] font-mono text-[#8E9893] text-right tabular-nums">
                      ${v}M
                    </span>
                    <div className="flex-1 h-px bg-white/[0.04]" />
                  </div>
                ))}
              </div>

              {/* Contenedor de Barras Verticales */}
              <div className="relative h-48 w-full pl-12 flex items-end justify-between gap-2 z-10">
                {displayedMetrics.map((item, idx) => {
                  const revHeightPct = (item.revenueCop / maxRevenueScale) * 100;
                  const costHeightPct = (item.costCop / maxRevenueScale) * 100;
                  const anomalyHeightPct = (item.anomalyCop / maxRevenueScale) * 100;
                  const isHovered = hoveredMonth?.month === item.month;

                  return (
                    <div
                      key={item.month}
                      onMouseEnter={() => setHoveredMonth(item)}
                      onMouseLeave={() => setHoveredMonth(null)}
                      className="flex-1 h-full flex flex-col items-center justify-end group cursor-pointer"
                    >
                      {/* Grupo de Barras del Mes */}
                      <div className="w-full max-w-[42px] flex items-end justify-center gap-1 h-full">
                        {/* 1. Barra Costo Base (Pizarra) */}
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${costHeightPct}%` }}
                          transition={{ duration: 0.6, delay: idx * 0.04 }}
                          className="w-2.5 sm:w-3 rounded-t-sm bg-[#374151] group-hover:bg-[#4B5563] transition-colors"
                          title={`Costo: $${(item.costCop / 1000000).toFixed(1)}M COP`}
                        />

                        {/* 2. Barra Ganancia Neta (Esmeralda Luminoso - Landa) */}
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${revHeightPct}%` }}
                          transition={{ duration: 0.8, delay: idx * 0.04 }}
                          className={`w-3 sm:w-4 rounded-t-sm bg-gradient-to-t from-[#10B981] to-[#34D399] transition-all shadow-[0_0_8px_rgba(16,185,129,0.3)] ${
                            isHovered ? "brightness-125 scale-y-105" : "group-hover:brightness-110"
                          }`}
                          title={`Facturación: $${(item.revenueCop / 1000000).toFixed(1)}M COP`}
                        />

                        {/* 3. Barra Pico / Contingencia (Ámbar) */}
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${anomalyHeightPct * 2}%` }}
                          transition={{ duration: 0.5, delay: idx * 0.04 }}
                          className="w-1.5 sm:w-2 rounded-t-sm bg-[#F59E0B] group-hover:brightness-125 transition-colors"
                          title={`Contingencia: $${(item.anomalyCop / 1000000).toFixed(1)}M COP`}
                        />
                      </div>

                      {/* Etiqueta del Mes en el Eje X */}
                      <span className={`text-[10px] font-mono mt-3 transition-colors ${
                        isHovered ? "text-[#34D399] font-bold" : "text-[#8E9893] group-hover:text-white"
                      }`}>
                        {item.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer de la Gráfica */}
            <div className="pt-3 border-t border-white/[0.04] flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono text-[#8E9893] gap-2">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                Datos verificados con facturación electrónica DIAN en PostgreSQL.
              </span>
              <span className="text-white">
                Facturación acumulada 2026: <strong className="text-emerald-400 font-bold">$384.800.000 COP</strong>
              </span>
            </div>
          </div>

          {/* GRÁFICO 2 (1 Columna): Salud de Datos y Eficiencia de Inventario */}
          <div className="p-6 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] shadow-subtle space-y-5 flex flex-col justify-between">
            <div>
              <div className="border-b border-white/[0.06] pb-3 mb-4">
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  Salud de Datos & Quiebres
                </h3>
                <p className="text-xs text-[#8E9893] mt-0.5">
                  businessAnalyticsService.ts vs ROP
                </p>
              </div>

              {/* Métrica 1: Reducción Drástica de Quiebres */}
              <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-[#8E9893]">Quiebres de Stock / Mes:</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">-96.4% Caída</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-bold font-mono text-white">1</span>
                    <span className="text-xs font-mono text-[#8E9893] ml-1">incidente en Oct</span>
                  </div>
                  <span className="text-xs font-mono text-gray-500 line-through">28 incidentes en Ene</span>
                </div>

                {/* Mini Gráfico de Quiebres (Descenso continuo) */}
                <div className="h-10 w-full flex items-end justify-between gap-1 pt-1">
                  {STOCKOUT_TREND.map((st, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-gradient-to-t from-red-500/40 to-emerald-500 rounded-t-sm"
                      style={{ height: `${(st.stockouts / 28) * 100}%` }}
                      title={`${st.month}: ${st.stockouts} quiebres`}
                    />
                  ))}
                </div>
              </div>

              {/* Métrica 2: Registros Saneados en Esquema Relacional */}
              <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-[#8E9893]">Registros Saneados:</span>
                  <span className="text-xs font-mono font-bold text-[#34D399]">1,840 Records</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-black overflow-hidden">
                  <div className="w-[99.8%] h-full bg-gradient-to-r from-emerald-500 to-[#34D399]" />
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-[#8E9893]">
                  <span>Integridad PostgreSQL:</span>
                  <span className="text-white font-bold">99.8% Perfecta</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-[#8E9893]">
                  <span>Discrepancias Resueltas:</span>
                  <span className="text-emerald-400 font-bold">42 en mapping.ts</span>
                </div>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              className="w-full mt-2"
              icon={<Database className="w-3.5 h-3.5 text-purple-400" />}
              onClick={() => showToast("Ejecutando escaneo profundo de consistencia relacional...")}
            >
              Auditar Esquema PostgreSQL
            </Button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. SECCIÓN INFERIOR: Repositorio de Reportes Generados (/reports)         */}
        {/* ========================================================================= */}
        <div className="p-6 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] shadow-subtle space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#10B981]" />
                <h3 className="text-base font-bold text-white tracking-tight">
                  Repositorio de Reportes Generados (/reports) · reportesGenerales.ts
                </h3>
              </div>
              <p className="text-xs text-[#8E9893] mt-0.5">
                Archivos compilados listos para descarga directa, previsualización in-app y validación forense HMAC.
              </p>
            </div>

            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={() => showToast("Repositorio /reports sincronizado con el disco local.")}
            >
              Sincronizar /reports
            </Button>
          </div>

          {/* Tabla de Reportes de Alta Densidad */}
          <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-black/30">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-white/[0.08] bg-black/60 text-[#8E9893]">
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Archivo / Reporte</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Categoría</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Tamaño</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Firma HMAC-SHA256</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Generado</th>
                  <th className="py-3 px-4 text-right font-semibold uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {reports.map((file) => (
                  <tr
                    key={file.id}
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    {/* Archivo */}
                    <td className="py-3.5 px-4 font-medium text-white flex items-center gap-2.5">
                      {file.format === "pdf" ? (
                        <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                          <FileText className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <FileSpreadsheet className="w-4 h-4" />
                        </div>
                      )}
                      <div>
                        <span className="font-bold text-white group-hover:text-emerald-300 transition-colors block">
                          {file.filename}
                        </span>
                        <span className="text-[11px] text-[#8E9893] font-sans line-clamp-1">
                          {file.title}
                        </span>
                      </div>
                    </td>

                    {/* Categoría */}
                    <td className="py-3.5 px-4 text-[#8E9893]">
                      <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-[11px]">
                        {file.category}
                      </span>
                    </td>

                    {/* Tamaño */}
                    <td className="py-3.5 px-4 text-gray-300 tabular-nums">
                      {file.size}
                    </td>

                    {/* HMAC SHA256 */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#8E9893] truncate max-w-[130px]" title={file.hmacSha256}>
                          {file.hmacSha256}
                        </span>
                        <button
                          onClick={() => handleCopyHmac(file.hmacSha256)}
                          className="p-1 hover:bg-white/[0.08] rounded text-[#8E9893] hover:text-white transition-colors"
                          title="Copiar Hash"
                        >
                          {copiedHmac === file.hmacSha256 ? (
                            <Check className="w-3 h-3 text-[#10B981]" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Fecha de Creación */}
                    <td className="py-3.5 px-4 text-[#8E9893] text-[11px]">
                      {file.createdAt}
                    </td>

                    {/* Acciones */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setPreviewReport(file)}
                          className="px-2.5 py-1 rounded-lg bg-black/40 hover:bg-[#10B981]/15 text-gray-300 hover:text-emerald-300 border border-white/[0.08] hover:border-[#10B981]/30 transition-all flex items-center gap-1 cursor-pointer"
                          title="Previsualizar reporte in-app"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Previsualizar</span>
                        </button>

                        <button
                          onClick={() => handleDownloadReport(file.filename)}
                          className="px-2.5 py-1 rounded-lg bg-[#10B981]/10 hover:bg-[#10B981]/25 text-[#34D399] border border-[#10B981]/30 transition-all flex items-center gap-1 cursor-pointer font-bold"
                          title="Descargar archivo a disco"
                        >
                          <Download className="w-3 h-3" />
                          <span>Descargar</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Previsualizador de Reporte PDF/CSV In-App                        */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {previewReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-[#0A0F0C] border border-[#10B981]/40 rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-4 px-6 border-b border-white/[0.08] flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-[#10B981]" />
                  <div>
                    <h3 className="text-sm font-bold text-white font-mono">{previewReport.filename}</h3>
                    <span className="text-[10px] font-mono text-[#8E9893]">{previewReport.category} · {previewReport.size}</span>
                  </div>
                </div>
                <button
                  onClick={() => setPreviewReport(null)}
                  className="p-1 rounded-lg hover:bg-white/[0.08] text-[#8E9893] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Contenido Simulado del Reporte */}
              <div className="p-6 overflow-y-auto space-y-4 font-mono text-xs">
                <div className="p-4 rounded-xl bg-black/60 border border-white/[0.06] space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-[#8E9893]">
                    <span>Firma Criptográfica HMAC:</span>
                    <span className="text-emerald-400 font-bold">VALIDADO</span>
                  </div>
                  <div className="text-[11px] text-gray-400 break-all">{previewReport.hmacSha256}</div>
                </div>

                <div className="space-y-2 font-sans">
                  <h4 className="text-sm font-bold text-white">{previewReport.title}</h4>
                  <p className="text-xs text-gray-300 leading-relaxed">{previewReport.summary}</p>
                </div>

                {/* Tabla de Muestra dentro del PDF */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] space-y-2">
                  <span className="text-[11px] font-mono font-bold text-[#34D399] uppercase tracking-wider block">
                    Extracto de Resultados Consolidados (PostgreSQL)
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-black/40">
                      <span className="text-[10px] text-[#8E9893] block">Margen Operativo Santander:</span>
                      <span className="text-white font-bold">31.4% (+8.4% vs baseline)</span>
                    </div>
                    <div className="p-2 rounded bg-black/40">
                      <span className="text-[10px] text-[#8E9893] block">Ahorro en Fletes OSRM:</span>
                      <span className="text-[#34D399] font-bold">$18.650.000 COP</span>
                    </div>
                    <div className="p-2 rounded bg-black/40">
                      <span className="text-[10px] text-[#8E9893] block">Quiebres de Stock Prevenidos:</span>
                      <span className="text-white font-bold">23 Incidentes Evitados</span>
                    </div>
                    <div className="p-2 rounded bg-black/40">
                      <span className="text-[10px] text-[#8E9893] block">Auditoría Criptográfica:</span>
                      <span className="text-emerald-400 font-bold">100% Sin Discrepancias</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 px-6 border-t border-white/[0.08] bg-black/40 flex items-center justify-between">
                <span className="text-[11px] font-mono text-[#8E9893]">Generado por Mint Autonomous Core</span>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setPreviewReport(null)}>
                    Cerrar
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Download className="w-3.5 h-3.5" />}
                    onClick={() => {
                      handleDownloadReport(previewReport.filename);
                      setPreviewReport(null);
                    }}
                  >
                    Descargar Copia
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 2: Generador de Nuevo Reporte                                      */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isGenerateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0A0F0C] border border-white/[0.12] rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.8)] overflow-hidden"
            >
              <div className="p-4 px-6 border-b border-white/[0.08] flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#10B981]" />
                  <h3 className="text-sm font-bold text-white font-mono">Generar Reporte Personalizado</h3>
                </div>
                <button
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/[0.08] text-[#8E9893] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs font-mono">
                <div>
                  <label className="text-[11px] text-[#8E9893] block mb-1.5">Tipo de Reporte:</label>
                  <select
                    value={newReportType}
                    onChange={(e) => setNewReportType(e.target.value)}
                    className="w-full h-8 px-3 rounded-lg bg-black/60 border border-white/[0.08] text-white focus:outline-none focus:border-[#10B981]/60"
                  >
                    <option value="Financiero">Financiero (Ganancias y Margen COP)</option>
                    <option value="Inventario ROP">Inventario ROP (Holt-Winters)</option>
                    <option value="Salud de Esquema">Salud de Esquema (PostgreSQL)</option>
                    <option value="Benchmark">Benchmark (Agente vs Baseline)</option>
                    <option value="Logística OSRM">Logística OSRM (Rutas Santander)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-[#8E9893] block mb-1.5">Formato de Exportación:</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setNewReportFormat("pdf")}
                      className={`flex-1 py-2 rounded-lg border text-center transition-all cursor-pointer ${
                        newReportFormat === "pdf"
                          ? "bg-[#10B981]/20 border-[#10B981]/50 text-[#34D399] font-bold"
                          : "bg-black/40 border-white/[0.06] text-[#8E9893]"
                      }`}
                    >
                      PDF Ejecutivo
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewReportFormat("csv")}
                      className={`flex-1 py-2 rounded-lg border text-center transition-all cursor-pointer ${
                        newReportFormat === "csv"
                          ? "bg-[#10B981]/20 border-[#10B981]/50 text-[#34D399] font-bold"
                          : "bg-black/40 border-white/[0.06] text-[#8E9893]"
                      }`}
                    >
                      CSV Crudo
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-black/40 border border-white/[0.04] text-[11px] text-[#8E9893]">
                  El reporte será generado en background con la habilidad <code>executive_analytics</code> y firmado con HMAC-SHA256.
                </div>
              </div>

              <div className="p-4 px-6 border-t border-white/[0.08] bg-black/40 flex items-center justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setIsGenerateModalOpen(false)}>
                  Cancelar
                </Button>
                <Button variant="primary" size="sm" onClick={handleCreateReport}>
                  Generar y Persistir
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 3: Programación de Envío Automático                                */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isScheduleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0A0F0C] border border-white/[0.12] rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.8)] overflow-hidden"
            >
              <div className="p-4 px-6 border-b border-white/[0.08] flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#10B981]" />
                  <h3 className="text-sm font-bold text-white font-mono">Programar Envío Periódico</h3>
                </div>
                <button
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/[0.08] text-[#8E9893] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs font-mono">
                <div>
                  <label className="text-[11px] text-[#8E9893] block mb-1.5">Frecuencia de Despacho:</label>
                  <select className="w-full h-8 px-3 rounded-lg bg-black/60 border border-white/[0.08] text-white focus:outline-none focus:border-[#10B981]/60">
                    <option>Semanal (Cada lunes a las 07:00 a. m.)</option>
                    <option>Mensual (Primer día hábil de cada mes)</option>
                    <option>Diario (Resumen ejecutivo a las 18:00 p. m.)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-[#8E9893] block mb-1.5">Canal de Notificación:</label>
                  <select className="w-full h-8 px-3 rounded-lg bg-black/60 border border-white/[0.08] text-white focus:outline-none focus:border-[#10B981]/60">
                    <option>Telegram Bot (@MintOperativoBot)</option>
                    <option>Correo Electrónico (gerencia@santandereana.com)</option>
                    <option>Webhook Web (Endpoint Seguro)</option>
                  </select>
                </div>

                <div className="p-3 rounded-lg bg-[#10B981]/10 border border-[#10B981]/25 text-[11px] text-[#34D399]">
                  ✓ Los reportes generados se empaquetarán en PDF firmado y se enviarán automáticamente sin requerir intervención humana.
                </div>
              </div>

              <div className="p-4 px-6 border-t border-white/[0.08] bg-black/40 flex items-center justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setIsScheduleModalOpen(false)}>
                  Cerrar
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setIsScheduleModalOpen(false);
                    showToast("Programación guardada: Despacho semanal activado vía Telegram.");
                  }}
                >
                  Confirmar Programación
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
