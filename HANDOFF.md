# MINT CLI & AUTONOMOUS AI BACK OFFICE — TECHNICAL HANDOFF DOCUMENT

**Fecha de Entrega:** 29 de Octubre de 2026  
**Rama de Trabajo:** `developDiego`  
**Estado:** Arquitectura Multi-Agente Autónoma 24/7 y Matriz de Permisos por Agente (Principio de Mínimo Privilegio) 100% implementada y verificada. 30/30 suites de prueba aprobadas (179/179 tests), 0 errores de TypeScript (`tsc --noEmit`), 0 emojis y cero conceptos de administrador global (todos los roles residen estrictamente dentro de la base de datos de cada empresa cargada).

---

## 1. RESUMEN EJECUTIVO Y ESTADO ACTUAL

MINT es un **Back Office Autónomo 24/7 y Coordinador Operacional Multi-Agente** operado exclusivamente por línea de comandos (CLI) y daemons en segundo plano. Está diseñado para integrarse con bases de datos relacionales existentes (PostgreSQL / Supabase) sin alterar esquemas del cliente ni inventar datos ficticios.

### Principios Fundamentales Cumplidos
1. **Solo el CLI y Daemon**: Operación desatendida mediante `mint daemon start --interval 30` y comandos CLI. Cero dependencias de UI web externa.
2. **Arquitectura Multi-Agente Especializada**: El Orquestador (`mintOrchestrator`) delega a 6 especialistas con contratos estrictos (`inventario`, `compras`, `logistica`, `notificaciones`, `datos_integraciones`, `auditoria`).
3. **Principio de Mínimo Privilegio (PoLP)**: Ningún agente tiene acceso ilimitado. Cero auto-aprobación, cero eliminación destructiva y cero modificación de directivas de la empresa por parte de la IA.
4. **Roles Estrictamente Locales a la Base de Datos Cargada**: **No existe ningún "admin global"**. Todos los roles (`owner`, `admin de negocio`, `supervisor`, `client`, `operator`, `auditor`, `finance`, `driver`, `viewer`) residen y se gestionan exclusivamente dentro de la tabla `users` vinculada a `company_id`.
5. **Cero Emojis y Cero Secretos en Logs**: Todo el código, bitácoras y salidas de terminal utilizan exclusivamente texto ASCII e indicadores estandarizados `[OK]`, `[ERROR]`, `[AVISO]`. Las credenciales y tokens se sanitizan antes de registrar en auditoría.
6. **Aislamiento Multi-Tenant**: Toda consulta, tarea y validación de permisos comprueba el aislamiento entre empresas (`DENIED_CROSS_TENANT_VIOLATION`).

---

## 2. ARQUITECTURA DE AGENTES AUTÓNOMOS 24/7 IMPLEMENTADA

```
                               ┌────────────────────────────────┐
                               │   Orquestador Central MINT     │
                               │     (mintOrchestrator.ts)      │
                               └───────────────┬────────────────┘
                                               │
               ┌───────────────┬───────────────┼───────────────┬───────────────┐
               ▼               ▼               ▼               ▼               ▼
        ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
        │ Inventario  │ │   Compras   │ │  Logística  │ │Notificacione│ │    Datos    │
        │    Agent    │ │    Agent    │ │    Agent    │ │    Agent    │ │    Agent    │
        └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │  Auditoría  │
                                        │    Agent    │
                                        └─────────────┘
```

### Roles y Responsabilidades de los Especialistas
1. **Orquestador (`orchestrator`)**: Análisis global, coordinación entre agentes, delegación con verificación de permisos y escalación de decisiones a humanos (HITL). No modifica datos directamente.
2. **Inventario (`inventario`)**: Detección de roturas de stock, puntos de reorden (ROP), sugerencias de compra y reconciliaciones rutinarias autorizadas.
3. **Compras (`compras`)**: Evaluación de proveedores reales, análisis de MOQ y costo total, generación de propuestas de compra en estado borrador. CERO dispersión de pagos ni compras automáticas no autorizadas.
4. **Logística (`logistica`)**: Cálculo de rutas OSRM, consolidación de cargas, monitoreo de envíos en tránsito y detección de demoras operativas.
5. **Notificaciones (`notificaciones`)**: Preparación y despacho de alertas estructuradas a canales verificados (Telegram, Discord, Slack, Webhook), con cortafuegos anti-spam.
6. **Datos e Integraciones (`datos_integraciones`)**: Verificación de frescura de fuentes, detección de schema drift y reconciliación de catálogos sin modificar esquemas del cliente.
7. **Auditoría (`auditoria`)**: Auditoría independiente de propuestas, cálculo de risk scores, detección de anomalías y registro inmutable en `case_events` y Obsidian Vault.

---

## 3. MATRIZ DE PERMISOS POR AGENTE (PRINCIPIO DE MÍNIMO PRIVILEGIO)

Implementada en `packages/core/src/security/agentPermissionsMatrix.ts`:

| Agente | Consultar (`read`) | Analizar (`analyze`) | Proponer (`propose`) | Crear Solicitud (`create_request`) | Ejecutar (`execute`) | Modificar (`update`) | Notificar (`notify`) | Aprobar (`approve`) | Configurar Negocio (`configure_business`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **Orquestador** | Dominios necesarios | Todos | Todos | Compras y decisiones | Coordinación autorizada | No | Alertas autorizadas | **PROHIBIDO** | **PROHIBIDO** |
| **Inventario** | Stock y fuentes | Inventario | Reorden y existencias | Solicitud stock | Reconciliaciones | Ajustes permitidos | Alertas stock crítico | **PROHIBIDO** | **PROHIBIDO** |
| **Compras** | Suplidores y catálogo | Proveedores | Propuestas compra | Solicitud reposición | Borradores (0 pagos) | Borradores de compra | Alertas cotización | **PROHIBIDO** | **PROHIBIDO** |
| **Logística** | Envíos y rutas | Logística | Rebalanceo y rutas | Solicitud logística | Actualizaciones ruta | Solo campos envío | Alertas demora | **PROHIBIDO** | **PROHIBIDO** |
| **Notificaciones** | Eventos aprobados | Mensajería | Plantillas | No | Envío validado | No | Sí, canales válidos | **PROHIBIDO** | **PROHIBIDO** |
| **Datos** | Fuentes y esquemas | Calidad datos | Mapeos propuestos | Tarea sync | Ingestas autorizadas | Operaciones sync | Alertas conexión | **PROHIBIDO** | **PROHIBIDO** |
| **Auditoría** | Auditoría y compras | Riesgos y margen | Medidas correctivas | Tarea auditoría | Comprobaciones | No | Alertas seguridad | **PROHIBIDO** | **PROHIBIDO** |
| **Humano en BD** | Su empresa | Su empresa | Todas | Todas | Por rol en BD | Por rol en BD | Canales empresa | **SÍ (HITL)** | **SÍ (owner/admin/supervisor local)** |

### Reglas Inmutables Aplicadas en Backend
- **Anti-Self-Approval**: Ningún agente ni usuario puede aprobar una solicitud que él mismo creó o propuso.
- **Cero Auto-Aprobación para IA**: `approve` está reservado exclusivamente a personal humano autenticado (`owner`, `admin de negocio`, `supervisor`, `auditor`).
- **Cero Eliminación Destructiva**: `delete` está prohibido para agentes de IA.
- **Bloqueo de Elevación del Orquestador**: Si el orquestador intenta asignar una tarea fuera de la matriz a un especialista, la operación es abortada con `DENIED_ORCHESTRATOR_ELEVATION_ATTEMPT`.
- **Aislamiento Multitenant**: El cruce de empresas es rechazado en tiempo de ejecución con `DENIED_CROSS_TENANT_VIOLATION`.

---

## 4. ROLES LOCALES EN LA BASE DE DATOS CARGADA

Todos los roles están definidos en `packages/core/src/db/schema/users.ts` y gobernados por `authAndSetupService.ts`. Pertenecen estrictamente a cada `company_id`:

1. **`owner` (Dueño de la Empresa)**: Control total de la empresa en BD: configuración, umbrales, carga SQL, invitaciones, aprobaciones y pagos.
2. **`admin` (Administrador de Negocio)**: Administrador local de la empresa en la BD. Gestión operativa total (HITL, despachos, recepción, equipo y canales). No existe admin global.
3. **`supervisor` (Supervisor de Operaciones)**: Supervisión operativa del negocio en BD. Aprobación HITL, despachos, recepción y supervisión de operadores.
4. **`operator` (Operador de Logística y Almacén)**: Despacho de pedidos, recepción de inventario y consultas operativas.
5. **`client` (Cliente / Destinatario)**: Consulta exclusiva del estado de sus propios pedidos. CERO acceso operativo ni de almacén.
6. **`driver` (Conductor / Transportista)**: Recepción en ruta y consulta de manifiestos asignados.
7. **`auditor` (Auditor HITL)**: Autorización de compras mayores a umbral y auditoría de eventos inmutables.
8. **`finance` (Tesorería / Pagos)**: Dispersión de pagos a proveedores de órdenes aprobadas y conciliación.
9. **`viewer` (Consultor / Solo Lectura)**: Consulta de dashboards y métricas sin permisos de escritura.

---

## 5. RESULTADOS DE LA SUITE DE PRUEBAS AUTOMATIZADAS

Resultado de la ejecución completa con `npx vitest run`:

```
Test Files  30 passed (30)
     Tests  179 passed (179)
  Duration  85.16s
```

### Suites Clave Añadidas y Verificadas:
1. `tests/agent_permissions_matrix.test.ts` (10 tests, 100% éxito):
   - Ejecución autorizada por rol.
   - Rechazo de operaciones prohibidas y de `configure_business` para agentes.
   - Bloqueo de elevación de privilegios del coordinador.
   - Prohibición de auto-aprobación en IA.
   - Revocación dinámica de permisos en caliente sobre tareas pendientes.
   - Aislamiento multitenant de datos.
   - Resistencia a Prompt Injections con bypass simulado.
   - Auditoría segura sin fuga de credenciales.
   - Políticas personalizadas por empresa.
   - Flujo legítimo con aprobación de `owner` y `supervisor`, y rechazo de `client`.
2. `tests/autonomous_multiagent_architecture.test.ts` (7 tests, 100% éxito).
3. `tests/adversarial_security_and_guardrails.test.ts` (5 tests, 100% éxito).
4. `tests/daemon_watcher.test.ts` (3 tests, 100% éxito).
5. `tests/sales_channel_execution.test.ts` (4 tests, 100% éxito).

---

## 6. COMANDOS DE VALIDACIÓN RÁPIDA

```bash
# 1. Comprobación de tipos estricta (0 errores)
npm run typecheck

# 2. Comprobación de Cero Emojis (0 detectados)
npm run lint:emojis

# 3. Ejecución de la matriz de permisos
npx vitest run tests/agent_permissions_matrix.test.ts

# 4. Ejecución de la suite completa (179 tests)
npx vitest run

# 5. Inicio del Daemon Autónomo
npm run mint -- daemon start --interval 30
```
