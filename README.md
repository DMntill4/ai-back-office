<p align="center">
  <img src="./resources/img/bannerIcon.png" alt="AI Back Office Banner" width="100%" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Grok_xAI-grok--4.6-FDB813?style=for-the-badge&logo=openai&logoColor=black" alt="Grok xAI" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Fastify-5.x-000000?style=for-the-badge&logo=fastify&logoColor=white" alt="Fastify" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Supabase-Cloud_DB-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/Vitest-Passing_100%25-6E9F18?style=for-the-badge&logo=vitest&logoColor=white" alt="Vitest" />
</p>

---

# AI Back Office Agent (MINT) & Mint CLI

> **Coordinador Logístico Autónomo Multi-Agente y Suite de Operaciones de Back Office**  
> Corre en el PC del operador mediante **Mint CLI**, vigila el inventario en segundo plano con **Mint Daemon**, aplica guardrails deterministas inviolables con su **Motor de Políticas**, y notifica de forma remota e interactiva vía **Telegram**, **Slack** y **Gmail**.

<p align="center">
  <img src="https://img.shields.io/badge/Mint_CLI-v2.6.0-10B981?style=for-the-badge&logo=gnometerminal&logoColor=white" alt="Mint CLI" />
  <img src="https://img.shields.io/badge/Grok_xAI-grok--4.6-FDB813?style=for-the-badge&logo=openai&logoColor=black" alt="Grok xAI" />
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Monorepo-npm_workspaces-CB3837?style=for-the-badge&logo=npm&logoColor=white" alt="Monorepo" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Telegram_Bot-Interactive-26A5E4?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram Bot" />
  <img src="https://img.shields.io/badge/Slack-Block_Kit-4A154B?style=for-the-badge&logo=slack&logoColor=white" alt="Slack" />
  <img src="https://img.shields.io/badge/Vitest-82_Tests_Passing-6E9F18?style=for-the-badge&logo=vitest&logoColor=white" alt="Vitest" />
</p>

---

## [ARQUITECTURA] Arquitectura Monorepo

El proyecto está organizado como un **Monorepo limpio** con `npm workspaces`:

| Paquete | Responsabilidad |
|---|---|
| `@mint/core` | Cerebro del sistema: agentes especialistas, tools tipadas (Zod), Drizzle ORM / PostgreSQL, Context Manager y Motor de Políticas Determinista. Cero dependencias de frameworks HTTP. |
| `@mint/cli` | Interfaz de línea de comandos (`mint login`, `mint inbox`, `mint watch`, `mint source add`, `mint autonomy`, `mint doctor`, `mint goal`, `mint console`, etc.) con sesión cifrada en Keychain local (AES-256-GCM). |
| `@mint/daemon` | Proceso autónomo en segundo plano. Vigila carpetas de datos con fs.watch nativo, detecta desabastos, evalúa retrasos de camiones y cron del plan diario. |
| `@mint/notifiers` | Adaptadores remotos para **Telegram** (Bot API con inline buttons), **Slack** (Block Kit), **Gmail** (HTML responsivo con links firmados HMAC-SHA256) y canales de venta (Discord/Telegram/Slack listener). |
| `@mint/ingest` | Motor de ingesta asistida de CSV/Excel/SQLite/Postgres con mapeo semántico heurístico, detección de schema drift, circuito de borrado masivo (>20%), confirmación en dos fases, sanitización no destructiva y marca `origin = 'real'`. |

---

## [CLI] Mint CLI: Comandos Principales

Ejecuta el CLI mediante `npm start`, `npm run mint -- <comando>` o enlazando el binario global `mint`:

```bash
# [INICIO] INICIO UNIFICADO (100% TERMINAL-FIRST / AUTONOMO)
npm start                          # Inicia el Daemon de fondo y la Consola Interactiva
npm run agent                      # Alias de inicio rápido terminal-first
npm run agent:headless             # Modo headless continuo (ideal para servidores en segundo plano)
mint start                         # Comando nativo de Mint CLI

# 0. Diagnóstico de Entorno y Arquitectura
mint doctor                        # Verifica Node >= 22.5.0 (SQLite nativo) y conectividad PostgreSQL (alias: mint env)

# 1. Autenticación y Almacén Cifrado (Keychain)
mint login <email> <password>      # Autenticación con sesión cifrada AES-256 en ~/.mint/session.enc
mint whoami                        # Consulta usuario, rol y companyId extraído del token
mint logout                        # Cierra sesión y elimina credenciales locales

# 2. Ingesta y Gestión de Fuentes de Datos (Data Layer Hardened)
mint source discover [path]        # Descubre archivos (.csv, .xlsx, .sqlite, .db) en el directorio indicado o de trabajo
mint source inspect <ruta>         # Introspección de columnas, tablas/hojas y propuesta de mapeo sin tocar la BD
mint source add <ruta>             # Sincronización idempotente con tolerancia a fallos, sanitización y drift protection
mint source status                 # Auditoría de frescura de datos: detecta fuentes desfasadas (>24h) y estado de drift
mint source list                   # Lista fuentes conectadas y su estado de salud (HEALTHY / DRIFTED / ERROR)

# 3. Gobernanza y Motor de Autonomía
mint autonomy get                  # Consulta el modo activo (dry-run, assisted, auto)
mint autonomy set dry-run          # Modo seguro por defecto: propuestas estructuradas sin mutar BD
mint autonomy set assisted         # Autoejecuta bajo $10,000 MXN con alta confianza; escala a HITL el resto
mint autonomy set auto             # Autonomía total con veto de seguridad por auditoría de riesgo

# 4. Proceso en Segundo Plano (Daemon)
mint daemon start                  # Inicia el daemon que vigila inventario y fuentes
mint daemon status                 # Consulta estado, PID, ciclos y eventos disparados
mint daemon stop                   # Detiene el proceso autónomo
mint pause                         # Interruptor de emergencia: detiene la autonomía de inmediato
mint resume                        # Reanuda la autonomía operativa

# 5. Operaciones en Vivo, Explicabilidad y Aprobaciones
mint dashboard                     # Panel unificado: inventario, casos, daemon, alertas y notificaciones (alias: mint status)
mint watch                         # Feed en tiempo real de eventos, decisiones y compras
mint inbox                         # Bandeja de decisiones pendientes con evidencia y costo
mint inbox approve <id>            # Autoriza una compra desde la terminal ejecutando la orden en BD
mint inbox reject <id>             # Rechaza una propuesta de compra
mint explain <id>                  # Desglosa deliberación multi-agente, evidencia, riesgo y regla de política
mint simulate [stockout|delay]     # Simula choques de suministro en sandbox para evaluar cómo responde el coordinador
mint console                       # Consola interactiva REPL con prompt permanente para operaciones continuas
mint plan today                    # Resumen diario (casos en curso, decisiones, stock en riesgo)
mint stock                         # Catálogo e inventario actual en tiempo real formateado en tablas Unicode
mint orders                        # Listado de órdenes de compra abiertas y en tránsito
mint team list                     # Lista miembros y roles RBAC del tenant (owner, operator, auditor, viewer)
mint team invite <email>           # Invita o da de alta un miembro del equipo a la organización
mint chat "<mensaje>"              # Consulta conversacional directa al Agente Coordinador con métricas y spinner

# 6. Notificaciones Remotas y Aprobación por Canal
mint notify add telegram           # Conecta bot de Telegram con botones inline
mint notify add slack              # Conecta webhook o app de Slack
mint notify add gmail              # Conecta notificaciones por correo electrónico
mint notify list                   # Lista canales activos y horarios silenciosos
mint notify test telegram          # Envía notificación de prueba con botones interactivos
```

> **Nota:** Todos los comandos soportan el flag `--json` para integración en scripts o pipelines de automatización.

---

## [AGENTES] Red Multi-Agente y Motor de Políticas

```
           [ Disparador: Archivo Modificado / Stock Bajo / Envío Retrasado ]
                                         │
                                         ▼
                     ┌───────────────────────────────────────┐
                     │     AGENTE COORDINADOR (Orchestrator) │
                     │   Abre caso operativo en PostgreSQL   │
                     └───────────────────┬───────────────────┘
                                         │
                 ┌───────────────────────┼───────────────────────┐
                 ▼                       ▼                       ▼
      ┌──────────────────────┐┌──────────────────────┐┌──────────────────────┐
      │ ESPECIALISTA EN      ││ ESPECIALISTA EN      ││ ESPECIALISTA EN      │
      │ INVENTARIO Y DEMANDA ││ TRANSPORTE Y ENVÍOS  ││ COMPRAS Y PROVEEDORES│
      │ Detección de déficit ││ Tracking retrasado   ││ Selección mejor      │
      │ y días de cobertura  ││ y recalculo de ETA   ││ cotización homologada│
      └──────────┬───────────┘└──────────┬───────────┘└──────────┬───────────┘
                 │                       │                       │
                 └───────────────────────┼───────────────────────┘
                                         │
                                         ▼
                     ┌───────────────────────────────────────┐
                     │ ESPECIALISTA EN RIESGO Y AUDITORÍA    │
                     │ Abogado del Diablo: Score, duplicados │
                     │ en 72h, solvencia y sobrecostos       │
                     └───────────────────┬───────────────────┘
                                         │ Emite ActionProposal estructurada
                                         ▼
                     ┌───────────────────────────────────────┐
                     │   MOTOR DE POLÍTICAS DETERMINISTA     │
                     │  (Código matemático, NUNCA el LLM)    │
                     │  Anti-duplicados, umbral presupuestal,│
                     │  reversibilidad y modo de autonomía   │
                     └───────────────────┬───────────────────┘
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   ▼                                           ▼
       [ AUTO-EJECUCIÓN INMEDIATA ]               [ ESCALADO A BANDEJA HITL ]
       Orden de compra en PostgreSQL              Notificación interactiva por
       y paso de verificación                     Telegram / Slack / Gmail
                                                  (Token firmado de un solo uso)
```

---

## Contribuidores

<table align="center">
  <tr>
    <td align="center" width="220px">
      <a href="https://github.com/DMntill4">
        <img src="https://github.com/DMntill4.png" width="90px;" alt="Diego Mantilla" style="border-radius: 50%;" /><br />
        <sub><b>Diego Mantilla</b></sub>
      </a><br />
      <code>@DMntill4</code>
    </td>
    <td align="center" width="220px">
      <a href="https://github.com/andresguerra321">
        <img src="https://github.com/andresguerra321.png" width="90px;" alt="Andres Guerra" style="border-radius: 50%;" /><br />
        <sub><b>Andres Guerra</b></sub>
      </a><br />
      <code>@andresguerra321</code>
    </td>
  </tr>
</table>

---

## Estado del Proyecto

- [x] **Consola Web Interactiva (Mint Platform):**
  - Aplicación completa desarrollada en **React 19 + Vite + Tailwind CSS v4 + Framer Motion**.
  - Estética *Glassmorphism* premium, tipografía *Outfit*, logo oficial y físicas fluidas (Emil Kowalski).
  - **LoginView:** Pantalla de autenticación con branding institucional y micro-interacciones.
  - **DashboardView:** KPIs operativos (órdenes totales, tasa de automatización, revisiones pendientes, ahorros y gasto en USD), gráfica de rendimiento de proveedores (*Recharts*) y tarjetas de acción inmediata.
  - **ApprovalsView (Human-in-the-Loop):** Bandeja dedicada para que supervisores autoricen o rechacen órdenes de compra mayores a $10,000 MXN en un clic.
  - **AgentConsole (Chat):** Asistente conversacional con burbujas de sugerencias inteligentes, estado de ejecución en vivo (`en_proceso`, `resuelto`, `escalado`) y telemetría de tokens y costo en USD.
  - **StockView / Database Explorer:** Visor interactivo y tabular de almacenes, productos, niveles de stock, alertas de rotación y proveedores.
  - **Activity & Timeline:** Historial de eventos y auditoría del sistema presentado cronológicamente.
  - **Command Palette (`⌘K` / `Ctrl+K`):** Navegación y búsqueda global instantánea con `cmdk`.
- [x] **Persistencia Dual (Cloud Supabase + Docker Local):**
  - PostgreSQL 16 en la nube 24/7 con soporte automático SSL en `src/db/client.ts`.
  - Entorno de desarrollo local reproducible mediante `docker-compose.yml`, `Dockerfile` (Node 20 Alpine) y script `docker/init-db.sql`.
  - Triggers nativos inmutables en `case_events` para auditoría corporativa a prueba de alteraciones.
- [x] **Motor de Superpoderes y Skills en Markdown:**
  - Clasificación de intenciones e inyección dinámica de directivas expertas (`src/agent/skills/`) según la consulta (financiera, crisis de stock, negociación, seguridad).
- [x] **Arsenal de 8 Herramientas de Negocio Tipadas con Zod:**
  - `consultar_stock`: Búsqueda de inventario con Fuzzy Matching para tolerar SKUs mal escritos.
  - `ver_ordenes_abiertas`: Detección de órdenes en tránsito y compras activas.
  - `crear_orden_compra`: Creación idempotente con límite de aprobación humana ($10,000 MXN).
  - `evaluar_proveedores`: Matriz comparativa de proveedores por costo, velocidad o balance general.
  - `analisis_financiero`: Valuación de inventario total, compromisos financieros y presupuesto a 30 días.
  - `simular_escenario`: Simulaciones What-If de demanda y contingencias por retrasos de proveedores.
  - `auditar_anomalias`: Detección automática de descalces de inventario y sobrecostos.
  - `generar_reporte_general`: Reportes ejecutivos de productos más vendidos, agotados, por reabastecer y por caducar (FEFO).
- [x] **API Backend Fastify y Motor Proactivo:**
  - Servidor HTTP en `src/server.ts` con CORS, endpoints de chat (`/api/chat`), métricas del dashboard (`/api/dashboard`), gestión de aprobaciones (`/api/approvals`, `/api/approvals/:id`) y alertas proactivas (`/api/v1/alerts/proactive`, `/api/v1/alerts/trigger-audit`).
  - Worker en segundo plano `src/worker/proactiveMonitor.ts` con bus de eventos en tiempo real.
- [x] **Catálogo Extendido (Seed de 16 SKUs):**
  - Catálogo de prueba con 16 SKUs industriales y comerciales distribuidos en 3 almacenes (Central, Refrigerado, Norte) con 5 proveedores y casos extremos (stock 0, caducidad próxima, etc.).
- [x] **Pruebas y Validación a Costo $0 USD:**
  - Suite de **20 pruebas automatizadas** en Vitest (100% pasando) mediante `FakeGrokClient` sin consumo de saldo de la API.

---

## Stack Tecnológico

<div align="center">

| Capa | Tecnologías |
|:---|:---|
| **Frontend Web** | React 19, TypeScript, Vite 6, Tailwind CSS v4, Framer Motion, Radix UI, Lucide React, Recharts, cmdk, Sonner, Vaul |
| **Inteligencia Artificial** | xAI Grok (`grok-4.6`) vía Gateway oficial de producción |
| **Backend API** | Fastify 5.x, Node.js (LTS), TypeScript 5.6 |
| **Base de Datos & ORM** | PostgreSQL 16 (Supabase Cloud + Docker) + Drizzle ORM 0.45 + Drizzle Kit |
| **Validación & Telemetría** | Zod 4.x + Pino + Pino-Pretty |
| **Contenedores e Infraestructura** | Docker, Docker Compose, Alpine Linux |
| **Testing & Calidad** | Vitest 5.0, ESLint, Prettier, Oxlint |

</div>

---

## Arquitectura del Sistema

```text
       ┌────────────────────────────────────────────────────────┐
       │             MINT PLATFORM (Frontend React 19)          │
       │  Dashboard · Aprobaciones · Chat · Stock · Actividad   │
       └───────────────────────────┬────────────────────────────┘
                                   │ HTTP / JSON REST
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │            API BACKEND (Fastify - Puerto 3001)         │
       │  /api/chat · /api/dashboard · /api/approvals · /alerts │
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
                      Motor de Superpoderes (skills/*.md)
                                   │
                           Agent Loop (ReAct) ──► LLM Client ──► Grok (xAI)
                            │          ▲              │
               Selección de │          │ Resultado    └─► llm_calls (Costo USD)
               Herramientas ▼          │
                           Herramientas ──► Servicios
                                   │
                                   ├──► Compras > $10k MXN ──► approvals (Pendiente Humano)
                                   │
                                   └──► Escrituras Verificadas ──► PostgreSQL / Supabase
                                           │
                                           └─► case_events (Inmutable) ──► "resuelto" | "escalado"
```

### Principios Fundamentales de Gobernanza
1. **El modelo decide, el código gobierna:** Grok propone cursos de acción; el código TypeScript valida tipos, esquemas de entrada y límites de riesgo.
2. **Human-in-the-Loop Obligatorio:** Cualquier orden de compra superior a $10,000 MXN genera un ticket formal en la bandeja de aprobaciones para revisión y firma de un supervisor humano.
3. **Idempotencia Estricta:** Cada transacción de escritura requiere una clave idempotente única para blindar el sistema contra duplicidades.
4. **Verificación Física Post-Escritura:** Ningún caso se concluye como `resuelto` sin verificar la existencia física de la fila en base de datos.
5. **Auditoría Append-Only:** La tabla `case_events` cuenta con un trigger en PostgreSQL que deniega sentencias `UPDATE` y `DELETE`.

---

## Estructura del Repositorio

```text
ai-back-office/
├── config/
│   └── security/                     # Plantillas y configuraciones de entorno
├── docker/
│   └── init-db.sql                   # Roles de desarrollo y extensiones para Postgres
├── docs/
│   ├── CONTEXT.md                    # Bitácora, directivas y progreso del proyecto
│   ├── HANDOFF_TEAM.md               # Guía técnica de transferencia para el equipo
│   ├── REPORTE_TECNICO.md            # Memoria técnica de arquitectura y diseño
│   └── decisions/                    # Registro de decisiones de arquitectura (ADRs)
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

## Guía de Comandos

### 1. Iniciar la Consola Web (Frontend)
```bash
# Desde la carpeta frontend
cd frontend
npm run dev

# O desde la raíz del proyecto
npm --prefix frontend run dev
```
La interfaz estará disponible en `http://localhost:5173`.

### 2. Iniciar el Servidor API Backend (Fastify)
```bash
npm run server
```
El servidor escuchará en `http://localhost:3001` con endpoints listos para el frontend.

### 3. Entorno de Desarrollo con Docker
```bash
# Levantar contenedor de base de datos PostgreSQL local y aplicación
docker compose up -d

# Detener contenedores
docker compose down
```

### 4. Terminal Interactiva CLI (Chat directo con el Agente)
```bash
npm run chat
```

### 5. Base de Datos y Semillas (Supabase o Docker)
```bash
# Ejecutar migraciones relacionales
npm run db:migrate

# Sembrar el catálogo extendido de 16 SKUs, bodegas y proveedores
npm run db:seed

# Limpiar las tablas operacionales de la base de datos
npm run db:reset

# Abrir Drizzle Studio para inspección visual de la base de datos
npm run db:studio
```

### 6. Suite de Pruebas y Control de Calidad (Costo $0 USD)
```bash
# Ejecutar las 20 pruebas automatizadas
npm test

# Verificación estricta de tipos TypeScript
npm run typecheck

# Prueba de humo de comunicación con el Gateway de Grok
npm run smoke
```

---

<p align="center">
  <sub>Desarrollado para el Reto de Agentes Autónomos 2026</sub>
</p>
