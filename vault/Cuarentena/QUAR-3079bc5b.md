---
id: "quar_3079bc5b"
tipo: "registro_cuarentena"
fecha: "2026-10-27T19:45:52.237Z"
empresa: "comp_default"
entidad: "products"
tabla_origen: "products"
identificador_registro: "MINT-ROB-900"
tipo_violacion: "invalid_price"
severidad: "ERROR"
tags:
  - mint
  - cuarentena
  - anomalia_datos
  - invalid_price
---

# Aislamiento en Cuarentena: [[quar_3079bc5b]]

## Diagnostico de la Anomalia
- **Tabla Origen**: `products`
- **Entidad**: `products`
- **Identificador del Registro**: `MINT-ROB-900`
- **Tipo de Infraccion**: `invalid_price`
- **Severidad**: `ERROR`
- **Motivo**: Precio imposible o cero (null) en producto 'Brazo Robótico Articulado 6-Ejes' (MINT-ROB-900)

## Carga Aislada (Payload Crudo)
```json
{
  "id": "prod_mint_rob_900",
  "sku": "MINT-ROB-900",
  "price": null,
  "name": "Brazo Robótico Articulado 6-Ejes"
}
```

## Accion de Proteccion
El registro fue aislado de las decisiones del agente autonomo para evitar decisiones sobre datos corrompidos.
La tabla del cliente permanece intacta y no ha sido alterada.

## Enlaces Relacionados
- Ver registro diario de auditoria: [[Auditoria/LOG-2026-10-27|LOG-2026-10-27]]
