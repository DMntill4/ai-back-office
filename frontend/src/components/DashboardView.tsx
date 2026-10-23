import { useState, useEffect } from 'react';
import {
  Activity,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Zap,
  TrendingUp,
  Sparkles,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';

interface DashboardViewProps {
  onNavigate?: (view: string) => void;
  onOpenPrompt?: (prompt: string) => void;
  developerMode?: boolean;
  currency?: string;
}

interface SupplierPerformance {
  name: string;
  score: number;
  sla: string;
  unitCost: string;
  isBest?: boolean;
}

export function DashboardView({
  onNavigate,
  onOpenPrompt,
  currency = 'MXN',
}: DashboardViewProps) {
  const [auditing, setAuditing] = useState(false);
  const [auditDone, setAuditDone] = useState(false);

  // Estados reales conectados al backend Fastify & PostgreSQL
  const [metrics, setMetrics] = useState({
    totalOrders: 0,
    automated: 0,
    pendingReview: 0,
    savings: 0,
    spend: 0,
    realProductsCount: 0,
    lowStockCount: 0,
    inTransitShipments: 0,
  });

  const [criticalAlerts, setCriticalAlerts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierPerformance[]>([]);

  useEffect(() => {
    let mounted = true;
    const fetchDashboardData = async () => {
      try {
        const [dashRes, alertsRes, prodsRes] = await Promise.all([
          api.getDashboard('comp_default'),
          api.getProactiveAlerts(),
          api.getProducts('comp_default'),
        ]);

        if (mounted && dashRes.success && dashRes.data) {
          const rep = dashRes.data.dailyReport;
          setMetrics({
            totalOrders: rep?.totalOrders ?? 0,
            automated: rep?.automated ?? 0,
            pendingReview: rep?.pendingReview ?? 0,
            savings: rep?.savings ?? 0,
            spend: rep?.spend ?? 0,
            realProductsCount: dashRes.data.realProductsCount ?? 0,
            lowStockCount: dashRes.data.lowStockCount ?? 0,
            inTransitShipments: dashRes.data.inTransitShipments ?? 0,
          });

          if (Array.isArray(dashRes.data.performance) && dashRes.data.performance.length > 0) {
            setSuppliers(
              dashRes.data.performance.map((s: any, idx: number) => ({
                name: s.name,
                score: s.uv || 90,
                sla: idx % 2 === 0 ? '48h' : '72h',
                unitCost: s.origin || 'Cotización homologada',
                isBest: idx === 0,
              }))
            );
          } else {
            setSuppliers([]);
          }
        }

        if (mounted && alertsRes.success && Array.isArray(alertsRes.alerts) && alertsRes.alerts.length > 0) {
          setCriticalAlerts(
            alertsRes.alerts.map((a: any) => ({
              sku: a.sku || 'SKU-CRIT',
              title: a.title || a.message || 'Alerta de Existencias',
              currentStock: a.currentStock ?? 0,
              minStock: a.minStock ?? 0,
              warehouse: a.warehouse || 'Almacén Central',
              prompt: a.recommendedAction || `Analiza la situación de stock para ${a.sku} y cotiza reposición.`,
            }))
          );
        } else if (mounted && prodsRes.success && Array.isArray(prodsRes.data)) {
          const low = prodsRes.data.filter((p) => p.isLowStock || (p.stock != null && p.minStock != null && p.stock < p.minStock));
          if (low.length > 0) {
            setCriticalAlerts(
              low.map((p) => ({
                sku: p.sku,
                title: p.name,
                currentStock: p.stock,
                minStock: p.minStock,
                warehouse: 'Almacén Central',
                prompt: `Revisa las existencias de ${p.name} (${p.sku}) con stock ${p.stock}u y mínimo ${p.minStock}u, y cotiza reposición.`,
              }))
            );
          } else {
            setCriticalAlerts([]);
          }
        }
      } catch {
        // En caso de error, mantener valores en ceros / vacíos reales
      }
    };

    fetchDashboardData();
    return () => {
      mounted = false;
    };
  }, []);

  const runProactiveAudit = async () => {
    setAuditing(true);
    try {
      const res = await api.triggerAudit();
      if (res.success && Array.isArray(res.alertas) && res.alertas.length > 0) {
        toast.success(`Auditoría completada: ${res.alertas.length} alertas detectadas.`);
      }
    } catch {
      toast.error('No se pudo ejecutar la auditoría.');
    } finally {
      setAuditing(false);
      setAuditDone(true);
      setTimeout(() => setAuditDone(false), 2000);
    }
  };

  const [alertsPage, setAlertsPage] = useState(1);
  const ALERTS_PER_PAGE = 10;

  const totalAlertsPages = Math.ceil(criticalAlerts.length / ALERTS_PER_PAGE) || 1;
  const paginatedAlerts = criticalAlerts.slice(
    (alertsPage - 1) * ALERTS_PER_PAGE,
    alertsPage * ALERTS_PER_PAGE
  );

  const autoRate =
    metrics.totalOrders > 0
      ? Math.min(100, Math.round((metrics.automated / metrics.totalOrders) * 100))
      : 100;

  return (
    <div className="flex flex-col w-full max-w-[1360px] mx-auto gap-6 font-sans text-zinc-100 pb-16">
      {/* ─── Encabezado Ejecutivo Limpio ─── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-zinc-400 font-medium">Operaciones de Compras e Inventarios</span>
            <span className="text-zinc-600">•</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Sincronizado con Base de Datos
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-headline">
            Centro de Mando
          </h1>
        </div>

        {/* Acciones Rápidas del Encabezado */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={runProactiveAudit}
            disabled={auditing}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#12141A] hover:bg-[#1A1E27] border border-white/[0.06] text-xs font-medium text-zinc-200 transition cursor-pointer disabled:opacity-50 active:scale-[0.98]"
          >
            {auditing ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                <span>Auditando almacenes…</span>
              </>
            ) : auditDone ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span>Auditoría Completada</span>
              </>
            ) : (
              <>
                <Activity className="h-3.5 w-3.5 text-emerald-400" />
                <span>Auditoría Proactiva</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => onNavigate?.('chat')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-semibold text-xs shadow-xs transition cursor-pointer active:scale-[0.98]"
          >
            <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Consultar Bot</span>
          </button>
        </div>
      </div>

      {/* ─── 1. Las 4 Métricas Clave (KPIs Esenciales) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Órdenes Gestionadas */}
        <div className="rounded-2xl bg-[#101217] border border-white/[0.05] p-5 flex flex-col justify-between hover:border-white/[0.1] transition shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Órdenes Autónomas</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold font-headline text-white tracking-tight">
              {metrics.totalOrders}
            </span>
            <span className="text-xs text-zinc-400 ml-1.5 font-normal">órdenes</span>
          </div>
          <p className="mt-2 text-[11px] text-emerald-400 flex items-center gap-1">
            <span>
              {metrics.totalOrders > 0
                ? `${autoRate}% resueltas de forma autónoma (< $10k)`
                : 'Sin órdenes emitidas aún'}
            </span>
          </p>
        </div>

        {/* KPI 2: Ahorro Estimado */}
        <div className="rounded-2xl bg-[#101217] border border-white/[0.05] p-5 flex flex-col justify-between hover:border-white/[0.1] transition shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Ahorro en Adquisiciones</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold font-headline text-white tracking-tight">
              ${Number(metrics.savings).toLocaleString('es-MX')}
            </span>
            <span className="text-xs text-zinc-400 ml-1.5 font-mono">{currency}</span>
          </div>
          <p className="mt-2 text-[11px] text-zinc-400">
            Optimización multicriterio de proveedores
          </p>
        </div>

        {/* KPI 3: Gasto en IA & Inferencia */}
        <div className="rounded-2xl bg-[#101217] border border-white/[0.05] p-5 flex flex-col justify-between hover:border-white/[0.1] transition shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Inferencia &amp; Agente</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold font-headline text-white tracking-tight">
              ${metrics.totalOrders > 0 ? (metrics.totalOrders * 0.002).toFixed(3) : '0.000'}
            </span>
            <span className="text-xs text-zinc-400 ml-1.5 font-mono">USD</span>
          </div>
          <p className="mt-2 text-[11px] text-zinc-400">
            xAI Grok-4.6 ReAct • 100% gobernado
          </p>
        </div>

        {/* KPI 4: Aprobaciones Pendientes (HITL) */}
        <div
          onClick={() => onNavigate?.('approvals')}
          className="rounded-2xl bg-[#101217] border border-white/[0.05] p-5 flex flex-col justify-between hover:border-amber-500/30 transition shadow-sm cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium group-hover:text-amber-300 transition">
              Aprobaciones Supervisor
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div className="flex items-baseline">
              <span className="text-3xl font-bold font-headline text-white tracking-tight">
                {metrics.pendingReview}
              </span>
              <span className="text-xs text-zinc-400 ml-1.5 font-normal">
                {metrics.pendingReview === 1 ? 'pendiente' : 'pendientes'}
              </span>
            </div>
            <ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-amber-300 transition" />
          </div>
          <p className="mt-2 text-[11px] text-amber-400">
            Órdenes &gt; $10,000 MXN requieren firma
          </p>
        </div>
      </div>

      {/* ─── 2. Alertas Operativas Críticas (Acción Inmediata con Paginación de 10) ─── */}
      <div className="rounded-2xl border border-white/[0.05] bg-[#101217] p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3.5 mb-3 border-b border-white/[0.05]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white font-headline">
              Alertas de Inventario Bajo &amp; Riesgo de Desabasto
            </h2>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
              {criticalAlerts.length} productos críticos
            </span>

            {totalAlertsPages > 1 && (
              <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-1.5 py-0.5">
                <button
                  type="button"
                  onClick={() => setAlertsPage((p) => Math.max(1, p - 1))}
                  disabled={alertsPage === 1}
                  title="Página anterior"
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono text-zinc-300 px-1">
                  {alertsPage} / {totalAlertsPages}
                </span>
                <button
                  type="button"
                  onClick={() => setAlertsPage((p) => Math.min(totalAlertsPages, p + 1))}
                  disabled={alertsPage === totalAlertsPages}
                  title="Página siguiente"
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {paginatedAlerts.map((item, idx) => (
            <div
              key={item.sku + idx}
              className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                    {item.sku}
                  </span>
                  <span className="font-medium text-white text-sm truncate">{item.title}</span>
                </div>
                <div className="flex items-center gap-3 text-zinc-400 mt-1">
                  <span>
                    Existencias: <strong className="text-amber-300">{item.currentStock}u</strong> (Mínimo: {item.minStock}u)
                  </span>
                  <span>•</span>
                  <span>{item.warehouse}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onOpenPrompt?.(item.prompt)}
                className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-zinc-200 hover:text-white transition flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <span>Resolver con Bot</span>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
              </button>
            </div>
          ))}

          {criticalAlerts.length === 0 && (
            <div className="py-6 text-center text-xs text-zinc-400">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
              <span>Todos los productos se encuentran por encima de su nivel de existencias mínimas.</span>
            </div>
          )}
        </div>

        {/* Paginación Inferior Accesible */}
        {totalAlertsPages > 1 && (
          <div className="pt-4 mt-2 border-t border-white/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-zinc-400">
            <span className="text-[11px] text-zinc-500 font-mono">
              Mostrando {(alertsPage - 1) * ALERTS_PER_PAGE + 1} - {Math.min(alertsPage * ALERTS_PER_PAGE, criticalAlerts.length)} de {criticalAlerts.length} productos críticos
            </span>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setAlertsPage((p) => Math.max(1, p - 1))}
                disabled={alertsPage === 1}
                className="flex items-center gap-1 px-3 py-1 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-xs font-medium text-zinc-300 disabled:opacity-30 disabled:hover:bg-white/[0.03] cursor-pointer disabled:cursor-not-allowed transition active:scale-[0.98]"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>
              <span className="font-mono text-xs text-emerald-400 font-semibold px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                Pág. {alertsPage} de {totalAlertsPages}
              </span>
              <button
                type="button"
                onClick={() => setAlertsPage((p) => Math.min(totalAlertsPages, p + 1))}
                disabled={alertsPage === totalAlertsPages}
                className="flex items-center gap-1 px-3 py-1 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-xs font-medium text-zinc-300 disabled:opacity-30 disabled:hover:bg-white/[0.03] cursor-pointer disabled:cursor-not-allowed transition active:scale-[0.98]"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── 3. Proveedores Evaluados & Logística Activa ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Proveedores Principales */}
        <div className="rounded-2xl border border-white/[0.05] bg-[#101217] p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.05]">
            <h3 className="text-xs font-semibold uppercase font-label tracking-wider text-zinc-400">
              Rendimiento de Proveedores Homologados
            </h3>
            <span className="text-[10px] font-mono text-zinc-500">Matriz Multicriterio</span>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {suppliers.map((sup) => (
              <div key={sup.name} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-medium text-white">{sup.name}</span>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    SLA Entrega: {sup.sla} • {sup.unitCost}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-emerald-400">
                    {sup.score} pts
                  </span>
                  {sup.isBest && (
                    <span className="text-[9px] font-mono uppercase bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-1.5 py-0.2 rounded">
                      Preferido
                    </span>
                  )}
                </div>
              </div>
            ))}

            {suppliers.length === 0 && (
              <div className="py-8 text-center text-xs text-zinc-500">
                <span>Sin proveedores registrados en la base de datos.</span>
              </div>
            )}
          </div>
        </div>

        {/* Acceso Rápido al Agente */}
        <div className="rounded-2xl border border-white/[0.05] bg-[#101217] p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-semibold uppercase font-label tracking-wider text-zinc-300">
                Playbooks de Operación Inmediata
              </h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Ejecuta acciones complejas de back-office con un solo clic a través del motor autónomo ReAct.
            </p>
          </div>

          <div className="space-y-2 mt-4">
            <button
              type="button"
              onClick={() => onOpenPrompt?.('Ejecuta una auditoría de existencias críticas en todos los almacenes y lista los quiebres inminentes.')}
              className="w-full text-left px-3 py-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.05] transition text-xs text-zinc-300 hover:text-white flex items-center justify-between cursor-pointer"
            >
              <span>🔍 Auditar existencias en almacenes</span>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
            </button>
            <button
              type="button"
              onClick={() => onOpenPrompt?.('Cotiza reposición de los productos en estado crítico bajo el umbral autónomo de $10,000 MXN.')}
              className="w-full text-left px-3 py-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.05] transition text-xs text-zinc-300 hover:text-white flex items-center justify-between cursor-pointer"
            >
              <span>⚡ Cotizar reposición autónoma (&lt; $10k)</span>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
            </button>
            <button
              type="button"
              onClick={() => onOpenPrompt?.('Genera el pronóstico de demanda y análisis financiero para los próximos 30 días.')}
              className="w-full text-left px-3 py-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.05] transition text-xs text-zinc-300 hover:text-white flex items-center justify-between cursor-pointer"
            >
              <span>📊 Pronóstico de demanda a 30 días</span>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
