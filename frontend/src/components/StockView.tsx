import { useState, useMemo, useEffect } from 'react';
import {
  Database,
  Search,
  ArrowRight,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';

export type SchemaTableId = 'inventory' | 'cases' | 'orders';

interface SchemaCardInfo {
  id: SchemaTableId;
  name: string;
  rows: number;
  columnsSummary: string;
  capacityPercent: number;
  capacityLabel: string;
}

// Datos de Inventory
interface InventoryRow {
  sku: string;
  name: string;
  warehouse: string;
  quantity: number;
  minimum: number;
  status: 'healthy' | 'reorder' | 'out_of_stock';
  category: string;
  origin?: 'real' | 'simulado';
}

// Datos de Cases
interface CaseRow {
  id: string;
  title: string;
  agent: string;
  priority: 'Crítica' | 'Alta' | 'Media' | 'Baja';
  status: 'Revisión HITL' | 'Emitido' | 'Resuelto' | 'En Proceso';
  sla: string;
}

// Datos de Orders
interface OrderRow {
  orderId: string;
  sku: string;
  productName: string;
  provider: string;
  amountMXN: string;
  humanApproved: boolean;
  status: 'Pendiente Firma' | 'Emitida' | 'En Tránsito' | 'Entregada';
}

interface StockViewProps {
  onReplenish?: (sku: string) => void;
  onChatRequest?: () => void;
}

export const StockView = ({ onReplenish }: StockViewProps) => {
  const [selectedSchema, setSelectedSchema] = useState<SchemaTableId>('inventory');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tablePage, setTablePage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Estados con datos 100% reales de PostgreSQL / Supabase
  const [liveProducts, setLiveProducts] = useState<InventoryRow[]>([]);
  const [liveCases, setLiveCases] = useState<CaseRow[]>([]);
  const [liveOrders, setLiveOrders] = useState<OrderRow[]>([]);

  const fetchAllData = async () => {
    try {
      const [prodsRes, casesRes, ordersRes] = await Promise.all([
        api.getProducts('comp_default'),
        api.getCases('comp_default'),
        api.getOrders('comp_default'),
      ]);

      if (prodsRes.success && Array.isArray(prodsRes.data)) {
        const mapped: InventoryRow[] = prodsRes.data.map((p) => ({
          sku: p.sku,
          name: p.name,
          warehouse: 'Almacén Central • Bahía ' + (p.sku.slice(-1) || 'A'),
          quantity: p.stock,
          minimum: p.minStock,
          status: p.stock === 0 ? 'out_of_stock' : p.stock < p.minStock ? 'reorder' : 'healthy',
          category: p.category || 'General',
          origin: (p.origin as any) || 'real',
        }));
        setLiveProducts(mapped);
      }

      if (casesRes.success && Array.isArray(casesRes.data)) {
        setLiveCases(casesRes.data);
      }

      if (ordersRes.success && Array.isArray(ordersRes.data)) {
        setLiveOrders(ordersRes.data);
      }
    } catch {
      // Fallback silencioso sin alertas intrusivas en carga inicial
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    await fetchAllData();
    setSyncing(false);
  };

  // Esquemas dinámicos calculados directamente con las filas reales
  const schemas: SchemaCardInfo[] = useMemo(() => [
    {
      id: 'inventory',
      name: 'Catálogo de Insumos',
      rows: liveProducts.length,
      columnsSummary: 'SKU, descripción, existencias, stock mínimo',
      capacityPercent: liveProducts.length > 0
        ? Math.round((liveProducts.filter((p) => p.status === 'healthy').length / liveProducts.length) * 100)
        : 100,
      capacityLabel: `${liveProducts.length} productos en BD`,
    },
    {
      id: 'cases',
      name: 'Casos Operativos',
      rows: liveCases.length,
      columnsSummary: 'ID caso, agente ReAct, prioridad, resolución',
      capacityPercent: liveCases.length > 0
        ? Math.round((liveCases.filter((c) => c.status === 'Resuelto').length / liveCases.length) * 100)
        : 90,
      capacityLabel: `${liveCases.length} casos en BD`,
    },
    {
      id: 'orders',
      name: 'Órdenes de Compra',
      rows: liveOrders.length,
      columnsSummary: 'Folio, monto, aprobación humana, fecha',
      capacityPercent: liveOrders.length > 0 ? 80 : 0,
      capacityLabel: `${liveOrders.length} órdenes en BD`,
    },
  ], [liveProducts, liveCases, liveOrders]);

  // Filtrado reactivo de inventario real
  const filteredInventory = useMemo(() => {
    return liveProducts.filter((i) => {
      const match =
        i.sku.toLowerCase().includes(search.toLowerCase()) ||
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.warehouse.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || i.status === statusFilter;
      return match && matchStatus;
    });
  }, [liveProducts, search, statusFilter]);

  // Filtrado reactivo de casos reales
  const filteredCases = useMemo(() => {
    return liveCases.filter((c) => {
      return (
        c.id.toLowerCase().includes(search.toLowerCase()) ||
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.agent.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [liveCases, search]);

  // Filtrado reactivo de órdenes reales
  const filteredOrders = useMemo(() => {
    return liveOrders.filter((o) => {
      return (
        o.orderId.toLowerCase().includes(search.toLowerCase()) ||
        o.productName.toLowerCase().includes(search.toLowerCase()) ||
        o.provider.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [liveOrders, search]);

  const currentTotal =
    selectedSchema === 'inventory'
      ? filteredInventory.length
      : selectedSchema === 'cases'
      ? filteredCases.length
      : filteredOrders.length;

  const totalTablePages = Math.ceil(currentTotal / ITEMS_PER_PAGE) || 1;

  const paginatedInventory = filteredInventory.slice(
    (tablePage - 1) * ITEMS_PER_PAGE,
    tablePage * ITEMS_PER_PAGE
  );

  const paginatedCases = filteredCases.slice(
    (tablePage - 1) * ITEMS_PER_PAGE,
    tablePage * ITEMS_PER_PAGE
  );

  const paginatedOrders = filteredOrders.slice(
    (tablePage - 1) * ITEMS_PER_PAGE,
    tablePage * ITEMS_PER_PAGE
  );

  const exportCurrentTable = () => {
    let csv = '';
    if (selectedSchema === 'inventory') {
      csv =
        'SKU,Producto,Almacen,Stock,Minimo,Estado\n' +
        filteredInventory.map((i) => `${i.sku},"${i.name}","${i.warehouse}",${i.quantity},${i.minimum},${i.status}`).join('\n');
    } else if (selectedSchema === 'cases') {
      csv =
        'ID,Titulo,Agente,Prioridad,Estado,SLA\n' +
        filteredCases.map((c) => `${c.id},"${c.title}","${c.agent}",${c.priority},${c.status},"${c.sla}"`).join('\n');
    } else {
      csv =
        'OrderID,SKU,Producto,Proveedor,Monto,AprobacionHITL,Estado\n' +
        filteredOrders
          .map((o) => `${o.orderId},${o.sku},"${o.productName}","${o.provider}","${o.amountMXN}",${o.humanApproved},${o.status}`)
          .join('\n');
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `drizzle-schema-${selectedSchema}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Tabla "${selectedSchema}" exportada`);
  };

  return (
    <div className="flex flex-col w-full max-w-[1360px] mx-auto gap-6 font-sans text-zinc-100 pb-12">
      {/* ───────── HEADER NEUTRO MODERNISTA ───────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2.5">
            <Database className="h-5 w-5 text-emerald-400" />
            <h1 className="text-2xl font-bold font-headline text-zinc-100 tracking-tight">
              Inventario & Catálogo Empresarial
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1 pl-7.5">
            Supervisión continua de existencias reales en PostgreSQL / Supabase, límites de seguridad y estado de reposición.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-xs font-medium text-zinc-300 transition-all hover:bg-white/[0.08] hover:border-white/[0.14] hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-zinc-400 ${syncing ? 'animate-spin' : ''}`} />
            <span>Sincronizar Catálogo</span>
          </button>
        </div>
      </div>

      {/* ───────── 3 SCHEMA CARDS (DINÁMICAS CON CONTEO REAL) ───────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {schemas.map((schema) => {
          const isSelected = selectedSchema === schema.id;
          return (
            <div
              key={schema.id}
              onClick={() => {
                setSelectedSchema(schema.id);
                setSearch('');
                setTablePage(1);
              }}
              className={`cursor-pointer rounded-xl p-5 flex flex-col justify-between transition-all duration-150 border bg-[#08120B] shadow-[0_4px_20px_rgba(0,0,0,0.4)] ${
                isSelected
                  ? 'border-[#1F4527] border-l-2 border-l-[#34D353] bg-[#0E2415]'
                  : 'border-[#162D1D] hover:border-[#1F4527] hover:bg-[#0A170E]'
              }`}
            >
              {/* Header de la tarjeta */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isSelected ? 'bg-[#34D353]' : 'bg-[#527558]'
                    }`}
                  />
                  <span className="font-mono text-sm font-medium text-[#E8FBEA]">
                    {schema.name}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-[#8EB795] bg-[#0A170E] px-2 py-0.5 rounded-full border border-[#162D1D]">
                  {schema.rows} registros
                </span>
              </div>

              {/* Subtítulo de columnas */}
              <p className="font-mono text-[11px] text-[#8EB795] mb-4 truncate">
                {schema.columnsSummary}
              </p>

              {/* Barra de progreso sutil y limpia */}
              <div className="space-y-1.5">
                <div className="w-full h-1 bg-[#102416] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isSelected ? 'bg-[#34D353]' : 'bg-[#527558]'
                    }`}
                    style={{ width: `${schema.capacityPercent}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono text-[#527558] pt-0.5">
                  <span>{schema.capacityLabel}</span>
                  <span className={isSelected ? 'text-[#B8F5A0] font-medium' : 'text-[#527558]'}>
                    {isSelected ? 'Activa' : `${schema.capacityPercent}%`}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ───────── VISTA PREVIA ───────── */}
      <div className="rounded-xl border border-[#162D1D] bg-[#08120B] p-5 md:p-6 flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        {/* Barra superior de la tabla */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-1 border-b border-[#162D1D]">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-[#34D353]" />
            <h2 className="text-sm font-medium font-headline text-[#E8FBEA]">
              Vista Previa: <span className="font-mono text-[#B8F5A0] font-semibold">{selectedSchema}</span>
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
            {/* Filtros sutiles para Inventory */}
            {selectedSchema === 'inventory' && (
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'reorder', label: 'Bajo Stock' },
                  { id: 'healthy', label: 'Óptimo' },
                ].map((pill) => {
                  const isActive = statusFilter === pill.id;
                  return (
                    <button
                      key={pill.id}
                      onClick={() => setStatusFilter(pill.id)}
                      className={`cursor-pointer rounded-md px-2.5 py-1 text-xs transition-all ${
                        isActive
                          ? 'bg-white/[0.08] text-zinc-100 font-medium'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {pill.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Input de Búsqueda */}
            <div className="relative flex-1 sm:flex-initial">
              <input
                type="text"
                placeholder="Buscar registros..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setTablePage(1);
                }}
                className="w-full sm:w-52 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 pl-8 text-xs text-zinc-200 placeholder:text-zinc-500 focus:border-[#34D353] focus:outline-none transition-all"
              />
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            </div>

            {/* Controles de Paginación (< y >) */}
            {totalTablePages > 1 && (
              <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-1.5 py-0.5">
                <button
                  type="button"
                  onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                  disabled={tablePage === 1}
                  title="Página anterior"
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono text-zinc-300 px-1">
                  {tablePage} / {totalTablePages}
                </span>
                <button
                  type="button"
                  onClick={() => setTablePage((p) => Math.min(totalTablePages, p + 1))}
                  disabled={tablePage === totalTablePages}
                  title="Página siguiente"
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Botón Exportar CSV */}
            <button
              onClick={exportCurrentTable}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-all hover:bg-white/[0.08] hover:text-white shrink-0"
            >
              <Download className="h-3.5 w-3.5 text-zinc-400" />
              <span>Exportar</span>
            </button>
          </div>
        </div>

        {/* ───────── TABLA: INVENTORY ───────── */}
        {selectedSchema === 'inventory' && (
          <div className="overflow-x-auto custom-scrollbar -mx-4 sm:mx-0 px-4 sm:px-0">
            {loading ? (
              <div className="py-16 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                Cargando inventario desde PostgreSQL / Supabase...
              </div>
            ) : filteredInventory.length === 0 ? (
              <div className="py-16 text-center text-xs text-zinc-500">
                No se encontraron productos registrados en la base de datos.
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[680px]">
                <thead>
                  <tr className="border-b border-[#162D1D] text-[11px] font-mono text-[#8EB795] uppercase tracking-wider">
                    <th className="py-3 px-3">SKU</th>
                    <th className="py-3 px-3">Insumo / Descripción</th>
                    <th className="py-3 px-3">Ubicación</th>
                    <th className="py-3 px-3 text-right">Stock Real</th>
                    <th className="py-3 px-3 text-right">Mínimo</th>
                    <th className="py-3 px-3 text-center">Estado</th>
                    <th className="py-3 px-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#162D1D] text-xs">
                  {paginatedInventory.map((item) => (
                    <tr
                      key={item.sku}
                      className="hover:bg-[#0E2415]/50 transition-colors duration-100 group"
                    >
                      <td className="py-3 px-3 font-mono font-medium text-[#B8F5A0]">
                        {item.sku}
                      </td>
                      <td className="py-3 px-3 font-medium text-[#E8FBEA]">
                        <div className="flex items-center gap-2">
                          <span>{item.name}</span>
                          {item.origin === 'real' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                              DB Real
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-[#8EB795] font-mono text-[11px]">
                        {item.warehouse}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-[#E8FBEA]">
                        {item.quantity} u
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[#8EB795]">
                        {item.minimum} u
                      </td>
                      <td className="py-3 px-3 text-center">
                        {item.status === 'out_of_stock' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono text-red-400 bg-red-950/30 border border-red-800/40">
                            Agotado
                          </span>
                        ) : item.status === 'reorder' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono text-amber-400 bg-amber-950/30 border border-amber-800/40">
                            Bajo Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono text-[#34D353] bg-[#0E2415] border border-[#1F4527]">
                            Óptimo
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {item.status !== 'healthy' ? (
                          <button
                            onClick={() => onReplenish?.(item.sku)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#1F4527] hover:bg-[#34D353] text-white hover:text-black transition-colors"
                          >
                            <span>Reponer</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#527558] font-mono">OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ───────── TABLA: CASES ───────── */}
        {selectedSchema === 'cases' && (
          <div className="overflow-x-auto custom-scrollbar -mx-4 sm:mx-0 px-4 sm:px-0">
            {filteredCases.length === 0 ? (
              <div className="py-16 text-center text-xs text-zinc-500">
                No hay casos operativos registrados en la base de datos relacional.
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[620px]">
                <thead>
                  <tr className="border-b border-[#162D1D] text-[11px] font-mono text-[#8EB795] uppercase tracking-wider">
                    <th className="py-3 px-3">ID Caso</th>
                    <th className="py-3 px-3">Título / Incidencia</th>
                    <th className="py-3 px-3">Agente Responsable</th>
                    <th className="py-3 px-3 text-center">Prioridad</th>
                    <th className="py-3 px-3 text-center">Estado</th>
                    <th className="py-3 px-3 text-right">SLA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#162D1D] text-xs">
                  {paginatedCases.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-[#0E2415]/50 transition-colors duration-100"
                    >
                      <td className="py-3 px-3 font-mono font-medium text-[#B8F5A0]">
                        {item.id}
                      </td>
                      <td className="py-3 px-3 font-medium text-[#E8FBEA]">
                        {item.title}
                      </td>
                      <td className="py-3 px-3 text-[#8EB795] font-mono text-[11px]">
                        {item.agent}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-mono ${
                            item.priority === 'Crítica'
                              ? 'text-red-400 bg-red-950/30 border border-red-800/40'
                              : item.priority === 'Alta'
                              ? 'text-amber-400 bg-amber-950/30 border border-amber-800/40'
                              : 'text-[#8EB795] bg-[#0A170E] border border-[#162D1D]'
                          }`}
                        >
                          {item.priority}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-[11px] text-[#E8FBEA]">
                        {item.status}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[11px] text-[#8EB795]">
                        {item.sla}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ───────── TABLA: ORDERS ───────── */}
        {selectedSchema === 'orders' && (
          <div className="overflow-x-auto custom-scrollbar -mx-4 sm:mx-0 px-4 sm:px-0">
            {filteredOrders.length === 0 ? (
              <div className="py-16 text-center text-xs text-zinc-500">
                No hay órdenes de compra registradas aún en la base de datos.
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[620px]">
                <thead>
                  <tr className="border-b border-[#162D1D] text-[11px] font-mono text-[#8EB795] uppercase tracking-wider">
                    <th className="py-3 px-3">Folio</th>
                    <th className="py-3 px-3">SKU</th>
                    <th className="py-3 px-3">Producto</th>
                    <th className="py-3 px-3">Proveedor</th>
                    <th className="py-3 px-3 text-right">Monto</th>
                    <th className="py-3 px-3 text-center">Aprobación HITL</th>
                    <th className="py-3 px-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#162D1D] text-xs">
                  {paginatedOrders.map((item) => (
                    <tr
                      key={item.orderId}
                      className="hover:bg-[#0E2415]/50 transition-colors duration-100"
                    >
                      <td className="py-3 px-3 font-mono font-medium text-[#B8F5A0]">
                        {item.orderId}
                      </td>
                      <td className="py-3 px-3 font-mono text-[#8EB795]">
                        {item.sku}
                      </td>
                      <td className="py-3 px-3 font-medium text-[#E8FBEA]">
                        {item.productName}
                      </td>
                      <td className="py-3 px-3 text-[#8EB795] text-[11px]">
                        {item.provider}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-[#E8FBEA]">
                        {item.amountMXN}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-mono ${
                            item.humanApproved
                              ? 'text-emerald-400 bg-emerald-950/30 border border-emerald-800/40'
                              : 'text-amber-400 bg-amber-950/30 border border-amber-800/40'
                          }`}
                        >
                          {item.humanApproved ? 'Aprobada' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-[11px] text-[#E8FBEA]">
                        {item.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Paginación Inferior Accesible (< y >) */}
        {totalTablePages > 1 && (
          <div className="pt-4 mt-2 border-t border-[#162D1D] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400 font-mono">
            <span>
              Mostrando {Math.min(currentTotal, (tablePage - 1) * ITEMS_PER_PAGE + 1)} - {Math.min(currentTotal, tablePage * ITEMS_PER_PAGE)} de {currentTotal} registros
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                disabled={tablePage === 1}
                className="p-1 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] hover:text-white transition disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                title="Página anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 text-zinc-300 font-medium">
                Pág. {tablePage} de {totalTablePages}
              </span>
              <button
                type="button"
                onClick={() => setTablePage((p) => Math.min(totalTablePages, p + 1))}
                disabled={tablePage === totalTablePages}
                className="p-1 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] hover:text-white transition disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                title="Página siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
