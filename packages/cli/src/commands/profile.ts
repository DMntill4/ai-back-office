import { getCompanyDataProfile } from "@mint/core";
import { getSession } from "../keychain";
import { theme } from "../ui/theme";
import { drawCard, drawDivider, drawTable } from "../ui/box";

export async function profileCommand(options: { json?: boolean } = {}) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  try {
    const profile = await getCompanyDataProfile(companyId);

    if (options.json) {
      console.log(JSON.stringify(profile, null, 2));
      return;
    }

    console.log("\n" + drawDivider(`PERFIL DE EMPRESA Y VERDAD DE DATOS [${companyId}]`, 88));

    // 1. Barra de integridad de datos
    const filledBars = Math.round((profile.healthScore / 100) * 20);
    const emptyBars = 20 - filledBars;
    const progressBar = theme.mint("█".repeat(filledBars)) + theme.dim("░".repeat(emptyBars));
    const statusBadge =
      profile.healthStatus === "OPTIMAL"
        ? theme.badge("OPTIMO", "mint")
        : profile.healthStatus === "NEEDS_ATTENTION"
          ? theme.badge("ATENCION REQUERIDA", "amber")
          : theme.badge("INCOMPLETO", "red");

    console.log(
      drawCard(
        [
          `${theme.dim("Empresa:")}     ${theme.bold(profile.company.name)} (ID: ${profile.company.id})`,
          `${theme.dim("Modelo:")}      ${theme.cyanBold(profile.company.businessType.toUpperCase())}`,
          `${theme.dim("País:")}        ${profile.company.country || theme.dim("No especificado")}`,
          `${theme.dim("Divisa:")}      ${theme.mintBold(profile.company.currency)}`,
          `${theme.dim("Ciudad/Sede:")} ${profile.company.city || theme.dim("No especificada")}`,
          `${theme.dim("ID Fiscal:")}   ${profile.company.taxId || theme.dim("No registrado")}`,
          `${theme.dim("Salud Datos:")} [${progressBar}] ${profile.healthScore}%  ${statusBadge}`,
        ],
        {
          title: "IDENTIDAD CORPORATIVA // VERDAD DE DATOS",
          borderColor: theme.mint,
        },
      ),
    );

    // 2. Tabla de métricas de datos
    console.log(`\n  ${theme.bold("ESTADO DE COBERTURA EN BASE DE DATOS")}`);
    const metricsRows = [
      [
        "Almacenes / Bodegas",
        String(profile.metrics.warehousesCount),
        `${profile.metrics.warehousesWithGps}/${profile.metrics.warehousesCount} con GPS`,
        profile.metrics.warehousesCount > 0 ? theme.mint("OPERATIVO") : theme.amber("SIN DATOS"),
      ],
      [
        "Proveedores Registrados",
        String(profile.metrics.suppliersCount),
        `${profile.metrics.suppliersWithOffers} con catálogo de precios`,
        profile.metrics.suppliersCount > 0 ? theme.mint("OPERATIVO") : theme.amber("SIN DATOS"),
      ],
      [
        "Catálogo de Productos",
        String(profile.metrics.productsCount),
        `${profile.metrics.productsWithMinStock} con umbral ROP activo`,
        profile.metrics.productsCount > 0 ? theme.mint("OPERATIVO") : theme.amber("SIN DATOS"),
      ],
      [
        "Canales de Notificación",
        String(profile.metrics.activeChannelsCount),
        "Webhook / Discord / Telegram / Slack",
        profile.metrics.activeChannelsCount > 0 ? theme.mint("CONECTADO") : theme.amber("DESCONECTADO"),
      ],
      [
        "Equipo y Usuarios",
        String(profile.metrics.teamMembersCount),
        "Roles RBAC configurados",
        profile.metrics.teamMembersCount > 0 ? theme.mint("ACTIVO") : theme.dim("1 USUARIO"),
      ],
    ];

    console.log(
      drawTable(
        ["ENTIDAD", "TOTAL", "DETALLE DE COBERTURA", "ESTADO"],
        metricsRows,
        [26, 8, 38, 14],
      ),
    );

    // 3. Matriz de Capacidades Empresariales
    if (profile.capabilities && profile.capabilities.length > 0) {
      console.log(`\n  ${theme.bold("MATRIZ DE CAPACIDADES EMPRESARIALES // AUTONOMÍA")}`);
      const capRows = profile.capabilities.map((c) => {
        let badge = theme.dim("DESCONOCIDO");
        if (c.status === "DISPONIBLE_OPERATIVO") badge = theme.mint("OPERATIVO");
        else if (c.status === "DISPONIBLE_CON_LIMITACIONES") badge = theme.amber("CON LIMITACIONES");
        else if (c.status === "REQUIERE_CONFIGURACION") badge = theme.cyan("REQUIERE CONFIG");
        else if (c.status === "REQUIERE_FUENTE_DATOS") badge = theme.amber("FALTA FUENTE");
        else if (c.status === "NO_APLICA") badge = theme.dim("NO APLICA");
        else if (c.status === "NO_DISPONIBLE") badge = theme.red("NO DISPONIBLE");

        return [c.name, badge, c.description];
      });

      console.log(
        drawTable(
          ["CAPACIDAD", "ESTADO", "ALCANCE / RESTRICCIÓN OPERATIVA"],
          capRows,
          [34, 18, 44],
        ),
      );
    }

    // 4. Banco de preguntas pendientes (Truth in Data)
    console.log("\n" + drawDivider("BANCO DE PREGUNTAS PENDIENTES // DATOS FALTANTES", 88));

    if (profile.pendingQuestions.length === 0) {
      console.log(`  ${theme.mintBold("[OK]")} ${theme.bold("Verdad de datos al 100%:")} La empresa cuenta con todos los datos necesarios.`);
      console.log(`  ${theme.dim("El bot no asumirá ni inventará ninguna ubicación ni proveedor ficticio.\n")}`);
      return;
    }

    console.log(`  ${theme.dim("Mint no inventa proveedores, precios ni coordenadas. Estos datos faltan en tu BD:")}\n`);

    for (let i = 0; i < profile.pendingQuestions.length; i++) {
      const q = profile.pendingQuestions[i];
      const badge =
        q.severity === "CRITICAL"
          ? theme.redBold(`[${q.category}]`)
          : q.severity === "WARNING"
            ? theme.amberBold(`[${q.category}]`)
            : theme.cyanBold(`[${q.category}]`);

      console.log(`  ${badge} ${theme.bold(q.question)}`);
      console.log(`    ${theme.dim("Impacto:")} ${q.suggestedAction}`);
      console.log(`    ${theme.dim("Solución:")} ${theme.mint(q.commandHint)}\n`);
    }

  } catch (err: any) {
    console.error(theme.redBold(`\n[ERROR] Error al cargar perfil de empresa: ${err.message}\n`));
  }
}
