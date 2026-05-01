import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth";

export function orgSettingsRoutes(prisma: PrismaClient) {
  const router = Router();

  router.use((req, res, next) => {
    console.log(`[OrgSettings] ${req.method} ${req.path}`);
    next();
  });

  // Get Agency Profile
  router.get("/profile", async (req: AuthRequest, res) => {
    let orgId = req.user?.orgId;
    
    // Test Fallback
    if (!orgId) {
      const firstOrg = await prisma.organization.findFirst();
      orgId = firstOrg?.id;
    }

    if (!orgId) return res.status(401).json({ error: "Unauthorized or no org found" });

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
    const { corporateName, tradeName, cnpj, email, phone, website, address } = req.body;

    try {
      const org = await prisma.organization.update({
        where: { id: orgId },
        data: { corporateName, tradeName, cnpj, email, phone, website, address }
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

  // Create Contract Template (Limit 4)
  router.post("/templates", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });
    const { name, content, category } = req.body;

    try {
      const count = await prisma.contractTemplate.count({ where: { organizationId: orgId } });
      if (count >= 4) {
        return res.status(400).json({ error: "Limite de 4 modelos atingido." });
      }

      const template = await prisma.contractTemplate.create({
        data: {
          name,
          content,
          category,
          organizationId: orgId
        }
      });
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to create template" });
    }
  });

  // Delete Contract Template
  router.delete("/templates/:id", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      await prisma.contractTemplate.delete({
        where: { 
          id: req.params.id,
          organizationId: orgId 
        }
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete template" });
    }
  });

  return router;
}
