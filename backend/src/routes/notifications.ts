import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";

export function notificationRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get("/", async (req: AuthRequest, res) => {
    try {
      const orgId = req.user!.orgId;
      const { unreadOnly } = req.query;
      const where: any = { organizationId: orgId };
      if (unreadOnly === "true") where.isRead = false;
      const [notifications, total, unread] = await Promise.all([
        prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, take: 50 }),
        prisma.notification.count({ where: { organizationId: orgId } }),
        prisma.notification.count({ where: { organizationId: orgId, isRead: false } }),
      ]);
      res.json({ notifications, total, unread });
    } catch (error) {
      console.error("[NOTIFICATIONS_LIST_ERROR]", error);
      res.status(500).json({ error: "Erro ao listar notificações" });
    }
  });

  router.post("/", async (req: AuthRequest, res) => {
    try {
      const { title, message, type, link } = req.body;
      if (!title || !message) return res.status(400).json({ error: "Título e mensagem são obrigatórios" });
      const notification = await prisma.notification.create({
        data: { title, message, type: type || "info", link, organizationId: req.user!.orgId },
      });
      res.json(notification);
    } catch (error) {
      console.error("[NOTIFICATIONS_CREATE_ERROR]", error);
      res.status(500).json({ error: "Erro ao criar notificação" });
    }
  });

  router.patch("/:id/read", async (req: AuthRequest, res) => {
    try {
      const result = await prisma.notification.updateMany({
        where: { id: req.params.id, organizationId: req.user!.orgId },
        data: { isRead: true },
      });
      if (!result.count) return res.status(404).json({ error: "Notificação não encontrada" });
      res.json({ success: true });
    } catch (error) {
      console.error("[NOTIFICATIONS_READ_ERROR]", error);
      res.status(500).json({ error: "Erro ao marcar notificação" });
    }
  });

  router.post("/read-all", async (req: AuthRequest, res) => {
    try {
      await prisma.notification.updateMany({
        where: { organizationId: req.user!.orgId, isRead: false },
        data: { isRead: true },
      });
      res.json({ success: true });
    } catch (error) {
      console.error("[NOTIFICATIONS_READ_ALL_ERROR]", error);
      res.status(500).json({ error: "Erro ao marcar todas como lidas" });
    }
  });

  router.delete("/:id", async (req: AuthRequest, res) => {
    try {
      const result = await prisma.notification.deleteMany({
        where: { id: req.params.id, organizationId: req.user!.orgId },
      });
      if (!result.count) return res.status(404).json({ error: "Notificação não encontrada" });
      res.json({ success: true });
    } catch (error) {
      console.error("[NOTIFICATIONS_DELETE_ERROR]", error);
      res.status(500).json({ error: "Erro ao deletar notificação" });
    }
  });

  return router;
}
