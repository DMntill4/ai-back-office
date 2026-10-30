import React, { useState, useEffect, useRef, useMemo } from "react";
import { StockSkuItem } from "../../types/workflow";
import { Search, Copy, Check, Minus, Plus, Download, RefreshCw } from "lucide-react";
import { PageHeader } from "../ui/PageHeader";
import { SegmentedTabs, TabItem } from "../ui/SegmentedTabs";
import { MetricStrip, MetricItem } from "../ui/MetricStrip";
import { StatusIndicator, OperationalStatus } from "../ui/StatusIndicator";
import { Button } from "../ui/Button";
import { DataTable, TableColumn } from "../ui/DataTable";
import { InputField } from "../ui/InputField";
import { Dialog } from "../ui/Dialog";
import { EmptyState } from "../ui/EmptyState";
import { useInventoryData } from "../../hooks/useInventoryData";
import type { RopAlert } from "../../services/apiClient";

export interface StockInventoryViewProps {
  onTriggerRebalance?: (sku: StockSkuItem) => void;
  onNavigateToInbox?: () => void;
  onNavigateTo?: (tabId: string) => void;
}

interface EnrichedSkuItem extends StockSkuItem {
  locationRack: string;
  lotNumber: string;
  demandHistory: number[];
  demandTrendPct: number;
  quarantineReason?: string;
}


const WAREHOUSES = [
  { id: "all", label: "Todas las sedes" },
  { id: "wh_bga", label: "Bucaramanga" },
  { id: "wh_bog", label: "Bogotá" },
  { id: "wh_med", label: "Medellín" },
];

const STATUS_VIEW: Record<EnrichedSkuItem["status"], { status: OperationalStatus; label: string }> = {
  quiebre: { status: "error", label: "Se agota pronto" },
  alerta: { status: "attention", label: "Bajo reorden" },
  cuarentena: { status: "pending", label: "En cuarentena" },
  optimo: { status: "ok", label: "Óptimo" },
};

const COVERAGE_RISK_DAYS = 7;
const COVERAGE_TARGET_DAYS = 14;

const formatCop = (value: number) =>
  value.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

const formatCopCompact = (value: number) =>
  value >= 1_000_000 ? `$${(value / 1_000_000).toFixed(1)} M` : formatCop(value);

/** Traduce el estado del API al estado de presentación de la vista. */
function toSkuStatus(status: RopAlert["status"]): StockSkuItem["status"] {
  switch (status) {
    case "AGOTADO":
      return "quiebre";
    case "BAJO":
    case "ATENCION_ROP":
      return "alerta";
    default:
      return "optimo";
  }
}

/**
 * Adapta una alerta ROP del API al modelo enriquecido de la vista.
 * Conserva los datos visuales de la semilla (rack, lote, historial) cuando
 * existe una referencia equivalente; si no, sintetiza valores coherentes.
 */
function toEnrichedSku(alert: RopAlert, seed?: EnrichedSkuItem): EnrichedSkuItem {
  const primaryWarehouse = alert.warehouseBreakdown[0];
  const coverageDays = Number.isFinite(alert.daysOfCoverage)
    ? alert.daysOfCoverage
    : 0;
  const status = toSkuStatus(alert.status);

  return {
    id: seed?.id ?? alert.productId,
    sku: alert.sku,
    name: alert.name,
    category: alert.category,
    warehouseId: primaryWarehouse?.warehouseId ?? seed?.warehouseId ?? "wh_bga",
    warehouseName:
      primaryWarehouse?.warehouseName ??
      seed?.warehouseName ??
      "Bodega Matriz Bucaramanga",
    locationRack:
      seed?.locationRack ??
      `${primaryWarehouse?.city ?? "Bucaramanga"} · Sin ubicación asignada`,
    lotNumber: seed?.lotNumber ?? `LT-${alert.sku.replace(/[^A-Z0-9]/gi, "").slice(-6)}`,
    currentStock: alert.totalStock,
    minStock: alert.minStock,
    safetyStock: seed?.safetyStock ?? Math.round(alert.minStock * 0.4),
    dailyBurnRate: alert.dailyBurnRate,
    coverageDays,
    unitPriceCop: alert.unitCostEstimate,
    ropThreshold: alert.reorderPoint,
    status,
    demandHistory: seed?.demandHistory ?? [],
    demandTrendPct: seed?.demandTrendPct ?? 0,
    quarantineReason: seed?.quarantineReason,
  };
}

export const StockInventoryView: React.FC<StockInventoryViewProps> = ({
  onNavigateToInbox,
  onNavigateTo,
}) => {
  const [items, setItems] = useState<EnrichedSkuItem[]>([]);

  // Inventario en vivo desde /api/inventory con degradación segura a la semilla local.
  const {
    ropAlerts,
    loading: inventoryLoading,
    error: inventoryError,
    isFallback: inventoryIsFallback,
    refresh: refreshInventory,
    adjustStock,
  } = useInventoryData({
    refreshIntervalMs: 30000,
  });

  // Sincroniza las alertas ROP reales (o el fallback) con el estado local de la vista.
  useEffect(() => {
    if (ropAlerts.length === 0) return;
    setItems((prev) =>
      ropAlerts.map((alert) =>
        toEnrichedSku(alert, prev.find((s) => s.sku === alert.sku)),
      ),
    );
  }, [ropAlerts]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedSku, setCopiedSku] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [adjustModalSku, setAdjustModalSku] = useState<EnrichedSkuItem | null>(null);
  const [adjustQuantity, setAdjustQuantity] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>("Descuadre en conteo físico cíclico");
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);

  const [isSimulationOpen, setIsSimulationOpen] = useState(false);
  const [demandSurgePct, setDemandSurgePct] = useState<number>(35);

  const searchInputRef = useRef<HTMLDivElement>(null);

  const inventoryTabs: TabItem[] = [
    { id: "inventario", label: "Existencias" },
    { id: "productos", label: "Productos" },
    { id: "rutas_logistica", label: "Rutas y despachos" },
  ];

  const showToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleGenerateOrders = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setIsSimulationOpen(false);
      showToast(`Propuestas de reposición generadas para ${atRiskCount} referencias.`);
      if (onNavigateToInbox) {
        setTimeout(() => onNavigateToInbox(), 900);
      }
    }, 600);
  };

  // Atajos: Ctrl/Cmd+F busca, R genera órdenes, Esc cierra diálogos
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchInputRef.current?.querySelector("input")?.focus();
        return;
      }
      if (e.key === "Escape") {
        if (adjustModalSku) setAdjustModalSku(null);
        if (isSimulationOpen) setIsSimulationOpen(false);
        return;
      }
      if (!isInput && !adjustModalSku && !isSimulationOpen && e.key.toLowerCase() === "r") {
        e.preventDefault();
        handleGenerateOrders();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const handleCopySku = (sku: string) => {
    navigator.clipboard?.writeText(sku);
    setCopiedSku(sku);
    setTimeout(() => setCopiedSku(null), 1800);
    showToast(`SKU ${sku} copiado.`);
  };

  const openAdjustModal = (skuItem: EnrichedSkuItem) => {
    setAdjustModalSku(skuItem);
    setAdjustQuantity(skuItem.currentStock);
    setAdjustReason("Descuadre en conteo físico cíclico");
  };

  const handleConfirmAdjust = async () => {
    if (!adjustModalSku) return;
    const target = adjustModalSku;
    const delta = adjustQuantity - target.currentStock;
    if (delta === 0) {
      setAdjustModalSku(null);
      return;
    }
    setIsSubmittingAdjust(true);
    try {
      const ok = await adjustStock({
        producto_id: target.id,
        cantidad_delta: delta,
        motivo: adjustReason,
      });
      if (!ok) {
        showToast(`No se pudo ajustar ${target.sku}. Revisa la conexión con el backend.`);
        return;
      }
      setItems((prev) =>
        prev.map((i) =>
          i.sku === target.sku
            ? {
              ...i,
              currentStock: adjustQuantity,
              status:
                i.status === "cuarentena"
                  ? i.status
                  : adjustQuantity <= i.safetyStock
                    ? ("quiebre" as const)
                    : adjustQuantity <= i.ropThreshold
                      ? ("alerta" as const)
                      : ("optimo" as const),
            }
            : i
        )
      );
      setAdjustModalSku(null);
      showToast(
        `Ajuste confirmado para ${target.sku}: ${adjustQuantity} unidades (${delta >= 0 ? `+${delta}` : delta}).`
      );
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  const handleExportCsv = () => {
    const header = ["SKU", "Producto", "Categoría", "Sede", "Existencias", "Punto de reorden", "Cobertura (días)", "Valor (COP)", "Estado"];
    const rows = filteredItems.map((i) => [
      i.sku,
      i.name,
      i.category,
      i.warehouseName,
      i.currentStock,
      i.ropThreshold,
      i.coverageDays,
      i.currentStock * i.unitPriceCop,
      STATUS_VIEW[i.status].label,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "existencias.csv";
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Se exportaron ${filteredItems.length} referencias a CSV.`);
  };

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return items.filter((item) => {
      const matchesWarehouse = selectedWarehouse === "all" || item.warehouseId === selectedWarehouse;
      const matchesStatus = selectedStatus === "all" || item.status === selectedStatus;
      const matchesSearch =
        item.sku.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.locationRack.toLowerCase().includes(q);
      return matchesWarehouse && matchesStatus && matchesSearch;
    });
  }, [items, selectedWarehouse, selectedStatus, searchQuery]);

  // Cifras derivadas de los datos en pantalla (sin valores fijos)
  const counts = useMemo(() => {
    const c = { all: items.length, quiebre: 0, alerta: 0, optimo: 0, cuarentena: 0 };
    items.forEach((i) => {
      c[i.status] += 1;
    });
    return c;
  }, [items]);

  const atRiskCount = counts.quiebre + counts.alerta;
  const totalValue = items.reduce((sum, i) => sum + i.currentStock * i.unitPriceCop, 0);

  // Simulación de aumento de demanda sobre las referencias activas
  const simulation = useMemo(() => {
    const active = items.filter((i) => i.status !== "cuarentena");
    const factor = 1 + demandSurgePct / 100;
    const baseline = active.filter((i) => i.coverageDays < COVERAGE_RISK_DAYS);
    const projected = active.filter((i) => i.coverageDays / factor < COVERAGE_RISK_DAYS);
    const capital = projected.reduce(
      (sum, i) =>
        sum + Math.max(0, Math.ceil(i.dailyBurnRate * factor * COVERAGE_TARGET_DAYS) - i.currentStock) * i.unitPriceCop,
      0
    );
    return { baseline: baseline.length, projected: projected.length, capital };
  }, [items, demandSurgePct]);

  const metrics: MetricItem[] = [
    {
      id: "referencias",
      value: String(counts.all),
      context: "Referencias de la muestra en 3 sedes",
    },
    {
      id: "reorden",
      value: String(atRiskCount),
      context: "Bajo el punto de reorden",
      auxiliary: <StatusIndicator status={atRiskCount > 0 ? "attention" : "ok"} label={atRiskCount > 0 ? "Requiere compra" : "Al día"} />,
    },
    {
      id: "cuarentena",
      value: String(counts.cuarentena),
      context: "Retenidas para validación de calidad",
    },
    {
      id: "valor",
      value: formatCopCompact(totalValue),
      context: "Valor de las existencias en pantalla",
      highlightBrand: true,
    },
  ];

  const statusTabs: TabItem[] = [
    { id: "all", label: "Todas", badge: counts.all },
    { id: "quiebre", label: "Se agota pronto", badge: counts.quiebre },
    { id: "alerta", label: "Bajo reorden", badge: counts.alerta },
    { id: "optimo", label: "Óptimo", badge: counts.optimo },
    { id: "cuarentena", label: "Cuarentena", badge: counts.cuarentena },
  ];

  const columns: TableColumn<EnrichedSkuItem>[] = [
    {
      key: "product",
      header: "Producto",
      render: (item) => (
        <div className="min-w-0 whitespace-nowrap">
          <span className="block text-body font-medium text-primary truncate max-w-[280px]">{item.name}</span>
          <span className="flex items-center gap-1.5 text-caption text-secondary">
            <span className="font-mono text-primary">{item.sku}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopySku(item.sku);
              }}
              className="text-secondary hover:text-primary cursor-pointer"
              title="Copiar SKU"
            >
              {copiedSku === item.sku ? <Check className="w-3 h-3 text-state-ok" /> : <Copy className="w-3 h-3" />}
            </button>
            <span className="text-muted">·</span>
            <span>{item.warehouseName.replace("Bodega Matriz ", "").replace("CD ", "").replace(" D.C.", "")}</span>
          </span>
        </div>
      ),
    },
    {
      key: "stock",
      header: "Existencias y reorden",
      width: "200px",
      render: (item) => {
        const maxGauge = Math.max(item.ropThreshold * 1.5, item.currentStock * 1.1) || 1;
        const fillPct = Math.min(100, Math.max(4, (item.currentStock / maxGauge) * 100));
        const ropTickPct = Math.min(96, (item.ropThreshold / maxGauge) * 100);
        const fill =
          item.status === "quiebre" ? "bg-state-error" : item.status === "alerta" ? "bg-state-attention" : "bg-state-ok";
        return (
          <div className="w-40 space-y-1">
            <div className="flex justify-between items-baseline gap-2 text-caption whitespace-nowrap">
              <span className="font-medium text-primary tabular-nums">{item.currentStock} unidades</span>
              <span className="text-secondary tabular-nums">Reorden: {item.ropThreshold}</span>
            </div>
            <div className="relative w-full h-1.5 rounded-pill bg-raised overflow-hidden">
              <div className={`h-full rounded-pill ${fill}`} style={{ width: `${fillPct}%` }} />
              <span className="absolute top-0 bottom-0 w-px bg-primary" style={{ left: `${ropTickPct}%` }} />
            </div>
          </div>
        );
      },
    },
    {
      key: "coverage",
      header: "Cobertura",
      render: (item) => (
        <div>
          <span className={`block text-body tabular-nums ${item.coverageDays < 4 ? "text-state-attention" : "text-primary"}`}>
            {item.coverageDays.toFixed(1)} días
          </span>
          <span className="block text-caption text-secondary tabular-nums">{item.dailyBurnRate} u./día</span>
        </div>
      ),
    },
    {
      key: "value",
      header: "Valor",
      align: "right",
      render: (item) => (
        <div>
          <span className="block text-body text-primary tabular-nums whitespace-nowrap">{formatCop(item.currentStock * item.unitPriceCop)}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Estado",
      render: (item) => <StatusIndicator status={STATUS_VIEW[item.status].status} label={STATUS_VIEW[item.status].label} />,
    },
    {
      key: "action",
      header: "",
      align: "right",
      render: (item) => (
        <Button variant="secondary" size="table" onClick={() => openAdjustModal(item)}>
          Ajustar
        </Button>
      ),
    },
  ];

  const selectClass =
    "h-9 px-3 text-body bg-panel text-primary border border-strong rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer";

  return (
    <div className="flex-1 h-full overflow-y-auto bg-canvas text-primary font-sans p-group space-y-group">
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-6 right-8 z-50 px-4 py-2.5 rounded-pill flex items-center gap-3 bg-raised border border-strong text-body text-primary shadow-dialog"
        >
          <span className="w-2 h-2 rounded-pill bg-state-ok" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-secondary hover:text-primary cursor-pointer" title="Cerrar aviso">
            ✕
          </button>
        </div>
      )}

      <PageHeader
        title="Existencias"
        description="Qué hay en cada sede y qué conviene reponer primero."
        actions={
          <>
            <Button
              variant="ghost"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${inventoryLoading ? "animate-spin" : ""}`} />}
              onClick={() => void refreshInventory()}
              disabled={inventoryLoading}
            >
              Actualizar
            </Button>
            <Button variant="secondary" icon={<Download className="w-3.5 h-3.5" />} onClick={handleExportCsv}>
              Exportar CSV
            </Button>
            <Button variant="secondary" onClick={() => setIsSimulationOpen(true)}>
              Simular demanda
            </Button>
            <Button onClick={handleGenerateOrders} disabled={isGenerating}>
              {isGenerating ? "Generando..." : "Generar órdenes de reposición"}
            </Button>
          </>
        }
        filterControl={<SegmentedTabs tabs={inventoryTabs} activeTab="inventario" onChange={(id) => onNavigateTo?.(id)} />}
      />

      {inventoryIsFallback && (
        <div className="rounded-control border border-state-attention/40 bg-state-attention-surface px-compact py-compact text-caption text-state-attention">
          El backend de inventario no respondió. Se muestra el último estado conocido.
        </div>
      )}

      {inventoryError && (
        <div className="rounded-control border border-state-error/40 bg-state-error-surface px-compact py-compact text-caption text-state-error">
          {inventoryError}
        </div>
      )}

      <MetricStrip items={metrics} />

      <div className="flex flex-wrap items-center justify-between gap-element">
        <div className="flex flex-wrap items-center gap-compact">
          <div className="w-72" ref={searchInputRef}>
            <InputField
              placeholder="Buscar SKU, producto o sede"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-3.5 h-3.5" />}
              aria-label="Buscar existencias"
            />
          </div>
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className={selectClass}
            aria-label="Filtrar por sede"
          >
            {WAREHOUSES.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.label}
              </option>
            ))}
          </select>
        </div>
        <SegmentedTabs tabs={statusTabs} activeTab={selectedStatus} onChange={setSelectedStatus} />
      </div>

      {inventoryLoading && items.length === 0 ? (
        <div className="space-y-compact" aria-busy="true" aria-label="Cargando existencias">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 rounded-control bg-raised animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Sin existencias registradas"
          description="El backend no devolvió referencias de inventario. Verifica la conexión con /api/inventory o registra productos en el catálogo."
          actionLabel="Actualizar"
          onAction={() => void refreshInventory()}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredItems}
          keyExtractor={(i) => i.id}
          emptyMessage="Ninguna referencia coincide con esos filtros. Cambia la sede o el estado, o borra la búsqueda."
        />
      )}

      <Dialog
        isOpen={!!adjustModalSku}
        onClose={() => setAdjustModalSku(null)}
        title="Ajustar existencias"
        description={adjustModalSku ? `${adjustModalSku.sku} · ${adjustModalSku.name}` : undefined}
        confirmLabel="Ajustar existencias"
        onConfirm={handleConfirmAdjust}
        isProcessing={isSubmittingAdjust}
      >
        {adjustModalSku && (
          <div className="space-y-element">
            <div className="flex items-center justify-between text-body">
              <span className="text-secondary">Existencias registradas</span>
              <span className="font-medium tabular-nums">{adjustModalSku.currentStock} unidades</span>
            </div>
            <div>
              <span className="block text-label font-medium text-secondary mb-hairline">Conteo físico verificado</span>
              <div className="flex items-center gap-compact">
                <Button variant="secondary" size="table" aria-label="Restar una unidad" onClick={() => setAdjustQuantity((p) => Math.max(0, p - 1))}>
                  <Minus className="w-3.5 h-3.5" />
                </Button>
                <input
                  type="number"
                  value={adjustQuantity}
                  aria-label="Conteo físico verificado"
                  onChange={(e) => setAdjustQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                  className="flex-1 h-9 bg-panel border border-strong rounded-control text-center text-body font-medium tabular-nums text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                />
                <Button variant="secondary" size="table" aria-label="Sumar una unidad" onClick={() => setAdjustQuantity((p) => p + 1)}>
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            <div>
              <label htmlFor="motivo-ajuste" className="block text-label font-medium text-secondary mb-hairline">
                Motivo del ajuste
              </label>
              <select id="motivo-ajuste" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} className={`${selectClass} w-full`}>
                <option>Descuadre en conteo físico cíclico</option>
                <option>Merma o rotura en bodega</option>
                <option>Devolución de cliente no registrada</option>
                <option>Transferencia entre bodegas pendiente</option>
              </select>
            </div>
            <p className="text-caption text-secondary">El ajuste queda registrado en el historial de decisiones.</p>
          </div>
        )}
      </Dialog>

      <Dialog
        isOpen={isSimulationOpen}
        onClose={() => setIsSimulationOpen(false)}
        title="Simular demanda"
        description="Mira cuántas referencias quedarían en riesgo si el consumo sube."
        confirmLabel="Generar órdenes de reposición"
        cancelLabel="Cerrar"
        onConfirm={handleGenerateOrders}
        isProcessing={isGenerating}
      >
        <div className="space-y-element">
          <div>
            <div className="flex justify-between text-body mb-hairline">
              <label htmlFor="alza-demanda" className="text-secondary">Aumento de la demanda</label>
              <span className="font-medium tabular-nums">+{demandSurgePct}%</span>
            </div>
            <input
              id="alza-demanda"
              type="range"
              min={10}
              max={100}
              value={demandSurgePct}
              onChange={(e) => setDemandSurgePct(Number(e.target.value))}
              className="w-full accent-brand cursor-pointer"
            />
          </div>
          <div className="rounded-control bg-panel border border-border p-element space-y-compact text-body">
            <div className="flex justify-between">
              <span className="text-secondary">Referencias en riesgo hoy</span>
              <span className="tabular-nums font-medium">{simulation.baseline}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Referencias en riesgo con +{demandSurgePct}%</span>
              <span className="tabular-nums font-medium text-state-attention">{simulation.projected}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">Inversión para cubrir {COVERAGE_TARGET_DAYS} días</span>
              <span className="tabular-nums font-medium">{formatCop(simulation.capital)}</span>
            </div>
          </div>
          <p className="text-caption text-secondary">
            Una referencia está en riesgo si su cobertura baja de {COVERAGE_RISK_DAYS} días. Las referencias en cuarentena no se cuentan.
          </p>
        </div>
      </Dialog>
    </div>
  );
};





