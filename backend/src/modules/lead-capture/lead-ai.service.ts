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

    const apiKey = org?.groqKey || process.env.GROQ_API_KEY;

    if (!apiKey) {
      throw new Error("Chave do Groq não configurada para esta organização.");
    }

    return new Groq({
      apiKey
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
    const ownerCandidate = String(lead.owners || "")
      .split(/[,;|\n]+/)
      .map(item => item.replace(/\([^)]*\)/g, "").trim())
      .find(Boolean);
    const targetName = ownerCandidate
      ? ownerCandidate.split(/\s+/).find(part => part.length > 2)
      : null;
    const gatekeeperMessage = targetName
      ? `Oi, meu nome e Paulo. Quero falar com ${targetName.charAt(0).toUpperCase() + targetName.slice(1).toLowerCase()}, por gentileza.`
      : "Oi, meu nome e Paulo. Quero falar com a pessoa responsavel pelo comercial, por gentileza.";
    const gatekeeperScript = [
      `[Passo 1 - Pessoa certa]: "${gatekeeperMessage}"`,
      `[Passo 2 - Se nao estiver]: "Claro. Com quem eu falo?"`,
      targetName
        ? `[Passo 3 - Mapear responsavel]: "Certo. Alem de ${targetName.charAt(0).toUpperCase() + targetName.slice(1).toLowerCase()}, tem mais alguma pessoa que cuida do comercial?"`
        : `[Passo 3 - Mapear responsavel]: "Certo. Tem alguma pessoa especifica que cuida do comercial?"`,
      `[Passo 4 - Se estiver com a pessoa certa]: fazer uma pergunta objetiva de qualificacao, sem vender.`
    ].join("\n");

    return await this.prisma.capturedLead.update({
      where: { id: leadId },
      data: {
        coldCallScript: gatekeeperScript || result.coldCallScript,
        whatsappMessage: gatekeeperMessage
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

    const serperApiKey = org?.serperApiKey || process.env.SERPER_API_KEY;

    if (!serperApiKey) throw new Error("Serper API Key not configured for this organization or environment.");

    try {
      const cnpj = this.cleanCnpj(lead.cnpj) || await this.findCnpjWithSearch(groq, serperApiKey, lead);
      const registry = cnpj ? await this.fetchCnpjRegistry(cnpj) : null;

      if (cnpj && registry && !this.matchesLeadLocation(registry, lead)) {
        return await this.prisma.capturedLead.update({
          where: { id: leadId },
          data: {
            cnpj: this.formatCnpj(cnpj),
            owners: null,
            notes: this.appendNote(
              lead.notes,
              "Enriquecimento: CNPJ encontrado, mas o QSA nao foi usado porque municipio/UF nao conferem com o lead capturado."
            )
          }
        });
      }

      const owners = registry?.partners?.length
        ? registry.partners.map((partner: any) => partner.role ? `${partner.name} (${partner.role})` : partner.name).join(", ")
        : null;

      return await this.prisma.capturedLead.update({
        where: { id: leadId },
        data: {
          cnpj: cnpj ? this.formatCnpj(cnpj) : lead.cnpj,
          owners
        }
      });
    } catch (err: any) {
      console.error("[ENRICH_LEAD_ERROR]", err.message);
      throw err;
    }
  }

  private async findCnpjWithSearch(groq: Groq, serperApiKey: string, lead: any): Promise<string | null> {
    const searchQuery = `${lead.businessName} ${lead.city || ""} ${lead.state || ""} CNPJ`;
    const searchRes = await axios.post('https://google.serper.dev/search', {
      q: searchQuery,
      gl: 'br',
      hl: 'pt-br'
    }, {
      headers: { 'X-API-KEY': serperApiKey }
    });

    const searchData = JSON.stringify(searchRes.data);
    const prompt = `
      Abaixo estao resultados de busca sobre a empresa "${lead.businessName}" em "${lead.city || ""}/${lead.state || ""}".
      Extraia APENAS o CNPJ mais provavel da empresa dessa cidade. Nao extraia socios.
      Se os resultados misturarem empresas homonimas de outra cidade/UF, retorne null.

      Resultados:
      ${searchData.substring(0, 5000)}

      Responda exclusivamente em JSON:
      { "cnpj": "string ou null" }
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(chatCompletion.choices[0].message.content || "{}");
    return this.cleanCnpj(result.cnpj);
  }

  private async fetchCnpjRegistry(cnpj: string) {
    const clean = this.cleanCnpj(cnpj);
    if (!clean) return null;

    const providers = [
      () => axios.get(`https://brasilapi.com.br/api/cnpj/v1/${clean}`, { timeout: 10000 }),
      () => axios.get(`https://minhareceita.org/${clean}`, { timeout: 10000 }),
      () => axios.get(`https://api.muac.com.br/cnpj/${clean}`, {
        timeout: 10000,
        headers: process.env.MUAC_API_KEY ? { Authorization: `Bearer ${process.env.MUAC_API_KEY}` } : undefined
      })
    ];

    for (const provider of providers) {
      try {
        const { data } = await provider();
        const registry = this.normalizeCnpjRegistry(data);
        if (registry) return registry;
      } catch (err: any) {
        console.warn("[CNPJ_REGISTRY_LOOKUP_FAILED]", err?.response?.status || err.message);
      }
    }

    return null;
  }

  private normalizeCnpjRegistry(data: any) {
    const partners = (data?.qsa || data?.quadro_societario || [])
      .map((partner: any) => ({
        name: partner.nome_socio || partner.nome || partner.nome_socio_razao_social,
        role: partner.qualificacao_socio || partner.qualificacao || partner.qualificacao_representante_legal
      }))
      .filter((partner: any) => partner.name);

    return {
      legalName: data?.razao_social || data?.identificacao?.razao_social,
      tradeName: data?.nome_fantasia || data?.identificacao?.nome_fantasia,
      city: data?.municipio || data?.localizacao?.municipio,
      state: data?.uf || data?.localizacao?.uf,
      partners
    };
  }

  private matchesLeadLocation(registry: any, lead: any): boolean {
    const leadState = this.normalizeText(lead.state);
    const registryState = this.normalizeText(registry.state);
    const leadCity = this.normalizeText(lead.city);
    const registryCity = this.normalizeText(registry.city);

    if (leadState && registryState && leadState !== registryState) return false;
    if (leadCity && registryCity && leadCity !== registryCity) return false;

    return true;
  }

  private appendNote(existing: string | null | undefined, note: string): string {
    return [existing, note].filter(Boolean).join("\n\n");
  }

  private cleanCnpj(cnpj?: string | null): string | null {
    const digits = String(cnpj || "").replace(/\D/g, "");
    return digits.length === 14 ? digits : null;
  }

  private formatCnpj(cnpj: string): string {
    const digits = this.cleanCnpj(cnpj) || cnpj;
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  }

  private normalizeText(value?: string | null): string {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toUpperCase();
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

    const serperApiKey = org?.serperApiKey || process.env.SERPER_API_KEY;

    if (!serperApiKey) throw new Error("Serper API Key not configured for this organization or environment.");

    const searchQuery = `site:linkedin.com/in "${lead.businessName}" (CEO OR Diretor OR Gerente OR Proprietário OR Founder)`;
    
    try {
      const searchRes = await axios.post('https://google.serper.dev/search', {
        q: searchQuery,
        gl: 'br',
        hl: 'pt-br'
      }, {
        headers: { 'X-API-KEY': serperApiKey }
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
