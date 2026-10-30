import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText,
  Search,
  ShoppingCart,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building,
  DollarSign,
  ArrowUpRight,
  Filter,
  Plus,
  Copy,
  Check,
  Download,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  ExternalLink,
  ChevronRight,
  X,
  Code,
  FileCheck,
  Layers,
  ArrowRight,
  Percent,
  LayoutGrid,
  List,
  RotateCcw,
  MoreHorizontal,
  MapPin,
  Truck,
  Package,
  ShoppingBag,
  UserCheck,
} from "lucide-react";
import { MilestoneStepper, MilestoneStep } from "../ui/MilestoneStepper";
import { StatusBadge } from "../ui/StatusBadge";

interface OrderLineItem {
  sku: string;
  description: string;
  quantity: number;
  unitPriceCop: number;
  subtotalCop: number;
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  receiptFile: string;
  origin: "agente" | "manual";
  specialist: "comprasSpecialist" | "financial_maestro";
  supplier: string;
  supplierCity: string;
  destination: string;
  category: string;
  lineItems: OrderLineItem[];
  subtotalCop: number;
  ivaCop: number;
  aiDiscountCop: number;
  totalCop: number;
  date: string;
  status: "borrador_ia" | "pendiente_gobernanza" | "emitida" | "recibida_bodega";
  policyApplied: string;
  isHitlEscalated: boolean;
  hmacSignature: string;
  mathJustification: {
    currentStock: number;
    ropThreshold: number;
    dailyBurnRate: number;
    coverageDays: number;
    projectedStockoutHours: number;
    recommendationText: string;
  };
}

const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: "po_24a1902e",
    orderNumber: "PO-24A190",
    receiptFile: "receipts/po_24a190.json",
    origin: "agente",
    specialist: "comprasSpecialist",
    supplier: "Ferreterías Unidas Bogotá S.A.S.",
    supplierCity: "Bogotá D.C.",
    destination: "Bodega Matriz Bucaramanga",
    category: "Consumibles de Corte",
    lineItems: [
      {
        sku: "SKU-COR-DISC7",
        description: "Disco Diamantado 7' Concreto Industrial",
        quantity: 30,
        unitPriceCop: 45000,
        subtotalCop: 1350000,
      },
    ],
    subtotalCop: 1350000,
    ivaCop: 256500,
    aiDiscountCop: 56700,
    totalCop: 1549800,
    date: "Hoy, 10:18 a. m.",
    status: "emitida",
    policyApplied: "Autonomía < $5M COP (Regla GOV-01)",
    isHitlEscalated: false,
    hmacSignature: "hmac_sha256_9f81a7b640192e",
    mathJustification: {
      currentStock: 8,
      ropThreshold: 25,
      dailyBurnRate: 2.1,
      coverageDays: 3.8,
      projectedStockoutHours: 91,
      recommendationText:
        "Inventario en 8 un. frente a ROP de 25 un. Burn rate histórico de 2.1 un/día. Lote propuesto de 30 un. cubre 14.2 días de operación. Monto bajo umbral de $5M COP: ejecución autónoma aprobada.",
    },
  },
  {
    id: "po_40bfb88c",
    orderNumber: "PO-40BFB8",
    receiptFile: "receipts/po_40bfb8.json",
    origin: "agente",
    specialist: "financial_maestro",
    supplier: "DeWalt Colombia (Mayorista Homologado)",
    supplierCity: "Bogotá D.C.",
    destination: "Bodega Matriz Bucaramanga",
    category: "Herramientas Eléctricas",
    lineItems: [
      {
        sku: "SKU-MAN-SM400",
        description: "Martillo Demoledor SDS-Max 1500W Industrial",
        quantity: 15,
        unitPriceCop: 425000,
        subtotalCop: 6375000,
      },
    ],
    subtotalCop: 6375000,
    ivaCop: 1211250,
    aiDiscountCop: 267750,
    totalCop: 7318500,
    date: "Hoy, 09:30 a. m.",
    status: "pendiente_gobernanza",
    policyApplied: "HITL Escalada > $5M COP (Regla GOV-03)",
    isHitlEscalated: true,
    hmacSignature: "hmac_sha256_31a89c02ff1e92",
    mathJustification: {
      currentStock: 3,
      ropThreshold: 12,
      dailyBurnRate: 0.8,
      coverageDays: 3.7,
      projectedStockoutHours: 88,
      recommendationText:
        "Stock crítico de 3 un. en Bodega Matriz. El monto total ($7.318.500 COP con IVA) supera el umbral autónomo de $5.000.000 COP. Escalada obligatoria a bandeja /inbox para aprobación de Fernando S.",
    },
  },
  {
    id: "po_89cc412d",
    orderNumber: "PO-89CC41",
    receiptFile: "receipts/po_89cc41.json",
    origin: "agente",
    specialist: "comprasSpecialist",
    supplier: "Mundial de Tornillos S.A.S.",
    supplierCity: "Bucaramanga",
    destination: "CD Bogotá D.C.",
    category: "Fijación y Tornillería",
    lineItems: [
      {
        sku: "SKU-PER-HEXG8",
        description: "Pernos Hexagonales Grado 8 1/2' x 3'",
        quantity: 1200,
        unitPriceCop: 3200,
        subtotalCop: 3840000,
      },
    ],
    subtotalCop: 3840000,
    ivaCop: 729600,
    aiDiscountCop: 161280,
    totalCop: 4408320,
    date: "Ayer, 16:45 p. m.",
    status: "recibida_bodega",
    policyApplied: "Autonomía < $5M COP (Regla GOV-01)",
    isHitlEscalated: false,
    hmacSignature: "hmac_sha256_77c12faa9011",
    mathJustification: {
      currentStock: 120,
      ropThreshold: 500,
      dailyBurnRate: 57.1,
      coverageDays: 2.1,
      projectedStockoutHours: 50,
      recommendationText:
        "Desabasto proyectado en 2.1 días por demanda de obra civil. Pedido recibido y auditado en bodega con 0 discrepancias.",
    },
  },
  {
    id: "po_19ea78b1",
    orderNumber: "PO-19EA78",
    receiptFile: "receipts/po_19ea78.json",
    origin: "manual",
    specialist: "comprasSpecialist",
    supplier: "Distribuidora del Centro S.A.S.",
    supplierCity: "Bucaramanga",
    destination: "Bodega Matriz Bucaramanga",
    category: "Soldadura y Ensamble",
    lineItems: [
      {
        sku: "SKU-SOL-E6013",
        description: "Soldadura E6013 1/8' Caja 20kg",
        quantity: 25,
        unitPriceCop: 210000,
        subtotalCop: 5250000,
      },
    ],
    subtotalCop: 5250000,
    ivaCop: 997500,
    aiDiscountCop: 0,
    totalCop: 6247500,
    date: "27 Oct 2026",
    status: "emitida",
    policyApplied: "HITL Aprobada ($5M+) por Fernando S.",
    isHitlEscalated: true,
    hmacSignature: "hmac_sha256_44b9d033f810",
    mathJustification: {
      currentStock: 14,
      ropThreshold: 40,
      dailyBurnRate: 4.1,
      coverageDays: 3.4,
      projectedStockoutHours: 81,
      recommendationText:
        "Solicitud manual creada por operador. Justificación técnica: Lote de refuerzo para contrato Anillo Vial Girón.",
    },
  },
  {
    id: "po_99fa120e",
    orderNumber: "PO-99FA12",
    receiptFile: "receipts/po_99fa12.json",
    origin: "agente",
    specialist: "financial_maestro",
    supplier: "Bosch Sistemas Industriales Colombia",
    supplierCity: "Medellín",
    destination: "CD Medellín",
    category: "Herramientas Eléctricas",
    lineItems: [
      {
        sku: "SKU-TAL-IMP20",
        description: "Taladro de Impacto Inalámbrico 20V Industrial",
        quantity: 45,
        unitPriceCop: 420000,
        subtotalCop: 18900000,
      },
    ],
    subtotalCop: 18900000,
    ivaCop: 3591000,
    aiDiscountCop: 945000,
    totalCop: 21546000,
    date: "26 Oct 2026",
    status: "pendiente_gobernanza",
    policyApplied: "HITL Escalada > $5M COP (Regla GOV-03)",
    isHitlEscalated: true,
    hmacSignature: "hmac_sha256_dd410a88de44",
    mathJustification: {
      currentStock: 12,
      ropThreshold: 35,
      dailyBurnRate: 1.8,
      coverageDays: 6.6,
      projectedStockoutHours: 158,
      recommendationText:
        "Compra consolidada semestral para capturar el 5.0% de descuento por volumen ofrecido en playbook de negociación.",
    },
  },
  {
    id: "po_22ba8110",
    orderNumber: "PO-22BA81",
    receiptFile: "receipts/po_22ba81.json",
    origin: "agente",
    specialist: "comprasSpecialist",
    supplier: "Siderúrgica de Santander S.A.S.",
    supplierCity: "Piedecuesta",
    destination: "Bodega Matriz Bucaramanga",
    category: "Perfiles de Acero",
    lineItems: [
      {
        sku: "SKU-ACE-MALLA6",
        description: "Mallas Electrosoldadas 6mm 2.4x6m",
        quantity: 100,
        unitPriceCop: 124000,
        subtotalCop: 12400000,
      },
    ],
    subtotalCop: 12400000,
    ivaCop: 2356000,
    aiDiscountCop: 620000,
    totalCop: 14136000,
    date: "28 Oct 2026",
    status: "borrador_ia",
    policyApplied: "Borrador de Cotización Evaluado por Agente",
    isHitlEscalated: true,
    hmacSignature: "hmac_sha256_draft_01",
    mathJustification: {
      currentStock: 20,
      ropThreshold: 60,
      dailyBurnRate: 6.2,
      coverageDays: 3.2,
      projectedStockoutHours: 76,
      recommendationText:
        "Borrador en formulación. Landed Cost calculado en $14.136.000 COP incluyendo flete de camión doble troque.",
    },
  },
];

interface PurchaseOrdersViewProps {
  onOpenApprovalModal?: () => void;
}

export const PurchaseOrdersView: React.FC<PurchaseOrdersViewProps> = ({
  onOpenApprovalModal,
}) => {
  const [orders, setOrders] = useState<PurchaseOrder[]>(INITIAL_PURCHASE_ORDERS);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("po_24a1902e");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "borrador_ia" | "emitida" | "recibida_bodega">("all");
  const [warehouseFilter, setWarehouseFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [approvalFilter, setApprovalFilter] = useState<string>("all");
  const [minAmount, setMinAmount] = useState<string>("");
  const [maxAmount, setMaxAmount] = useState<string>("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Receipt Drawer Mode
  const [isReceiptDrawerOpen, setIsReceiptDrawerOpen] = useState(false);
  const [receiptMode, setReceiptMode] = useState<"formatted" | "json">("formatted");

  // Modal: Nueva Orden de Compra
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [newOrderSupplier, setNewOrderSupplier] = useState("Ferreterías Unidas Bogotá S.A.S.");
  const [newOrderProduct, setNewOrderProduct] = useState("Disco Diamantado 7' Concreto");
  const [newOrderQuantity, setNewOrderQuantity] = useState(25);
  const [newOrderUnitPrice, setNewOrderUnitPrice] = useState(45000);

  // Reconcile processing state
  const [isReconciling, setIsReconciling] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) || orders[0],
    [orders, selectedOrderId]
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const handleResetFilters = () => {
    setStatusFilter("all");
    setWarehouseFilter("all");
    setDateFilter("all");
    setSupplierFilter("all");
    setApprovalFilter("all");
    setMinAmount("");
    setMaxAmount("");
    setSearchQuery("");
    showToast("Filtros restablecidos a valores por defecto.");
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // 1. Search Query
      const matchesSearch =
        searchQuery === "" ||
        o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.lineItems.some(
          (item) =>
            item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.sku.toLowerCase().includes(searchQuery.toLowerCase())
        );

      // 2. Estado (2x2 Buttons)
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "borrador_ia" && o.status === "borrador_ia") ||
        (statusFilter === "emitida" && (o.status === "emitida" || o.status === "pendiente_gobernanza")) ||
        (statusFilter === "recibida_bodega" && o.status === "recibida_bodega");

      // 3. Sede / Bodega
      const matchesWarehouse =
        warehouseFilter === "all" ||
        (warehouseFilter === "wh_bga" && o.destination.includes("Bucaramanga")) ||
        (warehouseFilter === "wh_bog" && o.destination.includes("Bogotá")) ||
        (warehouseFilter === "wh_med" && o.destination.includes("Medellín"));

      // 4. Proveedor
      const matchesSupplier =
        supplierFilter === "all" ||
        (supplierFilter === "ferreterias_unidas" && o.supplier.includes("Ferreterías Unidas")) ||
        (supplierFilter === "dewalt" && o.supplier.includes("DeWalt")) ||
        (supplierFilter === "mundial" && o.supplier.includes("Mundial de Tornillos")) ||
        (supplierFilter === "distribuidora" && o.supplier.includes("Distribuidora del Centro")) ||
        (supplierFilter === "bosch" && o.supplier.includes("Bosch")) ||
        (supplierFilter === "siderurgica" && o.supplier.includes("Siderúrgica"));

      // 5. Nivel de Aprobación
      const matchesApproval =
        approvalFilter === "all" ||
        (approvalFilter === "autonoma" && !o.isHitlEscalated) ||
        (approvalFilter === "hitl" && o.isHitlEscalated);

      // 6. Rango de Monto
      const minVal = minAmount ? parseFloat(minAmount) : 0;
      const maxVal = maxAmount ? parseFloat(maxAmount) : Infinity;
      const matchesAmount = o.totalCop >= minVal && o.totalCop <= maxVal;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesWarehouse &&
        matchesSupplier &&
        matchesApproval &&
        matchesAmount
      );
    });
  }, [
    orders,
    searchQuery,
    statusFilter,
    warehouseFilter,
    supplierFilter,
    approvalFilter,
    minAmount,
    maxAmount,
  ]);

  const handleCreateOrder = () => {
    const subtotal = newOrderQuantity * newOrderUnitPrice;
    const iva = subtotal * 0.19;
    const total = subtotal + iva;
    const isOverThreshold = total > 5000000;

    const newPO: PurchaseOrder = {
      id: `po_${Date.now()}`,
      orderNumber: `PO-${Math.random().toString(16).substring(2, 8).toUpperCase()}`,
      receiptFile: `receipts/po_${Date.now()}.json`,
      origin: "manual",
      specialist: "comprasSpecialist",
      supplier: newOrderSupplier,
      supplierCity: "Bucaramanga",
      destination: "Bodega Matriz Bucaramanga",
      category: "Materiales & Repuestos",
      lineItems: [
        {
          sku: "SKU-MAN-GENERIC",
          description: newOrderProduct,
          quantity: newOrderQuantity,
          unitPriceCop: newOrderUnitPrice,
          subtotalCop: subtotal,
        },
      ],
      subtotalCop: subtotal,
      ivaCop: iva,
      aiDiscountCop: 0,
      totalCop: total,
      date: "Hoy, Justo ahora",
      status: isOverThreshold ? "pendiente_gobernanza" : "emitida",
      policyApplied: isOverThreshold
        ? "HITL Escalada > $5M COP (Regla GOV-03)"
        : "Autonomía < $5M COP (Regla GOV-01)",
      isHitlEscalated: isOverThreshold,
      hmacSignature: `hmac_sha256_${Math.random().toString(16).substring(2, 10)}`,
      mathJustification: {
        currentStock: 5,
        ropThreshold: 20,
        dailyBurnRate: 1.5,
        coverageDays: 3.3,
        projectedStockoutHours: 80,
        recommendationText: `Orden manual ingresada por operador. ${
          isOverThreshold
            ? "Monto sobre $5.000.000 COP: Enviada a bandeja de aprobaciones."
            : "Monto bajo umbral de gobernanza: Autorización inmediata."
        }`,
      },
    };

    setOrders((prev) => [newPO, ...prev]);
    setSelectedOrderId(newPO.id);
    setIsNewOrderModalOpen(false);
    showToast(
      `Orden ${newPO.orderNumber} creada con éxito (${
        isOverThreshold ? "Escalada a /inbox" : "Emitida al proveedor"
      }).`
    );
  };

  const handleReconcileOrder = (orderId: string) => {
    setIsReconciling(true);
    setTimeout(() => {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: "recibida_bodega" as const }
            : o
        )
      );
      setIsReconciling(false);
      showToast(
        "reconciliarFactura: Factura y remisión de proveedor cotejadas contra existencias físicas. 0 discrepancias."
      );
    }, 900);
  };

  // 2x2 Filter Buttons definition matching user specification
  const statusButtons: {
    id: "all" | "borrador_ia" | "emitida" | "recibida_bodega";
    label: string;
    count: number;
  }[] = [
    { id: "all", label: "Todas", count: 32 },
    { id: "borrador_ia", label: "Borrador IA", count: 8 },
    { id: "emitida", label: "En Tránsito", count: 14 },
    { id: "recibida_bodega", label: "Recibidas", count: 10 },
  ];

  return (
    <div className="flex-1 h-full overflow-hidden flex flex-col bg-canvas text-[#F9FAFB] font-sans select-none relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            className="fixed top-6 right-8 z-50 px-4 py-3 rounded-full flex items-center gap-3 bg-[#0A160E]/95 border border-[#10B981]/40 text-[#34D399] shadow-[0_0_25px_rgba(16,185,129,0.25)] backdrop-blur-xl"
          >
            <div className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
            <span className="text-xs font-mono font-medium">{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-[#8E9893] hover:text-[#F9FAFB] text-xs ml-1"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* 1. HEADER SUPERIOR EJECUTIVO (INVENTAR STYLE)             */}
      {/* ========================================================= */}
      <header className="px-6 py-4 bg-canvas border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Purchase Order
          </h1>
          <span className="text-zinc-500 font-mono text-xs hidden md:inline">
            · Flujo de Abastecimiento & Gobernanza
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Buscador de productos y órdenes */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar producto, PO o proveedor..."
              className="h-9 w-60 sm:w-72 bg-surface-1 border border-white/[0.08] hover:border-white/20 focus:border-emerald-500/50 rounded-xl pl-9 pr-9 text-xs text-white placeholder:text-zinc-500 focus:outline-none transition-all font-sans"
            />
            <span className="absolute right-2.5 text-[10px] font-mono text-zinc-500 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06] pointer-events-none">
              ⌘F
            </span>
          </div>

          {/* Switcher de Vista (Tarjetas Inventar vs Tabla) */}
          <div className="flex items-center p-1 rounded-xl bg-surface-1 border border-white/[0.08]">
            <button
              onClick={() => setViewMode("cards")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "cards"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "text-zinc-500 hover:text-white"
              }`}
              title="Vista de Tarjetas con Stepper (Inventar)"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "table"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "text-zinc-500 hover:text-white"
              }`}
              title="Vista de Tabla"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Botón Primario: Nueva Orden de Compra */}
          <button
            onClick={() => setIsNewOrderModalOpen(true)}
            className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.45)]"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Nueva Orden</span>
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. ÁREA PRINCIPAL: MASTER-FILTER LATERAL (260px) + LISTA  */}
      {/* ========================================================= */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row p-6 gap-6 min-h-0">
        {/* ------------------------------------------------------- */}
        {/* PANEL IZQUIERDO DE FILTROS (260px)                      */}
        {/* ------------------------------------------------------- */}
        <aside className="w-full md:w-[260px] flex-shrink-0 bg-surface-1 rounded-2xl p-4 border border-white/[0.06] shadow-card flex flex-col justify-between overflow-y-auto custom-scrollbar space-y-5">
          <div className="space-y-5">
            {/* Sección: ESTADO DE ORDEN (Grid 2x2) */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                ESTADO DE ORDEN
              </span>
              <div className="grid grid-cols-2 gap-2">
                {statusButtons.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setStatusFilter(st.id)}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      statusFilter === st.id
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)] font-bold"
                        : "bg-surface-well border-white/[0.04] text-zinc-400 hover:text-white hover:border-white/10"
                    }`}
                  >
                    <span className="text-[11px] leading-tight block">{st.label}</span>
                    <span
                      className={`text-[10px] font-mono mt-1 px-1.5 py-0.2 rounded w-fit ${
                        statusFilter === st.id
                          ? "bg-emerald-500/20 text-emerald-300 font-bold"
                          : "bg-white/[0.04] text-zinc-500"
                      }`}
                    >
                      {st.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sección: FILTRAR POR (Selectores Desplegables en Well) */}
            <div className="space-y-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                FILTRAR POR
              </span>

              {/* Sede / Bodega */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-zinc-500 block">Sede / Bodega</label>
                <select
                  value={warehouseFilter}
                  onChange={(e) => setWarehouseFilter(e.target.value)}
                  className="w-full h-8 bg-surface-well border border-white/[0.04] rounded-xl px-2.5 text-xs text-zinc-300 font-sans focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                >
                  <option value="all">Todas las sedes</option>
                  <option value="wh_bga">Bodega Matriz Bucaramanga</option>
                  <option value="wh_bog">CD Bogotá D.C.</option>
                  <option value="wh_med">CD Medellín</option>
                </select>
              </div>

              {/* Fecha de Orden */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-zinc-500 block">Fecha de Orden</label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full h-8 bg-surface-well border border-white/[0.04] rounded-xl px-2.5 text-xs text-zinc-300 font-sans focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                >
                  <option value="all">Todas las fechas</option>
                  <option value="hoy">Hoy (29 Oct)</option>
                  <option value="semana">Últimos 7 días</option>
                  <option value="mes">Mes de Octubre</option>
                </select>
              </div>

              {/* Proveedor */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-zinc-500 block">Proveedor</label>
                <select
                  value={supplierFilter}
                  onChange={(e) => setSupplierFilter(e.target.value)}
                  className="w-full h-8 bg-surface-well border border-white/[0.04] rounded-xl px-2.5 text-xs text-zinc-300 font-sans focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                >
                  <option value="all">Todos los proveedores</option>
                  <option value="ferreterias_unidas">Ferreterías Unidas Bogotá</option>
                  <option value="dewalt">DeWalt Colombia</option>
                  <option value="mundial">Mundial de Tornillos</option>
                  <option value="distribuidora">Distribuidora del Centro</option>
                  <option value="bosch">Bosch Sistemas Industriales</option>
                  <option value="siderurgica">Siderúrgica de Santander</option>
                </select>
              </div>

              {/* Nivel de Aprobación */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-zinc-500 block">Nivel de Aprobación</label>
                <select
                  value={approvalFilter}
                  onChange={(e) => setApprovalFilter(e.target.value)}
                  className="w-full h-8 bg-surface-well border border-white/[0.04] rounded-xl px-2.5 text-xs text-zinc-300 font-sans focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                >
                  <option value="all">Todos los niveles</option>
                  <option value="autonoma">Autonomía &lt; $5M COP (GOV-01)</option>
                  <option value="hitl">Requiere Firma Ejecutiva &gt; $5M COP (GOV-03)</option>
                </select>
              </div>
            </div>

            {/* Sección: RANGO DE MONTO ($) */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                RANGO DE MONTO ($)
              </span>
              <div className="space-y-2">
                <div className="relative flex items-center">
                  <span className="absolute left-2.5 text-xs font-mono text-zinc-500">$</span>
                  <input
                    type="number"
                    placeholder="Monto mínimo"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    className="w-full h-8 bg-surface-well border border-white/[0.04] rounded-xl pl-6 pr-2.5 text-xs text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-2.5 text-xs font-mono text-zinc-500">$</span>
                  <input
                    type="number"
                    placeholder="Monto máximo"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    className="w-full h-8 bg-surface-well border border-white/[0.04] rounded-xl pl-6 pr-2.5 text-xs text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Botón Restablecer Filtros */}
          <button
            onClick={handleResetFilters}
            className="w-full h-8 rounded-xl bg-surface-well hover:bg-white/[0.04] border border-white/[0.06] text-zinc-400 hover:text-white text-xs font-mono flex items-center justify-center gap-2 transition-colors mt-2"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Restablecer Filtros</span>
          </button>
        </aside>

        {/* ------------------------------------------------------- */}
        {/* LISTA DERECHA DE ÓRDENES DE COMPRA (INVENTAR CARDS)     */}
        {/* ------------------------------------------------------- */}
        <main className="flex-1 overflow-y-auto custom-scrollbar space-y-3.5 min-h-0">
          {viewMode === "cards" ? (
            <div className="space-y-3.5">
              {filteredOrders.map((o) => {
                const isSelected = selectedOrderId === o.id;

                // Configuración del Stepper de 4 etapas:
                // 1. Creación IA -> 2. Aprobación Gobernanza -> 3. Despacho Proveedor -> 4. Recepción Bodega
                let stepperTitle = "";
                let stepperMeta = "";
                let stepperAction: React.ReactNode = null;
                let steps: MilestoneStep[] = [];

                if (o.status === "emitida") {
                  stepperTitle = `Orden en tránsito hacia ${o.destination.replace("Bodega Matriz ", "").replace("CD ", "")} • ${o.date}`;
                  stepperMeta = `Destino: ${o.destination}`;
                  stepperAction = (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOrderId(o.id);
                        setIsReceiptDrawerOpen(true);
                      }}
                      className="flex items-center gap-1 font-mono text-xs text-emerald-400 hover:text-emerald-300 font-semibold hover:underline"
                    >
                      <span>Rastrear envío</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  );
                  steps = [
                    { label: "Creación IA", timestamp: "Autónoma", status: "completed", icon: <Sparkles className="w-3.5 h-3.5" /> },
                    { label: "Aprobación Gobernanza", timestamp: "GOV-01 Aprobada", status: "completed", icon: <ShieldCheck className="w-3.5 h-3.5" /> },
                    { label: "Despacho Proveedor", timestamp: "En ruta (48 km)", status: "active", icon: <Truck className="w-3.5 h-3.5" /> },
                    { label: "Recepción Bodega", timestamp: "Pendiente", status: "pending", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
                  ];
                } else if (o.status === "pendiente_gobernanza") {
                  stepperTitle = `Pendiente de aprobación ejecutiva (> $5M COP) • ${o.date}`;
                  stepperMeta = o.policyApplied;
                  stepperAction = (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenApprovalModal) onOpenApprovalModal();
                      }}
                      className="flex items-center gap-1 font-mono text-xs text-amber-400 hover:text-amber-300 font-semibold hover:underline"
                    >
                      <span>Revisar en Inbox</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  );
                  steps = [
                    { label: "Creación IA", timestamp: "Formulada", status: "completed", icon: <Sparkles className="w-3.5 h-3.5" /> },
                    { label: "Aprobación Gobernanza", timestamp: "En espera firma", status: "warning", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
                    { label: "Despacho Proveedor", timestamp: "Retenido", status: "pending", icon: <Truck className="w-3.5 h-3.5" /> },
                    { label: "Recepción Bodega", timestamp: "Pendiente", status: "pending", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
                  ];
                } else if (o.status === "recibida_bodega") {
                  stepperTitle = `Paquete recibido y conciliado en bodega • ${o.date}`;
                  stepperMeta = "Factura cotejada: 0 discrepancias físicas";
                  stepperAction = (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOrderId(o.id);
                        setIsReceiptDrawerOpen(true);
                      }}
                      className="flex items-center gap-1 font-mono text-xs text-emerald-400 hover:text-emerald-300 font-semibold hover:underline"
                    >
                      <span>Ver recibo digital</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  );
                  steps = [
                    { label: "Creación IA", timestamp: "Completada", status: "completed", icon: <Sparkles className="w-3.5 h-3.5" /> },
                    { label: "Aprobación Gobernanza", timestamp: "Aprobada", status: "completed", icon: <ShieldCheck className="w-3.5 h-3.5" /> },
                    { label: "Despacho Proveedor", timestamp: "Entregado", status: "completed", icon: <Truck className="w-3.5 h-3.5" /> },
                    { label: "Recepción Bodega", timestamp: "Conciliada", status: "completed", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
                  ];
                } else {
                  stepperTitle = `Borrador de cotización en formulación por agente • ${o.date}`;
                  stepperMeta = "Landed Cost calculado por financial_maestro";
                  stepperAction = (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOrderId(o.id);
                        setIsReceiptDrawerOpen(true);
                      }}
                      className="flex items-center gap-1 font-mono text-xs text-blue-400 hover:text-blue-300 font-semibold hover:underline"
                    >
                      <span>Ver justificación</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  );
                  steps = [
                    { label: "Creación IA", timestamp: "En formulación", status: "active", icon: <Sparkles className="w-3.5 h-3.5" /> },
                    { label: "Aprobación Gobernanza", timestamp: "Pendiente", status: "pending", icon: <ShieldCheck className="w-3.5 h-3.5" /> },
                    { label: "Despacho Proveedor", timestamp: "Pendiente", status: "pending", icon: <Truck className="w-3.5 h-3.5" /> },
                    { label: "Recepción Bodega", timestamp: "Pendiente", status: "pending", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
                  ];
                }

                const badgeStatus =
                  o.status === "recibida_bodega"
                    ? "paid"
                    : o.status === "emitida"
                    ? "shipped"
                    : o.status === "pendiente_gobernanza"
                    ? "pendiente"
                    : "en_curso";

                const badgeLabel =
                  o.status === "recibida_bodega"
                    ? "Recibida / Conciliada"
                    : o.status === "emitida"
                    ? "Aprobada / En Tránsito"
                    : o.status === "pendiente_gobernanza"
                    ? "Pendiente de Aprobación"
                    : "Borrador IA";

                return (
                  <div
                    key={o.id}
                    onClick={() => {
                      setSelectedOrderId(o.id);
                    }}
                    className={`bg-surface-1 rounded-2xl p-5 mb-3.5 border transition-all cursor-pointer shadow-card hover:border-white/10 ${
                      isSelected
                        ? "border-emerald-500/40 ring-1 ring-emerald-500/20 bg-[#14201A]"
                        : "border-white/[0.06]"
                    }`}
                  >
                    {/* NIVEL SUPERIOR: Código PO + Nombre insumo y cantidad + Monto + Badge + Botón ••• */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono text-base font-bold text-white tracking-tight flex-shrink-0">
                          {o.orderNumber}
                        </span>
                        <span className="text-zinc-600 font-mono">·</span>
                        <span className="text-sm font-semibold text-zinc-100 truncate">
                          {o.lineItems[0]?.description} x {o.lineItems[0]?.quantity} u.
                        </span>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="font-mono text-sm font-bold text-white tabular-nums">
                          ${o.totalCop.toLocaleString("es-CO")} COP
                        </span>
                        <StatusBadge status={badgeStatus} label={badgeLabel} size="sm" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrderId(o.id);
                            setIsReceiptDrawerOpen(true);
                          }}
                          className="w-8 h-8 rounded-lg bg-surface-well border border-white/[0.04] text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
                          title="Opciones y recibo digital"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* SUBTÍTULO CON AVATAR DE PROVEEDOR */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2 text-xs text-zinc-400">
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                          {o.supplier.charAt(0)}
                        </div>
                        <span className="text-zinc-200 font-medium truncate max-w-[200px]">
                          {o.supplier}
                        </span>
                        <span className="text-zinc-600">·</span>
                        <div className="flex items-center gap-1 text-zinc-400">
                          <MapPin className="w-3 h-3 text-zinc-500" />
                          <span>{o.destination}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
                        <span className="bg-white/[0.04] px-1.5 py-0.5 rounded text-zinc-300">
                          Billed · Facturado
                        </span>
                        <span className="text-zinc-600">·</span>
                        <span>{o.specialist}</span>
                      </div>
                    </div>

                    {/* NIVEL INFERIOR: CONTENEDOR "WELL" CON MILESTONE STEPPER */}
                    <div className="bg-surface-well rounded-xl p-4 mt-3 border border-white/[0.04] shadow-inner space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white tracking-tight">
                          {stepperTitle}
                        </span>
                        {stepperAction}
                      </div>

                      {/* Stepper de 4 etapas con iconos */}
                      <MilestoneStepper steps={steps} />
                    </div>
                  </div>
                );
              })}

              {filteredOrders.length === 0 && (
                <div className="p-12 text-center text-xs font-mono text-zinc-500 bg-surface-1 rounded-2xl border border-white/[0.06]">
                  No se encontraron órdenes de compra que coincidan con los filtros aplicados.
                </div>
              )}
            </div>
          ) : (
            /* Vista de Tabla Alternativa */
            <div className="rounded-2xl bg-surface-1 border border-white/[0.06] shadow-card overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#0B110E] border-b border-white/[0.06] text-zinc-400 font-mono text-[10px] uppercase tracking-wider">
                    <th className="py-3 px-4 font-semibold">ID de Orden</th>
                    <th className="py-3 px-3 font-semibold">Proveedor</th>
                    <th className="py-3 px-3 font-semibold">Ítems / Cantidad</th>
                    <th className="py-3 px-3 font-semibold text-right">Monto Total</th>
                    <th className="py-3 px-3 font-semibold text-center">Estado</th>
                    <th className="py-3 px-4 font-semibold text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredOrders.map((o) => (
                    <tr
                      key={o.id}
                      onClick={() => {
                        setSelectedOrderId(o.id);
                        setIsReceiptDrawerOpen(true);
                      }}
                      className="hover:bg-[#151E19] transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                        {o.orderNumber}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="font-semibold text-white block">{o.supplier}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">{o.destination}</span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="text-zinc-200 block truncate max-w-[200px]">
                          {o.lineItems[0]?.description}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {o.lineItems[0]?.quantity} un.
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-white tabular-nums">
                        ${o.totalCop.toLocaleString("es-CO")} COP
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <StatusBadge
                          status={
                            o.status === "recibida_bodega"
                              ? "paid"
                              : o.status === "emitida"
                              ? "shipped"
                              : o.status === "pendiente_gobernanza"
                              ? "pendiente"
                              : "en_curso"
                          }
                          size="sm"
                        />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrderId(o.id);
                            setIsReceiptDrawerOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-surface-well border border-white/[0.06] text-zinc-300 hover:text-white font-mono text-[10px]"
                        >
                          Ver Recibo
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {/* ========================================================= */}
      {/* DRAWER LATERAL DE AUDITORÍA Y RECIBO DIGITAL (SLIDE-OVER) */}
      {/* ========================================================= */}
      <AnimatePresence>
        {isReceiptDrawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ x: 450 }}
              animate={{ x: 0 }}
              exit={{ x: 450 }}
              transition={{ type: "spring", damping: 30, stiffness: 350 }}
              className="w-full max-w-[460px] h-full bg-surface-1 border-l border-white/[0.08] p-6 flex flex-col justify-between overflow-y-auto custom-scrollbar shadow-2xl relative"
            >
              <div className="space-y-5">
                {/* Header del Drawer */}
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
                  <div>
                    <span className="font-mono text-[10px] text-emerald-400 uppercase tracking-wider block font-bold">
                      RECIBO DIGITAL AUDITABLE
                    </span>
                    <h2 className="text-base font-bold text-white mt-0.5">
                      {selectedOrder.orderNumber}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center p-0.5 rounded-lg bg-surface-well border border-white/[0.04]">
                      <button
                        onClick={() => setReceiptMode("formatted")}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                          receiptMode === "formatted"
                            ? "bg-emerald-500/20 text-emerald-300 font-bold"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        Recibo
                      </button>
                      <button
                        onClick={() => setReceiptMode("json")}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                          receiptMode === "json"
                            ? "bg-emerald-500/20 text-emerald-300 font-bold"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        JSON
                      </button>
                    </div>

                    <button
                      onClick={() => setIsReceiptDrawerOpen(false)}
                      className="w-8 h-8 rounded-lg bg-surface-well border border-white/[0.04] text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {receiptMode === "formatted" ? (
                  /* VISTA DE RECIBO FORMATEADO */
                  <div className="space-y-4">
                    {/* Proveedor y Destino */}
                    <div className="bg-surface-well rounded-xl p-4 border border-white/[0.04] space-y-2">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-bold text-white">{selectedOrder.supplier}</span>
                        <span className="text-[10px] font-mono text-zinc-500">{selectedOrder.date}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 font-mono">
                        Destino: {selectedOrder.destination} · Especialista: {selectedOrder.specialist}
                      </p>
                    </div>

                    {/* Justificación de Algoritmo ROP */}
                    <div className="p-3.5 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Justificación de Algoritmo ROP</span>
                      </div>
                      <p className="text-[11px] text-zinc-300 leading-relaxed">
                        {selectedOrder.mathJustification.recommendationText}
                      </p>
                      <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-emerald-500/20 text-[10px] font-mono text-zinc-400">
                        <span>Burn Rate: {selectedOrder.mathJustification.dailyBurnRate} un/día</span>
                        <span>Cobertura: {selectedOrder.mathJustification.coverageDays} días</span>
                      </div>
                    </div>

                    {/* Ítems y Desglose */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono uppercase text-zinc-400 block font-bold">
                        Ítems de la Orden
                      </span>
                      {selectedOrder.lineItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-surface-well border border-white/[0.04] flex justify-between items-center text-xs font-mono"
                        >
                          <div>
                            <span className="font-semibold text-white block">{item.description}</span>
                            <span className="text-[10px] text-zinc-500">
                              {item.sku} · {item.quantity} un. × ${item.unitPriceCop.toLocaleString("es-CO")}
                            </span>
                          </div>
                          <span className="font-bold text-white">
                            ${item.subtotalCop.toLocaleString("es-CO")}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Totales */}
                    <div className="space-y-1.5 pt-2 border-t border-white/[0.06] text-xs font-mono">
                      <div className="flex justify-between text-zinc-400">
                        <span>Subtotal Neto:</span>
                        <span>${selectedOrder.subtotalCop.toLocaleString("es-CO")} COP</span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>IVA (19%):</span>
                        <span>+${selectedOrder.ivaCop.toLocaleString("es-CO")} COP</span>
                      </div>
                      {selectedOrder.aiDiscountCop > 0 && (
                        <div className="flex justify-between text-emerald-400">
                          <span>Descuento Negociado IA:</span>
                          <span>-${selectedOrder.aiDiscountCop.toLocaleString("es-CO")} COP</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-white/[0.06]">
                        <span>Total Liquidado:</span>
                        <span className="text-emerald-400 font-bold">
                          ${selectedOrder.totalCop.toLocaleString("es-CO")} COP
                        </span>
                      </div>
                    </div>

                    {/* Firma Criptográfica HMAC */}
                    <div className="p-3 rounded-xl bg-surface-well border border-white/[0.04] space-y-1 font-mono text-[10px]">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Firma Criptográfica HMAC-SHA256 Verificada</span>
                      </div>
                      <span className="text-zinc-500 block truncate">{selectedOrder.hmacSignature}</span>
                    </div>
                  </div>
                ) : (
                  /* VISTA RAW JSON */
                  <pre className="p-4 rounded-xl bg-surface-well border border-white/[0.04] text-[11px] font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {JSON.stringify(selectedOrder, null, 2)}
                  </pre>
                )}
              </div>

              {/* Botón Inferior de Reconciliación */}
              <div className="pt-4 border-t border-white/[0.06] flex items-center gap-2">
                <button
                  onClick={() => {
                    handleReconcileOrder(selectedOrder.id);
                  }}
                  disabled={isReconciling || selectedOrder.status === "recibida_bodega"}
                  className="flex-1 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isReconciling ? "animate-spin" : ""}`} />
                  <span>
                    {selectedOrder.status === "recibida_bodega"
                      ? "Orden Conciliada"
                      : "Ejecutar Reconciliación Física"}
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* MODAL: NUEVA ORDEN DE COMPRA                              */}
      {/* ========================================================= */}
      {isNewOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-surface-1 border border-white/[0.1] shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-xs font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <span className="font-mono text-[10px] text-emerald-400 block font-bold">
                  CREAR ORDEN DE COMPRA · CONTROL EJECUTIVO
                </span>
                <h3 className="text-sm font-bold text-white tracking-tight mt-0.5">
                  Nueva Solicitud de Abastecimiento
                </h3>
              </div>
              <button
                onClick={() => setIsNewOrderModalOpen(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 font-mono">
              <div>
                <label className="text-zinc-400 block mb-1 font-sans font-medium">Proveedor:</label>
                <select
                  value={newOrderSupplier}
                  onChange={(e) => setNewOrderSupplier(e.target.value)}
                  className="w-full h-9 bg-surface-well border border-white/[0.08] rounded-xl px-3 text-zinc-300 font-sans text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="Ferreterías Unidas Bogotá S.A.S.">Ferreterías Unidas Bogotá S.A.S.</option>
                  <option value="DeWalt Colombia (Mayorista Homologado)">DeWalt Colombia</option>
                  <option value="Mundial de Tornillos S.A.S.">Mundial de Tornillos S.A.S.</option>
                  <option value="Distribuidora del Centro S.A.S.">Distribuidora del Centro S.A.S.</option>
                  <option value="Bosch Sistemas Industriales Colombia">Bosch Sistemas Industriales</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 font-sans font-medium">Descripción del Producto:</label>
                <input
                  type="text"
                  value={newOrderProduct}
                  onChange={(e) => setNewOrderProduct(e.target.value)}
                  className="w-full h-9 bg-surface-well border border-white/[0.08] rounded-xl px-3 text-white font-sans text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1 font-sans font-medium">Cantidad:</label>
                  <input
                    type="number"
                    value={newOrderQuantity}
                    onChange={(e) => setNewOrderQuantity(parseInt(e.target.value) || 0)}
                    className="w-full h-9 bg-surface-well border border-white/[0.08] rounded-xl px-3 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1 font-sans font-medium">Precio Unitario (COP):</label>
                  <input
                    type="number"
                    value={newOrderUnitPrice}
                    onChange={(e) => setNewOrderUnitPrice(parseInt(e.target.value) || 0)}
                    className="w-full h-9 bg-surface-well border border-white/[0.08] rounded-xl px-3 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-well border border-white/[0.04] space-y-1 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Subtotal:</span>
                  <span>${(newOrderQuantity * newOrderUnitPrice).toLocaleString("es-CO")} COP</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>IVA (19%):</span>
                  <span>+${(newOrderQuantity * newOrderUnitPrice * 0.19).toLocaleString("es-CO")} COP</span>
                </div>
                <div className="flex justify-between text-white font-bold pt-1 border-t border-white/[0.04]">
                  <span>Total Estimado:</span>
                  <span className="text-emerald-400">
                    ${(newOrderQuantity * newOrderUnitPrice * 1.19).toLocaleString("es-CO")} COP
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-white/[0.08]">
              <button
                onClick={() => setIsNewOrderModalOpen(false)}
                className="px-3.5 py-2 rounded-xl bg-transparent hover:bg-white/[0.04] text-zinc-400 text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateOrder}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)]"
              >
                <span>Generar Orden</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
