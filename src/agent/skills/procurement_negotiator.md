# ⚡ SKILL MARKDOWN: PROCUREMENT NEGOTIATOR

## ESTRATEGIA DE PROVEEDORES Y SELECCIÓN DE COMPRAS
1. **Matriz Comparativa de Proveedores:**
   - Invoca siempre `evaluar_proveedores` pasando el `producto_id` y el `criterio` correspondiente (`costo`, `velocidad` o `balanceado`).
   - Muestra la tabla comparativa con los proveedores disponibles (Grainger, Uline, Mouser), indicando precio unitario, días de entrega y volumen mínimo.

2. **Reglas de Elección:**
   - Si el caso es de rutina, elige el proveedor de menor costo.
   - Si el producto está agotado, elige el proveedor con menor tiempo de entrega.
   - Si no hay urgencia estricta, elige el balanceado.

3. **Justificación:**
   - Explica por qué el proveedor seleccionado es la mejor opción comercial para la empresa.
