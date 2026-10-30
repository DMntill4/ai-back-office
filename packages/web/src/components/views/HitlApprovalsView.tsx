import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Package,
  Layers,
  ArrowUpRight,
  FileText,
  Copy,
  Check,
} from "lucide-react";

interface EnrichedProposal {
  id: string;
  orderNumber: string;
  title: string;
  sku: string;
  quantity: number;
  unitPriceCop: number;
  totalCostCop: number;
  amountFormatted: string;
  supplier: string;
  leadTime: string;
  policyTrigger: string;
  policyCode: string;
  explain: {
    context: string;
    opportunityCost: string;
  };
  diffImpact: {
    budgetBefore: string;
    budgetAfter: string;
    stockBefore: string;
    stockAfter: string;
    slaBefore: string;
    slaAfter: string;
  };
  hmacSignature: string;
  status: "pendiente" | "aprobado" | "rechazado";
  timeline: {
    title: string;
    time: string;
    description: string;
    completed: boolean;
  }[];
}

const DEFAULT_PROPOSALS: EnrichedProposal[] = [
  {
    id: "DEC-2026-0041",
    orderNumber: "#OC-402",
    title: "Orden de compra extraordinaria: 50u Sierra Circular 7-1/4' 1800W",
    sku: "SKU-SIE-IND18",
    quantity: 50,
    unitPriceCop: 145000,
    totalCostCop: 7250000,
    amountFormatted: "$7.250.000 COP",
    supplier: "DeWalt Colombia (Mayorista Homologado)",
    leadTime: "2 días hábiles",
    policyTrigger: "Monto total excede el umbral autónomo de $5.000.000 COP (POL-COMP-01)",
    policyCode: "POL-COMP-01",
    explain: {
      context: "El punto de reorden en Bucaramanga y Bogotá se alcanzó simultáneamente tras un incremento de demanda del 28% por proyectos de infraestructura vial.",
      opportunityCost: "Ahorro negociado de $1.450.000 COP por consolidación de lote frente a compras individuales.",
    },
    diffImpact: {
      budgetBefore: "$42.8M disponible",
      budgetAfter: "$35.5M restante",
      stockBefore: "4 unidades (Riesgo de quiebre en 2 días)",
      stockAfter: "54 unidades (Cobertura garantizada de 28 días)",
      slaBefore: "92% cumplimiento",
      slaAfter: "98% cobertura proyectada",
    },
    hmacSignature: "9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f",
    status: "pendiente",
    timeline: [
      {
        title: "Detección de Quiebre Crítico ROP",
        time: "Hoy, 08:14 a. m.",
        description: "Monitoreo continuo identificó stock por debajo del mínimo de seguridad.",
        completed: true,
      },
      {
        title: "Cotización Algorítmica & Consolidación",
        time: "Hoy, 08:20 a. m.",
        description: "Mejor oferta seleccionada con DeWalt Colombia con descuento por volumen.",
        completed: true,
      },
      {
        title: "Retención para Firma Ejecutiva",
        time: "Hoy, 08:22 a. m.",
        description: "Política POL-COMP-01: Requiere firma ejecutiva para montos > $5.000.000 COP.",
        completed: true,
      },
      {
        title: "Transmisión y Despacho ERP",
        time: "Pendiente de Autorización",
        description: "Emisión de remisión y actualización contable una vez firmada.",
        completed: false,
      },
    ],
  },
  {
    id: "DEC-2026-0042",
    orderNumber: "#OC-405",
    title: "Reabastecimiento preventivo: 1.200u Pernos Grado 8 1/2' x 3'",
    sku: "SKU-PER-HEX8",
    quantity: 1200,
    unitPriceCop: 2800,
    totalCostCop: 3360000,
    amountFormatted: "$3.360.000 COP",
    supplier: "Mundial de Tornillos S.A.S.",
    leadTime: "3 días hábiles",
    policyTrigger: "Suministro crítico para obras del Anillo Vial Metropolitano",
    policyCode: "POL-STK-04",
    explain: {
      context: "Consumo acelerado en CD Bucaramanga por entrega programada a consorcio vial.",
      opportunityCost: "Garantía de precio congelado por 60 días pactada con el proveedor.",
    },
    diffImpact: {
      budgetBefore: "$35.5M disponible",
      budgetAfter: "$32.1M restante",
      stockBefore: "12 unidades (Quiebre inminente)",
      stockAfter: "1.212 unidades (Cobertura de 45 días)",
      slaBefore: "88% cumplimiento",
      slaAfter: "99% cobertura",
    },
    hmacSignature: "8f7e6d5c4b3a291807162534435261708f7e6d5c4b3a29180716253443526170",
    status: "pendiente",
    timeline: [
      {
        title: "Consumo Proyectado",
        time: "Hoy, 07:45 a. m.",
        description: "Despacho masivo a obra redujo existencias bajo umbral crítico.",
        completed: true,
      },
      {
        title: "Propuesta de Orden de Compra",
        time: "Hoy, 07:50 a. m.",
        description: "Lote de 1.200 unidades cotizado con proveedor habitual.",
        completed: true,
      },
      {
        title: "Retención para Firma",
        time: "Hoy, 07:55 a. m.",
        description: "Requiere autorización ejecutiva para consolidación de lote.",
        completed: true,
      },
      {
        title: "Transmisión y Despacho ERP",
        time: "Pendiente",
        description: "Generación automática de orden de compra en ERP.",
        completed: false,
      },
    ],
  },
  {
    id: "DEC-2026-0043",
    orderNumber: "#OC-398",
    title: "Compra programada: 80u Disco de Corte Diamantado 4-1/2'",
    sku: "SKU-DIS-DIA04",
    quantity: 80,
    unitPriceCop: 22000,
    totalCostCop: 1760000,
    amountFormatted: "$1.760.000 COP",
    supplier: "Bosch Herramientas Colombia",
    leadTime: "1 día hábil",
    policyTrigger: "Reposición periódica bajo umbral autónomo",
    policyCode: "POL-AUTO-01",
    explain: {
      context: "Consumo ordinario de taller y pedidos recurrentes de clientes industriales.",
      opportunityCost: "Aprobada automáticamente por estar bajo el umbral de $5.000.000 COP.",
    },
    diffImpact: {
      budgetBefore: "$44.5M disponible",
      budgetAfter: "$42.8M restante",
      stockBefore: "18 unidades",
      stockAfter: "98 unidades (Cobertura de 30 días)",
      slaBefore: "95% cumplimiento",
      slaAfter: "99% cobertura",
    },
    hmacSignature: "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    status: "aprobado",
    timeline: [
      {
        title: "Evaluación ROP",
        time: "Ayer, 04:30 p. m.",
        description: "Existencias por debajo del mínimo de seguridad.",
        completed: true,
      },
      {
        title: "Firma Autónoma y Ejecución",
        time: "Ayer, 04:32 p. m.",
        description: "Orden transmitida a Bosch Colombia sin intervención manual.",
        completed: true,
      },
    ],
  },
];

interface HitlApprovalsViewProps {
  onNavigateTo?: (tabId: string) => void;
}

export const HitlApprovalsView: React.FC<HitlApprovalsViewProps> = () => {
  const [proposals, setProposals] = useState<EnrichedProposal[]>(DEFAULT_PROPOSALS);
  const [selectedId, setSelectedId] = useState<string>("DEC-2026-0041");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedHmac, setCopiedHmac] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      const q = searchQuery.toLowerCase();
      return (
        p.id.toLowerCase().includes(q) ||
        p.orderNumber.toLowerCase().includes(q) ||
        p.supplier.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q)
      );
    });
  }, [proposals, searchQuery]);

  const selectedProposal = useMemo(() => {
    return proposals.find((p) => p.id === selectedId) || proposals[0];
  }, [proposals, selectedId]);

  const handleApprove = (id: string) => {
    setProposals((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "aprobado" } : p))
    );
    showToast(`Orden autorizada con éxito: ${id} emitida a ERP.`);
  };

  const handleReject = (id: string) => {
    setProposals((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "rechazado" } : p))
    );
    showToast(`Propuesta rechazada: ${id} devuelta al agente para recotización.`);
  };

  const handleCopyHmac = () => {
    if (!selectedProposal) return;
    navigator.clipboard.writeText(selectedProposal.hmacSignature);
    setCopiedHmac(true);
    setTimeout(() => setCopiedHmac(false), 2000);
  };

  const pendingCount = proposals.filter((p) => p.status === "pendiente").length;

  return (
    <div className="flex-1 h-full flex flex-col bg-canvas text-primary font-sans overflow-hidden relative">
      {/* Notificación Toast Silenciosa */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-6 right-8 z-50 px-4 py-2.5 rounded-pill flex items-center gap-2.5 bg-panel border border-brand-lime text-primary shadow-dialog text-caption"
          >
            <span className="w-2 h-2 rounded-pill bg-brand-lime" />
            <span className="font-medium">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Superior Limpio */}
      <header className="px-8 py-4 bg-canvas border-b border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-20 shrink-0">
        <div>
          <div className="flex items-center gap-2 text-caption text-secondary">
            <span>Gobernanza</span>
            <span className="text-tertiary">/</span>
            <span className="text-primary font-medium">Bandeja de Aprobaciones</span>
          </div>
          <h1 className="text-display font-bold text-primary tracking-tight mt-0.5">
            Aprobaciones
          </h1>
          <p className="text-caption text-secondary mt-0.5">
            Supervisión ejecutiva y firma de decisiones de compra que exceden el umbral de autonomía
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-pill bg-panel border border-subtle text-caption text-secondary">
            <span className="w-2 h-2 rounded-pill bg-state-pending" />
            <span className="text-primary font-medium">{pendingCount} pendientes de firma</span>
          </div>
        </div>
      </header>

      {/* Layout de 2 Paneles: Bandeja Izquierda (38%) + Dossier Derecho (62%) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* PANEL IZQUIERDO (38%): Lista de Órdenes / Decisiones */}
        <aside className="w-full lg:w-[38%] h-full bg-panel border-b lg:border-b-0 lg:border-r border-subtle flex flex-col shrink-0">
          {/* Buscador de Órdenes */}
          <div className="p-4 border-b border-subtle">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrar por orden, proveedor o SKU..."
                className="w-full pl-9 pr-3 py-2 rounded-control bg-canvas border border-subtle focus:border-brand-lime text-caption text-primary placeholder:text-tertiary outline-none transition-colors"
              />
            </div>
          </div>

          {/* Lista Scrollable de Decisiones */}
          <div className="flex-1 overflow-y-auto divide-y divide-subtle">
            {filteredProposals.map((item) => {
              const isSelected = item.id === selectedProposal.id;
              const isPending = item.status === "pendiente";
              const isApproved = item.status === "aprobado";

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`p-4 transition-colors cursor-pointer border-l-2 ${
                    isSelected
                      ? "bg-elevated border-l-brand-lime"
                      : "hover:bg-elevated/50 border-l-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="font-mono text-caption text-primary font-semibold whitespace-nowrap">
                        {item.orderNumber}
                      </span>
                      <span className="text-tertiary">·</span>
                      <span className="font-mono text-caption text-secondary whitespace-nowrap">
                        {item.id}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isPending ? (
                        <span className="px-2 py-0.5 rounded-pill bg-state-pendingBg text-state-pending border border-state-pendingBorder text-caption font-medium flex items-center gap-1 whitespace-nowrap">
                          <span>◆</span> Pendiente
                        </span>
                      ) : isApproved ? (
                        <span className="px-2 py-0.5 rounded-pill bg-state-okBg text-state-ok border border-state-okBorder text-caption font-medium flex items-center gap-1 whitespace-nowrap">
                          <span>●</span> Aprobada
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-pill bg-state-errorBg text-state-error border border-state-errorBorder text-caption font-medium flex items-center gap-1 whitespace-nowrap">
                          <span>■</span> Rechazada
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-body font-semibold text-primary truncate">
                    {item.title}
                  </h3>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-subtle text-caption text-secondary">
                    <span className="truncate pr-2">{item.supplier}</span>
                    <span className="font-sans font-bold text-primary tabular-nums shrink-0">
                      {item.amountFormatted}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* PANEL DERECHO (62%): Dossier Ejecutivo & Firma */}
        <main className="flex-1 h-full bg-canvas overflow-y-auto p-8 space-y-6">
          {/* Fila 1: Cabecera del Dossier y Acciones Principales */}
          <div className="p-6 rounded-panel bg-panel border border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-subtitle font-bold text-primary whitespace-nowrap">
                  {selectedProposal.orderNumber}
                </span>
                <span className="text-tertiary">·</span>
                <span className="text-caption text-secondary font-medium whitespace-nowrap">
                  {selectedProposal.id}
                </span>
                <span className="text-tertiary">·</span>
                <span className="text-caption text-secondary whitespace-nowrap">
                  Tiempo de entrega: {selectedProposal.leadTime}
                </span>
              </div>
              <h2 className="text-title font-bold text-primary mt-1">
                {selectedProposal.title}
              </h2>
            </div>

            {/* Botones de Firma / Rechazo */}
            {selectedProposal.status === "pendiente" ? (
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => handleReject(selectedProposal.id)}
                  className="px-4 py-2 rounded-control bg-elevated hover:bg-elevated/70 text-caption font-medium text-secondary hover:text-state-error border border-subtle transition-colors cursor-pointer"
                >
                  Rechazar
                </button>

                {/* Botón Principal: Píldora Blanca Insignia */}
                <button
                  onClick={() => handleApprove(selectedProposal.id)}
                  className="pl-5 pr-2 py-2 rounded-pill bg-white hover:bg-zinc-100 text-canvas font-semibold text-caption flex items-center gap-2.5 transition-transform active:scale-[0.98] cursor-pointer group shadow-subtle"
                >
                  <span>Aprobar y Ejecutar</span>
                  <span className="w-6 h-6 rounded-pill bg-canvas text-white flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                    <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-pill bg-elevated text-caption font-medium text-primary border border-subtle">
                <CheckCircle2 className="w-4 h-4 text-state-ok" />
                <span>Decisión procesada en ERP</span>
              </div>
            )}
          </div>

          {/* Fila 2: Síntesis de Cifras Clave (Espaciado sin Cajas Ruidosas) */}
          <div className="p-6 rounded-panel bg-panel border border-subtle grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <span className="text-caption text-secondary block mb-1">Monto a Autorizar</span>
              <span className="text-title font-bold text-primary font-sans tabular-nums block">
                {selectedProposal.amountFormatted}
              </span>
              <span className="text-caption text-tertiary mt-0.5 block">
                {selectedProposal.quantity} unidades x ${(selectedProposal.unitPriceCop).toLocaleString("es-CO")} COP
              </span>
            </div>

            <div>
              <span className="text-caption text-secondary block mb-1">Ahorro Negociado</span>
              <span className="text-title font-bold text-state-ok font-sans tabular-nums block">
                +$1.450.000 COP
              </span>
              <span className="text-caption text-tertiary mt-0.5 block">
                8% de descuento por consolidación de lote
              </span>
            </div>

            <div>
              <span className="text-caption text-secondary block mb-1">Proveedor Homologado</span>
              <span className="text-body font-semibold text-primary block truncate">
                {selectedProposal.supplier}
              </span>
              <span className="text-caption text-state-ok font-medium mt-0.5 block">
                ● Calificación A+ (98% puntualidad)
              </span>
            </div>
          </div>

          {/* Fila 3: Justificación del Agente Autónomo */}
          <div className="p-6 rounded-panel bg-panel border border-subtle space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="w-4 h-4 text-brand-lime" />
              <h3 className="text-subtitle font-semibold">
                Justificación del Agente Autónomo
              </h3>
            </div>

            <p className="text-body text-secondary leading-relaxed">
              {selectedProposal.explain.context}
            </p>

            <div className="p-3.5 rounded-control bg-elevated border border-subtle text-caption text-secondary flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-brand-lime shrink-0 mt-0.5" />
              <div>
                <strong className="text-primary font-medium block">
                  Regla de Gobernanza Aplicada: {selectedProposal.policyCode}
                </strong>
                <span>{selectedProposal.policyTrigger}</span>
              </div>
            </div>
          </div>

          {/* Fila 4: Simulación de Impacto Operativo (Barras Planas y Sobrias) */}
          <div className="p-6 rounded-panel bg-panel border border-subtle space-y-4">
            <h3 className="text-subtitle font-semibold text-primary">
              Simulación de Impacto Operativo
            </h3>

            <div className="space-y-4 text-caption">
              {/* Presupuesto */}
              <div>
                <div className="flex justify-between text-secondary mb-1.5">
                  <span>Presupuesto Mensual de Compras</span>
                  <span className="text-primary font-medium font-sans">
                    {selectedProposal.diffImpact.budgetBefore} ➔ {selectedProposal.diffImpact.budgetAfter}
                  </span>
                </div>
                <div className="w-full h-2 rounded-pill bg-elevated overflow-hidden flex">
                  <div className="h-full bg-state-ok" style={{ width: "65%" }} />
                  <div className="h-full bg-brand-lime" style={{ width: "12%" }} />
                </div>
              </div>

              {/* Stock de Seguridad */}
              <div>
                <div className="flex justify-between text-secondary mb-1.5">
                  <span>Cobertura de Días de Inventario</span>
                  <span className="text-primary font-medium font-sans">
                    {selectedProposal.diffImpact.stockBefore} ➔ {selectedProposal.diffImpact.stockAfter}
                  </span>
                </div>
                <div className="w-full h-2 rounded-pill bg-elevated overflow-hidden flex">
                  <div className="h-full bg-state-attention" style={{ width: "10%" }} />
                  <div className="h-full bg-state-ok" style={{ width: "75%" }} />
                </div>
              </div>

              {/* SLA de Servicio */}
              <div>
                <div className="flex justify-between text-secondary mb-1.5">
                  <span>Cumplimiento de SLA a Obras</span>
                  <span className="text-primary font-medium font-sans">
                    {selectedProposal.diffImpact.slaBefore} ➔ {selectedProposal.diffImpact.slaAfter}
                  </span>
                </div>
                <div className="w-full h-2 rounded-pill bg-elevated overflow-hidden flex">
                  <div className="h-full bg-state-ok" style={{ width: "98%" }} />
                </div>
              </div>
            </div>
          </div>

          {/* Fila 5: Firma y Auditoría Criptográfica */}
          <div className="p-5 rounded-panel bg-panel border border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-caption">
            <div>
              <span className="text-secondary block">Firma Criptográfica HMAC-SHA256:</span>
              <span className="font-mono text-tertiary truncate max-w-md block mt-0.5">
                {selectedProposal.hmacSignature}
              </span>
            </div>

            <button
              onClick={handleCopyHmac}
              className="px-3.5 py-1.5 rounded-control bg-elevated hover:bg-elevated/70 text-primary border border-subtle flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
            >
              {copiedHmac ? (
                <>
                  <Check className="w-3.5 h-3.5 text-state-ok" />
                  <span>Copiada</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-secondary" />
                  <span>Copiar Firma</span>
                </>
              )}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};
