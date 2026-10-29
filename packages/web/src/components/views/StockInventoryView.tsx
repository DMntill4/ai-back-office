import React, { useState, useEffect, useRef, useMemo } from "react";
import { StockSkuItem } from "../../types/workflow";
import {
  Search,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  X,
  Plus,
  Minus,
} from "lucide-react";

export interface StockInventoryViewProps {
  onTriggerRebalance?: (sku: StockSkuItem) => void;
  onNavigateToInbox?: () => void;
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
    quarantineReason: "QUAR-2026-081.md: Discrepancia dimensional reportada por control de calidad.",
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

// Isometric Wireframe Illustrations (1px hairlines)
const IsometricRackWireframe: React.FC = () => (
  <svg viewBox="0 0 68 68" className="w-16 h-16 pointer-events-none opacity-40" fill="none">
    {/* Outer Isometric Cube Frame */}
    <polygon points="34,6 62,22 34,38 6,22" stroke="#10B981" strokeWidth="1" strokeDasharray="3 3" />
    <polygon points="6,22 34,38 34,62 6,46" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
    <polygon points="34,38 62,22 62,46 34,62" stroke="rgba(52,211,153,0.3)" strokeWidth="1" />
    {/* Internal Shelves */}
    <line x1="6" y1="30" x2="34" y2="46" stroke="#10B981" strokeWidth="1" strokeOpacity="0.5" />
    <line x1="34" y1="46" x2="62" y2="30" stroke="#10B981" strokeWidth="1" strokeOpacity="0.5" />
    <line x1="6" y1="38" x2="34" y2="54" stroke="#10B981" strokeWidth="1" strokeOpacity="0.5" />
    <line x1="34" y1="54" x2="62" y2="38" stroke="#10B981" strokeWidth="1" strokeOpacity="0.5" />
    {/* Shelf Uprights */}
    <line x1="20" y1="14" x2="20" y2="54" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
    <line x1="48" y1="14" x2="48" y2="54" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
  </svg>
);

const IsometricLedgerWireframe: React.FC = () => (
  <svg viewBox="0 0 68 68" className="w-16 h-16 pointer-events-none opacity-40" fill="none">
    {/* Stacked Isometric Blocks */}
    <polygon points="34,8 58,20 34,32 10,20" stroke="#10B981" strokeWidth="1" />
    <polygon points="10,20 34,32 34,40 10,28" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
    <polygon points="34,32 58,20 58,28 34,40" stroke="rgba(52,211,153,0.4)" strokeWidth="1" />

    <polygon points="34,22 58,34 34,46 10,34" stroke="#10B981" strokeWidth="1" strokeDasharray="2 2" />
    <polygon points="10,34 34,46 34,54 10,42" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
    <polygon points="34,46 58,34 58,42 34,54" stroke="rgba(52,211,153,0.3)" strokeWidth="1" />

    {/* Center node cross */}
    <circle cx="34" cy="20" r="2" fill="#10B981" />
  </svg>
);

const IsometricPrismWireframe: React.FC = () => (
  <svg viewBox="0 0 68 68" className="w-16 h-16 pointer-events-none opacity-40" fill="none">
    {/* Isometric Triangular Prism / Sensor Node */}
    <polygon points="34,6 60,30 8,30" stroke="#EF4444" strokeWidth="1" strokeDasharray="3 2" strokeOpacity="0.8" />
    <polygon points="8,30 60,30 34,60" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
    <line x1="34" y1="6" x2="34" y2="60" stroke="#EF4444" strokeWidth="1" strokeOpacity="0.5" />
    <circle cx="34" cy="30" r="3" fill="#EF4444" fillOpacity="0.6" stroke="#fff" strokeWidth="0.8" />
  </svg>
);

export const StockInventoryView: React.FC<StockInventoryViewProps> = ({
  onTriggerRebalance,
  onNavigateToInbox,
}) => {
  const [items, setItems] = useState<EnrichedSkuItem[]>(EXTENDED_STOCK_DATA);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedSku, setCopiedSku] = useState<string | null>(null);

  // Notifications and live agent status
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);

  // Modals state
  const [adjustModalSku, setAdjustModalSku] = useState<EnrichedSkuItem | null>(null);
  const [adjustQuantity, setAdjustQuantity] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>("Descuadre en conteo físico cíclico");
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);

  // Simulation modal state
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);
  const [demandSurgePct, setDemandSurgePct] = useState<number>(35);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Hotkeys: Cmd+F / Ctrl+F -> Search, R -> POs, Esc -> Close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (e.key === "Escape") {
        if (adjustModalSku) setAdjustModalSku(null);
        if (isSimulationOpen) setIsSimulationOpen(false);
        return;
      }

      if (!isInput && !adjustModalSku && !isSimulationOpen) {
        if (e.key.toLowerCase() === "r") {
          e.preventDefault();
          handleGeneratePOs();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [adjustModalSku, isSimulationOpen]);

  const showToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleCopySku = (sku: string) => {
    navigator.clipboard?.writeText(sku);
    setCopiedSku(sku);
    setTimeout(() => setCopiedSku(null), 1800);
    showToast(`SKU ${sku} copiado al portapapeles.`);
  };

  const handleGeneratePOs = () => {
    setIsAuditing(true);
    setTimeout(() => {
      setIsAuditing(false);
      showToast(
        "inventarioSpecialist: 2 propuestas de órdenes de compra formuladas en /inbox."
      );
      if (onNavigateToInbox) {
        setTimeout(() => onNavigateToInbox(), 1000);
      }
    }, 700);
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
      const updated = items.map((i) =>
        i.sku === adjustModalSku.sku
          ? {
              ...i,
              currentStock: adjustQuantity,
              status:
                adjustQuantity <= i.safetyStock
                  ? ("quiebre" as const)
                  : adjustQuantity <= i.ropThreshold
                  ? ("alerta" as const)
                  : ("optimo" as const),
            }
          : i
      );
      setItems(updated);
      setIsSubmittingAdjust(false);
      setAdjustModalSku(null);
      showToast(
        `Ajuste confirmado para ${adjustModalSku.sku}: Stock ajustado a ${adjustQuantity} un. (Δ ${delta >= 0 ? `+${delta}` : delta} un.). Firma HMAC-256 asentada.`
      );
    }, 600);
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesWarehouse =
        selectedWarehouse === "all" || item.warehouseId === selectedWarehouse;
      const matchesStatus =
        selectedStatus === "all" || item.status === selectedStatus;
      const matchesSearch =
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.locationRack.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesWarehouse && matchesStatus && matchesSearch;
    });
  }, [items, selectedWarehouse, selectedStatus, searchQuery]);

  // Depletion projection mini-bars data for Cell 1
  const criticalItems = useMemo(
    () =>
      items
        .filter((i) => i.status === "quiebre" || i.status === "alerta")
        .sort((a, b) => a.coverageDays - b.coverageDays)
        .slice(0, 3),
    [items]
  );

  // Equalizer Segmented Mini-Bar Renderer (2px blocks)
  const renderEqualizerBar = (coverageDays: number) => {
    const totalBlocks = 14;
    // Map 0 to 6 days to 0 to 14 blocks
    const filledBlocks = Math.min(totalBlocks, Math.max(1, Math.round((coverageDays / 5) * totalBlocks)));
    const isCritical = coverageDays <= 2.5;

    return (
      <div className="flex items-center gap-[2px]">
        {Array.from({ length: totalBlocks }).map((_, idx) => {
          const isFilled = idx < filledBlocks;
          return (
            <span
              key={idx}
              className={`w-[2.5px] h-[7px] rounded-[0.5px] ${
                isFilled
                  ? isCritical
                    ? "bg-[#EF4444]"
                    : "bg-[#F59E0B]"
                  : "bg-white/[0.06]"
              }`}
            />
          );
        })}
      </div>
    );
  };

  // Sparkline Renderer with text to the right
  const renderSparklineWithPct = (points: number[], trendPct: number) => {
    const min = Math.min(...points);
    const max = Math.max(...points) || 1;
    const range = max - min || 1;
    const width = 46;
    const height = 13;
    const coords = points
      .map((p, idx) => {
        const x = (idx / (points.length - 1)) * width;
        const y = height - ((p - min) / range) * (height - 2) - 1;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

    const isPositive = trendPct >= 0;
    const strokeColor = isPositive ? "#10B981" : "#EF4444";

    return (
      <div className="flex items-center gap-2">
        <svg width={width} height={height} className="overflow-visible inline-block">
          <polyline
            fill="none"
            stroke={strokeColor}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={coords}
          />
        </svg>
        <span
          className={`font-mono text-[10px] font-semibold tabular-nums ${
            isPositive ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {isPositive ? `+${trendPct.toFixed(1)}%` : `${trendPct.toFixed(1)}%`}
        </span>
      </div>
    );
  };

  // Precision Linear Gauge (100px ruler with white tick mark for ROP)
  const renderPrecisionGauge = (current: number, rop: number, status: string) => {
    const max = Math.max(rop * 1.5, current * 1.1) || 1;
    const fillPct = Math.min(100, Math.max(3, (current / max) * 100));
    const ropTickPct = Math.min(96, (rop / max) * 100);

    const fillColor =
      status === "quiebre"
        ? "#EF4444"
        : status === "alerta"
        ? "#F59E0B"
        : "#10B981";

    return (
      <div className="flex items-center gap-2.5">
        <div className="relative w-[100px] h-[5px] bg-[#121A15] rounded-[1px] overflow-hidden">
          {/* Fill Bar */}
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${fillPct}%`, backgroundColor: fillColor }}
          />
          {/* ROP White Graduation Tick */}
          <span
            className="absolute top-0 bottom-0 w-[1.5px] bg-white z-10 shadow-sm"
            style={{ left: `${ropTickPct}%` }}
            title={`ROP: ${rop} un.`}
          />
        </div>
        <div className="font-mono text-[11px] tabular-nums whitespace-nowrap flex items-baseline gap-1">
          <span className={`font-semibold ${status === "quiebre" ? "text-rose-400 font-bold" : "text-white"}`}>
            {current.toString().padStart(2, "0")} u.
          </span>
          <span className="text-[10px] text-zinc-500">/ {rop} ROP</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-[#040705] text-[#F9FAFB] font-sans select-none overflow-hidden">
      {/* ========================================================= */}
      {/* A. BARRA SUPERIOR DE TELEMETRÍA E IDENTIDAD (44px)        */}
      {/* ========================================================= */}
      <header className="h-[44px] flex-none px-4 bg-[#040705] border-b border-white/[0.07] flex items-center justify-between z-20">
        {/* Left: Breadcrumb + Divider + Compact Title + Monospace LED Status */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-[#8E9893] uppercase tracking-wider">
            OPERACIONES / STOCK_&_ROP
          </span>
          <span className="text-white/20 font-mono text-[11px]">|</span>
          <h1 className="text-[15px] font-semibold text-[#F9FAFB] tracking-tight">
            Inventario
          </h1>
          <span className="text-white/20 font-mono text-[11px]">|</span>
          {/* Plain Monospace Status with 6x6px Square Pulsing LED */}
          <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-400">
            <span className="w-[6px] h-[6px] rounded-[1px] bg-[#10B981] animate-pulse inline-block shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span>verificarFrescuraDatos() · 14s · pg_local</span>
          </div>
        </div>

        {/* Right: Embedded Search + Technical Button */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar SKU, producto o rack..."
              className="h-[28px] w-72 bg-[#070C09] border border-white/[0.08] hover:border-white/20 focus:border-[#10B981]/60 focus:bg-[#070C09] rounded-[3px] pl-8 pr-9 text-xs text-white placeholder:text-zinc-600 focus:outline-none font-mono transition-all"
            />
            <span className="absolute right-2 text-[10px] font-mono text-zinc-500 pointer-events-none">
              ⌘F
            </span>
          </div>

          <button
            onClick={() => setIsSimulationOpen(true)}
            className="h-[28px] px-3 rounded-[3px] bg-[#070C09] border border-white/[0.08] border-t-emerald-500/80 hover:border-emerald-500/60 hover:bg-[#0A120D] text-emerald-400 font-mono text-[11px] font-medium flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(16,185,129,0.08)]"
          >
            <Sparkles className="w-3 h-3 text-[#34D399]" />
            <span>✦ Simular Escenario [simularEscenario]</span>
          </button>
        </div>
      </header>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-12 right-6 z-50 px-3.5 py-2 rounded-[3px] bg-[#070C09] border border-emerald-500/40 text-emerald-300 font-mono text-xs flex items-center gap-2.5 shadow-2xl backdrop-blur-md">
          <span className="w-1.5 h-1.5 rounded-[1px] bg-emerald-400 animate-pulse" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-zinc-500 hover:text-white ml-1">✕</button>
        </div>
      )}

      {/* ========================================================= */}
      {/* B. BANDA DE INSTRUMENTACIÓN (190px - HAIRLINE GRID)       */}
      {/* ========================================================= */}
      <div className="h-[190px] flex-none grid grid-cols-12 bg-[#121A15] gap-[1px] border-b border-white/[0.07] relative">
        {/* Crosshairs at grid borders */}
        <span className="absolute -bottom-[3px] left-[41.666%] text-[10px] font-mono text-emerald-400/40 select-none pointer-events-none z-20 leading-none">+</span>
        <span className="absolute -bottom-[3px] left-[75%] text-[10px] font-mono text-emerald-400/40 select-none pointer-events-none z-20 leading-none">+</span>

        {/* CELDA 1 (Col-Span 5) — MONITOR ROP CRÍTICO */}
        <div
          className="col-span-5 bg-[#040705] p-3.5 flex flex-col justify-between relative overflow-hidden group"
          style={{
            background: "radial-gradient(80% 50% at 50% 0%, rgba(16, 185, 129, 0.08) 0%, #040705 100%)",
          }}
        >
          {/* Reactive Dot Matrix (Amber/Crimson Tint) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(rgba(239, 68, 68, 0.16) 1px, transparent 1px)",
              backgroundSize: "12px 12px",
              maskImage: "linear-gradient(to bottom, black 20%, transparent 95%)",
              WebkitMaskImage: "linear-gradient(to bottom, black 20%, transparent 95%)",
            }}
          />

          {/* Isometric Wireframe Rack in Top-Right Corner */}
          <div className="absolute top-2 right-2">
            <IsometricRackWireframe />
          </div>

          {/* Cell Header */}
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#6B7280]">
              01 // MONITOR ROP CRÍTICO
            </span>
            <span className="font-mono text-[10px] text-emerald-400/90 pr-16">
              fn: inventario_rop
            </span>
          </div>

          {/* 2-Column Internal Layout */}
          <div className="grid grid-cols-12 gap-3 relative z-10 my-auto items-center">
            {/* Left Column: Number 08 + Label + [R] Generar POs Button */}
            <div className="col-span-5">
              <div className="flex items-baseline gap-2">
                <span className="text-[44px] font-light font-mono tracking-tighter text-white tabular-nums leading-none">
                  08
                </span>
                <span className="text-[10px] font-mono text-rose-400 uppercase font-semibold">
                  SKUs
                </span>
              </div>
              <span className="text-[10px] font-mono text-zinc-400 block mt-1 leading-snug">
                Bajo punto de reorden crítico
              </span>
              <button
                onClick={handleGeneratePOs}
                disabled={isAuditing}
                className="mt-2.5 h-[24px] px-2.5 rounded-[3px] bg-[#0E1611] border border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-500/10 text-emerald-400 font-mono text-[10px] flex items-center gap-1.5 transition-all"
              >
                <RefreshCw className={`w-2.5 h-2.5 ${isAuditing ? "animate-spin" : ""}`} />
                <span>[R] Generar POs</span>
              </button>
            </div>

            {/* Right Column: 3 Depletion Items with Segmented Equalizer Bars */}
            <div className="col-span-7 space-y-2 border-l border-white/[0.06] pl-3">
              <span className="text-[9px] font-mono text-zinc-500 uppercase block tracking-wider mb-1">
                Agotamiento Inminente (Lead Time)
              </span>
              {criticalItems.map((item) => (
                <div key={item.id} className="space-y-0.5">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-zinc-300 truncate max-w-[130px]">{item.name}</span>
                    <span className="text-amber-400 font-bold tabular-nums">
                      {item.coverageDays.toFixed(1)}d
                    </span>
                  </div>
                  {renderEqualizerBar(item.coverageDays)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CELDA 2 (Col-Span 4) — INTEGRIDAD DE CATÁLOGO (LEDGER MATRIX) */}
        <div
          className="col-span-4 bg-[#040705] p-3.5 flex flex-col justify-between relative overflow-hidden group"
          style={{
            background: "radial-gradient(80% 50% at 50% 0%, rgba(16, 185, 129, 0.11) 0%, #040705 100%)",
          }}
        >
          {/* Reactive Dot Matrix (Emerald Tint) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(rgba(16, 185, 129, 0.18) 1px, transparent 1px)",
              backgroundSize: "12px 12px",
              maskImage: "linear-gradient(to bottom, black 20%, transparent 95%)",
              WebkitMaskImage: "linear-gradient(to bottom, black 20%, transparent 95%)",
            }}
          />

          {/* Isometric Wireframe Ledger in Top-Right Corner */}
          <div className="absolute top-2 right-2">
            <IsometricLedgerWireframe />
          </div>

          {/* Cell Header */}
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#6B7280]">
              02 // INTEGRIDAD DE CATÁLOGO
            </span>
            <span className="font-mono text-[10px] text-emerald-400/90 pr-16">
              fn: dataHealthService
            </span>
          </div>

          {/* Center: Memory Block Matrix / Ledger (40 blocks: 39 emerald, 1 blinking amber) + 98.4% */}
          <div className="relative z-10 my-auto">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-[36px] font-light font-mono tracking-tighter text-emerald-400 tabular-nums leading-none">
                98.4%
              </span>
              <span className="text-[10px] font-mono text-zinc-400">
                Consistencia Criptográfica
              </span>
            </div>

            {/* Matrix of 40 small blocks (4x14px) */}
            <div className="flex items-center gap-[2px] p-1.5 rounded-[2px] bg-[#070C09] border border-white/[0.04]">
              {Array.from({ length: 40 }).map((_, idx) => {
                const isAnomaly = idx === 28; // 1 block blinks in amber
                return (
                  <span
                    key={idx}
                    title={isAnomaly ? "Discrepancia en Bloque 28 (QUAR-081)" : "Bloque OK"}
                    className={`flex-1 h-[14px] rounded-[1px] transition-all ${
                      isAnomaly
                        ? "bg-[#F59E0B] animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]"
                        : "bg-[#10B981] opacity-80 hover:opacity-100"
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Bottom Telemetry Table with Dot Leaders */}
          <div className="space-y-1 font-mono text-[10px] text-zinc-400 relative z-10 pt-1 border-t border-white/[0.04]">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Registros Activos</span>
              <span className="text-zinc-600">.......................</span>
              <span className="text-white font-medium">338 SKUs</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Vault Cuarentena</span>
              <span className="text-zinc-600">......................</span>
              <span className="text-amber-400 font-medium">4 [QUAR-*.md]</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Sync Latency</span>
              <span className="text-zinc-600">..........................</span>
              <span className="text-emerald-400 font-medium">1.2 ms</span>
            </div>
          </div>
        </div>

        {/* CELDA 3 (Col-Span 3) — STREAM DE ANOMALÍAS DETECTADAS */}
        <div
          className="col-span-3 bg-[#040705] p-3.5 flex flex-col justify-between relative overflow-hidden group"
          style={{
            background: "radial-gradient(80% 50% at 50% 0%, rgba(16, 185, 129, 0.06) 0%, #040705 100%)",
          }}
        >
          {/* Reactive Dot Matrix */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(rgba(16, 185, 129, 0.14) 1px, transparent 1px)",
              backgroundSize: "12px 12px",
              maskImage: "linear-gradient(to bottom, black 20%, transparent 95%)",
              WebkitMaskImage: "linear-gradient(to bottom, black 20%, transparent 95%)",
            }}
          />

          {/* Isometric Wireframe Prism in Top-Right Corner */}
          <div className="absolute top-2 right-2">
            <IsometricPrismWireframe />
          </div>

          {/* Cell Header */}
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#6B7280]">
              03 // ANOMALÍAS DETECTADAS
            </span>
            <span className="font-mono text-[10px] text-emerald-400/90 pr-16">
              fn: auditarAnomalias
            </span>
          </div>

          {/* Terminal Log List with 1px dividers */}
          <div className="divide-y divide-white/[0.04] relative z-10 font-mono text-[10px]">
            <div className="py-1.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-[2px] h-[12px] bg-[#EF4444] rounded-[0.5px] flex-none" />
                <span className="text-rose-400 font-bold flex-none">DISC7</span>
                <span className="text-zinc-400 truncate">Stock 8 &lt; ROP 25</span>
              </div>
              <span className="text-zinc-600 flex-none">4m</span>
            </div>

            <div className="py-1.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-[2px] h-[12px] bg-[#F59E0B] rounded-[0.5px] flex-none" />
                <span className="text-amber-400 font-bold flex-none">HEXG8</span>
                <span className="text-zinc-400 truncate">Burn rate +33% acelerado</span>
              </div>
              <span className="text-zinc-600 flex-none">18m</span>
            </div>

            <div className="py-1.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-[2px] h-[12px] bg-[#3B82F6] rounded-[0.5px] flex-none" />
                <span className="text-blue-400 font-bold flex-none">VAL01</span>
                <span className="text-zinc-400 truncate">Discrepancia dim. QA</span>
              </div>
              <span className="text-zinc-600 flex-none">1h</span>
            </div>

            <div className="py-1.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-[2px] h-[12px] bg-[#10B981] rounded-[0.5px] flex-none" />
                <span className="text-emerald-400 font-bold flex-none">IMP20</span>
                <span className="text-zinc-400 truncate">Rebalanceo BOG -&gt; BGA</span>
              </div>
              <span className="text-zinc-600 flex-none">2h</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* C. BARRA DE SUB-NAVEGACIÓN Y FILTROS DE SEDE (38px)       */}
      {/* ========================================================= */}
      <div className="h-[38px] flex-none px-4 bg-[#060A08] border-b border-white/[0.07] flex items-center justify-between z-10 text-xs">
        {/* Left: Sedes Tabs with 2px bottom emerald line (ZERO pills) */}
        <div className="flex items-center h-full space-x-5">
          <button
            onClick={() => setSelectedWarehouse("all")}
            className={`h-full flex items-center text-xs transition-colors relative ${
              selectedWarehouse === "all"
                ? "text-white font-medium"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span>Todas las sedes (3)</span>
            {selectedWarehouse === "all" && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#10B981]" />
            )}
          </button>

          <button
            onClick={() => setSelectedWarehouse("wh_bga")}
            className={`h-full flex items-center text-xs transition-colors relative ${
              selectedWarehouse === "wh_bga"
                ? "text-white font-medium"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span>Bodega Matriz Bucaramanga</span>
            {selectedWarehouse === "wh_bga" && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#10B981]" />
            )}
          </button>

          <button
            onClick={() => setSelectedWarehouse("wh_bog")}
            className={`h-full flex items-center text-xs transition-colors relative ${
              selectedWarehouse === "wh_bog"
                ? "text-white font-medium"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span>CD Bogotá D.C.</span>
            {selectedWarehouse === "wh_bog" && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#10B981]" />
            )}
          </button>

          <button
            onClick={() => setSelectedWarehouse("wh_med")}
            className={`h-full flex items-center text-xs transition-colors relative ${
              selectedWarehouse === "wh_med"
                ? "text-white font-medium"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span>CD Medellín</span>
            {selectedWarehouse === "wh_med" && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#10B981]" />
            )}
          </button>
        </div>

        {/* Right: Status Filters with Monospace Bracketed Counters */}
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <button
            onClick={() => setSelectedStatus("all")}
            className={`transition-colors ${
              selectedStatus === "all" ? "text-emerald-400 font-bold" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Todos <span className="text-zinc-400">[338]</span>
          </button>
          <span className="text-white/10">·</span>

          <button
            onClick={() => setSelectedStatus("quiebre")}
            className={`flex items-center gap-1 transition-colors ${
              selectedStatus === "quiebre" ? "text-rose-400 font-bold" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-[1px] bg-rose-500" />
            <span>Quiebre</span> <span className="text-rose-400/80">[8]</span>
          </button>
          <span className="text-white/10">·</span>

          <button
            onClick={() => setSelectedStatus("alerta")}
            className={`flex items-center gap-1 transition-colors ${
              selectedStatus === "alerta" ? "text-amber-400 font-bold" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-[1px] bg-amber-500" />
            <span>Riesgo ROP</span> <span className="text-amber-400/80">[14]</span>
          </button>
          <span className="text-white/10">·</span>

          <button
            onClick={() => setSelectedStatus("optimo")}
            className={`flex items-center gap-1 transition-colors ${
              selectedStatus === "optimo" ? "text-emerald-400 font-bold" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span>Óptimo</span> <span className="text-zinc-400">[312]</span>
          </button>
          <span className="text-white/10">·</span>

          <button
            onClick={() => setSelectedStatus("cuarentena")}
            className={`flex items-center gap-1 transition-colors ${
              selectedStatus === "cuarentena" ? "text-indigo-400 font-bold" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span>Cuarentena</span> <span className="text-zinc-400">[4]</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* D. DATA GRID DE ALTA DENSIDAD (OCUPA RESTO VERTICAL)      */}
      {/* ========================================================= */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-[#040705]">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 h-[28px] bg-[#070C09] border-b border-white/[0.07] text-zinc-500 font-mono text-[10px] uppercase tracking-wider">
            <tr>
              <th className="px-4 font-medium w-36">SKU</th>
              <th className="px-3 font-medium">PRODUCTO / LOTE</th>
              <th className="px-3 font-medium">UBICACIÓN</th>
              <th className="px-3 font-medium w-48">STOCK vs. ROP</th>
              <th className="px-3 font-medium w-36">TENDENCIA (7D)</th>
              <th className="px-3 font-medium w-32">ESTADO</th>
              <th className="px-4 font-medium text-right w-28">ACCIÓN</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {filteredItems.map((item) => {
              const isQuarantine = item.status === "cuarentena";
              const isAlert = item.status === "alerta";
              const isCritical = item.status === "quiebre";

              return (
                <tr
                  key={item.id}
                  className="group h-[38px] min-h-[38px] max-h-[38px] transition-colors relative hover:bg-[#070C09] hover:bg-opacity-80"
                >
                  {/* SKU Column */}
                  <td className="px-4 font-mono text-[11px] font-bold text-[#34D399] whitespace-nowrap relative">
                    {/* Instant 2px Left indicator on hover */}
                    <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#10B981] opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-1.5">
                      <span>{item.sku}</span>
                      <button
                        onClick={() => handleCopySku(item.sku)}
                        className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-white transition-opacity"
                        title="Copiar SKU"
                      >
                        {copiedSku === item.sku ? (
                          <Check className="w-2.5 h-2.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-2.5 h-2.5" />
                        )}
                      </button>
                    </div>
                  </td>

                  {/* PRODUCTO / LOTE Column (Single Line) */}
                  <td className="px-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-normal text-[#F3F4F6] truncate max-w-[280px]">
                        {item.name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-[2px] bg-[#0E1511] border border-white/[0.06] font-mono text-[10px] text-zinc-400 flex-none">
                        {item.lotNumber}
                      </span>
                    </div>
                  </td>

                  {/* UBICACIÓN Column (Single Line) */}
                  <td className="px-3 whitespace-nowrap font-mono text-[11px] text-zinc-400">
                    {item.locationRack}
                  </td>

                  {/* STOCK vs. ROP Precision Gauge */}
                  <td className="px-3 whitespace-nowrap">
                    {renderPrecisionGauge(item.currentStock, item.ropThreshold, item.status)}
                  </td>

                  {/* TENDENCIA (7D) Sparkline with Percentage at Right */}
                  <td className="px-3 whitespace-nowrap">
                    {renderSparklineWithPct(item.demandHistory, item.demandTrendPct)}
                  </td>

                  {/* ESTADO: Glowing 6x6px square + Plain Uppercase Text (NO OVAL PILL) */}
                  <td className="px-3 whitespace-nowrap">
                    <div className="flex items-center gap-2 font-mono text-[10px] uppercase font-bold tracking-wider">
                      <span
                        className={`w-[6px] h-[6px] rounded-[1px] flex-none ${
                          isCritical
                            ? "bg-[#EF4444] shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                            : isAlert
                            ? "bg-[#F59E0B] shadow-[0_0_8px_rgba(245,158,11,0.8)]"
                            : isQuarantine
                            ? "bg-[#818CF8] shadow-[0_0_8px_rgba(129,140,248,0.8)]"
                            : "bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                        }`}
                      />
                      <span
                        className={
                          isCritical
                            ? "text-[#EF4444]"
                            : isAlert
                            ? "text-[#F59E0B]"
                            : isQuarantine
                            ? "text-[#818CF8]"
                            : "text-[#10B981]"
                        }
                      >
                        {item.status.toUpperCase()}
                      </span>
                    </div>
                  </td>

                  {/* ACCIÓN Technical Button (Illuminates on row hover) */}
                  <td className="px-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => openAdjustModal(item)}
                      className="px-2 py-0.5 rounded-[2px] bg-[#0A0F0C] border border-white/[0.06] group-hover:border-emerald-500/40 text-zinc-400 group-hover:text-emerald-300 font-mono text-[10px] opacity-70 group-hover:opacity-100 transition-all"
                    >
                      [Ajustar ⌘E]
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ========================================================= */}
      {/* MODAL DE AJUSTE RÁPIDO DE INVENTARIO                      */}
      {/* ========================================================= */}
      {adjustModalSku && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[3px] bg-[#070C09] border border-white/[0.1] border-t-emerald-500 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <span className="font-mono text-[10px] text-emerald-400 block">
                  AJUSTE DE STOCK FÍSICO · TAURI RUNTIME
                </span>
                <h3 className="text-sm font-bold text-white tracking-tight mt-0.5">
                  {adjustModalSku.sku} — {adjustModalSku.name}
                </h3>
              </div>
              <button
                onClick={() => setAdjustModalSku(null)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 font-mono">
              <div className="flex items-center justify-between bg-[#040705] p-2.5 rounded-[2px] border border-white/[0.04]">
                <span className="text-zinc-400">Stock Actual en DB:</span>
                <span className="text-white font-bold">{adjustModalSku.currentStock} un.</span>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 font-sans font-medium">
                  Nuevo Conteo Físico Verificado (unidades):
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustQuantity((prev) => Math.max(0, prev - 1))}
                    className="w-8 h-8 rounded-[2px] bg-[#0E1511] border border-white/[0.08] text-white flex items-center justify-center hover:border-emerald-500/50"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    value={adjustQuantity}
                    onChange={(e) => setAdjustQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                    className="flex-1 h-8 bg-[#040705] border border-white/[0.08] focus:border-emerald-500 rounded-[2px] text-center font-bold text-emerald-400 font-mono text-sm focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setAdjustQuantity((prev) => prev + 1)}
                    className="w-8 h-8 rounded-[2px] bg-[#0E1511] border border-white/[0.08] text-white flex items-center justify-center hover:border-emerald-500/50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 font-sans font-medium">
                  Motivo de Ajuste Contable:
                </label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full h-8 bg-[#040705] border border-white/[0.08] rounded-[2px] px-2 text-zinc-300 font-sans text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="Descuadre en conteo físico cíclico">Descuadre en conteo físico cíclico</option>
                  <option value="Merma o rotura en bodega">Merma o rotura en bodega</option>
                  <option value="Devolución de cliente no registrada">Devolución de cliente no registrada</option>
                  <option value="Transferencia inter-bodegas pendiente">Transferencia inter-bodegas pendiente</option>
                </select>
              </div>

              <div className="p-2.5 rounded-[2px] bg-emerald-500/[0.05] border border-emerald-500/20 text-[10px] text-emerald-300 space-y-0.5">
                <span className="block font-bold">FIRMA DIGITAL HMAC-SHA256:</span>
                <span className="text-zinc-500 block">7f3a8b29c01d4e5f...asentada en /vault/Auditoria</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-white/[0.08]">
              <button
                onClick={() => setAdjustModalSku(null)}
                className="px-3 py-1.5 rounded-[2px] bg-transparent hover:bg-white/[0.04] text-zinc-400 text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmAdjust}
                disabled={isSubmittingAdjust}
                className="px-4 py-1.5 rounded-[2px] bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 font-medium text-xs flex items-center gap-1.5 transition-all"
              >
                <RefreshCw className={`w-3 h-3 ${isSubmittingAdjust ? "animate-spin" : ""}`} />
                <span>Confirmar Ajuste</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL DE SIMULACIÓN DE ESCENARIO DE DEMANDA               */}
      {/* ========================================================= */}
      {isSimulationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[3px] bg-[#070C09] border border-white/[0.1] border-t-emerald-500 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-xs font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#34D399]" />
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Simular Escenario de Stock [simularEscenario]
                </h3>
              </div>
              <button
                onClick={() => setIsSimulationOpen(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-400">Pico de Demanda Simulado:</span>
                  <span className="text-amber-400 font-bold">+{demandSurgePct}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={demandSurgePct}
                  onChange={(e) => setDemandSurgePct(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="p-3 rounded-[2px] bg-[#040705] border border-white/[0.04] space-y-1.5 text-[11px]">
                <span className="text-[10px] text-zinc-500 block uppercase font-sans font-bold">
                  Impacto Proyectado en ROP
                </span>
                <div className="flex justify-between">
                  <span className="text-zinc-400">SKUs en Quiebre Actual:</span>
                  <span className="text-rose-400 font-bold">8 SKUs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">SKUs tras Shock (+{demandSurgePct}%):</span>
                  <span className="text-rose-400 font-bold">19 SKUs (+11)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Capital Necesario Reorden:</span>
                  <span className="text-emerald-400 font-bold">$24.850.000 COP</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-white/[0.08]">
              <button
                onClick={() => setIsSimulationOpen(false)}
                className="px-3 py-1.5 rounded-[2px] bg-transparent hover:bg-white/[0.04] text-zinc-400 text-xs"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  showToast(`Escenario +${demandSurgePct}% aplicado: 11 nuevos SKUs entraron en zona de reorden.`);
                  setIsSimulationOpen(false);
                }}
                className="px-4 py-1.5 rounded-[2px] bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 font-medium te