# CONTEXT.md - Handoff General del Proyecto Mint

> Documento de contexto operativo, principios rectores y directivas arquitectonicas para el equipo de desarrollo.

---

## 1. Directivas de Trabajo y Principios Rectores

- **Un paso a la vez:** Cambios pequenos, revisables y verificables.
- **Sin alucinaciones:** Cero datos inventados, librerias ficticias ni porcentajes arbitrarios.
- **Cero secretos en el repositorio:** Las credenciales y claves viven en `.env` o en la boveda cifrada local (`keychain.ts`).
- **Verificacion obligatoria:** Todo cambio debe validar tipos con `npm run typecheck` y suite de pruebas con `npm test`.

---

## 2. Definicion del Proyecto

**Mint** es un **Coordinador Logistico Autonomo Multi-Agente y AI Back Office** distribuido, disenado para operar bajo una arquitectura **100% Terminal-First**.

Recibe **eventos operativos** (quiebres de stock, retrasos en transporte, nuevos archivos de datos), delibera en paralelo mediante cuatro **especialistas autonomos** (Inventario, Compras, Transporte y Riesgo), aplica un **Motor de Politicas Determinista**, ejecuta acciones idempotentes en **PostgreSQL**, **verifica fisicamente** los resultados y cierra los casos con trazabilidad inmutable append-only.

### Que NO es:
- No es un simple chatbot de conversacion pasiva.
- No es una interfaz web pesada dependiente de servidores HTTP locales.
- No es un agente sin restricciones: la IA nunca muta la base de datos de compras de forma directa ni accede a shell.

---

## 3. Estado Actual de la Arquitectura (Rama `developGuerra`)

- **Arquitectura Monorepo (`npm workspaces`):**
  - `@mint/core`: Cerebro del sistema (agentes ReAct, harness multi-agente, Drizzle ORM, base de datos PostgreSQL, motor de politicas determinista y servicios de negocio).
  - `@mint/cli`: Interfaz de terminal Linux TUI (Claude Code theme, Thought Tree, diff de impacto en base de datos, keychain cifrado AES-256-GCM).
  - `@mint/daemon`: Proceso en segundo plano con `fs.watch` nativo, monitor de existencias, plan diario e interruptor de emergencia (`mint pause` / `mint resume`).
  - `@mint/ingest`: Motor de ingesta asistida con circuit breaker (>20%), deteccion de schema drift, confirmacion en dos fases y sanitizacion no destructiva.
  - `@mint/notifiers`: Adaptadores remotos para Telegram, Slack y Gmail con tokens firmados HMAC-SHA256 de un solo uso.
- **Dominio Industrial Colombiano:**
  - Calibrado para: **Ferreteria Industrial Santandereana S.A.S.**
  - Bodegas: Bucaramanga (`BOD-BUC`), Bogota (`BOD-BOG`) y Medellin (`BOD-MED`).
  - Moneda: Pesos Colombianos (COP).
  - Umbral de supervision humana (HITL): **$5,000,000 COP**.
  - Catalogo: 16 SKUs industriales reales (herramientas DeWalt, Bosch, Honda, etc.) con proveedores homologados.
- **Motor de Metas Cuantitativo (`mint goal`):**
  - Analisis matematico directo sobre ordenes de compra historicas e inventario real para proyectar ahorros en capital de trabajo. Cero formulas ficticias.
- **Control de Calidad:**
  - 82 pruebas automatizadas en Vitest pasando al 100% (23 suites de prueba).
  - Verificacion estricta de tipos TypeScript con 0 errores.
  - Cero emojis en codigo, consola y documentacion tecnica.

---

## 4. Principios Inviolables de Gobernanza

1. **El Modelo Propone, el Codigo Gobierna:** Grok propone cursos de accion; el codigo determinista valida esquemas Zod, limites de presupuesto y reglas de seguridad.
2. **Human-in-the-Loop Obligatorio:** En modo `assisted`, cualquier orden igual o mayor a $5,000,000 COP genera un ticket formal en la bandeja HITL para autorizacion humana.
3. **Idempotencia y Ventana Anti-Duplicados (72h):** Cada transaccion requiere una clave idempotente unica. Se bloquean ordenes duplicadas al mismo proveedor dentro de 72 horas.
4. **Verificacion Fisica Post-Escritura:** Ningun caso se concluye como `resuelto` sin verificar la existencia fisica de la fila en PostgreSQL.
5. **Auditoria Inmutable Append-Only:** La tabla `case_events` cuenta con un trigger nativo en PostgreSQL que deniega sentencias `UPDATE` y `DELETE`.
6. **Guardrail de Frescura (`RULE_STALE_DATA_REFUSAL`):** Si una fuente de datos supera 24 horas sin actualizarse o presenta alteracion de esquema (`DRIFTED`), el agente rechaza la autoejecucion y escala a HITL.

---

## 5. Estructura del Repositorio

```text
ai-back-office/
├── packages/
│   ├── core/           # Cerebro: Agentes, Harness, Tools Zod, DB Drizzle, Politicas y Servicios
│   ├── cli/            # Interfaz de terminal: Comandos, TUI, Thought Tree, Diff Card y Keychain
│   ├── daemon/         # Daemon supervisor en segundo plano con fs.watch nativo
│   ├── ingest/         # Ingesta resiliente: CSV/Excel/SQLite/Postgres con circuit breaker y drift detection
│   └── notifiers/      # Canales remotos: Telegram Bot API, Slack Bolt, Gmail SMTP
├── config/             # Variables de entorno y plantillas de seguridad
├── docker/             # Dockerfile y scripts de inicializacion de PostgreSQL
├── docs/               # Documentacion tecnica, bitacora de contexto y registros de decision (ADRs)
├── resources/          # Diagramas de arquitectura y recursos visuales
├── scripts/            # Scripts operacionales de base de datos
└── tests/              # Suite de 82 pruebas automatizadas en Vitest (23 suites)
```

---

## 6. Comandos Principales de Operacion

```bash
# Arranque completo del sistema (Daemon + Consola Interactiva)
npm start

# Consola interactiva permanente (REPL)
mint console

# Diagnostico de entorno y base de datos
mint doctor

# Ejecucion de pruebas automatizadas
npm test

# Verificacion estricta de tipos
npm run typecheck

# Inicializar y sembrar catalogo colombiano
npm run db:migrate
npm run db:seed

# Consulta de inventario y alertas
mint stock
mint dashboard

# Bandeja de aprobaciones HITL
mint inbox
mint inbox approve <id>
mint inbox reject <id>

# Motor cuantitativo de metas estrategicas
mint goal --target 15000000
```
