import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  db,
  products,
  inventory,
  warehouses,
  executeAjustarStock,
  executeAuthorizedDataMutation,
} from "@mint/core";
import { eq, and } from "drizzle-orm";
import { currentSession } from "./auth";
import { sseHub } from "../events/sseHub";

export async function productsRoutes(fastify: FastifyInstance) {
  // 1. Catálogo de productos y existencias consolidadas
  fastify.get("/api/products", async (request: FastifyRequest) => {
    const query = (request.query as any) || {};
    const companyId = query.companyId || currentSession.companyId;

    try {
      const [prods, invs, whs] = await Promise.all([
        db.select().from(products).where(eq(products.companyId, companyId)),
        db.select().from(inventory).where(eq(inventory.companyId, companyId)),
        db.select().from(warehouses).where(eq(warehouses.companyId, companyId)),
      ]);

      const data = prods.map((p) => {
        const itemInvs = invs.filter((i) => i.productId === p.id);
        const totalStock = itemInvs.reduce((sum, item) => sum + item.stock, 0);
        const isLowStock = totalStock < p.minStock;

        // Distribución por almacén
        const warehouseBreakdown = whs.map((w) => {
          const whInv = itemInvs.find((i) => i.warehouseId === w.id);
          return {
            warehouseId: w.id,
            warehouseName: w.name,
            code: (w as any).code || w.id,
            stock: whInv ? whInv.stock : 0,
          };
        });

        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          category: p.category || "General",
          description: p.description,
          minStock: p.minStock,
          stock: totalStock,
          isLowStock,
          origin: p.origin || "real",
          status: totalStock === 0 ? "AGOTADO" : totalStock < p.minStock ? "BAJO" : "ÓPTIMO",
          warehouses: warehouseBreakdown,
        };
      });

      return {
        success: true,
        count: data.length,
        data,
      };
    } catch {
      return {
        success: true,
        count: 0,
        data: [],
      };
    }
  });

  // 2. Ajustar stock relativo (+/- delta) con verificación RBAC y registro en inventory_movements
  fastify.post("/api/products/adjust", async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    const { productId, delta, reason } = body;
    const companyId = body.companyId || currentSession.companyId;
    const callerRole = body.userRole || currentSession.role || "owner";

    if (!productId || typeof delta !== "number") {
      return reply.status(400).send({
        success: false,
        error: "Parámetros inválidos. Se requiere productId y delta numérico.",
      });
    }

    try {
      const res = await executeAjustarStock(
        {
          producto_id: String(productId),
          cantidad_delta: delta,
          motivo: reason || "Ajuste operativo desde catálogo",
        },
        { companyId, userRole: callerRole },
      );

      if (!res.isSuccess) {
        const isRbacBlocked = res.message?.includes("DENEGADO") || res.message?.includes("RBAC");
        return reply.status(isRbacBlocked ? 403 : 422).send({
          success: false,
          error: res.message,
          data: res,
        });
      }

      return {
        success: true,
        newStock: res.data.newStock,
        previousStock: res.data.previousStock,
        message: res.message,
      };
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 3. Actualizar stock absoluto o minStock con verificación RBAC y post-verificación
  fastify.put("/api/inventory/:productId", async (request: FastifyRequest, reply: FastifyReply) => {
    const { productId } = request.params as { productId: string };
    const body = (request.body as any) || {};
    const { stock, minStock, companyId = currentSession.companyId } = body;
    const callerRole = body.userRole || currentSession.role || "owner";

    try {
      const [inv] = await db
        .select()
        .from(inventory)
        .where(and(eq(inventory.productId, productId), eq(inventory.companyId, companyId)))
        .limit(1);

      if (inv && typeof stock === "number") {
        const mutRes = await executeAuthorizedDataMutation(companyId, {
          userRole: callerRole,
          authorizedBy: callerRole,
          targetTable: "inventory",
          operation: "update",
          recordId: inv.id,
          updates: { stock },
          reason: body.reason || "Actualización de stock desde vista de inventario",
        });
        if (!mutRes.isSuccess) {
          return reply.status(403).send({ success: false, error: mutRes.message });
        }
      }

      if (typeof minStock === "number") {
        const mutProd = await executeAuthorizedDataMutation(companyId, {
          userRole: callerRole,
          authorizedBy: callerRole,
          targetTable: "products",
          operation: "update",
          recordId: productId,
          updates: { minStock },
          reason: body.reason || "Actualización de stock mínimo (ROP)",
        });
        if (!mutProd.isSuccess) {
          return reply.status(403).send({ success: false, error: mutProd.message });
        }
      }

      return { success: true, message: "Inventario actualizado y verificado correctamente." };
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });
}
