# 🍃 MINT CLI & AUTONOMOUS AI BACK OFFICE — TECHNICAL HANDOFF DOCUMENT

**Fecha de Entrega:** 23 de Octubre de 2026  
**Rama:** `feature/data-layer-hardening-and-discovery` (Commits locales convencionales, política de no-push cumplida)  
**Estado:** Producción / Verificado (82 pruebas en verde en 23 suites, 0 errores de tipado, build limpio)  

---

## 1. RESUMEN EJECUTIVO Y FILOSOFÍA DEL SISTEMA

El proyecto evolucionó exitosamente de una aplicación web monolítica basada en Fastify v5 con un chatbot reactivo hacia **Mint CLI**: un **Coordinador Logístico Autónomo y AI Back Office** distribuido, seguro y multi-agente.

### ¿Por qué NO es un Chatbot?
1. **Orientado a Eventos y Proactivo:** El sistema no espera a que un humano pregunte *"¿qué stock está bajo?"*. El **Daemon** vigila continuamente en segundo plano archivos CSV/SQL, niveles mínimos de existencias y guías de transporte retrasadas, abriendo casos operativos de forma autónoma.
2. **Harness Multi-Agente en Paralelo:** Cuatro especialistas dedicados (Inventario, Compras, Transporte y Riesgo Adversarial) deliberan concurrentemente antes de emitir una propuesta.
3. **Gobernanza y Políticas Deterministas:** La IA **nunca** muta la base de datos de compras de forma directa ni tiene acceso a shell. El código determinista (`evaluatePolicy`) audita el costo en MXN, duplicidad en 72 horas, confiabilidad del proveedor y el nivel de autonomía activo.
4. **SaaS Multi-Tenant y Multi-Usuario:** Soporte para personas y organizaciones empresariales completas con roles RBAC (`owner`, `operator`, `auditor`, `viewer`) y aislamiento estricto por `companyId`.
5. **Aprobaciones Remotas Seguras:** Capacidad de aprobar o rechazar compras críticas desde **Telegram**, **Slack** o **Gmail** mediante tokens HMAC-SHA256 de un solo uso e idempotentes.

---

## 2. ARQUITECTURA MONOREPO Y PAQUETES

El repositorio utiliza **npm workspaces** desacoplando la lógica de negocio del transporte HTTP:

```
ai-back-office/
├── packages/
│   ├── core/           # Cerebro autónomo: Agentes, Harness, Tools, DB Drizzle, Políticas y Servicios
│   ├── cli/            # Interfaz de terminal profesional (TUI Kali/Claude Code style, Keychain, REPL)
│   ├── daemon/         # Proceso en segundo plano, Observador de archivos (fs.watch), Triggers periódicos
│   ├── ingest/         # Motor de ingesta asistida de CSV/Excel, tolerancia a fallos y Postgres read-only
│   └── notifiers/      # Canales remotos (Telegram Bot API, Slack Bolt, Gmail SMTP) y tokens firmados
├── src/                # Servidor Fastify v5 (Transporte HTTP, API REST, WebSocket/SSE)
├── frontend/           # SPA React 19 + Vite (Dashboard web, Bandeja HITL, Auditoría)
└── tests/              # 64 pruebas automatizadas en Vitest (20 archivos de prueba)
```

### Paquete a Paquete

#### 1. `@mint/core` (`packages/core`)
- **Agentes y Especialistas:**
  - `coordinador.ts`: Orquestador principal que abre casos y sintetiza planes de resolución.
  - `harness.ts`: Harness de controladores en paralelo (`runBackOfficeHarness`) con árbol de razonamiento ASCII.
  - `inventarioSpecialist.ts`: Cálculo de burn rate, días de cobertura y detección de desabastos.
  - `comprasSpecialist.ts`: Selección de proveedores homologados, cotizaciones, MOQ y tiempos de entrega.
  - `transporteSpecialist.ts`: Auditoría de guías en tránsito y replanificación de rutas por retraso.
  - `riesgoSpecialist.ts`: Agente adversarial (abogado del diablo) que detecta duplicidad en 72h y proveedores riesgosos.
- **Motor de Políticas (`policyEngine.ts`):** Aplica reglas matemáticas inviolables (`RULE_DUPLICATE_ORDER_BLOCK`, `RULE_DRY_RUN_GUARDRAIL`, `RULE_SPEND_EXCEEDS_THRESHOLD`). Niveles: `dry-run` (por defecto), `assisted` (umbral $10,000 MXN), `auto`.
- **Servicios:** Ingesta de eventos (`eventEngine.ts`), ejecución y verificación (`decisionExecutionService.ts`), pronóstico de demanda (`demandService.ts`), logística (`shipmentService.ts`), gestión de equipos SaaS (`teamService.ts`).
- **Base de Datos:** Drizzle ORM sobre PostgreSQL / Supabase con 19 esquemas tipados.

#### 2. `@mint/cli` (`packages/cli`)
- **Ejecutable:** `./bin/mint.js` registrado globalmente en `package.json`.
- **Keychain Cifrado (`keychain.ts`):** Guarda sesiones locales en `~/.mint/session.enc` usando **AES-256-GCM** derivado con `scrypt` del usuario/host del sistema. Cero archivos en texto plano.
- **Sistema de Diseño TUI (`src/ui/`):** Paleta Mint Green (`#10B981`), tarjetas redondeadas Unicode (`drawCard`), tablas con columnas adaptables (`renderTable`), spinner animado (`withSpinner`) y banner ASCII institucional.
- **Consola Interactiva (`mint console`):** Shell REPL permanente estilo Kali Linux / Claude Code con prompt enriquecido.

#### 3. `@mint/daemon` (`packages/daemon`)
- Proceso en segundo plano que vigila el directorio de fuentes de datos (`fs.watch`) e ingesta archivos automáticamente.
- Disparadores periódicos: `scanStockDeficits`, `scanDelayedShipments`, `generateDailyPlan`.
- Interruptor de emergencia (`mint pause` / `mint resume`) para congelar la autonomía inmediatamente ante anomalías.

#### 4. `@mint/notifiers` (`packages/notifiers`)
- Adaptadores modulares para **Telegram**, **Slack** y **Gmail**.
- Firma criptográfica HMAC-SHA256 con TTL de 24 horas y protección contra replay attacks mediante `notification_log.is_used`.
- Aprobación remota de un solo clic que dispara la orden en base de datos y estampa auditoría inmutable.

#### 5. `@mint/ingest` (`packages/ingest`)
- Parser resiliente que aísla filas con errores sin abortar el lote completo.
- Mapeador de columnas asistido con scoring de confianza hacia `products`, `inventory`, `suppliers`, `shipments`.
- Todos los datos importados quedan estampados con `origin = 'real'`.

---

## 3. MATRIZ DE CONTROLADORES Y AGENTES AUTÓNOMOS

```
            [ Disparador: Archivo Modificado / Stock Bajo / Envío Retrasado ]
                                          │
                                          ▼
                      ┌───────────────────────────────────────┐
                      │     AGENTE COORDINADOR & HARNESS      │
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
      [ AUTO_EXECUTED (Bajo Umbral) ]               [ PENDING_APPROVAL (HITL) ]
                    │                                           │
                    ▼                                           ▼
         Ejecución Inmediata en BD                   Notificación Multicanal
         + Post-Verificación                         (Telegram / Slack / Gmail)
         + Registro Criptográfico                    + Token HMAC de Aprobación
```

---

## 4. GUÍA COMPLETA DE COMANDOS MINT CLI

Todos los comandos soportan `--json` para integración en pipelines de CI/CD o scripts de shell.

| Comando | Descripción |
| :--- | :--- |
| **`mint login [email] [pass]`** | Autentica contra el backend y guarda token cifrado AES-256 en keychain. |
| **`mint logout`** | Cierra sesión y destruye de forma segura el archivo cifrado. |
| **`mint whoami`** | Muestra usuario, empresa, rol y estado de la sesión activa. |
| **`mint dashboard`** *(alias `status`)* | Panel unificado: inventario, alertas de quiebre, casos abiertos y canales. |
| **`mint console`** *(alias `repl`)* | Shell interactivo permanente estilo Kali Linux / Claude Code. |
| **`mint harness [sku]`** | Ejecuta el harness autónomo con deliberación en paralelo y árbol ASCII. |
| **`mint stock`** | Tabla en tiempo real de catálogo, existencias y estados (`ÓPTIMO`, `BAJO`, `AGOTADO`). |
| **`mint orders`** | Tabla de órdenes de compra emitidas, montos y estados en PostgreSQL. |
| **`mint inbox`** | Bandeja de decisiones pendientes de supervisión humana (HITL). |
| **`mint inbox approve <id>`** | Autoriza una decisión ejecutando la compra real en BD con verificación. |
| **`mint inbox reject <id>`** | Rechaza una decisión y la archiva en auditoría. |
| **`mint explain <id>`** | Explicabilidad profunda: desglose de especialistas, riesgo y regla aplicada. |
| **`mint simulate [shock]`** | Simula choques what-if en sandbox (`stockout`, `delay`, `price-spike`). |
| **`mint team list`** | Lista miembros y roles RBAC del tenant (`owner`, `operator`, `auditor`, `viewer`). |
| **`mint team invite <email>`** | Invita o da de alta a un nuevo miembro del equipo. |
| **`mint team remove <id>`** | Da de baja a un miembro protegiendo al último owner de la empresa. |
| **`mint source add <path>`** | Ingesta de archivos CSV/Excel con mapeo asistido y tolerancia a fallos. |
| **`mint source list`** | Lista las fuentes de datos registradas para la empresa. |
| **`mint autonomy get`** | Muestra el nivel de autonomía activo (`dry-run`, `assisted`, `auto`). |
| **`mint autonomy set <level>`** | Modifica el nivel de gobernanza y autonomía de la empresa. |
| **`mint daemon start`** | Inicia el proceso autónomo en segundo plano. |
| **`mint daemon stop`** | Detiene el daemon de monitoreo. |
| **`mint daemon status`** | Consulta PID, uptime, ticks y estado del daemon. |
| **`mint pause`** | **Interruptor de emergencia:** congela de inmediato toda autonomía. |
| **`mint resume`** | Reanuda las operaciones autónomas pausadas. |
| **`mint watch`** | Feed en tiempo real con indicador pulsante de eventos y decisiones. |
| **`mint plan today`** | Briefing diario: casos en curso, decisiones y dinero gestionado. |
| **`mint scan`** | Dispara escaneo proactivo de quiebres de stock y retrasos de transporte. |
| **`mint notify add <tipo>`** | Configura canales remotos (Telegram, Slack, Gmail). |
| **`mint notify test <tipo>`** | Envía notificación de prueba interactiva con botones firmados. |
| **`mint chat "<msg>"`** | Consulta conversacional directa al Agente Coordinador. |

---

## 5. ESQUEMA DE BASE DE DATOS (DRIZZLE ORM)

| Tabla | Propósito y Blindajes |
| :--- | :--- |
| **`companies`** | Multi-tenant maestro (`id`, `name`, `slug`). |
| **`users`** | Usuarios corporativos con roles (`owner`, `operator`, `auditor`, `viewer`). |
| **`products`** | Catálogo de productos (`sku`, `min_stock`, `origin = 'real' \| 'simulado'`). |
| **`inventory`** | Existencias por producto y almacén (`stock`, `warehouse_id`). |
| **`suppliers`** | Proveedores homologados (`origin = 'real'`). |
| **`supplier_products`** | Precios unitarios pactados, MOQ y días de entrega (`lead_time_days`). |
| **`purchase_orders`** | Órdenes de compra oficiales generadas de forma autónoma o HITL. |
| **`shipments`** | Guías de transporte en tránsito, transportistas y fechas de entrega prometidas vs ETA. |
| **`cases`** | Casos operativos abiertos por eventos (`recibido`, `en_proceso`, `resuelto`, `escalado`). |
| **`case_events`** | **Línea de tiempo inmutable append-only** protegida por trigger contra `DELETE`. |
| **`decisions`** | Propuestas evaluadas con evidencia, score de riesgo, regla de política y verificación. |
| **`operational_events`** | Cola de eventos de fondo (`STOCK_CRITICAL`, `SHIPMENT_DELAY`, etc.). |
| **`policy_rules`** | Políticas dinámicas aprendidas o configuradas por empresa. |
| **`data_sources`** | Fuentes conectadas (archivos locales, conexiones Postgres externas). |
| **`import_jobs`** | Historial de importaciones con conteo de filas procesadas y filas erróneas aisladas. |
| **`notification_channels`** | Canales remotos (Telegram, Slack, Gmail) con horarios silenciosos. |
| **`notification_log`** | Bitácora de mensajes con tokens HMAC firmados y bandera de consumo único (`is_used`). |
| **`business_config`** | Configuración por tenant (clave compuesta `company_id, key`): tono, umbral, autonomía. |

---

## 6. SEGURIDAD Y PREVENCIÓN DE VULNERABILIDADES

1. **Sandboxing de Tools:** El LLM **nunca** tiene acceso a `child_process`, `exec`, ni al sistema de archivos arbitrario. Cada tool expuesta valida sus entradas con esquemas tipados de Zod.
2. **Inmutabilidad de Auditoría:** `case_events` cuenta con un trigger en PostgreSQL (`trigger_prevent_case_events_delete`) que rechaza y lanza excepción ante cualquier intento de borrado o alteración de registros.
3. **Firmas Digitales en Aprobaciones Remotas:** Los tokens para aprobar compras por Telegram o Slack utilizan HMAC-SHA256 con expiración de 24 horas y verificación de uso único contra `notification_log`.
4. **Cifrado de Credenciales Locales:** `~/.mint/session.enc` utiliza AES-256-GCM con autenticación criptográfica. Si el archivo es alterado, se detecta y se rechaza.
5. **Aislamiento Multi-Tenant en Todas las Capas:** Tanto en Fastify como en Drizzle ORM, el `companyId` se deriva exclusivamente del token validado y se inyecta en cada consulta `where(eq(table.companyId, companyId))`.

---

## 7. SUITE DE PRUEBAS AUTOMATIZADAS (100% VERIFICADO)

Se cuenta con **82 pruebas automatizadas en Vitest** distribuidas en 23 archivos de prueba:

```
 ✓ tests/immutability.test.ts (3 tests)
 ✓ tests/tools.test.ts (3 tests)
 ✓ tests/cli_keychain.test.ts (3 tests)
 ✓ tests/policy_engine.test.ts (5 tests)
 ✓ tests/auth_setup.test.ts (5 tests)
 ✓ tests/context_manager.test.ts (3 tests)
 ✓ tests/llm_client.test.ts (3 tests)
 ✓ tests/config.test.ts (2 tests)
 ✓ tests/dummy.test.ts (1 test)
 ✓ tests/sales_channel_execution.test.ts (4 tests)
 ✓ tests/agent_schema.test.ts (3 tests)
 ✓ tests/demand_and_shipments.test.ts (5 tests)
 ✓ tests/ingest.test.ts (3 tests)
 ✓ tests/multi_agent_dry_run.test.ts (1 test)
 ✓ tests/benchmark_agent_vs_baseline.test.ts (5 tests)
 ✓ tests/agent_loop.test.ts (2 tests)
 ✓ tests/autonomous_harness_and_team.test.ts (3 tests)
 ✓ tests/cli_terminal_autonomous.test.ts (6 tests)
 ✓ tests/telegram_remote_approval.test.ts (3 tests)
 ✓ tests/scenarios.test.ts (3 tests)
 ✓ tests/e2e_mint_cli.test.ts (4 tests)
 ✓ tests/daemon_watcher.test.ts (3 tests)
 ✓ tests/data_layer_hardening.test.ts (9 tests)

 Total: 82 passed (82) | 23 suites | Tiempo: ~16s | 0 fallos
```

- **Verificación de Tipos:** `npm run typecheck` (`tsc --noEmit`) -> **0 errores**.
- **Diagnóstico de Entorno:** `mint doctor` -> **100% Compatible (Node >= 22.5.0, SQLite nativo, PostgreSQL estado interno)**.
- **Frontend SPA Web:** `npm run build --prefix frontend` -> **Compilación exitosa (React 19 + Vite)**.

---

## 8. HISTORIAL DE COMMITS LOCALES (RAMA `develop`)

Siguiendo la instrucción explícita de **no hacer `git push`**, los siguientes 11 commits convencionales se encuentran registrados localmente en `develop`:

1. `c7b465a` — *feat(harness): implement autonomous back-office controller harness, multi-tenant team management and cyber tui*
2. `bf69e08` — *feat(cli): enhance terminal experience, interactive ui system, explainability and autonomous sandbox simulation*
3. `6db1320` — *feat(cli): finalize packaging, end-to-end integration tests and documentation*
4. `5577042` — *feat(notifiers): implement telegram, slack, and gmail remote notification channels with signed token approvals*
5. `ae6a623` — *feat(daemon): implement autonomous background monitor, file watcher, emergency pause/resume and triggers*
6. `6955dd8` — *feat(agent): implement multi-agent coordination with structured proposal, deterministic policy guardrails and dry-run autonomy mode*
7. `9339ba5` — *feat(ingest): add assisted column mapping and error-tolerant data ingestion with mint source commands*
8. `df791b1` — *feat(cli): create @mint/cli package with encrypted keychain and logistics commands*
9. `df6292e` — *feat(monorepo): decouple domain logic into @mint/core and preserve fastify transport*
10. `e76fa35` — *(previo) feat(web): optimize dark mode aesthetics, remove excessive text glow and add card transparency*
11. `05efdb5` — *(previo) fix(server): ensure companyId fallback and robust database connection*

---

## 9. GUÍA RÁPIDA DE ARRANQUE Y OPERACIÓN

### 1. Iniciar el Servidor Backend & Web
```bash
npm run dev
# Inicia Fastify en http://localhost:3000 y Vite SPA en http://localhost:5173
```

### 2. Iniciar Consola Interactiva Mint (Estilo Kali / Claude Code)
```bash
node packages/cli/bin/mint.js console
# o mediante script:
npm run mint -- console
```

### 3. Iniciar el Daemon Autónomo de Fondo
```bash
node packages/cli/bin/mint.js daemon start
```

### 4. Ejecutar el Conjunto de Pruebas
```bash
npm run test
npm run typecheck
```
