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

## Configuración inicial
1. Copia `.env.example` a `.env` y rellena la clave de API (XAI_API_KEY).
2. Ejecuta `npm install` para instalar las dependencias.

> **Importante:** Por favor revisa `docs/CONTEXT.md` antes de hacer modificaciones, contiene las directrices principales de desarrollo.
