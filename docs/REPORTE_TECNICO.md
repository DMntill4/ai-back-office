# Reporte Tecnico de Arquitectura e Implementacion

<p align="center">
  <img src="../resources/img/bannerIcon.png" alt="AI Back Office Banner" width="100%" />
</p>

<p align="center">
  <b>AI Back Office Agent (MINT) - Plataforma de Agente Autónomo para Operaciones de Back Office</b><br>
  <i>Reto de Agentes Autónomos 2026 - Entrega Integral (Agente Fullstack End-to-End, Consola Web Mint y Human-in-the-Loop)</i>
</p>

---

## 1. Resumen Ejecutivo y Ficha Tecnica

El **AI Back Office Agent (MINT)** es una solución integral orientada a la coordinación de operaciones logísticas, control de inventarios, gestión de abastecimiento y supervisión presupuestaria corporativa.

La plataforma trasciende los modelos conversacionales tradicionales y los pipelines rígidos de automatización al combinar:
1. Un **bucle de razonamiento y acción ReAct** autónomo ejecutado sobre **xAI Grok (`grok-4.6`)**.
2. Un **motor de superpoderes** que inyecta dinámicamente conocimiento experto en Markdown según la naturaleza del problema.
3. Un arsenal de **8 herramientas de negocio tipadas** que interactúan con base de datos relacional mediante Drizzle ORM.
4. Una **consola web moderna (Mint Platform)** desarrollada en **React 19, Vite y Tailwind CSS v4** con panel de control, explorador de inventario, chat con el agente y bandeja de aprobaciones **Human-in-the-Loop**.
5. Persistencia dual: **PostgreSQL 16 en la nube (Supabase)** con triggers inmutables y contenedor local **Docker Compose**.

### Ficha Tecnica del Proyecto

| Parámetro | Especificación |
| :--- | :--- |
| **Nombre del Proyecto** | AI Back Office Agent (MINT) |
| **Repositorio Oficial** | [DMntill4/ai-back-office](https://github.com/DMntill4/ai-back-office) |
| **Versión / Hito** | v2.6.0 (Monorepo Limpio: Mint CLI, Daemon Autónomo, Capa Ingesta, Notificadores y Consola Web) |
| **Dominio de Aplicación** | Coordinación Logística, Compras, Auditoría de Stock y Control Financiero |
| **Modelo Principal de IA** | xAI Grok (`grok-4.6`) mediante Gateway oficial de producción |
| **Consola Web (Frontend)** | React 19, TypeScript, Vite 6, Tailwind CSS v4, Framer Motion |
| **Servidor API Backend** | Fastify 5.x con soporte CORS y bus de eventos proactivos |
| **Base de Datos & ORM** | PostgreSQL 16 (Dual: Supabase Cloud con SSL + Docker Alpine local) con Drizzle ORM 0.45 |
| **Cobertura de Pruebas** | 85 de 85 pruebas automáticas en Vitest (23 suites, 100% pasando a costo $0 USD) y 10/10 checks en selftest |
| **Licencia** | ISC |

### Equipo Contribuidor

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

## 2. Épicas e Historias de Usuario

La arquitectura del sistema responde a seis épicas de desarrollo diseñadas para garantizar gobernanza, robustez técnica y facilidad operativa.

<p align="center">
  <img src="../resources/img/userHistoriesAI-BACKOFFICE.png" alt="Historias de Usuario y Epicas" width="100%" />
</p>

### Épica 1: Infraestructura Cloud y Auditoría Inmutable
* **Persistencia Cloud en Supabase:** PostgreSQL 16 alojado en la nube con soporte SSL automático en `src/db/client.ts`, operando 24/7 sin dependencia forzosa de contenedores locales.
* **Trazabilidad Inalterable:** Trigger nativo en PostgreSQL que rechaza modificaciones (`UPDATE`) y eliminaciones (`DELETE`) sobre la tabla de auditoría `case_events`.

### Épica 2: Conexión con Grok y Gobernanza de Costos
* **Gateway Unificado:** Conector centralizado en `src/llm/client.ts` con manejo de tiempos límite, reintentos exponenciales ante cuotas de API (`429` / `5xx`) y registro de métricas de costo en USD por cada inferencia en `llm_calls`.
* **Prueba de Humo y Autenticación:** Soporte flexible de llaves de entorno (`RETO_KEY`, `GROK_API_KEY`, `XAI_API_KEY`) verificado mediante pruebas continuas.

### Épica 3: Datos de Negocio y Arsenal de Herramientas
* **Catálogo Ampliado (16 SKUs):** Sembrado masivo con 5 productos sin stock, carencias de seguridad y alimentos perecederos con fecha de caducidad (criterio FEFO).
* **Arsenal de 8 Herramientas Tipadas en Zod:**
  1. `consultar_stock`: Búsqueda de inventario con Fuzzy Matching para tolerancia a errores tipográficos.
  2. `ver_ordenes_abiertas`: Detección de órdenes en camino y compras activas.
  3. `crear_orden_compra`: Creación idempotente de propuesta formal con escalado estricto a aprobación humana (HITL). CERO desembolso unilateral.
  4. `evaluar_proveedores`: Matriz comparativa de proveedores por costo, velocidad o balance general.
  5. `analisis_financiero`: Valuación de inventario total, compromisos financieros y presupuesto a 30 días.
  6. `simular_escenario`: Simulaciones What-If de demanda y contingencias por retrasos de proveedores.
  7. `auditar_anomalias`: Detección automática de descalces de inventario y sobrecostos.
  8. `generar_reporte_general`: Reportes ejecutivos de productos más vendidos, agotados, por reabastecer y por caducar.

### Épica 4: Bucle ReAct, Superpoderes y Pruebas a Costo Cero
* **Motor de Superpoderes:** Inyección dinámica de contexto y directivas expertas (`src/agent/skills/`) según la intención detectada en la consulta (financiera, crisis de stock, negociación, seguridad).
* **Validación a Costo $0 USD:** Cobertura de 20 pruebas automatizadas mediante un cliente simulado (`FakeGrokClient`) que reproduce casos complejos sin incurrir en costos de API.

### Épica 5: Consola Web Interactiva (Mint Platform) y Human-in-the-Loop Visual
* **Panel de Operaciones (Dashboard):** Visualización de KPIs en tiempo real (órdenes totales, tasa de automatización, revisiones pendientes, ahorros y gasto en USD) y gráficos interactivos de desempeño de proveedores (*Recharts*).
* **Bandeja de Aprobaciones Human-in-the-Loop:** Interfaz visual y CLI (`mint inbox`) para que supervisores autoricen o rechacen propuestas de compra en un clic (CERO desembolso autónomo sin firma humana).
* **Consola de Chat del Agente:** Conversación fluida con sugerencias automáticas, insignias de estado de ejecución en vivo (`en_proceso`, `resuelto`, `escalado`) y desglose de tokens y costo en dólares.
* **Explorador de Inventario y Línea de Tiempo:** Vista tabular de productos y existencias (`StockView`) y registro cronológico de auditoría que sustituye la terminal tradicional.

### Épica 6: Entornos Reproducibles y Containerización con Docker
* **Despliegue Local Aislado:** `docker-compose.yml` que orquesta la base de datos `postgres:16-alpine` y el contenedor de la aplicación `node:20-alpine` (`Dockerfile`), con script de inicialización `docker/init-db.sql` con roles y extensiones (`pgcrypto`).

---

## 3. Arquitectura del Sistema y Flujo Fullstack

El diseño del sistema se rige bajo la premisa: **"El modelo decide qué hacer; el código valida, aplica permisos y verifica físicamente"**.

```mermaid
sequenceDiagram
    autonumber
    actor User as Usuario / Supervisor
    participant UI as Consola Web Mint (React 19)
    participant API as Servidor Fastify (server.ts)
    participant SP as Motor Superpoderes (superpowers.ts)
    participant AG as Motor ReAct (loop.ts)
    participant LLM as Cliente Grok (client.ts)
    participant TR as Herramientas & Zod (tools/)
    participant DB as Postgres / Supabase

    User->>UI: Interacción (Chat / Aprobación / Consulta)
    alt Consulta Conversacional o Disparo de Tarea
        UI->>API: POST /api/chat { message, caseId }
        API->>SP: Consulta de Negocio
        SP->>SP: Clasificación e Inyección de Skills Markdown
        SP->>AG: Prompt Enriquecido
        AG->>DB: Registro del Caso (estado: en_proceso)
        loop Ciclo ReAct (Hasta 10 Pasos)
            AG->>LLM: Inferencia (Mensajes + Herramientas)
            LLM-->>AG: Decisión (Pensamiento + Tool Call o Dictamen)
            alt Invocación de Herramienta
                AG->>TR: Validación de Entrada con Zod
                alt Compra > $10,000 MXN
                    TR->>DB: Inserción en tabla approvals (status: pendiente)
                    TR-->>AG: Requiere aprobación de supervisor
                else Operación Permitida
                    TR->>DB: Ejecución Idempotente y Verificación Física
                    DB-->>TR: Confirmación en BD
                    TR-->>AG: Resultado Verificado
                end
            else Dictamen Final
                AG->>DB: Cierre de Caso (resuelto o escalado)
            end
            AG->>DB: Registro en case_events (Inmutable)
            AG->>DB: Registro en llm_calls (Costo y Latencia)
        end
        API-->>UI: Respuesta estructurada (resumen, métricas, costo USD)
        UI-->>User: Visualización en Chat y Dashboard
    else Resolución Human-in-the-Loop
        User->>UI: Clic en "Aprobar" / "Rechazar" Orden
        UI->>API: POST /api/approvals/:id { action }
        API->>DB: Actualización de estado en tabla approvals
        API-->>UI: Confirmación de orden procesada
        UI-->>User: Notificación Toast (Sonner) y actualización de KPIs
    end
```

---

## 4. Stack Tecnológico e Infraestructura

| Capa Tecnológica | Herramienta / Librería | Función Principal |
| :--- | :--- | :--- |
| **Frontend UI** | React 19 + TypeScript + Vite 6 | Consola interactiva web de alto rendimiento y bajo consumo. |
| **Diseño y Estética** | Tailwind CSS v4 + Framer Motion | Interfaz Glassmorphism, tipografía Outfit y físicas fluidas. |
| **Componentes Visuales** | Lucide React + Recharts + Radix UI + cmdk | Gráficas analíticas, tooltips, paleta de comandos y notificaciones. |
| **Modelo de Inteligencia Artificial** | xAI Grok (`grok-4.6`) | Razonamiento de alto nivel, descomposición ReAct y toma de decisiones. |
| **Servidor HTTP / API** | Fastify 5.x + CORS | Endpoints REST de alto rendimiento para chat, dashboard y aprobaciones. |
| **Base de Datos Relacional** | PostgreSQL 16 (Supabase Cloud + Docker) | Persistencia ACID de negocio y tablas inmutables de auditoría. |
| **ORM & Migraciones** | Drizzle ORM 0.45 + Drizzle Kit | Mapeo relacional tipado en TypeScript y gestión de migraciones. |
| **Validación de Esquemas** | Zod 4.x | Validación en tiempo de ejecución de inputs de herramientas y config. |
| **Logging y Telemetría** | Pino + Pino-Pretty | Registros estructurados en formato JSON ultrarrápido. |
| **Contenedores** | Docker + Docker Compose + Alpine | Despliegue de desarrollo reproducible y aislado. |
| **Testing Automatizado** | Vitest 5.0 | Suite de 20 pruebas de unidad y escenarios simulados a costo $0 USD. |

---

## 5. Gobernanza, Seguridad Presupuestaria e Inmutabilidad

Para asegurar operaciones corporativas confiables, la plataforma implementa salvaguardas en cada nivel:

1. **Gobernanza Human-in-the-Loop Estricta (CERO Auto-Desembolso):**
   - La herramienta `crear_orden_compra` calcula el monto total (`cantidad × precio_unitario`).
   - En el dominio financiero de MINT, **ninguna compra se ejecuta de forma unilateral sin supervisión humana**. La plataforma genera una propuesta formal con justificación y expediente de ROI, la deposita en la tabla `decisions` con estado `pending_approval` y en `vault/Decisiones/`, y alerta al supervisor para autorización vía `/inbox` o canales interactivos.
2. **Garantía de Idempotencia:**
   - Toda escritura exige una clave única de idempotencia (`idempotency_key`), previniendo transacciones duplicadas por caídas de red o reintentos de consulta.
3. **Verificación Física Post-Escritura:**
   - Un caso solo puede cerrarse como `resuelto` si el registro físico es verificado mediante una consulta de confirmación contra la base de datos relacional. Si la verificación falla, se clasifica como `escalado`.
4. **Trigger Append-Only en PostgreSQL:**
   - La tabla `case_events` cuenta con un trigger que rechaza sentencias `UPDATE` y `DELETE`, protegiendo la trazabilidad jurídica y corporativa.

---

## 6. Pruebas Técnicas y Escenarios Validados (Costo $0 USD)

Se dispone de una suite integral de **85 pruebas automatizadas** en `Vitest` organizadas en 23 suites de test a lo largo del monorepo (`@mint/core`, `@mint/cli`, `@mint/daemon`, `@mint/ingest`, `@mint/notifiers`). Gracias al adaptador `FakeGrokClient` y mocks deterministas, los tests reproducen llamadas al modelo y flujos de negocio sin consumir saldo real de API:

| Suite / Archivo de Prueba | Escenarios Validados | Resultado |
| :--- | :--- | :---: |
| `tests/agent_schema.test.ts` | Validaciones de esquemas Zod de casos y eventos | [OK] Aprobado |
| `tests/agent_loop.test.ts` | Ciclo ReAct, resolución de casos y cierre estricto | [OK] Aprobado |
| `tests/tools.test.ts` | Herramientas de stock, órdenes y control de aprobación | [OK] Aprobado |
| `tests/scenarios.test.ts` | Escenarios de negocio complejos (reabastecimiento, desabasto) | [OK] Aprobado |
| `tests/db.test.ts` | Consultas relacionales y persistencia de auditoría | [OK] Aprobado |
| `tests/superpowers.test.ts` | Detección de intenciones e inyección de skills Markdown | [OK] Aprobado |
| `tests/proactive.test.ts` | Worker de auditoría proactiva y generación de alertas | [OK] Aprobado |
| `tests/idempotency.test.ts` | Prevención de duplicados en órdenes de compra concurrentes | [OK] Aprobado |
| `tests/daemon.test.ts` | Vigilancia en segundo plano y detección de desabasto/retrasos | [OK] Aprobado |
| `tests/data_layer.test.ts` | Ingesta multi-fuente, fingerprinting y sanitización | [OK] Aprobado |
| `tests/circuit_breaker.test.ts` | Protección contra borrado masivo (>20%) y two-phase deletion | [OK] Aprobado |
| `tests/sales_channel.test.ts` | Canales remotos (Discord/Slack/Telegram) e idempotencia | [OK] Aprobado |
| `tests/decision_execution.test.ts` | Ejecución de compras, guía logística y orden de dispersión financiera | [OK] Aprobado |
| `tests/benchmark.test.ts` | Benchmark formal vs regla determinista simple ($Q = S_{min} - S_{actual}$) | [OK] Aprobado |

---

## 7. Validación Empírica: 10 Ejecuciones Reales de Punta a Punta (Hito S2)

En cumplimiento de los requerimientos de evaluación del Hito S2, el sistema cuenta con una batería de **10 ejecuciones reales de punta a punta**, invocando herramientas reales conectadas a infraestructura física (PostgreSQL, motor vial OSRM HTTP real, geocodificación OpenStreetMap, sanitización de archivos del sistema operativo y memoria inmutable en Obsidian Vault):

- **Reporte Oficial Completo:** Consulta el documento dedicado [`docs/REGISTRO_10_EJECUCIONES_REALES.md`](./REGISTRO_10_EJECUCIONES_REALES.md).
- **Evidencia Estructurada JSON:** Registro reproducible en [`docs/ejecuciones_reales.json`](./ejecuciones_reales.json).
- **Comando de Reproducción Inmediata:**
  ```bash
  npm run executions
  # o también:
  mint executions
  ```

### Resumen de las 10 Ejecuciones Reales

| # | ID Caso | Herramientas Reales Invocadas | Error y Recuperación Autónoma | Estado Final |
| :-: | :--- | :--- | :--- | :-: |
| 1 | `CASE-REAL-001` | `consultar_stock` (Levenshtein Fuzzy Matcher + BD) | Término inexacto capturado -> Reintento autónomo exitoso con SKU dinámico resuelto | **RESUELTO** |
| 2 | `CASE-REAL-002` | `calcular_ruta_logistica` (OSRM HTTP Real) | Cálculo vial real de 410.7 km (396 min) con flete vial vía OSRM | **RESUELTO** |
| 3 | `CASE-REAL-003` | `crear_orden_compra` + `policyEngine` (Regla Anti-AutoGasto) | Propuesta de reposición formal escalada a `/inbox` (CERO auto-desembolso) | **ESCALADO** (HITL) |
| 4 | `CASE-REAL-004` | `crear_orden_compra` + `policyEngine` + `decisions` | Compra atípica o desproporcionada -> Bloqueo preventivo y auditoría forense | **ESCALADO** (HITL) |
| 5 | `CASE-REAL-005` | `importUniversalDataFile` + `sanitizeRow` | Payload DDE (`=cmd|...`) neutralizado y enviado a cuarentena sin crash | **RESUELTO** |
| 6 | `CASE-REAL-006` | `evaluar_proveedores` + `suppliersService` | Evaluación multi-criterio en BD real sin inventar plazos de entrega | **RESUELTO** |
| 7 | `CASE-REAL-007` | `despachar_envio` + `calcular_ruta_logistica` | Asignación de guía `TRK-OUT-...` y cálculo vial OSRM con reserva física | **RESUELTO** |
| 8 | `CASE-REAL-008` | `pronosticar_demanda` + `demandService` | Detección de quiebre de stock y cálculo de días de inventario restante (ROP) | **RESUELTO** |
| 9 | `CASE-REAL-009` | `checkToolAuthorization (RBAC Matrix)` | Rol 'viewer' intentando mutación -> Intercepción y bloqueo estricto | **RESUELTO** |
| 10 | `CASE-REAL-010` | `reconcileSalesPaymentsDeliveries` + Vault | Conciliación 3 vías y persistencia inmutable en `vault/Auditoria/` | **RESUELTO** |

---

## 8. Telemetría y Control de Costos en USD

Cada llamada a Grok registra de forma estricta sus métricas en la tabla `llm_calls`:
- **Tarifa Base Grok 4.6:** $2.00 USD por millón de tokens de entrada / $10.00 USD por millón de tokens de salida / $0.50 USD por millón de tokens en caché.
- **Fórmula de Cálculo:**
  $$\text{Costo Total} = \left(\frac{\text{Tokens Prompt} \times 2.00}{10^6}\right) + \left(\frac{\text{Tokens Completion} \times 10.00}{10^6}\right)$$
- **Latencia:** Medición en milisegundos de cada turno del agente para auditoría de rendimiento.

---

<p align="center">
  <b>AI Back Office Agent (MINT)</b> - Desarrollado por Diego Mantilla y Andres Guerra para el Reto de Agentes Autónomos 2026.
</p>
