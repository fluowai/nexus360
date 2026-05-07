import { PrismaClient } from "@prisma/client";
import { LeadProvider, LeadSearchParams, NormalizedLead, LeadSearchFilters } from "./providers/lead-provider.interface.js";
import { getLeadProvider } from "./providers/lead-provider.factory.js";

export class LeadCaptureService {
  constructor(private prisma: PrismaClient) {}

  async captureLeads(params: LeadSearchParams) {
    const { tenantId, userId, provider: providerName } = params;

    // 1. Fetch organization keys
    console.log(`[LEAD_CAPTURE] Iniciando busca para orgId: ${tenantId}, Provedor: ${providerName}`);
    const organization = await this.prisma.organization.findUnique({
      where: { id: tenantId },
      select: { serpApiKey: true, serperApiKey: true, outscraperKey: true }
    });

    if (!organization) {
      console.error(`[LEAD_CAPTURE] Organização ${tenantId} não encontrada no banco.`);
      throw new Error(`Organização não encontrada: ${tenantId}`);
    }

    // 1b. Create source record
    const source = await this.prisma.leadCaptureSource.create({
      data: {
        organizationId: tenantId,
        userId,
        provider: providerName,
        query: this.buildQuery(params),
        keyword: params.keyword,
        city: params.city,
        state: params.state,
        country: params.country || 'Brasil',
        requestedLimit: params.limit || 100,
        status: 'processing'
      }
    });

    try {
      let apiKey: string | undefined;
      
      if (providerName === 'serper') {
        apiKey = organization.serperApiKey || undefined;
      } else if (providerName === 'serpapi') {
        apiKey = organization.serpApiKey || undefined;
      } else {
        apiKey = organization.outscraperKey || undefined;
      }
      
      console.log(`[LEAD_CAPTURE] Provedor: ${providerName}, Chave (mascarada): ${apiKey ? (apiKey.substring(0, 5) + '...' + apiKey.slice(-4)) : 'NÃO ENCONTRADA'}`);

      if (!apiKey) {
        throw new Error(`Chave de API do provedor ${providerName} não configurada para esta organização.`);
      }

      const provider = getLeadProvider(providerName);
      
      let rawResults;
      try {
        console.log(`[LEAD_CAPTURE] Chamando API do provedor: ${providerName}`);
        rawResults = await provider.search({ ...params, apiKey });
      } catch (apiErr: any) {
        console.error(`[LEAD_CAPTURE] Erro na resposta da API externa (${providerName}):`, apiErr.response?.data || apiErr.message);
        throw new Error(`Erro no provedor ${providerName}: ${apiErr.response?.data?.error || apiErr.message}`);
      }

      // 2. Normalize and filter
      let normalizedLeads;
      try {
        normalizedLeads = rawResults.map(raw => {
          const lead = provider.normalize(raw);
          lead.phone_normalized = this.normalizeBrazilianPhone(lead.phone);
          return lead;
        });
        normalizedLeads = this.applyFilters(normalizedLeads, params.filters);
      } catch (normErr: any) {
        console.error(`[LEAD_CAPTURE] Erro na normalização dos dados:`, normErr);
        throw new Error(`Erro ao processar dados recebidos: ${normErr.message}`);
      }

      // 3. Save leads with deduplication
      let importedCount = 0;
      const savedLeads = [];

      for (const leadData of normalizedLeads) {
        try {
          const score = this.calculateScore(leadData);
          
          if (!leadData.external_id) {
            console.warn(`[LEAD_CAPTURE] Lead sem ID externo ignorado: ${leadData.business_name}`);
            continue;
          }

          const saved = await this.prisma.capturedLead.upsert({
            where: {
              organizationId_provider_externalId: {
                organizationId: tenantId,
                provider: providerName,
                externalId: leadData.external_id
              }
            },
            update: {
              ...this.mapToPrisma(leadData),
              scoreOpportunity: score.value,
              opportunityLevel: score.level,
              sourceId: source.id
            },
            create: {
              ...this.mapToPrisma(leadData),
              organizationId: tenantId,
              sourceId: source.id,
              provider: providerName,
              scoreOpportunity: score.value,
              opportunityLevel: score.level
            }
          });

          savedLeads.push(saved);
          importedCount++;
        } catch (dbErr: any) {
          console.error(`[LEAD_CAPTURE] Erro ao salvar lead ${leadData.business_name}:`, dbErr.message);
        }
      }

      // 4. Update source and log usage
      await this.prisma.leadCaptureSource.update({
        where: { id: source.id },
        data: {
          status: 'completed',
          totalFound: rawResults.length,
          totalImported: importedCount
        }
      });

      return {
        sourceId: source.id,
        totalFound: rawResults.length,
        totalImported: importedCount,
        leads: savedLeads
      };

    } catch (error: any) {
      console.error(`[LEAD_CAPTURE_CRITICAL]`, error.message);
      await this.prisma.leadCaptureSource.update({
        where: { id: source.id },
        data: {
          status: 'failed',
          errorMessage: error.message
        }
      });

      throw error;
    }
  }

  private normalizeBrazilianPhone(phone?: string | null): string | null {
    if (!phone) return null;
    let cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.length === 10 || cleaned.length === 11) {
      cleaned = '55' + cleaned;
    }
    
    return '+' + cleaned;
  }

  private applyFilters(leads: NormalizedLead[], filters?: LeadSearchFilters): NormalizedLead[] {
    if (!filters) return leads;

    return leads.filter(lead => {
      if (filters.onlyWithPhone && !lead.phone) return false;
      if (filters.onlyWithWebsite && !lead.website) return false;
      if (filters.onlyWithoutWebsite && lead.website) return false;
      if (filters.minRating && (lead.rating || 0) < filters.minRating) return false;
      if (filters.minReviews && (lead.reviews_count || 0) < filters.minReviews) return false;
      return true;
    });
  }

  private calculateScore(lead: NormalizedLead): { value: number, level: string } {
    let score = 0;

    if (lead.phone) score += 15; else score -= 20;
    if (!lead.website) score += 20; else score += 5;

    const rating = lead.rating || 0;
    if (rating > 0 && rating < 4.3) score += 10;
    else if (rating >= 4.3 && rating < 4.8) score += 5;

    const reviews = lead.reviews_count || 0;
    if (reviews > 0 && reviews < 30) score += 10;
    else if (reviews >= 30 && reviews < 100) score += 5;

    if (lead.email) score += 10;
    if (lead.instagram) score += 5;

    let level = 'Baixa';
    if (score >= 81) level = 'Prioridade';
    else if (score >= 61) level = 'Alta';
    else if (score >= 31) level = 'Média';

    return { value: Math.max(0, score), level };
  }

  private mapToPrisma(lead: NormalizedLead) {
    return {
      externalId: lead.external_id!,
      placeId: lead.place_id,
      businessName: lead.business_name,
      category: lead.category,
      phone: lead.phone,
      phoneNormalized: lead.phone_normalized,
      website: lead.website,
      email: lead.email,
      instagram: lead.instagram,
      facebook: lead.facebook,
      linkedin: lead.linkedin,
      address: lead.address,
      neighborhood: lead.neighborhood,
      city: lead.city,
      state: lead.state,
      country: lead.country || 'Brasil',
      postalCode: lead.postal_code,
      latitude: lead.latitude,
      longitude: lead.longitude,
      rating: lead.rating,
      reviewsCount: lead.reviews_count,
      reviews: lead.reviews as any,
      openingHours: lead.opening_hours as any,
      googleMapsUrl: lead.google_maps_url,
      searchUrl: lead.search_url,
      hasPhone: !!lead.phone,
      hasWebsite: !!lead.website,
      hasEmail: !!lead.email,
      hasSocial: !!(lead.instagram || lead.facebook || lead.linkedin),
      rawData: lead.raw_data as any
    };
  }

  private buildQuery(params: LeadSearchParams): string {
    const parts = [];
    if (params.keyword) parts.push(params.keyword);
    if (params.neighborhood) parts.push(params.neighborhood);
    if (params.city) parts.push(params.city);
    if (params.state) parts.push(params.state);
    if (params.country) parts.push(params.country || 'Brasil');
    return parts.filter(Boolean).join(' ');
  }
}
