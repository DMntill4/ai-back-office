import { theme } from "./theme";

export interface BannerOptions {
  companyId?: string;
  autonomyLevel?: string;
  daemonRunning?: boolean;
  isPaused?: boolean;
}

export function printBanner(options: BannerOptions = {}) {
  const logo = [
    "  __  __ ___ _  _ _____    ___ _    ___ ",
    " |  \\/  |_ _| \\| |_   _|  / __| |  |_ _|",
    " | |\\/| || || .` | | |   | (__| |__ | | ",
    " |_|  |_|___|_|\\_| |_|    \\___|____|___|",
  ];

  console.log("");
  for (const line of logo) {
    console.log(theme.mintBold(line));
  }
  console.log(
    theme.dim(" ") +
      theme.cyanBold("AUTONOMOUS LOGISTICS") +
      theme.dim(" // ") +
      theme.muted("COORDINADOR Y GOBERNANZA OPERATIVA") +
      theme.dim(" v2.5"),
  );

  if (options.companyId) {
    const autonomyBadge = options.autonomyLevel
      ? options.autonomyLevel === "auto"
        ? theme.badge("AUTO", "mint")
        : options.autonomyLevel === "assisted"
          ? theme.badge("ASSISTED", "amber")
          : theme.badge("DRY-RUN", "gray")
      : theme.badge("DRY-RUN", "gray");

    const daemonBadge = options.isPaused
      ? theme.badge("PAUSADO", "red")
      : options.daemonRunning
        ? theme.badge("ONLINE", "mint")
        : theme.badge("STANDBY", "gray");

    console.log(
      theme.dim(" ├─ ") +
        theme.muted("Tenant: ") +
        theme.bold(options.companyId) +
        theme.dim(" │ ") +
        theme.muted("Autonomía: ") +
        autonomyBadge +
        theme.dim(" │ ") +
        theme.muted("Daemon: ") +
        daemonBadge,
    );
  }
  console.log(theme.dim(" └" + "─".repeat(68)) + "\n");
}
