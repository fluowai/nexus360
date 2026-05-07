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
        orderBy: { name: 'asc' }
      });
      res.json(accounts);
    } catch (error) {
      next(error);
    }
  });

  // Cadastrar Conta de Anúncios
  router.post("/ad-accounts", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    const { name, platform, accountId, status } = req.body;
    try {
      const account = await prisma.adAccount.create({
        data: {
          name,
          platform, // facebook, google, tiktok
          externalId: accountId,
          status: status || 'ativa',
          organizationId: orgId as string
        }
      });
      res.json(account);
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
      res.json(campaigns);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
