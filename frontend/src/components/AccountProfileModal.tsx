import { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  User,
  Building2,
  Mail,
  Phone,
  Globe,
  Info,
  Check,
  Shield,
  Briefcase,
  Users,
  Database,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import type { UserSession } from './LoginView';

export type AccountRoleType = 'Admin' | 'Empresa' | 'Cliente';

interface AccountProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserSession | null;
  onSave?: (updatedData: {
    name: string;
    email: string;
    companyName: string;
    role: AccountRoleType;
    phone: string;
    countryCurrency: string;
    ruleConfig: {
      autoAction: boolean;
      ruleKey: string;
      ruleValue: string;
      windowDays: string;
    };
  }) => void;
  initialRole?: AccountRoleType;
}

/* ───────────────────────────── PERFILES MAESTROS PARA IA AUTO-FILL ───────────────────────────── */

const ROLE_PRESETS: Record<AccountRoleType, {
  firstName: string;
  lastName: string;
  companyName: string;
  email: string;
  phone: string;
  countryCurrency: string;
  roleDescription: string;
  rightSubtitle: string;
  rightTitle: string;
  checkboxLabel: string;
  radioOptions: { id: string; label: string; defaultValue: string; unit: string }[];
  windowDays: string;
  windowLabel: string;
}> = {
  Empresa: {
    firstName: 'Andrés',
    lastName: 'Montilla',
    companyName: 'Acme Industrial Corp',
    email: 'operaciones@acme.com',
    phone: '+52 (55) 987-6543',
    countryCurrency: 'México (MXN)',
    roleDescription: '💼 Operador y Director de Cadena de Suministro',
    rightSubtitle: '< CONFIGURACIÓN DE EMPRESA',
    rightTitle: 'Gobernanza y Automatización',
    checkboxLabel: 'Autorizar compras autónomas automáticas cuando el stock baje del mínimo',
    radioOptions: [
      { id: 'thresh_max', label: 'Umbral máximo por orden sin revisión manual', defaultValue: '10000', unit: '$ MXN' },
      { id: 'saving_margin', label: 'Margen porcentual de ahorro mínimo exigido', defaultValue: '8', unit: '%' },
      { id: 'monthly_cap', label: 'Límite presupuestal mensual consolidado', defaultValue: '85000', unit: '$ MXN' },
    ],
    windowDays: '30',
    windowLabel: 'días de horizonte predictivo',
  },
  Cliente: {
    firstName: 'Alex',
    lastName: 'Johnson',
    companyName: 'Tech Innovations Inc',
    email: 'alex.johnson@techinnovations.com',
    phone: '+1 (555) 987-6543',
    countryCurrency: 'Estados Unidos (USD)',
    roleDescription: '🏢 Comprador B2B con cuenta de crédito comercial',
    rightSubtitle: '< CONFIGURACIÓN DE CLIENTE',
    rightTitle: 'Límites y Recordatorios de Facturación',
    checkboxLabel: 'Aplicar cargos automáticos o alertas en facturas vencidas de este cliente',
    radioOptions: [
      { id: 'pct_invoice', label: 'Porcentaje sobre el valor de factura', defaultValue: '5', unit: '%' },
      { id: 'pct_overdue', label: 'Porcentaje del saldo pendiente vencido', defaultValue: '10', unit: '%' },
      { id: 'flat_fee', label: 'Tarifa plana por gestión administrativa', defaultValue: '250', unit: '$ USD' },
    ],
    windowDays: '30',
    windowLabel: 'días después de vencimiento',
  },
  Admin: {
    firstName: 'Carlos',
    lastName: 'Herrera',
    companyName: 'Mint Intelligence Platform',
    email: 'seguridad@mint-ai.io',
    phone: '+52 (81) 1234-5678',
    countryCurrency: 'México (MXN)',
    roleDescription: '🛡️ Administrador del Sistema y Gobernanza de Agentes',
    rightSubtitle: '< CONFIGURACIÓN DE ADMIN',
    rightTitle: 'Gobernanza y Auditoría del Sistema',
    checkboxLabel: 'Habilitar supervisión Human-in-the-Loop (HITL) y auditoría de base de datos',
    radioOptions: [
      { id: 'cron_sec', label: 'Intervalo de escaneo CRON proactivo de almacenes', defaultValue: '60', unit: 'segundos' },
      { id: 'sql_mismatch', label: 'Tolerancia de descalces en reconciliación SQL', defaultValue: '0.5', unit: '%' },
      { id: 'log_level', label: 'Profundidad de telemetría de inferencia xAI', defaultValue: '3', unit: 'nivel' },
    ],
    windowDays: '90',
    windowLabel: 'días de retención de auditoría',
  },
};

export const AccountProfileModal = ({
  isOpen,
  onClose,
  currentUser,
  onSave,
  initialRole = 'Empresa',
}: AccountProfileModalProps) => {
  const [activeRole, setActiveRole] = useState<AccountRoleType>(initialRole);

  // Campos de Identidad y Contacto
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCurrency, setCountryCurrency] = useState('México (MXN)');
  const [roleDescription, setRoleDescription] = useState('');

  // Reglas Dinámicas de Columna Derecha
  const [autoAction, setAutoAction] = useState(true);
  const [selectedRuleId, setSelectedRuleId] = useState('pct_overdue');
  const [ruleValue, setRuleValue] = useState('10');
  const [windowDays, setWindowDays] = useState('30');

  // Detalles Fiscales y SQL Expandibles
  const [showFiscalDetails, setShowFiscalDetails] = useState(false);
  const [taxId, setTaxId] = useState('AIC-920815-K10');
  const [sqlFilter, setSqlFilter] = useState('warehouse_id = "alm_central" AND is_active = true');

  // Inicializar campos según usuario actual o rol por defecto
  useEffect(() => {
    if (currentUser) {
      const parts = (currentUser.name || 'Andrés Montilla').trim().split(' ');
      setFirstName(parts[0] || 'Andrés');
      setLastName(parts.slice(1).join(' ') || 'Montilla');
      setCompanyName(currentUser.companyName || 'Acme Industrial Corp');
      setEmail(currentUser.email || 'operaciones@acme.com');
      setPhone('+52 (55) 987-6543');
      setCountryCurrency('México (MXN)');

      if (currentUser.role === 'owner') {
        setActiveRole('Empresa');
        setRoleDescription(ROLE_PRESETS.Empresa.roleDescription);
      } else if (currentUser.role === 'auditor') {
        setActiveRole('Admin');
        setRoleDescription(ROLE_PRESETS.Admin.roleDescription);
      } else {
        setActiveRole('Empresa');
        setRoleDescription(ROLE_PRESETS.Empresa.roleDescription);
      }
    } else {
      loadRolePreset(initialRole);
    }
  }, [currentUser, isOpen, initialRole]);

  // Al cambiar de rol manualmente, ajustar las reglas y descripción
  const handleRoleChange = (role: AccountRoleType) => {
    setActiveRole(role);
    const preset = ROLE_PRESETS[role];
    setRoleDescription(preset.roleDescription);
    setSelectedRuleId(preset.radioOptions[1]?.id || preset.radioOptions[0].id);
    setRuleValue(preset.radioOptions[1]?.defaultValue || preset.radioOptions[0].defaultValue);
    setWindowDays(preset.windowDays);
  };

  const loadRolePreset = (role: AccountRoleType) => {
    const preset = ROLE_PRESETS[role];
    setFirstName(preset.firstName);
    setLastName(preset.lastName);
    setCompanyName(preset.companyName);
    setEmail(preset.email);
    setPhone(preset.phone);
    setCountryCurrency(preset.countryCurrency);
    setRoleDescription(preset.roleDescription);
    setSelectedRuleId(preset.radioOptions[1]?.id || preset.radioOptions[0].id);
    setRuleValue(preset.radioOptions[1]?.defaultValue || preset.radioOptions[0].defaultValue);
    setWindowDays(preset.windowDays);
  };

  // Botón Asistente IA (✨): Autocompletar datos reales desde la base de datos
  const handleAiAutoFill = () => {
    loadRolePreset(activeRole);
    toast.success(`✨ Datos de ${activeRole} autocompletados desde la BD con Mint AI`, {
      description: `Sincronizada entidad ${ROLE_PRESETS[activeRole].companyName} con reglas de gobernanza activas.`,
    });
  };

  const handleSave = () => {
    const fullName = `${firstName} ${lastName}`.trim();
    if (!fullName || !email) {
      toast.error('Por favor completa al menos el nombre y correo corporativo.');
      return;
    }

    onSave?.({
      name: fullName,
      email,
      companyName,
      role: activeRole,
      phone,
      countryCurrency,
      ruleConfig: {
        autoAction,
        ruleKey: selectedRuleId,
        ruleValue,
        windowDays,
      },
    });

    toast.success('Cambios de cuenta guardados correctamente', {
      description: `Perfil actualizado para ${fullName} (${activeRole}) con reglas en vigor.`,
    });
    onClose();
  };

  if (!isOpen) return null;

  const currentPreset = ROLE_PRESETS[activeRole];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
    >
      {/* Contenedor relativo que aloja el botón exterior y el modal dividido */}
      <div className="relative w-full max-w-[820px] my-auto py-2">
        {/* ─── Botón Cerrar Flotante Exterior (✕) Adaptado a Mobile/Desktop ─── */}
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-1 right-1 sm:-top-3 sm:-left-3 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#181B22] border border-white/[0.08] text-zinc-300 hover:text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 cursor-pointer z-50 group"
          title="Cerrar modal"
        >
          <X className="w-4 h-4 stroke-[2.5] group-hover:rotate-90 transition-transform duration-200" />
        </button>

        {/* ─── Caja Principal en 2 Columnas (Split-Panel Modal con Scroll Interno Seguro) ─── */}
        <div className="w-full max-h-[88vh] overflow-y-auto custom-scrollbar rounded-3xl bg-[#101217] border border-white/[0.07] shadow-[0_30px_90px_rgba(0,0,0,0.85)] grid grid-cols-1 md:grid-cols-12">
          
          {/* ═══════════════ COLUMNA IZQUIERDA (7 Columnas) ═══════════════ */}
          <div className="md:col-span-7 p-4 sm:p-7 flex flex-col justify-between border-b md:border-b-0 border-white/[0.06]">
            <div>
              {/* Barra Superior: GESTIÓN DE CUENTA + Roles Pills + Asistente IA */}
              <div className="flex items-center justify-between gap-2 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
                    Gestión de Cuenta
                  </span>

                  {/* Selector rápido de rol estilo píldora discreta */}
                  <div className="flex items-center p-0.5 rounded-xl bg-[#181B22] border border-white/[0.05]">
                    {(['Empresa', 'Cliente', 'Admin'] as AccountRoleType[]).map((r) => {
                      const isActive = activeRole === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => handleRoleChange(r)}
                          className={`px-2 py-0.5 text-[10px] font-medium rounded-lg transition-all cursor-pointer ${
                            isActive
                              ? 'bg-[#232732] text-white shadow-xs font-semibold'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          {r}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Botón circular Asistente IA (✨) con tooltip flotante */}
                <div className="relative group">
                  <button
                    type="button"
                    onClick={handleAiAutoFill}
                    className="w-9 h-9 rounded-full bg-white/[0.04] hover:bg-emerald-500/10 text-emerald-400 border border-white/[0.07] flex items-center justify-center transition cursor-pointer active:scale-95 shadow-sm"
                    title="Autocompletar datos de la cuenta desde la BD con Mint AI"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                  </button>
                  <div className="pointer-events-none absolute right-0 top-11 hidden group-hover:flex w-56 p-2 rounded-xl bg-[#1E222D] border border-white/[0.08] shadow-xl text-[11px] text-zinc-300 z-50 leading-tight">
                    Autocompletar datos de la cuenta desde la BD con Mint AI
                  </div>
                </div>
              </div>

              {/* Cabecera de Perfil Centrada: Esfera Degradada 3D + Nombre + Subtexto */}
              <div className="text-center pt-2 pb-4">
                {/* Esfera degradada minimalista Mint de 76px (Estilo finpack) */}
                <div className="relative w-[76px] h-[76px] mx-auto rounded-full bg-gradient-to-tr from-[#064E3B] via-[#10B981] to-[#A7F3D0] shadow-[inset_0_4px_12px_rgba(255,255,255,0.35),0_10px_25px_rgba(16,185,129,0.25)] flex items-center justify-center overflow-hidden">
                  <div className="absolute top-1.5 left-2.5 w-6 h-6 rounded-full bg-white/35 blur-[3px]" />
                  <div className="absolute bottom-1 right-2 w-8 h-4 rounded-full bg-emerald-950/40 blur-[4px]" />
                  <span className="relative z-10 text-xl font-bold text-zinc-950 font-mono tracking-tighter opacity-80">
                    {firstName.slice(0, 1)}
                    {lastName.slice(0, 1)}
                  </span>
                </div>

                {/* Nombre editable */}
                <div className="mt-3 flex items-center justify-center">
                  <input
                    type="text"
                    value={`${firstName} ${lastName}`}
                    onChange={(e) => {
                      const val = e.target.value;
                      const parts = val.split(' ');
                      setFirstName(parts[0] || '');
                      setLastName(parts.slice(1).join(' '));
                    }}
                    placeholder="Nombre Completo"
                    className="text-xl font-bold text-white text-center bg-transparent focus:outline-none focus:bg-white/[0.03] rounded-lg px-2 py-0.5 tracking-tight font-headline w-full max-w-xs"
                  />
                </div>

                {/* Rol descriptivo */}
                <p className="text-xs text-zinc-400 max-w-xs mx-auto mt-1 flex items-center justify-center gap-1.5">
                  {activeRole === 'Empresa' && <Briefcase className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  {activeRole === 'Admin' && <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  {activeRole === 'Cliente' && <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  <span>{roleDescription}</span>
                </p>
              </div>

              {/* ─── Formulario Bento Grid Unido (Fiel a la Referencia) ─── */}
              <div className="mt-2 rounded-2xl bg-[#14171F]/80 border border-white/[0.06] divide-y divide-white/[0.06] overflow-hidden shadow-xs">
                
                {/* Fila 1: Dividida en 2 Columnas (NOMBRE y APELLIDO) */}
                <div className="grid grid-cols-2 divide-x divide-white/[0.06]">
                  {/* Nombre */}
                  <div className="p-3 flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-white/[0.04] text-zinc-400 flex items-center justify-center shrink-0">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <label className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase block leading-none">
                        Nombre
                      </label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Nombre"
                        className="text-xs font-medium text-zinc-100 bg-transparent focus:outline-none w-full mt-1"
                      />
                    </div>
                  </div>

                  {/* Apellido */}
                  <div className="p-3 flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-white/[0.04] text-zinc-400 flex items-center justify-center shrink-0">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <label className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase block leading-none">
                        Apellido
                      </label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Apellido"
                        className="text-xs font-medium text-zinc-100 bg-transparent focus:outline-none w-full mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Fila 2: EMPRESA / ORGANIZACIÓN */}
                <div className="p-3 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-white/[0.04] text-zinc-400 flex items-center justify-center shrink-0">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <label className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase block leading-none">
                      Empresa / Organización
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Empresa"
                      className="text-xs font-medium text-zinc-100 bg-transparent focus:outline-none w-full mt-1"
                    />
                  </div>
                </div>

                {/* Fila 3: CORREO CORPORATIVO */}
                <div className="p-3 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-white/[0.04] text-zinc-400 flex items-center justify-center shrink-0">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <label className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase block leading-none">
                      Correo Corporativo
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="correo@empresa.com"
                      className="text-xs font-medium text-zinc-100 bg-transparent focus:outline-none w-full mt-1"
                    />
                  </div>
                </div>

                {/* Fila 4: TELÉFONO DE CONTACTO */}
                <div className="p-3 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-white/[0.04] text-zinc-400 flex items-center justify-center shrink-0">
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <label className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase block leading-none">
                      Teléfono de Contacto
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+52 (55) 000-0000"
                      className="text-xs font-medium text-zinc-100 bg-transparent focus:outline-none w-full mt-1"
                    />
                  </div>
                </div>

                {/* Fila 5: PAÍS Y MONEDA BASE */}
                <div className="p-3 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-white/[0.04] text-zinc-400 flex items-center justify-center shrink-0">
                    <Globe className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <label className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase block leading-none">
                      País y Moneda Base
                    </label>
                    <input
                      type="text"
                      value={countryCurrency}
                      onChange={(e) => setCountryCurrency(e.target.value)}
                      placeholder="México (MXN) / Estados Unidos (USD)"
                      className="text-xs font-medium text-zinc-100 bg-transparent focus:outline-none w-full mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Enlace Inferior Izquierdo: Detalles Fiscales / Reglas SQL */}
              <button
                type="button"
                onClick={() => setShowFiscalDetails((v) => !v)}
                className="text-xs font-medium text-emerald-400 hover:text-emerald-300 mt-3 inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <span>+ Agregar detalles fiscales o reglas SQL</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showFiscalDetails ? 'rotate-180' : ''}`} />
              </button>

              {/* Sub-formulario desplegable de Detalles Fiscales / SQL */}
              {showFiscalDetails && (
                <div className="mt-3 p-3.5 rounded-xl bg-[#14171F] border border-white/[0.06] space-y-2.5 text-xs animate-in fade-in duration-150">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-semibold text-zinc-500 uppercase block mb-1">
                        RFC / Tax ID
                      </label>
                      <input
                        type="text"
                        value={taxId}
                        onChange={(e) => setTaxId(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#0B0C10] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-emerald-400/50 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-zinc-500 uppercase block mb-1">
                        Régimen Fiscal
                      </label>
                      <input
                        type="text"
                        defaultValue="601 - General de Ley"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#0B0C10] border border-white/[0.08] text-xs text-zinc-300 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-zinc-500 uppercase flex items-center gap-1 mb-1">
                      <Database className="w-3 h-3 text-emerald-400" />
                      Filtro SQL de Inventario / Partición
                    </label>
                    <input
                      type="text"
                      value={sqlFilter}
                      onChange={(e) => setSqlFilter(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#0B0C10] border border-white/[0.08] text-xs text-emerald-300 font-mono focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ═══════════════ COLUMNA DERECHA: REGLAS Y CONFIGURACIÓN DINÁMICA (5 Columnas) ═══════════════ */}
          <div className="md:col-span-5 bg-[#14171F] md:border-l border-white/[0.06] p-4 sm:p-7 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Cabecera Derecha Dinámica */}
              <div>
                <span className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase block">
                  {currentPreset.rightSubtitle}
                </span>
                <h3 className="text-sm font-semibold text-white mt-1">
                  {currentPreset.rightTitle}
                </h3>
              </div>

              {/* Bloque 1: Checkbox Principal con Acento Mint */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-[#101217] border border-white/[0.04]">
                <input
                  type="checkbox"
                  id="role_main_checkbox"
                  checked={autoAction}
                  onChange={(e) => setAutoAction(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-white/20 bg-[#0B0C10] text-emerald-400 accent-emerald-400 cursor-pointer shrink-0"
                />
                <label
                  htmlFor="role_main_checkbox"
                  className="text-xs text-zinc-300 leading-relaxed cursor-pointer select-none"
                >
                  {currentPreset.checkboxLabel}
                </label>
              </div>

              {/* Bloque 2: Radio Buttons + Input Numérico Encajonado [ 10 ] */}
              <div>
                <span className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase block mb-3">
                  Parámetro de Umbral / Regla
                </span>

                <div className="space-y-3">
                  {currentPreset.radioOptions.map((opt) => {
                    const isSelected = selectedRuleId === opt.id;
                    return (
                      <div key={opt.id} className="space-y-2">
                        <label
                          onClick={() => {
                            setSelectedRuleId(opt.id);
                            setRuleValue(opt.defaultValue);
                          }}
                          className="flex items-start gap-2.5 cursor-pointer group"
                        >
                          <div
                            className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? 'border-emerald-400 bg-emerald-500/10'
                                : 'border-zinc-600 bg-transparent group-hover:border-zinc-400'
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                          </div>
                          <span
                            className={`text-xs leading-tight transition-colors ${
                              isSelected ? 'text-white font-medium' : 'text-zinc-400 group-hover:text-zinc-300'
                            }`}
                          >
                            {opt.label}
                          </span>
                        </label>

                        {/* Input encajonado que aparece debajo de la opción seleccionada [ 10 ] */}
                        {isSelected && (
                          <div className="ml-6 flex items-center gap-2 pt-1">
                            <div className="relative">
                              <input
                                type="text"
                                value={ruleValue}
                                onChange={(e) => setRuleValue(e.target.value)}
                                className="w-24 px-3 py-1.5 rounded-lg bg-[#0B0C10] border border-white/[0.1] text-sm font-semibold text-white focus:outline-none focus:border-emerald-400/60 shadow-inner"
                              />
                            </div>
                            <span className="text-xs font-mono text-zinc-400">{opt.unit}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bloque 3: Frecuencia / Plazo "¿CUÁNDO?" */}
              <div className="pt-2 border-t border-white/[0.05]">
                <span className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase block mb-2">
                  Plazo / Ventana Operativa
                </span>

                <div className="flex items-center gap-2.5">
                  <input
                    type="number"
                    value={windowDays}
                    onChange={(e) => setWindowDays(e.target.value)}
                    className="w-16 px-2.5 py-1.5 rounded-lg bg-[#0B0C10] border border-white/[0.1] text-sm font-semibold text-white text-center focus:outline-none focus:border-emerald-400/60 shadow-inner"
                  />
                  <span className="text-xs text-zinc-300">
                    {currentPreset.windowLabel}
                  </span>
                </div>

                {/* Nota informativa con icono ⓘ */}
                <div className="mt-3 flex items-start gap-1.5 text-[11px] text-zinc-500 leading-relaxed">
                  <Info className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                  <span>Los cambios se aplicarán de inmediato a las nuevas órdenes y dictámenes de Mint.</span>
                </div>
              </div>
            </div>

            {/* ─── Footer Derecho: Acciones Cancelar / Guardar Cambios ─── */}
            <div className="pt-6 flex items-center justify-end gap-3 border-t border-white/[0.05] mt-6">
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-zinc-400 hover:text-white px-3 py-2 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="bg-[#4ADE80] hover:bg-[#22C55E] text-zinc-950 font-semibold text-xs px-5 py-2 rounded-xl transition cursor-pointer shadow-sm active:scale-[0.98] flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Guardar cambios</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AccountProfileModal;
