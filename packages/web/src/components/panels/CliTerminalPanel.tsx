import React, { useState, useRef, useEffect } from "react";
import { Terminal, Send, Play, CornerDownLeft, Sparkles, Check, AlertCircle, ChevronUp, ChevronDown } from "lucide-react";
import { CliHistoryItem } from "../../types/workflow";

interface CliTerminalPanelProps {
  onExecuteCommand?: (cmd: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const CliTerminalPanel: React.FC<CliTerminalPanelProps> = ({
  onExecuteCommand,
  isExpanded = false,
  onToggleExpand,
}) => {
  const [inputCommand, setInputCommand] = useState("");
  const [history, setHistory] = useState<CliHistoryItem[]>([
    {
      id: "cli_1",
      type: "system",
      text: "[SISTEMA] Mint CLI Console v2.0 inicializado. Módulo de Diego conectado.",
      timestamp: "10:14:00",
    },
    {
      id: "cli_2",
      type: "system",
      text: "Conectado a PostgreSQL: Ferretería Industrial Santandereana (Bucaramanga, COP)",
      timestamp: "10:14:01",
    },
    {
      id: "cli_3",
      type: "command",
      text: "mint scan",
      timestamp: "10:14:02",
    },
    {
      id: "cli_4",
      type: "output",
      text: "[OK] Escaneo completado: 154 SKUs auditados. 2 bajo Punto de Reorden (ROP).\n• SKU-MAN-SM400 (Martillo Demoledor): Stock actual 3 (ROP 12) -> DÉFICIT: 9u\n• SKU-COR-DISC7 (Disco Diamantado 7'): Stock actual 8 (ROP 25) -> DÉFICIT: 17u\n[HITL] Propuesta de reabastecimiento encolada en /inbox (#dec_7f93a1c8)",
      timestamp: "10:14:05",
    },
  ]);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const handleRunCommand = (cmdText: string) => {
    const trimmed = cmdText.trim();
    if (!trimmed) return;

    const time = new Date().toLocaleTimeString("es-CO", { hour12: false });
    const userItem: CliHistoryItem = {
      id: `cli_${Date.now()}`,
      type: "command",
      text: trimmed,
      timestamp: time,
    };

    let responseText = "";
    const lower = trimmed.toLowerCase();

    if (lower.includes("scan")) {
      responseText = `[OK] Auditoría ejecutada: 154 SKUs verificados en PostgreSQL.\n• 2 SKUs bajo ROP dinámico.\n• Capacidad de bodegas Bucaramanga: 78% | Bogotá: 62% | Medellín: 85%.\n• Costo total estimado de reposición: $4,250,000 COP.`;
    } else if (lower.includes("stock")) {
      responseText = `[STOCK REAL] Consulta de catálogo activo:\n• SKU-MAN-SM400: 3u en Bucaramanga (Mín: 12u) -> ESTADO: CRÍTICO\n• SKU-TAL-IMP20: 45u en Bogotá (Mín: 15u) -> ESTADO: ÓPTIMO\n• SKU-COR-DISC7: 8u en Medellín (Mín: 25u) -> ESTADO: REORDEN`;
    } else if (lower.includes("approve") || lower.includes("aprobar")) {
      responseText = `[HITL APROBADO] Decisión #dec_7f93a1c8 aprobada formalmente por el operador.\n• Orden de compra emitida a Ferreterías Unidas Bogotá por $3,780,000 COP.\n• Guía generada: TRK-IN-BGA-9912. Firma criptográfica HMAC verificada.`;
    } else if (lower.includes("briefing") || lower.includes("hoy")) {
      responseText = `[BRIEFING OPERATIVO]\n• Fecha: ${new Date().toLocaleDateString("es-CO")}\n• Decisiones pendientes en /inbox: 1\n• Presupuesto ejercido este mes: $18,450,000 COP (Tope: $50,000,000 COP)\n• Ahorro por rebalanceo OSRM: $1,280,000 COP frente a compras externas.`;
    } else if (lower.includes("daemon") || lower.includes("status")) {
      responseText = `[DAEMON ACTIVO] Tick ejecutado cada 30s. Heartbeat OK.\n• Último ciclo: hace 12s.\n• Modo: Assisted (Gobernanza activa ≤ $5,000,000 COP).\n• Proveedores homologados: 6 activos.`;
    } else if (lower.includes("help") || lower.includes("ayuda")) {
      responseText = `[COMANDOS DISPONIBLES EN MINT CLI]:\n• mint scan      -> Audita existencias y ROP en todas las bodegas\n• mint stock     -> Consulta el inventario físico en PostgreSQL\n• mint approve   -> Aprueba propuestas pendientes en /inbox\n• mint briefing  -> Resumen ejecutivo y métricas de abastecimiento\n• mint daemon    -> Estado y métricas del motor continuo de fondo\n• clear          -> Limpia la pantalla de la terminal`;
    } else if (lower === "clear") {
      setHistory([]);
      setInputCommand("");
      return;
    } else {
      responseText = `[MINT CLI] Directiva recibida: "${trimmed}".\nDespachando análisis al Agente Autónomo Mint... [Ciclo ReAct completado con éxito]`;
    }

    const responseItem: CliHistoryItem = {
      id: `cli_${Date.now() + 1}`,
      type: "output",
      text: responseText,
      timestamp: time,
    };

    setHistory((prev) => [...prev, userItem, responseItem]);
    setInputCommand("");
    onExecuteCommand?.(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleRunCommand(inputCommand);
    }
  };

  if (!isExpanded) {
    return (
      <div
        onClick={onToggleExpand}
        className="h-11 px-4 bg-[#0a120d] border border-[#16271e] hover:border-[#223f2d] rounded-xl flex items-center justify-between cursor-pointer transition-all shadow-md group select-none"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-mint-400" />
            <span className="text-xs font-mono font-bold text-gray-200">
              Mint CLI
            </span>
          </div>
          <span className="text-gray-600 text-xs font-mono">•</span>
          <span className="text-xs font-mono text-gray-400 group-hover:text-gray-300">
            Click para desplegar terminal o presiona un comando
          </span>
        </div>

        {/* Quick Command Chips */}
        <div
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {["mint scan", "mint stock", "mint approve"].map((quickCmd) => (
            <button
              key={quickCmd}
              onClick={() => {
                onToggleExpand?.();
                setTimeout(() => handleRunCommand(quickCmd), 100);
              }}
              className="px-2 py-0.5 rounded bg-[#0f1b14] hover:bg-mint-500 hover:text-black text-gray-400 text-[11px] font-mono border border-[#1a3223] transition-colors"
            >
              {quickCmd}
            </button>
          ))}
          <button
            onClick={onToggleExpand}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#15281e] transition-colors ml-2"
            title="Expandir Terminal"
          >
            <ChevronUp className="w-4 h-4 text-mint-400" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#070c09] border border-[#16271e] rounded-2xl overflow-hidden shadow-2xl animate-in fade-in duration-150">
      {/* Panel Header */}
      <div className="h-10 px-4 bg-[#0a120d] border-b border-[#16271e] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-mint-400" />
          <span className="text-xs font-bold text-gray-200 tracking-wide font-mono">
            Mint Embedded CLI
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#102418] text-mint-400 border border-[#1b3d27]">
            CLI Module • Diego
          </span>
        </div>

        {/* Actions & Minimize Button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono">
            {["mint scan", "mint stock", "mint approve", "mint briefing"].map((quickCmd) => (
              <button
                key={quickCmd}
                onClick={() => handleRunCommand(quickCmd)}
                className="px-2 py-0.5 rounded bg-[#0f1b14] hover:bg-[#162c1f] text-gray-400 hover:text-mint-300 border border-[#1a3223] transition-colors"
              >
                {quickCmd}
              </button>
            ))}
          </div>

          <button
            onClick={onToggleExpand}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#15281e] transition-colors ml-1"
            title="Plegar Terminal"
          >
            <ChevronDown className="w-4 h-4 text-gray-400 hover:text-white" />
          </button>
        </div>
      </div>

      {/* Terminal Output Area */}
      <div className="flex-1 p-3 overflow-y-auto font-mono text-xs space-y-2 select-text">
        {history.map((item) => (
          <div key={item.id} className="leading-relaxed">
            {item.type === "command" && (
              <div className="flex items-center gap-2 text-mint-300 font-bold">
                <span className="text-gray-500 text-[10px]">{item.timestamp}</span>
                <span className="text-mint-500 font-bold">mint &gt;</span>
                <span>{item.text}</span>
              </div>
            )}
            {item.type === "output" && (
              <div className="pl-6 text-gray-300 whitespace-pre-line text-[11px] bg-[#09110c] p-2 rounded-lg border border-[#122319] mt-1">
                {item.text}
              </div>
            )}
            {item.type === "system" && (
              <div className="text-[11px] text-gray-400 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-mint-500"></span>
                <span>{item.text}</span>
              </div>
            )}
          </div>
        ))}
        <div ref={terminalEndRef} />
      </div>

      {/* Terminal Input Bar */}
      <div className="p-2.5 bg-[#09110c] border-t border-[#16271e] flex items-center gap-2">
        <span className="text-mint-400 font-mono text-xs font-bold pl-2 select-none">
          mint &gt;
        </span>
        <input
          type="text"
          value={inputCommand}
          onChange={(e) => setInputCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un comando o directiva (ej. mint scan, mint stock, help)..."
          className="flex-1 bg-transparent text-xs font-mono text-gray-100 placeholder:text-gray-600 focus:outline-none"
        />
        <button
          onClick={() => handleRunCommand(inputCommand)}
          className="p-1.5 rounded-lg bg-mint-500 hover:bg-mint-400 text-black transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
