import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Building2,
  MapPin,
  Warehouse,
  Phone,
  Mail,
  Users,
  CheckCircle2,
  Clock,
  Globe,
  ShieldCheck,
  Plus,
  Sparkles,
  Package,
  Truck,
  ArrowUpRight,
  MoreHorizontal,
  Search,
} from "lucide-react";
import { StatusBadge } from "../ui/StatusBadge";

export interface PhysicalLocation {
  id: string;
  code: string;
  name: string;
  type: string;
  city: string;
  department: string;
  address: string;
  capacityM3: number;
  capacityPallets: number;
  currentOccupancyPct: number;
  manager: string;
  phone: string;
  operatingHours: string;
  activeSkusCount: number;
  status: "operativa" | "alta_demanda" | "mantenimiento";
  modules: {
    recepcionPct: number;
    almacenamientoPct: number;
    despachoPct: number;
    auditoriaPct: number;
  };
}

const SEED_LOCATIONS: PhysicalLocation[] = [
  {
    id: "loc_01",
    code: "BOD-BGA-01",
    name: "Bodega Matriz Chimitá (Centro de Distribución Principal)",
    type: "Centro de Distribución Matriz",
    city: "Bucaramanga",
    department: "Santander",
    address: "Km 4 Vía Palenque, Zona Industrial Chimitá",
    capacityM3: 1200,
    capacityPallets: 850,
    currentOccupancyPct: 82,
    manager: "Ing. Carlos Mendoza",
    phone: "+57 (607) 639-0011",
    operatingHours: "06:00 a. m. - 18:00 p. m.",
    activeSkusCount: 338,
    status: "operativa",
    modules: {
      recepcionPct: 98,
      almacenamientoPct: 82,
      despachoPct: 95,
      auditoriaPct: 100,
    },
  },
  {
    id: "loc_02",
    code: "BOD-BOG-02",
    name: "Centro de Distribución Fontibón (Hub Cundinamarca)",
    type: "Hub Regional de Consolidación",
    city: "Bogotá D.C.",
    department: "Cundinamarca",
    address: "Calle 17 # 98-45, Parque Industrial Fontibón",
    capacityM3: 950,
    capacityPallets: 620,
    currentOccupancyPct: 88,
    manager: "Dra. Laura Cárdenas",
    phone: "+57 (601) 745-8822",
    operatingHours: "07:00 a. m. - 19:00 p. m.",
    activeSkusCount: 284,
    status: "alta_demanda",
    modules: {
      recepcionPct: 92,
      almacenamientoPct: 88,
      despachoPct: 91,
      auditoriaPct: 98,
    },
  },
  {
    id: "loc_03",
    code: "BOD-MED-03",
    name: "Hub Logístico Itagüí (Corredor Antioquia)",
    type: "Hub Regional de Consolidación",
    city: "Medellín",
    department: "Antioquia",
    address: "Carrera 42 # 54A-12, Sector Industrial Guayabal",
    capacityM3: 720,
    capacityPallets: 480,
    currentOccupancyPct: 74,
    manager: "Ing. Andrés Echeverri",
    phone: "+57 (604) 448-9900",
    operatingHours: "06:30 a. m. - 17:30 p. m.",
    activeSkusCount: 215,
    status: "operativa",
    modules: {
      recepcionPct: 96,
      almacenamientoPct: 74,
      despachoPct: 97,
      auditoriaPct: 100,
    },
  },
];

export const CompaniesBranchesView: React.FC = () => {
  const [locations, setLocations] = useState<PhysicalLocation[]>(SEED_LOCATIONS);
  const [selectedStatus, setSelectedStatus] = useState<string>("todas");
  const [selectedDept, setSelectedDept] = useState<string>("todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleResetFilters = () => {
    setSelectedStatus("todas");
    setSelectedDept("todos");
    setSearchQuery("");
  };

  const filteredLocations = useMemo(() => {
    return locations.filter((l) => {
      if (selectedStatus !== "todas" && l.status !== selectedStatus) return false;
      if (selectedDept !== "todos" && l.department !== selectedDept) return false;
      if (
        searchQuery &&
        !l.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !l.code.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !l.city.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [locations, selectedStatus, selectedDept, searchQuery]);

  return (
    <div className="flex flex-col gap-5">
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

      {/* BARRA DE ACCIONES DE LA SUB-PESTAÑA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500">
          <span className="px-2 py-1 rounded-lg bg-surface-1 border border-white/[0.06] text-zinc-300">
            {filteredLocations.length} de {locations.length} sedes
          </span>
          <span className="hidden sm:inline">Capacidad total: 2.870 m³</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por sede, ciudad o código..."
              className="h-9 w-60 sm:w-72 bg-surface-1 border border-white/[0.08] hover:border-white/20 focus:border-emerald-500/50 rounded-xl pl-9 pr-9 text-xs text-white placeholder:text-zinc-500 focus:outline-none transition-all"
            />
            <span className="absolute right-2.5 text-[10px] font-mono text-zinc-500 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06] pointer-events-none">
              ⌘F
            </span>
          </div>

          <button
            onClick={() => showToast("Abriendo asistente de registro de nueva sucursal...")}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs flex items-center gap-1.5 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Nueva Sede</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* CUERPO PRINCIPAL: SIDEBAR DE FILTROS + LISTA INVENTAR      */}
      {/* ========================================================= */}
      <div className="flex flex-col md:flex-row gap-6 min-h-0">
        {/* PANEL IZQUIERDO DE FILTROS (260px) */}
        <aside className="w-full md:w-[260px] bg-surface-1 rounded-2xl p-4 border border-white/[0.06] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] shrink-0 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-5">
            {/* Estado de Sede (Grid 2x2) */}
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block mb-2.5">
                Estado Operativo
              </span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "todas", label: "Todas", count: 3 },
                  { id: "operativa", label: "Operativas", count: 2 },
                  { id: "alta_demanda", label: "Alta Dem.", count: 1 },
                  { id: "mantenimiento", label: "Mantenim.", count: 0 },
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

            {/* Departamento / Región */}
            <div className="pt-4 border-t border-white/[0.06]">
              <label className="text-[10px] font-mono text-zinc-500 block mb-1">
                Departamento / Región
              </label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full h-9 bg-surface-well border border-white/[0.06] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-emerald-500/50"
              >
                <option value="todos">Todos los departamentos</option>
                <option value="Santander">Santander (Matriz)</option>
                <option value="Cundinamarca">Cundinamarca (Hub Central)</option>
                <option value="Antioquia">Antioquia (Hub Occidente)</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleResetFilters}
            className="w-full mt-4 py-2 px-3 rounded-xl bg-surface-well hover:bg-white/[0.06] border border-white/[0.06] text-xs font-medium text-zinc-400 hover:text-white transition-all flex items-center justify-center gap-1.5"
          >
            <span>Restablecer Filtros</span>
          </button>
        </aside>

        {/* ÁREA DERECHA: TARJETAS DE 2 NIVELES (ESTILO INVENTAR) */}
        <main className="flex-1 overflow-y-auto space-y-3.5 pr-1">
          {filteredLocations.map((loc) => (
            <div
              key={loc.id}
              className="bg-surface-1 rounded-2xl p-5 border border-white/[0.06] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] transition-all hover:border-emerald-500/30"
            >
              {/* Nivel 1: Cabecera con Código, Nombre, Capacidad y Badges */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className="font-mono text-xs font-bold text-emerald-400">
                      {loc.code}
                    </span>
                    <span className="text-white/20">·</span>
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      {loc.name}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                    <span className="text-zinc-300 font-medium">
                      {loc.city}, {loc.department}
                    </span>
                    <span>•</span>
                    <span className="text-zinc-400">{loc.address}</span>
                    <span>•</span>
                    <span className="font-mono text-[11px] text-zinc-400">
                      Responsable: {loc.manager}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-sm font-bold text-white font-mono block">
                      {loc.capacityPallets} pallets
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      Capacidad: {loc.capacityM3} m³
                    </span>
                  </div>

                  {loc.status === "operativa" ? (
                    <StatusBadge variant="success" label="Operativa" />
                  ) : (
                    <StatusBadge variant="warning" label="Alta Demanda" />
                  )}

                  <button className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Nivel 2: Sub-contenedor "Well" con Capacidad y Módulos */}
              <div className="bg-surface-well rounded-xl p-4 mt-3 border border-white/[0.04] space-y-3.5">
                {/* Barra de capacidad instalada */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
                      Capacidad Instalada
                    </span>
                    <span className="text-[11px] font-mono text-zinc-400">
                      <strong className="text-white tabular-numbers">
                        {Math.round((loc.capacityPallets * loc.currentOccupancyPct) / 100)}
                      </strong>{" "}
                      / {loc.capacityPallets} pallets ·{" "}
                      <strong
                        className={
                          loc.currentOccupancyPct >= 85
                            ? "text-amber-400"
                            : "text-emerald-400"
                        }
                      >
                        {loc.currentOccupancyPct}%
                      </strong>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${loc.currentOccupancyPct >= 85
                          ? "bg-gradient-to-r from-amber-500 to-amber-400"
                          : "bg-gradient-to-r from-emerald-600 to-emerald-400"
                        }`}
                      style={{ width: `${loc.currentOccupancyPct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1.5 text-[10px] text-zinc-500">
                    <span>
                      {loc.activeSkusCount} SKUs activos · {loc.capacityM3} m³ totales
                    </span>
                    <button
                      onClick={() => showToast(`Consultando inventario de ${loc.name}...`)}
                      className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                    >
                      <span>Ver Inventario de Sede</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Stepper de 4 Módulos Operativos */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs pt-3 border-t border-white/[0.04]">
                  {[
                    { label: "Recepción en Muelle", value: loc.modules.recepcionPct },
                    { label: "Almacenamiento", value: loc.modules.almacenamientoPct },
                    { label: "Despacho de Rutas", value: loc.modules.despachoPct },
                    { label: "Auditoría Cíclica", value: loc.modules.auditoriaPct },
                  ].map((mod) => (
                    <div
                      key={mod.label}
                      className="bg-surface-1/60 p-2.5 rounded-lg border border-white/[0.04]"
                    >
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
                        <span className="truncate">{mod.label}</span>
                        <span className="font-mono font-bold text-white tabular-numbers">
                          {mod.value}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${mod.value >= 95 ? "bg-emerald-400" : "bg-emerald-600"
                            }`}
                          style={{ width: `${mod.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {filteredLocations.length === 0 && (
            <div className="bg-surface-1 rounded-2xl p-10 border border-white/[0.06] text-center">
              <Building2 className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
              <p className="text-sm text-zinc-400">No hay sedes que coincidan con los filtros.</p>
              <button
                onClick={handleResetFilters}
                className="mt-3 text-xs text-emerald-400 hover:text-emerald-300 font-medium"
              >
                Restablecer filtros
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
