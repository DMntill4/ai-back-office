<p align="center">
  <img src="./resources/img/bannerIcon.png" alt="Nano Banana AI Back Office Banner" width="100%" />
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

# AI Back Office Agent — Nano Banana

> **Agente autónomo de operaciones de back office (inventario, compras, auditoría y abastecimiento)** impulsado por **Grok (xAI)** con toma de decisiones ReAct, ejecución estricta de herramientas y verificación directa en base de datos.

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

El agente cuenta con su ciclo cognitivo y de ejecución completo:
- [x] **Infraestructura aislada en Docker:** PostgreSQL 16 con esquemas Drizzle ORM y triggers inmutables.
- [x] **Configuración y Logs:** Validación estricta con **Zod** y telemetría estructurada con **Pino**.
- [x] **Cliente Grok:** Conexión segura en `src/llm/client.ts`, detección de capacidades y contención de costos.
- [x] **Herramientas de negocio:** `consultar_stock`, `ver_ordenes_abiertas`, `crear_orden_compra` con **idempotencia**, límites de dinero ($10,000 MXN) y verificación post-escritura.
- [x] **Cerebro ReAct (`loop.ts`):** Ciclo autónomo de razonamiento, ejecución de herramientas y dictamen (`resuelto` vs `escalado`).
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

## Arquitectura y Flujo del Agente

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

### Principios No Negociables
1. **El modelo decide, el código gobierna:** Grok no toca la base de datos directamente; solicita herramientas y el código aplica permisos y límites.
2. **Idempotencia:** Toda acción de escritura requiere una clave de idempotencia única; repetir la llamada nunca duplica transacciones.
3. **Verificación Post-Escritura:** Un caso solo se cierra como `resuelto` si la inserción en base de datos es comprobada en disco.
4. **Límite de Aprobación Humana:** Compras superiores a **$10,000 MXN** son suspendidas inmediatamente y escaladas a supervisión.

---

## Épicas e Historias de Usuario

> Puedes consultar el diagrama visual de arquitectura y épicas en el siguiente enlace: **[Ver Diagrama de Historias de Usuario](./resources/img/userHistoriesAI-BACKOFFICE.png)**.

### Épica 1: Infraestructura Aislada, Base de Datos y Trazabilidad Inmutable
* **HU-1.1: Entorno de Desarrollo Contenedorizado**
  * **Como** desarrollador,
  * **Quiero** levantar la base de datos PostgreSQL 16 y la aplicación Node.js mediante Docker Compose,
  * **Para** garantizar que todos los desarrolladores trabajen en el mismo entorno aislado sin discrepancias de configuración local.
* **HU-1.2: Esquema de Tablas del Agente y Migraciones**
  * **Como** arquitecto de software,
  * **Quiero** modelar mediante Drizzle ORM las tablas operativas del agente (`cases`, `llm_calls`, `tool_calls`, `idempotency_keys`, `approvals`),
  * **Para** estructurar el almacenamiento de casos, llamadas al LLM y decisiones con tipos de datos financieros exactos (`decimal`).
* **HU-1.3: Bitácora Inmutable de Eventos (Append-Only)**
  * **Como** auditor de operaciones,
  * **Quiero** que la tabla `case_events` impida modificaciones (`UPDATE`) y eliminaciones (`DELETE`) mediante triggers de base de datos,
  * **Para** contar con un registro fidedigno e inalterable de cada pensamiento, herramienta y cambio de estado del agente.
* **HU-1.4: Validación Segura de Entorno y Logs Estructurados**
  * **Como** ingeniero DevOps,
  * **Quiero** validar las variables de entorno al iniciar la app usando Zod y centralizar los logs con Pino,
  * **Para** fallar de inmediato si falta configuración crítica y tener trazabilidad sin exponer credenciales en texto plano.

### Épica 2: Integración Segura con Grok (xAI) y Gobernanza de Costos
* **HU-2.1: Cliente Único de Gateway con Detección de Capacidades**
  * **Como** desarrollador del agente,
  * **Quiero** que todas las llamadas a Grok pasen exclusivamente por `src/llm/client.ts` usando el SDK compatible con OpenAI,
  * **Para** tener un punto único de control para timeouts, reintentos exponenciales y auditoría de uso.
* **HU-2.2: Prueba de Humo y Descubrimiento del Gateway**
  * **Como** líder técnico,
  * **Quiero** un comando automatizado (`npm run smoke`) que valide la llave de API, liste los modelos disponibles y pruebe el soporte de function calling y JSON estructurado,
  * **Para** documentar las capacidades reales del modelo sin asumir comportamientos no verificados.
* **HU-2.3: Medición de Tokens y Costos por Tarea**
  * **Como** administrador financiero del proyecto,
  * **Quiero** registrar en cada llamada al LLM los tokens de entrada, salida, tiempo de respuesta y costo monetario estimado en USD,
  * **Para** evaluar el costo unitario por caso y garantizar la viabilidad para la semana de carga masiva.

### Épica 3: Datos de Negocio y Herramientas con Reglas Estrictas
* **HU-3.1: Catálogo e Inventario Simulado del Negocio**
  * **Como** analista de compras,
  * **Quiero** disponer de tablas relacionales de productos, almacenes, inventarios, proveedores y cotizaciones con datos semilla (`seed`),
  * **Para** alimentar al agente con información contextual realista de stock crítico y reabastecimiento.
* **HU-3.2: Herramienta de Consulta de Stock**
  * **Como** agente autónomo,
  * **Quiero** invocar `consultar_stock` enviando el ID del producto,
  * **Para** conocer el inventario disponible, el stock en tránsito y determinar si está por debajo del umbral mínimo de seguridad.
* **HU-3.3: Herramienta de Inspección de Órdenes en Tránsito**
  * **Como** agente autónomo,
  * **Quiero** invocar `ver_ordenes_abiertas`,
  * **Para** comprobar si ya existe una orden en camino y evitar ordenar producto que ya viene en despacho.
* **HU-3.4: Creación de Órdenes con Idempotencia y Tope Presupuestario**
  * **Como** responsable de compras,
  * **Quiero** que `crear_orden_compra` rechace duplicados mediante una clave de idempotencia y suspenda compras superiores a $10,000 MXN requiriendo aprobación humana,
  * **Para** proteger a la empresa contra compras duplicadas o gastos no autorizados.
* **HU-3.5: Verificación Post-Escritura Obligatoria**
  * **Como** sistema de control de calidad,
  * **Quiero** que el servicio verifique la persistencia efectiva de la orden en la base de datos inmediatamente después de escribirla,
  * **Para** nunca dar por asumida una acción sin evidencia real en disco.

### Épica 4: Cerebro Autónomo (Bucle ReAct), Dictamen y Pruebas a Costo Cero
* **HU-4.1: Bucle Principal del Agente (ReAct Loop)**
  * **Como** agente autónomo,
  * **Quiero** recibir el caso, planificar con el prompt del sistema y ejecutar iterativamente herramientas hasta concluir,
  * **Para** investigar, decidir y actuar con autonomía respetando límites de pasos y tokens.
* **HU-4.2: Cierre Estricto: Resuelto vs Escalado**
  * **Como** supervisor de operaciones,
  * **Quiero** que un caso solo se marque como `resuelto` si todas las escrituras fueron verificadas con éxito, y se marque como `escalado` si hubo falta de datos, aprobaciones pendientes o errores,
  * **Para** garantizar que ninguna operación quede en un estado dudoso o a medias.
* **HU-4.3: Entorno de Pruebas con Modelo Falso (Costo $0)**
  * **Como** desarrollador,
  * **Quiero** ejecutar suites automáticas usando `FakeGrokClient`,
  * **Para** probar los escenarios de negocio (compra normal, intento duplicado, producto inexistente) en CI/CD sin consumir tokens reales ni gastar saldo de la API.
* **HU-4.4: Ejecución Demostrativa End-to-End en Vivo**
  * **Como** juez del reto / usuario final,
  * **Quiero** correr un script demostrativo (`npm run run-case`) que resuelva un faltante de inventario real usando el modelo Grok en vivo,
  * **Para** constatar en tiempo real la autonomía del agente, el gasto de tokens y la persistencia del resultado en la base de datos.

---

## Comandos Rápidos

### 1. Demostración en Vivo End-to-End (API Real de Grok)
```bash
npm run run-case
```
> Ejecuta un caso real de faltante de stock, consulta a Grok en vivo, ejecuta las herramientas y resuelve el caso en la base de datos con telemetría en tiempo real.

### 2. Pruebas Automáticas y Verificación
```bash
# Validar tipos de TypeScript
npm run typecheck

# Correr suite de pruebas con LLM simulado (Costo $0 USD)
npm test

# Ejecutar prueba de humo del Gateway de Grok
npm run smoke
```

### 3. Entorno Aislado con Docker & Base de Datos
```bash
# Construir y levantar contenedores
docker compose up --build -d

# Ejecutar migraciones de base de datos
npm run db:migrate

# Poblar datos iniciales de prueba (seed)
npm run db:seed

# Explorar base de datos visualmente
npm run db:studio
```

---

<p align="center">
  <sub>Desarrollado para el Reto de Agentes Autónomos • 2026</sub>
</p>
