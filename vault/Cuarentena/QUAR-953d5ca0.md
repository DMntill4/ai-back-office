---
id: "quar_953d5ca0"
tipo: "registro_cuarentena"
fecha: "2026-10-27T19:45:45.524Z"
empresa: "comp_default"
entidad: "products"
tabla_origen: "products"
identificador_registro: "MINT-SALES-CHAN-001"
tipo_violacion: "invalid_price"
severidad: "ERROR"
tags:
  - mint
  - cuarentena
  - anomalia_datos
  - invalid_price
---

# Aislamiento en Cuarentena: [[quar_953d5ca0]]

## Diagnostico de la Anomalia
- **Tabla Origen**: `products`
- **Entidad**: `products`
- **Identificador del Registro**: `MINT-SALES-CHAN-001`
- **Tipo de Infraccion**: `invalid_price`
- **Severidad**: `ERROR`
- **Motivo**: Precio imposible o cero (null) en producto 'Terminal Sensor Venta Discord' (MINT-SALES-CHAN-001)

## Carga Aislada (Payload Crudo)
```json
{
  "id": "prod_sales_chan_001",
  "sku": "MINT-SALES-CHAN-001",
  "price": null,
  "name": "Terminal Sensor Venta Discord"
}
```

## Accion de Proteccion
El registro fue aislado de las decisiones del agente autonomo para evitar decisiones sobre datos corrompidos.
La tabla del cliente permanece intacta y no ha sido alterada.

## Enlaces Relacionados
- Ver registro diario de auditoria: [[Auditoria/LOG-2026-10-27|LOG-2026-10-27]]
