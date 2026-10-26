import {
  getCompanyConfig,
  setCompanyConfig,
  updateProductMinStock,
  listProductThresholds,
  formatCompanyDate,
  COMMON_TIMEZONES,
  hasPermission,
  type UserRole,
} from "@mint/core";
import { getSession } from "../keychain";
import { theme } from "../ui/theme";
import { drawCard, drawDivider } from "../ui/box";
import { renderTable, type ColumnDef } from "../ui/table";

export async function configCommand(action?: string, arg1?: string, ...rest: string[]) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";
  const role = (session?.role || "viewer").toLowerCase() as UserRole;

  const sub = action ? action.toLowerCase().trim() : "";

  // 1. Subcomando: Listar umbrales de stock (/config thresholds)
  if (sub === "thresholds" || sub === "umbrales") {
    console.log("\n" + drawDivider("UMBRALES DE STOCK DE SEGURIDAD (ROP) POR PRODUCTO", 84));
    const thresholds = await listProductThresholds(companyId);

    const columns: ColumnDef[] = [
      { header: "SKU", key: "sku", width: 14 },
      { header: "PRODUCTO", key: "name", width: 28 },
      { header: "CATEGORIA", key: "category", width: 14 },
      { header: "MINIMO (ROP)", key: "minStock", width: 14, align: "right" },
      { header: "STOCK ACTUAL", key: "currentStock", width: 14, align: "right" },
      {
        header: "ESTADO",
        key: "status",
        width: 18,
        align: "center",
        format: (val) =>
          val === "CRITICO_BAJO_STOCK"
            ? theme.redBold("[CRÍTICO]")
            : theme.mintBold("[SEGURO]"),
      },
    ];

    console.log(renderTable(columns, thresholds));
    console.log(
      `\n  ${theme.dim("Para modificar un umbral:")} ${theme.mintBold("/config minstock <SKU> <CANTIDAD>")}\n`,
    );
    return;
  }

  // 2. Subcomando: Modificar umbral mínimo por SKU (/config minstock <sku> <qty>)
  if (sub === "minstock" || sub === "threshold" || sub === "umbral") {
    if (!hasPermission(role, "configure_bot")) {
      console.log(
        `\n  ${theme.redBold("[ACCESO DENEGADO]")} Tu rol (${role.toUpperCase()}) no tiene permisos para modificar umbrales.\n`,
      );
      return;
    }

    const sku = arg1;
    const qtyRaw = rest[0];

    if (!sku || !qtyRaw) {
      console.log(
        `\n  ${theme.amberBold("[USO]")} /config minstock <SKU> <CANTIDAD>\n  ${theme.dim("Ejemplo:")} /config minstock ST-200 35\n`,
      );
      return;
    }

    const qty = parseInt(qtyRaw, 10);
    if (isNaN(qty) || qty < 0) {
      console.log(`\n  ${theme.redBold("[ERROR]")} La cantidad debe ser un número entero mayor o igual a 0.\n`);
      return;
    }

    try {
      const res = await updateProductMinStock(companyId, sku, qty);
      console.log("");
      console.log(
        drawCard(
          [
            `${theme.mintBold("[OK] Umbral de stock actualizado correctamente en PostgreSQL")}`,
            "",
            `  - SKU:               ${theme.bold(res.product?.sku || sku)}`,
            `  - Producto:          ${theme.cyanBold(res.product?.name || "")}`,
            `  - Umbral Anterior:   ${theme.dim(String(res.product?.oldMinStock))} unidades`,
            `  - Nuevo Umbral (ROP): ${theme.mintBold(String(res.product?.newMinStock))} unidades`,
            "",
            `  ${theme.dim("El motor autónomo y /intel calcularán alertas usando este nuevo umbral.")}`,
          ],
          {
            title: "CONFIGURACIÓN DE PRODUCTO",
            borderColor: theme.mint,
          },
        ),
      );
      console.log("");
    } catch (err: any) {
      console.log(`\n  ${theme.redBold("[ERROR]")} ${err.message}\n`);
    }
    return;
  }

  // 3. Subcomando: Actualizar zona horaria directa (/config timezone <tz>)
  if (sub === "timezone" || sub === "tz") {
    if (!hasPermission(role, "configure_bot")) {
      console.log(
        `\n  ${theme.redBold("[ACCESO DENEGADO]")} Tu rol (${role.toUpperCase()}) no tiene permisos de configuración.\n`,
      );
      return;
    }

    const tz = arg1 || rest.join(" ");
    if (!tz) {
      console.log(
        `\n  ${theme.amberBold("[USO]")} /config timezone <ZONA_IANA>\n  ${theme.dim("Zonas comunes:")} ${COMMON_TIMEZONES.slice(0, 6).join(", ")}\n`,
      );
      return;
    }

    try {
      await setCompanyConfig(companyId, "timezone", tz);
      const currentTime = formatCompanyDate(new Date(), tz, true);
      console.log("");
      console.log(
        drawCard(
          [
            `${theme.mintBold("[OK] Zona horaria actualizada con éxito")}`,
            "",
            `  - Nueva Zona Horaria: ${theme.mintBold(tz)}`,
            `  - Hora Local Actual:  ${theme.bold(currentTime)}`,
            "",
            `  ${theme.dim("Bitácoras, notificaciones y reportes se calcularán bajo este huso horario.")}`,
          ],
          {
            title: "ZONA HORARIA MINT",
            borderColor: theme.mint,
          },
        ),
      );
      console.log("");
    } catch (err: any) {
      console.log(`\n  ${theme.redBold("[ERROR]")} ${err.message}\n`);
    }
    return;
  }

  // 4. Subcomando: Actualizar divisa (/config currency <divisa>)
  if (sub === "currency" || sub === "divisa" || sub === "moneda") {
    if (!hasPermission(role, "configure_bot")) {
      console.log(
        `\n  ${theme.redBold("[ACCESO DENEGADO]")} Tu rol (${role.toUpperCase()}) no tiene permisos de configuración.\n`,
      );
      return;
    }

    const cur = (arg1 || rest[0] || "").toUpperCase().trim();
    if (!cur || cur.length < 3) {
      console.log(`\n  ${theme.amberBold("[USO]")} /config currency <USD|COP|MXN|EUR>\n`);
      return;
    }

    try {
      await setCompanyConfig(companyId, "currency", cur);
      console.log(`\n  ${theme.success("[OK]")} Divisa operativa establecida en ${theme.mintBold(cur)} y sincronizada con el perfil de la empresa.\n`);
    } catch (err: any) {
      console.log(`\n  ${theme.redBold("[ERROR]")} ${err.message}\n`);
    }
    return;
  }

  // 5. Subcomando: Reglas personalizadas (/config rules <texto>)
  if (sub === "rules" || sub === "reglas") {
    if (!hasPermission(role, "configure_bot")) {
      console.log(
        `\n  ${theme.redBold("[ACCESO DENEGADO]")} Tu rol (${role.toUpperCase()}) no tiene permisos de configuración.\n`,
      );
      return;
    }

    const rules = [arg1, ...rest].filter(Boolean).join(" ");
    if (!rules) {
      console.log(
        `\n  ${theme.amberBold("[USO]")} /config rules <directrices o reglas operativas para el agente>\n  ${theme.dim("Ejemplo:")} /config rules Priorizar proveedores locales y no despachar viernes en la tarde.\n`,
      );
      return;
    }

    try {
      await setCompanyConfig(companyId, "bot_custom_rules", rules);
      console.log(`\n  ${theme.success("[OK]")} Reglas de negocio personalizadas guardadas para el agente autónomo.\n`);
    } catch (err: any) {
      console.log(`\n  ${theme.redBold("[ERROR]")} ${err.message}\n`);
    }
    return;
  }

  // 6. Subcomando genérico: /config set <clave> <valor>
  if (sub === "set") {
    if (!hasPermission(role, "configure_bot")) {
      console.log(
        `\n  ${theme.redBold("[ACCESO DENEGADO]")} Tu rol (${role.toUpperCase()}) no tiene permisos para modificar la configuración.\n`,
      );
      return;
    }

    const key = arg1;
    const value = rest.join(" ");

    if (!key || !value) {
      console.log(
        `\n  ${theme.amberBold("[USO]")} /config set <CLAVE> <VALOR>\n` +
          `  ${theme.dim("Claves soportadas:")}\n` +
          `    - timezone                 (ej: America/Bogota, America/Mexico_City)\n` +
          `    - currency                 (ej: USD, COP, MXN)\n` +
          `    - approval_limit_amount    (ej: 5000)\n` +
          `    - bot_name                 (ej: Coordinador Platica)\n` +
          `    - bot_tone                 (ej: ejecutivo, conciso, tecnico)\n` +
          `    - autonomy_level           (ej: hitl, semiautonomo, autonomo)\n`,
      );
      return;
    }

    try {
      const res = await setCompanyConfig(companyId, key, value);
      console.log(`\n  ${theme.success("[OK]")} ${res.message}\n`);
    } catch (err: any) {
      console.log(`\n  ${theme.redBold("[ERROR]")} ${err.message}\n`);
    }
    return;
  }

  // 7. Panel general de configuración (/config o /settings)
  console.log("\n" + drawDivider("CONFIGURACIÓN DEL SISTEMA Y GOBERNANZA OPERATIVA", 84));

  const [config, thresholds] = await Promise.all([
    getCompanyConfig(companyId),
    listProductThresholds(companyId),
  ]);

  const localTime = formatCompanyDate(new Date(), config.timezone, true);
  const criticalCount = thresholds.filter((t) => t.status === "CRITICO_BAJO_STOCK").length;

  const autonomyBadge =
    config.autonomyLevel === "autonomo"
      ? theme.badge("AUTÓNOMO TOTAL", "amber")
      : config.autonomyLevel === "semiautonomo"
        ? theme.badge("SEMIAUTÓNOMO", "cyan")
        : theme.badge("HUMAN-IN-THE-LOOP (100% SEGURO)", "mint");

  console.log(
    drawCard(
      [
        `${theme.bold("ORGANIZACIÓN Y ZONA HORARIA:")}`,
        `  - Empresa:            ${theme.mintBold(config.companyName)} [${config.companyId}]`,
        `  - Zona Horaria:       ${theme.cyanBold(config.timezone)}`,
        `  - Hora Local Actual:  ${theme.bold(localTime)}`,
        `  - Divisa Base:        ${theme.bold(config.currency)}`,
        "",
        `${theme.bold("GOBERNANZA FINANCIERA & AUTONOMÍA:")}`,
        `  - Nivel Operativo:    ${autonomyBadge}`,
        `  - Límite de Compra:   $${config.approvalLimitAmount.toLocaleString()} ${config.currency} sin aprobación manual`,
        `  - Política de Riesgo: Toda propuesta fuera de rango requiere autorización humana en ${theme.mintBold("/inbox")}.`,
        "",
        `${theme.bold("ASISTENTE Y REGLAS DE NEGOCIO:")}`,
        `  - Nombre del Agente:  ${theme.bold(config.botName)}`,
        `  - Tono de Respuestas: ${theme.dim(config.botTone)}`,
        `  - Reglas Custom:      ${config.botCustomRules ? theme.dim(`"${config.botCustomRules}"`) : theme.dim("(Sin reglas personalizadas activas)")}`,
        "",
        `${theme.bold("CATÁLOGO Y STOCK DE SEGURIDAD (ROP):")}`,
        `  - SKUs Monitoreados:  ${theme.bold(String(thresholds.length))} productos`,
        `  - En Estado Crítico:  ${criticalCount > 0 ? theme.redBold(`${criticalCount} SKU(s) bajo el mínimo`) : theme.mintBold("0 SKUs bajo umbral")}`,
        "",
        `${theme.bold("COMANDOS RÁPIDOS DE AJUSTE:")}`,
        `  ${theme.mintBold("/config set <clave> <valor>")}   Modificar un parámetro de gobernanza`,
        `  ${theme.mintBold("/config minstock <sku> <qty>")}  Ajustar umbral de seguridad para un producto`,
        `  ${theme.mintBold("/config thresholds")}            Ver tabla de todos los umbrales de stock`,
        `  ${theme.mintBold("/config timezone <zona>")}       Cambiar zona horaria (ej: America/Bogota)`,
        `  ${theme.mintBold("/config currency <divisa>")}     Cambiar divisa operativa (USD/COP/MXN)`,
        `  ${theme.mintBold("/logout")}                       Cerrar sesión y limpiar token local`,
      ],
      {
        title: "AJUSTES Y GOBERNANZA MINT",
        borderColor: theme.cyan,
      },
    ),
  );
  console.log("");
}
