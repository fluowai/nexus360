import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";

export function healthScoreRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get("/", async (req: AuthRequest, res) => {
    try {
      const orgId = req.user!.orgId;
      const scores = await prisma.clientHealthScore.findMany({
        where: { organizationId: orgId },
        orderBy: { score: "asc" },
      });
      res.json(scores);
    } catch (error) {
      console.error("[HEALTH_SCORE_LIST_ERROR]", error);
      res.status(500).json({ error: "Erro ao listar health scores" });
    }
  });

  router.get("/client/:clientId", async (req: AuthRequest, res) => {
    try {
      const score = await prisma.clientHealthScore.findUnique({
        where: { clientId: req.params.clientId },
      });
      if (!score) return res.status(404).json({ error: "Health score não encontrado" });
      res.json(score);
    } catch (error) {
      console.error("[HEALTH_SCORE_GET_ERROR]", error);
      res.status(500).json({ error: "Erro ao buscar health score" });
    }
  });

  router.post("/calculate/:clientId", async (req: AuthRequest, res) => {
    try {
      const clientId = req.params.clientId;
      const orgId = req.user!.orgId;

      const client = await prisma.client.findFirst({
        where: { id: clientId, organizationId: orgId },
        include: { invoices: { where: { status: "paga" }, orderBy: { dueDate: "desc" }, take: 3 }, projects: { select: { status: true } } },
      });
      if (!client) return res.status(404).json({ error: "Cliente não encontrado" });

      const invoiceHistory = client.invoices;
      const paymentInDay = invoiceHistory.length > 0;
      const npsResponse = null;
      const lastContactAt = client.updatedAt;

      const projectStatuses = client.projects.map((p) => p.status);
      const hasDelayedProject = projectStatuses.some((s) => s === "atrasado");
      const hasCompletedProject = projectStatuses.some((s) => s === "concluido");
      const activeProjects = projectStatuses.filter((s) => s === "execucao" || s === "planejamento").length;

      let score = 70;
      if (paymentInDay) score += 15;
      if (hasCompletedProject) score += 10;
      if (activeProjects > 2) score += 5;
      if (hasDelayedProject) score -= 20;
      if (activeProjects === 0) score -= 10;

      score = Math.max(0, Math.min(100, score));

      const riskLevel = score >= 80 ? "low" : score >= 60 ? "medium" : score >= 40 ? "high" : "critical";
      const trend = "stable";

      const existing = await prisma.clientHealthScore.findUnique({ where: { clientId } });
      let result;
      if (existing) {
        result = await prisma.clientHealthScore.update({
          where: { clientId },
          data: { score, prevScore: existing.score, trend: score > existing.score ? "up" : score < existing.score ? "down" : "stable", lastContactAt, paymentsInDay: paymentInDay, npsResponse, engagementRate: activeProjects > 0 ? Math.min(1, activeProjects / 5) : 0, projectStatus: hasDelayedProject ? "critical" : activeProjects > 0 ? "good" : "warning", riskLevel, calculatedAt: new Date() },
        });
      } else {
        result = await prisma.clientHealthScore.create({
          data: { clientId, score, lastContactAt, paymentsInDay: paymentInDay, engagementRate: activeProjects > 0 ? Math.min(1, activeProjects / 5) : 0, projectStatus: hasDelayedProject ? "critical" : activeProjects > 0 ? "good" : "warning", riskLevel, organizationId: orgId },
        });
      }

      res.json(result);
    } catch (error) {
      console.error("[HEALTH_SCORE_CALCULATE_ERROR]", error);
      res.status(500).json({ error: "Erro ao calcular health score" });
    }
  });

  router.get("/summary", async (req: AuthRequest, res) => {
    try {
      const orgId = req.user!.orgId;
      const [all, critical, high, medium, low] = await Promise.all([
        prisma.clientHealthScore.count({ where: { organizationId: orgId } }),
        prisma.clientHealthScore.count({ where: { organizationId: orgId, riskLevel: "critical" } }),
        prisma.clientHealthScore.count({ where: { organizationId: orgId, riskLevel: "high" } }),
        prisma.clientHealthScore.count({ where: { organizationId: orgId, riskLevel: "medium" } }),
        prisma.clientHealthScore.count({ where: { organizationId: orgId, riskLevel: "low" } }),
      ]);
      res.json({ total: all, critical, high, medium, low });
    } catch (error) {
      console.error("[HEALTH_SCORE_SUMMARY_ERROR]", error);
      res.status(500).json({ error: "Erro ao carregar sumário" });
    }
  });

  return router;
}
