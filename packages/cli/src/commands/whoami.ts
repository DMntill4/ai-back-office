import { deleteSession, getSession } from "../keychain";
import { theme } from "../ui/theme";
import { drawCard } from "../ui/box";
import { hasPermission, ROLE_PERMISSIONS, type UserRole } from "@mint/core";

export async function logoutCommand(options: { json?: boolean } = {}) {
  const session = await getSession();
  const deleted = await deleteSession();

  if (options.json) {
    console.log(JSON.stringify({ success: true, loggedOut: deleted }));
  } else {
    if (session) {
      console.log(`\n  [OK] Sesión cerrada para ${theme.bold(session.email)} (${session.companyName}). Token eliminado del keychain.\n`);
    } else {
      console.log(`\n  ${theme.dim("No había una sesión activa guardada.")}\n`);
    }
  }
}

export async function whoamiCommand(options: { json?: boolean } = {}) {
  const session = await getSession();

  if (!session) {
    if (options.json) {
      console.log(JSON.stringify({ authenticated: false }));
    } else {
      console.log(`\n  [AVISO] No has iniciado sesión. Ejecuta ${theme.mintBold("npm start")} o ${theme.mintBold("mint login")} para autenticarte.\n`);
    }
    return;
  }

  const role = (session.role || "viewer").toLowerCase() as UserRole;
  const roleInfo = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.viewer;

  const roleBadge =
    role === "owner"
      ? theme.badge("OWNER", "mint")
      : role === "admin"
        ? theme.badge("ADMIN", "cyan")
        : role === "operator"
          ? theme.badge("OPERATOR", "cyan")
          : role === "driver"
            ? theme.badge("DRIVER", "violet")
            : role === "auditor"
              ? theme.badge("AUDITOR", "amber")
              : theme.badge("VIEWER", "gray");

  if (options.json) {
    console.log(JSON.stringify({
      authenticated: true,
      session,
      permissions: {
        approve: hasPermission(role, "approve"),
        dispatch: hasPermission(role, "dispatch"),
        receive: hasPermission(role, "receive"),
        manageTeam: hasPermission(role, "manage_team"),
        manageChannels: hasPermission(role, "manage_channels"),
        configureBot: hasPermission(role, "configure_bot"),
      },
    }));
    return;
  }

  const permIcon = (has: boolean) => (has ? theme.mint("  [OK]") : theme.dim("  [ERROR]"));

  console.log("");
  console.log(
    drawCard(
      [
        `${theme.dim("Usuario:")}       ${theme.bold(session.name)} <${session.email}>`,
        `${theme.dim("Rol:")}           ${roleBadge} - ${roleInfo.label}`,
        `${theme.dim("Descripción:")}   ${theme.dim(roleInfo.description)}`,
        `${theme.dim("Empresa ID:")}    ${theme.mintBold(session.companyId)} (${session.companyName})`,
        `${theme.dim("Cifrado:")}       AES-256-GCM en ~/.mint/session.enc`,
        "",
        `${theme.bold("MATRIZ DE PERMISOS POR ROL (RBAC):")}`,
        `${permIcon(hasPermission(role, "approve"))} Aprobar compras y decisiones (/approve, /inbox)`,
        `${permIcon(hasPermission(role, "dispatch"))} Despachar envíos de salida (/dispatch)`,
        `${permIcon(hasPermission(role, "receive"))} Recibir mercancía e inventario (/receive)`,
        `${permIcon(hasPermission(role, "manage_team"))} Invitar y gestionar miembros del equipo (/team)`,
        `${permIcon(hasPermission(role, "manage_channels"))} Configurar canales Discord / Slack / Telegram (/channels)`,
        `${permIcon(hasPermission(role, "configure_bot"))} Configuración general del bot y umbrales (/config)`,
      ],
      {
        title: "SESIÓN ACTIVA // CONTROL DE ACCESO (RBAC)",
        borderColor: theme.mint,
      },
    ),
  );
  console.log("");
}
