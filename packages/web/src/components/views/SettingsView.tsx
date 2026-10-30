import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Shield,
  CheckCircle2,
  Zap,
  Server,
  Save,
  Cpu,
} from "lucide-react";
import { KpiStrip, KpiCardItem } from "../ui/KpiStrip";
import { SettingsShell, SettingsTabId, SETTINGS_TABS } from "../ui/SettingsShell";
import { CompaniesBranchesView } from "./CompaniesBranchesView";
import { IntegrationsView } from "./IntegrationsView";
import { NotificationChannelsView } from "./NotificationChannelsView";
import { WebhooksApiView } from "./WebhooksApiView";
import { RolesPermissionsView } from "./RolesPermissionsView";
import { ProfileSettingsView } from "./ProfileSettingsView";
import { PreferencesSettingsView } from "./PreferencesSettingsView";

export interface SettingsViewProps {
  initialTab?: string;
  onNavigateTo?: (tabId: string) => void;
}

const isSettingsTabId = (value: string | undefined): value is SettingsTabId =>
  !!value && SETTINGS_TABS.some((t) => t.id === value);

const cardClass =
  "bg-panel rounded-container p-base border border-border flex flex-col justify-between";
const cardHeaderClass =
  "flex items-center justify-between pb-compact border-b border-border";
const iconBoxClass =
  "w-8 h-8 rounded-control bg-brand-surface text-brand flex items-center justify-center";
const wellClass =
  "bg-raised rounded-control p-compact mt-base border border-border space-y-compact";
const labelClass = "text-caption font-mono text-muted block mb-hairline";
const selectClass =
  "w-full h-9 bg-panel border border-border rounded-control px-compact text-caption text-primary focus:outline-none focus:border-brand";

const GeneralSettingsPanel: React.FC = () => {
  const [autonomyLevel, setAutonomyLevel] = useState<"assisted" | "strict" | "auto">("assisted");
  const [primaryModel, setPrimaryModel] = useState("gemini-flash");
  const [temperature, setTemperature] = useState("0.1");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSave = () => {
    showToast("Configuracion general y parametros del sistema guardados con exito.");
  };

  const handleRunDoctor = () => {
    showToast("Diagnostico del sistema completado: 6/6 servicios verificados en 42ms.");
  };

  const kpis: KpiCardItem[] = [
    {
      title: "Salud Global del Sistema",
      value: "100% Optimo",
      subtitle: "6 de 6 modulos en linea",
      trend: { direction: "up", label: "0 advertencias" },
      icon: CheckCircle2,
      isHero: true,
      onActionClick: handleRunDoctor,
    },
    {
      title: "Tiempo de Actividad",
      value: "99.98%",
      subtitle: "Uptime continuo en 2026",
      trend: { direction: "up", label: "Alta disponibilidad" },
      icon: Server,
    },
    {
      title: "Modo Operativo",
      value: "Autonomo Supervisado",
      subtitle: "Firma delegada hasta $5M",
      trend: { direction: "up", label: "Aprobacion humana activa" },
      icon: Shield,
    },
    {
      title: "Motor de Inferencia",
      value: "MINT Core v2.4",
      subtitle: "Latencia promedio: 142ms",
      trend: { direction: "up", label: "Optimizado" },
      icon: Cpu,
    },
  ];

  return (
    <div className="flex flex-col gap-group">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            className="fixed top-6 right-8 z-50 px-compact py-compact rounded-pill flex items-center gap-compact bg-brand-surface border border-brand/40 text-brand shadow-popover"
          >
            <div className="w-2 h-2 rounded-pill bg-brand animate-ping" />
            <span className="text-label font-mono font-medium">{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-muted hover:text-primary text-label ml-hairline"
            >
              x
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap items-center justify-end gap-compact">
        <button
          onClick={handleRunDoctor}
          className="px-compact py-hairline rounded-control bg-panel hover:border-border-strong text-caption font-medium text-secondary hover:text-primary border border-border flex items-center gap-hairline transition-colors"
        >
          <Zap className="w-3.5 h-3.5 text-brand" />
          <span>Ejecutar Diagnostico</span>
        </button>
        <button
          onClick={handleSave}
          className="px-base py-hairline rounded-control bg-brand hover:bg-brand text-canvas font-semibold text-caption flex items-center gap-compact transition-colors cursor-pointer"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Guardar Configuracion</span>
        </button>
      </div>

      <KpiStrip items={kpis} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-base">
        <div className={cardClass}>
          <div>
            <div className={cardHeaderClass}>
              <div className="flex items-center gap-compact">
                <div className={iconBoxClass}>
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-label font-semibold text-primary">Motor de Inferencia y Razonamiento</h3>
                  <span className="text-caption text-muted font-mono">Modelo Principal de IA</span>
                </div>
              </div>
              <span className="text-caption font-bold font-mono text-brand bg-brand-surface px-compact py-hairline rounded border border-brand/20">
                Latencia: 142ms
              </span>
            </div>

            <p className="text-caption text-secondary mt-compact leading-relaxed">
              Selecciona el modelo de inferencia para orquestacion de compras, calculo de rotacion ROP y enrutamiento logistico.
            </p>
          </div>

          <div className={wellClass}>
            <div>
              <label className={labelClass}>Modelo Asignado</label>
              <select
                value={primaryModel}
                onChange={(e) => setPrimaryModel(e.target.value)}
                className={selectClass}
              >
                <option value="gemini-flash">Google Gemini 2.0 Flash (Alta Velocidad - Recomendado)</option>
                <option value="gemini-pro">Google Gemini 1.5 Pro (Razonamiento Complejo)</option>
                <option value="claude-sonnet">Anthropic Claude 3.5 Sonnet</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between text-caption font-mono text-secondary mb-hairline">
                <span>Temperatura de Decision</span>
                <span className="text-primary font-bold">{temperature} (Determinista)</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.5"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                className="w-full accent-brand cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div className={cardClass}>
          <div>
            <div className={cardHeaderClass}>
              <div className="flex items-center gap-compact">
                <div className="w-8 h-8 rounded-control bg-state-pending/15 text-state-pending flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-label font-semibold text-primary">Modo de Autonomia Operacional</h3>
                  <span className="text-caption text-muted font-mono">Control de Intervencion</span>
                </div>
              </div>
              <span className="text-caption font-bold font-mono text-primary">
                {autonomyLevel === "assisted" ? "Supervisado" : autonomyLevel === "strict" ? "Estricto" : "Completamente Autonomo"}
              </span>
            </div>

            <p className="text-caption text-secondary mt-compact leading-relaxed">
              Define si las compras recurrentes bajo el umbral de seguridad se emiten directamente o si requieren pre-aprobacion en bandeja.
            </p>
          </div>

          <div className="bg-raised rounded-control p-compact mt-base border border-border">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-compact">
              {[
                { id: "strict", label: "Estricto", desc: "Todo a aprobacion" },
                { id: "assisted", label: "Supervisado", desc: "Umbral $5M" },
                { id: "auto", label: "Autonomo", desc: "Reglas al 100%" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setAutonomyLevel(m.id as "assisted" | "strict" | "auto")}
                  className={`py-hairline px-compact rounded-control text-left border transition-colors ${
                    autonomyLevel === m.id
                      ? "bg-brand-surface border-brand/40 text-brand"
                      : "bg-panel border-border text-secondary hover:text-primary hover:border-border-strong"
                  }`}
                >
                  <span className="block text-caption font-bold">{m.label}</span>
                  <span className="block text-caption text-muted mt-hairline">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SettingsView: React.FC<SettingsViewProps> = ({ initialTab, onNavigateTo }) => {
  const [activeSection, setActiveSection] = useState<SettingsTabId>(
    isSettingsTabId(initialTab) ? initialTab : "configuracion_general",
  );

  useEffect(() => {
    if (isSettingsTabId(initialTab)) setActiveSection(initialTab);
  }, [initialTab]);

  const handleTabChange = (tab: SettingsTabId) => {
    setActiveSection(tab);
    onNavigateTo?.(tab);
  };

  const renderSection = () => {
    switch (activeSection) {
      case "mi_perfil":
        return <ProfileSettingsView />;
      case "preferencias":
        return <PreferencesSettingsView />;
      case "empresas_sucursales":
        return <CompaniesBranchesView />;
      case "integraciones":
        return <IntegrationsView />;
      case "canales_notificaciones":
        return <NotificationChannelsView />;
      case "webhooks_api":
        return <WebhooksApiView />;
      case "roles_permisos":
        return <RolesPermissionsView />;
      case "configuracion_general":
      default:
        return <GeneralSettingsPanel />;
    }
  };

  return (
    <SettingsShell activeTab={activeSection} onTabChange={handleTabChange}>
      {renderSection()}
    </SettingsShell>
  );
};
