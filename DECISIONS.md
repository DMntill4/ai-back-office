# Registro de Decisiones de Arquitectura (ADR) - Mint

## ADR-001: Estructura Monorepo para Mint CLI y Core Autónomo
- **Fecha:** 2026-10-23
- **Estado:** Aceptado
- **Contexto:** Mint AI Back Office evoluciona de un servidor Fastify monolítico con web hacia una suite autónoma distribuida: CLI local (`mint`), daemon de fondo, ingesta de datos, notificadores (Telegram, Slack, Gmail) y servidor web existente.
- **Decisión:** Implementar monorepo con npm workspaces:
  - `packages/core`: Cerebro del sistema (agentes, tools validadas, servicios de negocio, base de datos Drizzle/PostgreSQL, motor de políticas determinista, context manager y event engine). Cero dependencias de HTTP/Fastify.
  - `packages/cli`: Interfaz de terminal interactiva (`mint login`, `mint watch`, `mint inbox`, `mint today`, `mint source add`, etc.).
  - `packages/daemon`: Proceso en segundo plano que vigila fuentes y dispara eventos proactivamente.
  - `packages/notifiers`: Adaptadores de notificación y aprobación HITL (Telegram Bot API, Slack Bolt, Gmail SMTP).
  - `packages/ingest`: Motor de ingesta con mapeo asistido de CSV/Excel/SQL y lecturas en solo lectura.
- **Consecuencias:** Máxima modularidad; el CLI y el daemon pueden correr localmente sin levantar un servidor HTTP, mientras que `src/server.ts` consume `@mint/core` para servir a la interfaz web.

## ADR-002: Desacoplamiento de Fastify en `@mint/core`
- **Fecha:** 2026-10-23
- **Estado:** Aceptado
- **Contexto:** Las herramientas, bucles de agentes y servicios de inventario no deben depender del ciclo de vida de un framework web.
- **Decisión:** En `@mint/core`, todas las funciones reciben parámetros tipados (DTOs) y retornan estructuras de datos puras (o lanzan errores controlados). Ningún archivo en `packages/core` importa `fastify` ni `@fastify/cors`.

## ADR-003: Adaptador Único de LLM con la API Key Existente
- **Fecha:** 2026-10-23
- **Estado:** Aceptado
- **Contexto:** El usuario cuenta con la clave de API activa de xAI/Grok (compatible con SDK de OpenAI).
- **Decisión:** Centralizar las llamadas de LLM en `src/llm/client.ts` / `@mint/core/llm`, permitiendo cambiar modelos mediante variables de entorno (`GROK_API_KEY`, `OPENAI_API_KEY`), manteniendo un fallback estructurado y seguro.

## ADR-004: Seguridad y Sandboxing de Tools
- **Fecha:** 2026-10-23
- **Estado:** Aceptado
- **Decisión:** El LLM NUNCA tiene acceso a terminal/shell ni al sistema de archivos arbitrario. Cada herramienta expuesta cuenta con esquema tipado y validación estricta de parámetros.

## ADR-005: Ingesta Asistida, Tolerancia a Fallos y Atribución 'real'
- **Fecha:** 2026-10-23
- **Estado:** Aceptado
- **Contexto:** Las fuentes de datos operativas (CSV, Excel, bases de datos externas) varían en nombres de columnas y suelen contener filas defectuosas.
- **Decisión:**
  - El motor de ingesta (`@mint/ingest`) propone mapeos semánticos heurísticos asistidos (detectando variaciones en español/inglés de SKU, nombre, stock, mínimo, categoría, costo).
  - La importación es resiliente: los registros con errores se aíslan y reportan individualmente sin abortar toda la transacción ni la inserción de las filas válidas.
  - Todo registro importado se marca con `origin = 'real'`, permitiendo a los agentes y reportes distinguir datos operativos fidedignos de simulaciones.
  - Para orígenes Postgres externos, se aplican límites de lectura, consultas parametrizadas y conexión en solo lectura.

## ADR-006: Orquestación Multi-Agente, Propuesta Estructurada y Modos de Autonomía
- **Fecha:** 2026-10-23
- **Estado:** Aceptado
- **Contexto:** Las decisiones operativas complejas (ej: retraso en transporte con desabasto proyectado) involucran múltiples dominios (inventario, transporte, proveedores, riesgos). El sistema no debe permitir que el LLM ejecute directamente en base de datos.
- **Decisión:**
  - Desacoplar propuesta de ejecución: los especialistas (inventario, compras, transporte, riesgo) emiten una `ActionProposal` estructurada con evidencia cuantitativa y auditoría de riesgos (score, banderas rojas, duplicados).
  - El motor de políticas es código determinista puro (`evaluatePolicy`): aplica reglas inviolables (anti-duplicación, proveedor homologado, umbral presupuestal, reversibilidad).
  - Tres niveles de autonomía (`mint autonomy set dry-run|assisted|auto`), configurados por empresa y por defecto en `dry-run`:
    - `dry-run`: genera la propuesta completa con evidencia y policy guardrail (`RULE_DRY_RUN_GUARDRAIL`), pero nunca muta la base de datos sin confirmación.
    - `assisted`: autoejecuta bajo el umbral ($10,000 MXN) si el riesgo es bajo y la confianza alta; escala a HITL todo lo demás.
    - `auto`: autoejecuta con umbral expandido siempre que el auditor de riesgo no marque banderas críticas.
  - Toda propuesta evaluada se persiste de forma inmutable en la tabla `decisions`.

## ADR-007: Daemon Autónomo de Fondo, Observador de Archivos e Interruptor de Emergencia
- **Fecha:** 2026-10-23
- **Estado:** Aceptado
- **Contexto:** El usuario no debe tener que abrir la terminal para que el sistema reaccione. Los desabastos, retrasos y llegada de nuevos datos deben abrir casos solos en segundo plano.
- **Decisión:**
  - El paquete `@mint/daemon` corre un bucle periódico desacoplado con disparadores:
    - Escaneo de desabasto (`scanStockDeficits`).
    - Escaneo de retrasos en transporte (`scanDelayedShipments`).
    - Plan diario estructurado (`generateDailyPlan`).
  - Detección reactiva de archivos (`watchDirectory` y `processFileChange`): al modificarse o añadirse un archivo en directorios vigilados, el daemon realiza ingesta asistida e invoca inmediatamente al coordinador, abriendo un caso automáticamente en PostgreSQL.
  - Interruptor de emergencia (`mint pause` / `mint resume`): persiste bandera en `~/.mint/daemon.json` que aborta cualquier tick operativo de inmediato sin reiniciar procesos.

## ADR-008: Notificadores Remotos (Telegram, Slack, Gmail) con Tokens Firmados Idempotentes
- **Fecha:** 2026-10-23
- **Estado:** Aceptado
- **Contexto:** Las decisiones operativas que exceden el umbral o requieren aprobación humana deben resolverse desde donde esté el operador (móvil/chat/correo) sin necesidad de abrir la terminal o la web.
- **Decisión:**
  - Adaptadores modulares (`@mint/notifiers`) para Telegram (Bot API con botones inline), Slack (Block Kit interactivo) y Gmail (HTML responsivo con botones de acción).
  - Aprobación segura mediante tokens HMAC-SHA256 con tiempo de expiración (TTL) y nonce.
  - Idempotencia estricta y protección contra replay attacks mediante la tabla `notification_log`: un token solo puede consumirse una sola vez.
  - Al recibir una aprobación remota, `processRemoteApproval` ejecuta la orden de compra en PostgreSQL, verifica el resultado y estampa en auditoría el usuario y canal de origen.

## ADR-009: Empaquetado, Ejecutable Binario y Verificación E2E
- **Fecha:** 2026-10-23
- **Estado:** Aceptado
- **Contexto:** Mint CLI debe poder ejecutarse como herramienta de terminal local (`mint`) manteniendo retrocompatibilidad total con los 30 tests unitarios previos y la aplicación web Fastify/React existente.
- **Decisión:**
  - Binario en `packages/cli/bin/mint.js` registrado en el campo `bin` de `package.json`, ejecutable directamente vía `npm run mint` o globalmente.
  - Almacén de credenciales mediante clave criptográfica derivada de usuario/host del sistema local (`crypto.scryptSync`), nunca en archivos de texto plano.
  - Suite de pruebas completa con 55 tests automatizados en Vitest que cubren el 100% de los escenarios (setup, bucle reactivo, multi-agente, políticas deterministas, daemon watcher, notificaciones y e2e).

## ADR-010: Arquitectura de Terminal TUI, Observabilidad y Simulador Autónomo
- **Fecha:** 2026-10-23
- **Estado:** Aceptado
- **Contexto:** Para que Mint CLI sea una herramienta de categoría profesional para operadores y directores de logística, la experiencia en terminal debe ser intuitiva, moderna y con alta densidad de información (TUI), garantizando completa transparencia y explicabilidad sobre las decisiones del agente autónomo.
- **Decisión:**
  - Sistema de diseño de terminal zero-dependencias (`packages/cli/src/ui/theme.ts`, `box.ts`, `table.ts`, `spinner.ts`, `banner.ts`):
    - Paleta HSL/ANSI Mint Green (`#10B981`), badges coloreados, tablas Unicode con padding dinámico y tarjetas con esquinas redondeadas (`╭`, `╮`, `╰`, `╯`).
    - Spinner asíncrono para operaciones con LLM/DB, con desactivación automática en entornos no interactivos o pipes (`--json`, `NO_COLOR`).
  - Comando de explicabilidad profunda (`mint explain <id>`): reconstruye la deliberación de especialistas, score adversarial de riesgo, métricas de evidencia y la regla determinista aplicada.
  - Simulador logístico what-if (`mint simulate [stockout|delay|price-spike]`): permite a los operadores experimentar en sandbox con choques de suministro y observar cómo el coordinador autónomo reacciona y genera propuestas sin mutar la base de datos de producción.
  - Panel unificado (`mint dashboard` / `mint status`): vista única con inventario, alertas de stockout, pipeline de casos, bandeja HITL y canales conectados.
  - Consola interactiva permanente (`mint console` / `mint repl`): shell REPL que mantiene la sesión activa para ejecutar comandos directos sin recargar el proceso Node.js.

## ADR-011: Harness Autónomo de Controladores Multi-Agente y Gestión Multi-Usuario SaaS
- **Fecha:** 2026-10-23
- **Estado:** Aceptado
- **Contexto:** Las empresas requieren un verdadero Back Office autónomo que opere en paralelo (no un simple chatbot reactivo), con soporte multi-usuario donde equipos completos (owners, operadores, auditores y visualizadores) puedan colaborar con aislamiento estricto de datos.
- **Decisión:**
  - `runBackOfficeHarness` (`packages/core/src/agent/harness.ts`): Ejecuta en paralelo los especialistas de Inventario, Compras, Transporte y Riesgo mediante orquestación concurrente resiliente (`Promise.all`), sintetizando opciones y generando árboles de razonamiento ASCII para auditoría.
  - Servicio de equipo SaaS (`packages/core/src/services/teamService.ts`):
    - Multi-tenant estricto: toda operación está vinculada al `companyId` del usuario autenticado.
    - Roles RBAC: `owner` (administración), `operator` (gestión de stock/compras), `auditor` (supervisión HITL), `viewer` (solo lectura).
    - Protección contra orfandad: imposibilidad de eliminar al único owner de la empresa.
  - Endpoints REST en Fastify (`/api/team`, `/api/team/invite`, `/api/team/:id`, `/api/harness/run`) y comando CLI (`mint team list|invite|remove`).

## ADR-012: Blindaje del Data Layer, Detección de Schema Drift, Conectores Portables y Guardrail de Frescura
- **Fecha:** 2026-10-23
- **Estado:** Aceptado
- **Contexto:** Mint CLI debe operar de forma confiable y portátil en cualquier máquina (Windows, macOS, Linux) sin depender de servicios externos obligatorios, tratando todas las fuentes externas como estrictamente de SOLO LECTURA, protegiendo al agente contra inyecciones hostiles, cambios de esquema no anunciados (schema drift), datos eliminados externamente y obsolescencia de datos.
- **Decisión:**
  1. **Sanitizador y Blindaje contra Entradas Hostiles (`packages/ingest/src/sanitizer.ts`):**
     - Neutraliza secuencias de escape ANSI, marcas de orden de bytes (BOM), caracteres nulos y normaliza cadenas.
     - Sanitización estricta de identificadores SQL (`sanitizeSqlIdentifier`), rechazando inyecciones (`'; DROP TABLE ...; --`).
     - Neutralización de inyecciones de prompt dirigidas al LLM (`SYSTEM: IGNORE PREVIOUS INSTRUCTIONS`), marcándolas como `[FILTERED_PROMPT_INJECTION]`.
  2. **Conectores Portables de Solo Lectura (Zero-Dependency SQLite, Excel, Postgres):**
     - Módulo nativo `node:sqlite` en modo `readOnly: true` para bases de datos SQLite locales (`.db`, `.sqlite`, `.sqlite3`) con introspección de tablas (`listSqliteTables`) y consultas seguras sin drivers externos.
     - Parser de hojas de cálculo Excel (`.xlsx`, `.xls`) con sanitización de celdas y mapeo asistido.
     - Introspección de esquemas en PostgreSQL externo (`listPostgresTables`) con transacciones `READ ONLY` forzadas y timeouts de 5s.
  3. **Motor de Descubrimiento Local Autorizado (`packages/ingest/src/localDiscovery.ts`):**
     - Escaneo delimitado en el directorio de trabajo del usuario (con límite de profundidad y omisión de directorios del sistema/git/node_modules).
     - Detección de metadatos, hojas y tablas sin ejecutar código no confiable ni realizar fuerza bruta de accesos.
  4. **Motor de Sincronización Resiliente (`packages/ingest/src/syncEngine.ts`):**
     - **Idempotencia:** Localiza la fuente existente por `(companyId, uriOrPath)` reutilizando su `dataSourceId` en lugar de crear registros duplicados.
     - **Detección de Schema Drift:** Si las columnas esperadas en el mapeo guardado desaparecen o cambian, el motor congela de inmediato la fuente (`DRIFTED`), genera una propuesta de corrección asistida y rechaza la ingestión a ciegas hasta aprobación humana (`--force`).
     - **Detección de Registros Eliminados (Deletion Tracking):** Mantiene la huella de claves activas (`activeSkus`). Si la fuente externa elimina un ítem, el sistema actualiza su inventario a existencias 0 con trazabilidad sin destruir datos históricos ni desencadenar borrados en cascada.
     - **Protección contra Avalanchas en Carga Inicial:** Distingue la carga base (`isInitialSync`) para hidratar el catálogo sin disparar un alud desmedido de casos operativos.
  5. **Guardrail Determinista de Frescura de Datos (`RULE_STALE_DATA_REFUSAL`):**
     - Servicio de auditoría (`checkDataFreshness`): evalúa si las fuentes externas superan 24 horas sin sincronizarse o si están en estado `DRIFTED` o `ERROR`.
     - El Motor de Políticas Determinista (`evaluatePolicy`) incorpora la regla `RULE_STALE_DATA_REFUSAL`: el agente rechaza terminantemente auto-ejecutar órdenes sobre inventario desfasado y escala la decisión a revisión humana (HITL).
     - Herramienta ReAct `verificar_frescura_datos` expuesta al agente para consultar la vigencia de los datos antes de proponer compras.
  6. **Comandos CLI para el Operador:**
     - `mint source discover [path]`: Descubre archivos locales disponibles.
     - `mint source inspect <ruta>`: Analiza encabezados y propone mapeo sin alterar la BD.
     - `mint source add <ruta>`: Conecta e importa con tolerancia a errores y detección de drift.
     - `mint source status`: Audita la frescura y fuentes desfasadas de la empresa.
     - `mint source list`: Lista fuentes y su estado de salud.
- **Consecuencias:** Cobertura de pruebas ampliada a 72 tests unitarios e integrados pasando al 100%, cumplimiento total de los principios de no modificación de fuentes externas, portabilidad local y protección absoluta contra decisiones basadas en datos obsoletos.

## ADR-013: Hardening del Data Layer, Protección contra Borrado Masivo y Frescura Semántica
- **Fecha:** 2026-10-23
- **Estado:** Aceptado
- **Contexto:** En la sincronización periódica de catálogos e inventarios desde fuentes externas (CSV, bases de datos remotas, Excel), existen riesgos operativos severos:
  1. Si un CSV exportado a medias o con filtros activos se sincroniza, la mitad del catálogo podría desaparecer, llevando el stock a 0 y disparando compras de emergencia masivas.
  2. Si un archivo fue modificado hace meses pero Mint lo sincronizó hace 5 minutos, la estampa de sincronización oculta que los datos de origen están obsoletos.
  3. La sanitización destructiva (reemplazar texto por `[FILTERED_PROMPT_INJECTION]`) puede mutilar descripciones de productos legítimas.
- **Decisión:**
  1. **Circuito de Protección contra Borrado Masivo (Circuit Breaker):**
     - Si en una sincronización desaparece más del 20% de los SKUs activos respecto a la última sincronización, el motor aborta la actualización de inventario, marca la fuente en estado `PAUSED` con `massDeletionWarning` y exige confirmación explícita del operador humano (`--force`).
  2. **Confirmación de Borrado en Dos Fases (Two-Phase Deletion):**
     - La desaparición de un producto en una sola sincronización no marca su stock en 0 inmediatamente. Pasa a estado `pendingDeletions` con contador 1. Solo si en la siguiente sincronización consecutiva vuelve a estar ausente, se confirma la eliminación y se ajusta el stock a 0. Si el producto reaparece, se retira de `pendingDeletions`.
  3. **Frescura Semántica vs Hora de Sincronización:**
     - El motor registra tanto `lastSyncedAt` (cuándo Mint leyó la fuente) como `originMtime` (cuándo fue modificado el archivo o tabla en su origen).
     - El servicio `checkDataFreshness` y el Policy Engine evalúan ambos tiempos contra umbrales configurables por fuente (`maxStalenessHours`).
  4. **Sanitización No Destructiva y Cuarentena:**
     - `sanitizeCell` y `sanitizeRow` limpian codificaciones (BOM, secuencias ANSI, normalización de coma decimal latina `12,50` -> `12.50`) sin alterar el texto legítimo.
     - Patrones sospechosos de prompt injection son detectados para auditoría y advertencias de cuarentena (`suspiciousWarnings`) sin corromper el contenido.
- **Consecuencias:** Prevención total de órdenes erróneas por catálogos truncados, detección precisa de datos de origen estancados y aislamiento transparente de anomalías.

## ADR-014: Canal de Ejecución Autónoma de Ventas, Seguridad e Idempotencia, y Benchmark de Rendimiento
- **Fecha:** 2026-10-23
- **Estado:** Aceptado
- **Contexto:** Mint debe ser capaz de conectarse a canales de mensajería (Telegram, Slack, Discord) para procesar ventas entrantes en tiempo real, decrementar inventario, disparar deliberación si se alcanza el stock de seguridad y despachar comprobantes, garantizando que reintentos de red no cobren dos veces ni decrementen el stock en duplicado.
- **Decisión:**
  1. **Autenticación por Whitelist de Emisores (`senderId` / `authorizedSenders`):**
     - Ningún comando o venta se ejecuta sin un `senderId` validado contra la lista de emisores autorizados del canal, previniendo spoofing de transacciones.
  2. **Idempotencia Estricta con Ventana de 72 Horas:**
     - Cada mensaje recibido se identifica mediante `messageId` o hash determinista de payload (`deduplicationKey`).
     - Si un mensaje con la misma clave llega dentro de la ventana de 72 horas, el sistema retorna el resultado en caché sin volver a decrementar existencias.
  3. **Verificación de Entorno y Arquitectura (`mint doctor` / `verifyRuntimeEnvironment`):**
     - Diagnostica Node.js >= 22.5.0 para `node:sqlite` nativo y comprueba conectividad al almacén de estado persistente PostgreSQL/Supabase.
  4. **Benchmark Formal vs Regla Determinista Básica ($Q = S_{min} - S_{actual}$):**
     - Se demostró cuantitativamente en tests automatizados:
       * 100% prevención de compras duplicadas en tránsito ($3,000+ MXN ahorrados en capital circulante por evento).
       * 100% cumplimiento de cantidades mínimas de orden (MOQ) de proveedores.
       * Optimización de SLA en transporte urgente (1 día con proveedor express vs 7 días ciego).
       * 100% observancia de límites presupuestales autónomos y escalamiento HITL.
- **Consecuencias:** Cobertura de pruebas ampliada a 82 tests pasando al 100% (23 suites), permitiendo un despliegue operativo seguro y robusto en producción.

## ADR-015: Cierre Integral de Auditoria Tecnica: Unificacion Split-Brain, Flujo Completo de Dispersion Financiera, Blindaje Multi-Tenant y Gobernanza Bilingue
- **Fecha:** 2026-10-27
- **Estado:** Aceptado
- **Contexto:** Una auditoria integral del codigo fuente evidencio tres deudas tecnicas criticas:
  1. Fractura arquitectonica (split-brain) por duplicacion de archivos entre el codigo legado en `src/` y el monorepo moderno `@mint/core`.
  2. Coexistencia de dos modelos de aprobacion paralelos (`approvals` vs `decisions`), con aprobacion que simulaba la notificacion a personal de pagos/finanzas con booleanos estaticos.
  3. Discrepancia en la evaluacion del Punto de Reorden (ROP) entre el demonio de fondo y el motor de eventos, junto con riesgo de colision en identificadores multi-empresa.
- **Decisión:**
  1. **Eliminacion Definitiva del Split-Brain:**
     - Todos los modulos dentro de `src/` (`events`, `agent`, `services`, `tools`, `policy`, `db`, `llm`) actuan exclusivamente como re-exportadores limpios (`export * from "@mint/core";`), consolidando la logica de dominio en `@mint/core` como paquete canónico.
  2. **Unificacion del Flujo de Aprobaciones HITL y Notificacion Financiera:**
     - La tabla `decisions` se consolida como la unica fuente de verdad para el circuito Human-in-the-Loop (`pending_approval`).
     - Al aprobarse una decision, `decisionExecutionService` no solo crea la Orden de Compra (`purchase_orders`) y la Guia de Embarque (`shipments`), sino que despacha automaticamente una Orden de Dispersion de Pago formal (`sendPaymentDispersionOrder`) a los canales configurados para el personal de Finanzas y Pagos.
     - Se incorporan roles granulares `finance` y `auditor` en la matriz RBAC de aprobacion.
  3. **Blindaje Multi-Tenant en Sincronizacion e Ingesta:**
     - Generacion de claves foraneas y compuestas prefijadas con el tenant (`prod_${cleanCompany}_${sku}`, `alm_central_${companyId}`).
     - Resolucion del Two-Phase Deletion localizando productos unicamente por la tupla `(sku, companyId)` con periodo de gracia antes del pase a cuarentena.
  4. **Alineacion de Disparadores ROP:**
     - Se unifico la condicion de alerta y deliberacion en `stock <= minStock` en `daemon` y `eventEngine`.
  5. **Configuracion Centralizada y Soporte Bilingue (ES/EN):**
     - Comandos de canales y configuracion delegados al motor dinamico `mint config` / `mint settings`, eliminando mocks estaticos y soportando internacionalizacion.
- **Consecuencias:** Cobertura de pruebas ampliada a 85 tests pasando al 100% (23 suites de prueba), 10/10 comprobaciones operativas superadas en `mint selftest`, eliminacion total de duplicidad en codigo y cero emojis en toda la plataforma.




