import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth.js";
import {
  normalizeWhatsAppJid,
  normalizeWhatsAppPhone,
  pickWhatsAppDisplayName,
  mapWhatsAppMediaType,
  isWhatsAppGroupJid,
  isWhatsAppNewsletterJid
} from "../utils/whatsapp.js";
import { auditFromRequest } from "../utils/auditLogger.js";

const WHATSAPP_PROVIDER = "WHATS_MEOW";

function bridgeBaseUrl() {
  return process.env.WHATSAPP_BRIDGE_URL || "http://localhost:8091";
}

function bridgeSecret() {
  return process.env.WHATSAPP_BRIDGE_SECRET || "dev-whatsapp-bridge-secret";
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

async function callBridgeGet(path: string) {
  const res = await fetch(`${bridgeBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-whatsapp-bridge-secret": bridgeSecret(),
    },
    body: JSON.stringify({}),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `WhatsApp bridge error ${res.status}`);
  }
  return data;
}

async function ensureWhatsAppInbox(prisma: PrismaClient, organizationId: string, name = "WhatsApp") {
  const existing = await prisma.inbox.findFirst({ where: { organizationId, name } });
  if (existing) return existing;
  return prisma.inbox.create({ data: { organizationId, name } });
}

async function findProspectingRunByJid(prisma: PrismaClient, organizationId: string, jid: string) {
  const phone = normalizeWhatsAppJid(jid).split("@")[0];
  if (!phone) return null;

  const runs = await prisma.prospectingRun.findMany({
    where: {
      organizationId,
      channel: "WHATSAPP",
      status: { in: ["queued", "active", "sent"] },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return runs.find((run) => normalizeWhatsAppPhone(run.leadPhone).digits === phone) || null;
}

async function upsertInboundWhatsAppMessage(prisma: PrismaClient, payload: any) {
  const organizationId = payload.organizationId || payload.orgId;
  const channelId = payload.channelId;
  const chatJid = normalizeWhatsAppJid(payload.chatJid);
  if (isWhatsAppNewsletterJid(chatJid)) {
    return { ignored: true, reason: "newsletter" };
  }
  if (!organizationId || !channelId || !chatJid) {
    throw new Error("organizationId, channelId e chatJid sao obrigatorios");
  }

  const channel = await prisma.channel.findFirst({
    where: { id: channelId, inbox: { organizationId } },
    include: { inbox: true },
  });
  if (!channel) throw new Error("Canal WhatsApp nao encontrado");

  const displayName = pickWhatsAppDisplayName(payload);
  const mediaType = mapWhatsAppMediaType(payload.message?.type, payload.message?.mimeType);
  const prospectingRun = await findProspectingRunByJid(prisma, organizationId, chatJid);

  let conversation = await prisma.conversation.findFirst({
    where: { channelId, contactId: chatJid },
  });

  const metadata = {
    ...(typeof conversation?.metadata === "object" && conversation?.metadata ? conversation.metadata as any : {}),
    externalChatId: chatJid,
    isGroup: !!payload.isGroup,
    phone: isWhatsAppGroupJid(chatJid) ? null : normalizeWhatsAppPhone(chatJid).e164,
    pushName: payload.pushName || payload.senderPushName || null,
    displayName,
    profilePictureUrl: payload.profilePictureUrl || payload.group?.pictureUrl || null,
    group: payload.group || null,
    participants: payload.participants || payload.group?.participants || [],
    prospectingRunId: prospectingRun?.id || null,
    provider: WHATSAPP_PROVIDER,
  };

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        subject: displayName,
        inboxId: channel.inboxId,
        channelId,
        contactId: chatJid,
        status: "open",
        priority: prospectingRun ? "high" : "medium",
        lastMessageAt: payload.message?.timestamp ? new Date(payload.message.timestamp) : new Date(),
        metadata,
      } as any,
    });
  } else {
    conversation = await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        subject: displayName,
        status: conversation.status === "closed" ? "open" : conversation.status,
        lastMessageAt: payload.message?.timestamp ? new Date(payload.message.timestamp) : new Date(),
        metadata,
      } as any,
    });
  }

  const messageId = payload.message?.id || payload.messageId;
  if (messageId) {
    const recent = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const exists = recent.some((msg) => (msg.metadata as any)?.externalMessageId === messageId);
    if (exists) return { conversation, duplicate: true };
  }

  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderType: payload.fromMe ? "USER" : "CONTACT",
      content: payload.message?.content || payload.message?.caption || null,
      type: mediaType,
      fileUrl: payload.message?.fileUrl || null,
      metadata: {
        externalMessageId: messageId,
        chatJid,
        senderJid: payload.senderJid,
        pushName: payload.pushName || payload.senderPushName || null,
        fromMe: !!payload.fromMe,
        mimeType: payload.message?.mimeType || null,
        fileName: payload.message?.fileName || null,
        fileSize: payload.message?.fileSize || null,
        mediaSha256: payload.message?.mediaSha256 || null,
        rawType: payload.message?.type || null,
        prospectingRunId: prospectingRun?.id || null,
      },
      createdAt: payload.message?.timestamp ? new Date(payload.message.timestamp) : new Date(),
    },
  });

  if (prospectingRun && !payload.fromMe) {
    await prisma.prospectingRun.update({
      where: { id: prospectingRun.id },
      data: {
        status: "active",
        lastContactAt: new Date(),
        nextAction: "lead_replied_continue_agent",
        qualification: {
          ...((prospectingRun.qualification as any) || {}),
          lastLeadMessage: payload.message?.content || payload.message?.caption || "",
          lastConversationId: conversation.id,
          lastMessageId: message.id,
        },
      },
    });
  }

  return { conversation, message };
}

export function whatsappRoutes(prisma: PrismaClient) {
  const router = Router();

  router.get("/connections", async (req: AuthRequest, res, next) => {
    try {
      const channels = await prisma.channel.findMany({
        where: { provider: WHATSAPP_PROVIDER, inbox: { organizationId: req.user!.orgId } },
        include: { inbox: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      });
      res.json(channels);
    } catch (error) { next(error); }
  });

  router.post("/connections", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const normalized = normalizeWhatsAppPhone(req.body.phone || req.body.identifier);
      if (!normalized.digits) return res.status(400).json({ error: "Telefone WhatsApp obrigatorio" });

      const inbox = await ensureWhatsAppInbox(prisma, orgId, req.body.inboxName || "WhatsApp");
      const existing = await prisma.channel.findFirst({
        where: { provider: WHATSAPP_PROVIDER, identifier: normalized.e164, inbox: { organizationId: orgId } },
      });
      if (existing) return res.json(existing);

      const channel = await prisma.channel.create({
        data: {
          type: "WHATSAPP",
          provider: WHATSAPP_PROVIDER,
          identifier: normalized.e164,
          inboxId: inbox.id,
          config: {
            status: "created",
            phone: normalized.e164,
            jid: normalized.jid,
            qrCode: null,
            pushName: null,
        profilePictureUrl: null,
        label: req.body.label || req.body.name || null,
        bridgeUrl: bridgeBaseUrl(),
      },
    },
      });

      auditFromRequest(req, "CREATE", "WhatsAppConnection", channel.id);
      res.status(201).json(channel);
    } catch (error) { next(error); }
  });

  router.patch("/connections/:id", async (req: AuthRequest, res, next) => {
    try {
      const channel = await prisma.channel.findFirst({
        where: { id: req.params.id, provider: WHATSAPP_PROVIDER, inbox: { organizationId: req.user!.orgId } },
        include: { inbox: true },
      });
      if (!channel) return res.status(404).json({ error: "Conexao WhatsApp nao encontrada" });

      const normalized = req.body.phone || req.body.identifier
        ? normalizeWhatsAppPhone(req.body.phone || req.body.identifier)
        : null;
      const config = {
        ...((channel.config as any) || {}),
        ...(req.body.label !== undefined ? { label: req.body.label } : {}),
        ...(normalized?.digits ? { phone: normalized.e164, jid: normalized.jid } : {}),
      };

      if (req.body.inboxName && req.body.inboxName !== channel.inbox.name) {
        await prisma.inbox.update({ where: { id: channel.inboxId }, data: { name: String(req.body.inboxName) } });
      }

      const updated = await prisma.channel.update({
        where: { id: channel.id },
        data: {
          ...(normalized?.digits ? { identifier: normalized.e164 } : {}),
          ...(req.body.isActive !== undefined ? { isActive: Boolean(req.body.isActive) } : {}),
          config,
        },
        include: { inbox: { select: { id: true, name: true } } },
      });

      res.json(updated);
    } catch (error) { next(error); }
  });

  router.post("/connections/:id/status", async (req: AuthRequest, res, next) => {
    try {
      const channel = await prisma.channel.findFirst({
        where: { id: req.params.id, provider: WHATSAPP_PROVIDER, inbox: { organizationId: req.user!.orgId } },
      });
      if (!channel) return res.status(404).json({ error: "Conexao WhatsApp nao encontrada" });

      const result = await callBridgeGet(`/sessions/${channel.id}/status`);
      res.json(result);
    } catch (error) { next(error); }
  });

  router.post("/connections/:id/connect", async (req: AuthRequest, res, next) => {
    try {
      const channel = await prisma.channel.findFirst({
        where: { id: req.params.id, provider: WHATSAPP_PROVIDER, inbox: { organizationId: req.user!.orgId } },
      });
      if (!channel) return res.status(404).json({ error: "Conexao WhatsApp nao encontrada" });

      const result = await callBridge(`/sessions/${channel.id}/connect`, {
        organizationId: req.user!.orgId,
        channelId: channel.id,
        phone: channel.identifier,
      });
      res.json(result);
    } catch (error) { next(error); }
  });

  router.post("/connections/:id/disconnect", async (req: AuthRequest, res, next) => {
    try {
      const channel = await prisma.channel.findFirst({
        where: { id: req.params.id, provider: WHATSAPP_PROVIDER, inbox: { organizationId: req.user!.orgId } },
      });
      if (!channel) return res.status(404).json({ error: "Conexao WhatsApp nao encontrada" });

      const result = await callBridge(`/sessions/${channel.id}/disconnect`, { channelId: channel.id });
      await prisma.channel.update({
        where: { id: channel.id },
        data: { config: { ...((channel.config as any) || {}), status: "disconnected", qrCode: null } },
      });
      res.json(result);
    } catch (error) { next(error); }
  });

  router.delete("/connections/:id", async (req: AuthRequest, res, next) => {
    try {
      const channel = await prisma.channel.findFirst({
        where: { id: req.params.id, provider: WHATSAPP_PROVIDER, inbox: { organizationId: req.user!.orgId } },
      });
      if (!channel) return res.status(404).json({ error: "Conexao WhatsApp nao encontrada" });

      await callBridge(`/sessions/${channel.id}/delete`, { channelId: channel.id }).catch(() => null);
      const config = {
        ...((channel.config as any) || {}),
        status: "deleted",
        qrCode: null,
        qrPng: null,
        deletedAt: new Date().toISOString(),
      };
      await prisma.channel.update({ where: { id: channel.id }, data: { isActive: false, config } });
      auditFromRequest(req, "DELETE", "WhatsAppConnection", channel.id);
      res.json({ ok: true });
    } catch (error) { next(error); }
  });

  router.get("/conversations", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const kind = String(req.query.kind || "all");
      const conversations = await prisma.conversation.findMany({
        where: {
          inbox: { organizationId: orgId },
          channel: { provider: WHATSAPP_PROVIDER },
          ...(req.query.channelId ? { channelId: String(req.query.channelId) } : {}),
          ...(req.query.status ? { status: String(req.query.status) } : {}),
          ...(kind === "groups" ? { contactId: { endsWith: "@g.us" } } : {}),
          ...(kind === "direct" ? { contactId: { endsWith: "@s.whatsapp.net" } } : {}),
          NOT: [{ contactId: { contains: "@newsletter" } }],
        },
        include: {
          channel: { select: { id: true, identifier: true, config: true } },
          messages: { take: 1, orderBy: { createdAt: "desc" } },
          _count: { select: { messages: true } },
        },
        orderBy: { lastMessageAt: "desc" },
      });
      res.json(conversations);
    } catch (error) { next(error); }
  });

  router.get("/conversations/:id/messages", async (req: AuthRequest, res, next) => {
    try {
      const conversation = await prisma.conversation.findFirst({
        where: { id: req.params.id, inbox: { organizationId: req.user!.orgId }, channel: { provider: WHATSAPP_PROVIDER } },
        select: { id: true },
      });
      if (!conversation) return res.status(404).json({ error: "Conversa nao encontrada" });
      const messages = await prisma.message.findMany({ where: { conversationId: conversation.id }, orderBy: { createdAt: "asc" } });
      res.json(messages);
    } catch (error) { next(error); }
  });

  router.post("/conversations/:id/messages", async (req: AuthRequest, res, next) => {
    try {
      const conversation = await prisma.conversation.findFirst({
        where: { id: req.params.id, inbox: { organizationId: req.user!.orgId }, channel: { provider: WHATSAPP_PROVIDER } },
        include: { channel: true },
      });
      if (!conversation) return res.status(404).json({ error: "Conversa nao encontrada" });
      if (!req.body.content) return res.status(400).json({ error: "Mensagem obrigatoria" });

      const result = await callBridge(`/sessions/${conversation.channelId}/send`, {
        channelId: conversation.channelId,
        to: conversation.contactId,
        message: req.body.content,
      });

      const message = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: req.user!.id,
          senderType: "USER",
          content: req.body.content,
          type: "text",
          metadata: { source: "nexus_web", bridgeMessageId: result.messageId || null, fromMe: true },
        },
      });
      await prisma.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date() } });
      res.json(message);
    } catch (error) { next(error); }
  });

  router.post("/prospecting/dispatch", async (req: AuthRequest, res, next) => {
    try {
      const orgId = req.user!.orgId;
      const channel = await prisma.channel.findFirst({
        where: { provider: WHATSAPP_PROVIDER, isActive: true, inbox: { organizationId: orgId } },
        orderBy: { createdAt: "desc" },
      });
      if (!channel) return res.status(400).json({ error: "Conecte um WhatsApp antes de disparar o funil IA" });

      const runIds = Array.isArray(req.body.runIds) ? req.body.runIds : [];
      const runs = await prisma.prospectingRun.findMany({
        where: {
          organizationId: orgId,
          channel: "WHATSAPP",
          status: { in: ["queued", "active"] },
          ...(runIds.length ? { id: { in: runIds } } : {}),
        },
        take: Number(req.body.limit || 25),
        orderBy: { createdAt: "asc" },
      });

      const sent = [];
      const failed = [];
      for (const run of runs) {
        const phone = normalizeWhatsAppPhone(run.leadPhone);
        if (!phone.jid || !run.firstMessage) {
          failed.push({ id: run.id, error: "Lead sem telefone ou mensagem" });
          continue;
        }
        try {
          const bridge = await callBridge(`/sessions/${channel.id}/send`, {
            channelId: channel.id,
            to: phone.jid,
            message: run.firstMessage,
          });
          await prisma.prospectingRun.update({
            where: { id: run.id },
            data: {
              status: "sent",
              lastContactAt: new Date(),
              nextAction: "wait_lead_reply",
              qualification: { ...((run.qualification as any) || {}), bridgeMessageId: bridge.messageId || null },
            },
          });
          sent.push(run.id);
        } catch (err: any) {
          failed.push({ id: run.id, error: err.message });
        }
      }

      res.json({ sent, failed });
    } catch (error) { next(error); }
  });

  return router;
}

export function whatsappInternalRoutes(prisma: PrismaClient) {
  const router = Router();

  router.post("/events", async (req, res, next) => {
    try {
      if (req.headers["x-whatsapp-bridge-secret"] !== bridgeSecret()) {
        return res.status(401).json({ error: "INVALID_BRIDGE_SECRET" });
      }

      const payload = req.body || {};
      if (payload.type === "status") {
        const channel = await prisma.channel.findUnique({ where: { id: payload.channelId } });
        if (channel) {
          await prisma.channel.update({
            where: { id: channel.id },
            data: {
              config: {
                ...((channel.config as any) || {}),
                status: payload.status,
                qrCode: payload.qrCode || null,
                qrPng: payload.qrPng || null,
                pushName: payload.pushName || (channel.config as any)?.pushName || null,
                profilePictureUrl: payload.profilePictureUrl || (channel.config as any)?.profilePictureUrl || null,
                connectedJid: payload.connectedJid || (channel.config as any)?.connectedJid || null,
                lastEventAt: new Date().toISOString(),
              },
            },
          });
        }
        return res.json({ ok: true });
      }

      if (payload.type === "message") {
        const result = await upsertInboundWhatsAppMessage(prisma, payload);
        return res.json({
          ok: true,
          ignored: (result as any).ignored || false,
          conversationId: (result as any).conversation?.id || null,
          duplicate: (result as any).duplicate || false
        });
      }

      res.json({ ok: true, ignored: true });
    } catch (error) { next(error); }
  });

  return router;
}
