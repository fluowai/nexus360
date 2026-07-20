import { PrismaClient } from "@prisma/client";
import { LeadCaptureService } from "../../modules/lead-capture/lead-capture.service.js";
import { LeadAiService } from "../../modules/lead-capture/lead-ai.service.js";
import { LeadEnrichmentService } from "../leadEnrichment.js";
import { WhatsAppValidationService } from "../whatsappValidation.js";
import { enrollCapturedLeadsInFunnel } from "../../routes/prospectingFunnels.js";
import { upsertDecisionMakersFromLead, pickBestDecisionMaker } from "../prospectingAutomation.js";

export class MissionScheduler {
  private prisma: PrismaClient;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  private leadCaptureService: LeadCaptureService;
  private leadAiService: LeadAiService;
  private leadEnrichmentService: LeadEnrichmentService;
  private whatsappValidationService: WhatsAppValidationService;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.leadCaptureService = new LeadCaptureService(prisma);
    this.leadAiService = new LeadAiService(prisma);
    this.leadEnrichmentService = new LeadEnrichmentService(prisma);
    this.whatsappValidationService = new WhatsAppValidationService(prisma);
  }

  public start() {
    console.log("[ProspectAI] MissionScheduler iniciado. Checando missões a cada 1 minuto...");
    // Roda a cada 60 segundos
    this.intervalId = setInterval(() => {
      this.checkMissions();
    }, 60 * 1000);

    // Roda a primeira vez ao iniciar
    this.checkMissions();
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async checkMissions() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const now = new Date();
      
      // Busca missões "agendada" cuja data e hora já passaram ou são iguais a agora
      const missionsToRun = await this.prisma.prospectMission.findMany({
        where: {
          status: "agendada",
          executionDate: {
            lte: now
          }
        }
      });

      for (const mission of missionsToRun) {
        const [hours, minutes] = mission.executionTime.split(":").map(Number);

        const missionDate = new Date(mission.executionDate);
        missionDate.setHours(hours, minutes, 0, 0);

        const diffMs = now.getTime() - missionDate.getTime();
        if (diffMs >= 0) {
          await this.executeMission(mission);
        }
      }
    } catch (error) {
      console.error("[ProspectAI] Erro no MissionScheduler:", error);
    } finally {
      this.isRunning = false;
    }
  }

  private async executeMission(mission: any) {
    console.log(`[ProspectAI] Iniciando missão: ${mission.name} (${mission.id})`);
    
    try {
      // 1. Atualizar status para em execução
      await this.prisma.prospectMission.update({
        where: { id: mission.id },
        data: { status: "em_execucao" }
      });

      await this.logAgent(mission.id, "MissionScheduler", "Início", "success", "Missão enviada para a fila de execução");

      // Execução assíncrona do Pipeline
      this.triggerMissionWorkflow(mission).catch(err => {
        console.error(`[ProspectAI] Erro na execução assíncrona da missão ${mission.id}:`, err);
      });

    } catch (error: any) {
      await this.prisma.prospectMission.update({
        where: { id: mission.id },
        data: { status: "erro" }
      });
      await this.logAgent(mission.id, "MissionScheduler", "Erro", "error", error.message);
    }
  }

  private async triggerMissionWorkflow(mission: any) {
    console.log(`[ProspectAI] Workflow iniciado para missão ${mission.id}`);
    
    try {
      // Etapa 1: Extração
      const capturedLeadIds = await this.captureAndPrepareLeads(mission);

      const allLeadIds = [...capturedLeadIds];

      if (allLeadIds.length > 0) {
        await enrollCapturedLeadsInFunnel(this.prisma, mission.organizationId, allLeadIds, "default");
        await this.logAgent(
          mission.id,
          "ProspectingFunnelAgent",
          "Matricula no Funil",
          "success",
          `${allLeadIds.length} leads captados por provedor real enviados ao funil SDR IA.`
        );
      }

      // Salva o resultado na missão (para consulta posterior de leads)
      const nextState = this.getNextMissionState(mission);
      await this.prisma.prospectMission.update({
        where: { id: mission.id },
        data: {
          ...nextState,
          missionResult: {
            capturedLeadIds,
            prospectLeadIds: [],
            completedAt: new Date().toISOString(),
            totalLeads: allLeadIds.length
          }
        }
      });

      await this.logAgent(mission.id, "MissionScheduler", "Fim", "success", "Missão concluída com sucesso no workflow atual");
      console.log(`[ProspectAI] Workflow concluído para missão ${mission.id}`);
    } catch (error: any) {
      await this.prisma.prospectMission.update({
        where: { id: mission.id },
        data: { status: "erro" }
      });
      await this.logAgent(mission.id, "Workflow", "Erro Critico", "error", error.message);
    }
  }

  private async captureAndPrepareLeads(mission: any): Promise<string[]> {
    const provider = process.env.PROSPECT_DEFAULT_PROVIDER || "serper";

    try {
      const result = await this.leadCaptureService.captureLeads({
        tenantId: mission.organizationId,
        userId: mission.userId,
        provider,
        keyword: mission.niche,
        city: mission.city,
        state: mission.state,
        country: mission.country || "Brasil",
        limit: mission.leadQuantity,
        filters: {
          onlyWithPhone: true
        }
      } as any);

      const approvedLeadIds: string[] = [];

      for (const lead of result.leads || []) {
        const guard = this.validateCapturedLead(lead);

        if (!guard.approved) {
          await this.prisma.capturedLead.update({
            where: { id: lead.id },
            data: {
              crmStatus: "reprovado_validacao",
              notes: [lead.notes, guard.reason].filter(Boolean).join("\n")
            }
          });
          continue;
        }

        if (guard.reason) {
          await this.prisma.capturedLead.update({
            where: { id: lead.id },
            data: { notes: [lead.notes, guard.reason].filter(Boolean).join("\n") }
          });
        }

        await this.runLeadIntelligence(lead.id, mission.organizationId, mission.id);
        approvedLeadIds.push(lead.id);
      }

      await this.logAgent(
        mission.id,
        "LeadCaptureAutomation",
        "Captacao e Enriquecimento",
        "success",
        `${approvedLeadIds.length} leads aprovados para funil apos validacao anti-contador e anti-bot.`
      );

      return approvedLeadIds;
    } catch (error: any) {
      await this.logAgent(
        mission.id,
        "LeadCaptureAutomation",
        "Falha na Captacao Real",
        "error",
        error.message
      );
      throw error;
    }
  }

  private async runLeadIntelligence(leadId: string, orgId: string, missionId: string) {
    const steps: Array<[string, () => Promise<any>]> = [
      ["enrichLead", () => this.leadAiService.enrichLead(leadId, orgId)],
      ["runDiagnosis", () => this.leadAiService.runDiagnosis(leadId, orgId)],
      ["generateScripts", () => this.leadAiService.generateScripts(leadId, orgId)],
      ["researchManagement", () => this.leadAiService.researchManagement(leadId, orgId)]
    ];

    for (const [step, loader] of steps) {
      try {
        await loader();
      } catch (error: any) {
        await this.logAgent(
          missionId,
          "LeadIntelligence",
          step,
          "warning",
          error.message
        );
      }
    }

    // Enriquecimento adicional: CNPJ, Instagram, website, telefone secundário
    try {
      await this.leadEnrichmentService.enrichLead(leadId, orgId);
      await this.logAgent(missionId, "LeadEnrichment", "enrichLead", "success", "Enriquecimento CNPJ/redes sociais concluído.");
    } catch (error: any) {
      await this.logAgent(missionId, "LeadEnrichment", "enrichLead", "warning", error.message);
    }

    // Validação WhatsApp: verificar se número tem WhatsApp ativo e comparar pushname
    try {
      const lead = await this.prisma.capturedLead.findFirst({
        where: { id: leadId, organizationId: orgId }
      });

      if (lead?.phone) {
        const phoneDigits = lead.phoneNormalized || lead.phone;
        const validation = await this.whatsappValidationService.validateWhatsApp(
          phoneDigits,
          lead.businessName || "",
        );
        await this.whatsappValidationService.saveValidationResult(leadId, validation);

        await this.logAgent(
          missionId,
          "WhatsAppValidation",
          "validateWhatsApp",
          validation.hasWhatsApp ? "success" : "warning",
          validation.validationNotes.join("; ")
        );
      }
    } catch (error: any) {
      await this.logAgent(missionId, "WhatsAppValidation", "validateWhatsApp", "warning", error.message);
    }

    // Extrai decisores dos dados enriquecidos (CNPJ sócios + gestão LinkedIn)
    try {
      const lead = await this.prisma.capturedLead.findFirst({
        where: { id: leadId, organizationId: orgId }
      });
      if (lead) {
        await upsertDecisionMakersFromLead(this.prisma, lead);
        await pickBestDecisionMaker(this.prisma, lead);
        await this.logAgent(missionId, "LeadIntelligence", "upsertDecisionMakers", "success", "Decisores extraídos e salvos.");
      }
    } catch (error: any) {
      await this.logAgent(missionId, "LeadIntelligence", "upsertDecisionMakers", "warning", error.message);
    }
  }

  private validateCapturedLead(lead: any): { approved: boolean; reason?: string } {
    const phoneDigits = String(lead.phoneNormalized || lead.phone || "").replace(/\D/g, "");
    if (phoneDigits.length < 10 || phoneDigits.length > 14) {
      return { approved: false, reason: "Validacao: telefone invalido para WhatsApp/contato." };
    }

    const searchable = [
      lead.businessName,
      lead.category,
      lead.website,
      lead.email,
      JSON.stringify(lead.rawData || {})
    ].join(" ").toLowerCase();

    const accountantTerms = [
      "contabilidade",
      "contador",
      "contabil",
      "contabeis",
      "escritorio contabil",
      "assessoria contabil"
    ];

    if (accountantTerms.some(term => searchable.includes(term))) {
      return { approved: false, reason: "Validacao: telefone/empresa com indicio de contador ou escritorio contabil." };
    }

    const botTerms = [
      "manychat",
      "botmaker",
      "blip",
      "zenvia",
      "landbot",
      "jivochat",
      "tawk.to",
      "chatbot",
      "atendimento automatico"
    ];

    if (botTerms.some(term => searchable.includes(term))) {
      return { approved: true, reason: "Validacao: possivel atendimento automatizado detectado." };
    }

    return { approved: true };
  }

  private getNextMissionState(mission: any) {
    const recurrence = mission.recurrence || "unica";
    if (recurrence === "unica") return { status: "concluida" };

    const nextDate = new Date(mission.executionDate);
    const increments: Record<string, number> = {
      diaria: 1,
      semanal: 7,
      quinzenal: 15,
      mensal: 30
    };

    nextDate.setDate(nextDate.getDate() + (increments[recurrence] || 7));
    return {
      status: "agendada",
      executionDate: nextDate
    };
  }

  private async logAgent(missionId: string, agentName: string, action: string, status: string, message: string) {
    await this.prisma.prospectAgentLog.create({
      data: {
        missionId,
        agentName,
        action,
        status,
        message
      }
    });
  }
}
