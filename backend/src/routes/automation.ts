import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";

export function automationRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get("/", async (req: AuthRequest, res) => {
    try {
      const rules = await prisma.automation.findMany({
        where: { organizationId: req.user!.orgId },
        orderBy: { createdAt: "desc" },
      });
      res.json(rules);
    } catch (error) {
      console.error("[AUTOMATION_LIST_ERROR]", error);
      res.status(500).json({ error: "Erro ao listar automações" });
    }
  });

  router.post("/", async (req: AuthRequest, res) => {
    try {
      const { name, description, triggerType, triggerConfig, actions } = req.body;
      if (!name || !triggerType || !actions) return res.status(400).json({ error: "Nome, gatilho e ações são obrigatórios" });
      const rule = await prisma.automation.create({
        data: { name, description, triggerType, triggerConfig, actions, organizationId: req.user!.orgId },
      });
      res.json(rule);
    } catch (error) {
      console.error("[AUTOMATION_CREATE_ERROR]", error);
      res.status(500).json({ error: "Erro ao criar automação" });
    }
  });

  router.get("/:id", async (req: AuthRequest, res) => {
    try {
      const rule = await prisma.automation.findFirst({
        where: { id: req.params.id, organizationId: req.user!.orgId },
      });
      if (!rule) return res.status(404).json({ error: "Automação não encontrada" });
      res.json(rule);
    } catch (error) {
      console.error("[AUTOMATION_GET_ERROR]", error);
      res.status(500).json({ error: "Erro ao buscar automação" });
    }
  });

  router.patch("/:id", async (req: AuthRequest, res) => {
    try {
      const { name, description, isActive, triggerType, triggerConfig, actions } = req.body;
      const result = await prisma.automation.updateMany({
        where: { id: req.params.id, organizationId: req.user!.orgId },
        data: { ...(name && { name }), ...(description !== undefined && { description }), ...(isActive !== undefined && { isActive }), ...(triggerType && { triggerType }), ...(triggerConfig && { triggerConfig }), ...(actions && { actions }) },
      });
      if (!result.count) return res.status(404).json({ error: "Automação não encontrada" });
      res.json({ success: true });
    } catch (error) {
      console.error("[AUTOMATION_UPDATE_ERROR]", error);
      res.status(500).json({ error: "Erro ao atualizar automação" });
    }
  });

  router.delete("/:id", async (req: AuthRequest, res) => {
    try {
      const result = await prisma.automation.deleteMany({
        where: { id: req.params.id, organizationId: req.user!.orgId },
      });
      if (!result.count) return res.status(404).json({ error: "Automação não encontrada" });
      res.json({ success: true });
    } catch (error) {
      console.error("[AUTOMATION_DELETE_ERROR]", error);
      res.status(500).json({ error: "Erro ao deletar automação" });
    }
  });

  router.post("/:id/execute", async (req: AuthRequest, res) => {
    try {
      const rule = await prisma.automation.findFirst({
        where: { id: req.params.id, organizationId: req.user!.orgId },
      });
      if (!rule) return res.status(404).json({ error: "Automação não encontrada" });
      if (!rule.isActive) return res.status(400).json({ error: "Automação está inativa" });

      const results: string[] = [];
      const actions = rule.actions as any[];

      for (const action of actions) {
        switch (action.type) {
          case "create_task": {
            await prisma.task.create({
              data: { title: action.config.title, description: action.config.description, priority: action.config.priority || "medium", status: "pendente", dueDate: action.config.dueDate ? new Date(action.config.dueDate) : undefined, organizationId: req.user!.orgId, assignedToId: action.config.assignToId || undefined, leadId: action.config.leadId || undefined, projectId: action.config.projectId || undefined },
            });
            results.push(`Tarefa criada: ${action.config.title}`);
            break;
          }
          case "update_lead_status": {
            if (action.config.leadId && action.config.status) {
              await prisma.lead.update({ where: { id: action.config.leadId }, data: { status: action.config.status } });
              results.push(`Lead ${action.config.leadId} atualizado para ${action.config.status}`);
            }
            break;
          }
          case "send_notification": {
            await prisma.notification.create({
              data: { title: action.config.title, message: action.config.message, type: action.config.type || "info", link: action.config.link, organizationId: req.user!.orgId },
            });
            results.push(`Notificação enviada: ${action.config.title}`);
            break;
          }
          case "create_proposal": {
            if (action.config.leadId && action.config.title) {
              const lead = await prisma.lead.findUnique({ where: { id: action.config.leadId } });
              if (lead) {
                await prisma.proposal.create({
                    data: { title: action.config.title, slug: `${action.config.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}`, status: "rascunho", leadId: lead.id, organizationId: req.user!.orgId, content: action.config.content || "{}" },
                });
                results.push(`Proposta criada para lead ${lead.name}`);
              }
            }
            break;
          }
          default:
            results.push(`Ação desconhecida: ${action.type}`);
        }
      }

      res.json({ success: true, results });
    } catch (error) {
      console.error("[AUTOMATION_EXECUTE_ERROR]", error);
      res.status(500).json({ error: "Erro ao executar automação" });
    }
  });

  return router;
}
