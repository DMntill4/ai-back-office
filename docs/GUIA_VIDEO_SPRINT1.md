# Guión Oficial de Presentación Sprint 1: MINT Platform
## Agente Autónomo Fullstack de Back Office (Frontend + Backend)

> **Formato del Video:** Presentación comercial y técnica de la Etapa 1 / Sprint 1 de desarrollo (Demostración de producto lista para clientes y evaluadores).  
> **Duración total:** 3:00 - 3:30 minutos.  
> **Estructura de Roles:**
> - 🖥️ **FRONTEND (Andrés Guerra):** Consola Web Mint, UX/UI en React 19, Centro de Mando asimétrico 70/30, telemetría y Human-in-the-Loop.
> - ⚙️ **BACKEND (Diego Mantilla):** Motor ReAct en Grok-4.6, Fastify API, persistencia en PostgreSQL con Drizzle ORM, inmutabilidad y suite de tests en Vitest.

---

## 🎬 Estructura de Grabación y Escenas (OBS / Loom)

```text
┌─────────────────────────┐      ┌─────────────────────────┐      ┌─────────────────────────┐      ┌─────────────────────────┐
│     ESCENA 1: INTRO     │      │   ESCENA 2: FRONTEND    │      │    ESCENA 3: BACKEND    │      │    ESCENA 4: CIERRE     │
│  (0:00 - 0:25) [ROSTROS]│ ──►  │ (0:25 - 1:40) [BROWSER] │ ──►  │ (1:40 - 2:50) [TERMINAL]│ ──►  │ (2:50 - 3:15) [ROSTROS] │
│ ┌──────────┐┌──────────┐│      │ ┌─────────────────────┐ │      │ ┌─────────────────────┐ │      │ ┌──────────┐┌──────────┐│
│ │  DIEGO   ││  ANDRÉS  ││      │ │   CONSOLA WEB MINT  │ │      │ │ FASTIFY / POSTGRES  │ │      │ │  DIEGO   ││  ANDRÉS  ││
│ │ (Backend)││(Frontend)││      │ │  (http://localhost) │ │      │ │    VITEST (20/20)   │ │      │ │          ││          ││
│ └──────────┘└──────────┘│      │ └─────────────────────┘ │      │ └─────────────────────┘ │      │ └──────────┘└──────────┘│
│                         │      │ ┌─────┐ ┌─────┐ (PiP)   │      │ ┌─────┐ ┌─────┐ (PiP)   │      │                         │
│                         │      │ │DIEGO│ │ANDRÉS│        │      │ │DIEGO│ │ANDRÉS│        │      │                         │
└─────────────────────────┘      └─────────────────────────┘      └─────────────────────────┘      └─────────────────────────┘
```

---

## ⏱️ Cronograma Maestro de Intervenciones

| Tiempo | Bloque | Responsable | Foco Principal | Modo de Cámara |
| :---: | :--- | :---: | :--- | :--- |
| **0:00 - 0:25** | **Apertura Comercial** | **Diego & Andrés** | Pitch del problema y presentación del producto MINT | Cámara Completa (Ambos) |
| **0:25 - 1:40** | **BLOQUE 1: FRONTEND** | **Andrés Guerra** | Consola Web Mint, Dashboard 70/30, Densidad, Almacenes y HITL | Pantalla Browser + PiP |
| **1:40 - 2:50** | **BLOQUE 2: BACKEND** | **Diego Mantilla** | Motor ReAct en Grok-4.6, Fastify, Triggers Inmutables y Tests | Pantalla Terminal/API + PiP |
| **2:50 - 3:15** | **Cierre y Próximos Pasos**| **Diego & Andrés** | Conclusiones de Etapa 1 y llamado a la acción comercial | Cámara Completa (Ambos) |

---

---

# 🗣️ GUIÓN PASO A PASO (TEXTO ÍNTEGRO PARA CADA UNO)

---

## 🟢 BLOQUE DE APERTURA: INTRODUCCIÓN CONJUNTA (0:00 - 0:25)
* **Cámara:** Escena 1 — Diego y Andrés a cámara completa, mirando al lente con energía.
* **Actitud:** Seguridad profesional, tono de pitch ejecutivo para clientes e inversionistas.

* 🗣️ **Diego Mantilla (0:00 - 0:12):**
  > *"En las operaciones empresariales, un desabasto no detectado o una compra de emergencia fuera de presupuesto pueden costar decenas de miles de dólares. Bienvenidos, soy Diego Mantilla..."*

* 🗣️ **Andrés Guerra (0:12 - 0:17):**
  > *"... y yo soy Andrés Guerra. Hoy les presentamos **MINT**: la plataforma integral de agentes autónomos para la gestión logística y de compras corporativas."*

* 🗣️ **Diego Mantilla (0:17 - 0:25):**
  > *"En este video les mostraremos la **Etapa 1 de desarrollo**, dividida en dos pilares: Andrés les mostrará la experiencia de usuario en el frontend, y yo les explicaré la arquitectura de gobernanza en el backend."*

---

---

## 💻 BLOQUE 1: FRONTEND & CONSOLA WEB (0:25 - 1:40)
### 🎙️ A cargo de: Andrés Guerra
* **Cámara:** Escena 2 — Pantalla completa del navegador (`http://localhost:5173`) con webcams en PiP.
* **Enfoque:** Experiencia de usuario, estética dark glassmorphism, reactividad en tiempo real y gobernanza visual.

#### 🎬 Acción en Pantalla 1 (0:25 - 0:45):
* Andrés muestra la pantalla de **LoginView** con resplandor esmeralda y el logo de Mint. Hace clic en *"Iniciar Sesión"*.
* La vista transiciona fluidamente al **Centro de Mando**.
* Andrés interactúa con la **barra de rango temporal global**: hace clic en `24H`, `7D`, `30D` y `TRIMESTRE`, mostrando cómo los números y gráficos se recalculan al vuelo.

> 🗣️ **Andrés Guerra (0:25 - 0:45):**  
> *"Comenzamos en la consola web de MINT, desarrollada con **React 19, Vite y Tailwind CSS v4** bajo una estética técnica pensada para salas de control operativo.  
> En el Centro de Mando, integramos un **selector de rango temporal global**: con un clic en 24 horas, 7 días o 30 días, todo el tablero recalcula compras, proyecciones de gasto y rendimiento logístico al instante."*

#### 🎬 Acción en Pantalla 2 (0:45 - 1:05):
* Andrés se dirige a la esquina superior derecha y activa el **Conmutador de Densidad**:
  - Pasa de vista **Compacta** (tarjetas minimalistas) a vista **Analítica (Expandida)**.
  - Señala el sparkline suave de **Órdenes Totales**, el de **Ahorro Acumulado ($1,840 USD)**, la **barra de progreso segmentada de automatización (91%)** y las mini-columnas de consumo de **Inferencia Grok-4.6**.

> 🗣️ **Andrés Guerra (0:45 - 1:05):**  
> *"Para adaptarse a distintos perfiles de usuario, implementamos un **conmutador de densidad de vista**:  
> La vista compacta ofrece datos ejecutivos rápidos, mientras que la vista analítica expande micro-visualizaciones con curvas de área y barras de consumo de IA.  
> Noten la tarjeta de automatización: muestra visualmente que el **91% de las decisiones son completamente autónomas**, mientras que el 9% restante se reserva para supervisión humana."*

#### 🎬 Acción en Pantalla 3 (1:05 - 1:25):
* Andrés baja el scroll al **Grid Asimétrico 70/30**:
  - En el lado izquierdo (70%): pasa el cursor sobre las barras de **Rendimiento de Proveedores**, mostrando el tooltip interactivo con costo unitario, SLA y porcentaje exacto (Grainger 98.4%).
  - En el lado derecho (30%): señala la **Salud de Almacenes** (con capacidad y temperatura por sensor) y cambia entre las pestañas del Monitor Proactivo: **ALERTAS (2)**, **OK (2)** y **CRON**.

> 🗣️ **Andrés Guerra (1:05 - 1:25):**  
> *"La pantalla se estructura en una asimetría 70/30: a la izquierda, nuestro comparador inteligente de proveedores pondera tiempos de entrega y defectos con líneas guía y tooltips limpios.  
> A la derecha, unificamos la telemetría de 4 almacenes con monitoreo térmico en vivo y un sistema de pestañas que alerta de quiebres de inventario."*

#### 🎬 Acción en Pantalla 4 (1:25 - 1:40):
* En la alerta del *Sensor ST-200*, Andrés hace clic en **"Resolver"**; la aplicación salta a la consola del agente (`AgentWorkspace`).
* Muestra la bandeja de **Aprobaciones Críticas** (`ApprovalsView`), hace clic en *"Aprobar"* en una orden retenida y salta la notificación verde de confirmación.
* Presiona `Ctrl+K` para abrir la **Paleta de Comandos** global.

> 🗣️ **Andrés Guerra (1:25 - 1:40):**  
> *"Si un producto como el Sensor ST-200 llega a nivel crítico, el operador hace clic en 'Resolver' y la interfaz lo traslada al chat del agente con el prompt listo.  
> Además, en la bandeja de aprobaciones, los supervisores autorizan compras mayores en un solo clic con confirmación visual instantánea, y navegan todo el sistema sin tocar el ratón gracias a la paleta de comandos rápida `Ctrl+K`.  
> Ahora, Diego les mostrará el cerebro que hace posible todo esto en el backend."*

---

---

## ⚙️ BLOQUE 2: BACKEND, MOTOR REACT Y GOBERNANZA (1:40 - 2:50)
### 🎙️ A cargo de: Diego Mantilla
* **Cámara:** Escena 3 — Pantalla de terminal / VS Code / Postman / Tests con webcams en PiP.
* **Enfoque:** Razonamiento del agente, Fastify API, PostgreSQL inmutable, reglas de negocio e integridad sin alucinaciones.

#### 🎬 Acción en Pantalla 1 (1:40 - 2:05):
* Diego muestra la arquitectura en código o la terminal donde corre el servidor Fastify (`http://localhost:3001`).
* Muestra el endpoint `/api/chat` o un log de ejecución del bucle **ReAct**.

> 🗣️ **Diego Mantilla (1:40 - 2:05):**  
> *"Detrás de esta interfaz opera un servidor de alto rendimiento desarrollado en **Fastify 5**, diseñado con un principio no negociable: **'el modelo de IA propone, pero el código gobierna'**.  
> En el núcleo reside un bucle autónomo **ReAct (Reasoning + Acting)** ejecutado sobre **Grok-4.6**.  
> El agente no inventa respuestas: analiza la intención del usuario, inyecta dinámicamente 'superpoderes' de negocio en Markdown y ejecuta herramientas tipadas con Zod para consultar stock real y cotizar con proveedores certificados."*

#### 🎬 Acción en Pantalla 2 (2:05 - 2:30):
* Diego muestra el archivo de migración `0001_protect_case_events.sql` o la estructura de tablas de **Drizzle ORM** y la regla de gobernanza de $10,000 MXN.

> 🗣️ **Diego Mantilla (2:05 - 2:30):**  
> *"La seguridad financiera de la empresa está blindada a nivel de código: establecimos un **límite autónomo estricto de $10,000 pesos mexicanos**.  
> Si una orden supera ese importe, el agente tiene prohibido comprar de forma autónoma: escala el caso a la bandeja Human-in-the-Loop que vieron con Andrés.  
> Toda la información persiste en **PostgreSQL 16 en Supabase Cloud**, y creamos un trigger nativo en base de datos que **bloquea cualquier intento de UPDATE o DELETE** en el historial de eventos. La pista de auditoría es 100% inmutable y a prueba de manipulaciones."*

#### 🎬 Acción en Pantalla 3 (2:30 - 2:50):
* Diego abre la terminal y ejecuta en vivo:
  ```bash
  npm test
  ```
* Se aprecia la ejecución de Vitest: pasan los **8 suites de pruebas** y **20 tests** en verde brillante en ~1.5 segundos.

> 🗣️ **Diego Mantilla (2:30 - 2:50):**  
> *"Para garantizar que cada regla de negocio se cumpla sin fallas y sin gastar saldo de producción, implementamos una suite integral en **Vitest** con mocks deterministas.  
> Como pueden ver en la terminal, **los 20 tests automáticos pasan al 100% en menos de dos segundos**: validando inventarios, escalamientos de presupuesto y detección de anomalías a costo $0 USD."*

---

---

## 🏆 BLOQUE 3: CIERRE COMERCIAL Y LLAMADO A LA ACCIÓN (2:50 - 3:15)
* **Cámara:** Escena 4 — Diego y Andrés a cámara completa, sonriendo y con presencia ejecutiva.
* **Actitud:** Cierre ganador, visión a futuro y agradecimiento formal.

* 🗣️ **Andrés Guerra (2:50 - 3:00):**
  > *"Con este primer hito, demostramos que MINT no es solo un prototipo conceptual: es una consola web lista para operar, conectar equipos y reducir fricciones logísticas desde el día uno."*

* 🗣️ **Diego Mantilla (3:00 - 3:10):**
  > *"Respaldada por una infraestructura robusta, gobernada por código y preparada para escalar hacia auditorías proactivas y automatizaciones complejas en los próximos sprints."*

* 🗣️ **Diego y Andrés al unísono (3:10 - 3:15):**
  > *"¡Muchas gracias por su tiempo, y bienvenidos al futuro de las operaciones con MINT!"*  
  *(Ambos asienten sonriendo y despiden a la cámara con la mano)*.

---

---

## 📋 Tarjetas de Apoyo Rápido para la Grabación (Cue Cards)

### 📌 Tarjeta de Andrés (Frontend)
1. **Login & Dashboard:** Clic en Login ➔ Mostrar `24H`, `7D`, `30D` ➔ Cambiar densidad a *Analítica*.
2. **KPIs:** Destacar 91% automatización, ahorro de $1,840 USD y bajo costo en Grok.
3. **Asimetría 70/30:** Hover en barras de proveedores ➔ Salud de almacenes ➔ Tabs de alertas (`ALERTAS` / `OK` / `CRON`).
4. **HITL & Atajo:** Clic en *Resolver* (Sensor ST-200) ➔ Aprobar en bandeja Human-in-the-Loop ➔ Abrir `Ctrl+K`.

### 📌 Tarjeta de Diego (Backend)
1. **Filosofía & ReAct:** Fastify API ➔ *"El modelo propone, el código gobierna"* ➔ Grok-4.6 con herramientas tipadas Zod.
2. **Gobernanza & DB:** Límite estricto de $10,000 MXN ➔ PostgreSQL con Drizzle ORM ➔ Trigger inmutable que bloquea `UPDATE`/`DELETE`.
3. **Verificación en Vivo:** Correr `npm test` en la terminal ➔ Destacar 20 de 20 tests en verde a costo $0 USD.
