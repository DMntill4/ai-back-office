import { useState, useEffect } from 'react';
import {
  Database,
  Server,
  Cloud,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Zap,
  Play,
  Table as TableIcon,
  HardDrive,
  Activity,
  Layers,
  Copy,
  Check,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { api } from '../lib/api';

interface DbStatusData {
  connected: boolean;
  provider: string;
  isSupabase: boolean;
  host: string;
  database: string;
  user: string;
  version: string;
  timestamp: string;
  latencyMs: number;
  tablesCount: number;
  tables: Array<{ name: string; count: number }>;
  supabaseApi: {
    isConfigured: boolean;
    url: string | null;
    hasServiceKey: boolean;
    hasAnonKey: boolean;
  };
  error?: string;
}

interface TableSummary {
  name: string;
  columnCount: number;
  rowCount: number;
}

export function DatabaseManagerView() {
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState<DbStatusData | null>(null);
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('products');
  const [tableRows, setTableRows] = useState<any[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [copied, setCopied] = useState(false);

  // Formulario de prueba de conexión
  const [customConn, setCustomConn] = useState('');
  const [testingConn, setTestingConn] = useState(false);
  const [connTestResult, setConnTestResult] = useState<any>(null);

  const fetchDbState = async () => {
    try {
      const [statusRes, tablesRes] = await Promise.all([
        api.getDbStatus(),
        api.getDbTables(),
      ]);

      if (statusRes.success) {
        setStatus(statusRes.data);
      }
      if (tablesRes.success) {
        setTables(tablesRes.tables);
      }
    } catch (err: any) {
      toast.error(`Error al conectar con la base de datos: ${err.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDbState();
  }, []);

  const loadTableRows = async (tableName: string) => {
    setSelectedTable(tableName);
    setLoadingRows(true);
    try {
      const res = await api.getDbTableRows(tableName);
      if (res.success) {
        setTableRows(res.data);
      }
    } catch (err: any) {
      toast.error(`Error al consultar tabla ${tableName}: ${err.message}`);
    } finally {
      setLoadingRows(false);
    }
  };

  useEffect(() => {
    if (selectedTable) {
      loadTableRows(selectedTable);
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDbState();
    if (selectedTable) {
      await loadTableRows(selectedTable);
    }
    toast.success('Estado de Drizzle y Supabase actualizado');
  };

  const handleTestConnection = async () => {
    if (!customConn.trim()) {
      toast.error('Ingresa una cadena de conexión válida de Supabase o PostgreSQL');
      return;
    }
    setTestingConn(true);
    setConnTestResult(null);
    try {
      const res = await api.testDbConnection(customConn.trim());
      setConnTestResult(res);
      if (res.success) {
        toast.success(`¡Conexión exitosa a ${res.database} (${res.latencyMs}ms)!`);
      } else {
        toast.error(`Fallo de conexión: ${res.error}`);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setTestingConn(false);
    }
  };

  const handleRunMigrate = async () => {
    try {
      const res = await api.runDbMigrate();
      if (res.success) {
        toast.success(res.message);
        fetchDbState();
      }
    } catch (err: any) {
      toast.error(`Error de migración: ${err.message}`);
    }
  };

  const handleRunSeed = async () => {
    try {
      const res = await api.runDbSeed();
      if (res.success) {
        toast.success(res.message);
        fetchDbState();
        if (selectedTable) loadTableRows(selectedTable);
      }
    } catch (err: any) {
      toast.error(`Error de siembra: ${err.message}`);
    }
  };

  const copyEnvSnippet = () => {
    const snippet = `# Supabase PostgreSQL Connection String
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres

# Supabase API Keys (Opcional)
SUPABASE_URL=https://[PROJECT_REF].supabase.co
SUPABASE_ANON_KEY=ey...
SUPABASE_SERVICE_ROLE_KEY=ey...`;
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    toast.success('Plantilla de configuración de Supabase copiada');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2 flex-wrap">
                Gestión de Base de Datos
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                  PostgreSQL / Supabase
                </span>
              </h1>
              <p className="text-xs text-white/50 mt-0.5">
                Conexión relacional 100% real, migraciones tipadas y administración multi-tenant en tiempo real.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs transition disabled:opacity-50 cursor-pointer active:scale-[0.98]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refrescar</span>
          </button>
          <button
            onClick={handleRunMigrate}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs transition cursor-pointer active:scale-[0.98]"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>db:migrate</span>
          </button>
          <button
            onClick={handleRunSeed}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs transition cursor-pointer active:scale-[0.98]"
          >
            <Play className="w-3.5 h-3.5" />
            <span>db:seed</span>
          </button>
        </div>
      </div>

      {/* Grid de Estado de Conexión */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Motor y Proveedor */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-white/40 font-mono uppercase tracking-wider">Proveedor Activo</span>
            {status?.connected ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Conectado
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-red-400 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                Desconectado
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              {status?.isSupabase ? <Cloud className="w-6 h-6" /> : <Server className="w-6 h-6" />}
            </div>
            <div>
              <p className="text-base font-semibold text-white">
                {status?.provider || 'Cargando...'}
              </p>
              <p className="text-xs text-white/50 font-mono">
                BD: {status?.database || 'ai_back_office'} • Usuario: {status?.user || 'postgres'}
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Telemetría y Latencia */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-white/40 font-mono uppercase tracking-wider">Latencia de Conexión</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-white">
              {status?.latencyMs ?? 0}
            </span>
            <span className="text-xs text-emerald-400 font-mono">ms (Round-trip)</span>
          </div>
          <p className="text-xs text-white/40 mt-2 truncate font-mono">
            Host: {status?.host || 'localhost:5432'}
          </p>
        </div>

        {/* Card 3: Tablas y Cobertura Drizzle */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-white/40 font-mono uppercase tracking-wider">Esquema Relacional</span>
            <Layers className="w-4 h-4 text-teal-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-white">
              {tables.length || status?.tablesCount || 0}
            </span>
            <span className="text-xs text-teal-400 font-mono">Tablas Físicas en PostgreSQL</span>
          </div>
          <p className="text-xs text-white/40 mt-2">
            Multi-tenant activado • Migraciones Drizzle en <span className="font-mono text-white/60">./src/db/migrations</span>
          </p>
        </div>
      </div>

      {/* Panel de Conexión con Supabase */}
      <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Cloud className="w-4 h-4 text-emerald-400" />
              Conectar Proyecto de Supabase
            </h2>
            <p className="text-xs text-white/50 mt-0.5">
              Ingresa la cadena de conexión de tu proyecto de Supabase (modo Session Pooler 5432 o Transaction Pooler 6543) para verificarla en vivo.
            </p>
          </div>
          <button
            onClick={copyEnvSnippet}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-xs transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            Copiar .env plantilla
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            placeholder="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"
            value={customConn}
            onChange={(e) => setCustomConn(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50"
          />
          <button
            onClick={handleTestConnection}
            disabled={testingConn || !customConn.trim()}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {testingConn ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5" />
            )}
            Probar Conexión
          </button>
        </div>

        {connTestResult && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-3 p-3 rounded-xl border text-xs flex items-center justify-between ${
              connTestResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {connTestResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>
                {connTestResult.success
                  ? `Conexión verificada: Base de datos '${connTestResult.database}' activa (Latencia: ${connTestResult.latencyMs}ms)`
                  : `Error: ${connTestResult.error}`}
              </span>
            </div>
            {connTestResult.success && (
              <span className="text-[11px] font-mono opacity-70">
                Pega esta URL en tu archivo .env en DATABASE_URL
              </span>
            )}
          </motion.div>
        )}
      </div>

      {/* Catálogo de Tablas Drizzle e Inspector de Filas */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Lista de Tablas */}
        <div className="lg:col-span-1 space-y-2">
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-xs font-semibold text-white/60 uppercase tracking-wider font-mono">
              Tablas Físicas ({tables.length})
            </span>
          </div>

          <div className="space-y-1.5 max-h-48 sm:max-h-60 lg:max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
            {tables.map((t) => (
              <button
                key={t.name}
                onClick={() => loadTableRows(t.name)}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition border cursor-pointer ${
                  selectedTable === t.name
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                    : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] text-white/80'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <TableIcon className="w-4 h-4 shrink-0 opacity-60" />
                  <span className="font-mono text-xs font-medium truncate">{t.name}</span>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-white/50 border border-white/5">
                  {t.rowCount} filas
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Vista previa de Filas Reales */}
        <div className="lg:col-span-3">
          <div className="p-3 sm:p-4 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl h-full flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                <h3 className="text-sm font-semibold text-white font-mono">
                  {selectedTable}
                </h3>
                <span className="text-xs text-white/40">
                  (Mostrando {tableRows.length} registros reales de PostgreSQL)
                </span>
              </div>
              <button
                onClick={() => loadTableRows(selectedTable)}
                disabled={loadingRows}
                className="text-xs text-white/50 hover:text-white flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
              >
                <RefreshCw className={`w-3 h-3 ${loadingRows ? 'animate-spin' : ''}`} />
                <span>Actualizar vista</span>
              </button>
            </div>

            {loadingRows ? (
              <div className="flex-1 flex items-center justify-center py-20 text-white/40 text-xs">
                <RefreshCw className="w-5 h-5 animate-spin mr-2 text-emerald-400" />
                Consultando tabla en PostgreSQL / Supabase...
              </div>
            ) : tableRows.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 text-center text-white/40">
                <HardDrive className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-xs">Esta tabla no tiene registros aún en la base de datos.</p>
                <button
                  onClick={handleRunSeed}
                  className="mt-3 text-xs text-emerald-400 hover:underline cursor-pointer"
                >
                  Sembrar datos de ejemplo con db:seed
                </button>
              </div>
            ) : (
              <div className="flex-1 overflow-x-auto max-h-[440px] overflow-y-auto custom-scrollbar rounded-xl border border-white/[0.04]">
                <table className="w-full min-w-[640px] text-left text-xs font-mono border-collapse">
                  <thead className="sticky top-0 z-10 bg-[#0B0D12]">
                    <tr className="border-b border-white/10 text-white/40 bg-[#0B0D12]">
                      {Object.keys(tableRows[0] || {}).map((col) => (
                        <th key={col} className="p-2.5 font-medium whitespace-nowrap bg-[#0B0D12]">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-white/5 hover:bg-white/[0.03] transition text-white/80"
                      >
                        {Object.keys(tableRows[0] || {}).map((col) => {
                          const val = row[col];
                          const display =
                            val === null
                              ? 'null'
                              : typeof val === 'object'
                              ? JSON.stringify(val)
                              : String(val);
                          return (
                            <td
                              key={col}
                              className={`p-2.5 truncate max-w-xs ${
                                val === null ? 'text-white/20 italic' : ''
                              }`}
                              title={display}
                            >
                              {display}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comandos y Flujo de Trabajo con Drizzle CLI */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/5 to-teal-500/5 border border-emerald-500/20 backdrop-blur-xl">
        <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-emerald-400" />
          Comandos Drizzle para Administrar la Base de Datos
        </h3>
        <p className="text-xs text-white/60 mb-4">
          Puedes ejecutar estos comandos directamente desde tu terminal para sincronizar o inspeccionar la base de datos en Supabase:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
          <div className="p-3 rounded-xl bg-black/40 border border-white/10">
            <span className="text-emerald-400 font-semibold">npm run db:push</span>
            <p className="text-[11px] text-white/50 mt-1 font-sans">
              Aplica cambios de esquemas de Drizzle directamente a Supabase sin archivos de migración manuales.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-black/40 border border-white/10">
            <span className="text-teal-400 font-semibold">npm run db:studio</span>
            <p className="text-[11px] text-white/50 mt-1 font-sans">
              Abre Drizzle Studio en el navegador para editar y visualizar todas las tablas de Supabase en UI.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-black/40 border border-white/10">
            <span className="text-indigo-400 font-semibold">npm run db:pull</span>
            <p className="text-[11px] text-white/50 mt-1 font-sans">
              Inspecciona tablas existentes creadas en Supabase Dashboard y genera el esquema TypeScript de Drizzle.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TerminalIcon(props: any) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}
