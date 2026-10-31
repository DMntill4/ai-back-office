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
    User,
    SlidersHorizontal,
} from "lucide-react";

export type SettingsTabId =
    | "mi_perfil"
    | "preferencias"
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
        id: "mi_perfil",
        label: "Mi perfil",
        shortLabel: "Perfil",
        description: "Tus datos personales y cómo apareces en Mint",
        icon: User,
    },
    {
        id: "preferencias",
        label: "Preferencias",
        shortLabel: "Preferencias",
        description: "Vista inicial, interfaz y avisos de tu ecosistema",
        icon: SlidersHorizontal,
    },
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
        description: "Estado real de la base de datos y el motor de IA",
        icon: Plug,
    },
    {
        id: "canales_notificaciones",
        label: "Canales de Alerta",
        shortLabel: "Canales",
        description: "Canales de notificación disponibles en el backend",
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
        <div className="flex-1 h-full overflow-hidden flex flex-col bg-canvas text-primary font-sans relative">
            {/* ========================================================= */}
            {/* BARRA SUPERIOR DEL MÓDULO                                 */}
            {/* ========================================================= */}
            <header className="px-group pt-base pb-0 bg-canvas border-b border-border shrink-0 z-20">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-base">
                    <div className="min-w-0">
                        <div className="flex items-center gap-hairline text-caption font-mono text-muted mb-hairline">
                            <span>Configuración</span>
                            <ChevronRight className="w-3 h-3" />
                            <span className="text-brand">{active.label}</span>
                        </div>
                        <h1 className="text-page-title font-semibold text-primary">
                            Centro de Configuración del Sistema
                        </h1>
                        <p className="text-body text-secondary mt-hairline">{active.description}</p>
                    </div>

                    <div className="flex items-center gap-compact shrink-0">
                        <span className="hidden lg:inline-flex items-center gap-hairline px-compact py-hairline rounded-control bg-brand-surface border border-brand/30 text-caption font-mono text-brand">
                            <span className="w-1.5 h-1.5 rounded-pill bg-brand animate-pulse" />
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
                    data-lenis-prevent
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
                                className={`relative group flex items-center gap-compact px-compact py-compact rounded-t-control text-label font-medium whitespace-nowrap transition-colors border-b-2 ${isActive
                                    ? "text-brand border-brand bg-raised"
                                    : "text-secondary border-transparent hover:text-primary hover:bg-raised"
                                    }`}
                            >
                                <Icon
                                    className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-brand" : "text-muted group-hover:text-secondary"
                                        }`}
                                />
                                <span className="hidden md:inline">{tab.label}</span>
                                <span className="md:hidden">{tab.shortLabel}</span>
                                {isActive && (
                                    <motion.span
                                        layoutId="settings-tab-glow"
                                        className="absolute inset-x-2 -bottom-px h-px bg-brand/70"
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
            <div data-lenis-prevent className="flex-1 overflow-y-auto custom-scrollbar p-6 min-h-0">
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
