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
import { AgentParticleOrb, AgentState } from "../ui/AgentParticleOrb";
import {
  Search,
  Plus,
  Play,
  RotateCcw,
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
    <div className="p-8 max-w-6xl mx-auto w-full space-y-12">
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

      {/* SECCIÓN 1: FRANJA DE KPIS (FLOWCRAFT KPI STRIP SIN TARJETAS) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-txt-tertiary uppercase tracking-wider">
            1. Franja de KPIs (Sin tarjetas · Separadores de filete fino)
          </h2>
          <span className="text-[11px] text-txt-tertiary">
            Degradé lima-a-menta solo en cifras estelares
          </span>
        </div>

        <KpiStrip
          metrics={[
            {
              value: "$48.250.000",
              context: "Valor total del inventario vigilado en 3 sedes",
              isHighlight: true,
            },
            {
              value: "11 SKUs",
              context: "Bajo punto de reorden en Bucaramanga y Bogotá",
            },
            {
              value: "2 órdenes",
              context: "Retenidas por superar umbral autónomo de $5M COP",
            },
            {
              value: "$1.240.000",
              context: "Ahorro del mes por consolidación de fletes",
              isHighlight: true,
            },
          ]}
        />
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
