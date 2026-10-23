import { useState, useEffect, useRef } from 'react';
import {
  Database,
  Server,
  Cloud,
  RefreshCw,
  Zap,
  Table as TableIcon,
  HardDrive,
  Activity,
  Layers,
  Building2,
  Factory,
  Cpu,
  Stethoscope,
  Truck,
  Upload,
  Sparkles,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { ECOSYSTEM_TEMPLATES, type EcosystemTemplate } from '../lib/ecosystemTemplates';

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
    fullUrl?: string | null;
    restUrl?: string | null;
    projectRef?: string | null;
    hasClient?: boolean;
  };
  error?: string;
}

interface TableSummary {
  name: string;
  columnCount: number;
  rowCount: number;
}

import type { UserSession } from './LoginView';

interface DatabaseManagerViewProps {
  currentUser?: UserSession | null;
}

export function DatabaseManagerView({ currentUser }: DatabaseManagerViewProps) {
  const companyId = currentUser?.companyId || 'comp_default';
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState<DbStatusData | null>(null);
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('products');
  const [tableRows, setTableRows] = useState<any[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [rowsPage, setRowsPage] = useState(1);


  // Gestión de Plantillas de Ecosistema y Carga de Base de Datos para Rol Empresa
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('manufactura');
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const customFileInputRef = useRef<HTMLInputElement>(null);

  const activeTemplate = ECOSYSTEM_TEMPLATES.find((t) => t.id === selectedTemplateId) || ECOSYSTEM_TEMPLATES[0];

  const handleApplyTemplate = async (tmpl: EcosystemTemplate) => {
    setApplyingTemplate(true);
    try {
      const sql = tmpl.getSql(companyId);
      const res = await api.uploadSql(companyId, sql, currentUser?.id);
      if (res.success) {
        toast.success(`Plantilla '${tmpl.name}' aplicada con éxito. ${res.realProductsCount || 5} productos sincronizados en PostgreSQL.`);
        await fetchDbState();
        if (selectedTable) {
          await loadTableRows(selectedTable);
        }
      } else {
        toast.error(`Error al aplicar plantilla: ${res.error}`);
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setApplyingTemplate(false);
    }
  };

  const handleCustomFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (!content) return;
      setApplyingTemplate(true);
      try {
        const res = await api.uploadSql(companyId, content, currentUser?.id);
        if (res.success) {
          toast.success(`Base de datos '${file.name}' cargada exitosamente.`);
          await fetchDbState();
          if (selectedTable) await loadTableRows(selectedTable);
        } else {
          toast.error(`Error al cargar archivo SQL: ${res.error}`);
        }
      } catch (err: any) {
        toast.error(`Fallo de importación: ${err.message}`);
      } finally {
        setApplyingTemplate(false);
      }
    };
    reader.readAsText(file);
  };

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
      setStatus(null);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDbState();
  }, []);

  const loadTableRows = async (tableName: string) => {
    setSelectedTable(tableName);
    setRowsPage(1);
    setLoadingRows(true);
    try {
      const res = await api.getDbTableRows(tableName);
      if (res.success) {
        setTableRows(res.data);
      }
    } catch (err: any) {
      setTableRows([]);
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
        </div>
      </div>

      {/* ─── ECOSISTEMA DE BASE DE DATOS DE LA EMPRESA (CARGA O PLANTILLAS REEMPLAZABLES) ─── */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#0D0F14] border border-white/10 shadow-lg relative overflow-hidden">
        {/* Glow de fondo tenue */}
        <div className="absolute top-0 right-0 w-96 h-40 bg-emerald-500/5 blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4 pb-4 border-b border-white/[0.08]">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Building2 className="w-4 h-4" />
              </span>
              <h2 className="text-sm font-semibold text-white tracking-tight font-headline">
                Ecosistema de Base de Datos de la Empresa
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                Rol: Empresa
              </span>
            </div>
            <p className="text-xs text-white/60 leading-relaxed max-w-2xl">
              Toda cuenta de Empresa debe contar con el catálogo e inventario de su ecosistema para permitir que Mint evalúe stock y automatice compras. Puedes cargar tu base de datos propia (<span className="text-emerald-400 font-mono">.sql / conexión</span>) o utilizar cualquiera de las siguientes <strong className="text-emerald-300 font-medium">plantillas reemplazables</strong> para operar de inmediato.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button
              type="button"
              onClick={() => customFileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs transition cursor-pointer font-medium active:scale-[0.98]"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cargar SQL Propio</span>
            </button>
            <input
              type="file"
              ref={customFileInputRef}
              accept=".sql,.txt"
              onChange={handleCustomFileUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Selector de 4 Plantillas Reemplazables */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {ECOSYSTEM_TEMPLATES.map((tmpl) => {
            const isSelected = selectedTemplateId === tmpl.id;
            const IconComponent =
              tmpl.id === 'manufactura' ? Factory :
              tmpl.id === 'tecnologia' ? Cpu :
              tmpl.id === 'salud' ? Stethoscope : Truck;

            return (
              <div
                key={tmpl.id}
                onClick={() => setSelectedTemplateId(tmpl.id)}
                className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between text-left relative ${
                  isSelected
                    ? 'bg-emerald-500/[0.08] border-emerald-500/40 text-white shadow-[0_0_20px_rgba(16,185,129,0.08)]'
                    : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] text-white/70'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-white/50'}`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    {isSelected && (
                      <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 font-semibold">
                        <Check className="w-3 h-3" /> Seleccionada
                      </span>
                    )}
                  </div>
                  <h3 className="text-xs font-semibold text-white truncate font-headline">{tmpl.name}</h3>
                  <span className="text-[10px] font-mono text-emerald-400/80 block mt-0.5 truncate">{tmpl.sector}</span>
                  <p className="text-[11px] text-white/50 mt-1.5 line-clamp-2 leading-relaxed">{tmpl.desc}</p>
                </div>

                <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-white/40 font-mono">
                  <span>5 SKUs activos</span>
                  <span className="text-emerald-400/70">Reemplazable</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Barra de Ejecución del Reemplazo */}
        {activeTemplate && (
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-xs font-medium text-white block truncate">
                  Plantilla seleccionada: <span className="text-emerald-300 font-semibold">{activeTemplate.name}</span>
                </span>
                <span className="text-[11px] text-white/40 block truncate">
                  Reemplazará el inventario actual con insumos de {activeTemplate.sector}
                </span>
              </div>
            </div>

            <button
              onClick={() => handleApplyTemplate(activeTemplate)}
              disabled={applyingTemplate}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs transition flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50 active:scale-[0.98]"
            >
              {applyingTemplate ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5 fill-current" />
              )}
              <span>{applyingTemplate ? 'Aplicando...' : 'Reemplazar con esta Plantilla'}</span>
            </button>
          </div>
        )}
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
                Servidor central gestionado por Mint
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
          <p className="text-xs text-white/40 mt-2 truncate">
            Tus datos se alojan de forma aislada por empresa.
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
                <p className="text-xs">Esta tabla no tiene registros aún. Carga tu SQL o una plantilla arriba.</p>
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
                    {tableRows.slice((rowsPage - 1) * 10, rowsPage * 10).map((row, idx) => (
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
            {tableRows.length > 10 && (
              <div className="pt-3 flex items-center justify-end gap-2 text-xs text-white/60">
                <button
                  type="button"
                  onClick={() => setRowsPage((p) => Math.max(1, p - 1))}
                  disabled={rowsPage === 1}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono">{rowsPage} / {Math.ceil(tableRows.length / 10)}</span>
                <button
                  type="button"
                  onClick={() => setRowsPage((p) => Math.min(Math.ceil(tableRows.length / 10), p + 1))}
                  disabled={rowsPage >= Math.ceil(tableRows.length / 10)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
