import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Shield,
  Lock,
  Sliders,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Save,
  HelpCircle,
  Truck,
  Boxes,
  Zap,
  Sparkles,
  RotateCcw,
  KeyRound,
  ShieldAlert,
  Percent,
  Calendar,
} from "lucide-react";
import { Button } from "../ui/Button";

export const PoliciesRulesView: React.FC = () => {
  const [hitlThreshold, setHitlThreshold] = useState<number>(5000000);
  const [safetyMultiplier, setSafetyMultiplier] = useState<number>(1.5);
  const [maxFreightPct, setMaxFreightPct] = useState<number>(14);
  const [duplicateWindowHours, setDuplicateWindowHours] = useState<number>(72);
  const [minSupplierScore, setMinSupplierScore] = useState<number>(85);
  const [autoRebalanceEnabled, setAutoRebalanceEnabled] = useState<boolean>(true);
  const [strictHmacEnabled, setStrictHmacEnabled] = useState<boolean>(true);
  const [autoSupplierSelection, setAutoSupplierSelection] = useState<boolean>(true);

  const [savedMsg, setSavedMsg] = useState(false);

  const handleSave = () => {
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 4000);
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
  };

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-[#050806] text-[#F9FAFB] font-sans select-none overflow-hidden">
      {/* 1. Header Bar Flowcraft */}
      <div className="flex-none px-6 py-4 border-b border-white/[0.06] bg-[#0A0F0C]/80 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#8E9893] font-medium">Gobernanza</span>
            <span className="text-white/20">/</span>
            <span className="text-[#10B981] font-semibold flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" />
              Límites y Guardrails Autónomos
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white mt-1 flex items-center gap-2.5">
            Reglas y Políticas Autónomas
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#10B981]/10 text-[#34D399] border border-[#10B981]/25">
              6 POLÍTICAS ACTIVAS
            </span>
          </h1>
          <p className="text-xs text-[#8E9893] mt-0.5">
            Definición de umbrales financieros, límites de intervención humana y reglas de seguridad operacional en PostgreSQL.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleReset}
            className="border-white/10 text-white hover:border-white/20 flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#8E9893]" />
            <span className="text-xs">Restablecer Defaults</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            className="flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="text-xs font-bold">Guardar Políticas</span>
            <span className="text-[10px] bg-black/30 px-1.5 py-0.2 rounded font-mono text-white/80">[G]</span>
          </Button>
        </div>
      </div>

      {/* Alerta de confirmación */}
      <AnimatePresence>
        {savedMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex-none px-6 py-2.5 bg-[#10B981]/15 border-b border-[#10B981]/30 text-[#34D399] text-xs flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
              <span className="font-medium">
                Políticas de gobernanza sincronizadas exitosamente en el esquema de base de datos de PostgreSQL con firma HMAC.
              </span>
            </div>
            <button onClick={() => setSavedMsg(false)} className="text-white/40 hover:text-white">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Franja de KPIs de Políticas */}
      <div className="flex-none px-6 py-3 border-b border-white/[0.06] bg-[#070B08]/90 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center text-[#34D399]">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-[#8E9893] uppercase tracking-wider font-semibold block">
              Umbral HITL Activo
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-extrabold font-mono text-white tabular-nums">
                ${(hitlThreshold / 1000000).toFixed(1)}M
              </span>
              <span className="text-[10px] text-[#34D399] font-mono">COP Límite</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-[#8E9893] uppercase tracking-wider font-semibold block">
              Factor Seguridad ROP
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-extrabold font-mono text-white tabular-nums">
                {safetyMultiplier}x
              </span>
              <span className="text-[10px] text-blue-400 font-mono">Demanda Q4</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center text-[#34D399]">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-[#8E9893] uppercase tracking-wider font-semibold block">
              Cumplimiento Guardrail
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-extrabold font-mono text-[#34D399] tabular-nums">100%</span>
              <span className="text-[10px] text-white/50 font-mono">0 quiebres ilícitos</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center text-[#34D399]">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-[#8E9893] uppercase tracking-wider font-semibold block">
              Seguridad Criptográfica
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-extrabold font-mono text-[#34D399] tabular-nums">Activo</span>
              <span className="text-[10px] text-white/50 font-mono">HMAC-SHA256</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Grid de Políticas (Bento Interactivo) */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-5 pb-8">
          {/* POL-01: Umbral Presupuestal Autónomo */}
          <div className="p-5 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] hover:border-[#10B981]/30 transition-colors space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#10B981]/15 text-[#34D399] flex items-center justify-center font-mono font-bold text-xs">
                  POL-01
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Umbral Presupuestal HITL
                  </h3>
                  <p className="text-[11px] text-[#8E9893]">
                    Compras superiores a este valor detienen la ejecución para firma obligatoria.
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30">
                ACTIVO
              </span>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#8E9893] font-medium">Monto Máximo Autónomo:</span>
                <span className="text-base font-extrabold font-mono text-[#34D399] tabular-nums">
                  ${hitlThreshold.toLocaleString("es-CO")} COP
                </span>
              </div>

              <input
                type="range"
                min="1000000"
                max="15000000"
                step="500000"
                value={hitlThreshold}
                onChange={(e) => setHitlThreshold(Number(e.target.value))}
                className="w-full accent-[#10B981]"
              />

              <div className="flex justify-between text-[10px] font-mono text-white/40">
                <span>$1.000.000 COP</span>
                <span>$5.000.000 COP (Recomendado)</span>
                <span>$15.000.000 COP</span>
              </div>

              <p className="text-[11px] text-[#8E9893] leading-relaxed pt-1 border-t border-white/[0.04]">
                Cualquier orden de compra consolidada igual o mayor a este límite será encolada en la bandeja de Fernando S.
              </p>
            </div>
          </div>

          {/* POL-02: Multiplicador de Stock de Seguridad */}
          <div className="p-5 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] hover:border-[#10B981]/30 transition-colors space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center font-mono font-bold text-xs">
                  POL-02
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Multiplicador de Stock de Seguridad
                  </h3>
                  <p className="text-[11px] text-[#8E9893]">
                    Ajuste dinámico sobre el ROP en temporadas de alta demanda o lluvia.
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                CALIBRADO
              </span>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#8E9893] font-medium">Factor de Cobertura Adicional:</span>
                <span className="text-base font-extrabold font-mono text-white tabular-nums">
                  {safetyMultiplier.toFixed(1)}x
                </span>
              </div>

              <input
                type="range"
                min="1.0"
                max="2.5"
                step="0.1"
                value={safetyMultiplier}
                onChange={(e) => setSafetyMultiplier(Number(e.target.value))}
                className="w-full accent-blue-500"
              />

              <div className="flex justify-between text-[10px] font-mono text-white/40">
                <span>1.0x (Estricto)</span>
                <span>1.5x (Santander Q4)</span>
                <span>2.5x (Conservador)</span>
              </div>

              <p className="text-[11px] text-[#8E9893] leading-relaxed pt-1 border-t border-white/[0.04]">
                Incrementa los días de cobertura en inventario para amortiguar cierres viales en Pescadero o Bogotá.
              </p>
            </div>
          </div>

          {/* POL-03: Rebalanceo Autónomo entre Bodegas */}
          <div className="p-5 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] hover:border-[#10B981]/30 transition-colors space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center font-mono font-bold text-xs">
                  POL-03
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Rebalanceo Inter-Sedes Autónomo
                  </h3>
                  <p className="text-[11px] text-[#8E9893]">
                    Transferir stock entre Bucaramanga, Bogotá y Girón si flete es óptimo.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRebalanceEnabled}
                  onChange={(e) => setAutoRebalanceEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#1A261E] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#10B981]" />
              </label>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#8E9893]">Tope Máximo de Flete Admitido:</span>
                <span className="font-mono text-sm font-bold text-white">{maxFreightPct}% del valor</span>
              </div>
              <input
                type="range"
                min="5"
                max="25"
                step="1"
                value={maxFreightPct}
                onChange={(e) => setMaxFreightPct(Number(e.target.value))}
                className="w-full accent-purple-500"
              />
              <p className="text-[11px] text-[#8E9893] leading-relaxed pt-1 border-t border-white/[0.04]">
                Si una sede tiene sobrestock y otra está bajo ROP, se autoriza traslado vehicular sin comprar externamente.
              </p>
            </div>
          </div>

          {/* POL-04: Detección de Órdenes Duplicadas */}
          <div className="p-5 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] hover:border-[#10B981]/30 transition-colors space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center font-mono font-bold text-xs">
                  POL-04
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Ventana Anti-Duplicados
                  </h3>
                  <p className="text-[11px] text-[#8E9893]">
                    Previene que el agente emita compras repetidas para el mismo SKU.
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                {duplicateWindowHours} HORAS
              </span>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#8E9893]">Ventana de Bloqueo Temporal:</span>
                <span className="font-mono text-sm font-bold text-white">{duplicateWindowHours} horas</span>
              </div>
              <input
                type="range"
                min="24"
                max="120"
                step="12"
                value={duplicateWindowHours}
                onChange={(e) => setDuplicateWindowHours(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
              <p className="text-[11px] text-[#8E9893] leading-relaxed pt-1 border-t border-white/[0.04]">
                Bloquea automáticamente órdenes secundarias hacia un mismo SKU si existe una orden en tránsito emitida recientemente.
              </p>
            </div>
          </div>

          {/* POL-05: Scoring Mínimo de Proveedores */}
          <div className="p-5 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] hover:border-[#10B981]/30 transition-colors space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#10B981]/15 text-[#34D399] flex items-center justify-center font-mono font-bold text-xs">
                  POL-05
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Score Mínimo de Homologación
                  </h3>
                  <p className="text-[11px] text-[#8E9893]">
                    Exige calidad y cumplimiento SLA contractual para compras directas.
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30">
                {minSupplierScore}/100 PTS
              </span>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#8E9893]">Puntaje Mínimo de Matriz:</span>
                <span className="font-mono text-sm font-bold text-[#34D399]">{minSupplierScore} puntos</span>
              </div>
              <input
                type="range"
                min="70"
                max="95"
                step="1"
                value={minSupplierScore}
                onChange={(e) => setMinSupplierScore(Number(e.target.value))}
                className="w-full accent-[#10B981]"
              />
              <p className="text-[11px] text-[#8E9893] leading-relaxed pt-1 border-t border-white/[0.04]">
                Proveedores con tasa de defectos mayor al 2% o demoras sistemáticas quedan descalificados del enrutador autónomo.
              </p>
            </div>
          </div>

          {/* POL-06: Firma Criptográfica Obligatoria */}
          <div className="p-5 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] hover:border-[#10B981]/30 transition-colors space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#10B981]/15 text-[#34D399] flex items-center justify-center font-mono font-bold text-xs">
                  POL-06
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Firma Criptográfica HMAC-SHA256
                  </h3>
                  <p className="text-[11px] text-[#8E9893]">
                    Inmutabilidad legal en ledger PostgreSQL para toda mutación.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={strictHmacEnabled}
                  onChange={(e) => setStrictHmacEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#1A261E] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#10B981]" />
              </label>
            </div>

            <div className="p-3 rounded-xl bg-[#0E1511] border border-white/[0.04] space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-[#8E9893]">
                <span>Firmante Primario:</span>
                <span className="text-white font-bold">Fernando S. (Admin)</span>
              </div>
              <div className="flex justify-between text-[#8E9893]">
                <span>Algoritmo:</span>
                <span className="text-[#34D399] font-bold">HMAC-SHA256 Secret Key</span>
              </div>
              <div className="flex justify-between text-[#8E9893]">
                <span>Tolerancia a Alteración:</span>
                <span className="text-white font-bold">0% (Invalida Comprobante)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
