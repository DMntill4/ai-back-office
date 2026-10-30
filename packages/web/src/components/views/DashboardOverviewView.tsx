import React from "react";
import { motion } from "motion/react";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Sparkles,
  ShieldAlert,
  ChevronRight,
  TrendingUp,
  Truck,
  FileCheck2,
} from "lucide-react";
import { GuanabanaParticleCore } from "../agent/GuanabanaParticleCore";

interface DashboardOverviewViewProps {
  onNavigateTo: (tabId: string) => void;
  onOpenApproval: () => void;
}

export const DashboardOverviewView: React.FC<DashboardOverviewViewProps> = ({
  onNavigateTo,
  onOpenApproval,
}) => {
  return (
    <div className="flex-1 h-full overflow-y-auto bg-canvas text-primary font-sans p-8 space-y-8">
      {/* 1. Header con Saludo y Resumen en Lenguaje Natural */}
      <header className="space-y-4 max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-caption text-secondary font-medium block">
              Centro de Operaciones & Abastecimiento
            </span>
            <h1 className="text-display font-bold text-primary tracking-tight mt-1">
              Buenos días, Fernando.
            </h1>
          </div>

          <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-pill bg-panel border border-subtle text-caption text-secondary">
            <Calendar className="w-3.5 h-3.5 text-brand-lime" />
            <span>Hoy, 29 de octubre de 2026</span>
          </div>
        </div>

        {/* Resumen del Día en Lenguaje Natural */}
        <p className="text-subtitle text-secondary leading-relaxed">
          Hoy el agente revisó <strong className="text-primary font-semibold">338 productos</strong> en 3 sedes físicas:{" "}
          <strong className="text-state-attention font-semibold">8 están bajo el punto de reorden</strong> y{" "}
          <strong className="text-state-pending font-semibold">2 compras necesitan tu firma</strong> para asegurar el abastecimiento de obra.
        </p>

        {/* Franja de Síntesis sin Tarjetas (Agrupamiento por Espacio y Tipografía) */}
        <div className="pt-2 flex flex-wrap items-center gap-x-8 gap-y-3 text-caption text-secondary">
          <div className="flex items-baseline gap-2">
            <span className="text-title font-bold text-primary font-sans tabular-nums">
              $482.5M COP
            </span>
            <span>capital activo en almacén</span>
            <span className="text-state-ok font-medium">(+6.4% mes)</span>
          </div>
          <span className="text-tertiary">·</span>
          <div className="flex items-baseline gap-2">
            <span className="text-title font-bold text-primary font-sans tabular-nums">
              98.4%
            </span>
            <span>salud del catálogo</span>
          </div>
          <span className="text-tertiary">·</span>
          <div className="flex items-baseline gap-2">
            <span className="text-title font-bold text-primary font-sans tabular-nums">
              3 sedes
            </span>
            <span>Bucaramanga, Bogotá y Medellín</span>
          </div>
        </div>
      </header>

      {/* 2. Layout Principal Asimétrico: Cola de Acción (70%) vs Presencia del Agente (30%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* COLUMNA IZQUIERDA (8 de 12 cols): Lo que requiere tu atención hoy */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-subtle">
            <div>
              <h2 className="text-title font-semibold text-primary">
                Lo que requiere tu atención hoy
              </h2>
              <p className="text-caption text-secondary mt-0.5">
                Acciones críticas ordenadas por urgencia operacional
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded-pill bg-elevated text-caption text-secondary border border-subtle">
              3 acciones prioritarias
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {/* ITEM 1: Aprobación Ejecutiva Crítica (Máxima Prioridad) */}
            <div className="p-5 rounded-panel bg-panel border border-subtle hover:border-bright transition-all space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-control bg-elevated flex items-center justify-center flex-shrink-0 mt-0.5 text-state-pending">
                    <span className="text-base font-bold">◆</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-caption font-mono font-medium text-primary whitespace-nowrap">
                        PO-24A190
                      </span>
                      <span className="text-caption text-tertiary">·</span>
                      <span className="text-caption text-secondary font-medium whitespace-nowrap">
                        Distribuciones Santander
                      </span>
                      <span className="px-2 py-0.5 rounded-pill bg-state-pendingBg text-state-pending border border-state-pendingBorder text-caption font-medium whitespace-nowrap">
                        Requiere tu firma
                      </span>
                    </div>
                    <h3 className="text-body font-semibold text-primary mt-1">
                      50x Rotomartillo Bosch SDS Plus (Reposición Crítica)
                    </h3>
                  </div>
                </div>

                <div className="text-right sm:flex-shrink-0">
                  <span className="text-title font-bold text-primary font-sans tabular-nums block">
                    $7.250.000 COP
                  </span>
                  <span className="text-caption text-state-ok font-medium block">
                    Ahorro negociado: $1.450.000 COP
                  </span>
                </div>
              </div>

              {/* Justificación del Agente en Bloque Hundido */}
              <div className="p-3.5 rounded-control bg-elevated border border-subtle text-caption text-secondary space-y-1">
                <div className="flex items-center gap-1.5 text-primary font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-brand-lime" />
                  <span>Justificación del Agente Autónomo</span>
                </div>
                <p className="leading-relaxed">
                  El stock en Bodega Matriz Bucaramanga cayó a 4 unidades y la cobertura se agotará en menos de 38 horas. El proveedor homologado garantiza entrega en 24h con un descuento del 8% por volumen.
                </p>
              </div>

              {/* Barra de Acciones: Píldora Blanca Insignia */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-caption text-tertiary">
                  Directiva GOV-03: Excede el umbral autónomo de $5.000.000 COP
                </span>

                <button
                  onClick={onOpenApproval}
                  className="pl-4 pr-1.5 py-1.5 rounded-pill bg-white hover:bg-zinc-100 text-canvas font-semibold text-caption flex items-center gap-2 transition-transform active:scale-[0.98] cursor-pointer group shadow-subtle flex-shrink-0"
                >
                  <span>Revisar y firmar</span>
                  <span className="w-6 h-6 rounded-pill bg-canvas text-white flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                    <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </span>
                </button>
              </div>
            </div>

            {/* ITEM 2: Advertencia de Rotura de Stock (Inventario) */}
            <div className="p-5 rounded-panel bg-panel border border-subtle hover:border-bright transition-all space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-control bg-elevated flex items-center justify-center flex-shrink-0 mt-0.5 text-state-attention">
                    <span className="text-base font-bold">▲</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-caption font-mono font-medium text-primary whitespace-nowrap">
                        SKU-ROT-001
                      </span>
                      <span className="text-caption text-tertiary">·</span>
                      <span className="text-caption text-secondary font-medium whitespace-nowrap">
                        Bodega Matriz Bucaramanga
                      </span>
                      <span className="px-2 py-0.5 rounded-pill bg-state-attentionBg text-state-attention border border-state-attentionBorder text-caption font-medium whitespace-nowrap">
                        Bajo punto de reorden
                      </span>
                    </div>
                    <h3 className="text-body font-semibold text-primary mt-1">
                      Existencia actual: 4 unidades (Mínimo de seguridad: 15)
                    </h3>
                  </div>
                </div>

                <button
                  onClick={() => onNavigateTo("inventario")}
                  className="px-3.5 py-1.5 rounded-control bg-elevated hover:bg-panel text-caption font-medium text-primary border border-subtle flex items-center gap-1.5 transition-colors cursor-pointer flex-shrink-0"
                >
                  <span>Simular rebalanceo</span>
                  <ArrowRight className="w-3.5 h-3.5 text-secondary" />
                </button>
              </div>

              <p className="text-caption text-secondary leading-relaxed pl-11">
                La tasa de demanda de esta semana es de 1.8 unidades diarias. Se proyecta quiebre en 2 días si no se autoriza la compra o se traslada excedente desde CD Fontibón (Bogotá).
              </p>
            </div>

            {/* ITEM 3: Registro en Cuarentena de Calidad */}
            <div className="p-5 rounded-panel bg-panel border border-subtle hover:border-bright transition-all space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-control bg-elevated flex items-center justify-center flex-shrink-0 mt-0.5 text-state-error">
                    <span className="text-base font-bold">■</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-caption font-mono font-medium text-primary whitespace-nowrap">
                        LOTE-GALV-04
                      </span>
                      <span className="text-caption text-tertiary">·</span>
                      <span className="text-caption text-secondary font-medium whitespace-nowrap">
                        Aceros del Oriente S.A.
                      </span>
                      <span className="px-2 py-0.5 rounded-pill bg-state-errorBg text-state-error border border-state-errorBorder text-caption font-medium whitespace-nowrap">
                        Retenido en cuarentena
                      </span>
                    </div>
                    <h3 className="text-body font-semibold text-primary mt-1">
                      Discrepancia técnica de espesor: Calibre 18 vs. Calibre 16 ordenado
                    </h3>
                  </div>
                </div>

                <button
                  onClick={() => onNavigateTo("inventario")}
                  className="px-3.5 py-1.5 rounded-control bg-elevated hover:bg-panel text-caption font-medium text-primary border border-subtle flex items-center gap-1.5 transition-colors cursor-pointer flex-shrink-0"
                >
                  <span>Ver ficha técnica</span>
                  <ArrowRight className="w-3.5 h-3.5 text-secondary" />
                </button>
              </div>

              <p className="text-caption text-secondary leading-relaxed pl-11">
                El lote recibido en Bucaramanga no cumple las especificaciones de carga para la obra Anillo Vial. Las órdenes automáticas con este proveedor quedan pausadas hasta resolución.
              </p>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA (4 de 12 cols): Presencia del Agente Autónomo */}
        <div className="lg:col-span-4 space-y-5">
          <div className="p-6 rounded-panel bg-panel border border-subtle space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-subtle">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-pill bg-state-ok" />
                <h3 className="text-title font-semibold text-primary">
                  Agente Autónomo
                </h3>
              </div>
              <span className="text-caption font-medium text-state-ok bg-state-okBg px-2.5 py-0.5 rounded-pill border border-state-okBorder">
                En línea
              </span>
            </div>

            {/* Presencia Viva de la Guanábana (Nube de Puntos Canvas 2D) */}
            <div className="flex flex-col items-center justify-center py-2">
              <GuanabanaParticleCore size={190} isWorking={true} pulseIntensity="calm" />
              <span className="text-caption text-secondary mt-1 font-medium">
                Vigilancia activa de existencias y logística
              </span>
            </div>

            {/* Parámetros Operativos en Lenguaje de Negocio */}
            <div className="space-y-2.5 pt-2 border-t border-subtle text-caption">
              <div className="flex items-center justify-between">
                <span className="text-secondary">Frecuencia de monitoreo</span>
                <span className="text-primary font-medium">Cada 30 minutos</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-secondary">Tiempo de respuesta</span>
                <span className="text-primary font-medium">142 ms (alta precisión)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-secondary">Autonomía de compra</span>
                <span className="text-primary font-medium">Hasta $5.000.000 COP</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-secondary">Última conciliación</span>
                <span className="text-primary font-medium">Hace 4 minutos</span>
              </div>
            </div>

            {/* Enlace al Flujo Completo */}
            <button
              onClick={() => onNavigateTo("agente")}
              className="w-full py-2.5 px-4 rounded-control bg-elevated hover:bg-elevated/80 text-primary font-medium text-caption flex items-center justify-between border border-subtle transition-colors cursor-pointer"
            >
              <span>Ver bitácora y flujo operativo</span>
              <ChevronRight className="w-4 h-4 text-secondary" />
            </button>
          </div>

          {/* Tarjeta de Respaldo: Sedes Físicas Conectadas */}
          <div className="p-5 rounded-panel bg-panel border border-subtle space-y-3">
            <h4 className="text-subtitle font-semibold text-primary">
              Sedes Físicas Conectadas
            </h4>
            <div className="space-y-2 text-caption">
              <div className="flex items-center justify-between p-2 rounded-control bg-elevated">
                <span className="text-primary font-medium">Bodega Matriz Bucaramanga</span>
                <span className="text-state-attention font-medium flex items-center gap-1">
                  <span>▲</span> 8 bajo ROP
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-control bg-elevated">
                <span className="text-primary font-medium">CD Fontibón (Bogotá D.C.)</span>
                <span className="text-state-ok font-medium flex items-center gap-1">
                  <span>●</span> Normal (64%)
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-control bg-elevated">
                <span className="text-primary font-medium">Hub Logístico Itagüí (Medellín)</span>
                <span className="text-state-ok font-medium flex items-center gap-1">
                  <span>●</span> Normal (82%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
