import { getPendingDecisionsApi, resolveDecisionApi } from "../client";
import { getSession } from "../keychain";

export async function inboxCommand(
  action?: "list" | "approve" | "reject",
  targetId?: string,
  options: { json?: boolean } = {},
) {
  const session = await getSession();
  const companyId = session?.companyId || "comp_default";

  // Si se solicita aprobar
  if (action === "approve" && targetId) {
    try {
      const res = await resolveDecisionApi(targetId, "approve", session?.name || "CLI_OPERATOR");
      if (options.json) {
        console.log(JSON.stringify(res));
      } else {
        if (res.success) {
          console.log(`\n✅ Decisión ${targetId} APROBADA.`);
          console.log(`   ${res.message}`);
          console.log(`   Post-verificación en PostgreSQL confirmada.\n`);
        } else {
          console.error(`❌ Falló la aprobación: ${res.message}`);
        }
      }
      return;
    } catch (err: any) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: err.message }));
      } else {
        console.error(`❌ Error al aprobar decisión: ${err.message}`);
      }
      process.exit(1);
    }
  }

  // Si se solicita rechazar
  if (action === "reject" && targetId) {
    try {
      const res = await resolveDecisionApi(targetId, "reject", session?.name || "CLI_OPERATOR");
      if (options.json) {
        console.log(JSON.stringify(res));
      } else {
        console.log(`\n⚠️ Decisión ${targetId} RECHAZADA y archivada.\n`);
      }
      return;
    } catch (err: any) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: err.message }));
      } else {
        console.error(`❌ Error al rechazar decisión: ${err.message}`);
      }
      process.exit(1);
    }
  }

  // Por defecto: listar decisiones pendientes (inbox list)
  try {
    const res = await getPendingDecisionsApi(companyId);
    if (!res.success) {
      throw new Error("No se pudieron cargar las decisiones pendientes");
    }

    if (options.json) {
      console.log(JSON.stringify(res.data, null, 2));
      return;
    }

    console.log(`\n📥 BANDEJA DE DECISIONES PENDIENTES [Empresa: ${companyId}]`);
    if (res.data.length === 0) {
      console.log(`   ✨ No hay decisiones pendientes de supervisión humana.\n`);
      return;
    }

    console.log(`   ${res.data.length} decisión(es) esperando autorización:\n`);
    for (let i = 0; i < res.data.length; i++) {
      const d = res.data[i];
      const evidence = d.evidence || {};
      const risk = d.risk || {};

      console.log(`[#${i + 1}] ID: ${d.id}`);
      console.log(`    Título:     ${d.title}`);
      console.log(`    Agente:     ${d.proposingAgent}`);
      console.log(`    Costo:      $${d.costMxn.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`);
      console.log(`    Riesgo:     ${(d.riskScore * 100).toFixed(0)}%`);
      console.log(`    Gobernanza: ${d.policyReason}`);
      console.log(`    Evidencia:  Stock: ${evidence.currentStock ?? "0"}u | Déficit: ${evidence.deficit ?? "N/A"}u | Prov: ${evidence.supplierName ?? "N/A"}`);
      if (risk.redFlags && risk.redFlags.length > 0) {
        console.log(`    Banderas:   ⚠️ ${risk.redFlags.join("; ")}`);
      }
      console.log(`    Comandos:   mint inbox approve ${d.id}  |  mint inbox reject ${d.id}\n`);
    }
  } catch (err: any) {
    if (options.json) {
      console.log(JSON.stringify({ error: err.message }));
    } else {
      console.error(`❌ Error al consultar inbox: ${err.message}`);
    }
    process.exit(1);
  }
}
