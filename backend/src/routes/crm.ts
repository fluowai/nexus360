import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { getPagination } from "../utils/pagination.js";
import { AuthRequest } from "../middleware/auth.js";

export function crmRoutes(prisma: PrismaClient) {
  const router = Router();

  // Listar leads
  router.get("/leads", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });
    const { skip, take } = getPagination(req.query);
    try {
      const [leads, total] = await Promise.all([
        prisma.lead.findMany({
          where: { organizationId: orgId },
          skip, take, 
          include: { 
            followUps: {
              include: { user: { select: { name: true } } }
            } 
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.lead.count({ where: { organizationId: orgId } })
      ]);
      res.json({ leads, total });
    } catch (error) {
      next(error);
    }
  });

  // Buscar detalhes de um lead
  router.get("/leads/:id", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    try {
      const lead = await prisma.lead.findUnique({
        where: { id: req.params.id },
        include: { 
          followUps: { 
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { name: true } } }
          } 
        }
      });

      if (!lead || lead.organizationId !== orgId) {
        return res.status(404).json({ error: "Lead não encontrado" });
      }

      res.json(lead);
    } catch (error) {
      next(error);
    }
  });

  // Criar lead
  router.post("/leads", async (req: AuthRequest, res, next) => {
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
      next(error);
    }
  });

  // Atualizar lead
  router.patch("/leads/:id", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    try {
      const existingLead = await prisma.lead.findUnique({ where: { id: req.params.id } });
      if (!existingLead || existingLead.organizationId !== orgId) {
        return res.status(404).json({ error: "Lead não encontrado" });
      }

      const lead = await prisma.lead.update({
        where: { id: req.params.id },
        data: req.body
      });
      res.json(lead);
    } catch (error) {
      next(error);
    }
  });

  // EXCLUIR LEAD (Novo)
  router.delete("/leads/:id", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    try {
      const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
      if (!lead || lead.organizationId !== orgId) {
        return res.status(404).json({ error: "Lead não encontrado" });
      }

      await prisma.lead.delete({
        where: { id: req.params.id }
      });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // Adicionar FollowUp com rastreio de autor
  router.post("/leads/:id/followups", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    const { type, content, scheduledAt } = req.body;

    try {
      const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
      if (!lead || lead.organizationId !== orgId) {
        return res.status(404).json({ error: "Lead não encontrado" });
      }

      const followUp = await prisma.followUp.create({
        data: {
          leadId: req.params.id,
          type,
          content,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
          userId: req.user?.id // Rastreio de quem fez
        },
        include: { user: { select: { name: true } } }
      });
      res.json(followUp);
    } catch (error) {
      next(error);
    }
  });

  // Fechar Venda (Win)
  router.post("/leads/:id/win", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    const userId = req.user?.id;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const result = await prisma.$transaction(async (tx) => {
        const { corporateName, respEmail, product, setupValue, monthlyValue, paymentMethod, billingDay, contractTerm, scope, additionalClauses } = req.body;

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
    } catch (error) {
      next(error);
    }
  });

  // Listar clientes
  router.get("/clients", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    try {
      const clients = await prisma.client.findMany({
        where: { organizationId: orgId },
        orderBy: { corporateName: 'asc' }
      });
      res.json(clients);
    } catch (error) {
      next(error);
    }
  });

  // Cadastrar Cliente Manualmente (Raio-X)
  router.post("/clients", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    const { 
      corporateName, tradeName, cnpj, email, phone, website, 
      segment, source, sourceDetail, notes, status, porte, revenue,
      responsibleName, responsibleEmail, responsiblePhone, responsibleRole
    } = req.body;
    
    try {
      const client = await prisma.client.create({
        data: {
          corporateName,
          tradeName,
          taxId: cnpj, // Mapeia CNPJ para taxId
          email,
          phone,
          website,
          segment,
          source,
          sourceDetail,
          notes,
          status: status || 'ativo',
          porte,
          revenue: parseFloat(revenue) || 0,
          responsibleName,
          responsibleEmail,
          responsiblePhone,
          responsibleRole,
          organizationId: orgId as string,
          assignedToId: req.user?.id
        }
      });
      res.json(client);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
