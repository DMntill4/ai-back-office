import { FastifyInstance, FastifyRequest } from "fastify";
import {
  db,
  purchaseOrders,
  products,
  suppliers,
} from "@mint/core";
import { eq, desc } from "drizzle-orm";
import { currentSession } from "./auth";

export async function ordersRoutes(fastify: FastifyInstance) {
  // 1. Listar órdenes de compra
  fastify.get("/api/orders", async (request: FastifyRequest) => {
    const query = (request.query as any) || {};
    const companyId = query.companyId || currentSession.companyId;

    try {
      const [allPos, prods, supps] = await Promise.all([
        db
          .select()
          .from(purchaseOrders)
          .where(eq(purchaseOrders.companyId, companyId))
          .orderBy(desc(purchaseOrders.createdAt))
          .limit(50),
        db.select().from(products).where(eq(products.companyId, companyId)),
        db.select().from(suppliers).where(eq(suppliers.companyId, companyId)),
      ]);

      const prodMap = new Map(prods.map((p) => [p.id, p]));
      const suppMap = new Map(supps.map((s) => [s.id, s]));

      const data = allPos.map((po) => {
        const prod = prodMap.get(po.productId);
        const supp = suppMap.get(po.supplierId);
        const totalNum = Number(po.totalAmount || 0);

        return {
          orderId: po.id,
          sku: prod?.sku || "N/A",
          productName: prod?.name || "Suministro Industrial",
          provider: supp?.name || "Distribuidor Mayorista",
          amountMXN: po.totalAmount,
          amountFormatted: `$${totalNum.toLocaleString("es-CO", { minimumFractionDigits: 0 })} COP`,
          quantity: po.quantity,
          status: po.status,
          humanApproved: po.humanApproved ?? true,
          trackingNumber: po.trackingNumber,
          carrier: po.carrier,
          createdAt: po.createdAt,
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
}
