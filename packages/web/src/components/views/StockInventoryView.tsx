import React, { useState } from "react";
import { StockSkuItem } from "../../types/workflow";
import { INITIAL_STOCK_SKUS } from "../../data/mockData";
import {
  Boxes,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ArrowRightLeft,
  Truck,
  TrendingDown,
  Warehouse,
  ShieldAlert,
  ChevronRight,
  Info,
} from "lucide-react";

interface StockInventoryViewProps {
  onTriggerRebalance?: (sku: StockSkuItem) => void;
  onNavigateToInbox?: () => void;
}

export const StockInventoryView: React.FC<StockInventoryViewProps> = ({
  onTriggerRebalance,
  onNavigateToInbox,
}) => {
  const [skus, setSkus] = useState<StockSkuItem[]>(INITIAL_STOCK_SKUS);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [selectedSku, setSelectedSku] = useState<StockSkuItem | null>(skus[0] || null);
  const [transferSuccessMsg, setTransferSuccessMsg] = useState<string | null>(null);

  // Warehouse options
  const warehouses = [
    { id: "all", name: "Todas las Bodegas" },
    { id: "wh_bga", name: "Bodega Matriz Bucaramanga" },
    { id: "wh_bog", name: "CD Bogotá D.C." },
    { id: "wh_med", name: "CD Medellín" },
  ];

  // Filtering
  const filteredSkus = skus.filter((item) => {
    const matchesWarehouse =
      selectedWarehouse === "all" || item.warehouseId === selectedWarehouse;
    const matchesStatus =
      selectedStatus === "all" || item.status === selectedStatus;
    const matchesSearch =
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesWarehouse && matchesStatus && matchesSearch;
  });

  // KPI Calculations
  const criticalCount = skus.filter((s) => s.status === "quiebre").length;
  const alertCount = skus.filter((s) => s.status === "alerta").length;
  const optimalCount = skus.filter((s) => s.status === "optimo").length;
  const totalValueCop = skus.reduce(
    (sum, s) => sum + s.currentStock * s.unitPriceCop,
    0
  );

  const handleAuditRop = () => {
    setIsAuditing(true);
    setTimeout(() => {
      setIsAuditing(false);
    }, 1200);
  };

  const handleSimulateTransfer = (sku: StockSkuItem) => {
    setTransferSuccessMsg(
      `Propuesta de transferencia generada: 10 unidades de ${sku.sku} desde Bogotá hacia Bucaramanga. Ahorro de $740,000 COP en flete consolidado.`
    );
    setTimeout(() => setTransferSuccessMsg(null), 5000);
  };

  return (
    <div className="flex-1 h-full overflow-hidden flex flex-col bg-[#070c09] text-gray-100 select-none">
      {/* Top Header */}
      <div className="p-6 border-b border-[#14261c] bg-[#09120d] flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-mint-950 text-mint-400 border border-mint-500/30">
              <Boxes className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Control de Inventario & Bodegas
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#102418] text-mint-400 border border-[#1b3d27]">
              MINT STOCK
            </span>
          </div>
          <p className="text-xs text-gray-400">
            Monitoreo en tiempo real de Punto de Reorden (ROP), consumo diario, días de cobertura y rebalanceo interbodegas.
          </p>
        </div>

        {/* Audit Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleAuditRop}
            disabled={isAuditing}
            className="px-4 py-2 rounded-xl bg-[#112419] hover:bg-[#163323] text-mint-300 border border-[#214931] text-xs font-mono font-bold flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(34,197,94,0.12)] disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? "animate-spin text-mint-400" : ""}`} />
            <span>{isAuditing ? "Auditando ROP con PostgreSQL..." : "Auditar ROP (mint stock)"}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-6 pb-2 flex-shrink-0">
        <div className="p-4 rounded-xl bg-[#0c1510] border border-[#182c20]">
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block mb-1">
            En Quiebre Inminente
          </span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold font-mono text-red-400">{criticalCount} SKUs</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-800/60">
              Acción Inmediata
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0c1510] border border-[#182c20]">
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block mb-1">
            Bajo Punto Reorden (ROP)
          </span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold font-mono text-amber-400">{alertCount} SKUs</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/60">
              Reabastecimiento
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0c1510] border border-[#182c20]">
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block mb-1">
            Nivel Óptimo
          </span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold font-mono text-mint-300">{optimalCount} SKUs</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#102418] text-mint-400 border border-[#1b3d27]">
              Saludable
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0c1510] border border-[#182c20]">
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block mb-1">
            Valoración Total Inventario
          </span>
          <div className="flex items-center justify-between">
            <span className="text-base font-bold font-mono text-white">
              ${totalValueCop.toLocaleString("es-CO")} COP
            </span>
            <span className="text-[10px] font-mono text-gray-500">3 Bodegas</span>
          </div>
        </div>
      </div>

      {/* Success Notification Bar */}
      {transferSuccessMsg && (
        <div className="mx-6 p-3 rounded-xl bg-[#0e2417] border border-mint-500/40 text-xs font-mono text-mint-300 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-mint-400 flex-shrink-0" />
            <span>{transferSuccessMsg}</span>
          </div>
          {onNavigateToInbox && (
            <button
              onClick={onNavigateToInbox}
              className="px-2.5 py-1 rounded-lg bg-mint-500 text-black font-bold text-[11px] hover:bg-mint-400 transition-colors"
            >
              Ver en /inbox
            </button>
          )}
        </div>
      )}

      {/* Main Workspace (Split into List and Detail Inspector) */}
      <div className="flex-1 flex overflow-hidden p-6 pt-3 gap-4">
        {/* Left Column: Filters & SKU Table */}
        <div className="flex-1 flex flex-col bg-[#0a120d] border border-[#162a1f] rounded-2xl overflow-hidden">
          {/* Filter Bar */}
          <div className="p-3.5 border-b border-[#14261c] flex flex-wrap items-center justify-between gap-3 bg-[#08100c]">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar SKU, nombre o categoría..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#0c1510] border border-[#1b3425] text-xs text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-mint-500 font-mono"
              />
            </div>

            {/* Warehouse Filter */}
            <div className="flex items-center gap-2">
              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#0c1510] border border-[#1b3425] text-xs text-gray-300 focus:outline-none focus:border-mint-500 font-mono"
              >
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#0c1510] border border-[#1b3425] text-xs text-gray-300 focus:outline-none focus:border-mint-500 font-mono"
              >
                <option value="all">Todos los estados</option>
                <option value="quiebre">Quiebre Inminente</option>
                <option value="alerta">Bajo ROP</option>
                <option value="optimo">Óptimo</option>
              </select>
            </div>
          </div>

          {/* SKU Table List */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#14261c] bg-[#070e0a] text-gray-400 font-mono text-[10px] uppercase">
                  <th className="py-2.5 px-4 font-semibold">SKU & Producto</th>
                  <th className="py-2.5 px-4 font-semibold">Bodega</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Stock Actual</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Punto Reorden (ROP)</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Cobertura</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#122218]">
                {filteredSkus.map((item) => {
                  const isSelected = selectedSku?.id === item.id;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedSku(item)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-[#112419] border-l-2 border-l-mint-400"
                          : "hover:bg-[#0c1611]"
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-gray-200">
                          {item.sku}
                        </div>
                        <div className="text-[11px] text-gray-400 truncate max-w-xs">
                          {item.name}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-gray-300">
                        {item.warehouseName.replace("CD ", "").replace("Bodega Matriz ", "")}
                      </td>

                      <td className="py-3 px-4 text-center font-mono">
                        <span
                          className={`font-bold ${
                            item.status === "quiebre"
                              ? "text-red-400"
                              : item.status === "alerta"
                              ? "text-amber-300"
                              : "text-mint-300"
                          }`}
                        >
                          {item.currentStock} u
                        </span>
                        <span className="text-[10px] text-gray-500 block">
                          Seguridad: {item.safetyStock}u
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-mono text-[11px] text-gray-300">
                        {item.ropThreshold} u
                      </td>

                      <td className="py-3 px-4 text-center font-mono">
                        <span
                          className={`font-bold ${
                            item.coverageDays < 7 ? "text-red-400" : "text-gray-300"
                          }`}
                        >
                          {item.coverageDays.toFixed(1)} d
                        </span>
                        <span className="text-[10px] text-gray-500 block">
                          {item.dailyBurnRate} u/día
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span
                          className={`inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                            item.status === "quiebre"
                              ? "bg-red-950/70 text-red-300 border border-red-800/60"
                              : item.status === "alerta"
                              ? "bg-amber-950/70 text-amber-300 border border-amber-800/60"
                              : "bg-[#102418] text-mint-400 border border-[#1b3d27]"
                          }`}
                        >
                          {item.status === "quiebre"
                            ? "QUIEBRE"
                            : item.status === "alerta"
                            ? "BAJO ROP"
                            : "ÓPTIMO"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Mathematical ROP Inspector & Inter-warehouse Rebalancing */}
        {selectedSku && (
          <div className="w-80 bg-[#0a120d] border border-[#162a1f] rounded-2xl p-5 flex flex-col justify-between overflow-y-auto space-y-4">
            <div className="space-y-4">
              {/* Header */}
              <div className="space-y-1 pb-3 border-b border-[#14261c]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#102418] text-mint-300 border border-[#1b3d27]">
                    AUDITORÍA ROP
                  </span>
                  <span className="text-[11px] font-mono text-gray-400">
                    ID: {selectedSku.id}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white pt-1">{selectedSku.name}</h3>
                <p className="text-xs font-mono text-mint-400">{selectedSku.sku}</p>
              </div>

              {/* Formula & Parameters Breakdown */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">
                  Desglose Matemático Determinista
                </span>

                <div className="p-3 rounded-xl bg-[#070e0a] border border-[#14261c] font-mono text-xs space-y-2">
                  <div className="flex justify-between items-center text-gray-400">
                    <span>Stock Actual:</span>
                    <strong className="text-white">{selectedSku.currentStock} unidades</strong>
                  </div>
                  <div className="flex justify-between items-center text-gray-400">
                    <span>Stock Mínimo (ROP):</span>
                    <strong className="text-mint-300">{selectedSku.ropThreshold} unidades</strong>
                  </div>
                  <div className="flex justify-between items-center text-gray-400">
                    <span>Stock de Seguridad (SS):</span>
                    <strong className="text-gray-300">{selectedSku.safetyStock} unidades</strong>
                  </div>
                  <div className="flex justify-between items-center text-gray-400">
                    <span>Tasa de Consumo Diario:</span>
                    <strong className="text-gray-300">{selectedSku.dailyBurnRate} u/día</strong>
                  </div>
                  <div className="flex justify-between items-center text-gray-400">
                    <span>Días de Cobertura:</span>
                    <strong
                      className={
                        selectedSku.coverageDays < 7 ? "text-red-400 font-bold" : "text-gray-200"
                      }
                    >
                      {selectedSku.coverageDays.toFixed(1)} días
                    </strong>
                  </div>
                  <div className="flex justify-between items-center text-gray-400 pt-1 border-t border-[#14261c]">
                    <span>Costo Unitario:</span>
                    <strong className="text-mint-300">
                      ${selectedSku.unitPriceCop.toLocaleString("es-CO")} COP
                    </strong>
                  </div>
                </div>

                {/* Formula Explanation Callout */}
                <div className="p-2.5 rounded-xl bg-[#09150e] border border-[#162e20] text-[11px] font-mono text-mint-300/90 leading-relaxed">
                  <span className="text-gray-400 block mb-1 font-bold">Fórmula ROP de Mint:</span>
                  <code>ROP = (ConsumoDiario × LeadTime) + StockSeguridad</code>
                </div>
              </div>

              {/* Status Alert Detail */}
              {selectedSku.status !== "optimo" && (
                <div className="p-3 rounded-xl bg-[#24130c] border border-[#442314] text-xs font-mono text-amber-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Déficit Detectado: {selectedSku.ropThreshold - selectedSku.currentStock} unidades</span>
                  </div>
                  <p className="text-[11px] text-amber-300/80 leading-relaxed">
                    El inventario se agotará en {selectedSku.coverageDays.toFixed(1)} días al ritmo de consumo actual.
                  </p>
                </div>
              )}
            </div>

            {/* Actions for this SKU */}
            <div className="space-y-2 pt-3 border-t border-[#14261c]">
              <button
                onClick={() => handleSimulateTransfer(selectedSku)}
                className="w-full py-2.5 px-3 rounded-xl bg-[#112419] hover:bg-[#163323] border border-[#214931] text-mint-300 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_12px_rgba(34,197,94,0.1)] active:scale-95"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Simular Rebalanceo Interbodegas</span>
              </button>

              {onNavigateToInbox && (
                <button
                  onClick={onNavigateToInbox}
                  className="w-full py-2 px-3 rounded-xl bg-transparent hover:bg-[#0c1611] text-gray-400 hover:text-gray-200 text-xs font-mono flex items-center justify-center gap-1 transition-colors"
                >
                  <span>Revisar Órdenes de Compra</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
