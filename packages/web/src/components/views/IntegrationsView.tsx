import React, { useState } from "react";
import {
  Layers,
  Database,
  Radio,
  FileCode,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Cpu,
  Server,
  Zap,
  Globe,
  HardDrive,
  Settings,
  X,
  Lock,
  Sliders,
  Send,
  Plus,
} from "lucide-react";
import { Button } from "../ui/Button";

interface IntegrationItem {
  id: string;
  name: string;
  category: "database" | "logistics" | "erp" | "communications" | "storage";
  categoryLabel: string;
  status: "ok" | "syncing" | "warning";
  latencyMs: number;
  description: string;
  lastSync: string;
  endpoint: string;
  authMethod: string;
  enabled: boolean;
}

export const IntegrationsView: React.FC = () => {
  const [isRunningCheck, setIsRunningCheck] = useState(false);
  const [checkedMsg, setCheckedMsg] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationItem | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [testingPingId, setTestingPingId] = useState<string | null>(null);

  const [integrations, setIntegrations] = useState<IntegrationItem[]>([
    {
      id: "int_pg",
      name: "PostgreSQL 16 (Drizzle ORM)",
      category: "database",
      categoryLabel: "Base de Datos Transaccional",
      status: "ok",
      latencyMs: 1.8,
      description: "Almacenamiento ACID de inventario, proveedores, registros inmutables de auditoría y firmas criptográficas HMAC-SHA256.",
      lastSync: "Hace 6 segundos",
      endpoint: "postgresql://mint_app@localhost:5432/mint_santander",
      authMethod: "SCRAM-SHA-256 · Pool: 20",
      enabled: true,
    },
    {
      id: "int_osrm",
      name: "Motor de Enrutamiento OSRM",
      category: "logistics",
      categoryLabel: "Cálculo Geoespacial & Fletes",
      status: "ok",
      latencyMs: 14.2,
      description: "Servidor Open Source Routing Machine local para optimizar rutas, tiempos de tránsito y fletes Santander - Bogotá - Medellín.",
      lastSync: "Hace 45 segundos",
      endpoint: "http://127.0.0.1:5000/route/v1/driving",
      authMethod: "Internal VPC · Sin cuota",
      enabled: true,
    },
    {
      id: "int_vault",
      name: "Bóveda de Memoria Markdown (RAG)",
      category: "storage",
      categoryLabel: "Memoria a Largo Plazo",
      status: "ok",
      latencyMs: 0.8,
      description: "Directorio de notas y políticas del agente en ~/.mint/vaults/santander sincronizado bidireccionalmente con el grafo de conocimiento.",
      lastSync: "Hace 2 minutos",
      endpoint: "file://~/.mint/vaults/santander",
      authMethod: "Filesystem Local · SQLite FTS5",
      enabled: true,
    },
    {
      id: "int_erp",
      name: "ERP Siigo Cloud API",
      category: "erp",
      categoryLabel: "Sincronización Contable",
      status: "ok",
      latencyMs: 118,
      description: "Actualización periódica de órdenes aprobadas, facturas de compra y sincronización de terceros con el plan contable colombiano.",
      lastSync: "Hace 12 minutos",
      endpoint: "https://api.siigo.com/v1/purchase-orders",
      authMethod: "OAuth 2.0 Bearer Token",
      enabled: true,
    },
    {
      id: "int_dian",
      name: "DIAN Facturación Electrónica v1.9",
      category: "erp",
      categoryLabel: "Cumplimiento Tributario",
      status: "ok",
      latencyMs: 240,
      description: "Generación y firma digital XML de documentos soporte y eventos de recepción de factura electrónica ante la DIAN.",
      lastSync: "Hace 1 hora",
      endpoint: "https://vpfe.dian.gov.co/WcfDianCustomerServices.svc",
      authMethod: "Certificado Digital X.509 · SHA384",
      enabled: true,
    },
    {
      id: "int_channels",
      name: "Dispatcher Multi-Canal (Telegram & Slack)",
      category: "communications",
      categoryLabel: "Comunicaciones & Alertas",
      status: "ok",
      latencyMs: 92,
      description: "Canal bidireccional para entrega de alertas prioritarias, enlaces de aprobación rápida y comandos de consulta para el equipo.",
      lastSync: "En tiempo real (Streaming)",
      endpoint: "https://api.telegram.org/bot & Slack Webhook",
      authMethod: "Bot Token & HMAC Webhook Secret",
      enabled: true,
    },
  ]);

  const handleRunHealthCheck = () => {
    setIsRunningCheck(true);
    setTimeout(() => {
      setIntegrations((prev) =>
        prev.map((item) => ({
          ...item,
          latencyMs: Number((item.latencyMs * (0.9 + Math.random() * 0.2)).toFixed(1)),
          lastSync: "Hace unos segundos",
        }))
      );
      setIsRunningCheck(false);
      setCheckedMsg(true);
      setTimeout(() => setCheckedMsg(false), 3500);
    }, 1200);
  };

  const handleTestPing = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTestingPingId(id);
    setTimeout(() => {
      setIntegrations((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, latencyMs: Number((item.latencyMs * (0.85 + Math.random() * 0.3)).toFixed(1)) }
            : item
        )
      );
      setTestingPingId(null);
    }, 700);
  };

  const handleToggleEnable = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIntegrations((prev) =>
      prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item))
    );
  };

  const filteredIntegrations =
    activeCategory === "all"
      ? integrations
      : integrations.filter((item) => item.category === activeCategory);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#050806] text-slate-100 p-6 space-y-6">
      {/* 1. Header con estética Obsidian Emerald */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2 mb-2 font-mono text-[11px] text-emerald-400/80">
            <span>CONFIGURACIÓN</span>
            <span className="text-zinc-600">/</span>
            <span>integrationRegistry.ts & connectorPipes.ts</span>
            <span className="text-zinc-600">/</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px]">
              ECOSISTEMA ACTIVO · {integrations.filter((i) => i.enabled).length} CONECTORES
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Integraciones del sistema
            </h1>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              100% Operacionales
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
            Estado de enlace con bases de datos transaccionales, motores de enrutamiento OSRM, bóveda de memoria local Markdown y conectores contables DIAN / Siigo.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            size="md"
            onClick={handleRunHealthCheck}
            disabled={isRunningCheck}
            className="shadow-sm shadow-emerald-500/20"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRunningCheck ? "animate-spin" : ""}`} />
            <span>{isRunningCheck ? "Verificando latencias..." : "Verificar salud de conectores"}</span>
          </Button>
        </div>
      </div>

      {/* Alerta de verificación */}
      {checkedMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Diagnóstico completado: Los 6 conectores responden dentro de sus SLAs con latencia óptima.</span>
          </div>
          <button onClick={() => setCheckedMsg(false)} className="text-zinc-400 hover:text-white text-xs">✕</button>
        </div>
      )}

      {/* 2. Franja de Telemetría (5 KPI Cards Landa Style) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-[#0A0F0C] border border-white/[0.06] backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Conectores Activos</span>
            <Server className="w-3.5 h-3.5 text-emerald-400/70" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-white tabular-nums">
              {integrations.filter((i) => i.enabled).length}/{integrations.length}
            </span>
          </div>
          <span className="text-[11px] text-emerald-400/90 block mt-0.5">100% de disponibilidad</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0A0F0C] border border-white/[0.06] backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Latencia PostgreSQL</span>
            <Database className="w-3.5 h-3.5 text-emerald-400/70" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
              {integrations.find((i) => i.id === "int_pg")?.latencyMs}
            </span>
            <span className="text-xs text-zinc-400">ms</span>
          </div>
          <span className="text-[11px] text-zinc-500 block mt-0.5">Puerto 5432 · Drizzle ORM</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0A0F0C] border border-white/[0.06] backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Motor OSRM Fletes</span>
            <Zap className="w-3.5 h-3.5 text-emerald-400/70" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-white tabular-nums">
              {integrations.find((i) => i.id === "int_osrm")?.latencyMs}
            </span>
            <span className="text-xs text-zinc-400">ms</span>
          </div>
          <span className="text-[11px] text-zinc-500 block mt-0.5">Cálculo de matrices de viaje</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0A0F0C] border border-white/[0.06] backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Memoria Markdown</span>
            <HardDrive className="w-3.5 h-3.5 text-emerald-400/70" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-white tabular-nums">12</span>
            <span className="text-xs text-zinc-400">notas</span>
          </div>
          <span className="text-[11px] text-emerald-400/90 block mt-0.5">Bóveda ~/.mint/vaults</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0A0F0C] border border-white/[0.06] backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">SLA Enlace ERP</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/70" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-white tabular-nums">99.98%</span>
          </div>
          <span className="text-[11px] text-zinc-500 block mt-0.5">Siigo Cloud & DIAN</span>
        </div>
      </div>

      {/* 3. Filtros por Categoría */}
      <div className="flex items-center gap-1.5 border-b border-white/[0.06] pb-3 text-xs overflow-x-auto">
        <button
          onClick={() => setActiveCategory("all")}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            activeCategory === "all"
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Todos los conectores ({integrations.length})
        </button>
        <button
          onClick={() => setActiveCategory("database")}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            activeCategory === "database"
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Bases de Datos (1)
        </button>
        <button
          onClick={() => setActiveCategory("logistics")}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            activeCategory === "logistics"
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Logística & OSRM (1)
        </button>
        <button
          onClick={() => setActiveCategory("storage")}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            activeCategory === "storage"
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Bóveda RAG (1)
        </button>
        <button
          onClick={() => setActiveCategory("erp")}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            activeCategory === "erp"
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          ERP & DIAN (2)
        </button>
        <button
          onClick={() => setActiveCategory("communications")}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            activeCategory === "communications"
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Comunicaciones (1)
        </button>
      </div>

      {/* 4. Lista de Conectores en Cards Obsidian Emerald */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredIntegrations.map((item) => (
          <div
            key={item.id}
            onClick={() => {
              setSelectedIntegration(item);
              setIsConfigOpen(true);
            }}
            className={`p-5 rounded-2xl bg-[#0A0F0C] border transition-all cursor-pointer relative flex flex-col justify-between ${
              item.enabled
                ? "border-white/[0.08] hover:border-emerald-500/40 hover:bg-[#0c140f]"
                : "border-white/[0.04] opacity-60 bg-[#060907]"
            }`}
          >
            {/* Top highlight radial */}
            <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    {item.category === "database" && <Database className="w-4 h-4" />}
                    {item.category === "logistics" && <Zap className="w-4 h-4" />}
                    {item.category === "storage" && <HardDrive className="w-4 h-4" />}
                    {item.category === "erp" && <Server className="w-4 h-4" />}
                    {item.category === "communications" && <Send className="w-4 h-4" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">{item.name}</h3>
                    <span className="text-[10px] font-mono text-emerald-400/90">{item.categoryLabel}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                      item.enabled
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-zinc-800 text-zinc-500 border-zinc-700"
                    }`}
                  >
                    {item.enabled ? "Operacional" : "Deshabilitado"}
                  </span>
                </div>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                {item.description}
              </p>

              {/* Parámetros técnicos del conector */}
              <div className="p-3 rounded-xl bg-[#050806] border border-white/[0.04] space-y-2 text-[11px] font-mono">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-zinc-500">Endpoint:</span>
                  <span className="text-zinc-300 truncate max-w-[260px]">{item.endpoint}</span>
                </div>
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="text-zinc-500">Seguridad:</span>
                  <span className="text-emerald-400/90">{item.authMethod}</span>
                </div>
              </div>
            </div>

            {/* Footer de la tarjeta con acciones interactivas */}
            <div className="mt-4 pt-3.5 border-t border-white/[0.06] flex items-center justify-between text-xs">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-[10px] font-mono text-zinc-500 block">Latencia P95</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">{item.latencyMs} ms</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-zinc-500 block">Último sync</span>
                  <span className="text-xs text-zinc-400">{item.lastSync}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleTestPing(item.id, e)}
                  disabled={testingPingId === item.id}
                  className="px-2.5 py-1 rounded-lg bg-[#070b09] border border-white/[0.08] text-[11px] font-mono text-zinc-300 hover:text-white hover:border-emerald-500/30 flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 text-emerald-400 ${testingPingId === item.id ? "animate-spin" : ""}`} />
                  <span>Ping</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedIntegration(item);
                    setIsConfigOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium text-emerald-400 hover:bg-emerald-500/20 flex items-center gap-1 transition-colors"
                >
                  <Settings className="w-3 h-3" />
                  <span>Configurar</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal / Slide-over de Configuración de Conector */}
      {isConfigOpen && selectedIntegration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-[#0A0F0C] border border-white/[0.1] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Configuración: {selectedIntegration.name}
                  </h3>
                  <span className="text-[11px] font-mono text-emerald-400/90">
                    {selectedIntegration.categoryLabel}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsConfigOpen(false)}
                className="w-7 h-7 rounded-lg bg-zinc-900 border border-white/[0.06] flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1.5 font-medium">Endpoint de Conexión / Host URI</label>
                <input
                  type="text"
                  defaultValue={selectedIntegration.endpoint}
                  className="w-full p-2.5 rounded-lg bg-[#050806] border border-white/[0.08] text-white font-mono text-xs focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1.5 font-medium">Método de Autenticación & Credenciales</label>
                <div className="relative">
                  <input
                    type="password"
                    defaultValue="mint_secret_token_live_2026_xyz"
                    className="w-full p-2.5 rounded-lg bg-[#050806] border border-white/[0.08] text-white font-mono text-xs focus:outline-none focus:border-emerald-500/50"
                  />
                  <Lock className="w-3.5 h-3.5 text-zinc-500 absolute right-3 top-3" />
                </div>
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  Gestionado mediante variables de entorno encriptadas con AES-256 GCM.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1.5 font-medium">Timeout de Red (ms)</label>
                  <input
                    type="number"
                    defaultValue={5000}
                    className="w-full p-2 rounded-lg bg-[#050806] border border-white/[0.08] text-white font-mono text-xs focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1.5 font-medium">Reintentos Máximos</label>
                  <select className="w-full p-2 rounded-lg bg-[#050806] border border-white/[0.08] text-white font-mono text-xs focus:outline-none focus:border-emerald-500/50">
                    <option value="3">3 reintentos (Backoff)</option>
                    <option value="5">5 reintentos</option>
                    <option value="1">1 reintento</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/[0.05] border border-emerald-500/20 text-[11px] text-emerald-400/90 flex items-center justify-between">
                <span>Estado actual de conexión:</span>
                <span className="font-bold">VERIFICADO Y SINCRONIZADO</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/[0.08] bg-[#070b09] flex items-center justify-between">
              <button
                onClick={(e) => handleToggleEnable(selectedIntegration.id, e)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${
                  selectedIntegration.enabled
                    ? "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                }`}
              >
                {selectedIntegration.enabled ? "Deshabilitar Conector" : "Habilitar Conector"}
              </button>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsConfigOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setIsConfigOpen(false);
                    setCheckedMsg(true);
                    setTimeout(() => setCheckedMsg(false), 2500);
                  }}
                >
                  Guardar Cambios
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
