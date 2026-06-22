import { PrismaClient } from "@prisma/client";
import {
  normalizeWhatsAppPhone,
} from "../utils/whatsapp.js";
import {
  createDispatchAttempt,
  getFunnelRuntimeConfig,
  isInsideBusinessHours,
  isOptedOut,
  mergeProspectingAgentMemory,
  updateDispatchAttempt,
} from "./prospectingAutomation.js";

const WHATSAPP_PROVIDER = "WHATS_MEOW";

function bridgeBaseUrl() {
  return process.env.WHATSAPP_BRIDGE_URL || "http://localhost:8091";
}

function bridgeSecret() {
  return process.env.WHATSAPP_BRIDGE_SECRET || "dev-whatsapp-bridge-secret";
}

function dayStart(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start;
}

function isUnsafeProspectingFirstMessage(message?: string | null) {
  const normalized = String(message || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return [
    "marketing",
    "presenca digital",
    "presenca online",
    "solucoes digitais",
    "solucao digital",
    "tecnologia",
    "atrair mais clientes",
    "captacao de novos clientes",
    "grande potencial",
    "diagnostico",
    "avaliacao",
    "[seu nome]",
  ].some((term) => normalized.includes(term));
}

function safeProspectingFirstMessage() {
  return "Oi, tudo bem? Poderia me informar quem e a pessoa responsavel pelo comercial da empresa?";
}

async function callBridge(path: string, body: any) {
  const res = await fetch(`${bridgeBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-whatsapp-bridge-secret": bridgeSecret(),
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `WhatsApp bridge error ${res.status}`);
  }
  return data;
}

async function pickChannel(prisma: PrismaClient, organizationId: string, preferredChannelId?: string | null) {
  if (preferredChannelId) {
    const preferred = await prisma.channel.findFirst({
      where: {
        id: preferredChannelId,
        provider: WHATSAPP_PROVIDER,
        isActive: true,
        inbox: { organizationId },
      },
      include: { inbox: true },
    });
    if (preferred) return preferred;
  }

  return prisma.channel.findFirst({
    where: {
      provider: WHATSAPP_PROVIDER,
      isActive: true,
      inbox: { organizationId },
    },
    include: { inbox: true },
    orderBy: { createdAt: "desc" },
  });
}

async function hasRecentBlockedAttempt(prisma: PrismaClient, runId: string, minutes = 10) {
  const since = new Date(Date.now() - minutes * 60 * 1000);
  const recent = await prisma.prospectingDispatchAttempt.findFirst({
    where: {
      runId,
      status: { in: ["blocked", "skipped"] },
      createdAt: { gte: since },
    },
    select: { id: true },
  });
  return Boolean(recent);
}

async function recordOutboundProspectingMessage(prisma: PrismaClient, input: {
  channel: any;
  organizationId: string;
  toJid: string;
  content: string;
  run: any;
  userId?: string | null;
  bridgeMessageId?: string | null;
}) {
  const phone = normalizeWhatsAppPhone(input.toJid);
  let conversation = await prisma.conversation.findFirst({
    where: { channelId: input.channel.id, contactId: input.toJid },
  });

  const metadata = {
    externalChatId: input.toJid,
    isGroup: false,
    phone: phone.e164,
    displayPhone: phone.display,
    displayName: input.run.leadName || phone.display,
    prospectingRunId: input.run.id,
    provider: WHATSAPP_PROVIDER,
  };

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        subject: input.run.leadName || phone.display,
        inboxId: input.channel.inboxId,
        channelId: input.channel.id,
        contactId: input.toJid,
        status: "open",
        priority: "medium",
        lastMessageAt: new Date(),
      } as any,
    });
  }

  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: input.userId || undefined,
      senderType: input.userId ? "USER" : "AI",
      content: input.content,
      type: "text",
      metadata: {
        source: "nexus_prospecting_worker",
        bridgeMessageId: input.bridgeMessageId || null,
        fromMe: true,
        displayName: input.userId ? "Voce" : "SDR IA",
        displayPhone: phone.display,
        prospectingRunId: input.run.id,
        conversation: metadata,
      },
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date(), subject: input.run.leadName || conversation.subject },
  });

  return message;
}

function campaignScheduledAt(run: any) {
  const value = (run.qualification as any)?.campaign?.scheduledAt;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function preferredChannelId(run: any) {
  return (run.qualification as any)?.campaign?.channelId || null;
}

function shouldSendNow(run: any, now = new Date()) {
  const scheduledAt = campaignScheduledAt(run);
  if (!scheduledAt) return true;
  return scheduledAt <= now;
}

async function markReadyAgain(prisma: PrismaClient, run: any, nextAction = "ready_first_contact") {
  await prisma.prospectingRun.update({
    where: { id: run.id },
    data: { status: "queued", nextAction },
  }).catch(() => null);
}

export async function dispatchProspectingRun(prisma: PrismaClient, run: any, options: {
  userId?: string | null;
  channelId?: string | null;
  maxDailyMessages?: number | null;
  automated?: boolean;
} = {}) {
  const orgId = run.organizationId;
  const runtimeConfig = getFunnelRuntimeConfig(run.funnel);
  const selectedChannelId = options.channelId || preferredChannelId(run);
  const channel = await pickChannel(prisma, orgId, selectedChannelId);
  if (!channel) {
    await markReadyAgain(prisma, run);
    return { ok: false, runId: run.id, error: "Nenhuma instancia WhatsApp ativa encontrada." };
  }

  const messageLimit = Number(
    options.maxDailyMessages ||
    (channel.config as any)?.maxDailyMessages ||
    runtimeConfig.maxDailyMessagesPerOrganization ||
    50
  );
  const alreadySentToday = await prisma.prospectingRun.count({
    where: {
      organizationId: orgId,
      channel: "WHATSAPP",
      status: { in: ["sent", "active", "human_handoff", "qualified"] },
      lastContactAt: { gte: dayStart() },
    },
  });

  const firstMessage = isUnsafeProspectingFirstMessage(run.firstMessage)
    ? safeProspectingFirstMessage()
    : run.firstMessage;

  const attempt = await createDispatchAttempt(prisma, {
    organizationId: orgId,
    run,
    channelId: channel.id,
    message: firstMessage || "",
    status: "queued",
    metadata: { runtimeConfig, automated: Boolean(options.automated) },
  });

  if (alreadySentToday >= messageLimit) {
    await updateDispatchAttempt(prisma, attempt.id, { status: "blocked", reason: "Limite diario de mensagens atingido para esta organizacao" });
    await markReadyAgain(prisma, run);
    return { ok: false, runId: run.id, error: "Limite diario de mensagens atingido para esta organizacao" };
  }

  if (!isInsideBusinessHours(runtimeConfig.businessHours)) {
    await updateDispatchAttempt(prisma, attempt.id, { status: "skipped", reason: `Fora do horario comercial (${runtimeConfig.businessHours})` });
    await markReadyAgain(prisma, run);
    return { ok: false, runId: run.id, error: `Fora do horario comercial (${runtimeConfig.businessHours})` };
  }

  const phone = normalizeWhatsAppPhone(run.leadPhone);
  if (!phone.jid || !phone.isValid || !firstMessage) {
    await updateDispatchAttempt(prisma, attempt.id, { status: "failed", reason: "Lead sem telefone valido ou mensagem" });
    await prisma.prospectingRun.update({
      where: { id: run.id },
      data: { status: "stopped", nextAction: "invalid_phone_or_message" },
    }).catch(() => null);
    return { ok: false, runId: run.id, error: "Lead sem telefone valido ou mensagem" };
  }

  if (await isOptedOut(prisma, orgId, phone.digits)) {
    await updateDispatchAttempt(prisma, attempt.id, { status: "blocked", reason: "Contato em opt-out" });
    await prisma.prospectingRun.update({
      where: { id: run.id },
      data: { status: "stopped", nextAction: "opt_out_blocked" },
    });
    return { ok: false, runId: run.id, error: "Contato em opt-out" };
  }

  const leadSentToday = await prisma.prospectingDispatchAttempt.count({
    where: {
      organizationId: orgId,
      runId: run.id,
      status: "sent",
      createdAt: { gte: dayStart() },
    },
  });
  if (leadSentToday >= runtimeConfig.maxDailyMessagesPerLead) {
    await updateDispatchAttempt(prisma, attempt.id, { status: "blocked", reason: "Limite diario por lead atingido" });
    await markReadyAgain(prisma, run);
    return { ok: false, runId: run.id, error: "Limite diario por lead atingido" };
  }

  let bridge: any;
  try {
    bridge = await callBridge(`/sessions/${channel.id}/send`, {
      channelId: channel.id,
      to: phone.jid,
      message: firstMessage,
    });
  } catch (error: any) {
    await updateDispatchAttempt(prisma, attempt.id, { status: "failed", reason: error?.message || "Falha ao enviar pelo WhatsApp bridge" });
    await markReadyAgain(prisma, run);
    return { ok: false, runId: run.id, error: error?.message || "Falha ao enviar pelo WhatsApp bridge" };
  }

  await recordOutboundProspectingMessage(prisma, {
    channel,
    organizationId: orgId,
    toJid: phone.jid,
    content: firstMessage || "",
    run,
    userId: options.userId,
    bridgeMessageId: bridge.messageId || null,
  });

  await prisma.prospectingRun.update({
    where: { id: run.id },
    data: {
      status: "sent",
      firstMessage,
      lastContactAt: new Date(),
      nextAction: "wait_lead_reply",
      qualification: {
        ...mergeProspectingAgentMemory((run.qualification as any) || {}, {
          currentStage: run.stage,
          nextStage: run.stage,
          aiMessage: firstMessage || "",
          status: "sent",
          nextAction: "wait_lead_reply",
          summary: "Primeira mensagem enviada automaticamente. Aguardar resposta antes de avancar abordagem.",
        }),
        bridgeMessageId: bridge.messageId || null,
      },
    },
  });

  await updateDispatchAttempt(prisma, attempt.id, {
    status: "sent",
    bridgeMessageId: bridge.messageId || null,
    sentAt: new Date(),
    metadata: { bridge, automated: Boolean(options.automated) },
  });

  return { ok: true, runId: run.id, channelId: channel.id, bridgeMessageId: bridge.messageId || null };
}

export async function processProspectingDispatchQueue(prisma: PrismaClient, options: {
  limit?: number;
  automated?: boolean;
} = {}) {
  const now = new Date();
  const candidates = await prisma.prospectingRun.findMany({
    where: {
      channel: "WHATSAPP",
      status: "queued",
      nextAction: {
        in: [
          "ask_for_named_decision_maker",
          "ready_first_contact",
          "scheduled_first_contact",
        ],
      },
    },
    include: { funnel: { include: { stages: { orderBy: { order: "asc" } } } }, stage: true },
    orderBy: { createdAt: "asc" },
    take: Math.max(Number(options.limit || 10) * 3, 10),
  });

  const ready = candidates.filter((run) => shouldSendNow(run, now)).slice(0, Number(options.limit || 10));
  const sent = [];
  const failed = [];

  for (const run of ready) {
    if (await hasRecentBlockedAttempt(prisma, run.id)) continue;

    const locked = await prisma.prospectingRun.updateMany({
      where: {
        id: run.id,
        status: "queued",
        nextAction: run.nextAction,
      },
      data: { nextAction: "processing_first_contact" },
    });
    if (locked.count === 0) continue;

    try {
      const result = await dispatchProspectingRun(prisma, { ...run, nextAction: "processing_first_contact" }, { automated: options.automated });
      if (result.ok) sent.push(result);
      else failed.push(result);
    } catch (error: any) {
      await markReadyAgain(prisma, run);
      failed.push({ ok: false, runId: run.id, error: error?.message || "Erro inesperado ao disparar WhatsApp" });
    }
  }

  return { sent, failed, inspected: candidates.length, ready: ready.length };
}
