import { PrismaClient } from "@prisma/client";
import { Groq } from "groq-sdk";

export class LeadAiService {
  constructor(private prisma: PrismaClient) {}

  private async getGroqClient(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { groqKey: true }
    });

    if (!org?.groqKey) {
      throw new Error("Chave do Groq não configurada para esta organização.");
    }

    return new Groq({
      apiKey: org.groqKey
    });
  }

  async runDiagnosis(leadId: string, orgId: string) {
    const groq = await this.getGroqClient(orgId);
    const lead = await this.prisma.capturedLead.findFirst({
      where: { id: leadId, organizationId: orgId }
    });

    if (!lead) throw new Error("Lead not found");

    const prompt = `
      Você é um agente de análise comercial da Nexus360.
      Analise a empresa abaixo como potencial cliente para uma solução de crescimento previsível (Método ACP), CRM, automação, marketing e estruturação comercial.

      Dados da empresa:
      Nome: ${lead.businessName}
      Categoria: ${lead.category}
      Cidade: ${lead.city}
      Estado: ${lead.state}
      Telefone: ${lead.phone}
      Site: ${lead.website}
      Nota Google: ${lead.rating}
      Quantidade de avaliações: ${lead.reviewsCount}

      Gere uma análise estruturada com:
      1. Diagnóstico comercial provável
      2. Diagnóstico de aquisição
      3. Diagnóstico de presença digital
      4. Pontos fracos aparentes
      5. Oportunidades de melhoria
      6. Oferta ideal para abordar esse cliente
      7. Nível de prioridade comercial
      8. Argumento principal para abordagem
      9. Objeções prováveis
      10. Próxima ação recomendada

      Responda EXCLUSIVAMENTE em JSON válido com os campos:
      {
        "diagnosis": "string",
        "weaknesses": ["string"],
        "opportunities": ["string"],
        "suggested_offer": "string",
        "priority_level": "string",
        "main_argument": "string",
        "probable_objections": ["string"],
        "next_action": "string"
      }
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(chatCompletion.choices[0].message.content || "{}");

    return await this.prisma.capturedLead.update({
      where: { id: leadId },
      data: {
        aiDiagnosis: result.diagnosis,
        aiWeaknesses: result.weaknesses,
        aiOpportunities: result.opportunities,
        suggestedOffer: result.suggested_offer,
        opportunityLevel: result.priority_level,
        // Optional: you can add more fields or merge them into diagnosis
      }
    });
  }

  async generateScripts(leadId: string, orgId: string) {
    const groq = await this.getGroqClient(orgId);
    const lead = await this.prisma.capturedLead.findFirst({
      where: { id: leadId, organizationId: orgId }
    });

    if (!lead) throw new Error("Lead not found");

    const prompt = `
      Você é um especialista em SDR, BDR e cold call B2B.
      Crie um roteiro de ligação (Cold Call) e uma mensagem de WhatsApp para abordar a empresa abaixo:

      Nome: ${lead.businessName}
      Categoria: ${lead.category}
      Diagnóstico: ${lead.aiDiagnosis}

      O roteiro de Cold Call deve ter: Abertura, Contexto, Quebra de Padrão, Pergunta de Diagnóstico, Gancho para Reunião e Fechamento.
      A mensagem de WhatsApp deve ser curta, humana e consultiva.

      Responda EXCLUSIVAMENTE em JSON:
      {
        "coldCallScript": "string",
        "whatsappMessage": "string"
      }
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(chatCompletion.choices[0].message.content || "{}");

    return await this.prisma.capturedLead.update({
      where: { id: leadId },
      data: {
        coldCallScript: result.coldCallScript,
        whatsappMessage: result.whatsappMessage
      }
    });
  async generateDossier(leadId: string, orgId: string) {
    const groq = await this.getGroqClient(orgId);
    const lead = await this.prisma.capturedLead.findFirst({
      where: { id: leadId, organizationId: orgId }
    });

    if (!lead) throw new Error("Lead not found");

    const prompt = `
      Você é um Consultor de Inteligência de Negócios Sênior da Nexus360.
      Sua tarefa é gerar um DOSSIÊ COMPLETO e PROFUNDO sobre a empresa abaixo para preparar uma reunião estratégica de vendas.

      Dados Disponíveis:
      Nome: ${lead.businessName}
      Categoria: ${lead.category}
      Endereço: ${lead.address}
      Site: ${lead.website}
      Avaliações Google: ${lead.rating} (${lead.reviewsCount} reviews)

      O Dossiê deve conter:
      1. PERFIL DA EMPRESA: Quem são, o que provavelemente fazem de melhor.
      2. ANÁLISE DE PRESENÇA DIGITAL: Avaliação do site e reputação no Google.
      3. PONTOS FORTES E FRACOS: Baseado nos dados e na categoria de mercado.
      4. CANAIS DE VENDA PROVÁVEIS: Como eles atraem clientes hoje.
      5. OPORTUNIDADES DE CRESCIMENTO: Onde o Nexus360 (Método ACP) pode ajudar mais.
      6. RISCOS DE MERCADO: O que pode estar ameaçando o negócio deles.
      7. RECOMENDAÇÃO ESTRATÉGICA: Como o vendedor deve se portar e o que deve propor.

      Responda em formato Markdown profissional e rico em detalhes.
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile"
    });

    const dossier = chatCompletion.choices[0].message.content;

    return await this.prisma.capturedLead.update({
      where: { id: leadId },
      data: {
        aiDiagnosis: dossier, // Storing dossier in aiDiagnosis for now or use a dedicated field
      }
    });
  }
}
