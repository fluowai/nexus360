import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";

export function clientRoutes(prisma: PrismaClient) {
  const router = Router();

  // List all clients for the organization
  router.get("/", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const clients = await prisma.client.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' }
      });
      res.json(clients);
    } catch (error) {
      next(error);
    }
  });

  // Get specific client details
  router.get("/:id", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    try {
      const client = await prisma.client.findFirst({
        where: { 
          id: req.params.id,
          organizationId: orgId
        },
        include: {
          opportunities: true,
          contracts: true
        }
      });
      if (!client) return res.status(404).json({ error: "Cliente não encontrado" });
      res.json(client);
    } catch (error) {
      next(error);
    }
  });

  // Create a new client manually
  router.post("/", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const client = await prisma.client.create({
        data: {
          ...req.body,
          organizationId: orgId,
          status: req.body.status || 'prospect'
        }
      });
      res.json(client);
    } catch (error) {
      next(error);
    }
  });

  // Update client
  router.patch("/:id", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    try {
      const client = await prisma.client.update({
        where: { 
          id: req.params.id,
          organizationId: orgId
        },
        data: req.body
      });
      res.json(client);
    } catch (error) {
      next(error);
    }
  });

  // Visão 360 Completa do Cliente
  router.get("/:id/full", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    try {
      const client = await prisma.client.findFirst({
        where: { 
          id: req.params.id,
          organizationId: orgId
        },
        include: {
          contracts: { orderBy: { createdAt: 'desc' } },
          invoices: { orderBy: { dueDate: 'desc' } },
          demands: { orderBy: { createdAt: 'desc' } },
          soldProducts: true,
          proposals: { orderBy: { createdAt: 'desc' } }
        }
      });
      if (!client) return res.status(404).json({ error: "Cliente não encontrado" });
      res.json(client);
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id/context", async (req: AuthRequest, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Unauthorized" });
      
      const context = await prisma.clientAIContext.findFirst({
        where: { 
          clientId: req.params.id,
          client: {
            organizationId: req.user.orgId
          }
        }
      });
      res.json(context);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
