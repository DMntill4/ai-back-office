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
  Download,
  AlertTriangle,
  CheckCircle2,
  Package,
  Boxes,
  ShieldAlert,
  Wrench,
  ArrowUpRight,
  TrendingUp,
  ChevronRight,
  FileText,
} from "lucide-react";
import { KpiStrip } from "../ui/KpiStrip";
import { StatusBadge } from "../ui/StatusBadge";

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
      const isInput =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";

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
      showToast("Propuestas de reorden formuladas por el agente para 8 SKUs críticos.");
      if (onNavigateToInbox) {
        setTimeout(() => onNavigateToInbox(), 900);
      }
    }, 600);
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
        `Ajuste confirmado para ${adjustModalSku.sku}: Stock ajustado a ${adjustQuantity} un. (Δ ${
          delta >= 0 ? `+${delta}` : delta
        } un.). Firma HMAC-256 asentada.`
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

  // Project Analytics (Donezo Style Demand & Burn-rate bars)
  const demandDays = [
    { day: "L", val: 65, type: "solid", label: "24 u." },
    { day: "M", val: 88, type: "deep", label: "31 u." },
    { day: "M", val: 55, type: "hatched", label: "20 u." },
    { day: "J", val: 100, type: "deep", label: "36 u. Pico", peak: true },
    { day: "V", val: 78, type: "hatched", label: "28 u." },
    { day: "S", val: 42, type: "solid", label: "15 u." },
    { day: "D", val: 32, type: "hatched", label: "12 u." },
  ];

  return (
    <div className="flex-1 h-full overflow-y-auto bg-canvas text-[#F9FAFB] font-sans select-none p-6 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-8 z-50 px-4 py-3 rounded-full flex items-center gap-3 bg-[#0A160E]/95 border border-[#10B981]/40 text-[#34D399] shadow-[0_0_25px_rgba(16,185,129,0.25)] backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
          <span className="text-xs font-mono font-medium">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-[#8E9893] hover:text-white text-xs ml-1">
            ✕
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. HEADER EJECUTIVO LIMPIO                                */}
      {/* ========================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Inventario y Salud de Stock
          </h1>
          <p className="text-xs text-txt-secondary mt-0.5">
            Monitoreo autónomo de punto de reorden (ROP) y balanceo entre sedes
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Buscador limpio con ⌘F */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar SKU, producto o sede..."
              className="h-9 w-60 sm:w-72 bg-surface-1 border border-white/[0.08] hover:border-white/20 focus:border-emerald-500/50 rounded-xl pl-9 pr-9 text-xs text-white placeholder:text-zinc-500 focus:outline-none transition-all font-sans"
            />
            <span className="absolute right-2.5 text-[10px] font-mono text-zinc-500 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06] pointer-events-none">
              ⌘F
            </span>
          </div>

          {/* Botón secundario: Exportar CSV/PDF */}
          <button
            onClick={() => showToast("Exportando reporte consolidado de existencias a CSV y PDF...")}
            className="h-9 px-3.5 rounded-xl bg-surface-1 border border-white/[0.08] hover:border-white/20 hover:bg-[#18221D] text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow-card"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar CSV/PDF</span>
          </button>

          {/* Botón primario sólido verde bosque: + Simular Escenario */}
          <button
            onClick={() => setIsSimulationOpen(true)}
            className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.45)]"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Simular Escenario</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. FILA 1: KPI STRIP DE 4 TARJETAS CON HERO (DONEZO)       */}
      {/* ========================================================= */}
      <KpiStrip
        metrics={[
          {
            value: "98.4%",
            context: "Salud del Catálogo · 338 SKUs activos verificados",
            isHighlight: true,
          },
          {
            value: "8",
            context: "SKUs Bajo Punto de Reorden · Riesgo de quiebre < 4 días",
          },
          {
            value: "4",
            context: "Registros en Cuarentena · Retenidos en Vault para revisión",
          },
          {
            value: "$482.5M",
            context: "Valorización de Inventario · +6.4% vs mes anterior",
            isHighlight: true,
          },
        ]}
      />

      {/* ========================================================= */}
      {/* 3. FILA 2: BENTO GRID VISUAL (3 COLUMNAS ASIMÉTRICAS)     */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* COLUMNA 1 (5 cols): Velocidad de Agotamiento y Demanda (Donezo Project Analytics) */}
        <div className="lg:col-span-5 rounded-2xl bg-surface-1 border border-white/[0.06] p-5 shadow-card flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Velocidad de Agotamiento y Demanda
              </h2>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Consumo diario de bodega vs. predicción algorítmica IA
              </p>
            </div>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              7 Días · IA Predictiva
            </span>
          </div>

          {/* Gráfico de barras gruesas redondeadas */}
          <div className="pt-6 pb-2 px-3">
            <div className="h-36 flex items-end justify-between gap-2.5 sm:gap-3.5 relative">
              {demandDays.map((bar, idx) => {
                const barColor =
                  bar.type === "solid"
                    ? "bg-[#10B981]"
                    : bar.type === "deep"
                    ? "bg-[#047857]"
                    : "bg-hatched-emerald";

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end relative group">
                    {/* Tooltip flotante sobre barra pico */}
                    {bar.peak && (
                      <div className="absolute -top-7 px-2 py-0.5 rounded-full bg-[#14201A] border border-emerald-400/40 text-[10px] font-mono font-bold text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)] whitespace-nowrap z-20">
                        <span>74% Pico</span>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#14201A] border-r border-b border-emerald-400/40 transform rotate-45 -mt-0.5" />
                      </div>
                    )}

                    {/* Barra gruesa redondeada */}
                    <div
                      style={{ height: `${bar.val}%` }}
                      className={`w-full max-w-[38px] rounded-2xl transition-all duration-300 group-hover:scale-y-105 origin-bottom shadow-sm ${barColor}`}
                      title={`${bar.day}: ${bar.label}`}
                    />

                    {/* Letra del día */}
                    <span className="text-xs font-mono font-medium text-zinc-400 mt-2.5">
                      {bar.day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Leyenda de colores */}
          <div className="flex flex-wrap items-center justify-between pt-3 border-t border-white/[0.04] text-[11px] text-zinc-400 font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
              <span>Consumo Real</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#047857]" />
              <span>Media Histórica</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-hatched-emerald border border-emerald-400/30" />
              <span>Proyección IA</span>
            </div>
          </div>
        </div>

        {/* COLUMNA 2 (3 cols): Cobertura de Stock Semicircular (Donezo Project Progress 41%) */}
        <div className="lg:col-span-3 rounded-2xl bg-surface-1 border border-white/[0.06] p-5 shadow-card flex flex-col justify-between space-y-3">
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">
              Cobertura y Nivel de Servicio
            </h2>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Disponibilidad ROP en los 3 almacenes
            </p>
          </div>

          {/* Medidor en Arco Semicircular de 180° */}
          <div className="flex flex-col items-center justify-center py-1 relative">
            <svg viewBox="0 0 200 115" className="w-52 max-w-full overflow-visible">
              <defs>
                {/* Patrón rayado diagonal para el segmento Riesgo ROP */}
                <pattern
                  id="ropHatchPattern"
                  width="8"
                  height="8"
                  patternTransform="rotate(45)"
                  patternUnits="userSpaceOnUse"
                >
                  <line x1="0" y1="0" x2="0" y2="8" stroke="#F59E0B" strokeWidth="3" />
                </pattern>
              </defs>

              {/* Arco Fondo Sutil */}
              <path
                d="M 25,100 A 75,75 0 0,1 175,100"
                fill="none"
                stroke="#16221B"
                strokeWidth="16"
                strokeLinecap="round"
              />

              {/* Segmento 1: Stock Óptimo (Verde Esmeralda Sólido) */}
              <path
                d="M 25,100 A 75,75 0 0,1 175,100"
                fill="none"
                stroke="#10B981"
                strokeWidth="16"
                strokeDasharray="150 236"
                strokeDashoffset="0"
                strokeLinecap="round"
              />

              {/* Segmento 2: En Tránsito (Verde Bosque) */}
              <path
                d="M 25,100 A 75,75 0 0,1 175,100"
                fill="none"
                stroke="#047857"
                strokeWidth="16"
                strokeDasharray="56 236"
                strokeDashoffset="-150"
              />

              {/* Segmento 3: Riesgo ROP (Rayado Diagonal a 45°) */}
              <path
                d="M 25,100 A 75,75 0 0,1 175,100"
                fill="none"
                stroke="url(#ropHatchPattern)"
                strokeWidth="16"
                strokeDasharray="30 236"
                strokeDashoffset="-206"
                strokeLinecap="round"
              />
            </svg>

            {/* Texto Central */}
            <div className="absolute top-[52px] text-center">
              <span className="text-3xl font-extrabold font-mono text-white tracking-tight">
                92%
              </span>
              <span className="block text-[11px] font-medium text-zinc-400 -mt-0.5">
                Nivel de Servicio
              </span>
            </div>
          </div>

          {/* Leyenda Horizontal */}
          <div className="space-y-1.5 text-[11px] font-mono text-zinc-400 pt-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                <span>Stock Óptimo</span>
              </span>
              <span className="text-white font-bold">68%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#047857]" />
                <span>En Tránsito</span>
              </span>
              <span className="text-white font-bold">24%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-hatched-slate border border-amber-500/40" />
                <span className="text-amber-400">Riesgo ROP</span>
              </span>
              <span className="text-amber-400 font-bold">8%</span>
            </div>
          </div>

          {/* Botón directo: Generar Órdenes de Reposición */}
          <button
            onClick={handleGeneratePOs}
            disabled={isAuditing}
            className="w-full mt-2 h-9 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.15)]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? "animate-spin text-emerald-400" : ""}`} />
            <span>Generar Órdenes de Reposición</span>
          </button>
        </div>

        {/* COLUMNA 3 (4 cols): Anomalías Recientes del Agente (CheckinOs & Donezo Tasks) */}
        <div className="lg:col-span-4 rounded-2xl bg-surface-1 border border-white/[0.06] p-5 shadow-card flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white tracking-tight">
                Anomalías del Agente
              </h2>
            </div>
            <button
              onClick={() => showToast("Auditoría completa ejecutada: 74 SKUs escaneados.")}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium hover:underline flex items-center gap-1"
            >
              <span>Auditar ahora</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {/* Anomalía 1 */}
            <div className="p-3 rounded-xl bg-surface-well border border-white/[0.04] flex items-center justify-between gap-3 hover:border-white/10 transition-colors">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 flex-shrink-0">
                  <Wrench className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    Disco Diamantado 7&apos; Concreto
                  </p>
                  <p className="text-[11px] font-mono text-rose-400">
                    Físico 8u vs Sistema 12u (-4u)
                  </p>
                </div>
              </div>
              <button
                onClick={() => openAdjustModal(items[0])}
                className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[11px] font-mono font-medium flex-shrink-0 transition-colors"
              >
                Ajustar
              </button>
            </div>

            {/* Anomalía 2 */}
            <div className="p-3 rounded-xl bg-surface-well border border-white/[0.04] flex items-center justify-between gap-3 hover:border-white/10 transition-colors">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    Pernos Hexagonales Grado 8
                  </p>
                  <p className="text-[11px] font-mono text-amber-400">
                    Burn rate acelerado (57 u/día)
                  </p>
                </div>
              </div>
              <button
                onClick={handleGeneratePOs}
                className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-mono font-medium flex-shrink-0 transition-colors"
              >
                Reorden
              </button>
            </div>

            {/* Anomalía 3 */}
            <div className="p-3 rounded-xl bg-surface-well border border-white/[0.04] flex items-center justify-between gap-3 hover:border-white/10 transition-colors">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    Válvula Inoxidable 2&apos; ANSI
                  </p>
                  <p className="text-[11px] font-mono text-blue-400">
                    Retenido en cuarentena dimensional
                  </p>
                </div>
              </div>
              <button
                onClick={() => showToast("Registro QUAR-081 abierto en /vault/Auditoria")}
                className="px-2.5 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 text-[11px] font-mono font-medium flex-shrink-0 transition-colors"
              >
                Revisar
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-[10px] font-mono text-zinc-500">
            <span>Última sincronización física: 10:24 AM</span>
            <span className="text-emerald-400">0 discrepancias no resueltas</span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. FILA 3: CATÁLOGO DE STOCK CON BARRAS WELL (INVENTAR)    */}
      {/* ========================================================= */}
      <div className="rounded-2xl bg-surface-1 border border-white/[0.06] shadow-card overflow-hidden space-y-0">
        {/* Sub-header / Toolbar con Filtro de Sedes y Estados */}
        <div className="p-4 border-b border-white/[0.06] bg-[#0C1310] flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Selector de Sedes */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-well border border-white/[0.04] overflow-x-auto">
            {[
              { id: "all", label: "Todas las sedes" },
              { id: "wh_bga", label: "Bucaramanga" },
              { id: "wh_bog", label: "Bogotá D.C." },
              { id: "wh_med", label: "Medellín" },
            ].map((wh) => (
              <button
                key={wh.id}
                onClick={() => setSelectedWarehouse(wh.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  selectedWarehouse === wh.id
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {wh.label}
              </button>
            ))}
          </div>

          {/* Filtros de Estado */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-mono">
            {[
              { id: "all", label: "Todos", count: 338 },
              { id: "quiebre", label: "Quiebre", count: 8 },
              { id: "alerta", label: "Alerta ROP", count: 14 },
              { id: "optimo", label: "Óptimo", count: 312 },
              { id: "cuarentena", label: "Cuarentena", count: 4 },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setSelectedStatus(st.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] transition-all whitespace-nowrap ${
                  selectedStatus === st.id
                    ? "bg-white/10 text-white font-bold border border-white/20"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {st.label} <span className="opacity-60 font-normal">({st.count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tabla de Productos con Barras Well Embutidas */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0B110E] border-b border-white/[0.06] text-zinc-400 font-mono text-[10px] uppercase tracking-wider">
                <th className="py-3 px-4 font-semibold">Producto & SKU</th>
                <th className="py-3 px-3 font-semibold">Sede / Ubicación</th>
                <th className="py-3 px-3 font-semibold w-56">Stock vs. ROP (Well)</th>
                <th className="py-3 px-3 font-semibold">Cobertura / Burn Rate</th>
                <th className="py-3 px-3 font-semibold text-right">Valorización</th>
                <th className="py-3 px-3 font-semibold text-center">Condición</th>
                <th className="py-3 px-4 font-semibold text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredItems.map((item) => {
                const maxGauge = Math.max(item.ropThreshold * 1.5, item.currentStock * 1.1) || 1;
                const fillPct = Math.min(100, Math.max(4, (item.currentStock / maxGauge) * 100));
                const ropTickPct = Math.min(96, (item.ropThreshold / maxGauge) * 100);

                const statusBadgeType =
                  item.status === "quiebre"
                    ? "error"
                    : item.status === "alerta"
                    ? "alerta"
                    : item.status === "cuarentena"
                    ? "pendiente"
                    : "ok";

                const badgeLabel =
                  item.status === "quiebre"
                    ? "Quiebre ROP"
                    : item.status === "alerta"
                    ? "Alerta ROP"
                    : item.status === "cuarentena"
                    ? "Cuarentena"
                    : "Óptimo";

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-[#151E19] transition-colors group cursor-default"
                  >
                    {/* Producto & SKU */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[#19241F] border border-white/[0.04] text-emerald-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {item.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-white block truncate max-w-[220px]">
                            {item.name}
                          </span>
                          <div className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-400 mt-0.5">
                            <span className="text-emerald-400 font-bold">{item.sku}</span>
                            <button
                              onClick={() => handleCopySku(item.sku)}
                              className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-white transition-opacity"
                              title="Copiar SKU"
                            >
                              {copiedSku === item.sku ? (
                                <Check className="w-2.5 h-2.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-2.5 h-2.5" />
                              )}
                            </button>
                            <span className="text-zinc-600">·</span>
                            <span className="truncate max-w-[120px]">{item.category}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Sede / Ubicación */}
                    <td className="py-3.5 px-3">
                      <div className="flex flex-col font-mono text-[11px]">
                        <span className="text-zinc-200">{item.warehouseName.replace("Bodega Matriz ", "").replace("CD ", "")}</span>
                        <span className="text-[10px] text-zinc-500">{item.locationRack.split("·")[1]?.trim() || item.locationRack}</span>
                      </div>
                    </td>

                    {/* Stock vs. ROP en Contenedor Well (Inventar Style) */}
                    <td className="py-3.5 px-3">
                      <div className="bg-surface-well rounded-xl p-2.5 border border-white/[0.04] w-52 space-y-1.5 shadow-inner">
                        <div className="flex justify-between items-baseline text-[11px] font-mono">
                          <span className={`font-bold ${item.status === "quiebre" ? "text-rose-400" : "text-white"}`}>
                            {item.currentStock.toString().padStart(2, "0")} u.
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            Punto ROP: {item.ropThreshold} u.
                          </span>
                        </div>

                        {/* Barra de progreso con marca vertical blanca de ROP */}
                        <div className="relative w-full h-2 rounded-full bg-[#19241F] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              item.status === "quiebre"
                                ? "bg-rose-500"
                                : item.status === "alerta"
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${fillPct}%` }}
                          />
                          {/* Marca vertical blanca para el umbral ROP */}
                          <span
                            className="absolute top-0 bottom-0 w-[1.5px] bg-white z-10 shadow-sm"
                            style={{ left: `${ropTickPct}%` }}
                            title={`Umbral ROP: ${item.ropThreshold} un.`}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Cobertura / Burn Rate */}
                    <td className="py-3.5 px-3 font-mono">
                      <div className="flex flex-col text-[11px]">
                        <span className={`font-semibold ${item.coverageDays < 4 ? "text-amber-400" : "text-white"}`}>
                          {item.coverageDays.toFixed(1)} días
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {item.dailyBurnRate} u/día
                        </span>
                      </div>
                    </td>

                    {/* Valorización Total */}
                    <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                      <span className="text-white font-bold text-xs block">
                        ${(item.currentStock * item.unitPriceCop).toLocaleString("es-CO")}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        ${item.unitPriceCop.toLocaleString("es-CO")} /u
                      </span>
                    </td>

                    {/* Condición / StatusBadge */}
                    <td className="py-3.5 px-3 text-center">
                      <StatusBadge status={statusBadgeType} label={badgeLabel} size="sm" />
                    </td>

                    {/* Acciones */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openAdjustModal(item)}
                          className="px-2.5 py-1 rounded-lg bg-surface-well border border-white/[0.06] hover:border-emerald-500/40 text-zinc-300 hover:text-emerald-300 font-mono text-[10px] transition-colors"
                        >
                          Ajustar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredItems.length === 0 && (
            <div className="p-12 text-center text-xs font-mono text-zinc-500">
              No se encontraron SKUs que coincidan con los filtros de sede o estado.
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL DE AJUSTE RÁPIDO DE INVENTARIO                      */}
      {/* ========================================================= */}
      {adjustModalSku && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-surface-1 border border-white/[0.1] shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <span className="font-mono text-[10px] text-emerald-400 block font-bold">
                  AJUSTE DE STOCK FÍSICO · REGISTRO AUDITABLE
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
              <div className="flex items-center justify-between bg-surface-well p-3 rounded-xl border border-white/[0.04]">
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
                    className="w-9 h-9 rounded-xl bg-surface-well border border-white/[0.08] text-white flex items-center justify-center hover:border-emerald-500/50"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    value={adjustQuantity}
                    onChange={(e) => setAdjustQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                    className="flex-1 h-9 bg-surface-well border border-white/[0.08] focus:border-emerald-500 rounded-xl text-center font-bold text-emerald-400 font-mono text-base focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setAdjustQuantity((prev) => prev + 1)}
                    className="w-9 h-9 rounded-xl bg-surface-well border border-white/[0.08] text-white flex items-center justify-center hover:border-emerald-500/50"
                  >
                    <Plus className="w-4 h-4" />
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
                  className="w-full h-9 bg-surface-well border border-white/[0.08] rounded-xl px-3 text-zinc-300 font-sans text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="Descuadre en conteo físico cíclico">Descuadre en conteo físico cíclico</option>
                  <option value="Merma o rotura en bodega">Merma o rotura en bodega</option>
                  <option value="Devolución de cliente no registrada">Devolución de cliente no registrada</option>
                  <option value="Transferencia inter-bodegas pendiente">Transferencia inter-bodegas pendiente</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/[0.05] border border-emerald-500/20 text-[10px] text-emerald-300 space-y-0.5">
                <span className="block font-bold">FIRMA DIGITAL HMAC-SHA256:</span>
                <span className="text-zinc-400 block">7f3a8b29c01d4e5f...asentada en /vault/Auditoria</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-white/[0.08]">
              <button
                onClick={() => setAdjustModalSku(null)}
                className="px-3 py-2 rounded-xl bg-transparent hover:bg-white/[0.04] text-zinc-400 text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmAdjust}
                disabled={isSubmittingAdjust}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)]"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSubmittingAdjust ? "animate-spin" : ""}`} />
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
          <div className="w-full max-w-md rounded-2xl bg-surface-1 border border-white/[0.1] shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-xs font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Simular Escenario de Shock de Demanda
                </h3>
              </div>
              <button
                onClick={() => setIsSimulationOpen(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-zinc-400">Pico de Demanda Simulado:</span>
                  <span className="text-amber-400 font-bold font-mono">+{demandSurgePct}%</span>
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

              <div className="p-3.5 rounded-xl bg-surface-well border border-white/[0.04] space-y-2 text-xs font-mono">
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
                className="px-3.5 py-2 rounded-xl bg-transparent hover:bg-white/[0.04] text-zinc-400 text-xs font-medium"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  showToast(`Escenario +${demandSurgePct}% aplicado: 11 nuevos SKUs entraron en zona de reorden.`);
                  setIsSimulationOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)]"
              >
                Aplicar Escenario
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
