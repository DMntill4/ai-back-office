import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  UserCheck,
  Shield,
  Key,
  Lock,
  Mail,
  CheckCircle2,
  Plus,
  Search,
  Building2,
  ShieldCheck,
  MoreHorizontal,
} from "lucide-react";
import { KpiStrip, KpiCardItem } from "../ui/KpiStrip";
import { StatusBadge } from "../ui/StatusBadge";

interface UserOperator {
  id: string;
  name: string;
  email: string;
  role: string;
  maxApprovalLimitCop: number;
  assignedWarehouses: string[];
  lastLogin: string;
  status: "activo" | "invitado";
  permissions: string[];
}

const INITIAL_OPERATORS: UserOperator[] = [
  {
    id: "usr_01",
    name: "Fernando S.",
    email: "fernando.s@ferreteriasantander.com",
    role: "Administrador General",
    maxApprovalLimitCop: 999999999,
    assignedWarehouses: ["Bucaramanga Matriz", "CD Bogotá D.C.", "CD Medellín"],
    lastLogin: "Activo ahora",
    status: "activo",
    permissions: [
      "Firma HITL Sin Límite",
      "Mutación de Políticas de Gobernanza",
      "Adjudicación de Contratos Marco",
      "Parada de Emergencia del Agente",
    ],
  },
  {
    id: "usr_02",
    name: "Carlos Méndez",
    email: "carlos.m@ferreteriasantander.com",
    role: "Supervisor de Operaciones",
    maxApprovalLimitCop: 10000000,
    assignedWarehouses: ["Bucaramanga Matriz"],
    lastLogin: "Hoy, 08:45 a. m.",
    status: "activo",
    permissions: [
      "Firma HITL hasta $10M COP",
      "Ajustes de Inventario Físico",
      "Despacho y Asignación de Rutas",
    ],
  },
  {
    id: "usr_03",
    name: "Laura Cárdenas",
    email: "laura.c@ferreteriasantander.com",
    role: "Coordinadora de Distribución",
    maxApprovalLimitCop: 5000000,
    assignedWarehouses: ["CD Bogotá D.C."],
    lastLogin: "Ayer, 17:20 p. m.",
    status: "activo",
    permissions: [
      "Recepción y Muelle",
      "Telemetría OSRM en Vivo",
      "Conciliación de Entregas",
    ],
  },
];

export const RolesPermissionsView: React.FC = () => {
  const [operators, setOperators] = useState<UserOperator[]>(INITIAL_OPERATORS);
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const kpis: KpiCardItem[] = [
    {
      title: "Usuarios con Acceso",
      value: "3 Operadores",
      subtitle: "Autenticación multifactor activa",
      trend: { direction: "up", label: "0 accesos bloqueados" },
      icon: UserCheck,
      isHero: true,
      onActionClick: () => showToast("Abriendo invitación de operador..."),
    },
    {
      title: "Nivel de Privilegio Crítico",
      value: "1 Administrador",
      subtitle: "Firma ilimitada habilitada",
      trend: { direction: "up", label: "Fernando S." },
      icon: ShieldCheck,
    },
    {
      title: "Sedes Bajo Cobertura",
      value: "3 Bodegas",
      subtitle: "Bucaramanga, Bogotá, Medellín",
      trend: { direction: "up", label: "100% asignadas" },
      icon: Building2,
    },
    {
      title: "Seguridad de Acceso",
      value: "100% Seguro",
      subtitle: "Firmas digitales validadas",
      trend: { direction: "up", label: "Criptografía activa" },
      icon: Lock,
    },
  ];

  const filteredOperators = useMemo(() => {
    return operators.filter((op) => {
      if (
        searchQuery &&
        !op.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !op.email.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !op.role.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [operators, searchQuery]);

  return (
    <div className="flex-1 h-full overflow-y-auto bg-canvas text-[#F9FAFB] font-sans select-none flex flex-col p-6 space-y-6">
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

      {/* HEADER SUPERIOR */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Roles y Permisos de Operación
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Gestión de privilegios, delegación de firma HITL y control de accesos multisede
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar operador o cargo..."
              className="h-9 w-60 sm:w-72 bg-surface-1 border border-white/[0.08] hover:border-white/20 focus:border-emerald-500/50 rounded-xl pl-9 pr-9 text-xs text-white placeholder:text-zinc-500 focus:outline-none transition-all"
            />
          </div>

          <button
            onClick={() => showToast("Abriendo diálogo para invitar nuevo operador...")}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs flex items-center gap-1.5 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Invitar Operador</span>
          </button>
        </div>
      </header>

      {/* FILA 1: KPI STRIP CON TARJETA HÉROE */}
      <KpiStrip items={kpis} />

      {/* FILA 2: LISTA DE TARJETAS DE 2 NIVELES (INVENTAR STYLE) */}
      <div className="space-y-3.5">
        {filteredOperators.map((op) => (
          <div
            key={op.id}
            className="bg-surface-1 rounded-2xl p-5 border border-white/[0.06] shadow-xl transition-all hover:border-emerald-500/30"
          >
            {/* Nivel 1: Cabecera con Nombre, Cargo y Estado */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-sm flex items-center justify-center font-mono">
                  {op.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">{op.name}</h3>
                    <StatusBadge variant="success" label="Activo" />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                    <span className="text-zinc-300 font-medium">{op.role}</span>
                    <span>•</span>
                    <span className="font-mono text-[11px] text-zinc-500">{op.email}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-white block">
                    {op.maxApprovalLimitCop > 100000000
                      ? "Sin Límite"
                      : `$${(op.maxApprovalLimitCop / 1000000).toFixed(0)}M COP máx.`}
                  </span>
                  <span className="text-[10px] text-zinc-500">Límite de Firma</span>
                </div>

                <button className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Nivel 2: Sub-caja Well con Permisos y Sedes Asignadas */}
            <div className="bg-surface-well rounded-xl p-4 mt-3 border border-white/[0.04]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-white/[0.04] text-xs">
                <span className="text-zinc-400">
                  Sedes asignadas:{" "}
                  <strong className="text-white">{op.assignedWarehouses.join(", ")}</strong>
                </span>
                <span className="text-zinc-500 font-mono text-[11px]">
                  Última actividad: {op.lastLogin}
                </span>
              </div>

              {/* Píldoras de Permisos Sólidas */}
              <div className="flex flex-wrap items-center gap-2">
                {op.permissions.map((perm, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-surface-1 border border-white/[0.06] text-xs font-medium text-emerald-300 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>{perm}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
