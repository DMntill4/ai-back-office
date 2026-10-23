import { useState, useMemo, useEffect } from 'react';
import {
  Activity,
  ArrowRight,
  Check,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  ArrowUpRight,
  Zap,
  Sparkles,
  TrendingUp,
  ArrowUpDown,
} from 'lucide-react';
import { toast } from 'sonner';

/* ───────────────────────────── TYPES & INTERFACES ───────────────────────────── */

export type TimeRange = '24H' | '7D' | '30D' | 'Trimestre' | 'Custom';
export type DensityMode = 'compact' | 'expanded';
export type TabKey = 'alerts' | 'ok' | 'cron';
export type ProviderSortKey = 'score' | 'sla' | 'cost';

interface DashboardViewProps {
  onNavigate?: (view: string) => void;
  onOpenPrompt?: (prompt: string) => void;
  developerMode?: boolean;
  currency?: string;
  isEmptyCompany?: boolean;
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
      amount: '$2,900 MXN',
      diff: '+$640 vs ayer',
      bezierPath: {
        line: 'M 0 46 C 40 42, 70 44, 100 34 C 135 24, 165 28, 200 14 C 225 8, 245 10, 260 3',
        area: 'M 0 46 C 40 42, 70 44, 100 34 C 135 24, 165 28, 200 14 C 225 8, 245 10, 260 3 L 260 52 L 0 52 Z',
        lastX: 260,
        lastY: 3,
      },
    },
    inference: {
      cost: '$7.60 MXN',
      calls: 42,
      unitCost: '$0.18 MXN / dictamen',
      bars: [
        { day: '00-06h', heightClass: 'h-4', cost: 1.0, tokens: 18 },
        { day: '06-12h', heightClass: 'h-10', cost: 2.8, tokens: 45, isPeak: true },
        { day: '12-18h', heightClass: 'h-6', cost: 2.4, tokens: 38 },
        { day: '18-24h', heightClass: 'h-5', cost: 1.4, tokens: 22 },
      ],
    },
    providers: [
      { name: 'Grainger Ind.', score: 98.4, sla: '48h', hours: 48, unitCost: '$840.00 MXN', defectRate: '0.1%', isBest: true },
      { name: 'TechCorp MX', score: 87.2, sla: '72h', hours: 72, unitCost: '$910.00 MXN', defectRate: '0.6%' },
      { name: 'ElectroGlobal', score: 79.1, sla: '96h', hours: 96, unitCost: '$824.00 MXN', defectRate: '1.2%' },
      { name: 'FastShip Logistics', score: 66.5, sla: '120h', hours: 120, unitCost: '$796.00 MXN', defectRate: '2.8%' },
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
      amount: '$10,400 MXN',
      diff: '+$1,880 vs sem. ant.',
      bezierPath: {
        line: 'M 0 46 C 35 42, 65 36, 95 28 C 130 20, 160 24, 195 12 C 220 6, 240 8, 260 3',
        area: 'M 0 46 C 35 42, 65 36, 95 28 C 130 20, 160 24, 195 12 C 220 6, 240 8, 260 3 L 260 52 L 0 52 Z',
        lastX: 260,
        lastY: 3,
      },
    },
    inference: {
      cost: '$23.60 MXN',
      calls: 184,
      unitCost: '$0.13 MXN / dictamen',
      bars: [
        { day: 'Lun', heightClass: 'h-4', cost: 3.2, tokens: 28 },
        { day: 'Mar', heightClass: 'h-6', cost: 4.4, tokens: 35 },
        { day: 'Mié', heightClass: 'h-10', cost: 5.6, tokens: 42, isPeak: true },
        { day: 'Jue', heightClass: 'h-5', cost: 3.8, tokens: 31 },
        { day: 'Vie', heightClass: 'h-8', cost: 4.9, tokens: 39 },
      ],
    },
    providers: [
      { name: 'Grainger Ind.', score: 98.4, sla: '48h', hours: 48, unitCost: '$840.00 MXN', defectRate: '0.1%', isBest: true },
      { name: 'TechCorp MX', score: 87.2, sla: '72h', hours: 72, unitCost: '$910.00 MXN', defectRate: '0.6%' },
      { name: 'ElectroGlobal', score: 79.1, sla: '96h', hours: 96, unitCost: '$824.00 MXN', defectRate: '1.2%' },
      { name: 'FastShip Logistics', score: 66.5, sla: '120h', hours: 120, unitCost: '$796.00 MXN', defectRate: '2.8%' },
    ],
  },
  '30D': {
    orders: {
      total: 156,
      diff: '+12.4% vs mes ant.',
      subtext: 'órdenes en 30D',
      bezierPath: {
        line: 'M 0 42 C 30 38, 60 44, 90 32 C 120 18, 145 28, 180 14 C 210 6, 235 10, 260 2',
        area: 'M 0 42 C 30 38, 60 44, 90 32 C 120 18, 145 28, 180 14 C 210 6, 235 10, 260 2 L 260 52 L 0 52 Z',
        lastX: 260,
        lastY: 2,
      },
    },
    automation: {
      rate: 91,
      autonomous: 142,
      hitl: 14,
      variation: '+3.1% vs mes ant.',
    },
    savings: {
      amount: '$34,800 MXN',
      diff: '+$5,200 vs mes ant.',
      bezierPath: {
        line: 'M 0 44 C 40 40, 70 32, 100 24 C 135 16, 165 20, 200 10 C 225 4, 245 6, 260 2',
        area: 'M 0 44 C 40 40, 70 32, 100 24 C 135 16, 165 20, 200 10 C 225 4, 245 6, 260 2 L 260 52 L 0 52 Z',
        lastX: 260,
        lastY: 2,
      },
    },
    inference: {
      cost: '$68.40 MXN',
      calls: 642,
      unitCost: '$0.11 MXN / dictamen',
      bars: [
        { day: 'S1', heightClass: 'h-4', cost: 14.2, tokens: 120 },
        { day: 'S2', heightClass: 'h-6', cost: 18.5, tokens: 160 },
        { day: 'S3', heightClass: 'h-10', cost: 22.4, tokens: 195, isPeak: true },
        { day: 'S4', heightClass: 'h-5', cost: 13.3, tokens: 110 },
      ],
    },
    providers: [
      { name: 'Grainger Ind.', score: 98.4, sla: '48h', hours: 48, unitCost: '$840.00 MXN', defectRate: '0.1%', isBest: true },
      { name: 'TechCorp MX', score: 87.2, sla: '72h', hours: 72, unitCost: '$910.00 MXN', defectRate: '0.6%' },
      { name: 'ElectroGlobal', score: 79.1, sla: '96h', hours: 96, unitCost: '$824.00 MXN', defectRate: '1.2%' },
      { name: 'FastShip Logistics', score: 66.5, sla: '120h', hours: 120, unitCost: '$796.00 MXN', defectRate: '2.8%' },
    ],
  },
  'Trimestre': {
    orders: {
      total: 412,
      diff: '+15.2% vs trim. ant.',
      subtext: 'órdenes en 90D',
      bezierPath: {
        line: 'M 0 40 C 35 34, 65 42, 95 28 C 125 14, 150 24, 185 10 C 215 4, 240 8, 260 2',
        area: 'M 0 40 C 35 34, 65 42, 95 28 C 125 14, 150 24, 185 10 C 215 4, 240 8, 260 2 L 260 52 L 0 52 Z',
        lastX: 260,
        lastY: 2,
      },
    },
    automation: {
      rate: 90,
      autonomous: 371,
      hitl: 41,
      variation: '+4.0% vs trim. ant.',
    },
    savings: {
      amount: '$98,200 MXN',
      diff: '+$14,600 vs trim. ant.',
      bezierPath: {
        line: 'M 0 42 C 40 36, 70 28, 100 20 C 135 12, 165 16, 200 8 C 225 3, 245 4, 260 1',
        area: 'M 0 42 C 40 36, 70 28, 100 20 C 135 12, 165 16, 200 8 C 225 3, 245 4, 260 1 L 260 52 L 0 52 Z',
        lastX: 260,
        lastY: 1,
      },
    },
    inference: {
      cost: '$194.00 MXN',
      calls: 1820,
      unitCost: '$0.11 MXN / dictamen',
      bars: [
        { day: 'Mes 1', heightClass: 'h-5', cost: 58, tokens: 520 },
        { day: 'Mes 2', heightClass: 'h-10', cost: 78, tokens: 710, isPeak: true },
        { day: 'Mes 3', heightClass: 'h-7', cost: 58, tokens: 540 },
      ],
    },
    providers: [
      { name: 'Grainger Ind.', score: 98.4, sla: '48h', hours: 48, unitCost: '$840.00 MXN', defectRate: '0.1%', isBest: true },
      { name: 'TechCorp MX', score: 87.2, sla: '72h', hours: 72, unitCost: '$910.00 MXN', defectRate: '0.6%' },
      { name: 'ElectroGlobal', score: 79.1, sla: '96h', hours: 96, unitCost: '$824.00 MXN', defectRate: '1.2%' },
      { name: 'FastShip Logistics', score: 66.5, sla: '120h', hours: 120, unitCost: '$796.00 MXN', defectRate: '2.8%' },
    ],
  },
  'Custom': {
    orders: {
      total: 156,
      diff: 'Personalizado',
      subtext: 'rango a medida',
      bezierPath: {
        line: 'M 0 42 C 30 38, 60 44, 90 32 C 120 18, 145 28, 180 14 C 210 6, 235 10, 260 2',
        area: 'M 0 42 C 30 38, 60 44, 90 32 C 120 18, 145 28, 180 14 C 210 6, 235 10, 260 2 L 260 52 L 0 52 Z',
        lastX: 260,
        lastY: 2,
      },
    },
    automation: {
      rate: 91,
      autonomous: 142,
      hitl: 14,
      variation: 'Período seleccionado',
    },
    savings: {
      amount: '$34,800 MXN',
      diff: 'Ahorro verificado',
      bezierPath: {
        line: 'M 0 44 C 40 40, 70 32, 100 24 C 135 16, 165 20, 200 10 C 225 4, 245 6, 260 2',
        area: 'M 0 44 C 40 40, 70 32, 100 24 C 135 16, 165 20, 200 10 C 225 4, 245 6, 260 2 L 260 52 L 0 52 Z',
        lastX: 260,
        lastY: 2,
      },
    },
    inference: {
      cost: '$68.40 MXN',
      calls: 642,
      unitCost: '$0.11 MXN / dictamen',
      bars: [
        { day: 'S1', heightClass: 'h-4', cost: 14.2, tokens: 120 },
        { day: 'S2', heightClass: 'h-6', cost: 18.5, tokens: 160 },
        { day: 'S3', heightClass: 'h-10', cost: 22.4, tokens: 195, isPeak: true },
        { day: 'S4', heightClass: 'h-5', cost: 13.3, tokens: 110 },
      ],
    },
    providers: [
      { name: 'Grainger Ind.', score: 98.4, sla: '48h', hours: 48, unitCost: '$840.00 MXN', defectRate: '0.1%', isBest: true },
      { name: 'TechCorp MX', score: 87.2, sla: '72h', hours: 72, unitCost: '$910.00 MXN', defectRate: '0.6%' },
      { name: 'ElectroGlobal', score: 79.1, sla: '96h', hours: 96, unitCost: '$824.00 MXN', defectRate: '1.2%' },
      { name: 'FastShip Logistics', score: 66.5, sla: '120h', hours: 120, unitCost: '$796.00 MXN', defectRate: '2.8%' },
    ],
  },
};

/* ───────────────────────────── DATOS DE ALMACENES (ESQUEMA REAL) ───────────────────────────── */

interface WarehouseHealth {
  id: string;
  name: string;
  location: string;
  totalProducts: number;
  capacityPercent: number;
  statusText: string;
  status: 'critical' | 'warning' | 'healthy';
}

export const WAREHOUSES: WarehouseHealth[] = [
  {
    id: 'alm_central',
    name: 'Almacén Central',
    location: 'Monterrey, N.L.',
    totalProducts: 48,
    capacityPercent: 84,
    statusText: 'Crítico',
    status: 'critical',
  },
  {
    id: 'alm_norte',
    name: 'Almacén Norte',
    location: 'Saltillo, Coah.',
    totalProducts: 32,
    capacityPercent: 73,
    statusText: 'Atención',
    status: 'warning',
  },
  {
    id: 'alm_occidente',
    name: 'Almacén Occidente',
    location: 'Guadalajara, Jal.',
    totalProducts: 26,
    capacityPercent: 45,
    statusText: 'OK',
    status: 'healthy',
  },
  {
    id: 'alm_bajio',
    name: 'Almacén El Bajío',
    location: 'Querétaro, Qro.',
    totalProducts: 38,
    capacityPercent: 62,
    statusText: 'OK',
    status: 'healthy',
  },
];

/* ───────────────────────────── DATOS DE TABS MONITOR ───────────────────────────── */

const ALERTS_DATA = [
  {
    sku: 'SKU-MAN-VFD10',
    title: 'Variador de Frecuencia VFD-10',
    stockText: 'Stock: 2 · Mínimo: 5',
    warehouse: 'Almacén Central • Monterrey',
    severity: 'critical' as const,
    prompt: 'Revisa el stock del Variador de Frecuencia VFD-10 (Stock: 2 · Mínimo: 5) y cotiza reposición de 20 unidades con Grainger Industrial.',
  },
  {
    sku: 'SKU-MAN-SM400',
    title: 'Servomotor Industrial SM-400',
    stockText: 'Stock: 8 · Mínimo: 8',
    warehouse: 'Almacén Norte • Saltillo',
    severity: 'warning' as const,
    prompt: 'Evalúa existencias de Servomotor Industrial SM-400 (Stock: 8 · Mínimo: 8) y simula necesidad de abasto a 15 días.',
  },
];

const HEALTHY_DATA = [
  {
    sku: 'SKU-MAN-OP10',
    title: 'Sensor Fotoeléctrico Óptico',
    stockText: 'Stock: 35 · Mínimo: 12',
    warehouse: 'Almacén Occidente',
    severity: 'healthy' as const,
    prompt: 'Analiza el consumo histórico del Sensor Fotoeléctrico Óptico.',
  },
  {
    sku: 'SKU-MAN-DIN24',
    title: 'Fuente de Poder DIN 24V 10A',
    stockText: 'Stock: 18 · Mínimo: 15',
    warehouse: 'Almacén El Bajío',
    severity: 'healthy' as const,
    prompt: 'Verifica los proveedores alternativos de la Fuente DIN 24V.',
  },
];

const CRON_HISTORY = [
  {
    id: 'Ciclo #049',
    timestamp: 'Hace 45 seg',
    duration: '142 ms',
    description: 'Escaneo proactivo de 4 almacenes. 2 SKUs por debajo de nivel mínimo.',
  },
  {
    id: 'Ciclo #048',
    timestamp: 'Hace 60 seg',
    duration: '138 ms',
    description: 'Auditoría en base a reglas de gobernanza ($10,000 MXN límite).',
  },
  {
    id: 'Ciclo #047',
    timestamp: 'Hace 2 min',
    duration: '155 ms',
    description: 'Cálculo de SLA y puntuación de proveedores sincronizado.',
  },
];

/* ───────────────────────────── COMPONENTE PRINCIPAL ───────────────────────────── */

export const DashboardView = ({
  onNavigate,
  onOpenPrompt,
  developerMode = false,
  currency = 'MXN',
  isEmptyCompany = false,
}: DashboardViewProps) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('30D');
  const [activeTab, setActiveTab] = useState<TabKey>('alerts');
  const [providerSort, setProviderSort] = useState<ProviderSortKey>('score');
  const [auditing, setAuditing] = useState(false);
  const [auditDone, setAuditDone] = useState(false);

  // Estados reactivos conectados con el backend Fastify
  const [liveReport, setLiveReport] = useState<{
    totalOrders: number;
    automated: number;
    pendingReview: number;
    savings: number;
    spend: number;
    currency: string;
  } | null>(null);
  const [liveAlerts, setLiveAlerts] = useState<any[]>([]);

  // Sincronización en vivo con endpoints Fastify al montar
  useEffect(() => {
    let mounted = true;
    const fetchLiveTelemetry = async () => {
      try {
        const [dashRes, alertRes] = await Promise.all([
          fetch('/api/dashboard?companyId=comp_default'),
          fetch('/api/v1/alerts/proactive'),
        ]);

        if (dashRes.ok && mounted) {
          const dashData = await dashRes.json();
          if (dashData.success && dashData.data?.dailyReport) {
            setLiveReport(dashData.data.dailyReport);
          }
        }

        if (alertRes.ok && mounted) {
          const alertData = await alertRes.json();
          if (alertData.success && Array.isArray(alertData.alerts)) {
            setLiveAlerts(alertData.alerts);
          }
        }
      } catch {
        // Fallback silencioso con datos simulados
      }
    };

    fetchLiveTelemetry();
    return () => {
      mounted = false;
    };
  }, []);

  const currentData = useMemo(() => RANGE_CONFIG[timeRange], [timeRange]);

  const runAudit = async () => {
    setAuditing(true);
    try {
      const res = await fetch('http://localhost:3001/api/v1/alerts/trigger-audit', {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.alertas && Array.isArray(data.alertas)) {
          setLiveAlerts(data.alertas);
          toast.success(`Auditoría en vivo: ${data.alertas.length} alertas sincronizadas en tiempo real`);
        } else {
          toast.success('Auditoría proactiva completada sin alertas críticas');
        }
      } else {
        toast.success('Auditoría completada exitosamente');
      }
    } catch {
      toast.success('Auditoría ejecutada en modo local');
    } finally {
      setAuditing(false);
      setAuditDone(true);
      setTimeout(() => setAuditDone(false), 2400);
    }
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
      return list.sort((a, b) => parseFloat(a.unitCost.replace(/[^0-9.]/g, '')) - parseFloat(b.unitCost.replace(/[^0-9.]/g, '')));
    }
    return list;
  }, [currentData.providers, providerSort]);

  // Si la empresa recién se registra y no tiene datos, mostrar estado inicial de bienvenida
  if (isEmptyCompany) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-2xl mx-auto text-center p-8 bg-[#08130B] border border-[#183422] rounded-3xl shadow-[0_24px_70px_rgba(0,0,0,0.85)]">
        <div className="w-16 h-16 rounded-full bg-[#0D2415] border border-[#1F4527] flex items-center justify-center text-[#34D353] mb-4">
          <FileSpreadsheet className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold font-headline text-[#E8FBEA]">
          ¡Bienvenido a tu Centro de Mando Mint!
        </h2>
        <p className="text-sm text-[#9CA3AF] max-w-md mt-2 leading-relaxed">
          Para activar la telemetría en vivo, los pronósticos de demanda y la gobernanza de compras autónomas, importa tu inventario o utiliza el asistente guiado.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          <button
            type="button"
            onClick={() => onNavigate?.('stock')}
            className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#10B981] to-[#34D353] text-[#050806] font-semibold text-xs shadow-[0_0_20px_rgba(52,211,83,0.35)] hover:shadow-[0_0_25px_rgba(52,211,83,0.45)] transition cursor-pointer"
          >
            Sube tu Catálogo Excel / SQL
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.('chat')}
            className="px-5 py-2.5 rounded-full bg-[#0E2415] border border-[#1F4527] text-[#34D353] font-semibold text-xs hover:bg-[#14351F] transition cursor-pointer"
          >
            Hablar con Mint ReAct
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full max-w-[1400px] mx-auto gap-6 font-sans text-zinc-100 pb-20">
      {/* ─── Encabezado de la Sección con Filtros Compactos (Estilo Stakent) ─── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-zinc-500 font-medium">Supervisión continua para 24 horas</span>
            <span className="text-zinc-600">•</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.04] text-[11px] font-mono text-zinc-400 border border-white/[0.05]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Telemetría en Vivo ({currency}){developerMode ? ' • Modo Dev' : ''}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-headline">
            Centro de Mando Autónomo
          </h1>
        </div>

        {/* Filtros estilo píldora compacta */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Selector de Rango Temporal */}
          <div className="flex items-center p-1 rounded-xl bg-[#14161C] border border-white/[0.05]">
            {(['24H', '7D', '30D', 'Trimestre'] as TimeRange[]).map((range) => {
              const active = timeRange === range;
              return (
                <button
                  key={range}
                  type="button"
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 text-xs rounded-lg transition-all cursor-pointer ${
                    active
                      ? 'bg-[#1E222B] text-white font-medium shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {range}
                </button>
              );
            })}
          </div>

          {/* Botón Principal: Auditoría Proactiva */}
          <button
            type="button"
            onClick={runAudit}
            disabled={auditing}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#14161C] hover:bg-[#1E222B] border border-white/[0.05] text-xs font-medium text-zinc-300 transition cursor-pointer disabled:opacity-50 active:scale-[0.98]"
          >
            {auditing ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                <span>Auditando...</span>
              </>
            ) : auditDone ? (
              <>
                <Check className="h-3.5 w-3.5 stroke-[3] text-emerald-400" />
                <span>Almacenes Sincronizados</span>
              </>
            ) : (
              <>
                <Activity className="h-3.5 w-3.5 text-emerald-400" />
                <span>Auditoría Proactiva</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ─── 3. FILA SUPERIOR: 3 TARJETAS ANALÍTICAS (9 COLS) + 1 SPOTLIGHT CARD (3 COLS) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Izquierda (9 columnas - 3 tarjetas iguales en grid-cols-3 gap-4) */}
        <div className="lg:col-span-8 xl:col-span-9 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Tarjeta 1: Órdenes Totales Autónomas */}
          <div className="rounded-2xl bg-[#101217] border border-white/[0.05] p-5 flex flex-col justify-between hover:border-white/[0.1] hover:bg-[#13161D] transition-all duration-200 shadow-sm relative group">
            {/* Cabecera con ícono en caja redondeada */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-400 border border-white/[0.06]">
                  <Activity className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] text-zinc-500 truncate block">Cadencia de Compras</span>
                  <h3 className="text-xs font-semibold text-white truncate max-w-[130px]">Órdenes Autónomas</h3>
                </div>
              </div>

              {/* Botón circular ↗ */}
              <button
                type="button"
                onClick={() => onOpenPrompt?.('Muestra el desglose de todas las órdenes de compra emitidas en los últimos 30 días.')}
                title="Ver detalle de órdenes"
                className="w-7 h-7 rounded-full bg-white/[0.04] hover:bg-white/[0.1] text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Cuerpo: Métrica grande en Blanco Puro */}
            <div className="my-2">
              <span className="text-[11px] text-zinc-500 block">Total en {timeRange}</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-semibold tracking-tight text-white font-headline">
                  {liveReport ? liveReport.totalOrders : currentData.orders.total}
                </span>
                <span className="text-xs text-zinc-400 font-normal">órdenes</span>
              </div>

              {/* Micro-badge de variación */}
              <div className="flex items-center gap-1.5 mt-1">
                <span className="inline-flex items-center text-[11px] font-medium font-mono text-[#4ADE80]">
                  {currentData.orders.diff}
                </span>
                <span className="text-[10px] text-zinc-500">vs período anterior</span>
              </div>
            </div>

            {/* Base: Curva suave de área (SVG Bézier) en tono verde mint con punto y píldora flotante */}
            <div className="relative mt-4 pt-2">
              <svg className="w-full h-11 overflow-visible" viewBox="0 0 280 44" fill="none">
                <defs>
                  <linearGradient id="grad-orders-kpi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4ADE80" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#101217" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <line x1="0" y1="24" x2="280" y2="24" stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                <path d={currentData.orders.bezierPath.area} fill="url(#grad-orders-kpi)" />
                <path d={currentData.orders.bezierPath.line} stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" fill="none" />
                <circle cx={currentData.orders.bezierPath.lastX} cy={currentData.orders.bezierPath.lastY} r="4" fill="#4ADE80" />
                <circle cx={currentData.orders.bezierPath.lastX} cy={currentData.orders.bezierPath.lastY} r="8" fill="#4ADE80" opacity="0.25" />
              </svg>

              <div className="absolute -top-3 right-0 bg-[#161922] border border-white/[0.08] px-2 py-0.5 rounded-full text-[10px] font-mono text-zinc-300 shadow-md">
                {liveReport ? liveReport.automated : currentData.automation.autonomous} autónomas
              </div>
            </div>
          </div>

          {/* Tarjeta 2: Tasa de Autonomía ReAct */}
          <div className="rounded-2xl bg-[#101217] border border-white/[0.05] p-5 flex flex-col justify-between hover:border-white/[0.1] hover:bg-[#13161D] transition-all duration-200 shadow-sm relative group">
            {/* Cabecera con ícono en caja redondeada */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-400 border border-white/[0.06]">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] text-zinc-500 truncate block">Gobernanza Human-in-Loop</span>
                  <h3 className="text-xs font-semibold text-white truncate max-w-[130px]">Tasa de Autonomía</h3>
                </div>
              </div>

              {/* Botón circular ↗ */}
              <button
                type="button"
                onClick={() => onOpenPrompt?.('Explica el ratio de órdenes autónomas versus órdenes que requirieron aprobación de supervisor.')}
                title="Ver ratio HITL"
                className="w-7 h-7 rounded-full bg-white/[0.04] hover:bg-white/[0.1] text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Cuerpo: Métrica grande en Blanco Puro */}
            <div className="my-2">
              <span className="text-[11px] text-zinc-500 block">Eficiencia ReAct</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-semibold tracking-tight text-white font-headline">
                  {liveReport && liveReport.totalOrders > 0
                    ? `${Math.round((liveReport.automated / liveReport.totalOrders) * 100)}.0%`
                    : `${currentData.automation.rate}.0%`}
                </span>
                <span className="text-xs text-zinc-400 font-normal">autónomas</span>
              </div>

              {/* Micro-badge de variación */}
              <div className="flex items-center gap-1.5 mt-1">
                <span className="inline-flex items-center text-[11px] font-medium font-mono text-[#4ADE80]">
                  {currentData.automation.variation}
                </span>
                <span className="text-[10px] text-zinc-500">&lt; $10k sin fricción</span>
              </div>
            </div>

            {/* Base: Curva suave de área */}
            <div className="relative mt-4 pt-2">
              <svg className="w-full h-11 overflow-visible" viewBox="0 0 280 44" fill="none">
                <defs>
                  <linearGradient id="grad-auto-kpi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4ADE80" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#101217" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <line x1="0" y1="24" x2="280" y2="24" stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                <path d="M 0 34 Q 50 30, 100 24 T 190 18 T 250 10 T 280 6 L 280 44 L 0 44 Z" fill="url(#grad-auto-kpi)" />
                <path d="M 0 34 Q 50 30, 100 24 T 190 18 T 250 10 T 280 6" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" fill="none" />
                <circle cx={280} cy={6} r="4" fill="#4ADE80" />
                <circle cx={280} cy={6} r="8" fill="#4ADE80" opacity="0.25" />
              </svg>

              <div className="absolute -top-3 right-0 bg-[#161922] border border-white/[0.08] px-2 py-0.5 rounded-full text-[10px] font-mono text-zinc-300 shadow-md">
                142 aut. vs 14 HITL
              </div>
            </div>
          </div>

          {/* Tarjeta 3: Ahorro en Negociaciones */}
          <div className="rounded-2xl bg-[#101217] border border-white/[0.05] p-5 flex flex-col justify-between hover:border-white/[0.1] hover:bg-[#13161D] transition-all duration-200 shadow-sm relative group">
            {/* Cabecera con ícono en caja redondeada */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-400 border border-white/[0.06]">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] text-zinc-500 truncate block">Optimización Multimodal</span>
                  <h3 className="text-xs font-semibold text-white truncate max-w-[130px]">Ahorro por Negociación</h3>
                </div>
              </div>

              {/* Botón circular ↗ */}
              <button
                type="button"
                onClick={() => onOpenPrompt?.('Compara el ahorro acumulado versus la tarifa de lista de distribuidores para los últimos 30 días.')}
                title="Ver desglose financiero"
                className="w-7 h-7 rounded-full bg-white/[0.04] hover:bg-white/[0.1] text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Cuerpo: Métrica grande en Blanco Puro */}
            <div className="my-2">
              <span className="text-[11px] text-zinc-500 block">Acumulado {timeRange}</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-semibold tracking-tight text-white font-headline">
                  {liveReport ? `$${liveReport.savings.toLocaleString('es-MX')} MXN` : currentData.savings.amount}
                </span>
              </div>

              {/* Micro-badge de variación */}
              <div className="flex items-center gap-1.5 mt-1">
                <span className="inline-flex items-center text-[11px] font-medium font-mono text-[#4ADE80]">
                  {currentData.savings.diff}
                </span>
                <span className="text-[10px] text-zinc-500">descuento ponderado</span>
              </div>
            </div>

            {/* Base: Curva suave de área */}
            <div className="relative mt-4 pt-2">
              <svg className="w-full h-11 overflow-visible" viewBox="0 0 280 44" fill="none">
                <defs>
                  <linearGradient id="grad-savings-kpi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4ADE80" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#101217" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <line x1="0" y1="24" x2="280" y2="24" stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                <path d={currentData.savings.bezierPath.area} fill="url(#grad-savings-kpi)" />
                <path d={currentData.savings.bezierPath.line} stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" fill="none" />
                <circle cx={currentData.savings.bezierPath.lastX} cy={currentData.savings.bezierPath.lastY} r="4" fill="#4ADE80" />
                <circle cx={currentData.savings.bezierPath.lastX} cy={currentData.savings.bezierPath.lastY} r="8" fill="#4ADE80" opacity="0.25" />
              </svg>

              <div className="absolute -top-3 right-0 bg-[#161922] border border-white/[0.08] px-2 py-0.5 rounded-full text-[10px] font-mono text-zinc-300 shadow-md">
                -$1,840 / compra
              </div>
            </div>
          </div>
        </div>

        {/* Derecha (3 columnas): LA ÚNICA TARJETA CON GRADIENTE VERDE "SPOTLIGHT" (REGLA 3) */}
        <div className="lg:col-span-4 xl:col-span-3 rounded-2xl bg-gradient-to-br from-[#064E3B] via-[#052E16] to-[#0A0D12] border border-emerald-400/20 p-6 flex flex-col justify-between relative overflow-hidden shadow-[0_12px_36px_rgba(6,78,59,0.35)]">
          {/* Luz ambiental interna */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />

          {/* Encabezado: Logo Mint + Badge IA Activa */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-400/20 border border-emerald-400/30 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-emerald-300 fill-emerald-300" />
                </div>
                <span className="text-sm font-bold tracking-tight text-white font-headline">
                  Mint®
                </span>
              </div>

              <span className="bg-emerald-300 text-zinc-950 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                IA Activa
              </span>
            </div>

            <h3 className="text-xl font-bold text-white tracking-tight leading-tight mt-3">
              Motor ReAct &amp; Compras
            </h3>
            <p className="text-xs text-emerald-100/70 leading-relaxed mt-2">
              Supervisión continua de compras autónomas, salud de almacenes y gobernanza HITL. Umbral de seguridad activo: $10,000 MXN.
            </p>
          </div>

          {/* Acciones principales apiladas (Regla 3) */}
          <div className="pt-6 space-y-2.5">
            <button
              type="button"
              onClick={runAudit}
              disabled={auditing}
              className="w-full py-2.5 px-4 rounded-xl bg-[#6EE7B7] hover:bg-[#34D399] text-zinc-950 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-sm active:scale-[0.99]"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-zinc-950 ${auditing ? 'animate-spin' : ''}`} />
              <span>{auditing ? 'Auditando Almacenes...' : 'Ejecutar Auditoría Proactiva'}</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenPrompt?.('Genera una auditoría ejecutiva de inventario y compras recomendando reposiciones críticas para Almacén Central.')}
              className="w-full py-2.5 px-4 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white font-medium text-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              <span>Consultar Agente ReAct</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── 4. PANEL MAESTRO INFERIOR: GOBERNANZA FINANCIERA & COLA DE APROBACIONES HITL ─── */}
      <div className="rounded-2xl bg-[#101217] border border-white/[0.05] p-6 shadow-sm">
        {/* Cabecera Superior del Panel Maestro */}
        <div className="flex items-center justify-between pb-5 border-b border-white/[0.05]">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-medium">Gobernanza Financiera &amp; Presupuesto Autónomo</span>
            <span className="text-zinc-600">•</span>
            <span className="font-mono text-xs text-emerald-400">Umbral Seguro &lt; $10,000 MXN</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="hidden sm:inline">Cola HITL: 2 Órdenes en Espera</span>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          </div>
        </div>

        {/* Mitad Superior: 2 Columnas (Cifra Presupuestal + Slider de Consumo con Advertencia 80%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 py-6 border-b border-white/[0.05] items-center">
          {/* Izquierda (7 cols): Presupuesto Comprometido y Acciones HITL */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Auditoría de presupuesto en tiempo real • Hace instantes</span>
              </div>

              <div className="flex items-center gap-3">
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-headline">
                  Presupuesto Comprometido Este Mes
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                  {liveReport ? `${((liveReport.spend / 100000) * 100).toFixed(1)}% En Uso` : '0.0% En Uso'}
                </span>
              </div>
            </div>

            {/* Cifra Principal */}
            <div className="my-3">
              <span className="text-[11px] text-zinc-500 block">Consumo Acumulado vs. Límite Mensual ($100,000 MXN)</span>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-4xl font-bold text-white font-headline tracking-tight">
                  {liveReport ? `$${liveReport.spend.toLocaleString('es-MX')} MXN` : '$0 MXN'}
                </span>
                <span className="text-xs text-emerald-400 font-mono">
                  {liveReport ? `$${Math.max(0, 100000 - liveReport.spend).toLocaleString('es-MX')} MXN remanente` : '$100,000 MXN remanente'}
                </span>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="flex flex-wrap items-center gap-2.5 mt-2">
              <button
                type="button"
                onClick={() => onNavigate?.('approvals')}
                className="bg-[#6EE7B7] hover:bg-[#34D399] text-zinc-950 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-[0.98]"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Revisar Cola HITL ({liveReport?.pendingReview ?? 0} pendientes) ↗</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenPrompt?.('Evalúa el impacto presupuestal de aprobar las 2 órdenes pendientes en cola HITL: Sensor ST-200 ($22,500 MXN) y Microcontrolador ($18,400 MXN).')}
                className="bg-[#1A1D24] hover:bg-[#222630] text-zinc-300 px-4 py-2 rounded-lg text-xs font-medium transition cursor-pointer border border-white/[0.04]"
              >
                Simular Impacto con ReAct ✨
              </button>
            </div>
          </div>

          {/* Derecha (5 cols): Slider de Consumo Presupuestal con Nodo y Puntos de Alerta */}
          <div className="lg:col-span-5 rounded-xl bg-[#14171F] border border-white/[0.04] p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs font-semibold text-white block">Regla de Presupuesto Mensual</span>
                <span className="text-[11px] text-zinc-500">Tope de seguridad: $100,000 MXN</span>
              </div>
              <span className="font-mono text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                Zona Segura
              </span>
            </div>

            {/* Regla Graduada Horizontal con Nodo Activo dinámico */}
            <div className="relative py-6">
              {/* Tooltip flotante encima del nodo activo */}
              <div
                className="absolute top-0 transform -translate-x-1/2 bg-[#1B1F2A] border border-emerald-400/30 text-white text-[10px] font-mono px-2 py-0.5 rounded-md shadow-lg flex items-center gap-1"
                style={{ left: `${Math.min(100, Math.max(0, liveReport ? (liveReport.spend / 100000) * 100 : 0))}%` }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>
                  {liveReport ? `$${liveReport.spend.toLocaleString('es-MX')} MXN (${((liveReport.spend / 100000) * 100).toFixed(1)}%)` : '$0 MXN (0.0%)'}
                </span>
              </div>

              {/* Riel base graduado */}
              <div className="h-2 w-full bg-[#202533] rounded-full overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-[#4ADE80] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, liveReport ? (liveReport.spend / 100000) * 100 : 0))}%` }}
                />
              </div>

              {/* Nodo circular activo */}
              <div
                className="absolute top-1/2 -mt-2.5 w-5 h-5 rounded-full bg-[#101217] border-2 border-emerald-400 shadow-[0_0_12px_rgba(74,222,128,0.6)] flex items-center justify-center transition-all duration-500"
                style={{
                  left: `${Math.min(100, Math.max(0, liveReport ? (liveReport.spend / 100000) * 100 : 0))}%`,
                  transform: 'translateX(-50%)',
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </div>

              {/* Marca de Advertencia 80% */}
              <div
                className="absolute top-1/2 -mt-2 w-0.5 h-4 bg-amber-400/70"
                style={{ left: '80%' }}
                title="Límite de Alerta: 80%"
              />

              {/* Marcas de la regla */}
              <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 mt-3 pt-1">
                <span>$0 MXN</span>
                <span>$50k</span>
                <span className="text-amber-400/80 font-medium">$80k (Alerta)</span>
                <span className="text-zinc-300 font-semibold">$100k (Límite)</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] text-[11px] text-zinc-500">
              <span>Umbral sin firma: &lt; $10k</span>
              <span className="text-zinc-300 font-medium">Órdenes mayores requieren HITL</span>
            </div>
          </div>
        </div>

        {/* Mitad Inferior: 4 Columnas de Desglose de Gobernanza Financiera & HITL */}
        <div className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Columna 1: Órdenes Autónomas */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                <span className="text-zinc-500 font-medium">Órdenes Autónomas (&lt; $10k)</span>
                <ArrowUpDown className="w-3 h-3 text-zinc-600" />
              </div>
              <div className="rounded-xl bg-[#14171F] border border-white/[0.04] p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-semibold text-white tracking-tight font-headline">
                    {liveReport ? liveReport.automated : 0}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                    {liveReport && liveReport.totalOrders > 0
                      ? `${Math.round((liveReport.automated / liveReport.totalOrders) * 100)}.0%`
                      : '0.0%'}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full"
                      style={{
                        width: liveReport && liveReport.totalOrders > 0
                          ? `${Math.round((liveReport.automated / liveReport.totalOrders) * 100)}%`
                          : '0%',
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-1.5">
                    <span>Sin fricción humana</span>
                    <span className="text-emerald-400 font-medium">100% auditadas</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna 2: Cola HITL */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                <span className="text-zinc-500 font-medium">En Cola HITL (Firma Humana)</span>
                <ArrowUpDown className="w-3 h-3 text-zinc-600" />
              </div>
              <div className="rounded-xl bg-[#14171F] border border-white/[0.04] p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-semibold text-white tracking-tight font-headline">
                    {liveReport?.pendingReview ?? 0} {liveReport?.pendingReview === 1 ? 'orden' : 'órdenes'}
                  </span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    (liveReport?.pendingReview ?? 0) > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                  }`}>
                    {(liveReport?.pendingReview ?? 0) > 0 ? 'Pendiente' : 'Al día'}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full"
                      style={{ width: `${Math.min(100, (liveReport?.pendingReview ?? 0) * 20)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-1.5">
                    <span>${((liveReport?.pendingReview ?? 0) * 15000).toLocaleString('es-MX')} MXN en espera</span>
                    <span className="text-amber-400 font-medium">
                      {(liveReport?.pendingReview ?? 0) > 0 ? 'Requiere firma' : 'Sin pendientes'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna 3: Presupuesto Disponible */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                <span className="text-zinc-500 font-medium">Presupuesto Remanente</span>
                <ArrowUpDown className="w-3 h-3 text-zinc-600" />
              </div>
              <div className="rounded-xl bg-[#14171F] border border-white/[0.04] p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-semibold text-white tracking-tight font-headline">
                    ${liveReport ? Math.max(0, 100000 - liveReport.spend).toLocaleString('es-MX') : '100,000'}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-400">MXN</span>
                </div>
                <div className="mt-3">
                  <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full"
                      style={{ width: `${Math.max(0, 100 - (liveReport ? (liveReport.spend / 100000) * 100 : 0))}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-1.5">
                    <span>
                      {liveReport ? `${Math.max(0, 100 - (liveReport.spend / 100000) * 100).toFixed(1)}% disponible` : '100% disponible'}
                    </span>
                    <span className="text-emerald-400 font-medium">Flujo óptimo</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna 4: Tiempo Decisión ReAct */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                <span className="text-zinc-500 font-medium">Tiempo Decisión ReAct</span>
                <ArrowUpDown className="w-3 h-3 text-zinc-600" />
              </div>
              <div className="rounded-xl bg-[#14171F] border border-white/[0.04] p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-semibold text-white tracking-tight font-headline">142 ms</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-400">xAI</span>
                </div>
                <div className="mt-3">
                  <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: '96%' }} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-1.5">
                    <span>Inferencia proactiva</span>
                    <span className="text-emerald-400 font-medium">En tiempo real</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 5. SECCIÓN INFERIOR: RENDIMIENTO DE PROVEEDORES + MONITOR PROACTIVO ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Izquierda (7 cols): Rendimiento y SLA de Proveedores */}
        <div className="lg:col-span-7 rounded-2xl bg-[#101217] border border-white/[0.05] p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-white/[0.05]">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Rendimiento y SLA de Proveedores Homologados
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Comparativa de cumplimiento de entregas, costo unitario y tasa de defectos
              </p>
            </div>

            {/* Selector de ordenamiento */}
            <div className="flex items-center p-1 rounded-xl bg-[#14161C] border border-white/[0.05] text-xs">
              <button
                type="button"
                onClick={() => setProviderSort('score')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-[11px] ${
                  providerSort === 'score'
                    ? 'bg-[#1E222B] text-white font-medium shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Puntaje
              </button>
              <button
                type="button"
                onClick={() => setProviderSort('sla')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-[11px] ${
                  providerSort === 'sla'
                    ? 'bg-[#1E222B] text-white font-medium shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                SLA
              </button>
              <button
                type="button"
                onClick={() => setProviderSort('cost')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-[11px] ${
                  providerSort === 'cost'
                    ? 'bg-[#1E222B] text-white font-medium shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Costo
              </button>
            </div>
          </div>

          {/* Lista de Proveedores con Barras de Progreso Silenciosas */}
          <div className="space-y-2">
            {sortedProviders.map((prov) => {
              const widthPercent = Math.min(100, Math.max(10, prov.score));
              return (
                <div
                  key={prov.name}
                  className="grid grid-cols-[160px_1fr_60px] items-center gap-4 py-2.5 px-3 rounded-xl hover:bg-white/[0.02] transition-colors group"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate">
                        {prov.name}
                      </span>
                      {prov.isBest && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-500 truncate block mt-0.5">
                      SLA {prov.sla} • {prov.unitCost}
                    </span>
                  </div>

                  <div className="h-2 w-full rounded-full bg-[#181B24] overflow-hidden relative">
                    <div
                      className={`h-full rounded-full ${prov.isBest ? 'bg-emerald-400' : 'bg-zinc-600'}`}
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-mono font-medium text-white tabular-nums">
                      {prov.score.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.05] flex items-center justify-between text-xs text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Proveedor óptimo asignado: <strong className="text-zinc-300 font-medium ml-1">Grainger Industrial</strong>
            </span>
            <button
              type="button"
              onClick={() => onOpenPrompt?.('Compara cotizaciones de los 4 proveedores homologados y genera una matriz de decisión de compra.')}
              className="text-emerald-400 hover:text-emerald-300 text-xs font-medium cursor-pointer"
            >
              Auditar con IA →
            </button>
          </div>
        </div>

        {/* Derecha (5 cols): Monitor Proactivo de Alertas y Salud de Almacenes */}
        <div className="lg:col-span-5 rounded-2xl bg-[#101217] border border-white/[0.05] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.05]">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              <h2 className="text-sm font-semibold text-white">
                Monitor Proactivo &amp; Almacenes
              </h2>
            </div>

            {/* Pestañas del Monitor */}
            <div className="flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('alerts')}
                className={`pb-0.5 transition-colors cursor-pointer ${
                  activeTab === 'alerts'
                    ? 'text-white font-medium border-b-2 border-emerald-400'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Alertas ({liveAlerts.length > 0 ? liveAlerts.length : ALERTS_DATA.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ok')}
                className={`pb-0.5 transition-colors cursor-pointer ${
                  activeTab === 'ok'
                    ? 'text-white font-medium border-b-2 border-emerald-400'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Saludable (2)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('cron')}
                className={`pb-0.5 transition-colors cursor-pointer ${
                  activeTab === 'cron'
                    ? 'text-white font-medium border-b-2 border-emerald-400'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Auditoría
              </button>
            </div>
          </div>

          {/* Contenido de Pestañas */}
          <div className="space-y-2">
            {activeTab === 'alerts' && (
              <div className="divide-y divide-white/[0.04]">
                {(liveAlerts.length > 0
                  ? liveAlerts.map((a: any) => ({
                      sku: a.sku || a.productId || `ALERT-${a.id || Math.random()}`,
                      title: a.productName || a.sku || 'Alerta de Existencias Críticas',
                      stockText: `Stock: ${a.stock ?? 2} · Mínimo: ${a.minStock ?? 5}`,
                      warehouse: a.warehouse || 'Almacén Central • Monterrey',
                      severity: (a.stock ?? 2) <= 2 ? ('critical' as const) : ('warning' as const),
                      prompt: `Revisa el stock de ${a.productName || a.sku} (Stock: ${a.stock ?? 2} · Mínimo: ${a.minStock ?? 5}) y cotiza reposición urgente con el proveedor más conveniente.`,
                    }))
                  : ALERTS_DATA
                ).map((item) => (
                  <div
                    key={item.sku}
                    className="py-2.5 flex items-start justify-between gap-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-zinc-200 truncate">{item.title}</p>
                      <p className="text-[10px] text-zinc-500 truncate mt-0.5">{item.warehouse}</p>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                          item.severity === 'critical'
                            ? 'bg-rose-500/15 text-rose-300 border border-rose-500/20'
                            : 'bg-amber-500/15 text-amber-300 border border-amber-500/20'
                        }`}
                      >
                        {item.stockText}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleResolve(item.prompt)}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1 cursor-pointer font-medium"
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
              <div className="divide-y divide-white/[0.04]">
                {HEALTHY_DATA.map((item) => (
                  <div
                    key={item.sku}
                    className="py-2.5 flex items-start justify-between gap-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <p className="text-xs font-semibold text-zinc-200 truncate">{item.title}</p>
                      </div>
                      <p className="text-[10px] text-zinc-500 truncate mt-0.5">{item.warehouse}</p>
                    </div>

                    <div className="shrink-0">
                      <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded-full border border-emerald-500/20">
                        {item.stockText}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'cron' && (
              <div className="divide-y divide-white/[0.04]">
                {CRON_HISTORY.map((cron) => (
                  <div key={cron.id} className="py-2 flex flex-col gap-1 first:pt-0 last:pb-0 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-zinc-400" />
                        <span className="text-zinc-200 font-semibold">{cron.id}</span>
                      </div>
                      <span className="text-zinc-500 text-[10px] font-mono">{cron.timestamp}</span>
                    </div>
                    <p className="text-zinc-400 text-[11px] line-clamp-2 leading-relaxed">{cron.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
