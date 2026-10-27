---
id: "quar_b00c6a7f"
tipo: "registro_cuarentena"
fecha: "2026-10-27T19:45:51.545Z"
empresa: "comp_default"
entidad: "products"
tabla_origen: "products"
identificador_registro: "SKU-ST200"
tipo_violacion: "invalid_price"
severidad: "ERROR"
tags:
  - mint
  - cuarentena
  - anomalia_datos
  - invalid_price
---

# Aislamiento en Cuarentena: [[quar_b00c6a7f]]

## Diagnostico de la Anomalia
- **Tabla Origen**: `products`
- **Entidad**: `products`
- **Identificador del Registro**: `SKU-ST200`
- **Tipo de Infraccion**: `invalid_price`
- **Severidad**: `ERROR`
- **Motivo**: Precio imposible o cero (null) en producto 'Sensor Térmico ST-200' (SKU-ST200)

## Carga Aislada (Payload Crudo)
```json
{
  "id": "prod_st200",
  "sku": "SKU-ST200",
  "price": null,
  "name": "Sensor Térmico ST-200"
}
```

## Accion de Proteccion
El registro fue aislado de las decisiones del agente autonomo para evitar decisiones sobre datos corrompidos.
La tabla del cliente permanece intacta y no ha sido alterada.

## Enlaces Relacionados
- Ver registro diario de auditoria: [[Auditoria/LOG-2026-10-27|LOG-2026-10-27]]
