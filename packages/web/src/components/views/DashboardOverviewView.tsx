import React, { useMemo, useRef, useState } from "react";
import { useLenisScroll } from "../../hooks/useLenisScroll";
import {
  Calendar,
  Sparkles,
  RefreshCw,
  DollarSign,
  Package,
  AlertTriangle,
  CheckCircle2,
  ListTodo,
  LayoutDashboard,
  Activity,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import type { PendingDecisionRecord } from "../../services/apiClient";
import { useInventoryData } from "../../hooks/useInventoryData";
import { EmptyState } from "../ui/EmptyState";

interface DashboardOverviewViewProps {
  onNavigateTo: (tabId: string) => void;
  decisions: PendingDecisionRecord[];
  pendingDecisionCount: number;
  decisionsError: string | null;
}

type AttentionKind = "firma" | "inventario";

interface AttentionItem {
  id: string;
  kind: AttentionKind;
  urgency: number;
  reference: string;
  source: string;
  status: "pending" | "attention" | "error";
  statusLabel: string;
  title: string;
  amount?: string;
  note?: string;
  actionLabel: string;
  actionVariant: "primary" | "secondary";
  targetTab: string;
}

const formatCurrency = (value: number, currency = "COP") =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);

export const DashboardOverviewView: React.FC<DashboardOverviewViewProps> = ({
  onNavigateTo,
  decisions,
  pendingDecisionCount,
  decisionsError,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"resumen" | "atencion" | "actividad">("resumen");
  const scrollWrapperRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
  useLenisScroll(scrollWrapperRef, scrollContentRef);

  const {
    summary: inventorySummary,
    ropAlerts,
    loading: inventoryLoading,
    error: inventoryError,
    refresh: refreshInventory,
  } = useInventoryData();

  // Saludo dinámico según la hora del día (Fase 2)
  const currentHour = new Date().getHours();
  const greetingPart1 = "Buenas";
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

  // Registro de ítems que requieren atención (Fase 4)
  const attentionItems = useMemo<AttentionItem[]>(() => [
    ...decisions.map<AttentionItem>((decision) => ({
      id: `firma:${decision.id}`,
      kind: "firma",
      urgency: 1,
      reference: decision.caseId,
      source: decision.proposingAgent ?? "Agente de Compras",
      status: "pending",
      statusLabel: "Requiere tu firma",
      title: decision.title,
      amount: decision.costMxn == null ? undefined : formatCurrency(decision.costMxn),
      note: decision.policyReason ?? "Supera el umbral de compra autónoma registrado en políticas.",
      actionLabel: "Revisar compra",
      actionVariant: "primary",
      targetTab: "aprobaciones",
    })),
    ...ropAlerts.map<AttentionItem>((alert) => ({
      id: `inventario:${alert.productId}`,
      kind: "inventario",
      urgency: alert.status === "AGOTADO" ? 0 : 2,
      reference: alert.sku,
      source: alert.warehouseBreakdown[0]?.warehouseName ?? alert.preferredSupplierName ?? "Almacén Principal",
      status: alert.status === "AGOTADO" ? "error" : "attention",
      statusLabel: alert.status === "AGOTADO" ? "Sin existencias" : "Bajo punto de reorden",
      title: `${alert.totalStock} unidades · mínimo ${alert.minStock} · reorden ${alert.reorderPoint}`,
      note: alert.dailyBurnRate > 0
        ? `Consumo promedio registrado: ${alert.dailyBurnRate} unidades/día. Se proyecta agotamiento si no se genera reposición.`
        : "Nivel de existencias por debajo del umbral mínimo de seguridad establecido.",
      actionLabel: "Ver existencias",
      actionVariant: "secondary",
      targetTab: "inventario",
    })),
  ].sort((a, b) => a.urgency - b.urgency), [decisions, ropAlerts]);

  const atRiskCount = inventorySummary
    ? inventorySummary.skusBelowRop +
      inventorySummary.skusOutOfStock +
      inventorySummary.skusAtRisk
    : 0;

  const inventoryValuation = inventorySummary
    ? formatCurrency(inventorySummary.totalValuation, inventorySummary.currency)
    : "$ 0 COP";

  const renderAttentionRow = (item: AttentionItem) => {
    const isError = item.status === "error";
    const isAttention = item.status === "attention";
    const isPending = item.status === "pending";

    const borderColor = isError
      ? "border-l-state-error"
      : isAttention
      ? "border-l-state-attention"
      : "border-l-state-pending";

    const badgeBg = isError
      ? "bg-state-error-surface text-state-error border-state-error/30"
      : isAttention
      ? "bg-state-attention-surface text-state-attention border-state-attention/30"
      : "bg-state-pending-surface text-state-pending border-state-pending/30";

    return (
      <div
        key={item.id}
        className={`rounded-container bg-panel border border-border ${borderColor} border-l-4 p-4 space-y-3 transition-colors hover:border-strong`}
      >
        {/* Fila superior: Icono de alerta, SKU/Almacén, chip de estado y monto */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {isError ? (
              <AlertCircle className="w-4 h-4 text-state-error shrink-0" />
            ) : isAttention ? (
              <AlertTriangle className="w-4 h-4 text-state-attention shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-state-pending shrink-0" />
            )}
            <span className="font-mono text-caption font-semibold text-primary">
              {item.reference}
            </span>
            <span className="text-muted text-caption">·</span>
            <span className="text-caption text-secondary truncate">{item.source}</span>
            <span className={`px-2 py-0.5 rounded-pill text-caption font-medium border ${badgeBg}`}>
              {item.statusLabel}
            </span>
          </div>

          {item.amount && (
            <span className="text-body font-bold text-primary font-mono tabular-nums">
              {item.amount}
            </span>
          )}
        </div>

        {/* Fila de datos con icono */}
        <div className="flex items-center gap-2 text-caption text-primary font-medium">
          {item.kind === "inventario" ? (
            <Package className="w-3.5 h-3.5 text-brand shrink-0" />
          ) : (
            <DollarSign className="w-3.5 h-3.5 text-state-pending shrink-0" />
          )}
          <span>{item.title}</span>
        </div>

        {/* Caja de Justificación del agente con el botón de acción en la misma línea a la derecha */}
        {item.note && (
          <div className="p-3 rounded-control bg-raised/70 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-caption font-semibold text-primary mb-0.5">
                <Sparkles className="w-3.5 h-3.5 text-brand shrink-0" />
                <span>Justificación del agente</span>
              </div>
              <p className="text-caption text-secondary leading-relaxed">
                {item.note}
              </p>
            </div>

            <div className="shrink-0 flex items-center justify-end">
              <button
                type="button"
                onClick={() => onNavigateTo(item.targetTab)}
                className={`h-8 px-3.5 rounded-pill text-caption font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                  item.actionVariant === "primary"
                    ? "bg-action text-action-text hover:bg-action-hover font-semibold shadow-sm"
                    : "bg-panel hover:bg-raised border border-border-strong text-primary"
                }`}
              >
                <span>{item.actionLabel}</span>
                {item.actionVariant === "primary" && <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={scrollWrapperRef}
      className="flex-1 h-full min-h-0 min-w-0 overflow-y-auto overscroll-contain relative"
    >
      <div
        ref={scrollContentRef}
        className="relative min-h-full bg-canvas text-primary font-sans p-base sm:p-group lg:p-page space-y-group overflow-hidden"
      >
        {/* =========================================================================
            FASE 1: Atmósfera decorativa de fondo minimalista (según referencia: ondas de luz esmeralda)
            ========================================================================= */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0" aria-hidden="true">
          {/* 1. Halo ambiental sutil superior izquierdo */}
          <div className="absolute -top-32 -left-32 w-[580px] h-[480px] rounded-full bg-ambient-mint opacity-80 pointer-events-none" />

          {/* 2. Resplandor difuso esmeralda en el cuadrante superior derecho */}
          <div className="absolute top-0 right-0 w-[780px] h-[560px] bg-[radial-gradient(ellipse_at_80%_35%,rgba(43,182,86,0.18)_0%,rgba(15,22,18,0)_70%)] pointer-events-none" />

          {/* 3. Ondas y velos curvos translúcidos en SVG estático (cero coste GPU, nítido y sin lag en Tauri) */}
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

        <div className="relative z-10 space-y-group">
          {/* =========================================================================
              FASE 2: Cabecera y Saludo
              ========================================================================= */}
          <div className="flex flex-col gap-group">
            {/* Cabecera superior con título, botones píldora y pestañas */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-compact border-b border-border">
              <div>
                <h1 className="text-page-title font-bold text-primary tracking-tight">
                  Centro de Operaciones
                </h1>
                <p className="text-caption text-secondary mt-0.5">
                  Supervisión autónoma de existencias, compras y gobernanza operativa.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Botón de fecha píldora con icono */}
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-pill bg-panel border border-border text-caption text-secondary">
                  <Calendar className="w-3.5 h-3.5 text-brand shrink-0" />
                  <span>{capitalizedDate}</span>
                </div>

                {/* Botón "Ver flujo" píldora con icono */}
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

            {/* Pestañas en contenedor píldora con icono por pestaña (Fase 2) */}
            <div className="flex items-center">
              <div className="inline-flex items-center gap-1 p-1 rounded-pill bg-panel border border-border" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeSubTab === "resumen"}
                  onClick={() => setActiveSubTab("resumen")}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-pill text-caption transition-colors cursor-pointer ${
                    activeSubTab === "resumen"
                      ? "bg-brand/15 text-brand font-medium border border-brand/25"
                      : "text-secondary hover:text-primary hover:bg-raised/40 font-normal border border-transparent"
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Resumen del día</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeSubTab === "atencion"}
                  onClick={() => setActiveSubTab("atencion")}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-pill text-caption transition-colors cursor-pointer ${
                    activeSubTab === "atencion"
                      ? "bg-brand/15 text-brand font-medium border border-brand/25"
                      : "text-secondary hover:text-primary hover:bg-raised/40 font-normal border border-transparent"
                  }`}
                >
                  <ListTodo className="w-3.5 h-3.5" />
                  <span>Lo que requiere tu atención</span>
                  {attentionItems.length > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-pill text-caption font-mono font-medium ${
                      activeSubTab === "atencion" ? "bg-brand/25 text-brand" : "bg-canvas text-state-attention border border-state-attention/30"
                    }`}>
                      {attentionItems.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeSubTab === "actividad"}
                  onClick={() => setActiveSubTab("actividad")}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-pill text-caption transition-colors cursor-pointer ${
                    activeSubTab === "actividad"
                      ? "bg-brand/15 text-brand font-medium border border-brand/25"
                      : "text-secondary hover:text-primary hover:bg-raised/40 font-normal border border-transparent"
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Actividad del agente</span>
                </button>
              </div>
            </div>

            {/* Saludo grande con línea verde corta encima y alerta en ámbar (Fase 2) */}
            {activeSubTab === "resumen" && (
              <div className="pt-2 pb-1 space-y-2">
                <div className="w-8 h-1 rounded-pill bg-brand" />
                <h2 className="text-display font-bold text-primary tracking-tight">
                  {greetingPart1} <span className="text-brand">{greetingHighlight}</span>
                </h2>
                <p className="text-body-large text-secondary leading-relaxed max-w-3xl">
                  La base de datos registra{" "}
                  <strong className="text-primary font-semibold">{inventorySummary?.totalSkus ?? 0} referencias</strong>
                  {" "}y el servicio reporta{" "}
                  <strong className="text-state-attention font-semibold">
                    {atRiskCount} referencias con alertas de inventario
                  </strong>
                  . Además hay{" "}
                  <strong className="text-state-pending font-semibold">
                    {pendingDecisionCount} {pendingDecisionCount === 1 ? "decisión pendiente" : "decisiones pendientes"}
                  </strong>{" "}
                  de aprobación.
                </p>
              </div>
            )}
          </div>

          {/* Banner de error de conectividad si aplica */}
          {(decisionsError || inventoryError) && (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-compact rounded-control border border-state-error/40 bg-state-error-surface px-compact py-compact text-caption text-state-error"
            >
              <span>
                No se pudieron validar todos los datos con el backend.
                {decisionsError ? ` Aprobaciones: ${decisionsError}.` : ""}
                {inventoryError ? ` Inventario: ${inventoryError}.` : ""}
              </span>
              <button
                type="button"
                onClick={() => void refreshInventory()}
                className="text-caption font-semibold underline hover:text-primary cursor-pointer"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* =========================================================================
              FASE 3: Cuatro Tarjetas de KPIs con icono en círculo tintado
              ========================================================================= */}
          {activeSubTab === "resumen" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* KPI 1: Valoración de Inventario (Verde) */}
              <div className="rounded-container bg-panel border border-border p-4 flex flex-col justify-between transition-colors hover:border-strong space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-caption text-secondary font-medium">Valoración de existencias</span>
                  <div className="w-9 h-9 rounded-pill bg-brand/15 border border-brand/20 flex items-center justify-center text-brand">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-metric font-bold text-primary font-mono tabular-nums leading-none">
                    {inventoryValuation}
                  </div>
                  <p className="text-caption text-muted mt-1.5 leading-snug">
                    Calculada desde inventario y costos registrados en base de datos.
                  </p>
                </div>
              </div>

              {/* KPI 2: Referencias en Catálogo (Gris) */}
              <div className="rounded-container bg-panel border border-border p-4 flex flex-col justify-between transition-colors hover:border-strong space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-caption text-secondary font-medium">Referencias en catálogo</span>
                  <div className="w-9 h-9 rounded-pill bg-raised border border-border flex items-center justify-center text-secondary">
                    <Package className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-metric font-bold text-primary font-mono tabular-nums leading-none">
                    {inventorySummary?.totalSkus ?? 0}
                  </div>
                  <p className="text-caption text-muted mt-1.5 leading-snug">
                    Referencias activas consultadas en la base de datos de la empresa.
                  </p>
                </div>
              </div>

              {/* KPI 3: Alertas de Reposición (Ámbar) */}
              <div className="rounded-container bg-panel border border-border p-4 flex flex-col justify-between transition-colors hover:border-strong space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-caption text-secondary font-medium">Alertas de reposición</span>
                  <div className="w-9 h-9 rounded-pill bg-state-attention-surface border border-state-attention/30 flex items-center justify-center text-state-attention">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-metric font-bold text-state-attention font-mono tabular-nums leading-none">
                    {atRiskCount}
                  </div>
                  <p className="text-caption text-muted mt-1.5 leading-snug">
                    Referencias con existencias bajo el punto de reorden fijado.
                  </p>
                </div>
              </div>

              {/* KPI 4: Aprobaciones Pendientes (Azul) */}
              <div className="rounded-container bg-panel border border-border p-4 flex flex-col justify-between transition-colors hover:border-strong space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-caption text-secondary font-medium">Aprobaciones requeridas</span>
                  <div className="w-9 h-9 rounded-pill bg-state-pending-surface border border-state-pending/30 flex items-center justify-center text-state-pending">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-metric font-bold text-state-pending font-mono tabular-nums leading-none">
                    {pendingDecisionCount}
                  </div>
                  <p className="text-caption text-muted mt-1.5 leading-snug">
                    Compras y órdenes que superan el umbral y esperan firma humana.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              FASE 4: Sección "Lo que requiere tu atención"
              ========================================================================= */}
          {activeSubTab === "resumen" && (
            <div className="space-y-compact pt-compact">
              <div className="flex items-center justify-between pb-compact border-b border-border">
                <div className="flex items-center gap-2">
                  <ListTodo className="w-4 h-4 text-brand" />
                  <div>
                    <h3 className="text-section-title font-bold text-primary">
                      Lo que requiere tu atención
                    </h3>
                    <p className="text-caption text-secondary">
                      {Math.min(3, attentionItems.length)} de {attentionItems.length} registros consultados
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSubTab("atencion")}
                  className="px-3 py-1.5 rounded-pill bg-panel hover:bg-raised border border-border hover:border-strong text-caption text-primary flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Ver todo ({attentionItems.length})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-compact">
                {attentionItems.slice(0, 3).map(renderAttentionRow)}
              </div>
            </div>
          )}

          {/* VISTA COMPLETA: Lo que requiere tu atención */}
          {activeSubTab === "atencion" && (
            <div className="space-y-compact">
              <div className="flex items-center justify-between pb-compact border-b border-border">
                <div className="flex items-center gap-2">
                  <ListTodo className="w-4 h-4 text-brand" />
                  <div>
                    <h3 className="text-section-title font-bold text-primary">
                      Cola completa de atención
                    </h3>
                    <p className="text-caption text-secondary">
                      {attentionItems.length} registros ordenados por severidad.
                    </p>
                  </div>
                </div>
              </div>

              {attentionItems.length === 0 ? (
                <EmptyState
                  title="Nada pendiente aquí"
                  description="No hay órdenes pendientes de firma ni productos bajo el punto de reorden."
                />
              ) : (
                <div className="space-y-compact">
                  {attentionItems.map(renderAttentionRow)}
                </div>
              )}
            </div>
          )}

          {/* VISTA COMPLETA: Actividad del agente */}
          {activeSubTab === "actividad" && (
            <EmptyState
              title="Actividad operativa"
              description="El feed en vivo registra eventos del agente al ejecutarse órdenes y diagnósticos en segundo plano."
            />
          )}
        </div>
      </div>
    </div>
  );
};
