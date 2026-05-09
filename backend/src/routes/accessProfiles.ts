import { Router } from "express";
import { PrismaClient } from "@prisma/client";

export function accessProfileRoutes(prisma: PrismaClient) {
  const router = Router();

  // GET /api/access-profiles
  router.get("/", async (req: any, res) => {
    try {
      const orgId = req.user.orgId;
      if (!orgId) return res.status(400).json({ error: "No organization linked to user." });

      const profiles = await prisma.accessProfile.findMany({
        where: { organizationId: orgId },
        include: {
          _count: {
            select: { users: true }
          }
        },
        orderBy: { createdAt: "desc" }
      });

      res.json(Array.isArray(profiles) ? profiles : []);
    } catch (error) {
      console.error("[GET_ACCESS_PROFILES_ERROR]", error);
      res.status(500).json({ error: "Failed to fetch access profiles" });
    }
  });

  // POST /api/access-profiles
  router.post("/", async (req: any, res) => {
    try {
      const orgId = req.user.orgId;
      if (!orgId) return res.status(400).json({ error: "No organization linked to user." });

      const { name, description, permissions } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }

      const profile = await prisma.accessProfile.create({
        data: {
          name,
          description,
          permissions: permissions || {},
          organizationId: orgId
        }
      });

      res.status(201).json(profile);
    } catch (error) {
      console.error("[CREATE_ACCESS_PROFILE_ERROR]", error);
      res.status(500).json({ error: "Failed to create access profile" });
    }
  });

  // PUT /api/access-profiles/:id
  router.put("/:id", async (req: any, res) => {
    try {
      const orgId = req.user.orgId;
      const { id } = req.params;
      const { name, description, permissions } = req.body;

      // Verifies organization scope
      const existing = await prisma.accessProfile.findFirst({
        where: { id, organizationId: orgId }
      });

      if (!existing) {
        return res.status(404).json({ error: "Profile not found" });
      }

      const profile = await prisma.accessProfile.update({
        where: { id },
        data: {
          name,
          description,
          permissions
        }
      });

      res.json(profile);
    } catch (error) {
      console.error("[UPDATE_ACCESS_PROFILE_ERROR]", error);
      res.status(500).json({ error: "Failed to update access profile" });
    }
  });

  // DELETE /api/access-profiles/:id
  router.delete("/:id", async (req: any, res) => {
    try {
      const orgId = req.user.orgId;
      const { id } = req.params;

      const existing = await prisma.accessProfile.findFirst({
        where: { id, organizationId: orgId },
        include: {
          _count: {
            select: { users: true }
          }
        }
      });

      if (!existing) {
        return res.status(404).json({ error: "Profile not found" });
      }

      if (existing._count.users > 0) {
        return res.status(400).json({ 
          error: "Não é possível excluir este plano pois existem usuários vinculados a ele." 
        });
      }

      await prisma.accessProfile.delete({
        where: { id }
      });

      res.json({ success: true });
    } catch (error) {
      console.error("[DELETE_ACCESS_PROFILE_ERROR]", error);
      res.status(500).json({ error: "Failed to delete access profile" });
    }
  });

  return router;
}
