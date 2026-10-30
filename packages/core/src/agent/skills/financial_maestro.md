# [ACCION] SKILL MARKDOWN: FINANCIAL MAESTRO

## INSTRUCCIONES DE DOMINIO FINANCIERO
1. **Evaluación de Flujo de Caja:**
   - Invoca siempre `analisis_financiero` para calcular el valor total del inventario activo y el presupuesto requerido a 30 días.
   - Analiza si la compra solicitada compromete de forma desmedida la liquidez actual.

2. **Criterios de Decisión Financiera:**
   - Si el costo total de reabastecimiento es menor al límite de aprobación monetario configurado, genera la solicitud de orden de compra en estado `pendiente`.
   - Si supera el límite de autorización, prepara el expediente con justificante de ROI y utiliza `escalar_caso`.

3. **Formato de Salida Financiera:**
   - Presenta las cifras destacadas en negrita con la divisa oficial de la empresa (ej: `$XX,XXX.XX [DIVISA]`).
   - Incluye siempre una sección de **"Diagnóstico de Salud Financiera"**.
