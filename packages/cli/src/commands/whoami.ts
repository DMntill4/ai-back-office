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
      console.log(`\n  [OK] Sesion cerrada para ${theme.bold(session.email)} (${session.companyName}). Token eliminado del keychain.\n`);
    } else {
      console.log(`\n  ${theme.dim("No habia una sesion activa guardada.")}\n`);
    }
  }
}

export async function whoamiCommand(options: { json?: boolean } = {}) {
  const session = await getSession();

  if (!session) {
    if (options.json) {
      console.log(JSON.stringify({ authenticated: false }));
    } else {
      console.log(`\n  [AVISO] No has iniciado sesion. Ejecuta ${theme.mintBold("npm start")} o ${theme.mintBold("mint login")} para autenticarte.\n`);
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
