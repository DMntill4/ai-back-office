import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
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
import { LoadingScreen } from "../ui/LoadingScreen";
import { useInventoryData } from "../../hooks/useInventoryData";
import type { InventoryItemRecord, RopAlert } from "../../services/apiClient";
import { Pagination } from "../ui/Pagination";

export interface StockInventoryViewProps {
  onTriggerRebalance?: (sku: StockSkuItem) => void;
  onNavigateTo?: (tabId: string) => void;
}

interface EnrichedSkuItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  warehouseId: string;
  warehouseName: string;
  currentStock: number;
  minStock: number;
  safetyStock: number;
  dailyBurnRate: number;
  coverageDays: number | null;
  unitPriceCop: number | null;
  ropThreshold: number;
  status: StockSkuItem["status"];
}

const STATUS_VIEW: Record<EnrichedSkuItem["status"], { status: OperationalStatus; label: string }> = {
  quiebre: { status: "error", label: "Se agota pronto" },
  alerta: { status: "attention", label: "Bajo reorden" },
  optimo: { status: "ok", label: "Óptimo" },
  cuarentena: { status: "attention", label: "Sin clasificar" },
};

const COVERAGE_RISK_DAYS = 7;
const COVERAGE_TARGET_DAYS = 14;

const formatCop = (value: number) =>
  value.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

const formatCopCompact = (value: number) =>
  value >= 1_000_000 ? `$${(value / 1_000_000).toFixed(1)} M` : formatCop(value);

/** Traduce el estado del API al estado de presentación de la vista. */
function toSkuStatus(status: RopAlert["status"] | InventoryItemRecord["status"]): StockSkuItem["status"] {
  switch (status) {
    case "AGOTADO":
    case "quiebre":
      return "quiebre";
    case "BAJO":
    case "ATENCION_ROP":
    case "alerta":
      return "alerta";
    default:
      return "optimo";
  }
}

/**
 * Combina los datos del catálogo con la información de riesgo ROP del backend.
 */
/** Número finito o el valor por defecto: blinda la vista ante `null`/`NaN` del API. */
function num(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toEnrichedSku(record: InventoryItemRecord, alert?: RopAlert): EnrichedSkuItem {
  return {
    id: record.id,
    sku: record.sku,
    name: record.name,
    category: record.category,
    warehouseId: record.warehouseId ?? "",
    warehouseName: record.warehouseName,
    currentStock: num(record.currentStock),
    minStock: num(record.minStock),
    safetyStock: num(record.minStock),
    dailyBurnRate: num(alert?.dailyBurnRate),
    coverageDays:
      alert?.daysOfCoverage == null ? null : num(alert.daysOfCoverage),
    unitPriceCop:
      record.unitPriceCop == null ? null : num(record.unitPriceCop),
    ropThreshold: num(alert?.reorderPoint ?? record.minStock),
    status: toSkuStatus(alert?.status ?? record.status),
  };
}

export const StockInventoryView: React.FC<StockInventoryViewProps> = ({
  onNavigateTo,
}) => {
  const {
    summary,
    ropAlerts,
    items: inventoryRecords,
    loading: inventoryLoading,
    error: inventoryError,
    isFallback: inventoryIsFallback,
    refresh: refreshInventory,
    adjustStock,
  } = useInventoryData({
    refreshIntervalMs: 30000,
  });

  const items = useMemo(() => {
    const alertsByProduct = new Map(ropAlerts.map((alert) => [alert.productId, alert]));
    return inventoryRecords.map((record) =>
      toEnrichedSku(record, alertsByProduct.get(record.id)),
    );
  }, [inventoryRecords, ropAlerts]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [page, setPage] = useState(1);
  const [copiedSku, setCopiedSku] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  const handleCalculateReplenishment = () => {
    setIsSimulationOpen(false);
    showToast("La simulación es informativa y no modifica las existencias.");
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
        handleCalculateReplenishment();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // handleCalculateReplenishment se recrea en cada render.
    // se excluye a proposito para no re-suscribir el listener en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adjustModalSku, isSimulationOpen]);

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
      setAdjustModalSku(null);
      showToast(
        `Ajuste confirmado para ${target.sku}: ${adjustQuantity} unidades (${delta >= 0 ? `+${delta}` : delta}).`
      );
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  const handleExportCsv = () => {
    const header = ["SKU", "Producto", "Categoría", "Sede", "Existencias", "Mínimo / reorden", "Cobertura (días)", `Valor (${summary?.currency ?? "COP"})`, "Estado"];
    const rows = filteredItems.map((i) => [
      i.sku,
      i.name,
      i.category,
      i.warehouseName,
      i.currentStock,
      i.ropThreshold,
      i.coverageDays ?? "",
      i.unitPriceCop == null ? "" : i.currentStock * i.unitPriceCop,
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
        item.warehouseName.toLowerCase().includes(q);
      return matchesWarehouse && matchesStatus && matchesSearch;
    });
  }, [items, selectedWarehouse, selectedStatus, searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [selectedWarehouse, selectedStatus, searchQuery]);

  const pageSize = 10;
  const pageItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);

  // Cifras derivadas de los datos en pantalla (sin valores fijos)
  const counts = useMemo(() => {
    const c = { all: items.length, quiebre: 0, alerta: 0, optimo: 0, cuarentena: 0 };
    items.forEach((i) => {
      c[i.status] += 1;
    });
    return c;
  }, [items]);

  const atRiskCount = counts.quiebre + counts.alerta;
  const totalValue = summary?.totalValuation ?? 0;

  // Simulación de aumento de demanda sobre las referencias activas
  const simulation = useMemo(() => {
    const active = items.filter((i) => i.coverageDays !== null);
    const factor = 1 + demandSurgePct / 100;
    const baseline = active.filter((i) => i.coverageDays !== null && i.coverageDays < COVERAGE_RISK_DAYS);
    const projected = active.filter((i) => i.coverageDays !== null && i.coverageDays / factor < COVERAGE_RISK_DAYS);
    const capital = projected.reduce(
      (sum, i) =>
        sum + Math.max(0, Math.ceil(i.dailyBurnRate * factor * COVERAGE_TARGET_DAYS) - i.currentStock) * (i.unitPriceCop ?? 0),
      0
    );
    return { baseline: baseline.length, projected: projected.length, capital };
  }, [items, demandSurgePct]);

  const metrics: MetricItem[] = [
    {
      id: "referencias",
      value: String(summary?.totalSkus ?? counts.all),
      context: "Referencias registradas en el catálogo",
    },
    {
      id: "reorden",
      value: String(atRiskCount),
      context: "Referencias con alerta de reposición en la base de datos",
      auxiliary: <StatusIndicator status={atRiskCount > 0 ? "attention" : "ok"} label={atRiskCount > 0 ? "Requiere compra" : "Al día"} />,
    },
    {
      id: "valor",
      value: summary?.currency && summary.currency !== "COP"
        ? totalValue.toLocaleString("es-CO", { style: "currency", currency: summary.currency, notation: "compact", maximumFractionDigits: 1 })
        : formatCopCompact(totalValue),
      context: `Valoración del inventario (${summary?.currency ?? "moneda no especificada"})`,
      highlightBrand: true,
    },
  ];

  const statusTabs: TabItem[] = [
    { id: "all", label: "Todas", badge: counts.all },
    { id: "quiebre", label: "Se agota pronto", badge: counts.quiebre },
    { id: "alerta", label: "Bajo reorden", badge: counts.alerta },
    { id: "optimo", label: "Óptimo", badge: counts.optimo },
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
                  <span className="text-secondary tabular-nums">
                    {item.ropThreshold === item.minStock ? "Mínimo" : "Reorden"}: {item.ropThreshold}
                  </span>
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
          <span className={`block text-body tabular-nums ${item.coverageDays !== null && item.coverageDays < 4 ? "text-state-attention" : "text-primary"}`}>
            {item.coverageDays === null ? "Sin historial" : `${item.coverageDays.toFixed(1)} días`}
          </span>
          <span className="block text-caption text-secondary tabular-nums">
            {item.dailyBurnRate > 0 ? `${item.dailyBurnRate} u./día` : "Consumo no disponible"}
          </span>
        </div>
      ),
    },
    {
      key: "value",
      header: "Valor",
      align: "right",
      render: (item) => (
        <div>
          <span className="block text-body text-primary tabular-nums whitespace-nowrap">
            {item.unitPriceCop === null
              ? "Sin costo registrado"
              : (summary?.currency && summary.currency !== "COP"
                ? (item.currentStock * item.unitPriceCop).toLocaleString("es-CO", { style: "currency", currency: summary.currency, maximumFractionDigits: 0 })
                : formatCop(item.currentStock * item.unitPriceCop))}
          </span>
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
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed bottom-6 left-2 right-2 sm:left-auto sm:right-8 z-50 max-w-[calc(100vw-1rem)] px-4 py-2.5 rounded-pill flex items-center gap-3 bg-raised border border-strong text-body text-primary shadow-dialog"
          >
            <span className="w-2 h-2 rounded-pill bg-state-ok" />
            <span className="min-w-0 flex-1">{toastMessage}</span>
            <button onClick={() => setToastMessage(null)} className="text-secondary hover:text-primary cursor-pointer" title="Cerrar aviso">
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
            <Button onClick={handleCalculateReplenishment}>
              Calcular reposición
            </Button>
          </>
        }
        filterControl={<SegmentedTabs tabs={inventoryTabs} activeTab="inventario" onChange={(id) => onNavigateTo?.(id)} />}
      />

      {inventoryError && (
        <div
          role="alert"
          className="rounded-control border border-state-error/40 bg-state-error-surface px-compact py-compact text-caption text-state-error flex flex-wrap items-center justify-between gap-compact"
        >
          <span>
            {inventoryIsFallback
              ? `No se pudieron cargar datos reales del servicio de inventario: ${inventoryError}`
              : `El servicio de inventario reportó un problema: ${inventoryError}`}
          </span>
          <Button variant="ghost" size="table" onClick={() => void refreshInventory()} disabled={inventoryLoading}>
            Reintentar
          </Button>
        </div>
      )}

      <MetricStrip items={metrics} />

      <div className="flex flex-wrap items-center justify-between gap-element">
        <div className="flex flex-wrap items-center gap-compact">
          <div className="w-full sm:w-72" ref={searchInputRef}>
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
            <option value="all">Todas las sedes</option>
            {Array.from(new Map(items
              .filter((item) => item.warehouseId)
              .map((item) => [item.warehouseId, item.warehouseName])).entries()).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <SegmentedTabs tabs={statusTabs} activeTab={selectedStatus} onChange={setSelectedStatus} />
      </div>

      {inventoryLoading ? (
        <LoadingScreen
          title="Sincronizando inventario"
          subtitle="Consultando existencias y alertas de reposición."
          fullScreen={false}
        />
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
          data={pageItems}
          keyExtractor={(i) => i.id}
          emptyMessage="Ninguna referencia coincide con esos filtros. Cambia la sede o el estado, o borra la búsqueda."
        />
      )}
      {!inventoryLoading && filteredItems.length > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          totalItems={filteredItems.length}
          onPageChange={setPage}
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
        confirmLabel="Calcular reposición"
        cancelLabel="Cerrar"
        onConfirm={handleCalculateReplenishment}
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
