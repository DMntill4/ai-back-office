import { z } from "zod";
import { db } from "../db/client";
import { inventory, products, decisions } from "../db/schema";
import { eq, and, or, ilike } from "drizzle-orm";
import { triggerStockAlertIfLow } from "../worker/proactiveMonitor";
import { recordDecisionNote, appendDailyAuditLog } from "../services/obsidianMemoryService";
import { randomUUID } from "node:crypto";

export const ajustarStockSchema = z.object({
  producto_id: z
    .string()
    .describe("ID, SKU o nombre del producto a modificar stock (ej. 'prod_st200', 'SKU-MAN-SM400', 'Servomotor')"),
  cantidad_delta: z
    .number()
    .describe("Cantidad a sumar o restar del stock. Ejemplo: -5 para quitar 5 unidades, 10 para agregar 10."),
  motivo: z
    .string()
    .optional()
    .describe("Razon del ajuste de inventario (ej. 'Venta de mostrador', 'Ajuste por merma', 'Conteo manual')"),
});

export type AjustarStockInput = z.infer<typeof ajustarStockSchema>;

export interface AjustarStockContext {
  companyId?: string;
  userRole?: string;
  agentRole?: string;
  caller?: string;
  caseId?: string;
}

export interface AjustarStockSuccessData {
  productId: string;
  productName: string;
  sku: string;
  previousStock: number;
  newStock: number;
  minStock: number;
  isBelowMinimum: boolean;
  reason?: string;
  writeBackDetails?: string | null;
}

export type AjustarStockResult =
  | {
      isSuccess: true;
      verified: true;
      message: string;
      data: AjustarStockSuccessData;
      requiresApproval?: false;
    }
  | {
      isSuccess: false;
      verified: boolean;
      message: string;
      code?: string;
      requiresApproval?: boolean;
      decisionId?: string;
      canRetry?: boolean;
      data?: Partial<AjustarStockSuccessData> & {
        decisionId?: string;
        requestedDelta?: number;
        targetStock?: number;
        requiresApproval?: boolean;
        inboxRoute?: string;
      };
    };

export async function executeAjustarStock(
  args: AjustarStockInput,
  context?: AjustarStockContext,
): Promise<AjustarStockResult> {
  const effectiveCompanyId = context?.companyId || "comp_default";
  const callerRole = (context?.userRole || "operator").toLowerCase().trim();

  // 1. Validacion de limites numericos y valores anómalos o infinitos
  if (!Number.isFinite(args.cantidad_delta) || isNaN(args.cantidad_delta)) {
    return {
      isSuccess: false,
      verified: false,
      message: "La cantidad a ajustar debe ser un numero finito valido.",
    };
  }

  if (args.cantidad_delta === 0) {
    return {
      isSuccess: false,
      verified: false,
      message: "La cantidad a ajustar no puede ser cero.",
    };
  }

  if (Math.abs(args.cantidad_delta) > 1_000_000) {
    return {
      isSuccess: false,
      verified: false,
      message: "Cantidad de ajuste excede el rango operativo seguro permitido (maximo 1,000,000 unidades por movimiento).",
    };
  }

  // 1.5 ESCUDO RBAC PREVIO: Roles sin privilegios de escritura son rechazados de inmediato sin consultar BD
  if (callerRole === "viewer" || callerRole === "driver") {
    return {
      isSuccess: false,
      verified: false,
      code: "DENIED_INSUFFICIENT_PERMISSIONS",
      message: `Acceso denegado: El rol '${callerRole}' tiene privilegios unicamente de lectura/transporte y no puede alterar el inventario de la empresa.`,
    };
  }

  try {
    // 2. Validar que el producto existe en el catalogo de la empresa
    const prodList = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.companyId, effectiveCompanyId),
          or(
            eq(products.id, args.producto_id),
            ilike(products.sku, args.producto_id),
            ilike(products.name, `%${args.producto_id}%`),
          ),
        ),
      )
      .limit(1);

    if (prodList.length === 0) {
      return {
        isSuccess: false,
        verified: false,
        message: `No se encontro el producto '${args.producto_id}' en el catalogo de tu empresa. Verifica el SKU o nombre antes de ajustar existencias.`,
        canRetry: false,
      };
    }

    const product = prodList[0];

    // 3. Obtener existencias actuales en inventario
    const invItems = await db
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.productId, product.id),
          eq(inventory.companyId, effectiveCompanyId),
        ),
      )
      .limit(1);

    const previousStock = invItems.length > 0 ? invItems[0].stock : 0;

    // 4. ESCUDO ANTI-MANIPULACION Y GOBERNANZA OPERATIVA
    const isPrivileged = ["owner", "admin", "supervisor", "directivo", "gerente"].includes(callerRole);

    // Si NO es supervisor/owner (ej: operador, empleado estandar):
    // Bloquear cualquier creacion arbitraria de stock positivo (+delta) o movimientos mayores a 10 unidades
    if (!isPrivileged) {
      const isStockInflation = args.cantidad_delta > 0;
      const isLargeMovement = Math.abs(args.cantidad_delta) > 10;

      if (isStockInflation || isLargeMovement) {
        const decisionId = `dec_${randomUUID().slice(0, 8)}`;
        const caseId = context?.caseId || `case_stock_${Date.now()}`;
        const targetStock = previousStock + args.cantidad_delta;

        // Registrar propuesta en base de datos para revision en /inbox
        await db.insert(decisions).values({
          id: decisionId,
          companyId: effectiveCompanyId,
          caseId,
          actionType: "ajustar_stock",
          proposingAgent: "coordinador",
          title: `Propuesta de Ajuste de Stock: ${args.cantidad_delta > 0 ? "+" : ""}${args.cantidad_delta} u de '${product.name}'`,
          costMxn: "0",
          riskScore: isStockInflation ? "0.80" : "0.50",
          reversible: true,
          evidencePayload: {
            productId: product.id,
            sku: product.sku,
            productName: product.name,
            previousStock,
            requestedDelta: args.cantidad_delta,
            targetStock,
            reason: args.motivo || "Solicitud de ajuste directo por operador",
            requesterRole: callerRole,
            tamperGuardTriggered: true,
          },
          riskPayload: {
            riskScore: 0.8,
            redFlags: [
              "Intento de creacion de stock no autorizado por rol de empleado u operador",
              "Regla anti-manipulacion empresarial y control de fraudes activada",
            ],
          },
          policyDecision: "pending_approval",
          policyReason: `El rol '${callerRole}' no puede alterar existencias positivamente. Requiere firma y aprobacion de un supervisor u owner en /inbox.`,
        }).catch(() => {});

        // Persistir nota inmutable en Obsidian Vault
        try {
          await recordDecisionNote({
            id: decisionId,
            companyId: effectiveCompanyId,
            caseId,
            actionType: "ajustar_stock",
            proposingAgent: "coordinador",
            title: `Propuesta de Ajuste de Stock: ${args.cantidad_delta > 0 ? "+" : ""}${args.cantidad_delta} u de '${product.name}'`,
            costMxn: "0",
            riskScore: "0.80",
            policyDecision: "pending_approval",
            policyReason: `Intercepcion Anti-Tampering: Intento de inflar existencias por rol '${callerRole}'. Turnado a aprobacion formal.`,
            evidencePayload: {
              productId: product.id,
              sku: product.sku,
              previousStock,
              requestedDelta: args.cantidad_delta,
              reason: args.motivo || "Ajuste directo",
            },
          });

          await appendDailyAuditLog({
            companyId: effectiveCompanyId,
            action: "Escudo Anti-Manipulacion: Modificacion de stock no autorizada interceptada",
            details: `Rol '${callerRole}' solicito ${args.cantidad_delta > 0 ? "+" : ""}${args.cantidad_delta} u en '${product.name}' (SKU: ${product.sku}). Bloqueado y turnado a /inbox bajo propuesta ${decisionId}.`,
            timestamp: new Date(),
          });
        } catch {}

        return {
          isSuccess: false,
          verified: true,
          requiresApproval: true,
          decisionId,
          message: `[POLITICA DE SEGURIDAD EMPRESARIAL] La modificacion de existencias (${args.cantidad_delta > 0 ? "+" : ""}${args.cantidad_delta} u de '${product.name}') ha sido bloqueada para ejecucion directa por el rol '${callerRole}'. Para evitar fraudes y alteraciones no auditadas de inventario, se genero la propuesta formal en tu /inbox (ID: ${decisionId}) que requiere revision y firma digital de gerencia o supervisor.`,
          data: {
            decisionId,
            productName: product.name,
            sku: product.sku,
            previousStock,
            requestedDelta: args.cantidad_delta,
            targetStock,
            requiresApproval: true,
            inboxRoute: "/inbox",
          },
        };
      }

      // Si es un descuento menor permitido (<= 10 unidades por venta/merma), requiere motivo formal
      if (!args.motivo || args.motivo.trim().length < 4) {
        return {
          isSuccess: false,
          verified: false,
          message: "Se requiere especificar un motivo formal de al menos 4 caracteres para registrar el descuento de inventario (ej: 'Venta de mostrador', 'Merma fisica').",
        };
      }
    } else {
      // Para roles privilegiados (owner/admin/supervisor), todo cambio directo requiere motivo formal auditado
      if (!args.motivo || args.motivo.trim().length < 4) {
        return {
          isSuccess: false,
          verified: false,
          message: "Ajuste rechazado: Todo cambio directo de inventario por administracion requiere un motivo formal auditado de al menos 4 caracteres (ej: 'Ajuste de inventario fisico', 'Recepcion de embarque manual', 'Merma por embalaje').",
        };
      }
    }

    // 5. Aplicar la modificacion en PostgreSQL
    let newStock = 0;
    if (invItems.length === 0) {
      if (args.cantidad_delta < 0) {
        return {
          isSuccess: false,
          verified: false,
          message: `El producto '${product.name}' no tiene existencias registradas (stock actual: 0). No se pueden restar ${Math.abs(args.cantidad_delta)} unidades.`,
        };
      }
      newStock = args.cantidad_delta;
      await db.insert(inventory).values({
        id: `inv_${Date.now()}`,
        companyId: effectiveCompanyId,
        productId: product.id,
        warehouseId: "alm_central",
        stock: newStock,
      });
    } else {
      newStock = previousStock + args.cantidad_delta;
      if (newStock < 0) {
        return {
          isSuccess: false,
          verified: false,
          message: `Stock insuficiente. El producto '${product.name}' solo tiene ${previousStock} unidades disponibles. No es posible restar ${Math.abs(args.cantidad_delta)} unidades.`,
        };
      }

      await db
        .update(inventory)
        .set({ stock: newStock })
        .where(eq(inventory.id, invItems[0].id));
    }

    // 6. MOTOR DE ESCRITURA BIDIRECCIONAL (Write-Back a la fuente real: CSV, SQLite)
    let writeBackMessage = "";
    try {
      const ingestMod: any = await import("@mint/ingest");
      if (typeof ingestMod.writeBackStockUpdateToSource === "function") {
        const wbResult = await ingestMod.writeBackStockUpdateToSource({
          companyId: effectiveCompanyId,
          productId: product.id,
          sku: product.sku,
          newStock,
          reason: args.motivo || "Ajuste directo autorizado",
        });
        if (wbResult && wbResult.success && wbResult.updatedSources?.length > 0) {
          writeBackMessage = `Sincronizado bidireccionalmente con fuentes reales: [${wbResult.updatedSources.join(", ")}]`;
        }
      }
    } catch (wbErr: any) {
      console.warn("[AjustarStock] Aviso de sincronizacion hacia atras:", wbErr.message);
    }

    // 7. Evaluar alerta proactiva si el nuevo stock cae debajo del umbral de seguridad
    const isCritical = newStock < product.minStock;
    if (isCritical) {
      try {
        await triggerStockAlertIfLow(product.id, newStock, product.minStock, effectiveCompanyId);
      } catch {}
    }

    // 8. Registrar log de auditoria permanente en Obsidian Vault
    try {
      await appendDailyAuditLog({
        companyId: effectiveCompanyId,
        action: `Ajuste de Stock Ejecutado: ${product.name}`,
        details: `SKU: ${product.sku} | Cambio: ${previousStock} u -> ${newStock} u (Delta: ${args.cantidad_delta > 0 ? "+" : ""}${args.cantidad_delta} u) | Autor: ${callerRole} | Motivo: ${args.motivo || "Ajuste directo"}${writeBackMessage ? ` | ${writeBackMessage}` : ""}`,
        timestamp: new Date(),
      });
    } catch {}

    // 9. Despachar notificaciones a los canales configurados (Discord, Slack, Webhook, Telegram)
    try {
      const notifiersMod: any = await import("@mint/notifiers");
      if (typeof notifiersMod.dispatchStockLogNotification === "function") {
        await notifiersMod.dispatchStockLogNotification({
          companyId: effectiveCompanyId,
          type: isCritical ? "STOCK_CRITICAL" : "STOCK_UPDATE",
          title: isCritical
            ? `Desabasto Critico: ${product.name}`
            : `Ajuste de Stock: ${product.name}`,
          description: `Stock de '${product.name}' (SKU: ${product.sku}) cambio de ${previousStock} u a ${newStock} u (Delta: ${args.cantidad_delta > 0 ? "+" : ""}${args.cantidad_delta} u). Autor: ${callerRole}. Motivo: ${args.motivo || "Ajuste directo"}.${isCritical ? ` Minimo requerido: ${product.minStock} u.` : ""}${writeBackMessage ? ` ${writeBackMessage}.` : ""}`,
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantityDelta: args.cantidad_delta,
          previousStock,
          newStock,
          minStock: product.minStock,
          severity: isCritical ? "CRITICAL" : "INFO",
        });
      }
    } catch {}

    return {
      isSuccess: true,
      verified: true,
      message: `Stock actualizado y verificado con exito para '${product.name}' (SKU: ${product.sku}). Stock anterior: ${previousStock} u -> Nuevo stock: ${newStock} u.${writeBackMessage ? ` ${writeBackMessage}.` : ""}${isCritical ? " [AVISO] ATENCION: El stock quedo por debajo del minimo de seguridad (" + product.minStock + " u). Se genero una alerta de reposicion." : ""}`,
      data: {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        previousStock,
        newStock,
        minStock: product.minStock,
        isBelowMinimum: isCritical,
        reason: args.motivo || "Ajuste directo solicitado al agente",
        writeBackDetails: writeBackMessage || null,
      },
    };
  } catch (error) {
    return {
      isSuccess: false,
      verified: false,
      message: `Error al ajustar inventario: ${(error as Error).message}`,
    };
  }
}
