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
    const lead = await this.prisma.capturedLead.findFirst({
      where: { id: leadId, organizationId: orgId }
    });

    if (!lead) throw new Error("Lead not found");

    const prompt = `
      Você é um agente de análise comercial da Nexus360.
      Analise a empresa abaixo como potencial cliente para uma solução de crescimento previsível, CRM, automação e estruturação comercial.
      Esta análise é interna. Não transforme diagnóstico em primeira mensagem de WhatsApp.

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
      8. Argumento principal para abordagem, sempre focado em estrutura comercial e mais dinheiro no caixa, nunca em "somos agência"
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

    let result = this.buildFallbackDiagnosis(lead);
    let fallbackReason: string | null = null;

    try {
      const groq = await this.getGroqClient(orgId);
      const chatCompletion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" }
      });

      result = this.parseJsonObject(chatCompletion.choices[0].message.content) || result;
    } catch (error: any) {
      fallbackReason = error?.message || "Falha ao gerar diagnostico com IA.";
      console.warn("[LEAD_DIAGNOSIS_FALLBACK]", { leadId, reason: fallbackReason });
    }

    return await this.prisma.capturedLead.update({
      where: { id: leadId },
      data: {
        aiDiagnosis: fallbackReason
          ? `${result.diagnosis}\n\nNota interna: analise gerada por fallback porque a IA externa nao respondeu (${fallbackReason}).`
          : result.diagnosis,
        aiWeaknesses: Array.isArray(result.weaknesses) ? result.weaknesses : [],
        aiOpportunities: Array.isArray(result.opportunities) ? result.opportunities : [],
        suggestedOffer: result.suggested_offer || "Estruturacao comercial para aumentar previsibilidade e receita.",
        opportunityLevel: result.priority_level || lead.opportunityLevel || "Media",
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
      Crie um roteiro de ligação (Cold Call) e uma mensagem de WhatsApp para abordar a empresa abaixo.
      Objetivo real: chegar ao decisor (sócio, proprietário, administrador ou alguém da área comercial), abrir uma conversa humana e levar para uma call quando houver abertura.

      Nome: ${lead.businessName}
      Categoria: ${lead.category}
      Diagnóstico: ${lead.aiDiagnosis}

      REGRAS OBRIGATÓRIAS:
      - Nunca diga que somos agência.
      - Nunca comece falando de marketing, presença digital, site, diagnóstico ou avaliação da empresa.
      - A primeira mensagem deve apenas localizar o decisor ou responsável comercial.
      - Se perguntarem o assunto, explique como humano: "trabalho com estrutura comercial para ajudar empresas a vender melhor e colocar mais dinheiro no caixa".
      - Só fale da avaliação/diagnóstico depois de confirmar que está falando com quem decide e a pessoa deu abertura.
      - Escreva como conversa real de WhatsApp, curta, natural, sem tom robótico e sem texto longo.

      IMPORTANTE: O roteiro de Cold Call NÃO DEVE ser um único bloco de texto gigante. 
      Ele DEVE ser dividido e estruturado em partes (passo a passo) para que o vendedor não fale tudo de uma vez, permitindo a interação com o lead e confirmando se está falando com a pessoa certa.
      
      Exemplo de estrutura desejada (use quebras de linha):
      [Passo 1 - Filtro Inicial]: "Oi, tudo bem? Aqui é o Paulo. Quem cuida do comercial ou das decisões de crescimento por aí?"
      [Passo 2 - Se perguntar o assunto]: "É sobre estrutura comercial. Eu ajudo empresas a organizar melhor a entrada de oportunidades e vender mais. Queria entender se falo com você ou com outra pessoa."
      [Passo 3 - Confirmar decisor]: ...
      [Passo 4 - Sondagem curta]: ...
      [Passo 5 - Gancho para Call]: ...

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
      ? `Oi, tudo bem? Aqui e o Paulo. Consegue me ajudar a falar com ${targetName.charAt(0).toUpperCase() + targetName.slice(1).toLowerCase()} ou com quem cuida do comercial por ai?`
      : "Oi, tudo bem? Aqui e o Paulo. Quem seria a pessoa que cuida do comercial ou das decisoes de crescimento por ai?";
    const gatekeeperScript = [
      `[Passo 1 - Pessoa certa]: "${gatekeeperMessage}"`,
      `[Passo 2 - Se perguntarem o assunto]: "E sobre estrutura comercial. Eu ajudo empresas a organizar melhor a entrada de oportunidades e vender mais. Queria entender se falo com voce ou com outra pessoa."`,
      `[Passo 3 - Se nao estiver]: "Perfeito. Com quem eu falo sobre isso?"`,
      targetName
        ? `[Passo 4 - Mapear responsavel]: "Certo. Alem de ${targetName.charAt(0).toUpperCase() + targetName.slice(1).toLowerCase()}, tem mais alguma pessoa que cuida do comercial?"`
        : `[Passo 4 - Mapear responsavel]: "Certo. Tem alguma pessoa especifica que cuida do comercial?"`,
      `[Passo 5 - Se estiver com a pessoa certa]: fazer uma pergunta objetiva de qualificacao, sem vender e sem abrir diagnostico ainda.`,
      `[Regra fixa]: so falar sobre avaliacao da empresa depois que o decisor der abertura.`
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
    const agencyName = org?.name || "Nexus360";

    const prompt = `
      Você é um Consultor de Inteligência de Negócios Sênior da ${agencyName}, com foco em estrutura comercial.
      Sua tarefa é gerar um DOSSIÊ COMPLETO e PROFUNDO sobre a empresa abaixo. 
      Este dossiê é interno e só deve ser usado depois que houver abertura com decisor.
      Não posicione a ${agencyName} como agência. Posicione como estrutura comercial para vender melhor e aumentar caixa.

      Dados Disponíveis:
      Nome: ${lead.businessName}
      Categoria: ${lead.category}
      Endereço: ${lead.address}
      Site: ${lead.website}
      Avaliações Google: ${lead.rating} (${lead.reviewsCount} reviews)

      O Dossiê deve conter:
      1. APRESENTAÇÃO INTERNA: perfil comercial provável do negócio...
      2. PERFIL DA EMPRESA: Quem são, o que provavelemente fazem de melhor.
      3. ANÁLISE DE PRESENÇA DIGITAL: Avaliação do site e reputação no Google.
      4. PONTOS FORTES E FRACOS: Onde existe oportunidade comercial.
      5. OPORTUNIDADES DE CRESCIMENTO: Plano de ação sugerido para vender melhor.
      6. RECOMENDAÇÃO ESTRATÉGICA: Como uma estrutura comercial pode ajudar esse lead a vender mais.

      Responda em formato Markdown profissional. Evite linguagem de pitch e não use "agência".
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

    try {
      if (!serperApiKey && !this.cleanCnpj(lead.cnpj)) {
        return await this.prisma.capturedLead.update({
          where: { id: leadId },
          data: {
            notes: this.appendNote(
              lead.notes,
              "Enriquecimento pendente: configure SERPER_API_KEY ou a chave Serper da organizacao para buscar CNPJ/socios automaticamente."
            )
          }
        });
      }

      const cnpj = this.cleanCnpj(lead.cnpj) || await this.findCnpjWithSearch(serperApiKey!, lead);
      if (!cnpj) {
        return await this.prisma.capturedLead.update({
          where: { id: leadId },
          data: {
            notes: this.appendNote(
              lead.notes,
              "Enriquecimento: nao foi possivel identificar CNPJ confiavel para este lead."
            )
          }
        });
      }

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
      return await this.prisma.capturedLead.update({
        where: { id: leadId },
        data: {
          notes: this.appendNote(
            lead.notes,
            `Enriquecimento pendente: ${err.message || "falha ao consultar dados externos."}`
          )
        }
      });
    }
  }

  private async findCnpjWithSearch(serperApiKey: string, lead: any): Promise<string | null> {
    const searchQuery = `${lead.businessName} ${lead.city || ""} ${lead.state || ""} CNPJ`;
    const searchRes = await axios.post('https://google.serper.dev/search', {
      q: searchQuery,
      gl: 'br',
      hl: 'pt-br'
    }, {
      headers: { 'X-API-KEY': serperApiKey }
    });

    const searchData = JSON.stringify(searchRes.data);
    const cnpjMatch = searchData.match(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/);
    return this.cleanCnpj(cnpjMatch?.[0]);
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

  private parseJsonObject(content?: string | null) {
    if (!content) return null;

    try {
      return JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) return null;
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
  }

  private buildFallbackDiagnosis(lead: any) {
    const hasWebsite = Boolean(lead.website);
    const hasPhone = Boolean(lead.phone || lead.phoneNormalized);
    const rating = Number(lead.rating || 0);
    const reviewsCount = Number(lead.reviewsCount || 0);
    const opportunities = [
      "Localizar o decisor comercial antes de qualquer apresentacao.",
      "Mapear como entram novos clientes hoje e onde ha perda de oportunidades.",
      "Organizar uma estrutura comercial mais previsivel para aumentar receita."
    ];
    const weaknesses = [
      !hasPhone ? "Telefone nao identificado na captacao." : null,
      !hasWebsite ? "Site nao identificado na captacao." : null,
      reviewsCount < 20 ? "Baixo volume de avaliacoes publicas pode limitar prova social." : null,
      rating > 0 && rating < 4 ? "Nota publica abaixo do ideal pode prejudicar conversao." : null
    ].filter(Boolean);

    return {
      diagnosis: `Analise comercial preliminar de ${lead.businessName}. O foco recomendado e confirmar quem decide pelo comercial, entender como a empresa gera oportunidades hoje e avaliar se existe espaco para uma estrutura comercial que aumente previsibilidade e caixa.`,
      weaknesses: weaknesses.length ? weaknesses : ["Diagnostico limitado ate conversar com o decisor."],
      opportunities,
      suggested_offer: "Estruturacao comercial para melhorar aquisicao, conversao e previsibilidade de receita.",
      priority_level: lead.opportunityLevel || (lead.scoreOpportunity >= 70 ? "Alta" : lead.scoreOpportunity >= 40 ? "Media" : "Baixa"),
      main_argument: "Conversa sobre estrutura comercial para vender melhor e colocar mais dinheiro no caixa.",
      probable_objections: ["Nao sou eu que cuido disso", "Ja temos alguem olhando comercial", "Pode mandar por mensagem"],
      next_action: "Falar primeiro com socio, proprietario, administrador ou responsavel comercial."
    };
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
