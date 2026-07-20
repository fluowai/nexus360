import { PrismaClient } from "@prisma/client";

export class DossierAgent {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async run(missionId: string) {
    try {
      console.log(`[DossierAgent] Iniciando geração de dossiês para a missão ${missionId}`);
      
      const leads = await this.prisma.prospectLead.findMany({
        where: { missionId, status: "validado" },
        include: { validation: true }
      });

      let processedCount = 0;

      for (const lead of leads) {
        // Cálculo do Score de Oportunidade
        let score = 0;
        
        if (lead.validation?.whatsappValid) score += 20;
        if (lead.validation?.companyActive) score += 15;
        if (lead.validation?.digitalMaturity === "baixa") score += 15;
        if (!lead.website) score += 10;
        if ((lead.googleReviewsCount || 0) < 50) score += 10;
        if (!lead.validation?.usesBot) score += 10;
        
        if (lead.validation?.accountantSuspect) score -= 30;
        if (lead.validation?.duplicate) score -= 20;
        if (!lead.validation?.whatsappValid) score -= 15;
        if (!lead.validation?.companyActive) score -= 10;

        // Classificação baseada no score
        let classification = "frio";
        if (score >= 85) classification = "prioridade";
        else if (score >= 70) classification = "quente";
        else if (score >= 40) classification = "morno";

        const knownFacts = [
          lead.category ? `categoria: ${lead.category}` : null,
          lead.city ? `cidade: ${lead.city}` : null,
          lead.state ? `estado: ${lead.state}` : null,
          lead.googleRating != null ? `avaliacao Google: ${lead.googleRating}` : null,
          lead.googleReviewsCount != null ? `avaliacoes: ${lead.googleReviewsCount}` : null,
          lead.website ? `site: ${lead.website}` : "site nao informado",
        ].filter(Boolean).join("; ");

        await this.prisma.prospectDossier.create({
          data: {
            leadId: lead.id,
            companySummary: `${lead.companyName}; ${knownFacts}`,
            digitalPresenceDiagnosis: lead.website
              ? "Site informado pelo provedor de origem."
              : "Nenhum site foi informado pelo provedor de origem.",
            recommendedApproach: "Abordagem nao gerada: execute a inteligencia de IA configurada para obter uma recomendacao.",
            opportunityScore: score,
            classification,
            classificationReason: "Calculado somente com os campos e validacoes persistidos no lead."
          }
        });

        processedCount++;
      }

      await this.prisma.prospectAgentLog.create({
        data: {
          missionId,
          agentName: "DossierAgent",
          action: "Geração de Dossiês",
          status: "success",
          message: `${processedCount} dossiês gerados.`
        }
      });

      console.log(`[DossierAgent] Missão ${missionId} finalizada. ${processedCount} dossiês gerados.`);
      return true;
    } catch (error: any) {
      console.error(`[DossierAgent] Erro na geração de dossiês:`, error);
      await this.prisma.prospectAgentLog.create({
        data: {
          missionId,
          agentName: "DossierAgent",
          action: "Erro nos Dossiês",
          status: "error",
          message: error.message
        }
      });
      return false;
    }
  }
}
