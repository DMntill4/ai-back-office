import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BarChart3,
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
  Zap,
  Filter,
  DollarSign,
  ChevronRight,
  Search,
  Check,
  Percent,
} from "lucide-react";
import { KpiStrip, KpiCardItem } from "../ui/KpiStrip";

export interface ReportFile {
  id: string;
  filename: string;
  title: string;
  category: "Financiero" | "Inventario" | "Logística" | "Gobernanza";
  format: "pdf" | "csv" | "json";
  size: string;
  createdAt: string;
  hmacSha256: string;
  summary: string;
}

export interface MonthlyMetric {
  month: string;
  fullMonth: string;
  revenueCop: number;
  costCop: number;
  anomalyCop: number;
  marginPct: number;
  savingsCop: number;
  poCount: number;
}

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

const INITIAL_REPORTS: ReportFile[] = [
  {
    id: "rep-001",
    filename: "informe_ejecutivo_q3_2026.pdf",
    title: "Informe Ejecutivo de Ganancias, Costo Landed y Margen Neto",
    category: "Financiero",
    format: "pdf",
    size: "2.4 MB",
    createdAt: "Hoy, 08:30 a. m.",
    hmacSha256: "9f83c18b76e2d194852bf2c6e910248ad85f67b54d098e72e3a47d25e01f681a",
    summary: "Consolidación de margen operativo, ahorro por compras automáticas e impacto de sobrecostos por fletes.",
  },
  {
    id: "rep-002",
    filename: "balanceo_multisede_octubre.csv",
    title: "Matriz de Demanda y Salud de Inventario Multisede (ROP)",
    category: "Inventario",
    format: "csv",
    size: "840 KB",
    createdAt: "Ayer, 16:45 p. m.",
    hmacSha256: "e4d909c290d0fb1ca068ffaddf22cbd0add8b365d886b1f26a9e8697acac299c",
    summary: "338 SKUs auditados entre Bucaramanga, Bogotá y Medellín. Proyección de quiebres evitada al 98.4%.",
  },
  {
    id: "rep-003",
    filename: "eficiencia_rutas_osrm.pdf",
    title: "Rendimiento Logístico y Ahorro en Rutas Intermunicipales",
    category: "Logística",
    format: "pdf",
    size: "1.8 MB",
    createdAt: "27 Oct 2026",
    hmacSha256: "3f82ab2e67c8a14b091f6d34e2c817290fa8b417c8091de992384610492817cc",
    summary: "Consolidación de despachos y elusión de sobrecostos por cierres viales en Santander y Cundinamarca.",
  },
  {
    id: "rep-004",
    filename: "auditoria_recibos_criptograficos.json",
    title: "Registro de Integridad y Firmas Digitales de Gobernanza",
    category: "Gobernanza",
    format: "json",
    size: "340 KB",
    createdAt: "26 Oct 2026",
    hmacSha256: "7b10283c914e6d234850fa192385bf1872635481092837461928374619283746",
    summary: "Validación matemática de 142 órdenes de compra y conciliaciones físicas mediante HMAC-SHA256.",
  },
];

export const AnalyticsReportsView: React.FC = () => {
  const [reports, setReports] = useState<ReportFile[]>(INITIAL_REPORTS);
  const [selectedCategory, setSelectedCategory] = useState<string>("Todas");
  const [searchQuery, setSearchQuery] = useState("");
  const [timeRange, setTimeRange] = useState<"mes" | "trimestre" | "ano">("mes");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const matchCat =
        selectedCategory === "Todas" || r.category === selectedCategory;
      const matchSearch =
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.filename.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [reports, selectedCategory, searchQuery]);

  // KPIs
  const kpiItems: KpiCardItem[] = [
    {
      title: "Margen Operativo Neto",
      value: "31.4%",
      subtitle: "338 SKUs analizados",
      trend: { direction: "up", label: "+4.1% vs trimestre anterior" },
      icon: TrendingUp,
      isHero: true,
      onActionClick: () => showToast("Exportando informe ejecutivo de margen neto..."),
    },
    {
      title: "Ingresos Brutos Consolidados",
      value: "$46.8M COP",
      subtitle: "42 órdenes procesadas",
      trend: { direction: "up", label: "+12.8% vs mes previo" },
      icon: DollarSign,
    },
    {
      title: "Ahorro Negociado por IA",
      value: "$5.4M COP",
      subtitle: "Volumen y consolidación de fletes",
      trend: { direction: "up", label: "$1.2M en logística" },
      icon: Sparkles,
    },
    {
      title: "Rotación de Inventario",
      value: "98.4%",
      subtitle: "Eficiencia de capital de trabajo",
      trend: { direction: "up", label: "Quiebre reducido < 1%" },
      icon: Layers,
    },
  ];

  return (
    <div className="flex-1 h-full overflow-y-auto bg-canvas text-[#F9FAFB] font-sans select-none flex flex-col p-6 space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            className="fixed top-6 right-8 z-50 px-4 py-3 rounded-full flex items-center gap-3 bg-[#0A160E]/95 border border-[#10B981]/40 text-[#34D399] shadow-[0_0_25px_rgba(16,185,129,0.25)] backdrop-blur-xl"
          >
            <div className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
            <span className="text-xs font-mono font-medium">{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-[#8E9893] hover:text-[#F9FAFB] text-xs ml-1"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* HEADER EJECUTIVO LIMPIO                                   */}
      {/* ========================================================= */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Análisis y Reportes
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Métricas de margen, costo landed y rendimiento financiero multisede
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Switcher Temporal estilo CheckinOs */}
          <div className="flex items-center p-1 rounded-xl bg-surface-1 border border-white/[0.08]">
            <button
              onClick={() => setTimeRange("mes")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                timeRange === "mes"
                  ? "bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Este Mes
            </button>
            <button
              onClick={() => setTimeRange("trimestre")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                timeRange === "trimestre"
                  ? "bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Trimestre Q3
            </button>
            <button
              onClick={() => setTimeRange("ano")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                timeRange === "ano"
                  ? "bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Año 2026
            </button>
          </div>

          <button
            onClick={() => showToast("Exportando compilado consolidado...")}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Informe PDF</span>
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 1. FILA 1: KPI STRIP DE 4 TARJETAS CON TARJETA HÉROE      */}
      {/* ========================================================= */}
      <KpiStrip items={kpiItems} />

      {/* ========================================================= */}
      {/* 2. FILA 2: BENTO VISUAL DE 3 BLOQUES                      */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Bloque Izquierdo (7 Cols): Curva Suave con Tooltip Flotante estilo CheckinOs */}
        <div className="lg:col-span-7 bg-surface-1 rounded-2xl p-5 border border-white/[0.06] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Curva de Ingresos y Margen Operativo
              </h3>
              <p className="text-xs text-zinc-400">
                Evolución mensual con desglose de sobrecostos absorbidos
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              Margen Máximo: 31.4%
            </span>
          </div>

          {/* Gráfico SVG de Curva Suave con Área Sombreada y Tooltip */}
          <div className="relative my-4 h-56 w-full flex items-center justify-center">
            {/* Tooltip Flotante Destacado (CheckinOs Style: Total Revenue $145,450) */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-xl bg-[#0B100E]/95 border border-emerald-500/40 backdrop-blur-xl shadow-2xl flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <div>
                <span className="text-[10px] uppercase font-mono text-zinc-400 block">
                  Octubre 2026 · Cifra Récord
                </span>
                <span className="text-sm font-bold text-white font-mono">
                  $46.800.000 COP · Margen 31.4%
                </span>
              </div>
            </div>

            <svg
              className="w-full h-full select-none"
              viewBox="0 0 640 200"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="revenue-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Guías horizontales tenues */}
              <line x1="0" y1="40" x2="640" y2="40" stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
              <line x1="0" y1="100" x2="640" y2="100" stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
              <line x1="0" y1="160" x2="640" y2="160" stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />

              {/* Área bajo la curva */}
              <path
                d="M 20 160 C 90 140, 150 130, 220 110 C 290 95, 360 85, 430 70 C 500 55, 570 45, 620 30 L 620 190 L 20 190 Z"
                fill="url(#revenue-area)"
              />

              {/* Curva Principal */}
              <path
                d="M 20 160 C 90 140, 150 130, 220 110 C 290 95, 360 85, 430 70 C 500 55, 570 45, 620 30"
                fill="none"
                stroke="#10B981"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Puntos destacados */}
              <circle cx="220" cy="110" r="4.5" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="430" cy="70" r="4.5" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="620" cy="30" r="6" fill="#34D399" stroke="#FFFFFF" strokeWidth="2.5" />
            </svg>
          </div>

          {/* Días / Meses en el eje X */}
          <div className="flex justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-white/[0.04]">
            {MONTHLY_METRICS.slice(0, 8).map((m) => (
              <span key={m.month}>{m.month}</span>
            ))}
          </div>
        </div>

        {/* Bloque Central (5 Cols): Medidor Semicircular de 180° (Donezo Project Progress) */}
        <div className="lg:col-span-5 bg-surface-1 rounded-2xl p-5 border border-white/[0.06] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] flex flex-col justify-between">
          <div className="pb-3 border-b border-white/[0.06]">
            <h3 className="text-base font-bold text-white tracking-tight">
              Cumplimiento de Objetivos
            </h3>
            <p className="text-xs text-zinc-400">
              Rendimiento acumulado de ahorros y metas operativas
            </p>
          </div>

          {/* Medidor Semicircular de 180° */}
          <div className="relative flex flex-col items-center justify-center my-4">
            <svg className="w-56 h-32 select-none" viewBox="0 0 200 115">
              <defs>
                <pattern
                  id="gauge-hatch-pattern-analytics"
                  width="6"
                  height="6"
                  patternTransform="rotate(-45)"
                  patternUnits="userSpaceOnUse"
                >
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="6"
                    stroke="#10B981"
                    strokeWidth="2.5"
                    strokeOpacity="0.45"
                  />
                </pattern>
              </defs>

              {/* Arco base gris */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="#1B2620"
                strokeWidth="22"
                strokeLinecap="round"
              />

              {/* Tramo Completado Sólido (48%) */}
              <path
                d="M 20 100 A 80 80 0 0 1 100 20"
                fill="none"
                stroke="#0E684D"
                strokeWidth="22"
                strokeLinecap="round"
              />

              {/* Tramo Activo Rayado (30%) */}
              <path
                d="M 100 20 A 80 80 0 0 1 155 42"
                fill="none"
                stroke="url(#gauge-hatch-pattern-analytics)"
                strokeWidth="22"
              />
            </svg>

            {/* Texto Central Gigante */}
            <div className="absolute bottom-2 text-center">
              <span className="text-3xl font-extrabold text-white tracking-tight font-sans">
                78%
              </span>
              <span className="block text-[11px] font-medium text-zinc-400">
                Meta Trimestral
              </span>
            </div>
          </div>

          {/* Leyenda de 3 Estados (Estilo Donezo) */}
          <div className="flex items-center justify-center gap-4 pt-3 border-t border-white/[0.04] text-[11px] font-medium text-zinc-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0E684D]" />
              <span>Ejecutado (48%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span>En Ruta (30%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1B2620]" />
              <span>Pendiente (22%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. FILA 3: TABLA MODERNA DE REPORTES GENERADOS            */}
      {/* ========================================================= */}
      <div className="bg-surface-1 rounded-2xl p-5 border border-white/[0.06] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Reportes Ejecutivos & Auditoría
            </h3>
            <p className="text-xs text-zinc-400">
              Descarga directa de informes firmados y trazabilidad matemática
            </p>
          </div>

          {/* Pestañas de Filtro de Categoría */}
          <div className="flex items-center gap-2 overflow-x-auto">
            {["Todas", "Financiero", "Inventario", "Logística", "Gobernanza"].map(
              (cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30 shadow-sm"
                      : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  {cat}
                </button>
              )
            )}
          </div>
        </div>

        {/* Lista de Filas de Reporte */}
        <div className="divide-y divide-white/[0.04] mt-2">
          {filteredReports.map((r) => (
            <div
              key={r.id}
              className="py-3.5 px-2 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.02] rounded-xl transition-colors group"
            >
              <div className="flex items-center gap-3.5">
                {/* Icono de Formato Enmarcado */}
                <div className="w-10 h-10 rounded-xl bg-surface-well border border-white/[0.06] flex items-center justify-center shrink-0">
                  {r.format === "pdf" ? (
                    <FileText className="w-5 h-5 text-rose-400" />
                  ) : r.format === "csv" ? (
                    <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <ShieldCheck className="w-5 h-5 text-blue-400" />
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                    {r.title}
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5 max-w-xl">
                    {r.summary}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-zinc-500">
                    <span>{r.filename}</span>
                    <span>•</span>
                    <span>{r.size}</span>
                    <span>•</span>
                    <span>{r.createdAt}</span>
                  </div>
                </div>
              </div>

              {/* Botón de Descarga Táctil */}
              <button
                onClick={() => showToast(`Descargando ${r.filename}...`)}
                className="px-3.5 py-2 rounded-xl bg-surface-well hover:bg-white/[0.08] text-xs font-medium text-zinc-300 hover:text-white border border-white/[0.06] flex items-center gap-1.5 transition-colors shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Descargar {r.format.toUpperCase()}</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
