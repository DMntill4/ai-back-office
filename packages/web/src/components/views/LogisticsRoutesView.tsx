import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Truck,
  Navigation,
  MapPin,
  Clock,
  Fuel,
  ShieldCheck,
  AlertTriangle,
  Layers,
  Sparkles,
  CheckCircle2,
  Radio,
  PhoneCall,
  Search,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Plus,
  Minus,
  Map as MapIcon,
  Globe,
  Package,
  Compass,
  ArrowUpRight,
  Check,
} from "lucide-react";

interface Milestone {
  label: string;
  location: string;
  time: string;
  status: "completed" | "current" | "pending";
}

interface ShipmentRoute {
  id: string;
  shipmentCode: string;
  orderId: string;
  orderDate: string;
  origin: string;
  originAddress: string;
  originCode: string;
  destination: string;
  destinationAddress: string;
  destinationCode: string;
  driver: string;
  phone: string;
  carrier: string;
  vehiclePlate: string;
  vehicleType: string;
  speedKmh: number;
  distanceKm: number;
  eta: string;
  costPerKmCop: number;
  totalFreightCop: number;
  savingsVsIndividualCop: number;
  payloadKg: number;
  capacityKg: number;
  volumePct: number;
  ordersCount: number;
  status: "en_transito" | "completado" | "programado";
  departureTime: string;
  progressPct: number;
  riskAlert?: {
    type: "clima" | "bloqueo" | "mantenimiento";
    title: string;
    description: string;
    severity: "alta" | "media";
    isRerouted?: boolean;
    alternateRouteName?: string;
  };
  milestones: Milestone[];
  timelineEvents: {
    title: string;
    time: string;
    description: string;
    location: string;
    completed: boolean;
  }[];
  curvePath: string;
  reroutedCurvePath?: string;
  vehicleCoord: { x: number; y: number };
}

const INITIAL_SHIPMENTS: ShipmentRoute[] = [
  {
    id: "ship_01",
    shipmentCode: "SHP-2026-904",
    orderId: "ORD-904BGA",
    orderDate: "29 Oct 2026",
    origin: "Bodega Matriz Bucaramanga",
    originAddress: "Zona Industrial Chimitá Km 4, Bucaramanga",
    originCode: "BGA",
    destination: "Centro de Distribución Bogotá D.C.",
    destinationAddress: "Fontibón Parque Industrial Muelle 12, Bogotá",
    destinationCode: "BOG",
    driver: "Jairo Pinzón",
    phone: "+57 312 849 2011",
    carrier: "Flota Propia Mint · Hino 5T",
    vehiclePlate: "WFL-892",
    vehicleType: "Camión Hino 5T",
    speedKmh: 68,
    distanceKm: 398,
    eta: "3h 42m restantes (14:15 p. m.)",
    costPerKmCop: 3850,
    totalFreightCop: 1532300,
    savingsVsIndividualCop: 840000,
    payloadKg: 3450,
    capacityKg: 5000,
    volumePct: 82,
    ordersCount: 14,
    status: "en_transito",
    departureTime: "Hoy, 06:30 a. m.",
    progressPct: 54,
    riskAlert: {
      type: "clima",
      title: "Lluvia torrencial en Pescadero / Cañón del Chicamocha",
      description:
        "Reducción de velocidad a 24 km/h en km 42 por pavimento húmedo. Retraso proyectado de +38 min sobre la hora estimada de entrega.",
      severity: "alta",
    },
    curvePath: "M 520 110 C 490 200, 440 310, 390 440",
    reroutedCurvePath: "M 520 110 C 450 180, 370 300, 390 440",
    vehicleCoord: { x: 455, y: 250 },
    milestones: [
      {
        label: "Origen",
        location: "Bodega Matriz Bucaramanga",
        time: "06:30 a. m.",
        status: "completed",
      },
      {
        label: "Despacho",
        location: "Peaje Curití / Muelle 4",
        time: "07:45 a. m.",
        status: "completed",
      },
      {
        label: "En Tránsito",
        location: "Pescadero • Chicamocha km 42",
        time: "10:14 a. m.",
        status: "current",
      },
      {
        label: "Destino",
        location: "CD Bogotá D.C. • Fontibón",
        time: "14:15 p. m.",
        status: "pending",
      },
    ],
    timelineEvents: [
      {
        title: "Despacho de Mercancía Confirmado",
        time: "29 Oct 2026 · 06:30 a. m.",
        description: "14 órdenes de compra consolidadas y precinto digital auditado.",
        location: "Bodega Matriz Bucaramanga, Santander",
        completed: true,
      },
      {
        title: "Paso por Peaje Río Negro / Curití",
        time: "29 Oct 2026 · 07:45 a. m.",
        description: "Telemetría satelital nominal a 68 km/h. Peso verificado en báscula: 3.450 kg.",
        location: "Corredor Santander - Boyacá",
        completed: true,
      },
      {
        title: "Checkpoint Pescadero • Alerta de Clima",
        time: "29 Oct 2026 · 10:14 a. m.",
        description: "Reducción de velocidad a 24 km/h por pavimento húmedo en curva de montaña.",
        location: "Cañón del Chicamocha Km 42",
        completed: true,
      },
      {
        title: "Recepción Programada en Muelle Fontibón",
        time: "29 Oct 2026 · 14:15 p. m. (Estimado)",
        description: "Equipo de descarga y validación de inventario asignado en bodega central.",
        location: "CD Bogotá D.C., Cundinamarca",
        completed: false,
      },
    ],
  },
  {
    id: "ship_02",
    shipmentCode: "SHP-2026-882",
    orderId: "ORD-882MED",
    orderDate: "29 Oct 2026",
    origin: "Centro de Distribución Bogotá D.C.",
    originAddress: "Calle 17 # 98-45 Fontibón, Bogotá",
    originCode: "BOG",
    destination: "Centro de Distribución Medellín",
    destinationAddress: "Parque Industrial Guayabal Muelle 4, Itagüí",
    destinationCode: "MED",
    driver: "Héctor Gómez",
    phone: "+57 315 402 9918",
    carrier: "Transportes Envía Colombia · Express",
    vehiclePlate: "TLX-104",
    vehicleType: "Furgón Chevrolet 3.5T",
    speedKmh: 74,
    distanceKm: 415,
    eta: "4h 20m restantes (13:45 p. m.)",
    costPerKmCop: 4120,
    totalFreightCop: 1709800,
    savingsVsIndividualCop: 580000,
    payloadKg: 2100,
    capacityKg: 3500,
    volumePct: 74,
    ordersCount: 8,
    status: "en_transito",
    departureTime: "Hoy, 07:15 a. m.",
    progressPct: 62,
    curvePath: "M 390 440 C 320 420, 240 380, 210 310",
    vehicleCoord: { x: 295, y: 375 },
    milestones: [
      {
        label: "Origen",
        location: "CD Bogotá D.C.",
        time: "07:15 a. m.",
        status: "completed",
      },
      {
        label: "Despacho",
        location: "Peaje Siberia / Guaduas",
        time: "08:30 a. m.",
        status: "completed",
      },
      {
        label: "En Tránsito",
        location: "Alto del Trigo km 78",
        time: "09:50 a. m.",
        status: "current",
      },
      {
        label: "Destino",
        location: "CD Medellín • Itagüí",
        time: "13:45 p. m.",
        status: "pending",
      },
    ],
    timelineEvents: [
      {
        title: "Salida de Muelle Bogotá Central",
        time: "29 Oct 2026 · 07:15 a. m.",
        description: "Carga consolidada de herramientas industriales y fijaciones.",
        location: "CD Bogotá D.C.",
        completed: true,
      },
      {
        title: "Cruce Alto del Trigo",
        time: "29 Oct 2026 · 09:50 a. m.",
        description: "Condiciones de tránsito normales. Telemetría GPS a 74 km/h.",
        location: "Vía Bogotá - Honda - Medellín",
        completed: true,
      },
      {
        title: "Arribo Estimado a Itagüí",
        time: "29 Oct 2026 · 13:45 p. m. (Estimado)",
        description: "Descarga prioritaria para reabastecer stock de seguridad.",
        location: "CD Medellín Industrial",
        completed: false,
      },
    ],
  },
  {
    id: "ship_03",
    shipmentCode: "SHP-2026-915",
    orderId: "ORD-915GIR",
    orderDate: "29 Oct 2026",
    origin: "Bodega Matriz Bucaramanga",
    originAddress: "Zona Industrial Chimitá Km 4, Bucaramanga",
    originCode: "BGA",
    destination: "Obra Anillo Vial Metropolitano",
    destinationAddress: "Sector Palenque - Girón Km 2, Santander",
    destinationCode: "GIR",
    driver: "Carlos Suárez",
    phone: "+57 318 554 1120",
    carrier: "Camión Grúa Local · Flota Propia",
    vehiclePlate: "SKM-441",
    vehicleType: "Camión Grúa Isuzu 7T",
    speedKmh: 0,
    distanceKm: 28,
    eta: "Entregado a las 09:40 a. m.",
    costPerKmCop: 5200,
    totalFreightCop: 145600,
    savingsVsIndividualCop: 95000,
    payloadKg: 4800,
    capacityKg: 7000,
    volumePct: 91,
    ordersCount: 3,
    status: "completado",
    departureTime: "Hoy, 08:00 a. m.",
    progressPct: 100,
    curvePath: "M 520 110 C 530 115, 540 120, 545 125",
    vehicleCoord: { x: 545, y: 125 },
    milestones: [
      {
        label: "Origen",
        location: "Bodega Matriz Bucaramanga",
        time: "08:00 a. m.",
        status: "completed",
      },
      {
        label: "En Ruta",
        location: "Intercambiador Palenque",
        time: "08:45 a. m.",
        status: "completed",
      },
      {
        label: "Llegada",
        location: "Obra Anillo Vial Girón",
        time: "09:20 a. m.",
        status: "completed",
      },
      {
        label: "Entrega",
        location: "Muelle de Obra • Conciliado",
        time: "09:40 a. m.",
        status: "completed",
      },
    ],
    timelineEvents: [
      {
        title: "Salida de Bodega Chimitá",
        time: "29 Oct 2026 · 08:00 a. m.",
        description: "Despacho de pernos de anclaje de alta resistencia y discos diamantados.",
        location: "Bucaramanga Matriz",
        completed: true,
      },
      {
        title: "Recepción y Conciliación Física en Obra",
        time: "29 Oct 2026 · 09:40 a. m.",
        description: "Firma digital del residente de obra y remisión sellada.",
        location: "Obra Girón - Santander",
        completed: true,
      },
    ],
  },
];

export const LogisticsRoutesView: React.FC = () => {
  const [shipments, setShipments] = useState<ShipmentRoute[]>(INITIAL_SHIPMENTS);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string>("ship_01");

  // Map view & layer toggles
  const [mapMode, setMapMode] = useState<"map" | "satellite">("map");
  const [layerFleet, setLayerFleet] = useState(true);
  const [layerRisk, setLayerRisk] = useState(true);
  const [layerCoverage, setLayerCoverage] = useState(true);

  // Re-route processing state
  const [isRerouting, setIsRerouting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Selected shipment object
  const currentIndex = shipments.findIndex((s) => s.id === selectedShipmentId);
  const selectedShipment = shipments[currentIndex] || shipments[0];

  const handlePrevShipment = () => {
    const prevIdx = (currentIndex - 1 + shipments.length) % shipments.length;
    setSelectedShipmentId(shipments[prevIdx].id);
  };

  const handleNextShipment = () => {
    const nextIdx = (currentIndex + 1) % shipments.length;
    setSelectedShipmentId(shipments[nextIdx].id);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleRerouteAI = (shipmentId: string) => {
    setIsRerouting(true);
    setTimeout(() => {
      setShipments((prev) =>
        prev.map((s) => {
          if (s.id === shipmentId) {
            return {
              ...s,
              eta: "3h 18m restantes (Ahorro de 24m vía variante San Gil)",
              speedKmh: 76,
              curvePath: s.reroutedCurvePath || s.curvePath,
              vehicleCoord: { x: 420, y: 240 },
              riskAlert: s.riskAlert
                ? {
                    ...s.riskAlert,
                    isRerouted: true,
                    title: "Ruta alternativa activada con IA",
                    description:
                      "Desvío exitoso por variante San Gil - Tunja. Se elude el tramo con reducción de velocidad de Pescadero km 42.",
                    alternateRouteName: "Corredor Troncal San Gil - Barbosa",
                  }
                : undefined,
              milestones: [
                s.milestones[0],
                s.milestones[1],
                {
                  label: "Desvío IA Activo",
                  location: "Variante San Gil • Corredor Alterno",
                  time: "10:28 a. m. (Re-enrutado)",
                  status: "current",
                },
                s.milestones[3],
              ],
            };
          }
          return s;
        })
      );
      setIsRerouting(false);
      showToast(
        "Ruta alternativa calculada con éxito: Desvío transmitido al camión WFL-892 vía telemetría."
      );
    }, 1200);
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-canvas text-[#F9FAFB] font-sans select-none overflow-hidden relative">
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
      {/* HEADER SUPERIOR EJECUTIVO                                 */}
      {/* ========================================================= */}
      <header className="px-6 py-4 bg-canvas border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase text-zinc-400">
              Operaciones
            </span>
            <span className="text-white/20">/</span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Rutas y Logística
            </h1>
          </div>
          <span className="text-zinc-500 font-mono text-xs hidden md:inline">
            · Telemetría Satelital & Despacho Autónomo
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Buscador de despachos */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar envío, placa o conductor..."
              className="h-9 w-60 sm:w-72 bg-surface-1 border border-white/[0.08] hover:border-white/20 focus:border-emerald-500/50 rounded-xl pl-9 pr-9 text-xs text-white placeholder:text-zinc-500 focus:outline-none transition-all"
            />
            <span className="absolute right-2.5 text-[10px] font-mono text-zinc-500 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06] pointer-events-none">
              ⌘F
            </span>
          </div>

          {/* Estado de conexión satelital */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-1 border border-white/[0.06] text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-zinc-300">
              3 Unidades en Línea · GPS Activo
            </span>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* SPLIT-SCREEN 50 / 50 (ESTILO FIKRI LOGISTICS SHP-5567)    */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative min-h-0">
        {/* ------------------------------------------------------- */}
        {/* PANEL IZQUIERDO (50%): DOSSIER DE ENVÍO & HITOS          */}
        {/* ------------------------------------------------------- */}
        <div className="w-full lg:w-1/2 h-full bg-canvas overflow-y-auto p-6 flex flex-col gap-5 border-b lg:border-b-0 lg:border-r border-white/[0.06]">
          {/* Fila 1: Selector de Envío, Badges y Acciones Superiores */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-white font-mono whitespace-nowrap">
                  {selectedShipment.shipmentCode}
                </span>

                {/* Badge de Estado */}
                {selectedShipment.status === "en_transito" ? (
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    En Tránsito
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30 whitespace-nowrap">
                    Completado
                  </span>
                )}

                {/* Badge de Alerta Vial si existe */}
                {selectedShipment.riskAlert && !selectedShipment.riskAlert.isRerouted && (
                  <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1 whitespace-nowrap">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Alerta Retraso
                  </span>
                )}

                {/* Controles de Paginación < > estilo Fikri */}
                <div className="flex items-center bg-surface-1 rounded-lg border border-white/[0.08] p-0.5">
                  <button
                    onClick={handlePrevShipment}
                    className="p-1 hover:bg-white/[0.06] rounded text-zinc-400 hover:text-white transition-colors"
                    title="Envío anterior"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-mono px-1.5 text-zinc-400">
                    {currentIndex + 1}/{shipments.length}
                  </span>
                  <button
                    onClick={handleNextShipment}
                    className="p-1 hover:bg-white/[0.06] rounded text-zinc-400 hover:text-white transition-colors"
                    title="Envío siguiente"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-zinc-400">
                Fecha de Despacho:{" "}
                <span className="text-zinc-300 font-medium">
                  {selectedShipment.orderDate}
                </span>{" "}
                · ID de Orden:{" "}
                <span className="text-emerald-400 font-mono">
                  {selectedShipment.orderId}
                </span>
              </p>
            </div>

            {/* Botones de Acción */}
            <div className="flex items-center gap-2">
              <a
                href={`tel:${selectedShipment.phone}`}
                className="px-3 py-2 rounded-xl bg-surface-1 hover:bg-white/[0.08] text-xs font-medium text-zinc-300 hover:text-white border border-white/[0.08] flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <PhoneCall className="w-3.5 h-3.5 text-zinc-400" />
                <span>Contactar Conductor</span>
              </a>

              {selectedShipment.riskAlert && !selectedShipment.riskAlert.isRerouted && (
                <button
                  onClick={() => handleRerouteAI(selectedShipment.id)}
                  disabled={isRerouting}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs flex items-center gap-1.5 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isRerouting ? "Calculando..." : "✦ Re-enrutar con IA"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Fila 2: Tarjeta de Despacho con Origen, Destino y Stepper Horizontal (Fikri SHP-5567) */}
          <div className="bg-surface-1 rounded-2xl p-5 border border-white/[0.06] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]">
            {/* Origen y Destino con línea de conexión */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/[0.06]">
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-400" />
                  <span className="text-xs text-zinc-300 font-medium">
                    {selectedShipment.originAddress}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <span className="text-xs text-white font-medium">
                    {selectedShipment.destinationAddress}
                  </span>
                </div>
              </div>

              {/* Transportadora / Placa Badge */}
              <div className="flex flex-col items-end">
                <span className="px-2.5 py-1 rounded-lg bg-surface-well border border-white/[0.06] text-xs font-mono text-zinc-300 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-emerald-400" />
                  {selectedShipment.vehiclePlate}
                </span>
                <span className="text-[11px] text-zinc-500 mt-1">
                  {selectedShipment.carrier}
                </span>
              </div>
            </div>

            {/* Sub-caja "Well" con Stepper Horizontal de 4 Iconos */}
            <div className="bg-surface-well rounded-xl p-4 mt-4 border border-white/[0.04]">
              <div className="relative flex items-center justify-between">
                {/* Línea base de progreso horizontal */}
                <div className="absolute top-1/2 left-4 right-4 h-1 bg-white/[0.08] -translate-y-1/2 z-0" />
                <div
                  className="absolute top-1/2 left-4 h-1 bg-emerald-500 -translate-y-1/2 z-0 transition-all duration-700"
                  style={{ width: `${selectedShipment.progressPct * 0.88}%` }}
                />

                {/* 4 Nodos con Iconos a Color (Estilo Fikri SHP-5567) */}
                {selectedShipment.milestones.map((m, idx) => {
                  const isDone = m.status === "completed";
                  const isCur = m.status === "current";

                  return (
                    <div
                      key={idx}
                      className="relative z-10 flex flex-col items-center group cursor-pointer"
                    >
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                          isDone
                            ? "bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                            : isCur
                            ? "bg-surface-1 text-emerald-400 border-2 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse"
                            : "bg-surface-1 text-zinc-500 border border-white/10"
                        }`}
                      >
                        {idx === 0 && <Package className="w-4 h-4" />}
                        {idx === 1 && <Clock className="w-4 h-4" />}
                        {idx === 2 && <Truck className="w-4 h-4" />}
                        {idx === 3 && <MapPin className="w-4 h-4" />}
                      </div>

                      <div className="text-center mt-2">
                        <span className="block text-[11px] font-semibold text-zinc-300 whitespace-nowrap">
                          {m.label}
                        </span>
                        <span className="block text-[10px] font-mono text-zinc-500">
                          {m.time}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Fila de 3 Métricas Clave (Estilo Fikri) */}
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/[0.06]">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-zinc-500 block mb-1">
                  Tiempo en Ruta
                </span>
                <span className="text-sm font-semibold text-white">
                  {selectedShipment.eta.split(" ")[0]} restantes
                </span>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-zinc-500 block mb-1">
                  Hora de Salida
                </span>
                <span className="text-sm font-semibold text-zinc-300">
                  {selectedShipment.departureTime}
                </span>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-zinc-500 block mb-1">
                  Llegada Proyectada
                </span>
                <span className="text-sm font-semibold text-emerald-400">
                  {selectedShipment.milestones[3].time}
                </span>
              </div>
            </div>
          </div>

          {/* Fila 3: Callout Banner Contextual (Ámbar suave / Esmeralda re-enrutado) */}
          {selectedShipment.riskAlert && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl p-4 flex items-start gap-3 border ${
                selectedShipment.riskAlert.isRerouted
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-200"
              }`}
            >
              {selectedShipment.riskAlert.isRerouted ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="text-xs leading-relaxed">
                <span className="font-bold block mb-0.5">
                  {selectedShipment.riskAlert.title}
                </span>
                <p className="text-zinc-300">
                  {selectedShipment.riskAlert.description}
                </p>
                {selectedShipment.riskAlert.alternateRouteName && (
                  <span className="inline-block mt-2 font-mono text-[11px] text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">
                    Vía activa: {selectedShipment.riskAlert.alternateRouteName}
                  </span>
                )}
              </div>
            </motion.div>
          )}

          {/* Fila 4: Bitácora Vertical de Estados (Shipment Status estilo Fikri) */}
          <div className="bg-surface-1 rounded-2xl p-5 border border-white/[0.06] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]">
            <h3 className="text-sm font-bold text-white tracking-tight mb-4 flex items-center justify-between">
              <span>Historial del Envío (Trazabilidad)</span>
              <span className="text-xs font-mono font-normal text-zinc-500">
                {selectedShipment.ordersCount} Órdenes de Compra
              </span>
            </h3>

            <div className="relative pl-6 space-y-6">
              {/* Línea vertical de la bitácora */}
              <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-white/[0.08]" />

              {selectedShipment.timelineEvents.map((evt, idx) => (
                <div key={idx} className="relative">
                  {/* Punto del evento */}
                  <div
                    className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 transition-all ${
                      evt.completed
                        ? "bg-emerald-500 border-canvas shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                        : "bg-surface-well border-zinc-600"
                    }`}
                  />

                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h4
                        className={`text-xs font-bold ${
                          evt.completed ? "text-white" : "text-zinc-500"
                        }`}
                      >
                        {evt.title}
                      </h4>
                      <span className="text-[11px] font-mono text-zinc-500">
                        {evt.time}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {evt.description}
                    </p>
                    <span className="text-[11px] text-zinc-500 flex items-center gap-1 mt-1 font-mono">
                      <MapPin className="w-3 h-3 text-zinc-500" />
                      {evt.location}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------- */}
        {/* PANEL DERECHO (50%): MAPA CARTOGRÁFICO & POPOVER FIKRI  */}
        {/* ------------------------------------------------------- */}
        <div className="w-full lg:w-1/2 h-full bg-[#070C09] relative overflow-hidden flex flex-col justify-between">
          {/* Subtle Dot Matrix Micro-Grid */}
          <div
            className="pointer-events-none absolute inset-0 z-0 opacity-25"
            style={{
              backgroundImage:
                "radial-gradient(rgba(16, 185, 129, 0.2) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          {/* Geographical Coordinates Overlay */}
          <div className="pointer-events-none absolute inset-0 z-1 flex flex-col justify-between p-6 opacity-30 font-mono text-[10px] text-zinc-400">
            <div className="flex justify-between">
              <span>LAT: 07°07'14"N • BUCARAMANGA HUB</span>
              <span>LON: 73°07'22"W</span>
            </div>
            <div className="flex justify-between">
              <span>LAT: 06°15'07"N • MEDELLÍN CORREDOR</span>
              <span>LON: 75°34'49"W</span>
            </div>
            <div className="flex justify-between">
              <span>LAT: 04°36'35"N • BOGOTÁ D.C. CD CENTRAL</span>
              <span>LON: 74°04'54"W</span>
            </div>
          </div>

          {/* SVG Vectorial Topography & Logistics Curves */}
          <svg
            className="absolute inset-0 w-full h-full z-2 select-none"
            viewBox="0 0 720 540"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <filter id="emerald-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="cyan-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="amber-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>

              <linearGradient id="grad-bga-bog" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.95" />
                <stop offset="50%" stopColor="#34D399" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.95" />
              </linearGradient>

              <linearGradient id="grad-reroute" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.95" />
                <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.95" />
              </linearGradient>
            </defs>

            {/* Topography Contour Lines */}
            <g stroke="rgba(16, 185, 129, 0.08)" fill="none" strokeWidth="1.2">
              <path d="M 100 160 C 180 140, 290 200, 380 150 C 440 110, 540 140, 640 100" />
              <path d="M 90 220 C 190 200, 270 260, 390 220 C 470 180, 560 210, 670 170" />
              <path d="M 120 290 C 210 270, 310 330, 420 280 C 490 240, 580 290, 680 240" />
              <path d="M 140 370 C 240 340, 330 410, 450 360 C 520 310, 610 370, 700 320" />
              <path d="M 160 450 C 260 420, 350 480, 480 430 C 550 390, 630 440, 710 400" />
            </g>

            {/* Warehouse Coverage Rings */}
            {layerCoverage && (
              <g fill="none">
                <circle
                  cx="520"
                  cy="110"
                  r="65"
                  stroke="rgba(16, 185, 129, 0.15)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <circle
                  cx="390"
                  cy="440"
                  r="75"
                  stroke="rgba(59, 130, 246, 0.15)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              </g>
            )}

            {/* Rutas Principales */}
            <g fill="none">
              {/* Bucaramanga -> Bogotá */}
              <path
                d={shipments[0].curvePath}
                stroke="url(#grad-bga-bog)"
                strokeWidth={selectedShipmentId === "ship_01" ? "4.5" : "2"}
                strokeLinecap="round"
                className="transition-all duration-700"
              />

              {/* Bogotá -> Medellín */}
              <path
                d={shipments[1].curvePath}
                stroke="#3B82F6"
                strokeWidth={selectedShipmentId === "ship_02" ? "4" : "1.8"}
                strokeDasharray="6 4"
                strokeLinecap="round"
                opacity={0.8}
              />
            </g>

            {/* Warehouse Nodes */}
            <g>
              {/* Bucaramanga Matriz */}
              <circle
                cx="520"
                cy="110"
                r="7"
                fill="#10B981"
                stroke="#FFFFFF"
                strokeWidth="2"
                filter="url(#emerald-glow)"
              />
              <text
                x="535"
                y="114"
                fill="#FFFFFF"
                fontSize="11"
                fontWeight="700"
                fontFamily="sans-serif"
              >
                Bucaramanga (Matriz)
              </text>

              {/* Bogotá D.C. */}
              <circle
                cx="390"
                cy="440"
                r="7"
                fill="#3B82F6"
                stroke="#FFFFFF"
                strokeWidth="2"
                filter="url(#cyan-glow)"
              />
              <text
                x="405"
                y="444"
                fill="#FFFFFF"
                fontSize="11"
                fontWeight="700"
                fontFamily="sans-serif"
              >
                Bogotá D.C. (CD Central)
              </text>

              {/* Medellín */}
              <circle
                cx="210"
                cy="310"
                r="6"
                fill="#10B981"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
              <text
                x="225"
                y="314"
                fill="#FFFFFF"
                fontSize="11"
                fontWeight="700"
                fontFamily="sans-serif"
              >
                Medellín (CD Itagüí)
              </text>
            </g>

            {/* Vehículos en Tránsito */}
            {layerFleet && (
              <g>
                <circle
                  cx={shipments[0].vehicleCoord.x}
                  cy={shipments[0].vehicleCoord.y}
                  r="12"
                  fill="rgba(16, 185, 129, 0.25)"
                  className="animate-ping"
                />
                <circle
                  cx={shipments[0].vehicleCoord.x}
                  cy={shipments[0].vehicleCoord.y}
                  r="7"
                  fill="#10B981"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  filter="url(#emerald-glow)"
                />
              </g>
            )}
          </svg>

          {/* ========================================================= */}
          {/* POPOVER FLOTANTE DE ALTO CONTRASTE (ESTILO MSW WAREHOUSE) */}
          {/* ========================================================= */}
          <div
            className="absolute z-20 pointer-events-auto"
            style={{
              left: `${selectedShipment.vehicleCoord.x * 0.85}px`,
              top: `${selectedShipment.vehicleCoord.y * 0.72}px`,
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="p-4 rounded-2xl bg-[#0B100E]/95 border border-emerald-500/40 backdrop-blur-2xl shadow-[0_16px_40px_rgba(0,0,0,0.85)] w-72 text-white"
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold font-mono">
                    {selectedShipment.milestones[2].location}
                  </span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {selectedShipment.speedKmh} km/h
                </span>
              </div>

              <p className="text-xs text-zinc-300 mb-2">
                Conductor: <strong className="text-white">{selectedShipment.driver}</strong> · {selectedShipment.vehiclePlate}
              </p>

              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-surface-well p-2 rounded-xl border border-white/[0.04]">
                <div>
                  <span className="text-zinc-500 block uppercase">Carga Útil</span>
                  <span className="text-white font-bold">{selectedShipment.payloadKg} kg ({selectedShipment.volumePct}%)</span>
                </div>
                <div>
                  <span className="text-zinc-500 block uppercase">Flete Total</span>
                  <span className="text-emerald-400 font-bold">${selectedShipment.totalFreightCop.toLocaleString("es-CO")} COP</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Controles de Mapa Flotantes (Esquina Superior Derecha) */}
          <div className="absolute top-5 right-5 z-20 flex flex-col gap-2">
            <div className="bg-surface-1/90 backdrop-blur-xl rounded-xl border border-white/[0.08] p-1 flex flex-col shadow-xl">
              <button
                onClick={() => setMapMode(mapMode === "map" ? "satellite" : "map")}
                className="p-2 hover:bg-white/[0.08] rounded-lg text-zinc-300 hover:text-white transition-colors"
                title="Cambiar vista de mapa"
              >
                {mapMode === "map" ? <Globe className="w-4 h-4" /> : <MapIcon className="w-4 h-4" />}
              </button>
              <div className="h-px w-full bg-white/[0.08] my-0.5" />
              <button
                className="p-2 hover:bg-white/[0.08] rounded-lg text-zinc-300 hover:text-white transition-colors"
                title="Acercar mapa"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                className="p-2 hover:bg-white/[0.08] rounded-lg text-zinc-300 hover:text-white transition-colors"
                title="Alejar mapa"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Barra Inferior de Capas y Leyenda (Esquinas Inferiores) */}
          <div className="p-5 z-20 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-t from-[#070C09] to-transparent">
            {/* Toggles de Capas */}
            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-surface-1/90 border border-white/[0.08] backdrop-blur-xl shadow-xl">
              <span className="text-[10px] font-mono uppercase text-zinc-400 px-2 flex items-center gap-1">
                <Layers className="w-3 h-3 text-emerald-400" /> Capas:
              </span>

              <button
                onClick={() => setLayerFleet(!layerFleet)}
                className={`px-2.5 py-1 rounded-xl text-xs font-mono font-medium flex items-center gap-1.5 transition-all ${
                  layerFleet
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-white/[0.03] text-zinc-400 border border-transparent hover:text-white"
                }`}
              >
                <Truck className="w-3 h-3" />
                <span>Tráfico Flota</span>
              </button>

              <button
                onClick={() => setLayerRisk(!layerRisk)}
                className={`px-2.5 py-1 rounded-xl text-xs font-mono font-medium flex items-center gap-1.5 transition-all ${
                  layerRisk
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                    : "bg-white/[0.03] text-zinc-400 border border-transparent hover:text-white"
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                <span>Riesgo en Ruta</span>
              </button>

              <button
                onClick={() => setLayerCoverage(!layerCoverage)}
                className={`px-2.5 py-1 rounded-xl text-xs font-mono font-medium flex items-center gap-1.5 transition-all ${
                  layerCoverage
                    ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                    : "bg-white/[0.03] text-zinc-400 border border-transparent hover:text-white"
                }`}
              >
                <Radio className="w-3 h-3" />
                <span>Cobertura Bodegas</span>
              </button>
            </div>

            {/* Selector de modo Satélite / Mapa (Estilo Fikri inferior derecho) */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-1/90 border border-white/[0.08] backdrop-blur-xl">
              <button
                onClick={() => setMapMode("satellite")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  mapMode === "satellite"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Vista Satelital
              </button>
              <button
                onClick={() => setMapMode("map")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  mapMode === "map"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Vista Vectorial
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
