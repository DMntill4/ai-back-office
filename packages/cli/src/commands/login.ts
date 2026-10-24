import { db, users, companies } from "@mint/core";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { saveSession } from "../keychain";
import { theme } from "../ui/theme";
import { drawCard } from "../ui/box";

export async function loginCommand(email?: string, password?: string, options: { json?: boolean } = {}) {
  const targetEmail = (email || "admin@mint.local").toLowerCase().trim();
  try {
    const foundUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, targetEmail))
      .limit(1);

    if (foundUsers.length === 0) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: "Usuario no encontrado" }));
      } else {
        console.error(theme.redBold(`[ERROR] Error de autenticacion: Usuario '${targetEmail}' no encontrado.`));
        console.log(`  ${theme.dim("Ejecuta 'npm start' para iniciar el asistente de bienvenida y registrar tu perfil.")}\n`);
      }
      process.exit(1);
    }

    const u = foundUsers[0];
    const [comp] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, u.companyId))
      .limit(1);

    const token = `mint_jwt_${randomUUID()}`;

    await saveSession({
      token,
      userId: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      companyId: u.companyId,
      companyName: comp?.name || u.companyId,
      savedAt: new Date().toISOString(),
    });

    if (options.json) {
      console.log(JSON.stringify({ success: true, user: u, companyId: u.companyId }));
    } else {
      console.log("");
      console.log(
        drawCard(
          [
            `${theme.dim("Usuario:")}   ${theme.bold(u.name)} (${u.email})`,
            `${theme.dim("Rol:")}       ${theme.badge(u.role.toUpperCase(), "cyan")}`,
            `${theme.dim("Empresa:")}   ${theme.mintBold(comp?.name || u.companyId)} [ID: ${u.companyId}]`,
            `${theme.dim("Keychain:")}  Token cifrado con AES-256-GCM y guardado localmente.`,
          ],
          {
            title: "AUTENTICACION EXITOSA",
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
      console.error(theme.redBold(`[ERROR] Error al conectar con base de datos: ${err.message}`));
    }
    process.exit(1);
  }
}
