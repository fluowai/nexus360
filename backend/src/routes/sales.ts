import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import { proposalAI } from "../services/proposalAI.js";
import { v4 as uuidv4 } from 'uuid';

export function salesRoutes(prisma: PrismaClient) {
  const router = Router();

  // Listar Fila de Vendas (Queue)
  router.get("/queue", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    try {
      const queue = await prisma.lead.findMany({
        where: { 
          organizationId: orgId,
          status: { in: ['novo', 'contato'] }
        },
        orderBy: { updatedAt: 'desc' }
      });
      res.json(Array.isArray(queue) ? queue : []);
    } catch (error) {
      console.error("[SALES_QUEUE_ERROR]", error);
      res.status(500).json({ error: "Erro ao buscar fila de vendas" });
    }
  });

  // Listar Propostas da Organização
  router.get("/proposals", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    try {
      const proposals = await prisma.proposal.findMany({
        where: { organizationId: orgId },
        include: { client: { select: { corporateName: true } }, lead: { select: { name: true } } },
        orderBy: { createdAt: 'desc' }
      });
      res.json(proposals);
    } catch (error) {
      next(error);
    }
  });

  // Gerar Proposta com IA
  router.post("/proposals/generate", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    const { niche, clientName, services } = req.body;
    
    if (!niche || !clientName) {
      return res.status(400).json({ error: "Nicho e nome do cliente são obrigatórios." });
    }

    try {
      const config = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { groqKey: true }
      });
  
      if (!config?.groqKey) {
        return res.status(400).json({ error: "Configure sua chave do Groq para usar a IA." });
      }

      const content = await proposalAI.generate(niche, clientName, services || [], config.groqKey);
      res.json(content);
    } catch (error: any) {
      console.error("[SALES_PROPOSAL_GENERATE_ERROR]", error);
      res.status(500).json({ 
        error: "Falha ao gerar proposta", 
        details: error.message 
      });
    }
  });

  // Salvar Proposta Final
  router.post("/proposals", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    const { title, clientId, leadId, content, logoUrl, footerText } = req.body;

    try {
      const proposal = await prisma.proposal.create({
        data: {
          title,
          slug: uuidv4().substring(0, 8), // Gera um link único curto
          organizationId: orgId!,
          clientId,
          leadId,
          content,
          logoUrl,
          footerText,
          status: 'sent'
        }
      });
      res.json(proposal);
    } catch (error) {
      next(error);
    }
  });

  // Buscar Detalhes
  router.get("/proposals/:id", async (req: AuthRequest, res, next) => {
    try {
      const proposal = await prisma.proposal.findUnique({
        where: { id: req.params.id },
        include: { client: true, lead: true }
      });
      res.json(proposal);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
