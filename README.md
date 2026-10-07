# AI Back Office Agent

Agente autónomo para automatizar operaciones de back office (inventario, compras, faltantes de stock, etc.) utilizando **Grok** de xAI.

## Estado del Proyecto
Actualmente el proyecto cuenta con su esqueleto base (Paso 1). Las tecnologías configuradas incluyen:
- Node.js (LTS) + TypeScript
- Herramientas de test y linting: Vitest, ESLint, Prettier
- Arquitectura de carpetas orientada a separación de responsabilidades (Servicios, DB, LLM, Herramientas, Agente)
- Documentación principal y reglas base ubicadas en `docs/CONTEXT.md`

## Estructura de carpetas
- `docs/`: Documentación, contexto del proyecto y bitácora de decisiones (`decisions/`).
- `src/`: Código fuente principal.
  - `agent/`: Bucle del agente, reglas de cierre, skills y prompts.
  - `api/`: Rutas del servidor (Fastify).
  - `config/`: Validaciones de entorno.
  - `db/`: Conexión, esquemas y migraciones.
  - `lib/`: Utilidades generales (logger, errores).
  - `llm/`: Cliente y ruteo para el LLM.
  - `services/`: Reglas de negocio.
  - `tools/`: Funciones expuestas al LLM.
  - `worker/`: Procesamiento asíncrono.
- `tests/`: Pruebas unitarias e integraciones.
- `scripts/`: Utilidades (verificación, costo, despliegue).

## Comandos disponibles
- `npm run typecheck`: Valida los tipos de TypeScript en todo el proyecto.
- `npm test`: Ejecuta la suite de pruebas usando Vitest.
- `docker compose up -d`: Inicia el contenedor de PostgreSQL 16.
- `npm run db:generate`: Genera los archivos SQL de migración a partir de los esquemas de TypeScript.
- `npm run db:migrate`: Aplica las migraciones en la base de datos PostgreSQL.
- `npm run db:seed`: Inserta datos iniciales de prueba en las tablas del agente.
- `npm run db:studio`: Abre la interfaz visual de Drizzle Studio en el navegador.

## Configuración inicial
1. Copia `.env.example` a `.env` y configura tus variables (clave de API y conexión a base de datos).
2. Ejecuta `npm install` para instalar las dependencias.
3. Inicia la base de datos con `docker compose up -d`.
4. Aplica las migraciones y datos de prueba: `npm run db:migrate && npm run db:seed`.

> **Importante:** Por favor revisa `docs/CONTEXT.md` antes de hacer modificaciones, contiene las directrices principales de desarrollo.
