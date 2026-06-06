import { NextFunction, Router, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import {
  buildProspectingFirstMessage,
  buildProspectingAgentMemorySeed,
  firstName as pickPersonFirstName,
  getFunnelRuntimeConfig,
  mergeProspectingAgentMemory,
  pickBestDecisionMaker,
  upsertDecisionMakersFromLead,
} from "../services/prospectingAutomation.js";
import { LeadCaptureService } from "../modules/lead-capture/lead-capture.service.js";

type ProspectingHandler = (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;

function asyncHandler(handler: ProspectingHandler) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

const DEFAULT_STAGES = [
  {
    name: "Primeiro contato",
    agentKey: "whatsapp_opener",
    agentName: "Agente de Abordagem",
    goal: "Chegar ao socio, proprietario, administrador ou responsavel comercial pelo nome, sem vender e sem explicar nada antes da pessoa certa responder.",
    prompt: "Voce e um SDR humano por WhatsApp. A primeira etapa serve somente para chegar no decisor: socio, proprietario, administrador ou alguem da area comercial. Nunca diga que somos agencia. Nunca fale de marketing, venda, solucao digital, presenca digital, tecnologia, diagnostico, avaliacao, clientes ou crescimento na primeira mensagem. Nunca despeje contexto sobre a empresa antes de confirmar que esta falando com quem decide. A primeira mensagem deve apenas perguntar quem e o responsavel pelo comercial. Uma pergunta por mensagem, tom humano, direto e sem cara de robo.",
    successCriteria: ["Pessoa certa localizada", "Nome do atendente identificado", "Responsavel comercial mapeado"],
    nextAction: "qualificacao",
    maxMessages: 2
  },
  {
    name: "Qualificacao",
    agentKey: "qualification_sdr",
    agentName: "Agente de Qualificacao",
    goal: "Confirmar se a pessoa decide ou influencia o comercial e mapear abertura antes de qualquer avaliacao.",
    prompt: "Conduza a conversa como um humano. Primeiro confirme se a pessoa cuida das decisoes comerciais ou pode te passar ao socio/proprietario/responsavel comercial. So depois de confirmar decisor ou influenciador, pergunte uma coisa por vez sobre a area comercial. Posicionamento permitido apos abertura: implementacao comercial e estrutura comercial. Posicionamento proibido: somos agencia, marketing digital, avaliamos sua presenca online, diagnostico completo sem permissao.",
    successCriteria: ["Responsavel confirmado", "Canal atual de aquisicao entendido", "Gargalo comercial identificado", "Permissao para proximo passo"],
    nextAction: "diagnostico",
    maxMessages: 5
  },
  {
    name: "Diagnostico",
    agentKey: "opportunity_analyst",
    agentName: "Agente de Diagnostico",
    goal: "Interpretar respostas apenas quando houver decisor ou abertura real para conversa comercial.",
    prompt: "Analise o contexto do lead, gere score de 0 a 100 e explique o proximo passo recomendado para o time comercial. Considere forte apenas quando decisor, socio/proprietario ou area comercial demonstrar abertura. Nao use a avaliacao da empresa como mensagem para recepcionista ou pessoa que nao decide.",
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
  "fala comigo",
  "sou eu que cuido",
  "sou o responsavel",
  "sou o responsável",
  "cuido do comercial",
  "me passa valores"
];

const DEFAULT_SAFETY_RULES = {
  businessHours: "08:00-19:00",
  maxDailyMessagesPerLead: 4,
  maxDailyLeadsPerConsultant: 50,
  consultantDepartments: ["BDR", "SDR", "COMERCIAL", "VENDAS", "GERAL"],
  stopWords: ["parar", "remover", "nao quero", "não quero", "cancelar"],
  requireHumanFor: ["reclamacao", "juridico", "dados sensiveis", "promessa comercial"],
  approachMode: "gatekeeper_named_owner",
  approachVersion: "decision_maker_commercial_structure_v3",
  campaignName: "Prospeccao ativa",
  senderCompanyName: "Consultio",
  agentName: "Paulo"
};

const PROSPECTING_AGENTS = [
  {
    id: "google_captor",
    name: "Captador Google",
    role: "Pesquisa nichos, cidades e oportunidades no Google/Maps.",
    stage: "captura",
    tone: "criterioso"
  },
  {
    id: "lead_validator",
    name: "Validador de Lead",
    role: "Remove contatos ruins, telefones invalidos e empresas fora do ICP.",
    stage: "validacao",
    tone: "analitico"
  },
  {
    id: "decision_researcher",
    name: "Pesquisador de Decisor",
    role: "Busca socio, proprietario, administrador ou responsavel comercial.",
    stage: "decisor",
    tone: "investigativo"
  },
  {
    id: "sdr_first_touch",
    name: "SDR Primeiro Contato",
    role: "Abre conversa no WhatsApp sem pitch e sem parecer vendedor de marketing.",
    stage: "primeiro_contato",
    tone: "humano"
  },
  {
    id: "bdr_qualifier",
    name: "BDR Qualificacao",
    role: "Qualifica abertura, perfil e urgencia depois que o decisor aparece.",
    stage: "qualificacao",
    tone: "consultivo"
  },
  {
    id: "followup_agent",
    name: "Agente de Follow-up",
    role: "Retoma conversas com cadencia leve e sem insistencia agressiva.",
    stage: "followup",
    tone: "persistente"
  },
  {
    id: "reactivation_agent",
    name: "Agente de Reativacao",
    role: "Reabre oportunidades frias com contexto curto e natural.",
    stage: "reativacao",
    tone: "direto"
  },
  {
    id: "schedule_agent",
    name: "Agente de Agenda",
    role: "Converte abertura real em proximo passo e agenda.",
    stage: "agenda",
    tone: "objetivo"
  },
  {
    id: "closer_handoff",
    name: "Closer / Handoff",
    role: "Entrega leads qualificados ao humano com resumo e contexto.",
    stage: "handoff",
    tone: "comercial"
  },
  {
    id: "safety_supervisor",
    name: "Supervisor de Seguranca",
    role: "Bloqueia pitch precoce, opt-out, palavras sensiveis e mensagens inseguras.",
    stage: "seguranca",
    tone: "guardiao"
  }
];

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

function pickFirstName(value?: string | null): string | null {
  const cleaned = String(value || "").trim();
  if (!cleaned) return null;
  const [name] = cleaned.split(/\s+/);
  return name ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() : null;
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
  const runtime = getFunnelRuntimeConfig(funnel);
  const rules = typeof funnel?.safetyRules === "object" && funnel.safetyRules ? funnel.safetyRules as any : {};
  return {
    campaignName: runtime.campaignName,
    agentName: runtime.agentName,
    senderCompanyName: runtime.senderCompanyName,
    firstStagePrompt: String(rules.firstStagePrompt || "")
  };
}

function buildQualificationSeed(lead: any, config: ReturnType<typeof getFunnelConfig>) {
  const targetOwner = pickTargetOwner(lead);

  return {
    campaignName: config.campaignName,
    agentName: config.agentName,
    senderCompanyName: config.senderCompanyName,
    targetOwner,
    approachMode: "gatekeeper_named_owner",
    fallbackFlow: [
      targetOwner ? `Pedir para falar com ${targetOwner} ou com quem decide o comercial.` : "Pedir para falar com o socio, proprietario ou pessoa responsavel pelo comercial.",
      "Se a pessoa alvo nao estiver, perguntar de forma natural com quem esta falando.",
      targetOwner ? `Perguntar se, alem de ${targetOwner}, existe outra pessoa que cuida do comercial.` : "Perguntar se existe outra pessoa que cuida do comercial.",
      "Se perguntarem o assunto antes do decisor, dizer apenas que e sobre implementacao comercial e confirmar com quem trata esse tema.",
      "So falar de avaliacao/diagnostico quando estiver com o decisor e houver abertura."
    ]
  };
}

function serializeFunnel(funnel: any) {
  const config = getFunnelConfig(funnel);

  return {
    ...funnel,
    campaignName: config.campaignName,
    agentName: config.agentName,
    senderCompanyName: config.senderCompanyName,
    firstStagePrompt: config.firstStagePrompt
  };
}

function buildFirstMessage(lead: any, config = getFunnelConfig(null)) {
  const targetOwner = pickTargetOwner(lead);
  return buildProspectingFirstMessage({
    agentName: config.agentName || "Paulo",
    senderCompanyName: config.senderCompanyName,
    decisionMakerFirstName: targetOwner,
  });
}

async function pickNextConsultant(prisma: PrismaClient, organizationId: string, funnel: any) {
  const rules = typeof funnel?.safetyRules === "object" && funnel.safetyRules ? funnel.safetyRules as any : {};
  const allowedDepartments = Array.isArray(rules.consultantDepartments)
    ? rules.consultantDepartments.map((department: string) => normalizeText(department))
    : DEFAULT_SAFETY_RULES.consultantDepartments.map((department) => normalizeText(department));
  const dailyLimit = Number(rules.maxDailyLeadsPerConsultant || DEFAULT_SAFETY_RULES.maxDailyLeadsPerConsultant);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const users = await prisma.user.findMany({
    where: { organizationId, status: "ACTIVE" },
    select: { id: true, name: true, department: true },
    orderBy: { name: "asc" }
  });
  const consultants = users.filter((user) => allowedDepartments.includes(normalizeText(user.department || "GERAL")));
  if (!consultants.length) return null;

  const load = await Promise.all(consultants.map(async (user) => ({
    user,
    count: await prisma.capturedLead.count({
      where: {
        organizationId,
        responsibleId: user.id,
        crmStatus: "prospecting_funnel",
        updatedAt: { gte: today }
      }
    })
  })));

  return load
    .filter((item) => item.count < dailyLimit)
    .sort((a, b) => a.count - b.count || String(a.user.name || "").localeCompare(String(b.user.name || "")))[0]?.user || null;
}

export async function ensureDefaultFunnel(prisma: PrismaClient, organizationId: string) {
  const existing = await prisma.prospectingFunnel.findFirst({
    where: { organizationId, isDefault: true },
    include: { stages: { orderBy: { order: "asc" } } }
  });

  if (existing) {
    const config = getFunnelConfig(existing);
    const safetyRules = existing.safetyRules as any;
    if (
      safetyRules?.approachMode !== DEFAULT_SAFETY_RULES.approachMode ||
      safetyRules?.approachVersion !== DEFAULT_SAFETY_RULES.approachVersion
    ) {
      await prisma.prospectingFunnel.update({
        where: { id: existing.id },
        data: {
          description: "Funil padrao para receber leads captados, localizar socio/proprietario ou responsavel comercial, conversar sem parecer robo e transferir oportunidades quentes para o time comercial.",
          objective: "Encontrar o decisor e abrir uma conversa sobre estrutura comercial, previsibilidade e aumento de receita sem pitch na primeira abordagem.",
          qualificationRules: DEFAULT_QUALIFICATION_RULES,
          handoffRules: DEFAULT_HANDOFF_RULES,
          safetyRules: { ...DEFAULT_SAFETY_RULES, campaignName: config.campaignName, agentName: config.agentName, senderCompanyName: config.senderCompanyName, firstStagePrompt: config.firstStagePrompt }
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
      description: "Funil padrao para receber leads captados, localizar socio/proprietario ou responsavel comercial, conversar sem parecer robo e transferir oportunidades quentes para o time comercial.",
      channel: "WHATSAPP",
      objective: "Encontrar o decisor e abrir uma conversa sobre estrutura comercial, previsibilidade e aumento de receita sem pitch na primeira abordagem.",
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

async function refreshQueuedFirstMessages(prisma: PrismaClient, organizationId: string, funnel: any) {
  const config = getFunnelConfig(funnel);
  const queuedRuns = await prisma.prospectingRun.findMany({
    where: {
      organizationId,
      funnelId: funnel.id,
      status: "queued",
      capturedLeadId: { not: null }
    },
    include: { capturedLead: true }
  });

  for (const run of queuedRuns) {
    if (!run.capturedLead) continue;

    await prisma.prospectingRun.update({
      where: { id: run.id },
      data: {
        firstMessage: buildFirstMessage(run.capturedLead, config),
        qualification: {
          ...buildQualificationSeed(run.capturedLead, config),
          ...((run.qualification as any) || {}),
          agentMemory: (run.qualification as any)?.agentMemory || buildProspectingAgentMemorySeed({
            lead: run.capturedLead,
            funnel,
            stage: funnel.stages?.[0],
            config,
          })
        },
        nextAction: "ask_for_decision_maker"
      }
    });
  }

  return queuedRuns.length;
}

async function refreshAllQueuedFirstMessages(prisma: PrismaClient, organizationId: string) {
  const funnels = await prisma.prospectingFunnel.findMany({
    where: { organizationId },
    include: { stages: { orderBy: { order: "asc" } } }
  });

  let refreshedRuns = 0;
  for (const funnel of funnels) {
    refreshedRuns += await refreshQueuedFirstMessages(prisma, organizationId, funnel);
  }

  return refreshedRuns;
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
    const identityValidated = lead.cnpjStatus === "validated";
    const leadForFunnel = identityValidated ? lead : { ...lead, cnpj: null, owners: null };
    if (identityValidated) {
      await upsertDecisionMakersFromLead(prisma, leadForFunnel);
    }
    const decisionMaker = identityValidated ? await pickBestDecisionMaker(prisma, leadForFunnel) : null;
    const score = leadForFunnel.scoreOpportunity || 0;
    const consultant = lead.responsibleId
      ? await prisma.user.findFirst({ where: { id: lead.responsibleId, organizationId }, select: { id: true, name: true } })
      : await pickNextConsultant(prisma, organizationId, funnel);
    const runConfig = consultant?.name
      ? { ...funnelConfig, agentName: pickFirstName(consultant.name) || funnelConfig.agentName }
      : funnelConfig;
    const firstMessage = buildProspectingFirstMessage({
      agentName: runConfig.agentName,
      senderCompanyName: runConfig.senderCompanyName,
      decisionMakerFirstName: pickPersonFirstName(decisionMaker?.firstName || decisionMaker?.name) || pickTargetOwner(leadForFunnel),
    });
    const qualificationSeed = {
      ...buildQualificationSeed(leadForFunnel, runConfig),
      consultantId: consultant?.id || lead.responsibleId || null,
      consultantName: consultant?.name || null,
      decisionMakerId: decisionMaker?.id || null,
      decisionMakerName: decisionMaker?.name || null,
      decisionMakerConfidence: decisionMaker?.confidenceScore || null,
      agentMemory: buildProspectingAgentMemorySeed({
        lead: leadForFunnel,
        funnel,
        stage: firstStage,
        config: runConfig,
        consultant,
        decisionMaker,
        score,
      })
    };
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
        leadPhone: leadForFunnel.phoneNormalized || leadForFunnel.phone,
        leadSnapshot: leadForFunnel as any,
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
        leadName: leadForFunnel.businessName,
        leadPhone: leadForFunnel.phoneNormalized || leadForFunnel.phone,
        leadSnapshot: leadForFunnel as any,
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
        responsibleId: consultant?.id || lead.responsibleId || null,
        notes: [
          lead.notes,
          !identityValidated ? "Funil: CNPJ/socios omitidos porque a identidade empresarial nao esta validada." : null,
          consultant?.name ? `Responsavel comercial: ${consultant.name}` : null,
          `Enviado ao funil IA WhatsApp: ${funnel.name}`
        ].filter(Boolean).join("\n")
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
  const leadCaptureService = new LeadCaptureService(prisma);

  router.get("/agents", asyncHandler(async (_req: AuthRequest, res) => {
    res.json(PROSPECTING_AGENTS);
  }));

  router.get("/funnels", asyncHandler(async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const funnels = await prisma.prospectingFunnel.findMany({
      where: { organizationId: orgId },
      include: {
        stages: { orderBy: { order: "asc" } },
        _count: { select: { runs: true } }
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }]
    });

    res.json(funnels.map(serializeFunnel));
  }));

  router.post("/funnels/default", asyncHandler(async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const funnel = await ensureDefaultFunnel(prisma, orgId);
    const refreshedRuns = await refreshQueuedFirstMessages(prisma, orgId, funnel);
    res.status(201).json({ ...serializeFunnel(funnel), refreshedRuns });
  }));

  router.post("/funnels", asyncHandler(async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { name, description, objective, campaignName, agentName, senderCompanyName, firstStagePrompt } = req.body;
    if (!name) {
      res.status(400).json({ error: "Nome do funil e obrigatorio" });
      return;
    }

    const safeCampaignName = String(campaignName || name).trim();
    const safeAgentName = String(agentName || "Paulo").trim();
    const safeSenderCompanyName = String(senderCompanyName || DEFAULT_SAFETY_RULES.senderCompanyName).trim();
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
          senderCompanyName: safeSenderCompanyName,
          firstStagePrompt: safeFirstStagePrompt
        },
        stages: {
          create: stages
        }
      },
      include: { stages: { orderBy: { order: "asc" } } }
    });

    res.status(201).json(serializeFunnel(funnel));
  }));

  router.get("/runs", asyncHandler(async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      await refreshAllQueuedFirstMessages(prisma, orgId);
    } catch (error: any) {
      console.warn("[PROSPECTING_FUNNELS_REFRESH_WARNING]", error?.message || error);
    }

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
  }));

  router.post("/campaigns/prepare", asyncHandler(async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const {
      funnelId = "default",
      name,
      niche,
      city,
      state,
      provider = process.env.PROSPECT_DEFAULT_PROVIDER || "serper",
      leadQuantity = 25,
      channelId,
      agentId = "sdr_first_touch",
      executionDate,
      executionTime,
      dailyMessageLimit = 50,
      messageIntervalMinutes = 15
    } = req.body || {};

    if (!niche || !city || !state) {
      res.status(400).json({ error: "Informe nicho, cidade e UF para preparar a campanha." });
      return;
    }

    const selectedAgent = PROSPECTING_AGENTS.find((agent) => agent.id === agentId) || PROSPECTING_AGENTS.find((agent) => agent.id === "sdr_first_touch")!;
    const channel = channelId
      ? await prisma.channel.findFirst({
          where: { id: String(channelId), provider: "WHATS_MEOW", isActive: true, inbox: { organizationId: orgId } },
          select: { id: true, identifier: true, config: true, inbox: { select: { id: true, name: true } } }
        })
      : null;

    if (channelId && !channel) {
      res.status(400).json({ error: "Instancia WhatsApp invalida ou inativa para esta organizacao." });
      return;
    }

    const funnel = funnelId === "default"
      ? await ensureDefaultFunnel(prisma, orgId)
      : await prisma.prospectingFunnel.findFirst({
          where: { id: String(funnelId), organizationId: orgId },
          include: { stages: { orderBy: { order: "asc" } } }
        });

    if (!funnel) {
      res.status(404).json({ error: "Funil nao encontrado." });
      return;
    }

    const capture = await leadCaptureService.captureLeads({
      tenantId: orgId,
      userId: req.user?.id,
      provider,
      keyword: niche,
      city,
      state,
      country: "Brasil",
      limit: Number(leadQuantity || 25),
      filters: { onlyWithPhone: true }
    } as any);

    const leadIds = (capture.leads || [])
      .filter((lead: any) => lead.phoneNormalized || lead.phone)
      .map((lead: any) => lead.id);

    const enrollment = await enrollCapturedLeadsInFunnel(prisma, orgId, leadIds, funnel.id);
    const runIds = enrollment.runs.map((run: any) => run.id);
    const scheduledAt = executionDate && executionTime
      ? new Date(`${executionDate}T${executionTime}:00`).toISOString()
      : null;
    const campaignName = String(name || `${niche} - ${city}/${state}`).trim();

    for (const run of enrollment.runs as any[]) {
      await prisma.prospectingRun.update({
        where: { id: run.id },
        data: {
          nextAction: scheduledAt ? "scheduled_first_contact" : "ready_first_contact",
          qualification: {
            ...((run.qualification as any) || {}),
            campaign: {
              name: campaignName,
              niche,
              city,
              state: String(state).toUpperCase(),
              provider,
              channelId: channel?.id || null,
              channelName: (channel?.config as any)?.label || channel?.inbox?.name || null,
              agentId: selectedAgent.id,
              agentName: selectedAgent.name,
              scheduledAt,
              dailyMessageLimit: Number(dailyMessageLimit || 50),
              messageIntervalMinutes: Number(messageIntervalMinutes || 15)
            }
          }
        }
      });
    }

    res.status(201).json({
      campaign: {
        name: campaignName,
        funnelId: funnel.id,
        agent: selectedAgent,
        channel,
        scheduledAt,
        dailyMessageLimit: Number(dailyMessageLimit || 50),
        messageIntervalMinutes: Number(messageIntervalMinutes || 15)
      },
      capture: {
        sourceId: capture.sourceId,
        totalFound: capture.totalFound,
        totalImported: capture.totalImported
      },
      enrolled: enrollment.enrolled,
      skipped: enrollment.skipped,
      runIds
    });
  }));

  router.post("/runs/:id/response", asyncHandler(async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { message, meetingStartDate, durationMinutes = 30 } = req.body;
    if (!message) {
      res.status(400).json({ error: "Resposta do lead e obrigatoria" });
      return;
    }

    const run = await prisma.prospectingRun.findFirst({
      where: { id: req.params.id, organizationId: orgId },
      include: {
        funnel: { include: { stages: { orderBy: { order: "asc" } } } },
        stage: true
      }
    });

    if (!run) {
      res.status(404).json({ error: "Execucao do funil nao encontrada" });
      return;
    }

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

    const previousQualification = (run.qualification as any) || {};
    const summary = wantsMeeting
      ? "Lead demonstrou interesse e deve ser direcionado para reuniao de 30 minutos."
      : optOut
        ? "Lead pediu para interromper o contato."
        : "Lead respondeu. Continuar qualificacao com uma pergunta objetiva por mensagem.";
    const intent = optOut ? "opt_out" : wantsMeeting ? "quer_agendar" : "continuar_qualificacao";

    const updated = await prisma.prospectingRun.update({
      where: { id: run.id },
      data: {
        status,
        stageId: optOut ? run.stageId : nextStage?.id,
        qualification: {
          ...mergeProspectingAgentMemory(previousQualification, {
            currentStage: run.stage,
            nextStage: optOut ? run.stage : nextStage,
            leadMessage: message,
            intent,
            status,
            nextAction,
            summary,
          }),
          durationMinutes,
          meetingEventId: calendarEvent?.id || null
        },
        lastAiSummary: summary,
        nextAction,
        qualifiedAt: wantsMeeting ? new Date() : undefined,
        handedOffAt: wantsMeeting ? new Date() : undefined,
        lastContactAt: new Date()
      }
    });

    res.json({ run: updated, calendarEvent });
  }));

  router.post("/funnels/:id/enroll", asyncHandler(async (req: AuthRequest, res) => {
    const orgId = req.user?.orgId;
    if (!orgId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const leadIds = Array.isArray(req.body.leadIds) ? req.body.leadIds : [];
    if (leadIds.length === 0) {
      res.status(400).json({ error: "Selecione ao menos um lead" });
      return;
    }

    const result = await enrollCapturedLeadsInFunnel(prisma, orgId, leadIds, req.params.id);
    res.status(201).json(result);
  }));

  return router;
}
