# Handoff Tecnico para el Equipo: AI Back Office (MINT)

Documento de transferencia técnica y arquitectura de las funcionalidades implementadas en la plataforma AI Back Office Agent (MINT).

---

## 1. Resumen de Capacidades Implementadas

Durante las últimas iteraciones el proyecto evolucionó desde un prototipo conversacional a una **plataforma fullstack de agente autónomo** para operaciones de compras, inventarios, auditoría y control financiero.

### Principales Logros y Entregables:

1. **Consola Web Interactiva (Mint Platform):**
   - Aplicación web en **React 19 + Vite 6 + Tailwind CSS v4 + Framer Motion**.
   - **Vistas implementadas:**
     - **LoginView:** Pantalla de acceso corporativo con branding Mint, resplandor ambiental y físicas elásticas de Emil Kowalski.
     - **DashboardView:** Tarjetas de KPIs operativos (órdenes totales, tasa de automatización, revisiones pendientes, ahorros en MXN/USD, gasto en IA), gráfica analítica de rendimiento de proveedores (*Recharts*) y accesos directos.
     - **ApprovalsView (Human-in-the-Loop):** Bandeja dedicada para que supervisores autoricen o rechacen órdenes de compra mayores a $10,000 MXN con un solo clic.
     - **AgentConsole (Chat):** Asistente conversacional con burbujas de sugerencias inteligentes, estado de ejecución en vivo (`en_proceso`, `resuelto`, `escalado`) y auditoría de tokens y costo en dólares.
     - **StockView / Database Explorer:** Visor de inventario en tiempo real con Drizzle ORM, estados de existencias (saludable, por reabastecer, agotado) y almacenes.
     - **Línea de Tiempo de Actividad:** Visualización cronológica de eventos de auditoría y logs del sistema.
     - **Command Palette (`⌘K` / `Ctrl+K`):** Navegación y búsqueda global instantánea con `cmdk`.

2. **Servidor API Backend en Fastify (Puerto 3001):**
   - Endpoints REST con CORS habilitado:
     - `POST /api/chat`: Recepción de casos y ejecución del bucle ReAct del agente.
     - `GET /api/dashboard`: Consolidación de métricas de negocio y desempeño de proveedores.
     - `GET /api/approvals`: Listado de solicitudes de compra pendientes de aprobación humana.
     - `POST /api/approvals/:id`: Aprobación o rechazo de tickets por supervisores humanos.
     - `GET /api/v1/alerts/proactive`: Consulta de alertas emitidas por el worker de auditoría.
     - `POST /api/v1/alerts/trigger-audit`: Ejecución forzada del ciclo de auditoría proactiva.
     - `GET /health`: Health-check del servicio.

3. **Entorno Dockerizado y Persistencia Dual:**
   - **PostgreSQL 16 en Supabase Cloud:** Conexión permanente con soporte SSL automático para despliegues remotos.
   - **Docker Compose Local:** Contenedores para base de datos PostgreSQL (`postgres:16-alpine`) y aplicación (`node:20-alpine`) orquestados en `docker-compose.yml` con inicialización en `docker/init-db.sql`.
   - **Auditoría Inmutable:** Triggers de base de datos que bloquean sentencias `UPDATE` y `DELETE` en `case_events`.

4. **Motor de Superpoderes e Inyección Dinámica de Skills:**
   - Clasificador de intenciones (`src/agent/superpowers.ts`) que inyecta directivas en Markdown (`src/agent/skills/`) de forma contextual según el dominio del caso (financiero, crisis logística, negociación de compras o guardrails).

5. **Arsenal de 8 Herramientas de Negocio Tipadas:**
   - `consultar_stock`: Fuzzy matching para localización de productos con tolerancia a errores.
   - `ver_ordenes_abiertas`: Detección de compras en tránsito y pedidos activos.
   - `crear_orden_compra`: Creación idempotente con canalización a aprobación si excede $10,000 MXN.
   - `evaluar_proveedores`: Matriz multicriterio de proveedores por costo, velocidad y balance.
   - `analisis_financiero`: Valuación de inventario, compromisos de compra y presupuesto a 30 días.
   - `simular_escenario`: Simulaciones What-If de demanda y contingencias de proveedores.
   - `auditar_anomalias`: Detección de descalces de stock y sobrecostos.
   - `generar_reporte_general`: Reportes agregados de ventas, agotados, renovaciones y caducidades (FEFO).

6. **Suite de Pruebas a Costo $0 USD:**
   - **20 de 20 pruebas automatizadas pasando en Vitest** mediante `FakeGrokClient`.

---

## 2. Estructura de Archivos del Proyecto

```text
ai-back-office/
├── config/
│   └── security/                     # Plantillas y configuraciones de entorno
├── docker/
│   └── init-db.sql                   # Roles de desarrollo y extensiones para Postgres
├── docs/
│   ├── CONTEXT.md                    # Bitácora, directivas y progreso del proyecto
│   ├── HANDOFF_TEAM.md               # Este documento de transferencia
│   ├── REPORTE_TECNICO.md            # Memoria técnica de arquitectura y diseño
│   └── decisions/                    # Decisiones de arquitectura (ADRs)
├── frontend/                         # Consola Web Mint (React 19 + Vite + Tailwind v4)
│   ├── src/
│   │   ├── components/
│   │   │   ├── DashboardView.tsx     # Métricas y gráficas operacionales
│   │   │   ├── LoginView.tsx         # Pantalla de acceso y autenticación
│   │   │   └── StockView.tsx         # Explorador de inventario y datos
│   │   ├── App.tsx                   # Shell principal, navegación, chat y approvals
│   │   └── index.css                 # Tokens de diseño y utilidades Glassmorphism
│   └── package.json
├── resources/                        # Diagramas, esquemas y capturas del sistema
├── scripts/                          # Herramientas CLI y scripts de diagnóstico
│   ├── chat.ts                       # Terminal interactiva de consola
│   ├── clear-db.ts                   # Truncado seguro para reiniciar la BD
│   └── smoke.ts                      # Prueba de humo de conectividad con Grok
├── src/
│   ├── agent/                        # Bucle ReAct, Superpoderes y prompts de skills
│   ├── api/                          # Definición de rutas del servidor
│   ├── config/                       # Validación Zod de variables de entorno
│   ├── db/                           # Esquemas Drizzle, cliente Postgres y semillas
│   ├── lib/                          # Utilidades transversales y telemetría
│   ├── llm/                          # Cliente de Grok, cliente fake y tarificación
│   ├── server.ts                     # Servidor Fastify 5.x principal
│   ├── services/                     # Lógica de inventario, compras y aprobaciones
│   ├── tools/                        # Arsenal de 8 herramientas ejecutables
│   └── worker/                       # Motor proactivo de auditoría y eventos
├── tests/                            # Suite completa de 20 pruebas en Vitest
├── Dockerfile                        # Imagen de producción ligera (Node 20 Alpine)
├── docker-compose.yml                # Orquestación de Postgres y servicio App
└── package.json
```

---

## 3. Instrucciones de Ejecución para el Equipo

### Requisitos Previos:
- Node.js versión 20 o superior.
- Archivo `.env` en la raíz configurado con las siguientes variables:
  ```env
  DATABASE_URL=postgresql://postgres.[ID_PROYECTO]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
  RETO_KEY=pk_...
  GROK_BASE_URL=https://api.reto.pltk.mx/v1
  GROK_MODEL=grok-4.6
  PORT=3001
  ```

### Comandos de Utilidad:

1. **Iniciar la Consola Web (Frontend):**
   ```bash
   cd frontend
   npm run dev
   ```
   Abre tu navegador en `http://localhost:5173`.

2. **Iniciar el Servidor Backend (Fastify):**
   ```bash
   npm run server
   ```
   Escuchará en `http://localhost:3001` con CORS habilitado.

3. **Ejecutar con Docker (Desarrollo Local Aislado):**
   ```bash
   docker compose up -d
   ```

4. **Ejecutar Pruebas Automatizadas (20 pruebas en Vitest):**
   ```bash
   npm test
   ```

5. **Verificación de Tipos TypeScript:**
   ```bash
   npm run typecheck
   ```

6. **Sembrar Catálogo Extendido de 16 SKUs:**
   ```bash
   npm run db:seed
   ```

7. **Terminal Interactiva CLI:**
   ```bash
   npm run chat
   ```

8. **Video Promocional Cinemático (Apple Keynote Style en Remotion):**
   ```bash
   cd videos/mint-remotion
   npm run dev       # Vista previa interactiva en Remotion Studio
   # Renderizado final MP4 (1080p @ 30 fps, 28.1s / 844 frames):
   npx remotion render MintLaunchFilm renders/mint-keynote-film.mp4
   ```

---

## 4. Estado de Pruebas y Cobertura
- 8 archivos de prueba ejecutados con Vitest.
- 20 de 20 pruebas aprobadas exitosamente (100% verde).
- Cobertura completa de escenarios de negocio: reposición de existencias, control Human-in-the-Loop ante compras mayores a $10,000 MXN, prevención de compras duplicadas por idempotencia, auditoría inmutable de eventos y detección de intenciones con superpoderes.
