import { PrismaClient } from "@prisma/client";

export class ProposalService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Gera uma proposta a partir de um negócio (Opportunity)
   */
  async createFromOpportunity(opportunityId: string, data: { title: string; notes?: string }) {
    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: {
        client: true,
        organization: true,
      }
    });

    if (!opportunity) throw new Error("Negócio não encontrado.");

    const slug = `${opportunity.organization.slug || 'prop'}-${Date.now()}`;

    // Conteúdo inicial da proposta baseado no negócio
    const content = {
      header: {
        title: data.title,
        date: new Date(),
        orgName: opportunity.organization.name,
      },
      client: {
        name: opportunity.client.tradeName || opportunity.client.corporateName,
        email: opportunity.client.email,
      },
      items: [], // Serão preenchidos posteriormente
      notes: data.notes || "",
      terms: "Válido por 7 dias. Condições de pagamento a combinar."
    };

    return this.prisma.proposal.create({
      data: {
        title: data.title,
        slug,
        organizationId: opportunity.organizationId,
        clientId: opportunity.clientId,
        content: content as any,
        status: "draft"
      }
    });
  }

  /**
   * Substitui variáveis dinâmicas no conteúdo da proposta
   */
  async renderProposal(proposalId: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { 
        organization: true,
        client: true
      }
    });

    if (!proposal) throw new Error("Proposta não encontrada.");

    let contentStr = JSON.stringify(proposal.content);

    const variables: Record<string, string> = {
      "{{cliente_nome}}": proposal.client?.tradeName || proposal.client?.corporateName || "",
      "{{empresa_nome}}": proposal.organization.name,
      "{{valor_total}}": (proposal.content as any).totalValue?.toString() || "0",
      "{{data}}": new Date().toLocaleDateString("pt-BR")
    };

    for (const [key, value] of Object.entries(variables)) {
      contentStr = contentStr.split(key).join(value);
    }

    return JSON.parse(contentStr);
  }
}
