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
  expectedFramework: string | null;
  expectedDbType: string | null;
  reasoning: string;
}

/**
 * Cerebro AI: Utiliza el modelo LLM conectado (vía RETO_KEY / GROK_API_KEY)
 * para comprender la intención, extraer los nombres de proyectos y tecnologías
 * a partir de cualquier consulta en lenguaje natural (Español o Inglés).
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
Extract the target project name, directory search tokens, expected tech framework (e.g. Spring Boot, Node.js), and database engine.
Return strictly a valid JSON object without markdown fences:
{
  "projectName": string,
  "searchTerms": string[],
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

  return {
    projectName: tokens.join("-") || query,
    searchTerms: tokens,
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
 * Busca proyectos en carpetas estándar del usuario (Documents, OneDrive, Desktop, Projects, CWD)
 * guiado por el Cerebro AI de Mint.
 */
export async function searchProjectDatabase(query: string): Promise<DiscoveredProject[]> {
  // 1. El LLM interpreta la consulta en lenguaje natural y extrae términos de búsqueda inteligentes
  const aiAnalysis = await interpretQueryWithAI(query);
  const searchTerms = aiAnalysis.searchTerms;

  if (searchTerms.length === 0) return [];

  const home = os.homedir();
  const candidateRoots = [
    process.cwd(),
    path.join(home, "OneDrive", "Documents"),
    path.join(home, "Documents"),
    path.join(home, "Projects"),
    path.join(home, "Workspace"),
    path.join(home, "Desktop"),
    home,
  ];

  const checkedDirs = new Set<string>();
  const candidates: DiscoveredProject[] = [];

  for (const root of candidateRoots) {
    if (!fs.existsSync(root) || checkedDirs.has(root)) continue;
    checkedDirs.add(root);

    try {
      const entries = fs.readdirSync(root, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const entryNameLower = entry.name.toLowerCase();

        // Comparar con los términos de búsqueda extraídos por la IA
        const matchesTerm = searchTerms.some((term) => {
          const cleanTerm = term.replace(/[^a-z0-9]/g, "");
          const cleanEntry = entryNameLower.replace(/[^a-z0-9]/g, "");
          return cleanEntry.includes(cleanTerm) || cleanTerm.includes(cleanEntry);
        });

        if (matchesTerm) {
          const projectDir = path.join(root, entry.name);
          const projectInfo = inspectProjectDirectory(projectDir);
          if (projectInfo) {
            candidates.push(projectInfo);
          }
        }
      }
    } catch {
      // Omitir si no hay permisos de lectura
    }
  }

  // 2. El LLM analiza los candidatos encontrados y emite su veredicto y razonamiento
  return await rankAndReasonWithAI(query, candidates);
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

/**
 * Extrae herramientas/productos y existencias directamente de archivos SQL (ej: tools, products, inventory)
 */
export function extractProductsFromSqlFile(filePath: string): ExtractedProductItem[] {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf-8");
  const items: ExtractedProductItem[] = [];

  // 1. Extraer INSERT INTO `tools` (patrón de opus-rentals)
  const toolsRegex = /INSERT\s+INTO\s+`?tools`?\s*\(([^)]+)\)\s*VALUES\s*([\s\S]+?);/gi;
  let match: RegExpExecArray | null;

  while ((match = toolsRegex.exec(content)) !== null) {
    const columns = match[1].split(",").map((c) => c.replace(/[`'"]/g, "").trim().toLowerCase());
    const valuesBlock = match[2];

    const rowMatches = valuesBlock.match(/\(([^)]+)\)/g);
    if (!rowMatches) continue;

    const nameIdx = columns.indexOf("name");
    const brandIdx = columns.indexOf("brand");
    const modelIdx = columns.indexOf("model");
    const priceIdx = columns.findIndex((c) => c.includes("price") || c.includes("daily"));

    for (let rIdx = 0; rIdx < rowMatches.length; rIdx++) {
      const rowStr = rowMatches[rIdx].replace(/^\(|\)$/g, "");
      const parts = rowStr.split(/,\s*(?=(?:[^']*'[^']*')*[^']*$)/).map((p) => p.replace(/^'|'$/g, "").trim());

      const rawName = nameIdx >= 0 ? parts[nameIdx] : `Tool #${rIdx + 1}`;
      const brand = brandIdx >= 0 ? parts[brandIdx] : "";
      const model = modelIdx >= 0 ? parts[modelIdx] : "";
      const priceRaw = priceIdx >= 0 ? parseFloat(parts[priceIdx]) : 50000;

      const fullName = brand ? `${rawName} (${brand} ${model})`.trim() : rawName;
      const sku = `TOOL-${rIdx + 1 < 10 ? "0" : ""}${rIdx + 1}`;

      items.push({
        sku,
        name: fullName,
        category: "Maquinaria y Herramientas",
        price: isNaN(priceRaw) ? 50000 : priceRaw,
        stock: 5,
        minStock: 2,
      });
    }
  }

  // 2. Extraer INSERT INTO `products` genérico si aplica
  const genericProdRegex = /INSERT\s+INTO\s+`?products`?\s*\(([^)]+)\)\s*VALUES\s*([\s\S]+?);/gi;
  while ((match = genericProdRegex.exec(content)) !== null) {
    const columns = match[1].split(",").map((c) => c.replace(/[`'"]/g, "").trim().toLowerCase());
    const valuesBlock = match[2];
    const rowMatches = valuesBlock.match(/\(([^)]+)\)/g);
    if (!rowMatches) continue;

    const skuIdx = columns.indexOf("sku");
    const nameIdx = columns.indexOf("name");
    const minStockIdx = columns.indexOf("min_stock");

    for (let rIdx = 0; rIdx < rowMatches.length; rIdx++) {
      const rowStr = rowMatches[rIdx].replace(/^\(|\)$/g, "");
      const parts = rowStr.split(/,\s*(?=(?:[^']*'[^']*')*[^']*$)/).map((p) => p.replace(/^'|'$/g, "").trim());
      const sku = skuIdx >= 0 ? parts[skuIdx] : `SKU-${Date.now()}-${rIdx}`;
      const name = nameIdx >= 0 ? parts[nameIdx] : `Producto ${rIdx + 1}`;
      const minStock = minStockIdx >= 0 ? parseInt(parts[minStockIdx], 10) || 5 : 5;

      items.push({
        sku,
        name,
        category: "General",
        price: 1500,
        stock: 10,
        minStock,
      });
    }
  }

  return items;
}
