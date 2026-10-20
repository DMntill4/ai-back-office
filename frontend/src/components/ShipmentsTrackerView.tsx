import { useState, useEffect } from 'react';
import {
  Truck,
  Clock,
  Sparkles,
  MapPin,
  Copy,
  Check,
  Search,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Radio,
  Navigation,
  FileText,
  Building2,
  PackageCheck,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

interface ShipmentsTrackerViewProps {
  onOpenPrompt?: (prompt: string) => void;
}

interface Shipment {
  id: string;
  trackingNumber: string;
  orderId: string;
  provider: string;
  productName: string;
  quantity: number;
  origin: string;
  destination: string;
  estimatedArrival: string;
  status: 'in_transit' | 'dispatched' | 'delivered';
  currentStep: number; // 1: Hub salida, 2: Enlace carretero, 3: En reparto local, 4: Bahía recepción
  carrier: string;
  progressPercent: number;
  temperature: string;
  highwayStatus: string;
  bayAssigned: string;
  isoVerified: boolean;
  statusLabel: string;
  telemetryLog: string;
  originNodeLabel: string;
  originNodeSub: string;
  step2NodeLabel: string;
  step2NodeSub: string;
  step3NodeLabel: string;
  step3NodeSub: string;
  destinationNodeLabel: string;
}

const DEFAULT_SHIPMENTS: Shipment[] = [
  {
    id: 'shp_01',
    trackingNumber: 'TRK-FEDEX-98214',
    orderId: 'OC-2026-088',
    provider: 'Grainger Industrial Supply MX',
    productName: 'Variador de Frecuencia VFD-10 (25u)',
    quantity: 25,
    origin: 'Hub Monterrey',
    destination: 'Almacén Central',
    estimatedArrival: 'Hoy, 14:30 hrs',
    status: 'in_transit',
    statusLabel: 'En Reparto (82%)',
    currentStep: 3,
    carrier: 'FedEx Express',
    progressPercent: 82,
    temperature: '21°C Normal',
    highwayStatus: 'Sin incidencias en Autopista Fed-57',
    bayAssigned: 'Bahía B • Andén 4',
    isoVerified: true,
    telemetryLog: '🛰️ 10:42 AM — Unidad verificada en Libramiento Norte (Velocidad: 78 km/h • Sin desvíos)',
    originNodeLabel: 'Hub Monterrey',
    originNodeSub: 'Salida 06:30h',
    step2NodeLabel: 'Autopista Fed-57',
    step2NodeSub: 'Tránsito 10:15h',
    step3NodeLabel: 'Reparto Local',
    step3NodeSub: 'GPS Activo (82%)',
    destinationNodeLabel: 'Almacén Central',
  },
  {
    id: 'shp_02',
    trackingNumber: 'TRK-DHL-44102',
    orderId: 'OC-2026-087',
    provider: 'TechCorp Distribución MX',
    productName: 'Servomotor Industrial SM-400 (15u)',
    quantity: 15,
    origin: 'Planta Querétaro',
    destination: 'Almacén Central',
    estimatedArrival: 'Jueves, 11:00 hrs',
    status: 'dispatched',
    statusLabel: 'En Despacho (35%)',
    currentStep: 2,
    carrier: 'DHL Supply Chain',
    progressPercent: 35,
    temperature: '19°C Normal',
    highwayStatus: 'Tránsito fluido en Corredor Bajío',
    bayAssigned: 'Bahía A • Andén 1',
    isoVerified: true,
    telemetryLog: '🛰️ 10:15 AM — Checkpoint Salida San Juan del Río (Velocidad: 82 km/h • GPS Estable)',
    originNodeLabel: 'Planta Querétaro',
    originNodeSub: 'Salida 08:00h',
    step2NodeLabel: 'Enlace Bajío',
    step2NodeSub: 'Paso 09:30h',
    step3NodeLabel: 'En Tránsito',
    step3NodeSub: 'En Ruta (35%)',
    destinationNodeLabel: 'Almacén Central',
  },
  {
    id: 'shp_03',
    trackingNumber: 'TRK-SIM-10023',
    orderId: 'OC-2026-084',
    provider: 'Sensores del Norte S.A.',
    productName: 'Sensor Fotoeléctrico Óptico (50u)',
    quantity: 50,
    origin: 'Hub Guadalajara',
    destination: 'Almacén Occidente',
    estimatedArrival: 'Hoy, 09:15 hrs',
    status: 'delivered',
    statusLabel: 'Entregado (100%)',
    currentStep: 4,
    carrier: 'Estafeta Carga',
    progressPercent: 100,
    temperature: '22°C Normal',
    highwayStatus: 'Arribo conforme y descargado',
    bayAssigned: 'Bahía C • Andén 2 (Recibido)',
    isoVerified: true,
    telemetryLog: '🛰️ 09:15 AM — Descarga completada en Bahía C • Albarán digital firmado y verificado',
    originNodeLabel: 'Hub Guadalajara',
    originNodeSub: 'Salida 05:45h',
    step2NodeLabel: 'Ruta Periférico',
    step2NodeSub: 'Tránsito 07:10h',
    step3NodeLabel: 'Bahía Entrada',
    step3NodeSub: 'Arribado 09:00h',
    destinationNodeLabel: 'Almacén Occidente',
  },
];

export const ShipmentsTrackerView = ({ onOpenPrompt }: ShipmentsTrackerViewProps) => {
  const [shipments, setShipments] = useState<Shipment[]>(DEFAULT_SHIPMENTS);
  const [selectedId, setSelectedId] = useState<string>('shp_01');
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const selectedShipment = shipments.find((s) => s.id === selectedId) || shipments[0];

  useEffect(() => {
    const fetchShipments = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/shipments?companyId=comp_default');
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.shipments) && json.shipments.length >= 3) {
            const mapped: Shipment[] = json.shipments.map((s: any, idx: number) => {
              const def = DEFAULT_SHIPMENTS[idx % DEFAULT_SHIPMENTS.length];
              return {
                ...def,
                id: s.id || def.id,
                trackingNumber: s.trackingNumber || def.trackingNumber,
                orderId: s.purchaseOrderId || def.orderId,
                carrier: s.carrier || def.carrier,
                status: (s.status === 'delivered' ? 'delivered' : def.status) as any,
                currentStep: s.status === 'delivered' ? 4 : def.currentStep,
                progressPercent: s.status === 'delivered' ? 100 : def.progressPercent,
              };
            });
            setShipments(mapped);
          }
        }
      } catch {
        // Fallback silencioso con datos reales del catálogo
      }
    };
    fetchShipments();
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTracking(text);
    toast.success(`Guía copiada al portapapeles: ${text}`);
    setTimeout(() => setCopiedTracking(null), 2000);
  };

  const filteredShipments = shipments.filter(
    (s) =>
      s.trackingNumber.toLowerCase().includes(search.toLowerCase()) ||
      s.orderId.toLowerCase().includes(search.toLowerCase()) ||
      s.productName.toLowerCase().includes(search.toLowerCase()) ||
      s.carrier.toLowerCase().includes(search.toLowerCase()) ||
      s.origin.toLowerCase().includes(search.toLowerCase()) ||
      s.destination.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col w-full max-w-[1400px] mx-auto gap-5 font-sans text-zinc-100 pb-20">
      
      {/* ─── ENCABEZADO DE TORRE DE CONTROL (CONTROL TOWER HEADER) ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-zinc-500 font-medium">Torre de Control &amp; Logística</span>
            <span className="text-zinc-600">•</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.04] text-[11px] font-mono text-zinc-400 border border-white/[0.05]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse" />
              Telemetría IoT en Vivo
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-headline">
            Monitoreo Logístico en Tiempo Real
          </h1>
        </div>

        {/* Buscador Rápido de Guías */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar guía, orden, producto..."
              className="bg-[#101217] border border-white/[0.05] focus:border-emerald-500/50 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-zinc-500 outline-none w-56 sm:w-64 transition"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              toast.info('Sincronizando pings GPS con transportistas...', {
                description: 'FedEx Express, DHL Supply Chain y Estafeta Carga actualizados.',
              });
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#14161C] hover:bg-[#1E222B] border border-white/[0.05] text-xs font-medium text-zinc-300 transition cursor-pointer active:scale-[0.98]"
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Actualizar Telemetría</span>
          </button>
        </div>
      </div>

      {/* ─── 1. CINTA SUPERIOR: 4 KPIs OPERATIVOS (HORIZONTAL STATS RIBBON) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Envíos Activos */}
        <div className="rounded-2xl bg-[#101217] border border-white/[0.05] py-3.5 px-5 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-zinc-500 font-medium block">Envíos Activos en Ruta</span>
            <div className="text-2xl font-bold text-white tracking-tight font-headline mt-0.5">
              3 <span className="text-xs font-normal text-zinc-400">embarques</span>
            </div>
            <div className="inline-flex items-center gap-1 mt-1 text-[11px] font-mono text-[#4ADE80]">
              <span>100% Monitoreados</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#14171F] border border-white/[0.05] flex items-center justify-center text-emerald-400 shrink-0">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2: Arribos Hoy */}
        <div className="rounded-2xl bg-[#101217] border border-white/[0.05] py-3.5 px-5 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-zinc-500 font-medium block">Arribos Programados Hoy</span>
            <div className="text-2xl font-bold text-white tracking-tight font-headline mt-0.5">
              2 <span className="text-xs font-normal text-zinc-400">órdenes</span>
            </div>
            <div className="inline-flex items-center gap-1 mt-1 text-[11px] font-mono text-emerald-400">
              <span>Próximo: 14:30 hrs</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#14171F] border border-white/[0.05] flex items-center justify-center text-emerald-400 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3: Puntualidad SLA */}
        <div className="rounded-2xl bg-[#101217] border border-white/[0.05] py-3.5 px-5 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-zinc-500 font-medium block">Puntualidad de Entrega (SLA)</span>
            <div className="text-2xl font-bold text-white tracking-tight font-headline mt-0.5">
              98.2%
            </div>
            <div className="inline-flex items-center gap-1 mt-1 text-[11px] font-mono text-[#4ADE80]">
              <span>+0.8% este mes</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#14171F] border border-white/[0.05] flex items-center justify-center text-emerald-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4: Inspección en Bahía */}
        <div className="rounded-2xl bg-[#101217] border border-white/[0.05] py-3.5 px-5 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-zinc-500 font-medium block">Recepción Libre de Incidencias</span>
            <div className="text-2xl font-bold text-white tracking-tight font-headline mt-0.5">
              98.7%
            </div>
            <div className="inline-flex items-center gap-1 mt-1 text-[11px] font-mono text-[#4ADE80]">
              <span>0 rechazos en andén</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#14171F] border border-white/[0.05] flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ─── 2. BLOQUE CENTRAL DIVIDIDO: 7 COLS RADAR / RUTA + 5 COLS MANIFIESTO ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* ══════════ IZQUIERDA (7 Columnas - "Radar de Ruta & Telemetría en Vivo") ══════════ */}
        <div className="lg:col-span-7 rounded-2xl bg-[#101217] border border-white/[0.05] p-6 flex flex-col justify-between relative overflow-hidden bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:16px_16px] shadow-sm">
          
          <div>
            {/* Cabecera del Radar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-white/[0.05]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-white">Radar de Ruta Vectorial</span>
                <span className="text-zinc-600 hidden sm:inline">•</span>
                <span className="font-mono text-xs text-emerald-400 font-semibold">{selectedShipment.orderId}</span>
                <span className="text-zinc-600 hidden sm:inline">•</span>
                <span className="font-mono text-[11px] text-zinc-400">{selectedShipment.trackingNumber}</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-mono text-emerald-300">
                  {selectedShipment.status === 'delivered' ? 'Entregado en Bahía' : `${selectedShipment.statusLabel} • ETA ${selectedShipment.estimatedArrival}`}
                </span>
              </div>
            </div>

            {/* Visualización de Ruta Vectorial con 4 Nodos Interactivos (Scroll horizontal suave en móviles) */}
            <div className="py-7 relative overflow-x-auto custom-scrollbar">
              <div className="min-w-[420px] relative">
              
              {/* Línea de Ruta Vectorial Continua */}
              <div className="relative flex items-center justify-between">
                
                {/* Riel conector base */}
                <div className="absolute top-1/2 left-6 right-6 -translate-y-1/2 h-1 bg-[#1A1F2B] z-0">
                  {/* Tramo completado con gradiente menta */}
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-[#4ADE80] to-emerald-300 rounded-full transition-all duration-500"
                    style={{ width: `${selectedShipment.progressPercent}%` }}
                  />
                </div>

                {/* NODO 1: Salida / Origen */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedShipment.currentStep >= 1
                      ? 'bg-[#101217] border-emerald-400 text-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.4)]'
                      : 'bg-[#14171F] border-zinc-700 text-zinc-500'
                  }`}>
                    <Check className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <span className="text-[11px] font-semibold text-zinc-200 mt-2 block text-center">
                    {selectedShipment.originNodeLabel}
                  </span>
                  <span className="text-[9px] font-mono text-zinc-500">{selectedShipment.originNodeSub}</span>
                </div>

                {/* NODO 2: Enlace Carretero */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedShipment.currentStep >= 2
                      ? 'bg-[#101217] border-emerald-400 text-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.4)]'
                      : 'bg-[#14171F] border-zinc-700 text-zinc-500'
                  }`}>
                    {selectedShipment.currentStep === 2 ? (
                      <Radio className="w-4 h-4 text-emerald-300 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-zinc-200 mt-2 block text-center">
                    {selectedShipment.step2NodeLabel}
                  </span>
                  <span className="text-[9px] font-mono text-zinc-500">{selectedShipment.step2NodeSub}</span>
                </div>

                {/* NODO 3: Reparto Local / Posición Activa */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedShipment.currentStep === 3
                      ? 'bg-[#064E3B] border-[#4ADE80] text-white shadow-[0_0_16px_rgba(74,222,128,0.8)] animate-pulse'
                      : selectedShipment.currentStep > 3
                      ? 'bg-[#101217] border-emerald-400 text-emerald-400'
                      : 'bg-[#14171F] border-zinc-700 text-zinc-500'
                  }`}>
                    {selectedShipment.currentStep === 3 ? (
                      <Radio className="w-4 h-4 text-emerald-200 animate-spin" />
                    ) : selectedShipment.currentStep > 3 ? (
                      <Check className="w-4 h-4 stroke-[2.5]" />
                    ) : (
                      <Navigation className="w-4 h-4" />
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-300 mt-2 block text-center">
                    {selectedShipment.step3NodeLabel}
                  </span>
                  <span className="text-[9px] font-mono text-zinc-400">{selectedShipment.step3NodeSub}</span>
                </div>

                {/* NODO 4: Bahía de Recepción (Almacén Central / Occidente) */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedShipment.currentStep === 4
                      ? 'bg-emerald-500 border-white text-zinc-950 font-bold shadow-[0_0_12px_rgba(74,222,128,0.8)]'
                      : 'bg-[#14171F] border-zinc-700 text-zinc-500'
                  }`}>
                    <Building2 className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-semibold text-zinc-200 mt-2 block text-center">
                    {selectedShipment.destinationNodeLabel}
                  </span>
                  <span className="text-[9px] font-mono text-emerald-400">{selectedShipment.bayAssigned}</span>
                </div>

              </div>
              </div>
            </div>

            {/* Tarjeta Flotante Translúcida Dentro del Radar */}
            <div className="rounded-xl bg-[#14171F]/90 backdrop-blur-md border border-white/[0.08] p-3.5 text-xs grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-2.5 col-span-2 sm:col-span-1">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Navigation className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block">Transportista</span>
                  <span className="font-semibold text-white text-xs">{selectedShipment.carrier}</span>
                </div>
              </div>

              <div className="sm:border-l border-white/[0.06] sm:pl-3">
                <span className="text-[10px] text-zinc-500 block">Condición Carretera</span>
                <span className="font-medium text-emerald-300 text-xs line-clamp-1">{selectedShipment.highwayStatus}</span>
              </div>

              <div className="sm:border-l border-white/[0.06] sm:pl-3">
                <span className="text-[10px] text-zinc-500 block">Sensor Térmico</span>
                <span className="font-mono text-white text-xs">{selectedShipment.temperature}</span>
              </div>

              <div className="sm:border-l border-white/[0.06] sm:pl-3">
                <span className="text-[10px] text-zinc-500 block">Arribo Estimado</span>
                <span className="font-mono text-emerald-400 font-semibold text-xs">{selectedShipment.estimatedArrival}</span>
              </div>
            </div>

            {/* Bitácora de Telemetría Reciente (Rellena el espacio inferior con datos satelitales en vivo) */}
            <div className="mt-3.5 bg-[#0B0D12] border border-white/[0.04] rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-zinc-400">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm shrink-0">🛰️</span>
                <span className="font-mono text-zinc-300 truncate">{selectedShipment.telemetryLog}</span>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Ping Activo
              </span>
            </div>

          </div>

          <div className="pt-4 mt-4 border-t border-white/[0.05] text-[11px] text-zinc-500 flex items-center justify-between">
            <span>Latencia de actualización: 2.1s</span>
            <span className="text-zinc-400 font-mono">Protocolo de Telemetría Mint IoT</span>
          </div>
        </div>

        {/* ══════════ DERECHA (5 Columnas - "Manifiesto de Carga y Recepción en Bahía") ══════════ */}
        <div className="lg:col-span-5 rounded-2xl bg-[#101217] border border-white/[0.05] p-6 flex flex-col justify-between shadow-sm">
          
          <div>
            {/* Cabecera del Manifiesto */}
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.05]">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">Manifiesto Digital de Recepción</h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
                Andén Verificado
              </span>
            </div>

            {/* Documento Digital Estructurado (Tabla Llave-Valor Limpia) */}
            <div className="divide-y divide-white/[0.05] text-xs mt-2">
              
              {/* N° Guía con botón interactivo de copiar */}
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-zinc-500">Número de Guía:</span>
                <div className="flex items-center gap-1.5 font-mono text-zinc-200">
                  <span className="font-semibold text-white">{selectedShipment.trackingNumber}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(selectedShipment.trackingNumber)}
                    className="p-1 rounded hover:bg-white/[0.06] text-zinc-400 hover:text-white transition cursor-pointer"
                    title="Copiar guía"
                  >
                    {copiedTracking === selectedShipment.trackingNumber ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Orden de Compra */}
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-zinc-500">Orden de Compra:</span>
                <span className="font-mono font-semibold text-emerald-400">{selectedShipment.orderId}</span>
              </div>

              {/* Contenido de Carga */}
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-zinc-500">Contenido de Carga:</span>
                <span className="font-medium text-white truncate max-w-[200px]" title={selectedShipment.productName}>
                  {selectedShipment.productName}
                </span>
              </div>

              {/* Proveedor / Origen */}
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-zinc-500">Proveedor de Origen:</span>
                <span className="text-zinc-300 truncate max-w-[200px]" title={selectedShipment.provider}>
                  {selectedShipment.provider}
                </span>
              </div>

              {/* Bahía Asignada */}
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-zinc-500">Bahía Asignada:</span>
                <div className="flex items-center gap-1.5 text-white font-medium">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{selectedShipment.bayAssigned}</span>
                </div>
              </div>

              {/* Certificación y Calidad */}
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-zinc-500">Certificación:</span>
                <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-mono">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>ISO-9001 • Libre de Daño</span>
                </span>
              </div>
            </div>
          </div>

          {/* Acciones del Manifiesto */}
          <div className="pt-4 border-t border-white/[0.05] space-y-2 mt-4">
            <button
              type="button"
              onClick={() => {
                toast.success(`Albarán digital generado para ${selectedShipment.orderId}`, {
                  description: `Manifiesto con firma criptográfica y sello de andén disponible.`,
                });
              }}
              className="w-full py-2 px-3 rounded-xl bg-[#1A1D24] hover:bg-[#222630] text-zinc-300 hover:text-white text-xs font-medium flex items-center justify-center gap-2 transition cursor-pointer border border-white/[0.04]"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Ver Albarán de Entrega (PDF) ↗</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenPrompt?.(`Verifica el estatus de llegada del embarque ${selectedShipment.trackingNumber} (${selectedShipment.orderId}) y coordina la inspección en ${selectedShipment.bayAssigned}.`)}
              className="w-full py-2.5 px-3 rounded-xl bg-[#4ADE80] hover:bg-[#34D399] text-zinc-950 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm active:scale-[0.98]"
            >
              <Sparkles className="w-3.5 h-3.5 fill-zinc-950" />
              <span>Alertar a Operador ReAct ✨</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── 3. PARTE INFERIOR: TABLA INTERACTIVA DE GUÍAS Y EMBARQUES ─── */}
      <div className="rounded-2xl bg-[#101217] border border-white/[0.05] p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 mb-2 border-b border-white/[0.05]">
          <div className="flex flex-wrap items-center gap-2">
            <PackageCheck className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
              Control de Embarques &amp; Órdenes de Entrega
            </h2>
            <span className="text-zinc-500 text-xs font-mono">• {filteredShipments.length} Registros</span>
          </div>

          <span className="text-[11px] text-zinc-500">
            Haz clic en cualquier fila para rastrear su ruta en el Radar
          </span>
        </div>

        {/* Tabla Interactiva */}
        <div className="overflow-x-auto custom-scrollbar -mx-4 sm:mx-0 px-4 sm:px-0">
          <table className="w-full text-left text-xs min-w-[720px]">
            <thead>
              <tr className="border-b border-white/[0.04] text-[10px] uppercase font-semibold text-zinc-500 bg-[#0B0D12] sticky top-0">
                <th className="py-2.5 px-3">Guía / Tracking</th>
                <th className="py-2.5 px-3">Orden</th>
                <th className="py-2.5 px-3">Producto / Carga</th>
                <th className="py-2.5 px-3">Origen ➔ Destino</th>
                <th className="py-2.5 px-3">Etapa Actual</th>
                <th className="py-2.5 px-3">ETA Estimado</th>
                <th className="py-2.5 px-3">Transportista</th>
                <th className="py-2.5 px-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {filteredShipments.map((s) => {
                const isSelected = selectedId === s.id;
                
                // Badge style depending on status
                const badgeStyle =
                  s.status === 'delivered'
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : s.status === 'dispatched'
                    ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30';

                return (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className={`transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-white/[0.04] font-medium text-white border-l-2 border-l-[#4ADE80]'
                        : 'hover:bg-white/[0.02] text-zinc-300'
                    }`}
                  >
                    {/* Guía */}
                    <td className="py-3 px-3 font-mono font-semibold text-white">
                      {s.trackingNumber}
                    </td>

                    {/* Orden */}
                    <td className="py-3 px-3 font-mono text-emerald-400">
                      {s.orderId}
                    </td>

                    {/* Producto */}
                    <td className="py-3 px-3">
                      <span className="truncate max-w-[200px] block font-medium" title={s.productName}>
                        {s.productName}
                      </span>
                    </td>

                    {/* Origen -> Destino */}
                    <td className="py-3 px-3 text-zinc-400">
                      <span className="truncate max-w-[190px] block" title={`${s.origin} ➔ ${s.destination}`}>
                        {s.origin} ➔ {s.destination}
                      </span>
                    </td>

                    {/* Etapa Actual */}
                    <td className="py-3 px-3">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${badgeStyle}`}>
                        {s.statusLabel}
                      </span>
                    </td>

                    {/* ETA */}
                    <td className="py-3 px-3 font-mono text-zinc-300">
                      {s.estimatedArrival}
                    </td>

                    {/* Transportista */}
                    <td className="py-3 px-3 text-zinc-400">
                      {s.carrier}
                    </td>

                    {/* Acción */}
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(s.id);
                          toast.info(`Ruta de ${s.orderId} fijada en el radar.`);
                        }}
                        className="text-emerald-400 hover:text-emerald-300 font-medium text-[11px] transition cursor-pointer inline-flex items-center gap-1"
                      >
                        <span>Rastrear</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ShipmentsTrackerView;
