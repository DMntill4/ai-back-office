import React, { useState } from "react";
import {
  History,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ArrowUpRight,
  Search,
  GitBranch,
  ChevronRight,
  X,
  Copy,
  Terminal,
  Database,
  Calculator,
  Truck,
  Shield,
  KeyRound,
} from "lucide-react";

interface HistoryRecord {
  id: string;
  title: string;
  status: "escalado" | "resuelto" | "bloqueado";
  statusLabel: string;
  amountCop: string;
  supplier: string;
  date: string;
  tokens: number;
  cost: string;
  reason: string;
  thoughtTree?: {
    step: string;
    agent: string;
    action: string;
    detail: string;
    icon: string;
  }[];
}

export const HistoryView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCase, setSelectedCase] = useState<HistoryRecord | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const historyRecords: HistoryRecord[] = [
    {
      id: "case_99182_a",
      title: "Reabastecimiento Martillo Demoledor 1500W (9u)",
      status: "escalado",
      statusLabel: "ESCALADO A HITL",
      amountCop: "$3,780,000 COP",
      supplier: "Ferreterías Unidas Bogotá",
      date: "Hoy, 10:14",
      tokens: 2840,
      cost: "$0.0035 USD",
      reason: "Propuesta de compra formulada por $3,780,000 COP. Encolada en /inbox para aprobación.",
      thoughtTree: [
        {
          step: "1. Ingesta de Telemetría",
          agent: "PostgreSQL Connector",
          action: "SELECT stock, rop FROM inventory WHERE sku='SKU-MAN-SM400'",
          detail: "Detectado stock actual de 3 unidades frente a un ROP de 12 unidades (déficit crítico: 9 unidades).",
          icon: "database",
        },
        {
          step: "2. Auditoría ROP & Consumo",
          agent: "Especialista Inventario",
          action: "Cálculo ROP = (ConsumoDiario 0.8 × LeadTime 10d) + SafetyStock 4u",
          detail: "Cobertura residual estimada en 3.7 días. Se requiere reposición de lote económico por 9 unidades.",
          icon: "calculator",
        },
        {
          step: "3. Búsqueda y Cotización Proveedor",
          agent: "Especialista Compras",
          action: "Query a catálogo homologado: 'prov_herramientas_bogota'",
          detail: "Cotización unitaria de $420,000 COP. Total: $3,780,000 COP con lead time de 3 días.",
          icon: "truck",
        },
        {
          step: "4. Evaluación de Motor de Políticas",
          agent: "Policy Engine Guardrail",
          action: "evaluatePolicy(amount=3780000 COP, threshold=5000000 COP)",
          detail: "Monto inferior al tope de $5,000,000 COP, pero SKU catalogado como maquinaria pesada. Regla de negocio exige confirmación del operador.",
          icon: "shield",
        },
        {
          step: "5. Firma HMAC & Despacho a Bandeja",
          agent: "Mint Coordinator",
          action: "HMAC_SHA256(secret, payload) -> a7f93e18... encolado en /inbox",
          detail: "Caso persistido en tabla inmutable 'case_events'. Notificación despachada a canales.",
          icon: "key",
        },
      ],
    },
    {
      id: "case_99181_b",
      title: "Auditoría de Frescura y Drift en PostgreSQL",
      status: "resuelto",
      statusLabel: "RESUELTO",
      amountCop: "$0 COP",
      supplier: "N/A (Diagnóstico Interno)",
      date: "Hoy, 09:45",
      tokens: 1420,
      cost: "$0.0018 USD",
      reason: "15 tablas sincronizadas (< 1 hora). Esquema saludable y 154 SKUs validados.",
      thoughtTree: [
        {
          step: "1. Escaneo Drizzle ORM",
          agent: "Schema Auditor",
          action: "SELECT count(*) FROM information_schema.tables WHERE schema='public'",
          detail: "15 tablas mapeadas y sincronizadas. Latencia de conexión: 18ms.",
          icon: "database",
        },
        {
          step: "2. Verificación de Frescura",
          agent: "Mint Daemon",
          action: "Heartbeat de tablas transaccionales",
          detail: "Staleness promedio < 0.1 horas. Invariantes de datos íntegros.",
          icon: "shield",
        },
      ],
    },
    {
      id: "case_99178_c",
      title: "Rebalanceo de 15u Disco Diamantado 7'",
      status: "resuelto",
      statusLabel: "RESUELTO",
      amountCop: "$420,000 COP (Flete)",
      supplier: "Transferencia Bucaramanga -> Medellín",
      date: "Ayer, 16:30",
      tokens: 3950,
      cost: "$0.0049 USD",
      reason: "Rebalanceo ejecutado vía OSRM con ahorro neto de $1,280,000 COP frente a compra externa.",
      thoughtTree: [
        {
          step: "1. Detección de Asimetría de Stock",
          agent: "Especialista Logística",
          action: "Medellín stock: 5u (déficit) vs Bucaramanga stock: 68u (excedente)",
          detail: "Bucaramanga tiene 45 días de cobertura; Medellín tiene 3.1 días.",
          icon: "database",
        },
        {
          step: "2. Cotización Flete OSRM",
          agent: "Transport Solver",
          action: "Ruta Bucaramanga -> Medellín vía Pescadero",
          detail: "Costo logístico de $420,000 COP frente a compra nueva de $1,700,000 COP.",
          icon: "truck",
        },
        {
          step: "3. Ejecución de Traslado",
          agent: "Policy Engine",
          action: "Aprobado autónomamente por ahorro neto de $1,280,000 COP",
          detail: "Guía de despacho interbodegas generada.",
          icon: "shield",
        },
      ],
    },
    {
      id: "case_99175_d",
      title: "Propuesta Duplicada Bloqueada Determinísticamente",
      status: "bloqueado",
      statusLabel: "BLOQUEADO (REGLA 72H)",
      amountCop: "$6,200,000 COP",
      supplier: "Distribuidora Santander",
      date: "Ayer, 11:15",
      tokens: 1910,
      cost: "$0.0022 USD",
      reason: "RULE_DUPLICATE_ORDER_PREVENTION: Orden idéntica activa emitida en las últimas 72 horas.",
      thoughtTree: [
        {
          step: "1. Detección de Solicitud Repetida",
          agent: "Policy Guardrail",
          action: "Verificación de idempotencia en ventana temporal de 72 horas",
          detail: "Existe una orden idéntica PO-2026-0082 emitida hace 14 horas.",
          icon: "shield",
        },
        {
          step: "2. Bloqueo Inmediato",
          agent: "Circuit Breaker",
          action: "Operación abortada antes de emisión",
          detail: "Se previno duplicación de gasto presupuestal por $6,200,000 COP.",
          icon: "key",
        },
      ],
    },
  ];

  const filtered = historyRecords.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.supplier.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyCliCommand = (caseId: string) => {
    navigator.clipboard.writeText(`mint explain ${caseId}`);
    setCopiedId(caseId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const getStepIcon = (icon: string) => {
    switch (icon) {
      case "database":
        return <Database className="w-3.5 h-3.5 text-mint-400" />;
      case "calculator":
        return <Calculator className="w-3.5 h-3.5 text-cyan-400" />;
      case "truck":
        return <Truck className="w-3.5 h-3.5 text-amber-400" />;
      case "shield":
        return <Shield className="w-3.5 h-3.5 text-purple-400" />;
      case "key":
        return <KeyRound className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <GitBranch className="w-3.5 h-3.5 text-gray-400" />;
    }
  };

  return (
    <div className="flex-1 h-full overflow-hidden flex flex-col bg-[#070c09] text-gray-100 select-none">
      {/* Top Header */}
      <div className="p-6 border-b border-[#14261c] bg-[#09120d] flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-mint-950 text-mint-400 border border-mint-500/30">
              <History className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Auditoría & Trazabilidad
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#102418] text-mint-400 border border-[#1b3d27]">
              MINT EXPLAIN & AUDIT
            </span>
          </div>
          <p className="text-xs text-gray-400">
            Registro inmutable de casos, dictámenes emitidos, costos en COP y desglose del árbol de razonamiento (`mint explain`).
          </p>
        </div>

        {/* Search */}
        <div className="relative w-72">
          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por caso, SKU o proveedor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#0c1510] border border-[#1b3425] text-xs text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-mint-500 font-mono"
          />
        </div>
      </div>

      {/* Main Area: Split into Cases List and Thought Tree Inspector */}
      <div className="flex-1 flex overflow-hidden p-6 gap-4">
        {/* Left: Cases List */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {filtered.map((item) => {
            const isSelected = selectedCase?.id === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedCase(item)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                  isSelected
                    ? "bg-[#0d1e14] border-mint-500 shadow-[0_0_15px_rgba(34,197,94,0.12)]"
                    : "bg-[#0c1510] border-[#1b3425] hover:border-[#274f38]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        item.status === "resuelto"
                          ? "bg-mint-400"
                          : item.status === "escalado"
                          ? "bg-amber-400"
                          : "bg-red-400"
                      }`}
                    />
                    <h4 className="text-sm font-bold text-gray-100">{item.title}</h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#111f17] text-gray-300 border border-[#1b3425]">
                      {item.id}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        item.status === "resuelto"
                          ? "bg-[#0f2417] text-mint-400 border border-[#1b432a]"
                          : item.status === "escalado"
                          ? "bg-[#271e0c] text-amber-400 border border-[#443516]"
                          : "bg-[#271010] text-red-400 border border-[#441a1a]"
                      }`}
                    >
                      {item.statusLabel}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyCliCommand(item.id);
                      }}
                      title="Copiar comando CLI: mint explain <id>"
                      className="p-1 rounded-lg bg-[#070e0a] text-gray-500 hover:text-mint-400 border border-[#14261c] transition-colors"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-300 font-mono bg-[#080e0a] p-2.5 rounded-xl border border-[#15271d]">
                  {item.reason}
                </p>

                <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-gray-400 pt-1">
                  <div className="flex items-center gap-4">
                    <span>
                      Proveedor: <strong className="text-gray-200">{item.supplier}</strong>
                    </span>
                    <span>
                      Monto: <strong className="text-mint-300">{item.amountCop}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>{item.date}</span>
                    <span className="text-gray-600">•</span>
                    <span>
                      {item.tokens} tokens ({item.cost})
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Thought Tree Inspector (mint explain) */}
        {selectedCase ? (
          <div className="w-96 bg-[#0a120d] border border-[#162a1f] rounded-2xl p-5 flex flex-col justify-between overflow-y-auto space-y-4">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between pb-3 border-b border-[#14261c]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#102418] text-mint-400 border border-[#1b3d27]">
                      MINT EXPLAIN
                    </span>
                    <span className="text-[11px] font-mono text-gray-400">
                      Caso: {selectedCase.id}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white pt-1">
                    Árbol de Razonamiento del Agente
                  </h3>
                </div>

                <button
                  onClick={() => setSelectedCase(null)}
                  className="p-1 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-[#121f17]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* CLI Command Box */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#070e0a] border border-[#14261c] text-xs font-mono text-gray-300">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-mint-400" />
                  <code>mint explain {selectedCase.id}</code>
                </div>
                <button
                  onClick={() => handleCopyCliCommand(selectedCase.id)}
                  className="text-[10px] text-gray-500 hover:text-mint-400 transition-colors"
                >
                  {copiedId === selectedCase.id ? "Copiado!" : "Copiar"}
                </button>
              </div>

              {/* Thought Steps Sequence */}
              <div className="space-y-3 pt-1">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">
                  Pasos de Deducción Lógica:
                </span>

                <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#152a1e]">
                  {selectedCase.thoughtTree?.map((step, idx) => (
                    <div key={idx} className="relative pl-7 text-xs font-mono space-y-1">
                      {/* Step Marker Dot */}
                      <div className="absolute left-1.5 top-1 -translate-x-1/2 w-4 h-4 rounded-full bg-[#0a120d] border border-mint-500/50 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-mint-400" />
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-mint-300">
                          {step.step}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {step.agent}
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-[#070e0a] border border-[#14261c] text-[11px] text-gray-300 font-sans leading-relaxed">
                        <code className="text-[10px] text-gray-400 block font-mono mb-1">
                          {step.action}
                        </code>
                        <p>{step.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Summary */}
            <div className="pt-3 border-t border-[#14261c] text-[11px] font-mono text-gray-500 space-y-1">
              <p>• Invariante criptográfico firmado en PostgreSQL</p>
              <p>• Costo de tokens: {selectedCase.tokens} tokens ({selectedCase.cost})</p>
            </div>
          </div>
        ) : (
          <div className="w-80 bg-[#0a120d] border border-[#162a1f] rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-2 text-gray-500">
            <GitBranch className="w-8 h-8 text-gray-600" />
            <h4 className="text-xs font-bold text-gray-400">
              Selecciona un caso para inspeccionar
            </h4>
            <p className="text-[11px] font-mono">
              Haz clic en cualquier registro para visualizar el árbol de razonamiento completo (`mint explain`).
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
