---
id: "quar_e3b33baf"
tipo: "registro_cuarentena"
fecha: "2026-10-27T19:45:52.965Z"
empresa: "comp_default"
entidad: "products"
tabla_origen: "products"
identificador_registro: "MINT-SEN-002"
tipo_violacion: "invalid_price"
severidad: "ERROR"
tags:
  - mint
  - cuarentena
  - anomalia_datos
  - invalid_price
---

# Aislamiento en Cuarentena: [[quar_e3b33baf]]

## Diagnostico de la Anomalia
- **Tabla Origen**: `products`
- **Entidad**: `products`
- **Identificador del Registro**: `MINT-SEN-002`
- **Tipo de Infraccion**: `invalid_price`
- **Severidad**: `ERROR`
- **Motivo**: Precio imposible o cero (null) en producto 'Sensor Infrarrojo de Alta Precisión' (MINT-SEN-002)

## Carga Aislada (Payload Crudo)
```json
{
  "id": "prod_mint_sen_002",
  "sku": "MINT-SEN-002",
  "price": null,
  "name": "Sensor Infrarrojo de Alta Precisión"
}
```

## Accion de Proteccion
El registro fue aislado de las decisiones del agente autonomo para evitar decisiones sobre datos corrompidos.
La tabla del cliente permanece intacta y no ha sido alterada.

## Enlaces Relacionados
- Ver registro diario de auditoria: [[Auditoria/LOG-2026-10-27|LOG-2026-10-27]]
