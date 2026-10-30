---
id: "dec_cf84ead8"
tipo: "decision_agente"
fecha: "2026-10-29T15:14:56.418Z"
empresa: "comp_default"
caso: "case_f5c4fabf"
agente: "compras_agent"
accion: "crear_orden_compra"
costo_estimado: 3145
riesgo_score: 0.13
reversible: false
dictamen_politica: "pending_approval"
aprobado_por: "SISTEMA_AUTONOMO"
tags:
  - mint
  - decision
  - crear_orden_compra
  - pending_approval
---

# Decision: [[dec_cf84ead8]] - Reabastecimiento preventivo: 17u de Sensor de Temperatura Blindado PT-100
## Resumen Operativo
- **ID Decision**: `dec_cf84ead8`
- **Caso Relacionado**: [[case_f5c4fabf]]
- **Agente Proponente**: `compras_agent`
- **Tipo de Accion**: `crear_orden_compra`
- **Costo Estimado**: $3145
- **Dictamen de Politica**: `pending_approval`
- **Motivo de Politica**: NEGATIVA POR DATOS DESACTUALIZADOS: Datos desactualizados: El archivo origen de 'Daemon Watcher: daemon_incoming_stock.csv' tiene 142h de antigüedad en disco (umbral: 24h). Aunque se sincronice con frecuencia, el dato de origen es viejo.; El archivo origen de 'Inventario Planta Norte CSV' tiene 142h de antigüedad en disco (umbral: 24h). Aunque se sincronice con frecuencia, el dato de origen es viejo.. El agente rechaza decidir autónomamente y escala a revisión humana.
## Evaluacion de Riesgo y Seguridad
- **Nivel de Riesgo**: 0.13
- **Reversible**: No (Requiere aprobacion estricta)
## Evidencia y Contexto
```json
{
  "productId": "prod_f3_sensor_temp",
  "productName": "Sensor de Temperatura Blindado PT-100",
  "sku": "SKU-F3-TEMP",
  "currentStock": 3,
  "minStock": 20,
  "deficit": 17,
  "supplierId": "supp_fast_comp_default",
  "supplierName": "Distribuidora Express Industrial SA",
  "unitPrice": 185,
  "leadTimeDays": 1,
  "freightCostMxn": 0,
  "landedCostMxn": 3145,
  "quantity": 17,
  "dataFreshness": {
    "isFresh": false,
    "lastSyncedAt": "2026-10-29T15:14:55.025Z",
    "hoursSinceLastSync": 0,
    "sourceStatus": "STALE",
    "reason": "Datos desactualizados: El archivo origen de 'Daemon Watcher: daemon_incoming_stock.csv' tiene 142h de antigüedad en disco (umbral: 24h). Aunque se sincronice con frecuencia, el dato de origen es viejo.; El archivo origen de 'Inventario Planta Norte CSV' tiene 142h de antigüedad en disco (umbral: 24h). Aunque se sincronice con frecuencia, el dato de origen es viejo."
  },
  "delayedShipmentNotice": "Envío anterior con demora detectada en guía(s): MX-ESTAFETA-998877"
}
```
## Enlaces Relacionados
- Ver registro diario de auditoria: [[Auditoria/LOG-2026-10-29|LOG-2026-10-29]]
- Registro de caso: [[Casos/case_f5c4fabf|case_f5c4fabf]]
