import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Building2,
  MapPin,
  Warehouse,
  Phone,
  Mail,
  Users,
  Compass,
  CheckCircle2,
  Clock,
  Globe,
  Sliders,
  DollarSign,
  ShieldCheck,
  Edit3,
  ExternalLink,
  Plus,
  Sparkles,
  Package,
  Truck,
  RotateCcw,
  Check,
  Copy,
  X,
  Layers,
  Save,
} from "lucide-react";
import { Button } from "../ui/Button";

// Interfaces para Sedes Físicas y Perfil Corporativo
export interface PhysicalLocation {
  id: string;
  code: string;
  name: string;
  type: "Centro de Distribución Matriz" | "Hub Regional de Consolidación" | "Hub Sur Logístico" | "Sucursal Comercial";
  city: string;
  department: string;
  address: string;
  coordinates: string;
  capacityM3: number;
  capacityPallets: number;
  currentOccupancyPct: number;
  manager: string;
  managerRole: string;
  phone: string;
  operatingHours: string;
  activeSkusCount: number;
  osrmLane: string;
  status: "active" | "maintenance" | "full";
}

export interface CompanyProfile {
  legalName: string;
  commercialName: string;
  nitTaxId: string;
  industry: string;
  baseCurrency: string;
  timeZone: string;
  localeRules: string;
  headquarters: string;
  dianStatus: string;
}

// Datos semilla de la empresa (companyProfileService.ts & universalLocaleEngine.ts)
const SEED_COMPANY_PROFILE: CompanyProfile = {
  legalName: "Ferretería Industrial Santandereana S.A.S.",
  commercialName: "MINT · Ferretería Industrial Santandereana",
  nitTaxId: "900.582.114-8 (Dígito Verificación: 8)",
  industry: "Distribución Mayorista de Suministros Industriales, Construcción & Maquinaria",
  baseCurrency: "COP ($) · Pesos Colombianos (Tasa Representativa del Mercado)",
  timeZone: "America/Bogota (UTC-05:00 · Hora Legal de Colombia)",
  localeRules: "es-CO · IVA General 19% · Retefuente 2.5% · Facturación DIAN XML v1.9",
  headquarters: "Bucaramanga, Santander (Parque Industrial Chimitá)",
  dianStatus: "RESPONSABLE DE IVA · FACTURADOR ELECTRÓNICO HABILITADO",
};

// Datos semilla de sedes físicas (seed-physical-locations.ts)
const SEED_LOCATIONS: PhysicalLocation[] = [
  {
    id: "loc_bga_01",
    code: "BOD-BGA-01",
    name: "Centro de Distribución Principal Chimitá (Bodega Matriz)",
    type: "Centro de Distribución Matriz",
    city: "Bucaramanga",
    department: "Santander",
    address: "Km 4 Vía Palenque, Manzana B Lote 12, Zona Industrial Chimitá",
    coordinates: "7.1254° N, 73.1198° W",
    capacityM3: 1200,
    capacityPallets: 850,
    currentOccupancyPct: 78,
    manager: "Arq. Mauricio Peñaranda",
    managerRole: "Jefe de Logística & WMS Central",
    phone: "+57 (607) 642-8800 ext. 104",
    operatingHours: "Lun - Vie: 06:00 - 20:00 · Sáb: 07:00 - 13:00",
    activeSkusCount: 342,
    osrmLane: "Corredor 45A Bogotá -> Bucaramanga (398 km)",
    status: "active",
  },
  {
    id: "loc_bog_02",
    code: "CD-BOG-02",
    name: "Hub Logístico Regional Fontibón (CD Bogotá)",
    type: "Hub Regional de Consolidación",
    city: "Bogotá D.C.",
    department: "Cundinamarca",
    address: "Carrera 106 # 15-22, Parque Logístico San Carlos, Fontibón",
    coordinates: "4.6732° N, 74.1438° W",
    capacityM3: 3500,
    capacityPallets: 2400,
    currentOccupancyPct: 64,
    manager: "Dra. Elena Cárdenas",
    managerRole: "Directora de Cadena de Suministro Centro",
    phone: "+57 (601) 745-9920",
    operatingHours: "24/7 Recepción de Carga Pesada & Muelle Cross-Docking",
    activeSkusCount: 280,
    osrmLane: "Hub Origen Consolidados Hacia Bucaramanga",
    status: "active",
  },
  {
    id: "loc_med_03",
    code: "CD-MED-03",
    name: "Hub Sur Industrial Itagüí (CD Medellín)",
    type: "Hub Sur Logístico",
    city: "Itagüí",
    department: "Antioquia",
    address: "Autopista Sur # 50-12, Zona Franca del Sur",
    coordinates: "6.1821° N, 75.6025° W",
    capacityM3: 2200,
    capacityPallets: 1600,
    currentOccupancyPct: 82,
    manager: "Ing. Santiago Jaramillo",
    managerRole: "Coordinador Operativo Antioquia & Eje Cafetero",
    phone: "+57 (604) 448-1200",
    operatingHours: "Lun - Sáb: 06:00 - 18:00",
    activeSkusCount: 195,
    osrmLane: "Ruta 60 Itagüí -> Puerto Berrío -> Bucaramanga (382 km)",
    status: "active",
  },
  {
    id: "loc_sgl_04",
    code: "SUC-SGL-04",
    name: "Sucursal Comercial y Punto de Venta San Gil (Guanentá)",
    type: "Sucursal Comercial",
    city: "San Gil",
    department: "Santander",
    address: "Avenida Santander # 12-45, Centro Logístico Guanentá",
    coordinates: "6.5542° N, 73.1352° W",
    capacityM3: 450,
    capacityPallets: 280,
    currentOccupancyPct: 52,
    manager: "Mariana Gómez",
    managerRole: "Administradora de Sucursal & Venta Directa",
    phone: "+57 (607) 724-4110",
    operatingHours: "Lun - Vie: 07:30 - 17:30 · Sáb: 08:00 - 12:30",
    activeSkusCount: 112,
    osrmLane: "Vía Pescadero (Contingencia: Vía Zapatoca 154 km)",
    status: "active",
  },
];

export const CompaniesBranchesView: React.FC = () => {
  const [company, setCompany] = useState<CompanyProfile>(SEED_COMPANY_PROFILE);
  const [locations, setLocations] = useState<PhysicalLocation[]>(SEED_LOCATIONS);
  const [editingLocation, setEditingLocation] = useState<PhysicalLocation | null>(null);
  const [isAddLocationModalOpen, setIsAddLocationModalOpen] = useState(false);
  const [isEditCompanyModalOpen, setIsEditCompanyModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Formulario de edición de sede
  const [editCapacityM3, setEditCapacityM3] = useState<number>(0);
  const [editManager, setEditManager] = useState<string>("");
  const [editHours, setEditHours] = useState<string>("");

  // Formulario de nueva sede
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newCity, setNewCity] = useState("Barrancabermeja");
  const [newCapacity, setNewCapacity] = useState(600);
  const [newManager, setNewManager] = useState("");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  const handleOpenEditModal = (loc: PhysicalLocation) => {
    setEditingLocation(loc);
    setEditCapacityM3(loc.capacityM3);
    setEditManager(loc.manager);
    setEditHours(loc.operatingHours);
  };

  const handleSaveLocationEdit = () => {
    if (!editingLocation) return;
    setLocations((prev) =>
      prev.map((l) =>
        l.id === editingLocation.id
          ? {
              ...l,
              capacityM3: editCapacityM3,
              manager: editManager,
              operatingHours: editHours,
            }
          : l
      )
    );
    setEditingLocation(null);
    showToast(`Parámetros logísticos de ${editingLocation.code} actualizados en PostgreSQL.`);
  };

  const handleCreateLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) return;

    const newLoc: PhysicalLocation = {
      id: `loc_${newCode.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
      code: newCode.toUpperCase(),
      name: newName,
      type: "Sucursal Comercial",
      city: newCity,
      department: "Santander",
      address: `Zona Logística ${newCity}, Sector Industrial`,
      coordinates: "7.0653° N, 73.8547° W",
      capacityM3: Number(newCapacity),
      capacityPallets: Math.round(Number(newCapacity) * 0.7),
      currentOccupancyPct: 35,
      manager: newManager || "Por Asignar",
      managerRole: "Jefe de Operaciones",
      phone: "+57 (607) 600-0000",
      operatingHours: "Lun - Vie: 07:00 - 18:00",
      activeSkusCount: 65,
      osrmLane: "Conexión Troncal Magdalena Medio",
      status: "active",
    };

    setLocations([...locations, newLoc]);
    setIsAddLocationModalOpen(false);
    setNewCode("");
    setNewName("");
    setNewManager("");
    showToast(`Nueva sede ${newLoc.code} agregada a la topología de la empresa.`);
  };

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-[#050806] text-[#F9FAFB] font-sans antialiased select-none overflow-y-auto">
      {/* 1. Header Bar de la Vista */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-white/[0.08] bg-[#0A0F0C]/90 backdrop-blur-md flex-none z-20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono text-[#8E9893] uppercase tracking-wider">
              Configuración
            </span>
            <span className="text-white/20">/</span>
            <span className="text-[11px] font-mono text-[#10B981] flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              companyProfileService.ts & seed-physical-locations.ts
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Empresas y Sucursales
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#10B981]/10 text-[#34D399] border border-[#10B981]/30">
              4 SEDES ACTIVAS · 7.350 m³ TOTAL
            </span>
          </div>
        </div>

        {/* Acciones del Header */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            icon={<Edit3 className="w-3.5 h-3.5" />}
            onClick={() => setIsEditCompanyModalOpen(true)}
          >
            Editar Perfil
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setIsAddLocationModalOpen(true)}
          >
            Registrar Sede
          </Button>
        </div>
      </div>

      {/* Toast Flotante */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-16 right-6 z-50 px-4 py-2 rounded-xl bg-[#0A0F0C] border border-[#10B981]/50 text-[#34D399] text-xs font-mono shadow-[0_4px_24px_rgba(16,185,129,0.2)] flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#10B981]" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contenido Principal */}
      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* ========================================================================= */}
        {/* 1. PANEL SUPERIOR: Identidad de la Empresa y Localización                 */}
        {/* ========================================================================= */}
        <div className="p-6 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] relative overflow-hidden shadow-subtle space-y-5">
          {/* Subtle Top Radial Glow */}
          <div className="absolute top-0 left-1/4 right-1/4 h-24 bg-gradient-to-b from-[#10B981]/15 to-transparent blur-2xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-4 relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-black/60 border border-white/[0.08] text-[#10B981] flex items-center justify-center">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                    {company.legalName}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30 font-semibold">
                    MATRIZ ACTIVA
                  </span>
                </div>
                <p className="text-xs text-[#8E9893] mt-0.5 font-mono">
                  NIT: {company.nitTaxId} · Razón Comercial: {company.commercialName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              <span className="text-emerald-400 font-bold">{company.dianStatus}</span>
            </div>
          </div>

          {/* Grid de Metadatos de Configuración Regional & Fiscal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono relative z-10">
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.04] space-y-1">
              <span className="text-[10px] text-[#8E9893] block">Moneda Base Operativa:</span>
              <span className="text-white font-bold block">{company.baseCurrency}</span>
              <span className="text-[10px] text-emerald-400">TRM Sincronizada BanRep</span>
            </div>

            <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.04] space-y-1">
              <span className="text-[10px] text-[#8E9893] block">Zona Horaria & Calendario:</span>
              <span className="text-white font-bold block">{company.timeZone}</span>
              <span className="text-[10px] text-gray-400">Festivos Colombia 2026</span>
            </div>

            <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.04] space-y-1">
              <span className="text-[10px] text-[#8E9893] block">Reglas Fiscales (universalLocaleEngine):</span>
              <span className="text-white font-bold block">{company.localeRules.split("·")[0]} · {company.localeRules.split("·")[1]}</span>
              <span className="text-[10px] text-gray-400">Retefuente 2.5% Compras</span>
            </div>

            <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.04] space-y-1">
              <span className="text-[10px] text-[#8E9893] block">Sede Central de Dirección:</span>
              <span className="text-white font-bold block">{company.headquarters}</span>
              <span className="text-[10px] text-emerald-400">Coordinación Chimitá WMS</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. GRID PRINCIPAL: Red de Sucursales, Plantas y Bodegas                   */}
        {/* ========================================================================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Warehouse className="w-4 h-4 text-[#10B981]" />
              <h3 className="text-base font-bold text-white tracking-tight">
                Topología de Sedes Físicas y Centros de Almacenamiento
              </h3>
            </div>

            <span className="text-xs font-mono text-[#8E9893]">
              {locations.length} ubicaciones georreferenciadas con motor OSRM
            </span>
          </div>

          {/* Grid de Tarjetas de Sedes (4 Sedes) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {locations.map((loc) => {
              const isFull = loc.currentOccupancyPct >= 80;

              return (
                <div
                  key={loc.id}
                  className="p-5 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] shadow-subtle space-y-4 flex flex-col justify-between group hover:border-[#10B981]/30 transition-all relative overflow-hidden"
                >
                  {/* Micro-dot texture overlay */}
                  <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

                  <div className="space-y-3.5 relative z-10">
                    {/* Header de la Sede */}
                    <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] pb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30">
                            {loc.code}
                          </span>
                          <span className="text-xs font-mono text-[#8E9893]">
                            {loc.city}, {loc.department}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                          {loc.name}
                        </h4>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 border border-white/[0.06] text-[#8E9893]">
                          {loc.type}
                        </span>
                      </div>
                    </div>

                    {/* Dirección y Coordenadas Geocoding */}
                    <div className="p-3 rounded-xl bg-black/40 border border-white/[0.04] space-y-1.5 text-xs font-mono">
                      <div className="flex items-center gap-1.5 text-gray-300">
                        <MapPin className="w-3.5 h-3.5 text-[#10B981] flex-shrink-0" />
                        <span className="truncate">{loc.address}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#8E9893] pt-1 border-t border-white/[0.04]">
                        <span className="flex items-center gap-1">
                          <Compass className="w-3 h-3 text-emerald-400" />
                          {loc.coordinates}
                        </span>
                        <span className="text-white">{loc.activeSkusCount} SKUs asignados</span>
                      </div>
                    </div>

                    {/* Capacidad Máxima y Barra de Ocupación */}
                    <div className="space-y-1.5">
                      <div className="flex items-baseline justify-between text-xs font-mono">
                        <span className="text-[#8E9893]">
                          Capacidad: <strong className="text-white">{loc.capacityM3.toLocaleString()} m³</strong> ({loc.capacityPallets} pallets)
                        </span>
                        <span className={`font-bold tabular-nums ${isFull ? "text-amber-400" : "text-[#34D399]"}`}>
                          {loc.currentOccupancyPct}% Ocupación
                        </span>
                      </div>

                      {/* Barra de progreso de ocupación */}
                      <div className="w-full h-2 rounded-full bg-black/60 border border-white/[0.06] overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${loc.currentOccupancyPct}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className={`h-full rounded-full ${
                            isFull
                              ? "bg-gradient-to-r from-amber-500 to-amber-400"
                              : "bg-gradient-to-r from-[#10B981] to-[#34D399] shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Responsable y Horarios Operativos */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono pt-1">
                      <div className="p-2.5 rounded-lg bg-black/30 border border-white/[0.04]">
                        <span className="text-[10px] text-[#8E9893] block">Responsable de Sede:</span>
                        <span className="text-white font-semibold block truncate">{loc.manager}</span>
                        <span className="text-[9px] text-[#8E9893] truncate block">{loc.managerRole}</span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-black/30 border border-white/[0.04]">
                        <span className="text-[10px] text-[#8E9893] block">Horarios de Recepción:</span>
                        <span className="text-emerald-400 font-semibold block text-[11px] leading-tight">
                          {loc.operatingHours}
                        </span>
                      </div>
                    </div>

                    {/* Línea OSRM vinculada */}
                    <div className="text-[10px] font-mono text-[#8E9893] flex items-center gap-1.5 pt-1">
                      <Truck className="w-3 h-3 text-[#10B981]" />
                      <span className="truncate">Línea de Enlace: {loc.osrmLane}</span>
                    </div>
                  </div>

                  {/* Acciones de la Tarjeta */}
                  <div className="pt-3 border-t border-white/[0.04] flex items-center justify-between gap-2 relative z-10">
                    <span className="text-[10px] font-mono text-[#8E9893] flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-400" />
                      {loc.phone}
                    </span>

                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Sliders className="w-3 h-3 text-[#10B981]" />}
                      onClick={() => handleOpenEditModal(loc)}
                    >
                      Editar Parámetros
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Editar Parámetros Logísticos de la Sede                           */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {editingLocation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#0A0F0C] border border-white/[0.12] rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.8)] overflow-hidden"
            >
              <div className="p-4 px-6 border-b border-white/[0.08] flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-2">
                  <Warehouse className="w-4 h-4 text-[#10B981]" />
                  <h3 className="text-sm font-bold text-white font-mono">
                    Editar Parámetros Logísticos · {editingLocation.code}
                  </h3>
                </div>
                <button
                  onClick={() => setEditingLocation(null)}
                  className="p-1 rounded-lg hover:bg-white/[0.08] text-[#8E9893] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs font-mono">
                <div>
                  <label className="text-[11px] text-[#8E9893] block mb-1">Capacidad Máxima de Almacenamiento (m³):</label>
                  <input
                    type="number"
                    value={editCapacityM3}
                    onChange={(e) => setEditCapacityM3(Number(e.target.value))}
                    className="w-full h-8 px-3 rounded-lg bg-black/60 border border-white/[0.08] text-white focus:outline-none focus:border-[#10B981]/60 font-mono"
                  />
                  <span className="text-[10px] text-[#8E9893] mt-1 block">
                    Equivalente aproximado: {Math.round(editCapacityM3 * 0.7)} pallets estándar.
                  </span>
                </div>

                <div>
                  <label className="text-[11px] text-[#8E9893] block mb-1">Responsable Operativo / WMS:</label>
                  <input
                    type="text"
                    value={editManager}
                    onChange={(e) => setEditManager(e.target.value)}
                    className="w-full h-8 px-3 rounded-lg bg-black/60 border border-white/[0.08] text-white focus:outline-none focus:border-[#10B981]/60 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-[#8E9893] block mb-1">Horarios de Recepción de Carga Pesada:</label>
                  <input
                    type="text"
                    value={editHours}
                    onChange={(e) => setEditHours(e.target.value)}
                    className="w-full h-8 px-3 rounded-lg bg-black/60 border border-white/[0.08] text-white focus:outline-none focus:border-[#10B981]/60 font-mono"
                  />
                </div>

                <div className="p-3 rounded-lg bg-[#10B981]/10 border border-[#10B981]/25 text-[11px] text-[#34D399]">
                  ✓ Los cambios afectarán la heurística de enrutamiento del motor OSRM y el cálculo de rebalanceo de stock entre bodegas.
                </div>
              </div>

              <div className="p-4 px-6 border-t border-white/[0.08] bg-black/40 flex items-center justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setEditingLocation(null)}>
                  Cancelar
                </Button>
                <Button variant="primary" size="sm" icon={<Save className="w-3.5 h-3.5" />} onClick={handleSaveLocationEdit}>
                  Guardar Cambios
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 2: Registrar Nueva Sede Física                                     */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isAddLocationModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0A0F0C] border border-white/[0.12] rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.8)] overflow-hidden"
            >
              <div className="p-4 px-6 border-b border-white/[0.08] flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#10B981]" />
                  <h3 className="text-sm font-bold text-white font-mono">Registrar Nueva Sede / Sucursal</h3>
                </div>
                <button
                  onClick={() => setIsAddLocationModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/[0.08] text-[#8E9893] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateLocation} className="p-6 space-y-4 text-xs font-mono">
                <div>
                  <label className="text-[11px] text-[#8E9893] block mb-1">Código de Sede (ej: BOD-BCA-05):</label>
                  <input
                    type="text"
                    required
                    placeholder="BOD-BCA-05"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full h-8 px-3 rounded-lg bg-black/60 border border-white/[0.08] text-white focus:outline-none focus:border-[#10B981]/60 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-[#8E9893] block mb-1">Nombre Comercial de la Sede:</label>
                  <input
                    type="text"
                    required
                    placeholder="Centro Logístico Barrancabermeja"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full h-8 px-3 rounded-lg bg-black/60 border border-white/[0.08] text-white focus:outline-none focus:border-[#10B981]/60 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-[#8E9893] block mb-1">Ciudad:</label>
                    <input
                      type="text"
                      value={newCity}
                      onChange={(e) => setNewCity(e.target.value)}
                      className="w-full h-8 px-3 rounded-lg bg-black/60 border border-white/[0.08] text-white focus:outline-none focus:border-[#10B981]/60 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-[#8E9893] block mb-1">Capacidad (m³):</label>
                    <input
                      type="number"
                      value={newCapacity}
                      onChange={(e) => setNewCapacity(Number(e.target.value))}
                      className="w-full h-8 px-3 rounded-lg bg-black/60 border border-white/[0.08] text-white focus:outline-none focus:border-[#10B981]/60 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-[#8E9893] block mb-1">Responsable Operativo:</label>
                  <input
                    type="text"
                    placeholder="Ing. Laura Valenzuela"
                    value={newManager}
                    onChange={(e) => setNewManager(e.target.value)}
                    className="w-full h-8 px-3 rounded-lg bg-black/60 border border-white/[0.08] text-white focus:outline-none focus:border-[#10B981]/60 font-mono"
                  />
                </div>

                <div className="p-4 px-6 border-t border-white/[0.08] -mx-6 -mb-6 bg-black/40 flex items-center justify-end gap-2 pt-4">
                  <Button variant="secondary" size="sm" type="button" onClick={() => setIsAddLocationModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button variant="primary" size="sm" type="submit">
                    Registrar Sede
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
