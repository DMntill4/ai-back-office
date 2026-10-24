import {
  addNotificationChannel,
  listNotificationChannels,
  testNotificationChannel,
  type ChannelType,
} from "@mint/notifiers";
import { getSession } from "../keychain";

export async function notifyAddCommand(
  type: string,
  options: {
    name?: string;
    token?: string;
    chatId?: string;
    webhook?: string;
    email?: string;
    quietStart?: string;
    quietEnd?: string;
    json?: boolean;
  } = {},
) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  const validTypes: ChannelType[] = ["telegram", "slack", "gmail"];
  const normalizedType = type.toLowerCase() as ChannelType;

  if (!validTypes.includes(normalizedType)) {
    console.error(`[ERROR] Tipo de canal no soportado: "${type}". Válidos: ${validTypes.join(", ")}`);
    process.exit(1);
  }

  const name = options.name || `Canal ${normalizedType.toUpperCase()}`;
  const config: Record<string, any> = {};

  if (normalizedType === "telegram") {
    config.botToken = options.token || process.env.TELEGRAM_BOT_TOKEN || "simulated_tg_token";
    config.chatId = options.chatId || process.env.TELEGRAM_CHAT_ID || "simulated_chat_123";
  } else if (normalizedType === "slack") {
    config.webhookUrl = options.webhook || process.env.SLACK_WEBHOOK_URL || "simulated_slack_webhook";
  } else if (normalizedType === "gmail") {
    config.email = options.email || process.env.NOTIFICATION_EMAIL || "operaciones@mint.io";
  }

  try {
    const channel = await addNotificationChannel({
      companyId,
      type: normalizedType,
      name,
      config,
      quietHoursStart: options.quietStart,
      quietHoursEnd: options.quietEnd,
    });

    if (options.json) {
      console.log(JSON.stringify({ success: true, channel }));
      return;
    }

    console.log(`\n[OK] CANAL DE NOTIFICACIÓN CONFIGURADO:`);
    console.log(`   ID:           ${channel.channelId}`);
    console.log(`   Tipo:         ${channel.type.toUpperCase()}`);
    console.log(`   Nombre:       ${channel.name}`);
    console.log(`   Empresa:      ${channel.companyId}`);
    if (channel.quietHoursStart && channel.quietHoursEnd) {
      console.log(`   Horario sil.: ${channel.quietHoursStart} - ${channel.quietHoursEnd}`);
    }
    console.log("");
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ success: false, error: err.message }));
    } else {
      console.error(`[ERROR] Error al agregar canal: ${err.message}`);
    }
    process.exit(1);
  }
}

export async function notifyTestCommand(
  type: string = "telegram",
  options: { json?: boolean } = {},
) {
  const normalizedType = type.toLowerCase() as ChannelType;
  try {
    const res = await testNotificationChannel(normalizedType);

    if (options.json) {
      console.log(JSON.stringify(res, null, 2));
      return;
    }

    console.log(`\n[OK] PRUEBA DE CONECTIVIDAD EXITOSA:`);
    console.log(`   Canal:      ${res.channelType.toUpperCase()}`);
    console.log(`   Message ID: ${res.messageId}`);
    console.log(`   Entregado:  ${res.deliveredAt ? new Date(res.deliveredAt).toLocaleTimeString("es-MX") : "Inmediato"}`);
    if (res.details?.buttons) {
      console.log(`   Botones Interactivos Adjuntos:`);
      for (const btn of res.details.buttons) {
        console.log(`     • [${btn.text}] -> ${btn.callback_data}`);
      }
    }
    console.log("");
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ success: false, error: err.message }));
    } else {
      console.error(`[ERROR] Error al probar canal: ${err.message}`);
    }
    process.exit(1);
  }
}

export async function notifyListCommand(options: { json?: boolean } = {}) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  try {
    const channels = await listNotificationChannels(companyId);

    if (options.json) {
      console.log(JSON.stringify(channels, null, 2));
      return;
    }

    console.log(`\n[CANALES] CANALES DE NOTIFICACIÓN ACTIVOS [Empresa: ${companyId}]`);
    console.log(`───────────────────────────────────────────────────────────────────────────`);
    console.log(
      `${"ID".padEnd(20)} ${"TIPO".padEnd(12)} ${"NOMBRE".padEnd(25)} ${"ESTADO".padEnd(10)}`,
    );
    console.log(`───────────────────────────────────────────────────────────────────────────`);

    for (const c of channels) {
      console.log(
        `${c.id.padEnd(20)} ${c.type.padEnd(12)} ${c.name.slice(0, 24).padEnd(25)} ${(c.isActive ? "[ACTIVO]" : "[INACTIVO]").padEnd(10)}`,
      );
    }
    console.log(`───────────────────────────────────────────────────────────────────────────\n`);
  } catch (err: any) {
    console.error(`[ERROR] Error al listar canales: ${err.message}`);
    process.exit(1);
  }
}
