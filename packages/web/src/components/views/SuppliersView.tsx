import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  Search,
  Star,
  Clock,
  Percent,
  CheckCircle2,
  AlertTriangle,
  Building,
  Phone,
  Mail,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  FileText,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Layers,
  Filter,
  Check,
  Copy,
  ExternalLink,
  ChevronRight,
  Plus,
  X,
  RefreshCw,
  Scale,
  DollarSign,
  Briefcase,
  SlidersHorizontal,
} from "lucide-react";

interface SupplierOrderHistory {
  poNumber: string;
  itemDescription: string;
  totalCop: number;
  date: string;
  status: "aprobada_hitl" | "autonoma" | "entregada";
  hmacSignature: string;
}

interface SupplierItem {
  id: string;
  name: string;
  legalName: string;
  nit: string;
  category: string;
  categoryCode: "herramientas" | "tornilleria" | "acero" | "soldadura" | "valvulas";
  city: string;
  address: string;
  contactPerson: string;
  contactRole: string;
  phone: string;
  email: string;
  paymentTerms: string;
  activeVolumeCop: number;
  historicalTotalCop: number;
  scoreGlobal: number; // 0 - 100
  leadTimeDays: number;
  leadTimeDeltaPct: number; // e.g. -14 (faster) or +22 (delayed)
  defectRatePct: number;
  status: "homologado" | "observacion" | "bloqueado";
  // 5-axis Radar values (0 - 100)
  radar: {
    precio: number;
    puntualidad: number;
    calidad: number;
    flexibilidad: number;
    riesgoFinanciero: number;
  };
  agentPlaybook: {
    insights: string[];
    negotiationLever: string;
    maxRecommendedOrderCop: number;
  };
  ordersHistory: SupplierOrderHistory[];
}

const SUPPLIERS_DATA: SupplierItem[] = [
  {
    id: "sup_dewalt",
    name: "Ferreterías Unidas Bogotá S.A.S.",
    legalName: "Ferreterías Unidas de Colombia S.A.S.",
    nit: "800.123.456-1",
    category: "Consumibles de corte & discos diamantados",
    categoryCode: "herramientas",
    city: "Bogotá D.C.",
    address: "Calle 13 # 68-45 • Zona Industrial",
    contactPerson: "Andrés Delgado",
    contactRole: "Director de Cuentas Industriales",
    phone: "+57 (601) 745-9920",
    email: "adelgado@ferreteriasunidas.co",
    paymentTerms: "Crédito 30 días • 3.8% descuento pronto pago a 10 días",
    activeVolumeCop: 38450000,
    historicalTotalCop: 142800000,
    scoreGlobal: 96,
    leadTimeDays: 2.0,
    leadTimeDeltaPct: -14,
    defectRatePct: 0.15,
    status: "homologado",
    radar: {
      precio: 94,
      puntualidad: 98,
      calidad: 97,
      flexibilidad: 88,
      riesgoFinanciero: 95,
    },
    agentPlaybook: {
      insights: [
        "Margen de descuento histórico del 4.2% al superar 500 unidades; sugerencia: consolidar compras quincenales de discos diamantados.",
        "Punto de apalancamiento: Pago de contado contra factura a 5 días habilita flete bonificado Bogotá -> Bucaramanga.",
        "Cumplimiento SLA del 98.4% en los últimos 18 despachos.",
      ],
      negotiationLever: "Consolidación de compras de discos y pulidoras para exigir 5% adicional sobre lista mayorista.",
      maxRecommendedOrderCop: 45000000,
    },
    ordersHistory: [
      {
        poNumber: "PO-2026-0089",
        itemDescription: "30u Disco Diamantado 7' Concreto",
        totalCop: 1350000,
        date: "Hoy, 10:18 a. m.",
        status: "aprobada_hitl",
        hmacSignature: "hmac_sha256_9f81a7",
      },
      {
        poNumber: "PO-2026-0062",
        itemDescription: "9u Martillo Demoledor SDS-Max 1500W",
        totalCop: 3780000,
        date: "24 Oct 2026",
        status: "autonoma",
        hmacSignature: "hmac_sha256_11a4e2",
      },
      {
        poNumber: "PO-2026-0041",
        itemDescription: "150u Brocas de Percusión SDS",
        totalCop: 820000,
        date: "18 Oct 2026",
        status: "entregada",
        hmacSignature: "hmac_sha256_44b9d0",
      },
    ],
  },
  {
    id: "sup_bosch",
    name: "Bosch Sistemas Industriales Colombia",
    legalName: "Robert Bosch Colombia S.A.S.",
    nit: "860.002.391-4",
    category: "Rotomartillos & maquinaria pesada",
    categoryCode: "herramientas",
    city: "Medellín",
    address: "Cra 48 # 26-85 • Itagüí Industrial",
    contactPerson: "Mariana Restrepo",
    contactRole: "Gerente Comercial Región Andina",
    phone: "+57 (604) 448-1200",
    email: "mariana.restrepo@co.bosch.com",
    paymentTerms: "Crédito 45 días • Facturación electrónica DIAN",
    activeVolumeCop: 54200000,
    historicalTotalCop: 198000000,
    scoreGlobal: 94,
    leadTimeDays: 2.8,
    leadTimeDeltaPct: -6,
    defectRatePct: 0.3,
    status: "homologado",
    radar: {
      precio: 86,
      puntualidad: 96,
      calidad: 99,
      flexibilidad: 82,
      riesgoFinanciero: 98,
    },
    agentPlaybook: {
      insights: [
        "Descuento de volumen del 5.0% al superar 20 unidades de rotomartillos SDS.",
        "Línea de garantía técnica directa en taller autorizado Bucaramanga.",
        "Órdenes sobre $5.000.000 COP pasan a autorización de operador en /inbox.",
      ],
      negotiationLever: "Exigir kit de carbones de repuesto sin costo por compra de lote de maquinaria.",
      maxRecommendedOrderCop: 60000000,
    },
    ordersHistory: [
      {
        poNumber: "PO-2026-0078",
        itemDescription: "12u Taladro Percutor 20V Brushless",
        totalCop: 5040000,
        date: "26 Oct 2026",
        status: "aprobada_hitl",
        hmacSignature: "hmac_sha256_77c12f",
      },
      {
        poNumber: "PO-2026-0050",
        itemDescription: "4u Esmeril Angular Industrial",
        totalCop: 1140000,
        date: "19 Oct 2026",
        status: "entregada",
        hmacSignature: "hmac_sha256_33f810",
      },
    ],
  },
  {
    id: "sup_mundial",
    name: "Mundial de Tornillos S.A.S.",
    legalName: "Mundial de Tornillos y Tuercas S.A.S.",
    nit: "830.055.912-8",
    category: "Fijación & tornillería estructural Grado 8",
    categoryCode: "tornilleria",
    city: "Bucaramanga",
    address: "Carrera 17 # 45-12 • Centro",
    contactPerson: "Camilo Serrano",
    contactRole: "Jefe de Despachos Regional",
    phone: "+57 (607) 633-8811",
    email: "ventas.santander@mundialdetornillos.com",
    paymentTerms: "Contado contra entrega • 4.2% bonificación retiro en bodega",
    activeVolumeCop: 19800000,
    historicalTotalCop: 65400000,
    scoreGlobal: 98,
    leadTimeDays: 0.9,
    leadTimeDeltaPct: -25,
    defectRatePct: 0.1,
    status: "homologado",
    radar: {
      precio: 96,
      puntualidad: 99,
      calidad: 96,
      flexibilidad: 95,
      riesgoFinanciero: 92,
    },
    agentPlaybook: {
      insights: [
        "Disponibilidad local inmediata en Bucaramanga: entregas el mismo día para pedidos radicados antes de las 11:00 a. m.",
        "Descuento del 22% sobre lista de mostrador gracias al volumen acumulado.",
        "Tasa de rechazo mínima (0.10%) en pernos estructurales.",
      ],
      negotiationLever: "Retiro en bodega central con vehículo propio para capturar el 4.2% de ahorro en flete.",
      maxRecommendedOrderCop: 25000000,
    },
    ordersHistory: [
      {
        poNumber: "PO-2026-0082",
        itemDescription: "1.200u Perno Hexagonal Grado 8 1/2' x 3'",
        totalCop: 3840000,
        date: "27 Oct 2026",
        status: "autonoma",
        hmacSignature: "hmac_sha256_aa910c",
      },
      {
        poNumber: "PO-2026-0033",
        itemDescription: "500u Arandelas Estructurales A325",
        totalCop: 450000,
        date: "14 Oct 2026",
        status: "entregada",
        hmacSignature: "hmac_sha256_88de44",
      },
    ],
  },
  {
    id: "sup_siderurgica",
    name: "Siderúrgica de Santander S.A.S.",
    legalName: "Siderúrgica Industrial de Santander S.A.S.",
    nit: "900.221.789-2",
    category: "Varilla corrugada, perfiles & mallas",
    categoryCode: "acero",
    city: "Piedecuesta",
    address: "Km 3 Vía Piedecuesta • Parque Industrial",
    contactPerson: "Jorge E. Valdivieso",
    contactRole: "Director de Operaciones",
    phone: "+57 (607) 655-3000",
    email: "jvaldivieso@siderurgicasantander.com",
    paymentTerms: "Crédito 30 días • Pagaré comercial registrado",
    activeVolumeCop: 72500000,
    historicalTotalCop: 284000000,
    scoreGlobal: 91,
    leadTimeDays: 3.5,
    leadTimeDeltaPct: 4,
    defectRatePct: 0.85,
    status: "homologado",
    radar: {
      precio: 92,
      puntualidad: 88,
      calidad: 93,
      flexibilidad: 85,
      riesgoFinanciero: 90,
    },
    agentPlaybook: {
      insights: [
        "Sensibilidad alta al costo del alambrón y chatarra internacional.",
        "Se recomienda pactar órdenes de compra trimestrales con fijación de precio techo.",
        "Demora promedio de +0.5 días en servicios de corte a medida.",
      ],
      negotiationLever: "Consolidar entregas de vigas y mallas en un solo viaje de camión doble troque.",
      maxRecommendedOrderCop: 80000000,
    },
    ordersHistory: [
      {
        poNumber: "PO-2026-0069",
        itemDescription: "50u Sierra Circular Industrial 1800W",
        totalCop: 7250000,
        date: "25 Oct 2026",
        status: "aprobada_hitl",
        hmacSignature: "hmac_sha256_31a89c",
      },
    ],
  },
  {
    id: "sup_distribuidora",
    name: "Distribuidora del Centro S.A.S.",
    legalName: "Distribuidora de Soldaduras y Consumibles S.A.S.",
    nit: "901.340.119-0",
    category: "Soldadura E6013 & consumibles de taller",
    categoryCode: "soldadura",
    city: "Bucaramanga",
    address: "Calle 33 # 14-22 • García Rovira",
    contactPerson: "Néstor Flórez",
    contactRole: "Gerente General",
    phone: "+57 (607) 642-1980",
    email: "ventas@districentrobga.com",
    paymentTerms: "Contado • Pago anticipado del 50%",
    activeVolumeCop: 8150000,
    historicalTotalCop: 31200000,
    scoreGlobal: 78,
    leadTimeDays: 5.2,
    leadTimeDeltaPct: 22,
    defectRatePct: 2.4,
    status: "observacion",
    radar: {
      precio: 88,
      puntualidad: 68,
      calidad: 74,
      flexibilidad: 70,
      riesgoFinanciero: 82,
    },
    agentPlaybook: {
      insights: [
        "Incidencia recurrente de remisiones incompletas (18% de entregas con faltantes).",
        "Retraso medio de +2.2 días frente a la fecha pactada.",
        "El agente sugiere limitar compras y retener pagos hasta verificación física en bodega.",
      ],
      negotiationLever: "Condicionar futuras órdenes a penalización del 2% diario por entrega tardía.",
      maxRecommendedOrderCop: 10000000,
    },
    ordersHistory: [
      {
        poNumber: "PO-2026-0055",
        itemDescription: "25u Caja Soldadura E6013 1/8'",
        totalCop: 5250000,
        date: "21 Oct 2026",
        status: "aprobada_hitl",
        hmacSignature: "hmac_sha256_dd410a",
      },
    ],
  },
  {
    id: "sup_valvuleria",
    name: "Valvulería & Tubería Industrial S.A.",
    legalName: "Valvulería y Tubería del Oriente S.A.",
    nit: "890.312.445-7",
    category: "Válvulas ANSI 150 & tubería de acero",
    categoryCode: "valvulas",
    city: "Barrancabermeja",
    address: "Zona Franca Santander • Lote 14",
    contactPerson: "Mauricio Gómez",
    contactRole: "Director de Planta",
    phone: "+57 (607) 622-4010",
    email: "mgomez@valvuleríaindustrial.com",
    paymentTerms: "Suspendido por cuarentena técnica",
    activeVolumeCop: 0,
    historicalTotalCop: 42100000,
    scoreGlobal: 64,
    leadTimeDays: 7.0,
    leadTimeDeltaPct: 40,
    defectRatePct: 4.8,
    status: "bloqueado",
    radar: {
      precio: 75,
      puntualidad: 55,
      calidad: 60,
      flexibilidad: 65,
      riesgoFinanciero: 68,
    },
    agentPlaybook: {
      insights: [
        "Proveedor en cuarentena: Ficha /vault/Cuarentena/QUAR-2026-081.md por rebabas en roscas NPT de válvulas 2'.",
        "Compras suspendidas de forma autónoma por motor de gobernanza hasta recertificación de calidad.",
        "Disputa en curso por reposición de 4 unidades defectuosas.",
      ],
      negotiationLever: "Exigir nota de crédito inmediata por $2.560.000 COP antes de levantar bloqueo.",
      maxRecommendedOrderCop: 0,
    },
    ordersHistory: [
      {
        poNumber: "PO-2026-0022",
        itemDescription: "4u Válvula de Bola Inoxidable 2' ANSI",
        totalCop: 2560000,
        date: "08 Oct 2026",
        status: "aprobada_hitl",
        hmacSignature: "hmac_sha256_ee9011",
      },
    ],
  },
];

export const SuppliersView: React.FC = () => {
  const [suppliers, setSuppliers] = useState<SupplierItem[]>(SUPPLIERS_DATA);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("sup_dewalt");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedRisk, setSelectedRisk] = useState<string>("all");

  // Negotiation Modal State
  const [isNegotiationModalOpen, setIsNegotiationModalOpen] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.id === selectedSupplierId) || suppliers[0],
    [suppliers, selectedSupplierId]
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.nit.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat =
        selectedCategory === "all" || s.categoryCode === selectedCategory;

      const matchesRisk =
        selectedRisk === "all" ||
        (selectedRisk === "homologado" && s.status === "homologado") ||
        (selectedRisk === "observacion" && s.status === "observacion") ||
        (selectedRisk === "bloqueado" && s.status === "bloqueado");

      return matchesSearch && matchesCat && matchesRisk;
    });
  }, [suppliers, searchQuery, selectedCategory, selectedRisk]);

  // Render Minimalist SVG Radar Chart
  const renderRadarChart = (radar: SupplierItem["radar"]) => {
    // 5 Axes angles in radians: top, top-right, bottom-right, bottom-left, top-left
    const axes = [
      { key: "puntualidad", label: "Puntualidad", angle: -Math.PI / 2, val: radar.puntualidad },
      { key: "calidad", label: "Calidad", angle: -Math.PI / 2 + (2 * Math.PI) / 5, val: radar.calidad },
      { key: "flexibilidad", label: "Flexibilidad", angle: -Math.PI / 2 + (4 * Math.PI) / 5, val: radar.flexibilidad },
      { key: "riesgoFinanciero", label: "Solvencia", angle: -Math.PI / 2 + (6 * Math.PI) / 5, val: radar.riesgoFinanciero },
      { key: "precio", label: "Precio", angle: -Math.PI / 2 + (8 * Math.PI) / 5, val: radar.precio },
    ];

    const cx = 140;
    const cy = 110;
    const r = 70;

    // Supplier Polygon Points
    const supplierPoints = axes
      .map((a) => {
        const rad = (a.val / 100) * r;
        const x = cx + rad * Math.cos(a.angle);
        const y = cy + rad * Math.sin(a.angle);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

    // Benchmark Polygon Points (Baseline at 72)
    const benchmarkPoints = axes
      .map((a) => {
        const rad = (72 / 100) * r;
        const x = cx + rad * Math.cos(a.angle);
        const y = cy + rad * Math.sin(a.angle);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

    return (
      <div className="relative flex flex-col items-center">
        <svg width="280" height="230" className="overflow-visible select-none">
          <defs>
            <filter id="radar-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Concentric Pentagon Grid Rings */}
          {[0.33, 0.66, 1.0].map((ring, idx) => {
            const ringPoints = axes
              .map((a) => {
                const rad = ring * r;
                const x = cx + rad * Math.cos(a.angle);
                const y = cy + rad * Math.sin(a.angle);
                return `${x.toFixed(1)},${y.toFixed(1)}`;
              })
              .join(" ");
            return (
              <polygon
                key={idx}
                points={ringPoints}
                fill="none"
                stroke="rgba(255, 255, 255, 0.06)"
                strokeWidth="1"
              />
            );
          })}

          {/* Radial Axis Spokes */}
          {axes.map((a, idx) => {
            const x = cx + r * Math.cos(a.angle);
            const y = cy + r * Math.sin(a.angle);
            return (
              <line
                key={idx}
                x1={cx}
                y1={cy}
                x2={x}
                y2={y}
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth="1"
              />
            );
          })}

          {/* Benchmark Polygon (Dashed industry average) */}
          <polygon
            points={benchmarkPoints}
            fill="rgba(255, 255, 255, 0.02)"
            stroke="rgba(255, 255, 255, 0.25)"
            strokeWidth="1.2"
            strokeDasharray="3 3"
          />

          {/* Supplier Data Polygon */}
          <polygon
            points={supplierPoints}
            fill="rgba(16, 185, 129, 0.22)"
            stroke="#10B981"
            strokeWidth="2"
            filter="url(#radar-glow)"
          />

          {/* Data Points on Vertices */}
          {axes.map((a, idx) => {
            const rad = (a.val / 100) * r;
            const x = cx + rad * Math.cos(a.angle);
            const y = cy + rad * Math.sin(a.angle);
            return (
              <circle
                key={idx}
                cx={x}
                cy={y}
                r="3.5"
                fill="#34D399"
                stroke="#050806"
                strokeWidth="1.5"
              />
            );
          })}

          {/* Axis Labels */}
          {axes.map((a, idx) => {
            const labelDist = r + 18;
            const x = cx + labelDist * Math.cos(a.angle);
            const y = cy + labelDist * Math.sin(a.angle);
            return (
              <text
                key={idx}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#8E9893"
                fontSize="9"
                fontFamily="monospace"
                className="font-medium"
              >
                {a.label} ({a.val})
              </text>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[10px] font-mono text-[#8E9893] mt-1">
          <span className="flex items-center gap-1.5 text-[#34D399]">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            {selectedSupplier.name.split(" ")[0]} ({selectedSupplier.scoreGlobal} pts)
          </span>
          <span className="flex items-center gap-1.5 text-white/50">
            <span className="w-2.5 h-0.5 border-b border-dashed border-white/50" />
            Benchmark Industria (72 pts)
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 h-full overflow-hidden flex flex-col bg-[#050806] text-[#F9FAFB] font-sans select-none relative">
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
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#8E9893]">
              OPERACIONES
            </span>
            <span className="text-white/20">/</span>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded-full border border-[#10B981]/25">
              EVALUACIÓN & NEGOCIACIÓN IA
            </span>
          </div>
          <h1 className="text-base font-bold tracking-tight text-[#F9FAFB] flex items-center gap-2 mt-0.5">
            Matriz de Proveedores & Scoring
            <span className="text-xs font-normal font-mono text-[#8E9893]">
              (evaluarProveedores • Benchmark SLA)
            </span>
          </h1>
        </div>

        {/* Live Indicator */}
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0A0F0C] border border-white/[0.08] text-xs shadow-inner">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]"></span>
            </span>
            <span className="text-[11px] font-mono text-[#8E9893]">
              <strong className="text-[#34D399] font-normal">evaluarProveedores</strong> · 6 Homologaciones Activas · Guardrail $5M OK
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MASTER-DETAIL LAYOUT: 60% DIRECTORIO | 40% DOSSIER        */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative min-h-0">
        {/* ------------------------------------------------------- */}
        {/* COLUMNA IZQUIERDA (60%): DIRECTORIO & MATRIZ DE SCORING */}
        {/* ------------------------------------------------------- */}
        <div className="flex-1 lg:w-[60%] h-full flex flex-col bg-[#050806] border-b lg:border-b-0 lg:border-r border-white/[0.06] overflow-hidden min-h-0">
          {/* Barra de Filtros y Búsqueda */}
          <div className="p-4 border-b border-white/[0.06] bg-[#070B08]/60 space-y-3 shrink-0">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Buscador Rápido */}
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-[#8E9893] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por proveedor, NIT, ciudad o categoría..."
                  className="w-full bg-[#0A0F0C] border border-white/[0.08] hover:border-white/20 focus:border-[#10B981]/50 rounded-full pl-9 pr-4 py-1.5 text-xs text-[#F9FAFB] placeholder:text-[#8E9893]/70 focus:outline-none transition-all font-mono"
                />
              </div>

              {/* Status Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {[
                  { id: "all", label: "Todos" },
                  { id: "homologado", label: "Homologados" },
                  { id: "observacion", label: "Bajo Observación" },
                  { id: "bloqueado", label: "Bloqueados" },
                ].map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRisk(r.id)}
                    className={`px-3 py-1 rounded-full text-[11px] font-mono whitespace-nowrap transition-all ${
                      selectedRisk === r.id
                        ? "bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/40 shadow-sm"
                        : "bg-white/[0.02] text-[#8E9893] hover:text-[#F9FAFB]"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Categorías de Insumo */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
              <span className="text-[10px] font-mono text-[#8E9893] uppercase mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3 text-[#10B981]" />
                Insumo:
              </span>
              {[
                { id: "all", label: "Todos" },
                { id: "herramientas", label: "Herramientas" },
                { id: "tornilleria", label: "Tornillería" },
                { id: "acero", label: "Acero" },
                { id: "soldadura", label: "Soldadura" },
                { id: "valvulas", label: "Válvulas" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono transition-colors ${
                    selectedCategory === cat.id
                      ? "bg-white/10 text-[#F9FAFB] border border-white/20"
                      : "text-[#8E9893] hover:text-[#EDF3EE]"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tabla de Proveedores de Alta Densidad */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] bg-[#070B08]/80 text-[#8E9893] text-[10px] font-mono uppercase tracking-wider sticky top-0 z-10 backdrop-blur-md">
                  <th className="py-2.5 px-4">Proveedor / NIT</th>
                  <th className="py-2.5 px-3 text-center">Score Global IA</th>
                  <th className="py-2.5 px-3">Lead Time SLA</th>
                  <th className="py-2.5 px-3 text-center">Tasa Defectos</th>
                  <th className="py-2.5 px-3 text-right">Volumen Activo ($)</th>
                  <th className="py-2.5 px-4 text-center">Estado Contrato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredSuppliers.map((sup) => {
                  const isSelected = selectedSupplierId === sup.id;
                  const isHomologado = sup.status === "homologado";
                  const isObservacion = sup.status === "observacion";
                  const isBloqueado = sup.status === "bloqueado";

                  return (
                    <tr
                      key={sup.id}
                      onClick={() => setSelectedSupplierId(sup.id)}
                      className={`hover:bg-[#10B981]/[0.04] transition-all cursor-pointer group ${
                        isSelected
                          ? "bg-[#10B981]/[0.07] border-l-2 border-l-[#10B981]"
                          : "border-l-2 border-l-transparent"
                      }`}
                    >
                      {/* Columna 1: Proveedor & NIT */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span
                            className={`font-semibold tracking-tight transition-colors ${
                              isSelected
                                ? "text-[#34D399]"
                                : "text-[#F9FAFB] group-hover:text-[#34D399]"
                            }`}
                          >
                            {sup.name}
                          </span>
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#8E9893] mt-0.5">
                            <span>NIT: {sup.nit}</span>
                            <span className="text-white/20">·</span>
                            <span>{sup.city}</span>
                          </div>
                        </div>
                      </td>

                      {/* Columna 2: Score Global IA (Glowing Badge) */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-mono font-bold border ${
                            sup.scoreGlobal >= 90
                              ? "bg-[#10B981]/15 text-[#34D399] border-[#10B981]/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                              : sup.scoreGlobal >= 75
                              ? "bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/40 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                              : "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/40"
                          }`}
                        >
                          {sup.scoreGlobal}/100
                        </span>
                      </td>

                      {/* Columna 3: Lead Time + Delta */}
                      <td className="py-3 px-3 font-mono">
                        <div className="flex flex-col">
                          <span className="font-bold text-[#F9FAFB]">
                            {sup.leadTimeDays.toFixed(1)}d
                          </span>
                          <span
                            className={`text-[10px] font-medium flex items-center gap-0.5 ${
                              sup.leadTimeDeltaPct <= 0
                                ? "text-[#10B981]"
                                : "text-[#F59E0B]"
                            }`}
                          >
                            {sup.leadTimeDeltaPct <= 0 ? (
                              <TrendingDown className="w-2.5 h-2.5" />
                            ) : (
                              <TrendingUp className="w-2.5 h-2.5" />
                            )}
                            {sup.leadTimeDeltaPct <= 0
                              ? `${sup.leadTimeDeltaPct}%`
                              : `+${sup.leadTimeDeltaPct}%`}
                          </span>
                        </div>
                      </td>

                      {/* Columna 4: Tasa de Defectos */}
                      <td className="py-3 px-3 text-center font-mono">
                        <span
                          className={`text-xs font-bold ${
                            sup.defectRatePct <= 0.5
                              ? "text-[#10B981]"
                              : sup.defectRatePct <= 2.0
                              ? "text-[#F59E0B]"
                              : "text-[#EF4444]"
                          }`}
                        >
                          {sup.defectRatePct}%
                        </span>
                      </td>

                      {/* Columna 5: Volumen Activo ($ COP) */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-[#EDF3EE] tabular-nums">
                        ${sup.activeVolumeCop.toLocaleString("es-CO")}
                      </td>

                      {/* Columna 6: Estado de Contrato */}
                      <td className="py-3 px-4 text-center">
                        {isHomologado && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#10B981]/10 border border-[#10B981]/30 text-[#34D399] text-[10px] font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] shadow-[0_0_6px_#10B981]" />
                            Homologado
                          </span>
                        )}
                        {isObservacion && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B] text-[10px] font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] shadow-[0_0_6px_#F59E0B] animate-pulse" />
                            Observación
                          </span>
                        )}
                        {isBloqueado && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] text-[10px] font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] shadow-[0_0_6px_#EF4444]" />
                            Bloqueado
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredSuppliers.length === 0 && (
              <div className="p-12 text-center text-xs font-mono text-[#8E9893]">
                No se encontraron proveedores que coincidan con los criterios de búsqueda.
              </div>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------- */}
        {/* COLUMNA DERECHA (40%): DOSSIER & procurement_negotiator */}
        {/* ------------------------------------------------------- */}
        <div className="w-full lg:w-[40%] xl:w-[500px] h-full bg-[#0A0F0C] flex flex-col justify-between overflow-y-auto custom-scrollbar relative z-10 shadow-2xl min-h-0 border-l border-white/[0.06]">
          {/* Subtle Top-Edge Radial Highlight */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-36 opacity-40"
            style={{
              background:
                "radial-gradient(60% 50% at 50% 0%, rgba(16, 185, 129, 0.2) 0%, transparent 100%)",
            }}
          />

          <div className="p-5 space-y-5">
            {/* 1. Tarjeta Superior: Perfil del Proveedor */}
            <div className="p-4 rounded-2xl bg-[#070B08] border border-white/[0.08] relative overflow-hidden space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 flex items-center justify-center font-mono font-bold text-sm text-[#34D399]">
                    {selectedSupplier.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#F9FAFB] tracking-tight">
                      {selectedSupplier.name}
                    </h2>
                    <span className="text-[11px] font-mono text-[#8E9893]">
                      NIT: {selectedSupplier.nit} · {selectedSupplier.city}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[9px] uppercase font-mono text-[#8E9893] block">
                    Score Global
                  </span>
                  <span className="font-mono text-base font-extrabold text-[#34D399]">
                    {selectedSupplier.scoreGlobal}
                    <span className="text-xs text-[#8E9893]">/100</span>
                  </span>
                </div>
              </div>

              {/* Detalles de Contacto & Términos */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06] text-[11px] font-mono">
                <div>
                  <span className="text-[#8E9893] text-[9px] uppercase block">
                    Contacto Clave
                  </span>
                  <span className="text-[#EDF3EE] font-medium">
                    {selectedSupplier.contactPerson}
                  </span>
                  <span className="text-[#586B5F] block text-[10px]">
                    {selectedSupplier.phone}
                  </span>
                </div>

                <div>
                  <span className="text-[#8E9893] text-[9px] uppercase block">
                    Total Histórico Facturado
                  </span>
                  <span className="text-[#10B981] font-bold">
                    ${selectedSupplier.historicalTotalCop.toLocaleString("es-CO")} COP
                  </span>
                  <span className="text-[#586B5F] block text-[10px]">
                    {selectedSupplier.paymentTerms.split("•")[0]}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Gráfico Radar Minimalista SVG (5 Ejes) */}
            <div className="p-4 rounded-2xl bg-[#070B08] border border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Scale className="w-3.5 h-3.5 text-[#10B981]" />
                  <span className="text-xs font-bold text-[#F9FAFB] uppercase tracking-tight">
                    Desempeño Multieje vs. Benchmark
                  </span>
                </div>
                <span className="font-mono text-[10px] text-[#8E9893]">
                  evaluarProveedores
                </span>
              </div>

              {renderRadarChart(selectedSupplier.radar)}
            </div>

            {/* 3. Playbook del Agente (procurement_negotiator) */}
            <div
              className="p-4 rounded-2xl bg-[#070B08] border border-[#10B981]/30 relative overflow-hidden space-y-3 shadow-[0_0_20px_rgba(16,185,129,0.08)]"
              style={{
                backgroundImage:
                  "radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)",
                backgroundSize: "16px 16px",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#34D399]" />
                  <span className="text-xs font-bold text-[#F9FAFB] uppercase tracking-tight">
                    Playbook de Negociación IA
                  </span>
                </div>
                <span className="font-mono text-[10px] text-[#10B981] bg-[#10B981]/15 px-2 py-0.5 rounded-full border border-[#10B981]/30">
                  procurement_negotiator
                </span>
              </div>

              {/* Insights List */}
              <div className="space-y-2">
                {selectedSupplier.agentPlaybook.insights.map((insight, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-[#EDF3EE] flex items-start gap-2 leading-relaxed"
                  >
                    <span className="text-[#34D399] font-mono font-bold mt-0.5">
                      0{idx + 1}.
                    </span>
                    <span>{insight}</span>
                  </div>
                ))}
              </div>

              {/* Action Button: Generar Argumentario de Negociación */}
              <button
                onClick={() => setIsNegotiationModalOpen(true)}
                className="w-full py-2 px-3 rounded-xl bg-[#10B981] hover:bg-[#34D399] text-[#050806] font-mono text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)] flex items-center justify-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generar Argumentario de Negociación</span>
              </button>
            </div>

            {/* 4. Historial Compacto de Órdenes (receipts/po_*.json) */}
            <div className="p-4 rounded-2xl bg-[#070B08] border border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-[#10B981]" />
                  <span className="text-xs font-bold text-[#F9FAFB] uppercase tracking-tight">
                    Últimas Órdenes de Compra
                  </span>
                </div>
                <span className="font-mono text-[10px] text-[#8E9893]">
                  receipts/po_*.json
                </span>
              </div>

              <div className="space-y-2">
                {selectedSupplier.ordersHistory.map((order) => (
                  <div
                    key={order.poNumber}
                    className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/10 transition-colors flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#10B981]">
                          {order.poNumber}
                        </span>
                        <span className="text-[10px] font-mono text-[#586B5F]">
                          {order.hmacSignature}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8E9893] truncate max-w-[200px]">
                        {order.itemDescription}
                      </p>
                    </div>

                    <div className="text-right flex flex-col items-end">
                      <span className="font-mono font-bold text-[#F9FAFB]">
                        ${order.totalCop.toLocaleString("es-CO")}
                      </span>
                      <span className="text-[10px] font-mono text-[#8E9893]">
                        {order.date}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL: ARGUMENTARIO DE NEGOCIACIÓN IA                     */}
      {/* ========================================================= */}
      <AnimatePresence>
        {isNegotiationModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-xl rounded-2xl bg-[#0A0F0C] border border-[#10B981]/40 p-6 shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30">
                    <Sparkles className="w-5 h-5 text-[#34D399]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#F9FAFB] tracking-tight">
                      Argumentario de Contraoferta Comercial
                    </h3>
                    <span className="font-mono text-xs text-[#10B981]">
                      procurement_negotiator · {selectedSupplier.name}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setIsNegotiationModalOpen(false)}
                  className="p-1 rounded-lg text-[#8E9893] hover:text-[#F9FAFB]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div className="p-3.5 rounded-xl bg-[#050806] border border-white/[0.06] space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-[#8E9893]">
                    <span>Proveedor Evaluado:</span>
                    <span className="text-[#F9FAFB] font-bold">{selectedSupplier.name}</span>
                  </div>
                  <div className="flex justify-between text-[#8E9893]">
                    <span>Volumen Histórico Acumulado:</span>
                    <span className="text-[#34D399] font-bold">
                      ${selectedSupplier.historicalTotalCop.toLocaleString("es-CO")} COP
                    </span>
                  </div>
                  <div className="flex justify-between text-[#8E9893]">
                    <span>Palanca Estratégica:</span>
                    <span className="text-[#EDF3EE]">{selectedSupplier.agentPlaybook.negotiationLever}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-[#8E9893]">
                    Borrador del Argumentario Generado por IA
                  </label>
                  <div className="p-3.5 rounded-xl bg-[#050806] border border-white/[0.08] text-xs text-[#EDF3EE] font-sans leading-relaxed space-y-2">
                    <p>
                      Estimado <strong>{selectedSupplier.contactPerson}</strong> ({selectedSupplier.name}),
                    </p>
                    <p>
                      En el marco de nuestra relación comercial y considerando nuestro volumen acumulado de <strong>${selectedSupplier.historicalTotalCop.toLocaleString("es-CO")} COP</strong> en 2026, estamos programando la emisión de una orden consolidada por <strong>${selectedSupplier.activeVolumeCop.toLocaleString("es-CO")} COP</strong>.
                    </p>
                    <p>
                      Para viabilizar la adjudicación inmediata frente a alternativas homologadas en el mercado, solicitamos aplicar una bonificación del <strong>4.2% adicional</strong> por pronto pago a 10 días o la inclusión del flete sin cargo hasta nuestra bodega en Bucaramanga.
                    </p>
                    <p className="text-[11px] text-[#8E9893] font-mono">
                      Quedamos atentos a su confirmación para proceder con la firma digital HMAC de la orden de compra.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-white/[0.06]">
                <button
                  onClick={() => setIsNegotiationModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-medium text-[#8E9893] hover:text-[#F9FAFB]"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `Estimado ${selectedSupplier.contactPerson} (${selectedSupplier.name}), en consideración a nuestro volumen acumulado de $${selectedSupplier.historicalTotalCop.toLocaleString("es-CO")} COP, solicitamos aplicar bonificación del 4.2% por pronto pago o flete bonificado a Bucaramanga.`
                    );
                    setCopiedScript(true);
                    setTimeout(() => setCopiedScript(false), 2000);
                    showToast("Argumentario de negociación copiado al portapapeles.");
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#10B981] hover:bg-[#34D399] text-[#050806] font-semibold text-xs transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                >
                  {copiedScript ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Argumentario</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
