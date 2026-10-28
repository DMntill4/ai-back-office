# Handoff Técnico para el Equipo: AI Back Office (MINT)

**Proyecto:** Mint CLI & Autonomous AI Back Office  
**Fecha de Actualización:** 27 de Octubre de 2026  
**Rama Base:** `developDiego`  
**Arquitectura:** Monorepo (NPM Workspaces) — Enfoque Terminal & Motor Autónomo  

---

## 1. Evolución de la Arquitectura

El proyecto migró formalmente desde un prototipo monolítico web a un **Monorepo modular por paquetes (`packages/*`) centrado en un CLI autónomo y servicios de back office**.

> [!IMPORTANT]
> **Cambio de Enfoque:** El prototipo previo con UI web desacoplada en `frontend/` fue descontinuado en favor del **CLI profesional de terminal (`packages/cli`)**. La aplicación cliente histórica se encuentra aislada en `packages/app` y no es requerida para la operación central de los agentes ni del back office.

### Estructura de Paquetes (`packages/`)

```
ai-back-office/
├── packages/
│   ├── cli/            # Interfaz de terminal interactiva (TUI, REPL, Comandos de negocio, Keychain)
│   ├── core/           # Motor de dominio (Agentes, Drizzle ORM, OSRM, Políticas deterministas, Analítica)
│   ├── daemon/         # Vigilante en segundo plano (Triggers, escaneo de stock y retrasos)
│   ├── ingest/         # Conectores multi-fuente (CSV, Excel, JSON, SQLite, SQL Server, Sanitizer)
│   ├── notifiers/      # Canales remotos (Discord, Telegram, Slack, Cola Outbox con reintentos)
│   ├── api/            # API REST de soporte
│   └── app/            # Aplicación web aislada de terceros
├── vault/              # Almacenamiento local persistente (Auditoría, Decisiones, Backups, Outbox)
├── scratch/            # Scripts de verificación automatizada y pruebas E2E
├── reports/            # Informes generados en CSV/PDF
└── docs/               # Documentación y auditorías de arquitectura
```

---

## 2. Capacidades Principales Implementadas

1. **CLI Autónomo Empresarial (`@mint/cli`):**
   - Inicia con `npm start` (`tsx packages/cli/src/index.ts start`).
   - Terminal interactiva sin dependencias de navegadores web.
   - Formato estandarizado sin emojis (estrictamente texto ASCII y etiquetas `[OK]`, `[ERROR]`, `[ADVERTENCIA]`).
   - Cifrado de credenciales y tokens con AES-256-GCM (`keychain.ts`).

2. **Capa de Ingesta y Blindaje de Datos (`@mint/ingest`):**
   - 14 módulos de ingestión tolerante a fallos.
   - Detección de drift de esquema y marcado de filas eliminadas en el origen (`syncEngine.ts`).
   - Sanitización preventiva de prompt injections y caracteres hostiles (`sanitizer.ts`).
   - Comandos de descubrimiento local: `mint source discover`, `inspect`, `sync` y `status`.

3. **Gobernanza y Human-in-the-Loop (`@mint/core`):**
   - Regla determinista de frescura `RULE_STALE_DATA_REFUSAL`: El agente rehúsa auto-aprobar decisiones basadas en datos obsoletos o fuentes con drift.
   - Bloqueo de auto-aprobación (quien solicita la compra jamás puede ser el aprobador).
   - Generación de comprobantes de auditoría con huella SHA-256 e idempotencia estricta.

4. **Logística y Ruteo Vial Real:**
   - Integración con OSRM para cálculo de distancias y tiempos reales de traslado entre sucursales y proveedores.
   - Generación automática de guías logísticas de embarque (`TRK-IN-...`).

---

## 3. Instrucciones de Ejecución para el Equipo

### Requisitos Previos:
- **Node.js** v20 o superior.
- **PostgreSQL 16**: Puede ser:
  - **Local vía Docker:** `docker compose up -d postgres` (el puerto 5432 debe estar disponible).
  - **Cloud vía Supabase / Neon:** Configurando la URL con SSL en `DATABASE_URL`.
- Archivo `.env` configurado en la raíz.

### Comandos de Operación:

```bash
# 1. Iniciar la consola interactiva del agente (CLI)
npm start
# O comando equivalente:
npm run mint -- console

# 2. Diagnóstico de salud del sistema
npm run mint -- doctor

# 3. Resumen diario ejecutivo de operaciones
npm run mint -- briefing

# 4. Consulta y análisis de inventario
npm run mint -- stock

# 5. Escaneo y descubrimiento de fuentes de datos locales
npm run mint -- source discover ./
```

---

## 4. Estado de Verificación y Base de Datos

> [!WARNING]
> **Atención al ejecutar en entornos locales limpios:**
> El comando `npm run mint -- selftest` evalúa 10 subsistemas críticos. Para que el 100% de las pruebas pase en un entorno local nuevo, la base de datos PostgreSQL debe tener aplicadas todas las tablas de MINT (`mint_pending_questions`, `mint_quarantine_records`, `mint_sales_orders`, etc.).
> 
> Si utilizas una base de datos recién creada, sincroniza el esquema completo ejecutando:
> ```bash
> npx drizzle-kit push
> ```

* **Linter de Emojis:** `npm run lint:emojis` (100% aprobado, 0 emojis).
* **Chequeo de Tipos:** `npm run typecheck` (100% aprobado, 0 errores de tipado).
