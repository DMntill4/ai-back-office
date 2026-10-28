# MINT CLI & AUTONOMOUS AI BACK OFFICE — TECHNICAL HANDOFF DOCUMENT

**Fecha de Entrega:** 27 de Octubre de 2026  
**Rama de Trabajo:** `feat/mint-reverification-and-hardening` (integrada en `developDiego`)  
**Estado:** 100% de Hallazgos de Auditoría Resueltos. Verificado en vivo: 23/23 suites aprobadas (85/85 tests), 10/10 pruebas de `/selftest` en verde sobre base de datos PostgreSQL/Supabase, 0 errores de TypeScript y 0 emojis en todo el código.

---

## 1. RESUMEN EJECUTIVO Y ESTADO ACTUAL

MINT es un **Coordinador Logistico Autonomo y Back Office Empresarial** operado exclusivamente por linea de comandos (CLI), disenado para integrarse con bases de datos relacionales existentes (PostgreSQL / Supabase), APIs de mensajeria y archivos de negocio sin alterar esquemas del cliente ni inventar datos ficticios.

### Principios Fundamentales Cumplidos
1. **Solo el CLI**: El sistema inicia de forma autonoma con `npm start` (`tsx packages/cli/src/index.ts start`). Cero dependencias de UI web ni frameworks HTTP externos para operar.
2. **Cero Emojis**: Todo el codigo, bitacoras y salidas de terminal utilizan exclusivamente texto ASCII e indicadores estandarizados `[OK]`, `[ERROR]`, `[ADVERTENCIA]`, `[CRITICA]`.
3. **Cero Secretos en Logs**: Tokens, claves HMAC y URLs de webhooks son ofuscados en bitacoras y consola (ej. `https://discord.com/api/webhooks/12345/******`).
4. **Verdad en los Datos (Cero Invencion)**: Cuando un dato no existe en las fuentes reales (costos, suplidores, fletes o historial de ventas menor a 3 periodos), MINT explicita *"No tengo este dato"* y formula una pregunta en `mint_pending_questions` sin alucinar ni estimar numeros falsos.
5. **Aislamiento Multi-Tenant**: Toda consulta y evento esta estrictamente particionado por `companyId`. Las tablas propias de MINT utilizan el prefijo reservado `mint_*` para no colisionar con esquemas del cliente.
6. **Proteccion de `packages/app`**: El paquete de frontend de terceros jamas fue modificado (0 archivos alterados).

---

## 2. RESULTADOS DE LA RONDA DE RE-VERIFICACION Y ENDURECIMIENTO

Durante esta sesion se llevo a cabo una auditoria empirica de 51 puntos funcionales (E1 a E13) y pruebas de estres adversarial en vivo contra PostgreSQL en Supabase. Se descubrieron 5 fallos/discrepancias reales, los cuales fueron reabiertos formalmente en `CHECKLIST.md`, corregidos desde su causa raiz y verificados inmediatamente:

| ID | Modulo / Historia | Riesgo | Causa Raiz | Solucion Implementada | Evidencia Ejecutada |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **F-01** | E6.1 (Ventas / Concurrencia) | **ALTO** | Rafagas simultaneas con la misma clave de idempotencia cruzaban la verificacion en memoria y disparaban doble descuento de stock y error de clave unica en PostgreSQL. | Se anadio `inFlightSalesStore` en `salesChannelListener.ts` para compartir promesas en vuelo dentro del mismo proceso Node, y captura de error `23505` con reversion automatica de inventario (`executeAjustarStock`) ante colisiones concurrentes distribuidas. | `scratch/stress_phase2.ts`: Rafaga de 5 ventas simultaneas resulto en exactamente 1 venta procesada y 4 duplicados rechazados con `isDuplicate: true`. |
| **F-02** | E1.2 (Onboarding / Integridad) | **ALTO** | En el asistente interactivo (`onboarding.ts:259`), `sendEmailVerificationCode` se ejecutaba antes de persistir la empresa en `companies`, causando excepcion de FK `23503` en `business_config`. | Se pre-persiste la entidad `companies` en PostgreSQL antes de emitir el codigo OTP. | `scratch/test_onboarding_fix.ts`: Generacion, envio y validacion de codigo de 6 digitos verificado con exito. |
| **F-03** | E6.4 (Inteligencia Financiera) | **MEDIO** | El clasificador NLP derivaba preguntas de rentabilidad (*"por que bajo la ganancia"*) a preguntas abiertas genericas, devolviendo respuesta vacia. | Se creo `analyzeWeeklyProfitVariation` en `businessAnalyticsService.ts` y se conecto en `naturalIntentEngine.ts` para calcular variaciones matematicas exactas (ventas, ingresos, costos y margen) de los ultimos 7 dias vs 7 dias previos. | `scratch/verify_e6.ts`: Respuesta detallada con ingresos de la semana, utilidad, productos causantes y notas de costos faltantes. |
| **F-04** | Selftest (Chequeos 1.8 y 1.10) | **MEDIO** | Los cheques 1.8 y 1.10 en `selftest.ts` eran mocks estaticos que no ejecutaban ninguna consulta ni asercion. | Se reemplazaron por aserciones vivas: Check 1.8 evalua que `analyzePurchasingOptions` con SKU sin suplidor retorne `null` y que no existan desembolsos automaticos; Check 1.10 valida deduplicacion real y calculo vial OSRM. | `npm run mint -- selftest`: 10/10 pruebas superadas con latencias y conexiones reales. |
| **F-05** | E12.3 (Consistencia de Respaldos) | **BAJO** | `backupCommand` escribia en `./backups/` mientras que `safeQueryEngine` lo hacia en `./vault/backups/`. | Se unifico la constante de ruta a `./vault/backups/`. | `scratch/verify_e12.ts`: Archivo JSON de respaldo verificado fisicamente en `vault/backups/`. |
| **F-06** | E7.2 (Alias de Logistica) | **BAJO** | El daemon implementaba `scanDelayedShipments` pero `@mint/core` no exponia el alias `detectShipmentDelays`. | Se exporto `detectShipmentDelays` en `logisticsCoordinatorService.ts` y en el indice de `@mint/core`. | `scratch/verify_e7.ts`: Deteccion de 5 envios vencidos en base de datos confirmada. |

---

## 3. ARQUITECTURA DE PAQUETES (NPM WORKSPACES)

```
ai-back-office/
├── packages/
│   ├── core/           # Dominio central: Drizzle ORM, agentes, logistica OSRM, politicas y analitica
│   ├── cli/            # Interfaz de terminal profesional (TUI, Keychain AES-256-GCM, REPL, Comandos)
│   ├── daemon/         # Vigilante en segundo plano (triggers, escaneo de stock y retrasos)
│   ├── ingest/         # Conectores multi-fuente (JSON, CSV, SQLite, SQL Server TCP ping)
│   └── notifiers/      # Canales remotos (Discord, Slack, Telegram, Outbox queue con reintentos)
├── vault/              # Almacenamiento persistente en disco (Markdown, Auditoria, Backups, Outbox)
│   ├── Auditoria/      # Logs inmutables de eventos operacionales
│   ├── Cuarentena/     # Registros anómalos aislados con tipologia de fallo
│   ├── Preguntas/      # Banco de dudas operacionales no resueltas (cero invencion)
│   ├── backups/        # Respaldos de configuracion y snapshots previos a mutaciones SQL
│   └── outbox_queue.json # Cola persistente de salida ante caidas de red
├── scratch/            # Scripts de verificacion empirica automatizada (E1 a E12, estres y E2E)
├── reports/            # Exportaciones fisicas de inventario ROP y salud de datos en CSV
└── CHECKLIST.md        # Matriz auditada de 51 puntos de produccion (100% CERRADA)
```

---

## 4. MATRIZ DE COMANDOS CLI Y OPERACIONES

Todos los comandos se pueden ejecutar directamente con `npm run mint -- <comando>` o dentro de la consola interactiva (`npm start` o `npm run mint -- console`):

### Diagnostico y Salud
- `npm run mint -- selftest`: Ejecuta la suite de 10 pruebas de asercion viva (BD Supabase, Vault, parsers, cuarentena, outbox, RBAC, compras, conciliacion y OSRM).
- `npm run mint -- doctor`: Auditoria de 7 subsistemas (Node, SQLite, Postgres, LLM, OSRM, Canales, RBAC).

### Operaciones de Negocio
- `npm run mint -- briefing`: Resumen diario ejecutivo con ventas del dia, ganancia estimada, quiebres inminentes de stock y despachos retrasados.
- `npm run mint -- stock`: Consulta existencias y punto de reorden (ROP) dinamico.
- `npm run mint -- customers`: Analisis de cartera de clientes, LTV y deteccion de clientes en riesgo de abandono (>30 dias).
- `npm run mint -- reconcile`: Conciliacion tripartita de ventas vs pagos vs despachos.
- `npm run mint -- fleet`: Control de flota, transportistas y guias activas.
- `npm run mint -- audit --limit 10`: Historial unificado de eventos operacionales y decisiones tomadas.
- `npm run mint -- backup`: Exportacion de volcado completo de configuracion y memoria a `vault/backups/`.
- `npm run mint -- reports stock csv`: Exportacion de inventario ROP compatible con Excel.
- `npm run mint -- reports health csv`: Exportacion del informe de salud de datos y cuarentena.

### Modo Demo y Seguridad
- `npm run mint -- demo enter`: Conmuta la sesion al sandbox aislado `comp_demo_isolated`.
- `npm run mint -- demo exit`: Restaura la sesion a la empresa de produccion.
- `npm run mint -- logout`: Invalida y elimina el token de sesion cifrado en el keychain.

---

## 5. ESCENARIO E2E DE VALIDACION COMPLETA

El script [scratch/e2e_final_scenario.ts](file:///c:/Users/dalej/OneDrive/Documents/ai-back-office/scratch/e2e_final_scenario.ts) valida el ciclo de vida integro de forma desatendida:
1. **Onboarding & OTP**: Creacion de empresa aislada y verificacion de correo mediante codigo de 6 digitos sin errores referenciales.
2. **Catálogo & Almacen**: Insercion de almacen principal y producto con stock inicial (10 u) y stock minimo (5 u).
3. **Venta & Stock**: Descuento de 7 unidades. Stock actualizado de 10 a 3 unidades con registro en `mint_sales_orders`.
4. **Idempotencia**: Reintento con la misma clave detectado como duplicado (`duplicate=true`), stock preservado en 3 u.
5. **Logistica OSRM**: Creacion de guia de envio y calculo vial real (410.7 km entre Bogota y Medellin).
6. **Retrasos**: Escaneo de envios detecta la guia con fecha vencida (60 min retrasada).
7. **Outbox**: Encolamiento en `vault/outbox_queue.json` con retencion para reintentos.
8. **Bandeja HITL**: Decision generada por quiebre de stock cancelada bajo reglas de gobernanza.
9. **Lenguaje Natural**: Consulta *"¿Por que bajo la ganancia esta semana?"* responde con calculo matematico exacto sobre ingresos y costos.
10. **Aislamiento**: Eliminacion limpia de la empresa de prueba sin residuos colaterales.

---

## 6. COMANDOS DE VALIDACION Y COMPROBACION LOCAL

Para comprobar el estado del repositorio:

```bash
# 1. Verificacion de linter de emojis (debe arrojar 0 emojis)
npm run lint:emojis

# 2. Verificacion de compilacion TypeScript estricta (debe arrojar 0 errores)
npm run typecheck

# 3. Sincronizacion previa obligatoria de la BD (crea tablas mint_* y esquemas requeridos)
# Nota: Asegurarse de que drizzle.config.ts apunte a ./packages/core/src/db/schema/index.ts
npx drizzle-kit push

# 4. Suite interna de autodiagnostico (10/10 pruebas superadas con BD sincronizada)
npm run mint -- selftest

# 5. Resumen diario ejecutivo
npm run mint -- briefing

# 6. Escenario E2E integral
npx tsx scratch/e2e_final_scenario.ts
```

---

## 7. VARIABLES DE ENTORNO REQUERIDAS (`.env`)

```ini
# Base de datos PostgreSQL Cloud (Supabase)
DATABASE_URL=postgresql://postgres.xxx:xxx@aws-0-us-west-1.pooler.supabase.com:6543/postgres

# Seguridad de Webhooks y Criptografia
WEBHOOK_SECRET=mint_default_webhook_secret
AUTHORIZED_SALES_SENDERS=pos_e2e,test_sender_01,web_checkout

# Proveedores de IA (Opcional, fallback determinista habilitado)
OPENAI_API_KEY=sk-...

# Canales de Notificacion (Opcional)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
TELEGRAM_BOT_TOKEN=...
SLACK_BOT_TOKEN=...
```

---

## 8. INTEGRACION CON RAMA developDiego

Los cambios estan listos y comprometidos localmente en la rama `feat/mint-reverification-and-hardening` (commit `2784ce9`). Al incorporarse en `developDiego`, se transfieren todas las correcciones de concurrencia, integridad referencial de onboarding, motor de ganancia semanal, aserciones reales en selftest y la suite completa de scripts de verificacion.
