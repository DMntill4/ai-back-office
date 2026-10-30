---
id: "quar_a4d0c23a"
tipo: "registro_cuarentena"
fecha: "2026-10-27T19:45:49.581Z"
empresa: "comp_default"
entidad: "products"
tabla_origen: "products"
identificador_registro: "SKU-E2E-1793120921882"
tipo_violacion: "invalid_price"
severidad: "ERROR"
tags:
  - mint
  - cuarentena
  - anomalia_datos
  - invalid_price
---

# Aislamiento en Cuarentena: [[quar_a4d0c23a]]

## Diagnostico de la Anomalia
- **Tabla Origen**: `products`
- **Entidad**: `products`
- **Identificador del Registro**: `SKU-E2E-1793120921882`
- **Tipo de Infraccion**: `invalid_price`
- **Severidad**: `ERROR`
- **Motivo**: Precio imposible o cero (null) en producto 'Sensor de Nivel de Tanque E2E' (SKU-E2E-1793120921882)

## Carga Aislada (Payload Crudo)
```json
{
  "id": "prod_e2e_1793120921882",
  "sku": "SKU-E2E-1793120921882",
  "price": null,
  "name": "Sensor de Nivel de Tanque E2E"
}
```

## Accion de Proteccion
El registro fue aislado de las decisiones del agente autonomo para evitar decisiones sobre datos corrompidos.
La tabla del cliente permanece intacta y no ha sido alterada.

## Enlaces Relacionados
- Ver registro diario de auditoria: [[Auditoria/LOG-2026-10-27|LOG-2026-10-27]]
