import React, { useState, useMemo } from "react";
import { VaultNote } from "../../types/workflow";
import { INITIAL_VAULT_NOTES } from "../../data/mockData";
import {
  BookOpen,
  Search,
  FolderTree,
  FileText,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Download,
  Trash2,
  CheckCircle2,
  Clock,
  Layers,
  Tag,
  Link2,
  ShieldAlert,
  ArrowRight,
  Database,
  Lock,
} from "lucide-react";

const VAULT_FOLDERS = [
  "00-Empresa",
  "01-Proveedores",
  "02-Productos",
  "03-Logistica",
  "04-Politicas",
  "05-Decisiones",
  "06-Incidentes",
  "07-Hipotesis",
  "08-Metas",
  "09-Sesiones",
];

export const MemoryVaultView: React.FC = () => {
  const [notes, setNotes] = useState<VaultNote[]>(INITIAL_VAULT_NOTES);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<VaultNote["estado"] | "todos">("todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeNoteId, setActiveNoteId] = useState<string>("note_prod_003");
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Notas filtradas
  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      if (selectedFolder && note.folder !== selectedFolder) return false;
      if (selectedTag && !note.tags.includes(selectedTag)) return false;
      if (selectedStatus !== "todos" && note.estado !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = note.title.toLowerCase().includes(q);
        const matchesContent = note.content.toLowerCase().includes(q);
        const matchesTags = note.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesContent && !matchesTags) return false;
      }
      return true;
    });
  }, [notes, selectedFolder, selectedTag, selectedStatus, searchQuery]);

  const activeNote = notes.find((n) => n.id === activeNoteId) || filteredNotes[0] || notes[0];

  // Acciones CLI reflejadas en la UI
  const handleRebuildVault = () => {
    setIsRebuilding(true);
    setFeedbackMsg("Reconstruyendo vault desde PostgreSQL...");
    setTimeout(() => {
      setIsRebuilding(false);
      setFeedbackMsg("Vault reconstruido con éxito (6 notas sincronizadas sin discrepancias).");
      setTimeout(() => setFeedbackMsg(null), 3000);
    }, 1800);
  };

  const handleForgetCitation = (noteId: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, estado: "archivada" as const } : n))
    );
    setFeedbackMsg(`Nota archivada con éxito (mint memory forget).`);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handlePromoteHypothesis = (noteId: string) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId
          ? {
              ...n,
              estado: "vigente" as const,
              confianza: 0.95,
              evidencias_count: Math.max(3, n.evidencias_count + 1),
            }
          : n
      )
    );
    setFeedbackMsg(`Hipótesis promovida a 'vigente' con 3+ evidencias.`);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  // Resumen de Salud del Vault (mint memory status)
  const stats = useMemo(() => {
    const total = notes.length;
    const vigentes = notes.filter((n) => n.estado === "vigente").length;
    const hipotesis = notes.filter((n) => n.estado === "hipotesis").length;
    const contradichas = notes.filter((n) => n.estado === "contradicha").length;
    return { total, vigentes, hipotesis, contradichas };
  }, [notes]);

  return (
    <div className="flex-1 flex flex-col h-full w-full overflow-hidden bg-[#070c09] text-gray-200 font-sans select-none">
      {/* 1. Header de la Bóveda de Memoria */}
      <div className="h-16 border-b border-[#14261c] bg-[#070c09] px-6 flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#0e2417] border border-[#1d472e] flex items-center justify-center text-mint-400 shadow-sm">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-tight">
                Obsidian Memory Vault
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#102418] text-mint-400 border border-[#1b3d27] font-semibold">
                mint memory
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              Memoria persistente Markdown por proyecto • La base de datos siempre prevalece
            </p>
          </div>
        </div>

        {/* Acciones CLI del Vault */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <button
            onClick={handleRebuildVault}
            disabled={isRebuilding}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0e1f15] hover:bg-[#142e1f] text-mint-300 border border-[#1d442c] font-semibold transition-all shadow-sm"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isRebuilding ? "animate-spin" : ""}`} />
            <span>{isRebuilding ? "Reconstruyendo..." : "Reconstruir (rebuild)"}</span>
          </button>
        </div>
      </div>

      {/* 2. Banner de Notificaciones / Feedback */}
      {feedbackMsg && (
        <div className="bg-[#0b1d14] border-b border-mint-700/60 px-6 py-2 flex items-center justify-between text-xs font-mono text-mint-300 animate-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-mint-400" />
            <span>{feedbackMsg}</span>
          </div>
        </div>
      )}

      {/* 3. Panel de Métricas de Salud del Vault (mint memory status) */}
      <div className="border-b border-[#14261c] bg-[#08100c] px-6 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono flex-shrink-0">
        <div className="flex items-center gap-2.5 p-2 rounded-lg bg-[#0c1611] border border-[#162d1f]">
          <span className="w-2 h-2 rounded-full bg-mint-400" />
          <div>
            <span className="text-[10px] text-gray-500 uppercase block">Total Notas</span>
            <span className="font-bold text-gray-100">{stats.total} notas en 10 carpetas</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5 p-2 rounded-lg bg-[#0c1611] border border-[#162d1f]">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <div>
            <span className="text-[10px] text-gray-500 uppercase block">Vigentes (≥3 Evidencias)</span>
            <span className="font-bold text-emerald-400">{stats.vigentes} verificadas</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5 p-2 rounded-lg bg-[#0c1611] border border-[#162d1f]">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <div>
            <span className="text-[10px] text-gray-500 uppercase block">Hipótesis Activas</span>
            <span className="font-bold text-amber-400">{stats.hipotesis} en evaluación</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5 p-2 rounded-lg bg-[#0c1611] border border-[#162d1f]">
          <span className="w-2 h-2 rounded-full bg-rose-400" />
          <div>
            <span className="text-[10px] text-gray-500 uppercase block">Discrepancias BD</span>
            <span className="font-bold text-rose-400">{stats.contradichas} contradichas</span>
          </div>
        </div>
      </div>

      {/* 4. Cuerpo Principal: Estructura de Vault de Tres Columnas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Columna Izquierda: Carpetas del Vault (Estructura Obsidian 00-09) */}
        <aside className="w-56 border-r border-[#14261c] bg-[#070c09] p-3 flex flex-col space-y-4 overflow-y-auto flex-shrink-0 text-xs font-mono">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block px-2 mb-2">
              Carpetas del Vault
            </span>
            <div className="space-y-0.5">
              <button
                onClick={() => setSelectedFolder(null)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-all ${
                  selectedFolder === null
                    ? "bg-[#112419] text-mint-300 border border-[#1e462d] font-bold"
                    : "text-gray-400 hover:text-gray-200 hover:bg-[#0c1611]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <FolderTree className="w-3.5 h-3.5 text-gray-500" />
                  <span>Todas las carpetas</span>
                </div>
                <span className="text-[10px] text-gray-500">{notes.length}</span>
              </button>

              {VAULT_FOLDERS.map((folder) => {
                const count = notes.filter((n) => n.folder === folder).length;
                const isCurrent = selectedFolder === folder;
                return (
                  <button
                    key={folder}
                    onClick={() => setSelectedFolder(folder)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-all ${
                      isCurrent
                        ? "bg-[#112419] text-mint-300 border border-[#1e462d] font-bold"
                        : "text-gray-400 hover:text-gray-200 hover:bg-[#0c1611]"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-3 h-3 text-gray-500 flex-shrink-0" />
                      <span className="truncate">{folder}</span>
                    </div>
                    {count > 0 && (
                      <span className="text-[10px] text-gray-500 font-semibold">{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filtro de Estado de la Memoria */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block px-2 mb-2">
              Estado de Evidencia
            </span>
            <div className="space-y-1">
              {[
                { id: "todos", label: "Todos", color: "text-gray-400" },
                { id: "vigente", label: "Vigente (Hecho probado)", color: "text-emerald-400" },
                { id: "hipotesis", label: "Hipótesis (Pendiente)", color: "text-amber-400" },
                { id: "contradicha", label: "Contradicha por BD", color: "text-rose-400" },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setSelectedStatus(st.id as any)}
                  className={`w-full text-left px-2.5 py-1 rounded-md text-[11px] transition-all flex items-center gap-2 ${
                    selectedStatus === st.id
                      ? "bg-[#122218] text-mint-300 border border-[#1f422c] font-semibold"
                      : "text-gray-400 hover:text-gray-200 hover:bg-[#0c1611]"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${st.color.replace("text-", "bg-")}`} />
                  <span>{st.label}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Columna Central: Lista y Buscador de Notas (`mint memory search`) */}
        <div className="w-80 border-r border-[#14261c] bg-[#070c09] flex flex-col overflow-hidden flex-shrink-0">
          {/* Input de Búsqueda */}
          <div className="p-3 border-b border-[#14261c] bg-[#09120d]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar notas o tags (mint memory search)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#050a07] border border-[#162e20] rounded-xl pl-8 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-mint-500 font-mono"
              />
            </div>
          </div>

          {/* Lista de Notas Filtradas */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#101f16] p-2 space-y-1">
            {filteredNotes.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-500 font-mono">
                No se encontraron notas que coincidan con la búsqueda.
              </div>
            ) : (
              filteredNotes.map((note) => {
                const isSelected = activeNote?.id === note.id;
                return (
                  <button
                    key={note.id}
                    onClick={() => setActiveNoteId(note.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all space-y-1.5 block ${
                      isSelected
                        ? "bg-[#102418] border border-[#1f472e] shadow-sm"
                        : "hover:bg-[#0c1610] border border-transparent"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-white leading-snug line-clamp-1">
                        {note.title}
                      </span>
                      <span
                        className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded ${
                          note.estado === "vigente"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : note.estado === "hipotesis"
                            ? "bg-amber-950 text-amber-400 border border-amber-800"
                            : "bg-rose-950 text-rose-400 border border-rose-800"
                        }`}
                      >
                        {note.estado}
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                      {note.content.replace(/#+\s+/g, "").slice(0, 100)}...
                    </p>

                    <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 pt-1">
                      <span className="truncate max-w-[130px]">{note.folder}</span>
                      <span>{note.evidencias_count} evidencias</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Columna Derecha: Visor y Editor de Notas Estilo Obsidian */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#060a08]">
          {activeNote ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Barra de Título y Acciones de la Nota */}
              <div className="h-14 border-b border-[#14261c] px-6 flex items-center justify-between gap-4 bg-[#08100c] flex-shrink-0">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText className="w-4 h-4 text-mint-400 flex-shrink-0" />
                  <span className="text-xs font-mono text-gray-400 truncate">
                    {activeNote.filename}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Botón de Promover Hipótesis */}
                  {activeNote.estado === "hipotesis" && (
                    <button
                      onClick={() => handlePromoteHypothesis(activeNote.id)}
                      className="px-2.5 py-1 rounded bg-[#102e1c] text-mint-300 border border-mint-600 text-xs font-mono font-bold hover:bg-[#153b24]"
                    >
                      Promover a Hecho (+1 Evidencia)
                    </button>
                  )}

                  {/* Botón de Olvidar Nota */}
                  <button
                    onClick={() => handleForgetCitation(activeNote.id)}
                    className="p-1.5 rounded-lg bg-[#0c1611] text-gray-400 hover:text-rose-400 border border-[#1b3425] hover:border-rose-800 transition-all"
                    title="Olvidar esta memoria (mint memory forget)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Contenido de la Nota con Frontmatter YAML y Wikilinks */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6 max-w-3xl font-sans">
                {/* Frontmatter YAML renderizado limpiamente */}
                <div className="p-4 rounded-xl bg-[#0a140f] border border-[#152e20] font-mono text-xs space-y-2">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider block font-bold">
                    --- YAML Frontmatter ---
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-gray-500">estado: </span>
                      <span
                        className={`font-bold ${
                          activeNote.estado === "vigente"
                            ? "text-emerald-400"
                            : activeNote.estado === "hipotesis"
                            ? "text-amber-400"
                            : "text-rose-400"
                        }`}
                      >
                        {activeNote.estado}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">confianza: </span>
                      <span className="font-bold text-gray-200">{activeNote.confianza}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">origen: </span>
                      <span className="text-gray-300 truncate block">{activeNote.origen}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">evidencias: </span>
                      <span className="font-bold text-mint-400">
                        {activeNote.evidencias_count} registradas
                      </span>
                    </div>
                  </div>

                  {/* Etiquetas */}
                  <div className="pt-2 flex flex-wrap gap-1.5 items-center">
                    <Tag className="w-3 h-3 text-gray-500" />
                    {activeNote.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-2 py-0.5 rounded bg-[#102418] text-mint-300 border border-[#1d452b]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Alerta si la nota tiene contradicción con PostgreSQL */}
                {activeNote.hasContradiction && activeNote.contradictionDetails && (
                  <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 text-xs font-mono space-y-2 text-rose-200">
                    <div className="flex items-center gap-2 font-bold text-rose-300">
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                      <span>Contradicción Detectada contra la Base de Datos</span>
                    </div>
                    <div className="space-y-1 text-[11px]">
                      <div>
                        <span className="text-gray-400">Afirmación en Nota: </span>
                        <span className="text-rose-300">
                          {activeNote.contradictionDetails.noteValue}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Verdad en PostgreSQL: </span>
                        <span className="text-emerald-300 font-bold">
                          {activeNote.contradictionDetails.dbValue}
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 italic">
                      Regla de Oro: La base de datos es la fuente de verdad. El agente ignora la afirmación del vault.
                    </p>
                  </div>
                )}

                {/* Cuerpo Markdown de la Nota */}
                <article className="prose prose-invert prose-sm max-w-none space-y-4 text-gray-200 leading-relaxed">
                  <h1 className="text-xl font-bold text-white border-b border-[#14261c] pb-2">
                    {activeNote.title}
                  </h1>

                  <div className="whitespace-pre-line text-xs font-sans text-gray-300 leading-relaxed">
                    {activeNote.content}
                  </div>
                </article>

                {/* Enlaces de Obsidian (Wikilinks [[...]]) */}
                {activeNote.wikilinks && activeNote.wikilinks.length > 0 && (
                  <div className="pt-6 border-t border-[#14261c] space-y-2">
                    <span className="text-xs font-mono text-gray-400 uppercase font-bold flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5 text-mint-400" />
                      Enlaces en el Grafo de Conocimiento (Wikilinks):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {activeNote.wikilinks.map((wl) => (
                        <span
                          key={wl}
                          className="px-2.5 py-1 rounded-lg bg-[#0e1f15] border border-[#1b3d27] text-mint-300 text-xs font-mono hover:border-mint-500 cursor-pointer transition-all"
                        >
                          {wl}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-gray-500 font-mono">
              Selecciona una nota para ver su contenido.
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
export default MemoryVaultView;
