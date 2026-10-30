import { listTeamMembers, inviteTeamMember, removeTeamMember, hasPermission, type UserRole } from "@mint/core";
import { getSession } from "../keychain";
import { theme } from "../ui/theme";
import { renderTable } from "../ui/table";
import { drawDivider } from "../ui/box";

export async function teamCommand(
  action: "list" | "invite" | "remove" = "list",
  targetArg?: string,
  options: { name?: string; role?: UserRole; json?: boolean } = {},
) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  // 1. Invitar nuevo miembro al equipo
  if (action === "invite") {
    if (!hasPermission(session?.role, "manage_team")) {
      console.error(theme.redBold(`\n[ERROR] Permiso denegado: tu rol '${session?.role}' no tiene permiso para invitar miembros al equipo. Se requiere 'owner' o 'admin'.\n`));
      return;
    }

    const email = targetArg;
    if (!email) {
      console.error(theme.redBold("[ERROR] Debes indicar el correo electrónico. Ejemplo: mint team invite colega@empresa.com --name 'Carlos' --role finance"));
      return;
    }
    const name = options.name || email.split("@")[0];
    const role = options.role || "operator";

    try {
      const res = await inviteTeamMember({
        companyId,
        email,
        name,
        role,
      });

      if (options.json) {
        console.log(JSON.stringify(res, null, 2));
      } else {
        if (res.success) {
          console.log(`\n${theme.success("[OK]")} ${theme.bold(res.message)}\n`);
        } else {
          console.error(theme.redBold(`[ERROR] Error: ${res.message}`));
        }
      }
      return;
    } catch (err: any) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: err.message }));
      } else {
        console.error(theme.redBold(`[ERROR] Error al invitar usuario: ${err.message}`));
      }
      return;
    }
  }

  // 2. Eliminar miembro del equipo
  if (action === "remove") {
    if (!hasPermission(session?.role, "manage_team")) {
      console.error(theme.redBold(`\n[ERROR] Permiso denegado: tu rol '${session?.role}' no tiene permiso para eliminar miembros del equipo. Se requiere 'owner' o 'admin'.\n`));
      return;
    }

    const userId = targetArg;
    if (!userId) {
      console.error(theme.redBold("[ERROR] Debes indicar el ID del usuario a eliminar. Ejemplo: mint team remove usr_12345"));
      return;
    }

    try {
      const res = await removeTeamMember({ companyId, userId });
      if (options.json) {
        console.log(JSON.stringify(res, null, 2));
      } else {
        if (res.success) {
          console.log(`\n${theme.success("[OK]")} ${theme.bold(res.message)}\n`);
        } else {
          console.error(theme.redBold(`[ERROR] Error: ${res.message}`));
        }
      }
      return;
    } catch (err: any) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: err.message }));
      } else {
        console.error(theme.redBold(`[ERROR] Error al eliminar usuario: ${err.message}`));
      }
      process.exit(1);
    }
  }

  // 3. Listar miembros del equipo (default: list)
  try {
    const members = await listTeamMembers(companyId);

    if (options.json) {
      console.log(JSON.stringify(members, null, 2));
      return;
    }

    console.log("\n" + drawDivider(`EQUIPO Y CONTROL DE ACCESO (RBAC) [${companyId}]`, 86));

    if (members.length === 0) {
      console.log(`\n  ${theme.dim("(No hay miembros registrados en este tenant)")}\n`);
      return;
    }

    const rows = members.map((m) => {
      const roleBadge =
        m.role === "owner"
          ? theme.badge("OWNER", "mint")
          : m.role === "admin"
            ? theme.badge("ADMIN_NEGOCIO", "cyan")
            : m.role === "supervisor"
              ? theme.badge("SUPERVISOR", "cyan")
              : m.role === "client"
                ? theme.badge("CLIENTE", "gray")
                : m.role === "finance"
                  ? theme.badge("FINANCE/PAGOS", "mint")
                  : m.role === "operator"
                    ? theme.badge("OPERATOR", "cyan")
                    : m.role === "driver"
                      ? theme.badge("DRIVER", "violet")
                      : m.role === "auditor"
                        ? theme.badge("AUDITOR", "amber")
                        : theme.badge("VIEWER", "gray");

      const dateStr = m.createdAt ? new Date(m.createdAt).toLocaleDateString("es-MX") : "N/A";

      return {
        id: theme.dim(m.id),
        name: theme.bold(m.name),
        email: m.email,
        role: roleBadge,
        date: dateStr,
      };
    });

    console.log(
      renderTable(
        [
          { header: "USER ID", key: "id", width: 14 },
          { header: "NOMBRE", key: "name", width: 22 },
          { header: "CORREO", key: "email", width: 28 },
          { header: "ROL", key: "role", width: 16, align: "center" },
          { header: "ALTA", key: "date", width: 12, align: "center" },
        ],
        rows,
      ),
    );

    console.log(`\n  ${theme.dim("Total miembros:")} ${theme.bold(members.length)} │ ${theme.dim("Invitar:")} ${theme.mintBold("mint team invite <correo> --name <nombre> --role <finance|auditor|operator|viewer>")}\n`);
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ error: err.message }));
    } else {
      console.error(theme.redBold(`[ERROR] Error al listar miembros: ${err.message}`));
    }
    process.exit(1);
  }
}
