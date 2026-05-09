import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import bcrypt from "bcryptjs";

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
          name: req.body.corporateName || req.body.name || undefined,
          domain: req.body.domain,
          groqKey: req.body.groqKey,
          serpApiKey: req.body.serpApiKey,
          serperApiKey: req.body.serperApiKey,
          outscraperKey: req.body.outscraperKey
        }
      });
      res.json(org);
    } catch (error) {
      res.status(500).json({ error: "Failed to update organization profile" });
    }
  });

  // Get Organization Settings (AI Keys, etc)
  router.get("/settings", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: {
          geminiKey: true,
          groqKey: true,
          serpApiKey: true,
          serperApiKey: true,
          outscraperKey: true,
          aiProvider: true
        }
      });
      res.json(org);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // Update Organization Settings
  router.patch("/settings", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const { geminiKey, groqKey, serpApiKey, serperApiKey, outscraperKey, aiProvider } = req.body;
      const org = await prisma.organization.update({
        where: { id: orgId },
        data: { geminiKey, groqKey, serpApiKey, serperApiKey, outscraperKey, aiProvider }
      });
      res.json(org);
    } catch (error) {
      res.status(500).json({ error: "Failed to update settings" });
    }
  });
  // Get Team Members
  router.get("/team", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const users = await prisma.user.findMany({
        where: { organizationId: orgId },
        select: { id: true, name: true, email: true, role: true, department: true, createdAt: true, status: true }
      });
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch team members" });
    }
  });

  // Create Team Member
  router.post("/team", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });
    if (req.user?.role !== 'ORG_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: "Acesso negado." });
    }

    const { name, email, role, department } = req.body;

    // Prevenção de Escalabilidade de Privilégios
    if (role === 'SUPER_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: "Apenas Super Admins podem criar outros Super Admins." });
    }

    try {
      const user = await prisma.user.create({
        data: {
          name,
          email,
          role: role || 'USER',
          department: department || 'GERAL',
          organizationId: orgId,
          password: await bcrypt.hash('nexus123', 10)
        }
      });
      res.json(user);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create team member" });
    }
  });

  // Update Team Member
  router.patch("/team/:id", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });
    if (req.user?.role !== 'ORG_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: "Acesso negado." });
    }

    const { name, email, role, department, password, status } = req.body;

    // Prevenção de Escalabilidade de Privilégios
    if (role === 'SUPER_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: "Apenas Super Admins podem promover usuários a Super Admin." });
    }

    try {
      const updateData: any = { name, email, role, department, status };

      if (password && password.trim() !== "") {
        updateData.password = await bcrypt.hash(password, 10);
      }

      const user = await prisma.user.update({
        where: { id: req.params.id, organizationId: orgId },
        data: updateData
      });
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to update team member" });
    }
  });

  // Delete Team Member
  router.delete("/team/:id", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });
    if (req.user?.role !== 'ORG_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: "Acesso negado." });
    }

    try {
      const user = await prisma.user.findFirst({
        where: { id: req.params.id, organizationId: orgId }
      });

      if (!user) return res.status(404).json({ error: "Membro não encontrado." });
      if (user.role === 'ORG_ADMIN') return res.status(400).json({ error: "Não é possível excluir o administrador da organização." });

      await prisma.user.delete({
        where: { id: req.params.id, organizationId: orgId }
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete team member" });
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
