import { PrismaClient } from "@prisma/client";
import { normalizeWhatsAppPhone } from "../utils/whatsapp.js";

export type FunnelRuntimeConfig = {
  campaignName: string;
  agentName: string;
  senderCompanyName: string;
  businessHours: string;
  maxDailyMessagesPerLead: number;
  maxDailyMessagesPerOrganization: number;
  maxDailyLeadsPerConsultant: number;
  randomDelayMinSeconds: number;
  randomDelayMaxSeconds: number;
  stopWords: string[];
};

export const DEFAULT_FUNNEL_RUNTIME_CONFIG: FunnelRuntimeConfig = {
  campaignName: "Prospeccao ativa",
  agentName: "Paulo",
  senderCompanyName: "Consultio",
  businessHours: "08:00-19:00",
  maxDailyMessagesPerLead: 1,
  maxDailyMessagesPerOrganization: 50,
  maxDailyLeadsPerConsultant: 50,
  randomDelayMinSeconds: 20,
  randomDelayMaxSeconds: 90,
  stopWords: ["parar", "remover", "nao quero", "não quero", "cancelar", "sair"],
};

export function normalizeText(value?: string | null) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function firstName(value?: string | null) {
  const cleaned = String(value || "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[^\p{L}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  const [name] = cleaned.split(/\s+/);
  if (!name || name.length < 2) return null;
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

export function getFunnelRuntimeConfig(funnel: any): FunnelRuntimeConfig {
  const rules = typeof funnel?.safetyRules === "object" && funnel.safetyRules ? funnel.safetyRules as any : {};
  return {
    campaignName: String(rules.campaignName || DEFAULT_FUNNEL_RUNTIME_CONFIG.campaignName),
    agentName: String(rules.agentName || DEFAULT_FUNNEL_RUNTIME_CONFIG.agentName),
    senderCompanyName: String(rules.senderCompanyName || DEFAULT_FUNNEL_RUNTIME_CONFIG.senderCompanyName),
    businessHours: String(rules.businessHours || DEFAULT_FUNNEL_RUNTIME_CONFIG.businessHours),
    maxDailyMessagesPerLead: Number(rules.maxDailyMessagesPerLead || DEFAULT_FUNNEL_RUNTIME_CONFIG.maxDailyMessagesPerLead),
    maxDailyMessagesPerOrganization: Number(rules.maxDailyMessagesPerOrganization || rules.maxDailyMessages || DEFAULT_FUNNEL_RUNTIME_CONFIG.maxDailyMessagesPerOrganization),
    maxDailyLeadsPerConsultant: Number(rules.maxDailyLeadsPerConsultant || DEFAULT_FUNNEL_RUNTIME_CONFIG.maxDailyLeadsPerConsultant),
    randomDelayMinSeconds: Number(rules.randomDelayMinSeconds || DEFAULT_FUNNEL_RUNTIME_CONFIG.randomDelayMinSeconds),
    randomDelayMaxSeconds: Number(rules.randomDelayMaxSeconds || DEFAULT_FUNNEL_RUNTIME_CONFIG.randomDelayMaxSeconds),
    stopWords: Array.isArray(rules.stopWords) ? rules.stopWords : DEFAULT_FUNNEL_RUNTIME_CONFIG.stopWords,
  };
}

export function parseBusinessHours(value?: string | null) {
  const match = String(value || DEFAULT_FUNNEL_RUNTIME_CONFIG.businessHours).match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!match) return { startMinutes: 8 * 60, endMinutes: 19 * 60 };
  return {
    startMinutes: Number(match[1]) * 60 + Number(match[2]),
    endMinutes: Number(match[3]) * 60 + Number(match[4]),
  };
}

export function isInsideBusinessHours(value?: string | null, now = new Date()) {
  const { startMinutes, endMinutes } = parseBusinessHours(value);
  const minutes = now.getHours() * 60 + now.getMinutes();
  return minutes >= startMinutes && minutes <= endMinutes;
}

export function dayStart(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start;
}

function cleanPersonName(value?: string | null) {
  const cleaned = String(value || "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\b(ltda|eireli|empresa|comercio|servicos|servico|clinica|farmacia)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length >= 3 ? cleaned : null;
}

function decisionMakerPriority(role?: string | null) {
  const normalized = normalizeText(role);
  if (normalized.includes("administrador")) return 1;
  if (normalized.includes("socio") || normalized.includes("sócio")) return 2;
  if (normalized.includes("representante") || normalized.includes("responsavel") || normalized.includes("responsável")) return 3;
  if (normalized.includes("diretor") || normalized.includes("ceo") || normalized.includes("founder")) return 4;
  if (normalized.includes("gerente") || normalized.includes("comercial")) return 5;
  return 8;
}

export async function upsertDecisionMakersFromLead(prisma: PrismaClient, lead: any) {
  const candidates: Array<{ name: string; role?: string | null; source: string; priority: number; confidenceScore: number; evidence?: any }> = [];
  const owners = String(lead.owners || "")
    .split(/[,;|\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  for (const owner of owners) {
    const role = owner.match(/\(([^)]+)\)/)?.[1] || null;
    const name = cleanPersonName(owner);
    if (!name) continue;
    const priority = decisionMakerPriority(role || owner);
    candidates.push({
      name,
      role,
      source: "cnpj_qsa",
      priority,
      confidenceScore: Math.max(72, 98 - priority * 5),
      evidence: { raw: owner, cnpj: lead.cnpj, cnpjStatus: lead.cnpjStatus },
    });
  }

  const managers = String(lead.managementTeam || "")
    .split(/[,;|\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  for (const manager of managers) {
    const name = cleanPersonName(manager);
    if (!name) continue;
    const priority = decisionMakerPriority(manager);
    candidates.push({
      name,
      role: manager.includes("-") ? manager.split("-").slice(1).join("-").trim() : null,
      source: "social",
      priority,
      confidenceScore: Math.max(55, 82 - priority * 4),
      evidence: { raw: manager },
    });
  }

  const unique = new Map<string, typeof candidates[number]>();
  for (const candidate of candidates) {
    const key = normalizeText(candidate.name);
    const previous = unique.get(key);
    if (!previous || candidate.confidenceScore > previous.confidenceScore) unique.set(key, candidate);
  }

  const saved = [];
  for (const candidate of unique.values()) {
    const existing = await prisma.prospectingDecisionMaker.findFirst({
      where: {
        organizationId: lead.organizationId,
        capturedLeadId: lead.id,
        name: candidate.name,
      },
    });

    const data = {
      organizationId: lead.organizationId,
      capturedLeadId: lead.id,
      name: candidate.name,
      firstName: firstName(candidate.name),
      role: candidate.role,
      source: candidate.source,
      priority: candidate.priority,
      confidenceScore: candidate.confidenceScore,
      evidence: candidate.evidence,
      isSelected: false,
    };

    saved.push(existing
      ? await prisma.prospectingDecisionMaker.update({ where: { id: existing.id }, data })
      : await prisma.prospectingDecisionMaker.create({ data }));
  }

  const best = saved.sort((a, b) => a.priority - b.priority || b.confidenceScore - a.confidenceScore)[0];
  if (best) {
    await prisma.prospectingDecisionMaker.updateMany({
      where: { capturedLeadId: lead.id },
      data: { isSelected: false },
    });
    await prisma.prospectingDecisionMaker.update({
      where: { id: best.id },
      data: { isSelected: true },
    });
  }

  return saved;
}

export async function pickBestDecisionMaker(prisma: PrismaClient, lead: any) {
  const existing = await prisma.prospectingDecisionMaker.findFirst({
    where: { organizationId: lead.organizationId, capturedLeadId: lead.id, isSelected: true },
    orderBy: [{ priority: "asc" }, { confidenceScore: "desc" }],
  });
  if (existing) return existing;

  const generated = await upsertDecisionMakersFromLead(prisma, lead);
  return generated.sort((a, b) => a.priority - b.priority || b.confidenceScore - a.confidenceScore)[0] || null;
}

export function buildProspectingFirstMessage(input: {
  agentName: string;
  senderCompanyName?: string | null;
  decisionMakerFirstName?: string | null;
}) {
  const company = input.senderCompanyName ? ` da ${input.senderCompanyName}` : "";
  if (input.decisionMakerFirstName) {
    return `Oi, aqui e o ${input.agentName}${company}. Gostaria de falar com ${input.decisionMakerFirstName}.`;
  }
  return `Oi, aqui e o ${input.agentName}${company}. Gostaria de falar com o responsavel pela empresa.`;
}

export function detectOptOut(message?: string | null, stopWords = DEFAULT_FUNNEL_RUNTIME_CONFIG.stopWords) {
  const normalized = normalizeText(message);
  return stopWords.some((word) => normalized.includes(normalizeText(word)));
}

export async function ensureOptOut(prisma: PrismaClient, input: {
  organizationId: string;
  phone: string;
  reason?: string | null;
  source?: string;
  conversationId?: string | null;
  messageId?: string | null;
  metadata?: any;
}) {
  const phone = normalizeWhatsAppPhone(input.phone);
  if (!phone.digits) return null;
  return prisma.prospectingOptOutContact.upsert({
    where: { organizationId_phone: { organizationId: input.organizationId, phone: phone.digits } },
    update: {
      displayPhone: phone.display,
      reason: input.reason || undefined,
      source: input.source || "whatsapp",
      conversationId: input.conversationId || undefined,
      messageId: input.messageId || undefined,
      metadata: input.metadata,
    },
    create: {
      organizationId: input.organizationId,
      phone: phone.digits,
      displayPhone: phone.display,
      reason: input.reason,
      source: input.source || "whatsapp",
      conversationId: input.conversationId,
      messageId: input.messageId,
      metadata: input.metadata,
    },
  });
}

export async function isOptedOut(prisma: PrismaClient, organizationId: string, phoneInput?: string | null) {
  const phone = normalizeWhatsAppPhone(phoneInput);
  if (!phone.digits) return false;
  const record = await prisma.prospectingOptOutContact.findUnique({
    where: { organizationId_phone: { organizationId, phone: phone.digits } },
    select: { id: true },
  });
  return Boolean(record);
}

export async function createDispatchAttempt(prisma: PrismaClient, input: {
  organizationId: string;
  run: any;
  channelId?: string | null;
  message: string;
  status?: string;
  reason?: string | null;
  metadata?: any;
}) {
  const phone = normalizeWhatsAppPhone(input.run.leadPhone);
  const qualification = input.run.qualification as any;
  return prisma.prospectingDispatchAttempt.create({
    data: {
      organizationId: input.organizationId,
      runId: input.run.id,
      capturedLeadId: input.run.capturedLeadId,
      channelId: input.channelId,
      consultantId: qualification?.consultantId || null,
      phone: phone.digits || null,
      displayPhone: phone.display || null,
      message: input.message,
      status: input.status || "queued",
      reason: input.reason,
      metadata: input.metadata,
    },
  });
}

export async function updateDispatchAttempt(prisma: PrismaClient, attemptId: string, input: {
  status: string;
  reason?: string | null;
  bridgeMessageId?: string | null;
  metadata?: any;
  sentAt?: Date | null;
}) {
  return prisma.prospectingDispatchAttempt.update({
    where: { id: attemptId },
    data: {
      status: input.status,
      reason: input.reason,
      bridgeMessageId: input.bridgeMessageId,
      metadata: input.metadata,
      sentAt: input.sentAt || undefined,
    },
  });
}
