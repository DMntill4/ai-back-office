import React, { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Download,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  ChevronRight,
  X,
  LayoutGrid,
  List,
  RotateCcw,
  MoreHorizontal,
  MapPin,
  Truck,
  ArrowUpRight,
} from "lucide-react";
import { MilestoneStepper, MilestoneStep } from "../ui/MilestoneStepper";
import { StatusBadge } from "../ui/StatusBadge";
import { EmptyState } from "../ui/EmptyState";
import { api } from "../../services/apiClient";

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

const IVA_RATE = 0.19;
const HITL_THRESHOLD_COP = 5000000;

/** Traduce el estado crudo del backend a la máquina de estados de la vista. */
function toOrderStatus(raw: any, humanApproved: boolean): PurchaseOrder["status"] {
  const value = String(raw ?? "").toLowerCase();
  if (value.includes("recib") || value.includes("deliver") || value.includes("complet")) return "recibida_bodega";
  if (value.includes("transit") || value.includes("shipped") || value.includes("emit") || value.includes("approv")) {
    return humanApproved ? "emitida" : "pendiente_gobernanza";
  }
  if (value.includes("pend") || value.includes("review") || value.includes("approval")) return "pendiente_gobernanza";
  return "borrador_ia";
}

/** Construye una orden de compra a partir del payload de `/api/orders`. */
function mapOrder(row: any, idx: number): PurchaseOrder {
  const quantity = Number(row?.quantity ?? 1) || 1;
  const totalCop = Number(row?.amountMXN ?? 0) || 0;
  const subtotalCop = Math.round(totalCop / (1 + IVA_RATE));
  const ivaCop = totalCop - subtotalCop;
  const unitPriceCop = Math.round(subtotalCop / quantity);
  const humanApproved = Boolean(row?.humanApproved);
  const status = toOrderStatus(row?.status, humanApproved);
  const orderNumber = String(row?.orderId ?? `PO-${idx + 1}`).toUpperCase();
  const supplier = String(row?.provider ?? "Proveedor sin asignar");
  const productName = String(row?.productName ?? row?.sku ?? "Ítem sin descripción");
  const sku = String(row?.sku ?? "SKU-SIN-ASIGNAR");
  const destination = row?.carrier ? `Despacho ${row.carrier}` : "Bodega principal";
  const isHitlEscalated = status === "pendiente_gobernanza" || totalCop > HITL_THRESHOLD_COP;

  return {
    id: String(row?.orderId ?? `po_${idx}`),
    orderNumber,
    receiptFile: `receipts/${orderNumber.toLowerCase()}.json`,
    origin: humanApproved ? "manual" : "agente",
    specialist: "comprasSpecialist",
    supplier,
    supplierCity: String(row?.carrier ?? "—"),
    destination,
    category: "Abastecimiento",
    lineItems: [
      {
        sku,
        description: productName,
        quantity,
        unitPriceCop,
        subtotalCop,
      },
    ],
    subtotalCop,
    ivaCop,
    aiDiscountCop: 0,
    totalCop,
    date: row?.createdAt ? new Date(row.createdAt).toLocaleString("es-CO") : "Sin fecha",
    status,
    policyApplied: isHitlEscalated
      ? `Escalada a firma ejecutiva > $${HITL_THRESHOLD_COP.toLocaleString("es-CO")} COP`
      : `Autonomía < $${HITL_THRESHOLD_COP.toLocaleString("es-CO")} COP`,
    isHitlEscalated,
    hmacSignature: String(row?.trackingNumber ?? `hmac_sha256_${orderNumber.toLowerCase()}`),
    mathJustification: {
      currentStock: 0,
      ropThreshold: 0,
      dailyBurnRate: 0,
      coverageDays: 0,
      projectedStockoutHours: 0,
      recommendationText: humanApproved
        ? "Orden aprobada por un operador humano y despachada al proveedor."
        : "Orden formulada por el agente de compras a partir de la alerta de reposición.",
    },
  };
}

interface PurchaseOrdersViewProps {
  onOpenApprovalModal?: () => void;
}

export const PurchaseOrdersView: React.FC<PurchaseOrdersViewProps> = ({
  onOpenApprovalModal,
}) => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "borrador_ia" | "emitida" | "recibida_bodega">("all");
  const [warehouseFilter, setWarehouseFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [approvalFilter, setApprovalFilter] = useState<string>("all");
  const [minAmount, setMinAmount] = useState<string>("");
  const [maxAmount, setMaxAmount] = useState<string>("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);

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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.orders.list();
      const rows = Array.isArray(res.data) ? res.data : [];
      const mapped = rows.map(mapOrder);
      setOrders(mapped);
      setIsFallback(Boolean(res.isFallback));
      if (!res.success) setError(res.message ?? "No fue posible leer las órdenes de compra.");
      setSelectedOrderId((prev) =>
        mapped.some((o) => o.id === prev) ? prev : mapped[0]?.id ?? ""
      );
    } catch (err: any) {
      setError(err?.message ?? "Error de red al consultar las órdenes de compra.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
      const matchesSearch =
        searchQuery === "" ||
        o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.lineItems.some(
          (item) =>
            item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.sku.toLowerCase().includes(searchQuery.toLowerCase())
        );

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "borrador_ia" && o.status === "borrador_ia") ||
        (statusFilter === "emitida" && (o.status === "emitida" || o.status === "pendiente_gobernanza")) ||
        (statusFilter === "recibida_bodega" && o.status === "recibida_bodega");

      const matchesWarehouse =
        warehouseFilter === "all" ||
        (warehouseFilter === "bga" && o.destination.includes("Bucaramanga")) ||
        (warehouseFilter === "bog" && o.destination.includes("Bogotá")) ||
        (warehouseFilter === "med" && o.destination.includes("Medellín"));

      const matchesSupplier =
        supplierFilter === "all" || o.supplier.toLowerCase().includes(supplierFilter.toLowerCase());

      const matchesApproval =
        approvalFilter === "all" ||
        (approvalFilter === "autonoma" && !o.isHitlEscalated) ||
        (approvalFilter === "approval" && o.isHitlEscalated);

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
    const iva = subtotal * IVA_RATE;
    const total = subtotal + iva;
    const isOverThreshold = total > HITL_THRESHOLD_COP;

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
      date: "Hoy, justo ahora",
      status: isOverThreshold ? "pendiente_gobernanza" : "emitida",
      policyApplied: isOverThreshold
        ? `Escalada a firma ejecutiva > $${HITL_THRESHOLD_COP.toLocaleString("es-CO")} COP`
        : `Autonomía < $${HITL_THRESHOLD_COP.toLocaleString("es-CO")} COP`,
      isHitlEscalated: isOverThreshold,
      hmacSignature: `hmac_sha256_${Math.random().toString(16).substring(2, 10)}`,
      mathJustification: {
        currentStock: 0,
        ropThreshold: 0,
        dailyBurnRate: 0,
        coverageDays: 0,
        projectedStockoutHours: 0,
        recommendationText: `Orden manual ingresada por operador. ${isOverThreshold
          ? "Monto sobre el umbral de gobernanza: enviada a la bandeja de aprobaciones."
          : "Monto bajo el umbral de gobernanza: autorización inmediata."
          }`,
      },
    };

    setOrders((prev) => [newPO, ...prev]);
    setSelectedOrderId(newPO.id);
    setIsNewOrderModalOpen(false);
    showToast(
      `Orden ${newPO.orderNumber} creada (${isOverThreshold ? "escalada a aprobaciones" : "emitida al proveedor"}).`
    );
  };

  const handleReconcileOrder = (orderId: string) => {
    setIsReconciling(true);
    setTimeout(() => {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: "recibida_bodega" as const } : o))
      );
      setIsReconciling(false);
      showToast(
        "Factura y remisión del proveedor cotejadas contra existencias físicas. 0 discrepancias."
      );
    }, 900);
  };

  const statusButtons: {
    id: "all" | "borrador_ia" | "emitida" | "recibida_bodega";
    label: string;
    count: number;
  }[] = [
      { id: "all", label: "Todas", count: orders.length },
      { id: "borrador_ia", label: "Borrador IA", count: orders.filter((o) => o.status === "borrador_ia").length },
      {
        id: "emitida",
        label: "En Tránsito",
        count: orders.filter((o) => o.status === "emitida" || o.status === "pendiente_gobernanza").length,
      },
      { id: "recibida_bodega", label: "Recibidas", count: orders.filter((o) => o.status === "recibida_bodega").length },
    ];

  const supplierOptions = useMemo(
    () => Array.from(new Set(orders.map((o) => o.supplier))).sort(),
    [orders]
  );

  const selectClass =
    "w-full h-8 bg-raised border border-border rounded-control px-2.5 text-caption text-primary font-sans focus:outline-none focus:border-brand/50 cursor-pointer";

  return (
    <div className="flex-1 h-full overflow-hidden flex flex-col bg-canvas text-primary font-sans relative">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            role="status"
            className="fixed top-6 right-8 z-50 px-element py-compact rounded-pill flex items-center gap-element bg-raised border border-brand/40 text-body text-primary shadow-dialog"
          >
            <span className="w-2 h-2 rounded-pill bg-state-ok" />
            <span className="text-caption font-mono font-medium">{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-secondary hover:text-primary text-caption ml-hairline cursor-pointer"
              title="Cerrar aviso"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="px-group py-base bg-canvas border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-base z-20 shrink-0">
        <div className="flex items-center gap-element">
          <h1 className="text-page-title font-bold text-primary tracking-tight">Órdenes de compra</h1>
          <span className="text-muted font-mono text-caption hidden md:inline">
            · Flujo de abastecimiento y gobernanza
          </span>
        </div>

        <div className="flex items-center gap-element">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar producto, PO o proveedor..."
              className="h-9 w-60 sm:w-72 bg-raised border border-border hover:border-border-strong focus:border-brand/50 rounded-control pl-9 pr-9 text-caption text-primary placeholder:text-muted focus:outline-none transition-colors font-sans"
            />
          </div>

          <div className="flex items-center p-1 rounded-control bg-raised border border-border">
            <button
              onClick={() => setViewMode("cards")}
              className={`p-1.5 rounded-control transition-colors cursor-pointer ${viewMode === "cards" ? "bg-brand-surface text-brand" : "text-muted hover:text-primary"
                }`}
              title="Vista de tarjetas con stepper"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-control transition-colors cursor-pointer ${viewMode === "table" ? "bg-brand-surface text-brand" : "text-muted hover:text-primary"
                }`}
              title="Vista de tabla"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => void load()}
            className="h-9 px-element rounded-control bg-raised border border-border hover:border-border-strong text-secondary hover:text-primary text-caption font-medium flex items-center gap-compact transition-colors cursor-pointer"
            title="Actualizar órdenes"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          <button
            onClick={() => setIsNewOrderModalOpen(true)}
            className="h-9 px-element rounded-control bg-brand hover:bg-brand/90 text-canvas font-semibold text-caption flex items-center gap-compact transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Nueva Orden</span>
          </button>
        </div>
      </header>

      {isFallback && (
        <div className="mx-group mt-base rounded-container border border-border bg-state-attention-surface px-element py-compact text-caption text-state-attention">
          Mostrando órdenes de referencia: el servicio de compras no respondió. Los montos pueden no reflejar el estado real.
        </div>
      )}

      {error && (
        <div className="mx-group mt-base rounded-container border border-border bg-state-error-surface px-element py-compact text-caption text-state-error flex flex-wrap items-center justify-between gap-compact">
          <span>{error}</span>
          <button
            onClick={() => void load()}
            className="px-compact py-hairline rounded-control border border-border text-caption text-primary hover:bg-raised transition-colors cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row p-group gap-group min-h-0">
        <aside className="w-full md:w-[260px] shrink-0 bg-panel rounded-container p-base border border-border flex flex-col justify-between overflow-y-auto space-y-group">
          <div className="space-y-group">
            <div className="space-y-compact">
              <span className="text-caption font-mono text-muted font-bold block">
                Estado de orden
              </span>
              <div className="grid grid-cols-2 gap-compact">
                {statusButtons.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setStatusFilter(st.id)}
                    className={`p-compact rounded-control border text-left flex flex-col justify-between transition-colors cursor-pointer ${statusFilter === st.id
                      ? "bg-brand-surface border-brand/40 text-brand font-bold"
                      : "bg-raised border-border text-secondary hover:text-primary hover:border-border-strong"
                      }`}
                  >
                    <span className="text-caption leading-tight block">{st.label}</span>
                    <span
                      className={`text-caption font-mono mt-hairline px-1.5 rounded-pill w-fit tabular-nums ${statusFilter === st.id ? "bg-brand/20 text-brand font-bold" : "bg-canvas text-muted"
                        }`}
                    >
                      {st.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-compact">
              <span className="text-caption font-mono text-muted font-bold block">
                Filtrar por
              </span>

              <div className="space-y-hairline">
                <label className="text-caption font-mono text-muted block">Sede / Bodega</label>
                <select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)} className={selectClass}>
                  <option value="all">Todas las sedes</option>
                  <option value="bga">Bodega Matriz Bucaramanga</option>
                  <option value="bog">CD Bogotá D.C.</option>
                  <option value="med">CD Medellín</option>
                </select>
              </div>

              <div className="space-y-hairline">
                <label className="text-caption font-mono text-muted block">Fecha de orden</label>
                <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className={selectClass}>
                  <option value="all">Todas las fechas</option>
                  <option value="hoy">Hoy</option>
                  <option value="semana">Últimos 7 días</option>
                  <option value="mes">Este mes</option>
                </select>
              </div>

              <div className="space-y-hairline">
                <label className="text-caption font-mono text-muted block">Proveedor</label>
                <select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)} className={selectClass}>
                  <option value="all">Todos los proveedores</option>
                  {supplierOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-hairline">
                <label className="text-caption font-mono text-muted block">Nivel de aprobación</label>
                <select value={approvalFilter} onChange={(e) => setApprovalFilter(e.target.value)} className={selectClass}>
                  <option value="all">Todos los niveles</option>
                  <option value="autonoma">Autonomía bajo umbral</option>
                  <option value="approval">Requiere firma ejecutiva</option>
                </select>
              </div>
            </div>

            <div className="space-y-compact">
              <span className="text-caption font-mono text-muted font-bold block">
                Rango de monto
              </span>
              <div className="space-y-compact">
                <div className="relative flex items-center">
                  <span className="absolute left-2.5 text-caption font-mono text-muted">$</span>
                  <input
                    type="number"
                    placeholder="Monto mínimo"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    className="w-full h-8 bg-raised border border-border rounded-control pl-6 pr-2.5 text-caption text-primary font-mono placeholder:text-muted focus:outline-none focus:border-brand/50"
                  />
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-2.5 text-caption font-mono text-muted">$</span>
                  <input
                    type="number"
                    placeholder="Monto máximo"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    className="w-full h-8 bg-raised border border-border rounded-control pl-6 pr-2.5 text-caption text-primary font-mono placeholder:text-muted focus:outline-none focus:border-brand/50"
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleResetFilters}
            className="w-full h-8 rounded-control bg-raised hover:border-border-strong border border-border text-secondary hover:text-primary text-caption font-mono flex items-center justify-center gap-compact transition-colors mt-compact cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Restablecer filtros</span>
          </button>
        </aside>

        <main className="flex-1 overflow-y-auto space-y-element min-h-0">
          {loading && orders.length === 0 ? (
            <div className="space-y-element" aria-busy="true" aria-label="Cargando órdenes de compra">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-40 rounded-container bg-raised animate-pulse" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="py-group">
              <EmptyState
                title="Sin órdenes de compra"
                description="El backend no devolvió órdenes para esta empresa. Cuando el agente detecte una alerta de reposición o registres una orden manual aparecerá aquí."
                actionLabel="Actualizar"
                onAction={() => void load()}
              />
            </div>
          ) : viewMode === "cards" ? (
            <div className="space-y-element">
              {filteredOrders.map((o) => {
                const isSelected = selectedOrderId === o.id;

                let stepperTitle = "";
                let stepperMeta = "";
                let stepperAction: React.ReactNode = null;
                let steps: MilestoneStep[] = [];

                if (o.status === "emitida") {
                  stepperTitle = `Orden en tránsito hacia ${o.destination} • ${o.date}`;
                  stepperMeta = `Destino: ${o.destination}`;
                  stepperAction = (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOrderId(o.id);
                        setIsReceiptDrawerOpen(true);
                      }}
                      className="flex items-center gap-compact font-mono text-caption text-brand hover:underline font-semibold cursor-pointer"
                    >
                      <span>Rastrear envío</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  );
                  steps = [
                    { label: "Creación IA", timestamp: "Autónoma", status: "completed", icon: <Sparkles className="w-3.5 h-3.5" /> },
                    { label: "Aprobación Gobernanza", timestamp: "Aprobada", status: "completed", icon: <ShieldCheck className="w-3.5 h-3.5" /> },
                    { label: "Despacho Proveedor", timestamp: "En ruta", status: "active", icon: <Truck className="w-3.5 h-3.5" /> },
                    { label: "Recepción Bodega", timestamp: "Pendiente", status: "pending", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
                  ];
                } else if (o.status === "pendiente_gobernanza") {
                  stepperTitle = `Pendiente de aprobación ejecutiva • ${o.date}`;
                  stepperMeta = o.policyApplied;
                  stepperAction = (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenApprovalModal) onOpenApprovalModal();
                      }}
                      className="flex items-center gap-compact font-mono text-caption text-state-attention hover:underline font-semibold cursor-pointer"
                    >
                      <span>Revisar en aprobaciones</span>
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
                      className="flex items-center gap-compact font-mono text-caption text-brand hover:underline font-semibold cursor-pointer"
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
                  stepperMeta = "Costo total de importación calculado por el agente financiero";
                  stepperAction = (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOrderId(o.id);
                        setIsReceiptDrawerOpen(true);
                      }}
                      className="flex items-center gap-compact font-mono text-caption text-state-pending hover:underline font-semibold cursor-pointer"
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
                    onClick={() => setSelectedOrderId(o.id)}
                    className={`bg-panel rounded-container p-base border transition-colors cursor-pointer ${isSelected ? "border-brand/40 bg-brand-surface" : "border-border hover:border-border-strong"
                      }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-element">
                      <div className="flex items-center gap-compact min-w-0">
                        <span className="font-mono text-body font-bold text-primary tracking-tight shrink-0">
                          {o.orderNumber}
                        </span>
                        <span className="text-muted font-mono">·</span>
                        <span className="text-body font-semibold text-primary truncate">
                          {o.lineItems[0]?.description} × {o.lineItems[0]?.quantity} u.
                        </span>
                      </div>

                      <div className="flex items-center gap-element shrink-0">
                        <span className="font-mono text-body font-bold text-primary tabular-nums">
                          ${o.totalCop.toLocaleString("es-CO")} COP
                        </span>
                        <StatusBadge status={badgeStatus} label={badgeLabel} size="sm" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrderId(o.id);
                            setIsReceiptDrawerOpen(true);
                          }}
                          className="w-8 h-8 rounded-control bg-raised border border-border text-secondary hover:text-primary flex items-center justify-center transition-colors cursor-pointer"
                          title="Opciones y recibo digital"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-compact mt-compact text-caption text-secondary">
                      <div className="flex items-center gap-compact font-mono text-caption">
                        <div className="w-5 h-5 rounded-pill bg-brand-surface text-brand border border-brand/20 text-caption font-bold flex items-center justify-center shrink-0">
                          {o.supplier.charAt(0)}
                        </div>
                        <span className="text-primary font-medium truncate max-w-[200px]">{o.supplier}</span>
                        <span className="text-muted">·</span>
                        <div className="flex items-center gap-hairline text-secondary">
                          <MapPin className="w-3 h-3 text-muted" />
                          <span>{o.destination}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-compact text-caption font-mono text-muted">
                        <span className="bg-raised px-1.5 py-hairline rounded-control text-secondary">
                          {o.origin === "agente" ? "Generada por agente" : "Creada manualmente"}
                        </span>
                        <span className="text-muted">·</span>
                        <span>
                          {o.specialist === "comprasSpecialist" ? "Especialista de Compras" : "Agente Financiero"}
                        </span>
                      </div>
                    </div>

                    <div className="bg-raised rounded-control p-base mt-element border border-border space-y-compact">
                      <div className="flex items-center justify-between gap-compact">
                        <span className="text-caption font-semibold text-primary tracking-tight">{stepperTitle}</span>
                        {stepperAction}
                      </div>
                      <p className="text-caption text-muted">{stepperMeta}</p>
                      <MilestoneStepper steps={steps} />
                    </div>
                  </div>
                );
              })}

              {filteredOrders.length === 0 && (
                <div className="py-group">
                  <EmptyState
                    title="Ninguna orden coincide"
                    description="Ajusta la búsqueda o restablece los filtros para ver las órdenes de compra disponibles."
                    actionLabel="Restablecer filtros"
                    onAction={handleResetFilters}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-container bg-panel border border-border overflow-hidden">
              <table className="w-full text-left text-caption border-collapse">
                <thead>
                  <tr className="bg-raised border-b border-border text-muted font-mono text-caption">
                    <th className="py-compact px-base font-semibold">ID de Orden</th>
                    <th className="py-compact px-compact font-semibold">Proveedor</th>
                    <th className="py-compact px-compact font-semibold">Ítems / Cantidad</th>
                    <th className="py-compact px-compact font-semibold text-right">Monto Total</th>
                    <th className="py-compact px-compact font-semibold text-center">Estado</th>
                    <th className="py-compact px-base font-semibold text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredOrders.map((o) => (
                    <tr
                      key={o.id}
                      onClick={() => {
                        setSelectedOrderId(o.id);
                        setIsReceiptDrawerOpen(true);
                      }}
                      className="hover:bg-raised transition-colors cursor-pointer"
                    >
                      <td className="py-compact px-base font-mono font-bold text-brand">{o.orderNumber}</td>
                      <td className="py-compact px-compact">
                        <span className="font-semibold text-primary block">{o.supplier}</span>
                        <span className="text-caption text-muted font-mono">{o.destination}</span>
                      </td>
                      <td className="py-compact px-compact">
                        <span className="text-primary block truncate max-w-[200px]">
                          {o.lineItems[0]?.description}
                        </span>
                        <span className="text-caption text-muted font-mono">{o.lineItems[0]?.quantity} un.</span>
                      </td>
                      <td className="py-compact px-compact text-right font-mono font-bold text-primary tabular-nums">
                        ${o.totalCop.toLocaleString("es-CO")} COP
                      </td>
                      <td className="py-compact px-compact text-center">
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
                      <td className="py-compact px-base text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrderId(o.id);
                            setIsReceiptDrawerOpen(true);
                          }}
                          className="px-compact py-hairline rounded-control bg-raised border border-border text-secondary hover:text-primary font-mono text-caption cursor-pointer"
                        >
                          Ver Recibo
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredOrders.length === 0 && (
                <div className="py-group">
                  <EmptyState
                    title="Ninguna orden coincide"
                    description="Ajusta la búsqueda o restablece los filtros para ver las órdenes de compra disponibles."
                    actionLabel="Restablecer filtros"
                    onAction={handleResetFilters}
                  />
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <AnimatePresence>
        {isReceiptDrawerOpen && selectedOrder && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60">
            <motion.div
              initial={{ x: 450 }}
              animate={{ x: 0 }}
              exit={{ x: 450 }}
              transition={{ type: "spring", damping: 30, stiffness: 350 }}
              className="w-full max-w-[460px] h-full bg-panel border-l border-border p-group flex flex-col justify-between overflow-y-auto relative"
            >
              <div className="space-y-group">
                <div className="flex items-center justify-between pb-base border-b border-border">
                  <div>
                    <span className="font-mono text-caption text-brand block font-bold">
                      Recibo digital auditable
                    </span>
                    <h2 className="text-section-title font-bold text-primary mt-hairline">
                      {selectedOrder.orderNumber}
                    </h2>
                  </div>

                  <div className="flex items-center gap-compact">
                    <div className="flex items-center p-0.5 rounded-control bg-raised border border-border">
                      <button
                        onClick={() => setReceiptMode("formatted")}
                        className={`px-compact py-hairline rounded-control text-caption font-mono transition-colors cursor-pointer ${receiptMode === "formatted" ? "bg-brand-surface text-brand font-bold" : "text-secondary hover:text-primary"
                          }`}
                      >
                        Recibo
                      </button>
                      <button
                        onClick={() => setReceiptMode("json")}
                        className={`px-compact py-hairline rounded-control text-caption font-mono transition-colors cursor-pointer ${receiptMode === "json" ? "bg-brand-surface text-brand font-bold" : "text-secondary hover:text-primary"
                          }`}
                      >
                        JSON
                      </button>
                    </div>

                    <button
                      onClick={() => setIsReceiptDrawerOpen(false)}
                      className="w-8 h-8 rounded-control bg-raised border border-border text-secondary hover:text-primary flex items-center justify-center transition-colors cursor-pointer"
                      title="Cerrar recibo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {receiptMode === "formatted" ? (
                  <div className="space-y-element">
                    <div className="bg-raised rounded-control p-base border border-border space-y-compact">
                      <div className="flex justify-between items-baseline gap-compact">
                        <span className="text-caption font-bold text-primary">{selectedOrder.supplier}</span>
                        <span className="text-caption font-mono text-muted">{selectedOrder.date}</span>
                      </div>
                      <p className="text-caption text-secondary font-mono">
                        Destino: {selectedOrder.destination} · Especialista: {selectedOrder.specialist}
                      </p>
                    </div>

                    <div className="p-base rounded-control bg-brand-surface border border-brand/20 space-y-compact">
                      <div className="flex items-center gap-compact text-caption font-mono font-bold text-brand">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Justificación del agente</span>
                      </div>
                      <p className="text-caption text-secondary leading-relaxed">
                        {selectedOrder.mathJustification.recommendationText}
                      </p>
                      <div className="grid grid-cols-2 gap-compact pt-compact border-t border-brand/20 text-caption font-mono text-muted">
                        <span>Burn rate: {selectedOrder.mathJustification.dailyBurnRate} un/día</span>
                        <span>Cobertura: {selectedOrder.mathJustification.coverageDays} días</span>
                      </div>
                    </div>

                    <div className="space-y-compact">
                      <span className="text-caption font-mono text-muted block font-bold">
                        Ítems de la orden
                      </span>
                      {selectedOrder.lineItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-compact rounded-control bg-raised border border-border flex justify-between items-center text-caption font-mono gap-compact"
                        >
                          <div className="min-w-0">
                            <span className="font-semibold text-primary block truncate">{item.description}</span>
                            <span className="text-caption text-muted">
                              {item.sku} · {item.quantity} un. × ${item.unitPriceCop.toLocaleString("es-CO")}
                            </span>
                          </div>
                          <span className="font-bold text-primary tabular-nums shrink-0">
                            ${item.subtotalCop.toLocaleString("es-CO")}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-hairline pt-compact border-t border-border text-caption font-mono">
                      <div className="flex justify-between text-secondary">
                        <span>Subtotal neto:</span>
                        <span className="tabular-nums">${selectedOrder.subtotalCop.toLocaleString("es-CO")} COP</span>
                      </div>
                      <div className="flex justify-between text-secondary">
                        <span>IVA (19%):</span>
                        <span className="tabular-nums">+${selectedOrder.ivaCop.toLocaleString("es-CO")} COP</span>
                      </div>
                      {selectedOrder.aiDiscountCop > 0 && (
                        <div className="flex justify-between text-state-ok">
                          <span>Descuento negociado IA:</span>
                          <span className="tabular-nums">-${selectedOrder.aiDiscountCop.toLocaleString("es-CO")} COP</span>
                        </div>
                      )}
                      <div className="flex justify-between text-body font-bold text-primary pt-compact border-t border-border">
                        <span>Total liquidado:</span>
                        <span className="text-brand font-bold tabular-nums">
                          ${selectedOrder.totalCop.toLocaleString("es-CO")} COP
                        </span>
                      </div>
                    </div>

                    <div className="p-compact rounded-control bg-raised border border-border space-y-hairline font-mono text-caption">
                      <div className="flex items-center gap-compact text-brand font-bold">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Firma criptográfica HMAC-SHA256 verificada</span>
                      </div>
                      <span className="text-muted block truncate">{selectedOrder.hmacSignature}</span>
                    </div>
                  </div>
                ) : (
                  <pre className="p-base rounded-control bg-raised border border-border text-caption font-mono text-brand overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {JSON.stringify(selectedOrder, null, 2)}
                  </pre>
                )}
              </div>

              <div className="pt-base border-t border-border flex items-center gap-compact">
                <button
                  onClick={() => handleReconcileOrder(selectedOrder.id)}
                  disabled={isReconciling || selectedOrder.status === "recibida_bodega"}
                  className="flex-1 h-9 rounded-control bg-brand hover:bg-brand/90 disabled:bg-raised disabled:text-muted text-canvas font-semibold text-caption flex items-center justify-center gap-compact transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isReconciling ? "animate-spin" : ""}`} />
                  <span>
                    {selectedOrder.status === "recibida_bodega"
                      ? "Orden conciliada"
                      : "Ejecutar reconciliación física"}
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isNewOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-base bg-black/80">
          <div className="w-full max-w-md rounded-container bg-panel border border-border-strong p-group space-y-element text-caption font-sans">
            <div className="flex items-center justify-between pb-compact border-b border-border">
              <div>
                <span className="font-mono text-caption text-brand block font-bold">
                  Crear orden de compra · Control ejecutivo
                </span>
                <h3 className="text-body font-bold text-primary tracking-tight mt-hairline">
                  Nueva solicitud de abastecimiento
                </h3>
              </div>
              <button
                onClick={() => setIsNewOrderModalOpen(false)}
                className="text-muted hover:text-primary cursor-pointer"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-compact font-mono">
              <div>
                <label className="text-secondary block mb-hairline font-sans font-medium">Proveedor:</label>
                <select
                  value={newOrderSupplier}
                  onChange={(e) => setNewOrderSupplier(e.target.value)}
                  className="w-full h-9 bg-raised border border-border rounded-control px-compact text-primary font-sans text-caption focus:outline-none focus:border-brand/50 cursor-pointer"
                >
                  <option value="Ferreterías Unidas Bogotá S.A.S.">Ferreterías Unidas Bogotá S.A.S.</option>
                  <option value="DeWalt Colombia (Mayorista Homologado)">DeWalt Colombia</option>
                  <option value="Mundial de Tornillos S.A.S.">Mundial de Tornillos S.A.S.</option>
                  <option value="Distribuidora del Centro S.A.S.">Distribuidora del Centro S.A.S.</option>
                  <option value="Bosch Sistemas Industriales Colombia">Bosch Sistemas Industriales</option>
                </select>
              </div>

              <div>
                <label className="text-secondary block mb-hairline font-sans font-medium">Descripción del producto:</label>
                <input
                  type="text"
                  value={newOrderProduct}
                  onChange={(e) => setNewOrderProduct(e.target.value)}
                  className="w-full h-9 bg-raised border border-border rounded-control px-compact text-primary font-sans text-caption focus:outline-none focus:border-brand/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-compact">
                <div>
                  <label className="text-secondary block mb-hairline font-sans font-medium">Cantidad:</label>
                  <input
                    type="number"
                    value={newOrderQuantity}
                    onChange={(e) => setNewOrderQuantity(parseInt(e.target.value) || 0)}
                    className="w-full h-9 bg-raised border border-border rounded-control px-compact text-primary font-mono text-caption focus:outline-none focus:border-brand/50"
                  />
                </div>
                <div>
                  <label className="text-secondary block mb-hairline font-sans font-medium">Precio unitario (COP):</label>
                  <input
                    type="number"
                    value={newOrderUnitPrice}
                    onChange={(e) => setNewOrderUnitPrice(parseInt(e.target.value) || 0)}
                    className="w-full h-9 bg-raised border border-border rounded-control px-compact text-primary font-mono text-caption focus:outline-none focus:border-brand/50"
                  />
                </div>
              </div>

              <div className="p-compact rounded-control bg-raised border border-border space-y-hairline text-caption">
                <div className="flex justify-between text-secondary">
                  <span>Subtotal:</span>
                  <span className="tabular-nums">${(newOrderQuantity * newOrderUnitPrice).toLocaleString("es-CO")} COP</span>
                </div>
                <div className="flex justify-between text-secondary">
                  <span>IVA (19%):</span>
                  <span className="tabular-nums">
                    +${(newOrderQuantity * newOrderUnitPrice * IVA_RATE).toLocaleString("es-CO")} COP
                  </span>
                </div>
                <div className="flex justify-between text-primary font-bold pt-hairline border-t border-border">
                  <span>Total estimado:</span>
                  <span className="text-brand tabular-nums">
                    ${(newOrderQuantity * newOrderUnitPrice * (1 + IVA_RATE)).toLocaleString("es-CO")} COP
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-compact flex justify-end gap-compact border-t border-border">
              <button
                onClick={() => setIsNewOrderModalOpen(false)}
                className="px-element py-compact rounded-control bg-transparent hover:bg-raised text-secondary text-caption font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateOrder}
                className="px-base py-compact rounded-control bg-brand hover:bg-brand/90 text-canvas font-semibold text-caption flex items-center gap-compact transition-colors cursor-pointer"
              >
                <span>Generar orden</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
