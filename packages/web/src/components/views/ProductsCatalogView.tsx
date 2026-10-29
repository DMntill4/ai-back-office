import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Package,
  Search,
  Tag,
  Warehouse,
  Boxes,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingUp,
  Percent,
  Truck,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Filter,
  Download,
  Plus,
  Eye,
  RefreshCw,
  X,
  ChevronRight,
  Copy,
  Check,
  BarChart2,
  Settings2,
  ArrowDownRight,
  Scale,
  Zap,
  Clock,
  LayoutGrid,
  Table as TableIcon,
  Activity,
  Send,
  MessageSquare,
  Globe,
} from "lucide-react";
import { Button } from "../ui/Button";
import { StatusBadge } from "../ui/StatusBadge";

export interface ChannelShare {
  channel: string;
  pct: number;
  orders: number;
}

export interface DemandPoint {
  day: number;
  actual?: number;
  predicted: number;
  lower: number;
  upper: number;
}

export interface ProductCatalogItem {
  sku: string;
  name: string;
  category: string;
  brand: string;
  unit: string;
  minPackage: number;
  currentStock: number;
  safetyStock: number;
  rop: number;
  unitCostCop: number;
  suggestedSalePriceCop: number;
  primarySupplier: string;
  supplierLeadTimeDays: number;
  status: "normal" | "rop_critico" | "en_espera_oc";
  demandSparkline: number[];
  dimensions: string;
  weightKg: number;
  abcClass: "A" | "B" | "C";
  priceElasticity: number;
  elasticityLabel: string;
  forecastAccuracy: number;
  landedBreakdown: {
    fobCost: number;
    logisticsFreight: number;
    tariffsTaxes: number;
    storageShrinkage: number;
  };
  channelDistribution: ChannelShare[];
  forecast30d: DemandPoint[];
}

// Micro-Iconografía Vectorial Isométrica (Estilo Landa Reference)
export const IsometricProductIcon: React.FC<{ category: string; className?: string }> = ({
  category,
  className = "w-6 h-6",
}) => {
  // Proyección isométrica con top, left, right faces
  if (category.includes("Herramientas")) {
    return (
      <svg viewBox="0 0 28 28" className={className} fill="none">
        {/* Top Face */}
        <polygon points="14,3 24,9 14,15 4,9" fill="#10B981" fillOpacity="0.25" stroke="#34D399" strokeWidth="1.2" />
        {/* Left Face */}
        <polygon points="4,9 14,15 14,24 4,18" fill="#0A0F0C" stroke="#10B981" strokeWidth="1.2" strokeOpacity="0.8" />
        {/* Right Face */}
        <polygon points="14,15 24,9 24,18 14,24" fill="#0E1712" stroke="#34D399" strokeWidth="1.2" strokeOpacity="0.8" />
        {/* Central tool glyph */}
        <line x1="10" y1="11" x2="18" y2="17" stroke="#34D399" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="10" cy="11" r="1.5" fill="#10B981" />
      </svg>
    );
  }
  if (category.includes("Fijación") || category.includes("Tornillería")) {
    return (
      <svg viewBox="0 0 28 28" className={className} fill="none">
        <polygon points="14,3 24,9 14,15 4,9" fill="#F59E0B" fillOpacity="0.2" stroke="#FBBF24" strokeWidth="1.2" />
        <polygon points="4,9 14,15 14,24 4,18" fill="#0A0F0C" stroke="#F59E0B" strokeWidth="1.2" strokeOpacity="0.8" />
        <polygon points="14,15 24,9 24,18 14,24" fill="#161208" stroke="#FBBF24" strokeWidth="1.2" strokeOpacity="0.8" />
        <line x1="14" y1="7" x2="14" y2="20" stroke="#FBBF24" strokeWidth="1.5" strokeDasharray="1 2" strokeLinecap="round" />
      </svg>
    );
  }
  if (category.includes("Eléctrico") || category.includes("Material")) {
    return (
      <svg viewBox="0 0 28 28" className={className} fill="none">
        <polygon points="14,3 24,9 14,15 4,9" fill="#3B82F6" fillOpacity="0.2" stroke="#60A5FA" strokeWidth="1.2" />
        <polygon points="4,9 14,15 14,24 4,18" fill="#0A0F0C" stroke="#3B82F6" strokeWidth="1.2" strokeOpacity="0.8" />
        <polygon points="14,15 24,9 24,18 14,24" fill="#0A111C" stroke="#60A5FA" strokeWidth="1.2" strokeOpacity="0.8" />
        <path d="M15 7L12 13H16L13 19" stroke="#60A5FA" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  // Default Acero / Construcción
  return (
    <svg viewBox="0 0 28 28" className={className} fill="none">
      <polygon points="14,3 24,9 14,15 4,9" fill="#10B981" fillOpacity="0.15" stroke="#10B981" strokeWidth="1.2" />
      <polygon points="4,9 14,15 14,24 4,18" fill="#070B09" stroke="#10B981" strokeWidth="1.2" strokeOpacity="0.6" />
      <polygon points="14,15 24,9 24,18 14,24" fill="#0A0F0C" stroke="#34D399" strokeWidth="1.2" strokeOpacity="0.6" />
      <line x1="8" y1="11" x2="20" y2="17" stroke="#34D399" strokeWidth="1.2" />
    </svg>
  );
};

const GENERATE_FORECAST_DATA = (base: number, trend: number): DemandPoint[] => {
  const points: DemandPoint[] = [];
  for (let i = 1; i <= 30; i++) {
    const isHistorical = i <= 10;
    const noise = Math.sin(i * 0.8) * (base * 0.15) + (Math.random() - 0.5) * (base * 0.08);
    const value = Math.round(base + trend * i + noise);
    const spread = Math.round(base * 0.18 + i * 0.5);

    points.push({
      day: i,
      actual: isHistorical ? Math.max(1, value + Math.round((Math.random() - 0.5) * 4)) : undefined,
      predicted: Math.max(1, value),
      lower: Math.max(0, value - spread),
      upper: value + spread,
    });
  }
  return points;
};

const INITIAL_PRODUCTS: ProductCatalogItem[] = [
  {
    sku: "HER-ROT-001",
    name: "Rotomartillo SDS Plus 800W Profesional",
    category: "Herramientas eléctricas",
    brand: "DeWalt",
    unit: "Unidad",
    minPackage: 1,
    currentStock: 14,
    safetyStock: 5,
    rop: 10,
    unitCostCop: 680000,
    suggestedSalePriceCop: 845000,
    primarySupplier: "DeWalt Colombia",
    supplierLeadTimeDays: 2,
    status: "normal",
    demandSparkline: [8, 12, 10, 15, 14, 18, 16],
    dimensions: "38 x 25 x 12 cm",
    weightKg: 3.2,
    abcClass: "A",
    priceElasticity: -1.24,
    elasticityLabel: "Elástica Moderada",
    forecastAccuracy: 96.4,
    landedBreakdown: {
      fobCost: 580000,
      logisticsFreight: 42000,
      tariffsTaxes: 35000,
      storageShrinkage: 23000,
    },
    channelDistribution: [
      { channel: "Mostrador Bucaramanga (Chimitá)", pct: 46, orders: 128 },
      { channel: "Portal B2B Siigo Cloud", pct: 32, orders: 89 },
      { channel: "Telegram Bot Adquisiciones", pct: 14, orders: 39 },
      { channel: "Ruta 45A Preventa Móvil", pct: 8, orders: 22 },
    ],
    forecast30d: GENERATE_FORECAST_DATA(16, 0.3),
  },
  {
    sku: "HER-TAL-002",
    name: "Taladro Percutor 1/2 pulgada 650W",
    category: "Herramientas eléctricas",
    brand: "Bosch",
    unit: "Unidad",
    minPackage: 1,
    currentStock: 6,
    safetyStock: 4,
    rop: 8,
    unitCostCop: 340000,
    suggestedSalePriceCop: 425000,
    primarySupplier: "Bosch Colombia",
    supplierLeadTimeDays: 3,
    status: "rop_critico",
    demandSparkline: [10, 9, 14, 12, 16, 18, 22],
    dimensions: "28 x 20 x 8 cm",
    weightKg: 2.1,
    abcClass: "A",
    priceElasticity: -1.55,
    elasticityLabel: "Alta Elasticidad",
    forecastAccuracy: 94.8,
    landedBreakdown: {
      fobCost: 290000,
      logisticsFreight: 22000,
      tariffsTaxes: 18000,
      storageShrinkage: 10000,
    },
    channelDistribution: [
      { channel: "Mostrador Bucaramanga (Chimitá)", pct: 52, orders: 145 },
      { channel: "Portal B2B Siigo Cloud", pct: 28, orders: 78 },
      { channel: "Telegram Bot Adquisiciones", pct: 12, orders: 34 },
      { channel: "Ruta 45A Preventa Móvil", pct: 8, orders: 21 },
    ],
    forecast30d: GENERATE_FORECAST_DATA(20, 0.5),
  },
  {
    sku: "FIJ-PER-101",
    name: "Perno Grado 8 Hexagonal 1/2 x 2-1/2\"",
    category: "Fijación y tornillería",
    brand: "Mundial",
    unit: "Caja x 100",
    minPackage: 100,
    currentStock: 420,
    safetyStock: 200,
    rop: 500,
    unitCostCop: 145000,
    suggestedSalePriceCop: 189000,
    primarySupplier: "Mundial de Tornillos",
    supplierLeadTimeDays: 2,
    status: "rop_critico",
    demandSparkline: [350, 410, 480, 520, 510, 560, 590],
    dimensions: "18 x 12 x 10 cm",
    weightKg: 4.8,
    abcClass: "B",
    priceElasticity: -0.65,
    elasticityLabel: "Inelástica Esencial",
    forecastAccuracy: 98.1,
    landedBreakdown: {
      fobCost: 122000,
      logisticsFreight: 11000,
      tariffsTaxes: 7000,
      storageShrinkage: 5000,
    },
    channelDistribution: [
      { channel: "Mostrador Bucaramanga (Chimitá)", pct: 60, orders: 310 },
      { channel: "Portal B2B Siigo Cloud", pct: 25, orders: 129 },
      { channel: "Telegram Bot Adquisiciones", pct: 10, orders: 52 },
      { channel: "Ruta 45A Preventa Móvil", pct: 5, orders: 26 },
    ],
    forecast30d: GENERATE_FORECAST_DATA(540, 2.8),
  },
  {
    sku: "MAT-ELE-201",
    name: "Interruptor Termomagnético 3x50A 10kA",
    category: "Material eléctrico",
    brand: "Schneider",
    unit: "Unidad",
    minPackage: 5,
    currentStock: 32,
    safetyStock: 10,
    rop: 25,
    unitCostCop: 185000,
    suggestedSalePriceCop: 235000,
    primarySupplier: "Schneider Electric",
    supplierLeadTimeDays: 4,
    status: "normal",
    demandSparkline: [18, 22, 19, 25, 28, 26, 30],
    dimensions: "12 x 8 x 7 cm",
    weightKg: 0.65,
    abcClass: "B",
    priceElasticity: -0.92,
    elasticityLabel: "Elasticidad Unitaria",
    forecastAccuracy: 95.2,
    landedBreakdown: {
      fobCost: 156000,
      logisticsFreight: 12000,
      tariffsTaxes: 11000,
      storageShrinkage: 6000,
    },
    channelDistribution: [
      { channel: "Portal B2B Siigo Cloud", pct: 45, orders: 94 },
      { channel: "Mostrador Bucaramanga (Chimitá)", pct: 35, orders: 73 },
      { channel: "Telegram Bot Adquisiciones", pct: 15, orders: 31 },
      { channel: "Ruta 45A Preventa Móvil", pct: 5, orders: 10 },
    ],
    forecast30d: GENERATE_FORECAST_DATA(28, 0.2),
  },
  {
    sku: "ACE-VAR-301",
    name: "Varilla Corrugada 1/2 pulgada x 6m W60",
    category: "Acero y construcción",
    brand: "Siderúrgica",
    unit: "Atado x 50",
    minPackage: 50,
    currentStock: 180,
    safetyStock: 80,
    rop: 200,
    unitCostCop: 1925000,
    suggestedSalePriceCop: 2380000,
    primarySupplier: "Siderúrgica de Santander",
    supplierLeadTimeDays: 1,
    status: "rop_critico",
    demandSparkline: [120, 160, 150, 210, 190, 240, 260],
    dimensions: "600 x 15 x 15 cm",
    weightKg: 240.0,
    abcClass: "A",
    priceElasticity: -1.78,
    elasticityLabel: "Muy Sensible a Precio",
    forecastAccuracy: 93.7,
    landedBreakdown: {
      fobCost: 1650000,
      logisticsFreight: 145000,
      tariffsTaxes: 85000,
      storageShrinkage: 45000,
    },
    channelDistribution: [
      { channel: "Mostrador Bucaramanga (Chimitá)", pct: 65, orders: 182 },
      { channel: "Ruta 45A Preventa Móvil", pct: 20, orders: 56 },
      { channel: "Portal B2B Siigo Cloud", pct: 10, orders: 28 },
      { channel: "Telegram Bot Adquisiciones", pct: 5, orders: 14 },
    ],
    forecast30d: GENERATE_FORECAST_DATA(220, 1.2),
  },
  {
    sku: "CON-DIS-401",
    name: "Disco Diamantado Segmentado 7 pulgadas",
    category: "Consumibles y corte",
    brand: "Bosch",
    unit: "Caja x 10",
    minPackage: 10,
    currentStock: 45,
    safetyStock: 15,
    rop: 30,
    unitCostCop: 780000,
    suggestedSalePriceCop: 990000,
    primarySupplier: "Bosch Colombia",
    supplierLeadTimeDays: 3,
    status: "normal",
    demandSparkline: [25, 28, 30, 32, 38, 42, 40],
    dimensions: "20 x 20 x 5 cm",
    weightKg: 1.8,
    abcClass: "C",
    priceElasticity: -0.45,
    elasticityLabel: "Inelástica Complementaria",
    forecastAccuracy: 97.5,
    landedBreakdown: {
      fobCost: 660000,
      logisticsFreight: 48000,
      tariffsTaxes: 44000,
      storageShrinkage: 28000,
    },
    channelDistribution: [
      { channel: "Mostrador Bucaramanga (Chimitá)", pct: 40, orders: 64 },
      { channel: "Portal B2B Siigo Cloud", pct: 35, orders: 56 },
      { channel: "Telegram Bot Adquisiciones", pct: 15, orders: 24 },
      { channel: "Ruta 45A Preventa Móvil", pct: 10, orders: 16 },
    ],
    forecast30d: GENERATE_FORECAST_DATA(38, 0.1),
  },
];

export const ProductsCatalogView: React.FC = () => {
  const [products, setProducts] = useState<ProductCatalogItem[]>(INITIAL_PRODUCTS);
  const [selectedSku, setSelectedSku] = useState<string>("HER-ROT-001");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "normal" | "rop_critico">("all");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [copiedSku, setCopiedSku] = useState<string | null>(null);

  // Modales
  const [isNewSkuModalOpen, setIsNewSkuModalOpen] = useState(false);
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncTimestamp, setSyncTimestamp] = useState("Hace 4 min");

  // Form State para Nuevo SKU
  const [formSku, setFormSku] = useState("");
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("Herramientas eléctricas");
  const [formBrand, setFormBrand] = useState("");
  const [formUnit, setFormUnit] = useState("Unidad");
  const [formCost, setFormCost] = useState(150000);
  const [formPrice, setFormPrice] = useState(195000);
  const [formRop, setFormRop] = useState(10);
  const [formSafety, setFormSafety] = useState(5);
  const [formSupplier, setFormSupplier] = useState("Bosch Colombia");
  const [formLeadTime, setFormLeadTime] = useState(3);
  const [formAbc, setFormAbc] = useState<"A" | "B" | "C">("B");

  // Simulación de Sensibilidad
  const [freightShockPct, setFreightShockPct] = useState(15);
  const [supplierPriceShockPct, setSupplierPriceShockPct] = useState(8);

  const selectedProduct = useMemo(
    () => products.find((p) => p.sku === selectedSku) || products[0],
    [products, selectedSku]
  );

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ["all", ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.primarySupplier.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = selectedCat === "all" || p.category === selectedCat;
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [products, searchQuery, selectedCat, statusFilter]);

  const handleCopySku = (sku: string) => {
    navigator.clipboard?.writeText(sku);
    setCopiedSku(sku);
    setTimeout(() => setCopiedSku(null), 2000);
  };

  const handleSyncCatalog = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setSyncTimestamp("Justo ahora");
    }, 1200);
  };

  const handleCreateSku = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSku || !formName) return;

    const newProd: ProductCatalogItem = {
      sku: formSku.toUpperCase(),
      name: formName,
      category: formCategory,
      brand: formBrand || "Genérico Homologado",
      unit: formUnit,
      minPackage: 1,
      currentStock: formRop + 5,
      safetyStock: formSafety,
      rop: formRop,
      unitCostCop: formCost,
      suggestedSalePriceCop: formPrice,
      primarySupplier: formSupplier,
      supplierLeadTimeDays: formLeadTime,
      status: "normal",
      demandSparkline: [10, 12, 14, 16, 15, 18, 20],
      dimensions: "25 x 15 x 10 cm",
      weightKg: 1.5,
      abcClass: formAbc,
      priceElasticity: -1.1,
      elasticityLabel: "Elasticidad Media",
      forecastAccuracy: 95.0,
      landedBreakdown: {
        fobCost: Math.round(formCost * 0.85),
        logisticsFreight: Math.round(formCost * 0.07),
        tariffsTaxes: Math.round(formCost * 0.05),
        storageShrinkage: Math.round(formCost * 0.03),
      },
      channelDistribution: [
        { channel: "Mostrador Bucaramanga (Chimitá)", pct: 50, orders: 40 },
        { channel: "Portal B2B Siigo Cloud", pct: 35, orders: 28 },
        { channel: "Telegram Bot Adquisiciones", pct: 15, orders: 12 },
      ],
      forecast30d: GENERATE_FORECAST_DATA(formRop * 2, 0.4),
    };

    setProducts([newProd, ...products]);
    setSelectedSku(newProd.sku);
    setIsNewSkuModalOpen(false);
  };

  // Sparkline Helper
  const renderSparkline = (points: number[], isWarning = false) => {
    const min = Math.min(...points);
    const max = Math.max(...points) || 1;
    const width = 64;
    const height = 20;
    const padding = 2;
    const innerW = width - padding * 2;
    const innerH = height - padding * 2;

    const coords = points.map((val, idx) => {
      const x = padding + (idx / (points.length - 1)) * innerW;
      const y = height - padding - ((val - min) / (max - min || 1)) * innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const strokeColor = isWarning ? "#F59E0B" : "#10B981";
    const fillColor = isWarning ? "rgba(245, 158, 11, 0.15)" : "rgba(16, 185, 129, 0.15)";
    const pathD = `M ${coords.join(" L ")}`;
    const areaD = `M ${coords[0]} L ${coords.join(" L ")} L ${innerW + padding},${height} L ${padding},${height} Z`;

    return (
      <svg width={width} height={height} className="overflow-visible">
        <path d={areaD} fill={fillColor} />
        <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  };

  // Render 30-Day Demand Forecast Chart with Confidence Band
  const renderForecast30dArea = (data: DemandPoint[]) => {
    if (!data || data.length === 0) return null;
    const width = 360;
    const height = 110;
    const paddingLeft = 30;
    const paddingRight = 10;
    const paddingTop = 12;
    const paddingBottom = 22;

    const innerW = width - paddingLeft - paddingRight;
    const innerH = height - paddingTop - paddingBottom;

    const allValues = data.flatMap((d) => [d.predicted, d.upper, d.lower, d.actual ?? d.predicted]);
    const minVal = Math.floor(Math.min(...allValues) * 0.85);
    const maxVal = Math.ceil(Math.max(...allValues) * 1.15) || 1;

    const getX = (idx: number) => paddingLeft + (idx / (data.length - 1)) * innerW;
    const getY = (val: number) => paddingTop + innerH - ((val - minVal) / (maxVal - minVal || 1)) * innerH;

    // Confidence area path (upper to lower)
    const upperPoints = data.map((d, i) => `${getX(i).toFixed(1)},${getY(d.upper).toFixed(1)}`);
    const lowerPoints = data.map((d, i) => `${getX(i).toFixed(1)},${getY(d.lower).toFixed(1)}`).reverse();
    const confidencePath = `M ${upperPoints.join(" L ")} L ${lowerPoints.join(" L ")} Z`;

    // Predicted curve path
    const predictedPoints = data.map((d, i) => `${getX(i).toFixed(1)},${getY(d.predicted).toFixed(1)}`);
    const predictedPath = `M ${predictedPoints.join(" L ")}`;
    const predictedArea = `M ${predictedPoints[0]} L ${predictedPoints.join(" L ")} L ${paddingLeft + innerW},${paddingTop + innerH} L ${paddingLeft},${paddingTop + innerH} Z`;

    // Historical actual points (first 10 days)
    const historicalPoints = data
      .filter((d) => d.actual !== undefined)
      .map((d, i) => ({ x: getX(i), y: getY(d.actual!) }));

    return (
      <div className="w-full relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-28 overflow-visible">
          <defs>
            <linearGradient id="demandAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="confidenceBandGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.03" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={paddingLeft} y1={paddingTop} x2={width - paddingRight} y2={paddingTop} stroke="rgba(255,255,255,0.05)" strokeDasharray="2 3" />
          <line x1={paddingLeft} y1={paddingTop + innerH / 2} x2={width - paddingRight} y2={paddingTop + innerH / 2} stroke="rgba(255,255,255,0.05)" strokeDasharray="2 3" />
          <line x1={paddingLeft} y1={paddingTop + innerH} x2={width - paddingRight} y2={paddingTop + innerH} stroke="rgba(255,255,255,0.08)" />

          {/* Vertical 'Today' divider */}
          <line
            x1={getX(9)}
            y1={paddingTop - 4}
            x2={getX(9)}
            y2={paddingTop + innerH + 4}
            stroke="#34D399"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
          <text x={getX(9) - 2} y={paddingTop - 2} fill="#34D399" fontSize="8" fontFamily="monospace" textAnchor="end">
            HOY
          </text>

          {/* Confidence interval band */}
          <path d={confidencePath} fill="url(#confidenceBandGrad)" stroke="rgba(52, 211, 153, 0.25)" strokeWidth="0.8" strokeDasharray="2 2" />

          {/* Gradient Area fill */}
          <path d={predictedArea} fill="url(#demandAreaGrad)" />

          {/* Predicted Trend Line */}
          <path d={predictedPath} fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />

          {/* Historical Actual points */}
          {historicalPoints.map((pt, i) => (
            <circle key={i} cx={pt.x} cy={pt.y} r="2.2" fill="#34D399" stroke="#050806" strokeWidth="1" />
          ))}

          {/* End point glow */}
          <circle cx={getX(data.length - 1)} cy={getY(data[data.length - 1].predicted)} r="3.5" fill="#34D399" className="animate-pulse" />

          {/* X Axis labels */}
          <text x={paddingLeft} y={height - 4} fill="#8E9893" fontSize="8" fontFamily="monospace">Día 1</text>
          <text x={getX(9)} y={height - 4} fill="#34D399" fontSize="8" fontFamily="monospace" textAnchor="middle">Día 10</text>
          <text x={getX(19)} y={height - 4} fill="#8E9893" fontSize="8" fontFamily="monospace" textAnchor="middle">Día 20</text>
          <text x={width - paddingRight} y={height - 4} fill="#8E9893" fontSize="8" fontFamily="monospace" textAnchor="end">Día 30</text>

          {/* Y Axis labels */}
          <text x={paddingLeft - 4} y={paddingTop + 4} fill="#8E9893" fontSize="8" fontFamily="monospace" textAnchor="end">{maxVal}</text>
          <text x={paddingLeft - 4} y={paddingTop + innerH} fill="#8E9893" fontSize="8" fontFamily="monospace" textAnchor="end">{minVal}</text>
        </svg>
      </div>
    );
  };

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-[#050806] text-[#F9FAFB] font-sans select-none overflow-hidden">
      {/* 1. Header Bar: Buscador híbrido, indicador sync-catalog.ts y conmutador de vista */}
      <div className="flex-none px-6 py-4 border-b border-white/[0.06] bg-[#0A0F0C]/90 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs mb-1">
            <span className="text-[#8E9893] font-mono">OPERACIONES</span>
            <span className="text-white/20">/</span>
            <span className="text-[#10B981] font-mono flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-[#34D399]" />
              sync-catalog.ts & demandService.ts
            </span>
            <span className="text-white/20">/</span>
            {/* Indicador de sincronización de sync-catalog.ts */}
            <span
              onClick={handleSyncCatalog}
              title="Click para sincronizar catálogo maestro"
              className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#10B981]/10 text-[#34D399] border border-[#10B981]/25 flex items-center gap-1.5 cursor-pointer hover:bg-[#10B981]/20 transition-all"
            >
              <span className={`w-1.5 h-1.5 rounded-full bg-[#34D399] ${isSyncing ? "animate-ping" : "animate-pulse"}`} />
              {isSyncing ? "Sincronizando..." : `Sync Siigo: ${syncTimestamp}`}
              <RefreshCw className={`w-2.5 h-2.5 ml-0.5 text-[#34D399] ${isSyncing ? "animate-spin" : ""}`} />
            </span>
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            Catálogo de Productos y Elasticidad
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30">
              342 SKUs ACTIVOS
            </span>
          </h1>
          <p className="text-xs text-[#8E9893] mt-0.5">
            Catálogo maestro con micro-iconografía isométrica, márgenes brutos, elasticidad de demanda a 30 días y canales de tracción.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Conmutador de Vista (Tabla densa / Tarjetas técnicas isométricas) */}
          <div className="flex items-center gap-1 bg-[#070B08] p-1 rounded-xl border border-white/[0.08]">
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "table"
                  ? "bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/30 shadow-sm"
                  : "text-[#8E9893] hover:text-white"
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Tabla Densa</span>
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "cards"
                  ? "bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/30 shadow-sm"
                  : "text-[#8E9893] hover:text-white"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Tarjetas Isométricas</span>
            </button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsSimulateModalOpen(true)}
            className="border-white/10 text-white hover:border-[#10B981]/40 flex items-center gap-2"
          >
            <Sliders className="w-3.5 h-3.5 text-[#34D399]" />
            <span className="text-xs font-semibold">Shock Costos</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsNewSkuModalOpen(true)}
            className="flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="text-xs font-bold">Registrar SKU</span>
            <span className="text-[10px] bg-black/30 px-1.5 py-0.2 rounded font-mono text-white/80">[N]</span>
          </Button>
        </div>
      </div>

      {/* 2. Barra de Búsqueda Semántica e Híbrida y Categorías */}
      <div className="flex-none px-6 py-2.5 border-b border-white/[0.06] bg-[#070B08]/90 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-3.5 h-3.5 text-[#8E9893] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por SKU, nombre, marca o proveedor..."
            className="w-full bg-[#0E1511] border border-white/[0.08] hover:border-white/20 focus:border-[#10B981]/60 focus:bg-[#070B08] rounded-xl pl-8 pr-12 py-1.5 text-xs text-white placeholder:text-[#8E9893]/70 focus:outline-none transition-all font-mono"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-white/30 font-mono border border-white/10 px-1.5 py-0.5 rounded">
            Cmd+K
          </span>
        </div>

        {/* Filtros de Categoría */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto scrollbar-thin">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={`px-2.5 py-1 rounded-lg text-[11px] whitespace-nowrap transition-all ${
                selectedCat === cat
                  ? "bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/40 font-semibold"
                  : "bg-[#0A0F0C] text-[#8E9893] border border-white/[0.04] hover:text-white hover:border-white/10"
              }`}
            >
              {cat === "all" ? "Todas las familias" : cat}
            </button>
          ))}
          <button
            onClick={() => setStatusFilter(statusFilter === "all" ? "rop_critico" : "all")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
              statusFilter === "rop_critico"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "bg-[#0A0F0C] text-[#8E9893] border border-white/[0.04] hover:text-white"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Solo ROP Crítico ({products.filter((p) => p.status === "rop_critico").length})
          </button>
        </div>
      </div>

      {/* 3. Contenedor Master-Detail (65% Grid Principal / 35% Panel Lateral de Inteligencia) */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* PANEL IZQUIERDO: 65% CATÁLOGO DE ALTA DENSIDAD */}
        <div className="flex-1 lg:w-[65%] flex flex-col min-h-0 border-r border-white/[0.06] bg-[#050806] overflow-hidden">
          {viewMode === "table" ? (
            /* VISTA TABLA DENSA (65%) */
            <div className="flex-1 min-h-0 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-[#0A0F0C] border-b border-white/[0.08] text-[#8E9893] text-[10px] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">SKU / Producto</th>
                    <th className="py-2.5 px-3 text-right">Costo Unitario</th>
                    <th className="py-2.5 px-3 text-right">Precio Venta</th>
                    <th className="py-2.5 px-3 text-center">Margen Bruto</th>
                    <th className="py-2.5 px-3 text-center">Lead Time</th>
                    <th className="py-2.5 px-3 text-center">Rotación ABC</th>
                    <th className="py-2.5 px-3 text-center">Demanda (7d)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredProducts.map((p) => {
                    const isSelected = p.sku === selectedSku;
                    const isLowStock = p.currentStock <= p.rop;
                    const marginPct = (
                      ((p.suggestedSalePriceCop - p.unitCostCop) / p.suggestedSalePriceCop) *
                      100
                    ).toFixed(1);

                    return (
                      <tr
                        key={p.sku}
                        onClick={() => setSelectedSku(p.sku)}
                        className={`group transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#10B981]/[0.09] border-l-2 border-l-[#10B981]"
                            : "hover:bg-white/[0.02]"
                        }`}
                      >
                        {/* SKU + Nombre + Micro-Iconografía Isométrica */}
                        <td className="py-3 px-4">
                          <div className="flex items-start gap-3">
                            <div className="p-1 rounded-lg bg-[#0A0F0C] border border-white/[0.08] flex-none mt-0.5 shadow-sm">
                              <IsometricProductIcon category={p.category} className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[11px] font-bold text-white group-hover:text-[#34D399] transition-colors">
                                  {p.sku}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopySku(p.sku);
                                  }}
                                  className="text-white/30 hover:text-white transition-colors"
                                  title="Copiar SKU [Cmd+C]"
                                >
                                  {copiedSku === p.sku ? (
                                    <Check className="w-3 h-3 text-[#10B981]" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                                {isLowStock && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Bajo ROP" />
                                )}
                              </div>
                              <span className="font-semibold text-white/95 block text-xs line-clamp-1 mt-0.5">
                                {p.name}
                              </span>
                              <span className="text-[10px] text-[#8E9893]">
                                {p.brand} · {p.category}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Costo Unitario */}
                        <td className="py-3 px-3 text-right">
                          <span className="font-mono font-bold text-white tabular-nums">
                            ${p.unitCostCop.toLocaleString("es-CO")}
                          </span>
                          <span className="block text-[10px] text-[#8E9893] font-mono">
                            {p.unit}
                          </span>
                        </td>

                        {/* Precio de Venta */}
                        <td className="py-3 px-3 text-right">
                          <span className="font-mono font-bold text-[#34D399] tabular-nums">
                            ${p.suggestedSalePriceCop.toLocaleString("es-CO")}
                          </span>
                        </td>

                        {/* Margen Bruto (%) */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                              Number(marginPct) >= 20
                                ? "bg-[#10B981]/15 text-[#34D399] border-[#10B981]/30"
                                : Number(marginPct) >= 15
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            }`}
                          >
                            +{marginPct}%
                          </span>
                        </td>

                        {/* Lead Time Estándar */}
                        <td className="py-3 px-3 text-center">
                          <span className="text-xs font-mono text-zinc-300 flex items-center justify-center gap-1">
                            <Clock className="w-3 h-3 text-[#10B981]" />
                            {p.supplierLeadTimeDays} d
                          </span>
                        </td>

                        {/* Rotación ABC */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-extrabold border ${
                              p.abcClass === "A"
                                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                : p.abcClass === "B"
                                ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
                                : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                            }`}
                          >
                            Clase {p.abcClass}
                          </span>
                        </td>

                        {/* Demanda Sparkline */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex justify-center">
                            {renderSparkline(p.demandSparkline, isLowStock)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* VISTA TARJETAS TÉCNICAS ISOMÉTRICAS (65%) */
            <div className="flex-1 min-h-0 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredProducts.map((p) => {
                const isSelected = p.sku === selectedSku;
                const isLowStock = p.currentStock <= p.rop;
                const marginPct = (
                  ((p.suggestedSalePriceCop - p.unitCostCop) / p.suggestedSalePriceCop) *
                  100
                ).toFixed(1);

                return (
                  <div
                    key={p.sku}
                    onClick={() => setSelectedSku(p.sku)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                      isSelected
                        ? "bg-[#0d1611] border-[#34D399]/40 shadow-lg shadow-emerald-950/40"
                        : "bg-[#0A0F0C] border-white/[0.06] hover:border-white/[0.15] hover:bg-[#0c130f]"
                    }`}
                  >
                    {/* Top edge radial highlight when selected */}
                    {isSelected && (
                      <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-[#34D399] to-transparent" />
                    )}

                    <div>
                      {/* Card Header: Isometric Icon + SKU + ABC */}
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-xl bg-[#050806] border border-white/[0.08] shadow-inner">
                            <IsometricProductIcon category={p.category} className="w-8 h-8" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-white">
                              <span>{p.sku}</span>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] ${
                                  p.abcClass === "A"
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : p.abcClass === "B"
                                    ? "bg-cyan-500/20 text-cyan-400"
                                    : "bg-amber-500/20 text-amber-400"
                                }`}
                              >
                                ABC-{p.abcClass}
                              </span>
                            </div>
                            <span className="text-[10px] text-[#8E9893] block">{p.brand}</span>
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                            Number(marginPct) >= 20
                              ? "bg-[#10B981]/15 text-[#34D399] border-[#10B981]/30"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}
                        >
                          +{marginPct}%
                        </span>
                      </div>

                      <h3 className="text-xs font-bold text-white line-clamp-1 mb-1">
                        {p.name}
                      </h3>
                      <p className="text-[10px] text-[#8E9893] mb-3">
                        Lead Time: <strong className="text-zinc-300 font-mono">{p.supplierLeadTimeDays} días</strong> · Prov: {p.primarySupplier}
                      </p>

                      {/* Financial Comparison Bar */}
                      <div className="p-2.5 rounded-xl bg-[#050806] border border-white/[0.04] space-y-1.5 text-[11px] font-mono">
                        <div className="flex items-center justify-between text-zinc-400">
                          <span>Costo Unitario:</span>
                          <span className="text-white font-bold">${p.unitCostCop.toLocaleString("es-CO")}</span>
                        </div>
                        <div className="flex items-center justify-between text-zinc-400">
                          <span>Precio Venta:</span>
                          <span className="text-[#34D399] font-bold">${p.suggestedSalePriceCop.toLocaleString("es-CO")}</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer con Sparkline */}
                    <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono">
                      <span className="text-zinc-500">Stock: {p.currentStock} / {p.rop} ROP</span>
                      {renderSparkline(p.demandSparkline, isLowStock)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* PANEL DERECHO: 35% INTELIGENCIA DE PRODUCTO (demandService & pronosticarDemanda) */}
        <div className="flex-1 lg:w-[35%] flex flex-col min-h-0 bg-[#070B08] overflow-y-auto p-5 space-y-4">
          {/* Header del Producto Seleccionado */}
          <div className="p-4 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-radial-gradient pointer-events-none opacity-20" />
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-xl bg-[#050806] border border-white/[0.08] flex-none">
                  <IsometricProductIcon category={selectedProduct.category} className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded font-mono text-[10px] font-extrabold bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/40">
                      {selectedProduct.sku}
                    </span>
                    <span className="text-[10px] text-[#8E9893] font-mono">
                      Clase {selectedProduct.abcClass} · {selectedProduct.brand}
                    </span>
                  </div>
                  <h2 className="text-sm font-bold text-white mt-1 leading-snug">
                    {selectedProduct.name}
                  </h2>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 flex-none">
                {selectedProduct.status === "rop_critico" ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    ROP CRÍTICO
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                    STOCK SALUDABLE
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* CURVA DE PREDICCIÓN DE DEMANDA A 30 DÍAS (demandService & pronosticarDemanda) */}
          <div className="p-4 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#34D399]" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-white">
                  Pronóstico de Demanda (30 Días)
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#34D399] bg-[#10B981]/10 px-2 py-0.5 rounded border border-[#10B981]/25">
                {selectedProduct.forecastAccuracy}% Precisión
              </span>
            </div>

            <p className="text-[11px] text-[#8E9893] leading-relaxed">
              Curva generada por <code className="text-[#34D399]">demandService.ts</code> mediante Holt-Winters estacional + Prophet con intervalo de confianza al 95%.
            </p>

            {/* Visualización del Gráfico de Área */}
            <div className="p-2.5 rounded-xl bg-[#050806] border border-white/[0.06]">
              {renderForecast30dArea(selectedProduct.forecast30d)}
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-[#8E9893] px-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                <span>Histórico (Días 1-10)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#10B981]/30 border border-[#34D399]" />
                <span>Proyección IA (Días 11-30)</span>
              </div>
            </div>
          </div>

          {/* PARÁMETROS TÉCNICOS DEL SKU (ROP, Stock Seguridad, Elasticidad) */}
          <div className="p-4 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#34D399]" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-white">
                  Parámetros Técnicos del SKU
                </span>
              </div>
              <span className="text-[10px] font-mono text-zinc-400">
                Auto-calibrado
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              {/* ROP Dinámico */}
              <div className="p-3 rounded-xl bg-[#050806] border border-white/[0.04]">
                <span className="text-[10px] text-[#8E9893] block">ROP DINÁMICO</span>
                <span className="text-base font-extrabold text-white">
                  {selectedProduct.rop} un.
                </span>
                <span className="text-[10px] text-zinc-500 block mt-0.5">Demanda x Lead Time</span>
              </div>

              {/* Stock de Seguridad IA */}
              <div className="p-3 rounded-xl bg-[#050806] border border-white/[0.04]">
                <span className="text-[10px] text-[#8E9893] block">STOCK SEGURIDAD</span>
                <span className="text-base font-extrabold text-[#34D399]">
                  {selectedProduct.safetyStock} un.
                </span>
                <span className="text-[10px] text-zinc-500 block mt-0.5">Nivel serv. 98.5% (Z=2.17)</span>
              </div>

              {/* Elasticidad de Precio */}
              <div className="p-3 rounded-xl bg-[#050806] border border-white/[0.04]">
                <span className="text-[10px] text-[#8E9893] block">ELASTICIDAD PRECIO</span>
                <span className="text-base font-extrabold text-cyan-400">
                  {selectedProduct.priceElasticity}
                </span>
                <span className="text-[10px] text-zinc-500 block mt-0.5">{selectedProduct.elasticityLabel}</span>
              </div>

              {/* Lead Time */}
              <div className="p-3 rounded-xl bg-[#050806] border border-white/[0.04]">
                <span className="text-[10px] text-[#8E9893] block">LEAD TIME PROVEEDOR</span>
                <span className="text-base font-extrabold text-white">
                  {selectedProduct.supplierLeadTimeDays} días
                </span>
                <span className="text-[10px] text-zinc-500 block mt-0.5">{selectedProduct.primarySupplier}</span>
              </div>
            </div>
          </div>

          {/* CANALES DE VENTA CON MAYOR TRACCIÓN (salesChannelListener) */}
          <div className="p-4 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#34D399]" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-white">
                  Canales de Tracción (salesChannelListener)
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400">
                Streaming CDC
              </span>
            </div>

            <div className="space-y-2.5 pt-1">
              {selectedProduct.channelDistribution.map((ch, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-zinc-300 truncate max-w-[200px]">{ch.channel}</span>
                    <span className="text-[#34D399] font-bold">{ch.pct}% ({ch.orders} órdenes)</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#152019] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        idx === 0
                          ? "bg-[#10B981]"
                          : idx === 1
                          ? "bg-[#34D399]/80"
                          : idx === 2
                          ? "bg-blue-400"
                          : "bg-amber-400"
                      }`}
                      style={{ width: `${ch.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Acción Rápida: Emitir Orden de Reabastecimiento */}
          <Button
            variant="primary"
            size="md"
            className="w-full justify-center flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
            onClick={() =>
              alert(
                `Orden de compra autónoma iniciada para ${selectedProduct.sku} (${selectedProduct.rop * 2} unidades con ${selectedProduct.primarySupplier}).`
              )
            }
          >
            <Zap className="w-4 h-4" />
            <span>Generar Orden de Reorden ({selectedProduct.rop * 2} un.)</span>
          </Button>
        </div>
      </div>

      {/* MODAL 1: REGISTRAR NUEVO SKU */}
      {isNewSkuModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-[#0A0F0C] border border-white/[0.1] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#10B981]/15 border border-[#10B981]/30 flex items-center justify-center text-[#34D399]">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Registrar Nuevo SKU en Catálogo</h3>
                  <span className="text-[11px] font-mono text-[#34D399]">sync-catalog.ts · Homologación Automática</span>
                </div>
              </div>
              <button
                onClick={() => setIsNewSkuModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-zinc-900 border border-white/[0.06] flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSku} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1 font-medium">Código SKU *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HER-SIE-003"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-[#050806] border border-white/[0.08] text-white font-mono text-xs focus:outline-none focus:border-[#10B981]/50 uppercase"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1 font-medium">Marca</label>
                  <input
                    type="text"
                    placeholder="e.g. DeWalt / Bosch"
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-[#050806] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-[#10B981]/50"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 font-medium">Nombre Completo del Producto *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sierra Circular 7-1/4 pulgada 1800W"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-[#050806] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-[#10B981]/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1 font-medium">Categoría</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full p-2 rounded-lg bg-[#050806] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-[#10B981]/50"
                  >
                    <option value="Herramientas eléctricas">Herramientas eléctricas</option>
                    <option value="Fijación y tornillería">Fijación y tornillería</option>
                    <option value="Material eléctrico">Material eléctrico</option>
                    <option value="Acero y construcción">Acero y construcción</option>
                    <option value="Consumibles y corte">Consumibles y corte</option>
                  </select>
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1 font-medium">Clasificación ABC</label>
                  <select
                    value={formAbc}
                    onChange={(e) => setFormAbc(e.target.value as any)}
                    className="w-full p-2 rounded-lg bg-[#050806] border border-white/[0.08] text-white font-mono text-xs focus:outline-none focus:border-[#10B981]/50"
                  >
                    <option value="A">Clase A (Alta rotación)</option>
                    <option value="B">Clase B (Media rotación)</option>
                    <option value="C">Clase C (Baja rotación)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono">
                <div>
                  <label className="text-zinc-400 block mb-1 font-sans font-medium">Costo Unitario (COP)</label>
                  <input
                    type="number"
                    value={formCost}
                    onChange={(e) => setFormCost(Number(e.target.value))}
                    className="w-full p-2 rounded-lg bg-[#050806] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-[#10B981]/50"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1 font-sans font-medium">Precio Venta (COP)</label>
                  <input
                    type="number"
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    className="w-full p-2 rounded-lg bg-[#050806] border border-white/[0.08] text-[#34D399] font-bold text-xs focus:outline-none focus:border-[#10B981]/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 font-mono">
                <div>
                  <label className="text-zinc-400 block mb-1 font-sans font-medium">ROP Base</label>
                  <input
                    type="number"
                    value={formRop}
                    onChange={(e) => setFormRop(Number(e.target.value))}
                    className="w-full p-2 rounded-lg bg-[#050806] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-[#10B981]/50"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1 font-sans font-medium">Stock Seg.</label>
                  <input
                    type="number"
                    value={formSafety}
                    onChange={(e) => setFormSafety(Number(e.target.value))}
                    className="w-full p-2 rounded-lg bg-[#050806] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-[#10B981]/50"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1 font-sans font-medium">Lead Time (d)</label>
                  <input
                    type="number"
                    value={formLeadTime}
                    onChange={(e) => setFormLeadTime(Number(e.target.value))}
                    className="w-full p-2 rounded-lg bg-[#050806] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-[#10B981]/50"
                  />
                </div>
              </div>

              <div className="p-3 border-t border-white/[0.08] bg-[#070B08] flex items-center justify-end gap-2 -mx-5 -mb-5 mt-4">
                <Button variant="secondary" size="sm" type="button" onClick={() => setIsNewSkuModalOpen(false)}>
                  Cancelar
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Registrar SKU
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SIMULADOR DE SHOCK DE COSTOS */}
      {isSimulateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#0A0F0C] border border-white/[0.1] shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#34D399]" />
                <h3 className="text-sm font-bold text-white">Simulador de Shock de Costos Landed</h3>
              </div>
              <button
                onClick={() => setIsSimulateModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 font-mono">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-400">Shock en Flete Logístico:</span>
                  <span className="text-amber-400 font-bold">+{freightShockPct}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={freightShockPct}
                  onChange={(e) => setFreightShockPct(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-400">Aumento Precio FOB Proveedor:</span>
                  <span className="text-amber-400 font-bold">+{supplierPriceShockPct}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={supplierPriceShockPct}
                  onChange={(e) => setSupplierPriceShockPct(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="p-3 rounded-xl bg-[#050806] border border-white/[0.06] space-y-2 mt-4">
                <span className="text-[10px] text-zinc-500 block uppercase font-sans font-bold">
                  Impacto Proyectado en Margen
                </span>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Margen Actual:</span>
                  <span className="text-[#34D399] font-bold">
                    +{(
                      ((selectedProduct.suggestedSalePriceCop - selectedProduct.unitCostCop) /
                        selectedProduct.suggestedSalePriceCop) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Margen tras Shock:</span>
                  <span className="text-amber-400 font-bold">
                    +{(
                      ((selectedProduct.suggestedSalePriceCop -
                        (selectedProduct.landedBreakdown.fobCost * (1 + supplierPriceShockPct / 100) +
                          selectedProduct.landedBreakdown.logisticsFreight * (1 + freightShockPct / 100) +
                          selectedProduct.landedBreakdown.tariffsTaxes +
                          selectedProduct.landedBreakdown.storageShrinkage)) /
                        selectedProduct.suggestedSalePriceCop) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-white/[0.08]">
              <Button variant="secondary" size="sm" onClick={() => setIsSimulateModalOpen(false)}>
                Cerrar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  alert("Escenario de shock persistido en el modelo predictivo de ROP.");
                  setIsSimulateModalOpen(false);
                }}
              >
                Aplicar al Modelo
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
