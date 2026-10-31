# MINT — Estado del Proyecto y Pendientes (Roadmap)

Fecha de actualización: 31 de Octubre de 2026  
Rama activa: `unify/mint`

---

## 1. Estado Actual de la Infraestructura

- **Base de Datos:** PostgreSQL en contenedor Docker `ai_back_office_db` (puerto `5432`). Migraciones Drizzle aplicadas y consistentes con esquemas de inventario, decisiones, eventos telemétricos y canales.
- **Backend API Server:** Fastify con soporte SSE y WebSockets corriendo en puerto `3001` (`http://localhost:3001`).
- **Frontend Studio:** React 19 + Vite + Tailwind + Lucide Icons corriendo en puerto `3000` (`http://localhost:3000`).
- **Verificación de Tipos y Diseño:**
  - `npm run typecheck`: 0 errores en todos los workspaces.
  - `npm run design:check`: 100% de cumplimiento con las reglas y tokens de `Mint-DESIGN.md`.

---

## 2. Implementaciones Realizadas en esta Iteración

### A. Validez Real de Canales de Notificación con el Backend y `.env`
- **Diagnóstico y Sincronización:** Se ajustó el endpoint `GET /api/channels` y el componente `NotificationChannelsView.tsx` para reflejar con veracidad absoluta las credenciales disponibles en `.env`.
  - **Telegram Bot (Alertas Críticas):** Estado **Conectado** (`isActive: true`, `available: true`). Toma `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID` del entorno. El botón "Probar" despacha un mensaje real vía Telegram Bot API con reintento seguro ante caracteres especiales.
  - **Slack Corporativo:** Estado **Desconectado** (`isActive: false`, `available: false`). Switch desactivado con advertencia de `SLACK_WEBHOOK_URL` faltante en `.env`. La API rechaza pruebas no configuradas con HTTP 400 descriptivo.
  - **Correo Corporativo:** Estado **Desconectado** (`isActive: false`, `available: false`). Muestra requerimiento de `RESEND_API_KEY` o `SMTP_HOST`.
  - **WhatsApp Business API:** Estado **Desconectado** (`isActive: false`, `available: false`). Muestra requerimiento de `WHATSAPP_API_TOKEN`.
- **Fidelidad Visual Mint:** Se restauraron los 4 paneles completos con sub-caja well, KPI strip dinámico (`1 / 4 Activos`), etiquetas de eventos suscritos y switch con retroalimentación inmediata.

### B. Optimización del Módulo de Contexto y Llamadas a Grok (xAI)
- **Compresión de Ventana de Contexto (`contextManager.ts`):**
  - Reducción del presupuesto del coordinador de 7,000 a 3,500 tokens de entrada (`TOKEN_BUDGETS.COORDINATOR`), evitando facturación excesiva en bucles ReAct multi-paso.
  - Compactación de payloads de herramientas (`compactToolPayload`) de 900 a 350 tokens, reteniendo únicamente campos fácticos esenciales (`isSuccess`, `productId`, `stock`, `deficit`, `unitPrice`, etc.) y filtrando metadatos irrelevantes (`__v`, `updatedAt`, `rawQuery`).
  - Poda agresiva de rondas de herramientas anteriores: en pasos avanzados, los resultados de herramientas previas se sintetizan a resúmenes ligeros en lugar de retransmitir el JSON crudo.
- **Eliminación de Llamadas LLM Redundantes en Especialistas:**
  - `inventarioAgent`, `comprasAgent`, `logisticaAgent` y `auditoriaAgent` ahora resuelven sus análisis de forma 100% determinista sobre PostgreSQL (0 tokens consumidos).
  - El razonamiento con IA (`chatCompletion`) se centraliza exclusivamente en el Orquestador cuando se solicita deliberación estratégica, reduciendo hasta un 80% las peticiones al proxy/API de Grok.
  - Limitación de tokens de salida en agentes especializados a 150 tokens por respuesta diagnóstica.

---

## 3. Elementos Pendientes y Roadmap Futuro

1. **Credenciales Opcionales en Producción:**
   - Si se desea habilitar **Slack Corporativo**, agregar `SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...` en `.env`.
   - Si se desea habilitar **Correo Electrónico**, agregar `RESEND_API_KEY=re_...` o credenciales SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`) en `.env`.
   - Si se desea habilitar **WhatsApp Business**, agregar `WHATSAPP_API_TOKEN` y `WHATSAPP_PHONE_ID` en `.env`.
2. **Empaquetado de Escritorio Tauri (`packages/web/src-tauri`):**
   - El código de `packages/web` está listo para ser empaquetado como aplicación de escritorio nativa mediante `npm run tauri build` una vez instalado Rust y las dependencias de compilación del sistema operativo.
3. **Métricas en Vivo de FinOps:**
   - Integrar un widget de visualización de gasto acumulado diario en USD/COP en `SettingsView.tsx` basado en los registros de la tabla `llm_calls` y el histórico de tokens cacheados.
