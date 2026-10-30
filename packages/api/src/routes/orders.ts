import { FastifyInstance, FastifyRequest } from "fastify";
import {
  db,
  purchaseOrders,
  products,
  suppliers,
  listCompanyOrders,
  listCompanySalesSummary,
  getCustomersPortfolio,
} from "@mint/core";
import { eq, desc } from "drizzle-orm";
import { currentSession } from "./auth";

export async function ordersRoutes(fastify: FastifyInstance) {
  // 0. Órdenes consolidadas con inteligencia de flota (fleetAndOrdersService)
  fastify.get("/api/orders/summary", async (request: FastifyRequest) => {
    const query = (request.query as any) || {};
    const companyId = query.companyId || currentSession.companyId;

    try {
      const data = await listCompanyOrders(companyId, query.status);
      const limit = Number(query.limit) || 50;
      const limited = data.slice(0, limit);
      return { success: true, count: limited.length, data: limited };
    } catch (err: any) {
      return {
        success: false,
        count: 0,
        data: [],
        message: `Error al consolidar órdenes: ${err.message}`,
      };
    }
  });

  // 0.1 Resumen de ventas por canal
  fastify.get("/api/orders/sales-summary", async (request: FastifyRequest) => {
    const query = (request.query as any) || {};
    const companyId = query.companyId || currentSession.companyId;

    try {
      const data = await listCompanySalesSummary(companyId);
      return { success: true, data };
    } catch (err: any) {
      return {
        success: false,
        data: null,
        message: `Error al calcular el resumen de ventas: ${err.message}`,
      };
    }
  });

  // 0.2 Cartera de clientes
  fastify.get("/api/orders/customers", async (request: FastifyRequest) => {
    const query = (request.query as any) || {};
    const companyId = query.companyId || currentSession.companyId;

    try {
      const data = await getCustomersPortfolio(companyId);
      return { success: true, count: data.customers.length, data };
    } catch (err: any) {
      return {
        success: false,
        count: 0,
        data: null,
        message: `Error al calcular la cartera de clientes: ${err.message}`,
      };
    }
  });
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
          humanApproved: (po as any).humanApproved ?? true,
          trackingNumber: (po as any).trackingNumber || `TRK-PO-${po.id.slice(0, 6)}`,
          carrier: (po as any).carrier || "Transportes Coordinadora S.A.S.",
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
