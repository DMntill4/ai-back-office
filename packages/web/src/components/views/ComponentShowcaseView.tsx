import React, { useState } from "react";
import { Button } from "../ui/Button";
import { InputField } from "../ui/InputField";
import { SelectField } from "../ui/SelectField";
import { StatusBadge } from "../ui/StatusBadge";
import { ListRow } from "../ui/ListRow";
import { DataTable, TableColumn } from "../ui/DataTable";
import { ApprovalDialog } from "../ui/ApprovalDialog";
import { EmptyState } from "../ui/EmptyState";
import { AgentEventChip } from "../ui/AgentEventChip";
import { KpiStrip } from "../ui/KpiStrip";
import { MilestoneStepper } from "../ui/MilestoneStepper";
import { DataCard } from "../ui/DataCard";
import { AgentParticleOrb, AgentState } from "../ui/AgentParticleOrb";
import {
  Search,
  Plus,
  Play,
  RotateCcw,
  Package,
  Truck,
  CheckCircle2,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

interface SampleRow {
  sku: string;
  name: string;
  warehouse: string;
  stock: number;
  minStock: number;
  costCop: number;
  status: "ok" | "alerta" | "error";
}

export const ComponentShowcaseView: React.FC = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string>("row-1");
  const [agentTestState, setAgentTestState] = useState<AgentState>("pensando");

  const sampleData: SampleRow[] = [
    {
      sku: "SKU-DW201",
      name: "Rotomartillo SDS Plus 800W",
      warehouse: "Bucaramanga Centro",
      stock: 2,
      minStock: 10,
      costCop: 425000,
      status: "alerta",
    },
    {
      sku: "SKU-DC108",
      name: "Disco de corte abrasivo 4.5\"",
      warehouse: "Bogotá D.C. Fontibón",
      stock: 0,
      minStock: 50,
      costCop: 8200,
      status: "error",
    },
    {
      sku: "SKU-SD554",
      name: "Electrodo Soldadura 6013 1/8 (Caja)",
      warehouse: "Medellín Guayabal",
      stock: 45,
      minStock: 20,
      costCop: 145000,
      status: "ok",
    },
  ];

  const columns: TableColumn<SampleRow>[] = [
    {
      key: "sku",
      header: "SKU",
      render: (item) => (
        <span className="font-mono text-txt-secondary">{item.sku}</span>
      ),
    },
    {
      key: "name",
      header: "Producto",
      render: (item) => (
        <span className="font-medium text-txt-primary">{item.name}</span>
      ),
    },
    {
      key: "warehouse",
      header: "Sede",
      render: (item) => (
        <span className="text-txt-secondary">{item.warehouse}</span>
      ),
    },
    {
      key: "stock",
      header: "Stock",
      align: "right",
      render: (item) => (
        <span className="font-mono tabular-nums font-semibold">
          {item.stock} u
        </span>
      ),
    },
    {
      key: "minStock",
      header: "Mínimo ROP",
      align: "right",
      render: (item) => (
        <span className="font-mono tabular-nums text-txt-secondary">
          {item.minStock} u
        </span>
      ),
    },
    {
      key: "costCop",
      header: "Costo unitario",
      align: "right",
      render: (item) => (
        <span className="font-mono tabular-nums text-txt-primary">
          ${item.costCop.toLocaleString("es-CO")} COP
        </span>
      ),
    },
    {
      key: "status",
      header: "Condición",
      align: "center",
      render: (item) => <StatusBadge status={item.status} size="sm" />,
    },
  ];

  return (
    <div className="flex-1 h-full overflow-y-auto p-8 max-w-6xl mx-auto w-full space-y-12">
      {/* Page Header (Flowcraft Style: Bold Grotesque + Dramatic Contrast) */}
      <div className="border-b border-forest-border pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-card border border-brand/30 text-brand text-[11px] font-semibold mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
            DISEÑO OPERATIVO FLOWCRAFT ADAPTADO A MINT
          </span>
          <h1 className="text-3xl font-extrabold text-txt-primary tracking-tight">
            Sistema visual y componentes base
          </h1>
          <p className="text-xs text-txt-secondary mt-1 max-w-xl">
            Librería atómica de componentes: botones píldora, franja de KPIs sin tarjetas,
            chips de evento y la nube de puntos orgánica del agente.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={() => setIsDialogOpen(true)}
          >
            Revisar decisión
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsDialogOpen(true)}
          >
            Aprobar compra
          </Button>
        </div>
      </div>

      {/* SECCIÓN 1: FRANJA DE KPIS TÁCTIL (DONEZO & CHECKINOS DARK EMERALD) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-semibold text-txt-primary uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              1. Franja de KPIs Táctil (Donezo & CheckinOs Theme)
            </h2>
            <p className="text-[11px] text-txt-secondary mt-0.5">
              Tarjeta 0 con gradiente esmeralda estelar (<code className="text-emerald-400">bg-hero-emerald</code>) y botón de acción circular ↗; tarjetas 1..3 en superficie táctil elevada con íconos enmarcados.
            </p>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            4-Card Grid · 16px Radius
          </span>
        </div>

        <KpiStrip
          metrics={[
            {
              value: "$48.250.000",
              context: "Valor total inventario vigilado en 3 sedes",
              isHighlight: true,
            },
            {
              value: "11 SKUs",
              context: "Bajo punto de reorden en Bucaramanga y Bogotá",
            },
            {
              value: "2 órdenes",
              context: "Retenidas por superar umbral autónomo $5M COP",
            },
            {
              value: "$1.240.000",
              context: "Ahorro del mes por consolidación de fletes IA",
              isHighlight: true,
            },
          ]}
        />
      </section>

      {/* SECCIÓN 1.5: TRACKING DE ÓRDENES Y LOGÍSTICA (INVENTAR & FIKRI STORE MILESTONE STEPPER) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-semibold text-txt-primary uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              1.5 Tracking de Órdenes & Logística (Inventar & Fikri Store Stepper)
            </h2>
            <p className="text-[11px] text-txt-secondary mt-0.5">
              Nodos de 32x32px interconectados por barras de 4px con soporte para tramas diagonales (<code className="text-emerald-400">bg-hatched-emerald</code>), alertas de demora y estados completados.
            </p>
          </div>
          <span className="text-[11px] font-mono text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06]">
            MilestoneStepper.tsx
          </span>
        </div>

        <div className="space-y-3">
          {/* Tarjeta PO estilo Inventar #1: En tránsito con trama diagonal */}
          <div className="p-4 rounded-2xl bg-surface-1 border border-white/[0.06] shadow-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold text-emerald-400">PO-2026-0089</span>
                <span className="text-xs text-white font-medium">Disco Diamantado 7&apos; Concreto Industrial x30</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold text-white tabular-nums">$1.549.800 COP</span>
                <StatusBadge status="paid" />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-txt-secondary">
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                  F
                </span>
                <span>Ferreterías Unidas Bogotá S.A.S.</span>
                <span className="text-zinc-600">·</span>
                <span>Bodega Matriz Bucaramanga</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">Facturado & Criptoverificado</span>
            </div>

            {/* Stepper incrustado en contenedor Well */}
            <MilestoneStepper
              title="Orden en despacho logístico internacional"
              dateOrMeta="Salida: 29 Oct 10:18 AM · Estimada: 31 Oct"
              actionButton={
                <button className="flex items-center gap-1 hover:underline">
                  <span>Rastrear despacho</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              }
              steps={[
                { label: "Orden Emitida", timestamp: "Hoy, 10:18 AM", status: "completed" },
                { label: "Empaque & Picking", timestamp: "Hoy, 11:45 AM", status: "completed" },
                { label: "En Tránsito Fedex", timestamp: "En ruta (48 km)", status: "active" },
                { label: "Recibida en Bodega", timestamp: "Pendiente", status: "pending" },
              ]}
            />
          </div>

          {/* Tarjeta PO estilo Inventar #2: Demora / Alerta ROP */}
          <div className="p-4 rounded-2xl bg-surface-1 border border-white/[0.06] shadow-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold text-amber-400">PO-2026-0093</span>
                <span className="text-xs text-white font-medium">Taladro de Impacto Inalámbrico 20V x45</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold text-white tabular-nums">$21.546.000 COP</span>
                <StatusBadge status="pendiente" label="Aprobación HITL" />
              </div>
            </div>

            <MilestoneStepper
              title="Retenida por política de gobernanza (> $5M COP)"
              dateOrMeta="Regla GOV-03 · Requiere firma humana"
              steps={[
                { label: "Generada por IA", timestamp: "26 Oct", status: "completed" },
                { label: "Validación ROP", timestamp: "Aprobada", status: "completed" },
                { label: "Aprobación Humana", timestamp: "En espera", status: "warning" },
                { label: "Emisión a Bosch", timestamp: "Pendiente", status: "pending" },
              ]}
            />
          </div>
        </div>
      </section>

      {/* SECCIÓN 1.6: CONTENEDORES TÁCTILES Y SUPERFICIES MULTICAPA (SURFACE LEVEL 1 & WELL) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-semibold text-txt-primary uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              1.6 Superficies Multicapa (Surface Level 1 + Well Container)
            </h2>
            <p className="text-[11px] text-txt-secondary mt-0.5">
              Jerarquía táctil: Canvas (<code className="text-zinc-400">#0A0F0D</code>) &rarr; Surface Level 1 (<code className="text-emerald-400">#121A16</code>) &rarr; Surface Level 2 Well (<code className="text-emerald-300">#0B110E</code>).
            </p>
          </div>
          <span className="text-[11px] font-mono text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06]">
            DataCard.tsx
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DataCard
            title="Inventario de Alta Rotación"
            value="74 SKUs"
            context="Monitoreo continuo en Bodega Matriz Bucaramanga"
            trend={{ direction: "up", label: "+8.4% vs mes anterior" }}
            wellContent={
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-txt-secondary">Nivel de cumplimiento ROP:</span>
                  <span className="font-mono text-emerald-400 font-bold">96.2%</span>
                </div>
                <div className="h-2 rounded-full bg-[#19241F] overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full w-[96.2%]" />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-txt-tertiary pt-1">
                  <span>0 quiebres de stock</span>
                  <span>4 órdenes programadas</span>
                </div>
              </div>
            }
          />

          <DataCard
            title="Ahorro en Adquisiciones IA"
            value="$4.890.000"
            context="Descuentos negociados automáticamente con mayoristas"
            trend={{ direction: "up", label: "-12.5% vs costo base" }}
            isHero={true}
            wellContent={
              <div className="space-y-2 text-white/90">
                <div className="flex justify-between items-center text-xs">
                  <span>Volumen acumulado negociado:</span>
                  <span className="font-mono font-bold text-white">$42.8M COP</span>
                </div>
                <div className="h-2 rounded-full bg-black/30 overflow-hidden">
                  <div className="h-full bg-hatched-emerald rounded-full w-[78%]" />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-emerald-200/80 pt-1">
                  <span>7 proveedores activos</span>
                  <span>Playbook de descuentos activo</span>
                </div>
              </div>
            }
          />
        </div>
      </section>

      {/* SECCIÓN 2: PRESENCIA DEL AGENTE (PARTICLE CLOUD DE LA GUANÁBANA) */}
      <section className="space-y-4 p-6 rounded-2xl bg-forest-surface border border-forest-border relative overflow-hidden bg-forest-grid">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-txt-primary">
              2. Presencia del Agente (Nube de partículas orgánica)
            </h2>
            <p className="text-xs text-txt-secondary mt-0.5">
              130 partículas en Canvas 2D recreando la silueta de la guanábana. Se pausa cuando la ventana no está visible.
            </p>
          </div>

          {/* Selector interactivo de estado del agente */}
          <div className="flex items-center gap-1.5 p-1 rounded-full bg-forest-card border border-forest-border text-xs">
            {(["reposo", "leyendo", "pensando", "mutando"] as AgentState[]).map((st) => (
              <button
                key={st}
                onClick={() => setAgentTestState(st)}
                className={`px-3 py-1 rounded-full font-medium transition-colors capitalize ${
                  agentTestState === st
                    ? "bg-brand text-[#070B08] font-bold"
                    : "text-txt-secondary hover:text-txt-primary"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-8 py-4">
          <div className="p-4 rounded-full bg-forest-card/50 border border-forest-border shadow-agentGlow">
            <AgentParticleOrb size={170} state={agentTestState} />
          </div>

          <div className="space-y-2.5 max-w-sm">
            <h3 className="text-base font-bold text-txt-primary tracking-tight">
              Núcleo Autónomo en estado: <span className="text-brand capitalize">{agentTestState}</span>
            </h3>
            <p className="text-xs text-txt-secondary leading-relaxed">
              En reposo mantiene una deriva lenta; al leer datos sus partículas fluyen hacia la derecha; al procesar o auditar gira con pulsos armónicos sobre el inventario.
            </p>
            <div className="pt-2 flex items-center gap-2">
              <AgentEventChip
                action="Auditoría ROP finalizada"
                detail="74 SKUs"
                timeOrMetric="120ms"
              />
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN 3: CHIPS DE EVENTO DEL AGENTE (FLOWCRAFT PATTERN) */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-txt-primary">
          3. Chips de evento del agente (Patrón único de bitácora en vivo)
        </h2>
        <p className="text-xs text-txt-secondary">
          Estructura estandarizada: Píldora oscura + ícono de verificación en cápsula verde + acción + detalle técnico + tiempo.
        </p>

        <div className="flex flex-wrap gap-2.5">
          <AgentEventChip
            action="Orden de compra propuesta"
            detail="#OC-402 · DeWalt Colombia"
            timeOrMetric="Hace 2 min"
          />
          <AgentEventChip
            action="Punto de reorden alcanzado"
            detail="SKU-DW201 Rotomartillo SDS"
            timeOrMetric="Hace 6 min"
          />
          <AgentEventChip
            action="Flete consolidado con ahorro"
            detail="Mundial Tornillos · $740.000 COP"
            timeOrMetric="Hace 18 min"
          />
          <AgentEventChip
            action="Memoria persistida en vault"
            detail="politica-fletes-santander.md"
            timeOrMetric="Hace 35 min"
          />
        </div>
      </section>

      {/* SECCIÓN 4: BOTONES EN PÍLDORA Y FORMULARIOS */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-txt-primary">
          4. Botones en píldora y campos de alta densidad
        </h2>

        <div className="p-6 rounded-2xl bg-forest-card border border-forest-border space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" size="lg">
              Empezar auditoría
            </Button>
            <Button variant="primary" size="md">
              Aprobar orden
            </Button>
            <Button variant="secondary" size="md">
              Ver detalles de stock
            </Button>
            <Button variant="danger" size="md" showArrow={false}>
              Rechazar propuesta
            </Button>
            <Button variant="ghost" size="md" showArrow={false}>
              Cancelar
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-forest-border items-end">
            <InputField
              label="Búsqueda rápida en catálogo"
              placeholder="SKU, nombre o proveedor..."
              leftIcon={<Search className="w-3.5 h-3.5" />}
            />

            <SelectField
              label="Sede receptora"
              options={[
                { value: "wh_buc", label: "Bodega Matriz Bucaramanga" },
                { value: "wh_bog", label: "CD Bogotá D.C." },
                { value: "wh_med", label: "CD Medellín" },
              ]}
            />

            <div className="flex items-center gap-2">
              <Button variant="secondary" size="md">
                Restablecer
              </Button>
              <Button variant="primary" size="md">
                Consultar
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN 4.5: BADGES DE ESTADO TÁCTILES (INVENTAR & DONEZO STYLE) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-txt-primary flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            4.5 Insignias de Estado Táctiles con Punto Luminoso (StatusBadge.tsx)
          </h2>
          <span className="text-xs text-txt-secondary font-mono">Píldoras 10px con halo semántico</span>
        </div>

        <div className="p-4 rounded-2xl bg-surface-1 border border-white/[0.06] flex flex-wrap items-center gap-3">
          <StatusBadge status="paid" />
          <StatusBadge status="shipped" />
          <StatusBadge status="en_curso" />
          <StatusBadge status="ok" />
          <StatusBadge status="pendiente" />
          <StatusBadge status="alerta" />
          <StatusBadge status="error" />
        </div>
      </section>

      {/* SECCIÓN 5: TABLA DE DATOS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-txt-primary">
            5. Tabla de datos (Encabezados sobrios, números tabulares en mono)
          </h2>
          <span className="text-xs text-txt-tertiary">3 registros de muestra</span>
        </div>

        <DataTable
          columns={columns}
          data={sampleData}
          keyExtractor={(item) => item.sku}
        />
      </section>

      {/* SECCIÓN 6: FILAS DE LISTA (LIST ROW) */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-txt-primary">
          6. Filas de lista interactivas (Aprobaciones y trazabilidad)
        </h2>

        <div className="space-y-2">
          <ListRow
            title="Orden de compra #OC-402 — DeWalt Colombia"
            subtitle="Reponer 15 unidades de Rotomartillo SDS Plus para Bucaramanga Centro."
            meta="$6.375.000 COP"
            statusBadge={<StatusBadge status="pendiente" size="sm" />}
            selected={selectedRowId === "row-1"}
            onClick={() => setSelectedRowId("row-1")}
            actions={
              <Button
                variant="primary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDialogOpen(true);
                }}
              >
                Revisar
              </Button>
            }
          />

          <ListRow
            title="Nota de memoria: politica-fletes-santander.md"
            subtitle="Regla de consolidación de envíos en camión propio los días jueves."
            meta="28 Oct 2026"
            statusBadge={<StatusBadge status="ok" label="Verificada" size="sm" />}
            selected={selectedRowId === "row-2"}
            onClick={() => setSelectedRowId("row-2")}
          />
        </div>
      </section>

      {/* SECCIÓN 7: ESTADO VACÍO EN FONDO CUADRÍCULA */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-txt-primary">
          7. Estado vacío (Permitido fondo en cuadrícula sutil)
        </h2>

        <div className="rounded-2xl border border-forest-border p-2 bg-forest-grid">
          <EmptyState
            title="No hay compras por aprobar en este momento"
            description="El agente auditó los 74 SKUs de la ferretería hace 4 minutos. Todas las existencias se encuentran dentro del stock de seguridad."
            actionLabel="Forzar escaneo de existencias"
            onAction={() => alert("Escaneo manual solicitado.")}
          />
        </div>
      </section>

      {/* DIÁLOGO DE APROBACIÓN */}
      <ApprovalDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title="Aprobación de orden de compra"
        orderNumber="#OC-402"
        amountCop="$6.375.000 COP"
        supplier="DeWalt Colombia (Mayorista Homologado)"
        leadTime="3 días hábiles"
        destinationWarehouse="Bodega Matriz Bucaramanga"
        impactReason="El inventario actual de Rotomartillo SDS cayó a 2 unidades (por debajo del punto de reorden de 10 unidades). La demanda histórica proyecta quiebre total en 48 horas. Se consolidó flete con DeWalt aprovechando despacho hacia Santander."
        onApprove={() => {
          setIsDialogOpen(false);
          alert("Orden #OC-402 aprobada y registrada en PostgreSQL.");
        }}
        onReject={() => {
          setIsDialogOpen(false);
          alert("Propuesta rechazada. El agente evaluará transferencias entre bodegas.");
        }}
      />
    </div>
  );
};
