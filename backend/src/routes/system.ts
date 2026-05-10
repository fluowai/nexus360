import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";

export function systemRoutes(prisma: PrismaClient) {
  const router = Router();

  // Buscar configurações globais
  router.get("/settings", async (req: AuthRequest, res) => {
    try {
      let settings = await prisma.systemSettings.findUnique({ where: { id: "global" } });
      
      if (!settings) {
        settings = await prisma.systemSettings.create({
          data: { id: "global", crmPublic: false, salesMachinePublic: false, agentBuilderPublic: false }
        });
      }
      
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar configurações do sistema" });
    }
  });

  // Atualizar configurações (Super Admin apenas)
  router.patch("/settings", async (req: AuthRequest, res) => {
    if (req.user?.role !== 'SUPER_ADMIN') return res.status(403).json({ error: "Acesso negado" });
    
    const { crmPublic, salesMachinePublic, agentBuilderPublic } = req.body;
    
    try {
      const settings = await prisma.systemSettings.upsert({
        where: { id: "global" },
        update: {
          ...(crmPublic !== undefined && { crmPublic }),
          ...(salesMachinePublic !== undefined && { salesMachinePublic }),
          ...(agentBuilderPublic !== undefined && { agentBuilderPublic })
        },
        create: {
          id: "global",
          crmPublic: crmPublic || false,
          salesMachinePublic: salesMachinePublic || false,
          agentBuilderPublic: agentBuilderPublic || false
        }
      });
      
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar configurações" });
    }
  });

  return router;
}
