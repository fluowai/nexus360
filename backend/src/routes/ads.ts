import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";

export function adsRoutes(prisma: PrismaClient) {
  const router = Router();
  
  // Listar Contas de Anúncios
  router.get("/ad-accounts", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    try {
      const accounts = await prisma.adAccount.findMany({
        where: { organizationId: orgId },
        orderBy: { accountName: 'asc' }
      });
      res.json(accounts);
    } catch (error) {
      next(error);
    }
  });

  // Cadastrar Conta de Anúncios
  router.post("/ad-accounts", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const { name, accountName, platform, accountId, status, accountStatus, accessToken } = req.body;
    try {
      const account = await prisma.adAccount.create({
        data: {
          accountName: accountName || name,
          platform,
          accountId,
          accountStatus: accountStatus || status || 'active',
          accessToken,
          organizationId: orgId
        }
      });
      res.json(account);
    } catch (error) {
      next(error);
    }
  });

  router.patch("/ad-accounts/:id", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const { accountName, platform, accountStatus, accessToken, dailySpendLimit } = req.body;
    try {
      const existing = await prisma.adAccount.findFirst({
        where: { id: req.params.id, organizationId: orgId }
      });
      if (!existing) return res.status(404).json({ error: "Conta de anúncio não encontrada" });

      const account = await prisma.adAccount.update({
        where: { id: req.params.id },
        data: {
          accountName,
          platform,
          accountStatus,
          accessToken,
          dailySpendLimit: dailySpendLimit !== undefined ? Number(dailySpendLimit) || 0 : undefined
        }
      });
      res.json(account);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/ad-accounts/:id", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const existing = await prisma.adAccount.findFirst({
        where: { id: req.params.id, organizationId: orgId }
      });
      if (!existing) return res.status(404).json({ error: "Conta de anúncio não encontrada" });

      await prisma.adAccount.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // Listar Campanhas (Simplificado para gestão interna)
  router.get("/campaigns-ads", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    try {
      const campaigns = await prisma.campaign.findMany({
        where: { organizationId: orgId },
        include: { creatives: true },
        orderBy: { createdAt: 'desc' }
      });
      res.json(campaigns.map((campaign) => ({
        ...campaign,
        platform: campaign.utmSource || campaign.type || "manual",
        objective: campaign.type,
        budgetType: "total",
        budgetAmount: campaign.budget,
        spendAmount: campaign.spent
      })));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/campaigns-ads/:id", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const existing = await prisma.campaign.findFirst({
        where: { id: req.params.id, organizationId: orgId }
      });
      if (!existing) return res.status(404).json({ error: "Campanha não encontrada" });

      const campaign = await prisma.campaign.update({
        where: { id: req.params.id },
        data: {
          status: req.body.status,
          budget: req.body.budgetAmount !== undefined ? Number(req.body.budgetAmount) || 0 : undefined,
          spent: req.body.spendAmount !== undefined ? Number(req.body.spendAmount) || 0 : undefined
        }
      });
      res.json({
        ...campaign,
        platform: campaign.utmSource || campaign.type || "manual",
        objective: campaign.type,
        budgetType: "total",
        budgetAmount: campaign.budget,
        spendAmount: campaign.spent
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
