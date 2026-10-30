import React, { useState, useMemo, useEffect, useCallback } from "react";
import { api, type ShipmentListItem } from "../../services/apiClient";
import { PageHeader } from "../ui/PageHeader";
import { SegmentedTabs, TabItem } from "../ui/SegmentedTabs";
import { MetricStrip, MetricItem } from "../ui/MetricStrip";
import { StatusIndicator, OperationalStatus } from "../ui/StatusIndicator";
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";
import { Dialog } from "../ui/Dialog";
import { EmptyState } from "../ui/EmptyState";

export interface LogisticsRoutesViewProps {
  onNavigateTo?: (tabId: string) => void;
}



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
    shipmentCode: "ENV-2026-904",
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
        sensorSource: "Telemetría GPS del vehículo + Estación meteorológica regional",
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
          "Permitido por la política de desvíos menores (costo adicional inferior a $100.000 COP sin requerir aprobación de la junta).",
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
    shipmentCode: "ENV-2026-882",
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
    shipmentCode: "ENV-2026-915",
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

/** Traduce el estado del API al estado de presentación de la vista. */
function toShipmentStatus(
  status: ShipmentListItem["status"],
): ShipmentRoute["status"] {
  switch (status) {
    case "entregado":
      return "completado";
    case "en_preparacion":
      return "programado";
    default:
      return "en_transito";
  }
}

/**
 * Fusiona el envío del API sobre la semilla visual rica.
 * El backend aporta estado/ETA/progreso reales; la semilla conserva la
 * geometría del mapa, hitos y línea de tiempo cuando el API no los expone.
 */
function mergeShipment(
  seed: ShipmentRoute | undefined,
  live: ShipmentListItem,
): ShipmentRoute {
  const base: ShipmentRoute =
    seed ??
    ({
      ...INITIAL_SHIPMENTS[0],
      id: live.id,
      shipmentCode: live.shipmentCode,
      orderId: live.orderId ?? "",
      origin: live.origin ?? "Origen por confirmar",
      destination: live.destination ?? "Destino por confirmar",
      driver: "Conductor asignado",
      carrier: live.carrier,
    } as ShipmentRoute);

  return {
    ...base,
    id: live.id,
    shipmentCode: live.shipmentCode,
    orderId: live.orderId ?? base.orderId,
    carrier: live.carrier || base.carrier,
    origin: live.origin ?? base.origin,
    destination: live.destination ?? base.destination,
    eta: live.eta || base.eta,
    progressPct: Number.isFinite(live.progressPct)
      ? live.progressPct
      : base.progressPct,
    status: toShipmentStatus(live.status),
  };
}



const formatCop = (value: number) =>
  value.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

const SOURCE_LABEL: Record<TimelineEvent["source"], string> = {
  telemetria: "GPS del vehículo",
  operativo: "Operación",
  inferencia_agente: "Agente",
};

const shipmentView = (s: ShipmentRoute): { status: OperationalStatus; label: string } => {
  if (s.status === "completado") return { status: "ok", label: "Entregado" };
  if (s.status === "programado") return { status: "pending", label: "Programado" };
  if (s.riskAlert && !s.riskAlert.isRerouted) return { status: "attention", label: "Con alerta" };
  if (s.riskAlert?.isRerouted) return { status: "ok", label: "Desvío aplicado" };
  return { status: "progress", label: "En camino" };
};

export const LogisticsRoutesView: React.FC<LogisticsRoutesViewProps> = ({ onNavigateTo }) => {
  const [shipments, setShipments] = useState<ShipmentRoute[]>([]);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string>("");
  const [isRerouteOpen, setIsRerouteOpen] = useState(false);
  const [isRerouting, setIsRerouting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [timelineFilter, setTimelineFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);

  // Hidrata los despachos desde el backend real (`GET /api/shipments`).
  // El API aporta estado, ETA y progreso reales; la semilla visual solo aporta
  // la geometría del mapa, hitos y línea de tiempo cuando el API no los expone.
  // Si el backend no devuelve envíos, la vista muestra su `EmptyState`.
  const loadShipments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.shipments.list();
      const rows = Array.isArray(res.data) ? res.data : [];
      const merged = rows.map((live) =>
        mergeShipment(
          INITIAL_SHIPMENTS.find((s) => s.id === live.id),
          live,
        ),
      );
      setShipments(merged);
      setIsFallback(Boolean(res.isFallback));
      if (!res.success) setError(res.message ?? "No fue posible leer los despachos.");
      setSelectedShipmentId((prev) =>
        merged.some((s) => s.id === prev) ? prev : merged[0]?.id ?? "",
      );
    } catch (err: any) {
      setError(err?.message ?? "Error de red al consultar los despachos.");
      setShipments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadShipments();
  }, [loadShipments]);

  const inventoryTabs: TabItem[] = [
    { id: "inventario", label: "Existencias" },
    { id: "productos", label: "Productos" },
    { id: "rutas_logistica", label: "Rutas y despachos" },
  ];

  const selected = shipments.find((s) => s.id === selectedShipmentId) || shipments[0];
  const view = selected ? shipmentView(selected) : { status: "pending" as OperationalStatus, label: "Sin despachos" };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const handleApproveReroute = () => {
    if (!selected) return;
    const targetId = selected.id;
    const targetPlate = selected.vehiclePlate;
    setIsRerouting(true);
    setTimeout(() => {
      setShipments((prev) =>
        prev.map((s) => {
          if (s.id !== targetId || !s.riskAlert) return s;
          const rec = s.aiRecommendation;
          const newEvent: TimelineEvent = {
            id: "evt-reroute-approved",
            title: "Desvío aprobado",
            time: "10:24 a. m.",
            location: "Pescadero · conexión con San Gil",
            description: "Autorizaste el desvío sugerido por el agente. La nueva ruta se envió al conductor.",
            impact: rec
              ? `Ahorro neto de ${rec.proposedAlternative.netSavingsMinutes} min · combustible +${formatCop(rec.proposedAlternative.fuelCostCop)}`
              : undefined,
            source: "inferencia_agente",
            isCritical: true,
            completed: true,
          };
          return {
            ...s,
            eta: "14:29 p. m. (ahorro de 24 min)",
            speedKmh: 76,
            riskAlert: {
              ...s.riskAlert,
              isRerouted: true,
              title: "Ruta alterna confirmada",
              description: "Desvío activo por la variante de San Gil. Se recuperan 24 min y se evita el tramo lento de Pescadero.",
            },
            timelineEvents: [newEvent, ...s.timelineEvents],
          };
        })
      );
      setIsRerouting(false);
      setIsRerouteOpen(false);
      showToast(`Desvío aprobado: nueva ruta enviada al conductor del vehículo ${targetPlate}.`);
    }, 900);
  };

  const events = useMemo(
    () =>
      selected
        ? timelineFilter === "critical"
          ? selected.timelineEvents.filter((e) => e.isCritical)
          : selected.timelineEvents
        : [],
    [selected, timelineFilter]
  );

  const inTransit = shipments.filter((s) => s.status === "en_transito").length;
  const withAlert = shipments.filter((s) => s.riskAlert && !s.riskAlert.isRerouted && s.status !== "completado").length;
  const delivered = shipments.filter((s) => s.status === "completado").length;
  const totalFreight = shipments.reduce((sum, s) => sum + s.totalFreightCop, 0);

  const metrics: MetricItem[] = [
    { id: "camino", value: String(inTransit), context: "Despachos en camino" },
    {
      id: "alerta",
      value: String(withAlert),
      context: "Con una alerta por resolver",
      auxiliary: withAlert > 0 ? <StatusIndicator status="attention" label="Requiere decisión" /> : undefined,
    },
    { id: "entregados", value: String(delivered), context: "Entregados hoy" },
    { id: "flete", value: formatCop(totalFreight), context: "Flete de los despachos de hoy", highlightBrand: true },
  ];

  const facts: { label: string; value: string }[] = selected
    ? [
      { label: "Llegada estimada", value: selected.eta },
      { label: "Distancia", value: `${selected.distanceKm} km` },
      {
        label: "Carga",
        value: `${selected.payloadKg.toLocaleString("es-CO")} de ${selected.capacityKg.toLocaleString("es-CO")} kg (${selected.volumePct}% del volumen)`,
      },
      { label: "Flete", value: `${formatCop(selected.totalFreightCop)} · ${selected.ordersCount} órdenes` },
      { label: "Ahorro frente a envíos separados", value: formatCop(selected.savingsVsIndividualCop) },
      { label: "Conductor", value: `${selected.driver} · ${selected.phone}` },
      { label: "Vehículo", value: `${selected.vehicleType} · ${selected.vehiclePlate}` },
      { label: "Salida", value: selected.departureTime },
    ]
    : [];

  const rec = selected?.aiRecommendation;
  const alert = selected?.riskAlert;

  return (
    <div className="flex-1 h-full overflow-y-auto bg-canvas text-primary font-sans p-group space-y-group">
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-6 right-8 z-50 px-4 py-2.5 rounded-pill flex items-center gap-3 bg-raised border border-strong text-body text-primary shadow-dialog"
        >
          <span className="w-2 h-2 rounded-pill bg-state-ok" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-secondary hover:text-primary cursor-pointer" title="Cerrar aviso">
            ✕
          </button>
        </div>
      )}

      <PageHeader
        title="Rutas y despachos"
        description="Qué va en camino, cuándo llega y qué necesita tu decisión."
        filterControl={<SegmentedTabs tabs={inventoryTabs} activeTab="rutas_logistica" onChange={(id) => onNavigateTo?.(id)} />}
      />

      <MetricStrip items={metrics} />

      {isFallback && (
        <div className="rounded-container border border-border bg-state-attention-surface px-element py-compact text-caption text-state-attention">
          Mostrando despachos de referencia: el servicio de rutas no respondió. Los datos pueden no reflejar el estado real de la flota.
        </div>
      )}

      {error && (
        <div className="rounded-container border border-border bg-state-error-surface px-element py-compact text-caption text-state-error flex flex-wrap items-center justify-between gap-compact">
          <span>{error}</span>
          <Button variant="secondary" onClick={() => void loadShipments()}>
            Reintentar
          </Button>
        </div>
      )}

      {loading && shipments.length === 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-group items-start" aria-busy="true" aria-label="Cargando despachos">
          <div className="h-96 rounded-container bg-raised animate-pulse" />
          <div className="space-y-group">
            <div className="h-40 rounded-container bg-raised animate-pulse" />
            <div className="h-56 rounded-container bg-raised animate-pulse" />
          </div>
        </div>
      ) : shipments.length === 0 ? (
        <div className="py-group">
          <EmptyState
            title="Sin despachos registrados"
            description="El backend no devolvió rutas activas para esta empresa. Cuando el agente planifique un despacho aparecerá aquí con su recorrido y alertas."
            actionLabel="Actualizar"
            onAction={() => void loadShipments()}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-group items-start">
          <Panel className="p-0 overflow-hidden">
            <h2 className="px-group py-element text-section-title font-bold border-b border-border">Despachos de hoy</h2>
            <ul className="divide-y divide-border">
              {shipments.map((s) => {
                const v = shipmentView(s);
                const isActive = s.id === selected?.id;
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => setSelectedShipmentId(s.id)}
                      aria-current={isActive}
                      className={`w-full text-left px-group py-element space-y-compact cursor-pointer transition-colors ${isActive ? "bg-raised border-l-2 border-brand" : "hover:bg-raised/50 border-l-2 border-transparent"
                        }`}
                    >
                      <div className="flex items-center justify-between gap-compact">
                        <span className="font-mono text-caption text-primary">{s.shipmentCode}</span>
                        <StatusIndicator status={v.status} label={v.label} />
                      </div>
                      <p className="text-body font-medium text-primary">
                        {s.originCode} → {s.destinationCode}
                      </p>
                      <p className="text-caption text-secondary">{s.eta}</p>
                      <div className="h-1.5 rounded-pill bg-canvas overflow-hidden" role="progressbar" aria-valuenow={s.progressPct} aria-valuemin={0} aria-valuemax={100} aria-label="Avance del recorrido">
                        <div className="h-full rounded-pill bg-brand" style={{ width: `${s.progressPct}%` }} />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <div className="space-y-group min-w-0">
            <Panel className="space-y-element">
              <div className="flex flex-wrap items-start justify-between gap-element">
                <div>
                  <h2 className="text-section-title font-bold">
                    {selected?.origin} → {selected?.destination}
                  </h2>
                  <p className="text-caption text-secondary mt-hairline">
                    <span className="font-mono">{selected?.shipmentCode}</span> · {selected?.carrier}
                  </p>
                </div>
                <StatusIndicator status={view.status} label={view.label} />
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-group gap-y-element">
                {facts.map((f) => (
                  <div key={f.label}>
                    <dt className="text-label text-secondary">{f.label}</dt>
                    <dd className="text-body text-primary tabular-nums">{f.value}</dd>
                  </div>
                ))}
              </dl>
            </Panel>

            {alert && (
              <Panel className="space-y-element">
                <div className="flex flex-wrap items-start justify-between gap-element">
                  <div className="max-w-[72ch]">
                    <StatusIndicator
                      status={alert.isRerouted ? "ok" : "attention"}
                      label={alert.isRerouted ? "Resuelto" : alert.severity === "alta" ? "Alerta alta" : "Alerta media"}
                    />
                    <h3 className="text-body font-bold mt-compact">{alert.title}</h3>
                    <p className="text-body text-secondary mt-hairline">{alert.description}</p>
                  </div>
                  {!alert.isRerouted && rec && (
                    <Button onClick={() => setIsRerouteOpen(true)}>Revisar desvío</Button>
                  )}
                </div>
                {!alert.isRerouted && rec && (
                  <p className="text-caption text-secondary">
                    El agente propone «{rec.proposedAlternative.routeName}»: ahorra {rec.proposedAlternative.netSavingsMinutes} min y cuesta {formatCop(rec.proposedAlternative.fuelCostCop)} más en combustible.
                  </p>
                )}
              </Panel>
            )}

            <Panel className="space-y-element">
              <h3 className="text-section-title font-bold">Recorrido</h3>
              <ol className="space-y-element">
                {(selected?.milestones ?? []).map((m) => (
                  <li key={m.label + m.time} className="flex items-start gap-element">
                    <span
                      className={`mt-1 w-2.5 h-2.5 rounded-pill flex-shrink-0 ${m.status === "completed" ? "bg-state-ok" : m.status === "current" ? "bg-brand" : "border border-strong"
                        }`}
                    />
                    <div className="flex-1 flex flex-wrap justify-between gap-compact">
                      <div>
                        <p className={`text-body ${m.status === "pending" ? "text-secondary" : "text-primary font-medium"}`}>{m.label}</p>
                        <p className="text-caption text-secondary">{m.location}</p>
                      </div>
                      <span className="text-caption text-secondary tabular-nums">{m.time}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </Panel>

            <Panel className="space-y-element">
              <div className="flex flex-wrap items-center justify-between gap-element">
                <h3 className="text-section-title font-bold">Historial del despacho</h3>
                <SegmentedTabs
                  tabs={[
                    { id: "all", label: "Todo" },
                    { id: "critical", label: "Solo críticos" },
                  ]}
                  activeTab={timelineFilter}
                  onChange={setTimelineFilter}
                />
              </div>
              {events.length === 0 ? (
                <p className="text-body text-secondary">Este despacho no tiene eventos críticos.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {events.map((e) => (
                    <li key={e.id} className="py-element flex gap-group">
                      <span className="w-28 flex-shrink-0 text-caption text-secondary tabular-nums">{e.time}</span>
                      <div className="min-w-0">
                        <p className="text-body font-medium text-primary">{e.title}</p>
                        <p className="text-body text-secondary max-w-[72ch]">{e.description}</p>
                        {e.impact && <p className="text-caption text-secondary mt-hairline">{e.impact}</p>}
                        <p className="text-caption text-muted mt-hairline">
                          {SOURCE_LABEL[e.source]} · {e.location}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}

      <Dialog
        isOpen={isRerouteOpen && !!rec}
        onClose={() => setIsRerouteOpen(false)}
        title="Aprobar desvío"
        description={rec ? rec.proposedAlternative.routeName : undefined}
        confirmLabel="Aprobar desvío"
        onConfirm={handleApproveReroute}
        isProcessing={isRerouting}
      >
        {rec && (
          <div className="space-y-element">
            <div>
              <p className="text-label text-secondary">Qué pasó</p>
              <p className="text-body">
                {rec.detectedIssue.title}. {rec.detectedIssue.description}
              </p>
            </div>
            <div className="rounded-control bg-panel border border-border p-element space-y-compact text-body">
              <div className="flex justify-between">
                <span className="text-secondary">Tiempo recuperado</span>
                <span className="tabular-nums font-medium">{rec.proposedAlternative.netSavingsMinutes} min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Kilómetros adicionales</span>
                <span className="tabular-nums font-medium">{rec.proposedAlternative.extraKm} km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Combustible adicional</span>
                <span className="tabular-nums font-medium">{formatCop(rec.proposedAlternative.fuelCostCop)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Confianza del agente</span>
                <span className="tabular-nums font-medium">{Math.round(rec.proposedAlternative.confidenceScore * 100)}%</span>
              </div>
            </div>
            <p className="text-caption text-secondary">{rec.proposedAlternative.policyNote}</p>
          </div>
        )}
      </Dialog>
    </div>
  );
};


