import { loginApi } from "../client";
import { saveSession } from "../keychain";
import { theme } from "../ui/theme";
import { drawCard } from "../ui/box";

export async function loginCommand(email?: string, password?: string, options: { json?: boolean } = {}) {
  const targetEmail = email || "admin@mint.local";
  try {
    const res = await loginApi(targetEmail, password);
    if (!res.success) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: "Credenciales inválidas" }));
      } else {
        console.error(theme.redBold("❌ Error de autenticación: Credenciales inválidas."));
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
      console.log("");
      console.log(
        drawCard(
          [
            `${theme.dim("Usuario:")}   ${theme.bold(res.user.name)} (${res.user.email})`,
            `${theme.dim("Rol:")}       ${theme.badge(res.user.role.toUpperCase(), "cyan")}`,
            `${theme.dim("Empresa:")}   ${theme.mintBold(res.user.companyName)} [ID: ${res.user.companyId}]`,
            `${theme.dim("Keychain:")}  Token cifrado con AES-256-GCM y guardado localmente.`,
          ],
          {
            title: "AUTENTICACIÓN EXITOSA",
            badge: "CONECTADO",
            badgeColor: "mint",
            borderColor: theme.mint,
          },
        ),
      );
      console.log("");
    }
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ success: false, error: err.message }));
    } else {
      console.error(theme.redBold(`❌ Error al conectar con el servidor: ${err.message}`));
    }
    process.exit(1);
  }
}
