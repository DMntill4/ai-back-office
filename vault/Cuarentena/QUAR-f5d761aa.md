---
id: "quar_f5d761aa"
tipo: "registro_cuarentena"
fecha: "2026-10-27T19:44:39.995Z"
empresa: "comp_default"
entidad: "products"
tabla_origen: "products"
identificador_registro: "SKU-F3-TEMP"
tipo_violacion: "invalid_price"
severidad: "ERROR"
tags:
  - mint
  - cuarentena
  - anomalia_datos
  - invalid_price
---

# Aislamiento en Cuarentena: [[quar_f5d761aa]]

## Diagnostico de la Anomalia
- **Tabla Origen**: `products`
- **Entidad**: `products`
- **Identificador del Registro**: `SKU-F3-TEMP`
- **Tipo de Infraccion**: `invalid_price`
- **Severidad**: `ERROR`
- **Motivo**: Precio imposible o cero (null) en producto 'Sensor de Temperatura Blindado PT-100' (SKU-F3-TEMP)

## Carga Aislada (Payload Crudo)
```json
{
  "id": "prod_f3_sensor_temp",
  "sku": "SKU-F3-TEMP",
  "price": null,
  "name": "Sensor de Temperatura Blindado PT-100"
}
```

## Accion de Proteccion
El registro fue aislado de las decisiones del agente autonomo para evitar decisiones sobre datos corrompidos.
La tabla del cliente permanece intacta y no ha sido alterada.

## Enlaces Relacionados
- Ver registro diario de auditoria: [[Auditoria/LOG-2026-10-27|LOG-2026-10-27]]
