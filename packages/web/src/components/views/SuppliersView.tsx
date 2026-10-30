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
    <div className="flex-1 h-full overflow-hidden flex flex-col bg-canvas text-primary font-sans relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            className="fixed top-6 right-8 z-50 px-compact py-compact rounded-pill flex items-center gap-compact bg-panel border border-brand/40 text-brand shadow-popover"
          >
            <div className="w-2 h-2 rounded-pill bg-brand animate-ping" />
            <span className="text-label font-mono font-medium">{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-muted hover:text-primary text-label ml-hairline"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================= */}
      {/* HEADER EJECUTIVO (ESTILO INVENTAR)                        */}
      {/* ========================================================= */}
      <header className="px-group py-base bg-canvas border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-base z-20 shrink-0">
        <div>
          <h1 className="text-page-title font-semibold text-primary">
            Directorio de Proveedores
          </h1>
          <p className="text-caption text-secondary mt-hairline">
            Evaluación continua de SLA, condiciones comerciales y volumen contratado
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-compact">
          <div className="relative flex w-full sm:flex-1 sm:w-auto items-center">
            <Search className="w-3.5 h-3.5 text-muted absolute left-compact pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, NIT o código..."
              className="h-9 w-full sm:w-72 bg-panel border border-border hover:border-border-strong focus:border-brand rounded-control pl-9 pr-9 text-caption text-primary placeholder:text-muted focus:outline-none transition-colors"
            />
            <span className="absolute right-hairline text-caption font-mono text-muted bg-raised px-hairline py-hairline rounded-control border border-border pointer-events-none">
              ⌘F
            </span>
          </div>

          <button
            onClick={() => showToast("Abriendo formulario de homologación de nuevo proveedor...")}
            className="px-base py-hairline rounded-control bg-brand hover:bg-brand text-canvas font-semibold text-caption flex items-center gap-hairline transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Nuevo Proveedor</span>
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* CUERPO PRINCIPAL: SIDEBAR DE FILTROS + LISTA DE TARJETAS   */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-group gap-group min-h-0">
        {/* ------------------------------------------------------- */}
        {/* PANEL IZQUIERDO DE FILTROS (260px ESTILO INVENTAR)      */}
        {/* ------------------------------------------------------- */}
        <aside className="w-full md:w-[260px] bg-panel rounded-container p-base border border-border shrink-0 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-element">
            {/* Sección: ESTADO DEL PROVEEDOR */}
            <div>
              <span className="text-caption font-mono text-secondary block mb-compact">
                Estado de Homologación
              </span>
              <div className="grid grid-cols-2 gap-hairline">
                {[
                  { id: "todos", label: "Todos", count: 24 },
                  { id: "homologado", label: "Homologados", count: 16 },
                  { id: "observacion", label: "Observación", count: 6 },
                  { id: "critico", label: "Críticos", count: 2 },
                ].map((btn) => (
                  <button
                    key={btn.id}
                    onClick={() => setSelectedStatus(btn.id)}
                    className={`py-hairline px-hairline rounded-control text-caption font-medium transition-colors flex items-center justify-between border ${selectedStatus === btn.id
                      ? "bg-brand-surface border-brand/40 text-brand font-semibold"
                      : "bg-raised border-border text-secondary hover:text-primary hover:bg-raised"
                      }`}
                  >
                    <span>{btn.label}</span>
                    <span
                      className={`text-caption font-mono px-hairline py-hairline rounded-control ${selectedStatus === btn.id
                        ? "bg-brand-surface text-brand font-bold"
                        : "bg-raised text-muted"
                        }`}
                    >
                      {btn.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sección: FILTRAR POR (Desplegables en Contenedor Well) */}
            <div className="space-y-compact pt-base border-t border-border">
              <span className="text-caption font-mono text-secondary block">
                Filtrar Por
              </span>

              {/* Ciudad */}
              <div>
                <label className="text-caption font-mono text-muted block mb-hairline">
                  Ciudad Principal
                </label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full h-9 bg-raised border border-border rounded-control px-compact text-caption text-primary focus:outline-none focus:border-brand"
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
                <label className="text-caption font-mono text-muted block mb-hairline">
                  Línea de Materiales
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full h-9 bg-raised border border-border rounded-control px-compact text-caption text-primary focus:outline-none focus:border-brand"
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
            <div className="pt-base border-t border-border">
              <span className="text-caption font-mono text-secondary block mb-hairline">
                Volumen Anual (COP)
              </span>
              <div className="grid grid-cols-2 gap-hairline">
                <input
                  type="number"
                  placeholder="$ Mínimo"
                  value={minVolume}
                  onChange={(e) => setMinVolume(e.target.value)}
                  className="h-8 bg-raised border border-border rounded-control px-hairline text-caption text-primary placeholder:text-muted focus:outline-none focus:border-brand font-mono"
                />
                <input
                  type="number"
                  placeholder="$ Máximo"
                  value={maxVolume}
                  onChange={(e) => setMaxVolume(e.target.value)}
                  className="h-8 bg-raised border border-border rounded-control px-hairline text-caption text-primary placeholder:text-muted focus:outline-none focus:border-brand font-mono"
                />
              </div>
            </div>
          </div>

          {/* Botón Restablecer */}
          <button
            onClick={handleResetFilters}
            className="w-full mt-base py-hairline px-compact rounded-control bg-raised hover:bg-panel border border-border text-caption font-medium text-secondary hover:text-primary transition-colors flex items-center justify-center gap-hairline"
          >
            <span>Restablecer Filtros</span>
          </button>
        </aside>

        {/* ------------------------------------------------------- */}
        {/* ÁREA DERECHA: TARJETAS DE 2 NIVELES (ESTILO INVENTAR)   */}
        {/* ------------------------------------------------------- */}
        <main className="flex-1 overflow-y-auto space-y-element pr-hairline">
          {filteredSuppliers.map((supplier) => (
            <div
              key={supplier.id}
              className="bg-panel rounded-container p-base border border-border transition-colors hover:border-brand/30"
            >
              {/* Nivel 1: Cabecera con Código, Nombre, Volumen y Badges */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-compact pb-compact border-b border-border">
                <div>
                  <div className="flex items-center gap-compact mb-hairline">
                    <span className="font-mono text-caption font-semibold text-brand">
                      {supplier.code}
                    </span>
                    <span className="text-muted">·</span>
                    <h3 className="text-label font-semibold text-primary">
                      {supplier.name}
                    </h3>
                  </div>

                  {/* Subtítulo: Avatar + Ubicación + Condiciones */}
                  <div className="flex flex-wrap items-center gap-compact text-caption text-secondary">
                    <div className="flex items-center gap-hairline">
                      <div className="w-5 h-5 rounded-pill bg-brand-surface text-brand font-semibold text-caption flex items-center justify-center">
                        {supplier.name.charAt(0)}
                      </div>
                      <span className="text-primary font-medium">
                        {supplier.contactPerson}
                      </span>
                    </div>
                    <span>•</span>
                    <span className="flex items-center gap-hairline">
                      <MapPin className="w-3.5 h-3.5 text-muted" />
                      {supplier.city}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-hairline font-mono text-caption">
                      <CreditCard className="w-3.5 h-3.5 text-muted" />
                      {supplier.paymentTerms}
                    </span>
                  </div>
                </div>

                {/* Métricas a la derecha y Badge */}
                <div className="flex items-center gap-compact shrink-0">
                  <div className="text-right">
                    <span className="text-label font-semibold text-primary font-mono block">
                      ${(supplier.annualVolumeCop / 1000000).toFixed(1)}M COP
                    </span>
                    <span className="text-caption text-muted">
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
                    className="p-hairline rounded-control text-secondary hover:text-primary hover:bg-raised transition-colors"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Nivel 2: Sub-contenedor con KPIs de Cumplimiento */}
              <div className="bg-raised rounded-control p-base mt-compact border border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-hairline pb-compact mb-compact border-b border-border">
                  <span className="text-caption text-secondary leading-relaxed">
                    {supplier.summary}
                  </span>
                  <div className="flex items-center gap-hairline shrink-0">
                    <button
                      onClick={() => showToast(`Llamando a ${supplier.contactPerson} · ${supplier.phone}`)}
                      className="p-hairline rounded-control text-secondary hover:text-brand hover:bg-brand-surface border border-border transition-colors"
                      title={`Llamar a ${supplier.contactPerson}`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => showToast(`Redactando correo a ${supplier.email}...`)}
                      className="p-hairline rounded-control text-secondary hover:text-brand hover:bg-brand-surface border border-border transition-colors"
                      title={`Escribir a ${supplier.email}`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => showToast(`Consultando expediente legal de ${supplier.name}...`)}
                      className="text-caption text-brand hover:text-brand font-medium flex items-center gap-hairline px-hairline py-hairline rounded-control hover:bg-brand-surface transition-colors"
                    >
                      <span>Ver Contrato</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* KPIs de Cumplimiento con Barras Segmentadas */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-compact">
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
                        ? "bg-brand"
                        : kpi.value >= 75
                          ? "bg-state-attention"
                          : "bg-state-error";
                    return (
                      <div
                        key={kpi.label}
                        className="bg-panel p-hairline rounded-control border border-border"
                      >
                        <div className="flex items-center justify-between text-caption text-secondary mb-hairline">
                          <span className="flex items-center gap-hairline">
                            <Icon className="w-3 h-3 text-brand" />
                            {kpi.label}
                          </span>
                          <span className="font-mono font-semibold text-primary tabular-numbers">
                            {kpi.value}%
                          </span>
                        </div>
                        <div className="flex items-center gap-[3px]">
                          {Array.from({ length: 10 }).map((_, i) => (
                            <span
                              key={i}
                              className={`h-1.5 flex-1 rounded-pill ${i < filled ? tone : "bg-raised"
                                }`}
                            />
                          ))}
                        </div>
                        <span className="text-caption text-muted mt-hairline block">
                          {kpi.hint}
                        </span>
                      </div>
                    );
                  })}

                  <div className="bg-panel p-hairline rounded-control border border-border flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-caption font-mono text-muted">
                        Score Global
                      </span>
                      <span className="px-hairline py-hairline rounded-control bg-brand-surface text-brand font-mono font-bold text-caption border border-brand/30">
                        {supplier.sla.scoreGrade}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-hairline mt-hairline">
                      <span className="text-section-title font-semibold text-brand font-mono tabular-numbers leading-none">
                        {supplier.scoreGlobal}
                      </span>
                      <span className="text-caption text-muted">/ 100</span>
                    </div>
                    <span className="text-caption text-muted mt-hairline flex items-center gap-hairline">
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
