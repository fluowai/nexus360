import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "../../middleware/auth.js";

export function adminPlansRoutes(prisma: PrismaClient) {
  const router = Router();

  // Middleware de proteção Super Admin
  const requireSuperAdmin = (req: any, res: any, next: any) => {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: "Acesso restrito ao Super Administrador." });
    }
    next();
  };

  router.use(authenticateToken, requireSuperAdmin);

  // Listar Planos
  router.get("/", async (req, res) => {
    const plans = await prisma.plan.findMany({
      include: { planFeatures: true }
    });
    res.json(plans);
  });

  // Criar Plano
  router.post("/", async (req, res) => {
    const { name, slug, description, priceMonthly, priceYearly, ...limits } = req.body;
    try {
      const plan = await prisma.plan.create({
        data: {
          name,
          slug: slug || name.toLowerCase().replace(/ /g, '-'),
          description,
          priceMonthly: parseInt(priceMonthly),
          priceYearly: parseInt(priceYearly),
          maxUsers: parseInt(limits.maxUsers) || 5,
          maxClients: parseInt(limits.maxClients) || 10,
          maxLeads: parseInt(limits.maxLeads) || 100,
          maxAutomations: parseInt(limits.maxAutomations) || 5,
          maxReports: parseInt(limits.maxReports) || 10,
          maxIntegrations: parseInt(limits.maxIntegrations) || 3,
          maxMessages: parseInt(limits.maxMessages) || 1000,
        }
      });
      res.json(plan);
    } catch (error) {
      res.status(500).json({ error: "Erro ao criar plano." });
    }
  });

  // Atualizar Plano
  router.patch("/:id", async (req, res) => {
    const { name, slug, description, priceMonthly, priceYearly, ...limits } = req.body;
    try {
      const plan = await prisma.plan.update({
        where: { id: req.params.id },
        data: {
          name,
          slug,
          description,
          priceMonthly: priceMonthly ? parseInt(priceMonthly) : undefined,
          priceYearly: priceYearly ? parseInt(priceYearly) : undefined,
          maxUsers: limits.maxUsers ? parseInt(limits.maxUsers) : undefined,
          maxClients: limits.maxClients ? parseInt(limits.maxClients) : undefined,
          maxLeads: limits.maxLeads ? parseInt(limits.maxLeads) : undefined,
          maxAutomations: limits.maxAutomations ? parseInt(limits.maxAutomations) : undefined,
          maxReports: limits.maxReports ? parseInt(limits.maxReports) : undefined,
          maxIntegrations: limits.maxIntegrations ? parseInt(limits.maxIntegrations) : undefined,
          maxMessages: limits.maxMessages ? parseInt(limits.maxMessages) : undefined,
        }
      });
      res.json(plan);
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar plano." });
    }
  });

  // Gerenciar Features do Plano
  router.post("/:id/features", async (req, res) => {
    const { featureKey, isEnabled, limit } = req.body;
    try {
      const planFeature = await prisma.planFeature.upsert({
        where: {
          planId_featureKey: {
            planId: req.params.id,
            featureKey
          }
        },
        update: { isEnabled, limit },
        create: {
          planId: req.params.id,
          featureKey,
          isEnabled,
          limit
        }
      });
      res.json(planFeature);
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar feature do plano." });
    }
  });

  // Listar todas as features disponíveis para a matriz
  router.get("/features-list", async (req, res) => {
    const modules = await prisma.module.findMany({
      include: { features: true }
    });
    res.json(modules);
  });

  return router;
}
