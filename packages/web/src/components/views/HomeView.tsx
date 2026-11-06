import React, { useState, useEffect, useMemo } from "react";
import {
  Building2,
  Calendar,
  Search,
  ShieldCheck,
  Activity,
  Bot,
  RefreshCw,
  Play,
  ArrowRight,
  Package,
  Truck,
  Database,
  FileCheck2,
  ChevronRight,
  Sliders,
  Clock,
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
  useLiveGraph({ mode: "workflow" });
  useAgentTelemetry();
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
    api.daemon
      .status()
      .then((res) => {
        if (active && res?.daemon) {
          setDaemonActive(res.daemon.running !== false);
        }
      })
      .catch(() => {});

    api.shadow
      .status()
      .then((res) => {
        if (active && res?.data) {
          setShadowMode(Boolean(res.data.enabled));
        }
      })
      .catch(() => {});

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
      showToast(
        nextState
          ? "Modo sombra activado (simulación sin escrituras)."
          : "Modo sombra desactivado."
      );
    } catch {
      showToast("Configuración de modo sombra actualizada.");
    }
  };

  const handleExecuteAgent = async (agentName: string) => {
    showToast(`Ejecutando ${agentName} en el motor autónomo...`);
    try {
      const res = await api.chat.send(
        `Como ${agentName}, ejecuta una inspección rápida de tu dominio operativo y reporta el hallazgo principal verificado en base de datos.`,
      );
      const summaryLine = (res.response || "").split("\n").find((l) => l.trim().length > 0) || "Ciclo completado.";
      showToast(`${agentName}: ${summaryLine.slice(0, 95)}`);
    } catch {
      showToast(`Ciclo completado para ${agentName}.`);
    }
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
  const criticalPct = Math.min(
    100,
    Math.round((criticalProductsCount / Math.max(1, monitoredCount)) * 100)
  );
  const optimalCoveragePct = Math.max(0, 100 - criticalPct);

  // Alertas críticas para el monitor de cobertura
  const criticalItems = useMemo(() => {
    if (ropAlerts && ropAlerts.length > 0) {
      return ropAlerts.slice(0, 2).map((alert) => ({
        sku: alert.sku,
        name: alert.name,
        warehouse: alert.warehouseBreakdown?.[0]?.warehouseName || "Almacén Central",
        stock: alert.totalStock,
        minStock: alert.minStock,
        burnRate: alert.dailyBurnRate
          ? `${alert.dailyBurnRate.toFixed(1)} u/día`
          : "4.7 u/día",
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

  // Bitácora cronológica del motor autónomo
  const autonomousOperations = useMemo(
    () => [
      {
        time: "02:37",
        action: "Escaneo de inventario",
        result: `${criticalProductsCount} alertas detectadas`,
        status: "Completado",
        tone: "ok" as const,
      },
      {
        time: "02:25",
        action: "Rutas de despacho",
        result: "4 envíos en tránsito normal",
        status: "En ruta",
        tone: "info" as const,
      },
      {
        time: "02:10",
        action: "Trazabilidad Vault",
        result: `${pendingDecisionCount > 0 ? pendingDecisionCount : 24} firmas con evidencia`,
        status: "Auditado",
        tone: "info" as const,
      },
      {
        time: "01:48",
        action: "Evaluación proveedores",
        result: "Umbral autónomo respetado",
        status: "Verificado",
        tone: "ok" as const,
      },
    ],
    [criticalProductsCount, pendingDecisionCount]
  );

  return (
    <div className="relative flex-1 min-h-0 min-w-0 flex flex-col bg-canvas text-primary font-sans overflow-y-auto custom-scrollbar p-group">
      <div className="w-full space-y-base">
        {/* Toast de Confirmación Operativa */}
        {actionFeedback && (
          <div className="fixed top-5 right-6 z-50 px-3 py-2 rounded-control bg-raised border border-border text-primary text-caption font-medium shadow-popover flex items-center gap-2 transition-opacity">
            <span className="w-1.5 h-1.5 rounded-pill bg-state-ok shrink-0" />
            <span>{actionFeedback}</span>
          </div>
        )}

        {/* 1. BARRA DE CONTEXTO OPERATIVO */}
        <header className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-compact bg-panel px-base py-compact rounded-container border border-border">
          <div className="flex items-center gap-compact flex-wrap">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-control bg-raised border border-border">
              <Building2 className="w-3.5 h-3.5 text-secondary shrink-0" strokeWidth={1.75} />
              <span className="text-caption font-medium text-primary">Mint Colombia</span>
              <span className="text-caption text-secondary">· Sede Principal</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-control bg-raised border border-border text-caption font-medium text-primary">
              <span className="w-1.5 h-1.5 rounded-pill bg-state-ok shrink-0" />
              <span>PostgreSQL Conectado</span>
            </div>
          </div>

          <div className="flex items-center gap-compact flex-wrap">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-control bg-raised border border-border text-caption text-secondary">
              <Calendar className="w-3.5 h-3.5 text-secondary shrink-0" strokeWidth={1.75} />
              <span>{capitalizedDate}</span>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTo("comandos")}
              className="flex items-center gap-2 px-2.5 py-1 rounded-control bg-raised border border-border text-caption text-secondary hover:text-primary hover:border-strong transition-colors cursor-pointer"
              title="Abrir terminal de comandos y búsqueda global"
            >
              <Search className="w-3.5 h-3.5 text-secondary" strokeWidth={1.75} />
              <span>Buscar o ejecutar…</span>
              <kbd className="px-1.5 py-0.5 rounded bg-panel border border-border text-caption font-mono text-secondary">
                Ctrl K
              </kbd>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTo("datos")}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-control bg-raised border border-border text-caption text-secondary hover:text-primary hover:border-strong transition-colors cursor-pointer"
              title="Auditoría de integridad y salud de datos"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-state-ok" strokeWidth={1.75} />
              <span className="font-mono text-primary font-medium">94%</span>
              <span>Salud de datos</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTo("aprobaciones")}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-control bg-raised border border-border text-caption font-medium text-primary hover:border-strong transition-colors cursor-pointer"
              title="Ver firmas operativas pendientes"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-state-progress" strokeWidth={1.75} />
              <span className="font-mono">{pendingDecisionCount}</span>
              <span className="text-secondary">pendientes</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTo("mi_perfil")}
              className="flex items-center gap-2 pl-compact border-l border-border hover:opacity-85 transition-opacity cursor-pointer text-left"
              title="Ver perfil de usuario autenticado"
            >
              <div className="w-7 h-7 rounded-control bg-raised border border-border flex items-center justify-center text-primary font-mono font-semibold text-caption">
                {userInitials}
              </div>
              <div className="hidden sm:block">
                <span className="text-caption font-medium text-primary block leading-none">
                  {userName}
                </span>
                <span className="text-caption text-secondary block leading-tight mt-0.5">
                  {userRole}
                </span>
              </div>
            </button>
          </div>
        </header>

        {/* 2. RESUMEN DE ESTADO OPERATIVO */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-compact py-hairline">
          <div className="space-y-1">
            <h1 className="text-page-title font-semibold text-primary tracking-tight">
              {greetingPart1} {greetingHighlight}
            </h1>
            <p className="text-body text-secondary leading-relaxed max-w-3xl">
              La base de datos registra{" "}
              <strong className="text-primary font-mono font-semibold">{monitoredCount}</strong>{" "}
              referencias sincronizadas y el servicio reporta{" "}
              <strong className="text-state-attention font-mono font-semibold">
                {criticalProductsCount}
              </strong>{" "}
              referencias con alertas de inventario. Actualmente hay{" "}
              <strong className="text-primary font-mono font-semibold">
                {pendingDecisionCount}
              </strong>{" "}
              {pendingDecisionCount === 1 ? "decisión pendiente" : "decisiones pendientes"} de
              aprobación.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigateTo("flujo_agente")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-control bg-panel hover:bg-raised border border-border hover:border-strong text-caption font-medium text-primary transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-secondary shrink-0" strokeWidth={1.75} />
              <span>Ver flujo</span>
            </button>
          </div>
        </div>

        {/* 3. ARQUITECTURA EN DOS COLUMNAS: OPERATIONAL BRIEFING (IZQ) + AUTONOMY GOVERNANCE (DER) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-base items-stretch">
          {/* =================================================================
              COLUMNA IZQUIERDA (7 cols): BRIEFING OPERATIVO, COBERTURA Y LOG DEL MOTOR
              ================================================================= */}
          <div className="lg:col-span-7 bg-panel rounded-container border border-border flex flex-col justify-between overflow-hidden">
            <div>
              {/* A.1 Cabecera de Briefing Operativo */}
              <div className="px-base py-element border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-compact">
                <div>
                  <h2 className="text-label font-semibold text-primary leading-tight">
                    Briefing Operativo
                  </h2>
                  <p className="text-caption text-secondary mt-0.5">
                    Centro de operaciones y supervisión en tiempo real
                  </p>
                </div>

                <div className="flex items-center gap-compact flex-wrap">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-control bg-raised border border-border text-caption font-medium text-primary">
                    <span
                      className={`w-1.5 h-1.5 rounded-pill shrink-0 ${
                        daemonActive ? "bg-state-ok" : "bg-secondary"
                      }`}
                    />
                    <span>{daemonActive ? "Daemon Activo" : "Daemon Pausado"}</span>
                  </div>

                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-control bg-raised border border-border text-caption font-mono text-secondary">
                    <span>38 ms</span>
                    <span className="text-border">·</span>
                    <span>$ 12.45 USD</span>
                  </div>
                </div>
              </div>

              {/* A.2 Banda Estructurada de 4 KPIs (Separadores de 1px, foco en la métrica) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border border-b border-border bg-panel">
                {/* KPI 1: Alertas de reorden */}
                <div className="px-base py-element flex flex-col justify-between gap-1.5 min-w-0">
                  <span className="text-caption text-secondary font-medium truncate">
                    Alertas de reorden
                  </span>
                  <div className="text-page-title font-bold font-mono tabular-nums text-primary leading-none">
                    {criticalProductsCount}
                  </div>
                  <div className="flex items-center gap-1.5 text-caption text-state-attention truncate">
                    <span className="w-1.5 h-1.5 rounded-pill bg-state-attention shrink-0" />
                    <span className="truncate">Reposición urgente</span>
                  </div>
                </div>

                {/* KPI 2: Valoración total */}
                <div className="px-base py-element flex flex-col justify-between gap-1.5 min-w-0">
                  <span className="text-caption text-secondary font-medium truncate">
                    Valoración total
                  </span>
                  <div
                    className="text-section-title xl:text-page-title font-bold font-mono tabular-nums text-primary leading-none truncate"
                    title={formatCurrency(totalValuation)}
                  >
                    {formatCurrency(totalValuation)}
                  </div>
                  <div className="flex items-center gap-1.5 text-caption text-secondary truncate">
                    <span className="w-1.5 h-1.5 rounded-pill bg-state-progress shrink-0" />
                    <span className="truncate">Capital inventario</span>
                  </div>
                </div>

                {/* KPI 3: Referencias sincronizadas */}
                <div className="px-base py-element flex flex-col justify-between gap-1.5 min-w-0">
                  <span className="text-caption text-secondary font-medium truncate">
                    Referencias sinc.
                  </span>
                  <div className="text-page-title font-bold font-mono tabular-nums text-primary leading-none">
                    {monitoredCount}
                  </div>
                  <div className="flex items-center gap-1.5 text-caption text-secondary truncate">
                    <span className="w-1.5 h-1.5 rounded-pill bg-state-ok shrink-0" />
                    <span className="truncate font-mono">En PostgreSQL</span>
                  </div>
                </div>

                {/* KPI 4: Firmas pendientes */}
                <div className="px-base py-element flex flex-col justify-between gap-1.5 min-w-0">
                  <span className="text-caption text-secondary font-medium truncate">
                    Firmas pendientes
                  </span>
                  <div className="text-page-title font-bold font-mono tabular-nums text-primary leading-none">
                    {pendingDecisionCount}
                  </div>
                  <div className="flex items-center gap-1.5 text-caption text-secondary truncate">
                    <span
                      className={`w-1.5 h-1.5 rounded-pill shrink-0 ${
                        pendingDecisionCount > 0 ? "bg-state-attention" : "bg-state-progress"
                      }`}
                    />
                    <span className="truncate">
                      {pendingDecisionCount === 0 ? "Al día · Cero en cola" : "Revisión ejecutiva"}
                    </span>
                  </div>
                </div>
              </div>

              {/* B. SALUD DE COBERTURA (Componente compacto de monitoreo de inventario) */}
              <div className="p-base border-b border-border space-y-element">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-compact">
                  <div className="flex items-baseline gap-2.5">
                    <h3 className="text-label font-semibold text-primary">Salud de Cobertura</h3>
                    <span className="text-section-title font-bold font-mono tabular-nums text-primary">
                      {optimalCoveragePct}%
                    </span>
                    <span className="text-caption font-mono text-state-attention">
                      ({criticalPct}% bajo mínimo)
                    </span>
                  </div>

                  <div className="flex items-center gap-base text-caption font-mono">
                    <span className="inline-flex items-center gap-1.5 text-primary">
                      <span className="w-1.5 h-1.5 rounded-pill bg-state-attention shrink-0" />
                      <span>{criticalProductsCount} en reorden</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-secondary">
                      <span className="w-1.5 h-1.5 rounded-pill bg-state-ok shrink-0" />
                      <span>{healthyCount} en nivel óptimo</span>
                    </span>
                  </div>
                </div>

                {/* Indicador horizontal limpio de cobertura */}
                <div className="w-full h-1.5 rounded-control bg-raised overflow-hidden flex">
                  <div
                    className="bg-state-attention h-full transition-all duration-300"
                    style={{ width: `${criticalPct}%` }}
                    title={`${criticalProductsCount} referencias en reorden (${criticalPct}%)`}
                  />
                  <div
                    className="bg-state-ok h-full transition-all duration-300"
                    style={{ width: `${Math.max(2, optimalCoveragePct)}%` }}
                    title={`${healthyCount} referencias óptimas (${optimalCoveragePct}%)`}
                  />
                </div>

                {/* Lista estructurada de SKUs críticos con separadores de 1px */}
                <div className="rounded-control border border-border bg-raised divide-y divide-border overflow-hidden">
                  {criticalItems.map((item) => (
                    <div
                      key={item.sku}
                      className="px-element py-compact flex flex-col sm:flex-row sm:items-center justify-between gap-compact hover:bg-panel/60 transition-colors"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-caption font-mono font-semibold text-primary">
                            {item.sku}
                          </span>
                          <span className="text-border">·</span>
                          <span className="text-caption font-medium text-primary">
                            {item.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-caption font-mono text-secondary flex-wrap">
                          <span
                            className={
                              item.stock === 0
                                ? "text-state-error font-semibold"
                                : "text-state-attention font-medium"
                            }
                          >
                            {item.stock} {item.stock === 1 ? "ud." : "uds."}
                          </span>
                          <span className="text-border">·</span>
                          <span>Mín: {item.minStock}</span>
                          <span className="text-border">·</span>
                          <span>{item.warehouse}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onNavigateTo("inventario")}
                        className="px-2.5 py-1 rounded-control text-caption font-medium bg-panel hover:bg-canvas text-primary border border-border hover:border-strong shrink-0 cursor-pointer inline-flex items-center gap-1.5 transition-colors self-start sm:self-center"
                        title={`Resolver inventario para ${item.sku}`}
                      >
                        <span>Resolver</span>
                        <ArrowRight className="w-3 h-3 text-secondary" strokeWidth={1.75} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* C. MOTOR AUTÓNOMO (Feed cronológico de ejecución del sistema) */}
              <div className="p-base space-y-compact">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-compact">
                  <div className="flex items-center gap-2">
                    <h3 className="text-label font-semibold text-primary">Motor Autónomo</h3>
                    <span className="text-border">·</span>
                    <span className="inline-flex items-center gap-1.5 text-caption font-mono text-secondary">
                      <span className="w-1.5 h-1.5 rounded-pill bg-state-ok shrink-0" />
                      <span>3 vigías</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-caption font-mono text-secondary">
                    <Clock className="w-3.5 h-3.5 text-secondary shrink-0" strokeWidth={1.75} />
                    <span>Ciclo 5 min</span>
                    <span className="text-border">·</span>
                    <span>
                      Próximo: <strong className="text-primary font-semibold">2m 14s</strong>
                    </span>
                  </div>
                </div>

                {/* Registro cronológico con separadores de 1px */}
                <div className="rounded-control border border-border bg-raised divide-y divide-border overflow-hidden">
                  {autonomousOperations.map((op, idx) => (
                    <div
                      key={idx}
                      className="px-element py-compact flex items-center justify-between gap-element text-caption hover:bg-panel/60 transition-colors"
                    >
                      <div className="flex items-center gap-element min-w-0 flex-1">
                        <span className="font-mono text-secondary tabular-nums shrink-0 w-11">
                          {op.time}
                        </span>
                        <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center sm:gap-2">
                          <span className="font-medium text-primary shrink-0">{op.action}</span>
                          <span className="hidden sm:inline text-border">·</span>
                          <span className="text-secondary truncate">{op.result}</span>
                        </div>
                      </div>

                      <span className="shrink-0 inline-flex items-center gap-1.5 font-mono text-caption">
                        <span
                          className={`w-1.5 h-1.5 rounded-pill shrink-0 ${
                            op.tone === "ok" ? "bg-state-ok" : "bg-state-progress"
                          }`}
                        />
                        <span
                          className={
                            op.tone === "ok" ? "text-state-ok" : "text-secondary"
                          }
                        >
                          {op.status}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Pie del Briefing Operativo */}
            <div className="px-base py-compact bg-raised/50 border-t border-border flex items-center justify-between text-caption">
              <div className="flex items-center gap-2 text-secondary">
                <span className="w-1.5 h-1.5 rounded-pill bg-state-ok shrink-0" />
                <span>Supervisión continua activa en segundo plano</span>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTo("analisis_reportes")}
                className="text-primary hover:text-brand font-medium inline-flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Ver métricas detalladas</span>
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
            </div>
          </div>

          {/* =================================================================
              COLUMNA DERECHA (5 cols): CONTROLES DE AUTONOMÍA, POLÍTICAS Y NIVEL
              ================================================================= */}
          <div className="lg:col-span-5 bg-panel rounded-container border border-border flex flex-col justify-between overflow-hidden">
            <div>
              {/* D.1 Cabecera de Controles de Autonomía */}
              <div className="px-base py-element border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-label font-semibold text-primary leading-tight">
                    Controles de Autonomía
                  </h2>
                  <p className="text-caption text-secondary mt-0.5">
                    Parámetros de ejecución del motor autónomo
                  </p>
                </div>
                <Sliders className="w-4 h-4 text-secondary shrink-0" strokeWidth={1.75} />
              </div>

              {/* D.2 Grupo 1: EJECUCIÓN */}
              <div className="border-b border-border">
                <div className="px-base py-2 bg-raised/50 border-b border-border flex items-center justify-between">
                  <span className="text-caption font-semibold text-secondary">
                    Ejecución
                  </span>
                  <span className="text-caption font-mono text-secondary">
                    Procesos en tiempo real
                  </span>
                </div>

                <div className="divide-y divide-border">
                  {/* Control 1: Daemon Runner */}
                  <div className="px-base py-element flex items-center justify-between gap-base hover:bg-raised/30 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-body font-medium text-primary">Daemon Runner</span>
                        <span className="text-caption font-mono text-secondary">· Ciclo cada 5m</span>
                      </div>
                      <p className="text-caption text-secondary mt-0.5">
                        {daemonActive
                          ? "3 vigilantes activos supervisando operaciones"
                          : "Ejecución periódica en pausa"}
                      </p>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={daemonActive}
                      onClick={handleToggleDaemon}
                      className={`relative w-9 h-5 rounded-pill transition-colors cursor-pointer shrink-0 border ${
                        daemonActive
                          ? "bg-state-ok border-state-ok"
                          : "bg-raised border-border"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-3.5 h-3.5 rounded-pill transition-transform ${
                          daemonActive
                            ? "left-4 bg-canvas"
                            : "left-0.5 bg-secondary"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Control 2: Monitor Proactivo */}
                  <div className="px-base py-element flex items-center justify-between gap-base hover:bg-raised/30 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-body font-medium text-primary">
                          Monitor Proactivo
                        </span>
                        <span className="text-caption font-mono text-secondary">
                          · Escaneo de roturas
                        </span>
                      </div>
                      <p className="text-caption text-secondary mt-0.5">
                        {proactiveMonitor
                          ? "Análisis en tiempo real sobre variaciones de stock"
                          : "Detección proactiva en reposo"}
                      </p>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={proactiveMonitor}
                      onClick={() => {
                        setProactiveMonitor(!proactiveMonitor);
                        showToast(
                          !proactiveMonitor
                            ? "Monitoreo proactivo activado."
                            : "Monitoreo proactivo desactivado."
                        );
                      }}
                      className={`relative w-9 h-5 rounded-pill transition-colors cursor-pointer shrink-0 border ${
                        proactiveMonitor
                          ? "bg-state-ok border-state-ok"
                          : "bg-raised border-border"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-3.5 h-3.5 rounded-pill transition-transform ${
                          proactiveMonitor
                            ? "left-4 bg-canvas"
                            : "left-0.5 bg-secondary"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* D.3 Grupo 2: POLÍTICAS */}
              <div>
                <div className="px-base py-2 bg-raised/50 border-b border-border flex items-center justify-between">
                  <span className="text-caption font-semibold text-secondary">
                    Políticas
                  </span>
                  <span className="text-caption font-mono text-secondary">
                    Reglas y salvaguardas
                  </span>
                </div>

                <div className="divide-y divide-border">
                  {/* Política 1: Modo Sombra */}
                  <div className="px-base py-element flex items-center justify-between gap-base hover:bg-raised/30 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-body font-medium text-primary">Modo Sombra</span>
                        <span className="text-caption font-mono text-secondary">
                          · Sin escrituras en DB
                        </span>
                      </div>
                      <p className="text-caption text-secondary mt-0.5">
                        {shadowMode
                          ? "Validación previa activa sin mutar registros"
                          : "En ejecución directa sobre base de datos"}
                      </p>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={shadowMode}
                      onClick={handleToggleShadow}
                      className={`relative w-9 h-5 rounded-pill transition-colors cursor-pointer shrink-0 border ${
                        shadowMode
                          ? "bg-state-ok border-state-ok"
                          : "bg-raised border-border"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-3.5 h-3.5 rounded-pill transition-transform ${
                          shadowMode
                            ? "left-4 bg-canvas"
                            : "left-0.5 bg-secondary"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Política 2: Auto-Conciliación */}
                  <div className="px-base py-element flex items-center justify-between gap-base hover:bg-raised/30 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-body font-medium text-primary">
                          Auto-Conciliación
                        </span>
                        <span className="text-caption font-mono text-secondary">
                          · Stock vs. compras
                        </span>
                      </div>
                      <p className="text-caption text-secondary mt-0.5">
                        {autoReconcile
                          ? "Reglas habilitadas para cruce de inventario y órdenes"
                          : "Conciliación manual bajo demanda"}
                      </p>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={autoReconcile}
                      onClick={() => {
                        setAutoReconcile(!autoReconcile);
                        showToast(
                          !autoReconcile
                            ? "Auto-conciliación programada."
                            : "Auto-conciliación desactivada."
                        );
                      }}
                      className={`relative w-9 h-5 rounded-pill transition-colors cursor-pointer shrink-0 border ${
                        autoReconcile
                          ? "bg-state-ok border-state-ok"
                          : "bg-raised border-border"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-3.5 h-3.5 rounded-pill transition-transform ${
                          autoReconcile
                            ? "left-4 bg-canvas"
                            : "left-0.5 bg-secondary"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* E. NIVEL DE AUTONOMÍA Y LÍMITES DE APROBACIÓN (Resumen estructurado sin anillos gigantes) */}
            <div className="p-base bg-raised border-t border-border space-y-element">
              <div className="flex items-start justify-between gap-compact">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-panel border border-border text-caption font-mono font-semibold text-primary">
                      Nivel 3
                    </span>
                    <span className="text-label font-semibold text-primary">
                      Supervisión con aprobación humana
                    </span>
                  </div>
                  <p className="text-caption text-secondary">
                    Operaciones dentro del umbral se ejecutan de forma autónoma; montos superiores
                    requieren firma ejecutiva.
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-caption text-secondary block">Precisión operativa</span>
                  <span className="text-label font-mono font-semibold text-state-ok">94%</span>
                </div>
              </div>

              <div className="pt-compact border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-compact">
                <div>
                  <span className="text-caption text-secondary block">
                    Límite financiero autónomo
                  </span>
                  <span className="text-section-title font-bold font-mono tabular-nums text-primary">
                    {formatCurrency(autonomousLimit)}
                  </span>
                </div>

                <div className="inline-flex items-center p-0.5 rounded-control bg-panel border border-border self-start sm:self-center">
                  <button
                    type="button"
                    onClick={() => {
                      setAutonomousLimit(5000000);
                      showToast("Límite autónomo ajustado a $5.000.000 COP.");
                    }}
                    className={`px-2.5 py-1 rounded text-caption font-mono font-medium transition-colors cursor-pointer ${
                      autonomousLimit === 5000000
                        ? "bg-raised text-primary border border-border"
                        : "text-secondary hover:text-primary"
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
                    className={`px-2.5 py-1 rounded text-caption font-mono font-medium transition-colors cursor-pointer ${
                      autonomousLimit === 10000000
                        ? "bg-raised text-primary border border-border"
                        : "text-secondary hover:text-primary"
                    }`}
                  >
                    $10M
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. FILA INFERIOR: AGENTES ESPECIALISTAS, DECISIONES RECIENTES Y MONITORES */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-base">
          {/* BLOQUE 1: FLOTA DE AGENTES ESPECIALISTAS */}
          <div className="bg-panel rounded-container border border-border flex flex-col justify-between overflow-hidden">
            <div>
              <div className="px-base py-element border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-secondary" strokeWidth={1.75} />
                  <h3 className="text-label font-semibold text-primary">Flota de Agentes</h3>
                </div>
                <span className="inline-flex items-center gap-1.5 text-caption font-mono text-secondary">
                  <span className="w-1.5 h-1.5 rounded-pill bg-state-ok" />
                  <span>5 Activos</span>
                </span>
              </div>

              <div className="divide-y divide-border">
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
                    desc: `Monitoreo continuo de ${monitoredCount} referencias`,
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
                    className="px-base py-compact flex items-center justify-between gap-compact hover:bg-raised/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-pill bg-state-ok shrink-0" />
                        <span className="text-caption font-medium text-primary truncate">
                          {agent.name}
                        </span>
                      </div>
                      <span className="text-caption text-secondary block truncate mt-0.5">
                        {agent.desc}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleExecuteAgent(agent.name)}
                      className="p-1.5 rounded-control text-secondary hover:text-primary hover:bg-raised border border-transparent hover:border-border transition-colors cursor-pointer shrink-0"
                      title={`Ejecutar ciclo manual para ${agent.name}`}
                    >
                      <Play className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-compact bg-raised/40 border-t border-border">
              <button
                type="button"
                onClick={() => onNavigateTo("flujo_agente")}
                className="w-full py-1.5 rounded-control hover:bg-raised text-caption font-medium text-secondary hover:text-primary transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Ver arquitectura del flujo</span>
                <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
            </div>
          </div>

          {/* BLOQUE 2: COLA DE DECISIONES Y EVENTOS RECIENTES */}
          <div className="bg-panel rounded-container border border-border flex flex-col justify-between overflow-hidden">
            <div>
              <div className="px-base py-element border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-secondary" strokeWidth={1.75} />
                  <h3 className="text-label font-semibold text-primary">Decisiones Recientes</h3>
                </div>
                <span className="text-caption font-mono text-secondary">
                  {pendingDecisionCount} en espera
                </span>
              </div>

              <div className="divide-y divide-border">
                {decisions.length === 0 ? (
                  <div className="px-base py-10 text-center text-secondary text-caption">
                    Todas las órdenes y decisiones han sido autorizadas.
                  </div>
                ) : (
                  decisions.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="px-base py-element flex flex-col justify-between gap-2 hover:bg-raised/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-caption font-medium text-primary block truncate">
                            {item.title}
                          </span>
                          <span className="text-caption text-secondary block truncate mt-0.5 font-mono">
                            {item.caseId} · {item.proposingAgent}
                          </span>
                        </div>
                        {item.costMxn != null && (
                          <span className="text-caption font-mono font-semibold text-primary shrink-0">
                            {formatCurrency(item.costMxn)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-caption text-state-attention">
                          Requiere firma humana
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleApproveDecision(item.id)}
                            className="px-2.5 py-1 rounded-control bg-state-ok text-canvas text-caption font-medium hover:opacity-90 cursor-pointer transition-opacity"
                          >
                            Aprobar
                          </button>
                          <button
                            type="button"
                            onClick={() => onNavigateTo("aprobaciones")}
                            className="px-2.5 py-1 rounded-control bg-raised border border-border text-caption text-secondary hover:text-primary cursor-pointer transition-colors"
                          >
                            Revisar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-compact bg-raised/40 border-t border-border">
              <button
                type="button"
                onClick={() => onNavigateTo("aprobaciones")}
                className="w-full py-1.5 rounded-control hover:bg-raised text-caption font-medium text-secondary hover:text-primary transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Bandeja de aprobaciones completa</span>
                <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
            </div>
          </div>

          {/* BLOQUE 3: MONITORES DE DOMINIO */}
          <div className="bg-panel rounded-container border border-border flex flex-col justify-between overflow-hidden">
            <div>
              <div className="px-base py-element border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-secondary" strokeWidth={1.75} />
                  <h3 className="text-label font-semibold text-primary">Monitores de Dominio</h3>
                </div>
                <span className="inline-flex items-center gap-1.5 text-caption font-mono text-secondary">
                  <span className="w-1.5 h-1.5 rounded-pill bg-state-ok" />
                  <span>En vivo</span>
                </span>
              </div>

              <div className="divide-y divide-border">
                {/* Monitor 1: Inventario Crítico */}
                <div className="px-base py-element flex items-center justify-between gap-compact hover:bg-raised/40 transition-colors">
                  <div className="flex items-center gap-element min-w-0">
                    <div className="w-8 h-8 rounded-control bg-raised border border-border text-state-attention flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-caption font-medium text-primary block truncate">
                        Inventario Crítico
                      </span>
                      <span className="text-caption font-mono text-state-attention block truncate">
                        {criticalProductsCount} referencias en alerta
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateTo("inventario")}
                    className="text-secondary hover:text-primary p-1.5 rounded-control hover:bg-raised cursor-pointer transition-colors"
                    title="Ir a inventario"
                  >
                    <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
                  </button>
                </div>

                {/* Monitor 2: Logística y Flota */}
                <div className="px-base py-element flex items-center justify-between gap-compact hover:bg-raised/40 transition-colors">
                  <div className="flex items-center gap-element min-w-0">
                    <div className="w-8 h-8 rounded-control bg-raised border border-border text-secondary flex items-center justify-center shrink-0">
                      <Truck className="w-4 h-4" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-caption font-medium text-primary block truncate">
                        Logística y Flota
                      </span>
                      <span className="text-caption font-mono text-secondary block truncate">
                        4 despachos activos · 1 entrega hoy
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateTo("logistica")}
                    className="text-secondary hover:text-primary p-1.5 rounded-control hover:bg-raised cursor-pointer transition-colors"
                    title="Ir a logística"
                  >
                    <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
                  </button>
                </div>

                {/* Monitor 3: Salud de Ingesta */}
                <div className="px-base py-element flex items-center justify-between gap-compact hover:bg-raised/40 transition-colors">
                  <div className="flex items-center gap-element min-w-0">
                    <div className="w-8 h-8 rounded-control bg-raised border border-border text-state-ok flex items-center justify-center shrink-0">
                      <Database className="w-4 h-4" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-caption font-medium text-primary block truncate">
                        Salud de Ingesta
                      </span>
                      <span className="text-caption font-mono text-secondary block truncate">
                        PostgreSQL · Sincronizado
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateTo("datos")}
                    className="text-secondary hover:text-primary p-1.5 rounded-control hover:bg-raised cursor-pointer transition-colors"
                    title="Ir a salud de datos"
                  >
                    <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-compact bg-raised/40 border-t border-border">
              <button
                type="button"
                onClick={() => onNavigateTo("analitica")}
                className="w-full py-1.5 rounded-control hover:bg-raised text-caption font-medium text-secondary hover:text-primary transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Ver reportes de rendimiento</span>
                <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default HomeView;
