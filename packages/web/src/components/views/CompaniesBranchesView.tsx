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
    <div className="flex flex-col gap-group">
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

      {/* BARRA DE ACCIONES DE LA SUB-PESTAÑA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-compact">
        <div className="flex items-center gap-compact text-caption font-mono text-muted">
          <span className="px-compact py-hairline rounded-control bg-panel border border-border text-secondary">
            {filteredLocations.length} de {locations.length} sedes
          </span>
          <span className="hidden sm:inline">Capacidad total: 2.870 m³</span>
        </div>

        <div className="flex items-center gap-compact">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por sede, ciudad o código..."
              className="h-9 w-60 sm:w-72 bg-panel border border-border hover:border-border-strong focus:border-brand rounded-control pl-9 pr-9 text-caption text-primary placeholder:text-muted focus:outline-none transition-colors"
            />
            <span className="absolute right-2.5 text-caption font-mono text-muted bg-raised px-hairline py-hairline rounded border border-border pointer-events-none">
              ⌘F
            </span>
          </div>

          <button
            onClick={() => showToast("Abriendo asistente de registro de nueva sucursal...")}
            className="px-base py-hairline rounded-control bg-brand hover:bg-brand text-canvas font-semibold text-caption flex items-center gap-hairline transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Nueva Sede</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* CUERPO PRINCIPAL: SIDEBAR DE FILTROS + LISTA INVENTAR      */}
      {/* ========================================================= */}
      <div className="flex flex-col md:flex-row gap-group min-h-0">
        {/* PANEL IZQUIERDO DE FILTROS (260px) */}
        <aside className="w-full md:w-[260px] bg-panel rounded-container p-base border border-border shrink-0 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-group">
            {/* Estado de Sede (Grid 2x2) */}
            <div>
              <span className="text-caption font-mono text-muted block mb-compact">
                Estado Operativo
              </span>
              <div className="grid grid-cols-2 gap-compact">
                {[
                  { id: "todas", label: "Todas", count: 3 },
                  { id: "operativa", label: "Operativas", count: 2 },
                  { id: "alta_demanda", label: "Alta Dem.", count: 1 },
                  { id: "mantenimiento", label: "Mantenim.", count: 0 },
                ].map((btn) => (
                  <button
                    key={btn.id}
                    onClick={() => setSelectedStatus(btn.id)}
                    className={`py-hairline px-compact rounded-control text-caption font-medium transition-colors flex items-center justify-between border ${selectedStatus === btn.id
                      ? "bg-brand-surface border-brand/40 text-brand font-semibold"
                      : "bg-raised border-border text-secondary hover:text-primary hover:border-border-strong"
                      }`}
                  >
                    <span>{btn.label}</span>
                    <span
                      className={`text-caption font-mono px-hairline py-hairline rounded ${selectedStatus === btn.id
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

            {/* Departamento / Región */}
            <div className="pt-base border-t border-border">
              <label className="text-caption font-mono text-muted block mb-hairline">
                Departamento / Región
              </label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full h-9 bg-raised border border-border rounded-control px-compact text-caption text-primary focus:outline-none focus:border-brand"
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
            className="w-full mt-base py-hairline px-compact rounded-control bg-raised hover:border-border-strong border border-border text-caption font-medium text-secondary hover:text-primary transition-colors flex items-center justify-center gap-hairline"
          >
            <span>Restablecer Filtros</span>
          </button>
        </aside>

        {/* ÁREA DERECHA: TARJETAS DE 2 NIVELES (ESTILO INVENTAR) */}
        <main className="flex-1 overflow-y-auto space-y-element pr-hairline">
          {filteredLocations.map((loc) => (
            <div
              key={loc.id}
              className="bg-panel rounded-container p-base border border-border transition-colors hover:border-brand/30"
            >
              {/* Nivel 1: Cabecera con Código, Nombre, Capacidad y Badges */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-compact pb-compact border-b border-border">
                <div>
                  <div className="flex items-center gap-compact mb-hairline">
                    <span className="font-mono text-caption font-bold text-brand">
                      {loc.code}
                    </span>
                    <span className="text-muted">·</span>
                    <h3 className="text-body font-semibold text-primary">
                      {loc.name}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-compact text-caption text-secondary">
                    <span className="text-primary font-medium">
                      {loc.city}, {loc.department}
                    </span>
                    <span>•</span>
                    <span className="text-secondary">{loc.address}</span>
                    <span>•</span>
                    <span className="font-mono text-caption text-secondary">
                      Responsable: {loc.manager}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-compact shrink-0">
                  <div className="text-right">
                    <span className="text-body font-semibold text-primary font-mono block">
                      {loc.capacityPallets} pallets
                    </span>
                    <span className="text-caption text-muted">
                      Capacidad: {loc.capacityM3} m³
                    </span>
                  </div>

                  {loc.status === "operativa" ? (
                    <StatusBadge variant="success" label="Operativa" />
                  ) : (
                    <StatusBadge variant="warning" label="Alta Demanda" />
                  )}

                  <button className="p-hairline rounded-control text-secondary hover:text-primary hover:bg-raised transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Nivel 2: Sub-contenedor "Well" con Capacidad y Módulos */}
              <div className="bg-raised rounded-control p-base mt-compact border border-border space-y-element">
                {/* Barra de capacidad instalada */}
                <div>
                  <div className="flex items-center justify-between mb-hairline">
                    <span className="text-caption font-mono text-muted">
                      Capacidad Instalada
                    </span>
                    <span className="text-caption font-mono text-secondary">
                      <strong className="text-primary tabular-numbers">
                        {Math.round((loc.capacityPallets * loc.currentOccupancyPct) / 100)}
                      </strong>{" "}
                      / {loc.capacityPallets} pallets ·{" "}
                      <strong
                        className={
                          loc.currentOccupancyPct >= 85
                            ? "text-state-attention"
                            : "text-brand"
                        }
                      >
                        {loc.currentOccupancyPct}%
                      </strong>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-canvas rounded-pill overflow-hidden">
                    <div
                      className={`h-full rounded-pill transition-all ${loc.currentOccupancyPct >= 85
                        ? "bg-state-attention"
                        : "bg-brand"
                        }`}
                      style={{ width: `${loc.currentOccupancyPct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-hairline text-caption text-muted">
                    <span>
                      {loc.activeSkusCount} SKUs activos · {loc.capacityM3} m³ totales
                    </span>
                    <button
                      onClick={() => showToast(`Consultando inventario de ${loc.name}...`)}
                      className="text-brand hover:text-brand font-medium flex items-center gap-hairline"
                    >
                      <span>Ver Inventario de Sede</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Stepper de 4 Módulos Operativos */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-compact text-caption pt-compact border-t border-border">
                  {[
                    { label: "Recepción en Muelle", value: loc.modules.recepcionPct },
                    { label: "Almacenamiento", value: loc.modules.almacenamientoPct },
                    { label: "Despacho de Rutas", value: loc.modules.despachoPct },
                    { label: "Auditoría Cíclica", value: loc.modules.auditoriaPct },
                  ].map((mod) => (
                    <div
                      key={mod.label}
                      className="bg-panel p-compact rounded-control border border-border"
                    >
                      <div className="flex items-center justify-between text-caption text-secondary mb-hairline">
                        <span className="truncate">{mod.label}</span>
                        <span className="font-mono font-bold text-primary tabular-numbers">
                          {mod.value}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-canvas rounded-pill overflow-hidden">
                        <div
                          className={`h-full rounded-pill ${mod.value >= 95 ? "bg-brand" : "bg-brand/60"
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
            <div className="bg-panel rounded-container p-section border border-border text-center">
              <Building2 className="w-8 h-8 text-muted mx-auto mb-compact" />
              <p className="text-body text-secondary">No hay sedes que coincidan con los filtros.</p>
              <button
                onClick={handleResetFilters}
                className="mt-compact text-caption text-brand hover:text-brand font-medium"
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
