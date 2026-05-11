import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../middleware/auth.js";

export function usageRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get("/metrics", authenticateToken, async (req: any, res) => {
    const orgId = req.user.orgId;

    try {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        include: { planObj: true }
      });

      if (!org) return res.status(404).json({ error: "Organization not found" });

      const plan = org.planObj;

      // Calcular uso atual
      const [users, clients, leads, automations] = await Promise.all([
        prisma.user.count({ where: { organizationId: orgId } }),
        prisma.client.count({ where: { organizationId: orgId } }),
        prisma.lead.count({ where: { organizationId: orgId } }),
        prisma.automation.count({ where: { organizationId: orgId } }),
      ]);

      res.json({
        plan: {
          name: plan?.name || "Free",
          limits: {
            maxUsers: plan?.maxUsers || 5,
            maxClients: plan?.maxClients || 10,
            maxLeads: plan?.maxLeads || 100,
            maxAutomations: plan?.maxAutomations || 5,
          }
        },
        usage: {
          users,
          clients,
          leads,
          automations
        },
        status: org.subscriptionStatus,
        trialEndsAt: org.trialEndsAt
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch usage metrics" });
    }
  });

  return router;
}
