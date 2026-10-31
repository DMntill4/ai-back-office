import React, { useState } from "react";
import { Save, RotateCcw, CheckCircle2, Lock, ShieldCheck } from "lucide-react";
import { InputField } from "../ui/InputField";
import { Button } from "../ui/Button";
import {
  useUserSettings,
  updateProfile,
  getInitials,
} from "../../hooks/useUserSettings";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ROLE_OPTIONS = [
  { value: "admin", label: "Administrador de Negocio" },
  { value: "owner", label: "Propietario / Dueño" },
  { value: "supervisor", label: "Supervisor de Operaciones" },
  { value: "operator", label: "Operador de Logística y Compras" },
  { value: "auditor", label: "Auditor de Riesgo y Decisiones" },
  { value: "finance", label: "Tesorería y Finanzas" },
  { value: "driver", label: "Conductor / Transportista" },
  { value: "viewer", label: "Solo Lectura (Auditor Externo)" },
] as const;

function resolveRoleValue(role: string): string {
  const r = (role || "").toLowerCase().trim();
  if (r.includes("admin")) return "admin";
  if (r.includes("prop") || r.includes("dueñ") || r.includes("owner")) return "owner";
  if (r.includes("superv")) return "supervisor";
  if (r.includes("oper")) return "operator";
  if (r.includes("audit")) return "auditor";
  if (r.includes("finan") || r.includes("tesor")) return "finance";
  if (r.includes("cond") || r.includes("driv") || r.includes("trans")) return "driver";
  if (r.includes("view") || r.includes("lect") || r.includes("consult")) return "viewer";
  return "admin";
}

/** Mi perfil: datos personales del usuario que se muestran en la barra superior. */
export const ProfileSettingsView: React.FC = () => {
  const { profile } = useUserSettings();
  const [draft, setDraft] = useState(profile);
  const [saved, setSaved] = useState(false);

  const errors = {
    fullName: draft.fullName.trim() ? "" : "El nombre es obligatorio.",
    email:
      draft.email.trim() && !EMAIL_RE.test(draft.email.trim())
        ? "Escribe un correo válido."
        : "",
  };
  const hasErrors = Boolean(errors.fullName || errors.email);
  const isDirty =
    draft.fullName.trim() !== profile.fullName.trim() ||
    draft.email.trim() !== profile.email.trim() ||
    draft.phone.trim() !== profile.phone.trim();

  const set = (key: keyof typeof draft) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setSaved(false);
    setDraft((d) => ({ ...d, [key]: e.target.value }));
  };

  const save = () => {
    if (hasErrors) return;
    updateProfile({
      fullName: draft.fullName.trim(),
      role: profile.role, // Protegido por gobernanza: un usuario no puede modificarse su propio rol
      email: draft.email.trim(),
      phone: draft.phone.trim(),
    });
    setSaved(true);
  };

  const activeRoleLabel =
    ROLE_OPTIONS.find((opt) => opt.value === resolveRoleValue(draft.role))?.label ??
    draft.role;

  return (
    <div className="max-w-3xl space-y-group">
      <div className="bg-panel rounded-container border border-border p-group">
        <div className="flex items-center gap-base pb-base border-b border-border">
          <div className="w-14 h-14 rounded-pill bg-raised border border-border flex items-center justify-center text-section-title font-bold text-brand font-mono">
            {getInitials(draft.fullName)}
          </div>
          <div className="min-w-0">
            <p className="text-body-large font-semibold text-primary truncate">
              {draft.fullName.trim() || "Sin nombre"}
            </p>
            <p className="text-caption text-secondary truncate">{activeRoleLabel || "Sin cargo"}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-base pt-base">
          <InputField
            label="Nombre completo"
            value={draft.fullName}
            onChange={set("fullName")}
            error={errors.fullName || undefined}
          />

          {/* Campo de rol protegido con opciones formales: no editable como texto libre */}
          <div className="w-full space-y-hairline">
            <div className="flex items-center justify-between">
              <label htmlFor="user-profile-role" className="block text-label font-medium text-secondary">
                Cargo / Rol del Sistema
              </label>
              <span className="inline-flex items-center gap-1 text-caption text-secondary font-mono bg-raised px-2 py-0.5 rounded-pill border border-border">
                <Lock className="w-3 h-3 text-brand" /> Protegido
              </span>
            </div>

            <div className="relative flex items-center">
              <select
                id="user-profile-role"
                disabled
                value={resolveRoleValue(draft.role)}
                className="w-full h-9 px-3 pr-8 text-body bg-raised text-primary border border-strong rounded-control opacity-80 cursor-not-allowed focus:outline-none appearance-none"
                aria-readonly="true"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 pointer-events-none text-muted flex items-center">
                <ShieldCheck className="w-4 h-4 text-brand" />
              </div>
            </div>

            <p className="text-caption text-muted mt-1">
              Solo un Administrador puede autorizar y reasignar roles desde la sección de Equipo y Roles.
            </p>
          </div>

          <InputField
            label="Correo de contacto"
            type="email"
            value={draft.email}
            onChange={set("email")}
            error={errors.email || undefined}
            helperText="Se usa para avisos y firma de aprobaciones."
          />
          <InputField
            label="Teléfono"
            type="tel"
            value={draft.phone}
            onChange={set("phone")}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-compact pt-base mt-base border-t border-border">
          <span
            className={`flex items-center gap-1 text-caption ${
              saved ? "text-state-ok" : "text-muted"
            }`}
            role="status"
          >
            {saved ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" /> Perfil guardado.
              </>
            ) : isDirty ? (
              "Tienes cambios sin guardar."
            ) : (
              "Sin cambios."
            )}
          </span>
          <div className="flex items-center gap-compact">
            <Button
              variant="secondary"
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              disabled={!isDirty}
              onClick={() => {
                setDraft(profile);
                setSaved(false);
              }}
            >
              Descartar
            </Button>
            <Button
              icon={<Save className="w-3.5 h-3.5" />}
              disabled={!isDirty || hasErrors}
              onClick={save}
            >
              Guardar perfil
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};