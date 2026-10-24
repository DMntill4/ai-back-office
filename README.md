<p align="center">
  <img src="./resources/img/bannerIcon.png" alt="AI Back Office Banner" width="100%" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Mint_CLI-v2.6.0-10B981?style=for-the-badge&logo=gnometerminal&logoColor=white" alt="Mint CLI" />
  <img src="https://img.shields.io/badge/Architecture-Terminal--First-1E293B?style=for-the-badge&logo=linux&logoColor=white" alt="Terminal First" />
  <img src="https://img.shields.io/badge/Grok_xAI-grok--4.6-FDB813?style=for-the-badge&logo=openai&logoColor=black" alt="Grok xAI" />
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Monorepo-npm_workspaces-CB3837?style=for-the-badge&logo=npm&logoColor=white" alt="Monorepo" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Supabase-Cloud_DB-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Vitest-82_Tests_Passing-6E9F18?style=for-the-badge&logo=vitest&logoColor=white" alt="Vitest" />
</p>

---

# AI Back Office Agent (MINT) & Mint CLI

> **Coordinador Logístico Autónomo Multi-Agente y Suite de Operaciones de Back Office para Distribución y Suministros Industriales**  
> Diseñado bajo una arquitectura **100% Terminal-First**. Monitorea el inventario en segundo plano mediante **Mint Daemon**, ejecuta deliberación concurrente con 4 especialistas, aplica salvaguardas deterministas inviolables a través de su **Motor de Políticas** (umbral de $5,000,000 COP), y gestiona aprobaciones humanas interactivas con canales remotos (**Telegram**, **Slack**, **Gmail**).

---

## [ARQUITECTURA] Arquitectura Monorepo y Paquetes

El proyecto está estructurado como un monorepo modular utilizando **npm workspaces**, garantizando aislamiento estricto entre lógica de negocio, interfaz de usuario y adaptadores de transporte:

```text
ai-back-office/
├── packages/
│   ├── core/           # Cerebro del sistema: agentes ReAct, harness, Drizzle ORM, DB PostgreSQL, motor de políticas
│   ├── cli/            # Interfaz de terminal Linux TUI (Claude Code theme, Thought Tree, Diff de impacto, Keychain)
│   ├── daemon/         # Proceso en segundo plano: fs.watch reactivo, escaneo de déficit, cron de plan diario
│   ├── ingest/         # Motor de ingesta asistida: CSV/Excel/SQLite/Postgres, circuit breaker (>20%), drift detection
│   └── notifiers/      # Canales remotos: Telegram Bot API, Slack Bolt, Gmail SMTP con tokens HMAC de un solo uso
├── config/             # Configuraciones de seguridad y plantillas de variables de entorno
├── docker/             # Scripts de inicialización y extensiones PostgreSQL
├── docs/               # Documentación técnica, bitácora de contexto y registros de decisión (ADRs)
├── resources/          # Diagramas de flujo, capturas y manuales de identidad visual
├── scripts/            # Scripts operacionales de base de datos y pruebas de conectividad
└── tests/              # Suite de 82 pruebas automatizadas en Vitest (23 suites de prueba)
```

### Detalle de Paquetes

| Paquete | Responsabilidad Principal | Dependencias Clave |
| :--- | :--- | :--- |
| **`@mint/core`** | Orquestador multi-agente, especialistas (Inventario, Compras, Transporte, Riesgo), herramientas tipadas con Zod, cliente Grok xAI, esquemas Drizzle ORM sobre PostgreSQL, y motor de políticas determinista. Cero dependencias de servidores HTTP. | `drizzle-orm`, `postgres`, `zod`, `openai` |
| **`@mint/cli`** | Experiencia de terminal TUI (estilo Kali Linux / Claude Code). Incluye consola interactiva REPL (`mint console`), árbol de razonamiento (`thoughtTree.ts`), tarjetas de diff de impacto en base de datos (`voucher.ts`), y bóveda local de credenciales cifrada con AES-256-GCM. | `commander`, `chalk`, `cli-table3`, `ora` |
| **`@mint/daemon`** | Servicio desatendido en segundo plano. Monitorea carpetas locales con `fs.watch`, detecta quiebres de stock en bodegas, evalúa retrasos en guías de despacho e implementa el interruptor de emergencia (`mint pause` / `mint resume`). | `chokidar`, `node:cron` |
| **`@mint/ingest`** | Ingesta resiliente de datos. Provee mapeo heurístico de columnas, protección de esquema (schema drift), circuit breaker ante borrados masivos (>20%), confirmación en 2 fases y sanitización no destructiva. Marca datos con `origin = 'real'`. | `node:sqlite`, `xlsx`, `csv-parser` |
| **`@mint/notifiers`** | Adaptadores de notificación para gobernanza remota. Permite aprobar o rechazar órdenes de compra desde Telegram, Slack o correo electrónico utilizando tokens criptográficos HMAC-SHA256 con TTL de 24h. | `node-telegram-bot-api`, `nodemailer` |

---

## [CLI] Guía de Comandos Mint CLI

Todos los comandos soportan el flag `--json` para integración directa en pipelines de CI/CD o scripts de automatización.

```bash
# [ARRANQUE] INICIO DEL SISTEMA (100% TERMINAL-FIRST)
npm start                          # Inicia el Daemon en segundo plano y la Consola Interactiva
npm run agent                      # Alias de inicio para el operador de back office
npm run agent:headless             # Ejecución continua en segundo plano (para servidores o Docker)
mint console                       # Consola interactiva REPL permanente (comandos slash y lenguaje natural)

# 0. DIAGNÓSTICO Y ENTORNO
mint doctor                        # Diagnostica Node.js (>=22.5.0), SQLite nativo y estado de PostgreSQL

# 1. AUTENTICACIÓN Y CREDENCIALES (KEYCHAIN CIFRADO AES-256-GCM)
mint login <email> <password>      # Autenticación corporativa y almacenamiento cifrado local
mint whoami                        # Consulta el usuario activo, rol RBAC y tenant (companyId)
mint logout                        # Cierra la sesión y destruye el almacén cifrado local

# 2. OPERACIÓN Y TABLEROS DE CONTROL
mint dashboard                     # Panel unificado: inventario, alertas de quiebre, casos abiertos y canales
mint stock                         # Catálogo de herramientas y existencias en bodegas (Bucaramanga, Bogotá, Medellín)
mint orders                        # Registro de órdenes de compra emitidas y confirmadas en base de datos
mint plan today                    # Briefing diario: decisiones ejecutadas, capital gestionado y riesgos mitigados
mint watch                         # Feed interactivo en tiempo real con eventos y decisiones del sistema

# 3. METAS ESTRATÉGICAS Y OPTIMIZACIÓN CUANTITATIVA
mint goal --target 15000000        # Ejecuta análisis cuantitativo real para recortar gastos o compras excesivas
mint goal --days 45                # Proyecta coberturas de stock y optimiza capital de trabajo según historial real

# 4. BANDEJA DE APROBACIONES HUMAN-IN-THE-LOOP (HITL)
mint inbox                         # Consulta decisiones pendientes de autorización humana
mint inbox approve <id>            # Autoriza y ejecuta la compra en PostgreSQL mostrando el Diff de Impacto
mint inbox reject <id>             # Rechaza la propuesta y estampa la justificación en auditoría inmutable
mint explain <id>                  # Muestra el árbol de razonamiento completo y el score de riesgo del agente

# 5. GOBERNANZA Y NIVELES DE AUTONOMÍA
mint autonomy get                  # Consulta el nivel de autonomía activo (dry-run, assisted, auto)
mint autonomy set dry-run          # Modo seguro: genera propuestas completas sin mutar la base de datos
mint autonomy set assisted         # Autoejecuta compras bajo $5,000,000 COP; escala a HITL las mayores
mint autonomy set auto             # Modo autónomo: autoejecuta con veto del especialista de riesgo

# 6. MONITOREO EN SEGUNDO PLANO (DAEMON)
mint daemon start                  # Inicia el proceso supervisor en segundo plano
mint daemon status                 # Consulta PID, ciclos de escaneo y estado del monitor
mint daemon stop                   # Detiene el proceso del daemon
mint pause                         # Interruptor de emergencia: congela de inmediato toda auto-ejecución
mint resume                        # Reanuda la operación autónoma normal

# 7. GESTIÓN DE FUENTES DE DATOS (INGESTA SEGURA)
mint source discover [ruta]        # Explora archivos (.csv, .xlsx, .sqlite, .db) en el directorio indicado
mint source inspect <ruta>         # Analiza encabezados y propone mapeo de columnas sin modificar la BD
mint source add <ruta>             # Sincroniza datos con tolerancia a fallos, circuit breaker y drift detection
mint source status                 # Audita frescura de fuentes (alerta si superan 24h sin actualización)
mint source list                   # Lista fuentes activas y su estado de salud (HEALTHY, DRIFTED, ERROR)

# 8. GESTIÓN DE EQUIPOS SAAS (RBAC)
mint team list                     # Lista miembros de la organización y sus roles (owner, operator, auditor, viewer)
mint team invite <email>           # Registra o invita a un nuevo miembro a la empresa
mint team remove <id>              # Desvincula a un miembro protegiendo al último owner de la empresa

# 9. CANALES REMOTOS DE NOTIFICACIÓN
mint notify add telegram           # Configura bot interactivo de Telegram con botones inline
mint notify add slack              # Configura canal corporativo de Slack
mint notify add gmail              # Configura notificaciones formales por correo electrónico
mint notify test telegram          # Envía notificación de prueba con tokens firmados de aprobación
```

---

## [AGENTES] Red Multi-Agente y Motor de Políticas

```text
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
      │ y días de cobertura  ││ y recálculo de ETA   ││ cotización homologada│
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
       [ AUTO_EXECUTED (Bajo Umbral) ]             [ PENDING_APPROVAL (HITL) ]
       Orden de compra en PostgreSQL               Notificación interactiva en
       y paso de verificación física               Telegram / Slack / Gmail
                                                   (Token firmado de un solo uso)
```

### Reglas Clave de Gobernanza Determinista

1. **El LLM Propone, el Código Gobierna:** El modelo de lenguaje nunca muta la base de datos directamente ni accede al sistema de archivos arbitrario. Cada acción es evaluada por esquemas tipados Zod y funciones matemáticas deterministas.
2. **Umbral Presupuestal ($5,000,000 COP):** En modo `assisted`, cualquier orden de compra igual o superior a $5,000,000 COP requiere autorización humana explícita.
3. **Ventana Anti-Duplicados (72 Horas):** Se bloquea automáticamente cualquier orden de compra si ya existe una orden activa para el mismo SKU con el mismo proveedor dentro de una ventana de 72 horas.
4. **Protección de Datos Obsoletos (`RULE_STALE_DATA_REFUSAL`):** Si una fuente de inventario supera las 24 horas sin sincronizarse o presenta alteración de esquema (`DRIFTED`), el sistema rechaza la auto-ejecución y escala el caso.
5. **Auditoría Append-Only Inmutable:** La tabla `case_events` cuenta con un trigger nativo en PostgreSQL que deniega terminantemente sentencias `UPDATE` y `DELETE`.

---

## [UI] Interfaz de Terminal Profesional (TUI)

Mint CLI implementa una interfaz de terminal sobria, moderna y de alta densidad informativa inspirada en herramientas como Claude Code y entornos Unix de seguridad:

- **Thought Tree (`thoughtTree.ts`):** Renderiza la deliberación del agente en una estructura de árbol visual (`┌─`, `├─`, `└─`) mostrando fase de introspección, herramientas consultadas, argumentos y dictamen final.
- **Diff de Impacto en Base de Datos (`renderProductionAuditCard`):** Al ejecutar o autorizar una orden de compra, la terminal despliega una tarjeta de auditoría técnica con:
  - Identificador único de orden y caso operativo asociado.
  - Tabla de cambios en PostgreSQL: estado previo vs estado nuevo.
  - Registro de transacción y confirmación de verificación física.
  - Indicadores técnicos limpios: `[OK]`, `[ALERTA]`, `[CLI]`, `[ARQUITECTURA]`, `●`, `▸`.

---

## [DATOS] Dominio de Negocio: Suministros Industriales

El sistema viene preconfigurado con datos realistas para el sector de ferretería y suministros industriales en Colombia:

- **Empresa:** Ferretería Industrial Santandereana S.A.S. (NIT: 900.542.118-4).
- **Sedes y Bodegas:**
  - `BOD-BUC`: Bodega Central Palenque (Bucaramanga).
  - `BOD-BOG`: Centro de Distribución Fontibón (Bogotá).
  - `BOD-MED`: Punto Logístico Itagüí (Medellín).
- **Catálogo de Productos:** 16 SKUs industriales reales (taladros percutores DeWalt, motobombas Honda, pulidoras Bosch, compresores de aire, generadores eléctricos, soldadores inverter, etc.) con precios unitarios de mercado en pesos colombianos (COP).
- **Proveedores Homologados:** Proveedores certificados con tiempos de entrega (lead time) y cantidades mínimas de orden (MOQ) calibradas.
- **Motor de Metas Cuantitativo:** El comando `mint goal` analiza el histórico real de consumo y costos en base de datos para calcular palancas de optimización precisas (renegociación por volumen, compresión de cobertura de stock, optimización de fletes y consolidación de pedidos). Cero datos inventados o porcentajes fijos.

---

## [TESTS] Suite de Pruebas y Control de Calidad

Mint cuenta con una suite completa de **82 pruebas automatizadas** ejecutadas sobre Vitest:

```bash
# Ejecutar la suite completa de pruebas
npm test

# Verificación estricta de tipos TypeScript
npm run typecheck

# Inicializar y sembrar la base de datos de producción/pruebas
npm run db:migrate
npm run db:seed
```

### Resumen de Pruebas Automatizadas

| Suite de Pruebas | Archivos | Tests | Estado |
| :--- | :--- | :--- | :--- |
| **Inmutabilidad y Triggers BD** | `tests/immutability.test.ts` | 3 | [OK] |
| **Herramientas de Negocio Zod** | `tests/tools.test.ts` | 3 | [OK] |
| **Bóveda Cifrada (Keychain)** | `tests/cli_keychain.test.ts` | 3 | [OK] |
| **Motor de Políticas Determinista** | `tests/policy_engine.test.ts` | 5 | [OK] |
| **Context Manager y Memoria** | `tests/context_manager.test.ts` | 3 | [OK] |
| **Cliente LLM y Resiliencia** | `tests/llm_client.test.ts` | 3 | [OK] |
| **Canales de Notificación Remota** | `tests/telegram_remote_approval.test.ts` | 3 | [OK] |
| **Ingesta Asistida y Drift** | `tests/ingest.test.ts`, `data_layer_hardening.test.ts` | 12 | [OK] |
| **Harness Multi-Agente Concurrente**| `tests/autonomous_harness_and_team.test.ts` | 3 | [OK] |
| **Terminal TUI y Comandos CLI** | `tests/cli_terminal_autonomous.test.ts`, `e2e_mint_cli.test.ts` | 10 | [OK] |
| **Daemon y Watcher de Archivos** | `tests/daemon_watcher.test.ts` | 3 | [OK] |
| **Simulaciones y Escenarios** | `tests/scenarios.test.ts`, `demand_and_shipments.test.ts` | 8 | [OK] |
| **Benchmark Agente vs Baseline** | `tests/benchmark_agent_vs_baseline.test.ts` | 5 | [OK] |
| **Total Global** | **23 Suites** | **82 Tests** | **100% Pasando** |

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

<p align="center">
  <sub>Mint Autonomous AI Back Office &bull; Desarrollado para el Reto de Agentes Autónomos 2026</sub>
</p>
