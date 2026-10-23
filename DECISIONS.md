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
