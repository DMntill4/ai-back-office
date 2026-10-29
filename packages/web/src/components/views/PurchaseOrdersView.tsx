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
} from "lucide-react";

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
    orderNumber: "PO-2026-0089",
    receiptFile: "receipts/po_2026_0089.json",
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
    orderNumber: "PO-2026-0090",
    receiptFile: "receipts/po_2026_0090.json",
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
    orderNumber: "PO-2026-0091",
    receiptFile: "receipts/po_2026_0091.json",
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
    orderNumber: "PO-2026-0092",
    receiptFile: "receipts/po_2026_0092.json",
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
    orderNumber: "PO-2026-0093",
    receiptFile: "receipts/po_2026_0093.json",
    origin: "agente",
    specialist: "financial_maestro",
    supplier: "Bosch Sistemas Industriales Colombia",
    supplierCity: "Medellín",
    destination: "CD Medellín",
    category: "Herramientas Eléctricas",
    lineItems: [
      {
        sku: "SKU-TAL-IMP20",
        description: "Taladro de Impacto Inalámbrico 20V",
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
    orderNumber: "PO-2026-0094",
    receiptFile: "receipts/po_2026_0094.json",
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
  const [originFilter, setOriginFilter] = useState<"all" | "agente" | "manual">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Receipt view mode: Formatted receipt vs Raw JSON
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
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) || orders[0],
    [orders, selectedOrderId]
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch =
        o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.lineItems.some((item) =>
          item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.sku.toLowerCase().includes(searchQuery.toLowerCase())
        );

      const matchesOrigin =
        originFilter === "all" || o.origin === originFilter;

      const matchesStatus =
        statusFilter === "all" || o.status === statusFilter;

      return matchesSearch && matchesOrigin && matchesStatus;
    });
  }, [orders, searchQuery, originFilter, statusFilter]);

  // KPIs de Flujo de Caja
  const totalOpenOrders = orders.filter((o) => o.status !== "recibida_bodega").length;
  const committedCapitalCop = orders
    .filter((o) => o.status !== "borrador_ia")
    .reduce((sum, o) => sum + o.totalCop, 0);
  const totalAiSavingsCop = orders.reduce((sum, o) => sum + o.aiDiscountCop, 0);
  const pendingApprovalCount = orders.filter((o) => o.status === "pendiente_gobernanza").length;

  const handleCreateOrder = () => {
    const subtotal = newOrderQuantity * newOrderUnitPrice;
    const iva = subtotal * 0.19;
    const total = subtotal + iva;
    const isOverThreshold = total > 5000000;

    const newPO: PurchaseOrder = {
      id: `po_${Date.now()}`,
      orderNumber: `PO-2026-${Math.floor(100 + Math.random() * 900)}`,
      receiptFile: `receipts/po_2026_${Date.now()}.json`,
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

  return (
    <div className="flex-1 h-full overflow-hidden flex flex-col bg-[#050806] text-[#F9FAFB] font-sans select-none relative">
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
            <span className="text-xs font-mono font-medium tracking-tight">
              {toastMessage}
            </span>
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
      {/* 1. HEADER CON KPIS DE FLUJO DE CAJA (financial_maestro)   */}
      {/* ========================================================= */}
      <header className="px-6 py-3 border-b border-white/[0.06] bg-[#070B08]/90 backdrop-blur-md shrink-0 space-y-3 z-20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#8E9893]">
                OPERACIONES
              </span>
              <span className="text-white/20">/</span>
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded-full border border-[#10B981]/25">
                ABASTECIMIENTO & GOBERNANZA HITL
              </span>
            </div>
            <h1 className="text-base font-bold tracking-tight text-[#F9FAFB] flex items-center gap-2 mt-0.5">
              Compras y Órdenes
              <span className="text-xs font-normal font-mono text-[#8E9893]">
                (verOrdenesAbiertas • Conciliación Criptográfica)
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsNewOrderModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-[#050806] bg-[#10B981] hover:bg-[#34D399] transition-all shadow-[0_0_20px_rgba(16,185,129,0.28)]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva Orden de Compra</span>
              <span className="font-mono text-[10px] bg-black/20 text-[#050806] px-1.5 py-0.2 rounded">
                crearOrdenCompra
              </span>
            </button>
          </div>
        </div>

        {/* Franja de KPIs de Flujo de Caja (4 métricas separadas por 1px hairlines) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.06] pt-2 border-t border-white/[0.05]">
          {/* KPI 1 */}
          <div className="pr-4 py-1 flex flex-col">
            <span className="text-[10px] font-mono uppercase text-[#8E9893] flex items-center gap-1.5">
              <ShoppingCart className="w-3 h-3 text-[#10B981]" />
              POs Abiertas (verOrdenesAbiertas)
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-mono text-xl sm:text-2xl font-bold text-[#F9FAFB]">
                {totalOpenOrders}
              </span>
              <span className="text-[11px] font-mono text-[#8E9893]">
                órdenes activas
              </span>
            </div>
          </div>

          {/* KPI 2 */}
          <div className="px-0 lg:px-4 py-1 flex flex-col">
            <span className="text-[10px] font-mono uppercase text-[#8E9893] flex items-center gap-1.5">
              <DollarSign className="w-3 h-3 text-[#10B981]" />
              Capital Comprometido Mes
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-mono text-xl sm:text-2xl font-bold text-[#F9FAFB]">
                ${(committedCapitalCop / 1000000).toFixed(1)}M
              </span>
              <span className="text-[11px] font-mono text-[#8E9893]">
                COP en Octubre
              </span>
            </div>
          </div>

          {/* KPI 3 */}
          <div className="px-0 lg:px-4 py-1 flex flex-col">
            <span className="text-[10px] font-mono uppercase text-[#8E9893] flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#34D399]" />
              Ahorro por Negociación IA
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-mono text-xl sm:text-2xl font-bold text-[#34D399]">
                ${(totalAiSavingsCop / 1000000).toFixed(2)}M
              </span>
              <span className="text-[11px] font-mono text-[#10B981]">
                (11.2% promedio)
              </span>
            </div>
          </div>

          {/* KPI 4 */}
          <div className="pl-0 lg:pl-4 py-1 flex flex-col">
            <span className="text-[10px] font-mono uppercase text-[#8E9893] flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3 text-[#F59E0B]" />
              Esperando Aprobación
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-mono text-xl sm:text-2xl font-bold text-[#F59E0B]">
                {pendingApprovalCount}
              </span>
              <span className="text-[11px] font-mono text-[#8E9893]">
                superan umbral $5M COP
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. ÁREA CENTRAL: PIPELINE 65% + VISOR DE RECIBO 35%       */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative min-h-0">
        {/* ------------------------------------------------------- */}
        {/* COLUMNA IZQUIERDA (65%): TABLA / PIPELINE DE ÓRDENES    */}
        {/* ------------------------------------------------------- */}
        <div className="flex-1 lg:w-[65%] h-full flex flex-col bg-[#050806] border-b lg:border-b-0 lg:border-r border-white/[0.06] overflow-hidden min-h-0">
          {/* Toolbar con Filtro de Origen & Búsqueda */}
          <div className="p-3.5 border-b border-white/[0.06] bg-[#070B08]/60 space-y-2.5 shrink-0">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Buscador Rápido */}
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-[#8E9893] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filtrar por PO, SKU o proveedor..."
                  className="w-full bg-[#0A0F0C] border border-white/[0.08] hover:border-white/20 focus:border-[#10B981]/50 rounded-full pl-9 pr-4 py-1.5 text-xs text-[#F9FAFB] placeholder:text-[#8E9893]/70 focus:outline-none transition-all font-mono"
                />
              </div>

              {/* Selector de Origen: Autónomas vs Manuales */}
              <div className="flex items-center gap-1.5 p-1 rounded-full bg-[#0A0F0C] border border-white/[0.06]">
                <button
                  onClick={() => setOriginFilter("all")}
                  className={`px-3 py-1 rounded-full text-xs font-mono transition-all ${
                    originFilter === "all"
                      ? "bg-white/10 text-[#F9FAFB] font-semibold"
                      : "text-[#8E9893] hover:text-white"
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setOriginFilter("agente")}
                  className={`px-3 py-1 rounded-full text-xs font-mono flex items-center gap-1.5 transition-all ${
                    originFilter === "agente"
                      ? "bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/40 font-semibold"
                      : "text-[#8E9893] hover:text-white"
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-[#34D399]" />
                  <span>Autónomas IA</span>
                </button>
                <button
                  onClick={() => setOriginFilter("manual")}
                  className={`px-3 py-1 rounded-full text-xs font-mono transition-all ${
                    originFilter === "manual"
                      ? "bg-white/10 text-[#F9FAFB] font-semibold"
                      : "text-[#8E9893] hover:text-white"
                  }`}
                >
                  Manuales
                </button>
              </div>
            </div>

            {/* Selector de Estado */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[10px] font-mono text-[#8E9893] uppercase mr-1">
                Estado:
              </span>
              {[
                { id: "all", label: "Todos" },
                { id: "pendiente_gobernanza", label: "Pendiente Gobernanza" },
                { id: "emitida", label: "Emitida" },
                { id: "recibida_bodega", label: "Recibida en Bodega" },
                { id: "borrador_ia", label: "Borrador IA" },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono transition-all whitespace-nowrap ${
                    statusFilter === st.id
                      ? "bg-white/10 text-[#F9FAFB] border border-white/25"
                      : "text-[#8E9893] hover:text-[#EDF3EE]"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tabla de Órdenes */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] bg-[#070B08]/80 text-[#8E9893] text-[10px] font-mono uppercase tracking-wider sticky top-0 z-10 backdrop-blur-md">
                  <th className="py-2.5 px-4">ID de Orden</th>
                  <th className="py-2.5 px-3">Especialista</th>
                  <th className="py-2.5 px-3">Proveedor</th>
                  <th className="py-2.5 px-3">Items / SKUs</th>
                  <th className="py-2.5 px-3 text-right">Total ($)</th>
                  <th className="py-2.5 px-3">Política Aplicada</th>
                  <th className="py-2.5 px-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredOrders.map((o) => {
                  const isSelected = selectedOrderId === o.id;
                  const isPendiente = o.status === "pendiente_gobernanza";
                  const isEmitida = o.status === "emitida";
                  const isRecibida = o.status === "recibida_bodega";
                  const isBorrador = o.status === "borrador_ia";

                  return (
                    <tr
                      key={o.id}
                      onClick={() => setSelectedOrderId(o.id)}
                      className={`hover:bg-[#10B981]/[0.04] transition-all cursor-pointer group ${
                        isSelected
                          ? "bg-[#10B981]/[0.08] border-l-2 border-l-[#10B981]"
                          : "border-l-2 border-l-transparent"
                      }`}
                    >
                      {/* ID de Orden */}
                      <td className="py-3 px-4 font-mono font-bold">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#10B981] group-hover:text-[#34D399]">
                            {o.orderNumber}
                          </span>
                          {o.origin === "agente" && (
                            <span title="Generada de forma autónoma por agente IA">
                              <Sparkles className="w-2.5 h-2.5 text-[#34D399]" />
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-normal text-[#586B5F] block">
                          {o.date}
                        </span>
                      </td>

                      {/* Especialista */}
                      <td className="py-3 px-3 font-mono">
                        <span className="text-[11px] text-[#EDF3EE] bg-white/[0.03] px-2 py-0.5 rounded border border-white/[0.06]">
                          {o.specialist}
                        </span>
                      </td>

                      {/* Proveedor */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-[#F9FAFB] truncate max-w-[170px]">
                            {o.supplier}
                          </span>
                          <span className="text-[10px] font-mono text-[#8E9893]">
                            {o.destination.replace("Bodega Matriz ", "").replace("CD ", "")}
                          </span>
                        </div>
                      </td>

                      {/* Items / SKUs */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col">
                          <span className="text-xs text-[#EDF3EE] truncate max-w-[160px]">
                            {o.lineItems[0]?.description}
                          </span>
                          <span className="text-[10px] font-mono text-[#586B5F]">
                            {o.lineItems[0]?.quantity} un. · {o.lineItems[0]?.sku}
                          </span>
                        </div>
                      </td>

                      {/* Total ($ COP) */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-[#F9FAFB] tabular-nums">
                        ${o.totalCop.toLocaleString("es-CO")}
                      </td>

                      {/* Política Aplicada */}
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                            o.isHitlEscalated
                              ? "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30"
                              : "bg-[#10B981]/10 text-[#34D399] border-[#10B981]/30"
                          }`}
                        >
                          {o.policyApplied.split("(")[0]}
                        </span>
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-4 text-center">
                        {isPendiente && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B] text-[10px] font-mono font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] shadow-[0_0_6px_#F59E0B] animate-pulse" />
                            Pendiente HITL
                          </span>
                        )}
                        {isEmitida && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#10B981]/10 border border-[#10B981]/30 text-[#34D399] text-[10px] font-mono font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] shadow-[0_0_6px_#10B981]" />
                            Emitida
                          </span>
                        )}
                        {isRecibida && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#10B981]/15 border border-[#10B981]/40 text-[#34D399] text-[10px] font-mono font-medium">
                            <CheckCircle2 className="w-2.5 h-2.5 text-[#10B981]" />
                            Recibida
                          </span>
                        )}
                        {isBorrador && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#3B82F6]/10 border border-[#3B82F6]/30 text-[#60A5FA] text-[10px] font-mono font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
                            Borrador IA
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredOrders.length === 0 && (
              <div className="p-12 text-center text-xs font-mono text-[#8E9893]">
                No se encontraron órdenes de compra que coincidan con los filtros.
              </div>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------- */}
        {/* COLUMNA DERECHA (35%): VISOR DE RECIBO DIGITAL (JSON)   */}
        {/* ------------------------------------------------------- */}
        <div className="w-full lg:w-[35%] xl:w-[460px] h-full bg-[#0A0F0C] flex flex-col justify-between overflow-y-auto custom-scrollbar relative z-10 shadow-2xl min-h-0 border-l border-white/[0.06]">
          {/* Subtle Top-Edge Radial Highlight */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-36 opacity-35"
            style={{
              background:
                "radial-gradient(60% 50% at 50% 0%, rgba(16, 185, 129, 0.18) 0%, transparent 100%)",
            }}
          />

          <div className="p-4 space-y-4">
            {/* Header del Visor: File Path & Mode Switcher */}
            <div className="p-3 rounded-2xl bg-[#070B08] border border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#10B981]" />
                <span className="font-mono text-xs font-bold text-[#F9FAFB]">
                  {selectedOrder.receiptFile}
                </span>
              </div>

              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                <button
                  onClick={() => setReceiptMode("formatted")}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    receiptMode === "formatted"
                      ? "bg-[#10B981]/20 text-[#34D399]"
                      : "text-[#8E9893] hover:text-white"
                  }`}
                >
                  Recibo
                </button>
                <button
                  onClick={() => setReceiptMode("json")}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    receiptMode === "json"
                      ? "bg-[#10B981]/20 text-[#34D399]"
                      : "text-[#8E9893] hover:text-white"
                  }`}
                >
                  JSON
                </button>
              </div>
            </div>

            {receiptMode === "formatted" ? (
              /* MODO: RECIBO TÉCNICO FORMATEADO */
              <div
                className="p-5 rounded-2xl bg-[#070B08] border border-white/[0.08] relative overflow-hidden space-y-4 shadow-xl"
                style={{
                  backgroundImage:
                    "radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px)",
                  backgroundSize: "16px 16px",
                }}
              >
                {/* Encabezado del Recibo */}
                <div className="flex items-start justify-between pb-3 border-b border-white/[0.06]">
                  <div>
                    <span className="font-mono text-xs font-bold text-[#10B981]">
                      {selectedOrder.orderNumber}
                    </span>
                    <h3 className="text-sm font-bold text-[#F9FAFB] mt-0.5">
                      {selectedOrder.supplier}
                    </h3>
                    <span className="text-[10px] font-mono text-[#8E9893]">
                      Destino: {selectedOrder.destination}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[9px] uppercase font-mono text-[#8E9893] block">
                      Emisión
                    </span>
                    <span className="text-[11px] font-mono text-[#EDF3EE]">
                      {selectedOrder.date}
                    </span>
                  </div>
                </div>

                {/* Justificación Matemática del Agente */}
                <div className="p-3 rounded-xl bg-[#10B981]/[0.06] border border-[#10B981]/25 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#34D399]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Justificación de Algoritmo ROP</span>
                  </div>
                  <p className="text-[11px] text-[#EDF3EE] leading-relaxed">
                    {selectedOrder.mathJustification.recommendationText}
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#10B981]/20 text-[10px] font-mono text-[#8E9893]">
                    <span>Burn Rate: {selectedOrder.mathJustification.dailyBurnRate} un/día</span>
                    <span>Cobertura: {selectedOrder.mathJustification.coverageDays} días</span>
                  </div>
                </div>

                {/* Desglose de Líneas de Productos */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono uppercase text-[#8E9893] block">
                    Líneas de la Orden
                  </span>
                  <div className="space-y-1.5">
                    {selectedOrder.lineItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between text-xs font-mono"
                      >
                        <div className="space-y-0.5">
                          <span className="font-semibold text-[#F9FAFB] block">
                            {item.description}
                          </span>
                          <span className="text-[10px] text-[#8E9893]">
                            {item.sku} · {item.quantity} un. × ${item.unitPriceCop.toLocaleString("es-CO")}
                          </span>
                        </div>
                        <span className="font-bold text-[#EDF3EE]">
                          ${item.subtotalCop.toLocaleString("es-CO")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totales y Liquidación */}
                <div className="space-y-1 pt-2 border-t border-white/[0.06] text-xs font-mono">
                  <div className="flex justify-between text-[#8E9893]">
                    <span>Subtotal Neto:</span>
                    <span>${selectedOrder.subtotalCop.toLocaleString("es-CO")} COP</span>
                  </div>
                  <div className="flex justify-between text-[#8E9893]">
                    <span>IVA (19%):</span>
                    <span>+${selectedOrder.ivaCop.toLocaleString("es-CO")} COP</span>
                  </div>
                  {selectedOrder.aiDiscountCop > 0 && (
                    <div className="flex justify-between text-[#34D399]">
                      <span>Descuento Negociado IA:</span>
                      <span>-${selectedOrder.aiDiscountCop.toLocaleString("es-CO")} COP</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-[#F9FAFB] pt-2 border-t border-white/[0.06]">
                    <span>Total Liquidado:</span>
                    <span className="text-[#10B981]">
                      ${selectedOrder.totalCop.toLocaleString("es-CO")} COP
                    </span>
                  </div>
                </div>

                {/* Firma Criptográfica de Gobernanza */}
                <div className="p-3 rounded-xl bg-[#050806] border border-white/[0.06] space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-mono text-[#10B981]">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Firma Criptográfica HMAC-SHA256 Verificada</span>
                  </div>
                  <p className="font-mono text-[10px] text-[#8E9893] break-all">
                    {selectedOrder.hmacSignature}
                  </p>
                  <span className="text-[10px] text-[#586B5F] block">
                    Gobernanza: {selectedOrder.policyApplied}
                  </span>
                </div>
              </div>
            ) : (
              /* MODO: RAW JSON INSPECTOR */
              <div className="p-4 rounded-2xl bg-[#050806] border border-white/[0.08] font-mono text-[11px] text-[#34D399] overflow-x-auto space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                  <span className="text-[#8E9893] text-[10px]">
                    application/json
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(selectedOrder, null, 2));
                      setCopiedReceipt(true);
                      setTimeout(() => setCopiedReceipt(false), 2000);
                      showToast("JSON de orden copiado al portapapeles.");
                    }}
                    className="text-[#8E9893] hover:text-white flex items-center gap-1 text-[10px]"
                  >
                    {copiedReceipt ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedReceipt ? "¡Copiado!" : "Copiar"}</span>
                  </button>
                </div>
                <pre className="text-[#EDF3EE] whitespace-pre-wrap leading-relaxed">
                  {JSON.stringify(selectedOrder, null, 2)}
                </pre>
              </div>
            )}

            {/* Acciones del Recibo: Descargar y Reconciliar */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(selectedOrder, null, 2));
                  showToast(`Recibo ${selectedOrder.orderNumber} copiado para exportación JSON.`);
                }}
                className="w-full sm:flex-1 py-2 px-3 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono font-medium text-[#F9FAFB] transition-all flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-[#10B981]" />
                <span>Descargar Recibo JSON</span>
              </button>

              <button
                onClick={() => handleReconcileOrder(selectedOrder.id)}
                disabled={isReconciling || selectedOrder.status === "recibida_bodega"}
                className={`w-full sm:flex-1 py-2 px-3 rounded-full text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 ${
                  selectedOrder.status === "recibida_bodega"
                    ? "bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30 cursor-default"
                    : "bg-[#10B981] hover:bg-[#34D399] text-[#050806] shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                }`}
              >
                {isReconciling ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Reconciliando...</span>
                  </>
                ) : selectedOrder.status === "recibida_bodega" ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Reconciliada OK</span>
                  </>
                ) : (
                  <>
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>Ejecutar Reconciliación</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL: NUEVA ORDEN DE COMPRA (crearOrdenCompra)           */}
      {/* ========================================================= */}
      <AnimatePresence>
        {isNewOrderModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg rounded-2xl bg-[#0A0F0C] border border-[#10B981]/40 p-6 shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30">
                    <ShoppingCart className="w-5 h-5 text-[#34D399]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#F9FAFB] tracking-tight">
                      Nueva Orden de Compra
                    </h3>
                    <span className="font-mono text-xs text-[#10B981]">
                      crearOrdenCompra · Gobernanza Verificada
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setIsNewOrderModalOpen(false)}
                  className="p-1 rounded-lg text-[#8E9893] hover:text-[#F9FAFB]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                {/* Selector de Proveedor */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-[#8E9893]">
                    Proveedor Homologado
                  </label>
                  <select
                    value={newOrderSupplier}
                    onChange={(e) => setNewOrderSupplier(e.target.value)}
                    className="w-full bg-[#050806] border border-white/[0.1] focus:border-[#10B981]/60 rounded-xl py-2 px-3 text-xs text-[#F9FAFB] font-sans focus:outline-none"
                  >
                    <option value="Ferreterías Unidas Bogotá S.A.S.">
                      Ferreterías Unidas Bogotá S.A.S. (Consumibles de Corte)
                    </option>
                    <option value="Bosch Sistemas Industriales Colombia">
                      Bosch Sistemas Industriales Colombia (Rotomartillos)
                    </option>
                    <option value="Mundial de Tornillos S.A.S.">
                      Mundial de Tornillos S.A.S. (Tornillería Grado 8)
                    </option>
                    <option value="Siderúrgica de Santander S.A.S.">
                      Siderúrgica de Santander S.A.S. (Perfiles & Acero)
                    </option>
                  </select>
                </div>

                {/* Producto & SKU */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-[#8E9893]">
                    Producto / Descripción
                  </label>
                  <input
                    type="text"
                    value={newOrderProduct}
                    onChange={(e) => setNewOrderProduct(e.target.value)}
                    className="w-full bg-[#050806] border border-white/[0.1] focus:border-[#10B981]/60 rounded-xl py-2 px-3 text-xs text-[#F9FAFB] font-sans focus:outline-none"
                  />
                </div>

                {/* Cantidad y Precio Unitario */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-[#8E9893]">
                      Cantidad (unidades)
                    </label>
                    <input
                      type="number"
                      value={newOrderQuantity}
                      onChange={(e) => setNewOrderQuantity(Number(e.target.value))}
                      className="w-full bg-[#050806] border border-white/[0.1] focus:border-[#10B981]/60 rounded-xl py-2 px-3 text-xs font-mono text-[#F9FAFB] focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-[#8E9893]">
                      Precio Unitario ($ COP)
                    </label>
                    <input
                      type="number"
                      value={newOrderUnitPrice}
                      onChange={(e) => setNewOrderUnitPrice(Number(e.target.value))}
                      className="w-full bg-[#050806] border border-white/[0.1] focus:border-[#10B981]/60 rounded-xl py-2 px-3 text-xs font-mono text-[#F9FAFB] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Total Liquidado y Verificación de Guardrail */}
                <div className="p-3.5 rounded-xl bg-[#050806] border border-white/[0.06] space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between text-[#8E9893]">
                    <span>Total Estimado (con IVA 19%):</span>
                    <span className="font-bold text-sm text-[#34D399]">
                      ${(newOrderQuantity * newOrderUnitPrice * 1.19).toLocaleString("es-CO")} COP
                    </span>
                  </div>

                  {newOrderQuantity * newOrderUnitPrice * 1.19 > 5000000 ? (
                    <div className="pt-2 border-t border-white/[0.06] flex items-start gap-1.5 text-[#F59E0B]">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span className="text-[11px] leading-tight">
                        Excede el umbral autónomo de $5.000.000 COP. La orden se generará en estado <strong>Pendiente Gobernanza HITL</strong>.
                      </span>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-white/[0.06] flex items-center gap-1.5 text-[#10B981]">
                      <Check className="w-3.5 h-3.5" />
                      <span className="text-[11px]">
                        Dentro del umbral de autonomía. Se emitirá con firma criptográfica inmediata.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-white/[0.06]">
                <button
                  onClick={() => setIsNewOrderModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-medium text-[#8E9893] hover:text-[#F9FAFB]"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateOrder}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#10B981] hover:bg-[#34D399] text-[#050806] font-semibold text-xs transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Firmar y Emitir Orden</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
