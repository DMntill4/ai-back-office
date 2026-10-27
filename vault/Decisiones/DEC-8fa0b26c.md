---
id: "dec_8fa0b26c"
tipo: "decision_agente"
fecha: "2026-10-27T16:49:49.614Z"
empresa: "comp_coca_cola"
caso: "case_bcf69df9"
agente: "compras_agent"
accion: "crear_orden_compra"
costo_estimado: 39.2
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

# Decision: [[dec_8fa0b26c]] - Reabastecimiento preventivo: 40u de Coca Cola Sin Azúcar 500ml PET
## Resumen Operativo
- **ID Decision**: `dec_8fa0b26c`
- **Caso Relacionado**: [[case_bcf69df9]]
- **Agente Proponente**: `compras_agent`
- **Tipo de Accion**: `crear_orden_compra`
- **Costo Estimado**: $39.2
- **Dictamen de Politica**: `pending_approval`
- **Motivo de Politica**: NEGATIVA POR DATOS DESACTUALIZADOS: No hay fuentes de datos externas registradas para esta empresa.. El agente rechaza decidir autónomamente y escala a revisión humana.
## Evaluacion de Riesgo y Seguridad
- **Nivel de Riesgo**: 0.05
- **Reversible**: No (Requiere aprobacion estricta)
## Evidencia y Contexto
```json
{
  "productId": "prod_coca_zero_500",
  "productName": "Coca Cola Sin Azúcar 500ml PET",
  "sku": "KO-500-ZER",
  "currentStock": 1,
  "minStock": 20,
  "deficit": 19,
  "burnRate": 1.4285714285714286,
  "daysCoverage": 0.7,
  "supplierId": "prov_femsa_coca",
  "supplierName": "FEMSA Distribución Logística",
  "unitPrice": 0.98,
  "leadTimeDays": 2,
  "freightCostMxn": 0,
  "landedCostMxn": 39.2,
  "quantity": 40,
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
- Registro de caso: [[Casos/case_bcf69df9|case_bcf69df9]]
