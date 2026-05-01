import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.ts";

export function opsRoutes(prisma: PrismaClient) {
  const router = Router();

  // Tasks
  router.get("/tasks", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const { status, assignedToId } = req.query;
    try {
      const tasks = await prisma.task.findMany({
        where: { 
          organizationId: orgId,
          ...(status ? { status: String(status) } : {}),
          ...(assignedToId ? { assignedToId: String(assignedToId) } : {})
        },
        include: { assignedTo: { select: { name: true, email: true } } },
        orderBy: { dueDate: 'asc' }
      });
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  router.post("/tasks", async (req: AuthRequest, res) => {
    const { title, description, status, priority, dueDate, assignedToId, leadId, opportunityId, proposalId } = req.body;
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const task = await prisma.task.create({
        data: {
          title,
          description,
          status: status || "pendente",
          priority: priority || "media",
          dueDate: dueDate ? new Date(dueDate) : null,
          assignedToId: assignedToId || null,
          leadId: leadId || null,
          opportunityId: opportunityId || null,
          proposalId: proposalId || null,
          organizationId: orgId
        }
      });
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  // Projects
  router.get("/projects", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const projects = await prisma.project.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' }
      });
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  // Calendar
  router.get("/calendar", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const { startDate, endDate } = req.query;
    try {
      const events = await prisma.calendarEvent.findMany({
        where: { 
          organizationId: orgId,
          ...(startDate && startDate !== 'undefined' && endDate && endDate !== 'undefined' ? {
            OR: [
              { startDate: { gte: new Date(String(startDate)), lte: new Date(String(endDate)) } },
              { endDate: { gte: new Date(String(startDate)), lte: new Date(String(endDate)) } }
            ]
          } : {})
        },
        orderBy: { startDate: 'asc' }
      });
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch calendar events" });
    }
  });

  router.post("/calendar", async (req: AuthRequest, res) => {
    const { title, description, startDate, endDate, allDay, type, reminder, leadId } = req.body;
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      let meetingRoom = null;
      let meetingLink = null;
      
      if (type === 'reunion') {
        const roomId = Math.random().toString(36).substring(2, 12);
        meetingRoom = `nexus-${roomId}`;
        // Usar localhost por padrão se não houver APP_URL configurado
        const baseUrl = process.env.APP_URL || 'http://localhost:3000';
        meetingLink = `${baseUrl}/meet/${meetingRoom}`;
      }

      const event = await prisma.calendarEvent.create({
        data: {
          title,
          description,
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : null,
          allDay: allDay || false,
          type,
          reminder: reminder || null,
          leadId,
          organizationId: orgId,
          meetingRoom,
          meetingLink
        }
      });
      res.json(event);
    } catch (error) {
      console.error("Create Calendar Event Error:", error);
      res.status(500).json({ error: "Failed to create calendar event" });
    }
  });


  // Notifications
  router.get("/notifications", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    try {
      const notifications = await prisma.notification.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
        take: 50
      });
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  return router;
}
