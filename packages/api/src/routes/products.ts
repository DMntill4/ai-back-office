import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  db,
  products,
  inventory,
  warehouses,
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
            code: w.code,
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

  // 2. Ajustar stock relativo (+/- delta)
  fastify.post("/api/products/adjust", async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    const { productId, delta, warehouseId } = body;
    const companyId = body.companyId || currentSession.companyId;

    if (!productId || typeof delta !== "number") {
      return reply.status(400).send({
        success: false,
        error: "Parámetros inválidos. Se requiere productId y delta numérico.",
      });
    }

    try {
      const existing = await db
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.productId, productId),
            eq(inventory.companyId, companyId),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        const newStock = Math.max(0, existing[0].stock + delta);
        await db
          .update(inventory)
          .set({ stock: newStock, updatedAt: new Date() })
          .where(eq(inventory.id, existing[0].id));

        // Obtener datos del producto para la alerta
        const [prod] = await db.select().from(products).where(eq(products.id, productId)).limit(1);

        if (prod && newStock < prod.minStock) {
          sseHub.broadcast({
            type: "inventory_alert",
            agent: "Módulo Inventario [PostgreSQL]",
            action: "quiebre_detectado",
            details: `Stock crítico en ${prod.name} (${prod.sku}): ${newStock} uds (Mínimo: ${prod.minStock}).`,
            resultSummary: "Alerta propagada para reabastecimiento",
            payload: { productId, sku: prod.sku, newStock, minStock: prod.minStock },
          });
        }

        return { success: true, newStock, previousStock: existing[0].stock };
      }

      return reply.status(404).send({
        success: false,
        error: "Producto no encontrado en inventario físico de la empresa.",
      });
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // 3. Actualizar stock absoluto
  fastify.put("/api/inventory/:productId", async (request: FastifyRequest, reply: FastifyReply) => {
    const { productId } = request.params as { productId: string };
    const body = (request.body as any) || {};
    const { stock, minStock, companyId = currentSession.companyId } = body;

    try {
      const [inv] = await db
        .select()
        .from(inventory)
        .where(and(eq(inventory.productId, productId), eq(inventory.companyId, companyId)))
        .limit(1);

      if (inv && typeof stock === "number") {
        await db
          .update(inventory)
          .set({ stock, updatedAt: new Date() })
          .where(eq(inventory.id, inv.id));
      }

      if (typeof minStock === "number") {
        await db
          .update(products)
          .set({ minStock })
          .where(eq(products.id, productId));
      }

      return { success: true, message: "Inventario actualizado correctamente." };
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });
}
