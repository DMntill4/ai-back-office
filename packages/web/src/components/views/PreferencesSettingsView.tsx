import React from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "../ui/Button";
import {
  useUserSettings,
  updatePreferences,
  resetPreferences,
  COMPANIES,
  LANDING_OPTIONS,
  UserPreferences,
} from "../../hooks/useUserSettings";

const selectClass =
  "w-full h-9 bg-panel border border-border rounded-control px-compact text-caption text-primary focus:outline-none focus:border-brand";

const Toggle: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}> = ({ checked, onChange, label, description }) => (
  <div className="flex items-center justify-between gap-base py-compact">
    <div className="min-w-0">
      <p className="text-label font-medium text-primary">{label}</p>
      {description && <p className="text-caption text-muted mt-hairline">{description}</p>}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 w-10 h-6 rounded-pill border transition-colors cursor-pointer ${
        checked ? "bg-brand border-brand" : "bg-raised border-border"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-pill bg-action transition-transform ${
          checked ? "translate-x-4" : ""
        }`}
      />
    </button>
  </div>
);

const Section: React.FC<{ title: string; description: string; children: React.ReactNode }> = ({
  title,
  description,
  children,
}) => (
  <div className="bg-panel rounded-container border border-border p-group">
    <h3 className="text-label font-semibold text-primary">{title}</h3>
    <p className="text-caption text-secondary mt-hairline pb-compact border-b border-border">
      {description}
    </p>
    <div className="pt-compact divide-y divide-border">{children}</div>
  </div>
);

/** Preferencias del usuario dentro de su ecosistema. Se guardan al instante. */
export const PreferencesSettingsView: React.FC = () => {
  const { preferences } = useUserSettings();
  const set = <K extends keyof UserPreferences>(key: K) =>
    (value: UserPreferences[K]) => updatePreferences({ [key]: value } as Partial<UserPreferences>);

  return (
    <div className="max-w-3xl space-y-group">
      <div className="flex items-center justify-between gap-compact">
        <p className="text-caption text-muted">
          Los cambios se guardan automáticamente en este equipo.
        </p>
        <Button
          variant="secondary"
          size="sm"
          icon={<RotateCcw className="w-3.5 h-3.5" />}
          onClick={resetPreferences}
        >
          Restablecer
        </Button>
      </div>

      <Section
        title="Al iniciar Mint"
        description="Qué ves primero cuando abres la aplicación."
      >
        <div className="py-compact grid grid-cols-1 md:grid-cols-2 gap-base">
          <div>
            <label className="block text-label font-medium text-secondary mb-hairline">
              Vista inicial
            </label>
            <select
              value={preferences.landingTab}
              onChange={(e) => set("landingTab")(e.target.value)}
              className={selectClass}
            >
              {LANDING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-label font-medium text-secondary mb-hairline">
              Empresa predeterminada
            </label>
            <select
              value={preferences.defaultCompany}
              onChange={(e) => set("defaultCompany")(e.target.value)}
              className={selectClass}
            >
              {COMPANIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Section>

      <Section title="Interfaz" description="Cómo se acomoda la pantalla (aplica al abrir Mint).">
        <Toggle
          label="Barra lateral colapsada"
          description="Empieza con solo los íconos para ganar espacio."
          checked={preferences.sidebarCollapsed}
          onChange={set("sidebarCollapsed")}
        />
        <Toggle
          label="Mostrar costo de la tarea"
          description="Indicador de tokens y costo del agente en la barra superior."
          checked={preferences.showCostBadge}
          onChange={set("showCostBadge")}
        />
      </Section>

      <Section
        title="Avisos en la campana"
        description="Elige qué tipos de aviso quieres ver. Los canales externos (Telegram, correo) se configuran en Canales de alerta."
      >
        <Toggle
          label="Aprobaciones pendientes"
          description="Órdenes que esperan tu firma."
          checked={preferences.notifyApprovals}
          onChange={set("notifyApprovals")}
        />
        <Toggle
          label="Alertas de inventario"
          description="Stock bajo el punto de reorden y lotes en cuarentena."
          checked={preferences.notifyStock}
          onChange={set("notifyStock")}
        />
        <Toggle
          label="Actividad del agente"
          description="Ciclos en curso y resultados."
          checked={preferences.notifyAgent}
          onChange={set("notifyAgent")}
        />
      </Section>
    </div>
  );
};
