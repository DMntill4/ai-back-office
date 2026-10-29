import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Truck,
  Navigation,
  MapPin,
  Clock,
  Fuel,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Layers,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Radio,
  Zap,
  TrendingDown,
  Route,
  Check,
  Activity,
  PhoneCall,
  X,
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
  origin: string;
  destination: string;
  originCode: string;
  destinationCode: string;
  driver: string;
  phone: string;
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
  curvePath: string;
  reroutedCurvePath?: string;
  vehicleCoord: { x: number; y: number };
}

const INITIAL_SHIPMENTS: ShipmentRoute[] = [
  {
    id: "ship_01",
    shipmentCode: "ENV-2026-904",
    origin: "Bodega Matriz Bucaramanga",
    originCode: "BGA",
    destination: "CD Bogotá D.C.",
    destinationCode: "BOG",
    driver: "Jairo Pinzón",
    phone: "+57 312 849 2011",
    vehiclePlate: "WFL-892",
    vehicleType: "Camión Hino 5T",
    speedKmh: 68,
    distanceKm: 398,
    eta: "3h 42m restantes (14:15)",
    costPerKmCop: 3850,
    totalFreightCop: 1532300,
    savingsVsIndividualCop: 840000,
    payloadKg: 3450,
    capacityKg: 5000,
    volumePct: 82,
    ordersCount: 14,
    status: "en_transito",
    departureTime: "06:30 a. m.",
    progressPct: 54,
    riskAlert: {
      type: "clima",
      title: "Lluvia torrencial en Pescadero / Cañón del Chicamocha",
      description: "Detección de reducción de velocidad a 24 km/h en km 42 por pavimento húmedo. Retraso proyectado de +38 min.",
      severity: "alta",
    },
    curvePath: "M 520 110 C 490 200, 440 310, 390 440",
    reroutedCurvePath: "M 520 110 C 450 180, 370 300, 390 440",
    vehicleCoord: { x: 455, y: 250 },
    milestones: [
      {
        label: "Origen",
        location: "Bodega Matriz Bucaramanga (Salida)",
        time: "06:30 a. m.",
        status: "completed",
      },
      {
        label: "Checkpoint",
        location: "Cañón del Chicamocha • Pescadero km 42",
        time: "10:14 a. m.",
        status: "current",
      },
      {
        label: "Destino",
        location: "CD Bogotá D.C. • Fontibón",
        time: "14:15 p. m. (ETA)",
        status: "pending",
      },
    ],
  },
  {
    id: "ship_02",
    shipmentCode: "ENV-2026-882",
    origin: "CD Bogotá D.C.",
    originCode: "BOG",
    destination: "CD Medellín (Itagüí)",
    destinationCode: "MED",
    driver: "Héctor Gómez",
    phone: "+57 315 402 9918",
    vehiclePlate: "TLX-104",
    vehicleType: "Furgón Chevrolet 3.5T",
    speedKmh: 74,
    distanceKm: 415,
    eta: "4h 20m restantes (13:45)",
    costPerKmCop: 4120,
    totalFreightCop: 1709800,
    savingsVsIndividualCop: 580000,
    payloadKg: 2100,
    capacityKg: 3500,
    volumePct: 74,
    ordersCount: 8,
    status: "en_transito",
    departureTime: "07:15 a. m.",
    progressPct: 62,
    curvePath: "M 390 440 C 320 420, 240 380, 210 310",
    vehicleCoord: { x: 295, y: 375 },
    milestones: [
      {
        label: "Origen",
        location: "CD Bogotá D.C. (Salida)",
        time: "07:15 a. m.",
        status: "completed",
      },
      {
        label: "Checkpoint",
        location: "Guaduas - Alto del Trigo km 78",
        time: "09:50 a. m.",
        status: "current",
      },
      {
        label: "Destino",
        location: "CD Medellín • Itagüí Industrial",
        time: "13:45 p. m. (ETA)",
        status: "pending",
      },
    ],
  },
  {
    id: "ship_03",
    shipmentCode: "ENV-2026-915",
    origin: "Bodega Matriz Bucaramanga",
    originCode: "BGA",
    destination: "Obra Anillo Vial Girón",
    destinationCode: "GIR",
    driver: "Carlos Suárez",
    phone: "+57 318 290 1144",
    vehiclePlate: "SKM-441",
    vehicleType: "Turbo NPR 2T",
    speedKmh: 0,
    distanceKm: 28,
    eta: "Completado a las 09:40 a. m.",
    costPerKmCop: 2400,
    totalFreightCop: 180000,
    savingsVsIndividualCop: 95000,
    payloadKg: 1200,
    capacityKg: 2000,
    volumePct: 90,
    ordersCount: 3,
    status: "completado",
    departureTime: "08:00 a. m.",
    progressPct: 100,
    curvePath: "M 520 110 C 538 105, 550 100, 565 95",
    vehicleCoord: { x: 565, y: 95 },
    milestones: [
      {
        label: "Origen",
        location: "Bodega Matriz Bucaramanga",
        time: "08:00 a. m.",
        status: "completed",
      },
      {
        label: "Checkpoint",
        location: "Intercambiador Palenque",
        time: "08:45 a. m.",
        status: "completed",
      },
      {
        label: "Destino",
        location: "Obra Anillo Vial Girón (Entregado)",
        time: "09:40 a. m.",
        status: "completed",
      },
    ],
  },
];

export const LogisticsRoutesView: React.FC = () => {
  const [shipments, setShipments] = useState<ShipmentRoute[]>(INITIAL_SHIPMENTS);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string>("ship_01");
  const [activeTab, setActiveTab] = useState<"envios" | "optimizador">("envios");

  // Map layer controls
  const [layerFleet, setLayerFleet] = useState(true);
  const [layerRisk, setLayerRisk] = useState(true);
  const [layerCoverage, setLayerCoverage] = useState(true);

  // Re-route processing state
  const [isRerouting, setIsRerouting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Selected shipment object
  const selectedShipment = useMemo(
    () => shipments.find((s) => s.id === selectedShipmentId) || shipments[0],
    [shipments, selectedShipmentId]
  );

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
              eta: "3h 18m (Ahorro de 24m vía variante San Gil)",
              speedKmh: 76,
              curvePath: s.reroutedCurvePath || s.curvePath,
              vehicleCoord: { x: 420, y: 240 },
              riskAlert: s.riskAlert
                ? {
                    ...s.riskAlert,
                    isRerouted: true,
                    title: "Ruta alternativa activada con IA",
                    description:
                      "Desvío exitoso por variante San Gil - Barbosa. Se elude el tramo con bloqueo de Pescadero km 42.",
                    alternateRouteName: "Corredor Troncal San Gil - Tunja",
                  }
                : undefined,
              milestones: [
                s.milestones[0],
                {
                  label: "Checkpoint Alterno",
                  location: "Variante San Gil - Desvío IA Activo",
                  time: "10:28 a. m. (Re-enrutado)",
                  status: "current",
                },
                s.milestones[2],
              ],
            };
          }
          return s;
        })
      );
      setIsRerouting(false);
      showToast(
        "transporteSpecialist: Nueva ruta OSRM calculada y transmitida al camión WFL-892 vía telemetría."
      );
    }, 1200);
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-[#050806] text-[#F9FAFB] font-sans select-none overflow-hidden relative">
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
      {/* HEADER COMPACTO OPERATIVO                                */}
      {/* ========================================================= */}
      <div className="px-6 py-2.5 border-b border-white/[0.06] bg-[#070B08]/90 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#8E9893]">
              OPERACIONES
            </span>
            <span className="text-white/20">/</span>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded-full border border-[#10B981]/25">
              TORRE DE CONTROL & TELEMETRÍA
            </span>
          </div>

          <div className="h-4 w-px bg-white/10 hidden sm:block" />

          <h1 className="text-base font-bold tracking-tight text-[#F9FAFB] flex items-center gap-2">
            Rutas y Logística
            <span className="text-xs font-normal font-mono text-[#8E9893]">
              (OSRM Engine + GPS en Vivo)
            </span>
          </h1>
        </div>

        {/* Live System Indicator */}
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0A0F0C] border border-white/[0.08] text-xs shadow-inner">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]"></span>
            </span>
            <span className="text-[11px] font-mono text-[#8E9893]">
              <strong className="text-[#34D399] font-normal">trackingService</strong> · 3 Unidades Activas · Satélite OSRM OK
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MAIN SPLIT-SCREEN LAYOUT: 65% MAPA | 35% CONSOLA          */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative min-h-0">
        {/* ------------------------------------------------------- */}
        {/* LIENZO IZQUIERDO (65%): MAPA VECTORIAL DE TELEMETRÍA    */}
        {/* ------------------------------------------------------- */}
        <div className="flex-1 lg:w-[65%] h-full bg-[#040705] relative overflow-hidden flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/[0.06] min-h-0">
          {/* Subtle Dot Matrix Micro-Grid */}
          <div
            className="pointer-events-none absolute inset-0 z-0 opacity-30"
            style={{
              backgroundImage:
                "radial-gradient(rgba(16, 185, 129, 0.15) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          {/* Geographical Coordinates Overlay (geocodingService) */}
          <div className="pointer-events-none absolute inset-0 z-1 flex flex-col justify-between p-5 opacity-40 font-mono text-[10px] text-[#8E9893]">
            <div className="flex justify-between pl-64">
              <span>LAT: 07°07'14"N • BUCARAMANGA HUB</span>
              <span>LON: 73°07'22"W</span>
            </div>
            <div className="flex justify-between">
              <span>LAT: 06°15'07"N • MEDELLÍN CORREDOR</span>
              <span>LON: 75°34'49"W</span>
            </div>
            <div className="flex justify-between">
              <span>LAT: 04°36'35"N • BOGOTÁ D.C. CD</span>
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
              {/* Glowing Filters */}
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

              {/* Route Gradients */}
              <linearGradient id="grad-bga-bog" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#34D399" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.9" />
              </linearGradient>

              <linearGradient id="grad-bog-med" x1="100%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.8" />
              </linearGradient>

              <linearGradient id="grad-reroute" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.9" />
              </linearGradient>
            </defs>

            {/* Topography Contour Lines (Cordillera Oriental & Valle) */}
            <g stroke="rgba(16, 185, 129, 0.08)" fill="none" strokeWidth="1.2">
              <path d="M 100 160 C 180 140, 290 200, 380 150 C 440 110, 540 140, 640 100" />
              <path d="M 90 220 C 190 200, 270 260, 390 220 C 470 180, 560 210, 670 170" />
              <path d="M 120 290 C 210 270, 310 330, 420 280 C 490 240, 580 290, 680 240" />
              <path d="M 140 370 C 240 340, 330 410, 450 360 C 520 310, 610 370, 700 320" />
              <path d="M 160 450 C 260 420, 350 480, 480 430 C 550 390, 630 440, 710 400" />
            </g>

            {/* Cobertura de Bodegas (Warehouse Coverage Rings) */}
            {layerCoverage && (
              <g fill="none">
                {/* Bucaramanga Coverage */}
                <circle
                  cx="520"
                  cy="110"
                  r="65"
                  stroke="rgba(16, 185, 129, 0.15)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <circle
                  cx="520"
                  cy="110"
                  r="110"
                  stroke="rgba(16, 185, 129, 0.08)"
                  strokeWidth="1"
                  strokeDasharray="6 6"
                />
                {/* Bogotá Coverage */}
                <circle
                  cx="390"
                  cy="440"
                  r="75"
                  stroke="rgba(59, 130, 246, 0.15)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                {/* Medellín Coverage */}
                <circle
                  cx="210"
                  cy="310"
                  r="60"
                  stroke="rgba(16, 185, 129, 0.12)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              </g>
            )}

            {/* Rutas Activas (Bézier Curves by calcularRutaLogistica) */}
            <g fill="none">
              {/* Route 1: BGA -> BOG */}
              <path
                d={shipments[0].curvePath}
                stroke={shipments[0].riskAlert?.isRerouted ? "url(#grad-reroute)" : "url(#grad-bga-bog)"}
                strokeWidth={selectedShipmentId === "ship_01" ? "3.5" : "2"}
                strokeLinecap="round"
                filter="url(#emerald-glow)"
                className="transition-all duration-700 cursor-pointer"
                onClick={() => setSelectedShipmentId("ship_01")}
              />

              {/* Animated pulses on route 1 */}
              <path
                d={shipments[0].curvePath}
                stroke="#FFFFFF"
                strokeWidth="2.5"
                strokeDasharray="8 60"
                strokeDashoffset="20"
                className="animate-pulse opacity-60"
              />

              {/* Route 2: BOG -> MED */}
              <path
                d={shipments[1].curvePath}
                stroke="url(#grad-bog-med)"
                strokeWidth={selectedShipmentId === "ship_02" ? "3.5" : "2"}
                strokeLinecap="round"
                filter="url(#cyan-glow)"
                className="transition-all duration-700 cursor-pointer"
                onClick={() => setSelectedShipmentId("ship_02")}
              />

              {/* Route 3: BGA -> Girón Local */}
              <path
                d={shipments[2].curvePath}
                stroke="#10B981"
                strokeWidth={selectedShipmentId === "ship_03" ? "3" : "1.5"}
                strokeDasharray="3 3"
                className="opacity-70 cursor-pointer"
                onClick={() => setSelectedShipmentId("ship_03")}
              />
            </g>

            {/* Riesgo en Ruta Overlay (supply_chain_crisis) */}
            {layerRisk && (
              <g>
                {/* Chicamocha / Pescadero Risk Zone */}
                <circle
                  cx="460"
                  cy="235"
                  r="24"
                  fill="rgba(245, 158, 11, 0.12)"
                  stroke="#F59E0B"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                  className="animate-pulse"
                />
                <circle cx="460" cy="235" r="4" fill="#F59E0B" filter="url(#amber-glow)" />
                <text
                  x="472"
                  y="238"
                  fill="#F59E0B"
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  Pescadero (km 42)
                </text>
              </g>
            )}

            {/* Nodos de Centros de Distribución & Sedes */}
            <g>
              {/* Hub 1: Bodega Matriz Bucaramanga */}
              <g
                className="cursor-pointer group"
                onClick={() => setSelectedShipmentId("ship_01")}
              >
                <circle cx="520" cy="110" r="16" fill="rgba(16, 185, 129, 0.15)" />
                <circle
                  cx="520"
                  cy="110"
                  r="8"
                  fill="#050806"
                  stroke="#10B981"
                  strokeWidth="2.5"
                  filter="url(#emerald-glow)"
                />
                <circle cx="520" cy="110" r="3.5" fill="#34D399" />
                <text
                  x="538"
                  y="106"
                  fill="#F9FAFB"
                  fontSize="11"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  Bucaramanga (Matriz)
                </text>
                <text
                  x="538"
                  y="120"
                  fill="#8E9893"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  wh_bga • Hub Primario
                </text>
              </g>

              {/* Hub 2: CD Bogotá D.C. */}
              <g
                className="cursor-pointer group"
                onClick={() => setSelectedShipmentId("ship_02")}
              >
                <circle cx="390" cy="440" r="16" fill="rgba(59, 130, 246, 0.15)" />
                <circle
                  cx="390"
                  cy="440"
                  r="8"
                  fill="#050806"
                  stroke="#3B82F6"
                  strokeWidth="2.5"
                  filter="url(#cyan-glow)"
                />
                <circle cx="390" cy="440" r="3.5" fill="#60A5FA" />
                <text
                  x="408"
                  y="436"
                  fill="#F9FAFB"
                  fontSize="11"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  Bogotá D.C. (CD Central)
                </text>
                <text
                  x="408"
                  y="450"
                  fill="#8E9893"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  wh_bog • Hub Cross-Docking
                </text>
              </g>

              {/* Hub 3: CD Medellín */}
              <g
                className="cursor-pointer group"
                onClick={() => setSelectedShipmentId("ship_02")}
              >
                <circle cx="210" cy="310" r="14" fill="rgba(16, 185, 129, 0.15)" />
                <circle
                  cx="210"
                  cy="310"
                  r="7"
                  fill="#050806"
                  stroke="#10B981"
                  strokeWidth="2"
                  filter="url(#emerald-glow)"
                />
                <circle cx="210" cy="310" r="3" fill="#34D399" />
                <text
                  x="120"
                  y="306"
                  fill="#F9FAFB"
                  fontSize="11"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  CD Medellín
                </text>
                <text
                  x="132"
                  y="320"
                  fill="#8E9893"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  wh_med • Itagüí
                </text>
              </g>

              {/* Sede Satélite: Girón */}
              <g className="cursor-pointer" onClick={() => setSelectedShipmentId("ship_03")}>
                <circle cx="565" cy="95" r="4" fill="#10B981" />
                <text
                  x="575"
                  y="98"
                  fill="#8E9893"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  Girón (Obra)
                </text>
              </g>
            </g>

            {/* Marcadores de Flota en Tránsito (fleetAndOrdersService) */}
            {layerFleet && (
              <g>
                {/* Vehicle 1 (Camión WFL-892) */}
                <g
                  className="cursor-pointer transition-transform"
                  onClick={() => setSelectedShipmentId("ship_01")}
                >
                  <circle
                    cx={shipments[0].vehicleCoord.x}
                    cy={shipments[0].vehicleCoord.y}
                    r="12"
                    fill="rgba(16, 185, 129, 0.2)"
                    className="animate-ping"
                  />
                  <circle
                    cx={shipments[0].vehicleCoord.x}
                    cy={shipments[0].vehicleCoord.y}
                    r="6.5"
                    fill="#10B981"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                    filter="url(#emerald-glow)"
                  />
                </g>

                {/* Vehicle 2 (Furgón TLX-104) */}
                <g
                  className="cursor-pointer transition-transform"
                  onClick={() => setSelectedShipmentId("ship_02")}
                >
                  <circle
                    cx={shipments[1].vehicleCoord.x}
                    cy={shipments[1].vehicleCoord.y}
                    r="10"
                    fill="rgba(59, 130, 246, 0.2)"
                    className="animate-ping"
                  />
                  <circle
                    cx={shipments[1].vehicleCoord.x}
                    cy={shipments[1].vehicleCoord.y}
                    r="6"
                    fill="#3B82F6"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                    filter="url(#cyan-glow)"
                  />
                </g>
              </g>
            )}
          </svg>

          {/* Tactical Frosted Glass HUD Tag for Active Vehicle */}
          {layerFleet && selectedShipment && selectedShipment.status === "en_transito" && (
            <motion.div
              key={selectedShipment.id}
              initial={false}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="absolute top-4 left-4 z-20 p-3.5 rounded-2xl bg-[#0A0F0C]/95 border border-[#10B981]/50 backdrop-blur-2xl shadow-[0_0_35px_rgba(0,0,0,0.95)] max-w-xs pointer-events-auto"
            >
              <div className="flex items-center justify-between gap-3 pb-2 border-b border-white/[0.08]">
                <div className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-[#10B981]" />
                  <span className="font-mono text-xs font-bold text-[#F9FAFB]">
                    {selectedShipment.shipmentCode}
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30">
                  {selectedShipment.vehiclePlate}
                </span>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div>
                  <span className="text-[#8E9893] block text-[9px] uppercase">
                    Velocidad GPS
                  </span>
                  <span className="text-[#F9FAFB] font-bold">
                    {selectedShipment.speedKmh} km/h
                  </span>
                </div>
                <div>
                  <span className="text-[#8E9893] block text-[9px] uppercase">
                    ETA Estimado
                  </span>
                  <span className="text-[#34D399] font-bold">
                    {selectedShipment.eta.split(" ")[0]}
                  </span>
                </div>
              </div>

              {selectedShipment.riskAlert && (
                <div
                  className={`mt-2.5 p-2 rounded-xl flex items-start gap-1.5 border ${
                    selectedShipment.riskAlert.isRerouted
                      ? "bg-[#10B981]/10 border-[#10B981]/30"
                      : "bg-[#F59E0B]/10 border-[#F59E0B]/30"
                  }`}
                >
                  {selectedShipment.riskAlert.isRerouted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B] shrink-0 mt-0.5" />
                  )}
                  <p className="text-[10px] text-[#F9FAFB] leading-tight">
                    <strong
                      className={
                        selectedShipment.riskAlert.isRerouted
                          ? "text-[#10B981]"
                          : "text-[#F59E0B]"
                      }
                    >
                      {selectedShipment.riskAlert.isRerouted ? "Ruta IA:" : "Alerta vial:"}
                    </strong>{" "}
                    {selectedShipment.riskAlert.title}
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* Floating Layer Controls (Bottom-Left Corner) */}
          <div className="absolute bottom-4 left-4 z-20 flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-[#0A0F0C]/95 border border-white/[0.1] backdrop-blur-xl shadow-2xl">
            <span className="text-[10px] font-mono uppercase text-[#8E9893] px-2 flex items-center gap-1">
              <Layers className="w-3 h-3 text-[#10B981]" /> Capas:
            </span>

            <button
              onClick={() => setLayerFleet(!layerFleet)}
              className={`px-2.5 py-1 rounded-xl text-xs font-mono font-medium flex items-center gap-1.5 transition-all ${
                layerFleet
                  ? "bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/40"
                  : "bg-white/[0.03] text-[#8E9893] border border-transparent hover:text-white"
              }`}
            >
              <Truck className="w-3 h-3" />
              <span>Tráfico Flota</span>
            </button>

            <button
              onClick={() => setLayerRisk(!layerRisk)}
              className={`px-2.5 py-1 rounded-xl text-xs font-mono font-medium flex items-center gap-1.5 transition-all ${
                layerRisk
                  ? "bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40"
                  : "bg-white/[0.03] text-[#8E9893] border border-transparent hover:text-white"
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Riesgo en Ruta</span>
            </button>

            <button
              onClick={() => setLayerCoverage(!layerCoverage)}
              className={`px-2.5 py-1 rounded-xl text-xs font-mono font-medium flex items-center gap-1.5 transition-all ${
                layerCoverage
                  ? "bg-[#3B82F6]/20 text-[#60A5FA] border border-[#3B82F6]/40"
                  : "bg-white/[0.03] text-[#8E9893] border border-transparent hover:text-white"
              }`}
            >
              <Radio className="w-3 h-3" />
              <span>Cobertura Bodegas</span>
            </button>
          </div>

          {/* OSRM Status & Legend (Bottom-Right Corner) */}
          <div className="hidden sm:flex absolute bottom-4 right-4 z-20 items-center gap-3 px-3 py-1.5 rounded-2xl bg-[#0A0F0C]/95 border border-white/[0.1] backdrop-blur-xl text-[10px] font-mono text-[#8E9893]">
            <span className="flex items-center gap-1 text-[#34D399]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              Ruta Primaria OSRM
            </span>
            <span className="flex items-center gap-1 text-[#F59E0B]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
              Incidencia Vial
            </span>
          </div>
        </div>

        {/* ------------------------------------------------------- */}
        {/* PANEL DERECHO (35%): CONSOLA DEL transporteSpecialist   */}
        {/* ------------------------------------------------------- */}
        <div className="w-full lg:w-[35%] xl:w-[460px] h-full bg-[#0A0F0C] flex flex-col justify-between overflow-hidden relative z-10 shadow-2xl min-h-0">
          {/* Subtle Top-Edge Radial Highlight */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-32 opacity-35"
            style={{
              background:
                "radial-gradient(60% 50% at 50% 0%, rgba(16, 185, 129, 0.16) 0%, transparent 100%)",
            }}
          />

          {/* Header de la Consola: Selector de Pestañas Superiores */}
          <div className="p-4 border-b border-white/[0.06] bg-[#070B08]/60 backdrop-blur-md shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-[#10B981]" />
                <span className="text-xs font-bold tracking-tight text-[#F9FAFB] uppercase">
                  Consola de Transporte
                </span>
              </div>
              <span className="font-mono text-[10px] text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded-full border border-[#10B981]/25">
                transporteSpecialist
              </span>
            </div>

            {/* Pestañas: Envíos Activos | Optimizador de Rutas */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <button
                onClick={() => setActiveTab("envios")}
                className={`py-1.5 px-3 rounded-lg text-xs font-mono font-medium transition-all flex items-center justify-center gap-2 ${
                  activeTab === "envios"
                    ? "bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30 shadow-sm"
                    : "text-[#8E9893] hover:text-[#F9FAFB]"
                }`}
              >
                <span>Envíos Activos</span>
                <span className="text-[10px] bg-black/40 px-1.5 py-0.2 rounded-full border border-white/10 text-white">
                  {shipments.filter((s) => s.status === "en_transito").length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("optimizador")}
                className={`py-1.5 px-3 rounded-lg text-xs font-mono font-medium transition-all flex items-center justify-center gap-2 ${
                  activeTab === "optimizador"
                    ? "bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30 shadow-sm"
                    : "text-[#8E9893] hover:text-[#F9FAFB]"
                }`}
              >
                <Sparkles className="w-3 h-3 text-[#34D399]" />
                <span>Optimizador Rutas</span>
              </button>
            </div>
          </div>

          {/* Body: Lista de Despachos o Vista de Optimización */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar min-h-0">
            {activeTab === "envios" ? (
              <>
                {shipments.map((shipment) => {
                  const isSelected = selectedShipmentId === shipment.id;
                  const isEnTransito = shipment.status === "en_transito";
                  const hasRisk = !!shipment.riskAlert && !shipment.riskAlert.isRerouted;

                  return (
                    <motion.div
                      key={shipment.id}
                      onClick={() => setSelectedShipmentId(shipment.id)}
                      layout
                      className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                        isSelected
                          ? "bg-[#070B08] border-[#10B981]/40 shadow-[0_0_20px_rgba(16,185,129,0.12)]"
                          : "bg-white/[0.02] border-white/[0.06] hover:border-white/15 hover:bg-white/[0.04]"
                      }`}
                    >
                      {/* Top Bar: Code, Status & Plates */}
                      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-white/[0.05]">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#F9FAFB] group-hover:text-[#34D399] transition-colors">
                              {shipment.shipmentCode}
                            </span>
                            <span className="text-white/20">·</span>
                            <span className="text-[11px] font-mono text-[#8E9893]">
                              {shipment.vehiclePlate}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-[#EDF3EE] mt-0.5">
                            {shipment.origin.replace("Bodega Matriz ", "").replace("CD ", "")} →{" "}
                            {shipment.destination.replace("CD ", "")}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          {isEnTransito ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#10B981]/10 border border-[#10B981]/30 text-[#34D399] text-[10px] font-mono">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                              En tránsito
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/15 text-[#8E9893] text-[10px] font-mono">
                              <CheckCircle2 className="w-2.5 h-2.5 text-[#10B981]" />
                              Entregado
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-[#8E9893]">
                            {shipment.distanceKm} km
                          </span>
                        </div>
                      </div>

                      {/* Milestone Timeline (Origen -> Checkpoint -> Destino) */}
                      <div className="mt-3 space-y-2 relative pl-3.5 before:absolute before:left-[5px] before:top-2 before:bottom-2 before:w-0.5 before:bg-white/[0.08]">
                        {shipment.milestones.map((m, idx) => (
                          <div key={idx} className="relative flex items-start gap-2.5 text-xs">
                            <span
                              className={`absolute -left-[14px] top-1 w-2 h-2 rounded-full border ${
                                m.status === "completed"
                                  ? "bg-[#10B981] border-[#10B981]"
                                  : m.status === "current"
                                  ? "bg-[#F59E0B] border-[#F59E0B] shadow-[0_0_6px_#F59E0B] animate-pulse"
                                  : "bg-[#050806] border-white/30"
                              }`}
                            />
                            <div className="flex-1 flex items-baseline justify-between">
                              <span
                                className={`text-[11px] truncate max-w-[210px] ${
                                  m.status === "current"
                                    ? "text-[#F9FAFB] font-semibold"
                                    : "text-[#8E9893]"
                                }`}
                              >
                                {m.location}
                              </span>
                              <span className="text-[10px] font-mono text-[#586B5F] shrink-0">
                                {m.time}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Metrics: Cost/km, Payload & Efficiency */}
                      <div className="mt-3.5 pt-2.5 border-t border-white/[0.05] grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                          <span className="text-[9px] uppercase text-[#8E9893] block">
                            Costo / km OSRM
                          </span>
                          <span className="font-bold text-[#F9FAFB]">
                            ${shipment.costPerKmCop.toLocaleString("es-CO")} COP
                          </span>
                        </div>

                        <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                          <span className="text-[9px] uppercase text-[#8E9893] block">
                            Carga & Volumen
                          </span>
                          <span className="font-bold text-[#10B981]">
                            {shipment.payloadKg} kg ({shipment.volumePct}%)
                          </span>
                        </div>
                      </div>

                      {/* Autonomous Agent Alert & Re-route Option */}
                      {shipment.riskAlert && (
                        <div className="mt-3 p-3 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 space-y-2">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B] shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                              <span className="text-xs font-bold text-[#F9FAFB] block">
                                {shipment.riskAlert.title}
                              </span>
                              <p className="text-[11px] text-[#EDF3EE]/80 leading-relaxed">
                                {shipment.riskAlert.description}
                              </p>
                            </div>
                          </div>

                          {/* Action Button: Re-enrutar con IA */}
                          {!shipment.riskAlert.isRerouted && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRerouteAI(shipment.id);
                              }}
                              disabled={isRerouting}
                              className="w-full mt-1 py-1.5 px-3 rounded-xl bg-[#10B981] hover:bg-[#34D399] text-[#050806] font-mono text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)] flex items-center justify-center gap-1.5"
                            >
                              {isRerouting ? (
                                <>
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                  <span>Recalculando con IA...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>Re-enrutar con IA en 1-Clic</span>
                                </>
                              )}
                            </button>
                          )}

                          {shipment.riskAlert.isRerouted && (
                            <div className="text-[10px] font-mono text-[#34D399] flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              <span>{shipment.riskAlert.alternateRouteName} activo.</span>
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </>
            ) : (
              /* Pestaña: Optimizador de Rutas */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-[#070B08] border border-white/[0.08] space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#34D399]" />
                    <h3 className="text-xs font-bold text-[#F9FAFB] uppercase">
                      Motor de Consolidación OSRM
                    </h3>
                  </div>
                  <p className="text-xs text-[#8E9893] leading-relaxed">
                    El agente analiza órdenes de compra pendientes para consolidar carga y calcular fletes mínimos entre Santander, Bogotá y Antioquia.
                  </p>

                  <div className="space-y-2 pt-2 border-t border-white/[0.06] text-xs font-mono">
                    <div className="flex justify-between text-[#8E9893]">
                      <span>Órdenes pendientes por agrupar:</span>
                      <span className="text-[#F9FAFB] font-bold">6 órdenes</span>
                    </div>
                    <div className="flex justify-between text-[#8E9893]">
                      <span>Peso bruto acumulado:</span>
                      <span className="text-[#F9FAFB] font-bold">4.280 kg</span>
                    </div>
                    <div className="flex justify-between text-[#8E9893]">
                      <span>Ahorro proyectado vs flete individual:</span>
                      <span className="text-[#34D399] font-bold">$740.000 COP</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      showToast(
                        "transporteSpecialist: Nueva propuesta de consolidación RUTA-BGA-BOG formulada y vinculada a /inbox."
                      );
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-[#10B981] hover:bg-[#34D399] text-[#050806] font-mono text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)] flex items-center justify-center gap-2 mt-2"
                  >
                    <Route className="w-3.5 h-3.5" />
                    <span>Consolidar Ruta Óptima OSRM</span>
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2 text-xs font-mono">
                  <span className="text-[#8E9893] block text-[10px] uppercase">
                    Parámetros de Gobernanza Logística
                  </span>
                  <div className="flex justify-between">
                    <span className="text-[#8E9893]">Tiempo máximo de espera:</span>
                    <span className="text-[#EDF3EE]">24h para consolidar</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8E9893]">Cubicaje mínimo meta:</span>
                    <span className="text-[#34D399]">75% capacidad camión</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8E9893]">Corredor crítico:</span>
                    <span className="text-[#F59E0B]">Pescadero - Tunja</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer de la Consola: Conductor y Contacto Rápido */}
          <div className="p-3.5 border-t border-white/[0.06] bg-[#070B08]/80 backdrop-blur-md shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#10B981]/15 border border-[#10B981]/30 flex items-center justify-center text-xs font-mono text-[#34D399]">
                {selectedShipment.driver.charAt(0)}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-[#F9FAFB]">
                  {selectedShipment.driver}
                </span>
                <span className="text-[10px] font-mono text-[#8E9893]">
                  {selectedShipment.vehiclePlate} · {selectedShipment.vehicleType}
                </span>
              </div>
            </div>

            <button
              onClick={() => showToast(`Llamando al conductor ${selectedShipment.driver} (${selectedShipment.phone})...`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-mono text-[#F9FAFB] transition-all"
            >
              <PhoneCall className="w-3 h-3 text-[#10B981]" />
              <span>Contactar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
