import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";

const DEFAULT_STAGES = [
  {
    name: "Primeiro contato",
    agentKey: "whatsapp_opener",
    agentName: "Agente de Abordagem",
    goal: "Iniciar uma conversa natural, confirmar interesse e evitar qualquer tom de spam.",
    prompt: "Voce e um SDR cordial. Faca uma abordagem curta pelo WhatsApp, contextualize o motivo do contato e peca permissao para fazer duas perguntas rapidas.",
    successCriteria: ["Lead respondeu", "Lead confirmou interesse", "Lead autorizou continuar"],
    nextAction: "qualificacao",
    maxMessages: 2
  },
  {
    name: "Qualificacao",
    agentKey: "qualification_sdr",
    agentName: "Agente de Qualificacao",
    goal: "Entender necessidade, urgencia, orcamento, autoridade e encaixe comercial.",
    prompt: "Conduza perguntas objetivas, uma por mensagem. Capture dor, prazo, decisor, investimento e solucao atual. Classifique como frio, morno ou quente.",
    successCriteria: ["Dor identificada", "Prazo entendido", "Decisor ou responsavel mapeado", "Nivel de prioridade calculado"],
    nextAction: "diagnostico",
    maxMessages: 5
  },
  {
    name: "Diagnostico",
    agentKey: "opportunity_analyst",
    agentName: "Agente de Diagnostico",
    goal: "Interpretar respostas e decidir se o lead deve ir para vendedor, nutricao ou descarte.",
    prompt: "Analise o contexto do lead, gere score de 0 a 100 e explique o proximo passo recomendado para o time comercial.",
    successCriteria: ["Score gerado", "Proximo passo definido", "Resumo comercial registrado"],
    nextAction: "conversao",
    maxMessages: 1
  },
  {
    name: "Conversao e handoff",
    agentKey: "handoff_closer",
    agentName: "Agente de Conversao",
    goal: "Converter interesse em reuniao, visita, ligacao ou transferencia para humano.",
    prompt: "Se o lead estiver qualificado, proponha um proximo passo concreto e transfira para humano quando houver intencao forte.",
    successCriteria: ["Reuniao marcada", "Pedido de contato humano", "Lead quente identificado"],
    nextAction: "human_handoff",
    maxMessages: 3,
    isHumanHandoff: true
  }
];

const DEFAULT_QUALIFICATION_RULES = {
  hot: { minScore: 80, action: "human_handoff" },
  warm: { minScore: 50, action: "continue_qualification" },
  cold: { minScore: 0, action: "nurture" }
};

const DEFAULT_HANDOFF_RULES = [
  "quero visitar",
  "pode me ligar",
  "tenho interesse",
  "quero comprar",
  "quero contratar",
  "me passa valores"
];

const DEFAULT_SAFETY_RULES = {
  businessHours: "08:00-19:00",
  maxDailyMessagesPerLead: 4,
  stopWords: ["parar", "remover", "nao quero", "não quero", "cancelar"],
  requireHumanFor: ["reclamacao", "juridico", "dados sensiveis", "promessa comercial"]
};

function buildFirstMessage(lead: any) {
  const name = lead.businessName || "tudo bem";
  const context = [lead.category, lead.city, lead.state].filter(Boolean).join(" em ");
  const contextText = context ? ` sobre ${context}` : "";

  return `Oi, ${name}! Tudo bem? Vi seu contato${contextText} e queria entender se faz sentido conversarmos rapidamente. Posso te fazer duas perguntas para ver se conseguimos ajudar?`;
}

export async function ensureDefaultFunnel(prisma: PrismaClient, organizationId: string) {
  const existing = await prisma.prospectingFunnel.findFirst({
    where: { organizationId, isDefault: true },
    include: { stages: { orderBy: { order: "asc" } } }
  });

  if (existing) return existing;

  return prisma.prospectingFunnel.create({
    data: {
      organizationId,
      name: "WhatsApp SDR IA",
      description: "Funil padrao para receber leads captados, abordar via WhatsApp, qualificar com IA e transferir oportunidades quentes para o time comercial.",
      channel: "WHATSAPP",
      objective: "Transformar leads validados em conversas qualificadas e proximos passos comerciais.",
      qualificationRules: DEFAULT_QUALIFICATION_RULES,
      handoffRules: DEFAULT_HANDOFF_RULES,
      safetyRules: DEFAULT_SAFETY_RULES,
      isDefault: true,
      stages: {
        create: DEFAULT_STAGES.map((stage, index) => ({
          ...stage,
          order: index,
          successCriteria: stage.successCriteria as any
        }))
      }
    },
    include: { stages: { orderBy: { order: "asc" } } }
  });
}

export async function enrollCapturedLeadsInFunnel(
  prisma: PrismaClient,
  organizationId: string,
  leadIds: string[],
  funnelId: string = "default"
) {
  if (leadIds.length === 0) {
    return { funnelId: "", enrolled: 0, skipped: 0, runs: [] as any[] };
  }

  const funnel = funnelId === "default"
    ? await ensureDefaultFunnel(prisma, organizationId)
    : await prisma.prospectingFunnel.findFirst({
        where: { id: funnelId, organizationId },
        include: { stages: { orderBy: { order: "asc" } } }
      });

  if (!funnel) throw Object.assign(new Error("Funil nao encontrado"), { status: 404 });

  const firstStage = funnel.stages[0];
  if (!firstStage) throw Object.assign(new Error("Funil sem etapas configuradas"), { status: 400 });

  const leads = await prisma.capturedLead.findMany({
    where: { organizationId, id: { in: leadIds } }
  });

  const results = [];

  for (const lead of leads) {
    const score = lead.scoreOpportunity || 0;
    const run = await prisma.prospectingRun.upsert({
      where: {
        funnelId_capturedLeadId: {
          funnelId: funnel.id,
          capturedLeadId: lead.id
        }
      },
      update: {
        stageId: firstStage.id,
        status: "queued",
        score,
        leadPhone: lead.phoneNormalized || lead.phone,
        leadSnapshot: lead as any,
        firstMessage: lead.whatsappMessage || buildFirstMessage(lead),
        nextAction: "send_first_whatsapp_message"
      },
      create: {
        organizationId,
        funnelId: funnel.id,
        stageId: firstStage.id,
        capturedLeadId: lead.id,
        status: "queued",
        channel: "WHATSAPP",
        leadName: lead.businessName,
        leadPhone: lead.phoneNormalized || lead.phone,
        leadSnapshot: lead as any,
        score,
        firstMessage: lead.whatsappMessage || buildFirstMessage(lead),
        nextAction: "send_first_whatsapp_message"
      }
    });

    await prisma.capturedLead.update({
      where: { id: lead.id },
      data: {
        crmStatus: "prospecting_funnel",
        notes: [lead.notes, `Enviado ao funil IA WhatsApp: ${funnel.name}`].filter(Boolean).join("\n")
      }
    });

    results.push(run);
  }

  return {
    funnelId: funnel.id,
    enrolled: results.length,
    skipped: leadIds.length - leads.length,
    runs: results
  };
}

export function prospectingFunnelRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get("/funnels", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const funnels = await prisma.prospectingFunnel.findMany({
      where: { organizationId: orgId },
      include: {
        stages: { orderBy: { order: "asc" } },
        _count: { select: { runs: true } }
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }]
    });

    res.json(funnels);
  });

  router.post("/funnels/default", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const funnel = await ensureDefaultFunnel(prisma, orgId);
    res.status(201).json(funnel);
  });

  router.post("/funnels", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const { name, description, objective } = req.body;
    if (!name) return res.status(400).json({ error: "Nome do funil e obrigatorio" });

    const funnel = await prisma.prospectingFunnel.create({
      data: {
        organizationId: orgId,
        name,
        description,
        objective,
        channel: "WHATSAPP",
        qualificationRules: DEFAULT_QUALIFICATION_RULES,
        handoffRules: DEFAULT_HANDOFF_RULES,
        safetyRules: DEFAULT_SAFETY_RULES,
        stages: {
          create: DEFAULT_STAGES.map((stage, index) => ({
            ...stage,
            order: index,
            successCriteria: stage.successCriteria as any
          }))
        }
      },
      include: { stages: { orderBy: { order: "asc" } } }
    });

    res.status(201).json(funnel);
  });

  router.get("/runs", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const runs = await prisma.prospectingRun.findMany({
      where: { organizationId: orgId },
      include: {
        funnel: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true, agentName: true, order: true } },
        capturedLead: { select: { id: true, businessName: true, phone: true, phoneNormalized: true, city: true, state: true, scoreOpportunity: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    res.json(runs);
  });

  router.post("/runs/:id/response", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const { message, meetingStartDate, durationMinutes = 30 } = req.body;
    if (!message) return res.status(400).json({ error: "Resposta do lead e obrigatoria" });

    const run = await prisma.prospectingRun.findFirst({
      where: { id: req.params.id, organizationId: orgId },
      include: {
        funnel: { include: { stages: { orderBy: { order: "asc" } } } },
        stage: true
      }
    });

    if (!run) return res.status(404).json({ error: "Execucao do funil nao encontrada" });

    const normalized = String(message).toLowerCase();
    const wantsMeeting = ["agenda", "reuniao", "reunião", "ligar", "call", "horario", "horário", "tenho interesse"].some(term => normalized.includes(term));
    const optOut = ["parar", "remover", "nao quero", "não quero", "cancelar"].some(term => normalized.includes(term));
    const currentOrder = run.stage?.order ?? 0;
    const nextStage = run.funnel.stages.find(stage => stage.order > currentOrder) || run.stage;

    let status = optOut ? "stopped" : wantsMeeting ? "human_handoff" : "active";
    let nextAction = optOut ? "stop_contact" : wantsMeeting ? "book_30_min_meeting" : "continue_qualification";
    let calendarEvent = null;

    if (wantsMeeting && meetingStartDate) {
      const start = new Date(meetingStartDate);
      const end = new Date(start.getTime() + Number(durationMinutes) * 60 * 1000);
      calendarEvent = await prisma.calendarEvent.create({
        data: {
          title: `Reuniao SDR - ${run.leadName}`,
          description: `Lead qualificado pelo funil ${run.funnel.name}.\nTelefone: ${run.leadPhone || "Nao informado"}\nResumo: ${message}`,
          startDate: start,
          endDate: end,
          type: "reunion",
          userId: req.user?.id,
          organizationId: orgId
        }
      });
      status = "qualified";
      nextAction = "meeting_booked";
    }

    const updated = await prisma.prospectingRun.update({
      where: { id: run.id },
      data: {
        status,
        stageId: optOut ? run.stageId : nextStage?.id,
        qualification: {
          lastLeadMessage: message,
          intent: optOut ? "opt_out" : wantsMeeting ? "quer_agendar" : "continuar_qualificacao",
          durationMinutes,
          meetingEventId: calendarEvent?.id || null
        },
        lastAiSummary: wantsMeeting
          ? "Lead demonstrou interesse e deve ser direcionado para reuniao de 30 minutos."
          : optOut
            ? "Lead pediu para interromper o contato."
            : "Lead respondeu. Continuar qualificacao com uma pergunta objetiva por mensagem.",
        nextAction,
        qualifiedAt: wantsMeeting ? new Date() : undefined,
        handedOffAt: wantsMeeting ? new Date() : undefined,
        lastContactAt: new Date()
      }
    });

    res.json({ run: updated, calendarEvent });
  });

  router.post("/funnels/:id/enroll", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const leadIds = Array.isArray(req.body.leadIds) ? req.body.leadIds : [];
    if (leadIds.length === 0) return res.status(400).json({ error: "Selecione ao menos um lead" });

    const result = await enrollCapturedLeadsInFunnel(prisma, orgId, leadIds, req.params.id);
    res.status(201).json(result);
  });

  return router;
}
