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

