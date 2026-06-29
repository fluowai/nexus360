import { PrismaClient } from "@prisma/client";
import { runAiCoreChat } from "../../services/aiCoreClient.js";
import axios from "axios";

type CnpjSearchCandidate = {
  cnpj: string;
  source: string;
  sourceUrl?: string | null;
  evidence?: Record<string, any>;
};

type NormalizedRegistry = {
  cnpj?: string | null;
  legalName?: string | null;
  tradeName?: string | null;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  registryStatus?: string | null;
  phone?: string | null;
  email?: string | null;
  partners: Array<{ name: string; role?: string | null }>;
  rawData?: any;
};

type MatchScore = {
  total: number;
  gatesPassed: boolean;
  reason: string;
  rejectionReason?: string;
};

export class LeadAiService {
  constructor(private prisma: PrismaClient) {}

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
      const aiResult = await runAiCoreChat({
        system: "lead-diagnosis",
        clientId: orgId,
        agent: "lead-diagnosis",
        message: prompt,
        temperature: 0.2,
        maxTokens: 2048,
      });

      result = this.parseJsonObject(aiResult.response) || result;
    } catch (error: any) {
      fallbackReason = error?.message || "Falha ao gerar diagnostico com IA.";
      console.warn("[LEAD_DIAGNOSIS_FALLBACK]", { leadId, reason: fallbackReason });
    }

    const aiDiagnosis = fallbackReason
      ? `${result.diagnosis}\n\nNota interna: analise gerada por fallback porque a IA externa nao respondeu (${fallbackReason}).`
      : result.diagnosis;

    const diagnosisData = {
      aiDiagnosis,
      aiWeaknesses: Array.isArray(result.weaknesses) ? result.weaknesses : [],
      aiOpportunities: Array.isArray(result.opportunities) ? result.opportunities : [],
      suggestedOffer: result.suggested_offer || "Estruturacao comercial para aumentar previsibilidade e receita.",
      opportunityLevel: result.priority_level || lead.opportunityLevel || "Media",
    };

    try {
      return await this.prisma.capturedLead.update({
        where: { id: leadId },
        data: diagnosisData
      });
    } catch (error: any) {
      const message = error?.message || "";
      const mayBeOutdatedSchema =
        error?.code === "P2022" ||
        /column .* does not exist/i.test(message) ||
        /Unknown arg .*aiWeaknesses|Unknown argument .*aiWeaknesses/i.test(message);

      if (!mayBeOutdatedSchema) {
        throw error;
      }

      console.warn("[LEAD_DIAGNOSIS_PARTIAL_SAVE]", {
        leadId,
        reason: "Banco de dados sem colunas auxiliares do diagnostico. Salvando apenas aiDiagnosis.",
        error: message
      });

      return await this.prisma.capturedLead.update({
        where: { id: leadId },
        data: { aiDiagnosis }
      });
    }
  }

  async generateScripts(leadId: string, orgId: string) {
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

    const aiResult = await runAiCoreChat({
      system: "lead-scripts",
      clientId: orgId,
      agent: "lead-scripts",
      message: prompt,
      temperature: 0.3,
      maxTokens: 4096,
    });

    const result = JSON.parse(aiResult.response || "{}");
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

    const aiResult = await runAiCoreChat({
      system: "lead-dossier",
      clientId: orgId,
      agent: "lead-dossier",
      message: prompt,
      temperature: 0.3,
      maxTokens: 4096,
    });

    const dossier = aiResult.response;

    return await this.prisma.capturedLead.update({
      where: { id: leadId },
      data: {
        aiDiagnosis: dossier,
      }
    });
  }

  async enrichLead(leadId: string, orgId: string) {
    const lead = await this.prisma.capturedLead.findFirst({
      where: { id: leadId, organizationId: orgId },
      include: { source: true }
    });

    if (!lead) throw new Error("Lead not found");

    // 1. Fetch Serper API Key
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { serperApiKey: true }
    });

    const serperApiKey = org?.serperApiKey || process.env.SERPER_API_KEY;

    try {
      const location = this.resolveLeadLocation(lead);

      if (!location.city || !location.state) {
        return await this.rejectIdentity(lead, "Cidade/UF ausentes. CNPJ e socios nao foram validados automaticamente.", location);
      }

      if (!serperApiKey && !this.cleanCnpj(lead.cnpj)) {
        return await this.rejectIdentity(lead, "Configure SERPER_API_KEY ou informe um CNPJ para validar a identidade empresarial.", location);
      }

      const savedCnpj = this.cleanCnpj(lead.cnpj);
      const candidates: CnpjSearchCandidate[] = savedCnpj
        ? [{ cnpj: savedCnpj, source: "captured_lead", sourceUrl: null, evidence: { reason: "CNPJ previamente salvo no lead" } }]
        : await this.findCnpjCandidatesWithSearch(serperApiKey!, lead, { city: location.city, state: location.state });

      if (!candidates.length) {
        return await this.rejectIdentity(lead, "Nenhum candidato de CNPJ encontrado com evidencias suficientes.", location);
      }

      const evaluated = [];

      for (const candidate of candidates) {
        const registry = await this.fetchCnpjRegistry(candidate.cnpj);

        if (!registry) {
          await this.saveIdentityCandidate(lead, candidate, null, {
            total: 0,
            gatesPassed: false,
            reason: "Registro CNPJ nao encontrado nas fontes configuradas.",
            rejectionReason: "registry_not_found"
          });
          continue;
        }

        const score = this.scoreCompanyMatch(lead, registry, { city: location.city, state: location.state }, candidate);
        await this.saveIdentityCandidate(lead, candidate, registry, score);

        if (score.gatesPassed) {
          evaluated.push({ candidate, registry, score });
        }
      }

      const best = evaluated.sort((a, b) => b.score.total - a.score.total)[0];

      if (!best || best.score.total < 85) {
        return await this.rejectIdentity(lead, "Nenhum CNPJ atingiu score minimo de identidade empresarial. Socios nao foram usados.", {
          ...location,
          candidates: evaluated.map(item => ({
            cnpj: item.candidate.cnpj,
            score: item.score.total,
            reason: item.score.reason
          }))
        });
      }

      const owners = best.registry.partners?.length
        ? best.registry.partners.map((partner: any) => partner.role ? `${partner.name} (${partner.role})` : partner.name).join(", ")
        : null;

      const updated = await this.prisma.capturedLead.update({
        where: { id: leadId },
        data: {
          cnpj: this.formatCnpj(best.candidate.cnpj),
          cnpjStatus: "validated",
          cnpjMatchScore: best.score.total,
          cnpjMatchReason: best.score.reason,
          matchedLegalName: best.registry.legalName,
          matchedTradeName: best.registry.tradeName,
          matchedCity: best.registry.city,
          matchedState: best.registry.state,
          matchedAddress: best.registry.address,
          cnpjSourceUrl: best.candidate.sourceUrl,
          owners
        }
      });

      await this.logIdentityDecision(lead, "enrich_lead", "validated", best.candidate.cnpj, best.score.total, best.score.reason, {
        location,
        selected: best.candidate,
        registry: {
          legalName: best.registry.legalName,
          tradeName: best.registry.tradeName,
          city: best.registry.city,
          state: best.registry.state
        }
      });

      return updated;
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

  private async findCnpjCandidatesWithSearch(serperApiKey: string, lead: any, location: { city: string; state: string }): Promise<CnpjSearchCandidate[]> {
    const searchQuery = `"${lead.businessName}" "${location.city}" ${location.state} CNPJ`;
    const searchRes = await axios.post('https://google.serper.dev/search', {
      q: searchQuery,
      gl: 'br',
      hl: 'pt-br'
    }, {
      headers: { 'X-API-KEY': serperApiKey }
    });

    const items = [
      ...(searchRes.data?.organic || []),
      ...(searchRes.data?.places || []),
      ...(searchRes.data?.knowledgeGraph ? [searchRes.data.knowledgeGraph] : [])
    ];

    const unique = new Map<string, CnpjSearchCandidate>();
    for (const item of items) {
      const text = JSON.stringify({
        title: item.title,
        snippet: item.snippet,
        attributes: item.attributes,
        address: item.address,
        link: item.link
      });
      const matches = text.match(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g) || [];

      for (const match of matches) {
        const cnpj = this.cleanCnpj(match);
        if (!cnpj || unique.has(cnpj)) continue;

        unique.set(cnpj, {
          cnpj,
          source: "serper_search",
          sourceUrl: item.link || item.url || null,
          evidence: {
            query: searchQuery,
            title: item.title,
            snippet: item.snippet,
            address: item.address
          }
        });
      }
    }

    return Array.from(unique.values()).slice(0, 10);
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

  private normalizeCnpjRegistry(data: any): NormalizedRegistry {
    const partners = (data?.qsa || data?.quadro_societario || [])
      .map((partner: any) => ({
        name: partner.nome_socio || partner.nome || partner.nome_socio_razao_social,
        role: partner.qualificacao_socio || partner.qualificacao || partner.qualificacao_representante_legal
      }))
      .filter((partner: any) => partner.name);

    return {
      cnpj: this.cleanCnpj(data?.cnpj || data?.identificacao?.cnpj),
      legalName: data?.razao_social || data?.identificacao?.razao_social,
      tradeName: data?.nome_fantasia || data?.identificacao?.nome_fantasia,
      city: data?.municipio || data?.localizacao?.municipio,
      state: data?.uf || data?.localizacao?.uf,
      address: [
        data?.logradouro || data?.localizacao?.logradouro,
        data?.numero || data?.localizacao?.numero,
        data?.bairro || data?.localizacao?.bairro
      ].filter(Boolean).join(", ") || null,
      registryStatus: data?.descricao_situacao_cadastral || data?.situacao_cadastral || data?.situacao,
      phone: data?.ddd_telefone_1 || data?.telefone || null,
      email: data?.email || null,
      partners,
      rawData: data
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

  private resolveLeadLocation(lead: any): { city: string | null; state: string | null; source: string } {
    const parsed = this.parseBrazilianLocation(lead.address);
    const city = lead.city || parsed.city || lead.source?.city || null;
    const state = this.normalizeState(lead.state || parsed.state || lead.source?.state || null);

    return {
      city: city ? this.toTitleCase(city) : null,
      state,
      source: lead.city || lead.state ? "lead" : parsed.city || parsed.state ? "address" : "source"
    };
  }

  private async rejectIdentity(lead: any, reason: string, input?: any) {
    const updated = await this.prisma.capturedLead.update({
      where: { id: lead.id },
      data: {
        cnpj: null,
        cnpjStatus: "needs_review",
        cnpjMatchScore: null,
        cnpjMatchReason: reason,
        matchedLegalName: null,
        matchedTradeName: null,
        matchedCity: null,
        matchedState: null,
        matchedAddress: null,
        cnpjSourceUrl: null,
        owners: null,
        notes: this.appendNote(lead.notes, `Enriquecimento: ${reason}`)
      }
    });

    await this.logIdentityDecision(lead, "enrich_lead", "needs_review", null, null, reason, input);
    return updated;
  }

  private async saveIdentityCandidate(lead: any, candidate: CnpjSearchCandidate, registry: NormalizedRegistry | null, score: MatchScore) {
    await this.prisma.companyIdentityCandidate.create({
      data: {
        organizationId: lead.organizationId,
        capturedLeadId: lead.id,
        cnpj: this.formatCnpj(candidate.cnpj),
        legalName: registry?.legalName,
        tradeName: registry?.tradeName,
        city: registry?.city,
        state: registry?.state,
        address: registry?.address,
        registryStatus: registry?.registryStatus,
        source: candidate.source,
        sourceUrl: candidate.sourceUrl,
        evidence: candidate.evidence as any,
        rawData: registry?.rawData as any,
        score: score.total,
        status: score.gatesPassed && score.total >= 85 ? "accepted" : "rejected",
        rejectionReason: score.gatesPassed && score.total >= 85 ? null : score.rejectionReason || score.reason
      }
    });
  }

  private async logIdentityDecision(
    lead: any,
    action: string,
    decision: string,
    selectedCnpj: string | null,
    score: number | null,
    reason: string,
    input?: any
  ) {
    await this.prisma.companyIdentityAuditLog.create({
      data: {
        organizationId: lead.organizationId,
        capturedLeadId: lead.id,
        action,
        decision,
        selectedCnpj: selectedCnpj ? this.formatCnpj(selectedCnpj) : null,
        score,
        reason,
        input: input as any
      }
    });
  }

  private scoreCompanyMatch(
    lead: any,
    registry: NormalizedRegistry,
    location: { city: string; state: string },
    candidate: CnpjSearchCandidate
  ): MatchScore {
    const cleanCnpj = this.cleanCnpj(candidate.cnpj);
    if (!cleanCnpj || !this.isValidCnpj(cleanCnpj)) {
      return { total: 0, gatesPassed: false, reason: "CNPJ candidato tem digito verificador invalido.", rejectionReason: "invalid_cnpj" };
    }

    const leadState = this.normalizeState(location.state);
    const registryState = this.normalizeState(registry.state);
    if (!leadState || !registryState || leadState !== registryState) {
      return { total: 0, gatesPassed: false, reason: `UF divergente: alvo ${leadState || "N/A"} x registro ${registryState || "N/A"}.`, rejectionReason: "state_mismatch" };
    }

    const citySimilarity = this.similarity(location.city, registry.city);
    if (citySimilarity < 0.9) {
      return { total: Math.round(citySimilarity * 25) + 20, gatesPassed: false, reason: `Cidade divergente: alvo ${location.city} x registro ${registry.city || "N/A"}.`, rejectionReason: "city_mismatch" };
    }

    const leadName = this.normalizeCompanyName(lead.businessName);
    const tradeSimilarity = this.similarity(leadName, this.normalizeCompanyName(registry.tradeName));
    const legalSimilarity = this.similarity(leadName, this.normalizeCompanyName(registry.legalName));
    const nameSimilarity = Math.max(tradeSimilarity, legalSimilarity);
    if (nameSimilarity < 0.72) {
      return { total: 45 + Math.round(nameSimilarity * 30), gatesPassed: false, reason: `Nome divergente: ${lead.businessName} x ${registry.tradeName || registry.legalName || "N/A"}.`, rejectionReason: "name_mismatch" };
    }

    let total = 0;
    total += 20;
    total += Math.round(citySimilarity * 25);
    total += Math.round(tradeSimilarity * 25);
    total += Math.round(legalSimilarity * 20);
    total += this.addressLooksCompatible(lead.address, registry.address) ? 5 : 0;
    total += this.phoneLooksCompatible(lead.phoneNormalized || lead.phone, registry.phone) ? 5 : 0;
    total += this.evidenceMentionsLocation(candidate.evidence, location) ? 5 : 0;

    const status = this.normalizeText(registry.registryStatus);
    if (status.includes("ATIVA") || status === "2") total += 5;

    total = Math.min(100, total);
    return {
      total,
      gatesPassed: true,
      reason: `CNPJ validado por UF, cidade e nome. Score ${total}. Nome ${Math.round(nameSimilarity * 100)}%, cidade ${Math.round(citySimilarity * 100)}%.`
    };
  }

  private normalizeCompanyName(value?: string | null): string {
    return this.normalizeText(value)
      .replace(/\b(LTDA|EIRELI|EPP|ME|S\/A|SA|S A|COMERCIO|SERVICOS|SERVICO|EMPRESA|MATRIZ|FILIAL)\b/g, " ")
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private similarity(a?: string | null, b?: string | null): number {
    const left = this.normalizeText(a);
    const right = this.normalizeText(b);
    if (!left || !right) return 0;
    if (left === right) return 1;

    const distance = this.levenshtein(left, right);
    const levRatio = 1 - distance / Math.max(left.length, right.length);
    const leftTokens = new Set(left.split(/\s+/).filter(Boolean));
    const rightTokens = new Set(right.split(/\s+/).filter(Boolean));
    const intersection = [...leftTokens].filter(token => rightTokens.has(token)).length;
    const tokenRatio = intersection ? (2 * intersection) / (leftTokens.size + rightTokens.size) : 0;

    return Math.max(0, Math.min(1, (levRatio * 0.55) + (tokenRatio * 0.45)));
  }

  private levenshtein(a: string, b: string): number {
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) dp[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      }
    }

    return dp[a.length][b.length];
  }

  private isValidCnpj(cnpj: string): boolean {
    const digits = this.cleanCnpj(cnpj);
    if (!digits || /^(\d)\1+$/.test(digits)) return false;

    const calc = (base: string, weights: number[]) => {
      const sum = base.split("").reduce((acc, digit, index) => acc + Number(digit) * weights[index], 0);
      const mod = sum % 11;
      return mod < 2 ? 0 : 11 - mod;
    };

    const first = calc(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const second = calc(digits.slice(0, 12) + first, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    return digits.endsWith(`${first}${second}`);
  }

  private addressLooksCompatible(leadAddress?: string | null, registryAddress?: string | null): boolean {
    const lead = this.normalizeText(leadAddress);
    const registry = this.normalizeText(registryAddress);
    if (!lead || !registry) return false;
    return lead.includes(registry.slice(0, 12)) || registry.includes(lead.slice(0, 12));
  }

  private phoneLooksCompatible(leadPhone?: string | null, registryPhone?: string | null): boolean {
    const lead = String(leadPhone || "").replace(/\D/g, "");
    const registry = String(registryPhone || "").replace(/\D/g, "");
    if (lead.length < 8 || registry.length < 8) return false;
    return lead.endsWith(registry.slice(-8)) || registry.endsWith(lead.slice(-8));
  }

  private evidenceMentionsLocation(evidence: any, location: { city: string; state: string }): boolean {
    const text = this.normalizeText(JSON.stringify(evidence || {}));
    return text.includes(this.normalizeText(location.city)) && text.includes(this.normalizeText(location.state));
  }

  private normalizeState(value?: string | null): string | null {
    const normalized = this.normalizeText(value);
    if (!normalized) return null;
    const aliases: Record<string, string> = {
      "SANTA CATARINA": "SC",
      "SAO PAULO": "SP",
      PARANA: "PR",
      "RIO GRANDE DO SUL": "RS",
      "RIO DE JANEIRO": "RJ",
      "MINAS GERAIS": "MG",
      BAHIA: "BA",
      GOIAS: "GO"
    };
    if (/^[A-Z]{2}$/.test(normalized)) return normalized;
    return aliases[normalized] || normalized;
  }

  private parseBrazilianLocation(address?: string | null): { city: string | null; state: string | null } {
    const raw = String(address || "").trim();
    const stateMatch = raw.match(/(?:^|[\s,/-])([A-Z]{2})(?:\s*,?\s*Brasil|\s*$)/i);
    const state = this.normalizeState(stateMatch?.[1] || null);
    if (!state) return { city: null, state: null };

    const stateIndex = raw.toUpperCase().lastIndexOf(state);
    const beforeState = stateIndex >= 0 ? raw.slice(0, stateIndex) : raw;
    const parts = beforeState.split(/[,|-]/).map(part => part.trim()).filter(Boolean);
    return { city: parts.length ? parts[parts.length - 1] : null, state };
  }

  private toTitleCase(value: string): string {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, char => char.toUpperCase());
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
    const lead = await this.prisma.capturedLead.findFirst({
      where: { id: leadId, organizationId: orgId }
    });

    if (!lead) throw new Error("Lead not found");

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { serperApiKey: true }
    });

    const serperApiKey = org?.serperApiKey || process.env.SERPER_API_KEY;

    if (!serperApiKey) {
      return await this.prisma.capturedLead.update({
        where: { id: leadId },
        data: {
          notes: this.appendNote(
            lead.notes,
            "Pesquisa de decisores pendente: configure SERPER_API_KEY ou a chave Serper da organizacao para buscar gestores automaticamente."
          )
        }
      });
    }

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

      const aiResult = await runAiCoreChat({
        system: "lead-research",
        clientId: orgId,
        agent: "lead-research",
        message: prompt,
        temperature: 0.2,
        maxTokens: 2048,
      });

      const result = this.parseJsonObject(aiResult.response) || {};

      return await this.prisma.capturedLead.update({
        where: { id: leadId },
        data: {
          managementTeam: result.management
        }
      });
    } catch (err: any) {
      console.error("[RESEARCH_MANAGEMENT_ERROR]", err.message);
      return await this.prisma.capturedLead.update({
        where: { id: leadId },
        data: {
          notes: this.appendNote(
            lead.notes,
            `Pesquisa de decisores pendente: ${err.message || "falha ao consultar dados externos."}`
          )
        }
      });
    }
  }
}
