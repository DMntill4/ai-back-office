import { useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  Zap,
  Search,
  Truck,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';

interface DemandForecastViewProps {
  onOpenPrompt?: (prompt: string) => void;
  currency?: string;
}

interface ForecastItem {
  sku: string;
  name: string;
  category: string;
  currentStock: number;
  minStock: number;
  dailyAvgConsumption: number;
  daysUntilStockout: number;
  projectedDemand30d: number;
  suggestedReorderQty: number;
  recommendedSupplier: string;
  unitCost: string;
  leadTimeHours: number;
  riskLevel: 'high' | 'medium' | 'low';
  trendPercent: string;
  unit: string;
}

const FORECAST_CATALOG: ForecastItem[] = [
  {
    sku: 'SKU-MAN-VFD10',
    name: 'Variador de Frecuencia VFD-10',
    category: 'Electricidad Industrial',
    currentStock: 2,
    minStock: 5,
    dailyAvgConsumption: 0.8,
    daysUntilStockout: 2,
    projectedDemand30d: 24,
    suggestedReorderQty: 25,
    recommendedSupplier: 'Grainger Industrial Supply MX',
    unitCost: '$840.00 MXN',
    leadTimeHours: 48,
    riskLevel: 'high',
    trendPercent: '+28.5%',
    unit: 'uds.',
  },
  {
    sku: 'SKU-MAN-CYL50',
    name: 'Cilindro Neumático Doble Efecto',
    category: 'Neumática & Válvulas',
    currentStock: 4,
    minStock: 10,
    dailyAvgConsumption: 1.3,
    daysUntilStockout: 3,
    projectedDemand30d: 38,
    suggestedReorderQty: 35,
    recommendedSupplier: 'Festo Distribución MX',
    unitCost: '$1,240.00 MXN',
    leadTimeHours: 48,
    riskLevel: 'high',
    trendPercent: '+19.2%',
    unit: 'uds.',
  },
  {
    sku: 'SKU-MAN-DIN24',
    name: 'Fuente de Poder DIN 24V 10A',
    category: 'Fuentes & Conversión',
    currentStock: 18,
    minStock: 15,
    dailyAvgConsumption: 1.1,
    daysUntilStockout: 16,
    projectedDemand30d: 33,
    suggestedReorderQty: 20,
    recommendedSupplier: 'ElectroGlobal Monterrey',
    unitCost: '$620.00 MXN',
    leadTimeHours: 72,
    riskLevel: 'medium',
    trendPercent: '+8.4%',
    unit: 'uds.',
  },
  {
    sku: 'SKU-MAN-SM400',
    name: 'Servomotor Industrial SM-400',
    category: 'Automatización & Control',
    currentStock: 24,
    minStock: 8,
    dailyAvgConsumption: 1.2,
    daysUntilStockout: 20,
    projectedDemand30d: 36,
    suggestedReorderQty: 20,
    recommendedSupplier: 'TechCorp Distribución',
    unitCost: '$910.00 MXN',
    leadTimeHours: 48,
    riskLevel: 'medium',
    trendPercent: '+14.2%',
    unit: 'uds.',
  },
  {
    sku: 'SKU-MAN-OP10',
    name: 'Sensor Fotoeléctrico Óptico',
    category: 'Instrumentación & Sensores',
    currentStock: 35,
    minStock: 12,
    dailyAvgConsumption: 0.9,
    daysUntilStockout: 38,
    projectedDemand30d: 27,
    suggestedReorderQty: 0,
    recommendedSupplier: 'Sensores del Norte',
    unitCost: '$410.00 MXN',
    leadTimeHours: 24,
    riskLevel: 'low',
    trendPercent: '-3.1%',
    unit: 'uds.',
  },
];

export const DemandForecastView = ({ onOpenPrompt }: DemandForecastViewProps) => {
  const [horizon, setHorizon] = useState<7 | 14 | 30 | 60>(30);
  const [selectedSku, setSelectedSku] = useState<string>('SKU-MAN-VFD10');
  const [searchTerm, setSearchTerm] = useState('');
  const [calculating, setCalculating] = useState(false);
  const [realForecastSummary, setRealForecastSummary] = useState<string | null>(null);

  const activeItem = FORECAST_CATALOG.find((i) => i.sku === selectedSku) || FORECAST_CATALOG[0];

  const filteredCatalog = FORECAST_CATALOG.filter((i) =>
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRecalculate = async () => {
    setCalculating(true);
    try {
      const res = await api.getDemandForecast('prod_st200', horizon);
      if (res.success && res.data) {
        setRealForecastSummary(res.data.analysisSummary);
        toast.success(`Pronóstico predictivo recalculado con datos de ventas reales para ${horizon} días`);
      }
    } catch (err: any) {
      toast.error(`Error al conectar con la base de datos de ventas: ${err.message}`);
    } finally {
      setCalculating(false);
    }
  };

  const handleOrderSuggestion = (item: ForecastItem) => {
    const prompt = `Calcula el pronóstico de demanda a ${horizon} días para ${item.name} (${item.sku}) y cotiza una orden de reposición de ${item.suggestedReorderQty} unidades con ${item.recommendedSupplier}.`;
    onOpenPrompt?.(prompt);
  };

  return (
    <div className="flex flex-col w-full max-w-[1400px] mx-auto gap-5 font-sans text-zinc-100 pb-20">
      
      {/* ─── 1. BARRA SUPERIOR DE CONTROL COMPACTA (WORKBENCH HEADER) ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-zinc-500 font-medium">Laboratorio Analítico Predictivo</span>
            <span className="text-zinc-600">•</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.04] text-[11px] font-mono text-zinc-400 border border-white/[0.05]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Modelo Holt-Winters &amp; Regresión
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-headline">
            Pronóstico de Demanda &amp; Quiebre de Inventario
          </h1>
        </div>

        {/* Controles y Resumen Rápido en una Sola Línea */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap lg:flex-nowrap shrink-0">
          {/* Resumen de Estado */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#101217] border border-white/[0.05] text-xs">
            <span className="flex items-center gap-1.5 text-rose-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
              1 Quiebre Inminente
            </span>
            <span className="text-zinc-600">•</span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              2 en Observación
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-emerald-400 font-mono text-[11px]">
              Precisión: 96.4%
            </span>
          </div>

          {/* Selector de Horizonte */}
          <div className="flex items-center p-1 rounded-xl bg-[#14161C] border border-white/[0.05]">
            {([7, 14, 30, 60] as const).map((h) => {
              const active = horizon === h;
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHorizon(h)}
                  className={`px-3 py-1 text-xs rounded-lg transition-all cursor-pointer font-mono ${
                    active
                      ? 'bg-[#1E222B] text-white font-semibold shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {h}D
                </button>
              );
            })}
          </div>

          {/* Botón Recalcular */}
          <button
            type="button"
            onClick={handleRecalculate}
            disabled={calculating}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#14161C] hover:bg-[#1E222B] border border-white/[0.05] text-xs font-medium text-zinc-300 transition cursor-pointer disabled:opacity-50 active:scale-[0.98] shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${calculating ? 'animate-spin' : ''}`} />
            <span>{calculating ? 'Calculando...' : 'Recalcular ML'}</span>
          </button>
        </div>
      </div>

      {/* ─── 2. WORKBENCH ANALÍTICO: ESTRUCTURA SPLIT 4 / 8 ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* ══════════ COLUMNA IZQUIERDA (4 Columnas - "Selector de Inventario & Riesgo") ══════════ */}
        <div className="lg:col-span-4 rounded-2xl bg-[#101217] border border-white/[0.05] p-4 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.05]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider text-[11px]">
                  Inventario Supervisado
                </span>
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-semibold">
                  5 SKUs
                </span>
              </div>
              <span className="text-[10px] text-zinc-500">Ordenado por Riesgo</span>
            </div>

            {/* Buscador de SKU */}
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filtrar por SKU o nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#14171F] border border-white/[0.05] rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-400/50"
              />
            </div>

            {/* Lista Vertical de SKUs (con altura responsive para no saturar en móvil) */}
            <div className="space-y-1.5 overflow-y-auto max-h-56 sm:max-h-72 lg:max-h-[580px] custom-scrollbar pr-0.5">
              {filteredCatalog.map((item) => {
                const isSelected = selectedSku === item.sku;
                const isCritical = item.daysUntilStockout <= 3;
                const isWarning = item.daysUntilStockout > 3 && item.daysUntilStockout <= 20;

                return (
                  <div
                    key={item.sku}
                    onClick={() => setSelectedSku(item.sku)}
                    className={`p-3 rounded-xl transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-white/[0.04] border-white/[0.07] border-l-2 border-l-[#4ADE80] shadow-sm'
                        : 'bg-[#14171F]/50 border-white/[0.03] hover:bg-[#14171F] hover:border-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-semibold truncate ${isSelected ? 'text-white' : 'text-zinc-200'}`}>
                          {item.name}
                        </p>
                        <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
                          {item.sku} • {item.category}
                        </p>
                      </div>

                      {/* Badge de Días hasta Agotamiento */}
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full shrink-0 border ${
                          isCritical
                            ? 'bg-rose-500/15 text-rose-300 border-rose-500/25'
                            : isWarning
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/25'
                            : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
                        }`}
                      >
                        {item.daysUntilStockout} días
                      </span>
                    </div>

                    {/* Mini-barra de Stock Actual vs. Mínimo */}
                    <div className="mt-2.5 pt-2 border-t border-white/[0.03] flex items-center justify-between text-[10px] text-zinc-400">
                      <span>Stock: <strong className="text-white">{item.currentStock}</strong> / Mín: {item.minStock}</span>
                      <span className="font-mono text-zinc-500">{item.dailyAvgConsumption} {item.unit}/día</span>
                    </div>

                    <div className="mt-1 h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isCritical ? 'bg-rose-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-400'
                        }`}
                        style={{
                          width: `${Math.min(100, (item.currentStock / item.minStock) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-white/[0.05] text-[11px] text-zinc-500 flex items-center justify-between">
            <span>Sincronizado con PostgreSQL • Motor Predictivo Activo</span>
            <span className="text-emerald-400 font-mono">100% en regla</span>
          </div>
        </div>

        {/* ══════════ COLUMNA DERECHA (8 Columnas - "Lienzo de Proyección Profunda del SKU") ══════════ */}
        <div className="lg:col-span-8 rounded-2xl bg-[#101217] border border-white/[0.05] p-6 flex flex-col justify-between space-y-6 shadow-sm">
          
          {/* Cabecera del SKU Activo con Métricas Clave en Fila Horizontal */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.05]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-zinc-500 font-mono">{activeItem.sku}</span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-xs text-zinc-400">{activeItem.category}</span>
                </div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-white tracking-tight font-headline">
                    {activeItem.name}
                  </h2>
                  <span
                    className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border ${
                      activeItem.daysUntilStockout <= 3
                        ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                        : activeItem.daysUntilStockout <= 20
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    {activeItem.daysUntilStockout <= 3
                      ? '⚠️ Quiebre Inminente'
                      : activeItem.daysUntilStockout <= 20
                      ? 'Atención Requerida'
                      : 'Stock Saludable'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">Tendencia mensual:</span>
                <span className="text-xs font-semibold text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  {activeItem.trendPercent}
                </span>
              </div>
            </div>

            {/* Fila Horizontal de Métricas Clave Separadas por Divisores */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.05] mt-4 pt-1 pb-1 rounded-xl bg-[#14171F] border border-white/[0.04]">
              <div className="p-3 text-center sm:text-left">
                <span className="text-[10px] uppercase font-semibold text-zinc-500 block">Stock Actual</span>
                <span className="text-lg font-bold text-white font-headline mt-0.5 block">
                  {activeItem.currentStock} <span className="text-xs font-normal text-zinc-400">{activeItem.unit}</span>
                </span>
              </div>

              <div className="p-3 text-center sm:text-left">
                <span className="text-[10px] uppercase font-semibold text-zinc-500 block">Mínimo de Seguridad</span>
                <span className="text-lg font-bold text-zinc-300 font-headline mt-0.5 block">
                  {activeItem.minStock} <span className="text-xs font-normal text-zinc-400">{activeItem.unit}</span>
                </span>
              </div>

              <div className="p-3 text-center sm:text-left">
                <span className="text-[10px] uppercase font-semibold text-zinc-500 block">Consumo Diario</span>
                <span className="text-lg font-bold text-white font-headline mt-0.5 block">
                  {activeItem.dailyAvgConsumption} <span className="text-xs font-normal text-zinc-400">{activeItem.unit}/d</span>
                </span>
              </div>

              <div className="p-3 text-center sm:text-left">
                <span className="text-[10px] uppercase font-semibold text-zinc-500 block">Demanda {horizon}D</span>
                <span className="text-lg font-bold text-white font-headline mt-0.5 block">
                  {Math.round(activeItem.dailyAvgConsumption * horizon)} <span className="text-xs font-normal text-zinc-400">{activeItem.unit}</span>
                </span>
              </div>

              <div className="p-3 text-center sm:text-left col-span-2 sm:col-span-1 border-t sm:border-t-0 border-white/[0.05]">
                <span className="text-[10px] uppercase font-semibold text-emerald-400 block">Reorden Sugerido</span>
                <span className="text-lg font-bold text-[#4ADE80] font-headline mt-0.5 block">
                  {activeItem.suggestedReorderQty} <span className="text-xs font-normal text-emerald-300/80">{activeItem.unit}</span>
                </span>
              </div>
            </div>
          </div>

          {/* ─── GRÁFICO SVG DE ÁREA / LÍNEA DE GRAN FORMATO (PROYECCIÓN DE AGOTAMIENTO) ─── */}
          <div className="rounded-xl bg-[#14171F] border border-white/[0.04] p-4 sm:p-5 relative overflow-hidden">
            {/* Cabecera del Gráfico con Leyendas */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4">
              <div>
                <span className="text-xs font-semibold text-white block">Curva Predictiva de Existencias &amp; Intersección de Quiebre</span>
                <span className="text-[10px] text-zinc-500">Simulación a horizonte de {horizon} días calendario</span>
              </div>

              {/* Leyenda */}
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-[10px] font-mono">
                <div className="flex items-center gap-1.5 text-rose-300">
                  <span className="w-2.5 h-0.5 bg-rose-400" />
                  <span>Consumo Proyectado</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2.5 h-0.5 bg-emerald-400 stroke-dasharray" />
                  <span>Recuperación (+{activeItem.suggestedReorderQty}u)</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <span className="w-2.5 h-0.5 border-b border-dashed border-zinc-400" />
                  <span>Mínimo ({activeItem.minStock}u)</span>
                </div>
              </div>
            </div>

            {/* Lienzo SVG Dinámico de Gran Formato */}
            <div className="relative h-60 w-full">
              <svg viewBox="0 0 600 200" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                <defs>
                  {/* Gradiente para área de stock actual */}
                  <linearGradient id="depletionGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={activeItem.daysUntilStockout <= 3 ? '#F87171' : '#4ADE80'} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={activeItem.daysUntilStockout <= 3 ? '#F87171' : '#4ADE80'} stopOpacity="0.0" />
                  </linearGradient>

                  {/* Gradiente para recuperación */}
                  <linearGradient id="recoveryGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.30" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Líneas horizontales de guía */}
                <line x1="0" y1="40" x2="600" y2="40" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                <line x1="0" y1="80" x2="600" y2="80" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                <line x1="0" y1="120" x2="600" y2="120" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                <line x1="0" y1="160" x2="600" y2="160" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

                {/* LÍNEA HORIZONTAL PUNTEADA: Umbral de Stock Mínimo */}
                <line
                  x1="0"
                  y1="140"
                  x2="600"
                  y2="140"
                  stroke="#F59E0B"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  opacity="0.8"
                />
                <text x="590" y="135" textAnchor="end" fill="#F59E0B" fontSize="10" fontFamily="monospace">
                  Umbral Mínimo ({activeItem.minStock} uds.)
                </text>

                {/* Curva descendente real según el stockout del SKU */}
                {activeItem.daysUntilStockout <= 3 ? (
                  <>
                    {/* Área sombreada descendente */}
                    <path
                      d="M 0 150 L 50 170 L 100 195 L 0 195 Z"
                      fill="url(#depletionGrad)"
                    />
                    {/* Curva de agotamiento */}
                    <path
                      d="M 0 150 C 35 158, 65 178, 100 195"
                      fill="none"
                      stroke="#F87171"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />

                    {/* Curva punteada verde de recuperación (+25 uds en Día 4 con Grainger) */}
                    <path
                      d="M 100 195 L 140 195 L 160 50 C 250 65, 420 85, 600 110"
                      fill="none"
                      stroke="#4ADE80"
                      strokeWidth="2.5"
                      strokeDasharray="5 5"
                      strokeLinecap="round"
                    />

                    <path
                      d="M 140 195 L 160 50 C 250 65, 420 85, 600 110 L 600 195 L 140 195 Z"
                      fill="url(#recoveryGrad)"
                    />

                    {/* Nodo de Intersección de Quiebre */}
                    <circle cx="100" cy="195" r="5" fill="#EF4444" stroke="#FFFFFF" strokeWidth="2" />
                    <circle cx="100" cy="195" r="12" fill="#EF4444" opacity="0.3" className="animate-ping" />

                    {/* Nodo de Llegada de Reposición */}
                    <circle cx="160" cy="50" r="4.5" fill="#4ADE80" stroke="#050806" strokeWidth="2" />
                  </>
                ) : (
                  <>
                    {/* Para SKUs con stock moderado o saludable */}
                    <path
                      d="M 0 60 C 150 90, 320 130, 480 185 L 600 195 L 600 195 L 0 195 Z"
                      fill="url(#depletionGrad)"
                    />
                    <path
                      d="M 0 60 C 150 90, 320 130, 480 185 L 600 195"
                      fill="none"
                      stroke="#4ADE80"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <circle cx="480" cy="185" r="5" fill="#4ADE80" stroke="#FFFFFF" strokeWidth="2" />
                  </>
                )}
              </svg>

              {/* Tooltip Flotante de Intersección */}
              {activeItem.daysUntilStockout <= 3 && (
                <div
                  className="absolute top-[135px] left-[75px] bg-[#1E222D] border border-rose-500/40 px-2.5 py-1 rounded-md text-[10px] font-mono font-semibold text-rose-300 shadow-xl flex items-center gap-1.5 whitespace-nowrap z-10"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                  <span>Día {activeItem.daysUntilStockout}: Quiebre Total (0 uds.)</span>
                </div>
              )}

              {/* Tooltip Flotante de Reposición */}
              {activeItem.daysUntilStockout <= 3 && (
                <div
                  className="absolute top-[18px] left-[175px] bg-[#14261B] border border-emerald-400/40 px-2.5 py-1 rounded-md text-[10px] font-mono font-semibold text-emerald-300 shadow-xl flex items-center gap-1.5 whitespace-nowrap z-10"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Día 4: +{activeItem.suggestedReorderQty} uds (Grainger MX)</span>
                </div>
              )}
            </div>

            {/* Eje X Graduado */}
            <div className="flex justify-between text-[10px] font-mono text-zinc-500 mt-2 px-1 border-t border-white/[0.04] pt-2">
              <span>Hoy (Día 0)</span>
              <span>Día 5</span>
              <span>Día 10</span>
              <span>Día 15</span>
              <span>Día 20</span>
              <span>Día 25</span>
              <span>Día 30</span>
            </div>
          </div>

          {/* ─── DOCK INFERIOR DE ACCIÓN MINT (INTEGRADO EN LA BASE DEL PANEL DERECHO) ─── */}
          <div className="bg-gradient-to-r from-[#064E3B]/70 via-[#0a2318]/60 to-[#101217] border border-emerald-500/25 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_10px_30px_rgba(6,78,59,0.2)]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-400/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
                <Truck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white">Proveedor Óptimo: {activeItem.recommendedSupplier}</span>
                  <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/30">
                    Lead Time: {activeItem.leadTimeHours}h
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Costo Unitario Negociado: <strong className="text-zinc-200">{activeItem.unitCost}</strong> • Pre-aprobación autónoma bajo umbral de $10k.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => onOpenPrompt?.(`Simula el impacto de anticipar la orden de reposición del ${activeItem.name} con un incremento del 20% en ventas.`)}
                className="px-3.5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 hover:text-white text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Simular con ReAct</span>
              </button>

              <button
                type="button"
                onClick={() => handleOrderSuggestion(activeItem)}
                className="px-4 py-2.5 rounded-xl bg-[#4ADE80] hover:bg-[#34D399] text-zinc-950 font-semibold text-xs transition cursor-pointer shadow-sm active:scale-[0.98] flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 fill-zinc-950" />
                <span>Emitir Reorden ({activeItem.suggestedReorderQty} uds) ↗</span>
              </button>
            </div>
          </div>

          {/* Dictamen de IA si se ejecutó Recalcular */}
          {realForecastSummary && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2.5 animate-in fade-in duration-200">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-200">Dictamen de Inteligencia ReAct (Ventas Reales):</p>
                <p className="mt-0.5 text-zinc-300 leading-relaxed">{realForecastSummary}</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default DemandForecastView;
