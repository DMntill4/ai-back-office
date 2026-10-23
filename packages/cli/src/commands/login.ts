import { loginApi } from "../client";
import { saveSession, getSession } from "../keychain";

export async function loginCommand(email?: string, password?: string, options: { json?: boolean } = {}) {
  const targetEmail = email || "admin@mint.local";
  try {
    const res = await loginApi(targetEmail, password);
    if (!res.success) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: "Credenciales inválidas" }));
      } else {
        console.error("❌ Error de autenticación: Credenciales inválidas.");
      }
      process.exit(1);
    }

    await saveSession({
      token: res.token,
      userId: res.user.id,
      email: res.user.email,
      name: res.user.name,
      role: res.user.role,
      companyId: res.user.companyId,
      companyName: res.user.companyName,
      savedAt: new Date().toISOString(),
    });

    if (options.json) {
      console.log(JSON.stringify({ success: true, user: res.user, companyId: res.user.companyId }));
    } else {
      console.log(`\n✅ Sesión iniciada con éxito.`);
      console.log(`   Usuario:   ${res.user.name} (${res.user.email})`);
      console.log(`   Rol:       ${res.user.role}`);
      console.log(`   Empresa:   ${res.user.companyName} [ID: ${res.user.companyId}]`);
      console.log(`   Token:     Guardado de forma segura en el keychain del sistema.\n`);
    }
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ success: false, error: err.message }));
    } else {
      console.error(`❌ Error al conectar con el servidor: ${err.message}`);
    }
    process.exit(1);
  }
}
