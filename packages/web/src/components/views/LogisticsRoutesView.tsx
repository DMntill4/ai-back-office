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
  X,
  Eye,
  FileText,
  Activity,
  ArrowRight,
} from "lucide-react";

export interface Milestone {
  label: string;
  location: string;
  time: string;
  status: "completed" | "current" | "pending";
}

export interface TimelineEvent {
  id: string;
  title: string;
  time: string;
  location: string;
  description: string;
  impact?: string;
  source: "telemetria" | "operativo" | "inferencia_agente";
  isCritical?: boolean;
  completed: boolean;
}

export interface AiRerouteRecommendation {
  detectedIssue: {
    title: string;
    description: string;
    location: string;
    speedReductionKmh: number;
    delayMinutes: number;
    sensorSource: string;
  };
  proposedAlternative: {
    routeName: string;
    via: string;
    timeDelta: string;
    netSavingsMinutes: number;
    extraKm: number;
    fuelCostCop: number;
    confidenceScore: number;
    policyNote: string;
  };
}

export interface ShipmentRoute {
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
    delayMinutes: number;
    isRerouted?: boolean;
    alternateRouteName?: string;
  };
  aiRecommendation?: AiRerouteRecommendation;
  milestones: Milestone[];
  timelineEvents: TimelineEvent[];
  curvePathCompleted: string;
  curvePathPending: string;
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
    eta: "14:15 p. m. (3h 42m restantes)",
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
        "Pavimento húmedo y reducción de velocidad a 24 km/h en km 42. Retraso proyectado de +38 min sobre la ventana acordada.",
      severity: "alta",
      delayMinutes: 38,
    },
    aiRecommendation: {
      detectedIssue: {
        title: "Pavimento Húmedo & Curvas de Montaña (Km 42)",
        description:
          "La velocidad nominal cayó de 68 km/h a 24 km/h en el descenso de Pescadero debido a fuertes precipitaciones.",
        location: "Cañón del Chicamocha Km 42 (Pescadero - Aratoca)",
        speedReductionKmh: 44,
        delayMinutes: 38,
        sensorSource: "Telemetría CAN-bus GPS + Estación meteorológica IDEAM",
      },
      proposedAlternative: {
        routeName: "Variante San Gil → Tunja → Chiquinquirá → Bogotá",
        via: "Corredor Troncal San Gil - Barbosa",
        timeDelta: "-24 min",
        netSavingsMinutes: 24,
        extraKm: 18,
        fuelCostCop: 69300,
        confidenceScore: 0.94,
        policyNote:
          "Permitido por política POL-LOG-02 (Costo adicional < $100.000 COP sin requerir escalamiento a junta).",
      },
    },
    curvePathCompleted: "M 520 110 Q 485 180, 455 250",
    curvePathPending: "M 455 250 Q 425 345, 390 440",
    reroutedCurvePath: "M 455 250 C 400 240, 340 330, 390 440",
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
        id: "evt-01",
        title: "Despacho de Mercancía Confirmado",
        time: "06:30 a. m.",
        location: "Bodega Matriz Bucaramanga, Santander",
        description: "14 órdenes de compra consolidadas y precinto digital auditado.",
        impact: "Salida puntual en ventana de despacho",
        source: "operativo",
        isCritical: false,
        completed: true,
      },
      {
        id: "evt-02",
        title: "Paso por Peaje Río Negro / Curití",
        time: "07:45 a. m.",
        location: "Corredor Santander - Boyacá",
        description: "Telemetría satelital nominal a 68 km/h. Peso verificado en báscula: 3.450 kg.",
        impact: "Carga dentro de tolerancia reglamentaria",
        source: "telemetria",
        isCritical: false,
        completed: true,
      },
      {
        id: "evt-03",
        title: "Alerta Climática en Pescadero (Km 42)",
        time: "10:14 a. m.",
        location: "Cañón del Chicamocha Km 42",
        description: "Lluvia torrencial. Reducción de velocidad a 24 km/h en curvas descendentes.",
        impact: "Retraso proyectado de +38 min respecto a ETA original",
        source: "inferencia_agente",
        isCritical: true,
        completed: true,
      },
      {
        id: "evt-04",
        title: "Arribo Estimado a Muelle Fontibón",
        time: "14:15 p. m. (Estimado)",
        location: "CD Bogotá D.C., Cundinamarca",
        description: "Equipo de descarga y validación de inventario asignado en bodega central.",
        impact: "Sujeto a resolución de alerta vial en Pescadero",
        source: "operativo",
        isCritical: true,
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
    eta: "13:45 p. m. (4h 20m restantes)",
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
    curvePathCompleted: "M 390 440 C 330 425, 290 380, 275 360",
    curvePathPending: "M 275 360 C 255 340, 230 325, 210 310",
    vehicleCoord: { x: 275, y: 360 },
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
        id: "evt-201",
        title: "Salida de Muelle Bogotá Central",
        time: "07:15 a. m.",
        location: "CD Bogotá D.C.",
        description: "Carga consolidada de herramientas industriales y fijaciones.",
        impact: "Despacho en horario previsto",
        source: "operativo",
        isCritical: false,
        completed: true,
      },
      {
        id: "evt-202",
        title: "Paso por Cruce Alto del Trigo",
        time: "09:50 a. m.",
        location: "Vía Bogotá - Honda - Medellín",
        description: "Condiciones de tránsito normales. Telemetría GPS a 74 km/h.",
        impact: "Velocidad constante y clima seco",
        source: "telemetria",
        isCritical: false,
        completed: true,
      },
      {
        id: "evt-203",
        title: "Arribo Estimado a Itagüí",
        time: "13:45 p. m. (Estimado)",
        location: "CD Medellín Industrial",
        description: "Descarga prioritaria para reabastecer stock de seguridad.",
        impact: "Sin incidencias detectadas",
        source: "operativo",
        isCritical: false,
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
    curvePathCompleted: "M 520 110 Q 535 118, 545 125",
    curvePathPending: "M 545 125 Q 545 125, 545 125",
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
        id: "evt-301",
        title: "Salida de Bodega Chimitá",
        time: "08:00 a. m.",
        location: "Bucaramanga Matriz",
        description: "Despacho de pernos de anclaje de alta resistencia y discos diamantados.",
        impact: "Despacho local completado",
        source: "operativo",
        isCritical: false,
        completed: true,
      },
      {
        id: "evt-302",
        title: "Recepción y Conciliación Física en Obra",
        time: "09:40 a. m.",
        location: "Obra Girón - Santander",
        description: "Firma digital del residente de obra y remisión sellada con precinto.",
        impact: "Orden cerrada exitosamente",
        source: "operativo",
        isCritical: false,
        completed: true,
      },
    ],
  },
];

export const LogisticsRoutesView: React.FC = () => {
  const [shipments, setShipments] = useState<ShipmentRoute[]>(INITIAL_SHIPMENTS);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string>("ship_01");

  // Map layers
  const [layerFleet, setLayerFleet] = useState(true);
  const [layerRisk, setLayerRisk] = useState(true);
  const [layerCoverage, setLayerCoverage] = useState(false);
  const [mapMode, setMapMode] = useState<"vector" | "satelite">("vector");

  // Reroute & AI explanation modal state
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [previewAlternativeRoute, setPreviewAlternativeRoute] = useState(false);
  const [isReroutingAction, setIsReroutingAction] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Timeline filter state
  const [timelineFilter, setTimelineFilter] = useState<"all" | "critical">("all");

  const currentIndex = shipments.findIndex((s) => s.id === selectedShipmentId);
  const selectedShipment = shipments[currentIndex] || shipments[0];

  const handlePrevShipment = () => {
    const prevIdx = (currentIndex - 1 + shipments.length) % shipments.length;
    setSelectedShipmentId(shipments[prevIdx].id);
    setPreviewAlternativeRoute(false);
  };

  const handleNextShipment = () => {
    const nextIdx = (currentIndex + 1) % shipments.length;
    setSelectedShipmentId(shipments[nextIdx].id);
    setPreviewAlternativeRoute(false);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const handleApproveReroute = () => {
    setIsReroutingAction(true);
    setTimeout(() => {
      setShipments((prev) =>
        prev.map((s) => {
          if (s.id === selectedShipment.id) {
            const updatedAlert = s.riskAlert
              ? {
                  ...s.riskAlert,
                  isRerouted: true,
                  title: "Ruta alterna con IA confirmada",
                  description:
                    "Desvío activo por Variante San Gil. Se recuperan 24 min y se elude el tramo lento de Pescadero km 42.",
                  alternateRouteName: "Variante San Gil → Tunja → Bogotá",
                }
              : undefined;

            const updatedMilestones: Milestone[] = [
              s.milestones[0],
              s.milestones[1],
              {
                label: "Desvío IA Activo",
                location: "Variante San Gil • Tramo Alterno",
                time: "10:28 a. m.",
                status: "current",
              },
              {
                ...s.milestones[3],
                time: "14:29 p. m. (Recuperado)",
              },
            ];

            const newEvent: TimelineEvent = {
              id: "evt-reroute-approved",
              title: "Re-enrutamiento Autónomo Aprobado",
              time: "10:24 a. m.",
              location: "Pescadero • Conexión San Gil",
              description:
                "Operador autorizó desvío sugerido por Mint. Coordenadas telemáticas enviadas a cabina del vehículo.",
              impact: "Ahorro neto de 24 min · Costo combustible +$69.300 COP",
              source: "inferencia_agente",
              isCritical: true,
              completed: true,
            };

            return {
              ...s,
              eta: "14:29 p. m. (Ahorro de 24 min)",
              speedKmh: 76,
              curvePathPending: s.reroutedCurvePath || s.curvePathPending,
              riskAlert: updatedAlert,
              milestones: updatedMilestones,
              timelineEvents: [newEvent, ...s.timelineEvents],
            };
          }
          return s;
        })
      );
      setIsReroutingAction(false);
      setIsAiModalOpen(false);
      setPreviewAlternativeRoute(false);
      showToast(
        "Ruta alternativa activada: Instrucción telemática enviada al conductor WFL-892."
      );
    }, 900);
  };

  const filteredTimelineEvents = useMemo(() => {
    if (timelineFilter === "critical") {
      return selectedShipment.timelineEvents.filter((e) => e.isCritical);
    }
    return selectedShipment.timelineEvents;
  }, [selectedShipment, timelineFilter]);

  return (
    <div className="flex-1 h-full flex flex-col bg-canvas text-[#F9FAFB] font-sans select-none overflow-hidden relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            className="fixed top-5 right-8 z-50 px-4 py-2.5 rounded-xl flex items-center gap-3 bg-[#0A160E] border border-emerald-500/40 text-emerald-300 shadow-[0_8px_30px_rgba(0,0,0,0.6)] backdrop-blur-xl"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-mono font-medium">{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-zinc-500 hover:text-white text-xs ml-1"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* HEADER SUPERIOR EJECUTIVO Y COMPACTO                      */}
      {/* ========================================================= */}
      <header className="px-6 py-3 bg-[#090D0B] border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase text-zinc-500">
              Operaciones
            </span>
            <span className="text-white/20">/</span>
            <h1 className="text-lg font-bold text-white tracking-tight">
              Control de Rutas & Despachos
            </h1>
          </div>
          <span className="text-zinc-500 font-mono text-xs hidden md:inline">
            · Monitoreo Telemático en Vivo
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Selector de Envíos Integrado y Explícito */}
          <div className="flex items-center bg-surface-1 rounded-xl border border-white/[0.08] px-2 py-1 gap-2">
            <button
              onClick={handlePrevShipment}
              className="p-1 hover:bg-white/[0.08] rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Envío anterior"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-mono text-zinc-300 px-1 whitespace-nowrap">
              Envío <strong>{currentIndex + 1}</strong> de {shipments.length}
            </span>
            <button
              onClick={handleNextShipment}
              className="p-1 hover:bg-white/[0.08] rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Envío siguiente"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Estado de GPS Activo */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-xl bg-surface-1 border border-white/[0.06] text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-zinc-300">
              3 Unidades Conectadas
            </span>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* SPLIT SCREEN 50 / 50: OPERACIÓN (IZQ) vs MAPA (DER)        */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative min-h-0">
        {/* ------------------------------------------------------- */}
        {/* PANEL IZQUIERDO: OPERACIÓN Y DOSSIER DE ENVÍO           */}
        {/* ------------------------------------------------------- */}
        <div className="w-full lg:w-1/2 h-full bg-canvas overflow-y-auto p-6 flex flex-col gap-4 border-b lg:border-b-0 lg:border-r border-white/[0.06]">
          {/* Fila 1: Encabezado Compacto y Jerarquizado */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/[0.06]">
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-1">
                <span className="text-xl font-bold tracking-tight text-white font-mono">
                  {selectedShipment.shipmentCode}
                </span>

                {/* Badge de Estado */}
                {selectedShipment.status === "en_transito" ? (
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    En Tránsito
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-blue-500/15 text-blue-300 border border-blue-500/30">
                    Completado
                  </span>
                )}

                {/* Badge de Retraso si aplica */}
                {selectedShipment.riskAlert && !selectedShipment.riskAlert.isRerouted && (
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    +{selectedShipment.riskAlert.delayMinutes} min retraso
                  </span>
                )}

                {selectedShipment.riskAlert?.isRerouted && (
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Ruta Alterna Activa
                  </span>
                )}
              </div>

              {/* Línea Secundaria Discreta */}
              <p className="text-xs text-zinc-500">
                Despachado: <span className="text-zinc-400 font-medium">{selectedShipment.orderDate}</span> · Orden:{" "}
                <span className="text-zinc-300 font-mono">{selectedShipment.orderId}</span>
              </p>
            </div>

            {/* Acciones Jerarquizadas */}
            <div className="flex items-center gap-2">
              <a
                href={`tel:${selectedShipment.phone}`}
                className="px-3 py-1.5 rounded-xl bg-surface-well hover:bg-white/[0.08] text-xs font-medium text-zinc-300 hover:text-white border border-white/[0.06] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <PhoneCall className="w-3.5 h-3.5 text-zinc-400" />
                <span>Contactar Conductor</span>
              </a>

              {selectedShipment.riskAlert && !selectedShipment.riskAlert.isRerouted && (
                <button
                  onClick={() => setIsAiModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>✦ Re-enrutar con IA</span>
                </button>
              )}
            </div>
          </div>

          {/* Fila 2: Tarjeta de Seguimiento Simplificada y Unificada */}
          <div className="bg-surface-1 rounded-2xl p-5 border border-white/[0.06] shadow-lg">
            {/* Origen y Destino */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/[0.06]">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-500" />
                  <span className="text-xs text-zinc-300">
                    {selectedShipment.originAddress}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                  <span className="text-xs text-white font-medium">
                    {selectedShipment.destinationAddress}
                  </span>
                </div>
              </div>

              {/* Placa y Vehículo */}
              <div className="text-right">
                <span className="px-2.5 py-1 rounded-lg bg-surface-well border border-white/[0.06] text-xs font-mono text-zinc-200 inline-flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-emerald-400" />
                  {selectedShipment.vehiclePlate}
                </span>
                <span className="text-[11px] text-zinc-500 block mt-1">
                  {selectedShipment.vehicleType}
                </span>
              </div>
            </div>

            {/* Stepper Horizontal Limpio */}
            <div className="py-4 border-b border-white/[0.06]">
              <div className="relative flex items-center justify-between">
                {/* Línea Base */}
                <div className="absolute top-1/2 left-3 right-3 h-1 bg-white/[0.08] -translate-y-1/2 z-0" />
                <div
                  className="absolute top-1/2 left-3 h-1 bg-emerald-500 -translate-y-1/2 z-0 transition-all duration-500"
                  style={{ width: `${selectedShipment.progressPct * 0.9}%` }}
                />

                {selectedShipment.milestones.map((m, idx) => {
                  const isDone = m.status === "completed";
                  const isCur = m.status === "current";

                  return (
                    <div key={idx} className="relative z-10 flex flex-col items-center">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all ${
                          isDone
                            ? "bg-emerald-500 text-black font-bold"
                            : isCur
                            ? "bg-[#111915] text-emerald-400 border-2 border-emerald-400 font-bold"
                            : "bg-surface-well text-zinc-500 border border-white/10"
                        }`}
                      >
                        {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
                      </div>
                      <span className="text-[10px] font-semibold text-zinc-300 mt-1.5 text-center">
                        {m.label}
                      </span>
                      <span className="text-[9px] font-mono text-zinc-500">
                        {m.time}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Métricas Clave en 3 Columnas (Sin Relleno Innecesario) */}
            <div className="grid grid-cols-3 gap-3 pt-4 text-xs">
              <div>
                <span className="text-[10px] uppercase font-mono text-zinc-500 block">Distancia & Velocidad</span>
                <span className="text-zinc-200 font-semibold">{selectedShipment.distanceKm} km · {selectedShipment.speedKmh} km/h</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono text-zinc-500 block">ETA Programada</span>
                <span className={`font-semibold ${selectedShipment.riskAlert && !selectedShipment.riskAlert.isRerouted ? "text-amber-400" : "text-emerald-400"}`}>
                  {selectedShipment.eta}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono text-zinc-500 block">Carga & Capacidad</span>
                <span className="text-zinc-200 font-semibold">{selectedShipment.payloadKg} kg ({selectedShipment.volumePct}%)</span>
              </div>
            </div>
          </div>

          {/* Fila 3: Banner de Alerta con CTA para abrir Explicación de IA */}
          {selectedShipment.riskAlert && (
            <div
              onClick={() => setIsAiModalOpen(true)}
              className={`rounded-2xl p-4 border transition-all cursor-pointer flex items-start gap-3 ${
                selectedShipment.riskAlert.isRerouted
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/15"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-200 hover:bg-amber-500/15"
              }`}
            >
              {selectedShipment.riskAlert.isRerouted ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold">{selectedShipment.riskAlert.title}</span>
                  <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                    Ver análisis <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
                <p className="text-zinc-400 mt-1 leading-relaxed">
                  {selectedShipment.riskAlert.description}
                </p>
              </div>
            </div>
          )}

          {/* Fila 4: Trazabilidad Compacta con Filtros y Origen de Datos */}
          <div className="bg-surface-1 rounded-2xl p-5 border border-white/[0.06] shadow-lg flex-1 flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.06]">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Trazabilidad Cronológica ({filteredTimelineEvents.length})
              </h3>

              {/* Filtro de Eventos */}
              <div className="flex items-center bg-surface-well p-0.5 rounded-lg border border-white/[0.04] text-[10px]">
                <button
                  onClick={() => setTimelineFilter("all")}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    timelineFilter === "all"
                      ? "bg-emerald-500/20 text-emerald-300 font-semibold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setTimelineFilter("critical")}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    timelineFilter === "critical"
                      ? "bg-amber-500/20 text-amber-300 font-semibold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Alertas
                </button>
              </div>
            </div>

            {/* Lista Cronológica Compacta */}
            <div className="relative pl-5 space-y-4 overflow-y-auto pr-1">
              {/* Línea vertical tenue */}
              <div className="absolute left-2 top-2 bottom-2 w-px bg-white/[0.08]" />

              {filteredTimelineEvents.map((evt) => {
                const isAgentInference = evt.source === "inferencia_agente";
                const isTelemetry = evt.source === "telemetria";

                return (
                  <div key={evt.id} className="relative">
                    {/* Punto del evento */}
                    <div
                      className={`absolute -left-5 top-1 w-2.5 h-2.5 rounded-full border ${
                        evt.completed
                          ? isAgentInference
                            ? "bg-amber-400 border-amber-300"
                            : "bg-emerald-400 border-emerald-300"
                          : "bg-surface-well border-zinc-600"
                      }`}
                    />

                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-white">{evt.title}</h4>
                          {/* Badge de Origen */}
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                              isAgentInference
                                ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                                : isTelemetry
                                ? "bg-blue-500/10 text-blue-300 border-blue-500/30"
                                : "bg-white/[0.04] text-zinc-400 border-white/[0.06]"
                            }`}
                          >
                            {isAgentInference
                              ? "Inferencia IA"
                              : isTelemetry
                              ? "Telemetría GPS"
                              : "Registro Operativo"}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500">
                          {evt.time}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-300 mt-0.5">{evt.description}</p>

                      <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-1">
                        <span className="flex items-center gap-1 font-mono">
                          <MapPin className="w-3 h-3 text-zinc-500" />
                          {evt.location}
                        </span>
                        {evt.impact && (
                          <span className="text-zinc-400 italic text-[10px]">
                            {evt.impact}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------- */}
        {/* PANEL DERECHO: CONTEXTO GEOGRÁFICO Y MAPA PROTAGONISTA  */}
        {/* ------------------------------------------------------- */}
        <div className="w-full lg:w-1/2 h-full bg-[#080D0A] relative overflow-hidden flex flex-col justify-between">
          {/* Micro-cuadrícula sutil de fondo */}
          <div
            className="pointer-events-none absolute inset-0 z-0 opacity-15"
            style={{
              backgroundImage:
                "radial-gradient(rgba(16, 185, 129, 0.25) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />

          {/* Coordenadas Geográficas Discretas */}
          <div className="pointer-events-none absolute inset-0 z-1 flex flex-col justify-between p-6 opacity-20 font-mono text-[9px] text-zinc-500">
            <div className="flex justify-between">
              <span>LAT: 07°07'14"N • BUCARAMANGA</span>
              <span>LON: 73°07'22"W</span>
            </div>
            <div className="flex justify-between">
              <span>LAT: 04°36'35"N • BOGOTÁ D.C.</span>
              <span>LON: 74°04'54"W</span>
            </div>
          </div>

          {/* SVG Cartográfico con Jerarquía Nítida */}
          <svg
            className="absolute inset-0 w-full h-full z-2 select-none"
            viewBox="0 0 720 540"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Curvas topográficas muy tenues para no competir con la ruta */}
            <g stroke="rgba(255, 255, 255, 0.025)" fill="none" strokeWidth="0.8">
              <path d="M 100 160 C 180 140, 290 200, 380 150 C 440 110, 540 140, 640 100" />
              <path d="M 90 220 C 190 200, 270 260, 390 220 C 470 180, 560 210, 670 170" />
              <path d="M 120 290 C 210 270, 310 330, 420 280 C 490 240, 580 290, 680 240" />
              <path d="M 140 370 C 240 340, 330 410, 450 360 C 520 310, 610 370, 700 320" />
            </g>

            {/* Cobertura de Bodegas (Opcional por capa) */}
            {layerCoverage && (
              <g fill="none">
                <circle cx="520" cy="110" r="50" stroke="rgba(16, 185, 129, 0.15)" strokeWidth="1" strokeDasharray="3 3" />
                <circle cx="390" cy="440" r="60" stroke="rgba(59, 130, 246, 0.15)" strokeWidth="1" strokeDasharray="3 3" />
              </g>
            )}

            {/* Rutas Primarias */}
            <g fill="none">
              {/* Ruta Principal: Tramo Recorrido (Esmeralda Sólido) */}
              <path
                d={selectedShipment.curvePathCompleted}
                stroke="#10B981"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Ruta Principal: Tramo Pendiente (Azul Frío Tenue) */}
              <path
                d={selectedShipment.curvePathPending}
                stroke="#3B82F6"
                strokeWidth="2.5"
                strokeDasharray={selectedShipment.riskAlert?.isRerouted ? "none" : "5 4"}
                strokeLinecap="round"
                opacity={0.65}
              />

              {/* Ruta Alternativa Sugerida por IA (Línea Punteada Ámbar al Previsualizar) */}
              {(previewAlternativeRoute || selectedShipment.riskAlert?.isRerouted) && selectedShipment.reroutedCurvePath && (
                <path
                  d={selectedShipment.reroutedCurvePath}
                  stroke="#F59E0B"
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              )}

              {/* Ruta Secundaria Bogotá -> Medellín */}
              <path
                d="M 390 440 C 330 425, 290 380, 210 310"
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
            </g>

            {/* Nodos de Ciudades y Bodegas */}
            <g>
              {/* Bucaramanga (Matriz) */}
              <circle cx="520" cy="110" r="6" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
              <text x="532" y="114" fill="#FFFFFF" fontSize="11" fontWeight="700" fontFamily="sans-serif">
                Bucaramanga (Matriz)
              </text>

              {/* Bogotá D.C. (Destino) */}
              <circle cx="390" cy="440" r="7" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="2" />
              <text x="404" y="444" fill="#FFFFFF" fontSize="11" fontWeight="700" fontFamily="sans-serif">
                Bogotá D.C. (CD Central)
              </text>

              {/* Medellín */}
              <circle cx="210" cy="310" r="5" fill="#52525B" stroke="#FFFFFF" strokeWidth="1.5" />
              <text x="222" y="314" fill="#A1A1AA" fontSize="10" fontFamily="sans-serif">
                Medellín (CD Itagüí)
              </text>

              {/* Punto de Incidencia Clima: Pescadero */}
              {layerRisk && selectedShipment.riskAlert && !selectedShipment.riskAlert.isRerouted && (
                <g>
                  <circle cx="455" cy="250" r="18" fill="rgba(245, 158, 11, 0.12)" stroke="#F59E0B" strokeWidth="1" strokeDasharray="3 3" />
                  <circle cx="455" cy="250" r="4" fill="#F59E0B" />
                  <text x="466" y="246" fill="#F59E0B" fontSize="9" fontWeight="600" fontFamily="monospace">
                    Lluvia km 42
                  </text>
                </g>
              )}
            </g>

            {/* Marcador del Vehículo Seleccionado (Limpio, con halo estático sobrio) */}
            {layerFleet && (
              <g>
                <circle
                  cx={selectedShipment.vehicleCoord.x}
                  cy={selectedShipment.vehicleCoord.y}
                  r="12"
                  fill="rgba(16, 185, 129, 0.18)"
                  stroke="rgba(16, 185, 129, 0.4)"
                  strokeWidth="1"
                />
                <circle
                  cx={selectedShipment.vehicleCoord.x}
                  cy={selectedShipment.vehicleCoord.y}
                  r="5"
                  fill="#10B981"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
              </g>
            )}
          </svg>

          {/* Tarjeta Flotante del Vehículo (Compacta y sin ruido) */}
          <div
            className="absolute z-20 pointer-events-auto"
            style={{
              left: `${Math.min(selectedShipment.vehicleCoord.x * 0.82, 380)}px`,
              top: `${Math.min(selectedShipment.vehicleCoord.y * 0.72, 300)}px`,
            }}
          >
            <div className="p-3.5 rounded-xl bg-[#090D0B]/95 border border-white/[0.1] backdrop-blur-xl shadow-xl w-64 text-white">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.08]">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-bold font-mono">
                    {selectedShipment.milestones[2].location}
                  </span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {selectedShipment.speedKmh} km/h
                </span>
              </div>

              <div className="text-xs text-zinc-300 space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Conductor:</span>
                  <span className="font-medium text-white">{selectedShipment.driver} ({selectedShipment.vehiclePlate})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Carga útil:</span>
                  <span className="font-mono text-zinc-200">{selectedShipment.payloadKg} kg ({selectedShipment.volumePct}%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Barra Inferior de Capas y Selector de Modo */}
          <div className="p-4 z-20 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-t from-[#080D0A] to-transparent">
            {/* Toggles de Capas */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-1/90 border border-white/[0.08] backdrop-blur-xl">
              <span className="text-[10px] font-mono uppercase text-zinc-500 px-2 flex items-center gap-1">
                <Layers className="w-3 h-3 text-emerald-400" /> Capas:
              </span>

              <button
                onClick={() => setLayerFleet(!layerFleet)}
                className={`px-2 py-1 rounded-lg text-xs font-mono transition-all ${
                  layerFleet
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Flota Activa
              </button>

              <button
                onClick={() => setLayerRisk(!layerRisk)}
                className={`px-2 py-1 rounded-lg text-xs font-mono transition-all ${
                  layerRisk
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Riesgo Vial
              </button>

              <button
                onClick={() => setLayerCoverage(!layerCoverage)}
                className={`px-2 py-1 rounded-lg text-xs font-mono transition-all ${
                  layerCoverage
                    ? "bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Bodegas
              </button>
            </div>

            {/* Alternar Previsualización de Ruta IA si hay alerta */}
            {selectedShipment.riskAlert && !selectedShipment.riskAlert.isRerouted && (
              <button
                onClick={() => setPreviewAlternativeRoute(!previewAlternativeRoute)}
                className={`px-3 py-1 rounded-xl text-xs font-mono transition-all border flex items-center gap-1.5 ${
                  previewAlternativeRoute
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold"
                    : "bg-surface-1/90 text-zinc-400 border-white/[0.08] hover:text-white"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{previewAlternativeRoute ? "Ocultar Alternativa" : "Comparar Alternativa"}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL / DRAWER DE DECISIÓN EXPLICABLE CON IA (MINT AGENT) */}
      {/* ========================================================= */}
      <AnimatePresence>
        {isAiModalOpen && selectedShipment.aiRecommendation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-2xl bg-[#0B110E] border border-white/[0.1] rounded-2xl p-6 shadow-2xl flex flex-col gap-5 text-white"
            >
              {/* Header del Modal */}
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      Evaluación de Re-enrutamiento Autónomo
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Análisis explicable del Agente Mint para el envío {selectedShipment.shipmentCode} ({selectedShipment.vehiclePlate})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAiModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sección 1: Situación Detectada */}
              <div className="bg-surface-well rounded-xl p-4 border border-white/[0.04] space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold block">
                  1. Situación Observada en Ruta
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-zinc-500 block">Incidente:</span>
                    <span className="text-white font-medium">{selectedShipment.aiRecommendation.detectedIssue.title}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Ubicación:</span>
                    <span className="text-zinc-300 font-mono">{selectedShipment.aiRecommendation.detectedIssue.location}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Impacto en Velocidad:</span>
                    <span className="text-amber-400 font-bold font-mono">
                      Caída de -{selectedShipment.aiRecommendation.detectedIssue.speedReductionKmh} km/h (actual: 24 km/h)
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Retraso Proyectado:</span>
                    <span className="text-amber-400 font-bold font-mono">
                      +{selectedShipment.aiRecommendation.detectedIssue.delayMinutes} minutos sobre ventana pactada
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-zinc-400 pt-1 border-t border-white/[0.04]">
                  Fuente: {selectedShipment.aiRecommendation.detectedIssue.sensorSource}
                </p>
              </div>

              {/* Sección 2: Recomendación de Mint */}
              <div className="bg-surface-well rounded-xl p-4 border border-white/[0.04] space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold block">
                  2. Recomendación Algorítmica de Mint
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-zinc-500 block">Ruta Alterna Sugerida:</span>
                    <span className="text-white font-semibold">{selectedShipment.aiRecommendation.proposedAlternative.routeName}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Tiempo Recuperado:</span>
                    <span className="text-emerald-400 font-bold font-mono">
                      {selectedShipment.aiRecommendation.proposedAlternative.timeDelta} ({selectedShipment.aiRecommendation.proposedAlternative.netSavingsMinutes} min de ahorro)
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Costo / Distancia:</span>
                    <span className="text-zinc-300 font-mono">
                      +{selectedShipment.aiRecommendation.proposedAlternative.extraKm} km · ${selectedShipment.aiRecommendation.proposedAlternative.fuelCostCop.toLocaleString("es-CO")} COP
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-white/[0.04]">
                  <span className="text-zinc-400">
                    Nivel de Confianza: <strong className="text-emerald-400">{(selectedShipment.aiRecommendation.proposedAlternative.confidenceScore * 100).toFixed(0)}%</strong> (basado en historial OSRM)
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500">
                    {selectedShipment.aiRecommendation.proposedAlternative.policyNote}
                  </span>
                </div>
              </div>

              {/* Sección 3: Acciones Disponibles */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <button
                  onClick={() => {
                    setPreviewAlternativeRoute(!previewAlternativeRoute);
                    setIsAiModalOpen(false);
                    showToast(previewAlternativeRoute ? "Ruta alterna oculta en mapa." : "Ruta alterna visualizada en mapa en línea discontinua ámbar.");
                  }}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-surface-well hover:bg-white/[0.08] text-xs font-medium text-zinc-300 hover:text-white border border-white/[0.08] transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 inline mr-1.5" />
                  Previsualizar en Mapa
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setIsAiModalOpen(false)}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl hover:bg-white/[0.06] text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Mantener Ruta Actual
                  </button>

                  <button
                    onClick={handleApproveReroute}
                    disabled={isReroutingAction}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isReroutingAction ? "Transmitiendo..." : "Aprobar y Transmitir Desvío"}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};