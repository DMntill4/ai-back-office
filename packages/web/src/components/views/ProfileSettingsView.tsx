import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Save,
  RotateCcw,
  CheckCircle2,
  Lock,
  ShieldCheck,
  Database,
  UploadCloud,
  FileCode,
  FileUp,
  RefreshCw,
  Sparkles,
  Play,
  Layers,
  Boxes,
  Truck,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { InputField } from "../ui/InputField";
import { Button } from "../ui/Button";
import {
  useUserSettings,
  updateProfile,
  getInitials,
} from "../../hooks/useUserSettings";
import { api } from "../../services/apiClient";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ROLE_OPTIONS = [
  { value: "admin", label: "Administrador de Negocio" },
  { value: "owner", label: "Propietario / Dueño" },
  { value: "supervisor", label: "Supervisor de Operaciones" },
  { value: "operator", label: "Operador de Logística y Compras" },
  { value: "auditor", label: "Auditor de Riesgo y Decisiones" },
  { value: "finance", label: "Tesorería y Finanzas" },
  { value: "driver", label: "Conductor / Transportista" },
  { value: "viewer", label: "Solo Lectura (Auditor Externo)" },
] as const;

function resolveRoleValue(role: string): string {
  const r = (role || "").toLowerCase().trim();
  if (r.includes("admin")) return "admin";
  if (r.includes("prop") || r.includes("dueñ") || r.includes("owner")) return "owner";
  if (r.includes("superv")) return "supervisor";
  if (r.includes("oper")) return "operator";
  if (r.includes("audit")) return "auditor";
  if (r.includes("finan") || r.includes("tesor")) return "finance";
  if (r.includes("cond") || r.includes("driv") || r.includes("trans")) return "driver";
  if (r.includes("view") || r.includes("lect") || r.includes("consult")) return "viewer";
  return "admin";
}

const SAMPLE_SQL_TEMPLATE = `-- Catálogo Real de Ferretería Industrial Santandereana S.A.S.
CREATE TABLE IF NOT EXISTS productos (
  sku VARCHAR(50) PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  categoria VARCHAR(100),
  precio_unitario NUMERIC(12, 2),
  stock_inicial INT,
  stock_minimo INT
);

INSERT INTO productos (sku, nombre, categoria, precio_unitario, stock_inicial, stock_minimo) VALUES
  ('FERR-TAL-20V', 'Taladro Percutor Inalámbrico 20V Brushless', 'Herramientas Eléctricas', 485000.00, 18, 5),
  ('FERR-ESM-900', 'Esmeriladora Angular 4-1/2" 900W Industrial', 'Herramientas Eléctricas', 295000.00, 24, 6),
  ('FERR-DIS-MET', 'Disco de Corte Extra Fino para Metal 4-1/2" (Pack x25)', 'Consumibles y Abrasivos', 85000.00, 120, 25),
  ('FERR-SOL-200', 'Soldadora Inverter 200A Dual Voltage MMA/TIG', 'Equipos de Soldadura', 1250000.00, 8, 3),
  ('FERR-CMP-50L', 'Compresor de Aire Lubricado 50L 2.5HP Monofásico', 'Neumática y Compresores', 980000.00, 12, 4);

CREATE TABLE IF NOT EXISTS proveedores (
  nombre_empresa VARCHAR(255) PRIMARY KEY,
  contacto VARCHAR(150),
  email VARCHAR(150),
  telefono VARCHAR(50),
  ciudad VARCHAR(100)
);

INSERT INTO proveedores (nombre_empresa, contacto, email, telefono, ciudad) VALUES
  ('Herramientas y Maquinaria del Oriente S.A.S.', 'Carlos Mendoza', 'ventas@herramientasoriente.com', '+57 (607) 634-1122', 'Bucaramanga'),
  ('Distribuidora Técnica de Abrasivos Ltda.', 'Lucía Valencia', 'pedidos@tecnicabrasivos.com', '+57 (601) 745-8899', 'Bogotá D.C.');`;

/** Mi perfil: datos personales del usuario y configuración de base de datos SQL real (Requisito S3). */
export const ProfileSettingsView: React.FC = () => {
  const { profile } = useUserSettings();
  const [draft, setDraft] = useState(profile);
  const [saved, setSaved] = useState(false);

  // Estados del módulo de base de datos SQL
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [loadingDb, setLoadingDb] = useState(true);
  const [activeInputMode, setActiveInputMode] = useState<"file" | "editor">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sqlText, setSqlText] = useState("");
  const [replaceDemo, setReplaceDemo] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const errors = {
    fullName: draft.fullName.trim() ? "" : "El nombre es obligatorio.",
    email:
      draft.email.trim() && !EMAIL_RE.test(draft.email.trim())
        ? "Escribe un correo válido."
        : "",
  };
  const hasErrors = Boolean(errors.fullName || errors.email);
  const isDirty =
    draft.fullName.trim() !== profile.fullName.trim() ||
    draft.email.trim() !== profile.email.trim() ||
    draft.phone.trim() !== profile.phone.trim();

  const set = (key: keyof typeof draft) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setSaved(false);
    setDraft((d) => ({ ...d, [key]: e.target.value }));
  };

  const save = () => {
    if (hasErrors) return;
    updateProfile({
      fullName: draft.fullName.trim(),
      role: profile.role, // Protegido por gobernanza: un usuario no puede modificarse su propio rol
      email: draft.email.trim(),
      phone: draft.phone.trim(),
    });
    setSaved(true);
  };

  const activeRoleLabel =
    ROLE_OPTIONS.find((opt) => opt.value === resolveRoleValue(draft.role))?.label ??
    draft.role;

  // Carga del estado de la base de datos
  const loadDbStatus = useCallback(async () => {
    setLoadingDb(true);
    try {
      const res = await api.profile.getDatabaseStatus();
      if (res && res.data) {
        setDbStatus(res.data);
      }
    } catch {
      // Ignorar fallos de red
    } finally {
      setLoadingDb(false);
    }
  }, []);

  useEffect(() => {
    void loadDbStatus();
  }, [loadDbStatus]);

  // Manejo de archivo seleccionado
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith(".sql")) {
        setImportError("El archivo seleccionado debe tener extensión .sql");
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setImportError(null);
      setImportResult(null);
    }
  };

  // Ejecución de la ingesta vía archivo o script
  const handleProcessSql = async () => {
    setImporting(true);
    setImportError(null);
    setImportResult(null);

    try {
      let res: any;
      if (activeInputMode === "file") {
        if (!selectedFile) {
          setImportError("Por favor selecciona un archivo .sql antes de procesar.");
          setImporting(false);
          return;
        }
        res = await api.profile.uploadSqlFile(selectedFile, replaceDemo);
      } else {
        if (!sqlText.trim()) {
          setImportError("Por favor ingresa o pega el contenido del script SQL.");
          setImporting(false);
          return;
        }
        res = await api.profile.importSql({
          sqlContent: sqlText,
          replaceDemo,
          filename: "script_perfil_usuario.sql",
        });
      }

      if (res && res.success) {
        setImportResult(res.data);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        await loadDbStatus();
      } else {
        setImportError(res?.message || "No se pudo importar la base de datos.");
      }
    } catch (err: any) {
      setImportError(err?.message || "Error al procesar la base de datos SQL.");
    } finally {
      setImporting(false);
    }
  };

  const handleCleanDemoOnly = async () => {
    if (!window.confirm("¿Deseas purgar los registros simulados/demo y conservar exclusivamente tu catálogo real?")) {
      return;
    }
    setImporting(true);
    try {
      const res = await api.profile.cleanDemo();
      if (res && res.success) {
        setImportResult({ message: res.message, deletedDemoCount: res.deletedCount });
        await loadDbStatus();
      }
    } catch (err: any) {
      setImportError(err.message || "Error al purgar datos demo.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-group">
      {/* 1. FICHA PERSONAL DE USUARIO */}
      <div className="bg-panel rounded-container border border-border p-group">
        <div className="flex items-center gap-base pb-base border-b border-border">
          <div className="w-14 h-14 rounded-pill bg-raised border border-border flex items-center justify-center text-section-title font-bold text-brand font-mono">
            {getInitials(draft.fullName)}
          </div>
          <div className="min-w-0">
            <p className="text-body-large font-semibold text-primary truncate">
              {draft.fullName.trim() || "Sin nombre"}
            </p>
            <p className="text-caption text-secondary truncate">{activeRoleLabel || "Sin cargo"}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-base pt-base">
          <InputField
            label="Nombre completo"
            value={draft.fullName}
            onChange={set("fullName")}
            error={errors.fullName || undefined}
          />

          {/* Campo de rol protegido con opciones formales */}
          <div className="w-full space-y-hairline">
            <div className="flex items-center justify-between">
              <label htmlFor="user-profile-role" className="block text-label font-medium text-secondary">
                Cargo / Rol del Sistema
              </label>
              <span className="inline-flex items-center gap-1 text-caption text-secondary font-mono bg-raised px-2 py-0.5 rounded-pill border border-border">
                <Lock className="w-3 h-3 text-brand" /> Protegido
              </span>
            </div>

            <div className="relative flex items-center">
              <select
                id="user-profile-role"
                disabled
                value={resolveRoleValue(draft.role)}
                className="w-full h-9 px-3 pr-8 text-body bg-raised text-primary border border-strong rounded-control opacity-80 cursor-not-allowed focus:outline-none appearance-none"
                aria-readonly="true"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 pointer-events-none text-muted flex items-center">
                <ShieldCheck className="w-4 h-4 text-brand" />
              </div>
            </div>

            <p className="text-caption text-muted mt-1">
              Solo un Administrador puede autorizar y reasignar roles desde la sección de Equipo y Roles.
            </p>
          </div>

          <InputField
            label="Correo de contacto"
            type="email"
            value={draft.email}
            onChange={set("email")}
            error={errors.email || undefined}
            helperText="Se usa para avisos y firma de aprobaciones."
          />
          <InputField
            label="Teléfono"
            type="tel"
            value={draft.phone}
            onChange={set("phone")}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-compact pt-base mt-base border-t border-border">
          <span
            className={`flex items-center gap-1 text-caption ${
              saved ? "text-state-ok" : "text-muted"
            }`}
            role="status"
          >
            {saved ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" /> Perfil guardado.
              </>
            ) : isDirty ? (
              "Tienes cambios sin guardar."
            ) : (
              "Sin cambios."
            )}
          </span>
          <div className="flex items-center gap-compact">
            <Button
              variant="secondary"
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              disabled={!isDirty}
              onClick={() => {
                setDraft(profile);
                setSaved(false);
              }}
            >
              Descartar
            </Button>
            <Button
              icon={<Save className="w-3.5 h-3.5" />}
              disabled={!isDirty || hasErrors}
              onClick={save}
            >
              Guardar perfil
            </Button>
          </div>
        </div>
      </div>

      {/* 2. MÓDULO DE CONFIGURACIÓN DE BASE DE DATOS SQL (REQUISITO S3: DATOS REALES) */}
      <div className="bg-panel rounded-container border border-border p-group space-y-base">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-compact pb-base border-b border-border">
          <div className="flex items-start gap-compact">
            <div className="w-9 h-9 rounded-control bg-brand-surface text-brand flex items-center justify-center shrink-0 mt-0.5">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-compact">
                <h3 className="text-body-large font-semibold text-primary">
                  Base de Datos del Negocio (Catálogo Real S3)
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-caption font-mono bg-brand-surface text-brand border border-brand/30">
                  <ShieldCheck className="w-3 h-3" /> Datos Reales
                </span>
              </div>
              <p className="text-caption text-secondary mt-0.5">
                Carga tu base de datos mediante archivos o scripts SQL para operar exclusivamente con existencias y proveedores reales, dejando los datos simulados de lado.
              </p>
            </div>
          </div>

          <button
            onClick={() => void loadDbStatus()}
            disabled={loadingDb}
            className="px-compact py-hairline rounded-control border border-border hover:bg-raised text-caption text-secondary hover:text-primary font-mono flex items-center gap-hairline cursor-pointer shrink-0 disabled:opacity-50"
            title="Actualizar estado de la base de datos"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingDb ? "animate-spin" : ""}`} />
            <span>Consultar BD</span>
          </button>
        </div>

        {/* Resumen de Estado en PostgreSQL */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-compact">
          <div className="p-compact rounded-control bg-raised border border-border">
            <div className="flex items-center gap-1.5 text-caption text-muted">
              <Database className="w-3.5 h-3.5 text-brand" />
              <span>Motor Activo</span>
            </div>
            <p className="text-body font-bold text-primary mt-1 truncate">
              {dbStatus?.connectedEngine || "PostgreSQL 16"}
            </p>
            <span className="text-caption text-muted font-mono block truncate">
              BD: {dbStatus?.databaseName || "ai_back_office"}
            </span>
          </div>

          <div className="p-compact rounded-control bg-raised border border-border">
            <div className="flex items-center gap-1.5 text-caption text-muted">
              <Boxes className="w-3.5 h-3.5 text-brand" />
              <span>Referencias Físicas</span>
            </div>
            <p className="text-body font-bold text-primary mt-1">
              {dbStatus?.realProductsCount ?? dbStatus?.totalProducts ?? 0} <span className="text-caption font-normal text-brand font-mono">reales</span>
            </p>
            <span className="text-caption text-secondary font-mono block">
              {dbStatus?.totalStockUnits ? `${dbStatus.totalStockUnits.toLocaleString()} unidades` : "Sin existencias"}
            </span>
          </div>

          <div className="p-compact rounded-control bg-raised border border-border">
            <div className="flex items-center gap-1.5 text-caption text-muted">
              <Truck className="w-3.5 h-3.5 text-brand" />
              <span>Proveedores Reales</span>
            </div>
            <p className="text-body font-bold text-primary mt-1">
              {dbStatus?.realSuppliersCount ?? dbStatus?.totalSuppliers ?? 0} empresas
            </p>
            <span className="text-caption text-secondary font-mono block">Homologados en catálogo</span>
          </div>

          <div className="p-compact rounded-control bg-raised border border-border">
            <div className="flex items-center gap-1.5 text-caption text-muted">
              <Layers className="w-3.5 h-3.5 text-brand" />
              <span>Modo Operativo</span>
            </div>
            <p className="text-body font-bold text-primary mt-1">
              {dbStatus?.isCatalogRealOnly ? "100% Real (S3)" : "Catálogo Híbrido"}
            </p>
            <span className="text-caption text-secondary font-mono block truncate">
              {dbStatus?.demoProductsCount > 0 ? `${dbStatus.demoProductsCount} demo detectados` : "Cero simulaciones"}
            </span>
          </div>
        </div>

        {/* Pestañas de método de carga: Archivo .SQL vs Editor SQL */}
        <div className="space-y-compact pt-compact">
          <div className="flex items-center gap-compact border-b border-border pb-2">
            <button
              onClick={() => setActiveInputMode("file")}
              className={`px-base py-1.5 rounded-control text-label font-medium transition-colors cursor-pointer flex items-center gap-2 ${
                activeInputMode === "file"
                  ? "bg-brand text-canvas font-semibold"
                  : "bg-raised text-secondary hover:text-primary border border-border"
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>Cargar Archivo .SQL</span>
            </button>

            <button
              onClick={() => setActiveInputMode("editor")}
              className={`px-base py-1.5 rounded-control text-label font-medium transition-colors cursor-pointer flex items-center gap-2 ${
                activeInputMode === "editor"
                  ? "bg-brand text-canvas font-semibold"
                  : "bg-raised text-secondary hover:text-primary border border-border"
              }`}
            >
              <FileCode className="w-4 h-4" />
              <span>Pegar Script / DDL SQL</span>
            </button>

            {dbStatus?.demoProductsCount > 0 && (
              <button
                onClick={handleCleanDemoOnly}
                disabled={importing}
                className="ml-auto px-compact py-1 rounded-control text-caption font-mono text-state-attention border border-state-attention/40 hover:bg-state-attention/10 cursor-pointer flex items-center gap-1.5"
                title="Eliminar productos marcados como demo y conservar solo catálogo real"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Purgar {dbStatus.demoProductsCount} items demo</span>
              </button>
            )}
          </div>

          {activeInputMode === "file" ? (
            /* Modo 1: Carga de Archivo .SQL */
            <div className="p-base rounded-control bg-raised border border-border border-dashed space-y-compact text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".sql"
                onChange={handleFileChange}
                className="hidden"
                id="sql-file-uploader"
              />
              <label
                htmlFor="sql-file-uploader"
                className="cursor-pointer flex flex-col items-center justify-center gap-compact py-compact"
              >
                <div className="w-12 h-12 rounded-pill bg-panel border border-border flex items-center justify-center text-brand">
                  <FileUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-body font-medium text-primary">
                    {selectedFile ? selectedFile.name : "Haz clic para seleccionar o arrastra tu archivo .SQL aquí"}
                  </p>
                  <p className="text-caption text-secondary mt-1">
                    {selectedFile
                      ? `Tamaño: ${(selectedFile.size / 1024).toFixed(1)} KB · Listo para introspección relacional`
                      : "Compatible con volcados de MySQL, PostgreSQL, SQLite (Dump DDL e INSERT INTO)"}
                  </p>
                </div>
              </label>

              {selectedFile && (
                <div className="inline-flex items-center gap-compact px-base py-1 rounded-pill bg-brand-surface border border-brand/30 text-caption font-mono text-brand">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Archivo preparado: {selectedFile.name}</span>
                </div>
              )}
            </div>
          ) : (
            /* Modo 2: Editor de Script SQL */
            <div className="space-y-compact">
              <div className="flex items-center justify-between text-caption text-secondary">
                <span>Sentencias SQL (INSERT INTO o CREATE TABLE):</span>
                <button
                  type="button"
                  onClick={() => setSqlText(SAMPLE_SQL_TEMPLATE)}
                  className="text-brand hover:underline font-mono text-caption flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Cargar plantilla real de ferretería</span>
                </button>
              </div>

              <textarea
                value={sqlText}
                onChange={(e) => setSqlText(e.target.value)}
                rows={9}
                placeholder="Pega aquí tus instrucciones SQL con tablas de productos, inventario o proveedores..."
                className="w-full p-compact rounded-control bg-canvas text-primary font-mono text-caption border border-border focus:outline-none focus:border-brand resize-y leading-relaxed"
                spellCheck={false}
              />
            </div>
          )}

          {/* Opciones de Ingesta */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-compact pt-compact border-t border-border">
            <label className="flex items-center gap-2 cursor-pointer text-caption text-secondary select-none">
              <input
                type="checkbox"
                checked={replaceDemo}
                onChange={(e) => setReplaceDemo(e.target.checked)}
                className="w-4 h-4 rounded text-brand border-border focus:ring-0 cursor-pointer"
              />
              <span>
                Reemplazar datos simulados y activar exclusivamente el catálogo real (Requisito S3)
              </span>
            </label>

            <Button
              variant="primary"
              disabled={importing || (activeInputMode === "file" && !selectedFile) || (activeInputMode === "editor" && !sqlText.trim())}
              onClick={handleProcessSql}
              icon={importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            >
              {importing ? "Procesando SQL..." : "Procesar e Importar Base de Datos"}
            </Button>
          </div>

          {/* Retroalimentación de Éxito / Error */}
          {importError && (
            <div className="p-compact rounded-control bg-state-error/10 border border-state-error/30 text-state-error text-caption flex items-start gap-compact">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold">Error en la configuración de la base de datos:</p>
                <p>{importError}</p>
              </div>
            </div>
          )}

          {importResult && (
            <div className="p-base rounded-control bg-brand-surface border border-brand/40 text-caption space-y-compact">
              <div className="flex items-center gap-compact text-brand font-semibold text-body">
                <CheckCircle2 className="w-4 h-4" />
                <span>Base de Datos Real Configurada Exitosamente</span>
              </div>
              <p className="text-secondary">
                Se procesaron <strong>{importResult.importedProducts}</strong> productos físicos y <strong>{importResult.importedSuppliers}</strong> proveedores homologados. Existencias totales incorporadas: <strong>{importResult.totalStockUnits?.toLocaleString()}</strong> unidades.
              </p>

              {Array.isArray(importResult.sample) && importResult.sample.length > 0 && (
                <div className="mt-compact pt-compact border-t border-brand/20">
                  <span className="text-caption font-mono text-muted block mb-1">
                    Muestra de referencias reales incorporadas a PostgreSQL:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-mono text-caption text-primary">
                    {importResult.sample.map((s: any, idx: number) => (
                      <div key={idx} className="p-1.5 rounded bg-panel border border-border flex items-center justify-between">
                        <span className="font-medium truncate mr-2">{s.name}</span>
                        <span className="text-brand shrink-0">{s.stock}u · ${s.price?.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
