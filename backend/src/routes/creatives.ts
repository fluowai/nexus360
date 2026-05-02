import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";

export function creativeRoutes(prisma: PrismaClient) {
  const router = Router();

  // Listar todos os criativos da organização
  router.get("/", async (req: AuthRequest, res) => {
    try {
      const creatives = await prisma.creative.findMany({
        where: {
          organizationId: req.user?.orgId
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      res.json(creatives);
    } catch (error) {
      console.error("[CREATIVES_GET]", error);
      res.status(500).json({ error: "Erro ao buscar criativos" });
    }
  });

  // Criar novo criativo
  router.post("/", async (req: AuthRequest, res) => {
    const { title, type, contentUrl, copyText, campaignId } = req.body;
    
    if (!title || !type) {
      return res.status(400).json({ error: "Título e tipo são obrigatórios" });
    }

    try {
      const creative = await prisma.creative.create({
        data: {
          title,
          type,
          contentUrl,
          copyText,
          campaignId,
          organizationId: req.user?.orgId as string
        }
      });
      res.json(creative);
    } catch (error) {
      console.error("[CREATIVES_POST]", error);
      res.status(500).json({ error: "Erro ao criar criativo" });
    }
  });

  // Atualizar status do criativo
  router.patch("/:id", async (req: AuthRequest, res) => {
    const { status, feedback } = req.body;
    
    try {
      const existingCreative = await prisma.creative.findUnique({
        where: { id: req.params.id }
      });

      if (!existingCreative || existingCreative.organizationId !== req.user?.orgId) {
        return res.status(404).json({ error: "Criativo não encontrado" });
      }

      const creative = await prisma.creative.update({
        where: { id: req.params.id },
        data: {
          status,
          feedback
        }
      });

      res.json(creative);
    } catch (error) {
      console.error("[CREATIVES_PATCH]", error);
      res.status(500).json({ error: "Erro ao atualizar criativo" });
    }
  });

  // Deletar criativo
  router.delete("/:id", async (req: AuthRequest, res) => {
    try {
      const creative = await prisma.creative.findUnique({
        where: { id: req.params.id }
      });

      if (!creative || creative.organizationId !== req.user?.orgId) {
        return res.status(404).json({ error: "Criativo não encontrado" });
      }

      await prisma.creative.delete({
        where: { id: req.params.id }
      });

      res.json({ success: true });
    } catch (error) {
      console.error("[CREATIVES_DELETE]", error);
      res.status(500).json({ error: "Erro ao deletar criativo" });
    }
  });

  return router;
}
