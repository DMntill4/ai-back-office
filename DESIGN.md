# Mint Design System — Documento Maestro de Diseño (DESIGN.md)

Este documento fija el sistema visual, los tokens, los patrones de interacción y las reglas de diseño para la aplicación de escritorio y superficies web de **Mint — Back Office Autónomo** (Guanábana Labs).

La identidad visual está inspirada en la disciplina, el contraste y la morfología de píldoras de **Flowcraft** (`https://tender-celery-477359.framer.app/`), adaptada con rigor a un software operativo denso para la gestión de compras, inventario y logística industrial en Colombia.

---

## 1. Principios de Identidad

1. **El verde es la firma institucional, no el botón ni el semáforo:** El verde menta (`#2BB656`) y el degradé lima (`#9DE342` a `#2BB656`) se reservan exclusivamente para la identidad de marca, el foco de teclado accesible y el acento en cifras clave. El estado "correcto / al día" tiene su propio color (Teal).
2. **Botón insignia en píldora blanca:** La acción principal de cada pantalla se ejecuta con una píldora blanca pura con texto oscuro y círculo con flecha (`→`), creando el punto focal de mayor jerarquía visual de la pantalla.
3. **El riesgo estético vive en el Agente:** Las tablas, notas, datos y formularios son estrictos, planos y sobrios en una grilla de 4/8 px. La única silueta libre y orgánica es la de la **guanábana**, representada en una **nube de puntos (Canvas 2D)** que reacciona a su actividad operativa.
4. **Franja de métricas sin tarjetas:** Los KPIs de alto nivel se despliegan en una línea continua horizontal con cifras grandes y contexto debajo, separadas únicamente por filetes verticales finos de 1px. Cero "cajas dentro de cajas".
5. **Estructura estricta de navegación lateral (18 Opciones):** La navegación se apega con exactitud a la arquitectura de información definida por el usuario (Operaciones, Gobernanza, Inteligencia, Comunicaciones, Configuración).
6. **Lenguaje natural de negocio en español:** Queda erradicada la jerga técnica de frameworks de IA ("HITL", "Lienzo Operativo", "Prompt Engineering"). Hablamos de *Aprobaciones*, *Flujo del agente*, *Inventario y bodegas* y *Punto de reorden (ROP)*.

---

## 2. Paleta de Color & Tokens

### Superficies (Negro Bosque Vegetal)
| Token | Hex | Rol |
| :--- | :--- | :--- |
| `forest-canvas` | `#070B08` | Fondo base de la aplicación. Jamás `#000000` puro ni grises neutros. |
| `forest-surface` | `#0C130F` | Paneles laterales, barra superior flotante y contenedores principales. |
| `forest-card` | `#111A14` | Filas de datos, tarjetas de detalle y campos interactivos. |
| `forest-border` | `#19261E` | Filetes estructurales finos (1px). |
| `forest-borderBright` | `#25372C` | Bordes activos, hover y divisiones secundarias. |

### Marca & Firma Mint (Banner Oficial)
| Token | Hex | Rol |
| :--- | :--- | :--- |
| `brand-lime` | `#9DE342` | Extremo superior del gradiente firma (cifras clave y wordmark). |
| `brand` / `primary` | `#2BB656` | Verde esmeralda de hoja de guanábana. Identidad, foco y selección activa. |
| `brand-dark` | `#1FA34D` | Estado presionado / activo de elementos de marca. |
| `brand-surface` | `#0F2016` | Fondo sutil de elementos seleccionados. |

### Botón Principal Insignia (Flowcraft White Pill)
* **Cuerpo:** Píldora `#FFFFFF` (Blanco puro) con texto `#070B08` en peso SemiBold (`font-semibold`).
* **Círculo de acción:** Círculo interno `#070B08` con flecha `→` blanca centrada.
* **Sombra:** `0 0 20px rgba(255, 255, 255, 0.15)`.

### Escala Semántica de Estados (Completamente Separada de la Marca)
Ningún estado se comunica únicamente con color; siempre se acompaña de su símbolo geométrico unificado y etiqueta en *sentence case*:

| Estado | Símbolo | Color | Hex | Fondo | Borde | Uso operativo |
| :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| **Correcto** | `●` | Teal | `#14B8A6` | `#14B8A6` (12%) | `#14B8A6` (28%) | Existencias sobre ROP, conexión en línea, orden emitida. |
| **Atención** | `▲` | Ámbar | `#F59E0B` | `#F59E0B` (12%) | `#F59E0B` (28%) | Inventario bajo punto de reorden, retraso proyectado. |
| **Error** | `■` | Carmín | `#E11D48` | `#E11D48` (12%) | `#E11D48` (28%) | Quiebre de stock crítico, falla de integración, transacción abortada. |
| **Pendiente** | `◆` | Cobalto | `#6366F1` | `#6366F1` (12%) | `#6366F1` (28%) | Propuesta de compra superior a $5.000.000 COP esperando firma humana. |
| **En curso** | `◌` | Pizarra | `#94A3B8` | `#94A3B8` (12%) | `#94A3B8` (28%) | Ciclo activo de escaneo de catálogo, transporte en tránsito. |

### Jerarquía de Texto
| Token | Hex | Uso |
| :--- | :--- | :--- |
| `txt-primary` | `#EDF3EE` | Titulares, cifras numéricas y lectura principal (blanco vegetal cálido). |
| `txt-secondary` | `#8EA495` | Párrafos descriptivos, etiquetas de campos y cabeceras de tabla. |
| `txt-tertiary` | `#586B5F` | Placeholders, marcas de tiempo relativas y texto atenuado. |

---

## 3. Tipografía & Cifras

* **Familia Primaria:** `Plus Jakarta Sans` (Grotesco geométrico contemporáneo que armoniza con las curvas redondas del wordmark *Mint*).
* **Tracking en titulares:** Negativo (`tracking-tight` y `tracking-tighter`) en títulos y cifras grandes.
* **Familia Monoespaciada:** `IBM Plex Mono` con cifras tabulares (`tabular-nums`) para SKUs, montos en COP, tiempos y códigos de orden.

---

## 4. Arquitectura de Información — Las 18 Opciones de Navegación

El shell de la aplicación implementa de forma canónica las 18 rutas de navegación lateral definidas en la referencia del usuario:

### 1. Inicio
* **`inicio` (Inicio):** Vista de mando integral con saludo a Fernando S., 4 KPIs principales (342 Productos, 8 Stock Bajo, 2 Aprobaciones, 48 Tareas del Agente), lista de acciones pendientes, anillo circular de salud del agente (98%), gráficos de movimiento de inventario, compras/solicitudes, y canales de notificación activos.

### 2. Operaciones
* **`inventario` (Inventario):** Control de stock por bodegas (Matriz Bucaramanga, CD Bogotá, CD Medellín), cálculo de ROP en tiempo real, días de cobertura y simulación de rebalanceo interbodegas.
* **`rutas_logistica` (Rutas y logística):** Torre de control de despachos con motor OSRM, cálculo de distancias (Bucaramanga-Bogotá-Medellín), ahorro en consolidación de fletes y manifiestos de carga.
* **`proveedores` (Proveedores):** Directorio de proveedores homologados (DeWalt, Bosch, Mundial de Tornillos, etc.), tiempos de reposición, confiabilidad histórica y contratos de descuento.
* **`compras_ordenes` (Compras y órdenes):** Libro mayor de órdenes emitidas (PO-2026-0089 a 0093), estados de entrega y botón de nueva solicitud de compra.
* **`productos` (Productos):** Catálogo maestro de materiales, empaque mínimo, stock de seguridad y costos unitarios.

### 3. Gobernanza
* **`aprobaciones` (Aprobaciones):** Bandeja HITL para compras que superan el umbral ($5.000.000 COP), firma criptográfica HMAC-SHA256, desglose de impacto y justificación del agente.
* **`auditoria_eventos` (Auditoría de eventos):** Registro inmutable en PostgreSQL, telemetría de tokens y árbol de pasos de razonamiento del agente.
* **`reglas_politicas` (Reglas y políticas):** Calibración de umbrales financieros, factor de stock de seguridad y políticas de rebalanceo automático.
* **`roles_permisos` (Roles y permisos):** Control de acceso RBAC para operadores (Fernando S., Carlos M., Juan P.) y agente autónomo con matriz de capacidades.

### 4. Inteligencia
* **`flujo_agente` (Flujo del agente):** Vista de proceso autónomo de reabastecimiento (Ingesta de stock → Detección ROP → Consulta de proveedores → Optimización OSRM → Decisión HITL) con presencia del agente mediante la nube de partículas de la guanábana.
* **`mapa_conocimiento` (Mapa de conocimiento):** Grafo interactivo de entidades operacionales (bodegas, SKUs, proveedores, rutas).
* **`memoria_agente` (Memoria del agente):** Bóveda de notas Markdown sin contaminación técnica de frontmatter en el texto de lectura.
* **`analisis_reportes` (Análisis y reportes):** Métricas de compresión de capital de trabajo (-14.2%), rotación de inventario (4.8x) y exportación de informe PDF.

### 5. Comunicaciones
* **`canales_notificaciones` (Canales y notificaciones):** Integraciones con Slack Bot, Email SMTP y Webhooks con botón interactivo de prueba.
* **`webhooks_api` (Webhooks y API):** Catálogo de endpoints REST, stream SSE en tiempo real y gestión de claves API secretas.

### 6. Configuración
* **`empresas_sucursales` (Empresas y sucursales):** Ficha de Ferretería Industrial Santandereana S.A.S. y sucursales físicas georreferenciadas.
* **`integraciones` (Integraciones):** Estado de salud y latencia de los conectores (PostgreSQL 16, OSRM, Bóveda local, ERP Siigo/SAP, Slack).
* **`configuracion_general` (Configuración general):** Herramienta de diagnóstico técnico `mint doctor`, selección de modelos de inferencia y niveles de autonomía.

---

## 5. Presencia del Agente (Nube de Guanábana)

El único elemento que asume riesgo estético dinámico es el avatar del agente:
* **Silueta:** Contorno orgánico de la fruta guanábana con 130 partículas en 2D Canvas.
* **Estados:** Reposo (pulsación suave), Leyendo (partículas agrupadas hacia datos), Pensando (giro continuo), Mutando (pulso de confirmación).
* **Rendimiento:** Auto-pausa cuando la ventana no está visible y respeto absoluto a `prefers-reduced-motion`.
