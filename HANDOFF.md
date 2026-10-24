# [MINT] MINT CLI & AUTONOMOUS AI BACK OFFICE - DOCUMENTO DE TRANSFERENCIA TECNICA (HANDOFF)

**Fecha de Entrega:** 24 de Octubre de 2026  
**Rama:** `developGuerra`  
**Estado:** Produccion / Verificado (82 pruebas en verde en 23 suites, 0 errores de tipado, arquitectura 100% Terminal-First)  

---

## 1. RESUMEN EJECUTIVO Y EVOLUCION ARQUITECTONICA

El proyecto culmino una refactorizacion integral que erradico el codigo muerto, el "sindrome del espejo" (carpeta duplicada `/src` en la raiz) y la dependencia de interfaces web innecesarias, consolidando **Mint CLI**: un **Coordinador Logistico Autonomo y AI Back Office** distribuido, seguro y multi-agente operado 100% desde la terminal.

### Pilares Fundamentales del Sistema:
1. **Arquitectura 100% Terminal-First:** No depende de servidores HTTP ni navegadores web para su operacion diaria. El operador interactua a traves de una consola profesional de terminal (TUI) con arbol de pensamiento (`thoughtTree.ts`) y tarjetas de auditoria de impacto en base de datos.
2. **Proactividad Basada en Eventos:** El sistema no espera consultas pasivas. El **Daemon** vigila continuamente en segundo plano archivos locales mediante `fs.watch`, evalua niveles minimos de existencias y detecta guias de transporte retrasadas, abriendo casos operativos de forma autonoma.
3. **Harness Multi-Agente Concurrente:** Cuatro especialistas dedicados (Inventario, Compras, Transporte y Riesgo Adversarial) deliberan concurrentemente antes de emitir cualquier propuesta de accion.
4. **Gobernanza y Politicas Deterministas:** La IA **nunca** muta la base de datos de compras de forma directa ni tiene acceso a shell. El codigo determinista (`evaluatePolicy`) audita el costo en COP, duplicidad en 72 horas, confiabilidad del proveedor y el nivel de autonomia activo.
5. **Dominio Industrial Real:** El catalogo y la logica estan calibrados para la distribucion de suministros industriales en Colombia (`Ferreteria Industrial Santandereana S.A.S.`), operando en pesos colombianos (COP), con sedes en Bucaramanga, Bogota y Medellin, y un umbral de aprobacion de $5,000,000 COP.
6. **Aprobaciones Remotas Seguras:** Capacidad de autorizar o rechazar compras criticas desde **Telegram**, **Slack** o **Gmail** mediante tokens HMAC-SHA256 de un solo uso e idempotentes.

---

## 2. ARQUITECTURA MONOREPO Y PAQUETES

El repositorio utiliza **npm workspaces** estructurado en cinco paquetes desacoplados:

```text
ai-back-office/
├── packages/
│   ├── core/           # Cerebro autonomo: Agentes, Harness, Tools Zod, DB Drizzle, Politicas y Servicios
│   ├── cli/            # Interfaz de terminal profesional (Linux TUI, Claude Code theme, Keychain, REPL)
│   ├── daemon/         # Proceso en segundo plano, Observador de archivos (fs.watch), Triggers periodicos
│   ├── ingest/         # Motor de ingesta asistida de CSV/Excel/SQLite/Postgres, circuit breaker y drift detection
│   └── notifiers/      # Canales remotos (Telegram Bot API, Slack Bolt, Gmail SMTP) y tokens firmados
├── config/             # Variables de entorno y plantillas de seguridad
├── docker/             # Configuracion de contenedores e inicializacion de PostgreSQL
├── docs/               # Documentacion tecnica, bitacora de contexto y registros de decision (ADRs)
├── scripts/            # Utilidades de administracion de base de datos
└── tests/              # Suite de 82 pruebas automatizadas en Vitest
```

### Detalle de Paquetes

#### 1. `@mint/core` (`packages/core`)
- **Agentes y Especialistas:**
  - `coordinador.ts`: Orquestador principal que abre casos y sintetiza planes de resolucion.
  - `harness.ts`: Harness de controladores en paralelo (`runBackOfficeHarness`) con arbol de razonamiento.
  - `inventarioSpecialist.ts`: Calculo de consumo diario, dias de cobertura y deteccion de desabastos.
  - `comprasSpecialist.ts`: Seleccion de proveedores homologados, cotizaciones, MOQ y tiempos de entrega.
  - `transporteSpecialist.ts`: Auditoria de guias en transito y replanificacion de rutas por retraso.
  - `riesgoSpecialist.ts`: Agente adversarial que audita duplicidad en 72h y proveedores riesgosos.
- **Motor de Politicas (`policyEngine.ts`):** Aplica reglas matematicas inviolables (`RULE_DUPLICATE_ORDER_BLOCK`, `RULE_DRY_RUN_GUARDRAIL`, `RULE_SPEND_EXCEEDS_THRESHOLD`, `RULE_STALE_DATA_REFUSAL`). Niveles: `dry-run` (por defecto), `assisted` (umbral $5,000,000 COP), `auto`.
- **Servicios de Negocio:** Ingesta de eventos (`eventEngine.ts`), ejecucion y verificacion fisica (`decisionExecutionService.ts`), metas estrategicas cuantitativas (`goalSeekingService.ts`), pronostico de demanda (`demandService.ts`), logistica (`shipmentService.ts`), gestion de equipos SaaS (`teamService.ts`).
- **Base de Datos:** Drizzle ORM sobre PostgreSQL / Supabase con 19 esquemas fuertemente tipados.

#### 2. `@mint/cli` (`packages/cli`)
- **Ejecutable:** `./bin/mint.js` registrado globalmente en `package.json`.
- **Keychain Cifrado (`keychain.ts`):** Almacena credenciales de sesion local en `~/.mint/session.enc` usando **AES-256-GCM** derivado con `scrypt` del usuario/host del sistema. Cero archivos en texto plano.
- **Sistema de Diseno TUI:** Paleta Mint Green (`#10B981`), arbol de introspeccion (`thoughtTree.ts`), tarjetas de diff de impacto en produccion (`renderProductionAuditCard`), tablas adaptables y banner ASCII.
- **Consola Interactiva (`mint console`):** Shell REPL permanente para operaciones continuas sin recargar Node.js.

#### 3. `@mint/daemon` (`packages/daemon`)
- Proceso en segundo plano que vigila el directorio de fuentes de datos (`fs.watch`) e ingesta archivos automaticamente.
- Disparadores periodicos: `scanStockDeficits`, `scanDelayedShipments`, `generateDailyPlan`.
- Interruptor de emergencia (`mint pause` / `mint resume`) para congelar la autonomia inmediatamente ante anomalias.

#### 4. `@mint/notifiers` (`packages/notifiers`)
- Adaptadores modulares para **Telegram**, **Slack** y **Gmail**.
- Firma criptografica HMAC-SHA256 con TTL de 24 horas y proteccion contra replay attacks mediante `notification_log.is_used`.
- Aprobacion remota de un solo clic que ejecuta la orden en base de datos y estampa auditoria inmutable.

#### 5. `@mint/ingest` (`packages/ingest`)
- Parser resiliente que aisla filas con errores sin abortar el lote completo.
- Mapeador de columnas asistido con scoring de confianza hacia tablas maestras.
- Circuit breaker que congela la sincronizacion si desaparece mas del 20% de los SKUs activos.
- Confirmacion de borrado en dos fases y sanitizacion no destructiva.
- Marca automatica `origin = 'real'` en todos los datos importados.

---

## 3. MATRIZ DE CONTROLADORES Y AGENTES AUTONOMOS

```text
            [ Disparador: Archivo Modificado / Stock Bajo / Envio Retrasado ]
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
       │ INVENTARIO Y DEMANDA ││ TRANSPORTE Y ENVIOS  ││ COMPRAS Y PROVEEDORES│
       │ Deteccion de deficit ││ Tracking retrasado   ││ Seleccion mejor      │
       │ y dias de cobertura  ││ y recalculado de ETA ││ cotizacion homologada│
       └──────────┬───────────┘└──────────┬───────────┘└──────────┬───────────┘
                  │                       │                       │
                  └───────────────────────┼───────────────────────┘
                                          │
                                          ▼
                      ┌───────────────────────────────────────┐
                      │ ESPECIALISTA EN RIESGO Y AUDITORIA    │
                      │ Abogado del Diablo: Score, duplicados │
                      │ en 72h, solvencia y sobrecostos       │
                      └───────────────────┬───────────────────┘
                                          │ Emite ActionProposal estructurada
                                          ▼
                      ┌───────────────────────────────────────┐
                      │   MOTOR DE POLITICAS DETERMINISTA     │
                      │  (Codigo matematico, NUNCA el LLM)    │
                      │  Anti-duplicados, umbral presupuestal,│
                      │  reversibilidad y modo de autonomia   │
                      └───────────────────┬───────────────────┘
                                          │
                    ┌─────────────────────┴─────────────────────┐
                    ▼                                           ▼
      [ AUTO_EXECUTED (Bajo Umbral) ]               [ PENDING_APPROVAL (HITL) ]
                    │                                           │
                    ▼                                           ▼
         Ejecucion Inmediata en BD                   Notificacion Multicanal
         + Verificacion Fisica                       (Telegram / Slack / Gmail)
         + Diff de Impacto en Consola                + Token HMAC de Aprobacion
```

---

## 4. GUIA COMPLETA DE COMANDOS MINT CLI

Todos los comandos soportan `--json` para integracion en pipelines o scripts de shell.

| Comando | Descripcion |
| :--- | :--- |
| **`mint start`** | Inicia el sistema completo (Daemon en segundo plano y Consola Interactiva). |
| **`mint console`** *(alias `repl`)* | Shell interactivo permanente estilo Claude Code / Unix. |
| **`mint doctor`** | Diagnostica Node (>=22.5.0), SQLite nativo y conexion PostgreSQL. |
| **`mint login [email] [pass]`** | Autentica contra la organizacion y guarda sesion cifrada AES-256 en keychain. |
| **`mint logout`** | Cierra sesion y destruye de forma segura el archivo cifrado. |
| **`mint whoami`** | Muestra usuario, empresa, rol RBAC y estado de la sesion activa. |
| **`mint dashboard`** *(alias `status`)* | Panel unificado: inventario, alertas de quiebre, casos abiertos y canales. |
| **`mint stock`** | Tabla en tiempo real del catalogo, bodegas colombianas y existencias. |
| **`mint orders`** | Tabla de ordenes de compra emitidas, montos y estados en PostgreSQL. |
| **`mint goal`** | Motor cuantitativo de metas estrategicas y optimizacion de capital de trabajo. |
| **`mint inbox`** | Bandeja de decisiones pendientes de supervision humana (HITL). |
| **`mint inbox approve <id>`** | Autoriza una decision ejecutando la compra en BD con Diff de Impacto. |
| **`mint inbox reject <id>`** | Rechaza una decision y la archiva en auditoria inmutable. |
| **`mint explain <id>`** | Explicabilidad profunda: desglose de especialistas, riesgo y regla aplicada. |
| **`mint simulate [shock]`** | Simula choques what-if en sandbox (`stockout`, `delay`, `price-spike`). |
| **`mint team list`** | Lista miembros y roles RBAC del tenant (`owner`, `operator`, `auditor`, `viewer`). |
| **`mint team invite <email>`** | Invita o da de alta a un nuevo miembro del equipo. |
| **`mint team remove <id>`** | Da de baja a un miembro protegiendo al ultimo owner de la empresa. |
| **`mint source add <path>`** | Ingesta de archivos con mapeo asistido, circuit breaker y drift detection. |
| **`mint source status`** | Audita frescura de fuentes (alerta fuentes desfasadas >24h). |
| **`mint source list`** | Lista fuentes de datos conectadas y su estado de salud. |
| **`mint autonomy get`** | Muestra el nivel de autonomia activo (`dry-run`, `assisted`, `auto`). |
| **`mint autonomy set <level>`** | Modifica el nivel de gobernanza y autonomia de la empresa. |
| **`mint daemon start`** | Inicia el proceso autonomo en segundo plano. |
| **`mint daemon stop`** | Detiene el daemon de monitoreo. |
| **`mint daemon status`** | Consulta PID, uptime, ciclos y estado del daemon. |
| **`mint pause`** | **Interruptor de emergencia:** congela de inmediato toda autonomia. |
| **`mint resume`** | Reanuda las operaciones autonomas pausadas. |
| **`mint watch`** | Feed en tiempo real con indicador visual de eventos y decisiones. |
| **`mint plan today`** | Briefing diario: casos en curso, decisiones y dinero gestionado. |
| **`mint notify add <tipo>`** | Configura canales remotos (Telegram, Slack, Gmail). |
| **`mint notify test <tipo>`** | Envia notificacion de prueba interactiva con botones firmados. |
| **`mint chat "<msg>"`** | Consulta conversacional directa al Agente Coordinador con Thought Tree. |

---

## 5. ESQUEMA DE BASE DE DATOS (DRIZZLE ORM)

| Tabla | Proposito y Blindajes |
| :--- | :--- |
| **`companies`** | Multi-tenant maestro (`id`, `name`, `slug`). |
| **`users`** | Usuarios corporativos con roles (`owner`, `operator`, `auditor`, `viewer`). |
| **`products`** | Catalogo de productos (`sku`, `min_stock`, `origin = 'real' \| 'simulado'`). |
| **`inventory`** | Existencias por producto y bodega (`stock`, `warehouse_id`). |
| **`suppliers`** | Proveedores homologados colombianos (`origin = 'real'`). |
| **`supplier_products`** | Precios unitarios pactados en COP, MOQ y dias de entrega (`lead_time_days`). |
| **`purchase_orders`** | Ordenes de compra oficiales generadas de forma autonoma o HITL. |
| **`shipments`** | Guias de transporte en transito, transportistas y fechas de entrega prometidas vs ETA. |
| **`cases`** | Casos operativos abiertos por eventos (`recibido`, `en_proceso`, `resuelto`, `escalado`). |
| **`case_events`** | **Linea de tiempo inmutable append-only** protegida por trigger contra `UPDATE` y `DELETE`. |
| **`decisions`** | Propuestas evaluadas con evidencia, score de riesgo, regla de politica y verificacion. |
| **`operational_events`** | Cola de eventos de fondo (`STOCK_CRITICAL`, `SHIPMENT_DELAY`, etc.). |
| **`policy_rules`** | Politicas dinamicas aprendidas o configuradas por empresa. |
| **`data_sources`** | Fuentes conectadas (archivos locales, conexiones Postgres externas). |
| **`import_jobs`** | Historial de importaciones con conteo de filas procesadas y filas erroneas aisladas. |
| **`notification_channels`** | Canales remotos (Telegram, Slack, Gmail) con horarios silenciosos. |
| **`notification_log`** | Bitacora de mensajes con tokens HMAC firmados y bandera de consumo unico (`is_used`). |
| **`business_config`** | Configuracion por tenant (clave compuesta `company_id, key`): tono, umbral, autonomia. |

---

## 6. SEGURIDAD Y PREVENCION DE VULNERABILIDADES

1. **Sandboxing de Tools:** El LLM **nunca** tiene acceso a `child_process`, `exec`, ni al sistema de archivos arbitrario. Cada tool expuesta valida sus entradas con esquemas tipados de Zod.
2. **Inmutabilidad de Auditoria:** `case_events` cuenta con un trigger en PostgreSQL (`trigger_prevent_case_events_delete`) que rechaza y lanza excepcion ante cualquier intento de borrado o alteracion de registros.
3. **Firmas Digitales en Aprobaciones Remotas:** Los tokens para aprobar compras por Telegram o Slack utilizan HMAC-SHA256 con expiracion de 24 horas y verificacion de uso unico contra `notification_log`.
4. **Cifrado de Credenciales Locales:** `~/.mint/session.enc` utiliza AES-256-GCM con autenticacion criptografica. Si el archivo es alterado, se detecta y se rechaza.
5. **Aislamiento Multi-Tenant Estricto:** Toda consulta relacional aplica el filtro `where(eq(table.companyId, companyId))` derivado del token verificado.
6. **Guardrail de Frescura (`RULE_STALE_DATA_REFUSAL`):** Rechaza compras automaticas sobre inventarios que superen 24 horas de desfase o fuentes alteradas.

---

## 7. SUITE DE PRUEBAS AUTOMATIZADAS (100% VERIFICADO)

Se cuenta con **82 pruebas automatizadas en Vitest** distribuidas en 23 suites:

```text
 [OK] tests/immutability.test.ts (3 tests)
 [OK] tests/tools.test.ts (3 tests)
 [OK] tests/cli_keychain.test.ts (3 tests)
 [OK] tests/policy_engine.test.ts (5 tests)
 [OK] tests/auth_setup.test.ts (5 tests)
 [OK] tests/context_manager.test.ts (3 tests)
 [OK] tests/llm_client.test.ts (3 tests)
 [OK] tests/config.test.ts (2 tests)
 [OK] tests/dummy.test.ts (1 test)
 [OK] tests/sales_channel_execution.test.ts (4 tests)
 [OK] tests/agent_schema.test.ts (3 tests)
 [OK] tests/demand_and_shipments.test.ts (5 tests)
 [OK] tests/ingest.test.ts (3 tests)
 [OK] tests/multi_agent_dry_run.test.ts (1 test)
 [OK] tests/benchmark_agent_vs_baseline.test.ts (5 tests)
 [OK] tests/agent_loop.test.ts (2 tests)
 [OK] tests/autonomous_harness_and_team.test.ts (3 tests)
 [OK] tests/cli_terminal_autonomous.test.ts (6 tests)
 [OK] tests/telegram_remote_approval.test.ts (3 tests)
 [OK] tests/scenarios.test.ts (3 tests)
 [OK] tests/e2e_mint_cli.test.ts (4 tests)
 [OK] tests/daemon_watcher.test.ts (3 tests)
 [OK] tests/data_layer_hardening.test.ts (9 tests)

 Total: 82 passed (82) | 23 suites | 0 fallos
```

- **Verificacion de Tipos:** `npm run typecheck` (`tsc --noEmit`) -> **0 errores**.
- **Diagnostico de Entorno:** `mint doctor` -> **100% Compatible (Node >= 22.5.0, SQLite nativo, PostgreSQL conectado)**.

---

## 8. GUIA RAPIDA DE OPERACION EN PRODUCCION

### 1. Iniciar el Sistema
```bash
npm start
```
Inicia de forma concurrente el **Daemon vigilante** en segundo plano y la **Consola Interactiva REPL**.

### 2. Comandos Frecuentes en Consola
- `/status`: Dashboard operativo en tiempo real.
- `/stock`: Existencias en bodegas y alertas de quiebre.
- `/inbox`: Bandeja de aprobaciones HITL pendientes.
- `/approve <id>`: Autoriza una orden de compra y visualiza el Diff de Impacto en base de datos.
- `/reject <id>`: Rechaza una propuesta de compra.
- `/goal`: Ejecuta optimizacion cuantitativa de metas estrategicas.
- `/scan`: Fuerza un ciclo proactivo de escaneo de inventario y transporte.
- `/clear`: Limpia la pantalla de la terminal.
- `/exit`: Apagado ordenado del daemon y salida de la consola.
