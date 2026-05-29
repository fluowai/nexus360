import { PrismaClient } from "@prisma/client";

export class FollowUpWorker {
  private prisma: PrismaClient;
  private interval: NodeJS.Timeout | null = null;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
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
    } catch (error) {
      console.error("[FollowUpWorker] Error checking follow-ups:", error);
    }
  }
}
