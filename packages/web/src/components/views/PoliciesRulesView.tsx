import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Shield,
  DollarSign,
  CheckCircle2,
  Save,
  Truck,
  Boxes,
  Zap,
  Sparkles,
  Percent,
  Clock,
  Lock,
} from "lucide-react";
import { KpiStrip, KpiCardItem } from "../ui/KpiStrip";

/** Interruptor táctil del Design System Mint. */
const TactileSwitch: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}> = ({ checked, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className={`relative w-11 h-6 rounded-pill shrink-0 transition-colors duration-200 border ${checked
      ? "bg-brand border-brand"
      : "bg-raised border-border-strong"
      }`}
  >
    <span
      className={`absolute top-0.5 rounded-pill transition-all duration-200 ${checked ? "left-[22px] bg-canvas" : "left-0.5 bg-muted"
        }`}
      style={{ width: 18, height: 18 }}
    />
  </button>
);

const cardClass = "bg-panel rounded-container p-base border border-border flex flex-col justify-between";
const cardHeaderClass = "flex items-center justify-between pb-compact border-b border-border";
const iconBoxClass = "w-8 h-8 rounded-control bg-brand-surface text-brand flex items-center justify-center";
const wellClass = "bg-raised rounded-control p-compact mt-base border border-border";
const rangeClass = "w-full accent-brand cursor-pointer";
const codeLabelClass = "text-caption text-muted font-mono";

export const PoliciesRulesView: React.FC = () => {
  const [hitlThreshold, setHitlThreshold] = useState<number>(5000000);
  const [safetyMultiplier, setSafetyMultiplier] = useState<number>(1.5);
  const [maxFreightPct, setMaxFreightPct] = useState<number>(14);
  const [duplicateWindowHours, setDuplicateWindowHours] = useState<number>(72);
  const [minSupplierScore, setMinSupplierScore] = useState<number>(85);
  const [autoRebalanceEnabled, setAutoRebalanceEnabled] = useState<boolean>(true);
  const [strictHmacEnabled, setStrictHmacEnabled] = useState<boolean>(true);
  const [autoSupplierSelection, setAutoSupplierSelection] = useState<boolean>(true);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSave = () => {
    showToast("Políticas de gobernanza guardadas y sincronizadas en el libro mayor.");
  };

  const handleReset = () => {
    setHitlThreshold(5000000);
    setSafetyMultiplier(1.5);
    setMaxFreightPct(14);
    setDuplicateWindowHours(72);
    setMinSupplierScore(85);
    setAutoRebalanceEnabled(true);
    setStrictHmacEnabled(true);
    setAutoSupplierSelection(true);
    showToast("Parámetros restablecidos a los valores predeterminados.");
  };

  const kpis: KpiCardItem[] = [
    {
      title: "Umbral de aprobación",
      value: `$${(hitlThreshold / 1000000).toFixed(1)}M COP`,
      subtitle: "Órdenes mayores requieren firma",
      trend: { direction: "up", label: "Gobernanza activa" },
      icon: DollarSign,
      isHero: true,
      onActionClick: handleSave,
    },
    {
      title: "Políticas Operativas",
      value: "8 Activas",
      subtitle: "0 excepciones pendientes",
      trend: { direction: "up", label: "100% auditadas" },
      icon: Shield,
    },
    {
      title: "Score Mínimo Proveedor",
      value: `${minSupplierScore} / 100`,
      subtitle: "Filtro de calidad & SLA",
      trend: { direction: "up", label: "Categoría A homologada" },
      icon: CheckCircle2,
    },
    {
      title: "Firma Criptográfica",
      value: strictHmacEnabled ? "Estricta" : "Permisiva",
      subtitle: "HMAC-SHA256 con llave rotativa",
      trend: { direction: "up", label: "Libro mayor inmutable" },
      icon: Lock,
    },
  ];

  return (
    <div className="flex-1 h-full overflow-y-auto bg-canvas text-primary font-sans flex flex-col p-group space-y-group">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            className="fixed top-6 right-8 z-50 px-compact py-hairline rounded-pill flex items-center gap-compact bg-brand-surface border border-brand/40 text-brand shadow-popover"
          >
            <div className="w-2 h-2 rounded-pill bg-brand animate-ping" />
            <span className="text-caption font-mono font-medium">{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-muted hover:text-primary text-caption ml-hairline"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER SUPERIOR */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-base">
        <div>
          <h1 className="text-page-title font-semibold text-primary">
            Reglas y Políticas de Gobernanza
          </h1>
          <p className="text-caption text-secondary mt-hairline">
            Límites financieros, guardrails de seguridad y parámetros de intervención humana
          </p>
        </div>

        <div className="flex items-center gap-compact">
          <button
            onClick={handleReset}
            className="px-compact py-hairline rounded-control bg-raised hover:bg-panel text-caption font-medium text-secondary hover:text-primary border border-border transition-colors"
          >
            Restablecer Parámetros
          </button>
          <button
            onClick={handleSave}
            className="px-base py-hairline rounded-control bg-brand hover:bg-brand text-canvas font-semibold text-caption flex items-center gap-compact transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Guardar Cambios</span>
          </button>
        </div>
      </header>

      {/* FILA 1: KPI STRIP */}
      <KpiStrip items={kpis} />

      {/* FILA 2: GRID DE TARJETAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-element">
        {/* Regla 1: Umbral de Aprobación */}
        <div className={cardClass}>
          <div>
            <div className={cardHeaderClass}>
              <div className="flex items-center gap-compact">
                <div className={iconBoxClass}>
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-caption font-semibold text-primary">Umbral de Compra Autónoma</h3>
                  <span className={codeLabelClass}>POL-COMP-01</span>
                </div>
              </div>
              <span className="text-label font-semibold text-brand font-mono">
                ${(hitlThreshold / 1000000).toFixed(1)}M COP
              </span>
            </div>

            <p className="text-caption text-secondary mt-compact leading-relaxed">
              Las órdenes de compra que superen este valor son retenidas automáticamente en la bandeja de aprobación para firma humana autorizada.
            </p>
          </div>

          <div className={wellClass}>
            <div className="flex justify-between text-caption font-mono text-secondary mb-hairline">
              <span>$1.000.000</span>
              <span className="text-primary font-semibold">${hitlThreshold.toLocaleString("es-CO")} COP</span>
              <span>$20.000.000</span>
            </div>
            <input
              type="range"
              min={1000000}
              max={20000000}
              step={500000}
              value={hitlThreshold}
              onChange={(e) => setHitlThreshold(Number(e.target.value))}
              className={rangeClass}
            />
          </div>
        </div>

        {/* Regla 2: Multiplicador de Stock de Seguridad */}
        <div className={cardClass}>
          <div>
            <div className={cardHeaderClass}>
              <div className="flex items-center gap-compact">
                <div className={iconBoxClass}>
                  <Boxes className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-caption font-semibold text-primary">Multiplicador de Stock de Seguridad</h3>
                  <span className={codeLabelClass}>POL-STK-02</span>
                </div>
              </div>
              <span className="text-label font-semibold text-primary font-mono">{safetyMultiplier}x</span>
            </div>

            <p className="text-caption text-secondary mt-compact leading-relaxed">
              Factor aplicado sobre la desviación estándar del tiempo de entrega del proveedor para prevenir quiebres de inventario.
            </p>
          </div>

          <div className={wellClass}>
            <div className="flex justify-between text-caption font-mono text-secondary mb-hairline">
              <span>1.0x (Mínimo)</span>
              <span className="text-brand font-semibold">{safetyMultiplier}x Cobertura</span>
              <span>3.0x (Máximo)</span>
            </div>
            <input
              type="range"
              min={1.0}
              max={3.0}
              step={0.1}
              value={safetyMultiplier}
              onChange={(e) => setSafetyMultiplier(Number(e.target.value))}
              className={rangeClass}
            />
          </div>
        </div>

        {/* Regla 3: Techo Máximo de Flete */}
        <div className={cardClass}>
          <div>
            <div className={cardHeaderClass}>
              <div className="flex items-center gap-compact">
                <div className="w-8 h-8 rounded-control bg-state-attention/15 text-state-attention flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-caption font-semibold text-primary">Tope de Flete sobre Valor de Compra</h3>
                  <span className={codeLabelClass}>POL-LOG-03</span>
                </div>
              </div>
              <span className="text-label font-semibold text-state-attention font-mono">{maxFreightPct}%</span>
            </div>

            <p className="text-caption text-secondary mt-compact leading-relaxed">
              Si el flete excede este porcentaje sobre el valor neto de la mercancía, el agente consolida o reprograma la ruta.
            </p>
          </div>

          <div className={wellClass}>
            <div className="flex justify-between text-caption font-mono text-secondary mb-hairline">
              <span>5%</span>
              <span className="text-primary font-semibold">{maxFreightPct}% Máximo</span>
              <span>25%</span>
            </div>
            <input
              type="range"
              min={5}
              max={25}
              step={1}
              value={maxFreightPct}
              onChange={(e) => setMaxFreightPct(Number(e.target.value))}
              className={rangeClass}
            />
          </div>
        </div>

        {/* Regla 4: Filtro de Calidad SLA de Proveedores */}
        <div className={cardClass}>
          <div>
            <div className={cardHeaderClass}>
              <div className="flex items-center gap-compact">
                <div className={iconBoxClass}>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-caption font-semibold text-primary">Score Mínimo para Órdenes Automáticas</h3>
                  <span className={codeLabelClass}>POL-PRV-04</span>
                </div>
              </div>
              <span className="text-label font-semibold text-primary font-mono">{minSupplierScore} pts</span>
            </div>

            <p className="text-caption text-secondary mt-compact leading-relaxed">
              Solo proveedores con puntaje superior a este umbral califican para generación directa de órdenes sin revisión previa.
            </p>
          </div>

          <div className={wellClass}>
            <div className="flex justify-between text-caption font-mono text-secondary mb-hairline">
              <span>70 pts</span>
              <span className="text-brand font-semibold">{minSupplierScore} Puntos Mínimos</span>
              <span>95 pts</span>
            </div>
            <input
              type="range"
              min={70}
              max={95}
              step={1}
              value={minSupplierScore}
              onChange={(e) => setMinSupplierScore(Number(e.target.value))}
              className={rangeClass}
            />
          </div>
        </div>
      </div>

      {/* FILA 3: PERMISOS DE EJECUCIÓN AUTÓNOMA */}
      <div className="bg-panel rounded-container p-base border border-border">
        <div className="flex items-center justify-between pb-compact mb-base border-b border-border">
          <div className="flex items-center gap-compact">
            <div className={iconBoxClass}>
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-label font-semibold text-primary">Permisos de Ejecución Autónoma</h3>
              <p className="text-caption text-secondary">
                Habilita o restringe las acciones que el agente puede ejecutar sin supervisión
              </p>
            </div>
          </div>
          <span className="text-caption font-mono px-hairline py-hairline rounded-pill bg-brand-surface text-brand border border-brand/20">
            {[autoRebalanceEnabled, strictHmacEnabled, autoSupplierSelection].filter(Boolean).length} de 3 activos
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-compact">
          {[
            {
              key: "rebalance",
              title: "Reequilibrio automático de stock",
              desc: "Transfiere unidades entre bodegas cuando la cobertura cae bajo el punto de reorden.",
              checked: autoRebalanceEnabled,
              onChange: setAutoRebalanceEnabled,
              icon: Boxes,
            },
            {
              key: "hmac",
              title: "Firma criptográfica estricta",
              desc: "Exige sello HMAC-SHA256 en toda orden emitida; bloquea registros sin firma válida.",
              checked: strictHmacEnabled,
              onChange: setStrictHmacEnabled,
              icon: Lock,
            },
            {
              key: "supplier",
              title: "Selección automática de proveedor",
              desc: "Permite al agente elegir proveedor homologado por mejor costo y SLA sin confirmación.",
              checked: autoSupplierSelection,
              onChange: setAutoSupplierSelection,
              icon: Sparkles,
            },
          ].map((perm) => {
            const Icon = perm.icon;
            return (
              <div
                key={perm.key}
                className={`rounded-control p-compact border transition-colors ${perm.checked
                  ? "bg-brand-surface border-brand/25"
                  : "bg-raised border-border"
                  }`}
              >
                <div className="flex items-start justify-between gap-compact">
                  <div className="flex items-center gap-hairline min-w-0">
                    <Icon
                      className={`w-3.5 h-3.5 shrink-0 ${perm.checked ? "text-brand" : "text-muted"
                        }`}
                    />
                    <span className="text-caption font-semibold text-primary leading-snug">
                      {perm.title}
                    </span>
                  </div>
                  <TactileSwitch
                    checked={perm.checked}
                    onChange={perm.onChange}
                    label={perm.title}
                  />
                </div>
                <p className="text-caption text-muted leading-relaxed mt-hairline">{perm.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Parámetros de activación */}
        <div className="bg-raised rounded-control p-base mt-base border border-border">
          <span className="text-caption font-mono text-muted block mb-compact">
            Parámetros de Activación
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-base">
            <div>
              <div className="flex items-center justify-between text-caption mb-hairline">
                <span className="text-secondary flex items-center gap-hairline">
                  <Clock className="w-3 h-3 text-brand" />
                  Ventana anti-duplicados
                </span>
                <span className="font-mono font-semibold text-primary tabular-numbers">
                  {duplicateWindowHours} h
                </span>
              </div>
              <input
                type="range"
                min={12}
                max={168}
                step={12}
                value={duplicateWindowHours}
                onChange={(e) => setDuplicateWindowHours(Number(e.target.value))}
                className={rangeClass}
              />
              <p className="text-caption text-muted mt-hairline">
                Bloquea órdenes repetidas al mismo proveedor dentro de este lapso.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between text-caption mb-hairline">
                <span className="text-secondary flex items-center gap-hairline">
                  <Percent className="w-3 h-3 text-brand" />
                  Tope de flete
                </span>
                <span className="font-mono font-semibold text-primary tabular-numbers">
                  {maxFreightPct}%
                </span>
              </div>
              <div className="flex items-center gap-hairline">
                <div className="flex-1 h-1.5 rounded-pill bg-raised overflow-hidden">
                  <div
                    className="h-full bg-brand rounded-pill transition-all"
                    style={{ width: `${(maxFreightPct / 25) * 100}%` }}
                  />
                </div>
                <span className="text-caption text-muted font-mono">máx 25%</span>
              </div>
              <p className="text-caption text-muted mt-hairline">
                Sobre el valor neto de la mercancía antes de consolidar la ruta.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
