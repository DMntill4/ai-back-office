---
id: "quar_19fcaa52"
tipo: "registro_cuarentena"
fecha: "2026-10-27T19:44:45.829Z"
empresa: "comp_default"
entidad: "products"
tabla_origen: "products"
identificador_registro: "SKU-E2E-1793120794769"
tipo_violacion: "invalid_price"
severidad: "ERROR"
tags:
  - mint
  - cuarentena
  - anomalia_datos
  - invalid_price
---

# Aislamiento en Cuarentena: [[quar_19fcaa52]]

## Diagnostico de la Anomalia
- **Tabla Origen**: `products`
- **Entidad**: `products`
- **Identificador del Registro**: `SKU-E2E-1793120794769`
- **Tipo de Infraccion**: `invalid_price`
- **Severidad**: `ERROR`
- **Motivo**: Precio imposible o cero (null) en producto 'Sensor de Nivel de Tanque E2E' (SKU-E2E-1793120794769)

## Carga Aislada (Payload Crudo)
```json
{
  "id": "prod_e2e_1793120794769",
  "sku": "SKU-E2E-1793120794769",
  "price": null,
  "name": "Sensor de Nivel de Tanque E2E"
}
```

## Accion de Proteccion
El registro fue aislado de las decisiones del agente autonomo para evitar decisiones sobre datos corrompidos.
La tabla del cliente permanece intacta y no ha sido alterada.

## Enlaces Relacionados
- Ver registro diario de auditoria: [[Auditoria/LOG-2026-10-27|LOG-2026-10-27]]
