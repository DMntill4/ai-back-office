# MINT — Visión de Producto, Seguridad Empresarial, Memoria Epistémica, Autonomía Real y QA End-to-End (Partes 1, 2 y 3)

**Fecha de actualización:** 6 de noviembre de 2026 (CDMX `America/Mexico_City`)  
**Rama activa:** `developGuerra`

---

## 1. Problemas Estructurales Identificados y Corregidos (Auditoría Crítica de Construcción — Parte 2 Sección 20)

Siguiendo la directiva de desafiar la implementación previa y no asumir que algo funciona solo por existir en el código, se identificaron y corrigieron **5 contradicciones críticas** entre la visión de producto y la implementación:

### Problema 1: Bypass de Autenticación y Escalamiento de Privilegios sin Autorización (`/api/auth/login` y `/api/session`)
1. **Qué estaba mal:**
   - En [`packages/api/src/routes/auth.ts`](file:///c:/Users/andre/OneDrive/Escritorio/proyectos/PLATICA/ai-back-office/packages/api/src/routes/auth.ts), si `loginUser` fallaba (por contraseña inválida o cuenta inexistente), el endpoint caía en un bloque `// Demo / Offline fallback garantizado` que devolvía `success: true`, un token válido y el rol `owner` de `currentSession`.
   - En [`packages/core/src/services/authAndSetupService.ts`](file:///c:/Users/andre/OneDrive/Escritorio/proyectos/PLATICA/ai-back-office/packages/core/src/services/authAndSetupService.ts), `loginUser` solo verificaba la contraseña si `input.password` era enviado (`if (input.password && !verifyPassword(...))`), permitiendo iniciar sesión enviando un password vacío.
   - Además, `POST /api/session` permitía a cualquier cliente enviar `{"role": "owner"}` y sobrescribir `currentSession.role` sin validar permisos ni membresía.
2. **Por qué importa:**
   - Un cajero o colaborador externo podía ingresar una contraseña errónea o invocar `/api/session` para obtener privilegios de `owner` y ejecutar operaciones destructivas o aprobar sus propias compras.
3. **Comportamiento esperado:**
   - Credenciales inválidas o vacías deben rechazarse con HTTP `401`, registrar un incidente `INTENTO_ACCESO_FALLIDO` en `audit_incidents` y jamás otorgar una sesión por defecto.
   - `POST /api/session` debe bloquear cualquier intento de auto-escalamiento de rol desde un rol no privilegiado, registrando `VIOLACION_RBAC` y verificando pertenencia a la organización (`users.companyId`).
4. **Cambios implementados:**
   - Se eliminó el fallback de login falso en [`packages/api/src/routes/auth.ts`](file:///c:/Users/andre/OneDrive/Escritorio/proyectos/PLATICA/ai-back-office/packages/api/src/routes/auth.ts).
   - Se reforzó [`loginUser`](file:///c:/Users/andre/OneDrive/Escritorio/proyectos/PLATICA/ai-back-office/packages/core/src/services/authAndSetupService.ts) para exigir contraseña válida siempre que exista `passwordHash`, bloquear cuentas con rol `revoked`, y registrar `AUTH_LOGIN_SUCCESS` / `INTENTO_ACCESO_FALLIDO`.
   - Se incorporaron los roles empresariales completos (`owner`, `admin`, `manager`, `supervisor`, `cashier`, `inventory_operator`, `logistics_operator`, `operator`, `driver`, `finance`, `auditor`, `viewer`, `client`, `revoked`), revocación inmediata (`revokeTeamMemberAccess`) y transferencia de propiedad (`transferOrganizationOwnership`) en [`packages/core/src/services/teamService.ts`](file:///c:/Users/andre/OneDrive/Escritorio/proyectos/PLATICA/ai-back-office/packages/core/src/services/teamService.ts).
5. **Verificación:**
   - Probado en [`tests/part2_enterprise_security_memory_and_vision.test.ts`](file:///c:/Users/andre/OneDrive/Escritorio/proyectos/PLATICA/ai-back-office/tests/part2_enterprise_security_memory_and_vision.test.ts) (Test 2) y en CLI con `--role cashier`.

---

### Problema 2: Organización Ficticia por Defecto (`"Ferretería Industrial Santandereana S.A.S."`) y Salud Falsa del `100% (ÓPTIMO)` sin Datos Conectados
1. **Qué estaba mal:**
   - `auth.ts` inicializaba `currentSession` con la empresa ficticia `"Ferretería Industrial Santandereana S.A.S."` (`setupCompleted: true`).
   - En [`packages/core/src/services/readinessDiagnosticService.ts`](file:///c:/Users/andre/OneDrive/Escritorio/proyectos/PLATICA/ai-back-office/packages/core/src/services/readinessDiagnosticService.ts), el cálculo de salud partía de `100` y clasificaba `productsCount === 0` únicamente como `faltantes` (sin restar puntos), provocando que `mint doctor` mostrara `Estado General: ÓPTIMO (100% salud)` cuando había `0 productos, 0 proveedores, 0 bodegas, 0 envíos`.
2. **Por qué importa:**
   - Contradice directamente las Secciones 4 y 11 de la Parte 2: MINT jamás debe confundir un entorno sin configurar con una empresa real ni mostrar porcentajes de salud falsos cuando no hay datos de negocio conectados.
3. **Comportamiento esperado:**
   - Clasificar explícitamente el estado del ciclo de vida del entorno: `FIRST_TIME_INSTALLATION`, `UNCONFIGURED_ENVIRONMENT`, `NEW_ORGANIZATION`, `CONNECTED_BUSINESS_DATA`, `OPERATIONALLY_ACTIVE_ORGANIZATION`, `DEMO_SANDBOX_ENVIRONMENT`.
   - Si una organización tiene `0 productos`, la salud verificada debe ser `0%` (entorno no configurado) o `25%` (organización recién registrada sin catálogo), con estado `ATENCION` y hallazgo `BLOQUEANTE`.
4. **Cambios implementados:**
   - Se actualizó [`generateReadinessReport`](file:///c:/Users/andre/OneDrive/Escritorio/proyectos/PLATICA/ai-back-office/packages/core/src/services/readinessDiagnosticService.ts) y [`packages/cli/src/commands/doctor.ts`](file:///c:/Users/andre/OneDrive/Escritorio/proyectos/PLATICA/ai-back-office/packages/cli/src/commands/doctor.ts) para calcular `environmentLifecycleState` e impedir puntajes `OPTIMA` sin datos reales.
5. **Verificación:**
   - Probado en `tests/part2_enterprise_security_memory_and_vision.test.ts` (Test 1) y ejecutando `npx tsx packages/cli/src/index.ts doctor`.

---

### Problema 3: Memoria Operativa sin Certeza Epistémica, sin Reemplazo Semántico por Entidad ni Detección de Contradicciones con la BD
1. **Qué estaba mal:**
   - `saveOperationalMemory` solo reemplazaba registros si el `subjectKey` era idéntico carácter por carácter, no distinguía entre hechos confirmados, preferencias o suposiciones de IA, ni verificaba si una regla en memoria contradecía la tabla autoritativa `products`.
2. **Por qué importa:**
   - Cuando el cliente dice *"Normalmente pedimos Coca-Cola al Proveedor A"* y luego dice *"Cambiamos de proveedor para Coca-Cola, ahora usamos el Proveedor B"*, MINT debe marcar la directiva del Proveedor A como `OUTDATED`, conservar su historial y detectar cualquier discrepancia con `products.minStock`.
3. **Cambios implementados:**
   - En [`packages/core/src/services/autonomousIntelligenceService.ts`](file:///c:/Users/andre/OneDrive/Escritorio/proyectos/PLATICA/ai-back-office/packages/core/src/services/autonomousIntelligenceService.ts) se añadieron niveles epistémicos (`CONFIRMED_FACT`, `HISTORICAL_RECORD`, `USER_PREFERENCE`, `AI_ASSUMPTION`, `PREDICTION`, `OUTDATED`, `UNVERIFIED`), reemplazo semántico por tokens de entidad dentro de la misma categoría y `getOperationalMemoryWithEpistemicAudit(companyId)` para detectar contradicciones contra la base de datos.
4. **Verificación:**
   - Probado en `tests/part2_enterprise_security_memory_and_vision.test.ts` (Test 4).

---

### Problema 4: Gobernanza HITL, Cancelación Automática de Propuestas Vencidas y Trazabilidad de 7 Preguntas
1. **Qué estaba mal:**
   - Las propuestas vencidas (`expiresAt < now`) solo se rechazaban si alguien intentaba aprobarlas manualmente, y faltaba un reporte consolidado que respondiera las 7 preguntas de auditoría de gobernanza (Sección 2).
2. **Cambios implementados:**
   - Se implementaron `sweepExpiredProposalsAndOverdueTasks(companyId)` y `getActionProvenanceReport(companyId, decisionId)` en [`packages/core/src/services/autonomousIntelligenceService.ts`](file:///c:/Users/andre/OneDrive/Escritorio/proyectos/PLATICA/ai-back-office/packages/core/src/services/autonomousIntelligenceService.ts), respondiendo con evidencia real: `whoRequested`, `whoAuthorized`, `whatMintDid`, `whenItHappened`, `whatInformationJustifiedIt`, `wasOperationSuccessful` y `canItBeReversed`.
3. **Verificación:**
   - Probado en `tests/part2_enterprise_security_memory_and_vision.test.ts` (Test 3).

---

### Problema 5: Respaldos Verificados en Disco con SHA-256 y Continuidad Operativa
1. **Qué estaba mal:**
   - Faltaba un servicio de respaldo y restauración con verificación criptográfica en disco y control RBAC para proteger contra pérdida de datos o revertir importaciones/alteraciones.
2. **Cambios implementados:**
   - Se implementaron `createVerifiedBusinessBackup` y `restoreVerifiedBusinessBackup` en [`packages/core/src/services/autonomousIntelligenceService.ts`](file:///c:/Users/andre/OneDrive/Escritorio/proyectos/PLATICA/ai-back-office/packages/core/src/services/autonomousIntelligenceService.ts), verificando el archivo en disco mediante hash SHA-256 antes de confirmar su existencia y exigiendo rol `owner` o `admin` para restaurar.
3. **Verificación:**
   - Probado en `tests/part2_enterprise_security_memory_and_vision.test.ts` (Test 5).
