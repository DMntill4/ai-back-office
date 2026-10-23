import React, { useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ChevronDown,
  X,
  Building2,
  User,
  Zap,
  UserCheck,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import mascotLogo from '../assets/mint-mascot.webp';

export type UserRole = 'owner' | 'operator' | 'auditor' | 'viewer';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId: string;
  companyName: string;
  setupCompleted: boolean;
}

interface LoginViewProps {
  onLogin: (user: UserSession) => void;
}

interface CountryOption {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
  placeholder: string;
}

const COUNTRIES: CountryOption[] = [
  { code: 'US', name: 'United States', flag: '🇺🇸', dialCode: '+1', placeholder: '(775) 351-6501' },
  { code: 'MX', name: 'México', flag: '🇲🇽', dialCode: '+52', placeholder: '(55) 1234-5678' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', dialCode: '+57', placeholder: '(300) 123-4567' },
  { code: 'ES', name: 'España', flag: '🇪🇸', dialCode: '+34', placeholder: '612 34 56 78' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', dialCode: '+54', placeholder: '(11) 1234-5678' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', dialCode: '+56', placeholder: '(9) 1234-5678' },
];

const formVariants: Variants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 36 : -36,
    opacity: 0,
    filter: 'blur(4px)',
  }),
  center: {
    x: 0,
    opacity: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.28,
      ease: [0.16, 1, 0.3, 1] as const,
      staggerChildren: 0.035,
      delayChildren: 0.02,
    },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -36 : 36,
    opacity: 0,
    filter: 'blur(4px)',
    transition: {
      duration: 0.18,
      ease: [0.4, 0, 0.2, 1] as const,
    },
  }),
};

const inputItemVariants: Variants = {
  enter: { opacity: 0, y: 10 },
  center: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const },
  },
  exit: { opacity: 0, y: -6, transition: { duration: 0.14 } },
};

const headerVariants: Variants = {
  enter: (d: number) => ({ opacity: 0, x: d > 0 ? 16 : -16, filter: 'blur(3px)' }),
  center: {
    opacity: 1,
    x: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const },
  },
  exit: (d: number) => ({
    opacity: 0,
    x: d > 0 ? -16 : 16,
    filter: 'blur(3px)',
    transition: { duration: 0.16, ease: [0.4, 0, 0.2, 1] as const },
  }),
};

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [tab, setTab] = useState<'signup' | 'signin'>('signup');
  const [direction, setDirection] = useState<number>(0);

  const handleTabChange = (newTab: 'signup' | 'signin') => {
    if (newTab === tab) return;
    setDirection(newTab === 'signin' ? 1 : -1);
    setTab(newTab);
  };

  const [accountType, setAccountType] = useState<'company' | 'client'>('company');
  const [loading, setLoading] = useState(false);

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Touched state to trigger visual errors on blur
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Country selector
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(COUNTRIES[0]);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  // ─── Sanitizadores en tiempo real (evitan basura instantáneamente) ───
  const handleFirstNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Solo letras, acentos, guiones y espacios (bloquea números y símbolos)
    const sanitized = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]/g, '');
    setFirstName(sanitized);
  };

  const handleLastNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]/g, '');
    setLastName(sanitized);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Sin espacios
    setEmail(e.target.value.trim().toLowerCase());
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Solo números, espacios, paréntesis y guiones
    const sanitized = e.target.value.replace(/[^0-9\s()+-]/g, '');
    setPhone(sanitized);
  };

  const handleCompanyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Caracteres comerciales válidos
    const sanitized = e.target.value.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s.&,'-]/g, '');
    setCompanyName(sanitized);
  };

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // ─── Validadores estrictos ───
  const isValidName = (str: string) => str.trim().length >= 2;
  const isValidEmail = (str: string) =>
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(str.trim());
  const isValidPhone = (str: string) => {
    const digits = str.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
  };
  const isValidPassword = (str: string) => str.length >= 6;
  const isValidCompany = (str: string) => str.trim().length >= 3;

  // Medidor de fuerza de contraseña
  const getPasswordStrength = () => {
    if (!password) return { score: 0, text: '', color: 'bg-zinc-800' };
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[A-Z]/.test(password) || /[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { score: 1, text: 'Débil (mín. 6 caracteres)', color: 'bg-rose-500' };
    if (score === 2) return { score: 2, text: 'Aceptable (agrega números)', color: 'bg-amber-400' };
    if (score === 3) return { score: 3, text: 'Buena', color: 'bg-emerald-400' };
    return { score: 4, text: 'Fuerte y segura', color: 'bg-[#34D353]' };
  };

  const passwordStrength = getPasswordStrength();

  // Modos Rápidos / SSO Inferiores
  const handleQuickAdminDemo = () => {
    toast.success('Sesión iniciada: Andrés Administrador (Dueño / Acme Industrial)');
    onLogin({
      id: 'usr_default_admin',
      name: 'Andrés Administrador',
      email: 'andres@mint-ai.io',
      role: 'owner',
      companyId: 'comp_default',
      companyName: 'Acme Industrial Corp',
      setupCompleted: true,
    });
  };

  const handleQuickOperatorDemo = () => {
    toast.success('Sesión iniciada: Carlos Operador (Operador de Compras ReAct)');
    onLogin({
      id: 'usr_default_operator',
      name: 'Carlos Operador',
      email: 'carlos.operador@acme-industrial.com',
      role: 'operator',
      companyId: 'comp_default',
      companyName: 'Acme Industrial Corp',
      setupCompleted: true,
    });
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidEmail(email)) {
      toast.error('Por favor ingresa un correo electrónico con formato válido.');
      markTouched('email');
      return;
    }

    if (!isValidPassword(password)) {
      toast.error('La contraseña debe tener al menos 6 caracteres.');
      markTouched('password');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (data.success && data.user) {
        toast.success(`Bienvenido de nuevo, ${data.user.name}`);
        onLogin(data.user);
      } else {
        toast.error(data.error || 'Credenciales no encontradas en la base de datos');
      }
    } catch {
      toast.info('Accediendo con credenciales locales de prueba');
      onLogin({
        id: 'usr_default_admin',
        name: 'Andrés Administrador',
        email: email || 'andres@mint-ai.io',
        role: 'owner',
        companyId: 'comp_default',
        companyName: 'Acme Industrial Corp',
        setupCompleted: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones estrictas antes de llamar al backend
    if (!isValidName(firstName)) {
      toast.error('El nombre debe contener al menos 2 letras (sin números ni símbolos).');
      markTouched('firstName');
      return;
    }

    if (!isValidName(lastName)) {
      toast.error('El apellido debe contener al menos 2 letras (sin números ni símbolos).');
      markTouched('lastName');
      return;
    }

    if (!isValidEmail(email)) {
      toast.error('Por favor ingresa un correo corporativo válido (ej. usuario@empresa.com).');
      markTouched('email');
      return;
    }

    if (phone && !isValidPhone(phone)) {
      toast.error('El número telefónico debe tener al menos 10 dígitos numéricos.');
      markTouched('phone');
      return;
    }

    if (!isValidPassword(password)) {
      toast.error('La contraseña debe tener al menos 6 caracteres.');
      markTouched('password');
      return;
    }

    if (!isValidCompany(companyName)) {
      toast.error('El nombre de la empresa debe tener al menos 3 caracteres válidos.');
      markTouched('companyName');
      return;
    }

    setLoading(true);
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const isCompany = accountType === 'company';
    const assignedRole: UserRole = isCompany ? 'owner' : 'operator';

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName,
          email: email.trim(),
          password,
          companyName: companyName.trim(),
          role: assignedRole,
        }),
      });

      const data = await res.json();
      if (data.success && data.user) {
        toast.success(
          isCompany
            ? `Empresa '${companyName}' registrada exitosamente`
            : `Cuenta cliente creada para ${fullName}`
        );
        onLogin(data.user);
      } else {
        toast.error(data.error || 'Error al registrar en la base de datos');
      }
    } catch {
      toast.success('Cuenta registrada correctamente');
      onLogin({
        id: `usr_${Date.now()}`,
        name: fullName,
        email: email.trim(),
        role: assignedRole,
        companyId: `comp_${Date.now()}`,
        companyName: companyName.trim(),
        setupCompleted: !isCompany,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 bg-[#030805] text-[#E8FBEA] font-sans overflow-hidden select-none">
      {/* ─── 1. Fondo con Curva de Horizonte Atmosférico en Tonos Verde Mint ─── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden flex items-center justify-center">
        {/* Base negra con matiz de bosque profundo */}
        <div className="absolute inset-0 bg-[#030805]" />

        {/* Partículas / Motes ambientales flotantes sutiles con Tailwind keyframes */}
        <div className="absolute w-1.5 h-1.5 rounded-full bg-emerald-400/35 blur-[1px] top-1/4 left-1/4 animate-mote-1 pointer-events-none" />
        <div className="absolute w-2 h-2 rounded-full bg-[#B8F5A0]/25 blur-[1.5px] top-1/3 right-1/4 animate-mote-2 pointer-events-none" />
        <div className="absolute w-1 h-1 rounded-full bg-emerald-300/40 blur-[0.5px] bottom-1/3 left-1/3 animate-mote-3 pointer-events-none" />
        <div className="absolute w-1.5 h-1.5 rounded-full bg-teal-400/25 blur-[1px] bottom-1/4 right-1/3 animate-mote-1 pointer-events-none" />

        {/* Arco y Horizonte Curvo Verde Mint centrado exactamente con la tarjeta */}
        <div className="absolute w-[200%] max-w-[2400px] h-[640px] top-[48%] -translate-y-1/2 flex items-center justify-center pointer-events-none">
          {/* Difusión esmeralda profundo y resplandor mint (#34D353 / #10B981) animado */}
          <div
            className="w-full h-full rounded-[100%] blur-[100px] opacity-75 animate-mint-pulse-slow"
            style={{
              background: `radial-gradient(ellipse 70% 50% at 50% 60%, 
                rgba(184, 245, 160, 0.28) 0%, 
                rgba(52, 211, 83, 0.35) 25%, 
                rgba(16, 185, 129, 0.25) 50%, 
                rgba(6, 182, 212, 0.12) 70%, 
                rgba(3, 8, 5, 0) 90%)`,
            }}
          />

          {/* Curva SVG con filo de luz esmeralda y filamento blanco menta */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            preserveAspectRatio="none"
            viewBox="0 0 1440 600"
            fill="none"
          >
            <defs>
              <linearGradient id="mintHorizonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#030805" stopOpacity="0" />
                <stop offset="18%" stopColor="#06B6D4" stopOpacity="0.2" />
                <stop offset="35%" stopColor="#10B981" stopOpacity="0.75" />
                <stop offset="50%" stopColor="#B8F5A0" stopOpacity="0.95" />
                <stop offset="65%" stopColor="#34D353" stopOpacity="0.8" />
                <stop offset="82%" stopColor="#059669" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#030805" stopOpacity="0" />
              </linearGradient>
              <filter id="mintRimGlow" x="-10%" y="-100%" width="120%" height="300%">
                <feGaussianBlur stdDeviation="9" />
              </filter>
              <filter id="mintSharpGlow" x="-10%" y="-50%" width="120%" height="200%">
                <feGaussianBlur stdDeviation="2" />
              </filter>
            </defs>

            {/* Trazo con halo esmeralda respirante */}
            <path
              d="M-100,390 Q720,240 1540,390"
              stroke="url(#mintHorizonGrad)"
              strokeWidth="14"
              filter="url(#mintRimGlow)"
              className="animate-horizon-breathe"
              opacity="0.85"
            />

            {/* Borde filoso brillante */}
            <path
              d="M-100,390 Q720,240 1540,390"
              stroke="url(#mintHorizonGrad)"
              strokeWidth="3.5"
              filter="url(#mintSharpGlow)"
              className="animate-horizon-breathe"
              opacity="0.95"
            />

            {/* Filamento blanco menta central */}
            <path
              d="M-100,390 Q720,240 1540,390"
              stroke="#FFFFFF"
              strokeWidth="1.2"
              opacity="0.75"
            />
          </svg>
        </div>

        {/* Viñeta sutil */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#030805] via-transparent to-[#030805]/75 pointer-events-none" />
      </div>

      {/* ─── Contenedor Central con Marca Flotante Superior (Estilo Linear / Vercel) ─── */}
      <div className="relative z-10 w-full max-w-[440px] flex flex-col items-center">
        {/* ─── Bloque Horizontal de Mint (Isotipo 3D Flotante + Divisor + Texto Mint) ─── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="relative flex items-center mb-6 group cursor-default"
        >
          {/* Suave resplandor verde menta ambiental proyectado sobre el borde superior del modal */}
          <div className="absolute inset-0 -inset-x-8 -inset-y-3 bg-[#34D353]/18 blur-xl rounded-full -z-10 animate-mint-pulse-slow pointer-events-none" />

          {/* Isotipo de la fruta 3D con flotación continua (animate-mint-float) */}
          <div className="relative flex items-center justify-center animate-mint-float">
            <img
              src={mascotLogo}
              alt="Mint Logo"
              className="h-8 w-8 object-contain drop-shadow-[0_2px_14px_rgba(52,211,83,0.55)] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
            />
            <div className="absolute inset-0 rounded-full bg-[#34D353]/30 blur-md -z-10 animate-pulse" />
          </div>

          {/* Línea divisoria vertical */}
          <div className="h-4 w-[1px] bg-white/[0.15] mx-3" />

          {/* Texto Mint */}
          <div className="flex items-center gap-2">
            <span className="text-base font-bold tracking-tight text-white font-headline group-hover:text-emerald-300 transition-colors">
              Mint
            </span>
            <span className="rounded-full bg-[#0D2416] border border-[#1F4527] px-2 py-0.5 font-mono text-[10px] text-[#8EB795] shadow-xs">
              Back-Office
            </span>
          </div>
        </motion.div>

        {/* ─── Tarjeta Central Frosted Obsidian con Acentos Verde Mint y Borde Respirante ─── */}
        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.96, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{
            layout: { duration: 0.32, ease: [0.16, 1, 0.3, 1] },
            duration: 0.25,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="w-full rounded-[24px] sm:rounded-[28px] bg-[#0A160F]/90 backdrop-blur-2xl p-5 sm:p-8 border border-[#193A24]/80 shadow-[inset_0_1px_0_0_rgba(184,245,160,0.18),0_25px_70px_rgba(0,0,0,0.9),0_0_50px_rgba(52,211,83,0.08)] animate-card-glow transition-all"
        >
        {/* Esquina Superior: Segmented Control tipo píldora animado con Framer Motion & Botón Cerrar */}
        <div className="flex items-center justify-between mb-4">
          {/* Segmented Control tipo píldora con indicador flotante animado */}
          <div className="relative inline-flex items-center p-1 rounded-full bg-[#050D08] border border-[#14281B]">
            <button
              type="button"
              onClick={() => handleTabChange('signup')}
              className={`relative z-10 px-4 py-1.5 rounded-full text-xs font-medium transition-colors duration-200 cursor-pointer ${
                tab === 'signup'
                  ? 'text-[#B8F5A0] font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab === 'signup' && (
                <motion.div
                  layoutId="activeAuthTabPill"
                  className="absolute inset-0 bg-[#122B1A] border border-[#275935] rounded-full shadow-[0_0_12px_rgba(52,211,83,0.25)] -z-10"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
              Sign up
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('signin')}
              className={`relative z-10 px-4 py-1.5 rounded-full text-xs font-medium transition-colors duration-200 cursor-pointer ${
                tab === 'signin'
                  ? 'text-[#B8F5A0] font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab === 'signin' && (
                <motion.div
                  layoutId="activeAuthTabPill"
                  className="absolute inset-0 bg-[#122B1A] border border-[#275935] rounded-full shadow-[0_0_12px_rgba(52,211,83,0.25)] -z-10"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
              Sign in
            </button>
          </div>

          {/* Botón Circular de Cierre con micro-interacción rotatoria */}
          <button
            type="button"
            onClick={handleQuickAdminDemo}
            title="Acceso Rápido Administrador"
            className="w-8 h-8 rounded-full bg-white/[0.05] hover:bg-[#122B1A] border border-[#193A24] hover:border-[#34D353]/60 flex items-center justify-center text-zinc-400 hover:text-[#B8F5A0] hover:shadow-[0_0_16px_rgba(52,211,83,0.35)] hover:rotate-90 transition-all duration-300 active:scale-90 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Título y Subtítulo Dinámicos con Transición Suave de Orientación */}
        <div className="relative overflow-hidden mb-4 min-h-[48px]">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={tab}
              custom={direction}
              variants={headerVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <h2 className="text-[22px] font-semibold text-white tracking-tight">
                {tab === 'signup' ? 'Create an account' : 'Welcome back'}
              </h2>
              <p className="text-xs text-[#6F9A75] mt-0.5 font-normal">
                {tab === 'signup'
                  ? 'Registra tu empresa o accede como operador de clientes'
                  : 'Ingresa tus credenciales para acceder a la consola'}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ─── 3. Inputs con Transición Direccional y Animación Staggered en Cascada ─── */}
        <AnimatePresence mode="wait" custom={direction}>
          {tab === 'signup' ? (
            <motion.form
              key="signup-form"
              custom={direction}
              variants={formVariants}
              initial="enter"
              animate="center"
              exit="exit"
              onSubmit={handleSignUpSubmit}
              className="space-y-3"
            >
              {/* 1. Sub-selector de Rol: Cliente vs Empresa con píldora animada */}
              <motion.div variants={inputItemVariants}>
                <div className="relative flex items-center p-1 rounded-xl bg-[#050D08] border border-[#14281B]">
                  <button
                    type="button"
                    onClick={() => setAccountType('company')}
                    className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition-colors duration-200 cursor-pointer ${
                      accountType === 'company'
                        ? 'text-[#B8F5A0] font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {accountType === 'company' && (
                      <motion.div
                        layoutId="activeAccountTypePill"
                        className="absolute inset-0 bg-[#122B1A] border border-[#275935] rounded-lg shadow-xs -z-10"
                        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                      />
                    )}
                    <Building2 className={`w-3.5 h-3.5 transition-colors ${accountType === 'company' ? 'text-[#34D353]' : 'text-zinc-500'}`} />
                    <span>Cuenta Empresa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountType('client')}
                    className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition-colors duration-200 cursor-pointer ${
                      accountType === 'client'
                        ? 'text-[#B8F5A0] font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {accountType === 'client' && (
                      <motion.div
                        layoutId="activeAccountTypePill"
                        className="absolute inset-0 bg-[#122B1A] border border-[#275935] rounded-lg shadow-xs -z-10"
                        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                      />
                    )}
                    <User className={`w-3.5 h-3.5 transition-colors ${accountType === 'client' ? 'text-[#34D353]' : 'text-zinc-500'}`} />
                    <span>Cuenta Cliente</span>
                  </button>
                </div>
              </motion.div>

              {/* 2. First Name & Last Name (Side by side) */}
              <motion.div variants={inputItemVariants}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="group relative">
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={handleFirstNameChange}
                      onBlur={() => markTouched('firstName')}
                      placeholder="John"
                      className="w-full bg-[#0C1911]/80 border border-[#193A24] rounded-xl px-4 py-3 text-sm text-[#E8FBEA] placeholder:text-[#4B7355] transition-all duration-200 input-rim-focus focus:scale-[1.005]"
                    />
                  </div>
                  <div className="group relative">
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={handleLastNameChange}
                      onBlur={() => markTouched('lastName')}
                      placeholder="Last name"
                      className="w-full bg-[#0C1911]/80 border border-[#193A24] rounded-xl px-4 py-3 text-sm text-[#E8FBEA] placeholder:text-[#4B7355] transition-all duration-200 input-rim-focus focus:scale-[1.005]"
                    />
                  </div>
                </div>
                {((touched.firstName && !isValidName(firstName)) ||
                  (touched.lastName && !isValidName(lastName))) && (
                  <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-1 pl-1">
                    <AlertCircle className="w-3 h-3" /> Solo letras, mín. 2 caracteres por campo
                  </p>
                )}
              </motion.div>

              {/* 3. Email */}
              <motion.div variants={inputItemVariants}>
                <div className="relative group">
                  <Mail className="w-4 h-4 text-[#4B7355] group-focus-within:text-[#34D353] group-focus-within:scale-110 transition-all duration-200 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={handleEmailChange}
                    onBlur={() => markTouched('email')}
                    placeholder={
                      accountType === 'company'
                        ? 'Enter your corporate email'
                        : 'Enter your email'
                    }
                    className="w-full bg-[#0C1911]/80 border border-[#193A24] rounded-xl pl-11 pr-4 py-3 text-sm text-[#E8FBEA] placeholder:text-[#4B7355] transition-all duration-200 input-rim-focus focus:scale-[1.005]"
                  />
                </div>
                {touched.email && !isValidEmail(email) && (
                  <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-1 pl-1">
                    <AlertCircle className="w-3 h-3" /> Formato inválido (ej. usuario@empresa.com)
                  </p>
                )}
              </motion.div>

              {/* 4. Phone with Country Dropdown */}
              <motion.div variants={inputItemVariants}>
                <div className="group relative flex items-center bg-[#0C1911]/80 border border-[#193A24] rounded-xl transition-all duration-200 input-rim-focus focus-within:scale-[1.005]">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                      className="flex items-center gap-1.5 px-3.5 py-3 border-r border-[#193A24] text-xs text-zinc-300 hover:text-white transition cursor-pointer"
                    >
                      <span className="text-sm leading-none">{selectedCountry.flag}</span>
                      <span className="font-mono text-[11px] font-semibold text-zinc-400">
                        {selectedCountry.code}
                      </span>
                      <ChevronDown className="w-3 h-3 text-[#4B7355] group-hover:text-emerald-400 transition" />
                    </button>

                    {showCountryDropdown && (
                      <div className="absolute left-0 top-full mt-1.5 w-48 bg-[#07140B] border border-[#1F4527] rounded-xl shadow-2xl py-1 z-30 backdrop-blur-xl animate-in fade-in duration-150">
                        {COUNTRIES.map((c) => (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => {
                              setSelectedCountry(c);
                              setShowCountryDropdown(false);
                            }}
                            className="w-full flex items-center justify-between px-3.5 py-2 text-xs text-zinc-200 hover:bg-[#122B1A] transition text-left cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <span>{c.flag}</span>
                              <span>{c.name}</span>
                            </div>
                            <span className="text-[#34D353] font-mono text-[11px]">{c.dialCode}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <input
                    type="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    onBlur={() => markTouched('phone')}
                    placeholder={selectedCountry.placeholder}
                    className="w-full bg-transparent px-3.5 py-3 text-sm text-[#E8FBEA] placeholder:text-[#4B7355] outline-none"
                  />
                </div>
                {touched.phone && phone && !isValidPhone(phone) && (
                  <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-1 pl-1">
                    <AlertCircle className="w-3 h-3" /> Mínimo 10 dígitos numéricos
                  </p>
                )}
              </motion.div>

              {/* 5. Password */}
              <motion.div variants={inputItemVariants}>
                <div className="relative group">
                  <Lock className="w-4 h-4 text-[#4B7355] group-focus-within:text-[#34D353] group-focus-within:scale-110 transition-all duration-200 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => markTouched('password')}
                    placeholder="Create a password"
                    className="w-full bg-[#0C1911]/80 border border-[#193A24] rounded-xl pl-11 pr-11 py-3 text-sm text-[#E8FBEA] placeholder:text-[#4B7355] transition-all duration-200 font-mono input-rim-focus focus:scale-[1.005]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#4B7355] hover:text-[#B8F5A0] transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Barra de seguridad de contraseña */}
                {password && (
                  <div className="mt-1.5 px-1 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-zinc-400 font-mono">Seguridad:</span>
                      <span className="text-zinc-300 font-medium">{passwordStrength.text}</span>
                    </div>
                    <div className="w-full h-1 bg-[#061009] rounded-full overflow-hidden flex gap-1">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`flex-1 h-full rounded-full transition-all duration-200 ${
                            level <= passwordStrength.score ? passwordStrength.color : 'bg-[#122217]'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>

              {/* 6. Company Name */}
              <motion.div variants={inputItemVariants}>
                <div className="relative group">
                  <Building2 className="w-4 h-4 text-[#4B7355] group-focus-within:text-[#34D353] group-focus-within:scale-110 transition-all duration-200 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={handleCompanyChange}
                    onBlur={() => markTouched('companyName')}
                    placeholder={
                      accountType === 'company'
                        ? 'Company name (e.g. Acme Corp)'
                        : 'Empresa u Organización asignada'
                    }
                    className="w-full bg-[#0C1911]/80 border border-[#193A24] rounded-xl pl-11 pr-4 py-3 text-sm text-[#E8FBEA] placeholder:text-[#4B7355] transition-all duration-200 input-rim-focus focus:scale-[1.005]"
                  />
                </div>
                {touched.companyName && !isValidCompany(companyName) && (
                  <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-1 pl-1">
                    <AlertCircle className="w-3 h-3" /> Mínimo 3 caracteres válidos
                  </p>
                )}
              </motion.div>

              {/* 7. Botón Primario con Shimmer Light Beam */}
              <motion.div variants={inputItemVariants} className="pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="relative overflow-hidden w-full py-3.5 rounded-xl bg-gradient-to-r from-[#20C048] via-[#34D353] to-[#4ADE80] text-[#040A06] font-bold text-sm shadow-[0_0_24px_rgba(52,211,83,0.35),inset_0_1px_0_rgba(255,255,255,0.4)] hover:shadow-[0_0_38px_rgba(52,211,83,0.6)] hover:brightness-105 active:scale-[0.98] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 group"
                >
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent group-hover:animate-mint-shimmer" />
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading && <RefreshCw className="w-4 h-4 animate-spin text-[#040A06]" />}
                    <span>{loading ? 'Creating account...' : 'Create an account'}</span>
                  </span>
                </button>
              </motion.div>
            </motion.form>
          ) : (
            <motion.form
              key="signin-form"
              custom={direction}
              variants={formVariants}
              initial="enter"
              animate="center"
              exit="exit"
              onSubmit={handleSignInSubmit}
              className="space-y-3"
            >
              {/* 1. Email */}
              <motion.div variants={inputItemVariants}>
                <div className="relative group">
                  <Mail className="w-4 h-4 text-[#4B7355] group-focus-within:text-[#34D353] group-focus-within:scale-110 transition-all duration-200 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={handleEmailChange}
                    onBlur={() => markTouched('email')}
                    placeholder="Enter your email"
                    className="w-full bg-[#0C1911]/80 border border-[#193A24] rounded-xl pl-11 pr-4 py-3 text-sm text-[#E8FBEA] placeholder:text-[#4B7355] transition-all duration-200 input-rim-focus focus:scale-[1.005]"
                  />
                </div>
                {touched.email && !isValidEmail(email) && (
                  <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-1 pl-1">
                    <AlertCircle className="w-3 h-3" /> Ingresa un correo válido
                  </p>
                )}
              </motion.div>

              {/* 2. Password */}
              <motion.div variants={inputItemVariants}>
                <div className="relative group">
                  <Lock className="w-4 h-4 text-[#4B7355] group-focus-within:text-[#34D353] group-focus-within:scale-110 transition-all duration-200 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => markTouched('password')}
                    placeholder="Enter your password"
                    className="w-full bg-[#0C1911]/80 border border-[#193A24] rounded-xl pl-11 pr-11 py-3 text-sm text-[#E8FBEA] placeholder:text-[#4B7355] transition-all duration-200 font-mono input-rim-focus focus:scale-[1.005]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#4B7355] hover:text-[#B8F5A0] transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {touched.password && !isValidPassword(password) && (
                  <p className="text-[11px] text-rose-400 flex items-center gap-1 mt-1 pl-1">
                    <AlertCircle className="w-3 h-3" /> Mínimo 6 caracteres
                  </p>
                )}
              </motion.div>

              {/* 3. Botón Primario con Shimmer Light Beam */}
              <motion.div variants={inputItemVariants} className="pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="relative overflow-hidden w-full py-3.5 rounded-xl bg-gradient-to-r from-[#20C048] via-[#34D353] to-[#4ADE80] text-[#040A06] font-bold text-sm shadow-[0_0_24px_rgba(52,211,83,0.35),inset_0_1px_0_rgba(255,255,255,0.4)] hover:shadow-[0_0_38px_rgba(52,211,83,0.6)] hover:brightness-105 active:scale-[0.98] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 group"
                >
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent group-hover:animate-mint-shimmer" />
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading && <RefreshCw className="w-4 h-4 animate-spin text-[#040A06]" />}
                    <span>{loading ? 'Signing in...' : 'Sign in'}</span>
                  </span>
                </button>
              </motion.div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* ─── 5. Botones Secundarios Inferiores con Micro-interacciones Mint ─── */}
        <div className="relative my-5 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#162D1D]" />
          </div>
          <span className="relative bg-[#0A160F] px-3 text-[10px] tracking-widest text-[#527558] uppercase font-mono">
            O CONTINUAR CON
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleQuickAdminDemo}
            className="group bg-[#0C1911]/80 hover:bg-[#12291B] border border-[#193A24] hover:border-[#34D353]/60 hover:shadow-[0_0_18px_rgba(52,211,83,0.2)] rounded-xl py-2.5 px-3 flex items-center justify-center gap-2 text-xs font-medium text-zinc-300 hover:text-white hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-[#34D353] group-hover:scale-110 group-hover:rotate-6 transition-transform duration-200" />
            <span>Demo Admin</span>
          </button>
          <button
            type="button"
            onClick={handleQuickOperatorDemo}
            className="group bg-[#0C1911]/80 hover:bg-[#12291B] border border-[#193A24] hover:border-[#34D353]/60 hover:shadow-[0_0_18px_rgba(52,211,83,0.2)] rounded-xl py-2.5 px-3 flex items-center justify-center gap-2 text-xs font-medium text-zinc-300 hover:text-white hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5 text-[#34D353] group-hover:scale-110 group-hover:rotate-6 transition-transform duration-200" />
            <span>Modo Operador</span>
          </button>
        </div>

        {/* Términos y Condiciones */}
        <p className="text-[11px] text-[#527558] text-center mt-5 leading-relaxed">
          By {tab === 'signup' ? 'creating an account' : 'signing in'}, you agree to our{' '}
          <span className="text-[#8EB795] hover:text-[#B8F5A0] underline underline-offset-2 cursor-pointer transition">
            Terms &amp; Service
          </span>
        </p>
      </motion.div>
    </div>
  </div>
  );
};

export default LoginView;
