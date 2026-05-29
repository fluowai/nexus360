import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import { OnboardingAIService } from "../services/onboardingAI.js";

export function onboardingRoutes(prisma: PrismaClient) {
  const router = Router();
  const aiService = new OnboardingAIService(prisma);

  router.get("/status", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const response = await prisma.onboardingResponse.findUnique({
        where: { organizationId: orgId },
        select: { id: true, appliedAt: true, recommendedTemplate: true, aiDiagnosis: true, createdAt: true },
      });
      res.json({
        completed: !!response?.appliedAt,
        started: !!response,
        response,
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/start", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const {
        businessName, businessType, targetAudience, averageTicket, salesCycle,
        needsMeeting, needsProposal, needsContract, hasRecurrence,
        leadChannels, hasSdr, hasCloser, hasPostSales,
        painPoints, biggestProblem,
        deliveryProcess, hasOnboarding, hasChecklist, hasRenewal, hasUpsell,
      } = req.body;

      if (!businessName || !businessType || !targetAudience) {
        return res.status(400).json({ error: "businessName, businessType e targetAudience são obrigatórios" });
      }

      const existing = await prisma.onboardingResponse.findUnique({
        where: { organizationId: orgId },
      });

      const data = {
        businessName,
        businessType,
        targetAudience,
        averageTicket: averageTicket ? parseFloat(averageTicket) : null,
        salesCycle: salesCycle || null,
        needsMeeting: !!needsMeeting,
        needsProposal: !!needsProposal,
        needsContract: !!needsContract,
        hasRecurrence: !!hasRecurrence,
        leadChannels: leadChannels || [],
        hasSdr: !!hasSdr,
        hasCloser: !!hasCloser,
        hasPostSales: !!hasPostSales,
        painPoints: painPoints || null,
        biggestProblem: biggestProblem || null,
        deliveryProcess: deliveryProcess || null,
        hasOnboarding: !!hasOnboarding,
        hasChecklist: !!hasChecklist,
        hasRenewal: !!hasRenewal,
        hasUpsell: !!hasUpsell,
        rawAnswers: req.body,
        organizationId: orgId,
        appliedAt: null,
      };

      const response = existing
        ? await prisma.onboardingResponse.update({ where: { id: existing.id }, data })
        : await prisma.onboardingResponse.create({ data });

      await prisma.organization.update({
        where: { id: orgId },
        data: {
          businessType: businessType,
          businessDescription: `Empresa de ${businessType} focada em ${targetAudience}. ${painPoints || ""}`,
        },
      });

      res.json({ success: true, response });
    } catch (error) {
      next(error);
    }
  });

  router.post("/analyze", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const userId = req.user?.id;

      const response = await prisma.onboardingResponse.findUnique({
        where: { organizationId: orgId },
      });

      if (!response) {
        return res.status(400).json({ error: "Complete o onboarding primeiro (POST /api/onboarding/start)" });
      }

      const diagnosis = await aiService.generateDiagnosis(
        {
          businessName: response.businessName,
          businessType: response.businessType,
          targetAudience: response.targetAudience,
          averageTicket: response.averageTicket,
          salesCycle: response.salesCycle,
          needsMeeting: response.needsMeeting,
          needsProposal: response.needsProposal,
          needsContract: response.needsContract,
          hasRecurrence: response.hasRecurrence,
          leadChannels: response.leadChannels as string[],
          hasSdr: response.hasSdr,
          hasCloser: response.hasCloser,
          hasPostSales: response.hasPostSales,
          painPoints: response.painPoints,
          biggestProblem: response.biggestProblem,
          deliveryProcess: response.deliveryProcess,
          hasOnboarding: response.hasOnboarding,
          hasChecklist: response.hasChecklist,
          hasRenewal: response.hasRenewal,
          hasUpsell: response.hasUpsell,
        },
        orgId,
        userId,
      );

      await prisma.onboardingResponse.update({
        where: { id: response.id },
        data: {
          aiDiagnosis: diagnosis as any,
          recommendedTemplate: diagnosis.recommendedTemplate,
        },
      });

      res.json({ success: true, diagnosis });
    } catch (error: any) {
      console.error("[ONBOARDING_ANALYZE_ERROR]", error.message);
      res.status(500).json({ error: error.message || "Erro ao gerar diagnóstico" });
    }
  });

  router.post("/apply", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const userId = req.user?.id;

      const response = await prisma.onboardingResponse.findUnique({
        where: { organizationId: orgId },
      });

      if (!response || !response.aiDiagnosis) {
        return res.status(400).json({ error: "Gere o diagnóstico primeiro (POST /api/onboarding/analyze)" });
      }

      if (response.appliedAt) {
        return res.json({ success: true, message: "Ambiente comercial ja estava configurado." });
      }

      const diagnosis = response.aiDiagnosis as any;
      await aiService.applyDiagnosis(orgId, diagnosis, userId);

      await prisma.onboardingResponse.update({
        where: { id: response.id },
        data: { appliedAt: new Date() },
      });

      res.json({ success: true, message: "Ambiente comercial configurado com sucesso!" });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
