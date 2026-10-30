# Mint Design System v2 — Documento Maestro de Diseño (DESIGN.md)

Este documento es la **única fuente de verdad** estética, estructural y técnica para el software de escritorio de **Mint — Back Office Autónomo** (Guanábana Labs, Tauri + React + Vite + Tailwind v3).

Sustituye y anula cualquier especificación previa. Todas las pantallas, componentes y estilos deben alinearse al 100% con este sistema.

---

## 1. Principios Rectores de Diseño

1. **Modo oscuro suave, no "casi negro":** Fondo base verde-bosque profundo (`#0E1512`) con luminosidad balanceada para eliminar la fatiga ocular y evitar que el texto blanco vibre. Tres niveles de superficie como máximo (`canvas`, `panel`, `elevated`).
2. **Espacio sobre cajas:** Se agrupa mediante espaciado (grid de 8px) y jerarquía tipográfica, no encerrando cada dato en bordes o cajas anidadas. Un borde solo existe si separa regiones funcionales distintas (`border-subtle`).
3. **El verde de marca NO es el verde de estado "ok":**
   * **Marca Mint:** Guanábana Lima (`#A3E635`) con degradé a esmeralda (`#10B981`) reservado exclusivamente para la identidad, foco accesible y la presencia del agente.
   * **Semáforo Operacional:** Estados con su propia escala semántica (Teal, Ámbar, Coral, Índigo, Pizarra), acompañados obligatoriamente de **símbolo geométrico + etiqueta en texto**.
4. **Un solo gesto memorable:** La presencia viva del agente mediante la **nube de partículas de la guanábana (Canvas 2D)** en Inicio y en el Flujo del agente. El resto de la aplicación es silenciosa, utilitaria y de alta densidad.
5. **Acción principal en píldora blanca táctil:** El botón de mayor jerarquía de la pantalla es blanco puro (`#FFFFFF`) con texto oscuro y círculo con flecha (`→`), concentrando el foco visual sin contaminar los estados de salud.
6. **Lenguaje de negocio humano:** Erradicación total de acrónimos técnicos (`DAG`, `CDC`, `P95`, `HITL`, `Temp 0.1`, `Drizzle ORM`). Hablamos de *Aprobaciones*, *Punto de reorden*, *Tiempo de respuesta* y *Supervisión ejecutiva*.
7. **Selección y copia nativa:** Queda prohibido `select-none` en áreas de datos. El usuario puede seleccionar y copiar libremente códigos de orden, SKUs y montos.

---

## 2. Paleta de Color & Superficies (WCAG AA / AAA)

### A. Superficies
| Token | Variable CSS | Hex | Luminancia ($L$) | Rol Funcional |
| :--- | :--- | :--- | :--- | :--- |
| `canvas` | `--canvas` | `#0E1512` | 0.0068 | Fondo de ventana y lienzo base. |
| `panel` | `--panel` | `#141E1A` | 0.0123 | Paneles de contenido, tablas, navegación lateral. |
| `elevated` | `--elevated` | `#1C2823` | 0.0205 | Menús contextuales, tooltips, modales, filas seleccionadas. |
| `border-subtle` | `--border-subtle` | `rgba(255,255,255,0.07)` | — | Línea de división estructural de 1px. |
| `border-bright` | `--border-bright` | `rgba(255,255,255,0.15)` | — | Bordes en hover y división activa. |

### B. Jerarquía Tipográfica y Contraste WCAG 2.1
| Token | Variable CSS | Hex | Contraste vs Canvas (`#0E1512`) | Contraste vs Panel (`#141E1A`) | Cumplimiento |
| :--- | :--- | :--- | :---: | :---: | :---: |
| `text-primary` | `--text-primary` | `#F2F5F3` | **16.86 : 1** | **15.55 : 1** | **AAA** (> 7:1) |
| `text-secondary`| `--text-secondary` | `#A8BCB1` | **9.25 : 1** | **8.53 : 1** | **AAA** (> 7:1) |
| `text-tertiary` | `--text-tertiary` | `#859A8E` | **6.18 : 1** | **5.70 : 1** | **AA** (> 4.5:1) |

*Prohibido cualquier texto secundario con contraste inferior a 4.5:1.*

### C. Identidad de Marca Mint
| Token | Variable CSS | Hex | Uso Exclusivo |
| :--- | :--- | :--- | :--- |
| `brand-lime` | `--brand-lime` | `#A3E635` | Guanábana Lima: logotipo, halo del agente, foco de teclado, acento insignia. |
| `brand-emerald`| `--brand-emerald` | `#10B981` | Verde menta vegetal de transición. |
| `brand-deep` | `--brand-deep` | `#0B4632` | Tono profundo para fondos de marca en reposo. |

### D. Escala Semántica de Estados (Desvinculada de la Marca)
| Estado | Símbolo | Token / Color | Hex | Fondo Badge | Borde Badge | Contraste vs Panel |
| :--- | :---: | :--- | :--- | :--- | :--- | :---: |
| **Correcto** | `●` | `state-ok` (Teal) | `#2DD4BF` | `rgba(45,212,191,0.10)` | `rgba(45,212,191,0.25)` | **9.17 : 1** |
| **Atención** | `▲` | `state-attention` (Ámbar) | `#FBBF24` | `rgba(251,191,36,0.10)` | `rgba(251,191,36,0.25)` | **10.22 : 1** |
| **Error** | `■` | `state-error` (Coral) | `#F87171` | `rgba(248,113,113,0.10)` | `rgba(248,113,113,0.25)` | **6.17 : 1** |
| **Pendiente**| `◆` | `state-pending` (Índigo) | `#818CF8` | `rgba(129,140,248,0.10)` | `rgba(129,140,248,0.25)` | **5.72 : 1** |
| **En curso** | `◌` | `state-progress` (Pizarra)| `#94A3B8` | `rgba(148,163,184,0.10)` | `rgba(148,163,184,0.25)` | **6.66 : 1** |

---

## 3. Tipografía & Fuentes Empaquetadas

* **Fuentes Locales:** `@fontsource/plus-jakarta-sans` y `@fontsource/ibm-plex-mono` (cero CDN, funcionamiento offline garantizado).
* **Tamaño mínimo absoluto:** **12px** (solo para metadatos, marcas temporales y badges). Prohibido `text-[8px]` a `text-[11px]`.
* **Cuerpo de texto base:** **14px** con interlineado **1.5 (21px)**.
* **Cero mayúsculas con tracking:** Todas las etiquetas se escriben en *sentence case* natural.
* **Monoespaciada exclusiva:** Únicamente para códigos de referencia (`SKU-ROT-001`, `PO-24A190`, `DEC-2026-0041`) y montos financieros alineados (`tabular-nums`).

| Token | Tamaño | Interlineado | Peso | Uso Funcional |
| :--- | :--- | :--- | :--- | :--- |
| `text-display` | 24px (1.5rem) | 32px | Bold (700) | Encabezado principal de vista (1 por pantalla). |
| `text-title` | 18px (1.125rem)| 26px | SemiBold (600) | Títulos de panel o secciones mayores. |
| `text-subtitle` | 15px (0.9375rem)| 22px | Medium (500) | Subtítulos de sección y resúmenes ejecutivos. |
| `text-body` / `text-base` | 14px (0.875rem)| 21px | Regular / Medium | **Cuerpo general, filas de tabla, celdas y botones.** |
| `text-caption` / `text-xs`| 12px (0.75rem) | 18px | Medium (500) | **Mínimo absoluto:** badges, timestamps, metadatos. |

---

## 4. Jerarquía de Radios (Solo 3)

1. `rounded-control` (**8px**): Inputs, selectores, botones secundarios y celdas interactivas.
2. `rounded-panel` (**16px**): Paneles principales, tablas, cuadros de diálogo y modales.
3. `rounded-pill` (**9999px**): Botón principal insignia blanco, badges de estado semántico y avatares.

---

## 5. Arquitectura de Navegación (7 Destinos Principales)

Reducción estricta de 18 a 7 opciones de negocio organizadas por tarea:

1. **Inicio** (`/inicio`): Resumen ejecutivo del día en lenguaje natural + cola de *"Lo que requiere tu atención"*.
2. **Aprobaciones** (`/aprobaciones`): Bandeja ejecutiva de decisiones a 2 paneles (lista a la izquierda, detalle a la derecha).
3. **Inventario** (`/inventario`): Tablas densas de stock por bodega, punto de reorden (ROP) y cuarentena.
4. **Compras** (`/compras`): Libro mayor de órdenes emitidas, recepciones y directorio de proveedores homologados.
5. **Agente** (`/agente`): Presencia viva de la guanábana en Canvas, bitácora narrativa de acciones y mapa interactivo.
6. **Reportes** (`/reportes`): Valorización de inventario, compresión de capital de trabajo y auditoría inmutable.
7. **Ajustes** (`/ajustes`): Políticas de gobernanza, canales de notificación (Telegram, email) y conectores ERP.

*Se elimina "Sistema UI & Componentes" de la barra de producción.*

---

## 6. Prohibiciones Estrictas de Código

1. **Cero hex en `className`:** Ningún `#10B981`, `#0A0F0D` o `#111915` hardcodeado. Todo proviene de tokens semánticos (`bg-canvas`, `bg-panel`, `bg-elevated`, `text-primary`, etc.).
2. **Cero clases `emerald-*`:** Se reemplazan por la semántica adecuada (`state-ok`, `brand-lime`, `border-subtle`).
3. **Cero brillos (`glow`) ni `backdrop-blur`:** La app es mate, limpia y táctil. Cero rayados diagonales (`bg-hatched-*`).
4. **Cero `select-none` en datos:** La selección de texto es libre.
5. **Cero jerga técnica visible:** Prohibido mostrar `DAG`, `CDC`, `P95`, `HITL`, `Temp 0.1`, `Drizzle ORM` o nombres de archivo `.ts`.
