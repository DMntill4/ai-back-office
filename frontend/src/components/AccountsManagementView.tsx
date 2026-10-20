import { useState } from 'react';
import {
  Users,
  Shield,
  Plus,
  Sparkles,
  Search,
  Building2,
  Mail,
  History,
  Save,
  DollarSign,
  FileCheck2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { AccountRoleType } from './AccountProfileModal';

interface AccountsManagementViewProps {
  onOpenAccountModal?: (role?: AccountRoleType) => void;
  onOpenPrompt?: (prompt: string) => void;
}

interface AccountItem {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  role: AccountRoleType;
  title: string;
  companyName: string;
  email: string;
  phone: string;
  region: string;
  currency: string;
  status: 'active' | 'pending';
  lastActive: string;
  avatarGradient: string;
  // RBAC Matrix Fields
  autonomousPurchases: boolean;
  hitlRequired: boolean;
  sqlInventoryAccess: boolean;
  autonomousThreshold: number;
}

const INITIAL_ACCOUNTS: AccountItem[] = [
  {
    id: 'acc-1',
    firstName: 'Andrés',
    lastName: 'Montilla',
    name: 'Andrés Montilla',
    role: 'Empresa',
    title: 'Director de Operaciones & Abastecimiento',
    companyName: 'Acme Industrial Corp',
    email: 'operaciones@acme.com',
    phone: '+52 (55) 987-6543',
    region: 'México (MXN - $)',
    currency: 'MXN',
    status: 'active',
    lastActive: 'Hace 3 min',
    avatarGradient: 'from-[#064E3B] via-[#10B981] to-[#A7F3D0]',
    autonomousPurchases: true,
    hitlRequired: true,
    sqlInventoryAccess: true,
    autonomousThreshold: 10000,
  },
  {
    id: 'acc-2',
    firstName: 'Carlos',
    lastName: 'Herrera',
    name: 'Carlos Herrera',
    role: 'Admin',
    title: 'Administrador de Plataforma & Seguridad IAM',
    companyName: 'Mint Intelligence Platform',
    email: 'seguridad@mint-ai.io',
    phone: '+52 (81) 1234-5678',
    region: 'México (MXN - $)',
    currency: 'MXN',
    status: 'active',
    lastActive: 'En línea',
    avatarGradient: 'from-[#0E7490] via-[#06B6D4] to-[#E2E8F0]',
    autonomousPurchases: true,
    hitlRequired: true,
    sqlInventoryAccess: true,
    autonomousThreshold: 50000,
  },
  {
    id: 'acc-3',
    firstName: 'Alex',
    lastName: 'Johnson',
    name: 'Alex Johnson',
    role: 'Cliente',
    title: 'Gerente de Procura B2B & Cadena de Suministro',
    companyName: 'Tech Innovations Inc',
    email: 'alex.johnson@techinnovations.com',
    phone: '+1 (555) 987-6543',
    region: 'USA (USD - $)',
    currency: 'USD',
    status: 'active',
    lastActive: 'Ayer 18:40',
    avatarGradient: 'from-[#3F3F46] via-[#71717A] to-[#D4D4D8]',
    autonomousPurchases: false,
    hitlRequired: true,
    sqlInventoryAccess: false,
    autonomousThreshold: 0,
  },
];

export const AccountsManagementView = ({
  onOpenAccountModal,
  onOpenPrompt,
}: AccountsManagementViewProps) => {
  const [accounts, setAccounts] = useState<AccountItem[]>(INITIAL_ACCOUNTS);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'Todos' | AccountRoleType>('Todos');
  const [selectedAccountId, setSelectedAccountId] = useState<string>(INITIAL_ACCOUNTS[0].id);
  const [searchTerm, setSearchTerm] = useState('');

  // Local state for interactive editing of current account
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  const filteredAccounts = accounts.filter((a) => {
    const matchesFilter = selectedRoleFilter === 'Todos' || a.role === selectedRoleFilter;
    const matchesSearch =
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.role.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleUpdateCurrentAccount = (updates: Partial<AccountItem>) => {
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === selectedAccount.id ? { ...acc, ...updates } : acc))
    );
  };

  const handleSavePolicyChanges = () => {
    toast.success(`Gobernanza RBAC actualizada para ${selectedAccount.name}`, {
      description: `Umbral autónomo fijado en $${selectedAccount.autonomousThreshold.toLocaleString()} ${selectedAccount.currency}. Políticas replicadas en PostgreSQL.`,
    });
  };

  const handleAuditHistory = () => {
    const prompt = `Muestra la bitácora inmutable de accesos, aprobaciones HITL y modificaciones de políticas RBAC para la cuenta ${selectedAccount.name} (${selectedAccount.role} - ${selectedAccount.companyName}).`;
    onOpenPrompt?.(prompt);
  };

  const handleAiAutocomplete = () => {
    toast.info('IA ReAct analizando perfil corporativo...', {
      description: `Generando recomendaciones de permisos y umbrales basados en el histórico de compras de ${selectedAccount.companyName}.`,
    });
    setTimeout(() => {
      handleUpdateCurrentAccount({
        autonomousThreshold: selectedAccount.role === 'Empresa' ? 12500 : selectedAccount.role === 'Admin' ? 75000 : 5000,
        autonomousPurchases: true,
        hitlRequired: true,
      });
      toast.success('✨ Perfil completado con IA', {
        description: 'Umbral optimizado para abastecimiento preventivo sin riesgo de sobregiro.',
      });
    }, 600);
  };

  return (
    <div className="flex flex-col w-full max-w-[1400px] mx-auto gap-5 font-sans text-zinc-100 pb-20">
      
      {/* ─── 1. BARRA SUPERIOR DE RESUMEN IAM (COMPACTA, SIN CURVAS) ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-zinc-500 font-medium">Consola de Identidad &amp; Accesos</span>
            <span className="text-zinc-600">•</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.04] text-[11px] font-mono text-zinc-400 border border-white/[0.05]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse" />
              IAM Multi-Tenant Activo
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-headline">
            Administración de Cuentas &amp; Perfiles
          </h1>
        </div>

        {/* 3 Contadores Limpios en Línea + Filtro de Roles + Botón Primario */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          
          {/* 3 Contadores limpios en píldoras */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#101217] border border-white/[0.05] text-xs">
            <span className="flex items-center gap-1.5 text-zinc-300 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80]" />
              3 Cuentas Activas
            </span>
            <span className="text-zinc-700">•</span>
            <span className="text-zinc-400">
              3 Roles Homologados: Empresa, Admin, Cliente
            </span>
            <span className="text-zinc-700">•</span>
            <span className="text-emerald-400 font-mono text-[11px]">
              Política HITL: Activa &gt; $10,000 MXN
            </span>
          </div>

          {/* Filtro de Roles */}
          <div className="flex items-center p-1 rounded-xl bg-[#14161C] border border-white/[0.05]">
            {(['Todos', 'Empresa', 'Admin', 'Cliente'] as const).map((r) => {
              const active = selectedRoleFilter === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedRoleFilter(r)}
                  className={`px-3 py-1 text-xs rounded-lg transition-all cursor-pointer ${
                    active
                      ? 'bg-[#1E222B] text-white font-semibold shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {r}
                </button>
              );
            })}
          </div>

          {/* Botón Primario + Nueva Cuenta */}
          <button
            type="button"
            onClick={() => onOpenAccountModal?.('Empresa')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#4ADE80] hover:bg-[#34D399] text-xs font-semibold text-zinc-950 transition cursor-pointer active:scale-[0.98] shadow-sm shrink-0"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>+ Nueva Cuenta</span>
          </button>
        </div>
      </div>

      {/* ─── 2. CONSOLA DE IDENTIDAD Y PERMISOS (SPLIT 5 / 7) INSPIRADA EN BENTO FINPACK.COM ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* ══════════ COLUMNA IZQUIERDA (5 Columnas - "Directorio de Cuentas Registradas") ══════════ */}
        <div className="lg:col-span-5 rounded-2xl bg-[#101217] border border-white/[0.05] p-4 sm:p-5 flex flex-col justify-between shadow-sm">
          <div>
            {/* Cabecera del Directorio */}
            <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-white/[0.05]">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <h2 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
                  Directorio de Cuentas Registradas
                </h2>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/[0.04] text-zinc-400 border border-white/[0.05]">
                  {filteredAccounts.length}
                </span>
              </div>
              <span className="text-[10px] text-zinc-500">RBAC Homologado</span>
            </div>

            {/* Buscador Rápido de Cuentas */}
            <div className="relative mb-3.5">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, correo, empresa o rol..."
                className="w-full bg-[#14171F] border border-white/[0.05] focus:border-emerald-500/50 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 outline-none transition"
              />
            </div>

            {/* Lista Vertical de Tarjetas de Cuenta con scroll responsive */}
            <div className="space-y-2.5 max-h-72 sm:max-h-96 lg:max-h-[580px] overflow-y-auto custom-scrollbar pr-0.5">
              {filteredAccounts.map((acc) => {
                const isSelected = selectedAccountId === acc.id;
                
                // Badge color mapping
                const badgeClass =
                  acc.role === 'Empresa'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : acc.role === 'Admin'
                    ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700';

                return (
                  <div
                    key={acc.id}
                    onClick={() => setSelectedAccountId(acc.id)}
                    className={`p-3.5 rounded-xl transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-white/[0.04] border-white/[0.08] border-l-2 border-l-[#4ADE80] shadow-sm'
                        : 'bg-[#101217]/60 border-white/[0.04] hover:bg-[#14171F] hover:border-white/[0.08]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Avatar y Datos Primarios */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-full bg-gradient-to-tr ${acc.avatarGradient} shadow-inner flex items-center justify-center text-xs font-bold text-zinc-950 shrink-0`}
                        >
                          {acc.name.slice(0, 1)}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs font-semibold truncate ${isSelected ? 'text-white' : 'text-zinc-200'}`}>
                            {acc.name}
                          </p>
                          <p className="text-[11px] text-zinc-400 truncate flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3 text-zinc-500 shrink-0" />
                            <span>{acc.companyName}</span>
                          </p>
                        </div>
                      </div>

                      {/* Badge de Rol */}
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border shrink-0 ${badgeClass}`}>
                        {acc.role}
                      </span>
                    </div>

                    {/* Fila Inferior: Correo e Indicador de Estado */}
                    <div className="mt-2.5 pt-2 border-t border-white/[0.04] flex items-center justify-between text-xs">
                      <span className="text-zinc-500 text-[11px] truncate flex items-center gap-1">
                        <Mail className="w-3 h-3 text-zinc-600 shrink-0" />
                        {acc.email}
                      </span>
                      <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 shrink-0 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse" />
                        Activo
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pie de Directorio */}
          <div className="pt-3.5 mt-4 border-t border-white/[0.05] text-[11px] text-zinc-500 flex items-center justify-between">
            <span>Sincronizado con PostgreSQL • Motor Predictivo Activo</span>
            <span className="text-zinc-400 font-mono">v2.4 Security</span>
          </div>
        </div>

        {/* ══════════ COLUMNA DERECHA (7 Columnas - "Expediente de Cuenta & Gobernanza por Rol") ══════════ */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          
          {/* ─── BLOQUE 1: BENTO GRID DE IDENTIDAD (MITAD SUPERIOR) ─── */}
          <div className="rounded-2xl bg-[#101217] border border-white/[0.05] p-5 sm:p-6 shadow-sm">
            {/* Cabecera con avatar grande, nombre, cargo y botón autocompletar con IA */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.05]">
              <div className="flex items-center gap-4">
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${selectedAccount.avatarGradient} shadow-md flex items-center justify-center text-lg font-bold text-zinc-950 shrink-0`}
                >
                  {selectedAccount.name.slice(0, 1)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight font-headline">
                      {selectedAccount.name}
                    </h2>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                        selectedAccount.role === 'Empresa'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : selectedAccount.role === 'Admin'
                          ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
                          : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                      }`}
                    >
                      {selectedAccount.role}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5">
                    <span className="text-zinc-300 font-medium">{selectedAccount.title}</span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-zinc-500">{selectedAccount.lastActive}</span>
                  </p>
                </div>
              </div>

              {/* Botón ✨ Autocompletar con IA */}
              <button
                type="button"
                onClick={handleAiAutocomplete}
                className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-emerald-300 hover:text-emerald-200 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer border border-emerald-500/20 shadow-xs active:scale-[0.98] shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>✨ Autocompletar con IA</span>
              </button>
            </div>

            {/* Cuadrícula Bento de Identidad con divisores de 1px (divide-white/[0.06]) */}
            <div className="mt-5 rounded-xl border border-white/[0.06] bg-[#14171F]/40 overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.06] border-b border-white/[0.06]">
                <div className="p-3.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block mb-1">
                    Nombre
                  </span>
                  <span className="text-xs font-semibold text-white">
                    {selectedAccount.firstName}
                  </span>
                </div>
                <div className="p-3.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block mb-1">
                    Apellido
                  </span>
                  <span className="text-xs font-semibold text-white">
                    {selectedAccount.lastName}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.06] border-b border-white/[0.06]">
                <div className="p-3.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block mb-1">
                    Organización / Empresa
                  </span>
                  <span className="text-xs font-semibold text-white">
                    {selectedAccount.companyName}
                  </span>
                </div>
                <div className="p-3.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block mb-1">
                    Correo Corporativo
                  </span>
                  <span className="text-xs font-mono font-medium text-emerald-300">
                    {selectedAccount.email}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.06]">
                <div className="p-3.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block mb-1">
                    Teléfono
                  </span>
                  <span className="text-xs font-mono text-zinc-300">
                    {selectedAccount.phone}
                  </span>
                </div>
                <div className="p-3.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block mb-1">
                    Región / Moneda Base
                  </span>
                  <span className="text-xs font-medium text-zinc-200">
                    {selectedAccount.region}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ─── BLOQUE 2: MATRIZ DE PERMISOS Y LÍMITES DEL ROL (MITAD INFERIOR) ─── */}
          <div className="rounded-2xl bg-[#101217] border border-white/[0.05] p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-5">
            <div>
              {/* Encabezado de la Matriz RBAC */}
              <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.05]">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
                    Matriz de Permisos &amp; Gobernanza por Rol
                  </h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  Políticas Aplicadas
                </span>
              </div>

              {/* Toggles y Umbrales Reales */}
              <div className="divide-y divide-white/[0.05] mt-2">
                
                {/* Switch 1: Compras Autónomas sin intervención */}
                <div className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0 pr-2">
                    <span className="text-xs font-semibold text-white block">
                      Compras Autónomas sin intervención (&lt; ${selectedAccount.autonomousThreshold.toLocaleString()} {selectedAccount.currency})
                    </span>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Permite emitir órdenes automáticas de stock si el monto total no supera el umbral fijado.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateCurrentAccount({
                        autonomousPurchases: !selectedAccount.autonomousPurchases,
                      })
                    }
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                      selectedAccount.autonomousPurchases ? 'bg-[#4ADE80]' : 'bg-zinc-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-zinc-950 shadow-md ring-0 transition duration-200 ease-in-out my-0.5 ${
                        selectedAccount.autonomousPurchases ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* Switch 2: Aprobación Human-in-the-Loop (HITL) obligatoria en excesos */}
                <div className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0 pr-2">
                    <span className="text-xs font-semibold text-white block">
                      Aprobación Human-in-the-Loop (HITL) obligatoria en excesos
                    </span>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Requiere autorización explícita de un supervisor financiero para compras mayores al umbral o proveedores no verificados.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateCurrentAccount({
                        hitlRequired: !selectedAccount.hitlRequired,
                      })
                    }
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                      selectedAccount.hitlRequired ? 'bg-[#4ADE80]' : 'bg-zinc-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-zinc-950 shadow-md ring-0 transition duration-200 ease-in-out my-0.5 ${
                        selectedAccount.hitlRequired ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* Switch 3: Acceso a carga de esquemas SQL e inventario real */}
                <div className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0 pr-2">
                    <span className="text-xs font-semibold text-white block">
                      Acceso a carga de esquemas SQL e inventario real
                    </span>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Autoriza sincronización directa con PostgreSQL para importar catálogos de proveedores y balance de stock.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateCurrentAccount({
                        sqlInventoryAccess: !selectedAccount.sqlInventoryAccess,
                      })
                    }
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                      selectedAccount.sqlInventoryAccess ? 'bg-[#4ADE80]' : 'bg-zinc-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-zinc-950 shadow-md ring-0 transition duration-200 ease-in-out my-0.5 ${
                        selectedAccount.sqlInventoryAccess ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* Input Numérico de Umbral de Compra Autónoma */}
                <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      Umbral de Compra Autónoma ({selectedAccount.currency})
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      Órdenes menores a este importe se aprueban automáticamente.
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <DollarSign className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={selectedAccount.autonomousThreshold}
                        onChange={(e) =>
                          handleUpdateCurrentAccount({
                            autonomousThreshold: Math.max(0, parseInt(e.target.value) || 0),
                          })
                        }
                        className="w-36 bg-[#14171F] border border-white/[0.08] focus:border-emerald-500/50 rounded-xl pl-8 pr-3 py-1.5 text-xs font-mono font-semibold text-white outline-none transition text-right"
                      />
                    </div>
                    <span className="text-xs font-mono text-zinc-400">{selectedAccount.currency}</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Botones de Acción: Guardar Cambios + Auditar Historial de Accesos */}
            <div className="pt-4 border-t border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[11px] text-zinc-400 w-full sm:w-auto">
                <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Auditoría inmutable registrada bajo ISO/IEC 27001</span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleAuditHistory}
                  className="px-3.5 py-2 rounded-xl bg-[#1A1D24] hover:bg-[#232732] text-zinc-300 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer border border-white/[0.04]"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Auditar Historial de Accesos</span>
                </button>

                <button
                  type="button"
                  onClick={handleSavePolicyChanges}
                  className="px-4 py-2 rounded-xl bg-[#4ADE80] hover:bg-[#34D399] text-zinc-950 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm active:scale-[0.98]"
                >
                  <Save className="w-3.5 h-3.5 fill-zinc-950" />
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default AccountsManagementView;
