# Mint — Design System v2

> Mint es un back office autónomo: un agente que vigila inventario, compara proveedores y propone compras, y una persona que decide. La interfaz es sobria y de bajo cansancio visual, con un único gesto memorable: la presencia del agente en forma de guanábana.

**Theme:** dark

**Brand source:** banner oficial de Mint (símbolo de guanábana, wordmark redondo, degradé lima a verde, negros teñidos de bosque).

Este documento reemplaza al DESIGN.md anterior. Reglas que rigen todo lo demás: el verde es identidad y no es semáforo; una sola acción principal por pantalla; todo texto cumple contraste AA; solo hay una animación ambiental por pantalla; el detalle técnico se oculta por defecto.

## Tokens – Colors

| Name | Value | Token | Role |
|---|---|---|---|
| Canvas | #0F1612 | `--color-canvas` | Fondo base de la aplicación. Verde bosque oscuro, nunca negro puro |
| Panel | #151E19 | `--color-panel` | Barra lateral, barra superior y paneles de contenido |
| Raised | #1C2822 | `--color-raised` | Fila seleccionada, menús, diálogos y elementos elevados |
| Border | #26342C | `--color-border` | Filetes finos que separan regiones funcionales |
| Border Strong | #3A4B41 | `--color-border-strong` | Hover, bordes de campos y divisiones secundarias |
| Text Primary | #EEF2EC | `--color-text-primary` | Titulares, cifras y lectura principal. Blanco cálido, no #FFFFFF |
| Text Secondary | #AEBCB2 | `--color-text-secondary` | Descripciones, etiquetas de campo y cabeceras de tabla |
| Text Muted | #86968B | `--color-text-muted` | Marcas de tiempo, metadatos y placeholders. Mínimo 4,5:1 |
| Brand Mint | #2BB656 | `--color-brand` | Identidad: logo, foco de teclado, selección activa e indicador de navegación |
| Brand Lime | #9DE342 | `--color-brand-lime` | Extremo claro del degradé de marca. Solo en cifras clave y wordmark |
| Action | #F1EFE8 | `--color-action` | Fondo del botón principal (píldora blanca cálida) |
| Action Hover | #FFFFFF | `--color-action-hover` | Hover del botón principal |
| Action Text | #0F1612 | `--color-action-text` | Texto e icono sobre el botón principal |

### State Colors

Los estados nunca se comunican solo con color: siempre llevan símbolo y texto en minúscula tras la primera letra. Ninguno de estos colores es el verde de marca.

| Name | Value | Token | Role |
|---|---|---|---|
| State OK | #2DD4BF | `--color-state-ok` | Símbolo ●. Existencias sobre el punto de reorden, conexión activa, orden emitida |
| State Attention | #F5B544 | `--color-state-attention` | Símbolo ▲. Stock bajo el punto de reorden, retraso proyectado |
| State Error | #F27A88 | `--color-state-error` | Símbolo ■. Quiebre de stock, falla de integración, operación abortada |
| State Pending | #9AA2FF | `--color-state-pending` | Símbolo ◆. Compra que supera el umbral y espera firma humana |
| State In Progress | #9AA9BC | `--color-state-progress` | Símbolo ◌. Escaneo en curso, envío en tránsito |
| State OK Surface | rgba(45, 212, 191, 0.12) | `--color-state-ok-surface` | Fondo del indicador de estado correcto |
| State Attention Surface | rgba(245, 181, 68, 0.12) | `--color-state-attention-surface` | Fondo del indicador de atención |
| State Error Surface | rgba(242, 122, 136, 0.12) | `--color-state-error-surface` | Fondo del indicador de error |
| State Pending Surface | rgba(154, 162, 255, 0.12) | `--color-state-pending-surface` | Fondo del indicador de pendiente |
| State In Progress Surface | rgba(154, 169, 188, 0.12) | `--color-state-progress-surface` | Fondo del indicador en curso |

### Decorative / Gradient

| Name | Value | Token | Role |
|---|---|---|---|
| Brand Gradient | linear-gradient(135deg, #9DE342 0%, #2BB656 100%) | `--gradient-brand` | Wordmark y una cifra clave por pantalla. Nunca como relleno de superficies |
| Agent Halo | radial-gradient(circle, rgba(43, 182, 86, 0.18) 0%, rgba(43, 182, 86, 0) 65%) | `--gradient-agent-halo` | Halo discreto detrás de la nube del agente. Único glow permitido |
| Entry Grid | linear-gradient(rgba(238, 242, 236, 0.04) 1px, transparent 1px) | `--gradient-entry-grid` | Cuadrícula tenue solo en entrada, selección de empresa y estados vacíos. Nunca detrás de tablas |

Contraste medido contra Canvas, Panel y Raised (relación WCAG): Text Primary 16,2 / 15,1 / 13,5. Text Secondary 9,3 / 8,6 / 7,7. Text Muted 5,9 / 5,5 / 4,9. Brand Mint 6,9 / 6,4 / 5,8. Todos los colores de estado superan 5,7 sobre cualquier superficie. Action Text sobre Action: 16,0.

## Tokens – Typography

### --font-sans

**Substitute:** "Figtree", system-ui, -apple-system, "Segoe UI", sans-serif  
**Weights:** 400, 500, 600, 700  
**Role:** Única familia de interfaz. Redonda y geométrica, en armonía con el wordmark de Mint. Cifras con `font-variant-numeric: tabular-nums` en tablas, montos y cantidades. Verificar en implementación que la fuente elegida soporte cifras tabulares; si no, sustituir por otra familia geométrica que sí las tenga.

### --font-mono

**Substitute:** "IBM Plex Mono", ui-monospace, "SF Mono", Consolas, monospace  
**Weights:** 400, 500  
**Role:** Solo identificadores: SKU, número de orden, hashes y firmas. Nunca para etiquetas, montos, fechas ni estados.

### Type Scale

Cuerpo de 14 px. Ningún texto visible baja de 12 px.

| Role | Size | Line Height | Letter Spacing | Token |
|---|---|---|---|---|
| Display | 2.5rem | 1.1 | -0.03em | `--text-display` |
| Metric | 2rem | 1.1 | -0.025em | `--text-metric` |
| Page Title | 1.5rem | 1.25 | -0.02em | `--text-page-title` |
| Section Title | 1.125rem | 1.35 | -0.01em | `--text-section-title` |
| Group Title | 1rem | 1.4 | -0.005em | `--text-group-title` |
| Body Large | 1rem | 1.5 | 0em | `--text-body-large` |
| Body | 0.875rem | 1.5 | 0em | `--text-body` |
| Label | 0.8125rem | 1.4 | 0.005em | `--text-label` |
| Caption | 0.75rem | 1.4 | 0.01em | `--text-caption` |
| Identifier | 0.8125rem | 1.5 | 0em | `--text-identifier` |

Display solo en entrada a la app y en el estado vacío inicial. Metric: una franja de cifras por pantalla como máximo.

## Tokens – Spacing & Shapes

### Spacing Scale

Grilla de 4 px.

| Name | Value | Token |
|---|---|---|
| Hairline | 0.25rem | `--spacing-hairline` |
| Compact | 0.5rem | `--spacing-compact` |
| Element | 0.75rem | `--spacing-element` |
| Base | 1rem | `--spacing-base` |
| Group | 1.5rem | `--spacing-group` |
| Section | 2.5rem | `--spacing-section` |
| Page | 4rem | `--spacing-page` |

**Density:** Cómoda en lectura y compacta en datos. Filas de tabla de 40 px, padding de paneles de 24 px, y espacio vacío generoso entre grupos en vez de bordes y tarjetas anidadas.

### Border Radius

Tres niveles, cada uno con un propósito. No se usa el mismo radio en todo.

| Name | Value | Token |
|---|---|---|
| Control | 0.5rem | `--radius-control` |
| Container | 0.75rem | `--radius-container` |
| Pill | 9999px | `--radius-pill` |

Control: campos, filas, chips de filtro. Container: paneles y diálogos. Pill: botones, chips de evento y selector de empresa.

### Shadows

Las tarjetas y paneles no llevan sombra: se separan por superficie y filete. La sombra solo indica capas flotantes.

| Name | Value | Token |
|---|---|---|
| Popover | 0 8px 24px rgba(0, 0, 0, 0.45) | `--shadow-popover` |
| Dialog | 0 16px 48px rgba(0, 0, 0, 0.6) | `--shadow-dialog` |
| Focus Ring | 0 0 0 2px #0F1612, 0 0 0 4px #2BB656 | `--shadow-focus` |

## Components

### Button

**Role:** Acción de la pantalla. Una sola principal por vista.

Principal: píldora `--color-action` con texto `--color-action-text` en peso 600 y, a la derecha, un círculo oscuro con flecha blanca. Esa flecha es el único uso permitido de flecha en botones. Hover a `--color-action-hover`. Secundario: píldora transparente con filete `--color-border-strong` y texto `--color-text-primary`. Fantasma: sin borde, texto `--color-text-secondary`. Destructivo: texto y filete `--color-state-error`. Altura de 36 px, 32 px en tablas. Foco con `--shadow-focus`. El verde de marca nunca es el fondo de un botón. Sin escala en hover.

### Panel

**Role:** Contenedor de una región funcional.

Fondo `--color-panel`, radio `--radius-container`, padding `--spacing-group`, filete `--color-border` solo si separa dos regiones. Sin sombra. Nunca se anida un panel dentro de otro: dentro se agrupa con espacio y títulos.

### Page Header

**Role:** Una barra de página por pantalla.

Título `--text-page-title`, descripción de una línea en `--color-text-secondary` y a la derecha las acciones de la pantalla. Los filtros y modos de vista se agrupan en un solo control debajo del encabezado, nunca en filas apiladas.

### Navigation

**Role:** Barra lateral con 7 destinos y subpestañas.

Ancho de 232 px, colapsable a 64 px. El destino activo se marca con una barra de 3 px en `--color-brand` y fondo `--color-raised`. Sin etiquetas de sección en mayúsculas. El selector de empresa y el rol del usuario siempre visibles en la parte superior. Ver la sección "Information Architecture".

### Status Indicator

**Role:** Único lenguaje de estado de la aplicación.

Símbolo geométrico, texto y fondo de superficie del estado, en píldora de `--text-caption`. Ejemplo: ▲ Bajo el punto de reorden. Solo se usa para estados; no para filtros ni decoración.

### Agent Event Chip

**Role:** Una acción del agente con su referencia y su tiempo.

Píldora con ícono de verificación, acción corta, referencia en `--font-mono` y tiempo relativo en `--color-text-muted`. Ejemplo: Orden propuesta, PO-2026-0089, hace 2 min. Es el patrón único para la actividad en vivo y el historial. No sirve como filtro ni como decoración.

### Activity Feed

**Role:** Lo que el agente hizo, en orden cronológico.

Lista de Agent Event Chip separados por filetes `--color-border`, con la hora a la izquierda. Los eventos nuevos entran arriba sin animación llamativa. Reemplaza al muro de indicadores en Inicio.

### Metric Strip

**Role:** Cifras clave sin tarjetas.

Línea horizontal de 3 o 4 cifras en `--text-metric` con una línea de contexto debajo y filetes verticales de 1 px entre ellas. Una sola cifra por pantalla usa `--gradient-brand`. Solo con datos reales o con un estado vacío honesto; nunca valores de relleno.

### Data Table

**Role:** Inventario, órdenes, proveedores, productos.

Filas de 40 px, cabecera en `--text-label` y `--color-text-secondary`, cifras tabulares alineadas a la derecha, estado por fila con Status Indicator, orden por columna y búsqueda. Selección con fondo `--color-raised`. Sin rayado diagonal ni tarjetas decorativas.

### Approval Panel

**Role:** Decidir una compra que supera el umbral.

Dos paneles: lista de decisiones a la izquierda (360 px) y detalle a la derecha. El detalle muestra el monto, el proveedor, la justificación del agente y el resumen de impacto; Aprobar y Rechazar siempre visibles. La firma criptográfica y el JSON van detrás de "Ver detalle técnico".

### Reasoning Step List

**Role:** Cómo razonó el agente, paso a paso.

Filas con ícono de estado (completado, en curso, descartado), etiqueta del paso y descripción en una línea. Al abrir una decisión los pasos aparecen en secuencia una sola vez, con 120 ms de desfase como máximo. No hay animaciones en bucle.

### Simulation Slider

**Role:** Probar un escenario antes de decidir.

Deslizador de cantidad o de umbral que recalcula en vivo el costo, la cobertura en días y el ahorro. Pista en `--color-raised`, relleno en `--color-brand`, valores en cifras tabulares. Sirve en Aprobaciones y en Reglas y políticas.

### Segmented Tabs

**Role:** Cambiar entre vistas relacionadas de un mismo destino.

Contenedor `--radius-pill` en `--color-panel` con filete `--color-border`. La pestaña activa usa `--color-raised` y texto `--color-text-primary`; las inactivas, `--color-text-secondary`. Aquí se alojan las subpestañas de cada destino.

### Input

**Role:** Campos de texto, búsqueda y filtros.

Fondo `--color-panel`, filete `--color-border-strong`, radio `--radius-control`, altura de 36 px, texto `--text-body`. Foco con `--shadow-focus`. Error con filete `--color-state-error` y mensaje debajo que dice qué corregir.

### Dialog

**Role:** Confirmaciones y decisiones que interrumpen.

Fondo `--color-raised`, radio `--radius-container`, `--shadow-dialog`, ancho máximo de 32 rem. El título dice la acción ("Aprobar compra") y el botón principal repite el mismo verbo.

### Empty State

**Role:** Invitar a actuar cuando no hay datos.

Texto que explica qué falta y qué hacer, con una acción. Puede usar `--gradient-entry-grid` y la nube del agente. Nunca disculpas ni humor.

### Agent Presence

**Role:** El gesto memorable de Mint.

Nube de puntos con el contorno orgánico de la guanábana (con los puntos oscuros de su textura), en canvas 2D. Estados: reposo (casi quieta), leyendo (los puntos se agrupan hacia los datos), pensando (movimiento lento y continuo), mutando (un pulso de confirmación). Se usa grande en Inicio y en el Flujo del agente, mediana en el nodo principal del Mapa de conocimiento y como indicador de 24 px en la barra superior. Es la única animación ambiental de cada pantalla. Modo completo y modo ligero (menos partículas o versión estática); se activa el ligero si la ventana está en segundo plano o si el usuario activa "Reducir movimiento". Se respeta `prefers-reduced-motion`. Se mide y reporta el consumo de CPU de cada modo.

## Information Architecture

Siete destinos principales. Cada uno agrupa sus pantallas como subpestañas.

| Destino | Subpestañas |
|---|---|
| Inicio | Resumen del día, Lo que requiere tu atención, Actividad del agente |
| Aprobaciones | Pendientes, Historial de aprobaciones |
| Inventario | Existencias, Productos, Rutas y despachos |
| Compras | Órdenes, Proveedores |
| Agente | Flujo del agente, Mapa de conocimiento, Memoria, Historial de decisiones, Reglas y políticas |
| Reportes | Análisis |
| Ajustes | Empresa y sucursales, Integraciones, Canales y notificaciones, API y webhooks, Roles y permisos, General |

La navegación y las acciones disponibles cambian según el rol (administración de Mint, empresa o cliente de la empresa), pero el shell, los tokens y la voz son los mismos. El rol y la empresa activa siempre se muestran. Los roles no se diferencian por color.

Pantalla "Sistema UI y Componentes": solo en entorno de desarrollo, fuera de la navegación de producción.

## Layout

- **Shell:** barra lateral de 232 px, barra superior de 52 px, contenido a la derecha. Ventana mínima de 1100 px.
- **Anchos:** tablas a todo el ancho disponible; texto de lectura y notas a un máximo de 72 caracteres por línea.
- **Una tarea por pantalla:** cada vista responde primero "qué tengo que hacer aquí" y la acción principal queda visible sin desplazarse.
- **Inicio:** a un lado la nube del agente y un resumen narrativo del día; debajo, la cola "Lo que requiere tu atención" ordenada por urgencia y la actividad en vivo.
- **Mapa de conocimiento:** lienzo a pantalla completa con inspector flotante y un solo control de filtros.
- **Memoria:** vista de lectura de documento con los metadatos (estado, confianza, origen) en un panel aparte, no mezclados con el texto.
- **Entrada a la app:** único momento teatral. Titular grande, cuadrícula tenue y la nube protagonista; transición breve de 600 a 900 ms al entrar o cambiar de empresa.

## Copy

Español, minúscula tras la primera letra, verbos exactos en los botones y el mismo verbo en el aviso posterior ("Aprobar compra", luego "Compra aprobada"). Los nombres son de negocio, no de sistema.

| En lugar de | Se dice |
|---|---|
| HITL, bandeja HITL | Aprobaciones |
| Lienzo operativo | Flujo del agente |
| Knowledge Graph | Mapa de conocimiento |
| Bóveda de memoria | Memoria del agente |
| Auditoría y trazabilidad | Historial de decisiones |
| Umbral HITL | Compras que requieren tu aprobación |
| DAG, CDC, P95, ORM, nombres de archivos y de tablas | Nunca en pantalla; solo en "Ver detalle técnico" |

Los errores explican qué pasó y cómo corregirlo, sin disculpas. Los estados vacíos invitan a actuar.

## Do's and Don'ts

### Do

- Usa `--color-brand` solo para identidad, foco de teclado e indicador de selección; el botón principal es la píldora cálida `--color-action`.
- Muestra cada estado con símbolo, texto y color de la escala semántica, y nunca con el verde de marca.
- Agrupa con espacio y tipografía; usa un filete solo para separar regiones funcionales.
- Usa cifras tabulares en la fuente de interfaz y reserva `--font-mono` para identificadores.
- Mide el contraste de cualquier texto o color nuevo contra su superficie antes de adoptarlo (AA: 4,5:1; texto grande 3:1).
- Oculta el detalle técnico detrás de "Ver detalle técnico".
- Respeta `prefers-reduced-motion` y ofrece el modo ligero del agente.

### Don't

- No uses hex ni clases de color de librería (por ejemplo `emerald-*`) en componentes; todo sale de tokens.
- No uses texto menor a 12 px ni etiquetas en mayúsculas con espaciado.
- No pongas más de una acción principal en el mismo grupo ni dos botones principales juntos.
- No anides paneles ni uses tarjetas con el mismo radio para todo.
- No uses glow, `backdrop-blur` ni rayados diagonales; el único halo es el del agente.
- No uses escenas ancladas al scroll ni más de una animación ambiental por pantalla.
- No bloquees la selección de texto de los datos: SKU, órdenes y montos deben poder copiarse.
- No muestres cifras de relleno: si un dato no existe, usa un estado vacío claro o un ejemplo marcado como tal.
- No copies código, imágenes ni nombres de las plantillas de referencia.

## Imagery

Sin fotografía. El interés visual viene de la tipografía, el espacio vacío, la presencia del agente y los datos. El símbolo de guanábana y el wordmark se usan tal como están en el banner de Mint.

## References

Principios tomados de las referencias, no sus valores ni su código:

- **Modelhorizon (Kerrfield One):** un elemento central del que todo depende, un acento neutro cálido en vez de un color de marca para la acción principal, demo de razonamiento en secuencia y modo de GPU ligero.
- **Aigent:** actividad en vivo, anatomía de una ejecución, directorio de integraciones con filtros, deslizador de simulación.
- **Landa:** contención, jerarquía tipográfica clara y espacio vacío.
- **Flowcraft:** botón principal en píldora con círculo y flecha, chips de evento con métrica y franja de cifras separada por filetes.

Los borradores extraídos con RICOUI se usaron como punto de partida. Sus textos secundarios discretos (relaciones de contraste de 3,5 a 3,8) no cumplen AA y se reemplazaron.