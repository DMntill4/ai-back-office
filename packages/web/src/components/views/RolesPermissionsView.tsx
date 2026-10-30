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

  const PERMISSION_MATRIX = [
    { capability: "Firma HITL de Órdenes", roles: ["Administrador General", "Supervisor de Operaciones", "Coordinadora de Distribución"] },
    { capability: "Mutación de Políticas", roles: ["Administrador General"] },
    { capability: "Ajuste de Inventario Físico", roles: ["Administrador General", "Supervisor de Operaciones"] },
    { capability: "Despacho y Rutas", roles: ["Administrador General", "Supervisor de Operaciones", "Coordinadora de Distribución"] },
    { capability: "Parada de Emergencia", roles: ["Administrador General"] },
    { capability: "Conciliación de Entregas", roles: ["Coordinadora de Distribución"] },
  ];

  const ROLES = ["Administrador General", "Supervisor de Operaciones", "Coordinadora de Distribución"];

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
            {filteredOperators.length} de {operators.length} operadores
          </span>
          <span className="hidden sm:inline">Autenticación multifactor obligatoria</span>
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
            <span>+ Invitar</span>
          </button>
        </div>
      </div>

      {/* FILA 1: KPI STRIP CON TARJETA HÉROE */}
      <KpiStrip items={kpis} />

      {/* FILA 2: MATRIZ VISUAL DE PERMISOS POR ROL */}
      <div className="bg-surface-1 rounded-2xl border border-white/[0.06] shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Matriz de Privilegios por Rol</h3>
              <span className="text-[10px] text-zinc-500 font-mono">
                Capacidades operativas habilitadas por cargo
              </span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse min-w-[640px]">
            <thead>
              <tr className="bg-[#0B110E] border-b border-white/[0.06] text-zinc-400 font-mono text-[10px] uppercase tracking-wider">
                <th className="py-2.5 px-4 font-medium">Capacidad Operativa</th>
                {ROLES.map((r) => (
                  <th key={r} className="py-2.5 px-3 font-medium text-center">
                    {r.split(" ")[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {PERMISSION_MATRIX.map((row) => (
                <tr key={row.capability} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-4 text-zinc-200 font-medium">{row.capability}</td>
                  {ROLES.map((r) => {
                    const granted = row.roles.includes(r);
                    return (
                      <td key={r} className="py-2.5 px-3 text-center">
                        {granted ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-emerald-500/15 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-white/[0.03] border border-white/[0.06]">
                            <Lock className="w-2.5 h-2.5 text-zinc-600" />
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FILA 3: LISTA DE TARJETAS DE 2 NIVELES (INVENTAR STYLE) */}
      <div className="space-y-3.5">
        {filteredOperators.map((op) => (
          <div
            key={op.id}
            className="bg-surface-1 rounded-2xl p-5 border border-white/[0.06] shadow-card transition-all hover:border-emerald-500/30"
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
                  <span className="text-xs font-mono font-bold text-white block tabular-numbers">
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
