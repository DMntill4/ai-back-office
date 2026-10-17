import { useState, useMemo } from 'react';
import {
  Database,
  Search,
  ArrowRight,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

export type SchemaTableId = 'inventory' | 'cases' | 'orders';

interface SchemaCardInfo {
  id: SchemaTableId;
  name: string;
  rows: number;
  columnsSummary: string;
  capacityPercent: number;
  capacityLabel: string;
}

const SCHEMAS: SchemaCardInfo[] = [
  {
    id: 'inventory',
    name: 'inventory',
    rows: 231,
    columnsSummary: 'SKU (PK), quantity, minimum, last_updated',
    capacityPercent: 78,
    capacityLabel: '78% de umbral promedio',
  },
  {
    id: 'cases',
    name: 'cases',
    rows: 15,
    columnsSummary: 'id (PK), status, agent_assigned, priority',
    capacityPercent: 91,
    capacityLabel: '91% autonomía ReAct',
  },
  {
    id: 'orders',
    name: 'orders',
    rows: 48,
    columnsSummary: 'order_id (PK), amount, human_approved, created_at',
    capacityPercent: 65,
    capacityLabel: '65% límite presupuestal',
  },
];

// Datos de Inventory
interface InventoryRow {
  sku: string;
  name: string;
  warehouse: string;
  quantity: number;
  minimum: number;
  status: 'healthy' | 'reorder' | 'out_of_stock';
  category: string;
}

const INVENTORY_DATA: InventoryRow[] = [
  { sku: 'MCU-X1', name: 'Microcontrolador X1', warehouse: 'Almacén Norte', quantity: 180, minimum: 200, status: 'reorder', category: 'Controladores' },
  { sku: 'SENS-OPT', name: 'Sensor Óptico V2', warehouse: 'Almacén Central • Bahía A', quantity: 45, minimum: 50, status: 'reorder', category: 'Sensores' },
  { sku: 'PWR-500', name: 'Fuente de Poder 500W', warehouse: 'Almacén Central • Bahía C', quantity: 320, minimum: 100, status: 'healthy', category: 'Potencia' },
  { sku: 'ST-200', name: 'Sensor Térmico ST-200', warehouse: 'Almacén Central • Bahía B', quantity: 2, minimum: 15, status: 'reorder', category: 'Sensores' },
  { sku: 'VALV-P2', name: 'Válvula Neumática P2', warehouse: 'Almacén Occidente', quantity: 45, minimum: 30, status: 'healthy', category: 'Actuadores' },
  { sku: 'REL-48V', name: 'Relé Estado Sólido 48V', warehouse: 'Almacén Central • Bahía A', quantity: 0, minimum: 10, status: 'out_of_stock', category: 'Potencia' },
  { sku: 'FUS-10A', name: 'Fusible Cerámico 10A', warehouse: 'Almacén Central • Bahía C', quantity: 120, minimum: 50, status: 'healthy', category: 'Protección' },
  { sku: 'TERM-PT100', name: 'Termopar PT100', warehouse: 'Almacén Sur', quantity: 8, minimum: 12, status: 'reorder', category: 'Sensores' },
  { sku: 'CAB-CAT6A', name: 'Bobina Cable Cat6A', warehouse: 'Almacén Central • Bahía B', quantity: 14, minimum: 5, status: 'healthy', category: 'Cableado' },
  { sku: 'PLC-S7-1200', name: 'Módulo PLC S7-1200', warehouse: 'Almacén Norte', quantity: 1, minimum: 4, status: 'reorder', category: 'Controladores' },
];

// Datos de Cases
interface CaseRow {
  id: string;
  title: string;
  agent: string;
  priority: 'Crítica' | 'Alta' | 'Media' | 'Baja';
  status: 'Revisión HITL' | 'Emitido' | 'Resuelto' | 'En Proceso';
  sla: string;
}

const CASES_DATA: CaseRow[] = [
  { id: 'CAS-2026-001', title: 'Reposición 50x Sensor ST-200', agent: 'Procurement Negotiator', priority: 'Crítica', status: 'Revisión HITL', sla: '12 min restantes' },
  { id: 'CAS-2026-002', title: 'Negociación Grainger vs TechCorp', agent: 'Procurement Negotiator', priority: 'Alta', status: 'Emitido', sla: 'SLA Cumplido' },
  { id: 'CAS-2026-003', title: 'Escaneo Preventivo 4 Almacenes', agent: 'Supply Chain Crisis', priority: 'Media', status: 'Resuelto', sla: 'Completado' },
  { id: 'CAS-2026-004', title: 'Auditoría Sobrecostos Logísticos', agent: 'Financial Maestro', priority: 'Alta', status: 'En Proceso', sla: '45 min' },
  { id: 'CAS-2026-005', title: 'Alerta Stock Crítico Microcontrolador X1', agent: 'Superpower Auto', priority: 'Crítica', status: 'Revisión HITL', sla: '28 min' },
];

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

const ORDERS_DATA: OrderRow[] = [
  { orderId: 'OC-2026-089', sku: 'ST-200', productName: 'Sensor Térmico ST-200 (50u)', provider: 'Grainger Industrial', amountMXN: '$22,500.00 MXN', humanApproved: false, status: 'Pendiente Firma' },
  { orderId: 'OC-2026-088', sku: 'FUS-10A', productName: 'Fusible Cerámico 10A (100u)', provider: 'ElectroGlobal', amountMXN: '$4,800.00 MXN', humanApproved: true, status: 'Emitida' },
  { orderId: 'OC-2026-087', sku: 'MCU-X1', productName: 'Microcontrolador X1 (20u)', provider: 'TechCorp MX', amountMXN: '$9,200.00 MXN', humanApproved: true, status: 'En Tránsito' },
  { orderId: 'OC-2026-086', sku: 'VALV-P2', productName: 'Válvula Neumática P2 (10u)', provider: 'FastShip Logistics', amountMXN: '$8,500.00 MXN', humanApproved: true, status: 'Entregada' },
  { orderId: 'OC-2026-085', sku: 'PWR-500', productName: 'Fuente de Poder 500W (5u)', provider: 'Grainger Industrial', amountMXN: '$14,200.00 MXN', humanApproved: true, status: 'Entregada' },
];

interface StockViewProps {
  onReplenish?: (sku: string) => void;
  onChatRequest?: () => void;
}

export const StockView = ({ onReplenish }: StockViewProps) => {
  const [selectedSchema, setSelectedSchema] = useState<SchemaTableId>('inventory');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [syncing, setSyncing] = useState(false);

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      toast.success('Esquemas Drizzle sincronizados con PostgreSQL (4ms)');
    }, 700);
  };

  // Filtrado reactivo de inventario
  const filteredInventory = useMemo(() => {
    return INVENTORY_DATA.filter((i) => {
      const match =
        i.sku.toLowerCase().includes(search.toLowerCase()) ||
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.warehouse.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || i.status === statusFilter;
      return match && matchStatus;
    });
  }, [search, statusFilter]);

  // Filtrado reactivo de casos
  const filteredCases = useMemo(() => {
    return CASES_DATA.filter((c) => {
      return (
        c.id.toLowerCase().includes(search.toLowerCase()) ||
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.agent.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [search]);

  // Filtrado reactivo de órdenes
  const filteredOrders = useMemo(() => {
    return ORDERS_DATA.filter((o) => {
      return (
        o.orderId.toLowerCase().includes(search.toLowerCase()) ||
        o.productName.toLowerCase().includes(search.toLowerCase()) ||
        o.provider.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [search]);

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
              Explorador de Esquemas (Base de Datos)
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1 pl-7.5">
            Aquí se visualizarán las tablas reales de inventario y agentes conectadas mediante Drizzle ORM.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-xs font-medium text-zinc-300 transition-all hover:bg-white/[0.08] hover:border-white/[0.14] hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-emerald-400 ${syncing ? 'animate-spin' : ''}`} />
            <span>Sincronizar ORM</span>
          </button>
        </div>
      </div>

      {/* ───────── 3 SCHEMA CARDS (NEUTRAS CON BORDE SUPERIOR FINO CUANDO ACTIVA) ───────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {SCHEMAS.map((schema) => {
          const isSelected = selectedSchema === schema.id;
          return (
            <div
              key={schema.id}
              onClick={() => {
                setSelectedSchema(schema.id);
                setSearch('');
              }}
              className={`cursor-pointer rounded-xl p-5 flex flex-col justify-between transition-all duration-150 border bg-[#0C0C0E] shadow-[0_4px_20px_rgba(0,0,0,0.4)] ${
                isSelected
                  ? 'border-white/[0.12] border-t-2 border-t-emerald-500 bg-white/[0.03]'
                  : 'border-white/[0.07] hover:border-white/[0.14] hover:bg-white/[0.02]'
              }`}
            >
              {/* Header de la tarjeta */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isSelected ? 'bg-emerald-400' : 'bg-zinc-600'
                    }`}
                  />
                  <span className="font-mono text-sm font-medium text-zinc-100">
                    {schema.name}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.07]">
                  {schema.rows} rows
                </span>
              </div>

              {/* Subtítulo de columnas */}
              <p className="font-mono text-[11px] text-zinc-400 mb-4 truncate">
                {schema.columnsSummary}
              </p>

              {/* Barra de progreso sutil y limpia */}
              <div className="space-y-1.5">
                <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isSelected ? 'bg-emerald-400' : 'bg-zinc-600'
                    }`}
                    style={{ width: `${schema.capacityPercent}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 pt-0.5">
                  <span>{schema.capacityLabel}</span>
                  <span className={isSelected ? 'text-zinc-300 font-medium' : 'text-zinc-500'}>
                    {isSelected ? 'Activa' : `${schema.capacityPercent}%`}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ───────── VISTA PREVIA (CONTENEDOR NEUTRO CON ALINEACIÓN NUMÉRICA Y GHOST BUTTONS) ───────── */}
      <div className="rounded-xl border border-white/[0.07] bg-[#0C0C0E] p-5 md:p-6 flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        {/* Barra superior de la tabla */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-1 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-medium font-headline text-zinc-200">
              Vista Previa: <span className="font-mono text-white font-semibold">{selectedSchema}</span>
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
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

            {/* Input Buscador */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrar registros..."
                className="rounded-lg border border-white/[0.08] bg-white/[0.02] pl-8 pr-3 py-1 text-xs text-zinc-200 placeholder:text-zinc-500 outline-none transition-all focus:border-white/[0.2] focus:bg-white/[0.04] w-48"
              />
            </div>

            {/* Botón Exportar */}
            <button
              onClick={exportCurrentTable}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/[0.14] px-3 py-1 text-xs text-zinc-300 hover:text-white transition-all"
            >
              <Download className="h-3 w-3" />
              <span>Exportar</span>
            </button>
          </div>
        </div>

        {/* ───────── TABLA DE DATOS CON GHOST BUTTONS Y ALINEACIÓN TABULAR ───────── */}
        <div className="overflow-x-auto custom-scrollbar">
          {selectedSchema === 'inventory' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] text-zinc-400 text-[11px] font-mono uppercase tracking-wider">
                  <th className="py-3 px-3.5 font-medium">SKU</th>
                  <th className="py-3 px-3.5 font-medium">Producto</th>
                  <th className="py-3 px-3.5 font-medium">Almacén</th>
                  <th className="py-3 px-3.5 font-medium text-right">Stock</th>
                  <th className="py-3 px-3.5 font-medium text-right">Mínimo</th>
                  <th className="py-3 px-3.5 font-medium">Estado</th>
                  <th className="py-3 px-3.5 font-medium text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-xs">
                {filteredInventory.map((item) => (
                  <tr key={item.sku} className="hover:bg-white/[0.02] transition-colors group">
                    {/* SKU neutro en font-mono gris */}
                    <td className="py-3 px-3.5 font-mono">
                      <span className="rounded bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 text-zinc-300 text-xs">
                        {item.sku}
                      </span>
                    </td>
                    <td className="py-3 px-3.5">
                      <p className="font-medium text-zinc-200">{item.name}</p>
                      <span className="text-[10px] text-zinc-500 font-mono">{item.category}</span>
                    </td>
                    <td className="py-3 px-3.5 text-zinc-400">{item.warehouse}</td>
                    {/* Stock numérico alineado a la derecha con tabular-nums */}
                    <td className="py-3 px-3.5 font-mono text-right tabular-nums">
                      <span className={`font-semibold ${item.quantity <= item.minimum ? 'text-amber-400' : 'text-zinc-200'}`}>
                        {item.quantity}
                      </span>
                    </td>
                    {/* Mínimo numérico alineado a la derecha con tabular-nums */}
                    <td className="py-3 px-3.5 font-mono text-right tabular-nums text-zinc-500">
                      {item.minimum}
                    </td>
                    {/* Estado con micro-punto LED semántico */}
                    <td className="py-3 px-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                          item.status === 'healthy'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : item.status === 'reorder'
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                            : 'bg-red-500/10 text-red-300 border-red-500/20'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            item.status === 'healthy'
                              ? 'bg-emerald-400'
                              : item.status === 'reorder'
                              ? 'bg-amber-400'
                              : 'bg-red-400'
                          }`}
                        />
                        <span>
                          {item.status === 'healthy'
                            ? 'Óptimo'
                            : item.status === 'reorder'
                            ? 'Bajo Stock'
                            : 'Agotado'}
                        </span>
                      </span>
                    </td>
                    {/* Acción: Botón Resolver en modo Ghost hasta hover de la fila */}
                    <td className="py-3 px-3.5 text-right">
                      {item.status !== 'healthy' ? (
                        <button
                          onClick={() => onReplenish?.(item.sku)}
                          className="inline-flex cursor-pointer items-center gap-1 text-xs text-zinc-400 hover:text-zinc-100 group-hover:bg-white/[0.06] group-hover:border group-hover:border-white/[0.1] group-hover:text-zinc-200 rounded-lg px-2.5 py-1 transition-all"
                        >
                          <span>Resolver</span>
                          <ArrowRight className="h-3 w-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                        </button>
                      ) : (
                        <span className="text-[11px] font-mono text-zinc-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {selectedSchema === 'cases' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] text-zinc-400 text-[11px] font-mono uppercase tracking-wider">
                  <th className="py-3 px-3.5 font-medium">ID</th>
                  <th className="py-3 px-3.5 font-medium">Caso Operativo</th>
                  <th className="py-3 px-3.5 font-medium">Agente Asignado</th>
                  <th className="py-3 px-3.5 font-medium">Prioridad</th>
                  <th className="py-3 px-3.5 font-medium">Estado</th>
                  <th className="py-3 px-3.5 font-medium text-right">SLA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-xs">
                {filteredCases.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3.5 font-mono">
                      <span className="rounded bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 text-zinc-300 text-xs">
                        {c.id}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 font-medium text-zinc-200">{c.title}</td>
                    <td className="py-3 px-3.5 text-zinc-400 flex items-center gap-1.5 mt-2">
                      <Sparkles className="h-3 w-3 text-emerald-400" />
                      <span>{c.agent}</span>
                    </td>
                    <td className="py-3 px-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                          c.priority === 'Crítica'
                            ? 'bg-red-500/10 text-red-300 border-red-500/20'
                            : c.priority === 'Alta'
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                            : 'bg-white/[0.04] text-zinc-300 border-white/[0.08]'
                        }`}
                      >
                        {c.priority}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-zinc-300 font-medium">{c.status}</td>
                    <td className="py-3 px-3.5 text-right font-mono text-zinc-500">{c.sla}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {selectedSchema === 'orders' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] text-zinc-400 text-[11px] font-mono uppercase tracking-wider">
                  <th className="py-3 px-3.5 font-medium">Orden ID</th>
                  <th className="py-3 px-3.5 font-medium">Ítem / SKU</th>
                  <th className="py-3 px-3.5 font-medium">Proveedor</th>
                  <th className="py-3 px-3.5 font-medium text-right">Monto</th>
                  <th className="py-3 px-3.5 font-medium">Guardrail HITL</th>
                  <th className="py-3 px-3.5 font-medium text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-xs">
                {filteredOrders.map((o) => (
                  <tr key={o.orderId} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3.5 font-mono">
                      <span className="rounded bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 text-zinc-300 text-xs">
                        {o.orderId}
                      </span>
                    </td>
                    <td className="py-3 px-3.5">
                      <p className="font-medium text-zinc-200">{o.productName}</p>
                      <span className="font-mono text-[10px] text-zinc-500">{o.sku}</span>
                    </td>
                    <td className="py-3 px-3.5 text-zinc-400">{o.provider}</td>
                    <td className="py-3 px-3.5 font-mono text-right tabular-nums text-zinc-100 font-semibold">{o.amountMXN}</td>
                    <td className="py-3 px-3.5">
                      {o.humanApproved ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Firma Válida</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-300 font-mono text-[11px]">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>Requiere Firma</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <span className="rounded-full bg-white/[0.04] border border-white/[0.08] px-2 py-0.5 font-mono text-[11px] text-zinc-300">
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ───────── FOOTER BANNER NEUTRO ───────── */}
      <div className="rounded-xl border border-white/[0.07] bg-[#0C0C0E] px-4.5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-zinc-200 font-medium">PostgreSQL Pool Activo</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.07]">
              Drizzle ORM v0.38
            </span>
            <span>3 esquemas conectados</span>
          </span>
        </div>
        <div className="font-mono text-[10px] text-zinc-500">
          schema.ts • Tabla activa: {selectedSchema}
        </div>
      </div>
    </div>
  );
};

export default StockView;
