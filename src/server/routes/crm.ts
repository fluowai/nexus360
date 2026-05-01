import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { getPagination } from "../utils/pagination.ts";
import { AuthRequest } from "../middleware/auth.ts";

export function crmRoutes(prisma: PrismaClient) {
  const router = Router();

  // Create Lead
  router.post("/leads", async (req: AuthRequest, res) => {
    const { name, email, phone, status, value, tags, source, notes } = req.body;
    const orgId = req.user?.orgId;
    
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const lead = await prisma.lead.create({
        data: {
          name,
          email,
          phone,
          status: status || "novo",
          value: parseFloat(value) || 0,
          tags: Array.isArray(tags) ? tags.join(',') : tags,
          source,
          notes,
          organizationId: orgId,
        }
      });
      res.json(lead);
    } catch (error) {
      console.error("Create Lead Error:", error);
      res.status(500).json({ error: "Failed to create lead" });
    }
  });

  // Get Leads
  router.get("/leads", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });
    
    const { skip, take } = getPagination(req.query);
    try {
      const [leads, total] = await Promise.all([
        prisma.lead.findMany({
          where: { organizationId: orgId },
          include: { assignedTo: { select: { name: true } } },
          skip,
          take,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.lead.count({ where: { organizationId: orgId } })
      ]);
      res.json({ leads, total, page: (skip/take) + 1, pageSize: take });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  // Get Lead Details with FollowUps
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

  // Add FollowUp to Lead
  router.post("/leads/:id/followups", async (req: AuthRequest, res) => {
    const { type, content, scheduledAt } = req.body;
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      // Primeiro verificar se o lead pertence à organização
      const lead = await prisma.lead.findFirst({
        where: { id: req.params.id, organizationId: orgId }
      });

      if (!lead) return res.status(404).json({ error: "Lead not found or unauthorized" });

      const followUp = await prisma.followUp.create({
        data: {
          leadId: req.params.id,
          type,
          content,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
          status: 'pending'
        }
      });
      res.json(followUp);
    } catch (error) {
      res.status(500).json({ error: "Failed to add follow-up" });
    }
  });

  // Clients
  router.get("/clients", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const { skip, take } = getPagination(req.query);
    try {
      const [clients, total] = await Promise.all([
        prisma.client.findMany({
          where: { organizationId: orgId },
          skip,
          take,
          orderBy: { corporateName: 'asc' }
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

  // Opportunities
  router.get("/opportunities", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const { stage } = req.query;
    const { skip, take } = getPagination(req.query);
    const where = { 
      organizationId: orgId,
      ...(stage ? { stage: String(stage) } : {})
    };
    try {
      const [opportunities, total] = await Promise.all([
        prisma.opportunity.findMany({
          where,
          include: { client: true, assignedTo: { select: { name: true } } },
          skip,
          take,
          orderBy: { createdAt: 'desc' }
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
          title,
          description,
          stage: stage || "qualificacao",
          probability: probability || 10,
          value: parseFloat(value) || 0,
          expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
          clientId,
          assignedToId,
          organizationId: orgId
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
          title,
          stage,
          probability,
          value,
          lostReason,
          ...(stage?.includes('fechado') && { closedAt: new Date(closedAt || new Date()) })
        }
      });

      if (opportunity.count === 0) {
        return res.status(404).json({ error: "Opportunity not found or unauthorized" });
      }

      const updated = await prisma.opportunity.findUnique({ where: { id: req.params.id } });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update opportunity" });
    }
  });

  return router;
}
