import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { getPagination } from "../utils/pagination.js";
import { AuthRequest } from "../middleware/auth.js";

export function crmRoutes(prisma: PrismaClient) {
  const router = Router();

  router.post("/leads/:id/win", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    const userId = req.user?.id;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const { corporateName, respEmail, product, setupValue, monthlyValue, paymentMethod, billingDay, contractTerm, scope, additionalClauses } = req.body;

    try {
      const result = await prisma.$transaction(async (tx) => {
        await tx.lead.update({ where: { id: req.params.id }, data: { status: 'fechado' } });

        const client = await tx.client.create({
          data: {
            corporateName, email: respEmail, status: 'onboarding', organizationId: orgId, assignedToId: userId
          }
        });

        const soldProduct = await tx.soldProduct.create({
          data: {
            clientId: client.id, name: product, setupValue: parseFloat(setupValue) || 0,
            monthlyValue: parseFloat(monthlyValue) || 0, paymentMethod,
            billingDay: parseInt(billingDay) || 5, contractTerm: parseInt(contractTerm) || 12,
            status: 'onboarding'
          }
        });

        await tx.contract.create({
          data: {
            clientId: client.id, soldProductId: soldProduct.id, status: 'draft',
            organizationId: orgId,
            contractData: { scope, additionalClauses, generatedAt: new Date() }
          }
        });

        return { clientId: client.id, soldProductId: soldProduct.id };
      });
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Falha ao processar fechamento de venda" });
    }
  });

  router.get("/leads", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });
    const { skip, take } = getPagination(req.query);
    try {
      const [leads, total] = await Promise.all([
        prisma.lead.findMany({
          where: { organizationId: orgId },
          skip, take, orderBy: { createdAt: 'desc' }
        }),
        prisma.lead.count({ where: { organizationId: orgId } })
      ]);
      res.json({ leads, total });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  return router;
}
