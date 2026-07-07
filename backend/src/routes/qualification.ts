import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import {
  submitQualification,
  getQualificationFormPublic,
  listQualificationForms,
  listSubmissions,
  scheduleQualification,
  getTeamAvailability,
  enrollQualificationInFunnel,
} from "../services/qualificationService.js";

export function qualificationPublicRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get("/public/forms/:id", async (req, res, next) => {
    try {
      const form = await getQualificationFormPublic(prisma, req.params.id);
      if (!form) return res.status(404).json({ error: "Formulário não encontrado" });
      res.json({ success: true, form });
    } catch (error) {
      next(error);
    }
  });

  router.post("/public/forms/:id/submit", async (req, res, next) => {
    try {
      const { name, email, phone, notes, answers } = req.body;
      if (!name || !email || !answers) {
        return res.status(400).json({ error: "name, email e answers são obrigatórios" });
      }
      const result = await submitQualification(prisma, req.params.id, { name, email, phone, notes, answers });
      res.status(201).json({ success: true, ...result });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao enviar formulário" });
    }
  });

  return router;
}

export function qualificationRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get("/forms", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const forms = await listQualificationForms(prisma, orgId);
      res.json({ success: true, forms });
    } catch (error) {
      next(error);
    }
  });

  router.get("/forms/:id", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const form = await prisma.qualificationForm.findFirst({
        where: { id: req.params.id, organizationId: orgId },
        include: { _count: { select: { submissions: true } } },
      });
      if (!form) return res.status(404).json({ error: "Formulário não encontrado" });
      res.json({ success: true, form });
    } catch (error) {
      next(error);
    }
  });

  router.post("/forms", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const { name, description, icpFields, routingRules, allowScheduling, schedulingMessage, schedulingLeadTime, createLead, leadPipelineId, leadStageId, createFunnelLead, funnelId } = req.body;
      if (!name || !icpFields) {
        return res.status(400).json({ error: "name e icpFields são obrigatórios" });
      }
      const form = await prisma.qualificationForm.create({
        data: {
          organizationId: orgId,
          name,
          description: description || null,
          icpFields: icpFields as any,
          routingRules: routingRules || null,
          allowScheduling: allowScheduling !== false,
          schedulingMessage: schedulingMessage || null,
          schedulingLeadTime: schedulingLeadTime || 60,
          createLead: createLead !== false,
          leadPipelineId: leadPipelineId || null,
          leadStageId: leadStageId || null,
          createFunnelLead: createFunnelLead === true,
          funnelId: funnelId || null,
        },
      });
      res.status(201).json({ success: true, form });
    } catch (error) {
      next(error);
    }
  });

  router.put("/forms/:id", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const existing = await prisma.qualificationForm.findFirst({
        where: { id: req.params.id, organizationId: orgId },
      });
      if (!existing) return res.status(404).json({ error: "Formulário não encontrado" });

      const { name, description, icpFields, routingRules, allowScheduling, schedulingMessage, schedulingLeadTime, isActive, createLead, leadPipelineId, leadStageId, createFunnelLead, funnelId } = req.body;
      const form = await prisma.qualificationForm.update({
        where: { id: req.params.id },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(icpFields !== undefined && { icpFields: icpFields as any }),
          ...(routingRules !== undefined && { routingRules: routingRules as any }),
          ...(allowScheduling !== undefined && { allowScheduling }),
          ...(schedulingMessage !== undefined && { schedulingMessage }),
          ...(schedulingLeadTime !== undefined && { schedulingLeadTime }),
          ...(isActive !== undefined && { isActive }),
          ...(createLead !== undefined && { createLead }),
          ...(leadPipelineId !== undefined && { leadPipelineId }),
          ...(leadStageId !== undefined && { leadStageId }),
          ...(createFunnelLead !== undefined && { createFunnelLead }),
          ...(funnelId !== undefined && { funnelId }),
        },
      });
      res.json({ success: true, form });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/forms/:id", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const existing = await prisma.qualificationForm.findFirst({
        where: { id: req.params.id, organizationId: orgId },
      });
      if (!existing) return res.status(404).json({ error: "Formulário não encontrado" });
      await prisma.qualificationForm.delete({ where: { id: req.params.id } });
      res.json({ success: true, message: "Formulário removido" });
    } catch (error) {
      next(error);
    }
  });

  router.get("/submissions", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const { status, formId, routedTo } = req.query as any;
      const submissions = await listSubmissions(prisma, orgId, { status, formId, routedTo });
      res.json({ success: true, submissions });
    } catch (error) {
      next(error);
    }
  });

  router.get("/submissions/:id", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const submission = await prisma.qualificationSubmission.findFirst({
        where: { id: req.params.id, organizationId: orgId },
        include: { form: { select: { name: true, icpFields: true } } },
      });
      if (!submission) return res.status(404).json({ error: "Submissão não encontrada" });
      res.json({ success: true, submission });
    } catch (error) {
      next(error);
    }
  });

  router.post("/submissions/:id/approve", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const { routedTo, routedToUserId } = req.body;
      const submission = await prisma.qualificationSubmission.findFirst({
        where: { id: req.params.id, organizationId: orgId },
      });
      if (!submission) return res.status(404).json({ error: "Submissão não encontrada" });

      const updated = await prisma.qualificationSubmission.update({
        where: { id: req.params.id },
        data: {
          status: "approved",
          ...(routedTo && { routedTo, routedToUserId: routedToUserId || null, routedAt: new Date(), routeReason: "Aprovação manual" }),
        },
      });
      res.json({ success: true, submission: updated });
    } catch (error) {
      next(error);
    }
  });

  router.post("/submissions/:id/reject", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const { reason } = req.body;
      const submission = await prisma.qualificationSubmission.findFirst({
        where: { id: req.params.id, organizationId: orgId },
      });
      if (!submission) return res.status(404).json({ error: "Submissão não encontrada" });

      const updated = await prisma.qualificationSubmission.update({
        where: { id: req.params.id },
        data: { status: "rejected", routeReason: reason || "Reprovado manualmente" },
      });
      res.json({ success: true, submission: updated });
    } catch (error) {
      next(error);
    }
  });

  router.post("/submissions/:id/schedule", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const { scheduledTo, notes } = req.body;
      if (!scheduledTo) return res.status(400).json({ error: "scheduledTo é obrigatório" });

      const submission = await prisma.qualificationSubmission.findFirst({
        where: { id: req.params.id, organizationId: orgId },
      });
      if (!submission) return res.status(404).json({ error: "Submissão não encontrada" });

      const result = await scheduleQualification(prisma, req.params.id, {
        scheduledTo,
        notes,
        userId: req.user?.id,
      });
      res.json({ success: true, submission: result });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao agendar" });
    }
  });

  router.post("/submissions/:id/enroll-funnel", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const { funnelId } = req.body;
      const result = await enrollQualificationInFunnel(prisma, orgId, req.params.id, funnelId || "default");
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao enviar ao funil" });
    }
  });

  router.get("/team", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const availability = await getTeamAvailability(prisma, orgId);
      res.json({ success: true, ...availability });
    } catch (error) {
      next(error);
    }
  });

  router.get("/team/users", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const users = await prisma.user.findMany({
        where: { organizationId: orgId, department: { in: ["SDR", "BDR", "CLOSER"] }, status: "ACTIVE" },
        select: { id: true, name: true, email: true, department: true },
        orderBy: { name: "asc" },
      });
      res.json({ success: true, users });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
