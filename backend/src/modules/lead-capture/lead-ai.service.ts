import { PrismaClient } from "@prisma/client";
import { Groq } from "groq-sdk";
import axios from "axios";

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

      IMPORTANTE: O roteiro de Cold Call NÃO DEVE ser um único bloco de texto gigante. 
      Ele DEVE ser dividido e estruturado em partes (passo a passo) para que o vendedor não fale tudo de uma vez, permitindo a interação com o lead e confirmando se está falando com a pessoa certa.
      
      Exemplo de estrutura desejada (use quebras de linha):
      [Passo 1 - Filtro Inicial]: "Oi, bom dia! Tudo bem? Gostaria de falar com o responsável pelo comercial/marketing da empresa."
      [Passo 2 - Permissão]: "Para eu não tomar muito seu tempo, deixa eu te explicar rapidamente o meu trabalho para ver se falo com você mesmo ou com outra pessoa..."
      [Passo 3 - Elevator Pitch / Quebra de Padrão]: ...
      [Passo 4 - Pergunta de Diagnóstico]: ...
      [Passo 5 - Gancho para Reunião]: ...

      A mensagem de WhatsApp deve ser curta, humana, consultiva e terminar com uma pergunta que gere resposta.

      Responda EXCLUSIVAMENTE em JSON válido:
      {
        "coldCallScript": "string formatada com os passos separados por quebras de linha",
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
  }

  async generateDossier(leadId: string, orgId: string) {
    const groq = await this.getGroqClient(orgId);
    
    // Fetch lead and organization details
    const [lead, org] = await Promise.all([
      this.prisma.capturedLead.findFirst({ where: { id: leadId, organizationId: orgId } }),
      this.prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } })
    ]);

    if (!lead) throw new Error("Lead not found");
    const agencyName = org?.name || "Nossa Agência";

    const prompt = `
      Você é um Consultor de Inteligência de Negócios Sênior da agência ${agencyName}.
      Sua tarefa é gerar um DOSSIÊ COMPLETO e PROFUNDO sobre a empresa abaixo. 
      Este dossiê será usado pela ${agencyName} para apresentar oportunidades de crescimento para esse lead.

      Dados Disponíveis:
      Nome: ${lead.businessName}
      Categoria: ${lead.category}
      Endereço: ${lead.address}
      Site: ${lead.website}
      Avaliações Google: ${lead.rating} (${lead.reviewsCount} reviews)

      O Dossiê deve conter:
      1. APRESENTAÇÃO: A ${agencyName} analisou seu negócio e identificou o seguinte perfil...
      2. PERFIL DA EMPRESA: Quem são, o que provavelemente fazem de melhor.
      3. ANÁLISE DE PRESENÇA DIGITAL: Avaliação do site e reputação no Google.
      4. PONTOS FORTES E FRACOS: Onde a ${agencyName} pode atuar.
      5. OPORTUNIDADES DE CRESCIMENTO: Plano de ação sugerido pela ${agencyName}.
      6. RECOMENDAÇÃO ESTRATÉGICA: Como a ${agencyName} vai ajudar esse lead a vender mais.

      Responda em formato Markdown profissional, usando o nome da agência (${agencyName}) em todo o texto para gerar autoridade.
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile"
    });

    const dossier = chatCompletion.choices[0].message.content;

    return await this.prisma.capturedLead.update({
      where: { id: leadId },
      data: {
        aiDiagnosis: dossier,
      }
    });
  }

  async enrichLead(leadId: string, orgId: string) {
    const groq = await this.getGroqClient(orgId);
    const lead = await this.prisma.capturedLead.findFirst({
      where: { id: leadId, organizationId: orgId }
    });

    if (!lead) throw new Error("Lead not found");

    // 1. Fetch Serper API Key
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { serperApiKey: true }
    });

    if (!org?.serperApiKey) throw new Error("Serper API Key not configured.");

    // 2. Perform a deep search for CNPJ and Owners
    const searchQuery = `${lead.businessName} ${lead.city} ${lead.state} CNPJ socios quadro societario`;
    
    try {
      const searchRes = await axios.post('https://google.serper.dev/search', {
        q: searchQuery,
        gl: 'br',
        hl: 'pt-br'
      }, {
        headers: { 'X-API-KEY': org.serperApiKey }
      });

      const searchData = JSON.stringify(searchRes.data);

      // 3. Use AI to extract information from search results
      const prompt = `
        Abaixo estão os resultados de uma busca no Google sobre a empresa "${lead.businessName}".
        Extraia o CNPJ e os NOMES DOS SÓCIOS se estiverem presentes nos textos.

        Resultados da Busca:
        ${searchData.substring(0, 5000)} // Limit to 5k chars for prompt efficiency

        Responda EXCLUSIVAMENTE em JSON:
        {
          "cnpj": "string ou null",
          "owners": "string ou null"
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
          cnpj: result.cnpj,
          owners: result.owners
        }
      });
    } catch (err: any) {
      console.error("[ENRICH_LEAD_ERROR]", err.message);
      throw err;
    }
  }

  async researchManagement(leadId: string, orgId: string) {
    const groq = await this.getGroqClient(orgId);
    const lead = await this.prisma.capturedLead.findFirst({
      where: { id: leadId, organizationId: orgId }
    });

    if (!lead) throw new Error("Lead not found");

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { serperApiKey: true }
    });

    if (!org?.serperApiKey) throw new Error("Serper API Key not configured.");

    const searchQuery = `site:linkedin.com/in "${lead.businessName}" (CEO OR Diretor OR Gerente OR Proprietário OR Founder)`;
    
    try {
      const searchRes = await axios.post('https://google.serper.dev/search', {
        q: searchQuery,
        gl: 'br',
        hl: 'pt-br'
      }, {
        headers: { 'X-API-KEY': org.serperApiKey }
      });

      const searchData = JSON.stringify(searchRes.data);

      const prompt = `
        Abaixo estão resultados de busca do LinkedIn para a empresa "${lead.businessName}".
        Extraia nomes de pessoas e seus respectivos cargos de gestão (CEO, Diretor, Gerente, etc).
        Ignore resultados que não pareçam ser perfis individuais claros.

        Resultados da Busca:
        ${searchData.substring(0, 5000)}

        Responda EXCLUSIVAMENTE em JSON:
        {
          "management": "string com nomes e cargos separados por vírgula ou null"
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
          managementTeam: result.management
        }
      });
    } catch (err: any) {
      console.error("[RESEARCH_MANAGEMENT_ERROR]", err.message);
      throw err;
    }
  }
}
