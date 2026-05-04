import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";

export function projectRoutes(prisma: PrismaClient) {
  const router = Router();

  // List projects
  router.get("/", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const projects = await prisma.project.findMany({
        where: { organizationId: orgId },
        include: { 
          tasks: true,
          client: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  // Create project
  router.post("/", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const project = await prisma.project.create({
        data: {
          ...req.body,
          organizationId: orgId
        }
      });
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  // Update project
  router.patch("/:id", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const project = await prisma.project.update({
        where: { id: req.params.id, organizationId: orgId },
        data: req.body
      });
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  return router;
}
