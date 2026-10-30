import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Package,
  Search,
  Tag,
  Boxes,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Filter,
  Plus,
  ChevronRight,
  MoreHorizontal,
  MapPin,
  Clock,
  Sliders,
  BarChart2,
} from "lucide-react";
import { StatusBadge } from "../ui/StatusBadge";

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

const PRODUCTS_DATA: ProductCatalogItem[] = [
  {
    sku: "SKU-FER-001",
    name: "Disco Diamantado 7\" Concreto Industrial",
    category: "Consumibles de Corte",
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
    warehouses: {
      bucaramanga: 24,
      bogota: 16,
      medellin: 8,
      enTransito: 30,
    },
    coverageDays: 18,
  },
  {
    sku: "SKU-FER-002",
    name: "Pernos Hexagonales Grado 8 1/2\" x 3\"",
    category: "Tornillería & Fijaciones",
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
    warehouses: {
      bucaramanga: 4,
      bogota: 5,
      medellin: 3,
      enTransito: 0,
    },
    coverageDays: 3,
  },
  {
    sku: "SKU-FER-003",
    name: "Martillo Demoledor SDS-Max 1500W Industrial",
    category: "Maquinaria Pesada",
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
    warehouses: {
      bucaramanga: 3,
      bogota: 2,
      medellin: 1,
      enTransito: 15,
    },
    coverageDays: 9,
  },
  {
    sku: "SKU-FER-004",
    name: "Electrodo Soldadura 6013 1/8\" Caja x 20kg",
    category: "Soldadura & Perfiles",
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
    warehouses: {
      bucaramanga: 45,
      bogota: 25,
      medellin: 15,
      enTransito: 0,
    },
    coverageDays: 24,
  },
];

export const ProductsCatalogView: React.FC = () => {
  const [products, setProducts] = useState<ProductCatalogItem[]>(PRODUCTS_DATA);
  const [selectedStatus, setSelectedStatus] = useState<string>("todos");
  const [selectedCategory, setSelectedCategory] = useState<string>("todas");
  const [selectedAbc, setSelectedAbc] = useState<string>("todas");
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleResetFilters = () => {
    setSelectedStatus("todos");
    setSelectedCategory("todas");
    setSelectedAbc("todas");
    setSearchQuery("");
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedStatus !== "todos" && p.status !== selectedStatus) return false;
      if (selectedCategory !== "todas" && !p.category.toLowerCase().includes(selectedCategory.toLowerCase()))
        return false;
      if (selectedAbc !== "todas" && p.abcClass !== selectedAbc) return false;
      if (
        searchQuery &&
        !p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !p.sku.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [products, selectedStatus, selectedCategory, selectedAbc, searchQuery]);

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
      {/* HEADER SUPERIOR EJECUTIVO                                 */}
      {/* ========================================================= */}
      <header className="px-6 py-4 bg-canvas border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-20 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Catálogo Maestro de Productos
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Monitoreo de puntos de reorden (ROP), costo landed y distribución multisede
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar SKU, producto o marca..."
              className="h-9 w-60 sm:w-72 bg-surface-1 border border-white/[0.08] hover:border-white/20 focus:border-emerald-500/50 rounded-xl pl-9 pr-9 text-xs text-white placeholder:text-zinc-500 focus:outline-none transition-all"
            />
            <span className="absolute right-2.5 text-[10px] font-mono text-zinc-500 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06] pointer-events-none">
              ⌘F
            </span>
          </div>

          <button
            onClick={() => showToast("Abriendo asistente de alta de producto...")}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs flex items-center gap-1.5 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Nuevo Producto</span>
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* CUERPO PRINCIPAL: SIDEBAR DE FILTROS + LISTA INVENTAR      */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-6 gap-6 min-h-0">
        {/* PANEL IZQUIERDO DE FILTROS (260px) */}
        <aside className="w-full md:w-[260px] bg-surface-1 rounded-2xl p-4 border border-white/[0.06] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] shrink-0 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-5">
            {/* Estado de Stock (Grid 2x2) */}
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block mb-2.5">
                Estado de Stock
              </span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "todos", label: "Todos", count: 338 },
                  { id: "optimo", label: "Óptimo", count: 312 },
                  { id: "rop_critico", label: "Quiebre", count: 8 },
                  { id: "en_espera_oc", label: "En OC", count: 18 },
                ].map((btn) => (
                  <button
                    key={btn.id}
                    onClick={() => setSelectedStatus(btn.id)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-between border ${selectedStatus === btn.id
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)] font-semibold"
                        : "bg-surface-well border-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                      }`}
                  >
                    <span>{btn.label}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${selectedStatus === btn.id
                          ? "bg-emerald-500/25 text-emerald-300 font-bold"
                          : "bg-white/[0.04] text-zinc-500"
                        }`}
                    >
                      {btn.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Clasificación ABC */}
            <div className="pt-4 border-t border-white/[0.06]">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block mb-2">
                Rotación ABC
              </span>
              <div className="grid grid-cols-3 gap-2">
                {["todas", "A", "B"].map((cls) => (
                  <button
                    key={cls}
                    onClick={() => setSelectedAbc(cls)}
                    className={`py-1.5 rounded-xl text-xs font-mono font-medium transition-all border ${selectedAbc === cls
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                        : "bg-surface-well border-white/[0.04] text-zinc-400 hover:text-white"
                      }`}
                  >
                    {cls === "todas" ? "Todas" : `Clase ${cls}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Desplegable de Categoría */}
            <div className="pt-4 border-t border-white/[0.06]">
              <label className="text-[10px] font-mono text-zinc-500 block mb-1">
                Línea de Producto
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full h-9 bg-surface-well border border-white/[0.06] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-emerald-500/50"
              >
                <option value="todas">Todas las categorías</option>
                <option value="corte">Consumibles de Corte</option>
                <option value="fijaciones">Tornillería & Fijaciones</option>
                <option value="maquinaria">Maquinaria Pesada</option>
                <option value="soldadura">Soldadura</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleResetFilters}
            className="w-full mt-4 py-2 px-3 rounded-xl bg-surface-well hover:bg-white/[0.06] border border-white/[0.06] text-xs font-medium text-zinc-400 hover:text-white transition-all flex items-center justify-center gap-1.5"
          >
            <span>Restablecer Filtros</span>
          </button>
        </aside>

        {/* ÁREA DERECHA: TARJETAS DE 2 NIVELES (ESTILO INVENTAR) */}
        <main className="flex-1 overflow-y-auto space-y-3.5 pr-1">
          {filteredProducts.map((p) => (
            <div
              key={p.sku}
              className="bg-surface-1 rounded-2xl p-5 border border-white/[0.06] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] transition-all hover:border-emerald-500/30"
            >
              {/* Nivel 1: Cabecera con SKU, Nombre, Precios y Badges */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className="font-mono text-xs font-bold text-emerald-400">
                      {p.sku}
                    </span>
                    <span className="text-white/20">·</span>
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      {p.name}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                    <span className="text-zinc-300 font-medium">
                      {p.brand}
                    </span>
                    <span>•</span>
                    <span className="text-zinc-400">{p.category}</span>
                    <span>•</span>
                    <span className="font-mono text-[11px] text-zinc-400">
                      Proveedor: {p.primarySupplier}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-sm font-bold text-white font-mono block">
                      ${p.salePriceCop.toLocaleString("es-CO")} COP
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      Costo: ${p.unitCostCop.toLocaleString("es-CO")} COP
                    </span>
                  </div>

                  {p.status === "optimo" ? (
                    <StatusBadge variant="success" label="Stock Óptimo" />
                  ) : p.status === "rop_critico" ? (
                    <StatusBadge variant="danger" label="Riesgo ROP" />
                  ) : (
                    <StatusBadge variant="warning" label="En Orden" />
                  )}

                  <span className="px-2 py-0.5 rounded-md bg-white/[0.06] text-zinc-300 font-mono text-[11px] font-bold">
                    Clase {p.abcClass}
                  </span>

                  <button className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Nivel 2: Sub-contenedor "Well" con Disponibilidad por Sede */}
              <div className="bg-surface-well rounded-xl p-4 mt-3 border border-white/[0.04]">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.04]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-300">
                      Inventario Total: <strong className="text-white font-mono">{p.currentStock} unidades</strong>
                    </span>
                    <span className="text-zinc-500">•</span>
                    <span className="text-xs text-emerald-400 font-mono">
                      Cobertura: {p.coverageDays} días
                    </span>
                  </div>

                  <button
                    onClick={() => showToast(`Simulando escenario de compra para ${p.sku}...`)}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                  >
                    <span>Simular Reabastecimiento</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 4 Nodos de Sede / Stock */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-surface-1/60 p-2.5 rounded-lg border border-white/[0.04]">
                    <span className="text-[10px] text-zinc-500 uppercase font-mono block">
                      Bucaramanga (Matriz)
                    </span>
                    <span className="text-sm font-bold text-white font-mono">
                      {p.warehouses.bucaramanga} u.
                    </span>
                  </div>
                  <div className="bg-surface-1/60 p-2.5 rounded-lg border border-white/[0.04]">
                    <span className="text-[10px] text-zinc-500 uppercase font-mono block">
                      Bogotá D.C. (CD)
                    </span>
                    <span className="text-sm font-bold text-white font-mono">
                      {p.warehouses.bogota} u.
                    </span>
                  </div>
                  <div className="bg-surface-1/60 p-2.5 rounded-lg border border-white/[0.04]">
                    <span className="text-[10px] text-zinc-500 uppercase font-mono block">
                      Medellín (CD Itagüí)
                    </span>
                    <span className="text-sm font-bold text-white font-mono">
                      {p.warehouses.medellin} u.
                    </span>
                  </div>
                  <div className="bg-surface-1/60 p-2.5 rounded-lg border border-white/[0.04]">
                    <span className="text-[10px] text-zinc-500 uppercase font-mono block">
                      En Tránsito OSRM
                    </span>
                    <span className="text-sm font-bold text-emerald-400 font-mono">
                      {p.warehouses.enTransito > 0 ? `+${p.warehouses.enTransito} u.` : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </main>
      </div>
    </div>
  );
};

