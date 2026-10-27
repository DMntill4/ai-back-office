---
id: "quar_6ed21ffe"
tipo: "registro_cuarentena"
fecha: "2026-10-27T19:45:46.715Z"
empresa: "comp_default"
entidad: "products"
tabla_origen: "products"
identificador_registro: "MINT-VAL-800"
tipo_violacion: "invalid_price"
severidad: "ERROR"
tags:
  - mint
  - cuarentena
  - anomalia_datos
  - invalid_price
---

# Aislamiento en Cuarentena: [[quar_6ed21ffe]]

## Diagnostico de la Anomalia
- **Tabla Origen**: `products`
- **Entidad**: `products`
- **Identificador del Registro**: `MINT-VAL-800`
- **Tipo de Infraccion**: `invalid_price`
- **Severidad**: `ERROR`
- **Motivo**: Precio imposible o cero (null) en producto 'Electro-Válvula Neumática 24V' (MINT-VAL-800)

## Carga Aislada (Payload Crudo)
```json
{
  "id": "prod_mint_val_800",
  "sku": "MINT-VAL-800",
  "price": null,
  "name": "Electro-Válvula Neumática 24V"
}
```

## Accion de Proteccion
El registro fue aislado de las decisiones del agente autonomo para evitar decisiones sobre datos corrompidos.
La tabla del cliente permanece intacta y no ha sido alterada.

## Enlaces Relacionados
- Ver registro diario de auditoria: [[Auditoria/LOG-2026-10-27|LOG-2026-10-27]]
