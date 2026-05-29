import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";

const DEFAULT_STAGES = [
  {
    name: "Primeiro contato",
    agentKey: "whatsapp_opener",
    agentName: "Agente de Abordagem",
    goal: "Chegar ao socio ou responsavel comercial pelo nome, sem vender e sem explicar a oferta antes da pessoa certa responder.",
    prompt: "Voce e um agente de abordagem humana por WhatsApp. A primeira mensagem deve apenas pedir para falar com o socio/administrador identificado. Se a pessoa disser que ele(a) nao esta, pergunte com quem fala e depois pergunte se, alem do socio citado, existe outra pessoa que cuida do comercial. Se o socio estiver disponivel, siga para qualificacao com uma pergunta por vez. Nunca faca pitch, nunca ofereca servico e nunca envie texto longo nesta etapa.",
    successCriteria: ["Pessoa certa localizada", "Nome do atendente identificado", "Responsavel comercial mapeado"],
    nextAction: "qualificacao",
    maxMessages: 2
  },
  {
    name: "Qualificacao",
    agentKey: "qualification_sdr",
    agentName: "Agente de Qualificacao",
    goal: "Entender se a pessoa certa cuida do comercial e mapear contexto antes de qualquer proposta.",
    prompt: "Conduza a conversa como sondagem. Pergunte uma coisa por mensagem: quem cuida do comercial, como chegam novos clientes hoje, se existe alguma meta ou gargalo e se faz sentido falar com alguem do time. Nunca venda, nunca prometa resultado e nunca envie link antes de permissao clara.",
    successCriteria: ["Responsavel confirmado", "Canal atual de aquisicao entendido", "Gargalo comercial identificado", "Permissao para proximo passo"],
    nextAction: "diagnostico",
    maxMessages: 5
  },
  {
    name: "Diagnostico",
    agentKey: "opportunity_analyst",
    agentName: "Agente de Diagnostico",
    goal: "Interpretar respostas e decidir se existe abertura real para contato humano.",
    prompt: "Analise o contexto do lead, gere score de 0 a 100 e explique o proximo passo recomendado para o time comercial. Considere forte apenas quando a pessoa certa demonstrar abertura para conversa.",
    successCriteria: ["Score gerado", "Proximo passo definido", "Resumo comercial registrado"],
    nextAction: "conversao",
    maxMessages: 1
  },
  {
    name: "Conversao e handoff",
    agentKey: "handoff_closer",
    agentName: "Agente de Conversao",
    goal: "Transferir para humano somente quando houver abertura clara.",
    prompt: "Se o lead estiver qualificado, peca permissao para alguem do time continuar. Nao force agenda e nao venda; apenas confirme o melhor contato e o contexto para o humano.",
    successCriteria: ["Permissao para humano", "Contato correto confirmado", "Lead quente identificado"],
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
  requireHumanFor: ["reclamacao", "juridico", "dados sensiveis", "promessa comercial"],
  approachMode: "gatekeeper_named_owner",
  campaignName: "Prospeccao ativa",
  agentName: "Paulo"
};

function normalizeText(value?: string | null): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function toTitleCaseName(value?: string | null): string | null {
  const cleaned = String(value || "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned || /\b(ltda|eireli|empresa|farmacia|clinica|comercio)\b/i.test(cleaned)) return null;

  const firstName = cleaned.split(" ").find(part => part.length > 2) || cleaned.split(" ")[0];
  if (!firstName) return null;

  return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
}

function pickTargetOwner(lead: any): string | null {
  const rawOwners = String(lead.owners || "");
  const candidates = rawOwners
    .split(/[,;|\n]+/)
    .map(item => item.trim())
    .filter(Boolean);

  if (!candidates.length) return null;

  const preferred = candidates.find(candidate => {
    const normalized = normalizeText(candidate);
    return normalized.includes("socio") || normalized.includes("administrador") || normalized.includes("proprietario");
  });

  return toTitleCaseName(preferred || candidates[0]);
}

function getFunnelConfig(funnel: any) {
  const rules = typeof funnel?.safetyRules === "object" && funnel.safetyRules ? funnel.safetyRules as any : {};
  return {
    campaignName: String(rules.campaignName || "Prospeccao ativa"),
    agentName: String(rules.agentName || "Paulo"),
    firstStagePrompt: String(rules.firstStagePrompt || "")
  };
}

function buildQualificationSeed(lead: any, config: ReturnType<typeof getFunnelConfig>) {
  const targetOwner = pickTargetOwner(lead);

  return {
    campaignName: config.campaignName,
    agentName: config.agentName,
    targetOwner,
    approachMode: "gatekeeper_named_owner",
    fallbackFlow: [
      targetOwner ? `Pedir para falar com ${targetOwner}.` : "Pedir para falar com a pessoa responsavel pelo comercial.",
      "Se a pessoa alvo nao estiver, perguntar com quem esta falando.",
      targetOwner ? `Perguntar se, alem de ${targetOwner}, existe outra pessoa que cuida do comercial.` : "Perguntar se existe outra pessoa que cuida do comercial.",
      "Se a pessoa certa estiver disponivel, iniciar qualificacao com uma pergunta objetiva."
    ]
  };
}

function serializeFunnel(funnel: any) {
  const config = getFunnelConfig(funnel);

  return {
    ...funnel,
    campaignName: config.campaignName,
    agentName: config.agentName,
    firstStagePrompt: config.firstStagePrompt
  };
}

function buildFirstMessage(lead: any, config = getFunnelConfig(null)) {
  const targetOwner = pickTargetOwner(lead);
  const agentName = config.agentName || "Paulo";

  if (targetOwner) {
    return `Oi, meu nome e ${agentName}. Quero falar com ${targetOwner}, por gentileza.`;
  }

  return `Oi, meu nome e ${agentName}. Quero falar com a pessoa responsavel pelo comercial, por gentileza.`;
}

export async function ensureDefaultFunnel(prisma: PrismaClient, organizationId: string) {
  const existing = await prisma.prospectingFunnel.findFirst({
    where: { organizationId, isDefault: true },
    include: { stages: { orderBy: { order: "asc" } } }
  });

  if (existing) {
    const config = getFunnelConfig(existing);
    if ((existing.safetyRules as any)?.approachMode !== "gatekeeper_named_owner") {
      await prisma.prospectingFunnel.update({
        where: { id: existing.id },
        data: {
          description: "Funil padrao para receber leads captados, localizar o socio/administrador pelo nome, qualificar sem vender e transferir oportunidades quentes para o time comercial.",
          objective: "Transformar leads validados em conversas qualificadas sem pitch na primeira abordagem.",
          safetyRules: { ...DEFAULT_SAFETY_RULES, campaignName: config.campaignName, agentName: config.agentName }
        }
      });

      for (const stage of DEFAULT_STAGES) {
        await prisma.prospectingFunnelStage.updateMany({
          where: { funnelId: existing.id, order: DEFAULT_STAGES.indexOf(stage) },
          data: {
            name: stage.name,
            agentKey: stage.agentKey,
            agentName: stage.agentName,
            goal: stage.goal,
            prompt: stage.prompt,
            successCriteria: stage.successCriteria as any,
            nextAction: stage.nextAction,
            maxMessages: stage.maxMessages,
            isHumanHandoff: "isHumanHandoff" in stage ? Boolean(stage.isHumanHandoff) : false
          }
        });
      }

      return prisma.prospectingFunnel.findFirstOrThrow({
        where: { id: existing.id },
        include: { stages: { orderBy: { order: "asc" } } }
      });
    }

    return existing;
  }

  return prisma.prospectingFunnel.create({
    data: {
      organizationId,
      name: "WhatsApp SDR IA",
      description: "Funil padrao para receber leads captados, localizar o socio/administrador pelo nome, qualificar sem vender e transferir oportunidades quentes para o time comercial.",
      channel: "WHATSAPP",
      objective: "Transformar leads validados em conversas qualificadas sem pitch na primeira abordagem.",
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
  const funnelConfig = getFunnelConfig(funnel);

  const leads = await prisma.capturedLead.findMany({
    where: { organizationId, id: { in: leadIds } }
  });

  const results = [];

  for (const lead of leads) {
    const score = lead.scoreOpportunity || 0;
    const firstMessage = buildFirstMessage(lead, funnelConfig);
    const qualificationSeed = buildQualificationSeed(lead, funnelConfig);
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
        qualification: qualificationSeed,
        firstMessage,
        nextAction: "ask_for_named_decision_maker"
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
        qualification: qualificationSeed,
        firstMessage,
        nextAction: "ask_for_named_decision_maker"
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

    res.json(funnels.map(serializeFunnel));
  });

  router.post("/funnels/default", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const funnel = await ensureDefaultFunnel(prisma, orgId);
    res.status(201).json(serializeFunnel(funnel));
  });

  router.post("/funnels", async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(401).json({ error: "Unauthorized" });

    const { name, description, objective, campaignName, agentName, firstStagePrompt } = req.body;
    if (!name) return res.status(400).json({ error: "Nome do funil e obrigatorio" });

    const safeCampaignName = String(campaignName || name).trim();
    const safeAgentName = String(agentName || "Paulo").trim();
    const safeFirstStagePrompt = String(firstStagePrompt || "").trim();
    const stages = DEFAULT_STAGES.map((stage, index) => ({
      ...stage,
      ...(index === 0 && safeFirstStagePrompt ? { prompt: safeFirstStagePrompt, goal: "Executar a primeira abordagem configurada sem pitch e sem texto longo." } : {}),
      order: index,
      successCriteria: stage.successCriteria as any
    }));

    const funnel = await prisma.prospectingFunnel.create({
      data: {
        organizationId: orgId,
        name,
        description,
        objective: objective || `Campanha: ${safeCampaignName}`,
        channel: "WHATSAPP",
        qualificationRules: DEFAULT_QUALIFICATION_RULES,
        handoffRules: DEFAULT_HANDOFF_RULES,
        safetyRules: {
          ...DEFAULT_SAFETY_RULES,
          campaignName: safeCampaignName,
          agentName: safeAgentName,
          firstStagePrompt: safeFirstStagePrompt
        },
        stages: {
          create: stages
        }
      },
      include: { stages: { orderBy: { order: "asc" } } }
    });

    res.status(201).json(serializeFunnel(funnel));
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
