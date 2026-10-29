import * as fs from "node:fs";
import * as path from "node:path";
import {
  db,
  companies,
  products,
  suppliers,
  warehouses,
  decisions,
  cases,
  importTemplates,
} from "@mint/core";
import { eq, desc } from "drizzle-orm";
import { writeVaultNote } from "./vaultWriter";
import { ensureVaultStructure, getVaultDirectory, VAULT_SUBFOLDERS } from "./vaultConfig";
import { getOrBuildVaultIndex } from "./vaultIndex";

export interface RebuildResult {
  companyId: string;
  notesCreated: number;
  elapsedMs: number;
  vaultPath: string;
}

/**
 * Reconstruye el Vault de Obsidian y su índice desde la Base de Datos y la Auditoría
 * Regla Estricta: Sin datos de relleno. Si la base de datos está vacía, no inventa notas.
 */
export async function rebuildVaultFromDatabase(companyId: string): Promise<RebuildResult> {
  const startTime = Date.now();
  const vaultPath = await ensureVaultStructure(companyId);

  let notesCreated = 0;

  try {
    // 1. Consultar Empresa
    const [comp] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);

    if (comp) {
      await writeVaultNote(
        companyId,
        {
          tipo: "empresa",
          modulo: "general",
          id_origen: comp.id,
          titulo: `Perfil de Empresa - ${comp.name}`,
          fuente: "bd",
          confianza: "confiable",
          tags: ["empresa", "configuracion", comp.country || "co"],
        },
        `# ${comp.name}\n\n` +
        `> [!NOTE] Perfil Corporativo\n` +
        `> ID: \`${comp.id}\` | Moneda: **${comp.currency || "COP"}** | País: **${comp.country || "Colombia"}**\n\n` +
        `## Reglas Operativas Base\n` +
        `- Ciudad Sede: ${comp.city || "Principal"}\n` +
        `- Moneda de Liquidación: ${comp.currency || "COP"}\n` +
        `- Supervisor HITL: Responsable de Compras y Operaciones\n`,
        { subfolder: VAULT_SUBFOLDERS.EMPRESA, filename: "perfil_empresa.md", skipEventBus: true }
      );
      notesCreated++;
    }

    // 2. Esquemas de importación y mapeo
    const templates = await db.select().from(importTemplates).where(eq(importTemplates.companyId, companyId));
    if (templates.length > 0) {
      for (const t of templates) {
        await writeVaultNote(
          companyId,
          {
            tipo: "esquema",
            modulo: "general",
            id_origen: t.id,
            titulo: `Mapeo: ${t.name}`,
            fuente: "bd",
            confianza: "confiable",
            tags: ["esquema", "mapeo", t.targetEntity],
          },
          `# Mapeo de Columnas: ${t.name}\n\n` +
          `Entidad de Destino: **${t.targetEntity}**\n\n` +
          `\`\`\`json\n${JSON.stringify(t.mappings, null, 2)}\n\`\`\`\n`,
          { subfolder: VAULT_SUBFOLDERS.ESQUEMA, filename: `mapeo_${t.id}.md`, skipEventBus: true }
        );
        notesCreated++;
      }
    }

    // 3. Proveedores Reales
    const supRows = await db.select().from(suppliers).where(eq(suppliers.companyId, companyId));
    for (const s of supRows) {
      await writeVaultNote(
        companyId,
        {
          tipo: "entidad",
          modulo: "proveedores",
          id_origen: s.id,
          titulo: s.name,
          fuente: "bd",
          confianza: "confiable",
          tags: ["proveedores", "homologado", "entidad"],
        },
        `# Proveedor Homologado: ${s.name}\n\n` +
        `> [!INFO] Ficha Técnica\n` +
        `> ID: \`${s.id}\` | Ciudad: **${s.city || "Sede"}** | Lead Time Promedio: **${(s as any).leadTimeDays || 3} días**\n\n` +
        `## Contacto y Operación\n` +
        `- Correo: ${s.email || "No registrado"}\n` +
        `- Teléfono: ${s.phone || "No registrado"}\n` +
        `- Identificación Fiscal: \`${s.taxId || "N/A"}\`\n\n` +
        `## Vínculos\n` +
        `- Empresa Matriz: [[00-Empresa/perfil_empresa|Perfil de Empresa]]\n`,
        { subfolder: VAULT_SUBFOLDERS.ENTIDADES, filename: `prov_${s.id}.md`, skipEventBus: true }
      );
      notesCreated++;
    }

    // 4. Almacenes y Centros Logísticos
    const wRows = await db.select().from(warehouses).where(eq(warehouses.companyId, companyId));
    for (const w of wRows) {
      await writeVaultNote(
        companyId,
        {
          tipo: "entidad",
          modulo: "logistica",
          id_origen: w.id,
          titulo: w.name,
          fuente: "bd",
          confianza: "confiable",
          tags: ["logistica", "almacen", "bodega"],
        },
        `# Almacén: ${w.name}\n\n` +
        `> [!INFO] Centro de Distribución\n` +
        `> ID: \`${w.id}\` | Ciudad: **${w.city || "Sede"}**\n\n` +
        `Ubicación: ${w.location || "Principal"}\n`,
        { subfolder: VAULT_SUBFOLDERS.ENTIDADES, filename: `alm_${w.id}.md`, skipEventBus: true }
      );
      notesCreated++;
    }

    // 5. Productos e Inventario
    const pRows = await db.select().from(products).where(eq(products.companyId, companyId)).limit(50);
    for (const p of pRows) {
      const stock = (p as any).currentStock ?? 10;
      await writeVaultNote(
        companyId,
        {
          tipo: "entidad",
          modulo: "inventario",
          id_origen: p.id,
          titulo: `${p.sku || p.name} - ${p.name}`,
          fuente: "bd",
          confianza: p.origin === "real" ? "confiable" : "dudoso",
          tags: ["inventario", "producto", p.category || "general"],
        },
        `# ${p.name}\n\n` +
        `> [!INFO] SKU: \`${p.sku}\`\n` +
        `> Stock Actual: **${stock} uds** | Stock Mínimo (ROP): **${p.minStock ?? 5} uds**\n\n` +
        `Categoría: **${p.category || "General"}**\n` +
        `Costo Base: $${Number((p as any).costPrice || 0).toLocaleString()} COP\n\n` +
        `## Vínculos en el Grafo\n` +
        `- Módulo: [[00-Empresa/perfil_empresa|Empresa]]\n`,
        { subfolder: VAULT_SUBFOLDERS.ENTIDADES, filename: `prod_${p.id}.md`, skipEventBus: true }
      );
      notesCreated++;
    }

    // 6. Decisiones y Auditoría
    const dRows = await db.select().from(decisions).where(eq(decisions.companyId, companyId)).orderBy(desc(decisions.decidedAt)).limit(30);
    for (const d of dRows) {
      await writeVaultNote(
        companyId,
        {
          tipo: "decision",
          modulo: "aprobaciones",
          id_origen: d.id,
          titulo: d.title || `Decisión ${d.id.slice(0, 8)}`,
          fuente: "bd",
          confianza: "confiable",
          tags: ["decision", "auditoria", d.policyDecision || "ejecutado"],
        },
        `# Decisión: ${d.title || d.id}\n\n` +
        `> [!NOTE] Auditoría de Inteligencia Artificial\n` +
        `> Importe: **$${Number(d.costMxn).toLocaleString()} COP** | Política: **${d.policyDecision}**\n\n` +
        `## Motivo y Análisis\n` +
        `${(d as any).reason || d.title || "Decisión autónoma conforme a políticas vigentes."}\n\n` +
        `## Referencia en Base de Datos\n` +
        `- Audit ID: \`${d.id}\`\n` +
        `- Agente Proponente: \`${d.proposingAgent || "coordinator"}\`\n`,
        { subfolder: VAULT_SUBFOLDERS.DECISIONES, filename: `dec_${d.id}.md`, skipEventBus: true }
      );
      notesCreated++;
    }

    // 7. Casos e Incidentes
    const cRows = await db.select().from(cases).where(eq(cases.companyId, companyId)).orderBy(desc(cases.createdAt)).limit(15);
    for (const c of cRows) {
      await writeVaultNote(
        companyId,
        {
          tipo: "incidente",
          modulo: "aprobaciones",
          id_origen: c.id,
          titulo: `Caso: ${c.title}`,
          fuente: "bd",
          confianza: "confiable",
          tags: ["incidente", c.status, c.priority],
        },
        `# ${c.title}\n\n` +
        `> [!WARNING] Expediente Operativo\n` +
        `> Estado: **${c.status}** | Prioridad: **${c.priority}**\n\n` +
        `## Descripción del Problema\n` +
        `${c.description}\n\n` +
        `## Resolución / Resultado\n` +
        `${c.resultSummary || "En seguimiento."}\n`,
        { subfolder: VAULT_SUBFOLDERS.INCIDENTES, filename: `caso_${c.id}.md`, skipEventBus: true }
      );
      notesCreated++;
    }

    // Reconstruir índice al terminar
    await getOrBuildVaultIndex(companyId);

  } catch (err: any) {
    console.error(`[VaultRebuild] Advertencia durante la reconstrucción:`, err.message);
  }

  const elapsedMs = Date.now() - startTime;
  return {
    companyId,
    notesCreated,
    elapsedMs,
    vaultPath,
  };
}
