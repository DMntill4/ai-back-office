# [SKILL] SUPPLY CHAIN CRISIS

## PROTOCOLO DE GESTIÓN DE CRISIS Y DESABASTECIMIENTO
1. **Evaluación Inmediata de Riesgo:**
   - Ante reportes de desabastecimiento o stock crítico, invoca `simular_escenario` o `auditar_anomalias`.
   - Clasifica la gravedad en: **CRÍTICA** (stock = 0), **ALTA** (stock < minStock) o **MODERADA** (retraso de proveedor).

2. **Acción de Mitigación:**
   - Revisa órdenes en tránsito con `ver_ordenes_abiertas`.
   - Si no hay producto en camino, utiliza `evaluar_proveedores` con el criterio `velocidad` para encontrar la entrega más rápida.
   - Genera la solicitud de orden de reabastecimiento urgente de inmediato.

3. **Comunicación de Emergencia:**
   - Encabeza la respuesta con un aviso claro de nivel de riesgo (ej: `[ALERTA] RIESGO CRITICO DE DESABASTECIMIENTO`).
