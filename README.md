<p align="center">
  <img src="./resources/img/bannerIcon.png" alt="AI Back Office Banner" width="100%" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Grok_xAI-grok--4.6-FDB813?style=for-the-badge&logo=openai&logoColor=black" alt="Grok xAI" />
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-LTS-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Supabase-Cloud_DB-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Drizzle_ORM-0.45-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black" alt="Drizzle ORM" />
  <img src="https://img.shields.io/badge/Vitest-Passing_100%25-6E9F18?style=for-the-badge&logo=vitest&logoColor=white" alt="Vitest" />
</p>

---

# AI Back Office Agent (MINT)

> **Agente autonomo para operaciones de back office (coordinacion logistica, compras, auditoria y abastecimiento)** impulsado por **Grok (xAI)** con razonamiento ReAct, motor de superpoderes por dominio, ejecucion estricta de herramientas y persistencia verificada en base de datos.

---

## Contribuidores

<table align="center">
  <tr>
    <td align="center">
      <a href="https://github.com/DMntill4">
        <img src="https://github.com/DMntill4.png" width="90px;" alt="Diego Mantilla" style="border-radius: 50%;" /><br />
        <sub><b>Diego Mantilla</b></sub>
      </a><br />
      <code>@DMntill4</code>
    </td>
    <td align="center">
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

- [x] **Persistencia Cloud en Supabase:** PostgreSQL 16 24/7 con soporte automatico SSL, esquemas Drizzle ORM y triggers inmutables.
- [x] **Configuracion y Logs:** Validacion estricta con **Zod** y telemetria estructurada con **Pino**.
- [x] **Cliente Grok Unificado:** Conexion segura en `src/llm/client.ts`, soporte multillave (`RETO_KEY`, `GROK_API_KEY`) y control de costos en USD.
- [x] **Arsenal de Herramientas de Negocio:**
  - `consultar_stock`: Busqueda de inventario con Fuzzy Matching para SKUs mal escritos.
  - `ver_ordenes_abiertas`: Deteccion de producto en camino y compras activas.
  - `crear_orden_compra`: Creacion idempotente con limite de aprobacion humana ($10,000 MXN).
  - `evaluar_proveedores`: Matriz comparativa de proveedores por costo, velocidad y balance.
  - `analisis_financiero`: Valuacion de stock total, compromisos de compra y presupuesto a 30 dias.
  - `simular_escenario`: Simulaciones What-If de demanda y retrasos de proveedores.
  - `auditar_anomalias`: Deteccion automatica de descalces de inventario y sobrecostos.
  - `generar_reporte_general`: Reportes de productos mas vendidos, sin stock, por renovar y por caducar.
- [x] **Motor de Superpoderes y Skills en Markdown:** Inyeccion dinamica de contexto de dominio experto (`src/agent/skills/`) segun la naturaleza de la consulta.
- [x] **Servidor Fastify y Motor Proactivo en Standby:** API REST (`/api/chat`) y bus de eventos para consumo del frontend.
- [x] **Pruebas a Costo $0:** 20 pruebas automatizadas unitarias y de escenarios en Vitest (100% aprobadas).

---

## Stack Tecnologico

<div align="center">

| Categoria | Tecnologia |
|:---|:---|
| **Inteligencia Artificial** | xAI Grok (`grok-4.6`) |
| **Lenguaje y Entorno** | TypeScript 5.6 + Node.js (LTS) |
| **Base de Datos & ORM** | PostgreSQL 16 (Supabase Cloud / Docker) + Drizzle ORM |
| **Servidor HTTP** | Fastify 5.x + Cors |
| **Validacion & Logs** | Zod + Pino |
| **Testing & Calidad** | Vitest + ESLint + Prettier |

</div>

---

## Arquitectura y Principios de Seguridad

```text
Usuario / API ──► Superpowers Engine (skills/*.md)
                        │
                Agent Loop (ReAct) ──► LLM Client ──► Grok (xAI)
                 │          ▲              │
    Seleccion de │          │ Resultado    └─► Auditoria en llm_calls (costos en USD)
    Herramientas ▼          │
                Herramientas ──► Servicios ──► PostgreSQL / Supabase
                        │
                 Verificacion ──► case_events ──► Dictamen: "resuelto" | "escalado"
```

1. **El modelo decide, el codigo gobierna:** Grok propone acciones; el codigo valida esquemas y limites de riesgo.
2. **Idempotencia Obligatoria:** Toda transaccion de compra requiere clave idempotente para evitar compras duplicadas.
3. **Verificacion Post-Escritura:** Un caso solo se concluye como resuelto si el registro fisico es verificado en base de datos.
4. **Limite Presupuestario Human-in-the-Loop:** Compras mayores a $10,000 MXN generan una solicitud formal pendiente de aprobacion humana.

---

## Comandos del Proyecto

### Terminal Interactiva CLI (Chat con el Agente)
```bash
npm run chat
```

### Servidor HTTP API (Fastify)
```bash
npm run server
```

### Base de Datos y Migraciones (Supabase Cloud o Local)
```bash
# Aplicar migraciones relacionales
npm run db:migrate

# Sembrar catalogo de 16 SKUs industriales y comerciales
npm run db:seed

# Limpiar o reiniciar base de datos
npm run db:reset

# Drizzle Studio (interfaz visual)
npm run db:studio
```

### Pruebas y Validacion (Costo $0 USD)
```bash
# Correr suite de 20 pruebas en Vitest
npm test

# Validacion de tipos TypeScript
npm run typecheck

# Prueba de humo de conexion con Grok
npm run smoke
```

---

<p align="center">
  <sub>Desarrollado para el Reto de Agentes Autonomos - 2026</sub>
</p>
