import React, { useState } from "react";
import { Save, RotateCcw, CheckCircle2 } from "lucide-react";
import { InputField } from "../ui/InputField";
import { Button } from "../ui/Button";
import {
  useUserSettings,
  updateProfile,
  getInitials,
} from "../../hooks/useUserSettings";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const isDirty = (Object.keys(draft) as (keyof typeof draft)[]).some(
    (k) => draft[k] !== profile[k]
  );

  const set = (key: keyof typeof draft) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setSaved(false);
    setDraft((d) => ({ ...d, [key]: e.target.value }));
  };

  const save = () => {
    if (hasErrors) return;
    updateProfile({
      fullName: draft.fullName.trim(),
      role: draft.role.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
    });
    setSaved(true);
  };

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
            <p className="text-caption text-secondary truncate">{draft.role || "Sin cargo"}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-base pt-base">
          <InputField
            label="Nombre completo"
            value={draft.fullName}
            onChange={set("fullName")}
            error={errors.fullName || undefined}
          />
          <InputField label="Cargo" value={draft.role} onChange={set("role")} />
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
