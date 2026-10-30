import React, { useState, useEffect, useRef, useMemo } from "react";
import { StockSkuItem } from "../../types/workflow";
import { Search, Copy, Check, Minus, Plus, Download } from "lucide-react";
import { PageHeader } from "../ui/PageHeader";
import { SegmentedTabs, TabItem } from "../ui/SegmentedTabs";
import { MetricStrip, MetricItem } from "../ui/MetricStrip";
import { StatusIndicator, OperationalStatus } from "../ui/StatusIndicator";
import { Button } from "../ui/Button";
import { DataTable, TableColumn } from "../ui/DataTable";
import { InputField } from "../ui/InputField";
import { Dialog } from "../ui/Dialog";

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

const EXTENDED_STOCK_DATA: EnrichedSkuItem[] = [
  {
    id: "stk_disc7",
    sku: "SKU-COR-DISC7",
    name: "Disco Diamantado 7' Concreto",
    category: "Consumibles de Corte",
    warehouseId: "wh_bga",
    warehouseName: "Bodega Matriz Bucaramanga",
    locationRack: "Bucaramanga · P-B04 · Gaveta 12",
    lotNumber: "LT-2026-991A",
    currentStock: 8,
    minStock: 25,
    safetyStock: 10,
    dailyBurnRate: 2.1,
    coverageDays: 3.8,
    unitPriceCop: 45000,
    ropThreshold: 25,
    status: "quiebre",
    demandHistory: [14, 16, 18, 22, 25, 29, 31],
    demandTrendPct: 18.4,
  },
  {
    id: "stk_sm400",
    sku: "SKU-MAN-SM400",
    name: "Martillo Demoledor SDS-Max 1500W",
    category: "Maquinaria Pesada",
    warehouseId: "wh_bga",
    warehouseName: "Bodega Matriz Bucaramanga",
    locationRack: "Bucaramanga · Maquinaria · Bahía 01",
    lotNumber: "LT-2026-810B",
    currentStock: 3,
    minStock: 12,
    safetyStock: 5,
    dailyBurnRate: 0.8,
    coverageDays: 3.7,
    unitPriceCop: 1560000,
    ropThreshold: 12,
    status: "alerta",
    demandHistory: [4, 5, 4, 6, 7, 8, 9],
    demandTrendPct: 12.5,
  },
  {
    id: "stk_per_hex",
    sku: "SKU-PER-HEXG8",
    name: "Pernos Hexagonales Grado 8 1/2' x 3'",
    category: "Fijación y Tornillería",
    warehouseId: "wh_bga",
    warehouseName: "Bodega Matriz Bucaramanga",
    locationRack: "Bucaramanga · Gavetero G-14",
    lotNumber: "LT-2026-442T",
    currentStock: 120,
    minStock: 500,
    safetyStock: 200,
    dailyBurnRate: 57.1,
    coverageDays: 2.1,
    unitPriceCop: 3200,
    ropThreshold: 500,
    status: "quiebre",
    demandHistory: [210, 240, 290, 340, 380, 420, 490],
    demandTrendPct: 33.2,
  },
  {
    id: "stk_sol_e6013",
    sku: "SKU-SOL-E6013",
    name: "Soldadura E6013 1/8' Caja 20kg",
    category: "Soldadura y Ensamble",
    warehouseId: "wh_bga",
    warehouseName: "Bodega Matriz Bucaramanga",
    locationRack: "Bucaramanga · P-C01 · Estiba 04",
    lotNumber: "LT-2026-301C",
    currentStock: 14,
    minStock: 40,
    safetyStock: 15,
    dailyBurnRate: 4.1,
    coverageDays: 3.4,
    unitPriceCop: 210000,
    ropThreshold: 40,
    status: "alerta",
    demandHistory: [18, 21, 24, 28, 30, 34, 38],
    demandTrendPct: 14.8,
  },
  {
    id: "stk_imp20",
    sku: "SKU-TAL-IMP20",
    name: "Taladro de Impacto Inalámbrico 20V",
    category: "Herramientas Eléctricas",
    warehouseId: "wh_bog",
    warehouseName: "CD Bogotá D.C.",
    locationRack: "Bogotá · Rack 12 · Nivel 3",
    lotNumber: "LT-2026-118E",
    currentStock: 45,
    minStock: 15,
    safetyStock: 8,
    dailyBurnRate: 1.2,
    coverageDays: 37.5,
    unitPriceCop: 420000,
    ropThreshold: 15,
    status: "optimo",
    demandHistory: [12, 11, 10, 11, 12, 10, 9],
    demandTrendPct: -4.2,
  },
  {
    id: "stk_pul_ang",
    sku: "SKU-PUL-ANG45",
    name: "Pulidora Angular 4-1/2' 850W",
    category: "Herramientas Eléctricas",
    warehouseId: "wh_bog",
    warehouseName: "CD Bogotá D.C.",
    locationRack: "Bogotá · Rack 09 · Nivel 2",
    lotNumber: "LT-2026-559P",
    currentStock: 18,
    minStock: 20,
    safetyStock: 10,
    dailyBurnRate: 1.5,
    coverageDays: 12.0,
    unitPriceCop: 285000,
    ropThreshold: 20,
    status: "alerta",
    demandHistory: [10, 12, 13, 14, 15, 17, 18],
    demandTrendPct: 9.1,
  },
  {
    id: "stk_cas300",
    sku: "SKU-SEG-CAS300",
    name: "Casco de Seguridad Industrial Tipo II",
    category: "Protección Personal (EPP)",
    warehouseId: "wh_med",
    warehouseName: "CD Medellín",
    locationRack: "Medellín · Mezanine EPP · Bloque M-2",
    lotNumber: "LT-2026-773S",
    currentStock: 60,
    minStock: 30,
    safetyStock: 15,
    dailyBurnRate: 1.5,
    coverageDays: 40.0,
    unitPriceCop: 38000,
    ropThreshold: 30,
    status: "optimo",
    demandHistory: [16, 17, 15, 16, 17, 18, 16],
    demandTrendPct: 1.4,
  },
  {
    id: "stk_quar_val",
    sku: "SKU-QUAR-VAL01",
    name: "Válvula de Bola Inoxidable 2' ANSI 150",
    category: "Válvulas y Tubería",
    warehouseId: "wh_bga",
    warehouseName: "Bodega Matriz Bucaramanga",
    locationRack: "Bucaramanga · Zona Cuarentena · P-Q01",
    lotNumber: "LT-2026-081Q",
    currentStock: 4,
    minStock: 10,
    safetyStock: 4,
    dailyBurnRate: 0.1,
    coverageDays: 40.0,
    unitPriceCop: 640000,
    ropThreshold: 10,
    status: "cuarentena",
    quarantineReason: "Discrepancia dimensional reportada por control de calidad.",
    demandHistory: [2, 1, 0, 0, 0, 0, 0],
    demandTrendPct: 0.0,
  },
  {
    id: "stk_bro_con",
    sku: "SKU-BRO-CON12",
    name: "Broca para Concreto SDS Plus 1/2' x 6'",
    category: "Consumibles de Perforación",
    warehouseId: "wh_bga",
    warehouseName: "Bodega Matriz Bucaramanga",
    locationRack: "Bucaramanga · P-B02 · Gaveta 08",
    lotNumber: "LT-2026-224D",
    currentStock: 12,
    minStock: 35,
    safetyStock: 12,
    dailyBurnRate: 3.4,
    coverageDays: 3.5,
    unitPriceCop: 22000,
    ropThreshold: 35,
    status: "alerta",
    demandHistory: [10, 14, 18, 22, 28, 30, 36],
    demandTrendPct: 24.1,
  },
  {
    id: "stk_tub_pvc",
    sku: "SKU-TUB-PVC03",
    name: "Tubo Presión PVC RDE 21 3' x 6m",
    category: "Tubería y Accesorios",
    warehouseId: "wh_bog",
    warehouseName: "CD Bogotá D.C.",
    locationRack: "Bogotá · Patio Tubos · Bahía 03",
    lotNumber: "LT-2026-619A",
    currentStock: 85,
    minStock: 40,
    safetyStock: 20,
    dailyBurnRate: 2.2,
    coverageDays: 38.6,
    unitPriceCop: 84000,
    ropThreshold: 40,
    status: "optimo",
    demandHistory: [18, 20, 22, 21, 24, 25, 26],
    demandTrendPct: 5.6,
  },
  {
    id: "stk_cor_cab",
    sku: "SKU-COR-CAB10",
    name: "Cable Cobre Cuadruplex 2 AWG (m)",
    category: "Material Eléctrico",
    warehouseId: "wh_med",
    warehouseName: "CD Medellín",
    locationRack: "Medellín · Carretel C-04",
    lotNumber: "LT-2026-788M",
    currentStock: 320,
    minStock: 150,
    safetyStock: 80,
    dailyBurnRate: 9.8,
    coverageDays: 32.6,
    unitPriceCop: 14500,
    ropThreshold: 150,
    status: "optimo",
    demandHistory: [70, 75, 82, 85, 90, 94, 98],
    demandTrendPct: 8.2,
  },
  {
    id: "stk_dis_met",
    sku: "SKU-DIS-MET45",
    name: "Disco de Corte Metal 4-1/2' x 1/16'",
    category: "Consumibles de Corte",
    warehouseId: "wh_bga",
    warehouseName: "Bodega Matriz Bucaramanga",
    locationRack: "Bucaramanga · P-B04 · Gaveta 03",
    lotNumber: "LT-2026-902K",
    currentStock: 24,
    minStock: 100,
    safetyStock: 40,
    dailyBurnRate: 14.2,
    coverageDays: 1.7,
    unitPriceCop: 4200,
    ropThreshold: 100,
    status: "quiebre",
    demandHistory: [40, 52, 68, 79, 90, 110, 128],
    demandTrendPct: 42.0,
  },
];

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

export const StockInventoryView: React.FC<StockInventoryViewProps> = ({
  onNavigateToInbox,
  onNavigateTo,
}) => {
  const [items, setItems] = useState<EnrichedSkuItem[]>(EXTENDED_STOCK_DATA);
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

  const handleConfirmAdjust = () => {
    if (!adjustModalSku) return;
    setIsSubmittingAdjust(true);
    setTimeout(() => {
      const delta = adjustQuantity - adjustModalSku.currentStock;
      setItems(
        items.map((i) =>
          i.sku === adjustModalSku.sku
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
      setIsSubmittingAdjust(false);
      setAdjustModalSku(null);
      showToast(
        `Ajuste confirmado para ${adjustModalSku.sku}: ${adjustQuantity} unidades (${
          delta >= 0 ? `+${delta}` : delta
        }).`
      );
    }, 600);
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

      <DataTable
        columns={columns}
        data={filteredItems}
        keyExtractor={(i) => i.id}
        emptyMessage="Ninguna referencia coincide con esos filtros. Cambia la sede o el estado, o borra la búsqueda."
      />

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





