# 🔍 AUDITORÍA TÉCNICA DE LA CAPA DE DATOS (DATA LAYER AUDIT)
**Proyecto:** Mint CLI & Autonomous AI Back Office  
**Fecha de Actualización:** 27 de Octubre de 2026 (Revisión de Realidad vs. Documentación)  
**Rama de Trabajo:** `developDiego`  
**Estado:** Auditado y Actualizado con Estado Real de Implementación  

---

## 1. ESTADO ACTUAL: QUÉ EXISTE REALMENTE EN EL REPOSITORIO

La capa de datos e ingesta evolucionó considerablemente dentro del monorepo (`@mint/ingest` y `@mint/core`). Actualmente se compone de 14 módulos especializados:

### 1.1 Ingesta Multi-Fuente (`packages/ingest/src`)
- **`csvParser.ts`**: Parsing tolerante con detección de delimitador (`,`, `;`, `\t`) y soporte de strings entrecomillados.
- **`excelParser.ts`**: Parsing de hojas de cálculo Excel (`.xlsx`, `.xls`) extrayendo filas y normalizando encabezados.
- **`jsonSource.ts`**: Ingesta e introspección de estructuras de datos JSON jerárquicas o tabulares.
- **`columnMapper.ts`**: Heurística regex (`FIELD_PATTERNS`) con cálculo de confianza para mapeo de atributos canónicos de inventario.
- **`sqliteSource.ts`**: Conector seguro en solo lectura para introspección y lectura de archivos `.db` / `.sqlite` locales.
- **`sqlServerSource.ts`**: Validador de conectividad TCP y lectura para bases de datos SQL Server empresariales.
- **`postgresSource.ts`**: Pool de conexión en solo lectura con `SET TRANSACTION READ ONLY` y timeout de 5s.
- **`restApiSource.ts`**: Adaptador para sincronización de datos vía endpoints REST de sistemas externos.
- **`localDiscovery.ts`**: Explorador de archivos del entorno de trabajo autorizado (`.csv`, `.xlsx`, `.sqlite`, `.json`).
- **`sanitizer.ts`**: Filtro de desinfección contra prompt injection, inyecciones SQL y caracteres de control antes de almacenar en BD.
- **`syncEngine.ts`**: Motor central de sincronización idempotente con fingerprinting, detección de drift y control de borrados.

### 1.2 Detección de Cambios y Vigilancia (`packages/daemon`)
- **`watcher.ts`**: `fs.watch` nativo sobre carpetas vigiladas con debounce de 600ms para evitar colisiones de escritura.
- **`triggers.ts`**: Escaneo continuo de quiebres de inventario (`scanStockDeficits`), envíos vencidos (`scanDelayedShipments`) y generación del briefing diario.

### 1.3 Esquemas de Persistencia (`packages/core/src/db/schema`)
- **`data_sources`**: Registro unificado de fuentes (`id`, `company_id`, `name`, `source_type`, `uri_or_path`, `config`, `is_active`, `last_synced_at`, `status`).
- **`import_jobs`**: Historial de lotes con métricas de filas importadas, fallidas y payload de errores.
- **`mint_quarantine_records`**: Registros anómalos aislados para revisión humana sin contaminar el inventario activo.
- **`mint_pending_questions`**: Dudas operacionales y datos faltantes no inferibles.

---

## 2. MATRIZ DE GAPS: PLAN VS. REALIDAD IMPLEMENTADA

| Gap / Característica | Estado Real | Dónde Vive en el Código | Detalle de la Realidad |
| :--- | :---: | :--- | :--- |
| **Gap 1: Duplicación de Fuentes** | ✅ **Resuelto** | `packages/ingest/src/syncEngine.ts` | Se calcula un hash/fingerprint de la fuente. Múltiples sincronizaciones reutilizan el mismo `dataSourceId`. |
| **Gap 2: Detección de Borrados** | ✅ **Resuelto** | `packages/ingest/src/syncEngine.ts` | Compara claves de registros anteriores vs actuales y marca en cuarentena u observación los no presentes. |
| **Gap 3: Avalancha de Eventos** | ⚠️ **Mitigado** | `packages/daemon/src/watcher.ts` + `vault/outbox_queue.json` | Se agregaron colas locales y debounces, pero cargas masivas simultáneas aún pueden encolar múltiples eventos. |
| **Gap 4: Schema Drift** | ✅ **Resuelto** | `packages/ingest/src/syncEngine.ts` | Detecta si las columnas cambiaron; si faltan columnas críticas, la fuente pasa a `status = 'DRIFTED'`. |
| **Gap 5: Guardrail de Frescura** | ✅ **Resuelto** | `packages/core/src/policy/policyEngine.ts` | Regla determinista `RULE_STALE_DATA_REFUSAL`: Si los datos superan la ventana máxima o la fuente está en drift, se escala a HITL. |
| **Gap 6: Fallback a SQLite/PGlite** | ❌ **NO IMPLEMENTADO** | `packages/core/src/db/` | **El archivo `portableDb.ts` NUNCA fue creado.** El proyecto mantiene una dependencia dura e ineludible de PostgreSQL (local en Docker o nube en Supabase). |
| **Gap 7: Auto-Descubrimiento** | ✅ **Resuelto** | `packages/ingest/src/localDiscovery.ts` y `sqliteSource.ts` | Introspección de tablas SQLite y archivos de datos locales disponible vía CLI. |
| **Gap 8: Sanitización de Inputs** | ✅ **Resuelto** | `packages/ingest/src/sanitizer.ts` | Neutraliza prompt injections y caracteres maliciosos en celdas de texto importadas. |

---

## 3. ESTADO DE LOS COMANDOS CLI DE FUENTES (`mint source`)

Los comandos definidos en el plan de acción están operativos en [`packages/cli/src/commands/source.ts`](file:///c:/Users/andre/OneDrive/Escritorio/proyectos/PLATICA/ai-back-office/packages/cli/src/commands/source.ts):

* `mint source discover [path]`: Escanea y detecta archivos de negocio en el directorio local.
* `mint source inspect <id|path>`: Muestra cabeceras, tipo de datos detectado y propuesta de mapeo.
* `mint source sync [id]`: Ejecuta la sincronización idempotente con detección de drift.
* `mint source status`: Lista las fuentes conectadas, su estado de salud (`HEALTHY`, `DRIFTED`, `ERROR`) y la última fecha de sincronización.

---

## 4. DEUDA TÉCNICA PENDIENTE DE LA CAPA DE DATOS

1. **Dependencia de Infraestructura Externa (PostgreSQL):** Al no haberse implementado el storage portable local (`portableDb.ts`), los desarrolladores y usuarios finales requieren obligatoriamente tener un motor PostgreSQL en ejecución (mediante Docker Desktop o un proveedor Cloud como Supabase/Neon).
2. **Sincronización de Migraciones:** Para que las entidades `mint_*` (quarantine, pending questions, sales orders) funcionen en bases de datos locales limpias, se debe ejecutar `drizzle-kit push` apuntando al esquema unificado del monorepo (`packages/core/src/db/schema/index.ts`).
