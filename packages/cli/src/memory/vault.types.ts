/**
 * MINT CLI - Vault Memory Types (Obsidian Compatible)
 * Tipos y contratos para la memoria persistente en formato Markdown + YAML Frontmatter.
 */

export type VaultNoteType =
  | "empresa"
  | "esquema"
  | "entidad"
  | "decision"
  | "aprendizaje"
  | "incidente"
  | "pregunta"
  | "reporte"
  | "calidad"
  | "sesion";

export type VaultNoteModule =
  | "inventario"
  | "ventas"
  | "finanzas"
  | "logistica"
  | "proveedores"
  | "aprobaciones"
  | "general";

export type VaultSourceType = "bd" | "usuario" | "api" | "inferido";
export type VaultConfidence = "confiable" | "dudoso" | "no_confiable";
export type VaultNoteStatus = "vigente" | "obsoleta" | "contradicha" | "hipotesis" | "sombra";
export type VaultNoteAuthor = "mint" | "usuario";

export interface VaultFrontmatter {
  tipo: VaultNoteType;
  empresa: string;
  modulo: VaultNoteModule;
  id_origen: string; // ID real en PostgreSQL o ID de evento de auditoría
  fuente: VaultSourceType;
  confianza: VaultConfidence;
  creada: string; // ISO 8601
  actualizada: string; // ISO 8601
  caduca: string | null; // ISO 8601 o null
  estado: VaultNoteStatus;
  autor: VaultNoteAuthor;
  titulo?: string;
  tags?: string[];
  version?: number;
  evidencias_count?: number; // Para promover hipótesis a vigente
  contradiction?: string; // Detalle si contradice a la BD
  [key: string]: any;
}

export interface VaultNote {
  relativePath: string;
  absolutePath: string;
  frontmatter: VaultFrontmatter;
  content: string; // Cuerpo Markdown
  wikilinks: string[]; // Enlaces [[...]] salientes
  tags: string[]; // Etiquetas #...
  mtime: number;
  sizeBytes: number;
}

export interface VaultIndexEntry {
  relativePath: string;
  tipo: VaultNoteType;
  empresa: string;
  modulo: VaultNoteModule;
  id_origen: string;
  fuente: VaultSourceType;
  confianza: VaultConfidence;
  estado: VaultNoteStatus;
  creada: string;
  actualizada: string;
  caduca: string | null;
  autor: VaultNoteAuthor;
  titulo: string;
  tags: string[];
  wikilinks: string[];
  mtime: number;
  sizeBytes: number;
}

export interface VaultStatusReport {
  companyId: string;
  vaultPath: string;
  totalNotes: number;
  notesByType: Record<VaultNoteType, number>;
  notesByStatus: Record<VaultNoteStatus, number>;
  notesByConfidence: Record<VaultConfidence, number>;
  totalSizeBytes: number;
  lastUpdated: string | null;
  hypothesesPending: number;
  contradictedNotes: number;
  expiredNotes: number;
  isObsidianConfigured: boolean;
  hasGitRepo: boolean;
}

export interface VaultSearchParams {
  query?: string;
  tipo?: VaultNoteType;
  modulo?: VaultNoteModule;
  estado?: VaultNoteStatus;
  confianza?: VaultConfidence;
  tag?: string;
  id_origen?: string;
  limit?: number;
}

export interface VaultWriteOptions {
  subfolder?: string;
  filename?: string;
  isShadow?: boolean;
  forceUserAuthor?: boolean;
  skipEventBus?: boolean;
}
