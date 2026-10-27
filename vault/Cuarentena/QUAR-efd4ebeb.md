---
id: "quar_efd4ebeb"
tipo: "registro_cuarentena"
fecha: "2026-10-27T19:45:55.808Z"
empresa: "comp_default"
entidad: "products"
tabla_origen: "products"
identificador_registro: "MINT-CAB-004"
tipo_violacion: "invalid_price"
severidad: "ERROR"
tags:
  - mint
  - cuarentena
  - anomalia_datos
  - invalid_price
---

# Aislamiento en Cuarentena: [[quar_efd4ebeb]]

## Diagnostico de la Anomalia
- **Tabla Origen**: `products`
- **Entidad**: `products`
- **Identificador del Registro**: `MINT-CAB-004`
- **Tipo de Infraccion**: `invalid_price`
- **Severidad**: `ERROR`
- **Motivo**: Precio imposible o cero (null) en producto 'Cable Blindado de Transmisión 50m' (MINT-CAB-004)

## Carga Aislada (Payload Crudo)
```json
{
  "id": "prod_mint_cab_004",
  "sku": "MINT-CAB-004",
  "price": null,
  "name": "Cable Blindado de Transmisión 50m"
}
```

## Accion de Proteccion
El registro fue aislado de las decisiones del agente autonomo para evitar decisiones sobre datos corrompidos.
La tabla del cliente permanece intacta y no ha sido alterada.

## Enlaces Relacionados
- Ver registro diario de auditoria: [[Auditoria/LOG-2026-10-27|LOG-2026-10-27]]
