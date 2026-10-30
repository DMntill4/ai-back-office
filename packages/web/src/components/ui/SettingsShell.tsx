import React from "react";
import { motion } from "motion/react";
import {
    Settings,
    Building2,
    Plug,
    BellRing,
    Webhook,
    ShieldCheck,
    ChevronRight,
} from "lucide-react";

export type SettingsTabId =
    | "configuracion_general"
    | "empresas_sucursales"
    | "integraciones"
    | "canales_notificaciones"
    | "webhooks_api"
    | "roles_permisos";

export interface SettingsTabDef {
    id: SettingsTabId;
    label: string;
    shortLabel: string;
    description: string;
    icon: React.ElementType;
}

export const SETTINGS_TABS: SettingsTabDef[] = [
    {
        id: "configuracion_general",
        label: "Configuración General",
        shortLabel: "General",
        description: "Parámetros del motor de IA y modo de autonomía",
        icon: Settings,
    },
    {
        id: "empresas_sucursales",
        label: "Empresas y Sucursales",
        shortLabel: "Sucursales",
        description: "Bodegas matrices, hubs y capacidad instalada",
        icon: Building2,
    },
    {
        id: "integraciones",
        label: "Integraciones",
        shortLabel: "Integraciones",
        description: "Conectores ERP, DIAN y motor logístico",
        icon: Plug,
    },
    {
        id: "canales_notificaciones",
        label: "Canales de Alerta",
        shortLabel: "Canales",
        description: "Telegram, Slack, correo y WhatsApp",
        icon: BellRing,
    },
    {
        id: "webhooks_api",
        label: "Webhooks y API",
        shortLabel: "Webhooks",
        description: "Endpoints, telemetría y registros de tráfico",
        icon: Webhook,
    },
    {
        id: "roles_permisos",
        label: "Roles y Permisos",
        shortLabel: "Roles",
        description: "Matriz de privilegios y delegación de firma",
        icon: ShieldCheck,
    },
];

export interface SettingsShellProps {
    activeTab: SettingsTabId;
    onTabChange: (tab: SettingsTabId) => void;
    /** Contenido de la sub-pestaña activa (sin su propio header ni padding). */
    children: React.ReactNode;
    /** Acciones contextuales de la sub-pestaña (botones a la derecha del título). */
    actions?: React.ReactNode;
    /** Etiqueta de estado global mostrada en la barra superior. */
    statusLabel?: string;
}

/**
 * Contenedor maestro del módulo de Configuración.
 * Provee la navegación horizontal entre las 6 sub-pestañas y el marco visual
 * del sistema de diseño Dark Emerald (canvas → card → well).
 */
export const SettingsShell: React.FC<SettingsShellProps> = ({
    activeTab,
    onTabChange,
    children,
    actions,
    statusLabel = "Sistema Operativo",
}) => {
    const active = SETTINGS_TABS.find((t) => t.id === activeTab) ?? SETTINGS_TABS[0];

    return (
        <div className="flex-1 h-full overflow-hidden flex flex-col bg-canvas text-[#F9FAFB] font-sans select-none relative">
            {/* ========================================================= */}
            {/* BARRA SUPERIOR DEL MÓDULO                                 */}
            {/* ========================================================= */}
            <header className="px-6 pt-5 pb-0 bg-canvas border-b border-white/[0.06] shrink-0 z-20">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-zinc-500 mb-1.5">
                            <span>Configuración</span>
                            <ChevronRight className="w-3 h-3" />
                            <span className="text-emerald-400">{active.label}</span>
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">
                            Centro de Configuración del Sistema
                        </h1>
                        <p className="text-xs text-zinc-400 mt-0.5">{active.description}</p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                        <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-mono text-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {statusLabel}
                        </span>
                        {actions}
                    </div>
                </div>

                {/* ======================================================= */}
                {/* NAVEGACIÓN HORIZONTAL DE SUB-PESTAÑAS                    */}
                {/* ======================================================= */}
                <nav
                    role="tablist"
                    aria-label="Secciones de configuración"
                    className="flex items-stretch gap-1 mt-4 -mb-px overflow-x-auto custom-scrollbar"
                >
                    {SETTINGS_TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = tab.id === activeTab;
                        return (
                            <button
                                key={tab.id}
                                role="tab"
                                aria-selected={isActive}
                                onClick={() => onTabChange(tab.id)}
                                className={`relative group flex items-center gap-2 px-3.5 py-2.5 rounded-t-xl text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${isActive
                                        ? "text-emerald-300 border-emerald-500 bg-surface-1"
                                        : "text-zinc-400 border-transparent hover:text-white hover:bg-white/[0.03]"
                                    }`}
                            >
                                <Icon
                                    className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-emerald-400" : "text-zinc-500 group-hover:text-zinc-300"
                                        }`}
                                />
                                <span className="hidden md:inline">{tab.label}</span>
                                <span className="md:hidden">{tab.shortLabel}</span>
                                {isActive && (
                                    <motion.span
                                        layoutId="settings-tab-glow"
                                        className="absolute inset-x-2 -bottom-px h-px bg-emerald-400/70"
                                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </nav>
            </header>

            {/* ========================================================= */}
            {/* CONTENEDOR MAESTRO DE LA SUB-PESTAÑA                      */}
            {/* ========================================================= */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 min-h-0">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="space-y-6"
                >
                    {children}
                </motion.div>
            </div>
        </div>
    );
};
