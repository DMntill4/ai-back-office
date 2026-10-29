import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

/**
 * Configuración y Estructura del Vault de Obsidian por Empresa
 */

export const VAULT_SUBFOLDERS = {
  EMPRESA: "00-Empresa",
  ESQUEMA: "01-Esquema",
  ENTIDADES: "02-Entidades",
  DECISIONES: "03-Decisiones",
  APRENDIZAJES: "04-Aprendizajes",
  INCIDENTES: "05-Incidentes",
  PREGUNTAS: "06-Preguntas",
  REPORTES: "07-Reportes",
  CALIDAD_DATOS: "08-Calidad-de-datos",
  SESIONES: "09-Sesiones",
  PLANTILLAS: "_plantillas",
  INDICE: "_indice",
} as const;

/**
 * Obtiene la ruta raíz del vault para una empresa específica
 */
export function getVaultDirectory(companyId: string): string {
  if (process.env.MINT_VAULT_DIR) {
    return path.resolve(process.env.MINT_VAULT_DIR, companyId);
  }
  return path.join(os.homedir(), ".mint", "vaults", companyId);
}

/**
 * Asegura la existencia de las carpetas base del vault y la configuración de Obsidian
 */
export async function ensureVaultStructure(companyId: string): Promise<string> {
  const vaultPath = getVaultDirectory(companyId);

  // 1. Crear directorio raíz del vault
  if (!fs.existsSync(vaultPath)) {
    fs.mkdirSync(vaultPath, { recursive: true });
  }

  // 2. Crear carpetas estándar
  for (const folder of Object.values(VAULT_SUBFOLDERS)) {
    const fPath = path.join(vaultPath, folder);
    if (!fs.existsSync(fPath)) {
      fs.mkdirSync(fPath, { recursive: true });
    }
  }

  // 3. Crear configuración de Obsidian (.obsidian/)
  const obsidianDir = path.join(vaultPath, ".obsidian");
  if (!fs.existsSync(obsidianDir)) {
    fs.mkdirSync(obsidianDir, { recursive: true });
  }

  // A. app.json: Configura Obsidian para usar enlaces [[wikilinks]] sin romper rutas
  const appJsonPath = path.join(obsidianDir, "app.json");
  if (!fs.existsSync(appJsonPath)) {
    const appConfig = {
      useMarkdownLinks: false, // Usa [[Wikilinks]] de Obsidian
      newFileFolderPath: VAULT_SUBFOLDERS.ENTIDADES,
      attachmentFolderPath: VAULT_SUBFOLDERS.INDICE,
      livePreview: true,
      showLineNumber: true,
    };
    fs.writeFileSync(appJsonPath, JSON.stringify(appConfig, null, 2), "utf8");
  }

  // B. graph.json: Colores del grafo de Obsidian sincronizados con la paleta de MINT
  const graphJsonPath = path.join(obsidianDir, "graph.json");
  if (!fs.existsSync(graphJsonPath)) {
    const graphConfig = {
      "collapse-filter": false,
      "search": "",
      "showTags": true,
      "showAttachments": false,
      "hideUnresolved": false,
      "showOrphans": true,
      "colorGroups": [
        { "query": "tag:#inventario", "color": { "a": 1, "rgb": 2278750 } }, // #22c55e (Verde Menta)
        { "query": "tag:#proveedores", "color": { "a": 1, "rgb": 890024 } }, // #0d9488 (Teal)
        { "query": "tag:#logistica", "color": { "a": 1, "rgb": 14251782 } }, // #d97706 (Ámbar)
        { "query": "tag:#aprobaciones", "color": { "a": 1, "rgb": 9647082 } }, // #9333ea (Púrpura)
        { "query": "tag:#decision", "color": { "a": 1, "rgb": 11032055 } }, // #a855f7 (Violeta)
        { "query": "tag:#incidente", "color": { "a": 1, "rgb": 15680580 } }, // #ef4444 (Rojo)
        { "query": "tag:#aprendizaje", "color": { "a": 1, "rgb": 3718648 } }, // #38bdf8 (Azul cielo)
        { "query": "tag:#confiable", "color": { "a": 1, "rgb": 2278750 } },
        { "query": "tag:#dudoso", "color": { "a": 1, "rgb": 16103179 } },
        { "query": "tag:#no_confiable", "color": { "a": 1, "rgb": 15680580 } },
        { "query": "tag:#sombra", "color": { "a": 0.5, "rgb": 6809849 } }
      ],
      "nodeSizeMultiplier": 1.2,
      "lineSizeMultiplier": 1,
      "forces": {
        "textFadeMultiplier": 0,
        "dragStrength": 0.08,
        "linkStrength": 1,
        "linkDistance": 220,
        "repulsion": 150,
        "centerStrength": 0.5
      }
    };
    fs.writeFileSync(graphJsonPath, JSON.stringify(graphConfig, null, 2), "utf8");
  }

  // 4. Plantillas de base en _plantillas/
  ensureDefaultTemplates(vaultPath);

  return vaultPath;
}

function ensureDefaultTemplates(vaultPath: string) {
  const templatesDir = path.join(vaultPath, VAULT_SUBFOLDERS.PLANTILLAS);

  const entidadTemplate = `---
tipo: entidad
empresa: "{{empresa}}"
modulo: "{{modulo}}"
id_origen: "{{id_origen}}"
fuente: "{{fuente}}"
confianza: "{{confianza}}"
creada: "{{creada}}"
actualizada: "{{actualizada}}"
caduca: null
estado: vigente
autor: mint
---

# {{titulo}}

> [!INFO] Ficha Operativa
> ID Origen: \`{{id_origen}}\` | Módulo: **{{modulo}}** | Confianza: **{{confianza}}**

## Descripción
{{descripcion}}

## Conexiones Operativas
- Módulo: [[00-Empresa/perfil|Perfil de Empresa]]
{{conexiones}}

## Historial de Eventos
- {{creada}}: Ficha generada automáticamente por MINT desde la base de datos real.

#{{modulo}} #entidad #{{confianza}}
`;

  const decisionTemplate = `---
tipo: decision
empresa: "{{empresa}}"
modulo: "{{modulo}}"
id_origen: "{{id_origen}}"
fuente: bd
confianza: confiable
creada: "{{creada}}"
actualizada: "{{actualizada}}"
caduca: null
estado: vigente
autor: mint
---

# Decisión: {{titulo}}

> [!NOTE] Registro de Auditoría
> ID Decisión: \`{{id_origen}}\` | Importe: **{{costo}}** | Política: **{{politica}}**

## Contexto y Hechos
{{motivo}}

## Entidades Involucradas
{{entidades_enlaces}}

## Enlace de Auditoría
- Referencia inmutable en BD: \`{{audit_ref}}\`

#decision #{{modulo}} #auditoria
`;

  const aprendizajeTemplate = `---
tipo: aprendizaje
empresa: "{{empresa}}"
modulo: "{{modulo}}"
id_origen: "{{id_origen}}"
fuente: inferido
confianza: {{confianza}}
creada: "{{creada}}"
actualizada: "{{actualizada}}"
caduca: null
estado: {{estado}}
evidencias_count: {{evidencias_count}}
autor: mint
---

# Aprendizaje: {{titulo}}

> [!TIP] Patrón Operativo
> Estado: **{{estado}}** | Ocurrencias observadas: **{{evidencias_count}}**

## Patrón Identificado
{{patron}}

## Evidencia de Soporte
{{evidencias}}

#aprendizaje #{{modulo}} #patron
`;

  const writeIfMissing = (name: string, content: string) => {
    const p = path.join(templatesDir, name);
    if (!fs.existsSync(p)) {
      fs.writeFileSync(p, content, "utf8");
    }
  };

  writeIfMissing("plantilla_entidad.md", entidadTemplate);
  writeIfMissing("plantilla_decision.md", decisionTemplate);
  writeIfMissing("plantilla_aprendizaje.md", aprendizajeTemplate);
}
