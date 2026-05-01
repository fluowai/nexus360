import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";

export function clientRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get("/", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const clients = await prisma.client.findMany({
        where: { organizationId: orgId },
        select: { id: true, corporateName: true, tradeName: true, segment: true },
        orderBy: { tradeName: 'asc' }
      });
      res.json(clients);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  router.get("/:id/context", async (req: AuthRequest, res) => {
    try {
      const context = await prisma.clientAIContext.findUnique({
        where: { clientId: req.params.id }
      });
      res.json(context);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch context" });
    }
  });

  return router;
}
