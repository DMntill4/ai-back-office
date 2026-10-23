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
