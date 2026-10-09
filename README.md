<p align="center">
  <img src="./resources/img/bannerIcon.png" alt="AI Back Office Banner" width="100%" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Grok_xAI-grok--4.6-FDB813?style=for-the-badge&logo=openai&logoColor=black" alt="Grok xAI" />
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-LTS-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Docker-Containers-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/Drizzle_ORM-0.45-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black" alt="Drizzle ORM" />
  <img src="https://img.shields.io/badge/Vitest-Passing_100%25-6E9F18?style=for-the-badge&logo=vitest&logoColor=white" alt="Vitest" />
</p>

---

# AI Back Office Agent

> **Agente autónomo para operaciones de back office (inventario, compras, auditoría y abastecimiento)** impulsado por **Grok (xAI)** con razonamiento ReAct, ejecución estricta de herramientas y verificación directa en base de datos.

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
        <img src="https://github.com/andresguerra321.png" width="90px;" alt="Andrés Guerra" style="border-radius: 50%;" /><br />
        <sub><b>Andrés Guerra</b></sub>
      </a><br />
      <code>@andresguerra321</code>
    </td>
  </tr>
</table>

---

## Estado del Proyecto (Semana 1: Agente End-to-End)

- [x] **Infraestructura aislada en Docker:** PostgreSQL 16 con esquemas Drizzle ORM y triggers inmutables.
- [x] **Configuración y Logs:** Validación estricta con **Zod** y telemetría estructurada con **Pino**.
- [x] **Cliente Grok:** Conexión segura en `src/llm/client.ts`, detección de capacidades y contención de costos.
- [x] **Herramientas de negocio:** `consultar_stock`, `ver_ordenes_abiertas`, `crear_orden_compra` con **idempotencia**, límite de aprobación ($10,000 MXN) y verificación post-escritura.
- [x] **Cerebro ReAct (`loop.ts`):** Ciclo autónomo de investigación, ejecución de herramientas y dictamen (`resuelto` vs `escalado`).
- [x] **Pruebas a costo $0:** 20 tests unitarios y de escenarios ejecutados con `FakeGrokClient`.

---

## Stack Tecnológico

<div align="center">

| Categoría | Tecnología | Insignia |
|:---|:---|:---:|
| **Inteligencia Artificial** | xAI Grok (`grok-4.6`) | ![Grok](https://img.shields.io/badge/xAI_Grok-4.6-FDB813?style=flat-square&logo=openai&logoColor=black) |
| **Lenguaje y Entorno** | TypeScript 5.6 + Node.js (LTS) | ![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript&logoColor=white) ![Node.js](https://img.shields.io/badge/Node.js-24-339933?style=flat-square&logo=node.js&logoColor=white) |
| **Base de Datos & ORM** | PostgreSQL 16 + Drizzle ORM | ![Postgres](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white) ![Drizzle](https://img.shields.io/badge/Drizzle_ORM-0.45-C5F74F?style=flat-square&logo=drizzle&logoColor=black) |
| **Aislamiento & DevOps** | Docker + Docker Compose | ![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white) |
| **Validación & Logs** | Zod + Pino | ![Zod](https://img.shields.io/badge/Zod-3.x-3068B7?style=flat-square&logo=zod&logoColor=white) ![Pino](https://img.shields.io/badge/Pino-Structured_Logs-68A063?style=flat-square) |
| **Testing & Calidad** | Vitest + ESLint + Prettier | ![Vitest](https://img.shields.io/badge/Vitest-5.0-6E9F18?style=flat-square&logo=vitest&logoColor=white) ![ESLint](https://img.shields.io/badge/ESLint-Code_Quality-4B32C3?style=flat-square&logo=eslint&logoColor=white) |

</div>

---

## Arquitectura y Principios

```text
Caso Entrante ──► PostgreSQL (Estado: "recibido")
                      │
              Agent Loop (ReAct) ──► LLM Client ──► Grok (xAI)
               │          ▲              │
  Selección de │          │ Resultado    └─► Auditoría en llm_calls (costos & tokens)
  Herramientas ▼          │
              Herramientas ──► Servicios ──► PostgreSQL (Negocio)
                      │
               Verificación ──► case_events ──► Dictamen: "resuelto" | "escalado"
```

1. **El modelo decide, el código gobierna:** Grok no toca la base de datos directamente; solicita herramientas y el código aplica permisos y límites.
2. **Idempotencia:** Toda acción de escritura requiere una clave de idempotencia única para evitar transacciones duplicadas.
3. **Verificación Post-Escritura:** Un caso solo se cierra como `resuelto` si la inserción en base de datos es comprobada en disco.
4. **Límite de Aprobación:** Compras superiores a **$10,000 MXN** son suspendidas inmediatamente y escaladas a supervisión humana.

---

## Épicas e Historias de Usuario

> Diagrama detallado: **[Ver Diagrama de Arquitectura y Épicas](./resources/img/userHistoriesAI-BACKOFFICE.png)**

- **Épica 1: Infraestructura y Auditoría Inmutable:** Configuración de Postgres 16 en Docker, esquemas relacionales con Drizzle y protección contra modificaciones/eliminaciones en `case_events`.
- **Épica 2: Conexión con Grok y Gobernanza de Costos:** Cliente único en `src/llm/client.ts`, prueba de humo (`npm run smoke`) y registro estricto de latencia, tokens y costo en USD.
- **Épica 3: Datos de Negocio y Herramientas:** Servicios de catálogo, inventario y proveedores; herramientas tipadas (`consultar_stock`, `ver_ordenes_abiertas`, `crear_orden_compra`) con tope presupuestario y verificación en disco.
- **Épica 4: Bucle ReAct y Pruebas a Costo Cero:** Cerebro autónomo que resuelve o escala casos según evidencia, probado con 20 tests unitarios/escenarios simulados sin consumir saldo de la API.

---

## Comandos Rápidos

### Demostración en Vivo End-to-End (Grok API Real)
```bash
npm run run-case
```

### Pruebas y Validación de Código
```bash
# Validar tipos de TypeScript
npm run typecheck

# Correr suite de pruebas con LLM simulado (Costo $0 USD)
npm test

# Ejecutar prueba de humo del Gateway de Grok
npm run smoke
```

### Entorno Aislado Docker & Base de Datos
```bash
# Construir y levantar contenedores
docker compose up --build -d

# Ejecutar migraciones
npm run db:migrate

# Poblar datos iniciales de prueba (seed)
npm run db:seed

# Interfaz visual de base de datos
npm run db:studio
```

---

<p align="center">
  <sub>Desarrollado para el Reto de Agentes Autónomos • 2026</sub>
</p>
