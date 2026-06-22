import { PrismaClient } from "@prisma/client";
import { processProspectingDispatchQueue } from "../services/prospectingDispatch.js";

export class ProspectingDispatchWorker {
  private prisma: PrismaClient;
  private running = false;
  private processing = false;
  private interval: NodeJS.Timeout | null = null;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  start(intervalMs = Number(process.env.PROSPECTING_DISPATCH_INTERVAL_MS || 30000)) {
    if (this.running) return;
    this.running = true;
    console.log(`[ProspectingDispatchWorker] iniciado. Intervalo: ${intervalMs}ms.`);
    this.interval = setInterval(() => this.tick(), intervalMs);
    this.tick();
  }

  stop() {
    this.running = false;
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    console.log("[ProspectingDispatchWorker] parado.");
  }

  private async tick() {
    if (!this.running || this.processing) return;
    this.processing = true;

    try {
      const limit = Number(process.env.PROSPECTING_DISPATCH_BATCH_SIZE || 5);
      const result = await processProspectingDispatchQueue(this.prisma, { limit, automated: true });
      if (result.sent.length || result.failed.length) {
        console.log(
          `[ProspectingDispatchWorker] enviados=${result.sent.length} falhas=${result.failed.length} prontos=${result.ready} inspecionados=${result.inspected}`
        );
      }
    } catch (error: any) {
      console.error("[ProspectingDispatchWorker] erro ao processar fila:", error?.message || error);
    } finally {
      this.processing = false;
    }
  }
}
