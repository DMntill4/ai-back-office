import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Folder,
  FolderOpen,
  FileText,
  Tag,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Layers,
  Cpu,
  Database,
  HelpCircle,
  Send,
  Terminal,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  FileCode,
  Eye,
  Zap,
  BookOpen,
  Archive,
  Hash,
  Download,
  AlertOctagon,
  Calendar,
} from "lucide-react";
import { Button } from "../ui/Button";

// Interfaces para el Vault
export interface VaultFile {
  id: string;
  uuid: string;
  filename: string;
  folder: "Decisiones" | "Cuarentena" | "Auditoria";
  title: string;
  createdAt: string;
  updatedAt: string;
  specialist: string;
  confidence: number;
  hmacSha256: string;
  tags: string[];
  wikilinks: string[];
  rawMarkdown: string;
  isQuarantine?: boolean;
  contradiction?: {
    noteValue: string;
    dbValue: string;
    field: string;
  };
}

export interface PendingQuestion {
  id: string;
  title: string;
  contextRef: string;
  question: string;
  options: string[];
  status: "pending" | "resolved";
  selectedOption?: string;
  impactDescription: string;
}

// Datos semilla de notas Obsidian sincronizadas con /vault
const SEED_VAULT_FILES: VaultFile[] = [
  {
    id: "DEC-004190f7",
    uuid: "DEC-004190f7-89b1-4f93-b6d4-8d4e2a1b9f7a",
    filename: "Decisiones/DEC-004190f7.md",
    folder: "Decisiones",
    title: "Retención HITL: Compra Mayorista Sierra Circular 1800W",
    createdAt: "2026-10-29T10:14:08-05:00",
    updatedAt: "Hoy, 10:14 a. m.",
    specialist: "LogisticsRouter + PolicyEngine",
    confidence: 0.96,
    hmacSha256: "9f82c3d1e4a5028bf87412e690a312bc89a712f5e3b129",
    tags: ["#hitl", "#guardrail", "#presupuesto", "#sierra-circular", "#pol01"],
    wikilinks: ["[[DEC-008b188f]]", "[[QUAR-176e6d4c]]", "[[QUAR-0f1284a1]]"],
    rawMarkdown: `---
uuid: "DEC-004190f7-89b1-4f93-b6d4-8d4e2a1b9f7a"
created_at: "2026-10-29T10:14:08-05:00"
specialist: "LogisticsRouter + PolicyEngine"
confidence: 0.96
hmac_sha256: "9f82c3d1e4a5028bf87412e690a312bc89a712f5e3b129"
folder: "Decisiones"
tags: ["#hitl", "#guardrail", "#presupuesto", "#sierra-circular", "#pol01"]
---

# Retención HITL: Orden de Compra #OC-402

La inferencia autónoma de la mañana formuló la reposición preventiva para el **SKU-SIE-IND18** (Sierra Circular Industrial 1800W) al haber cruzado el umbral crítico de punto de reorden (ROP de 20 unidades frente a 5 en stock físico).

## Evaluación de Guardrail Presupuestal (POL-01)
- **Monto Total Estimado:** $7.250.000 COP
- **Límite Autónomo Permitido:** $5.000.000 COP
- **Discrepancia Presupuestal:** Exceso de +$2.250.000 COP (+45.0% sobre umbral de autonomía)
- **Acción del Agente:** Transición forzada al buzón de Aprobación Asistida Humana según regla estricta de gobernanza.

## Análisis Multicriterio de Proveedores
Se evaluó a *Distribuidora Industrial Santander* ($145.000 COP/und, Lead Time 48h) frente a *Ferreterías Unidas Bogotá* ($152.000 COP/und, Lead Time 72h). A pesar de la alerta de cuarentena registrada en [[QUAR-176e6d4c]], el diferencial de costo justifica la retención con recomendación positiva en lugar del descarte prematuro.

## Parámetros de Inyección Logística
- **Transporte OSRM:** Bucaramanga CD Matriz Chimitá vía Ruta Nacional 45A.
- **Flete Unitario:** $4.200 COP/und.
- **Decisión Precedente:** Ver histórico consolidado en [[DEC-008b188f]].`,
  },
  {
    id: "DEC-008b188f",
    uuid: "DEC-008b188f-12c8-47a2-99d1-01f4c78a33b9",
    filename: "Decisiones/DEC-008b188f.md",
    folder: "Decisiones",
    title: "Adjudicación Automática: 100x Disco Diamantado 7' Concreto",
    createdAt: "2026-10-29T09:15:32-05:00",
    updatedAt: "Hoy, 09:15 a. m.",
    specialist: "SupplierMatcher + TelemetryWatcher",
    confidence: 0.98,
    hmacSha256: "4e11a9b832f0124cba881765de9013ef451298aa78c012",
    tags: ["#autonoma", "#disco-diamantado", "#bogota", "#pol01", "#stockout"],
    wikilinks: ["[[DEC-004190f7]]", "[[LOG-2026-10-29]]"],
    rawMarkdown: `---
uuid: "DEC-008b188f-12c8-47a2-99d1-01f4c78a33b9"
created_at: "2026-10-29T09:15:32-05:00"
specialist: "SupplierMatcher + TelemetryWatcher"
confidence: 0.98
hmac_sha256: "4e11a9b832f0124cba881765de9013ef451298aa78c012"
folder: "Decisiones"
tags: ["#autonoma", "#disco-diamantado", "#bogota", "#pol01", "#stockout"]
---

# Adjudicación Automática: Orden #OC-401

Generación e inyección autónoma sin intervención humana bajo las reglas operativas de la política POL-01 de guardrail financiero.

## Resumen de Ejecución
- **Producto:** SKU-COR-DISC7 (Disco Diamantado 7' Corte Concreto)
- **Cantidad:** 100 unidades
- **Proveedor Homologado:** Ferreterías Unidas Bogotá S.A.S.
- **Costo Total:** $3.780.000 COP (Dentro del rango autónomo <= $5.000.000 COP)
- **Flete OSRM:** $18.000 COP/kg vía Pescadero.

## Estado de la Transacción
El recibo digital criptográfico fue persistido en \`receipts/po_2026_0089.json\` y sincronizado con el canal de Telegram del Operador y la bitácora [[LOG-2026-10-29]].`,
  },
  {
    id: "DEC-002f5a11",
    uuid: "DEC-002f5a11-55c3-49d8-a110-33b819f002ac",
    filename: "Decisiones/DEC-002f5a11.md",
    folder: "Decisiones",
    title: "Reenrutamiento Logístico Bucaramanga - San Gil vía Zapatoca",
    createdAt: "2026-10-28T18:42:10-05:00",
    updatedAt: "Ayer, 06:42 p. m.",
    specialist: "LogisticsRouter",
    confidence: 0.92,
    hmacSha256: "a78bc9012df38411e8992c34bb1045f8721c0091aa45bb",
    tags: ["#logistica", "#contingencia", "#osrm", "#pescadero", "#rutas"],
    wikilinks: ["[[QUAR-0f1284a1]]", "[[LOG-2026-10-28]]"],
    rawMarkdown: `---
uuid: "DEC-002f5a11-55c3-49d8-a110-33b819f002ac"
created_at: "2026-10-28T18:42:10-05:00"
specialist: "LogisticsRouter"
confidence: 0.92
hmac_sha256: "a78bc9012df38411e8992c34bb1045f8721c0091aa45bb"
folder: "Decisiones"
tags: ["#logistica", "#contingencia", "#osrm", "#pescadero", "#rutas"]
---

# Contingencia de Despacho: Vía Bucaramanga - San Gil

Activación de ruta alternativa por alerta de derrumbe de tierra en el km 42 del Cañón del Chicamocha (sector Pescadero).

## Ajuste de Telemetría OSRM
- **Ruta Estándar (Bloqueada):** Vía Pescadero (112 km, 2h 35m)
- **Ruta Alternativa Activada:** Bucaramanga -> Girón -> Zapatoca -> Galán -> San Gil (154 km, 4h 10m)
- **Sobrecosto Autorizado:** +$180.000 COP en combustible diésel y peajes.
- **Impacto en Lead Time:** +1.5 horas de demora en entregas a clientes de Guanentá.

Conexión forense con el caso de cuarentena tarifaria [[QUAR-0f1284a1]].`,
  },
  {
    id: "QUAR-0f1284a1",
    uuid: "QUAR-0f1284a1-87b4-411a-b672-004a88bc31ef",
    filename: "Cuarentena/QUAR-0f1284a1.md",
    folder: "Cuarentena",
    title: "Discrepancia de Flete: Ferretería del Oriente (+12% Surcharge)",
    createdAt: "2026-10-29T08:20:15-05:00",
    updatedAt: "Hoy, 08:20 a. m.",
    specialist: "AuditorAgent + LogisticsRouter",
    confidence: 0.64,
    hmacSha256: "b3310488921eaf7701c45d6789b12e34fa980112dd3344",
    tags: ["#cuarentena", "#discrepancia-costo", "#fletes", "#ferreteria-oriente"],
    wikilinks: ["[[DEC-002f5a11]]", "[[DEC-004190f7]]"],
    isQuarantine: true,
    contradiction: {
      field: "Tarifa Base de Despacho Bucaramanga-San Gil",
      noteValue: "$22.500 COP / bulto (Tarifa contractual base en Vault)",
      dbValue: "$25.200 COP / bulto (+12.0% liquidado en factura #FACT-9921)",
    },
    rawMarkdown: `---
uuid: "QUAR-0f1284a1-87b4-411a-b672-004a88bc31ef"
created_at: "2026-10-29T08:20:15-05:00"
specialist: "AuditorAgent + LogisticsRouter"
confidence: 0.64
hmac_sha256: "b3310488921eaf7701c45d6789b12e34fa980112dd3344"
folder: "Cuarentena"
tags: ["#cuarentena", "#discrepancia-costo", "#fletes", "#ferreteria-oriente"]
---

# Caso en Cuarentena: Tarifa de Despacho Desfasada

El recolector de telemetría de facturas detectó una divergencia del **+12.0%** en los cargos de despacho liquidado por *Ferretería del Oriente*.

## Hallazgo Forense
La nota histórica en el Vault estipulaba una tarifa fija negociada de $22.500 COP. Sin embargo, el último despacho facturó $25.200 COP alegando costos de contingencia por estado de vías hacia el sur del departamento.

## Acción de Mitigación
El agente ha puesto este parámetro en cuarentena para no distorsionar el cálculo de Landed Cost en futuras órdenes. Se formuló la pregunta pendiente [[Q-091]] al operador humano para definir si es recurrente o temporal.`,
  },
  {
    id: "QUAR-176e6d4c",
    uuid: "QUAR-176e6d4c-44f2-4e9b-8192-ee12891ca044",
    filename: "Cuarentena/QUAR-176e6d4c.md",
    folder: "Cuarentena",
    title: "Desviación Lead Time: DIS Bucaramanga (Declarado 48h vs Real 114h)",
    createdAt: "2026-10-28T14:10:00-05:00",
    updatedAt: "Ayer, 02:10 p. m.",
    specialist: "SupplierMatcher + TelemetryWatcher",
    confidence: 0.58,
    hmacSha256: "f8812c90a134e768112bc554de012398457788aa119900",
    tags: ["#cuarentena", "#lead-time", "#dis", "#retraso", "#holt-winters"],
    wikilinks: ["[[DEC-004190f7]]"],
    isQuarantine: true,
    contradiction: {
      field: "Tiempo de Entrega (Lead Time) Santander",
      noteValue: "48 horas (Lead Time contractual garantizado en acuerdo)",
      dbValue: "114 horas (Promedio móvil observado en últimas 3 entregas WMS)",
    },
    rawMarkdown: `---
uuid: "QUAR-176e6d4c-44f2-4e9b-8192-ee12891ca044"
created_at: "2026-10-28T14:10:00-05:00"
specialist: "SupplierMatcher + TelemetryWatcher"
confidence: 0.58
hmac_sha256: "f8812c90a134e768112bc554de012398457788aa119900"
folder: "Cuarentena"
tags: ["#cuarentena", "#lead-time", "#dis", "#retraso", "#holt-winters"]
---

# Caso en Cuarentena: Desviación Severa de Tiempo de Entrega

La auditoría cruzada entre las fechas de emisión de orden y la confirmación de ingreso al WMS en la Bodega Matriz reveló un retraso sistemático del proveedor *Distribuidora Industrial Santander*.

## Riesgo Operacional
El modelo Holt-Winters de reposición asume 2 días de Lead Time. Con 114 horas reales (4.75 días), el punto de reorden (ROP) queda desprotegido, elevando el riesgo de quiebre de stock a **84%** en productos de alta rotación como [[DEC-004190f7]].

Se requiere confirmación del operador para recalibrar los parámetros ROP o aplicar penalidad de scoring al proveedor.`,
  },
  {
    id: "LOG-2026-10-29",
    uuid: "LOG-2026-10-29-001-a88b-1172a819c991",
    filename: "Auditoria/LOG-2026-10-29.md",
    folder: "Auditoria",
    title: "Ledger Forense: Inferencia Matutina y Validaciones HMAC",
    createdAt: "2026-10-29T07:00:00-05:00",
    updatedAt: "Hoy, 07:00 a. m.",
    specialist: "KernelSystem",
    confidence: 1.0,
    hmacSha256: "0012e87a55421c990234f9a1287cba66512f4590bb8822",
    tags: ["#auditoria", "#forense", "#hmac", "#sistema", "#ledger"],
    wikilinks: ["[[DEC-004190f7]]", "[[DEC-008b188f]]", "[[QUAR-0f1284a1]]"],
    rawMarkdown: `---
uuid: "LOG-2026-10-29-001-a88b-1172a819c991"
created_at: "2026-10-29T07:00:00-05:00"
specialist: "KernelSystem"
confidence: 1.00
hmac_sha256: "0012e87a55421c990234f9a1287cba66512f4590bb8822"
folder: "Auditoria"
tags: ["#auditoria", "#forense", "#hmac", "#sistema", "#ledger"]
---

# Registro Forense Diario: Ciclo Operativo 2026-10-29

- **07:00:01** Invocación de \`schemaDiscoveryService\`: 18 entidades vivas mapeadas en PostgreSQL.
- **07:15:20** Telemetría OSRM actualizada: 4 rutas activas monitoreadas hacia Santander.
- **08:20:15** Generación de caso en cuarentena [[QUAR-0f1284a1]] por sobrecosto de flete.
- **09:15:32** Aprobación y firma de [[DEC-008b188f]] por $3.780.000 COP.
- **10:14:08** Retención de seguridad en [[DEC-004190f7]] por superación de umbral POL-01.
- **10:45:00** Sincronización de embeddings en \`sqlite-vss\`: 1,420 vectores activos.`,
  },
  {
    id: "LOG-2026-10-28",
    uuid: "LOG-2026-10-28-001-7721-bb443319800a",
    filename: "Auditoria/LOG-2026-10-28.md",
    folder: "Auditoria",
    title: "Ledger Forense: Monitoreo de Stock y Rutas Alternas",
    createdAt: "2026-10-28T21:00:00-05:00",
    updatedAt: "Ayer, 09:00 p. m.",
    specialist: "KernelSystem",
    confidence: 1.0,
    hmacSha256: "88912bc450123ef78901456a12bca5788912001aa33445",
    tags: ["#auditoria", "#cierre-diario", "#stock"],
    wikilinks: ["[[DEC-002f5a11]]", "[[QUAR-176e6d4c]]"],
    rawMarkdown: `---
uuid: "LOG-2026-10-28-001-7721-bb443319800a"
created_at: "2026-10-28T21:00:00-05:00"
specialist: "KernelSystem"
confidence: 1.00
hmac_sha256: "88912bc450123ef78901456a12bca5788912001aa33445"
folder: "Auditoria"
tags: ["#auditoria", "#cierre-diario", "#stock"]
---

# Cierre de Jornada Operativa: 2026-10-28

- Ejecución de 3 órdenes de compra consolidadas por un total de $14.280.000 COP.
- Reenrutamiento de transporte hacia San Gil [[DEC-002f5a11]].
- Detección de desviación de tiempos de entrega en [[QUAR-176e6d4c]].
- Consumo total de tokens diario: 382.400 tokens (eficiencia promedio de compresión: 42%).`,
  },
];

// Preguntas pendientes semilla del agente
const INITIAL_PENDING_QUESTIONS: PendingQuestion[] = [
  {
    id: "Q-091",
    title: "Tarifa Recurrente vs Sobrecosto Temporal de Flete",
    contextRef: "QUAR-0f1284a1.md",
    question:
      "¿El sobrecosto de flete del +12% reportado en la ruta Bucaramanga-San Gil debe ser adoptado como nueva tarifa recurrente en el cálculo de Landed Cost o mantenerse como anomalía temporal por derrumbe invernal?",
    options: [
      "Anomalía Temporal (Mantener Cuarentena)",
      "Nueva Tarifa Recurrente (Ajustar Landed Cost)",
    ],
    status: "pending",
    impactDescription:
      "Afecta el precio landed de 14 consumibles pesados despachados hacia las obras de Guanentá.",
  },
  {
    id: "Q-092",
    title: "Ajuste de Lead Time Holt-Winters para DIS",
    contextRef: "QUAR-176e6d4c.md",
    question:
      "Distribuidora Industrial Santander reportó 114h reales vs 48h contratadas en Sierra Circular 1800W. ¿Ajustamos el Holt-Winters Lead Time a 5 días para recalibrar el ROP y evitar desabastecimiento?",
    options: [
      "Ajustar a 5 Días (+40% ROP de Seguridad)",
      "Mantener en 2 Días (Sancionar Rating Proveedor)",
    ],
    status: "pending",
    impactDescription:
      "Modifica el punto de reorden (ROP) automático de 6 SKUs clave para Santander.",
  },
];

export const MemoryVaultView: React.FC = () => {
  const [files, setFiles] = useState<VaultFile[]>(SEED_VAULT_FILES);
  const [activeFileId, setActiveFileId] = useState<string>("DEC-004190f7");
  const [selectedFolder, setSelectedFolder] = useState<string | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "yesterday">("all");
  const [viewMode, setViewMode] = useState<"rendered" | "raw">("rendered");
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedUuid, setCopiedUuid] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Estado del contextManager (tokens LLM)
  const [tokenUsage, setTokenUsage] = useState({
    used: 64280,
    total: 128000,
    systemPrompt: 14200,
    activeRAG: 28450,
    ephemeralTurn: 12180,
    workingBuffer: 9450,
  });

  // Preguntas pendientes del agente
  const [questions, setQuestions] = useState<PendingQuestion[]>(INITIAL_PENDING_QUESTIONS);
  const [customAnswer, setCustomAnswer] = useState<{ [qId: string]: string }>({});

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  // Filtrado de notas
  const filteredFiles = useMemo(() => {
    return files.filter((f) => {
      if (selectedFolder !== "all" && f.folder !== selectedFolder) {
        return false;
      }
      if (selectedTag && !f.tags.includes(selectedTag)) {
        return false;
      }
      if (dateFilter === "today" && !f.updatedAt.includes("Hoy")) {
        return false;
      }
      if (dateFilter === "yesterday" && !f.updatedAt.includes("Ayer")) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = f.title.toLowerCase().includes(q);
        const matchId = f.id.toLowerCase().includes(q);
        const matchContent = f.rawMarkdown.toLowerCase().includes(q);
        const matchTag = f.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchId && !matchContent && !matchTag) return false;
      }
      return true;
    });
  }, [files, selectedFolder, selectedTag, dateFilter, searchQuery]);

  const activeFile = files.find((f) => f.id === activeFileId) || filteredFiles[0] || files[0];

  // Copiado al portapapeles
  const handleCopyText = (text: string, type: "hash" | "uuid") => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      if (type === "hash") {
        setCopiedHash(true);
        setTimeout(() => setCopiedHash(false), 2000);
      } else {
        setCopiedUuid(true);
        setTimeout(() => setCopiedUuid(false), 2000);
      }
      showToast(`${type === "hash" ? "Hash HMAC" : "UUID"} copiado al portapapeles.`);
    }
  };

  // Compactar contexto (contextManager.ts)
  const handleCompactContext = () => {
    setTokenUsage((prev) => ({
      ...prev,
      used: Math.max(48100, prev.used - 16180),
      ephemeralTurn: 0,
      activeRAG: 24450,
    }));
    showToast("Contexto compactado: -16,180 tokens efímeros purgados del Working Buffer.");
  };

  // Resolver pregunta pendiente
  const handleResolveQuestion = (qId: string, optionSelected?: string) => {
    const chosen = optionSelected || customAnswer[qId] || "Opción aprobada por operador";
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qId ? { ...q, status: "resolved", selectedOption: chosen } : q
      )
    );

    // Crear nota consolidada automáticamente en el Vault
    const newNoteId = `DEC-${Math.random().toString(16).substring(2, 10)}`;
    const newFile: VaultFile = {
      id: newNoteId,
      uuid: `${newNoteId}-operator-consolidated`,
      filename: `Decisiones/${newNoteId}.md`,
      folder: "Decisiones",
      title: `Resolución Operativa: ${questions.find((q) => q.id === qId)?.title || "Aclaración"}`,
      createdAt: new Date().toISOString(),
      updatedAt: "Recién consolidado",
      specialist: "Operator + PendingQuestionsService",
      confidence: 1.0,
      hmacSha256: "e78f9912001a45ba890123ef78901456a12bca5788",
      tags: ["#consolidado", "#operador", "#resolucion", "#vault"],
      wikilinks: [activeFile.id ? `[[${activeFile.id}]]` : "[[DEC-004190f7]]"],
      rawMarkdown: `---
uuid: "${newNoteId}-operator-consolidated"
created_at: "${new Date().toISOString()}"
specialist: "Operator + PendingQuestionsService"
confidence: 1.00
hmac_sha256: "e78f9912001a45ba890123ef78901456a12bca5788"
folder: "Decisiones"
tags: ["#consolidado", "#operador", "#resolucion", "#vault"]
---

# Consolidación de Conocimiento Humano: ${questions.find((q) => q.id === qId)?.title}

El operador humano resolvió la pregunta pendiente del agente.

## Decisión Registrada
- **Pregunta Origen:** ${questions.find((q) => q.id === qId)?.question}
- **Opción Validada:** ${chosen}
- **Fecha de Sincronización:** ${new Date().toLocaleTimeString()}
- **Impacto Ontológico:** El parámetro ha sido fijado en la memoria permanente del Vault.`,
    };

    setFiles((prev) => [newFile, ...prev]);
    setActiveFileId(newNoteId);
    showToast(`Pregunta ${qId} consolidada. Nota ${newNoteId}.md agregada al Vault.`);
  };

  // Resolver cuarentena desde la nota activa
  const handleResolveQuarantine = (fileId: string) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId
          ? {
              ...f,
              folder: "Decisiones",
              isQuarantine: false,
              title: f.title.replace("Discrepancia:", "Acuerdo Validado:"),
              confidence: 0.95,
              rawMarkdown: f.rawMarkdown.replace("folder: \"Cuarentena\"", "folder: \"Decisiones\""),
            }
          : f
      )
    );
    showToast(`Caso ${fileId} validado y transferido de Cuarentena a Decisiones.`);
  };

  // Extraer tags únicos de todas las notas
  const allTags = useMemo(() => {
    const set = new Set<string>();
    files.forEach((f) => f.tags.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [files]);

  // Helper para convertir [[wikilinks]] y formatos inline en React nodes
  const renderWikilinksInline = (text: string) => {
    const parts = text.split(/(\[\[.*?\]\])/g);
    return parts.map((part, idx) => {
      if (part.startsWith("[[") && part.endsWith("]]")) {
        const target = part.slice(2, -2);
        const cleanTarget = target.split("/").pop()?.replace(".md", "") || target;
        const existsInVault = files.some((f) => f.id === cleanTarget);

        return (
          <button
            key={idx}
            onClick={() => {
              if (existsInVault) {
                setActiveFileId(cleanTarget);
                showToast(`Navegando a enlace bidireccional: ${cleanTarget}`);
              } else {
                showToast(`Nota ${cleanTarget} referenciada en vault externo.`);
              }
            }}
            className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded-md bg-[#10B981]/10 hover:bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/30 text-xs font-mono transition-colors cursor-pointer group"
            title={`Abrir nota vinculada [[${cleanTarget}]]`}
          >
            <BookOpen className="w-3 h-3 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>[[{cleanTarget}]]</span>
          </button>
        );
      }

      // Procesar negritas simples **texto**
      const boldParts = part.split(/(\*\*.*?\*\*)/g);
      return boldParts.map((bPart, bIdx) => {
        if (bPart.startsWith("**") && bPart.endsWith("**")) {
          return (
            <strong key={bIdx} className="font-semibold text-white">
              {bPart.slice(2, -2)}
            </strong>
          );
        }
        if (bPart.startsWith("`") && bPart.endsWith("`")) {
          return (
            <code
              key={bIdx}
              className="px-1.5 py-0.5 rounded bg-black/50 text-emerald-400 font-mono text-[11px] border border-white/[0.08]"
            >
              {bPart.slice(1, -1)}
            </code>
          );
        }
        return bPart;
      });
    });
  };

  // Renderizador limpio y estructurado de Markdown línea por línea
  const renderStructuredMarkdown = (rawContent: string) => {
    // 1. Quitar el bloque frontmatter si existe al inicio
    let cleanContent = rawContent;
    if (cleanContent.startsWith("---")) {
      const endFrontmatter = cleanContent.indexOf("---", 3);
      if (endFrontmatter !== -1) {
        cleanContent = cleanContent.substring(endFrontmatter + 3).trim();
      }
    }

    const lines = cleanContent.split("\n");
    const elements: React.ReactNode[] = [];
    let currentList: string[] = [];

    const flushList = (key: string) => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={key} className="space-y-1.5 my-2.5 pl-3">
            {currentList.map((item, idx) => (
              <li
                key={idx}
                className="text-xs sm:text-[13px] text-gray-300 leading-relaxed list-none flex items-start gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] mt-1.5 flex-shrink-0" />
                <span className="flex-1">{renderWikilinksInline(item)}</span>
              </li>
            ))}
          </ul>
        );
        currentList = [];
      }
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        currentList.push(trimmed.substring(2));
        return;
      }

      // Si no es lista, vaciar la lista previa si la había
      flushList(`list-${index}`);

      if (!trimmed) {
        return;
      }

      if (trimmed.startsWith("# ")) {
        elements.push(
          <h1
            key={`h1-${index}`}
            className="text-xl sm:text-2xl font-bold tracking-tight text-white pb-2 mt-3 border-b border-white/[0.08]"
          >
            {trimmed.substring(2)}
          </h1>
        );
      } else if (trimmed.startsWith("## ")) {
        elements.push(
          <h2
            key={`h2-${index}`}
            className="text-sm sm:text-base font-bold tracking-tight text-[#34D399] pt-4 pb-1 flex items-center gap-2"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
            {trimmed.substring(3)}
          </h2>
        );
      } else if (trimmed.startsWith("### ")) {
        elements.push(
          <h3 key={`h3-${index}`} className="text-xs sm:text-sm font-semibold text-white pt-2.5">
            {trimmed.substring(4)}
          </h3>
        );
      } else if (trimmed.startsWith("> ")) {
        elements.push(
          <blockquote
            key={`quote-${index}`}
            className="my-2.5 p-3 rounded-xl bg-black/40 border-l-2 border-[#10B981] text-xs text-gray-300 italic"
          >
            {renderWikilinksInline(trimmed.substring(2))}
          </blockquote>
        );
      } else {
        elements.push(
          <p key={`p-${index}`} className="text-xs sm:text-[13px] text-gray-300 leading-relaxed my-1.5">
            {renderWikilinksInline(trimmed)}
          </p>
        );
      }
    });

    flushList("list-final");
    return elements;
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#050806] text-[#F9FAFB] font-sans antialiased select-none">
      {/* 1. Header Bar de la Vista */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-white/[0.08] bg-[#0A0F0C]/90 backdrop-blur-md flex-none z-20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono text-[#8E9893] uppercase tracking-wider">
              Inteligencia
            </span>
            <span className="text-white/20">/</span>
            <span className="text-[11px] font-mono text-[#10B981] flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              obsidianMemoryService.ts
            </span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Memoria del Agente
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#10B981]/10 text-[#34D399] border border-[#10B981]/30">
              VAULT VIVO: 42 NOTAS · 2 CUARENTENA
            </span>
          </div>
        </div>

        {/* Acciones del Header */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={() => showToast("Bóveda sincronizada con el disco local: ~/.mint/vaults/santander")}
          >
            Sincronizar Vault
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={() => showToast(`Exportando ${activeFile.id}.md a disco local...`)}
          >
            Exportar .md
          </Button>
        </div>
      </div>

      {/* Toast flotante */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-16 right-6 z-50 px-4 py-2 rounded-xl bg-[#0A0F0C] border border-[#10B981]/50 text-[#34D399] text-xs font-mono shadow-[0_4px_24px_rgba(16,185,129,0.2)] flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#10B981]" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Layout Tri-Panel (25% + 45% + 30%) */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* ========================================================================= */}
        {/* COLUMNA 1: Explorador del Vault (25% / w-80)                              */}
        {/* ========================================================================= */}
        <div className="w-full lg:w-[25%] xl:w-80 flex flex-col border-r border-white/[0.08] bg-[#0A0F0C]/60 flex-none min-h-0">
          {/* Header de la Bóveda con path */}
          <div className="p-3.5 border-b border-white/[0.08] space-y-2.5 flex-none">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-[11px] text-[#8E9893] flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-[#10B981]" />
                ~/.mint/vaults/santander
              </span>
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" title="Sincronizado" />
            </div>

            {/* Barra de búsqueda con icono */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8E9893]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar nota, UUID o tag..."
                className="w-full h-8 pl-8 pr-3 text-xs bg-black/40 text-white border border-white/[0.08] hover:border-white/[0.16] focus:border-[#10B981]/60 focus:bg-black/60 rounded-lg placeholder:text-[#8E9893] focus:outline-none transition-all font-mono"
              />
            </div>

            {/* Filtro por Fechas */}
            <div className="flex items-center gap-1.5 pt-0.5 text-[10px] font-mono overflow-x-auto no-scrollbar">
              <span className="text-[#8E9893] flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5 text-[#10B981]" />
                Fecha:
              </span>
              {[
                { id: "all", label: "Todas" },
                { id: "today", label: "Hoy (29-Oct)" },
                { id: "yesterday", label: "Ayer (28-Oct)" },
              ].map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDateFilter(d.id as any)}
                  className={`px-2 py-0.5 rounded font-mono transition-colors cursor-pointer ${
                    dateFilter === d.id
                      ? "bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/40 font-semibold"
                      : "text-[#8E9893] hover:text-white bg-black/30 border border-white/[0.04]"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {/* Carpetas del Vault (Pestañas limpias) */}
            <div className="flex items-center gap-1 overflow-x-auto text-[11px] no-scrollbar pt-0.5">
              {[
                { id: "all", label: "Todas", count: files.length },
                {
                  id: "Decisiones",
                  label: "Decisiones",
                  count: files.filter((f) => f.folder === "Decisiones").length,
                },
                {
                  id: "Cuarentena",
                  label: "Cuarentena",
                  count: files.filter((f) => f.folder === "Cuarentena").length,
                },
                {
                  id: "Auditoria",
                  label: "Auditoría",
                  count: files.filter((f) => f.folder === "Auditoria").length,
                },
              ].map((f) => {
                const isActive = selectedFolder === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFolder(f.id as any)}
                    className={`px-2.5 py-1 rounded-md whitespace-nowrap font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? "bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30 font-medium"
                        : "text-[#8E9893] hover:text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    <span>{f.label}</span>
                    <span className="text-[10px] opacity-70">({f.count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cloud de Tags Semánticos */}
          <div className="px-3.5 py-2 border-b border-white/[0.08] flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-none text-[10px]">
            <span className="text-[#8E9893] font-mono flex items-center gap-1">
              <Tag className="w-2.5 h-2.5" /> Tags:
            </span>
            {selectedTag && (
              <button
                onClick={() => setSelectedTag(null)}
                className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-mono hover:bg-red-500/20"
              >
                Limpiar [x]
              </button>
            )}
            {allTags.slice(0, 6).map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`px-2 py-0.5 rounded font-mono transition-colors cursor-pointer ${
                  selectedTag === tag
                    ? "bg-[#10B981] text-black font-semibold"
                    : "bg-white/[0.04] text-[#8E9893] hover:text-white border border-white/[0.04]"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Lista de Archivos Markdown */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 min-h-0">
            {filteredFiles.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8E9893] font-mono">
                No se encontraron notas en esta consulta.
              </div>
            ) : (
              filteredFiles.map((file) => {
                const isSelected = activeFile.id === file.id;
                const isQuar = file.folder === "Cuarentena";

                return (
                  <div
                    key={file.id}
                    onClick={() => setActiveFileId(file.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer relative group flex-none ${
                      isSelected
                        ? "bg-[#0A0F0C] border-[#10B981]/40 shadow-[0_0_16px_rgba(16,185,129,0.08)]"
                        : "bg-black/20 border-white/[0.04] hover:bg-[#0A0F0C]/80 hover:border-white/[0.1]"
                    }`}
                  >
                    {/* Borde izquierdo activo */}
                    {isSelected && (
                      <div className="absolute left-0 top-2 bottom-2 w-1 bg-[#10B981] rounded-r" />
                    )}

                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-mono font-medium text-[#8E9893] flex items-center gap-1 truncate">
                        {isQuar ? (
                          <AlertTriangle className="w-3 h-3 text-[#F59E0B]" />
                        ) : (
                          <FileText className="w-3 h-3 text-[#10B981]" />
                        )}
                        {file.folder}/{file.id}.md
                      </span>

                      {/* Badge de estado / confianza */}
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                          isQuar
                            ? "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30"
                            : "bg-[#10B981]/10 text-[#34D399] border-[#10B981]/30"
                        }`}
                      >
                        {isQuar ? "CUARENTENA" : `${Math.round(file.confidence * 100)}% CONF`}
                      </span>
                    </div>

                    <h4 className="text-xs font-semibold text-white line-clamp-1 group-hover:text-emerald-300 transition-colors">
                      {file.title}
                    </h4>

                    {/* Fecha y especialista */}
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#8E9893] mt-2 pt-2 border-t border-white/[0.04]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {file.updatedAt}
                      </span>
                      <span className="text-white/40 truncate max-w-[110px]">
                        {file.specialist.split("+")[0]}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUMNA 2: Visor / Editor Técnico de Memoria Markdown (45%)                */}
        {/* ========================================================================= */}
        <div className="flex-1 flex flex-col bg-[#050806] border-r border-white/[0.08] min-h-0 overflow-hidden">
          {/* Barra Superior del Documento con Toggle Renderizado/RAW */}
          <div className="px-6 py-3 border-b border-white/[0.08] bg-[#0A0F0C]/80 flex items-center justify-between gap-3 flex-none">
            <div className="flex items-center gap-2 text-xs font-mono text-[#8E9893] truncate">
              <FolderOpen className="w-3.5 h-3.5 text-[#10B981]" />
              <span className="text-white font-medium">{activeFile.filename}</span>
              <span className="text-white/20">|</span>
              <span className="text-[11px] text-emerald-400">
                {activeFile.wikilinks.length} enlaces bidireccionales
              </span>
            </div>

            {/* Switch de Modo */}
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-black/40 border border-white/[0.08]">
              <button
                onClick={() => setViewMode("rendered")}
                className={`px-2.5 py-1 rounded text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === "rendered"
                    ? "bg-[#10B981]/20 text-[#34D399] font-medium border border-[#10B981]/30"
                    : "text-[#8E9893] hover:text-white"
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Renderizado</span>
              </button>
              <button
                onClick={() => setViewMode("raw")}
                className={`px-2.5 py-1 rounded text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === "raw"
                    ? "bg-[#10B981]/20 text-[#34D399] font-medium border border-[#10B981]/30"
                    : "text-[#8E9893] hover:text-white"
                }`}
              >
                <FileCode className="w-3 h-3" />
                <span>Markdown RAW</span>
              </button>
            </div>
          </div>

          {/* Contenido del Documento con Scroll */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 min-h-0">
            {/* 1. Bloque de Metadatos YAML Frontmatter (Tabla Compacta) */}
            <div className="p-4 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] relative overflow-hidden shadow-subtle flex-none">
              <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-[#10B981]" />
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    YAML Frontmatter & Metadatos Criptográficos
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#10B981]/10 text-[#34D399] border border-[#10B981]/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  FIRMA HMAC-SHA256 VÁLIDA
                </span>
              </div>

              {/* Grid de Metadatos Key-Value */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-[#8E9893] block mb-0.5">UUID / Identificador Único:</span>
                  <div className="flex items-center gap-2 text-white">
                    <span className="truncate">{activeFile.uuid}</span>
                    <button
                      onClick={() => handleCopyText(activeFile.uuid, "uuid")}
                      className="p-1 hover:bg-white/[0.08] rounded text-[#8E9893] hover:text-white transition-colors"
                      title="Copiar UUID"
                    >
                      {copiedUuid ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-[#8E9893] block mb-0.5">Especialista Ejecutor:</span>
                  <span className="text-emerald-400 font-semibold">{activeFile.specialist}</span>
                </div>

                <div>
                  <span className="text-[10px] text-[#8E9893] block mb-0.5">Fecha de Registro:</span>
                  <span className="text-gray-300">{activeFile.createdAt}</span>
                </div>

                <div>
                  <span className="text-[10px] text-[#8E9893] block mb-0.5">Confianza de Inferencia:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 rounded-full bg-black/60 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                        style={{ width: `${Math.round(activeFile.confidence * 100)}%` }}
                      />
                    </div>
                    <span className="text-emerald-400 font-bold">{Math.round(activeFile.confidence * 100)}%</span>
                  </div>
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-white/[0.04]">
                  <span className="text-[10px] text-[#8E9893] block mb-0.5">Hash Criptográfico SHA256:</span>
                  <div className="flex items-center gap-2 text-[11px] text-[#8E9893]">
                    <span className="truncate text-gray-400">{activeFile.hmacSha256}</span>
                    <button
                      onClick={() => handleCopyText(activeFile.hmacSha256, "hash")}
                      className="p-1 hover:bg-white/[0.08] rounded text-[#8E9893] hover:text-white transition-colors"
                      title="Copiar Hash"
                    >
                      {copiedHash ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Banner de Cuarentena y Discrepancia si aplica */}
            {activeFile.isQuarantine && activeFile.contradiction && (
              <div className="p-4 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 space-y-3 flex-none animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#F59E0B]">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>PARÁMETRO EN CUARENTENA: DISCREPANCIA DETECTADA</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F59E0B]/20 text-[#F59E0B]">
                    REQUIERE VALIDACIÓN
                  </span>
                </div>

                <div className="text-xs font-mono space-y-1.5 bg-black/40 p-3 rounded-xl border border-[#F59E0B]/20">
                  <p className="text-[#8E9893]">
                    Parámetro en conflicto:{" "}
                    <span className="text-white font-semibold">{activeFile.contradiction.field}</span>
                  </p>
                  <p className="text-red-400 line-through">
                    Afirmación en Nota: {activeFile.contradiction.noteValue}
                  </p>
                  <p className="text-emerald-400 font-semibold">
                    Evidencia Real PostgreSQL: {activeFile.contradiction.dbValue}
                  </p>
                </div>

                <div className="flex items-center gap-2.5 pt-1">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    onClick={() => handleResolveQuarantine(activeFile.id)}
                  >
                    Resolver y Promover a Hecho
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => showToast("Caso mantenido en cuarentena para auditoría externa.")}
                  >
                    Mantener en Cuarentena
                  </Button>
                </div>
              </div>
            )}

            {/* 3. Renderizado del Cuerpo Markdown o Editor RAW */}
            {viewMode === "rendered" ? (
              <div className="p-6 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] space-y-3 shadow-subtle min-h-[300px]">
                {renderStructuredMarkdown(activeFile.rawMarkdown)}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-black border border-white/[0.08] font-mono text-xs text-gray-300 leading-relaxed overflow-x-auto min-h-[350px]">
                <pre className="whitespace-pre-wrap">{activeFile.rawMarkdown}</pre>
              </div>
            )}

            {/* 4. Enlaces Bidireccionales Relacionados */}
            <div className="p-4 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] space-y-2.5 flex-none">
              <span className="text-xs font-mono font-bold text-[#8E9893] uppercase tracking-wider block">
                Red de Enlaces Bidireccionales del Grafo de Memoria
              </span>
              <div className="flex flex-wrap gap-2">
                {activeFile.wikilinks.map((link) => (
                  <button
                    key={link}
                    onClick={() => {
                      const clean = link.replace(/[\[\]]/g, "");
                      if (files.some((f) => f.id === clean)) {
                        setActiveFileId(clean);
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-black/40 hover:bg-[#10B981]/15 text-[#34D399] border border-white/[0.08] hover:border-[#10B981]/30 font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <BookOpen className="w-3 h-3 text-[#10B981]" />
                    <span>{link}</span>
                    <ArrowRight className="w-2.5 h-2.5 opacity-50" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUMNA 3: Telemetría de Contexto y Preguntas Pendientes (30% / w-96)     */}
        {/* ========================================================================= */}
        <div className="w-full lg:w-[30%] xl:w-96 flex flex-col bg-[#0A0F0C]/80 p-5 space-y-5 overflow-y-auto flex-none min-h-0">
          {/* SECCIÓN A: Medidor de Context Window (contextManager.ts) */}
          <div className="p-4 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] space-y-3.5 flex-none shadow-subtle">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#10B981]" />
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Ventana de Contexto LLM
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#8E9893]">contextManager.ts</span>
            </div>

            {/* Barra de Progreso y Métrica Principal */}
            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-lg font-bold font-mono text-white tabular-nums">
                  {tokenUsage.used.toLocaleString()} <span className="text-xs text-[#8E9893]">/ {tokenUsage.total.toLocaleString()} tokens</span>
                </span>
                <span className="text-xs font-mono font-bold text-[#34D399]">
                  {((tokenUsage.used / tokenUsage.total) * 100).toFixed(1)}%
                </span>
              </div>

              {/* Progress bar con gradiente esmeralda */}
              <div className="w-full h-2 rounded-full bg-black/60 border border-white/[0.06] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(tokenUsage.used / tokenUsage.total) * 100}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-[#10B981] to-[#34D399] rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                />
              </div>
            </div>

            {/* Desglose Granular de Tokens */}
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
              <div className="p-2 rounded-lg bg-black/30 border border-white/[0.04]">
                <span className="text-[#8E9893] block text-[10px]">System Prompt & Reglas:</span>
                <span className="text-white font-semibold tabular-nums">
                  {tokenUsage.systemPrompt.toLocaleString()} tok
                </span>
              </div>
              <div className="p-2 rounded-lg bg-black/30 border border-white/[0.04]">
                <span className="text-[#8E9893] block text-[10px]">Inyecciones Vault RAG:</span>
                <span className="text-[#34D399] font-semibold tabular-nums">
                  {tokenUsage.activeRAG.toLocaleString()} tok
                </span>
              </div>
              <div className="p-2 rounded-lg bg-black/30 border border-white/[0.04]">
                <span className="text-[#8E9893] block text-[10px]">Memoria Efímera Turn:</span>
                <span className="text-amber-400 font-semibold tabular-nums">
                  {tokenUsage.ephemeralTurn.toLocaleString()} tok
                </span>
              </div>
              <div className="p-2 rounded-lg bg-black/30 border border-white/[0.04]">
                <span className="text-[#8E9893] block text-[10px]">Working Buffer:</span>
                <span className="text-gray-300 font-semibold tabular-nums">
                  {tokenUsage.workingBuffer.toLocaleString()} tok
                </span>
              </div>
            </div>

            {/* Botón Compactar Contexto */}
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              icon={<Zap className="w-3.5 h-3.5 text-amber-400" />}
              onClick={handleCompactContext}
            >
              Compactar Contexto & Purgar Tokens
            </Button>
          </div>

          {/* SECCIÓN B: Memoria Episódica & RAG Vectorial */}
          <div className="p-4 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] space-y-2.5 flex-none shadow-subtle">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#10B981]" />
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Memoria Episódica Vectorial
                </span>
              </div>
              <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            </div>

            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between text-[#8E9893]">
                <span>Vector Store:</span>
                <span className="text-white">sqlite-vss (santander-v2)</span>
              </div>
              <div className="flex items-center justify-between text-[#8E9893]">
                <span>Total Vectores:</span>
                <span className="text-[#34D399] font-semibold tabular-nums">1,420 vectores (1536-dim)</span>
              </div>
              <div className="flex items-center justify-between text-[#8E9893]">
                <span>Latencia RAG Promedio:</span>
                <span className="text-white tabular-nums">18.4 ms</span>
              </div>
              <div className="flex items-center justify-between text-[#8E9893]">
                <span>Última Consolidación:</span>
                <span className="text-gray-400">Hoy, 10:45 a. m.</span>
              </div>
            </div>
          </div>

          {/* SECCIÓN C: Preguntas Pendientes del Agente (questions.ts) */}
          <div className="p-4 rounded-2xl bg-[#0A0F0C] border border-white/[0.08] space-y-3 flex-none shadow-subtle">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Preguntas Pendientes del Agente
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-400/10 text-amber-400 border border-amber-400/30">
                {questions.filter((q) => q.status === "pending").length} PENDIENTES
              </span>
            </div>

            <p className="text-[11px] text-[#8E9893]">
              Aclaraciones de negocio solicitadas por la IA para consolidar nuevo conocimiento permanente en el Vault.
            </p>

            <div className="space-y-3 pt-1">
              {questions.map((q) => {
                const isResolved = q.status === "resolved";

                return (
                  <div
                    key={q.id}
                    className={`p-3 rounded-xl border transition-all text-xs space-y-2.5 ${
                      isResolved
                        ? "bg-black/30 border-white/[0.04] opacity-75"
                        : "bg-black/40 border-amber-400/30 hover:border-amber-400/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-amber-400 font-bold">{q.id}</span>
                      <span className="font-mono text-[10px] text-[#8E9893]">{q.contextRef}</span>
                    </div>

                    <h5 className="font-semibold text-white leading-tight">{q.title}</h5>

                    <p className="text-[11px] text-gray-300 leading-relaxed font-sans">{q.question}</p>

                    {isResolved ? (
                      <div className="p-2 rounded-lg bg-[#10B981]/10 border border-[#10B981]/30 text-emerald-400 text-[11px] font-mono flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Validado: {q.selectedOption}</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Opciones Rápidas */}
                        <div className="space-y-1.5">
                          {q.options.map((opt) => (
                            <button
                              key={opt}
                              onClick={() => handleResolveQuestion(q.id, opt)}
                              className="w-full text-left p-2 rounded-lg bg-black/40 hover:bg-[#10B981]/15 text-gray-300 hover:text-emerald-300 border border-white/[0.08] hover:border-[#10B981]/40 text-[11px] font-mono transition-all flex items-center justify-between group cursor-pointer"
                            >
                              <span>{opt}</span>
                              <ChevronRight className="w-3 h-3 text-[#8E9893] group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                            </button>
                          ))}
                        </div>

                        {/* Input libre para el operador */}
                        <div className="flex items-center gap-1.5 pt-1">
                          <input
                            type="text"
                            value={customAnswer[q.id] || ""}
                            onChange={(e) =>
                              setCustomAnswer((prev) => ({ ...prev, [q.id]: e.target.value }))
                            }
                            placeholder="O redacta una instrucción..."
                            className="flex-1 h-7 px-2.5 text-[11px] bg-black/60 border border-white/[0.08] rounded-lg text-white placeholder:text-[#8E9893] focus:outline-none focus:border-[#10B981]/60 font-mono"
                          />
                          <button
                            onClick={() => handleResolveQuestion(q.id)}
                            disabled={!customAnswer[q.id]?.trim()}
                            className="h-7 px-2.5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-black font-mono text-[10px] font-bold disabled:opacity-40 transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Send className="w-2.5 h-2.5" />
                            <span>Fijar</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="text-[10px] font-mono text-[#8E9893] border-t border-white/[0.04] pt-1.5">
                      Impacto: {q.impactDescription}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
