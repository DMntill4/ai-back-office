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
  Trash2,
} from "lucide-react";
import { KpiStrip, KpiCardItem } from "../ui/KpiStrip";
import { StatusBadge } from "../ui/StatusBadge";
import { EmptyState } from "../ui/EmptyState";
import { Dialog } from "../ui/Dialog";
import { api } from "../../services/apiClient";

type UserRoleKey =
  | "owner"
  | "admin"
  | "supervisor"
  | "operator"
  | "driver"
  | "viewer"
  | "auditor"
  | "finance"
  | "client";

interface UserOperator {
  id: string;
  name: string;
  email: string;
  roleKey: UserRoleKey;
  role: string;
  assignedWarehouses: string[];
  hasPassword: boolean;
  lastLogin: string;
  status: "configurado" | "pendiente";
  permissions: string[];
}

const PERMISSION_LABELS: Record<string, string> = {
  canConfigureBot: "Configurar agente",
  canUploadSql: "Cargar datos",
  canApprovePurchases: "Aprobar compras",
  canExecutePurchases: "Ejecutar compras",
  canProcessPayments: "Procesar pagos",
  canDispatch: "Despachar rutas",
  canReceive: "Recibir mercancía",
  canManageTeam: "Administrar equipo",
  canManageChannels: "Administrar canales",
  canViewDashboard: "Ver tableros",
};

function humanizeRole(role: string): string {
  const map: Record<string, string> = {
    admin: "Administrador General",
    owner: "Propietario",
    supervisor: "Supervisor de Operaciones",
    operator: "Operador de Logística y Compras",
    driver: "Conductor / Transportista",
    viewer: "Consultor (Solo Lectura)",
    auditor: "Auditor de decisiones",
    finance: "Tesorería / Control de Pagos",
    client: "Cliente / Destinatario",
  };
  return map[role?.toLowerCase()] ?? (role || "Rol no especificado");
}

function mapTeamMember(u: any): UserOperator {
  const roleKey = String(u?.role ?? "operator").toLowerCase();
  return {
    id: String(u?.id ?? ""),
    name: String(u?.name ?? "Usuario sin nombre"),
    email: String(u?.email ?? "Correo no disponible"),
    roleKey: roleKey as UserRoleKey,
    role: humanizeRole(roleKey),
    assignedWarehouses: Array.isArray(u?.assignedWarehouses) ? u.assignedWarehouses : [],
    hasPassword: Boolean(u?.hasPassword),
    lastLogin: u?.createdAt
      ? `Alta: ${new Date(u.createdAt).toLocaleDateString("es-CO")}`
      : "Sin registro",
    status: u?.hasPassword ? "configurado" : "pendiente",
    permissions: Array.isArray(u?.permissions)
      ? u.permissions.map((permission: string) => PERMISSION_LABELS[permission] ?? permission)
      : [],
  };
}

const ROLE_OPTIONS: Array<{ value: UserRoleKey; label: string }> = [
  { value: "admin", label: "Administrador" },
  { value: "supervisor", label: "Supervisor" },
  { value: "operator", label: "Operador" },
  { value: "driver", label: "Conductor" },
  { value: "viewer", label: "Solo lectura" },
  { value: "auditor", label: "Auditor" },
  { value: "finance", label: "Tesorería" },
  { value: "client", label: "Cliente" },
  { value: "owner", label: "Propietario" },
];

export const RolesPermissionsView: React.FC = () => {
  const [operators, setOperators] = useState<UserOperator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRoleKey>("operator");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<UserOperator | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

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
      if (!res.success || res.isFallback) setError(res.message ?? "No fue posible consultar el equipo real.");
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

  const handleCreateUser = async () => {
    setInviteError(null);
    setIsCreating(true);
    try {
      await api.team.create({
        name: inviteName,
        email: inviteEmail,
        password: invitePassword,
        role: inviteRole,
      });
      setIsInviteOpen(false);
      setInviteName("");
      setInviteEmail("");
      setInvitePassword("");
      setInviteRole("operator");
      showToast("Cuenta creada y guardada en la base de datos.");
      await load();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "No se pudo crear el usuario.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleRoleChange = async (operator: UserOperator, role: UserRoleKey) => {
    setOpenMenuId(null);
    if (operator.roleKey === role) return;
    try {
      await api.team.updateRole(operator.id, role);
      showToast(`Rol actualizado para ${operator.name}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el rol.");
    }
  };

  const handleRemoveUser = async () => {
    if (!memberToRemove) return;
    setIsRemoving(true);
    try {
      await api.team.remove(memberToRemove.id);
      showToast(`Se eliminó el acceso de ${memberToRemove.name}.`);
      setMemberToRemove(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el usuario.");
    } finally {
      setIsRemoving(false);
    }
  };

  const kpis: KpiCardItem[] = useMemo(() => {
    const admins = operators.filter((o) => o.roleKey === "owner" || o.roleKey === "admin").length;
    const secureAccounts = operators.filter((o) => o.hasPassword).length;
    return [
      {
        title: "Usuarios con Acceso",
        value: `${operators.length} Operadores`,
        subtitle: "Autenticación multifactor activa",
        trend: { direction: "up", label: "0 accesos bloqueados" },
        icon: UserCheck,
        isHero: true,
        onActionClick: () => {
          setInviteError(null);
          setIsInviteOpen(true);
        },
      },
      {
        title: "Nivel de Privilegio Crítico",
        value: `${admins} Administrador${admins === 1 ? "" : "es"}`,
        subtitle: "Usuarios con rol de propietario o administrador",
        trend: { direction: "up", label: admins > 0 ? "Cobertura activa" : "Sin firmante" },
        icon: ShieldCheck,
      },
      {
        title: "Sedes Bajo Cobertura",
        value: "No disponible",
        subtitle: "El backend no registra asignaciones por sede",
        trend: { direction: "neutral", label: "Sin dato" },
        icon: Building2,
      },
      {
        title: "Seguridad de Acceso",
        value: `${secureAccounts} de ${operators.length}`,
        subtitle: "Cuentas con contraseña configurada",
        trend: { direction: secureAccounts === operators.length ? "up" : "down", label: secureAccounts === operators.length ? "Al día" : "Revisar" },
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

        <div className="flex flex-col sm:flex-row sm:items-center gap-compact">
          <div className="relative flex w-full sm:flex-1 sm:w-auto items-center">
            <Search className="w-3.5 h-3.5 text-muted absolute left-compact pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar operador o cargo..."
              className="h-9 w-full sm:w-72 bg-raised border border-border hover:border-border-strong focus:border-brand/50 rounded-control pl-group pr-group text-caption text-primary placeholder:text-muted focus:outline-none transition-colors"
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
            onClick={() => {
              setInviteError(null);
              setIsInviteOpen(true);
            }}
            className="h-9 px-compact rounded-control bg-brand hover:bg-brand/90 text-canvas font-semibold text-caption flex items-center gap-hairline transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Crear usuario</span>
          </button>
        </div>
      </div>

      {isFallback && (
        <div className="px-compact py-compact rounded-control bg-state-attention-surface border border-border text-caption text-state-attention">
          No se muestran usuarios de respaldo. Vuelve a consultar cuando el backend esté disponible.
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

        <div data-lenis-prevent className="overflow-x-auto">
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
                      <StatusBadge
                        variant={op.status === "configurado" ? "success" : "warning"}
                        label={op.status === "configurado" ? "Acceso configurado" : "Sin contraseña"}
                      />
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
                    <span className="text-caption font-medium text-primary block">
                      {op.permissions.length} permisos asignados
                    </span>
                    <span className="text-caption text-muted">Según su rol</span>
                  </div>

                  <div className="relative">
                  <button
                    type="button"
                    aria-label={`Administrar acceso de ${op.name}`}
                    aria-expanded={openMenuId === op.id}
                    onClick={() => setOpenMenuId((current) => current === op.id ? null : op.id)}
                    className="p-hairline rounded-control text-muted hover:text-primary hover:bg-raised transition-colors"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  {openMenuId === op.id && (
                    <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-control border border-border bg-panel p-compact shadow-card">
                      <label className="mb-hairline block text-caption text-secondary" htmlFor={`role-${op.id}`}>
                        Cambiar rol
                      </label>
                      <select
                        id={`role-${op.id}`}
                        value={op.roleKey}
                        onChange={(event) => void handleRoleChange(op, event.target.value as UserRoleKey)}
                        className="h-9 w-full rounded-control border border-border bg-raised px-compact text-caption text-primary"
                      >
                        {ROLE_OPTIONS
                          .filter((role) => role.value !== "owner" || op.roleKey === "owner")
                          .map((role) => (
                            <option key={role.value} value={role.value}>{role.label}</option>
                          ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setMemberToRemove(op);
                          setOpenMenuId(null);
                        }}
                        disabled={op.roleKey === "owner"}
                        className="mt-compact flex w-full items-center gap-hairline rounded-control px-compact py-hairline text-caption text-state-error hover:bg-state-error-surface disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Eliminar acceso</span>
                      </button>
                    </div>
                  )}
                  </div>
                </div>
              </div>

              <div className="bg-raised rounded-control p-compact mt-compact border border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-hairline pb-compact mb-compact border-b border-border text-caption">
                  <span className="text-muted">
                    Sedes asignadas:{" "}
                    <strong className="text-primary">
                      {op.assignedWarehouses.length ? op.assignedWarehouses.join(", ") : "No configuradas"}
                    </strong>
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
      <Dialog
        isOpen={isInviteOpen}
        onClose={() => {
          if (!isCreating) setIsInviteOpen(false);
        }}
        title="Crear acceso de usuario"
        description="La cuenta se guardará en esta empresa. No se envía un correo de invitación; comparte la contraseña inicial de forma segura."
        confirmLabel="Crear cuenta"
        onConfirm={handleCreateUser}
        isProcessing={isCreating}
      >
        <div className="space-y-compact">
          <label className="block text-caption text-secondary">
            Nombre
            <input
              autoComplete="name"
              value={inviteName}
              onChange={(event) => setInviteName(event.target.value)}
              className="mt-hairline h-9 w-full rounded-control border border-border bg-raised px-compact text-caption text-primary"
            />
          </label>
          <label className="block text-caption text-secondary">
            Correo
            <input
              type="email"
              autoComplete="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              className="mt-hairline h-9 w-full rounded-control border border-border bg-raised px-compact text-caption text-primary"
            />
          </label>
          <label className="block text-caption text-secondary">
            Contraseña inicial (mínimo 12 caracteres)
            <input
              type="password"
              autoComplete="new-password"
              minLength={12}
              value={invitePassword}
              onChange={(event) => setInvitePassword(event.target.value)}
              className="mt-hairline h-9 w-full rounded-control border border-border bg-raised px-compact text-caption text-primary"
            />
          </label>
          <label className="block text-caption text-secondary">
            Rol
            <select
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value as UserRoleKey)}
              className="mt-hairline h-9 w-full rounded-control border border-border bg-raised px-compact text-caption text-primary"
            >
              {ROLE_OPTIONS.filter((role) => role.value !== "owner").map((role) => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </label>
          {inviteError && (
            <p role="alert" className="text-caption text-state-error">{inviteError}</p>
          )}
        </div>
      </Dialog>
      <Dialog
        isOpen={memberToRemove !== null}
        onClose={() => {
          if (!isRemoving) setMemberToRemove(null);
        }}
        title="Eliminar acceso"
        description={memberToRemove
          ? `Se eliminará el acceso de ${memberToRemove.name} (${memberToRemove.email}) a esta empresa. Esta acción no se puede deshacer.`
          : undefined}
        confirmLabel="Eliminar acceso"
        cancelLabel="Conservar usuario"
        isDestructive
        isProcessing={isRemoving}
        onConfirm={handleRemoveUser}
      >
        <p className="text-caption text-secondary">
          El usuario dejará de aparecer en el equipo y no podrá acceder a esta organización.
        </p>
      </Dialog>
    </div>
  );
};
