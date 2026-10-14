# Mint Platform — Consola Web del Agente AI Back Office

<p align="center">
  <img src="../resources/img/bannerIcon.png" alt="Mint Logo" width="100%" />
</p>

> **Consola Web de Operaciones y Control Human-in-the-Loop** para el agente autónomo de back office **MINT**, diseñada bajo una estética premium *Glassmorphism*, micro-animaciones fluidas e integración en tiempo real con la API de Fastify.

---

## 🚀 Tecnologías y Librerías

- **Framework Core:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Empaquetador & Servidor de Desarrollo:** [Vite 6](https://vitejs.dev/)
- **Estilos & Diseño:** [Tailwind CSS v4](https://tailwindcss.com/) + CSS Variables personalizadas
- **Animaciones y Físicas:** [Framer Motion](https://www.framer.com/motion/) con curvas de aceleración inspiradas en Emil Kowalski
- **Visualización de Datos:** [Recharts](https://recharts.org/) (gráficas de rendimiento de entregas por proveedor)
- **Componentes UI y Accesibilidad:**
  - [@radix-ui/react-tooltip](https://www.radix-ui.com/primitives/docs/components/tooltip) para tooltips interactivos
  - [cmdk](https://cmdk.paco.me/) para la paleta de comandos global (`⌘K` / `Ctrl+K`)
  - [Sonner](https://sonner.emilkowal.ski/) para notificaciones Toast de alta fidelidad
  - [Vaul](https://vaul.emilkowal.ski/) para cajones modales inferiores (Drawers)
  - [Lucide React](https://lucide.dev/) para iconografía consistente

---

## 🖥️ Módulos y Vistas Disponibles

### 1. `LoginView` (Acceso Seguro)
- Pantalla de inicio de sesión con el imagotipo oficial de la hoja y el logotipo estilizado de **Mint**.
- Físicas de movimiento elásticas, efectos de resplandor ambiental (*ambient glow*) y formulario validado.

### 2. `DashboardView` (Panel Operativo y KPIs)
- **Métricas Clave:**
  - Órdenes Totales procesadas
  - Porcentaje de Automatización
  - Revisiones Pendientes de Aprobación
  - Ahorro Financiero Acumulado (MXN/USD)
  - Gasto en Inferencia de IA
- **Gráfica de Rendimiento de Proveedores:** Tiempos de entrega vs. calidad de despacho.
- **Acciones Rápidas:** Disparo de auditorías, generación de reportes y revisión de stock crítico.

### 3. `ApprovalsView` (Gobernanza Human-in-the-Loop)
- Bandeja de entrada con compras y órdenes que superan el límite de riesgo ($10,000 MXN) o presentan advertencias.
- Permite a los supervisores examinar el desglose financiero y autorizar o denegar cada orden en 1 solo clic (`POST /api/approvals/:id`).

### 4. `AgentConsole` (Chat y Asistente Autónomo)
- Interfaz conversacional directa con el agente MINT.
- Píldoras de sugerencias rápidas (*"Consultar productos sin stock"*, *"Ver rendimiento logístico"*, etc.).
- Indicador visual de estado de ejecución (`Agente Activo`, `Pensando`, `Ejecutando Herramienta`, `Resuelto`, `Escalado`).
- Desglose de tokens consumidos y costo en dólares por caso.

### 5. `StockView` (Explorador de Base de Datos / Inventario)
- Tabla de datos interactiva que mapea el catálogo de 16 SKUs, almacenes (Central, Refrigerado, Norte) y niveles de existencias.
- Marcadores de estado visual: Stock saludable, por reabastecer, crítico (agotado) y fechas de caducidad.

### 6. `Activity Timeline` (Línea de Tiempo del Sistema)
- Registro cronológico de auditoría que sustituye la terminal tradicional por un feed visual de eventos del sistema.

### 7. Paleta de Comandos (`⌘K` / `Ctrl+K`)
- Búsqueda instantánea de órdenes, proveedores, productos y navegación directa entre módulos.

---

## 📡 Conectividad con el Backend

El frontend se conecta con el servidor Fastify alojado por defecto en `http://localhost:3001`:

| Endpoint | Método | Función |
|:---|:---|:---|
| `/api/chat` | `POST` | Envío de mensajes para disparar el bucle ReAct del agente |
| `/api/dashboard` | `GET` | Recuperación de métricas consolidadas y métricas de proveedores |
| `/api/approvals` | `GET` | Consulta de la cola de compras pendientes de aprobación |
| `/api/approvals/:id` | `POST` | Resolución de solicitudes (aprobar o rechazar) |
| `/api/v1/alerts/proactive` | `GET` | Lectura de alertas proactivas emitidas por el worker |

---

## 🛠️ Comandos de Desarrollo

```bash
# Instalar dependencias
npm install

# Iniciar servidor local de desarrollo
npm run dev

# Compilar para producción (validación de tipos TypeScript + build Vite)
npm run build

# Previsualizar el build de producción
npm run preview

# Ejecutar linter ultrarrápido con Oxlint
npm run lint
```
