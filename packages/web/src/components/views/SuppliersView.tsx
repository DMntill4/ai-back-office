import React, { useState, useMemo, useEffect } from "react";
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
  FileText,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  Filter,
  Check,
  ChevronRight,
  Plus,
  X,
  DollarSign,
  MoreHorizontal,
  MapPin,
  CreditCard,
  Award,
} from "lucide-react";
import { StatusBadge } from "../ui/StatusBadge";
import { useSuppliersData } from "../../hooks/useSuppliersData";
import type { SupplierListItem } from "../../services/apiClient";

interface SupplierItem {
  id: string;
  code: string;
  name: string;
  legalName: string;
  nit: string;
  category: string;
  city: string;
  address: string;
  contactPerson: string;
  phone: string;
  email: string;
  paymentTerms: string;
  annualVolumeCop: number;
  scoreGlobal: number; // 0 - 100
  leadTimeDays: number;
  defectRatePct: number;
  status: "homologado" | "observacion" | "critico";
  sla: {
    puntualidadPct: number;
    calidadPct: number;
    cumplimientoPct: number;
    scoreGrade: string;
  };
  summary: string;
}

const SUPPLIERS_DATA: SupplierItem[] = [
  {
    id: "sup_01",
    code: "PRV-BGA-01",
    name: "Ferreterías Unidas Bogotá S.A.S.",
    legalName: "Ferreterías Unidas de Colombia S.A.S.",
    nit: "800.123.456-1",
    category: "Consumibles de corte & discos diamantados",
    city: "Bogotá D.C.",
    address: "Zona Industrial Ricaurte Cl. 11 # 28-40",
    contactPerson: "Álvaro Restrepo",
    phone: "+57 310 445 8899",
    email: "ventas@ferreteriasunidas.com.co",
    paymentTerms: "Crédito 30 días",
    annualVolumeCop: 148500000,
    scoreGlobal: 96,
    leadTimeDays: 2,
    defectRatePct: 0.4,
    status: "homologado",
    sla: {
      puntualidadPct: 98,
      calidadPct: 99,
      cumplimientoPct: 97,
      scoreGrade: "A+",
    },
    summary: "Proveedor estratégico de herramientas de corte de alta rotación. Descuento por pronto pago del 3.5% activo.",
  },
  {
    id: "sup_02",
    code: "PRV-MED-02",
    name: "Mundial de Tornillos S.A.S.",
    legalName: "Mundial de Tornillos & Fijaciones S.A.S.",
    nit: "860.987.654-3",
    category: "Tornillería grado 8 y anclajes estructurales",
    city: "Medellín",
    address: "Autopista Sur Cra. 42 # 54A-12, Itagüí",
    contactPerson: "Catalina Gómez",
    phone: "+57 314 887 2200",
    email: "institucional@mundialdetornillos.com",
    paymentTerms: "Crédito 45 días",
    annualVolumeCop: 92400000,
    scoreGlobal: 92,
    leadTimeDays: 3,
    defectRatePct: 0.8,
    status: "homologado",
    sla: {
      puntualidadPct: 94,
      calidadPct: 98,
      cumplimientoPct: 95,
      scoreGrade: "A",
    },
    summary: "Contrato marco con garantía de reposición inmediata para SKUs de quiebre crítico en ferretería.",
  },
  {
    id: "sup_03",
    code: "PRV-BGA-03",
    name: "Dewalt Colombia (Mayorista Homologado)",
    legalName: "Distribuidora de Equipos Industriales S.A.",
    nit: "900.456.789-0",
    category: "Maquinaria pesada y rotomartillos SDS-Max",
    city: "Bucaramanga",
    address: "Anillo Vial Km 2.5 Sector Palenque",
    contactPerson: "Mauricio Valenzuela",
    phone: "+57 318 901 3344",
    email: "mvalenzuela@distequipos.co",
    paymentTerms: "Anticipo 30% / Saldo 30 días",
    annualVolumeCop: 215000000,
    scoreGlobal: 79,
    leadTimeDays: 6,
    defectRatePct: 2.1,
    status: "observacion",
    sla: {
      puntualidadPct: 82,
      calidadPct: 94,
      cumplimientoPct: 86,
      scoreGrade: "B+",
    },
    summary: "Alerta por extensión de tiempos de despacho en maquinaria de importación (+4 días sobre SLA pactado).",
  },
  {
    id: "sup_04",
    code: "PRV-CLO-04",
    name: "Aceros del Oriente y Perfilería S.A.",
    legalName: "Aceros & Perfiles de Colombia S.A.",
    nit: "890.321.654-8",
    category: "Vigas IPE, láminas galvanizadas y perfiles",
    city: "Cali",
    address: "Zona Franca del Pacífico Manzana 4",
    contactPerson: "Humberto Ortiz",
    phone: "+57 320 678 1122",
    email: "hortiz@acerosdeloriente.com",
    paymentTerms: "Contado contra entrega",
    annualVolumeCop: 64200000,
    scoreGlobal: 68,
    leadTimeDays: 8,
    defectRatePct: 3.8,
    status: "critico",
    sla: {
      puntualidadPct: 65,
      calidadPct: 88,
      cumplimientoPct: 72,
      scoreGrade: "C",
    },
    summary: "Retenido en cuarentena por diferencias en calibres de lámina. Órdenes automáticas pausadas por gobernanza.",
  },
];

/** Adapta el contrato del API al modelo de presentación de la vista. */
function toSupplierItem(s: SupplierListItem): SupplierItem {
  return {
    id: s.id,
    code: s.code,
    name: s.name,
    legalName: s.legalName,
    nit: s.nit,
    category: s.category,
    city: s.city,
    address: s.address,
    contactPerson: s.contactPerson,
    phone: s.phone,
    email: s.email,
    paymentTerms: s.paymentTerms,
    annualVolumeCop: s.annualVolumeCop,
    scoreGlobal: s.scoreGlobal,
    leadTimeDays: s.leadTimeDays,
    defectRatePct: s.defectRatePct,
    status: s.status,
    sla: s.sla,
    summary: s.summary,
  };
}

export const SuppliersView: React.FC = () => {
  const { suppliers: liveSuppliers, loading, isFallback } = useSuppliersData();
  const [suppliers, setSuppliers] = useState<SupplierItem[]>(SUPPLIERS_DATA);

  // Sincroniza los datos del backend (o del fallback) con el estado local de la vista.
  useEffect(() => {
    if (liveSuppliers.length > 0) {
      setSuppliers(liveSuppliers.map(toSupplierItem));
    }
  }, [liveSuppliers]);
  const [selectedStatus, setSelectedStatus] = useState<string>("todos");
  const [selectedCity, setSelectedCity] = useState<string>("todas");
  const [selectedCategory, setSelectedCategory] = useState<string>("todas");
  const [searchQuery, setSearchQuery] = useState("");
  const [minVolume, setMinVolume] = useState("");
  const [maxVolume, setMaxVolume] = useState("");
  const [selectedSupplierDetail, setSelectedSupplierDetail] = useState<SupplierItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleResetFilters = () => {
    setSelectedStatus("todos");
    setSelectedCity("todas");
    setSelectedCategory("todas");
    setSearchQuery("");
    setMinVolume("");
    setMaxVolume("");
  };

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      // Estado
      if (selectedStatus !== "todos" && s.status !== selectedStatus) return false;
      // Ciudad
      if (selectedCity !== "todas" && s.city !== selectedCity) return false;
      // Categoría
      if (selectedCategory !== "todas" && !s.category.toLowerCase().includes(selectedCategory.toLowerCase()))
        return false;
      // Rango de volumen
      if (minVolume && s.annualVolumeCop < Number(minVolume)) return false;
      if (maxVolume && s.annualVolumeCop > Number(maxVolume)) return false;
      // Búsqueda
      if (
        searchQuery &&
        !s.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !s.code.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !s.nit.includes(searchQuery)
      ) {
        return false;
      }
      return true;
    });
  }, [suppliers, selectedStatus, selectedCity, selectedCategory, minVolume, maxVolume, searchQuery]);

  return (
    <div className="flex-1 h-full overflow-hidden flex flex-col bg-canvas text-[#F9FAFB] font-sans select-none relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            className="fixed top-6 right-8 z-50 px-4 py-3 rounded-full flex items-center gap-3 bg-[#0A160E] border border-[#10B981]/40 text-[#34D399] shadow-[0_0_25px_rgba(16,185,129,0.25)]"
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
      {/* HEADER EJECUTIVO (ESTILO INVENTAR)                        */}
      {/* ========================================================= */}
      <header className="px-6 py-4 bg-canvas border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-20 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Directorio de Proveedores
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Evaluación continua de SLA, condiciones comerciales y volumen contratado
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, NIT o código..."
              className="h-9 w-60 sm:w-72 bg-surface-1 border border-white/[0.08] hover:border-white/20 focus:border-emerald-500/50 rounded-xl pl-9 pr-9 text-xs text-white placeholder:text-zinc-500 focus:outline-none transition-all"
            />
            <span className="absolute right-2.5 text-[10px] font-mono text-zinc-500 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06] pointer-events-none">
              ⌘F
            </span>
          </div>

          <button
            onClick={() => showToast("Abriendo formulario de homologación de nuevo proveedor...")}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs flex items-center gap-1.5 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Nuevo Proveedor</span>
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* CUERPO PRINCIPAL: SIDEBAR DE FILTROS + LISTA DE TARJETAS   */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-6 gap-6 min-h-0">
        {/* ------------------------------------------------------- */}
        {/* PANEL IZQUIERDO DE FILTROS (260px ESTILO INVENTAR)      */}
        {/* ------------------------------------------------------- */}
        <aside className="w-full md:w-[260px] bg-surface-1 rounded-2xl p-4 border border-white/[0.06] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] shrink-0 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-5">
            {/* Sección: ESTADO DEL PROVEEDOR (Grid 2x2 de botones táctiles) */}
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block mb-2.5">
                Estado de Homologación
              </span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "todos", label: "Todos", count: 24 },
                  { id: "homologado", label: "Homologados", count: 16 },
                  { id: "observacion", label: "Observación", count: 6 },
                  { id: "critico", label: "Críticos", count: 2 },
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

            {/* Sección: FILTRAR POR (Desplegables en Contenedor Well) */}
            <div className="space-y-3 pt-4 border-t border-white/[0.06]">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block">
                Filtrar Por
              </span>

              {/* Ciudad */}
              <div>
                <label className="text-[10px] font-mono text-zinc-500 block mb-1">
                  Ciudad Principal
                </label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full h-9 bg-surface-well border border-white/[0.06] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="todas">Todas las ciudades</option>
                  <option value="Bogotá D.C.">Bogotá D.C.</option>
                  <option value="Bucaramanga">Bucaramanga</option>
                  <option value="Medellín">Medellín</option>
                  <option value="Cali">Cali</option>
                </select>
              </div>

              {/* Categoría */}
              <div>
                <label className="text-[10px] font-mono text-zinc-500 block mb-1">
                  Línea de Materiales
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full h-9 bg-surface-well border border-white/[0.06] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="todas">Todas las líneas</option>
                  <option value="corte">Consumibles de Corte</option>
                  <option value="tornillería">Tornillería & Anclajes</option>
                  <option value="maquinaria">Maquinaria & Rotomartillos</option>
                  <option value="aceros">Aceros & Perfilería</option>
                </select>
              </div>
            </div>

            {/* Sección: VOLUMEN ANUAL DE COMPRA */}
            <div className="pt-4 border-t border-white/[0.06]">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block mb-2">
                Volumen Anual (COP)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="$ Mínimo"
                  value={minVolume}
                  onChange={(e) => setMinVolume(e.target.value)}
                  className="h-8 bg-surface-well border border-white/[0.06] rounded-xl px-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 font-mono"
                />
                <input
                  type="number"
                  placeholder="$ Máximo"
                  value={maxVolume}
                  onChange={(e) => setMaxVolume(e.target.value)}
                  className="h-8 bg-surface-well border border-white/[0.06] rounded-xl px-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Botón Restablecer */}
          <button
            onClick={handleResetFilters}
            className="w-full mt-4 py-2 px-3 rounded-xl bg-surface-well hover:bg-white/[0.06] border border-white/[0.06] text-xs font-medium text-zinc-400 hover:text-white transition-all flex items-center justify-center gap-1.5"
          >
            <span>Restablecer Filtros</span>
          </button>
        </aside>

        {/* ------------------------------------------------------- */}
        {/* ÁREA DERECHA: TARJETAS DE 2 NIVELES (ESTILO INVENTAR)   */}
        {/* ------------------------------------------------------- */}
        <main className="flex-1 overflow-y-auto space-y-3.5 pr-1">
          {filteredSuppliers.map((supplier) => (
            <div
              key={supplier.id}
              className="bg-surface-1 rounded-2xl p-5 border border-white/[0.06] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] transition-all hover:border-emerald-500/30"
            >
              {/* Nivel 1: Cabecera con Código, Nombre, Volumen y Badges */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className="font-mono text-xs font-bold text-emerald-400">
                      {supplier.code}
                    </span>
                    <span className="text-white/20">·</span>
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      {supplier.name}
                    </h3>
                  </div>

                  {/* Subtítulo: Avatar + Ubicación + Condiciones */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] flex items-center justify-center">
                        {supplier.name.charAt(0)}
                      </div>
                      <span className="text-zinc-300 font-medium">
                        {supplier.contactPerson}
                      </span>
                    </div>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                      {supplier.city}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <CreditCard className="w-3.5 h-3.5 text-zinc-500" />
                      {supplier.paymentTerms}
                    </span>
                  </div>
                </div>

                {/* Métricas a la derecha y Badge */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-sm font-bold text-white font-mono block">
                      ${(supplier.annualVolumeCop / 1000000).toFixed(1)}M COP
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      Volumen 2026
                    </span>
                  </div>

                  {supplier.status === "homologado" ? (
                    <StatusBadge variant="success" label="Homologado" />
                  ) : supplier.status === "observacion" ? (
                    <StatusBadge variant="warning" label="Observación" />
                  ) : (
                    <StatusBadge variant="danger" label="Bloqueado" />
                  )}

                  <button
                    onClick={() => setSelectedSupplierDetail(supplier)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Nivel 2: Sub-contenedor "Well" con KPIs de Cumplimiento */}
              <div className="bg-surface-well rounded-xl p-4 mt-3 border border-white/[0.04]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-white/[0.04]">
                  <span className="text-xs text-zinc-300 leading-relaxed">
                    {supplier.summary}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => showToast(`Llamando a ${supplier.contactPerson} · ${supplier.phone}`)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-white/[0.06] transition-colors"
                      title={`Llamar a ${supplier.contactPerson}`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => showToast(`Redactando correo a ${supplier.email}...`)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-white/[0.06] transition-colors"
                      title={`Escribir a ${supplier.email}`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => showToast(`Consultando expediente legal de ${supplier.name}...`)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-emerald-500/10 transition-colors"
                    >
                      <span>Ver Contrato</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* KPIs de Cumplimiento con Barras Segmentadas */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    {
                      label: "Puntualidad",
                      value: supplier.sla.puntualidadPct,
                      icon: Clock,
                      hint: "Entregas a tiempo",
                    },
                    {
                      label: "Calidad",
                      value: supplier.sla.calidadPct,
                      icon: ShieldCheck,
                      hint: "Lotes sin defecto",
                    },
                    {
                      label: "Cumplimiento",
                      value: supplier.sla.cumplimientoPct,
                      icon: CheckCircle2,
                      hint: "Órdenes completas",
                    },
                  ].map((kpi) => {
                    const Icon = kpi.icon;
                    const filled = Math.round(kpi.value / 10);
                    const tone =
                      kpi.value >= 90
                        ? "bg-emerald-500"
                        : kpi.value >= 75
                          ? "bg-amber-400"
                          : "bg-rose-500";
                    return (
                      <div
                        key={kpi.label}
                        className="bg-surface-1/60 p-2.5 rounded-lg border border-white/[0.04]"
                      >
                        <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
                          <span className="flex items-center gap-1">
                            <Icon className="w-3 h-3 text-emerald-400" />
                            {kpi.label}
                          </span>
                          <span className="font-mono font-bold text-white tabular-numbers">
                            {kpi.value}%
                          </span>
                        </div>
                        <div className="flex items-center gap-[3px]">
                          {Array.from({ length: 10 }).map((_, i) => (
                            <span
                              key={i}
                              className={`h-1.5 flex-1 rounded-full ${i < filled ? tone : "bg-white/[0.08]"
                                }`}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] text-zinc-500 mt-1.5 block">
                          {kpi.hint}
                        </span>
                      </div>
                    );
                  })}

                  <div className="bg-surface-1/60 p-2.5 rounded-lg border border-white/[0.04] flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-mono text-zinc-500">
                        Score Global
                      </span>
                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[10px] border border-emerald-500/30">
                        {supplier.sla.scoreGrade}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-lg font-bold text-emerald-400 font-mono tabular-numbers leading-none">
                        {supplier.scoreGlobal}
                      </span>
                      <span className="text-[10px] text-zinc-500">/ 100</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Entrega en {supplier.leadTimeDays} días
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
