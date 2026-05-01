import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.ts";

export function clientRoutes(prisma: PrismaClient) {
  const router = Router();

  // List all clients for the organization
  router.get("/", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const clients = await prisma.client.findMany({
        where: { organizationId: orgId },
        select: {
          id: true,
          corporateName: true,
          tradeName: true,
          segment: true
        },
        orderBy: { tradeName: 'asc' }
      });
      res.json(clients);
    } catch (error) {
      console.error("[CLIENTS ERROR] Failed to fetch clients:", error);
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  // Get specific client context
  router.get("/:id/context", async (req: AuthRequest, res) => {
    const { id } = req.params;
    try {
      const context = await prisma.clientAIContext.findUnique({
        where: { clientId: id }
      });
      res.json(context);
    } catch (error) {
      console.error("[CLIENTS ERROR] Failed to fetch context:", error);
      res.status(500).json({ error: "Failed to fetch context" });
    }
  });

  return router;
}
