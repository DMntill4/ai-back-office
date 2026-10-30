import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search } from "lucide-react";
import { PageHeader } from "../ui/PageHeader";
import { SegmentedTabs, TabItem } from "../ui/SegmentedTabs";
import { MetricStrip, MetricItem } from "../ui/MetricStrip";
import { StatusIndicator, OperationalStatus } from "../ui/StatusIndicator";
import { Button } from "../ui/Button";
import { DataTable, TableColumn } from "../ui/DataTable";
import { InputField } from "../ui/InputField";
import { Dialog } from "../ui/Dialog";
import { SimulationSlider } from "../ui/SimulationSlider";

export interface ProductCatalogItem {
  sku: string;
  name: string;
  category: string;
  brand: string;
  currentStock: number;
  safetyStock: number;
  rop: number;
  unitCostCop: number;
  salePriceCop: number;
  primarySupplier: string;
  supplierLeadTimeDays: number;
  status: "optimo" | "rop_critico" | "en_espera_oc";
  abcClass: "A" | "B" | "C";
  warehouses: {
    bucaramanga: number;
    bogota: number;
    medellin: number;
    enTransito: number;
  };
  coverageDays: number;
}

export interface ProductsCatalogViewProps {
  onNavigateTo?: (tabId: string) => void;
}

const PRODUCTS_DATA: ProductCatalogItem[] = [
  {
    sku: "SKU-FER-001",
    name: "Disco Diamantado 7\" Concreto Industrial",
    category: "Consumibles de corte",
    brand: "DeWalt Pro",
    currentStock: 48,
    safetyStock: 20,
    rop: 35,
    unitCostCop: 38500,
    salePriceCop: 62000,
    primarySupplier: "Ferreterías Unidas Bogotá S.A.S.",
    supplierLeadTimeDays: 2,
    status: "optimo",
    abcClass: "A",
    warehouses: { bucaramanga: 24, bogota: 16, medellin: 8, enTransito: 30 },
    coverageDays: 18,
  },
  {
    sku: "SKU-FER-002",
    name: "Pernos Hexagonales Grado 8 1/2\" x 3\"",
    category: "Tornillería y fijaciones",
    brand: "Mundial Fix",
    currentStock: 12,
    safetyStock: 25,
    rop: 40,
    unitCostCop: 2800,
    salePriceCop: 4900,
    primarySupplier: "Mundial de Tornillos S.A.S.",
    supplierLeadTimeDays: 3,
    status: "rop_critico",
    abcClass: "A",
    warehouses: { bucaramanga: 4, bogota: 5, medellin: 3, enTransito: 0 },
    coverageDays: 3,
  },
  {
    sku: "SKU-FER-003",
    name: "Martillo Demoledor SDS-Max 1500W Industrial",
    category: "Maquinaria pesada",
    brand: "Bosch Heavy Duty",
    currentStock: 6,
    safetyStock: 4,
    rop: 5,
    unitCostCop: 1420000,
    salePriceCop: 2150000,
    primarySupplier: "Dewalt Colombia (Mayorista)",
    supplierLeadTimeDays: 6,
    status: "en_espera_oc",
    abcClass: "B",
    warehouses: { bucaramanga: 3, bogota: 2, medellin: 1, enTransito: 15 },
    coverageDays: 9,
  },
  {
    sku: "SKU-FER-004",
    name: "Electrodo Soldadura 6013 1/8\" Caja x 20kg",
    category: "Soldadura y perfiles",
    brand: "West Arco",
    currentStock: 85,
    safetyStock: 30,
    rop: 50,
    unitCostCop: 125000,
    salePriceCop: 185000,
    primarySupplier: "Aceros del Oriente S.A.",
    supplierLeadTimeDays: 4,
    status: "optimo",
    abcClass: "B",
    warehouses: { bucaramanga: 45, bogota: 25, medellin: 15, enTransito: 0 },
    coverageDays: 24,
  },
];

const STATUS_VIEW: Record<ProductCatalogItem["status"], { status: OperationalStatus; label: string }> = {
  optimo: { status: "ok", label: "Óptimo" },
  rop_critico: { status: "error", label: "Se agota pronto" },
  en_espera_oc: { status: "progress", label: "Compra en curso" },
};

const ROTATION_LABEL: Record<ProductCatalogItem["abcClass"], string> = {
  A: "Alta",
  B: "Media",
  C: "Baja",
};

const formatCop = (value: number) =>
  value.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

export const ProductsCatalogView: React.FC<ProductsCatalogViewProps> = ({ onNavigateTo }) => {
  const [selectedStatus, setSelectedStatus] = useState<string>("todos");
  const [selectedCategory, setSelectedCategory] = useState<string>("todas");
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [simProduct, setSimProduct] = useState<ProductCatalogItem | null>(null);
  const [simQuantity, setSimQuantity] = useState(0);

  const inventoryTabs: TabItem[] = [
    { id: "inventario", label: "Existencias" },
    { id: "productos", label: "Productos" },
    { id: "rutas_logistica", label: "Rutas y despachos" },
  ];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const categories = useMemo(() => Array.from(new Set(PRODUCTS_DATA.map((p) => p.category))), []);

  const counts = useMemo(() => {
    const c = { todos: PRODUCTS_DATA.length, optimo: 0, rop_critico: 0, en_espera_oc: 0 };
    PRODUCTS_DATA.forEach((p) => {
      c[p.status] += 1;
    });
    return c;
  }, []);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return PRODUCTS_DATA.filter((p) => {
      if (selectedStatus !== "todos" && p.status !== selectedStatus) return false;
      if (selectedCategory !== "todas" && p.category !== selectedCategory) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q) && !p.brand.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [selectedStatus, selectedCategory, searchQuery]);

  const metrics: MetricItem[] = [
    { id: "productos", value: String(counts.todos), context: "Productos en el catálogo de muestra" },
    {
      id: "riesgo",
      value: String(counts.rop_critico),
      context: "Se agotan pronto",
      auxiliary: counts.rop_critico > 0 ? <StatusIndicator status="error" label="Reponer" /> : undefined,
    },
    { id: "compra", value: String(counts.en_espera_oc), context: "Con compra en curso" },
    {
      id: "transito",
      value: String(PRODUCTS_DATA.reduce((s, p) => s + p.warehouses.enTransito, 0)),
      context: "Unidades en tránsito hacia las sedes",
      highlightBrand: true,
    },
  ];

  const statusTabs: TabItem[] = [
    { id: "todos", label: "Todos", badge: counts.todos },
    { id: "optimo", label: "Óptimo", badge: counts.optimo },
    { id: "rop_critico", label: "Se agota pronto", badge: counts.rop_critico },
    { id: "en_espera_oc", label: "Compra en curso", badge: counts.en_espera_oc },
  ];

  const columns: TableColumn<ProductCatalogItem>[] = [
    {
      key: "product",
      header: "Producto",
      render: (p) => (
        <div className="min-w-0">
          <span className="block text-body font-medium text-primary max-w-[220px]">{p.name}</span>
          <span className="block text-caption text-secondary whitespace-nowrap">
            <span className="font-mono text-primary">{p.sku}</span> · {p.brand}
          </span>
        </div>
      ),
    },
    {
      key: "supplier",
      header: "Proveedor",
      render: (p) => (
        <div>
          <span className="block text-body text-primary max-w-[150px]">{p.primarySupplier}</span>
          <span className="block text-caption text-secondary">Entrega en {p.supplierLeadTimeDays} días</span>
        </div>
      ),
    },
    {
      key: "stock",
      header: "Existencias",
      align: "right",
      render: (p) => (
        <div>
          <span className="block text-body text-primary tabular-nums">{p.currentStock} unidades</span>
          <span
            className="block text-caption text-secondary tabular-nums whitespace-nowrap"
            title={`Bucaramanga ${p.warehouses.bucaramanga} · Bogotá ${p.warehouses.bogota} · Medellín ${p.warehouses.medellin}`}
          >
            {p.warehouses.enTransito > 0 ? `+${p.warehouses.enTransito} en camino` : "En 3 sedes"}
          </span>
        </div>
      ),
    },
    {
      key: "coverage",
      header: "Cobertura",
      align: "right",
      render: (p) => (
        <div>
          <span className={`block tabular-nums text-body ${p.coverageDays < 7 ? "text-state-attention" : "text-primary"}`}>
            {p.coverageDays} días
          </span>
          <span className="block text-caption text-secondary whitespace-nowrap">Rotación {ROTATION_LABEL[p.abcClass].toLowerCase()}</span>
        </div>
      ),
    },
    {
      key: "price",
      header: "Precio",
      align: "right",
      render: (p) => (
        <div>
          <span className="block text-body text-primary tabular-nums whitespace-nowrap">{formatCop(p.salePriceCop)}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Estado",
      render: (p) => <StatusIndicator status={STATUS_VIEW[p.status].status} label={STATUS_VIEW[p.status].label} />,
    },
    {
      key: "action",
      header: "",
      align: "right",
      render: (p) => (
        <Button
          variant="secondary"
          size="table"
          onClick={() => {
            setSimProduct(p);
            setSimQuantity(Math.max(p.rop * 2 - p.currentStock, 1));
          }}
        >
          Simular
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
        title="Productos"
        description="Catálogo con proveedor, existencias por sede y cobertura."
        filterControl={<SegmentedTabs tabs={inventoryTabs} activeTab="productos" onChange={(id) => onNavigateTo?.(id)} />}
      />

      <MetricStrip items={metrics} />

      <div className="flex flex-wrap items-center justify-between gap-element">
        <div className="flex flex-wrap items-center gap-compact">
          <div className="w-full sm:w-72">
            <InputField
              placeholder="Buscar SKU, producto o marca"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-3.5 h-3.5" />}
              aria-label="Buscar productos"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={selectClass}
            aria-label="Filtrar por categoría"
          >
            <option value="todas">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <SegmentedTabs tabs={statusTabs} activeTab={selectedStatus} onChange={setSelectedStatus} />
      </div>

      <DataTable
        columns={columns}
        data={filteredProducts}
        keyExtractor={(p) => p.sku}
        emptyMessage="Ningún producto coincide con esos filtros. Cambia la categoría o el estado, o borra la búsqueda."
      />

      <Dialog
        isOpen={!!simProduct}
        onClose={() => setSimProduct(null)}
        title="Simular reposición"
        description={simProduct ? `${simProduct.sku} · ${simProduct.name}` : undefined}
        confirmLabel="Proponer compra"
        onConfirm={() => {
          if (simProduct) showToast(`Compra propuesta: ${simQuantity} unidades de ${simProduct.sku}.`);
          setSimProduct(null);
        }}
      >
        {simProduct && (
          <SimulationSlider
            label="Cantidad a comprar"
            value={simQuantity}
            min={1}
            max={Math.max(simProduct.rop * 4, 10)}
            unit="unidades"
            unitPriceCop={simProduct.unitCostCop}
            dailyConsumption={simProduct.currentStock / Math.max(simProduct.coverageDays, 1)}
            onChange={setSimQuantity}
          />
        )}
      </Dialog>
    </div>
  );
};

