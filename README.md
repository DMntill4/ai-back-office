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

### Ejecución local (host)
- `npm run typecheck`: Valida los tipos de TypeScript en todo el proyecto.
- `npm test`: Ejecuta la suite de pruebas usando Vitest.
- `docker compose up -d`: Inicia los servicios de PostgreSQL y App (Node.js aislado).
- `npm run db:generate`: Genera los archivos SQL de migración a partir de los esquemas de TypeScript.
- `npm run db:migrate`: Aplica las migraciones en la base de datos PostgreSQL.
- `npm run db:seed`: Inserta datos iniciales de prueba en las tablas del agente.
- `npm run db:studio`: Abre la interfaz visual de Drizzle Studio en el navegador.
- `npm run smoke`: Ejecuta la prueba de humo contra el gateway de Grok.

### Ejecución dentro de Docker (dependencias aisladas)
- `docker compose up --build -d`: Construye e inicia los contenedores.
- `docker compose exec app npm test`: Corre los tests dentro del contenedor aislado.
- `docker compose exec app npm run db:migrate`: Aplica migraciones desde el contenedor.
- `docker compose exec app npm run db:seed`: Carga datos de prueba desde el contenedor.
- `docker compose exec app npm run smoke`: Ejecuta la prueba de humo de Grok desde Docker.
- `docker compose exec app npm install <paquete>`: Instala nuevos paquetes directamente en el entorno aislado del contenedor.

## Configuración inicial
1. Copia `.env.example` a `.env` y configura tus variables (clave de API y conexión a base de datos).
2. Construye y levanta el entorno aislado con `docker compose up --build -d`.
3. Aplica las migraciones y datos de prueba:
   ```bash
   docker compose exec app npm run db:migrate
   docker compose exec app npm run db:seed
   ```

> **Importante:** Por favor revisa `docs/CONTEXT.md` antes de hacer modificaciones, contiene las directrices principales de desarrollo.
