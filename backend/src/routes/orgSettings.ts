import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";

export function orgSettingsRoutes(prisma: PrismaClient) {
  const router = Router();

  // Get Agency Profile
  router.get("/profile", async (req: AuthRequest, res) => {
    let orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const org = await prisma.organization.findUnique({
        where: { id: orgId }
      });
      res.json(org);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch organization profile" });
    }
  });

  // Update Agency Profile
  router.patch("/profile", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const org = await prisma.organization.update({
        where: { id: orgId },
        data: {
          name: req.body.corporateName || req.body.name,
          domain: req.body.domain
        }
      });
      res.json(org);
    } catch (error) {
      res.status(500).json({ error: "Failed to update organization profile" });
    }
  });

  // Get Team Members
  router.get("/team", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const users = await prisma.user.findMany({
        where: { organizationId: orgId },
        select: { id: true, name: true, email: true, role: true, createdAt: true }
      });
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch team members" });
    }
  });

  // Get Contract Templates
  router.get("/templates", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const templates = await prisma.contractTemplate.findMany({
        where: { organizationId: orgId },
        take: 4,
        orderBy: { createdAt: 'desc' }
      });
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  return router;
}
