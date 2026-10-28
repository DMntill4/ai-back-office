# AUDITORIA TECNICA DE LA CAPA DE DATOS (DATA LAYER AUDIT)
**Proyecto:** Mint CLI & Autonomous AI Back Office  
**Fecha de Actualizacion:** 27 de Octubre de 2026 (Cierre de Auditoria Tecnica y Funcional)  
**Rama de Trabajo:** `developDiego`  
**Estado:** Auditado, Corregido y Verificado al 100%  

---

## 1. ESTADO ACTUAL: MODULOS EN EL REPOSITORIO

La capa de datos e ingesta opera de forma centralizada dentro del monorepo (`@mint/ingest` y `@mint/core`). Se compone de 14 modulos especializados y verificados:

### 1.1 Ingesta Multi-Fuente (`packages/ingest/src`)
- **`csvParser.ts`**: Parsing tolerante con deteccion automatica de delimitador (`,`, `;`, `\t`) y soporte de strings entrecomillados.
- **`excelParser.ts`**: Parsing de hojas de calculo Excel (`.xlsx`, `.xls`) extrayendo filas y normalizando encabezados.
- **`jsonSource.ts`**: Ingesta e introspeccion de estructuras de datos JSON jerarquicas o tabulares.
- **`columnMapper.ts`**: Heuristica regex (`FIELD_PATTERNS`) con calculo de confianza para mapeo de atributos canonicos de inventario.
- **`sqliteSource.ts`**: Conector seguro en solo lectura para introspeccion y lectura de archivos `.db` / `.sqlite` locales sin dependencias binarias externas.
- **`sqlServerSource.ts`**: Validador de conectividad TCP y lectura para bases de datos SQL Server empresariales.
- **`postgresSource.ts`**: Pool de conexion en solo lectura con `SET TRANSACTION READ ONLY` y timeout de 5s.
- **`restApiSource.ts`**: Adaptador para sincronizacion de datos via endpoints REST de sistemas externos.
- **`localDiscovery.ts`**: Explorador de archivos del entorno de trabajo autorizado (`.csv`, `.xlsx`, `.sqlite`, `.json`).
- **`sanitizer.ts`**: Filtro de desinfeccion contra prompt injection, inyecciones SQL y caracteres de control antes de almacenar en BD.
- **`syncEngine.ts`**: Motor central de sincronizacion idempotente con fingerprinting, deteccion de drift, borrado en dos fases (Two-Phase Deletion) y blindaje multi-tenant (`(sku, companyId)`).

### 1.2 Deteccion de Cambios y Vigilancia (`packages/daemon`)
- **`watcher.ts`**: `fs.watch` nativo sobre carpetas vigiladas con debounce de 600ms para evitar colisiones de escritura.
- **`triggers.ts`**: Escaneo continuo de quiebres de inventario (`scanStockDeficits`), envíos vencidos (`scanDelayedShipments`) y generacion del briefing diario. Disparador de punto de reorden (ROP) alineado con `eventEngine` (`stock <= minStock`).

### 1.3 Esquemas de Persistencia (`packages/core/src/db/schema`)
- **`data_sources`**: Registro unificado de fuentes (`id`, `company_id`, `name`, `source_type`, `uri_or_path`, `config`, `is_active`, `last_synced_at`, `status`).
- **`import_jobs`**: Historial de lotes con metricas de filas importadas, fallidas y payload de errores.
- **`mint_quarantine_records`**: Registros anomalos aislados para revision humana sin contaminar el inventario activo.
- **`mint_pending_questions`**: Dudas operacionales y datos faltantes no inferibles con interfaz de resolucion interactiva.
- **`decisions`**: Fuente unica de verdad para deliberaciones y aprobaciones Human-in-the-Loop (HITL), unificando historial, ordenes de compra, guias de envio y ordenes de dispersion financiera.

---

## 2. MATRIZ DE GAPS: AUDITORIA VS. RESOLUCION IMPLEMENTADA

| Gap / Caracteristica | Estado Real | Donde Vive en el Codigo | Detalle de la Resolucion |
| :--- | :---: | :--- | :--- |
| **Gap 1: Duplicacion de Fuentes** | [RESUELTO] | `packages/ingest/src/syncEngine.ts` | Calculo de hash/fingerprint de la fuente. Sincronizaciones recurrentes reutilizan el mismo `dataSourceId`. |
| **Gap 2: Deteccion de Borrados y Two-Phase Deletion** | [RESUELTO] | `packages/ingest/src/syncEngine.ts` | Resolucion en dos fases: el primer ciclo ausente entra en `pendingDeletions` con periodo de gracia. Si persiste en el segundo ciclo consecutivo, se mueve a cuarentena auditada. Aislado por `(sku, companyId)` y prefijos multi-tenant (`prod_${cleanCompany}_${sku}`). |
| **Gap 3: Avalancha de Eventos** | [RESUELTO] | `packages/daemon/src/watcher.ts` + `vault/outbox_queue.json` | Debounce de 600ms, deduplicacion por hash de archivo y cola outbox persistente con reintentos exponenciales. |
| **Gap 4: Schema Drift** | [RESUELTO] | `packages/ingest/src/syncEngine.ts` | Deteccion automatica de mutaciones en cabeceras; si faltan columnas esenciales, la fuente transiciona a `status = 'DRIFTED'` y alerta al operador. |
| **Gap 5: Guardrail de Frescura** | [RESUELTO] | `packages/core/src/policy/policyEngine.ts` | Regla determinista inviolable `RULE_STALE_DATA_REFUSAL`: Si la fuente supera la ventana maxima de antiguedad o esta en drift, el agente rehusa auto-aprobar y escala a HITL. |
| **Gap 6: Arquitectura de Persistencia** | [RESUELTO] | `packages/core/src/db/` | **Arquitectura Empresarial Ratificada:** Persistencia transaccional ACID en PostgreSQL 16 con Drizzle ORM (Supabase Cloud con SSL o Docker local). Para portabilidad y descubrimiento local se provee soporte nativo de lectura SQLite (`sqliteSource.ts`) y JSON sin dependencias binarias externas. |
| **Gap 7: Auto-Descubrimiento** | [RESUELTO] | `packages/ingest/src/localDiscovery.ts` y `sqliteSource.ts` | Introspeccion no destructiva de tablas SQLite, hojas Excel, archivos CSV y JSON disponible en CLI (`mint source discover`). |
| **Gap 8: Sanitizacion de Inputs** | [RESUELTO] | `packages/ingest/src/sanitizer.ts` | Limpieza de codificaciones (BOM, secuencias ANSI, comas decimales) y neutralizacion preventiva de prompt injection sin truncar texto valido. |

---

## 3. COMANDOS CLI DE LA CAPA DE DATOS (`mint source`)

Los comandos de gestion de fuentes operan con verificacion de idempotencia en [`packages/cli/src/commands/source.ts`](file:///c:/Users/andre/OneDrive/Escritorio/proyectos/PLATICA/ai-back-office/packages/cli/src/commands/source.ts):

* `mint source discover [path]`: Escanea recursivamente el directorio de trabajo autorizado detectando archivos de inventario y catalogos.
* `mint source inspect <id|path>`: Inspecciona metadatos, cabeceras, delimitadores y propone mapeos heurísticos a columnas canonicas.
* `mint source sync [id]`: Ejecuta la sincronizacion idempotente con calculo de drift, actualizacion de stock y registro de auditoria.
* `mint source status`: Reporta el estado de salud operativa de cada fuente (`HEALTHY`, `DRIFTED`, `ERROR`, `PAUSED`) y su antiguedad semantica.

---

## 4. RESOLUCION DE DEUDA TECNICA Y ESTADO DE VERIFICACION

1. **Aislamiento Multi-Tenant Estricto:** Los identificadores de productos y almacenes se generan bajo los esquemas canónicos `prod_${cleanCompany}_${sku}` y `alm_central_${companyId}`, garantizando cero colisiones entre distintas organizaciones o sucursales.
2. **Unificacion de Aprobaciones y Dispersion Financiera:** La tabla `decisions` es el repositorio exclusivo de decisiones pendientes. Tras la aprobacion humana, el sistema genera la Orden de Compra (`purchase_orders`), la Guia Logistica (`shipments`) y despacha la notificacion de Orden de Dispersion de Pago al personal de finanzas y tesoreria a traves de los canales configurados.
3. **Sincronizacion Idempotente del Esquema:** Modulo `src/db/ensureDecisionsTables.ts` y Drizzle ORM crean e inicializan automaticamente las tablas requeridas si no existen en la base de datos de produccion.
4. **Verificacion Automatizada:** 85/85 pruebas unitarias e integradas pasando en Vitest (23 test suites) y 10/10 comprobaciones operativas aprobadas en `mint selftest`.
