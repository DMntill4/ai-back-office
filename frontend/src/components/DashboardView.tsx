import { useState, useMemo } from 'react';
import {
  Activity, ArrowRight, Check, ShieldCheck, RefreshCw, TrendingUp,
  Maximize2, Minimize2, CheckCircle2, Clock,
} from 'lucide-react';
import { motion } from 'framer-motion';

/* ───────────────────────────── TYPES & INTERFACES ───────────────────────────── */

export type TimeRange = '24H' | '7D' | '30D' | 'Trimestre' | 'Custom';
export type DensityMode = 'compact' | 'expanded';
export type TabKey = 'alerts' | 'ok' | 'cron';
export type ProviderSortKey = 'score' | 'sla' | 'cost';

interface DashboardViewProps {
  onNavigate?: (view: string) => void;
  onOpenPrompt?: (prompt: string) => void;
}

/* ───────────────────────────── DATASETS POR RANGO ───────────────────────────── */

interface TimeRangeData {
  orders: {
    total: number;
    diff: string;
    subtext: string;
    bezierPath: {
      line: string;
      area: string;
      lastX: number;
      lastY: number;
    };
  };
  automation: {
    rate: number;
    autonomous: number;
    hitl: number;
    variation: string;
  };
  savings: {
    amount: string;
    diff: string;
    bezierPath: {
      line: string;
      area: string;
      lastX: number;
      lastY: number;
    };
  };
  inference: {
    cost: string;
    calls: number;
    unitCost: string;
    bars: { day: string; heightClass: string; cost: number; tokens: number; isPeak?: boolean }[];
  };
  providers: {
    name: string;
    score: number;
    sla: string;
    hours: number;
    unitCost: string;
    defectRate: string;
    isBest?: boolean;
  }[];
}

const RANGE_CONFIG: Record<TimeRange, TimeRangeData> = {
  '24H': {
    orders: {
      total: 14,
      diff: '+4.2% vs ayer',
      subtext: 'órdenes en 24H',
      bezierPath: {
        line: 'M 0 44 C 35 42, 60 46, 90 36 C 120 26, 150 32, 185 18 C 215 10, 240 14, 260 4',
        area: 'M 0 44 C 35 42, 60 46, 90 36 C 120 26, 150 32, 185 18 C 215 10, 240 14, 260 4 L 260 52 L 0 52 Z',
        lastX: 260,
        lastY: 4,
      },
    },
    automation: {
      rate: 93,
      autonomous: 13,
      hitl: 1,
      variation: '+1.8% vs ayer',
    },
    savings: {
      amount: '$145 USD',
      diff: '+$32 vs día anterior',
      bezierPath: {
        line: 'M 0 46 C 40 42, 70 44, 100 34 C 135 24, 165 28, 200 14 C 225 8, 245 10, 260 3',
        area: 'M 0 46 C 40 42, 70 44, 100 34 C 135 24, 165 28, 200 14 C 225 8, 245 10, 260 3 L 260 52 L 0 52 Z',
        lastX: 260,
        lastY: 3,
      },
    },
    inference: {
      cost: '$0.38 USD',
      calls: 42,
      unitCost: '$0.0021 / dictamen',
      bars: [
        { day: '00-06h', heightClass: 'h-4', cost: 0.05, tokens: 18 },
        { day: '06-12h', heightClass: 'h-10', cost: 0.14, tokens: 45, isPeak: true },
        { day: '12-18h', heightClass: 'h-6', cost: 0.12, tokens: 38 },
        { day: '18-24h', heightClass: 'h-5', cost: 0.07, tokens: 22 },
      ],
    },
    providers: [
      { name: 'Grainger Ind.', score: 98.4, sla: '48h', hours: 48, unitCost: '$42.00', defectRate: '0.1%', isBest: true },
      { name: 'TechCorp MX', score: 87.2, sla: '72h', hours: 72, unitCost: '$45.50', defectRate: '0.6%' },
      { name: 'ElectroGlobal', score: 79.1, sla: '96h', hours: 96, unitCost: '$41.20', defectRate: '1.2%' },
      { name: 'FastShip Logistics', score: 66.5, sla: '120h', hours: 120, unitCost: '$39.80', defectRate: '2.8%' },
    ],
  },
  '7D': {
    orders: {
      total: 48,
      diff: '+8.7% vs sem. ant.',
      subtext: 'órdenes en 7D',
      bezierPath: {
        line: 'M 0 44 C 30 40, 55 46, 85 34 C 115 22, 140 30, 175 16 C 205 8, 230 12, 260 4',
        area: 'M 0 44 C 30 40, 55 46, 85 34 C 115 22, 140 30, 175 16 C 205 8, 230 12, 260 4 L 260 52 L 0 52 Z',
        lastX: 260,
        lastY: 4,
      },
    },
    automation: {
      rate: 92,
      autonomous: 44,
      hitl: 4,
      variation: '+2.4% vs sem. ant.',
    },
    savings: {
      amount: '$520 USD',
      diff: '+$94 vs sem. ant.',
      bezierPath: {
        line: 'M 0 46 C 35 42, 65 36, 95 28 C 130 20, 160 24, 195 12 C 220 6, 240 8, 260 3',
        area: 'M 0 46 C 35 42, 65 36, 95 28 C 130 20, 160 24, 195 12 C 220 6, 240 8, 260 3 L 260 52 L 0 52 Z',
        lastX: 260,
        lastY: 3,
      },
    },
    inference: {
      cost: '$1.18 USD',
      calls: 184,
      unitCost: '$0.0023 / dictamen',
      bars: [
        { day: 'Lun', heightClass: 'h-4', cost: 0.16, tokens: 28 },
        { day: 'Mar', heightClass: 'h-6', cost: 0.22, tokens: 35 },
        { day: 'Mié', heightClass: 'h-10', cost: 0.28, tokens: 42, isPeak: true },
        { day: 'Jue', heightClass: 'h-5', cost: 0.19, tokens: 31 },
        { day: 'Vie', heightClass: 'h-5', cost: 0.17, tokens: 26 },
        { day: 'Sáb', heightClass: 'h-3', cost: 0.09, tokens: 14 },
        { day: 'Dom', heightClass: 'h-3', cost: 0.07, tokens: 11 },
      ],
    },
    providers: [
      { name: 'Grainger Ind.', score: 98.1, sla: '48h', hours: 48, unitCost: '$42.10', defectRate: '0.1%', isBest: true },
      { name: 'TechCorp MX', score: 86.4, sla: '72h', hours: 72, unitCost: '$45.20', defectRate: '0.7%' },
      { name: 'ElectroGlobal', score: 78.8, sla: '96h', hours: 96, unitCost: '$41.00', defectRate: '1.3%' },
      { name: 'FastShip Logistics', score: 65.0, sla: '120h', hours: 120, unitCost: '$39.50', defectRate: '3.1%' },
    ],
  },
  '30D': {
    orders: {
      total: 156,
      diff: '+12.4% vs mes ant.',
      subtext: 'órdenes en 30D',
      bezierPath: {
        line: 'M 0 44 C 40 40, 70 46, 110 30 C 145 18, 175 26, 210 12 C 235 6, 250 8, 260 4',
        area: 'M 0 44 C 40 40, 70 46, 110 30 C 145 18, 175 26, 210 12 C 235 6, 250 8, 260 4 L 260 52 L 0 52 Z',
        lastX: 260,
        lastY: 4,
      },
    },
    automation: {
      rate: 91,
      autonomous: 142,
      hitl: 14,
      variation: '+2.1% vs mes ant.',
    },
    savings: {
      amount: '$1,840 USD',
      diff: '+$340 vs mes ant.',
      bezierPath: {
        line: 'M 0 48 C 35 42, 75 34, 115 26 C 150 18, 180 22, 215 10 C 235 5, 250 6, 260 3',
        area: 'M 0 48 C 35 42, 75 34, 115 26 C 150 18, 180 22, 215 10 C 235 5, 250 6, 260 3 L 260 52 L 0 52 Z',
        lastX: 260,
        lastY: 3,
      },
    },
    inference: {
      cost: '$4.20 USD',
      calls: 520,
      unitCost: '$0.0024 / dictamen',
      bars: [
        { day: 'S1', heightClass: 'h-5', cost: 0.95, tokens: 120 },
        { day: 'S2', heightClass: 'h-10', cost: 1.15, tokens: 145, isPeak: true },
        { day: 'S3', heightClass: 'h-6', cost: 1.05, tokens: 132 },
        { day: 'S4', heightClass: 'h-7', cost: 1.05, tokens: 123 },
      ],
    },
    providers: [
      { name: 'Grainger Ind.', score: 98.4, sla: '48h', hours: 48, unitCost: '$42.00', defectRate: '0.1%', isBest: true },
      { name: 'TechCorp MX', score: 86.0, sla: '72h', hours: 72, unitCost: '$45.50', defectRate: '0.8%' },
      { name: 'ElectroGlobal', score: 78.5, sla: '96h', hours: 96, unitCost: '$41.20', defectRate: '1.4%' },
      { name: 'FastShip Logistics', score: 64.2, sla: '120h', hours: 120, unitCost: '$39.80', defectRate: '3.2%' },
    ],
  },
  'Trimestre': {
    orders: {
      total: 462,
      diff: '+18.1% vs trim. ant.',
      subtext: 'órdenes en Trimestre',
      bezierPath: {
        line: 'M 0 44 C 45 40, 80 46, 120 28 C 160 16, 195 22, 225 10 C 245 4, 255 6, 260 3',
        area: 'M 0 44 C 45 40, 80 46, 120 28 C 160 16, 195 22, 225 10 C 245 4, 255 6, 260 3 L 260 52 L 0 52 Z',
        lastX: 260,
        lastY: 3,
      },
    },
    automation: {
      rate: 90,
      autonomous: 418,
      hitl: 44,
      variation: '+3.5% vs trim. ant.',
    },
    savings: {
      amount: '$5,620 USD',
      diff: '+$1,120 vs trim. ant.',
      bezierPath: {
        line: 'M 0 46 C 40 42, 85 32, 125 22 C 165 14, 200 18, 230 8 C 245 4, 255 5, 260 2',
        area: 'M 0 46 C 40 42, 85 32, 125 22 C 165 14, 200 18, 230 8 C 245 4, 255 5, 260 2 L 260 52 L 0 52 Z',
        lastX: 260,
        lastY: 2,
      },
    },
    inference: {
      cost: '$12.80 USD',
      calls: 1640,
      unitCost: '$0.0022 / dictamen',
      bars: [
        { day: 'Mes 1', heightClass: 'h-6', cost: 3.90, tokens: 490 },
        { day: 'Mes 2', heightClass: 'h-10', cost: 4.70, tokens: 590, isPeak: true },
        { day: 'Mes 3', heightClass: 'h-7', cost: 4.20, tokens: 560 },
      ],
    },
    providers: [
      { name: 'Grainger Ind.', score: 98.7, sla: '48h', hours: 48, unitCost: '$41.80', defectRate: '0.1%', isBest: true },
      { name: 'TechCorp MX', score: 85.5, sla: '72h', hours: 72, unitCost: '$45.80', defectRate: '0.9%' },
      { name: 'ElectroGlobal', score: 79.2, sla: '96h', hours: 96, unitCost: '$41.00', defectRate: '1.3%' },
      { name: 'FastShip Logistics', score: 63.8, sla: '120h', hours: 120, unitCost: '$39.90', defectRate: '3.4%' },
    ],
  },
  'Custom': {
    orders: {
      total: 82,
      diff: 'Periodo activo',
      subtext: 'órdenes seleccionadas',
      bezierPath: {
        line: 'M 0 44 C 40 38, 75 44, 110 30 C 145 20, 180 24, 215 12 C 235 8, 250 10, 260 4',
        area: 'M 0 44 C 40 38, 75 44, 110 30 C 145 20, 180 24, 215 12 C 235 8, 250 10, 260 4 L 260 52 L 0 52 Z',
        lastX: 260,
        lastY: 4,
      },
    },
    automation: {
      rate: 91,
      autonomous: 75,
      hitl: 7,
      variation: 'Meta: >90%',
    },
    savings: {
      amount: '$980 USD',
      diff: 'Ahorro verificado',
      bezierPath: {
        line: 'M 0 46 C 35 42, 70 36, 105 26 C 145 18, 180 22, 215 10 C 235 6, 250 8, 260 3',
        area: 'M 0 46 C 35 42, 70 36, 105 26 C 145 18, 180 22, 215 10 C 235 6, 250 8, 260 3 L 260 52 L 0 52 Z',
        lastX: 260,
        lastY: 3,
      },
    },
    inference: {
      cost: '$2.25 USD',
      calls: 280,
      unitCost: '$0.0024 / dictamen',
      bars: [
        { day: 'D1-3', heightClass: 'h-4', cost: 0.52, tokens: 65 },
        { day: 'D4-6', heightClass: 'h-10', cost: 0.71, tokens: 88, isPeak: true },
        { day: 'D7-9', heightClass: 'h-6', cost: 0.58, tokens: 72 },
        { day: 'D10-12', heightClass: 'h-5', cost: 0.44, tokens: 55 },
      ],
    },
    providers: [
      { name: 'Grainger Ind.', score: 98.4, sla: '48h', hours: 48, unitCost: '$42.00', defectRate: '0.1%', isBest: true },
      { name: 'TechCorp MX', score: 86.0, sla: '72h', hours: 72, unitCost: '$45.50', defectRate: '0.8%' },
      { name: 'ElectroGlobal', score: 78.5, sla: '96h', hours: 96, unitCost: '$41.20', defectRate: '1.4%' },
      { name: 'FastShip Logistics', score: 64.2, sla: '120h', hours: 120, unitCost: '$39.80', defectRate: '3.2%' },
    ],
  },
};

/* ───────────────────────────── DATOS DE ALMACENES ───────────────────────────── */

interface WarehouseHealth {
  id: string;
  name: string;
  bay: string;
  capacityPercent: number;
  temperature: string;
  status: 'critical' | 'warning' | 'healthy';
}

const WAREHOUSES: WarehouseHealth[] = [
  {
    id: 'central',
    name: 'Almacén Central',
    bay: 'Bahía A & B',
    capacityPercent: 84,
    temperature: '21.4°C',
    status: 'critical',
  },
  {
    id: 'norte',
    name: 'Almacén Norte',
    bay: 'Bahía C',
    capacityPercent: 73,
    temperature: '19.8°C',
    status: 'warning',
  },
  {
    id: 'refrigerado',
    name: 'Almacén Refrigerado',
    bay: 'Zona Fría Cámara 1',
    capacityPercent: 62,
    temperature: '4.2°C',
    status: 'healthy',
  },
  {
    id: 'occidente',
    name: 'Almacén Occidente',
    bay: 'Bahía Logística D',
    capacityPercent: 45,
    temperature: '22.0°C',
    status: 'healthy',
  },
];

/* ───────────────────────────── DATOS DE TABS MONITOR ───────────────────────────── */

const ALERTS_DATA = [
  {
    sku: 'ST-200',
    title: 'Sensor Térmico ST-200',
    stockText: '2u / mín 15u',
    warehouse: 'Almacén Central • Bahía B',
    severity: 'critical' as const,
    prompt: 'Revisa el stock del Sensor ST-200 (2u / mín 15u) y cotiza reposición de 50 unidades con Grainger Industrial.',
  },
  {
    sku: 'MCU-X1',
    title: 'Microcontrolador X1 (32-bit)',
    stockText: '18u / mín 20u',
    warehouse: 'Almacén Norte • Bahía C',
    severity: 'warning' as const,
    prompt: 'Evalúa existencias de Microcontrolador X1 (18u / mín 20u) y simula necesidad de abasto a 15 días.',
  },
];

const HEALTHY_DATA = [
  {
    sku: 'VALV-P2',
    title: 'Válvula Neumática P2',
    stockText: '45u / mín 30u',
    warehouse: 'Almacén Occidente',
    severity: 'healthy' as const,
    prompt: 'Analiza el consumo histórico de la Válvula Neumática P2.',
  },
  {
    sku: 'RELAY-5V',
    title: 'Relay Industrial 5V / 10A',
    stockText: '120u / mín 50u',
    warehouse: 'Almacén Refrigerado',
    severity: 'healthy' as const,
    prompt: 'Verifica los proveedores alternativos del Relay Industrial 5V.',
  },
];

const CRON_HISTORY = [
  {
    id: 'cycle-049',
    timestamp: 'Hace 45 seg',
    duration: '142 ms',
    description: 'Escaneo proactivo de 4 almacenes. 2 SKUs por debajo de nivel mínimo.',
  },
  {
    id: 'cycle-048',
    timestamp: 'Hace 60 seg',
    duration: '138 ms',
    description: 'Auditoría en base a reglas de gobernanza ($10,000 MXN límite).',
  },
  {
    id: 'cycle-047',
    timestamp: 'Hace 2 min',
    duration: '155 ms',
    description: 'Cálculo de SLA y puntuación de proveedores sincronizado.',
  },
];

/* ───────────────────────────── COMPONENTE PRINCIPAL ───────────────────────────── */

export const DashboardView = ({ onNavigate, onOpenPrompt }: DashboardViewProps) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('30D');
  const [density, setDensity] = useState<DensityMode>('expanded');
  const [activeTab, setActiveTab] = useState<TabKey>('alerts');
  const [providerSort, setProviderSort] = useState<ProviderSortKey>('score');
  const [auditing, setAuditing] = useState(false);
  const [auditDone, setAuditDone] = useState(false);

  const currentData = useMemo(() => RANGE_CONFIG[timeRange], [timeRange]);

  const runAudit = () => {
    setAuditing(true);
    setTimeout(() => {
      setAuditing(false);
      setAuditDone(true);
      setTimeout(() => setAuditDone(false), 2400);
    }, 1000);
  };

  const handleResolve = (prompt: string) => {
    if (onOpenPrompt) {
      onOpenPrompt(prompt);
    } else if (onNavigate) {
      onNavigate('chat');
    }
  };

  const sortedProviders = useMemo(() => {
    const list = [...currentData.providers];
    if (providerSort === 'score') {
      return list.sort((a, b) => b.score - a.score);
    }
    if (providerSort === 'sla') {
      return list.sort((a, b) => a.hours - b.hours);
    }
    if (providerSort === 'cost') {
      return list.sort((a, b) => parseFloat(a.unitCost.replace('$', '')) - parseFloat(b.unitCost.replace('$', '')));
    }
    return list;
  }, [currentData.providers, providerSort]);

  return (
    <div className="flex flex-col w-full max-w-[1440px] mx-auto gap-5 font-sans text-zinc-100 pb-16">

      {/* ────────────────── A. CABECERA GLOBAL (HEADER MINIMALISTA) ────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-1">
        {/* Izquierda: Título + Dot en vivo + Subtítulo */}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">
              Centro de Mando
            </h1>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Telemetría en vivo</span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Supervisión de compras autónomas, salud de inventario y gobernanza Human-in-the-Loop
          </p>
        </div>

        {/* Centro / Derecha: Control de tiempo + Densidad + Acción */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          {/* Selector de Rango Temporal Estilo Píldora */}
          <div className="flex items-center p-0.5 rounded-lg border border-zinc-800/60 bg-zinc-900 shadow-inner">
            {(['24H', '7D', '30D', 'Trimestre', 'Custom'] as TimeRange[]).map((range) => {
              const active = timeRange === range;
              return (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`relative px-2.5 py-1 text-xs rounded-md transition-colors ${
                    active ? 'text-zinc-100 font-medium' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="activeTimeRange"
                      className="absolute inset-0 rounded-md bg-zinc-800 shadow-sm"
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10">{range}</span>
                </button>
              );
            })}
          </div>

          {/* Conmutador de Densidad */}
          <div className="flex items-center p-0.5 rounded-lg border border-zinc-800/60 bg-zinc-900">
            <button
              onClick={() => setDensity('compact')}
              title="Vista compacta"
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-colors ${
                density === 'compact'
                  ? 'bg-zinc-800 text-zinc-100 font-medium shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Minimize2 className="h-3.5 w-3.5 text-zinc-400" />
              <span className="hidden sm:inline">Compacta</span>
            </button>
            <button
              onClick={() => setDensity('expanded')}
              title="Vista analítica"
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-colors ${
                density === 'expanded'
                  ? 'bg-zinc-800 text-zinc-100 font-medium shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Maximize2 className="h-3.5 w-3.5 text-zinc-300" />
              <span className="hidden sm:inline">Analítica</span>
            </button>
          </div>

          {/* Botón Primario/Secundario Elegante */}
          <button
            onClick={runAudit}
            disabled={auditing}
            className="flex items-center gap-2 rounded-lg bg-zinc-100 text-zinc-900 hover:bg-white active:scale-[0.98] transition-all font-medium text-xs px-3.5 py-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {auditing ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-zinc-900" />
                <span>Escaneando...</span>
              </>
            ) : auditDone ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span>Sincronizado</span>
              </>
            ) : (
              <>
                <Activity className="h-3.5 w-3.5 text-zinc-700" />
                <span>Ejecutar auditoría proactiva</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ────────────────── B. GRID ASIMÉTRICO 70 / 30 ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">

        {/* ───────── COLUMNA IZQUIERDA (~70%): KPIS Y RENDIMIENTO DE PROVEEDORES ───────── */}
        <div className="lg:col-span-8 flex flex-col gap-5">

          {/* ────── GRID SUPERIOR 2x2 DE KPIS ────── */}
          <div className={`grid gap-4 ${density === 'compact' ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2'}`}>

            {/* KPI 1: Órdenes totales */}
            <div className="relative rounded-xl border border-zinc-800/60 bg-[#121215] p-5 flex flex-col justify-between hover:border-zinc-700/60 transition-colors duration-150 shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-zinc-400">
                  Órdenes totales
                </span>
                <span className="flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-normal text-emerald-400">
                  <TrendingUp className="h-3 w-3" />
                  {currentData.orders.diff}
                </span>
              </div>

              <div className="my-2.5 flex items-baseline gap-2">
                <span className="text-3xl font-semibold tracking-tight text-zinc-100 tabular-nums">
                  {currentData.orders.total}
                </span>
                <span className="text-xs text-zinc-500">{currentData.orders.subtext}</span>
              </div>

              {/* Sparkline de Área Suave */}
              {density === 'expanded' ? (
                <div className="relative mt-2 h-12 w-full overflow-hidden">
                  <svg className="w-full h-full" viewBox="0 0 260 52" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="ordersGradClean" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.12} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <path
                      d={currentData.orders.bezierPath.area}
                      fill="url(#ordersGradClean)"
                    />
                    <path
                      d={currentData.orders.bezierPath.line}
                      fill="none"
                      stroke="#34d399"
                      strokeOpacity={0.75}
                      strokeWidth={1.5}
                      strokeLinecap="round"
                    />
                    <circle
                      cx={currentData.orders.bezierPath.lastX - 2}
                      cy={currentData.orders.bezierPath.lastY}
                      r={2.5}
                      fill="#34d399"
                    />
                  </svg>
                </div>
              ) : (
                <div className="flex items-center justify-between text-xs text-zinc-500 pt-2 border-t border-zinc-800/40">
                  <span>Cadencia estable</span>
                  <span className="text-zinc-400">100% procesadas</span>
                </div>
              )}
            </div>

            {/* KPI 2: Tasa de automatización */}
            <div className="relative rounded-xl border border-zinc-800/60 bg-[#121215] p-5 flex flex-col justify-between hover:border-zinc-700/60 transition-colors duration-150 shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-zinc-400">
                  Tasa de automatización
                </span>
                <span className="flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-normal text-emerald-400">
                  <TrendingUp className="h-3 w-3" />
                  {currentData.automation.variation}
                </span>
              </div>

              <div className="my-2.5 flex items-baseline gap-2">
                <span className="text-3xl font-semibold tracking-tight text-zinc-100 tabular-nums">
                  {currentData.automation.rate}%
                </span>
                <span className="text-xs text-zinc-500">autónomas vs HITL</span>
              </div>

              {/* Barra Continua y Minimalista */}
              <div className="mt-2 flex flex-col gap-2">
                <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden flex">
                  <div
                    style={{ width: `${currentData.automation.rate}%` }}
                    className="h-full bg-zinc-200 transition-all duration-500"
                  />
                  <div
                    style={{ width: `${100 - currentData.automation.rate}%` }}
                    className="h-full bg-amber-400/80 transition-all duration-500"
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-400 mt-0.5">
                  <span>{currentData.automation.autonomous} autónomas</span>
                  <span className="text-zinc-400">{currentData.automation.hitl} HITL (&gt;$10k)</span>
                </div>
              </div>
            </div>

            {/* KPI 3: Ahorro en negociaciones */}
            <div className="relative rounded-xl border border-zinc-800/60 bg-[#121215] p-5 flex flex-col justify-between hover:border-zinc-700/60 transition-colors duration-150 shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-zinc-400">
                  Ahorro en negociaciones
                </span>
                <span className="flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-normal text-emerald-400">
                  <TrendingUp className="h-3 w-3" />
                  {currentData.savings.diff}
                </span>
              </div>

              <div className="my-2.5 flex items-baseline gap-2">
                <span className="text-3xl font-semibold tracking-tight text-zinc-100 tabular-nums">
                  {currentData.savings.amount}
                </span>
                <span className="text-xs text-zinc-500">descuento ponderado</span>
              </div>

              {/* Sparkline de Área Suave */}
              {density === 'expanded' ? (
                <div className="relative mt-2 h-12 w-full overflow-hidden">
                  <svg className="w-full h-full" viewBox="0 0 260 52" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="savingsGradClean" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.12} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <path
                      d={currentData.savings.bezierPath.area}
                      fill="url(#savingsGradClean)"
                    />
                    <path
                      d={currentData.savings.bezierPath.line}
                      fill="none"
                      stroke="#34d399"
                      strokeOpacity={0.75}
                      strokeWidth={1.5}
                      strokeLinecap="round"
                    />
                    <circle
                      cx={currentData.savings.bezierPath.lastX - 2}
                      cy={currentData.savings.bezierPath.lastY}
                      r={2.5}
                      fill="#34d399"
                    />
                  </svg>
                </div>
              ) : (
                <div className="flex items-center justify-between text-xs text-zinc-500 pt-2 border-t border-zinc-800/40">
                  <span>Optimización Grainger</span>
                  <span className="text-zinc-400">SLA 48h</span>
                </div>
              )}
            </div>

            {/* KPI 4: Inferencia Grok-4.6 */}
            <div className="relative rounded-xl border border-zinc-800/60 bg-[#121215] p-5 flex flex-col justify-between hover:border-zinc-700/60 transition-colors duration-150 shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-zinc-400">
                  Inferencia Grok-4.6
                </span>
                <span className="rounded-md bg-zinc-800 text-zinc-300 text-xs px-2 py-0.5">
                  {currentData.inference.unitCost}
                </span>
              </div>

              <div className="my-2.5 flex items-baseline gap-2">
                <span className="text-3xl font-semibold tracking-tight text-zinc-100 tabular-nums">
                  {currentData.inference.cost}
                </span>
                <span className="text-xs text-zinc-500">{currentData.inference.calls} llamadas</span>
              </div>

              {/* 4 Barras Verticales Discretas */}
              {density === 'expanded' ? (
                <div className="relative mt-2 flex items-end justify-between gap-2.5 h-12 pt-1">
                  {currentData.inference.bars.map((bar) => (
                    <div key={bar.day} className="flex-1 flex flex-col items-center gap-1.5 group">
                      <div
                        className={`w-full max-w-[28px] ${bar.heightClass} rounded-xs transition-colors duration-150 ${
                          bar.isPeak
                            ? 'bg-zinc-200 shadow-sm'
                            : 'bg-zinc-800 hover:bg-zinc-700'
                        }`}
                        title={`${bar.day}: ${bar.tokens}k tokens (~$${bar.cost})`}
                      />
                      <span className="text-[10px] text-zinc-500 font-normal">{bar.day}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-between text-xs text-zinc-500 pt-2 border-t border-zinc-800/40">
                  <span>Pico controlado</span>
                  <span className="text-zinc-400">&lt; $0.005 / orden</span>
                </div>
              )}
            </div>
          </div>

          {/* ────── MÓDULO INFERIOR: RENDIMIENTO Y SLA DE PROVEEDORES ────── */}
          <div className="rounded-xl border border-zinc-800/60 bg-[#121215] p-5 flex flex-col shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-medium text-zinc-100">
                  Rendimiento y SLA de proveedores
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Comparativa de cumplimiento de entregas, costo unitario y tasa de defectos
                </p>
              </div>

              {/* Control Segmentado Limpio */}
              <div className="flex items-center p-0.5 rounded-lg border border-zinc-800/60 bg-zinc-900 text-xs">
                <button
                  onClick={() => setProviderSort('score')}
                  className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                    providerSort === 'score'
                      ? 'bg-zinc-800 text-zinc-100 font-medium shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Puntaje
                </button>
                <button
                  onClick={() => setProviderSort('sla')}
                  className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                    providerSort === 'sla'
                      ? 'bg-zinc-800 text-zinc-100 font-medium shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  SLA (Horas)
                </button>
                <button
                  onClick={() => setProviderSort('cost')}
                  className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                    providerSort === 'cost'
                      ? 'bg-zinc-800 text-zinc-100 font-medium shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Costo unitario
                </button>
              </div>
            </div>

            {/* Lista con Layout Grid CSS de 3 Columnas [180px_1fr_60px] */}
            <div className="flex flex-col gap-2 my-1">
              {sortedProviders.map((prov, index) => {
                const widthPercent = Math.min(100, Math.max(10, prov.score));
                // Estética sobria: Grainger en esmeralda suave, los demás en grises decrecientes
                const barColor = prov.isBest
                  ? 'bg-emerald-400/90'
                  : index === 1
                  ? 'bg-zinc-400'
                  : index === 2
                  ? 'bg-zinc-500'
                  : 'bg-zinc-600';

                return (
                  <div
                    key={prov.name}
                    className="grid grid-cols-[180px_1fr_60px] items-center gap-4 py-2 px-2.5 rounded-lg hover:bg-zinc-900/30 transition-colors group"
                  >
                    {/* Columna 1: Nombre + Subetiqueta (sin colisionar jamás) */}
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-zinc-200 group-hover:text-zinc-100 transition-colors truncate">
                          {prov.name}
                        </span>
                        {prov.isBest && (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        )}
                      </div>
                      <span className="text-xs text-zinc-500 truncate mt-0.5">
                        SLA {prov.sla} • Costo {prov.unitCost}
                      </span>
                    </div>

                    {/* Columna 2: Barra Delgada sobre Riel */}
                    <div className="h-2 w-full rounded-full bg-zinc-800/70 overflow-hidden relative">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${widthPercent}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className={`h-full rounded-full ${barColor}`}
                      />
                    </div>

                    {/* Columna 3: Puntaje con Decimal Fijo y Tabular Nums */}
                    <div className="text-right">
                      <span className="text-xs font-medium text-zinc-200 tabular-nums">
                        {prov.score.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Eje X de Calibración Inferior en Columna Central */}
            <div className="grid grid-cols-[180px_1fr_60px] items-center gap-4 mt-2 pt-2 border-t border-zinc-800/40">
              <div />
              <div className="flex justify-between text-[10px] text-zinc-500 font-normal px-0.5">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
              <div />
            </div>

            {/* Footer de Proveedores */}
            <div className="mt-3 pt-3 border-t border-zinc-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>
                  Proveedor líder asignado: <strong className="text-zinc-200 font-medium">Grainger Industrial</strong> (SLA 48h • Calidad 99.9%)
                </span>
              </div>
              <span className="font-mono text-[11px] text-zinc-500">scoring.ts</span>
            </div>
          </div>
        </div>

        {/* ───────── COLUMNA DERECHA (~30%): PANEL VERTICAL UNIFICADO ───────── */}
        <div className="lg:col-span-4 flex flex-col h-full gap-5">

          {/* ────── TARJETA 1: SALUD DE ALMACENES ────── */}
          <div className="rounded-xl border border-zinc-800/60 bg-[#121215] p-5 flex flex-col shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="text-sm font-medium text-zinc-100">
                Salud de almacenes
              </h2>
              <span className="text-[11px] text-zinc-500">
                4 instalaciones
              </span>
            </div>

            {/* Grid 2x2 Interno Uniforme (Sin bordes de colores agresivos) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {WAREHOUSES.map((wh) => (
                <div
                  key={wh.id}
                  className="bg-zinc-900/40 border border-zinc-800/60 rounded-lg p-3 hover:border-zinc-700/60 transition-colors flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-zinc-200 truncate">{wh.name}</p>
                      <p className="text-xs text-zinc-500 truncate mt-0.5">{wh.bay}</p>
                    </div>
                    {/* Estado indicado ÚNICAMENTE con punto de 6px */}
                    <span
                      className={`h-1.5 w-1.5 rounded-full shrink-0 mt-1 ${
                        wh.status === 'critical'
                          ? 'bg-rose-400'
                          : wh.status === 'warning'
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                      }`}
                    />
                  </div>

                  <div className="mt-3 pt-2 border-t border-zinc-800/40 flex items-center justify-between text-xs text-zinc-300">
                    <span>{wh.temperature}</span>
                    <span className="text-zinc-400">{wh.capacityPercent}% cap.</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ────── TARJETA 2: MONITOR PROACTIVO (ANCLAJE INFERIOR CON FLEX-1 JUSTIFY-BETWEEN) ────── */}
          <div className="flex-1 flex flex-col justify-between rounded-xl border border-zinc-800/60 bg-[#121215] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
            <div>
              {/* Cabecera */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  <h2 className="text-sm font-medium text-zinc-100">
                    Monitor proactivo
                  </h2>
                </div>
                <span className="font-mono text-[11px] text-zinc-500">
                  proactiveMonitor.ts
                </span>
              </div>

              {/* Pestañas con Estilo Underline Minimalista */}
              <div className="flex items-center gap-5 border-b border-zinc-800/60 mb-3.5">
                <button
                  onClick={() => setActiveTab('alerts')}
                  className={`pb-2 text-xs cursor-pointer transition-colors ${
                    activeTab === 'alerts'
                      ? 'border-b-2 border-zinc-200 text-zinc-100 font-medium -mb-[1px]'
                      : 'text-zinc-400 hover:text-zinc-200 border-b-2 border-transparent'
                  }`}
                >
                  Alertas (2)
                </button>
                <button
                  onClick={() => setActiveTab('ok')}
                  className={`pb-2 text-xs cursor-pointer transition-colors ${
                    activeTab === 'ok'
                      ? 'border-b-2 border-zinc-200 text-zinc-100 font-medium -mb-[1px]'
                      : 'text-zinc-400 hover:text-zinc-200 border-b-2 border-transparent'
                  }`}
                >
                  OK (2)
                </button>
                <button
                  onClick={() => setActiveTab('cron')}
                  className={`pb-2 text-xs cursor-pointer transition-colors ${
                    activeTab === 'cron'
                      ? 'border-b-2 border-zinc-200 text-zinc-100 font-medium -mb-[1px]'
                      : 'text-zinc-400 hover:text-zinc-200 border-b-2 border-transparent'
                  }`}
                >
                  Cron
                </button>
              </div>

              {/* Lista de Ítems */}
              <div className="flex flex-col">
                {activeTab === 'alerts' && (
                  <div className="divide-y divide-zinc-800/50">
                    {ALERTS_DATA.map((item) => (
                      <div
                        key={item.sku}
                        className="py-3 flex items-start justify-between gap-3 first:pt-1 last:pb-1"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-zinc-200 truncate">{item.title}</p>
                          <p className="text-xs text-zinc-400 truncate mt-0.5">{item.warehouse}</p>
                        </div>

                        {/* Estado a la derecha con badge sutil y enlace discreto */}
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-md ${
                              item.severity === 'critical'
                                ? 'bg-rose-500/10 text-rose-400'
                                : 'bg-amber-500/10 text-amber-400'
                            }`}
                          >
                            {item.stockText}
                          </span>
                          <button
                            onClick={() => handleResolve(item.prompt)}
                            className="text-xs text-zinc-400 hover:text-zinc-100 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <span>Resolver</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'ok' && (
                  <div className="divide-y divide-zinc-800/50">
                    {HEALTHY_DATA.map((item) => (
                      <div
                        key={item.sku}
                        className="py-3 flex items-start justify-between gap-3 first:pt-1 last:pb-1"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            <p className="text-sm font-medium text-zinc-200 truncate">{item.title}</p>
                          </div>
                          <p className="text-xs text-zinc-400 truncate mt-0.5">{item.warehouse}</p>
                        </div>

                        <div className="shrink-0">
                          <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-0.5 rounded-md">
                            {item.stockText}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'cron' && (
                  <div className="divide-y divide-zinc-800/50">
                    {CRON_HISTORY.map((cron) => (
                      <div key={cron.id} className="py-2.5 flex flex-col gap-1 first:pt-1 last:pb-1 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-zinc-400" />
                            <span className="text-zinc-300 font-medium">{cron.id}</span>
                          </div>
                          <span className="text-zinc-500">{cron.timestamp}</span>
                        </div>
                        <p className="text-zinc-400 text-xs line-clamp-2">{cron.description}</p>
                        <span className="text-zinc-500 text-[11px]">Latencia: {cron.duration}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer del Monitor */}
            <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>CRON proactivo activo</span>
              </span>
              <span>Intervalo 60s</span>
            </div>
          </div>
        </div>
      </div>

      {/* ────────────────── D. BARRA DE ESTADO INFERIOR (FOOTER COMPACTO) ────────────────── */}
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-zinc-300 font-medium">PostgreSQL Pool Activo</span>
            <span className="text-zinc-500">(8/20 conn • 2.4 ms)</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 border-l border-zinc-800/60 pl-4">
            <ShieldCheck className="h-3.5 w-3.5 text-zinc-400" />
            <span>Regla HITL: <strong className="text-zinc-300 font-normal">&gt; $10,000 MXN</strong></span>
          </div>

          <div className="hidden md:flex items-center gap-2 border-l border-zinc-800/60 pl-4 font-mono text-[11px] text-zinc-500">
            <span>Drizzle ORM</span>
            <span>•</span>
            <span>0001_protect_case_events.sql</span>
          </div>
        </div>

        <button
          onClick={() => onNavigate?.('activity')}
          className="text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer flex items-center gap-1"
        >
          <span>Ver logs de auditoría</span>
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

    </div>
  );
};

export default DashboardView;
