import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  UserCheck,
  Shield,
  Key,
  Lock,
  Mail,
  CheckCircle2,
  XCircle,
  Plus,
  Search,
  Check,
  Copy,
  Building2,
  ShieldCheck,
  ShieldAlert,
  Bot,
  User,
  Sliders,
  X,
  KeyRound,
  AlertTriangle,
} from "lucide-react";
import { Button } from "../ui/Button";

interface UserOperator {
  id: string;
  name: string;
  email: string;
  role: string;
  roleType: "admin" | "supervisor" | "logistics" | "ai_agent";
  scope: string;
  maxApprovalLimitCop: number;
  assignedWarehouses: string[];
  publicKeyId: string;
  lastLogin: string;
  status: "activo" | "invitado";
  permissions: {
    code: string;
    label: string;
    enabled: boolean;
    description: string;
  }[];
}

const INITIAL_OPERATORS: UserOperator[] = [
  {
    id: "usr_01",
    name: "Fernando S.",
    email: "fernando.s@ferreteriasantander.com",
    role: "Administrador General",
    roleType: "admin",
    scope: "Acceso total · Firma de compras sin límite · Mutación de políticas",
    maxApprovalLimitCop: 999999999,
    assignedWarehouses: ["Bucaramanga Matriz", "CD Bogotá D.C.", "CD Medellín", "Girón Taller"],
    publicKeyId: "pk_mint_2026_ops_fernando_sha256",
    lastLogin: "Activo ahora",
    status: "activo",
    permissions: [
      { code: "HITL_SIGN_UNLIMITED", label: "Firma HITL Sin Límite", enabled: true, description: "Autorizar compras de cualquier monto con HMAC." },
      { code: "POLICIES_MUTATE", label: "Modificar Políticas de Guardrail", enabled: true, description: "Ajustar POL-01 hasta POL-06." },
      { code: "SUPPLIERS_CONTRACTS", label: "Adjudicación de Contratos Marco", enabled: true, description: "Firmar acuerdos marco con proveedores." },
      { code: "SYSTEM_EMERGENCY_HALT", label: "Parada de Emergencia del Agente", enabled: true, description: "Detener inferencias en caso de anomalía." },
    ],
  },
  {
    id: "usr_02",
    name: "Carlos Méndez",
    email: "carlos.m@ferreteriasantander.com",
    role: "Supervisor de Operaciones",
    roleType: "supervisor",
    scope: "Aprobaciones hasta $10.000.000 COP · Gestión de bodegas Santander",
    maxApprovalLimitCop: 10000000,
    assignedWarehouses: ["Bucaramanga Matriz", "Girón Taller"],
    publicKeyId: "pk_mint_2026_ops_carlos_sha256",
    lastLogin: "Hoy, 08:45 a. m.",
    status: "activo",
    permissions: [
      { code: "HITL_SIGN_LIMITED", label: "Firma HITL hasta $10M COP", enabled: true, description: "Autorizar compras operativas de reposición." },
      { code: "POLICIES_MUTATE", label: "Modificar Políticas de Guardrail", enabled: false, description: "Restringido al Administrador General." },
      { code: "SUPPLIERS_CONTRACTS", label: "Adjudicación de Contratos Marco", enabled: false, description: "Restringido al Administrador General." },
      { code: "SYSTEM_EMERGENCY_HALT", label: "Parada de Emergencia del Agente", enabled: true, description: "Detener inferencias en caso de anomalía." },
    ],
  },
  {
    id: "usr_03",
    name: "Juan Pablo R.",
    email: "juanpablo.r@ferreteriasantander.com",
    role: "Coordinador de Logística",
    roleType: "logistics",
    scope: "Despachos OSRM · Recepción física en muelle · Transferencias inter-sede",
    maxApprovalLimitCop: 2000000,
    assignedWarehouses: ["Bucaramanga Matriz", "CD Bogotá D.C."],
    publicKeyId: "pk_mint_2026_log_juanp_sha256",
    lastLogin: "Hoy, 09:12 a. m.",
    status: "activo",
    permissions: [
      { code: "HITL_SIGN_LIMITED", label: "Firma HITL hasta $10M COP", enabled: false, description: "Solo firma de despachos y recepciones." },
      { code: "LOGISTICS_DISPATCH_CONFIRM", label: "Confirmar Salida de Camiones OSRM", enabled: true, description: "Emitir hojas de ruta a conductores." },
      { code: "WAREHOUSE_CROSSDOCK", label: "Recepción de Transferencias", enabled: true, description: "Registrar ingreso físico de materiales." },
      { code: "POLICIES_MUTATE", label: "Modificar Políticas de Guardrail", enabled: false, description: "Restringido al Administrador General." },
    ],
  },
  {
    id: "usr_04",
    name: "Agente Mint (IA)",
    email: "agent@mint.internal",
    role: "Agente Autónomo de Back-Office",
    roleType: "ai_agent",
    scope: "Auditoría ROP · Enrutamiento · Cotización multicriterio · Propuestas",
    maxApprovalLimitCop: 5000000,
    assignedWarehouses: ["Bucaramanga Matriz", "CD Bogotá D.C.", "CD Medellín", "Girón Taller"],
    publicKeyId: "pk_mint_ai_autonomous_daemon_2026",
    lastLogin: "Operación continua (Daemon 24/7)",
    status: "activo",
    permissions: [
      { code: "AUTONOMOUS_PURCHASE_5M", label: "Compra Autónoma ≤ $5.000.000 COP", enabled: true, description: "Regla POL-01: Auto-ejecución determinista." },
      { code: "OSRM_OPTIMIZER_ROUTE", label: "Optimización Dinámica de Rutas", enabled: true, description: "Recalcular tramos Bogotá-Bucaramanga." },
      { code: "TELEMETRY_INGESTION", label: "Monitoreo Continuo PostgreSQL", enabled: true, description: "Lectura de stock en tiempo real." },
      { code: "POLICIES_MUTATE", label: "Modificar Políticas de Guardrail", enabled: false, description: "El agente NUNCA puede modificar sus propios guardrails." },
    ],
  },
];

export const RolesPermissionsView: React.FC = () => {
  const [operators, setOperators] = useState<UserOperator[]>(INITIAL_OPERATORS);
  const [selectedUserId, setSelectedUserId] = useState<string>("usr_01");
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modal Nuevo Operador
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState("Supervisor de Operaciones");
  const [formLimit, setFormLimit] = useState(5000000);

  const selectedUser = useMemo(
    () => operators.find((u) => u.id === selectedUserId) || operators[0],
    [operators, selectedUserId]
  );

  const filteredOperators = useMemo(() => {
    return operators.filter((u) => {
      const matchesType = filterType === "all" ? true : u.roleType === filterType;
      const matchesSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.role.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [operators, filterType, searchQuery]);

  const handleCopy = (key: string) => {
    navigator.clipboard?.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCreateOperator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail) return;

    const newOp: UserOperator = {
      id: `usr_${Date.now().toString().slice(-4)}`,
      name: formName,
      email: formEmail,
      role: formRole,
      roleType: "supervisor",
      scope: `Aprobaciones hasta $${formLimit.toLocaleString("es-CO")} COP`,
      maxApprovalLimitCop: formLimit,
      assignedWarehouses: ["Bucaramanga Matriz"],
      publicKeyId: `pk_mint_2026_${formName.toLowerCase().replace(/\s+/g, "_")}_sha256`,
      lastLogin: "Invitación pendiente",
      status: "invitado",
      permissions: [
        { code: "HITL_SIGN_LIMITED", label: `Firma HITL hasta $${formLimit.toLocaleString("es-CO")}`, enabled: true, description: "Autorizar compras dentro del límite." },
        { code: "POLICIES_MUTATE", label: "Modificar Políticas de Guardrail", enabled: false, description: "Restringido al Administrador General." },
      ],
    };

    setOperators([...operators, newOp]);
    setSelectedUserId(newOp.id);
    setIsInviteModalOpen(false);
    setFormName("");
    setFormEmail("");
  };

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-[#050806] text-[#F9FAFB] font-sans select-none overflow-hidden">
      {/* 1. Header Bar Flowcraft */}
      <div className="flex-none px-6 py-4 border-b border-white/[0.06] bg-[#0A0F0C]/80 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#8E9893] font-medium">Gobernanza</span>
            <span className="text-white/20">/</span>
            <span className="text-[#10B981] font-semibold flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5" />
              Control de Acceso Basado en Roles (RBAC)
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white mt-1 flex items-center gap-2.5">
            Roles y Permisos de Operadores
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#10B981]/10 text-[#34D399] border border-[#10B981]/25">
              4 OPERADORES HOMOLOGADOS
            </span>
          </h1>
          <p className="text-xs text-[#8E9893] mt-0.5">
            Asignación de privilegios basada en roles, control de firmas criptográficas HMAC y alcances presupuestales.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="text-xs font-bold">Invitar Nuevo Operador</span>
            <span className="text-[10px] bg-black/30 px-1.5 py-0.2 rounded font-mono text-white/80">[I]</span>
          </Button>
        </div>
      </div>

      {/* 2. Franja de KPIs de Permisos */}
      <div className="flex-none px-6 py-3 border-b border-white/[0.06] bg-[#070B08]/90 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center text-[#34D399]">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-[#8E9893] uppercase tracking-wider font-semibold block">
              Operadores Activos
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-extrabold font-mono text-white tabular-nums">4</span>
              <span className="text-[10px] text-[#34D399] font-mono">3 humanos · 1 IA</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-[#8E9893] uppercase tracking-wider font-semibold block">
              Firma Principal CCO
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-extrabold font-mono text-white tabular-nums">Fernando S.</span>
              <span className="text-[10px] text-purple-400 font-mono">Ilimitada</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-[#8E9893] uppercase tracking-wider font-semibold block">
              Bodegas en Custodia
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-extrabold font-mono text-white tabular-nums">4</span>
              <span className="text-[10px] text-[#8E9893] font-mono">Sedes activas</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center text-[#34D399]">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-[#8E9893] uppercase tracking-wider font-semibold block">
              Esquema de Autenticación
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-extrabold font-mono text-[#34D399] tabular-nums">100%</span>
              <span className="text-[10px] text-white/50 font-mono">Tokens HMAC-SHA256</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Contenedor Master-Detail (50% Directorio / 50% Inspector de Permisos & Llaves) */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* PANEL IZQUIERDO: 50% DIRECTORIO DE OPERADORES */}
        <div className="flex-1 lg:w-[50%] flex flex-col min-h-0 border-r border-white/[0.06] bg-[#050806]">
          {/* Barra de Filtro y Búsqueda */}
          <div className="flex-none p-3 border-b border-white/[0.06] bg-[#0A0F0C]/60 flex items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-[#8E9893] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, email o rol..."
                className="w-full bg-[#0E1511] border border-white/[0.08] hover:border-white/20 focus:border-[#10B981]/60 focus:bg-[#070B08] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-[#8E9893]/70 focus:outline-none transition-all font-mono"
              />
            </div>

            <div className="flex items-center gap-1 bg-[#0E1511] p-1 rounded-xl border border-white/[0.06]">
              <button
                onClick={() => setFilterType("all")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  filterType === "all"
                    ? "bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/30"
                    : "text-[#8E9893] hover:text-white"
                }`}
              >
                Todos ({operators.length})
              </button>
              <button
                onClick={() => setFilterType("admin")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  filterType === "admin"
                    ? "bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/30"
                    : "text-[#8E9893] hover:text-white"
                }`}
              >
                Admin
              </button>
              <button
                onClick={() => setFilterType("ai_agent")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all ${
                  filterType === "ai_agent"
                    ? "bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/30"
                    : "text-[#8E9893] hover:text-white"
                }`}
              >
                <Bot className="w-3 h-3 text-[#34D399]" />
                IA
              </button>
            </div>
          </div>

          {/* Lista de Operadores */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5">
            {filteredOperators.map((item) => {
              const isSelected = selectedUser?.id === item.id;
              const isAi = item.roleType === "ai_agent";

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedUserId(item.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#0A0F0C] border-[#10B981]/40 shadow-[0_0_20px_rgba(16,185,129,0.08)] ring-1 ring-[#10B981]/30"
                      : "bg-[#080D09] border-white/[0.05] hover:border-white/15 hover:bg-[#0A0F0C]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs flex-none ${
                          isAi
                            ? "bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/40"
                            : "bg-[#142018] text-white border border-white/10"
                        }`}
                      >
                        {isAi ? <Bot className="w-4 h-4" /> : item.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{item.name}</span>
                          {isAi && (
                            <span className="px-1.5 py-0.2 rounded font-mono text-[9px] font-bold bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30">
                              AUTÓNOMO 24/7
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#8E9893]">{item.email}</p>
                        <p className="text-[11px] text-white/80 font-medium mt-1">
                          {item.role}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1 flex-none">
                      <span className="font-mono text-[11px] font-bold text-[#34D399] tabular-nums">
                        {item.maxApprovalLimitCop > 500000000
                          ? "Sin Límite"
                          : `Tope: $${(item.maxApprovalLimitCop / 1000000).toFixed(0)}M COP`}
                      </span>
                      <span className="text-[10px] text-white/40 font-mono">
                        {item.lastLogin}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PANEL DERECHO: 50% INSPECTOR DE PRIVILEGIOS & LLAVE CRIPTOGRÁFICA */}
        <div className="flex-1 lg:w-[50%] flex flex-col min-h-0 bg-[#070B08] overflow-y-auto p-6 space-y-5">
          {selectedUser ? (
            <>
              {/* Header del Perfil de Operador */}
              <div className="flex-none p-5 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 pointer-events-none opacity-30 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.2),transparent_70%)]" />
                <div className="flex items-start justify-between gap-4 relative z-10">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#142018] border border-[#10B981]/30 text-[#34D399] flex items-center justify-center font-bold text-base flex-none">
                      {selectedUser.roleType === "ai_agent" ? (
                        <Bot className="w-6 h-6" />
                      ) : (
                        selectedUser.name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h2 className="text-base font-extrabold text-white">
                        {selectedUser.name}
                      </h2>
                      <p className="text-xs text-[#8E9893]">{selectedUser.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30">
                          {selectedUser.role}
                        </span>
                        <span className="text-[10px] text-white/40 font-mono">
                          {selectedUser.status === "activo" ? "● Activo en Ledger" : "○ Invitado"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-none">
                    <span className="text-[10px] text-[#8E9893] uppercase font-bold block">
                      Límite de Aprobación
                    </span>
                    <span className="font-mono text-base font-black text-[#34D399] block mt-0.5">
                      {selectedUser.maxApprovalLimitCop > 500000000
                        ? "ILIMITADO"
                        : `$${selectedUser.maxApprovalLimitCop.toLocaleString("es-CO")} COP`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bodegas Asignadas */}
              <div className="flex-none p-4 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] space-y-2.5">
                <span className="text-xs font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#34D399]" />
                  Bodegas y Sedes con Cobertura Operativa
                </span>
                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedUser.assignedWarehouses.map((wh) => (
                    <span
                      key={wh}
                      className="px-2.5 py-1 rounded-xl bg-[#0E1511] border border-white/[0.06] text-xs font-mono text-white/90"
                    >
                      {wh}
                    </span>
                  ))}
                </div>
              </div>

              {/* Matriz de Permisos Específicos */}
              <div className="flex-none p-4 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] space-y-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#34D399]" />
                  Matriz de Privilegios y Capacidades RBAC
                </span>

                <div className="space-y-2 pt-1">
                  {selectedUser.permissions.map((perm) => (
                    <div
                      key={perm.code}
                      className="p-3 rounded-xl bg-[#0E1511] border border-white/[0.04] flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-white">
                            {perm.label}
                          </span>
                          <span className="text-[9px] font-mono text-[#8E9893]">
                            ({perm.code})
                          </span>
                        </div>
                        <p className="text-[11px] text-[#8E9893] mt-0.5">
                          {perm.description}
                        </p>
                      </div>

                      {perm.enabled ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30 flex items-center gap-1 flex-none">
                          <Check className="w-2.5 h-2.5" />
                          HABILITADO
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/[0.05] text-white/40 border border-white/10 flex items-center gap-1 flex-none">
                          <Lock className="w-2.5 h-2.5" />
                          BLOQUEADO
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Llave Pública & HMAC */}
              <div className="flex-none p-4 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-[#34D399]" />
                    Clave Pública de Firma Digital
                  </span>
                  <span className="text-[10px] font-mono text-[#34D399] bg-[#10B981]/10 px-2 py-0.5 rounded border border-[#10B981]/25">
                    HMAC-SHA256
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#0E1511] border border-white/[0.04] flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-white truncate">
                    {selectedUser.publicKeyId}
                  </span>
                  <button
                    onClick={() => handleCopy(selectedUser.publicKeyId)}
                    className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/50 hover:text-white transition-colors flex-none"
                    title="Copiar Clave"
                  >
                    {copiedKey === selectedUser.publicKeyId ? (
                      <Check className="w-3.5 h-3.5 text-[#10B981]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-xs text-[#8E9893] border border-dashed border-white/10 rounded-2xl">
              Selecciona un operador del directorio.
            </div>
          )}
        </div>
      </div>

      {/* MODAL: INVITAR NUEVO OPERADOR */}
      <AnimatePresence>
        {isInviteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md rounded-2xl bg-[#0A0F0C] border border-[#10B981]/30 p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="absolute top-4 right-4 text-[#8E9893] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[#10B981]/15 text-[#34D399] flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Invitar Operador al Sistema
                  </h3>
                  <p className="text-xs text-[#8E9893]">
                    Genera una credencial criptográfica y define límites de aprobación.
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateOperator} className="space-y-4">
                <div>
                  <label className="text-[11px] text-[#8E9893] font-semibold block mb-1">
                    NOMBRE COMPLETO
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Mariana Gómez"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-[#0E1511] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10B981]"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-[#8E9893] font-semibold block mb-1">
                    CORREO ELECTRÓNICO CORPORATIVO
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="mariana.g@ferreteriasantander.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full bg-[#0E1511] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10B981]"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-[#8E9893] font-semibold block mb-1">
                    ROL EN EL SISTEMA
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full bg-[#0E1511] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10B981]"
                  >
                    <option value="Supervisor de Operaciones">Supervisor de Operaciones</option>
                    <option value="Coordinador de Logística">Coordinador de Logística</option>
                    <option value="Auditor de Control Interno">Auditor de Control Interno</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-[#8E9893] font-semibold block mb-1">
                    LÍMITE MÁXIMO DE AUTORIZACIÓN (COP)
                  </label>
                  <input
                    type="number"
                    value={formLimit}
                    onChange={(e) => setFormLimit(Number(e.target.value))}
                    className="w-full bg-[#0E1511] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-[#34D399] focus:outline-none focus:border-[#10B981]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.08]">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => setIsInviteModalOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" variant="primary" size="md">
                    Enviar Invitación y Generar Token
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
