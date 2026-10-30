---
id: "dec_ff46ccd7"
tipo: "decision_agente"
fecha: "2026-10-27T16:49:48.898Z"
empresa: "comp_coca_cola"
caso: "case_800351f5"
agente: "compras_agent"
accion: "crear_orden_compra"
costo_estimado: 40
riesgo_score: 0.05
reversible: false
dictamen_politica: "pending_approval"
aprobado_por: "SISTEMA_AUTONOMO"
tags:
  - mint
  - decision
  - crear_orden_compra
  - pending_approval
---

# Decision: [[dec_ff46ccd7]] - Reabastecimiento preventivo: 50u de Coca Cola Sabor Original 350ml Lata
## Resumen Operativo
- **ID Decision**: `dec_ff46ccd7`
- **Caso Relacionado**: [[case_800351f5]]
- **Agente Proponente**: `compras_agent`
- **Tipo de Accion**: `crear_orden_compra`
- **Costo Estimado**: $40
- **Dictamen de Politica**: `pending_approval`
- **Motivo de Politica**: NEGATIVA POR DATOS DESACTUALIZADOS: No hay fuentes de datos externas registradas para esta empresa.. El agente rechaza decidir autónomamente y escala a revisión humana.
## Evaluacion de Riesgo y Seguridad
- **Nivel de Riesgo**: 0.05
- **Reversible**: No (Requiere aprobacion estricta)
## Evidencia y Contexto
```json
{
  "productId": "prod_coca_350",
  "productName": "Coca Cola Sabor Original 350ml Lata",
  "sku": "KO-350-LAT",
  "currentStock": 4,
  "minStock": 25,
  "deficit": 21,
  "burnRate": 1.7857142857142858,
  "daysCoverage": 2.2399999999999998,
  "supplierId": "prov_femsa_coca",
  "supplierName": "FEMSA Distribución Logística",
  "unitPrice": 0.8,
  "leadTimeDays": 2,
  "freightCostMxn": 0,
  "landedCostMxn": 40,
  "quantity": 50,
  "dataFreshness": {
    "isFresh": false,
    "lastSyncedAt": null,
    "hoursSinceLastSync": null,
    "sourceStatus": "NO_SOURCES",
    "reason": "No hay fuentes de datos externas registradas para esta empresa."
  }
}
```
## Enlaces Relacionados
- Ver registro diario de auditoria: [[Auditoria/LOG-2026-10-27|LOG-2026-10-27]]
- Registro de caso: [[Casos/case_800351f5|case_800351f5]]
