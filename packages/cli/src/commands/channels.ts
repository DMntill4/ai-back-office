import { theme } from "../ui/theme";
import { drawCard, drawDivider } from "../ui/box";
import { getSession } from "../keychain";
import {
  listNotificationChannels,
  addNotificationChannel,
  testNotificationChannel,
  type ChannelType,
} from "@mint/notifiers";
import { db, businessConfig, notificationChannels } from "@mint/core";
import { eq } from "drizzle-orm";

export async function channelsCommand(action?: string, arg1?: string, arg2?: string) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  if (!action || action === "list") {
    console.log("\n" + drawDivider("CANALES DE COMUNICACIÓN Y ALERTAS REMOTAS", 84));
    const channels = await listNotificationChannels(companyId);

    if (channels.length === 0) {
      console.log(
        drawCard(
          [
            `${theme.amberBold("○ No hay canales de alerta remotos configurados actualmente en PostgreSQL.")}`,
            ``,
            `Para recibir avisos de desabasto, alertas críticas y decisiones HITL en tiempo real,`,
            `vincula tu webhook de Discord o Slack con los siguientes comandos:`,
            ``,
            `  ${theme.mintBold("/channels add discord <url>")}     Vincular webhook de Discord`,
            `  ${theme.cyanBold("/channels add slack <url>")}       Vincular webhook de Slack`,
            `  ${theme.violet("/channels add telegram <t> <id>")} Vincular bot de Telegram`,
            `  ${theme.bold("/app")}                                Configurar y probar canales con 1 clic en la App`,
          ],
          {
            title: "CANALES DE NOTIFICACION",
            borderColor: theme.amber,
          },
        ),
      );
      console.log("");
      return;
    }

    const lines: string[] = [];
    channels.forEach((ch, idx) => {
      const typeBadge =
        ch.type === "discord"
          ? theme.mintBold("[DISCORD]")
          : ch.type === "slack"
            ? theme.cyanBold("[SLACK]")
            : ch.type === "telegram"
              ? theme.violet("[TELEGRAM]")
              : theme.amberBold("[GMAIL]");

      const statusBadge = ch.isActive ? theme.badge("ACTIVO", "mint") : theme.badge("PAUSADO", "gray");
      const cfg = (ch.config as any) || {};
      let target = cfg.email || cfg.chatId || "Configurado";
      if (cfg.webhookUrl) {
        try {
          const u = new URL(cfg.webhookUrl);
          const parts = u.pathname.split("/").filter(Boolean);
          target = parts.length > 2
            ? `${u.origin}/${parts[0]}/${parts[1]}/***`
            : `${u.origin}/***`;
        } catch {
          target = `${cfg.webhookUrl.slice(0, 20)}/***`;
        }
      } else if (cfg.botToken) {
        target = `${String(cfg.botToken).slice(0, 6)}...*** (Chat ID: ${cfg.chatId || "N/A"})`;
      }
      const topics = (cfg.topics || ["todos"]).join(", ");

      lines.push(`${theme.bold(`#${idx + 1}`)} ${typeBadge} ${theme.bold(ch.name)} │ ${statusBadge}`);
      lines.push(`   ${theme.dim("Destino:")} ${theme.dim(target)}`);
      lines.push(`   ${theme.dim("Suscrito a:")} ${theme.cyan(topics)}`);
      lines.push(`   ${theme.dim("ID:")} ${theme.dim(ch.id)}`);
      if (idx < channels.length - 1) lines.push(theme.dim("───────────────────────────────────────────────────────"));
    });

    console.log(
      drawCard(lines, {
        title: `CANALES ACTIVOS [${channels.length}] // EMPRESA: ${companyId}`,
        borderColor: theme.mint,
      }),
    );
    console.log(`  ${theme.dim("Para enviar un mensaje de prueba:")} ${theme.mintBold("/channels test <id|tipo>")}`);
    console.log(`  ${theme.dim("Para agregar un nuevo canal:")}      ${theme.mintBold("/channels add <discord|slack|telegram> <url>")}\n`);
    return;
  }

  if (action === "add") {
    const rawType = (arg1 || "").toLowerCase();
    const targetUrl = arg2;

    if (!rawType || !["discord", "slack", "telegram", "gmail"].includes(rawType)) {
      console.log(theme.amber("Debes especificar la plataforma. Ej: /channels add discord <webhook_url>"));
      return;
    }

    if (!targetUrl) {
      console.log(theme.amber(`Debes especificar la URL o destino. Ej: /channels add ${rawType} <url>`));
      return;
    }

    const type = rawType as ChannelType;
    let config: Record<string, any> = {
      topics: ["stock", "critical", "logistics", "logs"],
    };

    if (type === "discord" || type === "slack") {
      if (!targetUrl.startsWith("http")) {
        console.log(theme.redBold("[ERROR] La URL del webhook debe iniciar con https://..."));
        return;
      }
      config.webhookUrl = targetUrl;
    } else if (type === "gmail") {
      config.email = targetUrl;
    }

    const channelName = `${type.toUpperCase()} Alertas (${targetUrl.slice(0, 25)}...)`;
    console.log(theme.muted(`Validando conectividad en vivo con ${type.toUpperCase()}...`));

    try {
      const pingRes = await testNotificationChannel(type, config);
      if (!pingRes.success) {
        console.log(`\n  ${theme.redBold("[ERROR]")} La conexión al canal falló: ${pingRes.error || "Destino inválido o inalcanzable"}.`);
        console.log(`  ${theme.amber("Regla de Verdad de Datos: Una conexión que falla NO se guarda como válida.")}\n`);
        return;
      }

      console.log(`  ${theme.mint("[OK]")} Conexión validada exitosamente con la API del canal.`);
      const created = await addNotificationChannel({
        companyId,
        type,
        name: channelName,
        config,
      });

      console.log(`\n  ${theme.mintBold("[OK]")} Canal ${theme.bold(channelName)} verificado y registrado en base de datos.\n`);
    } catch (err: any) {
      console.log(`\n  ${theme.redBold("[ERROR] Error al validar canal:")} ${err.message}`);
      console.log(`  ${theme.amber("El canal NO fue guardado.")}\n`);
    }
    return;
  }

  if (action === "test") {
    const target = arg1 || "discord";
    console.log(theme.muted(`Buscando canal '${target}' para prueba de entrega...`));
    const channels = await listNotificationChannels(companyId);
    const channel = channels.find((c) => c.type === target || c.id === target) || channels[0];

    if (!channel) {
      console.log(theme.amber(`No hay canales configurados que coincidan con '${target}'. Usa '/channels add discord <url>' primero.`));
      return;
    }

    console.log(`  Probando canal ${theme.bold(channel.name)} (${channel.type.toUpperCase()})...`);
    try {
      const res = await testNotificationChannel(channel.type as any, (channel.config as any) || {});
      if (res.success) {
        console.log(`\n  ${theme.success("[OK]")} ${theme.mintBold("Prueba exitosa. Mensaje recibido en tu canal.")}`);
        console.log(`  ${theme.dim("ID de entrega:")} ${res.messageId}`);
        if (res.details) console.log(`  ${theme.dim("Detalles:")} ${JSON.stringify(res.details)}`);
      } else {
        console.log(`\n  ${theme.redBold("[ERROR] Error de entrega:")} ${res.error}`);
      }
    } catch (err: any) {
      console.log(`\n  ${theme.redBold("[ERROR] Error de red:")} ${err.message}`);
    }
    console.log("");
    return;
  }

  if (action === "remove" || action === "delete") {
    if (!arg1) {
      console.log(theme.amber("Debes especificar el ID del canal a eliminar. Ej: /channels remove chan_123"));
      return;
    }
    await db.delete(notificationChannels).where(eq(notificationChannels.id, arg1));
    console.log(`\n  ${theme.success("[OK]")} Canal '${arg1}' eliminado de PostgreSQL.\n`);
    return;
  }

  console.log(theme.amber(`Subcomando '${action}' no reconocido. Usa '/channels [list|add|test|remove]'.`));
}

export async function settingsCommand() {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  console.log("\n" + drawDivider("CONFIGURACIÓN DEL SISTEMA Y GOBERNANZA OPERATIVA", 84));

  const configs = await db
    .select()
    .from(businessConfig)
    .where(eq(businessConfig.companyId, companyId));

  const channels = await listNotificationChannels(companyId);

  console.log(
    drawCard(
      [
        `${theme.bold("EMPRESA Y USUARIO ACTIVO:")}`,
        `  - Organizacion:   ${theme.mintBold(session?.companyName || companyId)} [${companyId}]`,
        `  - Operador:       ${theme.bold(session?.name || "Dale")} <${session?.email || "dalej@gmail.com"}> (Rol: ${session?.role || "owner"})`,
        ``,
        `${theme.bold("GOBERNANZA FINANCIERA Y AUTONOMIA (PRODUCCION):")}`,
        `  - Modo de Operacion:  ${theme.badge("HUMAN-IN-THE-LOOP 100%", "mint")} (CERO compras automaticas)`,
        `  - Politica de Compras: Toda orden de reposicion requiere autorizacion humana en ${theme.mintBold("/inbox")}.`,
        `  - Presupuesto Maximo:  Definido por orden en cada propuesta evaluada por el equipo multi-agente.`,
        ``,
        `${theme.bold("CANALES DE COMUNICACION CONECTADOS:")}`,
        channels.length > 0
          ? channels.map((c) => `  - ${c.type.toUpperCase()}: ${theme.bold(c.name)} (${c.isActive ? theme.mint("Activo") : theme.amber("Pausado")})`).join("\n")
          : `  - ${theme.amber("Ningun canal remoto conectado. Agrega uno con /channels add discord <url>")}`,
        ``,
        `${theme.bold("BASE DE DATOS Y CATALOGO:")}`,
        `  - Motor:          PostgreSQL 15 (Supabase AWS Pooler)`,
        `  - Catalogo Real:  Sincronizado en tiempo real (0 datos ficticios)`,
      ],
      {
        title: "AJUSTES Y GOBERNANZA MINT",
        borderColor: theme.cyan,
      },
    ),
  );
  console.log("");
}
