import { deleteSession, getSession } from "../keychain";

export async function logoutCommand(options: { json?: boolean } = {}) {
  const session = await getSession();
  const deleted = await deleteSession();

  if (options.json) {
    console.log(JSON.stringify({ success: true, loggedOut: deleted }));
  } else {
    if (session) {
      console.log(`\n🚪 Sesión cerrada para ${session.email} (${session.companyName}). Token eliminado del keychain.\n`);
    } else {
      console.log(`\nℹ️ No había una sesión activa guardada.\n`);
    }
  }
}

export async function whoamiCommand(options: { json?: boolean } = {}) {
  const session = await getSession();

  if (!session) {
    if (options.json) {
      console.log(JSON.stringify({ authenticated: false }));
    } else {
      console.log("\n⚠️ No has iniciado sesión. Ejecuta `mint login` para autenticarte.\n");
    }
    return;
  }

  if (options.json) {
    console.log(JSON.stringify({ authenticated: true, session }));
  } else {
    console.log(`\n👤 Sesión Activa (Almacenada en Keychain):`);
    console.log(`   Usuario:     ${session.name} <${session.email}>`);
    console.log(`   Rol:         ${session.role}`);
    console.log(`   Empresa ID:  ${session.companyId} (${session.companyName})`);
    console.log(`   Guardado:    ${new Date(session.savedAt).toLocaleString("es-MX")}\n`);
  }
}
