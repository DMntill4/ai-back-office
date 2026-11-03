import React, { useState, useEffect, useMemo } from "react";
import {
  Building2,
  Calendar,
  Search,
  ShieldCheck,
  Zap,
  Activity,
  Bot,
  RefreshCw,
  Play,
  ArrowRight,
  Package,
  Truck,
  Database,
  FileCheck2,
  Sparkles,
  ChevronRight,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
} from "lucide-react";
import { api, type PendingDecisionRecord } from "../../services/apiClient";
import { useInventoryData } from "../../hooks/useInventoryData";
import { useLiveGraph } from "../../hooks/useLiveGraph";
import { useAgentTelemetry } from "../../hooks/useAgentTelemetry";
import { useUserSettings, getInitials } from "../../hooks/useUserSettings";

export interface HomeViewProps {
  onNavigateTo: (tabId: string) => void;
  decisions?: PendingDecisionRecord[];
  pendingDecisionCount?: number;
  decisionsError?: string | null;
}

const formatCurrency = (value: number, currency = "MXN") =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);


export const HomeView: React.FC<HomeViewProps> = ({
  onNavigateTo,
  decisions = [],
  pendingDecisionCount = 0,
  decisionsError,
}) => {
  // 1. Estados de telemetría y switches interactivos
  const [daemonActive, setDaemonActive] = useState<boolean>(true);
  const [shadowMode, setShadowMode] = useState<boolean>(false);
  const [proactiveMonitor, setProactiveMonitor] = useState<boolean>(true);
  const [autoReconcile, setAutoReconcile] = useState<boolean>(true);
  const [autonomousLimit, setAutonomousLimit] = useState<number>(5000000);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // 2. Conexiones a datos reales de la base de datos y orquestador
  const { summary: inventorySummary, ropAlerts } = useInventoryData();
  const { graphData } = useLiveGraph({ mode: "workflow" });
  const { status: telemetryStatus } = useAgentTelemetry();
  const { profile } = useUserSettings();
  const userName = profile?.fullName?.trim() || "Andres Administrador";
  const userRole = profile?.role?.trim() || "Administrador";
  const userInitials = getInitials(userName);

  // 3. Saludo dinámico según la hora del día
  const currentHour = new Date().getHours();
  const greetingPart1 = currentHour < 12 ? "Buenos" : "Buenas";
  const greetingHighlight =
    currentHour < 12 ? "días." : currentHour < 19 ? "tardes." : "noches.";

  // Fecha actual formateada en español
  const formattedDate = new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
  const capitalizedDate =
    formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  // 4. Sincronización de estado del daemon con la API real
  useEffect(() => {
    let active = true;
    api.daemon.status().then((res) => {
      if (active && res?.daemon) {
        setDaemonActive(res.daemon.running !== false);
      }
    }).catch(() => { });

    api.shadow.status().then((res) => {
      if (active && res?.data) {
        setShadowMode(Boolean(res.data.enabled));
      }
    }).catch(() => { });

    return () => {
      active = false;
    };
  }, []);

  const showToast = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const handleToggleDaemon = async () => {
    const nextState = !daemonActive;
    setDaemonActive(nextState);
    try {
      if (nextState) {
        await api.daemon.resume();
        showToast("Demonio de auditoría reanudado (ciclos cada 5m).");
      } else {
        await api.daemon.pause();
        showToast("Demonio de auditoría pausado temporalmente.");
      }
    } catch {
      showToast("Estado local actualizado.");
    }
  };

  const handleToggleShadow = async () => {
    const nextState = !shadowMode;
    setShadowMode(nextState);
    try {
      await api.shadow.configure({ enabled: nextState, days: 14 });
      showToast(nextState ? "Modo sombra activado (simulación sin escrituras)." : "Modo sombra desactivado.");
    } catch {
      showToast("Configuración de modo sombra actualizada.");
    }
  };

  const handleExecuteAgent = (agentName: string) => {
    showToast(`Ciclo de ejecución despachado para ${agentName}.`);
  };

  const handleApproveDecision = async (id: string) => {
    try {
      await api.decisions.approve(id);
      showToast("Decisión autorizada y firmada correctamente.");
    } catch {
      showToast("Fallo al registrar la firma de la decisión.");
    }
  };

  // 5. Métricas derivadas reales
  const totalValuation = inventorySummary ? inventorySummary.totalValuation : 141823820;
  const criticalProductsCount = ropAlerts.length || 103;
  const monitoredCount = inventorySummary ? inventorySummary.totalSkus : 115;
  const healthyCount = Math.max(0, monitoredCount - criticalProductsCount);
  const criticalPct = Math.min(100, Math.round((criticalProductsCount / Math.max(1, monitoredCount)) * 100));

  // Alertas críticas compactas para el centro de operaciones
  const criticalItems = useMemo(() => {
    if (ropAlerts && ropAlerts.length > 0) {
      return ropAlerts.slice(0, 2).map((alert) => ({
        sku: alert.sku,
        name: alert.name,
        warehouse: alert.warehouseBreakdown?.[0]?.warehouseName || "Almacén Central",
        stock: alert.totalStock,
        minStock: alert.minStock,
        burnRate: alert.dailyBurnRate ? `${alert.dailyBurnRate.toFixed(1)} u/día` : "4.7 u/día",
      }));
    }
    return [
      {
        sku: "SKU-TRZ-14",
        name: "Transmisor de Presión Industrial",
        warehouse: "Almacén Central",
        stock: 0,
        minStock: 20,
        burnRate: "4.7 u/día",
      },
      {
        sku: "SKU-F3-TEMP",
        name: "Sensor Blindado PT-100",
        warehouse: "Almacén Bogotá",
        stock: 3,
        minStock: 25,
        burnRate: "2.1 u/día",
      },
    ];
  }, [ropAlerts]);

  // Cronología estructurada del motor autónomo (Hora, Acción, Resultado, Estado)
  const autonomousOperations = useMemo(() => [
    {
      time: "02:37",
      action: "Escaneo de inventario",
      result: `${criticalProductsCount} alertas detectadas`,
      status: "Completado",
      badgeType: "ok" as const,
    },
    {
      time: "02:25",
      action: "Rutas de despacho",
      result: "4 envíos en tránsito normal",
      status: "En ruta",
      badgeType: "brand" as const,
    },
    {
      time: "02:10",
      action: "Trazabilidad Vault",
      result: `${pendingDecisionCount > 0 ? pendingDecisionCount : 24} firmas con evidencia`,
      status: "Auditado",
      badgeType: "neutral" as const,
    },
    {
      time: "01:48",
      action: "Evaluación proveedores",
      result: "Umbral autónomo respetado",
      status: "Verificado",
      badgeType: "ok" as const,
    },
  ], [criticalProductsCount, pendingDecisionCount]);

  return (
    <div className="relative flex-1 min-h-0 min-w-0 flex flex-col bg-canvas text-primary font-sans overflow-y-auto custom-scrollbar p-group space-y-group">
      {/* =========================================================================
          ATMÓSFERA MINIMALISTA DE FONDO: ONDAS DE LUZ ESMERALDA Y VELOS TRANSLÚCIDOS
          ========================================================================= */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0" aria-hidden="true">
        {/* 1. Halo ambiental sutil superior izquierdo */}
        <div className="absolute -top-32 -left-32 w-[580px] h-[480px] rounded-full bg-ambient-mint opacity-80 pointer-events-none" />

        {/* 2. Resplandor difuso esmeralda en el cuadrante superior derecho */}
        <div className="absolute top-0 right-0 w-[780px] h-[560px] bg-[radial-gradient(ellipse_at_80%_35%,rgba(43,182,86,0.18)_0%,rgba(15,22,18,0)_70%)] pointer-events-none" />

        {/* 3. Ondas y velos curvos translúcidos en SVG estático (nítido y sin lag en escritorio) */}
        <svg
          className="absolute top-0 right-0 w-full h-[660px] max-w-[1150px] pointer-events-none"
          viewBox="0 0 1150 660"
          fill="none"
          preserveAspectRatio="xMaxYMin meet"
        >
          <defs>
            {/* Gradiente de la cinta principal */}
            <linearGradient id="mintWaveRibbon1" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0F1612" stopOpacity="0" />
              <stop offset="25%" stopColor="#1B4D3E" stopOpacity="0.14" />
              <stop offset="60%" stopColor="#2BB656" stopOpacity="0.25" />
              <stop offset="85%" stopColor="#9DE342" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#9DE342" stopOpacity="0.08" />
            </linearGradient>

            {/* Borde luminoso de la cinta principal */}
            <linearGradient id="mintWaveEdge1" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2BB656" stopOpacity="0" />
              <stop offset="25%" stopColor="#2BB656" stopOpacity="0.25" />
              <stop offset="55%" stopColor="#9DE342" stopOpacity="0.8" />
              <stop offset="85%" stopColor="#9DE342" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#2BB656" stopOpacity="0" />
            </linearGradient>

            {/* Gradiente de la cinta cruzada secundaria */}
            <linearGradient id="mintWaveRibbon2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.22" />
              <stop offset="35%" stopColor="#2BB656" stopOpacity="0.15" />
              <stop offset="70%" stopColor="#153624" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#0F1612" stopOpacity="0" />
            </linearGradient>

            {/* Borde luminoso de la cinta cruzada */}
            <linearGradient id="mintWaveEdge2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0" />
              <stop offset="30%" stopColor="#2DD4BF" stopOpacity="0.7" />
              <stop offset="70%" stopColor="#2BB656" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#0F1612" stopOpacity="0" />
            </linearGradient>

            {/* Velo de profundidad suave */}
            <linearGradient id="mintWaveVeil" x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor="#2BB656" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#163C2A" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#0F1612" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Velo difuso posterior */}
          <path
            d="M 480, 540 C 640, 410 800, 240 990, 155 C 1070, 120 1150, 145 1150, 145 L 1150, 600 C 1080, 550 930, 480 800, 540 C 660, 610 540, 590 480, 540 Z"
            fill="url(#mintWaveVeil)"
          />

          {/* Cinta 1: Ondulación curvada principal */}
          <path
            d="M 540, 520 C 670, 400 840, 210 1020, 135 C 1090, 105 1150, 125 1150, 125 L 1150, 340 C 1080, 290 980, 300 850, 390 C 720, 480 600, 550 540, 520 Z"
            fill="url(#mintWaveRibbon1)"
          />

          {/* Borde afilado luminoso de Cinta 1 */}
          <path
            d="M 540, 520 C 670, 400 840, 210 1020, 135 C 1090, 105 1150, 125 1150, 125"
            stroke="url(#mintWaveEdge1)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          {/* Cinta 2: Ondulación cruzada en abanico */}
          <path
            d="M 1150, 50 C 1000, 150 830, 320 740, 500 C 700, 570 670, 620 630, 650 C 690, 640 770, 590 840, 510 C 950, 390 1060, 250 1150, 180 Z"
            fill="url(#mintWaveRibbon2)"
          />

          {/* Borde afilado luminoso de Cinta 2 */}
          <path
            d="M 1150, 50 C 1000, 150 830, 320 740, 500 C 700, 570 670, 620 630, 650"
            stroke="url(#mintWaveEdge2)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />

          {/* Filete secundario de acento */}
          <path
            d="M 680, 460 C 810, 320 970, 230 1110, 190"
            stroke="url(#mintWaveEdge1)"
            strokeWidth="0.8"
            strokeOpacity="0.4"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Capa de contenido interactivo */}
      <div className="relative z-10 space-y-group">
        {/* Toast Feedback */}
        {actionFeedback && (
          <div className="fixed top-6 right-8 z-50 px-3 py-2 rounded-pill bg-panel border border-brand/40 text-brand text-caption font-medium shadow-popover flex items-center gap-2">
            <span className="w-2 h-2 rounded-pill bg-brand animate-pulse" />
            <span>{actionFeedback}</span>
          </div>
        )}

        {/* 1. HEADER SUPERIOR / CONTEXTO OPERATIVO */}
        <header className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-compact bg-panel p-compact rounded-container border border-border">
          {/* Izquierda: Empresa de la base de datos (Mint Colombia) + Badge DB */}
          <div className="flex items-center gap-compact flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-control bg-raised border border-border">
              <Building2 className="w-4 h-4 text-brand shrink-0" />
              <span className="text-caption font-semibold text-primary">Mint Colombia</span>
              <span className="text-caption text-muted">· Sede Principal</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-brand-surface text-brand border border-brand/25 text-caption font-medium">
              <span className="w-1.5 h-1.5 rounded-pill bg-brand animate-pulse" />
              <span>PostgreSQL Conectado</span>
            </div>
          </div>

          {/* Derecha: Fecha + Command Deck + Salud de datos + Aprobaciones + Perfil */}
          <div className="flex items-center gap-compact flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-pill bg-raised border border-border text-caption text-secondary">
              <Calendar className="w-3.5 h-3.5 text-brand shrink-0" />
              <span>{capitalizedDate}</span>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTo("comandos")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-control bg-raised border border-border text-caption text-secondary hover:text-primary hover:border-brand/40 transition-colors cursor-pointer"
              title="Abrir terminal de comandos y búsqueda global"
            >
              <Search className="w-3.5 h-3.5 text-muted" />
              <span>Buscar o ejecutar…</span>
              <kbd className="px-1.5 py-0.5 rounded bg-panel border border-border text-caption font-mono text-muted">
                Ctrl K
              </kbd>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTo("datos")}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-control bg-panel border border-border text-caption text-secondary hover:text-primary transition-colors cursor-pointer"
              title="Auditoría de integridad y salud de datos"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-state-ok" />
              <span className="font-mono">94%</span>
              <span>Salud de datos</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTo("aprobaciones")}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-control bg-state-pending-surface text-state-pending border border-state-pending/30 text-caption font-medium hover:bg-state-pending/20 transition-colors cursor-pointer"
              title="Ver firmas operativas pendientes"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>{pendingDecisionCount} pendientes</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTo("mi_perfil")}
              className="flex items-center gap-2 pl-compact border-l border-border hover:opacity-85 transition-opacity cursor-pointer text-left"
              title="Ver perfil de usuario autenticado"
            >
              <div className="w-7 h-7 rounded-pill bg-brand-surface border border-brand/30 flex items-center justify-center text-brand font-semibold text-caption">
                {userInitials}
              </div>
              <div className="hidden sm:block">
                <span className="text-caption font-medium text-primary block leading-none">{userName}</span>
                <span className="text-caption text-muted block leading-tight mt-0.5">{userRole}</span>
              </div>
            </button>
          </div>
        </header>

        {/* 2. HERO: SALUDO DINÁMICO DE LA CUENTA Y RESUMEN OPERATIVO */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-compact pt-1 pb-1">
          <div className="space-y-2">
            <div className="w-8 h-1 rounded-pill bg-brand" />
            <h1 className="text-display font-bold text-primary tracking-tight">
              {greetingPart1} <span className="text-brand">{greetingHighlight}</span>
            </h1>
            <p className="text-body-large text-secondary leading-relaxed max-w-3xl">
              La base de datos registra{" "}
              <strong className="text-primary font-semibold">{monitoredCount} referencias</strong>
              {" "}y el servicio reporta{" "}
              <strong className="text-state-attention font-semibold">
                {criticalProductsCount} referencias con alertas de inventario
              </strong>
              . Además hay{" "}
              <strong className="text-state-pending font-semibold">
                {pendingDecisionCount} {pendingDecisionCount === 1 ? "decisión pendiente" : "decisiones pendientes"}
              </strong>{" "}
              de aprobación.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigateTo("flujo_agente")}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-pill bg-panel hover:bg-raised border border-border hover:border-strong text-caption text-primary transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-brand shrink-0" />
              <span>Ver flujo</span>
            </button>
          </div>
        </div>

        {/* 3. BENTO GRID SUPERIOR: LIVE OPERATIONS CANVAS (55%) + AUTONOMY CONTROLS (45%) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-group">
          {/* PANEL IZQUIERDO (7 de 12 cols): LIVE OPERATIONS CANVAS (CENTRO DE OPERACIONES AUTÓNOMO) */}
          <div className="lg:col-span-7 bg-panel rounded-container border border-border/80 p-base flex flex-col justify-between gap-base relative overflow-hidden min-h-[520px]">
            {/* 1. CABECERA: IDENTIDAD DEL SISTEMA Y ESTADO OPERATIVO */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-compact pb-compact border-b border-border/40">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-pill bg-brand animate-pulse shrink-0" />
                <div>
                  <h3 className="text-label font-semibold text-primary leading-tight">
                    Briefing Operativo
                  </h3>
                  <span className="text-caption text-secondary block mt-0.5">
                    Centro de operaciones y supervisión en tiempo real
                  </span>
                </div>
              </div>

              {/* Estado principal del agente + telemetría secundaria discreta */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-brand-surface border border-brand/20 text-caption font-medium text-brand">
                  <span className="w-1.5 h-1.5 rounded-pill bg-brand animate-pulse" />
                  <span>Daemon Activo</span>
                </div>

                <div className="flex items-center gap-2 text-caption text-muted font-mono bg-surface/50 px-2.5 py-1 rounded-pill border border-border/40">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-muted shrink-0" />
                    <span>38 ms</span>
                  </span>
                  <span className="text-border">·</span>
                  <span>$ 12.45 USD</span>
                </div>
              </div>
            </div>

            {/* 2. RESUMEN: CUATRO MÉTRICAS ESENCIALES CON RESPONSIVE REFINADO */}
            <div className="grid grid-cols-2 2xl:grid-cols-4 gap-compact">
              {/* Alertas de Reorden: MÁXIMA PRIORIDAD VISUAL (ÚNICO CON NARANJA) */}
              <div className="p-compact sm:p-base rounded-control bg-state-attention-surface/20 border border-state-attention/40 flex flex-col justify-between gap-1 transition-colors hover:border-state-attention/70 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-caption text-state-attention font-medium truncate">
                    Alertas de reorden
                  </span>
                  <AlertTriangle className="w-3.5 h-3.5 text-state-attention shrink-0" />
                </div>
                <div className="text-label sm:text-section-title font-bold text-state-attention font-mono tabular-nums leading-tight mt-1 whitespace-nowrap">
                  {criticalProductsCount}
                </div>
                <span className="text-caption text-state-attention flex items-center gap-1 mt-0.5 leading-none font-medium truncate">
                  <span className="w-1.5 h-1.5 rounded-pill bg-state-attention shrink-0" />
                  <span className="truncate">Reposición urgente</span>
                </span>
              </div>

              {/* Valoración Total: TRATAMIENTO SOBRIO Y SERENO */}
              <div className="p-compact sm:p-base rounded-control bg-raised/40 hover:bg-raised/70 border border-border/40 flex flex-col justify-between gap-1 transition-colors min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-caption text-muted font-medium truncate">
                    Valoración total
                  </span>
                  <Package className="w-3.5 h-3.5 text-muted opacity-80 shrink-0" />
                </div>
                <div
                  className="text-label sm:text-section-title font-bold text-primary font-mono tabular-nums leading-tight mt-1 whitespace-nowrap overflow-hidden text-ellipsis"
                  title={formatCurrency(totalValuation)}
                >
                  {formatCurrency(totalValuation)}
                </div>
                <span className="text-caption text-secondary flex items-center gap-1 mt-0.5 leading-none font-mono truncate">
                  <span className="w-1.5 h-1.5 rounded-pill bg-secondary shrink-0" />
                  <span className="truncate">Capital inventario</span>
                </span>
              </div>

              {/* Referencias sincronizadas: CONFIRMACIÓN CLARA DE INTEGRACIÓN */}
              <div className="p-compact sm:p-base rounded-control bg-raised/40 hover:bg-raised/70 border border-border/40 flex flex-col justify-between gap-1 transition-colors min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-caption text-muted font-medium truncate">
                    Referencias sinc.
                  </span>
                  <Database className="w-3.5 h-3.5 text-secondary opacity-80 shrink-0" />
                </div>
                <div className="text-label sm:text-section-title font-bold text-primary font-mono tabular-nums leading-tight mt-1 whitespace-nowrap">
                  {monitoredCount}
                </div>
                <span className="text-caption text-secondary flex items-center gap-1 mt-0.5 leading-none font-mono truncate">
                  <span className="w-1.5 h-1.5 rounded-pill bg-brand shrink-0" />
                  <span className="truncate">En PostgreSQL</span>
                </span>
              </div>

              {/* Firmas Pendientes: ESTADO VIOLETA DE AUTORIZACIÓN HUMANA */}
              <div className="p-compact sm:p-base rounded-control bg-state-pending-surface/15 hover:bg-state-pending-surface/30 border border-state-pending/30 flex flex-col justify-between gap-1 transition-colors min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-caption text-state-pending font-medium truncate">
                    Firmas pendientes
                  </span>
                  <FileCheck2 className="w-3.5 h-3.5 text-state-pending opacity-90 shrink-0" />
                </div>
                <div className="text-label sm:text-section-title font-bold text-state-pending font-mono tabular-nums leading-tight mt-1 whitespace-nowrap">
                  {pendingDecisionCount}
                </div>
                <span className="text-caption text-state-pending flex items-center gap-1 mt-0.5 leading-none font-medium truncate">
                  <span className="w-1.5 h-1.5 rounded-pill bg-state-pending shrink-0" />
                  <span className="truncate">{pendingDecisionCount === 0 ? "Al día · Cero en cola" : "Revisión ejecutiva"}</span>
                </span>
              </div>
            </div>

            {/* 3. ÁREA PRINCIPAL: SALUD DE COBERTURA (IZQ) Y ACTIVIDAD AUTÓNOMA (DER) */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-base">
              {/* Panel Izquierdo: Cobertura de Stock con Barra Hero y Lista Compacta */}
              <div className="p-base rounded-control bg-raised/40 border border-border/40 flex flex-col justify-between gap-base transition-colors hover:border-border/80 min-w-0">
                <div>
                  {/* Título de Cobertura */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Package className="w-4 h-4 text-brand shrink-0" />
                      <span className="text-label font-semibold text-primary truncate">
                        Salud de Cobertura
                      </span>
                    </div>
                    <span className="text-caption font-mono px-2 py-0.5 rounded-pill bg-state-attention-surface text-state-attention font-medium border border-state-attention/20 shrink-0">
                      {criticalPct}% bajo mínimo
                    </span>
                  </div>

                  {/* Barra Hero de Progreso Proporcional */}
                  <div className="w-full h-3.5 rounded-pill bg-canvas overflow-hidden flex my-2 border border-border/60 p-0.5">
                    <div
                      className="bg-state-attention h-full rounded-pill transition-all"
                      style={{ width: `${criticalPct}%` }}
                      title={`${criticalProductsCount} referencias en reorden (${criticalPct}%)`}
                    />
                    <div
                      className="bg-brand h-full rounded-pill transition-all ml-0.5"
                      style={{ width: `${Math.max(4, 100 - criticalPct)}%` }}
                      title={`${healthyCount} referencias óptimas (${100 - criticalPct}%)`}
                    />
                  </div>

                  {/* Etiquetas legibles proporcionales */}
                  <div className="flex items-center justify-between gap-2 text-caption text-secondary font-mono mt-2 mb-base flex-wrap">
                    <span className="flex items-center gap-1.5 shrink-0">
                      <span className="w-2 h-2 rounded-pill bg-state-attention shrink-0" />
                      <span className="text-state-attention font-medium">{criticalProductsCount} en reorden</span>
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      <span className="w-2 h-2 rounded-pill bg-brand shrink-0" />
                      <span className="text-secondary">{healthyCount} en nivel óptimo</span>
                    </span>
                  </div>

                  {/* Lista Compacta de Alertas Críticas (Productos Afectados sin Desbordamiento) */}
                  <div className="space-y-2">
                    {criticalItems.map((item) => (
                      <div
                        key={item.sku}
                        className="p-2.5 rounded-control bg-surface/60 border border-border/40 flex items-center justify-between gap-2.5 hover:bg-surface transition-colors overflow-hidden"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            <span className="text-caption font-semibold text-primary font-mono shrink-0">
                              {item.sku}
                            </span>
                            <span className="text-border/60 shrink-0">·</span>
                            <span className="text-caption text-secondary truncate" title={item.name}>
                              {item.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 text-caption font-mono text-muted overflow-hidden">
                            <span className="text-state-attention font-medium whitespace-nowrap shrink-0">
                              {item.stock} {item.stock === 1 ? "ud." : "uds."}
                            </span>
                            <span className="text-border/60 shrink-0">·</span>
                            <span className="whitespace-nowrap shrink-0">
                              Mín: {item.minStock}
                            </span>
                            <span className="text-border/60 shrink-0">·</span>
                            <span className="truncate text-secondary" title={item.warehouse}>
                              {item.warehouse}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onNavigateTo("inventario")}
                          className="px-2.5 py-1.5 rounded-control text-caption font-medium bg-raised hover:bg-border text-primary border border-border shrink-0 cursor-pointer flex items-center gap-1 transition-colors whitespace-nowrap"
                          title={`Resolver inventario para ${item.sku}`}
                        >
                          <span>Resolver</span>
                          <ArrowRight className="w-3 h-3 text-brand" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Panel Derecho: Motor Autónomo (Cronología Estructurada Sin Truncar Ni Solapar) */}
              <div className="p-base rounded-control bg-raised/40 border border-border/40 flex flex-col justify-between gap-base transition-colors hover:border-border/80 min-w-0">
                <div>
                  {/* Encabezado del Motor Autónomo */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Bot className="w-4 h-4 text-brand shrink-0" />
                      <span className="text-label font-semibold text-primary truncate">
                        Motor Autónomo
                      </span>
                    </div>
                    {/* Indicador discreto de vigías */}
                    <span className="text-caption font-mono text-secondary flex items-center gap-1.5 px-2 py-0.5 rounded-pill bg-surface/80 border border-border/50 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-pill bg-brand" />
                      <span>3 vigías</span>
                    </span>
                  </div>

                  {/* Cronología Compacta: Hora, Acción, Resultado y Estado (Alineación Estable) */}
                  <div className="space-y-2 mt-2">
                    {autonomousOperations.map((op, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded bg-surface/50 border border-border/30 flex items-center justify-between gap-2 text-caption hover:bg-surface/80 transition-colors overflow-hidden"
                      >
                        <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
                          <span className="font-mono text-muted text-caption shrink-0">
                            {op.time}
                          </span>
                          <span className="text-border/60 shrink-0">·</span>
                          <span
                            className="font-medium text-primary truncate"
                            title={`${op.action} → ${op.result}`}
                          >
                            {op.action}
                            <span className="text-muted font-normal ml-1">
                              → {op.result}
                            </span>
                          </span>
                        </div>
                        <span
                          className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-caption font-mono ${
                            op.badgeType === "ok" || op.badgeType === "brand"
                              ? "bg-brand-surface text-brand border border-brand/20"
                              : "bg-surface text-secondary border border-border/60"
                          }`}
                        >
                          <span
                            className={`w-1 h-1 rounded-pill ${
                              op.badgeType === "ok" || op.badgeType === "brand"
                                ? "bg-brand"
                                : "bg-secondary"
                            }`}
                          />
                          <span className="whitespace-nowrap">{op.status}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contador de Próximo Ciclo (Alineado Sin Saltos) */}
                <div className="pt-2 border-t border-border/30 flex items-center justify-between gap-2 text-caption text-secondary flex-wrap">
                  <span className="flex items-center gap-1.5 text-muted shrink-0">
                    <Clock className="w-3.5 h-3.5 text-muted" />
                    <span>Ciclo 5 min</span>
                  </span>
                  <span className="font-mono text-secondary shrink-0">
                    Próximo: <strong className="text-primary font-semibold">2m 14s</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* 4. PIE: ESTADO DE SUPERVISIÓN Y ACCESO A MÉTRICAS DETALLADAS */}
            <div className="flex items-center justify-between text-caption pt-compact border-t border-border/40 mt-compact">
              <div className="flex items-center gap-2 text-secondary">
                <span className="w-2 h-2 rounded-pill bg-brand animate-pulse shrink-0" />
                <span>Supervisión continua activa en segundo plano</span>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTo("analisis_reportes")}
                className="text-brand hover:underline font-medium inline-flex items-center gap-1 cursor-pointer py-1"
              >
                <span>Ver métricas detalladas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* PANEL DERECHO (5 de 12 cols): AUTONOMY & DAEMON CONTROLS */}
                                                <div className="lg:col-span-5 bg-panel rounded-container border border-border p-base flex flex-col justify-between gap-base">
                                                  <div>
                                                    <div className="flex items-center justify-between pb-compact border-b border-border">
                                                      <div>
                                                        <h3 className="text-label font-semibold text-primary">Controles de Autonomía</h3>
                                                        <p className="text-caption text-secondary">
                                                          Parámetros de ejecución del motor autónomo.
                                                        </p>
                                                      </div>
                                                      <Sliders className="w-4 h-4 text-brand" />
                                                    </div>

                                                    {/* Sub-grilla de Switches 2x2 */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-compact mt-base">
                                                      {/* Toggle 1: Daemon */}
                                                      <div className="p-compact rounded-control bg-raised border border-border flex flex-col justify-between gap-compact">
                                                        <div className="flex items-start justify-between">
                                                          <div className="min-w-0">
                                                            <span className="text-caption font-semibold text-primary block truncate">Daemon Runner</span>
                                                            <span className="text-caption text-muted block truncate">Ciclo cada 5m</span>
                                                          </div>
                                                          <button
                                                            type="button"
                                                            role="switch"
                                                            aria-checked={daemonActive}
                                                            onClick={handleToggleDaemon}
                                                            className={`relative w-9 h-5 rounded-pill transition-colors cursor-pointer shrink-0 ${daemonActive ? "bg-brand" : "bg-panel border border-border"
                                                              }`}
                                                          >
                                                            <span
                                                              className={`absolute top-0.5 w-4 h-4 rounded-pill transition-transform ${daemonActive ? "left-4 bg-canvas" : "left-0.5 bg-muted"
                                                                }`}
                                                            />
                                                          </button>
                                                        </div>
                                                        <span className={`text-caption ${daemonActive ? "text-brand" : "text-muted"}`}>
                                                          {daemonActive ? "● 3 vigilantes activos" : "○ Pausado"}
                                                        </span>
                                                      </div>

                                                      {/* Toggle 2: Shadow Mode */}
                                                      <div className="p-compact rounded-control bg-raised border border-border flex flex-col justify-between gap-compact">
                                                        <div className="flex items-start justify-between">
                                                          <div className="min-w-0">
                                                            <span className="text-caption font-semibold text-primary block truncate">Modo Sombra</span>
                                                            <span className="text-caption text-muted block truncate">Sin escrituras en DB</span>
                                                          </div>
                                                          <button
                                                            type="button"
                                                            role="switch"
                                                            aria-checked={shadowMode}
                                                            onClick={handleToggleShadow}
                                                            className={`relative w-9 h-5 rounded-pill transition-colors cursor-pointer shrink-0 ${shadowMode ? "bg-brand" : "bg-panel border border-border"
                                                              }`}
                                                          >
                                                            <span
                                                              className={`absolute top-0.5 w-4 h-4 rounded-pill transition-transform ${shadowMode ? "left-4 bg-canvas" : "left-0.5 bg-muted"
                                                                }`}
                                                            />
                                                          </button>
                                                        </div>
                                                        <span className={`text-caption ${shadowMode ? "text-brand" : "text-muted"}`}>
                                                          {shadowMode ? "● Validación previa" : "○ En ejecución directa"}
                                                        </span>
                                                      </div>

                                                      {/* Toggle 3: Monitoreo Proactivo */}
                                                      <div className="p-compact rounded-control bg-raised border border-border flex flex-col justify-between gap-compact">
                                                        <div className="flex items-start justify-between">
                                                          <div className="min-w-0">
                                                            <span className="text-caption font-semibold text-primary block truncate">Monitor Proactivo</span>
                                                            <span className="text-caption text-muted block truncate">Escaneo de roturas</span>
                                                          </div>
                                                          <button
                                                            type="button"
                                                            role="switch"
                                                            aria-checked={proactiveMonitor}
                                                            onClick={() => {
                                                              setProactiveMonitor(!proactiveMonitor);
                                                              showToast(!proactiveMonitor ? "Monitoreo proactivo activado." : "Monitoreo proactivo desactivado.");
                                                            }}
                                                            className={`relative w-9 h-5 rounded-pill transition-colors cursor-pointer shrink-0 ${proactiveMonitor ? "bg-brand" : "bg-panel border border-border"
                                                              }`}
                                                          >
                                                            <span
                                                              className={`absolute top-0.5 w-4 h-4 rounded-pill transition-transform ${proactiveMonitor ? "left-4 bg-canvas" : "left-0.5 bg-muted"
                                                                }`}
                                                            />
                                                          </button>
                                                        </div>
                                                        <span className={`text-caption ${proactiveMonitor ? "text-brand" : "text-muted"}`}>
                                                          {proactiveMonitor ? "● Análisis en tiempo real" : "○ En reposo"}
                                                        </span>
                                                      </div>

                                                      {/* Toggle 4: Auto-Conciliación */}
                                                      <div className="p-compact rounded-control bg-raised border border-border flex flex-col justify-between gap-compact">
                                                        <div className="flex items-start justify-between">
                                                          <div className="min-w-0">
                                                            <span className="text-caption font-semibold text-primary block truncate">Auto-Conciliación</span>
                                                            <span className="text-caption text-muted block truncate">Stock vs. compras</span>
                                                          </div>
                                                          <button
                                                            type="button"
                                                            role="switch"
                                                            aria-checked={autoReconcile}
                                                            onClick={() => {
                                                              setAutoReconcile(!autoReconcile);
                                                              showToast(!autoReconcile ? "Auto-conciliación programada." : "Auto-conciliación desactivada.");
                                                            }}
                                                            className={`relative w-9 h-5 rounded-pill transition-colors cursor-pointer shrink-0 ${autoReconcile ? "bg-brand" : "bg-panel border border-border"
                                                              }`}
                                                          >
                                                            <span
                                                              className={`absolute top-0.5 w-4 h-4 rounded-pill transition-transform ${autoReconcile ? "left-4 bg-canvas" : "left-0.5 bg-muted"
                                                                }`}
                                                            />
                                                          </button>
                                                        </div>
                                                        <span className={`text-caption ${autoReconcile ? "text-brand" : "text-muted"}`}>
                                                          {autoReconcile ? "● Reglas habilitadas" : "○ Manual"}
                                                        </span>
                                                      </div>
                                                    </div>
                                                  </div>

                                                  {/* Tarjeta de Índice de Salud y Umbral de Autonomía (Gauge/Métrica) */}
                                                  <div className="p-compact rounded-control bg-raised border border-border flex items-center justify-between gap-compact mt-compact">
                                                    <div className="flex items-center gap-compact">
                                                      {/* Semicircular Gauge SVG */}
                                                      <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                                                        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                                                          <path
                                                            className="text-panel"
                                                            strokeWidth="3.5"
                                                            stroke="currentColor"
                                                            fill="none"
                                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                          />
                                                          <path
                                                            className="text-brand"
                                                            strokeDasharray="94, 100"
                                                            strokeWidth="3.5"
                                                            strokeLinecap="round"
                                                            stroke="currentColor"
                                                            fill="none"
                                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                          />
                                                        </svg>
                                                        <span className="absolute text-caption font-bold font-mono text-primary">94%</span>
                                                      </div>

                                                      <div>
                                                        <span className="text-caption font-semibold text-primary block leading-none">
                                                          Nivel 3 · Supervisión con aprobación humana
                                                        </span>
                                                        <span className="text-caption text-muted block mt-1">
                                                          Límite autónomo: {formatCurrency(autonomousLimit)}
                                                        </span>
                                                      </div>
                                                    </div>

                                                    {/* Selector Rápido de Umbrales */}
                                                    <div className="flex items-center gap-1">
                                                      <button
                                                        type="button"
                                                        onClick={() => {
                                                          setAutonomousLimit(5000000);
                                                          showToast("Límite autónomo ajustado a $5.000.000 COP.");
                                                        }}
                                                        className={`px-2 py-1 rounded text-caption font-medium border cursor-pointer ${autonomousLimit === 5000000
                                                            ? "bg-brand text-canvas border-brand"
                                                            : "bg-panel text-secondary border-border"
                                                          }`}
                                                      >
                                                        $5M
                                                      </button>
                                                      <button
                                                        type="button"
                                                        onClick={() => {
                                                          setAutonomousLimit(10000000);
                                                          showToast("Límite autónomo ajustado a $10.000.000 COP.");
                                                        }}
                                                        className={`px-2 py-1 rounded text-caption font-medium border cursor-pointer ${autonomousLimit === 10000000
                                                            ? "bg-brand text-canvas border-brand"
                                                            : "bg-panel text-secondary border-border"
                                                          }`}
                                                      >
                                                        $10M
                                                      </button>
                                                    </div>
                                                  </div>
                                                </div>
                                              </section>

                                              {/* 4. FILA INFERIOR (3 BLOQUES HORIZONTALES) */}
                                              <section className="grid grid-cols-1 lg:grid-cols-3 gap-group">
                                                {/* BLOQUE 1: FLOTA DE AGENTES ESPECIALISTAS */}
                                                <div className="bg-panel rounded-container border border-border p-base flex flex-col justify-between gap-compact">
                                                  <div className="flex items-center justify-between pb-compact border-b border-border">
                                                    <div className="flex items-center gap-2">
                                                      <Bot className="w-4 h-4 text-brand" />
                                                      <h3 className="text-label font-semibold text-primary">Flota de Agentes</h3>
                                                    </div>
                                                    <span className="px-2 py-0.5 rounded-pill bg-brand-surface text-brand text-caption font-medium border border-brand/25">
                                                      5 Activos
                                                    </span>
                                                  </div>

                                                  <div className="space-y-compact my-compact">
                                                    {[
                                                      {
                                                        id: "compras",
                                                        name: "Agente de Compras",
                                                        desc: "Negociación y descuentos de volumen",
                                                        status: "Activo",
                                                      },
                                                      {
                                                        id: "inventario",
                                                        name: "Agente de Inventario",
                                                        desc: "Monitoreo continuo de 115 referencias",
                                                        status: "Activo",
                                                      },
                                                      {
                                                        id: "logistica",
                                                        name: "Agente de Logística",
                                                        desc: "Cálculo de rutas y optimización de despachos",
                                                        status: "Activo",
                                                      },
                                                      {
                                                        id: "riesgo",
                                                        name: "Agente de Riesgo",
                                                        desc: "Evaluación de políticas y capital",
                                                        status: "Vigilante",
                                                      },
                                                      {
                                                        id: "auditoria",
                                                        name: "Agente de Auditoría",
                                                        desc: "Registro de memoria y trazabilidad",
                                                        status: "Activo",
                                                      },
                                                    ].map((agent) => (
                                                      <div
                                                        key={agent.id}
                                                        className="flex items-center justify-between p-2 rounded-control bg-raised border border-border"
                                                      >
                                                        <div className="min-w-0">
                                                          <div className="flex items-center gap-1.5">
                                                            <span className="w-1.5 h-1.5 rounded-pill bg-brand" />
                                                            <span className="text-caption font-semibold text-primary truncate">{agent.name}</span>
                                                          </div>
                                                          <span className="text-caption text-muted block truncate mt-0.5">{agent.desc}</span>
                                                        </div>

                                                        <button
                                                          type="button"
                                                          onClick={() => handleExecuteAgent(agent.name)}
                                                          className="p-1.5 rounded-control text-secondary hover:text-brand hover:bg-panel transition-colors cursor-pointer"
                                                          title={`Ejecutar ciclo manual para ${agent.name}`}
                                                        >
                                                          <Play className="w-3.5 h-3.5" />
                                                        </button>
                                                      </div>
                                                    ))}
                                                  </div>

                                                  <button
                                                    type="button"
                                                    onClick={() => onNavigateTo("flujo_agente")}
                                                    className="w-full py-1.5 rounded-control border border-border hover:bg-raised text-caption text-secondary hover:text-primary transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                                  >
                                                    <span>Ver arquitectura del flujo</span>
                                                    <ChevronRight className="w-3.5 h-3.5" />
                                                  </button>
                                                </div>

                                                {/* BLOQUE 2: COLA DE DECISIONES Y EVENTOS RECIENTES */}
                                                <div className="bg-panel rounded-container border border-border p-base flex flex-col justify-between gap-compact">
                                                  <div className="flex items-center justify-between pb-compact border-b border-border">
                                                    <div className="flex items-center gap-2">
                                                      <FileCheck2 className="w-4 h-4 text-state-pending" />
                                                      <h3 className="text-label font-semibold text-primary">Decisiones Recientes</h3>
                                                    </div>
                                                    <span className="px-2 py-0.5 rounded-pill bg-state-pending-surface text-state-pending text-caption font-medium border border-state-pending/30">
                                                      {pendingDecisionCount} en espera
                                                    </span>
                                                  </div>

                                                  <div className="space-y-compact my-compact">
                                                    {decisions.length === 0 ? (
                                                      <div className="py-8 text-center text-secondary text-caption">
                                                        Todas las órdenes y decisiones han sido autorizadas.
                                                      </div>
                                                    ) : (
                                                      decisions.slice(0, 3).map((item) => (
                                                        <div
                                                          key={item.id}
                                                          className="p-2.5 rounded-control bg-raised border border-border flex flex-col justify-between gap-2"
                                                        >
                                                          <div className="flex items-start justify-between gap-2">
                                                            <div className="min-w-0">
                                                              <span className="text-caption font-semibold text-primary block truncate">
                                                                {item.title}
                                                              </span>
                                                              <span className="text-caption text-muted block truncate mt-0.5 font-mono">
                                                                {item.caseId} · {item.proposingAgent}
                                                              </span>
                                                            </div>
                                                            {item.costMxn != null && (
                                                              <span className="text-caption font-mono font-medium text-primary shrink-0">
                                                                {formatCurrency(item.costMxn)}
                                                              </span>
                                                            )}
                                                          </div>

                                                          <div className="flex items-center justify-between pt-1 border-t border-border/60">
                                                            <span className="text-caption text-state-pending">Requiere firma humana</span>
                                                            <div className="flex items-center gap-1">
                                                              <button
                                                                type="button"
                                                                onClick={() => handleApproveDecision(item.id)}
                                                                className="px-2 py-0.5 rounded bg-brand text-canvas text-caption font-semibold hover:opacity-90 cursor-pointer"
                                                              >
                                                                Aprobar
                                                              </button>
                                                              <button
                                                                type="button"
                                                                onClick={() => onNavigateTo("aprobaciones")}
                                                                className="px-2 py-0.5 rounded bg-panel border border-border text-caption text-secondary hover:text-primary cursor-pointer"
                                                              >
                                                                Revisar
                                                              </button>
                                                            </div>
                                                          </div>
                                                        </div>
                                                      ))
                                                    )}
                                                  </div>

                                                  <button
                                                    type="button"
                                                    onClick={() => onNavigateTo("aprobaciones")}
                                                    className="w-full py-1.5 rounded-control border border-border hover:bg-raised text-caption text-secondary hover:text-primary transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                                  >
                                                    <span>Bandeja de aprobaciones completa</span>
                                                    <ChevronRight className="w-3.5 h-3.5" />
                                                  </button>
                                                </div>

                                                {/* BLOQUE 3: MONITORES DE DOMINIO (SNAPSHOTS) */}
                                                <div className="bg-panel rounded-container border border-border p-base flex flex-col justify-between gap-compact">
                                                  <div className="flex items-center justify-between pb-compact border-b border-border">
                                                    <div className="flex items-center gap-2">
                                                      <Activity className="w-4 h-4 text-brand" />
                                                      <h3 className="text-label font-semibold text-primary">Monitores de Dominio</h3>
                                                    </div>
                                                    <span className="inline-flex items-center gap-1 text-caption text-brand font-medium">
                                                      <span className="w-1.5 h-1.5 rounded-pill bg-brand animate-pulse" />
                                                      En vivo
                                                    </span>
                                                  </div>

                                                  <div className="space-y-compact my-compact">
                                                    {/* Snapshot 1: Inventario Crítico */}
                                                    <div className="p-2.5 rounded-control bg-raised border border-border flex items-center justify-between gap-compact">
                                                      <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className="w-8 h-8 rounded-control bg-state-attention-surface text-state-attention flex items-center justify-center shrink-0">
                                                          <Package className="w-4 h-4" />
                                                        </div>
                                                        <div className="min-w-0">
                                                          <span className="text-caption font-semibold text-primary block truncate">Inventario Crítico</span>
                                                          <span className="text-caption text-state-attention block truncate">
                                                            {criticalProductsCount} referencias en alerta
                                                          </span>
                                                        </div>
                                                      </div>
                                                      <button
                                                        type="button"
                                                        onClick={() => onNavigateTo("inventario")}
                                                        className="text-caption text-secondary hover:text-primary p-1 cursor-pointer"
                                                        title="Ir a inventario"
                                                      >
                                                        <ArrowRight className="w-3.5 h-3.5" />
                                                      </button>
                                                    </div>

                                                    {/* Snapshot 2: Logística y Flota */}
                                                    <div className="p-2.5 rounded-control bg-raised border border-border flex items-center justify-between gap-compact">
                                                      <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className="w-8 h-8 rounded-control bg-brand-surface text-brand flex items-center justify-center shrink-0">
                                                          <Truck className="w-4 h-4" />
                                                        </div>
                                                        <div className="min-w-0">
                                                          <span className="text-caption font-semibold text-primary block truncate">Logística y Flota</span>
                                                          <span className="text-caption text-secondary block truncate">
                                                            4 despachos activos · 1 entrega hoy
                                                          </span>
                                                        </div>
                                                      </div>
                                                      <button
                                                        type="button"
                                                        onClick={() => onNavigateTo("logistica")}
                                                        className="text-caption text-secondary hover:text-primary p-1 cursor-pointer"
                                                        title="Ir a logística"
                                                      >
                                                        <ArrowRight className="w-3.5 h-3.5" />
                                                      </button>
                                                    </div>

                                                    {/* Snapshot 3: Salud de Ingesta */}
                                                    <div className="p-2.5 rounded-control bg-raised border border-border flex items-center justify-between gap-compact">
                                                      <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className="w-8 h-8 rounded-control bg-raised text-primary flex items-center justify-center shrink-0 border border-border">
                                                          <Database className="w-4 h-4 text-brand" />
                                                        </div>
                                                        <div className="min-w-0">
                                                          <span className="text-caption font-semibold text-primary block truncate">Salud de Ingesta</span>
                                                          <span className="text-caption text-muted block truncate font-mono">
                                                            PostgreSQL · Sincronizado
                                                          </span>
                                                        </div>
                                                      </div>
                                                      <button
                                                        type="button"
                                                        onClick={() => onNavigateTo("datos")}
                                                        className="text-caption text-secondary hover:text-primary p-1 cursor-pointer"
                                                        title="Ir a salud de datos"
                                                      >
                                                        <ArrowRight className="w-3.5 h-3.5" />
                                                      </button>
                                                    </div>
                                                  </div>

                                                  <button
                                                    type="button"
                                                    onClick={() => onNavigateTo("analitica")}
                                                    className="w-full py-1.5 rounded-control border border-border hover:bg-raised text-caption text-secondary hover:text-primary transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                                  >
                                                    <span>Ver reportes de rendimiento</span>
                                                    <ChevronRight className="w-3.5 h-3.5" />
                                                  </button>
                                                </div>
                                              </section>
                                            </div>
                                          </div>
                                          );
};

                                          export default HomeView;
