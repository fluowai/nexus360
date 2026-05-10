import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";

export function timeTrackingRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get("/", async (req: AuthRequest, res) => {
    try {
      const orgId = req.user!.orgId;
      const { projectId, clientId, userId, dateFrom, dateTo } = req.query;
      const where: any = { organizationId: orgId };
      if (projectId) where.projectId = projectId;
      if (clientId) where.clientId = clientId;
      if (userId) where.userId = userId;
      if (dateFrom || dateTo) {
        where.date = {};
        if (dateFrom) where.date.gte = new Date(dateFrom as string);
        if (dateTo) where.date.lte = new Date(dateTo as string);
      }
      const [entries, totals] = await Promise.all([
        prisma.timeEntry.findMany({ where, orderBy: { date: "desc" }, take: 200 }),
        prisma.timeEntry.aggregate({ where, _sum: { duration: true, totalValue: true } }),
      ]);
      res.json({ entries, totalHours: Math.floor((totals._sum.duration || 0) / 60), totalMinutes: (totals._sum.duration || 0) % 60, totalValue: totals._sum.totalValue || 0 });
    } catch (error) {
      console.error("[TIME_TRACKING_LIST_ERROR]", error);
      res.status(500).json({ error: "Erro ao listar horas" });
    }
  });

  router.post("/", async (req: AuthRequest, res) => {
    try {
      const { description, date, duration, billable, hourlyRate, projectId, clientId, deliverableId, taskId } = req.body;
      if (!duration) return res.status(400).json({ error: "Duração é obrigatória" });
      const rate = hourlyRate || 0;
      const entry = await prisma.timeEntry.create({
        data: { description, date: date ? new Date(date) : new Date(), duration, billable: billable !== false, hourlyRate: rate, totalValue: (duration / 60) * rate, projectId, clientId, deliverableId, taskId, userId: req.user!.id, organizationId: req.user!.orgId },
      });
      res.json(entry);
    } catch (error) {
      console.error("[TIME_TRACKING_CREATE_ERROR]", error);
      res.status(500).json({ error: "Erro ao registrar hora" });
    }
  });

  router.patch("/:id", async (req: AuthRequest, res) => {
    try {
      const { description, duration, billable, hourlyRate, approvalStatus } = req.body;
      const data: any = {};
      if (description !== undefined) data.description = description;
      if (duration) data.duration = duration;
      if (billable !== undefined) data.billable = billable;
      if (hourlyRate) data.hourlyRate = hourlyRate;
      if (approvalStatus) data.approvalStatus = approvalStatus;
      if (duration || hourlyRate) {
        const current = await prisma.timeEntry.findFirst({ where: { id: req.params.id, organizationId: req.user!.orgId } });
        if (current) {
          const finalDuration = duration || current.duration;
          const finalRate = hourlyRate || current.hourlyRate;
          data.totalValue = (finalDuration / 60) * finalRate;
        }
      }
      const result = await prisma.timeEntry.updateMany({
        where: { id: req.params.id, organizationId: req.user!.orgId },
        data,
      });
      if (!result.count) return res.status(404).json({ error: "Registro não encontrado" });
      res.json({ success: true });
    } catch (error) {
      console.error("[TIME_TRACKING_UPDATE_ERROR]", error);
      res.status(500).json({ error: "Erro ao atualizar registro" });
    }
  });

  router.delete("/:id", async (req: AuthRequest, res) => {
    try {
      const result = await prisma.timeEntry.deleteMany({
        where: { id: req.params.id, organizationId: req.user!.orgId },
      });
      if (!result.count) return res.status(404).json({ error: "Registro não encontrado" });
      res.json({ success: true });
    } catch (error) {
      console.error("[TIME_TRACKING_DELETE_ERROR]", error);
      res.status(500).json({ error: "Erro ao deletar registro" });
    }
  });

  router.get("/dashboard", async (req: AuthRequest, res) => {
    try {
      const orgId = req.user!.orgId;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      const [todayEntries, weekEntries, monthEntries, topUsers] = await Promise.all([
        prisma.timeEntry.aggregate({ where: { organizationId: orgId, date: { gte: today } }, _sum: { duration: true } }),
        prisma.timeEntry.aggregate({ where: { organizationId: orgId, date: { gte: weekStart } }, _sum: { duration: true } }),
        prisma.timeEntry.aggregate({ where: { organizationId: orgId, date: { gte: monthStart } }, _sum: { duration: true } }),
        prisma.timeEntry.groupBy({ by: ["userId"], where: { organizationId: orgId, date: { gte: monthStart } }, _sum: { duration: true }, orderBy: { _sum: { duration: "desc" } }, take: 5 }),
      ]);

      res.json({
        todayHours: Math.floor((todayEntries._sum.duration || 0) / 60),
        weekHours: Math.floor((weekEntries._sum.duration || 0) / 60),
        monthHours: Math.floor((monthEntries._sum.duration || 0) / 60),
        topUsers,
      });
    } catch (error) {
      console.error("[TIME_TRACKING_DASHBOARD_ERROR]", error);
      res.status(500).json({ error: "Erro ao carregar dashboard" });
    }
  });

  return router;
}
