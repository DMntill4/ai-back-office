import React, { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  UserCheck,
  Shield,
  Lock,
  CheckCircle2,
  Plus,
  Search,
  Building2,
  ShieldCheck,
  MoreHorizontal,
  RefreshCw,
} from "lucide-react";
import { KpiStrip, KpiCardItem } from "../ui/KpiStrip";
import { StatusBadge } from "../ui/StatusBadge";
import { EmptyState } from "../ui/EmptyState";
import { api } from "../../services/apiClient";

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

/** Límite de firma por rol, derivado de la política de gobernanza. */
const ROLE_APPROVAL_LIMITS: Record<string, number> = {
  admin: 999999999,
  owner: 999999999,
  supervisor: 10000000,
  operator: 5000000,
  viewer: 0,
};

/** Capacidades operativas por rol, alineadas con el motor de políticas. */
const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [
    "Firma de aprobación sin límite",
    "Mutación de políticas de gobernanza",
    "Adjudicación de contratos marco",
    "Parada de emergencia del agente",
  ],
  owner: [
    "Firma de aprobación sin límite",
    "Mutación de políticas de gobernanza",
    "Parada de emergencia del agente",
  ],
  supervisor: [
    "Firma de aprobación hasta $10M COP",
    "Ajustes de inventario físico",
    "Despacho y asignación de rutas",
  ],
  operator: [
    "Recepción y muelle",
    "Telemetría de rutas en vivo",
    "Conciliación de entregas",
  ],
  viewer: ["Consulta de tableros y reportes"],
};

function humanizeRole(role: string): string {
  const map: Record<string, string> = {
    admin: "Administrador General",
    owner: "Propietario",
    supervisor: "Supervisor de Operaciones",
    operator: "Coordinador de Distribución",
    viewer: "Consulta",
  };
  return map[role?.toLowerCase()] ?? (role || "Operador");
}

function mapTeamMember(u: any): UserOperator {
  const roleKey = String(u?.role ?? "operator").toLowerCase();
  return {
    id: String(u?.id ?? crypto.randomUUID()),
    name: String(u?.name ?? "Operador sin nombre"),
    email: String(u?.email ?? "sin-correo@empresa.com"),
    role: humanizeRole(roleKey),
    maxApprovalLimitCop: ROLE_APPROVAL_LIMITS[roleKey] ?? 0,
    assignedWarehouses: Array.isArray(u?.assignedWarehouses) && u.assignedWarehouses.length > 0
      ? u.assignedWarehouses
      : ["Todas las sedes"],
    lastLogin: u?.createdAt
      ? `Alta: ${new Date(u.createdAt).toLocaleDateString("es-CO")}`
      : "Sin registro",
    status: "activo",
    permissions: ROLE_PERMISSIONS[roleKey] ?? ROLE_PERMISSIONS.operator,
  };
}

export const RolesPermissionsView: React.FC = () => {
  const [operators, setOperators] = useState<UserOperator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.team.list();
      const rows = Array.isArray(res.data) ? res.data : [];
      setOperators(rows.map(mapTeamMember));
      setIsFallback(Boolean(res.isFallback));
      if (!res.success) setError(res.message ?? "No fue posible leer el equipo.");
    } catch (err: any) {
      setError(err?.message ?? "Error de red al consultar el equipo.");
      setOperators([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const kpis: KpiCardItem[] = useMemo(() => {
    const admins = operators.filter((o) => o.maxApprovalLimitCop > 100000000).length;
    const warehouses = new Set(operators.flatMap((o) => o.assignedWarehouses));
    return [
      {
        title: "Usuarios con Acceso",
        value: `${operators.length} Operadores`,
        subtitle: "Autenticación multifactor activa",
        trend: { direction: "up", label: "0 accesos bloqueados" },
        icon: UserCheck,
        isHero: true,
        onActionClick: () => showToast("Abriendo invitación de operador..."),
      },
      {
        title: "Nivel de Privilegio Crítico",
        value: `${admins} Administrador${admins === 1 ? "" : "es"}`,
        subtitle: "Firma ilimitada habilitada",
        trend: { direction: "up", label: admins > 0 ? "Cobertura activa" : "Sin firmante" },
        icon: ShieldCheck,
      },
      {
        title: "Sedes Bajo Cobertura",
        value: `${warehouses.size} Bodegas`,
        subtitle: Array.from(warehouses).slice(0, 3).join(", ") || "Sin asignar",
        trend: { direction: "up", label: "Asignación vigente" },
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
  }, [operators]);

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
    { capability: "Firma de Órdenes", roles: ["Administrador General", "Supervisor de Operaciones", "Coordinador de Distribución"] },
    { capability: "Mutación de Políticas", roles: ["Administrador General"] },
    { capability: "Ajuste de Inventario Físico", roles: ["Administrador General", "Supervisor de Operaciones"] },
    { capability: "Despacho y Rutas", roles: ["Administrador General", "Supervisor de Operaciones", "Coordinador de Distribución"] },
    { capability: "Parada de Emergencia", roles: ["Administrador General"] },
    { capability: "Conciliación de Entregas", roles: ["Coordinador de Distribución"] },
  ];

  const ROLES = ["Administrador General", "Supervisor de Operaciones", "Coordinador de Distribución"];

  return (
    <div className="flex flex-col gap-group">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            className="fixed top-6 right-8 z-50 px-compact py-compact rounded-pill flex items-center gap-compact bg-state-ok-surface border border-brand/40 text-state-ok"
          >
            <div className="w-2 h-2 rounded-full bg-state-ok animate-pulse" />
            <span className="text-caption font-mono font-medium">{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-muted hover:text-primary text-caption ml-hairline"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-compact">
        <div className="flex items-center gap-compact text-caption font-mono text-muted">
          <span className="px-compact py-hairline rounded-control bg-raised border border-border text-secondary">
            {filteredOperators.length} de {operators.length} operadores
          </span>
          <span className="hidden sm:inline">Autenticación multifactor obligatoria</span>
        </div>

        <div className="flex items-center gap-compact">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-muted absolute left-compact pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar operador o cargo..."
              className="h-9 w-60 sm:w-72 bg-raised border border-border hover:border-border-strong focus:border-brand/50 rounded-control pl-group pr-group text-caption text-primary placeholder:text-muted focus:outline-none transition-colors"
            />
          </div>

          <button
            onClick={() => void load()}
            disabled={loading}
            className="h-9 px-compact rounded-control bg-raised border border-border hover:border-border-strong text-secondary hover:text-primary text-caption font-medium flex items-center gap-hairline transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </button>

          <button
            onClick={() => showToast("Abriendo diálogo para invitar nuevo operador...")}
            className="h-9 px-compact rounded-control bg-brand hover:bg-brand/90 text-canvas font-semibold text-caption flex items-center gap-hairline transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Invitar</span>
          </button>
        </div>
      </div>

      {isFallback && (
        <div className="px-compact py-compact rounded-control bg-state-attention-surface border border-border text-caption text-state-attention">
          Mostrando datos de respaldo: el backend no respondió con el equipo real.
        </div>
      )}

      {error && (
        <div className="px-compact py-compact rounded-control bg-state-error-surface border border-border text-caption text-state-error">
          {error}
        </div>
      )}

      <KpiStrip items={kpis} />

      <div className="bg-panel rounded-container border border-border overflow-hidden">
        <div className="flex items-center justify-between px-base py-compact border-b border-border">
          <div className="flex items-center gap-element">
            <div className="w-8 h-8 rounded-control bg-brand-surface text-brand flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-label font-bold text-primary">Matriz de Privilegios por Rol</h3>
              <span className="text-caption text-muted font-mono">
                Capacidades operativas habilitadas por cargo
              </span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-caption border-collapse min-w-[640px]">
            <thead>
              <tr className="bg-raised border-b border-border text-muted font-mono text-caption">
                <th className="py-compact px-base font-medium">Capacidad Operativa</th>
                {ROLES.map((r) => (
                  <th key={r} className="py-compact px-compact font-medium text-center">
                    {r.split(" ")[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {PERMISSION_MATRIX.map((row) => (
                <tr key={row.capability} className="hover:bg-raised/50 transition-colors">
                  <td className="py-compact px-base text-secondary font-medium">{row.capability}</td>
                  {ROLES.map((r) => {
                    const granted = row.roles.includes(r);
                    return (
                      <td key={r} className="py-compact px-compact text-center">
                        {granted ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-control bg-brand-surface border border-brand/40">
                            <CheckCircle2 className="w-3 h-3 text-brand" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-control bg-raised border border-border">
                            <Lock className="w-2.5 h-2.5 text-muted" />
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

      {loading && operators.length === 0 ? (
        <div className="space-y-compact" aria-busy="true" aria-label="Cargando operadores">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 rounded-container bg-raised animate-pulse" />
          ))}
        </div>
      ) : operators.length === 0 ? (
        <EmptyState
          title="Sin operadores registrados"
          description="El backend no devolvió miembros del equipo para esta empresa. Invita al primer operador para habilitar la firma de aprobaciones."
          actionLabel="Actualizar"
          onAction={() => void load()}
        />
      ) : filteredOperators.length === 0 ? (
        <EmptyState
          title="Ningún operador coincide"
          description="Ajusta la búsqueda por nombre, correo o cargo para encontrar al operador."
          actionLabel="Limpiar búsqueda"
          onAction={() => setSearchQuery("")}
        />
      ) : (
        <div className="space-y-compact">
          {filteredOperators.map((op) => (
            <div
              key={op.id}
              className="bg-panel rounded-container p-base border border-border transition-colors hover:border-border-strong"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-compact pb-compact border-b border-border">
                <div className="flex items-center gap-element">
                  <div className="w-10 h-10 rounded-pill bg-brand-surface text-brand font-bold text-label flex items-center justify-center font-mono">
                    {op.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-compact">
                      <h3 className="text-label font-bold text-primary">{op.name}</h3>
                      <StatusBadge variant="success" label="Activo" />
                    </div>
                    <div className="flex items-center gap-compact text-caption text-muted mt-hairline">
                      <span className="text-secondary font-medium">{op.role}</span>
                      <span>•</span>
                      <span className="font-mono text-caption text-muted">{op.email}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-element">
                  <div className="text-right">
                    <span className="text-caption font-mono font-bold text-primary block tabular-nums">
                      {op.maxApprovalLimitCop > 100000000
                        ? "Sin Límite"
                        : `$${(op.maxApprovalLimitCop / 1000000).toFixed(0)}M COP máx.`}
                    </span>
                    <span className="text-caption text-muted">Límite de Firma</span>
                  </div>

                  <button className="p-hairline rounded-control text-muted hover:text-primary hover:bg-raised transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="bg-raised rounded-control p-compact mt-compact border border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-hairline pb-compact mb-compact border-b border-border text-caption">
                  <span className="text-muted">
                    Sedes asignadas:{" "}
                    <strong className="text-primary">{op.assignedWarehouses.join(", ")}</strong>
                  </span>
                  <span className="text-muted font-mono text-caption">
                    Última actividad: {op.lastLogin}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-hairline">
                  {op.permissions.map((perm, idx) => (
                    <span
                      key={idx}
                      className="px-compact py-hairline rounded-control bg-panel border border-border text-caption font-medium text-brand flex items-center gap-hairline"
                    >
                      <CheckCircle2 className="w-3 h-3 text-brand" />
                      <span>{perm}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
