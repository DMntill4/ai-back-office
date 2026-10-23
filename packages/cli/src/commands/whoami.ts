import { deleteSession, getSession } from "../keychain";
import { theme } from "../ui/theme";
import { drawCard } from "../ui/box";

export async function logoutCommand(options: { json?: boolean } = {}) {
  const session = await getSession();
  const deleted = await deleteSession();

  if (options.json) {
    console.log(JSON.stringify({ success: true, loggedOut: deleted }));
  } else {
    if (session) {
      console.log(`\n${theme.success("🚪")} Sesión cerrada para ${theme.bold(session.email)} (${session.companyName}). Token eliminado del keychain.\n`);
    } else {
      console.log(`\n${theme.dim("ℹ No había una sesión activa guardada.")}\n`);
    }
  }
}

export async function whoamiCommand(options: { json?: boolean } = {}) {
  const session = await getSession();

  if (!session) {
    if (options.json) {
      console.log(JSON.stringify({ authenticated: false }));
    } else {
      console.log(`\n${theme.warning("⚠")} No has iniciado sesión. Ejecuta ${theme.mintBold("mint login")} para autenticarte.\n`);
    }
    return;
  }

  if (options.json) {
    console.log(JSON.stringify({ authenticated: true, session }));
  } else {
    console.log("");
    console.log(
      drawCard(
        [
          `${theme.dim("Usuario:")}    ${theme.bold(session.name)} <${session.email}>`,
          `${theme.dim("Rol:")}        ${theme.badge(session.role.toUpperCase(), "cyan")}`,
          `${theme.dim("Empresa ID:")} ${theme.mintBold(session.companyId)} (${session.companyName})`,
          `${theme.dim("Cifrado:")}    AES-256-GCM en ~/.mint/session.enc`,
          `${theme.dim("Sesión:")}     Guardada el ${new Date(session.savedAt).toLocaleString("es-MX")}`,
        ],
        {
          title: "SESIÓN ACTIVA // KEYCHAIN SEGURO",
          borderColor: theme.mint,
        },
      ),
    );
    console.log("");
  }
}
