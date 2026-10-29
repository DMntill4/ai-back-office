import { theme } from "./theme";
import * as os from "node:os";

export interface BannerOptions {
  companyId?: string;
  companyName?: string;
  businessType?: string;
  autonomyLevel?: string;
  daemonRunning?: boolean;
  isPaused?: boolean;
  dbConnected?: boolean;
  pendingInboxCount?: number;
  activeChannelsCount?: number;
}

function line(content: string, width = 72): string {
  const visibleLen = theme.stripAnsi(content).length;
  const padding = Math.max(0, width - visibleLen);
  return theme.charcoal("│ ") + content + " ".repeat(padding) + theme.charcoal(" │");
}

export function printBanner(options: BannerOptions = {}) {
  const innerWidth = 72;
  const borderH = theme.charcoal("─".repeat(innerWidth + 2));

  const dbStatus =
    options.dbConnected !== false
      ? `${theme.mintBold("ONLINE")} ${theme.mint("●")}`
      : `${theme.redBold("OFFLINE")} ${theme.red("○")}`;

  const daemonStatus = options.isPaused
    ? `${theme.redBold("PAUSADO")} ${theme.red("■")}`
    : options.daemonRunning
      ? `${theme.mintBold("ONLINE")} ${theme.mint("●")}`
      : `${theme.darkGray("STANDBY")} ${theme.darkGray("○")}`;

  const autonomyBadge =
    options.autonomyLevel === "auto"
      ? theme.mintBold("AUTO-GOVERNED")
      : options.autonomyLevel === "assisted"
        ? theme.amberBold("ASSISTED-HITL")
        : theme.smoke("DRY-RUN");

  const company = options.companyName || options.companyId || "comp_default";
  const model = (options.businessType || "TIENDA_BARRIO / HITL").toUpperCase();
  const pendingInbox =
    (options.pendingInboxCount ?? 0) > 0
      ? theme.amberBold(`${options.pendingInboxCount} PENDIENTES`)
      : theme.mint("0 PENDIENTES");

  const channels =
    (options.activeChannelsCount ?? 1) > 0
      ? theme.mintBold(`${options.activeChannelsCount ?? 1} ACTIVOS [Webhook/Bots]`)
      : theme.amber("SIN CANALES EXTERNOS");

  console.log("");
  console.log(theme.charcoal("┌") + borderH + theme.charcoal("┐"));

  // Cabecera ASCII + Metadatos de Ciber-Operaciones
  console.log(line(` ${theme.mintBold(" __  __ ___ _  _ _____")}    ${theme.cyanBold("[CYBER-OPS // KALI-EDITION]")}`));
  console.log(line(` ${theme.mintBold("|  \\/  |_ _| \\| |_   _|")}   ${theme.dim("OS:")} ${theme.smoke(os.type())} ${theme.dim(os.arch())} │ ${theme.dim("HOST:")} ${theme.smoke(os.hostname().slice(0, 16))}`));
  console.log(line(` ${theme.mintBold("| |\\/| || || .` | | | ")}   ${theme.dim("SEC-LEVEL:")} ${theme.mint("ZERO-TRUST-ISOLATION")}`));
  console.log(line(` ${theme.mintBold("|_|  |_|___|_|\\_| |_| ")}   ${theme.dim("ENGINE:")} ${theme.cyan("AUTONOMOUS BACK-OFFICE v2.5")}`));

  console.log(theme.charcoal("├") + borderH + theme.charcoal("┤"));

  // Panel de Telemetría del Sistema
  console.log(line(`${theme.cyanBold("[SYSTEM TELEMETRY]")} ${theme.dim("─────────────────────────────────────────────────────")}`));
  console.log(line(`  ${theme.dim("•")} ${theme.dim("DB CORE:")}    ${dbStatus}          ${theme.dim("•")} ${theme.dim("ORGANIZACIÓN:")} ${theme.smokeBold(company)}`));
  console.log(line(`  ${theme.dim("•")} ${theme.dim("DAEMON:")}     ${daemonStatus}         ${theme.dim("•")} ${theme.dim("MODELO REGLAS:")} ${theme.cyan(model)}`));
  console.log(line(`  ${theme.dim("•")} ${theme.dim("AUTONOMÍA:")}  ${autonomyBadge}   ${theme.dim("•")} ${theme.dim("BANDEJA HITL:")}  ${pendingInbox}`));
  console.log(line(`  ${theme.dim("•")} ${theme.dim("CANALES:")}    ${channels}`));

  console.log(theme.charcoal("└") + borderH + theme.charcoal("┘"));
  console.log("");
}
