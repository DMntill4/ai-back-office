import { useState, useEffect } from 'react';
import {
  Truck,
  TrendingUp,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Package,
} from 'lucide-react';
import { api } from '../lib/api';

interface LogisticsViewProps {
  onOpenPrompt?: (prompt: string) => void;
  currency?: string;
}

interface ShipmentItem {
  id: string;
  trackingNumber: string;
  carrier: string;
  status: string;
  estimatedDelivery: string;
  originLocation: string;
  currentLocation: string;
  destinationLocation: string;
  notes: string;
}

interface ForecastItem {
  sku: string;
  name: string;
  category: string;
  currentStock: number;
  minStock: number;
  projectedDemand30d: number;
  weeksOfCover: number;
  suggestedReorder: number;
  recommendedSupplier: string;
  risk: 'alto' | 'medio' | 'saludable';
}

export function LogisticsView({ onOpenPrompt }: LogisticsViewProps) {
  const [activeTab, setActiveTab] = useState<'shipments' | 'demand'>('shipments');
  const [search, setSearch] = useState('');
  const [shipments, setShipments] = useState<ShipmentItem[]>([]);
  const [forecasts, setForecasts] = useState<ForecastItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Paginación (Máximo 10 elementos por sección)
  const [shipmentsPage, setShipmentsPage] = useState(1);
  const [demandPage, setDemandPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const fetchLogisticsData = async () => {
    setLoading(true);
    try {
      const [shipRes, prodsRes] = await Promise.all([
        api.getShipments('comp_default'),
        api.getProducts('comp_default'),
      ]);

      if (shipRes.success && Array.isArray(shipRes.shipments)) {
        setShipments(
          shipRes.shipments.map((s: any) => ({
            id: s.id || s.trackingNumber,
            trackingNumber: s.trackingNumber || 'TRK-LOG',
            carrier: s.carrier || 'Transportista Certificado',
            status: s.status || 'en_transito',
            estimatedDelivery: s.estimatedDelivery
              ? new Date(s.estimatedDelivery).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
              : 'Próximas 48h',
            originLocation: s.originLocation || 'Hub Origen',
            currentLocation: s.currentLocation || 'En ruta',
            destinationLocation: s.destinationLocation || 'Almacén Central',
            notes: s.notes || 'Envío de reposición registrado en base de datos',
          }))
        );
      } else {
        setShipments([]);
      }

      if (prodsRes.success && Array.isArray(prodsRes.data)) {
        const mapped: ForecastItem[] = prodsRes.data.map((p) => {
          const dailyCons = Math.max(1, Math.round((p.minStock || 10) / 14));
          const projectedDemand30d = dailyCons * 30;
          const weeksOfCover = parseFloat(((p.stock || 0) / (dailyCons * 7)).toFixed(1));
          const suggestedReorder =
            p.stock < p.minStock ? Math.max(10, p.minStock * 2 - p.stock) : 0;
          const risk: 'alto' | 'medio' | 'saludable' =
            p.stock === 0 || p.stock < p.minStock ? 'alto' : weeksOfCover < 2 ? 'medio' : 'saludable';

          return {
            sku: p.sku,
            name: p.name,
            category: p.category || 'General',
            currentStock: p.stock,
            minStock: p.minStock,
            projectedDemand30d,
            weeksOfCover,
            suggestedReorder,
            recommendedSupplier: 'Proveedor Homologado',
            risk,
          };
        });
        setForecasts(mapped);
      } else {
        setForecasts([]);
      }
    } catch {
      // Fallback silencioso sin alertas intrusivas
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogisticsData();
  }, []);

  const filteredShipments = shipments.filter(
    (s) =>
      s.trackingNumber.toLowerCase().includes(search.toLowerCase()) ||
      s.carrier.toLowerCase().includes(search.toLowerCase()) ||
      s.destinationLocation.toLowerCase().includes(search.toLowerCase())
  );

  const filteredForecasts = forecasts.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.sku.toLowerCase().includes(search.toLowerCase()) ||
      f.category.toLowerCase().includes(search.toLowerCase())
  );

  // Cálculos de Paginación para Envíos
  const totalShipmentsPages = Math.ceil(filteredShipments.length / ITEMS_PER_PAGE) || 1;
  const paginatedShipments = filteredShipments.slice(
    (shipmentsPage - 1) * ITEMS_PER_PAGE,
    shipmentsPage * ITEMS_PER_PAGE
  );

  // Cálculos de Paginación para Pronóstico
  const totalDemandPages = Math.ceil(filteredForecasts.length / ITEMS_PER_PAGE) || 1;
  const paginatedForecasts = filteredForecasts.slice(
    (demandPage - 1) * ITEMS_PER_PAGE,
    demandPage * ITEMS_PER_PAGE
  );

  return (
    <div className="flex flex-col w-full max-w-[1360px] mx-auto gap-6 font-sans text-zinc-100 pb-16">
      {/* Encabezado con selector de vista */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-zinc-400 font-medium">Cadena de Suministro &amp; Operaciones</span>
            <span className="text-zinc-600">•</span>
            <span className="text-xs text-emerald-400 font-mono">Base de Datos PostgreSQL</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-headline text-white tracking-tight">
            Logística &amp; Suministro
          </h1>
        </div>

        {/* Píldoras de Navegación de Subpestaña */}
        <div className="flex items-center gap-2 bg-[#12141A] p-1 rounded-xl border border-white/[0.06] text-xs">
          <button
            type="button"
            onClick={() => {
              setActiveTab('shipments');
              setShipmentsPage(1);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              activeTab === 'shipments'
                ? 'bg-[#1C2029] text-white shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Envíos en Tránsito ({shipments.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('demand');
              setDemandPage(1);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              activeTab === 'demand'
                ? 'bg-[#1C2029] text-white shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
            <span>Pronóstico de Demanda ({forecasts.length})</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtro y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShipmentsPage(1);
              setDemandPage(1);
            }}
            placeholder={activeTab === 'shipments' ? 'Buscar por guía, transportista o destino…' : 'Buscar producto o SKU…'}
            className="w-full pl-9 pr-3 py-1.5 bg-[#101217] border border-white/[0.06] rounded-xl text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        <button
          type="button"
          onClick={fetchLogisticsData}
          disabled={loading}
          className="self-end sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-xs text-zinc-300 transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-zinc-400 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* VISTA 1: ENVÍOS EN TRÁNSITO */}
      {activeTab === 'shipments' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs text-zinc-400 font-mono">
              Mostrando {paginatedShipments.length} de {filteredShipments.length} envíos
            </span>

            {totalShipmentsPages > 1 && (
              <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-1.5 py-0.5">
                <button
                  type="button"
                  onClick={() => setShipmentsPage((p) => Math.max(1, p - 1))}
                  disabled={shipmentsPage === 1}
                  title="Página anterior"
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono text-zinc-300 px-1">
                  {shipmentsPage} / {totalShipmentsPages}
                </span>
                <button
                  type="button"
                  onClick={() => setShipmentsPage((p) => Math.min(totalShipmentsPages, p + 1))}
                  disabled={shipmentsPage === totalShipmentsPages}
                  title="Página siguiente"
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {paginatedShipments.map((s) => {
            const isDelivered = s.status === 'entregado';
            const isInTransit = s.status === 'en_transito';

            return (
              <div
                key={s.id}
                className="rounded-2xl border border-white/[0.05] bg-[#101217] p-4 sm:p-5 hover:border-white/[0.1] transition-all shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.05]">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                      {s.trackingNumber}
                    </span>
                    <span className="text-xs text-zinc-400 font-medium">{s.carrier}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                        isInTransit
                          ? 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                          : isDelivered
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                      }`}
                    >
                      {isInTransit ? 'En Tránsito' : isDelivered ? 'Entregado' : 'En Preparación'}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onOpenPrompt?.(
                          `Rastrea el envío con guía ${s.trackingNumber} (${s.carrier}) con destino a ${s.destinationLocation}.`
                        )
                      }
                      className="text-xs text-zinc-400 hover:text-white transition flex items-center gap-1 cursor-pointer"
                    >
                      <span>Auditar con Bot</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Ruta y Detalles */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3.5 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Ruta de Envío</span>
                    <p className="text-zinc-200 mt-0.5 font-medium">
                      {s.originLocation} → <span className="text-white font-semibold">{s.destinationLocation}</span>
                    </p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Ubicación actual: {s.currentLocation}</p>
                  </div>

                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Entrega Estimada</span>
                    <div className="flex items-center gap-1.5 mt-0.5 text-zinc-200 font-medium">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{s.estimatedDelivery}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Detalles &amp; Contenido</span>
                    <p className="text-zinc-300 mt-0.5 truncate">{s.notes}</p>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredShipments.length === 0 && (
            <div className="rounded-2xl border border-white/[0.05] bg-[#101217] p-10 text-center text-zinc-400 text-xs">
              <Package className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-zinc-300 font-medium">Sin envíos registrados en tránsito</p>
              <p className="text-zinc-500 text-[11px] mt-1">
                Las órdenes de reposición emitidas generarán guías de rastreo que aparecerán aquí automáticamente.
              </p>
            </div>
          )}
        </div>
      )}

      {/* VISTA 2: PRONÓSTICO PREDICTIVO DE DEMANDA */}
      {activeTab === 'demand' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/[0.05] bg-[#101217] p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-white/[0.05] gap-2">
              <div>
                <h3 className="text-sm font-semibold text-white font-headline">
                  Demanda Proyectada &amp; Riesgo de Ruptura (30 Días)
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Cálculo automático de consumo proyectado versus stock disponible en base de datos.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                  {filteredForecasts.length} productos
                </span>

                {totalDemandPages > 1 && (
                  <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-1.5 py-0.5">
                    <button
                      type="button"
                      onClick={() => setDemandPage((p) => Math.max(1, p - 1))}
                      disabled={demandPage === 1}
                      title="Página anterior"
                      className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] font-mono text-zinc-300 px-1">
                      {demandPage} / {totalDemandPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDemandPage((p) => Math.min(totalDemandPages, p + 1))}
                      disabled={demandPage === totalDemandPages}
                      title="Página siguiente"
                      className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="divide-y divide-white/[0.04]">
              {paginatedForecasts.map((f) => {
                const isCritical = f.risk === 'alto';
                return (
                  <div key={f.sku} className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-zinc-400 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">
                          {f.sku}
                        </span>
                        <span className="text-sm font-medium text-white truncate">{f.name}</span>
                        <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">• {f.category}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 mt-1">
                        <span>Stock: <strong className="text-zinc-200 font-semibold">{f.currentStock}u</strong> (mín {f.minStock}u)</span>
                        <span>Demanda 30d: <strong className="text-zinc-200">{f.projectedDemand30d}u</strong></span>
                        <span>
                          Cobertura:{' '}
                          <strong className={isCritical ? 'text-amber-400 font-semibold' : 'text-emerald-400'}>
                            {f.weeksOfCover} semanas
                          </strong>
                        </span>
                        <span className="text-zinc-500 hidden lg:inline">Proveedor: {f.recommendedSupplier}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      {f.suggestedReorder > 0 ? (
                        <button
                          type="button"
                          onClick={() =>
                            onOpenPrompt?.(
                              `Genera cotización de reposición de ${f.suggestedReorder} unidades para ${f.name} (${f.sku}) con ${f.recommendedSupplier} bajo el umbral de gobernanza.`
                            )
                          }
                          className="px-3 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer active:scale-[0.98]"
                        >
                          <span>Reponer {f.suggestedReorder}u</span>
                          <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-emerald-400 font-mono px-2 py-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Stock Óptimo</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredForecasts.length === 0 && (
                <div className="py-10 text-center text-xs text-zinc-500">
                  Sin productos registrados en la base de datos para calcular pronóstico.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
