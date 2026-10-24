# [HANDOFF] Transferencia Tecnica para el Equipo: AI Back Office (MINT)

Documento oficial de transferencia tecnica y arquitectura de las funcionalidades implementadas en la plataforma **Mint CLI** y **Autonomous AI Back Office** en la rama `developGuerra`.

---

## 1. Resumen de Capacidades Implementadas

El proyecto evoluciono desde un prototipo conversacional hacia un **Coordinador Logistico Autonomo Multi-Agente 100% Terminal-First**:

1. **Arquitectura 100% Terminal-First (Cero Frontend Web):**
   - Se erradico por completo la dependencia de interfaces web locales (React 19, Fastify HTTP en puerto 3001, Vite).
   - Se elimino el "sindrome del espejo" (la carpeta `/src` duplicada en la raiz fue eliminada; toda la logica reside en `packages/core`).
   - El operador interactua a traves de una consola de terminal profesional (TUI) con estética sobria (estilo Kali Linux / Claude Code).

2. **Thought Tree y Tarjetas de Impacto en Base de Datos:**
   - **Thought Tree (`thoughtTree.ts`):** Renderiza en tiempo real el arbol de deliberacion del agente con ramas visuales (`┌─`, `├─`, `└─`), detallando fase de introspeccion, herramientas consultadas y argumentos.
   - **Production Impact Diff Card (`renderProductionAuditCard`):** Al autorizar o ejecutar compras en la bandeja HITL (`mint inbox approve`), despliega una tarjeta tecnica con los cambios en PostgreSQL (estado previo vs nuevo, ID de orden, transaccion y verificacion fisica).

3. **Dominio Industrial Colombiano y Datos Verificables:**
   - Preconfigurado para el sector ferretero: **Ferreteria Industrial Santandereana S.A.S.** (Bucaramanga `BOD-BUC`, Bogota `BOD-BOG`, Medellin `BOD-MED`).
   - Moneda oficial en pesos colombianos (COP).
   - Umbral de supervision humana (HITL) en modo asistido fijado en **$5,000,000 COP**.
   - Catalogo de 16 SKUs industriales reales (taladros DeWalt, motobombas Honda, pulidoras Bosch, etc.) con proveedores homologados y cotizaciones de mercado.

4. **Motor Cuantitativo de Metas Estrategicas (`mint goal`):**
   - Eliminacion de porcentajes fijos ficticios (40%, 25%, 20%, 15%) y costos inventados.
   - `goalSeekingService.ts` analiza matematicamente las ordenes de compra historicas y el consumo real en PostgreSQL para calcular palancas de optimizacion reales (renegociacion por volumen, ajuste de cobertura de stock, fletes consolidados).

5. **Harness Multi-Agente Concurrente:**
   - Cuatro especialistas deliberan en paralelo:
     - **Inventario:** Calculo de burn rate, dias de cobertura y deteccion de quiebres.
     - **Compras:** Evaluacion de cotizaciones homologadas, MOQ y tiempos de entrega.
     - **Transporte:** Tracking de despachos y recálculo de rutas por retrasos.
     - **Riesgo:** Abogado del diablo que audita duplicidad en 72 horas y proveedores riesgosos.
   - Sintesis estructurada evaluada por el **Motor de Politicas Determinista** (`evaluatePolicy`).

6. **Daemon Vigilante en Segundo Plano:**
   - Proceso desacoplado que vigila el sistema de archivos (`fs.watch`), detecta desabastos y guias retrasadas, e incluye el interruptor de emergencia (`mint pause` / `mint resume`).

7. **Notificaciones y Aprobaciones Remotas:**
   - Canales interactivos para **Telegram**, **Slack** y **Gmail** con tokens criptograficos HMAC-SHA256 de un solo uso para aprobacion remota sin requerir consola abierta.

---

## 2. Estructura de Archivos del Repositorio

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

## 3. Instrucciones de Ejecucion para el Equipo

### Requisitos Previos:
- Node.js version 22.5.0 o superior (para soporte de `node:sqlite` nativo).
- Archivo `.env` en la raiz con las siguientes variables:
  ```env
  DATABASE_URL=postgresql://postgres.[ID_PROYECTO]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
  RETO_KEY=pk_...
  GROK_BASE_URL=https://api.reto.pltk.mx/v1
  GROK_MODEL=grok-4.6
  ```

### Comandos de Utilidad:

1. **Iniciar el Sistema Completo (Daemon + Consola Interactiva):**
   ```bash
   npm start
   # O directamente:
   mint console
   ```

2. **Diagnostico de Entorno y Arquitectura:**
   ```bash
   mint doctor
   ```

3. **Ejecutar Suite de Pruebas Automatizadas (82 tests):**
   ```bash
   npm test
   ```

4. **Verificacion Estricta de Tipos TypeScript:**
   ```bash
   npm run typecheck
   ```

5. **Migrar y Sembrar Catalogo Industrial Colombiano:**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

6. **Consultar Existencias y Bodegas:**
   ```bash
   mint stock
   ```

7. **Bandeja de Aprobaciones Human-in-the-Loop:**
   ```bash
   mint inbox
   mint inbox approve <id>
   mint inbox reject <id>
   ```

8. **Motor de Metas Cuantitativas:**
   ```bash
   mint goal --target 15000000
   ```

---

## 4. Estado de Pruebas y Cobertura

- **82 pruebas aprobadas exitosamente (100% verde)** en 23 suites de prueba en Vitest.
- Cobertura completa de:
  - Reposicion de existencias y guardrail presupuestal ($5,000,000 COP).
  - Bloqueo por duplicidad en ventana de 72 horas.
  - Inmutabilidad estricta en tabla `case_events` (trigger PostgreSQL).
  - Sanitizacion no destructiva y circuito de proteccion contra borrado masivo (>20%).
  - Aprobaciones remotas con firma HMAC-SHA256 de un solo uso.
  - Ejecucion e idempotencia en canal de ventas.
  - Benchmark cuantitativo vs baseline basico determinista.
