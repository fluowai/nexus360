import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import { vercelService } from "../services/vercel.js";

export function domainRoutes(prisma: PrismaClient) {
  const router = Router();

  // List organization domains
  router.get("/", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const domains = await prisma.domain.findMany({
        where: { organizationId: orgId }
      });
      res.json(domains);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch domains" });
    }
  });

  // Add new domain
  router.post("/", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    const { name, provider } = req.body; // provider: 'vercel' | 'directadmin'

    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      // 1. Register in Database
      const domain = await prisma.domain.create({
        data: {
          name,
          provider,
          status: 'pending',
          organizationId: orgId
        }
      });

      // 2. Call External API
      if (provider === 'vercel') {
        await vercelService.addDomain(name);
      } else if (provider === 'directadmin') {
        // TODO: Implement DirectAdmin logic
      }

      res.json(domain);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to add domain" });
    }
  });

  return router;
}
