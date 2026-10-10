# Handoff Tecnico para el Equipo: AI Back Office (MINT)

Documento de transferencia tecnica y arquitectura de las funcionalidades implementadas en la plataforma AI Back Office Agent (MINT).

---

## 1. Resumen de Cambios Principales

Durante esta iteracion se transformo el agente de un asistente conversacional basico a un sistema autonomo de coordinacion logistica, compras y control financiero, con persistencia cloud en Supabase y una arquitectura desacoplada lista para conexion con frontend.

### Principales Logros:
1. **Migracion a Base de Datos Cloud (Supabase):**
   - Base de datos PostgreSQL alojada en la nube 24/7 con soporte automatico para conexiones SSL.
   - Eliminacion de la dependencia obligatoria de Docker Desktop local.
   - Tablas relacionales migradas y protegidas con triggers inmutables en `case_events`.

2. **Catalogo Logistico Extendido (Seed de 16 SKUs):**
   - Insercion de 16 productos reales organizados en 3 almacenes (Central, Refrigerado y Norte).
   - Casos de prueba reales: 5 productos con stock 0 (agotados), productos con carencia critica (stock menor al minimo de seguridad), perecederos proximos a caducar (en 2 y 3 dias) y productos de alta rotacion.
   - Directorio de 5 proveedores reales con matrices de costos, tiempos de entrega y volumenes minimos de pedido.

3. **Arquitectura de Superpoderes e Inyeccion Dinamica de Skills:**
   - Creacion del motor `src/agent/superpowers.ts` que clasifica la intencion de la consulta e inyecta reglas de dominio experto al prompt del sistema.
   - Modulos de directivas en archivos Markdown puros en `src/agent/skills/`.

4. **Nuevas Herramientas Ejecutables de Negocio:**
   - `simular_escenario`: Simulacion de escenarios logísticos ante incrementos porcentuales de demanda o retrasos de proveedores.
   - `auditar_anomalias`: Deteccion de descalces de inventario y sobrecostos en proveedores.
   - `evaluar_proveedores`: Matriz comparativa de proveedores por costo, velocidad o balance general.
   - `analisis_financiero`: Valuacion total de stock, compromisos en compras abiertas y proyeccion presupuestaria a 30 dias.
   - `generar_reporte_general`: Reportes agregados de productos mas vendidos, sin stock, por renovar y por caducar con soporte para SQL relacional y modo hibrido.

5. **Motor de Alertas Proactivas en Standby para Frontend:**
   - Worker en segundo plano `src/worker/proactiveMonitor.ts` con bus de eventos (Node EventEmitter).
   - Endpoints en Fastify (`GET /api/v1/alerts/proactive` y `POST /api/v1/alerts/trigger-audit`) listos para ser consumidos por el cliente web o dashboard sin acoplamiento a terceros.

6. **Organizacion y Limpieza del Repositorio:**
   - Reubicacion de scripts dispersos hacia `scripts/clear-db.ts` y nuevo comando `npm run db:reset`.
   - Modulo centralizado de seguridad en `config/security/.env.example`.

---

## 2. Estructura de Archivos Nuevos y Modificados

```text
ai-back-office/
├── config/
│   └── security/
│       └── .env.example              # Plantilla centralizada de entorno
├── docs/
│   ├── HANDOFF_TEAM.md               # Este documento de transferencia
│   ├── REPORTE_TECNICO.md            # Reporte tecnico de arquitectura actualizado
│   └── ...
├── scripts/
│   ├── chat.ts                       # Terminal interactiva CLI con detector de Superpoderes
│   └── clear-db.ts                   # Truncado seguro de tablas relacionales
├── src/
│   ├── agent/
│   │   ├── prompts/
│   │   │   └── base.md               # Prompt core del sistema con razonamiento multi-herramienta
│   │   ├── skills/
│   │   │   ├── executive_analytics.md
│   │   │   ├── financial_maestro.md
│   │   │   ├── procurement_negotiator.md
│   │   │   ├── security_guardrails.md
│   │   │   └── supply_chain_crisis.md
│   │   ├── superpowers.ts            # Detector e inyector de contexto de Superpoderes
│   │   └── toolsDefinition.ts        # Catalogo tipado y dispatcher de herramientas
│   ├── config/
│   │   └── env.ts                    # Validacion Zod de variables de entorno y fallback de API keys
│   ├── db/
│   │   ├── client.ts                 # Cliente PostgreSQL con deteccion automatica de SSL
│   │   └── seed/
│   │       └── index.ts              # Sembrado masivo de 16 SKUs, 5 proveedores y 3 almacenes
│   ├── llm/
│   │   └── client.ts                 # Cliente Grok con supresion de logs ruidosos y telemetria
│   ├── server.ts                     # Servidor Fastify con endpoints de chat y alertas proactivas
│   ├── tools/
│   │   ├── analisisFinanciero.ts
│   │   ├── auditarAnomalias.ts
│   │   ├── crearOrdenCompra.ts
│   │   ├── evaluarProveedores.ts
│   │   ├── reportesGenerales.ts
│   │   └── simularEscenario.ts
│   └── worker/
│       └── proactiveMonitor.ts       # Worker de monitoreo proactivo y bus de eventos
└── tests/                            # Suite completa de 20 pruebas unitarias en Vitest
```

---

## 3. Instrucciones de Ejecucion para el Equipo

### Requisitos Previos:
- Node.js version 20 o superior.
- Archivo `.env` configurado con las siguientes variables:
  ```env
  DATABASE_URL=postgresql://postgres.[ID_PROYECTO]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
  RETO_KEY=pk_...
  GROK_BASE_URL=https://api.reto.pltk.mx/v1
  GROK_MODEL=grok-4.6
  PORT=3001
  ```

### Comandos de Utilidad:
1. **Ejecutar Pruebas Automatizadas:**
   ```bash
   npm test
   ```
   Verifica que los 20 tests se encuentren en estado exitoso.

2. **Aplicar Migraciones en Base de Datos:**
   ```bash
   npm run db:migrate
   ```

3. **Sembrar Catalogo Extendido en Supabase:**
   ```bash
   npm run db:seed
   ```

4. **Iniciar Terminal Interactiva CLI:**
   ```bash
   npm run chat
   ```

5. **Iniciar Servidor Fastify (API Backend):**
   ```bash
   npm run server
   ```

---

## 4. Estado de las Pruebas y Cobertura
- 8 archivos de prueba ejecutados con Vitest.
- 20 de 20 pruebas aprobadas exitosamente (100% verde).
- Cobertura completa de escenarios de negocio: reposicion idempotente, control de compras que exceden $10,000 MXN, escalamiento ante inconsistencias y blindaje de inmutabilidad en base de datos.
