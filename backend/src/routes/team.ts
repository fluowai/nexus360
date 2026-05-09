import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import bcrypt from "bcryptjs";

export function teamRoutes(prisma: PrismaClient) {
  const router = Router();

  // List organization members
  router.get("/members", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (req.user?.role !== 'ORG_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: "Acesso negado." });
    }

    try {
      const members = await prisma.user.findMany({
        where: { organizationId: orgId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          permissions: true,
          accessProfileId: true,
          accessProfile: { select: { name: true } },
          createdAt: true
        }
      });
      res.json(members);
    } catch (error) {
      res.status(500).json({ error: "Falha ao buscar membros da equipe." });
    }
  });

  // Create new member
  router.post("/members", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (req.user?.role !== 'ORG_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: "Acesso negado." });
    }

    let { name, email, password, role, permissions, accessProfileId } = req.body;

    // Prevenção de Escalabilidade de Privilégios
    if (role === 'SUPER_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: "Apenas Super Admins podem criar outros Super Admins." });
    }

    try {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) return res.status(400).json({ error: "E-mail já cadastrado." });

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: role || 'USER',
          permissions: permissions || {},
          accessProfileId: accessProfileId || null,
          organizationId: orgId,
          status: 'ACTIVE'
        }
      });

      res.status(201).json(user);
    } catch (error) {
      res.status(500).json({ error: "Falha ao criar membro." });
    }
  });

  // Update member permissions
  router.patch("/members/:id/permissions", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (req.user?.role !== 'ORG_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: "Acesso negado." });
    }

    let { permissions, accessProfileId, role, status } = req.body;

    // Prevenção de Escalabilidade de Privilégios
    if (role === 'SUPER_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: "Apenas Super Admins podem promover usuários a Super Admin." });
    }

    try {
      const user = await prisma.user.findFirst({
        where: { id: req.params.id, organizationId: orgId }
      });

      if (!user) return res.status(404).json({ error: "Membro não encontrado." });

      const updatedUser = await prisma.user.update({
        where: { id: req.params.id },
        data: { 
          ...(permissions !== undefined && { permissions }),
          ...(accessProfileId !== undefined && { accessProfileId }),
          ...(role !== undefined && { role }),
          ...(status !== undefined && { status }),
        }
      });

      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ error: "Falha ao atualizar permissões." });
    }
  });

  // Delete member
  router.delete("/members/:id", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (req.user?.role !== 'ORG_ADMIN' && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: "Acesso negado." });
    }

    try {
      const user = await prisma.user.findFirst({
        where: { id: req.params.id, organizationId: orgId }
      });

      if (!user) return res.status(404).json({ error: "Membro não encontrado." });
      if (user.role === 'ORG_ADMIN') return res.status(400).json({ error: "Não é possível excluir o administrador da organização." });

      await prisma.user.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Falha ao excluir membro." });
    }
  });

  return router;
}
