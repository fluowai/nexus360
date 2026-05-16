import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { getPagination } from "../utils/pagination.js";
import { AuthRequest, authenticateToken } from "../middleware/auth.js";
import { requireAccess } from "../middleware/access.js";
import { sanitizeBody } from "../utils/sanitizer.js";
import { auditFromRequest } from "../utils/auditLogger.js";

export function crmRoutes(prisma: PrismaClient) {
  const router = Router();

  // Debug Ping
  router.get("/ping-crm", (req, res) => res.json({ message: "crm router is active", timestamp: new Date().toISOString() }));

  // List Pipelines (Boards Alias)
  router.get("/boards", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    try {
      const pipelines = await prisma.pipeline.findMany({
        where: { organizationId: orgId },
        include: { stages: { orderBy: { order: 'asc' } } }
      });
      res.json(pipelines);
    } catch (error) {
      next(error);
    }
  });

  // List Pipelines
  router.get("/pipelines", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    try {
      const pipelines = await prisma.pipeline.findMany({
        where: { organizationId: orgId },
        include: { stages: { orderBy: { order: 'asc' } } }
      });
      res.json(pipelines);
    } catch (error) {
      next(error);
    }
  });

  // Setup Default Pipelines
  router.post("/pipelines/setup", authenticateToken, requireAccess({ module: "crm", feature: "crm.manage_boards" }), async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    try {
      const pipelines = [
        { name: 'BDR (Prospecção Fria)', stages: ['Novo', 'Primeiro Contato', 'Em Conversa', 'Interesse Detectado', 'Qualificado'], type: 'BDR' },
        { name: 'SDR (Qualificação)', stages: ['Novo', 'Agendamento em Aberto', 'Reunião Marcada', 'Qualificado (SQL)', 'Descartado'], type: 'SDR' },
        { name: 'Closer (Vendas)', stages: ['Demonstração', 'Proposta Enviada', 'Negociação', 'Fechado Ganho', 'Fechado Perdido'], type: 'SALES' }
      ];

      for (const p of pipelines) {
        const pipeline = await prisma.pipeline.create({
          data: { name: p.name, organizationId: orgId!, type: p.type }
        });
        for (let i = 0; i < p.stages.length; i++) {
          await prisma.pipelineStage.create({
            data: { name: p.stages[i], order: i, pipelineId: pipeline.id }
          });
        }
      }

      auditFromRequest(req, "CREATE", "Pipeline", null, { action: "setup_defaults" });
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // Listar leads
  router.get("/leads", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
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

  // Buscar detalhes de um lead — IDOR FIXED
  router.get("/leads/:id", async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    try {
      const lead = await prisma.lead.findFirst({
        where: { id: req.params.id, organizationId: orgId },
        include: { 
          followUps: { 
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { name: true } } }
          } 
        }
      });

      if (!lead) {
        return res.status(404).json({ error: "Lead não encontrado" });
      }

      res.json(lead);
    } catch (error) {
      next(error);
    }
  });

  // Criar lead
  router.post("/leads", authenticateToken, async (req: AuthRequest, res, next) => {
    const orgId = req.user?.orgId;
    const data = sanitizeBody(req.body, "lead");

    if (!data.name || !data.email) {
      return res.status(400).json({ error: "Nome e e-mail são obrigatórios para criar um lead." });
    }

    try {
      const lead = await prisma.lead.create({
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          whatsapp: data.whatsapp,
          cpf: data.cpf,
          jobTitle: data.jobTitle,
          status: data.status || 'novo',
          value: parseFloat(data.value) || 0,
          source: data.source,
          channel: data.channel,
          notes: data.notes,
          tags: data.tags,
          temperature: data.temperature || 'COLD',
          score: parseInt(data.score) || 0,
          lgpdConsent: data.lgpdConsent || false,
          organizationId: orgId!,
          assignedToId: data.assignedToId || req.user?.id,
          pipelineId: data.pipelineId,
          stageId: data.stageId,
        }
      });

      auditFromRequest(req, "CREATE", "Lead", lead.id);
      res.json(lead);
    } catch (error) {
      next(error);
    }
  });

  // Atualizar lead — IDOR FIXED + SANITIZED
  router.patch("/leads/:id", async (req: AuthRequest, res, next) => {
    const orgId = req.user!.orgId;

    const data = sanitizeBody(req.body, "lead");

    try {
      // Verificar ownership com orgId (IDOR protection)
      const existingLead = await prisma.lead.findFirst({
        where: { id: req.params.id, organizationId: orgId }
      });
      if (!existingLead) {
        return res.status(404).json({ error: "Lead não encontrado" });
      }

      // Converter valores numéricos se presentes
      if (data.value !== undefined) data.value = parseFloat(data.value) || 0;
      if (data.score !== undefined) data.score = parseInt(data.score) || 0;

      const lead = await prisma.lead.update({
        where: { id: req.params.id },
        data
      });

      auditFromRequest(req, "UPDATE", "Lead", lead.id, { fields: Object.keys(data) });
      res.json(lead);
    } catch (error) {
      next(error);
    }
  });

  // EXCLUIR LEAD — IDOR FIXED
  router.delete("/leads/:id", async (req: AuthRequest, res, next) => {
    const orgId = req.user!.orgId;

    try {
      const lead = await prisma.lead.findFirst({
        where: { id: req.params.id, organizationId: orgId }
      });
      if (!lead) {
        return res.status(404).json({ error: "Lead não encontrado" });
      }

      await prisma.lead.delete({
        where: { id: req.params.id }
      });

      auditFromRequest(req, "DELETE", "Lead", req.params.id);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // Adicionar FollowUp com rastreio de autor
  router.post("/leads/:id/followups", async (req: AuthRequest, res, next) => {
    const orgId = req.user!.orgId;

    const { type, content, scheduledAt } = req.body;

    try {
      const lead = await prisma.lead.findFirst({
        where: { id: req.params.id, organizationId: orgId }
      });
      if (!lead) {
        return res.status(404).json({ error: "Lead não encontrado" });
      }

      const followUp = await prisma.followUp.create({
        data: {
          leadId: req.params.id,
          type,
          content,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
          userId: req.user?.id
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
    const orgId = req.user!.orgId;
    const userId = req.user?.id;

    try {
      // Verificar ownership (IDOR protection)
      const existingLead = await prisma.lead.findFirst({
        where: { id: req.params.id, organizationId: orgId }
      });
      if (!existingLead) {
        return res.status(404).json({ error: "Lead não encontrado" });
      }

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

      auditFromRequest(req, "DEAL_WON", "Lead", req.params.id, result);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  });

  // Listar clientes
  router.get("/clients", async (req: AuthRequest, res, next) => {
    const orgId = req.user!.orgId;

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
    const orgId = req.user!.orgId;

    const data = sanitizeBody(req.body, "client");
    
    try {
      const client = await prisma.client.create({
        data: {
          corporateName: data.corporateName,
          tradeName: data.tradeName,
          cnpj: data.cnpj,
          email: data.email,
          phone: data.phone,
          website: data.website,
          segment: data.segment,
          source: data.source,
          sourceDetail: data.sourceDetail,
          notes: data.notes,
          status: data.status || 'ativo',
          porte: data.porte,
          revenue: parseFloat(data.revenue) || 0,
          responsibleName: data.responsibleName,
          responsibleEmail: data.responsibleEmail,
          responsiblePhone: data.responsiblePhone,
          responsibleRole: data.responsibleRole,
          organizationId: orgId,
          assignedToId: data.assignedToId || req.user?.id
        }
      });

      auditFromRequest(req, "CREATE", "Client", client.id);
      res.json(client);
    } catch (error) {
      next(error);
    }
  });

  // Fallback para rotas não encontradas DENTRO do /api/crm
  router.get("/growth-intelligence", async (req: AuthRequest, res, next) => {
    const orgId = req.user!.orgId;
    const stageWeights: Record<string, number> = {
      novo: 0.1,
      contato: 0.25,
      qualificado: 0.45,
      proposta: 0.7,
      fechado: 1,
    };

    try {
      const [leads, clients, soldProducts, healthScores, tasks] = await Promise.all([
        prisma.lead.findMany({
          where: { organizationId: orgId },
          include: { followUps: { orderBy: { createdAt: "desc" }, take: 1 } },
          orderBy: { updatedAt: "desc" },
        }),
        prisma.client.findMany({
          where: { organizationId: orgId },
          select: { id: true, corporateName: true, tradeName: true, segment: true, status: true, updatedAt: true, createdAt: true },
        }),
        prisma.soldProduct.findMany({
          where: { client: { organizationId: orgId } },
          include: { client: { select: { id: true, corporateName: true, tradeName: true, status: true, segment: true } } },
        }),
        prisma.clientHealthScore.findMany({ where: { organizationId: orgId } }),
        prisma.task.findMany({
          where: { organizationId: orgId, status: { not: "concluida" } },
          orderBy: { dueDate: "asc" },
          take: 8,
        }),
      ]);

      const openLeads = leads.filter((lead) => lead.status !== "fechado");
      const wonLeads = leads.filter((lead) => lead.status === "fechado");
      const openValue = openLeads.reduce((sum, lead) => sum + (lead.value || 0), 0);
      const wonValue = wonLeads.reduce((sum, lead) => sum + (lead.value || 0), 0);
      const weightedForecast = openLeads.reduce((sum, lead) => sum + ((lead.value || 0) * (stageWeights[lead.status] ?? 0.2)), 0);
      const monthlyRecurring = soldProducts
        .filter((product) => !["cancelado", "churned", "inativo"].includes(product.status))
        .reduce((sum, product) => sum + (product.monthlyValue || 0), 0);
      const averageTicket = leads.length ? (openValue + wonValue) / leads.length : 0;
      const conversionRate = leads.length ? Math.round((wonLeads.length / leads.length) * 100) : 0;
      const criticalClients = healthScores.filter((score) => score.riskLevel === "critical" || score.riskLevel === "high").length;
      const staleLeadLimit = new Date(Date.now() - 1000 * 60 * 60 * 24 * 3);
      const staleLeads = openLeads
        .filter((lead) => (lead.followUps[0]?.createdAt || lead.updatedAt) < staleLeadLimit)
        .slice(0, 8);
      const topOpportunities = [...openLeads]
        .sort((a, b) => (b.value || 0) - (a.value || 0))
        .slice(0, 8)
        .map((lead) => ({
          id: lead.id,
          name: lead.name,
          status: lead.status,
          value: lead.value,
          score: lead.score,
          recommendedAction: lead.status === "proposta" ? "Enviar follow-up de proposta" : lead.status === "qualificado" ? "Agendar diagnostico consultivo" : "Iniciar abordagem no WhatsApp",
        }));

      res.json({
        forecast: { openValue, wonValue, weightedForecast, averageTicket, conversionRate, monthlyRecurring },
        benchmark: {
          leads: leads.length,
          clients: clients.length,
          wonDeals: wonLeads.length,
          activeClients: clients.filter((client) => client.status === "ativo" || client.status === "onboarding").length,
          criticalClients,
          revenuePerClient: clients.length ? monthlyRecurring / clients.length : 0,
        },
        sellerAssistant: {
          staleLeads: staleLeads.map((lead) => ({
            id: lead.id,
            name: lead.name,
            status: lead.status,
            value: lead.value,
            lastTouchAt: lead.followUps[0]?.createdAt || lead.updatedAt,
            action: "Retomar contato com mensagem curta e pergunta de proximo passo",
          })),
          topOpportunities,
          pendingTasks: tasks.map((task) => ({ id: task.id, title: task.title, priority: task.priority, dueDate: task.dueDate })),
        },
        playbooks: [
          {
            niche: "Agencia de marketing",
            pipeline: "Diagnostico > Auditoria > Plano de crescimento > Proposta > Onboarding",
            offer: "Pacote de growth com midia, conteudo, CRM e automacao",
            firstMessage: "Vi oportunidades no seu funil de aquisicao. Posso te mandar 3 pontos rapidos para melhorar volume e qualidade dos leads?",
            proposalAngle: "ROI, previsibilidade comercial e reducao de retrabalho entre marketing e vendas.",
          },
          {
            niche: "Clinicas e saude",
            pipeline: "Captacao > Triagem > Consulta > Plano > Recorrencia",
            offer: "Gestao de agenda, campanhas locais e nutricao de pacientes",
            firstMessage: "Percebi espaco para aumentar agendamentos qualificados sem depender so de indicacao. Faz sentido avaliarmos?",
            proposalAngle: "Agenda cheia, menor no-show e jornadas de relacionamento.",
          },
          {
            niche: "B2B consultivo",
            pipeline: "ICP > Dor > Diagnostico > Business case > Fechamento",
            offer: "Maquina comercial consultiva com prospeccao, proposta e cadencia",
            firstMessage: "Tenho uma hipotese de melhoria no seu processo comercial B2B. Posso compartilhar uma leitura objetiva?",
            proposalAngle: "Pipeline previsivel, ciclo menor e melhor taxa de proposta ganha.",
          },
          {
            niche: "E-commerce",
            pipeline: "Auditoria > Oferta > Midia > Retencao > Upsell",
            offer: "Crescimento de receita com performance, CRM e criativos",
            firstMessage: "Notei sinais de potencial em conversao e recompra. Quer que eu te mostre onde pode estar o ganho mais rapido?",
            proposalAngle: "CAC, LTV, margem e velocidade de testes criativos.",
          },
        ],
        whatsappTemplates: [
          { name: "Primeiro contato", text: "Oi, {{nome}}. Aqui e da Nexus. Analisei rapidamente o crescimento digital de voces e encontrei oportunidades praticas. Posso te mandar um resumo em 3 pontos?" },
          { name: "Follow-up proposta", text: "Oi, {{nome}}. Passando para saber se a proposta ficou clara e se faz sentido marcarmos 15 minutos para ajustar escopo, prazo e proximos passos." },
          { name: "Reativacao", text: "Oi, {{nome}}. Faz um tempo que nao falamos. Tenho uma ideia simples para destravar mais oportunidades este mes. Quer que eu compartilhe?" },
          { name: "Upsell cliente", text: "Oi, {{nome}}. Pelos resultados recentes, vejo espaco para evoluir o plano com {{servico}}. Posso preparar um cenario de impacto?" },
        ],
        customFields: ["ICP", "Servico de interesse", "Urgencia", "Orcamento estimado", "Canal de origem", "Principal objecao", "Proxima acao"],
        automationRecipes: [
          "Lead sem interacao por 3 dias: criar tarefa e sugerir mensagem de retomada.",
          "Proposta parada por 48h: disparar lembrete no WhatsApp e notificar vendedor.",
          "Venda ganha: criar cliente, contrato, onboarding e checklist de entrega.",
          "Health score abaixo de 60: abrir plano de retencao para o CS.",
          "Cliente com expansao acima de 75: sugerir oferta complementar para a agencia.",
        ],
      });
    } catch (error) {
      next(error);
    }
  });

  router.use((req, res) => {
    res.status(404).json({ 
      success: false, 
      error: 'CRM Route not found', 
      path: req.originalUrl,
      availableRoutes: ['/leads', '/pipelines', '/ping-crm'] 
    });
  });

  return router;
}
