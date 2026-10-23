import { useState, useEffect } from 'react';
import {
  Inbox,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  RefreshCw,
  TrendingDown,
  DollarSign,
  Cpu,
  Radio,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { api } from '../lib/api';

interface DecisionItem {
  id: string;
  caseId: string;
  title: string;
  actionType: string;
  proposingAgent: string;
  costMxn: number;
  riskScore: number;
  reversible: boolean;
  evidence: any;
  risk: any;
  policyReason: string;
  createdAt: string;
}

interface OperationalEvent {
  id: string;
  eventType: string;
  severity: string;
  status: string;
  title: string;
  description: string;
  payload: any;
  createdAt: string;
}

interface BriefingData {
  totalDecisions: number;
  autoExecutedCount: number;
  pendingReviewCount: number;
  blockedRiskCount: number;
  totalAutonomousSpendMxn: number;
  estimatedSavingsMxn: number;
  systemHealth: string;
}

export function DecisionsInboxView({ companyId = 'comp_default' }: { companyId?: string }) {
  const [decisions, setDecisions] = useState<DecisionItem[]>([]);
  const [events, setEvents] = useState<OperationalEvent[]>([]);
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [scanning, setScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<'inbox' | 'live_stream'>('inbox');
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [decRes, evRes, briefRes] = await Promise.all([
        api.getPendingDecisions(companyId),
        api.getLiveEvents(companyId),
        api.getDailyBriefing(companyId),
      ]);

      if (decRes.success) setDecisions(decRes.data);
      if (evRes.success) setEvents(evRes.data);
      if (briefRes.success) setBriefing(briefRes.data);
    } catch (err: any) {
      toast.error(`Error al cargar datos operativos: ${err.message}`);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [companyId]);

  const handleScanNow = async () => {
    setScanning(true);
    try {
      const res = await api.triggerEventScan(companyId);
      if (res.success) {
        toast.success(
          `Escaneo completado: ${res.stockDeficitsFound} desabastos detectados, ${res.eventsTriggered} eventos creados.`
        );
        await loadData();
      }
    } catch (err: any) {
      toast.error(`Error durante escaneo: ${err.message}`);
    } finally {
      setScanning(false);
    }
  };

  const handleResolve = async (id: string, action: 'approve' | 'reject') => {
    setResolvingId(id);
    try {
      const res = await api.resolveDecision(id, action, undefined, 'HUMANO_SUPERVISOR');
      if (res.success) {
        if (action === 'approve') {
          toast.success(
            `✅ Decisión aprobada: ${res.message} Confirmada mediante post-verificación en PostgreSQL.`
          );
        } else {
          toast.info(`⚠️ Decisión rechazada y archivada.`);
        }
        await loadData();
      } else {
        toast.error(`Fallo de ejecución: ${res.message}`);
      }
    } catch (err: any) {
      toast.error(`Error al procesar decisión: ${err.message}`);
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header con métricas de autonomía y botón de escaneo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold tracking-wider uppercase text-emerald-400">
              Operaciones Proactivas Multi-Agente
            </span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight mt-1">
            Bandeja de Decisiones & Event Stream
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            El sistema detecta riesgos en tiempo real, genera planes con opciones y ejecuta de acuerdo con las políticas de gobernanza.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleScanNow}
            disabled={scanning}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 text-sm font-medium transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 text-emerald-400 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? 'Escaneando PostgreSQL...' : 'Escanear Eventos Reales'}
          </button>
        </div>
      </div>

      {/* 2. Resumen Diario (Daily Briefing) */}
      {briefing && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[#0A0D12]/75 backdrop-blur-xl border border-zinc-800/80 shadow-lg">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium">Decisiones Autónomas</span>
              <Cpu className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-zinc-100">{briefing.autoExecutedCount}</div>
            <div className="text-xs text-zinc-400 mt-1">Procesadas sin intervención humana</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0A0D12]/75 backdrop-blur-xl border border-zinc-800/80 shadow-lg">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium">Aguardando Aprobación</span>
              <Inbox className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400">{briefing.pendingReviewCount}</div>
            <div className="text-xs text-zinc-400 mt-1">Superan umbral o tienen alerta de riesgo</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0A0D12]/75 backdrop-blur-xl border border-zinc-800/80 shadow-lg">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium">Dinero Gestionado Autónomo</span>
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-zinc-100">
              ${briefing.totalAutonomousSpendMxn.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
            </div>
            <div className="text-xs text-zinc-400 mt-1">Órdenes bajo límite ejecutadas</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0A0D12]/75 backdrop-blur-xl border border-zinc-800/80 shadow-lg">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium">Ahorro Logístico Estimado</span>
              <TrendingDown className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400">
              ${briefing.estimatedSavingsMxn.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
            </div>
            <div className="text-xs text-zinc-400 mt-1">Por comparativa de proveedores y volumen</div>
          </div>
        </div>
      )}

      {/* 3. Selector de Pestañas (Inbox vs Live Stream) */}
      <div className="flex items-center gap-2 border-b border-zinc-800/80">
        <button
          onClick={() => setActiveTab('inbox')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'inbox'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Inbox className="h-4 w-4" />
          Bandeja de Decisiones
          {decisions.length > 0 && (
            <span className="ml-1.5 px-2 py-0.5 text-xs font-bold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
              {decisions.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('live_stream')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'live_stream'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Radio className="h-4 w-4 text-red-400 animate-pulse" />
          Live Watch Stream
          <span className="ml-1.5 px-2 py-0.5 text-xs font-bold rounded-full bg-zinc-800 text-zinc-300">
            {events.length}
          </span>
        </button>
      </div>

      {/* 4. Contenido de la Bandeja de Decisiones */}
      {activeTab === 'inbox' && (
        <div className="space-y-4">
          {decisions.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#0A0D12]/75 backdrop-blur-xl border border-zinc-800/80">
              <div className="inline-flex p-4 rounded-full bg-emerald-500/10 text-emerald-400 mb-3">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-100">Bandeja al día</h3>
              <p className="text-sm text-zinc-400 max-w-md mx-auto mt-1">
                No hay decisiones que requieran tu visto bueno en este momento. Las operaciones bajo el umbral se autoejecutan y auditan en segundo plano.
              </p>
            </div>
          ) : (
            decisions.map((dec) => {
              const evidence = dec.evidence || {};
              const risk = dec.risk || {};
              const isHighRisk = dec.riskScore > 0.3;

              return (
                <motion.div
                  key={dec.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 rounded-2xl bg-[#0A0D12]/85 backdrop-blur-xl border border-zinc-800/80 shadow-xl space-y-4"
                >
                  {/* Encabezado de la propuesta */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-zinc-800/60 pb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 text-xs font-mono font-medium rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                          {dec.proposingAgent}
                        </span>
                        <span className="text-xs text-zinc-400">Caso: {dec.caseId}</span>
                      </div>
                      <h2 className="text-lg font-bold text-zinc-100">{dec.title}</h2>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-zinc-400">Importe Total</div>
                      <div className="text-2xl font-bold text-emerald-400">
                        ${dec.costMxn.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                      </div>
                    </div>
                  </div>

                  {/* Grilla de Evidencia Matemática */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/50">
                    <div>
                      <div className="text-xs text-zinc-400">Stock Actual</div>
                      <div className="text-sm font-semibold text-zinc-200 mt-0.5">
                        {evidence.currentStock ?? '0'} uds (Mín: {evidence.minStock ?? '10'}u)
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-400">Consumo (Burn Rate)</div>
                      <div className="text-sm font-semibold text-zinc-200 mt-0.5">
                        {evidence.burnRate ? `${Number(evidence.burnRate).toFixed(1)}u / día` : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-400">Cobertura Proyectada</div>
                      <div className="text-sm font-semibold text-amber-400 mt-0.5">
                        {evidence.daysCoverage ? `${Number(evidence.daysCoverage).toFixed(1)} días` : 'Crítico'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-400">Proveedor Propuesto</div>
                      <div className="text-sm font-semibold text-zinc-200 mt-0.5 truncate">
                        {evidence.supplierName ?? evidence.supplierId ?? 'Homologado'}
                      </div>
                    </div>
                  </div>

                  {/* Dictamen del Agente Adversarial (Riesgo & Auditoría) */}
                  <div
                    className={`p-4 rounded-xl border ${
                      isHighRisk
                        ? 'bg-amber-950/20 border-amber-900/40 text-amber-300'
                        : 'bg-emerald-950/15 border-emerald-900/40 text-emerald-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">
                          Dictamen del Agente de Riesgo (Auditoría Adversarial)
                        </span>
                      </div>
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-black/40">
                        Score Riesgo: {(dec.riskScore * 100).toFixed(0)}%
                      </span>
                    </div>

                    <p className="text-xs text-zinc-300 leading-relaxed">{dec.policyReason}</p>

                    {risk.objections && risk.objections.length > 0 && (
                      <div className="mt-2 text-xs text-zinc-400">
                        <span className="font-semibold text-zinc-300">Objeciones analizadas: </span>
                        {risk.objections.join(' • ')}
                      </div>
                    )}
                  </div>

                  {/* Botones de Aprobación Humana */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => handleResolve(dec.id, 'reject')}
                      disabled={resolvingId === dec.id}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-sm font-medium border border-zinc-800 transition-all disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4 text-red-400" />
                      Rechazar
                    </button>

                    <button
                      onClick={() => handleResolve(dec.id, 'approve')}
                      disabled={resolvingId === dec.id}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {resolvingId === dec.id ? 'Ejecutando en BD...' : 'Aprobar y Ejecutar'}
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* 5. Contenido del Live Watch Stream */}
      {activeTab === 'live_stream' && (
        <div className="p-6 rounded-2xl bg-[#0A0D12]/85 backdrop-blur-xl border border-zinc-800/80 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping" />
              <span className="text-sm font-bold text-zinc-200">Event Feed en Tiempo Real</span>
            </div>
            <span className="text-xs text-zinc-400 font-mono">PostgreSQL stream activo</span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {events.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">Cero eventos pendientes registrados.</div>
            ) : (
              events.map((ev) => {
                const time = new Date(ev.createdAt).toLocaleTimeString('es-MX');
                const isCrit = ev.severity === 'CRITICAL';
                const isHigh = ev.severity === 'HIGH';

                return (
                  <div
                    key={ev.id}
                    className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="flex items-start sm:items-center gap-2.5">
                      <span className="text-zinc-500">[{time}]</span>
                      <span
                        className={`px-2 py-0.5 rounded font-bold ${
                          isCrit
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : isHigh
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        }`}
                      >
                        {ev.eventType}
                      </span>
                      <span className="text-zinc-200 font-medium">{ev.title}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-zinc-400 text-[11px] truncate max-w-xs">{ev.description}</span>
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px]">
                        {ev.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
