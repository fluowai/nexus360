import { PrismaClient } from "@prisma/client";
import {
  createDispatchAttempt,
  getFunnelRuntimeConfig,
  isInsideBusinessHours,
  isOptedOut,
  mergeProspectingAgentMemory,
  updateDispatchAttempt,
} from "../services/prospectingAutomation.js";
import { OutboundDispatcherService } from "../services/outboundDispatcher.js";

export class FollowUpWorker {
  private prisma: PrismaClient;
  private interval: NodeJS.Timeout | null = null;
  private processingProspecting = false;
  private dispatcher: OutboundDispatcherService;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.dispatcher = new OutboundDispatcherService(prisma);
  }

  start(intervalMs = 5 * 60 * 1000) {
    console.log("[FollowUpWorker] Worker iniciado (check a cada 5 min)...");
    this.check();
    this.interval = setInterval(() => this.check(), intervalMs);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    console.log("[FollowUpWorker] Worker parado.");
  }

  private async check() {
    try {
      const now = new Date();
      const pending = await this.prisma.followUp.findMany({
        where: {
          status: "pending",
          scheduledAt: { lte: now },
        },
        include: {
          lead: { select: { organizationId: true, assignedToId: true } },
        },
      });

      for (const followUp of pending) {
        // Criar notificação para o responsável
        if (followUp.lead?.organizationId) {
          await this.prisma.notification.create({
            data: {
              title: "Follow-up pendente",
              message: followUp.content.substring(0, 200),
              type: "warning",
              link: `/crm/leads/${followUp.leadId}`,
              organizationId: followUp.lead.organizationId,
            },
          });
        }

        // Marcar como concluído (notificado)
        await this.prisma.followUp.update({
          where: { id: followUp.id },
          data: { status: "notified" },
        });
      }

      if (pending.length > 0) {
        console.log(`[FollowUpWorker] ${pending.length} follow-up(s) notificado(s)`);
      }

      await this.checkProspectingFollowUps();
    } catch (error) {
      console.error("[FollowUpWorker] Error checking follow-ups:", error);
    }
  }

  private async checkProspectingFollowUps() {
    if (this.processingProspecting) return;
    this.processingProspecting = true;

    try {
      const now = new Date();
      const afterMinutes = Number(process.env.PROSPECTING_FOLLOWUP_AFTER_MINUTES || 1440);
      const cutoff = new Date(now.getTime() - afterMinutes * 60 * 1000);
      const maxPerTick = Number(process.env.PROSPECTING_FOLLOWUP_BATCH_SIZE || 5);
      const runs = await this.prisma.prospectingRun.findMany({
        where: {
          channel: "WHATSAPP",
          status: { in: ["sent", "active"] },
          nextAction: "wait_lead_reply",
          lastContactAt: { lte: cutoff },
        },
        include: { funnel: { include: { stages: { orderBy: { order: "asc" } } } }, stage: true },
        orderBy: { lastContactAt: "asc" },
        take: maxPerTick,
      });

      for (const run of runs) {
        const qualification = (run.qualification as any) || {};
        const followUpCount = Number(qualification.followUpCount || 0);
        const maxFollowUps = Number(qualification?.campaign?.maxFollowUps || process.env.PROSPECTING_MAX_FOLLOWUPS || 2);
        if (followUpCount >= maxFollowUps) {
          await this.prisma.prospectingRun.update({
            where: { id: run.id },
            data: { status: "nurturing", nextAction: "max_followups_reached" },
          });
          continue;
        }

        const runtimeConfig = getFunnelRuntimeConfig(run.funnel);
        if (!isInsideBusinessHours(runtimeConfig.businessHours, now)) continue;

        if (await isOptedOut(this.prisma, run.organizationId, run.leadPhone)) {
          await this.prisma.prospectingRun.update({
            where: { id: run.id },
            data: { status: "stopped", nextAction: "opt_out_blocked" },
          });
          continue;
        }

        const message = followUpCount === 0
          ? "Oi, tudo bem? Conseguiu ver minha mensagem anterior?"
          : "Passando uma ultima vez por aqui. Existe alguem melhor para eu falar sobre a parte comercial?";
        const attempt = await createDispatchAttempt(this.prisma, {
          organizationId: run.organizationId,
          run,
          channelId: qualification?.campaign?.channelId || null,
          message,
          status: "queued",
          metadata: { automated: true, kind: "follow_up", followUpCount: followUpCount + 1 },
        });

        try {
          const dispatch = await this.dispatcher.dispatchText({
            organizationId: run.organizationId,
            channelId: qualification?.campaign?.channelId || undefined,
            contact: { name: run.leadName, phone: run.leadPhone || "" },
            message,
            ia: false,
            source: "nexus_prospecting_followup",
            metadata: { prospectingRunId: run.id, followUpCount: followUpCount + 1 },
          });

          await updateDispatchAttempt(this.prisma, attempt.id, {
            status: "sent",
            bridgeMessageId: dispatch.bridgeMessageId || null,
            sentAt: new Date(),
            metadata: { dispatch, automated: true, kind: "follow_up" },
          });

          await this.prisma.prospectingRun.update({
            where: { id: run.id },
            data: {
              lastContactAt: new Date(),
              nextAction: "wait_lead_reply",
              qualification: {
                ...mergeProspectingAgentMemory(qualification, {
                  currentStage: run.stage,
                  nextStage: run.stage,
                  aiMessage: message,
                  status: run.status,
                  nextAction: "wait_lead_reply",
                  summary: "Follow-up automatico enviado. Aguardar resposta do lead.",
                  conversationId: dispatch.conversationId,
                  messageId: dispatch.messageId,
                }),
                followUpCount: followUpCount + 1,
              },
            },
          });
        } catch (error: any) {
          await updateDispatchAttempt(this.prisma, attempt.id, {
            status: "failed",
            reason: error?.message || "Falha ao enviar follow-up",
          });
        }
      }

      if (runs.length > 0) {
        console.log(`[FollowUpWorker] prospecting follow-ups avaliados=${runs.length}`);
      }
    } finally {
      this.processingProspecting = false;
    }
  }
}
