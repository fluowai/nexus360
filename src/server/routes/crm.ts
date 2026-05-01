import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { getPagination } from "../utils/pagination.ts";
import { AuthRequest } from "../middleware/auth.ts";

export function crmRoutes(prisma: PrismaClient) {
  console.log("[CRM] Registrando rotas de Leads...");
  const router = Router();

  // --- ROTAS DE ALTA PRIORIDADE (Específicas) ---

  // Win Lead - Transação completa
  router.post("/leads/:id/win", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    const userId = req.user?.id;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const { 
      corporateName, tradeName, cnpj, emailFinance, website, city, state, address,
      respName, respCpf, respEmail, respPhone, respRole,
      product, setupValue, monthlyValue, paymentMethod, billingDay, contractTerm,
      scope, additionalClauses
    } = req.body;

    try {
      const result = await prisma.$transaction(async (tx) => {
        await tx.lead.update({
          where: { id: req.params.id },
          data: { status: 'fechado' }
        });

        const client = await tx.client.create({
          data: {
            corporateName, tradeName, cnpj, email: respEmail, website, 
            city, state, address, responsibleName: respName, responsibleCpf: respCpf,
            responsibleEmail: respEmail, responsiblePhone: respPhone, responsibleRole: respRole,
            status: 'onboarding', organizationId: orgId, assignedToId: userId
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

        if (product === 'Tráfego Pago' || product === 'Funil Completo') {
          const defaultDemands = [
            { title: 'Diagnóstico e Análise de Mercado', aiAgentType: 'DIAGNOSIS', priority: 'high' },
            { title: 'Definição de ICP e Personas', aiAgentType: 'ICP', priority: 'high' },
            { title: 'Criação de Copywriting (Anúncios/Vendas)', aiAgentType: 'COPY', priority: 'medium' },
            { title: 'Briefing de Criativos e Direção Visual', aiAgentType: 'CREATIVE', priority: 'medium' },
            { title: 'Planejamento de Canais e Estratégia', aiAgentType: 'STRATEGY', priority: 'medium' }
          ];
          for (const d of defaultDemands) {
            await tx.demand.create({
              data: {
                title: d.title, aiAgentType: d.aiAgentType, priority: d.priority,
                clientId: client.id, soldProductId: soldProduct.id, status: 'pending'
              }
            });
          }
        }
        return { clientId: client.id, soldProductId: soldProduct.id };
      });
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error("Win Lead Transaction Error:", error);
      res.status(500).json({ error: error.message || "Falha ao processar fechamento de venda" });
    }
  });

  router.get("/sold-services", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });
    try {
      const services = await prisma.soldProduct.findMany({
        where: { client: { organizationId: orgId } },
        include: { client: true },
        orderBy: { createdAt: 'desc' }
      });
      res.json(services);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sold services" });
    }
  });

  router.get("/clients/:id/full", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });
    try {
      const client = await prisma.client.findFirst({
        where: { id: req.params.id, organizationId: orgId },
        include: {
          soldProducts: { include: { contracts: true } },
          contracts: { orderBy: { createdAt: 'desc' } },
          demands: { orderBy: { createdAt: 'desc' } },
          aiContext: true
        }
      });
      if (!client) return res.status(404).json({ error: "Client not found" });
      res.json(client);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch full client details" });
    }
  });

  // --- ROTAS PADRÃO (Leads) ---

  router.patch("/leads/:id", async (req: AuthRequest, res) => {
    const { status, value, name, email, phone } = req.body;
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });
    try {
      const lead = await prisma.lead.update({
        where: { id: req.params.id },
        data: { 
          status, name, email, phone,
          value: value ? parseFloat(value) : undefined
        }
      });
      res.json(lead);
    } catch (error) {
      res.status(500).json({ error: "Failed to update lead" });
    }
  });

  router.post("/leads", async (req: AuthRequest, res) => {
    const { name, email, phone, status, value, tags, source, notes } = req.body;
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });
    try {
      const lead = await prisma.lead.create({
        data: {
          name, email, phone, status: status || "novo",
          value: parseFloat(value) || 0,
          tags: Array.isArray(tags) ? tags.join(',') : tags,
          source, notes, organizationId: orgId,
        }
      });
      res.json(lead);
    } catch (error) {
      res.status(500).json({ error: "Failed to create lead" });
    }
  });

  router.get("/leads", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });
    const { skip, take } = getPagination(req.query);
    try {
      const [leads, total] = await Promise.all([
        prisma.lead.findMany({
          where: { organizationId: orgId },
          include: { assignedTo: { select: { name: true } } },
          skip, take, orderBy: { createdAt: 'desc' }
        }),
        prisma.lead.count({ where: { organizationId: orgId } })
      ]);
      res.json({ leads, total, page: (skip/take) + 1, pageSize: take });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  router.get("/leads/:id", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });
    try {
      const lead = await prisma.lead.findFirst({
        where: { id: req.params.id, organizationId: orgId },
        include: { followUps: { orderBy: { createdAt: 'desc' } } }
      });
      if (!lead) return res.status(404).json({ error: "Lead not found" });
      res.json(lead);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch lead details" });
    }
  });

  router.post("/leads/:id/followups", async (req: AuthRequest, res) => {
    const { type, content, scheduledAt } = req.body;
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });
    try {
      const lead = await prisma.lead.findFirst({ where: { id: req.params.id, organizationId: orgId } });
      if (!lead) return res.status(404).json({ error: "Lead not found" });
      const followUp = await prisma.followUp.create({
        data: {
          leadId: req.params.id, type, content,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
          status: 'pending'
        }
      });
      res.json(followUp);
    } catch (error) {
      res.status(500).json({ error: "Failed to add follow-up" });
    }
  });

  // --- CLIENTS & OPPORTUNITIES ---

  router.get("/clients", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });
    const { skip, take } = getPagination(req.query);
    try {
      const [clients, total] = await Promise.all([
        prisma.client.findMany({
          where: { organizationId: orgId },
          skip, take, orderBy: { corporateName: 'asc' }
        }),
        prisma.client.count({ where: { organizationId: orgId } })
      ]);
      res.json({ clients, total, page: (skip/take) + 1, pageSize: take });
    } catch (error) {
       res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  router.post("/clients", async (req: AuthRequest, res) => {
    const { corporateName, email } = req.body;
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });
    try {
      const client = await prisma.client.create({
        data: { corporateName, email, organizationId: orgId }
      });
      res.json(client);
    } catch (error) {
      res.status(500).json({ error: "Failed to create client" });
    }
  });

  router.get("/opportunities", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });
    const { stage } = req.query;
    const { skip, take } = getPagination(req.query);
    const where = { organizationId: orgId, ...(stage ? { stage: String(stage) } : {}) };
    try {
      const [opportunities, total] = await Promise.all([
        prisma.opportunity.findMany({
          where, include: { client: true, assignedTo: { select: { name: true } } },
          skip, take, orderBy: { createdAt: 'desc' }
        }),
        prisma.opportunity.count({ where })
      ]);
      res.json({ opportunities, total, page: (skip/take) + 1, pageSize: take });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch opportunities" });
    }
  });

  router.post("/opportunities", async (req: AuthRequest, res) => {
    const { title, description, stage, probability, value, expectedCloseDate, clientId, assignedToId } = req.body;
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });
    try {
      const opportunity = await prisma.opportunity.create({
        data: {
          title, description, stage: stage || "qualificacao", probability: probability || 10,
          value: parseFloat(value) || 0,
          expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
          clientId, assignedToId, organizationId: orgId
        },
        include: { client: true }
      });
      res.json(opportunity);
    } catch (error) {
      res.status(500).json({ error: "Failed to create opportunity" });
    }
  });

  router.patch("/opportunities/:id", async (req: AuthRequest, res) => {
    const { title, stage, probability, value, lostReason, closedAt } = req.body;
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });
    try {
      const opportunity = await prisma.opportunity.updateMany({
        where: { id: req.params.id, organizationId: orgId },
        data: { 
          title, stage, probability, value, lostReason,
          ...(stage?.includes('fechado') && { closedAt: new Date(closedAt || new Date()) })
        }
      });
      if (opportunity.count === 0) return res.status(404).json({ error: "Opportunity not found" });
      const updated = await prisma.opportunity.findUnique({ where: { id: req.params.id } });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update opportunity" });
    }
  });

  return router;
}
