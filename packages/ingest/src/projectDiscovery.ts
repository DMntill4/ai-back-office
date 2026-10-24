import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { GrokClient, getLlmApiKey } from "@mint/core";

export interface DiscoveredProject {
  projectName: string;
  projectPath: string;
  framework: "Spring Boot" | "Node.js" | "Python" | "Generic";
  dbType: "mysql" | "postgres" | "sqlite" | "h2" | "sql_script";
  databaseName?: string;
  connectionUrl?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  sqlFiles: string[];
  dbFiles: string[];
  entitiesFound?: string[];
  aiReasoning?: string;
  confidence?: number;
}

export interface AIProjectQueryAnalysis {
  projectName: string;
  searchTerms: string[];
  locationHints: string[];
  expectedFramework: string | null;
  expectedDbType: string | null;
  reasoning: string;
}

/**
 * Cerebro AI: Utiliza el modelo LLM conectado (vía RETO_KEY / GROK_API_KEY)
 * para comprender la intención, extraer los nombres de proyectos, tecnologías
 * y pistas de ubicación (ej: "Downloads", "Descargas", "D:\repos") a partir
 * de cualquier consulta en lenguaje natural (Español o Inglés).
 */
export async function interpretQueryWithAI(query: string): Promise<AIProjectQueryAnalysis> {
  const apiKey = getLlmApiKey();
  if (apiKey) {
    try {
      const client = new GrokClient();
      const response = await client.chatCompletion({
        messages: [
          {
            role: "system",
            content: `You are Mint's Autonomous Project & Database Discovery AI.
Analyze the user's natural language request (in Spanish, English, or any language) to find their project database or inventory.
Extract:
1. Target project name.
2. Directory search tokens.
3. Location hints (any folders or paths mentioned, e.g. "Downloads", "Descargas", "D:\\repos", "privado", "carpeta X") or empty array.
4. Expected tech framework (e.g. Spring Boot, Node.js), and database engine.
Return strictly a valid JSON object without markdown fences:
{
  "projectName": string,
  "searchTerms": string[],
  "locationHints": string[],
  "expectedFramework": string or null,
  "expectedDbType": string or null,
  "reasoning": string
}`,
          },
          {
            role: "user",
            content: query,
          },
        ],
        temperature: 0.1,
      });

      const raw = response.content?.replace(/```json|```/g, "").trim();
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.searchTerms && Array.isArray(parsed.searchTerms) && parsed.searchTerms.length > 0) {
          return {
            projectName: parsed.projectName || query,
            searchTerms: parsed.searchTerms.map((t: string) => t.toLowerCase().trim()),
            locationHints: Array.isArray(parsed.locationHints) ? parsed.locationHints : [],
            expectedFramework: parsed.expectedFramework || null,
            expectedDbType: parsed.expectedDbType || null,
            reasoning: parsed.reasoning || "Interpreted via Grok AI",
          };
        }
      }
    } catch {
      // Continuar con fallback si la llamada remota falla
    }
  }

  // Fallback resiliente si no hay API key o hay fallo de red (entorno de pruebas offline)
  const tokens = query
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3);

  const fallbackLocations: string[] = [];
  const qLower = query.toLowerCase();
  if (qLower.includes("download") || qLower.includes("descarga")) fallbackLocations.push("Downloads");
  if (qLower.includes("desktop") || qLower.includes("escritorio")) fallbackLocations.push("Desktop");

  return {
    projectName: tokens.join("-") || query,
    searchTerms: tokens,
    locationHints: fallbackLocations,
    expectedFramework: null,
    expectedDbType: null,
    reasoning: "Local tokenizer fallback",
  };
}

/**
 * Cerebro AI: Evalúa los proyectos encontrados en el disco contra la consulta original
 * del usuario y selecciona el mejor candidato con razonamiento explícito.
 */
export async function rankAndReasonWithAI(
  userQuery: string,
  candidates: DiscoveredProject[],
): Promise<DiscoveredProject[]> {
  if (candidates.length === 0) return [];
  if (candidates.length === 1 && !getLlmApiKey()) return candidates;

  const apiKey = getLlmApiKey();
  if (apiKey) {
    try {
      const client = new GrokClient();
      const prompt = {
        userQuery,
        candidateProjects: candidates.map((c, idx) => ({
          index: idx,
          name: c.projectName,
          path: c.projectPath,
          framework: c.framework,
          dbType: c.dbType,
          databaseName: c.databaseName,
          sqlFiles: c.sqlFiles.map((f) => path.basename(f)),
        })),
      };

      const response = await client.chatCompletion({
        messages: [
          {
            role: "system",
            content: `You are Mint's Autonomous AI Back-Office decision brain.
Evaluate the candidate projects found on the user's filesystem against their query.
Identify the best match and provide concise reasoning explaining why it matches.
Return strictly a valid JSON object without markdown fences:
{
  "bestMatchIndex": number,
  "confidence": number,
  "reasoning": string
}`,
          },
          {
            role: "user",
            content: JSON.stringify(prompt),
          },
        ],
        temperature: 0.1,
      });

      const raw = response.content?.replace(/```json|```/g, "").trim();
      if (raw) {
        const parsed = JSON.parse(raw);
        const bestIdx = typeof parsed.bestMatchIndex === "number" ? parsed.bestMatchIndex : 0;
        if (candidates[bestIdx]) {
          candidates[bestIdx].aiReasoning = parsed.reasoning;
          candidates[bestIdx].confidence = parsed.confidence ?? 0.95;
          const best = candidates.splice(bestIdx, 1)[0];
          candidates.unshift(best);
        }
      }
    } catch {
      // Mantener orden detectado si el LLM no responde
    }
  }

  return candidates;
}

/**
 * Busca proyectos en carpetas estándar del usuario y ubicaciones específicas
 * indicadas por el usuario (ej: "Downloads", "Descargas", carpetas privadas, rutas directas)
 * guiado por el Cerebro AI de Mint.
 */
export async function searchProjectDatabase(query: string): Promise<DiscoveredProject[]> {
  // 1. El LLM interpreta la consulta en lenguaje natural, extrayendo términos y pistas de ubicación
  const aiAnalysis = await interpretQueryWithAI(query);
  const searchTerms = aiAnalysis.searchTerms;
  const locationHints = aiAnalysis.locationHints || [];

  if (searchTerms.length === 0 && locationHints.length === 0) return [];

  const home = os.homedir();
  const explicitRoots: string[] = [];

  // Resolver carpetas específicas indicadas en la consulta (ej: Downloads, Descargas, C:\..., D:\...)
  for (const hint of locationHints) {
    const hintClean = hint.trim();
    const hintLower = hintClean.toLowerCase();
    if (hintLower.includes("download") || hintLower.includes("descarga")) {
      const candidates = [
        path.join(home, "Downloads"),
        path.join(home, "Descargas"),
        path.join(home, "OneDrive", "Downloads"),
      ];
      candidates.forEach((c) => {
        if (fs.existsSync(c)) explicitRoots.push(c);
      });
    } else if (hintLower.includes("desktop") || hintLower.includes("escritorio")) {
      const candidates = [
        path.join(home, "Desktop"),
        path.join(home, "Escritorio"),
        path.join(home, "OneDrive", "Desktop"),
      ];
      candidates.forEach((c) => {
        if (fs.existsSync(c)) explicitRoots.push(c);
      });
    } else if (path.isAbsolute(hintClean) && fs.existsSync(hintClean)) {
      explicitRoots.push(hintClean);
    } else {
      const fromHome = path.join(home, hintClean);
      if (fs.existsSync(fromHome)) explicitRoots.push(fromHome);
      const fromCwd = path.join(process.cwd(), hintClean);
      if (fs.existsSync(fromCwd)) explicitRoots.push(fromCwd);
    }
  }

  // Raíces estándar de desarrollo
  const standardRoots = [
    process.cwd(),
    path.join(home, "OneDrive", "Documents"),
    path.join(home, "Documents"),
    path.join(home, "Projects"),
    path.join(home, "Workspace"),
    path.join(home, "workspace"),
    path.join(home, "Desktop"),
    path.join(home, "Downloads"),
    path.join(home, "src"),
    path.join(home, "dev"),
    home,
  ];

  // Priorizar raíces explícitas si el usuario dijo "busca en downloads / carpeta X"
  const candidateRoots = Array.from(new Set([...explicitRoots, ...standardRoots]));

  const checkedDirs = new Set<string>();
  const candidates: DiscoveredProject[] = [];

  // Escaneo recursivo tolerante a carpetas anidadas (ej. descargas descomprimidas)
  function scanDir(dir: string, depth: number, maxDepth: number) {
    if (!fs.existsSync(dir) || checkedDirs.has(dir) || depth > maxDepth) return;
    checkedDirs.add(dir);

    const baseNameLower = path.basename(dir).toLowerCase();
    const isRootCandidate = candidateRoots.includes(dir);

    if (!isRootCandidate) {
      const matchesSelf = searchTerms.some((term) => {
        const cleanTerm = term.replace(/[^a-z0-9]/g, "");
        const cleanEntry = baseNameLower.replace(/[^a-z0-9]/g, "");
        return cleanEntry.includes(cleanTerm) || cleanTerm.includes(cleanEntry);
      });

      if (matchesSelf) {
        const projectInfo = inspectProjectDirectory(dir);
        if (projectInfo) {
          if (!candidates.some((c) => c.projectPath.toLowerCase() === projectInfo.projectPath.toLowerCase())) {
            candidates.push(projectInfo);
          }
        }
      }
    }

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const entryNameLower = entry.name.toLowerCase();
        if (
          [
            "node_modules",
            ".git",
            ".idea",
            ".vscode",
            "appdata",
            "windows",
            "temp",
            "cache",
            "target",
            "build",
            ".gradle",
          ].includes(entryNameLower)
        ) {
          continue;
        }

        const subDir = path.join(dir, entry.name);
        const matchesTerm = searchTerms.some((term) => {
          const cleanTerm = term.replace(/[^a-z0-9]/g, "");
          const cleanEntry = entryNameLower.replace(/[^a-z0-9]/g, "");
          return cleanEntry.includes(cleanTerm) || cleanTerm.includes(cleanEntry);
        });

        if (matchesTerm) {
          const projectInfo = inspectProjectDirectory(subDir);
          if (projectInfo) {
            if (!candidates.some((c) => c.projectPath.toLowerCase() === projectInfo.projectPath.toLowerCase())) {
              candidates.push(projectInfo);
            }
          }
        }

        // Si es una ubicación explícita (ej: Downloads), profundizar hasta nivel 3
        if (depth < maxDepth) {
          scanDir(subDir, depth + 1, maxDepth);
        }
      }
    } catch {}
  }

  for (const root of candidateRoots) {
    if (!fs.existsSync(root)) continue;
    const isExplicit = explicitRoots.some(
      (e) => root.toLowerCase() === e.toLowerCase() || root.toLowerCase().startsWith(e.toLowerCase()),
    );
    scanDir(root, 0, isExplicit ? 3 : 1);
  }

  // 2. El LLM analiza los candidatos encontrados y emite su veredicto y razonamiento
  return await rankAndReasonWithAI(query, candidates);
}

/**
 * Escanea dinámicamente las carpetas de desarrollo típicas en cualquier máquina
 * (Windows, macOS, Linux) para detectar proyectos de software reales ya existentes.
 */
export function scanLocalWorkspaceProjects(): DiscoveredProject[] {
  const home = os.homedir();
  const candidateRoots = [
    process.cwd(),
    path.join(home, "OneDrive", "Documents"),
    path.join(home, "Documents"),
    path.join(home, "Projects"),
    path.join(home, "Workspace"),
    path.join(home, "workspace"),
    path.join(home, "Desktop"),
    path.join(home, "src"),
    path.join(home, "dev"),
  ];

  const checkedDirs = new Set<string>();
  const projects: DiscoveredProject[] = [];

  for (const root of candidateRoots) {
    if (!fs.existsSync(root) || checkedDirs.has(root)) continue;
    checkedDirs.add(root);

    try {
      const entries = fs.readdirSync(root, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const nameLower = entry.name.toLowerCase();
        if (
          [
            "node_modules",
            ".git",
            ".idea",
            ".vscode",
            "appdata",
            "windows",
            "temp",
            "cache",
            "system32",
            "program files",
          ].includes(nameLower)
        ) {
          continue;
        }

        const projectDir = path.join(root, entry.name);
        const info = inspectProjectDirectory(projectDir);
        if (
          info &&
          (info.framework !== "Generic" ||
            info.sqlFiles.length > 0 ||
            info.dbFiles.length > 0 ||
            info.databaseName)
        ) {
          if (!projects.some((p) => p.projectPath.toLowerCase() === info.projectPath.toLowerCase())) {
            projects.push(info);
          }
        }
      }
    } catch {}
  }

  return projects;
}

/**
 * Inspecciona una carpeta de proyecto para detectar Spring Boot, MySQL, PostgreSQL, SQLite y archivos SQL
 */
export function inspectProjectDirectory(projectDir: string): DiscoveredProject | null {
  try {
    const projectName = path.basename(projectDir);
    let framework: DiscoveredProject["framework"] = "Generic";
    let dbType: DiscoveredProject["dbType"] = "sql_script";
    let connectionUrl: string | undefined;
    let databaseName: string | undefined;
    let host: string | undefined;
    let port: number | undefined;
    let username: string | undefined;
    let password: string | undefined;

    const sqlFiles: string[] = [];
    const dbFiles: string[] = [];

    // 1. Detectar Spring Boot (pom.xml o build.gradle)
    const hasPom = fs.existsSync(path.join(projectDir, "pom.xml")) || fs.existsSync(path.join(projectDir, "backend", "pom.xml"));
    const hasGradle = fs.existsSync(path.join(projectDir, "build.gradle")) || fs.existsSync(path.join(projectDir, "backend", "build.gradle"));
    if (hasPom || hasGradle) {
      framework = "Spring Boot";
    }

    // 2. Buscar application.properties o application.yml
    const resourceCandidates = [
      path.join(projectDir, "backend", "src", "main", "resources", "application.properties"),
      path.join(projectDir, "backend", "src", "main", "resources", "application.yml"),
      path.join(projectDir, "src", "main", "resources", "application.properties"),
      path.join(projectDir, "src", "main", "resources", "application.yml"),
      path.join(projectDir, "application.properties"),
    ];

    for (const resPath of resourceCandidates) {
      if (fs.existsSync(resPath)) {
        const content = fs.readFileSync(resPath, "utf-8");
        const urlMatch = content.match(/spring\.datasource\.url\s*=\s*(.+)/i);
        if (urlMatch) {
          connectionUrl = urlMatch[1].trim();
          if (connectionUrl.includes("mysql")) dbType = "mysql";
          else if (connectionUrl.includes("postgresql") || connectionUrl.includes("postgres")) dbType = "postgres";
          else if (connectionUrl.includes("sqlite")) dbType = "sqlite";
          else if (connectionUrl.includes("h2")) dbType = "h2";

          const dbNameMatch = connectionUrl.match(/\/([a-zA-Z0-9_-]+)(?:\?|$)/);
          if (dbNameMatch) databaseName = dbNameMatch[1];
        }

        const userMatch = content.match(/spring\.datasource\.username\s*=\s*(.+)/i);
        if (userMatch) username = userMatch[1].trim();

        const passMatch = content.match(/spring\.datasource\.password\s*=\s*(.+)/i);
        if (passMatch) password = passMatch[1].trim();
        break;
      }
    }

    // 3. Buscar variables en .env
    const envPath = fs.existsSync(path.join(projectDir, ".env"))
      ? path.join(projectDir, ".env")
      : fs.existsSync(path.join(projectDir, "backend", ".env"))
      ? path.join(projectDir, "backend", ".env")
      : null;

    if (envPath) {
      const envContent = fs.readFileSync(envPath, "utf-8");
      const dbNameMatch = envContent.match(/DB_NAME\s*=\s*(.+)/i);
      if (dbNameMatch && !databaseName) databaseName = dbNameMatch[1].trim();

      const dbUserMatch = envContent.match(/DB_USER(?:NAME)?\s*=\s*(.+)/i);
      if (dbUserMatch && !username) username = dbUserMatch[1].trim();

      const dbHostMatch = envContent.match(/DB_HOST\s*=\s*(.+)/i);
      if (dbHostMatch) host = dbHostMatch[1].trim();

      const dbPortMatch = envContent.match(/DB_PORT\s*=\s*(\d+)/i);
      if (dbPortMatch) port = parseInt(dbPortMatch[1], 10);
    }

    // 4. Buscar scripts SQL (en database/init, database, sql, db)
    const scanDirs = [
      path.join(projectDir, "database", "init"),
      path.join(projectDir, "database"),
      path.join(projectDir, "db"),
      path.join(projectDir, "sql"),
      projectDir,
    ];

    for (const dir of scanDirs) {
      if (fs.existsSync(dir)) {
        try {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const ext = path.extname(file).toLowerCase();
            const fullFilePath = path.join(dir, file);
            if (ext === ".sql" && !sqlFiles.includes(fullFilePath)) {
              sqlFiles.push(fullFilePath);
            } else if ((ext === ".sqlite" || ext === ".db" || ext === ".sqlite3") && !dbFiles.includes(fullFilePath)) {
              dbFiles.push(fullFilePath);
              dbType = "sqlite";
            }
          }
        } catch {}
      }
    }

    return {
      projectName,
      projectPath: projectDir,
      framework,
      dbType,
      connectionUrl,
      databaseName,
      host: host || "localhost",
      port: port || (dbType === "mysql" ? 3306 : 5432),
      username,
      password,
      sqlFiles,
      dbFiles,
    };
  } catch {
    return null;
  }
}

export interface ExtractedProductItem {
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  minStock: number;
}

const INVENTORY_TABLE_KEYWORDS = [
  "tool", "prod", "item", "art", "equip", "part", "mat", "merc", "inv", "cat", "med", "veh", "supply", "asset", "service"
];

const METADATA_TABLE_SUFFIXES = [
  "category", "categories", "categoria", "categorias", "type", "types", "group", "groups", "log", "logs", "status", "role", "roles", "user", "users"
];

/**
 * Extractor Universal de Catálogo / Inventario para cualquier proyecto y sector.
 * Funciona dinámicamente con cualquier esquema SQL de cualquier industria sin valores fijos.
 */
export function extractProductsFromSqlFile(filePath: string): ExtractedProductItem[] {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf-8");
  const items: ExtractedProductItem[] = [];

  const insertRegex = /INSERT\s+INTO\s+`?([a-zA-Z0-9_]+)`?\s*\(([^)]+)\)\s*VALUES\s*([\s\S]+?);/gi;
  let match: RegExpExecArray | null;

  while ((match = insertRegex.exec(content)) !== null) {
    const rawTableName = match[1];
    const tableNameLower = rawTableName.toLowerCase();

    // Omitir tablas que sean solo categorías, roles, logs o tipos
    if (METADATA_TABLE_SUFFIXES.some((s) => tableNameLower.endsWith(s) || tableNameLower.endsWith(s + "s"))) {
      continue;
    }

    const columns = match[2].split(",").map((c) => c.replace(/[`'"]/g, "").trim().toLowerCase());
    const valuesBlock = match[3];

    // Detectar si la tabla representa productos, inventario, herramientas, articulos o si tiene columnas clave
    const isTargetTable = INVENTORY_TABLE_KEYWORDS.some((kw) => tableNameLower.includes(kw));
    const hasNameCol = columns.some((c) => c.includes("name") || c.includes("nombre") || c.includes("desc") || c.includes("title"));
    const hasPriceOrStock = columns.some((c) => c.includes("price") || c.includes("cost") || c.includes("precio") || c.includes("stock") || c.includes("qty"));

    if (!isTargetTable && !(hasNameCol && hasPriceOrStock)) {
      continue;
    }

    const rowMatches = valuesBlock.match(/\(([^)]+)\)/g);
    if (!rowMatches) continue;

    const nameIdx = columns.findIndex((c) => c === "name" || c === "nombre" || c.includes("name") || c.includes("title"));
    const brandIdx = columns.findIndex((c) => c.includes("brand") || c.includes("marca") || c.includes("fabricante"));
    const modelIdx = columns.findIndex((c) => c.includes("model") || c.includes("modelo"));
    const skuIdx = columns.findIndex((c) => c === "sku" || c === "code" || c === "codigo" || c.includes("sku"));
    const priceIdx = columns.findIndex((c) => c.includes("price") || c.includes("precio") || c.includes("cost") || c.includes("daily") || c.includes("unit") || c.includes("monto"));
    const stockIdx = columns.findIndex((c) => c.includes("stock") || c.includes("quantity") || c.includes("qty") || c.includes("existenc") || c.includes("cantidad"));
    const minStockIdx = columns.findIndex((c) => c.includes("min_stock") || c.includes("min_qty") || c.includes("reorder") || c.includes("minimo"));
    const categoryIdx = columns.findIndex((c) => c === "category" || c === "categoria" || c.includes("category_name"));

    const defaultCategory = rawTableName.charAt(0).toUpperCase() + rawTableName.slice(1);
    const skuPrefix = rawTableName.slice(0, 4).toUpperCase();

    for (let rIdx = 0; rIdx < rowMatches.length; rIdx++) {
      const rowStr = rowMatches[rIdx].replace(/^\(|\)$/g, "");
      const parts = rowStr.split(/,\s*(?=(?:[^']*'[^']*')*[^']*$)/).map((p) => p.replace(/^'|'$/g, "").trim());

      const rawName = nameIdx >= 0 && parts[nameIdx] ? parts[nameIdx] : `Item #${rIdx + 1}`;
      const brand = brandIdx >= 0 ? parts[brandIdx] : "";
      const model = modelIdx >= 0 ? parts[modelIdx] : "";
      const customSku = skuIdx >= 0 && parts[skuIdx] ? parts[skuIdx] : `${skuPrefix}-${rIdx + 1 < 10 ? "0" : ""}${rIdx + 1}`;
      const priceRaw = priceIdx >= 0 ? parseFloat(parts[priceIdx]) : 100;
      const stockRaw = stockIdx >= 0 ? parseInt(parts[stockIdx], 10) : 5;
      const minStockRaw = minStockIdx >= 0 ? parseInt(parts[minStockIdx], 10) : 2;
      const category = categoryIdx >= 0 && parts[categoryIdx] ? parts[categoryIdx] : defaultCategory;

      const fullName = brand ? `${rawName} (${brand}${model ? " " + model : ""})`.trim() : rawName;

      items.push({
        sku: customSku,
        name: fullName,
        category,
        price: isNaN(priceRaw) || priceRaw <= 0 ? 100 : priceRaw,
        stock: isNaN(stockRaw) ? 5 : stockRaw,
        minStock: isNaN(minStockRaw) ? 2 : minStockRaw,
      });
    }
  }

  return items;
}
