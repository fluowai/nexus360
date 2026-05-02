import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";

export function calendarRoutes(prisma: PrismaClient) {
  const router = Router();

  // Listar todos os eventos da organização do usuário
  router.get("/", async (req: AuthRequest, res) => {
    try {
      const events = await prisma.calendarEvent.findMany({
        where: {
          organizationId: req.user?.orgId
        },
        orderBy: {
          startDate: 'asc'
        }
      });
      res.json(events);
    } catch (error) {
      console.error("[CALENDAR_GET]", error);
      res.status(500).json({ error: "Erro ao buscar eventos do calendário" });
    }
  });

  // Criar novo evento
  router.post("/", async (req: AuthRequest, res) => {
    const { title, description, startDate, endDate, allDay, type, reminder, meetingLink } = req.body;
    
    if (!title || !startDate || !type) {
      return res.status(400).json({ error: "Título, data de início e tipo são obrigatórios" });
    }

    try {
      const event = await prisma.calendarEvent.create({
        data: {
          title,
          description,
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : null,
          allDay: Boolean(allDay),
          type,
          reminder: reminder ? Number(reminder) : null,
          meetingLink,
          organizationId: req.user?.orgId as string
        }
      });
      res.json(event);
    } catch (error) {
      console.error("[CALENDAR_POST]", error);
      res.status(500).json({ error: "Erro ao criar evento" });
    }
  });

  // Deletar evento
  router.delete("/:id", async (req: AuthRequest, res) => {
    try {
      const event = await prisma.calendarEvent.findUnique({
        where: { id: req.params.id }
      });

      if (!event || event.organizationId !== req.user?.orgId) {
        return res.status(404).json({ error: "Evento não encontrado" });
      }

      await prisma.calendarEvent.delete({
        where: { id: req.params.id }
      });

      res.json({ success: true });
    } catch (error) {
      console.error("[CALENDAR_DELETE]", error);
      res.status(500).json({ error: "Erro ao deletar evento" });
    }
  });

  return router;
}
