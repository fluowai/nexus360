import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { getPagination } from "../utils/pagination.js";
import { AuthRequest } from "../middleware/auth.js";

export function crmRoutes(prisma: PrismaClient) {
  const router = Router();

  // Listar leads
  router.get("/leads", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });
    const { skip, take } = getPagination(req.query);
    try {
      const [leads, total] = await Promise.all([
        prisma.lead.findMany({
          where: { organizationId: orgId },
          skip, take, 
          include: { followUps: true },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.lead.count({ where: { organizationId: orgId } })
      ]);
      res.json({ leads, total });
    } catch (error) {
      console.error("[LEADS_GET]", error);
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  // Buscar detalhes de um lead
  router.get("/leads/:id", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const lead = await prisma.lead.findUnique({
        where: { id: req.params.id },
        include: { followUps: { orderBy: { createdAt: 'desc' } } }
      });

      if (!lead || lead.organizationId !== orgId) {
        return res.status(404).json({ error: "Lead not found" });
      }

      res.json(lead);
    } catch (error) {
      console.error("[LEAD_DETAIL_GET]", error);
      res.status(500).json({ error: "Failed to fetch lead details" });
    }
  });

  // Criar lead
  router.post("/leads", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const { name, email, phone, status, value, source, notes, tags } = req.body;

    try {
      const lead = await prisma.lead.create({
        data: {
          name, email, phone, status: status || 'novo', 
          value: parseFloat(value) || 0, source, notes, tags,
          organizationId: orgId,
          assignedToId: req.user?.id
        }
      });
      res.json(lead);
    } catch (error) {
      console.error("[LEAD_POST]", error);
      res.status(500).json({ error: "Failed to create lead" });
    }
  });

  // Atualizar lead
  router.patch("/leads/:id", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const { name, email, phone, status, value, source, notes, tags } = req.body;

    try {
      const existingLead = await prisma.lead.findUnique({ where: { id: req.params.id } });
      if (!existingLead || existingLead.organizationId !== orgId) {
        return res.status(404).json({ error: "Lead not found" });
      }

      const lead = await prisma.lead.update({
        where: { id: req.params.id },
        data: {
          name, email, phone, status, 
          value: value !== undefined ? parseFloat(value) : undefined, 
          source, notes, tags
        }
      });
      res.json(lead);
    } catch (error) {
      console.error("[LEAD_PATCH]", error);
      res.status(500).json({ error: "Failed to update lead" });
    }
  });

  // Adicionar FollowUp
  router.post("/leads/:id/followups", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const { type, content, scheduledAt } = req.body;

    try {
      const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
      if (!lead || lead.organizationId !== orgId) {
        return res.status(404).json({ error: "Lead not found" });
      }

      const followUp = await prisma.followUp.create({
        data: {
          leadId: req.params.id,
          type,
          content,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null
        }
      });
      res.json(followUp);
    } catch (error) {
      console.error("[FOLLOWUP_POST]", error);
      res.status(500).json({ error: "Failed to add follow up" });
    }
  });

  // Fechar Venda (Win)
  router.post("/leads/:id/win", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    const userId = req.user?.id;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const { corporateName, respEmail, product, setupValue, monthlyValue, paymentMethod, billingDay, contractTerm, scope, additionalClauses } = req.body;

    try {
      const result = await prisma.$transaction(async (tx) => {
        await tx.lead.update({ where: { id: req.params.id }, data: { status: 'fechado' } });

        const client = await tx.client.create({
          data: {
            corporateName, email: respEmail, status: 'onboarding', organizationId: orgId, assignedToId: userId
          }
        });

        const soldProduct = await tx.soldProduct.create({
          data: {
            clientId: client.id, name: product, setupValue: parseFloat(setupValue) || 0,
            monthlyValue: parseFloat(monthlyValue) || 0, paymentMethod,
            billingDay: parseInt(billingDay) || 5, contractTerm: parseInt(contractTerm) || 12,
            status: 'onboarding'
          }
        });

        await tx.contract.create({
          data: {
            clientId: client.id, soldProductId: soldProduct.id, status: 'draft',
            organizationId: orgId,
            contractData: { scope, additionalClauses, generatedAt: new Date() }
          }
        });

        return { clientId: client.id, soldProductId: soldProduct.id };
      });
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error("[LEAD_WIN]", error);
      res.status(500).json({ error: error.message || "Falha ao processar fechamento de venda" });
    }
  });

  return router;
}
