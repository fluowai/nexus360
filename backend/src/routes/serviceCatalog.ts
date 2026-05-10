import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";

export function serviceCatalogRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get("/", async (req: AuthRequest, res) => {
    try {
      const { category } = req.query;
      const where: any = { organizationId: req.user!.orgId };
      if (category) where.category = category;
      const services = await prisma.serviceCatalog.findMany({ where, orderBy: { name: "asc" } });
      res.json(services);
    } catch (error) {
      console.error("[SERVICE_CATALOG_LIST_ERROR]", error);
      res.status(500).json({ error: "Erro ao listar catálogo" });
    }
  });

  router.post("/", async (req: AuthRequest, res) => {
    try {
      const { name, description, category, type, setupValue, monthlyValue, commissionValue, estimatedHours, deliveryDays, requiresApproval } = req.body;
      if (!name) return res.status(400).json({ error: "Nome é obrigatório" });
      const service = await prisma.serviceCatalog.create({
        data: { name, description, category, type: type || "service", setupValue: setupValue || 0, monthlyValue: monthlyValue || 0, commissionValue: commissionValue || 0, estimatedHours, deliveryDays, requiresApproval, organizationId: req.user!.orgId },
      });
      res.json(service);
    } catch (error) {
      console.error("[SERVICE_CATALOG_CREATE_ERROR]", error);
      res.status(500).json({ error: "Erro ao criar serviço" });
    }
  });

  router.patch("/:id", async (req: AuthRequest, res) => {
    try {
      const { name, description, category, type, setupValue, monthlyValue, commissionValue, estimatedHours, deliveryDays, requiresApproval, isActive } = req.body;
      const data: any = {};
      if (name) data.name = name;
      if (description !== undefined) data.description = description;
      if (category) data.category = category;
      if (type) data.type = type;
      if (setupValue !== undefined) data.setupValue = setupValue;
      if (monthlyValue !== undefined) data.monthlyValue = monthlyValue;
      if (commissionValue !== undefined) data.commissionValue = commissionValue;
      if (estimatedHours !== undefined) data.estimatedHours = estimatedHours;
      if (deliveryDays !== undefined) data.deliveryDays = deliveryDays;
      if (requiresApproval !== undefined) data.requiresApproval = requiresApproval;
      if (isActive !== undefined) data.isActive = isActive;
      const result = await prisma.serviceCatalog.updateMany({
        where: { id: req.params.id, organizationId: req.user!.orgId },
        data,
      });
      if (!result.count) return res.status(404).json({ error: "Serviço não encontrado" });
      res.json({ success: true });
    } catch (error) {
      console.error("[SERVICE_CATALOG_UPDATE_ERROR]", error);
      res.status(500).json({ error: "Erro ao atualizar serviço" });
    }
  });

  router.delete("/:id", async (req: AuthRequest, res) => {
    try {
      const result = await prisma.serviceCatalog.deleteMany({
        where: { id: req.params.id, organizationId: req.user!.orgId },
      });
      if (!result.count) return res.status(404).json({ error: "Serviço não encontrado" });
      res.json({ success: true });
    } catch (error) {
      console.error("[SERVICE_CATALOG_DELETE_ERROR]", error);
      res.status(500).json({ error: "Erro ao deletar serviço" });
    }
  });

  return router;
}
